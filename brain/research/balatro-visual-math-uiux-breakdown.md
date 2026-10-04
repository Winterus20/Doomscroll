# Balatro: Görsel Kimlik, Matematiksel Shader Mimarisi ve Taktil UI/UX İncelemesi
*(Balatro Visual Design, Mathematical Shaders & "Juice Stack" Deep Dive)*

> **Belge Amacı:** Bu araştırma belgesi, solo geliştirici LocalThunk tarafından LÖVE2D (Lua) ile geliştirilen ve Apple Design Award 2025 kazanan sansasyonel poker roguelike oyunu **Balatro**'nun görsel dilini, prosedürel GLSL/HLSL shader formüllerini, anlamsal renk kodlamasını ve "juice" (oyun hissi) mimarisini teknik ve matematiksel derinliğiyle ortaya koyar. Doomscroll projesi için taktil oyun hissi ve ekran estetiği referans bankasıdır.

---

## 1. YÖNETİCİ ÖZETİ VE TEMEL TASARIM MANİFESTOSU

Balatro, kağıt üzerinde sadece sayılardan, poker ellerinden ve çarpanlardan ibaret kuru bir elektronik tablodur (spreadsheet). Ancak bu basit matematiksel çekirdek, dünyada milyonlarca oyuncuyu hipnotize eden bir dopamin tekilliğine dönüşmüştür.

Bunun ardındaki tasarım felsefesi iki temel sütuna dayanır:
1. **"Feedback is the Product, Not the Polish" (Geri Bildirim Cila Değil, Ürünün Kendisidir):** Geri bildirim katmanları (animasyon, sarsıntı, parçacık, yükselen tonlar) oyun geliştirildikten sonra eklenen bir "süs" değildir; temel skor hesaplama döngüsüyle iç içe inşa edilmiştir. Balatro'dan görsel ve işitsel tepkileri çıkarırsanız geriye sadece bir hesap makinesi kalır. Bu iki uç arasındaki devasa deneyim farkı bütünüyle **"Juice"** mimarisidir.
2. **"Constraint Breeds Identity" (Kısıtlama Kimlik Doğurur):** Tek kişilik bir geliştiricinin devasa bir 3D grafik veya çizim ekibine sahip olmaması, 90'ların CRT monitör estetiğini bir stilistik sığınak değil, tavizsiz bir dünya kurgusu olarak seçmesini sağlamıştır.

---

## 2. GÖRSEL KİMLİK VE ATMOSFER (ATMOSPHERIC PILLARS)

```
┌─────────────────────────────────────────────────────────────┐
│                   BALATRO GÖRSEL ATMOSFERİ                  │
├──────────────────────────────┬──────────────────────────────┤
│ GELENEKSEL KART OYUNLARI     │ BALATRO MİMARİSİ             │
├──────────────────────────────┼──────────────────────────────┤
│ Yeşil çuha masa (Casino felt)│ Hipnotik, karanlık neon oda │
│ Statik, düz 2D arayüz        │ Canlı, yaylanan 3D mikro-hare│
│ Ayrık pencereler ve paneller │ Eğri CRT monitör simülasyonu │
│ Yüksek çözünürlüklü vektör   │ Katı pikselli lo-fi disiplini│
└──────────────────────────────┴──────────────────────────────┘
```

### 2.1. CRT Monitör Fiziksel Simülasyonu
Balatro'nun tüm arayüzü kavisli bir katot ışınlı tüp (CRT) monitörün camı arkasından izlenir:
- **Scanlines (Tarama Çizgileri):** Piksel çözünürlüğüne kilitlenmiş, dikeyde 2-4 piksellik aralıklarla tekrarlanan yarı saydam yatay tarama çizgileri (`rgba(0,0,0,0.15)`).
- **Fıçı Eğriliği (Barrel Distortion & Vignette):** Ekranın köşelerine gidildikçe artan radyal optik bükülme. Kenarlarda kararma (vignette) ve kavis; kartları, butonları ve duraklatma menüsünü bir akvaryum/tüp camının arkasındaymış gibi büker.
- **Phosphor Glow & Bloom:** Yüksek skorlu sayılar, alevli kartlar ve neon vurgularda CRT ekranların fosfor parlamasını andıran ışık saçılması.
- **Kromatik Aberasyon (RGB Channel Split):** Yüksek katlanmalarda ve holografik kartlarda kırmızı ve mavi/cyan kanallarının birbirinden 1-2 piksel kaymasıyla oluşan analog sinyal bozulması.

### 2.2. Tipografi ve Piksel Okunabilirliği
- **Font Tercihi:** Daniel Linssen tarafından tasarlanan ünlü **`m3x6`** piksel yazı tipi ve tok retro slab-serif tipler.
- **Kontrast Kuralı:** Hareketli ve dönen arkaplan üzerinde okunabilirliği %100 tutmak için tüm metin ve sayıların etrafında **en az 1-2 piksellik katı siyah dış kontur (solid black outline)** ve yönlü piksel gölgeler (drop shadow) bulunur.

---

## 3. ARKA PLAN SHADER'I VE MATEMATİKSEL FORMÜLLER ("THE PAINT SWIRL")

Balatro'nun hipnotik, dönen yağlıboya girdap arka planı önceden render edilmiş bir video veya görsel **değildir**. Tamamen GPU üzerinde gerçek zamanlı çalışan prosedürel bir **GLSL fragment shader**'dır.

### 3.1. Adım Adım Matematiksel Boru Hattı

#### A. Çözünürlük Normalizasyonu ve Pikselleştirme (Aspect-Correct UV & Pixelation)
Ekran en-boy oranından bağımsız olarak dairesel dalgaların ezilmesini önlemek ve retro piksel hissiyatını sabitlemek için koordinatlar basamaklandırılır:

$$\text{pixel\_size} = \frac{\|\text{ScreenSize}\|}{\text{PIXEL\_FILTER}} \quad (\text{varsayılan: } \text{PIXEL\_FILTER} \approx 745.0)$$

$$\mathbf{uv}_{\text{quantized}} = \left\lfloor \frac{\text{ScreenCoords}}{\text{pixel\_size}} \right\rfloor \times \text{pixel\_size}$$

$$\mathbf{uv} = \frac{\mathbf{uv}_{\text{quantized}} - 0.5 \times \text{ScreenSize}}{\|\text{ScreenSize}\|} - \text{OFFSET}$$

#### B. Kutupsal Dönüşüm ve Açısal Girdap (Polar Coordinates & Swirl)
Merkeze olan uzaklık $\|\mathbf{uv}\|$ hesaplanır ve açıya zaman bileşeni eklenerek merkezkaç bükülme uygulanır:

$$\text{uv\_len} = \|\mathbf{uv}\| = \sqrt{uv_x^2 + uv_y^2}$$

$$\text{speed} = (\text{SPIN\_ROTATION} \times \text{SPIN\_EASE} \times 0.2) + 302.2$$

$$\theta = \text{atan2}(uv_y, uv_x) + \text{speed} - 20.0 \times \text{SPIN\_EASE} \times \Big(\text{SPIN\_AMOUNT} \cdot \text{uv\_len} + (1.0 - \text{SPIN\_AMOUNT})\Big)$$

$$\mathbf{uv}_{\text{swirled}} = \begin{pmatrix} \text{uv\_len} \cdot \cos(\theta) \\ \text{uv\_len} \cdot \sin(\theta) \end{pmatrix} \times 30.0$$

#### C. 5 Kademeli İteratif Kaos Döngüsü (Iterative Warping Loop)
Shader'ın en karakteristik akışkan yağlıboya kıvrımları, iç içe geçen 5 trigonometrik dalga deformasyonuyla üretilir:

$$\mathbf{uv}_2 = \begin{pmatrix} uv_x + uv_y \\ 0 \end{pmatrix}$$

$$\text{Her } i \in \{0, 1, 2, 3, 4\} \text{ adımı için:}$$

$$\mathbf{uv}_2 \leftarrow \mathbf{uv}_2 + \sin\big(\max(uv_x, uv_y)\big) + \mathbf{uv}$$

$$\mathbf{uv} \leftarrow \mathbf{uv} + 0.5 \times \begin{pmatrix} \cos\big(5.11233 + 0.353 \cdot uv_{2y} + 0.13112 \cdot (\text{Time} \cdot \text{SPIN\_SPEED})\big) \\ \sin\big(uv_{2x} - 0.113 \cdot (\text{Time} \cdot \text{SPIN\_SPEED})\big) \end{pmatrix}$$

$$\mathbf{uv} \leftarrow \mathbf{uv} - 1.0 \times \cos(uv_x + uv_y) + 1.0 \times \sin(uv_x \cdot 0.711 - uv_y)$$

#### D. 3 Renkli Boya Ayrıştırması ve Dinamik Işıklandırma
Ortaya çıkan kaotik UV uzunluğu üzerinden 3 ana rengin (`Color1`, `Color2`, `Color3`) birbirine karışma katsayıları hesaplanır:

$$\text{contrast\_mod} = 0.25 \times \text{CONTRAST} + 0.5 \times \text{SPIN\_AMOUNT} + 1.2$$

$$\text{paint\_res} = \min\Big(2.0, \; \max\big(0.0, \; \|\mathbf{uv}\| \times 0.035 \times \text{contrast\_mod}\big)\Big)$$

$$c_1 = \max\Big(0.0, \; 1.0 - \text{contrast\_mod} \cdot |1.0 - \text{paint\_res}|\Big)$$

$$c_2 = \max\Big(0.0, \; 1.0 - \text{contrast\_mod} \cdot |\text{paint\_res}|\Big)$$

$$c_3 = 1.0 - \min(1.0, \; c_1 + c_2)$$

$$\text{light} = (\text{LIGHTING} - 0.2) \cdot \max(c_1 \cdot 5.0 - 4.0, \; 0.0) + \text{LIGHTING} \cdot \max(c_2 \cdot 5.0 - 4.0, \; 0.0)$$

$$\mathbf{OutColor} = \left(\frac{0.3}{\text{CONTRAST}}\right) \cdot \mathbf{Color}_1 + \left(1.0 - \frac{0.3}{\text{CONTRAST}}\right) \cdot \Big(\mathbf{Color}_1 c_1 + \mathbf{Color}_2 c_2 + \mathbf{Color}_3 c_3\Big) + \text{light}$$

---

### 3.2. Tam HLSL / GLSL Referans Kodu

```glsl
// Balatro Background Shader - Procedural Swirl
shader_type canvas_item;

uniform vec4 Color1 : source_color = vec4(0.15, 0.22, 0.45, 1.0);
uniform vec4 Color2 : source_color = vec4(0.85, 0.25, 0.35, 1.0);
uniform vec4 Color3 : source_color = vec4(0.08, 0.05, 0.15, 1.0);

uniform float SPIN_ROTATION = -2.0;
uniform float SPIN_SPEED = 7.0;
uniform vec2 OFFSET = vec2(0.0, 0.0);
uniform float CONTRAST = 3.5;
uniform float LIGHTING = 0.4;
uniform float SPIN_AMOUNT = 0.25;
uniform float PIXEL_FILTER = 745.0;
uniform float SPIN_EASE = 1.0;

void fragment() {
    vec2 ScreenSize = 1.0 / SCREEN_PIXEL_SIZE;
    float pixel_size = length(ScreenSize) / PIXEL_FILTER;
    vec2 uv = floor(FRAGCOORD.xy / pixel_size) * pixel_size;
    uv = (uv - 0.5 * ScreenSize) / length(ScreenSize) - OFFSET;
    
    float uv_len = length(uv);
    float speed = (SPIN_ROTATION * SPIN_EASE * 0.2) + 302.2;
    float new_pixel_angle = atan(uv.y, uv.x) + speed - SPIN_EASE * 20.0 * (SPIN_AMOUNT * uv_len + (1.0 - SPIN_AMOUNT));
    
    vec2 mid = (ScreenSize.xy / length(ScreenSize.xy)) / 2.0;
    uv = vec2(uv_len * cos(new_pixel_angle) + mid.x, uv_len * sin(new_pixel_angle) + mid.y) - mid;
    uv *= 30.0;
    
    speed = TIME * SPIN_SPEED;
    vec2 uv2 = vec2(uv.x + uv.y, 0.0);
    
    for (int i = 0; i < 5; i++) {
        uv2 += sin(max(uv.x, uv.y)) + uv;
        uv += 0.5 * vec2(cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121), sin(uv2.x - 0.113 * speed));
        uv -= 1.0 * cos(uv.x + uv.y) - 1.0 * sin(uv.x * 0.711 - uv.y);
    }
    
    float contrast_mod = (0.25 * CONTRAST + 0.5 * SPIN_AMOUNT + 1.2);
    float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
    float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
    float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
    float c3p = 1.0 - min(1.0, c1p + c2p);
    
    float light = (LIGHTING - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + LIGHTING * max(c2p * 5.0 - 4.0, 0.0);
    COLOR = (0.3 / CONTRAST) * Color1 + (1.0 - 0.3 / CONTRAST) * (Color1 * c1p + Color2 * c2p + vec4(c3p * Color3.rgb, c3p * Color1.a)) + light;
}
```

---

## 4. ANLAMSAL RENK PALETİ VE ARAYÜZ DİLİ (SEMANTIC UI PALETTE)

Balatro'da ekranda gereksiz yazı veya etiket kirliliği yoktur. Bir sayının rengi, onun ne olduğunu doğrudan beyne iletir:

| Semantik Anlam | Renk Adı | Hex Kodu | Kullanım Alanı | Psikolojik Etki |
| :--- | :--- | :--- | :--- | :--- |
| **Chips** | Elektrik Camgöbeği | `#009dff` / `#0094ff` | Temel puan, mavi çipler | Soğukkanlı, rasyonel temel taban |
| **+Mult** | Canlı Mercan Kırmızısı | `#fe5f55` | Toplanan çarpan artışları | Dinamizm, yükselen tansiyon |
| **X Mult** | Koyu Alev / Parıltılı | `#c0392b` / Neon | Üssel katlanan çarpanlar | Tepe dopamin, patlama hissi |
| **Money ($)** | Casino Altını | `#f4b41a` / `#f0c040` | Dolar, faizler, mağaza | Açgözlülük, zenginleşme |
| **Hands** | Zümrüt Yeşili | `#50c878` | Kalan el sayısı | Emniyet, hayatta kalma garantisi |
| **Discards** | Taktik Turuncusu | `#e67e22` | Kalan ıskarta hakları | Alternatif plan, nefes payı |
| **Planet** | Kozmik Mor | `#9b59b6` | El seviyesi geliştirmeleri | Gizem, kalıcı ilerleme hissi |

### Blind Seviyesi İle Arka Plan Renk Reaksiyonları
Arka plan shader'ı odanın psikolojik baskısını yönetir:
- **Small Blind:** Dingin, koyu lacivert ve hafif deniz mavisi girdaplar.
- **Big Blind:** Sarı-turuncu, kumarhane ışıklarını andıran hafif tehditkar palet.
- **Boss Blind:** Koyu bordo, alev kırmızısı ve mor karışımı; oyuncuya hayati bir sınavda olduğunu hissettiren agresif girdap hızı.

---

## 5. TAKTİL UI/UX VE "JUICE STACK" MİMARİSİ

```
┌─────────────────────────────────────────────────────────────┐
│                      THE JUICE STACK                        │
├─────────────────────────────────────────────────────────────┤
│ 1. KART FİZİĞİ       │ Spring Damping, 3D Tilt, Push Efekti │
│ 2. SIRALI PUANLAMA   │ Soldan Sağa Nedensellik Animasyonu   │
│ 3. SAYI RULOLARI     │ Mekanik Slot/Odometre Kayması        │
│ 4. EKRAN SARSINTISI  │ Skora Orantılı Veri Kanalı           │
│ 5. İŞİTSEL SENKRONİ  │ Yükselen Gam, Bas Düşüşü, Rezonans   │
└─────────────────────────────────────────────────────────────┘
```

### 5.1. Taktil Kart Fiziği (Card Physics & Micro-Motions)
- **3D Fare Paralaksı:** Kartlar statik dikdörtgenler değildir. Fare imleci kartın üzerine geldiğinde kart imlece doğru 3D uzayda eğilir:
  ```css
  .card:hover {
    transform: perspective(800px) rotateX(calc(var(--mouse-y) * 15deg)) rotateY(calc(var(--mouse-x) * -15deg)) translateY(-12px) scale(1.05);
    box-shadow: 0 16px 32px rgba(0,0,0,0.5), 0 0 20px rgba(0, 157, 255, 0.2);
  }
  ```
- **Seçim Yüksekliği (Selection Lift):** Seçilen kartlar desteden yukarı fırlayarak (`translateY(-24px) scale(1.08)`) belirgin altın sarısı bir parlama konturu kazanır.
- **Kart İtme Mekaniği (Push Dynamics):** Bir kart destenin arasına sürüklenirken, arasına girdiği komşu kartlar manyetik bir yay kuvvetiyle (`spring-physics`) iki yana açılır. Bu, fiziksel bir iskambil destesini tutuyormuş hissi verir.

### 5.2. Sıralı Nedensellik (Sequential Triggering as Tutorial)
Balatro'da bir el oynandığında skor tek bir karede hesaplanıp ekrana yazılmaz:
1. **Adım 1:** Masaya inen her kart sırayla öne doğru yaylanır ve kendi çip puanını havuz sayacına aktarır. Her kartta bir nota yükselen melodi çalar (Do $\to$ Re $\to$ Mi $\to$ Fa $\to$ Sol).
2. **Adım 2:** Jokerler devreye girer. Aktivasyon **soldan sağa katı bir sırayla** gerçekleşir:
   - Tetiklenen her Joker fiziksel olarak büyür (`scale: 1.0 -> 1.25 -> 1.0`).
   - Eklenen Mult anında kırmızı sayaçta döner.
   - Ardından gelen xMult Jokerleri skoru katlayarak çarpar.
3. **Kritik Tasarım Dehası:** Bu 400 milisaniyelik sıralı görsel şov, oyuncuya Joker diziliminin hayati önemini (önce +Mult, sonra X Mult konulması gerektiğini) tek bir eğitim metni okutmadan içselleştirir.

### 5.3. Mekanik Odometre Ruloları (Slot Machine Digit Roll)
Sayılar aniden değişmez; eski benzin pompaları ve slot makinelerindeki gibi rakam ruloları dikey eksende dönerek hedef sayıya ulaşır. Bu, büyük sayı artışlarında ekrana hipnotik bir hareket katar.

### 5.4. Veri Kanalı Olarak Ekran Titremesi (Screen Shake as Data Channel)
Balatro'da sarsıntı rastgele bir efekt değil, **sayısal bir göstergedir**:
- $Score < 1.000$: Hafif 1-2 piksel çıtırtı.
- $1.000 \le Score < 100.000$: Masayı titreten 4-6 piksel sallantı.
- $Score \ge 100.000$: Tüm ekranın açılı olarak döndüğü (`rotate: ±1.5deg`), CRT çizgilerinin anlık aydınlandığı ve bas sesinin masayı titrettiği sarsıntı. Oyuncu gözünü kapatsa bile sadece sarsıntının şiddetinden elinin gücünü anlar.

---

## 6. ÖZEL KART SÜRÜMLERİ VE SHADER MATRİSİ (EDITIONS)

Balatro'daki 4 özel kart kaplaması, shader'larla üretilen benzersiz görsel imzalara sahiptir:

```
┌─────────────────────────────────────────────────────────────┐
│               BALATRO ÖZEL KART SÜRÜMLERİ                   │
├─────────────┬───────────┬───────────────────────────────────┤
│ SÜRÜM       │ STAT BONUS│ SHADER DAVRANIŞI                  │
├─────────────┼───────────┼───────────────────────────────────┤
│ Foil        │ +50 Chips │ 135° Metalik gökkuşağı şeridi     │
│ Holographic │ +10 Mult  │ Cyan/Magenta 3D RGB kanal ayrımı  │
│ Polychrome  │ x1.5 Mult │ Kesintisiz HSV hue döngü dalgası  │
│ Negative    │ +1 Joker  │ Ters renkler (1.0 - RGB), X-Ray   │
└─────────────┴───────────┴───────────────────────────────────┘
```

1. **Foil:** Kart yüzeyinde 135 derecelik açıyla sürekli kayan parlak metalik gradyan. Fare hareket ettirildikçe yansıma açısı değişir.
2. **Holographic:** Kart görseli ikiye ayrılır; kırmızı kanal sola, camgöbeği kanal sağa kayar. Farenin açısına göre bu iki kanal birbirinden uzaklaşarak 3D anaglif gözlük derinliği yaratır.
3. **Polychrome:** Kartın piksel renkleri zaman değişkenine bağlı olarak renk tekerleğinde (hue cycle) döner. Kart sürekli renk değiştirerek canlı bir prizma gibi görünür.
4. **Negative:** Kartın tüm piksellerinin renk ve ışık değerleri evrilir (`vec3(1.0) - color.rgb`). Siyah arkaplan ve neon beyaz-mavi konturlar oluşarak kart bir negatif röntgen filmine dönüşür.

---

## 7. BİLİŞSEL UX VE KUMAR PSİKOLOJİSİ DİNAMİKLERİ

### 7.1. Eksik Önizleme Paradoksu (The Missing Score Preview Paradox)
Balatro'da kartlar seçildiğinde bu elin toplam kaç puan getireceğini gösteren bir **skor önizlemesi bilerek ve isteyerek konulmamıştır**.
- **Nedeni:** Bir önizleme sayacı olsaydı, oyuncu kart seçerken farklı varyasyonları dener ve en yüksek sayıyı vereni seçip geçerdi. Oyun bir kumar ve risk heyecanından çıkıp **"hesaplanmış ve bitmiş bir excel formülüne"** dönüşürdü.
- **Psikolojik Etkisi:** Oyuncu eli masaya bıraktığında sonucun yetip yetmeyeceğini bilmez. O 2 saniyelik hesaplama sekansı, rulet masasında topun yuvalar arasında sekmesiyle aynı nörolojik dopamin ve nefes tutma eğrisini yaratır.

### 7.2. Değişken Oranlı Pekiştirme (Variable Ratio Reinforcement)
Kart paketleri açılırken paketlerin sallanması, mühürlerin yırtılması ve kartların ters açılması gibi ritüeller, fiziksel TCG (Pokemon/Magic) paket açma hazzını birebir dijitale aktarır.

---

## 8. DOOMSCROLL PROJESİNE ENTEGRASYON DERSLERİ

Balatro'nun görsel formülleri, Doomscroll (Endless Reels) oyunumuzun estetik derinliğini katlamak için birebir uyarlanabilir:

1. **"Algoritma Frekansı (Hz)" İçin Girdap Shader'ı:**
   - Oyunumuzun ana arkaplanında Balatro'nun `Paint Swirl` algoritması kullanılabilir.
   - Oyuncunun algoritma frekansı (Hz) arttıkça shader'ın `SPIN_SPEED` ve `CONTRAST` değerleri dinamik olarak artabilir; "Gece 04:00" krizinde arkaplan mavi/mor tonlardan tekinsiz kızıl/yeşil glitch renklerine bürünebilir.
2. **CRT ve Gece Telefon Ekranı Filtresi:**
   - Doomscroll'un cyberpunk telefon ekranı hissini pekiştirmek için hafif scanlines ve kenar vinyeti (vignette) eklenebilir.
3. **Taktil Dokunma & Kaydırma Geri Bildirimi:**
   - Reels kartları yukarı kaydırılırken `push dynamics` ve `spring bounce` fiziği uygulanabilir.
4. **Gece Krizlerinde Veri Kanalı Olarak Screen Shake:**
   - "Gece 3 Çılgınlığı 7x" veya "Başparmak Histerisi 777x" patlamalarında Balatro tipi logaritmik ekran sarsıntısı ve bas patlaması entegre edilebilir.
5. **Joker Benzeri Özellikler (Reels Algoritmaları):**
   - Satın alınan algoritma botları soldan sağa sırayla parlayarak çarpanları havuzda büyütebilir.
