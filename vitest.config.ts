import path from 'node:path'
import { configDefaults, defineConfig } from 'vitest/config'

/**
 * Vitest is only wired for the pure, framework-free game-data modules under
 * `src/game/`. No component rendering, so `node` environment and zero
 * DOM shims are enough — which keeps the suite fast and the dependency list
 * to a single devDependency.
 */
export default defineConfig({
  // Mirror the app alias so future tests can use '@/...' like the source does.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'dist/**', 'brain/**'],
    // Data-only suite: no DOM, no globals, explicit imports from 'vitest'.
    globals: false
  }
})
