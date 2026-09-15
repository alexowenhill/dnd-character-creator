/**
 * Pure helpers for reading D&D Yonder responses.
 *
 * The upstream docs describe request bodies but not response shapes, so these
 * probe for the common envelope/field names rather than assuming one. Kept free
 * of server-only code so client components can import them.
 */

/* ------------------------------------------------------------------ *
 * Response normalisers
 * ------------------------------------------------------------------ */

export type Option = {
  id: number | string
  name: string
  desc?: string
  /** Nested option lists, e.g. class paths or background characteristics. */
  children?: Option[]
  raw: Record<string, unknown>
}

const LIST_KEYS = [
  'data', 'results', 'items', 'characters', 'classes', 'races', 'backgrounds',
  'languages', 'spells', 'creatures', 'names', 'characteristics',
]

const ID_KEYS = [
  'id', 'charClassId', 'charRaceId', 'charBackgroundId', 'classPathId',
  'languageId', 'spellId', 'characteristicId', 'guid', 'uuid',
]

const NAME_KEYS = ['name', 'title', 'label', 'spell_name', 'text', 'value']

const DESC_KEYS = ['description', 'desc', 'summary', 'details', 'blurb']

const CHILD_KEYS = [
  'paths', 'classPaths', 'class_paths', 'subclasses', 'characteristics',
  'options', 'children',
]

/** Pull an array out of a response whether it is bare or wrapped in an envelope. */
export function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    for (const key of LIST_KEYS) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[]
    }
    // Fall back to the only array present, if there is exactly one.
    const arrays = Object.values(obj).filter(Array.isArray) as unknown[][]
    if (arrays.length === 1) return arrays[0]
  }
  return []
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = obj[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

export function toOption(entry: unknown): Option | null {
  if (entry === null || entry === undefined) return null

  // Some endpoints (notably /api/names) return bare strings.
  if (typeof entry === 'string' || typeof entry === 'number') {
    return { id: entry, name: String(entry), raw: { value: entry } }
  }
  if (typeof entry !== 'object') return null

  const obj = entry as Record<string, unknown>
  const id = pick(obj, ID_KEYS)
  const name = pick(obj, NAME_KEYS)
  if (id === undefined && name === undefined) return null

  const desc = pick(obj, DESC_KEYS)
  const childSource = pick(obj, CHILD_KEYS)
  const children = Array.isArray(childSource)
    ? (childSource.map(toOption).filter(Boolean) as Option[])
    : undefined

  return {
    id: (id ?? String(name)) as number | string,
    name: name === undefined ? `#${String(id)}` : String(name),
    desc: desc === undefined ? undefined : String(desc),
    children: children && children.length ? children : undefined,
    raw: obj,
  }
}

export function toOptions(payload: unknown): Option[] {
  return unwrapList(payload).map(toOption).filter(Boolean) as Option[]
}

/** Find the character guid in a create-character response. */
export function extractGuid(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const obj = payload as Record<string, unknown>
  const direct = pick(obj, ['guid', 'uuid', 'id'])
  if (typeof direct === 'string') return direct
  for (const key of ['character', 'data']) {
    const nested = obj[key]
    if (nested && typeof nested === 'object') {
      const found = extractGuid(nested)
      if (found) return found
    }
  }
  return null
}

/** Find the roll guid + dice values in a dice response. */
export function extractRoll(payload: unknown): { guid: string; values: number[] } | null {
  if (!payload || typeof payload !== 'object') return null
  const obj = payload as Record<string, unknown>
  const guid = obj.guid ?? obj.id
  if (typeof guid !== 'string') return null

  const rolls = obj.rolls
  const values: number[] = []
  if (rolls && typeof rolls === 'object') {
    for (const set of Object.values(rolls as Record<string, unknown>)) {
      if (Array.isArray(set)) {
        for (const n of set) if (typeof n === 'number') values.push(n)
      }
    }
  }
  return { guid, values }
}

/**
 * Preview total for a set of dice, using the usual "4d6 drop lowest" rule.
 * The server stores the raw roll and applies its own rule, so treat this as a
 * display hint rather than the authoritative score.
 */
export function bestThreeOfFour(values: number[]): number {
  return [...values].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0)
}

/**
 * Ability ids are alphabetical in the upstream API, which does not match the
 * order character sheets use. Keep the mapping in one place.
 */
export const ABILITIES = [
  { id: 5, short: 'STR', label: 'Strength' },
  { id: 3, short: 'DEX', label: 'Dexterity' },
  { id: 2, short: 'CON', label: 'Constitution' },
  { id: 4, short: 'INT', label: 'Intelligence' },
  { id: 6, short: 'WIS', label: 'Wisdom' },
  { id: 1, short: 'CHA', label: 'Charisma' },
] as const

export const NAME_STYLES = [
  'generic', 'human', 'elf', 'dwarf', 'halfling', 'gnome', 'orc', 'goblin',
  'ogre', 'fey', 'demon', 'angel', 'tiefling',
] as const
