import { CardioCard } from '../components/CardioCard'
import { MobilityCard } from '../components/MobilityCard'
import { StrengthCard } from '../components/StrengthCard'
import { Btn, Check, H, Panel } from '../components/ui'
import { PRESTART_CHECKLIST, PROGRAM } from '../config/program'
import { updateSettings } from '../db/db'
import { addDays, diffDays, fmtDate, fmtDay, mondayOf, weekday } from '../lib/dates'
import { basePlan, getPhase, weekNumber } from '../lib/plan'
import { useApp } from '../state/app'
import { ActiveSession } from './ActiveSession'
import { LifeHappensButton, LifeBanners } from './LifeHappens'
import { BossCard } from './Boss'

export function Today() {
  const app = useApp()
  const { today, todayPlan, data } = app
  const active = data.sessions.find((s) => s.status === 'active')
  if (active) return <ActiveSession key={active.id} session={active} />

  const phase = getPhase(today, data.settings.repeats)
  if (phase.id === 'prestart') return <PreStart />
  if (phase.id === 'post') return <PostProgram />

  const gymDay = todayPlan.items.some((i) => i.kind === 'strength')
  const xmasWeek = mondayOf(PROGRAM.christmas.date) === mondayOf(today) && today <= PROGRAM.christmas.date

  return (
    <div className="px-3 pt-safe pb-32">
      <header className="mb-2 pt-1">
        <div className="font-pixel text-[11px] text-muted">{fmtDay(today).toUpperCase()}</div>
        <div className="font-pixel text-[16px] text-accent mt-1">TODAY'S QUEST</div>
        <div className="text-sm text-muted mt-1">
          Week {weekNumber(today)} · {phase.name}
          {phase.cycle ? ` #${phase.cycle}` : ''} · {phase.rir !== '-' ? phase.rir : ''}
        </div>
      </header>

      <LifeBanners />

      {xmasWeek && data.settings.christmasMove === null && (
        <Panel accent>
          <div className="font-pixel text-[11px] text-xp mb-2">🎄 CHRISTMAS</div>
          <p className="mb-3">Christmas is Fri 25 Dec (Upper B day). Move Upper B to Sat 26 Dec instead of tennis/intervals?</p>
          <div className="flex gap-2">
            <Btn className="flex-1" onClick={() => void updateSettings({ christmasMove: 'move' })}>
              Move to Sat
            </Btn>
            <Btn variant="ghost" className="flex-1" onClick={() => void updateSettings({ christmasMove: 'keep' })}>
              Keep Fri
            </Btn>
          </div>
        </Panel>
      )}

      {todayPlan.items.map((item, i) => {
        if (item.kind === 'strength') return <StrengthCard key={i} item={item} date={today} />
        if (item.kind === 'test') return <BossCard key={i} testId={item.testId!} />
        if (item.kind === 'rest')
          return (
            <Panel key={i}>
              <div className="font-pixel text-[13px] text-accent-2">😌 {item.label.toUpperCase()}</div>
              <p className="text-sm text-muted mt-1">
                {weekday(today) === 7 ? 'Recovery day. Do your mobility for the Recovery quest, then the Sunday check-in.' : 'Rest is where the gains happen. Mobility still counts!'}
              </p>
            </Panel>
          )
        return <CardioCard key={i} item={item} date={today} />
      })}

      {todayPlan.dropped.length > 0 && (
        <Panel className="!bg-panel-2">
          {todayPlan.dropped.map((d, i) => (
            <div key={i} className="text-sm text-muted">
              ↪ {d.item.label}: {d.reason}
            </div>
          ))}
        </Panel>
      )}

      <MobilityCard date={today} gymDay={gymDay} />
      <Panel>
        <div className="text-sm">
          👟 Daily: {PROGRAM.body.steps} steps · 🥩 {PROGRAM.body.protein} g protein
        </div>
      </Panel>

      <LifeHappensButton />
    </div>
  )
}

function PreStart() {
  const { today, data, planSettings, go } = useApp()
  const days = diffDays(today, PROGRAM.start)
  const done = new Set(data.settings.prestartDone)
  const week1 = Array.from({ length: 7 }, (_, i) => addDays(PROGRAM.start, i))
  return (
    <div className="px-3 pt-safe pb-32">
      <Panel accent className="text-center py-6 mt-2">
        <div className="font-pixel text-[11px] text-muted mb-3">THE QUEST BEGINS IN</div>
        <div className="font-pixel text-[44px] text-xp anim-bob">{days}</div>
        <div className="font-pixel text-[12px] text-accent mt-2">{days === 1 ? 'DAY' : 'DAYS'}</div>
        <div className="text-muted mt-3">Week 1 starts Mon {fmtDate(PROGRAM.start)}</div>
      </Panel>

      <Panel>
        <H>Pre-start checklist</H>
        <div className="text-sm text-muted mb-2">
          {done.size}/{PRESTART_CHECKLIST.length} ready
        </div>
        {PRESTART_CHECKLIST.map((c) => (
          <Check
            key={c.id}
            on={done.has(c.id)}
            onChange={(on) => {
              const next = new Set(done)
              if (on) next.add(c.id)
              else next.delete(c.id)
              void updateSettings({ prestartDone: [...next] })
            }}
          >
            {c.text}
          </Check>
        ))}
        <Btn variant="ghost" className="w-full mt-2" onClick={() => go('settings')}>
          Set starting weights
        </Btn>
      </Panel>

      <Panel>
        <H>Week 1 preview</H>
        {week1.map((d) => (
          <div key={d} className="flex gap-3 py-1.5 border-b border-edge/40 text-sm">
            <span className="w-20 text-muted">{fmtDay(d)}</span>
            <span>{basePlan(d, planSettings).map((i) => i.label).join(' + ')}</span>
          </div>
        ))}
        <p className="text-xs text-muted mt-2">Want to try logging now? Use Settings → Time travel.</p>
      </Panel>
      <MobilityCard date={today} gymDay={false} />
    </div>
  )
}

function PostProgram() {
  const { today, data } = useApp()
  const nextMonday = weekday(today) === 1 ? today : addDays(mondayOf(today), 7)
  return (
    <div className="px-3 pt-safe pb-32">
      <Panel accent className="text-center py-6 mt-2">
        <div className="text-5xl mb-3">🏆</div>
        <div className="font-pixel text-[14px] text-xp mb-3">CAMPAIGN COMPLETE</div>
        <p className="mb-4">12 weeks done. Want to run it back? Repeat the Push phase ({PROGRAM.repeatWeeks} weeks + a test week) with your current weights.</p>
        <Btn
          variant="gold"
          className="w-full"
          onClick={() => void updateSettings({ repeats: [...data.settings.repeats, nextMonday] })}
        >
          Repeat Push from {fmtDay(nextMonday)}
        </Btn>
      </Panel>
      <MobilityCard date={today} gymDay={false} />
    </div>
  )
}
