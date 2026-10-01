# Doomscroll: The Endless Reels — UI/UX Modernizasyon & Game Feel Mimari Raporu

> **Araştırma Özeti:** Modern web incremental ve clicker oyunları (*Balatro, Cookie Clicker, Antimatter Dimensions: Reality, Melvor Idle*), modern sosyal medya arayüzleri (TikTok/Instagram Reels) ve 2025/2026 Cyberpunk/Dark Bento Grid trendleri incelenerek hazırlanmış derinlemesine UI/UX tasarım ve mühendislik planıdır.

---

## 1. Temel Problem ve Vizyon: "Gece 02:47 Hipnozu"

### Mevcut Durum Analizi
Mevcut arayüz ([`src/App.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/App.vue), [`src/components/Header.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue), [`src/components/DimensionsTab.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionsTab.vue)) teknik olarak çalışan sağlam bir sisteme sahip olsa da görsel ve hissi olarak:
1. **Atmosfer Eksikliği:** Standart bir koyu temalı admin/dashboard ekranı hissi veriyor; oyunun ana teması olan *"gece yatakta hipnotik Reels kaydırma, yorgan altı karanlığı, göz kanlanması ve dopamin tekilliği"* oyuncuya görsel olarak geçmiyor.
2. **"Juice" (Taktil Doyum) Yetersizliği:** Tıklamalarda yalnızca buton küçülüyor (`:active scale-95`); ekranda yükselen dopamin sayıları, fırlayan reaksiyon emojileri (❤️, 💀, 🧠), ekran sarsıntısı (screen shake), ritmik ses modülasyonu bulunmuyor.
3. **Tablo Görünümü:** Boyutlar (D1-D8) birer içerik formatı (Kedi videolarından beyin çürümesine) olmasına rağmen standart düz satırlar halinde listeleniyor.
4. **Alınabilirlik (Affordance) Sinyali:** Oyuncu bir şeyi alabildiğinde butonlar yeterince parlamıyor; kilitli ile açık olanlar arasındaki hiyerarşi zayıf.

### Hedef Vizyon: "Dopamine-Infused Smartphone Simülasyonu"
Oyunun kimliği: **"Bir masaüstü ekranında çalışan, OLED gece ışıltılı, dokunsal, canlı ve hipnotik bir Gece 03:00 Akıllı Telefon Deneyimi."**

```
┌──────────────────────────────────────────────────────────────┐
│  STATUS BAR: 02:47 AM  •  %3 Pil [🔴 Düşük Güç]  •  Wi-Fi   │
├──────────────────────────────────────────────────────────────┤
│  DYNAMIC ISLAND / DOPAMİN GÖSTERGESİ                         │
│  🔥 1.48e18 DOPAMİN  (+4.20e15/sn)                           │
│  [Yorgan Altı Modu] [Frekans: 144Hz] [Space / Swipe: +1.2e8] │
├──────────────────────────────┬───────────────────────────────┤
│  SOL: DİKEY REELS VİEWPORT    │  SAĞ: BENTO GRID / SİSTEMLER  │
│  ┌─────────────────────────┐ │  ┌──────────────────────────┐ │
│  │ 📱 FEED SIMULATOR       │ │  │ 🎛️ GELİŞİM SEKMELERİ     │ │
│  │ [Aktif Video Oynatıcı]  │ │  │ [Reels] [Lab] [Kriz]...  │ │
│  │ • Yüzen Kalpler (❤️,💀) │ │  └──────────────────────────┘ │
│  │ • +Dopamin Parçacıkları │ │  ┌──────────────────────────┐ │
│  │ • Kaydırma Kinetiği     │ │  │ 📊 D1-D8 GELİŞİM KARTLARI│ │
│  │ [👆 YUKARI KAYDIR!]     │ │  │ [Sonraki 10x'e Kalan Bar]│ │
│  └─────────────────────────┘ │  └──────────────────────────┘ │
└──────────────────────────────┴───────────────────────────────┘
```

---

## 2. Küresel Literatür ve Başarılı Oyunlardan Çıkarılan Dersler

### A. *Balatro* Dersi: "Juice is the Core Product"
- *Balatro*, temelde kuru bir poker hesap makinesidir. Onu hipnotik yapan şey arayüzün her dokunuşa verdiği **fiziksel, işitsel ve görsel ağırlıktır** (Simulated Weight & Inertia).
- **Çıkarım:** Dopamin sayacımız yalnızca bir metin olmamalı; artış hızına göre hafifçe nabız gibi atmalı (`subtle scale pulsing`), büyük kazançlarda ekrana hafif kromatik sapma veya CRT titreşimi gelmeli.

### B. *Cookie Clicker* & r/incremental_games Dersi: "Layout Stability"
- Reddit incremental topluluğunun 1 numaralı şikayeti: **Sayılar büyüdükçe veya notasyon değiştikçe butonların yer değiştirmesi (layout jitter).**
- **Çıkarım:** Tüm sayılar ve butonlar `font-mono tabular-nums` ile sabit genişlikli konteynerlerde (`min-w-[...]`) tutulmalı; hiçbir zaman butonlar metin uzadı diye sağa-sola zıplamamalıdır.

### C. *TikTok / Instagram Reels* Dersi: "Frictionless Vertical Motion"
- Sosyal medya algoritmalarının bağımlılık sırrı: **Sıfır sürtünmeli dikey hareket** ve **beklenti ödülü** (Random Reward Schedule).
- **Çıkarım:** Tıklama butonu tek başına bir buton olmaktan çıkıp, dokunmatik hissi veren, üzerine tıklandığında veya fare tekerleğiyle yukarı kaydırıldığında ekrandaki içeriği bir sonraki absürt videoya geçiren bir mikro-simülatör olmalıdır.

---

## 3. Yeni Tasarım Sistemi: "OLED Cyber-Midnight"

### Renk Paleti ve Semantik Tokenler

| Token | Değer | Kullanım Amacı |
| :--- | :--- | :--- |
| `--bg-void` | `#05070a` | En derin OLED siyahı, gövde arka planı |
| `--bg-card` | `rgba(13, 17, 26, 0.75)` | Buzlu cam zemin (Glassmorphism 2.0) |
| `--bg-surface-elevated` | `rgba(22, 28, 42, 0.85)` | Aktif bileşenler ve modal pencereleri |
| `--neon-purple` | `#a855f7` | Ana oyun rengi (Dopamin, D1-D8 Beyin Çürümesi) |
| `--neon-rose` | `#f43f5e` | Manuel kaydırma, Vicdan azabı, Kriz patlamaları |
| `--neon-amber` | `#f59e0b` | Frekans (Hz), Sabah 06:00, Galaksi ve Altın krizler |
| `--neon-cyan` | `#00f0ff` | Algoritma Frekansı, Teknoloji, Botlar |
| `--neon-emerald` | `#10b981` | Algoritma Laboratuvarı, Hasat ve Çarpanlar |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Pasif kart kenarlıkları |
| `--border-affordable` | `rgba(168, 85, 247, 0.5)` | Satın alınabilir parlayan neon kenarlık |

### Tipografi Hiyerarşisi
- **Display & Başlıklar:** `Inter` (Font-weight: 800-900, tracking: -0.03em) — Güçlü, modern ve net.
- **Sayılar & İstatistikler:** `JetBrains Mono` (`font-mono tabular-nums`) — Asla titremeyen, okunaklı, profesyonel veri hissi.
- **Etiketler & Durumlar:** `Inter` (Font-weight: 600, uppercase, tracking: 0.05em, text-[10px]-[11px]).

---

## 4. Kritik UI Bileşenlerinin Yenilenme Mimarisi

### 1. "Gece 02:47 Telefon Çerçevesi" & Header Bar
- **Telefon Durum Çubuğu (Status Bar):**
  - Sol taraf: `02:47 AM` (Oyunda zaman ilerledikçe ağır ağır 03:15, 04:30 ve 06:00'a doğru ilerler).
  - Sağ taraf: Pil ikonu kırmızı renkte `%3` seviyesinde yanıp söner (`⚡ Düşük Güç Modu`), Wi-Fi ve çekmeyen hücresel şebeke çubukları.
- **Dopamin Sayacı (The Dopamine Core):**
  - Üstte gradient neon ışıltılı büyük rakamlar.
  - Hemen altında net üretim (+X/sn) ve soluk vicdan azabı kesintisi.
- **Taktiksel Stance Duruşları (Yorgan Altı / Çılgın Kaydırma / Düşük Parlaklık):**
  - Yan yana küçük hap (pill) şeklinde değil; telefonun "Hızlı Ayarlar" (Control Center) widget'ı gibi modern cam kartlar şeklinde.

### 2. Taktil "Yukarı Kaydır!" Simülatörü ve Canvas Juice Motoru
- **Floating Particles Engine (Bağımsız Canvas Katmanı):**
  - Kullanıcı tıkladığında veya Space tuşuna bastığında:
    - Tıklanan imleç veya buton noktasından yukarı doğru süzülen sayılar: `+1.42M Dopamin`.
    - Rastgele fırlayan emojiler: ❤️, 🔥, 💀, 🧠, 🤯.
    - Fizik motoru: Rastgele hafif açı (-15° ila +15°), başlangıç hızı, yerçekimi/süzülme ve yumuşak opaklık sönmesi (fade-out).
  - DOM yerine hafif bir `<canvas>` veya pooling yapılmış hafif DOM elemanlarıyla 60 FPS sıfır takılma garantisi.
- **Reels Mockup Kartı (Görsel İçerik):**
  - Tıklama butonu sade bir gri kutu yerine dikey bir telefon ekranı mockup'ı içinde yer alabilir.
  - Her kaydırmada arka planda glitch/değişen esprili başlıklar:
    - *"Adam tek başına 40 kişilik sokak tostu yapıyor..."*
    - *"Bu videoyu izleyenlerin %99'u uyuyamadı..."*
    - *"Sabun kesme sesi ile 8 saatlik uyku vaadi..."*

### 3. Reels Formatları (D1-D8 Boyut Satırları)
Mevcut düz satırlar yerine **Algoritmik İçerik Kartları**:
- **İlerleme Çubuğu (Progress to Next Multiplier):** Her satın alım 10'luk paketlerle çalıştığından, her satırın altında `7/10` şeklinde parlayan neon dolum çubuğu. Dolduğu anda minik bir neon parıltı!
- **Tematik Rozetler:**
  - D1: 🐱 Yumuşak Mor (Masum Başlangıç)
  - D2: 🧀 Sıcak Turuncu (Gece 3 Sokak Yemekleri)
  - D3: 🧼 Turkuaz / Nane (ASMR Sabun)
  - D4: 🎮 Neon Yeşil (Subway Surfers + Reddit)
  - D5: 💼 Platin / Altın (Sigma Girişimciler)
  - D6: 📺 Canlı Kırmızı (Hint Dizisi Part 1/12)
  - D7: 🌌 Derin Kozmik Mavi (Varoluşsal Kriz)
  - D8: 🧠 Glitch Moru / Saykodelik (Saf Beyin Çürümesi)
- **Satın Alma Butonları:** Alınabilir olduğunda canlı neon sınır çizgisi ve hover durumunda hafifçe yukarı kalkma (`translate-y-[-1px]`).

### 4. Yüzen Gece Krizleri (Golden Reels / AnomalyOverlay)
- Mevcut zıplayan kutular yerine:
  - Gerçek telefon bildirim balonu veya Instagram DM / TikTok canlı yayın pop-up'ı şeklinde süzülen neon paneller.
  - Tıklandığında `canvas-confetti` patlaması, hafif ekran sarsıntısı (`screen-shake`) ve sentezlenmiş 4 tonlu arpej sesi.

### 5. Sabah 06:00 Çöküşü (The Singularity Event)
- Güneş doğduğunda (1e308 Dopamin):
  - Ekranın kenarlarından yavaş yavaş sızan sabah güneşi ışıkları (amber/altın degrade).
  - Dışarıdan gelen kuş sesleri synthesizer osilatörleriyle canlanır.
  - "Güneş Doğdu!" butonu tüm arayüzü saran nabız gibi atan altın bir hale kazanır.

---

## 5. Uygulama ve Adım Adım Entegrasyon Planı

1. **Aşama 1: CSS ve Stil Altyapısı ([`src/style.css`](file:///c:/Users/Yigit/Documents/Incremental/src/style.css))**
   - Glassmorphism 2.0 sınıfları, neon border ışıltıları, ekran titreme (`@keyframes screen-shake`) ve floating text animasyonları.
2. **Aşama 2: Floating Juice & Particles Motoru ([`src/components/JuiceLayer.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/JuiceLayer.vue))**
   - Tıklamalarda yükselen dopamin sayıları ve fırlayan reaksiyon ikonları.
3. **Aşama 3: Header & Status Bar Modernizasyonu ([`src/components/Header.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/Header.vue))**
   - 02:47 AM saat, %3 pil, Dynamic Island tasarımı, sabit genişlikli stabil sayaçlar.
4. **Aşama 4: Boyutlar & Satır Kartları ([`src/components/DimensionRow.vue`](file:///c:/Users/Yigit/Documents/Incremental/src/components/DimensionRow.vue))**
   - 10'luk dolum barı, tematik renk kodlaması, satın alınabilirlik sinyali.
5. **Aşama 5: Ses ve Hissiyat Sentezi ([`src/core/audio.ts`](file:///c:/Users/Yigit/Documents/Incremental/src/core/audio.ts))**
   - Seri tıklamalarda kademeli yükselen frekans (Animal Crossing / Peglin konuşma efekti gibi tatmin edici dokunuşlar).
