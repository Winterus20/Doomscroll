# ADR-0014: Kapsamlı QoL Turu (P0 + P1) — Çevrimdışı Yakalama, Onay Diyaloğu, Satın Alma Modları

**Tarih:** 2026-10-01
**Durum:** Kabul edildi
**Öncül:** Üç paralel denetim — UI/UX kod denetimi, çekirdek sistem kod denetimi ve idle oyun QoL literatürü web araştırması (Antimatter Dimensions, Cookie Clicker, Revolution Idle, IdleKit desenleri).

## Bağlam

İçerik kuruması öncelikli sorun olarak görüldü; kullanıcı P0+P1 QoL paketinin tamamını seçti. Denetimlerdeki en kritik bulgu: sekme arka plana alınınca `requestAnimationFrame` duruyor, delta 1000 ms ile sınırlıydı ve offline catch-up dalı **ölü koddı** — idle oyun arka plan sekmesinde hiç üretmiyordu.

## Kararlar

1. **Arka plan yakalama (`game-loop.ts`):** ham delta 5 sn'yi aşarsa `simulateOfflineProgress`'a devredilir (24 saat cap); `visibilitychange` ile gizlenen sekme anında kaydeder; negatif delta (saat sıçraması) yok sayılır.
2. **Kademeli offline simülasyon (`game.ts`):** ilk 5 dk 0.1 sn adım, 1 saate kadar 1 sn adım, sonrası 10 sn adım — tek dev delta'nın üstel boyut zincirini aşağılaması engellendi. Ses/konfeti `offlineSimActive` ile bastırılır, başarım kontrolü 120 adımda bir seyreltilir. `OfflineReport` → "Tekrar hoş geldin" modalı (`WelcomeBackModal.vue`).
3. **Save sağlamlığı (`save.ts`):** yedek slot (`DOOMSCROLL_SAVE_V1_BAK`, ~1 dk'da bir rotasyon), üç kademeli yükleme (ana → yedek → legacy), `loadDetailed()` meta döndürür, bozuk kayıt silinmez. `deserialize`'ta `version` okuyan sıralı migration kancası açıldı.
4. **Tek onay diyaloğu (`ConfirmModal.vue`):** native `confirm()` kaldırıldı; Singularity (3 farklı buton), Power Nap ve Önbellek Silme tek bileşene bağlandı. `settings.confirmDialogs` ile kapatılabilir.
5. **Satın alma modları:** ×10 paket / ×100 (geometrik seri maliyet, `getDimensionPackCost`) / Maks; `buyAmount` save'e yazılır (v10). Basılı tut tekrarı `v-hold` direktifi (`core/hold.ts`): 400 ms gecikme + 100 ms aralık.
6. **Kısayollar:** 1-8 sekme, M = Max All, Esc = modal kapat (input odaklıyken devre dışı).
7. **Bilgilendirme:** Stats'ta çarpan kırılım paneli (`multiplierBreakdown`) + 10 dakikalık üretim sparkline'ı (`dpsHistory`, 600 örnek); Şafak noktası (alınabilir Nöral düğüm), Botlar noktası (alınabilir kilitli bot); `alert()` yerine inline durum; import iki adımlı onaya bağlandı; maxAll/buyMax döngülerine 500 paket güvenlik üst sınırı; anomali spawn aralığı mobil güvenliğine çekildi.

## Reddedilen alternatifler

- **×1 satın alma modu:** maliyet 10'luk paket başına büyüdüğünden ekonomik olarak anlamsız — ×100 seçildi.
- **Otomasyonu challenge arkasına kilitleme:** web araştırmasında oyuncu kaybının 1 numaralı sebebi olarak bulundu; gelecekteki Challenges tasarımında otomasyon kalıcı ödül olarak verilecek.

## Sonuçlar

- Save payload v10 (opsiyonel alanlar — migrasyon gerektirmez).
- `npm run build`: 0 hata (1636 modül).
