import type { Directive } from 'vue'

// ============================================================================
// Balatro / Simon Goellner 3D Card Tilt Directive (v-tilt)
// Donanım hızlandırmalı (rAF), reflow yapmayan, CSS custom properties tabanlı
// 3D perspektif ve dinamik ışık yansıtma motoru.
// ============================================================================

export interface TiltOptions {
  max?: number // Maksimum eğilme açısı (varsayılan: 8deg)
  scale?: number // Büyütme katsayısı (varsayılan: 1.015)
  glare?: boolean // Işık koordinatlarını (--pointer-x, --pointer-y) hesapla
  reverse?: boolean // Eğim yönünü tersine çevir
  disabled?: boolean // Direktifi devre dışı bırak
}

interface TiltEl extends HTMLElement {
  __tiltCleanup?: () => void
}

export const vTilt: Directive<TiltEl, TiltOptions | boolean | undefined> = {
  mounted(el, binding) {
    let rawOptions: TiltOptions = {}
    if (typeof binding.value === 'object' && binding.value !== null) {
      rawOptions = binding.value
    } else if (binding.value === false) {
      rawOptions = { disabled: true }
    }

    if (rawOptions.disabled) return

    // Erişilebilirlik: Azaltılmış hareket kontrolü
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const maxTilt = rawOptions.max ?? 8
    const scale = rawOptions.scale ?? 1.015
    const reverse = rawOptions.reverse ? -1 : 1

    let rafId: number | null = null
    let targetX = 0.5
    let targetY = 0.5
    let isHovering = false

    // Başlangıç değişkenleri
    el.style.setProperty('--pointer-x', '50%')
    el.style.setProperty('--pointer-y', '50%')
    el.style.setProperty('--tilt-rx', '0deg')
    el.style.setProperty('--tilt-ry', '0deg')
    el.style.setProperty('--pointer-angle', '0deg')
    el.style.setProperty('--pointer-from-center', '0')

    const updateTilt = () => {
      if (!isHovering) {
        el.style.setProperty('--pointer-x', '50%')
        el.style.setProperty('--pointer-y', '50%')
        el.style.setProperty('--tilt-rx', '0deg')
        el.style.setProperty('--tilt-ry', '0deg')
        el.style.setProperty('--pointer-from-center', '0')
        el.style.transform = ''
        rafId = null
        return
      }

      const dx = targetX - 0.5
      const dy = targetY - 0.5
      const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2)

      const rx = (dy * maxTilt * -1 * reverse).toFixed(2)
      const ry = (dx * maxTilt * reverse).toFixed(2)

      // Açı hesabı (derece cinsinden: 0 - 360)
      const rad = Math.atan2(dy, dx)
      const deg = (((rad * 180) / Math.PI + 360 + 90) % 360).toFixed(1)

      el.style.setProperty('--pointer-x', `${(targetX * 100).toFixed(1)}%`)
      el.style.setProperty('--pointer-y', `${(targetY * 100).toFixed(1)}%`)
      el.style.setProperty('--tilt-rx', `${rx}deg`)
      el.style.setProperty('--tilt-ry', `${ry}deg`)
      el.style.setProperty('--pointer-angle', `${deg}deg`)
      el.style.setProperty('--pointer-from-center', dist.toFixed(3))

      el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(${scale}, ${scale}, 1)`
      rafId = null
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const clientX = e.clientX
      const clientY = e.clientY

      targetX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      targetY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
      isHovering = true

      if (!rafId) {
        rafId = requestAnimationFrame(updateTilt)
      }
    }

    const onPointerEnter = () => {
      isHovering = true
      el.style.transition = 'transform 0.12s ease-out'
    }

    const onPointerLeave = () => {
      isHovering = false
      el.style.transition = 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)'
      if (!rafId) {
        rafId = requestAnimationFrame(updateTilt)
      }
    }

    el.addEventListener('pointerenter', onPointerEnter, { passive: true })
    el.addEventListener('pointermove', onPointerMove, { passive: true })
    el.addEventListener('pointerleave', onPointerLeave, { passive: true })
    el.addEventListener('pointercancel', onPointerLeave, { passive: true })

    el.__tiltCleanup = () => {
      if (rafId) cancelAnimationFrame(rafId)
      el.removeEventListener('pointerenter', onPointerEnter)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerleave', onPointerLeave)
      el.removeEventListener('pointercancel', onPointerLeave)
    }
  },
  unmounted(el) {
    el.__tiltCleanup?.()
    el.__tiltCleanup = undefined
  }
}
