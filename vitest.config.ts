import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

/**
 * Vitest — iki katmanlı test harness'in hızlı katmanı.
 *
 * Kapsama:
 * - `src/**` — birim + store testleri (`*.test.ts`), DOM'suz `node` ortamı.
 * - `tests/**` — ADR sözleşme spec'leri (`*.spec.ts`, örn. lab-rebalance).
 *   Eskiden include dışıydı; `src/game/lab-rebalance.test.ts` shimiyle
 *   dolambaçlı koşuyordu. Shim silindi, spec tek kaynaktır.
 * - `src/test/setup.ts` her testten önce Pinia'yı sıfırlar (izolasyon).
 */
export default defineConfig({
  // Mirror the app alias so future tests can use '@/...' like the source does.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: [...configDefaults.exclude, 'dist/**', 'brain/**'],
    setupFiles: ['src/test/setup.ts'],
    // Store duman testi (smoke.test.ts) binlerce tick sürer; varsayılan
    // 5 sn yetmez. Yavaşlık = bulgu değil, simülasyon maliyetidir.
    testTimeout: 60_000,
    // Data-only suite: no DOM, no globals, explicit imports from 'vitest'.
    globals: false
  }
})
