# UROBOROS (The Cosmic Feast)

> Laboratuvarda karbon salınımını sıfırlamak isteyen bir bilim insanının
> kuantum filtresi, Planck ölçeğinde uzay-zamanı yırtar ve mikro-karadelik
> doğar. Oda, şehir, Dünya, Güneş derken tüm Samanyolu'nu yutan sonsuz
> bir kozmik tekillik: Uroboros.

**Antimatter Dimensions + Cookie Clicker + Synergism + Trimps** sentezi; yeni nesil
çok katmanlı bir incremental / idle oyunu. Ana kaynak **YUTULAN KÜTLE (g)**,
hedef Faz 0'da **0 → 1.79e308 g** ve ilk **Kozmik Çöküş**.

---

## Hızlı Başlangıç

```powershell
npm install        # bağımlılıklar (vitest dahil)
npm run dev        # geliştirme sunucusu (http://localhost:3000)
npm run build      # vue-tsc (tip kontrolü) + vite build
npm run preview    # derlenmiş paketi önizle
npm test           # 199 birim testi, 11 dosya (vitest)
```

| Komut | Ne yapar |
| :--- | :--- |
| `npm run dev` | Vite geliştirme sunucusu |
| `npm run build` | `vue-tsc && vite build` — tip hatası varsa derlemez |
| `npm test` | Saf veri modüllerinin birim testleri |
| `npm run preview` | Üretim paketini yerelde sunar |

---

## Teknoloji Yığını

| Alan | Seçim |
| :--- | :--- |
| Framework | **Vue 3** (Composition API, `<script setup lang="ts">`) |
| Durum | **Pinia 3** |
| Derleyici | **Vite 6** |
| Dil | **TypeScript 5.7** (`strict: true`, `any` yasak) |
| Sayı motoru | **break_eternity.js** — 1e308 ötesi için |
| Stil | **Tailwind CSS 3.4** + özel cam/neon katmanları |
| Kayıt | **LZ-String** + LocalStorage (3 slot + otomatik yedek) |
| Bulut | **Firebase** (Auth + Firestore) — **isteğe bağlı** |
| Ses | **Web Audio API** — harici dosya yok, tamamı sentez |
| Test | **Vitest 5** |

### Sayı motoru kuralı

`break_eternity.js`'te NaN kontrolü **`dec.isNan()`** ile yapılır (küçük harf).
`Number.isNaN(dec.mag)` da kullanılabilir. Bu kural ihlal edilirse birçok
karşılaştırma NaN'da `true` döner — ADR-0031'de canlı bir güvenlik açığı olarak
düzeltildi.

---

## Mimari

```
src/
├── core/            altyapı — çekirdek, kayıt, ses, matematik, odak tuzağı
│   ├── math.ts      break_eternity Decimal sarmalayıcısı
│   ├── format.ts    4 sayı notasyonu (Scientific / Standard / Eng / Log)
│   ├── game-loop.ts 20 TPS accumulator döngüsü (sabit adımlı)
│   ├── save.ts      LZ-String, 3 slot, yedek rotasyonu, karantina
│   ├── save-version.ts  SAVE_VERSION tek kaynağı + gelecek sürüm koruması
│   ├── focus-trap.ts   useFocusTrap — modal odak yönetimi
│   ├── tooltip.ts      v-tip yönergesi (uzun basış + klavye + AT)
│   ├── auth/           Firebase yapılandırma, kimlik, bulut kayıt
│   └── music/          prosedürel Lo-Fi müzik motoru
├── game/            SAF VERİ + saf fonksiyonlar (Pinia'sız, doğrudan test edilebilir)
│   ├── achievements.ts  75+ başarım + check(ctx) predicate'leri
│   ├── challenges.ts    8 kozmik meydan okuma
│   ├── unlocks.ts       16 basamaklı dekad merdiveni (1e3 → 1e308)
│   ├── pacing.ts        9 dekad bandı + Dekad Yükselişi çarpanı
│   ├── news.ts          100+ haber bandı iletisi
│   └── dimension_identity.ts  D1-D8 kimlikleri (ad / ölçek / lore / pasif)
├── stores/
│   ├── game.ts       ana durum (ekonomi, prestij, tick)
│   └── auth.ts       kimlik + bulut senkronizasyonu
├── models/          tüm tipler
└── components/      ~29 bileşen (sekmeler + overlay'ler + modaller)
```

**Neden `src/game/` ayrı?** Bu klasördeki modüller Pinia store'una bağımlı değildir;
saf veri ve saf fonksiyonlardır. Ekonomiyi değiştirdiğinde regresyonları yakalamak
için `npm test` doğrudan bunları test eder — store'u yeniden düzenlemek gerekmez.

---

## Kayıt Sistemi

- **3 bağımsız slot** (`DOOMSCROLL_SAVE_V1`, `DOOMSCROLL_SAVE_SLOT_2/3`)
  (anahtar adları eski temadan kalma legacy isimlerdir, geriye dönük uyumluluk
  için korunur — slot 1 her zaman eski anahtarla %100 uyumludur)
- Her slot için **otomatik yedek rotasyonu** (6 kayıtta bir)
- **Bozuk kayıt karantinaya alınır** — autosave kanıtı silmez
- `saveVersion` migration zinciri + **gelecek sürüm koruması**
  (daha yeni bir build'in kaydı sessizce düşürülmez, reddedilir)
- Bulut yedek: `users/{uid}/cloud_saves/slot_N`, sahiplik kontrolü ve yazma
  ön koşulları `firestore.rules` ile zorunlu kılınır

---

## Firebase Kurulumu (isteğe bağlı)

Oyun **anahtar olmadan da tam çalışır** — `.env` yoksa otomatik olarak simülasyon
moduna düşer. Gerçek Firebase kullanmak için:

1. `.env.example` dosyasını `.env` olarak kopyala ve değerleri doldur.
2. Firestore'da kuralları yayınla: `firebase deploy --only firestore:rules`
   (`firestore.rules` repoda hazır).
3. `.env` git'e **asla** commit edilmez (`.gitignore`'da).

> ⚠️ **Test Modunu açık bırakma.** Test modunda kurallar devre dışıdır ve tüm
> oyuncu kayıtları dünyaya açık olur. Repodaki `firestore.rules` deny-by-default
> yazıldı.

---

## Katkı / Ajan Çalışma Düzeni

Bu depo **[`AGENTS.md`](AGENTS.md)** ve **[`brain/`](brain/)** klasörüyle
yönetilir. Kod yazmadan önce:

1. `brain/context/project-brief.md` ve `brain/context/tech-context.md` okunur.
2. Yeni mimari kararlar `brain/decisions/` altına ADR olarak yazılır.
3. İş bitince `brain/tasks/completed.md` güncellenir.

`npm run build` çıktısı temiz olmadan hiçbir değişiklik tamamlanmış sayılmaz.
