import { useState } from 'react'
import { Character, StreakFlame } from '../components/Character'
import { DailyQuests } from '../components/DailyQuests'
import { DunkMeter, PhysiqueCard, TrophyCup } from '../components/Growth'
import { HomeGym } from '../components/HomeGym'
import { CollectionCard } from '../components/Loot'
import { SkillTreeCard } from '../components/SkillTree'
import { RaidCard } from '../components/RaidCard'
import { TimePlace } from '../components/Appointments'
import { appointmentFor, fmtTime } from '../lib/appointments'
import { Badge, Bar, Btn, Check, NumField, Panel, Sheet } from '../components/ui'
import { ACHIEVEMENTS, TITLES, xpToNext } from '../config/game'
import { updateSettings } from '../db/db'
import { PROGRAM } from '../config/program'
import { avg7 } from '../lib/body'
import { addDays, fmtDate, fmtDay, mondayOf } from '../lib/dates'
import { allTestDays, getPhase, weekNumber } from '../lib/plan'
import { patchDaily } from '../state/actions'
import { useApp } from '../state/app'
import { WeekResultsGate } from './WeekResults'

const STAT_INFO: Record<string, { name: string; color: string; emoji: string }> = {
  STR: { name: 'Strength', color: '#ff5a5a', emoji: '💪' },
  END: { name: 'Endurance', color: '#3dffb0', emoji: '🫀' },
  MOB: { name: 'Mobility', color: '#34e0ff', emoji: '🧘' },
  JMP: { name: 'Jump', color: '#ffd23f', emoji: '🦘' },
  BULK: { name: 'Bulk', color: '#ff4fd8', emoji: '🍗' },
}

export function Home() {
  const { game, data, today, go } = useApp()
  const [statOpen, setStatOpen] = useState<string | null>(null)
  const [trophies, setTrophies] = useState(false)
  const s = data.settings
  const phase = getPhase(today, s.repeats)
  const title = s.titleLevel && s.titleLevel <= game.level ? TITLES[s.titleLevel - 1] : game.title
  const active = data.sessions.find((x) => x.status === 'active')
  const unlockedCount = game.achievements.filter((a) => a.unlocked).length

  return (
    <div className="px-4 pt-safe pb-32">
      <WeekResultsGate />
      <div className="flex justify-between items-baseline mt-2 font-pixel text-[12px] tracking-[0.2em] text-muted">
        <span className="truncate">SELECT · {s.heroName.toUpperCase()}</span>
        <span className="shrink-0 ml-2">{phase.id === 'prestart' ? 'PRE-SEASON' : `WEEK ${weekNumber(today)} · ${phase.name.toUpperCase()}`}</span>
      </div>

      {/* Character select stage */}
      <div className="px-box relative h-[300px] flex items-end justify-center pb-7 overflow-hidden">
        <HomeGym items={game.gymItems} />
        <svg width="240" height="60" viewBox="0 0 240 60" aria-hidden="true" className="absolute bottom-4 left-1/2 -ml-[120px]">
          <polygon points="40,10 200,10 236,30 200,50 40,50 4,30" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2" />
          <polygon points="60,18 180,18 204,30 180,42 60,42 36,30" fill="none" stroke="var(--edge)" strokeWidth="2" />
        </svg>
        <div className="relative mb-3 anim-bob">
          <Character cosmetics={s.cosmetics} build={game.physique} size={190} />
        </div>
        <div className="absolute left-3 top-3 w-16 h-[72px]">
          <svg width="64" height="72" viewBox="0 0 64 72" aria-hidden="true">
            <polygon points="32,2 62,19 62,53 32,70 2,53 2,19" fill="var(--bg)" stroke="var(--accent)" strokeWidth="3" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-pixel text-[9px] tracking-[0.2em] text-muted">LVL</span>
            <span className="font-pixel text-[26px] leading-none">{game.level}</span>
          </div>
        </div>
        <div className="absolute right-3 top-3.5 flex flex-col items-end gap-1.5 font-pixel text-[12px] tracking-[0.08em]">
          <span className={`cut-sm bg-bg px-2.5 py-1.5 flex items-center gap-1.5 ${game.streak > 0 ? 'text-flame' : 'text-muted'}`}>
            <StreakFlame n={game.streak} size={14} />
            {game.streak}W STREAK
          </span>
          <span className="cut-sm bg-bg px-2.5 py-1.5 text-accent-2">
            {game.freezes}/{game.freezeCap} FREEZE{game.freezes === 1 ? '' : 'S'}
          </span>
          <span className="cut-sm bg-bg px-2.5 py-1.5 text-muted">MOB {game.mobilityStreak}D</span>
        </div>
      </div>

      {/* Name plate */}
      <div className="flex flex-col gap-1 mt-1 mb-2">
        <div className="flex justify-between items-baseline gap-2">
          <span className="font-pixel text-[24px] tracking-[0.04em] leading-tight">{title.toUpperCase()}</span>
          <span className="text-[13px] text-muted whitespace-nowrap">
            {game.xpInLevel.toLocaleString()} / {game.xpForNext.toLocaleString()} XP
          </span>
        </div>
        <Bar value={game.xpInLevel} max={game.xpForNext} />
      </div>

      <NextMatch active={!!active} onGo={() => go('today')} />

      {/* Attributes */}
      <Panel>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-pixel text-[13px]">
          {(['STR', 'END', 'MOB', 'JMP', 'BULK'] as const).map((k) => (
            <button
              key={k}
              className="grid grid-cols-[40px_1fr_26px] gap-2 items-center min-h-[32px] text-left"
              onClick={() => setStatOpen(statOpen === k ? null : k)}
              aria-label={`${STAT_INFO[k].name} ${game.stats[k]}`}
              aria-expanded={statOpen === k}
            >
              <span className={statOpen === k ? 'text-accent' : ''}>{k}</span>
              <Bar value={game.stats[k]} max={99} color="var(--ink)" height={6} />
              <span className="text-right">{game.stats[k]}</span>
            </button>
          ))}
        </div>
        {statOpen && (
          <div className="text-sm text-muted mt-3 p-2 bg-bg-2">
            {STAT_INFO[statOpen].name}: {game.stats.detail[statOpen as 'STR']}
          </div>
        )}
      </Panel>

      <Tomorrow />
      <DailyQuests />
      <WeighIn />
      <RaidCard />
      <PhysiqueCard />
      <DunkMeter />
      <CollectionCard />
      <SkillTreeCard />

      {/* Next unlock */}
      {game.nextUnlock && (
        <Panel>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎁</span>
            <div className="flex-1">
              <div className="font-pixel text-[14px] text-muted">NEXT UNLOCK · LV {game.nextUnlock.level}</div>
              <div>{game.nextUnlock.name}</div>
              <div className="text-xs text-muted">{xpUntil(game.level, game.xpInLevel, game.nextUnlock.level)} XP to go</div>
            </div>
          </div>
        </Panel>
      )}

      {/* Trophy room */}
      <Panel>
        <button className="w-full flex items-center justify-between min-h-[44px]" onClick={() => setTrophies(true)}>
          <span className="font-pixel text-[15px] text-accent">🏆 TROPHY ROOM</span>
          <Badge color="xp">
            {unlockedCount}/{ACHIEVEMENTS.length}
          </Badge>
        </button>
        <div className="flex flex-wrap gap-1 mt-1">
          {game.achievements.map((a) => (
            <span key={a.id} className={`text-2xl ${a.unlocked ? '' : 'grayscale opacity-25'}`} title={a.name}>
              {a.icon}
            </span>
          ))}
        </div>
      </Panel>
      <Sheet open={trophies} onClose={() => setTrophies(false)} title="Trophy room">
        <Trophies />
      </Sheet>
    </div>
  )
}

/** "Next match" card: today's session with time + place and a big PLAY button. */
function NextMatch({ active, onGo }: { active: boolean; onGo: () => void }) {
  const { data, today, todayPlan, game } = useApp()
  const phase = getPhase(today, data.settings.repeats)
  const items = todayPlan.items.filter((i) => i.counts || i.kind === 'test')
  const isDone = (i: (typeof items)[number]) =>
    data.sessions.some((x) => x.date === today && x.slot === i.slot && x.status === 'done') || (i.kind === 'test' && game.bossesBeaten.includes(i.testId!))
  const allDone = items.length > 0 && items.every(isDone)
  const a = items.length ? appointmentFor(today, items, data.appointments, data.settings) : null

  const mainItem = items.find((i) => i.kind !== 'test') ?? items[0]
  const boss = items.some((i) => i.kind === 'test') && mainItem?.kind !== 'test'
  let label = 'NEXT MATCH'
  let main = (mainItem?.label ?? '').toUpperCase()
  let sub = a ? `${fmtTime(a.time).toUpperCase()}${a.place ? ` · ${a.place}` : ''}${boss ? ' · + BOSS FIGHT' : ''}` : ''
  let button = active ? 'RESUME' : 'PLAY'
  if (phase.id === 'prestart') {
    label = 'SEASON START'
    main = `MON ${fmtDate(PROGRAM.start).slice(0, 5)}`
    sub = 'Pre-start checklist on Today'
    button = 'VIEW'
  } else if (!items.length) {
    label = 'TODAY'
    main = 'REST DAY'
    sub = 'Mobility = Recovery quest'
    button = 'VIEW'
  } else if (allDone && !active) {
    label = 'MATCH WON'
    sub = 'All done today. Recover well.'
    button = 'VIEW'
  }

  return (
    <div className="px-box px-box-accent px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-pixel text-[12px] tracking-[0.22em] text-accent">{label}</div>
        <div className="font-pixel text-[20px] leading-tight truncate">{main}</div>
        {sub && <div className="text-sm text-muted truncate">{sub}</div>}
      </div>
      <Btn onClick={onGo} className="!min-h-[56px] !px-6 !text-[16px]">
        {button}
      </Btn>
    </div>
  )
}

function xpUntil(level: number, xpInLevel: number, target: number) {
  let need = -xpInLevel
  for (let l = level; l < target; l++) need += xpToNext(l)
  return need
}

function Trophies() {
  const { game, data } = useApp()
  const testDays = allTestDays(data.settings.repeats)
  return (
    <div>
      <div className="font-pixel text-[12px] tracking-[0.2em] text-accent mb-2">BOSS TROPHIES</div>
      {game.trophies.length === 0 && <p className="text-sm text-muted mb-3">Beat a boss on a test day to win its trophy.</p>}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {game.trophies.map((t) => {
          const td = testDays.find((x) => x.id === t.testId)
          return (
            <div key={t.testId} className="cut-sm bg-panel-2 p-2 flex items-center gap-2">
              <TrophyCup tier={t.tier} size={36} />
              <div className="min-w-0">
                <div className="font-pixel text-[12px] leading-tight truncate">{td?.boss.replace('The ', '').toUpperCase() ?? t.testId}</div>
                <div className="text-xs text-muted">
                  {t.tier === 'baseline' ? 'Baseline' : `${t.tier[0].toUpperCase()}${t.tier.slice(1)} · ${t.improved}/${t.compared} better`}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="font-pixel text-[12px] tracking-[0.2em] text-accent mb-2">ACHIEVEMENTS</div>
      {game.achievements.map((a) => (
        <div key={a.id} className={`flex items-center gap-3 p-2 mb-2 border-[3px] ${a.unlocked ? 'border-xp bg-panel-2' : 'border-edge opacity-60'}`}>
          <span className={`text-3xl ${a.unlocked ? '' : 'grayscale'}`}>{a.icon}</span>
          <div className="flex-1">
            <div className="font-pixel text-[14px] leading-relaxed">{a.name.toUpperCase()}</div>
            <div className="text-sm text-muted">{a.unlocked && a.date ? `Unlocked ${fmtDate(a.date)}` : a.desc}</div>
          </div>
          {a.id === 'dunk' && !a.unlocked && (
            <Btn
              small
              variant="gold"
              onClick={() => {
                if (confirm('Did you actually dunk? 🏀 No lying to the game.')) void updateSettings({ dunk: true })
              }}
            >
              I dunked!
            </Btn>
          )}
        </div>
      ))}
      <p className="text-xs text-muted">Total PRs: {game.prs.length} · Best streak: {game.bestStreak} weeks</p>
      <p className="text-xs text-muted">Tracking since {fmtDate(new Date(data.settings.createdAt).toISOString().slice(0, 10))}</p>
    </div>
  )
}

function Tomorrow() {
  const { data, today, planFor } = useApp()
  const tomorrow = addDays(today, 1)
  const day = planFor(mondayOf(tomorrow)).days.find((d) => d.date === tomorrow)
  const items = day?.items.filter((i) => i.counts || i.kind === 'test') ?? []
  if (!items.length) return null
  const log = data.daily.find((d) => d.date === tomorrow)
  const needsBag = items.some((i) => i.kind !== 'tennis')
  return (
    <Panel>
      <div className="font-pixel text-[12px] text-muted">TOMORROW · {fmtDay(tomorrow).toUpperCase()}</div>
      <div className="mt-1">{items.map((i) => i.label).join(' + ')}</div>
      <TimePlace date={tomorrow} items={items} />
      {needsBag && (
        <Check on={!!log?.bag} onChange={(on) => void patchDaily(tomorrow, { bag: on })}>
          🎒 Bag packed (shoes, towel, water, headphones)
        </Check>
      )}
    </Panel>
  )
}

function WeighIn() {
  const { data, today } = useApp()
  const todayLog = data.daily.find((d) => d.date === today)
  const [kg, setKg] = useState<number | null>(todayLog?.weight ?? null)
  const avg = avg7(data.daily, today)
  const saved = todayLog?.weight != null
  return (
    <Panel>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <div className="font-pixel text-[15px] text-accent mb-1">⚖️ WEIGH-IN</div>
          <div className="text-xs text-muted">{avg !== null ? `7-day avg ${avg} kg` : 'Morning, after the toilet, before food'}</div>
        </div>
        <NumField value={kg} onChange={setKg} placeholder="kg" className="w-24" />
        <Btn small disabled={!kg || (saved && kg === todayLog?.weight)} onClick={() => void patchDaily(today, { weight: kg })}>
          {saved && kg === todayLog?.weight ? '✓' : 'Save'}
        </Btn>
      </div>
    </Panel>
  )
}
