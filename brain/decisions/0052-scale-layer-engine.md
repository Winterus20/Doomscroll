# ADR-0052: Ölçek Sıçrama Motoru (Scale Layer Engine)

- **Tarih:** 2026-10-10
- **Durum:** Kabul edildi, uygulandı
- **Kapsam:** `src/game/layers.ts` (yeni), `src/stores/game.ts` (motor + sarmalayıcılar),
  `src/models/types.ts` (`ScaleJumpRecord`), `src/core/save-version.ts` (v17)
- **Geriye dönük uyumluluk:** YOK (kullanıcı kararı). v16 ve öncesi kayıtlar açılmaz.

## 1. Problem

Shift / Galaxy / Singularity üç ayrı el-yazması gövdeydi. Her birinde gereksinim,
sıfırlanan/korunan alan listesi ve etki üç ayrı yerde elle senkron tutuluyordu:

- `dimensionShift()` / `buyGalaxy()` / `resetRunState()` gövdelerinde kopyala-yapıştır
  sıfırlama blokları (matter/dims/tickspeed/optimizer örnekleri üç kez tekrar).
- `matterPerSecond` ve `getDimensionMultiplier` tek dev ifadelerdi: bir çarpanın
  kökeni UI'da gösterilemiyor, testte izole edilemiyordu.
- Ölü kod: `singularityHoldActive` sabit `false` döndürüyordu; tekillik fiilen
  tamamen opsiyoneldi (denetim: `brain/research/game-math-audit.md` §4, §9).

## 2. Karar

**Tek motor + veri olarak katmanlar:**

- `src/game/layers.ts` (framework'süz, Pinia/`window`/ses yok):
  - `SCALE_LAYERS`: her katman için `{ order, scope, fx }`. Yeni katman = bir tanım
    satırı, davranış kodu yok.
  - `ResetScope`: `zeroCounters`, `resetMatter/Dimensions/Tickspeed/OptimizerSamples`,
    `clearPrestigeEphemerals` (slacker+sacrifice), `clearRunFx` (buff/anomali/debuff/
    viral+decadeSurge), `refundChoiceNodes`.
  - `applyResetScope(host, scope, neuralTree)`: saf durum mutasyonu; en küçük port
    (`ScaleJumpHost`) üzerinden sahte nesneyle test edilir.
  - `recordJump`: sıçrama günlüğü (son 100, başa ekleme).
- Store yalnızca orkestrasyon yapar: `performScaleJump` (guard → sayaç → unlock →
  snapshot → kapsam → challenge kancası → fx), `snapshotJump`, ince sarmalayıcılar
  `dimensionShift` / `buyGalaxy` / `singularityReset` (UI ve botlar aynı isimleri
  çağırır; arayüz değişmedi).
- `resetRunState()` = `syncUnlocks + ensureAutobuyersPreserved +
  SCALE_LAYERS.singularity.scope`. Challenge giriş/çıkış/tamamlama aynı kapsamı
  kullanır; davranış birebir korunur.
- Çarpan dökümleri: `getDimensionBreakdown(tier)` ve `matterProductionBreakdown`
  — sıcak yolla AYNI sırada AYNI çarpanlar, kaynak etiketli. Sıcak yol
  (`getDimensionMultiplier`, `matterPerSecond`) ve önbellek aynen durur.
- Ölü `singularityHoldActive` silindi (başka referansı yoktu).
- `jumpLog` kalıcı state'e eklendi (serialize/deserialize + clamp).
- Kayıt sürümü v17; asgari v17. Göç kodu YOK — eski kayıtlar wipe yolundan silinir.

## 3. Kapsam tablosu

| Katman | Sayaç işlemi | Sıfırlar | Korur |
| :--- | :--- | :--- | :--- |
| shift | shifts+1 | matter, dims, tickspeed, optimizer | shifts, galaxies, slacker, bufflar, SP |
| galaxy | galaxies+1, shifts=0 | (aynı koşu seti) | galaxies, slacker, bufflar, SP |
| singularity | singularities+1 (+SP/stats) | koşu seti + shifts/galaxies + slacker/sacrifice + runFx + choice-iade | SP havuzu, botlar, nap, başarımlar |

## 4. Test

- `src/game/layers.test.ts` (5 test, saf): kayıt defteri bütünlüğü, kapsam
  monotonluğu (shift ⊂ galaxy ⊂ singularity), üç kapsamın sıfırla/koru kümeleri,
  choice-SP iadesi (2 lvl × 7 = 14), günlük sıralama + 100 kapak.
- `src/stores/scale-jumps.test.ts` (10 test): sayaç işlemleri, red yolu (günlüğe
  yazılmaz), singularity SP (=1) + kalıcı koruması, resetRunState korumaları,
  breakdown paritesi (8 tier + mps, `.eq` birebir), etiket tekilliği.
- Davranış paritesi: harness active seed 1 toplamı refactor öncesi/sonrası aynı
  olmalı (aşağıda §5).

## 5. Doğrulama

- `npx vitest run` tam süit yeşil, `npm run build` (vue-tsc + vite) temiz.
- Harness parite koşusu: `results-scale-engine.json` toplamı `results-accel-c.json`
  (11:38:27) ile birebir eşleşmeli — aynı seed, aynı sayılar (motor sayılara
  dokunmaz, yalnızca yapıyı taşır).
