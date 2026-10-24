import { describe, expect, it } from 'vitest'
import { COMEBACK, XP } from '../config/game'
import { defaultSettings } from '../db/db'
import type { DailyLog, LifeEvent, WorkoutSession } from '../db/types'
import { addDays } from './dates'
import { computeGame, levelFromXP, mobilityStreak } from './game'
import { planWeek } from './schedule'

let id = 1
const s = (date: string, slot: WorkoutSession['slot'], sets = 3, minutes?: number): WorkoutSession => ({
  id: id++,
  date,
  slot,
  status: 'done',
  startedAt: id,
  modifiers: [],
  multiplier: 1,
  reduced: false,
  warmupDone: [],
  minutes,
  exercises:
    sets > 0
      ? [{ planEx: 'legCurl', ex: 'legCurl', name: 'Leg curl', equipment: 'machine', reps: [10, 12], rest: 90, targetSets: sets, suggested: 20, sets: Array.from({ length: sets }, () => ({ weight: 20, reps: 10, rir: null, done: true })) }]
      : [],
})

function game(sessions: WorkoutSession[], today: string, opts: { daily?: DailyLog[]; life?: LifeEvent[] } = {}) {
  const settings = defaultSettings()
  const ps = { trainingDays: settings.trainingDays, tennisOff: settings.tennisOff, christmasMove: null, repeats: [] }
  const life = opts.life ?? []
  return computeGame({
    settings,
    sessions,
    daily: opts.daily ?? [],
    checkins: [],
    tests: [],
    life,
    today,
    planFor: (w) => planWeek(w, { today, settings: ps, sessions, life }),
  })
}

/** 4 gym sessions in the week starting `mon`. */
const fullWeek = (mon: string) => [s(mon, 'LA'), s(addDays(mon, 1), 'UA'), s(addDays(mon, 3), 'LB'), s(addDays(mon, 4), 'UB')]

describe('XP & levels', () => {
  it('levels need rising XP', () => {
    expect(levelFromXP(0).level).toBe(1)
    expect(levelFromXP(299).level).toBe(1)
    expect(levelFromXP(300).level).toBe(2)
    expect(levelFromXP(300 + 449).level).toBe(2)
    expect(levelFromXP(300 + 450).level).toBe(3)
  })

  it('awards 100 per session + 10 per set, and caps strength XP at 4 sessions a week', () => {
    const wk = [...fullWeek('2026-11-16'), s('2026-11-21', 'LA')] // 5th strength session on Saturday
    const g = game(wk, '2026-11-22')
    const sessionXP = g.ledger.filter((e) => e.kind === 'session').reduce((a, e) => a + e.amount, 0)
    const setXP = g.ledger.filter((e) => e.kind === 'set').reduce((a, e) => a + e.amount, 0)
    expect(sessionXP).toBe(4 * XP.session)
    expect(setXP).toBe(4 * 3 * XP.set)
  })

  it('cardio gives 60', () => {
    const g = game([s('2026-11-18', 'cardio', 0, 35)], '2026-11-18')
    expect(g.ledger.find((e) => e.kind === 'cardio')?.amount).toBe(60)
  })
})

describe('weekly streak + freezes', () => {
  it('a week counts with 4 of 6 sessions', () => {
    const g = game(fullWeek('2026-11-16'), '2026-11-23')
    expect(g.weeks[0].complete).toBe(true)
    expect(g.streak).toBe(1)
  })

  it('earns a freeze every 3 complete weeks (max 2)', () => {
    const weeks = ['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28'].flatMap(fullWeek)
    const g = game(weeks, '2027-01-04')
    expect(g.streak).toBe(7)
    expect(g.freezes).toBe(2)
  })

  it('a sick week spends a freeze instead of breaking the streak', () => {
    const weeks = ['2026-11-16', '2026-11-23', '2026-11-30'].flatMap(fullWeek)
    const sick: LifeEvent = { type: 'sickBelow', start: '2026-12-07', end: '2026-12-11', createdAt: 0 }
    const g = game(weeks, '2026-12-15', { life: [sick] })
    expect(g.weeks[3].freezeUsed).toBe(true)
    expect(g.streak).toBe(3)
    expect(g.freezes).toBe(0)
  })

  it('a missed week without sickness breaks the streak', () => {
    const weeks = ['2026-11-16', '2026-11-23', '2026-11-30'].flatMap(fullWeek)
    const g = game(weeks, '2026-12-15')
    expect(g.streak).toBe(0)
    expect(g.bestStreak).toBe(3)
  })

  it('the current week does not break the streak until it ends', () => {
    const g = game(fullWeek('2026-11-16'), '2026-11-24')
    expect(g.streak).toBe(1)
  })
})

describe('mobility streak + achievements', () => {
  it('counts consecutive mobility days (today optional)', () => {
    const daily: DailyLog[] = ['2026-11-16', '2026-11-17', '2026-11-18'].map((date) => ({ date, mobility: [], mobilityDone: true }))
    expect(mobilityStreak(daily, '2026-11-19')).toBe(3)
    expect(mobilityStreak(daily, '2026-11-18')).toBe(3)
    expect(mobilityStreak(daily, '2026-11-20')).toBe(0)
  })

  it('unlocks First Session and Iron Week', () => {
    const wk = [...fullWeek('2026-11-16'), s('2026-11-18', 'cardio', 0, 30), s('2026-11-21', 'tennis', 0, 90)]
    const g = game(wk, '2026-11-23')
    const got = g.achievements.filter((a) => a.unlocked).map((a) => a.id)
    expect(got).toContain('firstSession')
    expect(got).toContain('ironWeek')
  })
})

describe('comeback quest', () => {
  it('gives a bonus for the first session after a missed gym day', () => {
    // Mon LA done, Tue UA missed, Wed cardio done = comeback
    const g = game([s('2026-11-16', 'LA'), s('2026-11-18', 'cardio', 0, 30)], '2026-11-19')
    const cb = g.ledger.filter((e) => e.kind === 'comeback')
    expect(cb).toHaveLength(1)
    expect(cb[0]).toMatchObject({ date: '2026-11-18', amount: COMEBACK.bonus })
  })

  it('skipping optional cardio never triggers it (no reward for skipping)', () => {
    const g = game(fullWeek('2026-11-16'), '2026-11-21')
    expect(g.ledger.some((e) => e.kind === 'comeback')).toBe(false)
  })

  it('at most once per week, and smaller than a session is worth', () => {
    // Week 2: Mon missed, Tue done (bonus), Wed missed... Thu done (no second bonus)
    const g = game([...fullWeek('2026-11-16'), s('2026-11-24', 'UA'), s('2026-11-27', 'LB')], '2026-11-28')
    const cb = g.ledger.filter((e) => e.kind === 'comeback')
    expect(cb).toHaveLength(1)
    expect(cb[0].date).toBe('2026-11-24')
    expect(COMEBACK.bonus).toBeLessThan(XP.cardio)
  })
})

describe('food quest', () => {
  it('gives quest XP for eating 5 times', () => {
    const daily: DailyLog[] = [{ date: '2026-11-16', mobility: [], mobilityDone: false, meals: ['breakfast', 'lunch', 'dinner', 'snack1', 'snack2'] }, { date: '2026-11-17', mobility: [], mobilityDone: false, meals: ['breakfast'] }]
    const g = game([], '2026-11-18', { daily })
    expect(g.ledger.filter((e) => e.reason === 'Ate 5 times')).toHaveLength(1)
  })
})
