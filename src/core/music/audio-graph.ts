import type { MusicTrackId } from '../../models/types'

export class AudioGraph {
  public ctx: AudioContext | null = null
  public masterGain: GainNode | null = null
  public compressor: DynamicsCompressorNode | null = null
  public filterNode: BiquadFilterNode | null = null
  public saturatorNode: WaveShaperNode | null = null
  public duckGain: GainNode | null = null
  public delayNode: DelayNode | null = null
  public delayGain: GainNode | null = null
  public reverbNode: ConvolverNode | null = null
  public reverbGain: GainNode | null = null
  public crackleGain: GainNode | null = null
  public crackleSource: AudioBufferSourceNode | null = null
  public rainGain: GainNode | null = null
  public rainSource: AudioBufferSourceNode | null = null
  public tapeLfo: OscillatorNode | null = null
  public tapeLfoGain: GainNode | null = null
  public analyser: AnalyserNode | null = null
  public noiseBuffer: AudioBuffer | null = null
  public pinkBuffer: AudioBuffer | null = null
  public brownBuffer: AudioBuffer | null = null

  // Deep Sleep radyo yatağı
  public sleepPinkSrc: AudioBufferSourceNode | null = null
  public sleepPinkGain: GainNode | null = null
  public sleepBrownSrc: AudioBufferSourceNode | null = null
  public sleepBrownGain: GainNode | null = null
  public sleepOceanSrc: AudioBufferSourceNode | null = null
  public sleepOceanGain: GainNode | null = null
  public sleepSubOsc: OscillatorNode | null = null
  public sleepSubGain: GainNode | null = null
  public sleepEngineOsc: OscillatorNode | null = null
  public sleepEngineGain: GainNode | null = null
  public sleepShimmerSrc: AudioBufferSourceNode | null = null
  public sleepShimmerGain: GainNode | null = null
  public sleepBedRunning = false

  public visualizerDataArray: Uint8Array<ArrayBuffer> | null = null

  public init(enabled: boolean, volume: number, intensity: number): AudioContext | null {
    if (typeof window === 'undefined') return null

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return null
      this.ctx = new AudioCtx()

      // 1. Master chain: Filter -> Saturator -> Duck -> Compressor -> Master -> Analyser -> Out
      this.filterNode = this.ctx.createBiquadFilter()
      this.filterNode.type = 'lowpass'
      this.filterNode.frequency.setValueAtTime(3800 + intensity * 1800, this.ctx.currentTime)
      this.filterNode.Q.setValueAtTime(0.7, this.ctx.currentTime)

      // Tape Saturation: analog kaset manyetik doygunluğu ve soft-clipping sıcaklığı
      this.saturatorNode = this.ctx.createWaveShaper()
      this.saturatorNode.curve = this.makeTapeSaturationCurve(1.35)
      this.saturatorNode.oversample = '4x'

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
      this.masterGain.gain.setValueAtTime(enabled ? volume : 0.0001, this.ctx.currentTime)

      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 128
      this.analyser.smoothingTimeConstant = 0.82
      this.visualizerDataArray = new Uint8Array(this.analyser.frequencyBinCount)

      this.filterNode.connect(this.saturatorNode)
      this.saturatorNode.connect(this.duckGain)
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
      this.delayGain.connect(this.filterNode)
      this.delayGain.connect(this.reverbNode)

      // 4. Paylaşılan gürültü tamponu
      this.ensureNoiseBuffer()

      // 5. Vinil / Kaset Cızırtısı
      this.setupVinylCrackle(enabled)

      // 6. Yağmur + oda tonu
      this.setupRainAmbience(enabled)

      // 7. Deep Sleep kesintisiz yatak
      this.setupSleepBed()
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }

    return this.ctx
  }

  public makeTapeSaturationCurve(drive = 1.35): Float32Array {
    const samples = 4096
    const curve = new Float32Array(samples)
    const norm = Math.tanh(drive)
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1
      curve[i] = Math.tanh(x * drive) / norm
    }
    return curve
  }

  public makeImpulse(durationSec: number, decay: number): AudioBuffer | null {
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

  public ensureNoiseBuffer(): void {
    if (!this.ctx || this.noiseBuffer) return
    const len = this.ctx.sampleRate * 2
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1
    }
  }

  public ensureColoredBuffers(): void {
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

  private setupVinylCrackle(enabled: boolean): void {
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
    const targetGain = enabled ? 0.06 : 0.0001
    this.crackleGain.gain.setValueAtTime(targetGain, this.ctx.currentTime)

    this.crackleSource.connect(crackleFilter)
    crackleFilter.connect(this.crackleGain)
    this.crackleGain.connect(this.masterGain)

    this.crackleSource.start(0)
  }

  private setupRainAmbience(enabled: boolean): void {
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
    this.rainGain.gain.setValueAtTime(enabled ? 0.012 : 0.0001, this.ctx.currentTime)

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

  public updateRainState(
    enabled: boolean,
    rainEnabled: boolean,
    isPlaying: boolean,
    currentTrack: MusicTrackId,
    rainLevel: number,
    immediate = false
  ): void {
    if (!this.rainGain || !this.ctx) return
    const audible = enabled && rainEnabled && isPlaying && currentTrack !== 'custom'
    const trackDuck =
      currentTrack === 'synthwave' ? 0.45 : currentTrack === 'ambient_drone' ? 0.6 : 1.0
    const target = audible ? (0.004 + rainLevel * 0.031) * trackDuck : 0.0001
    if (immediate) {
      this.rainGain.gain.setValueAtTime(target, this.ctx.currentTime)
    } else {
      this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.6)
    }
  }

  public setupSleepBed(): void {
    if (!this.ctx || !this.masterGain || this.sleepBedRunning) return
    this.ensureColoredBuffers()
    if (!this.ctx || !this.masterGain || !this.pinkBuffer || !this.brownBuffer || !this.noiseBuffer)
      return
    const ctx = this.ctx

    // 1. Pembe taban
    this.sleepPinkSrc = ctx.createBufferSource()
    this.sleepPinkSrc.buffer = this.pinkBuffer
    this.sleepPinkSrc.loop = true
    const pinkFilter = ctx.createBiquadFilter()
    pinkFilter.type = 'lowpass'
    pinkFilter.frequency.value = 1400
    pinkFilter.Q.value = 0.3
    this.sleepPinkGain = ctx.createGain()
    this.sleepPinkGain.gain.setValueAtTime(0.0001, ctx.currentTime)
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

    // 2. Kahve taban
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

    // 3. Okyanus swell
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

    // 4. Sub drone
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

    // 5. Yıldız parıltısı
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
  }

  public updateSleepBedState(
    enabled: boolean,
    isPlaying: boolean,
    currentTrack: MusicTrackId,
    rainEnabled: boolean,
    rainLevel: number,
    intensity: number,
    immediate = false
  ): void {
    if (
      !this.ctx ||
      !this.sleepPinkGain ||
      !this.sleepBrownGain ||
      !this.sleepOceanGain ||
      !this.sleepSubGain
    )
      return
    const t = this.ctx.currentTime
    const active = enabled && isPlaying && currentTrack === 'ambient_drone'
    const natureMix = 0.4 + rainLevel * 0.6
    const baseMix = 0.6 + intensity * 0.4
    const pinkTarget = active ? 0.028 * baseMix : 0.0001
    const brownTarget = active ? 0.055 * baseMix : 0.0001
    const oceanTarget = active && rainEnabled ? 0.014 * natureMix : 0.0001
    const subTarget = active ? 0.02 : 0.0001
    const engineTarget = active ? 0.016 : 0.0001
    const shimmerTarget = active ? 0.0032 * (0.5 + intensity * 0.5) : 0.0001
    if (immediate) {
      this.sleepPinkGain.gain.setValueAtTime(pinkTarget, t)
      this.sleepBrownGain.gain.setValueAtTime(brownTarget, t)
      this.sleepOceanGain.gain.setValueAtTime(oceanTarget, t)
      this.sleepSubGain.gain.setValueAtTime(subTarget, t)
      if (this.sleepEngineGain) this.sleepEngineGain.gain.setValueAtTime(engineTarget, t)
      if (this.sleepShimmerGain) this.sleepShimmerGain.gain.setValueAtTime(shimmerTarget, t)
    } else {
      this.sleepPinkGain.gain.setTargetAtTime(pinkTarget, t, 1.2)
      this.sleepBrownGain.gain.setTargetAtTime(brownTarget, t, 1.2)
      this.sleepOceanGain.gain.setTargetAtTime(oceanTarget, t, 1.2)
      this.sleepSubGain.gain.setTargetAtTime(subTarget, t, 1.2)
      if (this.sleepEngineGain) this.sleepEngineGain.gain.setTargetAtTime(engineTarget, t, 1.2)
      if (this.sleepShimmerGain) this.sleepShimmerGain.gain.setTargetAtTime(shimmerTarget, t, 1.5)
    }
  }

  public updateCrackleState(
    enabled: boolean,
    vinylCrackle: boolean,
    isPlaying: boolean,
    currentTrack: MusicTrackId,
    rainEnabled: boolean,
    rainLevel: number
  ): void {
    if (!this.crackleGain || !this.ctx) return
    const sleepMute = currentTrack === 'ambient_drone'
    const target = enabled && vinylCrackle && isPlaying && !sleepMute ? 0.05 : 0.0001
    this.crackleGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1)
    this.updateRainState(enabled, rainEnabled, isPlaying, currentTrack, rainLevel)
  }

  public makePanner(pan: number): StereoPannerNode | null {
    if (!this.ctx) return null
    try {
      const panner = this.ctx.createStereoPanner()
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime)
      return panner
    } catch {
      return null
    }
  }

  public triggerDuck(time: number, depth = 0.55): void {
    if (!this.ctx || !this.duckGain) return
    const g = this.duckGain.gain
    g.cancelScheduledValues(time)
    g.setValueAtTime(g.value, time)
    g.linearRampToValueAtTime(depth, time + 0.012)
    g.linearRampToValueAtTime(1.0, time + 0.22)
  }

  public sendToReverb(node: AudioNode): void {
    if (this.reverbNode) {
      node.connect(this.reverbNode)
    }
  }

  public sendToDelay(node: AudioNode): void {
    if (this.delayNode) {
      node.connect(this.delayNode)
    }
  }

  public cleanup(
    osc: AudioScheduledSourceNode,
    ...nodes: Array<AudioNode | null | undefined>
  ): void {
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

  public cleanupAfter(ms: number, ...nodes: Array<AudioNode | null | undefined>): void {
    if (typeof window === 'undefined') return
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
}
