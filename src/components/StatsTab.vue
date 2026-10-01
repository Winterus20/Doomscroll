<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format, formatTime } from '../core/format'
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
  FlaskConical
} from 'lucide-vue-next'
import TabHero from './TabHero.vue'

const store = useGameStore()

const statsList = computed(() => [
  {
    label: 'Uykusuz Geçen Süre',
    value: formatTime(store.stats.totalPlaytime),
    icon: Moon,
    color: 'text-purple-400'
  },
  {
    label: 'Yukarı Kaydırma Sayısı',
    value: store.stats.manualClicks.toLocaleString('tr-TR'),
    icon: MousePointerClick,
    color: 'text-pink-300'
  },
  {
    label: 'Toplam Üretilen Dopamin',
    value: format(store.stats.totalMatterProduced, 2, store.settings.notation),
    icon: Zap,
    color: 'text-purple-500'
  },
  {
    label: 'En Yüksek Dopamin Zirvesi',
    value: format(store.stats.highestMatter, 2, store.settings.notation),
    icon: Award,
    color: 'text-amber-400'
  },
  {
    label: 'Tıklanan Gece Krizleri',
    value: store.stats.anomaliesClicked.toLocaleString('tr-TR'),
    icon: Sparkles,
    color: 'text-amber-300'
  },
  {
    label: 'Tetiklenen Rezonans Hipnozları',
    value: store.stats.combosTriggered.toLocaleString('tr-TR'),
    icon: Flame,
    color: 'text-pink-400'
  },
  {
    label: 'Susturulan Vicdan Azapları',
    value: store.stats.slackersFired.toLocaleString('tr-TR'),
    icon: EyeOff,
    color: 'text-rose-400'
  },
  {
    label: 'Sabah 06:00 Çöküş Sayısı',
    value: store.stats.singularityCount.toString(),
    icon: Sun,
    color: 'text-amber-400'
  },
  {
    label: 'Kazanılan Uykusuzluk Puanı (SP)',
    value: format(store.singularityPoints, 2, store.settings.notation),
    icon: Sparkles,
    color: 'text-cyan-300'
  },
  {
    label: 'Algoritma Lab Hasatları',
    value: (store.stats.labHarvests || 0).toLocaleString('tr-TR'),
    icon: FlaskConical,
    color: 'text-emerald-400'
  },
  {
    label: 'Gece Kriz Kararları',
    value: (store.stats.spellsCast || 0).toLocaleString('tr-TR'),
    icon: Zap,
    color: 'text-cyan-400'
  }
])

// QoL: üretim kırılımı — toplam çarpanı oluşturan kaynaklar
const multiplierRows = computed(() => store.multiplierBreakdown)

// QoL: son 10 dakikanın saniyelik üretim sparkline'ı (SVG polyline, normalize edilmiş)
const SPARK_W = 100
const SPARK_H = 32
const sparkPoints = computed(() => {
  const hist = store.dpsHistory
  if (hist.length < 2) return ''
  const max = Math.max(...hist)
  if (!(max > 0)) return ''
  return hist
    .map((v, i) => {
      const x = (i / (hist.length - 1)) * SPARK_W
      const y = SPARK_H - Math.max(0.5, (v / max) * (SPARK_H - 2))
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})
const dpsCurrentText = computed(() => format(store.matterPerSecond, 2, store.settings.notation))
const dpsHistorySeconds = computed(() => store.dpsHistory.length)
</script>

<template>
  <div class="space-y-3">
    <TabHero
      :icon="BarChart3"
      icon-class="text-slate-300"
      title="Gece Nöbeti & Dopamin İstatistikleri"
      badge="Rapor"
      subtitle="Tüm gece vardiyasının özeti: kaydırma, üretim, kriz ve çöküş bilançosu."
      accent="slate"
    >
      <template #stats>
        <div class="stat-box">
          <Moon class="w-4 h-4 text-purple-400 shrink-0" />
          <div>
            <div class="stat-box-label">Uykusuz Süre</div>
            <div class="stat-box-value text-slate-100 tabular-nums">{{ formatTime(store.stats.totalPlaytime) }}</div>
          </div>
        </div>
      </template>
    </TabHero>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
      <div
        v-for="item in statsList"
        :key="item.label"
        class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2 rounded-lg bg-black/40 border border-white/[0.06]" :class="item.color">
            <component :is="item.icon" class="w-4 h-4" />
          </div>
          <span class="text-xs text-slate-300 font-medium truncate">
            {{ item.label }}
          </span>
        </div>
        <span class="text-sm font-mono font-bold text-white tabular-nums shrink-0 ml-2">
          {{ item.value }}
        </span>
      </div>
    </div>

    <!-- QoL: Üretim Zaman Çizgisi (son 10 dk, saniyelik örnek) -->
    <div class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
      <div class="flex items-center justify-between mb-2">
        <span class="section-label mb-0">Üretim Zaman Çizgisi</span>
        <span class="text-[11px] font-mono text-purple-300 tabular-nums">{{ dpsCurrentText }} / sn</span>
      </div>
      <div v-if="sparkPoints" class="w-full h-10 rounded-lg bg-black/40 border border-white/[0.05] overflow-hidden">
        <svg :viewBox="`0 0 ${SPARK_W} ${SPARK_H}`" preserveAspectRatio="none" class="w-full h-full">
          <polyline
            :points="sparkPoints"
            fill="none"
            stroke="rgb(192 132 252)"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div v-else class="h-10 rounded-lg bg-black/40 border border-white/[0.05] flex items-center justify-center">
        <span class="text-[10px] font-mono text-slate-500">Örnekleniyor... ({{ dpsHistorySeconds }} sn)</span>
      </div>
      <div class="flex justify-between text-[9px] font-mono text-slate-600 mt-1">
        <span>-10 dk</span>
        <span>şimdi</span>
      </div>
    </div>

    <!-- QoL: Dopamin Çarpan Kırılımı — toplam üretim hangi kaynaklardan geliyor? -->
    <div v-if="multiplierRows.length > 0" class="glass-panel-card p-3.5 rounded-xl border border-white/[0.06]">
      <span class="section-label mb-2">Dopamin Çarpan Kırılımı</span>
      <div class="space-y-1.5">
        <div
          v-for="row in multiplierRows"
          :key="row.name"
          class="flex items-center justify-between gap-2 text-xs"
          v-tip="row.desc"
        >
          <span class="text-slate-300 font-medium truncate">{{ row.name }}</span>
          <span class="font-mono font-bold tabular-nums shrink-0" :class="row.value >= 1 ? 'text-emerald-300' : 'text-rose-300'">
            ×{{ row.value >= 100 ? row.value.toFixed(0) : row.value.toFixed(2) }}
          </span>
        </div>
      </div>
      <p class="text-[10px] text-slate-500 font-mono mt-2">
        Format satırındaki × çarpanı bu kaynaklardan bağımsızdır — her istasyonun kendi kademeleri ayrıca işler.
      </p>
    </div>
  </div>
</template>
