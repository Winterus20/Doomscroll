# ADR-0042: Mobil Yatay Jest ile Alt Menü/Sekme Gezinimi (Horizontal Swipe Tab Navigation)

## Durum
Kabul Edildi (Accepted)

## Tarih
2026-10-06

## Bağlam ve Problem Tanımı
Kullanıcı, mobilde ekran üzerinde sağa ve sola kaydırma yaparak alt menüler/sekmeler arasında geçiş yapılabilmesini talep etti:
*"birde mobilde saga sola kaydirinca bu alttaki menuler arasinda gecis yapabilelim"*

Masaüstünde 1-9 klavye kısayolları ve doğrudan buton tıklamaları yeterliyken, mobil cihazlarda oyuncunun tek eliyle (başparmakla) geniş bir sekme dizisinde (`Katmanlar`, `Lab`, `Kriz`, `Botlar`, `Koloni`, `Tekillik`, `Meydan`, `Plaket`, `Rapor`) gezinebilmesi için yatay fiske/kaydırma jesti (Horizontal Swipe Navigation) modern mobil uygulamaların (Twitter, Telegram vb.) standart ergonomisidir.

## Kararlar ve Teknik Kısıtlar

1. **Yalnızca Kilitsiz/Erişilebilir Sekmeler Arasında Dolaşım:**
   - Sekme dizisi `TAB_ORDER` filtrelenerek o anda kilitli olmayan sekmeler (`availableTabs = TAB_ORDER.filter(id => !tabLocked.value[id])`) bulunur.
   - Sola kaydırıldığında (`Swipe Left` - parmak sola gider, içerik sağdan gelir): bir sonraki sekme seçilir.
   - Sağa kaydırıldığında (`Swipe Right` - parmak sağa gider, içerik soldan gelir): bir önceki sekme seçilir.
   - Listenin başına veya sonuna ulaşıldığında taşma engellenir (döngüsel veya sınırda durma; sınırda durma tercih edildi).

2. **Dikey Sayfa Kaydırması (Vertical Scroll) ile Çakışmanın %100 Engellenmesi:**
   - Yatay jest yalnızca şu katı şartlar sağlandığında tetiklenir:
     - `absX > absY * 1.5` (Yatay eksen hareketi, dikey eksenden en az 1.5 kat baskın olmalı).
     - `absX >= 48px` (En az 48 piksellik bilinçli başparmak kaydırması).
     - `duration <= 400ms` ve `absX / duration >= 0.22 px/ms` (Kasıtlı fiske hızı).
     - `Math.abs(currentScrollY - startScrollY) <= 12px` (Kullanıcı dikeyde sayfayı kaydırmışsa yatay jest ASLA tetiklenmez).

3. **İnteraktif Eleman ve Modal İzolasyonu:**
   - Dokunma başlangıç veya bitiş hedefi:
     - Açık modallar (`.modal`, `SettingsModal`, `AuthModal` vb.)
     - Alt gezinme çubuğunun kendisi (`navRef` — butonlar zaten yatay kaydırılabiliyor)
     - Yatay kaydırılabilir iç tablolar (`.overflow-x-auto`) veya menzil sürgüleri (`input[type="range"]`)
     üzerinde ise jest tetiklenmez.

4. **Taktil Geri Bildirim ve Alt Dock Senkronizasyonu:**
   - Sekme değiştiğinde `sounds.playHapticTap()` sesi ve `navigator.vibrate(12)` dokunsal titreşimi verilir.
   - Alttaki gezinme dock'u (`navRef`) yeni aktif sekmeyi otomatik olarak ekranın ortasına kaydırır (`scrollActiveTabIntoView`).

## Doğrulama
- Vitest birim testleri (162/162).
- `vue-tsc` katı TypeScript tip denetimi ve Vite production bundle testi.
