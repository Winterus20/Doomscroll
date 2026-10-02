import Decimal from 'break_eternity.js'

export const D_INFINITY = new Decimal('1.7976931348623157e308')
const D_0 = new Decimal(0)
const D_1 = new Decimal(1)

const BASE_COSTS = [
  new Decimal(10),
  new Decimal(100),
  new Decimal(1e4),
  new Decimal(1e6),
  new Decimal(1e9),
  new Decimal(1e13),
  new Decimal(1e18),
  new Decimal(1e24)
]

const COST_MULTS = [
  new Decimal(1e3),
  new Decimal(1e4),
  new Decimal(1e5),
  new Decimal(1e6),
  new Decimal(1e8),
  new Decimal(1e10),
  new Decimal(1e12),
  new Decimal(1e15)
]

const RESOLUTION_MILESTONES = [
  { count: 25, mult: 2 },
  { count: 50, mult: 3 },
  { count: 100, mult: 4 },
  { count: 250, mult: 8 },
  { count: 500, mult: 16 },
  { count: 1000, mult: 32 }
]

const COLLECTIVE_MILESTONES = [
  { minBought: 25, mult: 2.0 },
  { minBought: 50, mult: 3.0 },
  { minBought: 100, mult: 5.0 },
  { minBought: 250, mult: 10.0 },
  { minBought: 500, mult: 25.0 },
  { minBought: 1000, mult: 50.0 }
]

const ALGORITHM_UPGRADES_DEF = [
  { id: 'play_speed', cost: new Decimal(1e5) },
  { id: 'double_tap', cost: new Decimal(1e6) },
  { id: 'amoled_black', cost: new Decimal(1e7) },
  { id: 'bg_listen', cost: new Decimal(1e8) },
  { id: 'bookmark_pack', cost: new Decimal(1e9) },
  { id: 'bass_boost', cost: new Decimal(1e11) }
]

const AUTOBUYER_COSTS = {
  dim1: new Decimal(5e5),
  dim2: new Decimal(5e7),
  dim3: new Decimal(5e9),
  dim4: new Decimal(1e12),
  dim5: new Decimal(1e16),
  dim6: new Decimal(1e21),
  dim7: new Decimal(1e27),
  dim8: new Decimal(1e34),
  tickspeed: new Decimal(5e8),
  shift: new Decimal(5e13),
  galaxy: new Decimal(1e23)
}

const AUTOBUYER_PROGRESS_REQ = {
  dim1: {},
  dim2: { needTier: 3 },
  dim3: { shifts: 1 },
  dim4: { shifts: 1 },
  dim5: { shifts: 2 },
  dim6: { shifts: 2 },
  dim7: { shifts: 2 },
  dim8: { shifts: 2 },
  tickspeed: { needTier: 3 },
  shift: { shifts: 1 },
  galaxy: { galaxies: 1 }
}

export class Simulation {
  constructor(options = {}) {
    this.shiftFormula = options.shiftFormula || 'current' // 'current', 'linear_20', 'linear_25', 'ad_boost'
    this.galaxyFormula = options.galaxyFormula || 'current' // 'current' (100 + 60*g), 'ad_80_60' (80 + 60*g)
    this.shiftPowerBase = options.shiftPowerBase || 1.07 // 1.07 (current) or 2.0 (standard AD)
    this.matter = new Decimal(10)
    this.totalMatterProduced = new Decimal(10)
    this.dimensions = Array.from({ length: 8 }, () => ({
      amount: new Decimal(0),
      bought: 0
    }))
    this.tickspeedBought = 0
    this.dimensionShifts = 0
    this.galaxies = 0
    this.sacrificeMultiplier = new Decimal(1)
    this.sacrificeCount = 0
    this.algorithmUpgrades = new Set()
    this.autobuyers = {}
    for (const key of Object.keys(AUTOBUYER_COSTS)) {
      this.autobuyers[key] = { unlocked: false, enabled: true, timer: 0, interval: 0.5 }
    }
    this.autobuyerBulkUnlocked = false
    this.autobuyerMaxUnlocked = false

    this.refreshCooldown = 0
    this.refreshActiveTime = 0
    this.currentStance = 'under_blanket' // Active players switch to under_blanket (2x prod) once unlocked

    // Active buffs
    this.activeBuffs = [] // { type, duration, remaining, multiplier }
    this.anomalyTimer = 0
    this.nextAnomalyInterval = 45

    this.simTime = 0 // seconds
    this.manualClicks = 0
    this.achievementsCount = 0
    this.logHistory = []
  }

  get unlockedDimensionsCount() {
    return Math.min(8, 4 + this.dimensionShifts)
  }

  get collectiveMinBought() {
    let min = Infinity
    for (let i = 0; i < this.unlockedDimensionsCount; i++) {
      if (this.dimensions[i].bought < min) {
        min = this.dimensions[i].bought
      }
    }
    return min === Infinity ? 0 : min
  }

  get collectiveMultiplier() {
    const min = this.collectiveMinBought
    let mult = D_1
    for (const m of COLLECTIVE_MILESTONES) {
      if (min >= m.minBought) mult = new Decimal(m.mult)
      else break
    }
    return mult
  }

  get achievementMultiplier() {
    // Estimate achievements based on progression
    let count = 0
    if (this.manualClicks >= 1) count++
    if (this.manualClicks >= 100) count++
    if (this.manualClicks >= 1000) count++
    if (this.totalMatterProduced.gte(1e6)) count++
    if (this.totalMatterProduced.gte(1e12)) count++
    if (this.totalMatterProduced.gte(1e30)) count++
    if (this.dimensions[0].bought >= 10) count++
    const totalBought = this.dimensions.reduce((acc, d) => acc + d.bought, 0)
    if (totalBought >= 100) count++
    if (this.tickspeedBought >= 5) count++
    if (this.tickspeedBought >= 20) count++
    if (this.dimensionShifts >= 1) count++
    if (this.dimensionShifts >= 4) count++
    if (this.galaxies >= 1) count++
    const unlockedBots = Object.values(this.autobuyers).filter(b => b.unlocked).length
    if (unlockedBots >= 1) count++
    if (unlockedBots >= 6) count++
    if (unlockedBots >= 11) count++
    // Anomalies
    count += Math.min(10, Math.floor(this.simTime / 300))
    this.achievementsCount = count

    const per = Decimal.pow(1.012, count)
    const rows = Decimal.pow(1.06, Math.floor(count / 7))
    return per.times(rows)
  }

  get tickspeedMultiplier() {
    const baseReduction = 0.89
    const galaxyBonus = Math.max(0.01, baseReduction - this.galaxies * 0.02)
    let mult = Decimal.pow(1 / galaxyBonus, this.tickspeedBought)
    if (this.algorithmUpgrades.has('play_speed')) {
      mult = mult.times(1.15)
    }
    const espresso = this.activeBuffs.find(b => b.type === 'espresso')
    if (espresso) {
      mult = mult.times(espresso.multiplier)
    }
    return mult
  }

  get tickspeedCost() {
    let cost = new Decimal(1000).times(Decimal.pow(13, this.tickspeedBought))
    if (this.currentStance === 'private_mode') {
      cost = cost.times(this.algorithmUpgrades.has('amoled_black') ? 0.75 : 0.85).floor()
    }
    if (this.tickspeedBought >= 20) {
      cost = cost.times(0.95).floor()
    }
    if (this.collectiveMinBought >= 100) {
      cost = cost.times(0.9).floor()
    }
    return cost
  }

  getDimensionCost(tier) {
    const dim = this.dimensions[tier - 1]
    return BASE_COSTS[tier - 1].times(Decimal.pow(COST_MULTS[tier - 1], Math.floor(dim.bought / 10)))
  }

  getDimensionMultiplier(tier) {
    const dim = this.dimensions[tier - 1]
    if (!dim) return D_1

    let mult = Decimal.pow(2, Math.floor(dim.bought / 10))

    for (const m of RESOLUTION_MILESTONES) {
      if (dim.bought >= m.count) mult = new Decimal(m.mult)
      else break
    }

    if (this.dimensionShifts > 0) {
      mult = mult.times(Decimal.pow(this.shiftPowerBase, this.dimensionShifts))
    }

    if (tier === 8 && this.sacrificeMultiplier.gt(1)) {
      mult = mult.times(this.sacrificeMultiplier)
    }

    // Algorithmic mirror synergy
    const partnerTier = 9 - tier
    const partnerDim = this.dimensions[partnerTier - 1]
    if (partnerDim && partnerDim.bought > 0) {
      mult = mult.times(1 + Math.sqrt(partnerDim.bought) * 0.15)
    }

    if ((tier === 3 || tier === 4) && this.algorithmUpgrades.has('bass_boost')) {
      mult = mult.times(3)
    }

    return mult
  }

  get shiftRequirement() {
    if (this.dimensionShifts < 4) {
      const tier = 4 + this.dimensionShifts
      return { tier, amount: new Decimal(25) }
    }

    if (this.shiftFormula === 'current') {
      return {
        tier: 8,
        amount: new Decimal(25).times(Decimal.pow(100, this.dimensionShifts - 4))
      }
    } else if (this.shiftFormula === 'linear_20') {
      return {
        tier: 8,
        amount: new Decimal(20 + 15 * (this.dimensionShifts - 4))
      }
    } else if (this.shiftFormula === 'linear_25') {
      return {
        tier: 8,
        amount: new Decimal(25 + 15 * (this.dimensionShifts - 4))
      }
    }
    throw new Error('Unknown shift formula: ' + this.shiftFormula)
  }

  get canShift() {
    const req = this.shiftRequirement
    const dim = this.dimensions[req.tier - 1]
    return dim ? dim.amount.gte(req.amount) : false
  }

  get galaxyRequirement() {
    if (this.galaxyFormula === 'current') {
      return 100 + this.galaxies * 60
    } else if (this.galaxyFormula === 'ad_80_60') {
      return 80 + this.galaxies * 60
    }
    return 100 + this.galaxies * 60
  }

  get canBuyGalaxy() {
    const dim8 = this.dimensions[7]
    return dim8 ? dim8.amount.gte(this.galaxyRequirement) : false
  }

  get canSacrifice() {
    const isUnlocked = this.dimensionShifts >= 5 || (this.dimensions[7] && this.dimensions[7].amount.gt(0))
    if (!isUnlocked) return false
    const dim1 = this.dimensions[0]
    if (!dim1 || dim1.amount.lt(10)) return false
    return this.currentSacrificeReward.gt(this.sacrificeMultiplier.times(1.15))
  }

  get currentSacrificeReward() {
    const dim1 = this.dimensions[0]
    if (!dim1 || dim1.amount.lt(10)) return D_1
    const logD1 = dim1.amount.log10().toNumber()
    if (logD1 <= 0) return D_1
    const base = 1 + logD1 / 4
    return Decimal.pow(base, 2.5)
  }

  buyDimension(tier) {
    if (tier > this.unlockedDimensionsCount) return false
    const cost = this.getDimensionCost(tier)
    if (this.matter.gte(cost)) {
      this.matter = this.matter.minus(cost)
      const dim = this.dimensions[tier - 1]
      dim.amount = dim.amount.plus(10)
      dim.bought += 10
      return true
    }
    return false
  }

  buyMaxDimension(tier) {
    if (tier > this.unlockedDimensionsCount) return false
    let boughtAny = false
    for (let guard = 0; guard < 500; guard++) {
      const cost = this.getDimensionCost(tier)
      if (this.matter.gte(cost)) {
        this.matter = this.matter.minus(cost)
        const dim = this.dimensions[tier - 1]
        dim.amount = dim.amount.plus(10)
        dim.bought += 10
        boughtAny = true
      } else {
        break
      }
    }
    return boughtAny
  }

  buyTickspeed() {
    const cost = this.tickspeedCost
    if (this.matter.gte(cost)) {
      this.matter = this.matter.minus(cost)
      this.tickspeedBought++
      return true
    }
    return false
  }

  maxAll() {
    for (let guard = 0; guard < 500 && this.matter.gte(this.tickspeedCost); guard++) {
      if (!this.buyTickspeed()) break
    }
    for (let t = this.unlockedDimensionsCount; t >= 1; t--) {
      this.buyMaxDimension(t)
    }
  }

  dimensionShift() {
    if (!this.canShift) return false
    this.dimensionShifts++
    this.matter = new Decimal(10)
    const startAmount = this.algorithmUpgrades.has('bookmark_pack') ? new Decimal(10) : new Decimal(0)
    for (let i = 0; i < 8; i++) {
      this.dimensions[i].amount = new Decimal(startAmount)
      this.dimensions[i].bought = 0
    }
    this.tickspeedBought = 0
    return true
  }

  buyGalaxy() {
    if (!this.canBuyGalaxy) return false
    this.galaxies++
    this.dimensionShifts = 0
    this.matter = new Decimal(10)
    const startAmount = this.algorithmUpgrades.has('bookmark_pack') ? new Decimal(10) : new Decimal(0)
    for (let i = 0; i < 8; i++) {
      this.dimensions[i].amount = new Decimal(startAmount)
      this.dimensions[i].bought = 0
    }
    this.tickspeedBought = 0
    return true
  }

  sacrifice() {
    if (!this.canSacrifice) return false
    this.sacrificeMultiplier = this.currentSacrificeReward
    this.sacrificeCount++
    return true
  }

  isAutobuyerReqMet(id) {
    const req = AUTOBUYER_PROGRESS_REQ[id]
    if (!req) return true
    if (req.shifts !== undefined && this.dimensionShifts < req.shifts) return false
    if (req.galaxies !== undefined && this.galaxies < req.galaxies) return false
    if (req.needTier !== undefined) {
      const dim = this.dimensions[req.tier - 1]
      if (!dim || dim.amount.lt(1)) return false
    }
    return true
  }

  checkAutobuyersUnlock() {
    if (this.matter.gte(1e9)) { // Autobuyers tab unlocked
      for (const [id, cost] of Object.entries(AUTOBUYER_COSTS)) {
        if (!this.autobuyers[id]?.unlocked && this.isAutobuyerReqMet(id) && this.matter.gte(cost)) {
          this.matter = this.matter.minus(cost)
          this.autobuyers[id].unlocked = true
          this.autobuyers[id].enabled = true
        }
      }
    }
  }

  checkUpgrades() {
    for (const upg of ALGORITHM_UPGRADES_DEF) {
      if (!this.algorithmUpgrades.has(upg.id) && this.matter.gte(upg.cost)) {
        this.matter = this.matter.minus(upg.cost)
        this.algorithmUpgrades.add(upg.id)
      }
    }
  }

  triggerAnomaly() {
    const types = ['heart_frenzy', 'fyp', 'sponsor', 'espresso']
    const type = types[Math.floor(Math.random() * types.length)]

    if (type === 'heart_frenzy') {
      this.activeBuffs.push({ type: 'heart_frenzy', duration: 60, remaining: 60, multiplier: 7 })
    } else if (type === 'fyp') {
      this.activeBuffs.push({ type: 'fyp', duration: 15, remaining: 15, multiplier: 777 })
    } else if (type === 'sponsor') {
      // Instant 5 minutes of Dopamine production
      const dim1 = this.dimensions[0]
      if (dim1 && dim1.amount.gt(0)) {
        const speed = this.tickspeedMultiplier
        const rate = dim1.amount
          .times(this.getDimensionMultiplier(1))
          .times(speed)
          .times(this.collectiveMultiplier)
          .times(this.achievementMultiplier)
          .times(this.currentStance === 'under_blanket' ? 2 : 1)
        const payout = rate.times(300) // 5 minutes
        this.matter = this.matter.plus(payout)
        this.totalMatterProduced = this.totalMatterProduced.plus(payout)
      }
    } else if (type === 'espresso') {
      this.activeBuffs.push({ type: 'espresso', duration: 30, remaining: 30, multiplier: 2 })
    }
  }

  manualClick(count = 1) {
    for (let c = 0; c < count; c++) {
      let clickPower = D_1
      if (this.currentStance === 'spam') clickPower = clickPower.times(4)
      if (this.algorithmUpgrades.has('double_tap')) clickPower = clickPower.times(2)
      const fyp = this.activeBuffs.find(b => b.type === 'fyp')
      if (fyp) clickPower = clickPower.times(fyp.multiplier)

      // CPS sync: 2% of CPS + 1% per 100+ tier
      const dim1 = this.dimensions[0]
      if (dim1 && dim1.amount.gt(0)) {
        const cps = dim1.amount.times(this.getDimensionMultiplier(1)).times(this.tickspeedMultiplier)
        clickPower = clickPower.plus(cps.times(0.02))
      }
      this.dimensions.forEach((d, idx) => {
        if (d.bought >= 100 && d.amount.gt(0)) {
          const dimPerSec = d.amount.times(this.getDimensionMultiplier(idx + 1)).times(this.tickspeedMultiplier).times(0.01)
          clickPower = clickPower.plus(dimPerSec)
        }
      })

      this.matter = this.matter.plus(clickPower)
      this.totalMatterProduced = this.totalMatterProduced.plus(clickPower)
      this.manualClicks++
    }
  }

  tick(dt) {
    this.simTime += dt

    // Buffs tick
    for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
      this.activeBuffs[i].remaining -= dt
      if (this.activeBuffs[i].remaining <= 0) {
        this.activeBuffs.splice(i, 1)
      }
    }

    // Anomalies spawn every ~45 seconds
    if (this.totalMatterProduced.gte(1000)) {
      this.anomalyTimer += dt
      if (this.anomalyTimer >= this.nextAnomalyInterval) {
        this.anomalyTimer = 0
        this.nextAnomalyInterval = 30 + Math.random() * 30
        this.triggerAnomaly()
      }
    }

    // Pull to refresh timers
    if (this.refreshActiveTime > 0) {
      this.refreshActiveTime = Math.max(0, this.refreshActiveTime - dt)
    }
    if (this.refreshCooldown > 0) {
      this.refreshCooldown = Math.max(0, this.refreshCooldown - dt)
    } else if (this.matter.gte(1e7) || this.algorithmUpgrades.size > 0) {
      this.refreshActiveTime = 12
      this.refreshCooldown = 60
    }

    // Dimension chain production
    const unlocked = this.unlockedDimensionsCount
    const speed = this.tickspeedMultiplier
    const achMult = this.achievementMultiplier

    for (let i = unlocked - 1; i >= 1; i--) {
      const higher = this.dimensions[i]
      const lower = this.dimensions[i - 1]
      if (higher && lower && higher.amount.gt(0)) {
        const mult = this.getDimensionMultiplier(i + 1)
        const produced = higher.amount
          .times(mult)
          .times(speed)
          .times(achMult)
          .times(0.1) // DIMENSION_CHAIN_RATE
          .times(dt)
        lower.amount = lower.amount.plus(produced)
      }
    }

    // Dim 1 -> Dopamine
    const dim1 = this.dimensions[0]
    if (dim1 && dim1.amount.gt(0)) {
      let stanceMult = this.currentStance === 'under_blanket' ? 2.0 : 1.0
      let buffMult = 1.0
      const hf = this.activeBuffs.find(b => b.type === 'heart_frenzy')
      if (hf) buffMult *= hf.multiplier

      // Algorithm lab mature seed passive bonus estimate: +60%
      const labMult = 1.6

      let rawProduced = dim1.amount
        .times(this.getDimensionMultiplier(1))
        .times(speed)
        .times(stanceMult)
        .times(buffMult)
        .times(labMult)
        .times(achMult)
        .times(this.collectiveMultiplier)
        .times(dt)

      if (this.algorithmUpgrades.has('bg_listen')) {
        rawProduced = rawProduced.times(1.25)
      }
      if (this.refreshActiveTime > 0) {
        rawProduced = rawProduced.times(3.0)
      }

      this.matter = this.matter.plus(rawProduced)
      this.totalMatterProduced = this.totalMatterProduced.plus(rawProduced)
    }

    // Autobuyers execution
    for (const [id, bot] of Object.entries(this.autobuyers)) {
      if (bot.unlocked && bot.enabled) {
        bot.timer += dt
        if (bot.timer >= bot.interval) {
          bot.timer = 0
          if (id.startsWith('dim')) {
            const tier = parseInt(id.replace('dim', ''), 10)
            this.buyMaxDimension(tier)
          } else if (id === 'tickspeed') {
            for (let g = 0; g < 20; g++) {
              if (!this.buyTickspeed()) break
            }
          } else if (id === 'shift') {
            if (this.canShift) this.dimensionShift()
          } else if (id === 'galaxy') {
            if (this.canBuyGalaxy) this.buyGalaxy()
          }
        }
      }
    }
  }
}
