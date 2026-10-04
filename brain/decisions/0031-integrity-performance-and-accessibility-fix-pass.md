# ADR 0031: Butunluk, Performans ve Erisilebilirlik Duzeltme Turu

- **Tarih:** 2026-10-03
- **Durum:** Kabul Edildi (Accepted) & Uygulandi (Implemented)
- **Surum:** v0.26.0
- **Ilgili ADR'ler:** ADR-0002 (break_eternity), ADR-0003 (accumulator loop), ADR-0009 (unlock ladder), ADR-0014 (QoL), ADR-0016 (Balatro gorel), ADR-0029 (bulut kayit), ADR-0030 (Firestore kurallari)

---

## 1. Baglam

Kod tabani dort bagimsiz paralel denetime tabi tutuldu: ilerleme/ekonomi, muhendislik kalitesi, oyuncu deneyimi ve kayit/guvenlik. Her bulgu **yeniden dogrulandi**: grep ile, kod okuyarak ve gercektarayicida olcerek (360 px). Sadece dogrulanan bulgular duzeltildi.

Tum duzeltmeler tek turda uygulandi; `npm run build` ve `npm test` yesil.

---

## 2. Karar: Ekonomi Dogrulugu

### 2.1 Gecici 'Format Kesfi' bonusu kaliciulasiyordu — DUZELTILDI

`getDimensionMultiplier()` bir cache kullanir; anahtari 14 alandan olusan bir dize. Bonus verildiginde (`celebrateFormatUnlock`) cache bir kez temizleniyordu. Anahtar ise **ham son tarih damgasini** tasiyordu.

`formatUnlockBuffMult(tier, buffTier, buffUntil, Date.now())` duvar saatine bagli calistigi icin sure doldugunda carpan 1 olmaliydi — ama anahtardaki hicbir alan degismiyordu, dolayisiyla bayat deger **suresiz** geri donuyordu.

**Sonuc:** gecici bonus kalici carpan oluyordu; hata **idle oyuncuyu cezalandiriyordu** (surekli boyut alan oyuncuda baska alanlar anahtari kirdigi icin hata maskeleniyordu).

**Karar:** anahtara iki **turev** alan eklendi — `formatBuffActive` (boolean) ve `challengeTimeMult` (sayi). Ikincisi zaten carpana giriyordu; hesabi da tek noktadan okuyor.

### 2.2 `matterPerSecond` her tick'te yalnizca rekor icin hesaplaniyordu — DUZELTILDI

20 TPS dongude `stats.highestDps` rekoru icin tam uretim zinciri (~40 Decimal tahsisi) her tick yeniden hesaplaniyordu. 1 Hz'lik ornekleyici zaten ayni degeri hesapliyor; rekor guncellemesi oraya tasindi. `highestDps` yalnizca goruntulenen bir telemetri alanidir (`StatsTab`); ekonomiye etkisi yoktur.

### 2.3 NaN dopamin tum acma merdivenini gecmis gibi gosteriyordu — DUZELTILDI

`checkUnlock()` dopamin kapilarini `ctx.matter.gte(...)` ile kontrol ediyordu. `break_eternity` **NaN Decimal'de her karsilastirmada `true` doner**; bozuk kayit aninda butun merdiveni (kriz, azaplar) acik gosteriyordu.

Bu, `AGENTS.md`'de yazili kuralin (`dec.isNan()`) ihlaliydi. Iki kapi da `dec.isNan() || Number.isNaN(dec.mag)` ile korundu; ilerleme cubugu da NaN'da sifir gosterecek sekilde duzeltildi.

### 2.4 Basarim carpani bozuk kayittan sisuyordu — DUZELTILDI

`calcAchievementMultiplier()` yalnizca listenin **uzunluguna** bakar. Kayittan gelen id'ler beyaz listeye karsi suzulmedigi icin, silinmis/yeniden adlandirilmis bir id kalici kuresel carpmani sessizce artiriyordu.

---

## 3. Karar: Kayit ve Bulut Butunlugu

| Problem | Cozum |
| :--- | :--- |
| Daha yeni build'in kaydi sessizce v12'ye geri damgalanliyordu | `SAVE_VERSION` tek kaynaga tasindi (`src/core/save-version.ts`); `deserialize()` bu kontrolu `try` blogunun **disinda** yapar ve `SaveVersionError` firlatir; `loadDetailed()` ve `importSave()` de reddeder |
| Bozuk kayit sessizce yeni oyuna donusuyor, 10 sn'de autosave kaniti siliyordu | Ham veri `*_CORRUPT` anahtarina **karantinaya** alinir; `App.vue` `loadDetailed()` sonucunu okuyup kullaniciya modal gosterir |
| Yedekleme yalnizca slot 1 icin calisiyordu | `resolveBackupKey(slot)` ile **tum slotlara** genisletildi |
| Bulut kaydi yerel kaydin uzerine **kosulsuz** yaziliyordu | `saveToCloud()` artik `runTransaction` kullanir; bulut yeniyse `CloudWriteConflictError` firlatir. Bilincli 'Buluta Yedekle' icin `force` |
| Periyodik senkron ve `beforeunload` cakisma kontrolunden gecmeden yaziyordu | `authStore.syncBackground()` once `checkConflict()` calistirir; cakisma varsa **yazmaz** |
| Cakisma tespiti `matter`'i **dize** karsilastiriyordu (`1e1000` vs `10e999`) | `Decimal` ile sayisal karsilastirma; ayrica `version` ve `singularities` de hesaba katiliyor |
| Buluttan indirme yerel slotu **yedek almadan** eziyordu | `SaveSystem.snapshotSlot()` ile anlik yedek (periyodik rotasyon 6 kayitta bir, yetersiz) |
| `currentStance` dogrulanmadan `switch`'e giriyordu | `isValidStanceType()` eklendi |
| `singularityUpgrades` ham merge ediliyordu | `neuralNodesBought` ile ayni beyaz liste + `maxLevel` clamp'i |
| `maxCaffeineEnergy` kaydedilmiyordu ama **yukleme clamp tavani**ydi | Artik serilestiriliyor ve **once** yukleniyor |
| Viral Zirve kosu ilerlemesi kaydedilmiyordu | `isViralActive` / `viralTimeRemaining` / `viralViews` serilestirildi |
| Bozuk bir boyut elemani deserialize'un **tamamini** yari uygulanmis birakiyordu | Null kontrolu + `bought` clamp'i |
| `saveSuppressed` tek yonluydu, telemetri 'basarili' derken yazmiyordu | `resumeSaves()` / `savesSuppressed` |
| `hardReset` yeni yedek/karantina anahtarlarini temizlemiyordu | Tum slotlar icin temizlik |
| `permission-denied` mesaji kullaniciya **Test Modunu acmayi** soyluyordu | Mesaj artik kapatmayi ve `firestore.rules`'i deploy etmeyi soyluyor |

---

## 4. Karar: Performans

- `checkAchievements()` icinde `ACHIEVEMENTS.filter()` **dongunun icinde** cagriliyordu (O(n^2) ~4.4k karsilastirma, 0.5 sn'de bir). Modul yukunde bir kez kurulan `ACHIEVEMENTS_BY_CATEGORY` indeksiyle degistirildi.
- `achievementMultiplier` tick basina birden cok kez cagriliyor ve her cagriyla 7 kategori x 68 tanim tariyordu. Basarimlar kalici ve yalnizca eklenir oldugu icin uzunluk gecerli bir cache anahtaridir.

### Bilincli olarak ERTELEME

`memoNeuralEffects()` anahtari her cagriyla `Object.keys().sort()` ile yeniden kurulur (tick basina ~10 kez) ve yerine surum sayaci onerildi. Bu bir bellek tabanli optimizasyondur; yanlis invalidation sessiz **yanlis sayi** uretir. Ekonomi testlerle korunmadan yapilmadi.

`markRaw` / `shallowReactive` ile Decimal'ler Proxy'den cikarilmasi da ayni gerekceyle ertelendi: tek bir kacirilmis state degisikligi yanlis ekonomi demektir.

---

## 5. Karar: Erisilebilirlik ve Mobil

| Problem | Cozum |
| :--- | :--- |
| Alti modalin hicbiri `role="dialog"` degildi; odak arkada kaliyordu, Tab sayfanin altina geciyordu | `src/core/focus-trap.ts`: `role=dialog`, `aria-modal`, `aria-labelledby`, acilista odak, Tab dongusu, kapanista odak geri yukleme, unmount'ta temizlik |
| `v-tip` yalnizca pointer'a bagliydi -> 76 aciklama klavye/AT kullanicilarina **tamamen** kapaliydi | `focusin`/`focusout`/`Escape` + gorunurken `aria-describedby`. Uzun basis davranisi **aynen korundu** (700 ms odak yakalama penceresi ile) |
| `aria-live` hic yok — basarim toast'lari duyulmuyordu | `AchievementToast` -> `role="status" aria-live="polite"` |
| **Ayarlar dislisi 360 px'te tasma nedeniyle gorunmez bicimde kirpiliyordu** (olculdu: satir 302 px, icerik 322 px) — telefonda hareket/CRT/pil ayarlarina **ulasmak imkansizdi** | Disli yatay kaydirma satirinin **disina** tasindi |
| Aktif sekme, dock 360 px'e sigmadigi icin gorunmez bir konuma gonderiliyordu | `switchTab()` icinde `scrollIntoView` (yalnizca gorel — odagi degistirmez) + nav butonlarina `aria-current="page"` |
| Kaydirma cubugu `no-scrollbar` ile gizlenmisti -> alan "bulunamaz"di | `.ds-nav-scroll` ince cubuk stili |
| `prefers-reduced-motion` en gurultulu hareketleri kapsamiyordu | Sonsuz donen kapsul cercevesi, kizil parlamasi, tam ekran aura nabzi, uretim flasi ve CRT katmanlari eklendi |
| `batterySaver` **hic JS yuku azaltmiyordu** (yalnizca CSS) | `JuiceLayer` artik `reduceAnimations` / `prefers-reduced-motion` / `batterySaver`'i okuyor. rAF'in bostayken kendini durdurmasi **korundu** |
| `floatingTexts` ayari hicbir sey yapmiyordu | Artik ucan yazilari gercekten kontrol ediyor |
| `newsTickerEnabled` ayari var ama **bileseni hic yazilmamisti** — oyuncuya yalan soyluyordu | Ayar kaldirildi (bilesen yazmak, ayari uydurmaktan durust) |
| Pasif buton kontrasti **1.72:1** (gereken 4.5:1) | Prestij butonunun ic metni `slate-950`'ye alindi (~9.4:1) |

---

## 6. Karar: Hijyen

- **Vitest** eklendi: `src/game/` saf modullerine **92 test**.
- **`dist/` izlemeden cikarildi**: Vite paketi `VITE_*` anahtarlarini icine gomdigu icin her derlemede uretilen paket repoya sizma riski tasiyordu.
- **README.md** yazildi.
- **ADR numaralandirma cakismasi cozuldu**: git'e izlenmis 0020/0021 korundu; cakisan dosyalar 0028 ve 0029'a, guvenlik kurallari ADR'i 0030'a tasindi.
- **GAME_DESIGN.md bolum 8 gercek veriye hizalandi**: 7x8=56 -> **8 kategori, 68 basarim**, x2.93 -> **x3.59**, 7 gizli -> **10 gizli**.
- `package.json` surumu `0.1.0` -> **0.26.0**.
- **C7 odul metni** kodla uyusmuyordu ("2.0 -> 2.2" yaziyordu, `BASE_SHIFT_POWER` 1.66). Metin **koda** hizalandi. Sabitin kendisi ADR-0017'de 2.0 ongorusuydu; onu degistirmek bir **denge kararidir** ve harness dogrulamasini gerektirir — bilincli olarak degistirilmedi.

---

## 7. Sonuclar

### Olumlu
- Uc **ekonomi** hatasi duzeltildi; en ciddisi gecici bonusun kalicilesmesiydi.
- Veri kaybi ihtimali olan uc yol kapatildi: bozuk slot, bos bulut ezmesi, gelecek surum ezmesi.
- Repoda **hic** Firestore kurali yoktu; artik deny-by-default bir kural seti var.
- 92 test ile ekonomi verisi regresyona karsi korunuyor.
- Mobilde **hicbir** gorsel ayara ulasmak mumkun degildi; artik mumkun.

### Dikkat gerektirenler
- `firebase deploy --only firestore:rules` **calistirilmali**. Kurallar depoda var ama konsolda yayinlanmadan bir ise yaramaz.
- 46 `v-tip` tasiyicisi odaklanabilir degil (`span`/div). Odak desteği eklendi ama bu tasiyicilar klavyeyle hala erisilemiyor. 46 **yeni** global sekme duragi eklemekten kacinildi; dogru cozum her cagri yerinde. Bilincli erteleme.
- `CloudSavePayload.updatedAt` arayuzu `number` diyor, gercekte Firestore `Timestamp` donduruyor. Dogru tipleme tum okuma noktalarini etkiler; belgelendi, ayri is kalemi.

---

## 8. Kapsam DISI birakilanlar (bilincli)

Bu tur bir **duzeltme** turuydu; yeni icerik uretmedi.

1. **Faz 2 'Kolektif Gece Nobeti' ve Faz 3 icerigi.** `nightWatchUnlocked` hala tek bir bayrak: 1e4000'de `true` olur ve `SingularityTab`'da 'FAZ 2 ACIK' rozeti basar — arkasinda **hicbir sey yok**. Corruptions, Talismans, Script Engine, Celestials uygulanmadi. Oyunun en buyuk acigi budur ve ayri bir icerik isi gerektirir.
2. `src/stores/game.ts` modulestirilmesi (4445+ satir).
3. `markRaw` / Decimal kacis yolu.
4. `memoNeuralEffects` surum sayaci.
5. Pasif butonlarin tumunde kontrast token'i (yalnizca prestij butonu duzeltildi).
6. `v-tip` tasiyicilarinda odak sirasi karari.
