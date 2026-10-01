# 0005. Reels Pro: Akış Motoru & Algoritma Devrimi (Milestones, Sacrifice, Upgrades & Refresh)

## Tarih
2026-10-01

## Durum
Kabul Edildi (Accepted)

## Bağlam
Mevcut Reels (Boyutlar) sekmesinde oyuncu yalnızca "10 Al" veya "Maks Al" butonlarıyla boyutları ve frekansı artırabiliyordu. Bu durum oyunun orta evresinde (özellikle 4. boyuttan sonra ve 5. sıçrama civarında) monotonluğa ve yavaşlamaya (the wall problem) sebep oluyordu. Oyuncunun her boyutta mikro hedeflere sahip olması, taktil sosyal medya deneyimini hissetmesi ve *Antimatter Dimensions* ile *Cookie Clicker* sentezinin doruğa çıkması gerekiyordu.

## Karar
1. **Video Çözünürlük Kademeleri (Resolution Milestones):**
   - Her format (D1-D8) için 25 (360p - 2x), 50 (720p HD - 3x), 100 (1080p 60fps - 4x + %1 Tıklama payı), 250 (4K HDR - 8x), 500 (Nöro-Link - 16x) ve 1000 (Kozmik Tekillik - 32x) kademeleri getirildi.
2. **Önbelleği Temizleme (Dimension Sacrifice - Antimatter Dimensions):**
   - 5. Akış Sıçraması (Shift) veya D8 açıldığında aktifleşen feda mekaniği kuruldu.
   - D1-D7 sıfırlanır, karşılığında biriken D1 miktarına göre D8 Saf Beyin Çürümesine kalıcı katlanan devasa bir çarpan kazandırılır.
   - Formül: $\text{SacrificeMult} = (1 + \log_{10}(D_1)/4)^{2.5}$.
3. **Algoritma Yamaları Dükkanı (Cookie Clicker Store):**
   - Dopamin ile tek seferlik satın alınan 6 adet stratejik yükseltme eklendi (1.25x Oynatma Hızı, Çift Dokunarak Beğen, OLED Sonsuz Siyah, Arka Planda Dinle, Kayıtlılara Ekle, Kulaklık Bass Boost).
4. **Akışı Yenile (Pull to Refresh):**
   - 60 saniye cooldown ile çalışan, 12 saniye boyunca tüm üretimi 3x katlayan taktil sosyal medya butonu eklendi.
5. **Ses & Görsel Geri Bildirim:**
   - Web Audio API ile özel osilatör sesleri (`playSacrifice`, `playRefresh`, `playMilestone`, `playUpgrade`) ve neon etiketler eklendi.

## Sonuçlar
- Reels sekmesi tekdüze bir satın alma tablosundan, dinamik, taktil ve bağımlılık yapıcı bir sosyal medya simülasyon merkezine dönüştü.
- Pacing duvarları ortadan kalktı; oyuncu sürekli sıradaki çözünürlük veya önbellek temizleme çarpanını kovalayabiliyor.
