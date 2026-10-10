/**
 * Kayit serilestirme yardimcilari: LZ-String sikistirma, cozumleme ve sekil denetimi.
 */
import LZString from "lz-string"
import type { SerializedPlayerState } from "../../models/types"

/** Fazla büyük girdi (LZ ham veya sıkıştırılmış) reddedilir — bellek şişirme koruması. */
export const MAX_SAVE_STRING_LENGTH = 500_000
/** Ayrıştırılmış kaydın üst seviye anahtar sayısı üst sınırı. */
export const MAX_SAVE_TOP_LEVEL_KEYS = 200
/** Ayrıştırılmış kayıttaki herhangi bir dizinin uzunluk üst sınırı. */
export const MAX_SAVE_ARRAY_LENGTH = 5000

export function isShapeSane(parsed: unknown): boolean {
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

export function tryParseRaw(raw: string | null): SerializedPlayerState | null {
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

/** Oyuncu durumunu kayit dizesine serilestirir (JSON + LZ-String Base64). */
export function serializeState(state: SerializedPlayerState): string {
  const json = JSON.stringify(state)
  return LZString.compressToBase64(json)
}
