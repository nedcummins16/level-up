import { describe, expect, it } from 'vitest'
import type { LifeEvent, LifeType, WorkoutSession } from '../db/types'
import { dayMods, makeLifeEvent } from './life'
import type { PlanSettings } from './plan'
import { planWeek, requiredSessions } from './schedule'

// Week 2 of the plan: Mon 23 Nov – Sun 29 Nov 2026
const MON = '2026-11-23'
const TUE = '2026-11-24'
const WED = '2026-11-25'
const THU = '2026-11-26'
const FRI = '2026-11-27'
const SAT = '2026-11-28'

const S = (tennisOff = false): PlanSettings => ({
  trainingDays: { LA: 1, UA: 2, LB: 4, UB: 5 },
  tennisOff: tennisOff ? [MON] : [],
  christmasMove: null,
  repeats: [],
})

let nextId = 1
const done = (date: string, slot: WorkoutSession['slot'], replaces?: WorkoutSession['replaces']): WorkoutSession => ({
  id: nextId++,
  date,
  slot,
  replaces,
  status: 'done',
  startedAt: nextId,
  modifiers: [],
  multiplier: 1,
  reduced: false,
  exercises: [],
  warmupDone: [],
})

const life = (type: LifeType, start: string, end?: string | null): LifeEvent => ({ type, start, end: end === undefined ? start : end, createdAt: 0 })

function week(today: string, sessions: WorkoutSession[] = [], events: LifeEvent[] = [], tennisOff = false) {
  const w = planWeek(MON, { today, settings: S(tennisOff), sessions, life: events })
  const strength = Object.fromEntries(
    w.days.filter((d) => d.date >= today).map((d) => [d.date, d.items.filter((i) => i.kind === 'strength').map((i) => i.slot).join('+')]),
  )
  const slots = Object.fromEntries(w.days.map((d) => [d.date, d.items.map((i) => i.slot ?? i.kind).join('+')]))
  return { w, strength, slots }
}

describe('scheduler: normal week', () => {
  it('follows the template when nothing is missed', () => {
    const { slots } = week(MON)
    expect(slots[MON]).toBe('LA')
    expect(slots[TUE]).toBe('UA')
    expect(slots[WED]).toBe('cardio')
    expect(slots[THU]).toBe('LB')
    expect(slots[FRI]).toBe('UB')
    expect(slots[SAT]).toBe('tennis')
    expect(slots['2026-11-29']).toBe('rest')
  })

  it('needs 4 of 6 for the streak', () => {
    const { w } = week(MON)
    expect(w.planned).toBe(6)
    expect(w.required).toBe(4)
    expect(requiredSessions(5, false)).toBe(4)
    expect(requiredSessions(6, true)).toBe(3)
  })
})

describe('scheduler: missed sessions shift the sequence', () => {
  it('missed Monday → LA Tue, UA Wed (cardio dropped), LB Thu, UB Fri', () => {
    const { strength, w } = week(TUE)
    expect(strength).toMatchObject({ [TUE]: 'LA', [WED]: 'UA', [THU]: 'LB', [FRI]: 'UB' })
    const wed = w.days.find((d) => d.date === WED)!
    expect(wed.items.some((i) => i.slot === 'cardio')).toBe(false)
    expect(wed.dropped[0].item.slot).toBe('cardio')
    expect(w.unfit).toEqual([])
  })

  it('missed Tuesday (LA done Mon) → UA Wed, LB Thu, UB Fri', () => {
    const { strength } = week(WED, [done(MON, 'LA')])
    expect(strength).toMatchObject({ [WED]: 'UA', [THU]: 'LB', [FRI]: 'UB' })
  })

  it('missed Mon + Tue with tennis on → 3 sessions fit, Upper B dropped (no doubling up)', () => {
    const { strength, w } = week(WED)
    expect(strength).toMatchObject({ [WED]: 'LA', [THU]: 'UA', [FRI]: 'LB', [SAT]: '' })
    expect(w.unfit).toEqual(['UB'])
  })

  it('missed Mon + Tue with tennis off → Saturday intervals make room for Upper B', () => {
    const { strength, w } = week(WED, [], [], true)
    expect(strength).toMatchObject({ [WED]: 'LA', [THU]: 'UA', [FRI]: 'LB', [SAT]: 'UB' })
    expect(w.unfit).toEqual([])
  })

  it('never puts two lower days in a row', () => {
    // UA done Mon, missed Tue, LA done Wed → Lower B can't be Thu
    const { strength } = week(THU, [done(MON, 'UA'), done(WED, 'LA')], [], true)
    expect(strength[THU]).toBe('')
    expect(strength[FRI]).toBe('LB')
    expect(strength[SAT]).toBe('UB')
  })

  it('never uses Sunday', () => {
    const { strength, w } = week(SAT, [done(MON, 'LA')], [], true)
    expect(strength[SAT]).toBe('UA')
    expect(strength['2026-11-29']).toBe('')
    expect(w.unfit).toEqual(['LB', 'UB'])
  })

  it('"Can\'t train today" shifts today\'s session to the next free day', () => {
    const { strength } = week(MON, [], [life('missed', MON)])
    expect(strength[MON]).toBe('')
    expect(strength[TUE]).toBe('LA')
    expect(strength[WED]).toBe('UA')
  })
})

describe('Life Happens options', () => {
  it('busy week: Lower A, Upper A, then a Lower B + Upper B combo; minimum 3', () => {
    const { strength, w } = week(MON, [], [life('busyWeek', MON, '2026-11-29')])
    expect(strength).toMatchObject({ [MON]: 'LA', [TUE]: 'UA', [THU]: 'COMBO', [FRI]: '' })
    expect(w.required).toBe(3)
  })

  it('no gym: today becomes Beach A, standing in for Lower A', () => {
    const { w } = week(MON, [], [life('noGym', MON)])
    const item = w.days[0].items.find((i) => i.kind === 'strength')!
    expect(item.slot).toBe('BA')
    expect(item.replaces).toBe('LA')
  })

  it('doing the beach stand-in counts as the replaced session', () => {
    const { strength } = week(TUE, [done(MON, 'BA', 'LA')])
    expect(strength[TUE]).toBe('UA')
  })

  it('sick below the neck: rest while sick, sessions shift', () => {
    const { w, strength } = week(MON, [], [life('sickBelow', MON, null)])
    expect(w.days[0].items.map((i) => i.label)[0]).toMatch(/Sick/)
    expect(strength[TUE]).toBe('')
    expect(dayMods([life('sickBelow', MON, TUE)], THU).multiplier).toBe(0.8)
    expect(dayMods([life('sickBelow', MON, TUE)], '2026-12-01').multiplier).toBe(0.8) // 7th day back
    expect(dayMods([life('sickBelow', MON, TUE)], '2026-12-02').multiplier).toBe(1)
  })

  it('sick above the neck: half sets, RIR 4, no intervals', () => {
    const ev = [life('sickAbove', MON, null)]
    const m = dayMods(ev, TUE)
    expect(m.halfSets).toBe(true)
    expect(m.rirOverride).toBe('RIR 4')
    const { slots } = week(MON, [], ev, true)
    expect(slots[SAT]).toBe('rest')
  })

  it('only 30 min = 3 exercises; unmotivated = 1; bad sleep = −1 set + no PR', () => {
    expect(dayMods([life('only30', MON)], MON).maxExercises).toBe(3)
    expect(dayMods([life('unmotivated', MON)], MON).maxExercises).toBe(1)
    const bs = dayMods([life('badSleep', MON)], MON)
    expect(bs.minusOneSet && bs.noPR).toBe(true)
    expect(dayMods([life('badSleep', MON)], TUE).minusOneSet).toBe(false)
  })

  it('sore back swaps squat and deadlifts', () => {
    const m = dayMods([life('soreBack', MON, null)], WED, [], { backSquat: 'legPress', trapBarDeadlift: 'backExtension' })
    expect(m.swaps.backSquat).toBe('legPress')
    expect(m.swaps.trapBarDeadlift).toBe('backExtension')
  })

  it('missed a whole week: 90% then 95% then full', () => {
    const ev = [makeLifeEvent('missedWeek', MON) as LifeEvent]
    expect(dayMods(ev, MON).multiplier).toBe(0.9)
    expect(dayMods(ev, '2026-11-30').multiplier).toBe(0.95)
    expect(dayMods(ev, '2026-12-07').multiplier).toBe(1)
  })

  it('run down: half sets for the rest of the week', () => {
    const ev = [makeLifeEvent('runDown', WED) as LifeEvent]
    expect(ev[0].end).toBe('2026-11-29')
    expect(dayMods(ev, FRI).halfSets).toBe(true)
    expect(dayMods(ev, '2026-11-30').halfSets).toBe(false)
  })
})
