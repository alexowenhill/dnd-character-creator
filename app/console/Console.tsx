'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/Button'

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

type Entry = {
  id: number
  method: Method
  path: string
  sentBody: string
  status: number
  ms: number
  response: unknown
}

type Preset = { label: string; method: Method; path: string; body?: string }

/**
 * Every endpoint the API docs describe, plus guesses for the ones they do not.
 * `{guid}` in a path is replaced with whatever is in the guid box.
 */
const PRESETS: { group: string; items: Preset[] }[] = [
  {
    group: 'Users',
    items: [
      { label: 'GET user', method: 'GET', path: 'user' },
      { label: 'POST logout', method: 'POST', path: 'user/logout' },
    ],
  },
  {
    group: 'Characters',
    items: [
      { label: 'GET characters (list)', method: 'GET', path: 'characters' },
      {
        label: 'POST create character',
        method: 'POST',
        path: 'characters/',
        body: JSON.stringify({ name: 'Test Character', level: 1 }, null, 2),
      },
      { label: 'GET one character', method: 'GET', path: 'characters/{guid}' },
      { label: 'GET available spells', method: 'GET', path: 'characters/{guid}/spells/available' },
    ],
  },
  {
    group: 'Option lists',
    items: [
      { label: 'GET races', method: 'GET', path: 'characters/races' },
      { label: 'GET classes', method: 'GET', path: 'characters/classes' },
      { label: 'GET backgrounds', method: 'GET', path: 'characters/backgrounds' },
      { label: 'GET languages', method: 'GET', path: 'game/languages' },
    ],
  },
  {
    group: 'Update a character',
    items: [
      {
        label: 'PATCH race',
        method: 'PATCH',
        path: 'characters/{guid}',
        body: JSON.stringify({ updateType: 'race', charRaceId: 1 }, null, 2),
      },
      {
        label: 'PATCH class',
        method: 'PATCH',
        path: 'characters/{guid}',
        body: JSON.stringify({ updateType: 'class', charClassId: 1, classPathId: [1] }, null, 2),
      },
      {
        label: 'PATCH background',
        method: 'PATCH',
        path: 'characters/{guid}',
        body: JSON.stringify(
          { updateType: 'background', charBackgroundId: 1, characteristics: [1, 2, 3, 4, 5] },
          null,
          2,
        ),
      },
      {
        label: 'PATCH languages',
        method: 'PATCH',
        path: 'characters/{guid}',
        body: JSON.stringify({ updateType: 'languages', languages: [1] }, null, 2),
      },
      {
        label: 'PATCH spells',
        method: 'PATCH',
        path: 'characters/{guid}',
        body: JSON.stringify({ updateType: 'spells', spells: [1] }, null, 2),
      },
      {
        label: 'PATCH abilities',
        method: 'PATCH',
        path: 'characters/{guid}',
        body: JSON.stringify(
          {
            updateType: 'abilities',
            abilityRolls: [
              { abilityId: 1, guid: 'roll-guid-here' },
              { abilityId: 2, guid: 'roll-guid-here' },
              { abilityId: 3, guid: 'roll-guid-here' },
              { abilityId: 4, guid: 'roll-guid-here' },
              { abilityId: 5, guid: 'roll-guid-here' },
              { abilityId: 6, guid: 'roll-guid-here' },
            ],
          },
          null,
          2,
        ),
      },
    ],
  },
  {
    group: 'Dice',
    items: [
      {
        label: 'POST roll 4d6',
        method: 'POST',
        path: 'game/dice',
        body: JSON.stringify({ dice: { d6: 4 } }, null, 2),
      },
      {
        label: 'POST roll 4d6 + 2d20',
        method: 'POST',
        path: 'game/dice',
        body: JSON.stringify({ dice: { d6: 4, d20: 2 } }, null, 2),
      },
    ],
  },
  {
    group: 'Names',
    items: [
      { label: 'GET names (generic)', method: 'GET', path: 'names' },
      { label: 'GET names/dwarf', method: 'GET', path: 'names/dwarf' },
      { label: 'GET names/elf', method: 'GET', path: 'names/elf' },
      { label: 'GET names/tiefling', method: 'GET', path: 'names/tiefling' },
      { label: 'GET names/angel', method: 'GET', path: 'names/angel' },
    ],
  },
  {
    group: 'Spells',
    items: [
      { label: 'GET all spells', method: 'GET', path: 'game/spells' },
      { label: 'GET cantrips (level 0)', method: 'GET', path: 'game/spells/level/0' },
      { label: 'GET level 1 spells', method: 'GET', path: 'game/spells/level/1' },
      { label: 'GET evocation', method: 'GET', path: 'game/spells/school/evocation' },
      { label: 'GET wizard spells (class 12)', method: 'GET', path: 'game/spells/class/12' },
      { label: 'GET wizard cantrips', method: 'GET', path: 'game/spells/class/12/level/0' },
      {
        label: 'GET evocation level 1',
        method: 'GET',
        path: 'game/spells/school/evocation/level/1',
      },
    ],
  },
  {
    group: 'Items',
    items: [
      { label: 'GET weapons', method: 'GET', path: 'game/items/weapon' },
      { label: 'GET armor', method: 'GET', path: 'game/items/armor' },
      { label: 'GET potions', method: 'GET', path: 'game/items/potion' },
      { label: 'GET packs', method: 'GET', path: 'game/items/pack' },
      { label: 'GET random weapon', method: 'GET', path: 'game/items/weapon/random' },
      { label: 'GET random armor', method: 'GET', path: 'game/items/armor/random' },
      { label: 'GET random book', method: 'GET', path: 'game/items/book/random' },
      { label: 'GET random gemstone', method: 'GET', path: 'game/items/gemstone/random' },
    ],
  },
  {
    group: 'Creatures',
    items: [
      { label: 'GET dragons', method: 'GET', path: 'creatures/dragon' },
      { label: 'GET beasts', method: 'GET', path: 'creatures/beast' },
      { label: 'GET undead', method: 'GET', path: 'creatures/undead' },
      { label: 'GET humanoids', method: 'GET', path: 'creatures/humanoid' },
    ],
  },
  {
    group: 'Encounters',
    items: [
      {
        label: 'POST encounter (forest, medium)',
        method: 'POST',
        path: 'encounters',
        body: JSON.stringify(
          { characters: ['{guid}'], difficulty: 2, environment: 'forest' },
          null,
          2,
        ),
      },
      {
        label: 'POST encounter (underdark, deadly)',
        method: 'POST',
        path: 'encounters',
        body: JSON.stringify(
          { characters: ['{guid}'], difficulty: 4, environment: 'underdark' },
          null,
          2,
        ),
      },
    ],
  },
]

const METHODS: Method[] = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']

/** Pull anything guid-ish out of a response so it can be reused in a path. */
function sniffGuid(payload: unknown): string | null {
  const queue: unknown[] = [payload]
  const seen = new Set<unknown>()
  let guard = 0
  while (queue.length && guard++ < 200) {
    const current = queue.shift()
    if (!current || typeof current !== 'object' || seen.has(current)) continue
    seen.add(current)
    for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
      if (/^(guid|uuid)$/i.test(key) && (typeof value === 'string' || typeof value === 'number')) {
        return String(value)
      }
      if (value && typeof value === 'object') queue.push(value)
    }
  }
  return null
}

const input =
  'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-stone-200 outline-none focus:border-amber-500 font-mono text-sm'

export function Console({ signedIn }: { signedIn: boolean }) {
  const [method, setMethod] = useState<Method>('GET')
  const [path, setPath] = useState('characters/races')
  const [body, setBody] = useState('')
  const [guid, setGuid] = useState('')
  const [busy, setBusy] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [bodyError, setBodyError] = useState('')
  const [copied, setCopied] = useState(false)

  const resolvedPath = path.replace(/\{guid\}/g, guid).replace(/^\/+/, '')
  const sendsBody = method !== 'GET' && method !== 'DELETE'

  const send = async () => {
    setBodyError('')
    let parsed: unknown = undefined

    if (sendsBody && body.trim()) {
      try {
        // {guid} is substituted in the body too, for encounters and the like.
        parsed = JSON.parse(body.replace(/\{guid\}/g, guid))
      } catch (err) {
        setBodyError(`Body is not valid JSON: ${(err as Error).message}`)
        return
      }
    }

    setBusy(true)
    const started = performance.now()
    try {
      const res = await fetch(`/api/dnd/${resolvedPath}`, {
        method,
        headers: parsed !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: parsed !== undefined ? JSON.stringify(parsed) : undefined,
      })
      const ms = Math.round(performance.now() - started)
      const text = await res.text()
      let response: unknown = text
      try {
        response = text ? JSON.parse(text) : null
      } catch {
        // Leave it as text — an HTML error page is worth seeing verbatim.
      }

      setEntries((prev) => [
        {
          id: Date.now(),
          method,
          path: resolvedPath,
          sentBody: parsed !== undefined ? JSON.stringify(parsed) : '',
          status: res.status,
          ms,
          response,
        },
        ...prev,
      ])

      // Offer up any guid we spot, so the next call can use {guid}.
      const found = sniffGuid(response)
      if (found && !guid) setGuid(found)
    } catch (err) {
      setEntries((prev) => [
        {
          id: Date.now(),
          method,
          path: resolvedPath,
          sentBody: '',
          status: 0,
          ms: Math.round(performance.now() - started),
          response: `Request failed: ${(err as Error).message}`,
        },
        ...prev,
      ])
    } finally {
      setBusy(false)
    }
  }

  const applyPreset = (preset: Preset) => {
    setMethod(preset.method)
    setPath(preset.path)
    setBody(preset.body ?? '')
    setBodyError('')
  }

  /** The whole session as text, for pasting into a bug report. */
  const copyTranscript = async () => {
    const text = entries
      .slice()
      .reverse()
      .map((entry) => {
        const lines = [
          `${entry.method} /api/${entry.path}  →  ${entry.status} (${entry.ms}ms)`,
        ]
        if (entry.sentBody) lines.push(`request:  ${entry.sentBody}`)
        lines.push(`response: ${JSON.stringify(entry.response, null, 2)}`)
        return lines.join('\n')
      })
      .join('\n\n────────────────\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (!signedIn) {
    return (
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Sign in on the{' '}
        <Link href="/" className="underline">
          main page
        </Link>{' '}
        first — every endpoint needs the token, and the console borrows the same one.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* Request builder */}
      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as Method)}
            aria-label="HTTP method"
            className={`${input} w-32 cursor-pointer`}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <div className="flex min-w-[260px] flex-1 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3">
            <span className="font-mono text-sm text-stone-500">/api/</span>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              aria-label="Path"
              spellCheck={false}
              className="flex-1 bg-transparent py-2 font-mono text-sm text-stone-200 outline-none"
            />
          </div>
          <Button type="button" variant="primary" onClick={send} disabled={busy}>
            {busy ? 'Sending…' : 'Send'}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <span>Sends to</span>
          <code className="rounded bg-black/30 px-2 py-1 text-stone-300">/api/{resolvedPath}</code>
          <span>with your bearer token attached server-side.</span>
        </div>

        <label className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
          <span className="whitespace-nowrap">
            Captured guid — substituted for {'{guid}'} in the path and the body
          </span>
          <input
            value={guid}
            onChange={(e) => setGuid(e.target.value)}
            placeholder="none yet"
            spellCheck={false}
            className={`${input} max-w-xs`}
          />
        </label>

        {sendsBody && (
          <div className="space-y-1">
            <label className="block text-xs text-stone-400">JSON body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              spellCheck={false}
              placeholder="{ }"
              className={`${input} resize-y`}
            />
            {bodyError && <p className="text-xs text-red-400">{bodyError}</p>}
          </div>
        )}
      </div>

      {/* Presets */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-stone-300">Presets</h2>
        {PRESETS.map((section) => (
          <div key={section.group} className="space-y-1.5">
            <div className="text-xs uppercase tracking-wide text-stone-500">{section.group}</div>
            <div className="flex flex-wrap gap-2">
              {section.items.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-stone-300 hover:bg-white/10 cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Results */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-stone-300">Responses</h2>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={copyTranscript}>
                {copied ? 'Copied' : 'Copy all as text'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEntries([])}>
                Clear
              </Button>
            </div>
          </div>

          {entries.map((entry) => (
            <div key={entry.id} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded px-2 py-0.5 font-medium ${
                    entry.status >= 200 && entry.status < 300
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {entry.status || 'ERR'}
                </span>
                <code className="text-stone-300">
                  {entry.method} /api/{entry.path}
                </code>
                <span className="text-stone-500">{entry.ms}ms</span>
              </div>
              {entry.sentBody && (
                <pre className="overflow-x-auto rounded bg-black/20 p-2 text-xs text-stone-400">
                  {entry.sentBody}
                </pre>
              )}
              <pre className="max-h-96 overflow-auto rounded bg-black/30 p-3 text-xs text-stone-300">
                {typeof entry.response === 'string'
                  ? entry.response
                  : JSON.stringify(entry.response, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
