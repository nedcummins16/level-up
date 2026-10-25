import { describe, expect, it } from 'vitest'
import { isNumberDraft, parseNumberText } from './numbers'

describe('number boxes', () => {
  it('lets you type a decimal one key at a time', () => {
    for (const t of ['5', '58', '58.', '58.4', '58,4', '.5']) expect(isNumberDraft(t)).toBe(true)
    expect(parseNumberText('58.')).toBe(58)
    expect(parseNumberText('58.4')).toBe(58.4)
    expect(parseNumberText('58,4')).toBe(58.4)
    expect(parseNumberText('22.5')).toBe(22.5)
  })

  it('treats empty as no value and rejects letters', () => {
    expect(parseNumberText('')).toBeNull()
    expect(parseNumberText('.')).toBeUndefined()
    expect(isNumberDraft('5a')).toBe(false)
    expect(isNumberDraft('5.5.5')).toBe(false)
  })

  it('whole-number boxes refuse a decimal point', () => {
    expect(isNumberDraft('12', false)).toBe(true)
    expect(isNumberDraft('12.', false)).toBe(false)
  })
})
