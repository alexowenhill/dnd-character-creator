/**
 * Turns a client-submitted character into a trustworthy StoredCharacter, or
 * rejects it. Shared between creating a character (POST) and editing or
 * resetting one in place (PATCH), so both paths enforce the same rules —
 * including the caps a fresh character gets for free from the wizard's own
 * step gating (skills, ability improvements) but that a raw request could
 * otherwise ignore: at most MAX_WEAPONS weapons, and no more spells or
 * cantrips than the class actually knows at this level.
 */

import { randomUUID } from 'node:crypto'
import { computeSheet, type StoredCharacter } from './character.ts'
import { ABILITY_ORDER, classById, raceById, backgroundById, SKILL_KEYS } from './srd.ts'
import type { AbilityKey, SkillKey } from './srd.ts'
import { ARMOURS, WEAPONS, MAX_WEAPONS, type StoredEquipment } from './equipment.ts'

export type ValidateResult =
  | { ok: true; character: StoredCharacter }
  | { ok: false; error: string }

/** Preserve an existing character's identity across an edit or reset. */
export type Identity = { id: string; createdAt: string }

export function validateCharacterInput(body: unknown, identity?: Identity): ValidateResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'No character sent.' }
  const input = body as Record<string, unknown>

  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) return { ok: false, error: 'A character needs a name.' }
  if (name.length > 60) return { ok: false, error: 'That name is too long.' }

  const playerName = typeof input.playerName === 'string' ? input.playerName.trim().slice(0, 40) : ''

  const race = raceById(String(input.raceId))
  if (!race) return { ok: false, error: 'Pick a race.' }

  const subraceId = typeof input.subraceId === 'string' ? input.subraceId : undefined
  if (race.subraces?.length && !race.subraces.some((entry) => entry.id === subraceId)) {
    return { ok: false, error: `Pick a ${race.name} subrace.` }
  }

  const charClass = classById(String(input.classId))
  if (!charClass) return { ok: false, error: 'Pick a class.' }

  const subclassId = String(input.subclassId ?? '')
  if (!charClass.subclasses.some((entry) => entry.id === subclassId)) {
    return { ok: false, error: `Pick a ${charClass.subclassLabel}.` }
  }

  if (!backgroundById(String(input.backgroundId))) return { ok: false, error: 'Pick a background.' }

  const level = Number(input.level)
  if (!Number.isInteger(level) || level < 1 || level > 20) {
    return { ok: false, error: 'Level must be between 1 and 20.' }
  }

  // Ability scores must look like 4d6-drop-lowest results, not arbitrary numbers.
  const baseAbilities = {} as Record<AbilityKey, number>
  for (const key of ABILITY_ORDER) {
    const value = Number((input.baseAbilities as Record<string, unknown>)?.[key])
    if (!Number.isInteger(value) || value < 3 || value > 18) {
      return { ok: false, error: `${key.toUpperCase()} must be a rolled score between 3 and 18.` }
    }
    baseAbilities[key] = value
  }

  const skillChoices = Array.isArray(input.skillChoices)
    ? (input.skillChoices.filter(
        (entry): entry is SkillKey => typeof entry === 'string' && SKILL_KEYS.includes(entry as SkillKey),
      ) as SkillKey[])
    : []
  if (skillChoices.length > charClass.skillChoices) {
    return { ok: false, error: `A ${charClass.name} picks ${charClass.skillChoices} skills.` }
  }

  // The level-4 improvement is +2 total, and never past 20 (checked on compute).
  const improvements: Partial<Record<AbilityKey, number>> = {}
  let improvementTotal = 0
  for (const key of ABILITY_ORDER) {
    const value = Number((input.improvements as Record<string, unknown>)?.[key] ?? 0)
    if (!Number.isInteger(value) || value < 0 || value > 2) {
      return { ok: false, error: 'Ability improvements must be 0, 1 or 2.' }
    }
    if (value) improvements[key] = value
    improvementTotal += value
  }
  const allowed = level >= 4 ? 2 : 0
  if (improvementTotal > allowed) {
    return { ok: false, error: `At level ${level} you have ${allowed} points to spend.` }
  }

  // Equipment must name real armour and weapons, since armour class comes off it.
  const rawEquipment = (input.equipment ?? {}) as Record<string, unknown>
  const armourId = typeof rawEquipment.armourId === 'string' ? rawEquipment.armourId : undefined
  if (armourId && !ARMOURS.some((entry) => entry.id === armourId)) {
    return { ok: false, error: 'That is not a piece of armour.' }
  }
  const weaponIds = Array.isArray(rawEquipment.weaponIds)
    ? rawEquipment.weaponIds.filter(
        (entry): entry is string =>
          typeof entry === 'string' && WEAPONS.some((weapon) => weapon.id === entry),
      )
    : []
  if (weaponIds.length > MAX_WEAPONS) {
    return { ok: false, error: `Carry at most ${MAX_WEAPONS} weapons.` }
  }
  const equipment: StoredEquipment = {
    armourId,
    shield: rawEquipment.shield === true,
    weaponIds,
    extras: Array.isArray(rawEquipment.extras)
      ? rawEquipment.extras
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.slice(0, 80))
          .slice(0, 30)
      : [],
  }

  const strings = (value: unknown) =>
    Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string').slice(0, 40) : []

  const spells = strings(input.spells)
  const cantrips = strings(input.cantrips)

  const character: StoredCharacter = {
    id: identity?.id ?? randomUUID(),
    name,
    playerName,
    campaignId: typeof input.campaignId === 'string' && input.campaignId ? input.campaignId : undefined,
    level,
    raceId: race.id,
    subraceId,
    classId: charClass.id,
    subclassId,
    backgroundId: String(input.backgroundId),
    alignmentId: String(input.alignmentId ?? 'n'),
    baseAbilities,
    rolls: (input.rolls as StoredCharacter['rolls']) ?? undefined,
    improvements,
    skillChoices,
    equipment,
    spells,
    cantrips,
    notes: typeof input.notes === 'string' ? input.notes.slice(0, 2000) : undefined,
    createdAt: identity?.createdAt ?? new Date().toISOString(),
  }

  // A caster only knows so many spells and cantrips at their level — the
  // wizard's own UI stops you there, but a raw request should not be able to
  // pick the whole spell list.
  if (charClass.caster !== 'none') {
    const sheet = computeSheet(character)
    const known = sheet.spellcasting
    if (known) {
      if (cantrips.length > known.cantripsKnown) {
        return {
          ok: false,
          error: `A ${charClass.name} at level ${level} knows ${known.cantripsKnown} cantrip${known.cantripsKnown === 1 ? '' : 's'}, not ${cantrips.length}.`,
        }
      }
      if (spells.length > known.spellsKnown) {
        return {
          ok: false,
          error: `A ${charClass.name} at level ${level} knows ${known.spellsKnown} spell${known.spellsKnown === 1 ? '' : 's'}, not ${spells.length}.`,
        }
      }
    }
  }

  return { ok: true, character }
}
