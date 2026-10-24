// Pixel-art hero (16 x 24) drawn as SVG rects. Cosmetics are layered on top.

const BASE = [
  '................',
  '.....KKKKKK.....',
  '....KHHHHHHK....',
  '...KHHHHHHHHK...',
  '...KHSSSSSSHK...',
  '...KSSKSSKSSK...',
  '...KSSSSSSSSK...',
  '....KSSKKSSK....',
  '.....KSSSSK.....',
  '...KKKTTTTKKK...',
  '..KSSTTTTTTSSK..',
  '..KSKTTWWTTKSK..',
  '..KSKTTWWTTKSK..',
  '..KSKTTTTTTKSK..',
  '..KSKTTTTTTKSK..',
  '..KSSKPPPPKSSK..',
  '...KKPPPPPPKK...',
  '....KPPKKPPK....',
  '....KLLK.KLLK...',
  '....KLLK.KLLK...',
  '....KLLK.KLLK...',
  '...KOOOK.KOOOK..',
  '...KKKKK.KKKKK..',
  '................',
]

type Layer = { rows: Record<number, string>; color: string; behind?: boolean }

const LAYERS: Record<string, Layer[]> = {
  'headband-red': [{ rows: { 4: '....XXXXXXXX....' }, color: '#ff3b3b' }],
  'headband-gold': [{ rows: { 4: '....XXXXXXXX....' }, color: '#ffd23f' }],
  cap: [
    { rows: { 1: '.....XXXXXX.....', 2: '....XXXXXXXX....', 3: '...XXXXXXXXXX...' }, color: '#34e0ff' },
    { rows: { 3: '..XX............' }, color: '#1a7a99' },
  ],
  crown: [{ rows: { 0: '.....X.XX.X.....', 1: '.....XXXXXX.....' }, color: '#ffd23f' }],
  wristbands: [{ rows: { 14: '...X........X...' }, color: '#ff4fd8' }],
  hightops: [{ rows: { 20: '.....XX...XX....' }, color: '#ffffff' }],
  'gold-shoes': [{ rows: { 21: '....XXX...XXX...' }, color: '#ffd23f' }],
  basketball: [
    { rows: { 15: '..............XX', 16: '.............XXX', 17: '.............XXX', 18: '..............XX' }, color: '#ff8a1f' },
    { rows: { 16: '..............K.', 17: '.............K..' }, color: '#5a2a00' },
  ],
  cape: [{ rows: { 9: '..X..........X..', 10: '.X............X.', 11: '.X............X.', 12: '.X............X.', 13: '.X............X.', 14: '.X............X.', 15: '.X............X.', 16: '.XX..........XX.', 17: 'XXX..........XXX' }, color: '#c81d4e', behind: true }],
}

const JERSEYS: Record<string, [string, string]> = {
  default: ['#cfd3e6', '#4b3fa0'],
  'jersey-blue': ['#2f6bff', '#ffffff'],
  'jersey-red': ['#e8263c', '#ffffff'],
  'jersey-black': ['#202020', '#ffd23f'],
}

const AURAS: Record<string, string> = { 'aura-blue': '#34e0ff', 'aura-gold': '#ffd23f' }

export function Character({ cosmetics = {}, size = 160, className = '' }: { cosmetics?: Record<string, string>; size?: number; className?: string }) {
  const [shirt, number] = JERSEYS[cosmetics.shirt ?? 'default'] ?? JERSEYS.default
  const shoes = '#f4f1ff'
  const palette: Record<string, string> = { K: '#120c24', H: '#3b2416', S: '#e0ac69', L: '#e0ac69', T: shirt, W: number, P: '#2a2459', O: shoes }
  const equipped = Object.values(cosmetics).filter((id) => LAYERS[id])
  const rects: { x: number; y: number; c: string }[] = []

  const drawLayer = (behind: boolean) => {
    for (const id of equipped) {
      for (const layer of LAYERS[id]) {
        if (!!layer.behind !== behind) continue
        for (const [y, row] of Object.entries(layer.rows)) {
          ;[...row].forEach((ch, x) => {
            if (ch === 'X') rects.push({ x, y: Number(y), c: layer.color })
            else if (ch === 'K') rects.push({ x, y: Number(y), c: '#5a2a00' })
          })
        }
      }
    }
  }

  drawLayer(true)
  BASE.forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      if (ch !== '.') rects.push({ x, y, c: palette[ch] })
    })
  })
  drawLayer(false)

  const aura = AURAS[cosmetics.aura ?? '']
  return (
    <svg
      viewBox="-2 -2 20 28"
      width={size * (20 / 28)}
      height={size}
      className={`pixelated ${className}`}
      style={aura ? { filter: `drop-shadow(0 0 3px ${aura}) drop-shadow(0 0 8px ${aura})` } : undefined}
      role="img"
      aria-label="Your hero"
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={1.02} height={1.02} fill={r.c} />
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
