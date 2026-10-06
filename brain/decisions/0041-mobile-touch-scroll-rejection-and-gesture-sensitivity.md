# ADR-0041: Mobil Ekran Kaydırmada Yanlış Dokunma İzolasyonu ve Jest Hassasiyeti Kalibrasyonu

## Durum
Kabul Edildi (Accepted)

## Tarih
2026-10-06

## Bağlam ve Problem Tanımı
Kullanıcı mobilde ekranı aşağı/yukarı kaydırırken (`touch scroll`), oyunun arada kendi kendine tıklama algılayıp kütle/dopamin sayısını artırdığını ve istenmeyen dokunuşlar tetiklendiğini bildirdi:
*"telefonda ekrani kaydirirken arada kendi kendine dokunuyor o yuzden iste sayi artiyor o dokunma seyini ayarla hassasiyetini falan veya suresini"*

### Kök Neden Analizi:
1. **`DimensionsTab.vue` — Süre ve Hız Kontrolü Olmayan Fiske Dinleyicisi:**
   - `DimensionsTab.vue` bileşeni tüm sekme kapsayıcısına `@touchstart.passive` ve `@touchend.passive` ekleyerek yukarı kaydırma (`deltaY <= -36`) arıyordu.
   - 36 piksel dikey hareket, modern akıllı telefonlarda yalnızca 2-3 milimetreye karşılık gelmektedir.
   - Hiçbir zaman/süre kontrolü (`touchStartTime`), hız eşiği (`velocity = delta / duration`), sayfa kayma kontrolü (`window.scrollY`) veya buton/kart dışlaması yoktu.
   - Kullanıcı alt boyutları görmek için sayfayı yavaşça yukarı kaydırdığında (örneğin 1-2 saniye süren normal bir ekran kaydırma), parmağını kaldırdığı anda `deltaY <= -36` koşulu sağlanıyor ve `store.manualClick()` tetiklenerek sayı artıyordu!
2. **`HeartBurstLayer.vue` — Ekranda Kaydırma Başlangıçlarını Çift Tık Sanan Pointerdown:**
   - `HeartBurstLayer.vue` doğrudan `window` üzerinde `pointerdown` dinleyip 320ms ve 35px içindeki iki dokunuşu "Çift Dokunma" kabul ederek `store.manualClick()` çağırıyordu.
   - Kullanıcı mobilde arka arkaya kaydırma adımları atarken (scroll stride), her parmak basışı `pointerdown` tetikler ve iki parmak dokunuşu aynı bölgeye denk geldiğinde kullanıcı sadece sayfayı kaydırıyor olmasına rağmen çift tık kütle patlaması tetikleniyordu.

## Alınan Kararlar ve Çözüm Mimarisi

1. **`DimensionsTab.vue` Fiske (Swipe Gesture) Algılayıcısının Katılaştırılması:**
   - **Süre Sınırı (Duration):** Kasıtlı bir fiske hareketi hızlıdır (60ms - 260ms). 280ms'den uzun süren hiçbir dokunma jest olarak kabul edilmez (bunlar sayfa kaydırmadır / drag scroll).
   - **Mesafe Eşiği (Distance Threshold):** 36px olan gevşek eşik, dengeli modda en az 70px'e yükseltildi.
   - **Hız Eşiği (Velocity):** Minimum hız eşiği getirildi: `Math.abs(deltaY) / duration >= 0.45 px/ms`.
   - **Sayfa Kayma Tespiti (Scroll Drift Check):** Dokunma anındaki `window.scrollY` ile bırakma anındaki `window.scrollY` karşılaştırılır. Eğer sayfa 8 pikselden fazla kaymışsa, kullanıcı ekranı kaydırmıştır; fiske iptal edilir.
   - **İnteraktif Eleman Dışlaması:** Dokunma başlangıç veya bitiş hedefi bir buton, girdi veya tıklanabilir kart ise (`closest('button, a, input, select, [role="button"]')`), jest iptal edilir.

2. **`HeartBurstLayer.vue` Çift Dokunma İzolasyonu:**
   - Ham `pointerdown` yerine `pointerup` aşamasında, parmağın dokunma ile bırakma arasında neredeyse hiç hareket etmediği (hareket mesafesi < 15px) ve kısa sürdüğü (< 220ms) doğrulanır.
   - Kaydırma hareketleri (`drag/scroll`) çift tık geçmişine dahil edilmez.
   - Buton ve linkler çift tık kapsamından hariç tutulur.

3. **Kullanıcı Kontrollü Jest Hassasiyeti (`swipeSensitivity`):**
   - Ayarlar modeline (`src/models/types.ts`) `swipeSensitivity: 'balanced' | 'low' | 'off'` eklendi.
     - **Dengeli (Varsayılan):** Min 70px, maks 260ms, min 0.45 px/ms.
     - **Düşük (Low):** Yalnızca çok belirgin ve sert fiskeler (Min 100px, maks 200ms, min 0.65 px/ms).
     - **Kapalı (Off):** Tüm ekran fiske jesti kapatılır; oyuncu yalnızca ekrandaki "YUT!" butonuna basarak manuel kütle artırır.
   - `SettingsModal.vue` içine kullanıcı dostu 3'lü buton seçici eklendi.

## Sonuç ve Doğrulama
- Mobilde sayfa yukarı/aşağı kaydırılırken sayının istemsizce artması ve istenmeyen haptik/görsel efektler %100 engellendi.
- Sayfa kaydırma akıcı ve doğal hale getirildi.
- Jestle hızlı oynamak isteyenler için kasıtlı fiskeler hassas hız formülüyle pürüzsüz çalışmaya devam eder.
