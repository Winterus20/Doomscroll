# Doomscroll × Balatro Sütun 2: "Reels Vuruşu" Sıralı Nedensellik Derin Araştırması
*(Balatro Sequential Triggering, Micro-Causal Dopamine Cascade & Multi-Sensory Synergy)*

> **Referans Belgeler:**  
> - [`brain/research/balatro-uiux-synthesis-roadmap.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/research/balatro-uiux-synthesis-roadmap.md)  
> - [`brain/research/balatro-visual-math-uiux-breakdown.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/research/balatro-visual-math-uiux-breakdown.md)  
> - [`brain/research/click-effectiveness-analysis.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/research/click-effectiveness-analysis.md)

---

## 1. YÖNETİCİ ÖZETİ VE PROBLEM TANIMI

### 1.1. Mevcut Durumun Eksikliği: "Tek Karede Sayı Boşalması"
Mevcut Doomscroll kod tabanında (`Header.vue`, `DimensionsTab.vue`, `game.ts`), oyuncu "Yukarı Kaydır" (Swipe Up) butonuna bastığında veya `Space` tuşuna dokunduğunda:
1. `store.manualClick()` çağrılır.
2. `manualClickPower` anında `this.matter` havuzuna eklenir.
3. Ekranda tek bir floating text (`+1.45e4`) fırlar ve `sounds.playClick()` tek bir ses darbesi verir.

**Oyun Hissi (Juice) Açığı:**  
Oyuncu ekranda tek bir sayı görmektedir. Ancak arka planda formül şöyledir:
$$\text{ClickPower} = \Big(\text{Base} + 0.25 \cdot \text{TotalBought} + \text{CPS}\times\text{Sync}\Big) \times \text{ShiftMult} \times \text{LabMult} \times \text{StanceMult} \times \text{BuffMult} \times \text{ComboMult}$$

Oyuncu bu çarpanların **varlığından habersizdir**. Çılgın Kaydırma modunda $4\times$ mi vurdu, 777x Başparmak Histerisi mi patladı, D1-D8 istasyon sinerjisi ne kattı? Hiçbirini algılayamaz. Sayı tek karede hesaplandığı için oyun kuru bir hesap makinesi gibi hissettirir.

### 1.2. Balatro'nun Dehası: "Sequential Triggering as Invisible Pedagogy"
Balatro'da bir el oynandığında skor tek seferde ekrana düşmez:
1. Masadaki kartlar soldan sağa sırayla kalkar ve çiplerini (`+30 Chips`) mavi havuza aktarır. (Her kartta nota yükselir: Do $\to$ Re $\to$ Mi $\to$ Fa $\to$ Sol).
2. Kart mühürleri ve sürümleri (Foil/Holo/Poly) parlar.
3. Joker kartları **soldan sağa katı bir sırayla** (FIFO) parlar ve büyür (`scale: 1.0 -> 1.25 -> 1.0`):
   - Önce `+Mult` jokerleri kırmızı havuza eklenir (`+15 Mult`).
   - Sonra `X Mult` jokerleri kırmızı havuzu üssel olarak çarpar (`×2 Mult`, `×3 Mult`).
4. **Nihai Slam Down:** Havuzdaki `Chips × Mult` birbirine çarpar, sayaç slot makinesi gibi döner, ekran sarsılır ve bas tokmağı patlar!

**Sonuç:** Oyuncu kılavuz okumadan neden önce `+Mult` sonra `X Mult` koyması gerektiğini gözleriyle ve kulaklarıyla öğrenir.

---

## 2. INCREMENTAL / IDLE OYUNLARINDA SIRALI NEDENSELLİK PARADOKSU

Balatro'da bir turun hesaplanması 2-3 saniye sürebilir; çünkü oyuncu bir sonraki hamleden önce düşünür.  
Incremental bir oyunda ise oyuncu saniyede **4 ila 10 kez** hızlı kaydırma (spam click / spacebar spam) yapabilir.

| Parametre | Balatro | Doomscroll (Incremental) |
| :--- | :--- | :--- |
| **Aksiyon Sıklığı** | 5 - 15 saniyede bir el | Saniyede 1 - 8 kaydırma |
| **Animasyon Bütçesi** | 2000 - 3500 ms | 150 - 240 ms (Mikro) / 800 - 1200 ms (Makro) |
| **Bloke Edilebilirlik** | UI hesaplama bitene kadar kilitlenir | **ASLA KİLİTLENEMEZ (Zero Input-Lag Garantisi)** |
| **Spam Riski** | Yok | Çok Yüksek (Ekranın 50 parçacıkla kilitlenmesi riski) |

### Çözüm: Çift Katmanlı Sıralı Nedensellik (Dual-Speed Sequential Triggering)

```
                              ┌─────────────────────────────┐
                              │     OYUNCU EYLEMİ (INPUT)   │
                              └──────────────┬──────────────┘
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
         [HIZLI MANUEL KAYDIRMA]                         [MAKRO SIÇRAMA & KRİZ]
         (Swipe Up / Space / Click)                      (Shift, Galaxy, 777x Frenzy)
                     │                                               │
                     ▼                                               ▼
      ┌─────────────────────────────┐                 ┌─────────────────────────────┐
      │   TİER A: MİKRO-REELS VURUŞU │                 │  TİER B: MAKRO HESAPLAMA    │
      │   (Micro-Sequential Cascade)│                 │  (Cinematic Surge Bar)      │
      ├─────────────────────────────┤                 ├─────────────────────────────┤
      │ • Toplam Süre: ~180-240 ms  │                 │ • Toplam Süre: ~800-1100 ms │
      │ • Non-blocking (State anında│                 │ • Formatlar (D1-D8) sırayla │
      │   güncellenir)              │                 │   parlar ve çan çalar       │
      │ • Soldan Sağa 3-4 Hızlı     │                 │ • Çarpanlar havuza çarpar   │
      │   Rozet Patlaması           │                 │ • Slam Down & Screen Shake  │
      │ • 4 Notalı Yükselen Arpej   │                 │ • Derin Sub-Bass Patlaması  │
      └─────────────────────────────┘                 └─────────────────────────────┘
                     │
                     ▼ (Eğer spam > 4 tık/sn ise)
      ┌─────────────────────────────┐
      │   TİER C: AKILLI BİRLEŞTİRME│
      │   (Coalescing & Soft-Cap)   │
      └─────────────────────────────┘
```

---

## 3. DOOMSCROLL DOPAMİN AKIŞ ZİNCİRİ (5 KADEMELİ FORMÜL)

Her manuel kaydırma vuruşunda ayrıştırılan 5 kademe:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        REELS VURUŞU SIRALI AKIŞ BASAMAKLARI                            │
├───────────────┬─────────────────────────────┬───────────────────┬──────────────────────┤
│ KADEME        │ ANLAMSAL DEĞER              │ TEMA / RENK       │ SES NOTASI           │
├───────────────┼─────────────────────────────┼───────────────────┼──────────────────────┤
│ 1. TABAN      │ Base + İstasyon + %CPS      │ Camgöbeği/Mavi    │ C4 (261.6 Hz) Sine   │
│ 2. SİNERJİ    │ Sıçrama × Lab × Başarımlar  │ Zümrüt Yeşili     │ E4 (329.6 Hz) Sine   │
│ 3. DURUŞ/SERİ │ Çılgın Kaydırma (4x) / Kombo│ Mercan Kırmızısı  │ G4 (392.0 Hz) Tri    │
│ 4. HİSTERİ    │ 777x Başparmak / Espresso   │ Neon Altın/Kızıl  │ C5 (523.2 Hz) Saw/Gl │
│ 5. TOPLAM     │ Nihai Tekillik Dopamini     │ Kozmik Beyaz/Mor  │ Sub-Punch (60 Hz)    │
└───────────────┴─────────────────────────────┴───────────────────┴──────────────────────┘
```

### Kademe Matematiksel Dağılımı:
1. **Kademe 1 (Taban Akış - Base Flow):**
   $$V_1 = \Big(1 + 0.25 \times \text{TotalBought} + \text{MatterPerSec} \times \text{SyncRate}\Big)$$
2. **Kademe 2 (Format Sinerjisi - Station & Lab Synergy):**
   $$M_2 = \text{ShiftPowerMult} \times \text{LabClickMult} \times \text{ChallengeRewardMult}$$
   $$(M_2 > 1.05 \text{ ise devreye girer})$$
3. **Kademe 3 (Gece Duruşu & Seri - Stance & Combo):**
   $$M_3 = \text{StanceClickMult} \times \text{ComboMult}$$
   $$(M_3 > 1.0 \text{ ise devreye girer — örn. Çılgın Kaydırma: } 4\times, \text{ Kombo: } 2.5\times)$$
4. **Kademe 4 (Kritik Gece Histerisi - Anomaly Buff):**
   $$M_4 = \text{ClickBuffMult} \quad (\text{Başparmak Histerisi } 777\times \text{ veya Espresso } 10\times)$$
   $$(M_4 > 1.0 \text{ ise DEV PATLAMA: CRIT Rozeti, alev parçacıkları, ekran sarsıntısı})$$
5. **Nihai Skor (The Climax):**
   $$V_{\text{final}} = V_1 \times M_2 \times M_3 \times M_4 \times \text{NeuralClickMult}$$

---

## 4. İŞİTSEL SENKRONİ VE WEB AUDIO OSİLATÖR MİMARİSİ

Balatro'da ses, görselle 1:1 faz kilitlidir. Her ardışık çarpan bir öncekinden **daha yüksek frekansta** ve **daha zengin harmoniklerle** çalar:

### 4.1. Müzikal Gam Seçimi (Lydian / Major Pentatonic)
Oyunun gece dopamin atmosferi için **Lydian modundaki yükselen 4'lü arpej** kullanılır:
- **Kademe 1:** C4 ($261.63\text{ Hz}$) — Yuvarlak sinüs dalgası ($55\text{ ms}$).
- **Kademe 2:** E4 ($329.63\text{ Hz}$) — Kristal parlaklığında sinüs + hafif 2. harmonik ($50\text{ ms}$).
- **Kademe 3:** G4 ($392.00\text{ Hz}$) — Enerjik üçgen (triangle) dalgası ($50\text{ ms}$).
- **Kademe 4 (Varsa):** C5 ($523.25\text{ Hz}$) veya F#5 ($739.99\text{ Hz}$ Lydian tritone) — Zirve dopamin parıltısı.
- **Final Slam (Tüm çarpanlar birleşince):** $55\text{ Hz} \to 30\text{ Hz}$ frekans rampalı mekanik sub-bass vuruşu ($40\text{ ms}$).

### 4.2. Hızlı Tıklama Pitch-Ramping (Combo Momentum)
Oyuncu 400ms içinde art arda vuruş yapmaya devam ettiğinde temel kök frekans yarı ton yarı ton yukarı tırmanır:
$$\text{PitchFactor} \in [1.0, 1.06, 1.12, 1.19, 1.26, 1.33, 1.41, 1.50]$$
8. vuruşta bir tam oktav yükselmiş olur; bu da oyuncuya bir tepe noktasına ("Rezonans Hipnozu") yaklaştığını hissettirir.

---

## 5. ERGONOMİ, SPAM ENGELLEME VE PERFORMANS STRATEJİSİ

### 5.1. Non-Blocking State İlkesi
Oyunun matematiksel motoru (`this.matter = this.matter.plus(gain)`) animasyonun bitmesini **asla beklemez**. State anında güncellenir. Görsel rozetler ve sesler sadece bu hesaplamanın "yankısı (echo)" olarak akar.

### 5.2. Burst Compression (Coalescing Engine)
- Eğer oyuncu 120ms içinde tekrar kaydırırsa, eski aktif mikro rozetler yok edilmez; hafifçe yukarı kayarak saydamlaşır ve yeni vuruşun rozetleri daha kompakt bir formatta (yalnızca `×Çarpan` ve `Final`) fırlar.
- Maksimum eşzamanlı aktif rozet grubu sınırı: **4**. Beşinci vuruş geldiğinde en eski grup anında silinir.

### 5.3. Erişilebilirlik ve Ayarlar Entegrasyonu
- `reduceAnimations: true` veya `batterySaver: true` olduğunda:
  - Çok basamaklı animasyon devre dışı kalır.
  - Tek bir şık, kompakt rozet (`+3.48e7 [4× Duruş]`) fırlar.
  - Ses tek bir tok vuruşa indirgenir.
- Yeni Ayar: `settings.sequentialStrike: boolean` (Varsayılan: `true`). İsteyen oyuncu geleneksel tek sayılık moda dönebilir.

---

## 6. SÜTUN 2 ENTEGRASYON MİMARİSİ

```
src/
├── core/
│   └── audio.ts                  # playSequentialStrike(breakdown, comboLevel) eklemesi
├── models/
│   └── types.ts                  # SwipeBreakdown, StrikeStage tip tanımları
├── stores/
│   └── game.ts                   # getSwipeBreakdown() getter'ı ve manualClick zenginleştirme
├── components/
│   ├── SequentialStrikeLayer.vue # YENİ: Balatro tarzı rozetlerin patladığı GPU layer
│   ├── MacroSurgeModal.vue       # YENİ: Shift/Galaxy/777x anlarında sinematik Balatro barı
│   ├── Header.vue                # handleManualClick'in sequential event'e bağlanması
│   └── SettingsModal.vue         # 'Sıralı Reels Vuruşu' ayar anahtarı
```
