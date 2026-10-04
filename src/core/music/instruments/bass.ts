import type { SynthContext } from '../types'

let lastLofiBassFreq = 0

export function resetBassState(): void {
  lastLofiBassFreq = 0
}

/**
 * Derin Sub-Bass Sentezi (Sinüs + Üçgen Warmth + 340Hz Düşük Geçiren Filtre + 35ms Portamento Glide)
 */
export function playSubBass(
  host: SynthContext,
  freq: number,
  time: number,
  duration: number,
  volume: number
): void {
  const ctx = host.ctx
  if (!ctx || !host.masterGain) return

  const osc = ctx.createOscillator()
  const warmth = ctx.createOscillator()
  const warmthGain = ctx.createGain()
  const noteGain = ctx.createGain()
  const bassFilter = ctx.createBiquadFilter()

  osc.type = 'sine'
  warmth.type = 'triangle'

  // Portamento / Glide: önceki bas notasından yeni notaya yumuşak 35ms kayma
  if (lastLofiBassFreq > 0 && Math.abs(lastLofiBassFreq - freq) < 90) {
    osc.frequency.setValueAtTime(lastLofiBassFreq, time)
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.035)
    warmth.frequency.setValueAtTime(lastLofiBassFreq * 2, time)
    warmth.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.035)
  } else {
    osc.frequency.setValueAtTime(freq, time)
    warmth.frequency.setValueAtTime(freq * 2, time)
  }
  lastLofiBassFreq = freq

  // Düşük frekans filtresi: 340Hz ile üst harmonikleri yumuşatır, çamuru keser
  bassFilter.type = 'lowpass'
  bassFilter.frequency.setValueAtTime(340, time)
  bassFilter.Q.setValueAtTime(0.7, time)

  warmthGain.gain.setValueAtTime(0.14, time)
  warmthGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
  warmth.connect(warmthGain)
  warmthGain.connect(noteGain)

  const peak = volume * host.volume
  noteGain.gain.setValueAtTime(0.0001, time)
  noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.03)
  noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

  osc.connect(noteGain)
  noteGain.connect(bassFilter)
  bassFilter.connect(host.masterGain)

  osc.start(time)
  warmth.start(time)
  osc.stop(time + duration + 0.02)
  warmth.stop(time + duration + 0.02)
  host.cleanup(osc, noteGain, bassFilter)
  host.cleanup(warmth, warmthGain)
}

/**
 * Punchy Analog Synth Bass (Testere + Sub Sinüs + Rezonanslı Lowpass + 30ms Portamento)
 */
export function playSynthBass(
  host: SynthContext,
  freq: number,
  time: number,
  duration: number,
  volume: number
): void {
  const ctx = host.ctx
  if (!ctx || !host.masterGain) return

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

  const peak = volume * host.volume
  noteGain.gain.setValueAtTime(0.0001, time)
  noteGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.018)
  noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

  osc.connect(bassFilter)
  sub.connect(noteGain)
  bassFilter.connect(noteGain)
  noteGain.connect(host.masterGain)

  osc.start(time)
  sub.start(time)
  osc.stop(time + duration + 0.02)
  sub.stop(time + duration + 0.02)
  host.cleanup(osc, bassFilter, noteGain)
  host.cleanup(sub)
}
