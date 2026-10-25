// Draws a weekly results card (PNG) to text to a mate. Accountability, free.

import { heroRects } from '../components/Character'
import type { Build } from './sprite'
import { fmtShort, addDays, type ISODate } from './dates'
import type { WeekResult } from './game'
import { prText } from './records'

export interface CardInput {
  week: WeekResult
  heroName: string
  title: string
  level: number
  cosmetics: Record<string, string>
  build?: Build
  headline: string
}

const W = 1080
const H = 1350

function css(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export async function drawWeekCard(input: CardInput): Promise<Blob> {
  await Promise.all([document.fonts.load('700 40px "Chakra Petch"'), document.fonts.load('400 40px "Chakra Petch"')]).catch(() => {})
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.imageSmoothingEnabled = false
  const bg = css('--bg', '#0d0b1e')
  const panel = css('--panel', '#1d1940')
  const ink = css('--ink', '#f4f1ff')
  const muted = css('--muted', '#a49cd6')
  const accent = css('--accent', '#7cff4f')
  const accent2 = css('--accent-2', '#ff4fd8')
  const xp = css('--xp', '#ffd23f')
  const flame = css('--flame', '#ff8a1f')
  const pixel = (px: number) => `700 ${Math.round(px * 1.35)}px "Chakra Petch", system-ui, sans-serif`
  const body = (px: number) => `400 ${px}px "Chakra Petch", system-ui, sans-serif`
  const { week: w } = input

  // Background + notched pixel panel
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  // Angled-corner HUD panel
  const cut = 40
  g.fillStyle = panel
  g.beginPath()
  g.moveTo(40, 40)
  g.lineTo(W - 40 - cut, 40)
  g.lineTo(W - 40, 40 + cut)
  g.lineTo(W - 40, H - 40)
  g.lineTo(40 + cut, H - 40)
  g.lineTo(40, H - 40 - cut)
  g.closePath()
  g.fill()
  g.fillStyle = accent
  g.fillRect(40, 40, 10, H - 80 - cut)

  g.textBaseline = 'top'
  g.fillStyle = accent
  g.font = pixel(44)
  g.fillText('LEVEL UP', 96, 96)
  g.fillStyle = muted
  g.font = body(34)
  g.fillText(`Week ${w.week} · ${fmtShort(w.weekStart)}–${fmtShort(addDays(w.weekStart as ISODate, 6))}`, 96, 166)

  // Hero sprite
  const { runs, aura } = heroRects(input.cosmetics, input.build)
  const scale = 14
  const hx = 70
  const hy = 240
  if (aura) {
    g.shadowColor = aura
    g.shadowBlur = 40
  }
  for (const r of runs) {
    g.fillStyle = r.c
    g.fillRect(hx + r.x * scale, hy + r.y * scale, r.w * scale + 0.5, scale + 0.5)
  }
  g.shadowBlur = 0

  // Name, title, level
  const rx = 440
  g.fillStyle = ink
  g.font = pixel(30)
  g.fillText(input.heroName.toUpperCase().slice(0, 14), rx, 280)
  g.fillStyle = accent
  g.font = pixel(24)
  g.fillText(input.title.toUpperCase(), rx, 336)
  g.fillStyle = muted
  g.font = pixel(28)
  g.fillText('LV', rx, 430)
  g.fillStyle = xp
  g.font = pixel(96)
  g.fillText(String(input.level), rx + 90, 392)

  // Headline
  g.fillStyle = w.complete ? xp : accent2
  g.font = pixel(input.headline.length > 14 ? 36 : 46)
  const hw = g.measureText(input.headline).width
  g.fillText(input.headline, (W - hw) / 2, 720)

  // Stat boxes
  const boxes: [string, string, string][] = [
    ['XP', `+${w.xp}`, xp],
    ['SESSIONS', `${w.done}/${w.planned}`, ink],
    ['STREAK', `${w.streakAfter}`, flame],
    ['PRs', `${w.prs.length}`, accent],
  ]
  const bw = (W - 96 * 2 - 3 * 24) / 4
  boxes.forEach(([label, val, col], i) => {
    const x = 96 + i * (bw + 24)
    const y = 820
    g.fillStyle = bg
    g.fillRect(x, y, bw, 170)
    g.fillStyle = muted
    g.font = pixel(18)
    g.fillText(label, x + 18, y + 22)
    g.fillStyle = col
    g.font = pixel(val.length > 4 ? 34 : 44)
    g.fillText(val, x + 18, y + 80)
  })

  // PRs
  g.font = body(36)
  let y = 1040
  for (const p of w.prs.slice(0, 3)) {
    g.fillStyle = ink
    g.fillText(`🏆 ${p.name}: ${prText(p)}`, 96, y)
    y += 52
  }
  if (!w.prs.length) {
    g.fillStyle = muted
    g.fillText(w.complete ? 'Showed up. Did the work. 💪' : 'Still here. Still going. 💪', 96, y)
  }

  g.fillStyle = muted
  g.font = body(28)
  g.fillText('12-week quest · Level Up', 96, H - 120)

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not draw card'))), 'image/png'))
}

export async function shareWeekCard(input: CardInput): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await drawWeekCard(input)
  const file = new File([blob], `level-up-week-${input.week.week}.png`, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: `Week ${input.week.week} of my 12-week quest: ${input.headline}` })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
  return 'downloaded'
}
