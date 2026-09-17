/**
 * Armour, weapons and starter kits.
 *
 * Local, like the rest of the rules. The Yonder API has a good item catalogue
 * and it is used for browsing extra gear, but armour class depends on this, and
 * two things make its numbers unsafe to rely on: its starting-equipment endpoint
 * is keyed to a character stored on their side (ours are not), and its own AC
 * calculation ignores the dexterity cap that medium and heavy armour impose.
 */

import type { AbilityKey } from './srd.ts'

export type ArmourCategory = 'light' | 'medium' | 'heavy'

export type Armour = {
  id: string
  name: string
  category: ArmourCategory
  baseAc: number
  /** Strength score required, below which you move 10 ft slower. */
  strengthMin?: number
  stealthDisadvantage?: boolean
  cost: string
}

/** Dexterity added to AC, by armour category. */
export function dexAllowance(category: ArmourCategory, dexModifier: number): number {
  if (category === 'light') return dexModifier
  if (category === 'medium') return Math.min(dexModifier, 2)
  return 0
}

export const ARMOURS: Armour[] = [
  { id: 'padded', name: 'Padded armour', category: 'light', baseAc: 11, stealthDisadvantage: true, cost: '5 gp' },
  { id: 'leather', name: 'Leather armour', category: 'light', baseAc: 11, cost: '10 gp' },
  { id: 'studded', name: 'Studded leather', category: 'light', baseAc: 12, cost: '45 gp' },
  { id: 'hide', name: 'Hide armour', category: 'medium', baseAc: 12, cost: '10 gp' },
  { id: 'chain-shirt', name: 'Chain shirt', category: 'medium', baseAc: 13, cost: '50 gp' },
  { id: 'scale', name: 'Scale mail', category: 'medium', baseAc: 14, stealthDisadvantage: true, cost: '50 gp' },
  { id: 'breastplate', name: 'Breastplate', category: 'medium', baseAc: 14, cost: '400 gp' },
  { id: 'half-plate', name: 'Half plate', category: 'medium', baseAc: 15, stealthDisadvantage: true, cost: '750 gp' },
  { id: 'ring', name: 'Ring mail', category: 'heavy', baseAc: 14, stealthDisadvantage: true, cost: '30 gp' },
  { id: 'chain-mail', name: 'Chain mail', category: 'heavy', baseAc: 16, strengthMin: 13, stealthDisadvantage: true, cost: '75 gp' },
  { id: 'splint', name: 'Splint armour', category: 'heavy', baseAc: 17, strengthMin: 15, stealthDisadvantage: true, cost: '200 gp' },
  { id: 'plate', name: 'Plate armour', category: 'heavy', baseAc: 18, strengthMin: 15, stealthDisadvantage: true, cost: '1,500 gp' },
]

export const SHIELD_BONUS = 2

export type Weapon = {
  id: string
  name: string
  kind: 'simple' | 'martial'
  damage: string
  damageType: string
  /** Finesse weapons may use dexterity; ranged always do. */
  finesse?: boolean
  ranged?: boolean
  versatile?: string
  thrown?: boolean
  cost: string
}

export const WEAPONS: Weapon[] = [
  // Simple melee
  { id: 'club', name: 'Club', kind: 'simple', damage: '1d4', damageType: 'bludgeoning', cost: '1 sp' },
  { id: 'dagger', name: 'Dagger', kind: 'simple', damage: '1d4', damageType: 'piercing', finesse: true, thrown: true, cost: '2 gp' },
  { id: 'handaxe', name: 'Handaxe', kind: 'simple', damage: '1d6', damageType: 'slashing', thrown: true, cost: '5 gp' },
  { id: 'mace', name: 'Mace', kind: 'simple', damage: '1d6', damageType: 'bludgeoning', cost: '5 gp' },
  { id: 'quarterstaff', name: 'Quarterstaff', kind: 'simple', damage: '1d6', damageType: 'bludgeoning', versatile: '1d8', cost: '2 gp' },
  { id: 'spear', name: 'Spear', kind: 'simple', damage: '1d6', damageType: 'piercing', versatile: '1d8', thrown: true, cost: '1 gp' },
  // Simple ranged
  { id: 'light-crossbow', name: 'Light crossbow', kind: 'simple', damage: '1d8', damageType: 'piercing', ranged: true, cost: '25 gp' },
  { id: 'shortbow', name: 'Shortbow', kind: 'simple', damage: '1d6', damageType: 'piercing', ranged: true, cost: '25 gp' },
  { id: 'sling', name: 'Sling', kind: 'simple', damage: '1d4', damageType: 'bludgeoning', ranged: true, cost: '1 sp' },
  // Martial melee
  { id: 'battleaxe', name: 'Battleaxe', kind: 'martial', damage: '1d8', damageType: 'slashing', versatile: '1d10', cost: '10 gp' },
  { id: 'greataxe', name: 'Greataxe', kind: 'martial', damage: '1d12', damageType: 'slashing', cost: '30 gp' },
  { id: 'greatsword', name: 'Greatsword', kind: 'martial', damage: '2d6', damageType: 'slashing', cost: '50 gp' },
  { id: 'longsword', name: 'Longsword', kind: 'martial', damage: '1d8', damageType: 'slashing', versatile: '1d10', cost: '15 gp' },
  { id: 'maul', name: 'Maul', kind: 'martial', damage: '2d6', damageType: 'bludgeoning', cost: '10 gp' },
  { id: 'rapier', name: 'Rapier', kind: 'martial', damage: '1d8', damageType: 'piercing', finesse: true, cost: '25 gp' },
  { id: 'scimitar', name: 'Scimitar', kind: 'martial', damage: '1d6', damageType: 'slashing', finesse: true, cost: '25 gp' },
  { id: 'shortsword', name: 'Shortsword', kind: 'martial', damage: '1d6', damageType: 'piercing', finesse: true, cost: '10 gp' },
  { id: 'warhammer', name: 'Warhammer', kind: 'martial', damage: '1d8', damageType: 'bludgeoning', versatile: '1d10', cost: '15 gp' },
  // Martial ranged
  { id: 'longbow', name: 'Longbow', kind: 'martial', damage: '1d8', damageType: 'piercing', ranged: true, cost: '50 gp' },
  { id: 'heavy-crossbow', name: 'Heavy crossbow', kind: 'martial', damage: '1d10', damageType: 'piercing', ranged: true, cost: '50 gp' },
]

export type StoredEquipment = {
  armourId?: string
  shield?: boolean
  weaponIds?: string[]
  /** Anything else, including items browsed from the Yonder catalogue. */
  extras?: string[]
}

/** Nobody straps on an armoury. Covers every starter kit, which top out at three. */
export const MAX_WEAPONS = 3

/**
 * A sensible opening kit per class, so nobody has to shop before they can play.
 * Offered as a default, not imposed.
 */
export const STARTER_KITS: Record<string, StoredEquipment & { label: string }> = {
  // No armour: a barbarian's Unarmoured Defence (10 + DEX + CON) beats hide,
  // and the class starts without armour by the rules anyway.
  barbarian: { label: 'Greataxe, no armour', weaponIds: ['greataxe', 'handaxe'], extras: ["Explorer's pack", '4 javelins'] },
  bard: { label: 'Rapier and leather', armourId: 'leather', weaponIds: ['rapier', 'dagger'], extras: ["Entertainer's pack", 'Lute'] },
  cleric: { label: 'Mace, scale mail and shield', armourId: 'scale', shield: true, weaponIds: ['mace'], extras: ["Priest's pack", 'Holy symbol'] },
  druid: { label: 'Leather, shield and a spear', armourId: 'leather', shield: true, weaponIds: ['spear'], extras: ["Explorer's pack", 'Druidic focus'] },
  fighter: { label: 'Chain mail, longsword and shield', armourId: 'chain-mail', shield: true, weaponIds: ['longsword'], extras: ["Dungeoneer's pack", 'Light crossbow'] },
  monk: { label: 'Shortsword, no armour', weaponIds: ['shortsword'], extras: ["Explorer's pack", '10 darts'] },
  paladin: { label: 'Chain mail, longsword and shield', armourId: 'chain-mail', shield: true, weaponIds: ['longsword'], extras: ["Priest's pack", 'Holy symbol', '5 javelins'] },
  ranger: { label: 'Studded leather, two shortswords and a longbow', armourId: 'studded', weaponIds: ['shortsword', 'longbow'], extras: ["Explorer's pack", 'Quiver of 20 arrows'] },
  rogue: { label: 'Leather, rapier and shortbow', armourId: 'leather', weaponIds: ['rapier', 'dagger', 'shortbow'], extras: ["Burglar's pack", "Thieves' tools"] },
  sorcerer: { label: 'Light crossbow and daggers', weaponIds: ['light-crossbow', 'dagger'], extras: ["Explorer's pack", 'Arcane focus'] },
  warlock: { label: 'Leather, light crossbow and dagger', armourId: 'leather', weaponIds: ['light-crossbow', 'dagger'], extras: ["Scholar's pack", 'Arcane focus'] },
  wizard: { label: 'Quarterstaff and a spellbook', weaponIds: ['quarterstaff', 'dagger'], extras: ["Scholar's pack", 'Spellbook', 'Arcane focus'] },
}

export const armourById = (id?: string) => ARMOURS.find((entry) => entry.id === id)
export const weaponById = (id: string) => WEAPONS.find((entry) => entry.id === id)

/** Which ability a weapon attacks with: finesse and ranged may use dexterity. */
export function attackAbility(weapon: Weapon, str: number, dex: number): AbilityKey {
  if (weapon.ranged) return 'dex'
  if (weapon.finesse) return dex > str ? 'dex' : 'str'
  return 'str'
}
