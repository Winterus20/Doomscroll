import { defineStore } from 'pinia'
import { Decimal, D_0, D_1, D_INFINITY } from '../core/math'
import { sounds } from '../core/audio'
import { musicEngine } from '../core/music-engine'
import { SaveSystem } from '../core/save'
import { SAVE_VERSION, MIN_SUPPORTED_SAVE_VERSION, SaveVersionError } from '../core/save-version'
import confetti from 'canvas-confetti'
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  calcAchievementMultiplier,
  hasAchievementReward
} from '../game/achievements'
import {
  FEATURE_UNLOCKS,
  buildUnlockContext,
  checkUnlock,
  getFeatureById,
  lifetimeUnlockDopamine,
  meetsDopamineGate,
  raisedLifetimePeak,
  type UnlockContext
} from '../game/unlocks'
import { log10Safe } from '../game/pacing'
import {
  ALL_CHALLENGES_COMPLETE_MULT,
  challengeRewardEffects as computeChallengeRewardEffects,
  challengeTimeTierMult,
  getChallengeById,
  isAllChallengesComplete,
  type ChallengeDef,
  type ChallengeRewardEffects
} from '../game/challenges'
import {
  FORMAT_UNLOCK_BUFF_SECONDS,
  FORMAT_UNLOCK_BUFF_MULT,
  formatUnlockBuffMult,
  getTierIdentity,
  tierAnomalyRateMult,
  tierClickSyncCapBonus,
  tierOfflineSimMult,
  tierProductionMult,
  tierShiftReqMult,
  tierSlackerLeechMult
} from '../game/dimension_identity'
import type {
  AchievementContext,
  DimensionData,
  GameSettings,
  MusicTrackId,
  PlayerStats,
  SerializedPlayerState,
  StanceType,
  ActiveBuff,
  FloatingAnomaly,
  GuiltWrinkler,
  AnomalyType,
  BuffType,
  LabCell,
  LabSeedType,
  LabMode,
  CrisisSpellType,
  AutobuyerConfig,
  AutobuyerMode,
  ResolutionMilestone,
  NeuralNode,
  NeuralEffects,
  OfflineReport,
  PastSingularityRecord,
  StrikeStage
} from '../models/types'
import { format } from '../core/format'

function parseSavedDecimal(value: string | number | undefined, fallback: Decimal): Decimal {
  const parsed = new Decimal(value ?? fallback.toString())
  if (parsed.isNan() || !Number.isFinite(parsed.mag)) {
    return new Decimal(fallback.toString())
  }
  return parsed
}

function clampSavedNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function isValidBuffType(value: unknown): value is BuffType {
  return value === 'fyp' || value === 'heart_frenzy' || value === 'sponsor' || value === 'void' || value === 'espresso'
}

function isValidLabSeedType(value: unknown): value is LabSeedType {
  return typeof value === 'string' && LAB_SEEDS.some((seed) => seed.type === value)
}

// ADR-0029: kayıttan gelen enum değerleri doğrulanmadan state'e yazılmasın.
// currentStance bir switch'te tüketiliyor (bkz. stanceMultipliers); geçersiz bir
// değer tip yanılgısı yaratıyordu.
const STANCE_TYPES: readonly StanceType[] = ['trend', 'spam', 'private_mode']

function isValidStanceType(value: unknown): value is StanceType {
  return typeof value === 'string' && STANCE_TYPES.includes(value as StanceType)
}

export const MIRROR_PAIRS: Record<number, { partnerTier: number; label: string }> = {
  1: { partnerTier: 8, label: 'Saf Beyin Çürümesi (D8)' },
  2: { partnerTier: 7, label: 'Varoluşsal Kriz (D7)' },
  3: { partnerTier: 6, label: 'Hint Dizisi (D6)' },
  4: { partnerTier: 5, label: 'Sigma Tavsiyesi (D5)' },
  5: { partnerTier: 4, label: 'Subway Surfers (D4)' },
  6: { partnerTier: 3, label: 'ASMR Sabun (D3)' },
  7: { partnerTier: 2, label: 'Sokak Lezzeti (D2)' },
  8: { partnerTier: 1, label: 'Kedi Videoları (D1)' }
}

export const RESOLUTION_MILESTONES: ResolutionMilestone[] = [
  { count: 50, name: '360p Mobil Veri', shortName: '360p', mult: 2, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', desc: '2× Çarpan' },
  { count: 100, name: '720p HD Kalite', shortName: '720p HD', mult: 3, colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', desc: '3× Çarpan' },
  { count: 200, name: '1080p 60 FPS', shortName: '1080p 60fps', mult: 4, colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30', desc: '4× Çarpan + %1 Tıklama Payı' },
  { count: 250, name: '4K HDR Dolby', shortName: '4K HDR', mult: 8, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30', desc: '8× Çarpan' },
  { count: 500, name: 'Nöro-Link Akışı', shortName: 'Nöro-Link', mult: 16, colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30', desc: '16× Çarpan' },
  { count: 1000, name: 'Kozmik Tekillik', shortName: 'Kozmik', mult: 32, colorClass: 'text-white bg-white/20 border-white/40', desc: '32× Çarpan' }
]

const BASE_COSTS = [
  new Decimal(10),
  new Decimal(100),
  new Decimal(1e4),
  new Decimal(1e6),
  new Decimal(1e9),
  new Decimal(1e13),
  new Decimal(1e18),
  new Decimal(1e24)
]

const COST_MULTS = [
  new Decimal(1e3),
  new Decimal(1e4),
  new Decimal(1e5),
  new Decimal(1e6),
  new Decimal(1e8),
  new Decimal(1e10),
  new Decimal(1e12),
  new Decimal(1e15)
]

const DIMENSION_CHAIN_RATE = 0.060
/** Erken koşu maliyet duvarı: D1/D2 için ×1000/adım yerine yumuşak merdiven (ADR-0026). */
const EARLY_D1_COST_RATIO = 55
const EARLY_D1_SOFT_BUCKETS = 4
const EARLY_D2_COST_RATIO = 42
const EARLY_D2_SOFT_BUCKETS = 3
/** D3/D4 yumuşak merdiven: milyardan trilyona geçişteki 1e9-1e14 duvarını çözer */
const EARLY_D3_COST_RATIO = 32
const EARLY_D3_SOFT_BUCKETS = 3
const EARLY_D4_COST_RATIO = 28
const EARLY_D4_SOFT_BUCKETS = 2
/** D5/D6 yumuşak merdiven: Shift 2 ve Shift 3'teki 1e9->1e17 ölümcül uçurumu çözer */
const EARLY_D5_COST_RATIO = 24
const EARLY_D5_SOFT_BUCKETS = 2
const EARLY_D6_COST_RATIO = 20
const EARLY_D6_SOFT_BUCKETS = 2
/**
 * Yeni koşuda açık format sayısı tabanı (her sıçrama +1, max 8).
 * ADR-0033: 3 (D1+D2+D3). Oyuncu geri bildirimi: "milyardan trilyona geçiş çok uzun"
 * ve "1. akış sıçramasında D4 yok". Taban 2 iken 1e9–1e12 bandında yalnızca 2 istasyon
 * vardı; taban 3 ile D3 baştan açık, D4 ise 1. sıçramada gelir.
 */
export const BASE_UNLOCKED_DIMENSIONS = 3
/** D2+ satın alımında alt kata anında aktarılan “zincir darbesi” (sn); üst sayaçların hissedilir hızlanması için. */
const PURCHASE_CHAIN_BONUS_SECONDS = 2.5
const PURCHASE_MATTER_TICK_SECONDS = 0.45

// Satın alınan her 10 adette boyut çarpanı artışı (ADR-0023 ilk prestij dengelemesi):
// 2.0 + sınırsız max-alım son koşuda dakikalar içinde 1e308'e fırlatıyordu.
export const DIM_PER_TEN_MULT = 1.58

// ---- Gece Kriz Meydan Okumaları (Faz 3: denge sabitleri) ----
// C2: alım sonrası tam durma biter, üretim 60 sn'de lineer rampayla döner.
const CHALLENGE_HALT_RAMP_SEC = 60
// C8: Sıçrama/Küme bildirim sayacının bu kadarını temizler.
const CHALLENGE_DOOM_RELIEF = 0.6
// C8: sayaç Sıçrama/Küme sayısıyla ivmelenir (uyuyan oyuncu için offline'da donar).
const CHALLENGE_DOOM_SHIFT_ACCEL = 0.15
const CHALLENGE_DOOM_GALAXY_ACCEL = 0.25
// C8 fırtına eğrisi: %100'de ×0.5, her +%25 taşmada ek ×0.75, taban ×0.15.
const CHALLENGE_STORM_BASE = 0.5
const CHALLENGE_STORM_STEP = 0.75
const CHALLENGE_STORM_FLOOR = 0.15
// C7: kilitli tier'lar Sıçrama/Küme gereksinimini D6 formatına göre ölçekler.
const CHALLENGE_C7_TIER_COST_STEP = 5
const CHALLENGE_C7_GALAXY_COST_MULT = 1.5

/** Aktif challenge'ın boyut üst sınırı (C7); yoksa tanımsız. Registry üzerinden okunur. */
function challengeDimensionCap(state: { activeChallenge: string | null }): number | undefined {
  if (!state.activeChallenge) return undefined
  return getChallengeById(state.activeChallenge)?.modifiers.maxDimensions
}

/** ADR-0025: shift cap + legacy save floor (v12). ADR-0035: cap kalıcıdır. */
function resolvedUnlockedDimensionCount(state: {
  dimensionShifts: number
  lifetimePeakShifts?: number
  dimensionCapFloor: number
  activeChallenge: string | null
}): number {
  // ADR-0035: Boyut açılışı bir OLAYdır. `buyGalaxy()` koşu sayacını 0'a indirdiği
  // için sadece `dimensionShifts`'e bakmak, ilk kümeden sonra D4–D8'i geri kilitliyordu.
  // Hayat boyu en yüksek sıçrama sayısı kullanılır: bir kez açılan boyut kapanmaz.
  const shiftCap = Math.min(
    8,
    BASE_UNLOCKED_DIMENSIONS + Math.max(state.lifetimePeakShifts ?? 0, state.dimensionShifts)
  )
  const base = Math.max(shiftCap, state.dimensionCapFloor)
  const cap = challengeDimensionCap(state)
  return cap === undefined ? base : Math.min(base, cap)
}

/** Aktif C5 koşusunun birikimli maliyet şişmesi (×1.5^sayaç); koşu-dışı ×1. Azami 1e12 softcap. */
function challengeCostInflationMult(state: {
  activeChallenge: string | null
  challengeCostInflation: number
}): Decimal {
  if (!state.activeChallenge || state.challengeCostInflation <= 0) return D_1
  const step = getChallengeById(state.activeChallenge)?.modifiers.costInflationOnBuy
  if (step === undefined) return D_1
  // Denge: Enflasyon en fazla 1e12 katına kadar şişebilir; aşılamaz kilitlenmeyi (softlock) önler
  const raw = Decimal.pow(step, state.challengeCostInflation)
  return raw.gt(1e12) ? new Decimal(1e12) : raw
}

const GUILT_NAMES = [
  'Yarın Erken Kalkacaksın!',
  'Gözlerin Kan Çanağı Oldu',
  'Telefon Yüzüne Düşmek Üzere',
  'Son 2 Saatlik Uyku Kaldı',
  'Kuş Sesleri Gelmeye Başladı...'
]

export const LAB_SEEDS = [
  {
    type: 'cat_audio' as LabSeedType,
    name: 'Kedi Miyavlaması',
    icon: '🐱',
    desc: 'Hızlı ısınır. Komşularına +%15 rezonans yayar ve pasif dopamini artırır.',
    cost: new Decimal(500),
    growthSeconds: 15,
    lifeSeconds: Infinity,
    matureBoostDesc: '+20% Pasif Dopamin & Komşulara +%15',
    harvestRewardDesc: '10 sn Dopamin'
  },
  {
    type: 'cheese_sizzle' as LabSeedType,
    name: 'Eritme Kaşar Cızırtısı',
    icon: '🧀',
    desc: 'Gece 3 açlığını tetikler. Yoğun pasif dopamin akışı sağlar.',
    cost: new Decimal(50000),
    growthSeconds: 25,
    lifeSeconds: Infinity,
    matureBoostDesc: '+35% Pasif Dopamin (Yemekle +%76)',
    harvestRewardDesc: '20 sn Dopamin'
  },
  {
    type: 'subway_beat' as LabSeedType,
    name: 'Subway Surfers Beat',
    icon: '🛹',
    desc: 'Hipnotik arka plan ritmi. Manuel kaydırma reflekslerini kamçılar.',
    cost: new Decimal(5e6),
    growthSeconds: 35,
    lifeSeconds: Infinity,
    matureBoostDesc: '×2.0 Yukarı Kaydırma Gücü',
    harvestRewardDesc: '30 sn Dopamin'
  },
  {
    type: 'sigma_phonk' as LabSeedType,
    name: 'Gece 4 Sigma Phonk',
    icon: '🗿',
    desc: 'Ağır baslar uykuyu kaçırır. Gece Krizleri daha sık gelir ve Bas Şoku yayar.',
    cost: new Decimal(1e9),
    growthSeconds: 45,
    lifeSeconds: Infinity,
    matureBoostDesc: '+50% Kriz Sıklığı & Komşulara ×1.25',
    harvestRewardDesc: '40 sn Dopamin'
  },
  {
    type: 'mukbang_drama' as LabSeedType,
    name: 'Gece 3 Mukbang & Drama',
    icon: '🍜',
    desc: 'Kaşar + Subway sentezi. Hem pasif üretimi hem kaydırma gücünü harmanlar.',
    cost: new Decimal(1e11),
    growthSeconds: 50,
    lifeSeconds: Infinity,
    matureBoostDesc: '+50% Pasif & ×1.5 Kaydırma',
    harvestRewardDesc: '50 sn Dopamin',
    isMutationOnly: true
  },
  {
    type: 'cat_burger' as LabSeedType,
    name: 'Cheeseburger Kedi',
    icon: '🍔',
    desc: 'Kedi + Kaşar sentezi. Sevimliliğiyle Vicdan Azaplarının emişini hafifletir.',
    cost: new Decimal(1e12),
    growthSeconds: 50,
    lifeSeconds: Infinity,
    matureBoostDesc: '+40% Pasif & Azap Emişi -%25',
    harvestRewardDesc: '1 dk Dopamin',
    isMutationOnly: true
  },
  {
    type: 'drift_tok' as LabSeedType,
    name: 'Tokyo Drift Dublajı',
    icon: '🏎️',
    desc: 'Phonk + Subway sentezi. Yüksek ritimle kaydırma gücünü ikiye katlar.',
    cost: new Decimal(1e13),
    growthSeconds: 60,
    lifeSeconds: Infinity,
    matureBoostDesc: '×2.0 Kaydırma & +%30 Kriz',
    harvestRewardDesc: '1,5 dk Dopamin',
    isMutationOnly: true
  },
  {
    type: 'brainrot_remix' as LabSeedType,
    name: 'Saf Nöron Çürütücü',
    icon: '🧠',
    desc: 'Kedi + Phonk efsanevi rezonansı. Algoritmayı tekillik boyutuna taşır!',
    cost: new Decimal(1e15),
    growthSeconds: 75,
    lifeSeconds: Infinity,
    matureBoostDesc: '+200% (×3) Tüm Küresel Dopamin!',
    harvestRewardDesc: '2 dk Dopamin',
    isMutationOnly: true
  }
]

export interface LabRecipe {
  result: LabSeedType
  parent1: LabSeedType
  parent2: LabSeedType
  name: string
  icon: string
  hint: string
  desc: string
}

export const LAB_RECIPES: LabRecipe[] = [
  {
    result: 'mukbang_drama',
    parent1: 'cheese_sizzle',
    parent2: 'subway_beat',
    name: 'Gece 3 Mukbang & Drama',
    icon: '🍜',
    hint: 'Eritme Kaşar (🧀) ve Subway Surfers (🛹) komşuluğu ile sentezlenir.',
    desc: 'Gece açlığıyla parkur gerilimi birleşir: Hem Pasif hem Tıklama katlanır.'
  },
  {
    result: 'cat_burger',
    parent1: 'cat_audio',
    parent2: 'cheese_sizzle',
    name: 'Cheeseburger Kedi',
    icon: '🍔',
    hint: 'Kedi Miyavlaması (🐱) ve Eritme Kaşar (🧀) komşuluğu ile sentezlenir.',
    desc: 'Nostaljik sevimli meme: Vicdan Azaplarını sakinleştirip emişini düşürür.'
  },
  {
    result: 'drift_tok',
    parent1: 'sigma_phonk',
    parent2: 'subway_beat',
    name: 'Tokyo Drift Dublajı',
    icon: '🏎️',
    hint: 'Sigma Phonk (🗿) ve Subway Surfers (🛹) komşuluğu ile sentezlenir.',
    desc: 'Yüksek desibel ve hız: Manuel kaydırma ve Anomali ivmesi tavan yapar.'
  },
  {
    result: 'brainrot_remix',
    parent1: 'cat_audio',
    parent2: 'sigma_phonk',
    name: 'Saf Nöron Çürütücü',
    icon: '🧠',
    hint: 'Kedi Miyavlaması (🐱) ve Sigma Phonk (🗿) komşuluğu ile sentezlenir.',
    desc: 'Algoritma tekilliği: Tüm küresel dopamin üretimini kalıcı olarak üçe katlar!'
  }
]

export const CRISIS_SPELLS = [
  {
    id: 'fast_charge' as CrisisSpellType,
    name: 'Telefonu Hızlı Şarja Tak',
    icon: '⚡',
    desc: 'Anında ekrana 1 adet ışıltılı Gece Krizi (Altın Anomali) fırlatır.',
    energyCost: 30,
    backfireChance: 0.15,
    backfireDesc: '%15 Risk: Şarj kablosu temassızlık yaptı! (15 sn %50 hız kaybı)'
  },
  {
    id: 'espresso_shot' as CrisisSpellType,
    name: 'Çift Espresso Shot',
    icon: '☕',
    desc: 'Beyni şoka sokar; 30 saniye boyunca Algoritma Frekansını 3× katlar.',
    energyCost: 45,
    backfireChance: 0.1,
    backfireDesc: '%10 Risk: Kalp çarpıntısı! Enerji barı sıfırlanır.'
  },
  {
    id: 'noise_cancelling' as CrisisSpellType,
    name: 'Gürültü Önleyici Kulaklık',
    icon: '🎧',
    desc: 'Mevcut tüm Vicdan Azaplarını (Wrinklers) anında susturur ve %150 primle bozdurur.',
    energyCost: 35,
    backfireChance: 0.0,
    backfireDesc: 'Risk yok! Tam sessizlik ve odaklanma.'
  },
  {
    id: 'sleep_denial' as CrisisSpellType,
    name: "'Yarın Erken Kalkmam Gerekmiyor' Yalanı",
    icon: '🛌',
    desc: 'Vicdanı tamamen uyutur; anında 1 dakikalık Dopamin patlaması verir.',
    energyCost: 60,
    backfireChance: 0.2,
    backfireDesc: '%20 Risk: Gerçekle yüzleşme! Ekrana anında 3 yeni Vicdan Azabı dadanır.'
  }
]

export const SINGULARITY_UPGRADES = [
  {
    id: 'eye_drops',
    name: 'Göz Damlası',
    icon: '💧',
    desc: 'Kuruyan gözleri rahatlatır. İstasyon üretimlerini her seviye 2× çarpar.',
    baseCost: 1,
    costMult: 2,
    maxLevel: 10
  },
  {
    id: 'muted_alerts',
    name: 'Sessize Alınmış Bildirimler',
    icon: '🔕',
    desc: 'Gereksiz aramaları susturur. Gece Krizlerinin geliş aralığını her seviye %12 kısaltır.',
    baseCost: 2,
    costMult: 2.5,
    maxLevel: 5
  },
  {
    id: 'fast_charger',
    name: 'GaN 120W Hızlı Adaptör',
    icon: '🔌',
    desc: 'Pil hiç bitmez. Algoritma Frekansı (Hz) taban indirimini güçlendirir.',
    baseCost: 3,
    costMult: 3,
    maxLevel: 5
  },
  {
    id: 'caffeine_drip',
    name: 'Damardan Kafein Serumu',
    icon: '🧪',
    desc: 'Yukarı Kaydır (Manuel Tıklama) gücüne saniyelik üretimin her seviye %5\'ini ekler!',
    baseCost: 5,
    costMult: 3,
    maxLevel: 5
  },
  {
    id: 'neural_chip',
    name: 'Otonom Kaydırma Çipi',
    icon: '🤖',
    desc: 'Tüm Otomatik Kaydırma Botlarının çalışma frekansını her seviye 1.5× hızlandırır.',
    baseCost: 4,
    costMult: 2.5,
    maxLevel: 5
  },
  {
    id: 'neural_nest',
    name: 'Nöral Yuva',
    icon: '🐜',
    desc: 'Nöral izleme kolonisinin üreme hızını her seviye %10 artırır.',
    baseCost: 6,
    costMult: 3,
    maxLevel: 5
  },
  {
    id: 'guilt_immunity',
    name: 'Vicdan Uyuşturucu',
    icon: '🛡️',
    desc: 'Vicdan azaplarının emdiği pay %50 azalır, susturulduklarında %150 prim verir.',
    baseCost: 3,
    costMult: 4,
    maxLevel: 3
  },
  {
    id: 'break_singularity',
    name: 'Uyku Sınırını Yıkma',
    icon: '⚡',
    desc: 'Dopamin 1.79e308 üstüne çıkabilir. Tekillikte Shift/Galaxy botları beklemeyi bırakır, sınırın ötesinde normal çalışır.',
    baseCost: 4,
    costMult: 1,
    maxLevel: 1
  }
]

/**
 * Nöral Ağaç: kalıcı SP yetenek ağacı. Eski düz dükkân (SINGULARITY_UPGRADES)
 * id'leri buraya da yerleştirildi; iki yol aynı singularityUpgrades seviye
 * kaydını senkron tuttuğu için etki bağlantıları her iki satın alma yolunda da çalışır.
 */
export const NEURAL_TREE: NeuralNode[] = [
  // ---- Kök ----
  {
    id: 'insomnia_heart',
    name: 'Uykusuzluğun Kalbi',
    icon: '❤️',
    desc: 'Ağacın kökü. 02:47\'de atmayan o kalp; tüm dalları açar.',
    branch: 'root',
    cost: 1,
    requires: [],
    effect: 'root_unlock'
  },

  // ---- Pasif Dal (🌙 Uyku) ----
  {
    id: 'eye_drops',
    name: 'Göz Damlası',
    icon: '💧',
    desc: 'Kuruyan gözleri rahatlatır. İstasyon üretimlerini her seviye 2× çarpar.',
    branch: 'passive',
    cost: 1,
    maxLevel: 10,
    costMult: 2,
    requires: ['insomnia_heart'],
    effect: 'eye_drops'
  },
  {
    id: 'muted_alerts',
    name: 'Sessize Alınmış Bildirimler',
    icon: '🔕',
    desc: 'Gece Krizlerinin geliş aralığını her seviye %12 kısaltır.',
    branch: 'passive',
    cost: 2,
    maxLevel: 5,
    costMult: 2.5,
    requires: ['insomnia_heart'],
    effect: 'muted_alerts'
  },
  {
    id: 'offline_dream_weaver',
    name: 'Çevrimdışı Rüya Dokuyucu',
    icon: '🌙',
    desc: 'Telefon masada beklerken bile kazanç akar: çevrimdışı ilerleme her seviye +%25.',
    branch: 'passive',
    cost: 3,
    maxLevel: 3,
    costMult: 2.5,
    requires: ['eye_drops'],
    effect: 'offline_gain'
  },
  {
    id: 'neural_chip',
    name: 'Otonom Kaydırma Çipi',
    icon: '🤖',
    desc: 'Tüm Otomatik Kaydırma Botlarının çalışma frekansını her seviye 1.5× hızlandırır.',
    branch: 'passive',
    cost: 4,
    maxLevel: 5,
    costMult: 2.5,
    requires: ['offline_dream_weaver'],
    effect: 'neural_chip'
  },
  {
    id: 'bot_overclock',
    name: 'Bot Aşırı Yüklemesi',
    icon: '⚡',
    desc: 'Çipler kırmızıya keser: tüm bot frekansı her seviye +%25 hızlanır.',
    branch: 'passive',
    cost: 10,
    maxLevel: 3,
    costMult: 2.5,
    requires: ['neural_chip'],
    effect: 'bot_frequency'
  },
  {
    id: 'neural_nest',
    name: 'Nöral Yuva',
    icon: '🐜',
    desc: 'Nöral izleme kolonisinin üreme hızını her seviye %10 artırır.',
    branch: 'passive',
    cost: 6,
    maxLevel: 5,
    costMult: 3,
    requires: ['neural_chip'],
    effect: 'neural_nest'
  },
  {
    id: 'prod_echo',
    name: 'Yankılanan Üretim',
    icon: '📈',
    desc: 'Uyku düzeni oturur: tüm dopamin üretimi her seviye +%25 kalıcı artar.',
    branch: 'passive',
    cost: 5,
    maxLevel: 5,
    costMult: 2,
    requires: ['neural_nest'],
    effect: 'production_mult'
  },
  {
    id: 'dawn_harbinger',
    name: 'Şafak Habercisi',
    icon: '🌅',
    desc: '06:00\'ya yaklaşmayı hızlandırır: Tekillik (Şafak) kazancını 2× katlar.',
    branch: 'passive',
    cost: 8,
    requires: ['prod_echo'],
    effect: 'dawn_speed'
  },
  {
    id: 'break_singularity',
    name: 'Uyku Sınırını Yıkma',
    icon: '⚡',
    desc: 'Dopamin 1.79e308 üstüne çıkabilir. Tekillikte Shift/Galaxy botları beklemeyi bırakır, sınırın ötesinde normal çalışır.',
    branch: 'hybrid',
    cost: 4,
    requires: ['eye_drops'], // Denge: taban 3 SP ile 2. koşudan sonra hemen açılabilir (4 SP)
    effect: 'dawn_speed'
  },
  {
    id: 'dream_ascetic',
    name: 'Çileci Rüya',
    icon: '🧘',
    desc: 'SEÇİM: Ekranı kapatsan da kazanç durmaz — çevrimdışı kazanç +%50. Kardeş düğüm bir sonraki Şafak\'a kilitlenir.',
    branch: 'passive',
    cost: 7,
    requires: ['offline_dream_weaver'],
    effect: 'offline_gain',
    choiceGroup: 'dream_duality'
  },
  {
    id: 'dream_lucid',
    name: 'Berrak Rüya',
    icon: '💭',
    desc: 'SEÇİM: Uykuda bile akış sürer — tüm üretim kalıcı 1.75×. Kardeş düğüm bir sonraki Şafak\'a kilitlenir.',
    branch: 'passive',
    cost: 7,
    requires: ['offline_dream_weaver'],
    effect: 'production_mult',
    choiceGroup: 'dream_duality'
  },

  // ---- Aktif Dal (👍 Başparmak) ----
  {
    id: 'fast_charger',
    name: 'GaN 120W Hızlı Adaptör',
    icon: '🔌',
    desc: 'Pil hiç bitmez. Algoritma Frekansı (Hz) taban indirimini güçlendirir.',
    branch: 'active',
    cost: 3,
    maxLevel: 5,
    costMult: 3,
    requires: ['insomnia_heart'],
    effect: 'fast_charger'
  },
  {
    id: 'cps_sync',
    name: 'Koleksiyon Senkronu',
    icon: '🔄',
    desc: 'Her seviye tıklamaya saniyelik üretimin +%1.5\'ini ekler (taban %2, tavan %8).',
    branch: 'active',
    cost: 2,
    maxLevel: 4,
    costMult: 2,
    requires: ['insomnia_heart'],
    effect: 'cps_sync'
  },
  {
    id: 'combo_unlock',
    name: 'Hipnotik Seri',
    icon: '👆',
    desc: 'Combo Sistemi: 1.5 sn içinde üst üste tıklamalar seri biriktirir; seri ×2/×3/×5 çarpanı verir.',
    branch: 'active',
    cost: 4,
    requires: ['cps_sync'],
    effect: 'combo_unlock'
  },
  {
    id: 'click_momentum',
    name: 'Başparmak Momenti',
    icon: '💪',
    desc: 'Kaydırma kası gelişir: Yukarı Kaydırma gücü kalıcı 1.3× artar.',
    branch: 'active',
    cost: 6,
    requires: ['combo_unlock'],
    effect: 'click_mult'
  },
  {
    id: 'caffeine_drip',
    name: 'Damardan Kafein Serumu',
    icon: '🧪',
    desc: 'Yukarı Kaydır (Manuel Tıklama) gücüne saniyelik üretimin her seviye %5\'ini ekler!',
    branch: 'active',
    cost: 5,
    maxLevel: 5,
    costMult: 3,
    requires: ['cps_sync'],
    effect: 'caffeine_drip'
  },
  {
    id: 'crisis_bounty',
    name: 'Kriz Ganimeti',
    icon: '💰',
    desc: 'Vicdan Azaplarını susturmak artık %50 daha fazla prim verir.',
    branch: 'active',
    cost: 6,
    requires: ['combo_unlock'],
    effect: 'crisis_reward'
  },
  {
    id: 'guilt_immunity',
    name: 'Vicdan Uyuşturucu',
    icon: '🛡️',
    desc: 'Vicdan azaplarının emdiği pay azalır, susturulduklarında %150 prim verir.',
    branch: 'active',
    cost: 4,
    maxLevel: 3,
    costMult: 2,
    requires: ['crisis_bounty'],
    effect: 'crisis_reward'
  },
  {
    id: 'frenzy_thumb',
    name: 'Çılgın Başparmak',
    icon: '🔥',
    desc: 'SEÇİM: Yüklenme modu — tıklama gücü kalıcı 2×. Kardeş düğüm bir sonraki Şafak\'a kilitlenir.',
    branch: 'active',
    cost: 9,
    requires: ['caffeine_drip'],
    effect: 'click_mult',
    choiceGroup: 'thumb_duality'
  },
  {
    id: 'iron_patience',
    name: 'Demir Sabır',
    icon: '🛡️',
    desc: 'SEÇİM: Soğukkanlı mod — Vicdan Azabı primi kalıcı 2×. Kardeş düğüm bir sonraki Şafak\'a kilitlenir.',
    branch: 'active',
    cost: 9,
    requires: ['caffeine_drip'],
    effect: 'crisis_reward',
    choiceGroup: 'thumb_duality'
  },

  // ---- Hibrit Köprüler (iki daldan da gerektirir) ----
  {
    id: 'synaptic_bridge',
    name: 'Sinaptik Köprü',
    icon: '🌉',
    desc: 'Uyku ile refleks birleşir: koloni üreme hızı 1.5× katlanır.',
    branch: 'hybrid',
    cost: 8,
    requires: ['eye_drops', 'cps_sync'],
    effect: 'breed_rate'
  },
  {
    id: 'neural_symphony',
    name: 'Nöral Senfoni',
    icon: '🎼',
    desc: 'Botlar ve başparmak aynı orkestrada: tıklama gücü kalıcı 3× artar.',
    branch: 'hybrid',
    cost: 12,
    requires: ['neural_chip', 'combo_unlock'],
    effect: 'click_mult'
  },
  {
    id: 'apex_doomscroll',
    name: 'Apex Doomscroll',
    icon: '🌀',
    desc: 'Ağacın zirvesi: dopamin tekilliği — tüm üretim kalıcı 10× katlanır.',
    branch: 'hybrid',
    cost: 20,
    requires: ['prod_echo', 'caffeine_drip'],
    effect: 'production_mult'
  }
]

/** Eski düz dükkân id'leri: iki kayıt (ağaç + dükkân) bu id'lerde senkron tutulur */
export const NEURAL_LEGACY_UPGRADE_IDS: ReadonlySet<string> = new Set([
  'eye_drops',
  'muted_alerts',
  'fast_charger',
  'caffeine_drip',
  'neural_chip',
  'neural_nest',
  'guilt_immunity',
  'break_singularity'
])

/** Combo eşiği: seri sayısı bu değere ulaşınca çarpan devreye girer (UI için dışa açık) */
export const COMBO_THRESHOLDS: ReadonlyArray<{ count: number; mult: number }> = [
  { count: 5, mult: 2 },
  { count: 15, mult: 3 },
  { count: 40, mult: 5 }
]

/** Combo serisinin sönme süresi (ms) */
export const COMBO_DECAY_MS = 1500

/** CPS-to-click senkronu: taban %1, senkron düğümü seviyesi başına +%1, %5 tavan */
export const CPS_SYNC_BASE = 0.01
export const CPS_SYNC_PER_LEVEL = 0.01
export const CPS_SYNC_CAP = 0.05

/**
 * Satın alınan düğüm seviyelerinden sayısal etkileri hesaplar (saf fonksiyon).
 * state-only bağlamlarda (ör. (state) => ... getter'ları) doğrudan çağrılır.
 */
export function computeNeuralEffects(bought: Record<string, number>): NeuralEffects {
  const lvl = (id: string): number => bought[id] || 0
  const has = (id: string): boolean => lvl(id) > 0

  let productionMult = 1
  let clickMult = 1
  let offlineGainBonus = 0
  let crisisRewardMult = 1
  let breedRateMult = 1
  let botFrequencyMult = 1
  let dawnSpeedMult = 1

  if (lvl('prod_echo') > 0) productionMult *= Math.pow(1.25, lvl('prod_echo'))
  if (has('dream_lucid')) productionMult *= 1.75
  if (has('apex_doomscroll')) productionMult *= 10

  if (has('click_momentum')) clickMult *= 1.3
  if (has('neural_symphony')) clickMult *= 3.0
  if (has('frenzy_thumb')) clickMult *= 2

  offlineGainBonus += lvl('offline_dream_weaver') * 0.25
  if (has('dream_ascetic')) offlineGainBonus += 0.5

  if (has('crisis_bounty')) crisisRewardMult *= 1.5
  if (has('iron_patience')) crisisRewardMult *= 2

  if (has('synaptic_bridge')) breedRateMult *= 1.5

  botFrequencyMult *= Math.pow(1.25, lvl('bot_overclock'))

  if (has('dawn_harbinger')) dawnSpeedMult *= 2.0

  return {
    productionMult,
    clickMult,
    offlineGainBonus,
    crisisRewardMult,
    breedRateMult,
    botFrequencyMult,
    dawnSpeedMult,
    cpsSyncLevel: Math.min(4, lvl('cps_sync')),
    comboUnlocked: has('combo_unlock')
  }
}

// ADR-0032: Idle bootstrap kilidini kaldırmak için bot maliyetleri gevşetildi.
// Eski maliyetler (dim1 1e12, shift 1e26) pure-idle oyuncuyu log10=12.41'de
// sonsuza dek kilitliyordu çünkü shift yapmadan 1e26'ya asla ulaşamıyordu.
export const AUTOBUYER_COSTS: Record<string, Decimal> = {
  dim1: new Decimal(1e9),
  dim2: new Decimal(1e12),
  dim3: new Decimal(1e15),
  dim4: new Decimal(1e18),
  dim5: new Decimal(1e22),
  dim6: new Decimal(1e26),
  dim7: new Decimal(1e30),
  dim8: new Decimal(1e35),
  tickspeed: new Decimal(1e11),
  shift: new Decimal(1e10), // Idle oyuncu artık ilk sıçrama botuna erken erişebilir
  galaxy: new Decimal(1e28),
  singularity: new Decimal(1.79e308) // Şafak Nöbeti Botu: tekillik eşiğinin kendisi
}

// 3 katmanlı pacing: maliyet + ilerleme kilidi + yavaş tekli hız
// dim1 tadımlık erken açılır, dim2/tickspeed D3 ister, dim3-4 ilk sıçramayı ister,
// dim5-8 ikinci sıçramayı ister, shift/galaxy botu ancak ilk sıçrama/kümeden sonra açılır.
export const AUTOBUYER_PROGRESS_REQ: Record<string, { shifts?: number; galaxies?: number; needTier?: number; singularities?: number }> = {
  dim1: {},
  dim2: { needTier: 3 },
  dim3: { shifts: 1 },
  dim4: { shifts: 1 },
  dim5: { shifts: 1 },
  dim6: { shifts: 2 },
  dim7: { shifts: 3 },
  dim8: { shifts: 4 },
  tickspeed: { needTier: 3 },
  shift: { shifts: 0 },
  galaxy: { galaxies: 1 },
  singularity: { singularities: 3 }
}

export function getAutobuyerRequirementText(id: string): string {
  const req = AUTOBUYER_PROGRESS_REQ[id]
  if (!req) return ''
  const parts: string[] = []
  if (req.needTier) parts.push(`D${req.needTier} sahibi ol`)
  if (req.shifts) parts.push(`${req.shifts} Sıçrama`)
  if (req.galaxies) parts.push(`${req.galaxies} Küme`)
  if (req.singularities) parts.push(`${req.singularities} kez Çöküş`)
  return parts.length > 0 ? parts.join(' + ') : ''
}

// Hibrit kademe: tekli dopaminle açılır, toplu shift ister, max galaxy ister
export const AUTOBUYER_BULK_COST = new Decimal(1e28)
export const AUTOBUYER_BULK_SHIFT_REQ = 1
export const AUTOBUYER_MAX_COST = new Decimal(1e32)
export const AUTOBUYER_MAX_GALAXY_REQ = 1

// ---- Faz 2 Kilometre Taşı: Kolektif Gece Nöbeti (GDD "İkinci Çöküş") ----
// ADR-0032/0033: eşik 1e4000'den 1e308'e taşındı. Özellik merdivenindeki
// `night_watch` basamağı `decadeGate(308)` kullanıyor; iki değer ayrışırsa
// panel "KİLİTLİ" gösterirken merdiven "açıldı" der. Şafak eşiğinin (1.79e308)
// hemen altında tetiklenir, yani güneş doğmadan önceki son nöbet anıdır.
export const NIGHT_WATCH_THRESHOLD = new Decimal('1e308')

// Kayıt şeması sürümü ve hata tipi çekirdek katmanda yaşar (döngüsel bağımlılık
// olmasın diye). Buradan yeniden dışa aktarıyoruz; mevcut import'lar bozulmasın.
export { SAVE_VERSION, SaveVersionError } from '../core/save-version'

// ---- QoL: Çevrimdışı/arka plan yakalama üst sınırı (24 saat) ----
export const OFFLINE_CAP_SECONDS = 24 * 3600

// ---- Nöral İzleme Kolonisi & Toplu Uyku (Synergism: Ant Colony & Sacrifice) ----
export const COLONY_CORE_COST = new Decimal(1e22)
export const COLONY_MIN_NAP_BOTS = 100
export const COLONY_BREED_RATE = 0.008 // %0.8/s baz üreme hızı (~87 sn'de çiftlenme)
export const COLONY_PASSIVE_LOG_FACTOR = 0.5 // pasif çarpan: 1 + log10(bots) × 0.5

// ---- Performans: pahalı kontrollerin seyreltilmesi ----
export const ACH_CHECK_INTERVAL = 0.5 // başarım kontrolü en sık 0.5 sn'de bir
export const UNLOCK_CHECK_INTERVAL = 0.5 // özellik merdiveni en sık 0.5 sn'de bir

/** Önbellek Temizleme'nin açılış eşiği (ADR-0035): hayat boyu 5. Akış Sıçraması. */
export const SACRIFICE_SHIFT_REQ = 5

const MAX_BUY_PACKS_CAP_FIRST_RUN = 380
const MAX_BUY_PACKS_CAP_PRESTIGE = 2800

function maxBuyPacksCap(singularities: number): number {
  return singularities > 0 ? MAX_BUY_PACKS_CAP_PRESTIGE : MAX_BUY_PACKS_CAP_FIRST_RUN
}

function dimensionCostForBucket(
  tier: number,
  bucket: number,
  baseCost: Decimal,
  fullMult: Decimal
): Decimal {
  if (tier === 1) {
    if (bucket < EARLY_D1_SOFT_BUCKETS) {
      return baseCost.times(Decimal.pow(EARLY_D1_COST_RATIO, bucket))
    }
    return baseCost
      .times(Decimal.pow(EARLY_D1_COST_RATIO, EARLY_D1_SOFT_BUCKETS))
      .times(Decimal.pow(fullMult, bucket - EARLY_D1_SOFT_BUCKETS))
  }
  if (tier === 2) {
    if (bucket < EARLY_D2_SOFT_BUCKETS) {
      return baseCost.times(Decimal.pow(EARLY_D2_COST_RATIO, bucket))
    }
    return baseCost
      .times(Decimal.pow(EARLY_D2_COST_RATIO, EARLY_D2_SOFT_BUCKETS))
      .times(Decimal.pow(fullMult, bucket - EARLY_D2_SOFT_BUCKETS))
  }
  if (tier === 3) {
    if (bucket < EARLY_D3_SOFT_BUCKETS) {
      return baseCost.times(Decimal.pow(EARLY_D3_COST_RATIO, bucket))
    }
    return baseCost
      .times(Decimal.pow(EARLY_D3_COST_RATIO, EARLY_D3_SOFT_BUCKETS))
      .times(Decimal.pow(fullMult, bucket - EARLY_D3_SOFT_BUCKETS))
  }
  if (tier === 4) {
    if (bucket < EARLY_D4_SOFT_BUCKETS) {
      return baseCost.times(Decimal.pow(EARLY_D4_COST_RATIO, bucket))
    }
    return baseCost
      .times(Decimal.pow(EARLY_D4_COST_RATIO, EARLY_D4_SOFT_BUCKETS))
      .times(Decimal.pow(fullMult, bucket - EARLY_D4_SOFT_BUCKETS))
  }
  if (tier === 5) {
    if (bucket < EARLY_D5_SOFT_BUCKETS) {
      return baseCost.times(Decimal.pow(EARLY_D5_COST_RATIO, bucket))
    }
    return baseCost
      .times(Decimal.pow(EARLY_D5_COST_RATIO, EARLY_D5_SOFT_BUCKETS))
      .times(Decimal.pow(fullMult, bucket - EARLY_D5_SOFT_BUCKETS))
  }
  if (tier === 6) {
    if (bucket < EARLY_D6_SOFT_BUCKETS) {
      return baseCost.times(Decimal.pow(EARLY_D6_COST_RATIO, bucket))
    }
    return baseCost
      .times(Decimal.pow(EARLY_D6_COST_RATIO, EARLY_D6_SOFT_BUCKETS))
      .times(Decimal.pow(fullMult, bucket - EARLY_D6_SOFT_BUCKETS))
  }
  return baseCost.times(Decimal.pow(fullMult, bucket))
}

function calcDimensionPackTotal(
  tier: number,
  baseCost: Decimal,
  fullMult: Decimal,
  startBucket: number,
  packs: number
): Decimal {
  if (packs <= 0) return D_0
  let total = D_0
  for (let i = 0; i < packs; i++) {
    total = total.plus(dimensionCostForBucket(tier, startBucket + i, baseCost, fullMult))
  }
  return total
}

function calcMaxDimensionPacks(
  tier: number,
  baseCost: Decimal,
  fullMult: Decimal,
  startBucket: number,
  budget: Decimal,
  cap: number
): number {
  if (budget.lte(0)) return 0
  const first = dimensionCostForBucket(tier, startBucket, baseCost, fullMult)
  if (budget.lt(first)) return 0
  let n = 0
  let spent = D_0
  while (n < cap) {
    const next = dimensionCostForBucket(tier, startBucket + n, baseCost, fullMult)
    if (spent.plus(next).gt(budget)) break
    spent = spent.plus(next)
    n++
  }
  return n
}

// ---- Performans: geometrik seri yardımcıları (buyMax döngüsüz) ----
function calcGeometricTotal(base: Decimal, ratio: Decimal, startBucket: number, packs: number): Decimal {
  if (packs <= 0) return D_0
  const denom = ratio.minus(1)
  if (denom.eq(0)) {
    return base.times(Decimal.pow(ratio, startBucket)).times(packs)
  }
  const ratioPowStart = Decimal.pow(ratio, startBucket)
  const ratioPowPacks = Decimal.pow(ratio, packs)
  return base.times(ratioPowStart).times(ratioPowPacks.minus(1)).div(denom)
}

function calcMaxPacks(
  base: Decimal,
  ratio: Decimal,
  startBucket: number,
  budget: Decimal,
  cap = MAX_BUY_PACKS_CAP_FIRST_RUN
): number {
  if (budget.lte(0)) return 0
  const first = base.times(Decimal.pow(ratio, startBucket))
  if (budget.lt(first)) return 0
  const ratioNum = ratio.toNumber()
  if (!Number.isFinite(ratioNum) || ratioNum <= 1) {
    const linear = budget.div(first).floor().toNumber()
    if (!Number.isFinite(linear)) return 0
    return Math.max(0, Math.min(cap, Math.floor(linear)))
  }
  const budgetLog = budget.log10().toNumber()
  const firstLog = first.log10().toNumber()
  const ratioLog = Math.log10(ratioNum)
  if (!Number.isFinite(budgetLog) || !Number.isFinite(firstLog) || !Number.isFinite(ratioLog) || ratioLog <= 0) return 0
  const rMinus1 = ratioNum - 1
  let est: number
  const diff = budgetLog - firstLog
  if (diff > 15) {
    est = Math.floor((diff + Math.log10(rMinus1)) / ratioLog)
  } else {
    const approx = budget.div(first).toNumber() * rMinus1 + 1
    if (!Number.isFinite(approx) || approx <= 1) return 0
    est = Math.floor(Math.log10(approx) / ratioLog)
  }
  if (!Number.isFinite(est)) return 0
  let n = Math.max(0, Math.min(cap, est))
  for (let guard = 0; guard < 8; guard++) {
    if (n <= 0) break
    if (calcGeometricTotal(base, ratio, startBucket, n).lte(budget)) break
    n--
  }
  for (let guard = 0; guard < 8; guard++) {
    if (n >= cap) break
    if (calcGeometricTotal(base, ratio, startBucket, n + 1).lte(budget)) n++
    else break
  }
  return n
}

// ---- Performans: saf-fonksiyon memo'ları (Vue computed iç fonksiyonları her çağrıda yeniden hesaplar) ----
let _challengeEffKey = ''
let _challengeEffVal: ChallengeRewardEffects | null = null
function memoChallengeEffects(completed: readonly string[]): ChallengeRewardEffects {
  const key = completed.join(',')
  if (_challengeEffVal && _challengeEffKey === key) return _challengeEffVal
  _challengeEffKey = key
  _challengeEffVal = computeChallengeRewardEffects(completed)
  return _challengeEffVal
}

let _neuralEffKey = ''
let _neuralEffVal: NeuralEffects | null = null
function memoNeuralEffects(bought: Record<string, number>): NeuralEffects {
  const keys = Object.keys(bought).sort()
  let key = ''
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    key += k + ':' + (bought[k] || 0) + ';'
  }
  if (_neuralEffVal && _neuralEffKey === key) return _neuralEffVal
  _neuralEffKey = key
  _neuralEffVal = computeNeuralEffects(bought)
  return _neuralEffVal
}

// Boyut çarpanı iç-fonksiyon memo'su (tier başına tek girdi)
const _dimMultCache = new Map<number, { key: string; val: Decimal }>()

// Başarım çarpanı memo'su (ADR-0029). Başarımlar kalıcıdır ve yalnızca eklenir.
let _achMultCache: { len: number; val: Decimal } | null = null

/**
 * Kayıttan gelen başarım id'lerini beyaz listeye karşı süzmek için.
 * calcAchievementMultiplier() yalnızca listenin UZUNLUĞUNA bakar; bozuk bir
 * kayıt bilinmeyen bir id enjekte ederse küresel çarpan sessizce şişerdi.
 */
const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id))

/** achievementMultiplier memo'sunu düşürür — kayıt yüklendiğinde çağrılmalı. */
function resetAchievementCache(): void {
  _achMultCache = null
}

// ADR-0029: kategori -> başarım tanımları indeksi. Modül yükünde bir kez kurulur;
// checkAchievements() içinde ACHIEVEMENTS.filter() çağırmak O(n²) idi (her aday
// için 66 kayıt taranıyordu).
const ACHIEVEMENTS_BY_CATEGORY = new Map<string, typeof ACHIEVEMENTS>()
for (const def of ACHIEVEMENTS) {
  const bucket = ACHIEVEMENTS_BY_CATEGORY.get(def.category)
  if (bucket) bucket.push(def)
  else ACHIEVEMENTS_BY_CATEGORY.set(def.category, [def])
}
function dimMultCacheKey(
  tier: number,
  bought: number,
  shifts: number,
  eyeLvl: number,
  sac: string,
  partnerBought: number,
  neuralProd: number,
  offlineBoost: number,
  activeChallenge: string | null,
  dim1Growth: string,
  completedJoin: string,
  capFloor: number,
  peakShifts: number,
  formatBuffTier: number,
  formatBuffUntil: number,
  challengeTimeMult: number,
  formatBuffActive: boolean
): string {
  // NOT (ADR-0029): formatBuffActive ve challengeTimeMult TÜREV alanlardır. Ham
  // formatBuffUntil zaman damgası tek başına yeterli değildir: süre dolduğunda damga
  // değişmez, anahtar değişmez ve bayat (süresiz) çarpan cache'ten geri döner.
  // Sürüm 12'de bu, geçici "Format Keşfi" bonusunun kalıcılaşmasına yol açıyordu.
  // NOT (ADR-0035): peakShifts kalıcı boyut açılış tavanıdır; `shifts` (koşu sayacı)
  // sıfırlandığında bile cap değişebildiği için ikisi de anahtarda yer almalı.
  return (
    tier + '|' + bought + '|' + shifts + '|' + eyeLvl + '|' + sac + '|' + partnerBought + '|' +
    neuralProd + '|' + offlineBoost + '|' + (activeChallenge || '') + '|' +
    dim1Growth + '|' + completedJoin + '|' + capFloor + '|' + peakShifts + '|' + formatBuffTier +
    '|' + formatBuffUntil + '|' + challengeTimeMult + '|' + (formatBuffActive ? 'A' : 'X')
  )
}

// Boyut maliyeti iç-fonksiyon memo'su (paket başına değil, kova başına)
const _dimCostCache = new Map<number, { key: string; val: Decimal }>()

function getAutobuyerCategory(id: string): 'dim' | 'tickspeed' | 'shift' | 'galaxy' | 'singularity' {
  if (id.startsWith('dim')) return 'dim'
  if (id === 'tickspeed') return 'tickspeed'
  if (id === 'shift') return 'shift'
  if (id === 'singularity') return 'singularity'
  return 'galaxy'
}

export function getAutobuyerInterval(id: string, mode: AutobuyerMode): number {
  const cat = getAutobuyerCategory(id)
  if (cat === 'dim') {
    if (mode === 'bulk') return 1.5
    if (mode === 'max') return 0.5
    return 8.0
  }
  if (cat === 'tickspeed') {
    if (mode === 'bulk') return 2.0
    if (mode === 'max') return 0.5
    return 10.0
  }
  if (cat === 'shift') {
    if (mode === 'bulk') return 4.0
    if (mode === 'max') return 2.0
    return 15.0
  }
  // Şafak Nöbeti Botu: tetik koşulu kazanç/eğim bazlı, interval sadece kontrol periyodu
  if (cat === 'singularity') return 10.0
  if (mode === 'bulk') return 6.0
  if (mode === 'max') return 3.0
  return 20.0
}

export const useGameStore = defineStore('game', {
  state: () => ({
    // Temel Kaynak: DOPAMİN (Dopamine)
    matter: new Decimal(10),

    // 1-8 Reels İstasyonları (Kedi Videolarından Saf Beyin Çürümesine)
    dimensions: Array.from({ length: 8 }, (_, i): DimensionData => ({
      tier: i + 1,
      amount: new Decimal(0),
      bought: 0,
      baseCost: BASE_COSTS[i],
      costMult: COST_MULTS[i]
    })),

    tickspeedBought: 0, // Algoritma Frekansı (Hz) Seviyesi
    dimensionShifts: 0, // Akış Sıçraması (Feed Shift / Boost) Seviyesi
    dimensionCapFloor: BASE_UNLOCKED_DIMENSIONS, // Save v12 legacy min açık tier (ADR-0033: taban 3)
    formatDiscoverSeenCap: 3, // Kutlanmış / tanıtılmış max tier (yeni oyun 3; D4 1. Sıçramada kutlanır)
    formatUnlockBuffTier: 0,
    formatUnlockBuffUntil: 0,
    galaxies: 0, // Sonsuz Akış Kümeleri
    singularityPoints: new Decimal(0), // Uykusuzluk / Şöhret Puanı (SP)
    singularities: 0,
    nightWatchUnlocked: false, // Faz 2 kilometre taşı: 1e308 Dopamin (Kolektif Gece Nöbeti)

    // Gece Duruşu (Trimps Stance)
    currentStance: 'trend' as StanceType,

    // Cookie Clicker: Aktif Buff'lar ve Gece Krizleri
    activeBuffs: [] as ActiveBuff[],
    floatingAnomalies: [] as FloatingAnomaly[],
    anomalyTimer: 0,
    nextAnomalyInterval: 65, // saniye
    mythicPity: 0, // Void Reel garanti sayacı (25 spawn'da 1 zorunlu void)

    // Vicdan Azabı ve Göz Batması (Wrinklers)
    slackers: [] as GuiltWrinkler[],
    slackerTimer: 0,

    // Mini-Oyun 1: Algoritma Stüdyosu (Viral Matris & Trend Reaktörü)
    labCells: Array.from({ length: 9 }, (_, i): LabCell => ({
      id: i,
      seedType: null,
      age: 0,
      matureAge: 0,
      maxAge: 0,
      isMature: false
    })),
    labHype: 0,
    labMode: 'fyp' as LabMode,
    discoveredFormulas: ['cat_audio'] as LabSeedType[],
    isViralActive: false,
    viralTimeRemaining: 0,
    viralViews: 0,

    // Mini-Oyun 2: Gece Yarısı Kriz Yönetimi (Kafein & Enerji Barı)
    caffeineEnergy: 50,
    maxCaffeineEnergy: 100,
    crisisBackfireDebuff: 0, // saniye cinsinden debuff sayacı

    // Otomatik Kaydırma Botları (Autobuyers - Hibrit tekli/toplu/max)
    autobuyers: {
      dim1: { id: 'dim1', name: 'Kedi Videoları Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim2: { id: 'dim2', name: 'Sokak Lezzetleri Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim3: { id: 'dim3', name: 'ASMR Sabun Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim4: { id: 'dim4', name: 'Subway Surfers Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim5: { id: 'dim5', name: 'Sigma Girişimci Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim6: { id: 'dim6', name: 'Hint Dizisi Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim7: { id: 'dim7', name: 'Kriz Belgeseli Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      dim8: { id: 'dim8', name: 'Beyin Çürümesi Botu', enabled: false, unlocked: false, mode: 'single', interval: 8.0, timer: 0 },
      tickspeed: { id: 'tickspeed', name: 'Frekans (Hz) Botu', enabled: false, unlocked: false, mode: 'single', interval: 10.0, timer: 0 },
      shift: { id: 'shift', name: 'Akış Sıçraması Botu', enabled: false, unlocked: false, mode: 'single', interval: 15.0, timer: 0 },
      galaxy: { id: 'galaxy', name: 'Akış Kümeleri Botu', enabled: false, unlocked: false, mode: 'single', interval: 20.0, timer: 0 },
      singularity: { id: 'singularity', name: 'Şafak Nöbeti Botu', enabled: false, unlocked: false, mode: 'single', interval: 10.0, timer: 0, minGainSp: 1 }
    } as Record<string, AutobuyerConfig>,
    autobuyerBulkUnlocked: false,
    autobuyerMaxUnlocked: false,

    // Şafak Nöbeti optimizatörü (marjinal kazanç modeli) — runtime-only, serialize edilmez
    singularityBotSamples: [] as number[], // saniyelik log10(matter) örnekleri (max 60)
    singularityDecelStreak: 0, // eğim düşüşü üst üste kaç saniyedir sürüyor
    singularityRunSeconds: 0, // son resetten beri geçen koşu süresi
    singularitySampleAcc: 0, // saniyelik örnekleme accumulator'ı

    // Kalıcı Uykusuzluk Dükkanı (SP Upgrades Seviyeleri)
    singularityUpgrades: {
      eye_drops: 0,
      muted_alerts: 0,
      fast_charger: 0,
      caffeine_drip: 0,
      neural_chip: 0,
      guilt_immunity: 0
    } as Record<string, number>,

    // Nöral Ağaç: kalıcı SP yetenek ağacı satın alımları (prestijde sıfırlanmaz; hariç seçimler sıfırlanır)
    neuralNodesBought: {} as Record<string, number>,
    // Nöral Ağaç combo serisi: count 1.5 sn hareketsizlikte 0'a düşer
    clickCombo: { count: 0, lastClickAt: 0 },

    // Çevrimdışı simülasyon çarpanı (kayıt edilmez): Nöral Ağaç çevrimdışı kazanç düğümleri
    // yalnızca simulateOfflineProgress içinde 1'den büyük olur; normal tick'lerde davranışı değiştirmez.
    offlineSimBoost: 1,

    // QoL: çevrimdışı/arka plan yakalama raporu (kayıt edilmez) — Welcome Back modalı bunu gösterir
    offlineReport: null as OfflineReport | null,
    // QoL: simülasyon sırasında ses/konfeti spam'ini bastıran bayrak (kayıt edilmez)
    offlineSimActive: false,
    offlineAchTick: 0, // offline simülasyonda başarım kontrolü seyreltme sayacı

    // QoL: saniyelik üretim geçmişi (Rapor sparkline, max 600 örnek; kayıt edilmez)
    dpsHistory: [] as number[],
    dpsSampleAcc: 0,
    // Performans: pahalı taramaların seyreltilmesi (kayıt edilmez)
    achCheckAcc: 0,
    unlockCheckAcc: 0,

    // Telemetri: Son 10 Sabah 06:00 Çöküşünün geçmişi (Antimatter Dimensions Past 10 modeli)
    pastSingularities: [] as PastSingularityRecord[],

    // ADR-0032: Hayat boyu ulaşılan dekad basamakları (bir kez talep edilir)
    // ADR-0034: Bu basamaklar artık SP vermez; koşu içi "Dekad Yükselişi" çarpanı verir.
    claimedBounties: [] as number[],
    // ADR-0034: Koşu içi yükselişi çarpanı (1 = yükseliş yok). SP değildir, kalıcı değildir:
    // şafak çöküşünde ve meydan okuma girişinde resetRunState() ile 1'e döner.
    // claimedBounties'tan türetilemez (o liste hayat boyu, bu koşuya özeldir) — bu yüzden kaydedilir.
    decadeSurgeMult: 1,

    // Önbelleği Temizleme (Dimension Sacrifice)
    sacrificeCount: 0,
    sacrificeMultiplier: new Decimal(1),

    // — Gece Krizi (Challenge) koşu durumu —
    activeChallenge: null as string | null,
    completedChallenges: [] as string[],
    challengeBestTimes: {} as Record<string, number>,
    challengeElapsed: 0, // aktif koşunun duvar-saati süresi (sn)
    challengeHaltUntil: 0, // C2: tam durma sayacı (sn; alımda productionHaltOnBuySec'e kurulur)
    challengeSinceBuy: 9999, // C2: son alımdan beri geçen süre (sn; 60 sn lineer rampa buradan okunur)
    challengeCostInflation: 0, // C5: koşu-içi birikimli maliyet şişme sayacı (Faz 3'te işler)
    challengeNotificationDoom: 0, // C8: bildirim sayacı 0-1+ (Faz 3'te işler)
    challengeDim1Growth: new Decimal(1), // C3: D1 üstel büyüme çarpanı (Faz 3'te işler)

    // Nöral İzleme Kolonisi (Otonom İzleme Botları & Toplu Uyku)
    neuralBots: new Decimal(0),
    napCount: 0,
    napMultiplier: new Decimal(1),

    // Başarımlar (Prestij dahil kalıcı — reset action'ları bu alana dokunmaz)
    achievements: [] as string[],
    achievementsSeenCount: 0,
    achievementToastQueue: [] as string[],

    // Özellik Merdiveni (v0.11.0) — yapışkan (sticky) kilitleme listesi
    unlockedFeatures: [] as string[],

    // ADR-0035 — "Açılış bir olaydır, kapı değil": hayat boyu yüksek su seviyeleri.
    // `matter` Sıçrama/Küme/şafak ile sıfırlandığı için dopamin kapıları koşu içi
    // sayaca bakamaz; bu iki tepe nokta hiç inmez ve kayıtta saklanır (v15).
    // Tek yazım yolu: syncUnlocks() (update döngüsü + tüm reset giriş noktaları).
    lifetimePeakMatter: new Decimal(10), // oyun 10 dopaminle başlar
    lifetimePeakShifts: 0,

    lastUpdate: Date.now(),
    isSingularityReady: false,

    settings: {
      notation: 'standard' as const,
      decimalPlaces: 2,
      soundEnabled: true,
      soundVolume: 0.3,
      theme: 'cyberpunk' as const,
      musicEnabled: true,
      musicVolume: 0.35,
      musicTrack: 'lofi_chill' as MusicTrackId,
      vinylCrackle: true,
      rainEnabled: true,
      rainLevel: 0.5,
      musicIntensity: 0.5,
      sleepTimerMinutes: 0,
      customAudioUrl: '',
      confirmDialogs: true,
      reduceAnimations: false,
      crtEffect: true,
      juiceMode: 'balanced' as const,
      screenOverlayEffects: true,
      holoCardsEnabled: true,
      swirlShaderQuality: 'balanced' as const,
      sequentialStrike: true,
      batterySaver: false,
      floatingTexts: true,
      newsTickerEnabled: true,
      offlineProgressModal: true,
      hotkeysEnabled: true,
      activeSlot: 1
    } as GameSettings,

    stats: {
      manualClicks: 0, // Kaydırma Sayısı
      totalMatterProduced: new Decimal(10), // Toplam Dopamin
      highestMatter: new Decimal(10),
      totalPlaytime: 0,
      singularityCount: 0,
      fastestSingularity: Infinity,
      highestDps: new Decimal(0),
      totalManualDopamine: new Decimal(0),
      anomaliesClicked: 0,
      mythicsClicked: 0,
      combosTriggered: 0,
      slackersFired: 0,
      labHarvests: 0,
      spellsCast: 0,
      seedsPlanted: 0,
      challengesCompleted: 0
    } as PlayerStats
  }),

  getters: {
    // Dopamin Alias'ı
    dopamine(state): Decimal {
      return state.matter
    },

    // Kaç adet istasyonun açık olduğu (ADR-0025: başta 2, her sıçrama +1, legacy floor korunur)
    // C7 (Hesap Kısıtlaması): registry'deki maxDimensions üst sınırı uygulanır.
    unlockedDimensionsCount(state): number {
      return resolvedUnlockedDimensionCount(state)
    },

    formatUnlockBuffActive(state): boolean {
      return state.formatUnlockBuffUntil > Date.now() && state.formatUnlockBuffTier > 0
    },

    formatUnlockBuffSecondsRemaining(state): number {
      if (state.formatUnlockBuffUntil <= Date.now() || state.formatUnlockBuffTier <= 0) return 0
      return Math.max(0, Math.ceil((state.formatUnlockBuffUntil - Date.now()) / 1000))
    },

    /** En yüksek açık tier'dan gelen D→D-1 besleme hızı (UI ipucu). */
    primaryFeedTier(state): number {
      const unlocked = resolvedUnlockedDimensionCount(state)
      const speed = this.tickspeedMultiplier
      const achMult = this.achievementMultiplier
      let bestTier = 0
      let bestFeed = 0
      for (let t = 2; t <= unlocked; t++) {
        const dim = state.dimensions[t - 1]
        if (!dim || dim.amount.lte(0)) continue
        const feed = dim.amount
          .times(this.getDimensionMultiplier(t))
          .times(speed)
          .times(achMult)
          .times(DIMENSION_CHAIN_RATE)
          .toNumber()
        if (feed > bestFeed) {
          bestFeed = feed
          bestTier = t
        }
      }
      return bestTier
    },

    // Algoritma Frekansı (Tickspeed) indirim oranı (Hızlı Şarj Adaptörü ile güçlenir)
    // C6 (Göz Kuruluğu): taban %40, alım ölçeği yarıya iner (registry üzerinden).
    // C2 ödülü (Şarj Aleti Temassızlığı): frekans etkisi +%15 (kalıcı).
    tickspeedMultiplier(state): Decimal {
      const chargerBonus = (state.singularityUpgrades?.fast_charger || 0) * 0.02
      const baseReduction = Math.max(0.7, 0.89 - chargerBonus)
      // Denge: Taban 0.08 yerine 0.35 ile sınırlandırılır (azami ~2.85x/alım); 12.5x kaçak patlamasını önler
      const galaxyBonus = Math.max(0.35, baseReduction - state.galaxies * 0.008)
      const activeMods = state.activeChallenge ? getChallengeById(state.activeChallenge)?.modifiers : undefined
      const buyScale = activeMods?.tickspeedBuyMultScale ?? 1
      const baseMult = activeMods?.tickspeedBaseMult ?? 1
      let mult = Decimal.pow(1 / galaxyBonus, state.tickspeedBought * buyScale).times(baseMult)
      const espresso = state.activeBuffs.find((b) => b.type === 'espresso')
      if (espresso) {
        mult = mult.times(espresso.multiplier)
      }
      const challengeEff = memoChallengeEffects(state.completedChallenges)
      if (challengeEff.tickspeedEffectMult !== 1) {
        mult = mult.times(challengeEff.tickspeedEffectMult)
      }
      return mult
    },

    // Algoritma Frekansı Satın Alma Maliyeti (Düşük Parlaklık modunda %15 indirimli)
    // C5 koşu-içi şişmesi buraya da işler; C5 (-%10) ve C6 (-%15) ödülleri kalıcı indirimdir.
    tickspeedCost(state): Decimal {
      let cost = new Decimal(1000).times(Decimal.pow(16, state.tickspeedBought))
      cost = cost.times(challengeCostInflationMult(state))
      if (state.currentStance === 'private_mode') {
        cost = cost.times(0.85).floor()
      }
      if (hasAchievementReward(state.achievements, 'tickspeed_discount')) {
        cost = cost.times(0.95).floor()
      }
      const challengeEff = memoChallengeEffects(state.completedChallenges)
      if (challengeEff.tickspeedCostMult !== 1) {
        cost = cost.times(challengeEff.tickspeedCostMult).floor()
      }
      return cost
    },

    // Algoritmik Ayna Sinerjisi (D1 <-> D8, D2 <-> D7, D3 <-> D6, D4 <-> D5)
    getDimensionSynergyMultiplier: (state) => (tier: number): Decimal => {
      const partnerTier = 9 - tier
      const partnerDim = state.dimensions[partnerTier - 1]
      if (!partnerDim || partnerDim.bought <= 0) return D_1
      const mult = 1 + Math.sqrt(partnerDim.bought) * 0.15
      return new Decimal(mult)
    },

    // Formatın partner bilgisi ve sağladığı yakıt çarpanı
    getPartnerInfo: (state) => (tier: number): { partnerTier: number; label: string; partnerBought: number; mult: number } => {
      const partnerTier = 9 - tier
      const partnerDim = state.dimensions[partnerTier - 1]
      const bought = partnerDim ? partnerDim.bought : 0
      const mult = 1 + Math.sqrt(bought) * 0.15
      return {
        partnerTier,
        label: MIRROR_PAIRS[tier]?.label || `D${partnerTier}`,
        partnerBought: bought,
        mult
      }
    },

    // Boyutun ulaştığı en yüksek çözünürlük seviyesi ve sonraki hedef
    getDimensionMilestone: (state) => (tier: number): {
      current: ResolutionMilestone | null
      next: ResolutionMilestone | null
      progress: number
    } => {
      const dim = state.dimensions[tier - 1]
      if (!dim) return { current: null, next: RESOLUTION_MILESTONES[0], progress: 0 }

      let current: ResolutionMilestone | null = null
      let next: ResolutionMilestone | null = null

      for (let i = 0; i < RESOLUTION_MILESTONES.length; i++) {
        const m = RESOLUTION_MILESTONES[i]
        if (dim.bought >= m.count) {
          current = m
        } else {
          next = m
          break
        }
      }

      let progress = 100
      if (next) {
        const prevCount = current ? current.count : 0
        const needed = next.count - prevCount
        const currentCount = dim.bought - prevCount
        progress = Math.min(100, Math.max(0, (currentCount / needed) * 100))
      }

      return { current, next, progress }
    },

    // Boyutun ulaştığı en yüksek çözünürlük milestone çarpanı.
    getDimensionMilestoneMultiplier: (state) => (tier: number): Decimal => {
      const dim = state.dimensions[tier - 1]
      if (!dim || dim.bought < 25) return D_1

      let mult = D_1
      for (const m of RESOLUTION_MILESTONES) {
        if (dim.bought >= m.count) {
          mult = new Decimal(m.mult)
        } else {
          break
        }
      }
      return mult
    },

    // Önbellek temizleme açık mı ve değer kazancı yeterli mi? (ADR-0035: açılış
    // kalıcı; koşu içi `dimensionShifts` yerine `lifetimePeakShifts`)
    canSacrifice(state): boolean {
      if (!this.sacrificeUnlocked) return false
      const dim1 = state.dimensions[0]
      if (!dim1 || dim1.amount.lt(10)) return false
      return this.currentSacrificeReward.gt(state.sacrificeMultiplier.times(1.15))
    },

    // Temizleme yapılırsa kazanılacak yeni D8 çarpanı: (1 + log10(D1)/4)^2.5
    currentSacrificeReward(state): Decimal {
      const dim1 = state.dimensions[0]
      if (!dim1 || dim1.amount.lt(10)) return D_1
      const logD1 = dim1.amount.log10().toNumber()
      if (logD1 <= 0) return D_1
      const base = 1 + logD1 / 4
      return Decimal.pow(base, 2.5)
    },

    // Akış Sıçraması (Shift / Boost) Gücü ve Çarpanı (C7 ve 'shift_power_boost' başarımı güçlendirir)
    singleShiftPower(state): number {
      const eff = memoChallengeEffects(state.completedChallenges)
      const achBase = hasAchievementReward(state.achievements, 'shift_power_boost') ? 1.9 : 1.66
      return Math.max(eff.shiftPower, achBase)
    },

    shiftPowerMultiplier(state): Decimal {
      return Decimal.pow(this.singleShiftPower, state.dimensionShifts)
    },

    // C7 (Hesap Kısıtlaması): kilitli tier yerine D6 istenir; ADR-0025 erken tier hedefi
    shiftRequirement(state): { tier: number; amount: Decimal } {
      const cap = challengeDimensionCap(state)
      const unlocked = resolvedUnlockedDimensionCount(state)
      const shiftMult = tierShiftReqMult(state.dimensions, unlocked)
      if (state.dimensionShifts < 6) {
        let tier = Math.min(8, BASE_UNLOCKED_DIMENSIONS + state.dimensionShifts)
        if (state.dimensionCapFloor > tier) {
          tier = Math.min(unlocked, state.dimensionCapFloor)
        }
        tier = Math.min(tier, unlocked)
        // Erken sıçramalarda yeni açılan boyuttan tek paket (10 adet) yeterlidir; akışı pürüzsüzleştirir
        const baseReq = state.dimensionShifts <= 1 ? 10 : (state.dimensionShifts <= 2 ? 15 : 25)
        let amount = new Decimal(baseReq).times(shiftMult).floor()
        if (amount.lt(1)) amount = D_1
        if (cap === undefined || tier <= cap) {
          return { tier, amount }
        }
        let capAmount = new Decimal(25 + CHALLENGE_C7_TIER_COST_STEP * (tier - cap)).times(shiftMult).floor()
        if (capAmount.lt(1)) capAmount = D_1
        return {
          tier: cap,
          amount: capAmount
        }
      }
      if (cap === undefined || 8 <= cap) {
        let amount = new Decimal(22 + 16 * (state.dimensionShifts - 6)).times(shiftMult).floor()
        if (amount.lt(1)) amount = D_1
        return {
          tier: 8,
          amount
        }
      }
      let capAmount = new Decimal(30 + 15 * (state.dimensionShifts - 3)).times(shiftMult).floor()
      if (capAmount.lt(1)) capAmount = D_1
      return {
        tier: cap,
        amount: capAmount
      }
    },

    canShift(): boolean {
      const req = this.shiftRequirement
      const dim = this.dimensions[req.tier - 1]
      return dim ? dim.amount.gte(req.amount) : false
    },

    // Sonsuz Akış Kümesi Gereksinimi (8. İstasyon miktarı, C7'de D6)
    // 60 galaksiden sonra Distant Galaxies kuadratik freni devreye girer.
    galaxyRequirement(state): number {
      let base = 40 + state.galaxies * 20
      if (state.galaxies > 60) {
        const over = state.galaxies - 60
        base += Math.floor(over * over * 2.5)
      }
      return challengeDimensionCap(state) === undefined ? base : Math.floor(base * CHALLENGE_C7_GALAXY_COST_MULT)
    },

    galaxyRequirementTier(state): number {
      const cap = challengeDimensionCap(state)
      return cap !== undefined ? Math.min(8, cap) : 8
    },

    canBuyGalaxy(state): boolean {
      const tier = this.galaxyRequirementTier
      const dim = state.dimensions[tier - 1]
      return dim ? dim.amount.gte(this.galaxyRequirement) : false
    },

    // Sabah 06:00 Çöküşü Hazır mı? (1.79e308 Dopamin)
    canSingularity(state): boolean {
      return state.matter.gte(D_INFINITY)
    },

    // Aktif Gece Krizi hedefi tamamlandı mı? (Her krizin kendi goalMatter eşiği kontrol edilir)
    challengeGoalReached(state): boolean {
      if (!state.activeChallenge) return false
      const def = getChallengeById(state.activeChallenge)
      if (!def) return false
      return state.matter.gte(new Decimal(def.goalMatter))
    },

    // Tekillik bekleme modu: Break Singularity alınmadıysa e308 üstünde
    // Shift/Galaxy botları ateşlenmez (tekillik penceresi korunur).
    singularityHoldActive(state): boolean {
      return state.matter.gte(D_INFINITY) && (state.singularityUpgrades?.break_singularity || 0) < 1
    },

    // QoL: harcanabilir SP ile alınabilir Nöral Ağaç düğümü var mı? (Şafak sekmesi bildirim noktası)
    hasAffordableNeuralNode(state): boolean {
      if (state.singularityPoints.lte(0)) return false
      const bought = state.neuralNodesBought || {}
      return NEURAL_TREE.some((node) => {
        const maxLevel = node.maxLevel ?? 1
        const legacyLvl = NEURAL_LEGACY_UPGRADE_IDS.has(node.id) ? state.singularityUpgrades?.[node.id] || 0 : 0
        const currentLvl = Math.max(bought[node.id] || 0, legacyLvl)
        if (currentLvl >= maxLevel) return false
        for (const reqId of node.requires) {
          if ((bought[reqId] || 0) < 1) return false
        }
        if (node.choiceGroup) {
          const siblingLocked = NEURAL_TREE.some(
            (n) => n.choiceGroup === node.choiceGroup && n.id !== node.id && (bought[n.id] || 0) > 0
          )
          if (siblingLocked) return false
        }
        const cost = Math.floor(node.cost * Math.pow(node.costMult ?? 1, currentLvl) * this.achievementSpDiscount)
        return state.singularityPoints.gte(cost)
      })
    },

    // QoL: şartı sağlanmış ve dopaminle alınabilir kilitli bot var mı? (Botlar sekmesi bildirim noktası)
    hasAffordableLockedBot(state): boolean {
      return Object.values(state.autobuyers).some((bot) => {
        if (bot.unlocked) return false
        if (!this.isAutobuyerRequirementMet(bot.id)) return false
        const cost = AUTOBUYER_COSTS[bot.id] || new Decimal(1e6)
        return state.matter.gte(cost)
      })
    },

    // QoL: üretimi oluşturan global çarpan kaynakları (Rapor sekmesi kırılım paneli)
    multiplierBreakdown(state): Array<{ name: string; value: number; desc: string }> {
      const rows: Array<{ name: string; value: number; desc: string }> = []
      const push = (name: string, value: Decimal | number, desc: string) => {
        const v = typeof value === 'number' ? value : value.toNumber()
        if (Math.abs(v - 1) > 0.0001) rows.push({ name, value: v, desc })
      }

      push('Başarımlar', this.achievementMultiplier, 'Plaket ödülü global kalıcı çarpan')
      push('Nöral Koloni', this.colonyMultiplier, 'Nöral bot sayısından gelen logaritmik çarpan')
      push('Toplu Uyku', state.napMultiplier, 'Power Nap fedakarlıklarının kalıcı kök çarpanı')
      push('Gece Duruşu', this.stanceMultipliers.production, 'Aktif duruşun pasif üretim etkisi')
      push('Aktif Buff', this.productionBuffMultiplier, 'Gece Krizi / Espresso / Viral Zirve çarpanı')
      push('Lab Rezonansı', this.labPassiveMultiplier, 'Algoritma Stüdyosu olgun hücre pasif bonusu')
      const unlocked = resolvedUnlockedDimensionCount(state)
      if (state.formatUnlockBuffUntil > Date.now() && state.formatUnlockBuffTier > 0) {
        push(
          `Format Keşfi (D${state.formatUnlockBuffTier})`,
          FORMAT_UNLOCK_BUFF_MULT,
          `${FORMAT_UNLOCK_BUFF_SECONDS}s ×1.25 yalnız o tier üretimi`
        )
      }
      const tierProd = tierProductionMult(2, state.dimensions[1]?.bought ?? 0, unlocked >= 2)
      if (Math.abs(tierProd - 1) > 0.0001) {
        push('Format D2 Pasifi', tierProd, getTierIdentity(2)?.passive.desc ?? '')
      }
      push('Önbellek Silme (D8)', state.sacrificeMultiplier.gt(1) ? state.sacrificeMultiplier : 1, 'Sacrifice çarpanı yalnızca D8 üretimine uygulanır')
      return rows
    },

    // Telemetri: Aktif koşuda geçen süre
    currentRunSeconds(state): number {
      return state.singularityRunSeconds
    },

    // Telemetri: Aktif vs Pasif Üretim Oranı
    activeVsPassiveRatio(state): { manualPct: number; passivePct: number } {
      const manual = state.stats.totalManualDopamine || D_0
      const total = state.stats.totalMatterProduced || D_0
      if (total.lte(0) || manual.lte(0)) {
        return { manualPct: 0, passivePct: 100 }
      }
      const ratio = manual.div(total).toNumber()
      const manualPct = Math.min(100, Math.max(0, Math.round(ratio * 100)))
      return {
        manualPct,
        passivePct: 100 - manualPct
      }
    },

    // Telemetri: Manuel Kaydırma Gücü (Click Power) Kırılımı
    clickPowerBreakdown(state): Array<{ name: string; value: string; desc: string }> {
      const rows: Array<{ name: string; value: string; desc: string }> = []
      let totalBought = 0
      state.dimensions.forEach((d) => {
        totalBought += d.bought
      })
      rows.push({
        name: 'İstasyon Satın Alımları',
        value: `+${(totalBought * 0.25).toFixed(2)} Taban`,
        desc: 'Satın alınan her istasyon taban dokunuş gücüne +0.25 ekler'
      })
      if (this.shiftPowerMultiplier.gt(1)) {
        rows.push({
          name: 'Akış Sıçraması',
          value: `×${this.shiftPowerMultiplier.toNumber().toFixed(2)}`,
          desc: 'Akış sıçramalarının sağladığı çarpan'
        })
      }
      if (this.stanceMultipliers.click !== 1) {
        rows.push({
          name: 'Gece Duruşu',
          value: `×${this.stanceMultipliers.click.toFixed(1)}`,
          desc: 'Aktif duruşun tıklama çarpanı (Çılgın Kaydırma: 4×)'
        })
      }
      if (this.comboMultiplier > 1) {
        rows.push({
          name: 'Hızlı Kaydırma Komboları',
          value: `×${this.comboMultiplier.toFixed(2)}`,
          desc: '1.5 sn içinde kesintisiz kaydırmalar seriyi güçlendirir'
        })
      }
      if (this.clickBuffMultiplier.gt(1)) {
        rows.push({
          name: 'Aktif Kriz Güçlendirici',
          value: `×${this.clickBuffMultiplier.toNumber().toFixed(1)}`,
          desc: 'Başparmak Histerisi veya Espresso anomali güçlendiricisi'
        })
      }
      if (this.neuralEffects.cpsSyncLevel > 0) {
        rows.push({
          name: 'Nöral CPS Senkronu',
          value: `+%${(this.neuralEffects.cpsSyncLevel * 2).toFixed(0)} CPS`,
          desc: 'Saniyelik akışın bir kısmını doğrudan her tıklamaya aktarır'
        })
      }
      if (this.neuralEffects.clickMult > 1) {
        rows.push({
          name: 'Nöral Ağaç',
          value: `×${this.neuralEffects.clickMult.toFixed(2)}`,
          desc: 'Yetenek ağacı tıklama düğümleri çarpanı'
        })
      }
      return rows
    },

    // Telemetri: Algoritma Frekansı (Hz & Tickspeed) Kırılımı
    tickspeedBreakdown(state): Array<{ name: string; value: string; desc: string }> {
      const rows: Array<{ name: string; value: string; desc: string }> = []
      rows.push({
        name: 'Satın Alınan Frekans Kademeleri',
        value: `${state.tickspeedBought} Adet`,
        desc: 'Satın alınan her kademe algoritma frekansını hızlandırır'
      })
      if (state.galaxies > 0) {
        rows.push({
          name: 'Sonsuz Akış Kümeleri',
          value: `${state.galaxies} Küme (-%${state.galaxies * 2} İndirim)`,
          desc: 'Kümeler frekans başına taban aralık maliyetini kalıcı olarak düşürür'
        })
      }
      const chargerLvl = state.singularityUpgrades?.fast_charger || 0
      if (chargerLvl > 0) {
        rows.push({
          name: 'GaN Şarj Adaptörü',
          value: `-%${chargerLvl * 2}`,
          desc: 'Uykusuzluk dükkanından gelen kademe başına frekans hızlandırması'
        })
      }
      const espresso = state.activeBuffs.find((b) => b.type === 'espresso')
      if (espresso) {
        rows.push({
          name: 'Espresso Shot',
          value: `×${espresso.multiplier.toFixed(1)}`,
          desc: 'Gece kriz kararı anlık frekans patlaması'
        })
      }
      return rows
    },

    // Telemetri: Son 10 Koşunun Ortalamaları (Antimatter Dimensions Past 10 Averages)
    pastSingularitiesAverage(state): { avgDuration: number; avgSpPerMinute: Decimal } {
      if (state.pastSingularities.length === 0) {
        return { avgDuration: 0, avgSpPerMinute: D_0 }
      }
      const totalDuration = state.pastSingularities.reduce((acc, r) => acc + r.duration, 0)
      const avgDuration = totalDuration / state.pastSingularities.length
      let totalSpMin = D_0
      state.pastSingularities.forEach((r) => {
        totalSpMin = totalSpMin.plus(r.spPerMinute)
      })
      const avgSpPerMinute = totalSpMin.div(state.pastSingularities.length)
      return { avgDuration, avgSpPerMinute }
    },

    // Telemetri: Doomscroll Gece Teşhisi ve Biyometrisi (Hiciv & Eğlenceli İstatistikler)
    biometrics(state) {
      const clicks = state.stats.manualClicks || 0
      const meters = clicks * 0.05
      const km = meters / 1000
      const playtime = state.stats.totalPlaytime || 0
      const lostHours = playtime / 3600
      const mentalBattery = Math.max(5, Math.min(100, Math.round(100 - (lostHours * 9.5))))
      const bluePhotons = new Decimal(playtime).times(1.25e15)

      let milestoneHint = 'Henüz başındasın — parmak yeni ısınıyor.'
      if (meters >= 8848) {
        milestoneHint = 'Everest Dağı Zirvesi (8,848 m) aşıldı! Atmosfer tükendi ama Reels bitmedi.'
      } else if (meters >= 3776) {
        milestoneHint = 'Fuji Dağı (3,776 m) seviyesi! Başparmağın maraton koşucusu oldu.'
      } else if (meters >= 828) {
        milestoneHint = 'Burç Halife (828 m) tırmanıldı! Dünyanın en yüksek binasını kaydırdın.'
      } else if (meters >= 330) {
        milestoneHint = 'Eyfel Kulesi (330 m) aşıldı! Paris bile bu kadar yukarı kaymadı.'
      } else if (meters >= 67) {
        milestoneHint = 'Galata Kulesi (67 m) aşıldı! İstanbul gecesinde ilk tepe noktası.'
      } else if (meters >= 10) {
        milestoneHint = '3 katlı apartman boyu yukarı kaydırıldı.'
      }

      let rank = 'Masum Kaydırıcı'
      let rankColor = 'text-emerald-400'
      const singularities = state.singularities || 0
      if (singularities >= 50 || clicks >= 50000) {
        rank = 'Dopamin Tekilliği (Gözü Kanlı)'
        rankColor = 'text-rose-400 font-extrabold animate-pulse'
      } else if (singularities >= 15 || clicks >= 20000) {
        rank = 'Nöral Algoritma Zombisi'
        rankColor = 'text-purple-400 font-bold'
      } else if (singularities >= 5 || clicks >= 7500) {
        rank = 'Kuş Sesleri Mağduru'
        rankColor = 'text-amber-400 font-bold'
      } else if (singularities >= 1 || clicks >= 2500) {
        rank = 'Gece 3 Müptelası'
        rankColor = 'text-cyan-400'
      } else if (clicks >= 500) {
        rank = 'Yorgan Altı Hayaleti'
        rankColor = 'text-blue-400'
      }

      return {
        thumbDistanceMeters: meters,
        thumbDistanceKm: km,
        lostSleepHours: lostHours,
        mentalBatteryPct: mentalBattery,
        blueLightPhotons: bluePhotons,
        zombieRank: rank,
        zombieRankColor: rankColor,
        milestoneHint
      }
    },

    singularityGain(state): Decimal {
      if (state.activeChallenge) return D_0
      if (state.matter.lt(D_INFINITY)) return D_0
      const logMatter = state.matter.log10().toNumber()
      const dawnSpeedMult = memoNeuralEffects(state.neuralNodesBought || {}).dawnSpeedMult
      const spMult = memoChallengeEffects(state.completedChallenges).spMult
      const totalMult = dawnSpeedMult * spMult
      // Denge: İlk çöküşün taban ödülü 3 SP garanti edilir (oyuncu kök + 2 başlangıç yükseltmesiyle 2. koşuya güçlü başlar).
      // Üstü her +45 dekadda x10 ölçeklenir.
      const rawGain = Decimal.pow(10, Math.max(0, (logMatter - 308) / 45)).times(3).times(totalMult)
      const floored = Decimal.floor(rawGain)
      return floored.gte(3) ? floored : new Decimal(3)
    },

    // İstasyon Çarpanı Hesabı (Göz Damlası, Milestone, Sacrifice ve Bass Boost ile güçlenir)
    getDimensionMultiplier: (state) => (tier: number): Decimal => {
      const dim = state.dimensions[tier - 1]
      if (!dim) return D_1

      const eyeDropsLvl = state.singularityUpgrades?.eye_drops || 0
      const partnerDim = state.dimensions[9 - tier - 1]
      const partnerBought = partnerDim ? partnerDim.bought : 0
      const neuralProd = memoNeuralEffects(state.neuralNodesBought || {}).productionMult
      const completedJoin = state.completedChallenges.join(',')
      const sacStr = tier === 8 ? state.sacrificeMultiplier.toString() : '1'
      const dim1GrowthStr = tier === 1 ? state.challengeDim1Growth.toString() : '1'
      const unlocked = resolvedUnlockedDimensionCount(state)
      // Türev bağımlılıklar: ikisi de aşağıda çarpana olarak giriyor, dolayısıyla
      // cache anahtarına da girmeli (yoksa süresi dolan bonus bayat kalır).
      const formatBuffActive = state.formatUnlockBuffUntil > Date.now() && state.formatUnlockBuffTier > 0
      const challengeTimeMult = state.activeChallenge ? challengeTimeTierMult(state.challengeBestTimes) : 1
      const cacheKey = dimMultCacheKey(
        tier, dim.bought, state.dimensionShifts, eyeDropsLvl, sacStr,
        partnerBought, neuralProd, 1,
        state.activeChallenge, dim1GrowthStr, completedJoin,
        state.dimensionCapFloor, state.lifetimePeakShifts, state.formatUnlockBuffTier,
        state.formatUnlockBuffUntil, challengeTimeMult, formatBuffActive
      )
      const cached = _dimMultCache.get(tier)
      if (cached && cached.key === cacheKey) return cached.val

      // Satın alınan her 10 adet için DIM_PER_TEN_MULT katı
      let mult = Decimal.pow(DIM_PER_TEN_MULT, Math.floor(dim.bought / 10))

      // Video Çözünürlük Kademesi (Resolution Milestones: 360p, 720p, 1080p, 4K...)
      let resolutionMult = D_1
      for (const m of RESOLUTION_MILESTONES) {
        if (dim.bought >= m.count) {
          resolutionMult = new Decimal(m.mult)
        } else {
          break
        }
      }
      mult = mult.times(resolutionMult)

      // Akış Sıçraması (Shift/Boost) bonusu (C7 ve başarım güçlendirir)
      if (state.dimensionShifts > 0) {
        const eff = memoChallengeEffects(state.completedChallenges)
        const achBase = hasAchievementReward(state.achievements, 'shift_power_boost') ? 1.9 : 1.66
        const shiftBase = Math.max(eff.shiftPower, achBase)
        mult = mult.times(Decimal.pow(shiftBase, state.dimensionShifts))
      }

      // Göz Damlası Yükseltmesi
      if (eyeDropsLvl > 0) {
        mult = mult.times(Decimal.pow(2, eyeDropsLvl))
      }

      // Önbellek Temizleme (Sacrifice) Bonusu: Sadece D8 Saf Beyin Çürümesine devasa çarpan!
      if (tier === 8 && state.sacrificeMultiplier.gt(1)) {
        mult = mult.times(state.sacrificeMultiplier)
      }

      // Algoritmik Ayna Sinerjisi (D1 <-> D8, D2 <-> D7, D3 <-> D6, D4 <-> D5 yakıt pompası)
      if (partnerDim && partnerBought > 0) {
        mult = mult.times(1 + Math.sqrt(partnerBought) * 0.15)
      }

      // Nöral Ağaç pasif dalı: kalıcı üretim çarpanı (tüm istasyonlar)
      mult = mult.times(neuralProd)
      // NOT: offlineSimBoost burada her boyuta çarparak 1800x katlanmaması için
      // doğrudan update() içindeki son dopamin adımında tekil olarak uygulanır.

      // — Gece Krizi kuralları + kalıcı ödülleri (id hardcode yok; registry üzerinden) —
      const activeChallengeMods = state.activeChallenge
        ? getChallengeById(state.activeChallenge)?.modifiers
        : undefined
      // C4 (Sansür Matrisi): çift boyutlar susar.
      if (activeChallengeMods?.oddTiersOnly && tier % 2 === 0) {
        return D_0
      }
      const challengeEff = memoChallengeEffects(state.completedChallenges)
      // C1 ödülü (Uçak Modu): tüm boyutlar ×1.5
      if (challengeEff.dimMult !== 1) {
        mult = mult.times(challengeEff.dimMult)
      }
      // C4 ödülü (Sansür Matrisi): çift boyutlar ×2
      if (tier % 2 === 0 && challengeEff.evenDimMult !== 1) {
        mult = mult.times(challengeEff.evenDimMult)
      }
      // C3 (Önbellekteki Videolar): D1 %1 taban, koşu-içi üstel sayaçla büyür.
      if (tier === 1 && activeChallengeMods?.dim1BasePowerMult !== undefined) {
        mult = mult.times(activeChallengeMods.dim1BasePowerMult).times(state.challengeDim1Growth)
      }
      // 8/8 rozeti (Zombi Bakışı): tüm boyutlar +%25
      if (isAllChallengesComplete(state.completedChallenges)) {
        mult = mult.times(ALL_CHALLENGES_COMPLETE_MULT)
      }
      // Kademeli süre-metas: YALNIZCA challenge koşularında üretim bonusu (replay döngüsü)
      // (challengeTimeMult yukarıda hesaplandı ve cache anahtarına girdi — tekrar hesaplama)
      if (challengeTimeMult !== 1) {
        mult = mult.times(challengeTimeMult)
      }

      const tierProd = tierProductionMult(tier, dim.bought, tier <= unlocked)
      if (tierProd !== 1) {
        mult = mult.times(tierProd)
      }
      const discoverMult = formatUnlockBuffMult(
        tier,
        state.formatUnlockBuffTier,
        state.formatUnlockBuffUntil,
        Date.now()
      )
      if (discoverMult !== 1) {
        mult = mult.times(discoverMult)
      }

      _dimMultCache.set(tier, { key: cacheKey, val: mult })
      return mult
    },

    // İstasyon Maliyet Hesabı (Getter)
    // C5 koşu-içi şişmesi (×1.5 birikimli) + C5 kalıcı indirimi (-%10) uygulanır.
    getDimensionCost: (state) => (tier: number): Decimal => {
      const dim = state.dimensions[tier - 1]
      if (!dim) return D_INFINITY
      const bucket = Math.floor(dim.bought / 10)
      const infl = challengeCostInflationMult(state).toString()
      const eff = memoChallengeEffects(state.completedChallenges)
      const cacheKey = bucket + '|' + infl + '|' + eff.dimCostMult
      const cached = _dimCostCache.get(tier)
      if (cached && cached.key === cacheKey) return cached.val
      let cost = dimensionCostForBucket(tier, bucket, dim.baseCost, dim.costMult)
      cost = cost.times(challengeCostInflationMult(state))
      if (eff.dimCostMult !== 1) {
        cost = cost.times(eff.dimCostMult)
      }
      if (hasAchievementReward(state.achievements, 'dim_cost_x085')) {
        cost = cost.times(0.85)
      }
      _dimCostCache.set(tier, { key: cacheKey, val: cost })
      return cost
    },

    // Manuel alım önizlemesi (kuru koşu): tıklanınca kaç adet alınacak ve toplam maliyeti.
    // buyDimensionUnits ile birebir aynı semantiği yansıtır (paket atlarken maliyet adımı da değişir).
    previewDimensionBuy(state) {
      return (tier: number): { units: number; cost: Decimal } | null => {
        const dim = state.dimensions[tier - 1]
        if (!dim || tier > this.unlockedDimensionsCount) return null

        const infl = challengeCostInflationMult(state)
        const eff = memoChallengeEffects(state.completedChallenges)
        const flat = eff.dimCostMult !== 1 ? infl.times(eff.dimCostMult) : infl

        let units = 0
        let spent = D_0
        let bucket = Math.floor(dim.bought / 10)
        let remainingInBucket = 10 - (dim.bought % 10)

        // Üst sınır güvenlik: maliyet geometrik büyüdüğü için pratikte tur sayısı küçük kalır
        for (let guard = 0; guard < 300; guard++) {
          const packPrice = dimensionCostForBucket(tier, bucket, dim.baseCost, dim.costMult).times(flat)
          const unitCost = packPrice.div(10)
          const remaining = state.matter.minus(spent)
          if (remaining.lt(unitCost)) break

          if (remaining.gte(packPrice)) {
            spent = spent.plus(packPrice)
            units += 10
            bucket += 1
            remainingInBucket = 10
            continue
          }

          const affordable = Math.min(remainingInBucket, remaining.div(unitCost).floor().toNumber())
          if (affordable <= 0) break
          spent = spent.plus(unitCost.times(affordable))
          units += affordable
          if (affordable === remainingInBucket) {
            bucket += 1
            remainingInBucket = 10
            continue
          }
          break
        }

        if (units <= 0) return null
        return { units, cost: spent }
      }
    },

    // Bağlamsal pasif rozetleri — dimension_identity fonksiyonlarıyla aynı koşullar (etki = aktif)
    passiveBadges(state): { d1Sync: boolean; d3Leech: boolean; d4Anomaly: boolean; d5Shift: boolean; d6Offline: boolean } {
      return {
        d1Sync: tierClickSyncCapBonus(state.dimensions) > 0,
        d3Leech: tierSlackerLeechMult(state.dimensions, this.unlockedDimensionsCount) !== 1,
        d4Anomaly: tierAnomalyRateMult(state.dimensions, this.unlockedDimensionsCount) !== 1,
        d5Shift: tierShiftReqMult(state.dimensions, this.unlockedDimensionsCount) !== 1,
        d6Offline: tierOfflineSimMult(state.dimensions, this.unlockedDimensionsCount) !== 1
      }
    },

    // Gece Duruşu (Stance) Çarpanları
    stanceMultipliers(state) {
      switch (state.currentStance) {
        case 'trend': // 🛌 Yorgan Altı Modu
          return { production: 2.0, click: 1.0, anomalyRate: 1.0 }
        case 'spam': // ⚡ Çılgın Kaydırma
          return { production: 1.0, click: 4.0, anomalyRate: 1.5 }
        case 'private_mode': // 🕶️ Düşük Parlaklık
          return { production: 1.0, click: 1.0, anomalyRate: 1.0 }
        default:
          return { production: 1.0, click: 1.0, anomalyRate: 1.0 }
      }
    },

    // Üretim Buff Çarpanı (Gece 3 Çılgınlığı vb.)
    productionBuffMultiplier(state): Decimal {
      let mult = D_1
      const fyp = state.activeBuffs.find((b) => b.type === 'fyp')
      if (fyp) {
        mult = mult.times(fyp.multiplier)
      }
      return mult
    },

    // Tıklama Buff Çarpanı (Başparmak Histerisi vb.)
    clickBuffMultiplier(state): Decimal {
      let mult = D_1
      const frenzy = state.activeBuffs.find((b) => b.type === 'heart_frenzy')
      if (frenzy) {
        mult = mult.times(frenzy.multiplier)
      }
      return mult
    },

    // Süper Rezonans Komboları Aktif mi? (Gece 3 7x VE Başparmak Histerisi 300x aynı anda)
    isComboActive(state): boolean {
      const hasFyp = state.activeBuffs.some((b) => b.type === 'fyp')
      const hasFrenzy = state.activeBuffs.some((b) => b.type === 'heart_frenzy')
      return hasFyp && hasFrenzy
    },

    // Vicdan azaplarının emdiği oran (Vicdan Uyuşturucu yükseltmesi ve Cheeseburger Kedi ile azalır)
    slackerLeechPercent(state): number {
      const baseLeech = state.slackers.length * 0.03
      const immunityLvl = state.singularityUpgrades?.guilt_immunity || 0
      const factor = Math.max(0.2, 1 - immunityLvl * 0.25)
      const achFactor = hasAchievementReward(state.achievements, 'leech_reduction') ? 0.85 : 1
      const hasCatBurger = state.labCells.some((c) => c.isMature && c.seedType === 'cat_burger')
      const burgerFactor = hasCatBurger ? 0.75 : 1.0
      const d3Leech = tierSlackerLeechMult(state.dimensions, this.unlockedDimensionsCount)
      return baseLeech * factor * achFactor * burgerFactor * d3Leech
    },

    // ---- Özellik Merdiveni (v0.11.0) ----
    unlockContext(state): UnlockContext {
      return buildUnlockContext(state)
    },

    // ADR-0035: bir dopamin eşiği hiçbir koşuda "yeniden kilitlenmez".
    // Ham dopamin kapıları buradan okur; hiçbir bileşen `matter.gte(...)` yazmaz.
    dopamineGateReached(state): (amount: string) => boolean {
      return (amount: string) =>
        meetsDopamineGate(state.matter, state.lifetimePeakMatter, amount)
    },

    isFeatureUnlocked: (state) => (id: string): boolean => {
      if (state.unlockedFeatures.includes(id)) return true
      const feature = getFeatureById(id)
      if (!feature) return false
      return checkUnlock(buildUnlockContext(state), feature)
    },

    // Kilit Açılma Durumları (Sekmeler için — merdivene bağlı)
    labUnlocked(): boolean {
      return this.isFeatureUnlocked('lab')
    },

    crisisUnlocked(): boolean {
      return this.isFeatureUnlocked('crisis')
    },

    autobuyersUnlocked(): boolean {
      return this.isFeatureUnlocked('autobuyers')
    },

    // ---- Gece Kriz Meydan Okumaları (Faz 1: Motor) ----
    activeChallengeDef(): ChallengeDef | null {
      if (!this.activeChallenge) return null
      return getChallengeById(this.activeChallenge) || null
    },

    challengeRewardEffects(): ChallengeRewardEffects {
      return memoChallengeEffects(this.completedChallenges)
    },

    challengesUnlocked(): boolean {
      return this.isFeatureUnlocked('challenges')
    },

    // C2 durma-rampası + C8 fırtına global üretim çarpanı.
    // İki tüketim noktası: matterPerSecond + update() içi kopya (ikisi de bu getter'ı okur).
    challengeProdMult(): Decimal {
      const mods = this.activeChallengeDef?.modifiers
      if (!mods) return D_1
      let mult = D_1
      // C2: 3 sn tam durma challengeHalted ile sıfırlanır; burada 60 sn lineer rampa (0→1).
      if (mods.productionHaltOnBuySec !== undefined) {
        const t = this.challengeSinceBuy - mods.productionHaltOnBuySec
        if (t < 0) return D_0
        if (t < CHALLENGE_HALT_RAMP_SEC) {
          mult = mult.times(t / CHALLENGE_HALT_RAMP_SEC)
        }
      }
      // C8: Bildirim Fırtınası — sayaç %100'de ×0.5, her +%25 taşmada ek ×0.75, taban ×0.15.
      if (mods.notificationDoomRatePerSec !== undefined && this.challengeNotificationDoom >= 1) {
        const steps = Math.floor((this.challengeNotificationDoom - 1) / 0.25)
        const storm = CHALLENGE_STORM_BASE * Math.pow(CHALLENGE_STORM_STEP, steps)
        mult = mult.times(Math.max(CHALLENGE_STORM_FLOOR, storm))
      }
      return mult
    },

    // C2 durma anında üretim tamamen durur (matterPerSecond D_0 döner, update kopyası atlar).
    challengeHalted(): boolean {
      const mods = this.activeChallengeDef?.modifiers
      return mods?.productionHaltOnBuySec !== undefined && this.challengeHaltUntil > 0
    },

    // Hedef çubuğu için logaritmik ilerleme (0-1)
    challengeProgress01(state): number {
      if (!state.activeChallenge) return 0
      const def = getChallengeById(state.activeChallenge)
      if (!def) return 0
      const goal = parseSavedDecimal(def.goalMatter, D_INFINITY)
      if (goal.lte(0) || goal.isNan()) return 0
      if (state.matter.gte(goal)) return 1
      if (state.matter.lte(0)) return 0
      const cur = state.matter.log10().toNumber()
      const target = goal.log10().toNumber()
      if (!Number.isFinite(cur) || !Number.isFinite(target) || target <= 0) return 0
      return Math.min(1, Math.max(0, cur / target))
    },

    canUnlockBulk(state): boolean {
      if (state.autobuyerBulkUnlocked) return false
      return state.matter.gte(AUTOBUYER_BULK_COST) && state.dimensionShifts >= AUTOBUYER_BULK_SHIFT_REQ
    },

    canUnlockMax(state): boolean {
      if (state.autobuyerMaxUnlocked) return false
      if (!state.autobuyerBulkUnlocked) return false
      return state.matter.gte(AUTOBUYER_MAX_COST) && state.galaxies >= AUTOBUYER_MAX_GALAXY_REQ
    },

    // Bot ilerleme kilidi: maliyet yetse bile shift/küme/boyut şartı aranır
    isAutobuyerRequirementMet: (state) => (id: string): boolean => {
      const req = AUTOBUYER_PROGRESS_REQ[id]
      if (!req) return true
      if (req.shifts !== undefined && state.dimensionShifts < req.shifts) return false
      if (req.galaxies !== undefined && state.galaxies < req.galaxies) return false
      if (req.singularities !== undefined && state.singularities < req.singularities) return false
      if (req.needTier !== undefined) {
        const dim = state.dimensions[req.needTier - 1]
        if (!dim || dim.amount.lt(1)) return false
      }
      return true
    },

    singularityUnlocked(state): boolean {
      // ADR-0035: 1e30 eşiği koşu içi dopaminden değil, hayat boyu tepe noktadan
      // okunur. Sıçrama sonrası Şafak sekmesi kaybolmaz.
      return state.singularities > 0 || meetsDopamineGate(state.matter, state.lifetimePeakMatter, '1e30')
    },

    // Önbellek Temizleme açık mı? ADR-0035: Akış Kümesi `dimensionShifts`'i 0'a
    // indirdiği için koşu içi sayaç yerine hayat boyu en yüksek sıçrama sayısı
    // okunur. Saf okuyucudur; tepe noktayı yalnızca syncUnlocks() yükseltir.
    sacrificeUnlocked(state): boolean {
      return (
        state.lifetimePeakShifts >= SACRIFICE_SHIFT_REQ ||
        (!!state.dimensions[7] && state.dimensions[7].amount.gt(0))
      )
    },

    // ---- Nöral İzleme Kolonisi & Toplu Uyku ----
    colonyUnlocked(state): boolean {
      return state.neuralBots.gt(0) || state.napCount > 0 || this.isFeatureUnlocked('colony')
    },
    botBreedRate(): number {
      // Nöral Ağaç: Nöral Yuva seviyeleri (eski bağlantı) + Sinaptik Köprü çarpanı
      return COLONY_BREED_RATE * (1 + 0.1 * (this.singularityUpgrades?.neural_nest || 0)) * this.neuralEffects.breedRateMult
    },
    colonyMultiplier(state): Decimal {
      if (state.neuralBots.lte(0)) return D_1
      return D_1.plus(state.neuralBots.plus(1).log10().times(COLONY_PASSIVE_LOG_FACTOR))
    },
    minNapBots(state): Decimal {
      // Dinamik Nap Eşiği: Her Toplu Uyku ile asgari bot ihtiyacı artar; 4 dakikalık spam'i engeller
      const count = Math.min(60, state.napCount || 0)
      return new Decimal(100).times(Decimal.pow(1.8, count))
    },
    canPowerNap(): boolean {
      return this.neuralBots.gte(this.minNapBots)
    },
    powerNapGain(): Decimal {
      if (!this.canPowerNap) return D_1
      const logBots = this.neuralBots.log10().toNumber()
      const logMin = this.minNapBots.log10().toNumber()
      const ratio = Math.max(1, logBots / Math.max(1, logMin))
      // Beklemeyi ve derin koloniyi ödüllendirir
      const gain = 1 + Math.pow(ratio, 1.2) * 0.85
      return new Decimal(gain)
    },

    // Algoritma Stüdyosu: Viral Matris Pasif Çarpanı (Sinerjiler, Merkez Çip, Satır/Sütun ve Zeminler)
    labPassiveMultiplier(state): Decimal {
      let mult = D_1
      const isFood = (t: LabSeedType | null) => t === 'cheese_sizzle' || t === 'mukbang_drama' || t === 'cat_burger'

      // Hücre bazlı temel çarpan ve komşuluk sinerjileri
      state.labCells.forEach((c, idx) => {
        if (!c.isMature || !c.seedType) return

        let cellBoost = 1.0
        if (c.seedType === 'cat_audio') cellBoost = 1.1
        else if (c.seedType === 'cheese_sizzle') cellBoost = 1.18
        else if (c.seedType === 'mukbang_drama') cellBoost = 1.25
        else if (c.seedType === 'cat_burger') cellBoost = 1.18
        else if (c.seedType === 'brainrot_remix') cellBoost = 2.0

        // Komşuları bul (3x3 grid)
        const row = Math.floor(idx / 3)
        const col = idx % 3
        const neighborCells: LabCell[] = []
        if (row > 0) neighborCells.push(state.labCells[idx - 3])
        if (row < 2) neighborCells.push(state.labCells[idx + 3])
        if (col > 0) neighborCells.push(state.labCells[idx - 1])
        if (col < 2) neighborCells.push(state.labCells[idx + 1])

        const matureNeighbors = neighborCells.filter((n) => n.isMature && n.seedType)

        // 1. Kedi Komşuluğu: +%15 rezonans
        if (matureNeighbors.some((n) => n.seedType === 'cat_audio')) {
          cellBoost *= 1.15
        }

        // 2. Phonk Komşuluğu: Bas Şoku (×1.25)
        if (matureNeighbors.some((n) => n.seedType === 'sigma_phonk')) {
          cellBoost *= 1.25
        }

        // 3. Yemek Komşuluğu: Ziyafet Sinerjisi (+%30)
        if (isFood(c.seedType) && matureNeighbors.some((n) => isFood(n.seedType))) {
          cellBoost *= 1.30
        }

        // 4. Merkez Çip Bonusu (Hücre 4): Nöral Çekirdek (kendisi 1.5×, komşularına +%20 yayar)
        if (idx === 4) {
          cellBoost *= 1.50
        } else if (matureNeighbors.some((n) => n.id === 4)) {
          cellBoost *= 1.20
        }

        mult = mult.times(cellBoost)
      })

      // Satır Uyumları (Satır 0, 1, 2)
      for (let r = 0; r < 3; r++) {
        const rowCells = [state.labCells[r * 3], state.labCells[r * 3 + 1], state.labCells[r * 3 + 2]]
        if (rowCells.every((c) => c.isMature && c.seedType !== null)) {
          mult = mult.times(1.12)
          // Mono-format uyumu (3'ü de aynı)
          if (rowCells[0].seedType === rowCells[1].seedType && rowCells[1].seedType === rowCells[2].seedType) {
            mult = mult.times(1.2)
          }
        }
      }

      // Sütun Uyumları (Sütun 0, 1, 2)
      for (let cl = 0; cl < 3; cl++) {
        const colCells = [state.labCells[cl], state.labCells[cl + 3], state.labCells[cl + 6]]
        if (colCells.every((c) => c.isMature && c.seedType !== null)) {
          mult = mult.times(1.12)
        }
      }

      // Algoritma Zemin Modu (Evergreen: Pasife odaklanma)
      if (state.labMode === 'evergreen') {
        mult = mult.times(1.8)
      }

      // Viral Kodeks Keşif Bonusu (Her keşfedilen formül kalıcı +%3)
      const recipeResults = new Set(LAB_RECIPES.map((recipe) => recipe.result))
      const codexCount = (state.discoveredFormulas || []).filter((id) => recipeResults.has(id)).length
      mult = mult.times(1 + codexCount * 0.03)

      // Canlı Viral Akış Dalgası (Reaktör patlaması aktifken)
      if (state.isViralActive) {
        const matureCount = state.labCells.filter((c) => c.isMature && !!c.seedType).length
        const viralSurge = (5.0 + matureCount * 1.0) * (state.labMode === 'fyp' ? 1.2 : 1.0)
        mult = mult.times(viralSurge)
      }

      return mult
    },

    // Algoritma Stüdyosu: Tıklama Çarpanı (Subway, Mukbang, DriftTok)
    labClickMultiplier(state): Decimal {
      let mult = D_1
      state.labCells.forEach((c, idx) => {
        if (!c.isMature || !c.seedType) return

        if (c.seedType === 'subway_beat') mult = mult.times(2.0)
        else if (c.seedType === 'mukbang_drama') mult = mult.times(1.5)
        else if (c.seedType === 'drift_tok') mult = mult.times(2.0)

        // Merkez hücre bonusu
        if (idx === 4 && (c.seedType === 'subway_beat' || c.seedType === 'drift_tok' || c.seedType === 'mukbang_drama')) {
          mult = mult.times(1.3)
        }
      })

      if (state.isViralActive) {
        mult = mult.times(2.5)
      }

      return mult
    },

    // Algoritma Stüdyosu: Gece Krizi Anomali Sıklığı
    labAnomalyMultiplier(state): number {
      let bonus = 1.0
      state.labCells.forEach((c) => {
        if (c.isMature && c.seedType) {
          if (c.seedType === 'sigma_phonk') bonus *= 1.5
          else if (c.seedType === 'drift_tok') bonus *= 1.3
          else if (c.seedType === 'brainrot_remix') bonus *= 1.4
        }
      })

      if (state.isViralActive) {
        bonus *= 3.0
      }

      return bonus
    },

    // Reaktörün Viral Drop Çarpanı
    labViralMultiplier(state): number {
      const matureCount = state.labCells.filter((c) => c.isMature && !!c.seedType).length
      return (5.0 + matureCount * 1.0) * (state.labMode === 'fyp' ? 1.2 : 1.0)
    },

    // Viral Kodeks Keşif Yüzdesi / Global Çarpanı
    labCodexDiscoveredCount(state): number {
      const recipeResults = new Set(LAB_RECIPES.map((recipe) => recipe.result))
      return (state.discoveredFormulas || []).filter((id) => recipeResults.has(id)).length
    },

    labCodexBonusPercent(): number {
      return this.labCodexDiscoveredCount * 3
    },

    // Nöral Ağaç: satın alınan düğümlerin toplanmış sayısal etkileri (tek kaynak)
    neuralEffects(state): NeuralEffects {
      return memoNeuralEffects(state.neuralNodesBought || {})
    },

    // Combo çarpanı: yalnızca Hipnotik Seri düğümü alındıysa eşiklere göre uygulanır
    comboMultiplier(state): number {
      if ((state.neuralNodesBought?.combo_unlock || 0) < 1) return 1
      let mult = 1
      for (const t of COMBO_THRESHOLDS) {
        if (state.clickCombo.count >= t.count) {
          mult = t.mult
        }
      }
      return mult
    },

    // Toplam Manuel Kaydırma Gücü (Yukarı Kaydır)
    manualClickPower(state): Decimal {
      let totalBought = 0
      state.dimensions.forEach((d) => {
        totalBought += d.bought
      })

      // 1. Taban Tıklama Gücü
      let baseClick = D_1.plus(new Decimal(totalBought).times(0.25))
        .times(this.shiftPowerMultiplier)
        .times(this.labClickMultiplier)
        .times(this.achievementMultiplier)
        .times(this.challengeRewardEffects.clickMult)

      // 2. Temel Senkronizasyon (%CPS to click):
      const syncCap =
        CPS_SYNC_CAP + tierClickSyncCapBonus(state.dimensions)
      const syncRate = Math.min(syncCap, CPS_SYNC_BASE + CPS_SYNC_PER_LEVEL * this.neuralEffects.cpsSyncLevel)
      let power = baseClick.plus(this.matterPerSecond.times(syncRate))

      // 3. 1080p 60fps Milestone Bonusu: 200+ adet satın alınan her açık formatın üretiminin %1'i tıklamaya eklenir
      state.dimensions.forEach((d, idx) => {
        if (d.bought >= 200 && d.amount.gt(0)) {
          const dimPerSec = d.amount.times(this.getDimensionMultiplier(idx + 1)).times(this.tickspeedMultiplier).times(0.01)
          power = power.plus(dimPerSec)
        }
      })

      // 4. Damardan Kafein Serumu: Saniyelik üretimin her seviye %3'ünü ekler
      const caffeineLvl = state.singularityUpgrades?.caffeine_drip || 0
      if (caffeineLvl > 0) {
        const passiveAdd = this.matterPerSecond.times(caffeineLvl * 0.03 * this.achievementCaffeineBoost)
        power = power.plus(passiveAdd)
      }

      // 5. Global Tıklama Çarpanları: 300× Frenzy, 4× Spam duruşu, Nöral Ağaç ve Kombolar toplam tıklamaya uygulanır
      power = power
        .times(this.stanceMultipliers.click)
        .times(this.clickBuffMultiplier)
        .times(this.achievementClickMult)
        .times(this.neuralEffects.clickMult)
        .times(this.comboMultiplier)

      return power
    },

    // Balatro Sütun 2: "Reels Vuruşu" Sıralı Nedensellik Basamak Kırılımı (Sequential Triggering)
    swipeBreakdown(state): StrikeStage[] {
      const stages: StrikeStage[] = []

      // 1. Taban Akış: 1 + istasyon katkısı + %CPS senkronu + milestone + kafein
      let totalBought = 0
      state.dimensions.forEach((d) => {
        totalBought += d.bought
      })

      const syncCap = CPS_SYNC_CAP + tierClickSyncCapBonus(state.dimensions)
      const syncRate = Math.min(syncCap, CPS_SYNC_BASE + CPS_SYNC_PER_LEVEL * this.neuralEffects.cpsSyncLevel)
      let rawBase = D_1.plus(new Decimal(totalBought).times(0.25))
      const cpsPart = this.matterPerSecond.times(syncRate)
      rawBase = rawBase.plus(cpsPart)

      state.dimensions.forEach((d, idx) => {
        if (d.bought >= 200 && d.amount.gt(0)) {
          const dimPerSec = d.amount.times(this.getDimensionMultiplier(idx + 1)).times(this.tickspeedMultiplier).times(0.01)
          rawBase = rawBase.plus(dimPerSec)
        }
      })
      const caffeineLvl = state.singularityUpgrades?.caffeine_drip || 0
      if (caffeineLvl > 0) {
        rawBase = rawBase.plus(this.matterPerSecond.times(caffeineLvl * 0.03 * this.achievementCaffeineBoost))
      }

      stages.push({
        id: 'base',
        label: 'TABAN AKIŞ',
        text: `+${format(rawBase, 2, state.settings.notation)}`,
        color: '#00d2ff',
        bgClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
        borderClass: 'border-cyan-400',
        icon: '⚡'
      })

      // 2. Format Sinerjisi (Akış Sıçraması x Lab x Başarımlar x Meydan Okuma Ödülleri)
      const synergyMult = this.shiftPowerMultiplier
        .times(this.labClickMultiplier)
        .times(this.achievementMultiplier)
        .times(this.challengeRewardEffects.clickMult)

      if (synergyMult.gt(1.05)) {
        stages.push({
          id: 'synergy',
          label: 'SİNERJİ',
          text: `×${format(synergyMult, 2, state.settings.notation)}`,
          color: '#10b981',
          bgClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
          borderClass: 'border-emerald-400',
          icon: '✨',
          multiplier: synergyMult.toNumber()
        })
      }

      // 3. Gece Duruşu & Seri Kombo (Trimps Stance & Cookie Clicker Combo)
      const stanceMult = this.stanceMultipliers.click
      const comboMult = this.comboMultiplier
      const combinedStanceCombo = stanceMult * comboMult

      if (combinedStanceCombo > 1.05) {
        const stanceLabel = stanceMult > 1.05 ? 'ÇILGIN KAYDIRMA' : 'HIZLI SERİ'
        stages.push({
          id: 'stance_combo',
          label: stanceLabel,
          text: `×${combinedStanceCombo.toFixed(1)}`,
          color: '#fe5f55',
          bgClass: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
          borderClass: 'border-rose-400',
          icon: '🔥',
          multiplier: combinedStanceCombo
        })
      }

      // 4. Gece Histerisi / Anomali CRIT (Başparmak Histerisi 777x veya Espresso)
      const buffMult = this.clickBuffMultiplier
      if (buffMult.gt(1.05)) {
        const isSuperCrit = buffMult.gte(500)
        stages.push({
          id: 'crit',
          label: isSuperCrit ? '777× HİSTERİ CRIT!' : 'KRİZ ANOMALİSİ',
          text: `×${format(buffMult, 1, state.settings.notation)}`,
          color: '#fbbf24',
          bgClass: 'bg-amber-500/25 text-amber-200 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.4)]',
          borderClass: 'border-amber-400',
          icon: '💥',
          multiplier: buffMult.toNumber()
        })
      }

      // 5. Final Toplam Skor (Nihai Slam Down)
      const finalGain = this.manualClickPower
      stages.push({
        id: 'final',
        label: 'SLAM!',
        text: `+${format(finalGain, 2, state.settings.notation)}`,
        color: '#c084fc',
        bgClass: 'bg-purple-500/25 text-purple-200 border-purple-400/60 shadow-[0_0_20px_rgba(192,132,252,0.5)]',
        borderClass: 'border-purple-400',
        icon: '🌌'
      })

      return stages
    },

    // Saniyedeki Efektif Dopamin Üretimi
    matterPerSecond(state): Decimal {
      if (this.challengeHalted) return D_0
      const dim1 = state.dimensions[0]
      if (!dim1 || dim1.amount.eq(0)) return D_0

      let baseProd = dim1.amount
        .times(this.getDimensionMultiplier(1))
        .times(this.tickspeedMultiplier)

      baseProd = baseProd.times(this.colonyMultiplier)
      baseProd = baseProd.times(state.napMultiplier)

      const stanceMult = this.stanceMultipliers.production
      const buffMult = this.productionBuffMultiplier
      const labMult = this.labPassiveMultiplier
      const debuffMult = state.crisisBackfireDebuff > 0 ? 0.5 : 1.0
      const netRatio = Math.max(0.01, 1 - this.slackerLeechPercent)

      return baseProd
        .times(stanceMult)
        .times(buffMult)
        .times(labMult)
        .times(this.achievementMultiplier)
        .times(this.achievementProductionMult)
        .times(debuffMult)
        .times(netRatio)
        .times(this.challengeProdMult)
    },

    dopaminePerSecond(): Decimal {
      return this.matterPerSecond
    },

    /** Açık tier'lardan D1 CPS büyüme hızının üst sınırı (besleme ipucu). */
    matterPerSecondGrowth(state): Decimal {
      const d1 = state.dimensions[0]
      if (!d1 || d1.amount.lte(0) || this.matterPerSecond.lte(0)) return D_0
      const unlocked = resolvedUnlockedDimensionCount(state)
      let best = D_0
      for (let t = 2; t <= unlocked; t++) {
        const higher = state.dimensions[t - 1]
        const lower = state.dimensions[t - 2]
        if (!higher || !lower || higher.amount.lte(0)) continue
        const feedToLower = higher.amount
          .times(this.getDimensionMultiplier(t))
          .times(this.tickspeedMultiplier)
          .times(this.achievementMultiplier)
          .times(DIMENSION_CHAIN_RATE)
        if (feedToLower.lte(0)) continue
        const growth = feedToLower.times(this.matterPerSecond.div(d1.amount))
        if (growth.gt(best)) best = growth
      }
      return best
    },

    // ---- Başarım Çarpanları & Kalıcı Ödüller (prestij dahil kalıcı) ----
    achievementCount(state): number {
      return state.achievements.length
    },

    achievementFullRows(state): number {
      return ACHIEVEMENT_CATEGORIES.filter((c) =>
        ACHIEVEMENTS.filter((a) => a.category === c.id).every((a) => state.achievements.includes(a.id))
      ).length
    },

    // Global kalıcı çarpan. Bilinçli olarak singularityGain'e uygulanmaz.
    //
    // ADR-0029: bu getter tick başına birden çok kez çağrılıyordu ve
    // calcAchievementMultiplier her çağrıda 7 kategori × 66 tanım tarıyordu.
    // Başarım listesi yalnızca EKLENEREK büyür (prestij/hard reset'te düşmez),
    // dolayısıyla uzunluk geçerli bir cache anahtarıdır. Yüklemede ve hard
    // reset'te cache düşürülür.
    achievementMultiplier(state): Decimal {
      const len = state.achievements.length
      if (_achMultCache && _achMultCache.len === len) return _achMultCache.val
      const val = calcAchievementMultiplier(state.achievements)
      _achMultCache = { len, val }
      return val
    },

    hasUnseenAchievements(state): boolean {
      return state.achievements.length > state.achievementsSeenCount
    },

    achievementClickMult(state): number {
      let m = 1
      if (hasAchievementReward(state.achievements, 'click_x2')) m *= 2
      if (hasAchievementReward(state.achievements, 'click_x3')) m *= 3
      return m
    },

    achievementTickspeedDiscount(state): number {
      return hasAchievementReward(state.achievements, 'tickspeed_discount') ? 0.95 : 1
    },

    achievementAnomalyFactor(state): number {
      return hasAchievementReward(state.achievements, 'anomaly_rate') ? 0.9 : 1
    },

    achievementLeechFactor(state): number {
      return hasAchievementReward(state.achievements, 'leech_reduction') ? 0.85 : 1
    },

    achievementCaffeineBoost(state): number {
      return hasAchievementReward(state.achievements, 'caffeine_boost') ? 1.25 : 1
    },

    achievementSpDiscount(state): number {
      return hasAchievementReward(state.achievements, 'sp_discount') ? 0.95 : 1
    },

    achievementCaffeineRegen(state): number {
      return hasAchievementReward(state.achievements, 'caffeine_regen') ? 1.25 : 1
    },

    achievementLabYield(state): number {
      return hasAchievementReward(state.achievements, 'lab_yield') ? 1.1 : 1
    },

    achievementBuffDuration(state): number {
      return hasAchievementReward(state.achievements, 'buff_duration') ? 1.2 : 1
    },

    achievementStartingMatter(state): Decimal {
      return hasAchievementReward(state.achievements, 'starting_matter')
        ? new Decimal(1000)
        : new Decimal(10)
    },

    achievementProductionMult(state): number {
      let m = 1
      if (hasAchievementReward(state.achievements, 'prod_x125')) m *= 1.25
      if (hasAchievementReward(state.achievements, 'prod_x2')) m *= 2.0
      return m
    },

    achievementDimCostMult(state): number {
      return hasAchievementReward(state.achievements, 'dim_cost_x085') ? 0.85 : 1
    },

    achievementShiftPowerBase(state): number {
      return hasAchievementReward(state.achievements, 'shift_power_boost') ? 1.9 : 1.66
    }
  },

  actions: {
    // C2/C5 kancası: HER başarılı alım birimi buradan geçer (manuel, bot, Maks, paket).
    // C2: üretim durma sayacı kurulur + rampa saati sıfırlanır. C5: şişme sayacı birikir.
    registerChallengeBuy(units = 1): void {
      const mods = this.activeChallengeDef?.modifiers
      if (!mods) return
      if (mods.productionHaltOnBuySec !== undefined) {
        this.challengeHaltUntil = mods.productionHaltOnBuySec
        this.challengeSinceBuy = 0
      }
      if (mods.costInflationOnBuy !== undefined) {
        this.challengeCostInflation += units
      }
    },

    // Sıçrama/Küme sonu challenge rahatlaması (salt-okunur kanca):
    // C3 üstel sayaç sıfırlanır; C8 bildirim sayacı %40 temizlenir. Koşu silinmez, fail-state yok.
    relieveChallengeOnPrestige(): void {
      const mods = this.activeChallengeDef?.modifiers
      if (!mods) return
      if (mods.dim1ExpoGrowthPerSec !== undefined) {
        this.challengeDim1Growth = new Decimal(1)
      }
      if (mods.notificationDoomRatePerSec !== undefined) {
        this.challengeNotificationDoom *= CHALLENGE_DOOM_RELIEF
      }
      if (mods.costInflationOnBuy !== undefined) {
        this.challengeCostInflation = 0
      }
    },

    // Gece Duruşunu Değiştir (Çılgın Kaydırma / Düşük Parlaklık: D1×50 ile açılır)
    setStance(stance: StanceType): void {
      if (this.currentStance === stance) return
      if (stance === 'spam' && !this.isFeatureUnlocked('stance_spam')) return
      if (stance === 'private_mode' && !this.isFeatureUnlocked('stance_private')) return
      this.currentStance = stance
      sounds.playStance()
    },

    /** D2+ satırında: alt formata saniyelik besleme (miktar arttığında anında yükselir). */
    getDimensionChainFeedPerSecond(tier: number): Decimal {
      if (tier <= 1) return D_0
      const dim = this.dimensions[tier - 1]
      if (!dim || dim.amount.lte(0)) return D_0
      return dim.amount
        .times(this.getDimensionMultiplier(tier))
        .times(this.tickspeedMultiplier)
        .times(this.achievementMultiplier)
        .times(DIMENSION_CHAIN_RATE)
    },

    emitProductionSurge(beforeMatterPerSec: Decimal, playSound = true): void {
      if (this.offlineSimActive) return
      const after = this.matterPerSecond
      if (!after.gt(beforeMatterPerSec.times(1.001))) return
      const delta = after.minus(beforeMatterPerSec)
      if (delta.lte(0)) return
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('doomscroll:production-bump', {
            detail: { delta: delta.toString() }
          })
        )
      }
      if (playSound) {
        sounds.playProductionSurge()
      }
    },

    /** Satın alım sonrası zinciri birkaç saniye “hemen” akıtır; D2→D1 Dopamin/s’yi ve sayacı yükseltir. */
    applyPurchaseChainPulse(tier: number): void {
      if (tier < 2 || this.challengeHalted) return
      let hopTier = tier
      let seconds = PURCHASE_CHAIN_BONUS_SECONDS
      while (hopTier >= 2 && seconds >= 0.05) {
        const higher = this.dimensions[hopTier - 1]
        const lower = this.dimensions[hopTier - 2]
        if (!higher || !lower || higher.amount.lte(0)) break
        const produced = higher.amount
          .times(this.getDimensionMultiplier(hopTier))
          .times(this.tickspeedMultiplier)
          .times(this.achievementMultiplier)
          .times(DIMENSION_CHAIN_RATE)
          .times(seconds)
        lower.amount = lower.amount.plus(produced)
        hopTier -= 1
        seconds *= 0.42
      }
      const d1 = this.dimensions[0]
      if (d1 && d1.amount.gt(0) && this.matterPerSecond.gt(0)) {
        this.matter = this.matter.plus(this.matterPerSecond.times(PURCHASE_MATTER_TICK_SECONDS))
      }
    },

    finalizeDimensionPurchase(tier: number, mpsBefore: Decimal, playSound = false): void {
      if (tier >= 2) {
        this.applyPurchaseChainPulse(tier)
      }
      this.emitProductionSurge(mpsBefore, playSound)
    },

    // 10'luk İstasyon Satın Alımı
    buyDimension(tier: number, playSound = true): boolean {
      if (tier > this.unlockedDimensionsCount) return false
      const dim = this.dimensions[tier - 1]
      const cost = this.getDimensionCost(tier)

      if (this.matter.gte(cost)) {
        const mpsBefore = this.matterPerSecond
        this.matter = this.matter.minus(cost)
        dim.amount = dim.amount.plus(10)
        dim.bought += 10
        this.registerChallengeBuy(1)

        if (playSound) {
          sounds.playBuy(tier)
        }
        this.finalizeDimensionPurchase(tier, mpsBefore, playSound)
        return true
      }
      return false
    },

    // Bir İstasyondan Alınabildiği Kadar Satın Al (matematiksel: döngüsüz geometrik seri)
    buyMaxDimension(tier: number, playSound = true, feedbackSurge = true): boolean {
      if (tier > this.unlockedDimensionsCount) return false
      const dim = this.dimensions[tier - 1]
      if (!dim) return false
      const startBucket = Math.floor(dim.bought / 10)
      const infl = challengeCostInflationMult({
        activeChallenge: this.activeChallenge,
        challengeCostInflation: this.challengeCostInflation
      })
      const eff = memoChallengeEffects(this.completedChallenges)
      const flat = infl.times(eff.dimCostMult)
      const budget = this.matter.div(flat)
      const packs = calcMaxDimensionPacks(
        tier,
        dim.baseCost,
        dim.costMult,
        startBucket,
        budget,
        maxBuyPacksCap(this.singularities)
      )
      if (packs <= 0) return false
      const total = calcDimensionPackTotal(tier, dim.baseCost, dim.costMult, startBucket, packs).times(flat)
      if (this.matter.lt(total)) return false
      const mpsBefore = this.matterPerSecond
      this.matter = this.matter.minus(total)
      dim.amount = dim.amount.plus(10 * packs)
      dim.bought += 10 * packs
      this.registerChallengeBuy(packs)

      if (playSound) {
        sounds.playBuy(tier)
      }
      if (feedbackSurge) {
        this.finalizeDimensionPurchase(tier, mpsBefore, playSound)
      } else if (tier >= 2) {
        this.applyPurchaseChainPulse(tier)
      }
      return true
    },

    // Algoritma Frekansı (Tickspeed) Yükselt
    buyTickspeed(playSound = true): boolean {
      const cost = this.tickspeedCost
      if (this.matter.gte(cost)) {
        const mpsBefore = this.matterPerSecond
        this.matter = this.matter.minus(cost)
        this.tickspeedBought++
        this.registerChallengeBuy(1)
        if (playSound) {
          sounds.playBuy(0)
        }
        this.emitProductionSurge(mpsBefore, playSound)
        return true
      }
      return false
    },

    // Frekanstan alınabildiği kadar al (matematiksel: 1000×16^n geometrik seri)
    buyMaxTickspeed(playSound = true, feedbackSurge = true): boolean {
      const start = this.tickspeedBought
      const base = new Decimal(1000)
      const ratio = new Decimal(16)
      const infl = challengeCostInflationMult({
        activeChallenge: this.activeChallenge,
        challengeCostInflation: this.challengeCostInflation
      })
      let flat = infl
      if (this.currentStance === 'private_mode') {
        flat = flat.times(0.85)
      }
      if (hasAchievementReward(this.achievements, 'tickspeed_discount')) {
        flat = flat.times(0.95)
      }
      const eff = memoChallengeEffects(this.completedChallenges)
      if (eff.tickspeedCostMult !== 1) {
        flat = flat.times(eff.tickspeedCostMult)
      }
      const budget = this.matter.div(flat)
      const n = calcMaxPacks(base, ratio, start, budget, maxBuyPacksCap(this.singularities))
      if (n <= 0) return false
      const total = calcGeometricTotal(base, ratio, start, n).times(flat)
      if (this.matter.lt(total)) return false
      const mpsBefore = this.matterPerSecond
      this.matter = this.matter.minus(total)
      this.tickspeedBought += n
      this.registerChallengeBuy(n)
      if (playSound) {
        sounds.playBuy(0)
      }
      if (feedbackSurge) {
        this.emitProductionSurge(mpsBefore, playSound)
      }
      return true
    },

    // Tüm İstasyonları ve Frekansı Optimize Al (Max All)
    maxAll(): void {
      const mpsBefore = this.matterPerSecond
      let boughtAny = false
      if (this.buyMaxTickspeed(false, false)) {
        boughtAny = true
      }

      for (let t = this.unlockedDimensionsCount; t >= 1; t--) {
        if (this.buyMaxDimension(t, false, false)) {
          boughtAny = true
        }
      }

      if (boughtAny) {
        sounds.playBuy(1)
        this.emitProductionSurge(mpsBefore)
      }
    },

    // Yukarı Kaydır (Manuel Tıklama)
    manualClick(coords?: { x: number; y: number }): void {
      // Combo serisi: 1.5 sn içinde gelen tıklamalar seriyi uzatır, aksi halde seri 1'den başlar
      const now = Date.now()
      if (now - this.clickCombo.lastClickAt <= COMBO_DECAY_MS) {
        this.clickCombo.count++
      } else {
        this.clickCombo.count = 1
      }
      this.clickCombo.lastClickAt = now

      const gain = this.manualClickPower
      this.matter = this.matter.plus(gain)
      this.stats.manualClicks++
      this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(gain)
      this.stats.totalManualDopamine = this.stats.totalManualDopamine.plus(gain)

      // Algoritma Lab Hype Şarjı (Evergreen modu hariç ve canlı akışta değilken)
      if (this.isFeatureUnlocked('lab') && this.labMode !== 'evergreen' && !this.isViralActive) {
        this.labHype = Math.min(100, this.labHype + 0.4)
      }

      // Balatro Sütun 2: Sıralı Nedensellik (Sequential Triggering)
      const shouldReduce = this.settings.reduceAnimations || this.settings.batterySaver
      const isSequentialEnabled = this.settings.sequentialStrike !== false && !shouldReduce

      if (!isSequentialEnabled) {
        sounds.playClick()
        return
      }

      const stages = this.swipeBreakdown
      const isCrit = this.clickBuffMultiplier.gte(500)
      sounds.playSequentialStrike(stages.length, isCrit)

      if (typeof window !== 'undefined') {
        const x = coords?.x ?? window.innerWidth / 2
        const y = coords?.y ?? window.innerHeight / 2

        // Balatro Sıralı Reels Vuruşu Olayı
        window.dispatchEvent(
          new CustomEvent('doomscroll:sequential-strike', {
            detail: {
              x,
              y,
              stages,
              finalAmount: gain,
              isCrit,
              comboCount: this.clickCombo.count
            }
          })
        )
      }
    },

    // Önbelleği Temizleme / Geçmişi Sıfırla (Dimension Sacrifice - Antimatter Dimensions)
    sacrificeDimensions(playSound = true): boolean {
      if (!this.canSacrifice) return false

      const newMult = this.currentSacrificeReward
      this.sacrificeMultiplier = newMult
      // AD-accurate: alt boyutlar sıfırlanmaz, üretim kesintisiz devam eder.
      // Sadece mevcut D1 miktarı kalıcı D8 çarpanına dönüştürülür (1.15x kuralı spam'ı engeller).
      this.sacrificeCount++

      if (playSound) {
        sounds.playSacrifice()
        confetti({
          particleCount: 110,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#ec4899', '#06b6d4', '#f59e0b']
        })
      }
      return true
    },

    /** ADR-0025: yeni format tier açıldığında kısa üretim buff + juice. */
    celebrateFormatUnlock(tier: number): void {
      if (tier <= this.formatDiscoverSeenCap) return
      this.formatDiscoverSeenCap = tier
      this.formatUnlockBuffTier = tier
      this.formatUnlockBuffUntil = Date.now() + FORMAT_UNLOCK_BUFF_SECONDS * 1000
      _dimMultCache.clear()
      sounds.playUpgrade()
      const identity = getTierIdentity(tier)
      const label = identity?.label ?? `D${tier}`
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('doomscroll:tap', {
            detail: {
              x: window.innerWidth / 2,
              y: window.innerHeight * 0.35,
              text: `📺 ${label}`,
              color: '#22d3ee',
              big: true
            }
          })
        )
        window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'soft' } }))
      }
    },

    // Akış Sıçraması (Dimension Shift / Boost)
    dimensionShift(playSound = true): boolean {
      if (!this.canShift) return false

      const capBefore = resolvedUnlockedDimensionCount(this)
      this.dimensionShifts++
      // ADR-0035: açılışları ve yüksek su seviyelerini dopamin sıfırlanmadan hemen
      // önce kaydet. `syncUnlocks()` sayacı da okuduğu için 5. sıçrama eşiği de
      // burada kalıcılaşır; son 0.5 sn'de aşılan basamaklar yeniden kilitlenmez.
      this.syncUnlocks()
      const capAfter = resolvedUnlockedDimensionCount(this)
      if (capAfter > capBefore) {
        this.celebrateFormatUnlock(capAfter)
      }

      this.matter = this.achievementStartingMatter
      this.dimensions.forEach((d) => {
        d.amount = new Decimal(0)
        d.bought = 0
      })
      this.tickspeedBought = 0
      // Optimizatör rampası sıfırlanır (matter reset'i yeni koşu başlatır)
      this.singularityBotSamples = []
      this.singularityDecelStreak = 0
      this.singularityRunSeconds = 0
      this.singularitySampleAcc = 0
      // Challenge sayaç kancaları (salt-okunur: koşu mantığına dokunmaz) —
      // C3 üstel sayaç sıfırlanır, C8 bildirim sayacı %40 temizlenir.
      this.relieveChallengeOnPrestige()

      if (playSound) {
        sounds.playShift()
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#a855f7', '#ec4899', '#06b6d4']
        })
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('doomscroll:macro-surge', {
            detail: {
              type: 'shift',
              title: `AKIŞ SIÇRAMASI #${this.dimensionShifts}`,
              unlockedDims: capAfter,
              multiplierText: `×${format(this.shiftPowerMultiplier, 1, this.settings.notation)} GÜÇ`
            }
          })
        )
      }
      return true
    },

    // Sonsuz Akış Kümeleri Yaratımı
    buyGalaxy(playSound = true): boolean {
      if (!this.canBuyGalaxy) return false

      // ADR-0035: küme dopamini ve sıçrama sayacını sıfırlar — önce açılışları kaydet.
      this.syncUnlocks()

      this.galaxies++
      this.dimensionShifts = 0
      this.matter = this.achievementStartingMatter
      this.dimensions.forEach((d) => {
        d.amount = new Decimal(0)
        d.bought = 0
      })
      this.tickspeedBought = 0
      // Optimizatör rampası sıfırlanır (matter reset'i yeni koşu başlatır)
      this.singularityBotSamples = []
      this.singularityDecelStreak = 0
      this.singularityRunSeconds = 0
      this.singularitySampleAcc = 0
      // Challenge sayaç kancaları (C3 sıfırlama + C8 %40 temizleme).
      this.relieveChallengeOnPrestige()

      if (playSound) {
        sounds.playGalaxy()
        confetti({
          particleCount: 90,
          spread: 100,
          origin: { y: 0.8 },
          colors: ['#38bdf8', '#818cf8', '#c084fc']
        })
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('doomscroll:macro-surge', {
            detail: {
              type: 'galaxy',
              title: `SONSUZ AKIŞ KÜMESİ #${this.galaxies}`,
              unlockedDims: resolvedUnlockedDimensionCount(this),
              multiplierText: `-%${this.galaxies * 2} FREKANS MALİYETİ`
            }
          })
        )
      }
      return true
    },

    // Koşu sıfırlama alt-kümesi (singularityReset gövdesinden çıkarıldı):
    // SP bloğu hariç her şey — challenge giriş/çıkış/tamamlama SP vermeden
    // yalnızca bunu çağırır. dimensionShift()/buyGalaxy() gövdelerine dokunulmaz.
    resetRunState(): void {
      // ADR-0035: şafak çöküşü / meydan okuma girişi de dopamini sıfırlar.
      // Tek burada çağrıldığı için dört yol (singularityReset, enterChallenge,
      // exitChallenge, completeChallenge) tek kancayla korunur.
      this.syncUnlocks()

      this.matter = this.achievementStartingMatter
      this.dimensions.forEach((d) => {
        d.amount = new Decimal(0)
        d.bought = 0
      })
      this.tickspeedBought = 0
      this.dimensionShifts = 0
      this.galaxies = 0
      this.slackers = []
      this.sacrificeCount = 0
      this.sacrificeMultiplier = new Decimal(1)
      // Not: neuralBots / napCount / napMultiplier KALICI — Toplu Uyku çarpanı prestijden sağ kalır.

      // Geçici koşu buff'ları, anomaliler ve kriz debuff'ları temizlenir (Challenge'lara sızıntı önlenir)
      this.activeBuffs = []
      this.floatingAnomalies = []
      this.anomalyTimer = 0
      this.crisisBackfireDebuff = 0
      this.isViralActive = false
      this.viralTimeRemaining = 0
      this.viralViews = 0

      // Nöral Ağaç: hariç seçim (choiceGroup) düğümleri her Şafak'ta yeniden seçilebilir;
      // Harcanmış olan SP oyuncunun havuzuna eksiksiz iade edilir (SP yanması/kaybı engellenir).
      const choiceNodes = NEURAL_TREE.filter((n) => n.choiceGroup)
      const choiceNodeIds = choiceNodes.map((n) => n.id)
      const remainingNodes: Record<string, number> = {}
      let refundedSp = 0
      Object.entries(this.neuralNodesBought || {}).forEach(([nodeId, lvl]) => {
        if (choiceNodeIds.includes(nodeId) && lvl > 0) {
          const node = choiceNodes.find((n) => n.id === nodeId)
          if (node) refundedSp += node.cost * lvl
        } else {
          remainingNodes[nodeId] = lvl
        }
      })
      this.neuralNodesBought = remainingNodes
      if (refundedSp > 0) {
        this.singularityPoints = this.singularityPoints.plus(refundedSp)
      }

      // Optimizatör rampası sıfırlanır: yeni koşu örnekleme temiz başlar
      this.singularityBotSamples = []
      this.singularityDecelStreak = 0
      this.singularityRunSeconds = 0
      this.singularitySampleAcc = 0

      // ADR-0034: Dekad Yükselişi koşuya özeldir — şafakta (ve challenge girişinde) düşer.
      this.decadeSurgeMult = 1
    },

    // Sabah 06:00 Çöküşü (Tekillik Prestiji)
    // playSound=false → Şafak Nöbeti Botu sessiz çöküşü (confeti/ses yok)
    singularityReset(playSound = true): boolean {
      if (this.activeChallenge) {
        return this.completeChallenge()
      }
      if (!this.canSingularity) return false

      const gain = this.singularityGain
      const duration = this.singularityRunSeconds
      this.singularityPoints = this.singularityPoints.plus(gain)
      this.singularities++
      this.stats.singularityCount++

      // Bug Fix: en hızlı çöküş süresini kaydet
      if (!Number.isFinite(this.stats.fastestSingularity) || duration < this.stats.fastestSingularity) {
        this.stats.fastestSingularity = duration
      }

      // Telemetri: Son 10 Gece Günlüğü (Past 10)
      const spPerMin = duration > 0 ? gain.div(duration / 60) : gain
      this.pastSingularities.unshift({
        id: this.singularities,
        duration,
        spGained: gain,
        spPerMinute: spPerMin,
        peakMatter: this.stats.highestMatter,
        timestamp: Date.now(),
        challengeId: null
      })
      if (this.pastSingularities.length > 10) {
        this.pastSingularities.pop()
      }

      this.resetRunState()

      if (playSound) {
        sounds.playSingularity()
        confetti({
          particleCount: 180,
          spread: 120,
          origin: { y: 0.5 },
          colors: ['#f59e0b', '#06b6d4', '#ec4899', '#ffffff']
        })
      }
      return true
    },

    // ---- Gece Kriz Meydan Okumaları (Faz 1: Motor) ----
    // ConfirmModal onayı Faz 2'de eklenecek; şimdilik doğrudan giriş.
    enterChallenge(id: string): boolean {
      const def = getChallengeById(id)
      if (!def) return false
      if (this.activeChallenge === id) return false
      if (this.completedChallenges.includes(id)) return false
      if (def.unlock && !checkUnlock(this.unlockContext, { id, name: def.name, hint: '', req: def.unlock, order: def.order })) {
        return false
      }
      this.resetRunState()
      this.activeChallenge = id
      this.challengeElapsed = 0
      this.challengeHaltUntil = 0
      this.challengeSinceBuy = 9999
      this.challengeCostInflation = 0
      this.challengeNotificationDoom = 0
      this.challengeDim1Growth = new Decimal(1)
      sounds.playUpgrade()
      return true
    },

    // Cezasız vazgeç: koşu sıfırlanır, sayaçlar temizlenir, ödül yok.
    exitChallenge(): boolean {
      if (!this.activeChallenge) return false
      this.resetRunState()
      this.activeChallenge = null
      this.challengeElapsed = 0
      this.challengeHaltUntil = 0
      this.challengeSinceBuy = 9999
      this.challengeCostInflation = 0
      this.challengeNotificationDoom = 0
      this.challengeDim1Growth = new Decimal(1)
      return true
    },

    // Hedefe ulaşınca (challengeGoalReached) çağrılır: süre kaydı + ödül + temiz fresh koşu.
    completeChallenge(): boolean {
      if (!this.activeChallenge) return false
      if (!this.challengeGoalReached) return false
      const id = this.activeChallenge
      const elapsed = this.challengeElapsed
      if (!this.completedChallenges.includes(id)) {
        this.completedChallenges.push(id)
      }
      const prevBest = this.challengeBestTimes[id]
      if (typeof prevBest !== 'number' || elapsed < prevBest) {
        this.challengeBestTimes[id] = elapsed
      }
      this.stats.challengesCompleted = (this.stats.challengesCompleted || 0) + 1

      // Telemetri: Meydan okuma çöküşünü geçmişe kaydet
      this.pastSingularities.unshift({
        id: this.singularities,
        duration: elapsed,
        spGained: D_0,
        spPerMinute: D_0,
        peakMatter: this.stats.highestMatter,
        timestamp: Date.now(),
        challengeId: id
      })
      if (this.pastSingularities.length > 10) {
        this.pastSingularities.pop()
      }

      this.resetRunState()
      this.activeChallenge = null
      this.challengeElapsed = 0
      this.challengeHaltUntil = 0
      this.challengeSinceBuy = 9999
      this.challengeCostInflation = 0
      this.challengeNotificationDoom = 0
      this.challengeDim1Growth = new Decimal(1)
      sounds.playSingularity()
      confetti({
        particleCount: 180,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#06b6d4', '#ec4899', '#ffffff']
      })
      return true
    },

    // Şafak Nöbeti Botu tetik koşulu (marjinal kazanç optimizatörü):
    // tekillik eşiği aşıldı + kazanç tabanı geçti + koşu yeterince uzun
    // ve marjinal log10(matter) büyümesi 3 saniyedir koşu ortalamasına oturmuş
    // (rampa tükendi — beklemenin getirisi kalmadı).
    shouldAutoSingularity(): boolean {
      const bot = this.autobuyers.singularity
      if (!bot || !bot.unlocked || !bot.enabled) return false
      if (!this.canSingularity) return false
      const minGain = bot.minGainSp && bot.minGainSp > 0 ? bot.minGainSp : 1
      if (this.singularityGain.lt(minGain)) return false
      if (this.singularityRunSeconds < 10) return false
      return this.singularityDecelStreak >= 3
    },

    // Algoritma Stüdyosu: Modülü Matrise Yerleştir (Boş hücreye ek veya mevcut olanı değiştir)
    plantSeed(cellId: number, seedType: LabSeedType): boolean {
      const cell = this.labCells[cellId]
      if (!cell) return false
      if (cell.seedType === seedType && cell.isMature) return false

      const seedDef = LAB_SEEDS.find((s) => s.type === seedType)
      if (!seedDef) return false
      if (this.matter.lt(seedDef.cost)) return false

      this.matter = this.matter.minus(seedDef.cost)
      cell.seedType = seedType
      cell.age = 0
      cell.matureAge = seedDef.growthSeconds
      cell.maxAge = Infinity
      cell.isMature = false
      this.stats.seedsPlanted = (this.stats.seedsPlanted || 0) + 1

      sounds.playPlant()
      return true
    },

    // Algoritma Stüdyosu: Olgun Hücreden Anlık Verim & Hype Topla (Modülü silmez, tekrar ısınır!)
    harvestCell(cellId: number): boolean {
      const cell = this.labCells[cellId]
      if (!cell || !cell.seedType || !cell.isMature) return false

      let reward = D_0
      const currentPerSec = this.matterPerSecond
      const clickPwr = this.manualClickPower

      if (cell.seedType === 'cat_audio') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(10) : clickPwr.times(50)
      } else if (cell.seedType === 'cheese_sizzle') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(20) : clickPwr.times(200)
      } else if (cell.seedType === 'subway_beat') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(30) : clickPwr.times(500)
      } else if (cell.seedType === 'sigma_phonk') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(40) : clickPwr.times(1500)
      } else if (cell.seedType === 'mukbang_drama') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(50) : clickPwr.times(2500)
      } else if (cell.seedType === 'cat_burger') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(60) : clickPwr.times(3500)
      } else if (cell.seedType === 'drift_tok') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(90) : clickPwr.times(4500)
      } else if (cell.seedType === 'brainrot_remix') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(120) : clickPwr.times(10000)
      }

      reward = reward.times(this.achievementLabYield)

      this.matter = this.matter.plus(reward)
      this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(reward)
      this.stats.labHarvests = (this.stats.labHarvests || 0) + 1

      // Hype barına +2.5% taktil katkı
      if (this.labMode !== 'evergreen' && !this.isViralActive) {
        this.labHype = Math.min(100, this.labHype + 2.5)
      }

      // Modül silinmez! Rezonansını tazeleyip tekrar ısınır
      cell.age = 0
      cell.isMature = false

      sounds.playHarvest()
      confetti({
        particleCount: 45,
        spread: 55,
        origin: { y: 0.6 },
        colors: ['#10b981', '#06b6d4', '#ec4899']
      })
      return true
    },

    // Algoritma Stüdyosu: Hücreyi Boşalt
    clearCell(cellId: number): void {
      const cell = this.labCells[cellId]
      if (!cell) return
      cell.seedType = null
      cell.age = 0
      cell.isMature = false
      sounds.playGuiltClick()
    },

    // Algoritma Stüdyosu: Algoritma Zemin Modunu Değiştir
    setLabMode(mode: LabMode): void {
      if (this.labMode === mode) return
      this.labMode = mode
      sounds.playHapticTap()
    },

    // Trend Reaktörü: Akışa Fırlat! (Viral Drop)
    triggerViralDrop(): boolean {
      if (this.labHype < 100 || this.isViralActive) return false

      let reward = this.matterPerSecond.gt(0)
        ? this.matterPerSecond.times(60)
        : this.manualClickPower.times(200)

      if (this.labMode === 'fyp') {
        reward = reward.times(2.0)
      }
      reward = reward.times(this.achievementLabYield)

      this.matter = this.matter.plus(reward)
      this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(reward)
      this.stats.labHarvests = (this.stats.labHarvests || 0) + 3

      this.isViralActive = true
      this.viralTimeRemaining = 25
      this.viralViews = 65000
      this.labHype = 0

      sounds.playViralDrop()
      confetti({
        particleCount: 160,
        spread: 110,
        origin: { y: 0.55 },
        colors: ['#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ffffff']
      })
      return true
    },

    // Gece Kriz Yönetimi: Kriz Kararı Al
    castSpell(spellId: CrisisSpellType): boolean {
      const spell = CRISIS_SPELLS.find((s) => s.id === spellId)
      if (!spell) return false
      if (spellId === 'fast_charge' && this.floatingAnomalies.length >= 2) return false
      if (this.caffeineEnergy < spell.energyCost) return false

      this.caffeineEnergy -= spell.energyCost
      this.stats.spellsCast = (this.stats.spellsCast || 0) + 1

      // Backfire Kontrolü
      if (Math.random() < spell.backfireChance) {
        sounds.playBackfire()
        if (spellId === 'fast_charge') {
          this.crisisBackfireDebuff = 15
        } else if (spellId === 'espresso_shot') {
          this.caffeineEnergy = 0
        } else if (spellId === 'sleep_denial') {
          for (let i = 0; i < 3; i++) {
            this.spawnSlacker()
          }
        }
        return false
      }

      // Başarılı Karar Etkileri
      sounds.playCrisisDecision()
      if (spellId === 'fast_charge') {
        if (!this.spawnAnomaly()) {
          this.caffeineEnergy += spell.energyCost
          this.stats.spellsCast--
          return false
        }
      } else if (spellId === 'espresso_shot') {
        const espressoSecs = Math.floor(30 * this.achievementBuffDuration)
        const existing = this.activeBuffs.find((b) => b.type === 'espresso')
        if (existing) {
          existing.remaining += espressoSecs
          existing.duration += espressoSecs
        } else {
          this.activeBuffs.push({
            id: `buff-espresso-${Date.now()}`,
            type: 'espresso',
            name: '☕ Çift Espresso (3× Frekans)',
            duration: espressoSecs,
            remaining: espressoSecs,
            multiplier: 3
          })
        }
      } else if (spellId === 'noise_cancelling') {
        const immunityLvl = this.singularityUpgrades?.guilt_immunity || 0
        const refundRatio = Math.max(1.2, (1.05 + immunityLvl * 0.15) * this.neuralEffects.crisisRewardMult)
        this.slackers.forEach((s) => {
          const refund = s.leechedDopamine.times(refundRatio)
          this.matter = this.matter.plus(refund)
          this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(refund)
          this.stats.slackersFired++
        })
        this.slackers = []
        sounds.playSilenceGuilt()
      } else if (spellId === 'sleep_denial') {
        const curSec = this.matterPerSecond
        const blast = curSec.gt(0) ? curSec.times(60) : this.manualClickPower.times(2000)
        this.matter = this.matter.plus(blast)
        this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(blast)
      }

      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#a855f7', '#06b6d4', '#ec4899', '#f59e0b']
      })
      return true
    },

    // Otomatik Bot Aç/Kapa
    toggleAutobuyer(id: string): void {
      const bot = this.autobuyers[id]
      if (!bot || !bot.unlocked) return
      bot.enabled = !bot.enabled
      sounds.playToggleBot()
    },

    // Otomatik Bot Kilidini Aç (her zaman tekli modda başlar)
    unlockAutobuyer(id: string): boolean {
      const bot = this.autobuyers[id]
      if (!bot || bot.unlocked) return false
      if (!this.isAutobuyerRequirementMet(id)) return false

      const cost = AUTOBUYER_COSTS[id] || new Decimal(1e6)
      if (this.matter.gte(cost)) {
        this.matter = this.matter.minus(cost)
        bot.unlocked = true
        bot.enabled = true
        bot.mode = 'single'
        bot.interval = getAutobuyerInterval(id, 'single')
        bot.timer = 0
        sounds.playBuy(3)
        return true
      }
      return false
    },

    // Toplu modu global aç (tüm botlar için bulk seçilebilir olur)
    unlockBulkMode(): boolean {
      if (this.autobuyerBulkUnlocked) return false
      if (!this.canUnlockBulk) return false
      this.matter = this.matter.minus(AUTOBUYER_BULK_COST)
      this.autobuyerBulkUnlocked = true
      sounds.playBuy(3)
      return true
    },

    // Max modu global aç (bulk açık olmalı + galaxy ister)
    unlockMaxMode(): boolean {
      if (this.autobuyerMaxUnlocked) return false
      if (!this.canUnlockMax) return false
      this.matter = this.matter.minus(AUTOBUYER_MAX_COST)
      this.autobuyerMaxUnlocked = true
      sounds.playBuy(4)
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#a855f7', '#ffffff']
      })
      return true
    },

    // Bot modunu değiştir (bulk/max kilitliyse izin verme)
    setAutobuyerMode(id: string, mode: AutobuyerMode): boolean {
      const bot = this.autobuyers[id]
      if (!bot || !bot.unlocked) return false
      if (mode === 'bulk' && !this.autobuyerBulkUnlocked) return false
      if (mode === 'max' && !this.autobuyerMaxUnlocked) return false
      bot.mode = mode
      bot.interval = getAutobuyerInterval(id, mode)
      bot.timer = 0
      sounds.playToggleBot()
      return true
    },

    // Kalıcı Uykusuzluk Dükkanı: Yükseltme Satın Al
    buySingularityUpgrade(id: string): boolean {
      const upg = SINGULARITY_UPGRADES.find((u) => u.id === id)
      if (!upg) return false

      const currentLvl = this.singularityUpgrades[id] || 0
      if (currentLvl >= upg.maxLevel) return false

      const cost = Math.floor(upg.baseCost * Math.pow(upg.costMult, currentLvl) * this.achievementSpDiscount)
      if (this.singularityPoints.gte(cost)) {
        this.singularityPoints = this.singularityPoints.minus(cost)
        this.singularityUpgrades[id] = currentLvl + 1
        // Nöral Ağaç'a yerleştirilen eski id'lerde iki kayıt senkron tutulur
        if (NEURAL_LEGACY_UPGRADE_IDS.has(id)) {
          this.neuralNodesBought = { ...this.neuralNodesBought, [id]: currentLvl + 1 }
        }
        sounds.playBuy(4)
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#f59e0b', '#a855f7', '#06b6d4']
        })
        return true
      }
      return false
    },

    // Nöral Ağaç: Düğüm Satın Al (SP harcar, öncül zinciri ve hariç seçim kilidini denetler)
    buyNeuralNode(id: string): boolean {
      const node = NEURAL_TREE.find((n) => n.id === id)
      if (!node) return false

      const bought = this.neuralNodesBought || {}
      const maxLevel = node.maxLevel ?? 1
      // Eski dükkân id'lerinde iki kayıt birleşik seviye taşır; maliyet birleşik seviyeye göre hesaplanır
      const legacyLvl = NEURAL_LEGACY_UPGRADE_IDS.has(id) ? this.singularityUpgrades?.[id] || 0 : 0
      const currentLvl = Math.max(bought[id] || 0, legacyLvl)
      if (currentLvl >= maxLevel) return false

      // Öncül zinciri: tüm requires düğümleri satın alınmış olmalı
      for (const reqId of node.requires) {
        if ((bought[reqId] || 0) < 1) return false
      }

      // Hariç seçim kilidi: aynı choiceGroup'tan kardeş alınmışsa satış kapalıdır
      if (node.choiceGroup) {
        const siblingLocked = NEURAL_TREE.some(
          (n) => n.choiceGroup === node.choiceGroup && n.id !== id && (bought[n.id] || 0) > 0
        )
        if (siblingLocked) return false
      }

      const cost = Math.floor(node.cost * Math.pow(node.costMult ?? 1, currentLvl) * this.achievementSpDiscount)
      if (this.singularityPoints.lt(cost)) return false

      this.singularityPoints = this.singularityPoints.minus(cost)
      this.neuralNodesBought = { ...bought, [id]: currentLvl + 1 }
      // Eski dükkân id'leri: etki bağlantıları singularityUpgrades okuduğu için kayıt senkronlanır
      if (NEURAL_LEGACY_UPGRADE_IDS.has(id)) {
        this.singularityUpgrades[id] = currentLvl + 1
      }
      sounds.playBuy(4)
      return true
    },

    // Gece Krizi Doğur (Spawn Anomaly) — ağırlıklı RNG + pity + mobil güvenli konum
    spawnAnomaly(): boolean {
      if (this.floatingAnomalies.length >= 2) {
        // Ekran doygunken timer'ı sıfırla; slot açılınca anlık pop-up yağmuru başlamasın
        this.anomalyTimer = 0
        return false
      }

      // Ağırlıklı tablo: fyp %42 / heart %32 / sponsor %21 / void %5
      // Pity: 25 void'suz spawn sonrası void garanti (koleksiyon hissi korunur)
      let chosenType: AnomalyType
      if ((this.mythicPity || 0) >= 25) {
        chosenType = 'void'
      } else {
        const roll = Math.random() * 100
        if (roll < 42) chosenType = 'fyp'
        else if (roll < 74) chosenType = 'heart_frenzy'
        else if (roll < 95) chosenType = 'sponsor'
        else chosenType = 'void'
      }
      if (chosenType === 'void') {
        this.mythicPity = 0
      } else {
        this.mythicPity = (this.mythicPity || 0) + 1
      }

      let title = ''
      let desc = ''
      let lifetime = 14
      if (chosenType === 'fyp') {
        title = 'Gece 3 Çılgınlığı!'
        desc = '60 saniyeliğine tüm dopamin akışını 7× katlar!'
      } else if (chosenType === 'heart_frenzy') {
        title = 'Başparmak Histerisi!'
        desc = '15 saniyeliğine Yukarı Kaydırma gücünü 300× fırlatır!'
      } else if (chosenType === 'void') {
        title = 'Void Reel Tekilliği!'
        desc = 'Garanti kombo: 30sn 7× + 15sn 300× aynı anda!'
        lifetime = 9
      } else {
        title = '50 Milyonluk Viral Video!'
        desc = 'Anında 2 dakikalık saf dopamin doğrudan beyne akar!'
      }

      // Mobil güvenli spawn: dar ekranda kart (max 86vw) taşmasın
      const isNarrow = typeof window !== 'undefined' && window.innerWidth < 640
      const x = isNarrow
        ? Math.floor(Math.random() * 32) + 30
        : Math.floor(Math.random() * 48) + 26
      const y = Math.floor(Math.random() * 50) + 24

      this.floatingAnomalies.push({
        id: `anomaly-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: chosenType,
        x,
        y,
        remainingTime: lifetime,
        totalTime: lifetime,
        title,
        desc
      })

      sounds.playAnomalySpawn(chosenType)

      const baseInterval = 65 + Math.random() * 30
      const mutedLvl = this.singularityUpgrades?.muted_alerts || 0
      const alertDiscount = Math.max(0.4, 1 - mutedLvl * 0.12)
      // Lab/stance çarpanları birikerek saniyeler aralığı kaydırmıştı; rate çarpanını
      // 2.5× ile sınırla ve minimum aralık koy ki pop-up yağmuru oluşmasın
      const rateMult = Math.min(
        2.5,
        this.stanceMultipliers.anomalyRate *
          this.labAnomalyMultiplier *
          tierAnomalyRateMult(this.dimensions, this.unlockedDimensionsCount)
      )
      this.nextAnomalyInterval = Math.max(40, (baseInterval * alertDiscount * this.achievementAnomalyFactor) / rateMult)
      this.anomalyTimer = 0
      return true
    },

    // Gece Krizine Tıkla (Collect Golden Buff)
    clickAnomaly(anomalyId: string): void {
      const index = this.floatingAnomalies.findIndex((a) => a.id === anomalyId)
      if (index === -1) return

      const anomaly = this.floatingAnomalies[index]
      this.floatingAnomalies.splice(index, 1)
      this.stats.anomaliesClicked++
      if (anomaly.type === 'void') {
        this.stats.mythicsClicked = (this.stats.mythicsClicked || 0) + 1
      }
      const durMult = this.achievementBuffDuration

      if (anomaly.type === 'fyp') {
        const existing = this.activeBuffs.find((b) => b.type === 'fyp')
        if (existing) {
          existing.remaining += 60 * durMult
        } else {
          this.activeBuffs.push({
            id: `buff-fyp-${Date.now()}`,
            type: 'fyp',
            name: '🔥 Gece 3 Çılgınlığı (7× Dopamin)',
            duration: Math.floor(60 * durMult),
            remaining: Math.floor(60 * durMult),
            multiplier: 7
          })
        }
      } else if (anomaly.type === 'heart_frenzy') {
        const existing = this.activeBuffs.find((b) => b.type === 'heart_frenzy')
        if (existing) {
          existing.remaining += 15 * durMult
        } else {
          this.activeBuffs.push({
            id: `buff-frenzy-${Date.now()}`,
            type: 'heart_frenzy',
            name: '👆 Başparmak Histerisi (300× Kaydır)',
            duration: Math.floor(15 * durMult),
            remaining: Math.floor(15 * durMult),
            multiplier: 300
          })
        }
      } else if (anomaly.type === 'void') {
        // Void Reel: garanti kombo — 30sn 7× üretim + 15sn 300× kaydırma
        const fyp = this.activeBuffs.find((b) => b.type === 'fyp')
        if (fyp) {
          fyp.remaining += 30 * durMult
        } else {
          this.activeBuffs.push({
            id: `buff-fyp-void-${Date.now()}`,
            type: 'fyp',
            name: '🔥 Gece 3 Çılgınlığı (7× Dopamin)',
            duration: Math.floor(30 * durMult),
            remaining: Math.floor(30 * durMult),
            multiplier: 7
          })
        }
        const frenzy = this.activeBuffs.find((b) => b.type === 'heart_frenzy')
        if (frenzy) {
          frenzy.remaining += 15 * durMult
        } else {
          this.activeBuffs.push({
            id: `buff-frenzy-void-${Date.now()}`,
            type: 'heart_frenzy',
            name: '👆 Başparmak Histerisi (300× Kaydır)',
            duration: Math.floor(15 * durMult),
            remaining: Math.floor(15 * durMult),
            multiplier: 300
          })
        }
      } else if (anomaly.type === 'sponsor') {
        const currentPerSec = this.matterPerSecond
        const instantReward = currentPerSec.gt(0)
          ? currentPerSec.times(120)
          : this.manualClickPower.times(300)

        this.matter = this.matter.plus(instantReward)
        this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(instantReward)
      }

      if (this.isComboActive) {
        this.stats.combosTriggered++
        sounds.playCombo()
        confetti({
          particleCount: anomaly.type === 'void' ? 160 : 130,
          spread: 100,
          origin: { y: 0.4 },
          colors: anomaly.type === 'void'
            ? ['#c084fc', '#22d3ee', '#f0abfc', '#ffffff']
            : ['#a855f7', '#ec4899', '#06b6d4', '#f59e0b']
        })
      } else if (anomaly.type === 'void') {
        sounds.playMythicCollect()
        confetti({
          particleCount: 90,
          spread: 85,
          origin: { x: anomaly.x / 100, y: anomaly.y / 100 },
          colors: ['#c084fc', '#22d3ee', '#ffffff']
        })
      } else {
        sounds.playCrisisCollect(anomaly.type)
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { x: anomaly.x / 100, y: anomaly.y / 100 },
          colors: ['#a855f7', '#ec4899']
        })
      }
    },

    // Vicdan Azabı Doğur (Spawn Guilt / Wrinkler)
    spawnSlacker(): void {
      if (this.slackers.length >= 5) return

      const randomName = GUILT_NAMES[Math.floor(Math.random() * GUILT_NAMES.length)]
      this.slackers.push({
        id: `guilt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: randomName,
        leechedDopamine: new Decimal(0),
        clicksRemaining: 3
      })
    },

    // Vicdan Azabına Tıkla ("Sadece 1 Video Daha!")
    clickSlacker(slackerId: string): void {
      const index = this.slackers.findIndex((s) => s.id === slackerId)
      if (index === -1) return

      const slacker = this.slackers[index]
      slacker.clicksRemaining--

      if (slacker.clicksRemaining <= 0) {
        const immunityLvl = this.singularityUpgrades?.guilt_immunity || 0
        // Nöral Ağaç: Kriz Ganimeti / Demir Sabır düğümleri prim çarpanını büyütür
        const refundRatio = (1.05 + immunityLvl * 0.15) * this.neuralEffects.crisisRewardMult
        const refund = slacker.leechedDopamine.times(refundRatio)

        this.matter = this.matter.plus(refund)
        this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(refund)
        this.stats.slackersFired++

        this.slackers.splice(index, 1)
        sounds.playSilenceGuilt()

        confetti({
          particleCount: 45,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#a855f7', '#06b6d4', '#ffffff']
        })
      } else {
        sounds.playGuiltClick()
      }
    },

    // ---- Başarım Kontrol Motoru (update() sonunda çalışır; offline'da da tetiklenir) ----
    checkAchievements(): void {
      if (this.achievements.length >= ACHIEVEMENTS.length) return
      const unlocked = new Set(this.achievements)
      const ctx: AchievementContext = {
        manualClicks: this.stats.manualClicks,
        totalMatter: this.stats.totalMatterProduced,
        highestMatter: this.stats.highestMatter,
        matter: this.matter,
        playtime: this.stats.totalPlaytime,
        singularityCount: this.stats.singularityCount,
        anomaliesClicked: this.stats.anomaliesClicked,
        mythicsClicked: this.stats.mythicsClicked || 0,
        combosTriggered: this.stats.combosTriggered,
        slackersFired: this.stats.slackersFired,
        labHarvests: this.stats.labHarvests || 0,
        spellsCast: this.stats.spellsCast || 0,
        seedsPlanted: this.stats.seedsPlanted || 0,
        tickspeedBought: this.tickspeedBought,
        shifts: this.dimensionShifts,
        galaxies: this.galaxies,
        sp: this.singularityPoints,
        spUpgradesTotal: (() => {
          const allKeys = new Set([
            ...Object.keys(this.singularityUpgrades || {}),
            ...Object.keys(this.neuralNodesBought || {})
          ])
          let total = 0
          for (const k of allKeys) {
            total += Math.max(this.singularityUpgrades[k] || 0, this.neuralNodesBought[k] || 0)
          }
          return total
        })(),
        guiltImmunityLvl: Math.max(
          this.singularityUpgrades?.guilt_immunity || 0,
          this.neuralNodesBought?.guilt_immunity || 0
        ),
        dimBoughtTotal: this.dimensions.reduce((a, d) => a + d.bought, 0),
        dimBought0: this.dimensions[0]?.bought || 0,
        unlockedBots: Object.values(this.autobuyers).filter((b) => b.unlocked).map((b) => b.id),
        bulkUnlocked: this.autobuyerBulkUnlocked,
        maxUnlocked: this.autobuyerMaxUnlocked,
        neuralBots: this.neuralBots,
        napCount: this.napCount,
        matureCells: this.labCells.filter((c) => c.isMature && !!c.seedType).length,
        hasBrainrot: this.labCells.some((c) => c.seedType === 'brainrot_remix'),
        hasMatureBrainrot: this.labCells.some((c) => c.seedType === 'brainrot_remix' && c.isMature),
        activeSlackers: this.slackers.length,
        leechedTotal: this.slackers.reduce((a, s) => a.plus(s.leechedDopamine), D_0),
        wallHour: new Date().getHours(),
        completedChallenges: [...this.completedChallenges]
      }

      let newCount = 0
      let unlockedAnyReward = false
      let completedRow = false

      ACHIEVEMENTS.forEach((def) => {
        if (unlocked.has(def.id)) return
        if (!def.check(ctx)) return
        this.achievements.push(def.id)
        unlocked.add(def.id)
        newCount++
        this.achievementToastQueue.push(def.id)
        if (this.achievementToastQueue.length > 5) {
          this.achievementToastQueue.shift()
        }
        if (def.reward) unlockedAnyReward = true
        // ADR-0029: kategori indeksi modül yükünde bir kez kurulur. Önceden
        // ACHIEVEMENTS.filter() her adayın İÇİNDE çalışıyordu (O(n²) ≈ 4.4k
        // karşılaştırma, 0.5 sn'de bir).
        const catDefs = ACHIEVEMENTS_BY_CATEGORY.get(def.category) ?? [def]
        if (catDefs.every((a) => a.id === def.id || unlocked.has(a.id))) {
          completedRow = true
        }
      })

      if (newCount === 0) return
      // QoL: çevrimdışı simülasyonda ses/konfeti çalmaz (yükleme ekranında patlamasın)
      if (this.offlineSimActive) return
      if (completedRow) {
        sounds.playSingularity()
        confetti({
          particleCount: 130,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#f59e0b', '#a855f7', '#06b6d4', '#ffffff']
        })
      } else if (unlockedAnyReward) {
        sounds.playCombo()
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#a855f7', '#06b6d4']
        })
      } else {
        sounds.playAnomaly()
      }
    },

    markAchievementsSeen(): void {
      this.achievementsSeenCount = this.achievements.length
    },

    dismissAchievementToast(id: string): void {
      const i = this.achievementToastQueue.indexOf(id)
      if (i !== -1) this.achievementToastQueue.splice(i, 1)
    },

    // Özellik Merdiveni: hayat boyu yüksek su seviyelerini yükselt ve
    // sağlanan kilitleri yapışkan (sticky) olarak kaydet.
    //
    // ADR-0035 — bu action TEK YAZIM YOLUDUR. Üç yerden çağrılır:
    //   1) update() döngüsünde UNLOCK_CHECK_INTERVAL seyreltisiyle,
    //   2) dimensionShift() / buyGalaxy() — dopamin sıfırlanmadan hemen önce,
    //   3) resetRunState() — şafak çöküşü, meydan okuma giriş/çıkış/tamamlama.
    // (2) ve (3) olmazsa Şafak Nöbeti Botu'nun otomatik sıçraması ya da 0.5 sn'lik
    // senkron penceresi, kapı eşiği aşıldığı anda listeyi yazmadan reseti
    // tetikleyebilir ve açılım kaybolurdu.
    syncUnlocks(): void {
      // Su seviyeleri yükselir (monotonik, asla inmez).
      this.lifetimePeakMatter = raisedLifetimePeak(this.lifetimePeakMatter, this.matter)
      if (this.dimensionShifts > this.lifetimePeakShifts) {
        this.lifetimePeakShifts = this.dimensionShifts
      }
      if (this.unlockedFeatures.length >= FEATURE_UNLOCKS.length) return
      for (const feature of FEATURE_UNLOCKS) {
        if (this.unlockedFeatures.includes(feature.id)) continue
        if (checkUnlock(this.unlockContext, feature)) {
          this.unlockedFeatures.push(feature.id)
        }
      }
    },

    // Çekirdek Simülasyon Döngüsü
    update(deltaSeconds: number): void {
      if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return

      // 0. Özellik Merdiveni senkronizasyonu (yapışkan kilitlemeler — 0.5 sn seyreltilir).
      // ADR-0035: tepe noktalar merdiven tamamlandıktan sonra da yükselmeye devam eder,
      // bu yüzden "hepsi açıldı" durumunda erken çıkma YOK.
      this.unlockCheckAcc += deltaSeconds
      if (this.unlockCheckAcc >= UNLOCK_CHECK_INTERVAL) {
        this.unlockCheckAcc = 0
        this.syncUnlocks()
      }

      // G2: Challenge hedefi sağlandığında otomatik tamamla.
      if (this.activeChallenge && this.challengeGoalReached) {
        this.completeChallenge()
        return
      }
      // Aktif challenge koşu sayacı (offline süre dahil — sayaç dürüsttür)
      if (this.activeChallenge) {
        this.challengeElapsed += deltaSeconds
      }

      // G3: challenge koşu-içi sayaçlar (C2 durma+rampa, C3 üstel büyüme, C8 bildirim sayacı).
      // C8 offline'da DONAR (uyuyan oyuncu cezalandırılmaz); diğerleri offline simülasyonda
      // gerçek update() üzerinden otomatik işler.
      {
        const mods = this.activeChallengeDef?.modifiers
        if (mods?.productionHaltOnBuySec !== undefined) {
          if (this.challengeHaltUntil > 0) {
            this.challengeHaltUntil = Math.max(0, this.challengeHaltUntil - deltaSeconds)
          }
          this.challengeSinceBuy += deltaSeconds
        }
        if (mods?.dim1ExpoGrowthPerSec !== undefined) {
          this.challengeDim1Growth = this.challengeDim1Growth.times(
            Math.pow(1 + mods.dim1ExpoGrowthPerSec, deltaSeconds)
          )
        }
        if (mods?.notificationDoomRatePerSec !== undefined && !this.offlineSimActive) {
          const rate =
            mods.notificationDoomRatePerSec *
            (1 + CHALLENGE_DOOM_SHIFT_ACCEL * this.dimensionShifts + CHALLENGE_DOOM_GALAXY_ACCEL * this.galaxies)
          this.challengeNotificationDoom += rate * deltaSeconds
        }
      }

      // 0.5 Combo sönümü: 1.5 sn hareketsizlikte tıklama serisi sıfırlanır
      if (this.clickCombo.count > 0 && Date.now() - this.clickCombo.lastClickAt > COMBO_DECAY_MS) {
        this.clickCombo.count = 0
      }

      // 2. Aktif Buff Sürelerini Azalt
      for (let b = this.activeBuffs.length - 1; b >= 0; b--) {
        this.activeBuffs[b].remaining -= deltaSeconds
        if (this.activeBuffs[b].remaining <= 0) {
          this.activeBuffs.splice(b, 1)
        }
      }

      // 3. Yüzen Anomali Sürelerini Azalt
      for (let a = this.floatingAnomalies.length - 1; a >= 0; a--) {
        this.floatingAnomalies[a].remainingTime -= deltaSeconds
        if (this.floatingAnomalies[a].remainingTime <= 0) {
          this.floatingAnomalies.splice(a, 1)
        }
      }

      // 4. Anomali Doğurma Sayacı (Gece Krizleri: 100 Dopamin ile açılır)
      if (this.isFeatureUnlocked('crisis_spawn')) {
        this.anomalyTimer += deltaSeconds
        if (this.anomalyTimer >= this.nextAnomalyInterval) {
          this.spawnAnomaly()
        }
      }

      // 5. Vicdan Azabı Doğurma Sayacı (Vicdan Azapları: 1M Dopamin ile açılır)
      if (this.isFeatureUnlocked('guilt_slackers')) {
        this.slackerTimer += deltaSeconds
        if (this.slackerTimer >= 40) {
          this.slackerTimer = 0
          if (Math.random() < 0.6) {
            this.spawnSlacker()
          }
        }
      }

      // 6. Algoritma Stüdyosu: Format Isınması & Rezonans (Çürüme yok!)
      this.labCells.forEach((cell) => {
        if (cell.seedType) {
          cell.age += deltaSeconds
          if (cell.age >= cell.matureAge) {
            cell.isMature = true
          }
        }
      })

      if (this.isFeatureUnlocked('lab')) {
        const matureCount = this.labCells.filter((c) => c.isMature && !!c.seedType).length

        // Hype Şarjı (Evergreen modu hariç ve canlı akışta değilken)
        if (this.labMode !== 'evergreen' && !this.isViralActive) {
          const modeMult = this.labMode === 'fyp' ? 1.8 : 1.0
          const rate = (0.35 + matureCount * 0.3) * modeMult
          this.labHype = Math.min(100, this.labHype + deltaSeconds * rate)
        }

        // Canlı Viral Akış Dalgası
        if (this.isViralActive) {
          this.viralTimeRemaining -= deltaSeconds
          const viewsPerSec = 45000 + matureCount * 35000 + (this.labMode === 'fyp' ? 40000 : 0)
          this.viralViews += Math.floor(viewsPerSec * deltaSeconds)

          if (this.viralTimeRemaining <= 0) {
            this.isViralActive = false
            this.viralTimeRemaining = 0
          }
        }

        // Hibrit Formül Sentezleme & Mutasyon Kontrolü
        const synthChance = (this.labMode === 'mutation' ? 0.12 : 0.04) * (this.isViralActive ? 3.0 : 1.0) * deltaSeconds

        // A. Boş hücreye yeni format filizlenmesi
        this.labCells.forEach((cell, idx) => {
          if (cell.seedType === null) {
            const row = Math.floor(idx / 3)
            const col = idx % 3
            const neighborTypes: (LabSeedType | null)[] = []
            const checkNeighbor = (c: LabCell) => (c.isMature ? c.seedType : null)
            if (row > 0) neighborTypes.push(checkNeighbor(this.labCells[idx - 3]))
            if (row < 2) neighborTypes.push(checkNeighbor(this.labCells[idx + 3]))
            if (col > 0) neighborTypes.push(checkNeighbor(this.labCells[idx - 1]))
            if (col < 2) neighborTypes.push(checkNeighbor(this.labCells[idx + 1]))

            for (const recipe of LAB_RECIPES) {
              if (neighborTypes.includes(recipe.parent1) && neighborTypes.includes(recipe.parent2)) {
                if (Math.random() < synthChance) {
                  const seedDef = LAB_SEEDS.find((s) => s.type === recipe.result)
                  cell.seedType = recipe.result
                  cell.age = 0
                  cell.matureAge = seedDef?.growthSeconds || 60
                  cell.maxAge = Infinity
                  cell.isMature = false

                  if (!this.discoveredFormulas.includes(recipe.result)) {
                    this.discoveredFormulas.push(recipe.result)
                    if (!this.offlineSimActive) {
                      sounds.playCombo()
                      confetti({
                        particleCount: 75,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899']
                      })
                    }
                  } else {
                    if (!this.offlineSimActive) sounds.playPlant()
                  }
                  break
                }
              }
            }
          }
        })

        // B. Yan yana olgunlaşmış ebeveynlerin rezonansla doğrudan Kodekse keşif eklemesi
        for (let i = 0; i < 9; i++) {
          const c1 = this.labCells[i]
          if (!c1.seedType || !c1.isMature) continue
          const row = Math.floor(i / 3)
          const col = i % 3
          const neighborIndices: number[] = []
          if (row < 2) neighborIndices.push(i + 3)
          if (col < 2) neighborIndices.push(i + 1)

          for (const nIdx of neighborIndices) {
            const c2 = this.labCells[nIdx]
            if (!c2.seedType || !c2.isMature) continue

            for (const recipe of LAB_RECIPES) {
              if (!this.discoveredFormulas.includes(recipe.result)) {
                const match = (c1.seedType === recipe.parent1 && c2.seedType === recipe.parent2) ||
                              (c1.seedType === recipe.parent2 && c2.seedType === recipe.parent1)
                if (match && Math.random() < synthChance * 0.75) {
                  this.discoveredFormulas.push(recipe.result)
                  if (!this.offlineSimActive) {
                    sounds.playCombo()
                    confetti({
                      particleCount: 90,
                      spread: 80,
                      origin: { y: 0.55 },
                      colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899']
                    })
                  }
                }
              }
            }
          }
        }
      }

      // 7. Gece Kriz Enerji Yenilenmesi & Debuff
      this.caffeineEnergy = Math.min(this.maxCaffeineEnergy, this.caffeineEnergy + deltaSeconds * 1.2 * this.achievementCaffeineRegen)
      if (this.crisisBackfireDebuff > 0) {
        this.crisisBackfireDebuff = Math.max(0, this.crisisBackfireDebuff - deltaSeconds)
      }

      // 8. Otomatik Kaydırma Botları (Autobuyer - tekli/toplu/max)
      // Nöral Ağaç: Otonom Kaydırma Çipi (eski bağlantı) + Bot Aşırı Yüklemesi çarpanı
      const botSpeedMult = Math.pow(1.5, this.singularityUpgrades?.neural_chip || 0) * this.neuralEffects.botFrequencyMult
      const challengeBotsDisabled = this.activeChallengeDef?.modifiers.autobuyersDisabled === true
      Object.keys(this.autobuyers).forEach((key) => {
        const bot = this.autobuyers[key]
        if (bot && bot.unlocked && bot.enabled) {
          // C1 (Uçak Modu): Şafak botu hariç tüm botlar atlanır
          if (challengeBotsDisabled && key !== 'singularity') return
          // C2 (Şarj Aleti Temassızlığı): Üretim durma süresi aktifken botlar bekler; kalıcı sıfır üretim kilidini (softlock) önler
          if (this.challengeHaltUntil > 0 && key !== 'singularity') return
          bot.timer += deltaSeconds * botSpeedMult
          if (bot.timer >= bot.interval) {
            bot.timer = bot.interval > 0 ? bot.timer % bot.interval : 0
const effectiveMode: AutobuyerMode = bot.mode || 'single'
              if (key.startsWith('dim')) {
                const tier = parseInt(key.replace('dim', ''), 10)
                // Bot modları ×1 / ×10 / Maks: tek basışta 1 adet, 1 paket (10 adet), ya da alabildiği kadar
                if (effectiveMode === 'max' && this.autobuyerMaxUnlocked) {
                  this.buyMaxDimension(tier, false, false)
                } else if (effectiveMode === 'bulk' && this.autobuyerBulkUnlocked) {
                  this.buyDimension(tier, false)
                } else {
                  this.buyOneUnit(tier, false)
                }
              } else if (key === 'tickspeed') {
              if (effectiveMode === 'max' && this.autobuyerMaxUnlocked) {
                this.buyMaxTickspeed(false, false)
              } else if (effectiveMode === 'bulk' && this.autobuyerBulkUnlocked) {
                // ×10 tutarlılığı: Hz botu da her basışta 10 adet alır
                for (let i = 0; i < 10; i++) {
                  if (!this.buyTickspeed(false)) break
                }
              } else {
                this.buyTickspeed(false)
              }
            } else if (key === 'shift') {
              // Break Singularity alınmadıysa tekillikte bekler; alındıysa
              // e308 üstünde de normal çalışır (sınırın ötesinde rampa sürer).
              if (this.canShift && !this.singularityHoldActive) this.dimensionShift(false)
            } else if (key === 'galaxy') {
              if (this.canBuyGalaxy && !this.singularityHoldActive) this.buyGalaxy(false)
            } else if (key === 'singularity') {
              // G1 (kritik): challenge içinde bot SP basıp koşuyu baypas edemez —
              // eşik aşılınca challenge tamamlanır.
              if (this.shouldAutoSingularity()) {
                if (this.activeChallenge) this.completeChallenge()
                else this.singularityReset(false)
              }
            }
          }
        }
      })

      // 8.2 Şafak Nöbeti örnekleyici: saniyede bir log10(matter) örneği alır.
      // Marjinal kazanç optimizatörü (ExponentialIdle modeli) — runtime-only state.
      this.singularityRunSeconds += deltaSeconds
      this.singularitySampleAcc += deltaSeconds
      if (this.singularitySampleAcc >= 1) {
        this.singularitySampleAcc = 0
        const logMatter = this.matter.lt(1) ? 0 : this.matter.log10().toNumber()
        const samples = this.singularityBotSamples
        samples.push(logMatter)
        if (samples.length > 60) samples.shift()
        // Marjinal büyüme (son 3 sn eğimi) koşu ortalamasına yakınsa/düşerse streak birikir:
        // üretim ivmelenirken eğim > ortalama → streak sıfırlanır (beklemek hâlâ optimal);
        // rampa bittiğinde eğim ortalamaya oturur → 3 sn içinde çök. Sabit eğimde
        // (autobuyer'larla lineer üretim) beklemenin getirisi sıfırdır → çökmek doğrudur.
        if (samples.length >= 7) {
          const rate = (samples[samples.length - 1] - samples[samples.length - 4]) / 3
          const avgRate = (samples[samples.length - 1] - samples[0]) / (samples.length - 1)
          if (rate <= avgRate * 1.02 + 0.02) this.singularityDecelStreak++
          else this.singularityDecelStreak = 0
        }
      }

      // 8.5 Nöral İzleme Kolonisi Üremesi (kendi kendini üreyen alt-botlar, 1e308 yaklaşımında lojistik fren)
      if (this.neuralBots.gt(0)) {
        const breedRate = this.botBreedRate
        const logBots = log10Safe(this.neuralBots)
        const capacityFactor = Math.max(0.01, 1 - logBots / 308)
        this.neuralBots = this.neuralBots.plus(this.neuralBots.times(breedRate * capacityFactor * deltaSeconds))
      }

      // 9. Boyut Zinciri Simülasyonu (tick başına çarpanlar bir kez hesaplanır)
      const unlocked = this.unlockedDimensionsCount
      const speed = this.tickspeedMultiplier
      const achMultForChain = this.achievementMultiplier
      const dimMults: Decimal[] = []
      for (let t = 1; t <= unlocked; t++) {
        dimMults[t] = this.getDimensionMultiplier(t)
      }
      const activeChallengeMods = this.activeChallenge
        ? getChallengeById(this.activeChallenge)?.modifiers
        : undefined

      if (activeChallengeMods?.oddTiersOnly) {
        // C4 (Sansür Matrisi): çift boyutlar susar; tek boyutlar iki basamak alttaki tek boyutu besler (D7->D5->D3->D1)
        for (let i = unlocked - 1; i >= 2; i--) {
          if ((i + 1) % 2 === 1) {
            const higherDim = this.dimensions[i]
            const lowerDim = this.dimensions[i - 2]
            if (higherDim && lowerDim && higherDim.amount.gt(0)) {
              const mult = dimMults[i + 1]
              const produced = higherDim.amount
                .times(mult)
                .times(speed)
                .times(achMultForChain)
                .times(DIMENSION_CHAIN_RATE)
                .times(deltaSeconds)
              lowerDim.amount = lowerDim.amount.plus(produced)
            }
          }
        }
      } else {
        for (let i = unlocked - 1; i >= 1; i--) {
          const higherDim = this.dimensions[i]
          const lowerDim = this.dimensions[i - 1]
          if (higherDim && lowerDim && higherDim.amount.gt(0)) {
            const mult = dimMults[i + 1]
            const produced = higherDim.amount
              .times(mult)
              .times(speed)
              .times(achMultForChain)
              .times(DIMENSION_CHAIN_RATE)
              .times(deltaSeconds)
            lowerDim.amount = lowerDim.amount.plus(produced)
          }
        }
      }

      // 1. İstasyon -> Dopamin üretir
      const dim1 = this.dimensions[0]
      if (dim1 && dim1.amount.gt(0) && !this.challengeHalted) {
        let rawProduced = dim1.amount
          .times(dimMults[1])
          .times(speed)
          .times(this.stanceMultipliers.production)
          .times(this.productionBuffMultiplier)
          .times(this.labPassiveMultiplier)
          .times(achMultForChain)
          .times(this.achievementProductionMult)
          .times(this.colonyMultiplier)
          .times(this.napMultiplier)
          .times(this.offlineSimBoost > 1 ? this.offlineSimBoost : 1)
          .times(this.crisisBackfireDebuff > 0 ? 0.5 : 1.0)
          .times(this.challengeProdMult)
          .times(deltaSeconds)

        const totalLeechRatio = this.slackerLeechPercent
        const leechedAmount = rawProduced.times(totalLeechRatio)
        const netProduced = rawProduced.minus(leechedAmount)

        if (this.slackers.length > 0 && leechedAmount.gt(0)) {
          const perSlacker = leechedAmount.div(this.slackers.length)
          this.slackers.forEach((s) => {
            s.leechedDopamine = s.leechedDopamine.plus(perSlacker)
          })
        }

        this.matter = this.matter.plus(netProduced)
        this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(netProduced)

        if (this.matter.gt(this.stats.highestMatter)) {
          this.stats.highestMatter = this.matter
        }
      }

      this.stats.totalPlaytime += deltaSeconds

      // 10. Faz 2 kilometre taşı: Kolektif Gece Nöbeti eşiği (kalıcı, tek seferlik)
      if (!this.nightWatchUnlocked && this.matter.gte(NIGHT_WATCH_THRESHOLD)) {
        this.nightWatchUnlocked = true
        if (!this.offlineSimActive) {
          confetti({
            particleCount: 220,
            spread: 140,
            origin: { y: 0.4 },
            colors: ['#a855f7', '#06b6d4', '#f59e0b', '#ffffff']
          })
        }
      }

      // QoL: saniyelik üretim örneklemesi (Rapor sparkline; offline simülasyonda örneklenmez)
      if (!this.offlineSimActive) {
        this.dpsSampleAcc += deltaSeconds
        if (this.dpsSampleAcc >= 1) {
          this.dpsSampleAcc %= 1
          const curDps = this.matterPerSecond
          // Rekor üretim hızı buradan güncellenir (ADR-0029): getter her tick çağrılırsa
          // zincir boyunca ~40 Decimal tahsisi yapılıp sonuç atılıyordu. Zirve
          // değişkeni 1 Hz çözünürlükte ve salt görüntüleme amaçlı olduğu için
          // bu, yalnızca anlık tepe noktalarını kaçırır; ekonomiye dokunmaz.
          if (curDps.gt(this.stats.highestDps)) {
            this.stats.highestDps = curDps
          }
          const numDps = curDps.lt(0) ? 0 : (curDps.gte(Number.MAX_VALUE) ? Number.MAX_VALUE : curDps.toNumber())
          this.dpsHistory.push(numDps)
          if (this.dpsHistory.length > 600) this.dpsHistory.shift()
        }
      }

      // Başarım kontrolü: canlı oyunda 0.5 sn seyreltilir; offline simülasyonda 120 adımda bir
      if (this.offlineSimActive) {
        this.offlineAchTick++
        if (this.offlineAchTick >= 120) {
          this.offlineAchTick = 0
          this.checkAchievements()
        }
      } else {
        this.achCheckAcc += deltaSeconds
        if (this.achCheckAcc >= ACH_CHECK_INTERVAL) {
          this.achCheckAcc = 0
          this.checkAchievements()
        }
      }
      this.lastUpdate = Date.now()
    },

    // Nöral Çekirdek Aktif Et (koloni başlatma — tek seferlik)
    hatchCore(): boolean {
      if (this.neuralBots.gt(0)) return false
      if (this.matter.lt(COLONY_CORE_COST)) return false
      this.matter = this.matter.minus(COLONY_CORE_COST)
      this.neuralBots = new Decimal(1)
      sounds.playUpgrade()
      return true
    },

    // Toplu Uyku (Power Nap / Ant Sacrifice): koloniyi feda et, kalıcı kök çarpan katla
    powerNap(): boolean {
      if (!this.canPowerNap) return false
      const gain = this.powerNapGain
      this.napMultiplier = this.napMultiplier.times(gain)
      this.napCount++
      this.neuralBots = new Decimal(1) // Nöral çekirdek korunur
      sounds.playSacrifice()
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#a78bfa', '#06b6d4', '#f59e0b', '#ffffff']
      })
      return true
    },

    // Çevrimdışı İlerleme Simülatörü — 24 saat ile sınırlı, kademeli adımlı yakalama.
    // Kademeli adımlar tek dev delta'nın üstel boyut zincirini aşağılamasını engeller.
    // Rapor döndürür ve store.offlineReport'a yazar (Welcome Back modalı bunu gösterir).
    simulateOfflineProgress(offlineSeconds: number): OfflineReport | null {
      if (offlineSeconds <= 1) return null

      sounds.suppressed = true
      const cappedSeconds = Math.min(offlineSeconds, OFFLINE_CAP_SECONDS)
      const startProduced = this.stats.totalMatterProduced

      // Nöral Ağaç çevrimdışı kazanç düğümleri yalnızca bu simülasyon boyunca etkindir
      const previousBoost = this.offlineSimBoost
      this.offlineSimBoost =
        (1 + this.neuralEffects.offlineGainBonus) *
        tierOfflineSimMult(this.dimensions, this.unlockedDimensionsCount)
      this.offlineSimActive = true
      this.offlineAchTick = 0

      try {
        // İlk 5 dakika: 0.1 sn hassasiyetli simülasyon (botlar, buff süreleri, lab doğru işler)
        const detailedSeconds = Math.min(300, cappedSeconds)
        const steps = Math.floor(detailedSeconds / 0.1)
        for (let s = 0; s < steps; s++) {
          this.update(0.1)
        }

        // Kalan süre: 1 sn adımları (1 saate kadar), sonrasında 10 sn (2 saate kadar), ardından 60 sn
        let remainingSeconds = cappedSeconds - detailedSeconds
        const fineSteps = Math.min(remainingSeconds, 3600)
        for (let s = 0; s < fineSteps; s++) {
          this.update(1)
        }
        remainingSeconds -= fineSteps
        const mediumBudget = Math.min(remainingSeconds, 3600)
        const mediumSteps = Math.floor(mediumBudget / 10)
        for (let s = 0; s < mediumSteps; s++) {
          this.update(10)
        }
        remainingSeconds -= mediumSteps * 10
        const coarseSteps = Math.floor(remainingSeconds / 60)
        for (let s = 0; s < coarseSteps; s++) {
          this.update(60)
        }
        const leftover = remainingSeconds - coarseSteps * 60
        if (leftover > 0) this.update(leftover)
      } finally {
        this.offlineSimBoost = previousBoost
        this.offlineSimActive = false
        sounds.suppressFor(300)
      }

      const gained = this.stats.totalMatterProduced.minus(startProduced)
      if (gained.lte(0)) return null

      this.offlineReport = {
        seconds: cappedSeconds,
        capped: offlineSeconds > OFFLINE_CAP_SECONDS,
        dopamineGained: gained
      }
      return this.offlineReport
    },

    dismissOfflineReport(): void {
      this.offlineReport = null
    },

    // Manuel satın alma: ad bazlı maks — param 1 adete yetiyorsa buton aktiftir,
    // tek tıkla alabildiği kadar adet alır (botların interval'i basış sıklığını belirler).

    // x1 modu: tek tıkla alabildiği kadar adet alır. Paket fiyatını karşılayabiliyorsa
    // 10'luk paketi paket fiyatına alır (aynı sonuç), karşılayamıyorsa kalan para ile
    // ad-adet devam eder. Maliyet geometrik büyüdüğü için tur sayısı küçük kalır.
    buyDimensionUnits(tier: number, playSound = true): boolean {
      if (tier > this.unlockedDimensionsCount) return false
      const dim = this.dimensions[tier - 1]
      if (!dim) return false

      let unitsBought = 0
      const mpsBefore = this.matterPerSecond

      for (let guard = 0; guard < 1000; guard++) {
        const packPrice = this.getDimensionCost(tier)
        const unitCost = packPrice.div(10)
        if (this.matter.lt(unitCost)) break

        if (this.matter.gte(packPrice)) {
          this.matter = this.matter.minus(packPrice)
          dim.amount = dim.amount.plus(10)
          dim.bought += 10
          unitsBought += 10
          continue
        }

        // Paket yetmiyor: mevcut kovada kalan adet sınırı ile ad-adet al
        const remainingInBucket = 10 - (dim.bought % 10)
        const affordable = Math.min(remainingInBucket, this.matter.div(unitCost).floor().toNumber())
        if (affordable <= 0) break
        this.matter = this.matter.minus(unitCost.times(affordable))
        dim.amount = dim.amount.plus(affordable)
        dim.bought += affordable
        unitsBought += affordable
      }

      if (unitsBought <= 0) return false
      this.registerChallengeBuy(unitsBought / 10)
      if (playSound) sounds.playBuy(tier)
      this.finalizeDimensionPurchase(tier, mpsBefore, playSound)
      return true
    },

    // Bot ×1 modu: tek basışta 1 adet alır (maliyet güncel paket fiyatının 1/10'u)
    buyOneUnit(tier: number, playSound = false): boolean {
      if (tier > this.unlockedDimensionsCount) return false
      const dim = this.dimensions[tier - 1]
      if (!dim) return false

      const unitCost = this.getDimensionCost(tier).div(10)
      if (this.matter.lt(unitCost)) return false

      const mpsBefore = this.matterPerSecond
      this.matter = this.matter.minus(unitCost)
      dim.amount = dim.amount.plus(1)
      dim.bought += 1
      this.registerChallengeBuy(0.1)
      if (playSound) sounds.playBuy(tier)
      this.finalizeDimensionPurchase(tier, mpsBefore, playSound)
      return true
    },

    toggleMusic(): void {
      this.settings.musicEnabled = !this.settings.musicEnabled
      musicEngine.setEnabled(this.settings.musicEnabled)
    },

    setMusicVolume(vol: number): void {
      this.settings.musicVolume = vol
      musicEngine.setVolume(vol)
    },

    setMusicTrack(track: MusicTrackId): void {
      this.settings.musicTrack = track
      musicEngine.setTrack(track)
    },

    toggleVinylCrackle(): void {
      this.settings.vinylCrackle = !this.settings.vinylCrackle
      musicEngine.setVinylCrackle(this.settings.vinylCrackle)
    },

    toggleRain(): void {
      this.settings.rainEnabled = !this.settings.rainEnabled
      musicEngine.setRainEnabled(this.settings.rainEnabled)
    },

    setRainLevel(val: number): void {
      this.settings.rainLevel = Math.max(0, Math.min(1, val))
      musicEngine.setRainLevel(this.settings.rainLevel)
    },

    setMusicIntensity(val: number): void {
      this.settings.musicIntensity = Math.max(0, Math.min(1, val))
      musicEngine.setIntensity(this.settings.musicIntensity)
    },

    setSleepTimer(minutes: number): void {
      this.settings.sleepTimerMinutes = minutes
      musicEngine.setSleepTimer(minutes)
    },

    nextMusicTrack(): void {
      const next = musicEngine.nextTrack()
      this.settings.musicTrack = next.id
    },

    setCustomAudioUrl(url: string): void {
      this.settings.customAudioUrl = url
      musicEngine.customUrl = url
      if (this.settings.musicTrack === 'custom') {
        musicEngine.setTrack('custom')
      }
    },

    // QoL Çoklu Kayıt Slotları (v22)
    switchSaveSlot(targetSlot: number): void {
      if (![1, 2, 3].includes(targetSlot)) return
      // 1. Önce aktif slotu diske yaz
      SaveSystem.save(this.serialize(), this.settings.activeSlot)
      // 2. Yeni aktif slotu ayarla
      this.settings.activeSlot = targetSlot
      SaveSystem.setActiveSlot(targetSlot)
      // 3. Yeni slotu yükle
      const loaded = SaveSystem.loadDetailed(targetSlot)
      if (loaded.state) {
        this.deserialize(loaded.state)
        this.settings.activeSlot = targetSlot
      } else {
        // Hedef slotta henüz kayıt yoksa yeni oyun durumuna resetle ve kaydet
        SaveSystem.save(this.serialize(), targetSlot)
        window.location.reload()
      }
    },

    copySaveSlot(fromSlot: number, toSlot: number): boolean {
      if (fromSlot === toSlot) return false
      // Önce kaynak slot aktifse hafızadaki son durumu diske yaz
      if (this.settings.activeSlot === fromSlot) {
        SaveSystem.save(this.serialize(), fromSlot)
      }
      return SaveSystem.copySlot(fromSlot, toSlot)
    },

    deleteSaveSlot(slot: number): void {
      SaveSystem.deleteSlot(slot)
      if (this.settings.activeSlot === slot) {
        window.location.reload()
      }
    },

    restoreFromBackup(): boolean {
      const restored = SaveSystem.restoreFromBackup()
      if (restored) {
        this.deserialize(restored)
        return true
      }
      return false
    },

    // State Serialization (Kayıt)
    serialize(): SerializedPlayerState {
      const serializedAutobuyers: Record<string, { enabled: boolean; unlocked: boolean; mode?: AutobuyerMode; minGainSp?: number }> = {}
      Object.keys(this.autobuyers).forEach((k) => {
        serializedAutobuyers[k] = {
          enabled: this.autobuyers[k].enabled,
          unlocked: this.autobuyers[k].unlocked,
          mode: this.autobuyers[k].mode || 'single',
          minGainSp: this.autobuyers[k].minGainSp
        }
      })

      return {
        version: SAVE_VERSION,
        matter: this.matter.toString(),
        dimensions: this.dimensions.map((d) => ({
          amount: d.amount.toString(),
          bought: d.bought
        })),
        tickspeedBought: this.tickspeedBought,
        dimensionShifts: this.dimensionShifts,
        dimensionCapFloor: this.dimensionCapFloor,
        formatDiscoverSeenCap: this.formatDiscoverSeenCap,
        formatUnlockBuffTier: this.formatUnlockBuffTier,
        formatUnlockBuffUntil: this.formatUnlockBuffUntil,
        galaxies: this.galaxies,
        singularityPoints: this.singularityPoints.toString(),
        singularities: this.singularities,
        nightWatchUnlocked: this.nightWatchUnlocked,
        currentStance: this.currentStance,
        activeBuffs: this.activeBuffs.map((b) => ({
          type: b.type,
          remaining: b.remaining
        })),
        slackers: this.slackers.map((s) => ({
          name: s.name,
          leechedDopamine: s.leechedDopamine.toString(),
          leechedKpi: s.leechedDopamine.toString()
        })),
        caffeineEnergy: this.caffeineEnergy,
        // ADR-0029: bu dört alan v12'de kaydedilmiyordu. maxCaffeineEnergy yükleme
        // sırasında clamp tavanı olarak kullanıldığı için (clampSavedNumber) kayıp
        // her zaman 100'e düşüyordu; viral üçlüsü ise canlı koşu ilerlemesiydi.
        maxCaffeineEnergy: this.maxCaffeineEnergy,
        isViralActive: this.isViralActive,
        viralTimeRemaining: this.viralTimeRemaining,
        viralViews: this.viralViews,
        labCells: this.labCells.map((c) => ({
          id: c.id,
          seedType: c.seedType,
          age: c.age,
          matureAge: c.matureAge,
          maxAge: c.maxAge
        })),
        labHype: this.labHype,
        labMode: this.labMode,
        discoveredFormulas: [...this.discoveredFormulas],
        autobuyers: serializedAutobuyers,
        autobuyerBulkUnlocked: this.autobuyerBulkUnlocked,
        autobuyerMaxUnlocked: this.autobuyerMaxUnlocked,
        singularityUpgrades: { ...this.singularityUpgrades },
        neuralNodesBought: { ...this.neuralNodesBought },
        clickCombo: { ...this.clickCombo },
        activeChallenge: this.activeChallenge,
        completedChallenges: [...this.completedChallenges],
        challengeBestTimes: { ...this.challengeBestTimes },
        claimedBounties: [...(this.claimedBounties || [])],
        decadeSurgeMult: this.decadeSurgeMult,
        sacrificeCount: this.sacrificeCount,
        sacrificeMultiplier: this.sacrificeMultiplier.toString(),
        neuralBots: this.neuralBots.toString(),
        napCount: this.napCount,
        napMultiplier: this.napMultiplier.toString(),
        mythicPity: this.mythicPity || 0,
        achievements: [...this.achievements],
        achievementsSeenCount: this.achievementsSeenCount,
        unlockedFeatures: [...this.unlockedFeatures],
        // ADR-0035 (v15): açılış kalıcılığının asıl kaydı.
        lifetimePeakMatter: this.lifetimePeakMatter.toString(),
        lifetimePeakShifts: this.lifetimePeakShifts,
        lastUpdate: this.lastUpdate,
        settings: { ...this.settings },
        pastSingularities: this.pastSingularities.map((p) => ({
          id: p.id,
          duration: p.duration,
          spGained: p.spGained.toString(),
          spPerMinute: p.spPerMinute.toString(),
          peakMatter: p.peakMatter.toString(),
          timestamp: p.timestamp,
          challengeId: p.challengeId || null
        })),
        stats: {
          manualClicks: this.stats.manualClicks,
          totalMatterProduced: this.stats.totalMatterProduced.toString(),
          highestMatter: this.stats.highestMatter.toString(),
          totalPlaytime: this.stats.totalPlaytime,
          singularityCount: this.stats.singularityCount,
          fastestSingularity: this.stats.fastestSingularity,
          highestDps: this.stats.highestDps.toString(),
          totalManualDopamine: this.stats.totalManualDopamine.toString(),
          anomaliesClicked: this.stats.anomaliesClicked || 0,
          mythicsClicked: this.stats.mythicsClicked || 0,
          combosTriggered: this.stats.combosTriggered || 0,
          slackersFired: this.stats.slackersFired || 0,
          labHarvests: this.stats.labHarvests || 0,
          spellsCast: this.stats.spellsCast || 0,
          seedsPlanted: this.stats.seedsPlanted || 0,
          challengesCompleted: this.stats.challengesCompleted || 0
        }
      }
    },

    // State Deserialization (Yükleme)
    deserialize(data: SerializedPlayerState): void {
      // Gelecek sürüm koruması: try bloğunun DIŞINDA ve ilk adımda. Daha yeni bir
      // build'in kaydı burada açılırsa, o build'in eklediği alanlar sessizce düşer
      // ve kayıt yeniden v12 olarak damgalanır (geriye dönük veri kaybı). Bu yüzden
      // reddediyoruz; çağıranlar SaveVersionError'ı yakalayıp oyuncuyu bilgilendirir.
      const declaredVersion = typeof data.version === 'number' ? data.version : 1
      if (declaredVersion > SAVE_VERSION) {
        throw new SaveVersionError(declaredVersion, SAVE_VERSION)
      }
      if (declaredVersion < MIN_SUPPORTED_SAVE_VERSION) {
        throw new Error(
          `Kayıt sürümü v${declaredVersion} desteklenmiyor (asgari v${MIN_SUPPORTED_SAVE_VERSION}). İlerleme sıfırlandı.`
        )
      }
      try {
        // Save versiyonu: sıralı migration kancası. Kırıcı değişikliklerde
        // "if (saveVersion < N) { ... }" blokları buraya eklenir.
        const saveVersion = declaredVersion

        this.neuralBots = D_0
        this.napCount = 0
        this.napMultiplier = D_1

        // v9- kayıt göçü: singularities alanı kaydedilmiyordu; çöküş sayacı istatistikten alınır
        if (saveVersion < 10 && typeof data.singularities !== 'number') {
          this.singularities = data.stats?.singularityCount || 0
        }

        this.matter = parseSavedDecimal(data.matter, new Decimal(10))
        if (Array.isArray(data.dimensions)) {
          data.dimensions.forEach((savedDim, i) => {
            // ADR-0029: bozuk kayıtta null eleman deserialize'un tamamını
            // yarı uygulanmış bırakıyordu (tek throw, stats + offline kaybı).
            if (this.dimensions[i] && savedDim && typeof savedDim === 'object') {
              this.dimensions[i].amount = parseSavedDecimal(savedDim.amount, D_0)
              this.dimensions[i].bought = clampSavedNumber(savedDim.bought, 0, 0, 1e12)
            }
          })
        }
        this.tickspeedBought = data.tickspeedBought || 0
        this.dimensionShifts = data.dimensionShifts || 0
        this.galaxies = data.galaxies || 0

        this.dimensionCapFloor = BASE_UNLOCKED_DIMENSIONS
        this.formatDiscoverSeenCap = BASE_UNLOCKED_DIMENSIONS
        this.formatUnlockBuffTier = 0
        this.formatUnlockBuffUntil = 0
        if (saveVersion < 12) {
          let progressCap = 2
          this.dimensions.forEach((d, i) => {
            if (d.bought > 0 || d.amount.gt(0)) {
              progressCap = Math.max(progressCap, i + 1)
            }
          })
          const legacyFloor = Math.max(4, Math.min(8, progressCap))
          this.dimensionCapFloor = legacyFloor
          this.formatDiscoverSeenCap = Math.max(
            this.formatDiscoverSeenCap,
            resolvedUnlockedDimensionCount({
              dimensionShifts: this.dimensionShifts,
              dimensionCapFloor: legacyFloor,
              activeChallenge: null
            })
          )
        } else {
          if (typeof data.dimensionCapFloor === 'number') {
            this.dimensionCapFloor = clampSavedNumber(
              data.dimensionCapFloor,
              BASE_UNLOCKED_DIMENSIONS,
              2,
              8
            )
          }
          if (typeof data.formatDiscoverSeenCap === 'number') {
            this.formatDiscoverSeenCap = clampSavedNumber(
              data.formatDiscoverSeenCap,
              BASE_UNLOCKED_DIMENSIONS,
              2,
              8
            )
          }
          if (typeof data.formatUnlockBuffTier === 'number') {
            this.formatUnlockBuffTier = clampSavedNumber(data.formatUnlockBuffTier, 0, 0, 8)
          }
          if (typeof data.formatUnlockBuffUntil === 'number') {
            this.formatUnlockBuffUntil = Math.max(0, data.formatUnlockBuffUntil)
          }
        }

        if (typeof data.singularities === 'number') {
          this.singularities = Math.floor(data.singularities)
        }
        if (typeof data.nightWatchUnlocked === 'boolean') {
          this.nightWatchUnlocked = data.nightWatchUnlocked
        }
        this.mythicPity = typeof data.mythicPity === 'number' && Number.isFinite(data.mythicPity)
          ? Math.max(0, Math.min(25, Math.floor(data.mythicPity)))
          : 0

        // Geçersiz duruş değeri kayıttan sızmasın: default 'trend' duruşunda kal
        if (isValidStanceType(data.currentStance)) {
          this.currentStance = data.currentStance
        } else {
          this.currentStance = 'trend'
        }

        if (Array.isArray(data.activeBuffs)) {
          this.activeBuffs = data.activeBuffs
            .filter((b) => isValidBuffType(b.type) && b.type !== 'void' && b.type !== 'sponsor')
            .map((b) => {
              const remaining = clampSavedNumber(b.remaining, 0, 0, 86400)
              return {
                id: `buff-${b.type}-${Date.now()}`,
                type: b.type,
                name: b.type === 'fyp'
                  ? '🔥 Gece 3 Çılgınlığı (7× Dopamin)'
                  : b.type === 'espresso'
                    ? '☕ Çift Espresso (3× Frekans)'
                    : '👆 Başparmak Histerisi (300× Kaydır)',
                duration: b.type === 'fyp' ? 60 : b.type === 'espresso' ? 30 : 15,
                remaining,
                multiplier: b.type === 'fyp' ? 7 : b.type === 'espresso' ? 3 : 300
              }
            })
            .filter((b) => b.remaining > 0)
        }

        if (Array.isArray(data.slackers)) {
          this.slackers = data.slackers.map((s) => ({
            id: `guilt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: s.name,
            leechedDopamine: parseSavedDecimal(s.leechedDopamine || s.leechedKpi, D_0),
            clicksRemaining: 3
          }))
        }

        if (typeof data.caffeineEnergy === 'number') {
          // ADR-0029: tavan ÖNCE yüklenmeli — aşağıdaki clamp bunun tavanını kullanıyor.
        // v12 ve öncesi kayıtlarda alan yok, o durumda varsayılan 100 korunur.
        if (typeof data.maxCaffeineEnergy === 'number') {
          this.maxCaffeineEnergy = clampSavedNumber(data.maxCaffeineEnergy, 100, 1, 100000)
        }
        this.caffeineEnergy = clampSavedNumber(data.caffeineEnergy, 50, 0, this.maxCaffeineEnergy)

        // Viral Zirve koşu ilerlemesi (daha önce kaydedilmiyordu)
        this.isViralActive = data.isViralActive === true
        this.viralTimeRemaining = clampSavedNumber(data.viralTimeRemaining, 0, 0, 3600)
        this.viralViews = clampSavedNumber(data.viralViews, 0, 0, 1e15)
        }

        if (Array.isArray(data.labCells)) {
          data.labCells.forEach((savedCell, i) => {
            if (this.labCells[i]) {
              const seedType = isValidLabSeedType(savedCell.seedType) ? savedCell.seedType : null
              const age = clampSavedNumber(savedCell.age, 0, 0, 31536000)
              const seedGrowth = seedType
                ? LAB_SEEDS.find((seed) => seed.type === seedType)?.growthSeconds || 0
                : 0
              const savedMatureAge = clampSavedNumber(savedCell.matureAge, 0, 0, 31536000)
              const matureAge = seedType && savedMatureAge > 0 ? savedMatureAge : seedGrowth
              const maxAge = clampSavedNumber(savedCell.maxAge, 0, 0, 31536000)
              this.labCells[i].seedType = seedType
              this.labCells[i].age = age
              this.labCells[i].matureAge = matureAge
              this.labCells[i].maxAge = maxAge
              this.labCells[i].isMature = seedType !== null && age >= matureAge
            }
          })
        }

        if (typeof data.labHype === 'number') {
          this.labHype = clampSavedNumber(data.labHype, 0, 0, 100)
        }
        if (data.labMode === 'fyp' || data.labMode === 'evergreen' || data.labMode === 'mutation') {
          this.labMode = data.labMode
        }
        if (Array.isArray(data.discoveredFormulas) && data.discoveredFormulas.length > 0) {
          const validFormulas = data.discoveredFormulas.filter((id): id is LabSeedType => isValidLabSeedType(id))
          this.discoveredFormulas = Array.from(new Set(['cat_audio', ...validFormulas]))
        } else {
          const present = this.labCells.map((c) => c.seedType).filter((s): s is LabSeedType => s !== null)
          this.discoveredFormulas = Array.from(new Set(['cat_audio', ...present]))
        }

        if (data.autobuyers) {
          Object.keys(data.autobuyers).forEach((k) => {
            if (this.autobuyers[k]) {
              this.autobuyers[k].enabled = data.autobuyers![k].enabled
              this.autobuyers[k].unlocked = data.autobuyers![k].unlocked
              const savedMode = data.autobuyers![k].mode
              this.autobuyers[k].mode = savedMode === 'bulk' || savedMode === 'max' ? savedMode : 'single'
              this.autobuyers[k].interval = getAutobuyerInterval(k, this.autobuyers[k].mode || 'single')
              this.autobuyers[k].timer = 0
              if (typeof data.autobuyers![k].minGainSp === 'number' && data.autobuyers![k].minGainSp! > 0) {
                this.autobuyers[k].minGainSp = data.autobuyers![k].minGainSp
              }
            }
          })
        }

        this.autobuyerBulkUnlocked = data.autobuyerBulkUnlocked ?? false
        this.autobuyerMaxUnlocked = data.autobuyerMaxUnlocked ?? false
        if (!this.autobuyerBulkUnlocked) {
          Object.values(this.autobuyers).forEach((b) => {
            if (b.mode === 'bulk' || b.mode === 'max') {
              b.mode = 'single'
              b.interval = getAutobuyerInterval(b.id, 'single')
            }
          })
        } else if (!this.autobuyerMaxUnlocked) {
          Object.values(this.autobuyers).forEach((b) => {
            if (b.mode === 'max') {
              b.mode = 'single'
              b.interval = getAutobuyerInterval(b.id, 'single')
            }
          })
        }

        // ADR-0029: singularityUpgrades da beyaz listeye alındı — nöral ağaç
        // (aşağıdaki blok) zaten böyle yapıyordu; dükkân kaydı ham merge ediliyordu.
        if (data.singularityUpgrades && typeof data.singularityUpgrades === 'object') {
          for (const [upgId, rawLvl] of Object.entries(data.singularityUpgrades)) {
            const def = SINGULARITY_UPGRADES.find((u) => u.id === upgId)
            if (!def) continue
            if (typeof rawLvl !== 'number' || !Number.isFinite(rawLvl) || rawLvl <= 0) continue
            this.singularityUpgrades[upgId] = Math.min(Math.floor(rawLvl), def.maxLevel)
          }
        }

        // Nöral Ağaç (v9): eksik alanlarda güvenli varsayılan; yalnızca tanımlı düğüm id'leri kabul edilir
        const loadedNeuralNodes: Record<string, number> = {}
        if (data.neuralNodesBought && typeof data.neuralNodesBought === 'object') {
          Object.entries(data.neuralNodesBought).forEach(([nodeId, lvl]) => {
            if (typeof lvl === 'number' && lvl > 0 && NEURAL_TREE.some((n) => n.id === nodeId)) {
              loadedNeuralNodes[nodeId] = Math.floor(lvl)
            }
          })
        }
        // Eski kayıt göçü: düz dükkân seviyeleri ağaçtaki karşılık düğümlere yansıtılır
        NEURAL_LEGACY_UPGRADE_IDS.forEach((legacyId) => {
          const shopLvl = this.singularityUpgrades?.[legacyId] || 0
          if (shopLvl > (loadedNeuralNodes[legacyId] || 0)) {
            loadedNeuralNodes[legacyId] = shopLvl
          }
        })
        this.neuralNodesBought = loadedNeuralNodes

        // Gece Krizi (v10): whitelist doğrulaması — kayıtlı id registry'de yoksa geçersiz sayılır
        if (typeof data.activeChallenge === 'string' && getChallengeById(data.activeChallenge)) {
          this.activeChallenge = data.activeChallenge
        } else {
          this.activeChallenge = null
        }
        if (Array.isArray(data.completedChallenges)) {
          this.completedChallenges = data.completedChallenges.filter(
            (id): id is string => typeof id === 'string' && !!getChallengeById(id)
          )
        } else {
          this.completedChallenges = []
        }
        const loadedBestTimes: Record<string, number> = {}
        if (data.challengeBestTimes && typeof data.challengeBestTimes === 'object') {
          Object.entries(data.challengeBestTimes).forEach(([id, secs]) => {
            if (getChallengeById(id) && typeof secs === 'number' && Number.isFinite(secs) && secs >= 0) {
              loadedBestTimes[id] = secs
            }
          })
        }
        this.challengeBestTimes = loadedBestTimes
        this.challengeElapsed = 0
        this.challengeHaltUntil = 0
        this.challengeSinceBuy = 9999
        this.challengeCostInflation = 0
        this.challengeNotificationDoom = 0
        this.challengeDim1Growth = new Decimal(1)

        // Combo serisi geçicidir: kayıttan yüklense bile bayat lastClickAt decay ile sıfırlanır
        if (
          data.clickCombo &&
          typeof data.clickCombo.count === 'number' &&
          Number.isFinite(data.clickCombo.count) &&
          typeof data.clickCombo.lastClickAt === 'number'
        ) {
          this.clickCombo = {
            count: Math.floor(clampSavedNumber(data.clickCombo.count, 0, 0, 100000)),
            lastClickAt: data.clickCombo.lastClickAt
          }
        } else {
          this.clickCombo = { count: 0, lastClickAt: 0 }
        }

        if (Array.isArray(data.claimedBounties)) {
          this.claimedBounties = data.claimedBounties.filter(
            (e): e is number => typeof e === 'number' && Number.isFinite(e)
          )
        } else {
          this.claimedBounties = []
        }
        // ADR-0034: Koşu içi Dekad Yükselişi çarpanı. v14- kayıtlarda bu alan yok;
        // o kayıtlar SP olarak ödedikleri primleri korur, yükseliş 1'den başlar.
        this.decadeSurgeMult =
          typeof data.decadeSurgeMult === 'number' && Number.isFinite(data.decadeSurgeMult)
            ? clampSavedNumber(data.decadeSurgeMult, 1, 1, 1000)
            : 1
        if (typeof data.sacrificeCount === 'number') {
          this.sacrificeCount = data.sacrificeCount
        }
        if (data.sacrificeMultiplier) {
          this.sacrificeMultiplier = parseSavedDecimal(data.sacrificeMultiplier, D_1)
        }

        if (data.neuralBots) {
          this.neuralBots = parseSavedDecimal(data.neuralBots, D_0)
        }
        if (typeof data.napCount === 'number') {
          this.napCount = Math.floor(clampSavedNumber(data.napCount, 0, 0, Number.MAX_SAFE_INTEGER))
        }
        if (data.napMultiplier) {
          this.napMultiplier = parseSavedDecimal(data.napMultiplier, D_1)
        }

        if (Array.isArray(data.achievements)) {
          this.achievements = data.achievements.filter(
          (id) => typeof id === 'string' && ACHIEVEMENT_IDS.has(id)
        )
        // Başarım listesi değiştiğinde çarpan memo'su düşmeli.
        resetAchievementCache()
        }
        if (typeof data.achievementsSeenCount === 'number') {
          this.achievementsSeenCount = data.achievementsSeenCount
        }

        if (data.settings) {
          this.settings = { ...this.settings, ...data.settings }
          sounds.enabled = this.settings.soundEnabled
          sounds.volume = this.settings.soundVolume
          musicEngine.enabled = this.settings.musicEnabled ?? true
          musicEngine.volume = this.settings.musicVolume ?? 0.35
          musicEngine.currentTrack = this.settings.musicTrack ?? 'lofi_chill'
          musicEngine.vinylCrackle = this.settings.vinylCrackle ?? true
          musicEngine.rainEnabled = this.settings.rainEnabled ?? true
          musicEngine.rainLevel = this.settings.rainLevel ?? 0.5
          musicEngine.intensity = this.settings.musicIntensity ?? 0.5
          // P0 Balatro: eski kayıtlarda eksik alanlar varsayılanla dolar
          if (this.settings.crtEffect === undefined) this.settings.crtEffect = true
          if (this.settings.juiceMode === undefined) this.settings.juiceMode = 'balanced'
          if (this.settings.screenOverlayEffects === undefined) this.settings.screenOverlayEffects = true
          if (this.settings.holoCardsEnabled === undefined) this.settings.holoCardsEnabled = true
          if (this.settings.swirlShaderQuality === undefined) this.settings.swirlShaderQuality = 'balanced'
          if (this.settings.decimalPlaces === undefined) this.settings.decimalPlaces = 2
          if (this.settings.batterySaver === undefined) this.settings.batterySaver = false
          if (this.settings.floatingTexts === undefined) this.settings.floatingTexts = true
          if (this.settings.newsTickerEnabled === undefined) this.settings.newsTickerEnabled = true
          if (this.settings.offlineProgressModal === undefined) this.settings.offlineProgressModal = true
          if (this.settings.hotkeysEnabled === undefined) this.settings.hotkeysEnabled = true
          if (this.settings.activeSlot === undefined) this.settings.activeSlot = SaveSystem.getActiveSlot()
          if (this.settings.customAudioUrl) {
            musicEngine.customUrl = this.settings.customAudioUrl
          }
        }

        if (Array.isArray(data.pastSingularities)) {
          this.pastSingularities = data.pastSingularities.map((p) => ({
            id: p.id,
            duration: p.duration,
            spGained: parseSavedDecimal(p.spGained, D_0),
            spPerMinute: parseSavedDecimal(p.spPerMinute, D_0),
            peakMatter: parseSavedDecimal(p.peakMatter, D_0),
            timestamp: p.timestamp || Date.now(),
            challengeId: p.challengeId || null
          }))
        } else {
          this.pastSingularities = []
        }

        if (data.stats) {
          this.stats = {
            manualClicks: data.stats.manualClicks || 0,
            totalMatterProduced: parseSavedDecimal(data.stats.totalMatterProduced, new Decimal(10)),
            highestMatter: parseSavedDecimal(data.stats.highestMatter, new Decimal(10)),
            totalPlaytime: data.stats.totalPlaytime || 0,
            singularityCount: data.stats.singularityCount || 0,
            fastestSingularity: data.stats.fastestSingularity || Infinity,
            highestDps: parseSavedDecimal(data.stats.highestDps, D_0),
            totalManualDopamine: parseSavedDecimal(data.stats.totalManualDopamine, D_0),
            anomaliesClicked: data.stats.anomaliesClicked || 0,
            mythicsClicked: data.stats.mythicsClicked || 0,
            combosTriggered: data.stats.combosTriggered || 0,
            slackersFired: data.stats.slackersFired || 0,
            labHarvests: data.stats.labHarvests || 0,
            spellsCast: data.stats.spellsCast || 0,
            seedsPlanted: data.stats.seedsPlanted || 0,
            challengesCompleted: data.stats.challengesCompleted || 0
          }
          // Eski kayıt göçü (v9-): yukarıdaki version kancası atlandıysa (bozuk versiyon alanı) yine de güvence altına al
          if (typeof this.singularities !== 'number' || Number.isNaN(this.singularities)) {
            this.singularities = this.stats.singularityCount || 0
          }
        }

        // Özellik Merdiveni (v0.11.0): yapışkan kilitlemeleri yükle, eksikleri hesapla
        if (Array.isArray(data.unlockedFeatures)) {
          this.unlockedFeatures = data.unlockedFeatures.filter((id) => typeof id === 'string')
        }

        // ADR-0035 (v15) — geriye dönük uyumlu yükleme, veri KAYBI YOK.
        // Alan yoksa (v14 ve öncesi kayıtlar) tepe noktalar mevcut veriden türetilir:
        //   • lifetimePeakMatter ← max(kayıtlı tepe, stats.highestMatter, mevcut dopamin).
        //     `stats.highestMatter` zaten hayat boyu zirvedir; dopamin kapısını geçmiş
        //     her oyuncu böylece açılışlarını aynı oturumda geri kazanır — hiçbir
        //     özellik "kayıtta yoktu" diye yeniden kilitlenmez.
        //   • lifetimePeakShifts ← max(kayıtlı tepe, dimensionShifts, eski D8 satın alımı).
        // syncUnlocks() ve simulateOfflineProgress() bundan SONRA çağrılır; sıralama önemli.
        const restoredPeak = parseSavedDecimal(data.lifetimePeakMatter, new Decimal(10))
        this.lifetimePeakMatter = lifetimeUnlockDopamine(
          this.stats.highestMatter,
          raisedLifetimePeak(this.matter, restoredPeak)
        )
        let restoredShifts = clampSavedNumber(data.lifetimePeakShifts, 0, 0, 1e9)
        if (this.dimensionShifts > restoredShifts) restoredShifts = this.dimensionShifts
        if (this.dimensions[7] && this.dimensions[7].bought > 0) {
          restoredShifts = Math.max(restoredShifts, SACRIFICE_SHIFT_REQ)
        }
        this.lifetimePeakShifts = Math.floor(restoredShifts)
        this.syncUnlocks()

        const now = Date.now()
        const savedLastUpdate = clampSavedNumber(data.lastUpdate, now, 0, now)
        const diffSeconds = Math.max(0, (now - savedLastUpdate) / 1000)
        if (diffSeconds > 3) {
          this.simulateOfflineProgress(diffSeconds)
        }
      } catch (err) {
        console.error('Save yüklenirken hata:', err)
      }
    }
  }
})
