import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  useGameStore,
  dimensionCostForBucket,
  BASE_COSTS,
  COST_MULTS,
  B0_BUCKET_THRESHOLD,
  COST_ACCEL_DECADES_PER_STEP,
  EARLY_D1_COST_RATIO,
  EARLY_D1_SOFT_BUCKETS,
  EARLY_D2_COST_RATIO,
  EARLY_D2_SOFT_BUCKETS,
  EARLY_D3_COST_RATIO,
  EARLY_D3_SOFT_BUCKETS,
  EARLY_D4_COST_RATIO,
  EARLY_D4_SOFT_BUCKETS,
  EARLY_D5_COST_RATIO,
  EARLY_D5_SOFT_BUCKETS,
  EARLY_D6_COST_RATIO,
  EARLY_D6_SOFT_BUCKETS
} from './game'
import { Decimal } from '../core/math'

/**
 * ADR-0051 — Kademeli Maliyet İvmelenmesi doğrulaması.
 *
 * Dört garanti:
 *  (a) B0 eşiği altındaki fiyatlar ivmelenme ÖNCESİ formülle birebir aynı,
 *  (b) B0 üstünde efektif kova oranı monoton artar (oran ivmesi = COST_ACCEL_DECADES_PER_STEP),
 *  (c) maksimum alım hesapları yeni oranla tutarlıdır (kova yolu + geometrik seri yolu),
 *  (d) B0'da kesintisizlik: ne maliyet değeri ne de ilk oran sıçrar.
 */

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8]

/** Erken merdiven tabloları (ADR-0026) — test, kaynağı olmadan eski formülü yeniden kurar. */
const EARLY_LADDER: Array<{ ratio: number; soft: number }> = [
  { ratio: EARLY_D1_COST_RATIO, soft: EARLY_D1_SOFT_BUCKETS },
  { ratio: EARLY_D2_COST_RATIO, soft: EARLY_D2_SOFT_BUCKETS },
  { ratio: EARLY_D3_COST_RATIO, soft: EARLY_D3_SOFT_BUCKETS },
  { ratio: EARLY_D4_COST_RATIO, soft: EARLY_D4_SOFT_BUCKETS },
  { ratio: EARLY_D5_COST_RATIO, soft: EARLY_D5_SOFT_BUCKETS },
  { ratio: EARLY_D6_COST_RATIO, soft: EARLY_D6_SOFT_BUCKETS }
]

/** İvmelenme eklenmeden ÖNCEKİ eski formül (operatör sırası kaynağıyla birebir). */
function legacyCost(tier: number, bucket: number): Decimal {
  const baseCost = BASE_COSTS[tier - 1]
  const fullMult = COST_MULTS[tier - 1]
  if (tier <= 6) {
    const { ratio, soft } = EARLY_LADDER[tier - 1]
    if (bucket < soft) {
      return baseCost.times(Decimal.pow(ratio, bucket))
    }
    return baseCost
      .times(Decimal.pow(ratio, soft))
      .times(Decimal.pow(fullMult, bucket - soft))
  }
  return baseCost.times(Decimal.pow(fullMult, bucket))
}

function cost(tier: number, bucket: number): Decimal {
  return dimensionCostForBucket(tier, bucket, BASE_COSTS[tier - 1], COST_MULTS[tier - 1])
}

describe('ADR-0051 Kademeli Maliyet İvmelenmesi', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('(a) B0 eşiği altındaki tüm fiyatlar eski formülle birebir aynı (ADR-0023/ADR-0026 korunur)', () => {
    for (const tier of TIERS) {
      for (let bucket = 0; bucket < B0_BUCKET_THRESHOLD; bucket++) {
        const fresh = cost(tier, bucket)
        const legacy = legacyCost(tier, bucket)
        expect(
          fresh.eq(legacy),
          `tier ${tier} bucket ${bucket}: ${fresh.toString()} ≠ eski ${legacy.toString()}`
        ).toBe(true)
      }
    }
  })

  it('(b) B0 üstünde efektif kova oranı monoton artar ve her adımda tam COST_ACCEL_DECADES_PER_STEP ondalık ekler', () => {
    for (const tier of TIERS) {
      let prevLogRatio = Number.NEGATIVE_INFINITY
      for (let bucket = B0_BUCKET_THRESHOLD; bucket < B0_BUCKET_THRESHOLD + 120; bucket++) {
        const ratio = cost(tier, bucket + 1).div(cost(tier, bucket))
        const logRatio = ratio.log10().toNumber()
        expect(Number.isFinite(logRatio)).toBe(true)
        // Monoton artış (eşitlik de kabul: artış asla azalmaz)
        expect(logRatio).toBeGreaterThanOrEqual(prevLogRatio - 1e-9)
        if (bucket > B0_BUCKET_THRESHOLD) {
          // Oran ivmesi tam olarak tanımlı:S ondalık/kova
          expect(logRatio - prevLogRatio).toBeCloseTo(COST_ACCEL_DECADES_PER_STEP, 6)
        }
        prevLogRatio = logRatio
      }
      // Uzak kovalarda fiyat kesinlikle eski formülden pahalıdır
      expect(cost(tier, B0_BUCKET_THRESHOLD + 60).gt(legacyCost(tier, B0_BUCKET_THRESHOLD + 60))).toBe(true)
    }
  })

  it('(d) B0 eşiğinde kesintisizlik: değer ve ilk oran eski formülle aynı, sıçrama yok', () => {
    for (const tier of TIERS) {
      const fullMult = COST_MULTS[tier - 1]

      // Değer sürekliliği: eşikte çarpan tam 1
      expect(cost(tier, B0_BUCKET_THRESHOLD).eq(legacyCost(tier, B0_BUCKET_THRESHOLD))).toBe(true)

      // Son merdiven altı oran (B0-1 → B0) eski oran ile birebir
      const ratioBefore = cost(tier, B0_BUCKET_THRESHOLD).div(cost(tier, B0_BUCKET_THRESHOLD - 1))
      expect(Math.abs(ratioBefore.log10().toNumber() - fullMult.log10().toNumber())).toBeLessThan(1e-9)

      // İlk ivmelenen oran (B0 → B0+1) de tam fullMult: ilk adımda ek maliyet 0
      const ratioAtSeam = cost(tier, B0_BUCKET_THRESHOLD + 1).div(cost(tier, B0_BUCKET_THRESHOLD))
      expect(Math.abs(ratioAtSeam.log10().toNumber() - fullMult.log10().toNumber())).toBeLessThan(1e-9)

      // İkinci oran yalnızca S kadar büyür (yumuşak rampa, ani sıçrama yok)
      const ratioSecond = cost(tier, B0_BUCKET_THRESHOLD + 2).div(cost(tier, B0_BUCKET_THRESHOLD + 1))
      const jump = ratioSecond.log10().toNumber() - ratioAtSeam.log10().toNumber()
      expect(jump).toBeCloseTo(COST_ACCEL_DECADES_PER_STEP, 9)
      expect(jump).toBeLessThan(0.1)
    }
  })

  it('(c) getDimensionCost, ivmelenen kova fiyatını birebir yansıtır (UI tek darboğaz)', () => {
    const store = useGameStore()
    for (const tier of [1, 2, 3]) {
      const bucket = B0_BUCKET_THRESHOLD + 25
      store.dimensions[tier - 1].bought = bucket * 10
      expect(store.getDimensionCost(tier).eq(cost(tier, bucket))).toBe(true)
    }
  })

  it('(c) buyMaxDimension yeni oranla tutarlı: tam bütçeyle tam paket sayısı, bir birim eksik bütçeyle bir paket az', () => {
    const store = useGameStore()
    const tier = 1
    const startBucket = B0_BUCKET_THRESHOLD + 20
    store.dimensions[tier - 1].bought = startBucket * 10
    const packs = 5

    // Paketlerin tam toplam bütçesi
    let exact = new Decimal(0)
    for (let i = 0; i < packs; i++) {
      exact = exact.plus(cost(tier, startBucket + i))
    }

    // Tam bütçe: paket tam olarak satın alınır
    store.matter = new Decimal(exact)
    const bought = store.buyMaxDimension(tier, false, false)
    expect(bought).toBe(true)
    expect(store.dimensions[tier - 1].bought).toBe(startBucket * 10 + packs * 10)
    expect(store.matter.eq(0)).toBe(true)

    // Bütçe 5. paketin yarısı: 4 paket + kovada 5 tekil birim alınır (kısmi kova doğru fiyatlanır)
    const sum4 = new Decimal(0).plus(cost(tier, startBucket)).plus(cost(tier, startBucket + 1))
      .plus(cost(tier, startBucket + 2)).plus(cost(tier, startBucket + 3))
    store.dimensions[tier - 1].bought = startBucket * 10
    store.matter = sum4.plus(cost(tier, startBucket + 4).times(0.5))
    store.buyMaxDimension(tier, false, false)
    expect(store.dimensions[tier - 1].bought).toBe(startBucket * 10 + 45)
    // Kalan para bir sonraki tek birimin fiyatından kesinlikle küçüktür (maksimalite)
    expect(store.matter.lt(store.getDimensionCost(tier).div(10))).toBe(true)
    // Kütlenin negatife düşmesi imkânsız
    expect(store.matter.gte(0)).toBe(true)
  })

  it('(c) previewDimensionBuy ile gerçek satın alma aynı ivmelenen fiyatı kullanır', () => {
    const store = useGameStore()
    const tier = 3
    const startBucket = B0_BUCKET_THRESHOLD + 10
    store.dimensions[tier - 1].bought = startBucket * 10
    store.matter = cost(tier, startBucket).times(3).plus(cost(tier, startBucket + 1).times(10))

    const preview = store.previewDimensionBuy(tier)
    expect(preview).not.toBeNull()
    if (preview === null) return

    const before = store.dimensions[tier - 1].bought
    const matterBefore = new Decimal(store.matter)
    const ok = store.buyDimensionUnits(tier, false)
    expect(ok).toBe(true)
    expect(store.dimensions[tier - 1].bought).toBe(before + preview.units)
    expect(matterBefore.minus(store.matter).eq(preview.cost)).toBe(true)
  })

  it('(c) Geometrik seri yolu (tickspeed buyMax) tutarlı kalır: negatif yok, sonraki adım karşılanamaz', () => {
    const store = useGameStore()
    store.matter = new Decimal('1e60')
    const ok = store.buyMaxTickspeed(false, false)
    expect(ok).toBe(true)
    expect(store.tickspeedBought).toBeGreaterThan(0)
    expect(store.matter.gte(0)).toBe(true)
    // Bir sonraki frekans adımı bütçeyi aşar → maksimum alım doğru durmuş
    expect(store.tickspeedCost.gt(store.matter)).toBe(true)
  })
})
