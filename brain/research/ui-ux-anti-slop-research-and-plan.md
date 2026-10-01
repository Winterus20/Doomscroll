# Doomscroll UI/UX — Derin Araştırmaya Dayalı İyileştirme Planı (Anti-Slop Odaklı)

> **Tarih:** 2026-10-01 | **Kapsam:** Arayüzün "AI slop" gibi görünmesini engelleme, oyun UI/UX'ini zirveye taşıma.
> Bu belge internet araştırması + mevcut kod denetiminin birleşimidir. Uygulama planı §5'tedir.

---

## 1. Kaynaklar (İnternet Araştırması)

| # | Kaynak | Çıkan Ana Ders |
|---|--------|----------------|
| 1 | [avoid-ai-design — ai-tells-catalog.md](https://github.com/funboy322/avoid-ai-design) (67 tell, P0/P1/P2) | AI slop **iki kademe**: (a) birincil default (mor gradyan, Inter, glass her yerde), (b) *kaçış* default'ları da slop sayılır (cream+terracotta, near-black+asit yeşil, **all-caps mono eyebrow'lar**, `01/02/03`, başlıkta tek renkli kelime). Kaynak: Krebs'in ~1.400 Show HN sitesi analizi + Anthropic frontend-design kümesi. |
| 2 | [Unpromptable — 5 AI Website Design Tips](https://unpromptable.substack.com/p/5-ai-website-design-tips-for-websites) | "Slop boşlukları doldurur." Kimlik işi (mood board, referans toplama, eskiz) prompt'tan **önce** yapılmalı; adjectives ("modern, clean") AI'nin ortalamasını verir. |
| 3 | [Kyle Kukshtel — Some Game UI Principles](https://kylekukshtel.com/game-ui-principles) | Oyun UI 5 kuralı: (1) tutarlı buton dili, (2) **toplam ~8 renk** ve sabit renk sözlüğü, (3) bilgiyi **iki kez kodla** (sayı + renk/boyut), (4) sembol/metinden kaçın, (5) **"blow it up"** — önemli sayı büyük olmalı. Tooltips "day 1" şart. |
| 4 | [Zach Gage — Subway Legibility / Three Reads](http://stfj.net/DesigningForSubwayLegibility/) ([özet](https://mgmarlow.com/words/2023-01-15-case-study-zach-gage/), [gigazine](https://gigazine.net/gsc_news/en/20180501-game-design-subway-legibility/)) | **3 okuma**: 1. bakış = sezgisel çekirdek, 2. bakış = destekleyici detay, 3. bakış = geri kalan. Yoğun UI'ın ilacı: bilgiyi animasyon/görselle **ihtiyaç anında** göster (Hearthstone örneği). Ayrıca: öğretici metin yerine ikon+tooltip (Good Sudoku). |
| 5 | [The recipe behind Cookie Clicker (Gamasutra)](https://www.gamedeveloper.com/design/the-recipe-behind-cookie-clicker) | Düşük giriş bariyeri (ilk saniyede "neyi tıklayacağım" belli), **her eyleme anlık görsel geri bildirim**, net sunulan maliyet/gelir/adet verisi, pozitif pekiştirme döngüsü. |
| 6 | [Exploring Engagement in Idle Game Design (IEEE)](https://ieeexplore.ieee.org/document/10645671) / [RPI — Idle yet engaged](https://dspace.rpi.edu/items/64643720-6def-468e-a497-754e607c4941) | Idle oyuncusu **yetkinlik (competence) ve özerklik** ister: ne yapacağını bilmek + kendi ritmini seçmek. Negatif geri bildirim/zorluk artışına gerek yok. |
| 7 | [WCAG 2.2 Contrast (1.4.3)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) & [Target Size (2.5.5/2.5.8)](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) | Gövde metni ≥ **4.5:1** (büyük metin ≥3:1); dokunma hedefi WCAG min **24×24**, Apple HIG **44×44 pt**, Material **48dp**. |
| 8 | [Glassmorphism performansı](https://www.mironsoft.de/en/blog/css-backdrop-filter-frosted-glass-effects) / [Josh Comeau — backdrop-filter](https://www.joshwcomeau.com/css/backdrop-filter/) | `backdrop-filter` her kartta **pahalı**: arkadaki pikselleri örnekleyip bulanıklaştırır; tekrarlayan küçük kartlarda kullanılmamalı, yalnız gerçekten katmanlı yüzeylerde (sticky nav) tutulmalı. |
| 9 | [Diegetic UI (Sketch/GameDev)](https://www.sketch.com/blog/game-ui-design/) | Arayüz, oyunun dünyasının parçası olursa özgünleşir: "ekrandaki telefon" metaforu bu oyunda doğal bir diegetik iskelet. |
| 10 | [NN/g — F-Pattern](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/) | Tarama davranışı öngörülebilir: sol-üst ve üst şerit en yüksek değerli; kritik bilgi buraya. |
| 11 | [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Kontrol boyutu ve kontrast, platform kılavuzunun önerdiği minimumu karşılamalı. |

---

## 2. Çıkan Evrensel Prensipler

1. **Kimlik üründen türetilir, listeden değil.** Her tasarım kararı için soru: *"Her benzer sayfa/oyun için bunu yapar mıydım?"* Evet = default = slop adayı. Doomscroll'ün malzemeleri: **02:47 gece telefonu, reels altyazısı, 9:16 dikey feed, bildirim balonu, pil/şarj korkusu.**
2. **İki kademe slop bilinci.** Mor gradyanı kaldırmak yetmez; onun yerine konan "zevkli" default'lar (all-caps mono eyebrow, cream+terracotta, numaralı kartlar) da tell sayılır.
3. **Three Reads ile bilgi hiyerarşisi.** İlk bakışta sadece: dev sayı + "şimdi ne yapacağım" + kaydır butonu. Geri kalan kademelenmeli.
4. **Tutarlı renk sözlüğü + çift kodlama.** 6 renk zaten var (mor/emerald/cyan/blue/amber/rose) — bu bir güç. Her renğin tek anlamı korunmalı; animasyonlar da bu sözlüğe uymalı.
5. **Erişilebilirlik = kalite, süs değil.** AA kontrast, 44px hedef, focus-visible, reduced-motion.
6. **Performans bütçesi.** Blur/glow/libs-width: tekrarlayan kartlarda katı yüzey.
7. **Geri bildirim her eylemde** (Cookie Clicker dersi): tıkla → sayı, ses, titreşim, parçacık.

---

## 3. Mevcut Kod Denetimi (Bulgular)

### 3.1 Korunacak Güçler (dürüst denetim — bunlar iyi)
- `font-mono tabular-nums` + sabit `min-w-[...]` buton genişlikleri → **layout jitter yok** (v0.5.2). Birçok AI sitesinin 1 numaralı sorunu burada çözülmüş.
- 6 renkli **anlamsal renk sözlüğü** (`style.css` başlığı) — Kukshtel'in "~8 renk" kuralına uygun.
- `focus-visible` + `prefers-reduced-motion` desteği (`style.css:10-14`, `:339`).
- Z-index katman sistemi (`.layer-anomaly/juice/toast/modal`) tek elden.
- Türkçe, tematik, özgü copy ("Sadece 1 video izleyip uyuyacağım") — AI slop copy'si ("Elevate your workflow") yok.
- Tab bildirim noktaları (`.tab-dot`) ve ilerleme barları → "sıradaki ne" sinyali kısmen var.

### 3.2 AI-Slop Tell'leri (öncelik sırasıyla)

| ID | Tell | Kanıt | Severity |
|----|------|-------|----------|
| A1 | **All-caps mono eyebrow salgını** (SD4/T5) | `style.css:66` `.section-label { uppercase; letter-spacing:0.08em }`; `TabHero.vue:40` her sekmede `uppercase tracking-wider`; `Header.vue` "DOPAMİN" `uppercase tracking-widest` | P1 |
| A2 | **Muted metin AA altında** (C9) | `text-slate-500` (#64748b) ≈ **4.16:1**, `text-slate-600` (#475569) ≈ **2.68:1** (#08090d zeminde); `section-hint`, `NAV_LOCKED`, 10px hint'ler | P1 |
| A3 | **Default Vite favicon** (K1 starter untouched) | `index.html:5` `/vite.svg` — "starter deploy edilmiş, temalanmamış" klasik telli; meta description da yok | P1 |
| A4 | **Her yüzeyde backdrop-blur** (K3 + perf) | `.glass-panel/.glass-panel-glow/.glass-panel-card` hepsi `backdrop-filter`; `DimensionRow` satır başına `blur(14px)` × 8 + hero `blur(48px)` orb | P1 |
| A5 | **Renk sözlüğü ihlali: mor pulse amber butonda** | `style.css:184` `.affordance-pulse` keyframe'leri `border-color`'u mor'a animasyonluyor; `Header.vue` Hz butonu `affordance-pulse` + `border-amber-500/40` kullanıyor → canlı renk çelişkisi | P1 |
| A6 | **Tek tip rounded-xl/2xl + blur her yerde** (K2) | Neredeyse tüm yüzeyler `rounded-xl` + `shadow-*`; yarıçap hiyerarşisi yok | P2 |
| A7 | **Lucide chip tekrarı** (K6/I2) | Her sekme hero'sunda ikon+kart şablonu tekrar ediyor; oyunun emoji diliyle (🐱🧀🛹) ikon dili kısmen yarışıyor | P2 |
| A8 | **Bento refleksi** (L3) | "bento kart" ifadesi completed.md'de kalıcı alışkanlık; içerik gerçekten farklı ağırlıkta mı sorusu sorulmamış | P2 |
| A9 | **Mono = dekorasyon** (SD4m) | Nav etiketleri, bölüm başlıkları, rozetler hep `font-mono`; mono'nun meşru yeri tablo/sayı verisi | P2 |

**Bilinçli olarak savunulacak olanlar:** Koyu zemin (C7) bu oyunda **meşru** — konu 02:47 gecesi; mor (C1/C3) oyunun ana rengi. Bunlar "default" değil, bilinçli karar olarak kalmalı; savunma, onları **özgün türev detaylarla** güçlendirmekten geçer (§4).

### 3.3 UX Bulguları

| ID | Bulgu | Kanıt | Severity |
|----|-------|-------|----------|
| U1 | **Three Reads ihlali — ilk bakış yoğun** | Header'da eşzamanlı: durum çubuğu + radyo widget'ı + büyük sayı + 3 duruş + 4 aksiyon + 8 sekme | P1 |
| U2 | **Native `title` tooltip'leri mobilde ölü** | `DimensionRow`, nav, butonlar `title` kullanıyor; dokunmatikte hiç görünmez (Kukshtel: tooltip day 1) | P1 |
| U3 | **Dokunma hedefleri küçük** | Nav butonları `py-1.5 text-xs` ≈ 28px; `DimensionRow`但onlar `py-1.5` ≈ 30px — HIG 44px altında | P1 |
| U4 | **"Sıradaki hedef" tek satır yok** | Amaç dağılmış: Şafak barı, kolektif bar, sekme noktaları... tek odak çizgisi yok (competence/next-goal dersi) | P2 |
| U5 | **Sayaç kalabalıkta kaybolabilir** | Dev sayı ortada iken sağda radyo + solada saat; NN/g F-pattern'da kritik bilgi üst şeritte toplanmalı | P2 |

---

## 4. Kimlik Yönü: "Gece Telefonu" (Subject-Derived, Slop-Dışı)

Kaynak #1'in önerdiği gibi kimlik **ürünün malzemelerinden** türetilecek:

1. **Diegetik iskelet:** Sayfa bir *telefon ekranı* gibi davranır (status bar zaten var → güçlendir: pil gerçekten azalır gibi, şarj ikonu).
2. **Reels caption tipografisi:** Sayaç/başlıklar TikTok altyazısı dilinde — kalın, hafif outline'lı, ortalanmış; bu oyunun doğasından geliyor, AI default'undan değil.
3. **9:16 dikey motif:** Bölüm ayırıcıları/hero'lar dikey formatta kırpılmış görsel dil (Faz 3'te uzay-zaman 9:16'ya geriliyor — motif şimdiden kurulursa o an "planlı" hissettirir).
4. **Tipografi kararı:** Inter (gövde) + JetBrains Mono (yalnız **gerçek sayı verisi**) korunur; **display** için oyun dünyasından tek bir karakterli yüz eklenir (gece saati/counter için LED/LCD veya condensed tabloid — karar brief'ten verilecek). Mono, etiket/dekorasyon olmaktan çıkarılır.
5. **Bilgi-içi etiket:** All-caps eyebrow'lar ya kaldırılır ya da gerçek bilgiye çevrilir (adet, tarih, durum — sentence case).

---

## 5. Fazlı Uygulama Planı

### Faz 0 — Ölçüm & Denetim (0.5 gün)
- 1600px ve 390px ekran görüntüleri + **silüet testi** (200px siyah-beyaz kontur; 5 rakip oyunla yan yana).
- Tüm `text-*` sınıfları için kontrast tablosu (otomatik grep + hesap).
- Dokunma hedefi ölçümü (nav + satır butonları).
- **Çıktı:** `brain/research/` içinde ölçüm tablosu; bulgular §3 ile teyit/güncelleme.

### Faz 1 — Erişilebilirlik Tıraşı (P1, 1 gün) — kod minimal, etki maksimum
- A2: `slate-500/600` → AA geçen token'lara geçiş (ör. `#8b98ad` sınıfı) veya zemin/dolgu güçlendirme.
- U3: nav ve satır butonlarında dokunma alanı 44px (padding veya `::after` hit-area ile — görsel boyut bozulmadan).
- A3:/favicon + meta description.
- A5: `.affordance-pulse` accent'i CSS custom property (`--pulse-color`) ile butona görelenecek; amber buton mor atmıyor olacak.
- **Kabul:** kontrast raporu 0 AA ihlali; mobilde tüm hedefler ≥44px; `npm run build` 0 hata.

### Faz 2 — AI-Slop Temizliği + Kimlik (1-2 gün)
- A1/U5: eyebrow'ların çoğu silinecek/sentence-case gerçek bilgiye dönüştürülecek; hero başlıkları bilgi yoğunluğuna göre kademelenecek (Three Reads).
- A4: `DimensionRow` ve tekrarlayan kartlardan `backdrop-filter` kaldırılacak (katı renk + hairline border); blur yalnız sticky header/nav'da kalacak.
- A6: yarıçap hiyerarşisi (roller göre: satır 10px, panel 14px, modal 20px vb.).
- §4 kimlik maddeleri 2-4 (reels caption sayaç stili, display face kararı).
- **Kabul:** yeniden silüet testinde rakiplerden ayrışma; `detect` benzeri taramada P0/P1 tell kalmaması (gerekirse `npx skills add funboy322/avoid-ai-design` ile denetim — kullanıcı onayıyla).

### Faz 3 — Three Reads & Rehberlik (1-5 gün… 1 gün)
- U1: Header sadeleştirme — radyo mini-player sıkıştırılabilir/gecikmeli; ilk bakışta dev sayı + tek aksiyon öne çıkacak.
- U4: "Sıradaki" tek satır bileşeni (ör. *Şafak'a 1.79e308 kaldı — %62* veya *Şu an alınabilir: D3 ×10*).
- U2: `title` yerine küçük bir `GameTooltip` (hover + mobilde tap ile); `TabHero` alt başlıkları ve `DimensionRow` satır açıklamaları buraya taşınacak.
- **Kabul:** ilk bakışta 3 saniyede "ne yapıyorum + ne yapacağım" testi; mobil tap'te tooltip görünüyor.

### Faz 4 — Oyun Hissi & İmza Detay (1-2 gün)
- Juice rafinerisi: satın alım→parmak izi hissi (squash + ışık + ses rampası) tutarlı; anomali bildirimleri telefon bildirim balonu dilinde.
- §4 madde 2-3 (9:16 motif) uygulaması.
- **Kabul:** her eylemde ≥2 duyusal kanal (görsel+ses); reduced-motion'da hepsi zarifçe kapanıyor.

### Faz 5 — Performans & Doğrulama (0.5 gün)
- Blur bütçesi: Lighthouse/performans kontrolü, mobilde 60fps'de juice katmanı.
- `npm run build` 0 hata; ekran görüntüleri; **ADR** (kimlik kararı) + `brain/tasks/completed.md` girişi.

---

## 6. Doğrulama Protokolü (her faz sonunda)
1. `npm run build` (`vue-tsc && vite build`) → 0 hata.
2. Silüet testi (kendini rakiplerinden ayır).
3. Kontrast + dokunma hedefi otomatik kontrolü.
4. `prefers-reduced-motion` ve klavye (Space/Tab/Enter) geçiş testi.
5. 1600px + 390px ekran görüntüsü karşılaştırması.
