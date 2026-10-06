# ADR-0040: Modern Minimalist Kuantum-Kozmik HUD & Anti-Slop UI/UX Dönüşümü

- **Tarih:** 2026-10-06
- **Durum:** Kabul Edildi (Accepted)
- **Kapsam:** UI/UX Tasarım Sistemi, HUD Mimarisi, Tematik Bütünlük, Bileşen Görsel Dili

---

## 1. Bağlam ve Sorun (Context & Problem)
Önceki prototiplerden kalan ve "AI slop" hissi yaratan unsurlar oyunda ciddi görsel ve kavramsal çelişkilere yol açıyordu:
1. **Tema Kalıntıları:** Oyun tematik olarak *UROBOROS: The Cosmic Feast* (kuantum mikrodünyasından Samanyolu'nu yutan tekilliğe) geçiş yapmış olmasına rağmen, arayüzde hala eski telefon video ("Doomscroll / Reels") temasına ait öğeler mevcuttu:
   - Yağlı telefon başparmak izi lekesi ve çatlak ekran camı (`ScreenOverlay.vue`),
   - Çift dokunmada ekrana fırlayan pembe TikTok kalpleri (`HeartBurstLayer.vue`),
   - Üst barda telefon pili "%3 (Düşük Güç Modu)" widget'ı (`Header.vue`),
   - "CANLI REELS SOHBETİ" adıyla çalışan sosyal medya yorum bandı (`CommentTicker.vue`),
   - Boyut satırlarında 9:16 telefon video posterleri ve mini video oynatma çubukları (`DimensionRow.vue`),
   - Çok renkli, cırtlak degrade (mor-pembe-sarı gradient) hap butonlar (`FloatingThumbBar.vue`).
2. **AI Slop Belirtileri (Visual Clutter):**
   - Her kartta, butonda ve rozette farklı neon gradyanlar, aşırı gölgeler ve dağınık görsel hiyerarşi,
   - Aynı anda ekranda yarışan 4-5 farklı ilerleme çubuğu ve hedef rozeti,
   - Tipografik hiyerarşi eksikliği ve bilgi kirliliği.

---

## 2. Karar (Decision)

Arayüz bütünüyle modern, minimalist, yüksek kaliteli bir **"Kuantum-Kozmik Gözlemevi HUD" (Cosmic Singularity HUD)** tasarım sistemine dönüştürülmüştür:

1. **Renk ve Yüzey Dili (Obsidian Singularity):**
   - Derin uzay zeminleri (`#05070f`, `#08090d`),
   - Yarı saydam obsidian HUD yüzeyleri (`rgba(13, 17, 26, 0.75)`),
   - 1px crisp mikro-kenarlıklar (`rgba(255, 255, 255, 0.08)`) ve üst kenar 1px ışık vurgusu,
   - Cırtlak gökkuşağı gradyanları kaldırılarak semantik aksan hiyerarşisi uygulandı:
     - **Kuantum Mavisi (`#00f0ff` / `#38bdf8`):** Kuantum operasyonları, Çekim Hızı (Hz), aktif telemetri,
     - **Tekillik Altını (`#f59e0b` / `#fbbf24`):** Kozmik Çöküş, prestij eşikleri, galaktik kilometre taşları,
     - **Yerçekimi Moru (`#a855f7`):** Boyut katmanları ve Ölçek Sıçramaları,
     - **Hawking Korusu / Tehlike (`#f43f5e`):** Kozmik dalgalanmalar, parazitler ve krizler,
     - **Nöral Zümrüt (`#10b981`):** Laboratuvar sentezi ve rezonans artışları.

2. **Telefon Kalıntılarının Temizlenmesi ve Bilimsel Yeniden Doğuş:**
   - `ScreenOverlay.vue`: Yağlı parmak izi ve çatlak telefon camı kaldırıldı; yerini kozmik yerçekimsel merceklenme ve mikro-parçacık ufkuna bıraktı.
   - `HeartBurstLayer.vue`: Pembe kalpler yerine **Kuantum Rezonans Halkaları (Gravitational Shockwaves)** oluşturuldu.
   - `CommentTicker.vue`: Sosyal medya sohbeti yerine **Kozmik Gözlem & Telemetri Kayıtları (Cosmic Observatory Log)** yapısına evrildi.
   - `Header.vue`: Telefon pili kaldırıldı; yerini **Tekillik Kararlılığı / Kozmik Yoğunluk** telemetrisi aldı.
   - `DimensionRow.vue`: 9:16 telefon posteri yerine metrik Planck-ölçek rozetleri (`10⁻⁹ m`, `10⁻¹² m` ... `10²¹ m`) ve tertemiz tabular hiyerarşi yerleştirildi.
   - `FloatingThumbBar.vue`: Mor-pembe gradient yerine minimalist, taktil mekanik cam HUD dock'u getirildi.

3. **Tipografi ve Taktil Ergonomi:**
   - Tüm sayısal veriler için sabit genişlikli `JetBrains Mono` / `tabular-nums`,
   - Başlık ve metinler için keskin `Inter`,
   - Apple HIG 44px dokunma hedefleri ve WCAG AA kontrast standartları korunarak görsel gürültü minimize edildi.

---

## 3. Sonuçlar (Consequences)
- Oyunun "AI tarafından rastgele yamalanmış" görüntüsü ortadan kalktı; Linear/EVE Online düzeyinde tutarlı, şık bir hard sci-fi atmosferi sağlandı.
- Bilgi yoğunluğu artarken görsel yorgunluk ve karmaşa dramatik şekilde azaldı.
- Testler ve oyun mantığı bozulmadan korundu.
