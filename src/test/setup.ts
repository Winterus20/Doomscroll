import { beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

/**
 * Global test kurulumu (vitest.config.ts → setupFiles).
 *
 * Her test, izole bir Pinia ile başlar: bir testin store'a yazdığı
 * durum bir sonrakine sızamaz. Dosya-içi `beforeEach` tekrarına gerek yok;
 * store'a ihtiyacı olan test `createFreshStore()` da çağırabilir
 * (`src/test/helpers.ts`) — ikisi birbirinin aynısıdır, çift kurulum zararsızdır.
 */
beforeEach(() => {
  setActivePinia(createPinia())
})
