# ADR-0024: Yeni ilk koşu ekonomi merdiveni

**Durum:** Uygulandı  
**Tarih:** 2026-10-02  
**Araştırma:** `brain/research/economy-new-game-alignment-2026-10.md`

## Sorun

ADR-0023 çekirdek üretimi 3–4 saate oturttu; unlock / yama / bot fiyatları hâlâ 5–10 dakikalık eski pacing’e göre kaldı → tüm yan sistemler koşunun ilk %3’ünde açılıyordu.

## Karar

1. **FEATURE_UNLOCKS:** erken dopamin kapıları → `dimBought` / `shifts`; geç oyun `guilt` → `1e24`.
2. **ALGORITHM_UPGRADES:** maliyetler ~1e3–1e4× (1e8 … 1e23).
3. **AUTOBUYER_COSTS** + bulk/max mod: aynı ölçek (dim1 `1e12`, bulk `1e28`, max `1e32`).
4. **COLONY_CORE_COST:** `1e22`.
5. **Max-alım tavanı:** ilk koşu 340, prestij sonrası 2800.

## Doğrulama

Harness active 3 seed + `npm run build` (görev tamamlanınca `completed.md`).
