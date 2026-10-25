// Pixel hero, drawn from your real build (see lib/sprite.ts). Gear is layered on top.

import { H, spriteRuns, W, type Build } from '../lib/sprite'

const DEFAULT_BUILD: Build = { bulk: 1, str: 1 }

/** Pixel runs of the hero (used by the share card too). */
export function heroRects(cosmetics: Record<string, string> = {}, build: Build = DEFAULT_BUILD) {
  const { runs, aura } = spriteRuns(build, cosmetics)
  return { runs, aura, w: W, h: H }
}

export function Character({
  cosmetics = {},
  build = DEFAULT_BUILD,
  size = 160,
  className = '',
}: {
  cosmetics?: Record<string, string>
  build?: Build
  size?: number
  className?: string
}) {
  const { runs, aura } = spriteRuns(build, cosmetics)
  return (
    <svg
      viewBox={`-1 -1 ${W + 2} ${H + 2}`}
      width={(size * (W + 2)) / (H + 2)}
      height={size}
      className={`pixelated ${className}`}
      style={aura ? { filter: `drop-shadow(0 0 3px ${aura}) drop-shadow(0 0 8px ${aura})` } : undefined}
      role="img"
      aria-label="Your hero"
    >
      {runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w + 0.02} height={1.02} fill={r.c} />
      ))}
    </svg>
  )
}

export function StreakFlame({ n, size = 40 }: { n: number; size?: number }) {
  const lit = n > 0
  const rows = ['....X...', '...XX...', '..XXX.X.', '.XXXXXX.', '.XXYYXX.', 'XXYYYYXX', 'XXYYYYXX', '.XXYYXX.']
  return (
    <svg viewBox="0 0 8 8" width={size} height={size} className={`pixelated ${lit ? 'anim-flame' : 'opacity-30 grayscale'}`} aria-hidden>
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={ch === 'Y' ? '#ffd23f' : 'var(--flame)'} />)),
      )}
    </svg>
  )
}
