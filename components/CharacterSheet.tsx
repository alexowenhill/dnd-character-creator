'use client'

import { useState, type ReactNode } from 'react'
import { formatModifier, readSheet } from '@/lib/sheet'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-0.5 text-stone-200">{value}</div>
    </div>
  )
}

function Tags({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-stone-300">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-stone-300"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function RawJson({ payload, open }: { payload: unknown; open: boolean }) {
  const [shown, setShown] = useState(open)
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShown((value) => !value)}
        className="text-sm text-stone-400 hover:text-stone-300 cursor-pointer"
      >
        {shown ? 'Hide raw API response' : 'Show raw API response'}
      </button>
      {shown && (
        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-stone-300">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  )
}

/**
 * Renders the finished character. Fields the reader could not find are left
 * out rather than shown empty, and the raw response is always one click away —
 * if a guessed field name is wrong, the sheet gets smaller but still works.
 */
export function CharacterSheet({ payload, fallbackName }: { payload: unknown; fallbackName?: string }) {
  const sheet = readSheet(payload)
  const rolled = sheet.abilities.filter((ability) => ability.score !== undefined)

  const summary: ReactNode[] = []
  if (sheet.race) summary.push(<Stat key="race" label="Race" value={sheet.race} />)
  if (sheet.className) {
    summary.push(
      <Stat
        key="class"
        label="Class"
        value={sheet.classPath ? `${sheet.className} — ${sheet.classPath}` : sheet.className}
      />,
    )
  }
  if (sheet.background) summary.push(<Stat key="bg" label="Background" value={sheet.background} />)
  if (sheet.level !== undefined) summary.push(<Stat key="lvl" label="Level" value={String(sheet.level)} />)

  if (sheet.empty) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          The character was saved, but this response did not use any field names the sheet reader
          recognises. The full response is below — see &ldquo;Response shapes&rdquo; in the README for how to
          teach <code className="text-amber-100">lib/sheet.ts</code> the right names.
        </p>
        <RawJson payload={payload} open />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-100">{sheet.name || fallbackName || 'Character'}</h2>
      </div>

      {summary.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{summary}</div>}

      {rolled.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-stone-300">Ability scores</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {sheet.abilities.map((ability) => (
              <div
                key={ability.id}
                className="rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-center"
                title={ability.label}
              >
                <div className="text-xs uppercase tracking-wide text-stone-500">{ability.short}</div>
                <div className="text-2xl font-semibold text-stone-100">
                  {ability.score ?? '—'}
                </div>
                <div className="text-xs text-stone-400">
                  {ability.modifier === undefined ? '' : formatModifier(ability.modifier)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tags title="Languages" items={sheet.languages} />
      <Tags title="Spells" items={sheet.spells} />
      <Tags title="Characteristics" items={sheet.characteristics} />

      <RawJson payload={payload} open={false} />
    </div>
  )
}
