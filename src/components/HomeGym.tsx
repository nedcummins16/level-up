// Your home gym: an empty garage that fills up as you level. Drawn behind your hero.

type R = [x: number, y: number, w: number, h: number, fill: string]

const METAL = '#6b7785'
const DARK = '#2a313b'
const BLACK = '#0b0d10'

const ITEMS: Record<string, R[]> = {
  mat: [
    [4, 86, 30, 4, 'var(--accent)'],
    [4, 89, 30, 1, 'rgba(0,0,0,0.35)'],
  ],
  dumbbells: [
    [3, 58, 20, 2, METAL],
    [3, 66, 20, 2, METAL],
    [4, 60, 2, 10, DARK],
    [20, 60, 2, 10, DARK],
    [6, 55, 3, 3, BLACK],
    [10, 55, 6, 1, METAL],
    [16, 55, 3, 3, BLACK],
    [6, 63, 3, 3, BLACK],
    [10, 63, 6, 1, METAL],
    [16, 63, 3, 3, BLACK],
  ],
  bench: [
    [84, 72, 26, 4, 'var(--accent-2)'],
    [86, 76, 2, 8, METAL],
    [106, 76, 2, 8, METAL],
    [84, 84, 6, 1, METAL],
    [104, 84, 6, 1, METAL],
  ],
  kettlebells: [
    [25, 64, 6, 6, BLACK],
    [26, 62, 4, 2, METAL],
    [27, 63, 2, 1, BLACK],
    [33, 66, 4, 4, '#ff6a2b'],
    [34, 65, 2, 1, METAL],
  ],
  rack: [
    [94, 16, 3, 54, METAL],
    [112, 16, 3, 54, METAL],
    [94, 16, 21, 2, METAL],
    [88, 34, 33, 2, '#c9d1d9'],
    [87, 30, 3, 10, BLACK],
    [119, 30, 3, 10, BLACK],
  ],
  pullupbar: [
    [44, 7, 32, 2, '#c9d1d9'],
    [44, 5, 2, 4, METAL],
    [74, 5, 2, 4, METAL],
  ],
  plates: [
    [80, 46, 2, 24, METAL],
    [77, 69, 8, 1, METAL],
    [76, 48, 10, 10, BLACK],
    [78, 50, 6, 6, '#3a414b'],
    [77, 59, 8, 8, BLACK],
    [79, 61, 4, 4, '#3a414b'],
  ],
  bike: [
    [4, 74, 10, 10, 'transparent'],
    [3, 76, 8, 8, DARK],
    [5, 78, 4, 4, METAL],
    [11, 72, 2, 10, METAL],
    [8, 70, 8, 2, BLACK],
    [15, 78, 6, 6, DARK],
  ],
  poster: [
    [26, 14, 13, 18, '#1c2128'],
    [27, 15, 11, 16, 'var(--accent)'],
    [29, 18, 7, 2, BLACK],
    [29, 22, 7, 6, BLACK],
    [31, 23, 3, 3, 'var(--accent)'],
  ],
  lights: [
    [2, 2, 2, 2, '#ffd23f'],
    [14, 3, 2, 2, '#ff6a2b'],
    [26, 2, 2, 2, '#3ad1ff'],
    [38, 3, 2, 2, '#ffd23f'],
    [82, 3, 2, 2, '#ff6a2b'],
    [94, 2, 2, 2, '#3ad1ff'],
    [106, 3, 2, 2, '#ffd23f'],
    [116, 2, 2, 2, '#ff6a2b'],
    [84, 52, 8, 12, BLACK],
    [86, 54, 4, 4, METAL],
    [87, 59, 2, 2, METAL],
  ],
  hoop: [
    [100, 4, 18, 13, '#e8edf2'],
    [104, 9, 10, 6, 'transparent'],
    [104, 9, 10, 1, '#ff6a2b'],
    [104, 15, 10, 1, '#ff6a2b'],
    [104, 9, 1, 6, '#ff6a2b'],
    [113, 9, 1, 6, '#ff6a2b'],
    [103, 17, 12, 1.5, '#ff6a2b'],
    [104, 18.5, 1, 6, '#c9d1d9'],
    [107, 18.5, 1, 6, '#c9d1d9'],
    [110, 18.5, 1, 6, '#c9d1d9'],
    [113, 18.5, 1, 6, '#c9d1d9'],
  ],
}

export function HomeGym({ items }: { items: string[] }) {
  return (
    <svg viewBox="0 0 120 100" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full pixelated" aria-hidden="true">
      {/* back wall + floor */}
      <rect x="0" y="0" width="120" height="72" fill="var(--bg-2)" />
      {[12, 24, 36, 48, 60].map((y) => (
        <rect key={y} x="0" y={y} width="120" height="0.4" fill="rgba(255,255,255,0.03)" />
      ))}
      <rect x="0" y="72" width="120" height="28" fill="var(--panel-2)" />
      <rect x="0" y="72" width="120" height="0.8" fill="var(--edge)" />
      {/* roller door */}
      <rect x="44" y="12" width="32" height="60" fill="#161a20" />
      {[16, 22, 28, 34, 40, 46, 52, 58, 64].map((y) => (
        <rect key={y} x="44" y={y} width="32" height="0.6" fill="#232a33" />
      ))}
      {items.map((id) =>
        (ITEMS[id] ?? []).map(([x, y, w, h, fill], i) =>
          fill === 'transparent' ? null : <rect key={`${id}${i}`} x={x} y={y} width={w} height={h} fill={fill} />,
        ),
      )}
      {/* soft glow where the hero stands */}
      <ellipse cx="60" cy="86" rx="34" ry="9" fill="var(--glow)" />
    </svg>
  )
}
