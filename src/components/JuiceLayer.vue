<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export interface JuiceTriggerOptions {
  x: number
  y: number
  text?: string
  color?: string
  /** Vurgulu boyut (prestij/büyük ödül anları için) */
  big?: boolean
}

declare global {
  interface Window {
    __triggerJuice?: (options: JuiceTriggerOptions) => void
  }
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  maxLife: number
  life: number
  text: string
  color: string
  size: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animId: number | null = null
let shakeTimeout: ReturnType<typeof setTimeout> | null = null
const particles: Particle[] = []

let width = 0
let height = 0

function resizeCanvas() {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
}

function spawnParticle(x: number, y: number, text: string, color = '#e2e8f0', big = false) {
  // P0 Balatro: juice moduna göre yoğunluk — calm sade, tilt parti
  const mode = (() => {
    try {
      const raw = localStorage.getItem('doomscroll-save')
      if (raw) {
        const parsed = JSON.parse(raw) as { settings?: { juiceMode?: string } }
        return parsed.settings?.juiceMode ?? 'balanced'
      }
    } catch { /* yoksay */ }
    return 'balanced'
  })()
  const repeats = big ? (mode === 'tilt' ? 5 : mode === 'calm' ? 1 : 3) : 1
  for (let r = 0; r < repeats; r++) {
    spawnSingle(x, y, text, color, big, mode, r)
  }

  if (animId === null) {
    animId = requestAnimationFrame(loop)
  }
}

function spawnSingle(
  x: number,
  y: number,
  text: string,
  color: string,
  big: boolean,
  mode: string,
  index: number
) {
  // Hafif rastgele dikey açı ve hız (burst'te yana saçılım genişler)
  const spread = big ? 2.6 : 1.5
  const vx = (Math.random() - 0.5) * spread
  const vy = -(2.5 + Math.random() * 2.0) - (big ? index * 0.35 : 0)

  const cap = mode === 'tilt' ? 120 : mode === 'calm' ? 30 : 60
  const p: Particle = {
    // Yatay saçılım: aynı noktadan üst üste spawn'da metin yığını yerine şerit
    x: x + (Math.random() - 0.5) * (big ? 64 : 28),
    y,
    vx,
    vy,
    alpha: 1,
    maxLife: 35 + Math.floor(Math.random() * 10), // ~0.6 - 0.8 saniye
    life: 0,
    text,
    color,
    size: big ? (mode === 'tilt' ? 24 : 20) : 15
  }

  if (particles.length >= cap) {
    particles.shift()
  }
  particles.push(p)
}

function triggerJuice(options: JuiceTriggerOptions) {
  const { x, y, text, color, big } = options
  if (text) {
    spawnParticle(x, y, text, color, big)
  }
}

function loop() {
  if (!ctx || !canvasRef.value) {
    animId = null
    return
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life++

    p.x += p.vx
    p.y += p.vy
    p.vy *= 0.96

    const progress = p.life / p.maxLife
    p.alpha = Math.max(0, 1 - progress)

    if (p.life >= p.maxLife || p.alpha <= 0) {
      particles.splice(i, 1)
      continue
    }

    ctx.save()
    ctx.globalAlpha = p.alpha
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // İmza tipografi: display font, boyut parçacıkla taşınır
    ctx.font = `700 ${p.size}px "Chakra Petch", "JetBrains Mono", monospace`

    // Koyu kontur: her zeminde okunabilirlik (karanlık panelde de açık alanda da)
    ctx.lineJoin = 'round'
    ctx.lineWidth = 3.5
    ctx.strokeStyle = 'rgba(8, 9, 13, 0.9)'
    ctx.strokeText(p.text, p.x, p.y)

    ctx.fillStyle = p.color
    ctx.fillText(p.text, p.x, p.y)

    ctx.restore()
  }

  ctx.restore()

  if (particles.length > 0) {
    animId = requestAnimationFrame(loop)
  } else {
    animId = null
  }
}

function handleTapEvent(e: Event) {
  const customEvent = e as CustomEvent<JuiceTriggerOptions>
  if (customEvent.detail) {
    triggerJuice(customEvent.detail)
  }
}

function handleShakeEvent(e: Event) {
  // P0 Balatro: shake kademesi — detail.level: 'soft' | 'medium' | 'hard'
  const level = (e as CustomEvent<{ level?: string }>).detail?.level ?? 'medium'
  const cls = level === 'hard' ? 'shake-hard' : level === 'soft' ? 'shake-soft' : 'screen-shake'
  const ms = level === 'hard' ? 400 : level === 'soft' ? 200 : 250
  if (shakeTimeout) {
    clearTimeout(shakeTimeout)
  }
  document.body.classList.remove('screen-shake', 'shake-soft', 'shake-hard')
  void document.body.offsetWidth
  document.body.classList.add(cls)

  shakeTimeout = setTimeout(() => {
    document.body.classList.remove('screen-shake', 'shake-soft', 'shake-hard')
    shakeTimeout = null
  }, ms)
}

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
    resizeCanvas()
  }

  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('doomscroll:tap', handleTapEvent)
  window.addEventListener('doomscroll:shake', handleShakeEvent)

  window.__triggerJuice = triggerJuice
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('doomscroll:tap', handleTapEvent)
  window.removeEventListener('doomscroll:shake', handleShakeEvent)

  if (window.__triggerJuice === triggerJuice) {
    delete window.__triggerJuice
  }

  if (animId !== null) {
    cancelAnimationFrame(animId)
    animId = null
  }

  if (shakeTimeout) {
    clearTimeout(shakeTimeout)
    shakeTimeout = null
  }
  document.body.classList.remove('screen-shake')

  particles.length = 0
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="layer-juice pointer-events-none fixed inset-0 h-full w-full select-none"
  />
</template>
