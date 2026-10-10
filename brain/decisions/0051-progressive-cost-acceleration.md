# ADR-0051: Kademeli Maliyet İvmelenmesi (Progressive Cost Acceleration)

- **Tarih:** 2026-10-10
- **Durum:** Kabul edildi
- **Kapsam:** `src/stores/game.ts` — `dimensionCostForBucket` ve yeni yardimcılari
- **Referans:** Antimatter Dimensions "Break Infinity" post-Infinity maliyet artisi

## 1. Problem: "Duvar Yok"

Oyunda maliyet zinciri ile uretim zinciri **ayni sabit hizda** buyuyordu:

- Maliyet: her 10 alimda (1 kova) `COST_MULTS[tier]` ile carpanlanir — sabit oran
  (1e3 … 1e15, hic degismez).
- Uretim: her 10 alimda `DIM_PER_TEN_MULT = 1.595` ile carpanlanir — sabit oran.

Takas oranini dusun: bir dekad (x10 kütlesi) butcesi her zaman **ayni sayida kova**
satin alir, çünkü maliyet dekad basina sabit kova sayisi tuketir. Sonuç: dekadlar
gittikce **daha hizli** gecilir (her dekad ayni islemi daha buyuk sayilarla yapar),
sure egrisi **duser** — yani **duvar yok**. Tekilligin (1.79e308) bir sinir olma
anlami kaybolur; oyuncu 13. dakikada tekillige ulasir ve oyun "bitmis" olur.

### Ölçüm (harness — `results-pre-accel.json`, active seed 1, dt=0.1)

| Dekad araligi | Baslangic | Bitis | Sure |
| :--- | :--- | :--- | :--- |
| 50 → 60 | 0:14:54 | 0:16:33 | **99 sn** |
| 100 → 110 | 0:50:57 | 0:56:12 | **315 sn** |
| 150 → 160 | 2:42:36 | 3:39:06 | **3391 sn** |
| 200 → 210 | 7:23:41 | 7:50:30 | **1609 sn** |
| 250 → 260 | 10:24:56 | 10:24:59 | **2.3 sn** |
| **Toplam** | — | — | **10:29:42** |

Kova derinligi (tier bazinda tepe deger): `D1=95, D2=72, D3=58, D4=47, D5=36, D6=29,
D7=22, D8=17`. 250→260 araliginin **2.3 saniye** sürmesi, son bolumde satin alma
dongusunun **runaway** (kazanc > 1) oldugunu kanitlar: her dekad butcesi neredeyse
tüm kovalari süpürür, uretim kaskadi tum asagi kademeleri bir anda carpolar.

## 2. Karar

`dimensionCostForBucket` kova maliyetine **kademeli ivmelenme carpani** eklendi:

```
cost(b) = merdiven_maliyeti(b) × 10^(S·d·(d−1)/2)     d = b − B0,  b > B0
cost(b) = merdiven_maliyeti(b)                         b ≤ B0
```

- `B0_BUCKET_THRESHOLD = 30` — ivmelenmenin basladigi kova (1 kova = 10 alim).
- `COST_ACCEL_DECADES_PER_STEP = 0.02` — esigin her kova üstü eklenen maliyet
  ivmesi (ondalik basamak / kova).

### Neden bu formül (referans: AD Break Infinity)

AD'de post-Infinity maliyet ölçeklenmesi satin alma basina ×10 ile buyur ve Break
Infinity yükseltmeleri bunu ×3'e (dimCostMult) / ×2'ye (tickspeedCostMult) dusurur.
Burada **oranin kendisi** kova sayisiyla ivmelensin istedik (sabit oran degil):

- Ek maliyet `10^(S·d·(d−1)/2)` oldugu için **oran** (cost(b+1)/cost(b)) kova basina
  tam `S` ondalik kadar buyur — bu dogrusal ivme, bir dekad butcesinin alabildigi kova
  sayisini kademeli olarak dusurür.
- **Kesintisizlik garantisi:** carpan `d = 0` (esik) ve `d = 1` (ilk adim) icin tam 1
  oldugundan hem maliyet degeri hem de **ilk oran** (`cost(B0+1)/cost(B0) = fullMult`)
  eski formülle birebir aynidir. B0'da ani sıçrama yok; sadece 2. orandan itibaren
  yumusak bir rampa baslar (`S` kadar). Süreklilik testi (d) bunu dogrular.

### Denge etkisi (neden istenen duvari uretir)

Bir dekad butcesiyle alinabilen kova sayisi = `1 / (log10(fullMult) + S·d)`.
`S·d` terimi buyudukce bu dusüer → dekad basina daha az kova → dekad basina daha az
uretim carpani → **sure egrisi artar** (duvar). `S` kucuk tutuldugu icin rampa
yavas; erken oyun (B0 alti) **dokunulmaz**, gec oyun kontrollu sekilde zorlasir.

## 3. Kapsam Disi (bilerek dokunulmadi)

`DIM_PER_TEN_MULT` (1.595), `BASE_COSTS`/`COST_MULTS` tabanlari, `EARLY_D*` yumusak
merdivenleri (ADR-0026), unlock esikleri, SP formülü, `singularityHold` mantigi.
Bunlar ayri konu; ADR-0023 (3s30d altin standardi) ve ADR-0026 merdivenleri korunur.

## 4. Darboğaz dogrulamasi (grep ile)

Tüm satin alma yollari tek `dimensionCostForBucket` darbogazindan geciyor:
`buyDimension`, `buyDimensionUnits`, `buyMaxDimension`, `buyOneUnit`, `previewDimensionBuy`,
`getDimensionCost` (UI fiyatlari) ve tüm otomatik botlar. **Hicbir yer sabit `costMult`
ile kendi hesabini yapmiyor.**

`calcGeometricTotal` / `calcMaxPacks` sabit oran (kapali formül) varsayar — bunlar
**yalnizca tickspeed** (`buyMaxTickspeed`) icinde kullaniliyor; tickspeed maliyeti bu
degisiklikten etkilenmez. Kova bagimli oran icin zaten kapali formül degil, kova-kova
dongu (`calcDimensionExactTotal`, `calcMaxDimensionPacks`) kullaniliyor; bu fonksiyonlar
yeni oranla tutarli kalir (test c).

## 5. Kayit Uyumu

Formül **saf türetilmis** (kova sayisindan hesaplanir, state'e ek alan yazilmaz):
save migration gerekmez. Mevcut kayit yükleme testleri degismeden geçer (233/233).

## 6. Test

`src/stores/cost-acceleration.test.ts` (8 test):
- **(a)** B0 altindaki tüm fiyatlar eski formülle **birebir** (ADR-0023/ADR-0026 korunur).
- **(b)** B0 üstünde efektiv oran **monoton artar** ve her adimda tam `S` ondalik ekler.
- **(c)** `getDimensionCost` ivmelenen fiyati birebir yansitir; `buyMaxDimension` yeni
  oranla tutarli (tam butce → tam paket, yarim butce → kismi kova + tekil süpürme);
  `previewDimensionBuy` ile gerçek alim ayni fiyati kullanir; geometrik seri yolu
  (tickspeed buyMax) tutarli kalir.
- **(d)** B0'da **kesintisizlik**: deger ve ilk oran eski formülle ayni, sifir sıçrama.

## 7. Beklenen Etki

Kova 50'de D1 maliyeti ×10^3.8, kova 100'de ×10^48.3, kova 300'de ×10^726 pahalilasir
(eski oran sabit 3 ondalik kalirken). Gec oyun dekadlari kontrol edek şekilde uzar;
runaway buy-loop kirilir ve tekillik (1.79e308) gerçek bir sinira donüsür.
