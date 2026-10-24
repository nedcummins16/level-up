import { useState } from 'react'
import { Character, StreakFlame } from '../components/Character'
import { DailyQuests } from '../components/DailyQuests'
import { RaidCard } from '../components/RaidCard'
import { Badge, Bar, Btn, H, NumField, Panel, Sheet } from '../components/ui'
import { ACHIEVEMENTS, FREEZE, TITLES, xpToNext } from '../config/game'
import { updateSettings } from '../db/db'
import { PROGRAM } from '../config/program'
import { avg7 } from '../lib/body'
import { fmtDate, fmtDay } from '../lib/dates'
import { getPhase, weekNumber } from '../lib/plan'
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
  const { game, data, today, todayPlan, go } = useApp()
  const [statOpen, setStatOpen] = useState<string | null>(null)
  const [trophies, setTrophies] = useState(false)
  const s = data.settings
  const phase = getPhase(today, s.repeats)
  const title = s.titleLevel && s.titleLevel <= game.level ? TITLES[s.titleLevel - 1] : game.title
  const active = data.sessions.find((x) => x.status === 'active')
  const unlockedCount = game.achievements.filter((a) => a.unlocked).length

  return (
    <div className="px-3 pt-safe pb-32">
      <WeekResultsGate />
      {/* Hero card */}
      <Panel accent className="mt-2 !p-0 overflow-hidden">
        <div className="flex items-stretch">
          <div className="relative w-[44%] grid place-items-center py-3" style={{ background: 'radial-gradient(circle at 50% 70%, var(--panel-2), var(--bg-2))' }}>
            <div className="absolute bottom-3 left-3 right-3 h-2 bg-black/40" />
            <div className="anim-bob">
              <Character cosmetics={s.cosmetics} size={150} />
            </div>
          </div>
          <div className="flex-1 p-3 min-w-0">
            <div className="font-pixel text-[10px] text-muted truncate">{s.heroName.toUpperCase()}</div>
            <div className="font-pixel text-[12px] text-accent leading-relaxed mt-1">{title.toUpperCase()}</div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-pixel text-[10px] text-muted">LV</span>
              <span className="font-pixel text-[28px] text-xp leading-none">{game.level}</span>
            </div>
            <Bar value={game.xpInLevel} max={game.xpForNext} className="mt-2" />
            <div className="text-xs text-muted mt-1">
              {game.xpInLevel}/{game.xpForNext} XP · {game.totalXP} total
            </div>
            <div className="flex items-center gap-2 mt-2">
              <StreakFlame n={game.streak} size={34} />
              <div>
                <div className="font-pixel text-[14px] text-flame">{game.streak}</div>
                <div className="text-[11px] text-muted leading-tight">week streak</div>
              </div>
            </div>
            <div className="text-xs text-muted mt-1">
              {'❄️'.repeat(game.freezes)}
              {'·'.repeat(FREEZE.max - game.freezes)} freezes · 🧘 {game.mobilityStreak}d
            </div>
          </div>
        </div>
      </Panel>

      {/* Today's quest */}
      <Panel>
        <div className="flex items-center justify-between mb-1">
          <H className="!mb-0">Today's quest</H>
          <span className="text-xs text-muted">
            {fmtDay(today)} · {phase.id === 'prestart' ? 'Pre-season' : `W${weekNumber(today)} ${phase.name}`}
          </span>
        </div>
        {phase.id === 'prestart' ? (
          <div className="text-sm mb-2">Quest begins {fmtDate(PROGRAM.start)}. Get your pre-start checklist done!</div>
        ) : (
          todayPlan.items.map((i, k) => {
            const doneIt = data.sessions.some((x) => x.date === today && x.slot === i.slot && x.status === 'done') || (i.kind === 'test' && game.bossesBeaten.includes(i.testId!))
            return (
              <div key={k} className="flex items-center gap-2 py-1">
                <span className={`font-pixel text-[11px] ${doneIt ? 'text-good' : 'text-ink'}`}>{doneIt ? '✓' : '▸'}</span>
                <span className={doneIt ? 'text-muted line-through' : ''}>{i.label}</span>
              </div>
            )
          })
        )}
        <Btn className="w-full mt-2" onClick={() => go('today')}>
          {active ? '▶ Resume workout' : 'Go ⚔️'}
        </Btn>
      </Panel>

      <DailyQuests />
      <WeighIn />
      <RaidCard />

      {/* Stats */}
      <Panel>
        <H>Stats</H>
        {(['STR', 'END', 'MOB', 'JMP', 'BULK'] as const).map((k) => (
          <button key={k} className="w-full flex items-center gap-2 py-1.5 text-left" onClick={() => setStatOpen(statOpen === k ? null : k)}>
            <span className="w-6 text-center">{STAT_INFO[k].emoji}</span>
            <span className="font-pixel text-[10px] w-11">{k}</span>
            <Bar value={game.stats[k]} max={99} color={STAT_INFO[k].color} className="flex-1" height={16} />
            <span className="font-pixel text-[11px] w-8 text-right">{game.stats[k]}</span>
          </button>
        ))}
        {statOpen && (
          <div className="text-sm text-muted mt-1 p-2 bg-bg-2">
            {STAT_INFO[statOpen].name}: {game.stats.detail[statOpen as 'STR']}
          </div>
        )}
      </Panel>

      {/* Next unlock */}
      {game.nextUnlock && (
        <Panel>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎁</span>
            <div className="flex-1">
              <div className="font-pixel text-[10px] text-muted">NEXT UNLOCK · LV {game.nextUnlock.level}</div>
              <div>{game.nextUnlock.name}</div>
              <div className="text-xs text-muted">{xpUntil(game.level, game.xpInLevel, game.nextUnlock.level)} XP to go</div>
            </div>
          </div>
        </Panel>
      )}

      {/* Trophy room */}
      <Panel>
        <button className="w-full flex items-center justify-between min-h-[44px]" onClick={() => setTrophies(true)}>
          <span className="font-pixel text-[11px] text-accent">🏆 TROPHY ROOM</span>
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

function xpUntil(level: number, xpInLevel: number, target: number) {
  let need = -xpInLevel
  for (let l = level; l < target; l++) need += xpToNext(l)
  return need
}

function Trophies() {
  const { game, data } = useApp()
  return (
    <div>
      {game.achievements.map((a) => (
        <div key={a.id} className={`flex items-center gap-3 p-2 mb-2 border-[3px] ${a.unlocked ? 'border-xp bg-panel-2' : 'border-edge opacity-60'}`}>
          <span className={`text-3xl ${a.unlocked ? '' : 'grayscale'}`}>{a.icon}</span>
          <div className="flex-1">
            <div className="font-pixel text-[10px] leading-relaxed">{a.name.toUpperCase()}</div>
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
          <div className="font-pixel text-[11px] text-accent mb-1">⚖️ WEIGH-IN</div>
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
