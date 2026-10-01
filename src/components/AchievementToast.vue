<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { getAchievement } from '../game/achievements'

const store = useGameStore()

// Kuyruk pompası: her bildirim 4 sn görünür, sonra sıradaki gelir.
// Üst üste açılan başarımlar takılmadan sırayla akar.
let timer: number | null = null

function pumpQueue() {
  if (timer !== null) return
  if (store.achievementToastQueue.length === 0) return
  timer = window.setTimeout(() => {
    timer = null
    const first = store.achievementToastQueue[0]
    if (first) store.dismissAchievementToast(first)
    if (store.achievementToastQueue.length > 0) pumpQueue()
  }, 4000)
}

watch(
  () => store.achievementToastQueue.length,
  () => {
    pumpQueue()
  }
)

onUnmounted(() => {
  if (timer !== null) {
    window.clearTimeout(timer)
    timer = null
  }
})
</script>

<template>
  <div class="layer-toast fixed bottom-4 right-4 flex flex-col gap-2 w-72 max-w-[calc(100vw-2rem)]">
    <div
      v-for="id in store.achievementToastQueue"
      :key="id"
      class="glass-panel p-3 rounded-xl border border-amber-500/40 bg-[#0e121a]/95 flex items-start gap-2.5 cursor-pointer"
      @click="store.dismissAchievementToast(id)"
    >
      <span class="text-2xl leading-none shrink-0">{{ getAchievement(id)?.icon || '🏆' }}</span>
      <div class="min-w-0">
        <div class="text-[11px] font-mono text-amber-400 uppercase tracking-wider">Başarım kazanıldı!</div>
        <div class="text-sm font-bold text-white truncate">{{ getAchievement(id)?.name || id }}</div>
        <div v-if="getAchievement(id)?.reward" class="text-[11px] text-emerald-300 font-mono mt-0.5">
          {{ getAchievement(id)?.reward?.desc }}
        </div>
      </div>
    </div>
  </div>
</template>
