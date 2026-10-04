import type { SynthContext } from '../types'
import { NOTES } from '../notes'
import { playPluckNote } from '../instruments/keys'
import { playSynthBass } from '../instruments/bass'
import {
  playSoftKick,
  playRimshot,
  playSnare,
  playShaker,
  playHiHat
} from '../instruments/drums'

export function renderSubwayGroove(host: SynthContext, step: number, time: number): void {
  const measure = Math.floor(step / 16)
  const stepInMeasure = step % 16
  const t = host.humanTime(time)

  const chordRoots = [NOTES.D3, NOTES.C3, NOTES.F3, NOTES.E3]

  // Groovy stabs: kısa, kesik, hafif detuneli
  if (stepInMeasure === 2 || stepInMeasure === 7 || stepInMeasure === 11) {
    const root = chordRoots[measure]
    const vel = stepInMeasure === 2 ? 0.18 : 0.13
    playPluckNote(host, root, t, 0.22, host.humanVel(vel), 'triangle', 0.15)
    playPluckNote(host, root * 1.5, t + 0.012, 0.2, host.humanVel(vel * 0.8), 'sine', -0.15)
    if (stepInMeasure === 11 && host.loopCount % 2 === 1) {
      playPluckNote(host, root * 2, t + 0.06, 0.18, 0.08, 'square', 0.0)
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
    playSynthBass(host, root * mult, t, 0.2, 0.32)
  }

  // Davul: boom-bap + ghost
  if (stepInMeasure === 0 || stepInMeasure === 7 || stepInMeasure === 10) {
    playSoftKick(host, host.kickTime(t), host.humanVel(0.36))
  }
  if (stepInMeasure === 4 || stepInMeasure === 12) {
    playRimshot(host, host.snareTime(t), host.humanVel(0.22))
  }
  if (stepInMeasure === 15 && Math.random() > 0.5) {
    playSnare(host, host.snareTime(t), 0.06) // ghost
  }
  if (stepInMeasure % 2 === 0) {
    playShaker(host, t, host.humanVel(0.1))
  } else {
    playHiHat(host, t, host.humanVel(0.06), false)
  }
}
