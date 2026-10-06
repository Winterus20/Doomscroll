# 0046. Ölçek Sıçraması ve Kozmik Galaksiler Matematiksel & Terminolojik Düzenlemesi

- **Tarih:** 2026-10-06
- **Durum:** Kabul edildi ve uygulandı (v0.30.1)
- **Tür:** Matematik Motoru, Denge, Arayüz & UX Berraklığı
- **İlgili Belgeler:** ADR-0023, ADR-0025, ADR-0033, ADR-0035, ADR-0039

---

## 1. Bağlam ve Tespit Edilen Pürüzler

Kapsamlı matematik denetimi sonucunda 3 temel problem tespit edildi:

1. **Shift 5 $\to$ 6 Gereksinim Süreksizliği:**
   - Erken sıçramalar D3 $\to$ D8 arasında $10 \to 10 \to 15 \to 25 \to 25 \to 25$ D8 şeklinde ilerliyordu.
   - 6. sıçramaya ulaşıldığında (`shifts >= 6`) formül `22 + 16 * (shifts - 6)` olarak kurgulandığından, gereksinim **25'ten 22'ye geriliyordu**.
   - Bu durum matematiksel merdivende hafif bir kırılma ve yapay bir gevşeme yaratıyordu.

2. **Terminoloji Çakışması:**
   - Boyutlar sekmesindeki Galaksi kartı "Kozmik Çöküş", butonu "Çöküş Yap" olarak etiketlenmişti.
   - Ancak oyunun ana prestiji olan $1.79 \times 10^{308}\text{ g}$ eşiği de "Kozmik Çöküş / Tekillik Çöküşü" adını taşıyordu. Oyuncu için iki kavram birbirine karışıyordu.

3. **Yanıltıcı UI Bildirimi:**
   - Galaksi alımında çıkan bildirim `-%X FREKANS MALİYETİ` yazıyordu. Oysa kodda galaksiler maliyeti indirmiyor; frekansın ivme çarpanını (`1 / BaseReduction`) üssel olarak katlıyordu.

---

## 2. Kararlar ve Uygulanan Değişiklikler

1. **Monoton Artan Pürüzsüz Sıçrama Merdiveni:**
   - `shiftRequirement` içinde taban 22 yerine **26** olarak belirlendi:
     $$\text{amount} = \lfloor (26 + 16 \times (\text{dimensionShifts} - 6)) \times \text{shiftMult} \rfloor$$
   - Böylece D8 gereksinimi: Shift 5 (25) $\to$ Shift 6 (26) $\to$ Shift 7 (42) $\to$ Shift 8 (58) şeklinde kusursuz ve monoton artışa kavuştu.

2. **Arayüz ve Terminoloji Berraklığı:**
   - Boyutlar sekmesindeki kartın adı **"Kozmik Küme"** (veya Kozmik Galaksi), butonu **"Küme Yarat"** olarak güncellendi.
   - $1.79 \times 10^{308}\text{ g}$ büyük prestiji ise **"Kozmik Tekillik Çöküşü"** olarak muhafaza edildi.

3. **Doğrulanmış Gerçek Metrik Bildirimleri:**
   - Sıçrama bildirimi `ÖLÇEK SIÇRAMASI #X` olarak senkronize edildi.
   - Galaksi bildirimi `KOZMİK GALAKSİ KÜMESİ #X` ve `×X.XX TABAN FREKANS GÜCÜ` olarak gerçek matematiksel formüle bağlandı.
   - Telemetri satırı "Kozmik Galaksi Kümeleri (Güçlendirilmiş Frekans İvmesi)" olarak güncellendi.

---

## 3. Doğrulama

- `npx vitest run` $\to$ **188/188 test yeşil** (10 test dosyası).
- `npm run build` (`vue-tsc && vite build`) $\to$ **0 hata**, temiz production derlemesi.
