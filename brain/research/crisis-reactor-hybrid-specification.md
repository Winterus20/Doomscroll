# Olay Ufku Kararsızlık Reaktörü (Crisis 2.0) Hibrit Sistem Spesifikasyonu

## 1. Giriş ve Temel Amaç
Bu doküman, UROBOROS projesinde Kriz sekmesinin (`CrisisTab.vue`) ve Kriz motorunun tam teknik ve matematiksel spesifikasyonudur.

## 2. Reaktör Isı Fiziği & Formülleri
- **Isı Aralığı:** $0 \le H \le 100$
- **Doğal Soğuma:** $H_{t} = \max(0, H_{t-1} - 1.2 \times \Delta t)$
- **Fazlar:**
  - `dormant` (%0 - %30): Çarpan: $1.0\times$
  - `resonance` (%31 - %60): Çekim Hızı: $+50\%$, Anomali sıklığı: $+30\%$
  - `sweet_spot` (%61 - %90): Kütle Akışı: $8.0\times$, Anomali sıklığı: $+100\%$, Parazit patlatma primi: %200
  - `meltdown` (%91 - %100 veya $H=100$ tetiklendiğinde): 10 saniyelik kilitlenme, Kütle Akışı: $0.5\times$, bittiğinde $H = 25$

## 3. Müdahaleler (Interventions)
1. `quantum_compression` (+25 Isı): Ekrana 1 adet Altın Kozmik Dalgalanma spawnlar.
2. `time_dilation` (+20 Isı): Ekranda süresi işleyen tüm geçici buff'lara (Süpernova, Kütle Patlaması, Rezonans vb.) $+15$ saniye ekler.
3. `magnetic_vent` (-35 Isı Soğutma): Isıyı 35 puan düşürür, parazitleri %175 primle nakde çevirir.
4. `planck_surge` (+45 Isı): 20 saniye boyunca Çekim Hızını $4\times$ ve Manuel Yutma gücünü $10\times$ yapar.

## 4. Canlı İkilemler (Dilemmas)
Reaktör `sweet_spot` fazındayken (%61-90) her 60-120 saniyede bir %25 şansla tetiklenir:
- 15 saniye geri sayım süresi.
- Seçenek 1 (Stabilizasyon): Isıyı düşür, anlık pasif kütle kazan.
- Seçenek 2 (Aşırı Rezonans): Isıyı yükselt, geçici boyut çarpanı kazan.
- Seçilmezse sıfır ceza ile zaman aşımına uğrar.

## 5. UI & Taktil Deneyim
- TabHero ve başlıklar: "Kozmik Kriz Yönetimi: Olay Ufku Reaktörü"
- İnteraktif Termal Bar: Faz göstergesi (Durgun, Rezonans, Tatlı Nokta, Meltdown)
- 4 Taktiksel Kart: Enerji maliyetleri, risk/soğutma oranları, Lucide ikonları
- Canlı İkilem Banner'ı: Kompakt ve dikkat çekici 15s barı
