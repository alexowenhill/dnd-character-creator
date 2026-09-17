/**
 * Checks the rules maths and the party-password signing.
 *
 * The sheet is computed rather than stored, so these cases pin down the numbers
 * a player will actually use at the table — hit points, armour class, saves,
 * skills, spell slots — plus the two places a mistake would be silent: ability
 * bonuses stacking, and a forged session cookie being accepted.
 *
 *   npm test
 */
import { computeSheet, modifierFor, racialBonuses, suggestAssignment } from '../lib/character.ts'
import { proficiencyBonus, spellSlots, cantripsKnown, spellsKnown, spellbookSize, ABILITY_ORDER } from '../lib/srd.ts'
import { scoreQuiz, QUESTIONS } from '../lib/quiz.ts'
import { isValidSessionToken, makeSessionToken } from '../lib/session.ts'

let failed = 0
const check = (label, cond, extra = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${cond ? '' : `  ${extra}`}`)
  if (!cond) failed++
}

const base = (overrides = {}) => ({
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...overrides,
})

const make = (overrides = {}) => ({
  id: 'test',
  name: 'Test',
  playerName: '',
  level: 5,
  raceId: 'human',
  classId: 'fighter',
  subclassId: 'champion',
  backgroundId: 'soldier',
  alignmentId: 'n',
  baseAbilities: base(),
  skillChoices: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

// --- modifiers -------------------------------------------------------
check('mod 10 = 0', modifierFor(10) === 0)
check('mod 8 = -1', modifierFor(8) === -1)
check('mod 15 = +2', modifierFor(15) === 2)
check('mod 20 = +5', modifierFor(20) === 5)
check('mod 3 = -4', modifierFor(3) === -4)

// --- proficiency bonus by level --------------------------------------
check('prof L1 = 2', proficiencyBonus(1) === 2)
check('prof L4 = 2', proficiencyBonus(4) === 2)
check('prof L5 = 3', proficiencyBonus(5) === 3)
check('prof L9 = 4', proficiencyBonus(9) === 4)
check('prof L17 = 6', proficiencyBonus(17) === 6)

// --- racial bonuses, including subrace stacking ----------------------
const hill = racialBonuses('dwarf', 'hill')
check('dwarf CON +2', hill.con === 2)
check('hill dwarf WIS +1', hill.wis === 1)
const mountain = racialBonuses('dwarf', 'mountain')
check('mountain dwarf STR +2 on top of CON +2', mountain.str === 2 && mountain.con === 2)
check('human +1 to all six', ABILITY_ORDER.every((k) => racialBonuses('human')[k] === 1))
check('unknown race -> no bonuses', Object.keys(racialBonuses('nope')).length === 0)

// --- hit points ------------------------------------------------------
// Fighter d10, CON 14 (+2): 10+2 at L1, then 4 x (6+2) = 32 -> 44
const fighter = computeSheet(make({ baseAbilities: base({ con: 14 }) }))
check('L5 fighter CON14 HP = 44', fighter.hitPoints === 44, String(fighter.hitPoints))
// Wizard d6, CON 10 (+0): 6 + 4x4 = 22
const wizard = computeSheet(make({ classId: 'wizard', subclassId: 'evocation', backgroundId: 'sage' }))
check('L5 wizard CON10 HP = 22', wizard.hitPoints === 22, String(wizard.hitPoints))
// Hill dwarf gets +1 per level on top.
const dwarf = computeSheet(make({ raceId: 'dwarf', subraceId: 'hill', baseAbilities: base({ con: 14 }) }))
// CON 14 base +2 racial = 16 (+3): 10+3 + 4*(6+3) = 49, +5 hill = 54
check('hill dwarf fighter HP = 54', dwarf.hitPoints === 54, String(dwarf.hitPoints))

// --- ability totals cap at 20 ---------------------------------------
const capped = computeSheet(make({
  raceId: 'half-orc',
  baseAbilities: base({ str: 18 }),
  improvements: { str: 2 },
}))
// 18 + 2 racial + 2 improvement = 22, capped to 20
check('ability caps at 20', capped.abilityByKey.str.total === 20, String(capped.abilityByKey.str.total))
check('capped ability mod is +5', capped.abilityByKey.str.modifier === 5)

// --- armour class ----------------------------------------------------
// Fighter: chain mail 16, no dex, +2 shield = 18
check('fighter AC = 18', fighter.armourClass === 18, String(fighter.armourClass))
// Monk: 10 + DEX + WIS
const monk = computeSheet(make({
  classId: 'monk', subclassId: 'openHand',
  baseAbilities: base({ dex: 16, wis: 14 }),
}))
check('monk unarmoured AC = 10+3+2 = 15', monk.armourClass === 15, String(monk.armourClass))
// Barbarian: 10 + DEX + CON
const barb = computeSheet(make({
  classId: 'barbarian', subclassId: 'berserker',
  baseAbilities: base({ dex: 14, con: 16 }),
}))
check('barbarian unarmoured AC = 10+2+3 = 15', barb.armourClass === 15, String(barb.armourClass))

// --- saving throws ---------------------------------------------------
const fighterStrSave = fighter.savingThrows.find((s) => s.key === 'str')
check('fighter proficient in STR save', fighterStrSave.proficient)
check('fighter STR save = 0 + 3 prof', fighterStrSave.modifier === 3, String(fighterStrSave.modifier))
const fighterChaSave = fighter.savingThrows.find((s) => s.key === 'cha')
check('fighter not proficient in CHA save', !fighterChaSave.proficient)
check('fighter CHA save = 0', fighterChaSave.modifier === 0)

// --- skills: background grants, class choices add --------------------
const rogue = computeSheet(make({
  classId: 'rogue', subclassId: 'thief', backgroundId: 'criminal',
  baseAbilities: base({ dex: 16 }),
  skillChoices: ['stealth', 'perception', 'acrobatics', 'investigation'],
}))
const stealth = rogue.skills.find((s) => s.key === 'stealth')
check('stealth proficient (both bg and choice)', stealth.proficient)
check('stealth = DEX +3 and prof +3 = +6', stealth.modifier === 6, String(stealth.modifier))
const deception = rogue.skills.find((s) => s.key === 'deception')
check('deception proficient from Criminal background', deception.proficient)
const medicine = rogue.skills.find((s) => s.key === 'medicine')
check('medicine not proficient', !medicine.proficient && medicine.modifier === 0)
check('passive perception = 10 + perception mod', rogue.passivePerception === 10 + rogue.skills.find((s) => s.key === 'perception').modifier)

// --- spell slots -----------------------------------------------------
const full5 = spellSlots('full', 5)
check('full caster L5 = 4/3/2', JSON.stringify(full5.map((s) => s.count)) === '[4,3,2]', JSON.stringify(full5))
const half5 = spellSlots('half', 5)
check('half caster L5 = 4/2', JSON.stringify(half5.map((s) => s.count)) === '[4,2]', JSON.stringify(half5))
const pact5 = spellSlots('pact', 5)
check('warlock L5 = 2 slots at level 3', pact5.length === 1 && pact5[0].count === 2 && pact5[0].level === 3, JSON.stringify(pact5))
check('non-caster has no slots', spellSlots('none', 5).length === 0)
check('half caster L1 has no slots', spellSlots('half', 1).length === 0)

// --- spellcasting block ----------------------------------------------
const cleric = computeSheet(make({
  classId: 'cleric', subclassId: 'life', backgroundId: 'acolyte',
  baseAbilities: base({ wis: 16 }),
}))
check('cleric save DC = 8 + 3 prof + 3 wis = 14', cleric.spellcasting.saveDc === 14, String(cleric.spellcasting.saveDc))
check('cleric spell attack = +6', cleric.spellcasting.attackBonus === 6, String(cleric.spellcasting.attackBonus))
check('cleric prepares spells', cleric.spellcasting.prepared === true)
check('cleric prepares WIS mod + level = 8', cleric.spellcasting.spellsKnown === 8, String(cleric.spellcasting.spellsKnown))
check('fighter has no spellcasting block', fighter.spellcasting === undefined)
check('wizard cantrips at L5 = 4', cantripsKnown('wizard', 5) === 4)
check('bard knows 8 spells at L5', spellsKnown('bard', 5, 3).count === 8)
check('wizard L5 prepares INT+level = 8', spellsKnown('wizard', 5, 3).count === 8)
check('wizard L5 spellbook holds 14', spellbookSize(5) === 14)

// --- speed -----------------------------------------------------------
check('wood elf speed 35', computeSheet(make({ raceId: 'elf', subraceId: 'wood' })).speed === 35)
check('L5 monk speed 30+10', monk.speed === 40, String(monk.speed))
check('L5 barbarian speed 30+10', barb.speed === 40, String(barb.speed))
check('dwarf speed 25', computeSheet(make({ raceId: 'dwarf', subraceId: 'hill' })).speed === 25)

// --- assignment suggestion ------------------------------------------
const assigned = suggestAssignment([15, 14, 13, 12, 10, 8], 'wizard')
check('wizard gets best roll in INT', assigned.int === 15, String(assigned.int))
check('wizard second best in CON', assigned.con === 14, String(assigned.con))
check('every ability assigned', ABILITY_ORDER.every((k) => typeof assigned[k] === 'number'))
const rogueAssign = suggestAssignment([15, 14, 13, 12, 10, 8], 'rogue')
check('rogue gets best roll in DEX', rogueAssign.dex === 15)

// --- quiz ------------------------------------------------------------
const allMagic = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.answers[2].id]))
const magicResult = scoreQuiz(allMagic)
check('quiz returns ranked classes', magicResult.classes.length > 0)
check('quiz ranks descending', magicResult.classes.every((entry, i, arr) => i === 0 || arr[i - 1].score >= entry.score))
check('quiz gives reasons for the top class', magicResult.reasons.length > 0)
const empty = scoreQuiz({})
check('empty quiz is safe', empty.classes.length === 0 && empty.reasons.length === 0)
const bogus = scoreQuiz({ trouble: 'nonexistent' })
check('unknown answer ignored', bogus.classes.length === 0)
// A consistently martial set should not suggest a spellcaster first.
const martial = { trouble: 'charge', origin: 'wild', drive: 'duty', 'party-role': 'damage', temperament: 'fists', body: 'strong', 'magic-feel': 'none' }
const martialTop = scoreQuiz(martial).classes[0].id
check('martial answers suggest a martial class', ['fighter', 'barbarian', 'paladin'].includes(martialTop), martialTop)
const casterAnswers = { trouble: 'magic', origin: 'temple', drive: 'curiosity', 'party-role': 'knowledge', temperament: 'remember', body: 'clever', 'magic-feel': 'study' }
check('study answers suggest wizard', scoreQuiz(casterAnswers).classes[0].id === 'wizard', scoreQuiz(casterAnswers).classes[0].id)

// --- armour class from equipment ------------------------------------
// Light armour adds full DEX.
const studded = computeSheet(make({
  classId: 'rogue', subclassId: 'thief', backgroundId: 'criminal',
  baseAbilities: base({ dex: 18 }),
  equipment: { armourId: 'studded', weaponIds: ['rapier'] },
}))
check('studded leather + full DEX = 12 + 4 = 16', studded.armourClass === 16, String(studded.armourClass))

// Medium armour caps DEX at +2.
const halfPlate = computeSheet(make({
  baseAbilities: base({ dex: 18 }),
  equipment: { armourId: 'half-plate' },
}))
check('half plate caps DEX at 2: 15 + 2 = 17', halfPlate.armourClass === 17, String(halfPlate.armourClass))

// Heavy armour ignores DEX entirely.
const plate = computeSheet(make({
  baseAbilities: base({ dex: 18 }),
  equipment: { armourId: 'plate' },
}))
check('plate ignores DEX = 18', plate.armourClass === 18, String(plate.armourClass))
check('plate + shield = 20', computeSheet(make({
  baseAbilities: base({ dex: 18 }), equipment: { armourId: 'plate', shield: true },
})).armourClass === 20)

// Strength requirement is flagged, not silently ignored.
const heavyWarn = computeSheet(make({
  baseAbilities: base({ str: 8 }), equipment: { armourId: 'plate' },
}))
check('plate warns below STR 15', Boolean(heavyWarn.armourWarning), String(heavyWarn.armourWarning))
check('no warning when strong enough', !computeSheet(make({
  baseAbilities: base({ str: 16 }), equipment: { armourId: 'plate' },
})).armourWarning)

// Unarmoured monk keeps its own rule even with equipment chosen.
const monkEquipped = computeSheet(make({
  classId: 'monk', subclassId: 'openHand',
  baseAbilities: base({ dex: 16, wis: 14 }),
  equipment: { weaponIds: ['shortsword'] },
}))
check('monk unarmoured with a weapon = 10+3+2 = 15', monkEquipped.armourClass === 15, String(monkEquipped.armourClass))

// With no equipment at all, fall back to the class assumption.
check('no equipment falls back to the class kit', fighter.armourClass === 18)
check('fallback says it is an assumption', fighter.armourNote.startsWith('Assumed'), fighter.armourNote)

// --- attacks ---------------------------------------------------------
const rapierAttack = studded.attacks.find((a) => a.name === 'Rapier')
check('rapier is a listed attack', Boolean(rapierAttack))
// Finesse with DEX 18 (+4) and proficiency +3.
check('rapier attack = +7', rapierAttack.attackBonus === 7, String(rapierAttack.attackBonus))
check('rapier damage includes the modifier', rapierAttack.damage === '1d8 +4', rapierAttack.damage)
check('rogue is proficient with a rapier', rapierAttack.proficient)
// A wizard with a greatsword is not proficient.
const wizWeapon = computeSheet(make({
  classId: 'wizard', subclassId: 'evocation', backgroundId: 'sage',
  baseAbilities: base({ str: 10 }),
  equipment: { weaponIds: ['greatsword'] },
}))
check('wizard not proficient with a greatsword', wizWeapon.attacks[0].proficient === false)
check('non-proficient attack gets no bonus', wizWeapon.attacks[0].attackBonus === 0, String(wizWeapon.attacks[0].attackBonus))
check('no weapons means no attacks', fighter.attacks.length === 0)

// --- session signing -------------------------------------------------
const token = makeSessionToken()
check('fresh token validates', isValidSessionToken(token))
check('empty token rejected', !isValidSessionToken(''))
check('undefined token rejected', !isValidSessionToken(undefined))
check('tampered payload rejected', !isValidSessionToken(`party.9999.${token.split('.').pop()}`))
check('tampered signature rejected', !isValidSessionToken(`${token.slice(0, -4)}0000`))
check('garbage rejected', !isValidSessionToken('nonsense'))
check('no-signature rejected', !isValidSessionToken('party.123'))

console.log(failed ? `\n${failed} FAILED` : '\nall passed')
process.exitCode = failed ? 1 : 0
