// Life Happens: the options, how long each lasts, and what they change on a given day.

import { PROGRAM } from '../config/program'
import type { LifeEvent, LifeType } from '../db/types'
import { addDays, diffDays, mondayOf, type ISODate } from './dates'
import { getPhase, weekNumber } from './plan'

export interface LifeOption {
  type: LifeType
  emoji: string
  title: string
  desc: string
  scope: 'day' | 'week' | 'ongoing' | 'twoWeeks'
  sick?: boolean
}

export const LIFE_OPTIONS: LifeOption[] = [
  { type: 'missed', emoji: '📅', title: "Can't train today", desc: 'Shift the sequence (LA > UA > LB > UB). Wed cardio gets dropped if needed. Never two lower days in a row, no doubling up.', scope: 'day' },
  { type: 'only30', emoji: '⏱️', title: 'Only 30 min', desc: 'Warm-up + first 3 exercises.', scope: 'day' },
  { type: 'busyWeek', emoji: '🗓️', title: 'Busy week', desc: 'Minimum 3 sessions: Lower A, Upper A, and a combo of the first 2 exercises of Lower B + Upper B.', scope: 'week' },
  { type: 'sickAbove', emoji: '🤧', title: 'Sick (above the neck)', desc: 'Runny nose, sore throat: half sets, RIR 4, no intervals. Lasts until you tap "I\'m better".', scope: 'ongoing', sick: true },
  { type: 'sickBelow', emoji: '🤒', title: 'Sick (below the neck)', desc: 'Chest, fever, stomach: rest. When you\'re back: 80% weights for a week.', scope: 'ongoing', sick: true },
  { type: 'badSleep', emoji: '😴', title: 'Bad sleep', desc: 'Minus 1 set per exercise. No PR attempts today.', scope: 'day' },
  { type: 'soreBack', emoji: '🦴', title: 'Sore back', desc: 'Squat → leg press, deadlifts → back extension. Lasts until you tap "I\'m better".', scope: 'ongoing' },
  { type: 'missedWeek', emoji: '🕳️', title: 'Missed a whole week', desc: '90% weights this week, 95% next week, then full. Rebuild over 2 weeks.', scope: 'twoWeeks' },
  { type: 'runDown', emoji: '🔋', title: 'Run down', desc: 'Light week: half sets for the rest of this week.', scope: 'week' },
  { type: 'unmotivated', emoji: '🫠', title: 'Unmotivated', desc: 'Just do the warm-up + first exercise. That counts as a session.', scope: 'day' },
  { type: 'noGym', emoji: '🏖️', title: 'No gym access', desc: "Switch today's gym session to Beach A/B (bodyweight + backpack).", scope: 'day' },
]

export function lifeOption(t: LifeType) {
  return LIFE_OPTIONS.find((o) => o.type === t)
}

/** Build the event record for an option chosen on `today`. */
export function makeLifeEvent(type: LifeType, today: ISODate): Omit<LifeEvent, 'id'> {
  const opt = lifeOption(type)
  const base = { type, start: today, createdAt: Date.now() }
  switch (opt?.scope) {
    case 'week':
      return { ...base, end: addDays(mondayOf(today), 6) }
    case 'ongoing':
      return { ...base, end: null }
    case 'twoWeeks':
      return { ...base, end: addDays(today, 13) }
    default:
      return { ...base, end: today }
  }
}

export function isActive(e: LifeEvent, d: ISODate) {
  return d >= e.start && (e.end === null || d <= e.end)
}

export function activeEvents(events: LifeEvent[], d: ISODate) {
  return events.filter((e) => isActive(e, d))
}

export function hasActive(events: LifeEvent[], d: ISODate, type: LifeType) {
  return events.some((e) => e.type === type && isActive(e, d))
}

/** Ongoing events (sick / sore back) that you can end with "I'm better". */
export function ongoingEvents(events: LifeEvent[], d: ISODate) {
  return events.filter((e) => e.end === null && e.start <= d)
}

export interface DayMods {
  types: LifeType[]
  multiplier: number
  multiplierReasons: string[]
  halfSets: boolean
  minusOneSet: boolean
  rirOverride: string | null
  maxExercises: number | null
  noPR: boolean
  swaps: Record<string, string>
  rest: boolean
  noIntervals: boolean
  noGym: boolean
  missed: boolean
  /** True when volume/intensity is reduced: such sessions don't drive progression. */
  reduced: boolean
  notes: string[]
}

export function dayMods(events: LifeEvent[], d: ISODate, repeats: ISODate[] = [], soreBackSwaps: Record<string, string> = {}): DayMods {
  const act = activeEvents(events, d)
  const has = (t: LifeType) => act.some((e) => e.type === t)
  const mods: DayMods = {
    types: [...new Set(act.map((e) => e.type))],
    multiplier: 1,
    multiplierReasons: [],
    halfSets: has('sickAbove') || has('runDown'),
    minusOneSet: has('badSleep'),
    rirOverride: has('sickAbove') ? 'RIR 4' : null,
    maxExercises: has('unmotivated') ? 1 : has('only30') ? 3 : null,
    noPR: has('badSleep'),
    swaps: has('soreBack') ? soreBackSwaps : {},
    rest: has('sickBelow'),
    noIntervals: has('sickAbove'),
    noGym: has('noGym'),
    missed: has('missed'),
    reduced: false,
    notes: [],
  }

  const apply = (m: number, why: string) => {
    if (m < mods.multiplier) mods.multiplier = m
    mods.multiplierReasons.push(why)
  }

  // Back from being sick below the neck: 80% for 7 days after "I'm better".
  for (const e of events) {
    if (e.type === 'sickBelow' && e.end !== null) {
      const since = diffDays(e.end, d)
      if (since >= 1 && since <= 7) apply(0.8, 'Back from sick: 80% weights this week')
    }
    if (e.type === 'missedWeek') {
      const since = diffDays(e.start, d)
      if (since >= 0 && since <= 6) apply(0.9, 'Rebuild week 1: 90% weights')
      else if (since >= 7 && since <= 13) apply(0.95, 'Rebuild week 2: 95% weights')
    }
  }

  // First part-week of Push (after the beach): 90% of your last weights.
  const phase = getPhase(d, repeats)
  if (phase.id === 'push' && d >= PROGRAM.push.start && weekNumber(d) < PROGRAM.push.fullFromWeek) {
    apply(PROGRAM.push.returnPercent, 'Back from the beach: 90% of last weights')
  }

  if (mods.halfSets) mods.notes.push(has('sickAbove') ? 'Sick: half sets, RIR 4' : 'Run down: light week, half sets')
  if (mods.minusOneSet) mods.notes.push('Bad sleep: 1 set less per exercise, no PR attempts')
  if (mods.maxExercises === 3) mods.notes.push('Only 30 min: warm-up + first 3 exercises')
  if (mods.maxExercises === 1) mods.notes.push('Unmotivated: warm-up + first exercise = session done ✅')
  if (has('soreBack')) mods.notes.push('Sore back: squats & deadlifts swapped')

  mods.reduced = mods.multiplier < 1 || mods.halfSets || mods.minusOneSet || mods.rirOverride !== null
  return mods
}

/** Sets for an exercise after week-1 rule and Life Happens. */
export function adjustSets(baseSets: number, week1: boolean, mods: Pick<DayMods, 'halfSets' | 'minusOneSet'>) {
  let sets = week1 ? Math.min(baseSets, PROGRAM.week1Sets) : baseSets
  if (mods.halfSets) sets = Math.ceil(sets / 2)
  if (mods.minusOneSet) sets = sets - 1
  return Math.max(1, sets)
}
