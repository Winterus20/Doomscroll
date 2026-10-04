# ADR-0026: Erken boyut maliyet merdiveni

**Durum:** Uygulandı  
**Tarih:** 2026-10-02  

## Sorun

D1 her 10’lukta `×1000` maliyet (10 → 10k → 10M) erken gelirde üretimin gerisinde; ADR-0025 (2 açık tier) duvarı daha da sertleştirdi.

## Karar

1. D1 ilk 4 bucket: `×55`; D2 ilk 3 bucket: `×42`; sonrası mevcut `costMult` ile devam (kırılma bucket 4/3).
2. `DIMENSION_CHAIN_RATE` 0.056 → 0.058.
3. Başlangıç açık tier: 3 (`BASE_UNLOCKED_DIMENSIONS + shifts`).

## Rollback

`dimensionCostForBucket` → saf `pow(costMult,bucket)`; chain ve BASE_UNLOCKED geri al.
