import { fmtDuration } from '../lib/dates'
import { useTimer } from '../state/timer'

/** Sticky rest timer bar (sits above the tab bar) + full-screen flash when rest is over. */
export function RestTimerBar() {
  const { timer, remaining, add, stop, flashing, dismissFlash } = useTimer()
  if (!timer) return null
  const done = remaining <= 0
  const pct = timer.total > 0 ? (remaining / (timer.total * 1000)) * 100 : 0
  return (
    <>
      <div className={`fixed left-0 right-0 bottom-[68px] z-40 px-2 pb-1 ${done ? '' : ''}`} style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        <div className={`px-box !m-1 p-2 flex items-center gap-2 ${done ? 'px-box-accent' : ''}`}>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted truncate">{done ? 'Rest done: next set!' : timer.label}</div>
            <div className={`font-pixel text-[22px] ${done ? 'text-accent anim-blink' : 'text-ink'}`}>{done ? 'GO!' : fmtDuration(remaining)}</div>
            <div className="h-1.5 bg-bg-2 mt-1">
              <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
            </div>
          </div>
          {!done && (
            <>
              <button onClick={() => add(-15)} className="w-12 h-12 bg-panel-2 font-pixel text-[10px]" aria-label="Minus 15 seconds">
                −15
              </button>
              <button onClick={() => add(15)} className="w-12 h-12 bg-panel-2 font-pixel text-[10px]" aria-label="Plus 15 seconds">
                +15
              </button>
            </>
          )}
          <button onClick={stop} className="w-12 h-12 bg-panel-2 font-pixel text-[10px]" aria-label="Close timer">
            {done ? '✕' : 'SKIP'}
          </button>
        </div>
      </div>
      {flashing && (
        <div className="anim-flash fixed inset-0 z-[90] grid place-items-center" onClick={dismissFlash}>
          <div className="text-center">
            <div className="font-pixel text-[40px] text-black mb-4">GO!</div>
            <div className="font-pixel text-[12px] text-black">REST OVER: TAP</div>
          </div>
        </div>
      )}
    </>
  )
}
