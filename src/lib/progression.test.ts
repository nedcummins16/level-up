import { describe, expect, it } from 'vitest'
import type { WorkoutSession } from '../db/types'
import { compare, epley, stallInfo, suggest, type Performance } from './progression'
import { allPRs, bestFor, isPR } from './records'

const perf = (weight: number | null, reps: number[], opts: Partial<Performance> = {}): Performance => ({
  date: '2026-11-16',
  sets: reps.map((r) => ({ weight, reps: r })),
  plannedSets: reps.length,
  reduced: false,
  ...opts,
})

describe('double progression', () => {
  it('uses your starting weight when there is no history', () => {
    expect(suggest({ equipment: 'barbell-lower', reps: [6, 8], history: [], startWeight: 40 })).toMatchObject({ weight: 40, action: 'start' })
    expect(suggest({ equipment: 'barbell-lower', reps: [6, 8], history: [] })).toMatchObject({ weight: null, action: 'start' })
  })

  it('adds 5 kg on lower-body barbell when every set hits the top', () => {
    const s = suggest({ equipment: 'barbell-lower', reps: [6, 8], history: [perf(60, [8, 8, 8])] })
    expect(s).toMatchObject({ weight: 65, action: 'increase', increment: 5 })
  })

  it('switches lower-body barbell to +2.5 kg after the first stall', () => {
    const history = [perf(60, [8, 7, 7]), perf(60, [8, 7, 7]) /* stall */, perf(60, [8, 8, 8])]
    expect(suggest({ equipment: 'barbell-lower', reps: [6, 8], history })).toMatchObject({ weight: 62.5, increment: 2.5 })
  })

  it('adds 2.5 upper barbell, 2 dumbbell, 1 machine step', () => {
    expect(suggest({ equipment: 'barbell-upper', reps: [6, 8], history: [perf(40, [8, 8, 8])] }).weight).toBe(42.5)
    expect(suggest({ equipment: 'dumbbell', reps: [8, 10], history: [perf(12, [10, 10, 10])] }).weight).toBe(14)
    expect(suggest({ equipment: 'machine', reps: [10, 12], history: [perf(40, [12, 12, 12])] }).weight).toBe(45)
    expect(suggest({ equipment: 'machine', reps: [10, 12], history: [perf(40, [12, 12, 12])], machineStep: 7 }).weight).toBe(47)
  })

  it('holds the weight when not every set hits the top', () => {
    const s = suggest({ equipment: 'barbell-upper', reps: [6, 8], history: [perf(40, [8, 8, 7])] })
    expect(s).toMatchObject({ weight: 40, action: 'hold' })
  })

  it('needs all planned sets: 2 sets done of 3 planned is not "every set"', () => {
    const s = suggest({ equipment: 'barbell-upper', reps: [6, 8], history: [perf(40, [8, 8], { plannedSets: 3 })] })
    expect(s.action).toBe('hold')
  })

  it('suggests a 10% reduction after 3 sessions in a row without improvement', () => {
    const history = [perf(50, [7, 6, 6]), perf(50, [7, 6, 6]), perf(50, [7, 6, 6]), perf(50, [6, 6, 6])]
    const s = suggest({ equipment: 'barbell-upper', reps: [6, 8], history })
    expect(s).toMatchObject({ weight: 45, action: 'deload' })
  })

  it('does not deload after only 2 stalled sessions', () => {
    const history = [perf(50, [7, 6, 6]), perf(50, [7, 6, 6]), perf(50, [7, 6, 6])]
    expect(suggest({ equipment: 'barbell-upper', reps: [6, 8], history }).action).toBe('hold')
  })

  it('resets the stall count after any improvement or a deload', () => {
    const history = [perf(50, [6, 6, 6]), perf(50, [6, 6, 6]), perf(50, [6, 6, 6]), perf(50, [7, 6, 6]), perf(50, [7, 6, 6])]
    expect(stallInfo(history, 'barbell-upper').streak).toBe(1)
    const afterDeload = [perf(50, [6, 6, 6]), perf(45, [6, 6, 6]), perf(45, [6, 6, 6])]
    expect(stallInfo(afterDeload, 'barbell-upper').streak).toBe(1)
    expect(compare(perf(45, [6]), perf(50, [6]), 'barbell-upper')).toBe('reset')
  })

  it('ignores reduced sessions (sick, bad sleep, 90% weeks) for decisions', () => {
    const history = [perf(60, [8, 8, 8]), perf(54, [8, 8], { reduced: true })]
    expect(suggest({ equipment: 'barbell-lower', reps: [6, 8], history }).weight).toBe(65)
  })

  it('applies a multiplier to the last full weight (e.g. 90% after the beach)', () => {
    const s = suggest({ equipment: 'barbell-lower', reps: [5, 6], history: [perf(80, [6, 6, 6])], multiplier: 0.9 })
    expect(s).toMatchObject({ weight: 72.5, action: 'hold' }) // 72 rounded to 2.5
    expect(suggest({ equipment: 'dumbbell', reps: [8, 10], history: [perf(20, [9, 9, 9])], multiplier: 0.8 }).weight).toBe(16)
  })

  it('never increases on a no-PR day (bad sleep)', () => {
    const s = suggest({ equipment: 'barbell-upper', reps: [6, 8], history: [perf(40, [8, 8, 8])], noIncrease: true })
    expect(s).toMatchObject({ weight: 40, action: 'hold' })
  })

  it('reduces assistance on assisted pull-ups', () => {
    const s = suggest({ equipment: 'assisted', reps: [5, 8], history: [perf(25, [8, 8, 8])] })
    expect(s).toMatchObject({ weight: 20, action: 'increase' })
    const unassisted = suggest({ equipment: 'assisted', reps: [5, 8], history: [perf(0, [8, 8, 8])] })
    expect(unassisted.weight).toBe(0)
    // less assistance = better
    expect(compare(perf(20, [6]), perf(25, [6]), 'assisted')).toBe('better')
    // 90% effective load adds assistance: 60 kg body, 20 assist → 40 effective → 36 → 24 assist → rounds up to 25
    expect(suggest({ equipment: 'assisted', reps: [5, 8], history: [perf(20, [6, 6, 6])], multiplier: 0.9, bodyweight: 60 }).weight).toBe(25)
  })

  it('progresses bodyweight moves by reps', () => {
    const s = suggest({ equipment: 'bodyweight', reps: 'max-2', history: [perf(null, [15, 13, 12])] })
    expect(s.action).toBe('reps')
    expect(s.message).toContain('15, 13, 12')
  })

  it('Epley 1RM', () => {
    expect(epley(100, 1)).toBe(100)
    expect(epley(60, 8)).toBeCloseTo(76)
  })
})

const session = (id: number, date: string, ex: string, sets: [number | null, number][], equipment: 'barbell-upper' | 'assisted' | 'bodyweight' = 'barbell-upper'): WorkoutSession => ({
  id,
  date,
  slot: 'UA',
  status: 'done',
  startedAt: id,
  modifiers: [],
  multiplier: 1,
  reduced: false,
  warmupDone: [],
  exercises: [
    {
      planEx: ex,
      ex,
      name: ex,
      equipment,
      reps: [6, 8],
      rest: 120,
      targetSets: sets.length,
      suggested: null,
      sets: sets.map(([weight, reps]) => ({ weight, reps, rir: null, done: true })),
    },
  ],
})

describe('PRs', () => {
  it('first ever session is a baseline, not a PR', () => {
    expect(allPRs([session(1, '2026-11-17', 'bench', [[40, 8]])])).toHaveLength(0)
  })

  it('more weight, or more reps at the same weight, is a PR (max one per exercise per session)', () => {
    const s = [
      session(1, '2026-11-17', 'bench', [[40, 8], [40, 7]]),
      session(2, '2026-11-24', 'bench', [[40, 8], [40, 8]]), // no PR: same
      session(3, '2026-12-01', 'bench', [[42.5, 6], [42.5, 6]]), // PR: weight
      session(4, '2026-12-08', 'bench', [[42.5, 7], [42.5, 8]]), // PR: reps at 42.5 (one)
      session(5, '2026-12-15', 'bench', [[40, 9]]), // PR: 9 reps at 40 > 8
    ]
    expect(allPRs(s).map((p) => p.sessionId)).toEqual([3, 4, 5])
  })

  it('less assistance on pull-ups is a PR', () => {
    const s = [session(1, '2026-11-20', 'pullUp', [[25, 6]], 'assisted')]
    const best = bestFor(s, 'pullUp', 'assisted')
    expect(isPR(best, { weight: 20, reps: 5 }, 'assisted')).toBe(true)
    expect(isPR(best, { weight: 25, reps: 6 }, 'assisted')).toBe(false)
    expect(isPR(best, { weight: 25, reps: 7 }, 'assisted')).toBe(true)
  })

  it('bodyweight PR = more reps than ever', () => {
    const s = [session(1, '2026-11-20', 'pushUp', [[null, 20]], 'bodyweight')]
    const best = bestFor(s, 'pushUp', 'bodyweight')
    expect(isPR(best, { weight: null, reps: 21 }, 'bodyweight')).toBe(true)
    expect(isPR(best, { weight: null, reps: 20 }, 'bodyweight')).toBe(false)
  })
})
