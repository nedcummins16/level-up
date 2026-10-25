// Exam pre-season (Mon 26 Oct - Sun 15 Nov 2026): the day plan, the exam-day gym rule,
// the starting-weight handover to Week 1, and pre-season XP.
// Exams come first: nothing here can break a streak or cost XP.

import { PRESEASON_XP } from '../config/game'
import { PRESEASON, PROGRAM } from '../config/program'
import type { Exam, Handover, PreseasonDay, PreseasonSlot, Slot } from '../config/types'
import type { DailyLog, Settings, WorkoutSession } from '../db/types'
import { fmtTime } from './appointments'
import { addDays, dayName, diffDays, isBetween, fmtShort, type ISODate } from './dates'
import type { XpEntry } from './game'
import { roundTo, workingWeight } from './progression'

export function isPreseasonSlot(slot: Slot | string | undefined): slot is PreseasonSlot {
  return slot === 'PA' || slot === 'PB'
}

export function isPreseason(d: ISODate) {
  return isBetween(d, PRESEASON.start, PRESEASON.end)
}

export function preseasonDay(d: ISODate): PreseasonDay | undefined {
  return isPreseason(d) ? (PRESEASON.days[d] ?? { items: [{ kind: 'rest' }] }) : undefined
}

export function examById(id: string): Exam | undefined {
  return PRESEASON.exams.find((e) => e.id === id)
}

export function examOn(d: ISODate): Exam | undefined {
  return PRESEASON.exams.find((e) => e.date === d)
}

/** The first exam after today (today's exam has its own card). */
export function nextExam(d: ISODate): Exam | undefined {
  return PRESEASON.exams.find((e) => e.date > d)
}

/** "Thu 5/11 · 9:00am-10:15am" */
export function fmtExamWhen(e: Exam) {
  return `${dayName(e.date)} ${fmtShort(e.date)} · ${fmtTime(e.start)}-${fmtTime(e.end)}`
}

// ---------------------------------------------------------------------------
//  Rule: no gym on an exam day or the day before one.
// ---------------------------------------------------------------------------

/** The exam that rules out the gym on this date (exam today or tomorrow), if any. */
export function gymBlockedBy(d: ISODate): Exam | null {
  return examOn(d) ?? examOn(addDays(d, 1)) ?? null
}

export type GymCheck = { ok: true } | { ok: false; exam: Exam; title: string; message: string }

/** Friendly "maybe walk instead?" check before starting a gym session. You can always override it. */
export function gymCheck(d: ISODate): GymCheck {
  const exam = gymBlockedBy(d)
  if (!exam) return { ok: true }
  if (exam.date === d)
    return {
      ok: false,
      exam,
      title: `It's ${exam.name} day`,
      message: `You've done the hard part today. A 20-minute walk will help you recover better than the gym will. Pre-season sessions can wait.`,
    }
  return {
    ok: false,
    exam,
    title: `${exam.name} is tomorrow`,
    message: `${exam.name} is at ${fmtTime(exam.start)} tomorrow. A walk clears your head without making you tired, so it's the better choice today. Bed by 10pm.`,
  }
}

/** Pick the next session in the A/B rotation (for "train today anyway"). */
export function nextPreseasonSlot(sessions: WorkoutSession[]): PreseasonSlot {
  const last = sessions
    .filter((s) => s.status === 'done' && isPreseasonSlot(s.slot))
    .sort((a, b) => (a.date === b.date ? a.startedAt - b.startedAt : a.date < b.date ? -1 : 1))
    .pop()
  return last?.slot === 'PA' ? 'PB' : 'PA'
}

/**
 * Logs from the same "season" as the date: the pre-season uses pre-season logs, and
 * the main plan ignores them (Week 1 starts from your reviewed starting weights).
 */
export function sameSeason<T extends Pick<WorkoutSession, 'date'>>(sessions: T[], date: ISODate): T[] {
  const main = date >= PROGRAM.start
  return sessions.filter((s) => (s.date >= PROGRAM.start) === main)
}

// ---------------------------------------------------------------------------
//  Starting-weight handover → Week 1
// ---------------------------------------------------------------------------

/** Pre-season weight → suggested starting weight for the main-plan exercise. */
export function handoverWeight(h: Handover, kg: number): number {
  let w = kg * (h.factor ?? 1)
  if (h.step) w = roundTo(w, h.step, 'floor')
  if (h.min !== undefined) w = Math.max(h.min, w)
  return Math.round(w * 100) / 100
}

/** Main-plan starting weights from one finished pre-season session. */
export function handoverFromSession(s: WorkoutSession): Record<string, number> {
  const out: Record<string, number> = {}
  if (!isPreseasonSlot(s.slot) || s.status !== 'done') return out
  for (const e of s.exercises) {
    const h = PRESEASON.handover.find((x) => x.from === e.ex)
    if (!h) continue
    const kg = workingWeight({ date: s.date, sets: e.sets.filter((x) => x.done), plannedSets: e.targetSets, reduced: false }, e.equipment)
    if (kg === null) continue
    out[h.to] = handoverWeight(h, kg)
  }
  return out
}

/** Merge a finished session's weights into your starting weights (other entries are kept). */
export function applyHandover(startWeights: Record<string, number>, s: WorkoutSession): Record<string, number> {
  return { ...startWeights, ...handoverFromSession(s) }
}

export interface HandoverRow {
  to: string
  from: string
  fromKg: number
  kg: number
  date: ISODate
  note?: string
}

/** What your latest pre-season logs say for each main-plan exercise (for the review screen). */
export function preseasonStartWeights(sessions: WorkoutSession[]): HandoverRow[] {
  const done = sessions
    .filter((s) => s.status === 'done' && isPreseasonSlot(s.slot))
    .sort((a, b) => (a.date === b.date ? a.startedAt - b.startedAt : a.date < b.date ? -1 : 1))
  const rows = new Map<string, HandoverRow>()
  for (const s of done) {
    for (const e of s.exercises) {
      const h = PRESEASON.handover.find((x) => x.from === e.ex)
      if (!h) continue
      const kg = workingWeight({ date: s.date, sets: e.sets.filter((x) => x.done), plannedSets: e.targetSets, reduced: false }, e.equipment)
      if (kg === null) continue
      rows.set(h.to, { to: h.to, from: h.from, fromKg: kg, kg: handoverWeight(h, kg), date: s.date, note: h.note })
    }
  }
  return PRESEASON.handover.map((h) => rows.get(h.to)).filter((r): r is HandoverRow => !!r)
}

// ---------------------------------------------------------------------------
//  Progress + XP
// ---------------------------------------------------------------------------

/** Finished pre-season gym sessions, at most one per day, oldest first. */
export function preseasonSessionsDone(sessions: WorkoutSession[], today?: ISODate): WorkoutSession[] {
  const seen = new Set<ISODate>()
  return sessions
    .filter((s) => s.status === 'done' && isPreseasonSlot(s.slot) && isPreseason(s.date) && (!today || s.date <= today))
    .sort((a, b) => (a.date === b.date ? a.startedAt - b.startedAt : a.date < b.date ? -1 : 1))
    .filter((s) => (seen.has(s.date) ? false : (seen.add(s.date), true)))
}

const ACTIVE_SLOTS = new Set(['walk', 'tennis'])

/** A walk (or tennis) logged on this date. */
export function walkedOn(sessions: WorkoutSession[], d: ISODate) {
  return sessions.some((s) => s.date === d && s.status === 'done' && ACTIVE_SLOTS.has(s.slot))
}

export function examQuestDone(id: string, log: DailyLog | undefined, sessions: WorkoutSession[], d: ISODate): boolean {
  if (id === 'moved') return !!log?.mobilityDone || walkedOn(sessions, d)
  if (!log) return false
  return log[id as 'sleep8' | 'study9' | 'noCaffeine'] === true
}

export const PRESEASON_SESSION_COUNT = Object.values(PRESEASON.days).filter((d) => d.items.some((i) => i.kind === 'session')).length

export interface PreseasonXPInput {
  sessions: WorkoutSession[]
  daily: DailyLog[]
  settings: Pick<Settings, 'examsDefeated'>
  today: ISODate
}

/** Every pre-season XP entry. Skipping for study simply earns nothing: nothing is ever taken away. */
export function preseasonXP({ sessions, daily, settings, today }: PreseasonXPInput): XpEntry[] {
  const out: XpEntry[] = []
  for (const s of preseasonSessionsDone(sessions, today))
    out.push({ date: s.date, amount: PRESEASON_XP.session, reason: `${s.slot === 'PA' ? 'Pre-season A' : 'Pre-season B'}`, kind: 'session' })

  const walkDays = new Set(sessions.filter((s) => s.status === 'done' && ACTIVE_SLOTS.has(s.slot) && isPreseason(s.date) && s.date <= today).map((s) => s.date))
  for (const d of [...walkDays].sort()) out.push({ date: d, amount: PRESEASON_XP.walk, reason: 'Walk', kind: 'walk' })

  for (const log of daily) {
    if (!isPreseason(log.date) || log.date > today) continue
    for (const id of ['sleep8', 'study9', 'moved', 'noCaffeine'])
      if (examQuestDone(id, log, sessions, log.date)) out.push({ date: log.date, amount: PRESEASON_XP.examQuest, reason: `Exam quest: ${id}`, kind: 'quest' })
  }
  // "Walk or mobility" also completes on days with a walk but no daily log yet.
  for (const d of walkDays) if (!daily.some((x) => x.date === d)) out.push({ date: d, amount: PRESEASON_XP.examQuest, reason: 'Exam quest: moved', kind: 'quest' })

  for (const id of settings.examsDefeated) {
    const e = examById(id)
    if (e && e.date <= today) out.push({ date: e.date, amount: PRESEASON_XP.examBoss, reason: `Exam boss: ${e.boss}`, kind: 'exam' })
  }
  return out
}

/** When the two pre-season achievements were earned (undefined = not yet). */
export function preseasonAchievementDates(sessions: WorkoutSession[], settings: Pick<Settings, 'examsDefeated'>) {
  const beaten = PRESEASON.exams.filter((e) => settings.examsDefeated.includes(e.id))
  const done = preseasonSessionsDone(sessions)
  return {
    examSlayer: beaten.length === PRESEASON.exams.length ? beaten[beaten.length - 1].date : undefined,
    preseasonDone: done.length >= PRESEASON.doneTarget ? done[PRESEASON.doneTarget - 1].date : undefined,
  }
}

/** Days until a date (0 = today). */
export function daysUntil(today: ISODate, d: ISODate) {
  return diffDays(today, d)
}
