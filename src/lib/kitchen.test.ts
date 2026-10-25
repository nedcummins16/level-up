import { describe, expect, it } from 'vitest'
import { FOOD } from '../config/game'
import { RECIPES, SMOOTHIE, type Recipe } from '../config/kitchen'
import { PROGRAM } from '../config/program'
import { defaultSettings } from '../db/db'
import type { DailyLog, MealPlan } from '../db/types'
import { addDays } from './dates'
import { computeGame } from './game'
import {
  customToRecipe,
  defaultPlanWeek,
  fmtAmount,
  glutenWarnings,
  nthPrepDate,
  PACKAGED,
  parseIngredientLine,
  preppedInWeek,
  proteinRunDate,
  roundUp,
  shoppingList,
  splitPortions,
} from './kitchen'
import { planWeek } from './schedule'

const byId = (id: string) => RECIPES.find((r) => r.id === id) as Recipe

describe('gluten free, always', () => {
  it('no built-in ingredient contains gluten', () => {
    for (const r of RECIPES) for (const i of r.ingredients) expect(glutenWarnings(`${i.name} ${i.note ?? ''}`), `${r.name}: ${i.name}`).toEqual([])
    for (const i of SMOOTHIE.ingredients) expect(glutenWarnings(i.name)).toEqual([])
    for (const f of FOOD.ideas) expect(glutenWarnings(`${f.name}: ${f.what}`), f.name).toEqual([])
    for (const t of FOOD.tips) expect(glutenWarnings(t), t).toEqual([])
  })

  it('every packaged ingredient has a "Check label: gluten free" tag', () => {
    for (const r of [...RECIPES, { name: 'Smoothie', ingredients: SMOOTHIE.ingredients }])
      for (const i of r.ingredients) if (PACKAGED.test(i.name)) expect(i.check, `${r.name}: ${i.name}`).toBe(true)
  })

  it('there are 10 lunches of roughly 750 kcal and 40-50 g protein, all 3-day fridge life', () => {
    expect(RECIPES).toHaveLength(10)
    for (const r of RECIPES) {
      expect(r.kcal).toBeGreaterThanOrEqual(700)
      expect(r.kcal).toBeLessThanOrEqual(800)
      expect(r.protein).toBeGreaterThanOrEqual(40)
      expect(r.protein).toBeLessThanOrEqual(50)
      expect(r.fridgeDays).toBe(3)
      expect(r.portions).toBe(5)
    }
    expect(byId('butterchicken').freezes).toBe(true)
    expect(byId('cottagepie').freezes).toBe(true)
    expect(byId('snackbox').freezes).toBe(false)
  })

  it('flags gluten in your own recipes, but not safe versions', () => {
    expect(glutenWarnings('2 tbsp soy sauce')).toHaveLength(1)
    expect(glutenWarnings('2 tbsp GF soy sauce')).toEqual([])
    expect(glutenWarnings('1 cup couscous')[0]).toMatch(/couscous/)
    expect(glutenWarnings('50 g rolled oats')[0]).toMatch(/oats/)
    expect(glutenWarnings('malt vinegar')[0]).toMatch(/malt/)
    expect(glutenWarnings('pearl barley')[0]).toMatch(/barley/)
    expect(glutenWarnings('200 g plain flour')).toHaveLength(1)
    for (const ok of ['rice flour', 'cornflour', 'buckwheat', 'rice noodles', 'gluten-free pasta', 'pasta sauce', 'tamari', 'maltodextrin'])
      expect(glutenWarnings(ok), ok).toEqual([])
  })
})

describe('shopping list', () => {
  it('splits 1 lunch into 5 portions and 2 lunches into 3 + 2', () => {
    expect(splitPortions(1)).toEqual([5])
    expect(splitPortions(2)).toEqual([3, 2])
  })

  it('lists one lunch for 5 portions, grouped by section, with label tags', () => {
    const list = shoppingList([{ recipe: byId('butterchicken'), portions: 5 }])
    expect(list.map((g) => g.name)).toEqual(['Meat & seafood', 'Pantry', 'Freezer', 'Check you have'])
    const sauce = list.find((g) => g.section === 'pantry')!.items.find((i) => /butter chicken/i.test(i.name))!
    expect(sauce).toMatchObject({ amount: 2, unit: 'jar', check: true })
    expect(list[0].items[0]).toMatchObject({ name: 'Chicken thigh fillets', amount: 1000, unit: 'g' })
  })

  it('scales 3 + 2 portions and adds up shared ingredients', () => {
    const list = shoppingList([
      { recipe: byId('burrito'), portions: 3 }, // 900 g chicken × 3/5 = 540
      { recipe: byId('butterchicken'), portions: 2 }, // 1000 g × 2/5 = 400
    ])
    const meat = list.find((g) => g.section === 'meat')!.items
    expect(meat).toHaveLength(1)
    expect(meat[0]).toMatchObject({ amount: 950, unit: 'g' }) // 940 → rounded up to 950
    expect(meat[0].from).toEqual(['Burrito bowl', 'Butter chicken'])
    const rice = list.find((g) => g.section === 'pantry')!.items.find((i) => i.name.startsWith('White rice'))!
    expect(rice.amount).toBe(350) // 180 + 140 = 320 → 350
    const jars = list.find((g) => g.section === 'pantry')!.items.find((i) => /butter chicken/i.test(i.name))!
    expect(jars.amount).toBe(1) // 0.8 jar → buy 1
  })

  it('rounds up to amounts you can buy and formats them', () => {
    expect(roundUp(540, 'g')).toBe(550)
    expect(roundUp(42, 'g')).toBe(50)
    expect(roundUp(0.4, 'tin')).toBe(1)
    expect(roundUp(1.2, 'tbsp')).toBe(1.5)
    expect(fmtAmount(1200, 'g')).toBe('1.2 kg')
    expect(fmtAmount(2, 'tin')).toBe('2 tins')
    expect(fmtAmount(15, '')).toBe('15 ×')
  })

  it('reads your own recipe lines', () => {
    expect(parseIngredientLine('500 g chicken thighs')).toMatchObject({ amount: 500, unit: 'g', name: 'Chicken thighs', check: false })
    expect(parseIngredientLine('1.5 kg potatoes')).toMatchObject({ amount: 1500, unit: 'g' })
    expect(parseIngredientLine('2 tins chickpeas')).toMatchObject({ amount: 2, unit: 'tin', name: 'Chickpeas' })
    expect(parseIngredientLine('1 jar GF pesto sauce')).toMatchObject({ unit: 'jar', check: true })
    expect(parseIngredientLine('salt to taste')).toMatchObject({ amount: null, name: 'salt to taste' })
    const r = customToRecipe({ id: 7, name: 'Chilli', kcal: 760, protein: 45, freezes: true, ingredients: ['900 g beef mince', ''], steps: ['Cook it'], createdAt: 0 })
    expect(r.id).toBe('custom:7')
    expect(shoppingList([{ recipe: r, portions: 3 }])[0].items[0]).toMatchObject({ amount: 550, unit: 'g' }) // 540 → 550
  })

  it('plans next week from Friday', () => {
    expect(defaultPlanWeek('2026-11-18')).toBe('2026-11-16') // Wed: this week
    expect(defaultPlanWeek('2026-11-20')).toBe('2026-11-23') // Fri: next week
    expect(defaultPlanWeek('2026-11-22')).toBe('2026-11-23') // Sun: next week
  })
})

describe('kitchen XP', () => {
  const plan = (prepDoneAt: string | null, weekStart = '2026-11-23'): MealPlan => ({ weekStart, lunches: ['burrito'], shopped: [], prep: [], prepDoneAt })
  const g = (opts: { plans?: MealPlan[]; daily?: DailyLog[]; today: string }) => {
    const settings = defaultSettings()
    const ps = { trainingDays: settings.trainingDays, tennisOff: [], christmasMove: null, repeats: [] }
    return computeGame({ settings, sessions: [], daily: opts.daily ?? [], checkins: [], tests: [], life: [], today: opts.today, mealPlans: opts.plans ?? [], planFor: (w) => planWeek(w, { today: opts.today, settings: ps, sessions: [], life: [] }) })
  }

  it('Meal Prep Sunday: 75 XP in the week you finish the prep checklist, from Week 1', () => {
    const plans = [plan('2026-11-22'), plan('2026-11-15', '2026-11-16')] // Sun of Week 1, and Sun 15 Nov (exam season)
    expect(preppedInWeek(plans, '2026-11-16')).toBe(true)
    expect(preppedInWeek(plans, '2026-11-09')).toBe(false) // exam season doesn't count
    const game = g({ plans, today: '2026-11-23' })
    const prep = game.ledger.filter((e) => e.reason === 'Weekly: Meal Prep Sunday')
    expect(prep).toEqual([expect.objectContaining({ amount: 75, date: '2026-11-22' })])
  })

  it('Prepped lunch eaten: 15 XP a day from Week 1', () => {
    const daily = [
      { date: '2026-11-13', mobility: [], mobilityDone: false, lunch: true },
      { date: PROGRAM.start, mobility: [], mobilityDone: false, lunch: true },
    ]
    const lunchXP = g({ daily, today: '2026-11-17' }).ledger.filter((e) => e.reason === 'Prepped lunch eaten')
    expect(lunchXP).toEqual([expect.objectContaining({ amount: 15, date: PROGRAM.start })])
  })

  it('Chef after 4 prep weeks, Head Chef after 10', () => {
    const plans = Array.from({ length: 10 }, (_, i) => plan(addDays('2026-11-22', 7 * i), addDays('2026-11-23', 7 * i)))
    expect(nthPrepDate(plans.slice(0, 3), 4)).toBeUndefined()
    expect(nthPrepDate(plans, 4)).toBe('2026-12-13')
    expect(nthPrepDate(plans, 10)).toBe('2027-01-24')
    // Two preps in the same week only count once.
    expect(nthPrepDate([...plans.slice(0, 3), plan('2026-12-05')], 4)).toBeUndefined()
    const game = g({ plans: plans.slice(0, 4), today: '2026-12-14' })
    expect(game.achievements.find((a) => a.id === 'chef')).toMatchObject({ unlocked: true, date: '2026-12-13' })
    expect(game.achievements.find((a) => a.id === 'headChef')!.unlocked).toBe(false)
  })

  it('Fuelled: protein quest 7 days in a row', () => {
    const days = (from: string, n: number, skip?: number) =>
      Array.from({ length: n }, (_, i) => ({ date: addDays(from, i), mobility: [], mobilityDone: false, protein: i !== skip }))
    expect(proteinRunDate(days(PROGRAM.start, 7))).toBe('2026-11-22')
    expect(proteinRunDate(days(PROGRAM.start, 8, 3))).toBeUndefined() // missed day 4
    expect(proteinRunDate(days('2026-11-10', 7))).toBeUndefined() // only counts from Week 1
    expect(g({ daily: days(PROGRAM.start, 7), today: '2026-11-22' }).achievements.find((a) => a.id === 'fuelled')!.unlocked).toBe(true)
  })
})
