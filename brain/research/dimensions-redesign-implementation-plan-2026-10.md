# Dimensions Ekonomisi & Dopamin — Uygulama Planı (v1)

**Date:** 2026-10-02  
**Araştırma:** [`dimensions-economy-dopamine-redesign-2026-10.md`](./dimensions-economy-dopamine-redesign-2026-10.md)  
**Kısıt:** ADR-0023 ilk tekillik **180–240 dk** (active harness); ADR-0024 unlock merdiveni bozulmamalı; `singularityGain` başarım çarpanından izole kalır.

---

## 1. Hedef (tek cümle)

Dimensions sekmesini yalnızca CPS formülü değil, **gece reels arc’ı** (D1 masumiyet → D8 brainrot) ve **katmanlı dopamin** (L1 kaskad → L2 bump → L3 kriz) olarak yeniden kurgulamak; matematik harness bandında kalacak.

---

## 2. Ürün kararları (plan varsayılanları — “en iyi” sentez)

Araştırmadaki Paket **A + B** birleşimi; **C (viral RNG) v2’ye ertelenir**.

| Karar | Seçim | Gerekçe |
|--------|--------|---------|
| Başlangıç boyut | **D1 + D2** | AD unfolding + “kedi → gece 3 yemek” anlatı |
| Tier açılışı | **Her Akış Sıçraması +1 cap** (max 8) | Mevcut `4 + shifts` yerine `2 + shifts`; shift anı = format keşfi |
| Tier micro-bonus | **8 sabit, küçük, boyut bucket’ında** | Synergism “her sistemin işi belli”; harness ile ±%5 chain ayarı |
| Format keşif buff | **Tier ilk kez açıldığında 20 sn ×1.25 CPS** (sadece o tier mult) | Kao dar band; global FYP ×7 ile karışmaz |
| Viral paket RNG | **Yok (v1)** | Etik + simülasyon riski; Çılgın Kaydırma moduna ertele |
| Resolution milestone | **Mevcut kod korunur** | Zaten **en yüksek eşik** modeli (`getDimensionMultiplier` = kolektif ile aynı semantik) |
| Prestij sonrası | **Tier bonusları shift/galaxy reset’te sıfırlanmaz** | `bought` kalıcı; ikinci koşu hız fantezisi bozulmaz |

---

## 3. Mimari: dört dopamin katmanı (uygulama sınırı)

```
L1  Boyut kaskadı + tickspeed + per-10          → game.ts (mevcut, ince ayar)
L2  Shift / Galaxy / Collective / Resolution    → mevcut + UI dökümü
L2b Tier micro-identity + format unlock buff    → YENİ (bu plan)
L3  Kriz / anomali / combo                     → hafif köprü (tier → anomalyRate)
L4  Singularity / SP                            → dokunulmaz (GDD)
```

**Güç bütçesi (hedef):** Koşu ortasında CPS artışının ~**%50–65**’i L1+L2; geri kalan lab/kriz/achievement. Tier bonusları toplamda **≤ ~%12 ekstra log10** (harness ile ölçülür).

---

## 4. Fazlar ve teslimatlar

### Faz 0 — Kilitleme (½ gün)

**Çıktılar**

- ADR `brain/decisions/0025-dimensions-unfolding-tier-identity.md` (karar tablosu §2 + rollback).
- `GAME_DESIGN.md` §3’e 1 paragraf: boyut açılış kuralı + tier bonus tablosu.
- Harness baseline kaydı: active seed 1–3 süre + log10 @ 60/120 dk (regresyon referansı).

**Kabul:** ADR onaylı; baseline JSON veya `brain/scratchpad/harness/` notu.

---

### Faz 1 — Unfolding & pacing (1–2 gün)

**Davranış**

```text
unlockedDimensionsCount = min(8, 2 + dimensionShifts)   // C7 cap aynı
```

**Etki analizi (beklenen)**

- Erken kaskad yavaşlar → ilk tekillik **uzayabilir**.
- Telafi sırası (yalnızca harness saparsa, tek seferde bir adım):
  1. `DIMENSION_CHAIN_RATE` +0.002 (max +0.004)
  2. `DIM_PER_TEN_MULT` +0.01 (max 1.58)
  3. İlk koşu `MAX_BUY_PACKS_CAP` +20 (max 360)

**Dosyalar**

- `src/stores/game.ts` — `unlockedDimensionsCount`, yorum satırı
- `src/game/unlocks.ts` — `dimBought` eşikleri gözden geçir (D3/D4 gecikmesi lab/yama ile çakışma)
- `brain/scratchpad/harness/run.ts` — gerekirse profil notu

**Kabul**

- Active seeds 1–3: tekillik **180–240 dk**
- `npm run build` ✓
- ADR-0024 feature unlock’ları hâlâ koşunun **%15–%70** bandında (harness event log veya manuel checklist)

---

### Faz 2 — Tier micro-identity (1 gün)

**Veri modeli**

- `src/game/dimension_identity.ts` (yeni): `TIER_IDENTITY: Record<tier, { label, passive: TierPassiveEffect }>`
- Efekt tipleri (strict union): `productionMult | anomalyRateMult | slackerLeechMult | shiftReqMult | offlineSimMult | clickSyncCapBonus` — SP/ singularityGain **yok**.

**Önerilen başlangıç tablosu (simülasyonla doğrula)**

| Tier | Pasif (örnek) | Değer |
|------|----------------|-------|
| D1 | clickSyncCapBonus | +0.5% max sync |
| D2 | productionMult | ×1.03 |
| D3 | slackerLeechMult | ×0.97 |
| D4 | anomalyRateMult | ×1.08 |
| D5 | shiftReqMult | ×0.97 (gereksinim) |
| D6 | offlineSimMult | ×1.02 |
| D7 | productionMult | ×1.04 |
| D8 | productionMult (D8 only) | ×1.06 |

**Entegrasyon noktaları** (tek tek, test edilebilir)

- `matterPerSecond` / `getDimensionMultiplier` — productionMult tier bazlı
- `slackerLeechPercent` — D3
- anomaly spawn interval — D4
- `shiftRequirement` — D5
- offline sim — D6
- `manualClickPower` sync cap — D1

**State (minimal)**

- `formatUnlockBuffUntil: number` (timestamp) + `formatUnlockBuffTier: number` — Faz 3 ile birlikte de olabilir

**Kabul:** StatsTab Çarpan Lab’da tier satırı görünür; harness bandı korunur.

---

### Faz 3 — Format keşfi & UI (1–2 gün)

**Mekanik**

- `syncUnlockedDimensions` veya shift sonrası: yeni tier ilk kez görünür olduğunda:
  - toast + ses (`sounds.playUnlock()` veya mevcut surge)
  - 20 sn: `getDimensionMultiplier(unlockedTier)` ek ×1.25 (ayrı cache key)

**UI**

- `DimensionRow.vue`: tier “gece saati” bandı (02:47→06:15 gradient index), micro-bonus tek satır tooltip
- `DimensionsTab.vue`: “Şimdi besle: D{k}” ipucu (`matterPerSecondGrowth` max tier)
- `StatsTab` / multiplier lab: L2b satırı “Format bonusu (D{n})”

**Kabul:** Yeni oyuncu 2 boyut görür; 1. shift’te D3 satırı animasyonlu açılır; buff süresi header’da chip.

---

### Faz 4 — L3 köprüsü (½–1 gün, düşük risk)

**Amaç:** Dimensions ekranı idle hissetmesin; kriz kanalı tier ile bağlansın.

- D4+ açıkken: FYP spawn interval ×0.95 (D4 identity ile stack cap)
- Combo aktifken: `DimensionRow` kenar glow (mevcut `isComboActive`)
- İsteğe bağlı: D2 olgun lab hücresi varken collective progress +%5 görsel (sadece UI, ekonomi yok)

**Kabul:** Harness’ta kriz etkileşimi artabilir; tekillik ±10 dk içinde kalmalı.

---

### Faz 5 — Dokümantasyon & görev kapanışı (½ gün)

- `brain/tasks/completed.md` — faz özeti
- `brain/tasks/todo.md` — “Dimensions redesign v1” maddesi
- Research doc düzeltmesi: resolution kümülatif bug **kapandı** notu

---

### Faz 6 (v2 — plan dışı şimdilik)

- Viral paket RNG + pity (Paket C)
- Tier başına mini challenge / “1 video daha” Wrinkler tier hook
- Pantheon slot ↔ D6 permanent trade-off

---

## 5. Test & doğrulama matrisi

| # | Komut / eylem | Geçiş kriteri |
|---|----------------|---------------|
| T1 | `node brain/scratchpad/harness/build.mjs` + active 1–3 | 180–240 dk tekillik |
| T2 | casual 1–3 (10h cap) | Bilinçli yavaş; log10 hedef ADR-0023 notu |
| T3 | `npm run build` | 0 TS error |
| T4 | Manuel: yeni save, 1. shift | D3 açılır, buff chip, 2 boyut başlangıç |
| T5 | Save migrate | Eski kayıt: cap düşmez (2+shifts ≥ eski 4+shifts ise aynı tier sayısı) |

### Save uyumluluğu (kritik)

Eski oyuncu `shifts = 0` iken 4 tier açıktı; yeni kural 2 tier → **migration**:

```text
effectiveCap = min(8, max(2 + shifts, savedLegacyMinTier ?? 0))
```

İlk yüklemede bir kerelik: `legacyDimensionCapFloor = min(4, unlockedByProgress)` veya basitçe `max(2 + shifts, min(4, highestTierWithBought>0))` — ADR’de netleştir.

---

## 6. Riskler ve azaltma

| Risk | Olasılık | Azaltma |
|------|----------|---------|
| Unfolding tekilliği +30 dk uzatır | Orta | Faz 1 telafi sırası; tek parametre / commit |
| Unlock merdiveni erken D2’ye kilitli kalır | Düşük | `unlocks.ts` D3 patch eşiği shift ile hizala |
| Tier bonus stack op | Orta | Tablo toplamı harness log10 @ 90 dk ile tavan |
| UI bilgi fazlası | Düşük | İpucu katlanabilir; StatsTab’da detay |

---

## 7. Uygulama sırası (checklist)

```
[ ] Faz 0: ADR-0025 + harness baseline
[ ] Faz 1: unlockedDimensionsCount 2+shifts + unlock audit + harness
[ ] Faz 2: dimension_identity.ts + store entegrasyon
[ ] Faz 3: format unlock buff + DimensionRow/Tab + multiplier lab
[ ] Faz 4: D4 anomaly köprüsü + combo glow
[ ] Faz 5: GDD/brain/tasks + research errata
[ ] (v2) Viral paket ADR ayrı
```

**Tahmini süre:** 4–6 geliştirici gün (tek agent oturumlarında 2–3 yoğun iterasyon).

---

## 8. Başarı metrikleri (oyuncu hissi — QA)

1. İlk **5 dk:** yalnızca D1–D2 satın alımı anlamlı; D3 merak metni (“ASMR açılıyor…”).
2. **1. shift:** görsel patlama + CPS bump (L2b buff) hissedilir.
3. **Mid run:** StatsTab’da CPS kaynağının ≥%40’ı boyut satırlarına atanabilir (çarpan lab).
4. **Active vs idle:** idle duvar korunur; active hâlâ kriz/anomali ile ayrışır.

---

## 9. İlgili dosyalar (özet)

| Dosya | Faz |
|--------|-----|
| `src/stores/game.ts` | 1–4 |
| `src/game/dimension_identity.ts` | 2 (yeni) |
| `src/game/unlocks.ts` | 1 |
| `src/models/types.ts` | 2–3 (buff state) |
| `src/components/DimensionRow.vue`, `DimensionsTab.vue` | 3–4 |
| `src/components/StatsTab.vue` | 3 |
| `GAME_DESIGN.md` | 0, 5 |
| `brain/decisions/0025-*.md` | 0 |
| `brain/scratchpad/harness/*` | 0, 1 |

---

## 10. Sonraki adım

**Faz 0 + Faz 1** ile başla: ADR yaz, baseline harness koş, `2 + shifts` + save migration uygula, harness yeşil olunca Faz 2’ye geç.
