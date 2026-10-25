import { describe, expect, it } from 'vitest'
import type { DailyLog, TestResult, WorkoutSession } from '../db/types'
import { addDays } from './dates'
import { bossTrophies, bulkSteps, computeDunk, computePhysique, hallOfPRs } from './growth'
import { bodyDims, buildSprite, H, W } from './sprite'

const weights = (from: string, kgs: number[]): DailyLog[] => kgs.map((kg, i) => ({ date: addDays(from, i), weight: kg, mobility: [], mobilityDone: false }))

describe('physique follows your real numbers', () => {
  it('bulk tiers come from the 7-day average between start (58) and goal (63)', () => {
    expect(bulkSteps()).toEqual([58.8, 60, 61.3, 62.5])
    const p = computePhysique(weights('2026-12-01', Array(7).fill(60.2)), () => 25, '2026-12-07')
    expect(p.bulk).toBe(2)
    expect(p.nextBulkKg).toBe(61.3)
    expect(p.str).toBe(1)
    expect(p.nextStr).toBe(35)
  })

  it('one light week does not shrink him; 2 weeks below does', () => {
    const daily = [...weights('2026-12-01', Array(7).fill(60.5)), ...weights('2026-12-08', Array(21).fill(59.5))]
    expect(computePhysique(daily, () => 0, '2026-12-14').bulk).toBe(2) // 1 week light: still tier 2
    expect(computePhysique(daily, () => 0, '2026-12-28').bulk).toBe(1) // 3 weeks later: back to tier 1
  })

  it('no weigh-ins = starting frame', () => {
    expect(computePhysique([], () => 0, '2026-12-01')).toMatchObject({ bulk: 0, str: 0, avgKg: null })
  })
})

describe('sprite builds', () => {
  it('gets wider and stronger with the tiers', () => {
    const small = bodyDims({ bulk: 0, str: 0 })
    const big = bodyDims({ bulk: 4, str: 4 })
    expect(big.torsoHalf).toBeGreaterThan(small.torsoHalf)
    expect(big.armW).toBeGreaterThan(small.armW)
    expect(big.shoulder).toBeGreaterThan(small.shoulder)
  })

  it('fits the grid at max build with all gear, and gear changes pixels', () => {
    const gear = { head: 'crown', shirt: 'jacket-champ', arms: 'wristbands-streak', shoes: 'flame-shoes', hand: 'basketball', back: 'cape' }
    const { grid } = buildSprite({ bulk: 4, str: 4 }, gear)
    expect(grid).toHaveLength(H)
    expect(grid.every((r) => r.length === W)).toBe(true)
    const colours = new Set(grid.flat().filter(Boolean))
    expect(colours.has('#5b2a86')).toBe(true) // jacket
    expect(colours.has('#ff8a1f')).toBe(true) // basketball
    expect(colours.has('#c81d4e')).toBe(true) // cape
    // the edges stay empty or outline (nothing clipped off the side)
    for (const row of grid) {
      expect(row[0] === null || row[0] === '#120c24').toBe(true)
      expect(row[W - 1] === null || row[W - 1] === '#120c24').toBe(true)
    }
  })
})

describe('dunk meter', () => {
  it('tracks the best touch height from tests and quick checks', () => {
    const tests: TestResult[] = [{ id: 'T1A', date: '2026-11-16', results: { jumpReach: 50 }, raw: { standReach: 225, jumpTouch: 275 }, completedAt: 1 }]
    const daily: DailyLog[] = [{ date: '2026-12-02', mobility: [], mobilityDone: false, standReach: 225, jumpTouch: 292 }]
    const d = computeDunk(tests, daily)
    expect(d.best).toBe(292)
    expect(d.reached).toEqual(['net', 'board'])
    expect(d.next?.id).toBe('rim')
    expect(d.toNext).toBe(13)
    expect(d.standReach).toBe(225)
  })

  it('empty until the first jump test', () => {
    expect(computeDunk([], [])).toMatchObject({ best: null, reached: [], toNext: null })
  })
})

describe('boss trophies', () => {
  const t = (id: string, date: string, results: Record<string, number>): TestResult => ({ id, date, results, completedAt: 1 })
  it('baseline first, then gold/silver/bronze by share of results improved', () => {
    const tests = [
      t('T1A', '2026-11-16', { pushups: 20, pullups: 2, fiveK: 1800, waist: 70 }),
      t('T2', '2026-12-23', { pushups: 25, pullups: 4, fiveK: 1700, waist: 72 }), // 3/3 better (waist not scored)
      t('T3A', '2027-02-08', { pushups: 24, pullups: 5, fiveK: 1750 }), // 1/3 better
    ]
    expect(bossTrophies(tests).map((x) => x.tier)).toEqual(['baseline', 'gold', 'bronze'])
  })
})

describe('Hall of PRs', () => {
  it('keeps the heaviest set (then most reps) per exercise with its date', () => {
    const s = (date: string, sets: [number, number][]): WorkoutSession => ({
      id: Math.random(),
      date,
      slot: 'UA',
      status: 'done',
      startedAt: 0,
      modifiers: [],
      multiplier: 1,
      reduced: false,
      warmupDone: [],
      exercises: [{ planEx: 'benchPress', ex: 'benchPress', name: 'Barbell bench', equipment: 'barbell-upper', reps: [6, 8], rest: 180, targetSets: 3, suggested: null, sets: sets.map(([weight, reps]) => ({ weight, reps, rir: null, done: true })) }],
    })
    const hall = hallOfPRs([s('2026-11-17', [[40, 8]]), s('2026-11-24', [[42.5, 6], [42.5, 7]]), s('2026-12-01', [[42.5, 5]])])
    expect(hall).toHaveLength(1)
    expect(hall[0]).toMatchObject({ weight: 42.5, reps: 7, date: '2026-11-24' })
  })
})
