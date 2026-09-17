import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { requireSession } from '@/lib/guard'
import { listCharacters, saveCharacter } from '@/lib/store'
import { computeSheet, type StoredCharacter } from '@/lib/character'
import { ABILITY_ORDER, classById, raceById, backgroundById, SKILL_KEYS } from '@/lib/srd'
import type { AbilityKey, SkillKey } from '@/lib/srd'
import { ARMOURS, WEAPONS, type StoredEquipment } from '@/lib/equipment'

export async function GET() {
  const denied = await requireSession()
  if (denied) return denied

  const characters = await listCharacters()
  // Send computed sheets so the party page can show real numbers.
  return NextResponse.json(characters.map((character) => computeSheet(character)))
}

/** Validate the incoming character rather than trusting the client's maths. */
function validate(body: unknown): { ok: true; character: StoredCharacter } | { ok: false; error: string } {
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

  return {
    ok: true,
    character: {
      id: randomUUID(),
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
      spells: strings(input.spells),
      cantrips: strings(input.cantrips),
      notes: typeof input.notes === 'string' ? input.notes.slice(0, 2000) : undefined,
      createdAt: new Date().toISOString(),
    },
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireSession()
  if (denied) return denied

  const result = validate(await req.json().catch(() => null))
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  await saveCharacter(result.character)
  return NextResponse.json({ id: result.character.id, sheet: computeSheet(result.character) }, { status: 201 })
}
