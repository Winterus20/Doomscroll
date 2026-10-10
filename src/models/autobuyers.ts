/** Otomatik cekim botu tipleri. */
export type AutobuyerMode = 'single' | 'bulk' | 'max'

export interface AutobuyerConfig {
  id: string
  name: string
  enabled: boolean
  unlocked: boolean
  mode: AutobuyerMode
  interval: number // saniye cinsinden
  timer: number
  minGainSp?: number // Şafak Nöbeti Botu: minimum SP kazancı tabanı (default 1)
  // Kokpit Gelişmiş Kuralları
  customRule?: {
    maxGalaxies?: number // Küme botu için opsiyonel tavan sınırı (0 = sınırsız)
  }
}
