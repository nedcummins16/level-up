// "Grows with you": physique tiers, dunk meter, boss trophies and the Hall of PRs.
// All derived from your real data.

import { DUNK, PHYSIQUE, TROPHY } from '../config/game'
import { EXERCISES, PROGRAM, SESSIONS, TEST_ITEMS } from '../config/program'
import type { Equipment, TestItemId } from '../config/types'
import type { DailyLog, TestResult, WorkoutSession } from '../db/types'
import { avg7 } from './body'
import { addDays, type ISODate } from './dates'
import { epley } from './progression'

// ---------------------------------------------------------------- Physique

export interface Physique {
  bulk: number
  str: number
  bulkName: string
  strName: string
  avgKg: number | null
  nextBulkKg: number | null
  nextStr: number | null
  strNow: number
}

export function bulkSteps(startKg = PROGRAM.body.startKg, goalKg = PROGRAM.body.goalKg) {
  return PHYSIQUE.bulkSteps.map((f) => Math.round((startKg + (goalKg - startKg) * f) * 10) / 10)
}

const tierOf = (value: number | null, steps: number[]) => (value === null ? 0 : steps.filter((s) => value >= s).length)

/**
 * Bulk tier from the 7-day average weight, with a grace period: the tier is the best
 * reached over the last `dropAfterDays`, so you only shrink after 2 weeks below it.
 * STR tier is the best of today and the grace period (STR can wobble as bodyweight rises).
 */
export function computePhysique(daily: DailyLog[], strAt: (d: ISODate) => number, today: ISODate): Physique {
  const steps = bulkSteps()
  let bulk = 0
  let str = 0
  for (let i = 0; i < PHYSIQUE.dropAfterDays; i++) {
    const d = addDays(today, -i)
    bulk = Math.max(bulk, tierOf(avg7(daily, d), steps))
  }
  for (const i of [0, 7, PHYSIQUE.dropAfterDays - 1]) str = Math.max(str, tierOf(strAt(addDays(today, -i)), PHYSIQUE.strSteps))
  const avgKg = avg7(daily, today)
  const strNow = strAt(today)
  return {
    bulk,
    str,
    bulkName: PHYSIQUE.bulkNames[bulk],
    strName: PHYSIQUE.strNames[str],
    avgKg,
    nextBulkKg: bulk < steps.length ? steps[bulk] : null,
    nextStr: str < PHYSIQUE.strSteps.length ? PHYSIQUE.strSteps[str] : null,
    strNow,
  }
}

// ---------------------------------------------------------------- Dunk meter

export interface JumpEntry {
  date: ISODate
  touch: number
  standReach: number | null
  source: 'test' | 'check'
}

/** All jump touch heights (cm) from boss tests and quick checks, oldest first. */
export function jumpEntries(tests: TestResult[], daily: DailyLog[]): JumpEntry[] {
  const out: JumpEntry[] = []
  for (const t of tests) {
    const touch = t.raw?.jumpTouch
    if (typeof touch === 'number' && touch > 0) out.push({ date: t.date, touch, standReach: t.raw?.standReach ?? null, source: 'test' })
  }
  for (const d of daily) {
    if (typeof d.jumpTouch === 'number' && d.jumpTouch > 0) out.push({ date: d.date, touch: d.jumpTouch, standReach: d.standReach ?? null, source: 'check' })
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1))
}

export interface DunkState {
  best: number | null
  bestDate: ISODate | null
  standReach: number | null
  reached: string[]
  next: { id: string; name: string; cm: number } | null
  toNext: number | null
  entries: JumpEntry[]
}

export function computeDunk(tests: TestResult[], daily: DailyLog[]): DunkState {
  const entries = jumpEntries(tests, daily)
  const bestEntry = entries.reduce<JumpEntry | null>((b, e) => (!b || e.touch > b.touch ? e : b), null)
  const best = bestEntry?.touch ?? null
  const standReach = [...entries].reverse().find((e) => e.standReach !== null)?.standReach ?? null
  const reached = DUNK.milestones.filter((m) => best !== null && best >= m.cm).map((m) => m.id)
  const next = DUNK.milestones.find((m) => best === null || best < m.cm) ?? null
  return { best, bestDate: bestEntry?.date ?? null, standReach, reached, next, toNext: next && best !== null ? next.cm - best : null, entries }
}

/** Best jump reach (touch − standing reach) on or before a date, from tests and checks. */
export function bestJumpReach(tests: TestResult[], daily: DailyLog[], asOf: ISODate): number | null {
  const vals: number[] = []
  for (const t of tests) if (t.date <= asOf && typeof t.results.jumpReach === 'number') vals.push(t.results.jumpReach)
  for (const e of jumpEntries([], daily)) if (e.date <= asOf && e.standReach) vals.push(Math.round((e.touch - e.standReach) * 10) / 10)
  return vals.length ? Math.max(...vals) : null
}

// ---------------------------------------------------------------- Boss trophies

export type TrophyTier = 'baseline' | 'bronze' | 'silver' | 'gold'

export interface BossTrophy {
  testId: string
  date: ISODate
  tier: TrophyTier
  improved: number
  compared: number
}

const COMPARABLE: { key: string; item: TestItemId }[] = [
  ...(['bodyweight', 'arm', 'chest', 'pushups', 'pullups', 'toeTouch', 'jumpReach', 'fiveK', 'restingHr'] as TestItemId[]).map((k) => ({ key: k, item: k })),
  { key: 'lifts_squat', item: 'lifts' },
  { key: 'lifts_bench', item: 'lifts' },
  { key: 'lifts_deadlift', item: 'lifts' },
]

export function bossTrophies(tests: TestResult[]): BossTrophy[] {
  const done = tests.filter((t) => t.completedAt).sort((a, b) => (a.date < b.date ? -1 : 1))
  return done.map((t, i) => {
    let improved = 0
    let compared = 0
    for (const { key, item } of COMPARABLE) {
      const better = TEST_ITEMS[item].better
      const cur = t.results[key]
      if (typeof cur !== 'number' || better === 'none') continue
      const prev = done
        .slice(0, i)
        .reverse()
        .find((p) => typeof p.results[key] === 'number')?.results[key]
      if (typeof prev !== 'number') continue
      compared++
      if (better === 'higher' ? cur > prev : cur < prev) improved++
    }
    const ratio = compared ? improved / compared : 0
    const tier: TrophyTier = compared === 0 ? 'baseline' : ratio >= TROPHY.gold ? 'gold' : ratio >= TROPHY.silver ? 'silver' : 'bronze'
    return { testId: t.id, date: t.date, tier, improved, compared }
  })
}

// ---------------------------------------------------------------- Hall of PRs

export interface HallEntry {
  ex: string
  name: string
  equipment: Equipment
  weight: number | null
  reps: number
  date: ISODate
  e1rm: number | null
}

const loadOf = (w: number | null, eq: Equipment) => (eq === 'assisted' ? -(w ?? 0) : (w ?? 0))

/** Best set ever per exercise: heaviest load (then most reps at it); bodyweight moves by reps. */
export function hallOfPRs(sessions: WorkoutSession[]): HallEntry[] {
  const best = new Map<string, HallEntry>()
  for (const s of sessions) {
    if (s.status !== 'done') continue
    for (const e of s.exercises) {
      for (const set of e.sets) {
        if (!set.done || !set.reps) continue
        const cur = best.get(e.ex)
        const bwLike = e.equipment === 'bodyweight' || e.equipment === 'timed' || e.equipment === 'plyo'
        const better = !cur
          ? true
          : bwLike && !(set.weight ?? 0) && !(cur.weight ?? 0)
            ? set.reps > cur.reps
            : loadOf(set.weight, e.equipment) > loadOf(cur.weight, e.equipment) ||
              (loadOf(set.weight, e.equipment) === loadOf(cur.weight, e.equipment) && set.reps > cur.reps)
        if (better) {
          const weighted = !bwLike && e.equipment !== 'assisted' && (set.weight ?? 0) > 0
          best.set(e.ex, {
            ex: e.ex,
            name: e.name,
            equipment: e.equipment,
            weight: set.weight,
            reps: set.reps,
            date: s.date,
            e1rm: weighted ? Math.round(epley(set.weight!, set.reps) * 10) / 10 : null,
          })
        }
      }
    }
  }
  // Program order first, then anything else (swaps, custom).
  const order = Object.values(SESSIONS).flatMap((t) => t.exercises.flatMap((p) => [p.weekSwap?.ex, p.ex]))
  const rank = (id: string) => {
    const i = order.indexOf(id)
    return i < 0 ? 999 + (EXERCISES[id] ? 0 : 1) : i
  }
  return [...best.values()].sort((a, b) => rank(a.ex) - rank(b.ex))
}

