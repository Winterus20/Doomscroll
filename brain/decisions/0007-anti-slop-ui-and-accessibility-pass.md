# ADR 0007: Anti-Slop UI Yönü & "Obsidian Dock" Erişilebilirlik Turu

**Tarih:** 2026-10-01
**Durum:** Kabul edildi
**İlgili:** `brain/research/ui-ux-anti-slop-research-and-plan.md`

## Bağlam

İnternet araştırması (avoid-ai-design AI-tells katalogu, Zach Gage Three Reads, Kyle Kukshtel oyun UI prensipleri, WCAG 2.2, backdrop-filter performans yazıları) ve kod denetimi iki sorun sınıfı ortaya çıkardı:

1. **Erişilebilirlik:** `slate-500` zeminde 4.18:1, `slate-600` 2.63:1 (AA 4.5:1 altı); dokunma hedefleri ~28-30px (HIG 44px altı); 52 native `title` mobilde görünmüyor.
2. **AI-slop telleri:** all-caps mono eyebrow kalıbı (SD4/T5), her yüzeyde backdrop-filter (K3 + perf), "starter" Vite favicon, `.affordance-pulse`'un amber butonda mor atması (renk sözlüğü ihlali), mono'nun etiket/dekorasyonda kullanımı (SD4m).

## Kararlar

1. **Tailwind slate override (A2):** `slate-500 → #74849b` (5.23:1), `slate-600 → #6e7f96` (4.87:1), `slate-700 → #6b7c94` — yalnız metinde kullanıldıkları için tek noktadan 55 kullanım AA'ya çekildi. `tailwind.config.js`.
2. **`hit-44` sınıfı (U3):** `::after` ile görsel boyutu bozmadan 44px hit-area; nav, stance, radyo ve satır butonlarına uygulandı.
3. **`v-tip` directive (U2):** `src/core/tooltip.ts` — hover'da anında, mobil tap'ta dokunma konumunda gösterilen global tooltip; 43 `title` kullanımı çevrildi (TabHero `title` prop'u hariç — sed kazası geri alındı).
4. **Blur budama (A4):** `glass-panel-card` ve `panel-hero` katı yüzey; `glass-panel-glow` blur'suz; blur yalnız modal overlay'de (`.modal-glass`) ve AnomalyOverlay'de kaldı. Nav/header radyo blur'u kaldırıldı (normal akışta arkada kayan içerik yok).
5. **Eyebrow temizliği (A1):** `.section-label`, TabHero `h2`, SettingsModal başlığı, Header "DOPAMİN", "Tümü", AchievementToast vb. sentence-case gövde yüzüne çevrildi; mono yalnız gerçek sayı verisinde. Nav etiketleri `font-semibold` sans.
6. **9:16 kimlik motifi:** `.hero-orb` dairesel blur yerine 9:16 dikey çerçeve (rotate 8°, ince gradient) — oyunun dikey feed kimliğinden türetildi.
7. **Renk sözlüğü tamiri (A5):** `.affordance-pulse` `--pulse-c1/c2` custom property'ye geçti; Hz butonu amber pulse veriyor.
8. **U4 "Sıradaki hedef" satırı:** Header'da sayaç altında tek odak çizgisi — alınabilir varsa o, yoksa en yakın hedefe kalan yüzde.
9. **U1 sadeleştirme:** radyo widget'ı `hidden sm:flex`, şebeke ikonları `hidden sm:block` — mobilde ilk bakışta sayaç + hedef tek odak.
10. **Favicon + meta (A3):** `public/favicon.svg` (telefon + yukarı ok, mor) ve `index.html`'e description/theme-color.
11. **Faz 4 juice:** `count-pop` (tıklama anında sayaç mikro-pop, reduced-motion'da kapalı) + satır "10:" butonuna `affordance-pulse`.

## Sonuçlar (doğrulandı)

- Tüm metin renkleri AA ✅ (yeniden hesapla ile).
- `npm run build` (`vue-tsc && vite build`) sıfır hata.
- backdrop-filter kullanımı 5'e düştü (önce: her panel/satır/hero).

## Sonuç (Status)

Kabul edildi. Mor/koyu zemin bilinçli karar olarak kaldı (konu zaten 02:47 gecesi); slop riski özgün türev detaylarla (9:16, diegetik statüs, reels caption) düşürüldü.
