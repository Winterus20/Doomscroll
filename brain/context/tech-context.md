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

## 3. Bulut Kayıt, Test ve Ses Altyapısı
- **Cloud Save:** Firebase Auth + Firestore ile bulut kayıt; misafir ve Google ile giriş desteklenir.
- **Bulut Çakışma Yönetimi:** `CloudConflictModal` ile yerel/bulut zaman damgası karşılaştırılır, kullanıcı seçimi korunur.
- **Birim Testleri:** Vitest (`node` ortamı) ile `src/game/` veri modülleri test edilir (`unlocks`, `pacing`, `challenges`, `achievements`).
- **Müzik Motoru:** `src/core/music-engine.ts` Web Audio osilatörleriyle prosedürel müzik üretir; harici ses dosyası yoktur.
- Detaylı faz ve görev durumu için `brain/tasks/todo.md` dosyasına bakılır.
