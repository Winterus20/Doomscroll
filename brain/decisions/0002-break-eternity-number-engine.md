# ADR 0002: Büyük Sayı Motoru Olarak break_eternity.js Seçimi

## Durum
Kabul Edildi (Accepted) - 2026-09-30

## Bağlam
Standart JavaScript `Number` tipi maksimum $1.79 \times 10^{308}$ değerine ulaşabilir; bu değerin üzerinde `Infinity` vererek taşar. Oyunumuzun hedeflediği derin katmanlar (Eternity, Reality, Tetrasyon) $10^{10^{308}}$ ve ötesindeki sayıları gerektirir.

## Karar
Sayı temsili ve matematik motoru olarak **`break_eternity.js`** seçilmiştir.

## Gerekçeler ve Sonuçlar
1. **Tetrasyon Desteği:** Sayıları `sign`, `layer` ve `mag` olarak üçlü yapıda saklayarak kule üsleri ve tetrasyon büyüklüklerini destekler.
2. **Performans:** Arbitrary precision (keyfi hassasiyet) yerine oyun odaklı 15-17 haneli kayan nokta hassasiyetini koruyarak mikrosaniyeler içinde işlem yapar; CPU'yu yormaz.
3. **Kritik Uyum Notu:** Kütüphanede `isNaN` yerine `isNan()` metodu tanımlıdır. Sarmalayıcı fonksiyonlarda bu durum gözetilmiştir.
