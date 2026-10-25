import type { CardioSlot, StrengthSlot } from '../config/types'
import { db, updateSettings } from '../db/db'
import type { DailyLog, LifeEvent, LifeType, WorkoutSession } from '../db/types'
import { addDays, type ISODate } from '../lib/dates'
import { makeLifeEvent } from '../lib/life'
import { applyHandover, isPreseasonSlot } from '../lib/preseason'
import { newStrengthSession, type SessionPlan } from '../lib/session'

export async function startStrength(plan: SessionPlan, date: ISODate, replaces?: StrengthSlot) {
  const existing = await db.sessions.where('status').equals('active').first()
  if (existing) return existing.id!
  return db.sessions.add(newStrengthSession(plan, date, replaces))
}

export async function saveSession(s: WorkoutSession) {
  await db.sessions.put(s)
}

export async function finishSession(id: number) {
  await db.sessions.update(id, { status: 'done', finishedAt: Date.now() })
  // Pre-season: the weights you just used become your suggested Week 1 starting weights.
  const s = await db.sessions.get(id)
  if (s && isPreseasonSlot(s.slot)) await updateSettings((cur) => ({ startWeights: applyHandover(cur.startWeights, s) }))
}

/** A walk (exam pre-season). Counts as a completed day. */
export async function logWalk(date: ISODate, minutes: number | null, label: string) {
  await db.sessions.add({
    date,
    slot: 'walk',
    status: 'done',
    startedAt: Date.now(),
    finishedAt: Date.now(),
    modifiers: [],
    multiplier: 1,
    reduced: false,
    exercises: [],
    warmupDone: [],
    minutes: minutes ?? undefined,
    label,
  })
}

/** Exam pre-season: mark an exam boss as defeated (you sat it), or undo. */
export async function setExamDefeated(examId: string, on: boolean) {
  await updateSettings((s) => {
    const next = new Set(s.examsDefeated)
    if (on) next.add(examId)
    else next.delete(examId)
    return { examsDefeated: [...next] }
  })
}

export async function setPreseasonTask(id: string, on: boolean) {
  await updateSettings((s) => {
    const next = new Set(s.preseasonTasks)
    if (on) next.add(id)
    else next.delete(id)
    return { preseasonTasks: [...next] }
  })
}

export async function deleteSession(id: number) {
  await db.sessions.delete(id)
}

export async function logCardio(slot: CardioSlot, date: ISODate, minutes: number, label: string, distanceKm?: number | null) {
  await db.sessions.add({
    date,
    slot,
    status: 'done',
    startedAt: Date.now(),
    finishedAt: Date.now(),
    modifiers: [],
    multiplier: 1,
    reduced: false,
    exercises: [],
    warmupDone: [],
    minutes,
    distanceKm: distanceKm ?? undefined,
    label,
  })
}

export async function patchDaily(date: ISODate, patch: Partial<DailyLog>) {
  await db.transaction('rw', db.daily, async () => {
    const cur = (await db.daily.get(date)) ?? { date, mobility: [], mobilityDone: false }
    await db.daily.put({ ...cur, ...patch, date })
  })
}

export async function addLife(type: LifeType, today: ISODate) {
  return db.life.add(makeLifeEvent(type, today) as LifeEvent)
}

export async function removeLife(id: number) {
  await db.life.delete(id)
}

/** "I'm better": ongoing event ends yesterday (or today if it started today). */
export async function endOngoing(id: number, today: ISODate) {
  const e = await db.life.get(id)
  if (!e) return
  const end = e.start >= today ? today : addDays(today, -1)
  await db.life.update(id, { end })
}

export async function toggleTennis(weekStart: ISODate, on: boolean) {
  await updateSettings((s) => {
    const off = new Set(s.tennisOff)
    if (on) off.delete(weekStart)
    else off.add(weekStart)
    return { tennisOff: [...off].sort() }
  })
}
