import { describe, it, expect, vi } from 'vitest'
import { useGameStore } from './game'

describe('Balatro Sütun 2: Sıralı Nedensellik (Sequential Triggering)', () => {
  it('varsayılan durumda en az taban ve final kademelerini üretir', () => {
    const store = useGameStore()
    const stages = store.swipeBreakdown

    expect(stages.length).toBeGreaterThanOrEqual(2)
    expect(stages[0].id).toBe('base')
    expect(stages[stages.length - 1].id).toBe('final')
  })

  it('Çılgın Kaydırma duruşunda stance_combo kademesi eklenir', () => {
    const store = useGameStore()
    store.currentStance = 'spam' // Çılgın Kaydırma (4x)

    const stages = store.swipeBreakdown
    const stanceStage = stages.find((s) => s.id === 'stance_combo')

    expect(stanceStage).toBeDefined()
    expect(stanceStage?.multiplier).toBe(4)
    expect(stanceStage?.label).toBe('ÇILGIN KAYDIRMA')
  })

  it('Başparmak Histerisi aktifken crit kademesi ve 777x etiketi eklenir', () => {
    const store = useGameStore()
    store.activeBuffs = [
      {
        id: 'test_frenzy',
        type: 'heart_frenzy',
        name: 'Başparmak Histerisi',
        duration: 30,
        remaining: 30,
        multiplier: 777
      }
    ]

    const stages = store.swipeBreakdown
    const critStage = stages.find((s) => s.id === 'crit')

    expect(critStage).toBeDefined()
    expect(critStage?.multiplier).toBe(777)
    expect(critStage?.label).toContain('777× HİSTERİ CRIT!')
  })

  it('manualClick çağrıldığında non-blocking olarak matter artar ve event fırlatılır', () => {
    const store = useGameStore()
    const initialMatter = store.matter

    let capturedDetail: any = null
    const dispatchMock = vi.fn((e: any) => {
      if (e.type === 'doomscroll:sequential-strike') {
        capturedDetail = e.detail
      }
    })

    const originalWindow = globalThis.window
    ;(globalThis as any).window = {
      innerWidth: 1000,
      innerHeight: 800,
      dispatchEvent: dispatchMock
    }

    try {
      store.manualClick({ x: 250, y: 400 })

      expect(store.matter.gt(initialMatter)).toBe(true)
      expect(capturedDetail).not.toBeNull()
      expect(capturedDetail.x).toBe(250)
      expect(capturedDetail.y).toBe(400)
      expect(capturedDetail.stages.length).toBeGreaterThanOrEqual(2)
      expect(capturedDetail.finalAmount.gt(0)).toBe(true)
    } finally {
      ;(globalThis as any).window = originalWindow
    }
  })

  it('settings.sequentialStrike varsayılan olarak true olmalıdır', () => {
    const store = useGameStore()
    expect(store.settings.sequentialStrike).toBe(true)
  })
})
