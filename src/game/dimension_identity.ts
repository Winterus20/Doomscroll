/**
 * Per-tier format identity — small passive bonuses (ADR-0025 L2b).
 * Values stay in a tight band; harness validates total pacing impact.
 */

export type TierPassiveKind =
  | 'productionMult'
  | 'anomalyRateMult'
  | 'slackerLeechMult'
  | 'shiftReqMult'
  | 'offlineSimMult'
  | 'clickSyncCapBonus'

export interface TierPassiveEffect {
  kind: TierPassiveKind
  /** Multiplicative factors use base 1; additive caps use raw delta (e.g. 0.005 = +0.5% sync cap). */
  value: number
  desc: string
}

export interface TierIdentity {
  tier: number
  label: string
  passive: TierPassiveEffect
}

export const FORMAT_UNLOCK_BUFF_SECONDS = 20
export const FORMAT_UNLOCK_BUFF_MULT = 1.25

export const TIER_IDENTITIES: TierIdentity[] = [
  {
    tier: 1,
    label: 'Moleküler Bağlar',
    passive: {
      kind: 'clickSyncCapBonus',
      value: 0.005,
      desc: 'Çekim senkron tavanına +0.5%'
    }
  },
  {
    tier: 2,
    label: 'Elektron Orbitalleri',
    passive: {
      kind: 'productionMult',
      value: 1.03,
      desc: 'Bu katmanın çekim çarpanı ×1.03'
    }
  },
  {
    tier: 3,
    label: 'Nükleer Çekirdek',
    passive: {
      kind: 'slackerLeechMult',
      value: 0.97,
      desc: 'Parazit kütle kaçağı ×0.97'
    }
  },
  {
    tier: 4,
    label: 'Kuark Çorbası',
    passive: {
      kind: 'anomalyRateMult',
      value: 1.08,
      desc: 'Kozmik dalgalanma spawn hızı ×1.08'
    }
  },
  {
    tier: 5,
    label: 'Laboratuvar & Şehir',
    passive: {
      kind: 'shiftReqMult',
      value: 0.97,
      desc: 'Ölçek sıçraması miktar gereksinimi ×0.97'
    }
  },
  {
    tier: 6,
    label: 'Gezegenler & Dünya',
    passive: {
      kind: 'offlineSimMult',
      value: 1.02,
      desc: 'Çevrimdışı çekim simülasyonu ×1.02'
    }
  },
  {
    tier: 7,
    label: 'Yıldızlar & Güneş',
    passive: {
      kind: 'productionMult',
      value: 1.04,
      desc: 'Bu katmanın çekim çarpanı ×1.04'
    }
  },
  {
    tier: 8,
    label: 'Samanyolu & Karadelik',
    passive: {
      kind: 'productionMult',
      value: 1.06,
      desc: 'D8 kozmik çekim çarpanı ×1.06'
    }
  }
]

const identityByTier = new Map<number, TierIdentity>(
  TIER_IDENTITIES.map((t) => [t.tier, t])
)

export function getTierIdentity(tier: number): TierIdentity | undefined {
  return identityByTier.get(tier)
}

/** Production mult from tier identity when tier has bought > 0 and is unlocked. */
export function tierProductionMult(tier: number, bought: number, unlocked: boolean): number {
  if (!unlocked || bought <= 0) return 1
  const id = getTierIdentity(tier)
  if (!id || id.passive.kind !== 'productionMult') return 1
  return id.passive.value
}

export function tierSlackerLeechMult(dimensions?: Array<{ bought: number }>, unlockedCount?: number): number {
  if (unlockedCount !== undefined && unlockedCount < 3) return 1
  if (dimensions) {
    const d3 = dimensions[2]
    if (!d3 || d3.bought <= 0) return 1
  }
  const d3 = getTierIdentity(3)
  if (!d3 || d3.passive.kind !== 'slackerLeechMult') return 1
  return d3.passive.value
}

export function tierAnomalyRateMult(dimensions: Array<{ bought: number }>, unlockedCount: number): number {
  if (unlockedCount < 4) return 1
  const d4 = dimensions[3]
  if (!d4 || d4.bought <= 0) return 1
  const id = getTierIdentity(4)
  if (!id || id.passive.kind !== 'anomalyRateMult') return 1
  return id.passive.value
}

export function tierShiftReqMult(dimensions: Array<{ bought: number }>, unlockedCount: number): number {
  if (unlockedCount < 5) return 1
  const d5 = dimensions[4]
  if (!d5 || d5.bought <= 0) return 1
  const id = getTierIdentity(5)
  if (!id || id.passive.kind !== 'shiftReqMult') return 1
  return id.passive.value
}

export function tierOfflineSimMult(dimensions: Array<{ bought: number }>, unlockedCount: number): number {
  if (unlockedCount < 6) return 1
  const d6 = dimensions[5]
  if (!d6 || d6.bought <= 0) return 1
  const id = getTierIdentity(6)
  if (!id || id.passive.kind !== 'offlineSimMult') return 1
  return id.passive.value
}

export function tierClickSyncCapBonus(dimensions: Array<{ bought: number }>): number {
  const d1 = dimensions[0]
  if (!d1 || d1.bought <= 0) return 0
  const id = getTierIdentity(1)
  if (!id || id.passive.kind !== 'clickSyncCapBonus') return 0
  return id.passive.value
}

export function formatUnlockBuffMult(
  tier: number,
  buffTier: number,
  buffUntilMs: number,
  nowMs: number
): number {
  if (buffTier !== tier || buffUntilMs <= nowMs) return 1
  return FORMAT_UNLOCK_BUFF_MULT
}
