# ADR-0022: Anomaly Asset Yenileme — Void Reel, Ağırlıklı RNG, Halka Zamanlayıcı

Tarih: 2026-10-02
Durum: Kabul edildi, uygulandı (v0.22.1 adayı)
Bağlam: `AnomalyOverlay.vue` inline SVG + eşit %33 RNG + `backdrop-blur-xl` + duplicate gradient ID + mobil taşma + hover'da wobble durması + klavye/ekran okuyucu yokluğu.

## Karar

1. **4. nadir tip `void`:** Ağırlık %5, ömür 9sn, ödül garanti kombo (30sn 7x + 15sn 300x). Pity 25 spawn'da 1 zorunlu void. `mythicPity` + `mythicsClicked` save v11 ile kalıcı.
2. **Ağırlıklı RNG:** fyp %42 / heart %32 / sponsor %21 / void %5. Ekonomi etkisi sınırlı: void beklenen kombo sıklığını ~%5 artırır, pity tavanı koleksiyon hissini korur.
3. **Asset mimarisi:** Inline SVG korundu (0 HTTP), gradient ID'leri `safeId(anomaly.id)` ile tekilleştirildi. Yeni void kara-delik SVG (yörünge + radial çekirdek).
4. **Zamanlayıcı:** İkon çevresinde SVG countdown halkası + alt bar `totalTime` oranlı. `totalTime` alanı eklendi (void 9sn, diğerleri 14sn).
5. **Performans:** Kart içi `backdrop-blur-xl` kaldırıldı (solid `#0a0d14`), `contain: layout paint`, mobil `max-w-86vw` + dar ekran spawn aralığı.
6. **Erişilebilirlik:** `role=button`, `tabindex=0`, Enter/Space, `aria-label`, focus-visible halkası, `prefers-reduced-motion` + `.reduce-anim` uyumu.
7. **Ses:** `playAnomalySpawn(type)` void varyantı + `playMythicCollect()` (riser + sub-drop + 6'lı çan). Combo'da `playCombo` korunur.
8. **Wobble:** Taban `translate(-50%,-50%)` sabitlendi, hover pause kaldırıldı (hover = brightness boost).

## Reddedilenler

- Harici PNG/WebP sprite: HTTP + önbellek maliyeti, mevcut 0-byte ek yük avantajı kaybolurdu.
- Canvas ile ikon çizimi: SVG crisp + a11y + CSS animasyon üstünlüğü korunmak istendi.
- Void'e ayrı buff tipi: Kombo getter'ı (`fyp && heart`) bozulurdu; void iki buff vererek mevcut ekonomiye bağlandı.

## Sonuçlar

- `types.ts`: `AnomalyType += void`, `totalTime`, `mythicsClicked`, `mythicPity`.
- `game.ts`: save v11, weighted+pity spawn, void click, `cri_void` ctx.
- `achievements.ts`: `cri_void` gizli başarım.
- `AnomalyOverlay.vue`: TransitionGroup pop, halka, klavye, Gem/Sparkles ikonları.
- `style.css`: void glow, pop-in/out, focus, void aura.
- `ScreenOverlay.vue`: `crisis-aura-void`.
- `StatsTab.vue`: Void sayacı.
- Doğrulama: `npm run build` 0 hata (1642 modül).
