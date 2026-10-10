# ADR-0053: Test Harness Konsolidasyonu (Tek Kapı)

**Durum:** Uygulandı
**Tarih:** 2026-10-10
**Bağlam:** İki katmanlı harness dağınık ve keşfedilemezdi: Vitest include'u
`tests/` klasörünü dışlıyordu (`lab-rebalance.spec.ts` shim ile dolambaçlı
koşuyordu), 6 store testi aynı Pinia kurulumunu tekrarlıyordu, AGENTS.md'nin
`isNan` kuralını pinleyen test yoktu, headless sim harness `npm run` ile
çalışmıyordu (esbuild transitive bağımlılıktı) ve ölçüm sonucu göz kararı
okunuyordu (assert yok, exit-code yok).

## Karar

1. **Vitest (hızlı katman):** include `src/**/*.test.ts` + `tests/**/*.spec.ts`;
   `src/test/setup.ts` her testte Pinia'yı sıfırlar; `src/test/helpers.ts`
   (`createFreshStore`, `mulberry32`, `withSeededRandom`) tek kaynaktır.
   Shim (`src/game/lab-rebalance.test.ts`) silindi — spec tek kaynaktır.
2. **Yeni testler:** `src/core/math.test.ts` (isNan sözleşmesi, D() göç
   güvenliği, D_INFINITY eşiği), `src/stores/smoke.test.ts` (gerçek store'da
   5 dk aktif oyun: çökmesizlik + büyüme + determinizm).
3. **Sim harness (derin katman):** `esbuild` doğrudan devDep (`^0.25.0`);
   `harness:smoke` (~30 sn, 6 assert), `harness:full` (ADR-0023 bandı),
   `verify` (typecheck + test + smoke) scriptleri. `assert-results.mjs`
   ihlalde exit 1 verir.
4. `testTimeout` 60 sn (smoke testi binlerce tick sürer).

## Doğrulama

- `npm run test`: 17 dosya, 257 test, yeşil.
- `npm run harness:smoke`: 6/6 assert geçti (log10=89.7, shifts=8).
- `npm run build`: 0 tip hatası.

## Sonraki risk

- Full koşu (~2 saat, `--jobs 4` ile paralel) CI'da değil, manuel kapıdır;
  bant dışı kalırsa ADR-0023 §"Sonraki risk" prosedürü işler.
- Smoke eşikleri probe-kalibrasyonludur (2026-10-10); erken ekonomi bilerek
  değişirse eşikler güncellenir, test silinmez.
