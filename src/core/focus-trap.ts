/**
 * Odak tuzağı (focus trap) composable'ı.
 *
 * Amaç: modal diyaloglar gerçek birer ARIA dialog gibi davransın —
 *  - etkinleştiğinde odak diyaloğun içine taşınır,
 *  - Tab / Shift+Tab diyalogun içinde döngüde kalır,
 *  - Escape diyaloğun kendi keydown dinleyicisi üzerinden işlenir,
 *  - etkinleşmeden önce odaklanan öğe kapanışta geri odaklanır.
 *
 * Tüm dinleyiciler etkinleştirme/kapama ve unmount anında kaldırılır; sızıntı olmaz.
 */
import { onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

export interface FocusTrapOptions {
  /** Etkinleştiğinde odaklanılacak öğe (diyalog içinde olmalıdır). */
  initialFocus?: MaybeRefOrGetter<HTMLElement | null>
  /** aria-labelledby için etiket öğesinin id'si. Şablon statik bağlıyorsa verilmesi gerekmez. */
  labelledBy?: MaybeRefOrGetter<string | undefined>
  /** Escape basıldığında çağrılır (diyalog kapatılır). */
  onEscape?: (event: KeyboardEvent) => void
  /** true ise ilk odaklanabilir öğe yerine diyalog kapsayıcısının kendisine odaklanılır. */
  focusDialog?: boolean
}

export interface FocusTrapHandle {
  /** Diyalog kapsayıcısına bağlanacak template ref. */
  dialogRef: Ref<HTMLElement | null>
}

/** Sekme sırasına girebilecek öğeler. [tabindex="-1"] bilinçli olarak dışarıda. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ')

function isDisabled(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled') || el.hasAttribute('hidden')) return true
  if (el.getAttribute('aria-hidden') === 'true') return true
  if (el instanceof HTMLInputElement && el.type === 'hidden') return true
  return false
}

function isVisible(el: HTMLElement): boolean {
  if (el.getClientRects().length === 0) return false
  const style = window.getComputedStyle(el)
  return style.visibility !== 'hidden' && style.display !== 'none'
}

function isFocusable(el: HTMLElement): boolean {
  if (!el.matches(FOCUSABLE_SELECTOR)) return false
  return !isDisabled(el) && isVisible(el)
}

/** Diyalog içindeki odaklanabilir öğeler, DOM sırasıyla. */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusable)
}

/**
 * Diyalog erişilebilirlik niteliklerini güvenceye alır.
 * Şablonda zaten tanımlıysa dokunmaz (idempotent).
 */
function ensureDialogSemantics(element: HTMLElement): void {
  if (!element.hasAttribute('role')) element.setAttribute('role', 'dialog')
  if (!element.hasAttribute('aria-modal')) element.setAttribute('aria-modal', 'true')
  if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1')
}

export function useFocusTrap(
  active: MaybeRefOrGetter<boolean>,
  options: FocusTrapOptions = {}
): FocusTrapHandle {
  const dialogRef = ref<HTMLElement | null>(null)

  let attachedTo: HTMLElement | null = null
  let previouslyFocused: HTMLElement | null = null

  function applyLabelledBy(element: HTMLElement | null): void {
    // Yalnızca çağıran etiket id'si verdiyse dokunur; aksi halde şablon bağlantısına saygılıdır.
    if (!element || options.labelledBy === undefined) return
    const id = toValue(options.labelledBy)
    if (typeof id === 'string' && id.length > 0) {
      element.setAttribute('aria-labelledby', id)
    } else {
      element.removeAttribute('aria-labelledby')
    }
  }

  /** Odağı diyaloğun içine alır: tercih edilen öğe → ilk odaklanabilir → kapsayıcının kendisi. */
  function focusInto(element: HTMLElement): void {
    if (options.focusDialog) {
      element.focus()
      return
    }

    const preferred = toValue(options.initialFocus)
    if (preferred && element.contains(preferred) && isFocusable(preferred)) {
      preferred.focus()
      return
    }

    const first = getFocusableElements(element)[0]
    if (first) {
      first.focus()
      return
    }

    // Odaklanabilir çocuk yok: kapsayıcıya odaklan (tabindex="-1" gerekir).
    element.focus()
  }

  function handleKeydown(event: KeyboardEvent): void {
    const element = attachedTo
    if (!element) return

    if (event.key === 'Escape' || event.key === 'Esc') {
      const onEscape = options.onEscape
      if (!onEscape) return
      // Üstteki (iç içe) diyalogların da kapanmasını engelle: yalnızca en üstteki yanıt verir.
      event.stopPropagation()
      onEscape(event)
      return
    }

    if (event.key !== 'Tab') return

    const focusables = getFocusableElements(element)
    if (focusables.length === 0) {
      event.preventDefault()
      element.focus()
      return
    }

    const activeElement = document.activeElement
    const currentIndex = activeElement instanceof HTMLElement ? focusables.indexOf(activeElement) : -1
    const lastIndex = focusables.length - 1

    if (event.shiftKey) {
      if (currentIndex <= 0) {
        event.preventDefault()
        focusables[lastIndex]?.focus()
      }
      return
    }

    if (currentIndex === -1 || currentIndex === lastIndex) {
      event.preventDefault()
      focusables[0]?.focus()
    }
  }

  /** Odak diyaloğun dışına kaçarsa geri içeri alınır (tıklama ile de). */
  function handleFocusIn(event: FocusEvent): void {
    const element = attachedTo
    if (!element) return
    const target = event.target
    if (target instanceof Node && element.contains(target)) return
    focusInto(element)
  }

  function detach(): void {
    if (!attachedTo) return
    attachedTo.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('focusin', handleFocusIn, true)
    attachedTo = null
  }

  function activate(element: HTMLElement): void {
    if (attachedTo === element) return
    detach()

    const current = document.activeElement
    previouslyFocused = current instanceof HTMLElement && current !== document.body ? current : null

    attachedTo = element
    ensureDialogSemantics(element)
    element.addEventListener('keydown', handleKeydown)
    document.addEventListener('focusin', handleFocusIn, true)
    focusInto(element)
  }

  function deactivate(): void {
    if (!attachedTo) return
    detach()

    const target = previouslyFocused
    previouslyFocused = null
    if (target && target.isConnected) {
      target.focus()
    }
  }

  watch(
    [() => toValue(active), dialogRef, () => toValue(options.labelledBy)],
    ([isActive, element]) => {
      if (isActive && element) {
        activate(element)
        applyLabelledBy(element)
        return
      }
      deactivate()
      applyLabelledBy(element)
    },
    { immediate: true, flush: 'post' }
  )

  onBeforeUnmount(() => {
    deactivate()
  })

  return { dialogRef }
}
