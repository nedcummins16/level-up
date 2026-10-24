import { useEffect, useMemo, useRef, useState } from 'react'
import { XP } from '../config/game'
import { EXERCISES, SESSIONS } from '../config/program'
import type { StrengthSlot } from '../config/types'
import type { LoggedExercise, LoggedSet, WorkoutSession } from '../db/types'
import { fmtShort } from '../lib/dates'
import { dayMods } from '../lib/life'
import { BODYWEIGHT_LIKE } from '../lib/progression'
import { bestFor, isPR, prText } from '../lib/records'
import { defaultReps, exerciseLogs, exInfo, planExercise, repsLabel, restLabel, toLogged, warmupSteps } from '../lib/session'
import { sfx, unlockAudio } from '../lib/sound'
import { useWakeLock } from '../lib/wakeLock'
import { earnsStrengthXP } from '../lib/xp'
import { deleteSession, finishSession, saveSession } from '../state/actions'
import { useApp } from '../state/app'
import { useFx } from '../state/fx'
import { useTimer } from '../state/timer'
import { Badge, Btn, Check, Panel, Sheet } from '../components/ui'
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
  const earns = earnsStrengthXP(s, app.data.sessions)
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
    const last = exerciseLogs(app.data.sessions, e.ex, s.date, s.id).pop()?.ex ?? null
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
    const best = bestFor(app.data.sessions.filter((x) => x.status === 'done'), e.ex, e.equipment, s.id)
    const earlierPR = e.sets.some((x, j) => j !== si && x.done && isPR(best, x, e.equipment))
    if (!earlierPR && isPR(best, doneSet, e.equipment)) {
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

  const finish = async () => {
    timer.stop()
    await finishSession(s.id!)
    setConfirmFinish(false)
    fx.celebrate({ kind: 'session', title: `${template.name} complete`, sub: `${doneSets} sets in ${elapsed} min${earns ? '' : ' (weekly XP cap reached: rest is gains too)'}`, icon: '⚔️', xp: earns ? XP.session : 0 })
    app.go('home')
  }

  return (
    <div className="pb-48">
      <div className="sticky top-0 z-30 bg-bg/95 backdrop-blur pt-safe px-3 pb-2 border-b-4 border-edge">
        <div className="flex items-center gap-2">
          <button onClick={() => setMenu(true)} className="w-11 h-11 bg-panel-2 font-pixel text-sm" aria-label="Session menu">
            ⋯
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-pixel text-[12px] text-accent truncate">{template.name.toUpperCase()}</div>
            <div className="text-sm text-muted">
              {elapsed} min · {doneSets}/{totalSets} sets
            </div>
          </div>
          <Btn small onClick={() => setConfirmFinish(true)}>
            Finish
          </Btn>
        </div>
        <div className="h-2 bg-bg-2 mt-2">
          <div className="h-full bg-xp transition-[width]" style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="px-3 pt-3">
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
        {!earns && <Panel className="!bg-panel-2 text-sm">🛑 You've already done {XP.strengthCapPerWeek} strength sessions this week. This one is logged, but earns no XP. Recovery is part of the plan!</Panel>}

        {mods.maxExercises === 1 && firstExDone && (
          <Panel accent className="text-center">
            <div className="mb-2">First exercise done. That counts as a session! 🎉</div>
            <Btn onClick={finish}>Finish & claim</Btn>
          </Panel>
        )}

        <Panel>
          <button className="w-full flex items-center justify-between min-h-[44px]" onClick={() => setWarmOpen(!warmOpen)}>
            <span className="font-pixel text-[11px] text-accent">WARM-UP {s.warmupDone.length}/{warmup.length}</span>
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
              e={e}
              last={exerciseLogs(app.data.sessions, e.ex, s.date, s.id).pop() ?? null}
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
  e,
  last,
  onSet,
  onComplete,
  onAdd,
  onRemove,
  onSwap,
}: {
  index: number
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

  return (
    <Panel className={allDone ? 'opacity-70' : ''} accent={!allDone && e.sets.some((x) => x.done)}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-pixel text-[11px] leading-relaxed">
            <span className="text-muted">{index + 1}.</span> {e.name}
            {allDone && <span className="text-good"> ✓</span>}
          </div>
          <div className="text-sm text-muted">
            {e.targetSets} × {repsLabel(e.reps, e.perSide, e.equipment === 'timed')} · rest {restLabel(e.rest)}
          </div>
        </div>
        <button onClick={onSwap} className="shrink-0 h-10 px-2 bg-panel-2 font-pixel text-[9px]" aria-label="Swap exercise">
          ⇄ SWAP
        </button>
      </div>

      {(e.suggested !== null || e.hint) && (
        <div className="mt-2 text-sm flex flex-wrap gap-x-2 items-center">
          {e.suggested !== null && weighted && (
            <Badge color="xp">
              {e.equipment === 'assisted' ? `${e.suggested} kg assist` : `${e.suggested} kg`}
            </Badge>
          )}
          <span className="text-ink/90">{e.hint}</span>
        </div>
      )}
      {lastText && (
        <div className="text-sm text-muted mt-1">
          Last ({fmtShort(last!.session.date)}): {lastText}
        </div>
      )}
      {info.cue && <div className="text-xs text-muted mt-1">💡 {info.cue}</div>}

      <div className="mt-2 space-y-2">
        <div className="grid grid-cols-[28px_1fr_1fr_44px_56px] gap-1.5 text-[11px] text-muted font-pixel px-0.5">
          <span>#</span>
          <span>{weighted ? weightLabel : ''}</span>
          <span>{e.equipment === 'timed' ? 'sec' : 'reps'}</span>
          <span>RIR</span>
          <span />
        </div>
        {e.sets.map((set, si) => {
          const target = e.rirTargets?.[si]
          const placeholder = defaultReps(e, si, last?.ex ?? null)
          return (
            <div key={si} className={`grid grid-cols-[28px_1fr_1fr_44px_56px] gap-1.5 items-center ${set.done ? 'opacity-80' : ''}`}>
              <span className="font-pixel text-[11px] text-muted text-center">{si + 1}</span>
              {weighted ? (
                <input
                  className={`px-input !min-h-[52px] text-center !px-1 ${set.done ? '!border-good' : ''}`}
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
                <span className="text-center text-muted text-sm">{e.equipment === 'plyo' ? 'jump' : 'hold'}</span>
              )}
              <input
                className={`px-input !min-h-[52px] text-center !px-1 ${set.done ? '!border-good' : ''} ${top && set.reps && set.reps >= top ? 'text-good' : ''}`}
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
                className="h-[52px] bg-bg-2 border-[3px] border-edge font-pixel text-[10px]"
                onClick={() => onSet(si, { rir: set.rir === null ? 0 : set.rir >= 5 ? null : set.rir + 1 })}
                aria-label={`Set ${si + 1} RIR`}
                title={target}
              >
                {set.rir ?? <span className="text-muted text-[9px]">{target?.startsWith('RIR') ? target.replace('RIR ', '').replace(' ok', '') : '–'}</span>}
              </button>
              <button
                onClick={() => onComplete(si)}
                className={`h-[52px] font-pixel text-lg border-[3px] ${set.done ? 'bg-good text-black border-ink' : 'bg-accent text-accent-ink border-ink'} active:translate-y-0.5`}
                aria-label={set.done ? `Undo set ${si + 1}` : `Complete set ${si + 1}`}
              >
                {set.done ? '✓' : '○'}
              </button>
            </div>
          )
        })}
        {e.rirTargets && (
          <div className="text-xs text-muted">
            Target: {[...new Set(e.rirTargets)].length === 1 ? e.rirTargets[0] : e.rirTargets.map((t, i) => `S${i + 1} ${t}`).join(' · ')}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onAdd} className="flex-1 h-10 bg-panel-2 text-sm">
            + set
          </button>
          <button onClick={onRemove} className="flex-1 h-10 bg-panel-2 text-sm">
            − set
          </button>
        </div>
      </div>
    </Panel>
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
