import { describe, expect, it } from 'vitest'
import { formatAmount, formatIngredientLine, parseIngredient } from './ingredients'

const p = (s: string) => {
  const { id: _id, ...rest } = parseIngredient(s, 'x')
  return rest
}

describe('Zutaten erkennen', () => {
  it.each([
    ['200 g Mehl', { amount: 200, amountMax: null, unit: 'g', name: 'Mehl', note: '', optional: false }],
    ['200g Mehl', { amount: 200, unit: 'g', name: 'Mehl' }],
    ['1 Dose Kichererbsen', { amount: 1, unit: 'Dose', name: 'Kichererbsen' }],
    ['½ Zwiebel', { amount: 0.5, unit: '', name: 'Zwiebel' }],
    ['1½ EL Olivenöl', { amount: 1.5, unit: 'EL', name: 'Olivenöl' }],
    ['1 1/2 tl Zucker', { amount: 1.5, unit: 'TL', name: 'Zucker' }],
    ['1/4 l Milch', { amount: 0.25, unit: 'l', name: 'Milch' }],
    ['0,5 kg Kartoffeln', { amount: 0.5, unit: 'kg', name: 'Kartoffeln' }],
    ['2-3 Zehen Knoblauch', { amount: 2, amountMax: 3, unit: 'Zehen', name: 'Knoblauch' }],
    ['2 bis 3 Zehen Knoblauch', { amount: 2, amountMax: 3, unit: 'Zehen', name: 'Knoblauch' }],
    ['3 Eier', { amount: 3, unit: '', name: 'Eier' }],
    ['Salz nach Geschmack', { amount: null, unit: '', name: 'Salz', note: 'nach Geschmack' }],
    ['Pfeffer, nach Belieben', { amount: null, name: 'Pfeffer', note: 'nach Belieben' }],
    ['Chili (optional)', { amount: null, name: 'Chili', optional: true }],
    ['1 Zwiebel, fein gehackt', { amount: 1, name: 'Zwiebel', note: 'fein gehackt' }],
    ['400 g passierte Tomaten', { amount: 400, unit: 'g', name: 'passierte Tomaten' }],
    ['1 Prise Salz', { amount: 1, unit: 'Prise', name: 'Salz' }],
    ['Frische Petersilie zum Garnieren', { amount: null, name: 'Frische Petersilie', note: 'zum Garnieren' }],
    ['  2   große   Tomaten ', { amount: 2, unit: '', name: 'große Tomaten' }],
  ])('„%s"', (input, expected) => {
    expect(p(input)).toMatchObject(expected)
  })

  it('verliert nie Text, auch wenn nichts erkannt wird', () => {
    expect(p('etwas Butter für die Form')).toMatchObject({ amount: null, unit: '', name: 'etwas Butter für die Form' })
    expect(p('7-Kräuter-Mischung')).toMatchObject({ name: '7-Kräuter-Mischung' })
  })

  it('Zahlen werden hübsch dargestellt', () => {
    expect(formatAmount(0.5)).toBe('½')
    expect(formatAmount(1.5)).toBe('1½')
    expect(formatAmount(2.25)).toBe('2¼')
    expect(formatAmount(1 / 3)).toBe('⅓')
    expect(formatAmount(200)).toBe('200')
    expect(formatAmount(1.2)).toBe('1,2')
  })

  it.each([
    '200 g Mehl',
    '½ Zwiebel, fein gehackt',
    '2–3 Zehen Knoblauch',
    'Salz, nach Geschmack',
    'Chili (optional)',
    '1 Dose passierte Tomaten (optional)',
    '1,2 l Brühe',
  ])('Bearbeiten ohne Verlust: „%s"', (line) => {
    const once = parseIngredient(line, 'x')
    expect(parseIngredient(formatIngredientLine(once), 'x')).toEqual(once)
  })
})
