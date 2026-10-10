import { describe, expect, it } from 'vitest'

import { useGameStore } from './game'
import { createFreshStore, withSeededRandom } from '../test/helpers'

/**
 * Store duman testi — birim testler ile headless sim harness arasındaki
 * hızlı kapı.
 *
 * Fikir: GERÇEK Pinia store'u vitest içinde ~5 dakikalık aktif oyunu
 * (5 tık/sn + 2 sn'de bir maxAll, tohumlu RNG) koşar. Esbuild derlemesi
 * gerekmez, ~10 sn sürer. Amacı fizik doğruluğu değil, "oyun açılıyor ve
 * ekonomi nefes alıyor mu" sorusuna CI-hızında cevap vermektir.
 *
 * Uzun denge ölçümleri (3-4 saatlik ilk tekillik bandı) hâlâ
 * `brain/scratchpad/harness` + `npm run harness:smoke` işidir.
 */
describe('store duman testi (5 dakikalık aktif oyun)', () => {
  it('çökmez, NaN üretmez ve ekonomi büyür', () => {
    withSeededRandom(1, () => {
      const store = useGameStore()
      const start = store.matter

      const DT = 0.1
      const TICKS = 3000 // 300 sn simüle süre
      for (let tick = 0; tick < TICKS; tick++) {
        for (let c = 0; c < 5; c++) {
          if (tick % 10 === c * 2) store.manualClick()
        }
        if (tick % 20 === 0) store.maxAll()
        store.update(DT)
      }

      expect(store.matter.isNan() || Number.isNaN(store.matter.mag)).toBe(false)
      expect(Number.isFinite(store.matter.log10().toNumber())).toBe(true)
      expect(store.matter.gt(start)).toBe(true)
    })
  })

  it('deterministiktir: aynı tohum aynı sonucu verir', () => {
    const runOnce = (): string =>
      withSeededRandom(7, () => {
        const store = createFreshStore()
        for (let tick = 0; tick < 500; tick++) {
          if (tick % 20 === 0) store.maxAll()
          store.update(0.1)
        }
        return store.matter.toString()
      })
    // Her koşu temiz Pinia'da başlar; sonuç tohumla sabitlenir.
    expect(runOnce()).toBe(runOnce())
  })
})
