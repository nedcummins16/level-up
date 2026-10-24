import { describe, expect, it } from 'vitest'
import type { CheckIn, LifeEvent } from '../db/types'
import { roughWeek, suggestLightWeek } from './coach'

const ci = (weekStart: string, energy: number, sleep = 3, soreness = 3): CheckIn => ({
  weekStart,
  date: weekStart,
  avgWeight: null,
  sessionsDone: 4,
  sessionsPlanned: 6,
  energy,
  sleep,
  soreness,
  garminSleep: null,
  restingHr: null,
  notes: '',
  createdAt: 0,
})

describe('light week suggestion', () => {
  it('detects rough weeks', () => {
    expect(roughWeek(ci('2026-11-16', 2))).toBe(true)
    expect(roughWeek(ci('2026-11-16', 3, 3, 4))).toBe(true)
    expect(roughWeek(ci('2026-11-16', 3, 3, 3))).toBe(false)
  })

  it('suggests a light week after two rough check-ins in a row', () => {
    const checkins = [ci('2026-11-23', 2), ci('2026-11-30', 3, 2)]
    expect(suggestLightWeek(checkins, [], '2026-12-08', [])).toBe(true)
    expect(suggestLightWeek([ci('2026-11-30', 2)], [], '2026-12-08', [])).toBe(false)
  })

  it("respects 'I'm good' and an existing light week, and skips the beach block", () => {
    const checkins = [ci('2026-11-23', 2), ci('2026-11-30', 2)]
    expect(suggestLightWeek(checkins, [], '2026-12-08', ['2026-12-07'])).toBe(false)
    const life: LifeEvent[] = [{ type: 'runDown', start: '2026-12-07', end: '2026-12-13', createdAt: 0 }]
    expect(suggestLightWeek(checkins, life, '2026-12-08', [])).toBe(false)
    expect(suggestLightWeek([ci('2026-12-21', 2), ci('2026-12-28', 2)], [], '2027-01-05', [])).toBe(false)
  })
})
