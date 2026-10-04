# 0034. SP Artık Yalnızca Şafakta Kazanılır — Dekad Primi Koşu İçi Yükselişe Dönüştü

- **Tarih:** 2026-10-05
- **Durum:** Kabul edildi ve uygulandı
- **Tür:** Ekonomi, Oyun Tasarımı, Pacing
- **İlgili Belgeler:** ADR-0032 (Dekad Primleri — §F burada geçersiz kılınır), ADR-0013 (Şafak Nöbeti Botu), ADR-0009 (Özellik Merdiveni)

---

## 1. Bağlam ve Problem

ADR-0032, "tek koşuda yalnızca 1 SP kazanılıyor, 4 saat boyunca kalıcı güçlendirme yok" problemini çözmek için 13 basamaklı bir **Dekad Primi** tablosu ekledi: 1e6, 1e12, 1e20 … 1e300 eşiklerinde hayat boyu bir kez olmak üzere **toplam 72 SP** doğrudan SP bankasına yazılıyordu.

Bu, prestij (şafak) ekonomisini deldi: **hiç şafak yapmadan SP kazanmak mümkündü.** Oyuncu 1.79e308'e tırmanırken 72 SP topluyor, hiç çöküş yapmadan Nöral Ağaç'tan düğüm alabiliyordu. Bu durum:

1. **Temayı bozuyordu.** SP = Uykusuzluk Puanı; GDD'ye göre bu puan yalnızca "Sabah 06:00 Çöküşü" ile gelir. Kuş sesleri başlamadan SP gelmesi ironinin motorunu deliyor.
2. **Şafakı değersizleştiriyordu.** Prestij düğmesi "1 SP + 72 bedava" olmak yerine sadece 1 SP anlamına geliyordu; çöküş yapma motivasyonu düşüyor.
3. **Ölçüm metriğini bozuyordu.** `spPerMinute` (StatsTab'daki optimizasyon metriği) çöküş başına kazanımı gösteriyordu, oysa gerçek kazanç büyük ölçüde çöküşten bağımsızdı.

---

## 2. Karar

**SP'nin tek kaynağı şafaktır.** `singularityReset()` dışında hiçbir yol `singularityPoints`'i artırmaz (AdminPanel'in zorlama butonu hariç — bu bir geliştirici aracıdır ve normal oy akışına dokunmaz).

ADR-0032'nin pacing amacı (0 → 1e308 boyunca "bir şey açıldı" ritmi) korunur, ancak ödülün cinsi değişir:

| | Önce (ADR-0032) | Sonra (ADR-0034) |
| :--- | :--- | :--- |
| Basamak sayısı | 13 | 13 (aynı eşikler) |
| Ödül | 1–15 SP, toplam 72 SP | 0.5–7.5× koşu içi çarpan, toplam +36× |
| Ekonomik etki | **Kalıcı** (prestijlerde birikir) | **Geçici** (şafakta sıfırlanır) |
| SP'ye etki | SP bankasını doğrudan büyütür | **Yok** |

### Uygulanan değişiklikler

1. **`src/game/pacing.ts`** — `DecadeBounty`/`DECADE_BOUNTIES` yerine `DecadeSurge`/`DECADE_SURGES` (`sp: number` → `mult: number`). `totalDecadeBounty` → `totalDecadeSurgeMult`, `bountyForLog10` → `surgeForLog10`, `nextBountyForLog10` → `nextSurgeForLog10`. Adlar "Primi" → "Yükselişi".
2. **`src/stores/game.ts`**
   - Tick içindeki basamak döngüsü artık `this.singularityPoints.plus(...)` yazmaz; `this.decadeSurgeMult += s.mult` yapar.
   - Yeni koşu state alanı: `decadeSurgeMult: 1` (sayı, başlangıç 1 = yükseliş yok).
   - Çarpan `tickspeedMultiplier` içine girer → hem dopamin üretimini hem yukarı kaydırmayı hızlandırır ("Algoritma frekansı patlaması" teması).
   - `resetRunState()` çarpanı 1'e döndürür: yükseliş **şafakta** ve **meydan okuma girişinde** biter.
   - Kayıt: `SAVE_VERSION` 13 → **14**; `decadeSurgeMult` serialize edilir ve `clampSavedNumber(…, 1, 1, 1000)` ile yüklenir. v13- kayıtlarda alan yoktur → çarpan 1'den başlar (o kayıtlar SP primlerini zaten bankalarında tutar).
3. **`src/App.vue`** — "Sıradaki Dekad Primi: +N SP" rozeti amber SP renginden çıkarılıp cyan'a alınır: "Sıradaki Dekad Yükselişi: {ad} — ×N hız". Çarpan > 1 iken "Aktif ×N" rozeti görünür.
4. **`src/game/pacing.test.ts`** — yeni sözleşmeye göre güncellendi (11 test).

### Neden `tickspeedMultiplier`?

Tek yazım yolu ilkesi: çarpanı üretim hesabının içine gömmek, `matterPerSecond` raporunu, tıklama kazancını ve bot simülasyonunu elle tutmaktan daha güvenli. `getDimensionMultiplier`'ın cache anahtarı tickspeed'i içermese de yükseliş yalnızca *tick* içinde değişir, `getDimensionMultiplier` önbelleğini kirletmez (her ikisi de state'ten türetilir; önbellek anahtarı yalnızca boyut/çarpan girdilerini kapsar).

---

## 3. Bilinçli Sonuçlar (Trade-off'lar)

- **İlk koşu daha yoksul.** ADR-0032'de 1. koşu 1 + 72 = 73 SP ile Nöral Ağaç'ın ~%20'sini alabiliyordu. Artık 1. koşu **1 SP** verir; bu da yalnızca kök düğümü (`insomnia_heart`, 1 SP) demek. Ağacın tamamı (~3545 SP) 45 dekatlık SP periyoduyla yaklaşık 5–6. çöküşte dolar. Bu, kullanıcının "SP sadece şafakta" kuralının **doğrudan ve beklenen** maliyetidir; formül bilerek değiştirilmemiştir.
- **Basamaklar hayat boyu bir kez.** `claimedBounties` semantiği korundu, yani 2. ve sonraki koşularda yükseliş tekrar oluşmaz. Bu, ADR-0032 ile birebir aynıdır; orada da prim 2. koşudan itibaren gelmiyordu. Yükselişi koşu başına tekrarlamak isteyenler için `claimedBounties` koşuya özel listeye çevrilebilir (ilerideki bir ADR konusu).
- **Çevrimdışı simülasyon** yükselişleri de talep eder (döngüde `offlineSimActive` muafiyeti yoktur) ve çarpan kayda yazılır; sayfa yenilemede kaybolmaz.

## 4. Doğrulama

- `npx vitest run` → **135/135 test geçti** (5 dosya).
- `npm run build` (`vue-tsc && vite build`) → **0 tip hatası**, 1686 modül, 16.4 sn.
