# 0006. Hibrit Çözüm: Algoritmik Ayna Sinerjisi & Kolektif Trend Eşikleri

## Tarih
2026-10-01

## Durum
Kabul Edildi (Accepted)

## Bağlam
İncremental oyunlarda üst kademe üreticiler (D5-D8) açıldığında, alt kademe üreticileri (D1-D4) saniyede yüzbinlerce bedava üretmeye başlar. Bu durum "Lower Tier Obsolescence" (Alt kademelerin çöp olması) problemine yol açar; oyuncu elindeki Dopamin ile alt kademeleri satın almayı tamamen bırakır. Bu sorunu çözmek için yalnızca tek bir mekanik (sadece kolektif eşik veya sadece sinerji) yeterli değildir; hibrit bir sentez gereklidir.

## Karar
1. **Algoritmik Ayna Sinerjisi (Mikro / Sürekli Teşvik):**
   - Eşleşmeler: D1 ↔ D8, D2 ↔ D7, D3 ↔ D6, D4 ↔ D5.
   - Her formatın satın alınma sayısı (`bought`), eşleşen partnerine kalıcı çarpan pompalar:
     $$\text{SynergyMultiplier} = 1 + \sqrt{\text{Partner.bought}} \times 0.15$$
   - D1'den 100 adet alındığında D8'in üretimi anında $\times 2.5$ katlanır. Tersine D8 alındıkça da D1'in üretimi katlanır.
   - UI: `DimensionRow.vue` üzerinde `🔗 D8: ×2.50` neon yakıt rozeti eklendi.
2. **Kolektif Trend Eşikleri (Makro / Dönüm Noktası Hedefi - En Zayıf Halka):**
   - Açık olan tüm formatların en düşüğü (`minBought`) 25, 50, 100, 250, 500, 1000 seviyelerine ulaştığında tüm evrene global çarpan patlar (2x, 3x, 5x, 10x, 25x, 50x).
   - 100+ Kolektif seviyede Algoritma Frekansı (Hz) satın alma maliyetlerine kalıcı %10 indirim uygulanır.
   - UI: `DimensionsTab.vue` üzerinde Kolektif Seviye ilerleme barı ve darboğazı doğrudan gösteren `En Geride: D3 ASMR Sabun (38/50)` rozeti eklendi.

## Sonuçlar
- Alt kademeler asla önemsizleşemez; oyuncu hem anlık olarak üst boyutu katlamak (Ayna Sinerjisi) hem de evrensel çarpanı açmak (Kolektif Eşik) için alt boyutları agresif bir biçimde satın almaya devam eder.
- Oyun döngüsü ve portföy dengelemesi en üst düzey bağımlılık ve tatmin seviyesine ulaştı.
