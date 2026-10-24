import { describe, expect, it } from 'vitest'
import { addDays, diffDays, fmtDate, isoInMelbourne, mondayOf, weekday } from './dates'
import { basePlan, beachSlotOn, getPhase, weekNumber, type PlanSettings } from './plan'

const S: PlanSettings = {
  trainingDays: { LA: 1, UA: 2, LB: 4, UB: 5 },
  tennisOff: [],
  christmasMove: null,
  repeats: [],
}
const slots = (d: string, s = S) => basePlan(d, s).map((i) => i.slot ?? i.kind)

describe('dates (Australia/Melbourne)', () => {
  it('uses Melbourne local date, not UTC', () => {
    // 15 Nov 2026 14:30 UTC = 16 Nov 01:30 in Melbourne (AEDT, UTC+11)
    expect(isoInMelbourne(Date.UTC(2026, 10, 15, 14, 30))).toBe('2026-11-16')
    // 16 Nov 12:59 UTC = 16 Nov 23:59 Melbourne
    expect(isoInMelbourne(Date.UTC(2026, 10, 16, 12, 59))).toBe('2026-11-16')
    expect(isoInMelbourne(Date.UTC(2026, 10, 16, 13, 1))).toBe('2026-11-17')
  })
  it('does day maths across DST changes', () => {
    expect(addDays('2026-10-03', 2)).toBe('2026-10-05') // DST starts 4 Oct 2026
    expect(diffDays('2026-11-16', '2027-02-07')).toBe(83)
    expect(weekday('2026-11-16')).toBe(1)
    expect(weekday('2027-02-07')).toBe(7)
    expect(mondayOf('2026-12-27')).toBe('2026-12-21')
  })
  it('formats DD/MM/YYYY', () => {
    expect(fmtDate('2026-11-16')).toBe('16/11/2026')
  })
})

describe('program calendar', () => {
  it('has 12 weeks and the right phases', () => {
    expect(weekNumber('2026-11-16')).toBe(1)
    expect(weekNumber('2027-02-07')).toBe(12)
    expect(getPhase('2026-11-15').id).toBe('prestart')
    expect(getPhase('2026-12-06').id).toBe('foundation')
    expect(getPhase('2026-12-29').id).toBe('build')
    expect(getPhase('2026-12-30').id).toBe('beach')
    expect(getPhase('2027-01-14').id).toBe('push')
    expect(getPhase('2027-02-10').id).toBe('test')
    expect(getPhase('2027-02-14').id).toBe('post')
  })

  it('follows the weekly template with odd/even cardio', () => {
    expect(slots('2026-11-16')).toEqual(['test', 'LA'])
    expect(slots('2026-11-17')).toEqual(['UA'])
    expect(basePlan('2026-11-25', S).find((i) => i.slot === 'cardio')!.mode).toBe('swim')
    expect(slots('2026-11-19')).toEqual(['LB'])
    expect(slots('2026-11-20')).toEqual(['UB'])
    expect(slots('2026-11-21')).toEqual(['tennis'])
    expect(slots('2026-11-22')).toEqual(['rest'])
  })

  it('switches Saturday to intervals when tennis is off, rotating', () => {
    const s = { ...S, tennisOff: ['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'] }
    const labels = ['2026-11-21', '2026-11-28', '2026-12-05', '2026-12-12'].map((d) => basePlan(d, s)[0].label)
    expect(labels[0]).toMatch(/Hill/)
    expect(labels[1]).toMatch(/Bike/)
    expect(labels[2]).toMatch(/Swim/)
    expect(labels[3]).toMatch(/Hill/)
  })

  it('moves Christmas Upper B to Sat 26 Dec when chosen', () => {
    expect(slots('2026-12-25')).toEqual(['UB'])
    const s = { ...S, christmasMove: 'move' as const }
    expect(slots('2026-12-25', s)).toEqual(['rest'])
    expect(slots('2026-12-26', s)).toEqual(['UB'])
  })

  it('runs the beach block A/B from Wed 30 Dec', () => {
    expect(slots('2026-12-28')).toEqual(['LA'])
    expect(slots('2026-12-29')).toEqual(['UA'])
    const beach = ['2026-12-30', '2027-01-01', '2027-01-04', '2027-01-06', '2027-01-08', '2027-01-11'].map(beachSlotOn)
    expect(beach).toEqual(['BA', 'BB', 'BA', 'BB', 'BA', 'BB'])
    expect(slots('2027-01-05')).toEqual(['beachRun'])
    expect(slots('2027-01-02')).toEqual(['sprints'])
    expect(slots('2026-12-31')).toEqual(['rest'])
    expect(basePlan('2027-01-13', S)[0].label).toMatch(/Travel/)
    expect(slots('2027-01-14')).toEqual(['LB'])
    expect(slots('2027-01-15')).toEqual(['UB'])
  })

  it('has test days and test week', () => {
    expect(slots('2026-12-23')).toEqual(['test'])
    expect(basePlan('2026-12-23', S)[0].counts).toBe(true)
    expect(slots('2026-11-18')).toEqual(['test'])
    expect(slots('2027-02-08')).toEqual(['test'])
    expect(slots('2027-02-09')).toEqual(['rest'])
    expect(slots('2027-02-10')).toEqual(['test'])
    expect(basePlan('2027-02-12', S)[0].label).toMatch(/pack/)
  })

  it('supports repeat Push cycles after the plan', () => {
    const s = { ...S, repeats: ['2027-02-15'] }
    expect(getPhase('2027-02-15', s.repeats).id).toBe('repeat')
    expect(slots('2027-02-15', s)).toEqual(['LA'])
    expect(slots(addDays('2027-02-15', 28), s)).toEqual(['test'])
  })
})
