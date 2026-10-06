# ADR 0047 — Kuantum Parçacık Reaktörü, Akı Matrisi & Kozmik Relikler (Lab Hibrit Reformu)

**Tarih:** 2026-10-06 | **Durum:** Kabul edildi | **Sürüm:** v0.38.0

## Bağlam
Oyunun genel teması *UROBOROS: The Cosmic Feast* (atomaltı kuantum bağlarından tüm Samanyolu'nu yutan tekilliğe geçiş) olarak güncellenmişti; ancak Lab sekmesinde ve veri katmanında eski konseptten kalma tohum isimleri (*cat_audio*, *cheese_sizzle*, *subway_beat*, *sigma_phonk*, *mukbang_drama*, *cat_burger*, *brainrot_remix*), modlar (*fyp*, *evergreen*, *mutation*) ve mekanik isimleri (*Viral Fırlatıcı*, *Viral Drop*) yer alıyordu. Ayrıca oyuncu 4 sentezi tamamladıktan sonra Lab sekmesi statikleşiyor, yeni bir hedef sunmuyordu.

Kullanıcı talebi: Geriye dönük uyumluluk olmaksızın en iyi hibrit sistemi kurmak.

## Karar
3 büyük mimari yaklaşımın en güçlü yönleri tek bir sistem altında birleştirildi:

### 1. Saf Kuantum Parçacık Kataloğu
Eski isimler tamamen kaldırılarak evrensel bilimkurgu parçacıklarına dönüştürüldü:
- **Temel Parçacıklar:**
  - `photon_resonator` (⚡): Frekans uyarımı, komşulara +%15 rezonans yayar.
  - `heavy_nucleon` (⚛️): Kararlı kütleçekim çekirdeği, yoğun pasif kütle üretir.
  - `gluon_binder` (🌀): Kuvvetli nükleer kuvvet, manuel yutma darbesini ikiye katlar.
  - `graviton_trap` (🕳️): Mikro uzay-zaman eğriliği, Kriz sıklığını artırır ve gravitasyonel şok yayar.
- **Egzotik Sentezler (Parçacık Atlası):**
  - `dark_matter_core` (🌌): Nükleon + Gluon $\to$ Hem pasif hem yutma darbesi katlanır.
  - `magnetic_shield` (🛡️): Foton + Nükleon $\to$ Parazit kütle emişini -%25 soğurur.
  - `tachyon_flux` (💫): Graviton + Gluon $\to$ Manuel yutma $\times 2$ ve Kriz sıklığı +%30.
  - `higgs_boson` (💥): Foton + Graviton $\to$ Tüm küresel kütleye $\times 3.0$ evrensel katsayı.

### 2. Akı Devresi (Flux Circuit) & Süperiletken Işın Hatları
- **Merkez Odak Çekirdeği (Hücre 4):** Kendisi $\times 1.50$, 4 komşusuna $+%20$ plazma yayar.
- **Süperiletken Hatlar:** 3 hücre dolu ve rezonanstaysa $\times 1.12$ satır/sütun akısı, mono-izotopta $\times 1.20$ rezonans sağlar.
- **Plazma Besleme Rejimleri:**
  - `overdrive`: Plazma şarjı %80 daha hızlı dolar, süperkritik boşalımda $2\times$ kütle fışkırır (Aktif).
  - `superconductor`: Şarj dondurulur, matris kalıcı $2.5\times$ pasif kütle üretir (AFK).
  - `fluctuation`: Sentez şansı $3\times$ artar (Kaşif).

### 3. Taktil Zirve: Süperkritik Boşalım (Supercritical Venting)
- Plazma barı %100 dolduğunda tekilliğe boşaltılır; anında 60s kütle akar, 25s boyunca canlı plazma çarpanı ve $3\times$ Kozmik Kriz yağmuru başlar.

### 4. Meta-İlerleme: Reaktör Çöküşü & Kozmik Relikler (Reactor Collapse)
- Kodeksteki 4 egzotik formülün tamamı sentezlendiğinde `collapseReactor()` açılır.
- Reaktör tekilliğe kurban edilir, matris ve formüller sıfırlanır; kalıcı **Kozmik Relik Seviyesi** kazanılır:
  - Seviye 1: Çekim Hızı (Hz) tabanına kalıcı bonus.
  - Seviye 2: Kozmik Kriz etki sürelerine kalıcı bonus.
  - Seviye 3: Tekillik Çöküşü (Big Crunch) SP kazancına kalıcı çarpan.
  - Seviye 4: Rezonanstaki hücre başına boyutlara evrensel ivme.
  - Seviye 5+: Sınırsız ölçeklenen evrensel kütle relik çarpanı.

## Doğrulama
- `npm test`: 188 testin tamamı YEŞİL (10 test dosyası).
- `npm run build`: `vue-tsc && vite build` sıfır hata ile derlendi (1705 modül).
