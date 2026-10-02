# Aktif Görev (In-Progress)

## ✅ Tamamlanan: Gece Kriz Meydan Okumaları (v0.17.0 adayı, 2026-10-02)
- Faz 1 (Motor) + Faz 2 (UI) + Faz 3 (C2–C8 + denge + ADR-0015) tamamlandı. Final `npm run build`: 0 hata (1639 modül). Detay: `brain/tasks/completed.md` v0.17.0 girdisi.
- Bilinen kalıntılar: C7 dengeleyicileri, C8 ivme/baz hız ve süre-metas eşikleri simüle edilemedi — varsayılanla yayınlandı (ADR-0015'te işaretli); mobil 9-buton nav taşması gözle kontrol edilecek.

## ✅ Son tamamlanan: Kapsamlı QoL Turu P0+P1 (v0.15.0 adayı)
- Arka plan sekmesi düzeltildi (rAF durunca offline yakalama + visibilitychange kaydı), 24 saat cap'li kademeli offline simülasyon + "Tekrar hoş geldin" modalı, save yedek slotu + version migration kancası, tek onay diyaloğu (ConfirmModal), ×10/×100/Maks satın alma modları + `v-hold` basılı tut tekrarı, 1-8/M/Esc kısayolları, çarpan kırılım paneli + üretim sparkline'ı, bildirim noktası boşlukları, ayar eklemeleri.
- `npm run build`: 0 hata (1636 modül). ADR: `brain/decisions/0014-qol-pass-p0-p1.md`.

## 🔎 Araştırması tamamlanan (2026-10-02)
- **Gece Kriz Meydan Okumaları (Normal Challenges):** Codebase + internet araştırması tamamlandı, uygulama planı **v2'ye yükseltildi** → `brain/research/challenges-research-and-plan.md`. v2 yenilikleri: wiki.gg ile doğrulanmış AD tablosu + Revolution Idle Trials referansı, satır numaralı codebase denetimi (2 v1 hatası düzeltildi: 59 başarım/tempo hedefleri), C8 yeniden tasarımı (fail-state yok), offline/save kenar durumları, kademeli açılış + kademeli süre-metas. **Onay bekleniyor** — hedef sürüm v0.17.0 adayı.

## 🔜 Sıradaki adaylar (backlog'tan)
- P2 QoL kalıntıları: başarımlar için ilerleme kesri önizlemesi (ach progress fraction), olay geçmişi günlüğü ("Gece Kaydı"), achievements filtre çipleri, kilitli sekmeye mobilde dokununca gereksinim toast'ı.
- Faz 2: Kolektif Gece Nöbeti katmanı içeriği (1e4000 sonrası şu an boş).
