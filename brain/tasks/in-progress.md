# Aktif Görev (In-Progress)

## 📌 Görev: Kesintisiz Arka Plan Müzik Motoru (Night Owl Lo-Fi & Synth BGM Engine)
- **Hedef:** Gece 02:47 yorgan altı atmosferine uygun kesintisiz, 0 KB harici bağımlılıksız, 4 istasyonlu Web Audio API müzik motoru, canlı Lo-Fi Radyo mini-player UI ve Settings kontrolleri.
- **Kapsam:**
  - [ ] `src/models/types.ts`: Müzik ayarları tipleri (`musicEnabled`, `musicVolume`, `musicTrack`, `vinylCrackle`, `customAudioUrl`).
  - [ ] `src/core/music-engine.ts`: Lookahead scheduler, 4 radyo kanalı (Lo-Fi Chill, Synthwave, Ambient Drone, Subway Groove), stereo delay, vinil cızırtısı.
  - [ ] `src/stores/game.ts`: Müzik ayarları, action'lar ve serialize/deserialize senkronizasyonu.
  - [ ] `src/components/Header.vue`: Lo-Fi Radyo animasyonlu mini oynatıcı widget'ı.
  - [ ] `src/components/SettingsModal.vue`: Müzik ses düzeyi, istasyon seçimi ve vinil efekti kontrolleri.
  - [ ] `src/App.vue`: Kullanıcı etkileşiminde ses canlandırma (Web Audio autoplay unlock).
  - [ ] `npm run build` ile sıfır hata doğrulaması.
