// Game-feel effects: floating "+10 XP", confetti, and big celebration overlays.

import confetti from 'canvas-confetti'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { sfx } from '../lib/sound'

export interface Celebration {
  kind: 'pr' | 'level' | 'achievement' | 'chest' | 'boss' | 'session' | 'loot' | 'gear'
  /** Accent colour for the frame (e.g. loot rarity). */
  colour?: string
  title: string
  sub?: string
  icon?: string
  xp?: number
}

interface FxApi {
  floatXP: (amount: number, label?: string) => void
  confetti: (big?: boolean) => void
  celebrate: (c: Celebration) => void
}

const Ctx = createContext<FxApi | null>(null)

interface Floater {
  id: number
  text: string
  x: number
}

// PR celebration style, set from your level by the GameWatcher ('confetti' | 'fireworks' | 'dunk').
let celebrationTier = 'confetti'
export function setCelebrationTier(id: string) {
  celebrationTier = id
}

export function fireFireworks() {
  const colors = ['#ff6a2b', '#3ad1ff', '#ffd23f', '#ffffff', '#ff3e9e']
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      void confetti({
        particleCount: 45,
        spread: 360,
        startVelocity: 28,
        gravity: 0.7,
        ticks: 110,
        scalar: 1.1,
        shapes: ['star'],
        colors,
        origin: { x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.35 },
        disableForReducedMotion: true,
      })
    }, i * 220)
  }
}

export function fireConfetti(big = false) {
  const colors = ['#7cff4f', '#ff4fd8', '#ffd23f', '#34e0ff', '#ffffff']
  const base = { shapes: ['square' as const], colors, scalar: 1.1, ticks: 160, disableForReducedMotion: true }
  void confetti({ ...base, particleCount: big ? 160 : 70, spread: big ? 110 : 70, origin: { y: 0.65 } })
  if (big) {
    setTimeout(() => void confetti({ ...base, particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } }), 200)
    setTimeout(() => void confetti({ ...base, particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } }), 350)
  }
}

export function FxProvider({ children }: { children: ReactNode }) {
  const [floaters, setFloaters] = useState<Floater[]>([])
  const [queue, setQueue] = useState<Celebration[]>([])
  const nextId = useRef(1)

  const floatXP = useCallback((amount: number, label?: string) => {
    const id = nextId.current++
    setFloaters((f) => [...f, { id, text: `+${amount} XP${label ? ` ${label}` : ''}`, x: 30 + Math.random() * 40 }])
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 950)
  }, [])

  const celebrate = useCallback((c: Celebration) => {
    setQueue((q) => [...q, c])
    if (c.kind === 'pr') sfx.pr()
    else if (c.kind === 'level') sfx.levelUp()
    else if (c.kind === 'chest' || c.kind === 'loot') sfx.chest()
    else sfx.achievement()
    if (c.kind === 'pr' && celebrationTier !== 'confetti') fireFireworks()
    else fireConfetti(c.kind !== 'session')
  }, [])

  const api = useMemo<FxApi>(() => ({ floatXP, confetti: fireConfetti, celebrate }), [floatXP, celebrate])
  const current = queue[0]

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[70]">
        {floaters.map((f) => (
          <div key={f.id} className="anim-float absolute font-pixel text-[19px] text-xp drop-shadow-[2px_2px_0_#000]" style={{ left: `${f.x}%`, top: '45%' }}>
            {f.text}
          </div>
        ))}
      </div>
      {current && <CelebrationOverlay c={current} onDone={() => setQueue((q) => q.slice(1))} />}
    </Ctx.Provider>
  )
}

function CelebrationOverlay({ c, onDone }: { c: Celebration; onDone: () => void }) {
  const heading = { pr: 'NEW PR!', level: 'LEVEL UP!', achievement: 'ACHIEVEMENT!', chest: 'RAID CHEST!', boss: 'BOSS DEFEATED!', session: 'QUEST COMPLETE!', loot: 'LOOT DROP!', gear: 'NEW GEAR!' }[c.kind]
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-6" onClick={onDone}>
      <div className="relative w-full max-w-sm">
        <div
          className="anim-rays absolute -inset-24 opacity-30 pointer-events-none"
          style={{ background: 'repeating-conic-gradient(var(--xp) 0deg 10deg, transparent 10deg 30deg)', borderRadius: '50%' }}
        />
        <div className="px-box px-box-accent anim-pop relative p-6 text-center" style={c.colour ? { borderLeftColor: c.colour, boxShadow: `inset 0 0 0 2px ${c.colour}` } : undefined}>
          <div className="font-pixel text-[24px] text-xp mb-4 anim-blink" style={c.colour ? { color: c.colour } : undefined}>
            {heading}
          </div>
          {c.kind === 'pr' && celebrationTier === 'dunk' ? <DunkAnimation /> : c.icon && <div className="text-6xl mb-3 anim-bob">{c.icon}</div>}
          <div className="font-pixel text-[18px] text-ink mb-2 leading-relaxed">{c.title}</div>
          {c.sub && <div className="text-muted mb-3">{c.sub}</div>}
          {c.xp ? <div className="font-pixel text-[19px] text-accent mb-4">+{c.xp} XP</div> : null}
          <div className="font-pixel text-[14px] text-muted">TAP TO CONTINUE</div>
        </div>
      </div>
    </div>
  )
}

/** Ball arcs into a hoop and the rim shakes: the top-tier PR celebration. */
function DunkAnimation() {
  return (
    <div className="relative mx-auto mb-3" style={{ width: 200, height: 120 }} aria-hidden="true">
      <svg viewBox="0 0 200 120" width="200" height="120" className="absolute inset-0 pixelated">
        <rect x="150" y="10" width="44" height="34" fill="#e8edf2" />
        <rect x="160" y="20" width="24" height="16" fill="none" stroke="#ff6a2b" strokeWidth="2" />
        <g className="anim-rim">
          <rect x="132" y="44" width="40" height="4" fill="#ff6a2b" />
          <path d="M134 48 L140 72 L164 72 L170 48" fill="none" stroke="#c9d1d9" strokeWidth="2" />
        </g>
      </svg>
      <div className="anim-dunk absolute" style={{ left: 0, top: 80, width: 22, height: 22, borderRadius: 11, background: '#ff8a1f', boxShadow: 'inset -4px -4px 0 rgba(0,0,0,0.25)' }} />
      <div className="anim-slam absolute font-pixel text-[30px] text-accent" style={{ left: 10, top: 6 }}>
        SLAM!
      </div>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFx() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useFx outside FxProvider')
  return c
}
