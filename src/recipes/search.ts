import type { Recipe } from '../db/schema'

export interface RecipeFilters {
  query: string
  favoritesOnly: boolean
  /** Höchstdauer in Minuten (Gesamtzeit, sonst Arbeitszeit) oder null. */
  maxMinutes: number | null
  tag: string | null
}

export const EMPTY_FILTERS: RecipeFilters = { query: '', favoritesOnly: false, maxMinutes: null, tag: null }

/** Gesamtdauer zum Anzeigen und Filtern: Gesamtzeit, sonst Arbeitszeit, sonst unbekannt. */
export function recipeMinutes(r: Recipe): number | null {
  return r.totalMinutes ?? r.activeMinutes
}

function normalize(s: string): string {
  return s.toLocaleLowerCase('de-DE').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Sucht in Titel, Schlagwörtern und Zutaten. Jedes Suchwort muss vorkommen. Papierkorb ist ausgeschlossen. */
export function filterRecipes(recipes: Recipe[], f: RecipeFilters): Recipe[] {
  const words = normalize(f.query).split(/\s+/).filter(Boolean)
  return recipes
    .filter((r) => r.deletedAt === null)
    .filter((r) => !f.favoritesOnly || r.favorite === 1)
    .filter((r) => !f.tag || r.tags.some((t) => normalize(t) === normalize(f.tag!)))
    .filter((r) => {
      if (f.maxMinutes === null) return true
      const m = recipeMinutes(r)
      return m !== null && m <= f.maxMinutes
    })
    .filter((r) => {
      if (words.length === 0) return true
      const haystack = normalize([r.title, ...r.tags, ...r.ingredients.map((i) => i.name)].join(' '))
      return words.every((w) => haystack.includes(w))
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Alle Schlagwörter (ohne Papierkorb), alphabetisch, ohne Doppelte. */
export function allTags(recipes: Recipe[]): string[] {
  const seen = new Map<string, string>()
  for (const r of recipes) {
    if (r.deletedAt !== null) continue
    for (const t of r.tags) if (!seen.has(normalize(t))) seen.set(normalize(t), t)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'de'))
}

/** „schnell, High Protein, schnell" → ["schnell", "High Protein"] */
export function parseTags(input: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input.split(/[,;#]/)) {
    const t = raw.trim().replace(/\s+/g, ' ')
    if (t && !seen.has(normalize(t))) {
      seen.add(normalize(t))
      out.push(t)
    }
  }
  return out
}

/** Nur http(s)-Links werden gespeichert (schützt vor gefährlichen „javascript:"-Links). */
export function safeUrl(input: string): string | null {
  const s = input.trim()
  if (!s) return null
  const withProtocol = /^[a-z]+:/i.test(s) ? s : `https://${s}`
  try {
    const url = new URL(withProtocol)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
