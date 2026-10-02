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

  // 1000'den küçük sayılar için standart gösterim
  if (dec.lt(1000)) {
    return dec.toNumber().toLocaleString('tr-TR', {
      maximumFractionDigits: precision,
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
