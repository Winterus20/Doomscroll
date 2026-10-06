# UROBOROS: SP Eğrisi ve Başlangıç Kütlesi Uygulama Planı

Bu belge, görev uzmanlaşması gereği SP Eğrisi ve Nöral Ağaç Kök Düğüm planına odaklanmıştır.
Detaylı plan [plan-sp-curve.md](file:///data/data/com.termux/files/home/incremental/brain/research/plan-sp-curve.md) dosyasında belgelenmiştir.

## Kısa Özet
1. **SP Eğrisi:**
   - `break_singularity` (Planck Duvarını Yıkma) açılana kadar ilk ~5 koşuda tek tek net **1 SP** verilir.
   - `break_singularity` açıldıktan sonra kütle 1e308'i aştıkça **3, 5, 10, 50, 100...** şeklinde üstel olarak büyür (`Decimal.pow(10, (logMatter - 308) / 45) * 3`).
2. **Başlangıç Kütlesi (10.000 g):**
   - Kök düğüm `insomnia_heart` (1 SP) satın alındığında `startingMatter` getter'ı **10.000 g** kütle döner.
   - `resetRunState()`, `dimensionShift()` ve `buyGalaxy()` fonksiyonlarında oyuncu temiz bir şekilde 10.000 g kütle ile başlar.
3. **Bot Mekaniği:**
   - Botların 1. prestij sonrası kalıcı açık kalması ve otonomi kokpiti dönüşümü eşzamanlı subagent tarafından hazırlanmaktadır.
