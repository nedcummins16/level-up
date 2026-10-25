// Procedural pixel hero. The body is drawn from your real build:
//   bulk 0-4 (from your 7-day average weight) → wider torso, thicker legs
//   str  0-4 (from your STR stat)             → broader shoulders, bigger arms
// Gear is applied by meaning (head band row, shirt, shoes...) so it fits every build.

export interface Build {
  bulk: number
  str: number
}

export const W = 28
export const H = 27
const CX = 14 // body is symmetric around the line between columns 13 and 14

const C = {
  outline: '#120c24',
  hair: '#3b2416',
  skin: '#e0ac69',
  shorts: '#2a2459',
  shoes: '#f4f1ff',
  shirt: '#cfd3e6',
  number: '#4b3fa0',
}

type Grid = (string | null)[][]

export const JERSEYS: Record<string, { shirt: string; number: string; sleeves?: boolean; trim?: string }> = {
  default: { shirt: C.shirt, number: C.number },
  'jersey-blue': { shirt: '#2f6bff', number: '#ffffff' },
  'jersey-red': { shirt: '#e8263c', number: '#ffffff' },
  'jersey-black': { shirt: '#202020', number: '#ffd23f' },
  'jacket-champ': { shirt: '#5b2a86', number: '#ffd23f', sleeves: true, trim: '#ffd23f' },
  'jersey-court': { shirt: '#ff7a1a', number: '#ffffff' },
}

const HEADBANDS: Record<string, string[]> = {
  'headband-red': ['#ff3b3b'],
  'headband-gold': ['#ffd23f'],
  'headband-inferno': ['#ff3b1f', '#ffb03b'],
}
const WRISTBANDS: Record<string, string> = { wristbands: '#ff4fd8', 'wristbands-streak': '#ff6a2b' }
const SHOES: Record<string, { color: string; tip?: string; high?: boolean }> = {
  hightops: { color: '#ffffff', high: true },
  'gold-shoes': { color: '#ffd23f' },
  'flame-shoes': { color: '#ff6a2b', tip: '#ffd23f', high: true },
}
const AURAS: Record<string, string> = { 'aura-blue': '#34e0ff', 'aura-gold': '#ffd23f', 'aura-iron': '#ff3b3b', 'aura-legend': '#b46bff' }

const clampTier = (n: number) => Math.max(0, Math.min(4, Math.round(n)))

export function bodyDims(build: Build) {
  const b = clampTier(build.bulk)
  const s = clampTier(build.str)
  return {
    torsoHalf: 3 + (b >= 2 ? 1 : 0) + (b >= 4 ? 1 : 0),
    shoulder: (s >= 2 ? 1 : 0) + (s >= 4 ? 1 : 0),
    armW: 2 + (s >= 3 ? 1 : 0),
    bicep: s >= 1 ? 1 : 0,
    legW: 2 + (b >= 3 || s >= 4 ? 1 : 0),
    neckHalf: 1 + (s >= 3 ? 1 : 0),
  }
}

export function buildSprite(build: Build, cosmetics: Record<string, string> = {}) {
  const g: Grid = Array.from({ length: H }, () => Array<string | null>(W).fill(null))
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c
  }
  /** Fill a symmetric span of `half` cells each side of the centre line. */
  const span = (y: number, half: number, c: string) => {
    for (let x = CX - half; x < CX + half; x++) set(x, y, c)
  }
  const mirror = (x: number, y: number, c: string) => {
    set(x, y, c)
    set(2 * CX - 1 - x, y, c)
  }

  const d = bodyDims(build)
  const jersey = JERSEYS[cosmetics.shirt ?? 'default'] ?? JERSEYS.default
  const capeColor = cosmetics.back === 'cape' ? '#c81d4e' : null

  // ---- Cape (behind the body)
  if (capeColor) {
    const edge = d.torsoHalf + 1 + d.armW + d.bicep + 1
    for (let y = 10; y <= 20; y++) {
      const spread = y < 12 ? edge - 1 : edge + (y > 17 ? 1 : 0)
      mirror(CX - spread, y, capeColor)
    }
  }

  // ---- Head
  span(1, 3, C.hair)
  span(2, 4, C.hair)
  span(3, 4, C.hair)
  span(4, 4, C.skin)
  mirror(CX - 4, 4, C.hair)
  span(5, 4, C.skin)
  span(6, 4, C.skin)
  span(7, 3, C.skin)
  span(8, 2, C.skin)
  mirror(CX - 3, 5, C.outline) // eyes
  set(CX - 1, 7, C.outline) // mouth
  set(CX, 7, C.outline)
  span(9, d.neckHalf, C.skin)

  // ---- Torso + arms
  const armOuter = (y: number) => d.torsoHalf + 1 + d.armW + (y === 12 || y === 13 ? d.bicep : 0) + (y <= 11 ? d.shoulder : 0)
  for (let y = 10; y <= 16; y++) {
    const half = d.torsoHalf + (y <= 11 ? d.shoulder : 0)
    span(y, half, jersey.shirt)
    // arms: skin (or sleeves) with a 1-pixel gap from the torso below the shoulder
    const inner = y <= 10 ? half : d.torsoHalf + 1
    for (let k = inner; k < armOuter(y); k++) {
      const sleeve = y <= 10 || (jersey.sleeves && y <= 15)
      mirror(CX - 1 - k, y, sleeve ? jersey.shirt : C.skin)
    }
  }
  // hands
  for (let k = d.torsoHalf + 1; k < d.torsoHalf + 1 + d.armW; k++) mirror(CX - 1 - k, 17, C.skin)
  // jersey number / jacket zip
  if (jersey.trim) {
    for (let y = 10; y <= 16; y++) set(CX - 1, y, jersey.trim)
    for (let k = d.torsoHalf + 1; k < d.torsoHalf + 1 + d.armW; k++) mirror(CX - 1 - k, 15, jersey.trim)
  } else {
    for (const y of [11, 12]) {
      set(CX - 1, y, jersey.number)
      set(CX, y, jersey.number)
    }
  }

  // ---- Shorts + legs + shoes
  span(17, d.torsoHalf, C.shorts)
  span(18, d.torsoHalf, C.shorts)
  for (let k = 1; k <= d.legW; k++) mirror(CX - 1 - k, 19, C.shorts)
  for (let y = 20; y <= 23; y++) for (let k = 1; k <= d.legW; k++) mirror(CX - 1 - k, y, C.skin)
  const shoe = SHOES[cosmetics.shoes ?? ''] ?? null
  for (let y = 24; y <= 25; y++) for (let k = 1; k <= d.legW + 1; k++) mirror(CX - 1 - k, y, shoe?.color ?? C.shoes)
  if (shoe?.high) for (let k = 1; k <= d.legW; k++) mirror(CX - 1 - k, 23, shoe.color)
  if (shoe?.tip) mirror(CX - 2 - d.legW, 25, shoe.tip)

  // ---- Head gear
  const head = cosmetics.head
  if (head && HEADBANDS[head]) {
    const cols = HEADBANDS[head]
    for (let x = CX - 4; x < CX + 4; x++) set(x, 4, cols[(x - (CX - 4)) % cols.length])
  }
  if (head === 'cap') {
    span(1, 3, '#34e0ff')
    span(2, 4, '#34e0ff')
    span(3, 5, '#34e0ff')
    set(CX - 6, 3, '#1a7a99')
    set(CX - 7, 3, '#1a7a99')
  }
  if (head === 'crown') {
    span(1, 3, '#ffd23f')
    for (const x of [CX - 3, CX - 1, CX, CX + 2]) set(x, 0, '#ffd23f')
  }

  // ---- Backpack: straps on the chest, pack showing between torso and arms
  if (cosmetics.back === 'backpack') {
    for (let y = 11; y <= 15; y++) mirror(CX - 1 - d.torsoHalf, y, '#6b4a2b')
    for (let y = 10; y <= 13; y++) mirror(CX - 3, y, '#4a3220')
  }

  // ---- Wristbands
  const wb = WRISTBANDS[cosmetics.arms ?? '']
  if (wb) for (let k = d.torsoHalf + 1; k < d.torsoHalf + 1 + d.armW; k++) mirror(CX - 1 - k, 16, wb)

  // ---- Basketball in the right hand
  if (cosmetics.hand === 'basketball') {
    const x0 = CX + d.torsoHalf + 1 + d.armW
    for (const [dx, dy] of [[0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2]])
      set(x0 + dx, 16 + dy, '#ff8a1f')
    set(x0, 16, '#5a2a00')
    set(x0 + 1, 17, '#5a2a00')
  }

  // ---- Outline: every empty cell touching the hero becomes outline
  const filled = g.map((row) => row.map((c) => c !== null))
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (filled[y][x]) continue
      const near = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([a, b]) => a >= 0 && a < W && b >= 0 && b < H && filled[b][a])
      if (near) g[y][x] = C.outline
    }

  return { grid: g, aura: AURAS[cosmetics.aura ?? ''] as string | undefined }
}

/** Horizontal runs of the same colour, for compact SVG/canvas drawing. */
export function spriteRuns(build: Build, cosmetics: Record<string, string> = {}) {
  const { grid, aura } = buildSprite(build, cosmetics)
  const runs: { x: number; y: number; w: number; c: string }[] = []
  grid.forEach((row, y) => {
    let x = 0
    while (x < W) {
      const c = row[x]
      if (!c) {
        x++
        continue
      }
      let x2 = x
      while (x2 + 1 < W && row[x2 + 1] === c) x2++
      runs.push({ x, y, w: x2 - x + 1, c })
      x = x2 + 1
    }
  })
  return { runs, aura }
}
