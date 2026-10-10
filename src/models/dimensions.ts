/** Boyut katmani tipleri: duruslar, boyut verisi, kilometre taslari ve olcek gunlugu. */
import { Decimal } from "../core/math"

export type StanceType = 'trend' | 'spam' | 'private_mode'

export interface DimensionData {
  tier: number
  amount: Decimal
  bought: number // Toplam satın alınan (çarpan hesaplamak için)
  baseCost: Decimal
  costMult: Decimal
}

export interface ResolutionMilestone {
  count: number
  name: string
  shortName: string
  mult: number
  colorClass: string
  desc: string
}

/** Balatro Sütun 2: Sıralı Nedensellik (Sequential Triggering) Basamak Tipleri */
export type StrikeStageId = 'base' | 'synergy' | 'stance_combo' | 'crit' | 'final'

export interface StrikeStage {
  id: StrikeStageId
  label: string
  text: string
  color: string
  bgClass: string
  borderClass: string
  icon?: string
  multiplier?: number
}

export interface SequentialStrikePayload {
  x: number
  y: number
  stages: StrikeStage[]
  finalAmount: Decimal
  isCrit: boolean
  comboCount: number
}

/** Ölçek sıçrama günlüğü kaydı (ADR-0052; shift/galaxy/singularity — son 100) */
export interface ScaleJumpRecord {
  id: number
  layer: 'shift' | 'galaxy' | 'singularity'
  timestamp: number
  runSeconds: number
  peakLogMatter: number
  shifts: number
  galaxies: number
  singularities: number
  spGained: Decimal
}

/** Kayıtlı hâli (Decimal'lar string) */
export interface SerializedScaleJumpRecord {
  id: number
  layer: 'shift' | 'galaxy' | 'singularity'
  timestamp: number
  runSeconds: number
  peakLogMatter: number
  shifts: number
  galaxies: number
  singularities: number
  spGained: string
}
