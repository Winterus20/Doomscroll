# ADR 0009 — Özellik Merdiveni (Progressive Feature Unlock)

**Tarih:** 2026-10-01 | **Durum:** Kabul edildi | **Sürüüm:** v0.11.2

## Bağlam
Kullanıcı talebi: "Oyundaki özellikler başlangıçta hepsi açık olmasın, sırayla (merdiven halinde) açılsın." Araştırma: `brain/research/feature-unlock-ladder-plan.md` (Cookie Clicker / Antimatter Dimensions / Synergism + idle UX literatürü). Mevcut durum: Lab 100 Dopamin (~30 sn) ve Botlar 1e4 ile çok erken açılıyor; 3 stance, Akışı Yenile, anomali doğurması, 6 yama kartı, 5 tohum ve 4 büyü kartı başlangıçta yüzümdeydi; kilitleme mantığı getter'lara dağılmıştı.

## Karar
1. **Tek kaynaklı registry** (`src/game/unlocks.ts`): `UnlockReq` discriminated union (dimBought / dopamine / shifts / galaxies / singularities / anomalies / spellsCast), `FEATURE_UNLOCKS` listesi (15 unlock, `order` alanlı), `buildUnlockContext` / `checkUnlock` / `unlockProgress` / `getFeatureById` / `nextLocked`.
2. **State'ten türetilmiş hesaplama + sticky liste:** Kilitlemeler save'ta boolean flag olarak saklanmaz; bir kez açılan özellik `unlockedFeatures: string[]` listesinde kalır (Sıçrama sıfırlamalarında yeniden kapanmaz). Eski save'larla %100 uyumlu: liste yoksa boş başlar, koşul zaten sağlanmışsa açılır — kayıp yok, migrasyon gerekmez.
3. **Kritik bug fix:** Simülasyonda `unlockedDimensionsCount` başlangıçta 4 olduğundan eski `labUnlocked`/`crisisUnlocked` getter'ları her zaman `true`ydı (Lab ve Kriz sekmesi başlangıçtan açık oluyordu). Artık bu getter'lar yalnızca `isFeatureUnlocked('lab' | 'crisis')` üzerinden üretilir.
4. **Son eşikler** (pacing simülasyonu /tmp/pace7.js ile doğrulandı — günlük oyuncu: 1.5 tıklama/sn, 2× otomatik kayıt; `dimBought` = gerçek satın alım):

| # | Özellik | Şart | Yaklaşık açılış |
|---|---|---|---|
| 1 | Gece Krizleri doğurması (`crisis_spawn`) | 1.000 Dopamin | ~16 sn |
| 2 | Algoritma Yamaları dükkanı (`patch_shop`) | 100K Dopamin | ~41 sn |
| 3 | Akışı Yenile (`refresh_feed`) | 10M Dopamin | ~1 dk 10 sn |
| 4 | Botlar sekmesi (`autobuyers`) | 1B Dopamin | ~1 dk 27 sn |
| 5 | Vicdan Azapları (`guilt_slackers`) | 1B Dopamin | ~1 dk 27 sn |
| 6 | Kriz sekmesi (`crisis`) | D4 (Subway Surfers) ×10 **satın alınan** | ~57 sn |
| 7 | Çılgın Kaydırma duruşu (`stance_spam`) | D1 ×50 **satın alınan** | ~3 dk 02 sn |
| 8 | Düşük Parlaklık duruşu (`stance_private`) | D1 ×50 **satın alınan** | ~3 dk 02 sn |
| 9 | Lab sekmesi (`lab`) | D2 (Sokak Lezzeti) ×25 **satın alınan** | ~1 dk 51 sn |
| 10 | Kaşar tohumu (`seed_cheese`) | D2 ×50 **satın alınan** | ~4-5 dk (projeksiyon) |
| 11 | Subway tohumu (`seed_subway`) | D3 ×25 **satın alınan** | ~3 dk 22 sn |
| 12 | Phonk tohumu (`seed_phonk`) | D4 ×25 **satın alınan** | ~8 dk 40 sn |
| 13 | Espresso kararı (`spell_espresso`) | 2 Gece Kararı | Kriz sekmesi sonrası |
| 14 | Kulaklık kararı (`spell_noise`) | 3 Gece Kararı | — |
| 15 | Yalan kararı (`spell_sleep`) | 4 Gece Kararı | — |

> Plan dokümündeki ilk öneri (Botlar 1e5, Kriz D4×25) pacing simülasyonuyla revize edildi: 1e5→1e6 (Botlar 1.6 dk'ta, ilk bot D1 ile anlamlı hale geldiği kademe), D4×25→D4×10 (22 dk yerine 2.1 dk — Kriz sekmesi Lab'den önce açılmalı).

> **v0.11.1 pacing revizyonu (2026-10-01):** Kullanıcı geri bildirimi ("bir şeyin açılması veya alınması çok kolay, biraz daha uzun tut") üzerine: **(a) kritik bug düzeltmesi** — `dimBought` kontrolleri `dim.amount` (üretimle kendiliğinden büyür) yerine `dim.bought` (gerçek satın alım) üzerinden; eski haliyle D1×50 duruşu max-all simülasyonunda ~13 sn'de açılıyordu (Cookie Clicker'ın 'own N buildings' tasarımıyla aynı anlam). **(b) Dopamin eşikleri yukarı çekildi:** Kriz 100→1e3 · Yamalar 500→1e5 · Yenile 1e3→1e7 · Botlar & Azaplar 1e6→1e9. Referans ölçütleri: Cookie Clicker ilk 5 dakikada 2-3 bina (yükseltmeler sahiplik 1/5/15/25 eşiklerinde), Antimatter Dimensions ilk Dimension Boost speedrun'da bile ~19 dk, idle UX kuralı (katman başına 1-2 yeni şey, ilk 5 dakikada 3-5 açılış, ilk büyük sekme 3-5 dk). Merdiven şekli korundu; yalnızca basamak yükseklikleri değişti — ilk 5 dakikada ~7 açılış, ilk büyük sekme (Kriz) ~1 dk, Lab ~2 dk, Stance'lar ~3 dk.

> **v0.11.2 yama fiyat senkronizasyonu (2026-10-01):** `patch_shop` kilidi 100K Dopamin'e yükseltildikten sonra dükkanın iç fiyatları eski kaldığı için açılış anında ilk 3 yama (500 / 2.5K / 25K) hepsi birden ucuzdu — Cookie Clicker ritmine göre yükseltme açılış anında gelirin anlamlı bir kesarına mal olması gerekir. `ALGORITHM_UPGRADES` fiyatları senkronize edildi: **1e5 / 1e6 / 1e7** (ilk yama, kilitle aynı anda afford edilebilir = anlamlı ilk karar). Basamak çakışmasını önlemek için 4. yama 1e6→**1e8**, 5. yama 1e8→**1e9** (yeni merdiven: 1e5 → 1e6 → 1e7 → 1e8 → 1e9 → 1e11). Save uyumlu: fiyatlar live def'ten okunur, `algorithmUpgrades` yalnızca id listesi olarak serileşir — migrasyon yok.

## UI
- `LockedFeature.vue` (yeni): 🔒 + özellik adı + şart metni + current/target + slate ilerleme çubuğu (`progress-fill-slate`), `v-tip` ile tooltip.
- App.vue: nav altında "Sonraki Açılacak" bandı (`nextLocked` + `unlockProgress`).
- Header.vue: Çılgın / Düşük Parlaklık butonları kilitliyse devre dışı + kilit ikonu + "(current/target)" tooltip.
- LabTab / CrisisTab / DimensionsTab: kilitli tohum/büyü/yama kartları `LockedFeature` olarak render; kilitli tohum eklenemez, kilitli büyü cast edilemez.

## Neden registry + türetilmiş hesaplama?
Kilitleme koşulları state'ten hesaplandığı için: (a) tek kaynak — getter dağınıklığı biter; (b) eski save'larla sonsuz uyum — koşul sağlanmışsa özellik otomatik açılır, flag yazma/okuma çift yönlü migrasyon gerekmez; (c) offline simülasyonu `update()` üzerinden geçtiği için uzun oturumlarda kilitlemeler doğru açılır (`syncUnlocks` her update başında çalışır).

## Sonuçlar
- Yeni dosyalar: `src/game/unlocks.ts`, `src/components/LockedFeature.vue`
- Değişen: `types.ts` (`SerializedPlayerState.unlockedFeatures?`), `game.ts` (state + 3 getter + `syncUnlocks` + update döngüsü + serialize/deserialize), `App.vue`, `Header.vue`, `LabTab.vue`, `CrisisTab.vue`, `DimensionsTab.vue`, `style.css` (`progress-fill-slate`)
- Doğrulama: `npm run build` (`vue-tsc && vite build`) **sıfır hata** (1629 modül, JS 417.39 kB / gzip 115.97 kB). İlk derleme 6 TS hatası (formatNumber argüman sırası + `string | null` prop) düzeltildi.
