import { describe, expect, it } from 'vitest'
import { MUSCLES } from '../components/MuscleMap'
import { FEEL } from './feel'
import { EXERCISES, SESSIONS } from './program'

describe('Feel it here cards', () => {
  it('every exercise in the library has a card', () => {
    const missing = Object.keys(EXERCISES).filter((id) => !FEEL[id])
    expect(missing).toEqual([])
  })

  it('every card is complete and points at real places on the body map', () => {
    for (const [id, c] of Object.entries(FEEL)) {
      expect(EXERCISES[id], `${id} is not an exercise`).toBeDefined()
      expect(c.primary.length, id).toBeGreaterThan(0)
      expect(c.feel.length, id).toBeGreaterThan(10)
      expect(c.wrong.length, id).toBeGreaterThan(0)
      for (const m of [...c.primary, ...(c.secondary ?? []), ...c.wrong.map((w) => w.at)]) {
        const r = MUSCLES[m]
        expect((r.front?.length ?? 0) + (r.back?.length ?? 0), `${id} → ${m}`).toBeGreaterThan(0)
      }
    }
  })

  it('the plan includes the new core work', () => {
    expect(SESSIONS.UA.exercises.at(-1)).toMatchObject({ ex: 'pallofPress', sets: 3, reps: [10, 10], rest: 60 })
    expect(SESSIONS.UB.exercises.at(-1)).toMatchObject({ ex: 'sidePlank', sets: 3, reps: [30, 45], rest: 60 })
  })
})
