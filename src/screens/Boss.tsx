import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { PhotoInput } from '../components/PhotoInput'
import { Bar, Btn, NumField, Panel, Sheet } from '../components/ui'
import { XP } from '../config/game'
import { TEST_ITEMS } from '../config/program'
import type { TestItemId } from '../config/types'
import { db } from '../db/db'
import type { TestResult } from '../db/types'
import { avg7 } from '../lib/body'
import { addDays, fmtDate } from '../lib/dates'
import { liftBests } from '../lib/game'
import { bossTrophies } from '../lib/growth'
import { allTestDays } from '../lib/plan'
import { useApp } from '../state/app'
import { useFx } from '../state/fx'

export function fmtSec(sec: number) {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}

function parseTime(s: string): number | null {
  const m = s.trim().match(/^(\d{1,3})[:.](\d{1,2})$/)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n * 60 : null
}

const LIFT_KEYS = ['lifts_squat', 'lifts_bench', 'lifts_deadlift'] as const

export function BossCard({ testId }: { testId: string }) {
  const { data } = useApp()
  const [open, setOpen] = useState(false)
  const td = allTestDays(data.settings.repeats).find((t) => t.id === testId)
  const res = data.tests.find((t) => t.id === testId)
  const photosToday = useLiveQuery(() => (td ? db.photos.where('date').equals(td.date).count() : 0), [td?.date]) ?? 0
  if (!td) return null
  const filled = td.items.filter((i) => isFilled(i, res, photosToday)).length
  const beaten = !!res?.completedAt
  return (
    <>
      <Panel accent={!beaten} className="!bg-[linear-gradient(180deg,var(--panel-2),var(--panel))]">
        <div className="flex items-center gap-3">
          <div className={`text-5xl ${beaten ? 'grayscale opacity-60' : 'anim-bob'}`}>{td.bossEmoji}</div>
          <div className="flex-1 min-w-0">
            <div className="font-pixel text-[12px] text-danger">{beaten ? 'DEFEATED' : 'BOSS BATTLE'}</div>
            <div className="font-pixel text-[15px] leading-relaxed">{td.boss.toUpperCase()}</div>
            <Bar value={td.items.length - filled} max={td.items.length} color="var(--danger)" height={12} className="mt-1" />
            <div className="text-xs text-muted mt-1">
              HP {td.items.length - filled}/{td.items.length} · {beaten ? `+${XP.boss} XP earned` : `${XP.boss} XP bounty`}
            </div>
          </div>
        </div>
        <Btn className="w-full mt-2" variant={beaten ? 'ghost' : 'danger'} onClick={() => setOpen(true)}>
          {beaten ? 'View results' : '⚔️ Fight'}
        </Btn>
      </Panel>
      <Sheet open={open} onClose={() => setOpen(false)} title={td.boss}>
        <BossBattle testId={testId} onDone={() => setOpen(false)} />
      </Sheet>
    </>
  )
}

function isFilled(i: TestItemId, res: TestResult | undefined, photos: number) {
  if (i === 'photos') return photos > 0
  if (i === 'lifts') return LIFT_KEYS.some((k) => typeof res?.results[k] === 'number')
  return typeof res?.results[i] === 'number'
}

export function BossBattle({ testId, onDone }: { testId: string; onDone: () => void }) {
  const { data } = useApp()
  const fx = useFx()
  const td = allTestDays(data.settings.repeats).find((t) => t.id === testId)!
  const res: TestResult = data.tests.find((t) => t.id === testId) ?? { id: testId, date: td.date, results: {}, completedAt: null }
  const prevTests = data.tests.filter((t) => t.completedAt && t.date < td.date).sort((a, b) => (a.date < b.date ? 1 : -1))
  const lifts = liftBests(data.sessions, data.daily, addDays(td.date, 6), [addDays(td.date, -6), addDays(td.date, 6)])

  const save = (patch: Partial<Record<string, number | undefined>>, raw?: Record<string, number>) => {
    const results = { ...res.results, ...patch }
    for (const k of Object.keys(results)) if (results[k] === undefined) delete results[k]
    void db.tests.put({ ...res, results, raw: { ...(res.raw ?? {}), ...(raw ?? {}) } })
  }

  const prev = (key: string) => {
    const t = prevTests.find((x) => typeof x.results[key] === 'number')
    return t ? { v: t.results[key] as number, date: t.date } : null
  }

  const finish = async () => {
    const results: Record<string, number> = { ...(res.results as Record<string, number>) }
    if (td.items.includes('lifts')) {
      if (lifts.squat) results.lifts_squat = lifts.squat
      if (lifts.bench) results.lifts_bench = lifts.bench
      if (lifts.deadlift) results.lifts_deadlift = lifts.deadlift
    }
    if (td.items.includes('bodyweight') && results.bodyweight === undefined) {
      const a = avg7(data.daily, td.date)
      if (a) results.bodyweight = a
    }
    await db.tests.put({ ...res, results, completedAt: Date.now() })
    // Measurements also go to body tracking.
    if (['armL', 'armR', 'chest', 'waist'].some((k) => typeof results[k] === 'number')) {
      const existing = await db.measurements.where('date').equals(td.date).first()
      await db.measurements.put({ ...(existing ?? {}), date: td.date, armL: results.armL ?? null, armR: results.armR ?? null, chest: results.chest ?? null, waist: results.waist ?? null })
    }
    const trophy = bossTrophies(await db.tests.toArray()).find((t) => t.testId === testId)
    const trophyText = !trophy
      ? ''
      : trophy.tier === 'baseline'
        ? 'Baseline trophy won. Next time, beat these numbers.'
        : `${trophy.tier[0].toUpperCase()}${trophy.tier.slice(1)} trophy: ${trophy.improved}/${trophy.compared} results better than last time.`
    fx.celebrate({ kind: 'boss', title: td.boss, sub: `${trophyText} Compare in Stats → Tests.`.trim(), icon: td.bossEmoji, xp: res.completedAt ? 0 : XP.boss })
    onDone()
  }

  return (
    <div>
      <p className="text-sm text-muted mb-3">
        {fmtDate(td.date)} · Enter what you can. Every result is a hit on the boss. Skip anything you can't test today.
      </p>
      {td.items.map((item) => {
        const info = TEST_ITEMS[item]
        const p = prev(item)
        const cur = res.results[item]
        const delta = typeof cur === 'number' && p ? cur - p.v : null
        const good = delta !== null && (info.better === 'higher' ? delta > 0 : info.better === 'lower' ? delta < 0 : false)
        const bad = delta !== null && (info.better === 'higher' ? delta < 0 : info.better === 'lower' ? delta > 0 : false)
        return (
          <div key={item} className="py-3 border-b-2 border-edge/50">
            <div className="flex justify-between items-baseline">
              <div className="font-pixel text-[14px] text-accent leading-relaxed">{info.name.toUpperCase()}</div>
              {p && item !== 'lifts' && (
                <div className="text-xs text-muted">
                  Last {item === 'fiveK' ? fmtSec(p.v) : p.v} ({fmtDate(p.date).slice(0, 5)})
                </div>
              )}
            </div>
            {info.hint && <div className="text-xs text-muted mb-1">{info.hint}</div>}
            <ItemInput item={item} value={cur} raw={res.raw} lifts={lifts} avg={avg7(data.daily, td.date)} date={td.date} onSave={save} />
            {delta !== null && delta !== 0 && (
              <div className={`text-sm mt-1 ${good ? 'text-good' : bad ? 'text-danger' : 'text-muted'}`}>
                {delta > 0 ? '▲' : '▼'} {item === 'fiveK' ? fmtSec(Math.abs(delta)) : Math.round(Math.abs(delta) * 10) / 10} {info.unit === 'min' ? '' : info.unit} vs last
                {good ? ' 🔥' : ''}
              </div>
            )}
          </div>
        )
      })}
      <Btn variant="danger" className="w-full mt-4" onClick={() => void finish()}>
        {res.completedAt ? 'Save results' : `⚔️ Defeat boss (+${XP.boss} XP)`}
      </Btn>
    </div>
  )
}

function ItemInput({
  item,
  value,
  raw,
  lifts,
  avg,
  date,
  onSave,
}: {
  item: TestItemId
  value: number | undefined
  raw?: Record<string, number>
  lifts: ReturnType<typeof liftBests>
  avg: number | null
  date: string
  onSave: (patch: Record<string, number | undefined>, raw?: Record<string, number>) => void
}) {
  const [timeText, setTimeText] = useState(value ? fmtSec(value) : '')
  if (item === 'photos') return <PhotoInput date={date} />
  if (item === 'lifts') {
    return (
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        {(['squat', 'bench', 'deadlift'] as const).map((k) => (
          <div key={k} className="bg-bg-2 p-2">
            <div className="text-muted text-xs">{k}</div>
            <div className="font-pixel text-[16px] mt-1">{lifts[k] || '–'}</div>
          </div>
        ))}
        <div className="col-span-3 text-xs text-muted">Estimated 1RM (Epley) from your best set within 6 days of the test.</div>
      </div>
    )
  }
  if (item === 'fiveK') {
    return (
      <input
        className="px-input"
        inputMode="text"
        placeholder="mm:ss e.g. 27:30"
        value={timeText}
        onChange={(e) => {
          setTimeText(e.target.value)
          onSave({ fiveK: parseTime(e.target.value) ?? undefined })
        }}
      />
    )
  }
  if (item === 'jumpReach') {
    const stand = raw?.standReach ?? null
    const touch = raw?.jumpTouch ?? null
    const upd = (s: number | null, t: number | null) => {
      const r: Record<string, number> = {}
      if (s !== null) r.standReach = s
      if (t !== null) r.jumpTouch = t
      onSave({ jumpReach: s !== null && t !== null ? Math.round((t - s) * 10) / 10 : undefined }, r)
    }
    return (
      <div>
        <div className="flex gap-2">
          <NumField label="Standing reach cm" value={stand} onChange={(v) => upd(v, touch)} className="flex-1" />
          <NumField label="Jump touch cm" value={touch} onChange={(v) => upd(stand, v)} className="flex-1" />
        </div>
        {value !== undefined && <div className="font-pixel text-[16px] text-xp mt-2">= {value} cm</div>}
      </div>
    )
  }
  if (item === 'toeTouch') return <ToeTouch value={value} onSave={onSave} />
  return (
    <NumField
      value={value ?? null}
      placeholder={item === 'bodyweight' && avg ? `${avg} (7-day avg)` : TEST_ITEMS[item].unit}
      onChange={(v) => onSave({ [item]: v ?? undefined })}
    />
  )
}

function ToeTouch({ value, onSave }: { value: number | undefined; onSave: (patch: Record<string, number | undefined>) => void }) {
  const [sign, setSign] = useState(value !== undefined && value >= 0 ? 1 : -1)
  const abs = value === undefined ? null : Math.abs(value)
  const pick = (sg: number) => {
    setSign(sg)
    if (abs !== null) onSave({ toeTouch: sg * abs })
  }
  return (
    <div>
      <div className="flex gap-2 mb-2">
        {[
          [-1, 'Short of toes'],
          [1, 'Touch / past toes'],
        ].map(([sg, label]) => (
          <button
            key={sg}
            onClick={() => pick(sg as number)}
            className={`flex-1 h-11 text-sm border-[3px] ${sign === sg ? 'bg-accent text-accent-ink border-ink' : 'bg-bg-2 border-edge'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <NumField value={abs} placeholder="cm (0 = just touching)" onChange={(v) => onSave({ toeTouch: v === null ? undefined : sign * v })} />
    </div>
  )
}
