/**
 * A short prose introduction for the character sheet, woven together from the
 * race, class, background and alignment blurbs already written for this app
 * (lib/srd.ts) — no separate content library to maintain, and it stays correct
 * automatically if those blurbs change.
 *
 * The blurbs are written two ways: plain descriptive fragments ("Stubborn,
 * stone-hearted...") and second-person sentences ("You served in a temple...").
 * Rather than curate a version of every blurb for every pronoun, `toThirdPerson`
 * rewrites "you"/"your"/"yourself" to "they"/"their"/"themselves" — the request
 * was to use "they" for everyone, and English verbs take the same form for
 * "you" as for "they", so the swap needs no other grammar changes — except that
 * "you" also stands in for the object pronoun "them" ("plans for you", "gets
 * you ahead"), where a bare swap to "they" is wrong ("plans for they"). Those
 * only turn up right after a preposition or a transitive verb, so that's
 * handled first, before the general subject-pronoun swap below it.
 */

import { ALIGNMENTS, BACKGROUNDS, CLASSES, raceById } from './srd.ts'
import type { StoredCharacter } from './character.ts'

function toThirdPerson(text: string): string {
  return text
    .replace(/\byourself\b/g, 'themselves')
    .replace(/\bYourself\b/g, 'Themselves')
    .replace(/\byour\b/g, 'their')
    .replace(/\bYour\b/g, 'Their')
    .replace(/\b(for|to|with|about|against|near|beside|gets?|makes?|helps?)\s+you\b/g, '$1 them')
    .replace(/\byou\b/g, 'they')
    .replace(/\bYou\b/g, 'They')
}

function withArticle(word: string): string {
  return `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`
}

export function characterIntro(character: StoredCharacter): string {
  const race = raceById(character.raceId)
  const subrace = race?.subraces?.find((entry) => entry.id === character.subraceId)
  const charClass = CLASSES.find((entry) => entry.id === character.classId)
  const background = BACKGROUNDS.find((entry) => entry.id === character.backgroundId)
  const alignment = ALIGNMENTS.find((entry) => entry.id === character.alignmentId)

  const firstName = character.name.trim().split(/\s+/)[0] || character.name
  const raceLabel = subrace?.name ?? race?.name

  const sentences: string[] = []

  if (raceLabel && charClass) {
    sentences.push(
      `${character.name} is ${withArticle(raceLabel)} ${charClass.name}${
        background ? `, once ${withArticle(background.name.toLowerCase())}` : ''
      }.`,
    )
  }

  const raceBlurb = subrace?.blurb ?? race?.blurb
  if (raceBlurb) sentences.push(toThirdPerson(raceBlurb))
  if (charClass?.blurb) sentences.push(toThirdPerson(charClass.blurb))
  if (background?.blurb) sentences.push(toThirdPerson(background.blurb))
  if (alignment) sentences.push(`${toThirdPerson(alignment.blurb)} That's ${firstName}, more or less.`)

  return sentences.join(' ')
}
