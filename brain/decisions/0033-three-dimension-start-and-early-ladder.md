# 0033. Üç Boyutlu Başlangıç, D3/D4 Yumuşak Maliyet Merdiveni ve Erken Sıçrama Gevşetmesi

- **Tarih:** 2026-10-04
- **Durum:** Kabul edildi ve uygulandı (v0.27.1)
- **Tür:** Erken Oyun Pacing, Ekonomi
- **İlgili Belgeler:** ADR-0023, ADR-0025, ADR-0026, ADR-0027, ADR-0032
- **Kısmen geri alır:** ADR-0027 (tek boyutlu açılış tabanı 2 → 3)

---

## 1. Oyuncu Geri Bildirimi

> "milyardan trilyona geçmek çok uzun sürüyor dimleri alması falan"
> "d4 yok 1. akış sıçramasında"

ADR-0032 sonrası harness ölçümü bu şikayeti doğruladı: `active` profil
**4–5. dakikadan 40. dakikaya kadar log10 8–10 bandında sıkışıyordu**
(`log10 = 8.78 → 9.66 → 9.85 → 9.73 → 10.37`), sıçrama sayısı 1'de sabit,
frekans alımı 5–7 arasında donuyordu.

Kök nedenler:
1. **`BASE_UNLOCKED_DIMENSIONS = 2` (ADR-0027)** — 1e9–1e12 bandında oyuncunun
   yalnızca **D1 + D2** istasyonu vardı ve ilk sıçrama D3'ü açıyordu. D4 ancak
   2. sıçramada geliyordu. Bu banttaki üretim çarpanı yetersiz kalıyordu.
2. **D3/D4'ün yumuşak maliyet merdiveni yoktu.** ADR-0026 yalnızca D1 (×55) ve
   D2 (×42) için erken bucket gevşetmesi getirmişti; D3 `1e5`/bucket ve
   D4 `1e6`/bucket ile tam sert artıyordu (D3: 1e4 → 1e9 → 1e14;
   D4: 1e6 → 1e12 → 1e18). Milyar seviyesindeki oyuncu için bu duvar aşılamazdı.
3. **Erken sıçrama gereksinimi 25 adetti.** D3'ün ikinci/üçüncü bucket'ı
   (1e14 mertebesi) erken oyunda çok pahalıydı.

---

## 2. Kararlar ve Uygulanan Değişiklikler

### A. Başlangıç format sayısı 2 → 3 (`BASE_UNLOCKED_DIMENSIONS = 3`)
- Yeni oyun **D1 + D2 + D3** ile başlar.
- **1. Akış Sıçraması artık D4'ü açar** (`min(8, 3 + shifts)`).
- Sabit dışa açıldı (`export const BASE_UNLOCKED_DIMENSIONS`); merdiven
  teaser'ı (`DimensionsTab.vue`) artık `tier - 2` yerine
  `tier - BASE_UNLOCKED_DIMENSIONS` hesaplıyor, yani "1. Akış Sıçraması ile
  açılır" metni tek kaynaktan türetiliyor.
- `dimensionCapFloor` ve `formatDiscoverSeenCap` yeni oyun/deserialize
  varsayılanları bu sabide bağlandı. Eski kayıtların `dimensionCapFloor ≥ 3`
  değeri korunur (clamp alt sınırı 2'de bırakıldı), yani mevcut oyuncuların
  açık tier sayısı **düşmez**.

### B. D3/D4 yumuşak maliyet merdiveni (`dimensionCostForBucket`)
ADR-0026 desenini D3 ve D4'e genişletir:

| Tier | Erken oran | Yumuşak bucket | Sonrası |
|---|---|---|---|
| D1 | ×55 | 4 | `fullMult` = 1e3 |
| D2 | ×42 | 3 | `fullMult` = 1e4 |
| **D3** | **×32** | **3** | `fullMult` = 1e5 |
| **D4** | **×28** | **2** | `fullMult` = 1e6 |

D3 fiyat merdiveni: 1e4 → 3.2e5 → 1.024e7 → sonra ×1e5/bucket
(önceden: 1e4 → 1e9 → 1e14).
D4 fiyat merdiveni: 1e6 → 2.8e7 → sonra ×1e6/bucket.

### C. Erken sıçrama gereksinimi 25 → 20 (yalnızca ilk üç sıçrama)
`shiftRequirement` içinde `dimensionShifts ≤ 2` iken taban **20** adet,
sonrası mevcut **25** adet. ADR-0021'in "sıçrama gereksinimlerini artırma"
reddinin tersi yönde ve güvenli tarafta bir gevşetmedir (softlock riski yok).

---

## 3. Doğrulama

### Testler ve derleme
- `npx vitest run` → **134/134 test geçti** (5 dosya).
- `npm run build` (`vue-tsc && vite build`) → **0 hata**, temiz derleme.

### Harness ölçümü (`results-base3-d4.json`, active seed 1)

**1e8 → 1e13 geçişi:**

| Süre | log10 | Sıçrama | Satın alınanlar (D1..D8) |
|---:|---:|---:|---|
| 3 dk | 7.29 | 1 | 40, 40, 30, **10** |
| 4 dk | 8.26 | 2 | 50, 40, 30, **20** |
| **5 dk** | **11.54** | 2 | 62, 50, 40, **30**, 10 |
| 6 dk | 14.79 | 2 | 74, 51, 50, 30, 10 |

**Milyardan trilyona geçiş artık ~1 dakika** (4. ve 5. dakikalar arası).
Öncesinde aynı bantta **~40 dakika** sıkışma vardı. 3. dakikada D4 satın
alınmış durumda — yani **D4 gerçekten 1. sıçramada açılıyor**.

**İçerik ritmi (ilk 90 dakika):**

| Süre | Açılan |
|---:|---|
| 0:14 | Gece Krizleri |
| 1:26 | 1. Akış Sıçraması (D4 açılır) |
| 5:10 | Otomatik Botlar + D2 botu |
| 5:49 | Çılgın Kaydırma Duruşu |
| 10:16 | Düşük Parlaklık Duruşu |
| 10:52 | Nöral İzleme Kolonisi |
| 15:44 | Gece Kriz Yönetimi |
| 25:22 | Çift Espresso Shot |
| 27:29 | Gürültü Önleyici Kulaklık |
| 29:02 | 'Yarın Erken Kalkmam...' Yalanı |
| 31:46 | Algoritma Laboratuvarı |
| 39:34 | Kaşar Cızırtısı Tohumu |
| 43:05 | Subway Surfers Beat |
| 60:12 | Sigma Phonk Tohumu |
| 91:40 | Vicdan Azapları |

Ortalama **~7 dakikada bir yeni içerik** — endüstri hedefi olan
"erken/orta oyunda 2–45 dakikada bir an" bandının içinde.

### Toplam koşu süresi — dikkat edilmesi gereken yan etki

| Sürüm | Active → 1.79e308 |
|---|---|
| v0.26.0 (temel) | 5:17:38 |
| ADR-0032 sonrası | 4:29:11 |
| **ADR-0033 sonrası** | **2:28:50** |

Erken oyundaki bileşik büyüme tüm koşuyu hızlandırdı; koşu artık
**180–240 dk hedef bandının altında** (149 dk). Bu bilinçli bir tercih:
oyuncu geri bildirimi erken oyunun hızlandırılmasını istedi. Harness'ın
`active` profili optimal oynayan bir senaryodur; gerçek oyuncu tipik olarak
%50–100 daha yavaş ilerler (≈4–5 saat).

**Eğer hedef band korunmak istenirse** sonraki adım (ADR-0032'nin standart
telafi merdiveni, tek parametre):
`DIM_PER_TEN_MULT` 1.58 → 1.60 veya `MAX_BUY_PACKS_CAP_FIRST_RUN` 380 → 340.
Bu ADR bunu **bilerek uygulamadı** çünkü oyuncu henüz "çok hızlı" demedi.
