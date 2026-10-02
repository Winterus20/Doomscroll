# ADR-0016: Balatro Tarzı Hibrit Görsel Mimari ve Gece Ekran Dokuları

## Bağlam
*Doomscroll: The Endless Reels*, gece uykusuzluğu ve dopamin bağımlılığı üzerine kurulu bir incremental oyundur. Oyunda taktil geri bildirim ve görsel doyum (*game juice*) kritik bir öneme sahiptir. Kullanıcılar kartlar ve başarımlar üzerinde *Balatro* oyunundakine benzer zengin kart kaplamaları (Foil, Holographic, Polychrome, Negative) ve gece 02:47 telefon bağımlılığı temasına özgü ekran dokuları (yağlı parmak izi, çatlak cam) talep etmiştir.

## Karar
Saf WebGL yerine **CSS 3D Donanım Hızlandırması + Simon Goellner Çok Katmanlı Holo/Foil Tekniği + SVG Filtreleri ve Vektör Dokuları (Hibrit Model)** kullanılacaktır.

1. **Matematik ve İnteraktivite:**
   - `src/core/tilt.ts` composable'ı (`useCardTilt`) ile `pointermove` ve dokunmatik olaylardan 3D eğilme açıları (`--tilt-x`, `--tilt-y`) ve ışık koordinatları (`--mouse-x`, `--mouse-y`) üretilecek.
   - `requestAnimationFrame` ve CSS değişkenleri kullanılarak DOM yeniden hesaplamaları (reflow) önlenecek, 60–120 FPS akıcılık sağlanacak.

2. **Dörtlü Kaplama Sınıfları (`src/style.css`):**
   - `.edition-foil`: Gümüş-mavi metalik lineer ışıma ve parlama.
   - `.edition-holo`: Simon Goellner stili prizmatik dikey spektral bantlar (`repeating-conic-gradient`), açıya duyarlı yansıma ve SVG gürültü sim dokusu.
   - `.edition-poly`: Akışkan, psikedelik gökkuşağı girdabı (`conic-gradient` + `hue-rotate` dalgası).
   - `.edition-negative`: İnvert edilmiş karanlık madde ve neon kontürler.

3. **Gece Ekran Dokuları (`JuiceLayer.vue`):**
   - Sağ alt ekranda hafif saydam yağlı başparmak izi (kaydırma yapıldıkça hafifçe canlanır).
   - Zorlu kriz meydan okumaları veya yüksek uyku baskısı anında beliren ince çatlak cam vektörü.
   - `SettingsModal.vue` içine "Ekran Dokuları" aç/kapa ayarı eklenerek performans ve kişiselleştirme garanti edilecek.

4. **Erişilebilirlik:**
   - `prefers-reduced-motion` medya sorgusu altında tüm 3D eğilmeler ve yoğun animasyonlar kapatılacaktır.

## Sonuçlar
- **Artılar:**
  - Metinler ve sayılar kristal netliğinde (DOM kalitesinde) kalır.
  - Mobil cihazlarda ve Termux/Android altında batarya ve bellek dostu.
  - AAA indie kalitesinde görsel tatmin ve oyun kimliği.
- **Eksiler / Dikkat:**
  - Eski ve düşük donanımlı mobil cihazlarda `color-dodge` blend mode bazen yavaşlayabilir; bu nedenle Ayarlar menüsünden kapatılabilirlik sağlanmıştır.
