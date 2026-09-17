/**
 * Fills the official WotC 5e character sheet (assets/character-sheet-template.pdf,
 * "5E_CharacterSheet_Fillable.pdf") with a stored character's computed sheet.
 *
 * The template's own field names are what they are — inconsistent spacing,
 * a typo ("CHamod"), generic "Check Box N" names for every proficiency dot —
 * because that is what Wizards of the Coast shipped. The mappings below were
 * built once by rendering the template and matching each checkbox to its
 * nearest labelled neighbour by page position; they are not guessable from
 * the names alone, so don't rename fields here without re-deriving them.
 *
 * Left blank deliberately, because nothing in this app tracks them: XP,
 * inspiration, temporary HP, currency, age/height/weight/eyes/skin/hair,
 * faction, allies, treasure, and the four roleplay boxes (personality
 * traits/ideals/bonds/flaws). Only "Backstory" gets non-form content — the
 * generated character intro from lib/flavor.ts, which is exactly what that
 * box is for.
 */

import { PDFDocument } from 'pdf-lib'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { computeSheet, formatModifier, type StoredCharacter } from './character.ts'
import { ALIGNMENTS } from './srd.ts'
import type { AbilityKey, SkillKey } from './srd.ts'
import { armourById, weaponById } from './equipment.ts'
import { characterIntro } from './flavor.ts'

const TEMPLATE_PATH = path.join(process.cwd(), 'assets', 'character-sheet-template.pdf')

const ABILITY_SCORE_FIELD: Record<AbilityKey, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
}
/** "DEXmod " and "CHamod" are exactly how the template spells them. */
const ABILITY_MOD_FIELD: Record<AbilityKey, string> = {
  str: 'STRmod', dex: 'DEXmod ', con: 'CONmod', int: 'INTmod', wis: 'WISmod', cha: 'CHamod',
}
const SAVE_FIELD: Record<AbilityKey, string> = {
  str: 'ST Strength', dex: 'ST Dexterity', con: 'ST Constitution',
  int: 'ST Intelligence', wis: 'ST Wisdom', cha: 'ST Charisma',
}
const SAVE_CHECK: Record<AbilityKey, string> = {
  str: 'Check Box 11', dex: 'Check Box 18', con: 'Check Box 19',
  int: 'Check Box 20', wis: 'Check Box 21', cha: 'Check Box 22',
}

const SKILL_FIELD: Record<SkillKey, string> = {
  acrobatics: 'Acrobatics', animalHandling: 'Animal', arcana: 'Arcana', athletics: 'Athletics',
  deception: 'Deception ', history: 'History ', insight: 'Insight', intimidation: 'Intimidation',
  investigation: 'Investigation ', medicine: 'Medicine', nature: 'Nature', perception: 'Perception ',
  performance: 'Performance', persuasion: 'Persuasion', religion: 'Religion',
  sleightOfHand: 'SleightofHand', stealth: 'Stealth ', survival: 'Survival',
}
const SKILL_CHECK: Record<SkillKey, string> = {
  acrobatics: 'Check Box 23', animalHandling: 'Check Box 24', arcana: 'Check Box 25', athletics: 'Check Box 26',
  deception: 'Check Box 27', history: 'Check Box 28', insight: 'Check Box 29', intimidation: 'Check Box 30',
  investigation: 'Check Box 31', medicine: 'Check Box 32', nature: 'Check Box 33', perception: 'Check Box 34',
  performance: 'Check Box 35', persuasion: 'Check Box 36', religion: 'Check Box 37',
  sleightOfHand: 'Check Box 38', stealth: 'Check Box 39', survival: 'Check Box 40',
}

const WEAPON_FIELDS = [
  { name: 'Wpn Name', bonus: 'Wpn1 AtkBonus', damage: 'Wpn1 Damage' },
  { name: 'Wpn Name 2', bonus: 'Wpn2 AtkBonus ', damage: 'Wpn2 Damage ' },
  { name: 'Wpn Name 3', bonus: 'Wpn3 AtkBonus  ', damage: 'Wpn3 Damage ' },
]

/** The spellcasting page's per-level spell-name lines, top to bottom, with the
 *  "prepared" checkbox for levels 1-9 (cantrips have none). */
const SPELL_LINES: Record<number, { spell: string; check?: string }[]> = {
  0: [
    { spell: 'Spells 1014' }, { spell: 'Spells 1016' }, { spell: 'Spells 1017' },
    { spell: 'Spells 1018' }, { spell: 'Spells 1019' }, { spell: 'Spells 1020' },
    { spell: 'Spells 1021' }, { spell: 'Spells 1022' },
  ],
  1: [
    { spell: 'Spells 1015', check: 'Check Box 251' }, { spell: 'Spells 1023', check: 'Check Box 309' },
    { spell: 'Spells 1024', check: 'Check Box 3010' }, { spell: 'Spells 1025', check: 'Check Box 3011' },
    { spell: 'Spells 1026', check: 'Check Box 3012' }, { spell: 'Spells 1027', check: 'Check Box 3013' },
    { spell: 'Spells 1028', check: 'Check Box 3014' }, { spell: 'Spells 1029', check: 'Check Box 3015' },
    { spell: 'Spells 1030', check: 'Check Box 3016' }, { spell: 'Spells 1031', check: 'Check Box 3017' },
    { spell: 'Spells 1032', check: 'Check Box 3018' }, { spell: 'Spells 1033', check: 'Check Box 3019' },
  ],
  2: [
    { spell: 'Spells 1046', check: 'Check Box 313' }, { spell: 'Spells 1034', check: 'Check Box 310' },
    { spell: 'Spells 1035', check: 'Check Box 3020' }, { spell: 'Spells 1036', check: 'Check Box 3021' },
    { spell: 'Spells 1037', check: 'Check Box 3022' }, { spell: 'Spells 1038', check: 'Check Box 3023' },
    { spell: 'Spells 1039', check: 'Check Box 3024' }, { spell: 'Spells 1040', check: 'Check Box 3025' },
    { spell: 'Spells 1041', check: 'Check Box 3026' }, { spell: 'Spells 1042', check: 'Check Box 3027' },
    { spell: 'Spells 1043', check: 'Check Box 3028' }, { spell: 'Spells 1044', check: 'Check Box 3029' },
    { spell: 'Spells 1045', check: 'Check Box 3030' },
  ],
  3: [
    { spell: 'Spells 1048', check: 'Check Box 315' }, { spell: 'Spells 1047', check: 'Check Box 314' },
    { spell: 'Spells 1049', check: 'Check Box 3031' }, { spell: 'Spells 1050', check: 'Check Box 3032' },
    { spell: 'Spells 1051', check: 'Check Box 3033' }, { spell: 'Spells 1052', check: 'Check Box 3034' },
    { spell: 'Spells 1053', check: 'Check Box 3035' }, { spell: 'Spells 1054', check: 'Check Box 3036' },
    { spell: 'Spells 1055', check: 'Check Box 3037' }, { spell: 'Spells 1056', check: 'Check Box 3038' },
    { spell: 'Spells 1057', check: 'Check Box 3039' }, { spell: 'Spells 1058', check: 'Check Box 3040' },
    { spell: 'Spells 1059', check: 'Check Box 3041' },
  ],
  4: [
    { spell: 'Spells 1061', check: 'Check Box 317' }, { spell: 'Spells 1060', check: 'Check Box 316' },
    { spell: 'Spells 1062', check: 'Check Box 3042' }, { spell: 'Spells 1063', check: 'Check Box 3043' },
    { spell: 'Spells 1064', check: 'Check Box 3044' }, { spell: 'Spells 1065', check: 'Check Box 3045' },
    { spell: 'Spells 1066', check: 'Check Box 3046' }, { spell: 'Spells 1067', check: 'Check Box 3047' },
    { spell: 'Spells 1068', check: 'Check Box 3048' }, { spell: 'Spells 1069', check: 'Check Box 3049' },
    { spell: 'Spells 1070', check: 'Check Box 3050' }, { spell: 'Spells 1071', check: 'Check Box 3051' },
    { spell: 'Spells 1072', check: 'Check Box 3052' },
  ],
  5: [
    { spell: 'Spells 1074', check: 'Check Box 319' }, { spell: 'Spells 1073', check: 'Check Box 318' },
    { spell: 'Spells 1075', check: 'Check Box 3053' }, { spell: 'Spells 1076', check: 'Check Box 3054' },
    { spell: 'Spells 1077', check: 'Check Box 3055' }, { spell: 'Spells 1078', check: 'Check Box 3056' },
    { spell: 'Spells 1079', check: 'Check Box 3057' }, { spell: 'Spells 1080', check: 'Check Box 3058' },
    { spell: 'Spells 1081', check: 'Check Box 3059' },
  ],
  6: [
    { spell: 'Spells 1083', check: 'Check Box 321' }, { spell: 'Spells 1082', check: 'Check Box 320' },
    { spell: 'Spells 1084', check: 'Check Box 3060' }, { spell: 'Spells 1085', check: 'Check Box 3061' },
    { spell: 'Spells 1086', check: 'Check Box 3062' }, { spell: 'Spells 1087', check: 'Check Box 3063' },
    { spell: 'Spells 1088', check: 'Check Box 3064' }, { spell: 'Spells 1089', check: 'Check Box 3065' },
    { spell: 'Spells 1090', check: 'Check Box 3066' },
  ],
  7: [
    { spell: 'Spells 1092', check: 'Check Box 323' }, { spell: 'Spells 1091', check: 'Check Box 322' },
    { spell: 'Spells 1093', check: 'Check Box 3067' }, { spell: 'Spells 1094', check: 'Check Box 3068' },
    { spell: 'Spells 1095', check: 'Check Box 3069' }, { spell: 'Spells 1096', check: 'Check Box 3070' },
    { spell: 'Spells 1097', check: 'Check Box 3071' }, { spell: 'Spells 1098', check: 'Check Box 3072' },
    { spell: 'Spells 1099', check: 'Check Box 3073' },
  ],
  8: [
    { spell: 'Spells 10101', check: 'Check Box 325' }, { spell: 'Spells 10100', check: 'Check Box 324' },
    { spell: 'Spells 10102', check: 'Check Box 3074' }, { spell: 'Spells 10103', check: 'Check Box 3075' },
    { spell: 'Spells 10104', check: 'Check Box 3076' }, { spell: 'Spells 10105', check: 'Check Box 3077' },
    { spell: 'Spells 10106', check: 'Check Box 3078' },
  ],
  9: [
    { spell: 'Spells 10108', check: 'Check Box 327' }, { spell: 'Spells 10107', check: 'Check Box 326' },
    { spell: 'Spells 10109', check: 'Check Box 3079' }, { spell: 'Spells 101010', check: 'Check Box 3080' },
    { spell: 'Spells 101011', check: 'Check Box 3081' }, { spell: 'Spells 101012', check: 'Check Box 3082' },
    { spell: 'Spells 101013', check: 'Check Box 3083' },
  ],
}

/** "Total" and "Expended" per spell level, 1-9 — the cantrip column has no slots. */
const SPELL_SLOT_FIELD: Record<number, { total: string }> = {
  1: { total: 'SlotsTotal 19' }, 2: { total: 'SlotsTotal 20' }, 3: { total: 'SlotsTotal 21' },
  4: { total: 'SlotsTotal 22' }, 5: { total: 'SlotsTotal 23' }, 6: { total: 'SlotsTotal 24' },
  7: { total: 'SlotsTotal 25' }, 8: { total: 'SlotsTotal 26' }, 9: { total: 'SlotsTotal 27' },
}

export async function characterSheetPdf(character: StoredCharacter): Promise<Uint8Array> {
  const sheet = computeSheet(character)
  const templateBytes = await readFile(TEMPLATE_PATH)
  const doc = await PDFDocument.load(templateBytes)
  const form = doc.getForm()

  const setText = (name: string, value: string, fontSize?: number) => {
    if (!value) return
    try {
      const field = form.getTextField(name)
      // Several fields (the paragraph boxes, the weapon row) have no font
      // size of their own — they inherit the AcroForm's default — and
      // pdf-lib's auto-sizing picks something far too large for how much
      // text actually goes in them, overflowing the box instead of
      // shrinking to fit. `setFontSize()` itself only edits an *existing*
      // /DA string, which these fields don't have, so it throws; writing
      // the /DA directly works regardless. A handful of short,
      // naturally-sized fields (ability scores, AC, modifiers) are left
      // alone — they already render correctly at their template's own size.
      if (fontSize) field.acroField.setDefaultAppearance(`/Helv ${fontSize} Tf 0 g`)
      field.setText(value)
    } catch {
      // The template's own field set — nothing to do if a name is ever wrong.
    }
  }
  const setChecked = (name: string | undefined, checked: boolean) => {
    if (!name || !checked) return
    try {
      form.getCheckBox(name).check()
    } catch {
      // Ignored, as above.
    }
  }

  const alignment = ALIGNMENTS.find((entry) => entry.id === character.alignmentId)

  // Identity
  setText('CharacterName', character.name)
  setText('CharacterName 2', character.name)
  setText('ClassLevel', `${sheet.className} ${character.level}`)
  setText('Background', sheet.backgroundName)
  setText('PlayerName', character.playerName)
  setText('Race ', sheet.raceName)
  setText('Alignment', alignment?.name ?? '')

  // Combat numbers
  setText('AC', String(sheet.armourClass))
  setText('Initiative', formatModifier(sheet.initiative))
  setText('Speed', `${sheet.speed} ft`)
  setText('ProfBonus', formatModifier(sheet.proficiencyBonus))
  setText('HPMax', String(sheet.hitPoints))
  setText('HPCurrent', String(sheet.hitPoints))
  setText('HDTotal', String(character.level))
  setText('HD', sheet.hitDice)
  setText('Passive', String(sheet.passivePerception))

  // Abilities
  for (const ability of sheet.abilities) {
    setText(ABILITY_SCORE_FIELD[ability.key], String(ability.total))
    setText(ABILITY_MOD_FIELD[ability.key], formatModifier(ability.modifier))
  }

  // Saving throws
  for (const save of sheet.savingThrows) {
    setText(SAVE_FIELD[save.key], formatModifier(save.modifier))
    setChecked(SAVE_CHECK[save.key], save.proficient)
  }

  // Skills
  for (const skill of sheet.skills) {
    setText(SKILL_FIELD[skill.key], formatModifier(skill.modifier))
    setChecked(SKILL_CHECK[skill.key], skill.proficient)
  }

  // Weapons — the sheet caps at MAX_WEAPONS (3), which is exactly what the form has rows for.
  // The damage type is abbreviated to its first letter (the usual shorthand —
  // P/S/B) since the column is too narrow for "bludgeoning" spelled out.
  sheet.attacks.slice(0, 3).forEach((attack, index) => {
    const fields = WEAPON_FIELDS[index]
    setText(fields.name, attack.name, 8)
    setText(fields.bonus, formatModifier(attack.attackBonus), 8)
    setText(fields.damage, `${attack.damage} ${attack.damageType.charAt(0).toUpperCase()}`, 8)
  })

  // Equipment
  const equipment = character.equipment
  const equipmentLines: string[] = []
  const armour = armourById(equipment?.armourId)
  if (armour) equipmentLines.push(armour.name)
  if (equipment?.shield) equipmentLines.push('Shield')
  for (const id of equipment?.weaponIds ?? []) {
    const weapon = weaponById(id)
    if (weapon) equipmentLines.push(weapon.name)
  }
  equipmentLines.push(...(equipment?.extras ?? []))
  setText('Equipment', equipmentLines.join('\n'), 9)

  // Features & traits
  const featureLines = [
    ...(sheet.features.length ? [`${sheet.className} features`, ...sheet.features] : []),
    ...(sheet.traits.length ? ['', `${sheet.raceName} traits`, ...sheet.traits] : []),
  ]
  setText('Features and Traits', featureLines.join('\n'), 9)

  // Page 2 — the one piece of generated prose, in the one box it actually fits.
  setText('Backstory', characterIntro(character), 9)

  // Page 3 — spellcasting
  if (sheet.spellcasting) {
    setText('Spellcasting Class 2', sheet.className, 10)
    setText('SpellcastingAbility 2', sheet.spellcasting.abilityName, 10)
    setText('SpellSaveDC  2', String(sheet.spellcasting.saveDc), 10)
    setText('SpellAtkBonus 2', formatModifier(sheet.spellcasting.attackBonus), 10)

    for (const slot of sheet.spellcasting.slots) {
      const fields = SPELL_SLOT_FIELD[slot.level]
      if (fields) setText(fields.total, String(slot.count))
    }

    SPELL_LINES[0].forEach((line, index) => setText(line.spell, character.cantrips?.[index] ?? '', 9))

    const prepared = sheet.spellcasting.prepared
    SPELL_LINES[1].forEach((line, index) => {
      const name = character.spells?.[index]
      if (!name) return
      setText(line.spell, name, 9)
      setChecked(line.check, prepared)
    })
  }

  form.updateFieldAppearances()
  return doc.save()
}
