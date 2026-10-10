// Kayit dogrulama ve sanitasyon yardimcilari (deserialize + ayarlar icin).
import { Decimal } from '../../core/math'
import { LAB_SEEDS } from '../../game/lab-data'
import type { BuffType, LabSeedType, StanceType } from '../../models/types'

export function parseSavedDecimal(value: string | number | undefined, fallback: Decimal): Decimal {
  const parsed = new Decimal(value ?? fallback.toString())
  // mag filtresi: break_eternity'de mag log10-mertebedir; 1e9 üstü (≈10^1e9)
  // meşru oyunda asla görülmez, bozuk/şişirilmiş kaydı fallback'e düşürür.
  if (parsed.isNan() || !Number.isFinite(parsed.mag) || parsed.mag > 1e9) {
    return new Decimal(fallback.toString())
  }
  return parsed
}

export function clampSavedNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

export function isValidBuffType(value: unknown): value is BuffType {
  return value === 'fyp' || value === 'heart_frenzy' || value === 'sponsor' || value === 'void' || value === 'espresso' ||
    value === 'planck_surge' || value === 'resonance_boost'
}

/**
 * Özel ses URL'i allowlist: new URL ile parse edilebilmeli, protokol
 * http:/https: olmalı (tercihen https) ve uzunluk 2048'i aşmamalı.
 * Geçemezse boş string döner (müzik motoruna zararlı/uzun URL sızmaz).
 */
export function sanitizeCustomAudioUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 2048) return ''
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
  } catch {
    return ''
  }
  return trimmed
}

export function isValidLabSeedType(value: unknown): value is LabSeedType {
  return typeof value === 'string' && LAB_SEEDS.some((seed) => seed.type === value)
}

// ADR-0029: kayıttan gelen enum değerleri doğrulanmadan state'e yazılmasın.
// currentStance bir switch'te tüketiliyor (bkz. stanceMultipliers); geçersiz bir
// değer tip yanılgısı yaratıyordu.
export const STANCE_TYPES: readonly StanceType[] = ['trend', 'spam', 'private_mode']

export function isValidStanceType(value: unknown): value is StanceType {
  return typeof value === 'string' && STANCE_TYPES.includes(value as StanceType)
}
