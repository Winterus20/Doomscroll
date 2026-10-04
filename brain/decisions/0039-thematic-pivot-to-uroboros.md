# ADR-0039: Tematik Dönüşüm — Doomscroll'dan UROBOROS'a Geçiş

- **Tarih:** 2026-10-04
- **Durum:** Kabul Edildi (Accepted)
- **Kapsam:** Oyun Teması, Hikaye, Terminoloji, $D_1 - D_8$ Boyut Hiyerarşisi, UI ve Marka

---

## 1. Bağlam ve Sorun (Context & Problem)
Önceki tema olan *Doomscroll: The Endless Reels* (gece 02:47'de yatakta video kaydırma), ilk prototip aşamasında mizahi ve tanıdık bir kurgu sunmuş olsa da bir incremental oyununun temel dinamikleriyle çelişiyordu:
1. **Pasif Tüketim Çelişkisi:** İncremental oyunların özünde "büyüme, imparatorluk kurma ve güç fantezisi" varken, yatakta acizce reels kaydıran bir kurban olmak oyuncuda üretim ve zafer tatmini yaratmıyordu.
2. **Ölçek Uyuşmazlığı ($10^{10} \to 10^{308}$):** $10^{100}$ birim "Dopamin" oyuncuda somut bir karşılık bulmuyor; yüzlerce basamak sonra hala "kaşarlı tost videosu" görmek temayı soyutlaştırıp hafifletiyordu.

---

## 2. Karar (Decision)
Oyunun teması, oyun dünyasında benzersiz bir "Kuantumdan Kozmosa İki Fazlı Obur Tekillik" kurgusu olan **UROBOROS**'a dönüştürülmüştür:

1. **Ana Başlık:** `UROBOROS`
2. **Temel Hikaye:** Laboratuvarda çevre kirliliğini ve karbon salınımını sıfırlamak isteyen masum bir bilim insanının atomaltı parçacıkları ayrıştıran kuantum filtresi yapması; ancak Planck ölçeğinde ($10^{-35}$ m) uzay-zaman dokusunun yırtılarak mikro-karadelik oluşması ve odadaki nesneleri, şehri, Dünya'yı, Güneş'i ve nihayetinde Samanyolu Galaksisi'ni yutan kozmik bir tekilliğe (Uroboros) dönüşmesi.
3. **Temel Parametreler:**
   - Ana Kaynak: **Yutulan Kütle (Consumed Mass)** (g, kg, ton, Dünya Kütlesi, Güneş Kütlesi, Samanyolu).
   - Taktil Eylem: **"🌌 YUT! / HAM YAP! (CONSUME!)"**
   - Tickspeed: **"Çekim Hızı (Hz)"** (`pullSpeedHz` / Tickspeed).
   - $D_1 - D_8$ Katmanları:
     - $D_1$: Moleküler Bağlar (Su Damlası / Nanometre)
     - $D_2$: Elektron Orbitalleri (Pikometre)
     - $D_3$: Nükleer Çekirdek (Femtometre)
     - $D_4$: Kuark & Gluon Çorbası (Attometre)
     - *[KIRILMA: PLANCK YIRTILMASI / MİKRO KARADELİK]*
     - $D_5$: Laboratuvar & Şehir (Binalar, arabalar)
     - $D_6$: Gezegenler & Dünya ($5.97 \times 10^{27}$ g)
     - $D_7$: Yıldızlar & Güneş ($1.98 \times 10^{33}$ g)
     - $D_8$: Samanyolu & Kozmik Karadelikler ($10^{45}$ g+)
   - Akış Sıçraması $\to$ **Ölçek Sıçraması (Scale Shift)**
   - Mavi Işık / Galaksi $\to$ **Kozmik Çöküş (Cosmic Collapse)**
   - Krizler $\to$ **Kozmik Dalgalanmalar (Hawking Işıması, Kütle Patlaması, Kuantum Sıçraması)**
   - Duruşlar $\to$ **Çekim Duruşları (Kuantum Odak, Obur Çekim, Vakum Kalkanı)**
4. **Kapsam:** Faz 0 ($0 \to 1.79 \times 10^{308}\text{ g}$ arasındaki ilk tam koşu).

---

## 3. Sonuçlar ve Etki (Consequences)
- `break_eternity.js` matematik motoru, accumulator oyun döngüsü ve ses sentezleyicisi aynen korunur.
- Kod tabanındaki `matter` zaten kütle/madde anlamına geldiği için teknik omurga kırılmaz; UI ve terminoloji katmanı tam olarak yerine oturur.
- Oyuncuya atomaltı parçacıklardan tüm galaksiyi yutmaya kadar giden benzersiz bir doyum ve güç fantezisi sağlanır.
