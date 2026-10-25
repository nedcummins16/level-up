import { useState } from 'react'
import { FEEL } from '../config/feel'
import { EXERCISES } from '../config/program'
import type { MuscleId } from '../config/types'
import { MUSCLES, MuscleMap } from './MuscleMap'
import { Sheet } from './ui'

function Chip({ id, tone }: { id: MuscleId; tone: 'primary' | 'secondary' }) {
  return (
    <span className={`inline-block text-xs px-2 py-1 mr-1 mb-1 ${tone === 'primary' ? 'bg-accent text-accent-ink' : 'bg-xp/80 text-black'}`}>{MUSCLES[id].name}</span>
  )
}

/** The "Feel it here" card for one exercise. */
export function FeelCardView({ ex }: { ex: string }) {
  const card = FEEL[ex]
  const [warn, setWarn] = useState<number | null>(null)
  if (!card) return <p className="text-muted">No card for this exercise yet.</p>
  const info = EXERCISES[ex]
  return (
    <div>
      <MuscleMap primary={card.primary} secondary={card.secondary} warn={warn !== null ? card.wrong[warn].at : null} size={210} />
      <div className="mt-3">
        {card.primary.map((m) => (
          <Chip key={m} id={m} tone="primary" />
        ))}
        {card.secondary?.map((m) => (
          <Chip key={m} id={m} tone="secondary" />
        ))}
      </div>
      <div className="bg-bg-2 border-l-4 border-accent p-3 mt-2">
        <div className="font-pixel text-[12px] text-accent mb-1">✅ FEEL IT HERE</div>
        <p className="text-sm">{card.feel}</p>
        {info?.cue && <p className="text-sm text-muted mt-1">💡 {info.cue}</p>}
      </div>
      <div className="font-pixel text-[12px] text-danger mt-4 mb-2">⚠️ FEEL IT SOMEWHERE ELSE?</div>
      {card.wrong.map((w, i) => (
        <button
          key={i}
          onClick={() => setWarn(warn === i ? null : i)}
          className={`w-full text-left p-3 mb-2 border-[3px] ${warn === i ? 'border-danger bg-panel-2' : 'border-edge bg-bg-2'}`}
          aria-pressed={warn === i}
        >
          <div className="font-bold text-sm">
            <span className="text-danger">{MUSCLES[w.at].name}:</span> {w.means}
          </div>
          <div className="text-sm text-good mt-1">Fix: {w.fix}</div>
        </button>
      ))}
      <p className="text-xs text-muted">Tap a problem to see where it shows up. Sharp pain (not muscle burn)? Stop and swap the exercise.</p>
    </div>
  )
}

/** Opens the card in a sheet. `map` shows a tiny body map as the button. */
export function FeelItButton({ ex, name, variant = 'button' }: { ex: string; name: string; variant?: 'button' | 'map' | 'compact' }) {
  const [open, setOpen] = useState(false)
  const card = FEEL[ex]
  if (!card) return null
  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className={
          variant === 'map'
            ? 'shrink-0 bg-bg-2 border-[3px] border-edge px-1 pt-1 flex flex-col items-center'
            : `shrink-0 bg-panel-2 font-pixel ${variant === 'compact' ? 'h-8 px-2 text-[11px]' : 'h-10 px-2 text-[12px]'}`
        }
        aria-label={`Where to feel ${name}`}
      >
        {variant === 'map' ? (
          <>
            <MuscleMap primary={card.primary} secondary={card.secondary} size={58} />
            <span className="font-pixel text-[9px] text-accent mt-0.5 mb-0.5">🎯 FEEL IT</span>
          </>
        ) : (
          '🎯 FEEL'
        )}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={name}>
        <FeelCardView ex={ex} />
      </Sheet>
    </>
  )
}
