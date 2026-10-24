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

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.12) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + start
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function seq(notes: [number, number][], step: number, type: OscillatorType = 'square', vol = 0.12) {
  notes.forEach(([f, len], i) => tone(f, i * step, len, type, vol))
}

export const sfx = {
  set() {
    if (!enabled) return
    seq([[660, 0.07], [990, 0.1]], 0.06)
  },
  pr() {
    if (!enabled) return
    seq([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]], 0.09)
  },
  levelUp() {
    if (!enabled) return
    seq([[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.12], [1319, 0.4]], 0.1, 'square', 0.14)
  },
  achievement() {
    if (!enabled) return
    seq([[880, 0.08], [1175, 0.08], [1568, 0.3]], 0.08, 'triangle', 0.2)
  },
  /** Rest timer done: loud, plays even if game sounds are off. */
  timer() {
    tone(880, 0, 0.15, 'square', 0.25)
    tone(880, 0.22, 0.15, 'square', 0.25)
    tone(1320, 0.44, 0.4, 'square', 0.25)
  },
  tap() {
    if (!enabled) return
    tone(440, 0, 0.04, 'square', 0.06)
  },
  chest() {
    if (!enabled) return
    seq([[330, 0.08], [415, 0.08], [494, 0.08], [659, 0.08], [831, 0.08], [988, 0.3]], 0.07, 'triangle', 0.2)
  },
}
