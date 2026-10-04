import type { SynthContext } from '../types'
import { NOTES } from '../notes'
import { playSupersawPad, playPluckNote, playLeadSynth } from '../instruments/keys'
import { playSynthBass } from '../instruments/bass'
import {
  playElectronicKick,
  playGatedSnare,
  playClapLayer,
  playSnare,
  playHiHat,
  playTom,
  playCrash
} from '../instruments/drums'
import { playNoiseSwell } from '../instruments/ambient'

export function renderSynthwave(host: SynthContext, step: number, time: number): void {
  const measure = Math.floor(step / 16)
  const stepInMeasure = step % 16
  const t = host.humanTime(time)
  const section = host.loopCount % 8
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
    playSupersawPad(host, scale[0], t, padDur, padVol)
    playSupersawPad(host, scale[2], t + 0.02, padDur, padVol * 0.8)
    if (isChorus) {
      playSupersawPad(host, scale[3], t + 0.04, padDur, padVol * 0.6)
    }
    // Chorus girişinde crash (frase başı)
    if (isChorus && measure === 0 && host.loopCount % 2 === 0) {
      playCrash(host, t, 0.12)
    }
  }

  // 16'lık neon arpej — her bölümde çalışır, breakdown'da daha yumuşak
  const currentScale = arpScales[measure]
  const pattern = [0, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 4, 3, 2, 1]
  const arpNote = currentScale[pattern[stepInMeasure] % currentScale.length]
  const arpVol = isBreakdown ? 0.09 : isChorus ? 0.14 : 0.12
  const arpPan =
    stepInMeasure % 4 === 0
      ? 0.28
      : stepInMeasure % 4 === 2
        ? -0.28
        : stepInMeasure % 2 === 0
          ? 0.12
          : -0.12
  playPluckNote(host, arpNote, t, 0.16, host.humanVel(arpVol), 'sawtooth', arpPan, true)
  // Chorus'ta oktav sparkle (her 2 turda bir, üst oktav parıltısı)
  if (isChorus && stepInMeasure % 8 === 6 && host.loopCount % 2 === 0) {
    playPluckNote(host, arpNote * 2, t + 0.02, 0.14, 0.05, 'square', -arpPan, true)
  }

  // Yürüyen 8'lik bas — portamento hissi synth tarafında, akort temiz
  if (hasBass && stepInMeasure % 2 === 0) {
    const root = roots[measure]
    const octaveMult = stepInMeasure === 6 || stepInMeasure === 10 || stepInMeasure === 14 ? 2 : 1
    const bassVol = isChorus ? 0.36 : 0.32
    playSynthBass(host, root * octaveMult, t, 0.22, bassVol)
  }

  // Davul: intro/breakdown'da yok, build'de kick + toms, verse/chorus full
  if (hasDrums) {
    if (stepInMeasure === 0 || stepInMeasure === 4 || stepInMeasure === 8 || stepInMeasure === 12) {
      playElectronicKick(host, t, isChorus ? 0.5 : 0.46)
    }
    if (hasFullDrums && (stepInMeasure === 4 || stepInMeasure === 12)) {
      playGatedSnare(host, t, host.humanVel(isChorus ? 0.34 : 0.3))
      playClapLayer(host, t, host.humanVel(0.12))
    }
    // Build'de snare roll (son ölçüde artan yoğunluk)
    if (isBuild && measure === 3 && stepInMeasure % 2 === 0 && stepInMeasure >= 8) {
      playSnare(host, t, 0.1 + stepInMeasure * 0.008)
    }
    // Hat: kapalılarda groove, açıklar off-beat'te (disco etkisi)
    const isOpenHat = stepInMeasure === 6 || stepInMeasure === 14
    playHiHat(host, t, isOpenHat ? 0.07 : stepInMeasure % 2 === 0 ? 0.055 : 0.085, isOpenHat)
    // Tom fill: frase sonu (son ölçü son 4 adım, azalan perde)
    if (step === 60) playTom(host, 164.81, t, 0.22)
    if (step === 61) playTom(host, 146.83, t, 0.22)
    if (step === 62) playTom(host, 130.81, t, 0.24)
    if (step === 63 && hasFullDrums) playTom(host, 98.0, t, 0.26)
  } else if (isBreakdown) {
    // Breakdown'da sadece nefes: seyreltik hat yok, sadece swell
    if (step === 32) {
      playNoiseSwell(host, t, 6.0, 0.04)
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
      const density = 0.35 + host.intensity * 0.55
      if (leadGate && Math.random() < density) {
        const leadVol = isChorus ? 0.16 : 0.1
        playLeadSynth(
          host,
          leadFreq,
          t,
          0.42,
          host.humanVel(leadVol),
          stepInMeasure % 4 === 0 ? 0.1 : -0.1
        )
      }
    }
  }
}
