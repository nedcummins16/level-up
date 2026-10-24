// Plays through the whole 12-week program as a "perfect" user and checks the
// plan, progression and game layer hold together end to end.
import { describe, expect, it } from 'vitest'
import { titleFor } from '../config/game'
import { PROGRAM } from '../config/program'
import { defaultSettings } from '../db/db'
import type { CheckIn, DailyLog, TestResult, WorkoutSession } from '../db/types'
import { addDays, mondayOf } from './dates'
import { computeGame } from './game'
import { allTestDays, type PlanSettings } from './plan'
import { planWeek } from './schedule'
import { buildSession } from './session'

function simulate(endDate: string, opts: { christmasMove?: 'move' | 'keep' } = {}) {
  const settings = { ...defaultSettings(), christmasMove: opts.christmasMove ?? null, startWeights: { gobletSquat: 16, rdl: 40, dbWalkingLunge: 8, legCurl: 25, standingCalfRaise: 40, benchPress: 30, chestSupportedRow: 30, seatedDbPress: 8, latPulldown: 35, dbLateralRaise: 4, dbCurl: 6, tricepsPushdown: 15, trapBarDeadlift: 50, legPress: 60, bulgarianSplitSquat: 6, hipThrust: 40, singleLegCalfRaise: 0, pullUp: 30, inclineDbPress: 10, oneArmDbRow: 12, facePull: 15, hammerCurl: 6, overheadTricepsExt: 8, backSquat: 40 } }
  const ps: PlanSettings = { trainingDays: settings.trainingDays, tennisOff: [], christmasMove: settings.christmasMove, repeats: [] }
  const sessions: WorkoutSession[] = []
  const daily: DailyLog[] = []
  const checkins: CheckIn[] = []
  const tests: TestResult[] = []
  let id = 1
  let kg = 58

  for (let d = PROGRAM.start; d <= endDate; d = addDays(d, 1)) {
    const week = planWeek(mondayOf(d), { today: d, settings: ps, sessions, life: [] })
    const day = week.days.find((x) => x.date === d)!
    for (const item of day.items) {
      if (item.kind === 'strength') {
        const plan = buildSession(item.slot as never, { date: d, settings, sessions, life: [] })
        sessions.push({
          id: id++,
          date: d,
          slot: plan.slot,
          status: 'done',
          startedAt: id,
          modifiers: plan.mods.types,
          multiplier: plan.mods.multiplier,
          reduced: plan.reduced,
          warmupDone: [],
          exercises: plan.exercises.map((e) => ({
            planEx: e.planEx,
            ex: e.ex,
            name: e.name,
            equipment: e.equipment,
            reps: e.reps,
            rest: e.rest,
            targetSets: e.sets,
            suggested: e.suggestion.weight,
            // hit the top of the range every time
            sets: Array.from({ length: e.sets }, () => ({ weight: e.suggestion.weight, reps: e.reps === 'max-2' ? 15 : e.reps[1], rir: 2, done: true })),
          })),
        })
      } else if (item.kind === 'cardio' || item.kind === 'tennis' || item.kind === 'intervals') {
        sessions.push({ id: id++, date: d, slot: item.slot!, status: 'done', startedAt: id, modifiers: [], multiplier: 1, reduced: false, warmupDone: [], exercises: [], minutes: 35, label: item.label })
      } else if (item.kind === 'test') {
        tests.push({ id: item.testId!, date: d, results: { pushups: 20, pullups: 3, toeTouch: -5, jumpReach: 50, fiveK: 1700 }, completedAt: 1 })
      }
    }
    kg += 0.07
    daily.push({ date: d, weight: Math.round(kg * 10) / 10, mobility: [], mobilityDone: true, protein: true, steps: true, smoothie: true })
    if (d === addDays(mondayOf(d), 6)) checkins.push({ weekStart: mondayOf(d), date: d, avgWeight: kg, sessionsDone: 6, sessionsPlanned: 6, energy: 4, sleep: 4, soreness: 2, garminSleep: 8, restingHr: 55, notes: '', createdAt: 0 })
  }
  // open every raid chest
  settings.openedChests = Array.from({ length: 14 }, (_, i) => addDays(PROGRAM.start, i * 7))
  const game = computeGame({ settings, sessions, daily, checkins, tests, life: [], today: endDate, planFor: (w) => planWeek(w, { today: endDate, settings: ps, sessions, life: [] }) })
  return { game, sessions, tests }
}

describe('full 12-week simulation', () => {
  const { game, sessions, tests } = simulate(PROGRAM.testWeekEnd)

  it('logs every planned session and beats every boss', () => {
    expect(sessions.filter((s) => ['BA', 'BB'].includes(s.slot)).length).toBe(6)
    expect(tests.map((t) => t.id).sort()).toEqual(allTestDays().map((t) => t.id).sort())
  })

  it('keeps an unbroken streak and earns max freezes', () => {
    expect(game.streak).toBe(13)
    expect(game.freezes).toBe(2)
    expect(game.weeks.every((w) => w.complete)).toBe(true)
  })

  it('unlocks the expected achievements', () => {
    const got = game.achievements.filter((a) => a.unlocked).map((a) => a.id)
    expect(got).toEqual(expect.arrayContaining(['firstSession', 'firstPR', 'ironWeek', 'beachSurvivor', 'neverTwice', 'club60', 'club62']))
    expect(got).not.toContain('dunk')
  })

  it('progresses weights through the program', () => {
    const bench = sessions.flatMap((s) => s.exercises.filter((e) => e.ex === 'benchPress').map((e) => ({ d: s.date, w: e.suggested })))
    expect(bench[0].w).toBe(30)
    expect(bench[bench.length - 1].w!).toBeGreaterThan(40)
    // first session back from the beach (Lower B Thu 14 Jan) is at 90%
    const jan14 = sessions.find((s) => s.date === '2027-01-14')!
    expect(jan14.slot).toBe('LB')
    expect(jan14.multiplier).toBe(0.9)
  })

  it('reaches Rim Rattler around the end of the program', () => {
    // A perfect run (every set at the top of the range = constant PRs) passes the
    // final title with a little room; a realistic run lands on it near the end.
    expect(game.level).toBeGreaterThanOrEqual(22)
    expect(game.level).toBeLessThanOrEqual(30)
    expect(titleFor(game.level)).toBe('Rim Rattler')
  })
})

describe('simulation with Christmas move', () => {
  it('does Upper B on Sat 26 Dec instead of Fri 25 Dec', () => {
    const { sessions, game } = simulate('2026-12-27', { christmasMove: 'move' })
    expect(sessions.filter((s) => s.date === '2026-12-25')).toHaveLength(0)
    expect(sessions.filter((s) => s.date === '2026-12-26').map((s) => s.slot)).toEqual(['UB'])
    expect(game.weeks.find((w) => w.weekStart === '2026-12-21')!.complete).toBe(true)
  })
})
