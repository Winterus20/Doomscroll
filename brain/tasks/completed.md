# Tamamlanan Görevler ve Değişiklik Günlüğü (Changelog)

## [2026-10-01] - UI Bütünlük & Senkronizasyon Devrimi (v0.7.1)

### Tespit Edilen Dağınıklık:
- 2 ayrı panel dili (`bg-dark-900/border-slate-800` eski vs `bg-black/40/border-white-alpha` yeni) 8 sekmede karışık kullanılıyordu.
- 5 farklı progress bar yüksekliği/rengi (h-1, h-1.5, h-2, h-3) ve 4 farklı hero başlık şablonu.
- `SettingsModal` ayrı renk sözlüğü (`dark-*`, `quantum-*`) kullanıyordu; diğerleri Tailwind mor/camgöbeği/amber dilindeydi.
- `AnomalyOverlay` ikonları tipine bakılmaksızın hep mor gösteriyordu (renk bug'ı).
- Z-index çakışması: Juice/Anomali/Toast/Modal hepsi `z-50` idi.
- `AchievementToast` kuyruğu hızlı ardışık açılışlarda takılıyordu; konum üst-sağda buff bar ile çakışıyordu.
- Header saati statik `02:47 AM` yazıyordu; oyun ilerlemesinden kopuktu. Duruş etiketi de statikti.
- Nav'da kilitli sekmeye tıklama + prestij sonrası kilitli sekmede kalma senkron hataları vardı.

### Yapılan İş:
1. **`src/style.css`:** Birleşik "Obsidian Dock" tasarım sistemi — `.panel-hero` + 7 accent, `.stat-box`, `.section-label/.section-hint`, `.ds-badge` (6 renk), `.progress-track` (mini/sm/md) + `.progress-fill` (7 renk), `.tab-dot` (6 renk, tek nabız animasyonu), `.btn-primary-*`, `.layer-anomaly/juice/toast/modal` katman sıralaması, `focus-visible` + `prefers-reduced-motion`.
2. **`src/components/TabHero.vue` (yeni):** Tüm sekmelerin tek hero bileşeni (icon/title/badge/subtitle/accent + stats/progress/alert slotları).
3. **`src/App.vue`:** Nav stilleri `NAV_BTN`/`navClass()` ile tekleşti; `tabLocked` haritası + kilitli tıklamada "Kilitli" juice geri bildirimi; prestij sonrası güvenli sekmeye otomatik dönüş watcher'ı; Kriz (enerji dolu/backfire) ve Bot (bulk/max açılabilir) için yeni senkron bildirim noktaları; `no-scrollbar` + `pb-8` ritim.
4. **`src/components/Header.vue`:** Gece saati Şafak ilerlemesiyle senkron (02:47→06:00 log interpolasyonu, tabular-nums); duruş etiketi stance ile senkron.
5. **Sekmeler:** `LabTab`/`CrisisTab`/`AutobuyersTab`/`SingularityTab`/`AchievementsTab`/`StatsTab` → `TabHero` + `.stat-box` + `.progress-track` birliği; `DimensionsTab`/`DimensionRow` mini barlar birleşik sınıflara geçti; `space-y-3` tek ritim; `dark-900/slate-800` kalıntıları `black/40 + white-alpha` diline göçtü.
6. **Katman & bug:** `AnomalyOverlay` tip-bazlı ikon rengi (`getIconColor`) + `layer-anomaly`; `JuiceLayer` → `layer-juice`; `AchievementToast` kuyruk pompası düzeltmesi + sağ-alt konum + `layer-toast`; `SettingsModal`/`AdminPanel` → `layer-modal`; Settings modal `quantum/dark` sınıflarından arındırıldı.
7. **Doğrulama:** `vue-tsc --noEmit` sıfır hata. (`vite build` bu ortamda `@rollup/rollup-linux-x64-gnu` eksik olduğu için çalışmıyor — değişikliklerden bağımsız ortam sorunu; `dist/` önceki derlemeden mevcut.)

## [2026-09-30] - Gece Başarımları Sekmesi + Kalıcı Ödüller (v0.7.0)

### Yapılan İş:
1. **`src/models/types.ts`:** `AchievementCategoryId`, `AchievementRewardKind` (10 niş ödül), `AchievementDef`, `AchievementContext` tipleri; `PlayerStats.seedsPlanted`; `SerializedPlayerState.achievements?` + `achievementsSeenCount?`.
2. **`src/game/achievements.ts` (yeni):** 7 kategori × 8 = 56 başarım tanımı (7 gizli/shadow), denge sabitleri (`1.012`/satır `1.06` → tam set ≈×2.93), `calcAchievementMultiplier`, `hasAchievementReward`.
3. **`src/stores/game.ts`:** `state.achievements` (reset'lere dokunulmaz → prestij kalıcı) + toast kuyruğu + 14 getter (global çarpan + 10 niş ödül + başlangıç maddesi); `checkAchievements()` `update()` sonunda (offline'da da tetiklenir); ödüller `matterPerSecond`, boyut zinciri, `manualClickPower`, tickspeed maliyeti, anomali aralığı, sızıntı, kafein, SP maliyeti, hasat, buff süresi ve 3 reset'in başlangıç maddesine uygulandı; `singularityGain` bilinçli olarak hariç; serialize v7.
4. **`src/components/AchievementsTab.vue` + `AchievementToast.vue` (yeni):** Kategori satırları, ilerleme barları, ödül rozetleri, gizli `???` kartları; sağ üst 4 sn toast kuyruğu.
5. **`src/App.vue`:** `Plaket` dock butonu (Trophy, yeni başarım noktası) + render + `markAchievementsSeen`.
6. **`src/components/SingularityTab.vue`:** SP maliyet gösterimi indirimi yansıtacak şekilde güncellendi.
7. **`GAME_DESIGN.md`:** §8 Başarımlar bölümü eklendi.
8. **Doğrulama:** `npm run build` sıfır hata (1621 modül).

## [2026-09-30] - Hard Reset Dirilme Hatası Düzeltmesi (v0.6.5)

### Kök Neden:
- `SettingsModal.vue` içindeki "Evet, Sıfırla" butonu `SaveSystem.hardReset()` (anahtarı siler) + `window.location.reload()` çalıştırıyordu.
- Ama `App.vue` içindeki `beforeunload` dinleyicisi ve oyun döngüsünün 10sn otomatik kaydı, yeniden yükleme anında hafızadaki ESKİ state'i tekrar kaydedip silinen kaydı diriltiyordu. Sonuç: sıfırlama çalışmıyor gibi görünüyordu.

### Yapılan İş:
1. `src/core/save.ts`: `saveSuppressed` bayrağı eklendi; `hardReset()` bayrağı kurup anahtarı siler, `save()` bayrak kuruluysa yazmayı atlar. Sayfa yeniden yüklenince modül sıfırlanır, normal kayıt devam eder. Admin panelindeki Hard Reset de aynı fonksiyonu kullandığı için otomatik düzeltildi.
2. **Doğrulama:** `npm run build` sıfır hata (1616 modül).

## [2026-09-30] - Gizli GODMODE Admin Paneli (v0.6.4)

### Yapılan İş:
1. **`src/components/AdminPanel.vue` (yeni):** Kaynaklar (Dopamin preset/özel ekle-ayarla, SP, Tekillik), Boyutlar (D1-D8 +10, tümü +100, Hz/Shift/Galaksi), Buff & Olay (Gece 3, Histeri, 5439x kombo, anomali/vicdan doğur-temizle-primli bozdur), Lab/Kriz/Bot (kafein full, lab olgunlaştır, 🧠 ekle, tüm botları aç-çalıştır-durdur, SP dükkanı maxla), Zaman/Prestij (1dk-8sa ileri sar, Shift/Galaksi/Tekillik zorla, Hard Reset).
2. **`src/App.vue`:** Global `keydown` dinleyicisi ile `godmode` tamponu (son 7 harf, büyük/küçük harf duyarsız); eşleşmede panel aç/kapat + `ESC` ile kapatma; `onUnmounted` temizliği.
3. **Doğrulama:** `npm run build` sıfır hata (1616 modül, 2.74s).

## [2026-09-30] - İlk Prestij Denge Ayari: ~3 Saat Hedefi (v0.6.3)

### Hesap:
- Simülasyon (hibrit tekli ağırlıklı + 15sn manuel): eski değerlerle 53 dk, hedef 2-4 saat.
- Seçilen ayar (a): tick 10x->13x, shift 20->25, galaxy 80->100 = 178 dk (~2.98 saat).
- Tür standardı: AD ilk Infinity 4sa-2gün, Cookie ilk ascension 1-2 gün.

### Yapılan İş:
1. `src/stores/game.ts:388`: `tickspeedCost` 10x -> 13x.
2. `src/stores/game.ts:397`: `shiftRequirement` 20 -> 25.
3. `src/stores/game.ts:412`: `galaxyRequirement` 80 -> 100.
4. **Doğrulama:** `npm run build` sıfır hata.

## [2026-09-30] - Hibrit Oto-Alım Kademesi: Tekli -> Toplu -> Max (v0.6.2)

### Yapılan İş:
1. **`src/models/types.ts`:** `AutobuyerMode` eklendi, `AutobuyerConfig.mode` ve save alanları (`mode`, `autobuyerBulkUnlocked`, `autobuyerMaxUnlocked`) eklendi.
2. **`src/stores/game.ts`:** `AUTOBUYER_BULK_COST (2.5e11 + 1 Shift)`, `AUTOBUYER_MAX_COST (1e22 + 1 Galaxy)`, `getAutobuyerInterval()` (tekli 3sn / toplu 1.5sn / max 0.5sn; shift/galaxy daha yavaş), `unlockBulkMode/unlockMaxMode/setAutobuyerMode`, update döngüsü moda duyarlı (tekli 1 paket, toplu 5 paket, max sınırsız), serialize v6 + eski kayıt göçü.
3. **`src/components/AutobuyersTab.vue`:** 3 kademe kartı + bot başına TEKLİ/TOPLU/MAX seçici, kilitli modlar devre dışı.
4. **Doğrulama:** `npm run build` sıfır hata (1614 modül).

## [2026-09-30] - Müzik Motoru v2 Yükseltmesi (v0.6.1)

### Araştırma Kaynakları:
- gskinner convolution reverb (decaying noise impulse + pre-delay + multitap)
- MDN Advanced Audio (envelope, noise buffer, lookahead scheduler)
- Melodics lo-fi teori (min7/maj7/9th, ii-V-I, broken chords)

### Yapılan İş:
1. **`src/core/music-engine.ts` tam yükseltme:**
   - Master zincir: Filter -> Duck -> Compressor (-18dB, 4:1) -> Master -> Analyser.
   - Convolution reverb (2.2sn stereo impulse) + delay hem filtreye hem reverbe.
   - Davullar gerçek noise tamponuna geçti (snare/hat/shaker + kick klik).
   - Swing (lo-fi %14, groove %10) + humanize (±8ms, ±%15 velocity).
   - Caz akorları: Fmaj9-Em9-Dm9-Cmaj9 + inversiyon varyasyonu, ghost vuruşlar.
   - Sidechain duck, per-nota stereo pan, wow/flutter vibrato, bas reverbden muaf.
   - Yeni `setIntensity()` API (geriye uyumlu, store kırılmadı).
2. **ADR:** `brain/decisions/0004-music-engine-v2.md` açıldı.
3. **Doğrulama:** `npm run build` sıfır hata (8.77s, 1614 modül).

## [2026-09-30] - Faz 6: Night Owl Lo-Fi & Synth BGM Engine Yayını (v0.6.0)

### Tamamlanan Özellikler:
1. **Kesintisiz Prosedürel Web Audio Müzik Motoru (`src/core/music-engine.ts`):**
   - **Sıfır Harici Ağ Bağımlılığı (0 KB):** Ağ kopması veya CORS sorunlarından etkilenmeyen, tamamen yerel Web Audio API osilatörleri ve filtreleri ile çalışan sonsuz sentezleyici motoru.
   - **Chris Wilson "A Tale of Two Clocks" (Lookahead Scheduler):** 25ms hassasiyetli zamanlayıcı ile notaları 120ms önceden donanım saatine (`ctx.currentTime`) programlayan, UI gecikmelerinde sıfır ritim kayması garantili mimari.
   - **Analog Lo-Fi & DSP Efekt Zinciri:**
     - Sıcak kaset alçak geçiren filtre (Warm BiquadFilter 1400Hz, Q: 1.2).
     - Stereo uzaysal delay hattı (380ms delay + %28 feedback).
     - Pembe gürültü (Pink noise) + seyrek mikro plak kıvılcımları ile oluşturulmuş **Nostaljik Vinil/Kaset Cızırtısı**.
     - Yavaş analog kaset yalpalaması (Tape wow/flutter LFO detuning).
2. **4 Özel Gece 3 Radyo İstasyonu (Kanallar):**
   - 🌙 **02:47 AM Lo-Fi Chill (68 BPM):** `Cmaj9 -> Am9 -> Dm9 -> G13` döngüsü, sıcak Rhodes E-Piano (Triangle+Sine, chorus detune), derin 808 sub-bass, fırçalı yumuşak lo-fi beat.
   - 🌌 **Cyberpunk Midnight (104 BPM):** `F#m -> D -> A -> E`, 16'lık hipnotik neon arpej, 8'lik yürüyen analog bas hattı, elektro kick & snare.
   - 🪐 **Deep Sleep Ambient (46 BPM):** Yavaşça nefes alan 432Hz meditatif analog pad'ler, derin uzaysal sub-drone ve rastgele parıldayan kristal gece çanları.
   - 🛹 **Subway Beats & Groove (88 BPM):** Taktil yukarı kaydırma refleksiyle senkronize ritmik funk bas yürüyüşü ve groovy pluck stabs.
   - 📻 **Özel Akış / Web Radyo:** Kullanıcının dilediği harici MP3 veya lofi radyo stream URL'sini girebileceği HTML5 `Audio` köprüsü.
3. **Minimalist Telefon Durum Çubuğuna Entegre Lo-Fi Radyo Widget'ı (`Header.vue`):**
   - Gerçek zamanlı dans eden 4 kanallı ekolayzır (Visualizer) barları.
   - Parça adı ve ikonu.
   - Hızlı Oynat/Duraklat (Play/Pause) ve Sonraki Kanal (SkipForward) butonları.
4. **Gelişmiş Müzik ve Ses Ayarları Modalı (`SettingsModal.vue`):**
   - Bağımsız BGM & SFX ses seviyesi kaydırıcıları (%0 - %100).
   - 5 istasyon seçim kartı (aktif seçim neon mor ışıltılı).
   - Analog vinil/kaset cızırtısı açma/kapatma anahtarı.
   - Harici stream URL girdi alanı.
5. **Tarayıcı Autoplay Kilit Çözücü (`App.vue`):**
   - Kullanıcının sayfaya ilk tıklamasında veya Space tuşuna basmasında `AudioContext`'i anında uyandıran listener.
6. **Doğrulama & Görsel Kanıt:**
   - `npm run build` (`vue-tsc && vite build`) sıfır hata ile tamamlandı (2.19s).
   - Headless Chrome ile 1600x1000 masaüstü, 390x844 mobil ve 1600x1100 ayarlar modalı ekran görüntüleri alındı ve onaylandı.

---

## [2026-09-30] - Faz 3: Doomscroll: The Endless Reels Yayını (v0.3.0)

### Tamamlanan Özellikler:
1. **Evren ve Konu Dönüşümü (Doomscroll: The Endless Reels):**
   - Oyunun adı ve hikayesi **Doomscroll: The Endless Reels** (*"Gece 3'te 2 Dakika Bakıp Çıkacaktım"*) olarak baştan sona güncellendi.
   - Ana kaynak **DOPAMİN (Dopamine)** ve **+X Dopamin / sn**.
   - Tıklama Butonu: **👆 YUKARI KAYDIR! (Swipe Up / Scroll!)** (ve Space tuşu).
   - 8 Reels İstasyonu ($D_1 - D_8$):
     1. *Masum Kedi & Köpek Videoları*
     2. *Gece 3 Sokak Lezzetleri & Eritme Peynir*
     3. *ASMR Sabun Kesme & Halı Yıkama*
     4. *Subway Surfers Eşliğinde Reddit Hikayesi*
     5. *Gece 4 'Sigma' Girişimci Tavsiyeleri*
     6. *12 Kısımlık Hint Dizisi (Part 1/12)*
     7. *Gece 5 Varoluşsal Kriz Belgeselleri*
     8. *Saf Beyin Çürümesi (Brainrot Singularity)*
   - Tickspeed $\to$ **Algoritma Frekansı (Hz)**; Boost $\to$ **Akış Sıçraması**; Galaksiler $\to$ **Sonsuz Akış Kümeleri**; Singularity $\to$ **Sabah 06:00 Çöküşü (Güneş Doğdu Ama Duramıyorum!)**.
2. **Kuantum Dalgalanmaları / Rastgele Gece Krizleri (Cookie Clicker):**
   - Ekranda belirli aralıklarla yüzen ve 14 saniye içinde tıklanmayı bekleyen **Işıltılı Gece Krizleri** (`AnomalyOverlay.vue`).
   - 3 Farklı Güçlü Etki:
     - **🔥 Gece 3 Çılgınlığı:** 60 sn boyunca tüm dopamin akışı $7\times$ katlanır.
     - **👆 Başparmak Histerisi:** 15 sn boyunca Yukarı Kaydırma gücü $777\times$ fırlar.
     - **💎 50 Milyonluk Viral Video:** Anında 15 dakikalık dopamin doğrudan beyne enjekte edilir.
   - **Rezonans Hipnozu:** Gece 3 ve Başparmak Histerisi aynı anda aktifleştiğinde katlanarak **$5,439\times$ süper dopamin patlaması** yaşanır.
3. **Taktiksel Gece Duruşları (Trimps Stance Sistemi):**
   - **🛌 Yorgan Altı Modu:** Pasif dopamin akışına $+100\%$ odak (2× Üretim).
   - **⚡ Çılgın Kaydırma:** Manuel kaydırma gücüne $+300\%$ (4× Tıklama) ve Gece Krizi sıklığına $+50\%$ ivme.
   - **🕶️ Düşük Parlaklık Modu:** Algoritma Frekansı satın alma maliyetlerinde $\%15$ indirim (Gözleri yakmaz!).
4. **Vicdan Azabı ve Göz Batması (Cookie Clicker Wrinklers):**
   - Gece ilerledikçe ekrana dadanan vicdan sesleri (*"Yarın Erken Kalkacaksın!"*, *"Gözlerin Kan Çanağı Oldu"*, *"Telefon Yüzüne Düşmek Üzere"*) üretimin %3'ünü emer.
   - Üzerlerine **3 kez tıklanarak "Sadece 1 Video Daha!"** denilip susturulurlar; susturulduklarında uykuyu yendiğin için emdikleri dopaminin **%120'sini iade ederler**.
5. **Gece Reels Ses Synthesizer'ı:**
   - Web Audio API ile taktil yukarı kaydırma sweep whoosh sesi, kamera deklanşör/flaş, gece bildirim çanı, sabah 06:00 kuş cıvıltıları ve fanfar eklendi.
6. **Doğrulama & Görsel Kanıt:**
   - `npm run build` (`vue-tsc && vite build`) sıfır hata ile tamamlandı.
   - Headless Chrome ile tam çözünürlüklü test yapıldı; gece neon moru/siberpunk akış arayüzü görsel olarak kanıtlandı.

---

## [2026-09-30] - Faz 4: Katman 1 Mini-Oyunları & Otomasyon Botları Yayını (v0.4.0)

### Tamamlanan Özellikler:
1. **Algoritma Laboratuvarı (*The Garden - 3×3 Trend & Ses Çaprazlama*):**
   - 2. İstasyon (Sokak Lezzetleri) açıldığında aktifleşir.
   - 5 farklı tohum formatı:
     - 🐱 *Kedi Miyavlaması:* Hızlı büyüme, hücre başına +15% pasif dopamin çarpanı.
     - 🧀 *Eritme Kaşar Cızırtısı:* Orta büyüme, hücre başına +35% pasif dopamin çarpanı.
     - 🛹 *Subway Surfers Beat:* Yavaş büyüme, hücre başına +100% Yukarı Kaydırma gücü.
     - 🗿 *Sigma Phonk:* Gece Krizleri sıklığını %50 artırır.
     - 🧠 *Saf Nöron Çürütücü (Efsanevi Mutasyon):* Kedi ve Phonk tohumları komşu olduğunda kendiliğinden mutasyona uğrar; tüm küresel dopamin üretimini +150% katlar!
   - Canlı tutma, hasat etme ve budama mekanikleri.
2. **Gece Yarısı Kriz Yönetimi (*The Grimoire / Spells - Uykusuzluk & Kafein Enerjisi*):**
   - 4. İstasyon (Subway Surfers + Reddit) ile açılır.
   - Saniyede 1.2 birim dolan dinamik 100'lük Kafein Enerji Barı.
   - 4 riskli gece kararı (Büyü):
     - ⚡ *Telefonu Hızlı Şarja Tak (30 Enerji):* Anında 1 Altın Anomali doğurur (%15 risk: Şarj kablosu temassızlık yaptı -> 15 sn %50 hız kaybı).
     - ☕ *Çift Espresso Shot (45 Enerji):* 30 sn boyunca Algoritma Frekansını 3× katlar (%10 risk: Kalp çarpıntısı -> Enerji sıfırlanır).
     - 🎧 *Gürültü Önleyici Kulaklık (35 Enerji):* Mevcut tüm Vicdan Azaplarını %150 primle anında susturur (%0 risk).
     - 🛌 *'Yarın Erken Kalkmam Gerekmiyor' Yalanı (60 Enerji):* Anında 30 dakikalık dopamin enjekte eder (%20 risk: 3 yeni Vicdan Azabı dadanır).
3. **Otomatik Kaydırma Botları (Autobuyers - Antimatter Dimensions):**
   - 1-8 İstasyon, Algoritma Frekansı, Akış Sıçraması ve Kümeler için 11 bağımsız bot.
   - Dopamin veya prestij ile açılabilir, her an tek tıkla AÇIK / KAPALI yapılabilir.
   - "Tümünü Aç / Tümünü Kapat" master kontrolü.
   - Otonom Kaydırma Çipi yükseltmesi ile işlem hızı 1.5×, 2.25×, 3.37× katlanır.
4. **Sabah 06:00 Çöküşü & Kalıcı Uykusuzluk Dükkanı (SP Upgrades):**
   - 1.79e308 Dopamine ulaşıldığında güneş doğar, evren çöker ve Uykusuzluk Puanı (SP) kazanılır.
   - SP Harcanabilir 6 Kalıcı Yükseltme:
     - 💧 *Göz Damlası:* İstasyon üretimlerini kalıcı $2\times$ katlar.
     - 🔕 *Sessize Alınmış Bildirimler:* Gece Krizi aralığını her seviye %12 kısaltır.
     - 🔌 *GaN 120W Adaptör:* Algoritma Frekansı taban bonusunu güçlendirir.
     - 🧪 *Damardan Kafein Serumu:* Yukarı Kaydırma gücüne saniyelik üretimin %5'ini ekler.
     - 🤖 *Otonom Kaydırma Çipi:* Botların hızını 1.5× artırır.
     - 🛡️ *Vicdan Uyuşturucu:* Vicdan azaplarının emişini azaltır, primini %150'ye çıkarır.
5. **Görsel Kanıt & Ekran Görüntüleri:**
   - [`brain/screenshots/v0.4.0_doomscroll_desktop.png`](file:///c:/Users/Yigit/Documents/Incremental/brain/screenshots/v0.4.0_doomscroll_desktop.png)
   - [`brain/screenshots/v0.4.0_doomscroll_mobile.png`](file:///c:/Users/Yigit/Documents/Incremental/brain/screenshots/v0.4.0_doomscroll_mobile.png)
   - `brain/screenshots/README.md` güncellendi.

---

## [2026-09-30] - Faz 5: OLED Cyber-Midnight UI/UX & Game Feel (Juice) Devrimi (v0.5.0)

### Tamamlanan Özellikler:
1. **OLED Cyber-Midnight Tasarım Sistemi & Glassmorphism 2.0 ([`style.css`](file:///c:/Users/Yigit/Documents/Incremental/src/style.css), [`index.html`](file:///c:/Users/Yigit/Documents/Incremental/index.html)):**
   - Google Fonts üzerinden Inter (400-900) ve JetBrains Mono (400-700) font aileleri eksiksiz yüklendi.
   - Derin OLED siyahı zemin sınıfları (`.glass-panel`, `.glass-panel-glow`, `.glass-panel-card`).
   - Neon bordür sınıfları (`.neon-border-purple`, `.neon-border-rose`, `.neon-border-amber`, `.neon-border-cyan`, `.neon-border-emerald`).
   - Alınabilirlik ışıltısı (`.affordance-pulse`, `.affordance-glow`), taktil basma hissi (`.btn-tactile`), ekran sarsıntısı (`.screen-shake`) ve sayıların titremesini önleyen `.tabular-nums`.
2. **Yüksek Performanslı 60 FPS Floating Juice Katmanı ([`JuiceLayer.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/JuiceLayer.vue)):**
   - Virtual DOM yükü yaratmayan, uyuyan `requestAnimationFrame` döngülü tam ekran Canvas motoru.
   - Tıklamalarda ve Space tuşunda süzülen renkli sayılar (`+1.42M Dopamin`) ve fırlayan taktil reaksiyon emojileri (❤️, 🔥, 💀, 🧠, 🤯).
   - `doomscroll:tap` ve `doomscroll:shake` olay yöneticileri.
3. **Akıllı Telefon Gece Simülasyonu & Dynamic Island ([`Header.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue)):**
   - Üst durum çubuğu: `02:47 AM` saati, kırmızı yanıp sönen `⚡ %3 Pil` (Düşük Güç Modu), Wi-Fi dalgası ve hücresel şebeke.
   - Merkezi Dopamin Çekirdeği: `font-mono tabular-nums` ile zıplamayan büyük neon sayaç ve üretim hızları.
   - Taktiksel Gece Duruşları: Cam kontrol merkezi widget'ları olarak yeniden tasarlandı.
   - Yukarı Kaydır, Frekans ve Tümünü Al butonlarına taktil dokunuş ve parçacık entegrasyonu.
4. **Reels Algoritma Kartları & Dopamin İlerleme Barı ([`DimensionRow.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionRow.vue), [`DimensionsTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionsTab.vue)):**
   - 8 Formata özel tematik renk ve rozet ayrımı (Kedi = Mor, Sokak Yemeği = Peynir Turuncusu, ASMR = Nane Turkuaz, Subway = Neon Yeşil, Sigma = Altın, Hint Dizisi = Kırmızı, Kriz = Kozmik Lacivert, Beyin Çürümesi = Glitch Moru).
   - Her satıra bir sonraki çarpan eşiğini gösteren dinamik 10'luk dolum barı (`7/10`) ve 10'a ulaşıldığında altın `✨ 2× KATLANDI!` ışıltısı.
   - Vicdan Azapları ve Şafak vakti panelleri canlı bento-grid yapısına kavuşturuldu.
5. **Viral Bildirimler & Süper Rezonans Başlığı ([`AnomalyOverlay.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/AnomalyOverlay.vue)):**
   - Yüzen anomaliler modern mobil canlı yayın / TikTok DM kapsüllerine dönüştürüldü; tıklandığında `canvas-confetti`, ekran sarsıntısı ve dopamin fışkırması sağlandı.
   - 5,439× Kombo aktifleştiğinde ekran tepesinde nabız gibi atan alevli `HİPNOTİK REZONANS` başlığı.
6. **Ses Synthesizer Dopamin Rampası ([`audio.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/core/audio.ts)):**
   - Hızlı ardışık tıklamalarda kademeli yükselen frekans çarpanı (`1.0x -> 1.1x -> 1.25x -> 1.4x -> 1.6x`).
   - `playHapticTap()` mekanik dokunma tonu ve `playAffordableNotice()` kristal çan armonisi.
7. **App Kabuğu & Bildirim Rozetli Cam Dock ([`App.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/App.vue)):**
   - Kapsül cam dock bar, haptik ses geçişleri, pulsing bildirim rozetleri ve derin OLED radyal atmosfer.
8. **Doğrulama:**
   - `npm run build` (`vue-tsc && vite build`) 0 hata ile doğrulandı (2.38s).

---

## [2026-09-30] - Faz 6: Bilişsel Yük Sadeleştirmesi & "Zero Text Fatigue" (v0.5.1)

### Tamamlanan İyileştirmeler:
1. **Kademeli Açığa Çıkarma (Progressive Disclosure) Mimarisi:**
   - Ekranda yer kaplayan ve oyuncuyu boğan uzun açıklama cümleleri, kurallar ve anlatı paragrafları doğrudan arayüzden kaldırıldı; yerel tarayıcı `title` tooltip'lerine taşındı.
2. **Kompakt ve Taranabilir D1-D8 Boyut Şeritleri ([`DimensionRow.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionRow.vue)):**
   - Satır yüksekliği 130px'ten ~42px'e indirildi. 4 satırlık metin yığını yerine tek satırlık temiz yatay dizilim: `[Tier] İsim ×Çarpan | Miktar | 10x Mini Bar | [10: Fiyat] [Maks]`.
   - Tüm 8 boyut aynı anda ekranda kaydırma yapmadan taranabilir hale getirildi.
3. **Şafak, Sıçrama ve Küme Kartlarının Sadeleştirilmesi ([`DimensionsTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionsTab.vue)):**
   - Şafak yolu tek satırlık minimal bir bar oldu (`Şafak (06:00): %0.32`).
   - Sıçrama ve Küme kartlarındaki çok satırlı paragraflar kaldırılarak sadece isim, seviye ve mini ilerleme çubuğu bırakıldı.
4. **Kompakt Dock Menüsü ([`App.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/App.vue)):**
   - Sekme adları kısaltıldı (`Reels`, `Lab`, `Kriz`, `Botlar`, `Şafak`, `Rapor`), görsel yerleşim rahatlatıldı.
5. **Görsel Kanıt & Ekran Görüntüleri:**
   - [`v0.5.1_clean_desktop.png`](file:///c:/Users/Yigit/Documents/Incremental/brain/screenshots/v0.5.1_clean_desktop.png) (81.6 KB - %70 daha ferah).
   - [`v0.5.1_clean_mobile.png`](file:///c:/Users/Yigit/Documents/Incremental/brain/screenshots/v0.5.1_clean_mobile.png) (53.0 KB).

---

## [2026-09-30] - Bot Tıklama/Satın Alım Sesi İzolasyonu (Sessiz Botlar) (v0.5.2)

### Tamamlanan Değişiklikler:
1. **Bot Satın Alımlarının Sessizleştirilmesi ([`game.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/stores/game.ts)):**
   - `buyDimension`, `buyMaxDimension`, `buyTickspeed`, `dimensionShift` ve `buyGalaxy` fonksiyonlarına opsiyonel `playSound = true` parametresi eklendi.
   - Oyun döngüsündeki 7. aşamada (`tick()` -> autobuyers) otomatik çalışan botların tetiklediği tüm işlemler (`buyMaxDimension`, `buyTickspeed`, `dimensionShift`, `buyGalaxy`) `playSound = false` argümanı ile çağrılarak tamamen sessiz moda alındı.
   - Botların arka planda tetiklediği otomatik Sıçrama ve Küme işlemleri de kullanıcıyı rahatsız etmeyecek şekilde sessizleştirildi ve rastgele konfeti patlamaları engellendi.
2. **Kullanıcı Etkileşimi ve Taktil Geri Bildirim Korundu:**
   - Oyuncunun bizzat tıkladığı Yukarı Kaydırma (`manualClick` -> `sounds.playClick()`), İstasyon Satın Alımları, Frekans Yükseltme, Sıçrama ve Küme butonları varsayılan `playSound = true` ile tüm ses ve parçacık efektlerini eksiksiz çalmaya devam ediyor.
   - `maxAll()` optimize edilerek döngü içi ses spam'ı engellendi ve tek seferlik net bir satın alım sesi (`playBuy(1)`) ile yanıt vermesi sağlandı.
   - [`AutobuyersTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/AutobuyersTab.vue) üzerinde "Tümünü Aç / Tümünü Kapat" butonuna oyuncu tıkladığında `sounds.playToggleBot()` geri bildirimi eklendi.
3. **Doğrulama:**
   - `npm run build` (`vue-tsc && vite build`) sıfır hata ile derlendi.

---

## [2026-09-30] - Üst Panel Buton Yerleşim Stabilitesi (Zero Layout Shift) (v0.5.2)

### Kök Neden Analizi:
1. `Header.vue` içerisindeki sağ buton grubu `flex-wrap` ve dinamik metin genişliklerine bağlıydı.
2. Tıklama gücü (`formattedClickPower`), Frekans çarpanı (`tickspeedMultiplier`) ve maliyeti (`tickspeedCost`) her alışveriş veya stance değişiminde basamak kazandığında buton genişlikleri esneyerek yanındaki butonları sağa/sola itiyordu.
3. Dopamin sayısı büyüdüğünde orta sütun sağ sütunu sıkıştırıyor, `flex-wrap` nedeniyle "Tümü" veya "Ayarlar" butonu ansızın alt satıra düşüyor; dopamin harcandığında ise tekrar yukarı fırlayarak görsel sıçrama yaratıyordu.
4. Butonların yükseklikleri eşleşmiyordu (tek satır vs. çift satır).

### Uygulanan Çözümler:
1. **Dopamin Çekirdeği ve Denetim Çubuğunun İki Kademeli Ayrımı ([`Header.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue)):**
   - Dopamin sayacı (`122.83 B`) ve saniye başına üretim göstergesi, butonlarla aynı yatay satıra sıkıştırılmak yerine bağımsız merkezi bir satıra (`flex flex-col items-center justify-center my-3`) alındı. Sayı ne kadar büyürse büyüsün (`122.83 B`, `1.79e308`) sağında ve solunda buton olmadığı için butonların üzerine binmesi (overlap) imkansız hale getirildi.
   - Doğrudan altına zarif bir ayırıcı çizgi (`border-t border-white/[0.05] pt-3`) ile dengeli bir kontrol şeridi yerleştirildi: Sol tarafta Stance modları (`Yorgan (2×) | Çılgın (4×) | Karanlık`), sağ tarafta ise Aksiyon butonları (`Kaydır | Hz | TÜMÜ | Ayarlar`).
2. **Kaya Gibi Sağlam Buton Mimarisi:**
   - Buton grubuna `flex-nowrap` ve `shrink-0` verildi; kesinlikle alt satıra kırılma veya sıkışma yapmaz.
   - Tüm butonlara (Kaydır, Hz, Tümü, Ayarlar) eşit `h-11` (44px) sabit yükseklik verildi.
   - Tüm butonlar 2 kademeli sabit hiyerarşiye kavuşturuldu (Üstte kalın başlık, altta `tabular-nums truncate` alt etiket).
   - Butonlara `min-w-[85px]`, `min-w-[78px]`, `min-w-[65px]`, `w-10 sm:w-11` gibi sabit alt genişlikler atanarak basamak artışlarında titreme ve yan butonları itme sorunu tamamen giderildi.
3. **Görsel Doğrulama & Kanıt:**
   - [`v0.5.2_header_stable_desktop.png`](file:///c:/Users/Yigit/Documents/Incremental/brain/screenshots/v0.5.2_header_stable_desktop.png) (82.4 KB)
   - [`v0.5.2_header_stable_mobile.png`](file:///c:/Users/Yigit/Documents/Incremental/brain/screenshots/v0.5.2_header_stable_mobile.png) (53.6 KB)
   - `npm run build` ile sıfır hata doğrulandı.



