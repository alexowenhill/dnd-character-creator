/**
 * The stored character, and the maths that turns it into a playable sheet.
 *
 * Everything derived — modifiers, hit points, AC, saves, skills, spell slots —
 * is computed from the stored choices rather than saved alongside them, so a
 * rules fix applies to characters that already exist.
 */

import {
  ABILITY_ORDER,
  ABILITY_NAMES,
  SKILLS,
  SKILL_KEYS,
  backgroundById,
  cantripsKnown,
  classById,
  proficiencyBonus,
  raceById,
  spellSlots,
  spellbookSize,
  spellsKnown,
  type AbilityKey,
  type SkillKey,
} from './srd.ts'

export type StoredCharacter = {
  id: string
  name: string
  level: number
  playerName: string
  raceId: string
  subraceId?: string
  classId: string
  subclassId: string
  backgroundId: string
  alignmentId: string
  /** Rolled scores before any racial bonus, keyed by ability. */
  baseAbilities: Record<AbilityKey, number>
  /** The raw dice behind each score, for the "I really did roll that" tab. */
  rolls?: Record<AbilityKey, number[]>
  /** The level-4 ability score improvement, as +1/+2 per ability. */
  improvements?: Partial<Record<AbilityKey, number>>
  skillChoices: SkillKey[]
  spells?: string[]
  cantrips?: string[]
  notes?: string
  createdAt: string
}

export type AbilityLine = {
  key: AbilityKey
  name: string
  short: string
  base: number
  racial: number
  improvement: number
  total: number
  modifier: number
}

export type SkillLine = {
  key: SkillKey
  name: string
  ability: AbilityKey
  proficient: boolean
  modifier: number
}

export type ComputedSheet = {
  character: StoredCharacter
  raceName: string
  className: string
  subclassName: string
  backgroundName: string
  alignmentName: string
  proficiencyBonus: number
  abilities: AbilityLine[]
  abilityByKey: Record<AbilityKey, AbilityLine>
  hitPoints: number
  hitDice: string
  armourClass: number
  armourNote: string
  initiative: number
  speed: number
  passivePerception: number
  savingThrows: { key: AbilityKey; name: string; proficient: boolean; modifier: number }[]
  skills: SkillLine[]
  spellcasting?: {
    ability: AbilityKey
    abilityName: string
    saveDc: number
    attackBonus: number
    slots: { level: number; count: number }[]
    cantripsKnown: number
    spellsKnown: number
    prepared: boolean
    /** Wizards only: how many spells the spellbook holds. */
    spellbook?: number
  }
  features: string[]
  traits: string[]
}

export function modifierFor(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : String(modifier)
}

const SHORT: Record<AbilityKey, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
}

/** Racial bonuses, including the subrace, as a flat map. */
export function racialBonuses(raceId: string, subraceId?: string): Partial<Record<AbilityKey, number>> {
  const race = raceById(raceId)
  if (!race) return {}
  const bonuses: Partial<Record<AbilityKey, number>> = { ...race.bonuses }
  const subrace = race.subraces?.find((entry) => entry.id === subraceId)
  if (subrace) {
    for (const [key, value] of Object.entries(subrace.bonuses)) {
      const ability = key as AbilityKey
      bonuses[ability] = (bonuses[ability] ?? 0) + (value ?? 0)
    }
  }
  return bonuses
}

export function computeSheet(character: StoredCharacter): ComputedSheet {
  const race = raceById(character.raceId)
  const subrace = race?.subraces?.find((entry) => entry.id === character.subraceId)
  const charClass = classById(character.classId)
  const background = backgroundById(character.backgroundId)
  const level = character.level
  const profBonus = proficiencyBonus(level)
  const bonuses = racialBonuses(character.raceId, character.subraceId)

  const abilities: AbilityLine[] = ABILITY_ORDER.map((key) => {
    const base = character.baseAbilities[key] ?? 10
    const racial = bonuses[key] ?? 0
    const improvement = character.improvements?.[key] ?? 0
    // 20 is the hard cap for a player character.
    const total = Math.min(20, base + racial + improvement)
    return {
      key,
      name: ABILITY_NAMES[key],
      short: SHORT[key],
      base,
      racial,
      improvement,
      total,
      modifier: modifierFor(total),
    }
  })

  const abilityByKey = Object.fromEntries(
    abilities.map((line) => [line.key, line]),
  ) as Record<AbilityKey, AbilityLine>

  const conMod = abilityByKey.con.modifier
  const dexMod = abilityByKey.dex.modifier

  // Hit points use the fixed average per level after the first, which is what
  // most tables use and avoids a level 5 character with 14 hit points.
  const hitDie = charClass?.hitDie ?? 8
  const averagePerLevel = Math.floor(hitDie / 2) + 1
  const hillDwarfBonus = character.subraceId === 'hill' && character.raceId === 'dwarf' ? level : 0
  const hitPoints = hitDie + conMod + (level - 1) * (averagePerLevel + conMod) + hillDwarfBonus

  // Armour class from the class's assumed kit.
  const defense = charClass?.defense
  let armourClass = 10 + dexMod
  let armourNote = 'Unarmoured'
  if (defense) {
    const dexPart = defense.dexCap === 0 ? 0 : Math.min(dexMod, defense.dexCap ?? 99)
    armourClass =
      defense.base +
      dexPart +
      (defense.addWis ? abilityByKey.wis.modifier : 0) +
      (defense.addCon ? conMod : 0) +
      (defense.shield ? 2 : 0)
    armourNote = defense.label
  }

  const savingThrows = ABILITY_ORDER.map((key) => {
    const proficient = charClass?.savingThrows.includes(key) ?? false
    return {
      key,
      name: ABILITY_NAMES[key],
      proficient,
      modifier: abilityByKey[key].modifier + (proficient ? profBonus : 0),
    }
  })

  const proficientSkills = new Set<SkillKey>([
    ...(background?.skills ?? []),
    ...character.skillChoices,
  ])

  const skills: SkillLine[] = SKILL_KEYS.map((key) => {
    const proficient = proficientSkills.has(key)
    const ability = SKILLS[key].ability
    return {
      key,
      name: SKILLS[key].name,
      ability,
      proficient,
      modifier: abilityByKey[ability].modifier + (proficient ? profBonus : 0),
    }
  })

  const perception = skills.find((skill) => skill.key === 'perception')
  const passivePerception = 10 + (perception?.modifier ?? 0)

  let spellcasting: ComputedSheet['spellcasting']
  if (charClass && charClass.caster !== 'none' && charClass.spellAbility) {
    const ability = charClass.spellAbility
    const mod = abilityByKey[ability].modifier
    const known = spellsKnown(charClass.id, level, mod)
    spellcasting = {
      ability,
      abilityName: ABILITY_NAMES[ability],
      saveDc: 8 + profBonus + mod,
      attackBonus: profBonus + mod,
      slots: spellSlots(charClass.caster, level),
      cantripsKnown: cantripsKnown(charClass.id, level),
      spellsKnown: known.count,
      prepared: known.prepared,
      spellbook: charClass.id === 'wizard' ? spellbookSize(level) : undefined,
    }
  }

  let speed = race?.speed ?? 30
  if (character.subraceId === 'wood') speed = 35
  if (charClass?.id === 'monk' && level >= 2) speed += 10
  if (charClass?.id === 'barbarian' && level >= 5) speed += 10

  return {
    character,
    raceName: subrace ? `${subrace.name}` : (race?.name ?? 'Unknown'),
    className: charClass?.name ?? 'Unknown',
    subclassName:
      charClass?.subclasses.find((entry) => entry.id === character.subclassId)?.name ?? '',
    backgroundName: background?.name ?? '',
    alignmentName: character.alignmentId,
    proficiencyBonus: profBonus,
    abilities,
    abilityByKey,
    hitPoints,
    hitDice: `${level}d${hitDie}`,
    armourClass,
    armourNote,
    initiative: dexMod,
    speed,
    passivePerception,
    savingThrows,
    skills,
    spellcasting,
    features: charClass?.levelFive ?? [],
    traits: [...(race?.traits ?? []), ...(subrace?.traits ?? [])],
  }
}

/**
 * Assign six rolled totals to abilities, best roll to the class's most
 * important ability. Players can override afterwards; this is just a sensible
 * opening offer so nobody has to understand the stat priorities to start.
 */
export function suggestAssignment(
  totals: number[],
  classId: string,
): Record<AbilityKey, number> {
  const charClass = classById(classId)
  const priority: AbilityKey[] = charClass
    ? [...charClass.primary, ...ABILITY_ORDER.filter((key) => !charClass.primary.includes(key))]
    : [...ABILITY_ORDER]

  const sorted = [...totals].sort((a, b) => b - a)
  const assignment = {} as Record<AbilityKey, number>
  priority.forEach((key, index) => {
    assignment[key] = sorted[index] ?? 10
  })
  return assignment
}
