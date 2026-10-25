import { describe, expect, it } from 'vitest'
import type { WorkoutSession } from '../db/types'
import { bestFor } from './records'
import { activeSkills, canUnlock, e1rmTrend, maxFreezes, platesPerSide, prTarget, skillPoints, spentPoints } from './skills'

describe('skill tree', () => {
  it('1 point per level from level 2', () => {
    expect(skillPoints(1)).toBe(0)
    expect(skillPoints(5)).toBe(4)
  })

  it('needs prerequisites and enough points', () => {
    expect(canUnlock('plates', [], 1)).toBe(false) // no points at level 1
    expect(canUnlock('plates', [], 2)).toBe(true)
    expect(canUnlock('warmups', [], 5)).toBe(false) // needs plates first
    expect(canUnlock('warmups', ['plates'], 3)).toBe(true)
    expect(canUnlock('prPredict', ['ghost'], 3)).toBe(false) // costs 2, only 1 left
    expect(spentPoints(['ghost', 'prPredict'])).toBe(3)
  })

  it('only counts skills you can afford with their prerequisites', () => {
    expect([...activeSkills(['plates', 'warmups', 'ghost'], 3)]).toEqual(['plates', 'warmups'])
    expect([...activeSkills(['warmups'], 10)]).toEqual([]) // missing plates
  })

  it('Deep freezer adds a freeze slot', () => {
    expect(maxFreezes(new Set())).toBe(2)
    expect(maxFreezes(new Set(['freeze3']))).toBe(3)
  })
})

describe('plate calculator', () => {
  it('splits the load per side on a 20 kg bar', () => {
    expect(platesPerSide(60)).toEqual({ perSide: [20], leftover: 0 })
    expect(platesPerSide(62.5)).toEqual({ perSide: [20, 1.25], leftover: 0 })
    expect(platesPerSide(102.5)).toEqual({ perSide: [25, 15, 1.25], leftover: 0 })
    expect(platesPerSide(20)).toEqual({ perSide: [], leftover: 0 })
    expect(platesPerSide(15)).toBeNull()
  })
})

const sess = (date: string, w: number, reps: number[]): WorkoutSession => ({
  id: Math.random(),
  date,
  slot: 'UA',
  status: 'done',
  startedAt: 0,
  modifiers: [],
  multiplier: 1,
  reduced: false,
  warmupDone: [],
  exercises: [{ planEx: 'benchPress', ex: 'benchPress', name: 'Bench', equipment: 'barbell-upper', reps: [6, 8], rest: 180, targetSets: 3, suggested: w, sets: reps.map((r) => ({ weight: w, reps: r, rir: null, done: true })) }],
})

describe('PR predictor + trend', () => {
  it('tells you what beats your best', () => {
    const best = bestFor([sess('2026-11-17', 40, [8, 8]), sess('2026-11-24', 42.5, [7, 6])], 'benchPress', 'barbell-upper')
    expect(prTarget(best, 'barbell-upper', 42.5)).toBe('42.5 kg × 8+ or more than 42.5 kg')
    expect(prTarget(best, 'barbell-upper', 45)).toBe('any reps at 45 kg or more than 42.5 kg')
  })

  it('kg per week trend over the last 4 weeks', () => {
    const s = [sess('2026-11-03', 40, [8]), sess('2026-11-10', 42.5, [8]), sess('2026-11-17', 45, [8]), sess('2026-11-24', 47.5, [8])]
    const t = e1rmTrend(s, 'benchPress', '2026-11-25')!
    expect(t).toBeGreaterThan(2.5)
    expect(t).toBeLessThan(3.5)
    expect(e1rmTrend(s.slice(0, 2), 'benchPress', '2026-11-25')).toBeNull()
  })
})
