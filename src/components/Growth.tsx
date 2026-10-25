import { useState } from 'react'
import { DUNK, PHYSIQUE } from '../config/game'
import { PROGRAM } from '../config/program'
import { patchDaily } from '../state/actions'
import { useApp } from '../state/app'
import { fmtDate } from '../lib/dates'
import { bulkSteps, type TrophyTier } from '../lib/growth'
import { Character } from './Character'
import { Bar, Btn, H, NumField, Panel, Sheet } from './ui'

/** Your hero now vs. the next build, with what it takes to get there. */
export function PhysiqueCard() {
  const { game, data } = useApp()
  const p = game.physique
  const cos = data.settings.cosmetics
  const nextBuild = p.nextBulkKg !== null ? { bulk: p.bulk + 1, str: p.str } : p.nextStr !== null ? { bulk: p.bulk, str: p.str + 1 } : null
  const steps = bulkSteps()
  const bulkFrom = p.bulk === 0 ? PROGRAM.body.startKg - 1 : steps[p.bulk - 1]
  const strFrom = [0, ...PHYSIQUE.strSteps][p.str]
  return (
    <Panel>
      <H>Physique · grows with you</H>
      <div className="flex items-end justify-center gap-6 mb-3">
        <div className="flex flex-col items-center">
          <Character cosmetics={cos} build={p} size={96} />
          <span className="font-pixel text-[11px] tracking-[0.2em] text-accent mt-1">NOW</span>
        </div>
        {nextBuild && (
          <>
            <span className="font-pixel text-muted text-xl mb-8" aria-hidden="true">
              ›
            </span>
            <div className="flex flex-col items-center opacity-45">
              <Character cosmetics={cos} build={nextBuild} size={96} />
              <span className="font-pixel text-[11px] tracking-[0.2em] text-muted mt-1">NEXT</span>
            </div>
          </>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between font-pixel text-[13px]">
            <span>BULK · {p.bulkName.toUpperCase()}</span>
            <span className="text-muted">{p.bulk}/4</span>
          </div>
          <Bar value={p.nextBulkKg && p.avgKg ? p.avgKg - bulkFrom : 1} max={p.nextBulkKg ? p.nextBulkKg - bulkFrom : 1} className="my-1" />
          <div className="text-xs text-muted">
            {p.avgKg === null
              ? 'Weigh in to start growing.'
              : p.nextBulkKg
                ? `${p.avgKg} kg 7-day avg · bigger build at ${p.nextBulkKg} kg`
                : `${p.avgKg} kg · max build reached!`}
          </div>
        </div>
        <div>
          <div className="flex justify-between font-pixel text-[13px]">
            <span>STRENGTH · {p.strName.toUpperCase()}</span>
            <span className="text-muted">{p.str}/4</span>
          </div>
          <Bar value={p.nextStr ? p.strNow - strFrom : 1} max={p.nextStr ? p.nextStr - strFrom : 1} color="var(--accent-2)" className="my-1" />
          <div className="text-xs text-muted">{p.nextStr ? `STR ${p.strNow} · bigger arms + shoulders at STR ${p.nextStr}` : 'Max strength build!'}</div>
        </div>
      </div>
      <p className="text-xs text-muted mt-2">Built from your real weigh-ins and lifts. He only shrinks after 2 weeks below a level.</p>
    </Panel>
  )
}

/** Hoop with your best jump touch climbing toward the 3.05 m rim. */
export function DunkMeter() {
  const { game } = useApp()
  const [open, setOpen] = useState(false)
  const d = game.dunk
  const min = 200
  const max = 330
  const y = (cm: number) => 220 - ((Math.max(min, Math.min(max, cm)) - min) / (max - min)) * 210
  const touchY = d.best !== null ? y(d.best) : null
  return (
    <Panel>
      <div className="flex justify-between items-baseline">
        <H className="!mb-1">Dunk meter</H>
        <span className="font-pixel text-[13px] text-muted">RIM 3.05 M</span>
      </div>
      <div className="flex gap-3">
        <svg width="120" height="230" viewBox="0 0 120 230" role="img" aria-label={d.best ? `Best touch ${d.best} centimetres` : 'No jump checks yet'} className="shrink-0">
          {/* pole + backboard */}
          <rect x="96" y={y(290) - 20} width="6" height={230 - y(290) + 20} fill="var(--edge)" />
          <rect x="70" y={y(330)} width="10" height={y(290) - y(330)} fill="var(--panel-2)" stroke="var(--muted)" strokeWidth="2" />
          {/* rim + net */}
          <rect x="22" y={y(DUNK.rimCm) - 2} width="50" height="4" fill="var(--accent)" />
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={24 + i * 11} y1={y(DUNK.rimCm)} x2={34 + i * 6} y2={y(260)} stroke="var(--muted)" strokeWidth="1.5" />
          ))}
          <line x1="34" y1={y(260)} x2="58" y2={y(260)} stroke="var(--muted)" strokeWidth="1.5" />
          {/* milestone ticks */}
          {DUNK.milestones.map((m) => (
            <line key={m.id} x1="0" y1={y(m.cm)} x2="14" y2={y(m.cm)} stroke={d.reached.includes(m.id) ? 'var(--good)' : 'var(--edge)'} strokeWidth="3" />
          ))}
          {/* standing reach + best touch */}
          {d.standReach !== null && <line x1="0" y1={y(d.standReach)} x2="90" y2={y(d.standReach)} stroke="var(--muted)" strokeDasharray="3 3" strokeWidth="1.5" />}
          {touchY !== null && (
            <>
              <line x1="0" y1={touchY} x2="92" y2={touchY} stroke="var(--accent-2)" strokeWidth="3" />
              <circle cx="16" cy={touchY} r="6" fill="var(--accent-2)" />
            </>
          )}
        </svg>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div>
            <div className="font-pixel text-[30px] leading-none text-accent-2">{d.best !== null ? `${(d.best / 100).toFixed(2)} m` : '–'}</div>
            <div className="text-xs text-muted">{d.best !== null ? `best touch · ${fmtDate(d.bestDate!)}` : 'Log a jump check to start'}</div>
          </div>
          {DUNK.milestones.map((m) => {
            const hit = d.reached.includes(m.id)
            return (
              <div key={m.id} className={`flex justify-between text-sm ${hit ? 'text-good' : d.next?.id === m.id ? 'text-ink' : 'text-muted'}`}>
                <span>
                  {hit ? '✓ ' : ''}
                  {m.name}
                </span>
                <span>{(m.cm / 100).toFixed(2)}</span>
              </div>
            )
          })}
          {d.next && d.toNext !== null && <div className="text-xs text-muted">{d.toNext} cm to "{d.next.name.toLowerCase()}"</div>}
          <Btn small variant="ghost" className="mt-auto" onClick={() => setOpen(true)}>
            Log jump check
          </Btn>
        </div>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Jump check">
        <JumpCheckForm onDone={() => setOpen(false)} />
      </Sheet>
    </Panel>
  )
}

function JumpCheckForm({ onDone }: { onDone: () => void }) {
  const { game, today, data } = useApp()
  const todayLog = data.daily.find((x) => x.date === today)
  const [stand, setStand] = useState<number | null>(todayLog?.standReach ?? game.dunk.standReach)
  const [touch, setTouch] = useState<number | null>(todayLog?.jumpTouch ?? null)
  return (
    <div>
      <ol className="text-sm text-muted list-decimal pl-5 mb-3 space-y-1">
        <li>Warm up. Chalk or wet your fingertips.</li>
        <li>Standing reach: stand side-on to a wall, reach up with one arm, mark it.</li>
        <li>Jump (one or two-foot, your best of 3) and slap the wall as high as you can.</li>
        <li>Measure both marks from the floor in cm.</li>
      </ol>
      <div className="flex gap-2 mb-3">
        <NumField label="Standing reach (cm)" value={stand} onChange={setStand} className="flex-1" />
        <NumField label="Jump touch (cm)" value={touch} onChange={setTouch} className="flex-1" />
      </div>
      {stand && touch && <p className="font-pixel text-[15px] text-accent-2 mb-3">Jump reach: {Math.round((touch - stand) * 10) / 10} cm</p>}
      <Btn
        className="w-full"
        disabled={!touch || !stand || touch <= stand}
        onClick={async () => {
          await patchDaily(today, { standReach: stand, jumpTouch: touch })
          onDone()
        }}
      >
        Save jump check
      </Btn>
      <p className="text-xs text-muted mt-2">Optional, any week. Feeds your JMP stat and the dunk meter. Boss days also count.</p>
    </div>
  )
}

const TROPHY_COLOURS: Record<TrophyTier, string> = { gold: '#ffd23f', silver: '#cfd8e3', bronze: '#d08a4c', baseline: '#6b7785' }

/** Pixel trophy cup in the tier colour. */
export function TrophyCup({ tier, size = 40 }: { tier: TrophyTier; size?: number }) {
  const c = TROPHY_COLOURS[tier]
  const rows = ['XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..', '...XX...', '...XX...', '..XXXX..', '.XXXXXX.']
  return (
    <svg viewBox="0 0 8 8" width={size} height={size} className="pixelated" role="img" aria-label={`${tier} trophy`}>
      {rows.flatMap((r, y) => [...r].map((ch, x) => (ch === 'X' ? <rect key={`${x}${y}`} x={x} y={y} width={1.02} height={1.02} fill={c} /> : null)))}
      <rect x="1" y="0.5" width="1" height="1" fill="#fff" opacity="0.5" />
    </svg>
  )
}
