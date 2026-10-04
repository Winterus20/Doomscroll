import type { SynthContext } from '../types'
import { NOTES } from '../notes'
import {
  playAmbientPad,
  playPipeOrgan,
  playChoirExhale,
  playShepardFall,
  playSoftTick,
  playWhaleCall,
  playCrystalBell,
  playMusicBox,
  playSpacePing,
  sendToReverbPing,
  playNoiseSwell
} from '../instruments/ambient'
import { playSubBass } from '../instruments/bass'
import { playPluckNote } from '../instruments/keys'

let ambientChordPos = 0

export function resetAmbientDroneState(): void {
  ambientChordPos = 0
}

export function renderAmbientDrone(host: SynthContext, step: number, time: number): void {
  const t = host.humanTime(time)
  // 64 adım = ~21 sn @46BPM, akor 2 loop'ta bir değişir (~42 sn nefes)
  if (step === 0 && host.loopCount % 2 === 0) {
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
    const currentPad = ambientPads[ambientChordPos % ambientPads.length]
    currentPad.forEach((freq, idx) => {
      const pan = idx % 2 === 0 ? -0.3 : 0.3
      // Uzun kuyruk + kısık ses: padler üst üste erir, kesinti yok
      playAmbientPad(host, freq, t + idx * 0.8, 38.0, 0.055, pan)
    })
    // Boru orgu kökü: 16ft + 32ft + nefes (Temple Church hissi, katedral reverb)
    const organRoots = [
      NOTES.C2,
      NOTES.A2 * 0.5,
      NOTES.F2 * 0.5,
      NOTES.G2 * 0.5,
      NOTES.E2,
      NOTES.D2,
      NOTES.A2 * 0.5,
      NOTES.F2
    ]
    const organRoot = organRoots[ambientChordPos % organRoots.length]
    playPipeOrgan(host, organRoot, t + 0.4, 40.0, 0.085, 0)
    // İnsan korosu nefesi: orgun üstünde süzülen insan reverb (mikrofondan uzağa bakar)
    playChoirExhale(host, organRoot * 2, t + 6.0, 16.0, 0.028, 0.1)
    playChoirExhale(host, organRoot * 2.4, t + 9.0, 14.0, 0.022, -0.15)
    // Kök sub: Drone ekolü tek nota minutosu, zamansızlık hissi
    const subRoots = [
      NOTES.C2,
      NOTES.C2,
      NOTES.F2 * 0.5,
      NOTES.G2 * 0.5,
      NOTES.A2 * 0.5,
      NOTES.C2,
      NOTES.A2 * 0.5,
      NOTES.F2 * 0.5
    ]
    playSubBass(host, subRoots[ambientChordPos % subRoots.length], t, 40.0, 0.24)
    ambientChordPos++

    // Nebula swell: kuyruklu yıldız geçişi gibi kabar-sön
    playNoiseSwell(host, t + 4.0, 14.0, 0.022)
    // Alçalan Shepard: sonsuz iniş illüzyonu (yükselen gerilim değil, gömülme)
    if (ambientChordPos % 2 === 0) {
      playShepardFall(host, t + 2.0, 36.0)
    }
  }

  // Miller saati tiktakı: her 4 adımda bir (~1.3 sn), çok yumuşak, her 2 loop'ta
  // Interstellar Mountains referansı, ama uyku için -18dB kısık
  if (step % 4 === 2 && host.loopCount % 2 === 0) {
    playSoftTick(host, t, 0.016)
  }

  // Elite balina uğultusu: gaz devi whoop, 2-3 dakikada bir, bol yankılı
  if (step === 32 && host.loopCount % 4 === 2 && Math.random() < 0.4) {
    const pan = (Math.random() - 0.5) * 1.0
    playWhaleCall(host, t, pan)
  }

  // Yıldız çanı: Lidyen diziden, 45-60 sn'de bir (uyandırmaz, hipnoz yapar)
  // Astroneer shimmer ile katmanlı: çan + oktav üstü nefes
  if (step === 40 && host.loopCount % 2 === 0 && Math.random() < 0.42) {
    const bellPitches = [NOTES.C5, NOTES.D5, NOTES.E5, NOTES.Fs5, NOTES.G5, NOTES.A5, NOTES.B5]
    const pitch = bellPitches[Math.floor(Math.random() * bellPitches.length)]
    const pan = (Math.random() - 0.5) * 0.8
    playCrystalBell(host, pitch, t, 5.0, host.humanVel(0.05), pan)
  }

  // Astroneer müzik kutusu ninni: çocuksu, tekil, seyrek (uyku melodisi)
  // C maj pentatonik + mavi nota yok (gerilim yok), her turda 1-2 nota
  if ((step === 8 || step === 24 || step === 56) && Math.random() < 0.3) {
    const lullaby = [NOTES.C5, NOTES.D5, NOTES.E5, NOTES.G5, NOTES.A5, NOTES.C6, NOTES.E6]
    const pitch = lullaby[Math.floor(Math.random() * lullaby.length)]
    const pan = (Math.random() - 0.5) * 0.9
    playMusicBox(host, pitch, t, pan)
  }

  // Pulsar / telemetri pingi: uzak uydu sinyali, 2-3 dakikada bir
  // Voyager hissi: kısa, tiz, çok kısık, bol yankılı + mors yankısı
  if (step === 16 && host.loopCount % 4 === 1 && Math.random() < 0.5) {
    const pulsarPitches = [NOTES.E6, NOTES.D6, NOTES.B5, NOTES.A6]
    const pitch = pulsarPitches[Math.floor(Math.random() * pulsarPitches.length)]
    const pan = (Math.random() - 0.5) * 1.4
    playSpacePing(host, pitch, t, pan)
    if (Math.random() < 0.4) {
      playSpacePing(host, pitch * 0.891, t + 0.35, -pan * 0.6)
    }
  }

  // Yıldız tozu parıltısı: oktav üstü nefes, shimmer-verb hissi
  if (step === 48 && Math.random() < 0.32) {
    const dustPitches = [NOTES.G5, NOTES.A5, NOTES.B5, NOTES.D6, NOTES.E6]
    const pitch = dustPitches[Math.floor(Math.random() * dustPitches.length)] * 2
    const pan = (Math.random() - 0.5) * 1.0
    playPluckNote(host, pitch, t, 2.5, host.humanVel(0.016), 'sine', pan, false)
    sendToReverbPing(host, pitch, t, pan)
  }

  // Yavaş dalga nabzı: çok yumuşak pembe kabarma (derin uyku desteği)
  if (step % 8 === 0 && Math.random() < 0.55) {
    playNoiseSwell(host, t, 3.2, 0.009)
  }
}
