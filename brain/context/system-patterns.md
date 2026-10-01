# System Patterns & Architecture (Sistem Desenleri)

## 1. Veri Akışı ve Reaktivite Modeli
- **Tek Doğruluk Kaynağı (Single Source of Truth):** Tüm oyun durumu Pinia (`src/stores/game.ts`) üzerinde tutulur.
- **Türetilmiş Değerler (Getters):** Üretim hızları ($P/\text{sn}$), çarpanlar, maliyetler ve açılış kilitleri getters üzerinden saf fonksiyon olarak hesaplanır.
- **Sıfır VDOM Şişkinliği:** Vue 3'ün proxy tabanlı reaktivitesi sayesinde her tick'te yalnızca değişen sayıların DOM düğümleri güncellenir.

## 2. Zaman ve Fizik Döngüsü (Accumulator Pattern)
- Sabit `TICK_RATE = 50ms` (Saniyede 20 mantık adımı).
- Render döngüsü ekran tazeleme hızına (`requestAnimationFrame`) bağlıdır (60-144 Hz).
- Delta zaman birikimi (`accumulator`) ile donanım takılmaları veya frame droplar oyundaki üretimi asla aksatmaz.
- 5 saniyeden uzun arka plan donmalarında `simulateOfflineProgress` devreye girer.

## 3. Kayıt ve Serileştirme Standardı
- Bellekteki `Decimal` nesneleri `.toString()` ile string formatına dönüştürülür.
- JSON dizgisi `LZString.compressToBase64` ile sıkıştırılarak `localStorage`'a yazılır.
- Dışa aktarma (Export) panoya tek tıkla kopyalanabilen kompakt bir Base64 dizisidir.

## 4. Ses Mimarisi
- Sıfır MB ses dosyası! Web Audio API `AudioContext` ve osilatörleri (`sine`, `triangle`, `sawtooth`) ile donanımsal ses sentezi.
