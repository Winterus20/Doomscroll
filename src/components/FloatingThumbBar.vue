<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import { sounds } from '../core/audio'
import { ArrowUp, Cpu, Layers, Flame, AlertTriangle } from 'lucide-vue-next'

const store = useGameStore()

const formattedClickPower = computed(() => format(store.manualClickPower, 2, store.settings.notation))
const tickspeedCost = computed(() => format(store.tickspeedCost, 2, store.settings.notation))
const tickspeedMultiplier = computed(() => format(store.tickspeedMultiplier, 2, store.settings.notation))
const canAffordTickspeed = computed(() => store.matter.gte(store.tickspeedCost))

const canAffordAny = computed(() => {
  if (canAffordTickspeed.value) return true
  for (let i = 1; i <= store.unlockedDimensionsCount; i++) {
    if (store.matter.gte(store.getDimensionCost(i))) return true
  }
  return false
})

function handleSwipe(e: MouseEvent | TouchEvent) {
  let x = window.innerWidth / 2
  let y = window.innerHeight * 0.75
  if ('clientX' in e) {
    x = e.clientX
    y = e.clientY
  } else if (e.touches && e.touches[0]) {
    x = e.touches[0].clientX
    y = e.touches[0].clientY
  }
  sounds.playClick()
  store.manualClick({ x, y })
}

function handleTickspeed() {
  if (!canAffordTickspeed.value) return
  sounds.playBuy()
  store.buyTickspeed()
}

function handleMaxAll() {
  if (!canAffordAny.value) return
  sounds.playBuy()
  store.maxAll()
}
</script>

<template>
  <!-- Sadece mobilde (< 768px) görünür, masaüstünde gizlidir -->
  <aside
    aria-label="Hızlı Kaydırma Çubuğu"
    class="md:hidden fixed bottom-[56px] left-0 right-0 z-30 px-3 py-1 pointer-events-none select-none transition-transform duration-300"
  >
    <div
      class="pointer-events-auto max-w-md mx-auto flex items-center justify-between gap-1.5 p-1.5 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
    >
      <!-- Sol 1: Tickspeed Hz Butonu -->
      <button
        type="button"
        @click="handleTickspeed"
        v-hold="handleTickspeed"
        :disabled="!canAffordTickspeed"
        class="btn-tactile h-11 px-2.5 rounded-xl text-xs font-mono font-medium transition-all flex flex-col items-center justify-center shrink-0 border"
        :class="canAffordTickspeed
          ? 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border-purple-500/35 cursor-pointer shadow-xs'
          : 'bg-black/40 text-slate-600 border-white/[0.05] cursor-not-allowed opacity-50'"
        title="Algoritma Frekansı (Hz)"
      >
        <div class="flex items-center gap-1 leading-none">
          <Cpu class="w-3 h-3 text-purple-400" />
          <span class="text-[10px] font-bold text-white">×{{ tickspeedMultiplier }}</span>
        </div>
        <span class="text-[9px] text-purple-300/80 font-normal tabular-nums truncate max-w-[50px] leading-tight">
          {{ tickspeedCost }}
        </span>
      </button>

      <!-- Sol 2: Tümü (Max All) Butonu -->
      <button
        type="button"
        @click="handleMaxAll"
        :disabled="!canAffordAny"
        class="btn-tactile h-11 px-2.5 rounded-xl font-mono text-xs font-bold transition-all flex flex-col items-center justify-center shrink-0 border"
        :class="canAffordAny
          ? 'bg-white/[0.1] hover:bg-white/[0.18] text-white border-white/25 cursor-pointer shadow-xs'
          : 'bg-black/40 text-slate-600 border-white/[0.05] cursor-not-allowed opacity-40'"
        title="Tümünü Maks Al"
      >
        <div class="flex items-center gap-1 leading-none">
          <Layers class="w-3 h-3 text-purple-400" />
          <span class="text-[10px] font-bold">Tümü</span>
        </div>
        <span class="text-[9px] text-slate-400 font-normal leading-tight">Maks</span>
      </button>

      <!-- Sağ: BÜYÜK ERGONOMİK "KAYDIR" BUTONU -->
      <button
        type="button"
        @click="handleSwipe($event)"
        class="btn-tactile flex-1 h-11 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs font-mono flex items-center justify-between gap-1.5 shadow-[0_0_16px_rgba(168,85,247,0.35)] active:scale-95 transition-all border border-purple-400/50 cursor-pointer"
      >
        <div class="flex items-center gap-1.5">
          <div class="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <ArrowUp class="w-4 h-4 text-white animate-bounce" />
          </div>
          <div class="flex flex-col items-start leading-none">
            <span class="text-xs font-black tracking-wide text-white uppercase">Kaydır!</span>
            <span class="text-[9px] text-purple-200/90 font-mono font-normal tabular-nums">
              +{{ formattedClickPower }}
            </span>
          </div>
        </div>

        <!-- Durum Rozeti (Kombo veya Kriz Debuff) -->
        <div v-if="store.isComboActive" class="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/40 text-amber-300 text-[10px] font-bold animate-pulse">
          <Flame class="w-2.5 h-2.5 fill-amber-400" />
          <span>{{ store.comboMultiplier.toFixed(1) }}x</span>
        </div>
        <div v-else-if="store.crisisBackfireDebuff > 0" class="flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-rose-500/25 border border-rose-400/40 text-rose-300 text-[9px] font-bold">
          <AlertTriangle class="w-2.5 h-2.5" />
          <span>%50</span>
        </div>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.btn-tactile:active {
  transform: scale(0.96);
}
</style>
