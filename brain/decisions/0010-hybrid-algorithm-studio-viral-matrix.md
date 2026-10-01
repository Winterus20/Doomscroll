# ADR 0010 — Algoritma Stüdyosu: Hibrit Viral Matris & Trend Reaktörü

**Tarih:** 2026-10-01 | **Durum:** Kabul edildi | **Sürüm:** v0.12.0

## Bağlam
Mevcut Algoritma Laboratuvarı mekaniği, *Cookie Clicker Garden* klonu olarak tasarlanmıştı:
1. **Tema Uyuşmazlığı:** Gece 03:00'te yatakta telefon kaydıran bir oyuncu için "tohum ekme", "hasat etme" ve "bitkinin çürümesi" metaforları yabancı ve zorlama kalıyordu (Reels ekilmez, mixlenir ve akışa salınır).
2. **Ceza & Angarya Hissi:** Oyuncu başka sekmeye gittiğinde veya AFK kaldığında tohumların çürüyüp yok olması (`maxAge` aşımı) oyuncuda stres ve kayıp hissi yaratıyordu.
3. **Stratejik Kısıtlılık:** 3×3 ızgarada sadece 1 mutasyon (Kedi + Phonk) mevcuttu; oyuncu sadece ekleyip bekleme yapıyordu.

Kullanıcı talebi: "Oyunun lab kısmında neler yapabiliriz, mantığı güzel mi yoksa daha iyi bir mantık kurabilir miyiz? Hibrit bir şey yapsak en iyi ne yapabiliriz bir plan yap."

## Karar
Eski tarım/tarla çiftliği modeli tamamen terk edilerek, **"Algoritma Stüdyosu: Viral Matris & Trend Reaktörü"** hibrit sistemi kuruldu. Bu sistem 4 ana sütundan oluşur:

### 1. Çürümesiz 3×3 Akış Matrisi (Sinerji Devresi)
- **ÇÜRÜME YOK:** `maxAge` kaldırıldı. Formatlar matriste kalıcı soket/kart olarak 7/24 çalışır.
- **Yönlü Sinerjiler:**
  - *Nöral Çekirdek (Merkez Hücre 4):* Kendi çarpanını $\times 1.5$ yapar ve çevresindeki 4 komşusuna $+%20$ verim yayar.
  - *Kedi Miyavlaması:* Komşularına $+%15$ rezonans bonusu verir.
  - *Sigma Phonk:* Komşularına Bas Şoku ($\times 1.25$) uygular, anomali sıklığını $+%50$ artırır.
  - *Yemek Sinerjisi:* Kaşar, Mukbang ve Burger yan yana geldiğinde $+%30$ "Ziyafet Sinerjisi" tetiklenir.
  - *Satır / Sütun Uyumları:* Bir satır veya sütunun 3 hücresi de rezonanstaysa $\times 1.25$ rezonans, 3'ü de aynı format türündeyse $\times 1.40$ mono-format çarpanı.

### 2. Viral Kodeks & Çift Yönlü Formül Sentezi (Keşif Hissi)
- 4 Temel Format (`cat_audio`, `cheese_sizzle`, `subway_beat`, `sigma_phonk`) + 4 Sentezlenen Hibrit Format:
  1. 🍜 **Gece 3 Mukbang & Drama** (🧀 + 🛹): $+%50$ Pasif & $\times 1.5$ Tıklama Gücü.
  2. 🍔 **Cheeseburger Kedi** (🐱 + 🧀): $+%40$ Pasif & **Vicdan Azabı emişi $-\%25$**.
  3. 🏎️ **Tokyo Drift Dublajı** (🗿 + 🛹): $\times 2.0$ Tıklama & $+%30$ Gece Krizi sıklığı.
  4. 🧠 **Saf Nöron Çürütücü** (🐱 + 🗿): $+%200$ ($\times 3$) Tüm Küresel Dopamin!
- **Çift Yönlü Sentez:** Boş hücre varsa yeni format filizlenebilir, veya ebeveynler komşu olarak rezonanstaysa ızgara dolu olsa dahi formül doğrudan kütüphaneye keşfedilir.
- **Kalıcı Ödül:** Keşfedilen her formül tüm oyuna kalıcı **$+%3$ Global Dopamin** kazandırır.

### 3. Trend Reaktörü & "🚀 AKIŞA FIRLAT!" (Taktil Doyum)
- Matris çalıştıkça ve oyuncu yukarı kaydırdıkça ($+\%0.4$/tık) bir **Hype Barı** (%0-100) dolar.
- $\%100$ dolduğunda **"🚀 AKIŞA FIRLAT!"** butonu aktive olur:
  - Anında 60 sn Dopamin patlaması.
  - 25 saniye boyunca $\times 5$ ile $\times 25$ arasında değişen **Canlı Viral Zirve Çarpanı** (`labViralMultiplier`).
  - Gece Krizleri (Altın Anomaliler) bu sürede **3 kat daha sık** yağar.
  - Canlı simüle izlenme sayacı fırlar ($10K \to 500K \to 10M$).
  - `stats.labHarvests += 3` eklenerek başarımlar tetiklenir.

### 4. Algoritma Zemin Modları (FYP Besleme Stratejisi)
- 🔥 **Agresif FYP:** Hype barı $\%80$ daha hızlı dolar, Viral Drop fırlatıldığında $2\times$ dopamin fışkırır (Aktif oynanış).
- ☕ **Evergreen Arşiv:** Hype barı durdurulur, tüm matrisin sağladığı pasif dopamin çarpanı **$2.5\times$** katlanır (AFK & Gece uykusu modu).
- 🧬 **Nöral Sentez:** Yeni gizli formül sentezleme şansı **$3\times$** katına çıkar (Kodeks kaşifleri için).

## Geriye Dönük Uyumluluk (Backwards Compatibility)
- `SaveData` ve Pinia store serileştirmesinde `labHype`, `labMode` ve `discoveredFormulas` eklendi.
- Eski save yüklendiğinde hücrelerde bulunan tohumlar otomatik olarak keşfedilmiş kabul edilir; hiçbir kayıt kırılmaz veya kaybolmaz.
- Başarımlardaki `seedsPlanted`, `labHarvests`, `matureCells`, `hasBrainrot` predicate'leri tam olarak korunmuştur.

## Doğrulama
- `npm run build` (`vue-tsc && vite build`): **0 hata, derleme başarılı** (1629 modül).
