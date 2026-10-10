/** Kriz ve anomali tipleri: bufflar, yuzer anomaliler, vicdan parazitleri ve reaktor. */
import { Decimal } from "../core/math"

export type AnomalyType = 'fyp' | 'heart_frenzy' | 'sponsor' | 'void'

export type BuffType = AnomalyType | 'espresso' | 'planck_surge' | 'resonance_boost'

export interface ActiveBuff {
  id: string
  type: BuffType
  name: string
  duration: number
  remaining: number
  multiplier: number
}

export interface FloatingAnomaly {
  id: string
  type: AnomalyType
  x: number // Yüzde ekran konumu (10 - 85)
  y: number // Yüzde ekran konumu (15 - 80)
  remainingTime: number // Ekranda kalacağı kalan saniye
  totalTime: number // Spawn anındaki toplam süre (halka/bar yüzdesi için)
  title: string
  desc: string
}

export interface GuiltWrinkler {
  id: string
  name: string
  leechedDopamine: Decimal
  clicksRemaining: number // Susturmak için gereken tıklama
}

/** Geriye dönük tip uyumluluğu */

export type InternetTroll = GuiltWrinkler

/** Crisis 2.0: Olay Ufku Kararsızlık Reaktörü Fazları */
export type ReactorPhase = 'dormant' | 'resonance' | 'sweet_spot' | 'meltdown'

/** Crisis 2.0: 4 Taktiksel Müdahale Türü */
export type CrisisInterventionType =
  | 'quantum_compression'
  | 'time_dilation'
  | 'magnetic_vent'
  | 'planck_surge'

export interface CrisisDilemmaOption {
  id: string
  label: string
  desc: string
  effect: string
}

export interface CrisisDilemma {
  id: string
  title: string
  desc: string
  duration: number
  timeLeft: number
  options: CrisisDilemmaOption[]
}

/** Geriye dönük uyumluluk takma adı (Crisis 2.0) */
export type CrisisSpellType =
  | CrisisInterventionType
  | 'fast_charge'
  | 'espresso_shot'
  | 'noise_cancelling'
  | 'sleep_denial'
