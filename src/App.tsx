import { PROGRAM } from './config/program'
import { addDays, fmtDay } from './lib/dates'
import { basePlan, getPhase, weekNumber } from './lib/plan'

const settings = { trainingDays: PROGRAM.trainingDays, tennisOff: [], christmasMove: null, repeats: [] }

export default function App() {
  const days = Array.from({ length: 7 * 13 }, (_, i) => addDays(PROGRAM.start, i))
  return (
    <main className="p-4 pt-safe">
      <h1 className="font-pixel text-accent text-lg mb-4">LEVEL UP</h1>
      {days.map((d) => (
        <div key={d} className="flex gap-3 text-sm py-1 border-b border-edge/40">
          <span className="w-24 text-muted">{fmtDay(d)}</span>
          <span className="w-10 text-muted">W{weekNumber(d)}</span>
          <span className="w-24 text-accent-2">{getPhase(d).name}</span>
          <span>{basePlan(d, settings).map((i) => i.label).join(' + ')}</span>
        </div>
      ))}
    </main>
  )
}
