import { useEffect, useMemo, useRef, useState } from 'react'
import { ON_TIME, PRESEASON_XP, XP } from '../config/game'
import { melbourneMinutes } from '../lib/loot'
import { EXERCISES, SESSIONS } from '../config/program'
import type { StrengthSlot } from '../config/types'
import type { LoggedExercise, LoggedSet, WorkoutSession } from '../db/types'
import { fmtShort } from '../lib/dates'
import { dayMods } from '../lib/life'
import { BODYWEIGHT_LIKE } from '../lib/progression'
import { bestFor, isPR, prText, type Best } from '../lib/records'
import { e1rmTrend, platesPerSide, prTarget } from '../lib/skills'
import { defaultReps, exerciseLogs, exInfo, planExercise, rampUpText, repsLabel, restLabel, toLogged, warmupSteps } from '../lib/session'
import { sfx, unlockAudio } from '../lib/sound'
import { useWakeLock } from '../lib/wakeLock'
import { earnsStrengthXP } from '../lib/xp'
import { deleteSession, finishSession, patchDaily, saveSession } from '../state/actions'
import { isPreseasonSlot, preseasonSessionsDone, sameSeason } from '../lib/preseason'
import { PRESEASON } from '../config/program'
import { useApp } from '../state/app'
import { useFx } from '../state/fx'
import { useTimer } from '../state/timer'
import { FeelItButton } from '../components/FeelIt'
import { Btn, Check, Panel, Sheet } from '../components/ui'
import { SORE_BACK_SWAPS } from '../config/program'

export function ActiveSession({ session }: { session: WorkoutSession }) {
  const app = useApp()
  const fx = useFx()
  const timer = useTimer()
  const [s, setS] = useState(session)
  const [swapIdx, setSwapIdx] = useState<number | null>(null)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [menu, setMenu] = useState(false)
  const [warmOpen, setWarmOpen] = useState(session.warmupDone.length === 0)
  const [, force] = useState(0)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  useWakeLock(true)

  // The local copy is the source of truth while logging (it's keyed by session id),
  // so a slow DB echo can never overwrite what you just typed.
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 15_000)
    return () => clearInterval(id)
  }, [])

  const template = SESSIONS[s.slot as StrengthSlot]
  const mods = useMemo(() => dayMods(app.data.life, s.date, app.data.settings.repeats, SORE_BACK_SWAPS), [app.data.life, s.date, app.data.settings.repeats])
  // Exam pre-season sessions: flat XP, no per-set XP or PR fanfare, own history.
  const pre = isPreseasonSlot(s.slot)
  const earns = !pre && earnsStrengthXP(s, app.data.sessions)
  const history = sameSeason(app.data.sessions, s.date)
  const firstPre = pre && preseasonSessionsDone(app.data.sessions.filter((x) => x.id !== s.id)).length === 0
  const ctx = app.sessionCtx(s.date)
  const warmup = useMemo(() => {
    const first = s.exercises.find((e) => e.rampUp)
    return warmupSteps(s.slot as StrengthSlot, first ? { name: first.name, equipment: first.equipment, weight: first.suggested } : null)
  }, [s.slot, s.exercises])

  const persist = (next: WorkoutSession) => {
    setS(next)
    void saveSession(next)
  }

  const updateSet = (ei: number, si: number, patch: Partial<LoggedSet>, propagateWeight = false) => {
    const exercises = s.exercises.map((e, i) => {
      if (i !== ei) return e
      const old = e.sets[si]
      const sets = e.sets.map((set, j) => {
        if (j === si) return { ...set, ...patch }
        // Changing the weight also updates later sets that still had the old weight.
        if (propagateWeight && j > si && !set.done && set.weight === old.weight) return { ...set, weight: patch.weight ?? null }
        return set
      })
      return { ...e, sets }
    })
    persist({ ...s, exercises })
  }

  const completeSet = (ei: number, si: number) => {
    unlockAudio()
    const e = s.exercises[ei]
    const set = e.sets[si]
    if (set.done) {
      updateSet(ei, si, { done: false, doneAt: undefined })
      return
    }
    const last = exerciseLogs(history, e.ex, s.date, s.id).pop()?.ex ?? null
    const reps = set.reps ?? defaultReps(e, si, last)
    if (reps === null) {
      alert(e.reps === 'max-2' ? 'Enter how many reps you did' : 'Enter reps')
      return
    }
    const weighted = !BODYWEIGHT_LIKE.includes(e.equipment)
    const weight = set.weight ?? (e.equipment === 'assisted' ? 0 : null)
    if (weighted && weight === null) {
      alert('Enter the weight (kg)')
      return
    }
    const doneSet = { ...set, reps, weight, done: true, doneAt: Date.now() }
    updateSet(ei, si, doneSet)
    sfx.set()
    if (earns) fx.floatXP(XP.set)

    // PR check: one PR per exercise per session.
    const best = bestFor(history.filter((x) => x.status === 'done'), e.ex, e.equipment, s.id)
    const earlierPR = e.sets.some((x, j) => j !== si && x.done && isPR(best, x, e.equipment))
    if (!pre && !earlierPR && isPR(best, doneSet, e.equipment)) {
      const what = prText({ weight, reps, equipment: e.equipment })
      fx.celebrate({ kind: 'pr', title: e.name, sub: what, icon: '🏆', xp: XP.pr })
    }

    // Rest timer + scroll to next exercise.
    const isLastSet = si === e.sets.length - 1
    const isLastEx = ei === s.exercises.length - 1
    if (!(isLastSet && isLastEx)) {
      const next = isLastSet ? `Next: ${s.exercises[ei + 1].name}` : `Next: ${e.name} set ${si + 2}`
      timer.start(e.rest, `Rest ${restLabel(e.rest)} · ${next}`)
    }
    if (isLastSet && !isLastEx) setTimeout(() => cardRefs.current[ei + 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
  }

  const addSet = (ei: number) => {
    const exercises = s.exercises.map((e, i) => {
      if (i !== ei) return e
      const prev = e.sets[e.sets.length - 1]
      return { ...e, sets: [...e.sets, { weight: prev?.weight ?? e.suggested, reps: null, rir: null, done: false }] }
    })
    persist({ ...s, exercises })
  }

  const removeSet = (ei: number) => {
    const exercises = s.exercises.map((e, i) => (i === ei && e.sets.length > 1 ? { ...e, sets: e.sets.slice(0, -1) } : e))
    persist({ ...s, exercises })
  }

  const swapTo = (ei: number, exId: string) => {
    const e = s.exercises[ei]
    const presc = template.exercises.find((p) => p.ex === e.planEx) ?? { ex: e.planEx, sets: e.targetSets, reps: e.reps, rest: e.rest }
    let logged: LoggedExercise
    if (exId.startsWith('custom:')) {
      logged = { ...e, ex: exId, name: exId.slice(7), equipment: 'machine', suggested: null, hint: 'Session swap: enter your weight', sets: e.sets.map((x) => (x.done ? x : { ...x, weight: null })) }
    } else {
      const planned = planExercise({ ...presc, sets: e.targetSets }, ctx, mods, exId, s.id)
      logged = { ...toLogged({ ...planned, sets: e.targetSets }), planEx: e.planEx }
      logged.sets = logged.sets.map((x, j) => (e.sets[j]?.done ? e.sets[j] : x))
    }
    persist({ ...s, exercises: s.exercises.map((x, i) => (i === ei ? logged : x)) })
    setSwapIdx(null)
  }

  const doneSets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0)
  const totalSets = s.exercises.reduce((a, e) => a + e.sets.length, 0)
  const firstExDone = s.exercises[0]?.sets.every((x) => x.done)
  const elapsed = Math.floor((Date.now() - s.startedAt) / 60000)

  const skills = new Set(app.game.skills)
  const doneSessions = history.filter((x) => x.status === 'done')
  const appt = app.data.appointments.find((a) => a.date === s.date)
  const onTime = !!appt && earns && (() => {
    const [h, m] = appt.time.split(':').map(Number)
    return Math.abs(melbourneMinutes(s.startedAt) - (h * 60 + m)) <= ON_TIME.windowMin
  })()

  const finish = async () => {
    timer.stop()
    await finishSession(s.id!)
    setConfirmFinish(false)
    if (pre) fx.celebrate({ kind: 'session', title: `${template.name} complete`, sub: `${doneSets} sets in ${elapsed} min. Weights saved for Week 1. Back to the books!`, icon: '📚', xp: PRESEASON_XP.session })
    else fx.celebrate({ kind: 'session', title: `${template.name} complete`, sub: `${doneSets} sets in ${elapsed} min${onTime ? ` · ON TIME +${ON_TIME.xp} XP` : ''}${earns ? '' : ' (weekly XP cap reached: rest is gains too)'}`, icon: '⚔️', xp: earns ? XP.session : 0 })
    app.go('home')
  }

  return (
    <div className="pb-48">
      <div className="sticky top-0 z-30 bg-bg/95 backdrop-blur pt-safe px-4 pb-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setMenu(true)} className="cut-sm w-11 h-11 bg-panel-2 font-pixel text-lg" aria-label="Session menu">
            ⋯
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-pixel text-[12px] tracking-[0.22em] text-accent">
              IN PROGRESS · {elapsed} MIN · {doneSets}/{totalSets}
              {onTime && <span className="text-good"> · ON TIME</span>}
            </div>
            <div className="font-pixel text-[24px] leading-tight truncate">{template.name.toUpperCase()}</div>
          </div>
          <button
            onClick={() => setConfirmFinish(true)}
            className="cut-sm h-12 px-4 border border-ink font-pixel text-[14px] tracking-[0.16em]"
          >
            FINISH
          </button>
        </div>
        <div className="h-1.5 bg-panel-2 mt-2">
          <div className="h-full bg-accent transition-[width]" style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="px-4 pt-1">
        {mods.notes.length > 0 && (
          <Panel className="!bg-panel-2">
            {mods.notes.map((n) => (
              <div key={n} className="text-sm">
                ⚠️ {n}
              </div>
            ))}
            {mods.multiplierReasons.map((n) => (
              <div key={n} className="text-sm">
                📉 {n}
              </div>
            ))}
          </Panel>
        )}
        {firstPre && <Panel className="!bg-panel-2 text-sm">👋 First session! {PRESEASON.firstSessionTip}</Panel>}
        {pre && <Panel className="!bg-panel-2 text-sm">Easy does it: 2 sets, {PRESEASON.rir} (stop with 3-4 reps left), 90 s rest. Exams come first.</Panel>}
        {!earns && !pre && <Panel className="!bg-panel-2 text-sm">🛑 You've already done {XP.strengthCapPerWeek} strength sessions this week. This one is logged, but earns no XP. Recovery is part of the plan!</Panel>}

        {mods.maxExercises === 1 && firstExDone && (
          <Panel accent className="text-center">
            <div className="mb-2">First exercise done. That counts as a session! 🎉</div>
            <Btn onClick={finish}>Finish & claim</Btn>
          </Panel>
        )}

        <Panel>
          <button className="w-full flex items-center justify-between min-h-[44px]" onClick={() => setWarmOpen(!warmOpen)}>
            <span className="font-pixel text-[15px] text-accent">WARM-UP {s.warmupDone.length}/{warmup.length}</span>
            <span className="font-pixel text-xs">{warmOpen ? '▲' : '▼'}</span>
          </button>
          {warmOpen &&
            warmup.map((w) => (
              <Check
                key={w}
                on={s.warmupDone.includes(w)}
                onChange={(on) => {
                  const warmupDone = on ? [...s.warmupDone, w] : s.warmupDone.filter((x) => x !== w)
                  persist({ ...s, warmupDone })
                  if (warmupDone.length === warmup.length) setWarmOpen(false)
                }}
              >
                {w}
              </Check>
            ))}
        </Panel>

        {s.exercises.map((e, ei) => (
          <div key={ei} ref={(el) => void (cardRefs.current[ei] = el)} className="scroll-mt-28">
            <ExerciseCard
              index={ei}
              total={s.exercises.length}
              skills={skills}
              best={bestFor(doneSessions, e.ex, e.equipment, s.id)}
              trend={skills.has('trend') ? e1rmTrend(history, e.ex, s.date) : null}
              e={e}
              last={exerciseLogs(history, e.ex, s.date, s.id).pop() ?? null}
              onSet={(si, patch, prop) => updateSet(ei, si, patch, prop)}
              onComplete={(si) => completeSet(ei, si)}
              onAdd={() => addSet(ei)}
              onRemove={() => removeSet(ei)}
              onSwap={() => setSwapIdx(ei)}
            />
          </div>
        ))}

        <div className="mt-4">
          <Btn className="w-full" onClick={() => setConfirmFinish(true)}>
            Finish session
          </Btn>
        </div>
      </div>

      <Sheet open={swapIdx !== null} onClose={() => setSwapIdx(null)} title="Swap for this session">
        {swapIdx !== null && <SwapList e={s.exercises[swapIdx]} onPick={(id) => swapTo(swapIdx, id)} />}
      </Sheet>

      <Sheet open={confirmFinish} onClose={() => setConfirmFinish(false)} title="Finish session?">
        <p className="mb-4">
          {doneSets}/{totalSets} sets done.{' '}
          {doneSets < totalSets ? 'Unfinished sets are fine: they just won\'t count.' : 'Every set done. Legend.'}
        </p>
        <Btn className="w-full" onClick={finish}>
          Finish ✓
        </Btn>
      </Sheet>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Session">
        <Btn variant="ghost" className="w-full mb-3" onClick={() => { setMenu(false); app.go('today') }}>
          Minimise (keep going later)
        </Btn>
        {pre && (
          <Btn
            variant="ghost"
            className="w-full mb-3"
            onClick={async () => {
              if (!confirm('Skip this session for study? Nothing is lost.')) return
              timer.stop()
              await deleteSession(s.id!)
              await patchDaily(s.date, { studySkip: true })
              setMenu(false)
            }}
          >
            📚 Skip for study
          </Btn>
        )}
        <Btn
          variant="danger"
          className="w-full"
          onClick={async () => {
            if (!confirm('Delete this session and everything logged in it?')) return
            timer.stop()
            await deleteSession(s.id!)
            setMenu(false)
          }}
        >
          Discard session
        </Btn>
      </Sheet>
    </div>
  )
}

function ExerciseCard({
  index,
  total,
  skills,
  best,
  trend,
  e,
  last,
  onSet,
  onComplete,
  onAdd,
  onRemove,
  onSwap,
}: {
  index: number
  total: number
  skills: Set<string>
  best: Best
  trend: number | null
  e: LoggedExercise
  last: { session: WorkoutSession; ex: LoggedExercise } | null
  onSet: (si: number, patch: Partial<LoggedSet>, propagate?: boolean) => void
  onComplete: (si: number) => void
  onAdd: () => void
  onRemove: () => void
  onSwap: () => void
}) {
  const info = exInfo(e.ex)
  const allDone = e.sets.every((x) => x.done)
  const weighted = !['plyo', 'timed'].includes(e.equipment)
  const weightLabel = e.equipment === 'assisted' ? 'assist kg' : e.equipment === 'bodyweight' ? '+kg' : 'kg'
  const lastText = last
    ? last.ex.sets
        .filter((x) => x.done)
        .map((x) => (x.weight ? `${x.weight}×${x.reps}` : `${x.reps}`))
        .join(', ')
    : null
  const top = e.reps === 'max-2' ? null : e.reps[1]

  const current = e.sets.findIndex((x) => !x.done)
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <Panel className={allDone ? 'opacity-70' : ''} accent={!allDone}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-pixel text-[12px] tracking-[0.2em] text-muted">
            {pad(index + 1)} / {pad(total)}
            {allDone && <span className="text-good"> · DONE ✓</span>}
          </div>
          <div className="font-pixel text-[20px] leading-tight">{e.name.toUpperCase()}</div>
          <div className="text-sm text-muted uppercase tracking-wide">
            {e.targetSets} × {repsLabel(e.reps, e.perSide, e.equipment === 'timed')} · rest {restLabel(e.rest)}
          </div>
        </div>
        <button onClick={onSwap} className="cut-sm shrink-0 h-10 px-3 bg-panel-2 font-pixel text-[12px] tracking-[0.1em]" aria-label="Swap exercise">
          SWAP
        </button>
        <FeelItButton ex={e.ex} name={e.name} variant="map" />
      </div>

      {(e.suggested !== null || e.hint || lastText) && (
        <div className="mt-2 flex items-center gap-3">
          {e.suggested !== null && weighted && (
            <span className="font-pixel text-[28px] leading-none text-accent-2 whitespace-nowrap">
              {e.suggested}
              <span className="text-[14px]"> KG{e.equipment === 'assisted' ? ' ASSIST' : ''}</span>
            </span>
          )}
          <span className="text-sm text-muted leading-snug">
            {e.hint}
            {lastText && (
              <>
                <br />
                Last ({fmtShort(last!.session.date)}): {lastText}
              </>
            )}
          </span>
        </div>
      )}
      {info.cue && <div className="text-xs text-muted mt-1">Tip: {info.cue}</div>}
      <Perks e={e} skills={skills} best={best} trend={trend} />

      <div className="mt-3 space-y-1.5">
        <div className="grid grid-cols-[24px_1fr_1fr_44px_56px] gap-1.5 font-pixel text-[11px] tracking-[0.15em] text-muted">
          <span>#</span>
          <span>{weighted ? weightLabel.toUpperCase() : ''}</span>
          <span>{e.equipment === 'timed' ? 'SEC' : 'REPS'}</span>
          <span>RIR</span>
          <span />
        </div>
        {e.sets.map((set, si) => {
          const target = e.rirTargets?.[si]
          const placeholder = defaultReps(e, si, last?.ex ?? null)
          const isCurrent = si === current
          return (
            <div key={si}>
            <div className="grid grid-cols-[24px_1fr_1fr_44px_56px] gap-1.5 items-center">
              <span className={`font-pixel text-[15px] ${isCurrent ? 'text-accent' : 'text-muted'}`}>{si + 1}</span>
              {weighted ? (
                <input
                  className={`px-input !min-h-[52px] text-center !px-1 text-[20px] ${set.done ? '!border-good' : ''}`}
                  inputMode="decimal"
                  value={set.weight ?? ''}
                  placeholder={e.equipment === 'bodyweight' ? 'BW' : e.equipment === 'assisted' ? '0' : 'kg'}
                  onChange={(ev) => {
                    const raw = ev.target.value.replace(',', '.')
                    const n = raw === '' ? null : Number(raw)
                    if (n === null || !Number.isNaN(n)) onSet(si, { weight: n }, true)
                  }}
                  aria-label={`Set ${si + 1} weight`}
                />
              ) : (
                <span className="text-center text-muted text-sm uppercase tracking-wider">{e.equipment === 'plyo' ? 'jump' : 'hold'}</span>
              )}
              <input
                className={`px-input !min-h-[52px] text-center !px-1 text-[20px] ${set.done ? '!border-good' : isCurrent ? '!border-accent' : ''} ${top && set.reps && set.reps >= top ? 'text-good' : ''}`}
                inputMode="numeric"
                value={set.reps ?? ''}
                placeholder={placeholder?.toString() ?? (e.reps === 'max-2' ? 'max−2' : '')}
                onChange={(ev) => {
                  const n = ev.target.value === '' ? null : parseInt(ev.target.value, 10)
                  if (n === null || !Number.isNaN(n)) onSet(si, { reps: n })
                }}
                aria-label={`Set ${si + 1} reps`}
              />
              <button
                className="h-[52px] bg-panel-2 font-pixel text-[15px]"
                onClick={() => onSet(si, { rir: set.rir === null ? 0 : set.rir >= 5 ? null : set.rir + 1 })}
                aria-label={`Set ${si + 1} RIR`}
                title={target}
              >
                {set.rir ?? <span className="text-muted text-[12px]">{target?.startsWith('RIR') ? target.replace('RIR ', '').replace(' ok', '') : '–'}</span>}
              </button>
              <button
                onClick={() => onComplete(si)}
                className={`cut-sm h-[52px] font-pixel ${
                  set.done
                    ? 'bg-good text-accent-ink text-xl'
                    : isCurrent
                      ? 'bg-accent text-accent-ink text-[14px] tracking-[0.1em]'
                      : 'border border-edge text-muted text-[14px] tracking-[0.1em]'
                } active:translate-y-0.5`}
                aria-label={set.done ? `Undo set ${si + 1}` : `Complete set ${si + 1}`}
              >
                {set.done ? '✓' : 'GO'}
              </button>
            </div>
            {skills.has('ghost') && <GhostLine set={set} ghost={last?.ex.sets[si]} equipment={e.equipment} />}
            </div>
          )
        })}
        {e.rirTargets && (
          <div className="text-xs text-muted pt-1">
            Target: {[...new Set(e.rirTargets)].length === 1 ? e.rirTargets[0] : e.rirTargets.map((t, i) => `S${i + 1} ${t}`).join(' · ')}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={onAdd} className="cut-sm flex-1 h-10 bg-panel-2 font-pixel text-[12px] tracking-[0.15em]">
            + SET
          </button>
          <button onClick={onRemove} className="cut-sm flex-1 h-10 bg-panel-2 font-pixel text-[12px] tracking-[0.15em]">
            − SET
          </button>
        </div>
      </div>
    </Panel>
  )
}

function Perks({ e, skills, best, trend }: { e: LoggedExercise; skills: Set<string>; best: Best; trend: number | null }) {
  const barbell = e.equipment === 'barbell-lower' || e.equipment === 'barbell-upper'
  const weightNow = e.sets.find((x) => !x.done)?.weight ?? e.suggested
  const lines: { label: string; text: string }[] = []
  if (skills.has('plates') && barbell && weightNow) {
    const p = platesPerSide(weightNow)
    if (p) lines.push({ label: 'PLATES', text: p.perSide.length ? `${p.perSide.join(' + ')} per side (20 kg bar)${p.leftover ? ` · +${p.leftover} kg short` : ''}` : 'Empty 20 kg bar' })
  }
  if (skills.has('warmups') && barbell && !e.rampUp && weightNow) lines.push({ label: 'RAMP', text: rampUpText({ name: '', equipment: e.equipment, weight: weightNow }).replace(/^Ramp-up : /, '') })
  if (skills.has('prPredict')) {
    const t = prTarget(best, e.equipment, weightNow)
    if (t) lines.push({ label: 'PR', text: t })
  }
  if (skills.has('trend') && trend !== null) lines.push({ label: 'TREND', text: `${trend > 0 ? '+' : ''}${trend} kg/week estimated 1RM (last 4 weeks)` })
  if (!lines.length) return null
  return (
    <div className="mt-2 bg-bg-2 px-2 py-1.5 space-y-0.5">
      {lines.map((l) => (
        <div key={l.label} className="text-sm flex gap-2">
          <span className="font-pixel text-[11px] tracking-[0.12em] text-accent-2 w-12 shrink-0 pt-0.5">{l.label}</span>
          <span className="text-muted">{l.text}</span>
        </div>
      ))}
    </div>
  )
}

/** Ghost race: last session's set under this one. */
function GhostLine({ set, ghost, equipment }: { set: LoggedSet; ghost?: LoggedSet; equipment: LoggedExercise['equipment'] }) {
  if (!ghost?.done || !ghost.reps) return null
  const load = (w: number | null) => (equipment === 'assisted' ? -(w ?? 0) : (w ?? 0))
  const beat = set.done && set.reps !== null && (load(set.weight) > load(ghost.weight) || (load(set.weight) === load(ghost.weight) && set.reps > ghost.reps))
  const tie = set.done && set.reps === ghost.reps && load(set.weight) === load(ghost.weight)
  return (
    <div className="text-xs pl-[30px] pt-0.5 text-muted">
      ghost {ghost.weight ? `${ghost.weight}×${ghost.reps}` : `${ghost.reps}`}
      {beat && <span className="text-good"> · ▲ beat your ghost</span>}
      {tie && <span> · tied</span>}
    </div>
  )
}

function SwapList({ e, onPick }: { e: LoggedExercise; onPick: (id: string) => void }) {
  const [custom, setCustom] = useState('')
  const alts = [...new Set([...(EXERCISES[e.planEx]?.alts ?? []), ...(EXERCISES[e.ex]?.alts ?? []), e.planEx])].filter((id) => id !== e.ex && EXERCISES[id])
  return (
    <div>
      <p className="text-sm text-muted mb-3">Machine busy? Swap {e.name} just for today. Same sets, reps and rest.</p>
      {alts.map((id) => (
        <button key={id} onClick={() => onPick(id)} className="w-full text-left min-h-[52px] px-3 mb-2 bg-panel-2 border-[3px] border-edge">
          {EXERCISES[id].name}
          {id === e.planEx && <span className="text-muted text-sm"> (original)</span>}
        </button>
      ))}
      <div className="flex gap-2 mt-3">
        <input className="px-input" placeholder="Something else…" value={custom} onChange={(ev) => setCustom(ev.target.value)} />
        <Btn small disabled={!custom.trim()} onClick={() => onPick(`custom:${custom.trim()}`)}>
          Use
        </Btn>
      </div>
    </div>
  )
}
