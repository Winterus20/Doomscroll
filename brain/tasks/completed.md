# Tamamlanan Görevler ve Değişiklik Günlüğü (Changelog)

## [2026-10-01] — UI/UX Kimlik Paketi: Display Font + Juice + Onboarding + Mobil Dock (v0.16.0 adayı)

### Motivasyon:
- Kullanıcı talebi: "UI/UX ve arayüzü en iyi hale getirmek için skill + web araştırması yap." `ui-ux-pro-max` ve `frontend-design` skill veritabanları + idle/clicker UI web araştırması sentezlendi. Ana bulgular: <50ms geri bildirim, floating ödül metinlerinin okunabilirliği, tipografik kimlik eksikliği, 0-state yönlendirme, mobil dokunma ergonomisi.

### Yapılan İşler:
1. **Tipografik kimlik (`index.html` + `tailwind.config.js` + `Header.vue`):** Chakra Petch (600/700) display font eklendi; hero Dopamin sayacı `font-display` ile imza öğeye dönüştürüldü (eski `font-mono font-black` yerine `font-display font-bold`).
2. **Juice katmanı (`JuiceLayer.vue`):** floating +X metinlerine koyu kontur (`strokeText`, 3.5px) — her zeminde okunabilirlik; spawn noktasına ±14px yatay saçılım (üst üste yığın engeli); `color` ve `big` opsiyonları; font 700 Chakra Petch'e geçti.
3. **Renk sözlüğü juice'a uygulandı (`DimensionsTab.vue`):** trend=cyan, yama=cyan, sıçrama=mor, küme=amber, sacrifice/sustur=gül, güneş=amber+big. Mevcut semantik renk tablosu artık ödül anlarında da okunuyor.
4. **0-state onboarding (`Header.vue` + `style.css`):** ilk format alınana kadar (D1 bought=0) "Başparmağı hazırla" ipucu pill'i + Kaydır butonunda `.cta-beacon` nefes halkası + `.arrow-nudge` ok animasyonu. Her ikisi de `prefers-reduced-motion` ve `.reduce-anim` tarafından söndürülür.
5. **Mobil alt dock (`App.vue`):** <768px'te nav alt sabit dock'a dönüşür (`max-md:fixed bottom-0`, safe-area inset desteği, koyu opak zemin); `main`'e `max-md:pb-28` payı.

### Bilinçli Ertelenen (perf):
- Pinia state'indeki Decimal'lerin deep-reactive proxy maliyeti (20 TPS döngüde ~25 atama noktası) ölçülmeden refactor edilmedi — `markRaw`/`shallowRef` dönüşümü ayrı, ölçümlü bir turda yapılmalı. 375px viewport testinde takılma gözlenmedi.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`): **0 hata** (1636 modül, JS 494.16 kB / gzip 136.89 kB).
- Canlı doğrulama: desktop 0-state ipucu + Chakra Petch sayaç, 375×812 mobil viewport'ta alt dock + safe-area, click akışı (sayaç artışı) gözlemlendi.

## [2026-10-01] — Kapsamlı QoL Turu: P0 + P1 (v0.15.0 adayı)

### Motivasyon:
- Kullanıcı talebi: "QoL yapalım, farklı yerlere subagentlar gönder, internetten araştırma yapsınlar." Üç paralel denetim yapıldı (UI/UX kod denetimi, çekirdek sistem denetimi, web araştırması) ve P0+P1 paketinin tamamı uygulandı. ADR: `brain/decisions/0014-qol-pass-p0-p1.md`.

### Kritik Bulgu (P0):
- Arka plan sekmesinde oyun tamamen duruyordu: rAF gizli sekmede çalışmaz, delta 1000 ms ile sınırlıydı ve offline catch-up dalı ölü koddı. Idle oyun sekme arkasında sıfır üretiyordu.

### Yapılan İşler:
1. **`src/core/game-loop.ts`:** ham delta 5 sn'yi aşınca offline yakalamaya devir; `visibilitychange` ile gizlenen sekme anında kaydeder; negatif delta (saat sıçraması) güvenliği.
2. **`src/stores/game.ts` (offline):** 24 saat cap + kademeli adımlar (5 dk × 0.1 sn → 1 saate kadar 1 sn → sonrası 10 sn); `OfflineReport` üretir; `offlineSimActive` ile ses/konfeti bastırılır; başarım kontrolü offline'da 120 adımda bir seyreltilir.
3. **`src/components/WelcomeBackModal.vue` (yeni):** "Tekrar hoş geldin" — uzakta geçen süre, kazanılan dopamin, ortalama/sn, cap uyarısı.
4. **`src/core/save.ts`:** yedek slot (`DOOMSCROLL_SAVE_V1_BAK`, ~1 dk rotasyon), üç kademeli yükleme (ana → yedek → legacy), bozuk kayıt artık silinmiyor, `loadDetailed()` + `lastSaveSucceeded`; `deserialize`'ta version okuyan sıralı migration kancası.
5. **`src/components/ConfirmModal.vue` (yeni):** tek onay diyaloğu — Singularity (Header + SingularityTab + DimensionsTab), Power Nap, Önbellek Silme; `settings.confirmDialogs` ile kapatılabilir. Native `confirm()` kaldırıldı.
6. **Satın alma modları:** ×10 / ×100 (geometrik seri maliyet — `getDimensionPackCost`) / Maks seçici DimensionsTab başında; `buyAmount` save v10'a eklendi. **`src/core/hold.ts` (yeni):** `v-hold` basılı tut tekrar direktifi (400 ms + 100 ms) — satın alma, Maks ve Hz butonlarında.
7. **Kısayollar:** 1-8 sekme, M = Max All, Esc = modal kapat (input'ta devre dışı).
8. **Rapor sekmesi:** Dopamin Çarpan Kırılımı paneli (`multiplierBreakdown`: başarımlar, kolektif, koloni, nap, duruş, buff, lab, D8 sacrifice) + 10 dakikalık saniyelik üretim sparkline'ı (`dpsHistory`, 600 örnek).
9. **Bildirim noktaları:** Şafak — alınabilir Nöral Ağaç düğümü (`hasAffordableNeuralNode`); Botlar — alınabilir kilitli bot (`hasAffordableLockedBot`).
10. **Ayarlar:** Onay Diyaloğu + Animasyonları Azalt toggle'ları (`.reduce-anim` CSS), kısayol rehberi, panoya kopyalama başarısızsa dosyaya indirme fallback'i, `alert()` yerine inline durum mesajları, import iki adımlı onay + üzerine yazar uyarısı.
11. **Güvenlik üst sınırları:** `maxAll`/`buyMaxDimension` döngülerine 500 paket guard; anomali spawn aralığı mobil ekran güvenliğine çekildi; AutobuyersTab tetiklenme süresi ham çarpanla hesaplanır.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`): **0 hata** (1636 modül, JS 493.22 kB / gzip 136.53 kB).

## [2026-10-01] — Tekillik Sonrası Döngü: Şafak Botu + Break Singularity + Faz 2 (v0.14.0 adayı)

### Yapılan İşler:
- **Şafak Nöbeti Botu (Singularity Autobuyer):** 3 çöküş + 1.79e308 Dopamin kilidiyle açılan bot, marjinal kazanç optimizatörüyle çalışır (ExponentialIdle modeli): saniyelik `log10(matter)` örnekleri, 3-sn eğim kıyası, 3 saniyelik deceleration streak + min-SP tabanı (kullanıcı ayarlı, default 1) sağlandığında sessiz `singularityReset(false)`.
- Optimizatör runtime state (`singularityBotSamples`, `singularityDecelStreak`, `singularityRunSeconds`, `singularitySampleAcc`) serialize edilmez; `dimensionShift`/`buyGalaxy`/`singularityReset` rampayı sıfırlar.
- **Break Singularity (`break_singularity`, 8 SP):** alınmadığında Shift/Galaxy botları tekillikte bekler (`singularityHoldActive` getter), alındığında e308 üstünde normal çalışır. SingularityTab rozeti "Sınır Yıkıldı" durumuna geçer.
- **Faz 2 kilometre taşı:** `nightWatchUnlocked` kalıcı flag, 1e4000 Dopamin eşiğinde konfeti ile açılır; SingularityTab'de kilitli/açık ilerleme kartı.
- **Save (v9 payload genişletildi):** `singularities`, `nightWatchUnlocked` ve autobuyer subset'ine `minGainSp` eklendi; eski kayıtlarda `singularities` fallback'i `stats.singularityCount`'tan alınır; deserialize `minGainSp` yalnızca pozitif sayıda restore eder.
- AutobuyersTab: Şafak Botu kartında mod seçici yerine min-SP girişi + optimizatör açıklaması; Header CTA tooltip'i Break durumuna göre değişir.
- ADR: `brain/decisions/0013-singularity-autobuyer-break.md`; GDD §7.2 eklendi.

### Doğrulama:
- `npm run build`: **0 hata** (1631 modül).
- Canlı AdminPanel enjeksiyon testi ve ekran görüntüsü doğrulaması yapıldı (bot kilidi, sessiz otomatik çöküş, kart ilerlemesi).

## [2026-10-01] — İlk Prestij Pacing Recalibration (v0.13.1 adayı)

### Yapılan İşler:
- Boyut zinciri üst katman üretimi `1.0×` yerine referans modeldeki `0.1×` taban hızına getirildi.
- Shift üretim/tıklama çarpanı `1.07^shifts` olarak kalibre edildi.
- Dördüncü Shift sonrası D8 gereksinimi `25 × 100^(shifts - 4)` eğrisine geçirildi.
- Tekrarlanabilir Lab/Kriz/Viral ödüllerinin önceki azaltılmış değerleri korundu.
- ADR: `brain/decisions/0011-prestige-pacing-recalibration.md`.

### Doğrulama:
- `npm run build`: **0 hata** (1629 modül).
- Temiz in-memory store, seeded RNG, `0.1s` simülasyon ve tüm yan güçlendirmelerle ilk Singularity: **13.938,0 sn / 3,872 saat**.
- Simülasyon sonucu: `log10(Dopamin) ≈ 308.495`, 5 Shift, 2 galaxy.

## [2026-10-01] — Ekonomi Dengeleme Uygulaması (v0.13.0 adayı)

### Yapılan İşler:
- Resolution ve Collective milestone çarpanları kümülatif çarpımdan en yüksek aktif milestone semantiğine geçirildi.
- Power Nap kalıcı çarpanı üretim hesabına bağlandı ve ilk Toplu Uyku ödülü soft-cap’li eğriyle dengelendi.
- Espresso ayrı bir Algoritma Frekansı buff’ı oldu; Fast Charge anomaly kapasitesine saygı duyuyor.
- Lab/Kriz tekrar eden ödülleri azaltıldı; çoklu olgun hücre hasatları aktif bütçe ile sınırlandı.
- Viral Kodeks yalnızca sentezlenen tarif sonuçlarını sayacak şekilde düzeltildi.
- Save import Decimal, buff, seed ve timer doğrulamalarıyla güvenli hale getirildi.
- Kombo banner’ı gerçek üretim/kaydırma kanallarını açıklıyor.

### Doğrulama:
- `npm run build`: **0 hata** (1629 modül).
- Final aktif 5 dakika playtest: `244.71 Qa` toplam Dopamin, `6.37 Qa/s`, `1.290` kaydırma.
- Önceki aynı aktif rota: `757.64 Qa`, `19.65 Qa/s`; üretim ivmesi belirgin biçimde azaltıldı.

## [2026-10-01] — İlk Prestij Pacing Simülasyonu

### Sonuç:
- Temiz in-memory store, seeded RNG ve `0.1s` update adımıyla simülasyon yapıldı.
- Aktif + tüm yan güçlendirmeler: **379.5 sn / 6.33 dk**.
- Daha yavaş aktif + yan güçlendirmeler: **1842.5 sn / 30.71 dk**.
- Yan güçlendirmesiz aktif rota: 2 saatte prestije ulaşamadı.

### Sonuç değerlendirmesi:
- Önceki 2–4 saatlik tahmin doğrulanmadı.
- Lab, kriz, bot, anomaly, shift ve galaxy sistemleri birlikte çalıştığında ilk prestij dakikalar içinde geliyor.
- Ayrıntılı ölçüm `brain/research/economy-balancing-research.md` dosyasına eklendi.

## [2026-10-01] — Ekonomi Dengeleme Araştırması

### Kapsam:
- `src/stores/game.ts`, `src/game/unlocks.ts` ve 5 dakikalık playtest logları incelendi.
- Antimatter Dimensions, Synergism, Cookie Clicker ve geliştirici kaynaklı incremental ekonomi modelleri karşılaştırıldı.

### Bulgular:
- Resolution ve Collective milestone çarpanları UI değerlerine rağmen kümülatif çarpılıyor; sırasıyla `×98.304` ve `×375.000` üst sınırlarına ulaşıyor.
- `napMultiplier` kaydediliyor ve gösteriliyor ancak üretim hesabına uygulanmıyor.
- Dört boyutun başlangıçta açık olması ve `Max All` kullanımı erken üretim zincirini aşırı hızlandırıyor.
- Tekrarlanabilir Lab/Kriz ödülleri, yeterince sınırlandırılmazsa pasif üretimi gölgede bırakabiliyor.

### Çıktı ve doğrulama:
- Ayrıntılı rapor: `brain/research/economy-balancing-research.md`
- Kaynak kodunda değişiklik yapılmadı; araştırma, mevcut playtest verileri ve kaynak bağlantılarıyla belgelendi.

## [2026-10-01] — 🧪 Algoritma Stüdyosu: Hibrit Viral Matris & Trend Reaktörü (v0.12.0)

### Kapsam & Motivasyon:
- Kullanıcı talebi: *"oyunun bu lab kisminda neler yapabiliriz fikirler ver bu kisim hakkinda guzel dusuncelerim var... peki ya hibrit bir sey yapsak en iyi ne yapabiliriz bir plan yap... bu guzel bunu en iyi sekilde yap"*.
- Eski durum: Cookie Clicker Garden klonu tarla/çiftlik modeli — tohum ekme, bekleme, `maxAge` aşımıyla tohumların çürümesi (`rot`), dar 3x3 ızgara ve yalnızca 1 mutasyon. Gece 03:00'te Reels izleme temasına aykırıydı ve AFK kalan oyuncuyu cezalandırıyordu.
- Çözüm: **"Algoritma Stüdyosu: Viral Matris & Trend Reaktörü"** hibrit sistemi geliştirildi.

### Yapılan İşler:
1. **Çürümesiz 3×3 Akış Matrisi (Sinerji Devresi):**
   - Çürüme cezası tamamen kaldırıldı (`maxAge` zorlaması bitti). Formatlar kalıcı soket/kart olarak 7/24 çalışır.
   - **Nöral Çekirdek (Merkez Hücre 4):** Kendi çarpanını $\times 1.5$ yapar ve 4 komşusuna $+%20$ verim yayar.
   - **Yönlü Sinerjiler:** Kedi ($+%15$ rezonans), Phonk (Bas Şoku $\times 1.25$ ve $+%50$ kriz sıklığı), Yemek Sinerjisi (Kaşar, Mukbang, Burger yan yana $+%30$).
   - **Satır / Sütun Uyumları:** 3 olgun hücre $\times 1.25$, aynı tür 3 format $\times 1.40$ mono-format çarpanı.
   - **Taktil Hasat:** Olgun hücreye tıklandığında anlık dopamin & Hype toplar, hücre yok olmaz sadece taze rezonans için yeniden ısınır.
2. **Viral Kodeks & Çift Yönlü Formül Sentezi:**
   - 8 farklı Reels meme/ses formatı (4 temel + 4 sentezlenen hibrit format):
     - 🍜 *Gece 3 Mukbang & Drama* (🧀+🛹): $+%50$ Pasif & $\times 1.5$ Tıklama.
     - 🍔 *Cheeseburger Kedi* (🐱+🧀): $+%40$ Pasif & **Vicdan Azabı emişi $-\%25$**.
     - 🏎️ *Tokyo Drift Dublajı* (🗿+🛹): $\times 2.0$ Tıklama & $+%30$ Gece Krizi sıklığı.
     - 🧠 *Saf Nöron Çürütücü* (🐱+🗿): $+%200$ ($\times 3$) Tüm Küresel Dopamin!
   - Çift yönlü sentez: Boş komşu hücreye filizlenme VEYA ızgara dolu olsa bile rezonansla doğrudan Kodekse keşif ekleme.
   - **Kalıcı Ödül:** Keşfedilen her formül tüm oyuna kalıcı **$+%3$ Global Dopamin** kazandırır.
3. **Trend Reaktörü & "🚀 AKIŞA FIRLAT!" (Viral Drop):**
   - Matris çalışması ve manuel kaydırma ($+\%0.4$/tık) ile dolan Hype Barı (%0-100).
   - Fırlatıldığında: Anında 60 sn Dopamin, 25 sn boyunca $\times 5$ ile $\times 25$ arasında değişen **Canlı Viral Zirve Çarpanı**, 3× Gece Krizleri yağmuru ve dinamik canlı izlenme sayacı ($10K \to 10M$).
4. **Algoritma Besleme Zeminleri (FYP Stratejileri):**
   - 🔥 *Agresif FYP:* Hype $\%80$ hızlı dolar, fırlatma $2\times$ dopamin verir (Aktif mod).
   - ☕ *Evergreen Arşiv:* Hype durur, matrisin tüm pasif üretimi **$2.5\times$** katlanır (AFK/gece modu).
   - 🧬 *Nöral Sentez:* Yeni formül keşfetme şansı **$3\times$** katına çıkar (Kaşif modu).
5. **Ses & UI:**
   - Web Audio API synthesizer motoruna `playViralDrop()` (riser sweep + ağır bas drop + çan akorları) eklendi.
   - `LabTab.vue` sıfırdan modern cyberpunk/stüdyo paneline dönüştürüldü; Viral Kodeks modalı, canlı akış banner'ı, zemin seçiciler eklendi.
   - `AdminPanel.vue`'ya tek tıkla Hype'ı %100 yapma butonu eklendi.

### Doğrulama & Geriye Dönük Uyumluluk:
- `npm run build` (`vue-tsc && vite build`): **0 hata, kusursuz derleme** (1629 modül).
- Eski save dosyaları otomatik olarak `discoveredFormulas` ile zenginleştirilir; mevcut hiçbir başarım bozulmaz.
- Mimari Karar Kaydı: `brain/decisions/0010-hybrid-algorithm-studio-viral-matrix.md`.

---

### Kapsam & Motivasyon:
- Kullanıcı geri bildirimi (v0.11.3 sonrası): *"erken oyunda bile tiklamadan aşırı hızlı yükseliyorum, tıklama bir işe yarıyor sanmıyorum"*.
- Kök neden (koda göre): erken oyunda tıklama/CPS oranı zaten **orta-oyun seviyesindeydi**. D1×10 alınıp CPS ≈ 20/s olunca tıklama = flat 1 + CPS×%1 ≈ 1.2 → gelirin sadece **%6'sı/tıklama** (4 tıklama/sn ≈ %24). Cookie Clicker'da erken oyunda bu oran ~150×'tir. Flat taban (1) hiçbir zaman büyümüyor, tek büyüyen çarpan `2^shifts` ise D4×25 (ilk Akış Sıçraması) geçene kadar geliyor.

### Yapılan İş (`src/stores/game.ts`, `manualClickPower` — getter-only, save uyumlu):
1. **Koleksiyon Senkronizasyonu** (Cookie Clicker "cursor level" tasarımı): `taban = (1 + 0.25 × toplamSatınAlınanReelAdedi) × 2^shifts × ...`. Tüm 8 katmanın `bought` toplamı tabanı büyütür.
   - Erken: D1×10 → tıklama ≈ 3.9 (CPS'in %20'si/tıklama; 4 tıklama/sn ≈ gelirin %78'i) — tıklama artık görünür ve anlamlı.
   - Orta: D1×50 → düz terim ~13.5, CPS ~6400 → payı doğal olarak ~%2'ye çöker (üretim üstel: `2^(bought/10)` × Hz × sıçramalar × kolektif).
   - Sıçrama/Küme ile `bought` sıfırlanır → her koşuda tıklama yeniden büyür (pacing tutarlı).
2. **Temel Senkronizasyon 1% → 2%:** orta oyunun ölü bölgesinde 5-10 tıklama/sn ≈ gelirin **%10-20'si** (Cookie Clicker benchmark'ı). Kafein Serumu (%25) + 1080p milestone'ları (~%8) ile geç oyun toplamı ~%35 CPS/tıklama — dengeli kalır.
3. Yan etki: **Başparmak Histerisi (777×)** artık orta oyunda da gerçek spike üretir (D1×50 civarında 777 × ~140 ≈ 110K/tıklama ≈ CPS'in 17'si × 15 sn) — v0.11.3 analizindeki "boşa gidiyor" bulgusu kapatıldı.

### Değişmeyenler:
- `matterPerSecond`, anomali/lab/vicdan ödül formülleri, serialize/deserialize dokunulmadı → **migrasyon yok, eski save'lar otomatik yararlanır**.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`) **sıfır hata** (1629 modül, JS 417.49 kB / gzip 116.00 kB, 9.23s).

---

## [2026-10-01] — Tıklama Etkinliği Araştırması (click-to-score)

### Kapsam & Motivasyon:
- Kullanıcı sorusu: "oyundaki tiklama ile puan alma yontemi ne kadar ise yariyor?" → `src/stores/game.ts` mekaniği (manualClickPower formülü, anomali/lab/vicdan ödülleri) + tür literatürü (Cookie Clicker Wiki: orta oyuncu tıklamada CPS'in ~%10-13'ü; Antimatter Dimensions: tıklama yok; Synergism; Machinations/GridInc idle tasarım en iyi uygulamaları) kıyaslandı.

### Bulgular:
- **Erken oyun (0→~1e4):** tıklama gelirin %50-90'ı — tamamen işe yarıyor. ✅
- **Orta oyun (~1e4→1.79e308):** **ölü bölge**. Tıklama çarpanları flat (max ~8192× + 2^shifts) iken üretim üstel ($O(t^8)$); ~1e12-1e20 civarında payı ~%0'a düşüyor. Başparmak Histerisi 777× bu fazda boşa gidiyor. ⚠️
- **Geç oyun (tekillik sonrası):** Kafein Serumu (%25 CPS/tıklama) + 1080p milestone'ları (~%1-8) ile ~%25-35 CPS/tıklama — CC benchmark'ına yakın, dengeli. ✅
- Aktif oyunun gerçek kazancı orta oyunda **üretime bağlı** mekaniklerde (anomali sponsor 900 sn, lab hasadı 30-3600 sn, vicdan azabı 1.2-1.65× prim) — bu parça doğru tasarım.
- Oyunun açıklanan felsefesi ("bekleme oyunu değil; taktil yukarı kaydırma") ile orta oyun ölü bölgesi çelişiyor.

### Yapılan İş:
1. Rapor: `brain/research/click-effectiveness-analysis.md` (faz tablosu, formül envanteri, benchmark karşılaştırması, dengeleme önerileri).
2. **Düzeltme (`src/stores/game.ts`, `manualClickPower` — v0.11.3):** Cookie Clicker "%CPS to click" tasarımı olan **Temel Senkronizasyon** eklendi: `power += CPS × 0.01`. Artık tıklama hiçbir fazda sıfıra düşmez (5-10 tıklama/sn ≈ gelirin %5-10'u, her zaman). Yeni yama/SP/başarım gerekmez; serialize'a dokunulmadığı için **save uyumlu, migrasyon gerekmez**.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`) **sıfır hata** (1629 modül, JS 417.41 kB / gzip 115.98 kB).

---

## [2026-10-01] — Yama Fiyat Senkronizasyonu (v0.11.2)

### Kapsam & Motivasyon:
- Kullanıcı sorusu: "itemlerin satın alma fiyatları nasıl?" → tam fiyat envanteri çekildi (D1-D8 taban+múlt, Hz 1000×13^n, yamalar, tohumlar, botlar, SP, koloni). Fiyatlar AD-standardında ve doğruydı; asıl sorun **dükkan açılış senkronizasyonu** yoktu: yama dükkanı 100K Dopamin'de açılırken ilk 3 yama 500 / 2.5K / 25K — açılma anında hepsi birden ucuz, anlamlı ilk karar yoktu. Cookie Clicker'da yükseltme açılış anında gelirin anlamlı bir kesarına mal olur.

### Yapılan İş:
1. **`src/stores/game.ts` (`ALGORITHM_UPGRADES`):** ilk 3 yama fiyatı senkronize edildi — `play_speed` 500→**1e5** · `double_tap` 2.5K→**1e6** · `amoled_black` 25K→**1e7**. `patch_shop` kilidi (1e5 Dopamin) açılınca ilk yama tam olarak afford edilebilir = anlamlı ilk karar.
2. **Basamak çakışması düzeltmesi:** 4. yama (`bg_listen`) 1e6'da kalırsa yeni 2. yama (1e6) ile eşitleniyordu → `bg_listen` 1e6→**1e8**, `bookmark_pack` 1e8→**1e9** (`bass_boost` 1e11 sabit). Yeni merdiven: **1e5 → 1e6 → 1e7 → 1e8 → 1e9 → 1e11** (sıkı artan 10× basamaklar).
3. **`src/components/DimensionsTab.vue`:** satır 375 yorumu "500 Dopamin ile açılır" → "100K Dopamin ile açılır" (gerçek `patch_shop` kilidine göre düzeltme).
4. **Aynen kaldı:** Lab tohumları (flat 500/50K/5M/1e9/1e15, Garden'daki gerginlik hücre kıtlığı gibi tekrarlanabilirlik baskısı mevcut), D1 `costMult` 1e3 (777× Başparmak Histerisi ile dengeli), Hz 1000×13^n (indirimler uygulanır), bot fiyatları (dim1 5e5 … dim8 1e34, tickspeed 5e8), `AUTOBUYER_BULK_COST` 2.5e11+1 Shift, `AUTOBUYER_MAX_COST` 1e22+1 Galaxy, `COLONY_CORE_COST` 1e13.

### Save uyumlu:
- `algorithmUpgrades` yalnızca **id listesi** olarak serileştirilir (serialize ~2218 / deserialize ~2343); fiyatlar live `ALGORITHM_UPGRADES` def'inden okunur → eski kayıtlar satın alınan yamaları korur, **migrasyon gerekmez**. UI (`DimensionsTab.vue` dükkanı) `upg.cost`'u dinamik okuduğu için yalnızca sabit değişti.

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`) **sıfır hata** (1629 modül, JS 417.37 kB / gzip 115.97 kB).

---

## [2026-10-01] — Özellik Merdiveni Pacing Revizyonu (v0.11.1)

### Kapsam & Motivasyon:
- Kullanıcı talebi: "oyunda bir şeyin açılması veya alınması çok kolay, bunu biraz daha uzun tut". Cookie Clicker / Antimatter Dimensions / Synergism ve idle UX literatürüyle kıyaslandı (ölçüt: ilk 5 dakikada 3-5 açılış, ilk büyük sekme 3-5 dk; Cookie Clicker yükseltmeleri sahiplik 1/5/15/25 eşiklerinde; AD ilk boost ~19 dk).

### Tespit (kritik bug):
- `dimBought` kilitlemeleri `dim.amount` (üretimle kendiliğinden büyür) ile değil `dim.bought` (gerçek satın alım) ile karşılaştırılmıyordu. Max-all simülasyonunda D1×50 duruşu **~13 sn'de** açılıyordu (tahmin ~2.3 dk). Cookie Clicker tasarımı 'own N' = satın alım üzerinden çalışır.

### Yapılan İş:
1. **`src/game/unlocks.ts`:** `UnlockContext` ve `buildUnlockContext` girdisine `bought: number` eklendi; `checkUnlock` / `unlockProgress` `dimBought` dalı artık `dim.bought` üzerinden (`>= count`, `Math.min(dim.bought, count)`).
2. **Dopamin eşikleri:** `crisis_spawn` 100→**1e3** · `patch_shop` 500→**1e5** · `refresh_feed` 1e3→**1e7** · `autobuyers` 1e6→**1e9** · `guilt_slackers` 1e6→**1e9** (hint metinleri: 1.000 / 100K / 10M / 1B / 1B Dopamin).
3. **Aynen kaldı:** Kriz sekmesi D4×10, stance'lar D1×50, Lab D2×25, tohumlar (D2×50 / D3×25 / D4×25), büyüler 2/3/4 cast — hepsi artık gerçek satın alım sayılır.
4. **`src/components/DimensionsTab.vue`:** merdiven kademeleri yorumu güncellendi (10M / 100K Dopamin).
5. **Pacing (günlük oyuncu modeli, 1.5 tıklama/sn + 2× kayıt):** Kriz doğurması ~16 sn · Yamalar ~41 sn · Kriz sekmesi ~57 sn · Lab ~1 dk 51 sn · Akışı Yenile ~1 dk 10 sn · Botlar & Azaplar ~1 dk 27 sn · Stance'lar ~3 dk 02 sn · Subway tohumu ~3 dk 22 sn · Phonk tohumu ~8 dk 40 sn.
6. **ADR-0009** eşik tablosu ve rasyoneli güncellendi (v0.11.1 revizyon notu).

### Doğrulama:
- `npm run build` (`vue-tsc && vite build`) **sıfır hata**.

---

## [2026-10-01] — Özellik Merdiveni / Progressive Unlock (v0.11.0)

### Kapsam & Motivasyon:
- Kullanıcı talebi: oyun özellikleri başlangıçta hepsi açık olmasın, sırayla (merdiven halinde) açılsın. Araştırma (Cookie Clicker / Antimatter Dimensions / Synergism + idle UX literatürü): `brain/research/feature-unlock-ladder-plan.md`. ADR: `brain/decisions/0009-feature-unlock-ladder.md`.

### Yapılan İş:
1. **`src/game/unlocks.ts` (yeni):** Tek kaynaklı registry — `UnlockReq` discriminated union (dimBought/dopamine/shifts/galaxies/singularities/anomalies/spellsCast), 15 `FeatureUnlock` (`order` alanlı), `buildUnlockContext` / `checkUnlock` / `unlockProgress` / `getFeatureById` / `nextLocked`.
2. **`src/components/LockedFeature.vue` (yeni):** 🔒 + özellik adı + şart metni + current/target + slate ilerleme çubuğu (`progress-fill-slate`), `v-tip` tooltip. `featureId: string | null` prop'u.
3. **`src/stores/game.ts`:** `unlockedFeatures: string[]` state (sticky); `isFeatureUnlocked(id)` getter (liste veya koşul); `syncUnlocks()` action (her `update()` başında + deserialize sonrası); `labUnlocked`/`crisisUnlocked`/`autobuyersUnlocked` artık yalnızca registry üzerinden; `setStance` korumaları; `canRefresh` kilit kontrolü; anomali doğurması `crisis_spawn`, slacker doğurması `guilt_slackers` kilidine bağlı; serialize/deserialize (`unlockedFeatures`).
4. **Kritik bug fix:** `unlockedDimensionsCount` başlangıçta 4 olduğundan eski Lab/Kriz getter'ları her zaman `true` idi (sekme başlangıçtan açık oluyordu) — registry'e bağlanarak düzeltildi.
5. **Sekme içi kademeler:** LabTab (Kaşar/Subway/Phonk tohumları kilitli kart + eklenemez), CrisisTab (Espresso/Kulaklık/Yalan kilitli kart + cast edilemez), DimensionsTab (Akışı Yenile + Algoritma Yamaları dükkanı).
6. **`src/components/Header.vue`:** Çılgın Kaydırma / Düşük Parlaklık butonları D1×50'e kadar kilitli (devre dışı + Lock ikonu + "(current/target)" tooltip).
7. **`src/App.vue`:** Nav altında "Sonraki Açılacak" bandı (`nextLocked` + ilerleme çubuğu + current/target notasyonu); nav tooltip'ları güncellendi.
8. **Eşik ince ayarı** (pacing simülasyonu, 2 tıklama/sn max-all): Gece Krizleri 100 Dopamin (~30sn) · Yamalar 500 (~1dk) · Akışı Yenile 1.000 (~1.2dk) · Botlar 1e6 (~1.6dk) · Vicdan Azapları 1e6 · Kriz D4×10 (~2.1dk) · Stance'lar D1×50 (~2.3dk) · Lab D2×25 (~3.6dk) · tohumlar D2×50/D3×25/D4×25 · büyüler 2/3/4 cast.
9. **Save uyumlu:** kilitlemeler state'ten türetilmiş, koşul sağlanmışsa eski save'larda otomatik açılır — kayıp yok, migrasyon yok.
10. **Doğrulama:** `npm run build` (`vue-tsc && vite build`) **sıfır hata** (1629 modül, JS 417.39 kB / gzip 115.97 kB). İlk derlemedeki 6 TS hatası (formatNumber argüman sırası, `string | null` prop) düzeltildi.

---

## [2026-10-01] — Nöral İzleme Kolonisi & Toplu Uyku (v0.10.0)

### Kapsam & Motivasyon:
- Backlog'daki ilk Synergism katmanı mekaniği: kendi kendini üreyen nöral alt-bot kolonisi + Toplu Uyku (Power Nap) ile botları feda edip kalıcı kök dopamin çarpanı katlama. ADR: `brain/decisions/0008-neural-colony-power-nap.md`.

### Yapılan İş:
1. **`src/stores/game.ts`:**
   - Sabitler: `COLONY_CORE_COST = 1e13`, `COLONY_MIN_NAP_BOTS = 100`, `COLONY_BREED_RATE = 0.008`, `COLONY_PASSIVE_LOG_FACTOR = 0.3`.
   - State: `neuralBots`, `napCount`, `napMultiplier` (kalıcı, prestijden sağ kalır).
   - Getter'lar: `colonyUnlocked` (sticky), `botBreedRate`, `colonyMultiplier` (logaritmik), `canPowerNap`, `powerNapGain`.
   - `hatchCore()` ve `powerNap()` aksiyonları; update() 7.5. aşamasında üreme; D1 net üretimi + `matterPerSecond`'a çarpan (kolektif çarpanla aynı yere).
   - SP dükkanı: `neural_nest` (Nöral Yuva, 6 SP, ×3 maliyet, max 5 seviye, üremeyi +%10/seviye).
2. **`src/models/types.ts`:** `AchievementContext` (`neuralBots`, `napCount`) ve `SerializedPlayerState` (opsiyonel alanlar, save versiyonu 7→8) eklendi.
3. **`src/game/achievements.ts`:** 3 Otomasyon başarımı: `colony_hatch`, `colony_nap`, `colony_million` (gizli, ≥1e6 bot).
4. **`src/components/ColonyTab.vue` (yeni):** TabHero (violet, Network), çekirdek yumurtlama, üreme oranı + 10 dk projeksiyon, ilk uykuya kalan süre tahmini, Toplu Uyku kartı.
5. **`src/App.vue`:** "Koloni" sekmesi (Botlar ile Şafak arası), kilitli durumda "1e13" ipucu, nap-ready `tab-dot-violet` bildirim noktası.
6. **`src/style.css`:** `.tab-dot-violet`, `.hero-accent-violet`, `.ds-badge-violet` ekleri.
7. **Seri hale getirme:** save v8 — eski kayıtlar `??`/fallback ile uyumlu.
8. **Bugfix (kullanıcı bildirimi):** Çekirdek aktivasyon paneli `!colonyUnlocked` koşuluyla gizlenmişti; sekmenin açılış koşuluyla aynı değer olduğundan buton hiç render olmuyordu → `neuralBots.lte(0)` (çekirdek yumurtlanmamış) koşuluna düzeltildi.
9. **Doğrulama:** `npm run build` (`vue-tsc && vite build`) **sıfır hata** (1626 modül, JS 408.83 kB / gzip 113.62 kB).

---

## [2026-10-01] — Anti-Slop UI Yönü & Erişilebilirlik Turu (v0.9.0)

### Kapsam & Motivasyon:
- İnternet araştırması (avoid-ai-design 67-tell katalogu, Zach Gage Three Reads, Kukshtel oyun UI prensipleri, WCAG 2.2, backdrop-filter performans) + kod denetimi → 5 fazlı plan: `brain/research/ui-ux-anti-slop-research-and-plan.md`. ADR: `brain/decisions/0007-anti-slop-ui-and-accessibility-pass.md`.

### Yapılan İş:
1. **Faz 0 — Ölçüm:** slate-500 = 4.18:1, slate-600 = 2.63:1 (AA altı); dokunma hedefleri 28-30px; 52 ölü `title`.
2. **Faz 1 — Erişilebilirlik:**
   - `tailwind.config.js`: slate 500/600/700 override → 55 metin kullanımı tek seferde AA (5.23/4.87/4.6:1).
   - `style.css`: `.hit-44` (görsel boyutu bozmadan 44px hit-area) — nav/stance/radyo/satır butonlarına uygulandı.
   - `style.css`: `.affordance-pulse` → `--pulse-c1/c2` custom property; Hz butonu artık **amber** nabız atıyor (renk sözlüğü ihlali A5 kapandı).
   - `public/favicon.svg` (telefon + yukarı ok) + `index.html` description/theme-color (A3).
3. **Faz 2 — Anti-slop:**
   - Eyebrow temizliği (A1): `.section-label`, TabHero h2, SettingsModal başlığı, "DOPAMİN", "Tümü", toast vb. → sentence-case gövde yüzü; nav etiketleri mono→`font-semibold` sans.
   - Blur budama (A4): `glass-panel-card`, `panel-hero`, `glass-panel-glow` → katı yüzey; blur yalnız `.glass-panel-glow`+`.modal-glass` (SettingsModal) ve AnomalyOverlay overlay'lerinde; nav/header radyo blur kaldırıldı. Toplam backdrop-filter kullanımı >20 → 5.
   - 9:16 kimlik motifi: `.hero-orb` dairesel blur → dikey 9:16 telefon çerçevesi (rotate 8°).
4. **Faz 3 — Three Reads:**
   - `src/core/tooltip.ts` (yeni): `v-tip` directive — hover anında, mobil tap'ta konumlu tooltip; `main.ts` kaydı; 43 `title` → `v-tip` (TabHero prop'ları geri alındı).
   - Header: **"Sıradaki hedef" satırı** (U4) — alınabilir varsa "Frekans hazır / D3 alınabilir", yoksa en yakın hedefe kalan %.
   - Header: radyo widget'ı `hidden sm:flex`, şebeke/WiFi ikonları `hidden sm:block` (U1) — mobilde ilk bakış: sayaç + hedef.
5. **Faz 4 — Juice:** `count-pop` (tıklama/space anında sayaç mikro-pop, `prefers-reduced-motion` kapalı) + DimensionRow "10:" butonuna `affordance-pulse`.
6. **Doğrulama:** kontrast yeniden hesap (tüm metinler AA ✅), `npm run build` (`vue-tsc && vite build`) **sıfır hata**.

---

## [2026-10-01] - Hibrit Format Sinerjisi & Kolektif Trend Motoru (v0.8.1)

### Kapsam & Motivasyon:
- Üst kademe formatlar (D5-D8) açıldığında alt kademelerin (D1-D4) önemsizleşmesi ("Lower Tier Obsolescence") problemini çözmek için hibrit mekanik entegre edildi.

### Yapılan İş:
1. **`src/models/types.ts`:** `CollectiveMilestone` arayüzü eklendi.
2. **`src/stores/game.ts`:**
   - `COLLECTIVE_MILESTONES`: 25 (2x), 50 (3x), 100 (5x + %10 Frekans indirim), 250 (10x), 500 (25x), 1000 (50x).
   - `MIRROR_PAIRS`: D1↔D8, D2↔D7, D3↔D6, D4↔D5.
   - `getDimensionSynergyMultiplier`: $1 + \sqrt{\text{Partner.bought}} \times 0.15$ yakıt çarpanı hem `getDimensionMultiplier` hem de `getPartnerInfo`'ya bağlandı.
   - `collectiveMinBought`, `collectiveBottleneck`, `collectiveMilestoneInfo` ve `collectiveMultiplier` getter'ları.
   - `matterPerSecond` ve `update()` içindeki `rawProduced` hesabına `collectiveMultiplier` uygulandı; 100+ seviyede `tickspeedCost`'a %10 indirim entegre edildi.
3. **`src/components/DimensionRow.vue`:**
   - Her formata eşleştiği partneri ve sağladığı yakıt çarpanını gösteren neon rozet eklendi (`🔗 D8: ×2.50`).
4. **`src/components/DimensionsTab.vue`:**
   - Şafak barının altına "Kolektif Trend" bento kartı eklendi: Canlı ilerleme çubuğu ve oyuncuya en gerideki formatı gösteren "En Geride: D3 ASMR Sabun (38/50)" darboğaz uyarısı.
5. **Doğrulama:** `npm run build` (`vue-tsc && vite build`) sıfır hata ile doğrulandı.

## [2026-10-01] - Reels Pro: Akış Motoru & Algoritma Devrimi (v0.8.0)

### Kapsam & Motivasyon:
- Reels (Boyutlar) sekmesi sadece düz "10 Al" ve "Maks Al" butonlarından ibaretti; orta oyunda yavaşlama ve tekdüzelik oluşuyordu.
- *Antimatter Dimensions* (Dimension Sacrifice), *Cookie Clicker* (Milestone Çözünürlükleri, Upgrade Dükkanı) ve mobil sosyal medya refleksleri (Pull to Refresh) hibrit biçimde entegre edildi.

### Yapılan İş:
1. **`src/models/types.ts`:**
   - `ResolutionMilestone` ve `AlgorithmUpgradeDef`/`AlgorithmUpgradeId` tipleri eklendi.
   - `SerializedPlayerState`'e `sacrificeCount`, `sacrificeMultiplier`, `algorithmUpgrades`, `refreshCooldown` eklendi.
2. **`src/core/audio.ts`:**
   - `playSacrifice()`: Sub-bass sweep frekans süpürme efekti.
   - `playRefresh()`: Taktil hava swoosh ve parlak synth efekti.
   - `playMilestone()`: 4 tonlu arpej seviye atlama kristal çanı.
   - `playUpgrade()`: Yükseltme satın alma kilidi açma sesi.
3. **`src/stores/game.ts`:**
   - `RESOLUTION_MILESTONES`: 25 (360p - 2x), 50 (720p HD - 3x), 100 (1080p 60fps - 4x + %1 Tıklama payı), 250 (4K HDR - 8x), 500 (Nöro-Link - 16x), 1000 (Kozmik - 32x).
   - `ALGORITHM_UPGRADES`: 6 adet tek seferlik Dopamin yükseltmesi (1.25x Oynatma Hızı, Çift Dokunarak Beğen, OLED Sonsuz Siyah, Arka Planda Dinle, Kayıtlılara Ekle, Kulaklık Bass Boost).
   - `sacrificeDimensions()`: D1-D7 sıfırlanıp D8 Saf Beyin Çürümesine `(1 + log10(D1)/4)^2.5` kalıcı katlanan çarpan.
   - `pullToRefresh()`: 60 sn cooldown ile 12 sn boyunca 3x üretim dalgası.
   - Save / Load (serialize / deserialize) desteği tamamlandı.
4. **`src/components/DimensionRow.vue`:**
   - Her formata ulaştığı çözünürlük seviyesine göre neon rozet (`144p`, `360p`, `720p HD`, `1080p 60fps`, `4K HDR`).
   - Bir sonraki çözünürlük kademesine kalan adeti gösteren dinamik mini progress bar.
5. **`src/components/DimensionsTab.vue`:**
   - Üst çubukta "Akışı Yenile (Pull to Refresh)" taktil butonu ve canlı geri sayım/dalga rozeti.
   - 6 kartlık "Algoritma Yamaları" yükseltme dükkanı paneli.
   - 5. Sıçramadan sonra açılan "Önbelleği Sil (Dimension Sacrifice)" bento kartı.
6. **Doğrulama:** `npm run build` (`vue-tsc && vite build`) sıfır hata ile doğrulandı.

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





---

## [2026-10-01] - Doomscroll Tema Arındırma & Kalıntı Temizliği (v0.6.1)

### Kök Neden Analizi:
Projenin ilk geliştirme aşamasındaki prototiplerden (ofis/troll/sosyal medya ajansı) ve ilham kaynağı oyunlardan (Antimatter Dimensions, Cookie Clicker The Grimoire/The Garden, Quantum Horizon) kalan yabancı rozetler, değişkenler, ses metodları, yorumlar ve kayıt anahtarları mevcuttu.

### Uygulanan Çözümler:
1. **Arayüz (UI) Rozetleri & Metin Düzenlemeleri:**
   - [`AutobuyersTab.vue`](file:///data/data/com.termux/files/home/incremental/src/components/AutobuyersTab.vue): `badge="Antimatter Dimensions"` rozeti `badge="Otonom Algoritma"` olarak güncellendi.
   - [`CrisisTab.vue`](file:///data/data/com.termux/files/home/incremental/src/components/CrisisTab.vue): `badge="The Grimoire"` rozeti `badge="Gece Kararları"` olarak güncellendi, büyü ifadeleri kaldırıldı.
   - [`LabTab.vue`](file:///data/data/com.termux/files/home/incremental/src/components/LabTab.vue): `badge="The Garden"` rozeti `badge="Viral Laboratuvar"` olarak güncellendi.
   - [`StatsTab.vue`](file:///data/data/com.termux/files/home/incremental/src/components/StatsTab.vue): `Gece Kriz Kararları (Büyüler)` ifadesinden `(Büyüler)` temizlendi.
   - [`achievements.ts`](file:///data/data/com.termux/files/home/incremental/src/game/achievements.ts): Büyü, büyücü (`🧙`), sera gibi kalıntı başarım ad ve açıklamaları gece kararları ve trend format küratörlüğüne dönüştürüldü.
2. **Model, Tip ve Değişken İyileştirmeleri:**
   - [`types.ts`](file:///data/data/com.termux/files/home/incremental/src/models/types.ts): `InternetTroll` tipi `GuiltWrinkler` ile değiştirildi, geriye dönük tip alias'ı bırakıldı.
   - `leechedLikes` alanı `leechedDopamine` olarak refactor edildi.
   - `PlayerStats` ve `SerializedPlayerState` yorumlarındaki eski kavramlar (Kalp Atma, Beğeni, Mavi Tik, Troller, Likes) temizlenerek Doomscroll terminolojisine kavuşturuldu.
3. **Kayıt Sistemi (Save) ve Geriye Dönük Uyumluluk:**
   - [`save.ts`](file:///data/data/com.termux/files/home/incremental/src/core/save.ts): Anahtar `DOOMSCROLL_SAVE_V1` yapıldı; mevcut oyuncuların ilerlemesini korumak için `QUANTUM_HORIZON_SAVE_V1` fallback desteği eklendi.
   - [`stores/game.ts`](file:///data/data/com.termux/files/home/incremental/src/stores/game.ts): `serialize` ve `deserialize` çift taraflı geriye dönük uyumluluk (`leechedDopamine` || `leechedKpi`) ile korundu.
4. **Ses Motoru:**
   - [`audio.ts`](file:///data/data/com.termux/files/home/incremental/src/core/audio.ts): `playFireWorker` $\to$ `playSilenceGuilt()`, `playSlackerClick` $\to$ `playGuiltClick()`, `playCastSpell` $\to$ `playCrisisDecision()` eklendi ve geriye uyumluluk alias'ları korundu.
5. **Paket ve Direktif Tanımları:**
   - [`package.json`](file:///data/data/com.termux/files/home/incremental/package.json): `"name": "doomscroll-endless-reels"`.
   - [`AGENTS.md`](file:///data/data/com.termux/files/home/incremental/AGENTS.md): "Doomscroll: The Endless Reels" direktif başlığı ile hizalandı.
6. **Doğrulama:**
   - `npm run build` (`vue-tsc && vite build`) sıfır hata ile tamamlandı (6.37s).

---

## [2026-10-01] - Nöral Ağaç (Neural Tree) + Combo Serisi (v0.7.0)

### Neden Analizi:
Düz SP dükkânı seçim yaratmıyordu; aktif (tıklama) oyun geç oyunda anlamsuzlaşıyordu (tıklama ≈ üretimin %2.5'i). Kullanıcı talebi: Cookie Clicker'ın Heavenly ağacı + Realm Grinder tarikat seçimi + tıklama dalı gibi farklı oynanış build'leri. Araştırma: `brain/research/economy-balancing-research.md` (aktif oyuncu idle'dan zayıf kalıyor), Realm Grinder/Synergism/Cookie Clicker web araştırması. Karar: `brain/decisions/0012-neural-tree.md`.

### Uygulanan Adımlar:
1. **Tip ve State:**
   - [`types.ts`](src/models/types.ts): `NeuralBranch`, `NeuralNode`, `NeuralEffects` tipleri; state'e `neuralNodesBought: Record<string, number>` ve `clickCombo: { count, lastClickAt }` eklendi.
2. **Ağaç Verisi ve Efekt Entegrasyonu:**
   - [`stores/game.ts`](src/stores/game.ts): `NEURAL_TREE` (22 düğüm: kök + Uyku/Başparmak dalları + hibrit köprüler + 2 ikili `choiceGroup` seçim çifti); `computeNeuralEffects()` toplayıcısı; üretim, tıklama gücü, bot frekansı, koloni üreme hızı, offline kazanç ve SP kazanç çarpanlarına bağlandı.
   - CPS-to-click senkronu: sabit %2 → `min(0.08, 0.02 + 0.015×seviye)` (max %8).
   - `buyNeuralNode(id)` action'ı: SP, öncül zinciri ve choiceGroup hariç kilidi doğrular; `singularityReset` seçim düğümlerini serbest bırakır.
   - Eski `SINGULARITY_UPGRADES` id'leri (eye_drops vb.) ağaç düğümleriyle senkron: her iki satın alma yolu paylaşımlı `singularityUpgrades` seviyesini günceller.
3. **Combo (Hipnotik Seri) Mekaniği:**
   - `manualClick` 1500 ms pencere içinde seriyi büyütür; `update()` tick'inde sessizlikte söner. `COMBO_THRESHOLDS` ×2 (5 tık) / ×3 (15) / ×5 (40); sadece `combo_unlock` düğümü alınmışsa aktif.
4. **Save Migration:**
   - `serialize`/`deserialize` sürüm 8 → 9: `neuralNodesBought` + `clickCombo` alanları; düğüm id doğrulama ve eski dükkân seviyelerinin ağaca backfill'i (`NEURAL_LEGACY_UPGRADE_IDS`). Eski save'ler değişmeden yüklenir.
5. **UI:**
   - [`NeuralTreeTab.vue`](src/components/NeuralTreeTab.vue) (yeni): Cookie Clicker tarzı öncüllü ağaç — tam bilgi yalnızca tüm ebeveynler alınınca görünür, "???" slotu kısmen kilitli, amber (alınabilir) / zümrüt (maks) durumları, SEÇİM kilit ipucu, `Seviye X/Y` tekrarlanabilir düğümler, dal renk açıklaması.
   - [`SingularityTab.vue`](src/components/SingularityTab.vue): düz SP dükkânı grid'i ağaç paneliyle değiştirildi (TabHero ve çöküş butonu korundu).
   - [`Header.vue`](src/components/Header.vue): Kaydır butonu yanında combo rozeti (×N + rAF tabanlı 1.5 sn geri sayım çubuğu; serisizken CPU kullanımı sıfır).
   - [`AdminPanel.vue`](src/components/AdminPanel.vue): "Nöral Ağaç" debug bölümü (maxNeuralTree / resetNeuralTree / grantNeuralNode).
6. **Dokümantasyon:**
   - `brain/decisions/0012-neural-tree.md` (ADR) ve `GAME_DESIGN.md` 7.1 "Nöral Ağaç" bölümü eklendi.
7. **Doğrulama:**
   - `npm run build` (`vue-tsc && vite build`) sıfır TypeScript hatası ile tamamlandı (çekirdek faz 6.82s, UI fazı ve son kontrol dahil).
