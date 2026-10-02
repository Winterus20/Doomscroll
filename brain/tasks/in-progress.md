# Aktif Görev (In-Progress)

## ✅ Tamamlanan: Hibrit Rapor ve Gece Telemetrisi Mimarisi (v0.21.0)
- **Kapsam:**
  - `src/models/types.ts`: `PastSingularityRecord`, `PlayerStats` (highestDps, totalManualDopamine), save serileştirme arayüzleri.
  - `src/stores/game.ts`: `fastestSingularity` bug fix, `pastSingularities` (son 10 çöküş hafızası ve SP/dk verimi), `highestDps` takibi, `totalManualDopamine` takibi, çarpan / istasyon / biyometrik getter'ları.
  - `src/components/StatsTab.vue`: 5 alt sekmeli kontrol paneli (`overview`, `multipliers`, `past10`, `challenges`, `biometrics`), interaktif SVG zaman çizelgesi, Balatro cam paneller, tek tıkla kriz karnesi kopyalama.
- **Doğrulama:** `npx vue-tsc --noEmit` 0 hata + `npm run build` (1642 modül). Detay: `completed.md` v0.21.0 girdisi | ADR: `brain/decisions/0019-hybrid-stats-and-telemetry-system.md`.

---
- **Kapsam:**
  - `src/components/AnomalyOverlay.vue`: Özel neon SVG vektör ikonları (`fyp` çok katmanlı alev, `heart_frenzy` atan kalp + EKG, `sponsor` dönen 8-ışınlı elmas starburst), dönen conic border-beam lazer ışığı, holografik shimmer cam sweep, telaşlı panic-pulse uyarısı.
  - `src/components/ScreenOverlay.vue`: Gece Kriz Perimetre Aurası (`crisis-perimeter-aura`), Rezonans Hipnozu psikedelik çift nabız, anlık kriz tıklama flaşı.
  - `src/components/JuiceLayer.vue`: Canvas 2D neon şok dalgaları (`shockwaves`) ve 360° saçılan hız/sürtünmeli neon kıvılcımlar (`sparks burst`).
  - `src/core/audio.ts`: Kriz doğuş uzaysal arpeji (`playAnomalySpawn`) ve kriz tipine göre tını sentezleri (`playCrisisCollect`).
  - `src/stores/game.ts`: Ses ve görsel olay zinciri senkronizasyonu + lab mutasyon döngüsü düzeltmesi.
  - `src/style.css`: Border beam, shimmer, panic pulse ve aura animasyon kuralları.
- **Doğrulama:** `npm run build` ile 0 hata (1642 modül). Detay: `completed.md` v0.20.0 girdisi | ADR: `brain/decisions/0018-hybrid-night-crisis-visual-and-audio-system.md`.

---

- **Kapsam:**
  - Akış Sıçraması (Shift 5+) matematiksel imkansızlık hatası: `25 * 100^(shifts-4)` yerine lineer `20 + 15 * (shifts-4)` D8.
  - Sonsuz Akış Kümesi (Galaxy) gereksinimi: `100 + 60*gal` ($10^{159}$) yerine ulaşılabilir `40 + 20*gal` ($10^{69}$).
  - Sıçrama Gücü (`BASE_SHIFT_POWER`): %7 (1.07) yerine AD-standardı 2.0x (C7 ödülü 2.2x).
  - C7 (Hesap Kısıtlaması) D6 gereksinimleri ve UI (`DimensionsTab.vue:51`) D8 yerine D6 dinamik gösterimi.
  - C5 (Gece Enflasyonu) softlock düzeltmesi: prestige anında (`relieveChallengeOnPrestige`) enflasyonun sıfırlanması.
  - C4 (Sansür Matrisi) boyut zinciri: çift boyutların üretimi D_0 iken tek boyutların tek boyutlara akması ($D_7 \to D_5 \to D_3 \to D_1$).
  - Autobuyer ilerleme kilitleri: D7 ve D8 botlarının kilitli boyutlardan önce açılma hatası düzeltmesi.
  - Nöral Ağaç: `guilt_immunity` ve `break_singularity` düğümlerinin ağaca eklenmesi ve senkronizasyonu; Şafak Habercisi ve SP kazanç formülünün erken floor sorunundan arındırılması.
  - Başarım `sin_shop` sayacının hem legacy hem Nöral Ağaç düğümlerini kapsaması.
- **Doğrulama:** Simülasyon scriptleri (`brain/scratchpad/`) + `npm run build` ile 0 tip hatası. Detay: `completed.md` v0.19.0 girdisi | ADR: `brain/decisions/0017-economy-rebalancing-and-progression-wall-fix.md`.

---

## ✅ Tamamlanan: Balatro Tarzı Hibrit Görsel Mimari & Ekran Dokuları (v0.18.0)
- Kapsam: `src/core/tilt.ts` (3D kart tilt/light composable), `src/style.css` (Foil, Holo, Poly, Negative sınıfları), `ScreenOverlay.vue` (Başparmak izi + Kriz çatlak cam overlay), `SettingsModal.vue` ayar entegrasyonu, `ChallengesTab.vue`, `DimensionRow.vue`, `AnomalyOverlay.vue` ve `DimensionsTab.vue` entegrasyonu. Final `npm run build`: 0 hata (1642 modül). Detay: `completed.md` v0.18.0 girdisi | ADR: `brain/decisions/0016-balatro-hybrid-visual-system.md`.

## ✅ Tamamlanan: Gece Kriz Meydan Okumaları (v0.17.0 adayı, 2026-10-02)
- Faz 1 (Motor) + Faz 2 (UI) + Faz 3 (C2–C8 + denge + ADR-0015) tamamlandı. Final `npm run build`: 0 hata (1639 modül). Detay: `brain/tasks/completed.md` v0.17.0 girdisi.
- Bilinen kalıntılar: C7 dengeleyicileri, C8 ivme/baz hız ve süre-metas eşikleri simüle edilemedi — varsayılanla yayınlandı (ADR-0015'te işaretli); mobil 9-buton nav taşması gözle kontrol edilecek.

## ✅ Son tamamlanan: Kapsamlı QoL Turu P0+P1 (v0.15.0 adayı)
- Arka plan sekmesi düzeltildi (rAF durunca offline yakalama + visibilitychange kaydı), 24 saat cap'li kademeli offline simülasyon + "Tekrar hoş geldin" modalı, save yedek slotu + version migration kancası, tek onay diyaloğu (ConfirmModal), ×10/×100/Maks satın alma modları + `v-hold` basılı tut tekrarı, 1-8/M/Esc kısayolları, çarpan kırılım paneli + üretim sparkline'ı, bildirim noktası boşlukları, ayar eklemeleri.
- `npm run build`: 0 hata (1636 modül). ADR: `brain/decisions/0014-qol-pass-p0-p1.md`.

## 🔎 Araştırması tamamlanan (2026-10-02)
- **Gece Kriz Meydan Okumaları (Normal Challenges):** Codebase + internet araştırması tamamlandı, uygulama planı **v2'ye yükseltildi** → `brain/research/challenges-research-and-plan.md`. v2 yenilikleri: wiki.gg ile doğrulanmış AD tablosu + Revolution Idle Trials referansı, satır numaralı codebase denetimi (2 v1 hatası düzeltildi: 59 başarım/tempo hedefleri), C8 yeniden tasarımı (fail-state yok), offline/save kenar durumları, kademeli açılış + kademeli süre-metas. **Onay bekleniyor** — hedef sürüm v0.17.0 adayı.

## ✅ Tamamlanan: İlk prestij öncesi cila — B paketi (Satın alma UX, v0.17.1 adayı)
- Kapsam: Maks disabled fix (tek paket maliyeti), mobil miktar rozeti, satın alma modu açıklaması (1 paket = 10 adet), Kolektif Trend erken sadeleştirme, Galaksi kartı erken gizleme. Faz 2 kapalı.
- Durum: tamamlandı (detay completed.md v0.17.1 girdisinde).

## 🔜 Sıradaki adaylar (backlog'tan)
- P2 QoL kalıntıları: başarımlar için ilerleme kesri önizlemesi (ach progress fraction), olay geçmişi günlüğü ("Gece Kaydı"), achievements filtre çipleri, kilitli sekmeye mobilde dokununca gereksinim toast'ı.
- Faz 2: Kolektif Gece Nöbeti katmanı içeriği (1e4000 sonrası şu an boş).
