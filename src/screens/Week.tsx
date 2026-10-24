import { useState } from 'react'
import { RaidCard } from '../components/RaidCard'
import { Badge, Btn, H, NumField, Panel, Sheet, Stars, Toggle } from '../components/ui'
import { XP } from '../config/game'
import { PROGRAM } from '../config/program'
import { db } from '../db/db'
import { weekAvg } from '../lib/body'
import { exportBackup } from '../lib/backup'
import { addDays, dayName, fmtDate, fmtShort, mondayOf, weekday, type ISODate } from '../lib/dates'
import { getPhase, weekNumber } from '../lib/plan'
import { toggleTennis } from '../state/actions'
import { useApp } from '../state/app'
import { useFx } from '../state/fx'
import { WeekResults } from './WeekResults'

export function Week() {
  const { today, planFor, data, game } = useApp()
  const [ws, setWs] = useState(mondayOf(today))
  const [checkin, setCheckin] = useState(false)
  const [results, setResults] = useState<ISODate | null>(null)
  const plan = planFor(ws)
  const wr = game.weeks.find((w) => w.weekStart === ws)
  const phase = getPhase(addDays(ws, 3), data.settings.repeats)
  const end = addDays(ws, 6)
  const isPast = end < today
  const hasSat = plan.days[5].items.some((i) => i.slot === 'tennis' || i.slot === 'intervals') || plan.days[5].dropped.some((d) => d.item.slot === 'tennis' || d.item.slot === 'intervals')
  const tennisOn = !data.settings.tennisOff.includes(ws)
  const checked = data.checkins.some((c) => c.weekStart === ws)
  const canCheckin = !checked && (today >= end || (weekday(today) === 7 && mondayOf(today) === ws)) && plan.planned > 0

  const status = (date: ISODate, slot: string | undefined, kind: string, testId?: string) => {
    if (kind === 'rest') return 'rest'
    if (kind === 'test') return game.bossesBeaten.includes(testId!) ? 'done' : date < today ? 'missed' : 'todo'
    const done = data.sessions.some((s) => s.date === date && s.status === 'done' && (s.slot === slot || (s.replaces && s.replaces === slot)))
    if (done) return 'done'
    return date < today ? 'missed' : 'todo'
  }

  return (
    <div className="px-3 pt-safe pb-32">
      <div className="flex items-center gap-2 mt-2 mb-2">
        <button className="w-12 h-12 bg-panel-2 font-pixel" onClick={() => setWs(addDays(ws, -7))} aria-label="Previous week">
          ◀
        </button>
        <div className="flex-1 text-center">
          <div className="font-pixel text-[13px] text-accent">{ws < PROGRAM.start ? 'PRE-SEASON' : `WEEK ${weekNumber(ws)}`}</div>
          <div className="text-sm text-muted">
            {fmtShort(ws)}–{fmtShort(end)} · {phase.name}
          </div>
        </div>
        <button className="w-12 h-12 bg-panel-2 font-pixel" onClick={() => setWs(addDays(ws, 7))} aria-label="Next week">
          ▶
        </button>
      </div>
      {ws !== mondayOf(today) && (
        <button className="w-full text-sm text-muted underline mb-2" onClick={() => setWs(mondayOf(today))}>
          back to this week
        </button>
      )}

      {wr && plan.planned > 0 && (
        <Panel accent={wr.complete}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-pixel text-[10px] text-muted">STREAK TARGET</div>
              <div className="font-pixel text-[18px] mt-1">
                {wr.done}/{wr.required}
                <span className="text-muted text-[11px]"> of {wr.planned} planned</span>
              </div>
            </div>
            {wr.complete ? <Badge color="good">Secured 🔥</Badge> : wr.freezeUsed ? <Badge color="accent-2">Frozen ❄️</Badge> : isPast ? <Badge color="danger">Missed</Badge> : <Badge color="muted">In progress</Badge>}
          </div>
          {plan.busy && <div className="text-sm text-muted mt-1">🗓️ Busy week: minimum 3 sessions.</div>}
        </Panel>
      )}

      <Panel>
        {plan.days.map((d) => (
          <div key={d.date} className={`py-2 border-b border-edge/40 ${d.date === today ? 'bg-panel-2 -mx-3 px-3' : ''}`}>
            <div className="flex gap-3">
              <div className="w-12 shrink-0">
                <div className={`font-pixel text-[10px] ${d.date === today ? 'text-accent' : 'text-muted'}`}>{dayName(d.date).toUpperCase()}</div>
                <div className="text-xs text-muted">{fmtShort(d.date)}</div>
              </div>
              <div className="flex-1 min-w-0">
                {d.items.map((i, k) => {
                  const st = status(d.date, i.slot, i.kind, i.testId)
                  return (
                    <div key={k} className={`flex gap-2 items-center ${st === 'missed' ? 'text-danger/80' : st === 'rest' ? 'text-muted' : ''}`}>
                      <span className="font-pixel text-[10px] w-4">{st === 'done' ? '✓' : st === 'missed' ? '✗' : st === 'rest' ? '·' : '▸'}</span>
                      <span className={st === 'done' ? 'text-good' : ''}>
                        {i.label}
                        {i.movedFrom && <span className="text-xs text-muted"> (moved from {dayName(i.movedFrom)})</span>}
                      </span>
                    </div>
                  )
                })}
                {d.dropped.map((x, k) => (
                  <div key={`d${k}`} className="text-xs text-muted line-through">
                    {x.item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        {plan.unfit.length > 0 && <div className="text-sm text-muted mt-2">Couldn't fit this week: {plan.unfit.join(', ')}. Fresh start Monday!</div>}
        {hasSat && end >= today && <Toggle on={tennisOn} onChange={(on) => void toggleTennis(ws, on)} label={<span className="text-sm">🎾 Tennis on this week (else intervals)</span>} />}
      </Panel>

      {canCheckin && (
        <Panel accent>
          <div className="font-pixel text-[11px] text-xp mb-2">📋 SUNDAY CHECK-IN</div>
          <p className="text-sm mb-3">Review the week, log your Garmin numbers, back up your data. +{XP.checkin} XP.</p>
          <Btn variant="gold" className="w-full" onClick={() => setCheckin(true)}>
            Start check-in
          </Btn>
        </Panel>
      )}
      {checked && <CheckInSummary weekStart={ws} />}

      {wr && plan.planned > 0 && (
        <>
          <Panel>
            <H>Weekly quests</H>
            {wr.quests.map((q) => (
              <div key={q.id} className="flex justify-between py-1">
                <span className={q.done ? 'text-good' : ''}>
                  {q.done ? '✅' : '⬜'} {q.name}
                </span>
                <span className="text-sm text-muted">{q.progress}</span>
              </div>
            ))}
            <div className="text-xs text-muted mt-1">+{XP.weeklyQuest} XP each</div>
          </Panel>
          <RaidCard week={wr} />
        </>
      )}

      {wr && (isPast || checked) && plan.planned > 0 && (
        <Btn variant="ghost" className="w-full mt-2" onClick={() => setResults(ws)}>
          🏁 Week results
        </Btn>
      )}

      <Sheet open={checkin} onClose={() => setCheckin(false)} title={`Check-in · Week ${weekNumber(ws)}`}>
        <CheckInForm
          weekStart={ws}
          onDone={() => {
            setCheckin(false)
            setResults(ws)
          }}
        />
      </Sheet>
      {results && <WeekResults weekStart={results} onClose={() => setResults(null)} />}
    </div>
  )
}

function CheckInSummary({ weekStart }: { weekStart: ISODate }) {
  const { data } = useApp()
  const c = data.checkins.find((x) => x.weekStart === weekStart)!
  return (
    <Panel>
      <H>Check-in ✓</H>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <div className="text-muted text-xs">Energy</div>
          {c.energy}/5
        </div>
        <div>
          <div className="text-muted text-xs">Sleep</div>
          {c.sleep}/5
        </div>
        <div>
          <div className="text-muted text-xs">Soreness</div>
          {c.soreness}/5
        </div>
        <div>
          <div className="text-muted text-xs">Avg weight</div>
          {c.avgWeight ?? '–'} kg
        </div>
        <div>
          <div className="text-muted text-xs">Garmin sleep</div>
          {c.garminSleep ?? '–'} h
        </div>
        <div>
          <div className="text-muted text-xs">Resting HR</div>
          {c.restingHr ?? '–'}
        </div>
      </div>
      {c.notes && <p className="text-sm mt-2 text-muted">“{c.notes}”</p>}
    </Panel>
  )
}

function CheckInForm({ weekStart, onDone }: { weekStart: ISODate; onDone: () => void }) {
  const { data, today, game } = useApp()
  const fx = useFx()
  const wr = game.weeks.find((w) => w.weekStart === weekStart)
  const avg = weekAvg(data.daily, weekStart)
  const [energy, setEnergy] = useState(3)
  const [sleep, setSleep] = useState(3)
  const [soreness, setSoreness] = useState(3)
  const [garminSleep, setGarminSleep] = useState<number | null>(null)
  const [restingHr, setRestingHr] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [backedUp, setBackedUp] = useState(false)
  const last = data.settings.lastBackupAt

  const save = async () => {
    await db.checkins.put({
      weekStart,
      date: today,
      avgWeight: avg,
      sessionsDone: wr?.done ?? 0,
      sessionsPlanned: wr?.planned ?? 0,
      energy,
      sleep,
      soreness,
      garminSleep,
      restingHr,
      notes,
      createdAt: Date.now(),
    })
    fx.floatXP(XP.checkin, 'check-in')
    onDone()
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-bg-2 p-3 text-center">
          <div className="text-xs text-muted">Avg weight</div>
          <div className="font-pixel text-[14px] mt-1">{avg ?? '–'} kg</div>
        </div>
        <div className="bg-bg-2 p-3 text-center">
          <div className="text-xs text-muted">Sessions</div>
          <div className="font-pixel text-[14px] mt-1">
            {wr?.done ?? 0}/{wr?.planned ?? 6}
          </div>
        </div>
      </div>
      <Stars label="⚡ Energy (1 = drained, 5 = buzzing)" value={energy} onChange={setEnergy} />
      <Stars label="😴 Sleep quality" value={sleep} onChange={setSleep} />
      <Stars label="🦵 Soreness (1 = none, 5 = wrecked)" value={soreness} onChange={setSoreness} />
      <div className="flex gap-2 mb-3">
        <NumField label="Garmin avg sleep (h)" value={garminSleep} onChange={setGarminSleep} className="flex-1" />
        <NumField label="Resting HR (bpm)" value={restingHr} onChange={setRestingHr} decimal={false} className="flex-1" />
      </div>
      <label className="block mb-4">
        <span className="block text-sm text-muted mb-1">Notes</span>
        <textarea className="px-input !min-h-[90px] py-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Wins, niggles, what to change…" />
      </label>

      <div className="bg-bg-2 border-[3px] border-xp p-3 mb-4">
        <div className="font-pixel text-[10px] text-xp mb-1">💾 BACKUP REMINDER</div>
        <p className="text-sm text-muted mb-2">
          iPhone can clear website data. Save a backup to Files / iCloud Drive every Sunday.
          {last ? ` Last backup: ${fmtDate(new Date(last).toISOString().slice(0, 10))}.` : ' No backup yet!'}
        </p>
        <Btn
          variant={backedUp ? 'ghost' : 'gold'}
          small
          className="w-full"
          onClick={async () => {
            const r = await exportBackup()
            if (r !== 'cancelled') setBackedUp(true)
          }}
        >
          {backedUp ? 'Backed up ✓' : 'Back up now'}
        </Btn>
      </div>
      <Btn className="w-full" onClick={() => void save()}>
        Complete check-in (+{XP.checkin} XP)
      </Btn>
    </div>
  )
}
