import { useEffect, useMemo } from 'react'
import { StreakFlame } from '../components/Character'
import { Btn } from '../components/ui'
import { updateSettings } from '../db/db'
import { addDays, fmtShort, mondayOf, type ISODate } from '../lib/dates'
import { computeStats, raidFor } from '../lib/game'
import { prText } from '../lib/records'
import { shareWeekCard } from '../lib/shareCard'
import { sfx } from '../lib/sound'
import { useApp } from '../state/app'
import { fireConfetti } from '../state/fx'

/** Shows last week's results automatically once, the first time you open the app in a new week. */
export function WeekResultsGate() {
  const { game, today, data } = useApp()
  const last = addDays(mondayOf(today), -7)
  const w = game.weeks.find((x) => x.weekStart === last)
  const show = !!w && w.planned > 0 && !data.settings.seenResults.includes(last)
  if (!show) return null
  return <WeekResults weekStart={last} onClose={() => void updateSettings((s) => ({ seenResults: [...s.seenResults, last] }))} />
}

export function WeekResults({ weekStart, onClose }: { weekStart: ISODate; onClose: () => void }) {
  const { game, data } = useApp()
  const w = game.weeks.find((x) => x.weekStart === weekStart)
  const end = addDays(weekStart, 6)
  const stats = useMemo(() => {
    const after = computeStats(data, end)
    const before = computeStats(data, addDays(weekStart, -1))
    return (['STR', 'END', 'MOB', 'JMP', 'BULK'] as const).map((k) => ({ k, v: after[k], d: after[k] - before[k] }))
  }, [data, weekStart, end])
  const next = raidFor(addDays(weekStart, 7), data.settings.repeats)

  useEffect(() => {
    if (w?.complete) {
      sfx.levelUp()
      fireConfetti(true)
    }
  }, [w?.complete])

  if (!w) return null
  const headline = w.complete ? (w.iron ? 'IRON WEEK!' : 'WEEK CLEARED!') : w.freezeUsed ? 'FROZEN, NOT BROKEN' : 'WEEK SURVIVED'

  return (
    <div className="fixed inset-0 z-[60] bg-bg overflow-y-auto pt-safe pb-safe">
      <div className="max-w-xl mx-auto p-4">
        <div className="text-center mt-4">
          <div className="font-pixel text-[15px] text-muted">
            WEEK {w.week} · {fmtShort(weekStart)}–{fmtShort(end)}
          </div>
          <div className={`font-pixel text-[30px] mt-3 ${w.complete ? 'text-xp anim-pop' : 'text-accent-2'}`}>{headline}</div>
        </div>

        <div className="px-box p-4 mt-6 text-center">
          <div className="font-pixel text-[14px] text-muted">XP GAINED</div>
          <div className="font-pixel text-[49px] text-xp mt-2">+{w.xp}</div>
          <div className="text-sm text-muted mt-2">
            Sessions {w.done}/{w.planned} (needed {w.required})
          </div>
        </div>

        <div className="grid grid-cols-2 gap-0">
          <div className="px-box p-3 text-center">
            <div className="flex justify-center">
              <StreakFlame n={w.streakAfter} size={36} />
            </div>
            <div className="font-pixel text-[22px] text-flame mt-1">{w.streakAfter}</div>
            <div className="text-xs text-muted">week streak</div>
            {w.freezeEarned && <div className="text-xs text-accent mt-1">+1 ❄️ freeze earned</div>}
            {w.freezeUsed && <div className="text-xs text-accent mt-1">❄️ freeze used</div>}
          </div>
          <div className="px-box p-3 text-center">
            <div className="text-3xl">🏆</div>
            <div className="font-pixel text-[22px] text-xp mt-1">{w.prs.length}</div>
            <div className="text-xs text-muted">PRs</div>
          </div>
        </div>

        {w.prs.length > 0 && (
          <div className="px-box p-3">
            <div className="font-pixel text-[14px] text-accent mb-2">NEW RECORDS</div>
            {w.prs.map((p, i) => (
              <div key={i} className="text-sm">
                🏆 {p.name}: {prText(p)}
              </div>
            ))}
          </div>
        )}

        <div className="px-box p-3">
          <div className="font-pixel text-[14px] text-accent mb-2">STAT CHANGES</div>
          <div className="grid grid-cols-5 gap-1 text-center">
            {stats.map((s) => (
              <div key={s.k}>
                <div className="font-pixel text-[12px] text-muted">{s.k}</div>
                <div className="font-pixel text-[19px] mt-1">{s.v}</div>
                <div className={`font-pixel text-[12px] mt-1 ${s.d > 0 ? 'text-good' : s.d < 0 ? 'text-danger' : 'text-muted'}`}>
                  {s.d > 0 ? `+${s.d}` : s.d === 0 ? '·' : s.d}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-box p-3">
          <div className="font-pixel text-[14px] text-accent mb-2">QUESTS</div>
          {w.quests.map((q) => (
            <div key={q.id} className="flex justify-between text-sm py-0.5">
              <span>
                {q.done ? '✅' : '⬜'} {q.name}
              </span>
              <span className="text-muted">{q.progress}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm py-0.5 mt-1">
            <span>
              {w.raid.done ? '🎁' : '🔒'} Raid: {w.raid.name}
            </span>
            <span className="text-muted">{w.raid.progress}</span>
          </div>
        </div>

        <div className="px-box px-box-accent p-3">
          <div className="font-pixel text-[14px] text-muted">NEXT WEEK'S RAID</div>
          <div className="font-pixel text-[16px] text-accent-2 mt-1 leading-relaxed">{next.name.toUpperCase()}</div>
          <div className="text-sm text-muted">{next.desc}</div>
        </div>

        <Btn
          variant="gold"
          className="w-full mt-4"
          onClick={() =>
            void shareWeekCard({ week: w, heroName: data.settings.heroName, title: game.title, level: game.level, cosmetics: data.settings.cosmetics, build: game.physique, headline })
          }
        >
          📤 Share with a mate
        </Btn>
        <Btn className="w-full mt-2" onClick={onClose}>
          Continue ▶
        </Btn>
      </div>
    </div>
  )
}
