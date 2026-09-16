'use client'

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/Button'
import { CharacterSheet } from '@/components/CharacterSheet'
import {
  ABILITIES,
  NAME_STYLES,
  bestThreeOfFour,
  extractGuid,
  extractRoll,
  listCharacters,
  toOptions,
  type Option,
} from '@/lib/shape'

/* ------------------------------------------------------------------ *
 * Transport
 * ------------------------------------------------------------------ */

async function api(path: string, init?: { method?: string; body?: unknown }): Promise<unknown> {
  const res = await fetch(`/api/dnd/${path}`, {
    method: init?.method ?? 'GET',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && String((data as { error: unknown }).error)) ||
      `Request failed (${res.status})`
    throw new Error(message)
  }
  return data
}

/* ------------------------------------------------------------------ *
 * Shared bits
 * ------------------------------------------------------------------ */

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-stone-200">{title}</h2>
        {hint && <p className="text-sm text-stone-400">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Choices({
  options,
  selected,
  onSelect,
  multi = false,
}: {
  options: Option[]
  selected: (number | string)[]
  onSelect: (id: number | string) => void
  multi?: boolean
}) {
  if (!options.length) {
    return <p className="text-sm text-stone-400">Nothing came back for this step.</p>
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const active = selected.includes(option.id)
        return (
          <button
            key={String(option.id)}
            type="button"
            onClick={() => onSelect(option.id)}
            aria-pressed={active}
            className={`text-left rounded-xl border px-4 py-3 transition-colors cursor-pointer ${
              active
                ? 'border-amber-500 bg-amber-600/20'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <span className="block text-stone-200">{option.name}</span>
            {option.desc && (
              <span className="mt-1 block text-xs leading-relaxed text-stone-400 line-clamp-3">
                {option.desc}
              </span>
            )}
          </button>
        )
      })}
      {multi && <p className="sm:col-span-2 text-xs text-stone-500">Pick as many as your character allows.</p>}
    </div>
  )
}

/**
 * Fetches and normalises an option list once the step becomes reachable.
 *
 * The resolved path is stored alongside the data so `loading` can be derived
 * rather than set — writing it synchronously from the effect body would trigger
 * a cascading render.
 */
function useOptions(path: string | null) {
  const [result, setResult] = useState<{ path: string; options: Option[]; error: string } | null>(null)

  useEffect(() => {
    if (!path) return
    let cancelled = false
    api(path)
      .then((data) => {
        if (!cancelled) setResult({ path, options: toOptions(data), error: '' })
      })
      .catch((err: Error) => {
        if (!cancelled) setResult({ path, options: [], error: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [path])

  const ready = result !== null && result.path === path
  return {
    options: ready ? result.options : [],
    error: ready ? result.error : '',
    loading: path !== null && !ready,
  }
}

/* ------------------------------------------------------------------ *
 * Sign in
 * ------------------------------------------------------------------ */

function SignIn({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [upstream, setUpstream] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setUpstream(null)
    try {
      const res = await fetch('/api/dnd/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, name, email, password }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string; upstream?: unknown }
          | null
        // Keep the upstream body so a shape we did not anticipate is visible
        // rather than hidden behind a generic message.
        if (data?.upstream !== undefined) setUpstream(data.upstream)
        throw new Error(data?.error ?? `Could not sign in (${res.status})`)
      }
      onDone()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-sm">
      <p className="text-sm text-stone-400">
        Characters live on the D&amp;D Yonder service, so everyone needs an account there. Any email
        works — it is only used to log in.
      </p>
      {mode === 'register' && (
        <input
          type="text"
          placeholder="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="nickname"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-stone-500 outline-none focus:border-amber-500"
        />
      )}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-stone-500 outline-none focus:border-amber-500"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        required
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-stone-500 outline-none focus:border-amber-500"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      {upstream !== null && (
        <details className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <summary className="cursor-pointer text-xs text-stone-400">
            What the API actually sent back
          </summary>
          <pre className="mt-2 overflow-x-auto text-xs text-stone-300">
            {JSON.stringify(upstream, null, 2)}
          </pre>
        </details>
      )}
      <Button type="submit" variant="primary" className="w-full" disabled={busy}>
        {busy ? 'Working…' : mode === 'register' ? 'Create account' : 'Sign in'}
      </Button>
      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        className="w-full text-sm text-stone-400 hover:text-stone-300 cursor-pointer"
      >
        {mode === 'login' ? 'No account yet? Register' : 'Already registered? Sign in'}
      </button>
    </form>
  )
}

/* ------------------------------------------------------------------ *
 * Ability rolling
 * ------------------------------------------------------------------ */

type Roll = { guid: string; values: number[] }

function AbilityRoller({ guid, onSaved }: { guid: string; onSaved: () => void }) {
  const [rolls, setRolls] = useState<Roll[]>([])
  const [assignment, setAssignment] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const rollAll = async () => {
    setBusy(true)
    setError('')
    try {
      // One roll of 4d6 per ability; each call returns its own guid, which is
      // what the character update references.
      const results = await Promise.all(
        ABILITIES.map(() => api('game/dice', { method: 'POST', body: { dice: { d6: 4 } } })),
      )
      const parsed = results.map(extractRoll).filter(Boolean) as Roll[]
      if (parsed.length !== ABILITIES.length) {
        throw new Error('The dice endpoint returned an unexpected shape')
      }
      setRolls(parsed)
      setAssignment({})
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const assign = (abilityId: number, rollGuid: string) => {
    setAssignment((prev) => {
      const next = { ...prev }
      // A roll can only be spent once.
      for (const [key, value] of Object.entries(next)) {
        if (value === rollGuid) delete next[Number(key)]
      }
      if (rollGuid) next[abilityId] = rollGuid
      else delete next[abilityId]
      return next
    })
  }

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await api(`characters/${guid}`, {
        method: 'PATCH',
        body: {
          updateType: 'abilities',
          abilityRolls: ABILITIES.map((ability) => ({
            abilityId: ability.id,
            guid: assignment[ability.id],
          })),
        },
      })
      onSaved()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const complete = ABILITIES.every((ability) => assignment[ability.id])

  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" onClick={rollAll} disabled={busy}>
        {rolls.length ? 'Roll again' : 'Roll 4d6 six times'}
      </Button>

      {rolls.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {rolls.map((roll) => {
              const used = Object.values(assignment).includes(roll.guid)
              return (
                <div
                  key={roll.guid}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    used ? 'border-white/5 bg-white/5 text-stone-500' : 'border-white/10 bg-white/5 text-stone-200'
                  }`}
                >
                  <span className="font-semibold">{bestThreeOfFour(roll.values)}</span>{' '}
                  <span className="text-xs text-stone-400">({roll.values.join(', ')})</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-stone-500">
            Totals shown are the usual best three of four. The server keeps the raw roll and applies
            its own rule, so the saved score is whatever it decides.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {ABILITIES.map((ability) => (
              <label key={ability.id} className="flex items-center gap-3">
                <span className="w-28 text-sm text-stone-300">{ability.label}</span>
                <select
                  value={assignment[ability.id] ?? ''}
                  onChange={(e) => assign(ability.id, e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-stone-200 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Choose a roll…</option>
                  {rolls.map((roll) => (
                    <option key={roll.guid} value={roll.guid}>
                      {bestThreeOfFour(roll.values)} ({roll.values.join(', ')})
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <Button type="button" variant="primary" onClick={save} disabled={!complete || busy}>
            {busy ? 'Saving…' : 'Save abilities'}
          </Button>
        </>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * The wizard
 * ------------------------------------------------------------------ */

const STEPS = ['name', 'race', 'class', 'background', 'abilities', 'languages', 'spells', 'sheet'] as const
type Step = (typeof STEPS)[number]

export function CharacterCreator({ signedIn: initiallySignedIn }: { signedIn: boolean }) {
  const [signedIn, setSignedIn] = useState(initiallySignedIn)
  const [guid, setGuid] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('name')
  const [error, setError] = useState('')
  /** Raw payload behind the current error, when there is one worth showing. */
  const [errorDetail, setErrorDetail] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  // Step 1 — name
  const [charName, setCharName] = useState('')
  const [level, setLevel] = useState(1)
  const [nameStyle, setNameStyle] = useState<string>('generic')
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Selections
  const [raceId, setRaceId] = useState<number | string | null>(null)
  const [classId, setClassId] = useState<number | string | null>(null)
  const [pathId, setPathId] = useState<number | string | null>(null)
  const [backgroundId, setBackgroundId] = useState<number | string | null>(null)
  const [characteristics, setCharacteristics] = useState<(number | string)[]>([])
  const [languages, setLanguages] = useState<(number | string)[]>([])
  const [spells, setSpells] = useState<(number | string)[]>([])
  const [sheet, setSheet] = useState<unknown>(null)

  const races = useOptions(signedIn && step === 'race' ? 'characters/races' : null)
  const classes = useOptions(signedIn && step === 'class' ? 'characters/classes' : null)
  const backgrounds = useOptions(signedIn && step === 'background' ? 'characters/backgrounds' : null)
  const languageList = useOptions(signedIn && step === 'languages' ? 'game/languages' : null)
  const spellList = useOptions(signedIn && step === 'spells' && guid ? `characters/${guid}/spells/available` : null)

  const advance = useCallback(() => {
    setStep((current) => STEPS[Math.min(STEPS.indexOf(current) + 1, STEPS.length - 1)])
  }, [])

  // Steps are saved to the API one at a time, so going back is only about
  // re-showing a step: the character already exists and each PATCH is
  // independent, so re-saving a step simply overwrites that part.
  const clearError = useCallback(() => {
    setError('')
    setErrorDetail(null)
  }, [])

  const goBack = useCallback(() => {
    clearError()
    setStep((current) => STEPS[Math.max(STEPS.indexOf(current) - 1, 0)])
  }, [clearError])

  const patch = async (body: Record<string, unknown>) => {
    if (!guid) return
    setBusy(true)
    clearError()
    try {
      await api(`characters/${guid}`, { method: 'PATCH', body })
      advance()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const suggestNames = async () => {
    try {
      const data = await api(nameStyle === 'generic' ? 'names' : `names/${nameStyle}`)
      const names = (data as { names?: unknown } | null)?.names
      setSuggestions(Array.isArray(names) ? names.map(String) : [])
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const createCharacter = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    clearError()
    try {
      // The docs document no response body for the create call and say a guid
      // is "returned by the characters list endpoint", so note what exists
      // beforehand and look for what is new afterwards.
      const before = await api('characters')
        .then(listCharacters)
        .catch(() => [] as ReturnType<typeof listCharacters>)
      const knownGuids = new Set(before.map((entry) => entry.guid))

      const data = await api('characters/', { method: 'POST', body: { name: charName, level } })

      let created = extractGuid(data)

      if (!created) {
        const after = await api('characters')
          .then(listCharacters)
          .catch(() => [] as ReturnType<typeof listCharacters>)
        const fresh = after.filter((entry) => !knownGuids.has(entry.guid))

        created =
          // A new entry with the name we just used is the safest match.
          fresh.find((entry) => entry.name === charName)?.guid ??
          (fresh.length === 1 ? fresh[0].guid : null) ??
          // Nothing new showed up: fall back to the last one carrying the name.
          after.filter((entry) => entry.name === charName).pop()?.guid ??
          null

        if (!created) {
          setErrorDetail({ createResponse: data, charactersList: after })
          throw new Error(
            'The character was created, but it could not be found in the characters list afterwards, so there is no guid to continue with. Both responses are below.',
          )
        }
      }

      setGuid(created)
      advance()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (step !== 'sheet' || !guid) return
    api(`characters/${guid}`).then(setSheet).catch((err: Error) => setError(err.message))
  }, [step, guid])

  if (!signedIn) {
    return (
      <Panel title="Sign in">
        <SignIn onDone={() => setSignedIn(true)} />
      </Panel>
    )
  }

  const selectedClass = classes.options.find((option) => option.id === classId)
  const selectedBackground = backgrounds.options.find((option) => option.id === backgroundId)

  return (
    <div className="space-y-8">
      <ol className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((name, index) => (
          <li
            key={name}
            className={`rounded-full px-3 py-1 capitalize ${
              name === step
                ? 'bg-amber-600 text-stone-950'
                : index < STEPS.indexOf(step)
                  ? 'bg-white/10 text-stone-300'
                  : 'bg-white/5 text-stone-500'
            }`}
          >
            {name}
          </li>
        ))}
      </ol>

      {error && (
        <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-300">{error}</p>
          {errorDetail !== null && (
            <details>
              <summary className="cursor-pointer text-xs text-red-300/80">
                What the API actually sent back
              </summary>
              <pre className="mt-2 overflow-x-auto text-xs text-stone-300">
                {JSON.stringify(errorDetail, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {step !== 'name' && step !== 'sheet' && (
        <button
          type="button"
          onClick={goBack}
          className="text-sm text-stone-400 hover:text-stone-300 cursor-pointer"
        >
          ← Back
        </button>
      )}

      {step === 'name' && (
        <Panel title="Name your character" hint="This is set when the character is created and cannot be changed later.">
          <form onSubmit={createCharacter} className="space-y-3 max-w-sm">
            <input
              type="text"
              placeholder="Some heroic name"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-stone-500 outline-none focus:border-amber-500"
            />
            {/* This only flavours the generated suggestions — picking "Elvish"
                here does not make the character an elf. Race is the next step,
                and the bare list of race names read as a race picker. */}
            <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <p className="text-xs text-stone-400">
                Stuck for a name? Generate a few. This only affects the suggestions — you pick your
                race on the next step.
              </p>
              <div className="flex gap-2">
                <select
                  value={nameStyle}
                  aria-label="Name style for suggestions"
                  onChange={(e) => setNameStyle(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-stone-200 outline-none focus:border-amber-500 cursor-pointer"
                >
                  {NAME_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style === 'generic'
                        ? 'Any style'
                        : `${style.charAt(0).toUpperCase()}${style.slice(1)}-sounding names`}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="ghost" onClick={suggestNames}>
                  Suggest
                </Button>
              </div>
            </div>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setCharName(suggestion)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-stone-300 hover:bg-white/10 cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <label className="flex items-center gap-3 text-sm text-stone-300">
              Level
              <input
                type="number"
                min={1}
                max={20}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
              />
            </label>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create character'}
            </Button>
          </form>
        </Panel>
      )}

      {step === 'race' && (
        <Panel title="Choose a race">
          {races.loading && <p className="text-sm text-stone-400">Loading…</p>}
          {races.error && <p className="text-sm text-red-400">{races.error}</p>}
          <Choices options={races.options} selected={raceId === null ? [] : [raceId]} onSelect={setRaceId} />
          <Button
            variant="primary"
            disabled={raceId === null || busy}
            onClick={() => patch({ updateType: 'race', charRaceId: raceId })}
          >
            Save race
          </Button>
        </Panel>
      )}

      {step === 'class' && (
        <Panel title="Choose a class">
          {classes.loading && <p className="text-sm text-stone-400">Loading…</p>}
          {classes.error && <p className="text-sm text-red-400">{classes.error}</p>}
          <Choices
            options={classes.options}
            selected={classId === null ? [] : [classId]}
            onSelect={(id) => {
              setClassId(id)
              setPathId(null)
            }}
          />
          {selectedClass?.children && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-stone-300">Class path</h3>
              <Choices
                options={selectedClass.children}
                selected={pathId === null ? [] : [pathId]}
                onSelect={setPathId}
              />
            </div>
          )}
          <Button
            variant="primary"
            disabled={classId === null || busy}
            onClick={() =>
              patch({
                updateType: 'class',
                charClassId: classId,
                ...(pathId !== null ? { classPathId: [pathId] } : {}),
              })
            }
          >
            Save class
          </Button>
        </Panel>
      )}

      {step === 'background' && (
        <Panel title="Choose a background">
          {backgrounds.loading && <p className="text-sm text-stone-400">Loading…</p>}
          {backgrounds.error && <p className="text-sm text-red-400">{backgrounds.error}</p>}
          <Choices
            options={backgrounds.options}
            selected={backgroundId === null ? [] : [backgroundId]}
            onSelect={(id) => {
              setBackgroundId(id)
              setCharacteristics([])
            }}
          />
          {selectedBackground?.children && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-stone-300">Characteristics</h3>
              <Choices
                options={selectedBackground.children}
                selected={characteristics}
                multi
                onSelect={(id) =>
                  setCharacteristics((prev) =>
                    prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
                  )
                }
              />
            </div>
          )}
          <Button
            variant="primary"
            disabled={backgroundId === null || busy}
            onClick={() =>
              patch({
                updateType: 'background',
                charBackgroundId: backgroundId,
                characteristics,
              })
            }
          >
            Save background
          </Button>
        </Panel>
      )}

      {step === 'abilities' && guid && (
        <Panel title="Roll abilities" hint="Roll six sets, then decide which score goes where.">
          <AbilityRoller guid={guid} onSaved={advance} />
        </Panel>
      )}

      {step === 'languages' && (
        <Panel title="Choose languages">
          {languageList.loading && <p className="text-sm text-stone-400">Loading…</p>}
          {languageList.error && <p className="text-sm text-red-400">{languageList.error}</p>}
          <Choices
            options={languageList.options}
            selected={languages}
            multi
            onSelect={(id) =>
              setLanguages((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]))
            }
          />
          <div className="flex gap-2">
            <Button variant="primary" disabled={busy} onClick={() => patch({ updateType: 'languages', languages })}>
              Save languages
            </Button>
            <Button variant="ghost" onClick={advance}>
              Skip
            </Button>
          </div>
        </Panel>
      )}

      {step === 'spells' && (
        <Panel title="Choose spells" hint="Only what this character can actually cast is listed.">
          {spellList.loading && <p className="text-sm text-stone-400">Loading…</p>}
          {spellList.error && <p className="text-sm text-red-400">{spellList.error}</p>}
          <Choices
            options={spellList.options}
            selected={spells}
            multi
            onSelect={(id) =>
              setSpells((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]))
            }
          />
          <div className="flex gap-2">
            <Button variant="primary" disabled={busy} onClick={() => patch({ updateType: 'spells', spells })}>
              Save spells
            </Button>
            <Button variant="ghost" onClick={advance}>
              Skip
            </Button>
          </div>
        </Panel>
      )}

      {step === 'sheet' && (
        <Panel title="Your character" hint="Saved to D&amp;D Yonder — it will still be there next time you log in.">
          {sheet ? (
            <CharacterSheet payload={sheet} fallbackName={charName} />
          ) : (
            <p className="text-sm text-stone-400">Loading…</p>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              setGuid(null)
              setCharName('')
              setSheet(null)
              setSuggestions([])
              setRaceId(null)
              setClassId(null)
              setPathId(null)
              setBackgroundId(null)
              setCharacteristics([])
              setLanguages([])
              setSpells([])
              clearError()
              setStep('name')
            }}
          >
            Make another
          </Button>
        </Panel>
      )}
    </div>
  )
}
