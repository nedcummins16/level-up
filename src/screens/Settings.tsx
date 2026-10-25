import { useEffect, useRef, useState } from 'react'
import { AddToCalendar } from '../components/Appointments'
import { Character } from '../components/Character'
import { FeelCardView } from '../components/FeelIt'
import { Btn, H, NumField, Panel, Sheet, Toggle } from '../components/ui'
import { COSMETICS, THEMES, TITLES } from '../config/game'
import { EXERCISES, PROGRAM, SESSIONS } from '../config/program'
import { updateSettings } from '../db/db'
import { exportBackup, parseBackup, resetAll, restoreBackup } from '../lib/backup'
import { addDays, fmtDate, isoInMelbourne, mondayOf, weekdayName } from '../lib/dates'
import { programEnd } from '../lib/plan'
import { useApp } from '../state/app'
import { InstallGuide } from './Install'

export function Settings() {
  const { data } = useApp()
  const s = data.settings
  const [install, setInstall] = useState(false)
  return (
    <div className="px-3 pt-safe pb-32">
      <div className="font-pixel text-[16px] text-accent mt-2 mb-3">SETTINGS</div>
      <HeroSettings />
      <BackupSettings />
      <StartWeights />
      <TrainingDays />
      <ScheduleSettings />
      <PermanentSwaps />
      <ExerciseGuide />
      <MachineSteps />
      <Panel>
        <H>Sound</H>
        <Toggle on={s.soundOn} onChange={(v) => void updateSettings({ soundOn: v })} label="Game sounds (the rest timer always beeps)" />
        <p className="text-xs text-muted">On iPhone the silent switch mutes sounds. The rest timer also flashes the screen.</p>
      </Panel>
      <Panel>
        <H>Christmas</H>
        <p className="text-sm text-muted mb-2">Upper B on Fri 25 Dec: {s.christmasMove === 'move' ? 'moved to Sat 26 Dec' : s.christmasMove === 'keep' ? 'kept on Fri' : 'not decided yet'}</p>
        <div className="flex gap-2">
          <Btn small variant={s.christmasMove === 'move' ? 'primary' : 'ghost'} className="flex-1" onClick={() => void updateSettings({ christmasMove: 'move' })}>
            Move to Sat 26
          </Btn>
          <Btn small variant={s.christmasMove === 'keep' ? 'primary' : 'ghost'} className="flex-1" onClick={() => void updateSettings({ christmasMove: 'keep' })}>
            Keep Fri 25
          </Btn>
        </div>
      </Panel>
      <Panel>
        <H>Install on iPhone</H>
        <Btn variant="ghost" className="w-full" onClick={() => setInstall(true)}>
          How to install
        </Btn>
      </Panel>
      <TimeTravel />
      <StorageInfo />
      <DangerZone />
      <Sheet open={install} onClose={() => setInstall(false)} title="Install Level Up">
        <InstallGuide />
      </Sheet>
    </div>
  )
}

function HeroSettings() {
  const { data, game } = useApp()
  const s = data.settings
  const [name, setName] = useState(s.heroName)
  const slots = ['head', 'shirt', 'arms', 'shoes', 'hand', 'back', 'aura'] as const
  return (
    <Panel>
      <H>Hero</H>
      <div className="flex gap-3 items-center mb-3">
        <Character cosmetics={s.cosmetics} size={110} />
        <div className="flex-1">
          <label className="block text-sm text-muted mb-1">Name</label>
          <input className="px-input mb-2" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} onBlur={() => void updateSettings({ heroName: name.trim() || 'Hero' })} />
          <label className="block text-sm text-muted mb-1">Title</label>
          <select className="px-input" value={s.titleLevel ?? ''} onChange={(e) => void updateSettings({ titleLevel: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Latest ({game.title})</option>
            {TITLES.slice(0, game.level).map((t, i) => (
              <option key={t} value={i + 1}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="text-sm text-muted mb-1">Colour theme</div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {THEMES.map((t) => {
          const locked = t.level > game.level
          return (
            <button
              key={t.id}
              data-theme={t.id}
              disabled={locked}
              onClick={() => void updateSettings({ themeId: t.id })}
              className={`h-14 border-[3px] text-xs relative ${s.themeId === t.id ? 'border-ink' : 'border-edge'} ${locked ? 'opacity-40' : ''}`}
              style={{ background: 'var(--panel)', color: 'var(--accent)' }}
            >
              {locked ? `🔒 LV${t.level}` : t.name}
            </button>
          )
        })}
      </div>
      <div className="text-sm text-muted mb-1">Gear</div>
      {slots.map((slot) => {
        const items = COSMETICS.filter((c) => c.slot === slot)
        return (
          <div key={slot} className="flex items-center gap-2 py-1">
            <span className="w-16 text-sm capitalize">{slot}</span>
            <select
              className="px-input !min-h-[44px] flex-1"
              value={s.cosmetics[slot] ?? ''}
              onChange={(e) => {
                const next = { ...s.cosmetics }
                if (e.target.value) next[slot] = e.target.value
                else delete next[slot]
                void updateSettings({ cosmetics: next })
              }}
            >
              <option value="">None</option>
              {items.map((c) => (
                <option key={c.id} value={c.id} disabled={c.level > game.level}>
                  {c.level > game.level ? `🔒 ${c.name} (LV ${c.level})` : c.name}
                </option>
              ))}
            </select>
          </div>
        )
      })}
    </Panel>
  )
}

function BackupSettings() {
  const { data } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const last = data.settings.lastBackupAt
  const daysSince = last ? Math.floor((Date.now() - last) / 86_400_000) : null
  return (
    <Panel accent={daysSince === null || daysSince > 7}>
      <H>Backup</H>
      <p className="text-sm text-muted mb-2">
        All data lives only on this phone. iOS can clear it, so save a backup to Files or iCloud Drive every week.
        <br />
        {last ? `Last backup: ${fmtDate(new Date(last).toISOString().slice(0, 10))}${daysSince! > 7 ? ' ⚠️' : ''}` : 'No backup yet ⚠️'}
      </p>
      <Btn
        variant="gold"
        className="w-full mb-2"
        onClick={async () => {
          const r = await exportBackup()
          setMsg(r === 'cancelled' ? null : r === 'shared' ? 'Backup shared ✓' : 'Backup downloaded ✓')
        }}
      >
        💾 Export backup
      </Btn>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          try {
            const backup = parseBackup(await f.text())
            if (!confirm(`Restore backup from ${backup.exportedAt.slice(0, 10)}? This REPLACES everything on this phone.`)) return
            await restoreBackup(backup)
            location.reload()
          } catch (err) {
            alert((err as Error).message || 'Could not read that file.')
          }
        }}
      />
      <Btn variant="ghost" className="w-full" onClick={() => fileRef.current?.click()}>
        📂 Import / restore
      </Btn>
      {msg && <p className="text-sm text-good mt-2">{msg}</p>}
    </Panel>
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
      <H>Starting weights</H>
      <p className="text-sm text-muted mb-2">Pick weights you could lift for the top of the rep range with 3+ reps to spare. After your first session the app suggests weights.</p>
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

function TrainingDays() {
  const { data } = useApp()
  const td = data.settings.trainingDays
  const [draft, setDraft] = useState(td)
  const slots = ['LA', 'UA', 'LB', 'UB'] as const
  const days = Object.values(draft)
  const dup = new Set(days).size !== days.length
  const lowerB2B = Math.abs(draft.LA - draft.LB) === 1
  const usesCardio = days.includes(PROGRAM.cardioDay) || days.includes(PROGRAM.saturdayDay)
  const changed = slots.some((k) => draft[k] !== td[k])
  return (
    <Panel>
      <H>Training days</H>
      {slots.map((k) => (
        <div key={k} className="flex items-center gap-2 py-1">
          <span className="w-24">{SESSIONS[k].name}</span>
          <select className="px-input !min-h-[44px] flex-1" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {weekdayName(d, true)}
              </option>
            ))}
          </select>
        </div>
      ))}
      {dup && <p className="text-sm text-danger">Two sessions on one day: pick different days.</p>}
      {!dup && lowerB2B && <p className="text-sm text-xp">⚠️ Lower A and Lower B are on back-to-back days.</p>}
      {!dup && usesCardio && <p className="text-sm text-muted">Note: this shares a day with Wed cardio or Saturday tennis.</p>}
      <div className="flex gap-2 mt-2">
        <Btn small className="flex-1" disabled={dup || !changed} onClick={() => void updateSettings({ trainingDays: draft })}>
          Save days
        </Btn>
        <Btn small variant="ghost" className="flex-1" onClick={() => setDraft({ ...PROGRAM.trainingDays })}>
          Default
        </Btn>
      </div>
    </Panel>
  )
}

function ScheduleSettings() {
  const { data, today } = useApp()
  const s = data.settings
  const [open, setOpen] = useState(false)
  const weeks: string[] = []
  for (let w = mondayOf(today < PROGRAM.start ? PROGRAM.start : today); w <= programEnd(s.repeats); w = addDays(w, 7)) weeks.push(w)
  return (
    <Panel>
      <H>Times, places & reminders</H>
      <p className="text-sm text-muted mb-2">
        Default time for each day and where you train. Change a single day by tapping its 🕓 on Today or Week. The Sunday check-in lets you plan next week and adds it to
        your Calendar with reminders.
      </p>
      <Btn variant="ghost" className="w-full mb-2" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Edit defaults'}
      </Btn>
      {open && (
        <div className="mb-3">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <div key={d} className="flex items-center gap-2 py-1">
              <span className="w-24 text-sm">{weekdayName(d, true)}</span>
              <input
                type="time"
                className="px-input !min-h-[44px] flex-1"
                value={s.defaultTimes[String(d)] ?? '16:00'}
                onChange={(e) => void updateSettings({ defaultTimes: { ...s.defaultTimes, [String(d)]: e.target.value } })}
              />
            </div>
          ))}
          {(
            [
              ['gym', 'Gym'],
              ['cardio', 'Cardio (run / swim)'],
              ['tennis', 'Tennis'],
              ['beach', 'Beach block'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="block mt-2">
              <span className="block text-sm text-muted mb-1">{label}</span>
              <BlurInput value={s.places[k]} onSave={(v) => void updateSettings({ places: { ...s.places, [k]: v.trim() } })} />
            </label>
          ))}
        </div>
      )}
      <AddToCalendar weekStarts={weeks} label="Add whole remaining plan to Calendar" name="level-up-plan" />
      <p className="text-xs text-muted mt-1">Tip: do this OR the weekly check-in export, not both, or you'll get double events. Missed sessions shift, so weekly is more accurate.</p>
    </Panel>
  )
}

/** Text input that saves when you leave it (no lost keystrokes). */
function BlurInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value)
  return <input className="px-input !min-h-[44px]" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} />
}

function ExerciseGuide() {
  const [open, setOpen] = useState(false)
  const [ex, setEx] = useState<string | null>(null)
  const groups = (['LA', 'UA', 'LB', 'UB', 'BA', 'BB'] as const).map((k) => ({ name: SESSIONS[k].name, ids: SESSIONS[k].exercises.flatMap((p) => [p.weekSwap?.ex, p.ex].filter(Boolean) as string[]) }))
  const inPlan = new Set(groups.flatMap((g) => g.ids))
  const others = Object.keys(EXERCISES).filter((id) => !inPlan.has(id))
  return (
    <Panel>
      <H>🎯 Exercise guide</H>
      <p className="text-sm text-muted mb-2">Where you should feel every exercise, and how to fix it when you feel it somewhere else.</p>
      <Btn variant="ghost" className="w-full" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Open guide'}
      </Btn>
      {open &&
        [...groups, { name: 'Swaps', ids: others }].map((g) => (
          <div key={g.name} className="mt-3">
            <div className="font-pixel text-[9px] text-accent mb-1">{g.name.toUpperCase()}</div>
            {g.ids.map((id) => (
              <button key={id} className="w-full text-left py-2 border-b border-edge/40 flex justify-between items-center" onClick={() => setEx(id)}>
                <span>{EXERCISES[id].name}</span>
                <span className="text-muted">›</span>
              </button>
            ))}
          </div>
        ))}
      <Sheet open={!!ex} onClose={() => setEx(null)} title={ex ? EXERCISES[ex].name : ''}>
        {ex && <FeelCardView ex={ex} />}
      </Sheet>
    </Panel>
  )
}

function PermanentSwaps() {
  const { data } = useApp()
  const swaps = data.settings.swaps
  const [open, setOpen] = useState(false)
  const ids = [...new Set((['LA', 'UA', 'LB', 'UB', 'BA', 'BB'] as const).flatMap((k) => SESSIONS[k].exercises.flatMap((p) => [p.ex, p.weekSwap?.ex].filter(Boolean) as string[])))].filter(
    (id) => (EXERCISES[id].alts ?? []).length > 0,
  )
  return (
    <Panel>
      <H>Swap exercises permanently</H>
      <p className="text-sm text-muted mb-2">Gym doesn't have something? Replace it for every future session. ({Object.keys(swaps).length} active)</p>
      <Btn variant="ghost" className="w-full" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Edit swaps'}
      </Btn>
      {open &&
        ids.map((id) => (
          <div key={id} className="py-1 border-b border-edge/40">
            <div className="text-sm">{EXERCISES[id].name}</div>
            <select
              className="px-input !min-h-[44px]"
              value={swaps[id] ?? ''}
              onChange={(e) => {
                const next = { ...swaps }
                if (e.target.value) next[id] = e.target.value
                else delete next[id]
                void updateSettings({ swaps: next })
              }}
            >
              <option value="">Keep {EXERCISES[id].name}</option>
              {(EXERCISES[id].alts ?? []).map((a) => (
                <option key={a} value={a}>
                  → {EXERCISES[a].name}
                </option>
              ))}
            </select>
          </div>
        ))}
    </Panel>
  )
}

function MachineSteps() {
  const { data } = useApp()
  const ms = data.settings.machineSteps
  const [open, setOpen] = useState(false)
  const ids = Object.entries(EXERCISES)
    .filter(([, e]) => e.equipment === 'machine' || e.equipment === 'assisted')
    .map(([id]) => id)
  return (
    <Panel>
      <H>Machine weight steps</H>
      <p className="text-sm text-muted mb-2">How much one pin moves the stack (default {PROGRAM.defaultMachineStep} kg). Progression adds one step.</p>
      <Btn variant="ghost" className="w-full" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Edit steps'}
      </Btn>
      {open &&
        ids.map((id) => (
          <div key={id} className="flex items-center gap-2 py-1 border-b border-edge/40">
            <span className="flex-1 text-sm">{EXERCISES[id].name}</span>
            <select
              className="px-input !min-h-[44px] !w-28"
              value={ms[id] ?? PROGRAM.defaultMachineStep}
              onChange={(e) => void updateSettings({ machineSteps: { ...ms, [id]: Number(e.target.value) } })}
            >
              {[1, 2, 2.5, 4, 4.5, 5, 6, 7, 10].map((n) => (
                <option key={n} value={n}>
                  {n} kg
                </option>
              ))}
            </select>
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
        Pretend it's another date, e.g. to try the app before {fmtDate(PROGRAM.start)}. Anything you log is saved on that date, so use Reset afterwards for a clean start.
        Real date: {fmtDate(isoInMelbourne())}.
      </p>
      <input type="date" className="px-input mb-2" value={val} onChange={(e) => setVal(e.target.value)} />
      <div className="flex gap-2">
        <Btn className="flex-1" disabled={!val} onClick={() => void updateSettings({ timeTravel: val })}>
          Go
        </Btn>
        <Btn variant="ghost" className="flex-1" disabled={!tt} onClick={() => void updateSettings({ timeTravel: null })}>
          Back to now
        </Btn>
      </div>
    </Panel>
  )
}

function StorageInfo() {
  const [info, setInfo] = useState<{ persisted: boolean | null; usage: string | null }>({ persisted: null, usage: null })
  useEffect(() => {
    void (async () => {
      try {
        const persisted = (await navigator.storage?.persisted?.()) ?? null
        const est = await navigator.storage?.estimate?.()
        setInfo({ persisted, usage: est?.usage !== undefined ? `${(est.usage / 1024 / 1024).toFixed(1)} MB` : null })
      } catch {
        // unsupported
      }
    })()
  }, [])
  return (
    <Panel>
      <H>Storage</H>
      <p className="text-sm text-muted">
        Persistent storage: {info.persisted === null ? 'unknown' : info.persisted ? 'granted ✓' : 'not granted (back up often!)'}
        {info.usage && (
          <>
            <br />
            Using {info.usage} on this device
          </>
        )}
        <br />
        App version {__APP_VERSION__}
      </p>
    </Panel>
  )
}

function DangerZone() {
  return (
    <Panel>
      <H className="!text-danger">Danger zone</H>
      <Btn
        variant="danger"
        className="w-full"
        onClick={async () => {
          if (!confirm('Delete ALL your data on this phone? Export a backup first!')) return
          if (!confirm('Really? This cannot be undone.')) return
          await resetAll()
          location.reload()
        }}
      >
        Reset everything
      </Btn>
    </Panel>
  )
}
