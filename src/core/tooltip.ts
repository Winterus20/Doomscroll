import type { Directive } from 'vue'

/**
 * v-tip — devre dışı (oyundaki tooltipler kaldırıldı).
 *
 * Şablonlardaki onlarca v-tip kullanımı tek tek silinmek yerine direktif
 * etkisiz hale getirildi: hiçbir katman oluşturulmaz, hiçbir dinleyici
 * eklenmez, hiçbir ipucu gösterilmez.
 */
export const vTip: Directive<HTMLElement, string> = {
  mounted() {},
  updated() {},
  unmounted() {}
}
