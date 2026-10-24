// Game-feel effects: floating "+10 XP", confetti, and big celebration overlays.

import confetti from 'canvas-confetti'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { sfx } from '../lib/sound'

export interface Celebration {
  kind: 'pr' | 'level' | 'achievement' | 'chest' | 'boss' | 'session'
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
    else if (c.kind === 'chest') sfx.chest()
    else sfx.achievement()
    fireConfetti(c.kind !== 'session')
  }, [])

  const api = useMemo<FxApi>(() => ({ floatXP, confetti: fireConfetti, celebrate }), [floatXP, celebrate])
  const current = queue[0]

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[70]">
        {floaters.map((f) => (
          <div key={f.id} className="anim-float absolute font-pixel text-[14px] text-xp drop-shadow-[2px_2px_0_#000]" style={{ left: `${f.x}%`, top: '45%' }}>
            {f.text}
          </div>
        ))}
      </div>
      {current && <CelebrationOverlay c={current} onDone={() => setQueue((q) => q.slice(1))} />}
    </Ctx.Provider>
  )
}

function CelebrationOverlay({ c, onDone }: { c: Celebration; onDone: () => void }) {
  const heading = { pr: 'NEW PR!', level: 'LEVEL UP!', achievement: 'ACHIEVEMENT!', chest: 'RAID CHEST!', boss: 'BOSS DEFEATED!', session: 'QUEST COMPLETE!' }[c.kind]
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-6" onClick={onDone}>
      <div className="relative w-full max-w-sm">
        <div
          className="anim-rays absolute -inset-24 opacity-30 pointer-events-none"
          style={{ background: 'repeating-conic-gradient(var(--xp) 0deg 10deg, transparent 10deg 30deg)', borderRadius: '50%' }}
        />
        <div className="px-box px-box-accent anim-pop relative p-6 text-center">
          <div className="font-pixel text-[18px] text-xp mb-4 anim-blink">{heading}</div>
          {c.icon && <div className="text-6xl mb-3 anim-bob">{c.icon}</div>}
          <div className="font-pixel text-[13px] text-ink mb-2 leading-relaxed">{c.title}</div>
          {c.sub && <div className="text-muted mb-3">{c.sub}</div>}
          {c.xp ? <div className="font-pixel text-[14px] text-accent mb-4">+{c.xp} XP</div> : null}
          <div className="font-pixel text-[10px] text-muted">TAP TO CONTINUE</div>
        </div>
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
