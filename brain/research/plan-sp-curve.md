# TEKNİK UYGULAMA PLANI: SP Eğrisi, Başlangıç Kütlesi ve Kök Düğüm Mekaniği

**Belge Versiyonu:** 1.0.0  
**Tarih:** 2026-10-06  
**Hedef:** UROBOROS Singularity Points (SP) Eğrisi Yenilemesi, 10.000 g Başlangıç Kütlesi ve Nöral Ağaç Kök Düğüm Entegrasyonu  
**Rol:** Research & Planning Specialist  

---

## 1. Mimari Özet ve Tasarım Kararları

### 1.1 Problem Tanımı
Mevcut `singularityGain` formülü, oyuncu ilk kez 1.79e308 (Sabah 06:00 Tekilliği) eşiğine ulaştığında taban 3 SP garanti etmektedir. Bu durum:
1. İlk koşu sonrası oyuncunun birden fazla yeteneği anında açmasına yol açarak erken oyunun aşama aşama ilerleme hissini zedelemektedir.
2. Planck Duvarı (`break_singularity`) henüz yıkılmamışken oyuncu yapay bir hızlanma yaşamaktadır.
3. Nöral Ağaç kök düğümü olan `insomnia_heart` (1 SP), yalnızca bir geçiş düğümü gibi kalmakta, oyuncuya somut bir erken oyun avantajı sunmamaktadır.

### 1.2 Hedeflenen Akış
1. **İlk Koşuda ve `break_singularity` Öncesinde Net 1 SP:**
   - Planck Duvarı kırılana kadar (ilk ~5-6 koşu boyunca) kütle 1e308'e ulaştığında her çöküş **tam olarak 1 SP** kazandırır.
   - Bu döngü, oyuncunun prestij mekaniğini sindirmesini ve Nöral Ağaç'taki ilk basamakları adım adım açmasını sağlar:
     - 1. Çöküş: 1 SP -> `insomnia_heart` (Kök düğüm - 1 SP)
     - 2. Çöküş: 1 SP -> `eye_drops` (Pasif Düğüm 1 - 1 SP)
     - 3., 4., 5., 6. Çöküş: Her biri 1 SP -> 4 SP birikir -> `break_singularity` (Planck Duvarını Yıkma - 4 SP)
2. **`break_singularity` Sonrası Üstel SP Patlaması:**
   - Planck Duvarı yıkıldıktan sonra kütle 1e308'de taban **3 SP** ile başlar.
   - Kütle 1e308'i aştıkça kütlenin büyüklüğüne bağlı olarak SP **3, 5, 10, 50, 100, 500, 1000...** şeklinde logaritmik/üstel olarak ölçeklenir.
3. **Kök Düğüm `insomnia_heart` ile 10.000 g Başlangıç Kütlesi:**
   - Oyuncu 1 SP ile `insomnia_heart` düğümünü satın aldığında, sonraki tüm koşularda ve sıfırlamalarda (`resetRunState`, `dimensionShift`, `buyGalaxy`) taban başlangıç kütlesi **10.000 g (1e4)** olur.
   - Böylece ilk 10 g manuel tıklama eziyeti ortadan kalkar; D1 ve D2 anında satın alınabilir.

---

## 2. Matematiksel Model ve SP Eğrisi Formülü

### 2.1 Planck Duvarı Durum Kontrolü (`hasBreakSingularity`)
```typescript
export function checkBreakSingularity(state: {
  singularityUpgrades?: Record<string, number>
  neuralNodesBought?: Record<string, number>
}): boolean {
  return (
    (state.singularityUpgrades?.break_singularity || 0) >= 1 ||
    (state.neuralNodesBought?.break_singularity || 0) >= 1
  )
}
```

### 2.2 `singularityGain` Formülü

```typescript
singularityGain(state): Decimal {
  // Gece Kriz Meydan Okuması (Challenge) içindeyse SP üretilmez
  if (state.activeChallenge) return D_0
  
  // 1.79e308 (D_INFINITY) altındaysa tekillik henüz hazır değildir
  if (state.matter.lt(D_INFINITY)) return D_0

  const hasBreak = (state.singularityUpgrades?.break_singularity || 0) >= 1 ||
                   (state.neuralNodesBought?.break_singularity || 0) >= 1

  // 1. EVRE: Planck Duvarı Henüz Yıkılmadı (İlk ~5 koşu)
  // Ne kadar kütle üretilirse üretilsin, tam olarak 1 SP verilir.
  if (!hasBreak) {
    return D_1
  }

  // 2. EVRE: Planck Duvarı Yıkıldı (Break Singularity Aktif)
  // Taban 3 SP + Kütle 1e308'i aştıkça üstel büyüme
  const logMatter = state.matter.log10().toNumber()
  const dawnSpeedMult = memoNeuralEffects(state.neuralNodesBought || {}).dawnSpeedMult
  const spMult = memoChallengeEffects(state.completedChallenges).spMult
  const totalMult = dawnSpeedMult * spMult

  const logDiff = Math.max(0, logMatter - 308)
  const rawGain = Decimal.pow(10, logDiff / 45).times(3).times(totalMult)
  const floored = Decimal.floor(rawGain)
  return floored.gte(3) ? floored : new Decimal(3)
}
```

### 2.3 Sayısal Ölçeklenme Doğrulaması (Eğim: `logDiff / 45`, Taban: 3 SP)

| Kütle (log10) | `logDiff` | Çarpan Hesabı | Ham Değer | SP Çıktısı (floor) |
|---|---|---|---|---|
| **1.8e308** | 0.25 | $3 \times 10^{0.25/45} = 3 \times 1.013$ | 3.039 | **3 SP** |
| **1e318** | 10.0 | $3 \times 10^{10/45} = 3 \times 1.669$ | 5.008 | **5 SP** |
| **1e332** | 24.0 | $3 \times 10^{24/45} = 3 \times 3.414$ | 10.24 | **10 SP** |
| **1e363** | 55.0 | $3 \times 10^{55/45} = 3 \times 16.68$ | 50.04 | **50 SP** |
| **1e377** | 69.0 | $3 \times 10^{69/45} = 3 \times 34.14$ | 102.4 | **102 SP** |
| **1e408** | 100.0 | $3 \times 10^{100/45} = 3 \times 166.8$ | 500.4 | **500 SP** |
| **1e422** | 114.0 | $3 \times 10^{114/45} = 3 \times 341.4$ | 1024.3 | **1024 SP** |

> **Analiz:** 45 dekadda bir $10\times$ ölçeklenen eğim, hedeflenen `3 -> 5 -> 10 -> 50 -> 100...` ilerleme ritmini kusursuz şekilde vermektedir.

---

## 3. Başlangıç Kütlesi & `insomnia_heart` Entegrasyonu

### 3.1 Getter Refactoring: `startingMatter`
Mevcut `achievementStartingMatter` getter'ı yerini daha kapsayıcı olan `startingMatter` getter'ına bırakır; geriye dönük uyumluluk için `achievementStartingMatter` bir alias olarak korunur.

```typescript
// src/stores/game.ts

startingMatter(state): Decimal {
  // 1. Öncelik: Nöral Ağaç kök düğümü (Uykusuzluğun Kalbi) -> 10.000 g
  if ((state.neuralNodesBought?.insomnia_heart || 0) >= 1) {
    return new Decimal(10000)
  }

  // 2. Öncelik: 3 Tekillik Başarımı ('starting_matter') -> 1.000 g
  if (hasAchievementReward(state.achievements, 'starting_matter')) {
    return new Decimal(1000)
  }

  // 3. Varsayılan erken oyun kütlesi -> 10 g
  return new Decimal(10)
},

// Geriye dönük uyumluluk için alias
achievementStartingMatter(): Decimal {
  return this.startingMatter
},
```

### 3.2 Sıfırlama Kancaları (Reset Hooks)
`this.matter = this.startingMatter` ataması aşağıdaki 3 kritik fonksiyonda çalıştırılır:
1. `resetRunState()` (Şafak Çöküşü `singularityReset`, Gece Krizleri giriş/çıkış/tamamlama):
   ```typescript
   this.syncUnlocks()
   this.matter = this.startingMatter
   this.dimensions.forEach((d) => {
     d.amount = new Decimal(0)
     d.bought = 0
   })
   this.tickspeedBought = 0
   ```
2. `dimensionShift()` (Akış Sıçraması):
   ```typescript
   this.matter = this.startingMatter
   this.dimensions.forEach((d) => {
     d.amount = new Decimal(0)
     d.bought = 0
   })
   this.tickspeedBought = 0
   ```
3. `buyGalaxy()` (Sonsuz Akış Kümesi):
   ```typescript
   this.matter = this.startingMatter
   this.dimensions.forEach((d) => {
     d.amount = new Decimal(0)
     d.bought = 0
   })
   this.tickspeedBought = 0
   ```

### 3.3 Nöral Ağaç Kök Düğüm Tanımı Güncellemesi
`src/stores/game.ts` içindeki `NEURAL_TREE`:
```typescript
  // ---- Kök ----
  {
    id: 'insomnia_heart',
    name: 'Uykusuzluğun Kalbi',
    icon: '❤️',
    desc: 'Ağacın kökü. Tüm dalları açar ve her çöküş ile sıfırlamada 10.000 g başlangıç kütlesi verir.',
    branch: 'root',
    cost: 1,
    requires: [],
    effect: 'root_unlock'
  },
```

---

## 4. Dosya Dosya Detaylı Değişiklik Listesi

### 4.1 `src/stores/game.ts`

1. **`NEURAL_TREE` kök düğüm metni güncellemesi:**
   - **Konum:** Satır ~510
   - **Değişiklik:** `desc: 'Ağacın kökü. Tüm dalları açar ve her çöküş ile sıfırlamada 10.000 g başlangıç kütlesi verir.'`

2. **`hasBreakSingularity` getter'ı eklenmesi:**
   - **Konum:** `getters` bloğu (satır ~1710 civarı)
   - **Kod:**
     ```typescript
     hasBreakSingularity(state): boolean {
       return (state.singularityUpgrades?.break_singularity || 0) >= 1 ||
              (state.neuralNodesBought?.break_singularity || 0) >= 1
     },
     ```

3. **`singularityHoldActive` getter'ının güncellenmesi:**
   - **Konum:** Satır ~1713
   - **Değişiklik:**
     ```typescript
     singularityHoldActive(state): boolean {
       return state.matter.gte(D_INFINITY) && !this.hasBreakSingularity
     },
     ```

4. **`singularityGain` getter'ının güncellenmesi:**
   - **Konum:** Satır ~1973
   - **Değişiklik:**
     ```typescript
     singularityGain(state): Decimal {
       if (state.activeChallenge) return D_0
       if (state.matter.lt(D_INFINITY)) return D_0

       const hasBreak = (state.singularityUpgrades?.break_singularity || 0) >= 1 ||
                        (state.neuralNodesBought?.break_singularity || 0) >= 1

       // Planck Duvarı henüz yıkılmadıysa (ilk ~5 koşu): net tam 1 SP
       if (!hasBreak) {
         return D_1
       }

       // Planck Duvarı yıkıldıysa: 1e308 üstünde 3, 5, 10, 50, 100... üstel ölçeklenme
       const logMatter = state.matter.log10().toNumber()
       const dawnSpeedMult = memoNeuralEffects(state.neuralNodesBought || {}).dawnSpeedMult
       const spMult = memoChallengeEffects(state.completedChallenges).spMult
       const totalMult = dawnSpeedMult * spMult

       const logDiff = Math.max(0, logMatter - 308)
       const rawGain = Decimal.pow(10, logDiff / 45).times(3).times(totalMult)
       const floored = Decimal.floor(rawGain)
       return floored.gte(3) ? floored : new Decimal(3)
     },
     ```

5. **`startingMatter` ve `achievementStartingMatter` getter'larının güncellenmesi:**
   - **Konum:** Satır ~2844
   - **Değişiklik:**
     ```typescript
     startingMatter(state): Decimal {
       if ((state.neuralNodesBought?.insomnia_heart || 0) >= 1) {
         return new Decimal(10000)
       }
       return hasAchievementReward(state.achievements, 'starting_matter')
         ? new Decimal(1000)
         : new Decimal(10)
     },

     achievementStartingMatter(): Decimal {
       return this.startingMatter
     },
     ```

6. **Reset fonksiyonlarında `startingMatter` kullanımı:**
   - `dimensionShift()` (Satır ~3224): `this.matter = this.startingMatter`
   - `buyGalaxy()` (Satır ~3273): `this.matter = this.startingMatter`
   - `resetRunState()` (Satır ~3321): `this.matter = this.startingMatter`

### 4.2 `src/components/NeuralTreeTab.vue`
- **Konum:** Satır 155
- **Değişiklik:**
  ```vue
  <!-- v-tip güncellemesi -->
  v-tip="'Ağacın tüm dallarını açar ve her çöküşte 10.000 g kütle kazandırır'"
  ```

### 4.3 `src/components/Header.vue`
- **Konum:** Satır 265
- **Değişiklik:** `store.singularityUpgrades?.break_singularity` yerine `store.hasBreakSingularity` kullanımı.

### 4.4 `src/stores/balance.test.ts`
- **Konum:** Satır 58
- **Eski Test:** `it('İlk Şafak Çöküşü taban 3 SP garanti eder', ...)`
- **Yeni Testler:** Aşağıdaki 5 yeni test senaryosu eklenir.

---

## 5. Birim Test Senaryoları (Unit Test Suite)

`src/stores/balance.test.ts` içerisine eklenecek tam test bloğu:

```typescript
describe('SP Eğrisi ve Başlangıç Kütlesi Doğrulama Testleri', () => {
  it('İlk Şafak Çöküşü (break_singularity yokken) tam olarak 1 SP verir', () => {
    const store = useGameStore()
    store.matter = new Decimal('1.8e308')
    // Break singularity satın alınmamışken tam 1 SP olmalıdır
    expect(store.hasBreakSingularity).toBe(false)
    expect(store.singularityGain.toNumber()).toBe(1)
  })

  it('break_singularity yokken kütle 1e500 e çıksa dahi kazanç 1 SP de sabit kalır', () => {
    const store = useGameStore()
    store.matter = new Decimal('1e500')
    expect(store.hasBreakSingularity).toBe(false)
    expect(store.singularityGain.toNumber()).toBe(1)
  })

  it('break_singularity alındığında 1.8e308 eşiğinde taban 3 SP verir', () => {
    const store = useGameStore()
    store.neuralNodesBought = { break_singularity: 1 }
    store.matter = new Decimal('1.8e308')
    expect(store.hasBreakSingularity).toBe(true)
    expect(store.singularityGain.toNumber()).toBe(3)
  })

  it('break_singularity sonrası kütle arttıkça SP üstel ölçeklenir (3 -> 5 -> 10 -> 50 -> 100...)', () => {
    const store = useGameStore()
    store.neuralNodesBought = { break_singularity: 1 }

    // 1e318 -> 5 SP
    store.matter = new Decimal('1e318')
    expect(store.singularityGain.toNumber()).toBe(5)

    // 1e332 -> 10 SP
    store.matter = new Decimal('1e332')
    expect(store.singularityGain.toNumber()).toBe(10)

    // 1e363 -> 50 SP
    store.matter = new Decimal('1e363')
    expect(store.singularityGain.toNumber()).toBe(50)

    // 1e377 -> 102 SP (~100 SP bandı)
    store.matter = new Decimal('1e377')
    expect(store.singularityGain.toNumber()).toBe(102)
  })

  it('Kök düğüm insomnia_heart alındığında başlangıç kütlesi 10.000 g olur', () => {
    const store = useGameStore()
    // Başlangıçta 10 g
    expect(store.startingMatter.toNumber()).toBe(10)

    // insomnia_heart satın alınır
    store.neuralNodesBought = { insomnia_heart: 1 }
    expect(store.startingMatter.toNumber()).toBe(10000)

    // Koşu sıfırlandığında kütle 10.000 g ye oturmalıdır
    store.matter = new Decimal(50)
    store.resetRunState()
    expect(store.matter.toNumber()).toBe(10000)
  })

  it('insomnia_heart sıçrama (shift) ve küme (galaxy) resetlerinde de 10.000 g korur', () => {
    const store = useGameStore()
    store.neuralNodesBought = { insomnia_heart: 1 }

    store.dimensionShift(false)
    expect(store.matter.toNumber()).toBe(10000)

    store.buyGalaxy(false)
    expect(store.matter.toNumber()).toBe(10000)
  })
})
```

---

## 6. Doğrulama & Dağıtım Kontrol Listesi

1. [ ] `src/stores/game.ts` içinde `hasBreakSingularity` ve `startingMatter` tanımlandı mı?
2. [ ] `singularityGain` `!hasBreak` durumunda katıksız `D_1` dönüyor mu?
3. [ ] `insomnia_heart` alındığında `resetRunState`, `dimensionShift` ve `buyGalaxy` fonksiyonlarının hepsi 10.000 g kütle atıyor mu?
4. [ ] `npm test` çalıştırıldığında tüm 176+ test ve yeni eklenen 6 birim testi başarıyla geçiyor mu?
5. [ ] Kayıt/yükleme (serialization) esnasında geriye dönük uyumluluk bozuluyor mu? (`startingMatter` getter olduğu için state şemasına yeni bir kalıcı alan eklenmesi gerekmez, `neuralNodesBought` zaten kaydedilmektedir).
