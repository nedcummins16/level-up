import { XP } from '../config/game'
import { MOBILITY } from '../config/program'
import type { ISODate } from '../lib/dates'
import { patchDaily } from '../state/actions'
import { useApp } from '../state/app'
import { useFx } from '../state/fx'
import { Check, Panel } from './ui'

export function MobilityCard({ date, gymDay }: { date: ISODate; gymDay: boolean }) {
  const { data } = useApp()
  const fx = useFx()
  const log = data.daily.find((d) => d.date === date)
  const items = MOBILITY.filter((m) => !m.gymDaysOnly || gymDay)
  const done = new Set(log?.mobility ?? [])
  const count = items.filter((i) => done.has(i.id)).length
  const complete = !!log?.mobilityDone

  const toggle = (id: string, on: boolean) => {
    const next = new Set(done)
    if (on) next.add(id)
    else next.delete(id)
    const allDone = items.every((i) => next.has(i.id))
    if (allDone && !complete) fx.floatXP(XP.mobility, 'mobility')
    void patchDaily(date, { mobility: [...next], mobilityDone: allDone })
  }

  return (
    <Panel accent={complete}>
      <div className="flex items-center justify-between mb-1">
        <div className="font-pixel text-[11px] text-accent">🧘 MOBILITY {count}/{items.length}</div>
        {complete ? (
          <span className="font-pixel text-[10px] text-good">+{XP.mobility} XP ✓</span>
        ) : (
          <button className="text-sm text-muted underline min-h-[44px]" onClick={() => void patchDaily(date, { mobility: items.map((i) => i.id), mobilityDone: true }).then(() => fx.floatXP(XP.mobility, 'mobility'))}>
            all done
          </button>
        )}
      </div>
      {items.map((m) => (
        <Check key={m.id} on={done.has(m.id)} onChange={(on) => toggle(m.id, on)}>
          {m.name}
        </Check>
      ))}
    </Panel>
  )
}
