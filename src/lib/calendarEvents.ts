import { EXERCISES, SESSIONS } from '../config/program'
import type { StrengthSlot } from '../config/types'
import type { Appointment, Settings } from '../db/types'
import { appointmentFor, durationFor, fmtTime } from './appointments'
import type { ISODate } from './dates'
import type { CalEvent } from './ics'
import type { WeekPlan } from './schedule'
import { repsLabel } from './session'

/** Reminder 1 hour before, plus 8pm the night before ("pack your bag"). */
export function alarmsFor(time: string): number[] {
  const [h, m] = time.split(':').map(Number)
  const startMin = h * 60 + m
  const nightBefore = startMin + (24 * 60 - 20 * 60) // minutes from 8pm yesterday
  return [60, nightBefore]
}

export function calendarEvents(weeks: WeekPlan[], appts: Appointment[], settings: Pick<Settings, 'defaultTimes' | 'places' | 'swaps'>, fromDate: ISODate): CalEvent[] {
  const out: CalEvent[] = []
  for (const w of weeks) {
    for (const d of w.days) {
      if (d.date < fromDate) continue
      const items = d.items.filter((i) => i.counts || i.kind === 'test')
      if (!items.length) continue
      const a = appointmentFor(d.date, items, appts, settings)
      const title = `Level Up: ${items.map((i) => i.label).join(' + ')}`
      const desc: string[] = []
      for (const i of items) {
        if (i.kind === 'strength') {
          const t = SESSIONS[i.slot as StrengthSlot]
          desc.push(`${t.name}:`)
          for (const p of t.exercises) {
            const id = settings.swaps[p.ex] ?? p.ex
            desc.push(`• ${EXERCISES[id]?.name ?? id} ${p.sets}×${repsLabel(p.reps, EXERCISES[id]?.perSide)}`)
          }
        } else desc.push(i.label)
      }
      desc.push('', 'Open Level Up to log it. Turning up is the win. 💪')
      out.push({
        uid: `${d.date}@level-up`,
        date: d.date,
        time: a.time,
        minutes: durationFor(items),
        title,
        location: a.place || undefined,
        description: desc.join('\n'),
        alarms: alarmsFor(a.time),
      })
    }
  }
  return out
}

export function describeEvent(e: CalEvent) {
  return `${fmtTime(e.time)}${e.location ? ` · ${e.location}` : ''}`
}
