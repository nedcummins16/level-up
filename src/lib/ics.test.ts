import { describe, expect, it } from 'vitest'
import { defaultSettings } from '../db/db'
import { appointmentFor, fmtTime } from './appointments'
import { alarmsFor, calendarEvents } from './calendarEvents'
import { buildICS, escapeText, fold } from './ics'
import { planWeek } from './schedule'

const settings = defaultSettings()
const ps = { trainingDays: settings.trainingDays, tennisOff: [], christmasMove: null, repeats: [] }

describe('calendar export', () => {
  it('formats times', () => {
    expect(fmtTime('16:00')).toBe('4pm')
    expect(fmtTime('06:30')).toBe('6:30am')
    expect(fmtTime('12:00')).toBe('12pm')
    expect(fmtTime('00:15')).toBe('12:15am')
  })

  it('reminds you the night before at 8pm and 1 hour before', () => {
    expect(alarmsFor('16:00')).toEqual([60, 1200]) // 20 hours before 4pm = 8pm previous day
    expect(alarmsFor('06:30')).toEqual([60, 630])
  })

  it('uses your planned time/place, else defaults (tennis at 1pm)', () => {
    const w = planWeek('2026-11-23', { today: '2026-11-23', settings: ps, sessions: [], life: [] })
    const sat = w.days[5]
    expect(appointmentFor(sat.date, sat.items, [], settings)).toMatchObject({ time: '13:00', place: 'Tennis courts' })
    const mon = w.days[0]
    expect(appointmentFor(mon.date, mon.items, [{ date: mon.date, time: '07:00', place: 'Uni gym' }], settings)).toMatchObject({ time: '07:00', place: 'Uni gym' })
  })

  it('builds a valid .ics week with one event per training day', () => {
    const w = planWeek('2026-11-23', { today: '2026-11-23', settings: ps, sessions: [], life: [] })
    const events = calendarEvents([w], [], settings, '2026-11-23')
    expect(events.map((e) => e.date)).toEqual(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28'])
    const ics = buildICS(events, Date.UTC(2026, 10, 22))
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('TZID:Australia/Melbourne')
    expect(ics).toContain('DTSTART;TZID=Australia/Melbourne:20261123T160000')
    expect(ics).toContain('DTEND;TZID=Australia/Melbourne:20261123T171500')
    expect(ics).toContain('TRIGGER:-PT60M')
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(6)
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
  })

  it('crosses midnight correctly for late sessions', () => {
    const ics = buildICS([{ uid: 'x', date: '2026-12-31', time: '23:30', minutes: 75, title: 'Late' }])
    expect(ics).toContain('DTEND;TZID=Australia/Melbourne:20270101T004500')
  })

  it('escapes and folds text', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne')
    const long = 'DESCRIPTION:' + 'x'.repeat(200)
    const folded = fold(long)
    expect(folded.split('\r\n ').join('')).toBe(long)
    expect(folded.split('\r\n').every((l) => l.length <= 75)).toBe(true)
  })
})
