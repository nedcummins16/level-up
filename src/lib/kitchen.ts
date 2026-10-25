// Kitchen logic: scaling recipes, the weekly shopping list, gluten checks for your
// own recipes, and the meal-prep / protein streaks used by the game.

import { KITCHEN, RECIPES, SECTIONS, type Ingredient, type Recipe, type ShopSection } from '../config/kitchen'
import { PROGRAM } from '../config/program'
import type { CustomRecipe, DailyLog, MealPlan } from '../db/types'
import { addDays, mondayOf, type ISODate } from './dates'

// ---------------------------------------------------------------------------
//  Gluten checks
// ---------------------------------------------------------------------------

const GF_MARK = /\b(gf|gluten[- ]free)\b/i

/**
 * Words that mean gluten. `gfOk`: fine when the line says "gluten free" / "GF".
 * `safe`: fine in these forms (e.g. rice flour, rice noodles, buckwheat).
 */
const GLUTEN_RULES: { re: RegExp; why: string; gfOk?: boolean; safe?: RegExp }[] = [
  { re: /\bwheat(en)?\b/i, why: 'wheat' },
  { re: /\bbarley\b/i, why: 'barley' },
  { re: /\brye\b/i, why: 'rye' },
  { re: /\bspelt\b/i, why: 'spelt (a type of wheat)' },
  { re: /\bsemolina\b/i, why: 'semolina (wheat)' },
  { re: /\bcouscous\b/i, why: 'couscous (wheat)' },
  { re: /\bmalt(ed)?\b/i, why: 'malt (barley)' },
  { re: /\boats?\b|\boatmeal\b|\bporridge\b/i, why: "oats (can't be labelled gluten free in Australia)" },
  { re: /\bsoy sauce\b/i, why: 'soy sauce (use tamari or GF-labelled)', gfOk: true },
  { re: /\bworcestershire\b/i, why: 'Worcestershire sauce (usually malt vinegar)' },
  { re: /\bflour\b/i, why: 'flour (wheat, unless it says rice, maize, potato or GF)', gfOk: true, safe: /\b(rice|maize|corn|potato|tapioca|chickpea|buckwheat)\s+flour\b/i },
  { re: /\bbread(crumbs)?\b|\btoast(ie|ies)?\b/i, why: 'bread (use GF-labelled bread)', gfOk: true },
  { re: /\bpasta\b|\bspaghetti\b|\bnoodles?\b/i, why: 'pasta / noodles (use GF-labelled, or rice noodles)', gfOk: true, safe: /\brice (noodles?|vermicelli)\b|\bpasta sauce\b/i },
  { re: /\bwraps?\b|\btortillas?\b/i, why: 'wraps (use GF-labelled)', gfOk: true },
  { re: /\bbeer\b/i, why: 'beer' },
]

/** Why a line might contain gluten (empty = looks fine). */
export function glutenWarnings(line: string): string[] {
  const gf = GF_MARK.test(line)
  return GLUTEN_RULES.filter((r) => r.re.test(line) && !(r.gfOk && gf) && !(r.safe && r.safe.test(line))).map((r) => r.why)
}

/** Packaged things that need a "Check label: gluten free" tag. */
export const PACKAGED = /sauce|stock|paste|salsa|tzatziki|mayo|\bham\b|pasta|cracker|whey|protein powder|tamari|cornflour|seasoning|spice mix|gravy|flakes|tuna|passata|nuts|bread|wrap|sausage|marinade/i

// ---------------------------------------------------------------------------
//  Recipes (built-in + yours)
// ---------------------------------------------------------------------------

/** "500 g chicken thighs" → amount 500, unit g, name "chicken thighs". */
export function parseIngredientLine(line: string): Ingredient {
  const t = line.trim()
  const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|tbsp|tsp|tins?|jars?|packs?|cans?|cloves?|bunch(?:es)?)?\b\s*(?:x\s+|of\s+)?(.*)$/i)
  if (!m || !m[3]) return { name: t, amount: null, unit: '', section: 'other', check: PACKAGED.test(t) }
  let amount = Number(m[1].replace(',', '.'))
  let unit = (m[2] ?? '').toLowerCase()
  if (unit === 'kg') [amount, unit] = [amount * 1000, 'g']
  if (unit === 'l') [amount, unit] = [amount * 1000, 'ml']
  unit = unit.replace(/^cans?$/, 'tin').replace(/s$/, '').replace(/^bunche$/, 'bunch')
  const name = m[3].trim()
  return { name: name.charAt(0).toUpperCase() + name.slice(1), amount, unit, section: 'other', check: PACKAGED.test(name) }
}

export function customToRecipe(c: CustomRecipe): Recipe {
  return {
    id: `custom:${c.id}`,
    name: c.name,
    emoji: '⭐',
    kcal: c.kcal ?? 0,
    protein: c.protein ?? 0,
    portions: 5,
    fridgeDays: 3,
    freezes: c.freezes,
    serve: 'microwave',
    ingredients: c.ingredients.filter((l) => l.trim()).map(parseIngredientLine),
    steps: c.steps.filter((l) => l.trim()),
  }
}

export function allRecipes(custom: CustomRecipe[] = []): Recipe[] {
  return [...RECIPES, ...custom.map(customToRecipe)]
}

/** Favourites first, then the library order. */
export function sortRecipes(recipes: Recipe[], favs: string[]): Recipe[] {
  return [...recipes].sort((a, b) => Number(favs.includes(b.id)) - Number(favs.includes(a.id)))
}

/** Portions for each picked lunch: 1 lunch = 5, 2 lunches = 3 + 2. */
export function splitPortions(n: number): number[] {
  return KITCHEN.split[n] ?? []
}

// ---------------------------------------------------------------------------
//  Shopping list
// ---------------------------------------------------------------------------

const COUNTS = new Set(['', 'tin', 'jar', 'pack', 'bunch', 'clove', 'scoop'])

/** Round a scaled amount up to something you can actually buy. */
export function roundUp(amount: number, unit: string): number {
  const up = (x: number, step: number) => Math.ceil(x / step - 1e-9) * step
  if (unit === 'g' || unit === 'ml') return up(amount, amount >= 100 ? 50 : 10)
  if (unit === 'tbsp' || unit === 'tsp') return up(amount, 0.5)
  if (COUNTS.has(unit)) return up(amount, 1)
  return Math.round(amount * 10) / 10
}

export interface ShopItem {
  key: string
  name: string
  amount: number | null
  unit: string
  check: boolean
  notes: string[]
  from: string[]
}

export interface ShopGroup {
  section: ShopSection | 'staples'
  name: string
  emoji: string
  items: ShopItem[]
}

/** The week's shopping list, grouped by supermarket section. */
export function shoppingList(picks: { recipe: Recipe; portions: number }[]): ShopGroup[] {
  const items = new Map<string, ShopItem & { section: ShopSection; staple: boolean }>()
  for (const { recipe, portions } of picks) {
    for (const ing of recipe.ingredients) {
      const staple = !!ing.staple
      const key = `${staple ? 'staple' : ing.section}|${ing.name.toLowerCase()}|${staple ? '' : ing.unit}`
      const cur = items.get(key) ?? { key, name: ing.name, amount: ing.amount === null || staple ? null : 0, unit: ing.unit, check: !!ing.check, notes: [], from: [], section: ing.section, staple }
      if (cur.amount !== null && ing.amount !== null && !staple) cur.amount += (ing.amount * portions) / recipe.portions
      else if (ing.amount === null) cur.amount = null
      if (ing.note && !cur.notes.includes(ing.note)) cur.notes.push(ing.note)
      if (!cur.from.includes(recipe.name)) cur.from.push(recipe.name)
      cur.check ||= !!ing.check
      items.set(key, cur)
    }
  }
  const groups: ShopGroup[] = SECTIONS.map((s) => ({
    section: s.id,
    name: s.name,
    emoji: s.emoji,
    items: [...items.values()].filter((i) => !i.staple && i.section === s.id).map(strip),
  }))
  groups.push({ section: 'staples', name: 'Check you have', emoji: '🧂', items: [...items.values()].filter((i) => i.staple).map(strip) })
  return groups.filter((g) => g.items.length)

  function strip(i: ShopItem & { section: ShopSection; staple: boolean }): ShopItem {
    return { key: i.key, name: i.name, amount: i.amount === null ? null : roundUp(i.amount, i.unit), unit: i.unit, check: i.check, notes: i.notes, from: i.from }
  }
}

const PLURAL: Record<string, string> = { tin: 'tins', jar: 'jars', pack: 'packs', bunch: 'bunches', clove: 'cloves', scoop: 'scoops' }

/** "450 g", "1.2 kg", "2 tins", "3 ×" */
export function fmtAmount(amount: number | null, unit: string): string {
  if (amount === null) return ''
  if (unit === 'g' && amount >= 1000) return `${Math.round(amount / 10) / 100} kg`
  if (unit === 'ml' && amount >= 1000) return `${Math.round(amount / 10) / 100} L`
  if (unit === 'g' || unit === 'ml' || unit === 'tbsp' || unit === 'tsp') return `${amount} ${unit}`
  if (unit === '') return `${amount} ×`
  return `${amount} ${amount === 1 ? unit : (PLURAL[unit] ?? unit)}`
}

// ---------------------------------------------------------------------------
//  Planner week + game hooks
// ---------------------------------------------------------------------------

/** Plan this week Mon-Thu, next week from Friday (shop on the weekend, prep Sunday). */
export function defaultPlanWeek(today: ISODate): ISODate {
  const mon = mondayOf(today)
  return today >= addDays(mon, 4) ? addDays(mon, 7) : mon
}

export function prepComplete(plan: Pick<MealPlan, 'prep'>, steps: { id: string }[]): boolean {
  return steps.every((s) => plan.prep.includes(s.id))
}

/** Weeks (Mondays) in which you finished a prep checklist, from Week 1 on. */
export function prepWeeks(plans: MealPlan[], from: ISODate = PROGRAM.start): ISODate[] {
  return [...new Set(plans.filter((p) => p.prepDoneAt && p.prepDoneAt >= from).map((p) => mondayOf(p.prepDoneAt!)))].sort()
}

/** "Meal Prep Sunday" for a week: a prep checklist finished during that week. */
export function preppedInWeek(plans: MealPlan[], weekStart: ISODate): boolean {
  const end = addDays(weekStart, 6)
  return plans.some((p) => !!p.prepDoneAt && p.prepDoneAt >= weekStart && p.prepDoneAt <= end && p.prepDoneAt >= PROGRAM.start)
}

/** Date of the n-th prep week (undefined = not yet). */
export function nthPrepDate(plans: MealPlan[], n: number): ISODate | undefined {
  const dates = [...plans.filter((p) => p.prepDoneAt && p.prepDoneAt >= PROGRAM.start).map((p) => p.prepDoneAt!)].sort()
  const seen = new Set<ISODate>()
  for (const d of dates) {
    seen.add(mondayOf(d))
    if (seen.size === n) return d
  }
  return undefined
}

/** The day you first hit the protein quest `n` days in a row (from Week 1). */
export function proteinRunDate(daily: DailyLog[], n = 7, from: ISODate = PROGRAM.start): ISODate | undefined {
  const yes = new Set(daily.filter((d) => d.protein === true && d.date >= from).map((d) => d.date))
  for (const d of [...yes].sort()) {
    let run = 1
    while (run < n && yes.has(addDays(d, -run))) run++
    if (run >= n) return d
  }
  return undefined
}
