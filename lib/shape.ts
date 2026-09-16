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

/**
 * Find the auth token in a login/register response.
 *
 * Laravel apps hand this back under a variety of names — Sanctum's
 * `createToken()` produces `plainTextToken`, Passport uses `access_token` — and
 * it may sit at the top level or inside a `data`/`user` envelope. Searches
 * breadth-first so a shallow match wins over a deeper one.
 */
const TOKEN_KEYS = [
  'token', 'access_token', 'accessToken', 'plainTextToken', 'plain_text_token',
  'auth_token', 'authToken', 'api_token', 'apiToken', 'bearer', 'jwt',
]

export function extractToken(payload: unknown): string | null {
  // Some APIs return the bare token as the whole body.
  if (typeof payload === 'string') {
    const trimmed = payload.trim()
    return trimmed && !trimmed.startsWith('<') && !trimmed.includes(' ') ? trimmed : null
  }
  return findByKeys(payload, TOKEN_KEYS)
}

/**
 * A short, readable rendering of an upstream body, for error messages.
 * Prefers a message field, since a 200 carrying "Invalid credentials" is the
 * likeliest reason a token is missing.
 */
export function describeUpstream(payload: unknown): string {
  if (payload === null || payload === undefined) return 'empty response'
  if (typeof payload === 'string') {
    const trimmed = payload.trim()
    if (trimmed.startsWith('<')) return 'an HTML page rather than JSON'
    return trimmed.slice(0, 200)
  }
  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    for (const key of ['message', 'error', 'errors', 'detail', 'description']) {
      const value = obj[key]
      if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 200)
      if (value && typeof value === 'object') return JSON.stringify(value).slice(0, 200)
    }
    return JSON.stringify(payload).slice(0, 200)
  }
  return String(payload)
}

/**
 * Breadth-first search for the first non-empty string or number stored under
 * any of `keys`. Shallow matches win, and a cycle cannot hang it.
 */
function findByKeys(payload: unknown, keys: string[]): string | null {
  const queue: unknown[] = [payload]
  const seen = new Set<unknown>()
  let guard = 0

  while (queue.length && guard++ < 200) {
    const current = queue.shift()
    if (!current || typeof current !== 'object' || seen.has(current)) continue
    seen.add(current)

    const obj = current as Record<string, unknown>
    for (const key of keys) {
      const value = obj[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
      // An id may arrive as a number; the path it builds is a string either way.
      if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    }
    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') queue.push(value)
    }
  }

  return null
}

const GUID_KEYS = [
  'guid', 'uuid', 'characterGuid', 'character_guid', 'charGuid', 'char_guid',
]
// Only used if nothing guid-shaped turns up: an `id` is likelier to belong to
// something else in the response (the owning user, say) than a real guid is.
const GUID_FALLBACK_KEYS = [
  'characterId', 'character_id', 'charId', 'char_id', 'id',
]

/**
 * Find the character identifier in a create-character response — whatever the
 * PATCH calls need to address the character afterwards.
 */
export function extractGuid(payload: unknown): string | null {
  return findByKeys(payload, GUID_KEYS) ?? findByKeys(payload, GUID_FALLBACK_KEYS)
}

/**
 * Read `GET /api/characters` into guid/name pairs.
 *
 * The docs document no response body for the create call and describe a
 * character's guid as "returned by the characters list endpoint", so this is
 * how a freshly created character gets identified.
 */
export function listCharacters(payload: unknown): { guid: string; name: string }[] {
  return unwrapList(payload)
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const guid = findByKeys(entry, GUID_KEYS) ?? findByKeys(entry, GUID_FALLBACK_KEYS)
      if (guid === null) return null
      const name = pick(entry as Record<string, unknown>, NAME_KEYS)
      return { guid, name: name === undefined ? '' : String(name) }
    })
    .filter((entry): entry is { guid: string; name: string } => entry !== null)
}

/** Find the roll guid + dice values in a dice response. */
export function extractRoll(payload: unknown): { guid: string; values: number[] } | null {
  if (!payload || typeof payload !== 'object') return null
  const obj = payload as Record<string, unknown>
  const guid = findByKeys(obj, ['guid', 'uuid', 'rollGuid', 'roll_guid', 'id'])
  if (guid === null) return null

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
