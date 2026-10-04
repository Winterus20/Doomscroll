# ADR-0021: İlk Prestij 210dk Denge Paketi

Tarih: 2026-10-02
Durum: Uygulandı
Hedef: İlk Şafak 190-230dk, ikinci koşu patlamasız, uzun soluk + sıkmama.

## Kök nedenler
- Tickspeed `pow(1/0.01, bought)` galaksi 40+ sonrası maliyet eğrisini yeniyordu: +2.0 dex/alım vs +1.114 dex maliyet. Hz e1.7M → madde e22M. Kanıt: `src/stores/game.ts:1256`.
- Her şey ilk 10dkda açılıyordu: Bot+Vicdan 1e9 ~2dk, Lab D2x25 ~2dk, Yama 1e5 ~40sn.
- Lab 50-200x + Viral 21x, tıklama sync+kafein idle'ın 1.5x'i, Kolektif 25'te 2x bedava 6x.
- Max Galaksi1 ile ilk koşuda full otomasyon, Bulk Shift1 ile 30dkda açılıyordu.

## Kararlar
1. Tickspeed tabanı 0.01 → 0.08. Üretim/alım +1.09 dex, maliyet +1.114 dex altında kalır. Patlama kapanır, Hz hala alınır.
2. Unlock merdiveni: Yama 1e5→1e7, Yenile 1e7→1e11, Bot 1e9→1e12, Vicdan 1e9→1e11, Lab D2x25→D3x15, tohumlar birer kademe ötelendi.
3. Kolektif 25/50 → 40/75, Çözünürlük 25/50/100 → 50/100/200. İlk 5dk bedava 6x kapanır.
4. Lab: hücre 1.2-3.0→1.1-2.0, satır/sütun 1.25→1.12, mono 1.4→1.2, evergreen 2.5→1.8, viral 1.5→1.2.
5. Tıklama: sync taban %2→%1, seviye +%1.5→+%1, tavan %8→%5, kafein %5→%3, Histeri 777→300 (kombo 5439→2100). Aktif/idle %15-35 bandına iner.
6. Anomali 45sn→65sn, min 30→40. Vicdan iade 1.2→1.05, Noise 1.5→1.2 taban.
7. Bulk Shift1→Shift2, Max 1e22+G1 → 1e26+G2. Max ilk koşuda kapalı.
8. Koloni log 0.3→0.5. Lab alternatifi canlanır.

## Reddedilenler
- Shift/Galaksi isteklerini artırmak (softlock riski, ADR-0017 dersi). Maliyetler aynı kaldı.
- Shift gücü 2.0 kısmak (duvar arkası kilitli olduğu için etkisiz, dokunulmadı).
- D6-D8 baz maliyet düşürmek (210dk hedefini bozar, dokunulmadı).

## Doğrulama
- `npm run build` 0 hata, 1642 modül.
- Beklenen: 40dk Shift1, 120dk Shift4, 150dk Galaksi1, 200dk Şafak %100. Bot kapalı idle %40 yavaşlamalı.
