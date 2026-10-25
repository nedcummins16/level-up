// The game layer. Everything is DERIVED from your real data (sessions, daily logs,
// check-ins, tests), so editing or deleting a log can never leave XP out of sync.

import {
  ACHIEVEMENTS,
  COSMETICS,
  HOME_GYM,
  LOOT,
  ON_TIME,
  COMEBACK,
  FOOD,
  BEACH_RAID,
  FREEZE,
  RAIDS,
  STATS,
  TEST_RAID,
  THEMES,
  UNLOCKABLES,
  WEEKLY_QUESTS,
  XP,
  titleFor,
  xpToNext,
  type AchievementId,
  type RaidId,
  type Unlockable,
} from '../config/game'
import { EXERCISES, PROGRAM } from '../config/program'
import type { Appointment, CheckIn, DailyLog, LifeEvent, Settings, TestResult, WorkoutSession } from '../db/types'
import { avg7, latestWeight, weighIns } from './body'
import { addDays, mondayOf, rangeDays, type ISODate } from './dates'
import { allTestDays, getPhase, weekNumber } from './plan'
import { epley } from './progression'
import { allPRs, type PREvent } from './records'
import { computeLoot, onTimeSessions, specialGearUnlocked, type LootState } from './loot'
import { activeSkills, maxFreezes } from './skills'
import { bestJumpReach, bossTrophies, computeDunk, computePhysique, type BossTrophy, type DunkState, type Physique } from './growth'
import { isStrengthSlot, type WeekPlan } from './schedule'
import { earnsStrengthXP } from './xp'

export interface GameInput {
  settings: Settings
  sessions: WorkoutSession[]
  daily: DailyLog[]
  checkins: CheckIn[]
  tests: TestResult[]
  life: LifeEvent[]
  today: ISODate
  planFor: (weekStart: ISODate) => WeekPlan
  appointments?: Appointment[]
}

export interface XpEntry {
  date: ISODate
  amount: number
  reason: string
  kind: 'set' | 'session' | 'cardio' | 'mobility' | 'quest' | 'checkin' | 'pr' | 'weekly' | 'raid' | 'achievement' | 'boss' | 'recovery' | 'comeback' | 'loot' | 'ontime'
}

export interface StatBlock {
  STR: number
  END: number
  MOB: number
  JMP: number
  BULK: number
  detail: Record<'STR' | 'END' | 'MOB' | 'JMP' | 'BULK', string>
}

export interface RaidState {
  id: RaidId
  name: string
  desc: string
  done: boolean
  progress: string
  opened: boolean
}

export interface WeekResult {
  weekStart: ISODate
  week: number
  planned: number
  required: number
  done: number
  complete: boolean
  sick: boolean
  freezeUsed: boolean
  freezeEarned: boolean
  streakAfter: number
  iron: boolean
  finished: boolean
  xp: number
  prs: PREvent[]
  raid: RaidState
  quests: { id: string; name: string; done: boolean; progress: string }[]
}

export interface GameState {
  totalXP: number
  level: number
  xpInLevel: number
  xpForNext: number
  title: string
  ledger: XpEntry[]
  stats: StatBlock
  streak: number
  bestStreak: number
  freezes: number
  mobilityStreak: number
  weeks: WeekResult[]
  thisWeek: WeekResult | null
  achievements: { id: AchievementId; name: string; icon: string; desc: string; unlocked: boolean; date?: ISODate }[]
  prs: PREvent[]
  unlocked: Unlockable[]
  nextUnlock: Unlockable | null
  bossesBeaten: string[]
  physique: Physique
  loot: LootState
  /** Every gear id you can wear (levels, streaks, sets). */
  gearUnlocked: string[]
  gymItems: string[]
  /** Active skill-tree perks. */
  skills: string[]
  freezeCap: number
  dunk: DunkState
  trophies: BossTrophy[]
}

const CARDIO_SLOTS = new Set(['cardio', 'tennis', 'intervals', 'sprints', 'beachRun'])

export function levelFromXP(total: number) {
  let level = 1
  let rest = total
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level)
    level++
  }
  return { level, xpInLevel: rest, xpForNext: xpToNext(level) }
}

const clamp = (x: number, lo = 0, hi = 99) => Math.max(lo, Math.min(hi, x))

function dayDone(daily: DailyLog[], d: ISODate) {
  return daily.find((x) => x.date === d)
}

/** Effective load for STR: pull-ups use bodyweight − assistance. */
function bestLiftE1RM(sessions: WorkoutSession[], lift: 'squat' | 'bench' | 'deadlift' | 'pullup', asOf: ISODate, daily: DailyLog[], window?: [ISODate, ISODate]) {
  let best = 0
  for (const s of sessions) {
    if (s.status !== 'done' || s.date > asOf) continue
    if (window && (s.date < window[0] || s.date > window[1])) continue
    for (const e of s.exercises) {
      if (EXERCISES[e.ex]?.lift !== lift) continue
      for (const set of e.sets) {
        if (!set.done || !set.reps) continue
        let load = set.weight ?? 0
        if (lift === 'pullup') {
          const bw = latestWeight(daily, s.date) ?? PROGRAM.body.startKg
          load = e.equipment === 'assisted' ? bw - (set.weight ?? 0) : bw + (set.weight ?? 0)
        }
        best = Math.max(best, epley(load, set.reps))
      }
    }
  }
  return Math.round(best * 10) / 10
}

export function liftBests(sessions: WorkoutSession[], daily: DailyLog[], asOf: ISODate, window?: [ISODate, ISODate]) {
  return {
    squat: bestLiftE1RM(sessions, 'squat', asOf, daily, window),
    bench: bestLiftE1RM(sessions, 'bench', asOf, daily, window),
    deadlift: bestLiftE1RM(sessions, 'deadlift', asOf, daily, window),
    pullup: bestLiftE1RM(sessions, 'pullup', asOf, daily, window),
  }
}

function latestTest(tests: TestResult[], key: string, asOf: ISODate, best: 'max' | 'min' | 'latest' = 'latest'): number | null {
  const vals = tests
    .filter((t) => t.date <= asOf && typeof t.results[key] === 'number')
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((t) => t.results[key] as number)
  if (!vals.length) return null
  if (best === 'max') return Math.max(...vals)
  if (best === 'min') return Math.min(...vals)
  return vals[vals.length - 1]
}

export function mobilityStreak(daily: DailyLog[], today: ISODate): number {
  let d = dayDone(daily, today)?.mobilityDone ? today : addDays(today, -1)
  let n = 0
  while (dayDone(daily, d)?.mobilityDone) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function computeStats(input: Pick<GameInput, 'sessions' | 'daily' | 'tests'>, asOf: ISODate): StatBlock {
  const { sessions, daily, tests } = input
  const bw = avg7(daily, asOf) ?? latestWeight(daily, asOf) ?? PROGRAM.body.startKg
  const l = liftBests(sessions, daily, asOf)
  const total = l.squat + l.bench + l.deadlift + l.pullup
  const ratio = total / bw
  const STR = total > 0 ? Math.round(clamp(((ratio - STATS.strRatio.zero) / (STATS.strRatio.full - STATS.strRatio.zero)) * 99, 1)) : 1

  const cardioMin = sessions.filter((s) => s.status === 'done' && s.date <= asOf && CARDIO_SLOTS.has(s.slot)).reduce((a, s) => a + (s.minutes ?? 0), 0)
  const fiveK = latestTest(tests, 'fiveK', asOf, 'min')
  const endMin = Math.min(50, (cardioMin / STATS.endMinutesFor50) * 50)
  const endFive = fiveK ? clamp(((STATS.endFiveK.slowSec - fiveK) / (STATS.endFiveK.slowSec - STATS.endFiveK.fastSec)) * 49, 0, 49) : 0
  const END = Math.round(clamp(endMin + endFive, 1))

  const toe = latestTest(tests, 'toeTouch', asOf)
  const mStreak = mobilityStreak(daily, asOf)
  const toePts = toe === null ? 20 : clamp(((toe - STATS.mobToe.min) / (STATS.mobToe.max - STATS.mobToe.min)) * 70, 0, 70)
  const MOB = Math.round(clamp(toePts + Math.min(29, mStreak), 1))

  const jump = bestJumpReach(tests, daily, asOf)
  const JMP = jump === null ? 1 : Math.round(clamp(((jump - STATS.jmp.min) / (STATS.jmp.max - STATS.jmp.min)) * 99, 1))

  const now = avg7(daily, asOf)
  const BULK = now === null ? 1 : Math.round(clamp(((now - PROGRAM.body.startKg) / (PROGRAM.body.goalKg - PROGRAM.body.startKg)) * 99, 1))

  const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
  return {
    STR,
    END,
    MOB,
    JMP,
    BULK,
    detail: {
      STR: total > 0 ? `e1RM S${l.squat} B${l.bench} D${l.deadlift} P${l.pullup} = ${Math.round(total)} kg (${ratio.toFixed(1)}× BW)` : 'Log squat, bench, deadlift and pull-ups',
      END: `${cardioMin} cardio min${fiveK ? ` · 5 km ${fmtTime(fiveK)}` : ''}`,
      MOB: `${toe !== null ? `toe touch ${toe > 0 ? '+' : ''}${toe} cm · ` : ''}mobility streak ${mStreak}`,
      JMP: jump !== null ? `jump reach ${jump} cm` : 'Test jump reach on a boss day',
      BULK: now !== null ? `${now} kg (start ${PROGRAM.body.startKg} → goal ${PROGRAM.body.goalKg})` : 'Weigh in daily',
    },
  }
}

export function raidFor(weekStart: ISODate, repeats: ISODate[]) {
  const days = rangeDays(weekStart, addDays(weekStart, 6))
  const phases = days.map((d) => getPhase(d, repeats).id)
  if (phases.filter((p) => p === 'beach').length >= 4) return BEACH_RAID
  if (phases.includes('test')) return TEST_RAID
  const n = Math.max(1, weekNumber(weekStart))
  return RAIDS[(n - 1) % RAIDS.length]
}

export function computeGame(input: GameInput): GameState {
  const { settings, sessions, daily, checkins, tests, life, today, planFor } = input
  const done = sessions.filter((s) => s.status === 'done')
  const ledger: XpEntry[] = []
  const add = (date: ISODate, amount: number, reason: string, kind: XpEntry['kind']) => {
    if (amount > 0) ledger.push({ date, amount, reason, kind })
  }

  // --- Sessions
  for (const s of done) {
    if (isStrengthSlot(s.slot)) {
      if (!earnsStrengthXP(s, sessions)) continue
      const sets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0)
      add(s.date, XP.session, `${s.slot} session`, 'session')
      add(s.date, sets * XP.set, `${sets} sets`, 'set')
    } else if (CARDIO_SLOTS.has(s.slot)) {
      add(s.date, XP.cardio, s.label ?? 'Cardio', 'cardio')
    }
  }

  // --- Comeback quest: first session after a missed gym day (once per week)
  const bossDays = new Set(tests.filter((t) => t.completedAt).map((t) => t.date))
  const comebackWeeks = new Set<ISODate>()
  for (const s of [...done].sort((a, b) => (a.date === b.date ? a.startedAt - b.startedAt : a.date < b.date ? -1 : 1))) {
    if (comebackWeeks.has(mondayOf(s.date))) continue
    if (!isStrengthSlot(s.slot) && !CARDIO_SLOTS.has(s.slot)) continue
    if (done.some((x) => x.date === s.date && x !== s && x.startedAt < s.startedAt)) continue // only the day's first session
    if (missedBefore(s.date, done, planFor, bossDays)) {
      comebackWeeks.add(mondayOf(s.date))
      add(s.date, COMEBACK.bonus, 'Comeback quest', 'comeback')
    }
  }

  // --- PRs
  const prs = allPRs(sessions)
  for (const p of prs) add(p.date, XP.pr, `PR: ${p.name}`, 'pr')

  // --- Daily logs (no future days)
  for (const d of daily) {
    if (d.date > today) continue
    if (d.mobilityDone) add(d.date, XP.mobility, 'Mobility', 'mobility')
    if (d.protein) add(d.date, XP.dailyQuest, 'Protein quest', 'quest')
    if (d.steps) add(d.date, XP.dailyQuest, 'Steps quest', 'quest')
    if (d.smoothie) add(d.date, XP.dailyQuest, 'Smoothie quest', 'quest')
    if ((d.meals?.length ?? 0) >= FOOD.slots.length) add(d.date, XP.dailyQuest, 'Ate 5 times', 'quest')
  }

  // --- Check-ins
  for (const c of checkins) add(c.date, XP.checkin, 'Sunday check-in', 'checkin')

  // --- Bosses
  const testDays = allTestDays(settings.repeats)
  const bossesBeaten = tests.filter((t) => t.completedAt).map((t) => t.id)
  for (const t of tests) {
    if (!t.completedAt) continue
    const td = testDays.find((x) => x.id === t.id)
    add(t.date, XP.boss, `Boss: ${td?.boss ?? t.id}`, 'boss')
  }

  // --- Weeks: streak, freezes, recovery quests, weekly quests, raids
  const freezeCap = maxFreezes(new Set(settings.skills ?? []))
  const firstWeek = mondayOf(PROGRAM.start)
  const lastWeek = mondayOf(today)
  const weeks: WeekResult[] = []
  let streak = 0
  let best = 0
  let freezes = 0
  let completeWeeks = 0
  let thisWeek: WeekResult | null = null

  for (let w = firstWeek; w <= lastWeek; w = addDays(w, 7)) {
    const plan = planFor(w)
    const wEnd = addDays(w, 6)
    const finished = wEnd < today
    const inWeek = (d: ISODate) => d >= w && d <= wEnd
    const wDone = done.filter((s) => inWeek(s.date))
    const testsDone = tests.filter((t) => t.completedAt && inWeek(t.date) && plan.days.some((d) => d.items.some((i) => i.testId === t.id && i.counts))).length
    const doneCount = wDone.filter((s) => isStrengthSlot(s.slot) || CARDIO_SLOTS.has(s.slot)).length + testsDone
    const complete = plan.planned > 0 && doneCount >= plan.required
    const sick = life.some((e) => (e.type === 'sickAbove' || e.type === 'sickBelow') && e.start <= wEnd && (e.end === null || e.end >= w))

    // Recovery quest: rest day + mobility
    for (const d of plan.days) {
      if (d.date > today) continue
      const rest = d.items.every((i) => i.kind === 'rest')
      if (rest && dayDone(daily, d.date)?.mobilityDone) add(d.date, XP.recovery, 'Recovery quest', 'recovery')
    }

    const days = rangeDays(w, wEnd).filter((d) => d <= today)
    const countDays = (f: (x: DailyLog) => boolean) => days.filter((d) => {
      const x = dayDone(daily, d)
      return x ? f(x) : false
    }).length
    const mob = countDays((x) => x.mobilityDone)
    const steps = countDays((x) => !!x.steps)
    const protein = countDays((x) => !!x.protein)
    const smoothie = countDays((x) => !!x.smoothie)
    const fed = countDays((x) => (x.meals?.length ?? 0) >= FOOD.slots.length)
    const weighs = weighIns(daily).filter((x) => inWeek(x.date)).length
    const checkedIn = checkins.some((c) => c.weekStart === w)

    const quests = WEEKLY_QUESTS.map((q) => {
      switch (q.id) {
        case 'target':
          return { id: q.id, name: q.name, done: complete, progress: `${doneCount}/${plan.required}` }
        case 'mobility6':
          return { id: q.id, name: q.name, done: mob >= 6, progress: `${mob}/6` }
        case 'steps5':
          return { id: q.id, name: q.name, done: steps >= 5, progress: `${steps}/5` }
        case 'weigh5':
          return { id: q.id, name: q.name, done: weighs >= 5, progress: `${weighs}/5` }
        case 'checkin':
          return { id: q.id, name: q.name, done: checkedIn, progress: checkedIn ? '✓' : '0/1' }
      }
    })
    if (plan.planned > 0) for (const q of quests) if (q.done) add(wEnd > today ? today : wEnd, XP.weeklyQuest, `Weekly: ${q.name}`, 'weekly')

    const wPRs = prs.filter((p) => inWeek(p.date))
    const r = raidFor(w, settings.repeats)
    const strengthDone = wDone.filter((s) => isStrengthSlot(s.slot))
    const beachPlanned = plan.days.flatMap((d) => d.items).filter((i) => i.slot === 'BA' || i.slot === 'BB').length
    const beachDone = wDone.filter((s) => s.slot === 'BA' || s.slot === 'BB').length
    const testPlanned = plan.days.flatMap((d) => d.items).filter((i) => i.kind === 'test').length
    const raidEval: Record<RaidId, [boolean, string]> = {
      allPlanned: [plan.planned > 0 && doneCount >= plan.planned, `${doneCount}/${plan.planned}`],
      protein5: [protein >= 5, `${protein}/5`],
      onePR: [wPRs.length > 0, `${wPRs.length}/1`],
      mobility7: [mob >= 7, `${mob}/7`],
      smoothie5: [smoothie >= 5, `${smoothie}/5`],
      meals5: [fed >= 5, `${fed}/5`],
      steps6: [steps >= 6, `${steps}/6`],
      allSets: [
        strengthDone.length >= 3 && strengthDone.every((s) => s.exercises.every((e) => e.sets.every((x) => x.done))),
        `${strengthDone.filter((s) => s.exercises.every((e) => e.sets.every((x) => x.done))).length}/${Math.max(3, strengthDone.length)}`,
      ],
      beachAll: [beachPlanned > 0 && beachDone >= beachPlanned, `${beachDone}/${beachPlanned}`],
      bosses: [testPlanned > 0 && testsDone >= testPlanned, `${testsDone}/${testPlanned}`],
    }
    const [raidDone, raidProgress] = raidEval[r.id]
    const opened = settings.openedChests.includes(w)
    if (raidDone && opened) add(wEnd > today ? today : wEnd, XP.raidChest, `Raid chest: ${r.name}`, 'raid')

    let freezeUsed = false
    let freezeEarned = false
    if (plan.planned > 0) {
      if (complete) {
        streak++
        completeWeeks++
        if (completeWeeks % FREEZE.everyWeeks === 0 && freezes < freezeCap) {
          freezes++
          freezeEarned = true
        }
      } else if (finished) {
        if (sick && freezes > 0) {
          freezes--
          freezeUsed = true
        } else streak = 0
      }
      best = Math.max(best, streak)
    }

    const iron = plan.planned >= 6 && doneCount >= plan.planned
    const result: WeekResult = {
      weekStart: w,
      week: weekNumber(w),
      planned: plan.planned,
      required: plan.required,
      done: doneCount,
      complete,
      sick,
      freezeUsed,
      freezeEarned,
      streakAfter: streak,
      iron,
      finished,
      xp: 0,
      prs: wPRs,
      raid: { id: r.id, name: r.name, desc: r.desc, done: raidDone, progress: raidProgress, opened },
      quests,
    }
    weeks.push(result)
    if (w === lastWeek) thisWeek = result
  }

  // --- Loot: duplicates turn into XP; on-time bonus for keeping your planned time
  const loot = computeLoot(
    sessions,
    weeks.filter((w) => w.raid.done && w.raid.opened).map((w) => w.weekStart),
  )
  for (const d of loot.drops) if (d.duplicate) add(d.date, LOOT.duplicateXP, 'Duplicate loot', 'loot')
  for (const s of onTimeSessions(sessions, input.appointments ?? [])) add(s.date, ON_TIME.xp, 'On time!', 'ontime')

  // --- Achievements
  const ach = computeAchievements(input, prs, weeks)
  for (const a of ach) if (a.unlocked) add(a.date ?? today, XP.achievement, `Achievement: ${a.name}`, 'achievement')

  // Week XP totals
  for (const w of weeks) {
    const end = addDays(w.weekStart, 6)
    w.xp = ledger.filter((e) => e.date >= w.weekStart && e.date <= end).reduce((a, e) => a + e.amount, 0)
  }

  const totalXP = ledger.reduce((a, e) => a + e.amount, 0)
  const lv = levelFromXP(totalXP)
  const unlocked = UNLOCKABLES.filter((u) => u.level <= lv.level)
  return {
    totalXP,
    ...lv,
    title: titleFor(lv.level),
    ledger,
    stats: computeStats(input, today),
    streak,
    bestStreak: best,
    freezes,
    mobilityStreak: mobilityStreak(daily, today),
    weeks,
    thisWeek,
    achievements: ach,
    prs,
    unlocked,
    nextUnlock: UNLOCKABLES.find((u) => u.level > lv.level) ?? null,
    bossesBeaten,
    physique: computePhysique(daily, (d) => computeStats(input, d).STR, today),
    loot,
    gearUnlocked: [...COSMETICS.filter((c) => c.level <= lv.level).map((c) => c.id), ...specialGearUnlocked(best, loot.setsComplete)],
    gymItems: HOME_GYM.filter((g) => g.level <= lv.level).map((g) => g.id),
    skills: [...activeSkills(settings.skills ?? [], lv.level)],
    freezeCap,
    dunk: computeDunk(tests, daily),
    trophies: bossTrophies(tests),
  }
}

function computeAchievements(input: GameInput, prs: PREvent[], weeks: WeekResult[]) {
  const { sessions, daily, tests, settings, today } = input
  const done = sessions.filter((s) => s.status === 'done').sort((a, b) => (a.date < b.date ? -1 : 1))
  const firstDate = (pred: (s: WorkoutSession) => boolean) => done.find(pred)?.date
  const anySet = (exIds: string[], pred: (w: number | null, r: number, s: WorkoutSession) => boolean) =>
    firstDate((s) => s.exercises.some((e) => exIds.includes(e.ex) && e.sets.some((x) => x.done && x.reps && pred(x.weight, x.reps, s))))
  const testDate = (key: string, pred: (v: number) => boolean) =>
    tests
      .filter((t) => typeof t.results[key] === 'number' && pred(t.results[key] as number))
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0]?.date
  const minDate = (...ds: (string | undefined)[]) => ds.filter(Boolean).sort()[0]

  const strictPull = (n: number) =>
    minDate(
      anySet(['pullUp'], (w, r) => (w ?? 0) <= 0 && r >= n),
      anySet(['pullUpBeach'], (_w, r) => r >= n),
      testDate('pullups', (v) => v >= n),
    )
  const pushups30 = minDate(anySet(['pushUp', 'diamondPushUp'], (_w, r) => r >= 30), testDate('pushups', (v) => v >= 30))
  const bwBench = anySet(['benchPress'], (w, _r, s) => (w ?? 0) >= (latestWeight(daily, s.date) ?? PROGRAM.body.startKg))
  const club = (kg: number) => weighIns(daily).find((x) => (avg7(daily, x.date) ?? 0) >= kg)?.date
  const iron = weeks.find((w) => w.iron)
  const beachSessions = done.filter((s) => (s.slot === 'BA' || s.slot === 'BB') && s.date >= PROGRAM.beach.start && s.date <= PROGRAM.beach.end)
  const beachSurvivor = beachSessions.length >= 6 ? beachSessions[5].date : undefined
  const neverTwice = neverMissedTwice(input, weeks)

  const dates: Record<AchievementId, string | undefined> = {
    firstSession: firstDate((s) => isStrengthSlot(s.slot)),
    firstPR: prs[0]?.date,
    pullups5: strictPull(5),
    pullups10: strictPull(10),
    pushups30,
    bwBench,
    toes: testDate('toeTouch', (v) => v >= 0),
    club60: club(60),
    club62: club(62),
    ironWeek: iron ? addDays(iron.weekStart, 6) : undefined,
    beachSurvivor,
    neverTwice,
    dunk: settings.dunk ? today : undefined,
  }
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: !!dates[a.id], date: dates[a.id] && dates[a.id]! > today ? today : dates[a.id] }))
}

/** 4 finished weeks in a row in which you never missed two planned training days back to back. */
function neverMissedTwice(input: GameInput, weeks: WeekResult[]): ISODate | undefined {
  const { sessions, today, planFor } = input
  let run = 0
  for (const w of weeks.filter((x) => x.finished && x.planned > 0)) {
    const plan = planFor(w.weekStart)
    let prevMissed = false
    let bad = false
    for (const d of plan.days) {
      const planned = d.items.some((i) => i.counts)
      if (!planned || d.date >= today) continue
      const hit = sessions.some((s) => s.date === d.date && s.status === 'done')
      if (!hit && prevMissed) bad = true
      prevMissed = !hit
    }
    run = bad ? 0 : run + 1
    if (run >= 4) return addDays(w.weekStart, 6)
  }
  return undefined
}

/** If the most recent planned GYM day before `date` (within a week) had nothing logged, return it. */
export function missedBefore(date: ISODate, done: WorkoutSession[], planFor: (w: ISODate) => WeekPlan, bossDays: Set<ISODate> = new Set()): ISODate | null {
  for (let i = 1; i <= COMEBACK.lookbackDays; i++) {
    const d = addDays(date, -i)
    if (d < PROGRAM.start) return null
    const day = planFor(mondayOf(d)).days.find((x) => x.date === d)
    if (!day || !day.items.some((it) => it.kind === 'strength')) continue
    return done.some((x) => x.date === d) || bossDays.has(d) ? null : d
  }
  return null
}

/** Has a comeback bonus already been earned this week? */
export function comebackUsed(game: Pick<GameState, 'ledger'>, weekStart: ISODate) {
  return game.ledger.some((e) => e.kind === 'comeback' && mondayOf(e.date) === weekStart)
}

export function themeUnlocked(themeId: string, level: number) {
  const t = THEMES.find((x) => x.id === themeId)
  return !!t && t.level <= level
}
