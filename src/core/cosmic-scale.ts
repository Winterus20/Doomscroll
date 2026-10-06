import { Decimal, D, type DecimalSource } from './math'
import { format, type NotationType } from './format'

export interface CosmicPreyTier {
  id: string
  name: string
  icon: string
  massGrams: number // Referans kütle (gram)
  desc: string
}

export const COSMIC_PREY_TIERS: CosmicPreyTier[] = [
  {
    id: 'water_drop',
    name: 'Bir Damla Su',
    icon: '💧',
    massGrams: 0.05,
    desc: 'Moleküler bağlar çözüldü; bir su damlasındaki 1.67 sekstilyon molekül buharlaştı.'
  },
  {
    id: 'paperclip',
    name: 'Metal Ataş',
    icon: '📎',
    massGrams: 1.0,
    desc: 'Evrensel ataş simülasyonunu başlatacak kadar saf kütle tekillikte eridi.'
  },
  {
    id: 'apple',
    name: 'Newton\'ın Elması',
    icon: '🍎',
    massGrams: 150,
    desc: 'Yerçekimini keşfettiren elmanın tüm kütlesi olay ufkunda sonsuzluğa gömüldü.'
  },
  {
    id: 'human',
    name: 'İnsan Vücudu (70 kg)',
    icon: '🧬',
    massGrams: 7e4,
    desc: 'Bir yetişkin insanın tüm biyolojik ve kimyasal kütlesi kuantum çorbasına katıldı.'
  },
  {
    id: 'car',
    name: 'Otomobil (1.5 Ton)',
    icon: '🚗',
    massGrams: 1.5e6,
    desc: 'Bir buçuk tonluk metal ve motor bloğu tekillik tabağında atomaltı parçacıklara ezildi.'
  },
  {
    id: 'whale',
    name: 'Mavi Balina (150 Ton)',
    icon: '🐋',
    massGrams: 1.5e8,
    desc: 'Okyanusların en devasa canlısının tüm kütlesi tek lokmada yutuldu.'
  },
  {
    id: 'pyramid',
    name: 'Büyük Gize Piramidi',
    icon: '🏛️',
    massGrams: 6e11,
    desc: '6 milyon tonluk kireçtaşı blokları tekillikte kuarklarına ayrıştırıldı.'
  },
  {
    id: 'ocean',
    name: 'Dünya Okyanusları',
    icon: '🌊',
    massGrams: 1.4e24,
    desc: 'Dünya üzerindeki 1.3 milyar kilometreküp su bir anda kurutulup tekilliğe aktı.'
  },
  {
    id: 'moon',
    name: 'Ay',
    icon: '🌑',
    massGrams: 7.35e25,
    desc: 'Ay\'ın yerçekimi kilidi kırıldı; Dünya\'da artık ne gelgit ne de gece ışığı kaldı.'
  },
  {
    id: 'earth',
    name: 'Dünya Gezegeni',
    icon: '🌍',
    massGrams: 5.972e27,
    desc: 'Manto, lav çekirdeği ve tüm tektonik plakalar tekillik merkezinde birleşti.'
  },
  {
    id: 'jupiter',
    name: 'Jüpiter Gaz Devi',
    icon: '🪐',
    massGrams: 1.898e30,
    desc: 'Güneş Sistemi\'nin en büyük gezegeni fırtınalarıyla birlikte sindirildi.'
  },
  {
    id: 'sun',
    name: 'Güneş (1 M☉)',
    icon: '☀️',
    massGrams: 1.989e33,
    desc: 'Güneş nükleer füzyonunu tamamlayamadan olay ufku tarafından emilip söndü.'
  },
  {
    id: 'sagittarius_a',
    name: 'Sagittarius A*',
    icon: '🕳️',
    massGrams: 8.26e39,
    desc: 'Samanyolu merkezindeki 4.15 milyon Güneş kütleli dev karadelik atıştırmalığa dönüştü.'
  },
  {
    id: 'ton_618',
    name: 'TON 618 Hiper-Karadeliği',
    icon: '👁️',
    massGrams: 1.31e44,
    desc: '66 milyar Güneş kütleli evrenin en devasa canavarı bile oburluğunuz karşısında cüce kaldı.'
  },
  {
    id: 'milky_way',
    name: 'Samanyolu Galaksisi',
    icon: '🌌',
    massGrams: 1.5e45,
    desc: '400 milyar yıldız ve karanlık madde halesi tek bir noktaya çöktü.'
  },
  {
    id: 'virgo_cluster',
    name: 'Başak Galaksi Kümesi',
    icon: '✨',
    massGrams: 2.4e48,
    desc: 'Binlerce galaksiden oluşan dev kozmik ağ kütleçekimsel midenize çekildi.'
  },
  {
    id: 'universe',
    name: 'Gözlemlenebilir Evren',
    icon: '🔮',
    massGrams: 1.5e56,
    desc: 'Gözlemlenebilir evrenin tüm baryonik maddesi olay ufkunun içine hapsedildi.'
  },
  {
    id: 'multiverse',
    name: 'Kozmik Tekillik (Multiverse)',
    icon: '♾️',
    massGrams: 1e70,
    desc: 'Fizik kuralları iflas etti; kuantum köpüğü ve paralel boyutlar tek bir obur midede birleşti.'
  }
]

export interface CosmicPreyResult {
  currentTier: CosmicPreyTier
  nextTier: CosmicPreyTier | null
  multiplier: Decimal
  multiplierText: string
  progressPct: number
  summaryText: string
}

/**
 * 1. Tasty Planet Av Merdiveni ve Kozmik Kütle Eşdeğerliği
 */
export function calculateCosmicPreyLadder(
  massInput: DecimalSource,
  notation: NotationType = 'scientific'
): CosmicPreyResult {
  const mass = D(massInput)

  if (mass.isNan() || Number.isNaN(mass.mag) || mass.lte(0)) {
    const first = COSMIC_PREY_TIERS[0]
    const second = COSMIC_PREY_TIERS[1]
    return {
      currentTier: first,
      nextTier: second,
      multiplier: new Decimal(0),
      multiplierText: '0 × ' + first.name,
      progressPct: 0,
      summaryText: 'Olay ufku yeni uyanıyor; henüz bir su molekülü bile yutulmadı.'
    }
  }

  let currentIndex = 0
  for (let i = 0; i < COSMIC_PREY_TIERS.length; i++) {
    const tier = COSMIC_PREY_TIERS[i]
    if (mass.gte(tier.massGrams)) {
      currentIndex = i
    } else {
      break
    }
  }

  const currentTier = COSMIC_PREY_TIERS[currentIndex]
  const nextTier = currentIndex < COSMIC_PREY_TIERS.length - 1 ? COSMIC_PREY_TIERS[currentIndex + 1] : null

  const mult = mass.div(currentTier.massGrams)
  let progressPct = 100

  if (nextTier) {
    const logMass = mass.log10().toNumber()
    const logCurr = Math.log10(currentTier.massGrams)
    const logNext = Math.log10(nextTier.massGrams)
    const range = logNext - logCurr
    if (range > 0) {
      progressPct = Math.min(100, Math.max(0, ((logMass - logCurr) / range) * 100))
    }
  }

  const multFormatted = format(mult, 2, notation)
  const multiplierText = `${multFormatted} × ${currentTier.name}`
  const summaryText = currentTier.desc

  return {
    currentTier,
    nextTier,
    multiplier: mult,
    multiplierText,
    progressPct: Math.round(progressPct * 10) / 10,
    summaryText
  }
}

export interface EventHorizonResult {
  radiusMeters: Decimal
  diameterMeters: Decimal
  diameterFormatted: string
  unitName: string
  metaphorText: string
}

/**
 * 2. Schwarzschild Olay Ufku (Gerçek Astrofiziksel Karadelik Çapı)
 * Formül: Rs = 2 * G * M / c^2
 * G = 6.6743e-8 cm^3/(g s^2), c = 2.99792e10 cm/s
 * 2G/c^2 = 1.48518e-28 cm/g = 1.48518e-30 m/g
 * Çap = 2 * Rs = 2.97036e-30 m/g
 */
export function calculateEventHorizon(
  massInput: DecimalSource,
  notation: NotationType = 'scientific'
): EventHorizonResult {
  const mass = D(massInput)

  if (mass.isNan() || Number.isNaN(mass.mag) || mass.lte(0)) {
    return {
      radiusMeters: new Decimal(0),
      diameterMeters: new Decimal(0),
      diameterFormatted: '0 m',
      unitName: 'Planck Sıfırı',
      metaphorText: 'Mikro-karadelik henüz kütlesel olay ufkuna sahip değil.'
    }
  }

  const RS_FACTOR = new Decimal('1.48518e-30')
  const DIAMETER_FACTOR = new Decimal('2.97036e-30')

  const radiusMeters = mass.times(RS_FACTOR)
  const diameterMeters = mass.times(DIAMETER_FACTOR)

  // Metre cinsinden büyüklük sınıflandırması
  let diameterFormatted = ''
  let unitName = ''
  let metaphorText = ''

  if (diameterMeters.lt('1e-18')) {
    // Sub-attometre
    diameterFormatted = `${format(diameterMeters.times('1e21'), 2, notation)} Zeptometre`
    unitName = 'Kuantum Köpüğü'
    metaphorText = 'Protonun milyarda biri! Planck duvarını yırtan bir kuantum girdabı.'
  } else if (diameterMeters.lt('1e-15')) {
    diameterFormatted = `${format(diameterMeters.times('1e18'), 2, notation)} Attometre`
    unitName = 'Kuark Ölçeği'
    metaphorText = 'Kuarkların titreştiği mikroskobik ölçekte bir kütleçekim deliği.'
  } else if (diameterMeters.lt('1e-12')) {
    diameterFormatted = `${format(diameterMeters.times('1e15'), 2, notation)} Femtometre`
    unitName = 'Proton Çapı'
    metaphorText = 'Tekillik tam bir atom çekirdeği genişliğinde titreşiyor.'
  } else if (diameterMeters.lt('1e-9')) {
    diameterFormatted = `${format(diameterMeters.times('1e12'), 2, notation)} Pikometre`
    unitName = 'Atomik Ölçek'
    metaphorText = 'Bir hidrojen atomunun yarıçapı kadar mikro-karadelik.'
  } else if (diameterMeters.lt('1e-6')) {
    diameterFormatted = `${format(diameterMeters.times('1e9'), 2, notation)} Nanometre`
    unitName = 'DNA Sarmalı'
    metaphorText = 'Bir DNA molekülü genişliğinde karanlık tekillik.'
  } else if (diameterMeters.lt('1e-3')) {
    diameterFormatted = `${format(diameterMeters.times('1e6'), 2, notation)} Mikrometre`
    unitName = 'Hücre Ölçeği'
    metaphorText = 'Bir bakteri hücresi boyutuna erişti; kütle emişi hızlanıyor.'
  } else if (diameterMeters.lt('0.05')) {
    // 1 mm - 5 cm (Dünya kütlesi ~ 1.77 cm çap)
    const mm = diameterMeters.times(1000).toNumber()
    diameterFormatted = `${mm.toFixed(1)} Milimetre`
    unitName = 'Fındık / Cam Bilye'
    metaphorText = 'Büyüleyici astrofizik: Dünya\'nın tüm kütlesi bu boyutlu bir bilyeye sıkışabilir!'
  } else if (diameterMeters.lt(1)) {
    const cm = diameterMeters.times(100).toNumber()
    diameterFormatted = `${cm.toFixed(1)} Santimetre`
    unitName = 'Futbol Topu'
    metaphorText = 'Bir spor topu büyüklüğünde doymak bilmez olay ufku.'
  } else if (diameterMeters.lt(1000)) {
    const m = diameterMeters.toNumber()
    diameterFormatted = `${m.toFixed(1)} Metre`
    unitName = 'Gökdelen / Stadyum'
    metaphorText = 'Bir stadyum genişliğinde uzay-zaman çöküş tüneli.'
  } else if (diameterMeters.lt('1e6')) {
    // 1 km - 1,000 km (Güneş kütlesi ~ 5.9 km çap)
    const km = diameterMeters.div(1000).toNumber()
    diameterFormatted = `${km.toFixed(1)} Kilometre`
    unitName = 'Kasaba / Şehir'
    metaphorText = 'Güneş kütlesindeki bir yıldızın çöktüğünde oluşturacağı gerçek karadelik çapı!'
  } else if (diameterMeters.lt('1.496e11')) {
    // < 1 AU
    const thousandKm = diameterMeters.div('1e6').toNumber()
    diameterFormatted = `${thousandKm.toFixed(0)} Bin Km`
    unitName = 'Gezegenler Arası'
    metaphorText = 'Ay ile Dünya arasındaki mesafeyi yutan devasa karanlık küre.'
  } else if (diameterMeters.lt('9.461e15')) {
    // 1 AU - 1 Işık yılı
    const au = diameterMeters.div('1.496e11').toNumber()
    diameterFormatted = `${au.toFixed(1)} AU (Güneş-Dünya Mesafesi)`
    unitName = 'Güneş Sistemi'
    metaphorText = 'Güneş Sistemi\'nin sınırlarını aşan hiper-kütleli olay ufku.'
  } else {
    // Işık yılı ve ötesi
    const ly = diameterMeters.div('9.461e15')
    diameterFormatted = `${format(ly, 2, notation)} Işık Yılı`
    unitName = 'Galaktik Tekillik'
    metaphorText = 'Evrenin dokusunu paramparça eden trilyonlarca ışık yıllık hiper-uzay oburluğu!'
  }

  return {
    radiusMeters,
    diameterMeters,
    diameterFormatted,
    unitName,
    metaphorText
  }
}

export interface WritingParadoxResult {
  digits: Decimal
  digitsFormatted: string
  writingTimeFormatted: string
  countingUniverseAgesFormatted: string
  paperLengthFormatted: string
  humorousQuote: string
}

/**
 * 3. Çifte Zaman Paradoksu (Antimatter Dimensions Modeli + Kozmik Sayma)
 * Metrik A: Basamakları 3 rakam/sn hızla yazma süresi
 * Metrik B: Kütleyi saniyede 1 gram tek tek sayma süresi (Evrenin yaşı katı)
 * Metrik C: 10 puntoyla kağıda yazılsa oluşacak kağıt şeridi uzunluğu
 */
export function calculateWritingParadox(
  massInput: DecimalSource,
  notation: NotationType = 'scientific'
): WritingParadoxResult {
  const mass = D(massInput)

  if (mass.isNan() || Number.isNaN(mass.mag) || mass.lte(0)) {
    return {
      digits: new Decimal(1),
      digitsFormatted: '1 basamak',
      writingTimeFormatted: '0 saniye',
      countingUniverseAgesFormatted: '0',
      paperLengthFormatted: '0 mm',
      humorousQuote: 'Henüz yazılacak bir kütle değeri yok.'
    }
  }

  // A) Basamak sayısı: floor(log10(mass)) + 1
  let digits: Decimal
  if (mass.lt(1)) {
    digits = new Decimal(1)
  } else {
    digits = Decimal.floor(mass.log10()).plus(1)
  }

  const digitsFormatted = format(digits, 0, notation) + ' basamak'

  // B) Yazma süresi (saniyede 3 basamak)
  const writingSec = digits.div(3)
  const writingTimeFormatted = formatWritingTime(writingSec, notation)

  // C) Tek tek sayma süresi (her saniye 1 gram saysanız)
  // 1 Evren Ömrü = 13.8 Milyar Yıl = 13.8e9 * 365.25 * 86400 ≈ 4.3549e17 saniye
  const UNIVERSE_AGE_SECONDS = new Decimal('4.3549e17')
  const universeAges = mass.div(UNIVERSE_AGE_SECONDS)
  let countingUniverseAgesFormatted = ''

  if (universeAges.lt(0.001)) {
    countingUniverseAgesFormatted = '1 saniyeden az'
  } else if (universeAges.lt(1)) {
    countingUniverseAgesFormatted = `%${(universeAges.toNumber() * 100).toFixed(2)} Evren Yaşı`
  } else {
    countingUniverseAgesFormatted = `${format(universeAges, 2, notation)} × Evrenin Yaşı (13.8 Milyar Yıl)`
  }

  // D) Kağıt şeridi (Basamak başına 2.5 mm genişlik)
  const paperLengthMeters = digits.times(0.0025)
  let paperLengthFormatted = ''
  if (paperLengthMeters.lt(1)) {
    paperLengthFormatted = `${(paperLengthMeters.toNumber() * 1000).toFixed(0)} mm`
  } else if (paperLengthMeters.lt(1000)) {
    paperLengthFormatted = `${paperLengthMeters.toNumber().toFixed(1)} Metre`
  } else if (paperLengthMeters.lt(40075000)) {
    // 40,075 km = Dünya çevresi
    const km = paperLengthMeters.div(1000).toNumber()
    paperLengthFormatted = `${km.toFixed(1)} Kilometre`
  } else {
    const earthRounds = paperLengthMeters.div(40075000)
    paperLengthFormatted = `${format(earthRounds, 2, notation)} × Dünya Çevresi`
  }

  // E) Antimatter Dimensions tarzı hicivli not
  let humorousQuote = ''
  const digitsNum = digits.toNumber()
  if (digitsNum <= 10) {
    humorousQuote = 'Bir fişin arkasına saniyeler içinde karalanabilir.'
  } else if (digitsNum <= 100) {
    humorousQuote = 'Kahve soğumadan kâğıda dökülebilir bir kütle.'
  } else if (digitsNum <= 309) {
    humorousQuote = `1.79e308 g kütleyi yazmak ${writingTimeFormatted} sürer; ancak sayının kendisini evrende depolamak tüm atomları tüketirdi!`
  } else {
    humorousQuote = 'Bu sayıyı tek tek elle yazmak evrenin başlangıcından bu yana geçen süreden daha uzun sürerdi!'
  }

  return {
    digits,
    digitsFormatted,
    writingTimeFormatted,
    countingUniverseAgesFormatted,
    paperLengthFormatted,
    humorousQuote
  }
}

function formatWritingTime(sec: Decimal, notation: NotationType): string {
  if (sec.lt(60)) {
    return `${sec.toNumber().toFixed(0)} saniye`
  }
  if (sec.lt(3600)) {
    const s = sec.toNumber()
    const m = Math.floor(s / 60)
    const remS = Math.round(s % 60)
    return `${m} dk ${remS} sn`
  }
  if (sec.lt(86400)) {
    const s = sec.toNumber()
    const h = Math.floor(s / 3600)
    const remM = Math.round((s % 3600) / 60)
    return `${h} sa ${remM} dk`
  }
  if (sec.lt(31536000)) {
    // < 1 yıl
    const s = sec.toNumber()
    const d = Math.floor(s / 86400)
    const remH = Math.round((s % 86400) / 3600)
    return `${d} gün ${remH} sa`
  }

  const SEC_PER_YEAR = 31536000
  const years = sec.div(SEC_PER_YEAR)

  if (years.lt(1e6)) {
    return `${format(years, 1, notation)} Yıl`
  }

  const UNIVERSE_AGE_YEARS = 1.38e10
  if (years.lt(UNIVERSE_AGE_YEARS)) {
    return `${format(years, 2, notation)} Yıl`
  }

  const universeMultiplier = years.div(UNIVERSE_AGE_YEARS)
  return `${format(universeMultiplier, 2, notation)} × Evrenin Yaşı (13.8 Milyar Yıl)`
}
