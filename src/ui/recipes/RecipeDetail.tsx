import { useState } from 'react'
import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/instance'
import type { ImageRecord } from '../../db/schema'
import { formatQuantity } from '../../recipes/ingredients'
import { moveToTrash, toggleFavorite } from '../../recipes/repo'
import { errorText } from '../errors'
import { useImageUrl } from './useImageUrl'

export function RecipeDetail({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: () => void }) {
  const recipe = useLiveQuery(() => db.recipes.get(id), [id])
  const images = useLiveQuery(
    () => db.images.where('[recipeId+position]').between([id, Dexie.minKey], [id, Dexie.maxKey]).toArray(),
    [id],
  )
  const [error, setError] = useState<string | null>(null)

  if (recipe === undefined) return <p className="muted">Lade …</p>
  if (recipe === null || recipe.deletedAt !== null) {
    return (
      <div className="stack">
        <BackButton onBack={onBack} />
        <p>Dieses Rezept gibt es nicht mehr (oder es liegt im Papierkorb).</p>
      </div>
    )
  }

  async function act(action: () => Promise<void>, fallback: string) {
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(errorText(e, fallback))
    }
  }

  const facts = [
    recipe.servings !== null ? `${recipe.servings} ${recipe.servings === 1 ? 'Portion' : 'Portionen'}` : null,
    recipe.activeMinutes !== null ? `${recipe.activeMinutes} Min. Arbeitszeit` : null,
    recipe.totalMinutes !== null ? `${recipe.totalMinutes} Min. gesamt` : null,
  ].filter(Boolean)

  return (
    <article className="stack">
      <div className="toolbar">
        <BackButton onBack={onBack} />
        <button
          className="btn"
          aria-pressed={recipe.favorite === 1}
          onClick={() => void act(() => toggleFavorite(db, id), 'Favorit konnte nicht gespeichert werden')}
        >
          {recipe.favorite === 1 ? '★ Favorit' : '☆ Favorit'}
        </button>
        <button className="btn btn-primary" onClick={onEdit}>
          Bearbeiten
        </button>
      </div>

      <h2 className="recipe-title">{recipe.title}</h2>

      {images && images.length > 0 && (
        <div className="gallery" aria-label="Fotos">
          {images.map((img, i) => (
            <GalleryImage key={img.id} image={img} label={`Foto ${i + 1} von ${images.length}`} />
          ))}
        </div>
      )}

      {facts.length > 0 && <p className="facts">{facts.join(' · ')}</p>}
      {recipe.tags.length > 0 && <p className="muted">{recipe.tags.map((t) => `#${t}`).join(' ')}</p>}
      {recipe.sourceUrl && (
        <a className="btn btn-block" href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
          ▶︎ Video / Quelle öffnen
        </a>
      )}

      <section className="card">
        <h3>Zutaten</h3>
        {recipe.ingredients.length === 0 ? (
          <p className="muted">Keine Zutaten eingetragen.</p>
        ) : (
          <ul className="ingredients">
            {recipe.ingredients.map((ing) => (
              <li key={ing.id}>
                <span className="qty">{formatQuantity(ing)}</span>
                <span>
                  {ing.name}
                  {ing.note && <span className="muted">, {ing.note}</span>}
                  {ing.optional && <span className="badge">optional</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3>Zubereitung</h3>
        {recipe.steps.length === 0 ? (
          <p className="muted">Keine Schritte eingetragen.</p>
        ) : (
          <ol className="steps">
            {recipe.steps.map((s) => (
              <li key={s.id}>
                <p>{s.text}</p>
                {s.timerSeconds !== null && <span className="badge">⏱ {Math.round(s.timerSeconds / 60)} Min.</span>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {error && (
        <p className="msg-error" role="alert">
          {error}
        </p>
      )}

      <button
        className="btn btn-quiet"
        onClick={() =>
          void act(async () => {
            await moveToTrash(db, id)
            onBack()
          }, 'Konnte nicht in den Papierkorb gelegt werden')
        }
      >
        In den Papierkorb legen
      </button>
      <p className="hint">Im Papierkorb (unter „Mehr") bleibt das Rezept 30 Tage und kann zurückgeholt werden.</p>
    </article>
  )
}

export function BackButton({ onBack, label = 'Rezepte' }: { onBack: () => void; label?: string }) {
  return (
    <button className="btn btn-quiet back" onClick={onBack}>
      ‹ {label}
    </button>
  )
}

function GalleryImage({ image, label }: { image: ImageRecord; label: string }) {
  const url = useImageUrl(image)
  return url ? <img src={url} alt={label} width={image.width} height={image.height} /> : null
}
