import type { SynthContext } from '../types'
import { NOTES } from '../notes'

/**
 * Ambient Pad (Analog Sinüs / Üçgen Çift Katman, Uyku Modunda 6s Atak/Sönüş)
 */
export function playAmbientPad(
  host: SynthContext,
  freq: number,
  time: number,
  duration: number,
  volume: number,
  pan = 0
): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode) return

  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const noteGain = ctx.createGain()
  const panner = host.makePanner(pan)
  const isSleep = host.currentTrack === 'ambient_drone'

  osc1.type = 'triangle'
  osc2.type = 'sine'
  osc1.frequency.setValueAtTime(freq, time)
  osc1.detune.setValueAtTime(-7, time)
  osc2.frequency.setValueAtTime(freq, time)
  osc2.detune.setValueAtTime(7, time)

  const peak = volume * host.volume
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
    panner.connect(host.filterNode)
    host.sendToReverb(panner)
    // Uyku modunda delay yok: ritim beklentisi beyni uyanık tutar
    if (!isSleep) host.sendToDelay(panner)
  } else {
    noteGain.connect(host.filterNode)
    host.sendToReverb(noteGain)
  }

  osc1.start(time)
  osc2.start(time)
  osc1.stop(time + duration + 0.05)
  osc2.stop(time + duration + 0.05)
  host.cleanup(osc1, noteGain, panner)
  host.cleanup(osc2)
}

/**
 * Kristal Çan (Crystal Bell)
 */
export function playCrystalBell(
  host: SynthContext,
  freq: number,
  time: number,
  duration: number,
  volume: number,
  pan = 0
): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode) return

  const osc = ctx.createOscillator()
  const overtone = ctx.createOscillator()
  const noteGain = ctx.createGain()
  const overGain = ctx.createGain()
  const panner = host.makePanner(pan)
  const isSleep = host.currentTrack === 'ambient_drone'

  osc.type = 'sine'
  overtone.type = 'sine'
  osc.frequency.setValueAtTime(freq, time)
  overtone.frequency.setValueAtTime(freq * 2.76, time)

  // Uyku çanı %45 daha kısık: güvenlik sınırı
  const peak = volume * host.volume * (isSleep ? 0.55 : 1.0)
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
    panner.connect(host.filterNode)
    host.sendToReverb(panner)
    if (!isSleep) host.sendToDelay(panner)
  } else {
    noteGain.connect(host.filterNode)
    host.sendToReverb(noteGain)
  }

  osc.start(time)
  overtone.start(time)
  osc.stop(time + duration)
  overtone.stop(time + duration * 0.55)
  host.cleanup(osc, noteGain, panner)
  host.cleanup(overtone, overGain)
}

/**
 * Gürültü Kabarması (Noise Swell)
 */
export function playNoiseSwell(
  host: SynthContext,
  time: number,
  duration: number,
  volume: number
): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode || !host.noiseBuffer) return
  const src = ctx.createBufferSource()
  src.buffer = host.noiseBuffer
  src.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.setValueAtTime(600, time)
  bp.frequency.linearRampToValueAtTime(1200, time + duration / 2)
  bp.frequency.linearRampToValueAtTime(500, time + duration)
  bp.Q.setValueAtTime(0.8, time)
  const g = ctx.createGain()
  const peak = volume * host.volume
  g.gain.setValueAtTime(0.0001, time)
  g.gain.linearRampToValueAtTime(peak, time + duration * 0.4)
  g.gain.linearRampToValueAtTime(0.0001, time + duration)

  src.connect(bp)
  bp.connect(g)
  g.connect(host.filterNode)
  host.sendToReverb(g)

  src.start(time)
  src.stop(time + duration + 0.05)
  host.cleanup(src, bp, g)
}

/**
 * Space Ping
 */
export function playSpacePing(host: SynthContext, freq: number, time: number, pan = 0): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode) return
  const osc = ctx.createOscillator()
  const noteGain = ctx.createGain()
  const panner = host.makePanner(pan)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, time)
  const peak = 0.035 * host.volume
  noteGain.gain.setValueAtTime(0.0001, time)
  noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.008)
  noteGain.gain.exponentialRampToValueAtTime(0.0001, time + 1.8)
  osc.connect(noteGain)
  if (panner) {
    noteGain.connect(panner)
    panner.connect(host.filterNode)
    host.sendToReverb(panner)
  } else {
    noteGain.connect(host.filterNode)
    host.sendToReverb(noteGain)
  }
  osc.start(time)
  osc.stop(time + 1.9)
  host.cleanup(osc, noteGain, panner)
}

/**
 * Shimmer Yankı Dokunuşu
 */
export function sendToReverbPing(host: SynthContext, freq: number, time: number, pan = 0): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode) return
  const osc = ctx.createOscillator()
  const noteGain = ctx.createGain()
  const panner = host.makePanner(pan)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq * 1.005, time + 0.12)
  const peak = 0.012 * host.volume
  noteGain.gain.setValueAtTime(0.0001, time + 0.12)
  noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.3)
  noteGain.gain.exponentialRampToValueAtTime(0.0001, time + 2.8)
  osc.connect(noteGain)
  if (panner) {
    noteGain.connect(panner)
    host.sendToReverb(panner)
  } else {
    host.sendToReverb(noteGain)
  }
  osc.start(time + 0.12)
  osc.stop(time + 2.9)
  host.cleanup(osc, noteGain, panner)
}

/**
 * Boru Orgu: Interstellar Temple Church Çekirdeği (Uyku İçin Yumuşatılmış)
 */
export function playPipeOrgan(
  host: SynthContext,
  freq: number,
  time: number,
  duration: number,
  volume: number,
  pan = 0
): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode || !host.noiseBuffer) return
  const panner = host.makePanner(pan)
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
    host.cleanup(o, g)
    return o
  }
  mk(0.5, 'sine', -4, 0.5)
  mk(1.0, 'sine', 3, 0.85)
  mk(1.0, 'triangle', -6, 0.22)
  mk(2.0, 'sine', 5, 0.12)

  // Körük nefesi: bant geçiren gürültü orgla birlikte şişer
  const breath = ctx.createBufferSource()
  breath.buffer = host.noiseBuffer
  breath.loop = true
  const breathFilter = ctx.createBiquadFilter()
  breathFilter.type = 'bandpass'
  breathFilter.frequency.value = 420
  breathFilter.Q.value = 0.7
  const breathGain = ctx.createGain()
  breathGain.gain.setValueAtTime(0.0001, time)
  breathGain.gain.linearRampToValueAtTime(volume * host.volume * 0.14, time + 5.0)
  breathGain.gain.setValueAtTime(volume * host.volume * 0.14, time + Math.max(5.0, duration - 6.0))
  breathGain.gain.linearRampToValueAtTime(0.0001, time + duration)
  breath.connect(breathFilter)
  breathFilter.connect(breathGain)
  breathGain.connect(organFilter)
  breath.start(time, Math.random())
  breath.stop(time + duration + 0.1)

  const peak = volume * host.volume
  noteGain.gain.setValueAtTime(0.0001, time)
  noteGain.gain.linearRampToValueAtTime(peak, time + 4.0)
  noteGain.gain.setValueAtTime(peak, time + Math.max(4.0, duration - 6.0))
  noteGain.gain.linearRampToValueAtTime(0.0001, time + duration)
  organFilter.connect(noteGain)
  if (panner) {
    noteGain.connect(panner)
    panner.connect(host.filterNode)
    host.sendToReverb(panner)
  } else {
    noteGain.connect(host.filterNode)
    host.sendToReverb(noteGain)
  }
  host.cleanup(breath, breathFilter, breathGain, organFilter, noteGain, panner)
  host.cleanupAfter(Math.ceil((duration + 0.5) * 1000), organFilter, noteGain, panner)
}

/**
 * İnsan Korosu Nefesi: 60 Seslik Zimmer Korosu
 */
export function playChoirExhale(
  host: SynthContext,
  freq: number,
  time: number,
  duration: number,
  volume: number,
  pan = 0
): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode) return
  const panner = host.makePanner(pan)
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
  const peak = volume * host.volume
  choirGain.gain.setValueAtTime(0.0001, time)
  choirGain.gain.linearRampToValueAtTime(peak, time + duration * 0.45)
  choirGain.gain.linearRampToValueAtTime(0.0001, time + duration)
  if (panner) {
    choirGain.connect(panner)
    host.sendToReverb(panner)
  } else {
    host.sendToReverb(choirGain)
  }
  wobble.start(time)
  wobble.stop(time + duration + 0.05)
  oscs.forEach((o) => {
    o.start(time)
    o.stop(time + duration + 0.05)
  })
  host.cleanup(wobble, wobbleGain, choirGain, panner, ...extraNodes)
  oscs.forEach((o) => {
    host.cleanup(o)
  })
  host.cleanupAfter(Math.ceil((duration + 0.5) * 1000), choirGain, panner, ...extraNodes)
}

/**
 * Alçalan Shepard: Sonsuz İniş İllüzyonu
 */
export function playShepardFall(host: SynthContext, time: number, duration: number): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode) return
  const mainFilter: BiquadFilterNode = host.filterNode
  const baseNotes = [NOTES.C5, NOTES.G4, NOTES.E4, NOTES.C4]
  baseNotes.forEach((base, idx) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    const panner = host.makePanner(idx % 2 === 0 ? -0.25 : 0.25)
    o.type = 'sine'
    o.frequency.setValueAtTime(base, time)
    o.frequency.exponentialRampToValueAtTime(Math.max(30, base * 0.5), time + duration)
    const peak = 0.014 * host.volume
    g.gain.setValueAtTime(0.0001, time)
    g.gain.linearRampToValueAtTime(peak, time + duration * 0.5)
    g.gain.linearRampToValueAtTime(0.0001, time + duration)
    o.connect(g)
    if (panner) {
      g.connect(panner)
      panner.connect(mainFilter)
      host.sendToReverb(panner)
    } else {
      g.connect(mainFilter)
      host.sendToReverb(g)
    }
    o.start(time)
    o.stop(time + duration + 0.05)
    host.cleanup(o, g, panner)
  })
}

/**
 * Yumuşak Saat Tiktakı
 */
export function playSoftTick(host: SynthContext, time: number, volume: number): void {
  const ctx = host.ctx
  if (!ctx || !host.masterGain || !host.noiseBuffer) return
  const peak = volume * host.volume
  const tick = ctx.createOscillator()
  const tickGain = ctx.createGain()
  tick.type = 'sine'
  tick.frequency.setValueAtTime(1250, time)
  tickGain.gain.setValueAtTime(peak, time)
  tickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045)
  tick.connect(tickGain)
  tickGain.connect(host.masterGain)
  host.sendToReverb(tickGain)
  tick.start(time)
  tick.stop(time + 0.06)
  host.cleanup(tick, tickGain)
}

/**
 * Elite Balina Uğultusu: Gaz Devi Whoop
 */
export function playWhaleCall(host: SynthContext, time: number, pan = 0): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode) return
  const dur = 8.0
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  const panner = host.makePanner(pan)
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
  const peak = 0.038 * host.volume
  g.gain.setValueAtTime(0.0001, time)
  g.gain.linearRampToValueAtTime(peak, time + dur * 0.35)
  g.gain.linearRampToValueAtTime(0.0001, time + dur)
  o.connect(g)
  if (panner) {
    g.connect(panner)
    panner.connect(host.filterNode)
    host.sendToReverb(panner)
  } else {
    g.connect(host.filterNode)
    host.sendToReverb(g)
  }
  o.start(time)
  vib.start(time)
  o.stop(time + dur + 0.05)
  vib.stop(time + dur + 0.05)
  host.cleanup(o, g, panner)
  host.cleanup(vib, vibGain)
}

/**
 * Astroneer Müzik Kutusu: Çocuksu Ninni
 */
export function playMusicBox(host: SynthContext, freq: number, time: number, pan = 0): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode) return
  const mainFilter: BiquadFilterNode = host.filterNode
  const panner = host.makePanner(pan)
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
    const peak = p.level * host.volume
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, time + p.dur)
    o.connect(g)
    if (panner) {
      g.connect(panner)
      panner.connect(mainFilter)
      host.sendToReverb(panner)
    } else {
      g.connect(mainFilter)
      host.sendToReverb(g)
    }
    o.start(time)
    o.stop(time + p.dur + 0.05)
    host.cleanup(o, g, panner)
  })
}
