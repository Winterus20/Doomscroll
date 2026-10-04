import { Decimal } from '../core/math'

/**
 * Dekad Omurgası (ADR-0032) — oyunun tek pacing kaynağı.
 *
 * Problem: ölçüm (brain/scratchpad/harness/results-308-audit.json) gösterdi ki
 * 13 özellik kilidinin tamamı koşunun 60. dakikasında, yani log10 ≈ 26'da
 * açılıyordu; kalan 257 dakikada (koşunun %81'i) hiçbir yeni içerik gelmiyordu.
 * Dopamin ölçeğiyle bağlı içerik 1e30 ile 1e308 arasında tamamen yoktu.
 *
 * Çözüm: 308 dekadı adlandırılmış bantlara böleriz. Her açılış, başarım ve
 * challenge bir dekad slotuna oturur. 308, oyunun temel birimidir: bir koşu
 * tam olarak 0 → 308 yolculuğudur ve her prestijde yeniden tırmanılır.
 *
 * Bu dosya SAF veri + saf fonksiyonlardır; state'e dokunmaz.
 */

/** Tekillik eşiğinin dekadı: JS float tavanı ve oyunun temel birimi. */
export const ARC_LOG10_MAX = 308

/** İlk tekillik eşiği (matemin ulaşması gereken gerçek sayı). */
export const ARC_SINGULARITY = new Decimal('1.7976931348623157e308')

export interface DecadeBand {
  id: string
  name: string
  /** Alt sınır (log10, dahil). */
  from: number
  /** Üst sınır (log10, hariç). */
  to: number
  /** UI'da gösterilen tek cümlelik anlatı. */
  blurb: string
}

/**
 * Bant genişlikleri erken oyanda dar, geç oyanda geniştir: log10 zamana göre
 * üstel büyür, bu yüzden eşit genişlik bantlar içerik zamanlamasını bozardı.
 * Genişlik yaklaşık ikiye katlanarak "her bantta ~1 içerik" hedefini verir.
 */
export const DECADE_BANDS: DecadeBand[] = [
  {
    id: 'awaken',
    name: 'Uyanış',
    from: 0,
    to: 8,
    blurb: 'Başparmağın uyanıyor. Kedi videoları ve ilk kazançlar.'
  },
  {
    id: 'crisis',
    name: 'Kriz Gecesi',
    from: 8,
    to: 20,
    blurb: 'Algoritma ilk kez sana geri döndü. Gece Krizleri başlıyor.'
  },
  {
    id: 'fabric',
    name: 'Doku',
    from: 20,
    to: 40,
    blurb: 'Ritmin bir düzen buluyor: laboratuvar, tohumlar, vicdan azapları.'
  },
  {
    id: 'resolution',
    name: 'Çözünürlük',
    from: 40,
    to: 70,
    blurb: '720p, 1080p. D5 açılıyor, yama dükkanı rafları doluyor.'
  },
  {
    id: 'automation',
    name: 'Otomasyon',
    from: 70,
    to: 110,
    blurb: 'Artık sen çalıştırmıyorsun. Toplu ve max modu, koloni devrede.'
  },
  {
    id: 'banishment',
    name: 'Sürgü',
    from: 110,
    to: 160,
    blurb: 'D7 ve akış kümeleri. Nöro-Link, 4K HDR. Gece derinleşiyor.'
  },
  {
    id: 'diffusion',
    name: 'Yayılım',
    from: 160,
    to: 210,
    blurb: 'D8 açık, Kozmik çözünürlük. Artık akış senden büyük.'
  },
  {
    id: 'lastspurt',
    name: 'Son Koşu',
    from: 210,
    to: 265,
    blurb: 'Şafağa sayılı dakikalar. Her karar, her sıçrama sonuç veriyor.'
  },
  {
    id: 'threshold',
    name: 'Eşik',
    from: 265,
    to: ARC_LOG10_MAX,
    blurb: '1.79e308. Güneş doğuyor — Sabah 06:00 Çöküşü.'
  }
]

/** Güvenli log10. NaN Decimal break_eternity'de her karşılaştırmada "true" döner. */
export function log10Safe(matter: Decimal): number {
  if (matter.isNan() || Number.isNaN(matter.mag)) return 0
  const l = matter.log10()
  if (l.isNan() || Number.isNaN(l.mag)) return 0
  return l.toNumber()
}

/** Bir log10 değerinin düştüğü bant. */
export function bandForLog10(log10: number): DecadeBand {
  for (let i = DECADE_BANDS.length - 1; i >= 0; i--) {
    if (log10 >= DECADE_BANDS[i].from) return DECADE_BANDS[i]
  }
  return DECADE_BANDS[0]
}

/** Bant içindeki 0..1 ilerleme. */
export function bandProgress01(log10: number, band: DecadeBand = bandForLog10(log10)): number {
  const span = band.to - band.from
  if (span <= 0) return 1
  const p = (log10 - band.from) / span
  return p < 0 ? 0 : p > 1 ? 1 : p
}

/** Koşunun tamamının 0..1 ilerlemesi (0 → 1e308). */
export function arcProgress01(matter: Decimal): number {
  const p = log10Safe(matter) / ARC_LOG10_MAX
  return p < 0 ? 0 : p > 1 ? 1 : p
}

/**
 * Bir dekad eşiğini dopamin kapısı string'ine çevirir.
 * Tek yazım yolu: unlocks.ts ve achievements.ts eşikleri buradan üretilir.
 */
export function decadeGate(exp: number): string {
  return '1e' + String(exp)
}

/** Bir dopamin miktarının log10'unu güvenle döndürür (NaN korumalı). */
export function log10OfDecimal(matter: Decimal): number {
  return log10Safe(matter)
}

/** Sıradaki ondalık basamağın eşiği (UI "sıradaki kilometre taşı" için). */
export function nextDecadeMilestone(matter: Decimal): { exp: number; remaining: Decimal } {
  const log10 = log10Safe(matter)
  const exp = Math.min(ARC_LOG10_MAX, Math.floor(log10) + 1)
  if (exp >= ARC_LOG10_MAX && log10 >= ARC_LOG10_MAX) {
    return { exp, remaining: new Decimal(0) }
  }
  const target = new Decimal('1e' + String(exp))
  const remaining = target.gt(matter) ? target.minus(matter) : new Decimal(0)
  return { exp, remaining }
}

// Dekat bonusları (Decade Surges) denge kararıyla kaldırıldı.

