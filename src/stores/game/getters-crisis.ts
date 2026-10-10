// Kriz + challenge getter parcalari. `this`, StoreApi ile tiplenmistir.
import { D_0, D_1, D_INFINITY, Decimal } from '../../core/math'
import { hasAchievementReward } from '../../game/achievements'
import { CHALLENGE_HALT_RAMP_SEC, CHALLENGE_STORM_BASE, CHALLENGE_STORM_FLOOR, CHALLENGE_STORM_STEP } from '../../game/balance'
import { getChallengeById } from '../../game/challenges'
import { tierSlackerLeechMult } from '../../game/dimension_identity'
import { memoChallengeEffects } from './cache'
import { parseSavedDecimal } from './guards'
import type { ChallengeDef, ChallengeRewardEffects } from '../../game/challenges'
import type { GameState } from './state'
import type { StoreApi } from './store-api'

export const crisisGetters = {
    // Aktif Gece Krizi hedefi tamamlandı mı? (Her krizin kendi goalMatter eşiği kontrol edilir)
    challengeGoalReached(this: StoreApi, state: GameState): boolean {
      if (!state.activeChallenge) return false
      const def = getChallengeById(state.activeChallenge)
      if (!def) return false
      return state.matter.gte(new Decimal(def.goalMatter))
    },

    // --- OTONOMİ KOKPİTİ GETTER'LARI ---
    isCockpitMode(this: StoreApi, state: GameState): boolean {
      return state.singularities >= 1
    },

    isAutobuyerCockpitMode(this: StoreApi, state: GameState): boolean {
      return state.singularities >= 1
    },

    // Vicdan azaplarının emdiği oran (Vicdan Uyuşturucu yükseltmesi ve Cheeseburger Kedi ile azalır)
    slackerLeechPercent(this: StoreApi, state: GameState): number {
      const baseLeech = state.slackers.length * 0.03
      const immunityLvl = state.singularityUpgrades?.guilt_immunity || 0
      const factor = Math.max(0.2, 1 - immunityLvl * 0.25)
      const achFactor = hasAchievementReward(state.achievements, 'leech_reduction') ? 0.85 : 1
      const hasMagneticShield = state.labCells.some((c) => c.isMature && c.seedType === 'magnetic_shield')
      const shieldFactor = hasMagneticShield ? 0.75 : 1.0
      const d3Leech = tierSlackerLeechMult(state.dimensions, this.unlockedDimensionsCount)
      return baseLeech * factor * achFactor * shieldFactor * d3Leech
    },

    crisisUnlocked(this: StoreApi): boolean {
      return this.isFeatureUnlocked('crisis')
    },

    // ---- Gece Kriz Meydan Okumaları (Faz 1: Motor) ----
    activeChallengeDef(this: StoreApi): ChallengeDef | null {
      if (!this.activeChallenge) return null
      return getChallengeById(this.activeChallenge) || null
    },

    challengeRewardEffects(this: StoreApi): ChallengeRewardEffects {
      return memoChallengeEffects(this.completedChallenges)
    },

    challengesUnlocked(this: StoreApi): boolean {
      return this.isFeatureUnlocked('challenges')
    },

    // C2 durma-rampası + C8 fırtına global üretim çarpanı.
    // İki tüketim noktası: matterPerSecond + update() içi kopya (ikisi de bu getter'ı okur).
    challengeProdMult(this: StoreApi): Decimal {
      const mods = this.activeChallengeDef?.modifiers
      if (!mods) return D_1
      let mult = D_1
      // C2: 3 sn tam durma challengeHalted ile sıfırlanır; burada 60 sn lineer rampa (0→1).
      if (mods.productionHaltOnBuySec !== undefined) {
        const t = this.challengeSinceBuy - mods.productionHaltOnBuySec
        if (t < 0) return D_0
        if (t < CHALLENGE_HALT_RAMP_SEC) {
          mult = mult.times(t / CHALLENGE_HALT_RAMP_SEC)
        }
      }
      // C8: Bildirim Fırtınası — sayaç %100'de ×0.5, her +%25 taşmada ek ×0.75, taban ×0.15.
      if (mods.notificationDoomRatePerSec !== undefined && this.challengeNotificationDoom >= 1) {
        const steps = Math.floor((this.challengeNotificationDoom - 1) / 0.25)
        const storm = CHALLENGE_STORM_BASE * Math.pow(CHALLENGE_STORM_STEP, steps)
        mult = mult.times(Math.max(CHALLENGE_STORM_FLOOR, storm))
      }
      return mult
    },

    // C2 durma anında üretim tamamen durur (matterPerSecond D_0 döner, update kopyası atlar).
    challengeHalted(this: StoreApi): boolean {
      const mods = this.activeChallengeDef?.modifiers
      return mods?.productionHaltOnBuySec !== undefined && this.challengeHaltUntil > 0
    },

    // Hedef çubuğu için logaritmik ilerleme (0-1)
    challengeProgress01(this: StoreApi, state: GameState): number {
      if (!state.activeChallenge) return 0
      const def = getChallengeById(state.activeChallenge)
      if (!def) return 0
      const goal = parseSavedDecimal(def.goalMatter, D_INFINITY)
      if (goal.lte(0) || goal.isNan()) return 0
      if (state.matter.gte(goal)) return 1
      if (state.matter.lte(0)) return 0
      const cur = state.matter.log10().toNumber()
      const target = goal.log10().toNumber()
      if (!Number.isFinite(cur) || !Number.isFinite(target) || target <= 0) return 0
      return Math.min(1, Math.max(0, cur / target))
    },
}
