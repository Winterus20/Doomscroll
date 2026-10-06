import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Screen Shake ve Sabit Arayüz İzolasyonu (ADR-0044)', () => {
  let mockElement: {
    classList: {
      classes: Set<string>
      add: (cls: string) => void
      remove: (...clss: string[]) => void
      contains: (cls: string) => boolean
    }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    const classes = new Set<string>()
    mockElement = {
      classList: {
        classes,
        add: (cls: string) => classes.add(cls),
        remove: (...clss: string[]) => clss.forEach((c) => classes.delete(c)),
        contains: (cls: string) => classes.has(cls)
      }
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sarsıntı aktifken gelen ardışık yumuşak sarsıntılar sınıfı silip tekrar eklemeden süreyi uzatır', () => {
    let shakeTimeout: any = null
    const ms = 200

    function triggerShake(cls: string) {
      const hasHard = mockElement.classList.contains('shake-hard')
      const hasMedium = mockElement.classList.contains('screen-shake')

      if (
        mockElement.classList.contains(cls) ||
        (cls === 'shake-soft' && (hasMedium || hasHard)) ||
        (cls === 'screen-shake' && hasHard)
      ) {
        if (shakeTimeout) clearTimeout(shakeTimeout)
        shakeTimeout = setTimeout(() => {
          mockElement.classList.remove('screen-shake', 'shake-soft', 'shake-hard')
          shakeTimeout = null
        }, ms)
        return
      }

      if (shakeTimeout) clearTimeout(shakeTimeout)
      mockElement.classList.remove('screen-shake', 'shake-soft', 'shake-hard')
      mockElement.classList.add(cls)

      shakeTimeout = setTimeout(() => {
        mockElement.classList.remove('screen-shake', 'shake-soft', 'shake-hard')
        shakeTimeout = null
      }, ms)
    }

    // İlk sarsıntı
    triggerShake('shake-soft')
    expect(mockElement.classList.contains('shake-soft')).toBe(true)

    // 50ms sonra tekrar tetiklendiğinde sınıf silinmemeli
    vi.advanceTimersByTime(50)
    triggerShake('shake-soft')
    expect(mockElement.classList.contains('shake-soft')).toBe(true)

    // Toplam 200ms dolduğunda hâlâ aktif olmalı (çünkü 50ms'de yenilendi, bitiş 250ms)
    vi.advanceTimersByTime(160)
    expect(mockElement.classList.contains('shake-soft')).toBe(true)

    // 250ms'de tamamen temizlenmeli
    vi.advanceTimersByTime(50)
    expect(mockElement.classList.contains('shake-soft')).toBe(false)
  })

  it('yumuşak sarsıntı aktifken sert sarsıntı geldiğinde sınıf yükseltilir', () => {
    let shakeTimeout: any = null

    function triggerShake(cls: string, ms: number) {
      const hasHard = mockElement.classList.contains('shake-hard')
      const hasMedium = mockElement.classList.contains('screen-shake')

      if (
        mockElement.classList.contains(cls) ||
        (cls === 'shake-soft' && (hasMedium || hasHard)) ||
        (cls === 'screen-shake' && hasHard)
      ) {
        if (shakeTimeout) clearTimeout(shakeTimeout)
        shakeTimeout = setTimeout(() => {
          mockElement.classList.remove('screen-shake', 'shake-soft', 'shake-hard')
          shakeTimeout = null
        }, ms)
        return
      }

      if (shakeTimeout) clearTimeout(shakeTimeout)
      mockElement.classList.remove('screen-shake', 'shake-soft', 'shake-hard')
      mockElement.classList.add(cls)

      shakeTimeout = setTimeout(() => {
        mockElement.classList.remove('screen-shake', 'shake-soft', 'shake-hard')
        shakeTimeout = null
      }, ms)
    }

    // Yumuşak başla
    triggerShake('shake-soft', 200)
    expect(mockElement.classList.contains('shake-soft')).toBe(true)

    // Sert gelince yüksel
    triggerShake('shake-hard', 400)
    expect(mockElement.classList.contains('shake-soft')).toBe(false)
    expect(mockElement.classList.contains('shake-hard')).toBe(true)

    // 400ms sonra temizlen
    vi.advanceTimersByTime(400)
    expect(mockElement.classList.contains('shake-hard')).toBe(false)
  })
})
