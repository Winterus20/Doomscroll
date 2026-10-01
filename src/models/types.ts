import { Decimal } from '../core/math'
import type { NotationType } from '../core/format'

export type StanceType = 'trend' | 'spam' | 'private_mode'
export type AnomalyType = 'fyp' | 'heart_frenzy' | 'sponsor'

export interface DimensionData {
  tier: number
  amount: Decimal
  bought: number // Toplam satın alınan (çarpan hesaplamak için)
  baseCost: Decimal
  costMult: Decimal
}

export interface ActiveBuff {
  id: string
  type: AnomalyType
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
  title: string
  desc: string
}

export interface InternetTroll {
  id: string
  name: string
  leechedLikes: Decimal
  clicksRemaining: number // Linçletmek / engellemek için gereken tıklama
}

export interface AutobuyerConfig {
  id: string
  name: string
  enabled: boolean
  unlocked: boolean
  mode: AutobuyerMode
  interval: number // saniye cinsinden
  timer: number
}

export type LabSeedType = 'cat_audio' | 'cheese_sizzle' | 'subway_beat' | 'sigma_phonk' | 'brainrot_remix'

export interface LabCell {
  id: number
  seedType: LabSeedType | null
  age: number
  matureAge: number
  maxAge: number
  isMature: boolean
}

export type CrisisSpellType = 'fast_charge' | 'espresso_shot' | 'noise_cancelling' | 'sleep_denial'

export type AutobuyerMode = 'single' | 'bulk' | 'max'

export type MusicTrackId = 'lofi_chill' | 'synthwave' | 'ambient_drone' | 'subway_groove' | 'custom'

export interface GameSettings {
  notation: NotationType
  soundEnabled: boolean
  soundVolume: number
  theme: 'cyberpunk' | 'dark'
  musicEnabled: boolean
  musicVolume: number
  musicTrack: MusicTrackId
  vinylCrackle: boolean
  rainEnabled: boolean
  rainLevel: number
  musicIntensity: number
  sleepTimerMinutes: number
  customAudioUrl?: string
}

export interface PlayerStats {
  manualClicks: number // Kalp Atma Sayısı
  totalMatterProduced: Decimal // Toplam Beğeni
  highestMatter: Decimal
  totalPlaytime: number // saniye
  singularityCount: number // Mavi Tik Devirleri
  fastestSingularity: number // saniye
  anomaliesClicked: number // Tıklanan Viral Bildirimler
  combosTriggered: number // Süper Rezonans Komboları
  slackersFired: number // Linçletilen Troller
  labHarvests: number // Algoritma Lab Hasatları
  spellsCast: number // Kullanılan Gece Büyüleri
  seedsPlanted: number // Ekilen Lab Tohumları
}

export type AchievementCategoryId =
  | 'dopamine'
  | 'dimensions'
  | 'automation'
  | 'crisis'
  | 'guilt'
  | 'lab'
  | 'singularity'

export type AchievementRewardKind =
  | 'click_x2'
  | 'tickspeed_discount'
  | 'buff_duration'
  | 'leech_reduction'
  | 'sp_discount'
  | 'lab_yield'
  | 'anomaly_rate'
  | 'caffeine_regen'
  | 'caffeine_boost'
  | 'starting_matter'

export interface AchievementReward {
  kind: AchievementRewardKind
  desc: string // Sekmede gösterilen kalıcı ödül metni
}

export interface AchievementDef {
  id: string
  name: string
  desc: string // Kazanma koşulu metni
  icon: string // emoji
  category: AchievementCategoryId
  secret?: boolean // Gizli (shadow): kilitliyken adı/ipucu gizlenir, ödül vermez
  reward?: AchievementReward
  check: (ctx: AchievementContext) => boolean
}

export interface AchievementContext {
  manualClicks: number
  totalMatter: Decimal
  highestMatter: Decimal
  matter: Decimal
  playtime: number
  singularityCount: number
  anomaliesClicked: number
  combosTriggered: number
  slackersFired: number
  labHarvests: number
  spellsCast: number
  seedsPlanted: number
  tickspeedBought: number
  shifts: number
  galaxies: number
  sp: Decimal
  spUpgradesTotal: number
  guiltImmunityLvl: number
  dimBoughtTotal: number
  dimBought0: number
  unlockedBots: string[]
  bulkUnlocked: boolean
  maxUnlocked: boolean
  matureCells: number
  hasBrainrot: boolean
  hasMatureBrainrot: boolean
  activeSlackers: number
  leechedTotal: Decimal
  wallHour: number
}

export interface SerializedPlayerState {
  version: number
  matter: string // Likes
  dimensions: Array<{
    amount: string
    bought: number
  }>
  tickspeedBought: number
  dimensionShifts: number
  galaxies: number
  singularityPoints: string
  currentStance: StanceType
  activeBuffs: Array<{
    type: AnomalyType
    remaining: number
  }>
  slackers: Array<{
    name: string
    leechedKpi: string
  }>
  caffeineEnergy?: number
  labCells?: Array<{
    id: number
    seedType: LabSeedType | null
    age: number
    matureAge: number
    maxAge: number
  }>
  autobuyers?: Record<string, { enabled: boolean; unlocked: boolean; mode?: AutobuyerMode }>
  autobuyerBulkUnlocked?: boolean
  autobuyerMaxUnlocked?: boolean
  singularityUpgrades?: Record<string, number>
  lastUpdate: number
  settings: GameSettings
  stats: {
    manualClicks: number
    totalMatterProduced: string
    highestMatter: string
    totalPlaytime: number
    singularityCount: number
    fastestSingularity: number
    anomaliesClicked: number
    combosTriggered: number
    slackersFired: number
    labHarvests?: number
    spellsCast?: number
    seedsPlanted?: number
  }
  achievements?: string[]
  achievementsSeenCount?: number
}
