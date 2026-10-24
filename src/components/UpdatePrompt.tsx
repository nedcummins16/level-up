import { useRegisterSW } from 'virtual:pwa-register/react'
import { Btn } from './ui'

/** Shows "Update available" when a new version has been deployed. Data lives in IndexedDB, so it survives. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Check for a new version every hour while the app is open, and on resume.
      if (!reg) return
      setInterval(() => void reg.update().catch(() => {}), 60 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update().catch(() => {})
      })
    },
  })

  if (!needRefresh) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-[95] p-2 pt-safe">
      <div className="px-box px-box-accent anim-slide-up max-w-xl mx-auto p-3 flex items-center gap-2">
        <div className="flex-1">
          <div className="font-pixel text-[11px] text-accent">⬆️ UPDATE AVAILABLE</div>
          <div className="text-sm text-muted">New version ready. Your data is safe.</div>
        </div>
        <Btn small onClick={() => void updateServiceWorker(true)}>
          Update
        </Btn>
        <button className="w-10 h-10 font-pixel text-[10px] text-muted" onClick={() => setNeedRefresh(false)} aria-label="Later">
          ✕
        </button>
      </div>
    </div>
  )
}
