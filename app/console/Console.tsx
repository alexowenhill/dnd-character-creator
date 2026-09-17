'use client'

import { useState } from 'react'

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

type Preset = { label: string; method: Method; path: string; body?: string }

/**
 * Every authenticated route on the real API, from routes/api.php in
 * AshleyJSheridan/dnd-game-api. Login/register/refresh are left out — the
 * shared account (lib/yonder-account.ts) already exercises those on every
 * request that needs a token, so there is nothing to test by hand there.
 * Anything with a {guid}-style placeholder needs editing before it will work;
 * "Use captured guid" below fills one in from the last response that had one.
 */
const PRESETS: { group: string; items: Preset[] }[] = [
  {
    group: 'Heartbeat & user',
    items: [
      { label: 'Heartbeat', method: 'GET', path: 'heartbeat' },
      { label: 'Get user', method: 'GET', path: 'user' },
      { label: 'Update user', method: 'PATCH', path: 'user', body: '{\n  "name": "New name"\n}' },
      { label: 'Log out', method: 'POST', path: 'user/logout' },
      { label: 'Delete user', method: 'DELETE', path: 'user' },
    ],
  },
  {
    group: 'Characters',
    items: [
      { label: 'List my characters', method: 'GET', path: 'characters' },
      {
        label: 'Create character',
        method: 'POST',
        path: 'characters',
        body: '{\n  "charName": "Test",\n  "charLevel": 1\n}',
      },
      { label: 'Classes', method: 'GET', path: 'characters/classes' },
      { label: 'One class', method: 'GET', path: 'characters/classes/{className}' },
      { label: 'Alignments', method: 'GET', path: 'characters/alignments' },
      { label: 'Backgrounds', method: 'GET', path: 'characters/backgrounds' },
      { label: 'Races', method: 'GET', path: 'characters/races' },
      { label: 'Get character', method: 'GET', path: 'characters/{guid}' },
      { label: 'Delete character', method: 'DELETE', path: 'characters/{guid}' },
      {
        label: 'Update character',
        method: 'PATCH',
        path: 'characters/{guid}',
        body: '{\n  "updateType": "race",\n  "value": 1\n}',
      },
      { label: 'Get starting equipment', method: 'GET', path: 'characters/{guid}/startingEquipment' },
      {
        label: 'Set starting equipment',
        method: 'POST',
        path: 'characters/{guid}/startingEquipment',
        body: '{\n  "items": []\n}',
      },
      { label: 'Get inventory', method: 'GET', path: 'characters/{guid}/inventory' },
      { label: 'Add items to inventory', method: 'POST', path: 'characters/{guid}/inventory', body: '{\n  "items": []\n}' },
      {
        label: 'Add custom item',
        method: 'POST',
        path: 'characters/{guid}/inventory/customItem',
        body: '{\n  "name": "Test item"\n}',
      },
      { label: 'Available spells', method: 'GET', path: 'characters/{guid}/spells/available' },
      { label: 'Toggle inventory item equipped', method: 'POST', path: 'characters/{charGuid}/inventory/{itemGuid}' },
      { label: 'Update inventory item', method: 'PATCH', path: 'characters/{charGuid}/inventory/{itemGuid}' },
      { label: 'Remove inventory item', method: 'DELETE', path: 'characters/{charGuid}/inventory/{itemGuid}' },
    ],
  },
  {
    group: 'Languages, names, dice',
    items: [
      { label: 'Languages', method: 'GET', path: 'game/languages' },
      { label: 'Names (generic)', method: 'GET', path: 'names' },
      { label: 'Names by style', method: 'GET', path: 'names/{elf|dwarf|orc|...}' },
      { label: 'Roll dice', method: 'POST', path: 'game/dice', body: '{\n  "dice": "1d20"\n}' },
    ],
  },
  {
    group: 'Items',
    items: [
      { label: 'All items', method: 'GET', path: 'game/items' },
      { label: 'Generated items', method: 'GET', path: 'game/items/generated' },
      {
        label: 'Add generated item',
        method: 'POST',
        path: 'game/items/generated',
        body: '{\n  "name": "Test item"\n}',
      },
      { label: 'Items by type', method: 'GET', path: 'game/items/{weapon|armor|potion|...}' },
      { label: 'Random item by type', method: 'GET', path: 'game/items/{weapon|armor|...}/random' },
      { label: 'Random item by type & rarity', method: 'GET', path: 'game/items/{weapon|armor|...}/random/{rarity}' },
    ],
  },
  {
    group: 'Spells',
    items: [
      { label: 'All spells', method: 'GET', path: 'game/spells' },
      { label: 'Spells by level', method: 'GET', path: 'game/spells/level/{0-9}' },
      { label: 'Spells by school', method: 'GET', path: 'game/spells/school/{school}' },
      { label: 'Spells by school & level', method: 'GET', path: 'game/spells/school/{school}/level/{0-9}' },
      { label: 'Spells by class', method: 'GET', path: 'game/spells/class/{classId}' },
      { label: 'Spells by class & level', method: 'GET', path: 'game/spells/class/{classId}/level/{0-9}' },
    ],
  },
  {
    group: 'Creatures, deities, conditions',
    items: [
      { label: 'All creatures', method: 'GET', path: 'creatures' },
      { label: 'Creatures by type', method: 'GET', path: 'creatures/{beast|dragon|undead|...}' },
      { label: 'Deities', method: 'GET', path: 'game/deities' },
      { label: 'Conditions', method: 'GET', path: 'game/conditions' },
      { label: 'Damage types', method: 'GET', path: 'game/damage-types' },
    ],
  },
  {
    group: 'Encounters',
    items: [
      { label: 'List my encounters', method: 'GET', path: 'encounters' },
      { label: 'Create encounter', method: 'POST', path: 'encounters/', body: '{\n  "name": "Test encounter"\n}' },
      { label: 'Get encounter', method: 'GET', path: 'encounters/{guid}' },
      { label: 'Update encounter', method: 'PATCH', path: 'encounters/{guid}' },
      { label: 'Delete encounter', method: 'DELETE', path: 'encounters/{guid}' },
      {
        label: 'Add creature to encounter',
        method: 'POST',
        path: 'encounters/{guid}/creatures',
        body: '{\n  "creatureId": 1\n}',
      },
      { label: 'Update encounter creature', method: 'PATCH', path: 'encounters/{guid}/creatures/{creatureGuid}' },
      { label: 'Remove encounter creature', method: 'DELETE', path: 'encounters/{guid}/creatures/{creatureGuid}' },
    ],
  },
  {
    group: 'Campaigns',
    items: [
      { label: 'My own campaigns', method: 'GET', path: 'campaigns/own' },
      { label: 'Campaigns I joined', method: 'GET', path: 'campaigns' },
      { label: 'Create campaign', method: 'POST', path: 'campaigns', body: '{\n  "name": "Test campaign"\n}' },
      { label: 'Invites', method: 'GET', path: 'campaigns/invites' },
      { label: 'Decline invite', method: 'DELETE', path: 'campaigns/invites/{inviteId}' },
      { label: 'Accept invite', method: 'POST', path: 'campaigns/invites/{inviteId}' },
      { label: 'Get campaign', method: 'GET', path: 'campaigns/{guid}' },
      { label: 'Update campaign', method: 'PATCH', path: 'campaigns/{guid}' },
      { label: 'Delete campaign', method: 'DELETE', path: 'campaigns/{guid}' },
      { label: 'Add character to campaign', method: 'POST', path: 'campaigns/{guid}/characters', body: '{\n  "charGuid": ""\n}' },
      { label: 'Remove character from campaign', method: 'DELETE', path: 'campaigns/{campaignGuid}/characters/{charGuid}' },
      { label: 'Invite player', method: 'POST', path: 'campaigns/{guid}/invite', body: '{\n  "email": ""\n}' },
    ],
  },
  {
    group: 'Campaign lore & maps',
    items: [
      { label: 'Lore groups', method: 'GET', path: 'campaigns/lore-groups' },
      { label: 'Campaign lore', method: 'GET', path: 'campaigns/{guid}/lore' },
      { label: 'Create lore item', method: 'POST', path: 'campaigns/{guid}/lore', body: '{\n  "title": "Test"\n}' },
      { label: 'Delete lore item', method: 'DELETE', path: 'campaigns/{guid}/lore/{loreGuid}' },
      { label: 'Edit lore item', method: 'PATCH', path: 'campaigns/{guid}/lore/{loreGuid}' },
      { label: 'Create map', method: 'POST', path: 'campaigns/{guid}/maps' },
      { label: 'Get map', method: 'GET', path: 'campaigns/{campaignGuid}/maps/{mapGuid}' },
      { label: 'Update map', method: 'PATCH', path: 'campaigns/{campaignGuid}/maps/{mapGuid}' },
      { label: 'Delete map', method: 'DELETE', path: 'campaigns/{campaignGuid}/maps/{mapGuid}' },
      { label: 'Add entity to map', method: 'POST', path: 'campaigns/{campaignGuid}/maps/{mapGuid}/entities' },
      {
        label: 'Update map entity',
        method: 'PATCH',
        path: 'campaigns/{campaignGuid}/maps/{mapGuid}/entities/{entityGuid}',
      },
      {
        label: 'Delete map entity',
        method: 'DELETE',
        path: 'campaigns/{campaignGuid}/maps/{mapGuid}/entities/{entityGuid}',
      },
    ],
  },
]

/** Keys that look like a resource identifier, for the "captured guid" box. */
const GUID_KEYS = ['guid', 'uuid', 'charGuid', 'campaignGuid', 'encounterGuid', 'mapGuid', 'loreGuid', 'itemGuid', 'id']

function findGuid(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const obj = body as Record<string, unknown>
  for (const key of GUID_KEYS) {
    const value = obj[key]
    if (typeof value === 'string' && value.length > 0) return value
    if (typeof value === 'number') return String(value)
  }
  // One level deep, in case the response wraps the resource in a "data" key.
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = findGuid(value)
      if (nested) return nested
    }
  }
  return null
}

type ApiResponse = {
  ok: boolean
  status: number
  contentType?: string
  redirectedTo?: string
  followedRedirectTo?: string
  body: unknown
  reason?: string
}

export function Console() {
  const [method, setMethod] = useState<Method>('GET')
  const [path, setPath] = useState('characters/classes')
  const [bodyText, setBodyText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [capturedGuid, setCapturedGuid] = useState<string | null>(null)

  function applyPreset(preset: Preset) {
    setMethod(preset.method)
    setPath(preset.path)
    setBodyText(preset.body ?? '')
    setError(null)
  }

  function useCapturedGuid() {
    if (!capturedGuid) return
    setPath((current) => current.replace(/\{[a-zA-Z]*[gG]uid\}/g, capturedGuid))
  }

  async function send() {
    setLoading(true)
    setError(null)
    try {
      const cleanPath = path.trim().replace(/^\/?(api\/)?/, '')
      const res = await fetch(`/api/console/${cleanPath}`, {
        method,
        headers: bodyText.trim() ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'GET' || method === 'DELETE' ? undefined : bodyText.trim() || undefined,
      })
      const data = (await res.json()) as ApiResponse
      setResponse(data)
      const guid = findGuid(data.body)
      if (guid) setCapturedGuid(guid)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Preset
          </label>
          <select
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-stone-200"
            onChange={(event) => {
              const [groupIndex, itemIndex] = event.target.value.split(':').map(Number)
              const preset = PRESETS[groupIndex]?.items[itemIndex]
              if (preset) applyPreset(preset)
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Pick an endpoint…
            </option>
            {PRESETS.map((group, groupIndex) => (
              <optgroup key={group.group} label={group.group}>
                {group.items.map((item, itemIndex) => (
                  <option key={item.label} value={`${groupIndex}:${itemIndex}`}>
                    {item.method} {item.path}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Captured guid
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={capturedGuid ?? ''}
              placeholder="Appears after a response that has one"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-stone-400"
            />
            <button
              type="button"
              onClick={useCapturedGuid}
              disabled={!capturedGuid}
              className="whitespace-nowrap rounded-lg border border-white/10 px-3 py-2 text-sm text-stone-300 hover:bg-white/10 disabled:opacity-40"
            >
              Use in path
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <select
          value={method}
          onChange={(event) => setMethod(event.target.value as Method)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-stone-200"
        >
          {(['GET', 'POST', 'PATCH', 'DELETE'] as Method[]).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="flex items-center text-sm text-stone-500">/api/</span>
        <input
          value={path}
          onChange={(event) => setPath(event.target.value)}
          placeholder="characters/classes"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-stone-200"
        />
      </div>

      {method !== 'GET' && method !== 'DELETE' && (
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Body (JSON, optional)
          </label>
          <textarea
            value={bodyText}
            onChange={(event) => setBodyText(event.target.value)}
            rows={6}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-stone-200"
          />
        </div>
      )}

      <button
        type="button"
        onClick={send}
        disabled={loading}
        className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-stone-950 transition-colors hover:bg-amber-500 disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send'}
      </button>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {response && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
            <span
              className={
                response.ok
                  ? 'rounded bg-emerald-500/20 px-2 py-0.5 font-medium text-emerald-300'
                  : 'rounded bg-red-500/20 px-2 py-0.5 font-medium text-red-300'
              }
            >
              {response.status || '—'}
            </span>
            {response.contentType && <span>{response.contentType}</span>}
            {response.redirectedTo && <span>redirected → {response.redirectedTo}</span>}
            {response.followedRedirectTo && <span>followed → {response.followedRedirectTo}</span>}
            {response.reason && <span className="text-amber-300">{response.reason}</span>}
          </div>
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-all text-xs text-stone-300">
            {JSON.stringify(response.body, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
