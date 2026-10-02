import { Decimal } from '../core/math'

/**
 * Özellik Merdiveni (Progressive Feature Unlock) — v0.11.1
 * Tek kaynaklı kilitleme registry'si.
 *
 * Tasarım prensibi (ADR-0009):
 * - Kilitlemeler state'ten türetilmiş olarak hesaplanır; bir kez açılan özellik
 *   `unlockedFeatures` listesiyle yapışkan (sticky) kalır (Sıçrama sıfırlamalarına
 *   rağmen yeniden kapanmaz).
 * - Eski save'larla uyum: liste yoksa boş başlar; koşul zaten sağlanmışsa
 *   açılır (kayıp yok, migrasyyon gerekmez).
 */

export type UnlockReq =
  | { kind: 'dimBought'; tier: number; count: number } // Dn formatını X adet sahibi ol
  | { kind: 'dopamine'; amount: string } // X Dopamin biriktir
  | { kind: 'shifts'; count: number } // X Akış Sıçraması yap
  | { kind: 'galaxies'; count: number } // X Akış Kümesi yap
  | { kind: 'singularities'; count: number } // X Tekillik (prestij) yaşa
  | { kind: 'anomalies'; count: number } // X Gece Krizi yakala
  | { kind: 'spellsCast'; count: number } // X Gece Kararı al

export interface UnlockContext {
  matter: Decimal
  dimensions: Array<{ amount: Decimal; bought: number }>
  dimensionShifts: number
  galaxies: number
  singularities: number
  spellsCast: number
  anomaliesClicked: number
}

export interface FeatureUnlock {
  id: string
  name: string // 'Algoritma Laboratuvarı'
  hint: string // 'D2 formatını 25 adet sahibi ol'
  req: UnlockReq
  order: number // görünürlük / merdiven sırası
}

export function buildUnlockContext(state: {
  matter: Decimal
  dimensions: Array<{ amount: Decimal; bought: number }>
  dimensionShifts: number
  galaxies: number
  singularities: number
  stats?: { spellsCast?: number; anomaliesClicked?: number }
}): UnlockContext {
  return {
    matter: state.matter,
    dimensions: state.dimensions,
    dimensionShifts: state.dimensionShifts,
    galaxies: state.galaxies,
    singularities: state.singularities,
    spellsCast: state.stats?.spellsCast || 0,
    anomaliesClicked: state.stats?.anomaliesClicked || 0
  }
}

export function checkUnlock(ctx: UnlockContext, feature: FeatureUnlock): boolean {
  const req = feature.req
  switch (req.kind) {
    case 'dimBought': {
      const dim = ctx.dimensions[req.tier - 1]
      return !!dim && dim.bought >= req.count
    }
    case 'dopamine':
      return ctx.matter.gte(new Decimal(req.amount))
    case 'shifts':
      return ctx.dimensionShifts >= req.count
    case 'galaxies':
      return ctx.galaxies >= req.count
    case 'singularities':
      return ctx.singularities >= req.count
    case 'anomalies':
      return ctx.anomaliesClicked >= req.count
    case 'spellsCast':
      return ctx.spellsCast >= req.count
  }
}

export function unlockProgress(
  ctx: UnlockContext,
  feature: FeatureUnlock
): { current: number; target: number } {
  const req = feature.req
  switch (req.kind) {
    case 'dimBought': {
      const dim = ctx.dimensions[req.tier - 1]
      const current = dim ? dim.bought : 0
      return { current: Math.min(current, req.count), target: req.count }
    }
    case 'dopamine': {
      const target = new Decimal(req.amount)
      const current = ctx.matter.gt(target) ? target : ctx.matter
      return { current: current.toNumber(), target: target.toNumber() }
    }
    case 'shifts':
      return { current: Math.min(ctx.dimensionShifts, req.count), target: req.count }
    case 'galaxies':
      return { current: Math.min(ctx.galaxies, req.count), target: req.count }
    case 'singularities':
      return { current: Math.min(ctx.singularities, req.count), target: req.count }
    case 'anomalies':
      return { current: Math.min(ctx.anomaliesClicked, req.count), target: req.count }
    case 'spellsCast':
      return { current: Math.min(ctx.spellsCast, req.count), target: req.count }
  }
}

/**
 * Faz 0 (Yatak & Telefon) merdiveni — pacing, /tmp/pace7.js simülasyonuyla doğrulanmıştır
 * (günlük oyuncu: 1.5 tıklama/sn, 2× otomatik kayıt; dimBought = gerçek satın alma):
 *  1e3 Dopamin ~16sn · 1e5 ~41sn · 1e7 ~1dk10sn · 1e9 ~1dk27sn
 *  D4×10 ~57sn · D2×25 ~1dk51sn · D1×50 ~3dk02sn · D3×25 ~3dk22sn · D4×25 ~8dk40sn
 *
 * v0.11.1 pacing revizyonu (kullanıcı: "açılması/alması çok kolay"):
 *  - Kritik düzeltme: dimBought kontrolleri amount (üretimle büyür) yerine bought
 *    (gerçek satın alım) üzerinden — Cookie Clicker 'own N buildings' tasarımı.
 *    Eski haliyle D1×50 duruşu max-all simülasyonunda ~13 sn'de açılıyordu.
 *  - Dopamin eşikleri yukarı çekildi: Kriz 100→1e3 · Yamalar 500→1e5 ·
 *    Yenile 1e3→1e7 · Botlar & Azaplar 1e6→1e9.
 */
export const FEATURE_UNLOCKS: FeatureUnlock[] = [
  {
    id: 'crisis_spawn',
    name: 'Gece Krizleri',
    hint: '1.000 Dopamin biriktir',
    req: { kind: 'dopamine', amount: '1e3' },
    order: 10
  },
  {
    id: 'patch_shop',
    name: 'Algoritma Yamaları Dükkanı',
    hint: '100K Dopamin biriktir',
    req: { kind: 'dopamine', amount: '1e5' },
    order: 20
  },
  {
    id: 'refresh_feed',
    name: 'Akışı Yenile',
    hint: '10M Dopamin biriktir',
    req: { kind: 'dopamine', amount: '1e7' },
    order: 30
  },
  {
    id: 'autobuyers',
    name: 'Otomatik Botlar Sekmesi',
    hint: '1B (1e9) Dopamin biriktir',
    req: { kind: 'dopamine', amount: '1e9' },
    order: 40
  },
  {
    id: 'guilt_slackers',
    name: 'Vicdan Azapları',
    hint: '1B (1e9) Dopamin biriktir',
    req: { kind: 'dopamine', amount: '1e9' },
    order: 50
  },
  {
    id: 'crisis',
    name: 'Gece Kriz Yönetimi Sekmesi',
    hint: 'D4 (Subway Surfers) formatını 10 adet sahibi ol',
    req: { kind: 'dimBought', tier: 4, count: 10 },
    order: 60
  },
  {
    id: 'stance_spam',
    name: 'Çılgın Kaydırma Duruşu',
    hint: 'D1 (Kedi Videoları) formatını 50 adet sahibi ol',
    req: { kind: 'dimBought', tier: 1, count: 50 },
    order: 70
  },
  {
    id: 'stance_private',
    name: 'Düşük Parlaklık Duruşu',
    hint: 'D1 (Kedi Videoları) formatını 50 adet sahibi ol',
    req: { kind: 'dimBought', tier: 1, count: 50 },
    order: 71
  },
  {
    id: 'lab',
    name: 'Algoritma Laboratuvarı Sekmesi',
    hint: 'D2 (Sokak Lezzeti) formatını 25 adet sahibi ol',
    req: { kind: 'dimBought', tier: 2, count: 25 },
    order: 80
  },
  {
    id: 'seed_cheese',
    name: 'Eritme Kaşar Cızırtısı Tohumu',
    hint: 'D2 (Sokak Lezzeti) formatını 50 adet sahibi ol',
    req: { kind: 'dimBought', tier: 2, count: 50 },
    order: 90
  },
  {
    id: 'seed_subway',
    name: 'Subway Surfers Beat Tohumu',
    hint: 'D3 (ASMR Sabun) formatını 25 adet sahibi ol',
    req: { kind: 'dimBought', tier: 3, count: 25 },
    order: 100
  },
  {
    id: 'seed_phonk',
    name: 'Gece 4 Sigma Phonk Tohumu',
    hint: 'D4 (Subway Surfers) formatını 25 adet sahibi ol',
    req: { kind: 'dimBought', tier: 4, count: 25 },
    order: 110
  },
  {
    id: 'spell_espresso',
    name: 'Çift Espresso Shot Kararı',
    hint: '2 Gece Kararı al',
    req: { kind: 'spellsCast', count: 2 },
    order: 120
  },
  {
    id: 'spell_noise',
    name: 'Gürültü Önleyici Kulaklık Kararı',
    hint: '3 Gece Kararı al',
    req: { kind: 'spellsCast', count: 3 },
    order: 130
  },
  {
    id: 'spell_sleep',
    name: "'Yarın Erken Kalkmam Gerekmiyor' Yalanı",
    hint: '4 Gece Kararı al',
    req: { kind: 'spellsCast', count: 4 },
    order: 140
  },
  {
    id: 'challenges',
    name: 'Gece Kriz Meydan Okumaları',
    hint: '1 Sabah 06:00 Çöküşü yaşa',
    req: { kind: 'singularities', count: 1 },
    order: 150
  }
]

export function getFeatureById(id: string): FeatureUnlock | null {
  return FEATURE_UNLOCKS.find((f) => f.id === id) || null
}

/** Kilitli kalan ilk özellik (merdivenin sıradaki basamağı) */
export function nextLocked(
  ctx: UnlockContext,
  unlockedIds: Set<string>
): FeatureUnlock | null {
  let best: FeatureUnlock | null = null
  for (const feature of FEATURE_UNLOCKS) {
    if (unlockedIds.has(feature.id)) continue
    if (checkUnlock(ctx, feature)) continue
    if (!best || feature.order < best.order) best = feature
  }
  return best
}
