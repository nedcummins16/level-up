import { useEffect, useRef } from 'react'
import { COSMETICS, UNLOCKABLES, XP, titleFor } from '../config/game'
import { updateSettings } from '../db/db'
import { useApp } from '../state/app'
import { useFx } from '../state/fx'

/** Fires level-up / achievement celebrations once, and auto-equips new cosmetics. */
export function GameWatcher() {
  const { game, data } = useApp()
  const fx = useFx()
  const handled = useRef<{ level: number; ach: Set<string> } | null>(null)
  const s = data.settings

  useEffect(() => {
    if (!handled.current) handled.current = { level: s.seenLevel, ach: new Set(s.seenAchievements) }
    const h = handled.current
    const patch: Parameters<typeof updateSettings>[0] = {}

    if (game.level > h.level) {
      const newly = UNLOCKABLES.filter((u) => u.level > h.level && u.level <= game.level)
      fx.celebrate({
        kind: 'level',
        title: `Level ${game.level}: ${titleFor(game.level)}`,
        sub: newly.length ? `Unlocked: ${newly.map((u) => u.name).join(', ')}` : undefined,
        icon: '⭐',
      })
      const cosmetics = { ...s.cosmetics }
      for (const c of COSMETICS) if (c.level > h.level && c.level <= game.level && c.slot) cosmetics[c.slot] = c.id
      patch.cosmetics = cosmetics
      patch.seenLevel = game.level
      h.level = game.level
    } else if (game.level < h.level) {
      // Data was deleted / reset.
      h.level = game.level
      patch.seenLevel = game.level
    }

    const fresh = game.achievements.filter((a) => a.unlocked && !h.ach.has(a.id))
    if (fresh.length) {
      if (fresh.length <= 3) for (const a of fresh) fx.celebrate({ kind: 'achievement', title: a.name, sub: a.desc, icon: a.icon, xp: XP.achievement })
      else fx.celebrate({ kind: 'achievement', title: `${fresh.length} achievements unlocked`, sub: fresh.map((a) => a.name).join(', '), icon: '🏆', xp: XP.achievement * fresh.length })
      for (const a of fresh) h.ach.add(a.id)
      patch.seenAchievements = [...h.ach]
    }

    if (Object.keys(patch).length) void updateSettings(patch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.level, game.achievements])

  return null
}
