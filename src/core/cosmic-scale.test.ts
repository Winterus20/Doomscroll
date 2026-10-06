import { describe, expect, it } from 'vitest'
import { Decimal } from './math'
import {
  COSMIC_PREY_TIERS,
  calculateCosmicPreyLadder,
  calculateEventHorizon,
  calculateWritingParadox
} from './cosmic-scale'

describe('cosmic-scale — Kozmik Av Merdiveni ve Eşdeğerlik', () => {
  it('tüm kademelerin kütlesi artan sırada ve benzersiz', () => {
    for (let i = 1; i < COSMIC_PREY_TIERS.length; i++) {
      expect(COSMIC_PREY_TIERS[i].massGrams).toBeGreaterThan(COSMIC_PREY_TIERS[i - 1].massGrams)
    }
    const ids = COSMIC_PREY_TIERS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('0 veya negatif kütlede güvenli taban döner', () => {
    const resZero = calculateCosmicPreyLadder(0)
    expect(resZero.currentTier.id).toBe('water_drop')
    expect(resZero.progressPct).toBe(0)

    const resNeg = calculateCosmicPreyLadder(new Decimal(-10))
    expect(resNeg.currentTier.id).toBe('water_drop')
  })

  it('Dünya kütlesinde (~5.972e27 g) Dünya tier\'ını ve bir sonrakini Jüpiter olarak seçer', () => {
    const earthMass = new Decimal('5.972e27')
    const res = calculateCosmicPreyLadder(earthMass)
    expect(res.currentTier.id).toBe('earth')
    expect(res.nextTier?.id).toBe('jupiter')
    expect(res.multiplier.toNumber()).toBeCloseTo(1, 2)
    expect(res.progressPct).toBeGreaterThanOrEqual(0)
    expect(res.progressPct).toBeLessThan(100)
  })

  it('1.79e308 kütlesinde en üst multiverse kademesini seçer', () => {
    const maxMass = new Decimal('1.79e308')
    const res = calculateCosmicPreyLadder(maxMass)
    expect(res.currentTier.id).toBe('multiverse')
    expect(res.nextTier).toBeNull()
    expect(res.progressPct).toBe(100)
  })
})

describe('cosmic-scale — Schwarzschild Olay Ufku', () => {
  it('0 kütlede 0 metre döner', () => {
    const res = calculateEventHorizon(0)
    expect(res.radiusMeters.eq(0)).toBe(true)
    expect(res.diameterFormatted).toBe('0 m')
  })

  it('Dünya kütlesi için (~5.972e27 g) ~17.7 mm (fındık/bilye) çapı hesaplar', () => {
    const earthMass = new Decimal('5.972e27')
    const res = calculateEventHorizon(earthMass)
    // Çap = 5.972e27 * 2.97036e-30 ≈ 0.0177 m = 17.7 mm
    const mm = res.diameterMeters.times(1000).toNumber()
    expect(mm).toBeGreaterThan(15)
    expect(mm).toBeLessThan(20)
    expect(res.unitName).toContain('Fındık')
  })

  it('Güneş kütlesi için (~1.989e33 g) ~5.9 km (kasaba/şehir) çapı hesaplar', () => {
    const sunMass = new Decimal('1.989e33')
    const res = calculateEventHorizon(sunMass)
    // Çap = 1.989e33 * 2.97036e-30 ≈ 5908 m ≈ 5.9 km
    const km = res.diameterMeters.div(1000).toNumber()
    expect(km).toBeGreaterThan(5.5)
    expect(km).toBeLessThan(6.5)
    expect(res.unitName).toContain('Kasaba / Şehir')
  })

  it('1.79e308 gramda ışık yılı cinsinden devasa değer döner', () => {
    const maxMass = new Decimal('1.79e308')
    const res = calculateEventHorizon(maxMass)
    expect(res.diameterMeters.gt('1e200')).toBe(true)
    expect(res.unitName).toBe('Galaktik Tekillik')
  })
})

describe('cosmic-scale — Çifte Zaman Paradoksu (Antimatter Dimensions)', () => {
  it('1.79e308 g için 309 basamak ve ~103 saniye (~1 dk 43 sn) hesaplar', () => {
    const maxMass = new Decimal('1.79e308')
    const res = calculateWritingParadox(maxMass)
    expect(res.digits.toNumber()).toBe(309)
    expect(res.digitsFormatted).toBe('309 basamak')
    expect(res.writingTimeFormatted).toContain('1 dk 43 sn')
    expect(res.countingUniverseAgesFormatted).toContain('Evrenin Yaşı')
  })

  it('küçük sayılarda (10 g) saniyeler ve fiş arkası notu döner', () => {
    const res = calculateWritingParadox(new Decimal(10))
    expect(res.digits.toNumber()).toBe(2)
    expect(res.humorousQuote).toContain('fişin arkasına')
  })

  it('0 veya NaN girişlerinde güvenle çökmeyi engeller', () => {
    const resZero = calculateWritingParadox(0)
    expect(resZero.digits.toNumber()).toBe(1)
    expect(resZero.writingTimeFormatted).toBe('0 saniye')

    const resNan = calculateWritingParadox(new Decimal(NaN))
    expect(resNan.digits.toNumber()).toBe(1)
  })
})
