/**
 * The questionnaire that suggests a character.
 *
 * Every answer adds weight to some races, classes, backgrounds and alignments.
 * Nothing is ever forced: the results are shown as a ranked suggestion with the
 * reasons, and the full list stays available underneath. The point is to give
 * someone who does not know the rules a good starting shape, not to decide for
 * them.
 */

import type { AbilityKey } from './srd.ts'

export type Weights = {
  races?: Record<string, number>
  classes?: Record<string, number>
  backgrounds?: Record<string, number>
  alignments?: Record<string, number>
  abilities?: Partial<Record<AbilityKey, number>>
}

export type Answer = {
  id: string
  label: string
  detail?: string
  weights: Weights
}

export type Question = {
  id: string
  prompt: string
  hint?: string
  answers: Answer[]
}

export const QUESTIONS: Question[] = [
  {
    id: 'trouble',
    prompt: 'A fight is starting and you have one moment to act. What do you do?',
    answers: [
      {
        id: 'charge',
        label: 'Get between it and everyone else',
        detail: 'You are the wall.',
        weights: {
          classes: { fighter: 3, paladin: 3, barbarian: 2 },
          abilities: { str: 2, con: 2 },
          alignments: { lg: 1, ng: 1 },
        },
      },
      {
        id: 'shadows',
        label: 'Step out of sight and pick your moment',
        detail: 'Nobody sees the important hit coming.',
        weights: {
          classes: { rogue: 3, ranger: 2, monk: 1 },
          races: { halfling: 2, elf: 1 },
          abilities: { dex: 2 },
          alignments: { cn: 1, n: 1 },
        },
      },
      {
        id: 'magic',
        label: 'Reach for something loud and magical',
        detail: 'Solve it at range, decisively.',
        weights: {
          classes: { wizard: 3, sorcerer: 3, warlock: 2 },
          races: { gnome: 1, tiefling: 1, elf: 1 },
          abilities: { int: 2, cha: 1 },
        },
      },
      {
        id: 'talk',
        label: 'Try to stop it with words',
        detail: 'Most fights are avoidable, briefly.',
        weights: {
          classes: { bard: 3, cleric: 2, paladin: 1 },
          races: { 'half-elf': 2, human: 1 },
          abilities: { cha: 2, wis: 1 },
          backgrounds: { noble: 1, charlatan: 1 },
        },
      },
    ],
  },
  {
    id: 'origin',
    prompt: 'Where did you come from?',
    answers: [
      {
        id: 'city',
        label: 'A city, and not the nice part',
        weights: {
          backgrounds: { urchin: 3, criminal: 2, charlatan: 1 },
          classes: { rogue: 2 },
          races: { human: 1, halfling: 1 },
          abilities: { dex: 1 },
        },
      },
      {
        id: 'wild',
        label: 'Somewhere wild, far from roads',
        weights: {
          backgrounds: { outlander: 3, 'folk-hero': 1, hermit: 1 },
          classes: { ranger: 3, druid: 3, barbarian: 2 },
          races: { elf: 1, 'half-orc': 1 },
          abilities: { wis: 1, con: 1 },
        },
      },
      {
        id: 'temple',
        label: 'A temple, a library, or somewhere with rules',
        weights: {
          backgrounds: { acolyte: 3, sage: 3 },
          classes: { cleric: 3, wizard: 2, monk: 1 },
          races: { gnome: 1, dwarf: 1 },
          abilities: { wis: 1, int: 1 },
          alignments: { lg: 1, ln: 1 },
        },
      },
      {
        id: 'privilege',
        label: 'Money, or at least a name people recognise',
        weights: {
          backgrounds: { noble: 3, 'guild-artisan': 1, entertainer: 1 },
          classes: { bard: 2, paladin: 1, sorcerer: 1 },
          races: { 'half-elf': 1, human: 1 },
          abilities: { cha: 2 },
        },
      },
    ],
  },
  {
    id: 'drive',
    prompt: 'Why are you out here risking your neck?',
    answers: [
      {
        id: 'duty',
        label: 'Somebody has to, and it may as well be me',
        weights: {
          classes: { paladin: 3, cleric: 2, fighter: 1 },
          alignments: { lg: 3, ln: 1 },
          backgrounds: { soldier: 2, acolyte: 1 },
        },
      },
      {
        id: 'curiosity',
        label: 'I want to know what is out there',
        weights: {
          classes: { wizard: 3, bard: 2, ranger: 1 },
          alignments: { ng: 1, n: 2 },
          backgrounds: { sage: 2, hermit: 1 },
          abilities: { int: 1 },
        },
      },
      {
        id: 'freedom',
        label: 'Nobody tells me where to be',
        weights: {
          classes: { barbarian: 2, rogue: 2, sorcerer: 1, warlock: 1 },
          alignments: { cn: 3, cg: 2 },
          races: { 'half-orc': 1, tiefling: 1 },
        },
      },
      {
        id: 'debt',
        label: 'I owe someone, or something, a great deal',
        weights: {
          classes: { warlock: 3, monk: 1, rogue: 1 },
          alignments: { n: 1, le: 1, cn: 1 },
          races: { tiefling: 2 },
          backgrounds: { criminal: 1, hermit: 1 },
        },
      },
    ],
  },
  {
    id: 'party-role',
    prompt: 'What does the rest of the party come to you for?',
    answers: [
      {
        id: 'damage',
        label: 'Removing the problem',
        weights: {
          classes: { barbarian: 3, fighter: 2, rogue: 2, sorcerer: 1 },
          abilities: { str: 1, dex: 1 },
        },
      },
      {
        id: 'healing',
        label: 'Putting them back together',
        weights: {
          classes: { cleric: 3, druid: 2, bard: 1, paladin: 1 },
          abilities: { wis: 2 },
          alignments: { ng: 1, lg: 1 },
        },
      },
      {
        id: 'knowledge',
        label: 'Knowing what that thing is',
        weights: {
          classes: { wizard: 3, bard: 1, druid: 1 },
          backgrounds: { sage: 3 },
          abilities: { int: 2 },
        },
      },
      {
        id: 'problems',
        label: 'Getting in, getting out, getting it open',
        weights: {
          classes: { rogue: 3, monk: 1, ranger: 1 },
          backgrounds: { criminal: 2, urchin: 1 },
          abilities: { dex: 2 },
        },
      },
    ],
  },
  {
    id: 'temperament',
    prompt: 'Someone insults you in a crowded room.',
    answers: [
      {
        id: 'fists',
        label: 'They find out why that was a mistake',
        weights: {
          classes: { barbarian: 3, fighter: 1, 'half-orc': 0 },
          races: { 'half-orc': 2, dragonborn: 1 },
          alignments: { cn: 1, ce: 1 },
          abilities: { str: 1 },
        },
      },
      {
        id: 'wit',
        label: 'You get the room laughing at them instead',
        weights: {
          classes: { bard: 3, rogue: 1, warlock: 1 },
          races: { 'half-elf': 1, halfling: 1 },
          abilities: { cha: 2 },
          backgrounds: { entertainer: 2, charlatan: 1 },
        },
      },
      {
        id: 'ignore',
        label: 'You let it go. It costs you nothing.',
        weights: {
          classes: { monk: 3, cleric: 1, druid: 1 },
          races: { dwarf: 1, gnome: 1 },
          alignments: { ln: 2, n: 1 },
          abilities: { wis: 2 },
        },
      },
      {
        id: 'remember',
        label: 'You say nothing, and you remember their face',
        weights: {
          classes: { rogue: 2, warlock: 2, wizard: 1 },
          races: { elf: 1, tiefling: 1 },
          alignments: { ne: 1, ln: 1, cn: 1 },
          abilities: { int: 1 },
        },
      },
    ],
  },
  {
    id: 'body',
    prompt: 'How do you actually get things done?',
    answers: [
      {
        id: 'strong',
        label: 'I am stronger than the problem',
        weights: {
          abilities: { str: 3, con: 1 },
          classes: { barbarian: 2, fighter: 2, paladin: 1 },
          races: { 'half-orc': 2, dragonborn: 1, dwarf: 1 },
        },
      },
      {
        id: 'quick',
        label: 'I am faster than the problem',
        weights: {
          abilities: { dex: 3 },
          classes: { rogue: 2, monk: 2, ranger: 1 },
          races: { halfling: 2, elf: 2 },
        },
      },
      {
        id: 'clever',
        label: 'I out-think the problem',
        weights: {
          abilities: { int: 3 },
          classes: { wizard: 3, bard: 1 },
          races: { gnome: 2, elf: 1 },
        },
      },
      {
        id: 'force-of-will',
        label: 'I make the problem want to help me',
        weights: {
          abilities: { cha: 3 },
          classes: { sorcerer: 2, warlock: 2, bard: 2, paladin: 1 },
          races: { tiefling: 2, 'half-elf': 2 },
        },
      },
    ],
  },
  {
    id: 'magic-feel',
    prompt: 'How do you feel about magic?',
    answers: [
      {
        id: 'study',
        label: 'It is a craft. I have studied it.',
        weights: { classes: { wizard: 4 }, abilities: { int: 2 }, backgrounds: { sage: 2 } },
      },
      {
        id: 'born',
        label: 'It is just in me. Always has been.',
        weights: { classes: { sorcerer: 4 }, races: { dragonborn: 1, tiefling: 1 }, abilities: { cha: 2 } },
      },
      {
        id: 'given',
        label: 'Something gave it to me, and it wants something back',
        weights: { classes: { warlock: 4, cleric: 1 }, abilities: { cha: 1 } },
      },
      {
        id: 'none',
        label: 'I would rather hit things, thanks',
        weights: {
          classes: { fighter: 3, barbarian: 3, rogue: 2, monk: 2 },
          abilities: { str: 1, dex: 1 },
        },
      },
    ],
  },
]

export type QuizResult = {
  races: { id: string; score: number }[]
  classes: { id: string; score: number }[]
  backgrounds: { id: string; score: number }[]
  alignments: { id: string; score: number }[]
  abilities: Partial<Record<AbilityKey, number>>
  /** The answers that drove the top class, for explaining the suggestion. */
  reasons: string[]
}

function accumulate(
  into: Record<string, number>,
  from: Record<string, number> | undefined,
) {
  if (!from) return
  for (const [key, value] of Object.entries(from)) {
    into[key] = (into[key] ?? 0) + value
  }
}

export function scoreQuiz(answers: Record<string, string>): QuizResult {
  const races: Record<string, number> = {}
  const classes: Record<string, number> = {}
  const backgrounds: Record<string, number> = {}
  const alignments: Record<string, number> = {}
  const abilities: Partial<Record<AbilityKey, number>> = {}
  const chosen: { question: Question; answer: Answer }[] = []

  for (const question of QUESTIONS) {
    const answerId = answers[question.id]
    if (!answerId) continue
    const answer = question.answers.find((entry) => entry.id === answerId)
    if (!answer) continue
    chosen.push({ question, answer })
    accumulate(races, answer.weights.races)
    accumulate(classes, answer.weights.classes)
    accumulate(backgrounds, answer.weights.backgrounds)
    accumulate(alignments, answer.weights.alignments)
    for (const [key, value] of Object.entries(answer.weights.abilities ?? {})) {
      const ability = key as AbilityKey
      abilities[ability] = (abilities[ability] ?? 0) + (value ?? 0)
    }
  }

  const rank = (scores: Record<string, number>) =>
    Object.entries(scores)
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))

  const rankedClasses = rank(classes)
  const topClass = rankedClasses[0]?.id

  // Explain the suggestion using the answers that pushed the winner up.
  const reasons = chosen
    .filter(({ answer }) => topClass && (answer.weights.classes?.[topClass] ?? 0) > 0)
    .map(({ answer }) => answer.label)

  return {
    races: rank(races),
    classes: rankedClasses,
    backgrounds: rank(backgrounds),
    alignments: rank(alignments),
    abilities,
    reasons,
  }
}
