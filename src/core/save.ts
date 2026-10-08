import LZString from 'lz-string'
import type { SerializedPlayerState, SaveSlotMeta } from '../models/types'
import { SAVE_VERSION, MIN_SUPPORTED_SAVE_VERSION, readSaveVersion } from './save-version'
import { Decimal } from './math'

const SAVE_KEY_PREFIX = 'DOOMSCROLL_SAVE_SLOT_'
const LEGACY_MAIN_KEY = 'DOOMSCROLL_SAVE_V1'
const LEGACY_OLD_KEY = 'QUANTUM_HORIZON_SAVE_V1'
const BACKUP_KEY = 'DOOMSCROLL_SAVE_V1_BAK'
const ACTIVE_SLOT_KEY = 'DOOMSCROLL_ACTIVE_SLOT'
const BACKUP_EVERY_N_SAVES = 6 // 10 sn'lik kayıt ritminde ~1 dakikada bir yedek rotasyonu
/** Fazla büyük girdi (LZ ham veya sıkıştırılmış) reddedilir — bellek şişirme koruması. */
const MAX_SAVE_STRING_LENGTH = 500_000
/** Ayrıştırılmış kaydın üst seviye anahtar sayısı üst sınırı. */
const MAX_SAVE_TOP_LEVEL_KEYS = 200
/** Ayrıştırılmış kayıttaki herhangi bir dizinin uzunluk üst sınırı. */
const MAX_SAVE_ARRAY_LENGTH = 5000

let saveSuppressed = false
/** Slot başına periyodik yedek sayacı (tek global sayaç slot 2/3 rotasyonunu bozuyordu). */
const saveCounters = new Map<number, number>()
let lastSaveOk = true
let lastSaveTime = Date.now()

/**
 * ADR-0029: bozuk kayıt, autosave (~10 sn) tarafından üstüne yazılmadan ÖNCE
 * ayrı bir karantina anahtarına kopyalanır. Aksi halde tek örnek kayıp olurdu.
 */
const QUARANTINE_SUFFIX = '_CORRUPT'

export interface LoadResult {
  state: SerializedPlayerState | null
  fromBackup: boolean
  corrupted: boolean
  /** Bozuk ham veri karantinaya alındı mı (kanıt korundu). */
  quarantined: boolean
  /**
   * Kayıt bu build'den daha yeni sürümde mi yazılmış? Bu durumda kayıt
   * bilinçli olarak YÜKLENMEZ — aksi halde yeni alanlar sessizce düşer.
   */
  futureVersion: { found: number; supported: number } | null
}

export interface InspectResult {
  valid: boolean
  error?: string
  summary?: {
    matter: string
    singularities: number
    version: number
    playtime: number
    stats?: {
      clicks: number
      challenges: number
    }
  }
}

function resolveSlotKey(slot: number): string {
  // Slot 1 eski DOOMSCROLL_SAVE_V1 anahtarıyla %100 uyumludur
  return slot === 1 ? LEGACY_MAIN_KEY : `${SAVE_KEY_PREFIX}${slot}`
}

/** Slot başına yedek anahtarı. Slot 1 geriye dönük uyum için eski adı korur. */
function resolveBackupKey(slot: number): string {
  return slot === 1 ? BACKUP_KEY : `${SAVE_KEY_PREFIX}${slot}_BAK`
}

/** Bozuk ham veriyi ayrı anahtara taşır; asıl slot olduğu gibi bırakılır. */
function quarantineRaw(slot: number, raw: string): boolean {
  try {
    localStorage.setItem(resolveSlotKey(slot) + QUARANTINE_SUFFIX, raw)
    return true
  } catch {
    return false
  }
}

/** Karantinaya alınmış bozuk kaydın var olup olmadığı (kurtarma teklifi için). */
export function hasQuarantinedSave(slot?: number): boolean {
  try {
    const s = slot ?? SaveSystem.getActiveSlot()
    return !!localStorage.getItem(resolveSlotKey(s) + QUARANTINE_SUFFIX)
  } catch {
    return false
  }
}

/** Yalnızca ilgili slotu temizler — diğer slotlara dokunmaz (eski-sürüm wipe için). */
function clearSingleSlot(slot: number): void {
  try {
    localStorage.removeItem(resolveSlotKey(slot))
    localStorage.removeItem(resolveBackupKey(slot))
    localStorage.removeItem(resolveSlotKey(slot) + QUARANTINE_SUFFIX)
    if (slot === 1) {
      localStorage.removeItem(LEGACY_OLD_KEY)
    }
  } catch {
    // Temizlik yolunda sessiz geç
  }
}

/** Ayrıştırılmış kaydın şekil sınırlarını denetler (şişirilmiş/bozuk veri koruması). */
function isShapeSane(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return false
  const obj = parsed as Record<string, unknown>
  const keys = Object.keys(obj)
  if (keys.length > MAX_SAVE_TOP_LEVEL_KEYS) return false
  for (const k of keys) {
    const v = obj[k]
    if (Array.isArray(v) && v.length > MAX_SAVE_ARRAY_LENGTH) return false
  }
  return true
}

function tryParseRaw(raw: string | null): SerializedPlayerState | null {
  if (!raw) return null
  if (raw.length > MAX_SAVE_STRING_LENGTH) {
    console.error('Kayıt dizesi çok büyük, reddedildi.')
    return null
  }
  try {
    let json = LZString.decompressFromBase64(raw)
    if (!json) json = raw
    if (json.length > MAX_SAVE_STRING_LENGTH) {
      console.error('Kayıt içeriği çok büyük, reddedildi.')
      return null
    }
    const parsed = JSON.parse(json) as SerializedPlayerState
    if (!isShapeSane(parsed)) {
      console.error('Kayıt şekli sınır dışı, reddedildi.')
      return null
    }
    return parsed
  } catch (e) {
    console.error('Kayıt ayrıştırılamadı:', e)
    return null
  }
}

export const SaveSystem = {
  /** Aktif kayıt slotunu döner (1, 2 veya 3). Varsayılan 1. */
  getActiveSlot(): number {
    try {
      const stored = localStorage.getItem(ACTIVE_SLOT_KEY)
      const val = stored ? parseInt(stored, 10) : 1
      return [1, 2, 3].includes(val) ? val : 1
    } catch {
      return 1
    }
  },

  /** Aktif kayıt slotunu ayarlar */
  setActiveSlot(slot: number): void {
    if (![1, 2, 3].includes(slot)) return
    try {
      localStorage.setItem(ACTIVE_SLOT_KEY, slot.toString())
    } catch (e) {
      console.error('Aktif slot kaydedilemedi:', e)
    }
  },

  /** Belirtilen slota veya aktif slota kayıt yazar */
  save(state: SerializedPlayerState, targetSlot?: number): boolean {
    // ADR-0029: bastırılmışken lastSaveOk DOKUNULMAZDI, bu yüzden telemetri
    // "kayıt başarılı" derken gerçekte yazılmamış oluyordu.
    if (saveSuppressed) return false
    const slot = targetSlot ?? this.getActiveSlot()
    const key = resolveSlotKey(slot)

    try {
      const json = JSON.stringify(state)
      const compressed = LZString.compressToBase64(json)

      // Periyodik yedek rotasyonu — slot başına sayaçla (TÜM SLOTLAR için).
      // Önceden tek global sayaç vardı; slot 2/3 kaydı sayacı ilerletemeyince
      // yedek rotasyonu slotlar arası kayıyordu.
      const nextCount = (saveCounters.get(slot) ?? 0) + 1
      saveCounters.set(slot, nextCount)
      if (nextCount % BACKUP_EVERY_N_SAVES === 0) {
        const current = localStorage.getItem(key)
        if (current) localStorage.setItem(resolveBackupKey(slot), current)
      }

      localStorage.setItem(key, compressed)
      lastSaveOk = true
      lastSaveTime = Date.now()
      return true
    } catch (e) {
      console.error(`Slot ${slot} kaydı yapılamadı:`, e)
      lastSaveOk = false
      return false
    }
  },

  get lastSaveSucceeded(): boolean {
    return lastSaveOk
  },

  get lastSaveTimestamp(): number {
    return lastSaveTime
  },

  /** Aktif slottaki kaydı yükler */
  load(): SerializedPlayerState | null {
    return this.loadDetailed().state
  },

  /** Belirtilen veya aktif slot için detaylı yükleme */
  loadDetailed(targetSlot?: number): LoadResult {
    const slot = targetSlot ?? this.getActiveSlot()
    const key = resolveSlotKey(slot)
    const rawMain = localStorage.getItem(key)

    // 0) Gelecek sürüm ve asgari sürüm (Global Reset) kontrolü — EN ÖNCE.
    if (rawMain) {
      const parsedMain = tryParseRaw(rawMain)
      const found = readSaveVersion(parsedMain)
      if (found > SAVE_VERSION) {
        console.error(`Slot ${slot} kaydı v${found}; bu build v${SAVE_VERSION}. Yükleme reddedildi.`)
        return {
          state: null,
          fromBackup: false,
          corrupted: false,
          quarantined: quarantineRaw(slot, rawMain),
          futureVersion: { found, supported: SAVE_VERSION }
        }
      }
      // Global Wipe: Asgari sürümün altındaki eski kayıt yalnızca İLGİLİ slotta
      // temizlenir (diğer slotlara dokunulmaz).
      if (found < MIN_SUPPORTED_SAVE_VERSION) {
        console.warn(`Slot ${slot} kaydı v${found} (asgari v${MIN_SUPPORTED_SAVE_VERSION} gerekli). İlerleme sıfırlandı.`)
        clearSingleSlot(slot)
        return { state: null, fromBackup: false, corrupted: false, quarantined: false, futureVersion: null }
      }
    }

    try {
      const main = tryParseRaw(rawMain)
      if (main && typeof main.matter === 'string') {
        return { state: main, fromBackup: false, corrupted: false, quarantined: false, futureVersion: null }
      }

      // Fallback zinciri — ARTIK TÜM SLOTLAR için yedekten kurtarma yapılır.
      const backup = tryParseRaw(localStorage.getItem(resolveBackupKey(slot)))
      if (backup && typeof backup.matter === 'string') {
        const found = readSaveVersion(backup)
        if (found < MIN_SUPPORTED_SAVE_VERSION) {
          console.warn(`Slot ${slot} yedeği eski sürüm (v${found}). Sıfırlanıyor.`)
          clearSingleSlot(slot)
          return { state: null, fromBackup: false, corrupted: false, quarantined: false, futureVersion: null }
        }
        console.warn(`Slot ${slot} ana kayıt bozuk; yedekten yüklendi.`)
        return {
          state: backup,
          fromBackup: true,
          corrupted: true,
          quarantined: !!rawMain && quarantineRaw(slot, rawMain),
          futureVersion: null
        }
      }

      if (slot === 1) {
        const legacy = tryParseRaw(localStorage.getItem(LEGACY_OLD_KEY))
        if (legacy && typeof legacy.matter === 'string') {
          const found = readSaveVersion(legacy)
          if (found < MIN_SUPPORTED_SAVE_VERSION) {
            clearSingleSlot(slot)
            return { state: null, fromBackup: false, corrupted: false, quarantined: false, futureVersion: null }
          }
          return { state: legacy, fromBackup: false, corrupted: false, quarantined: false, futureVersion: null }
        }
      }

      if (rawMain) {
        console.error(`Slot ${slot} kayıt dosyası okunamadı; bozuk kayıt karantinaya alındı.`)
        return {
          state: null,
          fromBackup: false,
          corrupted: true,
          quarantined: quarantineRaw(slot, rawMain),
          futureVersion: null
        }
      }

      return { state: null, fromBackup: false, corrupted: false, quarantined: false, futureVersion: null }
    } catch (e) {
      console.error(`Slot ${slot} yükleme hatası:`, e)
      return {
        state: null,
        fromBackup: false,
        corrupted: true,
        quarantined: !!rawMain && quarantineRaw(slot, rawMain),
        futureVersion: null
      }
    }
  },

  /** Son otomatik yedekten kurtarır (Slot 1 için) */
  /**
   * Slottaki mevcut kaydı ANINDA yedek anahtarına kopyalar (ADR-0029).
   *
   * Periyodik rotasyon 6 kayıtta bir olduğu için, üzerine yazılacak kritik
   * anlarda (buluttan indirme, import) buna ihtiyaç duyulur.
   * @returns yedek alındıysa true
   */
  snapshotSlot(targetSlot?: number): boolean {
    const slot = targetSlot ?? this.getActiveSlot()
    try {
      const raw = localStorage.getItem(resolveSlotKey(slot))
      if (!raw) return false
      localStorage.setItem(resolveBackupKey(slot), raw)
      return true
    } catch {
      return false
    }
  },

  restoreFromBackup(targetSlot?: number): SerializedPlayerState | null {
    const slot = targetSlot ?? this.getActiveSlot()
    try {
      const backup = tryParseRaw(localStorage.getItem(resolveBackupKey(slot)))
      if (backup && typeof backup.matter === 'string') {
        // Ana slota da yaz
        this.save(backup, slot)
        return backup
      }
      return null
    } catch {
      return null
    }
  },

  /** Otomatik yedeğin var olup olmadığını kontrol eder */
  hasBackup(targetSlot?: number): boolean {
    try {
      return !!localStorage.getItem(resolveBackupKey(targetSlot ?? this.getActiveSlot()))
    } catch {
      return false
    }
  },

  /** Tek bir slotun özet meta bilgisini döner */
  getSlotMeta(slot: number): SaveSlotMeta {
    const key = resolveSlotKey(slot)
    const raw = localStorage.getItem(key)
    if (!raw) {
      return { slot, exists: false }
    }
    const state = tryParseRaw(raw)
    if (!state || typeof state.matter !== 'string') {
      return { slot, exists: false }
    }
    return {
      slot,
      exists: true,
      matter: state.matter,
      singularities: typeof state.singularities === 'number' ? state.singularities : state.stats?.singularityCount || 0,
      playtime: state.stats?.totalPlaytime || 0,
      timestamp: state.lastUpdate || 0
    }
  },

  /** Tüm slotların meta bilgilerini döner */
  getAllSlotsMeta(): SaveSlotMeta[] {
    return [1, 2, 3].map((s) => this.getSlotMeta(s))
  },

  /** Bir slottaki veriyi başka bir slota kopyalar (kaynak doğrulanır). */
  copySlot(fromSlot: number, toSlot: number): boolean {
    if (fromSlot === toSlot) return false
    if (![1, 2, 3].includes(fromSlot) || ![1, 2, 3].includes(toSlot)) return false
    const fromKey = resolveSlotKey(fromSlot)
    const toKey = resolveSlotKey(toSlot)
    const raw = localStorage.getItem(fromKey)
    if (!raw) return false
    try {
      const parsed = tryParseRaw(raw)
      if (!parsed || typeof parsed.matter !== 'string') return false
      if (!isShapeSane(parsed)) return false
      const found = readSaveVersion(parsed)
      if (found > SAVE_VERSION || found < MIN_SUPPORTED_SAVE_VERSION) return false
      let probe: Decimal
      try {
        probe = new Decimal(parsed.matter)
      } catch {
        return false
      }
      if (probe.isNan() || Number.isNaN(probe.mag)) return false
      localStorage.setItem(toKey, raw)
      return true
    } catch {
      return false
    }
  },

  /** Belirtilen slotu temizler (ana + yedek + karantina anahtarları). */
  deleteSlot(slot: number): void {
    try {
      const key = resolveSlotKey(slot)
      localStorage.removeItem(key)
      localStorage.removeItem(resolveBackupKey(slot))
      localStorage.removeItem(key + QUARANTINE_SUFFIX)
      if (slot === 1) {
        localStorage.removeItem(LEGACY_OLD_KEY)
      }
    } catch {
      // Temizlik yolunda sessiz geç
    }
  },

  exportSave(state: SerializedPlayerState): string {
    const json = JSON.stringify(state)
    return LZString.compressToBase64(json)
  },

  /**
   * Kayıt dizesini içe aktarır. Bulut/import yolları da buradan geçtiği için
   * ADR-0029'daki gelecek sürüm koruması buraya da eklenmiştir: daha yeni bir
   * build'in kaydı (bulut yedeği dahil) içe aktarılmaz, aksi halde deserialize
   * sırasında yeni alanlar sessizce düşerdi.
   */
  importSave(saveString: string): SerializedPlayerState | null {
    if (!saveString || saveString.length > MAX_SAVE_STRING_LENGTH) {
      console.error('İçe aktarma reddedildi: girdi boş veya çok büyük.')
      return null
    }
    try {
      let json = LZString.decompressFromBase64(saveString.trim())
      if (!json) json = saveString.trim()
      if (json.length > MAX_SAVE_STRING_LENGTH) {
        throw new Error('Kayıt içeriği çok büyük')
      }

      const parsed = JSON.parse(json) as SerializedPlayerState
      if (!isShapeSane(parsed)) {
        throw new Error('Kayıt şekli sınır dışı')
      }
      if (!parsed || typeof parsed.matter !== 'string') {
        throw new Error('Geçersiz kayıt formatı')
      }
      const found = readSaveVersion(parsed)
      if (found > SAVE_VERSION) {
        throw new Error(
          `Kayıt sürümü v${found}, bu build v${SAVE_VERSION} destekliyor. Güncelleyerek tekrar dene.`
        )
      }
      if (found < MIN_SUPPORTED_SAVE_VERSION) {
        throw new Error(
          `Kayıt sürümü v${found} artık desteklenmiyor (asgari v${MIN_SUPPORTED_SAVE_VERSION}). İlerleme sıfırlandı.`
        )
      }
      return parsed
    } catch (e) {
      console.error('İçe aktarma hatası:', e)
      return null
    }
  },

  /** İçe aktarılacak metni önceden inceler ve özet bilgiler verir */
  inspectSaveString(saveString: string): InspectResult {
    if (!saveString || !saveString.trim()) {
      return { valid: false, error: 'Kayıt dizesi boş!' }
    }
    if (saveString.length > MAX_SAVE_STRING_LENGTH) {
      return { valid: false, error: 'Kayıt dizesi çok büyük!' }
    }
    try {
      let json = LZString.decompressFromBase64(saveString.trim())
      if (!json) json = saveString.trim()
      if (json.length > MAX_SAVE_STRING_LENGTH) {
        return { valid: false, error: 'Kayıt içeriği çok büyük!' }
      }
      const parsed = JSON.parse(json) as SerializedPlayerState
      if (!isShapeSane(parsed)) {
        return { valid: false, error: 'Kayıt şekli sınır dışı.' }
      }
      if (!parsed || typeof parsed.matter !== 'string') {
        return { valid: false, error: 'Geçersiz kayıt formatı (dopamin verisi bulunamadı).' }
      }
      return {
        valid: true,
        summary: {
          matter: parsed.matter,
          singularities: typeof parsed.singularities === 'number' ? parsed.singularities : parsed.stats?.singularityCount || 0,
          version: typeof parsed.version === 'number' ? parsed.version : 1,
          playtime: parsed.stats?.totalPlaytime || 0,
          stats: {
            clicks: parsed.stats?.manualClicks || 0,
            challenges: parsed.stats?.challengesCompleted || 0
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen ayrıştırma hatası'
      return { valid: false, error: `Ayrıştırma hatası: ${msg}` }
    }
  },

  /** Tüm kayıtları ve slotları kalıcı olarak temizler */
  hardReset(): void {
    const prevSuppressed = saveSuppressed
    saveSuppressed = true
    try {
      localStorage.removeItem(LEGACY_MAIN_KEY)
      localStorage.removeItem(LEGACY_OLD_KEY)
      localStorage.removeItem(ACTIVE_SLOT_KEY)
      ;[1, 2, 3].forEach((slot) => {
        localStorage.removeItem(resolveSlotKey(slot))
        localStorage.removeItem(resolveBackupKey(slot))
        localStorage.removeItem(resolveSlotKey(slot) + QUARANTINE_SUFFIX)
        localStorage.removeItem(`DOOMSCROLL_MOCK_CLOUD_SAVE_${slot}`)
        localStorage.removeItem(`DOOMSCROLL_CLOUD_REV_SLOT_${slot}`)
      })
    } finally {
      saveSuppressed = prevSuppressed
    }
  },

  /** Kayıt yazımını geçici olarak bastırır (import gibi işlemler için). */
  suppressSaves(): void {
    saveSuppressed = true
  },

  /** Bastırmayı kaldırır — saveSuppressed tek yönlü bir bayraktı. */
  resumeSaves(): void {
    saveSuppressed = false
  },

  /** Bastırma durumunu sorgular (arayüz telemetrisi için). */
  get savesSuppressed(): boolean {
    return saveSuppressed
  }
}
