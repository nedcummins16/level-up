import { useState } from 'react'
import { db } from '../db/db'
import type { Appointment } from '../db/types'
import { appointmentFor, fmtTime } from '../lib/appointments'
import { calendarEvents } from '../lib/calendarEvents'
import { addDays, fmtDay, type ISODate } from '../lib/dates'
import { buildICS, deliverICS } from '../lib/ics'
import type { PlanItem } from '../lib/plan'
import { useApp } from '../state/app'
import { Btn, Sheet } from './ui'

function trainingItems(items: PlanItem[]) {
  return items.filter((i) => i.counts || i.kind === 'test')
}

/** "🕓 4pm · Uni gym ✎" (tap to edit). */
export function TimePlace({ date, items }: { date: ISODate; items: PlanItem[] }) {
  const { data } = useApp()
  const [open, setOpen] = useState(false)
  const t = trainingItems(items)
  if (!t.length) return null
  const a = appointmentFor(date, t, data.appointments, data.settings)
  const planned = data.appointments.some((x) => x.date === date)
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-sm min-h-[36px] text-left" aria-label="Edit time and place">
        <span>🕓</span>
        <span className={planned ? 'text-ink' : 'text-muted'}>
          {fmtTime(a.time)}
          {a.place ? ` · ${a.place}` : ''}
        </span>
        <span className="text-muted text-xs">✎</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`When & where · ${fmtDay(date)}`}>
        <AppointmentForm initial={a} onDone={() => setOpen(false)} />
      </Sheet>
    </>
  )
}

function AppointmentForm({ initial, onDone }: { initial: Appointment; onDone: () => void }) {
  const [time, setTime] = useState(initial.time)
  const [place, setPlace] = useState(initial.place)
  return (
    <div>
      <p className="text-sm text-muted mb-3">Deciding exactly when and where makes you far more likely to go.</p>
      <label className="block mb-3">
        <span className="block text-sm text-muted mb-1">Time</span>
        <input type="time" className="px-input" value={time} onChange={(e) => setTime(e.target.value)} />
      </label>
      <label className="block mb-4">
        <span className="block text-sm text-muted mb-1">Place</span>
        <input className="px-input" value={place} placeholder="e.g. Uni gym" onChange={(e) => setPlace(e.target.value)} />
      </label>
      <Btn
        className="w-full"
        disabled={!time}
        onClick={async () => {
          await db.appointments.put({ date: initial.date, time, place: place.trim() })
          onDone()
        }}
      >
        Save
      </Btn>
    </div>
  )
}

export interface DraftAppt {
  date: ISODate
  time: string
  place: string
  label: string
}

/** Editable list of a week's training days (used in the Sunday check-in). */
export function useWeekDraft(weekStart: ISODate) {
  const { data, planFor } = useApp()
  const plan = planFor(weekStart)
  const [draft, setDraft] = useState<DraftAppt[]>(() =>
    plan.days
      .map((d) => ({ d, t: trainingItems(d.items) }))
      .filter(({ t }) => t.length > 0)
      .map(({ d, t }) => ({ ...appointmentFor(d.date, t, data.appointments, data.settings), label: t.map((i) => i.label).join(' + ') })),
  )
  return { draft, setDraft }
}

export function WeekPlanner({ draft, setDraft }: { draft: DraftAppt[]; setDraft: (d: DraftAppt[]) => void }) {
  const upd = (i: number, patch: Partial<DraftAppt>) => setDraft(draft.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  return (
    <div>
      {draft.map((a, i) => (
        <div key={a.date} className="py-2 border-b border-edge/40">
          <div className="text-sm">
            <span className="font-pixel text-[9px] text-accent mr-2">{fmtDay(a.date).toUpperCase()}</span>
            {a.label}
          </div>
          <div className="flex gap-2 mt-1">
            <input type="time" className="px-input !min-h-[44px] !w-[120px]" value={a.time} onChange={(e) => upd(i, { time: e.target.value })} aria-label={`${fmtDay(a.date)} time`} />
            <input className="px-input !min-h-[44px] flex-1" value={a.place} placeholder="Where?" onChange={(e) => upd(i, { place: e.target.value })} aria-label={`${fmtDay(a.date)} place`} />
          </div>
        </div>
      ))}
    </div>
  )
}

export async function saveDraft(draft: DraftAppt[]) {
  await db.appointments.bulkPut(draft.map(({ date, time, place }) => ({ date, time, place: place.trim() })))
}

/** Build the .ics for some weeks (with optional unsaved times) and hand it to iOS. */
export function useCalendarExport() {
  const { data, planFor, today } = useApp()
  return async (weekStarts: ISODate[], overrides: DraftAppt[] = [], name = 'level-up') => {
    const appts = [...overrides.map(({ date, time, place }) => ({ date, time, place })), ...data.appointments.filter((a) => !overrides.some((o) => o.date === a.date))]
    const events = calendarEvents(weekStarts.map(planFor), appts, data.settings, today)
    if (!events.length) {
      alert('No upcoming sessions to add.')
      return 'cancelled' as const
    }
    return deliverICS(buildICS(events), `${name}.ics`)
  }
}

export function AddToCalendar({ weekStarts, label, name }: { weekStarts: ISODate[]; label: string; name: string }) {
  const exportCal = useCalendarExport()
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <div>
      <Btn
        variant="ghost"
        className="w-full"
        onClick={async () => {
          const r = await exportCal(weekStarts, [], name)
          setMsg(r === 'opened' ? 'Opened: tap "Add All" to put them in your Calendar.' : r === 'shared' ? 'Shared: pick Calendar, or Save to Files → open → Add All.' : null)
        }}
      >
        📅 {label}
      </Btn>
      {msg && <p className="text-xs text-muted mt-1">{msg}</p>}
    </div>
  )
}

export function nextWeekStart(weekStart: ISODate) {
  return addDays(weekStart, 7)
}
