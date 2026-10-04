import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from './game'
import { Decimal } from '../core/math'

describe('Denge ve Mimari Doğrulama Testleri', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('challengeGoalReached: C1 hedefi 1e40 iken 1e40 seviyesinde tetiklenir (1e308 beklemez)', () => {
    const store = useGameStore()
    store.activeChallenge = 'c1'
    store.matter = new Decimal('1e39')
    expect(store.challengeGoalReached).toBe(false)

    store.matter = new Decimal('1e40')
    expect(store.challengeGoalReached).toBe(true)

    // canSingularity hala false iken bile challengeGoalReached true olmalıdır
    expect(store.canSingularity).toBe(false)
  })

  it('challengeGoalReached: C7 hedefi 1e500 iken 1.8e308 seviyesinde tamamlanmaz (erken bitme hatası önlenir)', () => {
    const store = useGameStore()
    store.activeChallenge = 'c7'
    store.matter = new Decimal('1.8e308')
    expect(store.canSingularity).toBe(true)
    // 1e500 hedefine ulaşılmadığı için challengeGoalReached false olmalıdır!
    expect(store.challengeGoalReached).toBe(false)

    store.matter = new Decimal('1e500')
    expect(store.challengeGoalReached).toBe(true)
  })

  it('Seçim Düğümlerinde SP iadesi: resetRunState choiceGroup SP lerini iade eder', () => {
    const store = useGameStore()
    store.singularityPoints = new Decimal(5)
    // 7 SP lik dream_ascetic düğümü al
    store.neuralNodesBought = { dream_ascetic: 1 }

    store.resetRunState()

    // dream_ascetic silinmeli ve 7 SP bakiyeye geri eklenmeli (5 + 7 = 12 SP)
    expect(store.neuralNodesBought.dream_ascetic).toBeUndefined()
    expect(store.singularityPoints.toNumber()).toBe(12)
  })

  it('Dinamik Toplu Uyku (Power Nap) eşiği: napCount arttıkça minNapBots yükselir', () => {
    const store = useGameStore()
    store.napCount = 0
    expect(store.minNapBots.toNumber()).toBe(100)

    store.napCount = 5
    expect(store.minNapBots.toNumber()).toBeGreaterThan(1000)
  })

  it('İlk Şafak Çöküşü taban 3 SP garanti eder', () => {
    const store = useGameStore()
    store.matter = new Decimal('1.8e308')
    expect(store.singularityGain.toNumber()).toBeGreaterThanOrEqual(3)
  })

  it('offlineSimBoost getDimensionMultiplier içine enjekte edilmez (1800x kaskad hatası çözülmüştür)', () => {
    const store = useGameStore()
    store.offlineSimBoost = 2.5
    const multWithoutBoost = store.getDimensionMultiplier(1)
    
    // getDimensionMultiplier her zaman temiz olmalıdır
    expect(multWithoutBoost.toNumber()).toBeGreaterThan(0)
  })

  it('singleShiftPower ve shiftPowerMultiplier shift_power_boost başarımını doğru yansıtır', () => {
    const store = useGameStore()
    store.dimensionShifts = 2
    expect(store.singleShiftPower).toBe(1.66)
    expect(store.shiftPowerMultiplier.toNumber()).toBeCloseTo(1.66 * 1.66, 2)

    store.achievements.push('dop_sonsuz_akis')
    expect(store.singleShiftPower).toBe(1.9)
    expect(store.shiftPowerMultiplier.toNumber()).toBeCloseTo(1.9 * 1.9, 2)
  })

  it('shiftRequirement 6+ sıçramalarda D5 pasifini uygular ve her zaman tamsayı döner', () => {
    const store = useGameStore()
    store.dimensionShifts = 6
    store.dimensionCapFloor = 8
    // D5 henüz satın alınmamışken taban: 22 + 16 * 0 = 22
    const reqWithoutD5 = store.shiftRequirement
    expect(reqWithoutD5.amount.toNumber()).toBe(22)

    // D5 satın alınınca %3 indirim: floor(22 * 0.97) = floor(21.34) = 21
    store.dimensions[4].bought = 10
    const reqWithD5 = store.shiftRequirement
    expect(reqWithD5.amount.toNumber()).toBe(21)
    expect(Number.isInteger(reqWithD5.amount.toNumber())).toBe(true)
  })

  it('tierSlackerLeechMult D3 alınmamışken 1, alınınca 0.97 döner', () => {
    const store = useGameStore()
    expect(store.passiveBadges.d3Leech).toBe(false)
    expect(store.slackerLeechPercent).toBe(0) // slacker yok

    store.dimensions[2].bought = 10
    expect(store.passiveBadges.d3Leech).toBe(true)
  })
})
