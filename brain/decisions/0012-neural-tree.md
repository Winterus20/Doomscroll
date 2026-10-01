# ADR 0012 — Nöral Ağaç: Düz SP Dükkânından Öncüllü Yetenek Ağacına (Cookie Clicker: Heavenly Upgrade Tree)

**Tarih:** 2026-10-01 | **Durum:** Kabul edildi (uygulama aşamasında) | **Sürüüm:** v0.14.0

## Bağlam
Şafak (06:00) prestij katmanının kalıcı ilerleme havuzu, düz bir `SINGULARITY_UPGRADES` grid'i: SP (Uykusuzluk Puanı) ile listeden bağımsız yükseltme alınan tek boyutlu dükkân. Kullanıcı talebi: "SP ağacında farklı oynanışların (pasif/aktif) farklı build'lere dönüşmesini istiyorum; şu an herkes aynı listeden aynı şeyleri alıyor."

Araştırma bulguları (bkz. plan: `sp_yetenek_ağacı`):

- **Realm Grinder:** faction/oyun tarzı seçimleri birbirine karşılamaz kılındığında bile hepsi viable olmalı; seçilen taraf küçümsenirse oyuncu "yanlış oynadığını" hisseder.
- **Synergism:** tek optimal yol sorununa karşı — tek doğrusal güç sıralaması sunan sistemlerde oyuncu wikiden "doğru" satın alım sırasını kopyalar, karar mekaniği ölür.
- **Cookie Clicker (Heavenly Upgrade Tree):** öncüllü (ebeveyn alınmadan çocuk görünmez) ağaç hem sunum hem pacing aracıdır; dal yapısı doğal olarak build kimliği yaratır.
- **Aktif oyun = ivmelendirici prensibi:** tıklama pasif üretimi asla geçmemeli, yalnızca hızlandırmalı (aktif = accelerant, idle = taban).

## Karar
1. **Yapı:** SP dükkanı, öncül zincirli **Nöral Ağaç**'a dönüştürülür. Kök düğüm ("Uykusuzluğun Kalbi", 1 SP) → üç dal: **🌙 Uyku Dalı (pasif)**, **👍 Başparmak Dalı (aktif/tıklama)**, **☯️ Hibrit Köprü**. Ebeveyn alınmadan çocuk düğüm görünmez (kilitli = soluk + koşul tooltip'i). Ağaç **kalıcıdır**: hiçbir reset action'ine girmez (başarımlarla aynı kalıcılık politikası).
2. **Mevcut dükkân ağaca taşınır:** mevcut `SINGULARITY_UPGRADES` id'leri (`neural_chip`, `neural_nest`, `caffeine_drip` vb.) korunarak ağaç pozisyonlarına yerleştirilir; state alanı `singularityUpgrades: Record` zaten persist olduğundan eski save'ler migrasyonsuz uyumludur — id eşlemesi migration'da yeni düğüm id'lerine çevrilir.
3. **Pasif dal (Uyku):** offline kazanç yüzdesi, kalıcı üretim ×çarpanları, bot frekansı, koloni üreme hızı, Şafak ilerleme hızı.
4. **Aktif dal (Başparmak):**
   - **Senkron düğümü:** CPS-to-click senkronu %2 tabandan başlar; her seviye +%1.5, maksimum 4 seviye ile **%8**.
   - **Combo Sistemi açma düğümü:** manuel tıklamalar seri (combo) oluşturur; seri 1.5 saniye içinde tekrarlanan tıklamayla uzar, 1.5 sn sessizlikte söner. Seri eşikleri: **5 tıklama → ×2**, **15 tıklama → ×3**, **40 tıklama → ×5** manuel kaydırma gücü çarpanı.
   - Kriz/anomali ödül çarpanı, tıklama buff süresi uzatmaları.
5. **Hibrit köprü:** her iki dalda da belirli sayıda düğüm şartı arayan sinerji düğümleri (ör. "Üretimin %10'u tıklamaya eklenir"). İki dala da yatırım gerektirdiği için "tek optimal yol" riski yapısal olarak kırılır.
6. **Hariç seçim (binary choice) düğümleri:** ağacın 2 noktasında ikili seçim — alınan düğüm diğerini **aynı prestij döngüsünde kilitler**, ancak seçilmeyen taraf küçük bir **telafi ödülü** verir. Seçim sonraki prestijde tekrar gözden geçirilebilir. (Realm Grinder dersinin uyarlanması: her seçim viable olsun, yanlış seçim stresi olmasın.)
7. **Denge:** ilk 3 prestijde ağaç ~%30 doldurulabilir olacak; combo maksimumi (×5) pasif taban üretimi asla geçmeyecek, yalnızca ivme sağlayacak.

## Neden öncüllü ağaç, düz liste değil?
Düz listede satın alım sırası yalnızca bütçe meselesidir → Synergism tarzı "tek optimal yol" listeleri ortaya çıkar. Öncül zinciri + dal ayrımı + hariç seçim düğümleri, satın alımı **karar dizisine** çevirir: oyuncu build kimliğini ağaçta çizer (Cookie Clicker'ın heavenly modeli), hibrit köprüler ve telafi ödülleri ise Realm Grinder'ın "her yol viable" kuralını uygular.

## Sonuçlar
- Yeni dosya: `src/components/NeuralTreeTab.vue` (öncüllü ağaç UI: kilitli/alınmış/hariç seçim durumları, bağlantı çizgileri, combo rozeti Header'da).
- Değişen: `types.ts` (`NeuralNode` tipi, `neuralNodesBought`, `clickCombo`, save sürümü + migration), `game.ts` (`NEURAL_TREE` sabiti, `neuralEffects` getter, `buyNeuralNode`, combo decay `game-loop.ts` içinde, `manualClickPower` senkron + combo çarpanı), `SingularityTab.vue` (ağaca yönlendirme).
- Kayıt uyumluluğu: mevcut `singularityUpgrades` id'leri korunur; `neuralNodesBought` yoksa boş başlar, eski alımlar migration'da ağaç düğümlerine eşlenir.
- Denge doğrulaması: `npm run build` + 5 dk playtest ile pasif/aktif pay kontrolü (özellik doğrulanmadan `completed.md`'ye işlenmez).
