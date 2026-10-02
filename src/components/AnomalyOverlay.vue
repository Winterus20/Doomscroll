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


// P1 Balatro: tipe göre dış glow (kart parıltısı)
function getCapsuleGlow(type: AnomalyType | string) {
  if (type === 'fyp') return 'anomaly-glow-purple'
  if (type === 'heart_frenzy') return 'anomaly-glow-rose'
  return 'anomaly-glow-amber'
}

function getAnomalyEdition(type: AnomalyType | string) {
  if (!(store.settings.holoCardsEnabled ?? true)) return ''
  if (type === 'heart_frenzy') return 'edition-poly'
  if (type === 'fyp') return 'edition-foil'
  return 'edition-holo'
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

function getShockwaveColor(type: AnomalyType | string) {
  if (type === 'heart_frenzy') return '#f43f5e'
  if (type === 'sponsor') return '#f59e0b'
  return '#a855f7'
}

function handleAnomalyClick(anomaly: FloatingAnomaly, event: MouseEvent) {
  const clientX = event.clientX || (window.innerWidth * (anomaly.x / 100))
  const clientY = event.clientY || (window.innerHeight * (anomaly.y / 100))

  const originX = Math.max(0, Math.min(1, clientX / window.innerWidth))
  const originY = Math.max(0, Math.min(1, clientY / window.innerHeight))

  // 1. Canvas Konfeti
  confetti({
    particleCount: 50,
    spread: 75,
    origin: { x: originX, y: originY },
    colors: getConfettiColors(anomaly.type),
    disableForReducedMotion: true
  })

  // 2. Ekran Titremesi (Screen Shake)
  window.dispatchEvent(
    new CustomEvent('doomscroll:shake', {
      detail: { level: anomaly.type === 'heart_frenzy' ? 'hard' : 'medium' }
    })
  )

  // 3. Canvas 2D Neon Şok Dalgası ve Kıvılcım Patlaması
  window.dispatchEvent(
    new CustomEvent('doomscroll:shockwave', {
      detail: {
        x: clientX,
        y: clientY,
        color: getShockwaveColor(anomaly.type),
        maxRadius: anomaly.type === 'heart_frenzy' ? 220 : 180
      }
    })
  )

  // 4. Dokunsal Yüzen Metin
  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x: clientX,
        y: clientY,
        text: anomaly.title,
        color: getShockwaveColor(anomaly.type)
      }
    })
  )

  store.clickAnomaly(anomaly.id)
}
</script>

<template>
  <div class="layer-anomaly pointer-events-none fixed inset-0 overflow-hidden">
    <!-- 1. Yüzen Gece Krizleri (Balatro Lazer Beam & Holo Kapsülleri) -->
    <div
      v-for="anomaly in floatingAnomalies"
      :key="anomaly.id"
      :style="{ left: `${anomaly.x}%`, top: `${anomaly.y}%` }"
      @click="handleAnomalyClick(anomaly, $event)"
      class="anomaly-wobble pointer-events-auto absolute cursor-pointer select-none active:scale-95"
      :class="{ 'panic-pulse': anomaly.remainingTime <= 3.5 }"
    >
      <!-- Dış Kapsül (Border Beam + Glow Container) -->
      <div
        v-tilt="{ max: 10, scale: 1.04, disabled: !(store.settings.holoCardsEnabled ?? true) }"
        class="card-tilt-surface relative overflow-hidden rounded-2xl p-[1.5px] transition-all min-w-[280px] max-w-[340px]"
        :class="[getCapsuleGlow(anomaly.type), getAnomalyEdition(anomaly.type)]"
      >
        <!-- Dönen Lazer Çerçeve (Border Beam Lazer) -->
        <div class="anomaly-beam-border"></div>

        <!-- İç Kart İçeriği -->
        <div class="relative rounded-2xl bg-[#090c13]/95 backdrop-blur-xl px-3.5 py-2.5 flex items-center gap-3 border border-white/[0.08] overflow-hidden">
          <!-- Holografik Işıltı Sweep (Shimmer Line) -->
          <div class="crisis-shimmer"></div>

          <!-- Sol Özel Animasyonlu Neon SVG İkonu -->
          <div class="relative w-10 h-10 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
            <!-- Arka Plan Radial Glow -->
            <div
              class="absolute inset-0 opacity-40 blur-sm pointer-events-none"
              :class="{
                'bg-purple-600': anomaly.type === 'fyp',
                'bg-rose-600': anomaly.type === 'heart_frenzy',
                'bg-amber-500': anomaly.type === 'sponsor'
              }"
            ></div>

            <!-- FYP: Gece 3 Çılgınlığı Çok Katmanlı Alev SVG -->
            <svg
              v-if="anomaly.type === 'fyp'"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="w-7 h-7 relative z-10"
            >
              <!-- Dış alev aurası -->
              <path
                d="M18 4C18 4 11 12 11 20C11 24.5 14 28 18 31C22 28 25 24.5 25 20C25 12 18 4 18 4Z"
                fill="url(#flame-purple-grad)"
                opacity="0.8"
              />
              <!-- İç dans eden alev çekirdeği -->
              <path
                class="animate-flame-sub"
                d="M18 13C18 13 14 18 14 23C14 26 15.5 28 18 29.5C20.5 28 22 26 22 23C22 18 18 13 18 13Z"
                fill="url(#flame-pink-core)"
              />
              <!-- Yükselen minik kıvılcım -->
              <circle cx="18" cy="8" r="1.2" fill="#fbcfe8" class="animate-pulse" />
              <defs>
                <linearGradient id="flame-purple-grad" x1="18" y1="4" x2="18" y2="31" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#c084fc" />
                  <stop offset="0.6" stop-color="#9333ea" />
                  <stop offset="1" stop-color="#581c87" />
                </linearGradient>
                <linearGradient id="flame-pink-core" x1="18" y1="13" x2="18" y2="29.5" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#ffffff" />
                  <stop offset="0.4" stop-color="#f472b6" />
                  <stop offset="1" stop-color="#e11d48" />
                </linearGradient>
              </defs>
            </svg>

            <!-- HEART FRENZY: Nabız Atan Siber Kalp & EKG SVG -->
            <svg
              v-else-if="anomaly.type === 'heart_frenzy'"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="w-7 h-7 relative z-10"
            >
              <!-- Güm güm atan neon siber kalp -->
              <path
                class="animate-cyber-heart"
                d="M18 29S8 21.5 8 13.5A6.5 6.5 0 0 1 18 9.2A6.5 6.5 0 0 1 28 13.5C28 21.5 18 29 18 29Z"
                fill="url(#heart-rose-grad)"
                stroke="#fda4af"
                stroke-width="1.2"
              />
              <!-- EKG Nabız Çizgisi -->
              <path
                class="animate-ekg-line"
                d="M9 19L14 19L16 14L19 24L21 17L23 19L27 19"
                stroke="#ffffff"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <defs>
                <linearGradient id="heart-rose-grad" x1="18" y1="9" x2="18" y2="29" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#f43f5e" />
                  <stop offset="0.7" stop-color="#be123c" />
                  <stop offset="1" stop-color="#881337" />
                </linearGradient>
              </defs>
            </svg>

            <!-- SPONSOR / VIRAL: 50 Milyonluk Altın Viral Elmas & Dönen Yıldız SVG -->
            <svg
              v-else
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="w-7 h-7 relative z-10"
            >
              <!-- Dönen 8 köşeli altın halo yıldızı -->
              <g class="animate-starburst-spin" opacity="0.6">
                <line x1="18" y1="3" x2="18" y2="33" stroke="#fcd34d" stroke-width="1.2" stroke-dasharray="2 3" />
                <line x1="3" y1="18" x2="33" y2="18" stroke="#fcd34d" stroke-width="1.2" stroke-dasharray="2 3" />
                <line x1="7.4" y1="7.4" x2="28.6" y2="28.6" stroke="#fcd34d" stroke-width="0.8" stroke-dasharray="2 3" />
                <line x1="7.4" y1="28.6" x2="28.6" y2="7.4" stroke="#fcd34d" stroke-width="0.8" stroke-dasharray="2 3" />
              </g>
              <!-- Altın Prizmatik Elmas Çekirdeği -->
              <path
                d="M18 6L28 15L18 30L8 15L18 6Z"
                fill="url(#diamond-gold-grad)"
                stroke="#fef08a"
                stroke-width="1.2"
              />
              <!-- Elmas Faset Çizgileri -->
              <path d="M8 15H28M18 6L14 15L18 30L22 15L18 6Z" stroke="#fef08a" stroke-width="0.7" opacity="0.85" />
              <defs>
                <linearGradient id="diamond-gold-grad" x1="18" y1="6" x2="18" y2="30" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#fde047" />
                  <stop offset="0.5" stop-color="#f59e0b" />
                  <stop offset="1" stop-color="#b45309" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <!-- Metinler & Etiketler -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span
                class="text-[9px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-xs"
                :class="getTagStyle(anomaly.type)"
              >
                {{ getCategoryTag(anomaly.type) }}
              </span>
              <span
                class="text-[10px] font-mono flex items-center gap-1 font-semibold"
                :class="anomaly.remainingTime <= 3.5 ? 'text-rose-400 animate-pulse' : 'text-slate-400'"
              >
                <Clock class="w-3 h-3 text-slate-500" />
                <span class="tabular-nums">{{ Math.ceil(anomaly.remainingTime) }}s</span>
              </span>
            </div>

            <h4 class="font-bold text-xs text-white truncate mt-1 tracking-tight">
              {{ anomaly.title }}
            </h4>
            <p class="text-[11px] text-slate-300 font-sans leading-tight line-clamp-1 mt-0.5">
              {{ anomaly.desc }}
            </p>
          </div>

          <!-- İnce Kalan Süre Çizgisi (Alt Taban) -->
          <div class="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
            <div
              class="h-full transition-all duration-100 shadow-sm"
              :class="[
                getProgressColor(anomaly.type),
                anomaly.remainingTime <= 3.5 ? 'bg-rose-500 animate-pulse' : ''
              ]"
              :style="{ width: `${Math.max(0, Math.min(100, (anomaly.remainingTime / 14) * 100))}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Ekranın Üstünde Aktif Gece Krizleri Barı -->
    <div
      v-if="isCombo || activeBuffs.length > 0"
      class="pointer-events-auto fixed top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 max-w-xl w-full px-3"
    >
      <!-- Süper Rezonans Kombo Başlığı (Polychrome Balatro Banner) -->
      <div
        v-if="isCombo"
        class="edition-poly px-4 py-1.5 rounded-full border border-purple-500/50 text-purple-100 text-xs font-mono font-bold flex items-center gap-2 shadow-xl backdrop-blur-md"
      >
        <Flame class="w-3.5 h-3.5 text-rose-300 animate-pulse" />
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
