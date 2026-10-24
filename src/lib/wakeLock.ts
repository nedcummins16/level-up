import { useEffect } from 'react'

/** Keep the screen on while `active`. Fails silently where unsupported. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const wl = (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<WakeLockSentinel> } }).wakeLock
    if (!wl) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        if (document.visibilityState !== 'visible') return
        sentinel = await wl.request('screen')
        if (cancelled) void sentinel.release().catch(() => {})
      } catch {
        // not allowed / unsupported: ignore
      }
    }
    // The lock is dropped whenever the app is hidden, so take it again on return.
    const onVis = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      void sentinel?.release().catch(() => {})
    }
  }, [active])
}
