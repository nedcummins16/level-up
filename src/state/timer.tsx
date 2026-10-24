// Rest timer. Timestamp-based: we store when it ENDS, so it stays right
// if the screen locks or you switch apps. Persisted in localStorage so a reload keeps it.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { sfx } from '../lib/sound'

interface TimerState {
  endAt: number
  total: number
  label: string
  alerted: boolean
}

interface TimerApi {
  timer: TimerState | null
  remaining: number
  flashing: boolean
  start: (seconds: number, label: string) => void
  add: (seconds: number) => void
  stop: () => void
  dismissFlash: () => void
}

const KEY = 'levelup.timer'
const Ctx = createContext<TimerApi | null>(null)

function load(): TimerState | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TimerState) : null
  } catch {
    return null
  }
}

function save(t: TimerState | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t))
    else localStorage.removeItem(KEY)
  } catch {
    // storage unavailable: timer still works in memory
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<TimerState | null>(load)
  const [now, setNow] = useState(Date.now())
  const [flashing, setFlashing] = useState(false)

  const update = useCallback((t: TimerState | null) => {
    save(t)
    setTimer(t)
  }, [])

  useEffect(() => {
    if (!timer) return
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [timer])

  // Fire the alert once when time is up (or when you come back after it ended).
  useEffect(() => {
    if (!timer || timer.alerted || now < timer.endAt) return
    if (document.visibilityState !== 'visible') return
    sfx.timer()
    setFlashing(true)
    update({ ...timer, alerted: true })
  }, [now, timer, update])

  useEffect(() => {
    if (!flashing) return
    const id = setTimeout(() => setFlashing(false), 4000)
    return () => clearTimeout(id)
  }, [flashing])

  const api = useMemo<TimerApi>(
    () => ({
      timer,
      remaining: timer ? Math.max(0, timer.endAt - now) : 0,
      flashing,
      start: (seconds, label) => {
        setFlashing(false)
        setNow(Date.now())
        update({ endAt: Date.now() + seconds * 1000, total: seconds, label, alerted: false })
      },
      add: (seconds) => {
        if (!timer) return
        const endAt = Math.max(Date.now(), timer.endAt + seconds * 1000)
        update({ ...timer, endAt, total: Math.max(timer.total, Math.ceil((endAt - Date.now()) / 1000)), alerted: false })
      },
      stop: () => {
        setFlashing(false)
        update(null)
      },
      dismissFlash: () => {
        setFlashing(false)
        update(null)
      },
    }),
    [timer, now, flashing, update],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTimer() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTimer outside TimerProvider')
  return c
}
