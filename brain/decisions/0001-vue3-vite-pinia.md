# ADR 0001: Vue 3, Vite ve Pinia Seçimi

## Durum
Kabul Edildi (Accepted) - 2026-09-30

## Bağlam
*Antimatter Dimensions* ölçeğinde bir incremental oyunda ekranda yüzlerce sayı saniyede 20 ila 60 kez güncellenir. React gibi sanal DOM (VDOM) diffing yapan kütüphaneler bu frekansta Garbage Collection (çöp toplayıcı) baskısı ve mikro takılmalara yol açmaktadır. Unity/Godot gibi ağır motorlar ise web üzerinde 30+ MB dosya boyutu, yavaş açılış ve sekme arka plana atıldığında donma gibi sorunlar yaratır.

## Karar
Frontend çatısı olarak **Vue 3 (Composition API)**, paketleyici olarak **Vite** ve durum yönetimi için **Pinia** seçilmiştir.

## Gerekçeler ve Sonuçlar
1. **İnce Taneli Reaktivite (Fine-Grained Reactivity):** Vue 3'ün proxy tabanlı reaktivitesi yalnızca değeri değişen tek bir span veya hücreyi günceller; tüm bileşen ağacını baştan çizmez.
2. **Endüstri Standardı:** Bizzat *Antimatter Dimensions* kaynak kodu incelendiğinde Vue.js ile yeniden yazıldığı ve performansının bu sayede zirveye ulaştığı görülmüştür.
3. **Anında Yükleme:** Vite sayesinde 1 MB'ın altında toplam boyut ve 400ms altında anında açılış elde edilmiştir.
