# Hibrit Rapor ve Gece Telemetrisi Mimarisi (Stats Tab Evolution)

Bu belge, *Doomscroll: The Endless Reels* projesinde **Rapor (Stats) sekmesini** incremental türünün öncülerinden (*Antimatter Dimensions*, *Cookie Clicker*, *Synergism*, *Trimps*) ilham alarak modern, taktil ve analitik bir **Telemetri ve Teşhis Merkezine** dönüştürme planıdır.

---

## 1. Temel Felsefe & Hibrit Tasarım Sütunları

1. **Antimatter Dimensions Sütunu (Optimizasyon & Derin Teşhis):**
   - **Son 10 Gece Günlüğü (Past 10 Singularities):** Koşu süresi, kazanılan SP, SP/dakika verim oranı ve zirve dopamin. Oyuncu autobuyer eşiklerini ve reset zamanını optimize eder.
   - **Çarpan Laboratuvarı (Comprehensive Multiplier Breakdown):** Pasif Dopamin, Manuel Kaydırma Gücü (Click Power), Algoritma Frekansı (Hz & Tickspeed) ve 8 İstasyonun toplam üretime yüzde katkısı (% share).
   - **Meydan Okuma Hız Rekorları (C1–C8 Speedrun):** Her kriz meydan okumasının en iyi tamamlanma süresi ve kalıcı ödülü.

2. **Cookie Clicker Sütunu (Taktil Denge & Tesis Raporları):**
   - **Aktif vs Pasif Üretim Oranı (%):** Başparmak kaydırmasından gelen dopamin vs otomatik algoritma akışı.
   - **Vicdan Azabı Bilançosu (Wrinkler ROI):** Emilen dopamin vs %120-%165 primle kurtarılan net dopamin kârı.
   - **Mini-Oyun Telemetrisi:** Lab tohumları, mutasyonlar, kafein kararları ve ters tepmeler.

3. **Doomscroll Teması & Hiciv Sütunu (Gece Teşhisi & Biyometri):**
   - **Fiziksel Başparmak Mesafesi (Thumb Mileage):** Kaydırma sayısı × 5 cm (Metre, Kilometre ve "Eyfel Kulesi / Everest" kıyaslamaları).
   - **Kaybedilen REM Uykusu:** Feda edilen saat/dakika ve Zihinsel Pil % seviyesi.
   - **Mavi Işık Foton Dozu:** Ekrana bakılan süreye bağlı retinaya çarpan peta-foton hesabı.
   - **Bağımlılık Derecesi Unvanı:** 6 kademeli dinamik gece teşhisi ("Masum Kaydırıcı" → "Dopamin Tekilliği").
   - **Kriz Karnesini Kopyala (Share Card):** Discord / Reddit için tek tıkla emojili özet panoya kopyalama.

4. **Modern UI/UX & Balatro Görsel Sistemi:**
   - 5 alt sekmeli segmented navigation: `[ Genel Bakış ] [ Çarpanlar ] [ Son 10 Gece ] [ Rekorlar ] [ Biyometri ]`
   - İnteraktif SVG Zaman Çizelgesi: Zirve DPS çizgisi, hover tooltip, dinamik neon alan dolgusu.
   - Balatro kart camı (`glass-panel-card`), tilt ve neon durum rozetleri.

---

## 2. Veri Modeli ve Kod Değişiklikleri

### A. Tip Genişletmesi (`src/models/types.ts`)
```ts
export interface PastSingularityRecord {
  id: number
  duration: number // saniye
  spGained: Decimal
  spPerMinute: Decimal
  peakMatter: Decimal
  timestamp: number
  challengeId?: string | null
}

export interface PlayerStats {
  manualClicks: number
  totalMatterProduced: Decimal
  highestMatter: Decimal
  totalPlaytime: number
  singularityCount: number
  fastestSingularity: number // BUG FIX: reset anında güncellenecek
  highestDps: Decimal // YENİ: Anlık ulaşılan zirve saniyelik üretim
  totalManualDopamine: Decimal // YENİ: Başparmakla üretilen kümülatif dopamin
  anomaliesClicked: number
  combosTriggered: number
  slackersFired: number
  labHarvests: number
  spellsCast: number
  seedsPlanted: number
  challengesCompleted: number
}
```

### B. Pinia Store Güncellemeleri (`src/stores/game.ts`)
1. **`singularityReset()`:**
   - `fastestSingularity = Math.min(fastestSingularity, duration)` kaydı.
   - `pastSingularities.unshift(...)` ile son 10 koşunun hafızada saklanması (maksimum 10 eleman).
2. **`completeChallenge()`:**
   - Meydan okuma bitişlerinin de `challengeId` etiketiyle geçmişe eklenmesi.
3. **`manualClick()`:**
   - `totalManualDopamine = totalManualDopamine.plus(gain)` takibi.
4. **`update()` Loop:**
   - `if (this.matterPerSecond.gt(this.stats.highestDps)) this.stats.highestDps = this.matterPerSecond`.
5. **Yeni Getters:**
   - `currentRunSeconds`: Bu koşuda geçen süre (`singularityRunSeconds`).
   - `activeVsPassiveRatio`: `{ manualPct: number, passivePct: number }`.
   - `clickPowerBreakdown`: Tıklama çarpanlarının adım adım dökümü.
   - `dimensionShares`: 8 istasyonun üretim yüzdeleri.
   - `pastSingularitiesAverage`: Son 10 koşunun ortalama süresi ve ortalama SP/dk verimi.
   - `biometrics`: Başparmak mesafesi (km/m), kaybedilen uyku, foton dozu, bağımlılık unvanı.

---

## 3. Bileşen Mimarisi (`src/components/StatsTab.vue`)

- **Üst Kısım:** `TabHero.vue` (Uykusuz Süre, Bu Koşunun Süresi, Zirve DPS rozetleri).
- **Alt Sekme Navigasyonu:**
  - `overview`: Hızlı KPI kartları, İlerleme yüzdeleri, İnteraktif SVG Zaman Çizelgesi.
  - `multipliers`: Pasif Üretim Çarpanları, Manuel Kaydırma Gücü formülü, Algoritma Frekansı (Hz), İstasyon Dağılım Çubukları.
  - `past10`: Son 10 Gece Çöküş Tablosu, En Hızlı Koşu, Ortalama SP/dk verimi.
  - `challenges`: C1–C8 Rekor Süreleri, Kriz Anomali Oranları, Vicdan Azabı Prim Kârı, Lab İstatistikleri.
  - `biometrics`: Başparmak Kilometresi & İllüstratif Kıyaslama, Kaybedilen Uyku, Mavi Işık Radyasyonu, Gece Raporu Kopyalama butonu.
