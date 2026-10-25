import { describe, expect, it } from 'vitest'
import { LOOT } from '../config/game'
import type { WorkoutSession } from '../db/types'
import { addDays } from './dates'
import { computeLoot, dropSessions, melbourneMinutes, onTimeSessions, rarityOf, specialGearUnlocked } from './loot'

let n = 1
const s = (date: string, slot: WorkoutSession['slot'] = 'LA', startedAt = n++): WorkoutSession => ({
  id: n,
  date,
  slot,
  status: 'done',
  startedAt,
  modifiers: [],
  multiplier: 1,
  reduced: false,
  warmupDone: [],
  exercises: [],
})

/** A full week: 4 gym + cardio + tennis. */
const week = (mon: string) => [s(mon, 'LA'), s(addDays(mon, 1), 'UA'), s(addDays(mon, 2), 'cardio'), s(addDays(mon, 3), 'LB'), s(addDays(mon, 4), 'UB'), s(addDays(mon, 5), 'tennis')]

describe('loot drops', () => {
  it('one drop per planned session, same result every time (deterministic)', () => {
    const sessions = week('2026-11-16')
    const a = computeLoot(sessions, [])
    const b = computeLoot([...sessions].reverse(), [])
    expect(a.drops).toHaveLength(6)
    expect(a.drops.map((d) => d.itemId)).toEqual(b.drops.map((d) => d.itemId))
  })

  it('extra sessions earn nothing: max 4 gym drops and 6 total a week', () => {
    const sessions = [...week('2026-11-16'), s('2026-11-21', 'LA'), s('2026-11-22', 'UA'), s('2026-11-22', 'cardio')]
    expect(dropSessions(sessions)).toHaveLength(6)
  })

  it('pity timer: never more than 3 commons in a row', () => {
    const sessions = Array.from({ length: 12 }, (_, i) => week(addDays('2026-11-16', i * 7))).flat()
    const { drops } = computeLoot(sessions, [])
    let run = 0
    for (const d of drops) {
      run = d.rarity === 'common' ? run + 1 : 0
      expect(run).toBeLessThanOrEqual(LOOT.pity)
    }
    expect(drops.some((d) => d.rarity !== 'common')).toBe(true)
  })

  it('raid chests are always rare or better', () => {
    const weeks = Array.from({ length: 12 }, (_, i) => addDays('2026-11-16', i * 7))
    const { drops } = computeLoot([], weeks)
    expect(drops).toHaveLength(12)
    expect(drops.every((d) => d.source === 'chest' && d.rarity !== 'common')).toBe(true)
  })

  it('duplicates are flagged and items match their rarity', () => {
    const sessions = Array.from({ length: 12 }, (_, i) => week(addDays('2026-11-16', i * 7))).flat()
    const { drops, owned } = computeLoot(sessions, [])
    for (const d of drops) expect(rarityOf(d.itemId)).toBe(d.rarity)
    const dupes = drops.filter((d) => d.duplicate).length
    const total = Object.values(owned).reduce((a, b) => a + b, 0)
    expect(total).toBe(drops.length)
    expect(dupes).toBe(drops.length - Object.keys(owned).length)
  })
})

describe('special gear', () => {
  it('unlocks from best streak and completed sets', () => {
    expect(specialGearUnlocked(0, [])).toEqual([])
    expect(specialGearUnlocked(4, [])).toEqual(['wristbands-streak', 'flame-shoes'])
    expect(specialGearUnlocked(12, ['gymbag'])).toContain('jacket-champ')
    expect(specialGearUnlocked(0, ['gymbag', 'legends'])).toEqual(['backpack', 'aura-legend'])
  })
})

describe('on-time bonus', () => {
  it('Melbourne clock time from an instant (AEDT in November)', () => {
    // 16 Nov 2026 05:00 UTC = 16:00 Melbourne (UTC+11)
    expect(melbourneMinutes(Date.UTC(2026, 10, 16, 5, 0))).toBe(16 * 60)
  })

  it('counts gym sessions started within 30 min of the planned time', () => {
    const appts = [{ date: '2026-11-16', time: '16:00', place: 'Gym' }, { date: '2026-11-17', time: '16:00', place: 'Gym' }]
    const onTime = s('2026-11-16', 'LA', Date.UTC(2026, 10, 16, 5, 20)) // 4:20pm
    const late = s('2026-11-17', 'UA', Date.UTC(2026, 10, 17, 6, 0)) // 5:00pm
    const unplanned = s('2026-11-19', 'LB', Date.UTC(2026, 10, 19, 5, 0))
    expect(onTimeSessions([onTime, late, unplanned], appts).map((x) => x.date)).toEqual(['2026-11-16'])
  })
})
