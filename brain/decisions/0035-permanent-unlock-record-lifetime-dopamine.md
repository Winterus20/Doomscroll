# ADR 0035 — Açılış Bir Olaydır, Kapı Değil (Kalıcı Açılış Kaydı)

**Tarih:** 2026-10-06 | **Durum:** Kabul edildi | **Sürüm:** v0.27.1 (kayıt şeması v15)
**İlgili:** ADR-0009 (Özellik Merdiveni), ADR-0032 (dekad omurgası), ADR-0034 (koşu içi Dekad Yükselişi)

## Bağlam — kullanıcı raporu

> *"bir özellik açıldığında ben eğer akış sıçraması veya akış kümesi alırsam dopamin sıfırlandığından açılan şey görünmez oluyor"*

Özellik Merdiveni'nin 16 basamağının 15'i bir **dopamin eşiğine** bağlı
(`src/game/unlocks.ts` → `FEATURE_UNLOCKS`, `req.kind === 'dopamine'`):
Gece Krizleri 1e3 · Otomatik Botlar 1e12 · Çılgın Kaydırma 1e14 · Düşük Parlaklık 1e18 ·
Nöral İzleme Kolonisi 1e22 · Kriz Yönetimi 1e28 · Espresso/Kulaklık/Yalan 1e34/1e42/1e52 ·
Algoritma Laboratuvarı 1e65 · Kaşar/Subway/Phonk tohumları 1e80/1e100/1e125 ·
Vicdan Azapları 1e160 · Kolektif Gece Nöbeti 1e308.

### Kök neden

ADR-0009 kilitlemeleri `state`'ten **türetmiş** ve "yapışkan liste"ye (`unlockedFeatures`)
güvenmişti. Ancak **kapının kendisi koşu içi sayaca bakıyordu**:

1. `src/game/unlocks.ts` → `checkUnlock()`, `dopamine` dalı:
   `ctx.matter.gte(new Decimal(req.amount))`
2. `buildUnlockContext()` `state.matter`'i **doğrudan** bağlam kopyalıyordu.
3. `matter` ise bir **koşu** sayacı: `dimensionShift()`, `buyGalaxy()` ve
   `resetRunState()` (şafak çöküşü + `enterChallenge` / `exitChallenge` /
   `completeChallenge`) hepsi `this.matter = this.achievementStartingMatter`
   (varsayılan **10**) ile sıfırlıyor.

Yani `matter` **bir ölçüm** idi, **bir hafıza** değil. Açılışın kalıcılığı tek
dayanağı olan `unlockedFeatures` listesi ise yalnızca `syncUnlocks()` ile
dolduruluyordu ve `syncUnlocks()` **her tick'te değil**, `update()` başındaki
`unlockCheckAcc >= UNLOCK_CHECK_INTERVAL` (0.5 sn) penceresinde çalışıyordu.
Bu, incremental'da kabul edilemez bir yarış penceresi: Şafak Nöbeti Botu
(`update()` içinde `if (this.canShift) this.dimensionShift(false)`), çevrimdışı
ilerlemenin büyük adımları veya oyuncunun kendi tıklaması, eşik aşıldığı anda
listeye yazılmadan reseti tetikleyebiliyordu.

Ayrıca **merdiven dışında** kalan iki görünürlük kararı aynı hatayı taşıyordu:

| Yer | Eski hâli | Sonuç |
|---|---|---|
| `singularityUnlocked` (game.ts) | `singularities > 0 \|\| state.matter.gte(1e30)` | Şafak sekmesi Sıçrama sonrası kaybolur |
| `isSacrificeUnlocked` / `canSacrifice` | `dimensionShifts >= 5 \|\| D8.amount > 0` | `buyGalaxy()` `dimensionShifts`'i 0'a indirdiği için Önbellek Temizleme kartı ilk kümeden sonra kaybolur |

## Karar

**1. Tek kaynak, unlock katmanında: hayat boyu dopamin su seviyesi.**

`src/game/unlocks.ts` üç saf fonksiyon eklendi — hesap burada dağılmaz, UI yalnızca
türetilmiş durumu okur:

- `raisedLifetimePeak(current, candidate)` — NaN korumalı, yalnızca yükselten max.
- `lifetimeUnlockDopamine(matter, lifetimePeakMatter)` — `max(matter, tepe)`.
- `meetsDopamineGate(matter, lifetimePeakMatter, amount)` — tek "kapı aşıldı mı" sorusu.

`UnlockContext.lifetimePeakMatter` **opsiyonel** eklendi; `checkUnlock`,
`unlockProgress` ve `unlockProgressFraction` dopamin dallarını artık bu değerden
okur. Alan yoksa (eski kayıt, harici bağlam) davranış `matter`'a düşer.

**2. Tek yazıcı: `syncUnlocks()`.** Bu action artık (a) iki yüksek su seviyesini
yükseltir, (b) sağlanan basamakları listeye yazar. Üç yerden çağrılır:

- `update()` döngüsü — 0.5 sn seyreltisiyle, **"merdiven tamamlandı" kısa devresi
  kaldırıldı** (yüksek su seviyeleri her koşuda yükselmeye devam eder);
- `dimensionShift()` — sayaç artırıldıktan hemen sonra, `matter` sıfırlanmadan önce;
- `resetRunState()` — şafak çöküşü ve meydan okuma giriş/çıkış/tamamlama için
  **tek kanca**.

**3. Merdiven dışı iki kapı aynı mekanizmaya bağlandı.**
`singularityUnlocked` artık `meetsDopamineGate(state.matter, state.lifetimePeakMatter, '1e30')`
kullanır. Önbellek Temizleme için ikinci bir tepe nokta (`lifetimePeakShifts`, eşik
`SACRIFICE_SHIFT_REQ = 5`) tanımlandı; `canSacrifice` ve `DimensionsTab.vue` aynı
`store.sacrificeUnlocked` getter'ını okur — UI artık kendi kopyasını hesaplamaz.

## Kayıt uyumluluğu

`SAVE_VERSION` **14 → 15**. `SerializedPlayerState`'e iki **opsiyonel** alan:
`lifetimePeakMatter?: string`, `lifetimePeakShifts?: number`.

**Göç kancası yok — kasıtlı.** Alanlar opsiyoneldir ve `deserialize()` alan yoksa
geriye dönük türetir:

- `lifetimePeakMatter ← max(stats.highestMatter, matter, kayıtlı tepe)`
- `lifetimePeakShifts ← max(dimensionShifts, eski D8 satın alımı, kayıtlı tepe)`

`stats.highestMatter` zaten hayat boyu zirvedir ve v9'dan beri kaydedilir. Bu yüzden
bir v14 oyuncusu **ilk yüklemede** kaybettiği açılışların tamamını geri kazanır —
hiçbir özellik "kayıtta yoktu" diye yeniden kilitlenmez. Geriye dönük **veri kaybı yok**,
ileriye dönük uyumluluk `SaveVersionError` ile korunur.

Yükleme sırası önemlidir ve korunmuştur: `unlockedFeatures` → tepe noktalar →
`syncUnlocks()` → `simulateOfflineProgress()`. Çevrimdışı simülasyon `update()`
üzerinden geçtiği için yeni basamaklar çevrimdışı ilerlemede de kaydedilir.

## Kapsam kararı

**Korunan:** dopamin eşiğine dayalı her basamak; Şafak sekmesi; Önbellek Temizleme
kartı; **D4–D8 boyut açılışı** (kapsam genişletmesi aşağıda). Hiçbir yeni kapı
açılmaz — yalnızca **ulaşılmış** eşikler kalıcı olur.

**Korunmayan (bilinçli):**

- **Satın alma kapıları koşuya bağlı kalır** (`canUnlockBulk`, `canUnlockMax`,
  bot `isAutobuyerRequirementMet`). Bunlar "görünürlük" değil "şu an alınabilir mi"
  sorusudur; dopamin düştüyse alınamaz doğru davranıştır. Bir kez **alınan** botlar
  zaten kalıcıdır.
- **Yetenek ölçümleri korunur** (`canSacrifice`'ın "kazanç > 1.15×" dalı ve D1 ≥ 10
  şartı). Kart görünür kalır; düğme koşu içi ekonomi uygun olduğunda etkinleşir.
- **`decadeSurgeMult` (ADR-0034) kasıtlı olarak koşuya bağlı kalır** — o bir
  koşu-içi buff, açılış değil.

### Kapsam genişletmesi (2026-10-05, koordinatör ajan)

Ajan "D4–D8 koşuya bağlı kalsın" diye teslim etti; bu, **kullanıcının bildirdiği
belirtinin aynı sınıfıydı ve kısmen açıkta kaldı**: `buyGalaxy()` koşu sayacını 0'a
indirdiği için `resolvedUnlockedDimensionCount()` 8'den taban değere (3) düşüyor ve
ilk kümeden sonra **D4–D8 satırları kayboluyordu** — yani "akış kümesi alınca açılan şey
görünmez oluyor" şikâyetinin boyut tarafı.

Karar: boyut açılışı da kalıcıdır (Antimatter Dimensions davranışı). Taban tavan artık
`max(dimensionShifts, lifetimePeakShifts)`'ten okur. `dimensionCapFloor` (v12 legacy taban)
korunur. `dimMultCacheKey`'e `lifetimePeakShifts` **eklendi** — koşu sayacı sıfırlandığında
tavan değiştiği için türev bağımlılığıdır; eklenmeseydi bayat çarpan cache'ten dönerdi.

Etki kapsamı: ilk kümeden **önce** birebir aynıdır (`lifetimePeakShifts === dimensionShifts`).
Değişim yalnızca küme sonrası görünür: 8 satır kalır ve satın alınabilir kalır. Çarpan
ücretsiz kazanılmaz — `bought`/`amount` sıfırlandığı için tier çarpanları da sıfırdan başlar.
Yan fayda: `celebrateFormatUnlock` artık her koşuda aynı tier'ları tekrar kutlamıyor.

## Sonuçlar

- Değişen dosyalar: `src/game/unlocks.ts`, `src/stores/game.ts`,
  `src/components/DimensionsTab.vue`, `src/models/types.ts`,
  `src/core/save-version.ts`, `src/game/unlocks.test.ts`.
- `syncUnlocks()` artık merdiven tamamlandığında erken çıkmıyor; maliyeti 0.5 sn'de
  bir `Decimal.max` karşılaştırması (döngü gövdesi erken çıkışı koruyor).
- Doğrulama: `npx vitest run` → **151/151** test (46 → 62, +16 ADR-0035 testi);
  `npm run build` (`vue-tsc && vite build`) → **0 tip hatası**.
- **Bulut kayıt riski kapandı:** `src/core/auth/cloud-conflict.ts` alan-bazlı birleştirme
  yapmaz (`isSameSave` / `evaluateWriteGuard` / `decideSyncAction` tam-payload karşılaştırması
  ve tek parça yükleme-indirme); `lifetimePeakMatter` düşme riski yoktur.