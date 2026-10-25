import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { PhotoInput, PhotoThumb } from '../components/PhotoInput'
import { Btn, H, NumField, Panel, Sheet } from '../components/ui'
import { PROGRAM, SESSIONS, TEST_ITEMS } from '../config/program'
import type { TestItemId } from '../config/types'
import { db } from '../db/db'
import { avg7, calorieAdvice, weekAvg, weighIns } from '../lib/body'
import { addDays, fmtDate, fmtShort, mondayOf, type ISODate } from '../lib/dates'
import { allTestDays, programEnd } from '../lib/plan'
import { BODYWEIGHT_LIKE, epley } from '../lib/progression'
import { useApp } from '../state/app'
import { hallOfPRs } from '../lib/growth'
import { prText } from '../lib/records'
import { fmtSec } from './Boss'

// Validated categorical slots (dark surface): blue then orange.
const SERIES_1 = '#3987e5'
const SERIES_2 = '#d95926'
const GRID = 'rgb(164 156 214 / 0.18)'
const AXIS = { fill: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-body)' }

const legendText = (v: string) => <span style={{ color: 'var(--ink)' }}>{v}</span>

type Sub = 'lifts' | 'prs' | 'body' | 'calendar' | 'tests'

export function Progress() {
  const [sub, setSub] = useState<Sub>('lifts')
  return (
    <div className="px-3 pt-safe pb-32">
      <div className="font-pixel text-[22px] text-accent mt-2 mb-3">STATS</div>
      <div className="grid grid-cols-5 gap-1 mb-2">
        {(
          [
            ['lifts', 'Lifts'],
            ['prs', 'PRs'],
            ['body', 'Body'],
            ['calendar', 'Log'],
            ['tests', 'Tests'],
          ] as [Sub, string][]
        ).map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)} className={`cut-sm h-11 font-pixel text-[12px] tracking-[0.12em] uppercase ${sub === id ? 'bg-accent text-accent-ink' : 'bg-panel-2 text-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'lifts' && <Lifts />}
      {sub === 'prs' && <HallOfPRs />}
      {sub === 'body' && <Body />}
      {sub === 'calendar' && <Heatmap />}
      {sub === 'tests' && <TestsTable />}
    </div>
  )
}

function ChartTooltip({ active, payload, label, unit = 'kg' }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-2 border-[3px] border-edge px-2 py-1 text-sm">
      <div className="text-muted">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5" style={{ background: p.color }} />
          <span>
            {p.name}: {p.value} {unit}
          </span>
        </div>
      ))}
    </div>
  )
}

function Lifts() {
  const { data } = useApp()
  const logged = useMemo(() => {
    const map = new Map<string, { name: string; equipment: string; count: number }>()
    for (const s of data.sessions) {
      if (s.status !== 'done') continue
      for (const e of s.exercises) {
        if (!e.sets.some((x) => x.done)) continue
        const cur = map.get(e.ex) ?? { name: e.name, equipment: e.equipment, count: 0 }
        cur.count++
        map.set(e.ex, cur)
      }
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count)
  }, [data.sessions])
  const [ex, setEx] = useState<string | null>(null)
  const sel = ex ?? logged[0]?.[0] ?? null
  const info = logged.find(([id]) => id === sel)?.[1]
  const bw = info ? BODYWEIGHT_LIKE.includes(info.equipment as never) : false
  const assisted = info?.equipment === 'assisted'

  const rows = useMemo(() => {
    if (!sel) return []
    return data.sessions
      .filter((s) => s.status === 'done')
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .flatMap((s) =>
        s.exercises
          .filter((e) => e.ex === sel)
          .map((e) => {
            const sets = e.sets.filter((x) => x.done && x.reps)
            if (!sets.length) return null
            const top = assisted ? Math.min(...sets.map((x) => x.weight ?? 0)) : Math.max(...sets.map((x) => x.weight ?? 0))
            const best1rm = Math.max(...sets.map((x) => epley(x.weight ?? 0, x.reps ?? 0)))
            const maxReps = Math.max(...sets.map((x) => x.reps ?? 0))
            return { date: s.date, label: fmtShort(s.date), top, e1rm: Math.round(best1rm * 10) / 10, reps: maxReps, sets }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null),
      )
  }, [data.sessions, sel, assisted])

  if (!logged.length) return <Panel>No lifts logged yet. Finish a session and your charts appear here.</Panel>

  return (
    <>
      <Panel>
        <select className="px-input mb-3" value={sel ?? ''} onChange={(e) => setEx(e.target.value)} aria-label="Exercise">
          {logged.map(([id, i]) => (
            <option key={id} value={id}>
              {i.name} ({i.count})
            </option>
          ))}
        </select>
        <div className="text-sm text-muted mb-1">
          {bw ? 'Best reps per session' : assisted ? 'Assistance used (lower = stronger)' : 'Top set weight and estimated 1RM (Epley), kg'}
        </div>
        <div style={{ height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={['auto', 'auto']} allowDecimals={false} />
              <Tooltip content={<ChartTooltip unit={bw ? 'reps' : 'kg'} />} cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} />
              {rows.length > 0 && !bw && <Legend wrapperStyle={{ fontSize: 13 }} formatter={legendText} />}
              {bw ? (
                <Line type="monotone" dataKey="reps" name="Best reps" stroke={SERIES_1} strokeWidth={2} dot={{ r: 4, fill: SERIES_1, stroke: 'var(--panel)', strokeWidth: 2 }} isAnimationActive={false} />
              ) : (
                <>
                  <Line type="monotone" dataKey="top" name={assisted ? 'Assistance' : 'Top set'} stroke={SERIES_1} strokeWidth={2} dot={{ r: 4, fill: SERIES_1, stroke: 'var(--panel)', strokeWidth: 2 }} isAnimationActive={false} />
                  {!assisted && <Line type="monotone" dataKey="e1rm" name="Est. 1RM" stroke={SERIES_2} strokeWidth={2} dot={{ r: 4, fill: SERIES_2, stroke: 'var(--panel)', strokeWidth: 2 }} isAnimationActive={false} />}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel>
        <H>History</H>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-left">
              <th className="font-normal py-1">Date</th>
              <th className="font-normal">Sets</th>
              {!bw && <th className="font-normal text-right">e1RM</th>}
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r, i) => (
              <tr key={i} className="border-t border-edge/40">
                <td className="py-1.5 pr-2 whitespace-nowrap">{fmtShort(r.date)}</td>
                <td>{r.sets.map((x) => (x.weight ? `${x.weight}×${x.reps}` : x.reps)).join(', ')}</td>
                {!bw && <td className="text-right">{assisted ? '–' : r.e1rm}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  )
}

function HallOfPRs() {
  const { data } = useApp()
  const hall = useMemo(() => hallOfPRs(data.sessions), [data.sessions])
  if (!hall.length) return <Panel>Your best set on every exercise will hang here. Finish a session to start the wall.</Panel>
  return (
    <Panel>
      <H>Hall of PRs</H>
      <p className="text-sm text-muted mb-2">Your best set ever on each exercise.</p>
      {hall.map((h) => (
        <div key={h.ex} className="flex items-center gap-3 py-2 border-b border-edge/60">
          <div className="flex-1 min-w-0">
            <div className="font-pixel text-[14px] truncate">{h.name.toUpperCase()}</div>
            <div className="text-xs text-muted">
              {fmtDate(h.date)}
              {h.e1rm ? ` · e1RM ${h.e1rm} kg` : ''}
            </div>
          </div>
          <div className="font-pixel text-[17px] text-accent whitespace-nowrap">{prText(h)}</div>
        </div>
      ))}
    </Panel>
  )
}

function Body() {
  const { data, today } = useApp()
  const wi = weighIns(data.daily)
  const chart = wi.map((w) => ({ label: fmtShort(w.date), date: w.date, weight: w.kg, avg: avg7(data.daily, w.date) }))
  const advice = calorieAdvice(data.daily, today)
  const weeks = Array.from({ length: 6 }, (_, i) => addDays(mondayOf(today), -7 * (5 - i)))
  const weekRows = weeks.map((w, i) => {
    const a = weekAvg(data.daily, w)
    const prev = i > 0 ? weekAvg(data.daily, weeks[i - 1]) : weekAvg(data.daily, addDays(w, -7))
    return { w, a, change: a !== null && prev !== null ? Math.round((a - prev) * 100) / 100 : null }
  })

  return (
    <>
      <Panel>
        <H>Bodyweight</H>
        {wi.length === 0 ? (
          <p className="text-sm text-muted">Weigh in on the Hero screen each morning to see your trend.</p>
        ) : (
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={[(min: number) => Math.floor(Math.min(min, PROGRAM.body.startKg) - 1), (max: number) => Math.ceil(Math.max(max, PROGRAM.body.goalKg) + 0.5)]} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} />
                <Legend wrapperStyle={{ fontSize: 13 }} formatter={legendText} />
                <ReferenceLine y={PROGRAM.body.goalKg} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: `Goal ${PROGRAM.body.goalKg}`, fill: 'var(--muted)', fontSize: 12, position: 'insideTopRight' }} />
                <Scatter dataKey="weight" name="Weigh-in" fill={SERIES_2} isAnimationActive={false} />
                <Line type="monotone" dataKey="avg" name="7-day avg" stroke={SERIES_1} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel accent={advice.kind === 'add' || advice.kind === 'cut'}>
        <H>Weekly change</H>
        <table className="w-full text-sm mb-2">
          <tbody>
            {weekRows.map((r) => (
              <tr key={r.w} className="border-t border-edge/40">
                <td className="py-1.5">Week of {fmtShort(r.w)}</td>
                <td className="text-right">{r.a !== null ? `${r.a} kg` : '–'}</td>
                <td className={`text-right w-20 ${r.change === null ? 'text-muted' : r.change < 0.25 ? 'text-xp' : r.change > 0.75 ? 'text-danger' : 'text-good'}`}>
                  {r.change === null ? '' : `${r.change > 0 ? '+' : ''}${r.change}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm">
          {advice.kind === 'add' ? '🍽️ ' : advice.kind === 'cut' ? '✂️ ' : advice.kind === 'ok' ? '✅ ' : 'ℹ️ '}
          {advice.message}
        </p>
        <p className="text-xs text-muted mt-1">Target: +0.25 to +0.75 kg per week.</p>
      </Panel>

      <Measurements />
      <Photos />
    </>
  )
}

function Measurements() {
  const { data, today } = useApp()
  const todayM = data.measurements.find((m) => m.date === today)
  const [armL, setArmL] = useState<number | null>(todayM?.armL ?? null)
  const [armR, setArmR] = useState<number | null>(todayM?.armR ?? null)
  const [chest, setChest] = useState<number | null>(todayM?.chest ?? null)
  const [waist, setWaist] = useState<number | null>(todayM?.waist ?? null)
  return (
    <Panel>
      <H>Measurements (cm)</H>
      <p className="text-xs text-muted mb-2">Decimals are fine (e.g. 31.5). Flexed arm at the widest point.</p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <NumField label="Left arm" value={armL} onChange={setArmL} />
        <NumField label="Right arm" value={armR} onChange={setArmR} />
        <NumField label="Chest" value={chest} onChange={setChest} />
        <NumField label="Waist" value={waist} onChange={setWaist} />
      </div>
      <Btn
        small
        className="w-full"
        disabled={armL === null && armR === null && chest === null && waist === null}
        onClick={() => void db.measurements.put({ ...(todayM ?? {}), date: today, armL, armR, chest, waist })}
      >
        Save for {fmtShort(today)}
      </Btn>
      {data.measurements.length > 0 && (
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-muted">
              <th className="font-normal text-left">Date</th>
              <th className="font-normal text-right">L arm</th>
              <th className="font-normal text-right">R arm</th>
              <th className="font-normal text-right">Chest</th>
              <th className="font-normal text-right">Waist</th>
            </tr>
          </thead>
          <tbody>
            {[...data.measurements].reverse().map((m) => (
              <tr key={m.id} className="border-t border-edge/40">
                <td className="py-1.5">{fmtDate(m.date)}</td>
                {m.armL == null && m.armR == null && m.arm != null ? (
                  <td colSpan={2} className="text-right">
                    {m.arm} <span className="text-muted text-xs">(one arm)</span>
                  </td>
                ) : (
                  <>
                    <td className="text-right">{m.armL ?? '–'}</td>
                    <td className="text-right">{m.armR ?? '–'}</td>
                  </>
                )}
                <td className="text-right">{m.chest ?? '–'}</td>
                <td className="text-right">{m.waist ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

function Photos() {
  const { today } = useApp()
  const photos = useLiveQuery(() => db.photos.orderBy('date').reverse().toArray(), []) ?? []
  const [big, setBig] = useState<number | null>(null)
  const byDate = photos.reduce<Record<string, typeof photos>>((acc, p) => {
    ;(acc[p.date] ??= []).push(p)
    return acc
  }, {})
  const bigPhoto = photos.find((p) => p.id === big)
  return (
    <Panel>
      <H>Progress photos</H>
      <PhotoInput date={today} />
      {Object.entries(byDate)
        .filter(([d]) => d !== today)
        .map(([d, ps]) => (
          <div key={d} className="mt-3">
            <div className="text-sm text-muted mb-1">{fmtDate(d)}</div>
            <div className="grid grid-cols-3 gap-2">
              {ps.map((p) => (
                <PhotoThumb key={p.id} photo={p} onClick={() => setBig(p.id!)} />
              ))}
            </div>
          </div>
        ))}
      <Sheet open={!!bigPhoto} onClose={() => setBig(null)} title={bigPhoto ? fmtDate(bigPhoto.date) : ''}>
        {bigPhoto && <PhotoThumb photo={bigPhoto} />}
      </Sheet>
    </Panel>
  )
}

const HEAT = ['var(--bg-2)', '#1f4a8a', '#3987e5', '#8fc1ff']

function Heatmap() {
  const { data, today, planFor } = useApp()
  const [sel, setSel] = useState<ISODate | null>(null)
  const start = mondayOf(PROGRAM.start)
  const end = programEnd(data.settings.repeats)
  const weeks: ISODate[] = []
  for (let w = start; w <= end; w = addDays(w, 7)) weeks.push(w)
  const bossOn = (d: ISODate) => data.tests.filter((t) => t.date === d && t.completedAt)
  const doneOn = (d: ISODate) => data.sessions.filter((s) => s.date === d && s.status === 'done')
  const countOn = (d: ISODate) => doneOn(d).length + bossOn(d).length
  const plans = useMemo(() => new Map(weeks.map((w) => [w, planFor(w)])), [planFor, weeks.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const plannedOn = (d: ISODate) => plans.get(mondayOf(d))?.days.find((x) => x.date === d)?.items.filter((i) => i.counts) ?? []
  const total = data.sessions.filter((s) => s.status === 'done' && s.date >= start).length + data.tests.filter((t) => t.completedAt).length

  return (
    <Panel>
      <H>Sessions log</H>
      <div className="text-sm text-muted mb-2">{total} sessions completed</div>
      <div className="grid grid-cols-[34px_repeat(7,1fr)] gap-1 text-center">
        <span />
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="font-pixel text-[12px] text-muted">
            {d}
          </span>
        ))}
        {weeks.map((w, wi) => (
          <div key={w} className="contents">
            <span className="font-pixel text-[11px] text-muted self-center">W{wi + 1}</span>
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(w, i)
              const n = Math.min(3, countOn(d))
              const missed = d < today && n === 0 && plannedOn(d).length > 0
              return (
                <button
                  key={d}
                  onClick={() => setSel(d)}
                  aria-label={`${fmtDate(d)}: ${countOn(d)} sessions`}
                  className={`h-7 grid place-items-center text-[10px] ${d === today ? 'outline outline-2 outline-accent' : ''} ${sel === d ? 'outline outline-2 outline-ink' : ''}`}
                  style={{ background: HEAT[n] }}
                >
                  {missed ? <span className="text-danger">✗</span> : null}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-muted flex-wrap">
        <span>Sessions per day:</span>
        {['0', '1', '2', '3+'].map((l, i) => (
          <span key={l} className="flex items-center gap-1">
            <span className="inline-block w-3.5 h-3.5 border border-edge" style={{ background: HEAT[i] }} />
            {l}
          </span>
        ))}
        <span>
          <span className="text-danger">✗</span> missed
        </span>
      </div>
      {sel && (
        <div className="mt-3 p-2 bg-bg-2 text-sm">
          <div className="font-pixel text-[14px] text-accent mb-1">{fmtDate(sel)}</div>
          {countOn(sel) ? (
            <>
              {doneOn(sel).map((s) => (
                <div key={s.id}>
                  ✓ {s.label ?? (s.slot in SESSIONS ? SESSIONS[s.slot as keyof typeof SESSIONS].name : s.slot)}
                  {s.minutes ? ` · ${s.minutes} min` : ''}
                </div>
              ))}
              {bossOn(sel).map((t) => (
                <div key={t.id}>👹 Boss defeated</div>
              ))}
            </>
          ) : (
            <div className="text-muted">Nothing logged</div>
          )}
          {plannedOn(sel).length > 0 && <div className="text-muted text-xs mt-1">Planned: {plannedOn(sel).map((i) => i.label).join(', ')}</div>}
        </div>
      )}
    </Panel>
  )
}

function TestsTable() {
  const { data } = useApp()
  const days = allTestDays(data.settings.repeats)
  const done = data.tests.filter((t) => Object.keys(t.results).length).sort((a, b) => (a.date < b.date ? -1 : 1))
  if (!done.length) return <Panel>No boss battles yet. Test days: {days.map((d) => fmtShort(d.date)).join(', ')}.</Panel>
  const keys: { key: string; label: string; item: TestItemId }[] = [
    ...(['bodyweight', 'armL', 'armR', 'chest', 'waist', 'pushups', 'pullups', 'toeTouch', 'jumpReach', 'fiveK', 'restingHr'] as TestItemId[]).map((k) => ({
      key: k,
      label: `${TEST_ITEMS[k].name}${TEST_ITEMS[k].unit && k !== 'fiveK' ? ` (${TEST_ITEMS[k].unit})` : ''}`,
      item: k,
    })),
    { key: 'lifts_squat', label: 'Squat e1RM', item: 'lifts' },
    { key: 'lifts_bench', label: 'Bench e1RM', item: 'lifts' },
    { key: 'lifts_deadlift', label: 'Deadlift e1RM', item: 'lifts' },
  ]
  const rows = keys.filter((k) => done.some((t) => typeof t.results[k.key] === 'number'))
  const fmt = (k: string, v: number | undefined) => (v === undefined ? '–' : k === 'fiveK' ? fmtSec(v) : v)
  return (
    <Panel>
      <H>Test results</H>
      <div className="overflow-x-auto -mx-1">
        <table className="text-sm min-w-full">
          <thead>
            <tr className="text-muted">
              <th className="font-normal text-left pr-2 sticky left-0 bg-panel">Test</th>
              {done.map((t) => (
                <th key={t.id} className="font-normal text-right px-2 whitespace-nowrap">
                  {fmtShort(t.date)}
                </th>
              ))}
              {done.length > 1 && <th className="font-normal text-right px-2">Δ</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const vals = done.map((t) => t.results[r.key] as number | undefined)
              const nums = vals.filter((v): v is number => v !== undefined)
              const delta = nums.length > 1 ? Math.round((nums[nums.length - 1] - nums[0]) * 10) / 10 : null
              const better = TEST_ITEMS[r.item].better
              const good = delta !== null && delta !== 0 && (better === 'higher' ? delta > 0 : better === 'lower' ? delta < 0 : false)
              return (
                <tr key={r.key} className="border-t border-edge/40">
                  <td className="py-1.5 pr-2 sticky left-0 bg-panel">{r.label}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="text-right px-2">
                      {fmt(r.key, v)}
                    </td>
                  ))}
                  {done.length > 1 && (
                    <td className={`text-right px-2 ${good ? 'text-good' : 'text-muted'}`}>
                      {delta === null ? '' : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${r.key === 'fiveK' ? fmtSec(Math.abs(delta)) : Math.abs(delta)}`}
                      {good ? ' ▲' : ''}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
