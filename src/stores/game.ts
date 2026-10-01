import { defineStore } from 'pinia'
import { Decimal, D_0, D_1, D_INFINITY } from '../core/math'
import { sounds } from '../core/audio'
import { musicEngine } from '../core/music-engine'
import confetti from 'canvas-confetti'
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  calcAchievementMultiplier,
  hasAchievementReward
} from '../game/achievements'
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
  InternetTroll,
  AnomalyType,
  LabCell,
  LabSeedType,
  CrisisSpellType,
  AutobuyerConfig,
  AutobuyerMode
} from '../models/types'

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
    desc: 'Hızlı büyür. Olgunlaştığında komşularıyla mırıldanarak pasif dopamini artırır.',
    cost: new Decimal(500),
    growthSeconds: 15,
    lifeSeconds: 60,
    matureBoostDesc: '+15% Pasif Dopamin / hücre',
    harvestRewardDesc: '30 sn Dopamin'
  },
  {
    type: 'cheese_sizzle' as LabSeedType,
    name: 'Eritme Kaşar Cızırtısı',
    icon: '🧀',
    desc: 'Gece 3 açlığını tetikler. Yoğun dopamin üretir.',
    cost: new Decimal(50000),
    growthSeconds: 30,
    lifeSeconds: 120,
    matureBoostDesc: '+35% Pasif Dopamin / hücre',
    harvestRewardDesc: '2 dk Dopamin'
  },
  {
    type: 'subway_beat' as LabSeedType,
    name: 'Subway Surfers Beat',
    icon: '🛹',
    desc: 'Hipnotik arka plan ritmi. Yukarı kaydırma reflekslerini kamçılar.',
    cost: new Decimal(5e6),
    growthSeconds: 45,
    lifeSeconds: 180,
    matureBoostDesc: '+100% Yukarı Kaydırma gücü',
    harvestRewardDesc: '5 dk Dopamin'
  },
  {
    type: 'sigma_phonk' as LabSeedType,
    name: 'Gece 4 Sigma Phonk',
    icon: '🗿',
    desc: 'Ağır baslar uykuyu kaçırır. Gece Krizleri daha sık ve güçlü gelir.',
    cost: new Decimal(1e9),
    growthSeconds: 60,
    lifeSeconds: 240,
    matureBoostDesc: '+50% Gece Krizi sıklığı',
    harvestRewardDesc: '15 dk Dopamin'
  },
  {
    type: 'brainrot_remix' as LabSeedType,
    name: 'Saf Nöron Çürütücü',
    icon: '🧠',
    desc: 'Yalnızca mutasyonla (Kedi + Phonk komşuluğu) filizlenir. Tüm üretimi katlar!',
    cost: new Decimal(1e15),
    growthSeconds: 90,
    lifeSeconds: 360,
    matureBoostDesc: '+150% Tüm Küresel Dopamin!',
    harvestRewardDesc: '1 saat Dopamin + Kalıcı Bonus',
    isMutationOnly: true
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
    desc: 'Vicdanı tamamen uyutur; anında 30 dakikalık Dopamin patlaması verir.',
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
    id: 'guilt_immunity',
    name: 'Vicdan Uyuşturucu',
    icon: '🛡️',
    desc: 'Vicdan azaplarının emdiği pay %50 azalır, susturulduklarında %150 prim verir.',
    baseCost: 3,
    costMult: 4,
    maxLevel: 3
  }
]

export const AUTOBUYER_COSTS: Record<string, Decimal> = {
  dim1: new Decimal(5e5),
  dim2: new Decimal(5e7),
  dim3: new Decimal(5e9),
  dim4: new Decimal(1e12),
  dim5: new Decimal(1e16),
  dim6: new Decimal(1e21),
  dim7: new Decimal(1e27),
  dim8: new Decimal(1e34),
  tickspeed: new Decimal(5e8),
  shift: new Decimal(5e13),
  galaxy: new Decimal(1e23)
}

// 3 katmanlı pacing: maliyet + ilerleme kilidi + yavaş tekli hız
// dim1 tadımlık erken açılır, dim2/tickspeed D3 ister, dim3-4 ilk sıçramayı ister,
// dim5-8 ikinci sıçramayı ister, shift/galaxy botu ancak ilk sıçrama/kümeden sonra açılır.
export const AUTOBUYER_PROGRESS_REQ: Record<string, { shifts?: number; galaxies?: number; needTier?: number }> = {
  dim1: {},
  dim2: { needTier: 3 },
  dim3: { shifts: 1 },
  dim4: { shifts: 1 },
  dim5: { shifts: 2 },
  dim6: { shifts: 2 },
  dim7: { shifts: 2 },
  dim8: { shifts: 2 },
  tickspeed: { needTier: 3 },
  shift: { shifts: 1 },
  galaxy: { galaxies: 1 }
}

export function getAutobuyerRequirementText(id: string): string {
  const req = AUTOBUYER_PROGRESS_REQ[id]
  if (!req) return ''
  const parts: string[] = []
  if (req.needTier) parts.push(`D${req.needTier} sahibi ol`)
  if (req.shifts) parts.push(`${req.shifts} Sıçrama`)
  if (req.galaxies) parts.push(`${req.galaxies} Küme`)
  return parts.length > 0 ? parts.join(' + ') : ''
}

// Hibrit kademe: tekli dopaminle açılır, toplu shift ister, max galaxy ister
export const AUTOBUYER_BULK_COST = new Decimal(2.5e11)
export const AUTOBUYER_BULK_SHIFT_REQ = 1
export const AUTOBUYER_MAX_COST = new Decimal(1e22)
export const AUTOBUYER_MAX_GALAXY_REQ = 1
export const AUTOBUYER_BULK_BATCH = 5

function getAutobuyerCategory(id: string): 'dim' | 'tickspeed' | 'shift' | 'galaxy' {
  if (id.startsWith('dim')) return 'dim'
  if (id === 'tickspeed') return 'tickspeed'
  if (id === 'shift') return 'shift'
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
    galaxies: 0, // Sonsuz Akış Kümeleri
    singularityPoints: new Decimal(0), // Uykusuzluk / Şöhret Puanı (SP)
    singularities: 0,

    // Gece Duruşu (Trimps Stance)
    currentStance: 'trend' as StanceType,

    // Cookie Clicker: Aktif Buff'lar ve Gece Krizleri
    activeBuffs: [] as ActiveBuff[],
    floatingAnomalies: [] as FloatingAnomaly[],
    anomalyTimer: 0,
    nextAnomalyInterval: 45, // saniye

    // Cookie Clicker: Vicdan Azabı ve Göz Batması (Wrinklers)
    slackers: [] as InternetTroll[],
    slackerTimer: 0,

    // Mini-Oyun 1: Algoritma Laboratuvarı (3x3 Hücre)
    labCells: Array.from({ length: 9 }, (_, i): LabCell => ({
      id: i,
      seedType: null,
      age: 0,
      matureAge: 0,
      maxAge: 0,
      isMature: false
    })),

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
      galaxy: { id: 'galaxy', name: 'Akış Kümeleri Botu', enabled: false, unlocked: false, mode: 'single', interval: 20.0, timer: 0 }
    } as Record<string, AutobuyerConfig>,
    autobuyerBulkUnlocked: false,
    autobuyerMaxUnlocked: false,

    // Kalıcı Uykusuzluk Dükkanı (SP Upgrades Seviyeleri)
    singularityUpgrades: {
      eye_drops: 0,
      muted_alerts: 0,
      fast_charger: 0,
      caffeine_drip: 0,
      neural_chip: 0,
      guilt_immunity: 0
    } as Record<string, number>,

    // Başarımlar (Prestij dahil kalıcı — reset action'ları bu alana dokunmaz)
    achievements: [] as string[],
    achievementsSeenCount: 0,
    achievementToastQueue: [] as string[],

    lastUpdate: Date.now(),
    isSingularityReady: false,

    settings: {
      notation: 'standard' as const,
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
      customAudioUrl: ''
    } as GameSettings,

    stats: {
      manualClicks: 0, // Kaydırma Sayısı
      totalMatterProduced: new Decimal(10), // Toplam Dopamin
      highestMatter: new Decimal(10),
      totalPlaytime: 0,
      singularityCount: 0,
      fastestSingularity: Infinity,
      anomaliesClicked: 0,
      combosTriggered: 0,
      slackersFired: 0,
      labHarvests: 0,
      spellsCast: 0,
      seedsPlanted: 0
    } as PlayerStats
  }),

  getters: {
    // Dopamin Alias'ı
    dopamine(state): Decimal {
      return state.matter
    },

    // Kaç adet istasyonun açık olduğu (Başta 4 açık, Sıçrama yaptıkça 8'e kadar açılır)
    unlockedDimensionsCount(state): number {
      return Math.min(8, 4 + state.dimensionShifts)
    },

    // Algoritma Frekansı (Tickspeed) indirim oranı (Hızlı Şarj Adaptörü ile güçlenir)
    tickspeedMultiplier(state): Decimal {
      const chargerBonus = (state.singularityUpgrades?.fast_charger || 0) * 0.02
      const baseReduction = Math.max(0.7, 0.89 - chargerBonus)
      const galaxyBonus = Math.max(0.01, baseReduction - state.galaxies * 0.02)
      return Decimal.pow(1 / galaxyBonus, state.tickspeedBought)
    },

    // Algoritma Frekansı Satın Alma Maliyeti (Düşük Parlaklık modunda %15 indirimli)
    tickspeedCost(state): Decimal {
      let cost = new Decimal(1000).times(Decimal.pow(13, state.tickspeedBought))
      if (state.currentStance === 'private_mode') {
        cost = cost.times(0.85).floor()
      }
      if (hasAchievementReward(state.achievements, 'tickspeed_discount')) {
        cost = cost.times(0.95).floor()
      }
      return cost
    },

    // Akış Sıçraması (Shift / Boost) Gereksinimi
    shiftRequirement(state): { tier: number; amount: number } {
      if (state.dimensionShifts < 4) {
        const targetTier = 4 + state.dimensionShifts + 1
        return { tier: targetTier - 1, amount: 25 }
      }
      return { tier: 8, amount: 25 + (state.dimensionShifts - 4) * 15 }
    },

    canShift(): boolean {
      const req = this.shiftRequirement
      const dim = this.dimensions[req.tier - 1]
      return dim ? dim.amount.gte(req.amount) : false
    },

    // Sonsuz Akış Kümesi Gereksinimi (8. İstasyon miktarı)
    galaxyRequirement(state): number {
      return 100 + state.galaxies * 60
    },

    canBuyGalaxy(state): boolean {
      const dim8 = state.dimensions[7]
      return dim8.amount.gte(this.galaxyRequirement)
    },

    // Sabah 06:00 Çöküşü Hazır mı? (1.79e308 Dopamin)
    canSingularity(state): boolean {
      return state.matter.gte(D_INFINITY)
    },

    // Tekillik Çöküşünden kazanılacak Uykusuzluk Puanı (SP)
    singularityGain(state): Decimal {
      if (state.matter.lt(D_INFINITY)) return D_0
      const logMatter = state.matter.log10().toNumber()
      return Decimal.floor(Decimal.pow(10, (logMatter - 308) / 308))
    },

    // İstasyon Çarpanı Hesabı (Göz Damlası SP Yükseltmesi ile 2^lvl katlanır)
    getDimensionMultiplier: (state) => (tier: number): Decimal => {
      const dim = state.dimensions[tier - 1]
      if (!dim) return D_1

      // Satın alınan her 10 adet için 2x
      let mult = Decimal.pow(2, Math.floor(dim.bought / 10))

      // Akış Sıçraması (Shift/Boost) bonusu: Her biri 2x
      if (state.dimensionShifts > 0) {
        mult = mult.times(Decimal.pow(2, state.dimensionShifts))
      }

      // Göz Damlası Yükseltmesi
      const eyeDropsLvl = state.singularityUpgrades?.eye_drops || 0
      if (eyeDropsLvl > 0) {
        mult = mult.times(Decimal.pow(2, eyeDropsLvl))
      }

      return mult
    },

    // İstasyon Maliyet Hesabı (Getter)
    getDimensionCost: (state) => (tier: number): Decimal => {
      const dim = state.dimensions[tier - 1]
      if (!dim) return D_INFINITY
      return dim.baseCost.times(Decimal.pow(dim.costMult, Math.floor(dim.bought / 10)))
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

    // Süper Rezonans Komboları Aktif mi? (Gece 3 7x VE Başparmak Histerisi 777x aynı anda)
    isComboActive(state): boolean {
      const hasFyp = state.activeBuffs.some((b) => b.type === 'fyp')
      const hasFrenzy = state.activeBuffs.some((b) => b.type === 'heart_frenzy')
      return hasFyp && hasFrenzy
    },

    // Vicdan azaplarının emdiği oran (Vicdan Uyuşturucu yükseltmesi ile azalır)
    slackerLeechPercent(state): number {
      const baseLeech = state.slackers.length * 0.03
      const immunityLvl = state.singularityUpgrades?.guilt_immunity || 0
      const factor = Math.max(0.2, 1 - immunityLvl * 0.25)
      const achFactor = hasAchievementReward(state.achievements, 'leech_reduction') ? 0.85 : 1
      return baseLeech * factor * achFactor
    },

    // Kilit Açılma Durumları (Sekmeler için)
    labUnlocked(state): boolean {
      return this.unlockedDimensionsCount >= 2 || state.dimensionShifts >= 1 || state.matter.gte(100)
    },

    crisisUnlocked(state): boolean {
      return this.unlockedDimensionsCount >= 4 || state.dimensionShifts >= 2 || state.matter.gte(1e6)
    },

    autobuyersUnlocked(state): boolean {
      return state.singularities > 0 || state.matter.gte(1e4)
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
      if (req.needTier !== undefined) {
        const dim = state.dimensions[req.needTier - 1]
        if (!dim || dim.amount.lt(1)) return false
      }
      return true
    },

    singularityUnlocked(state): boolean {
      return state.singularities > 0 || state.matter.gte(1e30)
    },

    // Algoritma Lab Pasif Üretim Çarpanı (Olgun Kedi, Kaşar ve Nöron tohumlarından gelir)
    labPassiveMultiplier(state): Decimal {
      let mult = D_1
      state.labCells.forEach((c) => {
        if (c.isMature && c.seedType) {
          if (c.seedType === 'cat_audio') mult = mult.times(1.15)
          else if (c.seedType === 'cheese_sizzle') mult = mult.times(1.35)
          else if (c.seedType === 'brainrot_remix') mult = mult.times(2.5)
        }
      })
      return mult
    },

    // Algoritma Lab Tıklama Çarpanı (Olgun Subway Surfers tohumlarından gelir)
    labClickMultiplier(state): Decimal {
      let mult = D_1
      state.labCells.forEach((c) => {
        if (c.isMature && c.seedType === 'subway_beat') {
          mult = mult.times(2.0)
        }
      })
      return mult
    },

    // Algoritma Lab Anomali Sıklığı Çarpanı (Olgun Sigma Phonk tohumlarından gelir)
    labAnomalyMultiplier(state): number {
      let bonus = 1.0
      state.labCells.forEach((c) => {
        if (c.isMature && c.seedType === 'sigma_phonk') {
          bonus *= 1.5
        }
      })
      return bonus
    },

    // Toplam Manuel Kaydırma Gücü (Yukarı Kaydır)
    manualClickPower(state): Decimal {
      let power = D_1.times(Decimal.pow(2, state.dimensionShifts))
      power = power.times(this.stanceMultipliers.click)
      power = power.times(this.clickBuffMultiplier)
      power = power.times(this.labClickMultiplier)
      power = power.times(this.achievementMultiplier)
      power = power.times(this.achievementClickMult)

      // Damardan Kafein Serumu: Saniyelik üretimin her seviye %5'ini ekler
      const caffeineLvl = state.singularityUpgrades?.caffeine_drip || 0
      if (caffeineLvl > 0) {
        const passiveAdd = this.matterPerSecond.times(caffeineLvl * 0.05 * this.achievementCaffeineBoost)
        power = power.plus(passiveAdd)
      }

      return power
    },

    // Saniyedeki Efektif Dopamin Üretimi
    matterPerSecond(state): Decimal {
      const dim1 = state.dimensions[0]
      if (!dim1 || dim1.amount.eq(0)) return D_0

      const baseProd = dim1.amount
        .times(this.getDimensionMultiplier(1))
        .times(this.tickspeedMultiplier)

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
        .times(debuffMult)
        .times(netRatio)
    },

    dopaminePerSecond(): Decimal {
      return this.matterPerSecond
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
    achievementMultiplier(state): Decimal {
      return calcAchievementMultiplier(state.achievements)
    },

    hasUnseenAchievements(state): boolean {
      return state.achievements.length > state.achievementsSeenCount
    },

    achievementClickMult(state): number {
      return hasAchievementReward(state.achievements, 'click_x2') ? 2 : 1
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
    }
  },

  actions: {
    // Gece Duruşunu Değiştir
    setStance(stance: StanceType): void {
      if (this.currentStance === stance) return
      this.currentStance = stance
      sounds.playStance()
    },

    // 10'luk İstasyon Satın Alımı
    buyDimension(tier: number, playSound = true): boolean {
      if (tier > this.unlockedDimensionsCount) return false
      const dim = this.dimensions[tier - 1]
      const cost = this.getDimensionCost(tier)

      if (this.matter.gte(cost)) {
        this.matter = this.matter.minus(cost)
        dim.amount = dim.amount.plus(10)
        dim.bought += 10

        if (playSound) {
          sounds.playBuy(tier)
        }
        return true
      }
      return false
    },

    // Bir İstasyondan Alınabildiği Kadar Satın Al
    buyMaxDimension(tier: number, playSound = true): boolean {
      if (tier > this.unlockedDimensionsCount) return false
      let boughtAny = false

      while (true) {
        const cost = this.getDimensionCost(tier)
        if (this.matter.gte(cost)) {
          this.matter = this.matter.minus(cost)
          const dim = this.dimensions[tier - 1]
          dim.amount = dim.amount.plus(10)
          dim.bought += 10
          boughtAny = true
        } else {
          break
        }
      }

      if (boughtAny && playSound) {
        sounds.playBuy(tier)
      }
      return boughtAny
    },

    // Algoritma Frekansı (Tickspeed) Yükselt
    buyTickspeed(playSound = true): boolean {
      const cost = this.tickspeedCost
      if (this.matter.gte(cost)) {
        this.matter = this.matter.minus(cost)
        this.tickspeedBought++
        if (playSound) {
          sounds.playBuy(0)
        }
        return true
      }
      return false
    },

    // Tüm İstasyonları ve Frekansı Optimize Al (Max All)
    maxAll(): void {
      let boughtAny = false
      while (this.matter.gte(this.tickspeedCost)) {
        if (this.buyTickspeed(false)) {
          boughtAny = true
        } else {
          break
        }
      }

      for (let t = this.unlockedDimensionsCount; t >= 1; t--) {
        if (this.buyMaxDimension(t, false)) {
          boughtAny = true
        }
      }

      if (boughtAny) {
        sounds.playBuy(1)
      }
    },

    // Yukarı Kaydır (Manuel Tıklama)
    manualClick(): void {
      const gain = this.manualClickPower
      this.matter = this.matter.plus(gain)
      this.stats.manualClicks++
      this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(gain)
      sounds.playClick()
    },

    // Akış Sıçraması (Dimension Shift / Boost)
    dimensionShift(playSound = true): boolean {
      if (!this.canShift) return false

      this.dimensionShifts++
      this.matter = this.achievementStartingMatter
      this.dimensions.forEach((d) => {
        d.amount = new Decimal(0)
        d.bought = 0
      })
      this.tickspeedBought = 0

      if (playSound) {
        sounds.playShift()
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#a855f7', '#ec4899', '#06b6d4']
        })
      }
      return true
    },

    // Sonsuz Akış Kümeleri Yaratımı
    buyGalaxy(playSound = true): boolean {
      if (!this.canBuyGalaxy) return false

      this.galaxies++
      this.dimensionShifts = 0
      this.matter = this.achievementStartingMatter
      this.dimensions.forEach((d) => {
        d.amount = new Decimal(0)
        d.bought = 0
      })
      this.tickspeedBought = 0

      if (playSound) {
        sounds.playGalaxy()
        confetti({
          particleCount: 90,
          spread: 100,
          origin: { y: 0.7 },
          colors: ['#a855f7', '#06b6d4', '#ffffff']
        })
      }
      return true
    },

    // Sabah 06:00 Çöküşü (Tekillik Prestiji)
    singularityReset(): boolean {
      if (!this.canSingularity) return false

      const gain = this.singularityGain
      this.singularityPoints = this.singularityPoints.plus(gain)
      this.singularities++
      this.stats.singularityCount++

      this.matter = this.achievementStartingMatter
      this.dimensions.forEach((d) => {
        d.amount = new Decimal(0)
        d.bought = 0
      })
      this.tickspeedBought = 0
      this.dimensionShifts = 0
      this.galaxies = 0
      this.slackers = []

      sounds.playSingularity()
      confetti({
        particleCount: 180,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#06b6d4', '#ec4899', '#ffffff']
      })
      return true
    },

    // Algoritma Lab: Tohum Ek
    plantSeed(cellId: number, seedType: LabSeedType): boolean {
      const cell = this.labCells[cellId]
      if (!cell || cell.seedType !== null) return false

      const seedDef = LAB_SEEDS.find((s) => s.type === seedType)
      if (!seedDef) return false
      if (this.matter.lt(seedDef.cost)) return false

      this.matter = this.matter.minus(seedDef.cost)
      cell.seedType = seedType
      cell.age = 0
      cell.matureAge = seedDef.growthSeconds
      cell.maxAge = seedDef.lifeSeconds
      cell.isMature = false
      this.stats.seedsPlanted = (this.stats.seedsPlanted || 0) + 1

      sounds.playPlant()
      return true
    },

    // Algoritma Lab: Hasat Et
    harvestCell(cellId: number): boolean {
      const cell = this.labCells[cellId]
      if (!cell || !cell.seedType || !cell.isMature) return false

      let reward = D_0
      const currentPerSec = this.matterPerSecond
      const clickPwr = this.manualClickPower

      if (cell.seedType === 'cat_audio') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(30) : clickPwr.times(50)
      } else if (cell.seedType === 'cheese_sizzle') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(120) : clickPwr.times(200)
      } else if (cell.seedType === 'subway_beat') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(300) : clickPwr.times(500)
      } else if (cell.seedType === 'sigma_phonk') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(900) : clickPwr.times(1500)
      } else if (cell.seedType === 'brainrot_remix') {
        reward = currentPerSec.gt(0) ? currentPerSec.times(3600) : clickPwr.times(5000)
      }

      reward = reward.times(this.achievementLabYield)

      this.matter = this.matter.plus(reward)
      this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(reward)
      this.stats.labHarvests = (this.stats.labHarvests || 0) + 1

      cell.seedType = null
      cell.age = 0
      cell.isMature = false

      sounds.playHarvest()
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#a855f7', '#06b6d4']
      })
      return true
    },

    // Algoritma Lab: Çürüyen veya istenmeyen tohumu sök
    clearCell(cellId: number): void {
      const cell = this.labCells[cellId]
      if (!cell) return
      cell.seedType = null
      cell.age = 0
      cell.isMature = false
      sounds.playSlackerClick()
    },

    // Gece Kriz Yönetimi: Büyü / Karar Kullan
    castSpell(spellId: CrisisSpellType): boolean {
      const spell = CRISIS_SPELLS.find((s) => s.id === spellId)
      if (!spell) return false
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

      // Başarılı Büyü Etkileri
      sounds.playCastSpell()
      if (spellId === 'fast_charge') {
        this.spawnAnomaly()
      } else if (spellId === 'espresso_shot') {
        const espressoSecs = Math.floor(30 * this.achievementBuffDuration)
        this.activeBuffs.push({
          id: `buff-espresso-${Date.now()}`,
          type: 'fyp',
          name: '☕ Çift Espresso (3× Frekans)',
          duration: espressoSecs,
          remaining: espressoSecs,
          multiplier: 3
        })
      } else if (spellId === 'noise_cancelling') {
        this.slackers.forEach((s) => {
          const refund = s.leechedLikes.times(1.5)
          this.matter = this.matter.plus(refund)
          this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(refund)
          this.stats.slackersFired++
        })
        this.slackers = []
        sounds.playFireWorker()
      } else if (spellId === 'sleep_denial') {
        const curSec = this.matterPerSecond
        const blast = curSec.gt(0) ? curSec.times(1800) : this.manualClickPower.times(2000)
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

    // Gece Krizi Doğur (Spawn Anomaly)
    spawnAnomaly(): void {
      if (this.floatingAnomalies.length >= 2) return

      const types: AnomalyType[] = ['fyp', 'heart_frenzy', 'sponsor']
      const chosenType = types[Math.floor(Math.random() * types.length)]

      let title = ''
      let desc = ''
      if (chosenType === 'fyp') {
        title = '🔥 Gece 3 Çılgınlığı!'
        desc = '60 saniyeliğine tüm dopamin akışını 7× katlar!'
      } else if (chosenType === 'heart_frenzy') {
        title = '👆 Başparmak Histerisi!'
        desc = '15 saniyeliğine Yukarı Kaydırma gücünü 777× fırlatır!'
      } else {
        title = '💎 50 Milyonluk Viral Video!'
        desc = 'Anında 15 dakikalık saf dopamin doğrudan beyne akar!'
      }

      const x = Math.floor(Math.random() * 65) + 15
      const y = Math.floor(Math.random() * 60) + 20

      this.floatingAnomalies.push({
        id: `anomaly-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: chosenType,
        x,
        y,
        remainingTime: 14,
        title,
        desc
      })

      const baseInterval = 45 + Math.random() * 30
      const mutedLvl = this.singularityUpgrades?.muted_alerts || 0
      const alertDiscount = Math.max(0.4, 1 - mutedLvl * 0.12)
      this.nextAnomalyInterval = (baseInterval * alertDiscount * this.achievementAnomalyFactor) / (this.stanceMultipliers.anomalyRate * this.labAnomalyMultiplier)
      this.anomalyTimer = 0
    },

    // Gece Krizine Tıkla (Collect Golden Buff)
    clickAnomaly(anomalyId: string): void {
      const index = this.floatingAnomalies.findIndex((a) => a.id === anomalyId)
      if (index === -1) return

      const anomaly = this.floatingAnomalies[index]
      this.floatingAnomalies.splice(index, 1)
      this.stats.anomaliesClicked++
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
            name: '👆 Başparmak Histerisi (777× Kaydır)',
            duration: Math.floor(15 * durMult),
            remaining: Math.floor(15 * durMult),
            multiplier: 777
          })
        }
      } else if (anomaly.type === 'sponsor') {
        const currentPerSec = this.matterPerSecond
        const instantReward = currentPerSec.gt(0)
          ? currentPerSec.times(900)
          : this.manualClickPower.times(300)

        this.matter = this.matter.plus(instantReward)
        this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(instantReward)
      }

      if (this.isComboActive) {
        this.stats.combosTriggered++
        sounds.playCombo()
        confetti({
          particleCount: 130,
          spread: 100,
          origin: { y: 0.4 },
          colors: ['#a855f7', '#ec4899', '#06b6d4', '#f59e0b']
        })
      } else {
        sounds.playAnomaly()
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
        leechedLikes: new Decimal(0),
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
        const refundRatio = 1.2 + immunityLvl * 0.15
        const refund = slacker.leechedLikes.times(refundRatio)

        this.matter = this.matter.plus(refund)
        this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(refund)
        this.stats.slackersFired++

        this.slackers.splice(index, 1)
        sounds.playFireWorker()

        confetti({
          particleCount: 45,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#a855f7', '#06b6d4', '#ffffff']
        })
      } else {
        sounds.playSlackerClick()
      }
    },

    // ---- Başarım Kontrol Motoru (update() sonunda çalışır; offline'da da tetiklenir) ----
    checkAchievements(): void {
      const unlocked = new Set(this.achievements)
      const ctx: AchievementContext = {
        manualClicks: this.stats.manualClicks,
        totalMatter: this.stats.totalMatterProduced,
        highestMatter: this.stats.highestMatter,
        matter: this.matter,
        playtime: this.stats.totalPlaytime,
        singularityCount: this.stats.singularityCount,
        anomaliesClicked: this.stats.anomaliesClicked,
        combosTriggered: this.stats.combosTriggered,
        slackersFired: this.stats.slackersFired,
        labHarvests: this.stats.labHarvests || 0,
        spellsCast: this.stats.spellsCast || 0,
        seedsPlanted: this.stats.seedsPlanted || 0,
        tickspeedBought: this.tickspeedBought,
        shifts: this.dimensionShifts,
        galaxies: this.galaxies,
        sp: this.singularityPoints,
        spUpgradesTotal: Object.values(this.singularityUpgrades || {}).reduce((a, b) => a + b, 0),
        guiltImmunityLvl: this.singularityUpgrades?.guilt_immunity || 0,
        dimBoughtTotal: this.dimensions.reduce((a, d) => a + d.bought, 0),
        dimBought0: this.dimensions[0]?.bought || 0,
        unlockedBots: Object.values(this.autobuyers).filter((b) => b.unlocked).map((b) => b.id),
        bulkUnlocked: this.autobuyerBulkUnlocked,
        maxUnlocked: this.autobuyerMaxUnlocked,
        matureCells: this.labCells.filter((c) => c.isMature && !!c.seedType).length,
        hasBrainrot: this.labCells.some((c) => c.seedType === 'brainrot_remix'),
        hasMatureBrainrot: this.labCells.some((c) => c.seedType === 'brainrot_remix' && c.isMature),
        activeSlackers: this.slackers.length,
        leechedTotal: this.slackers.reduce((a, s) => a.plus(s.leechedLikes), D_0),
        wallHour: new Date().getHours()
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
        const catDefs = ACHIEVEMENTS.filter((a) => a.category === def.category)
        if (catDefs.every((a) => a.id === def.id || unlocked.has(a.id))) {
          completedRow = true
        }
      })

      if (newCount === 0) return
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

    // Çekirdek Simülasyon Döngüsü
    update(deltaSeconds: number): void {
      if (deltaSeconds <= 0) return

      // 1. Aktif Buff Sürelerini Azalt
      for (let b = this.activeBuffs.length - 1; b >= 0; b--) {
        this.activeBuffs[b].remaining -= deltaSeconds
        if (this.activeBuffs[b].remaining <= 0) {
          this.activeBuffs.splice(b, 1)
        }
      }

      // 2. Yüzen Anomali Sürelerini Azalt
      for (let a = this.floatingAnomalies.length - 1; a >= 0; a--) {
        this.floatingAnomalies[a].remainingTime -= deltaSeconds
        if (this.floatingAnomalies[a].remainingTime <= 0) {
          this.floatingAnomalies.splice(a, 1)
        }
      }

      // 3. Anomali Doğurma Sayacı
      this.anomalyTimer += deltaSeconds
      if (this.anomalyTimer >= this.nextAnomalyInterval) {
        this.spawnAnomaly()
      }

      // 4. Vicdan Azabı Doğurma Sayacı
      if (this.dimensionShifts >= 1 || this.matter.gte(1e5)) {
        this.slackerTimer += deltaSeconds
        if (this.slackerTimer >= 40) {
          this.slackerTimer = 0
          if (Math.random() < 0.6) {
            this.spawnSlacker()
          }
        }
      }

      // 5. Algoritma Lab Bitki Büyümesi & Mutasyon
      this.labCells.forEach((cell) => {
        if (cell.seedType) {
          cell.age += deltaSeconds
          if (cell.age >= cell.matureAge) {
            cell.isMature = true
          }
          if (cell.age >= cell.maxAge) {
            // Çürüme
            cell.seedType = null
            cell.isMature = false
            cell.age = 0
          }
        }
      })

      // Komşu çaprazlama mutasyonu (Kedi + Phonk -> Brainrot Remix)
      this.labCells.forEach((cell, idx) => {
        if (cell.seedType === null) {
          // Komşuları bul (3x3 grid)
          const row = Math.floor(idx / 3)
          const col = idx % 3
          const neighbors: (LabSeedType | null)[] = []
          if (row > 0) neighbors.push(this.labCells[idx - 3].seedType)
          if (row < 2) neighbors.push(this.labCells[idx + 3].seedType)
          if (col > 0) neighbors.push(this.labCells[idx - 1].seedType)
          if (col < 2) neighbors.push(this.labCells[idx + 1].seedType)

          const hasCat = neighbors.includes('cat_audio')
          const hasPhonk = neighbors.includes('sigma_phonk')
          if (hasCat && hasPhonk && Math.random() < 0.05 * deltaSeconds) {
            cell.seedType = 'brainrot_remix'
            cell.age = 0
            cell.matureAge = 90
            cell.maxAge = 360
            cell.isMature = false
            sounds.playPlant()
          }
        }
      })

      // 6. Gece Kriz Enerji Yenilenmesi & Debuff
      this.caffeineEnergy = Math.min(this.maxCaffeineEnergy, this.caffeineEnergy + deltaSeconds * 1.2 * this.achievementCaffeineRegen)
      if (this.crisisBackfireDebuff > 0) {
        this.crisisBackfireDebuff = Math.max(0, this.crisisBackfireDebuff - deltaSeconds)
      }

      // 7. Otomatik Kaydırma Botları (Autobuyers - tekli/toplu/max)
      const botSpeedMult = Math.pow(1.5, this.singularityUpgrades?.neural_chip || 0)
      Object.keys(this.autobuyers).forEach((key) => {
        const bot = this.autobuyers[key]
        if (bot && bot.unlocked && bot.enabled) {
          bot.timer += deltaSeconds * botSpeedMult
          if (bot.timer >= bot.interval) {
            bot.timer = 0
            const effectiveMode: AutobuyerMode = bot.mode || 'single'
            if (key.startsWith('dim')) {
              const tier = parseInt(key.replace('dim', ''), 10)
              if (effectiveMode === 'max' && this.autobuyerMaxUnlocked) {
                this.buyMaxDimension(tier, false)
              } else if (effectiveMode === 'bulk' && this.autobuyerBulkUnlocked) {
                for (let i = 0; i < AUTOBUYER_BULK_BATCH; i++) {
                  if (!this.buyDimension(tier, false)) break
                }
              } else {
                this.buyDimension(tier, false)
              }
            } else if (key === 'tickspeed') {
              if (effectiveMode === 'max' && this.autobuyerMaxUnlocked) {
                for (let i = 0; i < 100; i++) {
                  if (!this.buyTickspeed(false)) break
                }
              } else if (effectiveMode === 'bulk' && this.autobuyerBulkUnlocked) {
                for (let i = 0; i < AUTOBUYER_BULK_BATCH; i++) {
                  if (!this.buyTickspeed(false)) break
                }
              } else {
                this.buyTickspeed(false)
              }
            } else if (key === 'shift') {
              if (this.canShift) this.dimensionShift(false)
            } else if (key === 'galaxy') {
              if (this.canBuyGalaxy) this.buyGalaxy(false)
            }
          }
        }
      })

      // 8. Boyut Zinciri Simülasyonu
      const unlocked = this.unlockedDimensionsCount
      const speed = this.tickspeedMultiplier

      for (let i = unlocked - 1; i >= 1; i--) {
        const higherDim = this.dimensions[i]
        const lowerDim = this.dimensions[i - 1]
        if (higherDim && lowerDim && higherDim.amount.gt(0)) {
          const mult = this.getDimensionMultiplier(i + 1)
          const produced = higherDim.amount.times(mult).times(speed).times(this.achievementMultiplier).times(deltaSeconds)
          lowerDim.amount = lowerDim.amount.plus(produced)
        }
      }

      // 1. İstasyon -> Dopamin üretir
      const dim1 = this.dimensions[0]
      if (dim1 && dim1.amount.gt(0)) {
        const rawProduced = dim1.amount
          .times(this.getDimensionMultiplier(1))
          .times(speed)
          .times(this.stanceMultipliers.production)
          .times(this.productionBuffMultiplier)
          .times(this.labPassiveMultiplier)
          .times(this.achievementMultiplier)
          .times(this.crisisBackfireDebuff > 0 ? 0.5 : 1.0)
          .times(deltaSeconds)

        const totalLeechRatio = this.slackerLeechPercent
        const leechedAmount = rawProduced.times(totalLeechRatio)
        const netProduced = rawProduced.minus(leechedAmount)

        if (this.slackers.length > 0 && leechedAmount.gt(0)) {
          const perSlacker = leechedAmount.div(this.slackers.length)
          this.slackers.forEach((s) => {
            s.leechedLikes = s.leechedLikes.plus(perSlacker)
          })
        }

        this.matter = this.matter.plus(netProduced)
        this.stats.totalMatterProduced = this.stats.totalMatterProduced.plus(netProduced)

        if (this.matter.gt(this.stats.highestMatter)) {
          this.stats.highestMatter = this.matter
        }
      }

      this.stats.totalPlaytime += deltaSeconds
      this.checkAchievements()
      this.lastUpdate = Date.now()
    },

    // Çevrimdışı İlerleme Simülatörü
    simulateOfflineProgress(offlineSeconds: number): void {
      if (offlineSeconds <= 1) return

      const detailedSeconds = Math.min(300, offlineSeconds)
      const steps = Math.floor(detailedSeconds / 0.1)
      for (let s = 0; s < steps; s++) {
        this.update(0.1)
      }

      const remainingSeconds = offlineSeconds - detailedSeconds
      if (remainingSeconds > 0) {
        this.update(remainingSeconds)
      }
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

    // State Serialization (Kayıt)
    serialize(): SerializedPlayerState {
      const serializedAutobuyers: Record<string, { enabled: boolean; unlocked: boolean; mode?: AutobuyerMode }> = {}
      Object.keys(this.autobuyers).forEach((k) => {
        serializedAutobuyers[k] = {
          enabled: this.autobuyers[k].enabled,
          unlocked: this.autobuyers[k].unlocked,
          mode: this.autobuyers[k].mode || 'single'
        }
      })

      return {
        version: 7,
        matter: this.matter.toString(),
        dimensions: this.dimensions.map((d) => ({
          amount: d.amount.toString(),
          bought: d.bought
        })),
        tickspeedBought: this.tickspeedBought,
        dimensionShifts: this.dimensionShifts,
        galaxies: this.galaxies,
        singularityPoints: this.singularityPoints.toString(),
        currentStance: this.currentStance,
        activeBuffs: this.activeBuffs.map((b) => ({
          type: b.type,
          remaining: b.remaining
        })),
        slackers: this.slackers.map((s) => ({
          name: s.name,
          leechedKpi: s.leechedLikes.toString()
        })),
        caffeineEnergy: this.caffeineEnergy,
        labCells: this.labCells.map((c) => ({
          id: c.id,
          seedType: c.seedType,
          age: c.age,
          matureAge: c.matureAge,
          maxAge: c.maxAge
        })),
        autobuyers: serializedAutobuyers,
        autobuyerBulkUnlocked: this.autobuyerBulkUnlocked,
        autobuyerMaxUnlocked: this.autobuyerMaxUnlocked,
        singularityUpgrades: { ...this.singularityUpgrades },
        achievements: [...this.achievements],
        achievementsSeenCount: this.achievementsSeenCount,
        lastUpdate: this.lastUpdate,
        settings: { ...this.settings },
        stats: {
          manualClicks: this.stats.manualClicks,
          totalMatterProduced: this.stats.totalMatterProduced.toString(),
          highestMatter: this.stats.highestMatter.toString(),
          totalPlaytime: this.stats.totalPlaytime,
          singularityCount: this.stats.singularityCount,
          fastestSingularity: this.stats.fastestSingularity,
          anomaliesClicked: this.stats.anomaliesClicked || 0,
          combosTriggered: this.stats.combosTriggered || 0,
          slackersFired: this.stats.slackersFired || 0,
          labHarvests: this.stats.labHarvests || 0,
          spellsCast: this.stats.spellsCast || 0,
          seedsPlanted: this.stats.seedsPlanted || 0
        }
      }
    },

    // State Deserialization (Yükleme)
    deserialize(data: SerializedPlayerState): void {
      try {
        this.matter = new Decimal(data.matter || 10)
        if (Array.isArray(data.dimensions)) {
          data.dimensions.forEach((savedDim, i) => {
            if (this.dimensions[i]) {
              this.dimensions[i].amount = new Decimal(savedDim.amount || 0)
              this.dimensions[i].bought = savedDim.bought || 0
            }
          })
        }
        this.tickspeedBought = data.tickspeedBought || 0
        this.dimensionShifts = data.dimensionShifts || 0
        this.galaxies = data.galaxies || 0
        this.singularityPoints = new Decimal(data.singularityPoints || 0)

        if (data.currentStance) {
          this.currentStance = data.currentStance
        }

        if (Array.isArray(data.activeBuffs)) {
          this.activeBuffs = data.activeBuffs.map((b) => ({
            id: `buff-${b.type}-${Date.now()}`,
            type: b.type,
            name: b.type === 'fyp' ? '🔥 Gece 3 Çılgınlığı (7× Dopamin)' : '👆 Başparmak Histerisi (777× Kaydır)',
            duration: b.type === 'fyp' ? 60 : 15,
            remaining: b.remaining,
            multiplier: b.type === 'fyp' ? 7 : 777
          }))
        }

        if (Array.isArray(data.slackers)) {
          this.slackers = data.slackers.map((s) => ({
            id: `guilt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: s.name,
            leechedLikes: new Decimal(s.leechedKpi || 0),
            clicksRemaining: 3
          }))
        }

        if (typeof data.caffeineEnergy === 'number') {
          this.caffeineEnergy = data.caffeineEnergy
        }

        if (Array.isArray(data.labCells)) {
          data.labCells.forEach((savedCell, i) => {
            if (this.labCells[i]) {
              this.labCells[i].seedType = savedCell.seedType
              this.labCells[i].age = savedCell.age || 0
              this.labCells[i].matureAge = savedCell.matureAge || 0
              this.labCells[i].maxAge = savedCell.maxAge || 0
              this.labCells[i].isMature = savedCell.age >= savedCell.matureAge && savedCell.seedType !== null
            }
          })
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

        if (data.singularityUpgrades) {
          this.singularityUpgrades = { ...this.singularityUpgrades, ...data.singularityUpgrades }
        }

        if (Array.isArray(data.achievements)) {
          this.achievements = data.achievements.filter((id) => typeof id === 'string')
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
          if (this.settings.customAudioUrl) {
            musicEngine.customUrl = this.settings.customAudioUrl
          }
        }

        if (data.stats) {
          this.stats = {
            manualClicks: data.stats.manualClicks || 0,
            totalMatterProduced: new Decimal(data.stats.totalMatterProduced || 10),
            highestMatter: new Decimal(data.stats.highestMatter || 10),
            totalPlaytime: data.stats.totalPlaytime || 0,
            singularityCount: data.stats.singularityCount || 0,
            fastestSingularity: data.stats.fastestSingularity || Infinity,
            anomaliesClicked: data.stats.anomaliesClicked || 0,
            combosTriggered: data.stats.combosTriggered || 0,
            slackersFired: data.stats.slackersFired || 0,
            labHarvests: data.stats.labHarvests || 0,
            spellsCast: data.stats.spellsCast || 0,
            seedsPlanted: data.stats.seedsPlanted || 0
          }
        }

        const now = Date.now()
        const diffSeconds = Math.max(0, (now - (data.lastUpdate || now)) / 1000)
        if (diffSeconds > 3) {
          this.simulateOfflineProgress(diffSeconds)
        }
      } catch (err) {
        console.error('Save yüklenirken hata:', err)
      }
    }
  }
})
