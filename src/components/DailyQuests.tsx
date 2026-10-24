import { DAILY_QUESTS, XP } from '../config/game'
import { patchDaily } from '../state/actions'
import { useApp } from '../state/app'
import { useFx } from '../state/fx'
import { sfx } from '../lib/sound'
import { H, Panel } from './ui'

export function DailyQuests() {
  const { data, today, todayPlan, go } = useApp()
  const fx = useFx()
  const log = data.daily.find((d) => d.date === today)
  const restDay = todayPlan.items.every((i) => i.kind === 'rest')

  const set = (key: 'protein' | 'steps' | 'smoothie', val: boolean) => {
    const cur = log?.[key] ?? null
    const next = cur === val ? null : val
    if (next === true) {
      sfx.tap()
      fx.floatXP(XP.dailyQuest)
    }
    void patchDaily(today, { [key]: next })
  }

  const doneCount = [log?.mobilityDone, log?.protein, log?.steps, log?.smoothie].filter(Boolean).length

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <H className="!mb-1">Daily quests</H>
        <span className="font-pixel text-[10px] text-muted">{doneCount}/4</span>
      </div>
      {DAILY_QUESTS.map((q) => {
        if (q.id === 'mobility') {
          return (
            <button key={q.id} onClick={() => go('today')} className="w-full flex items-center gap-3 min-h-[52px] text-left">
              <span className="text-2xl w-8 text-center">{q.emoji}</span>
              <span className={`flex-1 ${log?.mobilityDone ? 'line-through text-muted' : ''}`}>
                {restDay ? 'Recovery quest: mobility on a rest day' : q.name}
              </span>
              <span className={`font-pixel text-[10px] px-2 py-2 ${log?.mobilityDone ? 'bg-good text-black' : 'bg-panel-2 text-muted'}`}>{log?.mobilityDone ? `+${restDay ? XP.mobility + XP.recovery : XP.mobility}` : 'GO ›'}</span>
            </button>
          )
        }
        const v = log?.[q.id] ?? null
        return (
          <div key={q.id} className="flex items-center gap-3 min-h-[52px]">
            <span className="text-2xl w-8 text-center">{q.emoji}</span>
            <span className={`flex-1 ${v ? 'line-through text-muted' : ''}`}>{q.name}</span>
            <button
              onClick={() => set(q.id, false)}
              className={`w-12 h-11 font-pixel text-[11px] border-[3px] ${v === false ? 'bg-danger text-white border-ink' : 'bg-bg-2 border-edge text-muted'}`}
              aria-label={`${q.name}: no`}
            >
              ✗
            </button>
            <button
              onClick={() => set(q.id, true)}
              className={`w-12 h-11 font-pixel text-[11px] border-[3px] ${v ? 'bg-good text-black border-ink' : 'bg-bg-2 border-edge text-muted'}`}
              aria-label={`${q.name}: yes`}
            >
              ✓
            </button>
          </div>
        )
      })}
    </Panel>
  )
}
