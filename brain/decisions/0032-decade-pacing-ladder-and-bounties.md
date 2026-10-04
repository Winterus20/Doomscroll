# 0032. 1e308'e Kadar İçerik Merdiveni, Dekad Primleri ve Meydan Okuma Zorluk Eğrisi

- **Tarih:** 2026-10-04
- **Durum:** Kabul edildi ve uygulandı (v0.27.0)
- **Tür:** Ekonomi, Pacing, Oyun Tasarımı, Erişilebilirlik
- **İlgili Belgeler:** ADR-0009 (Özellik Merdiveni), ADR-0013 (Singularity Autobuyer), ADR-0023 (İlk Prestij 3-4h), ADR-0027 (2 Boyut Unfolding), `brain/research/e308-content-ladder-plan.md`

---

## 1. Bağlam ve Problem (Ölçüm Kanıtı)

Headless harness (`brain/scratchpad/harness/results-308-audit.json`) gerçek Pinia store'unu sürerek ölçtü:

1. **İçerik çölü:** 13 özellik kilidinin tamamı koşunun 60. dakikasında (log10 ≈ 26) açılıyordu. Kalan **257 dakika (koşunun %81'i) boyunca sıfır yeni içerik** geliyordu.
2. **Ölçek boşluğu:** Dopamin eşiğiyle ölçeklenen yalnızca 4 içerik vardı (1e6 / 1e12 / 1e30 başarım + 1e24 unlock). **1e30 ile 1e308 arasındaki 278 dekadda hiçbir içerik yoktu.**
3. **SP ölçek uyuşmazlığı:** Nöral Ağaç 3.545 SP istiyordu; mevcut formülle `SP = 10^((log10-308)/308)` tüm ağacı tamamlamak için **1e1401** gerekiyordu (eşikten 1.093 dekad sonra). İlk koşuda yalnızca 1 SP kazanıldığı için 4 saatlik ilk seans boyunca oyuncu tek bir kalıcı güçlendirme alamıyordu. `break_singularity` omurgada 36 SP derinlikteydi (36 prestijlik kilit).
4. **Meydan okuma tekdüzeliği:** 8 meydan okumanın 8'i de `1.79e308` hedefliyordu; ilk çöküşten sonra bile tek bir meydan okuma tamamlamak 4 saat sürüyordu.
5. **Idle ölü kilidi:** `AUTOBUYER_COSTS.shift = 1e26` idi; idle oyuncu sıçrama yapamadığı için 1e12'de tıkanıyor ve asla sıçrama botuna ulaşamıyordu (`log10 = 12.41`de 12 saat boyunca dondu).
6. **"Sonraki Açılacak" bandı:** `nextLocked()` altyapısı mevcuttu ama UI'da hiçbir yerde kullanılmıyordu.

---

## 2. Benzer Projelerden Alınan Dersler (Araştırma Sentezi)

Antimatter Dimensions (IvarK master), Cookie Clicker (v2.058), Synergism (Pseudonian) ve Progress Knight incelendi:

- **AD:**
  - $10^{40}$'tan $10^{140}$'a kadar her 10 dekadda bir bot açılır (`1e40 * 10^(tier-1)`, tickspeed `1e140`). Bu, orta oyundaki çölü doldurur.
  - Normal Challenges 1–9 kademelidir (her biri bir autobuyer açar).
  - Break Infinity sonrasında maliyet ölçeklemesi karesel ivmelenir; oyuncu yükseltmelerle bu ivmeyi kırar ($10 	o 0.005$).
- **Cookie Clicker:**
  - Prestij seviyesi $propto 	ext{Cookies}^{1/3}$.
  - İlk çöküşte oyuncu ağacın ~%16'sını (21/129 düğüm) alabilir; ilk koşuda başarımlar yoluyla (Milk + Kitten) kalıcı güçlenme kazanır.
- **Synergism:**
  - Meydan okumalar kademeli açılır (C1–C5 hız, C6–C10 sistemler, C10 prestij).
- **Literatür (Pecorella / Guan):**
  - "3-Decade Kuralı": 3 dekad ($1000	imes$) boyunca hiçbir karar veya açılış olmaması oyuncu kaybını katlar.
  - Erken oyun: 1.5–2.5 an/dekad; orta oyun: 0.4–0.6 an/dekad; geç oyun (1e100–1e308): 0.15–0.25 an/dekad.

---

## 3. Kararlar ve Uygulanan Değişiklikler

### A. Dekad Omurgası (`src/game/pacing.ts`)
- 308 dekad oyunun temel birimidir. 9 adlandırılmış banta bölündü: Uyanış (0–8), Kriz Gecesi (8–20), Doku (20–40), Çözünürlük (40–70), Otomasyon (70–110), Sürgü (110–160), Yayılım (160–210), Son Koşu (210–265), Eşik (265–308).
- Güvenli matematik: `log10Safe` NaN korumalı; `bandProgress01` ve `arcProgress01` 0..1 ölçeğinde.

### B. 1e308'e Yayılan Özellik Merdiveni (`src/game/unlocks.ts`)
- `dimBought` kapıları merdivenden çıkarıldı (boyut alımları sıçramalarda biriktiği için öngörülemezdi; yalnızca DimensionsTab teaser'larında kaldı).
- 16 özellik doğrudan dekad kapılarına bağlandı:
  - 1e3: Gece Krizleri
  - 1e12: Otomatik Botlar Sekmesi
  - 1e14: Çılgın Kaydırma Duruşu
  - 1e18: Düşük Parlaklık Duruşu
  - 1e22: Nöral İzleme Kolonisi
  - 1e28: Gece Kriz Yönetimi Sekmesi
  - 1e34: Çift Espresso Shot Kararı
  - 1e42: Gürültü Önleyici Kulaklık Kararı
  - 1e52: 'Yarın Erken Kalkmam Gerekmiyor' Yalanı
  - 1e65: Algoritma Laboratuvarı Sekmesi
  - 1e80: Eritme Kaşar Cızırtısı Tohumu
  - 1e100: Subway Surfers Beat Tohumu
  - 1e125: Gece 4 Sigma Phonk Tohumu
  - 1e160: Vicdan Azapları
  - 1e308: Kolektif Gece Nöbeti (Faz 2 kilometre taşı)
  - 1 çöküş: Gece Kriz Meydan Okumaları
- `unlockProgressFraction`: dopamin kapıları için logaritmik ölçek eklendi (`Infinity / Infinity` ve NaN yüzde hatası önlendi).

### C. "Sonraki Açılacak" Bandı (`src/App.vue`)
- Üst gösterge ile sekme dock'u arasına yerleştirildi:
  - Mevcut bant adı + Şafak Yolu % ilerleme çubuğu
  - Sıradaki açılacak özellik adı, ipucu ve % ilerlemesi (`nextLocked()`)
  - Sıradaki Dekad Primi rozeti (+N SP)

### D. Başarım Ölçek Merdiveni ve Kalıcı Ödüller (`src/game/achievements.ts`)
- `dopamine` kategorisi 11 dopamin eşiğine genişletildi: 1e6, 1e12, 1e30 (mevcut) $	o$ 1e50, 1e75, 1e105, 1e140, 1e180, 1e225, 1e270, 1e308.
- 5 yeni kalıcı ödül türü (`AchievementRewardKind`):
  - `prod_x125` (1e105 — Dopamin Padişahı): Tüm üretim ×1.25
  - `dim_cost_x085` (1e140 — Gece Yasası): Boyut maliyeti -%15
  - `click_x3` (1e180 — Sabaha Dönüş Yok): Yukarı Kaydırma ×3
  - `shift_power_boost` (1e225 — Sonsuz Akış): Sıçrama tabanı 1.66 $	o$ 1.9
  - `prod_x2` (1e308 — Dopamin Tekilliği): Tüm üretim ×2
- Toplam başarım sayısı 68'den 75'e çıktı; `achievementMultiplier` koşunun sonuna kadar büyümeye devam eder.

### E. Meydan Okuma Zorluk Eğrisi (`src/game/challenges.ts`)
- 8 meydan okumanın hepsi `1.79e308` yerine kademeli hedeflere bağlandı:
  - C1 (Uçak Modu): **1e40**
  - C2 (Şarj Aleti Temassızlığı): **1e70**
  - C3 (Önbellekteki Videolar): **1e110**
  - C4 (Sansür Matrisi): **1e160**
  - C5 (Gece Enflasyonu): **1e220**
  - C6 (Göz Kuruluğu): **1.79e308**
  - C7 (Hesap Kısıtlaması): **1e500** (endgame)
  - C8 (Grup Sohbeti Cehennemi): **1e1000** (endgame)

### F. SP Ekonomisi ve Uykusuzluk Ödülü (Dekad Primleri)
- **SP periyodu:** `SP = floor(10^((log10 - 308) / 45))` (308 yerine 45). Tüm ağaç ~1e450'de dolar; 1e308'de taban 1 SP korunur.
- **Dekad Primleri (Uykusuzluk Ödülü):** Hayat boyu ulaşılan her yeni dekad eşiğinde (1e6, 1e12, 1e20, 1e30, 1e45, 1e60, 1e80, 1e105, 1e135, 1e170, 1e210, 1e255, 1e300) bir kez olmak üzere SP bankasına prim ödenir (toplam 72 SP).
- `break_singularity` düğümü `dawn_harbinger` yerine doğrudan `eye_drops` arkasına taşındı — ilk çöküşten hemen sonra 8 SP ile alınabilir.

### G. Idle Kilidinin Kaldırılması ve Telafi Kolları
- Bot maliyetleri: `shift` botu 1e26 $	o$ **1e10**; `dim1` 1e12 $	o$ **1e9**; `tickspeed` 1e14 $	o$ **1e11**; `galaxy` 1e35 $	o$ **1e28**.
- Telafi kolları (standart merdiven): `DIM_PER_TEN_MULT` 1.56 $	o$ **1.58**; `DIMENSION_CHAIN_RATE` 0.058 $	o$ **0.060**; `MAX_BUY_PACKS_CAP_FIRST_RUN` 340 $	o$ **380**.

---

## 4. Doğrulama ve Ölçüm Sonuçları

1. **Vitest testleri:** **107/107 test geçti** (`pacing.test.ts` 10, `challenges.test.ts` 23, `achievements.test.ts` 28, `unlocks.test.ts` 46).
2. **Production build:** `npm run build` (`vue-tsc && vite build`) **0 hata, 1685 modül**, 16.6 saniyede derlendi.
3. **Harness simülasyonu:**
   - **Active profil:** **4:29:11**'de 1.79e308'e ulaştı (`log10 = 308.44`, 17 sıçrama, 8 küme, 11 bot, 427 anomali). 180–270 dk hedef bandının tam ortasında.
   - **Idle profil:** 6 saatte **log10 = 100.55**'e ulaştı (9 sıçrama, 10 bot, 82 frekans). Önceki 12 saatte log10=12.41'de kilitlenme hatası **tamamen çözüldü**.
   - **İçerik ritmi:** Her 15–30 dakikada yeni bir açılış, dekad primi ve başarım tetikleniyor; 60. dakikadan sonraki içerik çölü ortadan kalktı.
