import { useState } from 'react'
import { Btn, Panel, Sheet } from '../components/ui'
import type { LifeType } from '../db/types'
import { addDays, fmtDay, mondayOf } from '../lib/dates'
import { activeEvents, LIFE_OPTIONS, lifeOption, ongoingEvents, type LifeOption } from '../lib/life'
import { getPhase } from '../lib/plan'
import { addLife, endOngoing, removeLife } from '../state/actions'
import { useApp } from '../state/app'

export function LifeHappensButton() {
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState<LifeOption | null>(null)
  const { today, data, todayPlan } = useApp()
  const hasStrength = todayPlan.items.some((i) => i.kind === 'strength')
  const active = new Set(activeEvents(data.life, today).map((e) => e.type))

  const choose = async (type: LifeType) => {
    await addLife(type, today)
    setPick(null)
    setOpen(false)
  }

  return (
    <>
      <Btn variant="ghost" className="w-full mt-3" onClick={() => setOpen(true)}>
        🎲 Life happens
      </Btn>
      <Sheet open={open} onClose={() => { setOpen(false); setPick(null) }} title={pick ? pick.title : 'Life happens'}>
        {!pick ? (
          <>
            <p className="text-sm text-muted mb-3">Plans bend, streaks don't break. Pick what's going on:</p>
            {LIFE_OPTIONS.map((o) => {
              const disabled = active.has(o.type) || ((o.type === 'noGym' || o.type === 'only30' || o.type === 'unmotivated') && !hasStrength)
              return (
                <button
                  key={o.type}
                  disabled={disabled}
                  onClick={() => setPick(o)}
                  className="w-full text-left flex gap-3 items-start p-3 mb-2 bg-panel-2 border-[3px] border-edge disabled:opacity-40 min-h-[56px]"
                >
                  <span className="text-2xl">{o.emoji}</span>
                  <span>
                    <span className="block font-pixel text-[14px] text-accent leading-relaxed">{o.title.toUpperCase()}</span>
                    <span className="block text-sm text-muted">{active.has(o.type) ? 'Already active' : o.desc}</span>
                  </span>
                </button>
              )
            })}
          </>
        ) : (
          <>
            <div className="text-5xl text-center mb-3">{pick.emoji}</div>
            <p className="mb-3">{pick.desc}</p>
            <p className="text-sm text-muted mb-4">{scopeText(pick, today)}</p>
            {pick.sick && <p className="text-sm text-xp mb-4">❄️ If this week falls short, a streak freeze is used instead of breaking your streak.</p>}
            <div className="flex gap-2">
              <Btn variant="ghost" className="flex-1" onClick={() => setPick(null)}>
                Back
              </Btn>
              <Btn className="flex-1" onClick={() => void choose(pick.type)}>
                Apply
              </Btn>
            </div>
          </>
        )}
      </Sheet>
    </>
  )
}

function scopeText(o: LifeOption, today: string) {
  switch (o.scope) {
    case 'day':
      return `Applies today (${fmtDay(today)}).`
    case 'week':
      return `Applies until Sunday ${fmtDay(addDays(mondayOf(today), 6))}.`
    case 'ongoing':
      return 'Stays on until you tap "I\'m better".'
    case 'twoWeeks':
      return `Week 1 at 90% from today, week 2 at 95% from ${fmtDay(addDays(today, 7))}, then full weights.`
  }
}

/** Active Life Happens effects, with Undo / "I'm better". Also nudges after an empty week. */
export function LifeBanners() {
  const { today, data, planFor } = useApp()
  const act = activeEvents(data.life, today)
  const ongoing = ongoingEvents(data.life, today)
  const shown = [...new Map([...act, ...ongoing].map((e) => [e.id, e])).values()]

  // Suggest "missed a whole week" if last week had planned gym sessions but zero done.
  const lastWeek = addDays(mondayOf(today), -7)
  const phaseLast = getPhase(lastWeek, data.settings.repeats).id
  const lastWeekPlan = planFor(lastWeek)
  const lastPlannedStrength = lastWeekPlan.days.flatMap((d) => d.items).filter((i) => i.kind === 'strength').length
  const lastDone = data.sessions.filter((s) => s.status === 'done' && s.date >= lastWeek && s.date < mondayOf(today)).length
  const alreadyRebuilding = data.life.some((e) => e.type === 'missedWeek' && e.start >= lastWeek)
  const gymPhases = ['foundation', 'build', 'push', 'repeat']
  const suggestRebuild = gymPhases.includes(phaseLast) && gymPhases.includes(getPhase(today, data.settings.repeats).id) && lastPlannedStrength > 0 && lastDone === 0 && !alreadyRebuilding && data.sessions.some((s) => s.date < lastWeek)

  if (!shown.length && !suggestRebuild) return null
  return (
    <>
      {suggestRebuild && (
        <Panel accent>
          <div className="mb-2">👋 Welcome back! Last week was empty. Rebuild over 2 weeks (90% → 95% → full)?</div>
          <Btn className="w-full" onClick={() => void addLife('missedWeek', today)}>
            Start rebuild
          </Btn>
        </Panel>
      )}
      {shown.map((e) => {
        const o = lifeOption(e.type)
        const isOngoing = e.end === null
        return (
          <Panel key={e.id} className="!bg-panel-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{o?.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-pixel text-[14px] text-accent-2 leading-relaxed">{o?.title.toUpperCase()}</div>
                <div className="text-xs text-muted">{isOngoing ? `since ${fmtDay(e.start)}` : e.start === e.end ? 'today' : `until ${fmtDay(e.end!)}`}</div>
              </div>
              {isOngoing ? (
                <Btn small onClick={() => void endOngoing(e.id!, today)}>
                  I'm better
                </Btn>
              ) : (
                <button className="text-sm text-muted underline min-h-[44px] px-2" onClick={() => void removeLife(e.id!)}>
                  undo
                </button>
              )}
            </div>
          </Panel>
        )
      })}
    </>
  )
}
