import { useState } from 'react'
import { SKILL_BRANCHES, SKILLS } from '../config/game'
import { updateSettings } from '../db/db'
import { canUnlock, skillPoints, spentPoints } from '../lib/skills'
import { sfx } from '../lib/sound'
import { useApp } from '../state/app'
import { Badge, Btn, H, Panel, Sheet } from './ui'

/** Hero-screen card: shows unspent skill points and opens the tree. */
export function SkillTreeCard() {
  const { game, data } = useApp()
  const [open, setOpen] = useState(false)
  const free = skillPoints(game.level) - spentPoints(data.settings.skills)
  return (
    <Panel accent={free > 0}>
      <div className="flex items-center justify-between">
        <H className="!mb-0">Skill tree</H>
        <Badge color={free > 0 ? 'accent' : 'muted'}>
          {free} point{free === 1 ? '' : 's'}
        </Badge>
      </div>
      <p className="text-sm text-muted mt-1 mb-2">
        {free > 0 ? 'You have points to spend on new tools.' : `${game.skills.length}/${SKILLS.length} skills unlocked. Level up for more points.`}
      </p>
      <Btn variant={free > 0 ? 'primary' : 'ghost'} small className="w-full" onClick={() => setOpen(true)}>
        Open skill tree
      </Btn>
      <Sheet open={open} onClose={() => setOpen(false)} title="Skill tree">
        <SkillTree />
      </Sheet>
    </Panel>
  )
}

export function SkillTree() {
  const { game, data } = useApp()
  const owned = data.settings.skills
  const total = skillPoints(game.level)
  const free = total - spentPoints(owned)

  const unlock = (id: string) => {
    if (!canUnlock(id, owned, game.level)) return
    sfx.achievement()
    void updateSettings((s) => ({ skills: [...s.skills, id] }))
  }

  return (
    <div>
      <div className="flex justify-between items-baseline mb-3">
        <span className="font-pixel text-[14px] tracking-[0.12em]">
          <span className="text-accent">{free}</span> / {total} POINTS FREE
        </span>
        <button
          className="text-sm text-muted underline min-h-[44px]"
          onClick={() => {
            if (confirm('Reset all skills and get your points back? (free)')) void updateSettings({ skills: [] })
          }}
        >
          reset (free)
        </button>
      </div>
      <p className="text-xs text-muted mb-4">1 point per level. Skills add new tools only: Life Happens, progression, warm-ups and your last-time numbers are always on.</p>
      {SKILL_BRANCHES.map((b) => (
        <div key={b.id} className="mb-5">
          <div className="font-pixel text-[13px] tracking-[0.2em] text-accent">{b.name.toUpperCase()}</div>
          <div className="text-xs text-muted mb-2">{b.desc}</div>
          <div className="flex flex-col">
            {SKILLS.filter((s) => s.branch === b.id).map((s, i, arr) => {
              const has = owned.includes(s.id)
              const can = canUnlock(s.id, owned, game.level)
              const blocked = !has && !s.requires.every((r) => owned.includes(r))
              return (
                <div key={s.id} className="flex flex-col items-stretch">
                  <button
                    onClick={() => unlock(s.id)}
                    disabled={!can}
                    className={`cut-sm text-left p-3 ${has ? 'bg-accent text-accent-ink' : can ? 'bg-panel-2 shadow-[inset_0_0_0_2px_var(--accent)]' : 'bg-bg-2 opacity-60'}`}
                    aria-label={`${s.name}: ${has ? 'unlocked' : can ? `unlock for ${s.cost} point${s.cost > 1 ? 's' : ''}` : 'locked'}`}
                  >
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-pixel text-[14px]">{s.name.toUpperCase()}</span>
                      <span className="font-pixel text-[11px] whitespace-nowrap">{has ? 'UNLOCKED ✓' : `${s.cost} PT${s.cost > 1 ? 'S' : ''}`}</span>
                    </div>
                    <div className={`text-sm ${has ? '' : 'text-muted'}`}>{s.desc}</div>
                    {blocked && <div className="text-xs text-muted mt-1">Needs: {s.requires.map((r) => SKILLS.find((x) => x.id === r)?.name).join(', ')}</div>}
                    {!has && !blocked && !can && <div className="text-xs text-muted mt-1">Not enough points yet</div>}
                  </button>
                  {i < arr.length - 1 && <div className="self-center w-0.5 h-3 bg-edge" aria-hidden="true" />}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
