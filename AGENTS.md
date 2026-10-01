# AGENTS.md — Quantum Horizon Otonom Geliştirici Direktifleri

Bu belge, **Quantum Horizon** projesinde çalışacak tüm yapay zeka kodlama asistanları (Antigravity, Cursor, Claude Code, Codex vb.) için bağlayıcı operasyonel çalışma anayasasıdır. Bu repoda görev alan her agent buradaki kurallara istisnasız uymakla yükümlüdür.

---

## 1. Proje Özeti ve Temel Vizyon
- **Proje Adı:** Doomscroll: The Endless Reels (Gece 3 Reels Bağımlılığı & Dopamin Kıyameti)
- **Konu & Hiciv:** Gece 02:47'de "sadece 2 dakika Reels izleyip uyuyacağım" diye yatağa girip; başparmağının hipnotik olarak yukarı kaymasıyla sabahın 06:15'ine, kuş seslerine, göz kanlanmasına ve evreni içine çeken sonsuz bir dopamin tekilliğine sürüklenme.
- **Tür:** Yeni Nesil Hibrit Çok Katmanlı Incremental / Idle Oyunu (*Antimatter Dimensions* + *Cookie Clicker* + *Synergism* sentezi).
- **Temel Felsefe:** "Bekleme oyunu değil; taktil yukarı kaydırma, gece krizleri, açılan gece mini-oyunları ve algoritma optimizasyonu."
- **Sütunlar:** 
  1. *Antimatter Dimensions:* D1-D8 Boyutları (Kedi Videolarından Saf Beyin Çürümesine), Algoritma Frekansı (Hz), Otomatik Kaydırma Botları (Autobuyers).
  2. *Cookie Clicker:* Taktil doyum, rastgele Gece Krizleri (Gece 3 Çılgınlığı 7x, Başparmak Histerisi 777x), Vicdan Azapları (Wrinklers: "1 video daha" = 1.2x prim), 4 büyük mini-oyun (Algoritma Lab, Kriz Yönetimi, Gece Kuşları Panteonu, Reklam Borsası).
  3. *Synergism:* Gece Ekipmanları soketleme, Otonom İzleme Botları (Ant Colony & Toplu Uyku), 12 sürgülü Uyku Baskısı Matrisi (Corruptions).
  4. *Trimps & Paperclips:* Taktiksel duruş (Yorgan Altı, Çılgın Kaydırma, Düşük Parlaklık) ve evrimsel çağ sıçramaları (Yatak -> Kolektif Nöbet -> Evrensel Doomscroll).
- **Hedef:** 4 büyük prestij katmanı (Yatak & Telefon $\to$ Sabah 06:00 Çöküşü & Kuş Sesleri $\to$ Kolektif Gece Nöbeti $\to$ Evrensel Doomscroll).

---

## 2. Teknoloji Yığını ve Katı Teknik Kısıtlamalar

| Alan | Teknoloji | Notlar & Katı Kurallar |
| :--- | :--- | :--- |
| **Framework** | **Vue 3** | Composition API (`<script setup lang="ts">`), Pinia 3.x |
| **Paketleyici** | **Vite 6** | Hızlı derleme, katı TypeScript kontrolleri |
| **Dil** | **TypeScript 5.7+** | `strict: true`. Kesinlikle `any` tipi kullanılmamalı, tam tip güvenliği sağlanmalıdır. |
| **Sayı Motoru** | **`break_eternity.js`** | **ÖNEMLİ KURAL:** Kütüphanede `isNaN` yerine küçük harfle **`isNan()`** metodu mevcuttur! Sayı kontrollerinde `dec.isNan() \|\| Number.isNaN(dec.mag)` kullanılmalıdır. |
| **Stil** | **Tailwind CSS 3.4** | Cyberpunk/Dark Sci-Fi teması (`bg-dark-950`, `quantum-blue`, neon vurgular). |
| **Kayıt Sistemi** | **LZ-String + LocalStorage** | State string serileştirmesi, Base64 sıkıştırma. |
| **Ses** | **Web Audio API** | Harici ses dosyası indirilmez; synthesiser osilatörleri kullanılır. |

---

## 3. Yaşayan Hafıza Bankası Protokolü (`brain/`)

Her agent çalışmaya başlamadan önce ve işi bitirdiğinde repo içindeki **[`brain/`](file:///c:/Users/Yigit/Documents/Incremental/brain/)** klasörüyle senkronize olmak **ZORUNDADIR**:

1. **İşe Başlarken (Context Hydration):**
   - [`brain/context/project-brief.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/context/project-brief.md) ve [`brain/context/tech-context.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/context/tech-context.md) dosyalarını oku.
   - [`brain/tasks/todo.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/tasks/todo.md) üzerindeki sıradaki görevi incele ve [`brain/tasks/in-progress.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/tasks/in-progress.md) dosyasına taşı.
2. **Kritik Kararlar Alındığında (ADR):**
   - Yeni bir kütüphane eklendiğinde veya temel mimari değiştiğinde [`brain/decisions/`](file:///c:/Users/Yigit/Documents/Incremental/brain/decisions/) altına yeni bir ADR dosyası aç.
3. **Görev Tamamlandığında (Reconciliation):**
   - Yapılan işi [`brain/tasks/completed.md`](file:///c:/Users/Yigit/Documents/Incremental/brain/tasks/completed.md) dosyasına tarih, sürüm ve diff özetleriyle işle.

---

## 4. Repo Dizin Haritası

```
Incremental/
├── AGENTS.md                  # Bu direktif belgesi
├── GAME_DESIGN.md             # Oyun mekanikleri, katman formülleri ve GDD
├── package.json               # Bağımlılıklar ve npm scriptleri
├── vite.config.ts             # Vite konfigürasyonu (@/ alias)
├── tsconfig.json              # TypeScript katı kuralları
├── brain/                     # AI Living Memory Bank (Hafıza Merkezi)
│   ├── context/               # Mimari standartlar ve bağlam
│   ├── tasks/                 # Todo, in-progress, completed takibi
│   ├── decisions/             # Architecture Decision Records (ADRs)
│   ├── research/              # Matematik ve oyun tasarımı analizleri
│   └── scratchpad/            # Anlık düşünce ve karalama alanı
└── src/
    ├── main.ts                # Uygulama giriş noktası (Vue + Pinia)
    ├── App.vue                # Ana dashboard, navigasyon ve modal yönetimi
    ├── style.css              # Tailwind katmanları ve özel cam efektleri
    ├── core/
    │   ├── math.ts            # break_eternity Decimal sarmalayıcısı ve sabitler
    │   ├── format.ts          # 4 farklı sayı notasyonu (Scientific, Standard, Eng, Log)
    │   ├── audio.ts           # Web Audio API osilatör synthesizer motoru
    │   ├── save.ts            # LZ-String sıkıştırma, LocalStorage ve Import/Export
    │   └── game-loop.ts       # 20 TPS Accumulator pattern sabit adımlı döngü
    ├── stores/
    │   └── game.ts            # Merkezi Pinia veri deposu (State, Getters, Actions)
    ├── models/
    │   └── types.ts           # Tüm TypeScript tip ve arayüz tanımları
    └── components/
        ├── Header.vue         # Üst sayaç, Tickspeed, Max All ve hızlı butonlar
        ├── DimensionRow.vue   # Tekil boyut satırı, çarpan rozeti ve alım butonları
        ├── DimensionsTab.vue  # Boyutlar sekmesi, Shift/Boost ve Galaksi kartları
        ├── StatsTab.vue       # Süre, tıklama, üretim istatistikleri
        └── SettingsModal.vue  # Notasyon, ses, save yönetimi ve Hard Reset
```

---

## 5. Agent Kodlama Kuralları ve Standartları

- **Sıfır Tembellik (Zero Laziness):** Kod bloklarında `// TODO`, `// existing code`, `/* rest of code */` gibi geçiştirici ifadeler KESİNLİKLE YASAKTIR. Dosyalar eksiksiz, çalışan gövdelerle güncellenmelidir.
- **Cerrahi Düzenleme:** Dosyaları gereksiz yere baştan yazmak yerine en az 2-3 satır bağlam içeren hassas hedeflemeler yapılmalıdır.
- **Doğrulama Zorunluluğu (Build & Verification):** Kod değişikliği yapıldıktan sonra `npm run build` (`vue-tsc && vite build`) komutu çalıştırılarak tip hatası (TS error) veya derleme hatası olmadığı **kanıtlanmalıdır**.
- **Windows Uyumluluğu:** Terminal komutlarında tek tırnak (`'`) yerine her zaman çift tırnak (`"`) veya powershell escape kuralları kullanılmalıdır.

---

## 6. Sık Kullanılan CLI Komutları

```powershell
# Geliştirme sunucusunu başlatma (Port: 3000)
npm run dev

# TypeScript kontrolü ve Production derlemesi
npm run build

# Derlenen production paketini önizleme
npm run preview
```
