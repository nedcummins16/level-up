// Pixel body map (front + back) that lights up the muscles an exercise should hit.
// Coordinates are on a 24 x 48 grid per view.

import type { MuscleId } from '../config/types'

export type { MuscleId }

type Rect = [x: number, y: number, w: number, h: number]
interface Region {
  name: string
  front?: Rect[]
  back?: Rect[]
  joint?: boolean
}

/** Mirror a left-side rect onto the right side (figure is centred on x = 12). */
const both = (x: number, y: number, w: number, h: number): Rect[] => [
  [x, y, w, h],
  [24 - x - w, y, w, h],
]

export const MUSCLES: Record<MuscleId, Region> = {
  chest: { name: 'Chest', front: both(7.5, 9, 4.3, 4) },
  frontDelts: { name: 'Front shoulders', front: both(5.5, 8.5, 2, 3) },
  sideDelts: { name: 'Side shoulders', front: both(4.5, 9, 1, 3), back: both(4.5, 9, 1, 3) },
  rearDelts: { name: 'Rear shoulders', back: both(5.5, 8.5, 2, 3) },
  traps: { name: 'Traps', back: [[8, 7, 8, 2.5], ...both(9.5, 9.5, 2.3, 1)], front: both(8, 7.2, 2.2, 1.3) },
  upperBack: { name: 'Upper back', back: both(9.3, 10.5, 2.5, 4) },
  lats: { name: 'Lats', back: both(7, 11, 2.3, 7) },
  lowerBack: { name: 'Lower back', back: both(9.5, 15.5, 2.3, 5) },
  biceps: { name: 'Biceps', front: both(4.5, 12, 2.5, 5) },
  triceps: { name: 'Triceps', back: both(4.5, 12, 2.5, 5) },
  forearms: { name: 'Forearms', front: both(3.8, 18, 2.4, 5.5), back: both(3.8, 18, 2.4, 5.5) },
  abs: { name: 'Abs', front: both(9.6, 13.5, 2.2, 7.5) },
  obliques: { name: 'Obliques', front: both(7.8, 13.5, 1.7, 7) },
  hipFlexors: { name: 'Hip flexors', front: both(8.3, 21.2, 2.6, 2.3) },
  quads: { name: 'Quads', front: both(7.6, 23.6, 3, 9.4) },
  adductors: { name: 'Inner thighs', front: both(10.7, 23.6, 1.1, 7.4) },
  glutes: { name: 'Glutes', back: both(8, 21, 3.8, 4.8) },
  hamstrings: { name: 'Hamstrings', back: both(8, 26, 3.8, 7) },
  calves: { name: 'Calves', back: both(8.4, 35, 3, 6.5) },
  shins: { name: 'Shins', front: both(8.6, 35.2, 2.4, 8) },
  neck: { name: 'Neck', front: [[10.5, 5.6, 3, 1.6]], back: [[10.5, 5.6, 3, 1.4]], joint: true },
  knees: { name: 'Knees', front: both(8, 33.2, 3.6, 1.8), back: both(8, 33.2, 3.6, 1.8), joint: true },
  wrists: { name: 'Wrists', front: both(3.6, 23.6, 2.6, 1.2), back: both(3.6, 23.6, 2.6, 1.2), joint: true },
  elbows: { name: 'Elbows', front: both(4, 17, 2.6, 1), back: both(4, 17, 2.6, 1), joint: true },
  shoulderJoint: { name: 'Front of shoulder', front: both(6.6, 8.2, 1.4, 1.6), joint: true },
}

// Silhouette pieces not covered by muscles (head, hands, feet, gaps).
const SILHOUETTE: Rect[] = [
  [9.5, 0.5, 5, 5.2], // head
  [10.5, 5.5, 3, 2], // neck
  [7.5, 7.5, 9, 14], // torso core
  [8, 21, 8, 3], // pelvis
  ...both(4.4, 8.6, 3.2, 15.2), // arms
  ...both(3.7, 24.6, 2.6, 2), // hands
  ...both(7.6, 23.5, 4.2, 20), // legs
  ...both(7.8, 43.4, 3.8, 1.6), // feet
]

export interface MapProps {
  primary: MuscleId[]
  secondary?: MuscleId[]
  warn?: MuscleId | null
  size?: number
}

function View({ side, primary, secondary = [], warn, height }: MapProps & { side: 'front' | 'back'; height: number }) {
  const order: [MuscleId, string, number][] = []
  for (const id of Object.keys(MUSCLES) as MuscleId[]) {
    if (MUSCLES[id].joint) continue
    order.push([id, 'var(--panel-2)', 1])
  }
  for (const id of secondary) order.push([id, 'var(--xp)', 0.75])
  for (const id of primary) order.push([id, 'var(--accent)', 1])
  if (warn) order.push([warn, 'var(--danger)', 1])
  return (
    <svg viewBox="2 -0.5 20 46" width={(height * 20) / 46} height={height} className="pixelated block" role="img" aria-label={`${side} view`} shapeRendering="crispEdges">
      {SILHOUETTE.map(([x, y, w, h], i) => (
        <rect key={`s${i}`} x={x} y={y} width={w} height={h} fill="var(--bg-2)" stroke="var(--edge)" strokeWidth={0.25} />
      ))}
      {order.flatMap(([id, fill, op]) =>
        (MUSCLES[id][side] ?? []).map(([x, y, w, h], i) => (
          <rect
            key={`${id}${fill}${i}`}
            x={x}
            y={y}
            width={w}
            height={h}
            fill={fill}
            opacity={op}
            stroke="var(--bg)"
            strokeWidth={0.22}
            className={fill === 'var(--danger)' ? 'anim-blink' : undefined}
          />
        )),
      )}
    </svg>
  )
}

export function MuscleMap({ primary, secondary = [], warn = null, size = 190 }: MapProps) {
  const labels = size >= 100
  const h = labels ? size - 16 : size
  return (
    <div className={`flex justify-center ${labels ? 'gap-4' : 'gap-0.5'}`}>
      {(['front', 'back'] as const).map((side) => (
        <div key={side} className="flex flex-col items-center">
          <View side={side} primary={primary} secondary={secondary} warn={warn} height={h} />
          {labels && <span className="font-pixel text-[8px] text-muted mt-1">{side.toUpperCase()}</span>}
        </div>
      ))}
    </div>
  )
}
