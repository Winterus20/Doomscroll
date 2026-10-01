import { useGameStore } from '../stores/game'
import { SaveSystem } from './save'

export class GameLoop {
  private lastTime = performance.now()
  private accumulator = 0
  private readonly TICK_RATE = 50 // ms cinsinden adım süresi (20 TPS)
  private autoSaveTimer = 0
  private isRunning = false
  private animFrameId: number | null = null

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTime = performance.now()
    this.accumulator = 0

    const loop = (currentTime: number) => {
      if (!this.isRunning) return

      const delta = Math.min(1000, currentTime - this.lastTime)
      this.lastTime = currentTime
      this.accumulator += delta

      const store = useGameStore()

      // Çok büyük arka plan gecikmelerinde offline mantığına devret
      if (this.accumulator > 5000) {
        store.simulateOfflineProgress(this.accumulator / 1000)
        this.accumulator = 0
      } else {
        while (this.accumulator >= this.TICK_RATE) {
          store.update(this.TICK_RATE / 1000)
          this.accumulator -= this.TICK_RATE
        }
      }

      // Otomatik Kayıt (Her 10 saniyede bir)
      this.autoSaveTimer += delta
      if (this.autoSaveTimer >= 10000) {
        this.autoSaveTimer = 0
        SaveSystem.save(store.serialize())
      }

      this.animFrameId = requestAnimationFrame(loop)
    }

    this.animFrameId = requestAnimationFrame(loop)
  }

  stop() {
    this.isRunning = false
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
  }
}

export const gameLoop = new GameLoop()
