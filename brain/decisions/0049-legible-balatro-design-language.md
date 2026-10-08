# ADR-0049: Okunaklı Balatro Tasarım Dili

- **Tarih:** 2026-10-08
- **Durum:** Kabul Edildi (Accepted)
- **Kapsam:** Genel tasarım dili, renk disiplini, efekt bütçesi, tipografi ve dil tonu
- **Öncel:** ADR-0040 (Modern Minimalist HUD) üzerine ek karar

---

## 1. Bağlam

Kullanıcı ile yapılan UI/UX incelemesinde mevcut dilin "neon casino HUD" hissi verdiği, ancak tamamen steril minimalizmin de oyunun ruhunu (oburluk, tekillik, Balatro punch) öldüreceği konuşuldu. Kullanıcı tercihleri:

1. Arka plan hareketliliği seviliyor (yavaş AlgorithmicSwirl korunacak).
2. Biraz Balatro havası isteniyor ama okunaklık öncelikli.
3. Efekt dozunda olsun.
4. Bilgilendirici yerlerde sakin dil, lezzet yerlerinde gamer / mizahi / ironik / kara mizah tonu.
5. Renk disiplini için karar tasarımcıya bırakıldı.

## 2. Karar: Okunaklı Balatro

Zemin sakin ve profesyonel, anlar Balatro. Dört bağlayıcı kural:

### Kural 1 — Zemin sakin, kart karakterli
- `AlgorithmicSwirl` yavaş hareket korunur, her zaman açık kalır. Bu karara istisnadır.
- Karakter sadece kartlarda yaşar: Shift `foil`, Galaxy `poly`, D8 `negative`.
- D1-D7 satırları nötr ve sakindir. Sayaçta sürekli nabız (`rate-warm/hot/supernova`, `flame-text`) kapalıdır. Sadece olay anında `count-pop` ve `decade-flash` çalışır.

### Kural 2 — Semantik 5 renk
- Mor = kütle / ilerleme, Cyan = Hz / sinyal, Amber = prestij / tekillik, Emerald = onay / hasat, Rose = risk / parazit.
- 8 tier gökkuşağı kaldırılır. D1-D7 nötr gri, sadece D8 ve prestij kartları renkli.
- Gerekçe: 8 renk aynı ekranda vurguyu öldürüyordu.

### Kural 3 — Dozunda efekt
- Aynı anda en fazla 1 ambient (Swirl) + 1 aksiyon efekti.
- Kalır: `buy-bounce`, `count-pop`, `shake-soft`, tilt (sadece prestij kartlarında).
- Kısılır/kaldırılır: sürekli `sheen` süpürme, `disco-mode`, `rainbow-text`, sayaçta sonsuz nabız, `confetti` (sadece 10 dekadda bir).

### Kural 4 — Çift ton dil ve tipografi
- Bilgilendirici yerler sakin: fiyat, çarpan, hedef, ayarlar. `Inter`, sakin fiil (`Yut`, `Besle`, `Başlat`).
- Lezzet yerleri gamer + kara mizah: ticker, anomali, achievement, parazit isimleri. Burada `YUT!`, emoji, ironi serbest.
- Font: `Inter` tüm metin, `Mono` sadece sayı, `Chakra Petch` sadece ana sayaç. Buton etiketleri monodan çıkar.
- Minimum metin boyu 11px. 9px kullanımları büyütülür.

## 3. Sonuçlar

- Bu karar tüm gelecek UI işlerinde referans alınır. Yeni efekt veya renk eklenmeden önce bu dosyaya bakılır.
- P0 uygulama: tier nötrleme + sayaç nabzı kapatma + 9px büyütme + buton fontu.
- P1 adayları: sheen/disco kısma, emoji->lucide, Lab akordeon, mobil tek bar.
