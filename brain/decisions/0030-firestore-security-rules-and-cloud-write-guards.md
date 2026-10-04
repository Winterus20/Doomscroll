# ADR 0030: Firestore Güvenlik Kuralları ve Bulut Yazma Korumaları

- **Tarih:** 2026-10-03
- **Durum:** Kabul Edildi (Accepted) & Uygulandı (Implemented)
- **İlgili ADR:** ADR-0029 — Misafir Modu, Google & E-posta Girişi ve Akıllı Bulut Yedekleme
- **Eklenen dosyalar:** [firestore.rules](file:///c:/Users/Yigit/Documents/Incremental/firestore.rules), [firebase.json](file:///c:/Users/Yigit/Documents/Incremental/firebase.json)
- **Numaralandırma notu (tarihsel):** Bu depodaki `brain/decisions` klasöründe 0020 ve 0021 numaraları için iki ayrı dosya çakışması vardır
  (bkz. [0020-performance-optimization-tick-buy-max-ui.md](file:///c:/Users/Yigit/Documents/Incremental/brain/decisions/0020-performance-optimization-tick-buy-max-ui.md) /
  [0028-best-in-class-settings-and-multi-slot-save-system.md](file:///c:/Users/Yigit/Documents/Incremental/brain/decisions/0028-best-in-class-settings-and-multi-slot-save-system.md),
  [0021-first-prestige-210min-rebalance.md](file:///c:/Users/Yigit/Documents/Incremental/brain/decisions/0021-first-prestige-210min-rebalance.md) /
  [0029-guest-mode-google-auth-and-cloud-save-system.md](file:///c:/Users/Yigit/Documents/Incremental/brain/decisions/0029-guest-mode-google-auth-and-cloud-save-system.md)).
  Yeniden numaralandırma **yapılmıştır** (ADR-0031): git'e izlenmiş 0020/0021 numaraları korundu, çakışan dosyalar 0028 ve 0029'a, bu ADR 0030'a taşındı ve tüm referanslar güncellendi. Bu ADR'nin içeriğini etkilemez.

---

## 1. Bağlam (Context)

ADR-0029 ile projeye Firebase Authentication ve Cloud Firestore eklendi. `CloudSaveService`,
oyuncunun tüm ilerlemesini LZ-String ile sıkıştırılmış tek bir dize olarak buluta yazar:

```ts
// src/core/auth/cloud-save-service.ts:54
const docRef = doc(db, 'users', user.uid, 'cloud_saves', `slot_${slot}`)
await setDoc(docRef, { ...payload, updatedAt: serverTimestamp() })
```

Dolayısıyla gerçek veri modeli şöyledir:

| Yol | Alan | Tip | Kaynak |
| :--- | :--- | :--- | :--- |
| `users/{uid}/cloud_saves/slot_1` (ve `slot_2`, `slot_3`) | `compressedData` | `string` | `SaveSystem.exportSave()` → `LZString.compressToBase64(JSON.stringify(state))` |
| | `meta.matter` | `string` | dopamin (break_eternity Decimal metni) |
| | `meta.singularities` | `number` | Sabah 06:00 Çöküşü sayacı |
| | `meta.playtime` | `number` | **saniye** cinsinden (src/models/types.ts:190) |
| | `meta.version` | `number` | kayıt şema sürümü |
| | `meta.activeSlot` | `number` | 1, 2 veya 3; belge kimliğiyle **tutmak zorunda** |
| | `meta.clientTimestamp` | `number` | istemci saati (ms) |
| | `meta.deviceName` | `string?` | **opsiyonel** |
| | `updatedAt` | `timestamp` | `serverTimestamp()` — istemciden gelmez |

Slot sayısı sabittir: `SaveSystem.getActiveSlot()` yalnızca `[1, 2, 3]` değerlerini kabul eder,
aksi halde 1'e düşer (src/core/save.ts:56-63).

### Problem

Firestore, bir veritabanı oluşturulduğunda **30 günlük "test modu"** ile açılır ve test modunda tüm
okuma/yazma işlemleri herkese açıktır. Bizim durumumuzda bunun sonucu şudur:

1. **Dünya-okunur kayıtlar:** Biri Firebase yapılandırmasını görüp `users/{başkasının-uid}/cloud_saves/slot_1`
   belgesini okuyabilir; oyuncunun tüm dopamin, tekillik ve prestij ilerlemesi tek dizede çözülür.
2. **Dünya-yazılır kayıtlar:** Aynı kişi `setDoc` ile başkasının slot'una kendi verisini yazabilir,
   başkasının `matter` değerini sıfırlayabilir ya da oyun tarihini ileriye sarabilir.
3. **Toplu listeleme:** Koleksiyon genelinde liste çağrısı tüm oyuncuların kayıtlarını döker.
4. **Test modunda unutulmuş proje:** En sık yaşanan üretim olayı budur — proje açılır, test modu kapatılmaz.
5. **İstemci tarafı kontrolü yetersiz:** "Sadece benim verim" kontrolü istemcide yapılsa bile saldırgan
   Konsoldan doğrudan Firestore'a istek atar. Koruma **mutlaka sunucu tarafında** olmalıdır.

Bu ADR'ye kadar depoda **hiçbir** `firestore.rules` veya `firebase.json` dosyası yoktu; yani
kurallar yalnızca Firebase Console'da elle, proje başına farklı yazılıyordu ve sürüm kontrolünde izlenmiyordu.

---

## 2. Karar (Decision)

Depo köküne [firestore.rules](file:///c:/Users/Yigit/Documents/Incremental/firestore.rules) ve
[firebase.json](file:///c:/Users/Yigit/Documents/Incremental/firebase.json) eklendi. Kurallar
**derinlikli savunma (defence in depth)** ve **varsayılan ret (deny-by-default)** ilkesine göre yazıldı.

### 2.1 Varsayılan ret — her izin açık bir `allow` ile

Hiçbir yerde "izin verilmezse geç" gibi bir açık kural yoktur. Dosyanın en altında tüm veritabanını
kapsayan bir kapanış bloğu vardır:

```
match /{document=**} { allow read, write: if false; }
```

Böylece yarın eklenen her koleksiyon **kapalı doğar**. Yanlışlıkla kural yazılmayan bir koleksiyon,
istemeden herkese açık hale gelmez: en kötü senaryoda "özellik çalışmıyor", en iyi senaryoda "veri sızdı".

### 2.2 Yalnızca sahibi

Tüm izinler `isOwner(userId)` yardımcı fonksiyonundan geçer:

```
function isOwner(userId) {
  return isSignedIn()
    && userId is string && userId.size() > 0 && userId.size() <= 128
    && request.auth.uid == userId;
}
```

Bu, `request.auth.uid == userId` karşılaştırmasının yanı sıra oturumun varlığını ve uid boyutunu da
doğrulayarak boş yol segmenti veya aşırı uzun uid ile oynama girişimlerini kapatır. Yol segmenti bir
`setDoc` çağrısıyla zaten değiştirilemez; buna rağmen kural her istekte yeniden doğrulanır.

### 2.3 Yazma doğrulaması ve yol segmenti koruması

`create` **ve** `update` aynı `validSaveDocument(userId, slotId)` fonksiyonundan geçer:

- `request.resource.data.keys().hasOnly(['compressedData', 'meta', 'updatedAt'])` — tanımlı
  **gerçek** üç üst düzey alan dışında hiçbir şey eklenemez.
- `compressedData`: `is string`, `size() >= 8`, `size() <= 900000`
  (Firestore'ın ~1 MiB doküman sınırının altında bırakılmış üst sınır). Boş veya sıfır uzunluklu kayıt reddedilir.
- `meta`: `hasAll` ile altı zorunlu alan, `hasOnly` ile yalnızca bu altı alan + opsiyonel
  `deviceName`. `deviceName` opsiyonel olduğu için ayrıca `!('deviceName' in m)` ile ele alınır.
- Sayısal alanların makulluk sınırları: `playtime` 0–10.000.000.000 (**saniye**), `version` 1–1000,
  `singularities` 0–1e15, `clientTimestamp` 0–4102444800000 (2100).
- `matter`: boş olmayan, en fazla 64 karakter ve `^[0-9eE+.-]{1,64}$` desenine uyan dize.
  (break_eternity sayı metinlerinde ondalık ve üs gösterimi bulunabildiği için geniş tutuldu.)
- `updatedAt`: **istemciden kabul edilmez**. `serverTimestamp()` kural tarafında `request.time`
  olarak göründüğü için `updatedAt is timestamp && updatedAt == request.time` zorunludur. Böylece istemci
  saati forge edilemez, kayıt "geleceğe" yazılamaz ve tip belirsizliği (number/timestamp karışıklığı) kapanır.
- `slotIdMatchesMeta(slotId)`: belge kimliği ile `meta.activeSlot` birbirini göstermelidir
  (`slot_1` ⇔ `activeSlot: 1`). Böylece oyuncu kendi `slot_1` belgesine `slot_2`
  meta'sı yazıp çakışma tespitini (`checkConflict`) manipüle edemez.

Ek olarak `update`, `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`
şartını taşır: **create ile yasak olan hiçbir üst düzey alan, update ile de açılamaz.**

### 2.4 Sahte yol (forge) engeli

`create` de tam payload doğrulamasından geçer. Aksi halde saldırgan boş bir belge oluşturup sonradan
üzerine `update` yazarak yazma doğrulamasını atlayabilirdi. `updatedAt == request.time` şartı
ayrıca "önce sıfır uzunluklu bir belge yaz, sonra istediğin payload'ı güncelle" numarasını kapatır.

### 2.5 Başkalarının kayıtlarını listeleme (listing)

- `users/{uid}/cloud_saves/{slotId}` üzerinde `allow list` **yalnızca sahibe** açıktır.
  Firestore liste isteğini belge belge değerlendirdiği için B kullanıcısı A'nın koleksiyonunu listeleyemez.
- `users/{uid}` seviyesinde **hiçbir** okuma izni yoktur; oradaki alt koleksiyonların listesi de kapalıdır.
  (Firestore'da koleksiyon eşleşmesine yazılan `read` yalnızca `list` anlamına gelir; burada
  bilinçli olarak kullanılmamıştır.)

### 2.6 Silme ve profil belgesi

- `allow delete: if false;` — uygulama hiçbir yerde `deleteDoc()` çağırmaz
  (cloud-save-service.ts yalnızca `setDoc` ve `getDoc` kullanır). Kullanılmayan bir yetkiyi açık
  bırakmak yerine kapalı tutuldu.
- `match /users/{userId} { allow read, write: if false; }` — profil belgesi bugün hiç yazılmıyor;
  ileride alan eklenirse önce burada bilinçli bir `allow` yazılmalıdır.

### 2.7 Dağıtım (deployment) kararı

`firestore.rules` sürüm kontrolüne alınır ve **CI/CD'den deploy edilir**; Console'da elle kural
yazılması yasaklanmıştır, aksi halde her deploy konsoldaki kuralın üzerine yazar.

```
firebase deploy --only firestore:rules            # .firebaserc -> "default"
firebase deploy --only firestore:rules,hosting    # --project prod ile
```

`firebase.json` içinde: `firestore.rules` referansı, Vite'ın `dist` çıktısı için
`hosting` yapılandırması (SPA rewrite, hash'li asset'larda immutable cache, `index.html`
için `no-store`), güvenlik başlıkları (`X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options`) ve `.firebaserc` proje takma adlarının (`default` / `prod` /
`dev`) kullanım notları yer alır. Proje kimliği dosyanın içinde **bulunmaz**; seçim
`.firebaserc` veya `--project` bayrağı ile yapılır.

---

## 3. Sonuçlar (Consequences)

### Olumlu

- Test modunda kalmış ya da yanlışlıkla açılmış bir proje bile veri sızdırmaz; açık olan tek şey oturum açmış
  kullanıcının **kendi** kayıtlarıdır.
- Kurallar sürüm kontrolünde olduğu için incelenebilir, PR'da tartışılabilir ve geri alınabilir.
- İstemci tarafı değişmeden çalışır: mevcut `setDoc` / `getDoc` çağrılarının tamamı bu kuralları geçer.
- "Bulut kayıtlarımı sil" gibi yeni bir özellik istendiğinde iznin **bilinçli** açılması gerekir;
  kazara açık kalmaz.

### Olumsuz / Dikkat edilecekler

- **`firebase.json` yorum içeriyor (JSONC).** Firebase CLI destekler; ancak CI'da bu dosyayı
  `JSON.parse` eden bir doğrulama işi eklenirse `jsonc5` gibi bir çözümleyici kullanılmalıdır.
- **Emulator ile test edilmedi.** Bu depoda Firebase Emulator çalıştırılmadığı için kurallar hem sözdizimi
  hem davranış açısından temkinli yazıldı. İlk deploy'dan sonra iki kullanıcılı manuel senaryo
  (B, A'nın belgesini okumayı/üzerine yazmayı denemeli) mutlaka yapılmalıdır.
- **Şema daraltması kırılabilir.** `meta` ya da üst düzey alan adı değişirse (örneğin `playtime`
  saniye yerine ms olursa, `deviceName` yerine `deviceId` olursa) kurallar **reddetmeye** başlar.
  Bu bir hata değil, kırılan sürümü yakalamak isteyen bilinçli bir davranıştır; yeni alan eklendiğinde
  `hasOnly` ve zorunlu alan listeleri bu ADR ile birlikte güncellenmelidir.
- **`delete` kapalı.** Bulut kayıtları kullanıcı tarafından silinemez. Gerekirse bilinçli bir kural
  eklenmelidir; bu bir işlevsel kısıttır.
- **CSP eklenmedi.** `signInWithPopup` iframe kullandığı için daraltılmış bir
  `Content-Security-Policy` uygulamayı kırardı. `firebase.json` yorumlarında izin verilmesi
  gereken alanlar listelenmiştir.

---

## 4. Alternatifler (Alternatives)

1. **Kuralları hiç yazmamak, Console'da test modunda bırakmak.** Reddedildi: en sık gerçekleşen sızıntı
   senaryosu tam olarak budur ve kayıtlar oyunun tek değerli varlığıdır.
2. **Sadece `request.auth.uid == userId` yazmak (şema doğrulaması olmadan).** Kısmen seçildi ama tek
   başına yetersiz: sahibi olan biri kendi belgesine keyfi alanlar, keyfi `updatedAt` ve keyfi boyut
   yazabilirdi. Şema doğrulaması "sahiplik = güvenli" yanılgısını ortadan kaldırdı.
3. **Sunucu taraflı şifreli bulut ya da kaydı doğrulayan Cloud Function.** Reddedildi: maliyeti yüksek, soğuk
   başlangıçlı ve bu oyunda çalınmaya değer tek veri istemcide zaten görünür durumdadır (kayıt LZ-String ile
   sıkıştırılmış, şifreli değil).
4. **Bulut kaydını hiç kullanmamak; yalnızca yerel LocalStorage + manuel dışa/içe aktarma.** Reddedildi:
   ADR-0021'in çözdüğü çapraz cihaz kayıp sorunu geri döner; oyuncu tarayıcı verisini temizleyince prestij kaybeder.
5. **App Check (reCAPTCHA v3 / Play Integrity) eklemek.** Şimdilik reddedildi: kuralların yerini almaz, yalnızca
   ikinci bir savunma katmanıdır ve debug/Playwright testlerini gereksiz yere kırabilir. İleride kuralların
   üstüne eklenmesi değerlendirilebilir.
6. **Cloud Functions + Admin SDK ile kayıt yazma.** Reddedildi: ücretsiz katmanda daha pahalı, soğuk başlangıçlı
   ve her yazma için ek maliyet getirir; ayrıca istemci doğrudan Firestore'a yazmayı bırakırdı.

---

## 5. Doğrulama (Verification)

- [firestore.rules](file:///c:/Users/Yigit/Documents/Incremental/firestore.rules) ve
  [firebase.json](file:///c:/Users/Yigit/Documents/Incremental/firebase.json) sürüm kontrolüne eklendi.
- Firebase Emulator bu depoda **çalıştırılmadı**; kurallar kaynak koddaki gerçek yol
  (`users/{uid}/cloud_saves/slot_1`, `slot_2`, `slot_3`) ve gerçek alan listesi
  (`compressedData`, `meta`, `updatedAt`) ile birebir eşleştirilerek yazıldı.
- İlk canlı deploy sonrası yapılacak manuel testler:
  1. Kullanıcı A, oturum açıkken kendi `slot_1`, `slot_2`, `slot_3` kaydını yazıp okuyabilmeli — izin **VERİLMELİ**.
  2. Kullanıcı B, `users/{A-uid}/cloud_saves/slot_1` belgesini okumaya çalışınca **PERMISSION_DENIED** almalı.
  3. Kullanıcı B, aynı belgeye `setDoc` denediğinde **PERMISSION_DENIED** almalı.
  4. Kullanıcı A, kendi belgesine `{ hacked: true }` alanıyla yazmayı denediğinde **PERMISSION_DENIED** almalı.
  5. Oturumsuz istemci hiçbir şeyi okuyup yazamamalı.
