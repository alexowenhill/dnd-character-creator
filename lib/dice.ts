/**
 * Dice.
 *
 * Rolls go through the D&D Yonder API when it is configured and answering,
 * because those rolls are stored server-side against a guid and are therefore
 * harder to quietly re-roll — a nice property for stats the whole table has to
 * live with. When it is not available we roll locally with the platform CSPRNG,
 * and say which happened so nobody has to wonder.
 */

import { randomInt } from 'node:crypto'
import { yonderFetch } from './yonder.ts'
import { yonderTokenResult } from './yonder-account.ts'

export type AbilityRoll = {
  /** The four dice, highest first. */
  dice: number[]
  /** Best three of four, the usual way to roll a 5e ability score. */
  total: number
  /** Yonder's roll guid, when the roll came from there. */
  guid?: string
}

export type RollSet = {
  rolls: AbilityRoll[]
  source: 'yonder' | 'local'
  /** Why Yonder was skipped, when source is 'local'. */
  reason?: string
}

function bestThreeOfFour(values: number[]): number {
  return [...values].sort((a, b) => b - a).slice(0, 3).reduce((sum, value) => sum + value, 0)
}

function rollLocally(): AbilityRoll {
  const dice = Array.from({ length: 4 }, () => randomInt(1, 7))
  return { dice: [...dice].sort((a, b) => b - a), total: bestThreeOfFour(dice) }
}

/** Pull the raw die values out of a Yonder dice response, whatever the dice. */
function readYonderDiceValues(payload: unknown): number[] | null {
  if (!payload || typeof payload !== 'object') return null
  const obj = payload as Record<string, unknown>

  const values: number[] = []
  const rolls = obj.rolls
  if (rolls && typeof rolls === 'object') {
    for (const set of Object.values(rolls as Record<string, unknown>)) {
      if (Array.isArray(set)) {
        for (const value of set) if (typeof value === 'number') values.push(value)
      }
    }
  }
  return values.length ? values : null
}

/** Read a 4d6 roll out of a Yonder dice response. */
function readYonderRoll(payload: unknown): AbilityRoll | null {
  const values = readYonderDiceValues(payload)
  if (!values || values.length < 3) return null
  const guid = (payload as Record<string, unknown>).guid
  return {
    dice: [...values].sort((a, b) => b - a),
    total: bestThreeOfFour(values),
    guid: typeof guid === 'string' ? guid : undefined,
  }
}

/** Six ability rolls of 4d6-drop-lowest. */
export async function rollAbilities(): Promise<RollSet> {
  const { token, reason } = await yonderTokenResult()

  if (token) {
    try {
      const results = await Promise.all(
        Array.from({ length: 6 }, () =>
          yonderFetch('/api/game/dice', { method: 'POST', token, json: { dice: { d6: 4 } } }),
        ),
      )
      const rolls = results
        .map((result) => (result.ok ? readYonderRoll(result.body) : null))
        .filter((roll): roll is AbilityRoll => roll !== null)

      // All six or none — a half-Yonder, half-local set would be confusing.
      if (rolls.length === 6) return { rolls, source: 'yonder' }
      return {
        rolls: Array.from({ length: 6 }, rollLocally),
        source: 'local',
        reason: `Yonder returned ${rolls.length}/6 usable rolls`,
      }
    } catch (err) {
      return {
        rolls: Array.from({ length: 6 }, rollLocally),
        source: 'local',
        reason: `Yonder request failed: ${(err as Error).message}`,
      }
    }
  }

  return { rolls: Array.from({ length: 6 }, rollLocally), source: 'local', reason }
}

export type DieRoll = {
  value: number
  source: 'yonder' | 'local'
  reason?: string
}

/**
 * A single d20 for an ad-hoc ability or skill check at the table — clicking a
 * number on the sheet, not part of the stored character. Not worth the
 * guid-tracking rigour ability rolls get; it just prefers Yonder when it is
 * answering and falls back to the platform CSPRNG otherwise.
 */
export async function rollD20(): Promise<DieRoll> {
  const { token, reason } = await yonderTokenResult()

  if (token) {
    try {
      const result = await yonderFetch('/api/game/dice', { method: 'POST', token, json: { dice: { d20: 1 } } })
      const values = result.ok ? readYonderDiceValues(result.body) : null
      if (values?.length) return { value: values[0], source: 'yonder' }
      return { value: randomInt(1, 21), source: 'local', reason: 'Yonder returned no usable roll' }
    } catch (err) {
      return { value: randomInt(1, 21), source: 'local', reason: `Yonder request failed: ${(err as Error).message}` }
    }
  }

  return { value: randomInt(1, 21), source: 'local', reason }
}
