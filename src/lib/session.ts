// Builds a concrete session (exercises, sets, targets, suggested weights) for a slot on a date.

import { CARDIO, EXERCISES, PROGRAM, SESSIONS, SORE_BACK_SWAPS, WARMUP } from '../config/program'
import type { Equipment, Prescription, RepTarget, StrengthSlot } from '../config/types'
import type { LifeEvent, LoggedExercise, Settings, WorkoutSession } from '../db/types'
import type { ISODate } from './dates'
import { adjustSets, dayMods, type DayMods } from './life'
import { getPhase, weekNumber } from './plan'
import { roundTo, suggest, type Performance, type Suggestion } from './progression'

export interface PlannedExercise {
  planEx: string
  ex: string
  name: string
  equipment: Equipment
  sets: number
  reps: RepTarget
  rest: number
  rampUp: boolean
  perSide: boolean
  timed: boolean
  cue?: string
  rir: string[]
  suggestion: Suggestion
  last: { date: ISODate; ex: LoggedExercise } | null
  swappedFrom?: string
}

export interface SessionPlan {
  slot: StrengthSlot
  name: string
  kind: 'gym' | 'beach'
  warmup: string[]
  exercises: PlannedExercise[]
  mods: DayMods
  reduced: boolean
  phaseName: string
  week: number
}

export interface SessionCtx {
  date: ISODate
  settings: Settings
  sessions: WorkoutSession[]
  life: LifeEvent[]
  bodyweight?: number | null
}

export function exName(id: string) {
  return EXERCISES[id]?.name ?? id
}

export function exInfo(id: string) {
  return EXERCISES[id] ?? { name: id, equipment: 'machine' as Equipment }
}

/** Plan exercise → what you'll actually do (week swap, permanent swap, sore back swap). */
export function resolveExercise(p: Prescription, week: number, settings: Pick<Settings, 'swaps'>, mods?: Pick<DayMods, 'swaps'>): string {
  let ex = p.ex
  if (p.weekSwap && p.weekSwap.weeks.includes(week)) ex = p.weekSwap.ex
  if (settings.swaps[ex]) ex = settings.swaps[ex]
  if (mods?.swaps[ex]) ex = mods.swaps[ex]
  return ex
}

export function toPerformance(s: WorkoutSession, e: LoggedExercise): Performance {
  return {
    date: s.date,
    sets: e.sets.filter((x) => x.done).map((x) => ({ weight: x.weight, reps: x.reps })),
    plannedSets: e.targetSets,
    reduced: s.reduced,
  }
}

/** All finished logs of an exercise, oldest first. */
export function exerciseLogs(sessions: WorkoutSession[], exId: string, beforeDate?: ISODate, excludeId?: number) {
  return sessions
    .filter((s) => s.status === 'done' && s.id !== excludeId && (!beforeDate || s.date <= beforeDate))
    .sort((a, b) => (a.date === b.date ? a.startedAt - b.startedAt : a.date < b.date ? -1 : 1))
    .flatMap((s) => s.exercises.filter((e) => e.ex === exId && e.sets.some((x) => x.done)).map((e) => ({ session: s, ex: e })))
}

export function rirTargets(phaseId: string, equipment: Equipment, sets: number, mods: Pick<DayMods, 'rirOverride'>, date: ISODate, repeats: ISODate[]): string[] {
  const phase = getPhase(date, repeats)
  if (mods.rirOverride) return Array(sets).fill(mods.rirOverride)
  if (equipment === 'plyo') return Array(sets).fill('Fast & crisp')
  const out = Array(sets).fill(phase.rir === '-' ? 'RIR 2' : phase.rir)
  const light = ['machine', 'dumbbell', 'bodyweight', 'assisted', 'timed'].includes(equipment)
  if (phaseId !== 'beach') {
    if (light && phase.lastSetRirLight) out[sets - 1] = phase.lastSetRirLight
    else if (phase.lastSetRir) out[sets - 1] = phase.lastSetRir
  }
  return out
}

export function planExercise(p: Prescription, ctx: SessionCtx, mods: DayMods, exOverride?: string, excludeId?: number): PlannedExercise {
  const week = weekNumber(ctx.date)
  const ex = exOverride ?? resolveExercise(p, week, ctx.settings, mods)
  const info = exInfo(ex)
  const sets = adjustSets(p.sets, week === 1, mods)
  const logs = exerciseLogs(ctx.sessions, ex, ctx.date, excludeId)
  const history = logs.map((l) => toPerformance(l.session, l.ex))
  const suggestion = suggest({
    equipment: info.equipment,
    reps: p.reps,
    history,
    machineStep: ctx.settings.machineSteps[ex] ?? PROGRAM.defaultMachineStep,
    startWeight: ctx.settings.startWeights[ex] ?? null,
    multiplier: mods.multiplier,
    noIncrease: mods.noPR,
    bodyweight: ctx.bodyweight ?? PROGRAM.body.startKg,
  })
  const lastLog = logs[logs.length - 1]
  return {
    planEx: p.ex,
    ex,
    name: info.name,
    equipment: info.equipment,
    sets,
    reps: p.reps,
    rest: p.rest,
    rampUp: !!p.rampUp,
    perSide: !!info.perSide,
    timed: info.equipment === 'timed',
    cue: info.cue,
    rir: rirTargets(getPhase(ctx.date, ctx.settings.repeats).id, info.equipment, sets, mods, ctx.date, ctx.settings.repeats),
    suggestion,
    last: lastLog ? { date: lastLog.session.date, ex: lastLog.ex } : null,
    swappedFrom: ex !== p.ex ? p.ex : undefined,
  }
}

export function buildSession(slot: StrengthSlot, ctx: SessionCtx): SessionPlan {
  const t = SESSIONS[slot]
  const mods = dayMods(ctx.life, ctx.date, ctx.settings.repeats, SORE_BACK_SWAPS)
  let presc = t.exercises
  if (mods.maxExercises) presc = presc.slice(0, mods.maxExercises)
  const exercises = presc.map((p) => planExercise(p, ctx, mods))
  return {
    slot,
    name: t.name,
    kind: t.kind,
    warmup: warmupSteps(slot, rampLift(exercises.find((e) => e.rampUp))),
    exercises,
    mods,
    reduced: mods.reduced,
    phaseName: getPhase(ctx.date, ctx.settings.repeats).name,
    week: weekNumber(ctx.date),
  }
}

export interface RampLift {
  name: string
  equipment: Equipment
  weight: number | null
}

export function rampUpText(p: RampLift): string {
  if (p.equipment === 'assisted') return `Ramp-up ${p.name}: 1 easy set x5 with extra assistance`
  const step = p.equipment === 'dumbbell' ? 2 : 2.5
  const parts = WARMUP.rampUp.map((r) => {
    if (p.weight === null) return `~${Math.round(r.pct * 100)}% x${r.reps}`
    return `${Math.max(p.equipment.startsWith('barbell') ? 20 : 0, roundTo(p.weight * r.pct, step))} kg x${r.reps}`
  })
  return `Ramp-up ${p.name}: ${parts.join(', ')}`
}

export function warmupSteps(slot: StrengthSlot, firstLift: RampLift | null): string[] {
  const t = SESSIONS[slot]
  const steps =
    t.warmup === 'beach'
      ? [...WARMUP.beach, ...WARMUP.after]
      : [...WARMUP.common, ...(t.warmup === 'lower' ? WARMUP.lower : WARMUP.upper), ...WARMUP.after]
  if (firstLift && t.kind === 'gym') steps.push(rampUpText(firstLift))
  return steps
}

function rampLift(e: PlannedExercise | undefined): RampLift | null {
  return e ? { name: e.name, equipment: e.equipment, weight: e.suggestion.weight } : null
}

export function newStrengthSession(plan: SessionPlan, date: ISODate, replaces?: StrengthSlot): WorkoutSession {
  return {
    date,
    slot: plan.slot,
    replaces,
    status: 'active',
    startedAt: Date.now(),
    modifiers: plan.mods.types,
    multiplier: plan.mods.multiplier,
    reduced: plan.reduced,
    exercises: plan.exercises.map(toLogged),
    warmupDone: [],
  }
}

export function toLogged(e: PlannedExercise): LoggedExercise {
  const weighted = !['plyo', 'timed', 'bodyweight'].includes(e.equipment)
  return {
    planEx: e.planEx,
    ex: e.ex,
    name: e.name,
    equipment: e.equipment,
    reps: e.reps,
    rest: e.rest,
    targetSets: e.sets,
    suggested: e.suggestion.weight,
    hint: e.suggestion.message,
    rirTargets: e.rir,
    perSide: e.perSide,
    rampUp: e.rampUp,
    sets: Array.from({ length: e.sets }, () => ({
      weight: weighted ? e.suggestion.weight : e.equipment === 'bodyweight' ? e.suggestion.weight : null,
      reps: null,
      rir: null,
      done: false,
    })),
  }
}

export function repsLabel(reps: RepTarget, perSide = false, timed = false) {
  const unit = timed ? 's' : ''
  const side = perSide ? '/side' : ''
  if (reps === 'max-2') return `max−2${side}`
  return reps[0] === reps[1] ? `${reps[0]}${unit}${side}` : `${reps[0]}-${reps[1]}${unit}${side}`
}

export function restLabel(sec: number) {
  return sec >= 60 ? `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}` : `${sec}s`
}

/** What to prefill in an empty reps box: last time's reps, else the bottom of the range. */
export function defaultReps(e: LoggedExercise, setIdx: number, last: LoggedExercise | null): number | null {
  if (e.reps === 'max-2') return last?.sets[setIdx]?.reps ?? null
  const fromLast = last?.sets[setIdx]?.reps
  if (fromLast && fromLast < e.reps[1]) return Math.min(e.reps[1], fromLast + 1)
  return e.reps[0] === e.reps[1] ? e.reps[0] : e.reps[1] === fromLast ? e.reps[1] : e.reps[0]
}

export const CARDIO_DEFAULT_MIN = CARDIO.minutes[0]
