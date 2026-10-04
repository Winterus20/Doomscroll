<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import { Decimal, D_0 } from '../core/math'
import type { DimensionData } from '../models/types'
import { Play } from 'lucide-vue-next'

const props = defineProps<{
  dimension: DimensionData
}>()

const store = useGameStore()
const cardRef = ref<HTMLElement | null>(null)
let bounceTimer: number | null = null

// P0 Balatro: satın almada kart spring bounce (tek tetik, tick değil)
function bounceCard() {
  if (store.settings.reduceAnimations) return
  const el = cardRef.value
  if (!el) return
  el.classList.remove('buy-bounce')
  void el.offsetWidth
  el.classList.add('buy-bounce')
  if (bounceTimer !== null) clearTimeout(bounceTimer)
  bounceTimer = window.setTimeout(() => el.classList.remove('buy-bounce'), 260)
}

interface FormatMeta {
  tier: number
  shortName: string
  subtitle: string
}

const formatConfigs: Record<number, FormatMeta> = {
  1: {
    tier: 1,
    shortName: 'Kedi Videoları',
    subtitle: 'Gece 02:47 — "Sadece 1 video izleyip uyuyacağım"'
  },
  2: {
    tier: 2,
    shortName: 'Sokak Lezzetleri',
    subtitle: 'Gece 03:15 — Cızırdayan tereyağı ve eriyen kaşar hipnozu'
  },
  3: {
    tier: 3,
    shortName: 'ASMR Sabun',
    subtitle: 'Gece 03:42 — Kusursuz kareler ve mikro rahatlama'
  },
  4: {
    tier: 4,
    shortName: 'Subway Surfers + Reddit',
    subtitle: 'Gece 04:10 — Alt ekranda tren rayları, üstte aile dramı'
  },
  5: {
    tier: 5,
    shortName: 'Sigma Tavsiyeleri',
    subtitle: 'Gece 04:45 — "Günde 2 saat uyu, soğuk duş al ve kripto kovula"'
  },
  6: {
    tier: 6,
    shortName: 'Hint Dizisi (1/12)',
    subtitle: 'Gece 05:15 — 360 derece dramatik şok zoom'
  },
  7: {
    tier: 7,
    shortName: 'Varoluşsal Kriz',
    subtitle: 'Gece 05:40 — Evrenin ısı ölümü ve kozmik hiçlik'
  },
  8: {
    tier: 8,
    shortName: 'Beyin Çürümesi',
    subtitle: 'Gece 06:05 — Skibidi tekilliği ve dopamin çöküşü'
  }
}

const tierConfig = computed<FormatMeta>(() => {
  return (
    formatConfigs[props.dimension.tier] || {
      tier: props.dimension.tier,
      shortName: `${props.dimension.tier}. Format`,
      subtitle: 'Gece Akışı'
    }
  )
})

const formatDiscoverGlow = computed(
  () =>
    store.formatUnlockBuffActive &&
    store.formatUnlockBuffTier === props.dimension.tier
)

const comboRowGlow = computed(() => store.isComboActive)

const milestoneInfo = computed(() => store.getDimensionMilestone(props.dimension.tier))
const partnerInfo = computed(() => store.getPartnerInfo(props.dimension.tier))
const cost = computed(() => store.getDimensionCost(props.dimension.tier))
const multiplier = computed(() => store.getDimensionMultiplier(props.dimension.tier))
// Manuel alım ad bazlı maks: buton, tıklanıldığında alınacak adetlerin TOPLAM fiyatını gösterir
const preview = computed(() => store.previewDimensionBuy(props.dimension.tier))
const displayCost = computed(() => (preview.value ? preview.value.cost : cost.value.div(10)))
const canAfford = computed(() => preview.value !== null)

// Paket bölmeleri: mevcut 10'luk kovada kaçıncı adetteyiz (0 - 9 arası)
const packProgress = computed(() => props.dimension.bought % 10)

// Alınabilir adet miktarı (preview'dan)
const affordableUnits = computed(() => (preview.value ? preview.value.units : 0))

// Bu alımla 10'luk paket içinde kaçıncı seviyeye ulaşılacak (0 - 10 arası)
const previewProgress = computed(() => {
  if (!canAfford.value || affordableUnits.value <= 0) return packProgress.value
  return Math.min(10, packProgress.value + affordableUnits.value)
})

// Önizleme doluluk yüzdesi (0 - 100%)
const previewFillPct = computed(() => (previewProgress.value / 10) * 100)

// Mevcut doluluk yüzdesi (0 - 100%)
const currentFillPct = computed(() => (packProgress.value / 10) * 100)

// 10'luk paket bu alımla tamamlanıyor mu?
const completesPack = computed(() => packProgress.value + affordableUnits.value >= 10)

const flowRate = computed(() => {
  if (props.dimension.tier === 1) {
    return { suffix: '/s', value: store.matterPerSecond, hint: 'Toplam pasif Dopamin akışı' }
  }
  return {
    suffix: `/s →D${props.dimension.tier - 1}`,
    value: store.getDimensionChainFeedPerSecond(props.dimension.tier),
    hint: 'Alt formata saniyelik besleme — artınca zincir hızlanır'
  }
})

const flowRateFormatted = computed(() => format(flowRate.value.value, 2, store.settings.notation))
const showFlowRate = computed(() => flowRate.value.value.gt(0))

// P1 Balatro: tier kimlik şeridi — her formatın kendi rengine ait sol bar
const TIER_ACCENTS: Record<number, string> = {
  1: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]',
  2: 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]',
  3: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]',
  4: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]',
  5: 'bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.8)]',
  6: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
  7: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
  8: 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]'
}

const tierAccent = computed(() => TIER_ACCENTS[props.dimension.tier] || 'bg-purple-500')

const TIER_TEXT_COLORS: Record<number, string> = {
  1: 'text-purple-400',
  2: 'text-orange-400',
  3: 'text-cyan-400',
  4: 'text-blue-400',
  5: 'text-pink-400',
  6: 'text-amber-400',
  7: 'text-rose-400',
  8: 'text-slate-100'
}
const tierTextColor = computed(() => TIER_TEXT_COLORS[props.dimension.tier] || 'text-purple-400')

const milestoneEdition = computed(() => {
  const m = milestoneInfo.value.current
  if (!m) return null
  if (m.count >= 500) return 'edition-tag-poly'
  if (m.count >= 100) return 'edition-tag-holo'
  if (m.count >= 50) return 'edition-tag-foil'
  return null
})

const rowEditionClass = computed(() => {
  if (!(store.settings.holoCardsEnabled ?? true)) return ''
  if (props.dimension.tier === 8 && props.dimension.bought >= 10) return 'edition-poly'
  if (props.dimension.bought >= 500) return 'edition-poly'
  if (props.dimension.bought >= 100) return 'edition-holo'
  if (props.dimension.bought >= 50) return 'edition-foil'
  return ''
})

function getClickCoordinates(e?: MouseEvent): { x: number; y: number } {
  if (e && (e.clientX || e.clientY)) {
    return { x: e.clientX, y: e.clientY }
  }
  const target = e?.currentTarget as HTMLElement | null
  if (target) {
    const rect = target.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

// QoL: e opsiyonel — basılı tut tekrarında koordinat olmadan da çağrılabilir
function purchaseFloaterText(mpsBefore: Decimal, flowBefore: Decimal): string {
  if (props.dimension.tier === 1) {
    const dpsDelta = store.matterPerSecond.minus(mpsBefore)
    if (dpsDelta.gt(0)) {
      return `+${format(dpsDelta, 2, store.settings.notation)}/s`
    }
    return '↑ Hız'
  }
  const flowDelta = store.getDimensionChainFeedPerSecond(props.dimension.tier).minus(flowBefore)
  if (flowDelta.gt(0)) {
    return `+${format(flowDelta, 2, store.settings.notation)}/s →D${props.dimension.tier - 1}`
  }
  return '↑ Akış'
}

function buy(e?: MouseEvent) {
  const coords = getClickCoordinates(e)
  const mpsBefore = props.dimension.tier === 1 ? store.matterPerSecond : D_0
  const flowBefore = props.dimension.tier === 1 ? D_0 : store.getDimensionChainFeedPerSecond(props.dimension.tier)
  const success = store.buyDimensionUnits(props.dimension.tier)
  if (success) {
    bounceCard()
    window.dispatchEvent(
      new CustomEvent('doomscroll:tap', {
        detail: {
          x: coords.x,
          y: coords.y,
          text: purchaseFloaterText(mpsBefore, flowBefore)
        }
      })
    )
  }
}
</script>

<template>
  <div
    ref="cardRef"
    v-tilt="{ max: 6, scale: 1.01, disabled: !(store.settings.holoCardsEnabled ?? true) }"
    class="card-tilt-surface tilt-card glass-panel-card relative pl-4 pr-3 py-2 rounded-xl flex items-center justify-between gap-2.5 sm:gap-3 border border-white/[0.06] hover:border-white/[0.14] transition-colors overflow-hidden"
    :class="[
      rowEditionClass,
      formatDiscoverGlow ? 'ring-2 ring-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.25)]' : '',
      comboRowGlow ? 'ring-1 ring-amber-400/40' : ''
    ]"
  >
    <!-- Tier kimlik şeridi -->
    <span class="absolute left-0 top-0 bottom-0 w-1 shrink-0" :class="tierAccent"></span>
    <!-- Sol: Tier + 9:16 Video Posteri + Başlık + Altyazı -->
    <div class="flex items-center gap-2.5 min-w-0 flex-1">
      <!-- 9:16 Mikro Video Posteri -->
      <div
        class="w-6 h-8 sm:w-7 sm:h-9 rounded-md bg-black/60 border border-white/[0.08] flex flex-col items-center justify-center relative overflow-hidden shrink-0 select-none shadow-xs"
        v-tip="`${tierConfig.shortName}: ${tierConfig.subtitle}`"
      >
        <Play class="w-3 h-3 fill-current opacity-85" :class="tierTextColor" />
        <!-- Mini alt oynatma çubuğu (progress line) -->
        <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div
            class="h-full transition-all duration-200"
            :class="tierAccent"
            :style="{ width: `${(packProgress / 10) * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- Başlık ve Gizli Subtitle Bilgi Kümesi -->
      <div class="flex flex-col min-w-0 flex-1">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs font-mono font-bold text-purple-400 shrink-0">D{{ props.dimension.tier }}</span>
          <span
            class="text-xs font-semibold text-slate-200 truncate max-w-[110px] sm:max-w-[160px] md:max-w-none select-none"
          >
            {{ tierConfig.shortName }}
          </span>
          <!-- Mobilde sahip olunan adet -->
          <span class="sm:hidden text-[10px] font-mono tabular-nums text-slate-400 shrink-0">×{{ props.dimension.bought }}</span>

          <!-- Video Çözünürlük Rozeti (Yalnızca kazanılmışsa) -->
          <span
            v-if="milestoneInfo.current"
            class="edition-tag shrink-0 cursor-help select-none"
            :class="[milestoneEdition || milestoneInfo.current.colorClass]"
            v-tip="`${milestoneInfo.current.name}: ${milestoneInfo.current.desc}${milestoneInfo.next ? ` (Sıradaki: ${milestoneInfo.next.name} — ${milestoneInfo.next.count} adette)` : ''}`"
          >
            {{ milestoneInfo.current.shortName }}
          </span>

          <!-- Toplam Çarpan -->
          <span
            class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 tabular-nums shrink-0 cursor-help select-none"
            v-tip="`D${props.dimension.tier} Çarpanı: Toplam ×${format(multiplier, 2, store.settings.notation)} kat üretim`"
          >
            ×{{ format(multiplier, 2, store.settings.notation) }}
          </span>

          <!-- Algoritmik Ayna Sinerjisi (yalnızca partner alındıysa ve çarpan > 1 ise) -->
          <span
            v-if="partnerInfo.partnerBought > 0 && partnerInfo.mult > 1"
            class="hidden lg:inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 tabular-nums shrink-0 cursor-help select-none"
            v-tip="`Ayna Sinerjisi: ${partnerInfo.label} (${partnerInfo.partnerBought} adet) bu formata ×${partnerInfo.mult.toFixed(2)} çarpan sağlıyor`"
          >
            <span class="text-cyan-400">🔗</span>
            <span>D{{ partnerInfo.partnerTier }}: ×{{ partnerInfo.mult.toFixed(2) }}</span>
          </span>
        </div>

        <!-- Tek satır altyazı: gece saati ve ironik alıntı (Reels kimliği) -->
        <span class="text-[10px] text-slate-400/70 truncate max-w-[140px] sm:max-w-[260px] md:max-w-[360px] leading-tight select-none mt-0.5">
          {{ tierConfig.subtitle }}
        </span>
      </div>
    </div>

    <!-- Orta: Sahip Olunan Miktar + anlık akış hızı -->
    <div class="hidden sm:flex flex-col items-end gap-0.5 text-xs font-mono tabular-nums shrink-0 min-w-[72px]">
      <div class="flex items-center gap-1.5 text-slate-400">
        <span class="text-slate-200 font-semibold">{{ format(props.dimension.amount, 2, store.settings.notation) }}</span>
        <span class="text-slate-500 text-[11px]">({{ props.dimension.bought }})</span>
      </div>
      <span
        v-if="showFlowRate"
        class="text-[10px] font-semibold text-emerald-300/90"
        v-tip="flowRate.hint"
      >
        +{{ flowRateFormatted }}{{ flowRate.suffix }}
      </span>
    </div>

    <!-- Sağ: Satın Alma Butonu (Linear zemin dolgusu + adet) -->
    <div class="flex items-center gap-2 shrink-0">
      <button
        @click="buy($event)"
        v-hold="buy"
        :disabled="!canAfford"
        class="btn-tactile hit-44 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-2 border shrink-0 relative overflow-hidden"
        :class="canAfford
          ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border-purple-500/40 cursor-pointer shadow-xs affordance-pulse btn-sheen'
          : 'bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed opacity-40'"
        v-tip="canAfford ? `+${affordableUnits} adet için ${format(displayCost, 2, store.settings.notation)} (bu alımla ${packProgress + affordableUnits} adet olur)` : 'Yetersiz Dopamin'"
      >
        <!-- 1. Katman: Satın Alım Önizleme Dolgusu (Bu tıkla nereye kadar dolacağını gösterir) -->
        <span
          v-if="canAfford && affordableUnits > 0"
          class="absolute left-0 top-0 bottom-0 bg-purple-400/25 border-r border-purple-300/40 transition-all duration-200 pointer-events-none"
          :class="{ 'animate-pulse bg-purple-400/40': completesPack }"
          :style="{ width: `${previewFillPct}%` }"
        ></span>

        <!-- 2. Katman: Mevcut Satın Alınmış Doluluk -->
        <span
          class="absolute left-0 top-0 bottom-0 bg-purple-500/45 transition-all duration-150 pointer-events-none"
          :style="{ width: `${currentFillPct}%` }"
        ></span>

        <!-- Fiyat -->
        <span class="tabular-nums font-semibold relative z-10">{{ format(displayCost, 2, store.settings.notation) }}</span>

        <!-- Adet & Önizleme Göstergesi: Örn: 2/10 (+5) -->
        <div class="flex items-center gap-0.5 text-[10px] font-mono relative z-10 tabular-nums">
          <span :class="canAfford ? 'text-purple-300/80' : 'text-slate-500'">{{ packProgress }}/10</span>
          <span v-if="canAfford && affordableUnits > 0" class="text-emerald-300 font-bold">
            (+{{ affordableUnits }})
          </span>
        </div>
      </button>
    </div>
  </div>
</template>
