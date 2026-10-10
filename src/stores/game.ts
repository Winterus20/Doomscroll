import { defineStore } from 'pinia'
import { Decimal, D_0, D_1, D_INFINITY } from '../core/math'
import { sounds } from '../core/audio'
import { musicEngine } from '../core/music-engine'
import { SaveSystem } from '../core/save'
import { SAVE_VERSION, MIN_SUPPORTED_SAVE_VERSION, SaveVersionError } from '../core/save-version'
import { safeConfetti, isPageVisible } from '../core/celebrate'
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
  ReactorPhase,
  CrisisInterventionType,
  CrisisDilemma,
  CrisisDilemmaOption,
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
import {
  calculateCosmicPreyLadder,
  calculateEventHorizon,
  calculateWritingParadox
} from '../core/cosmic-scale'

// P1 Lab denge: Boşalım bekleme damgası kayıt alanı. types.ts'e dokunmadan
// (bu dosya-only kısıtı) arayüz birleştirmeyle eklenir; eski kayıtlarda
// tanımsız gelir ve yükleme hazır (beklemesiz) varsayar.
declare module '../models/types' {
  interface SerializedPlayerState {
    lastViralAt?: number
  }
}

function parseSavedDecimal(value: string | number | undefined, fallback: Decimal): Decimal {
  const parsed = new Decimal(value ?? fallback.toString())
  // mag filtresi: break_eternity'de mag log10-mertebedir; 1e9 üstü (≈10^1e9)
  // meşru oyunda asla görülmez, bozuk/şişirilmiş kaydı fallback'e düşürür.
  if (parsed.isNan() || !Number.isFinite(parsed.mag) || parsed.mag > 1e9) {
    return new Decimal(fallback.toString())
  }
  return parsed
}

function clampSavedNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function isValidBuffType(value: unknown): value is BuffType {
  return value === 'fyp' || value === 'heart_frenzy' || value === 'sponsor' || value === 'void' || value === 'espresso' ||
    value === 'planck_surge' || value === 'resonance_boost'
}

/**
 * Özel ses URL'i allowlist: new URL ile parse edilebilmeli, protokol
 * http:/https: olmalı (tercihen https) ve uzunluk 2048'i aşmamalı.
 * Geçemezse boş string döner (müzik motoruna zararlı/uzun URL sızmaz).
 */
function sanitizeCustomAudioUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 2048) return ''
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
  } catch {
    return ''
  }
  return trimmed
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
  1: { partnerTier: 8, label: 'Samanyolu & Karadelik (D8)' },
  2: { partnerTier: 7, label: 'Yıldızlar & Güneş (D7)' },
  3: { partnerTier: 6, label: 'Gezegenler & Dünya (D6)' },
  4: { partnerTier: 5, label: 'Laboratuvar & Şehir (D5)' },
  5: { partnerTier: 4, label: 'Kuark Çorbası (D4)' },
  6: { partnerTier: 3, label: 'Nükleer Çekirdek (D3)' },
  7: { partnerTier: 2, label: 'Elektron Orbitalleri (D2)' },
  8: { partnerTier: 1, label: 'Moleküler Bağlar (D1)' }
}

export const RESOLUTION_MILESTONES: ResolutionMilestone[] = [
  { count: 50, name: 'Kovalent Rezonans', shortName: 'Rezonans', mult: 2, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', desc: '2× Çarpan' },
  { count: 100, name: 'Bohr Yarıçapı', shortName: 'Bohr', mult: 3, colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', desc: '3× Çarpan' },
  { count: 200, name: 'Kuantum Tünelleme', shortName: 'Tünelleme', mult: 4, colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30', desc: '4× Çarpan + %1 Çekim Payı' },
  { count: 250, name: 'Olay Ufku Yoğunluğu', shortName: 'Olay Ufku', mult: 8, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30', desc: '8× Çarpan' },
  { count: 500, name: 'Tekillik Çekirdeği', shortName: 'Tekillik', mult: 16, colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30', desc: '16× Çarpan' },
  { count: 1000, name: 'Uroboros Çöküşü', shortName: 'Uroboros', mult: 32, colorClass: 'text-white bg-white/20 border-white/40', desc: '32× Çarpan' }
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

// Satın alınan her 10 adette boyut çarpanı artışı:
// 1.58 iken ilk koşu 4s 11dk sürüyordu. 1.595 değeri kaskadı yumuşak hızlandırarak ilk koşuyu tam 3s 30dk altın standardına kilitler.
export const DIM_PER_TEN_MULT = 1.595

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
  'Kuantum Radyasyon Paraziti',
  'Olay Ufku Kütle Kaçağı',
  'Gravitasyonel Enerji Emicisi',
  'Hawking Işıması Paraziti',
  'Kozmik Kütleçekim Sülüğü'
]

export const LAB_SEEDS = [
  {
    type: 'photon_resonator' as LabSeedType,
    name: 'Foton Rezonatörü',
    icon: '⚡',
    desc: 'Yüksek frekanslı foton uyarımı. Komşularına +%15 rezonans yayar ve çekim akışını artırır.',
    cost: new Decimal(500),
    growthSeconds: 15,
    lifeSeconds: Infinity,
    matureBoostDesc: '+20% Pasif Kütle & Komşulara +%15',
    harvestRewardDesc: '10 sn Kütle'
  },
  {
    type: 'heavy_nucleon' as LabSeedType,
    name: 'Ağır Nükleon Çekirdeği',
    icon: '⚛️',
    desc: 'Kararlı gravitasyonel kütleçekim çekirdeği. Yoğun pasif kütle üretimi sağlar.',
    cost: new Decimal(50000),
    growthSeconds: 25,
    lifeSeconds: Infinity,
    matureBoostDesc: '+35% Pasif Kütle (Yüksek Yoğunlukla +%76)',
    harvestRewardDesc: '20 sn Kütle'
  },
  {
    type: 'gluon_binder' as LabSeedType,
    name: 'Gluon Bağlayıcı',
    icon: '🌀',
    desc: 'Kuvvetli nükleer kuvvet bağı. Kuantum çökertme ve manuel yutma darbesini ikiye katlar.',
    cost: new Decimal(5e6),
    growthSeconds: 35,
    lifeSeconds: Infinity,
    matureBoostDesc: '×2.0 Manuel Yutma Gücü',
    harvestRewardDesc: '30 sn Kütle'
  },
  {
    type: 'graviton_trap' as LabSeedType,
    name: 'Graviton Tuzağı',
    icon: '🕳️',
    desc: 'Mikro uzay-zaman eğriliği. Kozmik Krizler daha sık gelir ve Gravitasyonel Şok yayar.',
    cost: new Decimal(1e9),
    growthSeconds: 45,
    lifeSeconds: Infinity,
    matureBoostDesc: '+50% Kriz Sıklığı & Komşulara ×1.25',
    harvestRewardDesc: '40 sn Kütle'
  },
  {
    type: 'dark_matter_core' as LabSeedType,
    name: 'Karanlık Madde Çekirdeği',
    icon: '🌌',
    desc: 'Nükleon + Gluon egzotik sentezi. Hem pasif üretimi hem yutma gücünü katlar.',
    cost: new Decimal(1e11),
    growthSeconds: 50,
    lifeSeconds: Infinity,
    matureBoostDesc: '+50% Pasif & ×1.5 Yutma',
    harvestRewardDesc: '50 sn Kütle',
    isMutationOnly: true
  },
  {
    type: 'magnetic_shield' as LabSeedType,
    name: 'Manyetik Plazma Kalkanı',
    icon: '🛡️',
    desc: 'Foton + Nükleon rezonansı. Olay ufkunu korur, Kozmik Parazitlerin kütle emişini -%25 soğurur.',
    cost: new Decimal(1e12),
    growthSeconds: 50,
    lifeSeconds: Infinity,
    matureBoostDesc: '+40% Pasif & Parazit Emişi -%25',
    harvestRewardDesc: '1 dk Kütle',
    isMutationOnly: true
  },
  {
    type: 'tachyon_flux' as LabSeedType,
    name: 'Takyon Akısı',
    icon: '💫',
    desc: 'Graviton + Gluon sentezi. Işık ötesi hız: Manuel yutma gücünü 2× ve Kriz sıklığını +%30 artırır.',
    cost: new Decimal(1e13),
    growthSeconds: 60,
    lifeSeconds: Infinity,
    matureBoostDesc: '×2.0 Yutma & +%30 Kriz',
    harvestRewardDesc: '1.5 dk Kütle',
    isMutationOnly: true
  },
  {
    type: 'higgs_boson' as LabSeedType,
    name: 'Higgs Bozonu',
    icon: '💥',
    desc: 'Foton + Graviton efsanevi kuantum birleşimi. Tüm evrensel kütle üretimini kalıcı olarak üçe katlar!',
    cost: new Decimal(1e15),
    growthSeconds: 75,
    lifeSeconds: Infinity,
    matureBoostDesc: '+200% (×3) Tüm Küresel Kütle!',
    harvestRewardDesc: '2 dk Kütle',
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
    result: 'dark_matter_core',
    parent1: 'heavy_nucleon',
    parent2: 'gluon_binder',
    name: 'Karanlık Madde Çekirdeği',
    icon: '🌌',
    hint: 'Ağır Nükleon (⚛️) ve Gluon Bağlayıcı (🌀) komşuluğu ile sentezlenir.',
    desc: 'Nükleon ile gluonun yoğun füzyonu: Hem Pasif üretim hem Manuel Yutma gücü katlanır.'
  },
  {
    result: 'magnetic_shield',
    parent1: 'photon_resonator',
    parent2: 'heavy_nucleon',
    name: 'Manyetik Plazma Kalkanı',
    icon: '🛡️',
    hint: 'Foton Rezonatörü (⚡) ve Ağır Nükleon (⚛️) komşuluğu ile sentezlenir.',
    desc: 'Foton dalgasıyla nükleer manyetizma: Olay Ufkuna dadanan Kozmik Parazitlerin emişini %25 soğurur.'
  },
  {
    result: 'tachyon_flux',
    parent1: 'graviton_trap',
    parent2: 'gluon_binder',
    name: 'Takyon Akısı',
    icon: '💫',
    hint: 'Graviton Tuzağı (🕳️) ve Gluon Bağlayıcı (🌀) komşuluğu ile sentezlenir.',
    desc: 'Işık ötesi hız: Manuel yutma gücü ikiye katlanır ve Kozmik Kriz sıklığı %30 artar.'
  },
  {
    result: 'higgs_boson',
    parent1: 'photon_resonator',
    parent2: 'graviton_trap',
    name: 'Higgs Bozonu',
    icon: '💥',
    hint: 'Foton Rezonatörü (⚡) ve Graviton Tuzağı (🕳️) komşuluğu ile sentezlenir.',
    desc: 'Kozmik tekillik çekirdeği: Tüm küresel kütle üretimini kalıcı olarak üçe katlar!'
  }
]

// ---- P1 Lab denge sabitleri (magic number dağıtmamak için tek blok) ----
// Tohum maliyeti yumuşak ölçekleme: lifetimePeakMatter log10'u bu eşiği
// aşınca her basamak aralığında maliyet katlanır, tavanla sınırlıdır.
const LAB_SEED_COST_SOFT_START_LOG = 65
const LAB_SEED_COST_DECADES_PER_STEP = 25
const LAB_SEED_COST_STEP_MULT = 2
const LAB_SEED_COST_MAX_MULT = 64
// Süperkritik Boşalım bekleme süresi (sn, totalPlaytime damgasıyla ölçülür).
const VIRAL_DROP_COOLDOWN_SECONDS = 120
// Egzotik tek-meta kırma: ebeveyn desteksiz egzotik hücrenin bonusu
// 1.0'a doğru bu bölenle yarıya indirilir.
const EXOTIC_LONE_PENALTY_DIVISOR = 2
const EXOTIC_LONE_PENALTY_SEEDS: readonly LabSeedType[] = ['higgs_boson', 'dark_matter_core', 'tachyon_flux', 'magnetic_shield']
// Dalgalanma Rejimi hasat ikilemesi: şans ve çarpan.
const FLUCTUATION_HARVEST_DOUBLE_CHANCE = 0.2
const FLUCTUATION_HARVEST_DOUBLE_MULT = 2
// Merkez hücre (id 4) manuel yutma bonusu.
const LAB_CENTER_CLICK_BONUS = 1.3

/** Efektif tohum maliyeti çarpanı (1 = taban maliyet). Bozuk tepeye karşı güvenli. */
function labSeedCostMultiplier(peak: Decimal): number {
  if (peak.isNan() || Number.isNaN(peak.mag)) return 1
  const peakLog = peak.log10().toNumber()
  if (!Number.isFinite(peakLog) || peakLog <= LAB_SEED_COST_SOFT_START_LOG) return 1
  const steps = Math.floor((peakLog - LAB_SEED_COST_SOFT_START_LOG) / LAB_SEED_COST_DECADES_PER_STEP)
  if (!Number.isFinite(steps) || steps <= 0) return 1
  return Math.min(LAB_SEED_COST_MAX_MULT, Math.pow(LAB_SEED_COST_STEP_MULT, steps))
}

/** Taban maliyeti tepe-noktaya göre ölçekler; LAB_SEEDS.cost sabitini değiştirmez. */
function labEffectiveSeedCost(baseCost: Decimal, peak: Decimal): Decimal {
  const mult = labSeedCostMultiplier(peak)
  return mult === 1 ? baseCost : baseCost.times(mult)
}

/** Egzotik hücrenin tarif ebeveynleri (tarifesizse boş dizi). */
function labExoticParents(seed: LabSeedType): LabSeedType[] {
  const recipe = LAB_RECIPES.find((r) => r.result === seed)
  return recipe ? [recipe.parent1, recipe.parent2] : []
}

/** 3x3 matriste ortogonal (paylaşılan kenar) komşular. */
function labNeighborCells(cells: LabCell[], idx: number): LabCell[] {
  const row = Math.floor(idx / 3)
  const col = idx % 3
  const out: LabCell[] = []
  if (row > 0) out.push(cells[idx - 3])
  if (row < 2) out.push(cells[idx + 3])
  if (col > 0) out.push(cells[idx - 1])
  if (col < 2) out.push(cells[idx + 1])
  return out
}

/** Komşular arasında en az 1 olgun tarif-ebeveyni var mı? (tarifesiz hücre destekli sayılır) */
function hasMatureParentSupport(neighbors: LabCell[], parents: readonly LabSeedType[]): boolean {
  if (parents.length === 0) return true
  return neighbors.some((n) => n.isMature && n.seedType !== null && parents.includes(n.seedType))
}

export const CRISIS_INTERVENTIONS = [
  {
    id: 'quantum_compression' as CrisisInterventionType,
    name: 'Kuantum Sıkıştırma',
    icon: '⚡',
    heatChange: 25,
    baseCooldown: 20,
    desc: 'Olay ufkunda kuantum tekilliği sıkıştırır; ekrana anında 1 adet Altın Kozmik Dalgalanma (Anomali) fırlatır.',
    tacticalTip: 'Hızlı anomali zincirleri ve kombo çarpanlarını başlatmak için idealdir. (Bekleme: 20s)'
  },
  {
    id: 'time_dilation' as CrisisInterventionType,
    name: 'Zaman Genleşmesi',
    icon: '⏳',
    heatChange: 20,
    baseCooldown: 25,
    desc: 'Gravitasyonel zaman kuyusu oluşturur; ekranda aktif tüm geçici güçlendirmelerin süresine +15 saniye ekler (azami 120s tavan).',
    tacticalTip: 'Süpernova (7×) ve Kütle Patlaması zirvelerini uzatır; 120s tavanı aşamaz. (Bekleme: 25s)'
  },
  {
    id: 'magnetic_vent' as CrisisInterventionType,
    name: 'Manyetik Tahliye',
    icon: '🧲',
    heatChange: -35,
    baseCooldown: 2,
    desc: '1 Kriyojenik Kartuş harcayarak plazmayı tahliye eder; ısıyı 35 puan soğutur, parazitleri temizler ve %175 primle bozdurur.',
    tacticalTip: 'Kriyojenik kartuş harcar (35s dolum). Aşırı ısınmayı önlemek ve Tatlı Noktada kalmak için soğutma valfidir.'
  },
  {
    id: 'planck_surge' as CrisisInterventionType,
    name: 'Planck Patlaması',
    icon: '💥',
    heatChange: 45,
    baseCooldown: 45,
    desc: 'Planck ölçeğindeki vakum enerjisini serbest bırakır; 20 sn boyunca Çekim Hızını 4× ve Manuel Yutma gücünü 10× yapar.',
    tacticalTip: 'Yüksek risk, devasa getiri! Isı sınırına dikkat edin; Tatlı Noktada patlatın. (Bekleme: 45s)'
  }
]

/** Geriye dönük uyumluluk takma listesi */
export const CRISIS_SPELLS = CRISIS_INTERVENTIONS.map((intv) => ({
  id: intv.id as CrisisSpellType,
  name: intv.name,
  icon: intv.icon,
  desc: intv.desc,
  energyCost: Math.abs(intv.heatChange),
  backfireChance: 0,
  backfireDesc: ''
}))

export const SINGULARITY_UPGRADES = [
  {
    id: 'eye_drops',
    name: 'Optik Soğutucu',
    icon: '💧',
    desc: 'Lazer odaklama lenslerini soğutur. Kademe üretimlerini her seviye 2× çarpar.',
    baseCost: 1,
    costMult: 2,
    maxLevel: 10
  },
  {
    id: 'muted_alerts',
    name: 'Kozmik Parazit Filtresi',
    icon: '🔕',
    desc: 'Arka plan gürültüsünü filtreler. Kozmik Dalgalanmaların geliş aralığını her seviye %12 kısaltır.',
    baseCost: 2,
    costMult: 2.5,
    maxLevel: 5
  },
  {
    id: 'fast_charger',
    name: 'Kuantum Güç Kaynağı',
    icon: '🔌',
    desc: 'Enerji hiç bitmez. Çekim Hızı (Hz) taban indirimini güçlendirir.',
    baseCost: 3,
    costMult: 3,
    maxLevel: 5
  },
  {
    id: 'caffeine_drip',
    name: 'Taktil Çekim Katalizörü',
    icon: '🧪',
    desc: 'Manuel Yutma gücüne saniyelik üretimin her seviye %5\'ini ekler!',
    baseCost: 5,
    costMult: 3,
    maxLevel: 5
  },
  {
    id: 'neural_chip',
    name: 'Otonom Çekim Çipi',
    icon: '🤖',
    desc: 'Tüm Otomatik Çekim Botlarının çalışma frekansını her seviye 1.5× hızlandırır.',
    baseCost: 4,
    costMult: 2.5,
    maxLevel: 5
  },
  {
    id: 'neural_nest',
    name: 'Rezonans Yuvası',
    icon: '🐜',
    desc: 'Kuantum rezonatör kolonisinin üreme hızını her seviye %10 artırır.',
    baseCost: 6,
    costMult: 3,
    maxLevel: 5
  },
  {
    id: 'guilt_immunity',
    name: 'Parazit Kalkanı',
    icon: '🛡️',
    desc: 'Kozmik parazitlerin emdiği kütle %50 azalır, temizlendiklerinde %150 prim verir.',
    baseCost: 3,
    costMult: 4,
    maxLevel: 3
  },
  {
    id: 'break_singularity',
    name: 'Planck Duvarını Yıkma',
    icon: '⚡',
    desc: 'Kütle 1.79e308 üstüne çıkabilir. Tekillikte Shift/Galaxy botları beklemeyi bırakır, sınırın ötesinde normal çalışır.',
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
    desc: 'Ağacın kökü. Tüm dalları açar ve her çöküş ile sıfırlamada 10.000 g başlangıç kütlesi verir.',
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
    desc: 'Rezonans kararlılaşır: tüm kütle üretimi her seviye +%25 kalıcı artar.',
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
    desc: 'Kozmik Çöküşe yaklaşmayı hızlandırır: Tekillik kazancını 2× katlar.',
    branch: 'passive',
    cost: 8,
    requires: ['prod_echo'],
    effect: 'dawn_speed'
  },
  {
    id: 'break_singularity',
    name: 'Planck Duvarını Yıkma',
    icon: '⚡',
    desc: 'Kütle 1.79e308 üstüne çıkabilir. Tekillikte Shift/Galaxy botları beklemeyi bırakır, sınırın ötesinde normal çalışır.',
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
    name: 'Apex Uroboros',
    icon: '🌀',
    desc: 'Ağacın zirvesi: evrensel kütle tekilliği — tüm üretim kalıcı 10× katlanır.',
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

function calcDimensionExactTotal(
  tier: number,
  baseCost: Decimal,
  fullMult: Decimal,
  bought: number,
  packs: number,
  flat: Decimal
): Decimal {
  if (packs <= 0) return D_0
  let total = D_0
  let remaining = 10 * packs
  let cursor = bought
  while (remaining > 0) {
    const bucket = Math.floor(cursor / 10)
    const unitPrice = dimensionCostForBucket(tier, bucket, baseCost, fullMult).div(10)
    const take = Math.min(10 - (cursor % 10), remaining)
    total = total.plus(unitPrice.times(take))
    cursor += take
    remaining -= take
  }
  return total.times(flat)
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

// ---- Tickspeed tekil maliyet: tickspeedCost getter ile birebir (floor sırası dahil) ----
function tickspeedStepCost(
  step: number,
  base: Decimal,
  ratio: Decimal,
  infl: Decimal,
  isPrivate: boolean,
  hasDiscount: boolean,
  effMult: number
): Decimal {
  let c = base.times(Decimal.pow(ratio, step)).times(infl)
  if (isPrivate) c = c.times(0.85).floor()
  if (hasDiscount) c = c.times(0.95).floor()
  if (effMult !== 1) c = c.times(effMult).floor()
  return c
}

function calcTickspeedExactTotal(
  start: number,
  count: number,
  base: Decimal,
  ratio: Decimal,
  infl: Decimal,
  isPrivate: boolean,
  hasDiscount: boolean,
  effMult: number
): Decimal {
  let total = D_0
  for (let i = 0; i < count; i++) {
    total = total.plus(tickspeedStepCost(start + i, base, ratio, infl, isPrivate, hasDiscount, effMult))
  }
  return total
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

/** Kayıttan gelen unlockedFeatures id'lerini süzmek için özellik merdiveni beyaz listesi. */
const FEATURE_IDS = new Set(FEATURE_UNLOCKS.map((f) => f.id))

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
  formatBuffActive: boolean,
  relicCount = 0,
  matureCellsCount = 0
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
    '|' + formatBuffUntil + '|' + challengeTimeMult + '|' + (formatBuffActive ? 'A' : 'X') +
    '|' + relicCount + '|' + matureCellsCount
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
    labMode: 'overdrive' as LabMode,
    discoveredFormulas: ['photon_resonator'] as LabSeedType[],
    reactorCollapseCount: 0,
    isViralActive: false,
    viralTimeRemaining: 0,
    viralViews: 0,
    // P1: son Süperkritik Boşalım damgası (totalPlaytime sn). Negatif başlangıç
    // ilk tetiklemeyi beklemesiz yapar; eski kayıtlarda da aynı varsayılır.
    lastViralAt: -VIRAL_DROP_COOLDOWN_SECONDS,

    // Mini-Oyun 2: Olay Ufku Kararsızlık Reaktörü ve Hibrit Kriz Sistemi (Crisis 3.0)
    reactorHeat: 0,
    reactorMeltdownTimer: 0,
    activeCrisisDilemma: null as CrisisDilemma | null,
    dilemmaCooldown: 0,
    caffeineEnergy: 0, // Geriye dönük uyumluluk state alanı
    maxCaffeineEnergy: 100,
    crisisBackfireDebuff: 0, // saniye cinsinden debuff sayacı
    reactorCoolantCharges: 3, // Kriyojenik Soğutucu Rezervi (maks 3)
    reactorCoolantTimer: 0, // Kartuş dolum sayacı (sn)
    reactorMomentum: 1.0, // Tatlı Nokta Rezonans Momenti (1.0x - 5.0x)
    reactorCooldowns: {} as Record<string, number>,

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
    // SINGULARITY_UPGRADES'teki 8 id ile birebir tutarlı olmalı (kayıt göçü + ağaç senkronu bu anahtarları okur)
    singularityUpgrades: {
      eye_drops: 0,
      muted_alerts: 0,
      fast_charger: 0,
      caffeine_drip: 0,
      neural_chip: 0,
      neural_nest: 0,
      guilt_immunity: 0,
      break_singularity: 0
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
    // QoL: aktif oyun sekmesi (kayıt edilmez) — otomatik olaylar yalnızca
    // ilgili sekme açıkken kutlar (örn. lab oto-sentezi `lab` sekmesinde).
    activeGameTab: 'dimensions' as string,

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

    // Kozmik Haber Bandı (ADR-0045) — görülen haberler & etkileşimli tıklama
    seenNewsIds: [] as string[],
    uselessNewsClicks: 0,
    hasClickedSecretNews: false,

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
      screenShake: true,
      crtEffect: true,
      juiceMode: 'balanced' as const,
      screenOverlayEffects: true,
      holoCardsEnabled: true,
      swirlShaderQuality: 'balanced' as const,
      sequentialStrike: true,
      batterySaver: false,
      floatingTexts: true,
      newsTickerEnabled: true,
      swipeSensitivity: 'balanced' as const,
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
      challengesCompleted: 0,
      reactorCollapses: 0
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
      const relicBase = this.reactorRelicBonuses.tickspeedBase
      const baseReduction = Math.max(0.7, 0.89 - chargerBonus - relicBase)
      const galaxyBonus = Math.max(0.35, baseReduction - state.galaxies * 0.008)
      const activeMods = state.activeChallenge ? getChallengeById(state.activeChallenge)?.modifiers : undefined
      const buyScale = activeMods?.tickspeedBuyMultScale ?? 1
      const baseMult = activeMods?.tickspeedBaseMult ?? 1
      let mult = Decimal.pow(1 / galaxyBonus, state.tickspeedBought * buyScale).times(baseMult)
      const espresso = state.activeBuffs.find((b) => b.type === 'espresso')
      if (espresso) {
        mult = mult.times(espresso.multiplier)
      }
      if (this.reactorTickRateMult !== 1) {
        mult = mult.times(this.reactorTickRateMult)
      }
      const planckSurge = state.activeBuffs.find((b) => b.type === 'planck_surge')
      if (planckSurge) {
        mult = mult.times(planckSurge.multiplier)
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
        let amount = new Decimal(26 + 16 * (state.dimensionShifts - 6)).times(shiftMult).floor()
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

    // Planck Duvarı kırıldı mı? (Break Singularity yükseltmesi veya Nöral Ağaç düğümü)
    hasBreakSingularity(state): boolean {
      return (
        (state.singularityUpgrades?.break_singularity || 0) >= 1 ||
        (state.neuralNodesBought?.break_singularity || 0) >= 1
      )
    },

    // Tekillik bekleme modu: Break Singularity alınmadıysa e308 üstünde
    // Shift/Galaxy botları ateşlenmez (tekillik penceresi korunur).
    singularityHoldActive(state): boolean {
      return state.matter.gte(D_INFINITY) && !this.hasBreakSingularity
    },

    // --- OTONOMİ KOKPİTİ GETTER'LARI ---
    isCockpitMode(state): boolean {
      return state.singularities >= 1
    },

    isAutobuyerCockpitMode(state): boolean {
      return state.singularities >= 1
    },

    activeAutobuyersCount(state): number {
      return Object.values(state.autobuyers).filter((b) => b.unlocked && b.enabled).length
    },

    totalAutobuyersCount(state): number {
      return Object.values(state.autobuyers).filter((b) => b.unlocked).length
    },

    autobuyerFleetSpeedMult(): number {
      const chipBonus = Math.pow(1.5, this.singularityUpgrades?.neural_chip || 0)
      const overclock = this.neuralEffects?.botFrequencyMult || 1
      return chipBonus * overclock
    },

    autobuyerEffectiveInterval() {
      return (id: string): number => {
        const bot = this.autobuyers[id]
        if (!bot) return 1
        const speed = this.autobuyerFleetSpeedMult
        return speed > 0 ? bot.interval / speed : bot.interval
      }
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
      if (state.singularities >= 1) return false // Prestij sonrası dükkan kapalı; tüm botlar kokpitte
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

      let milestoneHint = 'Henüz başındasın — olay ufku yeni ısınıyor.'
      if (meters >= 8848) {
        milestoneHint = 'Everest Dağı Zirvesi (8,848 m) aşıldı! Atmosferik gazlar tekilliğe çekiliyor.'
      } else if (meters >= 3776) {
        milestoneHint = 'Fuji Dağı (3,776 m) seviyesi! Kütleçekimsel dalga boyu genişliyor.'
      } else if (meters >= 828) {
        milestoneHint = 'Burç Halife (828 m) aşıldı! Tekillik gökdelen ölçeğini yutuyor.'
      } else if (meters >= 330) {
        milestoneHint = 'Eyfel Kulesi (330 m) aşıldı! Metalik kafes bağları parçalandı.'
      } else if (meters >= 67) {
        milestoneHint = 'Galata Kulesi (67 m) aşıldı! Laboratuvar çevresi tekilliğe gömülüyor.'
      } else if (meters >= 10) {
        milestoneHint = '3 katlı laboratuvar binası ölçeği tekilliğe çekildi.'
      }

      let rank = 'Moleküler Ayrıştırıcı'
      let rankColor = 'text-emerald-400'
      const singularities = state.singularities || 0
      if (singularities >= 50 || clicks >= 50000) {
        rank = 'UROBOROS (Kozmik Tekillik)'
        rankColor = 'text-rose-400 font-extrabold animate-pulse'
      } else if (singularities >= 15 || clicks >= 20000) {
        rank = 'Olay Ufku Mühendisi'
        rankColor = 'text-purple-400 font-bold'
      } else if (singularities >= 5 || clicks >= 7500) {
        rank = 'Kuantum Karadelik Mimarı'
        rankColor = 'text-amber-400 font-bold'
      } else if (singularities >= 1 || clicks >= 2500) {
        rank = 'Mikro-Karadelik Tetikleyicisi'
        rankColor = 'text-cyan-400'
      } else if (clicks >= 500) {
        rank = 'Laboratuvar Asistanı'
        rankColor = 'text-blue-400'
      }

      const matterForScale = state.stats.totalMatterProduced.gt(state.matter)
        ? state.stats.totalMatterProduced
        : state.matter
      const notation = state.settings.notation
      const cosmicPrey = calculateCosmicPreyLadder(matterForScale, notation)
      const eventHorizon = calculateEventHorizon(matterForScale, notation)
      const writingParadox = calculateWritingParadox(matterForScale, notation)

      return {
        thumbDistanceMeters: meters,
        thumbDistanceKm: km,
        lostSleepHours: lostHours,
        mentalBatteryPct: mentalBattery,
        blueLightPhotons: bluePhotons,
        zombieRank: rank,
        zombieRankColor: rankColor,
        milestoneHint,
        cosmicPrey,
        eventHorizon,
        writingParadox
      }
    },

    singularityGain(state): Decimal {
      if (state.activeChallenge) return D_0
      if (state.matter.lt(D_INFINITY)) return D_0

      const hasBreak = (state.singularityUpgrades?.break_singularity || 0) >= 1 ||
                       (state.neuralNodesBought?.break_singularity || 0) >= 1

      // Antimatter Dimensions mantığı: Kütle ne kadar fazlaysa o kadar çok SP kazanılır!
      const logMatter = state.matter.log10().toNumber()
      const dawnSpeedMult = memoNeuralEffects(state.neuralNodesBought || {}).dawnSpeedMult
      const spMult = memoChallengeEffects(state.completedChallenges).spMult
      const relicSpMult = this.reactorRelicBonuses.spGainMult
      const totalMult = dawnSpeedMult * spMult * relicSpMult

      const logDiff = Math.max(0, logMatter - 308)
      // Break Singularity yokken divisor = 100, taban 1x
      // Break Singularity varken divisor = 45, taban 3x (daha agresif üstel büyüme)
      const divisor = hasBreak ? 45 : 100
      const basePoints = hasBreak ? 3 : 1

      const rawGain = Decimal.pow(10, logDiff / divisor).times(basePoints).times(totalMult)
      const floored = Decimal.floor(rawGain)
      const minGain = hasBreak ? 3 : 1
      return floored.gte(minGain) ? floored : new Decimal(minGain)
    },

    /**
     * Bir sonraki Tekillik Puanı (SP) için gereken hedef kütle (Antimatter Dimensions tarzı).
     */
    nextSingularityPointAt(state): Decimal {
      if (state.activeChallenge) return D_INFINITY
      const hasBreak = (state.singularityUpgrades?.break_singularity || 0) >= 1 ||
                       (state.neuralNodesBought?.break_singularity || 0) >= 1
      const dawnSpeedMult = memoNeuralEffects(state.neuralNodesBought || {}).dawnSpeedMult
      const spMult = memoChallengeEffects(state.completedChallenges).spMult
      const relicSpMult = this.reactorRelicBonuses.spGainMult
      const totalMult = Math.max(0.001, dawnSpeedMult * spMult * relicSpMult)

      const divisor = hasBreak ? 45 : 100
      const basePoints = hasBreak ? 3 : 1

      const currentGain = this.singularityGain
      const nextTarget = currentGain.plus(1)
      const ratio = nextTarget.div(basePoints * totalMult)
      if (ratio.lte(1)) {
        return D_INFINITY
      }
      const logRatio = ratio.log10().toNumber()
      const neededLog = 308 + divisor * logRatio
      return Decimal.pow(10, neededLog)
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
      const relicCount = state.reactorCollapseCount || 0
      const matureCellsCount = relicCount >= 4 ? state.labCells.filter((c) => c.isMature && c.seedType !== null).length : 0
      const cacheKey = dimMultCacheKey(
        tier, dim.bought, state.dimensionShifts, eyeDropsLvl, sacStr,
        partnerBought, neuralProd, 1,
        state.activeChallenge, dim1GrowthStr, completedJoin,
        state.dimensionCapFloor, state.lifetimePeakShifts, state.formatUnlockBuffTier,
        state.formatUnlockBuffUntil, challengeTimeMult, formatBuffActive,
        relicCount, matureCellsCount
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

      // Kozmik Relik Seviye 4: Rezonanstaki hücre başına boyutlara evrensel ivme
      if (relicCount >= 4 && matureCellsCount > 0) {
        const boostPerCell = 0.10 + (relicCount - 4) * 0.05
        mult = mult.times(1 + matureCellsCount * boostPerCell)
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
      // dim_cost_x085 bayrağı anahtarın parçası: başarım kazanılınca indirimli
      // maliyet bayat cache'ten dönmez (checkAchievements ayrıca cache'i düşürür).
      const hasDimDiscount = hasAchievementReward(state.achievements, 'dim_cost_x085')
      const cacheKey = bucket + '|' + infl + '|' + eff.dimCostMult + '|' + (hasDimDiscount ? 'D' : 'n')
      const cached = _dimCostCache.get(tier)
      if (cached && cached.key === cacheKey) return cached.val
      let cost = dimensionCostForBucket(tier, bucket, dim.baseCost, dim.costMult)
      cost = cost.times(challengeCostInflationMult(state))
      if (eff.dimCostMult !== 1) {
        cost = cost.times(eff.dimCostMult)
      }
      if (hasDimDiscount) {
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
        const dimDiscount = hasAchievementReward(state.achievements, 'dim_cost_x085') ? 0.85 : 1
        const flat = infl.times(eff.dimCostMult).times(dimDiscount)

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
      const hasMagneticShield = state.labCells.some((c) => c.isMature && c.seedType === 'magnetic_shield')
      const shieldFactor = hasMagneticShield ? 0.75 : 1.0
      const d3Leech = tierSlackerLeechMult(state.dimensions, this.unlockedDimensionsCount)
      return baseLeech * factor * achFactor * shieldFactor * d3Leech
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

    // Crisis 2.0: Olay Ufku Kararsızlık Reaktörü Getter'ları
    reactorPhase(state): ReactorPhase {
      if (state.reactorMeltdownTimer > 0) return 'meltdown'
      if (state.reactorHeat <= 30) return 'dormant'
      if (state.reactorHeat <= 60) return 'resonance'
      if (state.reactorHeat < 100) return 'sweet_spot'
      return 'meltdown'
    },

    reactorMassMult(): number {
      const phase = this.reactorPhase
      if (phase === 'sweet_spot') return 8.0 * (this.reactorMomentum || 1.0)
      if (phase === 'meltdown') return 0.5
      return 1.0
    },

    reactorTickRateMult(): number {
      const phase = this.reactorPhase
      if (phase === 'resonance' || phase === 'sweet_spot') return 1.5
      return 1.0
    },

    reactorAnomalyRateMult(): number {
      const phase = this.reactorPhase
      if (phase === 'sweet_spot') return 2.0
      if (phase === 'resonance') return 1.3
      return 1.0
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

    // Kuantum Sentez Reaktörü: Akı Matrisi Pasif Çarpanı (Sinerjiler, Merkez Çekirdek, Satır/Sütun ve Rejimler)
    labPassiveMultiplier(state): Decimal {
      let mult = D_1
      const isHeavy = (t: LabSeedType | null) => t === 'heavy_nucleon' || t === 'dark_matter_core' || t === 'magnetic_shield'

      // Hücre bazlı temel çarpan ve komşuluk sinerjileri
      state.labCells.forEach((c, idx) => {
        if (!c.isMature || !c.seedType) return

        let cellBoost = 1.0
        if (c.seedType === 'photon_resonator') cellBoost = 1.20
        else if (c.seedType === 'heavy_nucleon') cellBoost = 1.35
        else if (c.seedType === 'dark_matter_core') cellBoost = 1.50
        else if (c.seedType === 'magnetic_shield') cellBoost = 1.40
        else if (c.seedType === 'higgs_boson') cellBoost = 3.00

        // Komşuları bul (3x3 grid)
        const row = Math.floor(idx / 3)
        const col = idx % 3
        const neighborCells: LabCell[] = []
        if (row > 0) neighborCells.push(state.labCells[idx - 3])
        if (row < 2) neighborCells.push(state.labCells[idx + 3])
        if (col > 0) neighborCells.push(state.labCells[idx - 1])
        if (col < 2) neighborCells.push(state.labCells[idx + 1])

        const matureNeighbors = neighborCells.filter((n) => n.isMature && n.seedType)

        // 1. Foton Komşuluğu: +%15 rezonans
        if (matureNeighbors.some((n) => n.seedType === 'photon_resonator')) {
          cellBoost *= 1.15
        }

        // 2. Graviton Komşuluğu: Gravitasyonel Şok (×1.25)
        if (matureNeighbors.some((n) => n.seedType === 'graviton_trap')) {
          cellBoost *= 1.25
        }

        // 3. Kararlı Nükleer Sinerji: İki kararlı parçacık (+%30)
        if (isHeavy(c.seedType) && matureNeighbors.some((n) => isHeavy(n.seedType))) {
          cellBoost *= 1.30
        }

        // 4. Merkez Odak Çekirdeği (Hücre 4): Kendisi 1.5×, komşularına +%20 yayar
        if (idx === 4) {
          cellBoost *= 1.50
        } else if (matureNeighbors.some((n) => n.id === 4)) {
          cellBoost *= 1.20
        }

        // 5. Egzotik tek-meta kırma: ebeveyn desteksiz egzotik yarı bonus
        if (EXOTIC_LONE_PENALTY_SEEDS.includes(c.seedType)) {
          const parents = labExoticParents(c.seedType)
          if (!hasMatureParentSupport(matureNeighbors, parents)) {
            cellBoost = 1 + (cellBoost - 1) / EXOTIC_LONE_PENALTY_DIVISOR
          }
        }

        mult = mult.times(cellBoost)
      })

      // Satır Uyumları (Satır 0, 1, 2)
      for (let r = 0; r < 3; r++) {
        const rowCells = [state.labCells[r * 3], state.labCells[r * 3 + 1], state.labCells[r * 3 + 2]]
        if (rowCells.every((c) => c.isMature && c.seedType !== null)) {
          mult = mult.times(1.12)
          // Mono-izotop uyumu (3'ü de aynı)
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

      // Plazma Besleme Rejimi (Superconductor: Sabit 2.5× Pasif Kütle)
      if (state.labMode === 'superconductor') {
        mult = mult.times(2.5)
      }

      // Parçacık Atlası Keşif Bonusu (Her keşfedilen formül kalıcı +%3)
      const recipeResults = new Set(LAB_RECIPES.map((recipe) => recipe.result))
      const codexCount = (state.discoveredFormulas || []).filter((id) => recipeResults.has(id)).length
      mult = mult.times(1 + codexCount * 0.03)

      // Canlı Süperkritik Boşalım Dalgası
      if (state.isViralActive) {
        const matureCount = state.labCells.filter((c) => c.isMature && !!c.seedType).length
        const viralSurge = (5.0 + matureCount * 1.0) * (state.labMode === 'overdrive' ? 2.0 : 1.0)
        mult = mult.times(viralSurge)
      }

      return mult
    },

    // Kuantum Matrisi: Manuel Yutma Çarpanı (Gluon, Karanlık Madde, Takyon)
    labClickMultiplier(state): Decimal {
      let mult = D_1
      state.labCells.forEach((c, idx) => {
        if (!c.isMature || !c.seedType) return

        let cellFactor = 1
        if (c.seedType === 'gluon_binder') cellFactor = 2.0
        else if (c.seedType === 'dark_matter_core') cellFactor = 1.5
        else if (c.seedType === 'tachyon_flux') cellFactor = 2.0
        else return

        // Merkez hücre bonusu
        if (idx === 4) {
          cellFactor *= LAB_CENTER_CLICK_BONUS
        }

        // Egzotik tek-meta kırma: ebeveyn desteksiz egzotik yarı bonus
        if (EXOTIC_LONE_PENALTY_SEEDS.includes(c.seedType)) {
          const parents = labExoticParents(c.seedType)
          if (!hasMatureParentSupport(labNeighborCells(state.labCells, idx), parents)) {
            cellFactor = 1 + (cellFactor - 1) / EXOTIC_LONE_PENALTY_DIVISOR
          }
        }

        mult = mult.times(cellFactor)
      })

      if (state.isViralActive) {
        mult = mult.times(2.5)
      }

      return mult
    },

    // Kuantum Matrisi: Kozmik Dalgalanma / Kriz Sıklığı (Graviton, Takyon, Higgs)
    labAnomalyMultiplier(state): number {
      let bonus = 1.0
      state.labCells.forEach((c) => {
        if (c.isMature && c.seedType) {
          if (c.seedType === 'graviton_trap') bonus *= 1.5
          else if (c.seedType === 'tachyon_flux') bonus *= 1.3
          else if (c.seedType === 'higgs_boson') bonus *= 1.4
        }
      })

      if (state.isViralActive) {
        bonus *= 3.0
      }

      return bonus
    },

    // Reaktörün Süperkritik Boşalım Çarpanı
    labViralMultiplier(state): number {
      const matureCount = state.labCells.filter((c) => c.isMature && !!c.seedType).length
      return (5.0 + matureCount * 1.0) * (state.labMode === 'overdrive' ? 2.0 : 1.0)
    },

    // P1: Boşalım bekleme sayacı (sn). Kurcalanmış gelecek damgaya karşı tavanlıdır.
    viralCooldownRemaining(state): number {
      const last = typeof state.lastViralAt === 'number' && Number.isFinite(state.lastViralAt)
        ? state.lastViralAt
        : -VIRAL_DROP_COOLDOWN_SECONDS
      const played = state.stats.totalPlaytime || 0
      const remaining = VIRAL_DROP_COOLDOWN_SECONDS - (played - last)
      return Math.max(0, Math.min(VIRAL_DROP_COOLDOWN_SECONDS, remaining))
    },

    // P1: Boşalım butonu etkinliği — LabTab bu getter'a bağlanır.
    canTriggerViralDrop(): boolean {
      return this.labHype >= 100 && !this.isViralActive && this.viralCooldownRemaining <= 0
    },

    // P1: Tohumun tepe-noktaya göre efektif maliyeti (LabTab fiyat gösterimi için).
    labSeedEffectiveCost(state) {
      return (seedType: LabSeedType): Decimal => {
        const seedDef = LAB_SEEDS.find((s) => s.type === seedType)
        if (!seedDef) return D_0
        return labEffectiveSeedCost(seedDef.cost, state.lifetimePeakMatter)
      }
    },

    // Parçacık Atlası Keşif Yüzdesi / Global Çarpanı
    labCodexDiscoveredCount(state): number {
      const recipeResults = new Set(LAB_RECIPES.map((recipe) => recipe.result))
      return (state.discoveredFormulas || []).filter((id) => recipeResults.has(id)).length
    },

    labCodexBonusPercent(): number {
      return this.labCodexDiscoveredCount * 3
    },

    // Kozmik Relik ve Reaktör Çöküşü Getters
    canCollapseReactor(state): boolean {
      const exoticFormulas: LabSeedType[] = ['dark_matter_core', 'magnetic_shield', 'tachyon_flux', 'higgs_boson']
      return exoticFormulas.every((formula) => state.discoveredFormulas.includes(formula))
    },

    reactorRelicBonuses(state): {
      tickspeedBase: number
      crisisDuration: number
      spGainMult: number
      dimensionalBoostPerCell: number
      universalMassMult: Decimal
    } {
      const count = state.reactorCollapseCount || 0
      return {
        // Seviye 1: Çekim Hızı (Hz) tabanına kalıcı bonus
        tickspeedBase: count >= 1 ? Math.min(0.15, count * 0.03) : 0,
        // Seviye 2: Kozmik Kriz etki sürelerine kalıcı bonus (saniye)
        crisisDuration: count >= 2 ? (count - 1) * 5 : 0,
        // Seviye 3: Tekillik Çöküşü (Big Crunch) SP kazancına kalıcı çarpan
        spGainMult: count >= 3 ? 1 + (count - 2) * 0.5 : 1,
        // Seviye 4: Rezonanstaki hücre başına boyutlara evrensel ivme
        dimensionalBoostPerCell: count >= 4 ? 0.10 + (count - 4) * 0.05 : 0,
        // Seviye 5+: Sınırsız ölçeklenen evrensel kütle relik çarpanı
        universalMassMult: count >= 5 ? Decimal.pow(2, count - 4) : D_1
      }
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

      const planckSurge = state.activeBuffs.find((b) => b.type === 'planck_surge')
      if (planckSurge) {
        power = power.times(10)
      }

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
      const reactorMult = this.reactorMassMult
      const debuffMult = state.crisisBackfireDebuff > 0 ? 0.5 : 1.0
      const netRatio = Math.max(0.01, 1 - this.slackerLeechPercent)

      return baseProd
        .times(stanceMult)
        .times(buffMult)
        .times(labMult)
        .times(this.achievementMultiplier)
        .times(this.achievementProductionMult)
        .times(reactorMult)
        .times(this.reactorRelicBonuses.universalMassMult)
        .times(debuffMult)
        .times(netRatio)
        .times(this.challengeProdMult)
    },

    dopaminePerSecond(): Decimal {
      return this.matterPerSecond
    },

    /**
     * Ham zincir büyüme tahmini (UI besleme ipucu): açık tier'lardan D1'e akan
     * ham zincir beslemesinin, tam üretim oranıyla ölçeklenmiş kaba üst sınırı.
     * Bilinçli olarak HAMDIR — colony/nap/duruş/buff/lab/reaktör/challenge gibi
     * global çarpanların tamamını tek tek uygulamaz; bunun yerine o anki
     * matterPerSecond/d1.amount oranını ölçek olarak kullanır. Kesin üretim
     * hesabı için değil, "hangi üst tier D1'i en hızlı büyütür" ipucu için okunur.
     */
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

    startingMatter(state): Decimal {
      // 1. Öncelik: Nöral Ağaç kök düğümü (Uykusuzluğun Kalbi) -> 10.000 g
      if ((state.neuralNodesBought?.insomnia_heart || 0) >= 1) {
        return new Decimal(10000)
      }

      // 2. Öncelik: 3 Tekillik Başarımı ('starting_matter') -> 1.000 g
      if (hasAchievementReward(state.achievements, 'starting_matter')) {
        return new Decimal(1000)
      }

      // 3. Varsayılan erken oyun kütlesi -> 10 g
      return new Decimal(10)
    },

    achievementStartingMatter(): Decimal {
      return this.startingMatter
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

    // 10'luk İstasyon Satın Alımı (kısmi kova-aware: 5/10 dolu kovadan alımda sınır doğru fiyatlanır)
    buyDimension(tier: number, playSound = true): boolean {
      if (tier > this.unlockedDimensionsCount) return false
      const dim = this.dimensions[tier - 1]
      if (!dim) return false
      const infl = challengeCostInflationMult({
        activeChallenge: this.activeChallenge,
        challengeCostInflation: this.challengeCostInflation
      })
      const eff = memoChallengeEffects(this.completedChallenges)
      const flat = infl.times(eff.dimCostMult).times(this.achievementDimCostMult)
      const cost = calcDimensionExactTotal(tier, dim.baseCost, dim.costMult, dim.bought, 1, flat)

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

    // Bir İstasyondan Alınabildiği Kadar Satın Al (kısmi kova-aware: hizalı tahmin + net toplamla düzeltme)
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
      const flat = infl.times(eff.dimCostMult).times(this.achievementDimCostMult)
      const budget = this.matter.div(flat)
      const cap = maxBuyPacksCap(this.singularities)
      let packs = calcMaxDimensionPacks(
        tier,
        dim.baseCost,
        dim.costMult,
        startBucket,
        budget,
        cap
      )
      let total = packs > 0
        ? calcDimensionExactTotal(tier, dim.baseCost, dim.costMult, dim.bought, packs, flat)
        : D_0
      while (packs > 0 && this.matter.lt(total)) {
        packs--
        total = packs > 0
          ? calcDimensionExactTotal(tier, dim.baseCost, dim.costMult, dim.bought, packs, flat)
          : D_0
      }
      const mpsBefore = this.matterPerSecond
      if (packs > 0) {
        this.matter = this.matter.minus(total)
        dim.amount = dim.amount.plus(10 * packs)
        dim.bought += 10 * packs
        this.registerChallengeBuy(packs)
      }
      // Kalanla alınabilen tekiller de süpürülür (en fazla 9 adet: sonraki paket zaten karşılanamıyor)
      let swept = 0
      for (let guard = 0; guard < 9; guard++) {
        const bucket = Math.floor(dim.bought / 10)
        const unitCost = dimensionCostForBucket(tier, bucket, dim.baseCost, dim.costMult).div(10).times(flat)
        if (this.matter.lt(unitCost)) break
        this.matter = this.matter.minus(unitCost)
        dim.amount = dim.amount.plus(1)
        dim.bought += 1
        swept++
      }
      if (swept > 0) this.registerChallengeBuy(swept / 10)
      if (packs <= 0 && swept <= 0) return false

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
      const isPrivate = this.currentStance === 'private_mode'
      const hasDiscount = hasAchievementReward(this.achievements, 'tickspeed_discount')
      const eff = memoChallengeEffects(this.completedChallenges)
      const effMult = eff.tickspeedCostMult
      let flat = infl
      if (isPrivate) {
        flat = flat.times(0.85)
      }
      if (hasDiscount) {
        flat = flat.times(0.95)
      }
      if (effMult !== 1) {
        flat = flat.times(effMult)
      }
      const budget = this.matter.div(flat)
      const cap = maxBuyPacksCap(this.singularities)
      let n = calcMaxPacks(base, ratio, start, budget, cap)
      if (n <= 0) return false
      let total = calcTickspeedExactTotal(start, n, base, ratio, infl, isPrivate, hasDiscount, effMult)
      while (n > 0 && this.matter.lt(total)) {
        n--
        total = calcTickspeedExactTotal(start, n, base, ratio, infl, isPrivate, hasDiscount, effMult)
      }
      if (n <= 0) return false
      while (n < cap) {
        const nextTotal = calcTickspeedExactTotal(start, n + 1, base, ratio, infl, isPrivate, hasDiscount, effMult)
        if (nextTotal.lte(this.matter)) {
          n++
          total = nextTotal
        } else break
      }
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
    // Sıra: ucuz üreticiden pahalıya (D1 -> D8), küresel çarpan (Tickspeed) en son.
    // Tersi sıra pahalı üst kademenin kasayı eritip D1'i aç bırakıyordu.
    maxAll(): void {
      const mpsBefore = this.matterPerSecond
      let boughtAny = false
      for (let t = 1; t <= this.unlockedDimensionsCount; t++) {
        if (this.buyMaxDimension(t, false, false)) {
          boughtAny = true
        }
      }
      if (this.buyMaxTickspeed(false, false)) {
        boughtAny = true
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

      // Kuantum Reaktör Plazma Şarjı (Superconductor modu hariç ve canlı akışta değilken)
      if (this.isFeatureUnlocked('lab') && this.labMode !== 'superconductor' && !this.isViralActive) {
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
        safeConfetti({
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
      if (capAfter > capBefore && playSound) {
        this.celebrateFormatUnlock(capAfter)
      }

      this.matter = this.startingMatter
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
        safeConfetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#a855f7', '#ec4899', '#06b6d4']
        })
      }

      // Otomatik botlar çalışırken makro sarsıntı ve arpej zincirini tetikleme (sadece manuel basışta)
      if (typeof window !== 'undefined' && playSound) {
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
      this.matter = this.startingMatter
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
        safeConfetti({
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

      // ADR-0036 / Kokpit Garantisi: Prestijli oyuncuların botları asla sıfırlanmaz
      this.ensureAutobuyersPreserved()

      this.matter = this.startingMatter
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
        return this.completeChallenge(playSound)
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
        safeConfetti({
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
    // celebrate=false → update() içinden otomatik tamamlama sessiz geçer (kullanıcı eylemi değil).
    completeChallenge(celebrate = true): boolean {
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
      if (celebrate && isPageVisible() && !this.offlineSimActive) {
        sounds.playSingularity()
        safeConfetti({
          particleCount: 180,
          spread: 120,
          origin: { y: 0.5 },
          colors: ['#f59e0b', '#06b6d4', '#ec4899', '#ffffff']
        })
      }
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
      // P1: taban maliyet sabittir; efektif maliyet tepe-noktayla yumuşak artar.
      const effectiveCost = labEffectiveSeedCost(seedDef.cost, this.lifetimePeakMatter)
      if (this.matter.lt(effectiveCost)) return false

      this.matter = this.matter.minus(effectiveCost)
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

      if (cell.seedType === 'photon_resonator') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(10) : clickPwr.times(50)
      } else if (cell.seedType === 'heavy_nucleon') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(20) : clickPwr.times(200)
      } else if (cell.seedType === 'gluon_binder') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(30) : clickPwr.times(500)
      } else if (cell.seedType === 'graviton_trap') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(40) : clickPwr.times(1500)
      } else if (cell.seedType === 'dark_matter_core') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(50) : clickPwr.times(2500)
      } else if (cell.seedType === 'magnetic_shield') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(60) : clickPwr.times(3500)
      } else if (cell.seedType === 'tachyon_flux') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(90) : clickPwr.times(4500)
      } else if (cell.seedType === 'higgs_boson') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(120) : clickPwr.times(10000)
      }

      reward = reward.times(this.achievementLabYield)

      // P1: Dalgalanma Rejimi hasat ikilemesi (%15 şansla ×2, sessiz)
      if (this.labMode === 'fluctuation' && Math.random() < FLUCTUATION_HARVEST_DOUBLE_CHANCE) {
        reward = reward.times(FLUCTUATION_HARVEST_DOUBLE_MULT)
      }

      this.matter = this.matter.plus(reward)
      this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(reward)
      this.stats.labHarvests = (this.stats.labHarvests || 0) + 1

      // Plazma barına +2.5% taktil katkı (Superconductor modunda durur)
      if (this.labMode !== 'superconductor' && !this.isViralActive) {
        this.labHype = Math.min(100, this.labHype + 2.5)
      }

      // Modül silinmez! Rezonansını tazeleyip tekrar ısınır
      cell.age = 0
      cell.isMature = false

      sounds.playHarvest()
      safeConfetti({
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

    // Algoritma Stüdyosu: Plazma Besleme Rejimini Değiştir
    setLabMode(mode: LabMode): void {
      if (this.labMode === mode) return
      this.labMode = mode
      sounds.playHapticTap()
    },

    triggerSupercriticalVent(): boolean {
      return this.triggerViralDrop()
    },

    // Kuantum Reaktörü: Süperkritik Boşalım! (Supercritical Venting)
    triggerViralDrop(): boolean {
      if (!this.canTriggerViralDrop) return false

      let reward = this.matterPerSecond.gt(0)
        ? this.matterPerSecond.times(60)
        : this.manualClickPower.times(200)

      if (this.labMode === 'overdrive') {
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
      // P1: bekleme damgası kurulur (totalPlaytime tabanlı, kalıcı sayaç).
      this.lastViralAt = this.stats.totalPlaytime || 0

      sounds.playViralDrop()
      safeConfetti({
        particleCount: 160,
        spread: 110,
        origin: { y: 0.55 },
        colors: ['#00d2ff', '#9d4edd', '#10b981', '#f59e0b', '#ffffff']
      })
      return true
    },

    // Meta-İlerleme: Reaktör Çöküşü & Kozmik Relikler (Reactor Collapse)
    collapseReactor(): boolean {
      if (!this.canCollapseReactor) return false

      this.reactorCollapseCount = (this.reactorCollapseCount || 0) + 1
      this.stats.reactorCollapses = (this.stats.reactorCollapses || 0) + 1

      // Matrisi temizle
      this.labCells.forEach((c) => {
        c.seedType = null
        c.age = 0
        c.isMature = false
      })
      this.labHype = 0
      this.isViralActive = false
      this.viralTimeRemaining = 0
      // Formülleri sıfırla (sadece temel foton rezonatörü kalsın)
      this.discoveredFormulas = ['photon_resonator']

      if (typeof window !== 'undefined') {
        sounds.playSingularity()
        safeConfetti({
          particleCount: 200,
          spread: 140,
          origin: { y: 0.5 },
          colors: ['#00d2ff', '#9d4edd', '#f59e0b', '#ffffff']
        })
      }

      return true
    },

    // Crisis 3.0: Olay Ufku Reaktörü Meltdown Tetiklemesi
    triggerReactorMeltdown(): void {
      this.reactorMeltdownTimer = 10
      this.reactorHeat = 100
      this.caffeineEnergy = 100
      this.reactorMomentum = 1.0 // Meltdown anında tüm birikmiş rezonans momenti buharlaşır
      sounds.playMeltdownWarning()
    },

    // Crisis 3.0: 4 Taktiksel Müdahale (Cooldown & Kartuş Korumalı)
    castCrisisIntervention(interventionType: CrisisInterventionType): boolean {
      if (this.reactorMeltdownTimer > 0) return false // Meltdown kilitlenmesi

      if (!this.reactorCooldowns) {
        this.reactorCooldowns = {}
      }

      // 1. Cooldown kontrolü
      if ((this.reactorCooldowns[interventionType] || 0) > 0) {
        return false
      }

      // 2. Manyetik Tahliye özel kartuş kontrolü
      if (interventionType === 'magnetic_vent') {
        const currentCharges = typeof this.reactorCoolantCharges === 'number' ? this.reactorCoolantCharges : 3
        if (currentCharges <= 0) {
          return false // Soğutucu rezervi boş!
        }
        this.reactorCoolantCharges = Math.max(0, currentCharges - 1)
        if (this.reactorCoolantCharges < 3 && (this.reactorCoolantTimer || 0) <= 0) {
          this.reactorCoolantTimer = 35 // Bir sonraki kartuş için 35 sn sayacı
        }
        this.reactorCooldowns[interventionType] = 2 // Çift tıklama spam koruması
        this.reactorHeat = Math.max(0, this.reactorHeat - 35)

        if (this.slackers.length > 0) {
          this.slackers.forEach((s) => {
            const refund = s.leechedDopamine.times(1.75)
            this.matter = this.matter.plus(refund)
            this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(refund)
            this.stats.slackersFired++
          })
          this.slackers = []
        }
        sounds.playVentCooling()
      } else if (interventionType === 'quantum_compression') {
        this.reactorCooldowns[interventionType] = 20
        this.spawnAnomaly(true)
        this.reactorHeat = Math.min(100, this.reactorHeat + 25)
        sounds.playCrisisDecision()
      } else if (interventionType === 'time_dilation') {
        this.reactorCooldowns[interventionType] = 25
        // Azami 120s tavan koruması (buff cap)
        this.activeBuffs.forEach((b) => {
          const headroom = Math.max(0, 120 - b.remaining)
          const addition = Math.min(15, headroom)
          b.remaining += addition
          b.duration += addition
        })
        this.reactorHeat = Math.min(100, this.reactorHeat + 20)
        sounds.playCrisisDecision()
      } else if (interventionType === 'planck_surge') {
        this.reactorCooldowns[interventionType] = 45
        const existing = this.activeBuffs.find((b) => b.type === 'planck_surge')
        if (existing) {
          const headroom = Math.max(0, 120 - existing.remaining)
          const addition = Math.min(20, headroom)
          existing.remaining += addition
          existing.duration += addition
        } else {
          this.activeBuffs.push({
            id: `buff-planck-${Date.now()}`,
            type: 'planck_surge',
            name: '💥 Planck Patlaması (4× Hz, 10× Yutma)',
            duration: 20,
            remaining: 20,
            multiplier: 4
          })
        }
        this.reactorHeat = Math.min(100, this.reactorHeat + 45)
        sounds.playCrisisDecision()
      }

      this.stats.spellsCast = (this.stats.spellsCast || 0) + 1
      this.caffeineEnergy = this.reactorHeat

      if (this.reactorHeat >= 100) {
        this.triggerReactorMeltdown()
      }

      safeConfetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#a855f7', '#06b6d4', '#ec4899', '#f59e0b']
      })
      return true
    },

    // Geriye dönük uyumluluk takma metodu
    castSpell(spellId: CrisisSpellType): boolean {
      const aliasMap: Record<string, CrisisInterventionType> = {
        fast_charge: 'quantum_compression',
        espresso_shot: 'time_dilation',
        noise_cancelling: 'magnetic_vent',
        sleep_denial: 'planck_surge'
      }
      const targetType = (aliasMap[spellId] || spellId) as CrisisInterventionType
      return this.castCrisisIntervention(targetType)
    },

    // Crisis 2.0: Canlı Fırsat İkilemi (Dilemma) Tetikle
    triggerCrisisDilemma(): void {
      if (this.activeCrisisDilemma) return
      const dilemmaList: Array<{
        id: string
        title: string
        desc: string
        options: CrisisDilemmaOption[]
      }> = [
        {
          id: 'plasma_surge',
          title: '⚠️ Plazma Kararsızlık Sızıntısı',
          desc: 'Reaktör çekirdeğinde kontrolsüz gravitasyonel basınç birikiyor. Alanı stabilize et veya aşırı rezonansa sürükle!',
          options: [
            {
              id: 'vent',
              label: 'Tahliye Valfini Aç',
              desc: '-25 Isı düşür ve anında 30 saniyelik kütle üretimi çek.',
              effect: 'vent'
            },
            {
              id: 'overcharge',
              label: 'Aşırı Rezonans Besle',
              desc: '+20 Isı yükselt ve 20 sn boyunca Çekim Hızını 2× katla.',
              effect: 'overcharge'
            }
          ]
        },
        {
          id: 'quantum_foam_rupture',
          title: '🌌 Kuantum Köpüğü Yırtılması',
          desc: 'Olay ufkunda mikro-tekillik yarıkları oluştu! Nasıl karşılık vereceksin?',
          options: [
            {
              id: 'stabilize',
              label: 'Alanı Sabitle',
              desc: '-20 Isı düşür ve ekrana anında 1 Altın Anomali fırlat.',
              effect: 'stabilize'
            },
            {
              id: 'collapse',
              label: 'Yırtığı Genişlet',
              desc: '+25 Isı ekle ve 30 sn boyunca Çekim Boyutlarını 5× katla.',
              effect: 'collapse'
            }
          ]
        },
        {
          id: 'event_horizon_split',
          title: '⚡ Olay Ufku Rezonans Tepe Noktası',
          desc: 'Termal enerji kritik sınıra ulaştı. Kütle akışını optimize et.',
          options: [
            {
              id: 'absorb_parasites',
              label: 'Parazitleri Sentezle',
              desc: '-15 Isı soğut ve mevcut tüm parazitleri %200 primle temizle.',
              effect: 'absorb_parasites'
            },
            {
              id: 'hyper_surge',
              label: 'Hiper Dalga Patlaması',
              desc: '+20 Isı yükselt ve anında 2 dakikalık kütle patlaması kazan.',
              effect: 'hyper_surge'
            }
          ]
        }
      ]
      const chosen = dilemmaList[Math.floor(Math.random() * dilemmaList.length)]
      this.activeCrisisDilemma = {
        id: chosen.id + '_' + Date.now(),
        title: chosen.title,
        desc: chosen.desc,
        duration: 15,
        timeLeft: 15,
        options: chosen.options
      }
      sounds.playCrisisDecision()
    },

    // Crisis 2.0: Canlı İkilem Seçeneği Uygula
    chooseCrisisDilemmaOption(optionId: string): void {
      if (!this.activeCrisisDilemma) return
      const opt = this.activeCrisisDilemma.options.find((o) => o.id === optionId)
      if (!opt) return

      if (opt.effect === 'vent') {
        this.reactorHeat = Math.max(0, this.reactorHeat - 25)
        const gain = this.matterPerSecond.times(30)
        if (gain.gt(0)) {
          this.matter = this.matter.plus(gain)
          this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(gain)
        }
      } else if (opt.effect === 'overcharge') {
        this.reactorHeat = Math.min(100, this.reactorHeat + 20)
        this.activeBuffs.push({
          id: `buff-dilemma-overcharge-${Date.now()}`,
          type: 'espresso',
          name: '⚡ Aşırı Rezonans (2× Frekans)',
          duration: 20,
          remaining: 20,
          multiplier: 2
        })
      } else if (opt.effect === 'stabilize') {
        this.reactorHeat = Math.max(0, this.reactorHeat - 20)
        this.spawnAnomaly(true)
      } else if (opt.effect === 'collapse') {
        this.reactorHeat = Math.min(100, this.reactorHeat + 25)
        this.activeBuffs.push({
          id: `buff-dilemma-collapse-${Date.now()}`,
          type: 'resonance_boost',
          name: '🌌 Boyut Sıkışması (5× Boyutlar)',
          duration: 30,
          remaining: 30,
          multiplier: 5
        })
      } else if (opt.effect === 'absorb_parasites') {
        this.reactorHeat = Math.max(0, this.reactorHeat - 15)
        if (this.slackers.length > 0) {
          this.slackers.forEach((s) => {
            const refund = s.leechedDopamine.times(2.0)
            this.matter = this.matter.plus(refund)
            this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(refund)
            this.stats.slackersFired++
          })
          this.slackers = []
        }
      } else if (opt.effect === 'hyper_surge') {
        this.reactorHeat = Math.min(100, this.reactorHeat + 20)
        const blast = this.matterPerSecond.gt(0) ? this.matterPerSecond.times(120) : this.manualClickPower.times(2000)
        this.matter = this.matter.plus(blast)
        this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(blast)
      }

      this.caffeineEnergy = this.reactorHeat
      if (this.reactorHeat >= 100) {
        this.triggerReactorMeltdown()
      }

      this.activeCrisisDilemma = null
      this.dilemmaCooldown = 60
      sounds.playCrisisDecision()
      safeConfetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      })
    },

    // Otomatik Bot Aç/Kapa
    toggleAutobuyer(id: string): void {
      const bot = this.autobuyers[id]
      if (!bot || !bot.unlocked) return
      bot.enabled = !bot.enabled
      sounds.playToggleBot()
    },

    // Tüm açılmış botları tek tıkla aç / kapat
    toggleAllAutobuyers(enable?: boolean): void {
      const unlockedBots = Object.values(this.autobuyers).filter((b) => b.unlocked)
      if (unlockedBots.length === 0) return

      const targetState = enable !== undefined ? enable : !unlockedBots.every((b) => b.enabled)
      unlockedBots.forEach((b) => {
        b.enabled = targetState
      })
      sounds.playToggleBot()
    },

    // Tüm açılmış botların modunu tek tıkla değiştir ('single' | 'bulk' | 'max')
    setAllAutobuyerModes(mode: AutobuyerMode): boolean {
      if (mode === 'bulk' && !this.autobuyerBulkUnlocked) return false
      if (mode === 'max' && !this.autobuyerMaxUnlocked) return false

      Object.keys(this.autobuyers).forEach((id) => {
        const bot = this.autobuyers[id]
        if (bot && bot.unlocked && id !== 'singularity') {
          bot.mode = mode
          bot.interval = getAutobuyerInterval(id, mode)
          bot.timer = 0
        }
      })
      sounds.playToggleBot()
      return true
    },

    // Prestij / Deserialize Kalıcılık Garantisi
    ensureAutobuyersPreserved(): void {
      if (this.singularities >= 1) {
        // 1. Kademe kilitleri kalıcı açılır
        this.autobuyerBulkUnlocked = true
        this.autobuyerMaxUnlocked = true

        // 2. Temel 11 bot kalıcı olarak açılır
        const permanentIds = [
          'dim1', 'dim2', 'dim3', 'dim4', 'dim5', 'dim6', 'dim7', 'dim8',
          'tickspeed', 'shift', 'galaxy'
        ]
        permanentIds.forEach((id) => {
          if (this.autobuyers[id]) {
            this.autobuyers[id].unlocked = true
          }
        })

        // 3. Şafak Nöbeti Botu: 3. çöküşten sonra kalıcı açılır
        if (this.singularities >= 3 && this.autobuyers.singularity) {
          this.autobuyers.singularity.unlocked = true
        }
      }
    },

    // Otomatik Bot Kilidini Aç (her zaman tekli modda başlar)
    unlockAutobuyer(id: string): boolean {
      if (this.singularities >= 1) return false
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
    // Açık olan botlar otomatik ×10'a geçer (kapalılara dokunulmaz).
    unlockBulkMode(): boolean {
      if (this.autobuyerBulkUnlocked) return false
      if (!this.canUnlockBulk) return false
      this.matter = this.matter.minus(AUTOBUYER_BULK_COST)
      this.autobuyerBulkUnlocked = true
      Object.keys(this.autobuyers).forEach((id) => {
        const bot = this.autobuyers[id]
        if (bot && bot.unlocked && bot.enabled && id !== 'singularity') {
          bot.mode = 'bulk'
          bot.interval = getAutobuyerInterval(id, 'bulk')
          bot.timer = 0
        }
      })
      sounds.playBuy(3)
      return true
    },

    // Max modu global aç (bulk açık olmalı + galaxy ister)
    // Açık olan botlar otomatik MAKS'a geçer (kapalılara dokunulmaz).
    unlockMaxMode(): boolean {
      if (this.autobuyerMaxUnlocked) return false
      if (!this.canUnlockMax) return false
      this.matter = this.matter.minus(AUTOBUYER_MAX_COST)
      this.autobuyerMaxUnlocked = true
      Object.keys(this.autobuyers).forEach((id) => {
        const bot = this.autobuyers[id]
        if (bot && bot.unlocked && bot.enabled && id !== 'singularity') {
          bot.mode = 'max'
          bot.interval = getAutobuyerInterval(id, 'max')
          bot.timer = 0
        }
      })
      sounds.playBuy(4)
      safeConfetti({
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
        safeConfetti({
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
    spawnAnomaly(forceGolden: boolean = false): boolean {
      if (!forceGolden && this.floatingAnomalies.length >= 2) {
        // Ekran doygunken timer'ı sıfırla; slot açılınca anlık pop-up yağmuru başlamasın
        this.anomalyTimer = 0
        return false
      }
      if (forceGolden && this.floatingAnomalies.length >= 4) {
        return false
      }

      // Ağırlıklı tablo: fyp %42 / heart %32 / sponsor %21 / void %5
      // Pity: 25 void'suz spawn sonrası void garanti (koleksiyon hissi korunur)
      let chosenType: AnomalyType
      if (forceGolden) {
        const roll = Math.random()
        chosenType = roll < 0.45 ? 'fyp' : roll < 0.8 ? 'heart_frenzy' : 'void'
      } else if ((this.mythicPity || 0) >= 25) {
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
        title = 'Süpernova Patlaması!'
        desc = '60 saniyeliğine tüm kütle çekimini 7× katlar!'
      } else if (chosenType === 'heart_frenzy') {
        title = 'Kütle Patlaması!'
        desc = '15 saniyeliğine Manuel Yutma gücünü 300× fırlatır!'
      } else if (chosenType === 'void') {
        title = 'Kozmik Tekillik Dalgalanması!'
        desc = 'Garanti kombo: 30sn 7× + 15sn 300× aynı anda!'
        lifetime = 9
      } else {
        title = 'Hawking Işıması Zirvesi!'
        desc = 'Anında 2 dakikalık saf kütle tekilliğe akar!'
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
            name: '🔥 Süpernova Patlaması (7× Kütle)',
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
            name: '🌌 Kütle Patlaması (300× Çekim)',
            duration: Math.floor(15 * durMult),
            remaining: Math.floor(15 * durMult),
            multiplier: 300
          })
        }
      } else if (anomaly.type === 'void') {
        // Void Tekillik: garanti kombo — 30sn 7× üretim + 15sn 300× çekim
        const fyp = this.activeBuffs.find((b) => b.type === 'fyp')
        if (fyp) {
          fyp.remaining += 30 * durMult
        } else {
          this.activeBuffs.push({
            id: `buff-fyp-void-${Date.now()}`,
            type: 'fyp',
            name: '🔥 Süpernova Patlaması (7× Kütle)',
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
            name: '🌌 Kütle Patlaması (300× Çekim)',
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
        safeConfetti({
          particleCount: anomaly.type === 'void' ? 160 : 130,
          spread: 100,
          origin: { y: 0.4 },
          colors: anomaly.type === 'void'
            ? ['#c084fc', '#22d3ee', '#f0abfc', '#ffffff']
            : ['#a855f7', '#ec4899', '#06b6d4', '#f59e0b']
        })
      } else if (anomaly.type === 'void') {
        sounds.playMythicCollect()
        safeConfetti({
          particleCount: 90,
          spread: 85,
          origin: { x: anomaly.x / 100, y: anomaly.y / 100 },
          colors: ['#c084fc', '#22d3ee', '#ffffff']
        })
      } else {
        sounds.playCrisisCollect(anomaly.type)
        safeConfetti({
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

        safeConfetti({
          particleCount: 45,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#a855f7', '#06b6d4', '#ffffff']
        })
      } else {
        sounds.playGuiltClick()
      }
    },

    // ---- Kozmik Haber Bandı Takibi (ADR-0045) ----
    recordNewsSeen(newsId: string): void {
      if (!this.seenNewsIds.includes(newsId)) {
        this.seenNewsIds.push(newsId)
        if (this.seenNewsIds.length >= 50) {
          this.checkAchievements()
        }
      }
    },

    recordNewsClick(isSecret = false): void {
      this.uselessNewsClicks++
      if (isSecret) {
        this.hasClickedSecretNews = true
      }
      this.checkAchievements()
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
        hasBrainrot: this.labCells.some((c) => c.seedType === 'higgs_boson'),
        hasMatureBrainrot: this.labCells.some((c) => c.seedType === 'higgs_boson' && c.isMature),
        activeSlackers: this.slackers.length,
        leechedTotal: this.slackers.reduce((a, s) => a.plus(s.leechedDopamine), D_0),
        wallHour: new Date().getHours(),
        completedChallenges: [...this.completedChallenges],
        seenNewsCount: this.seenNewsIds.length,
        hasClickedSecretNews: this.hasClickedSecretNews
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
      // Maliyet memo'su başarım bayrağını anahtarında taşır; yine de yeni
      // başarım (öz. dim_cost_x085) sonrası cache'i düşürmek güvenli taraftır.
      _dimCostCache.clear()
      // QoL: çevrimdışı simülasyonda ses/konfeti çalmaz (yükleme ekranında patlamasın)
      // + gizli tarayıcı sekmesinde kutlama yok (toast kuyruğu yine birikir).
      if (this.offlineSimActive) return
      if (!isPageVisible()) return
      if (completedRow) {
        sounds.playSingularity()
        safeConfetti({
          particleCount: 130,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#f59e0b', '#a855f7', '#06b6d4', '#ffffff']
        })
      } else if (unlockedAnyReward) {
        sounds.playCombo()
        safeConfetti({
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

    // Aktif oyun sekmesi takibi (App.vue switchTab'den beslenir, kayıt edilmez).
    // Otomatik kutlamalar bu alana bakarak ilgili sekmede değilken sessiz geçer.
    setActiveGameTab(tab: string): void {
      this.activeGameTab = tab
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

      // G2: Challenge hedefi sağlandığında otomatik tamamla (sessiz — kullanıcı eylemi değil).
      if (this.activeChallenge && this.challengeGoalReached) {
        this.completeChallenge(false)
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

      // 4. Anomali Doğurma Sayacı (Gece Krizleri: 100 Dopamin ile açılır, Reaktör hızıyla ölçeklenir)
      if (this.isFeatureUnlocked('crisis_spawn')) {
        this.anomalyTimer += deltaSeconds * this.reactorAnomalyRateMult
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

        // Plazma Şarjı (Superconductor modu hariç ve canlı akışta değilken)
        if (this.labMode !== 'superconductor' && !this.isViralActive) {
          const modeMult = this.labMode === 'overdrive' ? 1.8 : 1.0
          const rate = (0.35 + matureCount * 0.3) * modeMult
          this.labHype = Math.min(100, this.labHype + deltaSeconds * rate)
        }

        // Canlı Süperkritik Boşalım Dalgası
        if (this.isViralActive) {
          this.viralTimeRemaining -= deltaSeconds
          const viewsPerSec = 45000 + matureCount * 35000 + (this.labMode === 'overdrive' ? 40000 : 0)
          this.viralViews += Math.floor(viewsPerSec * deltaSeconds)

          if (this.viralTimeRemaining <= 0) {
            this.isViralActive = false
            this.viralTimeRemaining = 0
          }
        }

        // Hibrit Formül Sentezleme & Kuantum Dalgalanma Kontrolü
        const synthChance = (this.labMode === 'fluctuation' ? 0.12 : 0.04) * (this.isViralActive ? 3.0 : 1.0) * deltaSeconds

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
                    // Oto-sentez kutlaması yalnızca Lab sekmesinde + görünür sayfada.
                    // Başka sekmedeyken formül yine keşfedilir, rozet kalır, efekt atlanır.
                    if (!this.offlineSimActive && isPageVisible() && this.activeGameTab === 'lab') {
                      sounds.playCombo()
                      safeConfetti({
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
                  if (!this.offlineSimActive && isPageVisible() && this.activeGameTab === 'lab') {
                    sounds.playCombo()
                    safeConfetti({
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

      // 7. Crisis 3.0: Olay Ufku Kararsızlık Reaktörü Isı Fiziği, Momentum & Kartuş Döngüsü
      if (this.reactorMeltdownTimer > 0) {
        this.reactorMeltdownTimer -= deltaSeconds
        this.reactorMomentum = 1.0 // Meltdown süresince momentum sıfır
        if (this.reactorMeltdownTimer <= 0) {
          this.reactorMeltdownTimer = 0
          this.reactorHeat = 25 // Meltdown bittiğinde 25'e stabilizasyon
        }
      } else {
        const currentPhase = this.reactorPhase
        // Doğal Soğuma: saniyede -1.2 ısı
        this.reactorHeat = Math.max(0, this.reactorHeat - 1.2 * deltaSeconds)

        // Tatlı Nokta (%61-90) Momentum Dinamiği:
        if (currentPhase === 'sweet_spot') {
          // Tatlı noktada kaldıkça saniyede +%2 momentum birikir (1.0x -> 5.0x)
          this.reactorMomentum = Math.min(5.0, (this.reactorMomentum || 1.0) + 0.02 * deltaSeconds)
        } else if (currentPhase === 'meltdown') {
          this.reactorMomentum = 1.0
        } else {
          // Durgun veya rezonans fazında momentum yavaşça (%5/sn) erir
          if ((this.reactorMomentum || 1.0) > 1.0) {
            this.reactorMomentum = Math.max(1.0, (this.reactorMomentum || 1.0) - 0.05 * deltaSeconds)
          }
        }
      }
      this.caffeineEnergy = this.reactorHeat

      // Kriyojenik Soğutucu Kartuş Dolumu (35 sn per kartuş, max 3)
      if (typeof this.reactorCoolantCharges !== 'number') {
        this.reactorCoolantCharges = 3
      }
      if (this.reactorCoolantCharges < 3) {
        this.reactorCoolantTimer = (this.reactorCoolantTimer || 35) - deltaSeconds
        if (this.reactorCoolantTimer <= 0) {
          this.reactorCoolantCharges = Math.min(3, this.reactorCoolantCharges + 1)
          this.reactorCoolantTimer = this.reactorCoolantCharges < 3 ? 35 : 0
        }
      } else {
        this.reactorCoolantTimer = 0
      }

      // Müdahale Cooldown sayaçlarının düşürülmesi
      if (this.reactorCooldowns) {
        for (const spellKey of Object.keys(this.reactorCooldowns)) {
          if (this.reactorCooldowns[spellKey] > 0) {
            this.reactorCooldowns[spellKey] = Math.max(0, this.reactorCooldowns[spellKey] - deltaSeconds)
          }
        }
      }

      if (this.crisisBackfireDebuff > 0) {
        this.crisisBackfireDebuff = Math.max(0, this.crisisBackfireDebuff - deltaSeconds)
      }

      // Canlı İkilem (Dilemma) sayacı ve tetiklemesi
      if (this.activeCrisisDilemma) {
        this.activeCrisisDilemma.timeLeft -= deltaSeconds
        if (this.activeCrisisDilemma.timeLeft <= 0) {
          this.activeCrisisDilemma = null
          this.dilemmaCooldown = 45 // Zaman aşımında 45 sn cooldown
        }
      } else {
        if (this.dilemmaCooldown > 0) {
          this.dilemmaCooldown = Math.max(0, this.dilemmaCooldown - deltaSeconds)
        } else if (this.reactorPhase === 'sweet_spot' && !this.offlineSimActive) {
          // Tatlı Noktadayken ara sıra (%2.5/sn şansla) tetiklenir
          if (Math.random() < 0.025 * deltaSeconds) {
            this.triggerCrisisDilemma()
          }
        }
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
                if (this.activeChallenge) this.completeChallenge(false)
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
          safeConfetti({
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
      safeConfetti({
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
        // Kademeli kaba-adım merdiveni (senkron kalır; 24h cap korunur):
        // ilk 60 sn 0.1 sn hassasiyet (botlar, buff süreleri, lab doğru işler),
        // sonra 10 dk'ya kadar 1 sn, ~50 dk'ya kadar 10 sn, kalanı 300 sn kaba adım.
        // 24 saatte toplam ≈600+600+300+275 ≈ 2k iterasyon (önceki 60 sn kaba
        // adımla ≈8k idi; donma şikayeti bu merdivenle çözülür).
        const detailedSeconds = Math.min(60, cappedSeconds)
        const steps = Math.floor(detailedSeconds / 0.1)
        let iterations = steps
        for (let s = 0; s < steps; s++) {
          this.update(0.1)
        }

        // Kalan süre: 1 sn adımları (10 dk'ya kadar), sonrasında 10 sn (~50 dk'ya kadar), ardından 300 sn
        let remainingSeconds = cappedSeconds - detailedSeconds
        const fineSteps = Math.min(remainingSeconds, 600)
        iterations += fineSteps
        for (let s = 0; s < fineSteps; s++) {
          this.update(1)
        }
        remainingSeconds -= fineSteps
        const mediumBudget = Math.min(remainingSeconds, 3000)
        const mediumSteps = Math.floor(mediumBudget / 10)
        iterations += mediumSteps
        for (let s = 0; s < mediumSteps; s++) {
          this.update(10)
        }
        remainingSeconds -= mediumSteps * 10
        const coarseSteps = Math.floor(remainingSeconds / 300)
        iterations += coarseSteps
        for (let s = 0; s < coarseSteps; s++) {
          this.update(300)
        }
        const leftover = remainingSeconds - coarseSteps * 300
        if (leftover > 0) {
          this.update(leftover)
          iterations++
        }
        console.info(`[offline] ${cappedSeconds}sn simüle edildi (${iterations} iterasyon)`)
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
    // Guard tavanı: en fazla 1000 tur × tur başına ≤10 adet (≈10k birim). previewDimensionBuy
    // ile aynı semantik (paket atlarken maliyet adımı değişir); önizlemenin guard'ı
    // daha sıkıdır (300 tur) çünkü sadece fiyat toplar, state'e yazmaz.
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
      const safe = sanitizeCustomAudioUrl(url)
      this.settings.customAudioUrl = safe
      musicEngine.customUrl = safe
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
      const serializedAutobuyers: Record<string, { enabled: boolean; unlocked: boolean; mode?: AutobuyerMode; minGainSp?: number; customRule?: { maxGalaxies?: number } }> = {}
      Object.keys(this.autobuyers).forEach((k) => {
        serializedAutobuyers[k] = {
          enabled: this.autobuyers[k].enabled,
          unlocked: this.autobuyers[k].unlocked,
          mode: this.autobuyers[k].mode || 'single',
          minGainSp: this.autobuyers[k].minGainSp,
          // 0 = sınırsız tavan; tanımsızsa alan yazılmaz (eski kayıtlarla uyumlu)
          ...(this.autobuyers[k].customRule
            ? { customRule: { maxGalaxies: this.autobuyers[k].customRule?.maxGalaxies } }
            : {})
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
        caffeineEnergy: this.reactorHeat,
        reactorHeat: this.reactorHeat,
        reactorMeltdownTimer: this.reactorMeltdownTimer,
        dilemmaCooldown: this.dilemmaCooldown,
        reactorCoolantCharges: this.reactorCoolantCharges,
        reactorCoolantTimer: this.reactorCoolantTimer,
        reactorMomentum: this.reactorMomentum,
        reactorCooldowns: { ...(this.reactorCooldowns || {}) },
        // ADR-0029: bu dört alan v12'de kaydedilmiyordu. maxCaffeineEnergy yükleme
        // sırasında clamp tavanı olarak kullanıldığı için (clampSavedNumber) kayıp
        // her zaman 100'e düşüyordu; viral üçlüsü ise canlı koşu ilerlemesiydi.
        maxCaffeineEnergy: this.maxCaffeineEnergy,
        isViralActive: this.isViralActive,
        viralTimeRemaining: this.viralTimeRemaining,
        viralViews: this.viralViews,
        // P1: boşalım bekleme damgası (yoksa eski kayıt varsayımıyla hazır başlar)
        lastViralAt: this.lastViralAt,
        labCells: this.labCells.map((c) => ({
          id: c.id,
          seedType: c.seedType,
          age: c.age,
          matureAge: c.matureAge,
          // JSON Infinity'yi saklayamaz (null'a dönüşür); çürümesiz hücreyi null yaz,
          // yüklemede null->Infinity olarak geri alınır.
          maxAge: Number.isFinite(c.maxAge) ? c.maxAge : null
        })),
        labHype: this.labHype,
        labMode: this.labMode,
        discoveredFormulas: [...this.discoveredFormulas],
        reactorCollapseCount: this.reactorCollapseCount || 0,
        autobuyers: serializedAutobuyers,
        autobuyerBulkUnlocked: this.autobuyerBulkUnlocked,
        autobuyerMaxUnlocked: this.autobuyerMaxUnlocked,
        singularityUpgrades: { ...this.singularityUpgrades },
        neuralNodesBought: { ...this.neuralNodesBought },
        clickCombo: { ...this.clickCombo },
        activeChallenge: this.activeChallenge,
        completedChallenges: [...this.completedChallenges],
        challengeBestTimes: { ...this.challengeBestTimes },
        // Aktif challenge koşu sayaçları (koşu-içi geçici durum; yüklemede clamp'lenir)
        challengeElapsed: this.challengeElapsed,
        challengeHaltUntil: this.challengeHaltUntil,
        challengeCostInflation: this.challengeCostInflation,
        challengeNotificationDoom: this.challengeNotificationDoom,
        challengeDim1Growth: this.challengeDim1Growth.toString(),
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
        seenNewsIds: [...(this.seenNewsIds || [])],
        uselessNewsClicks: this.uselessNewsClicks || 0,
        hasClickedSecretNews: this.hasClickedSecretNews || false,
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
          challengesCompleted: this.stats.challengesCompleted || 0,
          reactorCollapses: this.stats.reactorCollapses || 0
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
        this.tickspeedBought = Math.floor(clampSavedNumber(data.tickspeedBought, 0, 0, 1e6))
        this.dimensionShifts = Math.floor(clampSavedNumber(data.dimensionShifts, 0, 0, 1e6))
        this.galaxies = Math.floor(clampSavedNumber(data.galaxies, 0, 0, 1e6))

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
          this.singularities = Math.floor(clampSavedNumber(data.singularities, 0, 0, 1e6))
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
              // Süre/çarpan karşılıkları runtime ile birebir: fyp 60sn×7,
              // espresso 30sn×3, planck_surge 20sn×4, resonance_boost 30sn×5,
              // heart_frenzy 15sn×300.
              return {
                id: `buff-${b.type}-${Date.now()}`,
                type: b.type,
                name: b.type === 'fyp'
                  ? '🔥 Gece 3 Çılgınlığı (7× Dopamin)'
                  : b.type === 'espresso'
                    ? '☕ Çift Espresso (3× Frekans)'
                    : b.type === 'planck_surge'
                      ? '💥 Planck Patlaması (4× Hz, 10× Yutma)'
                      : b.type === 'resonance_boost'
                        ? '🌌 Boyut Sıkışması (5× Boyutlar)'
                        : '👆 Başparmak Histerisi (300× Kaydır)',
                duration: b.type === 'fyp' ? 60 : b.type === 'espresso' ? 30 : b.type === 'planck_surge' ? 20 : b.type === 'resonance_boost' ? 30 : 15,
                remaining,
                multiplier: b.type === 'fyp' ? 7 : b.type === 'espresso' ? 3 : b.type === 'planck_surge' ? 4 : b.type === 'resonance_boost' ? 5 : 300
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

        if (typeof data.reactorHeat === 'number') {
          this.reactorHeat = clampSavedNumber(data.reactorHeat, 0, 0, 100)
        } else if (typeof data.caffeineEnergy === 'number') {
          this.reactorHeat = clampSavedNumber(data.caffeineEnergy, 0, 0, 100)
        } else {
          this.reactorHeat = 0
        }
        this.caffeineEnergy = this.reactorHeat

        this.reactorMeltdownTimer = typeof data.reactorMeltdownTimer === 'number'
          ? Math.max(0, data.reactorMeltdownTimer)
          : 0
        this.dilemmaCooldown = typeof data.dilemmaCooldown === 'number'
          ? Math.max(0, data.dilemmaCooldown)
          : 0

        this.reactorCoolantCharges = typeof data.reactorCoolantCharges === 'number'
          ? clampSavedNumber(data.reactorCoolantCharges, 3, 0, 3)
          : 3
        this.reactorCoolantTimer = typeof data.reactorCoolantTimer === 'number'
          ? Math.max(0, data.reactorCoolantTimer)
          : 0
        this.reactorMomentum = typeof data.reactorMomentum === 'number'
          ? clampSavedNumber(data.reactorMomentum, 1.0, 1.0, 5.0)
          : 1.0
        this.reactorCooldowns = data.reactorCooldowns && typeof data.reactorCooldowns === 'object'
          ? { ...data.reactorCooldowns }
          : {}

        if (typeof data.maxCaffeineEnergy === 'number') {
          this.maxCaffeineEnergy = clampSavedNumber(data.maxCaffeineEnergy, 100, 1, 100000)
        }

        // Viral Zirve koşu ilerlemesi (daha önce kaydedilmiyordu)
        this.isViralActive = data.isViralActive === true
        this.viralTimeRemaining = clampSavedNumber(data.viralTimeRemaining, 0, 0, 3600)
        this.viralViews = clampSavedNumber(data.viralViews, 0, 0, 1e15)
        // P1: eksikse hazır başlar (negatif başlangıç = bekleme yok)
        this.lastViralAt = clampSavedNumber(data.lastViralAt, -VIRAL_DROP_COOLDOWN_SECONDS, -1e12, 1e15)

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
              // JSON Infinity'yi taşıyamaz: plantSeed/update Infinity yazar ama
              // kayda null düşer. null->Infinity (çürümesiz hücre), sayıysa clamp'le.
              const maxAge = savedCell.maxAge == null ? Infinity : clampSavedNumber(savedCell.maxAge, 0, 0, 31536000)
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
        if (data.labMode === 'overdrive' || data.labMode === 'superconductor' || data.labMode === 'fluctuation') {
          this.labMode = data.labMode
        } else {
          this.labMode = 'overdrive'
        }
        if (Array.isArray(data.discoveredFormulas) && data.discoveredFormulas.length > 0) {
          const validFormulas = data.discoveredFormulas.filter((id): id is LabSeedType => isValidLabSeedType(id))
          this.discoveredFormulas = Array.from(new Set(['photon_resonator', ...validFormulas]))
        } else {
          const present = this.labCells.map((c) => c.seedType).filter((s): s is LabSeedType => s !== null)
          this.discoveredFormulas = Array.from(new Set(['photon_resonator', ...present]))
        }
        if (typeof data.reactorCollapseCount === 'number') {
          this.reactorCollapseCount = Math.max(0, data.reactorCollapseCount)
        }

        if (data.autobuyers) {
          Object.keys(data.autobuyers).forEach((k) => {
            if (this.autobuyers[k]) {
              this.autobuyers[k].enabled = data.autobuyers![k].enabled === true
              this.autobuyers[k].unlocked = data.autobuyers![k].unlocked === true
              const savedMode = data.autobuyers![k].mode
              this.autobuyers[k].mode = savedMode === 'bulk' || savedMode === 'max' ? savedMode : 'single'
              this.autobuyers[k].interval = getAutobuyerInterval(k, this.autobuyers[k].mode || 'single')
              this.autobuyers[k].timer = 0
              const savedMinGain = data.autobuyers![k].minGainSp
              if (typeof savedMinGain === 'number') {
                this.autobuyers[k].minGainSp = clampSavedNumber(savedMinGain, 1, 1, 1e6)
              }
              // Kokpit kuralı: Küme botu tavanı (0 = sınırsız korunur)
              const savedRule = data.autobuyers![k].customRule
              if (savedRule && typeof savedRule === 'object') {
                const savedMaxGalaxies = (savedRule as { maxGalaxies?: unknown }).maxGalaxies
                if (typeof savedMaxGalaxies === 'number') {
                  this.autobuyers[k].customRule = {
                    maxGalaxies: clampSavedNumber(savedMaxGalaxies, 0, 0, 1e6)
                  }
                }
              }
            }
          })
        }

        this.autobuyerBulkUnlocked = data.autobuyerBulkUnlocked ?? false
        this.autobuyerMaxUnlocked = data.autobuyerMaxUnlocked ?? false

        // Prestijli kayıt kalıcılık onarımı (Save migration guarantee)
        if (this.singularities >= 1) {
          this.ensureAutobuyersPreserved()
        }

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
            const def = NEURAL_TREE.find((n) => n.id === nodeId)
            if (!def || typeof lvl !== 'number' || !Number.isFinite(lvl) || lvl <= 0) return
            loadedNeuralNodes[nodeId] = Math.min(Math.floor(lvl), def.maxLevel ?? 1)
          })
        }
        // Eski kayıt göçü: düz dükkân seviyeleri ağaçtaki karşılık düğümlere yansıtılır
        NEURAL_LEGACY_UPGRADE_IDS.forEach((legacyId) => {
          const shopLvl = this.singularityUpgrades?.[legacyId] || 0
          if (shopLvl > (loadedNeuralNodes[legacyId] || 0)) {
            loadedNeuralNodes[legacyId] = shopLvl
          }
        })
        // Kayıt şişmesine karşı toplam düğüm sayısını caple (ağaç ~25 düğüm; 40 güvenli tavan)
        for (const key of Object.keys(loadedNeuralNodes).slice(40)) {
          delete loadedNeuralNodes[key]
        }
        this.neuralNodesBought = loadedNeuralNodes

        // Gece Krizi (v10): whitelist doğrulaması — kayıtlı id registry'de yoksa geçersiz sayılır
        if (typeof data.activeChallenge === 'string' && getChallengeById(data.activeChallenge)) {
          this.activeChallenge = data.activeChallenge
          // Koşu-içi sayaçlar kayıttan yüklenir (yoksa koşu başı varsayılanı)
          this.challengeElapsed = clampSavedNumber(data.challengeElapsed, 0, 0, 1e9)
          this.challengeHaltUntil = clampSavedNumber(data.challengeHaltUntil, 0, 0, 3600)
          this.challengeSinceBuy = 9999
          this.challengeCostInflation = clampSavedNumber(data.challengeCostInflation, 0, 0, 1e9)
          this.challengeNotificationDoom = clampSavedNumber(data.challengeNotificationDoom, 0, 0, 1e9)
          this.challengeDim1Growth = parseSavedDecimal(data.challengeDim1Growth, new Decimal(1))
        } else {
          // Güvenli bitir (exitChallenge eşdeğeri): deserialize ortasında gerçek
          // exitChallenge() çağrılmaz çünkü resetRunState() az önce yüklenen
          // koşu durumunu (matter/boyutlar) sıfırlardı. Sayaçlar temizlenir, koşu düşer.
          this.activeChallenge = null
          this.challengeElapsed = 0
          this.challengeHaltUntil = 0
          this.challengeSinceBuy = 9999
          this.challengeCostInflation = 0
          this.challengeNotificationDoom = 0
          this.challengeDim1Growth = new Decimal(1)
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
        // Not: challenge koşu sayaçları yukarıdaki activeChallenge bloğunda
        // kayıttan yüklenir (veya güvenli bitirişle sıfırlanır); burada ezilmez.

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
          this.claimedBounties = data.claimedBounties
            .filter((e): e is number => typeof e === 'number' && Number.isFinite(e))
            .slice(0, 200)
        } else {
          this.claimedBounties = []
        }
        // ADR-0034: Koşu içi Dekad Yükselişi çarpanı. v14- kayıtlarda bu alan yok;
        // o kayıtlar SP olarak ödedikleri primleri korur, yükseliş 1'den başlar.
        this.decadeSurgeMult =
          typeof data.decadeSurgeMult === 'number' && Number.isFinite(data.decadeSurgeMult)
            ? clampSavedNumber(data.decadeSurgeMult, 1, 1, 1000)
            : 1
        this.sacrificeCount = Math.floor(clampSavedNumber(data.sacrificeCount, 0, 0, 1e6))
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
          this.achievementsSeenCount = Math.floor(clampSavedNumber(data.achievementsSeenCount, 0, 0, 1e6))
        }

        if (Array.isArray(data.seenNewsIds)) {
          this.seenNewsIds = data.seenNewsIds
            .filter((id) => typeof id === 'string')
            .slice(0, 500)
        }
        if (typeof data.uselessNewsClicks === 'number') {
          this.uselessNewsClicks = clampSavedNumber(data.uselessNewsClicks, 0, 0, 1000000)
        }
        if (typeof data.hasClickedSecretNews === 'boolean') {
          this.hasClickedSecretNews = data.hasClickedSecretNews
        }

        if (data.settings) {
          this.settings = { ...this.settings, ...data.settings }
          // Kayıttan gelen enum ayarlar beyaz listeden geçer (bozuk/gelecek
          // sürüm değeri UI'yı kırmasın); sayısal olan clamp'lenir.
          if (!['standard', 'scientific', 'engineering', 'logarithm'].includes(this.settings.notation)) {
            this.settings.notation = 'standard'
          }
          if (this.settings.decimalPlaces !== 2 && this.settings.decimalPlaces !== 3) {
            this.settings.decimalPlaces = 2
          }
          if (!['cyberpunk', 'dark'].includes(this.settings.theme)) {
            this.settings.theme = 'cyberpunk'
          }
          if (!['calm', 'balanced', 'tilt'].includes(this.settings.juiceMode)) {
            this.settings.juiceMode = 'balanced'
          }
          this.settings.customAudioUrl = sanitizeCustomAudioUrl(this.settings.customAudioUrl)
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
          if (this.settings.screenShake === undefined) this.settings.screenShake = true
          if (this.settings.juiceMode === undefined) this.settings.juiceMode = 'balanced'
          if (this.settings.screenOverlayEffects === undefined) this.settings.screenOverlayEffects = true
          if (this.settings.holoCardsEnabled === undefined) this.settings.holoCardsEnabled = true
          if (this.settings.swirlShaderQuality === undefined) this.settings.swirlShaderQuality = 'balanced'
          if (this.settings.decimalPlaces === undefined) this.settings.decimalPlaces = 2
          if (this.settings.batterySaver === undefined) this.settings.batterySaver = false
          if (this.settings.floatingTexts === undefined) this.settings.floatingTexts = true
          if (this.settings.newsTickerEnabled === undefined) this.settings.newsTickerEnabled = true
          if (this.settings.swipeSensitivity === undefined) this.settings.swipeSensitivity = 'balanced'
          if (this.settings.offlineProgressModal === undefined) this.settings.offlineProgressModal = true
          if (this.settings.hotkeysEnabled === undefined) this.settings.hotkeysEnabled = true
          if (this.settings.activeSlot === undefined) this.settings.activeSlot = SaveSystem.getActiveSlot()
          if (this.settings.customAudioUrl) {
            musicEngine.customUrl = this.settings.customAudioUrl
          }
        }

        if (Array.isArray(data.pastSingularities)) {
          this.pastSingularities = data.pastSingularities
            .map((p) => ({
              id: p.id,
              duration: p.duration,
              spGained: parseSavedDecimal(p.spGained, D_0),
              spPerMinute: parseSavedDecimal(p.spPerMinute, D_0),
              peakMatter: parseSavedDecimal(p.peakMatter, D_0),
              timestamp: p.timestamp || Date.now(),
              challengeId: p.challengeId || null
            }))
            .slice(0, 50)
        } else {
          this.pastSingularities = []
        }

        if (data.stats) {
          this.stats = {
            manualClicks: Math.floor(clampSavedNumber(data.stats.manualClicks, 0, 0, 1e12)),
            totalMatterProduced: parseSavedDecimal(data.stats.totalMatterProduced, new Decimal(10)),
            highestMatter: parseSavedDecimal(data.stats.highestMatter, new Decimal(10)),
            totalPlaytime: clampSavedNumber(data.stats.totalPlaytime, 0, 0, 1e10),
            singularityCount: Math.floor(clampSavedNumber(data.stats.singularityCount, 0, 0, 1e6)),
            fastestSingularity:
              typeof data.stats.fastestSingularity === 'number' && Number.isFinite(data.stats.fastestSingularity)
                ? clampSavedNumber(data.stats.fastestSingularity, Infinity, 0, 1e10)
                : Infinity,
            highestDps: parseSavedDecimal(data.stats.highestDps, D_0),
            totalManualDopamine: parseSavedDecimal(data.stats.totalManualDopamine, D_0),
            anomaliesClicked: Math.floor(clampSavedNumber(data.stats.anomaliesClicked, 0, 0, 1e12)),
            mythicsClicked: Math.floor(clampSavedNumber(data.stats.mythicsClicked, 0, 0, 1e12)),
            combosTriggered: Math.floor(clampSavedNumber(data.stats.combosTriggered, 0, 0, 1e12)),
            slackersFired: Math.floor(clampSavedNumber(data.stats.slackersFired, 0, 0, 1e12)),
            labHarvests: Math.floor(clampSavedNumber(data.stats.labHarvests, 0, 0, 1e12)),
            spellsCast: Math.floor(clampSavedNumber(data.stats.spellsCast, 0, 0, 1e12)),
            seedsPlanted: Math.floor(clampSavedNumber(data.stats.seedsPlanted, 0, 0, 1e12)),
            challengesCompleted: Math.floor(clampSavedNumber(data.stats.challengesCompleted, 0, 0, 1e6)),
            reactorCollapses: Math.floor(clampSavedNumber(data.stats.reactorCollapses, 0, 0, 1e6))
          }
          // Eski kayıt göçü (v9-): yukarıdaki version kancası atlandıysa (bozuk versiyon alanı) yine de güvence altına al
          if (typeof this.singularities !== 'number' || Number.isNaN(this.singularities)) {
            this.singularities = this.stats.singularityCount || 0
          }
        }

        // Özellik Merdiveni (v0.11.0): yapışkan kilitlemeleri yükle, eksikleri hesapla
        // Kayıt beyaz listeden geçer: FEATURE_UNLOCKS'ta olmayan id düşer, liste merdiven boyuyla cap'lenir.
        if (Array.isArray(data.unlockedFeatures)) {
          this.unlockedFeatures = data.unlockedFeatures
            .filter((id): id is string => typeof id === 'string' && FEATURE_IDS.has(id))
            .slice(0, FEATURE_UNLOCKS.length)
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
