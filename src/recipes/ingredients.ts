import type { Ingredient } from '../db/schema'

// Zutaten als eine Textzeile eingeben und erkennen:
//   „200 g Mehl"              → Menge 200, Einheit g, Name Mehl
//   „½ Zwiebel, fein gehackt" → Menge 0,5, Name Zwiebel, Hinweis „fein gehackt"
//   „1 Dose Kichererbsen"     → Menge 1, Einheit Dose
//   „2-3 Zehen Knoblauch"     → Menge 2 bis 3, Einheit Zehen
//   „Salz nach Geschmack"     → keine Menge, Hinweis „nach Geschmack"
//   „Chili (optional)"        → optional
// Was nicht erkannt wird, bleibt vollständig im Namen – es geht nie Text verloren.

const UNITS = [
  'g', 'kg', 'mg', 'ml', 'l', 'cl', 'dl', 'el', 'tl', 'msp', 'prise', 'prisen', 'dose', 'dosen', 'bund', 'stück', 'stk',
  'packung', 'packungen', 'pck', 'pkg', 'becher', 'glas', 'gläser', 'tasse', 'tassen', 'scheibe', 'scheiben', 'zehe', 'zehen',
  'handvoll', 'zweig', 'zweige', 'blatt', 'blätter', 'stange', 'stangen', 'würfel', 'tube', 'flasche', 'beutel', 'cm',
  'liter', 'gramm', 'kilo', 'esslöffel', 'teelöffel', 'schuss', 'spritzer', 'knolle', 'knollen', 'kopf', 'köpfe', 'netz',
]

/** Kanonische Schreibweise einiger Einheiten (Eingabe ist frei, Groß/Klein egal). */
const UNIT_DISPLAY: Record<string, string> = { el: 'EL', tl: 'TL', msp: 'Msp', l: 'l', ml: 'ml', g: 'g', kg: 'kg' }

const VULGAR: Record<string, number> = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125 }
const NOTE_PHRASES = ['nach Geschmack', 'nach Belieben', 'zum Garnieren', 'zum Bestreuen', 'zum Braten']

// Reihenfolge wichtig: „1 1/2" vor „1/2" vor „1,5".
const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?(?:\s*[½⅓⅔¼¾⅛])?|[½⅓⅔¼¾⅛])`
const AMOUNT_RE = new RegExp(String.raw`^(${NUM})(?:\s*(?:-|–|bis)\s*(${NUM}))?(?=\s|[a-zA-ZäöüÄÖÜß]|$)\s*`)

export function parseIngredient(input: string, id: string = crypto.randomUUID()): Ingredient {
  let text = input.trim().replace(/\s+/g, ' ')
  let optional = false
  const notes: string[] = []

  const opt = /\s*\(?\boptional\b\)?\s*/i
  if (opt.test(text)) {
    optional = true
    text = text.replace(opt, ' ').trim()
  }
  for (const phrase of NOTE_PHRASES) {
    const re = new RegExp(`,?\\s*\\b${phrase}\\b`, 'i')
    if (re.test(text)) {
      notes.push(phrase)
      text = text.replace(re, '').trim()
    }
  }
  // Komma trennt den Hinweis ab – aber nicht das Dezimalkomma in „0,5 kg".
  const comma = text.search(/,(?!\d)|(?<!\d),/)
  if (comma >= 0) {
    const after = text.slice(comma + 1).trim()
    if (after) notes.unshift(after)
    text = text.slice(0, comma).trim()
  }

  let amount: number | null = null
  let amountMax: number | null = null
  let unit = ''
  const m = AMOUNT_RE.exec(text)
  if (m) {
    amount = parseNumber(m[1])
    amountMax = m[2] ? parseNumber(m[2]) : null
    text = text.slice(m[0].length)
    const unitMatch = /^([A-Za-zäöüÄÖÜß]+)\.?(?:\s+|$)/.exec(text)
    if (unitMatch && UNITS.includes(unitMatch[1].toLowerCase())) {
      unit = UNIT_DISPLAY[unitMatch[1].toLowerCase()] ?? unitMatch[1]
      text = text.slice(unitMatch[0].length)
    }
  }

  return { id, name: text.trim(), amount, amountMax, unit, note: notes.join(', '), optional }
}

function parseNumber(s: string): number {
  s = s.trim()
  const mixedFraction = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s)
  if (mixedFraction) return +mixedFraction[1] + +mixedFraction[2] / +mixedFraction[3]
  const fraction = /^(\d+)\/(\d+)$/.exec(s)
  if (fraction) return +fraction[1] / +fraction[2]
  const withVulgar = /^(\d+(?:[.,]\d+)?)?\s*([½⅓⅔¼¾⅛])$/.exec(s)
  if (withVulgar) return (withVulgar[1] ? parseFloat(withVulgar[1].replace(',', '.')) : 0) + VULGAR[withVulgar[2]]
  return parseFloat(s.replace(',', '.'))
}

/** Zahl hübsch auf Deutsch: 0,5 → ½, 1,5 → 1½, 2,25 → 2¼, 0,333 → ⅓, sonst mit Komma. */
export function formatAmount(n: number): string {
  const whole = Math.floor(n + 1e-9)
  const frac = n - whole
  for (const [sym, val] of Object.entries(VULGAR)) {
    if (Math.abs(frac - val) < 0.01) return `${whole > 0 ? whole : ''}${sym}`
  }
  if (frac < 0.01) return String(whole)
  return (Math.round(n * 100) / 100).toLocaleString('de-DE')
}

/** Mengenteil: „200 g", „2–3 Zehen", „½" oder leer. */
export function formatQuantity(ing: Pick<Ingredient, 'amount' | 'amountMax' | 'unit'>): string {
  if (ing.amount === null) return ing.unit
  const amount = ing.amountMax !== null ? `${formatAmount(ing.amount)}–${formatAmount(ing.amountMax)}` : formatAmount(ing.amount)
  return ing.unit ? `${amount} ${ing.unit}` : amount
}

/** Eine Zeile zum Bearbeiten – parseIngredient(formatIngredientLine(x)) ergibt wieder x. */
export function formatIngredientLine(ing: Ingredient): string {
  const parts = [formatQuantity(ing), ing.name].filter(Boolean).join(' ')
  const withNote = ing.note ? `${parts}, ${ing.note}` : parts
  return ing.optional ? `${withNote} (optional)` : withNote
}
