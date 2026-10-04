/**
 * Doomscroll: The Endless Reels - Music Engine Façade
 * 
 * Bu dosya, parçalanmış ve modüler hale getirilmiş `src/core/music/` paketine
 * kesintisiz geriye dönük uyumluluk (backward compatibility) sağlayan bir cephedir (façade).
 * 
 * Modül Yapısı:
 * - `src/core/music/types.ts`: Parça metadatası, track listesi ve SynthContext sözleşmesi
 * - `src/core/music/notes.ts`: 12-ton kromatik ve caz frekans tablosu
 * - `src/core/music/audio-graph.ts`: Web Audio API zinciri, tape saturation, kaset & yağmur yatağı
 * - `src/core/music/instruments/keys.ts`: Rhodes Mk1, Lofi Pluck, Supersaw, Lead synth
 * - `src/core/music/instruments/bass.ts`: Sub-bass portamento, synth bass
 * - `src/core/music/instruments/drums.ts`: J Dilla drunk drums, kicks, snares, hats, percussions
 * - `src/core/music/instruments/ambient.ts`: Boru orgu, koro nefesi, Shepard inişi, çanlar
 * - `src/core/music/tracks/lofi-chill.ts`: 02:47 AM Lo-Fi Chill Auto-DJ sequencer
 * - `src/core/music/tracks/synthwave.ts`: Cyberpunk Midnight sequencer
 * - `src/core/music/tracks/ambient-drone.ts`: Interstellar Deep Sleep sequencer
 * - `src/core/music/tracks/subway-groove.ts`: Subway Beats & Groove sequencer
 * - `src/core/music/index.ts`: MusicEngine orkestratör sınıfı ve singleton nesnesi
 */

export * from './music'
export { musicEngine as default } from './music'
