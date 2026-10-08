# ADR-0050 — Lab Rebalance (P0 + P1)

> Not: `0034` ön eki dolu (`0034-sp-only-at-dawn-…`), sıradaki boş numara `0050`'dir.
> Klasör listesiyle doğrulandı (maks. `0049`).

- Tarih: 2026-10-08
- Durum: Kabul edildi (implementasyon ana ajanda; sözleşme testleri: `tests/lab-rebalance.spec.ts`)
- Kapsam: `src/stores/game.ts` (Lab tick/vent/hasat), `src/components/LabTab.vue` (UI ipuçları)

## 1. Sorun

Lab (`lab` kilidi 1e65; tohumlar 1e80 / 1e100 / 1e125 — `src/game/unlocks.ts`) oyun-sonu motoru
olması gerekirken dört dengesizlik var:

1. **Bedava tohum etkisi:** `plantSeed` bedel düşüyor (`game.ts:3828-3830`) ama tohum bedelleri
   (500 → 1e15, `LAB_SEEDS`) gelire göre sembolik kalıyor; matris maliyetsiz doluyor.
2. **18 sn spam:** hype formülü `(0.35 + mature*0.3) * modeMult` (`game.ts:4925`) 9 olgun +
   overdrive (1.8x) ile 5.49/sn üretiyor → bar ~18.2 sn'de doluyor, vent (60 sn'lik ödül +
   25 sn viral, `triggerViralDrop`) sürekli dönüyor.
3. **9x Higgs meta:** Higgs `×3` küresel (`LAB_SEEDS` + satır ~2610) istiflenince 3² = 9x;
   başka egzotik dizilimi rekabet edemiyor.
4. **Ölü fluctuation:** rejim yalnızca sentez şansını 0.04 → 0.12 çıkarıyor (`game.ts:4942`);
   hasat/vent tarafında hiçbir karşılığı yok, kimse seçmiyor.

## 2. Karar (P0 + P1 paketleri)

**P0 — frenler (davranış değişikliği, bu ADR ile):**

- **P0-1 Vent cooldown 120 sn:** `triggerViralDrop`'a `lastVentAtSeconds` kaydı eklenir;
  ateşleme koşulu `hype >= 100 && !isViralActive && (now - lastVentAt >= 120)` olur.
  Sınır dahil (119 → kilitli, 120 → açık).
- **P0-2 Egzotik yarı-bonus:** ilk egzotik tam, sonrakiler yarı ağırlıkla çarpılır:
  `first * Π(1 + (b-1) * 0.5)`. Çift Higgs 9x → 6x. Sıralamadan bağımsız (en büyük tam sayılır).
- **P0-3 Hype formülü sabitlenir:** `(0.35 + mature*0.3) * modeMult`, overdrive 1.8, diğerleri 1.0;
  superconductor şarjı durdurur (mevcut davranış korunur, teste pinlendi).

**P1 — fluctuation canlandırma:**

- **P1-1 Fluctuation x2 hasat:** fluctuation rejiminde her hasat %20 (kabul bandı %15–25)
  ihtimalle ×2 düşer. Diğer rejimlerde her zaman ×1.

## 3. Sonuçlar

- **Olumlu:** vent döngüsü ~18 sn → ≥120 sn'ye iner; Higgs istifi 9x → 6x'e geriler;
  fluctuation ilk kez hasat tarafında anlam kazanır; tohum maliyetleri hissedilir olur.
- **Olumsuz / risk:** mevcut kayıtlarda birikmiş hype/viral zamanlaması ilk tick'te
  `lastVentAtSeconds = -∞` kabulüyle bir kez ücretsiz vent verebilir (tek seferlik, kabul edildi).
- **Test:** sözleşme `tests/lab-rebalance.spec.ts`'te pinli (hype formülü, 120 sn cooldown,
  yarı-bonus, x2 bandı, mock-store tick→vent döngüsü). `npm run build` çalıştırılmadı
  (paralel ajanlar dosyaları değiştiriyor); yalnızca ilgili spec koşturuldu.
- **Geri alma:** P0-1/P1-1 tek sabitle (`VENT_COOLDOWN_SECONDS`, `FLUCT_DOUBLE_CHANCE`)
  ayarlanabilir; P0-2 `EXOTIC_HALF_WEIGHT` ile yumuşatılabilir.
