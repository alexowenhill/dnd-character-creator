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
import {
  SHIELD_BONUS,
  armourById,
  attackAbility,
  dexAllowance,
  weaponById,
  type StoredEquipment,
} from './equipment.ts'

export type StoredCharacter = {
  id: string
  name: string
  level: number
  playerName: string
  /** Which campaign this character belongs to, if any. */
  campaignId?: string
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
  equipment?: StoredEquipment
  spells?: string[]
  cantrips?: string[]
  /** What each spell/cantrip in `spells`/`cantrips` does, from the Yonder spell
   *  list at the time it was picked — stored so it is still there to read at
   *  the table even if the API is down or the account is gone by then. */
  spellDescriptions?: Record<string, string>
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
  attacks: {
    name: string
    attackBonus: number
    damage: string
    damageType: string
    ability: AbilityKey
    proficient: boolean
    note?: string
  }[]
  /** Set when the armour worn is heavier than the class can use. */
  armourWarning?: string
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

  // Armour class comes from what is actually worn once equipment is chosen.
  // Until then, fall back to the kit the class would typically carry.
  const equipment = character.equipment
  const wornArmour = armourById(equipment?.armourId)
  const hasShield = equipment?.shield === true
  const defense = charClass?.defense
  let armourClass: number
  let armourNote: string
  let armourWarning: string | undefined

  if (equipment && (wornArmour || hasShield || equipment.weaponIds?.length)) {
    if (wornArmour) {
      armourClass =
        wornArmour.baseAc + dexAllowance(wornArmour.category, dexMod) + (hasShield ? SHIELD_BONUS : 0)
      const dexPart = dexAllowance(wornArmour.category, dexMod)
      armourNote =
        `${wornArmour.name}${hasShield ? ' and shield' : ''}` +
        ` (${wornArmour.baseAc}${dexPart ? ` + ${dexPart} DEX` : ''}${hasShield ? ` + ${SHIELD_BONUS}` : ''})`
      if (wornArmour.strengthMin && abilityByKey.str.total < wornArmour.strengthMin) {
        armourWarning = `${wornArmour.name} needs Strength ${wornArmour.strengthMin} — you move 10 ft slower without it.`
      }
    } else {
      // Unarmoured: monks and barbarians have their own better rule.
      const unarmouredBonus =
        charClass?.defense.addWis ? abilityByKey.wis.modifier : charClass?.defense.addCon ? conMod : 0
      armourClass = 10 + dexMod + unarmouredBonus + (hasShield ? SHIELD_BONUS : 0)
      armourNote =
        unarmouredBonus > 0
          ? `Unarmoured Defence (10 + ${dexMod} DEX + ${unarmouredBonus})`
          : `No armour (10 + ${dexMod} DEX)${hasShield ? ` + ${SHIELD_BONUS} shield` : ''}`
    }
  } else if (defense) {
    const dexPart = defense.dexCap === 0 ? 0 : Math.min(dexMod, defense.dexCap ?? 99)
    armourClass =
      defense.base +
      dexPart +
      (defense.addWis ? abilityByKey.wis.modifier : 0) +
      (defense.addCon ? conMod : 0) +
      (defense.shield ? 2 : 0)
    armourNote = `Assumed: ${defense.label}`
  } else {
    armourClass = 10 + dexMod
    armourNote = 'Unarmoured'
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

  // Weapon attacks, so the sheet is usable in a fight.
  const attacks = (character.equipment?.weaponIds ?? [])
    .map((id) => weaponById(id))
    .filter((weapon): weapon is NonNullable<typeof weapon> => Boolean(weapon))
    .map((weapon) => {
      const ability = attackAbility(weapon, abilityByKey.str.total, abilityByKey.dex.total)
      const abilityMod = abilityByKey[ability].modifier
      // Proficiency covers simple weapons for everyone, martial for the classes
      // trained in them; the SRD exceptions are close enough not to mislead.
      const martialClasses = ['barbarian', 'fighter', 'paladin', 'ranger', 'rogue', 'bard', 'monk']
      const proficient =
        weapon.kind === 'simple' || martialClasses.includes(charClass?.id ?? '')
      return {
        name: weapon.name,
        attackBonus: abilityMod + (proficient ? profBonus : 0),
        damage: `${weapon.damage}${abilityMod ? ` ${abilityMod > 0 ? '+' : ''}${abilityMod}` : ''}`,
        damageType: weapon.damageType,
        ability,
        proficient,
        note: weapon.versatile ? `${weapon.versatile} two-handed` : undefined,
      }
    })

  return {
    character,
    attacks,
    armourWarning,
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
