# ADR-0004: Prosedürel Müzik Motoru v2 — Convolution Reverb + Glue Compressor + Swing

## Tarih: 2026-09-30
## Durum: Kabul edildi

## Bağlam
v0.6.0 motoru sadece delay + lowpass kullanıyordu. Ses düz, davullar osilatör-tiz, akorlar rigit kuantizeydi. İnternet araştırması (gskinner reverb, MDN Advanced Audio, Melodics lo-fi teori) 3 boşluğu netleştirdi: uzay hissi yok, dinamik yapıştırıcı yok, groove insansı değil.

## Karar
- Master zincire `ConvolverNode` (üretilmiş stereo impulse 2.2sn) + `DynamicsCompressor` (-18dB, 4:1) eklendi.
- Davullar gürültü tamponuna geçti (snare/hat/shaker gerçek noise + gövde).
- Swing + humanize: lo-fi %14, groove %10, synthwave %2; zaman ±8ms, velocity ±%15.
- Akorlar caz 7li/9lu + inversiyon varyasyonu (Fmaj9-Em9-Dm9-Cmaj9).
- Sidechain duck: her kickte keys/pads 120ms eğilir.
- Stereo: per-nota pan + wow/flutter vibrato; bas reverbe gönderilmez.
- `setIntensity()` ile filtre/reverb canlanır; public API geriye uyumlu.

## Sonuç
- 0 yeni bağımlılık, 0 KB harici ses. `npm run build` temiz (8.77s).
- Tek dosya değişti: `src/core/music-engine.ts`.
