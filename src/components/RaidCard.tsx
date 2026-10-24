import { XP } from '../config/game'
import { updateSettings } from '../db/db'
import type { WeekResult } from '../lib/game'
import { useApp } from '../state/app'
import { useFx } from '../state/fx'
import { Badge, Btn, Panel } from './ui'

const LOOT = ['Golden Dumbbell', 'Potion of Gains', 'Scroll of Protein', 'Enchanted Chalk', 'Sneakers of Haste', 'Amulet of Grip', 'Elixir of Sleep', 'Rune of the Rim']

export function ChestPixel({ open = false, size = 44 }: { open?: boolean; size?: number }) {
  const closed = ['..KKKKKK..', '.KYYYYYYK.', 'KYBBBBBBYK', 'KKKKKKKKKK', 'KBBBYYBBBK', 'KBBBYYBBBK', 'KBBBBBBBBK', 'KKKKKKKKKK']
  const opened = ['KKKKKKKKKK', 'KYBBBBBBYK', '.KYYYYYYK.', 'KWWWWWWWWK', 'KBBBYYBBBK', 'KBBBYYBBBK', 'KBBBBBBBBK', 'KKKKKKKKKK']
  const pal: Record<string, string> = { K: '#120c24', Y: '#ffd23f', B: '#a0522d', W: '#fff7b0' }
  const rows = open ? opened : closed
  return (
    <svg viewBox="0 0 10 8" width={size} height={size * 0.8} className="pixelated" aria-hidden>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === '.' ? null : <rect key={`${x}${y}`} x={x} y={y} width={1.02} height={1.02} fill={pal[c]} />)))}
    </svg>
  )
}

export function RaidCard({ week }: { week?: WeekResult | null }) {
  const app = useApp()
  const fx = useFx()
  const w = week ?? app.game.thisWeek
  if (!w || w.planned === 0) return null
  const r = w.raid
  const canOpen = r.done && !r.opened
  return (
    <Panel accent={canOpen}>
      <div className="flex items-center gap-3">
        <div className={canOpen ? 'anim-shake' : ''}>
          <ChestPixel open={r.opened} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-pixel text-[9px] text-muted">WEEKLY RAID</div>
          <div className="font-pixel text-[11px] text-accent-2 leading-relaxed">{r.name.toUpperCase()}</div>
          <div className="text-sm text-muted">{r.desc}</div>
        </div>
        <Badge color={r.done ? 'good' : 'muted'}>{r.done ? '✓' : r.progress}</Badge>
      </div>
      {canOpen && (
        <Btn
          variant="gold"
          className="w-full mt-2"
          onClick={() => {
            const loot = LOOT[Math.floor(Math.random() * LOOT.length)]
            void updateSettings({ openedChests: [...app.data.settings.openedChests, w.weekStart] })
            fx.celebrate({ kind: 'chest', title: r.name, sub: `You found: ${loot}`, icon: '🎁', xp: XP.raidChest })
          }}
        >
          Open chest
        </Btn>
      )}
    </Panel>
  )
}
