# Kozmik Kütle Eşdeğerliği ve Basamak Yazma Simülasyonu Mimarisi (Plan)

Bu belge, **UROBOROS: The Cosmic Feast** projesinde *Rapor (StatsTab)* sekmesindeki eski "Fiziksel Kütle Çekim Mesafesi (Başparmak Mesafesi)" metriğini kaldırıp; yerine **Antimatter Dimensions** ve kozmolojik ölçek modelinden esinlenen iki güçlü telemetri sistemini entegre etme planıdır.

---

## 1. Problemin Tanımı ve Değişim Gerekçesi

- **Mevcut Durum:** `StatsTab.vue`'da yer alan "Fiziksel Kütle Çekim Mesafesi" kartı, eski sosyal medya prototipinden kalma `clicks * 0.05` metre hesabı yapmakta ve Galata Kulesi, Eyfel Kulesi, Everest Dağı gibi dünyevi yüksekliklerle kıyaslamaktadır.
- **Uyuşmazlık:** UROBOROS, su damlasındaki moleküler bağlardan başlayıp ($10^{-24}\text{ g}$), Planck duvarını yırtarak tüm Samanyolu'nu ve gözlemlenebilir evreni yutan ($10^{56}\text{ g} \dots 1.79 \times 10^{308}\text{ g}$) kozmik bir tekillik oyunudur. Dünyevi başparmak mesafesi temaya oturmamaktadır.
- **Yeni Tasarım (İki Ayaklı Hibrit Model):**
  1. **Kozmik Kütle Eşdeğerliği ("Bu Yutulan Kütleyle Ne Yapılabilir?"):** Oyuncunun yuttuğu kütle miktarıyla evrende kaç adet Güneş, Dünya, Karadelik, Galaksi veya Gözlemlenebilir Evren oluşturulabileceğini/yutulabileceğini dinamik hesaplayan taktil bir karşılaştırma motoru.
  2. **Kütleyi Yazma Süresi ("Bu Kütleyi Yazmak Ne Kadar Sürer?"):** *Antimatter Dimensions* orijinal formülü: `"If you wrote 3 numbers a second, it would take you X years, Y days, Z hours, W minutes, and V seconds to write down your antimatter amount."` Kütlenin basamak sayısını hesaplayıp, saniyede 3 basamak hızla aralıksız yazıldığında geçecek süreyi kozmik zaman dilimleriyle (saniye, gün, yıl, evrenin yaşı) görselleştirme.

---

## 2. Matematiksel Model ve Algoritmalar

### A. Kütleyi Elle Yazma Süresi Formülü (Antimatter Dimensions Modeli)

1. **Basamak Sayısı (Digits) Hesabı:**
   - Kütle $M \ge 1$ ise basamak sayısı:
     $$\text{Digits} = \lfloor \log_{10}(M) \rfloor + 1$$
   - `break_eternity.js` üzerinde:
     `const digits = mass.gte(1) ? Decimal.floor(mass.log10()).plus(1) : new Decimal(1)`
2. **Yazma Hızı ve Toplam Süre:**
   - Standart insan yazma hızı: Saniyede 3 basamak (digits / 3).
   $$\text{Seconds} = \frac{\text{Digits}}{3}$$
3. **Zaman Dilimleme Formatlayıcısı:**
   - **$S < 60$ sn:** `"{S} saniye"`
   - **$60 \le S < 3600$ (1 saat):** `"{dk} dakika {sn} saniye"`
   - **$1 \text{ saat} \le S < 86400$ (1 gün):** `"{sa} saat {dk} dakika"`
   - **$1 \text{ gün} \le S < 31.536.000$ (1 yıl):** `"{gün} gün {saat} saat"`
   - **$1 \text{ yıl} \le S < 1.38 \times 10^{10} \times 31.536.000$ (Evrenin Yaşı):** `"{yıl} yıl, {gün} gün"`
   - **$\ge \text{Evrenin Yaşı}$ ($13.8$ Milyar Yıl):** `"X × Evrenin Yaşı (13.8 Milyar Yıl)"` veya astronomik bilimsel notasyon (`"4.35e12 Yıl"`).
4. **Mizahi / Lore Durum İfadesi:**
   - Basamak sayısına göre ek dinamik dipnot (örn: *"1.79e308 g kütleyi yazmak 1 dakika 43 saniye sürerken; bu kütleyi fiziksel olarak tek bir kağıda basmak tüm gözlemlenebilir evrenin atomlarını tüketir."*)

---

### B. Kozmik Kütle Eşdeğerliği Skalası ("Bu Yutulan Kütleyle...")

Kütle değerleri gram ($g$) cinsinden tanımlı gerçek astrofiziksel ve fiziksel referanslar:

| Kademe ID | Referans Adı | Kütle ($g$) | Örnek Dinamik İfade |
| :--- | :--- | :--- | :--- |
| `water_drop` | Bir Damla Su | $0.05$ | "Bir su damlasındaki 1.67 sekstilyon molekül bağını tekillikte kopardınız." |
| `paperclip` | Bir Metal Ataş | $1.0$ | "Evrensel ataş simülasyonunu başlatacak kadar saf madde tekillikte eridi." |
| `human` | İnsan Vücudu | $7 \times 10^4$ | "Bir yetişkin insanın tüm biyokimyasal kütlesi kuantum çorbasına katıldı." |
| `elephant` | Afrika Fili | $5 \times 10^6$ | "Devasa bir filin kütlesi olay ufkunda atomlarına ayrıştırıldı." |
| `pyramid` | Büyük Gize Piramidi | $6 \times 10^{11}$ | "Gize Piramidi'nin 6 milyon tonluk kireçtaşı blokları tekillikte sıkıştırıldı." |
| `ocean` | Dünya Okyanusları | $1.4 \times 10^{24}$ | "Dünya'nın tüm okyanusları tekillik kazanında bir anda buharlaştı." |
| `moon` | Ay | $7.35 \times 10^{25}$ | "Ay'ın yerçekimi kilidi kırıldı, gelgit kütlesi tekilliğe aktı." |
| `earth` | Dünya Gezegeni | $5.972 \times 10^{27}$ | "Dünya gezegeninin çekirdeği, kabuğu ve mantosu tek lokmada yutuldu." |
| `jupiter` | Jüpiter Gaz Devi | $1.898 \times 10^{30}$ | "Güneş Sistemi'nin en büyük gaz devi tekillik tarafından sindirildi." |
| `sun` | Güneş ($1\ M_\odot$) | $1.989 \times 10^{33}$ | "Güneş füzyonunu tamamlayamadan olay ufku tarafından emildi." |
| `sagittarius_a`| Sagittarius A* | $8.26 \times 10^{39}$ | "Samanyolu'nun kalbindeki süper kütleli karadelik artık sizin küçük bir atıştırmalığınız." |
| `ton_618` | TON 618 Karadeliği | $1.31 \times 10^{44}$ | "Evrende bilinen en devasa kütleli hiper-karadelik bile bu kütle karşısında cüce kalır." |
| `milky_way` | Samanyolu Galaksisi | $1.5 \times 10^{45}$ | "Samanyolu'ndaki 400 milyar yıldız ve karanlık madde halesi tekillikte birleşti." |
| `virgo_cluster`| Başak Galaksi Kümesi| $2.4 \times 10^{48}$ | "Binlerce galaksiden oluşan dev kozmik küme kütleçekimsel ağınıza takıldı." |
| `universe` | Gözlemlenebilir Evren | $1.5 \times 10^{56}$ | "Gözlemlenebilir evrenin tüm baryonik maddesi olay ufkunun içine hapsedildi." |
| `multiverse` | Çoklu Evren Tekilliği | $10^{65} \dots 10^{308}$| "Fizik yasaları çöktü. Sayısız paralel boyut ve kuantum köpüğü doymak bilmez oburluğunuzla besleniyor." |

**Oranlama Mantığı:**
- Kütle hangi aralıktaysa en yakın/anlamlı referans seçilir.
- Çarpan hesabı: $\text{Count} = \frac{M}{\text{Referans Kütle}}$
- Gösterim: `"12.4 Bin × Dünya"`, `"42.8 Milyon × Güneş"`, `"1.79 × Gözlemlenebilir Evren"`.

---

## 3. Mimari ve Bileşen Planı

### A. Yeni Çekirdek Modül: `src/core/cosmic-scale.ts`
- **Görev:** Kütle eşdeğerliği ve basamak yazma süresi hesaplarını bağımsız, saf fonksiyonlarla yönetmek.
- **Dışa Aktarılacak Metotlar:**
  1. `calculateCosmicEquivalence(mass: Decimal): CosmicEquivalenceResult`
     - En uygun referansı, oran çarpanını, sonraki hedefe ilerleme yüzdesini ve dinamik lore açıklamasını döner.
  2. `calculateDigitWritingTime(mass: Decimal): DigitWritingTimeResult`
     - Basamak sayısını, saniyeyi, detaylı zaman dizesini (`"1 Yıl, 4 Gün, 2 Saat..."`) ve esprili açıklamasını döner.

### B. Tip Tanımları (`src/models/types.ts`)
```ts
export interface CosmicEquivalenceResult {
  currentTierName: string
  currentTierIcon: string
  countText: string // "42.8 Milyon × Güneş"
  loreText: string // "Bu kütleyle Güneş füzyonunu tamamlayamadan..."
  nextTierName: string
  progressPct: number // 0-100 logaritmik ilerleme
}

export interface DigitWritingTimeResult {
  digits: Decimal
  digitsFormatted: string
  timeFormatted: string // "14 gün 6 saat" veya "2.4 × Evrenin Yaşı"
  humorousQuote: string
}
```

### C. Pinia Store Entegrasyonu (`src/stores/game.ts`)
- `biometrics` getter'ı güncellenir:
  - Eski `thumbDistanceMeters` yerine `cosmicScale` ve `writingTime` alanları eklenir.
  - Geriye dönük uyumluluk veya export bozulmaması için eski alanlar korunur/yedeklenir.
  - `totalMatterProduced` kümülatif değeri temel alınır (oyuncunun tüm serüvenini temsil eder).

### D. Arayüz Güncellemesi (`src/components/StatsTab.vue`)
- `Fiziksel Kütle Çekim Mesafesi` kartı kaldırılıp yerine 2 sütunlu modern Bento Grid paneli yerleştirilir:
  - **Sol Panel:** Kozmik Kütle Eşdeğerliği (Dinamik gök cismi sayısı, bir sonraki seviyeye logaritmik bar, lore ipucu).
  - **Sağ Panel:** Basamak Yazma Simülasyonu (Saniyede 3 basamak hız, toplam basamak adedi, harcanacak zaman ve AD tarzı kozmik karşılaştırma).
- `copyReport()` paylaşım metnine bu yeni telemetri satırları eklenir (`🌌 Kütle Eşdeğeri`, `✍️ Basamak Yazma Süresi`).

---

## 4. Test ve Doğrulama Planı

1. **Birim Testleri (`src/core/cosmic-scale.test.ts`):**
   - $M = 0$, $M = 1$, $M = 10^3$, $M = 10^{33}$ (Güneş), $M = 1.79 \times 10^{308}$ sınır durumları testi.
   - Saniyede 3 basamak hesabının doğruluğu (309 basamak $\to \sim 103$ saniye $\to$ 1 dk 43 sn).
   - Zaman formatlayıcısının uç değerlerde çökmemesi (`break_eternity` `.isNan()` kontrolleri).
2. **Build ve Regresyon Doğrulaması:**
   - `vitest run` ile 165+ testin tamamının yeşil kalması.
   - `npm run build` (`vue-tsc && vite build`) ile sıfır tip hatası.
