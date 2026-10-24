import { Btn, Panel } from '../components/ui'
import { useApp } from '../state/app'
export function Home() {
  const { go } = useApp()
  return (
    <div className="px-3 pt-safe pb-32">
      <Panel accent className="mt-2 text-center">
        <div className="font-pixel text-accent text-lg mb-3">LEVEL UP</div>
        <Btn onClick={() => go('today')}>Today's quest</Btn>
      </Panel>
    </div>
  )
}
