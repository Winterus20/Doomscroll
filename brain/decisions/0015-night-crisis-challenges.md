# ADR-0015: Gece Kriz Meydan Okumaları — Faz 3 (Kurallar + Denge)

Tarih: 2026-10-02 · Sürüm: v0.17.0 adayı · Faz: 3/3 (Faz 1 motor + Faz 2 UI sonrası)

## Bağlam

Faz 1 (`src/game/challenges.ts` registry, store state/actions/getters, `resetRunState()`,
save v10, G1/G2 guard'ları, nötr `challengeProdMult`/`challengeHalted`) tamamlandı.
Faz 3, registry'deki C2–C8 modifier'larını Faz 1 getter'larına bağlar; plan
`brain/research/challenges-research-and-plan.md` v2 (§5–§7, §10) bağlayıcıdır.

## Kararlar

1. **Boyut-seviyesi kurallar `getDimensionMultiplier` içine** (C1 ödülü deseni):
   C3 (D1 ×0.01 taban × `challengeDim1Growth`), C4 (çift-tier `D_0`),
   C4 çift ×2 ödülü, 8/8 rozeti ×1.25, süre-metas (yalnızca aktif koşuda).
   Üç formül noktasını (getter + `update()` kopyası + zincir döngüsü) otomatik kapsar —
   plan §7.2'deki "birleştirme YAPILMAYACAK" yasağına uyulur.
2. **Global çarpanlar `challengeProdMult` / `challengeHalted` üzerinden**
   (C2 rampa, C8 fırtına). Her iki tüketim noktası da bu getter'ları okur.
3. **C2 (3 sn durma + 60 sn rampa):** `challengeHaltUntil` tam-durma sayacı,
   yeni `challengeSinceBuy` rampa saati. Tetikleyici `registerChallengeBuy()` —
   4 yaprak alım fonksiyonuna gömülü (`buyDimension`, `buyMaxDimension` (paket
   başına), `buyTickspeed`, `buyDimensionPacks`). `buyDimensionByMode`/`maxAll`
   ve tüm botlar bu yapraklardan geçtiği için ayrı hook gerekmez (çağrı zinciri
   doğrulandı: bot döngüsü `buyDimension`/`buyMaxDimension`/`buyTickspeed` çağırır).
4. **C3:** `update()`'te `challengeDim1Growth ×(1.004)^dt`; `dimensionShift()` /
   `buyGalaxy()` sonuna `relieveChallengeOnPrestige()` (salt-okunur kanca).
5. **C5:** `challengeCostInflation` sayacı, maliyet ×1.5^sayaç (`getDimensionCost`,
   `getDimensionPackCost`, `tickspeedCost`). Kilitlenme analizi: her 10'lu paket
   üretimi ×2 büyütürken maliyeti ×1.5 şişirir → geometrik alım dengede kalır,
   frekans alımları (boyut çarpanı vermeden şişirir) cezalandırılır. İstenen doku budur.
6. **C6:** `tickspeedMultiplier` içinde taban ×0.4 + üs ×0.5 (registry üzerinden).
7. **C7:** `unlockedDimensionsCount` + kolektif darboğaz sayaçları registry
   `maxDimensions` (6) ile kaplanır. Kilitli tier gereksinimleri D6'ya iner, her
   inilen tier başına miktar ×10; Küme D6 üzerinden ×5 maliyetle alınır.
   Tümü **başlangıç tahmini** — simülasyon kapısı (§10) geçilmeden dondurulmaz.
8. **C8:** `challengeNotificationDoom` sayacı `update()`'te birikir, hız
   ×(1 + 0.15×Sıçrama + 0.25×Küme); Sıçrama/Küme ×0.6 temizler; `offlineSimActive`
   iken DONAR. Fırtına: %100'de ×0.5, her +%25 taşmada ek ×0.75, taban ×0.15.
   **Koşu asla sessizce silinmez, fail-state yok** (§1.6 madde 3).
9. **Ödüller:** `challengeRewardEffects` zaten 8 ödülü registry'den okuyordu;
   Faz 3 bunları tüketim noktalarına bağladı (tıklama ×2, frekans +%15, maliyet
   −%10/−%15, Sıçrama 1.09, SP +%15 pre-floor). Güç bütçesi: tek ×1.875, çift
   ×3.75, başarım eğrisi ×3.04→×3.55 (+%17) — plan §6 bandı (×4–8) içinde.
10. **Süre-metas kademeli:** 8 en-iyi-süre toplamı; Bronz <8 sa ×1.1 / Gümüş <4 sa
    ×1.25 / Altın <90 dk ×1.4 — YALNIZCA challenge koşularında. Kayıtlı süresi
    olmayan challenge varken kademe yok. Eşikler simülasyonla doğrulanacak.
11. **8. başarım kategorisi "Meydan Okumalar"** (8 başarım, challenge başına 1;
    C8 gizli). L8-11 bayat yorum düzeltildi (59→67, ×2.93→×3.55 — node ile doğrulandı).

## Reddedilenler

- **Zamanlı challenge (Idle Planet Miner modeli):** offline/idle doğayla çelişir;
  süre yalnızca kayıt + replay bonusu, asla ceza değil.
- **Otomasyon ödülü:** ADR-0014 yasağı korunur (C1 botları kapatır ama ödülü pasif
  çarpandır; botlar merdivenden açılır).
- **SP-içeride:** challenge'da `singularityGain` 0 kalır; C8 ödülü koşu-dışı SP'ye biner.
- **Sessiz koşu-silme (v1 C8 cezası):** rage-quit üretir (AD'de bile en sert ceza
  koşuyu silmez). Fırtına debuff'uyla değiştirildi.
- **Tek eşikli süre-metas:** ölçülmüş tempo (ilk Şafak 3.87 sa) ile gerçek-dışı;
  üç kademe + simülasyon kapısı.
- **C²-kapsamı (Trimps Challenge²):** registry'de `repeatable: false` + genişleyebilir
  alanlar ayrıldı; tekrar-farming Faz 2+ uzantısı.

## Kalibrasyon durumu (dürüst kayıt)

- `playtest-5min.py` deseni çok-saatlik challenge koşularını kapsayamaz; repo'da
  headless ekonomi simülatörü yok → **tam koşu simülasyonu yapılamadı**.
- Yapılanlar: saf-fonksiyon birim testleri (esbuild+node: 8 ödül, 8/8, 3 zaman
  kademesi+sınırları ✓), güç-bütçe aritmetiği ✓ (×3.5444), C5 kilitlenme analizi,
  tempo bandı tutarlılık kontrolü (2. koşu kuralı %50–70 → 115–160 dk; C1–C3 bandı
  60–150 dk ile kesişir, fark kalıcı SP/nöral hızlanmayla kapanır).
- **Tüm eşikler "simüle edilemedi, varsayılanla yayınlandı":** C7 maliyet
  dengeleyicileri (×10/×5), C8 ivme katsayıları (0.15/0.25) + baz hız (0.01/sn),
  süre-metas kademeleri. İlk gerçek koşu verisiyle revize edilecek.

## Faz 2 ile birleşince kontrol edilecekler

- `ChallengesTab` + banner `challengeProdMult`/`challengeHalted`/ilerleme getter'larını
  okur (veri tarafı hazır, ek store değişikliği gerekmez).
- Header + SingularityTab "Tamamla" varyantı `completeChallenge()` çağırır;
  `singularityGain` challenge'da 0 döner (buton metni ödülü göstermeli).
- Altın kademe rozeti kozmetiği Faz 2'ye bırakıldı (veri: `challengeTimeTierMult`).
