<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format, formatTime } from '../core/format'
import { CHALLENGES } from '../game/challenges'
import {
  BarChart3,
  Moon,
  Zap,
  MousePointerClick,
  Sparkles,
  Flame,
  EyeOff,
  Sun,
  Award,
  FlaskConical,
  Clock,
  Activity,
  History,
  Gauge,
  Swords,
  Share2,
  Check,
  TrendingUp,
  Cpu,
  Layers,
  BatteryMedium,
  Crosshair,
  ShieldCheck,
  Compass,
  ArrowUpRight
} from 'lucide-vue-next'
import TabHero from './TabHero.vue'

const store = useGameStore()

type SubTabId = 'overview' | 'multipliers' | 'past10' | 'challenges' | 'biometrics'
const activeSubTab = ref<SubTabId>('overview')

const subTabs = [
  { id: 'overview' as const, label: 'Genel Bakış', icon: Activity },
  { id: 'multipliers' as const, label: 'Çarpan Laboratuvarı', icon: Gauge },
  { id: 'past10' as const, label: 'Son 10 Gece', icon: History },
  { id: 'challenges' as const, label: 'Kriz & Rekorlar', icon: Swords },
  { id: 'biometrics' as const, label: 'Gece Biyometrisi', icon: Moon }
]

// ---- 1. GENEL BAKIŞ VERİLERİ ----
const kpiOverview = computed(() => [
  {
    label: 'Uykusuz Geçen Süre',
    value: formatTime(store.stats.totalPlaytime),
    icon: Moon,
    color: 'text-purple-400',
    subtext: 'İlk başparmak hareketinden bu yana'
  },
  {
    label: 'Bu Koşuda Geçen Süre',
    value: formatTime(store.currentRunSeconds),
    icon: Clock,
    color: 'text-cyan-400',
    subtext: 'Son Sabah 06:00 çöküşünden beri'
  },
  {
    label: 'En Yüksek Dopamin Zirvesi',
    value: format(store.stats.highestMatter, 2, store.settings.notation),
    icon: Award,
    color: 'text-amber-400',
    subtext: 'Tüm zamanların anlık dopamin tepesi'
  },
  {
    label: 'Zirve Üretim Hızı',
    value: `${format(store.stats.highestDps, 2, store.settings.notation)} / sn`,
    icon: Zap,
    color: 'text-pink-400',
    subtext: 'Ulaşılan en yüksek saniyelik debi'
  },
  {
    label: 'En Hızlı Çöküş (Rekor)',
    value: Number.isFinite(store.stats.fastestSingularity)
      ? formatTime(store.stats.fastestSingularity)
      : 'Henüz Yok',
    icon: Sun,
    color: 'text-amber-300',
    subtext: `${store.stats.singularityCount} Sabah 06:00 Çöküşü içinden`
  },
  {
    label: 'Yukarı Kaydırma (Tıklama)',
    value: store.stats.manualClicks.toLocaleString('tr-TR'),
    icon: MousePointerClick,
    color: 'text-blue-400',
    subtext: `${format(store.stats.totalManualDopamine, 2, store.settings.notation)} Dopamin parmaktan`
  }
])

// Aktif vs Pasif Üretim Oranı
const ratio = computed(() => store.activeVsPassiveRatio)

// ---- İNTERAKTİF TELEMETRİ GRAFİĞİ (SVG) ----
const SPARK_W = 100
const SPARK_H = 34
const hoverIndex = ref<number | null>(null)

const sparkMax = computed(() => {
  const hist = store.dpsHistory
  if (hist.length < 2) return 0
  const m = Math.max(...hist)
  return Number.isFinite(m) && m > 0 ? m : 0
})

const sparkPoints = computed(() => {
  const hist = store.dpsHistory
  if (hist.length < 2 || sparkMax.value <= 0) return ''
  return hist
    .map((v, i) => {
      const x = (i / (hist.length - 1)) * SPARK_W
      const ratioVal = Math.min(1, Math.max(0, v / sparkMax.value))
      const y = SPARK_H - Math.max(0.5, ratioVal * (SPARK_H - 3))
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

const sparkAreaPoints = computed(() => {
  if (!sparkPoints.value) return ''
  return `0,${SPARK_H} ${sparkPoints.value} ${SPARK_W},${SPARK_H}`
})

function onChartMouseMove(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const hist = store.dpsHistory
  if (hist.length > 0) {
    const idx = Math.min(hist.length - 1, Math.floor(normX * hist.length))
    hoverIndex.value = idx
  }
}

function onChartMouseLeave() {
  hoverIndex.value = null
}

const hoverDpsText = computed(() => {
  if (hoverIndex.value === null) return null
  const val = store.dpsHistory[hoverIndex.value]
  if (val === undefined) return null
  const secsAgo = store.dpsHistory.length - 1 - hoverIndex.value
  return {
    valText: format(val, 2, store.settings.notation),
    timeText: secsAgo === 0 ? 'Şimdi' : `${secsAgo} sn önce`
  }
})

// ---- 2. ÇARPAN LABORATUVARI ----
const DIM_NAMES: Record<number, string> = {
  1: 'Kedi Videoları',
  2: 'Sokak Lezzetleri',
  3: 'ASMR Sabun',
  4: 'Subway Surfers + Reddit',
  5: 'Sigma Tavsiyeleri',
  6: 'Hint Dizisi (1/12)',
  7: 'Varoluşsal Kriz',
  8: 'Beyin Çürümesi'
}

const dimensionSummary = computed(() => {
  return store.dimensions.map((d) => ({
    tier: d.tier,
    name: DIM_NAMES[d.tier] || `${d.tier}. İstasyon`,
    amount: d.amount,
    bought: d.bought,
    mult: store.getDimensionMultiplier(d.tier)
  }))
})

// ---- 3. SON 10 GECE GÜNLÜĞÜ (PAST 10) ----
const pastRuns = computed(() => store.pastSingularities)
const pastAverages = computed(() => store.pastSingularitiesAverage)

// ---- 4. KRİZ & MEYDAN OKUMA REKORLARI ----
const challengeList = computed(() => {
  return CHALLENGES.map((c) => {
    const isCompleted = store.completedChallenges.includes(c.id)
    const isRunning = store.activeChallenge === c.id
    const bestTime = store.challengeBestTimes[c.id]
    return {
      ...c,
      isCompleted,
      isRunning,
      bestTimeText: bestTime !== undefined ? formatTime(bestTime) : '—'
    }
  })
})

// ---- 5. GECE BİYOMETRİSİ & PAYLAŞIM ----
const bio = computed(() => store.biometrics)
const copied = ref(false)

async function copyReport() {
  const b = bio.value
  const fastestStr = Number.isFinite(store.stats.fastestSingularity)
    ? formatTime(store.stats.fastestSingularity)
    : '—'

  const text = [
    '📱 DOOMSCROLL: THE ENDLESS REELS — GECE NÖBETİ RAPORU',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `⏱️ Uykusuzluk Süresi: ${formatTime(store.stats.totalPlaytime)}`,
    `👆 Yukarı Kaydırma: ${store.stats.manualClicks.toLocaleString('tr-TR')} (${b.thumbDistanceMeters.toFixed(1)} m)`,
    `⚡ Zirve Üretim: ${format(store.stats.highestDps, 2, store.settings.notation)} Dopamin / sn`,
    `🌅 Sabah 06:00 Çöküş: ${store.stats.singularityCount} kez (Rekor: ${fastestStr})`,
    `👁️ Gece Teşhisi: ${b.zombieRank}`,
    `🔋 Zihinsel Pil: %${b.mentalBatteryPct}`,
    `🌌 Retinal Mavi Foton: ${format(b.blueLightPhotons, 2, store.settings.notation)}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '#DoomscrollTheEndlessReels #Gece3Reels'
  ].join('\n')

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2200)
  } catch (err) {
    console.error('Kopyalama başarısız:', err)
  }
}
</script>

<template>
  <div class="space-y-3 pb-8">
    <!-- Üst Hero Banner -->
    <TabHero
      :icon="BarChart3"
      icon-class="text-slate-300"
      title="Gece Nöbeti & Dopamin Telemetrisi"
      badge="Rapor"
      subtitle="Antimatter Dimensions ve Cookie Clicker hibrit teşhis merkezi: çarpanlar, son 10 gece günlüğü, hız rekorları ve gece biyometrisi."
      accent="slate"
    >
      <template #stats>
        <div class="stat-box">
          <Moon class="w-4 h-4 text-purple-400 shrink-0" />
          <div>
            <div class="stat-box-label">Uykusuz Süre</div>
            <div class="stat-box-value text-slate-100 tabular-nums">
              {{ formatTime(store.stats.totalPlaytime) }}
            </div>
          </div>
        </div>

        <div class="stat-box">
          <Clock class="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div class="stat-box-label">Bu Koşu</div>
            <div class="stat-box-value text-cyan-200 tabular-nums">
              {{ formatTime(store.currentRunSeconds) }}
            </div>
          </div>
        </div>

        <div class="stat-box">
          <Zap class="w-4 h-4 text-pink-400 shrink-0" />
          <div>
            <div class="stat-box-label">Zirve Debi</div>
            <div class="stat-box-value text-pink-200 tabular-nums">
              {{ format(store.stats.highestDps, 2, store.settings.notation) }}/s
            </div>
          </div>
        </div>
      </template>
    </TabHero>

    <!-- Alt Sekme Navigasyonu (Segmented Pill Bar) -->
    <div class="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.08] overflow-x-auto no-scrollbar">
      <button
        v-for="tab in subTabs"
        :key="tab.id"
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer"
        :class="
          activeSubTab === tab.id
            ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-900/50'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
        "
        @click="activeSubTab = tab.id"
      >
        <component :is="tab.icon" class="w-3.5 h-3.5" />
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.id === 'past10' && pastRuns.length > 0"
          class="px-1.5 py-0.2 text-[9px] font-mono rounded bg-purple-500/20 text-purple-300"
        >
          {{ pastRuns.length }}
        </span>
      </button>
    </div>

    <!-- ========================================================================= -->
    <!-- 1. GENEL BAKIŞ (OVERVIEW)                                                 -->
    <!-- ========================================================================= -->
    <div v-if="activeSubTab === 'overview'" class="space-y-3">
      <!-- 6'lı Hero KPI Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <div
          v-for="kpi in kpiOverview"
          :key="kpi.label"
          class="glass-panel-card p-3 rounded-xl flex items-center justify-between border border-white/[0.06] hover:border-white/[0.12] transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="p-2 rounded-lg bg-black/40 border border-white/[0.06]" :class="kpi.color">
              <component :is="kpi.icon" class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <div class="text-xs text-slate-300 font-medium truncate">
                {{ kpi.label }}
              </div>
              <div class="text-[10px] text-slate-500 truncate">
                {{ kpi.subtext }}
              </div>
            </div>
          </div>
          <span class="text-sm font-mono font-bold text-white tabular-nums shrink-0 ml-2">
            {{ kpi.value }}
          </span>
        </div>
      </div>

      <!-- Aktif vs Pasif Üretim Dengesi (Cookie Clicker Modeli) -->
      <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <TrendingUp class="w-4 h-4 text-purple-400" />
            <span class="text-xs font-bold text-slate-200">Dopamin Akış Kaynağı Dağılımı</span>
          </div>
          <span class="text-[11px] font-mono text-slate-400">
            Toplam: {{ format(store.stats.totalMatterProduced, 2, store.settings.notation) }}
          </span>
        </div>

        <div class="w-full h-3 rounded-full bg-black/50 overflow-hidden flex border border-white/[0.06]">
          <div
            class="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-300"
            :style="{ width: `${ratio.manualPct}%` }"
            v-tip="`Başparmak Kaydırması: %${ratio.manualPct}`"
          ></div>
          <div
            class="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300"
            :style="{ width: `${ratio.passivePct}%` }"
            v-tip="`Otonom Algoritma Akışı: %${ratio.passivePct}`"
          ></div>
        </div>

        <div class="flex items-center justify-between text-[11px] font-mono mt-2">
          <span class="text-pink-300 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-pink-400 inline-block"></span>
            👆 Başparmak Kaydırması: %{{ ratio.manualPct }}
          </span>
          <span class="text-cyan-300 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
            ⚡ Otonom Algoritma: %{{ ratio.passivePct }}
          </span>
        </div>
      </div>

      <!-- İnteraktif Saniyelik Üretim Zaman Çizelgesi (Telemetry SVG Chart) -->
      <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <Activity class="w-4 h-4 text-purple-400" />
            <span class="text-xs font-bold text-slate-200">Saniyelik Üretim Zaman Çizelgesi</span>
            <span class="text-[10px] text-slate-500 font-mono">Son 10 dk ({{ store.dpsHistory.length }} sn)</span>
          </div>

          <div class="flex items-center gap-2">
            <span v-if="hoverDpsText" class="text-[11px] font-mono text-amber-300 tabular-nums">
              {{ hoverDpsText.timeText }}: {{ hoverDpsText.valText }} / sn
            </span>
            <span v-else class="text-[11px] font-mono text-purple-300 tabular-nums">
              Şu an: {{ format(store.matterPerSecond, 2, store.settings.notation) }} / sn
            </span>
          </div>
        </div>

        <div
          v-if="sparkPoints"
          class="relative w-full h-24 rounded-lg bg-black/50 border border-white/[0.05] overflow-hidden cursor-crosshair select-none"
          @mousemove="onChartMouseMove"
          @mouseleave="onChartMouseLeave"
        >
          <svg :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`" preserveAspectRatio="none" class="w-full h-full">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgb(192 132 252)" stop-opacity="0.35" />
                <stop offset="100%" stop-color="rgb(192 132 252)" stop-opacity="0.0" />
              </linearGradient>
            </defs>

            <!-- Kılavuz Çizgileri -->
            <line x1="0" y1="8" x2="100" y2="8" stroke="rgba(255,255,255,0.05)" stroke-width="0.5" />
            <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.05)" stroke-width="0.5" />

            <!-- Alan Dolgusu -->
            <polygon :points="sparkAreaPoints" fill="url(#chartGradient)" />

            <!-- Ana Eğri Çizgisi -->
            <polyline
              :points="sparkPoints"
              fill="none"
              stroke="rgb(192 132 252)"
              stroke-width="1.8"
              vector-effect="non-scaling-stroke"
            />

            <!-- Hover Dikey Göstergesi -->
            <line
              v-if="hoverIndex !== null && store.dpsHistory.length > 1"
              :x1="(hoverIndex / (store.dpsHistory.length - 1)) * SPARK_W"
              y1="0"
              :x2="(hoverIndex / (store.dpsHistory.length - 1)) * SPARK_W"
              :y2="SPARK_H"
              stroke="rgba(251, 191, 36, 0.8)"
              stroke-width="1"
              stroke-dasharray="2,2"
              vector-effect="non-scaling-stroke"
            />
          </svg>
        </div>
        <div v-else class="h-24 rounded-lg bg-black/50 border border-white/[0.05] flex items-center justify-center">
          <span class="text-xs font-mono text-slate-500">Telemetri verisi toplanıyor... ({{ store.dpsHistory.length }} sn)</span>
        </div>

        <div class="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
          <span>-10 dakika</span>
          <span>-5 dakika</span>
          <span>şimdi</span>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- 2. ÇARPAN LABORATUVARI (MULTIPLIERS BREAKDOWN)                             -->
    <!-- ========================================================================= -->
    <div v-else-if="activeSubTab === 'multipliers'" class="space-y-3">
      <!-- 2.1 Pasif Dopamin Akışı Çarpanları -->
      <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <Zap class="w-4 h-4 text-purple-400" />
            <span class="text-xs font-bold text-slate-200">Global Pasif Üretim Çarpanları</span>
          </div>
          <span class="text-[11px] font-mono text-purple-300">
            Net Hız: {{ format(store.matterPerSecond, 2, store.settings.notation) }} / sn
          </span>
        </div>

        <div class="space-y-1.5">
          <div
            v-for="row in store.multiplierBreakdown"
            :key="row.name"
            class="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/[0.04] text-xs hover:border-white/[0.09] transition-colors"
            v-tip="row.desc"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
              <span class="text-slate-300 font-medium truncate">{{ row.name }}</span>
            </div>
            <span
              class="font-mono font-bold tabular-nums shrink-0"
              :class="row.value >= 1 ? 'text-emerald-300' : 'text-rose-300'"
            >
              ×{{ format(row.value, 2, store.settings.notation) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 2.2 Manuel Kaydırma Gücü (Click Power) Kırılımı -->
      <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <MousePointerClick class="w-4 h-4 text-pink-400" />
            <span class="text-xs font-bold text-slate-200">Manuel Kaydırma Gücü Kırılımı</span>
          </div>
          <span class="text-xs font-mono font-bold text-pink-300 tabular-nums">
            {{ format(store.manualClickPower, 2, store.settings.notation) }} / Dokunuş
          </span>
        </div>

        <div class="space-y-1.5">
          <div
            v-for="row in store.clickPowerBreakdown"
            :key="row.name"
            class="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/[0.04] text-xs hover:border-white/[0.09] transition-colors"
            v-tip="row.desc"
          >
            <span class="text-slate-300 font-medium truncate">{{ row.name }}</span>
            <span class="font-mono font-bold text-pink-300 tabular-nums shrink-0">
              {{ row.value }}
            </span>
          </div>
        </div>
      </div>

      <!-- 2.3 Algoritma Frekansı (Hz & Tickspeed) Kırılımı -->
      <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <Gauge class="w-4 h-4 text-cyan-400" />
            <span class="text-xs font-bold text-slate-200">Algoritma Frekansı & Tickspeed</span>
          </div>
          <span class="text-xs font-mono font-bold text-cyan-300 tabular-nums">
            ×{{ format(store.tickspeedMultiplier, 2, store.settings.notation) }} Hız
          </span>
        </div>

        <div class="space-y-1.5">
          <div
            v-for="row in store.tickspeedBreakdown"
            :key="row.name"
            class="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/[0.04] text-xs hover:border-white/[0.09] transition-colors"
            v-tip="row.desc"
          >
            <span class="text-slate-300 font-medium truncate">{{ row.name }}</span>
            <span class="font-mono font-bold text-cyan-300 tabular-nums shrink-0">
              {{ row.value }}
            </span>
          </div>
        </div>
      </div>

      <!-- 2.4 İstasyonların Üretim Gücü (D1-D8) -->
      <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <Layers class="w-4 h-4 text-amber-400" />
            <span class="text-xs font-bold text-slate-200">İstasyon Kademeleri (D1–D8)</span>
          </div>
          <span class="text-[11px] font-mono text-slate-400">
            Açık: {{ store.unlockedDimensionsCount }} / 8
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div
            v-for="d in dimensionSummary"
            :key="d.tier"
            class="p-2.5 rounded-lg bg-black/30 border border-white/[0.04] flex items-center justify-between text-xs"
            :class="{ 'opacity-40': d.tier > store.unlockedDimensionsCount }"
          >
            <div class="min-w-0">
              <div class="font-bold text-slate-200 truncate">
                D{{ d.tier }}: {{ d.name }}
              </div>
              <div class="text-[10px] text-slate-500 font-mono">
                Satın Alınan: {{ d.bought }} adet
              </div>
            </div>
            <div class="text-right shrink-0 ml-2">
              <div class="font-mono font-bold text-amber-300 tabular-nums">
                ×{{ format(d.mult, 2, store.settings.notation) }}
              </div>
              <div class="text-[10px] text-slate-400 font-mono tabular-nums">
                {{ format(d.amount, 2, store.settings.notation) }} birim
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- 3. SON 10 GECE GÜNLÜĞÜ (PAST 10 SINGULARITIES)                            -->
    <!-- ========================================================================= -->
    <div v-else-if="activeSubTab === 'past10'" class="space-y-3">
      <!-- Boş Durum (Henüz prestij yoksa) -->
      <div
        v-if="pastRuns.length === 0"
        class="glass-panel-card p-8 rounded-xl border border-white/[0.06] text-center space-y-2"
      >
        <Moon class="w-10 h-10 text-purple-400 mx-auto opacity-60" />
        <h3 class="text-sm font-bold text-white">Henüz Sabah 06:00 Çöküşü Yaşanmadı</h3>
        <p class="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          1.79e308 Dopamin tekilliğine ulaşıp ilk çöküşünü gerçekleştirdiğinde veya bir Gece Krizini
          tamamladığında; son 10 gecenin süre, SP kazancı ve <b>SP / Dakika verimi</b> burada listelenecektir.
        </p>
      </div>

      <!-- Kayıtlar Mevcutsa -->
      <template v-else>
        <!-- Ortalama ve Hız Rekoru Bannerı -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06]">
            <div class="text-[10px] text-slate-400 font-medium">Ortalama Koşu Süresi</div>
            <div class="text-base font-mono font-bold text-cyan-300 tabular-nums mt-0.5">
              {{ formatTime(pastAverages.avgDuration) }}
            </div>
          </div>

          <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06]">
            <div class="text-[10px] text-slate-400 font-medium">Ortalama SP / Dakika Verimi</div>
            <div class="text-base font-mono font-bold text-emerald-300 tabular-nums mt-0.5">
              {{ format(pastAverages.avgSpPerMinute, 2, store.settings.notation) }} / dk
            </div>
          </div>

          <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06]">
            <div class="text-[10px] text-slate-400 font-medium">En Hızlı Çöküş Rekoru</div>
            <div class="text-base font-mono font-bold text-amber-300 tabular-nums mt-0.5">
              {{ formatTime(store.stats.fastestSingularity) }}
            </div>
          </div>
        </div>

        <!-- Son 10 Gece Tablosu -->
        <div class="glass-panel-card rounded-xl border border-white/[0.06] overflow-hidden">
          <div class="p-3 border-b border-white/[0.06] flex items-center justify-between">
            <span class="text-xs font-bold text-slate-200">Son 10 Sabah 06:00 Çöküşünün Telemetrisi</span>
            <span class="text-[10px] text-slate-500 font-mono">En Yeni → Eski</span>
          </div>

          <div class="divide-y divide-white/[0.04]">
            <div
              v-for="(run, idx) in pastRuns"
              :key="run.id + '-' + run.timestamp"
              class="p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-white/[0.02] transition-colors"
            >
              <div class="flex items-center gap-3">
                <span class="text-xs font-mono font-bold text-slate-500 w-6">#{{ pastRuns.length - idx }}</span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-slate-100">
                      {{ formatTime(run.duration) }}
                    </span>
                    <span
                      v-if="run.challengeId"
                      class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    >
                      Meydan Okuma: {{ run.challengeId.toUpperCase() }}
                    </span>
                    <span
                      v-else
                      class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    >
                      Standart Çöküş
                    </span>
                  </div>
                  <div class="text-[10px] text-slate-500 font-mono">
                    Zirve: {{ format(run.peakMatter, 2, store.settings.notation) }} Dopamin
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-4 text-right">
                <div>
                  <div class="text-xs font-mono font-bold text-cyan-300 tabular-nums">
                    {{ run.challengeId ? 'Tamamlandı' : `+${format(run.spGained, 2, store.settings.notation)} SP` }}
                  </div>
                  <div
                    v-if="!run.challengeId"
                    class="text-[10px] font-mono font-bold text-emerald-400 tabular-nums"
                    v-tip="'Optimizasyon için en kritik metrik: dakikada kazanılan net SP'"
                  >
                    {{ format(run.spPerMinute, 2, store.settings.notation) }} SP/dk
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ========================================================================= -->
    <!-- 4. KRİZ & MEYDAN OKUMA REKORLARI (CHALLENGES & CRISES)                     -->
    <!-- ========================================================================= -->
    <div v-else-if="activeSubTab === 'challenges'" class="space-y-3">
      <!-- C1-C8 Hız Rekorları -->
      <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <Swords class="w-4 h-4 text-amber-400" />
            <span class="text-xs font-bold text-slate-200">Gece Kriz Meydan Okumaları Rekorları (C1–C8)</span>
          </div>
          <span class="text-[11px] font-mono text-amber-300">
            Tamamlanan: {{ store.completedChallenges.length }} / 8
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div
            v-for="c in challengeList"
            :key="c.id"
            class="p-2.5 rounded-lg bg-black/30 border border-white/[0.04] flex items-center justify-between text-xs"
            :class="{ 'border-emerald-500/30 bg-emerald-950/10': c.isCompleted }"
          >
            <div class="min-w-0 pr-2">
              <div class="flex items-center gap-1.5 font-bold text-slate-200 truncate">
                <span>{{ c.icon }}</span>
                <span>{{ c.name }}</span>
                <ShieldCheck v-if="c.isCompleted" class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
              <div class="text-[10px] text-slate-400 truncate mt-0.5">
                {{ c.rewardDesc }}
              </div>
            </div>

            <div class="text-right shrink-0">
              <div class="text-[10px] text-slate-500 font-mono">En İyi Süre</div>
              <div
                class="font-mono font-bold text-xs tabular-nums"
                :class="c.isCompleted ? 'text-emerald-300' : 'text-slate-500'"
              >
                {{ c.bestTimeText }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Kriz Anomalileri ve Mini-Oyun Telemetrisi -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <Sparkles class="w-4 h-4 text-amber-300" />
            <span class="text-xs text-slate-300 font-medium">Tıklanan Gece Krizleri</span>
          </div>
          <span class="text-sm font-mono font-bold text-white tabular-nums">
            {{ store.stats.anomaliesClicked.toLocaleString('tr-TR') }}
          </span>
        </div>

        <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <Flame class="w-4 h-4 text-pink-400" />
            <span class="text-xs text-slate-300 font-medium">Rezonans Hipnozları</span>
          </div>
          <span class="text-sm font-mono font-bold text-pink-300 tabular-nums">
            {{ store.stats.combosTriggered.toLocaleString('tr-TR') }}
          </span>
        </div>

        <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <EyeOff class="w-4 h-4 text-rose-400" />
            <span class="text-xs text-slate-300 font-medium">Susturulan Vicdan Azapları</span>
          </div>
          <span class="text-sm font-mono font-bold text-rose-300 tabular-nums">
            {{ store.stats.slackersFired.toLocaleString('tr-TR') }}
          </span>
        </div>

        <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <FlaskConical class="w-4 h-4 text-emerald-400" />
            <span class="text-xs text-slate-300 font-medium">Algoritma Lab Hasatları</span>
          </div>
          <span class="text-sm font-mono font-bold text-emerald-300 tabular-nums">
            {{ (store.stats.labHarvests || 0).toLocaleString('tr-TR') }}
          </span>
        </div>

        <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <Zap class="w-4 h-4 text-cyan-400" />
            <span class="text-xs text-slate-300 font-medium">Gece Kriz Kararları (Büyü)</span>
          </div>
          <span class="text-sm font-mono font-bold text-cyan-300 tabular-nums">
            {{ (store.stats.spellsCast || 0).toLocaleString('tr-TR') }}
          </span>
        </div>

        <div class="glass-panel-card p-3 rounded-xl border border-white/[0.06] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <Cpu class="w-4 h-4 text-purple-400" />
            <span class="text-xs text-slate-300 font-medium">Ekilen Lab Trendleri</span>
          </div>
          <span class="text-sm font-mono font-bold text-purple-300 tabular-nums">
            {{ (store.stats.seedsPlanted || 0).toLocaleString('tr-TR') }}
          </span>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- 5. GECE BİYOMETRİSİ & HİCİV (BIOMETRICS & THEME)                          -->
    <!-- ========================================================================= -->
    <div v-else-if="activeSubTab === 'biometrics'" class="space-y-3">
      <!-- 5.1 Başparmak Kilometresi & İllüstratif Kıyaslama -->
      <div class="glass-panel-card p-4 rounded-xl border border-white/[0.06] space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Compass class="w-5 h-5 text-pink-400" />
            <div>
              <h3 class="text-xs font-bold text-slate-100">Fiziksel Başparmak Mesafesi</h3>
              <p class="text-[10px] text-slate-400">Her yukarı kaydırma ortalama 5 cm kabul edilir</p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-base font-mono font-extrabold text-pink-300 tabular-nums">
              {{ bio.thumbDistanceMeters.toFixed(1) }} Metre
            </div>
            <div class="text-[10px] font-mono text-slate-500 tabular-nums">
              ({{ bio.thumbDistanceKm.toFixed(3) }} Kilometre)
            </div>
          </div>
        </div>

        <div class="p-2.5 rounded-lg bg-black/40 border border-white/[0.05] text-xs text-pink-200/90 font-medium flex items-center gap-2">
          <ArrowUpRight class="w-4 h-4 text-pink-400 shrink-0" />
          <span>{{ bio.milestoneHint }}</span>
        </div>
      </div>

      <!-- 5.2 Feda Edilen Uyku & Zihinsel Pil -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div class="glass-panel-card p-4 rounded-xl border border-white/[0.06] space-y-2">
          <div class="flex items-center gap-2">
            <Moon class="w-4 h-4 text-purple-400" />
            <h4 class="text-xs font-bold text-slate-200">Feda Edilen Kaliteli Uyku</h4>
          </div>
          <div class="text-xl font-mono font-extrabold text-purple-300 tabular-nums">
            {{ Math.floor(bio.lostSleepHours) }} sa {{ Math.round((bio.lostSleepHours % 1) * 60) }} dk
          </div>
          <p class="text-[10px] text-slate-400 leading-relaxed">
            "Sadece 2 dakika bakıp uyuyacaktın." Biyolojik saatin seni sabah ezanıyla selamlamak üzere.
          </p>
        </div>

        <div class="glass-panel-card p-4 rounded-xl border border-white/[0.06] space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <BatteryMedium class="w-4 h-4 text-emerald-400" />
              <h4 class="text-xs font-bold text-slate-200">Tahmini Zihinsel Pil Şarjı</h4>
            </div>
            <span class="text-xs font-mono font-bold text-emerald-300 tabular-nums">
              %{{ bio.mentalBatteryPct }}
            </span>
          </div>

          <div class="w-full h-3 rounded-full bg-black/50 overflow-hidden border border-white/[0.06]">
            <div
              class="h-full transition-all duration-300"
              :class="
                bio.mentalBatteryPct > 50
                  ? 'bg-emerald-500'
                  : bio.mentalBatteryPct > 20
                  ? 'bg-amber-500'
                  : 'bg-rose-500 animate-pulse'
              "
              :style="{ width: `${bio.mentalBatteryPct}%` }"
            ></div>
          </div>
          <p class="text-[10px] text-slate-400">
            Sabah toplantısında veya ilk derste zihinsel performans bu seviyede olacaktır.
          </p>
        </div>
      </div>

      <!-- 5.3 Mavi Işık Foton Dozu & Bağımlılık Rütbesi -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div class="glass-panel-card p-4 rounded-xl border border-white/[0.06] space-y-1">
          <div class="flex items-center gap-2">
            <Crosshair class="w-4 h-4 text-cyan-400" />
            <h4 class="text-xs font-bold text-slate-200">Retinaya Çarpan Mavi Işık Fotonu</h4>
          </div>
          <div class="text-lg font-mono font-extrabold text-cyan-300 tabular-nums">
            {{ format(bio.blueLightPhotons, 2, store.settings.notation) }} Foton
          </div>
          <p class="text-[10px] text-slate-400">
            Melatonin hormonların tamamen buharlaştı; beyin şu an saat 14:00 sanıyor.
          </p>
        </div>

        <div class="glass-panel-card p-4 rounded-xl border border-white/[0.06] space-y-1">
          <div class="flex items-center gap-2">
            <Sun class="w-4 h-4 text-amber-400" />
            <h4 class="text-xs font-bold text-slate-200">Gece Nöbeti Bağımlılık Teşhisi</h4>
          </div>
          <div class="text-sm font-mono mt-1" :class="bio.zombieRankColor">
            {{ bio.zombieRank }}
          </div>
          <p class="text-[10px] text-slate-400">
            Oynama süresi, kaydırma sayısı ve çöküş eşiklerine göre dinamik gece rütben.
          </p>
        </div>
      </div>

      <!-- 5.4 Gece Raporunu Kopyala (Share Card) -->
      <div class="glass-panel-card p-4 rounded-xl border border-purple-500/20 bg-purple-950/10 flex flex-col md:flex-row items-center justify-between gap-3">
        <div>
          <h4 class="text-xs font-bold text-purple-200 flex items-center gap-1.5">
            <Share2 class="w-4 h-4 text-purple-400" />
            Gece Nöbeti Karnesini Paylaş
          </h4>
          <p class="text-[10px] text-slate-400">
            Discord, WhatsApp veya Reddit'te arkadaşlarına gece 3 uykusuzluk bilançonla hava at.
          </p>
        </div>

        <button
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-lg shrink-0"
          :class="
            copied
              ? 'bg-emerald-600 shadow-emerald-900/50'
              : 'bg-purple-600 hover:bg-purple-500 active:scale-95 shadow-purple-900/50'
          "
          @click="copyReport"
        >
          <component :is="copied ? Check : Share2" class="w-4 h-4" />
          <span>{{ copied ? 'Kopyalandı! ✓' : 'Raporu Panoya Kopyala' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
