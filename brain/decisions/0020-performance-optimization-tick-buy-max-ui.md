# ADR-0020: Tick / Satın Alma / UI Performans Optimizasyonu

Tarih: 2026-10-02
Durum: Kabul edildi, uygulandı (`npm run build` 0 hata, 1642 modül)

## Bağlam

Saniyede binlerce satın alma + sayı artışı olduğunda sayfa donuyordu.
Kök nedenler (satır numaralı denetim):

- `buyMaxDimension` her pakette `Decimal.pow` ile 500 tura kadar dönüyordu;
  `maxAll` + 8 bot `max` modda saniyede binlerce `pow` üretiyordu.
- `getDimensionMultiplier / getDimensionCost` iç-fonksiyon getter'ları Vue
  computed önbelleğine takılmıyordu; zincir simülasyonu her tick 7+ kez
  `pow + new Decimal + challenge/neural` hesaplıyordu.
- `checkAchievements + syncUnlocks` her 50 ms'de tüm listeyi tarıyordu.
- `matterPerSecond` tick içinde 2 kez hesaplanıyordu (`highestDps`).
- `JuiceLayer` her parçacıkta `localStorage.getItem + JSON.parse` yapıyordu
  (üstelik yanlış anahtar: `doomscroll-save`, gerçek anahtar
  `DOOMSCROLL_SAVE_V1` sıkıştırılmış).
- `game-loop` kare başına sınırsız tick çalıştırıyordu (spiral-of-death).
- Offline 24 saatte ~15 bin `update()` çağrısı yapıyordu (10 sn kaba adım).

## Karar

1. **Matematiksel toplu alım:** `calcGeometricTotal + calcMaxPacks`
   (`base·ratio^start·(ratio^n−1)/(ratio−1)` + log10 tahmini + ±8 düzeltme).
   `buyMaxDimension`, `buyMaxTickspeed`, `maxAll`, otomatik bot `max` ve
   `getDimensionPackCost` döngüsüz O(1) oldu. Davranış aynı (aynı toplam
   maliyet, aynı `registerChallengeBuy` birimi), sadece tek işlemde uygulanır.
2. **İç-fonksiyon memo'ları:** `memoChallengeEffects`, `memoNeuralEffects`,
   tier bazlı `_dimMultCache / _dimCostCache` (içerik-anahtarlı, prestijde
   otomatik ıskalar). Değer getter'larındaki Vue önbelleği korunur.
3. **Tick yerelleştirmesi:** `update()` zincir + D1 üretiminde çarpanları
   tick başına bir kez hesaplar (`dimMults[]`), `highestDps` için
   `matterPerSecond` tek çağrıya indi.
4. **Seyreltme:** `syncUnlocks` + `checkAchievements` canlıda 0,5 sn'de bir;
   hepsi açıkken erken çıkış. Offline başarım mantığı korunur (120 adım).
5. **Offline kademesi:** 1 sn (1 saate kadar) → 10 sn (sonraki 1 saat) →
   60 sn (geri kalan). Uzun süreler ~6 kat hızlanır.
6. **Juice sıcak döngüden disk okumaz:** `juiceModeCache + __setJuiceMode +
   doomscroll:juice-mode + doomscroll-juice-mode` minik anahtarı.
   `App.vue` tek yazan, `JuiceLayer` sadece okur.
7. **Spiral koruması:** kare başına max 5 tick, fazlası atılır (0,25 sn
   simülasyon garantisi, takılmada kaskat donma yok).

## Sonuçlar

- Bot `max` + `Maks` artık kare başına yüzlerce `pow` değil, tier başına
  2 `pow` yapar.
- Tick başına `getDimensionMultiplier` 15+ çağrıdan 8 çağrıya (çoğu önbellek
  isabeti), `matterPerSecond` 2 çağrıdan 1'e indi.
- Arka plan dönüşü ve 24 saat offline belirgin hızlanır.
- Bilinen ödünler: 0,5 sn başarım/kilit gecikmesi; takılmada <1 sn simülasyon
  kaybı; 60 sn kaba adımda bot az-ateşler (üretim odaklı, kabul edilebilir).

## Doğrulama

- `npm run build` (`vue-tsc && vite build`): 0 tip hatası, 1642 modül.
- Beklenen oyun-içi test: botlar `Maks` modda 1 dk + `Maks Al` spam +
  sekme gizle/göster; sayaç akıcı, `Welcome Back` raporu doğru, maliyetler
  döngüsüz haliyle aynı.
