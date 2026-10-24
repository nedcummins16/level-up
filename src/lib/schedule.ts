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
import { basePlan, isBeachDay, weekDays, type PlanItem, type PlanSettings } from './plan'

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

  // Search every way to place the queue in order on increasing open days, allowing
  // a session to be skipped when it can't fit. Best = most sessions placed, then
  // drop LATER sessions rather than earlier ones, then fewest make-up days, then earliest.
  const fitsDay = (slot: StrengthSlot, dayIdx: number) =>
    // No gym during the beach block, and beach sessions only on beach days.
    (SESSIONS[slot].kind === 'beach') === isBeachDay(days[dayIdx])
  const validLower = (placed: [number, number][]) => {
    const lowerDays = new Set<ISODate>()
    for (const d of days) if (lowerLogged(d)) lowerDays.add(d)
    for (const [qi, dayIdx] of placed) if (isLowerSlot(queue[qi])) lowerDays.add(days[dayIdx])
    if (lowerLogged(addDays(weekStart, -1))) lowerDays.add(addDays(weekStart, -1))
    for (const d of lowerDays) if (lowerDays.has(addDays(d, 1))) return false
    return true
  }
  const better = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]
    return false
  }
  let best: { placed: [number, number][]; score: number[] } | null = null
  const search = (qi: number, minOpen: number, placed: [number, number][]) => {
    if (qi === queue.length) {
      if (!validLower(placed)) return
      const placedSet = new Set(placed.map(([q]) => q))
      const skipCost = queue.reduce((acc, _, i) => acc + (placedSet.has(i) ? 0 : 2 ** (queue.length - 1 - i)), 0)
      const makeups = placed.filter(([, d]) => !strengthDays.has(days[d])).length
      const score = [-placed.length, skipCost, makeups, placed.reduce((a, [, d]) => a + d, 0)]
      if (!best || better(score, best.score)) best = { placed: [...placed], score }
      return
    }
    for (let j = minOpen; j < open.length; j++) {
      if (fitsDay(queue[qi], open[j])) search(qi + 1, j + 1, [...placed, [qi, open[j]]])
    }
    search(qi + 1, minOpen, placed) // skip this one
  }
  search(0, 0, [])
  const placed: [number, number][] = (best as { placed: [number, number][] } | null)?.placed ?? []
  const placedQ = new Set(placed.map(([q]) => q))
  const unfit = queue.filter((_, i) => !placedQ.has(i))

  const assignment = new Map<number, StrengthSlot>()
  for (const [qi, dayIdx] of placed) assignment.set(dayIdx, queue[qi])

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
