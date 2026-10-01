import type { MusicTrackId } from '../models/types'

export interface MusicTrackInfo {
  id: MusicTrackId
  name: string
  subtitle: string
  icon: string
  bpm: number
  description: string
}

export const MUSIC_TRACKS: MusicTrackInfo[] = [
  {
    id: 'lofi_chill',
    name: '02:47 AM Lo-Fi Chill',
    subtitle: 'Yorgan Altı & Rhodes Melankolisi',
    icon: '🌙',
    bpm: 76,
    description: 'Caz 7li/9lu Auto-DJ (ii-V-I-vi), %58 swing, Rhodes + tape wobble ve yağmur dokusu.'
  },
  {
    id: 'synthwave',
    name: 'Cyberpunk Midnight',
    subtitle: 'Neon Şehir • Am-F-C-G • 112 BPM',
    icon: '🌌',
    bpm: 112,
    description: 'Juno chorus + gated snare, dotted-8th lead, verse-chorus-breakdown akışı ve neon yağmur.'
  },
  {
    id: 'ambient_drone',
    name: 'Interstellar Deep Sleep',
    subtitle: 'Elite + Zimmer + Astroneer • Org + Koro • Balina Uğultusu',
    icon: '🪐',
    bpm: 46,
    description: 'Uyku radyosu best: nefesli boru orgu, insan korosu, Shepard inişi, pulsar ve müzik kutusu ninni.'
  },
  {
    id: 'subway_groove',
    name: 'Subway Beats & Groove',
    subtitle: 'Viral Akış & Taktil Ritim',
    icon: '🛹',
    bpm: 88,
    description: 'Senkoplu funk bas, ghost snare ve swingli groove.'
  },
  {
    id: 'custom',
    name: 'Özel Akış / Web Radyo',
    subtitle: 'Harici MP3 veya Stream Bağlantısı',
    icon: '📻',
    bpm: 0,
    description: 'Kullanıcının belirlediği harici lofi radyo veya müzik bağlantısı.'
  }
]

// Müzikal Notalar ve Frekans Tablosu (Hz) — caz + Lidyen uzay uzatmaları
const NOTES: Record<string, number> = {
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  Fs2: 92.5,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  Fs3: 185.0,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  Fs5: 739.99,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
  A6: 1760.0,
  B6: 1975.53
}

class MusicEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private compressor: DynamicsCompressorNode | null = null
  private filterNode: BiquadFilterNode | null = null
  private duckGain: GainNode | null = null
  private delayNode: DelayNode | null = null
  private delayGain: GainNode | null = null
  private reverbNode: ConvolverNode | null = null
  private reverbGain: GainNode | null = null
  private crackleGain: GainNode | null = null
  private crackleSource: AudioBufferSourceNode | null = null
  private rainGain: GainNode | null = null
  private rainSource: AudioBufferSourceNode | null = null
  private tapeLfo: OscillatorNode | null = null
  private tapeLfoGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private pinkBuffer: AudioBuffer | null = null
  private brownBuffer: AudioBuffer | null = null

  // Deep Sleep radyo yatağı: sürekli pembe + kahve + okyanus (adım değil, kesintisiz akış)
  // Interstellar katman: gemi motoru vuruşu + yıldız parıltısı (shimmer)
  private sleepPinkSrc: AudioBufferSourceNode | null = null
  private sleepPinkGain: GainNode | null = null
  private sleepBrownSrc: AudioBufferSourceNode | null = null
  private sleepBrownGain: GainNode | null = null
  private sleepOceanSrc: AudioBufferSourceNode | null = null
  private sleepOceanGain: GainNode | null = null
  private sleepSubOsc: OscillatorNode | null = null
  private sleepSubGain: GainNode | null = null
  private sleepEngineOsc: OscillatorNode | null = null
  private sleepEngineGain: GainNode | null = null
  private sleepShimmerSrc: AudioBufferSourceNode | null = null
  private sleepShimmerGain: GainNode | null = null
  private sleepBedRunning = false
  private ambientChordPos = 0

  // Harici MP3/Stream desteği için audio elementi
  private externalAudio: HTMLAudioElement | null = null

  public enabled = true
  public volume = 0.35
  public currentTrack: MusicTrackId = 'lofi_chill'
  public vinylCrackle = true
  public rainEnabled = true
  public rainLevel = 0.5
  public customUrl = ''
  public intensity = 0.5

  // Uyku zamanlayıcısı (Clouds Radio usulü: süre bitince yumuşak fade-out)
  public sleepMinutesRemaining = 0
  private sleepTickId: number | null = null

  // Lookahead Scheduler ("A Tale of Two Clocks")
  private isPlaying = false
  private schedulerTimer: number | null = null
  private nextNoteTime = 0
  private currentStep = 0
  private loopCount = 0
  private readonly lookaheadMs = 25
  private readonly scheduleAheadTime = 0.12 // 120ms ileriye programla

  // Visualizer için veri tamponu
  private visualizerDataArray: Uint8Array<ArrayBuffer> | null = null

  constructor() {
    // Tarayıcı ortamında Audio elementini başlat
    if (typeof window !== 'undefined') {
      this.externalAudio = new Audio()
      this.externalAudio.loop = true
      this.externalAudio.crossOrigin = 'anonymous'
    }
  }

  // -------------------------------------------------------------
  // KURULUM
  // -------------------------------------------------------------

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return null
      this.ctx = new AudioCtx()

      // 1. Master chain: Filter -> Duck -> Compressor -> Master -> Analyser -> Out
      // En iyi lo-fi sırrı: master low-pass 8-12kHz değil, Rhodes parlaklığı için
      // 3.8-5.6kHz bandında tutulur; sıcaklık alttan gelir, üstten değil.
      this.filterNode = this.ctx.createBiquadFilter()
      this.filterNode.type = 'lowpass'
      this.filterNode.frequency.setValueAtTime(3800 + this.intensity * 1800, this.ctx.currentTime)
      this.filterNode.Q.setValueAtTime(0.7, this.ctx.currentTime)

      // Tape wobble: filtre kesimini çok yavaş gezdirir (pencerede yağmur hissi)
      this.tapeLfo = this.ctx.createOscillator()
      this.tapeLfoGain = this.ctx.createGain()
      this.tapeLfo.type = 'sine'
      this.tapeLfo.frequency.setValueAtTime(0.13, this.ctx.currentTime)
      this.tapeLfoGain.gain.setValueAtTime(140, this.ctx.currentTime)
      this.tapeLfo.connect(this.tapeLfoGain)
      this.tapeLfoGain.connect(this.filterNode.frequency)
      this.tapeLfo.start()

      this.duckGain = this.ctx.createGain()
      this.duckGain.gain.setValueAtTime(1.0, this.ctx.currentTime)

      this.compressor = this.ctx.createDynamicsCompressor()
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime)
      this.compressor.knee.setValueAtTime(20, this.ctx.currentTime)
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime)
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime)
      this.compressor.release.setValueAtTime(0.24, this.ctx.currentTime)

      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(this.enabled ? this.volume : 0.0001, this.ctx.currentTime)

      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 128
      this.analyser.smoothingTimeConstant = 0.82
      this.visualizerDataArray = new Uint8Array(this.analyser.frequencyBinCount)

      this.filterNode.connect(this.duckGain)
      this.duckGain.connect(this.compressor)
      this.compressor.connect(this.masterGain)
      this.masterGain.connect(this.analyser)
      this.analyser.connect(this.ctx.destination)

      // 2. Convolution Reverb (üretilmiş stereo impulse)
      this.reverbNode = this.ctx.createConvolver()
      this.reverbNode.buffer = this.makeImpulse(2.2, 2.8)
      this.reverbGain = this.ctx.createGain()
      this.reverbGain.gain.setValueAtTime(0.32, this.ctx.currentTime)
      this.reverbNode.connect(this.reverbGain)
      this.reverbGain.connect(this.compressor)

      // 3. Stereo Ambient Space Delay
      this.delayNode = this.ctx.createDelay(2.0)
      this.delayGain = this.ctx.createGain()
      this.delayNode.delayTime.setValueAtTime(0.38, this.ctx.currentTime)
      this.delayGain.gain.setValueAtTime(0.22, this.ctx.currentTime)
      this.delayNode.connect(this.delayGain)
      this.delayGain.connect(this.delayNode)
      // Delay çıkışı hem filtreye (sıcaklık) hem reverbe (derinlik) gider
      this.delayGain.connect(this.filterNode)
      this.delayGain.connect(this.reverbNode)

      // 4. Paylaşılan gürültü tamponu (davullar için)
      this.ensureNoiseBuffer()

      // 5. Vinil / Kaset Cızırtısı
      this.setupVinylCrackle()

      // 6. Yağmur + oda tonu (hissedilir, duyulmaz: muteleyince fark edilir)
      this.setupRainAmbience()

      // 7. Deep Sleep kesintisiz yatak (pembe + kahve + okyanus + sub)
      this.setupSleepBed()
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }

    return this.ctx
  }

  // Stereo azalan gürültü impulse response (oda simülasyonu)
  private makeImpulse(durationSec: number, decay: number): AudioBuffer | null {
    if (!this.ctx) return null
    const rate = this.ctx.sampleRate
    const len = Math.floor(rate * durationSec)
    const impulse = this.ctx.createBuffer(2, len, rate)
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        const t = i / len
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay)
      }
    }
    return impulse
  }

  private ensureNoiseBuffer(): void {
    if (!this.ctx || this.noiseBuffer) return
    const len = this.ctx.sampleRate * 2
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1
    }
  }

  // Pembe Gürültü + Mikro Plak Kıvılcımları ile Vinil Cızırtısı
  private setupVinylCrackle() {
    if (!this.ctx || !this.masterGain) return

    const bufferSize = this.ctx.sampleRate * 2
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)

    let b0 = 0
    let b1 = 0
    let b2 = 0
    let b3 = 0
    let b4 = 0
    let b5 = 0
    let b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
      b6 = white * 0.115926

      if (Math.random() < 0.00035) {
        pink += (Math.random() > 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.7)
      }
      data[i] = pink * 0.03
    }

    this.crackleSource = this.ctx.createBufferSource()
    this.crackleSource.buffer = buffer
    this.crackleSource.loop = true

    const crackleFilter = this.ctx.createBiquadFilter()
    crackleFilter.type = 'bandpass'
    crackleFilter.frequency.value = 1600
    crackleFilter.Q.value = 1.2

    this.crackleGain = this.ctx.createGain()
    const targetGain = this.enabled && this.vinylCrackle ? 0.06 : 0.0001
    this.crackleGain.gain.setValueAtTime(targetGain, this.ctx.currentTime)

    this.crackleSource.connect(crackleFilter)
    crackleFilter.connect(this.crackleGain)
    this.crackleGain.connect(this.masterGain)

    this.crackleSource.start(0)
  }

  // Yağmur + oda tonu: lo-fi'nin "pencerede yağmur" katmanı.
  // Kural: tek başına duyulmaz, kapatınca boşluk hissedilir.
  private setupRainAmbience() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return

    this.rainSource = this.ctx.createBufferSource()
    this.rainSource.buffer = this.noiseBuffer
    this.rainSource.loop = true

    const rainFilter = this.ctx.createBiquadFilter()
    rainFilter.type = 'lowpass'
    rainFilter.frequency.value = 900
    rainFilter.Q.value = 0.4

    const rainHigh = this.ctx.createBiquadFilter()
    rainHigh.type = 'highpass'
    rainHigh.frequency.value = 250

    this.rainGain = this.ctx.createGain()
    this.updateRainState(true)

    // Yavaş kabarma: 11 saniyede nefes alır
    const swellLfo = this.ctx.createOscillator()
    const swellGain = this.ctx.createGain()
    swellLfo.type = 'sine'
    swellLfo.frequency.value = 0.09
    swellGain.gain.value = 0.006
    swellLfo.connect(swellGain)
    swellGain.connect(this.rainGain.gain)
    swellLfo.start()

    this.rainSource.connect(rainFilter)
    rainFilter.connect(rainHigh)
    rainHigh.connect(this.rainGain)
    this.rainGain.connect(this.masterGain)
    this.sendToReverb(this.rainGain)

    this.rainSource.start(0, Math.random())
    this.cleanup(this.rainSource, rainFilter, rainHigh)
  }

  private updateRainState(immediate = false) {
    if (!this.rainGain || !this.ctx) return
    const audible = this.enabled && this.rainEnabled && this.isPlaying && this.currentTrack !== 'custom'
    // yağmur seviyesi 0-1 -> gain 0.0001-0.035 (cızırtının yarısı kadar)
    // Synthwave'de neon yağmur %45 kısık tutulur (uzay + arpej netliği için)
    // Deep Sleep'te yağmur okyanus yatağına yer açmak için %60 kısık tutulur
    const trackDuck = this.currentTrack === 'synthwave' ? 0.45 : this.currentTrack === 'ambient_drone' ? 0.6 : 1.0
    const target = audible ? (0.004 + this.rainLevel * 0.031) * trackDuck : 0.0001
    if (immediate) {
      this.rainGain.gain.setValueAtTime(target, this.ctx.currentTime)
    } else {
      this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.6)
    }
  }

  // -------------------------------------------------------------
  // DEEP SLEEP KESİNTİSİZ YATAK — Best Version çekirdeği
  // Bilim: pembe gürültü derin uykuyu uzatır, kahve kaygıyı indirir,
  // sabit taban ani sesleri maskeler. Adımla değil, sürekli akar.
  // 4 katman: pembe + kahve + okyanus + sub drone (55Hz hissi).
  // -------------------------------------------------------------
  private ensureColoredBuffers(): void {
    if (!this.ctx) return
    const rate = this.ctx.sampleRate
    if (!this.pinkBuffer) {
      const len = rate * 4
      this.pinkBuffer = this.ctx.createBuffer(1, len, rate)
      const data = this.pinkBuffer.getChannelData(0)
      let b0 = 0
      let b1 = 0
      let b2 = 0
      let b3 = 0
      let b4 = 0
      let b5 = 0
      let b6 = 0
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.969 * b2 + white * 0.153852
        b3 = 0.8665 * b3 + white * 0.3104856
        b4 = 0.55 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.016898
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
        b6 = white * 0.115926
        data[i] = pink * 0.22
      }
    }
    if (!this.brownBuffer) {
      const len = rate * 4
      this.brownBuffer = this.ctx.createBuffer(1, len, rate)
      const data = this.brownBuffer.getChannelData(0)
      let last = 0
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.2
      }
    }
  }

  private setupSleepBed(): void {
    if (!this.ctx || !this.masterGain || this.sleepBedRunning) return
    this.ensureColoredBuffers()
    if (!this.ctx || !this.masterGain || !this.pinkBuffer || !this.brownBuffer || !this.noiseBuffer) return
    const ctx = this.ctx

    // 1. Pembe taban: yumuşak, doğal (yağmur / yaprak hissi)
    this.sleepPinkSrc = ctx.createBufferSource()
    this.sleepPinkSrc.buffer = this.pinkBuffer
    this.sleepPinkSrc.loop = true
    const pinkFilter = ctx.createBiquadFilter()
    pinkFilter.type = 'lowpass'
    pinkFilter.frequency.value = 1400
    pinkFilter.Q.value = 0.3
    this.sleepPinkGain = ctx.createGain()
    this.sleepPinkGain.gain.setValueAtTime(0.0001, ctx.currentTime)
    // Nefes LFO: 14 saniyede bir şiş-in (uyku nefesiyle senkron)
    const pinkLfo = ctx.createOscillator()
    const pinkLfoGain = ctx.createGain()
    pinkLfo.type = 'sine'
    pinkLfo.frequency.value = 0.07
    pinkLfoGain.gain.value = 0.004
    pinkLfo.connect(pinkLfoGain)
    pinkLfoGain.connect(this.sleepPinkGain.gain)
    pinkLfo.start()
    this.sleepPinkSrc.connect(pinkFilter)
    pinkFilter.connect(this.sleepPinkGain)
    this.sleepPinkGain.connect(this.masterGain)
    this.sendToReverb(this.sleepPinkGain)
    this.sleepPinkSrc.start(0, Math.random() * 2)
    this.cleanup(this.sleepPinkSrc, pinkFilter)

    // 2. Kahve taban: gemi motoru uğultusu (trafik / kombi / anksiyete maskesi)
    // Interstellar: filtre daha koyu (320Hz), motor nefesi LFO ile devir yapar
    this.sleepBrownSrc = ctx.createBufferSource()
    this.sleepBrownSrc.buffer = this.brownBuffer
    this.sleepBrownSrc.loop = true
    const brownFilter = ctx.createBiquadFilter()
    brownFilter.type = 'lowpass'
    brownFilter.frequency.value = 320
    brownFilter.Q.value = 0.4
    this.sleepBrownGain = ctx.createGain()
    this.sleepBrownGain.gain.setValueAtTime(0.0001, ctx.currentTime)
    const engineLfo = ctx.createOscillator()
    const engineLfoGain = ctx.createGain()
    engineLfo.type = 'sine'
    engineLfo.frequency.value = 0.05
    engineLfoGain.gain.value = 0.008
    engineLfo.connect(engineLfoGain)
    engineLfoGain.connect(this.sleepBrownGain.gain)
    engineLfo.start()
    this.sleepBrownSrc.connect(brownFilter)
    brownFilter.connect(this.sleepBrownGain)
    this.sleepBrownGain.connect(this.masterGain)
    this.sleepBrownSrc.start(0, Math.random() * 2)
    this.cleanup(this.sleepBrownSrc, brownFilter)

    // 3. Okyanus swell: bant geçiren gürültü, dalga gibi kabarır
    this.sleepOceanSrc = ctx.createBufferSource()
    this.sleepOceanSrc.buffer = this.noiseBuffer
    this.sleepOceanSrc.loop = true
    const oceanFilter = ctx.createBiquadFilter()
    oceanFilter.type = 'bandpass'
    oceanFilter.frequency.value = 700
    oceanFilter.Q.value = 0.6
    this.sleepOceanGain = ctx.createGain()
    this.sleepOceanGain.gain.setValueAtTime(0.0001, ctx.currentTime)
    const oceanLfo = ctx.createOscillator()
    const oceanLfoGain = ctx.createGain()
    oceanLfo.type = 'sine'
    oceanLfo.frequency.value = 0.08
    oceanLfoGain.gain.value = 0.008
    oceanLfo.connect(oceanLfoGain)
    oceanLfoGain.connect(this.sleepOceanGain.gain)
    // Filtre de dalgayla gezer: 500 -> 950 -> 500
    const oceanFilterLfo = ctx.createOscillator()
    const oceanFilterLfoGain = ctx.createGain()
    oceanFilterLfo.type = 'sine'
    oceanFilterLfo.frequency.value = 0.08
    oceanFilterLfoGain.gain.value = 220
    oceanFilterLfo.connect(oceanFilterLfoGain)
    oceanFilterLfoGain.connect(oceanFilter.frequency)
    oceanLfo.start()
    oceanFilterLfo.start()
    this.sleepOceanSrc.connect(oceanFilter)
    oceanFilter.connect(this.sleepOceanGain)
    this.sleepOceanGain.connect(this.masterGain)
    this.sendToReverb(this.sleepOceanGain)
    this.sleepOceanSrc.start(0, Math.random())
    this.cleanup(this.sleepOceanSrc, oceanFilter)

    // 4. Sub drone: 55Hz sabit his (duyulmaz, hissedilir)
    // Interstellar gemi çekirdeği: 55Hz + 55.6Hz çift osilatör -> 0.6Hz vuruş
    // Motor devri gibi yavaşça throb yapar, uykuyu bozmaz
    this.sleepSubOsc = ctx.createOscillator()
    this.sleepSubOsc.type = 'sine'
    this.sleepSubOsc.frequency.setValueAtTime(55, ctx.currentTime)
    this.sleepSubGain = ctx.createGain()
    this.sleepSubGain.gain.setValueAtTime(0.0001, ctx.currentTime)
    this.sleepSubOsc.connect(this.sleepSubGain)
    if (this.masterGain) this.sleepSubGain.connect(this.masterGain)
    this.sleepSubOsc.start()
    this.cleanup(this.sleepSubOsc, this.sleepSubGain)

    this.sleepEngineOsc = ctx.createOscillator()
    this.sleepEngineOsc.type = 'sine'
    this.sleepEngineOsc.frequency.setValueAtTime(55.6, ctx.currentTime)
    this.sleepEngineGain = ctx.createGain()
    this.sleepEngineGain.gain.setValueAtTime(0.0001, ctx.currentTime)
    this.sleepEngineOsc.connect(this.sleepEngineGain)
    if (this.masterGain) this.sleepEngineGain.connect(this.masterGain)
    this.sleepEngineOsc.start()
    this.cleanup(this.sleepEngineOsc, this.sleepEngineGain)

    // 5. Yıldız parıltısı: çok tiz, çok kısık hava (shimmer-verb hissi)
    // Ana low-pass filtreden geçmez, doğrudan master + reverbe gider
    this.sleepShimmerSrc = ctx.createBufferSource()
    this.sleepShimmerSrc.buffer = this.pinkBuffer
    this.sleepShimmerSrc.loop = true
    this.sleepShimmerSrc.playbackRate.value = 1.7
    const shimmerFilter = ctx.createBiquadFilter()
    shimmerFilter.type = 'highpass'
    shimmerFilter.frequency.value = 6800
    this.sleepShimmerGain = ctx.createGain()
    this.sleepShimmerGain.gain.setValueAtTime(0.0001, ctx.currentTime)
    const shimmerLfo = ctx.createOscillator()
    const shimmerLfoGain = ctx.createGain()
    shimmerLfo.type = 'sine'
    shimmerLfo.frequency.value = 0.06
    shimmerLfoGain.gain.value = 0.0012
    shimmerLfo.connect(shimmerLfoGain)
    shimmerLfoGain.connect(this.sleepShimmerGain.gain)
    shimmerLfo.start()
    this.sleepShimmerSrc.connect(shimmerFilter)
    shimmerFilter.connect(this.sleepShimmerGain)
    if (this.masterGain) this.sleepShimmerGain.connect(this.masterGain)
    this.sendToReverb(this.sleepShimmerGain)
    this.sleepShimmerSrc.start(0, Math.random() * 2)
    this.cleanup(this.sleepShimmerSrc, shimmerFilter)

    this.sleepBedRunning = true
    this.updateSleepBedState(true)
  }

  private updateSleepBedState(immediate = false): void {
    if (!this.ctx || !this.sleepPinkGain || !this.sleepBrownGain || !this.sleepOceanGain || !this.sleepSubGain) return
    const t = this.ctx.currentTime
    // Sadece ambient_drone parçasında + çalarken + ses açıkken duyulur
    const active = this.enabled && this.isPlaying && this.currentTrack === 'ambient_drone'
    // rainLevel nebulayı, intensity motor gücünü yönetir (myNoise sürgü mantığı)
    const natureMix = 0.4 + this.rainLevel * 0.6
    const baseMix = 0.6 + this.intensity * 0.4
    const pinkTarget = active ? 0.028 * baseMix : 0.0001
    const brownTarget = active ? 0.055 * baseMix : 0.0001
    const oceanTarget = active && this.rainEnabled ? 0.014 * natureMix : 0.0001
    const subTarget = active ? 0.02 : 0.0001
    const engineTarget = active ? 0.016 : 0.0001
    const shimmerTarget = active ? 0.0032 * (0.5 + this.intensity * 0.5) : 0.0001
    if (immediate) {
      this.sleepPinkGain.gain.setValueAtTime(pinkTarget, t)
      this.sleepBrownGain.gain.setValueAtTime(brownTarget, t)
      this.sleepOceanGain.gain.setValueAtTime(oceanTarget, t)
      this.sleepSubGain.gain.setValueAtTime(subTarget, t)
      if (this.sleepEngineGain) this.sleepEngineGain.gain.setValueAtTime(engineTarget, t)
      if (this.sleepShimmerGain) this.sleepShimmerGain.gain.setValueAtTime(shimmerTarget, t)
    } else {
      // Geçişler yumuşak: tıklama / sessizlik yok (radyo kuralı)
      this.sleepPinkGain.gain.setTargetAtTime(pinkTarget, t, 1.2)
      this.sleepBrownGain.gain.setTargetAtTime(brownTarget, t, 1.2)
      this.sleepOceanGain.gain.setTargetAtTime(oceanTarget, t, 1.2)
      this.sleepSubGain.gain.setTargetAtTime(subTarget, t, 1.2)
      if (this.sleepEngineGain) this.sleepEngineGain.gain.setTargetAtTime(engineTarget, t, 1.2)
      if (this.sleepShimmerGain) this.sleepShimmerGain.gain.setTargetAtTime(shimmerTarget, t, 1.5)
    }
  }

  // -------------------------------------------------------------
  // HUMANIZE + SWING YARDIMCILARI
  // Araştırma özeti: kick bir tık erken, snare bir tık geç,
  // velocity %60-100 arası gezer, timing 5-15ms geriden gelir.
  // -------------------------------------------------------------

  // Zaman: ±7ms insan eli kayması (eski ±4ms çok robotikti)
  private humanTime(base: number): number {
    return base + (Math.random() - 0.5) * 0.014
  }

  // Velocity: ±%15 değil, lo-fi gibi %60-100 bandında gez
  private humanVel(base: number, variation = 0.32): number {
    return Math.max(0.01, base * (1 + (Math.random() - 0.5) * variation * 2))
  }

  // Kick erken (-6ms), snare geç (+10ms): "sarhoş ama groovy" his
  private kickTime(base: number): number {
    return this.humanTime(base - 0.006)
  }

  private snareTime(base: number): number {
    return this.humanTime(base + 0.01)
  }

  // Node temizliği (sızıntı önleme)
  private cleanup(osc: AudioScheduledSourceNode, ...nodes: Array<AudioNode | null | undefined>) {
    const src = osc as AudioScheduledSourceNode & { onended: (() => void) | null }
    src.onended = () => {
      try {
        src.disconnect()
        for (let i = 0; i < nodes.length; i++) {
          nodes[i]?.disconnect()
        }
      } catch {
        // Zaten bağlantısız ise yut
      }
    }
  }

  // Zamanlayıcısız düğümler için (filtre/gain/panner zinciri): ana kaynağın
  // onended zincirine eklenemediyse süre sonunda güvenli koparma
  private cleanupAfter(ms: number, ...nodes: Array<AudioNode | null | undefined>) {
    window.setTimeout(() => {
      for (let i = 0; i < nodes.length; i++) {
        try {
          nodes[i]?.disconnect()
        } catch {
          // Yut
        }
      }
    }, ms)
  }

  private makePanner(pan: number): StereoPannerNode | null {
    if (!this.ctx) return null
    try {
      const panner = this.ctx.createStereoPanner()
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime)
      return panner
    } catch {
      return null
    }
  }

  // Sidechain duck: kick vurduğunda pad/keys 120ms eğilir
  private triggerDuck(time: number, depth = 0.55) {
    if (!this.ctx || !this.duckGain) return
    const g = this.duckGain.gain
    g.cancelScheduledValues(time)
    g.setValueAtTime(g.value, time)
    g.linearRampToValueAtTime(depth, time + 0.012)
    g.linearRampToValueAtTime(1.0, time + 0.22)
  }

  // Reverb gönderimi
  private sendToReverb(node: AudioNode) {
    if (this.reverbNode) {
      node.connect(this.reverbNode)
    }
  }

  private sendToDelay(node: AudioNode) {
    if (this.delayNode) {
      node.connect(this.delayNode)
    }
  }

  // -------------------------------------------------------------
  // DIŞ KONTROLLER
  // -------------------------------------------------------------

  public resumeOnInteraction() {
    const ctx = this.initContext()
    if (ctx && ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          if (this.enabled && !this.isPlaying) {
            this.start()
          }
        })
        .catch(() => {})
    } else if (this.enabled && !this.isPlaying) {
      this.start()
    }
  }

  public start() {
    const ctx = this.initContext()
    if (!ctx) return

    if (this.currentTrack === 'custom') {
      this.playCustomStream()
      return
    }

    if (this.isPlaying) return
    this.isPlaying = true
    this.nextNoteTime = ctx.currentTime + 0.06
    this.currentStep = 0
    this.updateFilterAndDelayForTrack()

    this.schedulerTimer = window.setInterval(() => {
      this.scheduler()
    }, this.lookaheadMs)

    this.updateCrackleState()
    this.updateSleepBedState()
  }

  public stop() {
    this.isPlaying = false
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer)
      this.schedulerTimer = null
    }
    if (this.externalAudio) {
      this.externalAudio.pause()
    }
    this.updateSleepBedState()
  }

  private scheduler() {
    if (!this.ctx || !this.isPlaying) return

    const trackInfo = MUSIC_TRACKS.find((t) => t.id === this.currentTrack) || MUSIC_TRACKS[0]
    const bpm = trackInfo.bpm || 68
    const stepDuration = 60 / bpm / 4
    const swing = this.getSwingForTrack()

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      const isOffBeat = this.currentStep % 2 === 1
      const swungTime = this.nextNoteTime + (isOffBeat ? stepDuration * swing : 0)
      this.scheduleStep(this.currentStep, swungTime)
      this.nextNoteTime += stepDuration
      const prev = this.currentStep
      this.currentStep = (this.currentStep + 1) % 64
      if (prev === 63) this.loopCount++
    }
  }

  private getSwingForTrack(): number {
    switch (this.currentTrack) {
      case 'lofi_chill':
        return 0.17
      case 'subway_groove':
        return 0.12
      case 'synthwave':
        return 0.02
      case 'ambient_drone':
        return 0.0
      default:
        return 0.08
    }
  }

  private scheduleStep(step: number, time: number) {
    if (!this.ctx || !this.filterNode) return

    switch (this.currentTrack) {
      case 'lofi_chill':
        this.renderLofiChill(step, time)
        break
      case 'synthwave':
        this.renderSynthwave(step, time)
        break
      case 'ambient_drone':
        this.renderAmbientDrone(step, time)
        break
      case 'subway_groove':
        this.renderSubwayGroove(step, time)
        break
    }
  }

  // -------------------------------------------------------------
  // 1. KANAL: 02:47 AM LO-FI CHILL — Auto-DJ Best Version
  // 4 döngüde bir dönen 4 progression bankası:
  // Bank0 Sunday Morning (Fmaj7-Em7-Dm9-Cmaj9), Bank1 3AM Thoughts
  // (Am9-Dm9-G13-Cmaj9), Bank2 Paper Cranes (Bm7-E7-Am9-Fmaj7),
  // Bank3 ii-V-I-vi (Dm9-G13-Cmaj9-Am9). Kök drop + ortak ton tutuşu.
  // -------------------------------------------------------------
  private getLofiBank(bank: number): { chords: number[][]; bass: number[] } {
    const banks = [
      {
        chords: [
          [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4],
          [NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4, NOTES.F4],
          [NOTES.D3, NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4],
          [NOTES.C3, NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4]
        ],
        bass: [NOTES.F2, NOTES.E2, NOTES.D2, NOTES.C2]
      },
      {
        chords: [
          [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4, NOTES.B4],
          [NOTES.D3, NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4],
          [NOTES.G2 * 2, NOTES.B3, NOTES.D4, NOTES.F4, NOTES.A4],
          [NOTES.C3, NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4]
        ],
        bass: [NOTES.A2 * 0.5, NOTES.D2, NOTES.G2, NOTES.C2]
      },
      {
        chords: [
          [NOTES.B3, NOTES.D4, NOTES.F4, NOTES.A4],
          [NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4],
          [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4, NOTES.B4],
          [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4]
        ],
        bass: [NOTES.B2 * 0.5, NOTES.E2, NOTES.A2 * 0.5, NOTES.F2]
      },
      {
        chords: [
          [NOTES.D3, NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4],
          [NOTES.G2 * 2, NOTES.B3, NOTES.D4, NOTES.F4],
          [NOTES.C3, NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4],
          [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4, NOTES.B4]
        ],
        bass: [NOTES.D2, NOTES.G2, NOTES.C2, NOTES.A2 * 0.5]
      }
    ]
    return banks[bank % banks.length]
  }

  private renderLofiChill(step: number, time: number) {
    const measure = Math.floor(step / 16)
    const stepInMeasure = step % 16
    const t = this.humanTime(time)

    // Her 4 loop'ta bir banka değişir -> sonsuz dinlenir, tekrar hissi yok
    const bank = Math.floor(this.loopCount / 2) % 4
    const { chords, bass: bassRoots } = this.getLofiBank(bank)

    // İkinci turda inversiyon: üst sesi oktav yukarı taşı
    const altVoicing = this.loopCount % 2 === 1

    // Rhodes akor: ölçü başı + 6. adım senkop + 11. adım hayalet (broken chord)
    if (stepInMeasure === 0 || stepInMeasure === 6 || stepInMeasure === 11) {
      const currentChord = chords[measure]
      const velScale = stepInMeasure === 0 ? 1.0 : stepInMeasure === 6 ? 0.68 : 0.5
      currentChord.forEach((freq, idx) => {
        if (idx > 3 && stepInMeasure !== 0) return // senkopta üst 9luyu atla
        if (idx === 0 && stepInMeasure !== 0) return // senkopta kökü basa bırak
        const f = altVoicing && idx >= 3 ? freq * 2 : freq
        const humanDelay = idx * 0.016 + Math.random() * 0.005
        this.playRhodesNote(f, t + humanDelay, 2.1, this.humanVel(0.15 * velScale), idx % 2 === 0 ? -0.14 : 0.14)
      })
    }

    // Pentatonik + blue note melodi, yoğunluğa göre seyrekleşir
    const melodySteps: Record<number, number> = {
      2: NOTES.A5,
      4: NOTES.G5,
      7: NOTES.E5 * 1.059,
      8: NOTES.E5,
      10: NOTES.D5,
      13: NOTES.C5,
      15: NOTES.E5
    }
    const mFreq = melodySteps[stepInMeasure]
    const melodyGate = measure % 2 === 0 || stepInMeasure === 8 || stepInMeasure === 13 || bank === 2
    if (mFreq && melodyGate && Math.random() > 0.25 - this.intensity * 0.15) {
      this.playPluckNote(mFreq, t, 1.0, this.humanVel(0.09), 'sine', 0.22)
      if (this.intensity > 0.6 && Math.random() > 0.55) {
        this.playPluckNote(mFreq * 1.125, t + 0.11, 0.5, 0.045, 'sine', -0.22)
      }
    }

    // Bas: kök + beşli + geçiş, kick'i kucaklar (duck ile nefes alır)
    if (stepInMeasure === 0) {
      this.playSubBass(bassRoots[measure], t, 1.6, 0.4)
    } else if (stepInMeasure === 10) {
      this.playSubBass(bassRoots[measure] * 1.5, t, 0.7, 0.26)
    } else if (stepInMeasure === 14 && Math.random() > 0.35) {
      this.playSubBass(bassRoots[measure] * 1.125, t, 0.42, 0.18)
    }

    // Boom-bap davul: kick erken, snare geç — sarhoş ama groovy
    if (stepInMeasure === 0 || stepInMeasure === 7 || stepInMeasure === 10) {
      this.playSoftKick(this.kickTime(t), this.humanVel(0.32))
    }
    if (stepInMeasure === 4 || stepInMeasure === 12) {
      this.playSnare(this.snareTime(t), this.humanVel(0.19))
    }
    if (stepInMeasure === 14 && this.loopCount % 2 === 1) {
      this.playSnare(this.snareTime(t), 0.07) // ghost vuruş
    }
    if (stepInMeasure % 2 === 1) {
      this.playHiHat(t, this.humanVel(0.065), false)
    }
    if (stepInMeasure === 6 && this.loopCount % 4 === 3) {
      this.playHiHat(t, 0.08, true) // her 4 turda bir açık hat nefesi
    }
    if (stepInMeasure % 2 === 0 && Math.random() > 0.25) {
      this.playShaker(t, this.humanVel(0.065))
    }

    // Auto-DJ nefes alma: her loop sonunda yoğunluk ±0.04 gezsin
    if (step === 63 && Math.random() > 0.5) {
      this.intensity = Math.max(0.25, Math.min(0.85, this.intensity + (Math.random() - 0.5) * 0.08))
    }
  }

  // -------------------------------------------------------------
  // 2. KANAL: CYBERPUNK MIDNIGHT SYNTHWAVE — Best Version
  // Araştırma sentezi (EDMProd + BeatKey + Nightride FM + The Midnight):
  // - 112 BPM sweet spot (Nightcall 114 referans), Am-F-C-G Nightdrive loop
  // - Gated reverb snare + clap layer (80'ler imzası), four-floor kick
  // - 16'lık Juno arpej her bölümde devam eder (kimlik ipliği)
  // - 8 loop'luk sinematik akış: intro / build / verse / chorus / breakdown
  // - Dotted-8th lead (402ms @112BPM), portamentolu bas, tom fill + crash
  // -------------------------------------------------------------
  private renderSynthwave(step: number, time: number) {
    const measure = Math.floor(step / 16)
    const stepInMeasure = step % 16
    const t = this.humanTime(time)
    const section = this.loopCount % 8
    const isIntro = section === 0
    const isBuild = section === 1 || section === 7
    const isVerse = section === 2 || section === 3
    const isChorus = section === 4 || section === 5
    const isBreakdown = section === 6
    const hasDrums = isBuild || isVerse || isChorus
    const hasFullDrums = isVerse || isChorus
    const hasBass = !isIntro && !isBreakdown

    // Klasik Nightdrive: Am - F - C - G (akord kökleri akıllı ses yönlendirmeli)
    const roots = [NOTES.A2 * 0.5, NOTES.F2, NOTES.C2, NOTES.G2]
    const arpScales = [
      [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.A4, NOTES.C5, NOTES.E5],
      [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.F4, NOTES.A4, NOTES.C5],
      [NOTES.G3, NOTES.C4, NOTES.E4, NOTES.G4, NOTES.C5, NOTES.E5],
      [NOTES.G3, NOTES.B3, NOTES.D4, NOTES.G4, NOTES.B4, NOTES.D5]
    ]

    // Geniş Juno pad: ölçü başı, chorus'ta çift katman + uzun kuyruk
    if (stepInMeasure === 0) {
      const scale = arpScales[measure]
      const padDur = isChorus ? 2.6 : 2.0
      const padVol = isBreakdown ? 0.12 : isChorus ? 0.11 : 0.09
      this.playSupersawPad(scale[0], t, padDur, padVol)
      this.playSupersawPad(scale[2], t + 0.02, padDur, padVol * 0.8)
      if (isChorus) {
        this.playSupersawPad(scale[3], t + 0.04, padDur, padVol * 0.6)
      }
      // Chorus girişinde crash (frase başı)
      if (isChorus && measure === 0 && this.loopCount % 2 === 0) {
        this.playCrash(t, 0.12)
      }
    }

    // 16'lık neon arpej — her bölümde çalışır, breakdown'da daha yumuşak
    const currentScale = arpScales[measure]
    const pattern = [0, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 4, 3, 2, 1]
    const arpNote = currentScale[pattern[stepInMeasure] % currentScale.length]
    const arpVol = isBreakdown ? 0.09 : isChorus ? 0.14 : 0.12
    const arpPan = stepInMeasure % 4 === 0 ? 0.28 : stepInMeasure % 4 === 2 ? -0.28 : stepInMeasure % 2 === 0 ? 0.12 : -0.12
    this.playPluckNote(arpNote, t, 0.16, this.humanVel(arpVol), 'sawtooth', arpPan, true)
    // Chorus'ta oktav sparkle (her 2 turda bir, üst oktav parıltısı)
    if (isChorus && stepInMeasure % 8 === 6 && this.loopCount % 2 === 0) {
      this.playPluckNote(arpNote * 2, t + 0.02, 0.14, 0.05, 'square', -arpPan, true)
    }

    // Yürüyen 8'lik bas — portamento hissi synth tarafında, akort temiz
    if (hasBass && stepInMeasure % 2 === 0) {
      const root = roots[measure]
      const octaveMult = stepInMeasure === 6 || stepInMeasure === 10 || stepInMeasure === 14 ? 2 : 1
      const bassVol = isChorus ? 0.36 : 0.32
      this.playSynthBass(root * octaveMult, t, 0.22, bassVol)
    }

    // Davul: intro/breakdown'da yok, build'de kick + toms, verse/chorus full
    if (hasDrums) {
      if (stepInMeasure === 0 || stepInMeasure === 4 || stepInMeasure === 8 || stepInMeasure === 12) {
        this.playElectronicKick(t, isChorus ? 0.5 : 0.46)
      }
      if (hasFullDrums && (stepInMeasure === 4 || stepInMeasure === 12)) {
        this.playGatedSnare(t, this.humanVel(isChorus ? 0.34 : 0.3))
        this.playClapLayer(t, this.humanVel(0.12))
      }
      // Build'de snare roll (son ölçüde artan yoğunluk)
      if (isBuild && measure === 3 && stepInMeasure % 2 === 0 && stepInMeasure >= 8) {
        this.playSnare(t, 0.1 + stepInMeasure * 0.008)
      }
      // Hat: kapalılarda groove, açıklar off-beat'te (disco etkisi)
      const isOpenHat = stepInMeasure === 6 || stepInMeasure === 14
      this.playHiHat(t, isOpenHat ? 0.07 : stepInMeasure % 2 === 0 ? 0.055 : 0.085, isOpenHat)
      // Tom fill: frase sonu (son ölçü son 4 adım, azalan perde)
      if (step === 60) this.playTom(164.81, t, 0.22)
      if (step === 61) this.playTom(146.83, t, 0.22)
      if (step === 62) this.playTom(130.81, t, 0.24)
      if (step === 63 && hasFullDrums) this.playTom(98.0, t, 0.26)
    } else if (isBreakdown) {
      // Breakdown'da sadece nefes: seyreltik hat yok, sadece swell
      if (step === 32) {
        this.playNoiseSwell(t, 6.0, 0.04)
      }
    }

    // Lead: sadece chorus + verse sonu — The Midnight tarzı ıslıklı nakarat
    // A minör pentatonik, tekrarlanabilir + akılda kalıcı
    if (isChorus || (isVerse && measure >= 2)) {
      const leadPhrases: Record<number, number> = {
        0: NOTES.A4,
        2: NOTES.C5,
        4: NOTES.D5,
        6: NOTES.E5,
        8: NOTES.G5,
        10: NOTES.E5,
        12: NOTES.D5,
        14: NOTES.C5
      }
      const altPhrases: Record<number, number> = {
        0: NOTES.E5,
        2: NOTES.G5,
        4: NOTES.A5,
        6: NOTES.G5,
        8: NOTES.E5,
        10: NOTES.D5,
        12: NOTES.C5,
        14: NOTES.A4
      }
      const phrase = measure % 2 === 0 ? leadPhrases : altPhrases
      const leadFreq = phrase[stepInMeasure]
      if (leadFreq) {
        const leadGate = isChorus || stepInMeasure % 4 === 0
        const density = 0.35 + this.intensity * 0.55
        if (leadGate && Math.random() < density) {
          const leadVol = isChorus ? 0.16 : 0.1
          this.playLeadSynth(leadFreq, t, 0.42, this.humanVel(leadVol), stepInMeasure % 4 === 0 ? 0.1 : -0.1)
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 3. KANAL: INTERSTELLAR DEEP SLEEP RADIO — Best Version
  // Sentez: Elite Dangerous + Interstellar (Zimmer) + Astroneer (Zuydervelt)
  // + SomaFM Drone Zone / Deep Space One radyo kuralları
  // Elite: sıcak saran zemin, gezegen balina uğultusu, radyo cızırtısı,
  //   aralıklı yaylı tonu, bakınca duyulan telemetri (Voyager hissi)
  // Interstellar: nefesli boru orgu (32ft+16ft), 3 akorlu kalp teması,
  //   alçalan Shepard (uykuya gömülme), yumuşak saat tiktakı (Miller),
  //   60 ses koro nefesi (insan reverb), davulsuz minimalizm
  // Astroneer: 6 katmanlı canlı mikser, çocuksu müzik kutusu ninni,
  //   wobble'lı dengesiz ton, yıldız ışığı shimmer, tehlike disonansı kapalı
  // Uyku kuralı: 6 sn atak, tiz kısık, ritim beklentisi yok, kesinti yok
  // -------------------------------------------------------------
  private renderAmbientDrone(step: number, time: number) {
    const t = this.humanTime(time)
    // 64 adım = ~21 sn @46BPM, akor 2 loop'ta bir değişir (~42 sn nefes)
    if (step === 0 && this.loopCount % 2 === 0) {
      // C Lidyen çekirdek + Zimmer 3 akor kalp (Am-F-C-G döngüsü, hep eve dönüp kaybolur)
      const ambientPads = [
        [NOTES.C3, NOTES.G3, NOTES.D4, NOTES.Fs4, NOTES.B4],
        [NOTES.A2, NOTES.E3, NOTES.B3, NOTES.C4, NOTES.G4],
        [NOTES.F3, NOTES.C4, NOTES.G4, NOTES.B4, NOTES.E5],
        [NOTES.G2, NOTES.D3, NOTES.A3, NOTES.E4, NOTES.B4],
        [NOTES.E3, NOTES.B3, NOTES.Fs4, NOTES.A4, NOTES.D5],
        [NOTES.D3, NOTES.A3, NOTES.E4, NOTES.Fs4, NOTES.C5],
        [NOTES.A2, NOTES.E3, NOTES.A3, NOTES.C4, NOTES.Fs4],
        [NOTES.F3, NOTES.A3, NOTES.E4, NOTES.G4, NOTES.D5]
      ]
      const currentPad = ambientPads[this.ambientChordPos % ambientPads.length]
      currentPad.forEach((freq, idx) => {
        const pan = idx % 2 === 0 ? -0.3 : 0.3
        // Uzun kuyruk + kısık ses: padler üst üste erir, kesinti yok
        this.playAmbientPad(freq, t + idx * 0.8, 38.0, 0.055, pan)
      })
      // Boru orgu kökü: 16ft + 32ft + nefes (Temple Church hissi, katedral reverb)
      const organRoots = [NOTES.C2, NOTES.A2 * 0.5, NOTES.F2 * 0.5, NOTES.G2 * 0.5, NOTES.E2, NOTES.D2, NOTES.A2 * 0.5, NOTES.F2]
      const organRoot = organRoots[this.ambientChordPos % organRoots.length]
      this.playPipeOrgan(organRoot, t + 0.4, 40.0, 0.085, 0)
      // İnsan korosu nefesi: orgun üstünde süzülen insan reverb (mikrofondan uzağa bakar)
      this.playChoirExhale(organRoot * 2, t + 6.0, 16.0, 0.028, 0.1)
      this.playChoirExhale(organRoot * 2.4, t + 9.0, 14.0, 0.022, -0.15)
      // Kök sub: Drone ekolü tek nota minutosu, zamansızlık hissi
      const subRoots = [NOTES.C2, NOTES.C2, NOTES.F2 * 0.5, NOTES.G2 * 0.5, NOTES.A2 * 0.5, NOTES.C2, NOTES.A2 * 0.5, NOTES.F2 * 0.5]
      this.playSubBass(subRoots[this.ambientChordPos % subRoots.length], t, 40.0, 0.24)
      this.ambientChordPos++

      // Nebula swell: kuyruklu yıldız geçişi gibi kabar-sön
      this.playNoiseSwell(t + 4.0, 14.0, 0.022)
      // Alçalan Shepard: sonsuz iniş illüzyonu (yükselen gerilim değil, gömülme)
      if (this.ambientChordPos % 2 === 0) {
        this.playShepardFall(t + 2.0, 36.0)
      }
    }

    // Miller saati tiktakı: her 4 adımda bir (~1.3 sn), çok yumuşak, her 2 loop'ta
    // Interstellar Mountains referansı, ama uyku için -18dB kısık
    if (step % 4 === 2 && this.loopCount % 2 === 0) {
      this.playSoftTick(t, 0.016)
    }

    // Elite balina uğultusu: gaz devi whoop, 2-3 dakikada bir, bol yankılı
    if (step === 32 && this.loopCount % 4 === 2 && Math.random() < 0.4) {
      const pan = (Math.random() - 0.5) * 1.0
      this.playWhaleCall(t, pan)
    }

    // Yıldız çanı: Lidyen diziden, 45-60 sn'de bir (uyandırmaz, hipnoz yapar)
    // Astroneer shimmer ile katmanlı: çan + oktav üstü nefes
    if (step === 40 && this.loopCount % 2 === 0 && Math.random() < 0.42) {
      const bellPitches = [NOTES.C5, NOTES.D5, NOTES.E5, NOTES.Fs5, NOTES.G5, NOTES.A5, NOTES.B5]
      const pitch = bellPitches[Math.floor(Math.random() * bellPitches.length)]
      const pan = (Math.random() - 0.5) * 0.8
      this.playCrystalBell(pitch, t, 5.0, this.humanVel(0.05), pan)
    }

    // Astroneer müzik kutusu ninni: çocuksu, tekil, seyrek (uyku melodisi)
    // C maj pentatonik + mavi nota yok (gerilim yok), her turda 1-2 nota
    if ((step === 8 || step === 24 || step === 56) && Math.random() < 0.3) {
      const lullaby = [NOTES.C5, NOTES.D5, NOTES.E5, NOTES.G5, NOTES.A5, NOTES.C6, NOTES.E6]
      const pitch = lullaby[Math.floor(Math.random() * lullaby.length)]
      const pan = (Math.random() - 0.5) * 0.9
      this.playMusicBox(pitch, t, pan)
    }

    // Pulsar / telemetri pingi: uzak uydu sinyali, 2-3 dakikada bir
    // Voyager hissi: kısa, tiz, çok kısık, bol yankılı + mors yankısı
    if (step === 16 && this.loopCount % 4 === 1 && Math.random() < 0.5) {
      const pulsarPitches = [NOTES.E6, NOTES.D6, NOTES.B5, NOTES.A6]
      const pitch = pulsarPitches[Math.floor(Math.random() * pulsarPitches.length)]
      const pan = (Math.random() - 0.5) * 1.4
      this.playSpacePing(pitch, t, pan)
      if (Math.random() < 0.4) {
        this.playSpacePing(pitch * 0.891, t + 0.35, -pan * 0.6)
      }
    }

    // Yıldız tozu parıltısı: oktav üstü nefes, shimmer-verb hissi
    if (step === 48 && Math.random() < 0.32) {
      const dustPitches = [NOTES.G5, NOTES.A5, NOTES.B5, NOTES.D6, NOTES.E6]
      const pitch = dustPitches[Math.floor(Math.random() * dustPitches.length)] * 2
      const pan = (Math.random() - 0.5) * 1.0
      this.playPluckNote(pitch, t, 2.5, this.humanVel(0.016), 'sine', pan, false)
      this.sendToReverbPing(pitch, t, pan)
    }

    // Yavaş dalga nabzı: çok yumuşak pembe kabarma (derin uyku desteği)
    if (step % 8 === 0 && Math.random() < 0.55) {
      this.playNoiseSwell(t, 3.2, 0.009)
    }
  }

  // Uzak uzay pingi: pulsar / Voyager telemetrisi
  // Kısa atak, 1.8 sn kuyruk, sadece reverb, delay yok
  private playSpacePing(freq: number, time: number, pan = 0): void {
    if (!this.ctx || !this.filterNode) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const noteGain = ctx.createGain()
    const panner = this.makePanner(pan)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, time)
    const peak = 0.035 * this.volume
    noteGain.gain.setValueAtTime(0.0001, time)
    noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.008)
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + 1.8)
    osc.connect(noteGain)
    if (panner) {
      noteGain.connect(panner)
      panner.connect(this.filterNode)
      this.sendToReverb(panner)
    } else {
      noteGain.connect(this.filterNode)
      this.sendToReverb(noteGain)
    }
    osc.start(time)
    osc.stop(time + 1.9)
    this.cleanup(osc, noteGain, panner)
  }

  // Shimmer yankı dokunuşu: parıltıyı uzaya yayar
  private sendToReverbPing(freq: number, time: number, pan = 0): void {
    if (!this.ctx || !this.filterNode) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const noteGain = ctx.createGain()
    const panner = this.makePanner(pan)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq * 1.005, time + 0.12)
    const peak = 0.012 * this.volume
    noteGain.gain.setValueAtTime(0.0001, time + 0.12)
    noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.3)
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + 2.8)
    osc.connect(noteGain)
    if (panner) {
      noteGain.connect(panner)
      this.sendToReverb(panner)
    } else {
      this.sendToReverb(noteGain)
    }
    osc.start(time + 0.12)
    osc.stop(time + 2.9)
    this.cleanup(osc, noteGain, panner)
  }

  // Boru orgu: Interstellar Temple Church çekirdeği (uyku için yumuşatılmış)
  // 32ft (freq*0.5) gövde sarsar, 16ft (freq) nefes verir, 4ft (freq*2) hava katar
  // Nefes gürültüsü + 4 sn atak = uyanık tutmayan katedral orgu
  private playPipeOrgan(freq: number, time: number, duration: number, volume: number, pan = 0): void {
    if (!this.ctx || !this.filterNode || !this.noiseBuffer) return
    const ctx = this.ctx
    const panner = this.makePanner(pan)
    const noteGain = ctx.createGain()
    const organFilter = ctx.createBiquadFilter()
    organFilter.type = 'lowpass'
    organFilter.frequency.setValueAtTime(1100, time)
    organFilter.Q.setValueAtTime(0.4, time)

    const mk = (mult: number, type: OscillatorType, detune: number, level: number): OscillatorNode => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = type
      o.frequency.setValueAtTime(Math.max(24, freq * mult), time)
      o.detune.setValueAtTime(detune + (Math.random() - 0.5) * 5, time)
      g.gain.setValueAtTime(level, time)
      o.connect(g)
      g.connect(organFilter)
      o.start(time)
      o.stop(time + duration + 0.1)
      this.cleanup(o, g)
      return o
    }
    mk(0.5, 'sine', -4, 0.5)
    mk(1.0, 'sine', 3, 0.85)
    mk(1.0, 'triangle', -6, 0.22)
    mk(2.0, 'sine', 5, 0.12)

    // Körük nefesi: bant geçiren gürültü orgla birlikte şişer
    const breath = ctx.createBufferSource()
    breath.buffer = this.noiseBuffer
    breath.loop = true
    const breathFilter = ctx.createBiquadFilter()
    breathFilter.type = 'bandpass'
    breathFilter.frequency.value = 420
    breathFilter.Q.value = 0.7
    const breathGain = ctx.createGain()
    breathGain.gain.setValueAtTime(0.0001, time)
    breathGain.gain.linearRampToValueAtTime(volume * this.volume * 0.14, time + 5.0)
    breathGain.gain.setValueAtTime(volume * this.volume * 0.14, time + Math.max(5.0, duration - 6.0))
    breathGain.gain.linearRampToValueAtTime(0.0001, time + duration)
    breath.connect(breathFilter)
    breathFilter.connect(breathGain)
    breathGain.connect(organFilter)
    breath.start(time, Math.random())
    breath.stop(time + duration + 0.1)

    const peak = volume * this.volume
    noteGain.gain.setValueAtTime(0.0001, time)
    noteGain.gain.linearRampToValueAtTime(peak, time + 4.0)
    noteGain.gain.setValueAtTime(peak, time + Math.max(4.0, duration - 6.0))
    noteGain.gain.linearRampToValueAtTime(0.0001, time + duration)
    organFilter.connect(noteGain)
    if (panner) {
      noteGain.connect(panner)
      panner.connect(this.filterNode)
      this.sendToReverb(panner)
    } else {
      noteGain.connect(this.filterNode)
      this.sendToReverb(noteGain)
    }
    // Zincir temizliği nefes kaynağına bağlı (aynı süre yaşarlar)
    this.cleanup(breath, breathFilter, breathGain, organFilter, noteGain, panner)
    this.cleanupAfter(Math.ceil((duration + 0.5) * 1000), organFilter, noteGain, panner)
  }

  // İnsan korosu nefesi: 60 seslik Zimmer korosu (melodi yok, sadece nefes)
  // Çift detuneli saw + Ah/Oh formantı, mikrofondan uzağa bakar (reverb ağır)
  private playChoirExhale(freq: number, time: number, duration: number, volume: number, pan = 0): void {
    if (!this.ctx || !this.filterNode) return
    const ctx = this.ctx
    const panner = this.makePanner(pan)
    const choirGain = ctx.createGain()
    const wobble = ctx.createOscillator()
    const wobbleGain = ctx.createGain()
    wobble.type = 'sine'
    wobble.frequency.setValueAtTime(0.11, time)
    wobbleGain.gain.setValueAtTime(4, time)
    wobble.connect(wobbleGain)

    const formants: Array<{ f: number; q: number; level: number }> = [
      { f: 730, q: 1.4, level: 0.5 },
      { f: 1090, q: 1.6, level: 0.32 },
      { f: 2440, q: 1.8, level: 0.1 }
    ]
    const oscs: OscillatorNode[] = []
    const extraNodes: Array<AudioNode | null | undefined> = []
    for (let i = 0; i < 2; i++) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(freq, time)
      o.detune.setValueAtTime(i === 0 ? -9 : 9, time)
      wobbleGain.connect(o.detune)
      oscs.push(o)
      formants.forEach((fo) => {
        const bp = ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = fo.f * (0.98 + Math.random() * 0.04)
        bp.Q.value = fo.q
        const g = ctx.createGain()
        g.gain.setValueAtTime(fo.level * 0.5, time)
        o.connect(bp)
        bp.connect(g)
        g.connect(choirGain)
        extraNodes.push(bp, g)
      })
    }
    const peak = volume * this.volume
    choirGain.gain.setValueAtTime(0.0001, time)
    choirGain.gain.linearRampToValueAtTime(peak, time + duration * 0.45)
    choirGain.gain.linearRampToValueAtTime(0.0001, time + duration)
    if (panner) {
      choirGain.connect(panner)
      this.sendToReverb(panner)
    } else {
      this.sendToReverb(choirGain)
    }
    wobble.start(time)
    wobble.stop(time + duration + 0.05)
    oscs.forEach((o) => {
      o.start(time)
      o.stop(time + duration + 0.05)
    })
    this.cleanup(wobble, wobbleGain, choirGain, panner, ...extraNodes)
    oscs.forEach((o) => {
      this.cleanup(o)
    })
    this.cleanupAfter(Math.ceil((duration + 0.5) * 1000), choirGain, panner, ...extraNodes)
  }

  // Alçalan Shepard: sonsuz iniş illüzyonu (uykuya gömülme)
  // 4 oktav sesi birlikte alçalır, ortada yüksek kenarda sessiz (döngü dikişi yok)
  private playShepardFall(time: number, duration: number): void {
    if (!this.ctx || !this.filterNode) return
    const ctx = this.ctx
    const mainFilter: BiquadFilterNode = this.filterNode
    const baseNotes = [NOTES.C5, NOTES.G4, NOTES.E4, NOTES.C4]
    baseNotes.forEach((base, idx) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      const panner = this.makePanner(idx % 2 === 0 ? -0.25 : 0.25)
      o.type = 'sine'
      o.frequency.setValueAtTime(base, time)
      o.frequency.exponentialRampToValueAtTime(Math.max(30, base * 0.5), time + duration)
      const peak = 0.014 * this.volume
      g.gain.setValueAtTime(0.0001, time)
      g.gain.linearRampToValueAtTime(peak, time + duration * 0.5)
      g.gain.linearRampToValueAtTime(0.0001, time + duration)
      o.connect(g)
      if (panner) {
        g.connect(panner)
        panner.connect(mainFilter)
        this.sendToReverb(panner)
      } else {
        g.connect(mainFilter)
        this.sendToReverb(g)
      }
      o.start(time)
      o.stop(time + duration + 0.05)
      this.cleanup(o, g, panner)
    })
  }

  // Yumuşak saat tiktakı: Miller gezegeni 1.25 sn referansı, -18dB uyku seviyesi
  private playSoftTick(time: number, volume: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return
    const ctx = this.ctx
    const peak = volume * this.volume
    const tick = ctx.createOscillator()
    const tickGain = ctx.createGain()
    tick.type = 'sine'
    tick.frequency.setValueAtTime(1250, time)
    tickGain.gain.setValueAtTime(peak, time)
    tickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045)
    tick.connect(tickGain)
    tickGain.connect(this.masterGain)
    this.sendToReverb(tickGain)
    tick.start(time)
    tick.stop(time + 0.06)
    this.cleanup(tick, tickGain)
  }

  // Elite balina uğultusu: gaz devi whoop (yüksel-alçal sine + vibrato)
  private playWhaleCall(time: number, pan = 0): void {
    if (!this.ctx || !this.filterNode) return
    const ctx = this.ctx
    const dur = 8.0
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    const panner = this.makePanner(pan)
    const vib = ctx.createOscillator()
    const vibGain = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(88, time)
    o.frequency.linearRampToValueAtTime(175, time + dur * 0.4)
    o.frequency.linearRampToValueAtTime(68, time + dur)
    vib.type = 'sine'
    vib.frequency.setValueAtTime(4.2, time)
    vibGain.gain.setValueAtTime(6, time)
    vib.connect(vibGain)
    vibGain.connect(o.frequency)
    const peak = 0.038 * this.volume
    g.gain.setValueAtTime(0.0001, time)
    g.gain.linearRampToValueAtTime(peak, time + dur * 0.35)
    g.gain.linearRampToValueAtTime(0.0001, time + dur)
    o.connect(g)
    if (panner) {
      g.connect(panner)
      panner.connect(this.filterNode)
      this.sendToReverb(panner)
    } else {
      g.connect(this.filterNode)
      this.sendToReverb(g)
    }
    o.start(time)
    vib.start(time)
    o.stop(time + dur + 0.05)
    vib.stop(time + dur + 0.05)
    this.cleanup(o, g, panner)
    this.cleanup(vib, vibGain)
  }

  // Astroneer müzik kutusu: çocuksu ninni (sine + 3x + 9x hızlı sönen)
  private playMusicBox(freq: number, time: number, pan = 0): void {
    if (!this.ctx || !this.filterNode) return
    const ctx = this.ctx
    const mainFilter: BiquadFilterNode = this.filterNode
    const panner = this.makePanner(pan)
    const partials: Array<{ mult: number; level: number; dur: number }> = [
      { mult: 1.0, level: 0.06, dur: 1.9 },
      { mult: 3.01, level: 0.018, dur: 1.1 },
      { mult: 9.2, level: 0.006, dur: 0.5 }
    ]
    partials.forEach((p) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(freq * p.mult, time)
      o.detune.setValueAtTime((Math.random() - 0.5) * 6, time)
      const peak = p.level * this.volume
      g.gain.setValueAtTime(0.0001, time)
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, time + p.dur)
      o.connect(g)
      if (panner) {
        g.connect(panner)
      } else {
        g.connect(mainFilter)
      }
      o.start(time)
      o.stop(time + p.dur + 0.05)
      this.cleanup(o, g)
    })
    if (panner) {
      panner.connect(mainFilter)
      this.sendToReverb(panner)
      this.cleanupAfter(2600, panner)
    }
  }

  // -------------------------------------------------------------
  // 4. KANAL: SUBWAY BEATS & LO-FI GROOVE
  // -------------------------------------------------------------
  private renderSubwayGroove(step: number, time: number) {
    const measure = Math.floor(step / 16)
    const stepInMeasure = step % 16
    const t = this.humanTime(time)

    const chordRoots = [NOTES.D3, NOTES.C3, NOTES.F3, NOTES.E3]

    // Groovy stabs: kısa, kesik, hafif detuneli
    if (stepInMeasure === 2 || stepInMeasure === 7 || stepInMeasure === 11) {
      const root = chordRoots[measure]
      const vel = stepInMeasure === 2 ? 0.18 : 0.13
      this.playPluckNote(root, t, 0.22, this.humanVel(vel), 'triangle', 0.15)
      this.playPluckNote(root * 1.5, t + 0.012, 0.2, this.humanVel(vel * 0.8), 'sine', -0.15)
      if (stepInMeasure === 11 && this.loopCount % 2 === 1) {
        this.playPluckNote(root * 2, t + 0.06, 0.18, 0.08, 'square', 0.0)
      }
    }

    // Senkoplu funk bas
    const bassRhythm: Record<number, number> = {
      0: 1.0,
      3: 1.5,
      6: 1.0,
      10: 1.25,
      12: 1.0,
      14: 1.5
    }
    const mult = bassRhythm[stepInMeasure]
    if (mult) {
      const root = chordRoots[measure] * 0.5
      this.playSynthBass(root * mult, t, 0.2, 0.32)
    }

    // Davul: boom-bap + ghost
    if (stepInMeasure === 0 || stepInMeasure === 7 || stepInMeasure === 10) {
      this.playSoftKick(this.kickTime(t), this.humanVel(0.36))
    }
    if (stepInMeasure === 4 || stepInMeasure === 12) {
      this.playRimshot(this.snareTime(t), this.humanVel(0.22))
    }
    if (stepInMeasure === 15 && Math.random() > 0.5) {
      this.playSnare(this.snareTime(t), 0.06) // ghost
    }
    if (stepInMeasure % 2 === 0) {
      this.playShaker(t, this.humanVel(0.1))
    } else {
      this.playHiHat(t, this.humanVel(0.06), false)
    }
  }

  // -------------------------------------------------------------
  // SES SENTEZLEYİCİ MODÜLLERİ
  // -------------------------------------------------------------

  private playRhodesNote(freq: number, time: number, duration: number, volume: number, pan = 0) {
    if (!this.ctx || !this.filterNode) return
    const ctx = this.ctx

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const noteGain = ctx.createGain()
    const noteFilter = ctx.createBiquadFilter()
    const panner = this.makePanner(pan)

    osc1.type = 'triangle'
    osc2.type = 'sine'
    osc1.frequency.setValueAtTime(freq, time)
    osc1.detune.setValueAtTime(-5 + (Math.random() - 0.5) * 8, time)
    osc2.frequency.setValueAtTime(freq, time)
    osc2.detune.setValueAtTime(5 + (Math.random() - 0.5) * 8, time)

    // Nota özel low-pass: Rhodes tokmağı yumuşar, üstler ipeksi kalır
    noteFilter.type = 'lowpass'
    noteFilter.frequency.setValueAtTime(2400 + Math.random() * 900, time)
    noteFilter.Q.setValueAtTime(0.5, time)

    // Wow/flutter: hızlı titreme + yavaş bant kayması (çift LFO = kaset hissi)
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.type = 'sine'
    lfo.frequency.setValueAtTime(4.5 + Math.random(), time)
    lfoGain.gain.setValueAtTime(4, time)
    lfo.connect(lfoGain)
    lfoGain.connect(osc1.detune)
    lfoGain.connect(osc2.detune)

    const wow = ctx.createOscillator()
    const wowGain = ctx.createGain()
    wow.type = 'sine'
    wow.frequency.setValueAtTime(0.55 + Math.random() * 0.2, time)
    wowGain.gain.setValueAtTime(6, time)
    wow.connect(wowGain)
    wowGain.connect(osc1.detune)
    wowGain.connect(osc2.detune)

    // Çekiç transient'i: ilk 15ms'de 2x frekansta minik "tın"
    const hammer = ctx.createOscillator()
    const hammerGain = ctx.createGain()
    hammer.type = 'triangle'
    hammer.frequency.setValueAtTime(freq * 2, time)
    hammerGain.gain.setValueAtTime(volume * this.volume * 0.18, time)
    hammerGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02)
    hammer.connect(hammerGain)
    hammerGain.connect(noteFilter)

    const peak = volume * this.volume
    noteGain.gain.setValueAtTime(0.0001, time)
    noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.02)
    noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.36), time + 0.6)
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    osc1.connect(noteGain)
    osc2.connect(noteGain)
    noteGain.connect(noteFilter)
    if (panner) {
      noteFilter.connect(panner)
      panner.connect(this.filterNode)
      this.sendToReverb(panner)
      if (this.delayNode && Math.random() > 0.45) this.sendToDelay(panner)
    } else {
      noteFilter.connect(this.filterNode)
      this.sendToReverb(noteFilter)
    }

    const stopAt = time + duration + 0.05
    osc1.start(time)
    osc2.start(time)
    lfo.start(time)
    wow.start(time)
    hammer.start(time)
    osc1.stop(stopAt)
    osc2.stop(stopAt)
    lfo.stop(stopAt)
    wow.stop(stopAt)
    hammer.stop(time + 0.03)
    this.cleanup(osc1, noteGain, panner)
    this.cleanup(osc2, noteFilter)
    this.cleanup(lfo, lfoGain)
    this.cleanup(wow, wowGain)
    this.cleanup(hammer, hammerGain)
  }

  private playPluckNote(
    freq: number,
    time: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'triangle',
    pan = 0,
    sendToDelay = false
  ) {
    if (!this.ctx || !this.filterNode) return
    const ctx = this.ctx

    const osc = ctx.createOscillator()
    const noteGain = ctx.createGain()
    const panner = this.makePanner(pan)

    osc.type = type
    osc.frequency.setValueAtTime(freq, time)
    osc.detune.setValueAtTime((Math.random() - 0.5) * 7, time)

    const peak = volume * this.volume
    noteGain.gain.setValueAtTime(0.0001, time)
    noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.012)
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    osc.connect(noteGain)
    if (panner) {
      noteGain.connect(panner)
      panner.connect(this.filterNode)
      this.sendToReverb(panner)
      if (sendToDelay) this.sendToDelay(panner)
    } else {
      noteGain.connect(this.filterNode)
      this.sendToReverb(noteGain)
      if (sendToDelay) this.sendToDelay(noteGain)
    }

    osc.start(time)
    osc.stop(time + duration + 0.03)
    this.cleanup(osc, noteGain, panner)
  }

  private playSupersawPad(freq: number, time: number, duration: number, volume: number) {
    if (!this.ctx || !this.filterNode) return
    const ctx = this.ctx
    const oscA = ctx.createOscillator()
    const oscB = ctx.createOscillator()
    const oscC = ctx.createOscillator()
    const noteGain = ctx.createGain()
    const padFilter = ctx.createBiquadFilter()
    oscA.type = 'sawtooth'
    oscB.type = 'sawtooth'
    oscC.type = 'sawtooth'
    oscA.frequency.setValueAtTime(freq, time)
    oscB.frequency.setValueAtTime(freq, time)
    oscC.frequency.setValueAtTime(freq, time)
    oscA.detune.setValueAtTime(-11, time)
    oscB.detune.setValueAtTime(11, time)
    oscC.detune.setValueAtTime(3, time)

    // Juno chorus hissi: yavaş detune gezmesi
    const chorusLfo = ctx.createOscillator()
    const chorusGain = ctx.createGain()
    chorusLfo.type = 'sine'
    chorusLfo.frequency.setValueAtTime(0.35, time)
    chorusGain.gain.setValueAtTime(6, time)
    chorusLfo.connect(chorusGain)
    chorusGain.connect(oscA.detune)
    chorusGain.connect(oscB.detune)

    // Pad EQ kuralı: 150Hz üstü, 8-12kHz altı sıcaklık
    padFilter.type = 'lowpass'
    padFilter.frequency.setValueAtTime(6800, time)
    padFilter.Q.setValueAtTime(0.4, time)

    const peak = volume * this.volume
    noteGain.gain.setValueAtTime(0.0001, time)
    noteGain.gain.linearRampToValueAtTime(peak, time + 0.32)
    noteGain.gain.setValueAtTime(peak, time + Math.max(0.32, duration - 0.8))
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    oscA.connect(padFilter)
    oscB.connect(padFilter)
    oscC.connect(padFilter)
    padFilter.connect(noteGain)
    noteGain.connect(this.filterNode)
    this.sendToReverb(noteGain)
    this.sendToDelay(noteGain)

    oscA.start(time)
    oscB.start(time)
    oscC.start(time)
    chorusLfo.start(time)
    oscA.stop(time + duration)
    oscB.stop(time + duration)
    oscC.stop(time + duration)
    chorusLfo.stop(time + duration)
    this.cleanup(oscA, noteGain)
    this.cleanup(oscB, padFilter)
    this.cleanup(oscC)
    this.cleanup(chorusLfo, chorusGain)
  }

  // Gated reverb snare — synthwave'in imzası (2.5s reverb, 180ms'de gate keser)
  private playGatedSnare(time: number, volume: number) {
    if (!this.ctx || !this.filterNode || !this.masterGain || !this.noiseBuffer) return
    const ctx = this.ctx
    const peak = volume * this.volume

    // Gövde (200Hz body + 5kHz snap dengesi)
    const osc = ctx.createOscillator()
    const bodyGain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(195, time)
    osc.frequency.exponentialRampToValueAtTime(85, time + 0.09)
    bodyGain.gain.setValueAtTime(peak * 0.7, time)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11)
    osc.connect(bodyGain)
    bodyGain.connect(this.filterNode)

    // Tel (noise) — kısa, tok
    const noise = ctx.createBufferSource()
    noise.buffer = this.noiseBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1900
    bp.Q.value = 0.9
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(peak * 0.9, time)
    ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.13)
    noise.connect(bp)
    bp.connect(ng)
    ng.connect(this.masterGain)
    this.sendToReverb(ng)

    // Gated kuyruk: büyük reverb hissi verip aniden kesilir
    const tail = ctx.createBufferSource()
    tail.buffer = this.noiseBuffer
    const tailBp = ctx.createBiquadFilter()
    tailBp.type = 'bandpass'
    tailBp.frequency.value = 2800
    tailBp.Q.value = 0.7
    const tailGain = ctx.createGain()
    tailGain.gain.setValueAtTime(peak * 0.55, time)
    tailGain.gain.setValueAtTime(peak * 0.55, time + 0.16)
    tailGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.21)
    tail.connect(tailBp)
    tailBp.connect(tailGain)
    tailGain.connect(this.masterGain)
    this.sendToReverb(tailGain)

    osc.start(time)
    osc.stop(time + 0.12)
    noise.start(time, Math.random())
    noise.stop(time + 0.14)
    tail.start(time, Math.random())
    tail.stop(time + 0.25)
    this.cleanup(osc, bodyGain)
    this.cleanup(noise, bp, ng)
    this.cleanup(tail, tailBp, tailGain)
  }

  // Clap layer — snare ile aynı anda, transientleri çakıştırmamak için 8ms geç
  private playClapLayer(time: number, volume: number) {
    if (!this.ctx || !this.filterNode || !this.noiseBuffer) return
    const ctx = this.ctx
    const t = time + 0.008
    const peak = volume * this.volume
    for (let i = 0; i < 3; i++) {
      const hitTime = t + i * 0.012
      const src = ctx.createBufferSource()
      src.buffer = this.noiseBuffer
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 1400
      const g = ctx.createGain()
      const v = i === 2 ? peak : peak * 0.5
      g.gain.setValueAtTime(v, hitTime)
      g.gain.exponentialRampToValueAtTime(0.0001, hitTime + (i === 2 ? 0.09 : 0.03))
      src.connect(hp)
      hp.connect(g)
      g.connect(this.filterNode)
      this.sendToReverb(g)
      src.start(hitTime, Math.random())
      src.stop(hitTime + 0.12)
      this.cleanup(src, hp, g)
    }
  }

  // Tom fill — frase sonu azalan 80'ler davulu
  private playTom(freq: number, time: number, volume: number) {
    if (!this.ctx || !this.masterGain) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq * 1.4, time)
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.7), time + 0.12)
    const peak = volume * this.volume
    gain.gain.setValueAtTime(peak, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18)
    osc.connect(gain)
    gain.connect(this.masterGain)
    this.sendToReverb(gain)
    osc.start(time)
    osc.stop(time + 0.2)
    this.cleanup(osc, gain)
    this.triggerDuck(time, 0.6)
  }

  // OB-Xa tarzı lead — çift saw + glide + vibrato + dotted-8th delay
  private playLeadSynth(freq: number, time: number, duration: number, volume: number, pan = 0) {
    if (!this.ctx || !this.filterNode) return
    const ctx = this.ctx
    const oscA = ctx.createOscillator()
    const oscB = ctx.createOscillator()
    const noteGain = ctx.createGain()
    const leadFilter = ctx.createBiquadFilter()
    const panner = this.makePanner(pan)

    oscA.type = 'sawtooth'
    oscB.type = 'sawtooth'
    oscA.frequency.setValueAtTime(freq * 0.985, time)
    oscB.frequency.setValueAtTime(freq * 1.015, time)
    // Glide: notaya 35ms'de kayarak oturur (canlı his)
    oscA.frequency.exponentialRampToValueAtTime(freq, time + 0.035)
    oscB.frequency.exponentialRampToValueAtTime(freq, time + 0.035)

    // Vibrato: 5.5Hz, geç girer (ısılıklı solo hissi)
    const vib = ctx.createOscillator()
    const vibGain = ctx.createGain()
    vib.type = 'sine'
    vib.frequency.setValueAtTime(5.5, time)
    vibGain.gain.setValueAtTime(0.0001, time)
    vibGain.gain.linearRampToValueAtTime(7, time + 0.25)
    vib.connect(vibGain)
    vibGain.connect(oscA.detune)
    vibGain.connect(oscB.detune)

    leadFilter.type = 'lowpass'
    leadFilter.frequency.setValueAtTime(4200, time)
    leadFilter.frequency.exponentialRampToValueAtTime(1800, time + duration)
    leadFilter.Q.setValueAtTime(1.8, time)

    const peak = volume * this.volume
    noteGain.gain.setValueAtTime(0.0001, time)
    noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.02)
    noteGain.gain.setValueAtTime(Math.max(0.0002, peak), time + Math.max(0.02, duration - 0.12))
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    oscA.connect(leadFilter)
    oscB.connect(leadFilter)
    leadFilter.connect(noteGain)
    if (panner) {
      noteGain.connect(panner)
      panner.connect(this.filterNode)
      this.sendToReverb(panner)
      this.sendToDelay(panner)
    } else {
      noteGain.connect(this.filterNode)
      this.sendToReverb(noteGain)
      this.sendToDelay(noteGain)
    }

    oscA.start(time)
    oscB.start(time)
    vib.start(time)
    oscA.stop(time + duration + 0.02)
    oscB.stop(time + duration + 0.02)
    vib.stop(time + duration + 0.02)
    this.cleanup(oscA, noteGain, panner)
    this.cleanup(oscB, leadFilter)
    this.cleanup(vib, vibGain)
  }

  private playCrash(time: number, volume: number) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 6500
    const g = ctx.createGain()
    const peak = volume * this.volume
    g.gain.setValueAtTime(peak, time)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 1.1)
    src.connect(hp)
    hp.connect(g)
    g.connect(this.masterGain)
    this.sendToReverb(g)
    src.start(time, Math.random())
    src.stop(time + 1.2)
    this.cleanup(src, hp, g)
  }

  private getDelayForTrack(): number {
    // BPM-synced dotted-8th: 112 BPM -> 402ms, 76 BPM -> 592ms, 88 BPM -> 511ms
    switch (this.currentTrack) {
      case 'synthwave':
        return 0.402
      case 'lofi_chill':
        return 0.38
      case 'subway_groove':
        return 0.34
      case 'ambient_drone':
        return 0.55
      default:
        return 0.38
    }
  }

  private updateFilterAndDelayForTrack() {
    if (!this.ctx || !this.filterNode || !this.reverbGain || !this.delayNode) return
    const t = this.ctx.currentTime
    if (this.currentTrack === 'synthwave') {
      // Synthwave parlak: 6.5k-11k bandı, Juno üstleri açık
      this.filterNode.frequency.setTargetAtTime(6500 + this.intensity * 4500, t, 0.4)
      this.reverbGain.gain.setTargetAtTime(0.3 + this.intensity * 0.14, t, 0.4)
      // Neon yağmur synthwave'de kısık tutulur (uzay hissi kaybolmasın)
      this.updateRainState()
    } else if (this.currentTrack === 'ambient_drone') {
      // Deep Sleep karanlık: tizler kısık, reverb büyük (katedral hissi)
      // Tiz uyandırır, bas uyutur kuralı
      this.filterNode.frequency.setTargetAtTime(1900 + this.intensity * 700, t, 0.8)
      this.reverbGain.gain.setTargetAtTime(0.42 + this.intensity * 0.1, t, 0.8)
      this.updateRainState()
    } else {
      this.filterNode.frequency.setTargetAtTime(3800 + this.intensity * 1800, t, 0.4)
      this.reverbGain.gain.setTargetAtTime(0.26 + this.intensity * 0.16, t, 0.4)
    }
    this.delayNode.delayTime.setTargetAtTime(this.getDelayForTrack(), t, 0.2)
    this.updateSleepBedState()
    this.updateCrackleState()
  }

  private playSubBass(freq: number, time: number, duration: number, volume: number) {
    if (!this.ctx || !this.masterGain) return
    const ctx = this.ctx

    const osc = ctx.createOscillator()
    const warmth = ctx.createOscillator()
    const warmthGain = ctx.createGain()
    const noteGain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, time)
    osc.frequency.exponentialRampToValueAtTime(Math.max(28, freq * 0.94), time + duration)

    // Küçük hoparlörde de duyulsun diye -18dB ikinci harmonik (upright sıcaklığı)
    warmth.type = 'triangle'
    warmth.frequency.setValueAtTime(freq * 2, time)
    warmthGain.gain.setValueAtTime(0.12, time)
    warmthGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    warmth.connect(warmthGain)
    warmthGain.connect(noteGain)

    const peak = volume * this.volume
    noteGain.gain.setValueAtTime(0.0001, time)
    noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.035)
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    osc.connect(noteGain)
    // Bas reverbe gitmez (netlik kuralı), doğrudan mastera
    noteGain.connect(this.masterGain)

    osc.start(time)
    warmth.start(time)
    osc.stop(time + duration + 0.02)
    warmth.stop(time + duration + 0.02)
    this.cleanup(osc, noteGain)
    this.cleanup(warmth, warmthGain)
  }

  private playSynthBass(freq: number, time: number, duration: number, volume: number) {
    if (!this.ctx || !this.masterGain) return
    const ctx = this.ctx

    const osc = ctx.createOscillator()
    const sub = ctx.createOscillator()
    const bassFilter = ctx.createBiquadFilter()
    const noteGain = ctx.createGain()

    osc.type = 'sawtooth'
    sub.type = 'sine'
    // Portamento: 30ms kayma ile pürüzsüz yürüyen bas (20-50ms kuralı)
    osc.frequency.setValueAtTime(Math.max(30, freq * 0.92), time)
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.03)
    sub.frequency.setValueAtTime(Math.max(25, freq * 0.5 * 0.94), time)
    sub.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.03)

    bassFilter.type = 'lowpass'
    bassFilter.frequency.setValueAtTime(520, time)
    bassFilter.frequency.exponentialRampToValueAtTime(140, time + duration)
    bassFilter.Q.setValueAtTime(3.2, time)

    const peak = volume * this.volume
    noteGain.gain.setValueAtTime(0.0001, time)
    noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.018)
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    osc.connect(bassFilter)
    sub.connect(noteGain)
    bassFilter.connect(noteGain)
    noteGain.connect(this.masterGain)

    osc.start(time)
    sub.start(time)
    osc.stop(time + duration + 0.02)
    sub.stop(time + duration + 0.02)
    this.cleanup(osc, bassFilter, noteGain)
    this.cleanup(sub)
  }

  private playAmbientPad(freq: number, time: number, duration: number, volume: number, pan = 0) {
    if (!this.ctx || !this.filterNode) return
    const ctx = this.ctx

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const noteGain = ctx.createGain()
    const panner = this.makePanner(pan)
    const isSleep = this.currentTrack === 'ambient_drone'

    osc1.type = 'triangle'
    osc2.type = 'sine'
    osc1.frequency.setValueAtTime(freq, time)
    osc1.detune.setValueAtTime(-7, time)
    osc2.frequency.setValueAtTime(freq, time)
    osc2.detune.setValueAtTime(7, time)

    const peak = volume * this.volume
    // Uyku padi: 6 sn şiş, 6 sn sön (ani atak uyandırır)
    const attack = isSleep ? 6.0 : 2.0
    const release = isSleep ? 6.0 : 2.0
    noteGain.gain.setValueAtTime(0.0001, time)
    noteGain.gain.linearRampToValueAtTime(peak, time + attack)
    noteGain.gain.setValueAtTime(peak, time + Math.max(attack, duration - release))
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    osc1.connect(noteGain)
    osc2.connect(noteGain)
    if (panner) {
      noteGain.connect(panner)
      panner.connect(this.filterNode)
      this.sendToReverb(panner)
      // Uyku modunda delay yok: ritim beklentisi beyni uyanık tutar
      if (!isSleep) this.sendToDelay(panner)
    } else {
      noteGain.connect(this.filterNode)
      this.sendToReverb(noteGain)
    }

    osc1.start(time)
    osc2.start(time)
    osc1.stop(time + duration + 0.05)
    osc2.stop(time + duration + 0.05)
    this.cleanup(osc1, noteGain, panner)
    this.cleanup(osc2)
  }

  private playCrystalBell(freq: number, time: number, duration: number, volume: number, pan = 0) {
    if (!this.ctx || !this.filterNode) return
    const ctx = this.ctx

    const osc = ctx.createOscillator()
    const overtone = ctx.createOscillator()
    const noteGain = ctx.createGain()
    const overGain = ctx.createGain()
    const panner = this.makePanner(pan)
    const isSleep = this.currentTrack === 'ambient_drone'

    osc.type = 'sine'
    overtone.type = 'sine'
    osc.frequency.setValueAtTime(freq, time)
    overtone.frequency.setValueAtTime(freq * 2.76, time)

    // Uyku çanı %45 daha kısık: güvenlik sınırı
    const peak = volume * this.volume * (isSleep ? 0.55 : 1.0)
    noteGain.gain.setValueAtTime(0.0001, time)
    noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.015)
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    overGain.gain.setValueAtTime(0.0001, time)
    overGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.25), time + 0.01)
    overGain.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.5)

    osc.connect(noteGain)
    overtone.connect(overGain)
    overGain.connect(noteGain)
    if (panner) {
      noteGain.connect(panner)
      panner.connect(this.filterNode)
      this.sendToReverb(panner)
      if (!isSleep) this.sendToDelay(panner)
    } else {
      noteGain.connect(this.filterNode)
      this.sendToReverb(noteGain)
    }

    osc.start(time)
    overtone.start(time)
    osc.stop(time + duration)
    overtone.stop(time + duration * 0.55)
    this.cleanup(osc, noteGain, panner)
    this.cleanup(overtone, overGain)
  }

  private playNoiseSwell(time: number, duration: number, volume: number) {
    if (!this.ctx || !this.filterNode || !this.noiseBuffer) return
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(600, time)
    bp.frequency.linearRampToValueAtTime(1200, time + duration / 2)
    bp.frequency.linearRampToValueAtTime(500, time + duration)
    bp.Q.setValueAtTime(0.8, time)
    const g = ctx.createGain()
    const peak = volume * this.volume
    g.gain.setValueAtTime(0.0001, time)
    g.gain.linearRampToValueAtTime(peak, time + duration * 0.4)
    g.gain.linearRampToValueAtTime(0.0001, time + duration)

    src.connect(bp)
    bp.connect(g)
    g.connect(this.filterNode)
    this.sendToReverb(g)

    src.start(time)
    src.stop(time + duration + 0.05)
    this.cleanup(src, bp, g)
  }

  // -------------------------------------------------------------
  // DAVULLAR (gerçek gürültü + gövde sentezi)
  // -------------------------------------------------------------

  private playSoftKick(time: number, volume: number) {
    if (!this.ctx || !this.masterGain) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(115, time)
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.09)

    const peak = volume * this.volume
    gain.gain.setValueAtTime(peak, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.13)

    // Klik transient
    const click = ctx.createOscillator()
    const clickGain = ctx.createGain()
    click.type = 'triangle'
    click.frequency.setValueAtTime(900, time)
    clickGain.gain.setValueAtTime(peak * 0.25, time)
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.015)
    click.connect(clickGain)
    clickGain.connect(this.masterGain)

    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start(time)
    osc.stop(time + 0.14)
    click.start(time)
    click.stop(time + 0.02)
    this.cleanup(osc, gain)
    this.cleanup(click, clickGain)
    this.triggerDuck(time)
  }

  private playElectronicKick(time: number, volume: number) {
    if (!this.ctx || !this.masterGain) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(165, time)
    osc.frequency.exponentialRampToValueAtTime(44, time + 0.1)

    const peak = volume * this.volume
    gain.gain.setValueAtTime(peak, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15)

    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start(time)
    osc.stop(time + 0.16)
    this.cleanup(osc, gain)
    this.triggerDuck(time, 0.5)
  }

  private playRimshot(time: number, volume: number) {
    if (!this.ctx || !this.filterNode || !this.noiseBuffer) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(330, time)
    osc.frequency.exponentialRampToValueAtTime(140, time + 0.035)

    const peak = volume * this.volume
    gain.gain.setValueAtTime(peak, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045)

    // Gürültü çıtı
    const noise = ctx.createBufferSource()
    noise.buffer = this.noiseBuffer
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 4000
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(peak * 0.5, time)
    ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.02)
    noise.connect(hp)
    hp.connect(ng)
    ng.connect(this.filterNode)

    osc.connect(gain)
    gain.connect(this.filterNode)
    osc.start(time)
    osc.stop(time + 0.05)
    noise.start(time, Math.random())
    noise.stop(time + 0.03)
    this.cleanup(osc, gain)
    this.cleanup(noise, hp, ng)
  }

  private playSnare(time: number, volume: number) {
    if (!this.ctx || !this.filterNode || !this.masterGain || !this.noiseBuffer) return
    const ctx = this.ctx
    const peak = volume * this.volume

    // Gövde
    const osc = ctx.createOscillator()
    const bodyGain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(195, time)
    osc.frequency.exponentialRampToValueAtTime(85, time + 0.09)
    bodyGain.gain.setValueAtTime(peak * 0.7, time)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11)
    osc.connect(bodyGain)
    bodyGain.connect(this.filterNode)

    // Tel (noise)
    const noise = ctx.createBufferSource()
    noise.buffer = this.noiseBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1900
    bp.Q.value = 0.9
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(peak * 0.9, time)
    ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.13)
    noise.connect(bp)
    bp.connect(ng)
    ng.connect(this.masterGain)
    this.sendToReverb(ng)

    osc.start(time)
    osc.stop(time + 0.12)
    noise.start(time, Math.random())
    noise.stop(time + 0.14)
    this.cleanup(osc, bodyGain)
    this.cleanup(noise, bp, ng)
  }

  private playHiHat(time: number, volume: number, open: boolean) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return
    const ctx = this.ctx
    const dur = open ? 0.14 : 0.032
    const noise = ctx.createBufferSource()
    noise.buffer = this.noiseBuffer
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 7800
    const gain = ctx.createGain()
    const peak = volume * this.volume
    gain.gain.setValueAtTime(peak, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur)

    noise.connect(hp)
    hp.connect(gain)
    gain.connect(this.masterGain)

    noise.start(time, Math.random())
    noise.stop(time + dur + 0.01)
    this.cleanup(noise, hp, gain)
  }

  private playShaker(time: number, volume: number) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return
    const ctx = this.ctx
    const noise = ctx.createBufferSource()
    noise.buffer = this.noiseBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 4800 + Math.random() * 800
    bp.Q.value = 1.1
    const gain = ctx.createGain()
    const peak = volume * this.volume
    gain.gain.setValueAtTime(peak, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.028)

    noise.connect(bp)
    bp.connect(gain)
    gain.connect(this.masterGain)

    noise.start(time, Math.random())
    noise.stop(time + 0.035)
    this.cleanup(noise, bp, gain)
  }

  // -------------------------------------------------------------
  // HARİCİ STREAM / ÖZEL URL ÇALICI
  // -------------------------------------------------------------
  private playCustomStream() {
    if (!this.externalAudio) return
    this.stopInternalSynth()

    if (!this.customUrl) {
      this.currentTrack = 'lofi_chill'
      this.start()
      return
    }

    try {
      this.externalAudio.src = this.customUrl
      this.externalAudio.volume = this.enabled ? this.volume : 0
      this.externalAudio
        .play()
        .then(() => {
          this.isPlaying = true
        })
        .catch((err) => {
          console.warn('Harici ses çalınamadı, dahili Lo-Fi synth devreye giriyor:', err)
          this.currentTrack = 'lofi_chill'
          this.start()
        })
    } catch {
      this.currentTrack = 'lofi_chill'
      this.start()
    }
  }

  private stopInternalSynth() {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer)
      this.schedulerTimer = null
    }
  }

  // -------------------------------------------------------------
  // DIŞ KONTROLLER (VOLUME, TRACK, MUTE, VISUALIZER, INTENSITY)
  // -------------------------------------------------------------

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val))
    if (this.masterGain && this.ctx) {
      const target = this.enabled ? this.volume : 0.0001
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.03)
    }
    if (this.externalAudio) {
      this.externalAudio.volume = this.enabled ? this.volume : 0
    }
  }

  public setEnabled(state: boolean) {
    this.enabled = state
    if (this.masterGain && this.ctx) {
      const target = this.enabled ? this.volume : 0.0001
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.03)
    }
    if (this.externalAudio) {
      this.externalAudio.volume = this.enabled ? this.volume : 0
      if (!this.enabled) {
        this.externalAudio.pause()
      } else if (this.currentTrack === 'custom') {
        this.externalAudio.play().catch(() => {})
      }
    }
    if (this.enabled && !this.isPlaying) {
      this.start()
    } else if (!this.enabled && this.isPlaying) {
      this.stop()
    }
    this.updateCrackleState()
    this.updateSleepBedState()
  }

  public setTrack(track: MusicTrackId) {
    if (this.currentTrack === track && this.isPlaying) return
    this.currentTrack = track
    this.stop()
    this.currentStep = 0
    if (track === 'ambient_drone') this.ambientChordPos = 0
    this.updateFilterAndDelayForTrack()
    if (this.enabled) {
      this.start()
    }
  }

  public nextTrack(): MusicTrackInfo {
    const currentIndex = MUSIC_TRACKS.findIndex((t) => t.id === this.currentTrack)
    const nextIndex = (currentIndex + 1) % (MUSIC_TRACKS.length - 1) // custom hariç döngü
    const next = MUSIC_TRACKS[nextIndex]
    this.setTrack(next.id)
    return next
  }

  public setVinylCrackle(state: boolean) {
    this.vinylCrackle = state
    this.updateCrackleState()
  }

  public setRainEnabled(state: boolean) {
    this.rainEnabled = state
    this.updateRainState()
    this.updateSleepBedState()
  }

  public setRainLevel(val: number) {
    this.rainLevel = Math.max(0, Math.min(1, val))
    this.updateRainState()
    this.updateSleepBedState()
  }

  public setIntensity(val: number) {
    this.intensity = Math.max(0, Math.min(1, val))
    this.updateFilterAndDelayForTrack()
    this.updateSleepBedState()
  }

  // Uyku zamanlayıcısı: süre bitince yumuşak fade-out ile kapatır
  // Deep Sleep'te 8 sn uzun fade (ani sessizlik uyanmaya neden olur)
  public setSleepTimer(minutes: number) {
    this.clearSleepTimer()
    if (minutes <= 0) {
      this.sleepMinutesRemaining = 0
      return
    }
    this.sleepMinutesRemaining = minutes
    this.sleepTickId = window.setInterval(() => {
      this.sleepMinutesRemaining = Math.max(0, this.sleepMinutesRemaining - 1 / 60)
      if (this.sleepMinutesRemaining <= 0) {
        const fadeSec = this.currentTrack === 'ambient_drone' ? 8 : 3
        this.fadeOutAndStop(fadeSec)
        this.clearSleepTimer()
        this.sleepMinutesRemaining = 0
      }
    }, 1000)
  }

  public clearSleepTimer() {
    if (this.sleepTickId !== null) {
      clearInterval(this.sleepTickId)
      this.sleepTickId = null
    }
  }

  private fadeOutAndStop(fadeSec = 3) {
    if (!this.ctx || !this.masterGain) {
      this.setEnabled(false)
      return
    }
    const t = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(t)
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), t)
    this.masterGain.gain.linearRampToValueAtTime(0.0001, t + fadeSec)
    window.setTimeout(() => {
      this.setEnabled(false)
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1)
      }
    }, fadeSec * 1000 + 100)
  }

  private updateCrackleState() {
    if (!this.crackleGain || !this.ctx) return
    // Deep Sleep'te cızırtı kapalı: tiz transient uykuyu böler
    const sleepMute = this.currentTrack === 'ambient_drone'
    const target = this.enabled && this.vinylCrackle && this.isPlaying && !sleepMute ? 0.05 : 0.0001
    this.crackleGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1)
    this.updateRainState()
  }

  public getVisualizerData(): number[] {
    if (!this.analyser || !this.visualizerDataArray || !this.isPlaying || !this.enabled) {
      return [0, 0, 0, 0]
    }
    this.analyser.getByteFrequencyData(this.visualizerDataArray)
    const b1 = (this.visualizerDataArray[1] || 0) / 255
    const b2 = (this.visualizerDataArray[4] || 0) / 255
    const b3 = (this.visualizerDataArray[8] || 0) / 255
    const b4 = (this.visualizerDataArray[14] || 0) / 255
    return [b1, b2, b3, b4]
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack,
      enabled: this.enabled,
      volume: this.volume,
      rainEnabled: this.rainEnabled,
      rainLevel: this.rainLevel,
      intensity: this.intensity,
      sleepMinutesRemaining: this.sleepMinutesRemaining,
      trackInfo: MUSIC_TRACKS.find((t) => t.id === this.currentTrack) || MUSIC_TRACKS[0]
    }
  }
}

export const musicEngine = new MusicEngine()
