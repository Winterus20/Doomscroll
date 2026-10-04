# Doomscroll × Balatro: Taktil UI/UX ve Görsel Matematik Sentez Yol Haritası
*(Doomscroll Visual Feedback, Mathematical Shaders & Tactile "Juice" Master Plan)*

> **Referans Belge:** [`brain/research/balatro-visual-math-uiux-breakdown.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/research/balatro-visual-math-uiux-breakdown.md)  
> **Temel İlke:** *"Feedback is the product, not the polish." (Geri bildirim cila değil, ürünün ta kendisidir).*

---

## 1. YÖNETİCİ ÖZETİ VE DOOMSCROLL ESTETİK MANİFESTOSU

Doomscroll kağıt üzerinde katı bir üstel sayı simülasyonudur ($10^{10} \to 10^{308}$). Ancak Balatro'nun kanıtladığı gibi, oyuncuyu hipnotize eden şey hesap makinesinin kendisi değil; **o sayının ekranda nasıl patladığı, fiziksel olarak nasıl eğildiği, hangi renkle beyne çarptığı ve hangi frekansta titrediğidir.**

Bu yol haritası, Balatro'nun ödüllü görsel mimarisini Doomscroll'un cyberpunk gece temasıyla ("Gece 02:47 Reels Bağımlılığı & Dopamin Kıyameti") birleştiren **5 Büyük UI/UX Sütununu** tanımlar.

---

## 2. BEŞ BÜYÜK UI/UX SÜTUNU (THE 5 JUICE PILLARS)

```
┌─────────────────────────────────────────────────────────────┐
│                    DOOMSCROLL 5 JUICE SÜTUNU                │
├─────────────────────────────────────────────────────────────┤
│ 1. ALGORİTMA FREKANSI (Hz) CANLI GLSL GİRDAP SHADER'I      │
│ 2. SIRALI NEDENSELLİKLE (SEQUENTIAL) "REELS VURUŞU"         │
│ 3. TAKTİL 3D KART FİZİĞİ & REELS GERİLİMİ (SPRING DAMPING)  │
│ 4. DÖRT ÖZEL FORMAT SÜRÜMÜ (BALATRO 4 EDITIONS)             │
│ 5. MEKANİK SLOT ODOMETRESİ & VERİ KANALI OLARAK SCREEN SHAKE│
└─────────────────────────────────────────────────────────────┘
```

---

### Sütun 1: "Algoritma Frekansı (Hz)" İçin Canlı GLSL Arka Plan Girdabı (The Procedural Feed Swirl)
- **Konsept:** Sayfanın arkasında statik koyu `#08090d` yerine, Balatro'nun kutupsal UV bükülmeli ve 5 döngülü kaos dalgasına dayalı GLSL Paint Swirl shader'ı gerçek zamanlı WebGL ile çalıştırılır.
- **Oyun Reaksiyonları:**
  - *Dingin Gece (02:47):* Koyu lacivert, mor ve derin gece siyahı girdaplar; yavaş ve hipnotik akış.
  - *Yüksek Frekans (Tickspeed / Hz):* Hız doğrudan logaritmik formülle artar:
    $$SPIN\_SPEED = 0.8 + 0.3 \times \log_{10}(\text{tickspeedMultiplier})$$
  - *Kombo Modu:* Mor ve neon camgöbeği elektrik girdapları, yüksek kontrast.
  - *Gece Krizleri & Meydan Okumalar:* Zifiri siyah, alev kırmızısı ve tekinsiz bordo kaos dalgaları.
  - *Şafak (06:00) / Tekillik Eşiği:* Genişleyen süpernova, altın sarısı ve şafak beyazı aydınlanma.
- **Performans Disiplini:** Yarım çözünürlükte (0.5x internal buffer) render edilir, retro piksel filtresi uygulanır, GPU tüketimi <%3 seviyesinde tutulur; `batterySaver` veya `reduceAnimations` açıkken statik CSS gradyanına çekilir.

---

### Sütun 2: Balatro Sıralı Nedensellik (Sequential Triggering) ile "Reels Vuruşu"
- **Konsept:** Dopamin üretimi tek bir tick ile topluca ekrana akmak yerine, oyuncu manuel kaydırdığında (Swipe) veya Akış Sıçraması (Shift) yaptığında skor **soldan sağa sırayla patlayarak** hesaplanır.
- **Dopamin Akış Sırası:**
  1. *Taban Akış (Mavi/Mor):* Temel kaydırma gücü havuzda belirir (`+1.45e4 Dopamin`).
  2. *Format Sinerjisi (Zümrüt Yeşil):* D1-D8 sinerji çarpanı araya girer (`+50% Lab Gübresi`).
  3. *Kombo / Gece Duruşu (Mercan Kırmızı):* Kombo veya Yorgan Altı çarpanı havuzu katlar (`x2.5 Kombo`).
  4. *Kritik Gece Histerisi (Neon Altın/Kızıl):* Kritik vuruş tuttuğunda (`x777 Başparmak Histerisi!`) ekranda alev patlaması ve sarsıntı oluşur.
- **İşitsel Senkroni:** `audio.ts` synthesizer osilatörü her ardışık çarpan eklendiğinde yarım ton yükselen bir arpej çalar (Do $\to$ Mi $\to$ Sol $\to$ Do).

---

### Sütun 3: Taktil 3D Kart Fiziği & Gerçek "Reels Yukarı İtme" Hissiyatı
- **Konsept:** Reels format kartları (D1-D8) ve Lab hücreleri statik dikdörtgenler olmaktan çıkar; oyuncunun fare veya dokunma hareketine göre fiziksel bir telefon/kart gibi tepki verir.
- **Mikro Hareketler:**
  - *3D Pointer Damping:* Fare kart üzerinde hareket ettikçe kart 3D uzayda imlece doğru bükülür (`perspective(800px) rotateX(...) rotateY(...)`).
  - *Kaydırma Gerilimi (Swipe Elasticity):* Butona basılı tutulduğunda dikey kart lastik gibi gerilir (`scaleY(0.92) scaleX(1.04)`), bırakıldığı anda yaylanarak yukarı fırlar (`elastic bounce`).
  - *Push Dynamics:* Satın alma anında komşu kartlar manyetik bir yay kuvvetiyle 2-3 px iki yana açılır.

---

### Sütun 4: Dört Özel Format Sürümü (Balatro 4 Editions)
Balatro'nun 4 efsanevi kart kaplaması, Doomscroll mekanikleriyle tematikleştirilir:

| Balatro Sürümü | Doomscroll Karşılığı | Görsel Davranış | Oyun İçi Etki |
| :--- | :--- | :--- | :--- |
| **Foil** | **Viral Trend (Algoritma Patlaması)** | 135° hareketli metalik neon yansıma şeridi | Format taban üretiminde +20% kalıcı hız |
| **Holographic** | **Gece 3 Halüsinasyonu** | Cyan/Magenta 3D anaglif anlık kanal ayrımı | Kombo sayacına +1 taban çarpan |
| **Polychrome** | **Saf Beyin Çürümesi (Brainrot Singularity)** | Kesintisiz akışkan HSV gökkuşağı girdabı | Format için $\times 1.5$ global katlayıcı |
| **Negative** | **Karanlık Mod / Varoluşsal Kriz** | Ters dönmüş X-Ray negatif renkler | Formatın satın alma maliyetini %50 düşürür |

---

### Sütun 5: Mekanik Slot Odometresi ve Veri Kanalı Olarak Screen Shake
- **Mekanik Odometre (Rolling Numbers):** Sayıların aniden değişmesi yerine, özellikle büyük basamak sıçramalarında ($10^{12} \to 10^{15}$) rakam rulolarının slot makinelerindeki gibi dikey eksende dönerek yerine oturması.
- **Skor Büyüklüğüyle Orantılı Sarsıntı (Data Channel Screen Shake):**
  - Küçük alım: Sıfır sarsıntı.
  - Frekans / Format seviye atlaması: `soft` (1-2 px mikro çıtırtı).
  - Akış Sıçraması (Shift) / Galaksi: `medium` (4-6 px sarsıntı).
  - Sabah 06:00 Çöküşü (Tekillik): `hard` (ekranın 1.5 derece büküldüğü, CRT çizgilerinin beyazladığı ve bas sesinin masayı titrettiği sarsıntı).

---

## 3. UYGULAMA FAZLARI VE ÖNCELİK SIRASI

1. **FAZ 1 (Hemen Uygulanacak - Mevcut Görev):** Sütun 1: Canlı GLSL Arka Plan Girdabı (`AlgorithmicSwirl.vue`) ve State Entegrasyonu.
2. **FAZ 2:** Sütun 5: Logaritmik Screen Shake & Slot Odometre sayaç geçişleri.
3. **FAZ 3:** Sütun 3: Reels Format Kartları (D1-D8) için 3D Pointer Damping ve Yaylanma Fiziği.
4. **FAZ 4:** Sütun 2: "Reels Vuruşu" Sıralı Nedensellik (Sequential Triggering) ve yükselen ses arpeji.
5. **FAZ 5:** Sütun 4: Özel Format Sürümleri (Foil, Holo, Poly, Negative) rastgele kriz ve mutasyon entegrasyonu.
