import type { UnlockReq } from './unlocks'

/**
 * Gece Kriz Meydan Okumaları (Challenges) — registry (Faz 1: Motor).
 * Desen: achievements.ts registry + computeNeuralEffects saf-fonksiyonu.
 *
 * Kural: store asla challenge id'sini hardcode etmez; hep registry +
 * `activeChallengeDef` üzerinden okur. C2–C8 kural wiring'i Faz 3'e aittir;
 * buradaki modifiers alanları Faz 3'ün bağlayacağı veridir.
 */

export interface ChallengeModifiers {
  autobuyersDisabled?: boolean // C1: Uçak Modu
  productionHaltOnBuySec?: number // C2: alımda üretim durması (süre, sn)
  dim1ExpoGrowthPerSec?: number // C3: D1 üstel büyüme oranı (örn. 0.004 = ×1.004/sn)
  dim1BasePowerMult?: number // C3: D1 taban güç çarpanı (örn. 0.01)
  oddTiersOnly?: boolean // C4: yalnızca tek boyutlar üretir
  costInflationOnBuy?: number // C5: her alımda koşu-içi birikimli maliyet şişmesi
  tickspeedBaseMult?: number // C6: frekans taban çarpanı (örn. 0.4)
  tickspeedBuyMultScale?: number // C6: frekans alım çarpanı ölçeği (örn. 0.5)
  maxDimensions?: number // C7: açık boyut üst sınırı (örn. 6)
  notificationDoomRatePerSec?: number // C8: bildirim sayacı dolum hızı
}

export interface ChallengeReward {
  kind: string
  value: number
}

export interface ChallengeDef {
  id: string
  order: number
  icon: string
  name: string
  flavor: string
  ruleDesc: string
  rewardDesc: string
  goalMatter: string // Decimal string; hedef her challenge'da aynı: 1.79e308
  unlock?: UnlockReq
  modifiers: ChallengeModifiers
  reward: ChallengeReward
  repeatable?: false // C²/tekrar-farming Faz 2+ uzantısı için ayrılmış alan
}

export const CHALLENGE_GOAL_MATTER = '1.79e308'

// ADR-0032: Meydan Okuma Zorluk Eğrisi (1e40 → 1e1000).
// Eski tasarımda tüm 8 meydan okuma da 1.79e308 hedefliyordu, yani oyuncu
// ilk çöküşten sonra bile tam bir 4 saatlik koşu yapmadan tek bir challenge
// tamamlayamıyordu. Eğri erken meydan okumaları erişilebilir kılar, son iki
// meydan okumayı 1e308'in ötesine taşıyarak uzun vadeli endgame içeriği sağlar.
export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'c1',
    order: 1,
    icon: '🕳️',
    name: 'Vakum İzolasyonu',
    flavor: 'Kozmik otomasyon devre dışı; yerçekimi yalnızca senin elinde.',
    ruleDesc: 'Otonom Çekim Botları devre dışı; her boyut elle satın alınır.',
    rewardDesc: 'Kalıcı ödül: Tüm kütle boyutları ×1.5',
    goalMatter: '1e40',
    unlock: { kind: 'singularities', count: 1 },
    modifiers: { autobuyersDisabled: true },
    reward: { kind: 'dim_mult', value: 1.5 },
    repeatable: false
  },
  {
    id: 'c2',
    order: 2,
    icon: '⚡',
    name: 'Kütleçekim Durgunluğu',
    flavor: 'Her boyutsal genişleme uzay-zaman dokusunda şok dalgası yaratır.',
    ruleDesc: 'Her alım üretimi 3 sn durdurur, sonra 60 sn\'de lineer olarak geri döner.',
    rewardDesc: 'Kalıcı ödül: Çekim Hızı etkisi +%15',
    goalMatter: '1e70',
    unlock: { kind: 'singularities', count: 1 },
    modifiers: { productionHaltOnBuySec: 3 },
    reward: { kind: 'tickspeed_effect', value: 1.15 },
    repeatable: false
  },
  {
    id: 'c3',
    order: 3,
    icon: '🌱',
    name: 'Kuantum Kararsızlığı',
    flavor: 'İlk moleküler bağlar kararsız başlar, ancak olay ufkunda üstel parlar.',
    ruleDesc: 'D1 %1 güçte başlar ama sn\'de ×1.004 büyür; Sıçrama/Küme\'de sıfırlanır.',
    rewardDesc: 'Kalıcı ödül: Manuel Çekim Gücü ×2',
    goalMatter: '1e110',
    unlock: { kind: 'singularities', count: 1 },
    modifiers: { dim1BasePowerMult: 0.01, dim1ExpoGrowthPerSec: 0.004 },
    reward: { kind: 'click_mult', value: 2 },
    repeatable: false
  },
  {
    id: 'c4',
    order: 4,
    icon: '🚫',
    name: 'Simetri Kırılması',
    flavor: 'Çift boyutlar karanlık madde tarafından yutuldu: evren asimetrik işliyor.',
    ruleDesc: 'Yalnızca tek boyutlar (D1-D3-D5-D7) kütle üretir.',
    rewardDesc: 'Kalıcı ödül: Çift boyutlar ×2',
    goalMatter: '1e160',
    unlock: { kind: 'singularities', count: 1 },
    modifiers: { oddTiersOnly: true },
    reward: { kind: 'even_dim_mult', value: 2 },
    repeatable: false
  },
  {
    id: 'c5',
    order: 5,
    icon: '📈',
    name: 'Kozmik Enflasyon',
    flavor: 'Her yutulan kütle uzay-zaman dokusunu gererek boyut maliyetlerini şişirir.',
    ruleDesc: 'Her boyut/frekans alımı diğer tüm boyutların maliyetini koşu-içi birikimli ×1.5 şişirir.',
    rewardDesc: 'Kalıcı ödül: Boyut maliyetleri -%10',
    goalMatter: '1e220',
    unlock: { kind: 'singularities', count: 3 },
    modifiers: { costInflationOnBuy: 1.5 },
    reward: { kind: 'dim_cost_discount', value: 0.9 },
    repeatable: false
  },
  {
    id: 'c6',
    order: 6,
    icon: '👁️',
    name: 'Zaman Genleşmesi',
    flavor: 'Aşırı kütleçekim zamanı yavaşlatır; çekim frekansı zayıflar.',
    ruleDesc: 'Çekim Hızı tabanı %40, alım çarpanı yarıya iner.',
    rewardDesc: 'Kalıcı ödül: Çekim Hızı maliyeti -%15',
    goalMatter: CHALLENGE_GOAL_MATTER, // 1.79e308
    unlock: { kind: 'singularities', count: 3 },
    modifiers: { tickspeedBaseMult: 0.4, tickspeedBuyMultScale: 0.5 },
    reward: { kind: 'tickspeed_cost_discount', value: 0.85 },
    repeatable: false
  },
  {
    id: 'c7',
    order: 7,
    icon: '🔒',
    name: 'Boyutsal Çöküş',
    flavor: 'Üst evren boyutları henüz doğmadı: Planck sınırı 6. boyutta kilitli.',
    ruleDesc: 'Yalnızca 6 boyut açık; Sıçrama/Küme gereksinimleri D6 katmanına göre ölçeklenir.',
    rewardDesc: 'Kalıcı ödül: Ölçek Sıçraması gücü 1.66 → 2.2',
    goalMatter: '1e500',
    unlock: { kind: 'singularities', count: 5 },
    modifiers: { maxDimensions: 6 },
    reward: { kind: 'shift_power', value: 2.2 },
    repeatable: false
  },
  {
    id: 'c8',
    order: 8,
    icon: '☢️',
    name: 'Radyasyon Fırtınası',
    flavor: 'Tekillikten sızan aşırı Hawking radyasyonu birikir; temizlenmezse çekimi boğar.',
    ruleDesc: 'Radyasyon sayacı dolar; Sıçrama/Küme %40 temizler. %100\'de Radyasyon Boğulması: üretim ×0.5, her +%25 taşmada ek ×0.75.',
    rewardDesc: 'Kalıcı ödül: SP kazancı +%15',
    goalMatter: '1e1000',
    unlock: { kind: 'singularities', count: 5 },
    modifiers: { notificationDoomRatePerSec: 0.01 },
    reward: { kind: 'sp_gain', value: 1.15 },
    repeatable: false
  }
]

export function getChallengeById(id: string): ChallengeDef | undefined {
  return CHALLENGES.find((c) => c.id === id)
}

/** Tamamlanan challenge'ların sayısal ödül paketi (saf fonksiyon). */
export interface ChallengeRewardEffects {
  dimMult: number // C1: tüm boyutlar
  evenDimMult: number // C4: çift boyutlar
  clickMult: number // C3: tıklama gücü
  tickspeedEffectMult: number // C2: frekans etkisi
  dimCostMult: number // C5: boyut maliyet çarpanı (<1 = indirim)
  tickspeedCostMult: number // C6: frekans maliyet çarpanı (<1 = indirim)
  shiftPower: number // C7: sıçrama gücü (taban 1.6)
  spMult: number // C8: SP kazancı
}

export const BASE_SHIFT_POWER = 1.66

/** 8/8 tamamlama rozeti ("Zombi Bakışı"): tüm boyutlara kalıcı çarpan. */
export const ALL_CHALLENGES_COMPLETE_MULT = 1.25

/**
 * Kademeli süre-metas (§6.3): en iyi süreler TOPLAMI üzerinden (sn).
 * Eşikler başlangıç tahminidir — simülasyon kapısıyla sabitlenecek.
 * Kayıtlı süresi olmayan challenge varsa (henüz koşulmamış) kademe yok (×1).
 */
export const CHALLENGE_TIME_TIERS = [
  { id: 'gold', totalSec: 5400, mult: 1.4 },
  { id: 'silver', totalSec: 14400, mult: 1.25 },
  { id: 'bronze', totalSec: 28800, mult: 1.1 }
] as const

export function challengeTimeTierMult(bestTimes: Record<string, number>): number {
  let total = 0
  for (const def of CHALLENGES) {
    const t = bestTimes[def.id]
    if (typeof t !== 'number' || !Number.isFinite(t) || t < 0) return 1
    total += t
  }
  if (total < 5400) return 1.4
  if (total < 14400) return 1.25
  if (total < 28800) return 1.1
  return 1
}

/** 8 challenge'ın tamamı bitmiş mi? (Zombi Bakışı rozeti koşulu) */
export function isAllChallengesComplete(completedIds: readonly string[]): boolean {
  return CHALLENGES.every((def) => completedIds.includes(def.id))
}

export function challengeRewardEffects(completedIds: readonly string[]): ChallengeRewardEffects {
  const done = new Set(completedIds)
  let dimMult = 1
  let evenDimMult = 1
  let clickMult = 1
  let tickspeedEffectMult = 1
  let dimCostMult = 1
  let tickspeedCostMult = 1
  let shiftPower = BASE_SHIFT_POWER
  let spMult = 1
  for (const def of CHALLENGES) {
    if (!done.has(def.id)) continue
    switch (def.reward.kind) {
      case 'dim_mult':
        dimMult *= def.reward.value
        break
      case 'even_dim_mult':
        evenDimMult *= def.reward.value
        break
      case 'click_mult':
        clickMult *= def.reward.value
        break
      case 'tickspeed_effect':
        tickspeedEffectMult *= def.reward.value
        break
      case 'dim_cost_discount':
        dimCostMult *= def.reward.value
        break
      case 'tickspeed_cost_discount':
        tickspeedCostMult *= def.reward.value
        break
      case 'shift_power':
        shiftPower = def.reward.value
        break
      case 'sp_gain':
        spMult *= def.reward.value
        break
      default:
        break
    }
  }
  return {
    dimMult,
    evenDimMult,
    clickMult,
    tickspeedEffectMult,
    dimCostMult,
    tickspeedCostMult,
    shiftPower,
    spMult
  }
}
