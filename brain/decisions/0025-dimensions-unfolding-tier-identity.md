# ADR-0025: Boyut unfolding (2+shift) ve tier kimliği (L2b)

**Durum:** Uygulandı  
**Tarih:** 2026-10-02  
**Plan:** `brain/research/dimensions-redesign-implementation-plan-2026-10.md`

## Karar

1. **Açık format sayısı:** `min(8, 2 + dimensionShifts)` (C7 cap aynı).
2. **Save v12:** `dimensionCapFloor` — eski kayıtlarda `shifts=0` iken 4 tier açıktı; floor en az 4 veya ilerleme kadar korunur.
3. **Erken shift gereksinimi:** `D(2+shifts)` ×25 (`shifts < 6`); sonrası D8 ölçekli ADR-0023 eğrisi (`22 + 16×(shifts−6)`).
4. **Format keşfi buff:** Yeni tier ilk görünür olduğunda 20 sn ×1.25 yalnız o tier `getDimensionMultiplier`.
5. **Tier pasifleri:** `src/game/dimension_identity.ts` — küçük band; SP/singularityGain dokunulmaz.

## Telafi (harness dışı band)

Sıra: `DIMENSION_CHAIN_RATE` +0.002 → `DIM_PER_TEN_MULT` +0.01 → `MAX_BUY_PACKS_CAP` +20.

## Rollback

`unlockedDimensionsCount` → `4+shifts`; `dimension_identity` importlarını kaldır; save v12 alanları yok sayılır.
