import { ref } from "vue";
import { useGameStore } from "../stores/game";

/** /s delta oku: ~1.5 sn arayla mps ornegi, %5 bandi ustu yukari/asagi. */
export function useMpsTrend() {
  const store = useGameStore();
  const mpsTrend = ref<1 | 0 | -1>(0);
  let trendLastMps = 0;
  let trendLastT = 0;

  function updateTrend(now: number): void {
    if (now - trendLastT < 1500) return;
    try {
      const cur = store.matterPerSecond;
      if (trendLastT > 0 && cur.isFinite() && !cur.isNan()) {
        const c = cur.toNumber();
        if (Number.isFinite(c) && Number.isFinite(trendLastMps) && trendLastMps > 0 && c > 0) {
          const d = (c - trendLastMps) / trendLastMps;
          mpsTrend.value = d > 0.05 ? 1 : d < -0.05 ? -1 : 0;
        }
      }
      trendLastMps = cur.isFinite() && !cur.isNan() ? cur.toNumber() : 0;
      trendLastT = now;
    } catch {
      /* yoksay */
    }
  }

  function resetTrend(): void {
    mpsTrend.value = 0;
    trendLastMps = 0;
    trendLastT = 0;
  }

  return { mpsTrend, updateTrend, resetTrend };
}
