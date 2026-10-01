<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import { D_0 } from '../core/math'
import DimensionRow from './DimensionRow.vue'
import {
  Sun,
  Sunrise,
  Sparkles,
  Radio,
  EyeOff,
  AlertCircle
} from 'lucide-vue-next'

const store = useGameStore()

const visibleDimensions = computed(() => {
  return store.dimensions.slice(0, store.unlockedDimensionsCount)
})

const shiftReq = computed(() => store.shiftRequirement)
const isShiftUnlock = computed(() => store.dimensionShifts < 4)

const currentShiftDimAmount = computed(() => {
  const dim = store.dimensions[shiftReq.value.tier - 1]
  return dim ? dim.amount : D_0
})

const shiftProgressPercent = computed(() => {
  if (shiftReq.value.amount <= 0) return 0
  const ratio = currentShiftDimAmount.value.div(shiftReq.value.amount).toNumber()
  return Math.min(100, Math.max(0, ratio * 100))
})

const galaxyReq = computed(() => store.galaxyRequirement)
const currentGalaxyDimAmount = computed(() => {
  const dim8 = store.dimensions[7]
  return dim8 ? dim8.amount : D_0
})

const galaxyProgressPercent = computed(() => {
  if (galaxyReq.value <= 0) return 0
  const ratio = currentGalaxyDimAmount.value.div(galaxyReq.value).toNumber()
  return Math.min(100, Math.max(0, ratio * 100))
})

const singularityProgress = computed(() => {
  if (store.matter.lt(10)) return 0
  const logVal = store.matter.log10().toNumber()
  return Math.min(100, Math.max(0, (logVal / 308.25) * 100))
})

function triggerShift(e: MouseEvent) {
  if (!store.canShift) return
  const target = e.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: isShiftUnlock.value ? 'Yeni Format!' : '2× Boost!'
      }
    })
  )
  store.dimensionShift()
}

function triggerGalaxy(e: MouseEvent) {
  if (!store.canBuyGalaxy) return
  const target = e.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: 'Küme Kuruldu!'
      }
    })
  )
  store.buyGalaxy()
}

function triggerSingularity(e: MouseEvent) {
  if (!store.canSingularity) return
  window.dispatchEvent(new CustomEvent('doomscroll:shake'))

  const target = e.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: 'GÜNEŞ DOĞDU!'
      }
    })
  )
  store.singularityReset()
}

function handleSlackerClick(e: MouseEvent, id: string) {
  window.dispatchEvent(new CustomEvent('doomscroll:shake'))

  let x = e.clientX
  let y = e.clientY
  if (!x && !y) {
    const target = e.currentTarget as HTMLElement | null
    const rect = target?.getBoundingClientRect()
    x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
  }

  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: 'Sustur!'
      }
    })
  )
  store.clickSlacker(id)
}
</script>

<template>
  <div class="space-y-3">
    <!-- 1. Şafak İlerleme Çubuğu (Kompakt Tek Satır) -->
    <div
      class="glass-panel-card px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 border border-white/[0.06]"
      title="Hedef: 1.79e308 Dopamin ile Sabah 06:00 Tekilliği"
    >
      <div class="flex items-center gap-2 text-xs font-mono text-slate-300 shrink-0">
        <Sun class="w-3.5 h-3.5 text-amber-400" />
        <span class="font-medium">Şafak (06:00):</span>
      </div>

      <div class="progress-track progress-track-sm max-w-md progress-track-bordered">
        <div
          class="progress-fill progress-fill-dawn"
          :style="{ width: `${singularityProgress}%` }"
        ></div>
      </div>

      <span class="text-xs font-mono font-bold text-amber-300 tabular-nums shrink-0">
        {{ singularityProgress.toFixed(2) }}%
      </span>
    </div>

    <!-- 2. Sabah 06:00 Tekillik Çöküşü Hazır Uyarısı -->
    <div
      v-if="store.canSingularity"
      class="p-4 rounded-xl bg-amber-500/[0.08] border border-amber-500/40 flex items-center justify-between gap-3"
    >
      <div class="flex items-center gap-2.5">
        <Sunrise class="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <div class="text-xs font-bold text-white uppercase tracking-wider font-mono">Güneş Doğdu!</div>
          <div class="text-xs font-mono text-amber-300 tabular-nums">
            +{{ format(store.singularityGain, 0, store.settings.notation) }} Uykusuzluk Puanı (SP)
          </div>
        </div>
      </div>

      <button
        @click="triggerSingularity($event)"
        class="btn-tactile px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs uppercase cursor-pointer shrink-0"
      >
        Tekillik Sıfırla
      </button>
    </div>

    <!-- 3. Vicdan Azapları (Kompakt Chips) -->
    <div
      v-if="store.slackers.length > 0"
      class="glass-panel-card p-3 rounded-xl border border-rose-900/40 bg-rose-950/10 space-y-2"
    >
      <div class="flex items-center justify-between text-xs font-mono text-rose-300">
        <div class="flex items-center gap-1.5">
          <AlertCircle class="w-3.5 h-3.5 text-rose-400" />
          <span>Vicdan Azabı (-{{ (store.slackerLeechPercent * 100).toFixed(0) }}%)</span>
        </div>
        <span class="text-[11px] text-slate-500">3 tıkla %120 iade</span>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="slacker in store.slackers"
          :key="slacker.id"
          @click="handleSlackerClick($event, slacker.id)"
          class="btn-tactile px-3 py-1.5 rounded-lg border border-rose-800/40 bg-rose-950/20 hover:border-rose-500/60 cursor-pointer flex items-center gap-2 text-xs font-mono text-slate-200"
          title="Tıklayarak sustur"
        >
          <EyeOff class="w-3 h-3 text-rose-400" />
          <span>{{ slacker.name }}</span>
          <span class="text-rose-400 tabular-nums">({{ format(slacker.leechedLikes, 1, store.settings.notation) }})</span>
          <span class="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
            {{ slacker.clicksRemaining }}
          </span>
        </button>
      </div>
    </div>

    <!-- 4. Format Listesi (D1-D8 Kompakt Satırlar) -->
    <div class="space-y-1.5">
      <DimensionRow
        v-for="dim in visibleDimensions"
        :key="dim.tier"
        :dimension="dim"
      />
    </div>

    <!-- 5. Bento Kartlar: Sıçrama ve Kümeler (Kompakt ve Net) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
      <!-- Akış Sıçraması (Shift) -->
      <div
        class="glass-panel-card p-3 rounded-xl flex items-center justify-between gap-3 border border-white/[0.06]"
        :title="isShiftUnlock ? 'Yeni format açar ve tüm üretimi 2× katlar' : 'Tüm üretimi kalıcı 2× katlar'"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] text-purple-400 flex items-center justify-center shrink-0">
            <Sparkles class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-xs text-slate-200">Akış Sıçraması</span>
              <span class="text-[10px] font-mono text-purple-400">Sv: {{ store.dimensionShifts }}</span>
            </div>
            <div class="text-[11px] font-mono text-slate-400 tabular-nums">
              {{ format(currentShiftDimAmount, 0, store.settings.notation) }} / {{ shiftReq.amount }} D{{ shiftReq.tier }}
            </div>
            <div class="progress-track progress-track-mini w-24 mt-1">
              <div class="progress-fill progress-fill-purple" :style="{ width: `${shiftProgressPercent}%` }"></div>
            </div>
          </div>
        </div>

        <button
          @click="triggerShift($event)"
          :disabled="!store.canShift"
          class="btn-tactile px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border shrink-0"
          :class="store.canShift
            ? 'bg-purple-600/25 hover:bg-purple-600/35 text-purple-200 border-purple-500/40 cursor-pointer'
            : 'bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed opacity-40'"
        >
          {{ isShiftUnlock ? 'Format Aç' : '2× Boost' }}
        </button>
      </div>

      <!-- Sonsuz Akış Kümeleri (Galaxies) -->
      <div
        class="glass-panel-card p-3 rounded-xl flex items-center justify-between gap-3 border border-white/[0.06]"
        title="Tüm içerikleri sıfırlar; Frekans (Hz) çarpan gücünü katlar"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] text-amber-400 flex items-center justify-center shrink-0">
            <Radio class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-xs text-slate-200">Akış Kümesi</span>
              <span class="text-[10px] font-mono text-amber-400">Adet: {{ store.galaxies }}</span>
            </div>
            <div class="text-[11px] font-mono text-slate-400 tabular-nums">
              {{ format(currentGalaxyDimAmount, 0, store.settings.notation) }} / {{ galaxyReq }} D8
            </div>
            <div class="progress-track progress-track-mini w-24 mt-1">
              <div class="progress-fill progress-fill-amber" :style="{ width: `${galaxyProgressPercent}%` }"></div>
            </div>
          </div>
        </div>

        <button
          @click="triggerGalaxy($event)"
          :disabled="!store.canBuyGalaxy"
          class="btn-tactile px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border shrink-0"
          :class="store.canBuyGalaxy
            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40 cursor-pointer'
            : 'bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed opacity-40'"
        >
          Küme Kur
        </button>
      </div>
    </div>
  </div>
</template>
