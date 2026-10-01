import LZString from 'lz-string'
import type { SerializedPlayerState } from '../models/types'

const SAVE_KEY = 'DOOMSCROLL_SAVE_V1'
const LEGACY_SAVE_KEY = 'QUANTUM_HORIZON_SAVE_V1'
const BACKUP_KEY = 'DOOMSCROLL_SAVE_V1_BAK'
const BACKUP_EVERY_N_SAVES = 6 // 10 sn'lik kayıt ritminde ~1 dakikada bir yedek rotasyonu

// Hard reset sonrası aynı sayfa bağlamında tetiklenen otomatik kayıtların
// (beforeunload + 10sn oyun döngüsü) silinen kaydı diriltmesini engeller.
// Sayfa yeniden yüklenince modül sıfırdan kurulduğu için bayrak kendiliğinden kalkar.
let saveSuppressed = false
let saveCounter = 0
let lastSaveOk = true

export interface LoadResult {
  state: SerializedPlayerState | null
  fromBackup: boolean
  corrupted: boolean // ana kayıt okunamadı ama yedekten kurtarıldı / ya da tamamen kayıp
}

export const SaveSystem = {
  save(state: SerializedPlayerState): boolean {
    if (saveSuppressed) return false
    try {
      const json = JSON.stringify(state)
      const compressed = LZString.compressToBase64(json)

      // QoL: periyodik yedek rotasyonu — ana kayıt bozulursa son sağlam duruma dönülebilir.
      // Yazma başarısız olsa bile önceki ana kayıt yedekte durur.
      saveCounter++
      if (saveCounter % BACKUP_EVERY_N_SAVES === 0) {
        const current = localStorage.getItem(SAVE_KEY)
        if (current) localStorage.setItem(BACKUP_KEY, current)
      }

      localStorage.setItem(SAVE_KEY, compressed)
      lastSaveOk = true
      return true
    } catch (e) {
      console.error('Kayıt yapılamadı:', e)
      lastSaveOk = false
      return false
    }
  },

  // Son kayıt denemesinin durumu (Ayarlar modalı "kayit: OK/FAILED" göstergesi için)
  get lastSaveSucceeded(): boolean {
    return lastSaveOk
  },

  load(): SerializedPlayerState | null {
    return this.loadDetailed().state
  },

  // QoL: üç kademeli yükleme (ana → eski anahtar → yedek) + nereden yüklendiği bilgisi.
  loadDetailed(): LoadResult {
    const tryParse = (raw: string | null): SerializedPlayerState | null => {
      if (!raw) return null
      try {
        // Önce sıkıştırılmış hali dene, değilse düz JSON dene (geriye uyumluluk)
        let json = LZString.decompressFromBase64(raw)
        if (!json) json = raw
        return JSON.parse(json) as SerializedPlayerState
      } catch (e) {
        console.error('Kayıt ayrıştırılamadı:', e)
        return null
      }
    }

    try {
      const main = tryParse(localStorage.getItem(SAVE_KEY))
      if (main && typeof main.matter === 'string') {
        return { state: main, fromBackup: false, corrupted: false }
      }

      const backup = tryParse(localStorage.getItem(BACKUP_KEY))
      if (backup && typeof backup.matter === 'string') {
        console.warn('Ana kayıt bozuk; yedek slotundan yüklendi.')
        return { state: backup, fromBackup: true, corrupted: true }
      }

      const legacy = tryParse(localStorage.getItem(LEGACY_SAVE_KEY))
      if (legacy && typeof legacy.matter === 'string') {
        return { state: legacy, fromBackup: false, corrupted: false }
      }

      // Hiçbir slot okunamadı — varsa ana kayıt bozuk demektir; hemen silmeyip koruyoruz
      const hadMain = !!localStorage.getItem(SAVE_KEY)
      if (hadMain) {
        console.error('Kayıt dosyası okunamadı; yeni oyun başlıyor ama bozuk kayıt silinmedi.')
        return { state: null, fromBackup: false, corrupted: true }
      }
      return { state: null, fromBackup: false, corrupted: false }
    } catch (e) {
      console.error('Kayıt dosyası okunamadı:', e)
      return { state: null, fromBackup: false, corrupted: true }
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
    localStorage.removeItem(LEGACY_SAVE_KEY)
    localStorage.removeItem(BACKUP_KEY)
  }
}
