/**
 * 5e rules data (2014 ruleset), enough to build a playable level 5 character.
 *
 * This is deliberately local rather than fetched. The D&D Yonder API serves the
 * same lists, but its character storage is unreliable and its response shapes
 * are undocumented, so the rules a sheet depends on live here where they cannot
 * break mid-session. The API is used for flavour — name suggestions and real
 * dice rolls — where a failure costs nothing.
 *
 * Mechanics are from the SRD. Descriptions are written for this app.
 */

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export const ABILITY_ORDER: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export const ABILITY_NAMES: Record<AbilityKey, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

/** The upstream API numbers abilities alphabetically; keep the mapping here. */
export const YONDER_ABILITY_IDS: Record<AbilityKey, number> = {
  cha: 1,
  con: 2,
  dex: 3,
  int: 4,
  str: 5,
  wis: 6,
}

export type SkillKey =
  | 'acrobatics' | 'animalHandling' | 'arcana' | 'athletics' | 'deception'
  | 'history' | 'insight' | 'intimidation' | 'investigation' | 'medicine'
  | 'nature' | 'perception' | 'performance' | 'persuasion' | 'religion'
  | 'sleightOfHand' | 'stealth' | 'survival'

export const SKILLS: Record<SkillKey, { name: string; ability: AbilityKey }> = {
  acrobatics: { name: 'Acrobatics', ability: 'dex' },
  animalHandling: { name: 'Animal Handling', ability: 'wis' },
  arcana: { name: 'Arcana', ability: 'int' },
  athletics: { name: 'Athletics', ability: 'str' },
  deception: { name: 'Deception', ability: 'cha' },
  history: { name: 'History', ability: 'int' },
  insight: { name: 'Insight', ability: 'wis' },
  intimidation: { name: 'Intimidation', ability: 'cha' },
  investigation: { name: 'Investigation', ability: 'int' },
  medicine: { name: 'Medicine', ability: 'wis' },
  nature: { name: 'Nature', ability: 'int' },
  perception: { name: 'Perception', ability: 'wis' },
  performance: { name: 'Performance', ability: 'cha' },
  persuasion: { name: 'Persuasion', ability: 'cha' },
  religion: { name: 'Religion', ability: 'int' },
  sleightOfHand: { name: 'Sleight of Hand', ability: 'dex' },
  stealth: { name: 'Stealth', ability: 'dex' },
  survival: { name: 'Survival', ability: 'wis' },
}

export const SKILL_KEYS = Object.keys(SKILLS) as SkillKey[]

/* ------------------------------------------------------------------ *
 * Races
 * ------------------------------------------------------------------ */

export type Subrace = {
  id: string
  name: string
  blurb: string
  bonuses: Partial<Record<AbilityKey, number>>
  traits: string[]
}

export type Race = {
  id: string
  name: string
  blurb: string
  bonuses: Partial<Record<AbilityKey, number>>
  speed: number
  traits: string[]
  subraces?: Subrace[]
  /** Name-generator style on the Yonder API, where one fits. */
  nameStyle?: string
}

export const RACES: Race[] = [
  {
    id: 'dwarf',
    name: 'Dwarf',
    blurb: 'Stubborn, stone-hearted and hard to knock down. Long memories, longer grudges.',
    bonuses: { con: 2 },
    speed: 25,
    nameStyle: 'dwarf',
    traits: ['Darkvision 60 ft', 'Advantage on saves against poison', 'Stonecunning'],
    subraces: [
      { id: 'hill', name: 'Hill Dwarf', blurb: 'Tougher still — extra hit points every level.', bonuses: { wis: 1 }, traits: ['+1 hit point per level'] },
      { id: 'mountain', name: 'Mountain Dwarf', blurb: 'Raised to the armour and the axe.', bonuses: { str: 2 }, traits: ['Light and medium armour proficiency'] },
    ],
  },
  {
    id: 'elf',
    name: 'Elf',
    blurb: 'Graceful, perceptive and unhurried. A century is not very long.',
    bonuses: { dex: 2 },
    speed: 30,
    nameStyle: 'elf',
    traits: ['Darkvision 60 ft', 'Keen Senses (Perception)', 'Fey Ancestry', 'Trance'],
    subraces: [
      { id: 'high', name: 'High Elf', blurb: 'Book-learned magic alongside the blade.', bonuses: { int: 1 }, traits: ['One wizard cantrip', 'Longsword and bow proficiency'] },
      { id: 'wood', name: 'Wood Elf', blurb: 'Fast, quiet, at home in the trees.', bonuses: { wis: 1 }, traits: ['Speed 35 ft', 'Mask of the Wild'] },
      { id: 'drow', name: 'Drow', blurb: 'Underdark-born, with darkness at your fingertips.', bonuses: { cha: 1 }, traits: ['Superior Darkvision 120 ft', 'Sunlight Sensitivity', 'Dancing Lights'] },
    ],
  },
  {
    id: 'halfling',
    name: 'Halfling',
    blurb: 'Small, lucky and remarkably difficult to frighten.',
    bonuses: { dex: 2 },
    speed: 25,
    nameStyle: 'halfling',
    traits: ['Lucky', 'Brave', 'Halfling Nimbleness'],
    subraces: [
      { id: 'lightfoot', name: 'Lightfoot', blurb: 'Easy to like, easier to lose sight of.', bonuses: { cha: 1 }, traits: ['Naturally Stealthy'] },
      { id: 'stout', name: 'Stout', blurb: 'Dwarf-hardy, poison-resistant.', bonuses: { con: 1 }, traits: ['Stout Resilience'] },
    ],
  },
  {
    id: 'human',
    name: 'Human',
    blurb: 'Adaptable and ambitious. Good at everything, defined by nothing.',
    bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    speed: 30,
    nameStyle: 'human',
    traits: ['+1 to every ability score', 'One extra language'],
  },
  {
    id: 'dragonborn',
    name: 'Dragonborn',
    blurb: 'Draconic blood, a breath weapon, and a strong sense of your own worth.',
    bonuses: { str: 2, cha: 1 },
    speed: 30,
    traits: ['Breath Weapon', 'Damage resistance matching your ancestry'],
  },
  {
    id: 'gnome',
    name: 'Gnome',
    blurb: 'Endlessly curious, quick-minded, hard to fool with magic.',
    bonuses: { int: 2 },
    speed: 25,
    nameStyle: 'gnome',
    traits: ['Darkvision 60 ft', 'Gnome Cunning'],
    subraces: [
      { id: 'forest', name: 'Forest Gnome', blurb: 'Illusionist, and on speaking terms with small animals.', bonuses: { dex: 1 }, traits: ['Minor Illusion cantrip', 'Speak with Small Beasts'] },
      { id: 'rock', name: 'Rock Gnome', blurb: 'Tinkerer and inventor.', bonuses: { con: 1 }, traits: ["Artificer's Lore", 'Tinker'] },
    ],
  },
  {
    id: 'half-elf',
    name: 'Half-Elf',
    blurb: 'At home everywhere and nowhere. Charming, and used to being the go-between.',
    bonuses: { cha: 2 },
    speed: 30,
    nameStyle: 'elf',
    traits: ['Darkvision 60 ft', 'Fey Ancestry', '+1 to two other abilities', 'Two extra skills'],
  },
  {
    id: 'half-orc',
    name: 'Half-Orc',
    blurb: 'Strong, blunt, and very hard to put down for good.',
    bonuses: { str: 2, con: 1 },
    speed: 30,
    nameStyle: 'orc',
    traits: ['Darkvision 60 ft', 'Relentless Endurance', 'Savage Attacks', 'Menacing (Intimidation)'],
  },
  {
    id: 'tiefling',
    name: 'Tiefling',
    blurb: 'Infernal heritage you did not ask for, and the stares that come with it.',
    bonuses: { cha: 2, int: 1 },
    speed: 30,
    nameStyle: 'tiefling',
    traits: ['Darkvision 60 ft', 'Hellish Resistance', 'Thaumaturgy cantrip'],
  },
]

/* ------------------------------------------------------------------ *
 * Classes
 * ------------------------------------------------------------------ */

export type CasterType = 'full' | 'half' | 'pact' | 'none'

export type Subclass = { id: string; name: string; blurb: string }

export type CharClass = {
  id: string
  name: string
  blurb: string
  hitDie: number
  savingThrows: AbilityKey[]
  /** Abilities that matter most, best first — used to place rolled scores. */
  primary: AbilityKey[]
  skillChoices: number
  skillList: SkillKey[]
  caster: CasterType
  /** Ability used for spell attacks and save DCs. */
  spellAbility?: AbilityKey
  subclasses: Subclass[]
  subclassLabel: string
  /** How this class is assumed to be armoured, for the AC on the sheet. */
  defense: {
    label: string
    /** base + dex (capped) + extras, or a special unarmoured rule. */
    base: number
    dexCap?: number
    addWis?: boolean
    addCon?: boolean
    shield?: boolean
  }
  levelFive: string[]
}

export const CLASSES: CharClass[] = [
  {
    id: 'barbarian',
    name: 'Barbarian',
    blurb: 'Rage, hit things, refuse to fall over.',
    hitDie: 12,
    savingThrows: ['str', 'con'],
    primary: ['str', 'con', 'dex'],
    skillChoices: 2,
    skillList: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    caster: 'none',
    subclassLabel: 'Primal Path',
    subclasses: [{ id: 'berserker', name: 'Path of the Berserker', blurb: 'Rage into a frenzy and keep swinging.' }],
    defense: { label: 'Unarmoured Defence (10 + DEX + CON)', base: 10, addCon: true },
    levelFive: ['Extra Attack', 'Fast Movement (+10 ft)', 'Rage 3/day, +2 damage'],
  },
  {
    id: 'bard',
    name: 'Bard',
    blurb: 'Talk, inspire, and quietly be good at everything.',
    hitDie: 8,
    savingThrows: ['dex', 'cha'],
    primary: ['cha', 'dex', 'con'],
    skillChoices: 3,
    skillList: SKILL_KEYS,
    caster: 'full',
    spellAbility: 'cha',
    subclassLabel: 'Bard College',
    subclasses: [{ id: 'lore', name: 'College of Lore', blurb: 'Cutting Words, and a magpie’s eye for other people’s tricks.' }],
    defense: { label: 'Leather armour (11 + DEX)', base: 11 },
    levelFive: ['Bardic Inspiration d8', 'Font of Inspiration', 'Expertise in two skills'],
  },
  {
    id: 'cleric',
    name: 'Cleric',
    blurb: 'A god has plans for you, and some of them involve a mace.',
    hitDie: 8,
    savingThrows: ['wis', 'cha'],
    primary: ['wis', 'con', 'str'],
    skillChoices: 2,
    skillList: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    caster: 'full',
    spellAbility: 'wis',
    subclassLabel: 'Divine Domain',
    subclasses: [{ id: 'life', name: 'Life Domain', blurb: 'Healing turned up to eleven, and heavy armour.' }],
    defense: { label: 'Chain mail and shield', base: 16, dexCap: 0, shield: true },
    levelFive: ['Destroy Undead (CR 1/2)', 'Channel Divinity 2/rest', '3rd-level spells'],
  },
  {
    id: 'druid',
    name: 'Druid',
    blurb: 'Nature’s will, and the option of becoming a bear about it.',
    hitDie: 8,
    savingThrows: ['int', 'wis'],
    primary: ['wis', 'con', 'dex'],
    skillChoices: 2,
    skillList: ['arcana', 'animalHandling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
    caster: 'full',
    spellAbility: 'wis',
    subclassLabel: 'Druid Circle',
    subclasses: [{ id: 'land', name: 'Circle of the Land', blurb: 'Extra spells drawn from your home terrain.' }],
    defense: { label: 'Leather armour and shield (11 + DEX + 2)', base: 11, shield: true },
    levelFive: ['Wild Shape (CR 1/2)', '3rd-level spells'],
  },
  {
    id: 'fighter',
    name: 'Fighter',
    blurb: 'The best in the room at the actual fighting part.',
    hitDie: 10,
    savingThrows: ['str', 'con'],
    primary: ['str', 'con', 'dex'],
    skillChoices: 2,
    skillList: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
    caster: 'none',
    subclassLabel: 'Martial Archetype',
    subclasses: [{ id: 'champion', name: 'Champion', blurb: 'Crits on 19-20 and no fuss about it.' }],
    defense: { label: 'Chain mail and shield', base: 16, dexCap: 0, shield: true },
    levelFive: ['Extra Attack', 'Action Surge', 'Second Wind'],
  },
  {
    id: 'monk',
    name: 'Monk',
    blurb: 'Fists, focus, and moving faster than seems reasonable.',
    hitDie: 8,
    savingThrows: ['str', 'dex'],
    primary: ['dex', 'wis', 'con'],
    skillChoices: 2,
    skillList: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    caster: 'none',
    subclassLabel: 'Monastic Tradition',
    subclasses: [{ id: 'openHand', name: 'Way of the Open Hand', blurb: 'Knock them down, push them back, stop them healing.' }],
    defense: { label: 'Unarmoured Defence (10 + DEX + WIS)', base: 10, addWis: true },
    levelFive: ['Extra Attack', 'Stunning Strike', 'Martial Arts d6', 'Unarmoured Movement +10 ft'],
  },
  {
    id: 'paladin',
    name: 'Paladin',
    blurb: 'An oath, a big sword, and an aura that makes everyone braver.',
    hitDie: 10,
    savingThrows: ['wis', 'cha'],
    primary: ['str', 'cha', 'con'],
    skillChoices: 2,
    skillList: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    caster: 'half',
    spellAbility: 'cha',
    subclassLabel: 'Sacred Oath',
    subclasses: [{ id: 'devotion', name: 'Oath of Devotion', blurb: 'The knight in shining armour, played straight.' }],
    defense: { label: 'Chain mail and shield', base: 16, dexCap: 0, shield: true },
    levelFive: ['Extra Attack', 'Divine Smite', 'Aura of Protection (+CHA to saves nearby)'],
  },
  {
    id: 'ranger',
    name: 'Ranger',
    blurb: 'Tracker, archer, and the one who knows what that noise was.',
    hitDie: 10,
    savingThrows: ['str', 'dex'],
    primary: ['dex', 'wis', 'con'],
    skillChoices: 3,
    skillList: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
    caster: 'half',
    spellAbility: 'wis',
    subclassLabel: 'Ranger Archetype',
    subclasses: [{ id: 'hunter', name: 'Hunter', blurb: 'Specialised against whatever you fight most.' }],
    defense: { label: 'Studded leather (12 + DEX)', base: 12 },
    levelFive: ['Extra Attack', "Hunter's Mark", 'Primeval Awareness'],
  },
  {
    id: 'rogue',
    name: 'Rogue',
    blurb: 'Sneak Attack, and an answer for every lock and every guard.',
    hitDie: 8,
    savingThrows: ['dex', 'int'],
    primary: ['dex', 'con', 'cha'],
    skillChoices: 4,
    skillList: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleightOfHand', 'stealth'],
    caster: 'none',
    subclassLabel: 'Roguish Archetype',
    subclasses: [{ id: 'thief', name: 'Thief', blurb: 'Fast hands, fast climbing, second-storey work.' }],
    defense: { label: 'Studded leather (12 + DEX)', base: 12 },
    levelFive: ['Sneak Attack 3d6', 'Uncanny Dodge', 'Cunning Action', 'Expertise in two skills'],
  },
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    blurb: 'Magic in the blood, bent to your will on the fly.',
    hitDie: 6,
    savingThrows: ['con', 'cha'],
    primary: ['cha', 'con', 'dex'],
    skillChoices: 2,
    skillList: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
    caster: 'full',
    spellAbility: 'cha',
    subclassLabel: 'Sorcerous Origin',
    subclasses: [{ id: 'draconic', name: 'Draconic Bloodline', blurb: 'A dragon somewhere back there; tougher skin because of it.' }],
    defense: { label: 'Unarmoured (10 + DEX)', base: 10 },
    levelFive: ['Metamagic', 'Sorcery Points', '3rd-level spells'],
  },
  {
    id: 'warlock',
    name: 'Warlock',
    blurb: 'You made a deal. It is going fine, mostly.',
    hitDie: 8,
    savingThrows: ['wis', 'cha'],
    primary: ['cha', 'con', 'dex'],
    skillChoices: 2,
    skillList: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
    caster: 'pact',
    spellAbility: 'cha',
    subclassLabel: 'Otherworldly Patron',
    subclasses: [{ id: 'fiend', name: 'The Fiend', blurb: 'Temporary hit points every time something dies near you.' }],
    defense: { label: 'Leather armour (11 + DEX)', base: 11 },
    levelFive: ['Eldritch Invocations', 'Pact Boon', 'Slots recharge on a short rest'],
  },
  {
    id: 'wizard',
    name: 'Wizard',
    blurb: 'You wrote it down, so now you can do it.',
    hitDie: 6,
    savingThrows: ['int', 'wis'],
    primary: ['int', 'con', 'dex'],
    skillChoices: 2,
    skillList: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
    caster: 'full',
    spellAbility: 'int',
    subclassLabel: 'Arcane Tradition',
    subclasses: [{ id: 'evocation', name: 'School of Evocation', blurb: 'Fireballs that spare your friends.' }],
    defense: { label: 'Unarmoured (10 + DEX), Mage Armour 13 + DEX', base: 10 },
    levelFive: ['Arcane Recovery', '3rd-level spells (Fireball, Counterspell)'],
  },
]

/* ------------------------------------------------------------------ *
 * Backgrounds and alignment
 * ------------------------------------------------------------------ */

export type Background = {
  id: string
  name: string
  blurb: string
  skills: SkillKey[]
  feature: string
}

export const BACKGROUNDS: Background[] = [
  { id: 'acolyte', name: 'Acolyte', blurb: 'You served in a temple and know its rites by heart.', skills: ['insight', 'religion'], feature: 'Shelter of the Faithful' },
  { id: 'charlatan', name: 'Charlatan', blurb: 'You have always been able to talk people out of their money.', skills: ['deception', 'sleightOfHand'], feature: 'False Identity' },
  { id: 'criminal', name: 'Criminal', blurb: 'You know who to ask and which door is unlocked.', skills: ['deception', 'stealth'], feature: 'Criminal Contact' },
  { id: 'entertainer', name: 'Entertainer', blurb: 'You have held a room and been thrown out of one.', skills: ['acrobatics', 'performance'], feature: 'By Popular Demand' },
  { id: 'folk-hero', name: 'Folk Hero', blurb: 'You stood up to someone powerful and people still tell the story.', skills: ['animalHandling', 'survival'], feature: 'Rustic Hospitality' },
  { id: 'guild-artisan', name: 'Guild Artisan', blurb: 'You made things well enough that the guild took you in.', skills: ['insight', 'persuasion'], feature: 'Guild Membership' },
  { id: 'hermit', name: 'Hermit', blurb: 'You spent a long time alone and came back with something.', skills: ['medicine', 'religion'], feature: 'Discovery' },
  { id: 'noble', name: 'Noble', blurb: 'Doors open. People bow. Some of them mean it.', skills: ['history', 'persuasion'], feature: 'Position of Privilege' },
  { id: 'outlander', name: 'Outlander', blurb: 'You grew up far from any city and it shows.', skills: ['athletics', 'survival'], feature: 'Wanderer' },
  { id: 'sage', name: 'Sage', blurb: 'If you do not know it, you know which book has it.', skills: ['arcana', 'history'], feature: 'Researcher' },
  { id: 'sailor', name: 'Sailor', blurb: 'You have crossed open water and the scars to show for it.', skills: ['athletics', 'perception'], feature: "Ship's Passage" },
  { id: 'soldier', name: 'Soldier', blurb: 'You served, you fought, and you still sleep lightly.', skills: ['athletics', 'intimidation'], feature: 'Military Rank' },
  { id: 'urchin', name: 'Urchin', blurb: 'You raised yourself on city streets and learned every shortcut.', skills: ['sleightOfHand', 'stealth'], feature: 'City Secrets' },
]

export const ALIGNMENTS = [
  { id: 'lg', name: 'Lawful Good', blurb: 'The right thing, by the rules.' },
  { id: 'ng', name: 'Neutral Good', blurb: 'The right thing, whatever the rules say.' },
  { id: 'cg', name: 'Chaotic Good', blurb: 'The right thing, on your own terms.' },
  { id: 'ln', name: 'Lawful Neutral', blurb: 'The order matters more than the outcome.' },
  { id: 'n', name: 'True Neutral', blurb: 'Balance, or simply not your problem.' },
  { id: 'cn', name: 'Chaotic Neutral', blurb: 'Your own freedom, first and last.' },
  { id: 'le', name: 'Lawful Evil', blurb: 'Cruelty with paperwork.' },
  { id: 'ne', name: 'Neutral Evil', blurb: 'Whatever gets you ahead.' },
  { id: 'ce', name: 'Chaotic Evil', blurb: 'Destruction, gleefully.' },
]

/* ------------------------------------------------------------------ *
 * Level tables
 * ------------------------------------------------------------------ */

export function proficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2
}

/** Spell slots by caster type at a given level. Index 0 is 1st-level slots. */
const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2],
  6: [4, 3, 3], 7: [4, 3, 3, 1], 8: [4, 3, 3, 2], 9: [4, 3, 3, 3, 1], 10: [4, 3, 3, 3, 2],
}
const HALF_CASTER_SLOTS: Record<number, number[]> = {
  1: [], 2: [2], 3: [3], 4: [3], 5: [4, 2], 6: [4, 2], 7: [4, 3], 8: [4, 3], 9: [4, 3, 2], 10: [4, 3, 2],
}
/** Warlocks get a small number of slots, all at the highest level they know. */
const PACT_SLOTS: Record<number, { count: number; level: number }> = {
  1: { count: 1, level: 1 }, 2: { count: 2, level: 1 }, 3: { count: 2, level: 2 },
  4: { count: 2, level: 2 }, 5: { count: 2, level: 3 }, 6: { count: 2, level: 3 },
  7: { count: 2, level: 4 }, 8: { count: 2, level: 4 }, 9: { count: 2, level: 5 }, 10: { count: 2, level: 5 },
}

export function spellSlots(caster: CasterType, level: number): { level: number; count: number }[] {
  if (caster === 'none') return []
  if (caster === 'pact') {
    const pact = PACT_SLOTS[Math.min(level, 10)]
    return pact ? [{ level: pact.level, count: pact.count }] : []
  }
  const table = caster === 'full' ? FULL_CASTER_SLOTS : HALF_CASTER_SLOTS
  const row = table[Math.min(level, 10)] ?? []
  return row.map((count, index) => ({ level: index + 1, count })).filter((slot) => slot.count > 0)
}

/** Cantrips known at a level, by class. */
export function cantripsKnown(classId: string, level: number): number {
  const byClass: Record<string, number[]> = {
    // index = level - 1
    bard: [2, 2, 2, 3, 3], cleric: [3, 3, 3, 4, 4], druid: [2, 2, 2, 3, 3],
    sorcerer: [4, 4, 4, 5, 5], warlock: [2, 2, 2, 3, 3], wizard: [3, 3, 3, 4, 4],
  }
  const row = byClass[classId]
  if (!row) return 0
  return row[Math.min(level, row.length) - 1] ?? 0
}

/** Spells known or prepared at a level. Prepared casters depend on ability. */
export function spellsKnown(
  classId: string,
  level: number,
  abilityModifier: number,
): { count: number; prepared: boolean } {
  // Prepared casters: modifier + level (or half level for half casters).
  if (classId === 'cleric' || classId === 'druid') {
    return { count: Math.max(1, abilityModifier + level), prepared: true }
  }
  if (classId === 'paladin') {
    return { count: Math.max(1, abilityModifier + Math.floor(level / 2)), prepared: true }
  }
  if (classId === 'wizard') {
    // A wizard prepares INT + level, chosen from a larger spellbook.
    return { count: Math.max(1, abilityModifier + level), prepared: true }
  }
  const known: Record<string, number[]> = {
    bard: [4, 5, 6, 7, 8], ranger: [0, 2, 3, 3, 4],
    sorcerer: [2, 3, 4, 5, 6], warlock: [2, 3, 4, 5, 6],
  }
  const row = known[classId]
  if (!row) return { count: 0, prepared: false }
  return { count: row[Math.min(level, row.length) - 1] ?? 0, prepared: false }
}

/**
 * Class ids on the Yonder API, used only for its spell endpoints.
 *
 * The docs give one example — "such as 12 for wizard" — and wizard is twelfth
 * alphabetically, which matches how that API numbers abilities. So the ordering
 * is alphabetical. Treated as a guess: a spell lookup that comes back empty
 * falls back to typing spells in by hand.
 */
export const YONDER_CLASS_IDS: Record<string, number> = {
  barbarian: 1, bard: 2, cleric: 3, druid: 4, fighter: 5, monk: 6,
  paladin: 7, ranger: 8, rogue: 9, sorcerer: 10, warlock: 11, wizard: 12,
}

/** Spells in a wizard's spellbook: six at first level, two more each level. */
export function spellbookSize(level: number): number {
  return 6 + (level - 1) * 2
}

export const raceById = (id: string) => RACES.find((race) => race.id === id)
export const classById = (id: string) => CLASSES.find((entry) => entry.id === id)
export const backgroundById = (id: string) => BACKGROUNDS.find((entry) => entry.id === id)
