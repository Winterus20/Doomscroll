# ADR-0038: Balatro Sütun 2: "Reels Vuruşu" Sıralı Nedensellik (Sequential Triggering)

## Durum
Kabul Edildi & Uygulandı (v0.28.0)

## Bağlam
`brain/research/balatro-uiux-synthesis-roadmap.md` belgesindeki 5 büyük Balatro sentez sütunundan 2.'si olan **Sıralı Nedensellik (Sequential Triggering)** mekanizması, oyunun en temel etkileşimi olan manuel kaydırmanın (Swipe Up / Spacebar) tek karede kuru bir sayı olarak belirmesi sorununu çözmeyi hedefler.

Mevcut sistemde oyuncu tıkladığında tek bir sayı (`+1.45e4`) fırlamakta; Çılgın Kaydırma (4x), hızlı kombolar, D1-D8 istasyon sinerjileri ve 777x Histeri patlamaları görsel ve işitsel olarak algılanamamaktaydı.

Balatro'nun ödüllü tasarım formülü; skorun soldan sağa sırayla patlayarak katlandığı, her basamakta yarımşar ton yükselen müzikal bir arpejin çaldığı ve finalde tok bir bas tokmağıyla dopamin havuzuna döküldüğü pedagojik ve hipnotik bir geri bildirim döngüsüdür.

## Karar
1. **Çift Hızlı Sıralı Nedensellik (Dual-Speed Architecture):**
   - **Tier A (Mikro-Sıralı Kaskad):** Manuel kaydırmada non-blocking (state anında güncellenir), 180-240ms içinde soldan sağa fırlayan 3-5 basamaklı Balatro rozet patlaması (`Taban [Mavi] ➜ Sinerji [Yeşil] ➜ Duruş/Kombo [Kırmızı] ➜ CRIT [Altın] ➜ SLAM! [Kozmik]`).
   - **Tier B (Makro-Sıralı Sıçrama):** Akış Sıçraması (Shift) veya Galaksi alındığında ekranın ortasında açılan ve D1-D8 formatlarının sırayla çan sesleriyle parladığı sinematik Balatro barı (`doomscroll:macro-surge`).
   - **Tier C (Anti-Lag Coalescing Engine):** Hızlı spam tıklamalarda (4+ tık/sn) önceki rozet gruplarını havada birleştirip yukarı iterek FPS'yi 60'ta sabit tutma ve ekran kirliliğini önleme.
2. **Web Audio Polifonik Lydian Arpej Sentezleyicisi (`src/core/audio.ts`):**
   - C4 (261.6 Hz), E4 (329.6 Hz), G4 (392.0 Hz), C5 (523.2 Hz) notaları ve finalde 65 Hz -> 35 Hz frekans kaymalı tok mekanik sub-bass tokmağı.
   - Hızlı ardışık vuruşlarda pitch-ramping tırmanışı (1.0x -> 1.5x).
3. **Erişilebilirlik ve Ayarlar:**
   - `reduceAnimations` veya `batterySaver` açıkken otomatik tek rozetlik kompakt moda düşüş.
   - Ayarlar modalında (Görsel sekmesi) *"Sıralı Reels Vuruşu (Balatro Pop-Chain)"* toggle anahtarı.

## Sonuçlar ve Doğrulama
- `npm run build`: 0 hata, 1692 modül başarıyla derlendi.
- `npx vitest run`: 162/162 test yeşil (%100 geçti).
- Playwright canlı tarayıcı testiyle manuel kaydırma buton tıklaması, Space tuşu ve Ayarlar modalındaki anahtar doğrulandı.
