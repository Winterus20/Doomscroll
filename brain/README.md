# AI & DEVELOPER SECOND BRAIN (İKİNCİ BEYİN)
## UROBOROS (The Cosmic Feast) Geliştirme Yönetim Merkezi

Bu klasör, **UROBOROS (The Cosmic Feast)** projesinin yaşayan hafıza bankasıdır (Living Memory Bank). Yapılan araştırmalar, mimari kararlar (ADR), aktif görevler, yol haritası ve geçici düşünce notları burada tek bir standart altında tutulur.

---

## 📁 Dizin Mimarisi

```
brain/
├── README.md               # Bu kılavuz ve klasör haritası
│
├── context/                # Projenin değişmez ve yaşayan bağlamı
│   ├── project-brief.md    # Vizyon, oyun felsefesi, hedef ve ana hedefler
│   ├── system-patterns.md  # Mimari desenler, döngüler ve bileşen yapısı
│   └── tech-context.md     # Kullanılan kütüphaneler, sürümler ve kısıtlar
│
├── tasks/                  # Görev ve İlerleme Yönetimi
│   ├── todo.md             # Sıradaki özellikler, backlog ve fazlar
│   ├── in-progress.md      # Şu an aktif üzerinde çalışılan sprint/görev
│   └── completed.md        # Tamamlanan işler, çözülen hatalar ve tarihçe
│
├── decisions/              # Mimari Karar Kayıtları (ADR - Architecture Decision Records)
│   ├── 0001-vue3-vite-pinia.md
│   ├── 0002-break-eternity-number-engine.md
│   └── 0003-accumulator-gameloop.md
│
├── research/               # Kapsamlı Araştırma Notları ve Benchmarklar
│   ├── antimatter-dimensions-pacing-mechanics.md
│   └── idle-game-math-and-scaling.md
│
└── scratchpad/             # Geçici Düşünce Alanı & Karalamalar
    └── active-scratch.md   # Hızlı denemeler, geçici formüller ve taslaklar
```

---

## 📌 Çalışma Kuralları
1. **Her Yeni Özellikte:** Önce `tasks/todo.md`'den `in-progress.md`'ye taşınır; tamamlanınca `completed.md`'ye işlenir.
2. **Kritik Mimari Kararlarda:** Neden o kütüphanenin veya yöntemin seçildiği `decisions/` altında ADR formatında kaydedilir.
3. **Yeni Araştırmalarda:** Sektörel veya matematiksel derin analizler `research/` altına eklenir.
4. **Hafıza Teyidi:** Yeni bir oturuma veya aşamaya başlarken ilk olarak `brain/` taranarak bağlam tazelenir.
