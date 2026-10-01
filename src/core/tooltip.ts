import type { Directive } from 'vue'

/**
 * v-tip — oyun içi tooltip directive (bulgu U2).
 *
 * Native `title` attribute'u dokunmatik cihazlarda hiç görünmez ve masaüstünde
 * ~500ms gecikmeyle açılır; oyunun tüm ipuçları title'a taşınmıştı. Bu directive
 * aynı metni hover'da anında, mobil tap'ta ise dokunma konumuna yakın gösterir.
 *
 * Kullanım: v-tip="'Metin'" veya v-tip="dinamikIfade"
 * Katman: z-75 (toast 70 < tip < modal 80)
 */

let layer: HTMLDivElement | null = null
let hideTimer: number | null = null

function getLayer(): HTMLDivElement {
  if (!layer) {
    layer = document.createElement('div')
    layer.setAttribute('role', 'tooltip')
    layer.style.cssText = [
      'position:fixed',
      'z-index:75',
      'max-width:260px',
      'padding:6px 10px',
      'border-radius:8px',
      'background:rgba(10,13,19,0.97)',
      'border:1px solid rgba(255,255,255,0.14)',
      'color:#e2e8f0',
      'font-size:11px',
      'line-height:1.45',
      'font-family:Inter,system-ui,sans-serif',
      'pointer-events:none',
      'box-shadow:0 8px 24px -6px rgba(0,0,0,0.7)',
      'opacity:0',
      'transition:opacity 0.12s ease'
    ].join(';')
    document.body.appendChild(layer)
  }
  return layer
}

function show(el: HTMLElement, text: string, x: number): void {
  if (!text) return
  if (hideTimer !== null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  const tip = getLayer()
  tip.textContent = text
  tip.style.opacity = '1'

  // Hedefin alt-ortasına hizala; yatay ve dikeyde ekranda tut.
  const rect = el.getBoundingClientRect()
  const tipRect = tip.getBoundingClientRect()
  let left = x - tipRect.width / 2
  left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8))
  let top = rect.bottom + 8
  if (top + tipRect.height > window.innerHeight - 8) {
    top = rect.top - tipRect.height - 8
  }
  tip.style.left = `${Math.round(left)}`
  tip.style.top = `${Math.round(Math.max(8, top))}`
}

function hide(delay = 0): void {
  if (hideTimer !== null) clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => {
    if (layer) layer.style.opacity = '0'
    hideTimer = null
  }, delay)
}

type TippedEl = HTMLElement & { __tipValue?: unknown; __tipCleanup?: () => void }

function bind(el: HTMLElement, value: unknown): void {
  ;(el as TippedEl).__tipValue = value
  const getText = (): string => {
    const v = (el as TippedEl).__tipValue
    return typeof v === 'string' ? v : ''
  }

  const onEnter = (e: MouseEvent): void => {
    show(el, getText(), e.clientX)
  }
  const onLeave = (): void => hide()
  const onTouch = (e: TouchEvent): void => {
    const t = e.touches[0]
    if (!t) return
    show(el, getText(), t.clientX)
    hide(2200)
  }

  el.addEventListener('mouseenter', onEnter)
  el.addEventListener('mouseleave', onLeave)
  el.addEventListener('touchstart', onTouch, { passive: true })
  el.addEventListener('click', () => hide())

  // Vue instance üzerinde temizlik için referans bırak
  ;(el as TippedEl).__tipCleanup = () => {
    el.removeEventListener('mouseenter', onEnter)
    el.removeEventListener('mouseleave', onLeave)
    el.removeEventListener('touchstart', onTouch)
  }
}

export const vTip: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    bind(el, binding.value)
  },
  updated(el, binding) {
    ;(el as TippedEl).__tipValue = binding.value
  },
  unmounted(el) {
    const cleanup = (el as TippedEl).__tipCleanup
    if (cleanup) cleanup()
    hide()
  }
}
