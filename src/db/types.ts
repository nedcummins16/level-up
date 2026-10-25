import type { Equipment, RepTarget, Slot, StrengthSlot } from '../config/types'
import type { ISODate } from '../lib/dates'

export interface Settings {
  id: 'settings'
  createdAt: number
  persistRequested: boolean
  /** Monday dates of weeks where tennis is OFF (intervals instead). */
  tennisOff: ISODate[]
  /** Permanent exercise swaps: original exercise id -> replacement id. */
  swaps: Record<string, string>
  trainingDays: Record<'LA' | 'UA' | 'LB' | 'UB', number>
  /** Per-exercise machine step (kg). */
  machineSteps: Record<string, number>
  /** Week-1 starting weights you enter (kg). */
  startWeights: Record<string, number>
  christmasMove: 'move' | 'keep' | null
  soundOn: boolean
  themeId: string
  /** Equipped cosmetics by slot. */
  cosmetics: Record<string, string>
  titleLevel: number | null
  prestartDone: string[]
  timeTravel: ISODate | null
  lastBackupAt: number | null
  installDismissed: boolean
  /** Monday dates for "Repeat Push" cycles after the plan. */
  repeats: ISODate[]
  dunk: boolean
  /** Game UI bookkeeping so celebrations fire once. */
  seenLevel: number
  seenAchievements: string[]
  openedChests: ISODate[]
  seenResults: ISODate[]
  heroName: string
  /** Default session start time per weekday "1".."7" → "HH:MM". */
  defaultTimes: Record<string, string>
  /** Default place per kind of session. */
  places: { gym: string; cardio: string; tennis: string; beach: string }
  /** Weeks where you said "no thanks" to the light-week suggestion. */
  lightDismissed: ISODate[]
  /** Last physique / dunk milestone you've been shown (so celebrations fire once). */
  seenBuild: { bulk: number; str: number } | null
  seenDunk: string[]
}

/** When and where you'll train on a date (implementation intention). */
export interface Appointment {
  date: ISODate
  time: string // "HH:MM"
  place: string
}

export interface LoggedSet {
  weight: number | null
  reps: number | null
  rir: number | null
  done: boolean
  doneAt?: number
}

export interface LoggedExercise {
  /** Exercise id from the plan (before swaps). */
  planEx: string
  /** Exercise actually done (after swaps). */
  ex: string
  name: string
  equipment: Equipment
  reps: RepTarget
  rest: number
  targetSets: number
  suggested: number | null
  /** Progression hint shown with the suggestion. */
  hint?: string
  /** Effort target per set, e.g. ["RIR 2", "RIR 2", "RIR 1"]. */
  rirTargets?: string[]
  perSide?: boolean
  rampUp?: boolean
  sets: LoggedSet[]
}

export interface WorkoutSession {
  id?: number
  date: ISODate
  slot: Slot
  /** When a session stands in for another (e.g. Beach A for Lower A on a no-gym day). */
  replaces?: StrengthSlot
  status: 'active' | 'done'
  startedAt: number
  finishedAt?: number
  /** Life Happens modifiers active for this session. */
  modifiers: string[]
  /** Weight multiplier applied (1 = full). */
  multiplier: number
  /** True when volume/intensity was reduced: excluded from progression decisions. */
  reduced: boolean
  exercises: LoggedExercise[]
  warmupDone: string[]
  /** Cardio-style sessions. */
  minutes?: number
  distanceKm?: number
  label?: string
  notes?: string
}

export type LifeType =
  | 'missed'
  | 'only30'
  | 'busyWeek'
  | 'sickAbove'
  | 'sickBelow'
  | 'badSleep'
  | 'soreBack'
  | 'missedWeek'
  | 'runDown'
  | 'unmotivated'
  | 'noGym'
  | 'christmas'

export interface LifeEvent {
  id?: number
  type: LifeType
  start: ISODate
  /** Inclusive. null = ongoing until you tap "I'm better". */
  end: ISODate | null
  createdAt: number
}

export interface DailyLog {
  date: ISODate
  weight?: number | null
  mobility: string[]
  mobilityDone: boolean
  protein?: boolean | null
  steps?: boolean | null
  smoothie?: boolean | null
  /** Meals/snacks ticked off today (ids from FOOD.slots). */
  meals?: string[]
  /** Gym bag packed (stored on the day you'll train). */
  bag?: boolean
  /** Optional jump check: standing reach and best jump touch height (cm). */
  standReach?: number | null
  jumpTouch?: number | null
}

export interface CheckIn {
  weekStart: ISODate
  date: ISODate
  avgWeight: number | null
  sessionsDone: number
  sessionsPlanned: number
  energy: number
  sleep: number
  soreness: number
  garminSleep: number | null
  restingHr: number | null
  notes: string
  createdAt: number
}

export interface TestResult {
  id: string // test day id
  date: ISODate
  results: Partial<Record<string, number>>
  /** For jump reach we keep the raw inputs too. */
  raw?: Record<string, number>
  completedAt: number | null
}

export interface Measurement {
  id?: number
  date: ISODate
  arm?: number | null
  chest?: number | null
  waist?: number | null
}

export interface Photo {
  id?: number
  date: ISODate
  blob: Blob
  width: number
  height: number
  label?: string
}
