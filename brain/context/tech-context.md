# Tech Context & Constraints (Teknoloji Bağlamı)

## 1. Teknoloji Yığını
- **Frontend Framework:** Vue 3 (Composition API, `<script setup lang="ts">`)
- **Paketleyici (Bundler):** Vite 6.x
- **Tip Sistemi:** TypeScript 5.7+ (Strict mode, noImplicitAny)
- **State Yönetimi:** Pinia 3.x
- **Büyük Sayı Kütüphanesi:** `break_eternity.js` (Tetrasyon ve $10^{10^{308}}$ üzeri sayılar)
- **Stil & Tasarım:** Tailwind CSS 3.4 (Cyberpunk / Sci-Fi dark theme)
- **İkon Seti:** `lucide-vue-next`
- **Sıkıştırma:** `lz-string` (v1.5)
- **Kutlama / Parçacık:** `canvas-confetti`

## 2. Kritik Teknik Kısıtlar ve İpuçları
- `break_eternity.js` içinde `isNaN` metodu küçük 'n' ile `isNan()` şeklindedir. Sayı kontrolü yaparken daima `dec.isNan() || Number.isNaN(dec.mag)` kullanılmalıdır.
- Vue bileşenleri içinde doğrudan `window.AudioContext` çağrılmadan önce kullanıcı etkileşimi beklenmelidir (`resume()` koruması).
- Windows ortamında komut çalıştırırken tek tırnak (`'`) yerine çift tırnak (`"`) kullanılmalıdır.
