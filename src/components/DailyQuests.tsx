import { useState } from 'react'
import { DAILY_QUESTS, FOOD, XP } from '../config/game'
import { patchDaily } from '../state/actions'
import { useApp } from '../state/app'
import { useFx } from '../state/fx'
import { sfx } from '../lib/sound'
import { H, Panel, Sheet } from './ui'

export function DailyQuests() {
  const { data, today, todayPlan, go } = useApp()
  const fx = useFx()
  const [menu, setMenu] = useState(false)
  const log = data.daily.find((d) => d.date === today)
  const restDay = todayPlan.items.every((i) => i.kind === 'rest')
  const meals = new Set(log?.meals ?? [])

  const set = (key: 'protein' | 'steps' | 'smoothie', val: boolean) => {
    const cur = log?.[key] ?? null
    const next = cur === val ? null : val
    if (next === true) {
      sfx.tap()
      fx.floatXP(XP.dailyQuest)
    }
    void patchDaily(today, { [key]: next })
  }

  const toggleMeal = (id: string) => {
    const next = new Set(meals)
    if (next.has(id)) next.delete(id)
    else {
      next.add(id)
      sfx.tap()
      if (next.size === FOOD.slots.length) fx.floatXP(XP.dailyQuest, 'fed')
    }
    void patchDaily(today, { meals: [...next] })
  }

  const doneCount = [log?.mobilityDone, log?.protein, log?.steps, log?.smoothie, meals.size >= FOOD.slots.length].filter(Boolean).length

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <H className="!mb-1">Daily quests</H>
        <span className="font-pixel text-[14px] text-muted">
          {doneCount}/{DAILY_QUESTS.length}
        </span>
      </div>
      {DAILY_QUESTS.map((q) => {
        if (q.id === 'mobility') {
          return (
            <button key={q.id} onClick={() => go('today')} className="w-full flex items-center gap-3 min-h-[52px] text-left">
              <span className="text-2xl w-8 text-center">{q.emoji}</span>
              <span className={`flex-1 ${log?.mobilityDone ? 'line-through text-muted' : ''}`}>{restDay ? 'Recovery quest: mobility on a rest day' : q.name}</span>
              <span className={`font-pixel text-[14px] px-2 py-2 ${log?.mobilityDone ? 'bg-good text-black' : 'bg-panel-2 text-muted'}`}>
                {log?.mobilityDone ? `+${restDay ? XP.mobility + XP.recovery : XP.mobility}` : 'GO ›'}
              </span>
            </button>
          )
        }
        if (q.id === 'meals') {
          return (
            <div key={q.id} className="py-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl w-8 text-center">{q.emoji}</span>
                <span className={`flex-1 ${meals.size >= FOOD.slots.length ? 'line-through text-muted' : ''}`}>
                  Eat 5 times <span className="text-muted text-sm">({meals.size}/5)</span>
                </span>
                <button onClick={() => setMenu(true)} className="text-sm text-accent underline min-h-[44px] px-1">
                  bulk menu
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mt-1 pl-11">
                {FOOD.slots.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => toggleMeal(f.id)}
                    className={`h-12 border-[3px] flex flex-col items-center justify-center leading-none ${meals.has(f.id) ? 'bg-good border-ink' : 'bg-bg-2 border-edge opacity-70'}`}
                    aria-label={`${f.name} ${meals.has(f.id) ? 'eaten' : 'not eaten'}`}
                    aria-pressed={meals.has(f.id)}
                  >
                    <span className="text-lg">{f.emoji}</span>
                    <span className={`text-[9px] mt-0.5 ${meals.has(f.id) ? 'text-black' : 'text-muted'}`}>{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        }
        const v = log?.[q.id] ?? null
        return (
          <div key={q.id} className="flex items-center gap-3 min-h-[52px]">
            <span className="text-2xl w-8 text-center">{q.emoji}</span>
            <span className={`flex-1 ${v ? 'line-through text-muted' : ''}`}>{q.name}</span>
            <button
              onClick={() => set(q.id, false)}
              className={`w-12 h-11 font-pixel text-[15px] border-[3px] ${v === false ? 'bg-danger text-white border-ink' : 'bg-bg-2 border-edge text-muted'}`}
              aria-label={`${q.name}: no`}
            >
              ✗
            </button>
            <button
              onClick={() => set(q.id, true)}
              className={`w-12 h-11 font-pixel text-[15px] border-[3px] ${v ? 'bg-good text-black border-ink' : 'bg-bg-2 border-edge text-muted'}`}
              aria-label={`${q.name}: yes`}
            >
              ✓
            </button>
          </div>
        )
      })}
      <Sheet open={menu} onClose={() => setMenu(false)} title="Bulk menu">
        <BulkMenu />
      </Sheet>
    </Panel>
  )
}

function BulkMenu() {
  return (
    <div>
      <p className="text-sm text-muted mb-3">Gaining 58 → 63 kg is mostly about eating enough, every day. No counting: just hit 5 eating moments. Easy wins:</p>
      {FOOD.ideas.map((f) => (
        <div key={f.name} className="py-2 border-b border-edge/40">
          <div className="flex justify-between gap-2">
            <span className="font-bold">{f.name}</span>
            <span className="text-sm text-xp whitespace-nowrap">
              ~{f.kcal} kcal · {f.protein} g
            </span>
          </div>
          <div className="text-sm text-muted">{f.what}</div>
        </div>
      ))}
      <div className="font-pixel text-[14px] text-accent mt-4 mb-2">TIPS</div>
      {FOOD.tips.map((t) => (
        <div key={t} className="text-sm mb-1">
          • {t}
        </div>
      ))}
    </div>
  )
}
