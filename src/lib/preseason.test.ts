import { describe, expect, it } from 'vitest'
import { PRESEASON_XP } from '../config/game'
import { PRESEASON, PROGRAM } from '../config/program'
import { defaultSettings } from '../db/db'
import type { LoggedExercise, Settings, WorkoutSession } from '../db/types'
import { addDays, rangeDays } from './dates'
import { computeGame } from './game'
import { getPhase, type PlanSettings } from './plan'
import {
  applyHandover,
  gymBlockedBy,
  gymCheck,
  handoverFromSession,
  preseasonDay,
  preseasonStartWeights,
  preseasonXP,
} from './preseason'
import { planWeek } from './schedule'
import { buildSession } from './session'

let id = 1
const ex = (exId: string, equipment: LoggedExercise['equipment'], weight: number | null, reps = 10, sets = 2): LoggedExercise => ({
  planEx: exId,
  ex: exId,
  name: exId,
  equipment,
  reps: [10, 10],
  rest: 90,
  targetSets: sets,
  suggested: null,
  sets: Array.from({ length: sets }, () => ({ weight, reps, rir: null, done: true })),
})

const session = (date: string, slot: WorkoutSession['slot'], exercises: LoggedExercise[] = []): WorkoutSession => ({
  id: id++,
  date,
  slot,
  status: 'done',
  startedAt: id,
  modifiers: [],
  multiplier: 1,
  reduced: false,
  warmupDone: [],
  exercises,
})

const preA = (date: string, kg = { goblet: 16, dbBench: 14, pulldown: 40, dbRdl: 16, row: 35 }) =>
  session(date, 'PA', [
    ex('gobletSquat', 'dumbbell', kg.goblet),
    ex('dbBench', 'dumbbell', kg.dbBench),
    ex('latPulldown', 'machine', kg.pulldown),
    ex('dbRdl', 'dumbbell', kg.dbRdl),
    ex('seatedCableRow', 'machine', kg.row),
    ex('deadBug', 'bodyweight', null, 8),
  ])

const preB = (date: string) =>
  session(date, 'PB', [
    ex('legPress', 'machine', 80),
    ex('inclineDbPress', 'dumbbell', 12),
    ex('pullUp', 'assisted', 30, 7),
    ex('hipThrust', 'barbell-lower', 40),
    ex('facePull', 'machine', 15, 12),
    ex('sidePlank', 'timed', null, 20),
  ])

// ---------------------------------------------------------------------------
describe('exam-day gym rule', () => {
  const blocked = ['2026-10-26', '2026-10-27', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-11', '2026-11-12']

  it('blocks exactly the exam days and the day before each one', () => {
    const all = rangeDays(PRESEASON.start, PRESEASON.end)
    expect(all.filter((d) => gymBlockedBy(d) !== null)).toEqual(blocked)
  })

  it('says which exam blocks the day', () => {
    expect(gymBlockedBy('2026-10-26')?.id).toBe('english') // day before
    expect(gymBlockedBy('2026-10-27')?.id).toBe('english') // exam day
    expect(gymBlockedBy('2026-11-04')?.id).toBe('vet') // VET today (and Methods 1 tomorrow)
    expect(gymBlockedBy('2026-11-05')?.id).toBe('methods1')
    expect(gymBlockedBy('2026-11-06')?.id).toBe('methods2')
    expect(gymBlockedBy('2026-11-11')?.id).toBe('physics')
  })

  it('gives a friendly walk suggestion (never a hard block) on blocked days', () => {
    const today = gymCheck('2026-10-27')
    expect(today.ok).toBe(false)
    if (!today.ok) {
      expect(today.title).toBe("It's English day")
      expect(today.message).toMatch(/walk/i)
    }
    const eve = gymCheck('2026-11-11')
    expect(eve.ok).toBe(false)
    if (!eve.ok) {
      expect(eve.title).toBe('Physics is tomorrow')
      expect(eve.message).toMatch(/walk/i)
      expect(eve.message).toMatch(/9am/)
    }
  })

  it('lets you train on every other day', () => {
    for (const d of ['2026-10-28', '2026-10-30', '2026-11-02', '2026-11-07', '2026-11-09', '2026-11-10', '2026-11-13', '2026-11-15'])
      expect(gymCheck(d).ok).toBe(true)
    expect(gymCheck(PROGRAM.start).ok).toBe(true)
  })

  it('never schedules a pre-season session on a blocked day', () => {
    const sessionDays = rangeDays(PRESEASON.start, PRESEASON.end).filter((d) => preseasonDay(d)!.items.some((i) => i.kind === 'session'))
    expect(sessionDays).toEqual(['2026-10-28', '2026-10-30', '2026-11-02', '2026-11-07', '2026-11-09', '2026-11-13'])
    for (const d of sessionDays) expect(gymBlockedBy(d)).toBeNull()
  })

  it('every exam is on its own scheduled exam day', () => {
    for (const e of PRESEASON.exams) expect(preseasonDay(e.date)!.items).toContainEqual({ kind: 'exam', exam: e.id })
  })
})

// ---------------------------------------------------------------------------
describe('starting-weight handover', () => {
  it('maps every pre-season exercise to its main-plan exercise', () => {
    const w = { ...handoverFromSession(preA('2026-10-28')), ...handoverFromSession(preB('2026-10-30')) }
    expect(w).toEqual({
      gobletSquat: 16, // Lower A weeks 1-2
      benchPress: 20, // 14 kg DBs: 28 × 0.8 = 22.4 → round down 20 (rough guide)
      latPulldown: 40,
      rdl: 30, // 16 kg DBs: 32 → round down to 2.5 = 30
      chestSupportedRow: 35,
      legPress: 80,
      inclineDbPress: 12,
      pullUp: 30, // assistance kg
      hipThrust: 40,
      facePull: 15,
    })
  })

  it('never suggests less than the empty bar for barbell lifts', () => {
    const light = handoverFromSession(preA('2026-10-28', { goblet: 8, dbBench: 6, pulldown: 25, dbRdl: 6, row: 20 }))
    expect(light.benchPress).toBe(20)
    expect(light.rdl).toBe(20)
  })

  it('uses your latest pre-season session and keeps your own edits for everything else', () => {
    let sw: Record<string, number> = {}
    sw = applyHandover(sw, preA('2026-10-28'))
    sw = applyHandover(sw, preB('2026-10-30'))
    sw = { ...sw, legPress: 90, backSquat: 40 } // you edit leg press + add back squat on the review screen
    sw = applyHandover(sw, preA('2026-11-09', { goblet: 20, dbBench: 16, pulldown: 45, dbRdl: 18, row: 40 }))
    expect(sw.gobletSquat).toBe(20)
    expect(sw.benchPress).toBe(25) // 32 × 0.8 = 25.6 → 25
    expect(sw.legPress).toBe(90) // your edit survives (not in Pre-season A)
    expect(sw.backSquat).toBe(40)
  })

  it('skips exercises with no finished sets', () => {
    const s = preA('2026-10-28')
    s.exercises[1].sets = s.exercises[1].sets.map((x) => ({ ...x, done: false }))
    expect(handoverFromSession(s).benchPress).toBeUndefined()
  })

  it('shows the latest weights on the review screen', () => {
    const rows = preseasonStartWeights([preA('2026-10-28'), preA('2026-11-02', { goblet: 18, dbBench: 14, pulldown: 40, dbRdl: 16, row: 35 })])
    expect(rows.find((r) => r.to === 'gobletSquat')).toMatchObject({ from: 'gobletSquat', fromKg: 18, kg: 18, date: '2026-11-02' })
    expect(rows.find((r) => r.to === 'benchPress')?.note).toMatch(/rough guide/)
  })

  it('Week 1 suggests your handed-over weights, not pre-season progression', () => {
    const pre = [preA('2026-10-28'), preB('2026-10-30'), preA('2026-11-02'), preB('2026-11-13')]
    let sw: Record<string, number> = {}
    for (const s of pre) sw = applyHandover(sw, s)
    const settings: Settings = { ...defaultSettings(), startWeights: sw }
    const la = buildSession('LA', { date: PROGRAM.start, settings, sessions: pre, life: [] })
    const goblet = la.exercises.find((e) => e.ex === 'gobletSquat')!
    expect(goblet.suggestion).toMatchObject({ weight: 16, action: 'start' })
    expect(goblet.last).toBeNull()
    expect(la.exercises.find((e) => e.ex === 'rdl')!.suggestion.weight).toBe(30)

    const lb = buildSession('LB', { date: addDays(PROGRAM.start, 3), settings, sessions: pre, life: [] })
    // You hit 2×10 on leg press in the pre-season, but Week 1 starts at your reviewed 80, not 85.
    expect(lb.exercises.find((e) => e.ex === 'legPress')!.suggestion).toMatchObject({ weight: 80, action: 'start' })

    const ub = buildSession('UB', { date: addDays(PROGRAM.start, 4), settings, sessions: pre, life: [] })
    expect(ub.exercises.find((e) => e.ex === 'pullUp')!.suggestion.weight).toBe(30)
  })

  it('pre-season sessions progress from your pre-season logs, at RIR 3-4', () => {
    const pa = buildSession('PA', { date: '2026-11-02', settings: defaultSettings(), sessions: [preA('2026-10-28')], life: [] })
    expect(pa.exercises.map((e) => e.sets)).toEqual([2, 2, 2, 2, 2, 2])
    expect(pa.exercises[0].rest).toBe(90)
    expect(pa.exercises[0].rir).toEqual(['RIR 3-4', 'RIR 3-4'])
    expect(pa.exercises[0].suggestion.weight).toBe(18) // 2×10 hit → +2 kg
  })
})

// ---------------------------------------------------------------------------
describe('pre-season game rules', () => {
  function game(sessions: WorkoutSession[], today: string, settings: Settings = defaultSettings(), daily: Parameters<typeof computeGame>[0]['daily'] = []) {
    const ps: PlanSettings = { trainingDays: settings.trainingDays, tennisOff: settings.tennisOff, christmasMove: null, repeats: [] }
    return computeGame({ settings, sessions, daily, checkins: [], tests: [], life: [], today, planFor: (w) => planWeek(w, { today, settings: ps, sessions, life: [] }) })
  }

  it('is its own phase', () => {
    expect(getPhase('2026-10-25').id).toBe('prestart')
    expect(getPhase('2026-10-26').id).toBe('exam')
    expect(getPhase('2026-11-15').id).toBe('exam')
    expect(getPhase('2026-11-16').id).toBe('foundation')
  })

  it('XP: 50 per session, 20 per walk, 15 per exam quest, 100 per exam boss', () => {
    const sessions = [preA('2026-10-28'), session('2026-10-29', 'walk'), session('2026-10-29', 'walk')]
    const settings = { ...defaultSettings(), examsDefeated: ['english'] }
    const daily = [{ date: '2026-10-29', mobility: [], mobilityDone: false, sleep8: true, study9: true, noCaffeine: false }]
    const xp = preseasonXP({ sessions, daily, settings, today: '2026-10-29' })
    const sum = (k: string) => xp.filter((e) => e.kind === k).reduce((a, e) => a + e.amount, 0)
    expect(sum('session')).toBe(PRESEASON_XP.session)
    expect(sum('walk')).toBe(PRESEASON_XP.walk) // one walk a day counts
    expect(sum('quest')).toBe(3 * PRESEASON_XP.examQuest) // sleep + study + walk-or-mobility
    expect(sum('exam')).toBe(PRESEASON_XP.examBoss)
  })

  it('pre-season XP carries into your main level, without main-plan session XP', () => {
    const g = game([preA('2026-10-28')], '2026-10-28')
    expect(g.totalXP).toBe(PRESEASON_XP.session)
    expect(g.ledger.some((e) => e.kind === 'set')).toBe(false)
  })

  it('skipping for study costs nothing and the streak starts on 16 Nov', () => {
    const settings = defaultSettings()
    const skipped = game([], '2026-11-15', settings, [{ date: '2026-10-28', mobility: [], mobilityDone: false, studySkip: true }])
    expect(skipped.totalXP).toBe(0)
    expect(skipped.streak).toBe(0)
    expect(skipped.weeks).toEqual([]) // pre-season weeks aren't streak weeks
    const wk1 = ['LA', 'UA', 'LB', 'UB'].map((slot, i) => session(addDays(PROGRAM.start, [0, 1, 3, 4][i]), slot as WorkoutSession['slot']))
    const g = game(wk1, '2026-11-23', settings)
    expect(g.weeks[0].weekStart).toBe(PROGRAM.start)
    expect(g.streak).toBe(1)
  })

  it('Exam Slayer after all five bosses; Pre-season Done + graduation cap after 4 sessions', () => {
    const settings = { ...defaultSettings(), examsDefeated: ['english', 'vet', 'methods1', 'methods2'] }
    const three = [preA('2026-10-28'), preB('2026-10-30'), preA('2026-11-02')]
    let g = game(three, '2026-11-12', settings)
    expect(g.achievements.find((a) => a.id === 'examSlayer')!.unlocked).toBe(false)
    expect(g.achievements.find((a) => a.id === 'preseasonDone')!.unlocked).toBe(false)
    expect(g.gearUnlocked).not.toContain('grad-cap')

    g = game([...three, preB('2026-11-07')], '2026-11-12', { ...settings, examsDefeated: [...settings.examsDefeated, 'physics'] })
    expect(g.achievements.find((a) => a.id === 'examSlayer')).toMatchObject({ unlocked: true, date: '2026-11-12' })
    expect(g.titles).toContain('examSlayer')
    expect(g.achievements.find((a) => a.id === 'preseasonDone')).toMatchObject({ unlocked: true, date: '2026-11-07' })
    expect(g.gearUnlocked).toContain('grad-cap')
  })

  it("pre-season sessions don't unlock main-plan achievements or PRs", () => {
    const g = game([preA('2026-10-28'), preA('2026-11-02', { goblet: 20, dbBench: 16, pulldown: 45, dbRdl: 18, row: 40 })], '2026-11-02')
    expect(g.prs).toEqual([])
    expect(g.achievements.find((a) => a.id === 'firstSession')!.unlocked).toBe(false)
  })
})
