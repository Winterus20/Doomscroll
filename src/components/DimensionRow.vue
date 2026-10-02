<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import type { DimensionData } from '../models/types'

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

const milestoneInfo = computed(() => store.getDimensionMilestone(props.dimension.tier))
const partnerInfo = computed(() => store.getPartnerInfo(props.dimension.tier))
const cost = computed(() => store.getDimensionCost(props.dimension.tier))
const multiplier = computed(() => store.getDimensionMultiplier(props.dimension.tier))
// QoL: satın alma modu x100'de geometrik toplam maliyeti gösterilir
const displayCost = computed(() =>
  store.buyAmount === 'max' ? cost.value : store.getDimensionPackCost(props.dimension.tier, store.buyAmount / 10)
)
const canAfford = computed(() => store.matter.gte(displayCost.value))
// Maks tek paket fiyatına bakmalıdır: ×100 modunda 10 pakete güç yetmese bile
// tek paket alınabilirken butonun kilitli görünmesi hataydı.
const canAffordSingle = computed(() => store.matter.gte(cost.value))
const buyLabel = computed(() => (store.buyAmount === 'max' ? 'Maks' : `×${store.buyAmount}:`))

const progressCount = computed(() => {
  if (props.dimension.bought % 10 !== 0) {
    return props.dimension.bought % 10
  }
  return Math.floor(props.dimension.bought / 10) % 10
})

const progressPercent = computed(() => {
  return (progressCount.value / 10) * 100
})

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
function buy(e?: MouseEvent) {
  const coords = getClickCoordinates(e)
  const success = store.buyDimensionByMode(props.dimension.tier)
  if (success) {
    bounceCard()
    window.dispatchEvent(
      new CustomEvent('doomscroll:tap', {
        detail: {
          x: coords.x,
          y: coords.y,
          text: '+Dopamin'
        }
      })
    )
  }
}

function buyMax(e?: MouseEvent) {
  const coords = getClickCoordinates(e)
  const success = store.buyMaxDimension(props.dimension.tier)
  if (success) {
    bounceCard()
    window.dispatchEvent(
      new CustomEvent('doomscroll:tap', {
        detail: {
          x: coords.x,
          y: coords.y,
          text: 'Maks!'
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
    :class="rowEditionClass"
    v-tip="tierConfig.subtitle"
  >
    <!-- Tier kimlik şeridi -->
    <span class="absolute left-0 top-0 bottom-0 w-1 shrink-0" :class="tierAccent"></span>
    <!-- Sol: Tier + Kısa İsim + Çözünürlük Rozeti + Çarpan -->
    <div class="flex items-center gap-2 min-w-0">
      <span class="text-xs font-mono font-bold text-purple-400 shrink-0">D{{ props.dimension.tier }}</span>
      <span class="text-xs font-medium text-slate-200 truncate max-w-[90px] sm:max-w-[140px] md:max-w-none">{{ tierConfig.shortName }}</span>
      <!-- Mobilde sahip olunan adet (milestone eşikleri bought üzerinden) -->
      <span class="sm:hidden text-[10px] font-mono tabular-nums text-slate-400 shrink-0">×{{ props.dimension.bought }}</span>

      <!-- Video Çözünürlük Rozeti (Milestone — Balatro holo rozet) -->
      <span
        v-if="milestoneInfo.current"
        class="edition-tag shrink-0"
        :class="[milestoneEdition || milestoneInfo.current.colorClass]"
        v-tip="`${milestoneInfo.current.name}: ${milestoneInfo.current.desc}`"
      >
        {{ milestoneInfo.current.shortName }}
      </span>
      <span
        v-else
        class="text-[9px] font-mono text-slate-500 px-1.5 py-0.2 rounded bg-white/[0.02] border border-white/[0.04] shrink-0"
        v-tip="'25 adette 360p kalitesi açılır'"
      >
        144p
      </span>

      <!-- Toplam Çarpan -->
      <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 tabular-nums shrink-0">
        ×{{ format(multiplier, 2, store.settings.notation) }}
      </span>

      <!-- Algoritmik Ayna Sinerjisi (Partner Yakıtı) -->
      <span
        v-if="partnerInfo.partnerBought > 0"
        class="hidden md:inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 tabular-nums shrink-0 cursor-help"
        v-tip="`Ayna Sinerjisi: ${partnerInfo.label} (${partnerInfo.partnerBought} adet) bu formata ×${partnerInfo.mult.toFixed(2)} çarpan sağlıyor! Bu formatı satın aldıkça da ${partnerInfo.label} beslenir.`"
      >
        <span class="text-cyan-400">🔗</span>
        <span>D{{ partnerInfo.partnerTier }}:</span>
        <span class="font-bold">×{{ partnerInfo.mult.toFixed(2) }}</span>
      </span>
    </div>

    <!-- Orta: Sahip Olunan Miktar -->
    <div class="hidden sm:flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-400 shrink-0">
      <span class="text-slate-200 font-semibold">{{ format(props.dimension.amount, 2, store.settings.notation) }}</span>
      <span class="text-slate-500 text-[11px]">({{ props.dimension.bought }})</span>
    </div>

    <!-- Sağ: Kalite & 10x İlerleme Barı + Satın Alma Butonları -->
    <div class="flex items-center gap-2 shrink-0">
      <!-- Sıradaki Kalite İlerleme Barı (25, 50, 100...) -->
      <div
        v-if="milestoneInfo.next"
        class="w-14 hidden lg:flex flex-col gap-0.5"
        v-tip="`Sıradaki Kalite: ${milestoneInfo.next.name} (${milestoneInfo.next.desc}) — ${props.dimension.bought}/${milestoneInfo.next.count}`"
      >
        <div class="progress-track progress-track-mini">
          <div
            class="progress-fill progress-fill-cyan"
            :style="{ width: `${milestoneInfo.progress}%` }"
          ></div>
        </div>
        <div class="text-[8px] font-mono text-slate-500 text-center leading-none">
          {{ props.dimension.bought }}/{{ milestoneInfo.next.count }}
        </div>
      </div>

      <!-- 10x Mini İlerleme Pili (3/10) -->
      <div
        class="w-8 hidden md:flex flex-col gap-0.5"
        v-tip="`Sonraki 2× Çarpan: ${progressCount}/10`"
      >
        <div class="progress-track progress-track-mini">
          <div
            class="progress-fill progress-fill-purple"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
      </div>

      <!-- QoL: mod-duyarlı satın alma (x10 paket / x100 / Maks) + basılı tut tekrarı -->
      <button
        @click="buy($event)"
        v-hold="buy"
        :disabled="!canAfford"
        class="btn-tactile hit-44 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1 border shrink-0"
        :class="canAfford
          ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border-purple-500/40 cursor-pointer shadow-xs affordance-pulse btn-sheen'
          : 'bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed opacity-40'"
      >
        <span>{{ buyLabel }}</span>
        <span v-if="store.buyAmount !== 'max'" class="tabular-nums font-semibold">{{ format(displayCost, 2, store.settings.notation) }}</span>
      </button>

      <!-- Maks (x10/x100 modlarında ayrıca görünür; tek paket fiyatı baz alınır) -->
      <button
        v-if="store.buyAmount !== 'max'"
        @click="buyMax($event)"
        v-hold="buyMax"
        :disabled="!canAffordSingle"
        class="btn-tactile hit-44 px-2 py-1.5 rounded-lg text-xs font-mono transition-all border shrink-0"
        :class="canAffordSingle
          ? 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border-white/10 cursor-pointer'
          : 'bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed opacity-40'"
        v-tip="'Paran yettiği kadar paket al'"
      >
        Maks
      </button>
    </div>
  </div>
</template>
