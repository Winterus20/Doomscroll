import { useGameStore } from '../stores/game'
import { SaveSystem } from './save'
import { OFFLINE_CAP_SECONDS } from '../stores/game'

// Arka plan sekmesinde rAF durduğu için dönüşteki büyük delta'yı
// offline yakalamaya devreden eşik (sn cinsinden).
const BACKGROUND_CATCHUP_THRESHOLD = 5

export class GameLoop {
  private lastTime = performance.now()
  private accumulator = 0
  private readonly TICK_RATE = 50 // ms cinsinden adım süresi (20 TPS)
  private autoSaveTimer = 0
  private isRunning = false
  private animFrameId: number | null = null
  // QoL: sekme gizlenirken anında kayıt (rAF durduğunda son durum korunur)
  private handleVisibility: (() => void) | null = null

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTime = performance.now()
    this.accumulator = 0

    const loop = (currentTime: number) => {
      if (!this.isRunning) return

      const rawDelta = currentTime - this.lastTime
      this.lastTime = currentTime
      const store = useGameStore()

      if (rawDelta < 0) {
        // Sistem saati geriye atladı (NTP düzeltmesi vb.) — delta'yı yok say
        this.accumulator = 0
      } else if (rawDelta > BACKGROUND_CATCHUP_THRESHOLD * 1000) {
        // Arka plan sekmesi / sekme değişimi: birikmiş süre offline yakalamaya devredilir
        // (24 saat ile sınırlıdır; Welcome Back raporu store.offlineReport'a yazılır)
        store.simulateOfflineProgress(Math.min(rawDelta / 1000, OFFLINE_CAP_SECONDS))
        this.accumulator = 0
      } else {
        this.accumulator += rawDelta
        // Ticksel simülasyon: sabit adımlı accumulator pattern (spiral-of-death korumalı: kare başına max 5 tick)
        let steps = 0
        while (this.accumulator >= this.TICK_RATE) {
          store.update(this.TICK_RATE / 1000)
          this.accumulator -= this.TICK_RATE
          steps++
          if (steps >= 5) {
            this.accumulator = 0
            break
          }
        }
      }

      // Otomatik Kayıt (Her 10 saniyede bir)
      this.autoSaveTimer += Math.max(0, Math.min(rawDelta, 1000))
      if (this.autoSaveTimer >= 10000) {
        this.autoSaveTimer = 0
        SaveSystem.save(store.serialize())
      }

      this.animFrameId = requestAnimationFrame(loop)
    }

    // QoL: sekme gizlenirken/görünürken anlık kayıt — rAF tabanlı oyunda
    // gizlenen sekmede herhangi bir tick çalışmaz, son durum diskte güvende olmalı.
    this.handleVisibility = () => {
      if (document.hidden) {
        SaveSystem.save(useGameStore().serialize())
      } else {
        const now = performance.now()
        const rawDelta = now - this.lastTime
        if (rawDelta > BACKGROUND_CATCHUP_THRESHOLD * 1000) {
          useGameStore().simulateOfflineProgress(Math.min(rawDelta / 1000, OFFLINE_CAP_SECONDS))
          this.accumulator = 0
        }
        this.lastTime = now
      }
    }
    document.addEventListener('visibilitychange', this.handleVisibility)

    this.animFrameId = requestAnimationFrame(loop)
  }

  stop() {
    this.isRunning = false
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
    if (this.handleVisibility) {
      document.removeEventListener('visibilitychange', this.handleVisibility)
      this.handleVisibility = null
    }
  }
}

export const gameLoop = new GameLoop()
