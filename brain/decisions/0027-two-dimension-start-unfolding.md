# ADR-0027: 2 boyut başlangıcı (D1+D2 unfolding)

**Durum:** Uygulandı  
**Tarih:** 2026-10-02  
**Plan:** `~/.cursor/plans/ekonomi-unfolding-final_78527304.plan.md` (plan v1 kalan parçası)

## Sorun

Plan v1 (Paket A+B) çoğunlukla uygulanmıştı (ADR-0025 tier identity, format unlock buff, feed ipucu, çarpan dökümü); eksik tek davranış başlangıçta 3 boyutun açık olması. Araştırma (`dimensions-economy-dopamine-redesign-2026-10.md` §5 P1) AD sadıkı unfolding öneriyor: başlangıçta yalnızca D1+D2; her yeni format bir **Akış Sıçraması ödülü** — "format keşfi" anı dopamini.

## Karar

1. `BASE_UNLOCKED_DIMENSIONS` 3 → **2** (`src/stores/game.ts`).
2. Yeni oyun defaults: `dimensionCapFloor: 2`, `formatDiscoverSeenCap: 2` — D3 artık 1. Sıçramada **kutlanır** (toast + 20 sn ×1.25 buff).
3. Save uyumluluğu: `clampSavedNumber` alt sınırları 2'ye düşürüldü; eski v12+ save'lerde saklı floor ≥3 **değişmeden korunur** (eski oyuncu cap düşmez). v12 altı save'ler `legacyFloor = max(4, progress)` ile zaten korunuyordu.
4. `unlocks.ts` sayısal eşikleri **değişmeden kaldı**: `shifts` tabanlı olanlar başlangıç sayısından bağımsız; `dimBought` tabanlı olanlar (`lab` D3×22, `crisis` D4×20, tohumlar) tier açılışına bağlı olduğundan birer Sıçrama gerilir — bu unfolding tasarımının kendisi; erken kilitlenme yok. Harness ölçümü sonraki iterasyona bırakıldı.
5. UI: format listesi altına **sıradaki format teaser'ı** eklendi (`DimensionsTab.vue`): "D3 ASMR Hipnoz — 1. Akış Sıçraması ile açılır".
6. **Juice fazı (hissedilir alım geri bildirimi) uygulandı sonra kullanıcı isteğiyle tamamen geri alındı** — mevcut geri bildirim mekanizması (buy-bounce, floating +delta/s, production surge sesi, dps-surge chip) olduğu gibi kaldı.

## Telafi merdiveni (kullanılmadı)

Plan'daki `DIMENSION_CHAIN_RATE` / `DIM_PER_TEN_MULT` / `MAX_BUY_PACKS_CAP` ince ayarları **uygulanmadı** (kullanıcı harness fazını "yapılmayacak" işaretledi). Ekonomi sabitleri ADR-0023/0026 değerlerinde kalır.

## Rollback

`BASE_UNLOCKED_DIMENSIONS` 2 → 3; defaults ve clamp alt sınırları 3'e dön; teaser bloğu kaldır.

## Doğrulama

- `npm run build` ✓ (vue-tsc + vite temiz)
- Tarayıcı QA: Hard Reset sonrası yalnızca D1+D2 satırları + D3 teaser göründü; eski save (floor 4) 4 boyutu korudu.