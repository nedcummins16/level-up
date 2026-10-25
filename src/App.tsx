import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { GameWatcher } from './components/GameWatcher'
import { RestTimerBar } from './components/RestTimer'
import { UpdatePrompt } from './components/UpdatePrompt'
import { getSettings, updateSettings } from './db/db'
import { fmtDate } from './lib/dates'
import { setSoundEnabled, unlockAudio } from './lib/sound'
import { AppProvider, useApp, type Tab } from './state/app'
import { useAppData, useToday } from './state/data'
import { FxProvider } from './state/fx'
import { TimerProvider } from './state/timer'
import { Home } from './screens/Home'
import { InstallGate } from './screens/Install'
import { Settings } from './screens/Settings'
import { Today } from './screens/Today'
import { Week } from './screens/Week'

const Progress = lazy(() => import('./screens/Progress').then((m) => ({ default: m.Progress })))

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Hero' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'progress', label: 'Stats' },
  { id: 'settings', label: 'More' },
]

export default function App() {
  const data = useAppData()
  const today = useToday(data?.settings.timeTravel)
  const [tab, setTab] = useState<Tab>('home')
  const go = useCallback((t: Tab) => {
    setTab(t)
    window.scrollTo({ top: 0 })
  }, [])

  // First launch: ask the browser to keep our data (iOS may still clear it: back up!).
  useEffect(() => {
    void (async () => {
      const s = await getSettings()
      if (!s.persistRequested) {
        try {
          await navigator.storage?.persist?.()
        } catch {
          // unsupported
        }
        await updateSettings({ persistRequested: true })
      }
    })()
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  useEffect(() => {
    if (!data) return
    setSoundEnabled(data.settings.soundOn)
    document.documentElement.dataset.theme = data.settings.themeId
  }, [data])

  if (!data) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="font-pixel text-accent anim-blink">LOADING…</div>
      </div>
    )
  }

  return (
    <>
      <UpdatePrompt />
      <InstallGate>
        <TimerProvider>
          <FxProvider>
            <AppProvider data={data} today={today} tab={tab} go={go}>
              <Shell />
            </AppProvider>
          </FxProvider>
        </TimerProvider>
      </InstallGate>
    </>
  )
}

function Shell() {
  const { tab, go, data, today } = useApp()
  const active = data.sessions.some((s) => s.status === 'active')
  return (
    <div className="min-h-screen max-w-xl mx-auto">
      {data.settings.timeTravel && (
        <div className="bg-accent-2 text-black text-center text-xs font-pixel tracking-[0.15em] py-1 pt-safe">TIME TRAVEL · {fmtDate(today)}</div>
      )}
      <main>
        {tab === 'home' && <Home />}
        {tab === 'today' && <Today />}
        {tab === 'week' && <Week />}
        {tab === 'progress' && (
          <Suspense fallback={<div className="p-6 font-pixel text-accent anim-blink">LOADING…</div>}>
            <Progress />
          </Suspense>
        )}
        {tab === 'settings' && <Settings />}
      </main>
      <RestTimerBar />
      <GameWatcher />
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg border-t border-edge pb-safe">
        <div className="max-w-xl mx-auto grid grid-cols-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`relative h-[64px] flex items-center justify-center font-pixel text-[12px] tracking-[0.16em] uppercase border-t-[3px] ${tab === t.id ? 'text-ink border-accent' : 'text-muted border-transparent'}`}
            >
              {t.label}
              {t.id === 'today' && active && <span className="absolute top-3 right-3 w-2 h-2 bg-accent anim-blink" aria-label="Workout in progress" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
