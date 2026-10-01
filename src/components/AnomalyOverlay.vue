<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import type { FloatingAnomaly, AnomalyType } from '../models/types'
import confetti from 'canvas-confetti'
import {
  Flame,
  Zap,
  Sparkles,
  Clock
} from 'lucide-vue-next'

const store = useGameStore()

const floatingAnomalies = computed(() => store.floatingAnomalies)
const activeBuffs = computed(() => store.activeBuffs)
const isCombo = computed(() => store.isComboActive)

function getIcon(type: AnomalyType | string) {
  if (type === 'fyp') return Flame
  if (type === 'heart_frenzy') return Zap
  if (type === 'espresso') return Zap
  return Sparkles
}

function getCategoryTag(type: AnomalyType | string) {
  if (type === 'fyp') return 'Trend Akışı'
  if (type === 'heart_frenzy') return 'Gece 3 Krizi'
  if (type === 'espresso') return 'Kafein Kararı'
  return 'Viral Patlama'
}

function getCapsuleBorder(type: AnomalyType | string) {
  if (type === 'fyp') return 'border-purple-500/40 hover:border-purple-400'
  if (type === 'heart_frenzy') return 'border-rose-500/40 hover:border-rose-400'
  return 'border-amber-500/40 hover:border-amber-400'
}

function getTagStyle(type: AnomalyType | string) {
  if (type === 'fyp') return 'text-purple-300 bg-purple-500/10 border-purple-500/30'
  if (type === 'heart_frenzy') return 'text-rose-300 bg-rose-500/10 border-rose-500/30'
  return 'text-amber-300 bg-amber-500/10 border-amber-500/30'
}

function getProgressColor(type: AnomalyType | string) {
  if (type === 'fyp') return 'bg-purple-500'
  if (type === 'heart_frenzy') return 'bg-rose-500'
  return 'bg-amber-500'
}

function getIconColor(type: AnomalyType | string) {
  if (type === 'fyp') return 'text-purple-400'
  if (type === 'heart_frenzy') return 'text-rose-400'
  if (type === 'espresso') return 'text-cyan-400'
  return 'text-amber-400'
}

function getConfettiColors(type: AnomalyType | string) {
  if (type === 'fyp') return ['#a855f7', '#c084fc', '#ffffff']
  if (type === 'heart_frenzy') return ['#f43f5e', '#fb7185', '#ffffff']
  return ['#f59e0b', '#fbbf24', '#ffffff']
}

function handleAnomalyClick(anomaly: FloatingAnomaly, event: MouseEvent) {
  const clientX = event.clientX || (window.innerWidth * (anomaly.x / 100))
  const clientY = event.clientY || (window.innerHeight * (anomaly.y / 100))

  const originX = Math.max(0, Math.min(1, clientX / window.innerWidth))
  const originY = Math.max(0, Math.min(1, clientY / window.innerHeight))
  confetti({
    particleCount: 40,
    spread: 60,
    origin: { x: originX, y: originY },
    colors: getConfettiColors(anomaly.type),
    disableForReducedMotion: true
  })

  window.dispatchEvent(new CustomEvent('doomscroll:shake'))

  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x: clientX,
        y: clientY,
        text: anomaly.title
      }
    })
  )

  store.clickAnomaly(anomaly.id)
}
</script>

<template>
  <div class="layer-anomaly pointer-events-none fixed inset-0 overflow-hidden">
    <!-- 1. Yüzen Gece Krizleri (Sleek Dark Toast Kapsülleri) -->
    <div
      v-for="anomaly in floatingAnomalies"
      :key="anomaly.id"
      :style="{ left: `${anomaly.x}%`, top: `${anomaly.y}%` }"
      @click="handleAnomalyClick(anomaly, $event)"
      class="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none group transition-transform duration-150 hover:scale-105 active:scale-95"
    >
      <div
        class="glass-panel relative overflow-hidden rounded-xl border backdrop-blur-md px-3.5 py-2.5 flex items-center gap-3 min-w-[260px] max-w-[320px] transition-colors bg-[#0e121a]/95"
        :class="getCapsuleBorder(anomaly.type)"
      >
        <!-- Sol İkon -->
        <div class="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
          <component :is="getIcon(anomaly.type)" class="w-4 h-4" :class="getIconColor(anomaly.type)" />
        </div>

        <!-- Metinler -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1">
            <span
              class="text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded border"
              :class="getTagStyle(anomaly.type)"
            >
              {{ getCategoryTag(anomaly.type) }}
            </span>
            <span class="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Clock class="w-3 h-3 text-slate-500" />
              <span class="tabular-nums text-slate-300 font-medium">{{ Math.ceil(anomaly.remainingTime) }}s</span>
            </span>
          </div>

          <h4 class="font-bold text-xs text-white truncate mt-0.5">
            {{ anomaly.title }}
          </h4>
          <p class="text-[11px] text-slate-400 font-sans leading-tight line-clamp-1 mt-0.5">
            {{ anomaly.desc }}
          </p>
        </div>

        <!-- İnce Kalan Süre Çizgisi -->
        <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40">
          <div
            class="h-full transition-all duration-100"
            :class="getProgressColor(anomaly.type)"
            :style="{ width: `${Math.max(0, Math.min(100, (anomaly.remainingTime / 14) * 100))}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 2. Ekranın Üstünde Aktif Gece Krizleri Barı -->
    <div
      v-if="isCombo || activeBuffs.length > 0"
      class="pointer-events-auto fixed top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 max-w-xl w-full px-3"
    >
      <!-- Süper Rezonans Kombo Başlığı (Sleek Obsidian Banner) -->
      <div
        v-if="isCombo"
        class="px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-200 text-xs font-mono font-bold flex items-center gap-2 shadow-lg backdrop-blur-md"
      >
        <Flame class="w-3.5 h-3.5 text-rose-400" />
        <span>Rezonans Hipnozu: 7× üretim + 777× kaydırma aktif</span>
      </div>

      <!-- Tekil Buff Sayaçları -->
      <div v-if="activeBuffs.length > 0" class="flex flex-wrap items-center justify-center gap-2">
        <div
          v-for="buff in activeBuffs"
          :key="buff.id"
          class="backdrop-blur-md px-3 py-1 rounded-full border border-white/10 bg-black/60 flex items-center gap-2 text-xs font-mono text-slate-200"
        >
          <component :is="getIcon(buff.type)" class="w-3.5 h-3.5" :class="getIconColor(buff.type)" />
          <span class="font-medium text-[11px]">{{ buff.name }}</span>
          <span v-if="buff.multiplier > 1" class="text-[10px] text-purple-300 font-bold">
            {{ buff.multiplier }}×
          </span>
          <span class="px-1.5 py-0.2 rounded bg-white/[0.08] text-[10px] tabular-nums font-mono text-slate-300">
            {{ Math.ceil(buff.remaining) }}s
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
