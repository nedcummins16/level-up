// Loot drops, the collection book, special gear and the on-time bonus.
// Drops are DETERMINISTIC: the same session always drops the same item (seeded from
// the session itself), so XP and collections stay stable after a restore.

import { LOOT, ON_TIME, SPECIAL_GEAR, type Rarity } from '../config/game'
import type { Appointment, WorkoutSession } from '../db/types'
import { addDays, mondayOf, TIME_ZONE, type ISODate } from './dates'
import { isStrengthSlot } from './schedule'
import { earnsStrengthXP } from './xp'

const CARDIO = new Set(['cardio', 'tennis', 'intervals', 'sprints', 'beachRun'])

export interface Drop {
  id: string
  date: ISODate
  itemId: string
  rarity: Rarity
  source: 'session' | 'chest'
  duplicate: boolean
}

export interface LootState {
  drops: Drop[]
  owned: Record<string, number>
  setsComplete: string[]
}

/** Small, fast seeded random generator. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary']

function pickRarity(r: () => number, odds: Record<Rarity, number>, noCommon: boolean): Rarity {
  const pool = RARITIES.filter((x) => !(noCommon && x === 'common') && odds[x] > 0)
  const total = pool.reduce((a, x) => a + odds[x], 0)
  let roll = r() * total
  for (const x of pool) {
    roll -= odds[x]
    if (roll <= 0) return x
  }
  return pool[pool.length - 1]
}

export function itemsOfRarity(rarity: Rarity) {
  const sets = LOOT.sets.filter((s) => s.rarity === rarity).map((s) => s.id)
  return LOOT.items.filter((i) => sets.includes(i.set))
}

export function rarityOf(itemId: string): Rarity {
  const item = LOOT.items.find((i) => i.id === itemId)
  return LOOT.sets.find((s) => s.id === item?.set)?.rarity ?? 'common'
}

/** Sessions that earn a drop: strength sessions within the weekly XP cap, and cardio. Max 6 a week. */
export function dropSessions(sessions: WorkoutSession[]) {
  const done = sessions.filter((s) => s.status === 'done').sort((a, b) => (a.date === b.date ? a.startedAt - b.startedAt : a.date < b.date ? -1 : 1))
  const perWeek = new Map<ISODate, number>()
  return done.filter((s) => {
    const ok = (isStrengthSlot(s.slot) && earnsStrengthXP(s, sessions)) || CARDIO.has(s.slot)
    if (!ok) return false
    const wk = mondayOf(s.date)
    const n = perWeek.get(wk) ?? 0
    if (n >= LOOT.maxPerWeek) return false
    perWeek.set(wk, n + 1)
    return true
  })
}

/** All drops: one per eligible session + one per opened raid chest (week starts given). */
export function computeLoot(sessions: WorkoutSession[], openedRaidWeeks: ISODate[]): LootState {
  const events: { id: string; date: ISODate; seed: string; source: Drop['source'] }[] = [
    ...dropSessions(sessions).map((s) => ({ id: `s:${s.date}:${s.slot}:${s.startedAt}`, date: s.date, seed: `${s.date}|${s.slot}|${s.startedAt}`, source: 'session' as const })),
    ...openedRaidWeeks.map((w) => ({ id: `c:${w}`, date: addDays(w, 6), seed: `chest|${w}`, source: 'chest' as const })),
  ].sort((a, b) => (a.date === b.date ? (a.source === b.source ? 0 : a.source === 'session' ? -1 : 1) : a.date < b.date ? -1 : 1))

  const owned: Record<string, number> = {}
  const drops: Drop[] = []
  let commonsInRow = 0
  for (const ev of events) {
    const r = rng(ev.seed)
    const rarity = ev.source === 'chest' ? pickRarity(r, LOOT.chestOdds, true) : pickRarity(r, LOOT.odds, commonsInRow >= LOOT.pity)
    const pool = itemsOfRarity(rarity)
    let item = pool[Math.floor(r() * pool.length)]
    // One re-roll if you already have it: duplicates happen, but less often.
    if (owned[item.id]) item = pool[Math.floor(r() * pool.length)]
    const duplicate = !!owned[item.id]
    owned[item.id] = (owned[item.id] ?? 0) + 1
    if (ev.source === 'session') commonsInRow = rarity === 'common' ? commonsInRow + 1 : 0
    drops.push({ id: ev.id, date: ev.date, itemId: item.id, rarity, source: ev.source, duplicate })
  }
  const setsComplete = LOOT.sets.filter((set) => LOOT.items.filter((i) => i.set === set.id).every((i) => owned[i.id])).map((s) => s.id)
  return { drops, owned, setsComplete }
}

/** Special gear unlocked by streaks (best ever) or completed loot sets. */
export function specialGearUnlocked(bestStreak: number, setsComplete: string[]) {
  return SPECIAL_GEAR.filter((g) => (g.streak !== undefined && bestStreak >= g.streak) || (g.set !== undefined && setsComplete.includes(g.set))).map((g) => g.id)
}

const minuteFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Minutes after midnight (Melbourne) for an instant. */
export function melbourneMinutes(ms: number) {
  const [h, m] = minuteFmt.format(new Date(ms)).split(':').map(Number)
  return h * 60 + m
}

/** Strength sessions started within ±30 min of the time you planned for that day. */
export function onTimeSessions(sessions: WorkoutSession[], appointments: Appointment[]) {
  return sessions.filter((s) => {
    if (s.status !== 'done' || !isStrengthSlot(s.slot) || !earnsStrengthXP(s, sessions)) return false
    const a = appointments.find((x) => x.date === s.date)
    if (!a) return false
    const [h, m] = a.time.split(':').map(Number)
    return Math.abs(melbourneMinutes(s.startedAt) - (h * 60 + m)) <= ON_TIME.windowMin
  })
}
