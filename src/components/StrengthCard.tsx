import { useMemo, useState } from 'react'
import { SESSIONS } from '../config/program'
import type { StrengthSlot } from '../config/types'
import { fmtDay, type ISODate } from '../lib/dates'
import type { PlanItem } from '../lib/plan'
import { buildSession, repsLabel, restLabel } from '../lib/session'
import { startStrength } from '../state/actions'
import { useApp } from '../state/app'
import { Badge, Btn, Panel } from './ui'

export function StrengthCard({ item, date, preview = false }: { item: PlanItem; date: ISODate; preview?: boolean }) {
  const app = useApp()
  const slot = item.slot as StrengthSlot
  const plan = useMemo(() => buildSession(slot, app.sessionCtx(date)), [slot, app, date])
  const [open, setOpen] = useState(!preview)
  const done = app.data.sessions.find((s) => s.date === date && s.slot === slot && s.status === 'done')
  const active = app.data.sessions.find((s) => s.status === 'active')
  const icon = SESSIONS[slot].kind === 'beach' ? '🏖️' : SESSIONS[slot].lower ? '🦵' : '💪'

  return (
    <Panel accent={!done && !preview}>
      <div className="flex items-start gap-3">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-pixel text-[13px] text-accent leading-relaxed">{item.label.toUpperCase()}</div>
          <div className="text-sm text-muted">
            {plan.exercises.length} exercises · {plan.phaseName} · Week {plan.week}
            {item.movedFrom && <> · moved from {fmtDay(item.movedFrom)}</>}
          </div>
        </div>
        {done && <Badge color="good">Done</Badge>}
      </div>

      {plan.mods.notes.length > 0 && (
        <div className="mt-2 text-sm">
          {plan.mods.notes.map((n) => (
            <div key={n}>⚠️ {n}</div>
          ))}
        </div>
      )}
      {plan.mods.multiplierReasons.map((n) => (
        <div key={n} className="text-sm mt-1">
          📉 {n}
        </div>
      ))}

      <button className="w-full text-left text-sm text-muted min-h-[40px]" onClick={() => setOpen(!open)}>
        {open ? '▲ hide details' : '▼ warm-up + exercises'}
      </button>
      {open && (
        <div className="text-sm space-y-1 mb-2">
          <div className="text-muted font-pixel text-[9px] mt-1">WARM-UP</div>
          {plan.warmup.map((w) => (
            <div key={w}>· {w}</div>
          ))}
          <div className="text-muted font-pixel text-[9px] mt-3">EXERCISES</div>
          {plan.exercises.map((e, i) => {
            const lastText = e.last?.ex.sets
              .filter((x) => x.done)
              .map((x) => (x.weight ? `${x.weight}×${x.reps}` : x.reps))
              .join(', ')
            return (
              <div key={i} className="py-1 border-b border-edge/40">
                <div className="flex justify-between gap-2">
                  <span>
                    {i + 1}. {e.name}
                    {e.swappedFrom && <span className="text-muted"> (swap)</span>}
                  </span>
                  <span className="text-muted whitespace-nowrap">
                    {e.sets}×{repsLabel(e.reps, e.perSide, e.timed)} · {restLabel(e.rest)}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-xs text-muted">
                  <span>{lastText ? `Last: ${lastText}` : e.suggestion.message}</span>
                  {e.suggestion.weight !== null && !['plyo', 'timed', 'bodyweight'].includes(e.equipment) && (
                    <span className="text-xp whitespace-nowrap">
                      {e.suggestion.weight} kg{e.equipment === 'assisted' ? ' assist' : ''}
                      {e.suggestion.action === 'increase' ? ' ⬆' : e.suggestion.action === 'deload' ? ' ⬇' : ''}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!done && !preview && (
        <Btn
          className="w-full"
          disabled={!!active}
          onClick={async () => {
            await startStrength(plan, date, item.replaces)
            app.go('today')
          }}
        >
          ▶ Start {plan.name}
        </Btn>
      )}
    </Panel>
  )
}
