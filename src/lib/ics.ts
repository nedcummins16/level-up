// Builds a standard .ics calendar file so your sessions (with reminders) land in the
// iPhone Calendar app: the free stand-in for push notifications.

import type { ISODate } from './dates'

export interface CalEvent {
  uid: string
  date: ISODate
  time: string // "HH:MM" Melbourne time
  minutes: number
  title: string
  location?: string
  description?: string
  /** Minutes before the start to alert (one alarm each). */
  alarms?: number[]
}

// Australia/Melbourne: AEDT (+11) from 1st Sunday of October 2am, AEST (+10) from 1st Sunday of April 3am.
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Australia/Melbourne',
  'BEGIN:STANDARD',
  'DTSTART:19700405T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU',
  'TZOFFSETFROM:+1100',
  'TZOFFSETTO:+1000',
  'TZNAME:AEST',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19701004T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=1SU',
  'TZOFFSETFROM:+1000',
  'TZOFFSETTO:+1100',
  'TZNAME:AEDT',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
]

export function escapeText(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Fold lines longer than 75 octets (RFC 5545). */
export function fold(line: string): string {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const parts: string[] = []
  let cur = ''
  let curBytes = 0
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length
    const limit = parts.length === 0 ? 75 : 74 // continuation lines start with a space
    if (curBytes + b > limit) {
      parts.push(cur)
      cur = ''
      curBytes = 0
    }
    cur += ch
    curBytes += b
  }
  parts.push(cur)
  return parts.join('\r\n ')
}

function localStamp(date: ISODate, time: string, addMinutes = 0) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  // Pure wall-clock arithmetic (no time zones involved).
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm + addMinutes))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}T${p(t.getUTCHours())}${p(t.getUTCMinutes())}00`
}

function utcStamp(ms: number) {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function buildICS(events: CalEvent[], now = Date.now()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Level Up//Training Plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Level Up', ...VTIMEZONE]
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART;TZID=Australia/Melbourne:${localStamp(e.date, e.time)}`,
      `DTEND;TZID=Australia/Melbourne:${localStamp(e.date, e.time, e.minutes)}`,
      `SUMMARY:${escapeText(e.title)}`,
    )
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`)
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`)
    for (const a of e.alarms ?? []) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(e.title)}`, `TRIGGER:-PT${a}M`, 'END:VALARM')
    }
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

/**
 * Hand the .ics to iOS. Safari shows "Add All to Calendar" for a text/calendar file.
 * Returns how it was delivered so the UI can explain the next step.
 */
export async function deliverICS(ics: string, filename: string): Promise<'opened' | 'shared' | 'cancelled'> {
  const file = new File([ics], filename, { type: 'text/calendar' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
  // In the installed app, opening a file URL can strand you, so use the share sheet.
  if (standalone && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Level Up sessions' })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'opened'
}
