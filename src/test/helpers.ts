import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '../stores/game'

/**
 * Ortak test yardımcısı — tüm store testleri buradan beslenir.
 *
 * Neden var: 6 store test dosyası aynı `setActivePinia(createPinia())`
 * tekrarını taşıyordu; deterministik RNG/saat da dosyadan dosyaya
 * farklıydı. Tek kaynak = tek davranış.
 */

/** Temiz Pinia üzerinde yeni oyun store'u kurar (test izolasyonu). */
export function createFreshStore() {
  setActivePinia(createPinia())
  return useGameStore()
}

/** Harness ile birebir aynı LCG (run.ts'teki mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * `fn` çalışırken Math.random'u tohumlu LCG ile değiştirir, sonra geri alır.
 * Store simülasyonlarını deterministik yapar (anomaliler, kriz RNG'si).
 */
export function withSeededRandom<T>(seed: number, fn: () => T): T {
  const prev = Math.random
  Math.random = mulberry32(seed)
  try {
    return fn()
  } finally {
    Math.random = prev
  }
}
