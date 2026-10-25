import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { latestWeight } from '../lib/body'
import { computeGame, type GameState } from '../lib/game'
import { mondayOf, type ISODate } from '../lib/dates'
import type { PlanSettings } from '../lib/plan'
import { planWeek, type DayPlan, type WeekPlan } from '../lib/schedule'
import type { SessionCtx } from '../lib/session'
import type { AppData } from './data'

export type Tab = 'home' | 'today' | 'week' | 'progress' | 'settings'

export interface AppCtxValue {
  data: AppData
  today: ISODate
  week: WeekPlan
  todayPlan: DayPlan
  planSettings: PlanSettings
  bodyweight: number | null
  sessionCtx: (date: ISODate) => SessionCtx
  planFor: (weekStart: ISODate) => WeekPlan
  tab: Tab
  go: (t: Tab) => void
  game: GameState
}

const Ctx = createContext<AppCtxValue | null>(null)

export function AppProvider({ data, today, tab, go, children }: { data: AppData; today: ISODate; tab: Tab; go: (t: Tab) => void; children: ReactNode }) {
  const core = useMemo(() => {
    const s = data.settings
    const planSettings: PlanSettings = { trainingDays: s.trainingDays, tennisOff: s.tennisOff, christmasMove: s.christmasMove, repeats: s.repeats }
    const planFor = (weekStart: ISODate) => planWeek(weekStart, { today, settings: planSettings, sessions: data.sessions, life: data.life })
    const week = planFor(mondayOf(today))
    const todayPlan = week.days.find((d) => d.date === today)!
    const bodyweight = latestWeight(data.daily, today)
    const game = computeGame({ settings: s, sessions: data.sessions, daily: data.daily, checkins: data.checkins, tests: data.tests, life: data.life, today, planFor, appointments: data.appointments })
    return {
      game,
      data,
      today,
      week,
      todayPlan,
      planSettings,
      bodyweight,
      planFor,
      sessionCtx: (date: ISODate): SessionCtx => ({ date, settings: s, sessions: data.sessions, life: data.life, bodyweight }),
    }
  }, [data, today])
  const value = useMemo<AppCtxValue>(() => ({ ...core, tab, go }), [core, tab, go])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useApp outside AppProvider')
  return c
}
