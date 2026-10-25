// When + where you'll train. Planning this ahead ("Mon 4pm at the uni gym") makes you
// far more likely to actually go (an "implementation intention").

import { PROGRAM, SESSIONS } from '../config/program'
import type { StrengthSlot } from '../config/types'
import type { Appointment, Settings } from '../db/types'
import { weekday, type ISODate } from './dates'
import type { PlanItem } from './plan'

export function defaultTime(date: ISODate, items: PlanItem[], settings: Pick<Settings, 'defaultTimes'>): string {
  if (items.some((i) => i.kind === 'tennis')) return '13:00'
  return settings.defaultTimes[String(weekday(date))] ?? '16:00'
}

export function defaultPlace(items: PlanItem[], settings: Pick<Settings, 'places'>): string {
  const main = items.find((i) => i.counts) ?? items[0]
  if (!main) return ''
  if (main.kind === 'strength') return SESSIONS[main.slot as StrengthSlot]?.kind === 'beach' ? settings.places.beach : settings.places.gym
  if (main.kind === 'tennis') return settings.places.tennis
  if (main.kind === 'test') return /5 km/.test(main.label) ? settings.places.cardio : settings.places.gym
  return settings.places.cardio
}

export function appointmentFor(date: ISODate, items: PlanItem[], appts: Appointment[], settings: Pick<Settings, 'defaultTimes' | 'places'>): Appointment {
  const a = appts.find((x) => x.date === date)
  return { date, time: a?.time ?? defaultTime(date, items, settings), place: a?.place ?? defaultPlace(items, settings) }
}

/** "16:00" → "4pm", "16:30" → "4:30pm" */
export function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`
}

/** Minutes a session usually takes (for calendar events). */
export function durationFor(items: PlanItem[]): number {
  const main = items.find((i) => i.counts) ?? items[0]
  if (!main) return 60
  if (main.kind === 'strength') return 75
  if (main.kind === 'tennis') return 90
  if (main.kind === 'test') return 60
  return main.minutes ? main.minutes[1] + 10 : 45
}

export const TENNIS_TIME = PROGRAM.tennisTime
