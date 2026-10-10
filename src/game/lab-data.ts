// Lab (Viral Matris) verisi: tohum tanimlari, sentez tarifleri ve maliyet/yardimci
// fonksiyonlar. Saf moduldur; store import etmez.
import { Decimal } from '../core/math'
import type { LabCell, LabSeedType } from '../models/types'

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
export const LAB_SEED_COST_SOFT_START_LOG = 65
export const LAB_SEED_COST_DECADES_PER_STEP = 25
export const LAB_SEED_COST_STEP_MULT = 2
export const LAB_SEED_COST_MAX_MULT = 64
// Süperkritik Boşalım bekleme süresi (sn, totalPlaytime damgasıyla ölçülür).
export const VIRAL_DROP_COOLDOWN_SECONDS = 120
// Egzotik tek-meta kırma: ebeveyn desteksiz egzotik hücrenin bonusu
// 1.0'a doğru bu bölenle yarıya indirilir.
export const EXOTIC_LONE_PENALTY_DIVISOR = 2
export const EXOTIC_LONE_PENALTY_SEEDS: readonly LabSeedType[] = ['higgs_boson', 'dark_matter_core', 'tachyon_flux', 'magnetic_shield']
// Dalgalanma Rejimi hasat ikilemesi: şans ve çarpan.
export const FLUCTUATION_HARVEST_DOUBLE_CHANCE = 0.2
export const FLUCTUATION_HARVEST_DOUBLE_MULT = 2
// Merkez hücre (id 4) manuel yutma bonusu.
export const LAB_CENTER_CLICK_BONUS = 1.3

/** Efektif tohum maliyeti çarpanı (1 = taban maliyet). Bozuk tepeye karşı güvenli. */
export function labSeedCostMultiplier(peak: Decimal): number {
  if (peak.isNan() || Number.isNaN(peak.mag)) return 1
  const peakLog = peak.log10().toNumber()
  if (!Number.isFinite(peakLog) || peakLog <= LAB_SEED_COST_SOFT_START_LOG) return 1
  const steps = Math.floor((peakLog - LAB_SEED_COST_SOFT_START_LOG) / LAB_SEED_COST_DECADES_PER_STEP)
  if (!Number.isFinite(steps) || steps <= 0) return 1
  return Math.min(LAB_SEED_COST_MAX_MULT, Math.pow(LAB_SEED_COST_STEP_MULT, steps))
}

/** Taban maliyeti tepe-noktaya göre ölçekler; LAB_SEEDS.cost sabitini değiştirmez. */
export function labEffectiveSeedCost(baseCost: Decimal, peak: Decimal): Decimal {
  const mult = labSeedCostMultiplier(peak)
  return mult === 1 ? baseCost : baseCost.times(mult)
}

/** Egzotik hücrenin tarif ebeveynleri (tarifesizse boş dizi). */
export function labExoticParents(seed: LabSeedType): LabSeedType[] {
  const recipe = LAB_RECIPES.find((r) => r.result === seed)
  return recipe ? [recipe.parent1, recipe.parent2] : []
}

/** 3x3 matriste ortogonal (paylaşılan kenar) komşular. */
export function labNeighborCells(cells: LabCell[], idx: number): LabCell[] {
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
export function hasMatureParentSupport(neighbors: LabCell[], parents: readonly LabSeedType[]): boolean {
  if (parents.length === 0) return true
  return neighbors.some((n) => n.isMature && n.seedType !== null && parents.includes(n.seedType))
}
