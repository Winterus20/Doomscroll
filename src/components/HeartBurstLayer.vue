<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { sounds } from '../core/audio'
import { Heart } from 'lucide-vue-next'

interface FloatingHeart {
  id: number
  x: number
  y: number
  scale: number
  rotation: number
  color: string
}

const store = useGameStore()
const hearts = ref<FloatingHeart[]>([])
let nextHeartId = 1

let lastTapTime = 0
let lastTapX = 0
let lastTapY = 0
const DOUBLE_TAP_MAX_DELAY = 320 // ms
const DOUBLE_TAP_MAX_DIST = 35 // px

const HEART_COLORS = [
  '#ec4899', // Dopamine magenta
  '#f43f5e', // Crisis rose
  '#a855f7', // Neural purple
  '#fb7185', // Soft pink
  '#f472b6'  // Neon pink
]

function spawnHeart(x: number, y: number) {
  if (store.settings.reduceAnimations) {
    // Görsel efekt kapalıysa bile vuruş sesini ve primini ver
    sounds.playHapticTap()
    store.manualClick({ x, y })
    return
  }

  const id = nextHeartId++
  const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)]
  const rotation = (Math.random() - 0.5) * 30 // -15deg to +15deg
  const scale = 0.95 + Math.random() * 0.35

  hearts.value.push({
    id,
    x,
    y,
    scale,
    rotation,
    color
  })

  // Ses ve oyun içi çift vuruş etkisi
  sounds.playHapticTap()
  store.manualClick({ x, y })

  // 800ms sonra kalbi temizle
  setTimeout(() => {
    hearts.value = hearts.value.filter((h) => h.id !== id)
  }, 800)
}

function handlePointerDown(e: PointerEvent) {
  // Input veya textarea üzerinde çift tık kalp patlatmaz
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return
  }

  const now = performance.now()
  const dist = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY)

  if (now - lastTapTime < DOUBLE_TAP_MAX_DELAY && dist < DOUBLE_TAP_MAX_DIST) {
    // Çift dokunuş tespit edildi!
    spawnHeart(e.clientX, e.clientY)
    lastTapTime = 0
  } else {
    lastTapTime = now
    lastTapX = e.clientX
    lastTapY = e.clientY
  }
}

// Dışarıdan olay tetikleme desteği (örn: CommentTicker kalp butonu)
function handleCustomHeart(e: Event) {
  const customEvent = e as CustomEvent<{ x: number; y: number }>
  if (customEvent.detail) {
    spawnHeart(customEvent.detail.x, customEvent.detail.y)
  }
}

onMounted(() => {
  window.addEventListener('pointerdown', handlePointerDown, { passive: true })
  window.addEventListener('doomscroll:heart', handleCustomHeart)
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('doomscroll:heart', handleCustomHeart)
})
</script>

<template>
  <div class="heart-burst-container pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
    <div
      v-for="heart in hearts"
      :key="heart.id"
      class="floating-heart"
      :style="{
        left: `${heart.x}px`,
        top: `${heart.y}px`,
        '--heart-color': heart.color,
        '--heart-rot': `${heart.rotation}deg`,
        '--heart-scale': heart.scale
      }"
    >
      <Heart
        class="heart-svg drop-shadow-[0_0_12px_var(--heart-color)]"
        :fill="heart.color"
        :stroke="heart.color"
      />
    </div>
  </div>
</template>

<style scoped>
.floating-heart {
  position: absolute;
  transform: translate(-50%, -50%) scale(0);
  animation: heart-pop 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  will-change: transform, opacity;
}

.heart-svg {
  width: 36px;
  height: 36px;
}

@keyframes heart-pop {
  0% {
    transform: translate(-50%, -50%) scale(0) rotate(0deg);
    opacity: 0.9;
  }
  30% {
    transform: translate(-50%, -50%) scale(var(--heart-scale, 1.25)) rotate(var(--heart-rot, 0deg));
    opacity: 1;
  }
  60% {
    transform: translate(-50%, calc(-50% - 40px)) scale(calc(var(--heart-scale, 1.25) * 1.1)) rotate(var(--heart-rot, 0deg));
    opacity: 0.9;
  }
  100% {
    transform: translate(-50%, calc(-50% - 90px)) scale(calc(var(--heart-scale, 1.25) * 0.7)) rotate(var(--heart-rot, 0deg));
    opacity: 0;
  }
}
</style>
