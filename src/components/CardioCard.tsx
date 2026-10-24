import { useState } from 'react'
import { XP } from '../config/game'
import { PROGRAM } from '../config/program'
import type { CardioSlot } from '../config/types'
import { mondayOf, type ISODate } from '../lib/dates'
import type { PlanItem } from '../lib/plan'
import { deleteSession, logCardio, toggleTennis } from '../state/actions'
import { useApp } from '../state/app'
import { useFx } from '../state/fx'
import { Btn, NumField, Panel, Toggle } from './ui'

const ICON: Record<string, string> = { cardio: '🏃', tennis: '🎾', intervals: '⚡', sprints: '🏖️', beachRun: '🌊' }

export function CardioCard({ item, date }: { item: PlanItem; date: ISODate }) {
  const { data, today } = useApp()
  const fx = useFx()
  const slot = item.slot as CardioSlot
  const done = data.sessions.find((s) => s.date === date && s.slot === slot && s.status === 'done')
  const [min, setMin] = useState<number | null>(item.minutes?.[0] ?? (slot === 'tennis' ? 90 : slot === 'intervals' || slot === 'sprints' ? 25 : 30))
  const [km, setKm] = useState<number | null>(null)
  const icon = item.mode === 'swim' ? '🏊' : ICON[slot] ?? '🏃'
  const isSat = slot === 'tennis' || slot === 'intervals'
  const weekStart = mondayOf(date)
  const tennisOn = !data.settings.tennisOff.includes(weekStart)

  return (
    <Panel accent={!!done}>
      <div className="flex items-start gap-3">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1">
          <div className="font-pixel text-[11px] leading-relaxed">{item.label}</div>
          {slot === 'cardio' && <div className="text-sm text-muted">Zone 2: you could hold a conversation.</div>}
          {slot === 'intervals' && <div className="text-sm text-muted">Tennis is off this week. Warm up 5 min first.</div>}
        </div>
      </div>
      {isSat && date >= today && (
        <Toggle on={tennisOn} onChange={(on) => void toggleTennis(weekStart, on)} label={<span className="text-sm">Tennis on this week ({PROGRAM.tennisTime} Sat)</span>} />
      )}
      {done ? (
        <div className="flex items-center justify-between mt-2">
          <span className="text-good font-pixel text-[11px]">
            ✓ {done.minutes} min{done.distanceKm ? ` · ${done.distanceKm} km` : ''} · +{XP.cardio} XP
          </span>
          <button className="text-sm text-muted underline min-h-[44px]" onClick={() => void deleteSession(done.id!)}>
            undo
          </button>
        </div>
      ) : date <= today ? (
        <div className="flex gap-2 items-end mt-2">
          <NumField label="Minutes" value={min} onChange={setMin} decimal={false} className="w-24" />
          {(slot === 'cardio' || slot === 'beachRun') && <NumField label="km (opt.)" value={km} onChange={setKm} className="w-24" />}
          <Btn
            className="flex-1"
            disabled={!min}
            onClick={() => {
              void logCardio(slot, date, min ?? 0, item.label, km)
              fx.floatXP(XP.cardio)
            }}
          >
            Done ✓
          </Btn>
        </div>
      ) : null}
    </Panel>
  )
}
