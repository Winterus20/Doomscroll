import { Decimal, D, type DecimalSource } from './math'

export type NotationType = 'standard' | 'scientific' | 'engineering' | 'logarithm'

const STANDARD_SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc',
  'Vg', 'UVg', 'DVg', 'TVg', 'QaVg', 'QiVg', 'SxVg', 'SpVg', 'OcVg', 'NoVg',
  'Tg', 'UTg', 'DTg', 'TTg', 'QaTg', 'QiTg', 'SxTg', 'SpTg', 'OcTg', 'NoTg',
  'Qd', 'UQd', 'DQd', 'TQd', 'QaQd', 'QiQd', 'SxQd', 'SpQd', 'OcQd', 'NoQd',
  'Qq', 'UQq', 'DQq', 'TQq', 'QaQq', 'QiQq', 'SxQq', 'SpQq', 'OcQq', 'NoQq',
  'Sg', 'USg', 'DSg', 'TSg', 'QaSg', 'QiSg', 'SxSg', 'SpSg', 'OcSg', 'NoSg',
  'St', 'USt', 'DSt', 'TSt', 'QaSt', 'QiSt', 'SxSt', 'SpSt', 'OcSt', 'NoSt',
  'Og', 'UOg', 'DOg', 'TOg', 'QaOg', 'QiOg', 'SxOg', 'SpOg', 'OcOg', 'NoOg',
  'Nn', 'UNn', 'DNn', 'TNn', 'QaNn', 'QiNn', 'SxNn', 'SpNn', 'OcNn', 'NoNn',
  'Ce'
]

export function format(value: DecimalSource, precision = 2, notation: NotationType = 'scientific'): string {
  const dec = D(value)

  if (dec.isNan() || Number.isNaN(dec.mag)) return 'NaN'
  if (!dec.isFinite()) return 'Sonsuz'
  if (dec.sign < 0) return '-' + format(dec.neg(), precision, notation)
  if (dec.eq(0)) return '0'
  if (dec.layer >= 2) return dec.toString()

  // Ones/tens/hundreds: whole numbers only (tr-TR grouping, no fractional part)
  if (dec.lt(1000)) {
    return dec.toNumber().toLocaleString('tr-TR', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    })
  }

  // Standart Harf Notasyonu
  if (notation === 'standard') {
    const exponent = dec.log10().floor().toNumber()
    const suffixIndex = Math.floor(exponent / 3)

    if (suffixIndex < STANDARD_SUFFIXES.length) {
      const mantissa = dec.div(Decimal.pow(10, suffixIndex * 3)).toNumber()
      return `${mantissa.toFixed(precision)} ${STANDARD_SUFFIXES[suffixIndex]}`
    }
    // Suffix bittiğinde scientific'e düş
    return formatScientific(dec, precision)
  }

  // Mühendislik Notasyonu (Üsler daima 3'ün katı)
  if (notation === 'engineering') {
    const exp = dec.log10().floor().toNumber()
    const engExp = Math.floor(exp / 3) * 3
    const mantissa = dec.div(Decimal.pow(10, engExp)).toNumber()
    return `${mantissa.toFixed(precision)}e${engExp}`
  }

  // Logaritmik Notasyon (e12.345)
  if (notation === 'logarithm') {
    const logVal = dec.log10().toNumber()
    return `e${logVal.toFixed(precision)}`
  }

  // Bilimsel Notasyon (Varsayılan: 1.23e45)
  return formatScientific(dec, precision)
}

export function formatNumber(value: DecimalSource, notation: NotationType = 'standard', precision = 2): string {
  return format(value, precision, notation)
}

export type FormatPartKind = 'plain' | 'suffix' | 'exponent'

export interface FormattedParts {
  main: string
  suffix: string
  kind: FormatPartKind
}

// Okunabilirlik: "1.23 M" → { main: "1.23", suffix: "M" },
// "1.23e45" → { main: "1.23", suffix: "e45" }. Sonek ayrı stille çizilir.
export function formatParts(value: DecimalSource, precision = 2, notation: NotationType = 'scientific'): FormattedParts {
  const full = format(value, precision, notation)
  if (notation === 'standard') {
    const idx = full.lastIndexOf(' ')
    if (idx > 0) return { main: full.slice(0, idx), suffix: full.slice(idx + 1), kind: 'suffix' }
    return { main: full, suffix: '', kind: 'plain' }
  }
  if (notation === 'logarithm') {
    const m = /^(-?)e(\d+)(\.\d+)?$/.exec(full)
    if (m) return { main: `${m[1]}e${m[2]}`, suffix: m[3] ?? '', kind: m[3] ? 'exponent' : 'plain' }
    return { main: full, suffix: '', kind: 'plain' }
  }
  // scientific + engineering: 1.23e45 (regex dışı her şey plain düşer)
  const m = /^(-?[\d.,]+)e(-?\d+)$/.exec(full)
  if (m) return { main: m[1], suffix: `e${m[2]}`, kind: 'exponent' }
  return { main: full, suffix: '', kind: 'plain' }
}

function formatScientific(dec: Decimal, precision = 2): string {
  // Tetrasyon veya çok büyük sayılar (layer >= 2)
  if (dec.layer >= 2) {
    return dec.toString()
  }

  const exp = dec.log10().floor().toNumber()
  const mantissa = dec.div(Decimal.pow(10, exp)).toNumber()
  return `${mantissa.toFixed(precision)}e${exp}`
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 60) return `${seconds.toFixed(1)} sn`
  const minutes = Math.floor(seconds / 60)
  const remSec = Math.floor(seconds % 60)
  if (minutes < 60) return `${minutes} dk ${remSec} sn`
  const hours = Math.floor(minutes / 60)
  const remMin = minutes % 60
  if (hours < 24) return `${hours} sa ${remMin} dk`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return `${days} gün ${remHours} sa`
}

export function getMassScaleBadge(value: DecimalSource): string {
  const dec = D(value)
  if (dec.isNan() || Number.isNaN(dec.mag)) return 'Bilinmeyen Ölçek'
  if (dec.lt(1e-6)) return 'Moleküler Kırıntı'
  if (dec.lt(1e0)) return 'Atomaltı Parçacık'
  if (dec.lt(1e6)) return 'Fiziksel Madde'
  if (dec.lt(1e12)) return 'Gökdelen Ölçeği'
  if (dec.lt(1e18)) return 'Everest Dağı'
  if (dec.lt(1e24)) return 'Ay & Okyanuslar'
  if (dec.lt(1e30)) return 'Dünya Gezegeni'
  if (dec.lt(1e36)) return 'Güneş Kütlesi'
  if (dec.lt(1e48)) return 'Samanyolu Galaksisi'
  if (dec.lt(1e56)) return 'Gözlemlenebilir Evren'
  return 'Kozmik Tekillik'
}

