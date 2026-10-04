import { describe, expect, it } from 'vitest'

import {
  ARC_LOG10_MAX,
  DECADE_BANDS,
  arcProgress01,
  bandForLog10,
  bandProgress01,
  decadeGate,
  log10Safe,
  nextDecadeMilestone
} from './pacing'
import { Decimal } from '../core/math'

describe('pacing — dekad omurgası', () => {
  it('bantlar boşluksuz ve 0..308 aralığını tam kapsar', () => {
    expect(DECADE_BANDS[0].from).toBe(0)
    const last = DECADE_BANDS[DECADE_BANDS.length - 1]
    expect(last.to).toBe(ARC_LOG10_MAX)
    for (let i = 1; i < DECADE_BANDS.length; i++) {
      expect(DECADE_BANDS[i].from).toBe(DECADE_BANDS[i - 1].to)
      expect(DECADE_BANDS[i].to).toBeGreaterThan(DECADE_BANDS[i].from)
    }
  })

  it('bant kimlikleri benzersiz', () => {
    const ids = DECADE_BANDS.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('log10Safe NaN Decimal karşısında 0 döner (AGENTS.md kuralı)', () => {
    const nan = new Decimal(NaN)
    expect(log10Safe(nan)).toBe(0)
    expect(log10Safe(new Decimal('1e120'))).toBe(120)
    expect(log10Safe(new Decimal(0))).toBe(0)
  })

  it('bandForLog10 doğru bandı seçer', () => {
    expect(bandForLog10(0).id).toBe('awaken')
    expect(bandForLog10(7.9).id).toBe('awaken')
    expect(bandForLog10(8).id).toBe('crisis')
    expect(bandForLog10(307).id).toBe('threshold')
    expect(bandForLog10(4000).id).toBe('threshold')
    expect(bandForLog10(-5).id).toBe('awaken')
  })

  it('bandProgress01 0..1 aralığında ve kenarlarda doğru', () => {
    const band = bandForLog10(20)
    expect(bandProgress01(band.from, band)).toBe(0)
    expect(bandProgress01(band.to, band)).toBe(1)
    expect(bandProgress01(-100, band)).toBe(0)
    expect(bandProgress01(1e6, band)).toBe(1)
  })

  it('arcProgress01 koşunun tamamını 0..1 olarak ölçer', () => {
    expect(arcProgress01(new Decimal(1))).toBe(0)
    expect(arcProgress01(new Decimal('1e154'))).toBeCloseTo(0.5, 6)
    expect(arcProgress01(new Decimal('1e308'))).toBeCloseTo(1, 6)
    expect(arcProgress01(new Decimal('1e4000'))).toBe(1)
    expect(arcProgress01(new Decimal(NaN))).toBe(0)
  })

  it('decadeGate dopamin kapısı string üretir', () => {
    expect(decadeGate(50)).toBe('1e50')
    expect(decadeGate(308)).toBe('1e308')
  })

  it('nextDecadeMilestone bir sonraki onluğa kalanı verir', () => {
    const m = nextDecadeMilestone(new Decimal('1e120'))
    expect(m.exp).toBe(121)
    expect(m.remaining.gt(0)).toBe(true)

    const capped = nextDecadeMilestone(new Decimal('1e4000'))
    expect(capped.exp).toBe(ARC_LOG10_MAX)
    expect(capped.remaining.eq(0)).toBe(true)
  })
})
