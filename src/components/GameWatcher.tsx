import { useEffect, useRef } from 'react'
import { COSMETICS, DUNK, LOOT, SPECIAL_GEAR, UNLOCKABLES, XP, titleFor } from '../config/game'
import { RARITY } from './Loot'
import { updateSettings } from '../db/db'
import { useApp } from '../state/app'
import { useFx } from '../state/fx'

/** Fires level-up / achievement celebrations once, and auto-equips new cosmetics. */
export function GameWatcher() {
  const { game, data } = useApp()
  const fx = useFx()
  const handled = useRef<{
    level: number
    ach: Set<string>
    build?: { bulk: number; str: number }
    dunk?: Set<string>
    drops?: Set<string>
    gear?: Set<string>
  } | null>(null)
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

    // Physique: celebrate when your real numbers make the hero bigger.
    const pb = { bulk: game.physique.bulk, str: game.physique.str }
    if (!h.build) h.build = s.seenBuild ?? pb
    if (pb.bulk > h.build.bulk || pb.str > h.build.str) {
      fx.celebrate({
        kind: 'achievement',
        title: pb.bulk > h.build.bulk ? `Bigger build: ${game.physique.bulkName}` : `Stronger build: ${game.physique.strName}`,
        sub: 'Your hero grew because YOU did. Real weigh-ins, real lifts.',
        icon: '💪',
      })
    }
    if (pb.bulk !== h.build.bulk || pb.str !== h.build.str || !s.seenBuild) {
      h.build = pb
      patch.seenBuild = pb
    }

    // Dunk meter milestones
    if (!h.dunk) h.dunk = new Set(s.seenDunk)
    const newDunk = game.dunk.reached.filter((id) => !h.dunk!.has(id))
    if (newDunk.length) {
      const m = DUNK.milestones.find((x) => x.id === newDunk[newDunk.length - 1])!
      fx.celebrate({ kind: 'achievement', title: `Dunk meter: ${m.name}!`, sub: `Best touch ${(game.dunk.best! / 100).toFixed(2)} m. The rim is at 3.05 m.`, icon: '🏀' })
      for (const id of newDunk) h.dunk.add(id)
      patch.seenDunk = [...h.dunk]
    }

    // Loot reveals (first run: mark everything as seen without a parade)
    if (!h.drops) h.drops = new Set(s.seenDrops ?? game.loot.drops.map((d) => d.id))
    if (s.seenDrops === null) patch.seenDrops = [...h.drops]
    const freshDrops = game.loot.drops.filter((d) => !h.drops!.has(d.id))
    if (freshDrops.length) {
      if (freshDrops.length <= 3) {
        for (const d of freshDrops) {
          const item = LOOT.items.find((i) => i.id === d.itemId)!
          const set = LOOT.sets.find((x) => x.id === item.set)!
          const have = LOOT.items.filter((i) => i.set === set.id && game.loot.owned[i.id]).length
          const total = LOOT.items.filter((i) => i.set === set.id).length
          fx.celebrate({
            kind: d.source === 'chest' ? 'chest' : 'loot',
            title: item.name,
            sub: `${RARITY[d.rarity].label} · ${set.name} ${have}/${total}${d.duplicate ? ` · duplicate → +${LOOT.duplicateXP} XP` : ''}`,
            icon: item.icon,
            xp: d.source === 'chest' ? XP.raidChest : undefined,
            colour: RARITY[d.rarity].colour,
          })
        }
      } else {
        fx.celebrate({ kind: 'loot', title: `${freshDrops.length} loot drops`, sub: 'Check your collection book.', icon: '🎁' })
      }
      for (const d of freshDrops) h.drops.add(d.id)
      patch.seenDrops = [...h.drops]
    }

    // Special gear from streaks and completed sets: celebrate + auto-equip
    const special = game.gearUnlocked.filter((id) => SPECIAL_GEAR.some((g) => g.id === id))
    if (!h.gear) h.gear = new Set(s.seenGear ?? special)
    if (s.seenGear === null) patch.seenGear = [...h.gear]
    const freshGear = special.filter((id) => !h.gear!.has(id))
    if (freshGear.length) {
      const cosmetics = { ...(patch.cosmetics ?? s.cosmetics) }
      for (const id of freshGear) {
        const g = SPECIAL_GEAR.find((x) => x.id === id)!
        cosmetics[g.slot] = g.id
        fx.celebrate({ kind: 'gear', title: g.name, sub: g.streak ? `Earned with a ${g.streak}-week streak. Equipped!` : 'Set complete! Equipped!', icon: '🎽' })
        h.gear.add(id)
      }
      patch.cosmetics = cosmetics
      patch.seenGear = [...h.gear]
    }

    if (Object.keys(patch).length) void updateSettings(patch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.level, game.achievements, game.physique.bulk, game.physique.str, game.dunk.reached.length, game.loot.drops.length, game.gearUnlocked.length])

  return null
}
