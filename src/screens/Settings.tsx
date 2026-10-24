import { useState } from 'react'
import { Btn, H, NumField, Panel, Toggle } from '../components/ui'
import { EXERCISES, PROGRAM, SESSIONS } from '../config/program'
import { updateSettings } from '../db/db'
import { fmtDate, isoInMelbourne } from '../lib/dates'
import { useApp } from '../state/app'

export function Settings() {
  const { data } = useApp()
  const s = data.settings
  return (
    <div className="px-3 pt-safe pb-32">
      <div className="font-pixel text-[16px] text-accent mt-2 mb-3">SETTINGS</div>
      <StartWeights />
      <Panel>
        <H>Sound</H>
        <Toggle on={s.soundOn} onChange={(v) => void updateSettings({ soundOn: v })} label="Game sounds (rest timer always beeps)" />
      </Panel>
      <TimeTravel />
    </div>
  )
}

export function weightedGymExercises(): string[] {
  const ids: string[] = []
  for (const slot of ['LA', 'UA', 'LB', 'UB'] as const) {
    for (const p of SESSIONS[slot].exercises) {
      for (const id of [p.weekSwap?.ex, p.ex]) {
        if (!id || ids.includes(id)) continue
        if (['plyo', 'timed', 'bodyweight'].includes(EXERCISES[id].equipment)) continue
        ids.push(id)
      }
    }
  }
  return ids
}

function StartWeights() {
  const { data } = useApp()
  const sw = data.settings.startWeights
  const [open, setOpen] = useState(false)
  return (
    <Panel>
      <H>Starting weights (week 1)</H>
      <p className="text-sm text-muted mb-2">Pick weights you could lift for the top of the rep range with 3+ reps to spare. After week 1, the app suggests weights for you.</p>
      <Btn variant="ghost" className="w-full" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : `Edit (${Object.keys(sw).length} set)`}
      </Btn>
      {open &&
        weightedGymExercises().map((id) => (
          <div key={id} className="flex items-center gap-2 py-1 border-b border-edge/40">
            <span className="flex-1 text-sm">
              {EXERCISES[id].name}
              {EXERCISES[id].equipment === 'assisted' && <span className="text-muted"> (assist kg)</span>}
            </span>
            <NumField
              className="w-24"
              value={sw[id] ?? null}
              placeholder="kg"
              onChange={(v) => {
                const next = { ...sw }
                if (v === null) delete next[id]
                else next[id] = v
                void updateSettings({ startWeights: next })
              }}
            />
          </div>
        ))}
    </Panel>
  )
}

function TimeTravel() {
  const { data } = useApp()
  const tt = data.settings.timeTravel
  const [val, setVal] = useState(tt ?? PROGRAM.start)
  return (
    <Panel>
      <H>Time travel (testing)</H>
      <p className="text-sm text-muted mb-2">
        Pretend it's a different date to try the app before {fmtDate(PROGRAM.start)}. Anything you log is saved on that date, so
        use Reset afterwards if you want a clean start. Real date: {fmtDate(isoInMelbourne())}.
      </p>
      <input type="date" className="px-input mb-2" value={val} onChange={(e) => setVal(e.target.value)} />
      <div className="flex gap-2">
        <Btn className="flex-1" onClick={() => void updateSettings({ timeTravel: val })}>
          Go
        </Btn>
        <Btn variant="ghost" className="flex-1" disabled={!tt} onClick={() => void updateSettings({ timeTravel: null })}>
          Back to now
        </Btn>
      </div>
    </Panel>
  )
}
