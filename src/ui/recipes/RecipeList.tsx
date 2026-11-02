import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/instance'
import type { Recipe } from '../../db/schema'
import { allTags, EMPTY_FILTERS, filterRecipes, recipeMinutes, type RecipeFilters } from '../../recipes/search'
import { useImageUrl } from './useImageUrl'

const DURATIONS = [15, 30, 60]

export function RecipeList({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const [filters, setFilters] = useState<RecipeFilters>(EMPTY_FILTERS)
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const visible = useMemo(() => filterRecipes(recipes ?? [], filters), [recipes, filters])
  const tags = useMemo(() => allTags(recipes ?? []), [recipes])
  const total = (recipes ?? []).filter((r) => r.deletedAt === null).length
  const set = (patch: Partial<RecipeFilters>) => setFilters((f) => ({ ...f, ...patch }))
  const filtered = filters !== EMPTY_FILTERS && (filters.query || filters.favoritesOnly || filters.maxMinutes || filters.tag)

  if (!recipes) return <p className="muted">Lade …</p>

  return (
    <div className="stack">
      <button className="btn btn-primary btn-block" onClick={onNew}>
        + Neues Rezept
      </button>

      {total > 0 && (
        <>
          <input
            className="field"
            type="search"
            inputMode="search"
            placeholder="Suchen: Titel, Zutat, Schlagwort"
            aria-label="Rezepte durchsuchen"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
          />
          <div className="chips" role="group" aria-label="Filter">
            <Chip active={filters.favoritesOnly} onClick={() => set({ favoritesOnly: !filters.favoritesOnly })}>
              ★ Favoriten
            </Chip>
            {DURATIONS.map((m) => (
              <Chip key={m} active={filters.maxMinutes === m} onClick={() => set({ maxMinutes: filters.maxMinutes === m ? null : m })}>
                bis {m} Min.
              </Chip>
            ))}
            {tags.map((t) => (
              <Chip key={t} active={filters.tag === t} onClick={() => set({ tag: filters.tag === t ? null : t })}>
                #{t}
              </Chip>
            ))}
          </div>
        </>
      )}

      {total === 0 && (
        <div className="placeholder">
          <p>Noch keine Rezepte.</p>
          <p className="muted">Tippe auf „Neues Rezept", um dein erstes Rezept anzulegen.</p>
        </div>
      )}

      {total > 0 && visible.length === 0 && (
        <div className="placeholder">
          <p>Kein Rezept passt zu deiner Suche.</p>
          <button className="btn" onClick={() => setFilters(EMPTY_FILTERS)}>
            Filter zurücksetzen
          </button>
        </div>
      )}

      {visible.length > 0 && (
        <>
          {filtered && (
            <p className="muted" role="status">
              {visible.length} von {total} Rezepten
            </p>
          )}
          <ul className="recipe-list">
            {visible.map((r) => (
              <RecipeCard key={r.id} recipe={r} onOpen={() => onOpen(r.id)} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={active ? 'chip active' : 'chip'} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  )
}

function RecipeCard({ recipe, onOpen }: { recipe: Recipe; onOpen: () => void }) {
  // Nur das Vorschaubild dieses Rezepts laden – nicht alle Bilder.
  const cover = useLiveQuery(() => db.images.where('[recipeId+position]').equals([recipe.id, 0]).first(), [recipe.id])
  const url = useImageUrl(cover)
  const minutes = recipeMinutes(recipe)
  return (
    <li>
      <button className="recipe-card" onClick={onOpen}>
        {url ? <img src={url} alt="" className="recipe-thumb" /> : <span className="recipe-thumb recipe-thumb-empty" aria-hidden="true">🍽</span>}
        <span className="recipe-card-text">
          <span className="recipe-card-title">
            {recipe.favorite === 1 && <span aria-label="Favorit">★ </span>}
            {recipe.title}
          </span>
          <span className="muted small">
            {[minutes !== null ? `${minutes} Min.` : null, recipe.tags.length ? recipe.tags.map((t) => `#${t}`).join(' ') : null]
              .filter(Boolean)
              .join(' · ') || 'keine Angaben'}
          </span>
        </span>
      </button>
    </li>
  )
}
