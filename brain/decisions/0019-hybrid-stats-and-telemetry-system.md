# ADR 0019: Hibrit Rapor ve Gece Telemetrisi Mimarisi (Stats Tab Evolution)

## Durum
Kabul Edildi / Uygulandı (v0.21.0 - 2026-10-02)

## Bağlam ve Sorun Tanımı
Mevcut `StatsTab.vue` yalnızca 11 adet statik istatistik kartı, basit bir sparkline ve kısıtlı bir üretim çarpanı satırından oluşuyordu. Incremental oyun türünün öncüleri (*Antimatter Dimensions*, *Cookie Clicker*, *Synergism*):
1. Oyuncunun stratejik karar alabilmesi için prestij optimizasyon metriklerini (özellikle son prestijlerin SP/dk oranını — "Past 10"),
2. Tüm güç kaynaklarını (pasif, manuel tıklama gücü, frekans ve istasyon çarpanları) şeffaf bir şekilde görmesini,
3. Taktil ve otonom üretim oranlarının dengesini (Aktif vs Pasif %),
4. Oyunun hiciv temasıyla rezonansa giren eğlenceli gece telemetrisini (Başparmak mesafesi, kaybedilen REM uykusu, retinaya çarpan mavi foton dozu ve paylaşım kartını) gerektirir.

Ayrıca kod denetiminde `fastestSingularity` sayacının prestij anında hiç kaydedilmediği (daima `Infinity` kaldığı) ve geçmiş koşu telemetrisinin saklanmadığı tespit edilmiştir.

## Alınan Kararlar

1. **Beş Alt Sekmeli (Sub-Tabs) Modüler Yapı:**
   - `overview` (Genel Bakış): 6'lı Hero KPI Grid, Aktif vs Pasif Üretim Oran Barı, Hover ve Zirve göstergeli İnteraktif SVG Zaman Çizelgesi.
   - `multipliers` (Çarpan Laboratuvarı): Pasif Dopamin, Manuel Dokunuş Gücü Formülü (Base, Shift, Stance, Combo, Buff, CPS Sync), Algoritma Frekansı (Hz) ve 8 İstasyonun tekil güç dökümü.
   - `past10` (Son 10 Gece): *Antimatter Dimensions* Past 10 modeli; koşu süresi, SP kazancı, **SP / Dakika verimi**, zirve dopamin ve ortalama SP/dk göstergesi.
   - `challenges` (Kriz & Rekorlar): C1–C8 meydan okuma en iyi tamamlama süreleri (`challengeBestTimes`), anomali tıklama sayıları, Vicdan Azabı susturma primi, Lab ve Büyü istatistikleri.
   - `biometrics` (Gece Biyometrisi & Hiciv): Fiziksel başparmak kaydırma mesafesi (metre/km + Eyfel/Everest karşılaştırması), feda edilen REM uykusu ve zihinsel pil şarjı, mavi ışık foton dozu, dinamik bağımlılık rütbesi ve Discord/sosyal medya için tek tıkla "Gece Raporunu Kopyala" butonu.

2. **Veri Modeli ve Store Genişletmeleri:**
   - `PastSingularityRecord` tipi tanımlandı.
   - `PlayerStats` içine `highestDps: Decimal` ve `totalManualDopamine: Decimal` eklendi.
   - `singularityReset()` içine `fastestSingularity` güncelleme mantığı ve son 10 koşuyu `pastSingularities` dizisine ekleme kuralı yazıldı.
   - `completeChallenge()` içine meydan okuma süresinin telemetri geçmişine eklenmesi bağlandı.
   - `game.ts` getters: `currentRunSeconds`, `activeVsPassiveRatio`, `clickPowerBreakdown`, `tickspeedBreakdown`, `pastSingularitiesAverage`, `biometrics`.
   - Save serileştirme ve geriye dönük uyumluluk (`deserialize`) güncellendi.

3. **Görsel Tasarım & UI/UX Standartları:**
   - Balatro / Cyberpunk temalı cam kartlar (`glass-panel-card`).
   - SVG degrade alan dolgusu ve dikey hover imleci.
   - Mobil uyumlu segmented pill buton çubuğu.

## Sonuçlar ve Doğrulama
- `npx vue-tsc --noEmit` ile TypeScript strict modunda 0 hata kanıtlandı.
- `npm run build` ile production derlemesi başarıyla tamamlandı.
