# ADR 0008 — Nöral İzleme Kolonisi & Toplu Uyku (Synergism: Ant Colony & Sacrifice)

**Tarih:** 2026-10-01 | **Durum:** Kabul edildi | **Sürüüm:** v0.10.0

## Bağlam
Backlog'da kalan ilk Synergism katmanı mekaniği: "Arka planda kendi kendine üreyen nöral alt-bot kolonisi" ve "Toplu Uyku (Power Nap) ile botları feda edip kalıcı kök dopamin çarpanı katlama" (brain/tasks/todo.md).

## Karar
1. **Kilitleme:** `matter >= 1e13` (Autobuyers 1e4'te açıldı; koloni orta-oyun hedefi). `colonyUnlocked` sticky (bir kez açılırsa kalır).
2. **Nöral Çekirdek:** tek seferlik `COLONY_CORE_COST = 1e13` Dopamin → `neuralBots = 1`.
3. **Üreme (update döngüsü, 7.5. aşama):** `bots += bots × rate × dt`; `rate = 0.008 × (1 + 0.1 × neural_nest)` → çiftlenme ~87 sn. Offline simülasyonu otomatik uygulanır (mevcut 300 sn detay simülasyon kapsamı içinde).
4. **Pasif çarpan (logaritmik, taşma güvenli):** `colonyMultiplier = 1 + log10(1 + bots) × 0.3`. 1e4 bot → 2.2×; 1e8 → 3.4×; 1e16 → 5.8×. Üretimin ONLY D1 net üretimine + `matterPerSecond` getter'ına uygulanır (kolektif çarpanla aynı yerler); zincir ara üretimine uygulanmaz.
5. **Toplu Uyku (Power Nap):** şart `bots >= 100`. Kazanç `(1 + log10(bots))^2.5`: 100 bot → ×15.6, 1e4 → ×400, 1e8 → ×2187, 1e16 → ×12000. `napMultiplier` **kalıcı** ve **prestijden (singularityReset) sağ kalır** (todo'daki "kalıcı kök dopamin çarpanı" tanımına uygun). Botlar 1'a sıfırlanır (çekirdek korunur → yeniden hatching gerekmez).

### Dengeleme eki (2026-10-01)

`napMultiplier` üretim hesabına bağlandığı için ilk kararın 100 botta `×15.6` vermesi ana ekonomiyi aşırı hızlandırıyordu. Kazanç eğrisi `(1 + log10(bots))^0.75` olarak yumuşatıldı: 100 botta yaklaşık `×2.28`, 1e4 botta yaklaşık `×3.95`. Kalıcı bonusun üretime tam bir kez uygulanması korunur; bu ek, kabul edilen Power Nap tasarımının ekonomik pacing kuralıdır.

6. **singularityGain'e uygulanmaz** (achievementMultiplier politikasıyla aynı; ~3 saatlik ilk prestij hedefi korunur).
7. **SP dükkanı:** `neural_nest` (Nöral Yuva) — her seviye üreme hızını +%10 artırır. baseCost 6 SP, costMult 3, maxLevel 5. SP'ye yeni bir harcama yeri.
8. **Ses/Juice:** mevcut `sounds.playSacrifice()` (sub-bass sweep) + konfeti. Yeni ses eklenmedi.
9. **Başarımlar (Otomasyon Ordusu):** colony_hatch (çekirdek), colony_nap (ilk Toplu Uyku), colony_million (1e6 bot, gizli).
10. **UI:** Yeni "Koloni" sekmesi (Network ikonu); nav bildirim noktası = Toplu Uyku hazır.

## Neden logaritmik pasif + üstel üreme?
Sabit üstel üreme (%0.8/s) ile lineer pasif çarpan birleştiğinde uzun oturumlarda üretim patlar (1e47 bot → 2e43×). Logaritmik pasif çarpan üstel üremeyi dengeler; büyük kazanç ise Toplu Uyku üzerinden verilir — böylece koloninin tek amacı "büyüt → uyut → kalıcı çarpan al" döngüsü olur (Synergism sacrifice döngüsünün aynısı).

## Sonuçlar
- Yeni dosya: `src/components/ColonyTab.vue`
- Değişen: `types.ts`, `game.ts` (state/getter/action/update/serialize v8), `achievements.ts`, `App.vue`, `StatsTab.vue`, `AdminPanel.vue`, `SingularityTab.vue` (otomatik — v-for)
- Kayıt formatı v8 (eski kayıtlar `??` fallback ile uyumlu).
