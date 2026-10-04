import { describe, expect, it } from 'vitest'

import {
  ALL_CHALLENGES_COMPLETE_MULT,
  BASE_SHIFT_POWER,
  CHALLENGES,
  CHALLENGE_TIME_TIERS,
  challengeRewardEffects,
  challengeTimeTierMult,
  getChallengeById,
  isAllChallengesComplete
} from './challenges'
import { Decimal } from '../core/math'
import { TIER_IDENTITIES } from './dimension_identity'
import type {
  ChallengeDef,
  ChallengeModifiers,
  ChallengeRewardEffects
} from './challenges'

type NumericModifierKey = Exclude<
  keyof ChallengeModifiers,
  'autobuyersDisabled' | 'oddTiersOnly'
>

const BOOLEAN_MODIFIER_KEYS = ['autobuyersDisabled', 'oddTiersOnly'] as const

/**
 * Legal range for every numeric modifier, taken from the inline doc comments in
 * `ChallengeModifiers` (challenges.ts). Values outside these bands are pacing
 * bugs: e.g. `costInflationOnBuy` below 1 would be a *discount*, not inflation.
 */
const NUMERIC_MODIFIER_RANGES: Record<NumericModifierKey, [number, number]> = {
  productionHaltOnBuySec: [0, 60],
  dim1ExpoGrowthPerSec: [0, 1],
  dim1BasePowerMult: [0, 1],
  costInflationOnBuy: [1, 10],
  tickspeedBaseMult: [0, 1],
  tickspeedBuyMultScale: [0, 1],
  maxDimensions: [1, 8],
  notificationDoomRatePerSec: [0, 1]
}

const KNOWN_MODIFIER_KEYS: ReadonlySet<string> = new Set<string>([
  ...BOOLEAN_MODIFIER_KEYS,
  ...Object.keys(NUMERIC_MODIFIER_RANGES)
])

/** Which field of `ChallengeRewardEffects` each reward kind must move. */
const REWARD_EFFECT_FIELD: Record<string, keyof ChallengeRewardEffects> = {
  dim_mult: 'dimMult',
  even_dim_mult: 'evenDimMult',
  click_mult: 'clickMult',
  tickspeed_effect: 'tickspeedEffectMult',
  dim_cost_discount: 'dimCostMult',
  tickspeed_cost_discount: 'tickspeedCostMult',
  shift_power: 'shiftPower',
  sp_gain: 'spMult'
}

/** Legal range per permanent reward kind. Discounts are 0..1, buffs are >= 1. */
const REWARD_VALUE_RANGES: Record<string, [number, number]> = {
  dim_mult: [1, 10],
  even_dim_mult: [1, 10],
  click_mult: [1, 10],
  tickspeed_effect: [1, 10],
  dim_cost_discount: [0, 1],
  tickspeed_cost_discount: [0, 1],
  sp_gain: [1, 10],
  shift_power: [BASE_SHIFT_POWER, 10]
}

const ALL_IDS: readonly string[] = CHALLENGES.map((c) => c.id)

function identityEffects(): ChallengeRewardEffects {
  return {
    dimMult: 1,
    evenDimMult: 1,
    clickMult: 1,
    tickspeedEffectMult: 1,
    dimCostMult: 1,
    tickspeedCostMult: 1,
    shiftPower: BASE_SHIFT_POWER,
    spMult: 1
  }
}

function timesWhere(total: number): Record<string, number> {
  const map: Record<string, number> = {}
  for (const id of ALL_IDS) map[id] = 0
  map[ALL_IDS[0]] = total
  return map
}

/** Reference implementation derived from the exported tier table. */
function tierMultFromTable(total: number): number {
  for (const tier of CHALLENGE_TIME_TIERS) {
    if (total < tier.totalSec) return tier.mult
  }
  return 1
}

describe('challenge registry integrity', () => {
  it('has unique, non-empty ids', () => {
    const seen = new Set<string>()
    for (const c of CHALLENGES) {
      expect(typeof c.id).toBe('string')
      expect(c.id.trim()).not.toBe('')
      expect(seen.has(c.id)).toBe(false)
      seen.add(c.id)
    }
    expect(seen.size).toBe(CHALLENGES.length)
    expect(seen.size).toBeGreaterThan(0)
  })

  it('orders challenges 1..N in declaration order', () => {
    CHALLENGES.forEach((def: ChallengeDef, index: number) => {
      expect(Number.isInteger(def.order)).toBe(true)
      expect(def.order).toBe(index + 1)
    })
  })

  it('gives each challenge an ascending difficulty curve', () => {
    let prev = new Decimal(0)
    for (const def of CHALLENGES) {
      const goal = new Decimal(def.goalMatter)
      expect(goal.isNan()).toBe(false)
      expect(Number.isNaN(goal.mag)).toBe(false)
      expect(goal.sign).toBe(1)
      expect(goal.gt(prev)).toBe(true)
      prev = goal
    }
  })

  it('gives every challenge non-empty player-facing copy', () => {
    for (const def of CHALLENGES) {
      expect(def.name.trim()).not.toBe('')
      expect(def.flavor.trim()).not.toBe('')
      expect(def.ruleDesc.trim()).not.toBe('')
      expect(def.rewardDesc.trim()).not.toBe('')
      expect(def.icon.trim()).not.toBe('')
    }
  })

  it('keeps every modifier inside its documented legal range', () => {
    for (const def of CHALLENGES) {
      const entries = Object.entries(def.modifiers) as Array<
        [string, boolean | number]
      >
      expect(entries.length).toBeGreaterThan(0)
      for (const [key, value] of entries) {
        expect(KNOWN_MODIFIER_KEYS.has(key)).toBe(true)
        if ((BOOLEAN_MODIFIER_KEYS as readonly string[]).includes(key)) {
          expect(typeof value).toBe('boolean')
          continue
        }
        const range = NUMERIC_MODIFIER_RANGES[key as NumericModifierKey]
        expect(range).toBeDefined()
        expect(typeof value).toBe('number')
        const n = value as number
        expect(Number.isFinite(n)).toBe(true)
        expect(n).toBeGreaterThanOrEqual(range[0])
        expect(n).toBeLessThanOrEqual(range[1])
      }
    }
  })

  it('never caps dimensions above the declared tier count', () => {
    const tierCount = TIER_IDENTITIES.length
    for (const def of CHALLENGES) {
      const cap = def.modifiers.maxDimensions
      if (cap !== undefined) expect(cap).toBeLessThanOrEqual(tierCount)
    }
  })

  it('uses distinct, well-ranged permanent rewards', () => {
    const kinds = CHALLENGES.map((c) => c.reward.kind)
    expect(new Set(kinds).size).toBe(kinds.length)
    for (const def of CHALLENGES) {
      const range = REWARD_VALUE_RANGES[def.reward.kind]
      expect(range).toBeDefined()
      expect(Number.isFinite(def.reward.value)).toBe(true)
      expect(def.reward.value).toBeGreaterThanOrEqual(range[0])
      expect(def.reward.value).toBeLessThanOrEqual(range[1])
    }
  })

  it('never asks a player to earn a harder unlock later in the ladder', () => {
    // c1..c8 gate on 1,1,1,1,3,3,5,5 singularities — must stay non-decreasing.
    let previous = 0
    for (const def of CHALLENGES) {
      const req = def.unlock
      expect(req).toBeDefined()
      if (!req || req.kind !== 'singularities') continue
      expect(req.count).toBeGreaterThanOrEqual(previous)
      previous = req.count
    }
    expect(previous).toBeGreaterThan(0)
  })

  it('resolves known ids and nothing else', () => {
    for (const def of CHALLENGES) {
      expect(getChallengeById(def.id)).toBe(def)
    }
    expect(getChallengeById('c99')).toBeUndefined()
    expect(getChallengeById('')).toBeUndefined()
  })

  it('gates on isAllChallengesComplete', () => {
    expect(isAllChallengesComplete([])).toBe(false)
    expect(isAllChallengesComplete(ALL_IDS.slice(0, -1))).toBe(false)
    expect(isAllChallengesComplete([...ALL_IDS, 'c99'])).toBe(true)
    expect(isAllChallengesComplete(ALL_IDS)).toBe(true)
  })
})

describe('challengeRewardEffects', () => {
  it('is the identity baseline with nothing completed', () => {
    expect(challengeRewardEffects([])).toEqual(identityEffects())
  })

  it('ignores unknown ids', () => {
    expect(challengeRewardEffects(['nope', 'c99'])).toEqual(identityEffects())
  })

  it('is immune to duplicate ids', () => {
    expect(challengeRewardEffects(['c1', 'c1', 'c2'])).toEqual(
      challengeRewardEffects(['c1', 'c2'])
    )
  })

  it('moves exactly the one field its reward kind names', () => {
    // Catches a new reward.kind added to the registry without a case in the
    // switch — which currently falls through to `default` and silently no-ops.
    const baseline = identityEffects()
    for (const def of CHALLENGES) {
      const after = challengeRewardEffects([def.id])
      const changed = (Object.keys(after) as Array<keyof ChallengeRewardEffects>).filter(
        (k) => after[k] !== baseline[k]
      )
      expect(changed).toEqual([REWARD_EFFECT_FIELD[def.reward.kind]])
      expect(after[changed[0]]).toBe(def.reward.value)
    }
  })

  it('reproduces the documented full-set reward package', () => {
    expect(challengeRewardEffects(ALL_IDS)).toEqual({
      dimMult: 1.5, // C1
      evenDimMult: 2, // C4
      clickMult: 2, // C3
      tickspeedEffectMult: 1.15, // C2
      dimCostMult: 0.9, // C5
      tickspeedCostMult: 0.85, // C6
      shiftPower: 2.2, // C7
      spMult: 1.15 // C8
    })
  })

  it('multiplies buff rewards and assigns shift power', () => {
    const both = challengeRewardEffects(['c3', 'c5'])
    expect(both.clickMult).toBe(2)
    expect(both.dimCostMult).toBe(0.9)
    // C7 assigns (not multiplies) shift power; nothing else may move it.
    expect(challengeRewardEffects(ALL_IDS.filter((id) => id !== 'c7')).shiftPower).toBe(
      BASE_SHIFT_POWER
    )
  })

  it('keeps the "Zombi Bakışı" badge bonus a mild nudge', () => {
    expect(ALL_CHALLENGES_COMPLETE_MULT).toBeGreaterThan(1)
    expect(ALL_CHALLENGES_COMPLETE_MULT).toBeLessThan(2)
  })
})

describe('challengeTimeTierMult', () => {
  it('keeps the hardcoded thresholds in sync with CHALLENGE_TIME_TIERS', () => {
    for (const total of [0, 1, 5399, 5400, 5401, 14399, 14400, 28799, 28800, 1e9]) {
      expect(challengeTimeTierMult(timesWhere(total))).toBe(tierMultFromTable(total))
    }
  })

  it('orders the tier table fastest-to-slowest with shrinking bonuses', () => {
    const totals = CHALLENGE_TIME_TIERS.map((t) => t.totalSec)
    const mults = CHALLENGE_TIME_TIERS.map((t) => t.mult)
    expect(new Set(CHALLENGE_TIME_TIERS.map((t) => t.id)).size).toBe(totals.length)
    for (let i = 1; i < totals.length; i++) {
      expect(totals[i]).toBeGreaterThan(totals[i - 1])
      expect(mults[i]).toBeLessThanOrEqual(mults[i - 1])
    }
    expect(mults[0]).toBeGreaterThan(1)
  })

  it('switches tiers exactly on the threshold boundary', () => {
    expect(challengeTimeTierMult(timesWhere(5399))).toBe(1.4)
    expect(challengeTimeTierMult(timesWhere(5400))).toBe(1.25)
    expect(challengeTimeTierMult(timesWhere(14399))).toBe(1.25)
    expect(challengeTimeTierMult(timesWhere(14400))).toBe(1.1)
    expect(challengeTimeTierMult(timesWhere(28799))).toBe(1.1)
    expect(challengeTimeTierMult(timesWhere(28800))).toBe(1)
  })

  it('never rewards an incomplete run', () => {
    // Missing, non-numeric, NaN, negative or infinite times all disqualify.
    const full = timesWhere(0)
    const missing = { ...full }
    delete missing[ALL_IDS[ALL_IDS.length - 1]]
    expect(challengeTimeTierMult(missing)).toBe(1)

    for (const bad of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      const times = { ...full }
      times[ALL_IDS[0]] = bad
      expect(challengeTimeTierMult(times)).toBe(1)
    }
    expect(challengeTimeTierMult({})).toBe(1)
  })

  it('is monotonically non-increasing in total time', () => {
    let previous = Number.POSITIVE_INFINITY
    for (const total of [0, 3600, 5399, 5400, 14400, 28800, 60000]) {
      const value = challengeTimeTierMult(timesWhere(total))
      expect(value).toBeLessThanOrEqual(previous)
      previous = value
    }
  })

  it('sums every challenge, not just the completed ones', () => {
    // Half the challenges at 5400s each => 4 * 5400 = 21600s total.
    const times: Record<string, number> = {}
    CHALLENGES.forEach((def, index) => {
      times[def.id] = index < 4 ? 5400 : 0
    })
    expect(challengeTimeTierMult(times)).toBe(1.1)
  })
})
