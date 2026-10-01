# Araştırma Raporu: Tıklama (👆 Yukarı Kaydırma) ile Puan Alma Etkinliği

> Kullanıcı sorusu: *"oyundaki tiklama ile puan alma yontemi ne kadar ise yariyor?"*
> Tarih: 2026-10-01 · Kapsam: `src/stores/game.ts` mekaniği + tür literatürü (Cookie Clicker / Antimatter Dimensions / Synergism + idle gamedev kaynakları)

---

## 1. Özet (Verdict)

| Faz | Aralık | Tıklama Etkinliği | Değerlendirme |
| :-- | :-- | :-: | :-- |
| **Erken** | 0 → ~1 dk (≈1e3 Dopamin) | Gelirin **%50-80'i** | ✅ Çok kısa pencere — t≈60s'de pay ~%5'e düşer (D2→D1 zinciri + D1 maliyeti 10→1e4 sıçraması) |
| **Orta** | ~1e4 → 1.79e308 (tekillik) | **~%0'a düşüyor** | ⚠️ **Ölü bölge** — flat çarpanlar üstel üretimi yakalayamaz |
| **Geç** | Tekillik sonrası (SP dükkanı) | **~%25-35 CPS/tıklama** | ✅ Cookie Clicker benchmark'ına yakın, dengeli |

**Ana bulgu:** Tıklama butonu *kendisi* ilk ~60 saniyeyi (D2 alınıp D1 zinciri başlayana kadar) sonra neredeyse hiç işe yaramaz; orta oyunun büyük bölümünde tamamen anlamsızdır. Aktif oynamanın gerçek kazancı, orta oyunda **üretime bağlı** mekaniklerde (Gece Krizleri, Lab hasadı, Vicdan Azabı kovması) değil de **üretime bağlı** oldukları için sonsuza dek anlamlı kalır — bu parça doğru tasarım. Ama oyunun açıklanan felsefesi ("bekleme oyunu değil; taktil yukarı kaydırma") ile bu ölü bölge doğrudan çelişiyor.

---

## 2. Mevcut Tıklama Gücü Formülü (Envanter)

`manualClickPower` (`src/stores/game.ts`):

$$
\text{click} = \underbrace{1}_{\text{taban}} \times \underbrace{2^{\text{shifts}}}_{\text{Akış Sıçraması}} \times \underbrace{\text{stance}}_{\text{Çılgın: 4×}} \times \underbrace{777^{\text{frenzy}}}_{\text{Başparmak Histerisi}} \times \underbrace{2^{S}}_{\text{Subway tohumu}} \times \underbrace{\text{achMult} \times 2^{\text{click\_x2}}}_{\text{Başarımlar}} \times 2^{\text{double\_tap}} \;+\; \underbrace{\sum_{\text{bought}\ge100} 0{,}01 \cdot \text{dimPerSec}}_{\text{1080p milestone}} \;+\; \underbrace{0{,}05 \cdot L \cdot \text{CPS}}_{\text{Kafein Serumu}}
$$

- **Flat çarpanlar** (sıçramalar hariç): `double_tap` ×2 (1e6) · `spam` duruşu ×4 · `subway_beat` hücresi başına ×2 (max 9 hücre → ×512) · `click_x2` başarımı ×2 (10k tıklama).
- **Üretime bağlı ekleyiciler:** Kafein Serumu (SP dükkanı, max 5 seviye → CPS'in %25'i/tıklama, `caffeine_boost` ile %31,25) + 1080p milestone'u (her boyut `bought≥100` için o boyutun saniyelik üretiminin %1'i).
- **Tıklama ölçekli ödüller:** Sponsor anomali (CPS=0 fallback: click×300, aksi halde **900 sn üretim**) · Lab hasadı (fallback click×50-5000, aksi halde **30-3600 sn üretim**) · "Yarın Erken Kalkmam Gerekmiyor" kararı (fallback click×2000, aksi halde **1800 sn üretim**) · Vicdan Azabı iadesi (emdinin **1.2-1.65×**'i).

---

## 3. Faz Bazlı Kuantitatif Analiz (tahmini, 5 tıklama/sn varsayımı)

**Erken oyun (~0-5 dk):** D1 üretimi başlangıçta ~1/s civarında; tıklama 1-2/tıklama × 5/sn ≈ 5-10/sn. **Tıklama gelirin çoğu.** Motorun 20 TPS sabit adım döngüsünde her tıklama anlık eklenir; Space tuşu ile 8-10 tıklama/sn mümkün.

**Orta oyun:** Üretim 8 boyut zinciriyle $O(t^8)$ büyürken (her 10 alımda ×2 çarpan, Hz 1000×13ⁿ, sıçramalar, kolektif milestone'lar), tıklama en fazla `2^shifts × 8192` flat çarpana ulaşır. Subway yatırımıyla 1e9-1e15 bandında tıklama hâlâ rekabetçi (~2-40× CPS), ama üretim her boyut geçişinde 100+ kat basamakları atlayınca tıklama payı hızla ~%0'a çöker. **Ölü bölge yaklaşık 1e12 → 1.79e308.**

**Geç oyun (tekillik sonrası):** Kafein Serumu 5 + 1080p milestone'larıyla tıklama ≈ **%25-35 CPS/tıklama**. 8 tıklama/sn ile ≈ 2-2.8× CPS — anlamlı ama baskın değil. Başparmak Histerisi bu fazda 777 × 0,3 CPS × 15 sn ≈ devasa spike yapar. ✅ Cookie Clicker'ın orta oyunundaki "~CPS'in %10-13'ü/tıklama" (Cookie Clicker Wiki, *Cookies per Click*) tasarımına yakın.

---

## 4. Tür Benchmarkları

| Oyun | Tıklama tasarımı | Doomscroll kıyaslaması |
| :-- | :-- | :-- |
| **Cookie Clicker** | Tıklama asla gelirin çoğu değil, ama **%CPS'e bağlı yükseltmelerle** sonsuza dek anlamlı (%10-13/tıklama). Altın kurabiye = aktif spike. | Doomscroll geç oyunu buna yaklaşıyor; orta oyunu değil. |
| **Antimatter Dimensions** | Tıklama **yok** — saf otomasyon. | Doomscroll bundan çok daha aktif-dostu. |
| **Synergism** | Tıklama küçük pay; otomasyon + feda baskın. | Benzer; Doomscroll'ta feda katmanı (koloni) henüz tam değil. |
| **Idle gamedev literatürü** (Machinations, GridInc) | "Otomasyonu çok erken kurmayın; manuel etkileşim bonus vermeli; aktif/idle arası tatlı nokta korunmalı." | Erken oyun ✅, orta oyun ✗. |

---

## 5. Bulgular

1. **Erken oyun:** tıklama birincil gelir kaynağı — doğru ve işe yarıyor. ✅
2. **Orta oyun ölü bölge:** flat ×2/×4/×512 çarpanları $O(t^8)$ üretime karşı anlamsızlaşır. Oyunun en uzun fazında başparmak tamamen gereksiz. ⚠️
3. **Başparmak Histerisi (777×) orta oyunda boşa gider** (777 × ihmal = ihmal); sadece tekillik sonrası (%CPS ekleyicileriyle) gerçekten güçlü olur.
4. **Aktif oyunun gerçek ödülü üretime bağlı mekanikler** (anomali 900 sn, lab 3600 sn, vicdan 1.2-1.65× prim) — bunlar üretimle büyüdüğü için sonsuza dek anlamlı. ✅ Bu parça iyi tasarım.
5. **`sponsor`/lab/yanlışlık fallback'ları** (`CPS=0` ise `clickPwr×N`) sadece çok erken oyun çalışır — kabul edilebilir.
6. **Başarımlar** (`1.012^n × 1.06^rows`) hem tıklama hem üretime uygulandığından oranı değiştirmez.

---

## 6. Opsiyonel Dengeleme Önerileri (uygulanmadı)

Ölü bölgeyi kapatmak için en az müdahale ile:

1. **Senkronize Kaydırma yaması** (algoritma yaması dükkanı, ~1e5/1e7/1e9/1e11/1e13 merdiven): *"Tıklamaya saniyelik üretimin %2'sini ekler (her seviye)"* — Cookie Clicker'ın "%CPS to click" tasarımını erken tanıtır.
2. **Çift Dokunarak Beğen**'i flat ×2 yerine *"saniyelik üretimin %1'ini tıklamaya ekle"* yap (1e6'da zaten alınabilir).
3. **Çılgın Kaydırma duruşu:** 4× flat + üretimin %1'si/tıklama hibrit (4× production kaybını dengelemek için).
4. **Başparmak Histerisi:** `max(777×, 30 sn üretim)` — orta oyunda da anlamlı spike.
5. **Yeni başarım zinciri** (1k/10k/100k tıklama → CPS'in %1/%2/%4'ü tıklamaya eklenir) — mevcut `click_x2`'yi (10k) genişletir.

---

## 6.5. Uygulanan Düzeltme (v0.11.3 — 2026-10-01)

Kullanıcı geri bildirimi ("erken oyunda bile tiklamadan aşırı hızlı yükseliyorum") üzerine 2. Bölge'deki modelleme **doğrulanıp revize edildi**: tıklama birincil penceresi 0→1e4 değil, **0→~60 saniye**dir (D2 100 Dopamin'de alınır, D2 saniyede D1 üretir; D1'in 11. alımında maliyet 10→10.000'e sıçrar).

**Yapılan değişiklik (`src/stores/game.ts`, `manualClickPower`):**
- Temel Senkronizasyon eklendi: `power += CPS × 0.01` — tıklama her zaman saniyelik üretimin **%1'ini** ekler (Cookie Clicker "%CPS to click" tasarımı, yeni yama/SP/başarım gerekmez, save uyumlu).
- Etkisi: 5-10 tıklama/sn ile tıklama **her fazda gelirin ~%5-10'u** olur; ilk 60 sn'de de flat 1'in üstüne CPS payı eklenerek zincirle büyüyen üretime "takılan" bir tıklama hissi verir. Geç oyunda mevcut Kafein Serumu (%25/seviye) + 1080p milestone'ları ile toplam ~%34 CPS/tıklama olur.
- `npm run build` (vue-tsc && vite build): **sıfır hata** (1629 modül, JS 417.41 kB / gzip 115.98 kB).

---

## 6.6. Uygulanan Düzeltme (v0.11.4 — 2026-10-01)

Kullanıcı geri bildirimi ("erken oyunda bile tiklamadan aşırı hızlı yükseliyorum, tıklama bir işe yarıyor sanmıyorum") üzerine v0.11.3'ün %1 CPS senkronizasyonu **yetersiz** çıktı: erken oyunda tıklama/CPS oranı zaten ~%6 (orta-oyun seviyesi) idi — çünkü flat taban (1) hiç büyümüyordu.

**Yapılan değişiklik (`src/stores/game.ts`, `manualClickPower`):**
1. **Koleksiyon Senkronizasyonu** (CC "cursor level"): `taban = (1 + 0.25 × Σbought) × 2^shifts`. Erken oyunda tıklama CPS'in %20'sine çıkar (4 tıklama/sn ≈ gelirin %78'i); üretim üstel büyüdüğü için düz terim orta oyunda doğal olarak kaybolur — CC'ın "flat click ölür, %CPS click devralır" eğrisi birebir taklit edilir.
2. **Temel Senkronizasyon 1% → 2%:** orta oyun ölü bölgesi kapanar (5-10 tıklama/sn ≈ gelirin %10-20'si); Başparmak Histerisi (777×) orta oyunda da anlamlı spike olur.

Build: `vue-tsc && vite build` sıfır hata (1629 modül). Save uyumlu (getter-only).

## 7. Kaynaklar

- `src/stores/game.ts` — `manualClickPower`, `matterPerSecond`, `clickAnomaly`, `harvestCell`, `castSpell`, `clickSlacker` uygulamaları
- Cookie Clicker Wiki — *Cookies per Click* ("mid-game, with all clicking upgrades, ~10-13% of CpS per click")
- Cookie Clicker Wiki — *Upgrades* (Cursor yükseltmelerinin CPS'e bağlı katmanları)
- Antimatter Dimensions Wiki — *Guide* (otomasyon odaklı, tıklamasız tasarım)
- Machinations — *How to design idle games* (çekirdek döngü ve dengelenme)
- GridInc — *Idle Games Best Practices* ("Don't automate too early — manual engagement often provides bonuses")
- `brain/research/idle-game-math-and-scaling.md` — üstel büyüme ve dilation matematiği
