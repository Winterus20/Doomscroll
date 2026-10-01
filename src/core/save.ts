import LZString from 'lz-string'
import type { SerializedPlayerState } from '../models/types'

const SAVE_KEY = 'QUANTUM_HORIZON_SAVE_V1'

// Hard reset sonrası aynı sayfa bağlamında tetiklenen otomatik kayıtların
// (beforeunload + 10sn oyun döngüsü) silinen kaydı diriltmesini engeller.
// Sayfa yeniden yüklenince modül sıfırdan kurulduğu için bayrak kendiliğinden kalkar.
let saveSuppressed = false

export const SaveSystem = {
  save(state: SerializedPlayerState): boolean {
    if (saveSuppressed) return false
    try {
      const json = JSON.stringify(state)
      const compressed = LZString.compressToBase64(json)
      localStorage.setItem(SAVE_KEY, compressed)
      return true
    } catch (e) {
      console.error('Kayıt yapılamadı:', e)
      return false
    }
  },

  load(): SerializedPlayerState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return null

      // Önce sıkıştırılmış hali dene, değilse düz JSON dene (geriye uyumluluk)
      let json = LZString.decompressFromBase64(raw)
      if (!json) json = raw

      const parsed = JSON.parse(json) as SerializedPlayerState
      return parsed
    } catch (e) {
      console.error('Kayıt dosyası okunamadı:', e)
      return null
    }
  },

  exportSave(state: SerializedPlayerState): string {
    const json = JSON.stringify(state)
    return LZString.compressToBase64(json)
  },

  importSave(saveString: string): SerializedPlayerState | null {
    try {
      let json = LZString.decompressFromBase64(saveString.trim())
      if (!json) json = saveString.trim()

      const parsed = JSON.parse(json) as SerializedPlayerState
      if (!parsed || typeof parsed.matter !== 'string') {
        throw new Error('Geçersiz kayıt formatı')
      }
      return parsed
    } catch (e) {
      console.error('İçe aktarma hatası:', e)
      return null
    }
  },

  hardReset(): void {
    saveSuppressed = true
    localStorage.removeItem(SAVE_KEY)
  }
}
