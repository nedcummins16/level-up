// Bodyweight maths: 7-day averages, weekly change and the calorie rule.

import type { DailyLog } from '../db/types'
import { addDays, mondayOf, type ISODate } from './dates'

export function weighIns(daily: DailyLog[]) {
  return daily
    .filter((d) => typeof d.weight === 'number' && d.weight > 0)
    .map((d) => ({ date: d.date, kg: d.weight as number }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** Average of weigh-ins in the 7 days ending on `date` (null if none). */
export function avg7(daily: DailyLog[], date: ISODate): number | null {
  const from = addDays(date, -6)
  const w = weighIns(daily).filter((x) => x.date >= from && x.date <= date)
  if (!w.length) return null
  return round1(w.reduce((a, b) => a + b.kg, 0) / w.length)
}

export function latestWeight(daily: DailyLog[], upTo: ISODate): number | null {
  const w = weighIns(daily).filter((x) => x.date <= upTo)
  return w.length ? w[w.length - 1].kg : null
}

/** Average weight for the Mon-Sun week starting `weekStart`. */
export function weekAvg(daily: DailyLog[], weekStart: ISODate): number | null {
  const end = addDays(weekStart, 6)
  const w = weighIns(daily).filter((x) => x.date >= weekStart && x.date <= end)
  if (!w.length) return null
  return round1(w.reduce((a, b) => a + b.kg, 0) / w.length)
}

export function round1(x: number) {
  return Math.round(x * 10) / 10
}

export interface CalorieAdvice {
  kind: 'add' | 'cut' | 'ok' | 'unknown'
  message: string
  changes: (number | null)[]
}

/**
 * Rule: weekly gain under +0.25 kg for 2 weeks in a row → add ~250 kcal/day.
 * Over +0.75 kg/week for 2 weeks → cut ~250 kcal/day.
 * Looks at the last 2 complete weeks before `today`'s week.
 */
export function calorieAdvice(daily: DailyLog[], today: ISODate): CalorieAdvice {
  const thisWeek = mondayOf(today)
  const w = [-3, -2, -1].map((i) => weekAvg(daily, addDays(thisWeek, i * 7)))
  const changes = [w[1] !== null && w[0] !== null ? round2(w[1] - w[0]) : null, w[2] !== null && w[1] !== null ? round2(w[2] - w[1]) : null]
  if (changes.some((c) => c === null)) return { kind: 'unknown', message: 'Need 3 weeks of weigh-ins to judge your rate of gain.', changes }
  const [a, b] = changes as number[]
  if (a < 0.25 && b < 0.25) return { kind: 'add', message: 'Gaining under 0.25 kg/week for 2 weeks: add ~250 kcal/day (e.g. an extra smoothie).', changes }
  if (a > 0.75 && b > 0.75) return { kind: 'cut', message: 'Gaining over 0.75 kg/week for 2 weeks: cut ~250 kcal/day.', changes }
  return { kind: 'ok', message: 'Rate of gain is on track. Keep eating the same.', changes }
}

function round2(x: number) {
  return Math.round(x * 100) / 100
}
