import { COMEBACK } from '../config/game'
import { updateSettings } from '../db/db'
import { suggestLightWeek } from '../lib/coach'
import { fmtDay, mondayOf } from '../lib/dates'
import { comebackUsed, missedBefore } from '../lib/game'
import { addLife } from '../state/actions'
import { useApp } from '../state/app'
import { Btn, Panel } from './ui'

/** Comeback quest + light-week suggestion, shown at the top of Today. */
export function CoachBanners() {
  const { data, today, todayPlan, planFor, game } = useApp()
  const done = data.sessions.filter((s) => s.status === 'done')
  const trainingToday = todayPlan.items.some((i) => i.counts)
  const doneToday = done.some((s) => s.date === today)
  const bossDays = new Set(data.tests.filter((t) => t.completedAt).map((t) => t.date))
  const missed = trainingToday && !doneToday && !comebackUsed(game, mondayOf(today)) ? missedBefore(today, done, planFor, bossDays) : null
  const light = suggestLightWeek(data.checkins, data.life, today, data.settings.lightDismissed, data.settings.repeats)

  return (
    <>
      {missed && (
        <Panel accent className="!bg-[linear-gradient(135deg,var(--panel-2),var(--panel))]">
          <div className="flex items-center gap-3">
            <span className="text-4xl anim-bob">🔥</span>
            <div className="flex-1">
              <div className="font-pixel text-[15px] text-flame leading-relaxed">COMEBACK QUEST</div>
              <div className="text-sm">
                Missed {fmtDay(missed)}? No stress: the rule is never miss twice. Train today for a <b>+{COMEBACK.bonus} XP comeback bonus</b>.
              </div>
            </div>
          </div>
        </Panel>
      )}
      {light && (
        <Panel accent>
          <div className="font-pixel text-[15px] text-accent-2 mb-1">😮‍💨 COACH SAYS</div>
          <p className="text-sm mb-3">Two rough check-ins in a row (low energy, poor sleep or very sore). A light week now (half sets) beats a forced week off later. Your streak still counts.</p>
          <div className="flex gap-2">
            <Btn small className="flex-1" onClick={() => void addLife('runDown', today)}>
              Light week
            </Btn>
            <Btn small variant="ghost" className="flex-1" onClick={() => void updateSettings((s) => ({ lightDismissed: [...s.lightDismissed, mondayOf(today)] }))}>
              I'm good
            </Btn>
          </div>
        </Panel>
      )}
    </>
  )
}
