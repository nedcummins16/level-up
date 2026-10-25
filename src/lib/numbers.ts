// Number boxes: keep what you're typing ("58." on the way to "58.4") while the app
// stores the number. Accepts a comma as the decimal point too.

/** Can this text be on its way to a valid number? */
export function isNumberDraft(text: string, decimal = true): boolean {
  return decimal ? /^\d*([.,]\d*)?$/.test(text) : /^\d*$/.test(text)
}

/** The number in the text: null = empty, undefined = not a number yet (e.g. just "."). */
export function parseNumberText(text: string): number | null | undefined {
  if (text === '') return null
  const n = Number(text.replace(',', '.'))
  return text === '.' || text === ',' || Number.isNaN(n) ? undefined : n
}
