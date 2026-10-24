// All dates in the app are plain local-date strings "YYYY-MM-DD" in Australia/Melbourne.
// Date maths is done on those strings via UTC midnight, so DST can never shift a day.

export const TIME_ZONE = 'Australia/Melbourne'

export type ISODate = string

const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Melbourne calendar date for a given instant. */
export function isoInMelbourne(instant: number | Date = Date.now()): ISODate {
  const parts = partsFmt.formatToParts(typeof instant === 'number' ? new Date(instant) : instant)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

// "Time travel" override for testing the plan before it starts (set from Settings).
let overrideToday: ISODate | null = null
export function setTodayOverride(d: ISODate | null) {
  overrideToday = d
}
export function getTodayOverride() {
  return overrideToday
}

export function today(): ISODate {
  return overrideToday ?? isoInMelbourne()
}

function toUTC(d: ISODate): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromUTC(toUTC(d) + n * 86_400_000)
}

/** b - a in whole days. */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000)
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function weekday(d: ISODate): number {
  const w = new Date(toUTC(d)).getUTCDay()
  return w === 0 ? 7 : w
}

export function mondayOf(d: ISODate): ISODate {
  return addDays(d, 1 - weekday(d))
}

export function rangeDays(start: ISODate, endInclusive: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let d = start; d <= endInclusive; d = addDays(d, 1)) out.push(d)
  return out
}

export function isBetween(d: ISODate, start: ISODate, endInclusive: ISODate) {
  return d >= start && d <= endInclusive
}

/** DD/MM/YYYY */
export function fmtDate(d: ISODate): string {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

/** DD/MM */
export function fmtShort(d: ISODate): string {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_NAMES_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function dayName(d: ISODate, long = false): string {
  return (long ? DAY_NAMES_LONG : DAY_NAMES)[weekday(d) - 1]
}

export function weekdayName(n: number, long = false): string {
  return (long ? DAY_NAMES_LONG : DAY_NAMES)[n - 1]
}

/** "Mon 16/11" */
export function fmtDay(d: ISODate): string {
  return `${dayName(d)} ${fmtShort(d)}`
}

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
