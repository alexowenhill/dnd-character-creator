/**
 * Reads a finished character out of `GET /api/characters/{guid}`.
 *
 * Like ./shape, this probes for field names rather than assuming them: the
 * upstream API documents request bodies but not responses. Anything it cannot
 * find is simply left undefined and the UI omits that part of the sheet, so a
 * shape we guessed wrong degrades to a smaller sheet rather than a crash. The
 * raw JSON stays available behind a toggle either way.
 */

// Extension is explicit so this module also loads under plain Node (which the
// probe script in scripts/ relies on); Turbopack and tsc handle it either way.
import { ABILITIES } from './shape.ts'

export type SheetAbility = {
  id: number
  short: string
  label: string
  score?: number
  modifier?: number
}

export type CharacterSheet = {
  name?: string
  level?: number
  race?: string
  className?: string
  classPath?: string
  background?: string
  abilities: SheetAbility[]
  languages: string[]
  spells: string[]
  characteristics: string[]
  /** True when we recognised essentially nothing — the UI then leads with raw JSON. */
  empty: boolean
}

/** 5e ability modifier. */
export function modifierFor(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : String(modifier)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A referenced entity may arrive as a string, or as an object with a name. */
function readLabel(value: unknown): string | undefined {
  if (typeof value === 'string') return value || undefined
  if (typeof value === 'number') return String(value)
  if (isRecord(value)) {
    for (const key of ['name', 'title', 'label', 'text', 'value']) {
      const found = value[key]
      if (typeof found === 'string' && found) return found
    }
  }
  return undefined
}

function readLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(readLabel).filter((entry): entry is string => Boolean(entry))
}

/** Look for a key on the object, then one level into common envelopes. */
function field(root: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (root[key] !== undefined && root[key] !== null) return root[key]
  }
  return undefined
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

/**
 * Ability scores may come back keyed by id, keyed by name, or as a list.
 * Returns the six abilities in character-sheet order regardless.
 */
function readAbilities(source: unknown): SheetAbility[] {
  const byId = new Map<number, number>()

  const remember = (abilityId: unknown, score: unknown) => {
    const id = readNumber(abilityId)
    const value = readNumber(score)
    if (id !== undefined && value !== undefined) byId.set(id, value)
  }

  if (Array.isArray(source)) {
    for (const entry of source) {
      if (!isRecord(entry)) continue
      const score = field(entry, ['score', 'value', 'total', 'result', 'rolled'])
      const id = field(entry, ['abilityId', 'ability_id', 'id'])
      if (id !== undefined) {
        remember(id, score)
        continue
      }
      // Keyed by name instead of id.
      const label = readLabel(field(entry, ['name', 'ability', 'label']))
      const match = ABILITIES.find(
        (ability) =>
          label &&
          (label.toLowerCase() === ability.label.toLowerCase() ||
            label.toLowerCase() === ability.short.toLowerCase()),
      )
      if (match) remember(match.id, score)
    }
  } else if (isRecord(source)) {
    for (const [key, value] of Object.entries(source)) {
      const match = ABILITIES.find(
        (ability) =>
          key.toLowerCase() === ability.label.toLowerCase() ||
          key.toLowerCase() === ability.short.toLowerCase(),
      )
      // The value may be the score itself or an object wrapping it.
      const score = isRecord(value)
        ? field(value, ['score', 'value', 'total', 'result'])
        : value
      if (match) {
        remember(match.id, score)
      } else {
        const asId = readNumber(key)
        if (asId !== undefined) remember(asId, score)
      }
    }
  }

  return ABILITIES.map((ability) => {
    const score = byId.get(ability.id)
    return {
      id: ability.id,
      short: ability.short,
      label: ability.label,
      score,
      modifier: score === undefined ? undefined : modifierFor(score),
    }
  })
}

export function readSheet(payload: unknown): CharacterSheet {
  // Unwrap a single-key envelope such as { character: {...} } or { data: {...} }.
  let root: Record<string, unknown> = isRecord(payload) ? payload : {}
  for (const key of ['character', 'data', 'result']) {
    const nested = root[key]
    if (isRecord(nested)) {
      root = nested
      break
    }
  }

  const abilities = readAbilities(
    field(root, ['abilities', 'abilityScores', 'ability_scores', 'stats']),
  )

  const classValue = field(root, ['class', 'charClass', 'characterClass'])
  const sheet: CharacterSheet = {
    name: readLabel(field(root, ['name', 'characterName'])),
    level: readNumber(field(root, ['level', 'characterLevel'])),
    race: readLabel(field(root, ['race', 'charRace', 'characterRace'])),
    className: readLabel(classValue),
    classPath: readLabel(
      field(root, ['classPath', 'class_path', 'path', 'subclass', 'archetype']) ??
        // The path is often nested inside the class object.
        (isRecord(classValue) ? field(classValue, ['path', 'classPath', 'subclass']) : undefined),
    ),
    background: readLabel(field(root, ['background', 'charBackground'])),
    abilities,
    languages: readLabels(field(root, ['languages', 'knownLanguages'])),
    spells: readLabels(field(root, ['spells', 'knownSpells', 'spellList'])),
    characteristics: readLabels(field(root, ['characteristics', 'traits'])),
    empty: false,
  }

  sheet.empty =
    !sheet.name &&
    !sheet.race &&
    !sheet.className &&
    !sheet.background &&
    abilities.every((ability) => ability.score === undefined)

  return sheet
}
