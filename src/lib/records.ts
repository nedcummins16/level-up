// Personal records: "more weight, or more reps at the same weight, than ever before".

import type { Equipment } from '../config/types'
import type { WorkoutSession } from '../db/types'

export interface Best {
  /** Heaviest weight ever (for assisted: least assistance, stored as negative). */
  maxLoad: number | null
  /** Most reps ever done at each load. */
  repsAt: Map<number, number>
  /** Most reps ever (bodyweight / timed). */
  maxReps: number
  sessions: number
}

const loadOf = (w: number | null, equipment: Equipment) => (equipment === 'assisted' ? -(w ?? 0) : (w ?? 0))

/** Best performance for an exercise across finished sessions (optionally excluding one). */
export function bestFor(sessions: WorkoutSession[], ex: string, equipment: Equipment, exclude?: number, beforeTime?: number): Best {
  const best: Best = { maxLoad: null, repsAt: new Map(), maxReps: 0, sessions: 0 }
  for (const s of sessions) {
    if (s.id === exclude) continue
    for (const e of s.exercises) {
      if (e.ex !== ex) continue
      let counted = false
      for (const set of e.sets) {
        if (!set.done || !set.reps) continue
        if (beforeTime !== undefined && (set.doneAt ?? s.startedAt) >= beforeTime) continue
        counted = true
        const load = loadOf(set.weight, equipment)
        best.maxLoad = best.maxLoad === null ? load : Math.max(best.maxLoad, load)
        best.repsAt.set(load, Math.max(best.repsAt.get(load) ?? 0, set.reps))
        best.maxReps = Math.max(best.maxReps, set.reps)
      }
      if (counted) best.sessions++
    }
  }
  return best
}

export function isPR(best: Best, set: { weight: number | null; reps: number | null }, equipment: Equipment): boolean {
  if (!set.reps || best.sessions === 0) return false // first time = baseline, not a PR
  if (equipment === 'plyo') return false
  if (equipment === 'bodyweight' || equipment === 'timed') {
    const load = set.weight ?? 0
    if (load > 0) return load > (best.maxLoad ?? 0) || set.reps > (best.repsAt.get(load) ?? 0)
    return set.reps > best.maxReps
  }
  const load = loadOf(set.weight, equipment)
  if (best.maxLoad === null) return false
  if (load > best.maxLoad) return true
  const prev = best.repsAt.get(load)
  return prev !== undefined && set.reps > prev
}

export interface PREvent {
  sessionId: number
  date: string
  ex: string
  name: string
  weight: number | null
  reps: number
}

/** Walk all finished sessions in time order and list PRs (max one per exercise per session). */
export function allPRs(sessions: WorkoutSession[]): PREvent[] {
  const done = sessions.filter((s) => s.status === 'done').sort((a, b) => (a.date === b.date ? a.startedAt - b.startedAt : a.date < b.date ? -1 : 1))
  const bests = new Map<string, Best>()
  const out: PREvent[] = []
  for (const s of done) {
    for (const e of s.exercises) {
      const sets = e.sets.filter((x) => x.done && x.reps)
      if (!sets.length) continue
      const b = bests.get(e.ex) ?? { maxLoad: null, repsAt: new Map(), maxReps: 0, sessions: 0 }
      const pr = sets.find((set) => isPR(b, set, e.equipment))
      if (pr) out.push({ sessionId: s.id!, date: s.date, ex: e.ex, name: e.name, weight: pr.weight, reps: pr.reps! })
      for (const set of sets) {
        const load = loadOf(set.weight, e.equipment)
        b.maxLoad = b.maxLoad === null ? load : Math.max(b.maxLoad, load)
        b.repsAt.set(load, Math.max(b.repsAt.get(load) ?? 0, set.reps!))
        b.maxReps = Math.max(b.maxReps, set.reps!)
      }
      b.sessions++
      bests.set(e.ex, b)
    }
  }
  return out
}
