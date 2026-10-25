import type { ISODate } from '../lib/dates'

/** How an exercise is loaded. Drives progression increments and what you log. */
export type Equipment =
  | 'barbell-lower' // +5 kg until first stall, then +2.5
  | 'barbell-upper' // +2.5 kg
  | 'dumbbell' // +2 kg
  | 'machine' // +1 machine step (cables count as machines)
  | 'assisted' // pull-up: log assistance kg, progression = less assistance
  | 'bodyweight' // reps only, optional extra load (e.g. backpack)
  | 'plyo' // jumps: quality reps, no weight
  | 'timed' // holds in seconds

export interface ExerciseInfo {
  name: string
  equipment: Equipment
  perSide?: boolean
  /** Feeds STR stat + test "best sets". */
  lift?: 'squat' | 'bench' | 'deadlift' | 'pullup'
  /** Swaps offered when a machine is busy (exercise ids). */
  alts?: string[]
  cue?: string
}

export type RepTarget = [number, number] | 'max-2'

export interface Prescription {
  ex: string
  sets: number
  reps: RepTarget
  /** Rest in seconds. */
  rest: number
  /** Ramp-up sets (50% x5, 75% x3) go before this lift. */
  rampUp?: boolean
  /** Use a different exercise in some program weeks (e.g. goblet squat weeks 1-2). */
  weekSwap?: { weeks: number[]; ex: string }
}

export type StrengthSlot = 'LA' | 'UA' | 'LB' | 'UB' | 'COMBO' | 'BA' | 'BB' | PreseasonSlot
/** Exam pre-season gym sessions (26 Oct - 15 Nov 2026). */
export type PreseasonSlot = 'PA' | 'PB'
export type CardioSlot = 'cardio' | 'tennis' | 'intervals' | 'sprints' | 'beachRun'
export type Slot = StrengthSlot | CardioSlot | 'walk'

export interface SessionTemplate {
  name: string
  short: string
  kind: 'gym' | 'beach'
  /** Lower-body days can't be on back-to-back days. */
  lower: boolean
  warmup: 'lower' | 'upper' | 'beach' | 'full'
  exercises: Prescription[]
}

export interface PhaseDef {
  id: PhaseId
  name: string
  start: ISODate
  end: ISODate
  /** Shown as the effort target for each set. */
  rir: string
  lastSetRir?: string
  /** Last set RIR for machines, dumbbells and bodyweight only (never squat/deadlift). */
  lastSetRirLight?: string
  blurb: string
}

export type PhaseId = 'prestart' | 'exam' | 'foundation' | 'build' | 'beach' | 'push' | 'test' | 'repeat' | 'post'

export type TestItemId =
  | 'bodyweight'
  | 'arm'
  | 'chest'
  | 'waist'
  | 'photos'
  | 'pushups'
  | 'pullups'
  | 'toeTouch'
  | 'jumpReach'
  | 'fiveK'
  | 'restingHr'
  | 'lifts'

export interface TestDay {
  id: string
  date: ISODate
  boss: string
  bossEmoji: string
  items: TestItemId[]
}

/** Muscles (and joints) shown on the body map. */
export type MuscleId =
  | 'chest'
  | 'frontDelts'
  | 'sideDelts'
  | 'rearDelts'
  | 'traps'
  | 'upperBack'
  | 'lats'
  | 'lowerBack'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'hipFlexors'
  | 'quads'
  | 'adductors'
  | 'glutes'
  | 'hamstrings'
  | 'calves'
  | 'shins'
  // joints / "you shouldn't feel it here" spots
  | 'neck'
  | 'knees'
  | 'wrists'
  | 'elbows'
  | 'shoulderJoint'

export interface FeelCard {
  primary: MuscleId[]
  secondary?: MuscleId[]
  /** Where you should feel it working. */
  feel: string
  /** Feeling it somewhere else? What it means + the fix. */
  wrong: { at: MuscleId; means: string; fix: string }[]
}

export interface Exam {
  id: string
  name: string
  date: ISODate
  /** "HH:MM", Melbourne time. */
  start: string
  end: string
  boss: string
  bossEmoji: string
}

/** One thing on a pre-season day. */
export type PreseasonItem =
  | { kind: 'exam'; exam: string }
  | { kind: 'session'; slot: PreseasonSlot; label?: string }
  | { kind: 'walk'; label: string; optional?: boolean }
  | { kind: 'mobility' }
  /** Tennis if it's on this week (same toggle as the main plan), otherwise rest. */
  | { kind: 'tennis' }
  | { kind: 'rest'; label?: string }
  | { kind: 'task'; id: string; label: string }

export interface PreseasonDay {
  items: PreseasonItem[]
  note?: string
}

/** Pre-season exercise weight → week-1 starting weight of a main-plan exercise. */
export interface Handover {
  from: string
  to: string
  /** Multiply the pre-season weight (default 1). */
  factor?: number
  /** Never suggest less than this (e.g. the empty 20 kg bar). */
  min?: number
  /** Round DOWN to this step. */
  step?: number
  /** Shown next to the number, e.g. "rough guide". */
  note?: string
}
