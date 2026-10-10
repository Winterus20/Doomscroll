import type { SynthContext } from '../types'

/**
 * Yumuşak Akustik Lo-Fi Kick (Ahşap Tokmak Transient + Sub Gövde + SP-404 Sidechain Ducking)
 */
export function playSoftKick(host: SynthContext, time: number, volume: number): void {
  const ctx = host.ctx
  if (!ctx || !host.masterGain) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(125, time)
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.085)

  const peak = volume * host.volume
  gain.gain.setValueAtTime(peak, time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14)

  // Klik transient (ahşap tokmak vuruşu)
  const click = ctx.createOscillator()
  const clickGain = ctx.createGain()
  click.type = 'triangle'
  click.frequency.setValueAtTime(550, time)
  click.frequency.exponentialRampToValueAtTime(80, time + 0.012)
  clickGain.gain.setValueAtTime(peak * 0.22, time)
  clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.015)
  click.connect(clickGain)
  clickGain.connect(host.masterGain)

  osc.connect(gain)
  gain.connect(host.masterGain)
  osc.start(time)
  osc.stop(time + 0.15)
  click.start(time)
  click.stop(time + 0.02)
  host.cleanup(osc, gain)
  host.cleanup(click, clickGain)
  // SP-404 vinyl simulator sidechain ducking pompası (nazik 2-3 dB)
  host.triggerDuck(time, 0.74)
}

/**
 * Elektronik / Synthwave Kick
 */
export function playElectronicKick(host: SynthContext, time: number, volume: number): void {
  const ctx = host.ctx
  if (!ctx || !host.masterGain) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(165, time)
  osc.frequency.exponentialRampToValueAtTime(44, time + 0.1)

  const peak = volume * host.volume
  gain.gain.setValueAtTime(peak, time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15)

  osc.connect(gain)
  gain.connect(host.masterGain)
  osc.start(time)
  osc.stop(time + 0.16)
  host.cleanup(osc, gain)
  host.triggerDuck(time, 0.5)
}

/**
 * Kasnak Vuruşu (Rimshot)
 */
export function playRimshot(host: SynthContext, time: number, volume: number): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode || !host.noiseBuffer) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(330, time)
  osc.frequency.exponentialRampToValueAtTime(140, time + 0.035)

  const peak = volume * host.volume
  gain.gain.setValueAtTime(peak, time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045)

  // Gürültü çıtı
  const noise = ctx.createBufferSource()
  noise.buffer = host.noiseBuffer
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 4000
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(peak * 0.5, time)
  ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.02)
  noise.connect(hp)
  hp.connect(ng)
  ng.connect(host.filterNode)

  osc.connect(gain)
  gain.connect(host.filterNode)
  osc.start(time)
  osc.stop(time + 0.05)
  noise.start(time, Math.random())
  noise.stop(time + 0.03)
  host.cleanup(osc, gain)
  host.cleanup(noise, hp, ng)
}

/**
 * Standart Snare
 */
export function playSnare(host: SynthContext, time: number, volume: number): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode || !host.masterGain || !host.noiseBuffer) return
  const peak = volume * host.volume

  // Gövde
  const osc = ctx.createOscillator()
  const bodyGain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(195, time)
  osc.frequency.exponentialRampToValueAtTime(85, time + 0.09)
  bodyGain.gain.setValueAtTime(peak * 0.7, time)
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11)
  osc.connect(bodyGain)
  bodyGain.connect(host.filterNode)

  // Tel (noise)
  const noise = ctx.createBufferSource()
  noise.buffer = host.noiseBuffer
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1900
  bp.Q.value = 0.9
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(peak * 0.9, time)
  ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.13)
  noise.connect(bp)
  bp.connect(ng)
  ng.connect(host.masterGain)
  host.sendToReverb(ng)

  osc.start(time)
  osc.stop(time + 0.12)
  noise.start(time, Math.random())
  noise.stop(time + 0.14)
  host.cleanup(osc, bodyGain)
  host.cleanup(noise, bp, ng)
}

/**
 * J Dilla Ghost Snare (Hafif Ahşap Kasnak / Fırça Fısıltısı)
 */
export function playGhostSnare(host: SynthContext, time: number, volume = 0.06): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode || !host.noiseBuffer) return
  const peak = volume * host.volume

  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(160, time)
  osc.frequency.exponentialRampToValueAtTime(75, time + 0.04)
  oscGain.gain.setValueAtTime(peak * 0.5, time)
  oscGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045)
  osc.connect(oscGain)
  oscGain.connect(host.filterNode)

  const noise = ctx.createBufferSource()
  noise.buffer = host.noiseBuffer
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2100
  bp.Q.value = 1.2
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(peak * 0.8, time)
  ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.05)
  noise.connect(bp)
  bp.connect(ng)
  ng.connect(host.filterNode)
  host.sendToReverb(ng)

  osc.start(time)
  osc.stop(time + 0.05)
  noise.start(time, Math.random())
  noise.stop(time + 0.055)
  host.cleanup(osc, oscGain)
  host.cleanup(noise, bp, ng)
}

/**
 * Gated Reverb Snare (80s Synthwave)
 */
export function playGatedSnare(host: SynthContext, time: number, volume: number): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode || !host.masterGain || !host.noiseBuffer) return
  const peak = volume * host.volume

  // Gövde (200Hz body + 5kHz snap dengesi)
  const osc = ctx.createOscillator()
  const bodyGain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(195, time)
  osc.frequency.exponentialRampToValueAtTime(85, time + 0.09)
  bodyGain.gain.setValueAtTime(peak * 0.7, time)
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11)
  osc.connect(bodyGain)
  bodyGain.connect(host.filterNode)

  // Tel (noise) — kısa, tok
  const noise = ctx.createBufferSource()
  noise.buffer = host.noiseBuffer
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1900
  bp.Q.value = 0.9
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(peak * 0.9, time)
  ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.13)
  noise.connect(bp)
  bp.connect(ng)
  ng.connect(host.masterGain)
  host.sendToReverb(ng)

  // Gated kuyruk: büyük reverb hissi verip aniden kesilir
  const tail = ctx.createBufferSource()
  tail.buffer = host.noiseBuffer
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
  tailGain.connect(host.masterGain)
  host.sendToReverb(tailGain)

  osc.start(time)
  osc.stop(time + 0.12)
  noise.start(time, Math.random())
  noise.stop(time + 0.14)
  tail.start(time, Math.random())
  tail.stop(time + 0.25)
  host.cleanup(osc, bodyGain)
  host.cleanup(noise, bp, ng)
  host.cleanup(tail, tailBp, tailGain)
}

/**
 * Clap Layer (El Çırpma Katmanı)
 */
export function playClapLayer(host: SynthContext, time: number, volume: number): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode || !host.noiseBuffer) return
  const t = time + 0.008
  const peak = volume * host.volume
  for (let i = 0; i < 3; i++) {
    const hitTime = t + i * 0.012
    const src = ctx.createBufferSource()
    src.buffer = host.noiseBuffer
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1400
    const g = ctx.createGain()
    const v = i === 2 ? peak : peak * 0.5
    g.gain.setValueAtTime(v, hitTime)
    g.gain.exponentialRampToValueAtTime(0.0001, hitTime + (i === 2 ? 0.09 : 0.03))
    src.connect(hp)
    hp.connect(g)
    g.connect(host.filterNode)
    host.sendToReverb(g)
    src.start(hitTime, Math.random())
    src.stop(hitTime + 0.12)
    host.cleanup(src, hp, g)
  }
}

/**
 * 80s Synth Tom
 */
export function playTom(host: SynthContext, freq: number, time: number, volume: number): void {
  const ctx = host.ctx
  if (!ctx || !host.masterGain) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq * 1.4, time)
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.7), time + 0.12)
  const peak = volume * host.volume
  gain.gain.setValueAtTime(peak, time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18)
  osc.connect(gain)
  gain.connect(host.masterGain)
  host.sendToReverb(gain)
  osc.start(time)
  osc.stop(time + 0.2)
  host.cleanup(osc, gain)
  host.triggerDuck(time, 0.6)
}

/**
 * Crash Zili
 */
export function playCrash(host: SynthContext, time: number, volume: number): void {
  const ctx = host.ctx
  if (!ctx || !host.masterGain || !host.noiseBuffer) return
  const src = ctx.createBufferSource()
  src.buffer = host.noiseBuffer
  src.loop = true
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 6500
  const g = ctx.createGain()
  const peak = volume * host.volume
  g.gain.setValueAtTime(peak, time)
  g.gain.exponentialRampToValueAtTime(0.0001, time + 1.1)
  src.connect(hp)
  hp.connect(g)
  g.connect(host.masterGain)
  host.sendToReverb(g)
  src.start(time, Math.random())
  src.stop(time + 1.2)
  host.cleanup(src, hp, g)
}

/**
 * Hi-Hat (Kapalı / Açık)
 */
export function playHiHat(host: SynthContext, time: number, volume: number, open: boolean): void {
  const ctx = host.ctx
  if (!ctx || !host.masterGain || !host.noiseBuffer) return
  const dur = open ? 0.16 : 0.035
  const noise = ctx.createBufferSource()
  noise.buffer = host.noiseBuffer
  const filter = ctx.createBiquadFilter()

  if (host.currentTrack === 'lofi_chill') {
    // Lo-Fi için sıcak ve hafif boğuk kaset şapkası (dijital tiz çınlamasını keser)
    filter.type = 'bandpass'
    filter.frequency.value = open ? 6400 : 5400
    filter.Q.value = 1.0
  } else {
    filter.type = 'highpass'
    filter.frequency.value = 7800
  }

  const gain = ctx.createGain()
  const peak = volume * host.volume
  gain.gain.setValueAtTime(peak, time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(host.masterGain)

  noise.start(time, Math.random())
  noise.stop(time + dur + 0.01)
  host.cleanup(noise, filter, gain)
}

/**
 * Shaker (Sallama Ritim Enstrümanı)
 */
export function playShaker(host: SynthContext, time: number, volume: number): void {
  const ctx = host.ctx
  if (!ctx || !host.masterGain || !host.noiseBuffer) return
  const noise = ctx.createBufferSource()
  noise.buffer = host.noiseBuffer
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 4800 + Math.random() * 800
  bp.Q.value = 1.1
  const gain = ctx.createGain()
  const peak = volume * host.volume
  gain.gain.setValueAtTime(peak, time)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.028)

  noise.connect(bp)
  bp.connect(gain)
  gain.connect(host.masterGain)

  noise.start(time, Math.random())
  noise.stop(time + 0.035)
  host.cleanup(noise, bp, gain)
}

/**
 * Tape Stop / Plak Yavaşlaması (Auto-DJ parça geçiş efekti)
 * Bant makinesinin durması: tiz gürültü süpürmesi + perdesi çöken mekanik uğultu
 */
export function playTapeStopSweep(host: SynthContext, time: number, volume = 0.12): void {
  const ctx = host.ctx
  if (!ctx || !host.masterGain || !host.noiseBuffer) return

  const peak = volume * host.volume

  // 1. Filtreli gürültü süpürmesi: 6.2kHz'dan 240Hz'a alçalan "bant durması" tınısı
  const noise = ctx.createBufferSource()
  noise.buffer = host.noiseBuffer
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.4
  bp.frequency.setValueAtTime(6200, time)
  bp.frequency.exponentialRampToValueAtTime(240, time + 0.55)
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.0001, time)
  ng.gain.exponentialRampToValueAtTime(peak, time + 0.02)
  ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.6)
  noise.connect(bp)
  bp.connect(ng)
  ng.connect(host.masterGain)

  noise.start(time, Math.random())
  noise.stop(time + 0.65)
  host.cleanup(noise, bp, ng)

  // 2. Mekanik uğultu: motorun yavaşlayarak durması, 420Hz -> 60Hz perde çöküşü
  const osc = ctx.createOscillator()
  const og = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(420, time)
  osc.frequency.exponentialRampToValueAtTime(60, time + 0.5)
  og.gain.setValueAtTime(0.0001, time)
  og.gain.exponentialRampToValueAtTime(peak * 0.5, time + 0.03)
  og.gain.exponentialRampToValueAtTime(0.0001, time + 0.55)
  osc.connect(og)
  og.connect(host.masterGain)

  osc.start(time)
  osc.stop(time + 0.6)
  host.cleanup(osc, og)
}

/**
 * İğne Bırakma Tıkırtısı (record needle drop)
 * Plak çaların kolunun yere değmesi: kısa, kuru, tiz tıkırtı
 */
export function playVinylClick(host: SynthContext, time: number, volume = 0.08): void {
  const ctx = host.ctx
  if (!ctx || !host.masterGain || !host.noiseBuffer) return

  const noise = ctx.createBufferSource()
  noise.buffer = host.noiseBuffer
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 2400
  const g = ctx.createGain()
  const peak = volume * host.volume
  g.gain.setValueAtTime(peak, time)
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.03)

  noise.connect(hp)
  hp.connect(g)
  g.connect(host.masterGain)

  noise.start(time, Math.random())
  noise.stop(time + 0.04)
  host.cleanup(noise, hp, g)
}
