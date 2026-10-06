# ADR-0045: Antimatter Dimensions Tarzı Kozmik Haber Bandı (News Ticker) ve İronik/Mizahi Mesaj Motoru

## Durum
Kabul Edildi (Accepted)

## Tarih
2026-10-06

## Bağlam ve Sorun Tanımı
Kullanıcı talebi:
> *"bu canli yayin kismini antimatter dimensions daki gibi yazilar yazdirmak istiyorum onun yazilarini bul internetten oku sonra en iyi plani yap"*
> *"en guzel sekilde ironik seyler mizahi seyler falan hepsinden doldur en iyi sekilde"*

Mevcut projede `CommentTicker.vue` bileşeni sadece 50 adet sosyal medya yorumu (`@lab_stajyeri: ...`) içeren kısıtlı bir canlı yayın bandı sunmaktaydı. *Antimatter Dimensions* (AD) oyununun resmi kaynak kodu (`IvarK/AntimatterDimensionsSourceCode`) incelendiğinde, oyunun başarısının ve dopamin döngüsünün arkasında 1.470'in üzerinde benzersiz, zeki, meta, absürt, dinamik ve interaktif haber mesajı olduğu tespit edilmiştir.

## Alınan Mimari Kararlar

1. **Bağımsız Haber Veritabanı Modülü (`src/game/news.ts`):**
   - Haber verileri bileşen içinden çıkarılarak modüler, tip-güvenli bir veri tabanına dönüştürülür.
   - `NewsItem` şeması:
     - `id`: Benzersiz kimlik (`ad_...`, `uro_...`, `meta_...`, `dyn_...`, `sec_...`).
     - `text`: Statik string veya `(store) => string` dinamik fonksiyonu.
     - `author?`, `authorColor?`: Haber kaynağı / yazar rozeti.
     - `category`: `ad_classic` | `lore` | `physics` | `meta` | `dynamic` | `secret`.
     - `unlocked?: (store) => boolean`: İlerlemeye bağlı dinamik kilitler (kütle, boyut, sıçrama, şafak).
     - `onClick?: (store) => NewsClickResult | void`: Tıklanabilir interaktif haberler (ekran sarsıntısı, disko modu, sayaç tepkisi, kütle ödülü).
     - `dynamic?: boolean`: Anlık veri güncellemeleri.

2. **Genişletilmiş İçerik Havuzu (150+ Zengin Mesaj):**
   - **Grup A: AD Kültürü & Hevipelle Alıntıları:** 5 saatlik güncelleme şakaları, 9. boyut yalanı, `1.79e308` dertleri, Max All dopamini, `NaN`, bilimsel notasyon satirleri.
   - **Grup B: UROBOROS Kozmik Oburluk & Bilim Kurgu Lore'u:** Su damlasındaki karbon bağından Samanyolu'nu yutan tekilliğe kademe kademe açılan haberler (Belediye duyuruları, CERN stajyeri, Jüpiter'in çıtırdaması, olay ufku hava durumu).
   - **Grup C: Gece 03:00 / Doomscroll & İnkremental Oyunlar:** Cookie Clicker, Trimps, Synergism, Universal Paperclips göndermeleri; `break_eternity.js` esprileri; telefon ısınması ve mavi ışık satirleri.
   - **Grup D: Canlı Dinamik Şablonlar:** Anlık kütleye, boyuta, frekansa ve krizlere göre şekillenen canlı metinler.
   - **Grup E: Tıklanabilir İnteraktif Easter Egg'ler:** Disko modu, anti-madde sarsıntısı, boş tıklama sayacı, 180° ters çevirme, kozmik piyango.

3. **Store & Kayıt Entegrasyonu (`src/stores/game.ts` & `src/core/save.ts`):**
   - `seenNewsIds: string[]`: Görülmüş benzersiz haberlerin kaydı.
   - `uselessNewsClicks: number`: İnteraktif haber tıklama sayacı.
   - `recentTickers: string[]`: Son 15 haberi tutan ve tekrarı önleyen FIFO tamponu.
   - Başarımlar: "SAHTE HABER!" (50 farklı haber) ve "GERÇEK HABER" (tıklanabilir gizli haber).

4. **Taktil UI / UX Dönüşümü (`CommentTicker.vue`):**
   - 60 FPS CSS `transform3d` marquee kayması.
   - Hover duraklatma (Pause on hover) ve duraklatıldı rozeti.
   - Hız değiştirici (1x / 1.6x) ve sonrakine geç (fast-forward) butonu.
   - Tıklama anında Web Audio sesleri (`playTallyTick`, `playMythicCollect`), haptic titreşim ve konfeti.

## Sonuçlar ve Doğrulama
- Sıfır TypeScript hatası (`vue-tsc`).
- Tam geriye dönük kayıt uyumluluğu.
- Zengin, canlı, oyuncuyu güldüren ve dopamin salgılatan birinci sınıf haber bandı deneyimi.
