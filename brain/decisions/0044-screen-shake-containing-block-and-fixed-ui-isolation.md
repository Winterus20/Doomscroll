# ADR-0044: Sarsıntı (Screen Shake) Sırasında Sabit Arayüz İzolasyonu ve CSS Containing Block Çözümü

## Durum
Kabul Edildi (Accepted)

## Tarih
2026-10-06

## Bağlam ve Kök Neden Analizi (Root Cause Analysis)
Kullanıcı geri bildirimi:
*"ekran titrerken falan mobilde alttaki tabler ve yut,maks al seceneklerinin oldugu kisim silinip tekrar geliyor benzer sey pc de de yasaniyor sorunun ana kaynagini bul ve duzelt"*

### Sorunun Kök Nedeni:
W3C CSS Transforms Module Seviye 1 spesifikasyonuna göre:
> *"Bir elemana `none` dışında herhangi bir `transform`, `filter` veya `perspective` değeri atandığında, bu eleman tüm torunları (descendants) için yeni bir yerel istifleme bağlamı (stacking context) ve **`position: fixed` elemanlar dahil yeni bir kapsayıcı blok (containing block)** oluşturur."*

1. **Mobildeki Belirti:**
   - `src/App.vue` içinde `#game-main-content` kapsayıcısı tüm oyun akışını (sayfadaki tüm boyut kartları, grafikler, metinler dahil ~2000-4000px yükseklikte) barındırıyordu.
   - Mobil alt sekme dock'u (`<nav ref="navRef">`, `max-md:fixed max-md:bottom-0`) ve başparmak hızlı işlem çubuğu (`<FloatingThumbBar />`, `fixed bottom-[60px]` — YUT!, Tümü Maks, Hz butonları) bu `#game-main-content` div'inin **içinde** yer alıyordu.
   - Boyut alımları, dekad atlamaları, kombo vuruşları veya kriz anomalileri sırasında `doomscroll:shake` olayı tetiklenip `JuiceLayer.vue` tarafından `#game-main-content` üzerine `.screen-shake` (`transform: translate(...)`) eklendiğinde:
   - `#game-main-content` bir anda `position: fixed` alt butonların **kapsayıcı bloğu (containing block)** haline geliyordu.
   - Sonuç olarak `bottom: 0` ve `bottom: 60px` değerleri, tarayıcı penceresinin (viewport) altı yerine 3000px uzunluğundaki konteynerin en dibine (ekranın yüzlerce piksel altına) itiliyordu.
   - Bu nedenle sarsıntı sürdüğü 200–400ms boyunca mobil alt sekme çubuğu ve YUT / Maks Al çubuğu **tamamen ekrandan siliniyor**, sarsıntı bitip sınıf kaldırılınca aniden geri geliyordu.

2. **PC'deki Belirti:**
   - PC'de ekran genişliği 768px'in altında olduğunda (veya mobil emülasyon/yan yana pencere modunda) birebir aynı kaybolma yaşanıyordu.
   - Masaüstü görünümünde ise `JuiceLayer.vue` her sarsıntıda `void target.offsetWidth` ile 3000px'lik devasa DOM ağacında zorunlu senkron layout reflow tetikliyor, sınıfı silip tekrar ekleyerek GPU katmanını her 40ms'de bir yok edip baştan kuruyordu. Bu da GPU composite layer yırtılması ve butonlarda anlık titreme/flicker oluşturuyordu.
   - Ayrıca ayarlar modalı, onay modalı gibi `fixed inset-0` modal diyalogları da `#game-main-content` içinde kaldığı için sarsıntı anında bozuluyordu.

---

## Alınan Mimari Kararlar

1. **Sabit Katmanların (Fixed Overlays & Modals) Sarsıntı Konteynerinden Tamamen Çıkarılması (`App.vue`):**
   - `<FloatingThumbBar />` ve tüm tam ekran modalları (`SettingsModal`, `ConfirmModal`, `AuthModal`, `CloudConflictModal`, `AdminPanel`), `#game-main-content` konteynerinin **dışına**, doğrudan kök `<div class="min-h-screen">` seviyesine taşındı.
   - `LabTab.vue` içindeki `showCodexModal` (Viral Kodeks) `<Teleport to="body">` ile sarmalanarak köke bağlandı.
   - Bu sayede `#game-main-content` transform alsa bile bu bileşenlerin containing block'u istisnasız **tarayıcı penceresi (viewport)** olarak kalır; asla aşağı kayamaz veya silinemez.

2. **Mobil Alt Dock'un Dinamik Teleportasyonu (`<Teleport to="body" :disabled="!isMobile">`):**
   - `App.vue` içine Tailwind'in `max-md` (768px) eşiğiyle senkron çalışan `isMobile` reaktif değişkeni ve `window.matchMedia('(max-width: 767px)')` dinleyicisi eklendi.
   - Masaüstünde (`isMobile = false`): `<nav>` sekme çubuğu teleport edilmez, masaüstü akışında Header ile Main arasında yerinde durur.
   - Mobilde (`isMobile = true`): `<nav>` doğrudan `document.body`'ye teleport edilir. Böylece `#game-main-content`'in sarsıntı animasyonundan fiziksel olarak tamamen bağımsızlaşır ve ekranın en altında sabit kalır.

3. **Sarsıntı Olay Yönetiminin Reflow-Free ve Kesintisiz Yapılması (`JuiceLayer.vue`):**
   - `void target.offsetWidth` zorlaması kaldırıldı.
   - Eğer eleman üzerinde zaten aynı veya daha güçlü bir sarsıntı devam ediyorsa, sınıf silinip tekrar eklenmez (bu işlem reflow ve GPU layer flash'ına neden olur). Yalnızca `shakeTimeout` sıfırlanıp uzatılır (coalescing).
   - Yalnızca yeni veya daha yüksek kademeli (`shake-hard`) sarsıntı geldiğinde sınıf geçişi yapılır.

4. **GPU Donanım Hızlandırmalı CSS Keyframe Dönüşümü (`src/style.css`):**
   - `@keyframes screen-shake`, `shake-soft-anim` ve `shake-hard-anim` içindeki `translate(x, y)` yönergeleri GPU kompozitörünü doğrudan tetikleyen `translate3d(x, y, 0)` formatına geçirildi.
   - İlgili sınıflara `will-change: transform` eklendi, çeviri tabanlı animasyon için anlamsız olan `transform-origin: center center` kaldırıldı.

---

## Doğrulama ve Sonuçlar
1. **Birim Testleri (`npm test`):**
   - 8 test dosyası, 164/164 test eksiksiz geçti (`src/core/screen-shake.test.ts` eklendi).
2. **TypeScript ve Üretim Derlemesi (`npm run build`):**
   - `vue-tsc` katı tip kontrolü 0 hata ile tamamlandı.
   - `vite build` 9.11 saniyede hatasız derlendi.
3. **Kullanıcı Deneyimi:**
   - Mobilde ve PC'de art arda sarsıntı/satın alma/dekad artışlarında alt sekmeler ve YUT / Maks Al çubuğu tek bir piksel bile titremeden, silinmeden sabit durur.
