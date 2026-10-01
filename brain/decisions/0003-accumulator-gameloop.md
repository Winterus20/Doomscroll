# ADR 0003: Accumulator Pattern ile Sabit Adımlı Game Loop ve Çevrimdışı Simülasyon

## Durum
Kabul Edildi (Accepted) - 2026-09-30

## Bağlam
Tarayıcılarda `setInterval` veya saf `requestAnimationFrame` kullanımı kare hızı dalgalanmalarında veya sekme arka plana atıldığında (arka planda tarayıcılar requestAnimationFrame'i 1 FPS'e düşürür) üretim hesaplarının bozulmasına veya oyunun donmasına yol açar.

## Karar
Oyun döngüsü **Accumulator Pattern** ile `TICK_RATE = 50ms` (20 TPS) sabit zaman adımıyla kurgulanmıştır.

## Gerekçeler ve Sonuçlar
1. **Fiziksel Doğruluk:** Ekran 60 Hz, 144 Hz veya 30 Hz olsa bile oyun mantığı daima sabit zaman dilimleriyle adım atar; üretim dengesi bozulmaz.
2. **Kademeli Çevrimdışı İlerleme:** 5 saniyeden uzun arka plan birikmelerinde veya oyun kapatılıp açıldığında `simulateOfflineProgress` devreye girerek hem ayrıntılı simülasyonu hem de analitik hesaplamayı işletir.
