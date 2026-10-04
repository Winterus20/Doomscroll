# ADR-0023: İlk prestij 3–4 saat (harness doğrulaması)

**Durum:** Uygulandı  
**Tarih:** 2026-10-02  
**Bağlam:** ADR-0021 “beklenen” sürelerle kalmıştı; üst üste nerfler (özellikle `DIM_PER_TEN_MULT` 1.5 + zincir 0.05) aktif profilde 12 saatte tekilliğe ulaşmayı engelledi. Gerçek `game.ts` store’u `brain/scratchpad/harness/` ile ölçüldü.

## Karar

1. **Üretim eğrisi:** `DIMENSION_CHAIN_RATE` 0.056, `DIM_PER_TEN_MULT` 1.56, `BASE_SHIFT_POWER` 1.66 (`challenges.ts`).
2. **Tickspeed maliyeti:** taban `1000×16^n` (önceki 13 → 17 denemeleri arasında).
3. **Max-alım tavanı:** `MAX_BUY_PACKS_CAP` 340 (10.000 → koşu sonu 60 sn patlamasını keser, süreyi uzatır).
4. **5+ sıçrama D8:** `22 + 16×(shifts−4)` (orta yol; tam `28+17` 8 saatte log10≈248’de kaldı).
5. **Botlar:** toplu/max mod `AUTOBUYER_BULK_SHIFT_REQ` 1, `AUTOBUYER_MAX_GALAXY_REQ` 1; **shift bot** ilerleme `shifts: 0` (idle duvarı: bot hiç açılmıyordu).
6. ADR-0021 yan sistemleri (unlock merdiveni, anomali 65 sn, lab nerf, tickspeed tabanı 0.08) **korundu**.

## Doğrulama (harness, `active`, seed 1–3, dt=0.1)

| Seed | İlk tekillik |
|------|----------------|
| 1 | 3:24:44 |
| 2 | 3:07:28 |
| 3 | 3:06:57 |

**Bant:** ~187–205 dk (3,1–3,4 saat) — hedef 180–240 dk.

**Casual** (2 tık/sn, 10 sn maxAll): 10 saat cap, log10≈143–153 (bilinçli olarak daha uzun).  
**Idle** (tıklamasız, shift/galaxy yok): 12 saat cap, log10≈78 — tasarım gereği prestij öncesi duvar; `idle_plus` shift ile log10≈142 @ 10h.

`npm run build` ✓

## Sonraki risk

- Max-alım tavanı prestij sonrası koşularda da geçerli; ileride “prestij öncesi / sonrası” ayrımı gerekebilir.
- Casual oyuncu için ayrı “rahat” bandı istenirse yan sistem erişimini gevşetmek yerine `MAX_BUY_PACKS_CAP` veya chain ile ince ayar yapılmalı.
