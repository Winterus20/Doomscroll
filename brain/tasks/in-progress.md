# Aktif Görev (In-Progress)

## ✅ Tamamlanan: UROBOROS (The Cosmic Feast) Tematik Dönüşümü ve Kalite Kapısı Onayı (v0.32.0, 2026-10-04)
- **Kapsam:** D1–D8, UI sayaçları ("Yutulan Kütle", "Çekim Hızı Hz", "YUT!"), tüm sekmeler, modallar, canlı yorumlar, biyometri unvanları ve dokümantasyon UROBOROS kuantum-kozmik evrenine uyarlandı.
- **Doğrulama:** `npm run build` 0 hata (1701 modül) + `npm test` 162/162 yeşil + Subagent `Quality Gate Evaluator` tarafından `<evaluation>PASS</evaluation>` onayı.

## ✅ Tamamlanan: Reset Düzeltmesi + Alev Okunabilirlik 5.5 (2026-10-04)
- **Doğrulama:** `npm run build` 0 hata (1692 modül) + `npm test` 162/162 yeşil.

## ✅ Tamamlanan: Dopamin Nabzı 2.0 — Sayaç Juice (2026-10-04)
- **Kapsam:** `Header.vue` (log-hız ısısı, büyüklük pop, /s delta oku, dekad shake+shockwave),
  `style.css` (ısı ramp glow, pop kademesi, sheen hızı), `audio.ts` (tally tick + payoff).
- **Doğrulama:** `npm run build` 0 hata (1692 modül) + `npm test` 162/162 yeşil.

## ✅ Tamamlanan: Balatro Sütun 2: "Reels Vuruşu" Sıralı Nedensellik (Sequential Triggering) (v0.28.0)
- **Kapsam:**
  - `brain/research/balatro-column-2-sequential-triggering-deep-dive.md`: Derin araştırma belgesi.
  - `ADR-0038`: Mimari karar kaydı.
  - `src/models/types.ts`: StrikeStage, SequentialStrikePayload, GameSettings.sequentialStrike.
  - `src/core/audio.ts`: playSequentialStrike (Lydian yükselen polifonik arpej + sub-bass tokmağı + CRIT parlaması) & playMacroSurge.
  - `src/stores/game.ts`: swipeBreakdown getter'ı, manualClick coordinates & sequential events, dimensionShift/buyGalaxy macro-surge.
  - `src/components/SequentialStrikeLayer.vue`: Mikro kaskat rozetleri, yaylanma animasyonu, anti-lag coalescing ve sinematik makro surge barı.
  - `src/components/Header.vue` & `src/components/DimensionsTab.vue`: Koordinat senkronizasyonu.
  - `src/components/SettingsModal.vue`: Görsel sekmesine "Sıralı Reels Vuruşu (Balatro Pop-Chain)" toggle anahtarı.
  - `src/App.vue`: Katman montajı.
  - `src/stores/sequential-strike.test.ts`: 5 yeni birim testi.
- **Doğrulama:** `npm run build` 0 hata, 1692 modül + `npx vitest run` 162/162 test geçti + Playwright canlı tarayıcı testi tamamlandı.

---
- **Kapsam:**
  - `src/models/types.ts`: `GameSettings` içine `swirlShaderQuality: 'off' | 'balanced' | 'high'` eklendi.
  - `src/stores/game.ts`: Varsayılan ayar ve ayar yönetimi.
  - `src/components/AlgorithmicSwirl.vue`: WebGL2 (fallback WebGL1) Balatro Paint Swirl shader'ı, 0.5x retro piksel tamponu, 5-iteratif kaos dalgası, kutupsal UV bükülmesi, pürüzsüz Lerp motoru (hız & renkler), `visibilitychange` ile arka planda sıfır tüketim, context-loss dayanıklılığı.
  - `src/App.vue`: En alt z-katmanına (`fixed inset-0 pointer-events-none`) montaj.
  - `src/components/SettingsModal.vue`: Görsel sekmesine "Algoritma Arka Plan Girdabı (Balatro Swirl)" ayarı.
- **Doğrulama:** `npm run build` 0 hata, 1689 modül + `npx vitest run` 157/157 test geçti + Playwright canlı tarayıcı render & ayarlar modalı testi tamamlandı.

---

## ✅ Tamamlanan: SP Yalnızca Şafakta (ADR-0034)

- **Kullanıcı talebi:** *"sp sadece şafak yaptığımızda gelmeli"* → şafak dışı SP kaynağı (ADR-0032 Dekad Primi, 72 SP) kaldırıldı.
- **Kullanıcı seçimi:** Ödül koşu içi buff'a çevrilsin (SP hiç artmasın).
- **Kapsam:** `pacing.ts` (`DECADE_SURGES`), `game.ts` (`decadeSurgeMult` + `tickspeedMultiplier` + `resetRunState`), `save-version.ts` (13 → 14), `App.vue` (rozet), `pacing.test.ts` (11 test).
- **Doğrulama:** `npm run build` **0 hata** (1686 modül) + `npx vitest run` **135/135**.
- **Açık denge sorusu:** 1. koşu artık 1 SP veriyor (kök düğüm). Ağacın erken kademeleri
  boş kalıyor — `brain/tasks/todo.md` "SP ekonomisi" maddesi.
- **Detay:** `brain/decisions/0034-sp-only-at-dawn-decade-surge-run-buff.md`

---

## 🔄 Bu Tur: Bütünlük, Performans ve Erişilebilirlik Düzeltme Turu (v0.26.0) — TAMAMLANDI

- **Kapsam:** dört paralel denetim (ilerleme/ekonomi, mühendislik, UX/a11y, kayıt/güvenlik); her bulgu grep + kod okuma + 360 px tarayıcı ölçümüyle yeniden doğrulandı.
- **Ekonomi (3 gerçek hata):** geçici 'Format Keşfi' bonusunun cache anahtarı türev alan içermediği için kalıcı çarpana dönüşmesi; `matterPerSecond`'ın her tick yalnızca rekor için hesaplanması; **NaN dopaminin tüm açılma merdivenini geçmiş gibi göstermesi** (`AGENTS.md` `dec.isNan()` kuralının ihlali); başarım çarpanın beyaz listsiz yüklenmesi.
- **Kayıt/güvenlik:** `SAVE_VERSION` tek kaynağa (`src/core/save-version.ts`) + gelecek sürüm koruması; bozuk kayıt karantinasi (`*_CORRUPT`); yedeklemenin tüm slotlara genişletilmesi; bulut yazma işlem (transaction) + ön koşul koruması (`CloudWriteConflictError`); periyodik senkronun önce çakışma kontrolünden geçmesi; sayısal Decimal karşılaştırması; bulut indirmeden önce `snapshotSlot()`.
- **Performans:** O(n²) `ACHIEVEMENTS.filter()` döngü içi çağrısı → modül yükünde indeks; `achievementMultiplier` tick içi tarama → uzunluk anahtarlı memo.
- **Erişilebilirlik/mobil:** `src/core/focus-trap.ts` ile altı modalda gerçek `role="dialog"` + odak tuzağı; `v-tip` için focus/blur/Escape + `aria-describedby` (uzun basış davranışı aynen korundu); `aria-live` toast'larda; **360 px'te kırpılan ayar dişlisi taşma satırından dışarı taşındı**; aktif sekme görünür alana çekiliyor; `prefers-reduced-motion` kapsamı genişletildi; `batterySaver` artık gerçekten JS yükü azaltıyor; `floatingTexts` bağlandı, `newsTickerEnabled` (bileşeni hiç yazılmamış) kaldırıldı.
- **Güvenlik:** `firestore.rules` + `firebase.json` (deny-by-default, sahiplik kontrollü); `permission-denied` mesajı artık Test Modunu açmayı değil kapatmayı söylüyor.
- **Hijyen:** vitest + **92 test**; `dist/` izlemeden çıkarıldı; `README.md`; ADR numaralandırma çakışması çözüldü; GAME_DESIGN.md başarım rakamları gerçek veriye hizalandı (8 kategori / 68 / ×3.59 / 10 gizli); sürüm 0.26.0.
- **Doğrulama:** `npm run build` (vue-tsc + vite) **0 hata, 1684 modül** ve `npm test` **92/92 geçti**.
- **Detay:** `brain/decisions/0031-integrity-performance-and-accessibility-fix-pass.md` | Güvenlik: ADR-0030

---

## ✅ Tamamlanan: Misafir Modu, Google & E-posta Girişi ve Bulut Senkronizasyonu (v0.25.0)
- **Kapsam:**
  - `package.json`: `firebase` entegrasyonu.
  - `src/models/auth-types.ts`: `AuthUser`, `CloudSaveData`, `CloudConflictData`, `SyncStatus` tipleri.
  - `src/core/auth/firebase-config.ts`: Canlı Firebase ve akıllı Dev/Mock sağlayıcı mimarisi.
  - `src/core/auth/auth-service.ts`: Google Popup, E-posta/Şifre kayıt/giriş, Şifremi unuttum, Oturum kapatma.
  - `src/core/auth/cloud-save-service.ts`: Firestore bulut kayıt/yükleme, akıllı çakışma dedektörü.
  - `src/stores/auth.ts`: Pinia auth store'u, reaktif kullanıcı durumu ve otomatik senkronizasyon.
  - `src/components/AuthModal.vue`: Cyberpunk/Neon cam giriş modalı ve hesap yönetim paneli.
  - `src/components/CloudConflictModal.vue`: İki sütunlu yerel vs bulut karşılaştırma ve seçim modalı.
  - `src/components/Header.vue`: Profil / Bulut durumu butonu ve canlı senkron ışığı.
  - `src/components/SettingsModal.vue`: Kayıt sekmesine "☁️ Bulut Senkronizasyonu" kartı.
  - `src/App.vue`: Modal bağlamaları ve otomatik bulut döngüsü entegrasyonu.
- **Doğrulama:** `npm run build` ile 0 tip hatası (1682 modül) + Playwright ile canlı tarayıcı testi (`localhost:4173`). Plan: `auth_cloud_save_plan.md` | ADR: `0021-guest-mode-google-auth-and-cloud-save-system.md`.

---

## ✅ Tamamlanan: En İyi Sistem Ayarları Mimarisi & Çoklu Kayıt Slotları (v0.24.0)
- **Kapsam:**
  - `src/core/save.ts`: 3 bağımsız kayıt slotu (`SaveSlotMeta`), slot kopyalama, slot geçişi, periyodik rotasyon yedeği ve `inspectSaveString` kayıt önizleme denetimi.
  - `src/stores/game.ts`: `switchSaveSlot`, `copySaveSlot`, `deleteSaveSlot`, `restoreFromBackup` action'ları ve yeni QoL varsayılanları.
  - `src/models/types.ts`: `decimalPlaces`, `batterySaver`, `floatingTexts`, `newsTickerEnabled`, `offlineProgressModal`, `hotkeysEnabled`, `activeSlot`.
  - `src/style.css`: `.battery-saver` GPU/CPU yükünü düşüren stil kuralları.
  - `src/App.vue`: Pil tasarruf sınıfı, kısayol toggle kalkanı, çevrimdışı modal ayarı.
  - `src/components/SettingsModal.vue`: 5 sekmeli (Oynanış, Görsel, Lo-Fi Radyo, Kayıt & Slotlar, Kısayollar) Bento Grid mimarisi; dosya seçici, canlı otomatik kayıt telemetrisi, akıllı doğrulama kartı ve güvenli "RESET" hard reset onay kutusu.
- **Doğrulama:** `npm run build` ile 0 tip/derleme hatası (1657 modül) + Playwright yerel dev server canlı arayüz doğrulama testi. Detay: `completed.md` v0.24.0 girdisi | ADR: `brain/decisions/0020-best-in-class-settings-and-multi-slot-save-system.md`.

---

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
