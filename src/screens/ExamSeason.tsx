// Exam pre-season screens (Mon 26 Oct - Sun 15 Nov 2026).
// Tone: calm. Exams first, study and sleep second, training a distant third.
// Nothing here can cost XP or break a streak.

import { useMemo, useState } from 'react'
import { FeelItButton } from '../components/FeelIt'
import { MobilityCard } from '../components/MobilityCard'
import { Badge, Btn, Check, H, NumField, Panel, Sheet, Toggle } from '../components/ui'
import { ACHIEVEMENTS, PRESEASON_XP } from '../config/game'
import { EXERCISES, PRESEASON, PRESTART_CHECKLIST, PROGRAM, SESSIONS } from '../config/program'
import type { Exam, PreseasonItem, PreseasonSlot } from '../config/types'
import { updateSettings } from '../db/db'
import { fmtTime } from '../lib/appointments'
import { addDays, dayName, fmtDay, fmtShort, mondayOf, rangeDays, type ISODate } from '../lib/dates'
import { isTennisOn } from '../lib/plan'
import {
  daysUntil,
  examById,
  examOn,
  fmtExamWhen,
  gymCheck,
  isPreseason,
  nextExam,
  nextPreseasonSlot,
  PRESEASON_SESSION_COUNT,
  preseasonDay,
  preseasonSessionsDone,
  preseasonStartWeights,
  walkedOn,
  type GymCheck,
} from '../lib/preseason'
import { buildSession, repsLabel, restLabel } from '../lib/session'
import { deleteSession, logCardio, logWalk, patchDaily, setExamDefeated, setPreseasonTask, startStrength, toggleTennis } from '../state/actions'
import { useApp } from '../state/app'
import { useFx } from '../state/fx'

const inDays = (n: number) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`)

// ---------------------------------------------------------------------------
//  Today tab
// ---------------------------------------------------------------------------
export function ExamSeason() {
  const { today, data } = useApp()
  const day = preseasonDay(today)!
  const examToday = examOn(today)
  const examTomorrow = examOn(addDays(today, 1))
  const [walkInstead, setWalkInstead] = useState(false)
  const hasSession = day.items.some((i) => i.kind === 'session')
  const hasWalk = day.items.some((i) => i.kind === 'walk')
  // "In bed by 10pm" lives on the Bed card when it's showing.
  const note = day.note
    ?.split(';')
    .map((x) => x.trim())
    .filter((x) => !(examTomorrow && /bed by 10pm/i.test(x)))
    .join('; ')

  return (
    <div className="px-3 pt-safe pb-32">
      <header className="mb-2 pt-1">
        <div className="font-pixel text-[15px] text-muted">{fmtDay(today).toUpperCase()}</div>
        <div className="font-pixel text-[22px] text-accent mt-1">EXAM SEASON</div>
        <div className="text-sm text-muted mt-1">Exams come first. Training is light and always optional.</div>
      </header>

      {today === PRESEASON.end && (
        <Panel accent>
          <PreseasonSummary />
        </Panel>
      )}
      {examToday && <ExamDayCard exam={examToday} />}
      {examTomorrow && <BedCard exam={examTomorrow} />}
      <Countdowns />
      {note && <div className="text-sm text-muted px-1 mb-3">📝 {note}</div>}

      {day.items.map((item, i) => (
        <DayItem key={i} item={item} date={today} onWalk={() => setWalkInstead(true)} />
      ))}
      {walkInstead && !hasWalk && <WalkCard date={today} label="Walk instead of the gym" />}
      {!hasSession && !examToday && !data.sessions.some((s) => s.date === today && s.status === 'done' && (s.slot === 'PA' || s.slot === 'PB')) && (
        <TrainAnyway onWalk={() => setWalkInstead(true)} />
      )}

      <ExamBosses />
      <StartWeightsReview defaultOpen={today >= '2026-11-13'} />
      <BeforeWeek1 />
    </div>
  )
}

function DayItem({ item, date, onWalk }: { item: PreseasonItem; date: ISODate; onWalk: () => void }) {
  switch (item.kind) {
    case 'exam':
      return null // shown by the exam-day card
    case 'session':
      return <PreseasonSessionCard slot={item.slot} date={date} label={item.label} onWalk={onWalk} />
    case 'walk':
      return <WalkCard date={date} label={item.label} optional={item.optional} />
    case 'mobility':
      return <MobilityCard date={date} gymDay={false} />
    case 'tennis':
      return <TennisCard date={date} />
    case 'task':
      return <TaskCard id={item.id} label={item.label} />
    case 'rest':
      return (
        <Panel>
          <div className="font-pixel text-[16px] text-accent-2">😌 {(item.label ?? 'Rest').toUpperCase()}</div>
          <p className="text-sm text-muted mt-1">Rest counts. Study, eat well, sleep.</p>
        </Panel>
      )
  }
}

// ---------------------------------------------------------------------------
//  Exam cards + countdowns
// ---------------------------------------------------------------------------
export function ExamDayCard({ exam }: { exam: Exam }) {
  const { data } = useApp()
  const fx = useFx()
  const beaten = data.settings.examsDefeated.includes(exam.id)
  return (
    <Panel className="!bg-panel-2 text-center py-5">
      <div className="text-4xl mb-2">{exam.bossEmoji}</div>
      <div className="font-pixel text-[13px] tracking-[0.2em] text-muted">EXAM DAY</div>
      <div className="font-pixel text-[24px] leading-tight mt-1">{exam.name.toUpperCase()}</div>
      <div className="text-lg mt-1">
        {fmtTime(exam.start)}-{fmtTime(exam.end)}
      </div>
      <p className="mt-3">Good breakfast, walk after.</p>
      <p className="text-sm text-muted mt-1">No training today. You've prepared for this.</p>
      <div className="mt-4">
        {beaten ? (
          <Badge color="good">{exam.boss} defeated · +{PRESEASON_XP.examBoss} XP</Badge>
        ) : (
          <Btn
            variant="ghost"
            className="w-full"
            onClick={() => {
              void setExamDefeated(exam.id, true)
              fx.celebrate({ kind: 'boss', title: `${exam.boss} defeated`, sub: `${exam.name} done. Go for a walk and rest up.`, icon: exam.bossEmoji, xp: PRESEASON_XP.examBoss })
            }}
          >
            I sat it: defeat the boss (+{PRESEASON_XP.examBoss} XP)
          </Btn>
        )}
      </div>
    </Panel>
  )
}

function BedCard({ exam }: { exam: Exam }) {
  return (
    <Panel className="!bg-[linear-gradient(180deg,#1b1640,var(--panel))]">
      <div className="flex items-center gap-3">
        <div className="text-4xl">🌙</div>
        <div className="flex-1">
          <div className="font-pixel text-[18px] text-accent-2">BED BY 10PM</div>
          <div className="text-sm">
            {exam.name} tomorrow at {fmtTime(exam.start)}. Pack your bag tonight, screens off at 9:30.
          </div>
        </div>
      </div>
    </Panel>
  )
}

function Countdowns() {
  const { today } = useApp()
  const next = nextExam(today)
  const w1 = daysUntil(today, PROGRAM.start)
  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      <div className="px-box p-3">
        <div className="font-pixel text-[11px] tracking-[0.18em] text-muted">NEXT EXAM</div>
        {next ? (
          <>
            <div className="font-pixel text-[17px] leading-tight mt-1">{next.name.toUpperCase()}</div>
            <div className="text-xs text-muted mt-1">{fmtExamWhen(next)}</div>
            <div className="text-sm text-accent mt-1">{inDays(daysUntil(today, next.date))}</div>
          </>
        ) : (
          <div className="font-pixel text-[15px] leading-tight mt-1 text-good">ALL DONE 🎓</div>
        )}
      </div>
      <div className="px-box p-3">
        <div className="font-pixel text-[11px] tracking-[0.18em] text-muted">WEEK 1</div>
        <div className="font-pixel text-[30px] leading-tight mt-1">{w1}</div>
        <div className="text-xs text-muted">{w1 === 1 ? 'day' : 'days'} · Mon {fmtShort(PROGRAM.start)}</div>
      </div>
    </div>
  )
}

/** All five exam bosses. Mark one defeated after you've sat it. */
function ExamBosses() {
  const { data, today } = useApp()
  const fx = useFx()
  const beaten = data.settings.examsDefeated
  const n = PRESEASON.exams.filter((e) => beaten.includes(e.id)).length
  return (
    <Panel>
      <div className="flex justify-between items-center">
        <H className="!mb-1">Exam bosses</H>
        <span className="font-pixel text-[13px] text-muted">{n}/5</span>
      </div>
      <p className="text-xs text-muted mb-2">
        Sat an exam? Mark it defeated: +{PRESEASON_XP.examBoss} XP. All five = 🎓 Exam Slayer. No scores, ever.
      </p>
      {PRESEASON.exams.map((e) => {
        const done = beaten.includes(e.id)
        const open = e.date <= today
        return (
          <div key={e.id} className="flex items-center gap-3 py-1.5 border-b border-edge/40">
            <span className={`text-2xl w-8 text-center ${done ? 'grayscale opacity-60' : ''}`}>{e.bossEmoji}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${done ? 'line-through text-muted' : ''}`}>{e.boss}</div>
              <div className="text-xs text-muted">
                {e.name} · {dayName(e.date)} {fmtShort(e.date)} {fmtTime(e.start)}
              </div>
            </div>
            {done ? (
              <button
                className="text-xs text-good min-h-[44px] px-1"
                onClick={() => {
                  if (confirm(`Un-mark ${e.name}?`)) void setExamDefeated(e.id, false)
                }}
              >
                ✓ defeated
              </button>
            ) : open ? (
              <Btn
                small
                variant="ghost"
                onClick={() => {
                  void setExamDefeated(e.id, true)
                  fx.celebrate({ kind: 'boss', title: `${e.boss} defeated`, sub: `${e.name} done.`, icon: e.bossEmoji, xp: PRESEASON_XP.examBoss })
                }}
              >
                I sat it
              </Btn>
            ) : (
              <span className="text-xs text-muted">{inDays(daysUntil(today, e.date))}</span>
            )}
          </div>
        )
      })}
    </Panel>
  )
}

// ---------------------------------------------------------------------------
//  Sessions, walks, tennis, tasks
// ---------------------------------------------------------------------------

/** "Maybe walk instead?" before starting a gym session on an exam day or the day before. */
function useGymGuard(onWalk?: () => void) {
  const [pending, setPending] = useState<{ check: Extract<GymCheck, { ok: false }>; go: () => void } | null>(null)
  const guard = (date: ISODate, go: () => void) => {
    const c = gymCheck(date)
    if (c.ok) go()
    else setPending({ check: c, go })
  }
  const sheet = (
    <Sheet open={!!pending} onClose={() => setPending(null)} title={pending?.check.title}>
      <div className="text-5xl text-center mb-3">🚶</div>
      <p className="mb-4">{pending?.check.message}</p>
      <Btn
        className="w-full mb-2"
        onClick={() => {
          setPending(null)
          onWalk?.()
        }}
      >
        Good idea, I'll walk
      </Btn>
      <Btn
        variant="ghost"
        className="w-full"
        onClick={() => {
          pending?.go()
          setPending(null)
        }}
      >
        Train anyway
      </Btn>
    </Sheet>
  )
  return { guard, sheet }
}

function PreseasonSessionCard({ slot, date, label, onWalk }: { slot: PreseasonSlot; date: ISODate; label?: string; onWalk?: () => void }) {
  const app = useApp()
  const plan = useMemo(() => buildSession(slot, app.sessionCtx(date)), [slot, app, date])
  const [open, setOpen] = useState(false)
  const { guard, sheet } = useGymGuard(onWalk)
  const done = app.data.sessions.find((s) => s.date === date && s.slot === slot && s.status === 'done')
  const active = app.data.sessions.find((s) => s.status === 'active')
  const skipped = !!app.data.daily.find((d) => d.date === date)?.studySkip
  const first = preseasonSessionsDone(app.data.sessions).length === 0 && !done

  if (skipped && !done)
    return (
      <Panel className="!bg-panel-2">
        <div className="font-pixel text-[15px]">📚 {(label ?? plan.name).toUpperCase()}: SKIPPED FOR STUDY</div>
        <p className="text-sm text-muted mt-1">Good call. Nothing lost: no XP taken, no streak touched.</p>
        <button className="text-sm text-muted underline min-h-[44px]" onClick={() => void patchDaily(date, { studySkip: false })}>
          undo
        </button>
      </Panel>
    )

  return (
    <Panel accent={!done}>
      <div className="flex items-start gap-3">
        <div className="text-3xl">🏋️</div>
        <div className="flex-1 min-w-0">
          <div className="font-pixel text-[18px] text-accent leading-relaxed">{(label ?? plan.name).toUpperCase()}</div>
          <div className="text-sm text-muted">~40 min · 2 easy sets · {PRESEASON.rir} · 90 s rest</div>
        </div>
        {done && <Badge color="good">+{PRESEASON_XP.session} XP</Badge>}
      </div>

      {first && (
        <div className="bg-bg-2 border-l-4 border-xp p-2 my-2 text-sm">
          👋 First session! {PRESEASON.firstSessionTip}
        </div>
      )}

      <button className="w-full text-left text-sm text-muted min-h-[40px]" onClick={() => setOpen(!open)}>
        {open ? '▲ hide details' : '▼ warm-up + exercises'}
      </button>
      {open && (
        <div className="text-sm space-y-1 mb-2">
          <div className="text-muted font-pixel text-[12px] mt-1">WARM-UP</div>
          {plan.warmup.map((w) => (
            <div key={w}>· {w}</div>
          ))}
          <div className="text-muted font-pixel text-[12px] mt-3">EXERCISES</div>
          {plan.exercises.map((e, i) => (
            <div key={i} className="py-1 border-b border-edge/40">
              <div className="flex justify-between gap-2 items-center">
                <span className="flex items-center gap-2 min-w-0">
                  <FeelItButton ex={e.ex} name={e.name} variant="compact" />
                  <span>
                    {i + 1}. {e.name}
                  </span>
                </span>
                <span className="text-muted whitespace-nowrap">
                  {e.sets}×{repsLabel(e.reps, e.perSide, e.timed)} · {restLabel(e.rest)}
                </span>
              </div>
              <div className="flex justify-between gap-2 text-xs text-muted">
                <span>{e.equipment === 'assisted' ? 'Log assistance kg' : e.suggestion.message}</span>
                {e.suggestion.weight !== null && !['plyo', 'timed', 'bodyweight'].includes(e.equipment) && (
                  <span className="text-xp whitespace-nowrap">
                    {e.suggestion.weight} kg{e.equipment === 'assisted' ? ' assist' : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!done && (
        <div className="flex gap-2">
          <Btn
            className="flex-1"
            disabled={!!active}
            onClick={() =>
              guard(date, async () => {
                await startStrength(plan, date)
                app.go('today')
              })
            }
          >
            ▶ Start
          </Btn>
          <Btn variant="ghost" className="flex-1" onClick={() => void patchDaily(date, { studySkip: true })}>
            📚 Skip for study
          </Btn>
        </div>
      )}
      {sheet}
    </Panel>
  )
}

/** No session today? You can still do one (with the exam-day check). */
function TrainAnyway({ onWalk }: { onWalk: () => void }) {
  const app = useApp()
  const { today, data } = app
  const [pick, setPick] = useState(false)
  const { guard, sheet } = useGymGuard(onWalk)
  const active = data.sessions.some((s) => s.status === 'active')
  const suggested = nextPreseasonSlot(data.sessions)
  const start = (slot: PreseasonSlot) => {
    setPick(false)
    guard(today, async () => {
      await startStrength(buildSession(slot, app.sessionCtx(today)), today)
      app.go('today')
    })
  }
  return (
    <>
      <button className="w-full text-sm text-muted underline min-h-[44px] mb-2" disabled={active} onClick={() => setPick(true)}>
        Moved a session? Do one today instead
      </button>
      <Sheet open={pick} onClose={() => setPick(false)} title="Session today">
        <p className="text-sm text-muted mb-3">Only if it fits around study. Next up is {SESSIONS[suggested].name}.</p>
        {(['PA', 'PB'] as const).map((slot) => (
          <Btn key={slot} variant={slot === suggested ? 'primary' : 'ghost'} className="w-full mb-2" onClick={() => start(slot)}>
            {SESSIONS[slot].name}
          </Btn>
        ))}
      </Sheet>
      {sheet}
    </>
  )
}

function WalkCard({ date, label, optional }: { date: ISODate; label: string; optional?: boolean }) {
  const { data, today } = useApp()
  const fx = useFx()
  const done = data.sessions.find((s) => s.date === date && s.slot === 'walk' && s.status === 'done')
  const [min, setMin] = useState<number | null>(/20-min/.test(label) ? 20 : 25)
  return (
    <Panel accent={!!done}>
      <div className="flex items-start gap-3">
        <div className="text-3xl">🚶</div>
        <div className="flex-1">
          <div className="font-pixel text-[15px] leading-relaxed">{label}</div>
          <div className="text-sm text-muted">{optional ? 'Optional. ' : ''}Counts as a completed day. Fresh air helps it all sink in.</div>
        </div>
      </div>
      {done ? (
        <div className="flex items-center justify-between mt-2">
          <span className="text-good font-pixel text-[15px]">
            ✓ {done.minutes ? `${done.minutes} min · ` : ''}+{PRESEASON_XP.walk} XP
          </span>
          <button className="text-sm text-muted underline min-h-[44px]" onClick={() => void deleteSession(done.id!)}>
            undo
          </button>
        </div>
      ) : date <= today ? (
        <div className="flex gap-2 items-end mt-2">
          <NumField label="Minutes" value={min} onChange={setMin} decimal={false} className="w-24" />
          <Btn
            className="flex-1"
            onClick={() => {
              const first = !walkedOn(data.sessions, date)
              void logWalk(date, min, label)
              if (first) fx.floatXP(PRESEASON_XP.walk, 'walk')
            }}
          >
            Walked ✓
          </Btn>
        </div>
      ) : null}
    </Panel>
  )
}

function TennisCard({ date }: { date: ISODate }) {
  const { data, today, planSettings } = useApp()
  const fx = useFx()
  const on = isTennisOn(date, planSettings)
  const done = data.sessions.find((s) => s.date === date && s.slot === 'tennis' && s.status === 'done')
  const [min, setMin] = useState<number | null>(90)
  return (
    <Panel accent={!!done}>
      <div className="flex items-start gap-3">
        <div className="text-3xl">{on ? '🎾' : '😌'}</div>
        <div className="flex-1">
          <div className="font-pixel text-[15px] leading-relaxed">{on ? `Tennis (${PROGRAM.tennisTime})` : 'Rest (no tennis this week)'}</div>
          <div className="text-sm text-muted">{on ? 'Just for fun. Counts like a walk.' : 'Rest counts. Study, eat well, sleep.'}</div>
        </div>
      </div>
      {date >= today && <Toggle on={on} onChange={(v) => void toggleTennis(mondayOf(date), v)} label={<span className="text-sm">Tennis is on this week</span>} />}
      {on &&
        (done ? (
          <div className="flex items-center justify-between mt-2">
            <span className="text-good font-pixel text-[15px]">
              ✓ {done.minutes} min · +{PRESEASON_XP.walk} XP
            </span>
            <button className="text-sm text-muted underline min-h-[44px]" onClick={() => void deleteSession(done.id!)}>
              undo
            </button>
          </div>
        ) : date <= today ? (
          <div className="flex gap-2 items-end mt-2">
            <NumField label="Minutes" value={min} onChange={setMin} decimal={false} className="w-24" />
            <Btn
              className="flex-1"
              disabled={!min}
              onClick={() => {
                const first = !walkedOn(data.sessions, date)
                void logCardio('tennis', date, min ?? 0, `Tennis (${PROGRAM.tennisTime})`)
                if (first) fx.floatXP(PRESEASON_XP.walk)
              }}
            >
              Played ✓
            </Btn>
          </div>
        ) : null)}
    </Panel>
  )
}

function TaskCard({ id, label }: { id: string; label: string }) {
  const { data } = useApp()
  return (
    <Panel>
      <Check on={data.settings.preseasonTasks.includes(id)} onChange={(on) => void setPreseasonTask(id, on)}>
        {id === 'induction' ? '📝 ' : '🎒 '}
        {label}
      </Check>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
//  Starting weights → Week 1
// ---------------------------------------------------------------------------
export function StartWeightsReview({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { data, go } = useApp()
  const [open, setOpen] = useState(defaultOpen)
  const rows = preseasonStartWeights(data.sessions)
  const sw = data.settings.startWeights
  const set = (id: string, v: number | null) => {
    const next = { ...sw }
    if (v === null) delete next[id]
    else next[id] = v
    void updateSettings({ startWeights: next })
  }
  return (
    <Panel>
      <button className="w-full flex items-center justify-between min-h-[44px]" onClick={() => setOpen(!open)}>
        <H className="!mb-0">Week 1 starting weights</H>
        <span className="font-pixel text-xs">
          {rows.length}/{PRESEASON.handover.length} {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <>
          <p className="text-sm text-muted mb-2">
            The weight you log in each pre-season exercise becomes your Week 1 suggestion. Change any of them before Mon {fmtShort(PROGRAM.start)}.
          </p>
          {PRESEASON.handover.map((h) => {
            const row = rows.find((r) => r.to === h.to)
            const cur = sw[h.to] ?? null
            const edited = row && cur !== null && cur !== row.kg
            return (
              <div key={h.to} className="flex items-center gap-2 py-1.5 border-b border-edge/40">
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    {EXERCISES[h.to].name}
                    {EXERCISES[h.to].equipment === 'assisted' && <span className="text-muted"> (assist kg)</span>}
                  </div>
                  <div className="text-xs text-muted">
                    {row ? `from ${EXERCISES[row.from].name} ${row.fromKg} kg` : `log ${EXERCISES[h.from].name} to fill this`}
                    {row?.note && <span className="text-xp"> · {row.note}</span>}
                    {edited && (
                      <button className="underline ml-1" onClick={() => set(h.to, row.kg)}>
                        ↺ {row.kg}
                      </button>
                    )}
                  </div>
                </div>
                <NumField className="w-24" value={cur} placeholder="kg" onChange={(v) => set(h.to, v)} />
              </div>
            )
          })}
          <button className="text-sm text-muted underline min-h-[44px]" onClick={() => go('settings')}>
            Other exercises: More → Starting weights
          </button>
        </>
      )}
    </Panel>
  )
}

function BeforeWeek1() {
  const { data } = useApp()
  const [open, setOpen] = useState(false)
  const done = new Set(data.settings.prestartDone)
  return (
    <Panel>
      <button className="w-full flex items-center justify-between min-h-[44px]" onClick={() => setOpen(!open)}>
        <H className="!mb-0">Before Week 1</H>
        <span className="font-pixel text-xs">
          {done.size}/{PRESTART_CHECKLIST.length} {open ? '▲' : '▼'}
        </span>
      </button>
      {open &&
        PRESTART_CHECKLIST.map((c) => (
          <Check
            key={c.id}
            on={done.has(c.id)}
            onChange={(on) => {
              const next = new Set(done)
              if (on) next.add(c.id)
              else next.delete(c.id)
              void updateSettings({ prestartDone: [...next] })
            }}
          >
            {c.text}
          </Check>
        ))}
    </Panel>
  )
}

// ---------------------------------------------------------------------------
//  End-of-phase summary
// ---------------------------------------------------------------------------
export function PreseasonSummary() {
  const { data, game } = useApp()
  const sessions = preseasonSessionsDone(data.sessions)
  const skipped = data.daily.filter((d) => isPreseason(d.date) && d.studySkip).length
  const walks = new Set(data.sessions.filter((s) => isPreseason(s.date) && s.status === 'done' && (s.slot === 'walk' || s.slot === 'tennis')).map((s) => s.date)).size
  const beaten = PRESEASON.exams.filter((e) => data.settings.examsDefeated.includes(e.id))
  const xp = game.ledger.filter((e) => isPreseason(e.date)).reduce((a, e) => a + e.amount, 0)
  const rows = preseasonStartWeights(data.sessions)
  const ach = (id: string) => game.achievements.find((a) => a.id === id)
  return (
    <div>
      <div className="font-pixel text-[13px] tracking-[0.2em] text-xp">PRE-SEASON COMPLETE</div>
      <div className="font-pixel text-[20px] mt-1 mb-3">EXAMS DONE. WEEK 1 TOMORROW.</div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="bg-bg-2 p-2">
          <div className="font-pixel text-[20px]">
            {sessions.length}/{PRESEASON_SESSION_COUNT}
          </div>
          <div className="text-xs text-muted">sessions</div>
        </div>
        <div className="bg-bg-2 p-2">
          <div className="font-pixel text-[20px]">{beaten.length}/5</div>
          <div className="text-xs text-muted">exams defeated</div>
        </div>
        <div className="bg-bg-2 p-2">
          <div className="font-pixel text-[20px]">{xp}</div>
          <div className="text-xs text-muted">XP earned</div>
        </div>
      </div>
      <div className="text-sm text-muted mb-2">
        {walks} walk/tennis days{skipped ? ` · ${skipped} skipped for study (smart)` : ''}
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {beaten.map((e) => (
          <span key={e.id} className="text-2xl" title={e.boss}>
            {e.bossEmoji}
          </span>
        ))}
        {(['examSlayer', 'preseasonDone'] as const).map((id) => {
          const a = ach(id)
          return a?.unlocked ? (
            <Badge key={id} color="xp" className="ml-1">
              {a.icon} {a.name}
            </Badge>
          ) : null
        })}
      </div>
      <div className="font-pixel text-[12px] tracking-[0.2em] text-muted mb-1">STARTING WEIGHTS</div>
      {rows.length === 0 && <p className="text-sm text-muted">None logged. Week 1 will ask you for weights as you go.</p>}
      {rows.map((r) => (
        <div key={r.to} className="flex justify-between text-sm py-0.5">
          <span>{EXERCISES[r.to].name}</span>
          <span className="text-xp">
            {data.settings.startWeights[r.to] ?? r.kg} kg{EXERCISES[r.to].equipment === 'assisted' ? ' assist' : ''}
          </span>
        </div>
      ))}
      <p className="text-xs text-muted mt-2">Edit them on the Today tab (Week 1 starting weights) or in More.</p>
      <p className="text-xs text-muted">Your weekly streak starts Mon {fmtShort(PROGRAM.start)}.</p>
    </div>
  )
}

/** Shows the summary once, on or after Sun 15 Nov. */
export function PreseasonSummaryGate() {
  const { data, today } = useApp()
  const show = today >= PRESEASON.end && today < addDays(PROGRAM.start, 7) && !data.settings.seenPreseasonSummary
  const close = () => void updateSettings({ seenPreseasonSummary: true })
  return (
    <Sheet open={show} onClose={close} title="Pre-season summary">
      <PreseasonSummary />
      <Btn className="w-full mt-4" onClick={close}>
        Ready for Week 1
      </Btn>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
//  Home tab pieces
// ---------------------------------------------------------------------------
export function ExamNextMatch({ onGo }: { onGo: () => void }) {
  const { data, today } = useApp()
  const day = preseasonDay(today)!
  const exam = examOn(today)
  const session = day.items.find((i) => i.kind === 'session')
  const active = data.sessions.some((s) => s.status === 'active')
  const sessionOpen =
    session &&
    !data.sessions.some((s) => s.date === today && s.slot === session.slot && s.status === 'done') &&
    !data.daily.find((d) => d.date === today)?.studySkip
  const next = nextExam(today)

  let label: string
  let main: string
  let sub: string
  let button = 'VIEW'
  if (active) {
    label = 'IN PROGRESS'
    main = 'PRE-SEASON'
    sub = 'Finish up, then back to study'
    button = 'RESUME'
  } else if (exam) {
    label = 'EXAM DAY'
    main = `${exam.name.toUpperCase()} ${fmtTime(exam.start).toUpperCase()}`
    sub = 'Good breakfast, walk after.'
  } else if (sessionOpen && session) {
    label = 'TODAY · OPTIONAL'
    main = (session.label ?? SESSIONS[session.slot].name).toUpperCase()
    sub = '~40 min · 2 easy sets · skip for study anytime'
    button = 'PLAY'
  } else if (next) {
    label = 'NEXT EXAM'
    main = next.name.toUpperCase()
    sub = `${fmtExamWhen(next)} · ${inDays(daysUntil(today, next.date))}`
  } else {
    label = 'WEEK 1'
    main = `MON ${fmtShort(PROGRAM.start)}`
    sub = `${daysUntil(today, PROGRAM.start)} days to go. Exams done 🎓`
  }
  return (
    <div className="px-box px-box-accent px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-pixel text-[12px] tracking-[0.22em] text-accent">{label}</div>
        <div className="font-pixel text-[20px] leading-tight truncate">{main}</div>
        <div className="text-sm text-muted truncate">{sub}</div>
      </div>
      <Btn onClick={onGo} className="!min-h-[56px] !px-6 !text-[16px]">
        {button}
      </Btn>
    </div>
  )
}

/** Tomorrow card during the pre-season: session/tennis bag check, or an exam heads-up. */
export function PreseasonTomorrow() {
  const { data, today, planSettings } = useApp()
  const tomorrow = addDays(today, 1)
  const day = preseasonDay(tomorrow)
  if (!day) return null
  const exam = examOn(tomorrow)
  const session = day.items.find((i) => i.kind === 'session')
  const tennis = day.items.some((i) => i.kind === 'tennis') && isTennisOn(tomorrow, planSettings)
  if (!exam && !session && !tennis) return null
  const log = data.daily.find((d) => d.date === tomorrow)
  return (
    <Panel>
      <div className="font-pixel text-[12px] text-muted">TOMORROW · {fmtDay(tomorrow).toUpperCase()}</div>
      {exam ? (
        <div className="mt-1">
          {exam.bossEmoji} {exam.name} exam at {fmtTime(exam.start)}. Bed by 10pm tonight.
        </div>
      ) : (
        <>
          <div className="mt-1">{[session && (session.label ?? SESSIONS[session.slot].name), tennis && `Tennis (${PROGRAM.tennisTime})`].filter(Boolean).join(' + ')}</div>
          {session && (
            <Check on={!!log?.bag} onChange={(on) => void patchDaily(tomorrow, { bag: on })}>
              🎒 Bag packed (shoes, towel, water, headphones)
            </Check>
          )}
        </>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------------------
//  Week tab
// ---------------------------------------------------------------------------
export function PreseasonWeek({ weekStart }: { weekStart: ISODate }) {
  const { data, today, planSettings } = useApp()
  const days = rangeDays(weekStart, addDays(weekStart, 6)).filter(isPreseason)
  const hasTennis = days.some((d) => preseasonDay(d)!.items.some((i) => i.kind === 'tennis'))
  const tennisOn = isTennisOn(weekStart, planSettings)
  const log = (d: ISODate) => data.daily.find((x) => x.date === d)
  const doneSlot = (d: ISODate, slot: string) => data.sessions.some((s) => s.date === d && s.slot === slot && s.status === 'done')

  const row = (d: ISODate, item: PreseasonItem): { text: string; st: 'done' | 'skip' | 'todo' | 'rest' | 'past' } => {
    const past = d < today
    const open = (done: boolean) => (done ? 'done' : past ? 'past' : 'todo')
    switch (item.kind) {
      case 'exam': {
        const e = examById(item.exam)!
        return { text: `${e.bossEmoji} ${e.name} exam ${fmtTime(e.start)}`, st: open(data.settings.examsDefeated.includes(e.id)) }
      }
      case 'session': {
        const done = doneSlot(d, item.slot)
        return { text: item.label ?? SESSIONS[item.slot].name, st: !done && log(d)?.studySkip ? 'skip' : open(done) }
      }
      case 'walk':
        return { text: `${item.label}${item.optional ? ' (optional)' : ''}`, st: open(doneSlot(d, 'walk')) }
      case 'mobility':
        return { text: 'Mobility', st: open(!!log(d)?.mobilityDone) }
      case 'tennis':
        return isTennisOn(d, planSettings) ? { text: `Tennis (${PROGRAM.tennisTime})`, st: open(doneSlot(d, 'tennis')) } : { text: 'Rest (no tennis)', st: 'rest' }
      case 'task':
        return { text: item.label, st: open(data.settings.preseasonTasks.includes(item.id)) }
      case 'rest':
        return { text: item.label ?? 'Rest', st: 'rest' }
    }
  }
  const icon = { done: '✓', skip: '📚', todo: '▸', rest: '·', past: '·' }
  const sessions = preseasonSessionsDone(data.sessions).length

  return (
    <>
      <Panel>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-pixel text-[14px] text-muted">PRE-SEASON SESSIONS</div>
            <div className="font-pixel text-[24px] mt-1">
              {sessions}/{PRESEASON_SESSION_COUNT}
              <span className="text-muted text-[11px]"> · {PRESEASON.doneTarget} = {ACHIEVEMENTS.find((a) => a.id === 'preseasonDone')!.icon} badge</span>
            </div>
          </div>
          <Badge color="muted">No streak</Badge>
        </div>
        <div className="text-sm text-muted mt-1">Exam weeks never count toward (or break) your streak. It starts Mon {fmtShort(PROGRAM.start)}.</div>
      </Panel>
      <Panel>
        {days.map((d) => {
          const day = preseasonDay(d)!
          return (
            <div key={d} className={`py-2 border-b border-edge/40 ${d === today ? 'bg-panel-2 -mx-3 px-3' : ''}`}>
              <div className="flex gap-3">
                <div className="w-12 shrink-0">
                  <div className={`font-pixel text-[14px] ${d === today ? 'text-accent' : 'text-muted'}`}>{dayName(d).toUpperCase()}</div>
                  <div className="text-xs text-muted">{fmtShort(d)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  {day.items.map((it, k) => {
                    const r = row(d, it)
                    return (
                      <div key={k} className={`flex gap-2 items-center ${r.st === 'rest' || r.st === 'past' ? 'text-muted' : ''}`}>
                        <span className="font-pixel text-[14px] w-4">{icon[r.st]}</span>
                        <span className={r.st === 'done' ? 'text-good' : ''}>{r.text}</span>
                      </div>
                    )
                  })}
                  {data.sessions
                    .filter((s) => s.date === d && s.status === 'done' && (s.slot === 'PA' || s.slot === 'PB') && !day.items.some((i) => i.kind === 'session' && i.slot === s.slot))
                    .map((s) => (
                      <div key={s.id} className="flex gap-2 items-center">
                        <span className="font-pixel text-[14px] w-4">✓</span>
                        <span className="text-good">{SESSIONS[s.slot as PreseasonSlot].name} (extra)</span>
                      </div>
                    ))}
                  {day.note && <div className="text-xs text-muted mt-0.5">📝 {day.note}</div>}
                </div>
              </div>
            </div>
          )
        })}
        {hasTennis && days[days.length - 1] >= today && (
          <Toggle on={tennisOn} onChange={(on) => void toggleTennis(weekStart, on)} label={<span className="text-sm">🎾 Tennis on this week (else rest)</span>} />
        )}
      </Panel>
    </>
  )
}
