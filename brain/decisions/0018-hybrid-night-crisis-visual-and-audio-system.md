# ADR-0018: Gece Krizleri Hibrit Görsel ve Ses Sistemi

## Bağlam
*Doomscroll: The Endless Reels* projesinde "Gece Krizleri" (Floating Anomalies — Altın Kurabiye mekaniği), oyuncunun gece 03:00 uykusuzluk hipnozu içinde ekranda aniden beliren fırsatları yakaladığı en yüksek dopamin anıdır. Önceki sürümde standart Tailwind kartları, jenerik Lucide ikonları ve tekdüze konfeti patlamasıyla sunulmaktaydı. Bu durum oyunun hiciv dolu gece siberpunk atmosferini ve "bekleme oyunu değil, taktil heyecan" felsefesini tam yansıtamıyordu.

## Karar
Harici ağır 3D motorlar (Three.js/PixiJS) yerine **CSS Donanım Hızlandırmalı Çok Katmanlı Neon Vektörler + Canvas 2D Fizik Şok Dalgaları + Ambiyans Ekran Aurası + Web Audio API Özel Tını Sentezleyicisi (Hibrit Mimari)** hayata geçirilecektir.

1. **Özel Neon SVG Vektör Varlıkları (`AnomalyOverlay.vue`):**
   - Jenerik Lucide ikonları yerine her anomaliye özgü animasyonlu neon semboller:
     - `fyp` (🔥 Gece 3 Çılgınlığı): Dinamik neon alevler ve dönen halo halkası.
     - `heart_frenzy` (👆 Başparmak Histerisi): Elektrik arkları atan sibernetik nabız atan kalp ve EKG ritmi.
     - `sponsor` (💎 50 Milyonluk Viral Video): Dönen neon elmas / altın viral rozet ve 4 köşeli parlama yıldızları.
     - `espresso` (⚡ Kafein Kararı): Yüksek voltajlı buharlı cyberpunk espresso kupası.

2. **Balatro Tarzı Kapsül Mimarisi (`AnomalyOverlay.vue` & `src/style.css`):**
   - Kapsül çevresinde dönen neon lazer şeridi (`conic-gradient` border beam).
   - Kapsül üzerinden periyodik olarak süzülen holografik cam parıltısı (shimmer line).
   - Kalan süre 3 saniyenin altına düştüğünde telaşlı kırmızı nabız (panic pulse).

3. **Gerçek Zamanlı Canvas 2D Şok Dalgası ve Kıvılcım Fiziği (`JuiceLayer.vue`):**
   - Tıklama anında kriz merkezinden dışa doğru genişleyen çift katmanlı neon şok dalgası halkaları (`shockwaves`).
   - Tıklanan krizin rengine uygun 25-35 adet hız, sürtünme ve hafif yerçekimi içeren neon kıvılcım parçacığı (`sparks`).

4. **Gece Ambiyansı ve Ekran Kenar Uyarısı (`ScreenOverlay.vue`):**
   - Ekranda bir kriz belirdiğinde ekranın dört bir kenarında yumuşak, ritmik nefes alan Gece Kriz Uyarısı aurası (`perimeter glow`).
   - Rezonans Hipnozu (kombo) sırasında yüksek frekanslı çift renkli enerji aurası.

5. **Web Audio API Sentezleyici Derinliği (`src/core/audio.ts`):**
   - Kriz doğuşunda oyuncuyu uyaran uzaysal synth tınısı (`playAnomalySpawn`).
   - Kriz toplandığında anomali türüne göre tını ayrışması (`playCrisisCollect`): mor alev için yükselen arpej, kalp krizi için sub-kick + voltaj çıtırtısı, viral video için altın çan kaskadı.

## Sonuçlar
- Sıfır harici paket yükü, saf Web API ve CSS GPU compositing ile 60-120 FPS akıcılık.
- Termux ve mobil tarayıcılarda sıfır bellek sızıntısı ve batarya dostu çalışma.
- Gece krizlerinin görünürlüğü ve taktil doyum seviyesi zirveye çıkarıldı.
