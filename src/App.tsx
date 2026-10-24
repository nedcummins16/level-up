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

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Hero', icon: '🛡️' },
  { id: 'today', label: 'Today', icon: '⚔️' },
  { id: 'week', label: 'Week', icon: '📜' },
  { id: 'progress', label: 'Stats', icon: '📈' },
  { id: 'settings', label: 'More', icon: '⚙️' },
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
        <div className="bg-accent-2 text-black text-center text-xs font-pixel py-1 pt-safe">⏳ TIME TRAVEL: {fmtDate(today)}</div>
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-2 border-t-4 border-edge pb-safe">
        <div className="max-w-xl mx-auto grid grid-cols-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={`h-[64px] flex flex-col items-center justify-center gap-1 ${tab === t.id ? 'bg-panel text-accent' : 'text-muted'}`}
            >
              <span className="text-xl leading-none relative">
                {t.icon}
                {t.id === 'today' && active && <span className="absolute -top-1 -right-2 w-2.5 h-2.5 bg-accent anim-blink" />}
              </span>
              <span className="font-pixel text-[8px] uppercase">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
