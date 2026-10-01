# Özellik Kilitleme (Progressive Feature Unlock) Araştırması & Planı

> Tarih: 2026-10-01 · Durum: Uygulandı (v0.11.0) · ADR: `brain/decisions/0009-feature-unlock-ladder.md`
> Kullanıcı talebi: "Oyundaki özellikler sırayla açılsın, hepsi başlangıçta açık olmasın."

---

## 1. İnternet Araştırması (Referans Oyunları)

### Cookie Clicker (Wiki / Fandom / Steam rehberleri)
- **Binalar sırayla açılır:** Yeni bina, önceki binayı sahip olmayı gerektirir.
- **Yükseltmeler sahiplik eşiğinde açılır:** Bina sahipliği 1 / 5 / 15 / 25 adette yeni yükseltme kartları belirir.
- **Mini-oyunlar bina seviyesiyle açılır:** Garden (Farm), Grimoire (Wizard Tower) vb. — building leveling ile.
- **Wrinklers** ~1M cookie'den sonra belirir.
- Topluluk kuralı: "Bir sonraki binaya geçmeden önce her binadan 15 adet al."

### Antimatter Dimensions (Wiki / NG+3CR rehberi)
- **8 boyut, DimBoost ile sırayla açılır** (her boost bir sonraki boyutu açar).
- **Tickspeed başlangıçtandır** (temel döngü parçası olduğu için).
- **Dimensional Sacrifice:** 5. boost'tan sonra açılır.
- **Galaxies:** 4 boost'tan sonra.
- Autobuyer'lar da sırayla açılır (tier → tickspeed → boost → galaxy).

### Synergism (Steam / Reddit / namu.wiki)
- **Elementler sıkı sırayla açılır:** Coin → Diamond → Shard → Particle → Ant → Cube.
- **Zorluklar (Challenges) katmanlarla açılır:** 1–5 Shard'a kadar, 6–10 Particle'a kadar...
- Oyuncu geri bildirimi: "Her açılma farklı bir oyun oynamak gibi hissettirdi."

### Idle Oyun UX Literatürü (Mind Studios, GameAnalytics, Gridinc)
- **Novellik ritmi:** Her katmanda 1–2 yeni şey; "duvar" yerine merdiven.
- **Sonraki hedef görünümü:** Oyuncunun "bir el önde" görmesi (one-hand-ahead) tutma oranını artırır.
- **60/40 kuralı:** Pasif %60, aktif %40.
- **Kilitli öğe = hedef:** Kilitli kart üzerinde şart metni ve ilerleme göstermek motivasyonu artırır.

---

## 2. Mevcut Durum Denetimi (Kod)

### Zaten sırayla açılanlar ✅
| Özellik | Şart |
|---|---|
| D1–D4 | Başlangıç |
| D5–D8 | Sıçrama başına +1 (`4 + dimensionShifts`) |
| Önbellek Temizleme | 5 Sıçrama veya D8 |
| Botlar (tek tek) | `AUTOBUYER_PROGRESS_REQ` (tier/shift/galaxy) — iyi tasarım |
| Bulk mod | 2.5e11 + 1 Sıçrama |
| Max mod | 1e22 + 1 Küme |
| Vicdan Azapları | 1 Sıçrama veya 1e5 Dopamin |

### Sekme kilitlemeleri (karmaşık şartlar) ⚠️
| Sekme | Şart | Sorun |
|---|---|---|
| Lab | D2 sahibi **veya** 1 Sıçrama **veya** 100 Dopamin | 100 Dopamin ~30 sn; çok erken |
| Kriz | D4 sahibi veya 2 Sıçrama veya 1e6 | Farklı şart tipleri karışık |
| Botlar | 1 Tekillik veya 1e4 | 1e4 = D3 maliyeti; çok erken |
| Koloni | 1e13 | OK |
| Şafak | 1e30 | OK |

### Başlangıçta hepsi açık olanlar ❌ (kullanıcı talebiyle çelişen)
- 3 stance birden (Yorgan Altı / Çılgın Kaydırma / Düşük Parlaklık)
- Akışı Yenile butonu
- Gece Krizleri doğurması (45–75 sn'den itibaren)
- 6 Algoritma Yaması kartı (sadece maliyet kilidi)
- 5 Lab tohumu (sadece maliyet kilidi)
- 4 Kriz büyücü kartı (sadece enerji kilidi)

### Yapısal sorunlar
1. Kilitleme mantığı getter'lara dağılmış (`labUnlocked`, `crisisUnlocked`...) — tek kaynak yok.
2. Şart tipleri karışık (sahiplik / Dopamin / sıçrama / tekillik).
3. Kilitli kartlarda **şart metni yok** — oyuncu nasıl açacağını bilmiyor.
4. "Sonraki hedef" göstergesi yok.

---

## 3. En İyi Plan: Tek Kaynaklı Özellik Merdiveni

### 3.1 Yeni modül: `src/game/unlocks.ts`

```ts
export type UnlockReq =
  | { kind: 'dimBought'; tier: number; count: number }  // Dn'i X adet sahibi ol
  | { kind: 'dopamine'; amount: string }                // X Dopamin biriktir
  | { kind: 'shifts'; count: number }                   // X Akış Sıçraması
  | { kind: 'galaxies'; count: number }                 // X Akış Kümesi
  | { kind: 'singularities'; count: number }            // X Tekillik (prestij sonrası)
  | { kind: 'anomalies'; count: number }                // X Gece Krizi yakala

export interface FeatureUnlock {
  id: string
  name: string        // 'Algoritma Laboratuvarı'
  hint: string        // 'D2 formatını 25 adet sahibi ol'
  req: UnlockReq
  order: number       // görünürlük sırası
}

export const FEATURE_UNLOCKS: FeatureUnlock[] = [ ... ]
export function checkUnlock(state, feature): boolean
export function unlockProgress(state, feature): { current: number; target: number }
export function nextLocked(state): FeatureUnlock | null  // "Sonraki Açılacak"
```

**Kritik tasarım:** Kilitlemeler **state'ten türetilmiş hesaplanır**, boolean flag olarak save edilmez → eski save'larla %100 uyumlu, migrasyon gerekmez.

### 3.2 Önerilen Merdiven (Faz 0 — Yatak & Telefon)

| # | Özellik | Şart | Gerekçe |
|---|---|---|---|
| 1 | D1–D4, tıklama, Frekans (Hz), Max All, Yorgan Altı stance | — | Çekirdek döngü (AD modeli) |
| 2 | Gece Krizleri doğurması | 100 Dopamin | Oyuncu önce tıklamayı öğrenir |
| 3 | Stance: Çılgın Kaydırma + Düşük Parlaklık | D1'i 50 adet sahibi ol | Stance ne olduğunu gördükten sonra |
| 4 | Akışı Yenile | 1.000 Dopamin | İlk Frekans alımından sonra anlamlı |
| 5 | Algoritma Yamaları dükkanı | 500 Dopamin | İlk yama (play_speed) zaten 500 |
| 6 | **Lab sekmesi** | **D2'yi 25 adet sahibi ol** | Cookie Clicker kuralı (15–25); 100 Dopamin yerine |
| 7 | Lab tohumları kademeli | Kedi: Lab açılır / Kaşar: D2×50 / Subway: D3×25 / Phonk: D4×25 / Brainrot: mutasyon | Sekme içinde sürpriz ritmi |
| 8 | **Botlar sekmesi** | **1e5 Dopamin** | 1e4 → 1e5 (D3 çevresi); ilk bot dim1 |
| 9 | Botlar dim2–dim8, Hz, Sıçrama, Küme | Mevcut `AUTOBUYER_PROGRESS_REQ` | Zaten iyi — aynen korunur |
| 10 | **Kriz sekmesi** | **D4'ü 25 adet sahibi ol** | Lab ile aynı kural, tutarlılık |
| 11 | Kriz büyüleri kademeli | Şarj: sekme açılır / Espresso: 2. karar / Kulaklık: 3. karar / Yalan: 4. karar | `spellsCast` sayacına göre |
| 12 | Vicdan Azapları | 1e6 Dopamin | 1e5 → 1e6; Kriz sekmesinden sonra |
| 13 | D5–D8 | Sıçramalar 1–4 | Mevcut |
| 14 | Bulk / Max modlar | Mevcut | Mevcut |
| 15 | Önbellek Temizleme | 5 Sıçrama veya D8 | Mevcut |
| 16 | Koloni sekmesi | 1e13 Dopamin | Mevcut |
| 17 | Şafak sekmesi | 1e30 Dopamin | Mevcut |
| 18 | SP Dükkanı | 1. Tekillik sonrası | Mevcut |

> **Not:** Eşik değişiklikleri yalnızca 3 yerde: Lab (100→D2×25), Botlar (1e4→1e5), Anomali (başlangıç→100 Dopamin) + stance kademelemesi. Ekonomi/denge bozulmaz; sadece açılış zamanı ~2–5 dk ileri kayar.

### 3.3 UI Değişiklikleri
1. **Kilitli kart standardı:** 🔒 + özellik adı + şart metni + mini ilerleme çubuğu (Cookie Clicker "View [minigame]" deseni).
2. **"Sonraki Açılacak" bandı:** Nav altında, `nextLocked()` — "Sonraki: Algoritma Laboratuvarı — D2 18/25" + ilerleme çubuğu. Her sekme geçişinde güncellenir.
3. **Sekme ikonları:** kilitliyken kilit simgesi + tooltip'ta şart (mevcut `v-tip` kalıbı).

### 3.4 Rollout (4 aşama, her aşama build doğrulanmalı)
- **A:** `unlocks.ts` + store getter'larını registry'e bağla (UI'da görünüm değişmez, regression riski düşük).
- **B:** Sekme içi kademeleme (Lab tohumları, Kriz büyüleri, Yama dükkanı).
- **C:** "Sonraki Açılacak" bandı + kilitli kart metinleri.
- **D:** Eşik ince ayarı (Lab/Botlar/Anomali/stance) + eski save ile regresyon testi + `npm run build`.

### 3.5 Riskler ve Çözümleri
| Risk | Çözüm |
|---|---|
| Eski save'larda kilitleme aniden sıkılaşır | Kilitlemeler state'ten hesaplanır; yeni eşikler geçildiyse otomatik açık — kayıp yok |
| Lab erken açılması oyunu yavaşlatır | D2×25 eşiği, D2 maliyeti (100) ve doğal üretimle ~3–5 dakikada karşılanır |
| Faz 2/3 içeriği (Panteon, Borsa, Talismanlar) henüz yok | Registry'ye `order` ile yer ayrılmış; içeriksel modüller eklendiğinde tek satırla bağlanır |

---

## 4. Karar Gerektiren Noktalar (Kullanıcı Onayı) — Çözüldü
1. ✅ Eşik sıkılaştırması kabul edildi: Lab 100 Dopamin → **D2×25**; Botlar 1e4 → **1e6** (pacing simülasyonuyla 1e5 yerine 1e6 seçildi: 1.6 dk). Kriz sekmesi **D4×10** (~2.1 dk; ilk öneri D4×25 = 22 dk çok uzundu).
2. ✅ Stances kademelendi: Yorgan Altı başlangıçta; Çılgın Kaydırma + Düşük Parlaklık **D1×50**'de (~2.3 dk).
3. ✅ "Sonraki Açılacak" bandı **nav altında** (App.vue, `nextLocked` + ilerleme çubuğu).

Ek not: Kritik bulgu — simülasyonda `unlockedDimensionsCount` başlangıçta 4 olduğundan eski `labUnlocked`/`crisisUnlocked` getter'ları her zaman `true` idi; registry'e bağlanarak fixlendi (ADR-0009 §3).
