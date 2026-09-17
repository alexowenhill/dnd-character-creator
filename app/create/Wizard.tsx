'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { QUESTIONS, scoreQuiz } from '@/lib/quiz'
import {
  ABILITY_ORDER,
  ABILITY_NAMES,
  ALIGNMENTS,
  BACKGROUNDS,
  CLASSES,
  RACES,
  SKILLS,
  classById,
  raceById,
  type AbilityKey,
  type SkillKey,
} from '@/lib/srd'
import { computeSheet, suggestAssignment, type StoredCharacter } from '@/lib/character'
import {
  ARMOURS,
  MAX_WEAPONS,
  STARTER_KITS,
  WEAPONS,
  type StoredEquipment,
} from '@/lib/equipment'

type Roll = { dice: number[]; total: number; guid?: string }
type SpellInfo = { name: string; desc?: string }

/**
 * A distinct tint per quiz question, purely so scrolling through seven of them
 * in a row reads as seven separate questions rather than one long list.
 * Selecting an answer still turns amber everywhere in the app — that
 * convention stays put; only the question's own card is tinted.
 */
const QUESTION_THEMES = [
  { border: 'border-rose-500/25', bg: 'bg-rose-500/[0.04]', badge: 'bg-rose-500/20 text-rose-300' },
  { border: 'border-amber-500/25', bg: 'bg-amber-500/[0.04]', badge: 'bg-amber-500/20 text-amber-300' },
  { border: 'border-lime-500/25', bg: 'bg-lime-500/[0.04]', badge: 'bg-lime-500/20 text-lime-300' },
  { border: 'border-teal-500/25', bg: 'bg-teal-500/[0.04]', badge: 'bg-teal-500/20 text-teal-300' },
  { border: 'border-sky-500/25', bg: 'bg-sky-500/[0.04]', badge: 'bg-sky-500/20 text-sky-300' },
  { border: 'border-violet-500/25', bg: 'bg-violet-500/[0.04]', badge: 'bg-violet-500/20 text-violet-300' },
  { border: 'border-fuchsia-500/25', bg: 'bg-fuchsia-500/[0.04]', badge: 'bg-fuchsia-500/20 text-fuchsia-300' },
]

const STEPS = [
  'player', 'quiz', 'race', 'class', 'background', 'alignment', 'abilities', 'skills', 'equipment', 'spells', 'name',
] as const
type Step = (typeof STEPS)[number]

const STEP_LABELS: Record<Step, string> = {
  player: 'Player',
  quiz: 'Questions',
  race: 'Race',
  class: 'Class',
  background: 'Background',
  alignment: 'Outlook',
  abilities: 'Abilities',
  skills: 'Skills',
  equipment: 'Equipment',
  spells: 'Spells',
  name: 'Name',
}

/* ------------------------------------------------------------------ *
 * Shared pieces
 * ------------------------------------------------------------------ */

function Card({
  title,
  blurb,
  selected,
  suggested,
  onClick,
  children,
}: {
  title: string
  blurb?: string
  selected: boolean
  suggested?: boolean
  onClick: () => void
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors cursor-pointer ${
        selected
          ? 'border-amber-500 bg-amber-600/20'
          : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-stone-100">{title}</span>
        {suggested && !selected && (
          <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
            suggested
          </span>
        )}
      </div>
      {blurb && <p className="mt-1 text-xs leading-relaxed text-stone-400">{blurb}</p>}
      {children}
    </button>
  )
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-stone-100">{title}</h2>
        {hint && <p className="mt-1 text-sm text-stone-400">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * Wizard
 * ------------------------------------------------------------------ */

/** Rebuilds the abilities step's roll cards from a stored character, so
 *  editing shows the scores it already has instead of demanding a re-roll. */
function initialRolls(character: StoredCharacter): Roll[] {
  return ABILITY_ORDER.map((key) => ({
    dice: character.rolls?.[key] ?? [],
    total: character.baseAbilities[key] ?? 10,
  }))
}

export function Wizard({
  defaultLevel,
  campaigns,
  initial,
  mode = 'create',
}: {
  defaultLevel: number
  campaigns: { id: string; name: string }[]
  /** An existing character, when editing it in place or resetting it. */
  initial?: StoredCharacter | null
  /** 'edit' hydrates every step from `initial` and starts at the last one.
   *  'reset' starts blank like 'create', but saves over the same character. */
  mode?: 'create' | 'edit' | 'reset'
}) {
  const router = useRouter()
  const editing = mode === 'edit' && Boolean(initial)
  const editingId = mode !== 'create' ? initial?.id : undefined

  const [step, setStep] = useState<Step>(editing ? 'name' : 'player')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [raceId, setRaceId] = useState(editing ? (initial?.raceId ?? '') : '')
  const [subraceId, setSubraceId] = useState(editing ? (initial?.subraceId ?? '') : '')
  const [classId, setClassId] = useState(editing ? (initial?.classId ?? '') : '')
  const [subclassId, setSubclassId] = useState(editing ? (initial?.subclassId ?? '') : '')
  const [backgroundId, setBackgroundId] = useState(editing ? (initial?.backgroundId ?? '') : '')
  const [alignmentId, setAlignmentId] = useState(editing ? (initial?.alignmentId ?? '') : '')
  const [level] = useState(editing ? (initial?.level ?? defaultLevel) : defaultLevel)

  const [rolls, setRolls] = useState<Roll[]>(editing && initial ? initialRolls(initial) : [])
  const [rollSource, setRollSource] = useState<'yonder' | 'local' | null>(null)
  const [rollSourceReason, setRollSourceReason] = useState('')
  /** ability -> index into rolls */
  const [assignment, setAssignment] = useState<Partial<Record<AbilityKey, number>>>(() => {
    if (!editing) return {}
    const map: Partial<Record<AbilityKey, number>> = {}
    ABILITY_ORDER.forEach((key, index) => {
      map[key] = index
    })
    return map
  })
  const [improvements, setImprovements] = useState<Partial<Record<AbilityKey, number>>>(
    editing ? (initial?.improvements ?? {}) : {},
  )

  const [skillChoices, setSkillChoices] = useState<SkillKey[]>(editing ? (initial?.skillChoices ?? []) : [])
  const [equipment, setEquipment] = useState<StoredEquipment>(editing ? (initial?.equipment ?? {}) : {})
  const [cantrips, setCantrips] = useState<string[]>(editing ? (initial?.cantrips ?? []) : [])
  const [spells, setSpells] = useState<string[]>(editing ? (initial?.spells ?? []) : [])
  const [spellOptions, setSpellOptions] = useState<{ cantrips: SpellInfo[]; leveled: SpellInfo[] } | null>(null)
  const [viewingSpell, setViewingSpell] = useState<SpellInfo | null>(null)
  /** name -> description, for every spell seen this session, so it can be
   *  saved onto the character and read again on its sheet later. */
  const [spellDescMap, setSpellDescMap] = useState<Record<string, string>>(
    editing ? (initial?.spellDescriptions ?? {}) : {},
  )

  const [name, setName] = useState(editing ? (initial?.name ?? '') : '')
  const [playerName, setPlayerName] = useState(editing ? (initial?.playerName ?? '') : '')
  const [campaignId, setCampaignId] = useState(
    editing ? (initial?.campaignId ?? '') : (campaigns[0]?.id ?? ''),
  )
  const [suggestions, setSuggestions] = useState<string[]>([])

  const result = useMemo(() => scoreQuiz(quizAnswers), [quizAnswers])
  const race = raceById(raceId)
  const charClass = classById(classId)
  const isCaster = charClass ? charClass.caster !== 'none' : false

  const stepList = useMemo(
    () => STEPS.filter((entry) => (entry !== 'spells' || isCaster) && (entry !== 'quiz' || !editing)),
    [isCaster, editing],
  )

  const go = useCallback(
    (direction: 1 | -1) => {
      setError('')
      setStep((current) => {
        const index = stepList.indexOf(current)
        return stepList[Math.min(Math.max(index + direction, 0), stepList.length - 1)]
      })
    },
    [stepList],
  )

  const quizComplete = QUESTIONS.every((question) => quizAnswers[question.id])

  /* -- Abilities ------------------------------------------------- */

  const rollStats = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/roll', { method: 'POST' })
      if (!res.ok) throw new Error('Could not roll — try again.')
      const data = (await res.json()) as {
        rolls: Roll[]
        source: 'yonder' | 'local'
        reason?: string
      }
      setRolls(data.rolls)
      setRollSource(data.source)
      setRollSourceReason(data.reason ?? '')

      // Offer a sensible arrangement straight away.
      const suggested = suggestAssignment(data.rolls.map((roll) => roll.total), classId)
      const used = new Set<number>()
      const next: Partial<Record<AbilityKey, number>> = {}
      for (const key of ABILITY_ORDER) {
        const wanted = suggested[key]
        const index = data.rolls.findIndex((roll, i) => roll.total === wanted && !used.has(i))
        if (index >= 0) {
          used.add(index)
          next[key] = index
        }
      }
      setAssignment(next)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  /** Assign a roll to an ability, swapping with whoever had it. */
  const assign = (ability: AbilityKey, rollIndex: number | null) => {
    setAssignment((prev) => {
      const next = { ...prev }
      if (rollIndex === null) {
        delete next[ability]
        return next
      }
      const previousOwner = ABILITY_ORDER.find((key) => next[key] === rollIndex && key !== ability)
      const displaced = next[ability]
      next[ability] = rollIndex
      if (previousOwner) {
        if (displaced === undefined) delete next[previousOwner]
        else next[previousOwner] = displaced
      }
      return next
    })
  }

  const baseAbilities = useMemo(() => {
    const scores = {} as Record<AbilityKey, number>
    for (const key of ABILITY_ORDER) {
      const index = assignment[key]
      scores[key] = index === undefined ? 10 : (rolls[index]?.total ?? 10)
    }
    return scores
  }, [assignment, rolls])

  const abilitiesAssigned = ABILITY_ORDER.every((key) => assignment[key] !== undefined)
  const improvementSpent = ABILITY_ORDER.reduce((sum, key) => sum + (improvements[key] ?? 0), 0)
  const improvementBudget = level >= 4 ? 2 : 0

  /* -- Spells ---------------------------------------------------- */

  useEffect(() => {
    if (step !== 'spells' || !charClass || !isCaster) return
    let cancelled = false
    const load = async () => {
      const fetchLevel = async (spellLevel: number): Promise<SpellInfo[]> => {
        const res = await fetch(`/api/spells?classId=${charClass.id}&level=${spellLevel}`)
        if (!res.ok) return []
        const data = (await res.json()) as { spells: { name: string; desc?: string }[] }
        return data.spells.map((spell) => ({ name: spell.name, desc: spell.desc }))
      }
      const [zero, one] = await Promise.all([fetchLevel(0), fetchLevel(1)])
      if (cancelled) return
      setSpellOptions({ cantrips: zero, leveled: one })
      setSpellDescMap((prev) => {
        const next = { ...prev }
        for (const spell of [...zero, ...one]) if (spell.desc) next[spell.name] = spell.desc
        return next
      })
    }
    load().catch(() => {
      if (!cancelled) setSpellOptions({ cantrips: [], leveled: [] })
    })
    return () => {
      cancelled = true
    }
  }, [step, charClass, isCaster])

  /* -- Names ----------------------------------------------------- */

  const suggestNames = async () => {
    try {
      const style = race?.nameStyle ?? ''
      const res = await fetch(`/api/names?style=${encodeURIComponent(style)}`)
      const data = (await res.json()) as { names: string[]; reason?: string }
      setSuggestions(data.names ?? [])
      if (!data.names?.length) {
        // The reason distinguishes "nobody set up the account" from "the
        // password is wrong" from "the API itself is down" — worth showing
        // rather than a single generic message for all three.
        setError(
          data.reason
            ? `Name generator unavailable (${data.reason}) — type one in instead.`
            : 'The name generator is not available right now — type one in.',
        )
      }
    } catch {
      setError('The name generator is not available right now — type one in.')
    }
  }

  /* -- Preview and save ------------------------------------------ */

  const draft: StoredCharacter = useMemo(
    () => ({
      id: 'preview',
      name: name || 'Unnamed',
      playerName,
      campaignId: campaignId || undefined,
      level,
      raceId,
      subraceId: subraceId || undefined,
      classId,
      subclassId,
      backgroundId,
      alignmentId: alignmentId || 'n',
      baseAbilities,
      rolls: Object.fromEntries(
        ABILITY_ORDER.map((key) => {
          const index = assignment[key]
          return [key, index === undefined ? [] : (rolls[index]?.dice ?? [])]
        }),
      ) as Record<AbilityKey, number[]>,
      improvements,
      skillChoices,
      equipment,
      cantrips,
      spells,
      spellDescriptions: Object.fromEntries(
        [...cantrips, ...spells]
          .filter((spellName) => spellDescMap[spellName])
          .map((spellName) => [spellName, spellDescMap[spellName]]),
      ),
      createdAt: new Date().toISOString(),
    }),
    [name, playerName, campaignId, level, raceId, subraceId, classId, subclassId, backgroundId, alignmentId,
      baseAbilities, assignment, rolls, improvements, skillChoices, equipment, cantrips, spells, spellDescMap],
  )

  /** How many cantrips and spells this class actually knows at this level — the
   *  same numbers the sheet shows, used to stop selection there instead of at
   *  the whole spell list. */
  const spellLimits = useMemo(() => computeSheet(draft).spellcasting, [draft])

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(editingId ? `/api/characters/${editingId}` : '/api/characters', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, id: undefined }),
      })
      const data = (await res.json()) as { id?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Could not save the character.')
      router.push(`/character/${data.id ?? editingId}`)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  /* -- Gating ---------------------------------------------------- */

  const canContinue = (): boolean => {
    switch (step) {
      case 'player': return playerName.trim().length > 0
      case 'quiz': return quizComplete
      case 'race': return Boolean(raceId) && (!race?.subraces?.length || Boolean(subraceId))
      case 'class': return Boolean(classId) && Boolean(subclassId)
      case 'background': return Boolean(backgroundId)
      case 'alignment': return Boolean(alignmentId)
      case 'abilities': return abilitiesAssigned && improvementSpent === improvementBudget
      case 'skills': return skillChoices.length === (charClass?.skillChoices ?? 0)
      case 'equipment': return true
      case 'spells': return true
      case 'name': return name.trim().length > 0
      default: return true
    }
  }

  const suggestedIds = (entries: { id: string; score: number }[], take = 2) =>
    new Set(entries.slice(0, take).filter((entry) => entry.score > 0).map((entry) => entry.id))

  const topRaces = suggestedIds(result.races, 3)
  const topClasses = suggestedIds(result.classes, 2)
  const topBackgrounds = suggestedIds(result.backgrounds, 2)
  const topAlignments = suggestedIds(result.alignments, 2)

  return (
    <div className="space-y-8">
      {mode !== 'create' && (
        <p className="rounded-xl border border-sky-500/25 bg-sky-500/[0.06] px-4 py-2 text-sm text-sky-300">
          {mode === 'edit'
            ? `Editing ${initial?.name ?? 'this character'} — changes save over the existing character.`
            : `Starting ${initial?.name ?? 'this character'} over from the beginning. Nothing is overwritten until you save.`}
        </p>
      )}

      {/* Progress */}
      <ol className="flex flex-wrap gap-1.5 text-[11px]">
        {stepList.map((entry, index) => (
          <li
            key={entry}
            className={`rounded-full px-2.5 py-1 ${
              entry === step
                ? 'bg-amber-600 text-stone-950'
                : index < stepList.indexOf(step)
                  ? 'bg-white/10 text-stone-300'
                  : 'bg-white/5 text-stone-600'
            }`}
          >
            {STEP_LABELS[entry]}
          </li>
        ))}
      </ol>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {step === 'player' && (
        <Panel
          title="Who's playing?"
          hint="So the party page — and everyone else at the table — knows whose character this is."
        >
          <div className="max-w-sm space-y-2">
            <label className="block text-sm text-stone-300" htmlFor="player-name">
              Your name
            </label>
            <input
              id="player-name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Required"
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-stone-600 outline-none focus:border-amber-500"
            />
          </div>
        </Panel>
      )}

      {step === 'quiz' && (
        <Panel
          title="Before we set sail — seven questions"
          hint="There are no wrong answers — they just point at a character that will suit you on this voyage. You can override everything afterwards."
        >
          <div className="space-y-4">
            {QUESTIONS.map((question, index) => {
              const theme = QUESTION_THEMES[index % QUESTION_THEMES.length]
              return (
                <div
                  key={question.id}
                  className={`space-y-3 rounded-2xl border ${theme.border} ${theme.bg} p-4`}
                >
                  <p className="flex items-start gap-3 text-sm font-medium text-stone-200">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${theme.badge}`}
                    >
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{question.prompt}</span>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.answers.map((answer) => (
                      <Card
                        key={answer.id}
                        title={answer.label}
                        blurb={answer.detail}
                        selected={quizAnswers[question.id] === answer.id}
                        onClick={() =>
                          setQuizAnswers((prev) => ({ ...prev, [question.id]: answer.id }))
                        }
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      {step === 'race' && (
        <Panel title="Choose a race" hint="Suggestions are based on your answers. Pick whatever you like.">
          <div className="grid gap-2 sm:grid-cols-2">
            {RACES.map((entry) => (
              <Card
                key={entry.id}
                title={entry.name}
                blurb={entry.blurb}
                selected={raceId === entry.id}
                suggested={topRaces.has(entry.id)}
                onClick={() => {
                  setRaceId(entry.id)
                  setSubraceId('')
                }}
              />
            ))}
          </div>
          {race?.subraces?.length ? (
            <div className="space-y-2 border-t border-white/10 pt-4">
              <h3 className="text-sm font-medium text-stone-300">{race.name} lineage</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {race.subraces.map((entry) => (
                  <Card
                    key={entry.id}
                    title={entry.name}
                    blurb={entry.blurb}
                    selected={subraceId === entry.id}
                    onClick={() => setSubraceId(entry.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </Panel>
      )}

      {step === 'class' && (
        <Panel title="Choose a class" hint={result.reasons.length ? `Your answers pointed here: ${result.reasons.join('; ')}.` : undefined}>
          <div className="grid gap-2 sm:grid-cols-2">
            {CLASSES.map((entry) => (
              <Card
                key={entry.id}
                title={entry.name}
                blurb={entry.blurb}
                selected={classId === entry.id}
                suggested={topClasses.has(entry.id)}
                onClick={() => {
                  setClassId(entry.id)
                  setSubclassId(entry.subclasses[0]?.id ?? '')
                  setSkillChoices([])
                  // A different class means a different spell list — last
                  // class's picks would not even be on it.
                  setCantrips([])
                  setSpells([])
                  // Start them off with the class's usual kit; the equipment
                  // step lets them change any of it.
                  const kit = STARTER_KITS[entry.id]
                  setEquipment(kit ? { ...kit } : {})
                }}
              />
            ))}
          </div>
          {charClass && (
            <div className="space-y-2 border-t border-white/10 pt-4">
              <h3 className="text-sm font-medium text-stone-300">{charClass.subclassLabel}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {charClass.subclasses.map((entry) => (
                  <Card
                    key={entry.id}
                    title={entry.name}
                    blurb={entry.blurb}
                    selected={subclassId === entry.id}
                    onClick={() => setSubclassId(entry.id)}
                  />
                ))}
              </div>
              <p className="text-xs text-stone-500">
                These are the SRD options. If your DM allows others, pick the closest and note the
                real one at the end.
              </p>
            </div>
          )}
        </Panel>
      )}

      {step === 'background' && (
        <Panel title="Where did you come from?" hint="Your background grants two skill proficiencies.">
          <div className="grid gap-2 sm:grid-cols-2">
            {BACKGROUNDS.map((entry) => (
              <Card
                key={entry.id}
                title={entry.name}
                blurb={entry.blurb}
                selected={backgroundId === entry.id}
                suggested={topBackgrounds.has(entry.id)}
                onClick={() => setBackgroundId(entry.id)}
              >
                <p className="mt-1.5 text-[11px] text-stone-500">
                  {entry.skills.map((skill) => SKILLS[skill].name).join(' · ')}
                </p>
              </Card>
            ))}
          </div>
        </Panel>
      )}

      {step === 'alignment' && (
        <Panel title="How do you see the world?">
          <div className="grid gap-2 sm:grid-cols-3">
            {ALIGNMENTS.map((entry) => (
              <Card
                key={entry.id}
                title={entry.name}
                blurb={entry.blurb}
                selected={alignmentId === entry.id}
                suggested={topAlignments.has(entry.id)}
                onClick={() => setAlignmentId(entry.id)}
              />
            ))}
          </div>
        </Panel>
      )}

      {step === 'abilities' && (
        <Panel
          title="Roll your abilities"
          hint="Six rolls of four six-sided dice, dropping the lowest each time. Rolled on the server, so no quietly trying again."
        >
          {rolls.length === 0 ? (
            <Button variant="primary" onClick={rollStats} disabled={busy}>
              {busy ? 'Rolling…' : 'Roll the dice'}
            </Button>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                {rolls.map((roll, index) => {
                  const owner = ABILITY_ORDER.find((key) => assignment[key] === index)
                  return (
                    <span
                      key={index}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        owner ? 'border-white/5 bg-white/5 text-stone-500' : 'border-amber-500/40 bg-amber-500/10 text-stone-200'
                      }`}
                    >
                      <span className="font-semibold">{roll.total}</span>{' '}
                      <span className="text-xs text-stone-500">({roll.dice.join(', ')})</span>
                    </span>
                  )
                })}
                {rollSource ? (
                  <span className="text-xs text-stone-500" title={rollSourceReason || undefined}>
                    {rollSource === 'yonder'
                      ? 'rolled by the D&D Yonder dice API'
                      : `rolled locally${rollSourceReason ? ` (Yonder: ${rollSourceReason})` : ''}`}
                  </span>
                ) : (
                  <span className="text-xs text-stone-500">kept from the existing character</span>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {ABILITY_ORDER.map((key) => {
                  const index = assignment[key]
                  const roll = index === undefined ? null : rolls[index]
                  const racial =
                    (raceById(raceId)?.bonuses[key] ?? 0) +
                    (race?.subraces?.find((entry) => entry.id === subraceId)?.bonuses[key] ?? 0)
                  const improvement = improvements[key] ?? 0
                  const total = (roll?.total ?? 10) + racial + improvement
                  return (
                    <div key={key} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <span className="w-24 text-sm text-stone-300">{ABILITY_NAMES[key]}</span>
                      <select
                        aria-label={`Roll for ${ABILITY_NAMES[key]}`}
                        value={index ?? ''}
                        onChange={(e) => assign(key, e.target.value === '' ? null : Number(e.target.value))}
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-stone-200 outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="">—</option>
                        {rolls.map((entry, i) => (
                          <option key={i} value={i}>
                            {entry.total} ({entry.dice.join(', ')})
                          </option>
                        ))}
                      </select>
                      <span className="w-20 text-right text-xs text-stone-500">
                        {racial ? `+${racial} race ` : ''}
                        {improvement ? `+${improvement} ` : ''}
                        <span className="font-semibold text-stone-200">= {Math.min(20, total)}</span>
                      </span>
                    </div>
                  )
                })}
              </div>

              {improvementBudget > 0 && (
                <div className="space-y-2 border-t border-white/10 pt-4">
                  <h3 className="text-sm font-medium text-stone-300">
                    Level 4 improvement — {improvementBudget - improvementSpent} point
                    {improvementBudget - improvementSpent === 1 ? '' : 's'} left
                  </h3>
                  <p className="text-xs text-stone-500">Add 2 to one ability, or 1 to two of them.</p>
                  <div className="flex flex-wrap gap-2">
                    {ABILITY_ORDER.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setImprovements((prev) => {
                            const current = prev[key] ?? 0
                            const spentElsewhere =
                              ABILITY_ORDER.reduce((sum, k) => sum + (prev[k] ?? 0), 0) - current
                            // Cycle 0 → 1 → 2 → 0, skipping anything over budget.
                            let next = current + 1
                            if (next > 2 || spentElsewhere + next > improvementBudget) next = 0
                            return { ...prev, [key]: next }
                          })
                        }
                        className={`rounded-lg border px-3 py-1.5 text-sm cursor-pointer ${
                          improvements[key]
                            ? 'border-amber-500 bg-amber-600/20 text-stone-100'
                            : 'border-white/10 bg-white/5 text-stone-400 hover:bg-white/10'
                        }`}
                      >
                        {key.toUpperCase()} {improvements[key] ? `+${improvements[key]}` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="ghost" size="sm" onClick={rollStats} disabled={busy}>
                Roll again (replaces these)
              </Button>
            </div>
          )}
        </Panel>
      )}

      {step === 'skills' && charClass && (
        <Panel
          title="Pick your skills"
          hint={`A ${charClass.name} chooses ${charClass.skillChoices}. Your background already gave you two.`}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {charClass.skillList.map((skill) => {
              const selected = skillChoices.includes(skill)
              const full = skillChoices.length >= charClass.skillChoices && !selected
              return (
                <button
                  key={skill}
                  type="button"
                  disabled={full}
                  onClick={() =>
                    setSkillChoices((prev) =>
                      prev.includes(skill) ? prev.filter((entry) => entry !== skill) : [...prev, skill],
                    )
                  }
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? 'border-amber-500 bg-amber-600/20 text-stone-100 cursor-pointer'
                      : full
                        ? 'border-white/5 bg-white/[0.02] text-stone-600 cursor-not-allowed'
                        : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 cursor-pointer'
                  }`}
                >
                  {SKILLS[skill].name}
                  <span className="ml-1.5 text-xs text-stone-500">
                    {SKILLS[skill].ability.toUpperCase()}
                  </span>
                </button>
              )
            })}
          </div>
        </Panel>
      )}

      {step === 'equipment' && charClass && (
        <Panel
          title="Gear up"
          hint={`Started you off with what a ${charClass.name} usually carries. Change anything — your armour class updates as you do.`}
        >
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm text-stone-300">
                Armour class{' '}
                <span className="text-lg font-semibold text-stone-100">
                  {computeSheet(draft).armourClass}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-stone-500">{computeSheet(draft).armourNote}</p>
              {computeSheet(draft).armourWarning && (
                <p className="mt-1 text-xs text-amber-300">{computeSheet(draft).armourWarning}</p>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-stone-300">Armour</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setEquipment((prev) => ({ ...prev, armourId: undefined }))}
                  className={`rounded-xl border px-3 py-2 text-left text-sm cursor-pointer ${
                    !equipment.armourId
                      ? 'border-amber-500 bg-amber-600/20 text-stone-100'
                      : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                  }`}
                >
                  No armour
                  <span className="ml-2 text-xs text-stone-500">10 + DEX</span>
                </button>
                {ARMOURS.map((armour) => (
                  <button
                    key={armour.id}
                    type="button"
                    onClick={() => setEquipment((prev) => ({ ...prev, armourId: armour.id }))}
                    className={`rounded-xl border px-3 py-2 text-left text-sm cursor-pointer ${
                      equipment.armourId === armour.id
                        ? 'border-amber-500 bg-amber-600/20 text-stone-100'
                        : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10'
                    }`}
                  >
                    {armour.name}
                    <span className="ml-2 text-xs text-stone-500">
                      AC {armour.baseAc}
                      {armour.category === 'light' ? ' + DEX' : armour.category === 'medium' ? ' + DEX (max 2)' : ''}
                      {' · '}{armour.cost}
                    </span>
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 pt-1 text-sm text-stone-300">
                <input
                  type="checkbox"
                  checked={equipment.shield === true}
                  onChange={(e) => setEquipment((prev) => ({ ...prev, shield: e.target.checked }))}
                  className="h-4 w-4 accent-amber-600"
                />
                Carrying a shield (+2)
              </label>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-stone-300">
                Weapons
                <span className="ml-2 text-xs text-stone-500">
                  {equipment.weaponIds?.length ?? 0} of {MAX_WEAPONS} carried
                </span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {WEAPONS.map((weapon) => {
                  const chosen = equipment.weaponIds?.includes(weapon.id) ?? false
                  const full = (equipment.weaponIds?.length ?? 0) >= MAX_WEAPONS && !chosen
                  return (
                    <button
                      key={weapon.id}
                      type="button"
                      disabled={full}
                      onClick={() =>
                        setEquipment((prev) => {
                          const current = prev.weaponIds ?? []
                          return {
                            ...prev,
                            weaponIds: current.includes(weapon.id)
                              ? current.filter((id) => id !== weapon.id)
                              : [...current, weapon.id],
                          }
                        })
                      }
                      title={`${weapon.damage} ${weapon.damageType}`}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        chosen
                          ? 'border-amber-500 bg-amber-600/20 text-stone-100 cursor-pointer'
                          : full
                            ? 'border-white/5 bg-white/[0.02] text-stone-600 cursor-not-allowed'
                            : 'border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 cursor-pointer'
                      }`}
                    >
                      {weapon.name}
                      <span className="ml-1.5 text-stone-500">{weapon.damage}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {equipment.extras?.length ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-stone-300">Also carrying</h3>
                <div className="flex flex-wrap gap-1.5">
                  {equipment.extras.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-stone-400"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
      )}

      {step === 'spells' && charClass && (
        <Panel
          title="Spells"
          hint={`Pulled from the D&D Yonder spell list. A ${charClass.name} at level ${level} ${
            spellLimits?.prepared ? 'prepares' : 'knows'
          } ${spellLimits?.spellsKnown ?? 0} spells and ${spellLimits?.cantripsKnown ?? 0} cantrips — pick up to that many. If the list is unavailable you can type them in later.`}
        >
          {spellOptions === null ? (
            <p className="text-sm text-stone-400">Looking up spells…</p>
          ) : spellOptions.cantrips.length === 0 && spellOptions.leveled.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-400">
              The spell list is not available right now. Your sheet will still show your slots, save
              DC and how many spells to pick — choose them from a spell list before you play.
            </p>
          ) : (
            <div className="space-y-5">
              {(['cantrips', 'leveled'] as const).map((group) => {
                const options = spellOptions[group]
                if (!options.length) return null
                const chosen = group === 'cantrips' ? cantrips : spells
                const setChosen = group === 'cantrips' ? setCantrips : setSpells
                const limit = (group === 'cantrips' ? spellLimits?.cantripsKnown : spellLimits?.spellsKnown) ?? 0
                return (
                  <div key={group} className="space-y-2">
                    <h3 className="text-sm font-medium text-stone-300">
                      {group === 'cantrips' ? 'Cantrips' : 'Level 1 spells'}
                      <span className="ml-2 text-xs text-stone-500">
                        {chosen.length} of {limit} chosen
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {options.map((spell) => {
                        const picked = chosen.includes(spell.name)
                        const full = chosen.length >= limit && !picked
                        const viewed = viewingSpell?.name === spell.name
                        return (
                          <button
                            key={spell.name}
                            type="button"
                            disabled={full}
                            onClick={() => {
                              setViewingSpell(spell)
                              setChosen((prev) =>
                                prev.includes(spell.name)
                                  ? prev.filter((entry) => entry !== spell.name)
                                  : [...prev, spell.name],
                              )
                            }}
                            className={`rounded-full border px-3 py-1 text-xs ${
                              picked
                                ? `border-amber-500 bg-amber-600/20 text-stone-100 cursor-pointer${viewed ? ' ring-1 ring-sky-400' : ''}`
                                : full
                                  ? 'border-white/5 bg-white/[0.02] text-stone-600 cursor-not-allowed'
                                  : `border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 cursor-pointer${viewed ? ' ring-1 ring-sky-400' : ''}`
                            }`}
                          >
                            {spell.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {viewingSpell && (
                <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.06] p-4">
                  <h3 className="text-sm font-medium text-stone-100">{viewingSpell.name}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-300">
                    {viewingSpell.desc || 'No description came back from the spell list for this one.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </Panel>
      )}

      {step === 'name' && (
        <Panel title="Last thing — who are they?" hint={playerName ? `Playing as ${playerName}.` : undefined}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm text-stone-300" htmlFor="char-name">
                Character name
              </label>
              <input
                id="char-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Something heroic"
                className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-stone-600 outline-none focus:border-amber-500"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={suggestNames}>
                  Suggest {race?.nameStyle ? `${race.name} names` : 'names'}
                </Button>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setName(suggestion)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-stone-300 hover:bg-white/10 cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {campaigns.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm text-stone-300" htmlFor="campaign">
                  Campaign
                </label>
                <select
                  id="campaign"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-stone-200 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Not in a campaign</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {name && classId && raceId && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                <p className="mb-4 text-xs uppercase tracking-wider text-stone-500">Preview</p>
                <Sheet sheet={computeSheet(draft)} />
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <Button
          variant="ghost"
          onClick={() => go(-1)}
          disabled={stepList.indexOf(step) === 0 || busy}
        >
          Back
        </Button>
        {step === 'name' ? (
          <Button variant="primary" onClick={save} disabled={!canContinue() || busy}>
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Save character'}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => go(1)} disabled={!canContinue() || busy}>
            Continue
          </Button>
        )}
      </div>
    </div>
  )
}
