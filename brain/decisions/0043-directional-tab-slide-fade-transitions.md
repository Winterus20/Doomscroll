# ADR-0043: Sekmeler Arası Yön Duyarlı Slide-Fade Geçiş Animasyonu (Directional Tab Transition)

## Durum
Kabul Edildi (Accepted)

## Tarih
2026-10-06

## Bağlam ve Problem Tanımı
Kullanıcı, sekmeler arasında gezinirken (özellikle mobilde sağa/sola kaydırırken veya alt dock butonlarına basıldığında) görsel akıcılığı artıracak bir animasyon talep etti:
*"kaydirma yaparken guzel bi animasyon olursa iyi olur"*

Daha önce sekmeler anında (hard switch) değişiyordu. Bu durum, yatay kaydırma jestiyle birlikte kullanıldığında fiziksel jest ile görsel tepki arasında bir kopukluk hissettiriyordu. Ancak kontrolsüz animasyonlar incremental oyunlarda şu riskleri barındırır:
1. İki sekmenin aynı anda DOM'da bulunması sonucu dikey zıplama ve yerleşim bozulmaları (layout shift).
2. Sayfada yatay kaydırma çubuklarının anlık belirmesi (`horizontal scroll overflow`).
3. Düşük donanımlı cihazlarda takılma (jank) veya erişilebilirlik tercihlerinin (`prefers-reduced-motion` / `reduceAnimations`) göz ardı edilmesi.

## Alınan Kararlar

1. **Dinamik Yön Tespiti (`slideDirection`):**
   - Aktif sekme ile hedef sekmenin `TAB_ORDER` dizisindeki indeks farkı incelenir.
   - İleri gidiliyorsa (`targetIndex > currentIndex`): `slideDirection = 'next'`
   - Geri gidiliyorsa (`targetIndex < currentIndex`): `slideDirection = 'prev'`
   - Mobilde sağa/sola jestler veya dock'taki herhangi bir sekmeye tıklandığında yön anında hesaplanır.

2. **Vue `<Transition>` Yapılandırması:**
   - `<Transition :name="transitionName" mode="out-in">` kullanıldı.
   - `mode="out-in"` sayesinde eski sekme DOM'dan çıkmadan yenisi eklenmez; böylece çift bileşen montajı ve sayfa boyu zıplamaları sıfıra indirildi.
   - Her sekme bileşenine benzersiz `key` niteliği atandı (`key="dimensions"`, `key="lab"`, vb.).

3. **GPU Hızlandırmalı CSS Animasyonları (`transform3d` + `opacity`):**
   - Geçiş süresi tam 180ms olarak ayarlandı (hızlı ve taktil geri bildirim, oyunu geciktirmez).
   - `.tab-slide-next-enter-from`: `opacity: 0; transform: translate3d(24px, 0, 0);`
   - `.tab-slide-next-leave-to`: `opacity: 0; transform: translate3d(-24px, 0, 0);`
   - `.tab-slide-prev-enter-from`: `opacity: 0; transform: translate3d(-24px, 0, 0);`
   - `.tab-slide-prev-leave-to`: `opacity: 0; transform: translate3d(24px, 0, 0);`
   - Geçiş eğrisi: `cubic-bezier(0.16, 1, 0.3, 1)` (Out-Expo hissi veren akıcı sönümleme).

4. **Yatay Taşma ve Boyut Güvencesi:**
   - `<main>` kapsayıcısına `overflow-x-hidden` ve `min-h-[380px]` sınıfları verilerek yatay kaydırma çubuğu oluşumu tamamen engellendi.

5. **Erişilebilirlik ve Performans Güvencesi:**
   - Oyuncunun `store.settings.reduceAnimations` tercihi açık olduğunda yönlü kaydırma yerine hafif `tab-fade` (yalnızca saydamlık) uygulanır.

## Doğrulama
- Vitest birim testleri: 162/162 geçti.
- TypeScript tip kontrolü (`vue-tsc`) ve Vite derlemesi: 0 hata ile tamamlandı.
