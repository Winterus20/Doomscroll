import confetti from 'canvas-confetti'

/**
 * Kutlama kapısı — tek doğruluk kaynağı.
 *
 * Kural: sayfa gizliyken (başka tarayıcı sekmesi / minimize) ASLA konfeti yok.
 * canvas-confetti rAF tabanlı olduğu için gizli sekmede birikir ve dönüşte
 * patlama olarak görünür; ayrıca `update()` offline yakalamaya devredilir.
 * Tüm kutlamalar bu fonksiyondan geçmelidir.
 */
export function isPageVisible(): boolean {
  if (typeof document === 'undefined') return false
  return !document.hidden
}

/** Görünür sayfada konfeti patlatır; gizliyken sessizce vazgeçer. */
export function safeConfetti(opts?: confetti.Options): boolean {
  if (!isPageVisible()) return false
  try {
    confetti(opts)
    return true
  } catch {
    return false
  }
}

/**
 * Oyun-içi sekme kapısı.
 * Otomatik olaylar (lab oto-sentezi gibi) yalnızca ilgili sekme açıkken kutlar;
 * yoksa durum yine ilerler, sadece efekt atlanır (rozet/toast kalır).
 */
export function shouldCelebrateOnTab(activeTab: string | null | undefined, requiredTab: string): boolean {
  if (!isPageVisible()) return false
  if (!activeTab) return true
  return activeTab === requiredTab
}
