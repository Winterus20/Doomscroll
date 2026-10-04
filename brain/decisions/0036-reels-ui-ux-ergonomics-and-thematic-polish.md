# ADR-0036: Reels UI/UX, Taktil Ergonomi ve Tematik İyileştirme Mimarisi

- **Tarih:** 2026-10-04
- **Durum:** Kabul Edildi (Implemented)
- **Kapsam:** `Header.vue`, `DimensionRow.vue`, `DimensionsTab.vue`

---

## 1. Bağlam ve Sorun
Oyunun temel vaadi *"Gece 02:47'de yatağa girip sadece 2 dakika Reels izleyeceğim derken sabah 06:15'e sürüklenmek"* olmasına rağmen, 3 uzman subagent denetiminde üç temel problem tespit edildi:
1. **Space Tuşu Odak Tuzağı (Keyboard Focus Trap):** Kullanıcı herhangi bir butona bastığında, Space tuşuna basınca tarayıcı odağı o butonda kaldığı için kaydırmak yerine son tıklanan buton tetikleniyordu (istenmeyen harcama).
2. **Tematik Görsel İzolasyon:** Her boyuta ait ironik metinler (*"Gece 02:47 — Sadece 1 video..."*, *"Subway Surfers + Reddit"*) yalnızca masaüstü tooltip'lerinde gizliydi; mobilde görünmüyordu. Dikey video/feed hissi yoktu.
3. **Bilişsel Yük ve Rozet Enflasyonu:** Satır başına 7 farklı rozet (144p temel rozetleri, ölü sinerji etiketleri, 10'lu mikro span çubukları) ekranda yatay taşmaya ve görsel gürültüye sebep oluyordu.

---

## 2. Alınan Mimari Kararlar

1. **Space Tuşu Focus Trap Düzeltmesi ve Web Haptics:**
   - `Header.vue`: `handleKeydown` fonksiyonunda `e.code === 'Space'` geldiğinde odaklanmış buton varsa `target.blur()` çağrılarak odağı temizlendi; `handleManualClick` içine mobil dokunsal titreşim (`navigator.vibrate(8)`) eklendi.
2. **Kademeli Açılma (Progressive Disclosure):**
   - `Header.vue`: Duruş (Stance) butonları kutusu acemi oyuncudan (`bought < 25`) gizlendi; ilk format 25 adede ulaştığında veya duruş açıldığında gösterildi.
3. **9:16 Mikro Video Posteri ve Yüzeye Çıkarılan Altyazılar:**
   - `DimensionRow.vue`: Satırın soluna tier renginde mikro `Play` (▶) ikonu ve alt oynatma çizgisi içeren 9:16 dikey video çerçevesi eklendi.
   - Başlığın altına gece saatini ve ironik alıntıyı içeren tek satır akıcı altyazı (`tierConfig.subtitle`) yüzeye çıkarıldı.
4. **Linear / Apple Stili Entegre Buton Dolum Zemini:**
   - `DimensionRow.vue`: 10 ayrı `span` çubuğu yerine; butonun arka planında `packProgress` oranında dolan `%0 → %100` gradyan dolgu ve yanına kompakt `(X/10)` göstergesi entegre edildi. 80 gereksiz DOM span'ı kaldırıldı, yatay taşmalar önlendi.
   - Anlamsız `144p` etiketleri ve henüz satın alınmamış partner sinerji etiketleri gizlendi.
5. **Dokunmatik Yukarı Kaydırma Jesti (Touch Swipe-Up) ve Bento Temizliği:**
   - `DimensionsTab.vue`: Mobilde ekranda yukarı doğru parmak kaydırma (`touchstart`/`touchend` $\Delta y \le -36px$) doğrudan `manualClick()` aksiyonunu tetikleyen bir jeste dönüştürüldü.
   - Boş "Akış Kümesi D8 çağında açılır" yer tutucu kutusu kaldırıldı; erken oyunda tek kalan Akış Sıçraması kartı bento ızgarasını tam kaplayacak şekilde dinamikleştirildi (`gridColsClass`).

---

## 3. Doğrulama ve Sonuç
- `npm run build` (`vue-tsc && vite build`): **0 hata, 1686 modül derlendi**.
- `npx vitest run`: **154/154 test başarıyla geçti**.
- Oyun hem görsel olarak modern Linear estetiğine kavuştu hem de dikey Reels akışı ve taktil mobil ergonomi sağlandı.
