import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { buildBackup, restoreBackup } from './backup'

describe('backup', () => {
  it('includes the Kitchen (meal plans + your recipes) and restores it', async () => {
    await db.mealPlans.put({ weekStart: '2026-11-16', lunches: ['burrito', 'butterchicken'], shopped: ['meat|chicken thigh fillets|g'], prep: ['carbs'], prepDoneAt: null })
    await db.recipes.put({ name: 'Beef chilli', kcal: 760, protein: 45, freezes: true, ingredients: ['900 g beef mince'], steps: ['Cook'], createdAt: 1 })
    await db.measurements.put({ date: '2026-11-16', armL: 31.5, armR: 32, chest: 92.5, waist: 74 })
    const backup = JSON.parse(JSON.stringify(await buildBackup()))
    expect(backup.tables.mealPlans).toHaveLength(1)
    expect(backup.tables.recipes[0].name).toBe('Beef chilli')

    await db.mealPlans.clear()
    await db.recipes.clear()
    await db.measurements.clear()
    await restoreBackup(backup)
    expect((await db.mealPlans.get('2026-11-16'))?.lunches).toEqual(['burrito', 'butterchicken'])
    expect(await db.recipes.count()).toBe(1)
    expect((await db.measurements.toArray())[0]).toMatchObject({ armL: 31.5, armR: 32, chest: 92.5 })
  })

  it('still restores an older backup that has no Kitchen tables', async () => {
    const old = { app: 'level-up' as const, version: 1, exportedAt: '', schema: 2, tables: { settings: [], sessions: [], daily: [{ date: '2026-11-01', mobility: [], mobilityDone: true }] } }
    await restoreBackup(old)
    expect(await db.daily.count()).toBe(1)
    expect(await db.mealPlans.count()).toBe(0)
  })
})
