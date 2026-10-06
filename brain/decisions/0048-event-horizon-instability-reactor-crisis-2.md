# ADR-0048: Olay Ufku Kararsızlık Reaktörü ve Hibrit Kriz Sistemi (Crisis 2.0)

## Durum
Kabul Edildi (Accepted) — Uygulamaya Alındı

## Bağlam ve Problem
Orijinal Kriz sekmesi (`CrisisTab.vue`) ve motoru, eski bir prototipten kalma sabit `caffeineEnergy` (100 tavan, +1.2/sn sabit dolum) ve 4 adet düz büyü (`fast_charge`, `espresso_shot`, `noise_cancelling`, `sleep_denial`) kullanıyordu. Bu yapının problemleri:
1. Oyun $10^{10}$ kütleden $10^{308}$ kütleye genişlerken enerji ve etkiler ölçeklenmiyordu.
2. Kod isimlendirmeleri (`caffeineEnergy`, `espresso`) projenin kozmik tekillik ve uzay-zaman lore'uyla çelişiyordu.
3. Diğer sistemlerle (anomaliler, kombolar, parazitler) derin sinerjisi yoktu; oyuncu sadece basıp bekliyordu.

## Karar (Hibrit Çözüm)
Kriz sistemi, Cookie Clicker Grimoire derinliği ile dinamik risk-ödül döngüsünü birleştiren **Olay Ufku Kararsızlık Reaktörü (Event Horizon Overdrive)** hibrit modeline dönüştürülmüştür:

1. **Termal Kararsızlık Reaktörü (%0 - %100):**
   - Sabit enerji yerine, oyuncunun müdahaleleriyle ısınan dinamik bir reaktör.
   - Doğal soğuma: saniyede -%1.2 (AFK kalan oyuncu asla krizde kilitlenmez).
   - 4 Faz: Durgun (%0-30, $1\times$), Rezonans (%31-60, $+50\%$ Hz, $+30\%$ Anomali), Tatlı Nokta (%61-90, $8\times-12\times$ Kütle, $+100\%$ Anomali, %200 Parazit Primi), Meltdown (%100, 10 sn aşırı ısınma, %50 üretim cezası).

2. **Dört Kozmik Müdahale (Grimoire 2.0):**
   - `quantum_compression` (+25 Isı): Ekrana anında 1 adet Altın Kozmik Dalgalanma fırlatır.
   - `time_dilation` (+20 Isı): Ekranda aktif olan TÜM geçici güçlendirmelerin (Süpernova 7x, Kütle Patlaması 777x vb.) süresini $+15$ saniye uzatır.
   - `magnetic_vent` (-35 Isı Soğutma): Isıyı düşürür, parazitleri %175 primle nakde çevirir.
   - `planck_surge` (+45 Isı): 20 saniye boyunca Çekim Hızını $4\times$ ve Manuel Yutma gücünü $10\times$ yapar.

3. **Canlı Fırsat İkilemleri (Event Dilemmas):**
   - Reaktör Tatlı Noktadayken ara sıra beliren 15 saniyelik pozitif fırsat bildirimleri (A seçeneği stabilize eder/kütle verir, B seçeneği rezonansı körükler/boyutları katlar). Kaçırılırsa sıfır ceza.

4. **Geriye Dönük Uyumluluk:**
   - Eski save'lerdeki `caffeineEnergy` reaktör ısısına dönüştürülür, kayıtlar bozulmaz.

## Sonuçlar ve Faydalar
- Yüksek beceri tavanı: Zaman Genleşmesi ile $7\times \times 777\times$ komboları dondurulup devasa sıçramalar yapılabilir.
- Lore bütünlüğü: Tüm terminoloji kuantum ve olay ufku fiziğine kavuştu.
- Taktil UI: Rezonans ve alev efektleriyle Balatro görsel mimarisi tamamlandı.
