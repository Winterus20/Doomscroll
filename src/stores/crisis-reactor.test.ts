import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from './game'
import { Decimal } from '../core/math'

describe('Crisis 2.0: Olay Ufku Kararsızlık Reaktörü ve Hibrit Kriz Sistemi', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('başlangıçta reaktör ısısı 0 ve dormant fazında olmalıdır', () => {
    const store = useGameStore()
    expect(store.reactorHeat).toBe(0)
    expect(store.reactorPhase).toBe('dormant')
    expect(store.reactorMassMult).toBe(1.0)
    expect(store.reactorTickRateMult).toBe(1.0)
    expect(store.reactorAnomalyRateMult).toBe(1.0)
  })

  it('ısı seviyelerine göre fazlar ve çarpanlar doğru hesaplanmalıdır', () => {
    const store = useGameStore()

    // 0 - 30: Dormant
    store.reactorHeat = 20
    expect(store.reactorPhase).toBe('dormant')
    expect(store.reactorMassMult).toBe(1.0)
    expect(store.reactorTickRateMult).toBe(1.0)

    // 31 - 60: Resonance
    store.reactorHeat = 45
    expect(store.reactorPhase).toBe('resonance')
    expect(store.reactorMassMult).toBe(1.0)
    expect(store.reactorTickRateMult).toBe(1.5)
    expect(store.reactorAnomalyRateMult).toBe(1.3)

    // 61 - 99: Sweet Spot
    store.reactorHeat = 75
    expect(store.reactorPhase).toBe('sweet_spot')
    expect(store.reactorMassMult).toBe(8.0)
    expect(store.reactorTickRateMult).toBe(1.5)
    expect(store.reactorAnomalyRateMult).toBe(2.0)

    // Meltdown
    store.reactorMeltdownTimer = 8
    expect(store.reactorPhase).toBe('meltdown')
    expect(store.reactorMassMult).toBe(0.5)
  })

  it('doğal soğuma saniyede -1.2 ısı düşürmelidir', () => {
    const store = useGameStore()
    store.reactorHeat = 50
    store.update(5) // 5 sn * 1.2 = 6 ısı düşüşü
    expect(store.reactorHeat).toBeCloseTo(44, 1)
  })

  it('quantum_compression müdahalesi ısıyı 25 artırıp altın anomali spawnlamalıdır', () => {
    const store = useGameStore()
    store.reactorHeat = 10
    const initialAnomalies = store.floatingAnomalies.length

    const res = store.castCrisisIntervention('quantum_compression')
    expect(res).toBe(true)
    expect(store.reactorHeat).toBe(35)
    expect(store.floatingAnomalies.length).toBeGreaterThan(initialAnomalies)
    expect(store.stats.spellsCast).toBe(1)
  })

  it('time_dilation müdahalesi aktif buff sürelerine +15 saniye eklemelidir', () => {
    const store = useGameStore()
    store.activeBuffs.push({
      id: 'buff-test',
      type: 'espresso',
      name: 'Test Buff',
      duration: 30,
      remaining: 10,
      multiplier: 2
    })

    store.reactorHeat = 10
    const res = store.castCrisisIntervention('time_dilation')
    expect(res).toBe(true)
    expect(store.reactorHeat).toBe(30)
    expect(store.activeBuffs[0].remaining).toBe(25)
  })

  it('magnetic_vent müdahalesi ısıyı 35 soğutup parazitleri %175 primle bozdurmalıdır', () => {
    const store = useGameStore()
    store.reactorHeat = 50
    store.matter = new Decimal(0)
    store.slackers = [
      {
        id: 'slacker-1',
        name: 'Wrinkler 1',
        leechedDopamine: new Decimal(100),
        clicksRemaining: 3
      }
    ]

    const res = store.castCrisisIntervention('magnetic_vent')
    expect(res).toBe(true)
    expect(store.reactorHeat).toBe(15)
    expect(store.slackers.length).toBe(0)
    expect(store.matter.toNumber()).toBe(175) // 100 * 1.75
  })

  it('planck_surge müdahalesi 20sn 4x Hz ve 10x manuel yutma vermelidir', () => {
    const store = useGameStore()
    store.reactorHeat = 10
    const baseClick = store.manualClickPower

    const res = store.castCrisisIntervention('planck_surge')
    expect(res).toBe(true)
    expect(store.reactorHeat).toBe(55)

    const surgeBuff = store.activeBuffs.find((b) => b.type === 'planck_surge')
    expect(surgeBuff).toBeDefined()
    expect(surgeBuff?.remaining).toBe(20)
    expect(surgeBuff?.multiplier).toBe(4)

    // 10x manuel tıklama gücü
    expect(store.manualClickPower.gt(baseClick.times(9))).toBe(true)
  })

  it('ısı 100 olunca Meltdown tetiklenmeli ve 10 sn sonra 25e stabilize olmalıdır', () => {
    const store = useGameStore()
    store.reactorHeat = 80
    store.castCrisisIntervention('quantum_compression') // +25 -> 105 -> 100

    expect(store.reactorHeat).toBe(100)
    expect(store.reactorMeltdownTimer).toBe(10)
    expect(store.reactorPhase).toBe('meltdown')

    // Meltdown sırasında yeni müdahale uygulanamaz
    const cantCast = store.castCrisisIntervention('quantum_compression')
    expect(cantCast).toBe(false)

    // 10 saniye sonra cooldown biter
    store.update(10)
    expect(store.reactorMeltdownTimer).toBe(0)
    expect(store.reactorHeat).toBe(25)
    expect(store.reactorPhase).toBe('dormant')
  })

  it('canlı fırsat ikilemleri (dilemma) tetiklenebilmeli ve seçenek uygulanabilmelidir', () => {
    const store = useGameStore()
    store.reactorHeat = 70 // Sweet spot
    store.triggerCrisisDilemma()

    expect(store.activeCrisisDilemma).not.toBeNull()
    expect(store.activeCrisisDilemma?.options.length).toBe(2)

    const optId = store.activeCrisisDilemma!.options[0].id
    store.chooseCrisisDilemmaOption(optId)

    expect(store.activeCrisisDilemma).toBeNull()
    expect(store.dilemmaCooldown).toBe(60)
  })

  it('eski castSpell metodu geriye dönük uyumlulukla yeni müdahaleleri tetiklemelidir', () => {
    const store = useGameStore()
    store.reactorHeat = 0

    // fast_charge -> quantum_compression
    store.castSpell('fast_charge')
    expect(store.reactorHeat).toBe(25)

    // espresso_shot -> time_dilation
    store.castSpell('espresso_shot')
    expect(store.reactorHeat).toBe(45)

    // noise_cancelling -> magnetic_vent
    store.castSpell('noise_cancelling')
    expect(store.reactorHeat).toBe(10)
  })

  it('save/load migration eski caffeineEnergy alanını güvenle reactorHeat e dönüştürmelidir', () => {
    const store = useGameStore()
    const legacySave = {
      version: 16,
      matter: '1000',
      caffeineEnergy: 65,
      dimensions: store.dimensions.map((d) => ({ amount: d.amount.toString(), bought: d.bought })),
      tickspeedBought: 0,
      dimensionShifts: 0,
      galaxies: 0,
      singularityPoints: '0',
      currentStance: 'trend',
      activeBuffs: [],
      slackers: [],
      lastUpdate: Date.now(),
      settings: store.settings,
      stats: {
        manualClicks: 0,
        totalMatterProduced: '1000',
        highestMatter: '1000',
        totalPlaytime: 0,
        singularityCount: 0,
        fastestSingularity: 0,
        anomaliesClicked: 0,
        combosTriggered: 0,
        slackersFired: 0
      }
    }

    store.deserialize(legacySave as any)
    expect(store.reactorHeat).toBe(65)
    expect(store.reactorPhase).toBe('sweet_spot')
    expect(store.reactorCoolantCharges).toBe(3)
    expect(store.reactorMomentum).toBe(1.0)
  })

  it('Crisis 3.0: Manyetik Tahliye 3 kartuş harcadıktan sonra engellenmelidir', () => {
    const store = useGameStore()
    expect(store.reactorCoolantCharges).toBe(3)

    // 1. kullanım (ısı 80 -> 45)
    store.reactorHeat = 80
    expect(store.castCrisisIntervention('magnetic_vent')).toBe(true)
    expect(store.reactorCoolantCharges).toBe(2)

    // İç cooldown'u sıfırlayarak 2. kullanım
    store.reactorCooldowns['magnetic_vent'] = 0
    store.reactorHeat = 80
    expect(store.castCrisisIntervention('magnetic_vent')).toBe(true)
    expect(store.reactorCoolantCharges).toBe(1)

    // 3. kullanım
    store.reactorCooldowns['magnetic_vent'] = 0
    store.reactorHeat = 80
    expect(store.castCrisisIntervention('magnetic_vent')).toBe(true)
    expect(store.reactorCoolantCharges).toBe(0)

    // 4. kullanım: Kartuş tükendiği için engellenmelidir!
    store.reactorCooldowns['magnetic_vent'] = 0
    store.reactorHeat = 80
    expect(store.castCrisisIntervention('magnetic_vent')).toBe(false)
    expect(store.reactorHeat).toBe(80) // Isı düşmemeli

    // 35 saniye sonra 1 kartuş dolmalı
    store.update(35)
    expect(store.reactorCoolantCharges).toBe(1)
  })

  it('Crisis 3.0: Cooldown devam ederken aynı müdahale tekrar basılamamalıdır', () => {
    const store = useGameStore()
    store.reactorHeat = 10
    expect(store.castCrisisIntervention('quantum_compression')).toBe(true)
    expect(store.reactorCooldowns['quantum_compression']).toBe(20)

    // Cooldown aktifken ikinci tetikleme başarısız olmalıdır
    expect(store.castCrisisIntervention('quantum_compression')).toBe(false)

    // 20 sn update sonrası tekrar kullanılabilmelidir
    store.update(20)
    expect(store.reactorCooldowns['quantum_compression']).toBe(0)
    expect(store.castCrisisIntervention('quantum_compression')).toBe(true)
  })

  it('Crisis 3.0: Zaman Genleşmesi buff sürelerini azami 120 saniyenin üzerine uzatamamalıdır', () => {
    const store = useGameStore()
    store.activeBuffs.push({
      id: 'buff-cap-test',
      type: 'espresso',
      name: 'Cap Test',
      duration: 110,
      remaining: 110,
      multiplier: 2
    })

    store.reactorHeat = 10
    expect(store.castCrisisIntervention('time_dilation')).toBe(true)
    // 110 + 15 = 125 olmamalı, 120'de durmalı!
    expect(store.activeBuffs[0].remaining).toBe(120)
  })

  it('Crisis 3.0: Tatlı Noktada kaldıkça momentum artmalı, Meltdown durumunda 1.0 a sıfırlanmalıdır', () => {
    const store = useGameStore()
    store.reactorHeat = 85 // Sweet Spot (%61-90)
    expect(store.reactorPhase).toBe('sweet_spot')
    expect(store.reactorMomentum).toBe(1.0)

    // 10 saniye Tatlı Noktada kalış (+%20 momentum -> 1.2x)
    store.update(10)
    expect(store.reactorMomentum).toBeGreaterThan(1.15)
    expect(store.reactorMassMult).toBeGreaterThan(8.0) // 8.0 * momentum

    // Meltdown tetiklendiğinde momentum sıfırlanmalıdır
    store.triggerReactorMeltdown()
    expect(store.reactorMomentum).toBe(1.0)
    expect(store.reactorMassMult).toBe(0.5) // Meltdown yarıya indirme
  })
})
