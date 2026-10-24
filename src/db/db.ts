import Dexie, { type EntityTable } from 'dexie'
import { PROGRAM } from '../config/program'
import type { CheckIn, DailyLog, LifeEvent, Measurement, Photo, Settings, TestResult, WorkoutSession } from './types'

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
  }
}

export const db = new LevelUpDB()

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
  }
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('settings')
  if (s) return { ...defaultSettings(), ...s }
  const fresh = defaultSettings()
  await db.settings.put(fresh)
  return fresh
}

export async function updateSettings(patch: Partial<Settings>) {
  const s = await getSettings()
  await db.settings.put({ ...s, ...patch, id: 'settings' })
}
