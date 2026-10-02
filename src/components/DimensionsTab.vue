<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore, ALGORITHM_UPGRADES } from '../stores/game'
import { format } from '../core/format'
import { D_0 } from '../core/math'
import type { AlgorithmUpgradeId } from '../models/types'
import DimensionRow from './DimensionRow.vue'
import ConfirmModal from './ConfirmModal.vue'
import {
  Sun,
  Sunrise,
  Sparkles,
  Radio,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Trash2,
  Cpu,
  CheckCircle2,
  Layers,
  TrendingUp
} from 'lucide-vue-next'

const store = useGameStore()
const collectiveInfo = computed(() => store.collectiveMilestoneInfo)

const visibleDimensions = computed(() => {
  return store.dimensions.slice(0, store.unlockedDimensionsCount)
})

const shiftReq = computed(() => store.shiftRequirement)
const isShiftUnlock = computed(() => store.dimensionShifts < 4)

// Özellik Merdiveni kademeleri (Akışı Yenile: 10M Dopamin · Yama Dükkanı: 100K Dopamin)
const refreshFeedUnlocked = computed(() => store.isFeatureUnlocked('refresh_feed'))
const patchShopUnlocked = computed(() => store.isFeatureUnlocked('patch_shop'))

const currentShiftDimAmount = computed(() => {
  const dim = store.dimensions[shiftReq.value.tier - 1]
  return dim ? dim.amount : D_0
})

const shiftProgressPercent = computed(() => {
  if (shiftReq.value.amount.lte(0)) return 0
  const ratio = currentShiftDimAmount.value.div(shiftReq.value.amount).toNumber()
  return Math.min(100, Math.max(0, ratio * 100))
})

const galaxyReq = computed(() => store.galaxyRequirement)
const galaxyTier = computed(() => store.galaxyRequirementTier)
const currentGalaxyDimAmount = computed(() => {
  const dim = store.dimensions[galaxyTier.value - 1]
  return dim ? dim.amount : D_0
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

// Önbellek Temizleme (Sacrifice) açık mı?
const isSacrificeUnlocked = computed(() => {
  return store.dimensionShifts >= 5 || (store.dimensions[7] && store.dimensions[7].amount.gt(0))
})

function triggerRefresh(e: MouseEvent) {
  if (!store.canRefresh) return
  const target = e.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: '3× Trend Dalgası!',
        color: '#67e8f9'
      }
    })
  )
  store.pullToRefresh()
}

function triggerSacrifice(e: MouseEvent) {
  if (!store.canSacrifice) return
  // QoL: geri dönüşsüz aksiyon — onay diyaloğu (ayarlardan kapatılabilir)
  if (store.settings.confirmDialogs) {
    showSacrificeConfirm.value = true
    return
  }
  doSacrifice(e)
}

function doSacrifice(e?: MouseEvent) {
  if (!store.canSacrifice) return
  window.dispatchEvent(new CustomEvent('doomscroll:shake'))

  const target = e?.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: 'Önbellek Temizlendi!',
        color: '#fda4af'
      }
    })
  )
  store.sacrificeDimensions()
}

function buyUpgrade(e: MouseEvent, id: AlgorithmUpgradeId) {
  const target = e.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

  const success = store.buyAlgorithmUpgrade(id)
  if (success) {
    window.dispatchEvent(
      new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: 'Yama Yüklendi!',
        color: '#67e8f9'
      }
      })
    )
  }
}

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
        text: isShiftUnlock.value ? 'Yeni Format!' : `×${format(store.singleShiftPower, 1, store.settings.notation)} Boost!`,
        color: '#d8b4fe',
        big: true
      }
    })
  )
  window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'soft' } }))
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
        text: 'Küme Kuruldu!',
        color: '#fcd34d',
        big: true
      }
    })
  )
  window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'soft' } }))
  store.buyGalaxy()
}

function triggerSingularity(e: MouseEvent) {
  if (!store.canSingularity) return
  // QoL: onaysız tetiklenen buton artık onay diyaloğuna bağlı
  if (store.settings.confirmDialogs) {
    showSingularityConfirm.value = true
    return
  }
  doSingularity(e)
}

function doSingularity(e?: MouseEvent) {
  if (!store.canSingularity) return
  window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'hard' } }))

  const target = e?.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: 'GÜNEŞ DOĞDU!',
        color: '#fbbf24',
        big: true
      }
    })
  )
  store.singularityReset()
}

// QoL: onay diyaloğu görünürlükleri
const showSingularityConfirm = ref(false)
const showSacrificeConfirm = ref(false)

// QoL: satın alma modu seçenekleri (1 paket = 10 adet üzerinden)
const BUY_MODES: Array<{ value: 10 | 100 | 'max'; label: string; tip: string }> = [
  { value: 10, label: '×10', tip: '×10: 10 adet al (1 paket — en küçük alım)' },
  { value: 100, label: '×100', tip: '×100: 100 adet al (10 paket birden)' },
  { value: 'max', label: 'Maks', tip: 'Maks: paran yettiği kadar paket al' }
]

// Kolektif Trend erken oyunda korkutucu olmasın: ilk eşik (25) uzaktayken
// darboğaz rozeti + bar gizlenir, tek satır hedef gösterilir.
const isCollectiveEarly = computed(() => store.collectiveMinBought < 10)

// Akış Kümesi kartı D8 çağında anlamlıdır: ilk sıçrama öncesi ve D5 kapalıysa
// ölü kart yerine tek satır hedef gösterilir.
const showGalaxyCard = computed(
  () => store.dimensionShifts >= 1 || store.galaxies > 0 || store.unlockedDimensionsCount >= 5
)

function handleSlackerClick(e: MouseEvent, id: string) {
  window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'soft' } }))

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
        text: 'Sustur!',
        color: '#fda4af'
      }
    })
  )
  store.clickSlacker(id)
}
</script>

<template>
  <div class="space-y-3">
    <!-- 1. Şafak İlerleme Çubuğu & Akışı Yenile Taktil Butonu -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <!-- Şafak İlerleme Çubuğu -->
      <div
        class="glass-panel-card px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 border border-white/[0.06] flex-1"
        v-tip="'Hedef: 1.79e308 Dopamin ile Sabah 06:00 Tekilliği'"
      >
        <div class="flex items-center gap-2 text-xs font-mono text-slate-300 shrink-0">
          <Sun class="w-3.5 h-3.5 text-amber-400" />
          <span class="font-medium">Şafak (06:00):</span>
        </div>

        <div class="progress-track progress-track-sm max-w-md progress-track-bordered flex-1">
          <div
            class="progress-fill progress-fill-dawn"
            :style="{ width: `${singularityProgress}%` }"
          ></div>
        </div>

        <span class="text-xs font-mono font-bold text-amber-300 tabular-nums shrink-0">
          {{ singularityProgress.toFixed(2) }}%
        </span>
      </div>

      <!-- Akışı Yenile (Pull to Refresh) Taktil Butonu (1.000 Dopamin ile açılır) -->
      <button
        v-if="refreshFeedUnlocked"
        @click="triggerRefresh($event)"
        :disabled="!store.canRefresh"
        class="btn-tactile px-3.5 py-2 rounded-xl flex items-center justify-center gap-2 border font-mono text-xs font-semibold transition-all shrink-0 cursor-pointer"
        :class="store.isRefreshActive
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm animate-pulse'
          : store.canRefresh
            ? 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border-cyan-500/40 cursor-pointer'
            : 'bg-black/30 text-slate-500 border-white/[0.04] cursor-not-allowed opacity-50'"
        v-tip="store.isRefreshActive ? 'Trend Dalgası Aktif: Tüm üretim 3× hızlandı!' : 'Yeni trend dalgası başlatır: 12 sn 3× üretim (60 sn bekleme)'"
      >
        <RefreshCw class="w-3.5 h-3.5 shrink-0" :class="{ 'animate-spin': store.isRefreshActive }" />
        <span v-if="store.isRefreshActive" class="tabular-nums">3× Trend ({{ Math.ceil(store.refreshActiveTime) }}s)</span>
        <span v-else-if="store.canRefresh">Akışı Yenile!</span>
        <span v-else class="tabular-nums">Yenile ({{ Math.ceil(store.refreshCooldown) }}s)</span>
      </button>
    </div>

    <!-- 1.5. Kolektif Trend Eşiği (En Zayıf Halka - All-Format Milestones) -->
    <div
      class="glass-panel-card p-3 rounded-xl border border-indigo-500/20 bg-indigo-950/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
      v-tip="'Tüm açık formatlar belirli bir seviyeye ulaştığında evrensel üretim katlanır!'"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
          <Layers class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-xs text-indigo-200">Kolektif Trend</span>
            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold tabular-nums">
              ×{{ format(store.collectiveMultiplier, 1, store.settings.notation) }} Aktif
            </span>
          </div>
          <div class="text-[11px] text-slate-400 font-mono mt-0.5">
            <span v-if="collectiveInfo.next">
              Sıradaki: <span class="text-indigo-300 font-semibold">{{ collectiveInfo.next.minBought }} Eşiği</span> ({{ collectiveInfo.next.desc }})
            </span>
            <span v-else class="text-emerald-400 font-semibold">Tüm Kolektif Eşikler Aşıldı! (Maksimum Bonus)</span>
          </div>
        </div>
      </div>

      <!-- Sağ: İlerleme Barı + Darboğaz Uyarısı (erken oyunda tek satır hedef) -->
      <div v-if="isCollectiveEarly" class="text-[11px] font-mono text-slate-500 shrink-0">
        Hedef: tüm açık formatları <span class="text-indigo-300 font-semibold">10 adete</span> çıkar → ilk bonus
      </div>
      <div v-else-if="collectiveInfo.next" class="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full md:w-auto shrink-0">
        <div class="flex flex-col gap-1 w-full sm:w-36">
          <div class="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>En Düşük: {{ collectiveInfo.minBought }}</span>
            <span class="text-indigo-300 font-semibold">{{ collectiveInfo.next.minBought }}</span>
          </div>
          <div class="progress-track progress-track-sm progress-track-bordered w-full">
            <div
              class="progress-fill progress-fill-purple"
              :style="{ width: `${collectiveInfo.progress}%` }"
            ></div>
          </div>
        </div>

        <!-- Darboğaz Rozeti (En gerideki format) -->
        <div
          class="px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-mono flex items-center gap-1.5 shrink-0"
          v-tip="`Kolektif bonusu almak için en gerideki formatı yükselt: ${collectiveInfo.bottleneck.name}`"
        >
          <TrendingUp class="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>En Geride: <strong>{{ collectiveInfo.bottleneck.name }}</strong> ({{ collectiveInfo.bottleneck.bought }}/{{ collectiveInfo.next.minBought }})</span>
        </div>
      </div>
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
          v-tip="'Tıklayarak sustur'"
        >
          <EyeOff class="w-3 h-3 text-rose-400" />
          <span>{{ slacker.name }}</span>
          <span class="text-rose-400 tabular-nums">({{ format(slacker.leechedDopamine, 1, store.settings.notation) }})</span>
          <span class="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
            {{ slacker.clicksRemaining }}
          </span>
        </button>
      </div>
    </div>

    <!-- QoL: satın alma modu seçici — tüm format satırları seçili modda alır (Cookie Clicker bulk buy deseni) -->
    <div class="flex items-center gap-1.5">
      <div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-black/40 border border-white/[0.06]">
        <button
          v-for="mode in BUY_MODES"
          :key="mode.value"
          @click="store.setBuyAmount(mode.value)"
          class="btn-tactile px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer border"
          :class="store.buyAmount === mode.value
            ? 'bg-purple-500/25 text-purple-200 border-purple-400/40'
            : 'bg-transparent text-slate-500 hover:text-slate-300 border-transparent'"
          v-tip="mode.tip"
        >
          {{ mode.label }}
        </button>
      </div>
      <span class="text-[10px] font-mono text-slate-500">satın alma modu (1 paket = 10 adet)</span>
    </div>

    <!-- 4. Format Listesi (D1-D8 Kompakt Satırlar) -->
    <div class="space-y-1.5">
      <DimensionRow
        v-for="dim in visibleDimensions"
        :key="dim.tier"
        :dimension="dim"
      />
    </div>

    <!-- 5. Algoritma Yamaları & Taktiksel İyileştirmeler (Cookie Clicker Upgrade Store — 100K Dopamin ile açılır) -->
    <div v-if="patchShopUnlocked" class="glass-panel-card p-3 rounded-xl border border-white/[0.06] space-y-2.5">
      <div class="flex items-center justify-between text-xs font-mono text-slate-300">
        <div class="flex items-center gap-1.5">
          <Cpu class="w-3.5 h-3.5 text-cyan-400" />
          <span class="font-bold text-sm text-slate-100">Algoritma Yamaları</span>
        </div>
        <span class="text-[11px] text-slate-500">
          {{ store.algorithmUpgrades.length }} / {{ ALGORITHM_UPGRADES.length }} Yüklendi
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div
          v-for="upg in ALGORITHM_UPGRADES"
          :key="upg.id"
          class="p-2.5 rounded-lg border flex flex-col justify-between gap-2 transition-all"
          :class="store.hasAlgorithmUpgrade(upg.id)
            ? 'bg-cyan-500/[0.04] border-cyan-500/30'
            : store.matter.gte(upg.cost)
              ? 'bg-white/[0.03] border-white/20 hover:border-cyan-400/40 cursor-pointer'
              : 'bg-black/20 border-white/[0.04] opacity-50'"
        >
          <div>
            <div class="flex items-center justify-between gap-1 mb-1">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="text-sm shrink-0">{{ upg.icon }}</span>
                <span class="text-xs font-semibold text-slate-200 truncate">{{ upg.name }}</span>
              </div>
              <span
                v-if="store.hasAlgorithmUpgrade(upg.id)"
                class="flex items-center gap-0.5 text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.2 rounded shrink-0"
              >
                <CheckCircle2 class="w-3 h-3 text-cyan-400" />
                <span>Aktif</span>
              </span>
            </div>
            <p class="text-[11px] text-slate-400 leading-snug line-clamp-2">
              {{ upg.desc }}
            </p>
          </div>

          <div v-if="!store.hasAlgorithmUpgrade(upg.id)" class="pt-1 flex items-center justify-end">
            <button
              @click="buyUpgrade($event, upg.id)"
              :disabled="store.matter.lt(upg.cost)"
              class="btn-tactile w-full py-1 rounded text-[11px] font-mono font-medium transition-all border flex items-center justify-center gap-1.5"
              :class="store.matter.gte(upg.cost)
                ? 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-200 border-cyan-500/40 cursor-pointer shadow-xs'
                : 'bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed'"
            >
              <span>Yükle:</span>
              <span class="tabular-nums font-semibold">{{ format(upg.cost, 1, store.settings.notation) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 6. Bento Kartlar: Sıçrama, Kümeler ve Önbellek Temizleme -->
    <div
      class="grid grid-cols-1 gap-3 pt-1"
      :class="isSacrificeUnlocked ? 'md:grid-cols-3' : 'md:grid-cols-2'"
    >
      <!-- Akış Sıçraması (Shift) -->
      <div
        v-tilt="{ max: 6, scale: 1.015, disabled: !(store.settings.holoCardsEnabled ?? true) }"
        class="card-tilt-surface glass-panel-card p-3 rounded-xl flex items-center justify-between gap-3 border border-white/[0.06] transition-all"
        :class="store.canShift && (store.settings.holoCardsEnabled ?? true) ? 'edition-foil' : ''"
        v-tip="isShiftUnlock ? 'Yeni format açar' : `Tüm üretimi kalıcı ×${format(store.shiftPowerMultiplier, 2, store.settings.notation)} katlar`"
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
              {{ format(currentShiftDimAmount, 0, store.settings.notation) }} / {{ format(shiftReq.amount, 0, store.settings.notation) }} D{{ shiftReq.tier }}
            </div>
            <div class="progress-track progress-track-mini w-20 sm:w-24 mt-1">
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
          {{ isShiftUnlock ? 'Format Aç' : `×${format(store.singleShiftPower, 1, store.settings.notation)} Boost` }}
        </button>
      </div>

      <!-- Sonsuz Akış Kümeleri (Galaxies — D8 çağında açılır) -->
      <div
        v-if="showGalaxyCard"
        v-tilt="{ max: 6, scale: 1.015, disabled: !(store.settings.holoCardsEnabled ?? true) }"
        class="card-tilt-surface glass-panel-card p-3 rounded-xl flex items-center justify-between gap-3 border border-white/[0.06] transition-all"
        :class="store.canBuyGalaxy && (store.settings.holoCardsEnabled ?? true) ? 'edition-poly' : ''"
        v-tip="'Tüm içerikleri sıfırlar; Frekans (Hz) çarpan gücünü katlar'"
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
              {{ format(currentGalaxyDimAmount, 0, store.settings.notation) }} / {{ galaxyReq }} D{{ galaxyTier }}
            </div>
            <div class="progress-track progress-track-mini w-20 sm:w-24 mt-1">
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

      <!-- Erken oyun: küme kartı yerine tek satır hedef -->
      <div
        v-if="!showGalaxyCard"
        class="px-3 py-2 rounded-xl border border-white/[0.04] bg-black/20 text-[11px] font-mono text-slate-500 flex items-center gap-2"
        v-tip="'Akış Kümesi D8 çağında açılır; önce Akış Sıçraması ile yeni formatlar aç'"
      >
        <Radio class="w-3.5 h-3.5 text-slate-600 shrink-0" />
        <span>Akış Kümesi D8 çağında açılır — önce Sıçrama ile yeni formatlar aç</span>
      </div>

      <!-- Önbelleği Temizleme (Dimension Sacrifice - Antimatter Dimensions) -->
      <div
        v-if="isSacrificeUnlocked"
        v-tilt="{ max: 6, scale: 1.015, disabled: !(store.settings.holoCardsEnabled ?? true) }"
        class="card-tilt-surface glass-panel-card p-3 rounded-xl flex items-center justify-between gap-3 border border-rose-500/20 bg-rose-950/10 transition-all"
        :class="store.canSacrifice && (store.settings.holoCardsEnabled ?? true) ? 'edition-negative' : ''"
        v-tip="'D1-D7 üretmeye devam eder; biriken D1 miktarına göre D8 Saf Beyin Çürümesine kalıcı çarpan kazandırır!'"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-xs text-rose-200">Önbelleği Sil</span>
              <span class="text-[10px] font-mono text-rose-400 tabular-nums">×{{ format(store.sacrificeMultiplier, 1, store.settings.notation) }}</span>
            </div>
            <div class="text-[11px] font-mono text-rose-300/80 tabular-nums">
              → ×{{ format(store.currentSacrificeReward, 1, store.settings.notation) }} D8
            </div>
            <div class="text-[9px] text-slate-500 font-mono">
              D1 birikimini D8 gücüne çevir
            </div>
          </div>
        </div>

        <button
          @click="triggerSacrifice($event)"
          :disabled="!store.canSacrifice"
          class="btn-tactile px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border shrink-0 uppercase"
          :class="store.canSacrifice
            ? 'bg-rose-500/25 hover:bg-rose-500/35 text-rose-200 border-rose-500/50 cursor-pointer shadow-sm animate-pulse'
            : 'bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed opacity-40'"
        >
          Temizle
        </button>
      </div>

      <!-- QoL: onay diyaloğu (native confirm yerine; ayarlardan kapatılabilir) -->
      <ConfirmModal
        v-if="showSacrificeConfirm"
        title="Önbelleği Sil"
        message="D1-D7 istasyonların sıfırlanır; biriken D1 miktarına göre D8 Saf Beyin Çürümesine kalıcı çarpan eklenir. Devam edilsin mi?"
        confirm-label="Temizle"
        :danger="true"
        @confirm="showSacrificeConfirm = false; doSacrifice($event)"
        @cancel="showSacrificeConfirm = false"
      />
      <ConfirmModal
        v-if="showSingularityConfirm"
        title="Sabah 06:00 Çöküşü"
        message="Dopamin ve istasyonların sıfırlanacak; karşılığında kalıcı Uykusuzluk Puanı (SP) kazanacaksın. Hazır mısın?"
        confirm-label="Güneşi Karşıla"
        :danger="false"
        @confirm="showSingularityConfirm = false; doSingularity()"
        @cancel="showSingularityConfirm = false"
      />
    </div>
  </div>
</template>
