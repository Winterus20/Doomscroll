import type { SynthContext } from '../types'
import { NOTES } from '../notes'
import { playRhodesNote, playLofiPluck } from '../instruments/keys'
import { playSubBass } from '../instruments/bass'
import {
  playSoftKick,
  playSnare,
  playGhostSnare,
  playHiHat,
  playShaker
} from '../instruments/drums'

export function getLofiBank(bank: number): {
  chords: number[][]
  bass: number[]
  approach: number[]
} {
  const banks = [
    {
      // Bank 0: Sunday Rain (Fmaj9 -> Em9 -> Dm9 -> Cmaj9)
      chords: [
        [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4], // Fmaj9 (rootless 3-5-7-9)
        [NOTES.G3, NOTES.B3, NOTES.D4, NOTES.Fs4], // Em9
        [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4], // Dm9
        [NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4] // Cmaj9
      ],
      bass: [NOTES.F2, NOTES.E2, NOTES.D2, NOTES.C2],
      approach: [NOTES.Fs2, NOTES.Eb2, NOTES.Db2, NOTES.E2]
    },
    {
      // Bank 1: 3AM Thoughts (Am9 -> Dm9 -> Db9 tritone sub -> Cmaj9)
      chords: [
        [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.B4], // Am9
        [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4], // Dm9
        [NOTES.F3, NOTES.Ab3, NOTES.B3, NOTES.Eb4], // Db9 (G7 tritone substitution)
        [NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4] // Cmaj9
      ],
      bass: [NOTES.A2 * 0.5, NOTES.D2, NOTES.Db2, NOTES.C2],
      approach: [NOTES.Eb2, NOTES.D2, NOTES.Db2, NOTES.Gs2 * 0.5]
    },
    {
      // Bank 2: Tokyo Highway (Fmaj9 -> G13 -> Em7 -> Am9)
      chords: [
        [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4], // Fmaj9
        [NOTES.B3, NOTES.E4, NOTES.F4, NOTES.A4], // G13
        [NOTES.G3, NOTES.B3, NOTES.D4, NOTES.G4], // Em7
        [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.B4] // Am9
      ],
      bass: [NOTES.F2, NOTES.G2, NOTES.E2, NOTES.A2 * 0.5],
      approach: [NOTES.Fs2, NOTES.F2, NOTES.Gs2 * 0.5, NOTES.E2]
    },
    {
      // Bank 3: Midnight Cafe (Dm9 -> G13 -> Cmaj9 -> A7b13)
      chords: [
        [NOTES.F3, NOTES.A3, NOTES.C4, NOTES.E4], // Dm9
        [NOTES.F3, NOTES.B3, NOTES.E4, NOTES.A4], // G13
        [NOTES.E3, NOTES.G3, NOTES.B3, NOTES.D4], // Cmaj9
        [NOTES.G3, NOTES.Cs4, NOTES.F4, NOTES.A4] // A7b13 (secondary dominant)
      ],
      bass: [NOTES.D2, NOTES.G2, NOTES.C2, NOTES.A2 * 0.5],
      approach: [NOTES.Fs2, NOTES.B2 * 0.5, NOTES.Ab2 * 0.5, NOTES.Cs2]
    },
    {
      // Bank 4: Paper Cranes (Bm7b5 -> E7b9 -> Am9 -> Fmaj7#11)
      chords: [
        [NOTES.D4, NOTES.F4, NOTES.A4, NOTES.D5], // Bm7b5
        [NOTES.D4, NOTES.Gs4, NOTES.C5, NOTES.F5], // E7b9
        [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.B4], // Am9
        [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.B4] // Fmaj7#11
      ],
      bass: [NOTES.B2 * 0.5, NOTES.E2, NOTES.A2 * 0.5, NOTES.F2],
      approach: [NOTES.Ds2, NOTES.Gs2 * 0.5, NOTES.E2, NOTES.Bb2 * 0.5]
    },
    {
      // Bank 5: Window Raindrops (Bbmaj9 -> Am7 -> Gm9 -> Fmaj9)
      chords: [
        [NOTES.D4, NOTES.F4, NOTES.A4, NOTES.C5], // Bbmaj9
        [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.C5], // Am7
        [NOTES.Bb3, NOTES.D4, NOTES.F4, NOTES.A4], // Gm9
        [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.G4] // Fmaj9
      ],
      bass: [NOTES.Bb2 * 0.5, NOTES.A2 * 0.5, NOTES.G2, NOTES.F2],
      approach: [NOTES.B2 * 0.5, NOTES.Ab2 * 0.5, NOTES.Fs2, NOTES.A2 * 0.5]
    }
  ]
  return banks[bank % banks.length]
}

export function renderLofiChill(host: SynthContext, step: number, time: number): void {
  const measure = Math.floor(step / 16)
  const stepInMeasure = step % 16
  const t = host.humanTime(time)

  // Şarkı Formu (Arrangement Cycle):
  // 0: Standart Akış (A) | 1: Ritmik Varyasyon | 2: Melodik Zirve (B) | 3: Gece Boşluğu / Nefes (Breakdown)
  const cycle = host.loopCount % 4
  const isBreakdown = cycle === 3
  const isPeak = cycle === 2

  // Her 2 loop'ta bir banka değişir (6 zengin caz bankası arasında gezinir)
  const bank = Math.floor(host.loopCount / 2) % 6
  const { chords, bass: bassRoots, approach } = getLofiBank(bank)

  // İkinci turlarda üst oktav inversiyonu (daha havadar akorlar)
  const altVoicing = host.loopCount % 2 === 1

  // 1. RHODES AKORLARI — İnsan Eli Taraması (Rake Strumming)
  // Ölçü başı (step 0), senkoplu off-beat (step 6), kırık üst ses stabı (step 11)
  if (stepInMeasure === 0 || stepInMeasure === 6 || stepInMeasure === 11) {
    const currentChord = chords[measure]
    const velScale = stepInMeasure === 0 ? 1.0 : stepInMeasure === 6 ? 0.65 : 0.48
    const rakeDelay = 0.022 // Her nota arasına 22ms organik insan gecikmesi

    currentChord.forEach((freq, idx) => {
      if (idx > 2 && stepInMeasure === 11 && !altVoicing) return // 11. adımda sadece üst 2-3 notayı tınlat
      const f = altVoicing && idx >= 2 ? freq * 2 : freq
      const humanDelay = idx * rakeDelay + (Math.random() - 0.5) * 0.005
      const panSpread = (idx - 1.5) * 0.12 // Tuşlar klavye üzerinde hafifçe sağa-sola yayılır
      const chordDur = isBreakdown ? 2.8 : 2.2
      const noteVol = host.humanVel(0.16 * velScale * (idx === 0 ? 0.9 : 1.0))
      playRhodesNote(host, f, t + humanDelay, chordDur, noteVol, panSpread, velScale)
    })
  }

  // 2. YÜRÜYEN VE KROMATİK YAKLAŞAN SUB-BAS (Walking & Approach Bass)
  if (!isBreakdown || stepInMeasure === 0) {
    if (stepInMeasure === 0) {
      // Ölçü başı kök bas (derin ve tok)
      playSubBass(host, bassRoots[measure], t, 1.7, 0.42)
    } else if (stepInMeasure === 6 && (cycle === 1 || isPeak)) {
      // 5'li zıplaması (groove hareketi)
      playSubBass(host, bassRoots[measure] * 1.5, t, 0.6, 0.28)
    } else if (stepInMeasure === 10) {
      // Senkoplu ara bas
      playSubBass(host, bassRoots[measure], t, 0.7, 0.32)
    } else if (stepInMeasure === 14 && Math.random() > 0.2) {
      // KROMATİK YAKLAŞIM NOTASI (Bir sonraki ölçünün köküne yarım ton basarak kayma)
      playSubBass(host, approach[measure], t, 0.45, 0.26)
    }
  }

  // 3. J DILLA "DRUNK" BOOM-BAP DAVUL
  if (!isBreakdown) {
    // KICK: Step 0 tok downbeat + Step 7/10 hafif sürüklenen sarhoş ikinci kick
    if (stepInMeasure === 0) {
      playSoftKick(host, host.kickTime(t), host.humanVel(0.34))
    } else if (stepInMeasure === 7 && (cycle === 0 || isPeak)) {
      playSoftKick(host, host.kickTime(t + 0.014), host.humanVel(0.24)) // +14ms sarhoş gecikme
    } else if (stepInMeasure === 10) {
      playSoftKick(host, host.kickTime(t), host.humanVel(0.28))
    }

    // SNARE: +22ms layback arkadan gelen tok trampet
    if (stepInMeasure === 4 || stepInMeasure === 12) {
      playSnare(host, host.snareTime(t), host.humanVel(0.2))
    }

    // GHOST SNARE: Adım 14 veya 15'te fısıltı gibi kasnak/fırça dokunuşu
    if ((stepInMeasure === 14 || stepInMeasure === 15) && (cycle === 1 || isPeak)) {
      playGhostSnare(host, host.snareTime(t), 0.06)
    }

    // HI-HAT: Tekli adımlarda swingli şapka, ara sıra diddle/roll
    if (stepInMeasure % 2 === 1) {
      const isUpbeat = stepInMeasure === 3 || stepInMeasure === 7 || stepInMeasure === 11 || stepInMeasure === 15
      const hatVol = isUpbeat ? 0.075 : 0.05
      playHiHat(host, t, host.humanVel(hatVol), false)
    }

    // Açık hat (sizzle nefesi)
    if (stepInMeasure === 6 && (cycle === 1 || isPeak) && Math.random() > 0.4) {
      playHiHat(host, t, 0.08, true)
    }

    // Shaker: Arka planda organik 16'lık süpürme
    if (stepInMeasure % 2 === 0 && Math.random() > 0.2) {
      playShaker(host, t, host.humanVel(0.06))
    }
  } else {
    // BREAKDOWN (Gece Boşluğu): Sadece çok yumuşak bir kick ve seyreltik hat
    if (stepInMeasure === 0) {
      playSoftKick(host, t, 0.2)
    }
    if (stepInMeasure === 8) {
      playGhostSnare(host, t, 0.04)
    }
    if (stepInMeasure % 4 === 2) {
      playHiHat(host, t, 0.04, false)
    }
    // Breakdown sonunda (step 60-63) bir sonraki döngüye yumuşak geçiş süpürmesi
    if (step === 62) {
      playGhostSnare(host, t, 0.08)
    }
    if (step === 63) {
      playGhostSnare(host, t + 0.05, 0.12)
    }
  }

  // 4. NOSTALJİK ÇAĞRI-CEVAP (CALL & RESPONSE) LO-FI MELODİSİ
  // Ölçü 0-1: Soru motifi | Ölçü 2-3: Cevap motifi | Breakdown'da dingin sessizlik
  if (!isBreakdown) {
    const melodyNotesByMeasure: Record<number, Record<number, number>> = {
      0: { 2: NOTES.A5, 5: NOTES.G5, 8: NOTES.E5 * 1.059, 10: NOTES.E5 }, // Call
      1: { 4: NOTES.D5, 8: NOTES.C5 }, // Space
      2: { 2: NOTES.G5, 6: NOTES.A5, 9: NOTES.C6, 12: NOTES.B5 }, // Response
      3: { 4: NOTES.A5, 10: NOTES.G5, 14: NOTES.E5 } // Cadence
    }

    const currentMeasureMelody = melodyNotesByMeasure[measure]
    const noteFreq = currentMeasureMelody ? currentMeasureMelody[stepInMeasure] : undefined

    if (noteFreq && (isPeak || Math.random() > 0.28 - host.intensity * 0.2)) {
      playLofiPluck(host, noteFreq, t, 0.95, host.humanVel(0.085), stepInMeasure % 4 === 2 ? -0.2 : 0.2)
    }
  }

  // Auto-DJ: Her döngü sonunda gece sıcaklığı / yoğunluğu nefes alsın
  if (step === 63 && Math.random() > 0.4) {
    host.intensity = Math.max(0.25, Math.min(0.85, host.intensity + (Math.random() - 0.5) * 0.06))
  }
}
