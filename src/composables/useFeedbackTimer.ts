import { ref, onUnmounted } from "vue";

/**
 * Ayarlar ve kayıt bileşenlerinde kullanılan kısa süreli geri bildirim
 * rozetleri (kopyalandı / kaydedildi / indirildi) için zamanlayıcı havuzu.
 *
 * Her bileşen örneği kendi havuzunu tutar; unmount anında bekleyen tüm
 * zamanlayıcılar temizlenir, sızıntı olmaz.
 */
export function useFeedbackTimer() {
  const copyFeedback = ref(false);
  const saveFeedback = ref(false);
  const downloadFeedback = ref(false);

  const pendingFeedbackTimers: number[] = [];

  function later(fn: () => void, ms: number): number {
    const id = window.setTimeout(() => {
      const idx = pendingFeedbackTimers.indexOf(id);
      if (idx !== -1) pendingFeedbackTimers.splice(idx, 1);
      fn();
    }, ms);
    pendingFeedbackTimers.push(id);
    return id;
  }

  onUnmounted(() => {
    for (const id of pendingFeedbackTimers) clearTimeout(id);
    pendingFeedbackTimers.length = 0;
  });

  return {
    copyFeedback,
    saveFeedback,
    downloadFeedback,
    pendingFeedbackTimers,
    later
  };
}
