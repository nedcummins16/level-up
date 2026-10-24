import Dexie, { type EntityTable } from 'dexie'
import { PROGRAM } from '../config/program'
import type { Appointment, CheckIn, DailyLog, LifeEvent, Measurement, Photo, Settings, TestResult, WorkoutSession } from './types'

// Schema versioning: NEVER edit an existing version's stores. To change the schema,
// add `db.version(N + 1).stores({...}).upgrade(tx => ...)` below. Dexie migrates the
// data already on the phone, so it survives app updates.
export class LevelUpDB extends Dexie {
  settings!: EntityTable<Settings, 'id'>
  sessions!: EntityTable<WorkoutSession, 'id'>
  life!: EntityTable<LifeEvent, 'id'>
  daily!: EntityTable<DailyLog, 'date'>
  checkins!: EntityTable<CheckIn, 'weekStart'>
  tests!: EntityTable<TestResult, 'id'>
  measurements!: EntityTable<Measurement, 'id'>
  photos!: EntityTable<Photo, 'id'>
  appointments!: EntityTable<Appointment, 'date'>

  constructor(name = 'level-up') {
    super(name)
    this.version(1).stores({
      settings: 'id',
      sessions: '++id, date, slot, status',
      life: '++id, type, start',
      daily: 'date',
      checkins: 'weekStart',
      tests: 'id, date',
      measurements: '++id, date',
      photos: '++id, date',
    })
    // v2: when + where you plan to train each day (set at the Sunday check-in).
    this.version(2).stores({
      appointments: 'date',
    })
  }
}

export const db = new LevelUpDB()

/** Default training time per weekday (1 = Mon). Tennis is at 1pm on Saturday. */
export const DEFAULT_TIMES: Record<string, string> = { '1': '16:00', '2': '16:00', '3': '16:00', '4': '16:00', '5': '16:00', '6': '13:00', '7': '10:00' }

export function defaultSettings(): Settings {
  return {
    id: 'settings',
    createdAt: Date.now(),
    persistRequested: false,
    tennisOff: [],
    swaps: {},
    trainingDays: { ...PROGRAM.trainingDays },
    machineSteps: {},
    startWeights: {},
    christmasMove: null,
    soundOn: true,
    themeId: 'arcade',
    cosmetics: {},
    titleLevel: null,
    prestartDone: [],
    timeTravel: null,
    lastBackupAt: null,
    installDismissed: false,
    repeats: [],
    dunk: false,
    seenLevel: 1,
    seenAchievements: [],
    openedChests: [],
    seenResults: [],
    heroName: 'Hero',
    defaultTimes: { ...DEFAULT_TIMES },
    places: { gym: 'Gym', cardio: '', tennis: 'Tennis courts', beach: 'Beach' },
    lightDismissed: [],
  }
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('settings')
  if (s) return { ...defaultSettings(), ...s }
  const fresh = defaultSettings()
  await db.settings.put(fresh)
  return fresh
}

/** Read-modify-write inside a transaction, so two quick updates can't overwrite each other. */
export async function updateSettings(patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) {
  await db.transaction('rw', db.settings, async () => {
    const s = { ...defaultSettings(), ...(await db.settings.get('settings')) }
    const p = typeof patch === 'function' ? patch(s) : patch
    await db.settings.put({ ...s, ...p, id: 'settings' })
  })
}
