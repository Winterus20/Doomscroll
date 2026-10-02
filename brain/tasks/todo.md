# Yapılacaklar Listesi (Backlog & Roadmap)

## ⚡ Aktif & Taktil Çekirdek (Cookie Clicker & Trimps - Tamamlandı ✅)
- [x] **Gece Krizleri & Viral Bildirimler (Altın Kurabiye Mekaniği):**
  - [x] Ekranda süzülen ışıltılı anomaliler (RNG spawn, 3 farklı etki).
  - [x] **Rezonans Hipnozu (Combo Stacking):** Gece 3 (7x) ve Başparmak Histerisi (777x) aynı andayken 5,439x süper dopamin patlaması.
- [x] **Taktiksel Gece Duruşları (Trimps Stance Sistemi):**
  - [x] *🛌 Yorgan Altı Modu:* Pasif üretime +100% odak (2x).
  - [x] *⚡ Çılgın Kaydırma:* Manuel kaydırmaya +300% (4x) ve Gece Krizi sıklığına +50%.
  - [x] *🕶️ Düşük Parlaklık:* Algoritma Frekansı maliyetlerinde %15 indirim.
- [x] **Vicdan Azabı & Göz Batması (Wrinklers Mekaniği):**
  - [x] Üretimin %3'ünü emen 5 adet vicdan azabı.
  - [x] 3 tıklamayla susturulduğunda %120-%165 primli dopamin iadesi.

---

## 🔒 Özellik Merdiveni (Progressive Unlock — v0.11.0 Tamamlandı ✅)
- [x] Tek kaynaklı unlock registry'si (`src/game/unlocks.ts`): `UnlockReq` tipleri + `FEATURE_UNLOCKS` listesi (15 unlock) + `checkUnlock` / `unlockProgress` / `nextLocked`.
- [x] Store getter'larını registry'e bağla (`isFeatureUnlocked`, `syncUnlocks`; lab/crisis/autobuyers getter'ları tek yerden üretiliyor — kritik `unlockedDimensionsCount` bug'ı fixlendi).
- [x] Sekme içi kademeli açılmalar: Lab tohumları (Kedi→Kaşar→Subway→Phonk), Kriz büyüleri (Şarj→Espresso→Kulaklık→Yalan), Algoritma Yamaları + Akışı Yenile.
- [x] Kilitli kart UX: `LockedFeature.vue` (kilit simgesi + şart metni + slate mini ilerleme çubuğu + v-tip).
- [x] "Sonraki Açılacak" bandı (App.vue nav altında, `nextLocked` + ilerleme %).
- [x] Eşik ince ayarı: Lab (100 Dopamin → D2×25), Botlar (1e4 → 1e6), Anomali (başlangıç → 100 Dopamin), stances (Çılgın/Düşük Parlaklık → D1×50). ADR: `brain/decisions/0009-feature-unlock-ladder.md`.
- Plan: `brain/research/feature-unlock-ladder-plan.md`

---

## 🎯 Katman 1: Tekillik, Mini-Oyunlar & Botlar (v0.4.0 Tamamlandı ✅)
- [x] **Otomatik Kaydırma Botları (Autobuyers - Antimatter Dimensions):**
  - [x] 1-8 İstasyon, Algoritma Frekansı, Akış Sıçraması ve Kümeler için 11 bağımsız bot.
  - [x] Aç/kapa kontrolleri ve master "Tümünü Aç / Kapat" butonu.
  - [x] Otonom Kaydırma Çipi ile 1.5x - 7.5x hız ivmesi.
- [x] **Tesis Tabanlı Mini-Oyunlar (Cookie Clicker Minigames):**
  - [x] *Algoritma Stüdyosu (Viral Matris & Trend Reaktörü - Hibrit Model v0.12.0):* Çürümesiz 3x3 sinerji matrisi, 8 meme/ses formatı, komşuluk sentezi, kalıcı Viral Kodeks (+%3/keşif), 3 FYP zemin modu ve canlı "Akışa Fırlat!" Trend Reaktörü.
  - [x] *Gece Yarısı Kriz Yönetimi (The Grimoire - D4 ile açılır):* 100 birimlik Kafein Enerjisiyle çalışan 4 riskli gece kararı (Şarj kablosu tak, espresso shot, kulaklık tak, yalan söyle + Backfire riskleri).
- [x] **Sabah 06:00 Çöküşü & Kalıcı Uykusuzluk Dükkanı (Singularity & SP Upgrades):**
  - [x] 1.79e308 Dopamin tekilliği ve Uykusuzluk Puanı (SP) kazanımı.
  - [x] 6 kalıcı dükkan yükseltmesi (Göz Damlası, Sessize Alınmış Bildirimler, GaN Adaptör, Kafein Serumu, Otonom Çip, Vicdan Uyuşturucu).
- [x] **Hibrit Rapor & Gece Telemetrisi Mimarisi (v0.21.0 - Stats Tab Evolution):**
  - [x] 5 alt sekmeli kontrol paneli (Genel Bakış, Çarpan Lab, Son 10 Gece SP/dk, Kriz Rekorları, Biyometri).
  - [x] İnteraktif SVG zaman çizelgesi grafiği (hover, peak DPS çizgisi, zaman aralıkları).
  - [x] Fastest Singularity bug fix ve son 10 koşunun hafızada saklanması.
  - [x] Tek tıkla Discord/sosyal medya karne paylaşımı.
- [ ] **Otonom İzleme Botları & Toplu Uyku (Ant Sacrifice - Synergism):**
  - [ ] Arka planda kendi kendine üreyen nöral alt-bot kolonisi.
  - [ ] "Toplu Uyku (Power Nap)" ile botları feda edip kalıcı kök dopamin çarpanı katlama.
- [ ] **Gece Kriz Meydan Okumaları (Normal Challenges):** → `in-progress.md`'ye taşındı (Faz 1 Motor implementasyonu başladı, plan v2).

---

## 🚀 Katman 2: Kolektif Gece Nöbeti & Uyku Baskısı Matrisi (Faz 2)
- [ ] Kolektif Gece Nöbeti (2. Büyük Prestij Katmanı - 1e4000 Dopamin).
- [ ] Mavi Işık Gözlükleri ve Gece Ekipmanları Soketleme (Talisman & Runes).
- [ ] **12 Sürgülü Uyku Baskısı Matrisi (Corruptions):**
  - [ ] 12 adet ayarlanabilir ceza sürgüsü (Ekran Parlaklığı, Şarj, Göz Kuruluğu vb.).
  - [ ] Yüksek baskıda tamamlanan nöbetlerden "Zombi Bakışı Plaketi" kazanımı.
- [ ] Gece Kuşları Panteonu (The Pantheon).
- [ ] Uykusuzluk Yetenek Ağacı (Tree of Studies).

---

## 🌌 Katman 3: Evrensel Doomscroll & Sonsuz Akış (Faz 3)
- [ ] Uzay-zamanın 9:16 dikey formata gerilmesi (1e100000+ Dopamin).
- [ ] The Automator (Oyun içi makro/kodlama motoru).
- [ ] Kadim Gece Varlıkları (Celestials).
- [ ] Evrenin Yukarı Kaydırılması (Nihai Kozmik Çöküş).
