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

export type StrengthSlot = 'LA' | 'UA' | 'LB' | 'UB' | 'COMBO' | 'BA' | 'BB'
export type CardioSlot = 'cardio' | 'tennis' | 'intervals' | 'sprints' | 'beachRun'
export type Slot = StrengthSlot | CardioSlot

export interface SessionTemplate {
  name: string
  short: string
  kind: 'gym' | 'beach'
  /** Lower-body days can't be on back-to-back days. */
  lower: boolean
  warmup: 'lower' | 'upper' | 'beach'
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

export type PhaseId = 'prestart' | 'foundation' | 'build' | 'beach' | 'push' | 'test' | 'repeat' | 'post'

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
