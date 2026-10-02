# Gece Kriz Meydan Okumaları (Challenges) — Araştırma & Uygulama Planı v2

> Tarih: 2026-10-02 · Durum: Plan onayı bekliyor · Hedef sürüm: v0.17.0 adayı
> v1'den farkı: internet araştırması doğrulandı + genişletildi, tüm plan iddiaları codebase denetimiyle (satır numaralı) test edildi, **2 kritik v1 hatası düzeltildi** (başarım sayısı, süre hedefleri), C8 yeniden tasarlandı, offline/save kenar durumları eklendi.
> Backlog kaynağı: `brain/tasks/todo.md` → "Gece Kriz Meydan Okumaları (Normal Challenges): 8 adet özel kısıtlama"
> İlgili notlar: `brain/scratchpad/active-scratch.md` (Paradoks taslakları), `brain/decisions/0014` (otomasyon ödülü kuralı), `brain/research/economy-balancing-research.md` (ölçülmüş tempo verisi)

---

## 0. v1'de Düzeltilen Hatalar (Codebase Denetimi Sonucu)

v1'in tüm entegrasyon iddiaları `src/` üzerinde satır numaralı olarak doğrulandı. Hepsi doğruydu — **iki kritik hata hariç**:

| # | v1 iddiası | Gerçek | Sonuç |
|---|---|---|---|
| 1 | "mevcut 7×8=56 başarım" | **7 kategori ama 59 başarım** (automation=11). Tam set çarpanı ≈ **×3.04**, yorum satırındaki ×2.93 de bayat. | §6'da güç bütçesi 59→67 üzerinden yeniden hesaplandı; `achievements.ts` L8-11 yorumu drive-by fix listesine eklendi. |
| 2 | "C1–C3 ≈ 10–20 dk (ilk Şafak gücü)" | **Ölçülmüş ilk Şafak: 13.938 sn ≈ 3.87 saat** (economy research L419); 2. koşu kuralı %50–70 → ilk challenge koşusu **1.5–3 saat** bandında olur. 10–20 dk hedefi bu veriyle imkânsız. | §5 "Tempo Gerçeklik Kontrolü" eklendi; süre hedefleri dürüst bantlara çekildi; zaman-metas kademeli hale getirildi (§6.3). |

Ek v1 eksikleri (denetimde bulundu, v2'de kapatıldı): ADR-0014 "save v10" diyor ama `serialize()` hâlâ **9** yazıyor (§8.1'de çözüm); `update()` içinde **üçüncü** formül noktası (boyut zinciri döngüsü L3041-3058) v1'de ıskalanmıştı (§7.2'de kapsandı); challenge içinde Şafak otomatik-botunun (`game.ts` L3007) SP verip challenge'ı baypas edeceği v1'de yoktu (§7.4 G1'de guard eklendi); Header + SingularityTab'ta **iki ayrı** prestij butonu olduğu için ikisinin de challenge varyantı gerektiği v1'de tekil sanılmıştı (§9.2).

---

## 1. İnternet Araştırması (Doğrulanmış Kaynaklar)

### 1.1 Antimatter Dimensions — Normal Challenges (C1–C12) — BİRİNCİL MODEL
Kaynak: antimatterdimensions.wiki.gg/wiki/Normal_Challenges (wiki, Eylül 2026 güncel)

**Yapı (v1'de doğru aktarılmış, burada doğrulanan ek detaylarla):**
- İlk Infinity sonrası açılır; hedef her challenge'da aynı: **1.80e308'e ulaş**. Challenge içinde hedefi geçemezsin; varınca otomatik tamamlanır.
- **C1 otomatik tamamlanmış sayılır** (ilk Infinity'nin kendisi C1'dir) → "bedava ilk zafer" kancası. **Son 3 challenge 16 Infinity arkasında kilitlidir** → kademeli açılış.
- Kurallar **özgün kural değişiklikleridir**, düz çarpan kesintisi değil (C2: alımda üretim durur 3 dk'da döner; C4: alımda alt katmanlar silinir; C9: eşit maliyetli her şey zamlanır; C10: 6 boyut; C11: normal matter geçerse ödülsüz Boost'a zorlar; C12: zincir geometrisi değişir).
- **Ödüller:** tamamlama başına bir **Autobuyer** (hepsi kalıcı). Tümünü bitirme başarımı **"Antichallenged" → tüm boyutlar +%10**.
- **Meta oyun:** en iyi süreler kaydedilir; **hız başarımları** ("en iyi süreler toplamı < 5 sn" → challenge-içi +%40 boyut gücü) geç-oyun replay optimizasyonu yaratır. Tekrar koşusu rekor kırmak içindir.
- **Seçeneklerde challenge giriş/çıkış onayları** (Confirmations) vardır — v1'in ConfirmModal planını doğrular.

### 1.2 Revolution Idle — Trials (2024+ modern referans)
Kaynak: revolutionidle.wiki.gg/wiki/Trials (25 trial, Eylül 2026 güncel)

- 5 zorluk kademesi: Easy / Medium / Hard / Insane / Bonus. Tablo formatı bizle birebir: **Hedef + Handikap + Ödül**.
- **Set tamamlama ödülü** kuralı: "tüm Easy Trials → Revolutions skoru almaz + Medium Trials açılır" — yani **kademe ödülü = QoL + sonraki kademe kilidi**. Bu, bizim C7/C8 kademeli kilit + 8/8 meta tasarımımızı doğrular.
- Her trial **benzersiz kalıcı ödül** verir (yığın çarpan değil, işlevsellik/QoL çeşitliliği).
- Ders: ödül tablosunu tek tip çarpan yapma; en az 2–3 ödülü QoL/fonksiyonel çeşitlendir (bizde: maliyet indirimleri + Boost tabanı + SP — zaten çeşitli, korunur).

### 1.3 Trimps — Challenge² Modeli
Kaynak: trimps.fandom.com/wiki/Challenge%C2%B2
- Aynı challenge'ın sertleşmiş **tekrarlanabilir** sürümü; kalıcı stat bonusu biriktirir. "Challenge = tıkanınca yapılan iş" hissini kırar.
- Ders: v1'de de vardı, korunur — **ancak v1 kapsamına alınmaz**. Registry'e `repeatable: false` + genişleyebilir `tiers` alanı konur (§7.1), C²/tekrar-farming Faz 2+ uzantısı olarak not edilir (Synergism'deki "×125 tamamla" başarımları da aynı sepette).

### 1.4 Synergism — Temiz Kısıtlama Dili
Kaynak: synergism topluluk özetleri
- "No Accelerators", "No Shards" gibi **tek sistemi kapatan temiz kısıtlamalar**; tekrar sayısına bağlı başarımlar.
- Ders: kural cümlesi tek bakışta anlaşılmalı — bizim 8 kuralın kart metni ≤ 2 satır olacak (§9.1).

### 1.5 Idle Planet Miner — Reddedilen Model
Kaynak: idle-planet-miner.fandom.com/wiki/Challenges
- 24 saatlik zamanlı challenge: süre dolunca ne yaptıysan ödül kademesi. Bizim offline/idle doğamızla çelişir (oyuncu uyurken sayaç işlememeli).
- **Reddedildi** (gerekçe ADR-0015'e işlenecek): zaman baskısı yerine koşu-bazlı hedef; süre yalnızca **kayıt** olarak tutulur, ceza olarak değil.

### 1.6 Topluluk Tasarım İlkeleri (r/incremental_games + araştırma notları)
1. **Otomasyonu challenge arkasına kilitlemek oyuncu kaybının 1 numaralı sebebidir** → ADR-0014 kuralı korunur: botlar merdivenden açılır, challenge ödülleri kalıcı pasif/QoL olur.
2. **"Challenge kısmı çok hızlı — faydanın çoğunu 5–10 dakikada alırsın"** (beğenilen challenge yorumu) ↔ **"saatler süren challenge = anında bırakma sebebi"**. Bizim koşular saatler sürecek (§5) → telafi mekanizmaları zorunlu: botlar açık (C1 hariç), offline ilerleme çalışır, koşu save'lenir, çıkış cezası yok.
3. **Sert fail-state'ler rage-quit üretir.** AD'nin en sert normal-challenge cezası bile (C11) koşuyu silmez, sadece ödülsüz Boost'a zorlar. → C8'in v1'deki "ödülsüz koşu sıfırlama" cezası **yeniden tasarlandı** (§6.2 C8: fırtına debuff'u, koşu asla sessizce silinmez).
4. **Challenge = yatırımdır, kayıp zaman değil** (Trimps: koşu ödülü + kalıcı bonus) → giriş onayı "mevcut koşu sıfırlanacak" diye açıkça uyarır, çıkış her zaman serbesttir, ceza yoktur.

---

## 2. Codebase Denetimi — Doğrulanmış Entegrasyon Noktaları

Denetim tarihi: 2026-10-02, salt-okunur. `src/stores/game.ts` **3650 satır**. `src/` içinde "challenge" araması **0 sonuç** → yeşil alan.

### 2.1 Üretim formülleri: ÜÇ nokta var (v1 ikisini biliyordu)
| Nokta | Konum | İçerik | Challenge ilgisi |
|---|---|---|---|
| `matterPerSecond` getter | L1800–1836 | D1 × dim-çarpan × tickspeed × stance/buff/lab/başarım/debuff/netRatio | Global üretim çarpanları (durma, fırtına) buraya |
| `update()` içi kopya | L3060–3100 (formül L3063–3074) | Aynı zincir + slacker leech ayrı (L3083–3092) | Global çarpanlar **buraya da** (getter ile birebir birleştirme YAPILMAYACAK — leech/netRatio farkı davranış değiştirir; §7.2'de paylaşılan helper kararı) |
| Boyut-zincir döngüsü | L3041–3058 | `getDimensionMultiplier` + `achievementMultiplier` kullanır (stance/buff yok) | Boyut-seviyesi kurallar `getDimensionMultiplier` içine konursa **üç noktayı da otomatik kapsar** |

### 2.2 Tek-nokta hook'lar (tümü v1'deki satır iddialarıyla eşleşti)
| Sistem | Konum |
|---|---|
| `getDimensionMultiplier(tier)` | L1382–1434 (C1/C3/C4/C7 ödül+kurallar → tek nokta) |
| `tickspeedMultiplier` / `tickspeedCost` | L1051–1064 / L1067–1080 (C6) |
| `getDimensionCost` / `getDimensionPackCost` | L1437–1441 / L1444–1453 (C5 zammı + C5/C6 ödül indirimleri) |
| `buyDimension` / `buyMaxDimension` / `buyTickspeed` / `maxAll` / `buyDimensionByMode` / `buyDimensionPacks` | L1916 / L1935 / L1959 / L1973 / L3228 / L3234 (C2 tetikleyici, C5 enflasyon sayacı — çağrı zinciri Aşama 1'de doğrulanacak: pack alımları `buyDimension` içinden geçmiyorsa ayrı hook gerekir) |
| Anomali spawn gate / `spawnAnomaly` | `update()` L2833–2839 (ileride IC'ler için hazır, mevcut 8 kural kullanmaz) |
| Slacker spawn gate / `spawnSlacker` | `update()` L2841–2850 (aynı — yedekte) |
| Otomatik-bot döngüsü | L2967–3011; **Şafak botu L3007 `singularityReset(false)` çağırır → challenge guard'ı ŞART (§7.4 G1)** |
| `canSingularity` / `singularityGain` | L1309–1311 / L1372–1379 (`singularityGain` içinde `dawnSpeedMult` zaten var — C8 ödülü oraya çarpan olarak biner) |
| `unlockedDimensionsCount` (`min(8, 4+shifts)`) | L1041–1043 (C7 üst sınır) |
| `manualClickPower` | L1746–1797 (C3 ödülü ×2) |
| `achievementMultiplier` (bilinçli olarak `singularityGain`'e uygulanmaz, L1853) | L1854–1856 |
| `simulateOfflineProgress` | L3171–3216 — **gerçek `update()`'i sürer**, kural kopyası yok → challenge kuralları offline otomatik çalışır (§7.5'te C8 dondurma kararı) |

### 2.3 `singularityReset()` — L2137–2188 (v1 L2137 iddiası doğru, gövde tamamen inline)
- SP bloğu (L2140–2143) + koşu sıfırlama (L2145–2159: matter, dims, tickspeed, shifts, galaxies, slackers, sacrifice, algorithmUpgrades, refresh) + choice-node budama (L2161–2170) + optimizer ramp sıfırlama (L2172–2176).
- **Sıfırlamadıkları** (challenge girişinde de korunur — prestijle birebir tutarlılık): `caffeineEnergy`, `crisisBackfireDebuff`, lab durumu, `activeBuffs`, `floatingAnomalies`, `currentStance`, `clickCombo`, `dpsHistory`, bot zamanlayıcıları.
- `dimensionShift()` (L2075) ve `buyGalaxy()` (L2105) **farklı alt-kümeler** sıfırlar → `resetRunState()` **yalnızca singularity alt-kümesini** çıkarır; shift/galaxy gövdelerine dokunulmaz (risk disiplini). C3'ün "Sıçrama/Küme'de sıfırlanır" kuralı bu iki fonksiyona **salt-okunur** 1'er satırla bağlanır.
- State: `state` L863–1032, `stats` (12 alan) L1018–1031, `buyAmount` L967. Run-kalıcı ayrımı yalnızca yorumla yapılmış — challenge alanları `// — Gece Krizi (Challenge) koşu durumu —` bloğuyla eklenir.

### 2.4 Kayıt (save) — v1 planı doğru, ADR çelişkisi bulundu
- `serialize()` **hâlâ `version: 9` yazıyor (L3315)**; `deserialize()` L3385–3648, `saveVersion < 10` dalı L3395–3398 (singularities göçü). ADR-0014 "Save payload v10" diyor ama kod 9'da kalmış → **bu planla 10'a çıkarılarak ADR-kod çelişkisi kapatılır** (§8.1). Yabanda v10 kayıt yok, göç güvenli.
- `SerializedPlayerState`: `types.ts` L261–328. `UnlockReq` types.ts'te **değil**, `src/game/unlocks.ts` L15–22'de; `{kind:'singularities'}` desteği `checkUnlock` L74–75 + `unlockProgress` L103–104'te hazır ama hiçbir `FEATURE_UNLOCKS` girdisi bugün kullanmıyor → challenge girdisi ilk olacak.
- `FEATURE_UNLOCKS` L125–231: 15 girdi, order 10–140 → yeni girdi `order: 150`.
- `calcAchievementMultiplier` L171–175 + `countCompletedRows` L166–168 **kategorileri veriden sayar → 8. kategori otomatik işler** (v1 iddiası doğrulandı).

### 2.5 UI iskeleti (tümü doğrulandı, yeniden kullanılabilir)
- `TabHero.vue` (53 satır): `icon/title/badge/subtitle/accent` + `progress/stats/alert` slotları.
- `AchievementsTab.vue` (114 satır): TabHero + kategori ilerlemesi + kart grid → `ChallengesTab.vue` şablonu.
- `ConfirmModal.vue` (54 satır): `title/message/confirmLabel/danger` + `confirm/cancel` → giriş/çıkış onayları (`settings.confirmDialogs` kapısıyla, Header L85 deseni).
- `App.vue`: `TabId` L30 · `tabLocked` L38–47 · `TAB_ORDER` L68–70 (kısayollar buradan üretilir — **9. sekme 1–9 tuşlarına kaydırır, achievements 7→8, stats 8→9**) · bekçi watcher L90–97 (yeni `challengesUnlocked` diziye eklenecek) · nav L231–319 · içerik zinciri L346–355 · "Sonraki Açılacak" bandı `nextLocked` ile otomatik gelir.
- **İki prestij butonu var** (v1 tekil sanmıştı): Header L535–546 (`handleSingularity` L82–90) + SingularityTab butonu (handler L36, metin L75, modal L132–138) → **ikisi de challenge varyantı alır** (§9.2).

---

## 5. Tempo Gerçeklik Kontrolü (v2'de YENİ — v1'in en büyük açığı)

Ölçülmüş veri (`economy-balancing-research.md` L419): **ilk Şafak 13.938 sn ≈ 3.87 saat** (tüm yan sistemler aktif, 5 tıklama/2 sn). 2. koşu kuralı: ilk koşunun **%50–70'i** → ilk challenge denemesi **≈ 1.5–3 saat** sürer. v1'in "10–20 dk" hedefleri bu veriyle çelişir; hedefler aşağıda düzeltilmiştir.

**Tasarım kararları (bu veriden türetilen):**
1. **Hedef 1.79e308'de sabit kalır** (AD saflığı + tamamlama tespiti bedava: `canSingularity && activeChallenge`).
2. **Kademeli açılış** (AD'nin "son 3 challenge 16 Infinity arkasında" kuralının karşılığı — uzun ilk koşuları erken yüke bindirmez): C1–C4 ilk Tekillik'te, C5–C6 3 Tekillik'te, C7–C8 5 Tekillik'te açılır. Registry'deki `unlock?: UnlockReq` alanı bunun içindir; eşikler simülasyonda kalibre edilir.
3. **Dürüst süre bantları** (duvar-saati; çoğu idle/offline geçirilebilir): C1–C3 ilk denemede 60–150 dk; C4–C6 45–120 dk; C7–C8 45–90 dk (oynanmış 6 ödül çarpanı + birikmiş SP ile hızlanmış). Bunlar başlangıç tahminidir — **Aşama 3'teki simülasyon kapısı** (§10) geçilmeden dondurulmaz.
4. **Sıkıcılık telafileri** (topluluk ilkesi §1.6 madde 2): C1 hariç tüm challenge'larda botlar çalışır; koşu save'lenir + offline ilerler; giriş/çıkış her zaman serbest ve cezasızdır; C2'nin bulmacası burst-alım stratejisidir, mikro-yönetim değildir.
5. **Zaman-metas kademeli olur** (tek "< 20 dk" kapısı gerçek-dışı): §6.3'te üç kademe, eşikler simülasyonla sabitlenir.

---

## 6. Önerilen Tasarım: "Gece Kriz Meydan Okumaları" (8 Challenge)

**Konum:** Faz 1 (Şafak sonrası). Sekme kilidi: **1 Tekillik** (`{kind:'singularities', count:1}`, `order: 150`). Hedef her challenge'da aynı: **1.79e308 Dopamin**. Challenge içinde SP kazanılmaz (buton "Tamamla"ya dönüşür, §9.2); ödül challenge verir. En iyi süre kaydedilir (offline süre dahil — sayaç dürüsttür).

| # | İsim | Kural (hiciv teması) | Hook (§2) | Ödül (kalıcı) | Açılış |
|---|---|---|---|---|---|
| C1 | **Uçak Modu** | Otomatik Kaydırma Botları devre dışı; her şey elle (maks-al + kısayollar çalışır). | Bot döngüsü L2970 atlama | Tüm boyutlar **×1.5** | 1 Tekillik |
| C2 | **Şarj Aleti Temassızlığı** | Her alım üretimi 3 sn durdurur, sonra 60 sn'de lineer döner. Botlar açıktır — bulmaca: botları kapatıp burst-alım yapmak. | `buy*` tetikleyici + paylaşılan durma çarpanı (§7.2) | Algoritma Frekansı etkisi **+%15** | 1 Tekillik |
| C3 | **Önbellekteki Videolar** | D1 %1 güçte ama sn'de ×1.004 büyüyen çarpanla; Sıçrama/Küme'de sıfırlanır. | `getDimensionMultiplier(1)` + state'te üstel sayaç | Tıklama gücü **×2** | 1 Tekillik |
| C4 | **Sansür Matrisi** | Yalnızca tek boyutlar (1-3-5-7) üretir. | `getDimensionMultiplier` çift-tier 0 | Çift boyutlar **×2** | 1 Tekillik |
| C5 | **Gece Enflasyonu** | Her boyut/frekans alımı diğer tüm boyutların maliyetini koşu-içi birikimli ×1.5 şişirir. (Scratchpad'deki "10x" reddedildi: 10x kilitlenme üretir, 1.5x strateji üretir.) | Maliyet getter'ları + `buy*` sayacı | Boyut maliyetleri **-%10** | 3 Tekillik |
| C6 | **Göz Kuruluğu** | Frekans tabanı %40, alım çarpanı yarıya. | `tickspeedMultiplier` | Frekans maliyeti **-%15** | 3 Tekillik |
| C7 | **Hesap Kısıtlaması** | Yalnızca 6 boyut; Sıçrama/Küme maliyetleri yeniden dengeli. | `unlockedDimensionsCount` üst sınır + shift/galaxy maliyet getter'ları | Sıçrama gücü **1.07 → 1.09** | 5 Tekillik |
| C8 | **Grup Sohbeti Cehennemi** | "Okunmamış bildirim" sayacı dolar (hız Sıçrama/Küme ile ivmelenir); Sıçrama/Küme sayacı %40 temizler. Sayaç %100'e ulaşırsa **Bildirim Fırtınası**: üretim ×0.5, her +%25 taşmada ek ×0.75 (taban ×0.15). **Koşu asla sessizce silinmez, fail-state yok** (gerekçe §1.6 madde 3; v1'in "ödülsüz sıfırlama" cezası reddedildi). Hızlı ve planlı oyna! | `update()` sayacı + paylaşılan üretim çarpanı; offline'da donar (§7.5) | SP kazancı **+%15** (pre-floor çarpan; `dawnSpeedMult` üzerinden — 1e308'de floor'a takılır, 1e616+ bandında hissedilir; en zor challenge'ın geç-oyun ödülü) | 5 Tekillik |

**Ödül güç bütçesi** (economy research: kalıcı koşu çarpanları toplam < ×10–30): tek boyutlar ×1.5×1.25=**×1.875**, çift boyutlar ×1.5×2×1.25=**×3.75**, tıklama ×2, frekans etkisi +15%, maliyet indirimleri, SP +15% → toplam hesap gücü ≈ ×4–8 bandı. Bütçe içinde. Ek: 8 yeni başarım **kademeli** açılır (tamamlama başına ×1.012) → tam set ×3.04→**×3.55** (+%17, kazanılmış ve yayılmış — kabul).

### 6.1 Meta ödüller
- **8/8 tamamlama:** "Zombi Bakışı Rozeti" → tüm boyutlar kalıcı **+%25** (AD "Antichallenged" eşdeğeri; AD'de +%10 — bizimki daha cömert çünkü koşularımız daha uzun).
- **8. başarım kategorisi "Meydan Okumalar"** (8 başarım: her challenge'a 1) — formül veriden saydığı için otomatik uyum (§2.4). `achievements.ts` L8–11'deki bayat "56+7 / ×2.93" yorumu aynı işte düzeltilir (59 → 67).

### 6.3 Kademeli süre-metas (v1'in tek eşiği yerine)
En iyi süreler toplamı üzerinden üç kademe (eşikler **simülasyon kapısıyla** sabitlenir, başlangıç tahminleri): **Bronz** (toplam < 8 sa) → challenge-koşularında üretim +%10 (replay'leri hızlandıran döngü — AD'nin "challenge-içi bonus" fikri); **Gümüş** (< 4 sa) → +%25; **Altın** (< 90 dk) → +%40 + rozet. Bronz erişilebilir, Altın geç-oyun optimizasyonudur.

---

## 7. Teknik Mimari Plan

### 7.1 Yeni dosya: `src/game/challenges.ts` (achievements.ts deseni)
```ts
export interface ChallengeModifiers {
  autobuyersDisabled?: boolean;          // C1
  productionHaltOnBuySec?: number;        // C2: durma + rampa (60 sn sabit)
  dim1ExpoGrowthPerSec?: number;          // C3
  dim1BasePowerMult?: number;             // C3: 0.01
  oddTiersOnly?: boolean;                 // C4
  costInflationOnBuy?: number;            // C5: 1.5 birikimli
  tickspeedBaseMult?: number;             // C6: 0.4
  tickspeedBuyMultScale?: number;         // C6: 0.5
  maxDimensions?: number;                 // C7: 6
  notificationDoomRatePerSec?: number;    // C8: Sayaç hızı (shift/galaxy ile ivme)
}
export interface ChallengeDef {
  id: string; order: number; icon: string;
  name: string; flavor: string;           // hicivli 1 satır
  ruleDesc: string; rewardDesc: string;
  goalMatter: string;                     // "1.79e308" — Decimal string; IC modeli için genişler
  unlock?: UnlockReq;                     // C1–C4: 1 Tekillik; C5–C6: 3; C7–C8: 5
  modifiers: ChallengeModifiers;
  reward: { kind: string; value: number };
  repeatable?: false;                     // C²/Tekrar-farming Faz 2+ uzantısı için ayrılmış alan
}
export const CHALLENGES: ChallengeDef[] = [...8 kayıt...];
export function getChallengeById(id: string): ChallengeDef | undefined;
export function challengeRewardEffects(completedIds: string[]): RewardPaketi; // saf fonksiyon (neuralEffects deseni)
```
Kural: store asla challenge id'sini hardcode etmez; hep registry + `activeChallengeDef` üzerinden okur.

### 7.2 Üretim çarpanlarının uygulanması (v1'in "getter'a yönlendir" refactor'ü yerine)
`update()` kopyası ile getter **birebir birleştirilmez** (leech/netRatio farkı davranış değiştirir — §2.1). Bunun yerine:
1. **Boyut-seviyesi kurallar** (C1 ödülü, C3, C4, C4/C7 ödülleri, 8/8 rozeti, süre-metas bonusu) → `getDimensionMultiplier` (L1382) içine: **üç formül noktasını da otomatik kapsar.**
2. **Global üretim çarpanları** (C2 durma, C8 fırtına) → yeni `challengeProdMult` + `challengeHalted` getter'ları; **iki tüketim noktası**: `matterPerSecond` (L1800) ve `update()` kopyası (L3063). İki satırlık cerrahi ekleme, davranış riski yok.
3. **Maliyet kuralları** (C5 zammı, C5/C6 ödül indirimleri) → `getDimensionCost`/`getDimensionPackCost` + Sıçrama/Küme maliyet getter'ları (C7).
4. C3 üstel sayacı: state'te `challengeDim1Growth` (Decimal); `update()`'te birikir; `dimensionShift()` + `buyGalaxy()` sonuna salt-okunur sıfırlama satırı.

### 7.3 Store değişiklikleri (`src/stores/game.ts`)
1. **State** (`// — Gece Krizi —` bloğu): `activeChallenge: string | null`, `completedChallenges: string[]`, `challengeBestTimes: Record<string, number>`, `challengeElapsed`, `challengeHaltUntil`, `challengeCostInflation`, `challengeNotificationDoom`, `challengeDim1Growth`.
2. **Helper çıkarımı (yalnızca singularity alt-kümesi):** `singularityReset()` L2140–2176 gövdesi `resetRunState()` private action'ına taşınır; `singularityReset` = SP bloğu + `resetRunState()`. Challenge giriş/çıkış/tamamlama yalnızca `resetRunState()` çağırır (SP yok). Shift/galaxy gövdelerine dokunulmaz.
3. **Actions:** `enterChallenge(id)` (ConfirmModal onaylı — "mevcut koşu sıfırlanacak" uyarısıyla → reset + set + `challengeElapsed=0`), `exitChallenge()` (cezasız vazgeç → reset + temizle), `completeChallenge()` (süre kaydı + ödül + toast/konfeti + temizle + fresh koşu).
4. **Getter'lar:** `activeChallengeDef`, `challengeRewardEffects`, `challengesUnlocked` (merdiven), `challengeProdMult`, `challengeHalted`, `challengeProgress01` (log ilerleme — banner çubuğu için).
5. **Mevcut getter'lara tek satırlık çarpan eklemeleri** (`getDimensionMultiplier`, `tickspeedMultiplier`, `manualClickPower`, maliyet getter'ları, `singularityGain` → C8 pre-floor çarpanı).

### 7.4 `update()` kancaları (sıralı kontrol listesi)
- **G1 (kritik):** Şafak botu (L3007) — `activeChallenge` varken `singularityReset(false)` yerine `completeChallenge()` çağrılır (koşul `canSingularity` ile zaten aynı). Bu guard olmadan bot SP basıp challenge'ı baypas eder.
- **G2:** `canSingularity && activeChallenge` → `completeChallenge()` (hedef kontrolü; L1309 yeniden kullanılır).
- **G3:** C2 durma sayacı + C3 üstel birikim + C8 sayaç artışı ve fırtına hesabı.
- **G4:** Challenge içinde SP butonları "Tamamla" moduna geçer — veri tarafı: `singularityGain` challenge'da 0 döner, buton metni/kazanç önizlemesi ödülü gösterir (§9.2).

### 7.5 Offline davranışı
`simulateOfflineProgress` gerçek `update()`'i sürdüğü için kurallar offline otomatik işler. İki karar: **C8 sayacı ve fırtına `offlineSimActive` iken donar** (uyuyan oyuncu cezalandırılmaz; tamamlama mümkündür); `challengeElapsed`'e offline süre dahildir (sayaç dürüsttür, idle-strateji suistimali yaratmaz çünkü beklemek süreyi büyütür).

---

## 8. Save / Migrasyon

### 8.1 version 9 → 10 (ADR-0014 çelişkisini kapatır)
- `serialize()` L3315: `version: 9` → **10**. Yabanda v10 kayıt hiç yazılmadığı için göç güvenlidir; mevcut `saveVersion < 10` dalı (L3395) eski kayıtları aynen karşılar.
- `SerializedPlayerState`'e (types.ts L261): `activeChallenge?: string | null`, `completedChallenges?: string[]`, `challengeBestTimes?: Record<string, number>` (tümü opsiyonel — eski kayıtlar sorunsuz açılır).
- `deserialize()`'da whitelist doğrulaması (`neuralNodesBought` deseni, L3529–3544 aynen): `activeChallenge` registry'de yoksa `null`; `completedChallenges` bilinmeyen id'lerden arındırılır. Yüklemede aktif challenge varsa koşu o challenge'da devam eder.
- `stats`'e `challengesCompleted: number` ekle (PlayerStats L175–188 + serialize/deserialize + sıfırlanma davranışı: istatistikler koşu-sıfırlamada silinmez — mevcut desen korunur).

---

## 9. UI Planı

### 9.1 `ChallengesTab.vue` (yeni — AchievementsTab şablonu)
`TabHero` + 8 kart grid: kilitli (merdiven metni + ilerleme) / aktif (canlı hedef çubuğu + "Vazgeç") / tamam (ödül rozeti + en iyi süre) / başlanabilir ("BAŞLAT" → ConfirmModal). Kural metni ≤ 2 satır (§1.4). Alt bant: 8/8 rozeti + kademeli süre-metas ilerlemesi. **Aktif-challenge banner'ı** (Header altı, ince): kural özeti + `challengeProgress01` çubuğu + vazgeç butonu — oyuncu başka sekmedeyken bağlamı kaybetmesin.

### 9.2 App.vue + Header + SingularityTab entegrasyon kontrol listesi
`TabId`'ye `'challenges'` (L30) · `tabLocked` girdisi (L38–47) · `TAB_ORDER`'da singularity'den sonra (L68–70 — kısayollar 1–9 olur, achievements 7→8, stats 8→9; mobil nav taşması gözle kontrol edilir) · bekçi watcher'a `challengesUnlocked` (L91) · nav butonu + kilitli fallback (L231–319 deseni) · içerik `v-else-if` (L346–355) · `FEATURE_UNLOCKS` girdisi (`order: 150`, `req: {kind:'singularities', count:1}`) → kilitli-kart UX ve "Sonraki Açılacak" bandı bedavaya gelir. **Header (L535) ve SingularityTab (L75) butonları**: challenge aktifken "Meydan Okumayı Tamamla" + ödül önizlemesi; `settings.confirmDialogs` kapısı mevcut desenle.

---

## 10. Denge & Doğrulama (kapılar)

- **Simülasyon kapısı (zorunlu):** `playtest-5min.py` deseniyle her challenge için ilk-deneme süresi ölçülür; §5 bantlarından sapan kural/eşik yayınlanmadan ayarlanır. Eşikler (C5–C8 Tekillik sayıları, süre-metas kademeleri) bu kapının çıktısıyla dondurulur.
- **Güç-bütçe kapısı:** tam ödül seti §6'daki ×4–8 bandını aşamaz; başarım eğrisi kademeli kalır.
- **Build kapısı:** `npm run build` (vue-tsc + vite) 0 hata.
- **ADR:** `brain/decisions/0015-night-crisis-challenges.md` (reddedilenler: zamanlı challenge, otomasyon ödülü, SP-içeride, sessiz koşu-silme, tek eşikli süre-metas, C²-kapsamı — gerekçeleriyle).

---

## 11. Uygulama Sıralaması (tek sürüm, 3 aşamalı commit akışı)

- **Aşama 1 — Motor:** `challenges.ts` registry + types + store state/actions/getters + `resetRunState()` çıkarımı + save v10 + unlock kaydı + G1 bot guard'ı. (C1 ile uçtan uca çalışan iskelet; tamamlama Header butonundan tetiklenir.)
- **Aşama 2 — UI:** `ChallengesTab.vue` + §9.2 kontrol listesi + banner + iki buton varyantı + `achievements.ts` yorum fix'i.
- **Aşama 3 — İçerik & denge:** C2–C8 kuralları + meta ödüller + 8. başarım kategorisi + simülasyon kalibrasyonu + ADR-0015 + brain senkronu (todo→completed, v0.17.0 adayı).

**İleri uyumluluk:** `goalMatter` alanı ve genişleyebilir `ChallengeModifiers`, Faz 2'deki **12 Sürgülü Uyku Baskısı Matrisi** için de temel olur (sürgüler = oyuncunun seçtiği challenge seti); `repeatable` alanı C²/Tekrar-farming uzantısına ayrılmıştır.
