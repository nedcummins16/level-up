// Skill tree points, plate calculator, PR targets and strength trend.

import { FREEZE, SKILLS } from '../config/game'
import type { Equipment } from '../config/types'
import type { WorkoutSession } from '../db/types'
import { addDays, diffDays, type ISODate } from './dates'
import { epley } from './progression'
import type { Best } from './records'

export const skillPoints = (level: number) => Math.max(0, level - 1)

export function spentPoints(skills: string[]) {
  return skills.reduce((a, id) => a + (SKILLS.find((s) => s.id === id)?.cost ?? 0), 0)
}

/** Skills that actually apply: known, with their prerequisites, and affordable at this level. */
export function activeSkills(skills: string[], level: number): Set<string> {
  const out = new Set<string>()
  let budget = skillPoints(level)
  for (const s of SKILLS) {
    if (!skills.includes(s.id)) continue
    if (!s.requires.every((r) => out.has(r))) continue
    if (s.cost > budget) continue
    budget -= s.cost
    out.add(s.id)
  }
  return out
}

export function canUnlock(id: string, skills: string[], level: number) {
  const s = SKILLS.find((x) => x.id === id)
  if (!s || skills.includes(id)) return false
  return s.requires.every((r) => skills.includes(r)) && spentPoints(skills) + s.cost <= skillPoints(level)
}

export function maxFreezes(skills: Set<string>) {
  return FREEZE.max + (skills.has('freeze3') ? 1 : 0)
}

// ---------------------------------------------------------------- Plate calculator

export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]

/** Plates per side for a total barbell weight (Olympic 20 kg bar by default). */
export function platesPerSide(total: number, bar = 20, plates = PLATES): { perSide: number[]; leftover: number } | null {
  if (total < bar) return null
  let side = Math.round(((total - bar) / 2) * 100) / 100
  const perSide: number[] = []
  for (const p of plates) {
    while (side + 1e-9 >= p) {
      perSide.push(p)
      side = Math.round((side - p) * 100) / 100
    }
  }
  return { perSide, leftover: side }
}

// ---------------------------------------------------------------- PR predictor

/** What would count as a PR today, given your best ever. */
export function prTarget(best: Best, equipment: Equipment, weight: number | null): string | null {
  if (best.sessions === 0) return null
  if (equipment === 'plyo') return null
  if (equipment === 'bodyweight' || equipment === 'timed') return `${best.maxReps + 1}+ ${equipment === 'timed' ? 'seconds' : 'reps'}`
  if (best.maxLoad === null) return null
  const toKg = (load: number) => (equipment === 'assisted' ? -load : load)
  const top = toKg(best.maxLoad)
  const parts: string[] = []
  if (weight !== null) {
    const load = equipment === 'assisted' ? -weight : weight
    const reps = best.repsAt.get(load)
    if (load > best.maxLoad) parts.push(`any reps at ${weight} kg${equipment === 'assisted' ? ' assist' : ''}`)
    else if (reps !== undefined) parts.push(`${weight} kg × ${reps + 1}+`)
  }
  parts.push(equipment === 'assisted' ? `less than ${top} kg assist` : `more than ${top} kg`)
  return parts.join(' or ')
}

// ---------------------------------------------------------------- Strength trend

/** Estimated-1RM change in kg per week over the last 4 weeks (least squares). Needs 3+ sessions. */
export function e1rmTrend(sessions: WorkoutSession[], ex: string, today: ISODate): number | null {
  const from = addDays(today, -28)
  const pts: { x: number; y: number }[] = []
  for (const s of sessions) {
    if (s.status !== 'done' || s.date < from || s.date > today || s.reduced) continue
    for (const e of s.exercises) {
      if (e.ex !== ex) continue
      const best = Math.max(0, ...e.sets.filter((x) => x.done && x.reps && x.weight).map((x) => epley(x.weight!, x.reps!)))
      if (best > 0) pts.push({ x: diffDays(from, s.date) / 7, y: best })
    }
  }
  if (pts.length < 3) return null
  const n = pts.length
  const mx = pts.reduce((a, p) => a + p.x, 0) / n
  const my = pts.reduce((a, p) => a + p.y, 0) / n
  const den = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0)
  if (den === 0) return null
  const slope = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / den
  return Math.round(slope * 10) / 10
}
