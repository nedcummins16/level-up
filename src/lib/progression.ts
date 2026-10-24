// Double progression engine.
//
//  - Hit the TOP of the rep range on every set -> add weight next session
//      lower-body barbell: +5 kg until the first stall, then +2.5 kg
//      upper-body barbell: +2.5 kg
//      dumbbells: +2 kg
//      machines/cables: +1 machine step
//      assisted pull-up: 1 step less assistance
//  - Otherwise keep the weight and beat your reps.
//  - No improvement for 3 sessions in a row -> suggest a 10% reduction.
//  - Sessions done with reduced volume/intensity (sick, bad sleep, 90% weeks...)
//    don't count for these decisions.

import type { Equipment, RepTarget } from '../config/types'

export interface PerfSet {
  weight: number | null
  reps: number | null
}

export interface Performance {
  date: string
  sets: PerfSet[]
  plannedSets: number
  reduced: boolean
}

export type SuggestAction = 'start' | 'increase' | 'hold' | 'deload' | 'reps'

export interface Suggestion {
  /** kg (for 'assisted' this is the ASSISTANCE in kg). null = you enter it. */
  weight: number | null
  action: SuggestAction
  message: string
  /** The weight progression would give with no Life Happens multiplier. */
  baseWeight: number | null
  increment: number
}

export interface ProgressionInput {
  equipment: Equipment
  reps: RepTarget
  history: Performance[]
  machineStep?: number
  startWeight?: number | null
  /** Multiplier for reduced weeks (0.9, 0.8...). Applied to your LAST full weight. */
  multiplier?: number
  /** Bad sleep: never suggest an increase. */
  noIncrease?: boolean
  /** Used to scale assisted pull-ups (effective load = bodyweight − assistance). */
  bodyweight?: number
}

export const BODYWEIGHT_LIKE: Equipment[] = ['bodyweight', 'plyo', 'timed']

export function incrementFor(equipment: Equipment, machineStep = 5, stalledBefore = false): number {
  switch (equipment) {
    case 'barbell-lower':
      return stalledBefore ? 2.5 : 5
    case 'barbell-upper':
      return 2.5
    case 'dumbbell':
      return 2
    case 'machine':
    case 'assisted':
      return machineStep
    default:
      return 0
  }
}

function roundStep(equipment: Equipment, machineStep: number) {
  switch (equipment) {
    case 'barbell-lower':
    case 'barbell-upper':
      return 2.5
    case 'dumbbell':
      return 2
    case 'machine':
    case 'assisted':
      return machineStep
    default:
      return 0.5
  }
}

export function roundTo(x: number, step: number, mode: 'round' | 'floor' | 'ceil' = 'round') {
  const f = mode === 'floor' ? Math.floor : mode === 'ceil' ? Math.ceil : Math.round
  return Math.round(f(x / step + 1e-9) * step * 100) / 100
}

const doneSets = (p: Performance) => p.sets.filter((s) => s.reps !== null && s.reps > 0)

/** Working weight of a session: the heaviest set (for assisted: the least assistance). */
export function workingWeight(p: Performance, equipment: Equipment): number | null {
  const ws = doneSets(p)
    .map((s) => s.weight)
    .filter((w): w is number => w !== null)
  if (!ws.length) return null
  return equipment === 'assisted' ? Math.min(...ws) : Math.max(...ws)
}

const totalReps = (p: Performance) => doneSets(p).reduce((a, s) => a + (s.reps ?? 0), 0)

export function topOfRange(reps: RepTarget): number | null {
  return reps === 'max-2' ? null : reps[1]
}

export function hitTop(p: Performance, reps: RepTarget): boolean {
  const top = topOfRange(reps)
  if (top === null) return false
  const sets = doneSets(p)
  return sets.length >= p.plannedSets && sets.every((s) => (s.reps ?? 0) >= top)
}

/** Compare a session to the one before: 'better', 'same' (stall), or 'reset' (weight went down). */
export function compare(cur: Performance, prev: Performance, equipment: Equipment): 'better' | 'same' | 'reset' {
  const cw = workingWeight(cur, equipment) ?? 0
  const pw = workingWeight(prev, equipment) ?? 0
  const heavier = equipment === 'assisted' ? cw < pw : cw > pw
  const lighter = equipment === 'assisted' ? cw > pw : cw < pw
  if (heavier) return 'better'
  if (lighter) return 'reset'
  return totalReps(cur) > totalReps(prev) ? 'better' : 'same'
}

export interface StallInfo {
  /** Consecutive sessions without improvement at the end of the history. */
  streak: number
  /** Has this exercise ever stalled (used for lower barbell +5 → +2.5). */
  everStalled: boolean
}

export function stallInfo(history: Performance[], equipment: Equipment): StallInfo {
  let streak = 0
  let everStalled = false
  for (let i = 1; i < history.length; i++) {
    const c = compare(history[i], history[i - 1], equipment)
    if (c === 'same') {
      streak++
      everStalled = true
    } else streak = 0
  }
  return { streak, everStalled }
}

export function suggest(input: ProgressionInput): Suggestion {
  const { equipment, reps } = input
  const step = input.machineStep ?? 5
  const counted = input.history.filter((p) => !p.reduced && doneSets(p).length > 0)
  const mult = input.multiplier ?? 1

  if (BODYWEIGHT_LIKE.includes(equipment)) {
    const last = counted[counted.length - 1] ?? input.history[input.history.length - 1]
    const w = last ? workingWeight(last, equipment) : null
    if (!last) return { weight: null, baseWeight: null, action: 'reps', increment: 0, message: 'First time: find your numbers' }
    const lastReps = doneSets(last).map((s) => s.reps)
    const msg = last && hitTop(last, reps) ? 'Top of range hit: slow the tempo or add load' : `Beat last time: ${lastReps.join(', ')}`
    return { weight: w, baseWeight: w, action: 'reps', increment: 0, message: msg }
  }

  if (counted.length === 0) {
    const sw = input.startWeight ?? null
    const any = input.history[input.history.length - 1]
    const fallback = sw ?? (any ? workingWeight(any, equipment) : null)
    return {
      weight: fallback,
      baseWeight: fallback,
      action: 'start',
      increment: 0,
      message: fallback === null ? 'Enter your starting weight' : 'Starting weight',
    }
  }

  const last = counted[counted.length - 1]
  const lastW = workingWeight(last, equipment) ?? input.startWeight ?? 0
  const info = stallInfo(counted, equipment)
  const inc = incrementFor(equipment, step, info.everStalled)
  const rs = roundStep(equipment, step)

  // Reduced weeks: a % of your last full weight, no progression.
  if (mult < 1) {
    const w =
      equipment === 'assisted'
        ? roundTo(lastW + (1 - mult) * ((input.bodyweight ?? 60) - lastW), rs, 'ceil') // more assistance
        : roundTo(lastW * mult, rs)
    return { weight: w, baseWeight: lastW, action: 'hold', increment: 0, message: `${Math.round(mult * 100)}% of last weight (${lastW} kg)` }
  }

  if (hitTop(last, reps) && !input.noIncrease) {
    if (equipment === 'assisted') {
      if (lastW <= 0) return { weight: 0, baseWeight: 0, action: 'hold', increment: 0, message: 'Unassisted & top reps: add reps or a weight belt' }
      const w = Math.max(0, roundTo(lastW - inc, rs))
      return { weight: w, baseWeight: w, action: 'increase', increment: inc, message: `Top reps hit! −${inc} kg assistance` }
    }
    const w = Math.round((lastW + inc) * 100) / 100
    return { weight: w, baseWeight: w, action: 'increase', increment: inc, message: `Top reps hit! +${inc} kg` }
  }

  if (info.streak >= 3) {
    if (equipment === 'assisted') {
      const w = roundTo(lastW + step, rs)
      return { weight: w, baseWeight: w, action: 'deload', increment: -step, message: '3 sessions without progress: +1 step assistance and rebuild' }
    }
    const w = roundTo(lastW * 0.9, rs, 'floor')
    return { weight: w, baseWeight: w, action: 'deload', increment: w - lastW, message: '3 sessions without progress: drop 10% and rebuild' }
  }

  const top = topOfRange(reps)
  const msg = input.noIncrease ? 'No PR attempts today: same weight' : top ? `Same weight, aim for ${top} on every set` : 'Same weight, beat your reps'
  return { weight: lastW, baseWeight: lastW, action: 'hold', increment: 0, message: msg }
}

/** Epley estimated 1RM. */
export function epley(weight: number, reps: number): number {
  if (reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}
