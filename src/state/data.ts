import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, defaultSettings } from '../db/db'
import type { CheckIn, DailyLog, LifeEvent, Measurement, Settings, TestResult, WorkoutSession } from '../db/types'
import { isoInMelbourne, setTodayOverride, type ISODate } from '../lib/dates'

export interface AppData {
  settings: Settings
  sessions: WorkoutSession[]
  life: LifeEvent[]
  daily: DailyLog[]
  checkins: CheckIn[]
  tests: TestResult[]
  measurements: Measurement[]
}

/** Everything except photo blobs, live-updating whenever the database changes. */
export function useAppData(): AppData | undefined {
  return useLiveQuery(async () => {
    const [settings, sessions, life, daily, checkins, tests, measurements] = await Promise.all([
      db.settings.get('settings'),
      db.sessions.orderBy('date').toArray(),
      db.life.toArray(),
      db.daily.toArray(),
      db.checkins.toArray(),
      db.tests.toArray(),
      db.measurements.orderBy('date').toArray(),
    ])
    // Never write inside a live query (it's read-only). Missing settings → defaults;
    // App creates the settings row on first launch.
    return {
      settings: { ...defaultSettings(), ...settings },
      sessions,
      life,
      daily,
      checkins,
      tests,
      measurements,
    }
  }, [])
}

/** Today's Melbourne date. Re-checks every 30s and when the app comes back to the foreground. */
export function useToday(timeTravel: ISODate | null | undefined): ISODate {
  const [real, setReal] = useState(() => isoInMelbourne())
  useEffect(() => {
    const tick = () => setReal(isoInMelbourne())
    const id = setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  const t = timeTravel ?? real
  setTodayOverride(timeTravel ?? null)
  return t
}
