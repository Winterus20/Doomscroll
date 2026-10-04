# Ekonomi hizalama: ADR-0023 “yeni ilk koşu” (2026-10-02)

## Bağlam

İlk tekillik süresi harness ile **~3,1–3,4 saat** (active, 3 seed) olarak sabitlendi (ADR-0023). Ancak **yan ekonomi katmanları** hâlâ ~6–31 dakikalık eski pacing simülasyonuna (`economy-balancing-research.md`) göre ayarlıydı:

| Sorun | Kanıt (active seed 1, ADR-0023 sonrası) |
|--------|-------------------------------------------|
| Tüm dopamin kapıları ~5 dk içinde | `patch_shop` 192s, `autobuyers` 325s, `lab` 294s |
| Yamalar maliyeti 1e5–1e11 | İlk yama ~3 dk; 3 saatlik koşuda erken tüketim |
| Bot maliyetleri 5e5–1e34 | dim1 bot 168s — çok erken güç |
| `MAX_BUY_PACKS_CAP` 340 prestij sonrası da | 2. koşu kasıtlı yavaşlatılmış; GDD “2. koşu %50–70 süre” bozulur |
| Unlock yorumu `/tmp/pace7.js` | 1e7 ≈ 70 sn — artık geçersiz |

## Tasarım hedefleri (GDD + research checklist)

1. **İlk koşu:** tekillik 180–240 dk (active); özellikler koşunun **%15–%70** bandına yayılır.
2. **İkinci koşu:** aynı çekirdek matematik, daha yüksek max-alım tavanı + kalıcı SP/ağaç — süre **%50–70** ilk koşu (ölçüm: harness `singularities≥1` gelecek iterasyon).
3. **Casual:** yan sistemler daha az; dopamin kapıları + shift merdiveni ile 5–8 saatte ulaşılabilir olmalı (tam idle hâlâ bilinçli duvar).
4. **SP ekonomisi:** `singularityGain` başarımdan bağımsız kalır; ağaç düğüm maliyetleri 1–20 SP — ilk çöküşte ~1 SP, 3. çöküşte ağacın ~%30’u (GDD 7.1).

## Karar özeti (uygulama: ADR-0024)

### A. Özellik merdiveni — dopamin yerine ilerleme

- **Yamalar:** D2×35 satın alım (≈8–12 dk), dopamin eşiği kaldırıldı.
- **Bot sekmesi:** 2 Akış Sıçraması (≈12–18 dk).
- **Yenile:** 3 Sıçrama (≈25–35 dk).
- **Azaplar:** 1e24 dopamin + 1 sıçrama sonrası geç oyun.
- **Duruşlar / lab / tohumlar:** `dimBought` eşikleri +2–15 aralığında yükseltildi.

### B. Yamalar & bot fiyatları

Geometrik ölçek: **~1e3–1e4×** (ilk yama 1e8, bass 1e23; dim1 bot 1e12).

### C. Max-alım tavanı

- `singularities === 0` → 340 (ADR-0023 patlama kesici).
- `singularities > 0` → 2800 (prestij sonrası AD hissi).

### D. Koloni çekirdeği

1e13 → 1e22 (ilk koşu log10 üretimi ile uyum).

## Doğrulama planı

- `node brain/scratchpad/harness/build.mjs`
- Active seeds 1–3 → tekillik 180–240 dk bandı.
- Casual seeds 1–3 → 10h cap, log10 hedef ≥280 veya süre ≤8h (yumuşak).
- `npm run build`

## Açık riskler

- Yamaların gecikmesi active süreyi **uzatabilir**; gerekirse `DIM_PER_TEN_MULT` 1.56→1.57 ince ayar.
- Unlock ipuçları UI’da güncellenmeli (`unlocks.ts` hint metinleri).
