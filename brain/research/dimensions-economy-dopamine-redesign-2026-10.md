# Dimensions Ekonomisi ve Dopamin Katkısı — Yeniden Kurgu Araştırması

**Date:** 2026-10-02  
**Scope:** `D1–D8` üretim zinciri, maliyet/çarpan istifi, UI hissi, tema (“Reels formatları”) ile mekanik uyum  
**Method:** Repo denetimi (`game.ts`, GDD, ADR-0023/0024, harness), birincil kaynaklar (AD wiki, Orteil/Pecorella, akademik idle/ödül literatürü)  
**Change policy:** Araştırma ve tasarım önerisi; uygulama kodu bu belgede değiştirilmedi.

---

## 1. Yönetici özeti

Dimensions sekmesi oyunun **matematik omurgası**; dopamin teması ise GDD’de **taktil/anomali** katmanında anlatılıyor. Bugün ikisi kısmen kopuk: boyut satın alımı çoğunlukla “sayı gider, CPS artar” AD döngüsü, tema metinleri ve Gece Krizi/Wrinkler dopamini ise aynı ekranda **paralel** kalıyor. Harness ile ilk tekillik ~3,1–3,4 saate oturmuş (ADR-0023); bu, çekirdek boyut formülünün “fazla hızlı” olmadığını gösterir — asıl yeniden kurgu ihtiyacı **hissettirilen ilerleme**, **tema–mekanik eşlemesi** ve **çarpan okunabilirliği** tarafında.

**Öncelik sırası (öneri):**

1. **Okunabilirlik:** Çözünürlük milestone’ları kodda **en yüksek eşik** modeline geçmiş (`getDimensionMultiplier`); UI/Stats dökümünün bunu yansıtması yeterli (eski araştırma raporlarındaki kümülatif bug kapalı).
2. **Unfolding:** AD tarzı kademeli boyut açılışı — dopamin “yeni format keşfi” anları yaratır; erken 4 boyut + Max All erken kaskadı flatten ediyor.
3. **Bumpy progression:** Pecorella “Make it bumpy” — boyut başına mini duvar + sıçrama/galaxy/çözünürlük patlaması; düz log eğrisi yerine tier odaklı öncelik değişimi.
4. **Sınırlı değişken ödül:** Kao (2012) — ortalama sabit, aralık **dar** (≈5–15); geniş (0–50) tercih kaybeder. Format “viral şans” boyut paketlerine uyar.
5. **Dopamin bütçesi:** Boyut çarpanları × kolektif × lab × kriz × duruş aynı `matterPerSecond` hattında; hangi katmanın “boyut hissi” vereceği açık ayrılmalı.

---

## 2. Mevcut implementasyon (kanıt)

### 2.1 Üretim grafiği

| Katman | Sabit / davranış | Kaynak |
|--------|------------------|--------|
| Zincir hızı | `DIMENSION_CHAIN_RATE = 0.056` (AD referansı 0.1/s) | `game.ts` |
| Paket alım | Her tık +10 `bought`, maliyet `base × costMult^floor(bought/10)` | AD “10’luk paket” ailesi |
| Per-10 çarpan | `DIM_PER_TEN_MULT = 1.56` (ADR-0023: 2.0 → 3–4 saat bandı) | `game.ts` |
| CPS | `D1.amount × getDimensionMultiplier(1) × tickspeed × global stack` | `matterPerSecond` |
| Üst → alt | Her tick: `D_i.amount × mult_i × tickspeed × ach × 0.056 × Δt` → `D_{i-1}.amount` | `update()` |
| Satın alım hissi | `PURCHASE_CHAIN_BONUS_SECONDS` + anında ~0.45 sn dopamin | `applyPurchaseChainPulse` |

**Sonuç:** Matematiksel olarak AD’nin sekiz dereceli polinom fikrine yakın, ancak **0.056 zincir** + **1.56 per-10** + **340 max-alım tavanı** birlikte koşu süresini belirliyor; dopamin teması bu formüllerde yok.

### 2.2 Çarpan istifi (boyut satırı)

`getDimensionMultiplier(tier)` sırasıyla:

- Per-10: `1.56^floor(bought/10)`
- **Resolution milestones: kümülatif çarpım** (50→2, 100→×3, … 1000→×32 hepsi çarpılır → teorik ~×98k sadece bu katmandan)
- Shift: `shiftPower^shifts`
- Göz damlası, D8 sacrifice, ayna eşi (`1 + 0.15√partnerBought`), nöral ağaç, challenge ödülleri

Kolektif trend (`collectiveMultiplier`) **doğru semantik:** yalnızca ulaşılan **en yüksek** eşik (`50×` max).

### 2.3 Erken oyun yapısı

- `unlockedDimensionsCount = min(8, 4 + dimensionShifts)` → **oyun başında D1–D4 açık**
- Harness “active” profili Max All + tickspeed kullanır → erken 4’lü kaskad AD’nin “tek boyut öğren, sonra D2” pacing’inden hızlı

### 2.4 Tema eşlemesi (GDD vs kod)

| Tier | GDD istasyon | Kodda ek tema |
|------|--------------|---------------|
| D1 | Kedi | Manuel kaydır + CPS tabanı |
| D2 | Sokak yemek | Lab/D2 unlock merdiveni (ADR-0024) |
| D3 | ASMR | — |
| D4 | Subway+Reddit | Kriz yönetimi unlock |
| D5 | Sigma | Ayna D4 |
| D6 | Hint dizisi | Panteon unlock |
| D7 | Varoluş | Ayna D2 |
| D8 | Brainrot | Sacrifice, reklam borsası unlock |

**Boşluk:** Tier adları flavor; **satın alım kararı tier’a özgü trade-off vermiyor** (hepsi aynı “10 paket + çözünürlük barı”).

---

## 3. Birincil referanslar (internet + oyun)

### 3.1 Antimatter Dimensions

Kaynak: [Dimensions — AD Wiki](https://antimatterdimensions.wiki.gg/wiki/Dimensions), [Tickspeed — AD Wiki](https://antimatterdimensions.wiki.gg/wiki/Tickspeed).

- D1: birincil kaynak **+1/s** (owned başına); D2–D8: alt tier **0.1/s** (owned başına).
- Global tickspeed etkisi tüm tier’larda → pratikte **~×n^8** antimatter etkisi (n = tickspeed çarpanı).
- Per-10 satın alım **×2** (varsayılan); maliyet bucket’ları agresif.
- **Unfolding:** boyutlar, boost, galaxy, infinity autobuyer eşikleri zamanla açılır — angarya otomasyona devredilir.

**Doomscroll’a ders:** Pacing sadece üstel maliyet değil; **ne zaman kaskadın başladığı**. AD’de erken oyun D1 odaklı; Doomscroll’da D4’e kadar erken kaskad “gece reels kaydırma” temasını hızlandırır ama **format keşfi dopaminini seyreltir**.

### 3.2 Cookie Clicker

Kaynak: [Buildings — Cookie Clicker Wiki](https://cookieclicker.wiki.gg/wiki/Buildings), [Upgrades](https://cookieclicker.wiki.gg/wiki/Upgrades).

- Maliyet: `×1.15^owned` (yaklaşık her 5 bina fiyat ikiye katlanır).
- Tiered upgrade: çoğu bina **×2 CpS**; eşikler 1, 5, 25, 50, 100…
- **Altın kurabiye:** nadir, görsel, kısa buff — pasif üretimden ayrı dopamin kanalı.

**Doomscroll’a ders:** Boyut satırı = bina; çözünürlük milestone = tiered upgrade. CC’de upgrade **tek seferlik ×2** okunur; kümülatif ×98k hissi yaratmaz. Golden cookie dopamini **boyut CPS’ine gömülmemeli** — GDD zaten anomalileri ayrı tutuyor; dimensions tarafı **öngörülebilir büyüme + ara sıra format patlaması** olmalı.

### 3.3 Idle matematik ve “bumpy” tasarım

Kaynak: Anthony Pecorella, [The Math of Idle Games, Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i); GDC [Idle Games](https://media.gdcvault.com/gdc2015/presentations/Pecorella_Anthony_Idle_Games_The.pdf), [Quest for Progress](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf).

- Maliyet üstel, üretim polinom/lineer katmanlar → çarpanlar **yerel zaferler** yaratır.
- **“Make it bumpy”** — düz log eğrisi sıkıcı; generator önceliği zamanla değişmeli.
- Prestij döngüsü: erken içerik **uçarak** geçilir, “güç fantezisi”.

**Doomscroll’a ders:** Shift/galaxy/çözünürlük/kolektif zaten bump adayları; resolution kümülasyonu bump’ları **saydam olmayan süper-bump** yapıyor. Harness 3–4 saat hedefi korunurken bump’ları **tier kilidi + sıçrama** ile dağıtmak daha iyi.

### 3.4 Ödül programları ve dopamin (etik sınırlar)

| Bulgu | Kaynak | Tasarım çıkarımı |
|-------|--------|------------------|
| Değişken ödül, **dar aralık** (5–15) sabit ortalamayı geçer; 0–20 / 0–50 kaybeder | Kao et al., [Reward Preference in Video Games (MIT PDF)](https://people.csail.mit.edu/dkao/pdf/kao2012rewardpreference.pdf) | “Viral video” bonusu ±10–15% bandında; sıfır ödül yok |
| Idle’da beklentiden hızlı ilerleme tatmin edici olabilir (predictive processing) | [Mastering uncertainty…](https://exa.ai/library/publication/nb4tr7z908r) | Boyut alımı sonrası `production-bump` + sayı animasyonu bilinçli; “beklenenden iyi” kısa pencere |
| Idle tasarımcıları etik yükü ciddiye alır; sürekli müdahale + belirsizlik riski | [It Started as a Joke: On the Design of Idle Games (NSF)](https://par.nsf.gov/servlets/purl/10174274) | Boyut döngüsü **AFK ile ilerleyebilmeli**; sadece aktif tıklama ile zorunlu RNG yok |
| Aktif/pasif gerilim | Larsson, incremental clicker tez özeti (DocsLib mirror) | Dimensions pasif omurga; dopamin spike’ları anomali/krizde kalmalı |

**Tema uyumu:** Oyun “dopamin” hicvi yapıyor — mekanik olarak **sınırlı, okunabilir, opt-out’lu** ödül değişkenliği; loot box genişliği değil.

---

## 4. Sorun matrisi (ekonomi × dopamin)

| # | Sorun | Ekonomi etkisi | Dopamin / UX etkisi | Şiddet |
|---|--------|----------------|---------------------|--------|
| S1 | Resolution UI vs Stats dökümü | — | Çarpan lab tier satırı eksikse “şeffaf değil” | Düşük (mekanik düzeltildi) |
| S2 | D1–D4 başlangıçta açık | Erken polinom kaskad | “İlk kedi videosu” masumiyeti kısa | **Yüksek (plan hedefi)** |
| S3 | Tüm tier’lar aynı UX | Optimal strateji Max All | Format çeşitliliği yok, tek düğme | Orta |
| S4 | Anomali/kriz dimensions’tan kopuk | CPS anomaliden bağımsız büyür | Active dopamin ayrı kanal, sekme “ölü” kalabilir | Orta |
| S5 | Ayna çiftleri (√partner) | Geç oyun sinerji | Tema güzel; erken görünmez / anlaşılmaz | Düşük |
| S6 | `matterPerSecondGrowth` yalnız D2→D1 | Bilgi iyi | D3+ “neden CPS zıplamadı?” | Düşük (eğitim) |

Not: `economy-balancing-research.md` (2026-10-01) S1 ve erken 4 boyutu zaten işaret etmiş; kolektif çarpan o tarihten sonra **düzeltilmiş**; resolution hâlâ kümülatif.

---

## 5. Yeniden kurgu prensipleri

### P1 — “Format keşfi” unfolding

Her yeni boyut = yeni reels **türü** (GDD tablosu). Mekanik:

- Tier açılışı **cutscene/toast + 60 sn “FYP boost”** (×1.2–1.5, dar band).
- Başlangıç: **D1 + D2**; D3 **1. shift**; D4 **2. shift** … veya `bought` eşiği (ADR-0024 merdiveni ile uyumlu).

AD kanıtı: kaskad gecikmesi öğrenme ve anticipation yaratır.

### P2 — Tier’a özgü “micro-identity” (hafif, stack edilebilir)

Her tier **tek** net bonus (global stack’e eklemeden önce satırda gösterilir):

| Tier | Tema bonus (örnek) | Ekonomi rolü |
|------|-------------------|--------------|
| D1 | +% click sync cap | Bootstrap |
| D2 | Gece 3 kriz süresi +%5 | CC köprüsü |
| D3 | Wrinkler leech −%0.5 | Pasif koruma |
| D4 | Anomali görünme +%10 | Aktif köprü |
| D5 | Shift gereksinimi −%3 | Duvar yumuşatma |
| D6 | Offline sim +%2 | Idle |
| D7 | SP shop −%1 (cosmetic) | Meta (singularityGain dokunulmaz kuralına dikkat) |
| D8 | Sacrifice öncesi ramp +% | Prestij öncesi spike |

**Kural:** Bonuslar **×1.05–×1.15** mertebesinde; harness bandını bozmamak için simülasyon zorunlu.

### P3 — Milestone semantiği = Cookie Clicker

- **Resolution:** yalnızca **aktif tier’ın en yüksek** eşiği (kolektif gibi); veya her eşik **additive log** (`+log10(mult)`) tek havuzda.
- **Collective:** mevcut model korunur (min bought across unlocked tiers — darboğaz oyunu).

### P4 — Bumpy tier priority

Pecorella generator önceliği:

- Erken: D1 + tickspeed
- Orta: D2–D3 beslemesi (`matterPerSecondGrowth` UI’da tüm açık tier’lar için)
- Geç: shift/galaxy + D5–D8 ayna planlaması

Shift gereksinim eğrisi (ADR-0023) korunur; **UI “şu an en çok X tier’ı besle”** ipucu (opt-in rehber).

### P5 — Dopamin spike’ları boyuta **bağla** ama kopyalama

- Gece 3 (×7) ve Histeri (×777) **üretim/tıklama ayrımı** GDD ile uyumlu kalsın.
- **Tier unlock:** mini “Super Reels” — 15 sn ×2 CPS **sadece o tier’ın feed’i** (global ×7 değil).
- Combo: FYP + Histeri aynı anda → görsel **5439× marketing** ama gerçek çarpım ayrı kanallarda (mevcut `isComboActive` — UI doğruluk).

### P6 — Güç bütçesi (Synergism dersi)

`economy-balancing-research.md` önerisi geçerli:

- Boyut satırı çarpanı hedef: koşunun **%40–60**’ı (shift + per-10 + resolution).
- Kolektif + lab + kriz + achievement geri kalanı.
- Yeni tier bonusları **“dimension bucket”** içinde kalır.

---

## 6. Tasarım paketleri (seçenekler)

### Paket A — “Cerrahi” (düşük risk, 1–2 gün)

1. Resolution → **max-tier-only** (kolektif ile aynı pattern).
2. Dimensions UI: çarpan dökümü (`StatsTab` veya satır tooltip) — S1 şeffaflığı.
3. `matterPerSecondGrowth` → en yüksek açık `Dk→Dk-1` feed’i göster.
4. Harness: active 3 seed tekillik 180–240 dk regresyon testi.

**Dopamin:** Beklenti yönetimi düzelir; “adil bump” hissi.

### Paket B — “Unfolding + tema” (orta risk, 1 hafta)

Paket A +

1. Başlangıç **2 boyut**; her **shift +1** max tier (veya ADR-0024 `dimBought` ile hizalı).
2. Tier micro-identity (P2 tablosu, 8 küçük sabit).
3. Tier unlock toast + 15 sn format buff.
4. `DimensionRow` görsel: tier rengi / ikon / “gece saati” bandı (02:47 → 06:15 progression).

**Dopamin:** Keşif anları; masum kediden brainrot’a **oynanabilir arc**.

### Paket C — “Format RNG” (yüksek risk, A/B gerekir)

Paket B +

1. Her 10’luk paket: **%90 standart**, **%10 “viral”** (+12% extra units veya +1 geçici per-10 stack, Kao dar bandı).
2. pity counter (max 8 paket normal sonrası garanti mini viral).

**Dopamin:** Slot makinesi hafifliği; **etik:** pity + log; idle-only oyuncuya paket otomasyonu viral şansı da vermeli.

---

## 7. Önerilen yol (repo bağlamı)

1. **Paket A** — ADR adayı; harness regresyonu olmadan merge edilmemeli.
2. **Paket B** — GDD “D1–D8 hikaye” ile hizalama; ADR-0024 unlock merdiveni ile birlikte planlanmalı (erken D4 kaldırılırsa yama/lab eşikleri gözden geçirilir).
3. **Paket C** — yalnızca playtest + telemetry (`production-bump`, paket türü) sonrası.

**Dokunulmaması gerekenler (ADR-0023):**

- `DIM_PER_TEN_MULT`, `DIMENSION_CHAIN_RATE`, `MAX_BUY_PACKS_CAP` (ilk koşu 340) — tier unfolding eklenirse **chain veya cap ince ayar** gerekebilir; harness zorunlu.
- `singularityGain` achievement’tan izole kalır (GDD 8).

---

## 8. Doğrulama planı

| Test | Metrik | Hedef |
|------|--------|-------|
| `brain/scratchpad/harness` active seeds 1–3 | İlk tekillik dk | 180–240 |
| Casual / idle_plus | log10 @ cap | Bilinçli duvar korunur |
| 5 dk active script | Kriz tıklama > 0 | Dimensions + anomali entegrasyonu (Paket B+) |
| UI audit | Resolution tooltip vs gerçek mult | Eşleşme |
| `npm run build` | TS | Temiz |

---

## 9. Açık sorular (ürün kararı)

1. **Başlangıç boyut sayısı:** 2 (AD sadık) vs 3 (D3 ASMR erken hook)?
2. **Tier bonusları** prestijde sıfırlansın mı (shift reset) yoksa `bought` ile mi kalsın?
3. **Viral paket RNG** — tamamen opt-in “Çılgın Kaydırma modu” altında mı?

---

## 10. Kaynak listesi

### Repo

- `GAME_DESIGN.md` §3, §4, §7
- `src/stores/game.ts` — boyut sabitleri, `getDimensionMultiplier`, `update()` zinciri
- `brain/research/economy-balancing-research.md`
- `brain/research/economy-new-game-alignment-2026-10.md`
- `brain/research/antimatter-dimensions-pacing-mechanics.md`
- `brain/decisions/0023-first-prestige-3-4h-harness-validated.md`
- `brain/decisions/0024-new-game-economy-ladder.md`

### Web / birincil

- [Antimatter Dimensions — Dimensions (wiki.gg)](https://antimatterdimensions.wiki.gg/wiki/Dimensions)
- [Antimatter Dimensions — Tickspeed (wiki.gg)](https://antimatterdimensions.wiki.gg/wiki/Tickspeed)
- [Cookie Clicker — Buildings (wiki.gg)](https://cookieclicker.wiki.gg/wiki/Buildings)
- [Cookie Clicker — Upgrades (wiki.gg)](https://cookieclicker.wiki.gg/wiki/Upgrades)
- [The Math of Idle Games, Part I — Pecorella / Game Developer](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)
- [GDC 2015 — Idle Games (PDF)](https://media.gdcvault.com/gdc2015/presentations/Pecorella_Anthony_Idle_Games_The.pdf)
- [GDC Europe 2016 — Quest for Progress (PDF)](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)
- [Reward Preference in Video Games — Kao et al. (PDF)](https://people.csail.mit.edu/dkao/pdf/kao2012rewardpreference.pdf)
- [It Started as a Joke: On the Design of Idle Games (NSF PAR)](https://par.nsf.gov/servlets/purl/10174274)

---

## Ek: Dopamin “katkısı” katman modeli (hedef mimari)

```
┌─────────────────────────────────────────────────────────────┐
│  L4 — Meta spike (Singularity, SP ağacı) — boyut UI’da    │
│       yalnızca “gece bitti” hissi                           │
├─────────────────────────────────────────────────────────────┤
│  L3 — Aktif dopamin (Kriz, Histeri, combo) — CC kanalı    │
├─────────────────────────────────────────────────────────────┤
│  L2 — Bump milestones (Shift, Galaxy, Collective, Res.)   │
├─────────────────────────────────────────────────────────────┤
│  L1 — Boyut kaskadı (D8→…→D1, tickspeed) — AD omurga       │
│       + tier keşif / micro-identity                         │
└─────────────────────────────────────────────────────────────┘
```

Oyuncu L1’de **güvenli büyüme**, L2’de **rahatlama patlaması**, L3’te **refleks anı**, L4’te **ironik “uyumadım” meta** yaşamalı — hepsi aynı CPS çarpanına gömülmemeli.
