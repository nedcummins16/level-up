import { describe, expect, it } from 'vitest'
import { defaultSettings } from '../db/db'
import type { LifeEvent, WorkoutSession } from '../db/types'
import { buildSession } from './session'

const settings = defaultSettings()

function lb(id: number, date: string, weight: number, reps: number[], reduced = false): WorkoutSession {
  return {
    id,
    date,
    slot: 'LB',
    status: 'done',
    startedAt: id,
    modifiers: [],
    multiplier: reduced ? 0.9 : 1,
    reduced,
    warmupDone: [],
    exercises: [
      {
        planEx: 'trapBarDeadlift',
        ex: 'trapBarDeadlift',
        name: 'Trap-bar deadlift',
        equipment: 'barbell-lower',
        reps: [5, 6],
        rest: 180,
        targetSets: reps.length,
        suggested: weight,
        sets: reps.map((r) => ({ weight, reps: r, rir: null, done: true })),
      },
    ],
  }
}

const ctx = (date: string, sessions: WorkoutSession[] = [], life: LifeEvent[] = []) => ({ date, settings, sessions, life })
const trap = (p: ReturnType<typeof buildSession>) => p.exercises.find((e) => e.ex === 'trapBarDeadlift')!

describe('session builder', () => {
  it('week 1 = 2 sets of everything, goblet squat in weeks 1-2, back squat from week 3', () => {
    const w1 = buildSession('LA', ctx('2026-11-16'))
    expect(w1.exercises.every((e) => e.sets === 2)).toBe(true)
    expect(w1.exercises[1].ex).toBe('gobletSquat')
    expect(buildSession('LA', ctx('2026-11-23')).exercises[1].ex).toBe('gobletSquat')
    const w3 = buildSession('LA', ctx('2026-11-30'))
    expect(w3.exercises[1].ex).toBe('backSquat')
    expect(w3.exercises[1].sets).toBe(3)
  })

  it('shows RIR targets per phase', () => {
    expect(buildSession('UA', ctx('2026-11-17')).exercises[0].rir).toEqual(['RIR 3', 'RIR 3'])
    expect(buildSession('UA', ctx('2026-12-08')).exercises[0].rir).toEqual(['RIR 2', 'RIR 2', 'RIR 1'])
    // Push: bench (barbell) last set RIR 1, machines/dumbbells may go to 0
    const push = buildSession('UA', ctx('2027-01-26'))
    expect(push.exercises[0].rir[2]).toBe('RIR 1')
    expect(push.exercises[1].rir[2]).toBe('RIR 0 ok')
  })

  it('first Push session (Thu 14 Jan, Lower B) is 90% of last weights, full again from week 10', () => {
    const before = [lb(1, '2026-12-17', 80, [6, 6, 6]), lb(2, '2026-12-24', 80, [6, 6, 6])]
    const jan14 = buildSession('LB', ctx('2027-01-14', before))
    expect(trap(jan14).suggestion.weight).toBe(72.5)
    expect(jan14.reduced).toBe(true)
    const after = [...before, lb(3, '2027-01-14', 72.5, [6, 6, 6], true)]
    const wk10 = buildSession('LB', ctx('2027-01-21', after))
    // top of range hit at 80 before the beach → progress from full weight; it had a stall at 80, so +2.5
    expect(trap(wk10).suggestion.weight).toBe(82.5)
    expect(wk10.reduced).toBe(false)
  })

  it('sick below the neck: 80% for a week after "I\'m better"', () => {
    const hist = [lb(1, '2026-12-03', 80, [5, 5, 5])]
    const life: LifeEvent[] = [{ type: 'sickBelow', start: '2026-12-05', end: '2026-12-08', createdAt: 0 }]
    expect(buildSession('LB', ctx('2026-12-07', hist, life)).mods.rest).toBe(true)
    expect(trap(buildSession('LB', ctx('2026-12-10', hist, life))).suggestion.weight).toBe(65) // 64 → 65
    expect(trap(buildSession('LB', ctx('2026-12-17', hist, life))).suggestion.weight).toBe(80)
  })
})
