import { fmtDuration } from '../lib/dates'
import { useApp } from '../state/app'
import { useTimer } from '../state/timer'
import { Character } from './Character'

/** Sticky rest timer (above the tab bar) with your hero resting, + full-screen flash when rest is over. */
export function RestTimerBar() {
  const { timer, remaining, add, stop, flashing, dismissFlash } = useTimer()
  const { data } = useApp()
  if (!timer) return null
  const done = remaining <= 0
  const pct = timer.total > 0 ? (remaining / (timer.total * 1000)) * 100 : 0
  return (
    <>
      <div className="fixed left-0 right-0 bottom-[67px] z-40 px-3 pb-1" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        <div className={`px-box !my-1 max-w-xl mx-auto bg-panel border border-edge px-3 py-2 flex items-center gap-2 ${done ? 'px-box-accent' : ''}`}>
          <div className={done ? 'anim-bob' : ''}>
            <Character cosmetics={data.settings.cosmetics} size={64} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-pixel text-[11px] tracking-[0.22em] text-muted truncate">{done ? 'REST DONE · NEXT SET' : 'RECOVER'}</div>
            <div className={`font-pixel text-[32px] leading-none ${done ? 'text-accent anim-blink' : 'text-accent'}`}>{done ? 'GO!' : fmtDuration(remaining)}</div>
            <div className="text-xs text-muted truncate mt-0.5">{timer.label}</div>
            <div className="h-1 bg-panel-2 mt-1">
              <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
            </div>
          </div>
          {!done && (
            <>
              <button onClick={() => add(-15)} className="cut-sm w-12 h-12 bg-panel-2 font-pixel text-[14px]" aria-label="Minus 15 seconds">
                −15
              </button>
              <button onClick={() => add(15)} className="cut-sm w-12 h-12 bg-panel-2 font-pixel text-[14px]" aria-label="Plus 15 seconds">
                +15
              </button>
            </>
          )}
          <button onClick={stop} className="cut-sm w-12 h-12 bg-panel-2 font-pixel text-[13px]" aria-label="Close timer">
            {done ? '✕' : 'SKIP'}
          </button>
        </div>
      </div>
      {flashing && (
        <div className="anim-flash fixed inset-0 z-[90] grid place-items-center" onClick={dismissFlash}>
          <div className="text-center">
            <div className="font-pixel text-[64px] text-black mb-4 tracking-[0.1em]">GO!</div>
            <div className="font-pixel text-[16px] text-black tracking-[0.2em]">REST OVER · TAP</div>
          </div>
        </div>
      )}
    </>
  )
}
