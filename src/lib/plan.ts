// Turns the program config into "what's planned on date X" (before any Life Happens shifting).

import { CARDIO, INTERVALS, PHASES, PROGRAM, REPEAT_PHASE, REPEAT_TEST_ITEMS, SESSIONS, TEST_DAYS } from '../config/program'
import type { PhaseDef, Slot, StrengthSlot, TestDay } from '../config/types'
import { addDays, diffDays, isBetween, mondayOf, rangeDays, weekday, type ISODate } from './dates'

export interface PlanSettings {
  trainingDays: Record<'LA' | 'UA' | 'LB' | 'UB', number>
  tennisOff: ISODate[]
  christmasMove: 'move' | 'keep' | null
  repeats: ISODate[]
}

export type PlanKind = 'strength' | 'cardio' | 'tennis' | 'intervals' | 'test' | 'rest'

export interface PlanItem {
  kind: PlanKind
  slot?: Slot
  label: string
  /** Counts toward the week's planned sessions (streak). */
  counts: boolean
  testId?: string
  /** Shifted here from another day. */
  movedFrom?: ISODate
  /** Stand-in for another session (no gym → beach). */
  replaces?: StrengthSlot
  minutes?: [number, number]
  mode?: 'run' | 'swim'
}

export function weekNumber(d: ISODate): number {
  return Math.floor(diffDays(PROGRAM.start, mondayOf(d)) / 7) + 1
}

export function weekStartOf(n: number): ISODate {
  return addDays(PROGRAM.start, (n - 1) * 7)
}

export interface RepeatCycle {
  index: number
  start: ISODate
  pushEnd: ISODate
  testStart: ISODate
  testEnd: ISODate
}

export function repeatCycles(repeats: ISODate[]): RepeatCycle[] {
  return [...repeats].sort().map((start, i) => ({
    index: i + 1,
    start,
    pushEnd: addDays(start, PROGRAM.repeatWeeks * 7 - 1),
    testStart: addDays(start, PROGRAM.repeatWeeks * 7),
    testEnd: addDays(start, PROGRAM.repeatWeeks * 7 + 5),
  }))
}

export interface PhaseInfo extends PhaseDef {
  cycle?: number
}

export function getPhase(d: ISODate, repeats: ISODate[] = []): PhaseInfo {
  if (d < PROGRAM.start) return { id: 'prestart', name: 'Pre-season', start: '0000-01-01', end: addDays(PROGRAM.start, -1), rir: '-', blurb: '' }
  for (const p of PHASES) if (isBetween(d, p.start, p.end)) return p
  for (const c of repeatCycles(repeats)) {
    if (isBetween(d, c.start, c.pushEnd)) return { ...REPEAT_PHASE, start: c.start, end: c.pushEnd, cycle: c.index }
    if (isBetween(d, c.testStart, c.testEnd))
      return { ...PHASES.find((p) => p.id === 'test')!, start: c.testStart, end: c.testEnd, cycle: c.index }
  }
  return { id: 'post', name: 'Off-season', start: addDays(PROGRAM.testWeekEnd, 1), end: '9999-12-31', rir: '-', blurb: '' }
}

export function allTestDays(repeats: ISODate[] = []): TestDay[] {
  const extra: TestDay[] = repeatCycles(repeats).flatMap((c) => [
    { id: `R${c.index}A`, date: c.testStart, boss: `Titan Reborn ${c.index}`, bossEmoji: '🐲', items: REPEAT_TEST_ITEMS.A },
    { id: `R${c.index}B`, date: addDays(c.testStart, 2), boss: `Phantom Reborn ${c.index}`, bossEmoji: '☠️', items: REPEAT_TEST_ITEMS.B },
  ])
  return [...TEST_DAYS, ...extra]
}

export function testDayOn(d: ISODate, repeats: ISODate[] = []): TestDay | undefined {
  return allTestDays(repeats).find((t) => t.date === d)
}

export function isBeachDay(d: ISODate) {
  return isBetween(d, PROGRAM.beach.start, PROGRAM.beach.end)
}

/** Beach A/B alternates over Mon/Wed/Fri starting with A on the first beach day. */
export function beachSlotOn(d: ISODate): StrengthSlot | null {
  if (!isBeachDay(d) || !PROGRAM.beach.sessionDays.includes(weekday(d)) || PROGRAM.beach.travelDays.includes(d)) return null
  const days = rangeDays(PROGRAM.beach.start, d).filter(
    (x) => PROGRAM.beach.sessionDays.includes(weekday(x)) && !PROGRAM.beach.travelDays.includes(x),
  )
  const idx = days.length - 1
  const first = PROGRAM.beach.firstSession
  return idx % 2 === 0 ? first : first === 'BA' ? 'BB' : 'BA'
}

export function isTennisOn(d: ISODate, s: PlanSettings) {
  return !s.tennisOff.includes(mondayOf(d))
}

/** Which of the rotating interval workouts falls on this Saturday. */
export function intervalVariant(d: ISODate, s: PlanSettings): number {
  const thisWeek = mondayOf(d)
  const earlier = s.tennisOff.filter((w) => w < thisWeek && !isBeachDay(addDays(w, 5)))
  return new Set(earlier).size % INTERVALS.length
}

function strengthItem(slot: StrengthSlot): PlanItem {
  return { kind: 'strength', slot, label: SESSIONS[slot].name, counts: true }
}

function testItem(t: TestDay, counts: boolean): PlanItem {
  return { kind: 'test', label: `Boss: ${t.boss}`, counts, testId: t.id }
}

function rest(label = 'Rest day'): PlanItem {
  return { kind: 'rest', label, counts: false }
}

function saturdayItem(d: ISODate, s: PlanSettings): PlanItem {
  if (isTennisOn(d, s)) return { kind: 'tennis', slot: 'tennis', label: `Tennis (${PROGRAM.tennisTime})`, counts: true }
  return { kind: 'intervals', slot: 'intervals', label: INTERVALS[intervalVariant(d, s)], counts: true }
}

/** The base plan for a date: no Life Happens, no shifting. */
export function basePlan(d: ISODate, s: PlanSettings): PlanItem[] {
  const phase = getPhase(d, s.repeats)
  const wd = weekday(d)
  const test = testDayOn(d, s.repeats)

  if (phase.id === 'prestart' || phase.id === 'post') return []

  if (phase.id === 'test') {
    if (test) return [testItem(test, true)]
    return [rest(d > (allTestDays(s.repeats).filter((t) => t.date <= d).pop()?.date ?? d) && wd >= 4 ? 'Rest & pack' : 'Rest day')]
  }

  if (phase.id === 'beach') {
    if (PROGRAM.beach.travelDays.includes(d)) return [rest('Travel / rest')]
    const b = beachSlotOn(d)
    if (b) return [strengthItem(b)]
    if (wd === 2) return [{ kind: 'cardio', slot: 'beachRun', label: CARDIO.beachRun.label, counts: true, minutes: [30, 30] }]
    if (wd === 6) return [{ kind: 'cardio', slot: 'sprints', label: CARDIO.sprints.label, counts: true }]
    return [rest()]
  }

  // Foundation / Build / Push / Repeat: weekly template
  const items: PlanItem[] = []
  if (test) items.push(testItem(test, false))

  const xmas = PROGRAM.christmas
  for (const slot of ['LA', 'UA', 'LB', 'UB'] as const) {
    if (s.trainingDays[slot] !== wd) continue
    if (d === xmas.date && slot === xmas.session && s.christmasMove === 'move') continue
    items.push(strengthItem(slot))
  }
  if (d === xmas.moveTo && s.christmasMove === 'move') {
    items.push({ ...strengthItem(xmas.session), movedFrom: xmas.date })
    return items
  }

  // A 5 km test on a cardio day IS the cardio session.
  const fiveKTest = test && test.items.includes('fiveK') && wd === PROGRAM.cardioDay
  if (fiveKTest) items[0] = { ...items[0], counts: true, label: `${items[0].label} (5 km run)` }
  if (wd === PROGRAM.cardioDay && !fiveKTest) {
    const odd = weekNumber(d) % 2 === 1
    const c = odd ? CARDIO.odd : CARDIO.even
    items.push({ kind: 'cardio', slot: 'cardio', label: `${c.label} ${CARDIO.minutes[0]}-${CARDIO.minutes[1]} min`, counts: true, minutes: CARDIO.minutes, mode: c.mode as 'run' | 'swim' })
  }
  if (wd === PROGRAM.saturdayDay) items.push(saturdayItem(d, s))
  if (items.length === 0 || (items.length === 1 && items[0].kind === 'test')) {
    if (d === xmas.date && s.christmasMove === 'move') items.push(rest('Christmas 🎄'))
    else if (wd === 7) items.push(rest())
    else if (items.length === 0) items.push(rest())
  }
  return items
}

export function weekDays(weekStart: ISODate): ISODate[] {
  return rangeDays(weekStart, addDays(weekStart, 6))
}

/** Last day of the whole program including repeat cycles. */
export function programEnd(repeats: ISODate[]): ISODate {
  const cycles = repeatCycles(repeats)
  return cycles.length ? cycles[cycles.length - 1].testEnd : PROGRAM.testWeekEnd
}
