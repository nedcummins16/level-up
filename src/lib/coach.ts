// Little nudges that keep you going: comeback quests and light-week suggestions.

import type { CheckIn, LifeEvent } from '../db/types'
import { addDays, mondayOf, type ISODate } from './dates'
import { hasActive } from './life'
import { getPhase } from './plan'

/** A rough week: low energy, bad sleep or very sore (1-5 check-in scales). */
export function roughWeek(c: CheckIn | undefined) {
  return !!c && (c.energy <= 2 || c.sleep <= 2 || c.soreness >= 4)
}

/**
 * Two rough check-ins in a row → suggest a light week (Life Happens > Run down)
 * before your body forces a week off.
 */
export function suggestLightWeek(checkins: CheckIn[], life: LifeEvent[], today: ISODate, dismissed: ISODate[], repeats: ISODate[] = []): boolean {
  const thisWeek = mondayOf(today)
  if (dismissed.includes(thisWeek)) return false
  if (!['foundation', 'build', 'push', 'repeat'].includes(getPhase(today, repeats).id)) return false
  if (hasActive(life, today, 'runDown') || hasActive(life, today, 'sickBelow') || hasActive(life, today, 'sickAbove')) return false
  const last = checkins.find((c) => c.weekStart === addDays(thisWeek, -7))
  const before = checkins.find((c) => c.weekStart === addDays(thisWeek, -14))
  return roughWeek(last) && roughWeek(before)
}
