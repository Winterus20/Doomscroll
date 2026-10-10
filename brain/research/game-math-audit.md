# UROBOROS Oyun Matematiği Denetimi (2026-10-10)

Üç paralel salt-okunur taramanın (maliyet / üretim-prestij / tempo-belgeler) birleştirilmiş
hâlidir. Yük taşıyan tüm iddialar koda karşı doğrulanmıştır; doğrulanamayanlar işaretlidir.
Kısaltmalar: `game.ts` = `src/stores/game.ts`.

## 0. Yönetici özeti: büyüme rejimleri

| Rejim | Maliyet tarafı | Üretim tarafı | Sonuç |
| :--- | :--- | :--- | :--- |
| Erken (kova ≤ 30) | sabit oran (kova başına `COST_MULTS`) | kova başına ×1.595 + shift üsleri | hızlı rampa, içerik ritmi 15–30 dk |
| Geç (kova > 30) | oran her kovada +0.011 ondalık (ADR-0051, S=0.011) | aynı üstel büyüme | duvar: 250→260 2.3 sn → 158.8 sn (69×) |
| Tekillik | eşik 1.79e308, hold **yok** (`singularityHoldActive` sabit `false`, game.ts:1949-1951) | SP = `10^(logDiff/100)` (break ile /45) | sınır prestijle aşılır, zorunlu durma yok |

## 1. Maliyet zinciri

**Tabanlar** (game.ts:164-184):
- `BASE_COSTS = [10, 100, 1e4, 1e6, 1e9, 1e13, 1e18, 1e24]` (D1..D8)
- `COST_MULTS = [1e3, 1e4, 1e5, 1e6, 1e8, 1e10, 1e12, 1e15]` (kova başına; 1 kova = 10 adet)

**Erken merdivenler** (game.ts:188-201): D1 ×55/4 kova, D2 ×42/3, D3 ×32/3, D4 ×28/2,
D5 ×24/2, D6 ×20/2; D7–D8 merdivensiz. İvmelenme öncesi taban formül
(`dimensionCostWithoutAcceleration`, game.ts:1084-1139): merdiven altı `base·ratio^b`,
üstü `base·ratio^soft·fullMult^(b-soft)`.
⚠️ ADR-0026 yalnızca D1+D2 merdivenini belgeler; D3–D6 merdivenlerini veren ADR
**doğrulanamadı** (karar kaydı eksik).

**İvmelenme** (ADR-0051; game.ts:1061-1077): `B0_BUCKET_THRESHOLD = 30` (= 300 adet),
`COST_ACCEL_DECADES_PER_STEP (S) = 0.011`. Çarpan `F(b) = 10^(S·d·(d−1)/2)`, `d = b − B0`.
Kesintisizlik: d=0 ve d=1'de F=1 → B0'da değer ve ilk oran eski formülle birebir;
rampa d=2'den itibaren yumuşak başlar. S önce 0.02 idi; harness oyuncuyu ~1e216'da
kalıcı durdurduğunu gösterince 0.011'e kalibre edildi.

**Toplamlar:** `calcDimensionExactTotal` (game.ts:1157-1178) kısmi-kova bilinçli tek-tek
toplar; `calcMaxDimensionPacks` (game.ts:1180-1200) kova-kova döner.
`MAX_BUY_PACKS_CAP`: ilk koşu 380, prestij sonrası 2800 (game.ts:1044-1049).
Tüm alım yolları (`buyDimension`, `buyMaxDimension`, `buyOneUnit`, `buyDimensionUnits`,
`previewDimensionBuy`, `getDimensionCost`, tüm botlar) tek darboğaz
`dimensionCostForBucket`'tan geçer (game.ts:1141-1155).

**Tickspeed (kovadan bağımsız):** fiyat `1000·16^n` (game.ts:1739-1753; stance private
×0.85, başarım ×0.95, challenge çarpanları; her adımda floor). Toplam kapalı geometrik
formül, tahmin log10 + ±8 guard (game.ts:1203-1257). İvmelenmeden etkilenmez (ADR-0051 §4).

**Test:** `src/stores/cost-acceleration.test.ts` — 7 test (ADR metni "8 test" der;
**sayı tutarsızlığı, minör**): B0 altı birebirlik, oran monotonluğu (Δlog10 = S),
B0 kesintisizliği, buyMax/preview/tickspeed tutarlılığı.

## 2. Üretim zinciri

**Akış yönü:** D8→…→D1→matter (normal, game.ts:5446-5460); C4'te tek tier'lar iki
basamak atlar (game.ts:5427-5444). Kademe besleme:
`feed = amount × dimMult × tickspeedMult × achMult × 0.060 × dt`
(`DIMENSION_CHAIN_RATE = 0.060`, game.ts:186).

**matterPerSecond** (game.ts:3145-3175; `update` kopyası 5462-5492):
`mps = amount_D1 × dimMult_1 × tickspeedMult × colonyMult × napMult × stanceProd
× buffProd × labPassive × achMult × achProdMult × reactorMassMult × relicUniversalMass
× (crisisBackfire ? 0.5 : 1) × (1 − leech) × challengeProdMult`.
C2 durmada üretim 0 (game.ts:3146, 2658-2661).

**Boyut çarpanı** (`getDimensionMultiplier`, game.ts:2296-2420):
`(1.595^bölüm) × resolutionMult × shiftBase^shifts × 2^eyeLvl × (D8'de sacrificeMult)
× ayna-sinerji (1+√partner×0.15) × relic-hücre × neuralProd × challengeDimMult
× çift-tier × 8/8 (×1.25) × challengeTimeMult × tierProd × formatBuff (×1.25)`.
`DIM_PER_TEN_MULT = 1.595` (game.ts:215). Resolution eşikleri: 50→2, 100→3, 200→4,
250→8, 500→16, 1000→32 (game.ts:154-161).

**Tickspeed çarpanı** (game.ts:1710-1735): taban `max(0.7, 0.89 − 0.02×fast_charger − relic)`,
galaksi indirimi `−galaxies×0.008` (taban 0.35); `mult = (1/galaxyBonus)^(bought×buyScale) × …`.

## 3. Shift / Galaxy / Sacrifice

- `BASE_SHIFT_POWER = 1.66` (challenges.ts:183); başarım `shift_power_boost` 1.9, C7 ödülü 2.2;
  `shiftPowerMultiplier = singleShiftPower^shifts` (game.ts:1847-1855).
- Gereksinim (game.ts:1858-1896): shifts<6'da tier `min(8, 3+shifts)`, adet 10/15/25;
  shifts≥6'da D8'de `26+16×(shifts−6)`. Shift tüm üretimi sıfırlar (game.ts:3704-3731).
- Galaxy (game.ts:1906-1924, 3760-3805): gereksinim `40+galaxies×20` (60 üstü kuadratik);
  **doğrudan üretim çarpanı yok** — yalnızca tickspeed tabanını iyileştirir.
- Sacrifice (yalnızca D8): ödül `(1+log10(D1)/4)^2.5`, koşul mevcut ×1.15 üstü
  (game.ts:1829-1844).

## 4. Tekillik ve SP

- Eşik `D_INFINITY = 1.79…e308` (math.ts:31, pacing.ts:22); `canSingularity = matter ≥ eşik`.
- **Hold yok:** `singularityHoldActive()` sabit `false` (game.ts:1949-1951) — tekillik
  hazırken Shift/Galaxy basılabilir. (Oturum notlarındaki "hold Shift/Küme botunu
  durduruyor" ifadesi güncel kodu yansıtmaz; kodda hold mekaniği kaldırılmış.)
- `singularityGain` (game.ts:2243-2267): challenge'da 0; `gain = floor(10^(logDiff/100)
  × base × dawnSpeed × spMult × relicSp)`, break ile bölen 45 ve taban 3.
  (`dawn_harbinger` ×2, C8 ×1.15, relik L3 `1+(n−2)×0.5`.)
- Reset korur: botlar/nap/SP/başarımlar/neural (game.ts:3810-3868); sıfırlar: matter,
  boyutlar, tickspeed, shift, galaxy, buff/debuff/viral, decadeSurge.
- Oto-tekillik: bot açık + eşik + min SP + koşu ≥10 sn + decelStreak ≥3 (game.ts:4008-4016).
- `break_singularity`: maliyet 4 SP, tek seferlik (game.ts:596-604).

## 5. Botlar (otomatik alıcılar)

Maliyetler (game.ts:967-980): dim1 1e9 … dim8 1e35, tickspeed 1e11, shift 1e10,
galaxy 1e28, singularity 1.79e308. İlerleme kilitleri (game.ts:985-998): dim3–5 shift≥1,
dim6 shift≥2, dim7 shift≥3, dim8 shift≥4, galaxy galaxies≥1, singularity singularities≥3.
Aralıklar (game.ts:1396-1418): dim single 8.0 / bulk 1.5 / max 0.5 sn; tickspeed
10.0/2.0/0.5; shift 15/4/2; galaxy 20/6/3 sn. Efektif aralık `interval / (1.5^chip × neuralFreq)`,
üzerine `1.25^overclock` frekans çarpanı. Botlar ayrı kaynak tüketmez/üretmez; normal
alım fonksiyonlarını normal matter ile çağırır. C1'de kapalı, C2 durmada bekler.

## 6. Faz 1+ katman çarpanları (özet)

- **Stance** (game.ts:2507-2518): trend üretim ×2.0; spam tıklama ×4.0 + anomali ×1.5;
  private tickspeed maliyeti ×0.85.
- **Lab pasif** (game.ts:2750-2847): hücre başına foton ×1.20, heavy ×1.35, dark ×1.50,
  magnetic ×1.40, higgs ×3.00; komşuluk (1.15–1.50), satır/sütun tamamlama ×1.12,
  superconductor ×2.5, kodeks `1+0.03×tarif`, viral `(5+olgun)×(overdrive?2:1)`.
- **Colony** (game.ts:2723-2747, 5407-5413): üreme `0.008×…×(1−log10(bot)/308)`;
  `colonyMult = 1+log10(bot+1)×0.5`; nap kalıcı çarpanı üstel birikimli.
- **Crisis/Reaktör** (game.ts:2588-2614, 5274-5284): sweet_spot `8.0×momentum` (momentum
  +0.02/sn, max 5), meltdown ×0.5; müdahaleler vent/compression/dilation/surge
  (game.ts:482-519, 4209-4267).
- **Relik** (game.ts:2948-2968): L1 tickspeed tabanı, L3 SP, L4 hücre başına, L5+ evrensel `2^(n−4)`.
- **Neural** (game.ts:931-949): prod_echo `1.25^lvl`, dream_lucid ×1.75, apex ×10, dawn ×2.
- Açılış eşikleri (unlocks.ts:225-338): crisis_spawn 1e3 → … → lab 1e65 → parazit 1e160
  → night_watch 1e308 → challenge 1 tekillik.

## 7. Yan sistemler

- **Başarımlar** (achievements.ts:12-13, 221-225): global `1.012^n × 1.06^satır` (mps'e
  girer, SP'ye girmez) + hedefli ödüller (üretim ×1.25/×2, tıklama ×2/×3, dim maliyet
  ×0.85, shift tabanı 1.9, vb. — game.ts:3240-3311).
- **Challenge ödülleri** (challenges.ts:52-164): C1 dim ×1.5 … C8 SP ×1.15, 8/8 ×1.25;
  hedef eğrisi C1 1e40 → C8 1e1000 (ADR-0032).
- **Anomaliler** (game.ts:4721-4814): fyp 60 sn ×7 üretim, heart 15 sn ×300 tıklama,
  sponsor anlık `mps×120`; taban aralık 65–95 sn.
- **Parazitler** (game.ts:2548-2557, 4868-4871): emiş `n×0.03×…` (mps'te `1−leech`);
  iade `emilen×(1.05+0.15×imm)` + bounty çarpanları (×1.5/×2, vent ×1.75, absorb ×2.0).
- **News:** kalıcı üretim çarpanı **yok**; tek seferlik matter ikramiyeleri.

## 8. Tempo hedefleri vs ölçümler

| Kuşak | Active seed 1 toplam | Kaynak |
| :--- | :--- | :--- |
| ADR-0023 bandı | 187–205 dk (hedef 180–240) | 0023:18-24 |
| ADR-0032 | 4:29:11 (hedef bant burada 180–270 yazılmış) | 0032:111-114 |
| ADR-0033 sonrası | 2:28:50 | todo.md aktarımı |
| ADR-0051 öncesi (S=0) | 10:29:42 | results-pre-accel.json |
| ADR-0051 S=0.011 (seçilen) | 11:38:27 | results-accel-c.json, 0051 §8 |

⚠️ **Çelişki (açık soru):** aynı "active seed 1" profili kuşaklar arasında 3.4 sa →
4.5 sa → 2.5 sa → 10.5 sa veriyor. Aradaki yavaşlama ADR-0051'in konusu değil;
aday: ADR-0050 Lab rebalance ve sonrası. **Doğrulanamadı — ayrı harness biseksiyonu gerekir.**
⚠️ **Minör:** bant üst sınırı 240 (0023) vs 270 (0032); test sayısı 8 (0051 §6) vs 7 (gerçek);
todo.md 1.58 tabanı varsayıyor, kod 1.595 (game.ts:215).

Ek hedefler (0023:26-27): Idle 12 sa cap'te log10≈78 (tasarım gereği duvar);
`idle_plus` shift ile log10≈142 @10 sa. ADR-0032 sonrası Idle 6 sa log10=100.55.

## 9. Riskler ve öneriler

1. **Hold'un kaldırılmış olması + zorunlu eşik yokluğu:** tekillik şu an tamamen
   opsiyonel bir düğme; "sınır" hissi yalnızca S=0.011 duvarından geliyor. AD modelindeki
   gibi zorunlu eşik + break indirimi düşünülmeli (oturumda zaten önerildi).
2. **Galaxy'nin üretimde doğrudan etkisi yok:** geç oyunda galaxy yalnızca tickspeed
   üzerinden işler; 210–265 bandı zaten en seyrek içerikli bantla çakışıyor (0032 §9 bant).
3. **Kuşaklar arası tempo sapması** (yukarıdaki tablo) bilinmeden yeni denge kolu
   çekilmemeli; önce biseksiyon.
4. **Kayıt eksikleri:** D3–D6 merdiven ADR'si, 0033 sonrası hızlanma/yavaşlama nedenleri.

## 10. Birincil kaynaklar

- `src/stores/game.ts` (maliyet: 164-201, 1044-1291, 3417-3506, 5664-5719; üretim:
  154-161, 1684-1762, 2296-2420, 3145-3208, 5427-5492; tekillik: 1927-1951, 2243-2293,
  3810-3916; botlar: 967-998, 1396-1418, 5335-5383; katmanlar: 2507-2518, 2588-2614,
  2723-2847, 2948-2968, 4209-4428, 4721-4814)
- `src/game/challenges.ts` (52-210), `src/game/pacing.ts` (18-142),
  `src/game/achievements.ts` (12-13, 221-225), `src/game/unlocks.ts` (225-338),
  `src/core/math.ts:31`
- `brain/decisions/0023, 0026, 0032, 0051`, `brain/tasks/todo.md:51-57`
- Harness: `brain/scratchpad/harness/results-{pre-accel,post-accel,accel-a,accel-b,accel-c}.json`
