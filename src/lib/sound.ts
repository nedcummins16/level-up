// Tiny chiptune sound effects with the Web Audio API (no files, works offline).
// iOS only allows audio after a tap, so we unlock the AudioContext on the first touch.
// Note: on iPhone the ring/silent switch mutes these. The rest timer also flashes the screen.

let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(on: boolean) {
  enabled = on
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

export function unlockAudio() {
  const a = audio()
  if (!a) return
  // Play a silent blip so iOS considers audio "started by the user".
  const o = a.createOscillator()
  const g = a.createGain()
  g.gain.value = 0
  o.connect(g).connect(a.destination)
  o.start()
  o.stop(a.currentTime + 0.01)
}

let pack = 'arcade'
export function setSoundPack(id: string) {
  pack = id
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.12, glideTo?: number) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + start
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function seq(notes: [number, number][], step: number, type: OscillatorType = 'square', vol = 0.12) {
  notes.forEach(([f, len], i) => tone(f, i * step, len, type, vol))
}

type Effect = 'set' | 'pr' | 'levelUp' | 'achievement' | 'chest' | 'tap'

/** Each sound pack plays the same moments differently. */
const PACKS: Record<string, Record<Effect, () => void>> = {
  arcade: {
    set: () => seq([[660, 0.07], [990, 0.1]], 0.06),
    pr: () => seq([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]], 0.09),
    levelUp: () => seq([[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.12], [1319, 0.4]], 0.1, 'square', 0.14),
    achievement: () => seq([[880, 0.08], [1175, 0.08], [1568, 0.3]], 0.08, 'triangle', 0.2),
    chest: () => seq([[330, 0.08], [415, 0.08], [494, 0.08], [659, 0.08], [831, 0.08], [988, 0.3]], 0.07, 'triangle', 0.2),
    tap: () => tone(440, 0, 0.04, 'square', 0.06),
  },
  // Sneaker squeaks, a swish and the buzzer.
  court: {
    set: () => {
      tone(1700, 0, 0.07, 'sine', 0.12, 2600)
      tone(1900, 0.09, 0.06, 'sine', 0.1, 2800)
    },
    pr: () => {
      tone(220, 0, 0.5, 'sawtooth', 0.09)
      tone(277, 0, 0.5, 'sawtooth', 0.07)
      tone(2400, 0.55, 0.25, 'sine', 0.08, 1200)
    },
    levelUp: () => {
      tone(196, 0, 0.7, 'sawtooth', 0.1)
      tone(247, 0, 0.7, 'sawtooth', 0.08)
      seq([[784, 0.1], [988, 0.1], [1175, 0.3]], 0.1, 'triangle', 0.15)
    },
    achievement: () => tone(2600, 0, 0.3, 'sine', 0.1, 1300),
    chest: () => seq([[523, 0.08], [659, 0.08], [784, 0.25]], 0.08, 'triangle', 0.18),
    tap: () => tone(2000, 0, 0.04, 'sine', 0.05, 2400),
  },
  // Smooth glides.
  synth: {
    set: () => tone(440, 0, 0.18, 'sawtooth', 0.06, 880),
    pr: () => seq([[262, 0.3], [330, 0.3], [392, 0.3], [523, 0.5]], 0.12, 'sawtooth', 0.06),
    levelUp: () => {
      tone(220, 0, 1, 'sawtooth', 0.06, 880)
      tone(330, 0.1, 0.9, 'sawtooth', 0.04, 1320)
    },
    achievement: () => tone(660, 0, 0.4, 'sine', 0.12, 1320),
    chest: () => seq([[392, 0.2], [523, 0.2], [659, 0.4]], 0.1, 'sawtooth', 0.06),
    tap: () => tone(600, 0, 0.05, 'sine', 0.05),
  },
  // Heavy, low 8-bit.
  boss: {
    set: () => seq([[220, 0.06], [330, 0.1]], 0.06, 'square', 0.14),
    pr: () => seq([[131, 0.1], [165, 0.1], [196, 0.1], [262, 0.1], [330, 0.1], [392, 0.35]], 0.08, 'square', 0.14),
    levelUp: () => seq([[98, 0.12], [131, 0.12], [165, 0.12], [196, 0.12], [262, 0.12], [392, 0.5]], 0.11, 'square', 0.16),
    achievement: () => seq([[196, 0.08], [262, 0.08], [392, 0.3]], 0.08, 'square', 0.15),
    chest: () => seq([[165, 0.07], [196, 0.07], [247, 0.07], [330, 0.07], [392, 0.3]], 0.07, 'square', 0.15),
    tap: () => tone(220, 0, 0.04, 'square', 0.07),
  },
}

const play = (e: Effect) => () => {
  if (!enabled) return
  ;(PACKS[pack] ?? PACKS.arcade)[e]()
}

export const sfx = {
  set: play('set'),
  pr: play('pr'),
  levelUp: play('levelUp'),
  achievement: play('achievement'),
  chest: play('chest'),
  tap: play('tap'),
  /** Rest timer done: loud, plays even if game sounds are off, same in every pack. */
  timer() {
    tone(880, 0, 0.15, 'square', 0.25)
    tone(880, 0.22, 0.15, 'square', 0.25)
    tone(1320, 0.44, 0.4, 'square', 0.25)
  },
  /** Preview a pack (Settings). */
  preview(id: string) {
    ;(PACKS[id] ?? PACKS.arcade).pr()
  },
}
