# 1e308'e Kadar İçerik Merdiveni — Plan

> **Durum:** Plan aşaması — kod değişikliği yapılmadı.
> **Tarih:** 2026-10-04 · v0.26.0 ölçümüne dayanır.
> **Hedef:** Açılabilir içerik, kalıcı güçlendirmeler ve başarımlar **0 → 1e308** boyunca
> kesintisiz aksın; 1e308 oyunun gerçek finali olsun, boş bir kilometre taşı değil.

---

## 1. Ölçüm — Bugün oyunda ne var

Gerçek Pinia store'unu süren headless harness yeniden koşuldu
(`brain/scratchpad/harness/`, active/casual/idle × 3 tohum, dt=0.1 sn).
Ham veri: [results-308-audit.json](harness/results-308-audit.json).

### 1.1 Zaman → 1e308

| Profil | Tohum 1 | Tohum 2 | Tohum 3 | Hedef bandı | Durum |
|---|---:|---:|---:|---|---|
| **active** | 5:17:38 | 5:08:39 | 4:58:43 | 180–240 dk | ⚠️ **%30–40 aşım** |
| **casual** | ulaşılamadı (10 sa) | ulaşılamadı | ulaşılamadı | ≤ 8 saat | ❌ log10 = 150–172 |
| **idle** | ulaşılamadı (10 sa) | ulaşılamadı | ulaşılamadı | — | ❌ **log10 = 12.41, 0 sıçrama, 1 bot** |

ADR-0027 ("unfolding", 2 başlangıç boyutu) sonrası ölçüm ertelenmişti; kayma o yüzden
görünmemiş. ADR-0023 3:24 ölçmüştü, bugün **5:10**.

### 1.2 ⭐ Ana bulgu — içerik koşunun ilk %17'sinde bitiyor

`active` tohum 1'in dakika bazında dekad (log10) ve açılan içerik sayısı:

| dk | log10 | açılan özellik | bot |
|---:|---:|---:|---:|
| 10 | 10.9 | 1 | 0 |
| 30 | 12.8 | 1 | 1 |
| 40 | 13.9 | 3 | 1 |
| **50** | 25.7 | **12** | 5 |
| **60** | — | **13 (hepsi)** | 10 |
| 80 | 96.5 | 13 | 11 |
| 100 | 103.4 | 13 | 11 |
| 140 | 137.7 | 13 | 11 |
| 200 | 172.6 | 13 | 11 |
| 280 | 215.7 | 13 | 11 |
| **317** | **308.7** | 13 | 11 |

> **13 özellik kilidinin 12'si 50. dakikada, sonuncusu 60. dakikada açılıyor.
> Kalan 257 dakika — koşunun %81'i — boyunca hiçbir yeni özellik açılmıyor.**

Dahası: 11/12 bot 80. dakikada tamamlanıyor; başarımlar koşunun sonunda **46/68**'de
kalıyor. Oyuncu meşgul (sıçrama/küme düğmelerine basıyor, log10 her 10 dakikada 3↔230
arasında dalgalanıyor) ama **ilerleme hissi yok**.

### 1.3 Ölçek boşluğu — 278 dekad boş

Dopamin eşiğiyle ölçeklenen içerik yalnızca 4 tane: `1e6`, `1e12`, `1e30` (başarımlar)
ve `guilt_slackers = 1e24` (unlock). Geri kalan 64 başarımın tamamı **olay sayacı**
(tıklama, hasat, bot, cast) ve koşunun ilk saatinde dolar.

**`1e30 → 1e308` arasında 278 dekadda sıfır yeni başarım, sıfır yeni unlock.**
Bu tam olarak sorunun tarif ettiği boşluk.

### 1.4 SP ekonomisi 308'e sığmıyor

- Tüm nöral ağaç + SP dükkânı = **3.545 SP** (24 düğüm, 35 seviye).
- Mevcut formül: `SP = floor(10^((log10 − 308) / 308))`.
- 3.545 SP için gereken madde: log10 = 308 + 308·log10(3545) → **≈ 1e1401**.

Yani **tüm kalıcı güçlendirme ağacı, eşikten ~1.093 dekad sonra tamamlanıyor.**
Ayrıca `break_singularity` (e308'i aşmanın anahtarı) ağacın omurgasında 36 SP
derinlikte; ilk koşuda 1 SP kazanıldığı için **36 koşu kilitli döngü**.

### 1.5 Meydan okuma zorluk eğrisi yok

`CHALLENGE_GOAL_MATTER = '1.79e308'` — 8 meydan okumanın **8'i de aynı hedefte**.
`goalMatter` alanı challenge başına var, kimse kullanmıyor.

### 1.6 1e4000 bayrağı hiçbir şey açmıyor

`NIGHT_WATCH_THRESHOLD = 1e4000` → `nightWatchUnlocked` → yalnızca SingularityTab'ta bir
rozet. Store'da hiçbir şey bu bayrağı okummuyor. 3.692 dekad boyunca ekonomik
değişiklik yok.

---

## 2. Hedef mimari — "308 birimdir"

**308 dekad, oyunun temel para birimi.** Bir koşu tam olarak 0 → 308 yolculuğudur.
Tekillik turun doruğudur: bitiş değil, devam noktası.

    TEK KOŞU (≈ 4 saat, her prestijde tekrarlanır)
    ├─ 0 ──────────────── 308 ────────────────┐
    │  açılışlar · başarımlar · güçlendirmeler │  TEKİLLİK
    └──────────────────────────────────────────┘
              │                                    │
              │  SP + Nöral Ağaç (kalıcı)           │  sonraki koşu daha hızlı,
              ▼                                    │  daha uzağa taşır → daha çok SP
    TEK KOŞU #2 (≈ 2.5 saat, 1e308'i aşarak)

**1e4000 bayrağı kaldırılır.** Faz 2 (Kolektif Gece Nöbeti) **1e308'e** taşınır ve
arkasına gerçek içerik konur. GDD'nin dört prestij katmanı da böylece gerçekleşir.

---

## 3. Beş hamle

### Hamle 1 — "Dekad Merdiveni": tek kaynaklı pacing omurgası

Yeni dosya `src/game/pacing.ts`. Tek kaynak, üç tüketicı: unlock'lar, başarımlar,
"Sonraki Açılacak" bandı. Her içerik bir dekad slotuna oturur.

    export interface DecadeBand {
      id: string
      name: string        // 'Kriz Gecesi'
      from: number        // 8
      to: number          // 20
      blurb: string       // UI'da gösterilen tek cümlelik anlatı
    }
    export const DECADE_BANDS: DecadeBand[] = [ /* 9 bant, aşağıda */ ]

| Bant | log10 | ~dk (aktif hedef) | Açılan tema |
|---|---:|---:|---|
| 0 — Uyanış | 0–8 | 0–4 | tıklama, D1, 360p |
| 1 — Kriz Gecesi | 8–20 | 4–12 | Gece Krizleri, duruşlar, ilk sıçrama |
| 2 — Doku | 20–40 | 12–30 | Laboratuvar, tohumlar, Vicdan Azapları |
| 3 — Çözünürlük | 40–70 | 30–55 | D5, Yama dükkanı, 720p/1080p |
| 4 — Otomasyon | 70–110 | 55–90 | Toplu/Max bot, koloni, D6 |
| 5 — Sürgü | 110–160 | 90–130 | D7, kümeler, 4K/Nöro-Link |
| 6 — Yayılım | 160–210 | 130–175 | D8, Kozmik, ikinci küme seti |
| 7 — Son Koşu | 210–265 | 175–215 | son sıçramalar, final başarımları |
| 8 — Eşik | 265–308 | 215–240 | **TEKİLLİK** |

### Hamle 2 — 14 unlock'u dekad ızgarasına yay

Mevcut 13 pre-tekillik unlock'un **13'ü de** dekad ≤ 26'da açılıyor. Yeni tablo
6 yeni içerikle 20'ye çıkıyor; dekad başına ~1 tane düşüyor:

| # | id | Ad | Yeni kapı | Dekad | ~dk | Durum |
|---|---|---|---|---:|---:|---|
| 1 | crisis_spawn | Gece Krizleri | 1e3 | 3 | ~1 | korunur |
| 2 | patch_shop | Yenile & Algoritma Yamaları | 1e9 | 9 | ~5 | **yeni** |
| 3 | stance_spam | Çılgın Kaydırma Duruşu | 1e12 | 12 | ~7 | dopamin'a çevrilir |
| 4 | stance_private | Düşük Parlaklık Duruşu | 1e15 | 15 | ~9 | dopamin'a çevrilir |
| 5 | colony | Nöral İzleme Kolonisi | 1e19 | 19 | ~11 | **yeni** (şu an getter'da) |
| 6 | crisis | Gece Kriz Yönetimi | 1e25 | 25 | ~15 | dopamin'a çevrilir |
| 7 | spell_espresso | Çift Espresso Shot | 1e30 | 30 | ~19 | dopamin'a çevrilir |
| 8 | lab | Algoritma Laboratuvarı | 1e38 | 38 | ~27 | dopamin'a çevrilir |
| 9 | seed_cheese | Kaşar Cızırtısı Tohumu | 1e48 | 48 | ~37 | dopamin'a çevrilir |
| 10 | seed_subway | Subway Beat Tohumu | 1e60 | 60 | ~46 | dopamin'a çevrilir |
| 11 | guilt_slackers | Vicdan Azapları | 1e75 | 75 | ~58 | dopamin'a çevrilir |
| 12 | seed_phonk | 4 Sigma Phonk Tohumu | 1e92 | 92 | ~70 | dopamin'a çevrilir |
| 13 | autobuyers | Otomatik Botlar Sekmesi | 1e115 | 115 | ~86 | dopamin'a çevrilir |
| 14 | galaxy | Sonsuz Akış Kümesi | 1e145 | 145 | ~108 | **yeni** |
| 15 | resonance | Süper Rezonans | 1e175 | 175 | ~130 | **yeni** |
| 16 | vega | Kozmik Çözünürlük | 1e205 | 205 | ~152 | **yeni** |
| 17 | final_stance | Evrensel Duruş | 1e240 | 240 | ~175 | **yeni** |
| 18 | pre_dawn | Şafak Alarmı | 1e275 | 275 | ~200 | **yeni** |
| 19 | night_watch | Kolektif Gece Nöbeti | **1e308** | 308 | ~240 | 1e4000'den taşındı |
| 20 | challenges | Gece Kriz Meydan Okumaları | 1 çöküş | — | — | korunur |

**Gerekçe — neden dopamin kapısı:** `dimBought` sayıları sıçramalarda birikiyor
(active finali: D1×1040, D8×190, 17 sıçrama), yani "şu kadar D4" kapısı hangi
dekada açılacağını öngörülebilir biçimde ifade *edemiyor*. Dekad kapısı kesin,
deterministik ve doğrudan 308 hedefini gösteriyor. `dimBought` kapıları yalnızca
**boyut keşfi teaser'larında** (DimensionsTab) kalır — orada zaten doğru yerde.

### Hamle 3 — 278 dekadlık başarım boşluğunu kapat

`Dopamin Bağımlılığı` kategorisi ölçek merdivenine çevrilir. 3 dopamin eşiği
(1e6 / 1e12 / 1e30) → 11 eşiğe:

    1e6 · 1e12 · 1e30 (mevcut)
    → 1e50 · 1e75 · 1e105 · 1e140 · 1e180 · 1e225 · 1e270 · 1e308 (yeni)

Son 5 başarıma **gerçek kalıcı ödül** verilir. Bugün hiçbir başarım blanket üretim
çarpanı taşımıyor; hepsi yalnızca global ×1.012:

| Başarım | Dekad | Ödül |
|---|---:|---|
| Dopamin Padişahı | 1e105 | Tüm üretim ×1.25 (kalıcı) |
| Gece Yasası | 1e140 | Boyut maliyeti −%15 (kalıcı) |
| Sabaha Dönüş Yok | 1e180 | Tıklama gücü ×3 (kalıcı) |
| Sonsuz Akış | 1e225 | Sıçrama gücü 1.66 → 2.4 |
| Dopamin Tekilliği | 1e308 | Tüm üretim ×2 (prestij kalıcı) |

Böylece başarım çarpanı `1.012^n × 1.06^satır` koşunun **sonuna kadar büyümeye
devam eder** (bugün koşunun ~%20'sinde tamamlanıyor).

### Hamle 4 — SP ekonomisini 308'e sığdır

Üç kural:

**(a) SP periyodu.** `308` → `SP_PERIOD = 30`.

| log10 (madde) | SP (bugün) | SP (öneri) |
|---:|---:|---:|
| 1e308 | 1 | 1 |
| 1e338 | 1 | 10 |
| 1e368 | 1 | 100 |
| 1e398 | 1 | 1.000 |
| 1e428 | 1 | 10.000 |

Ağacın tamamı (3.545 SP) ≈ **1e397**'de dolar — eşikten ~90 dekad sonra.
Bugün bu ≈ 1e1401.

**(b) Dekad primi — kritik.** Tek koşuda 1 SP kazanmak, oyuncunun 4 saat boyunca tek
bir kalıcı güçlendirme almaması demek. "Zamanla elde edilen güçlendirmeler"
isteğinin teslimi:

> **Uykusuzluk Ödülü:** Hayat boyu ulaşılan her yeni dekad bandı, bir kez olmak
> üzere SP bankasından **ödüldüğü** bir prim verir.

| log10 | 1e6 | 1e12 | 1e20 | 1e30 | 1e45 | 1e60 | 1e80 | 1e105 | 1e135 | 1e170 | 1e210 | 1e255 | 1e300 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| SP | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 15 |

**Toplam: 72 SP.** Birinci koşunun sonunda ağacın ~%2'si (omurga + 2–3 dal).
Ağaç maliyetleri aynı zamanda **6× küçültülür** (ör. `cost: 20 → 3`, `costMult` aynı
kalır) → toplam **≈ 590 SP**; 3 çöküşte ağacın ~%35–40'ı dolar — GDD'nin "%30" hedefi.

> **Uyarı — bilinçli semantik değişiklik.** SP artık yalnızca çöküş para birimi
> değil, hayat boyu ilerleme birimidir. Bu, GAME_DESIGN.md'deki "prestij ekonomisi
> korunur" maddesinin gevşetilmesidir ve ADR'de açıkça kaydedilmelidir.
> Alternatif: primleri ayrı bir para biriminde tutmak.

**(c) `break_singularity` kilidini kır.** Omurga maliyeti 36 SP → 1+1+2+2+3+3+4+4 =
20 (ölçekli dükkânla ~6 SP). İlk çöküşte alınabilir hâle gelir; e308'i aşma
1–2 koşuya iner.

### Hamle 5 — Meydan okuma zorluk eğrisi

`goalMatter` alanı challenge başına kullanılmaya başlanır — **yeni sistem yok**:

| # | Meydan Okuma | Yeni hedef | Açılış |
|---|---|---:|---|
| c1 | Uçak Modu | 1e40 | 1 çöküş |
| c2 | Şarj Aleti Temassızlığı | 1e70 | 1 çöküş |
| c3 | Önbellekteki Videolar | 1e110 | 1 çöküş |
| c4 | Sansür Matrisi | 1e160 | 1 çöküş |
| c5 | Gece Enflasyonu | 1e220 | 3 çöküş |
| c6 | Göz Kuruluğu | 1e308 | 3 çöküş |
| c7 | Hesap Kısıtlaması | 1e500 | 5 çöküş |
| c8 | Grup Sohbeti Cehennemi | 1e1000 | 5 çöküş |

Bu, içeriğin **1e308'den sonra da** 700 dekad daha sürmesini sağlar ve 1e308'i bir
çıkmaz değil, geçiş noktası yapar.

---

## 4. Ölçüm düzeltmesi (içerik planının ön koşulu)

İçerik dekada göre konumlanacağı için **dekad→zaman eğrisi bilinmeli**. Bugün eğri
çok arka yüklü: son 17 dakikada 223 → 308 dekad (+85). Eğri yayılmadan merdiven
yine havada kalır.

| Sorun | Kök neden | Kollar (projenin kendi telafi merdiveni) |
|---|---|---|
| active 5:10 (hedef 3–4 sa) | ADR-0025/0026/0027 sonrası ölçüm ertelendi | DIM_PER_TEN_MULT 1.56→1.58 · DIMENSION_CHAIN_RATE 0.058→0.062 · MAX_BUY_PACKS_CAP 340→400 |
| casual 10 saatte bitiremiyor | aynı + yan sistem eşiği çok yüksek | yukarıdaki unlock tablosu; ayrıca **en az 1 özellik 20. dakikada** açılmalı |
| **idle tamamen kilitli** (log10 12.41, 0 sıçrama, 1 bot) | AUTOBUYER_COSTS.shift = 1e26; idle 1e12'de tıkanıyor, shift: {shifts:0} yetmiyor | shift 1e26→**1e10**, galaxy 1e35→1e30, dim1 1e12→**1e9** |
| Son %17'de 85 dekad | buy-loop kaçağı | DIM_PER_TEN_MULT 1.58 + çözünürlük km taşlarının 500/1000 → 800/1600 ötelenmesi |

**Kabul kriterleri (harness, her adımdan sonra):**

| Profil | Hedef |
|---|---|
| active | ilk tekillik **200–260 dk**, ilk sıçrama ≥ 15 dk, son 30 dk'da **≤ 45 dekad** |
| casual | 10 saatte prestij **veya** log10 ≥ 280 |
| idle | 6 saatte log10 ≥ 120 (ölü kilit kalkmış) |
| içerik | **hiçbir 30 dakikalık pencerede 0 yeni içerik** (unlock + başarım + challenge) |

---

## 5. Uygulama sırası (her adım ayrı ADR + build + harness)

| # | Adım | Dosyalar | Risk |
|---|---|---|---|
| 0 | Ölçüm sabitle | harness'a dekad-snapshot + içerik-milestone sayacı | düşük |
| 1 | Pacing çekirdeği | **yeni** src/game/pacing.ts + test | düşük |
| 2 | Ölçüm düzeltmesi | game.ts (bot maliyetleri, telafi kolları) | orta |
| 3 | Unlock merdiveni | unlocks.ts (20 kayıt), Header.vue ipuçları | düşük |
| 4 | **"Sonraki Açılacak" bandı** | Header.vue — nextLocked() altyapısı hazır, yüzey eksik | düşük |
| 5 | Başarım ölçek merdiveni | achievements.ts (+8 kayıt, +5 ödül), types.ts | orta |
| 6 | SP ekonomisi | game.ts (SP_PERIOD, DekadÖdülü), NEURAL_TREE maliyetleri | **yüksek** |
| 7 | Challenge eğrisi | challenges.ts goalMatter + challenges.test.ts | düşük |
| 8 | Faz 2'yi 1e308'e taşı | NIGHT_WATCH_THRESHOLD + ilk gerçek Faz 2 içeriği | yüksek |
| 9 | Son doğrulama | npm run build + npm test + harness | — |

**6. adım en riskli.** `singularityGain` başarım çarpanından izole kalmalı (mevcut
değişmez) ve `SP_PERIOD` ile maliyet ölçeklemesi **ayrı ayrı** denenmelidir.

---

## 6. Korunacak değişmezler

- `singularityGain` başarım çarpanına **uygulanmaz** (GAME_DESIGN.md, ADR-0023).
- `dec.isNan() || Number.isNaN(dec.mag)` kuralı — `unlockProgress` dopamin dalında
  `toNumber()` kullanıyor ve e308'de Infinity verir; bu hamlede düzeltilmeli.
- Sıçrama/küme gereksinim eğrilerine **dokunulmaz** (ADR-0021 "reddedilenler":
  ADR-0017 softlock dersi).
- Telafi kolları **tek parametre, tek seferde**, belgelenmiş tavanlarla.

## 7. Yan düzeltmeler (bu hamlede, bedava)

Ölçüm sırasında bulunan ve ayrı iş gerektirmeyenler:

- `achievements.ts:11` yorumu 67/×3.55 diyor, gerçek **68 / ×3.5869**.
- `game.ts:2509` "7 kategori × 66 tanım" → **8 × 68**.
- `auto_all` "11 bot" diyor, `AUTOBUYER_COSTS` **12** tanım içeriyor.
- `guilt_immunity`: açıklama −%50/+150% diyor, kod −%25/+%15 (seviye başına).
- Aynı id için iki farklı maliyet eğrisi: ağaç 4×2 (28 SP) vs legacy dükkân 3×4 (63 SP).
- `SINGULARITY_UPGRADES` (8 kayıt, 3.173 SP) **hiçbir UI'dan erişilemiyor** —
  registry + action + save yolu boşta.
- `unlocks.ts`: `galaxies` ve `anomalies` UnlockReq dalları uygulanmış ama **hiçbir
  kayıt kullanmıyor**.

## 8. Açık kararlar

1. **Dekad primleri SP bankasından mı ödülensin** (mevcut öneri) yoksa ayrı bir para
   biriminde mi tutulsun? → Semantik değişiklik, ADR'ye yazılmalı.
2. **Birinci tekillik hedefi** 240 dk mı kalsın, yoksa 6 saatlik daha derin bir kavis
   mi hedeflensin? → İkincisi içerik için daha fazla nefes verir ama ilk giriş yüzde
   kaybı riski taşır.
3. **Ağaç maliyetleri 6× küçültülsün mü?** → Etki çok büyük; ayrı adım olarak ölçülmeli.

---

## 9. Kaynaklar

- Ham ölçüm: [results-308-audit.json](harness/results-308-audit.json)
- Önceki baseline: [first-prestige-baseline.md](harness/first-prestige-baseline.md)
- Geçmiş denge kararları: ADR-0011, 0017, 0021, 0023, 0024, 0025, 0026, 0027
- [todo.md](../tasks/todo.md) — Faz 2/Faz 3 boşluğu
