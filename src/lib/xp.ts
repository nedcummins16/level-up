import { XP } from '../config/game'
import type { WorkoutSession } from '../db/types'
import { mondayOf } from './dates'
import { isStrengthSlot } from './schedule'

/** 1-based order of a strength session within its week (by date, then start time). */
export function strengthRank(session: WorkoutSession, sessions: WorkoutSession[]): number {
  const wk = mondayOf(session.date)
  const same = sessions
    .filter((s) => isStrengthSlot(s.slot) && mondayOf(s.date) === wk)
    .sort((a, b) => (a.date === b.date ? a.startedAt - b.startedAt : a.date < b.date ? -1 : 1))
  const i = same.findIndex((s) => s.id === session.id)
  return i < 0 ? same.length + 1 : i + 1
}

/** Gym XP caps at the plan's 4 strength sessions a week: extra sessions earn nothing. */
export function earnsStrengthXP(session: WorkoutSession, sessions: WorkoutSession[]) {
  return strengthRank(session, sessions) <= XP.strengthCapPerWeek
}
