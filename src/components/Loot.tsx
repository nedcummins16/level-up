import { useState } from 'react'
import { LOOT, SPECIAL_GEAR, type Rarity } from '../config/game'
import { useApp } from '../state/app'
import { Badge, Btn, H, Panel, Sheet } from './ui'

export const RARITY: Record<Rarity, { label: string; colour: string }> = {
  common: { label: 'Common', colour: '#8a96a3' },
  rare: { label: 'Rare', colour: '#3ad1ff' },
  epic: { label: 'Epic', colour: '#b46bff' },
  legendary: { label: 'Legendary', colour: '#ffd23f' },
}

/** One collectible tile in its rarity frame (silhouette if not found yet). */
export function LootTile({ itemId, count = 1, size = 'md' }: { itemId: string; count?: number; size?: 'md' | 'lg' }) {
  const item = LOOT.items.find((i) => i.id === itemId)!
  const set = LOOT.sets.find((x) => x.id === item.set)!
  const r = RARITY[set.rarity]
  const have = count > 0
  const box = size === 'lg' ? 'w-24 h-24 text-5xl' : 'w-16 h-16 text-3xl'
  return (
    <div className="flex flex-col items-center gap-1 w-[72px]">
      <div
        className={`cut-sm ${box} grid place-items-center relative`}
        style={{ background: have ? `${r.colour}22` : 'var(--bg-2)', boxShadow: have ? `inset 0 0 0 2px ${r.colour}` : 'inset 0 0 0 2px var(--edge)' }}
      >
        <span className={have ? '' : 'grayscale brightness-0 opacity-40'}>{item.icon}</span>
        {count > 1 && <span className="absolute bottom-0.5 right-1 font-pixel text-[10px] text-muted">×{count}</span>}
      </div>
      <span className={`text-[11px] leading-tight text-center ${have ? '' : 'text-muted'}`}>{have ? item.name : '???'}</span>
    </div>
  )
}

export function CollectionCard() {
  const { game } = useApp()
  const [open, setOpen] = useState(false)
  const found = LOOT.items.filter((i) => game.loot.owned[i.id]).length
  const latest = game.loot.drops[game.loot.drops.length - 1]
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <H className="!mb-0">Collection</H>
        <Badge color="muted">
          {found}/{LOOT.items.length}
        </Badge>
      </div>
      <p className="text-sm text-muted mt-1 mb-2">Every planned session drops loot. Complete a set to unlock special gear.</p>
      {latest && (
        <div className="flex items-center gap-3 mb-2">
          <LootTile itemId={latest.itemId} />
          <div className="text-sm">
            <div className="font-pixel text-[12px] tracking-[0.15em]" style={{ color: RARITY[latest.rarity].colour }}>
              LATEST · {RARITY[latest.rarity].label.toUpperCase()}
            </div>
            <div className="text-muted">{latest.duplicate ? `Duplicate → +${LOOT.duplicateXP} XP` : 'New for your collection'}</div>
          </div>
        </div>
      )}
      <Btn variant="ghost" small className="w-full" onClick={() => setOpen(true)}>
        Open collection book
      </Btn>
      <Sheet open={open} onClose={() => setOpen(false)} title="Collection book">
        <CollectionBook />
      </Sheet>
    </Panel>
  )
}

function CollectionBook() {
  const { game } = useApp()
  return (
    <div>
      <div className="grid grid-cols-4 gap-1 mb-4 text-center text-xs">
        {(Object.keys(RARITY) as Rarity[]).map((k) => (
          <div key={k} className="cut-sm py-1.5" style={{ boxShadow: `inset 0 0 0 2px ${RARITY[k].colour}` }}>
            <div className="font-pixel text-[10px]" style={{ color: RARITY[k].colour }}>
              {RARITY[k].label.toUpperCase()}
            </div>
            <div className="text-muted">{Math.round(LOOT.odds[k] * 100)}%</div>
          </div>
        ))}
      </div>
      {LOOT.sets.map((set) => {
        const items = LOOT.items.filter((i) => i.set === set.id)
        const done = game.loot.setsComplete.includes(set.id)
        const bonus = SPECIAL_GEAR.find((g) => g.set === set.id)
        return (
          <div key={set.id} className="mb-5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-pixel text-[14px] tracking-[0.1em]" style={{ color: RARITY[set.rarity].colour }}>
                {set.name.toUpperCase()}
              </span>
              <span className="text-xs text-muted">
                {items.filter((i) => game.loot.owned[i.id]).length}/{items.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((i) => (
                <LootTile key={i.id} itemId={i.id} count={game.loot.owned[i.id] ?? 0} />
              ))}
            </div>
            {bonus && <div className={`text-sm mt-2 ${done ? 'text-good' : 'text-muted'}`}>{done ? `✓ Set bonus unlocked: ${bonus.name}` : `Set bonus: ${bonus.name}`}</div>}
          </div>
        )
      })}
      <p className="text-xs text-muted">
        A rare or better drop is guaranteed after {LOOT.pity} commons in a row. Duplicates turn into +{LOOT.duplicateXP} XP. Max {LOOT.maxPerWeek} drops a week: extra sessions don't earn more.
      </p>
    </div>
  )
}
