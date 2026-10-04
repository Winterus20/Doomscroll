import type { SynthContext } from '../types'

/**
 * Fender Rhodes Mark I Fiziksel Modellemesi:
 * Tine Çanı + Tonebar Gövdesi + Suitcase Stereo Optik Tremolo + Velocity Bark
 */
export function playRhodesNote(
  host: SynthContext,
  freq: number,
  time: number,
  duration: number,
  volume: number,
  pan = 0,
  velocity = 0.8
): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode) return

  // 1. Ana Tonebar Gövdesi: Sinüs (temel rezonans) + Üçgen (ahşap sıcaklığı)
  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const noteGain = ctx.createGain()
  const noteFilter = ctx.createBiquadFilter()
  const panner = host.makePanner(pan)

  osc1.type = 'triangle'
  osc2.type = 'sine'
  osc1.frequency.setValueAtTime(freq, time)
  osc1.detune.setValueAtTime(-4 + (Math.random() - 0.5) * 5, time)
  osc2.frequency.setValueAtTime(freq, time)
  osc2.detune.setValueAtTime(4 + (Math.random() - 0.5) * 5, time)

  // 2. Tine Çanı (Metallic Chime): Rhodes çubuğunun 3.96x katındaki metalik armonik
  const tine = ctx.createOscillator()
  const tineGain = ctx.createGain()
  tine.type = 'sine'
  tine.frequency.setValueAtTime(freq * 3.96, time)
  const tineLevel = volume * host.volume * (0.09 + velocity * 0.12)
  tineGain.gain.setValueAtTime(0.0001, time)
  tineGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, tineLevel), time + 0.006)
  tineGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08)
  tine.connect(tineGain)

  // 3. Keçe Tokmak Vuruşu (Felt Hammer Thump): 95Hz mekanik bas tıkırtısı
  const thump = ctx.createOscillator()
  const thumpGain = ctx.createGain()
  thump.type = 'triangle'
  thump.frequency.setValueAtTime(95, time)
  thump.frequency.exponentialRampToValueAtTime(35, time + 0.025)
  thumpGain.gain.setValueAtTime(volume * host.volume * 0.08, time)
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025)
  thump.connect(thumpGain)

  // 4. Suitcase Stereo Optik Tremolo: Rhodes amfisinin imzası olan yumuşak stereo salınım (3.4 Hz)
  const tremLfo = ctx.createOscillator()
  const tremGain = ctx.createGain()
  tremLfo.type = 'sine'
  tremLfo.frequency.setValueAtTime(3.4 + Math.random() * 0.3, time)
  tremGain.gain.setValueAtTime(0.24, time)
  tremLfo.connect(tremGain)
  if (panner) {
    tremGain.connect(panner.pan)
  }

  // 5. Tape Wow & Flutter (Kaset Esnemesi): Yavaş wow (0.32 Hz) + Mikro flutter (5.3 Hz)
  const wow = ctx.createOscillator()
  const wowGain = ctx.createGain()
  wow.type = 'sine'
  wow.frequency.setValueAtTime(0.32 + Math.random() * 0.1, time)
  wowGain.gain.setValueAtTime(4.2, time)
  wow.connect(wowGain)
  wowGain.connect(osc1.detune)
  wowGain.connect(osc2.detune)

  const flutter = ctx.createOscillator()
  const flutterGain = ctx.createGain()
  flutter.type = 'sine'
  flutter.frequency.setValueAtTime(5.3 + Math.random() * 0.4, time)
  flutterGain.gain.setValueAtTime(2.2, time)
  flutter.connect(flutterGain)
  flutterGain.connect(osc1.detune)
  flutterGain.connect(osc2.detune)

  // 6. Tuş Hassasiyeti (Velocity Bark Filter): Sert vuruşlarda parlak/hırçın, yumuşak vuruşlarda kadife
  noteFilter.type = 'lowpass'
  const filterCutoff = 2100 + velocity * 1700 + Math.random() * 300
  noteFilter.frequency.setValueAtTime(filterCutoff, time)
  noteFilter.frequency.exponentialRampToValueAtTime(1200, time + duration)
  noteFilter.Q.setValueAtTime(0.65, time)

  // 7. Zarf (Envelope): Yumuşak atak, zengin gövde, ipeksi sönüş
  const peak = volume * host.volume * (0.85 + velocity * 0.35)
  noteGain.gain.setValueAtTime(0.0001, time)
  noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.018)
  noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.38), time + 0.55)
  noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

  osc1.connect(noteGain)
  osc2.connect(noteGain)
  tineGain.connect(noteGain)
  thumpGain.connect(noteGain)
  noteGain.connect(noteFilter)

  if (panner) {
    noteFilter.connect(panner)
    panner.connect(host.filterNode)
    host.sendToReverb(panner)
    if (host.delayNode && Math.random() > 0.4) host.sendToDelay(panner)
  } else {
    noteFilter.connect(host.filterNode)
    host.sendToReverb(noteFilter)
  }

  const stopAt = time + duration + 0.06
  osc1.start(time)
  osc2.start(time)
  tine.start(time)
  thump.start(time)
  tremLfo.start(time)
  wow.start(time)
  flutter.start(time)

  osc1.stop(stopAt)
  osc2.stop(stopAt)
  tine.stop(time + 0.09)
  thump.stop(time + 0.03)
  tremLfo.stop(stopAt)
  wow.stop(stopAt)
  flutter.stop(stopAt)

  host.cleanup(osc1, noteGain, panner)
  host.cleanup(osc2, noteFilter)
  host.cleanup(tine, tineGain)
  host.cleanup(thump, thumpGain)
  host.cleanup(tremLfo, tremGain)
  host.cleanup(wow, wowGain)
  host.cleanup(flutter, flutterGain)
}

/**
 * Wistful Lo-Fi Muted Pluck (Gitar / Vibraphon Tınısı)
 */
export function playLofiPluck(
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
  const noteGain = ctx.createGain()
  const pluckFilter = ctx.createBiquadFilter()
  const panner = host.makePanner(pan)

  osc.type = 'triangle'
  osc.frequency.setValueAtTime(freq, time)
  osc.detune.setValueAtTime((Math.random() - 0.5) * 6, time)

  const vib = ctx.createOscillator()
  const vibGain = ctx.createGain()
  vib.type = 'sine'
  vib.frequency.setValueAtTime(4.8, time)
  vibGain.gain.setValueAtTime(4.5, time)
  vib.connect(vibGain)
  vibGain.connect(osc.detune)

  pluckFilter.type = 'lowpass'
  pluckFilter.frequency.setValueAtTime(2600, time)
  pluckFilter.frequency.exponentialRampToValueAtTime(1100, time + duration)
  pluckFilter.Q.setValueAtTime(1.1, time)

  const peak = volume * host.volume
  noteGain.gain.setValueAtTime(0.0001, time)
  noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.014)
  noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

  osc.connect(noteGain)
  noteGain.connect(pluckFilter)
  if (panner) {
    pluckFilter.connect(panner)
    panner.connect(host.filterNode)
    host.sendToReverb(panner)
    host.sendToDelay(panner)
  } else {
    pluckFilter.connect(host.filterNode)
    host.sendToReverb(pluckFilter)
    host.sendToDelay(pluckFilter)
  }

  osc.start(time)
  vib.start(time)
  osc.stop(time + duration + 0.04)
  vib.stop(time + duration + 0.04)
  host.cleanup(osc, noteGain, panner)
  host.cleanup(vib, vibGain, pluckFilter)
}

/**
 * Standart Synth Pluck (Arpej ve Groove Stabs)
 */
export function playPluckNote(
  host: SynthContext,
  freq: number,
  time: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'triangle',
  pan = 0,
  sendToDelay = false
): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode) return

  const osc = ctx.createOscillator()
  const noteGain = ctx.createGain()
  const panner = host.makePanner(pan)

  osc.type = type
  osc.frequency.setValueAtTime(freq, time)
  osc.detune.setValueAtTime((Math.random() - 0.5) * 7, time)

  const peak = volume * host.volume
  noteGain.gain.setValueAtTime(0.0001, time)
  noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.012)
  noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

  osc.connect(noteGain)
  if (panner) {
    noteGain.connect(panner)
    panner.connect(host.filterNode)
    host.sendToReverb(panner)
    if (sendToDelay) host.sendToDelay(panner)
  } else {
    noteGain.connect(host.filterNode)
    host.sendToReverb(noteGain)
    if (sendToDelay) host.sendToDelay(noteGain)
  }

  osc.start(time)
  osc.stop(time + duration + 0.03)
  host.cleanup(osc, noteGain, panner)
}

/**
 * Juno 106 Tarzı Supersaw Pad
 */
export function playSupersawPad(
  host: SynthContext,
  freq: number,
  time: number,
  duration: number,
  volume: number
): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode) return

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

  const chorusLfo = ctx.createOscillator()
  const chorusGain = ctx.createGain()
  chorusLfo.type = 'sine'
  chorusLfo.frequency.setValueAtTime(0.35, time)
  chorusGain.gain.setValueAtTime(6, time)
  chorusLfo.connect(chorusGain)
  chorusGain.connect(oscA.detune)
  chorusGain.connect(oscB.detune)

  padFilter.type = 'lowpass'
  padFilter.frequency.setValueAtTime(6800, time)
  padFilter.Q.setValueAtTime(0.4, time)

  const peak = volume * host.volume
  noteGain.gain.setValueAtTime(0.0001, time)
  noteGain.gain.linearRampToValueAtTime(peak, time + 0.32)
  noteGain.gain.setValueAtTime(peak, time + Math.max(0.32, duration - 0.8))
  noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

  oscA.connect(padFilter)
  oscB.connect(padFilter)
  oscC.connect(padFilter)
  padFilter.connect(noteGain)
  noteGain.connect(host.filterNode)
  host.sendToReverb(noteGain)
  host.sendToDelay(noteGain)

  oscA.start(time)
  oscB.start(time)
  oscC.start(time)
  chorusLfo.start(time)
  oscA.stop(time + duration)
  oscB.stop(time + duration)
  oscC.stop(time + duration)
  chorusLfo.stop(time + duration)
  host.cleanup(oscA, noteGain)
  host.cleanup(oscB, padFilter)
  host.cleanup(oscC)
  host.cleanup(chorusLfo, chorusGain)
}

/**
 * OB-Xa Tarzı Analog Synth Lead
 */
export function playLeadSynth(
  host: SynthContext,
  freq: number,
  time: number,
  duration: number,
  volume: number,
  pan = 0
): void {
  const ctx = host.ctx
  if (!ctx || !host.filterNode) return

  const oscA = ctx.createOscillator()
  const oscB = ctx.createOscillator()
  const noteGain = ctx.createGain()
  const leadFilter = ctx.createBiquadFilter()
  const panner = host.makePanner(pan)

  oscA.type = 'sawtooth'
  oscB.type = 'sawtooth'
  oscA.frequency.setValueAtTime(freq * 0.985, time)
  oscB.frequency.setValueAtTime(freq * 1.015, time)
  oscA.frequency.exponentialRampToValueAtTime(freq, time + 0.035)
  oscB.frequency.exponentialRampToValueAtTime(freq, time + 0.035)

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

  const peak = volume * host.volume
  noteGain.gain.setValueAtTime(0.0001, time)
  noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.02)
  noteGain.gain.setValueAtTime(Math.max(0.0002, peak), time + Math.max(0.02, duration - 0.12))
  noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

  oscA.connect(leadFilter)
  oscB.connect(leadFilter)
  leadFilter.connect(noteGain)
  if (panner) {
    noteGain.connect(panner)
    panner.connect(host.filterNode)
    host.sendToReverb(panner)
    host.sendToDelay(panner)
  } else {
    noteGain.connect(host.filterNode)
    host.sendToReverb(noteGain)
    host.sendToDelay(noteGain)
  }

  oscA.start(time)
  oscB.start(time)
  vib.start(time)
  oscA.stop(time + duration + 0.02)
  oscB.stop(time + duration + 0.02)
  vib.stop(time + duration + 0.02)
  host.cleanup(oscA, noteGain, panner)
  host.cleanup(oscB, leadFilter)
  host.cleanup(vib, vibGain)
}
