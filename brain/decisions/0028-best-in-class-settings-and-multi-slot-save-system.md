# ADR 0028: En İyi Sistem Ayarları Mimarisi ve Çoklu Kayıt Slotları (v0.22.0)

## Durum
Kabul Edildi (Accepted) & Canlı Doğrulandı (Verified via Playwright & TypeScript)

## Tarih
2026-10-03

## Karar Özeti ve Arka Plan
Kullanıcının *"sistem ayarları kısmını en iyi hale getir internetten araştırma yap"* talebi doğrultusunda; modern incremental oyunlar (*Cookie Clicker*, *Antimatter Dimensions*, *Synergism*, *Revolution Idle*) ve Reddit topluluk best practice'leri iki aşamalı derin araştırmayla (*Search + Mandatory Live WebFetch*) incelendi.

Mevcut tek uzun dikey kaydırma listesi yerine; Bento Grid & Tabbed mimarisi, 3 bağımsız kayıt slotu, otomatik yedekten tek tıkla kurtarma, akıllı kayıt denetleme (inspect & validation preview), güvenli fail-safe hard reset (RESET input onaylı), pil/düşük GPU tasarruf modu ve zenginleştirilmiş QoL kontrolleri sisteme entegre edildi.

## Yapılan Değişiklikler ve Mimari Bileşenler

1. **Çoklu Kayıt Slotları (Multi-Slot Architecture — `src/core/save.ts` & `src/stores/game.ts`):**
   - 3 bağımsız kayıt slotu (`DOOMSCROLL_SAVE_V1` / `DOOMSCROLL_SAVE_SLOT_2` / `DOOMSCROLL_SAVE_SLOT_3`).
   - Slot 1 eski kayıtlarla %100 geriye dönük uyumlu bırakıldı.
   - Her slot için anlık özet meta verisi (`SaveSlotMeta`: dopamin, çöküş sayısı, süre, zaman damgası).
   - Slotlar arası geçiş (`switchSaveSlot`), slot klonlama/kopyalama (`copySaveSlot`), slot temizleme.
   - Periyodik 1 dakikalık otomatik rotasyon yedeği (`DOOMSCROLL_SAVE_V1_BAK`) ve arayüzden tek tıkla geri yükleme (`restoreFromBackup`).

2. **Kayıt Güvenliği ve Doğrulama (Sanity Inspection & Fail-Safe):**
   - `inspectSaveString`: Yapıştırılan veya seçilen `.txt` dosyasını içe aktarmadan önce doğrular, içindeki dopamin, çöküş, süre ve sürüm özetini yeşil rozetle önizler. Bozuk kayıtları önceden yakalar.
   - Güvenli Hard Reset: Kazara sıfırlamaları önlemek için input kutusuna `RESET` yazılmasını şart koşar.

3. **Genişletilmiş Sistem & Performans QoL (`src/models/types.ts`):**
   - `decimalPlaces`: Sayı gösteriminde 2 basamak (`1.23e45`) vs 3 basamak (`1.234e45`) hassasiyeti.
   - `batterySaver`: Pil ve düşük GPU tasarruf modu; neon blur, ağır gölgeler ve ağır arka plan hesaplamalarını kapatır.
   - `floatingTexts`: Tıklama ve kriz uçan metinlerini (+Dopamin) aç/kapa.
   - `newsTickerEnabled`: Satirik Reels haber bandını aç/kapa.
   - `offlineProgressModal`: Açılışta çevrimdışı ilerleme karşılama modalını aç/kapa.
   - `hotkeysEnabled`: Klavye kısayollarını (1-9, M vb.) etkinleştir/devre dışı bırak.

4. **Bento Grid & Tabbed Modal Arayüzü (`src/components/SettingsModal.vue`):**
   - 5 ergonomik sekme:
     1. 🎮 **Oynanış & QoL:** Sayı Notasyonu (Standart, Bilimsel, Mühendislik, Logaritmik), Ondalık Hassasiyeti, Kritik Onaylar, Çevrimdışı Bildirimi, Kısayollar.
     2. 🎨 **Görsel & Ekran:** Pil Tasarruf Modu, Animasyon Seviyesi, Balatro Juice (Sade/Dengeli/Full Tilt), Gece 3 CRT Scanline, 3D Kart Holo Kaplamaları, Doomscroll Ekran Dokuları, Uçan Sayılar, Haber Bandı.
     3. 🎧 **Lo-Fi Radyo & SFX:** Ses Seviyesi, 4 Lo-Fi İstasyonu + Özel Stream URL, Gece Sıcaklığı (Filtre Cutoff), Akıllı Uyku Zamanlayıcısı (Fade-out), Pencerede Yağmur Mikseri, Analog Vinil Cızırtısı.
     4. 💾 **Kayıt & Slotlar:** 3 Slot Seçici Kartı (Dopamin, Çöküş, Süre özetli), Canlı Kayıt Telemetrisi ("X sn önce"), Panoya Kopyala / Dosya İndir (.txt), Dosyadan Yükle (.txt seçici) + Akıllı Doğrulama Önizlemesi, Otomatik Yedekten Kurtarma, Güvenli Hard Reset.
     5. ⌨️ **Kısayollar & Bilgi:** Kısayol Tuşları Haritası (1-9, M, Space, Esc, GODMODE), Sürüm ve mimari bilgisi.

## Doğrulama ve Test Kanıtları
- `npm run build`: 0 hata, 1657 modül başarıyla derlendi.
- `Playwright MCP`: Canlı yerel geliştirme sunucusunda modal açıldı, sekmeler arası geçişler (Oynanış, Görsel, Kayıt Slotları) tetiklendi ve accessibility snapshot ile UI ve reaktivite doğrulandı.
