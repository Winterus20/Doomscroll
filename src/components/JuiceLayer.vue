<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export interface JuiceTriggerOptions {
  x: number
  y: number
  text?: string
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
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animId: number | null = null
let shakeTimeout: ReturnType<typeof setTimeout> | null = null
const particles: Particle[] = []

let width = 0
let height = 0
const MAX_PARTICLES = 60

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

function spawnParticle(x: number, y: number, text: string) {
  // Hafif rastgele dikey açı ve hız
  const vx = (Math.random() - 0.5) * 1.5
  const vy = -(2.5 + Math.random() * 2.0)

  const p: Particle = {
    x,
    y,
    vx,
    vy,
    alpha: 1,
    maxLife: 35 + Math.floor(Math.random() * 10), // ~0.6 - 0.8 saniye
    life: 0,
    text,
    color: '#e2e8f0'
  }

  if (particles.length >= MAX_PARTICLES) {
    particles.shift()
  }
  particles.push(p)

  if (animId === null) {
    animId = requestAnimationFrame(loop)
  }
}

function triggerJuice(options: JuiceTriggerOptions) {
  const { x, y, text } = options
  if (text) {
    spawnParticle(x, y, text)
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
    ctx.font = '600 15px "JetBrains Mono", monospace'

    // Temiz, keskin metin ve hafif gölge
    ctx.fillStyle = '#08090d'
    ctx.fillText(p.text, p.x + 1, p.y + 1)

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

function handleShakeEvent() {
  if (shakeTimeout) {
    clearTimeout(shakeTimeout)
  }
  document.body.classList.remove('screen-shake')
  void document.body.offsetWidth
  document.body.classList.add('screen-shake')

  shakeTimeout = setTimeout(() => {
    document.body.classList.remove('screen-shake')
    shakeTimeout = null
  }, 250)
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
