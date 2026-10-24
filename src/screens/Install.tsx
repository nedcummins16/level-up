import { useState } from 'react'
import { Btn } from '../components/ui'

export function isIOS() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isStandalone() {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

const KEY = 'levelup.useInBrowser'

/** On iPhone Safari (not installed), show how to install before the app. */
export function InstallGate({ children }: { children: React.ReactNode }) {
  const [skip, setSkip] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  if (!isIOS() || isStandalone() || skip) return <>{children}</>
  return (
    <div className="min-h-screen bg-bg pt-safe pb-safe">
      <div className="max-w-md mx-auto p-5">
        <div className="text-center mt-6 mb-6">
          <img src={`${import.meta.env.BASE_URL}pwa-192x192.png`} alt="" className="w-24 h-24 mx-auto pixelated mb-4" />
          <div className="font-pixel text-[20px] text-accent">LEVEL UP</div>
          <div className="text-muted mt-2">Install it to play full-screen and offline.</div>
        </div>
        <InstallGuide />
        <Btn variant="ghost" className="w-full mt-6" onClick={() => {
          try {
            sessionStorage.setItem(KEY, '1')
          } catch {
            // ignore
          }
          setSkip(true)
        }}>
          Use in Safari anyway
        </Btn>
      </div>
    </div>
  )
}

export function InstallGuide() {
  const steps = [
    ['1', 'Open this page in Safari', '(not Chrome or an in-app browser)'],
    ['2', 'Tap the Share button', 'the square with an arrow ⬆️ in the toolbar (tap ⋯ first if you see it)'],
    ['3', 'Tap "Add to Home Screen"', 'scroll down the list if you can\'t see it'],
    ['4', 'Tap "Add"', 'then open Level Up from your Home Screen'],
  ]
  return (
    <div>
      {steps.map(([n, title, sub]) => (
        <div key={n} className="flex gap-3 items-start mb-4">
          <div className="w-10 h-10 shrink-0 grid place-items-center bg-accent text-accent-ink font-pixel text-sm">{n}</div>
          <div>
            <div className="font-bold">{title}</div>
            <div className="text-sm text-muted">{sub}</div>
          </div>
        </div>
      ))}
      <div className="bg-bg-2 border-[3px] border-xp p-3 text-sm">
        ⚠️ The Home Screen app and Safari keep <b>separate</b> data on iPhone. Install first, then log everything from the Home Screen icon. Works offline after the first load.
      </div>
    </div>
  )
}
