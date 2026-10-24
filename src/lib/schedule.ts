// Weekly scheduler: takes the base plan, what you've actually done, and Life Happens,
// and works out what's on each remaining day.
//
// Rules for missed gym sessions:
//  - keep the sequence order (LA > UA > LB > UB), shift the rest forward
//  - free make-up days: Wed (cardio dropped) and Sat when tennis is off (intervals dropped)
//  - never two lower days in a row, never two strength sessions on one day
//  - if it doesn't all fit, the last sessions in the sequence are dropped for the week
//  - every Monday is a fresh week

import { SESSIONS } from '../config/program'
import type { StrengthSlot } from '../config/types'
import type { LifeEvent, WorkoutSession } from '../db/types'
import { addDays, type ISODate } from './dates'
import { dayMods, hasActive } from './life'
import { basePlan, weekDays, type PlanItem, type PlanSettings } from './plan'

export interface DayPlan {
  date: ISODate
  items: PlanItem[]
  /** Items that were planned here but dropped (e.g. cardio dropped to fit a session). */
  dropped: { item: PlanItem; reason: string }[]
}

export interface WeekPlan {
  weekStart: ISODate
  days: DayPlan[]
  /** Strength sessions that couldn't fit this week. */
  unfit: StrengthSlot[]
  /** Base number of planned sessions (the "6"). */
  planned: number
  /** Sessions needed for the week to count toward the streak. */
  required: number
  busy: boolean
}

export interface ScheduleCtx {
  today: ISODate
  settings: PlanSettings
  sessions: WorkoutSession[]
  life: LifeEvent[]
}

const MAKEUP_SLOTS = new Set(['cardio', 'beachRun', 'intervals', 'sprints'])

export function isLowerSlot(slot: string | undefined) {
  return !!slot && slot in SESSIONS && SESSIONS[slot as StrengthSlot].lower
}

export function isStrengthSlot(slot: string | undefined): slot is StrengthSlot {
  return !!slot && slot in SESSIONS
}

/** Which strength slot a logged session uses up. */
export function consumedSlot(s: WorkoutSession): StrengthSlot | null {
  if (s.replaces) return s.replaces
  return isStrengthSlot(s.slot) ? s.slot : null
}

/** Weekly streak target: 4 of 6, scaled for short weeks; busy week = 3. */
export function requiredSessions(planned: number, busy: boolean) {
  if (busy) return Math.min(3, planned)
  return Math.ceil((planned * 2) / 3)
}

export function planWeek(weekStart: ISODate, ctx: ScheduleCtx): WeekPlan {
  const days = weekDays(weekStart)
  const base = days.map((d) => basePlan(d, ctx.settings))
  const planned = base.flat().filter((i) => i.counts).length
  const busy = hasActive(ctx.life, weekStart, 'busyWeek') || days.some((d) => ctx.life.some((e) => e.type === 'busyWeek' && e.start === d))

  // Sessions logged around this week (Sunday before + the week) to check the lower rule.
  const logged = ctx.sessions.filter((s) => s.date >= addDays(weekStart, -1) && s.date <= days[6])
  const loggedOn = (d: ISODate) => logged.filter((s) => s.date === d)
  const occupied = new Set(days.filter((d) => loggedOn(d).length > 0))

  // Strength queue in sequence order.
  const baseStrength = base.flatMap((items, i) =>
    items.filter((it) => it.kind === 'strength').map((it) => ({ slot: it.slot as StrengthSlot, day: days[i] })),
  )
  let queue: StrengthSlot[] = baseStrength.map((b) => b.slot)
  const isGymWeek = queue.some((q) => SESSIONS[q].kind === 'gym')
  if (busy && isGymWeek) queue = ['LA', 'UA', 'COMBO']

  for (const s of logged.filter((x) => x.date >= weekStart)) {
    const c = consumedSlot(s)
    if (!c) continue
    const i = queue.indexOf(c)
    if (i >= 0) queue.splice(i, 1)
    // A combo also covers LB / UB in a busy week, and LB/UB cover the combo.
    else if (busy && (c === 'LB' || c === 'UB')) {
      const j = queue.indexOf('COMBO')
      if (j >= 0) queue.splice(j, 1)
    }
  }

  const strengthDays = new Set(baseStrength.map((b) => b.day))
  const makeupDay = (i: number) =>
    !strengthDays.has(days[i]) &&
    base[i].some((it) => it.slot && MAKEUP_SLOTS.has(it.slot)) &&
    !base[i].some((it) => it.kind === 'test')

  const available = (i: number) => {
    const d = days[i]
    if (d < ctx.today || occupied.has(d)) return false
    if (hasActive(ctx.life, d, 'sickBelow') || hasActive(ctx.life, d, 'missed')) return false
    return strengthDays.has(d) || makeupDay(i)
  }

  const open = days.map((_, i) => i).filter(available)
  const lowerLogged = (d: ISODate) => loggedOn(d).some((s) => isLowerSlot(s.slot))

  // Brute force: choose increasing days for the first k sessions of the queue.
  let best: { idx: number[]; score: number[] } | null = null
  for (let k = queue.length; k >= 0 && !best; k--) {
    const pick = (start: number, chosen: number[]) => {
      if (chosen.length === k) {
        if (!validLower(chosen)) return
        const makeups = chosen.filter((i) => !strengthDays.has(days[i])).length
        const score = [makeups, chosen.reduce((a, b) => a + b, 0)]
        if (!best || score[0] < best.score[0] || (score[0] === best.score[0] && score[1] < best.score[1]))
          best = { idx: [...chosen], score }
        return
      }
      for (let j = start; j < open.length; j++) pick(j + 1, [...chosen, open[j]])
    }
    const validLower = (chosen: number[]) => {
      const lowerDays = new Set<ISODate>()
      for (const d of days) if (lowerLogged(d)) lowerDays.add(d)
      chosen.forEach((dayIdx, qi) => {
        if (isLowerSlot(queue[qi])) lowerDays.add(days[dayIdx])
      })
      if (lowerLogged(addDays(weekStart, -1))) lowerDays.add(addDays(weekStart, -1))
      for (const d of lowerDays) if (lowerDays.has(addDays(d, 1))) return false
      return true
    }
    pick(0, [])
  }
  const chosen: number[] = (best as { idx: number[] } | null)?.idx ?? []
  const unfit = queue.slice(chosen.length)

  const assignment = new Map<number, StrengthSlot>()
  chosen.forEach((dayIdx, qi) => assignment.set(dayIdx, queue[qi]))

  // Next beach letter for "no gym" days.
  const lastBeach = [...ctx.sessions]
    .filter((s) => s.status === 'done' && (s.slot === 'BA' || s.slot === 'BB'))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .pop()
  let nextBeach: StrengthSlot = lastBeach?.slot === 'BA' ? 'BB' : 'BA'

  const result: DayPlan[] = days.map((d, i) => {
    const dropped: DayPlan['dropped'] = []
    const mods = dayMods(ctx.life, d, ctx.settings.repeats)
    let items: PlanItem[] = []

    // Past or logged days keep their base plan (the UI marks done / missed).
    if (d < ctx.today || occupied.has(d)) {
      items = base[i].filter((it) => it.kind !== 'strength' || !occupied.has(d))
      for (const s of loggedOn(d)) {
        if (isStrengthSlot(s.slot)) {
          // The logged session replaces any strength item that was on this day.
          items = items.filter((it) => it.kind !== 'strength')
          items.push({ kind: 'strength', slot: s.slot, label: SESSIONS[s.slot].name, counts: true, replaces: s.replaces })
          // Strength on a make-up day drops the cardio there.
          items = items.filter((it) => {
            if (it.slot && MAKEUP_SLOTS.has(it.slot) && !loggedOn(d).some((x) => x.slot === it.slot)) {
              dropped.push({ item: it, reason: `Did ${SESSIONS[s.slot as StrengthSlot].name} instead` })
              return false
            }
            return true
          })
        }
      }
      return { date: d, items, dropped }
    }

    items = base[i].filter((it) => it.kind !== 'strength')
    const assigned = assignment.get(i)
    if (assigned) {
      const from = baseStrength.find((b) => b.slot === assigned)?.day
      let item: PlanItem = {
        kind: 'strength',
        slot: assigned,
        label: SESSIONS[assigned].name,
        counts: true,
        movedFrom: from && from !== d ? from : undefined,
      }
      if (mods.noGym && SESSIONS[assigned].kind === 'gym') {
        item = { ...item, slot: nextBeach, label: `${SESSIONS[nextBeach].name} (no gym)`, replaces: assigned }
        nextBeach = nextBeach === 'BA' ? 'BB' : 'BA'
      }
      if (!strengthDays.has(d)) {
        items = items.filter((it) => {
          if (it.slot && MAKEUP_SLOTS.has(it.slot)) {
            dropped.push({ item: it, reason: `Dropped to fit ${SESSIONS[assigned].name}` })
            return false
          }
          return true
        })
      }
      items.unshift(item)
    } else {
      for (const b of base[i].filter((it) => it.kind === 'strength')) {
        const why = mods.rest ? 'Sick: rest' : mods.missed ? "Can't train today: shifted" : 'Shifted to another day'
        dropped.push({ item: b, reason: why })
      }
    }

    if (mods.rest) {
      for (const it of items) if (it.kind !== 'rest' && it.kind !== 'test') dropped.push({ item: it, reason: 'Sick: rest up' })
      items = items.filter((it) => it.kind === 'test')
      items.push({ kind: 'rest', label: 'Sick: rest up 🛌', counts: false })
    } else if (mods.noIntervals) {
      items = items.filter((it) => {
        if (it.slot === 'intervals' || it.slot === 'sprints') {
          dropped.push({ item: it, reason: 'Sick: no intervals' })
          return false
        }
        return true
      })
      if (items.length === 0) items.push({ kind: 'rest', label: 'Rest (sick)', counts: false })
    }

    if (items.length === 0) items.push({ kind: 'rest', label: 'Rest day', counts: false })
    return { date: d, items, dropped }
  })

  return { weekStart, days: result, unfit, planned, required: requiredSessions(planned, busy), busy }
}
