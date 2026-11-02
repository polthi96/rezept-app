import { useEffect, useMemo, useRef, useState } from 'react'
import Dexie from 'dexie'
import { db } from '../../db/instance'
import type { ImageRecord, Recipe } from '../../db/schema'
import { formatIngredientLine, formatQuantity, parseIngredient } from '../../recipes/ingredients'
import { resizeImage } from '../../recipes/images'
import { saveRecipe, type ImageSlot, type NewImage } from '../../recipes/repo'
import { parseTags, safeUrl } from '../../recipes/search'
import { useBlockUpdates } from '../../update/updateBlockers'
import { errorText } from '../errors'
import { useImageUrl } from './useImageUrl'

const MAX_IMAGES = 10

interface StepRow {
  id: string
  text: string
  timerMinutes: string
}

type ImageRow = { key: string; kind: 'existing'; record: ImageRecord } | { key: string; kind: 'new'; image: NewImage }

interface FormState {
  title: string
  sourceUrl: string
  servings: string
  activeMinutes: string
  totalMinutes: string
  tags: string
  ingredientsText: string
  steps: StepRow[]
  images: ImageRow[]
}

function emptyState(): FormState {
  return {
  title: '',
  sourceUrl: '',
  servings: '',
  activeMinutes: '',
  totalMinutes: '',
  tags: '',
  ingredientsText: '',
  steps: [{ id: crypto.randomUUID(), text: '', timerMinutes: '' }],
  images: [],
  }
}

function fromRecipe(r: Recipe, images: ImageRecord[]): FormState {
  return {
    title: r.title,
    sourceUrl: r.sourceUrl ?? '',
    servings: r.servings?.toLocaleString('de-DE') ?? '',
    activeMinutes: r.activeMinutes?.toString() ?? '',
    totalMinutes: r.totalMinutes?.toString() ?? '',
    tags: r.tags.join(', '),
    ingredientsText: r.ingredients.map(formatIngredientLine).join('\n'),
    steps: r.steps.length
      ? r.steps.map((s) => ({ id: s.id, text: s.text, timerMinutes: s.timerSeconds ? formatMinutes(s.timerSeconds) : '' }))
      : emptyState().steps,
    images: images.map((record) => ({ key: record.id, kind: 'existing', record })),
  }
}

/** Vergleichbare Form ohne Bilddaten – für „ungespeicherte Änderungen?". */
function fingerprint(s: FormState): string {
  return JSON.stringify({ ...s, images: s.images.map((i) => i.key) })
}

export function RecipeForm({ id, onDone, onCancel }: { id?: string; onDone: (id: string) => void; onCancel: () => void }) {
  const [original, setOriginal] = useState<Recipe | null>(null)
  const [initial] = useState(() => (id ? null : emptyState()))
  const [state, setState] = useState<FormState | null>(initial)
  const [saved, setSaved] = useState<string>(initial ? fingerprint(initial) : '')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [imageBusy, setImageBusy] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    void (async () => {
      const r = await db.recipes.get(id)
      if (!r) return onCancel()
      const imgs = await db.images.where('[recipeId+position]').between([id, Dexie.minKey], [id, Dexie.maxKey]).toArray()
      const s = fromRecipe(r, imgs)
      setOriginal(r)
      setState(s)
      setSaved(fingerprint(s))
    })().catch((e) => setErrors([errorText(e, 'Rezept konnte nicht geladen werden')]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const dirty = state !== null && fingerprint(state) !== saved
  useBlockUpdates(dirty || saving || imageBusy !== null, 'ungespeicherte Änderungen am Rezept')

  const parsedIngredients = useMemo(
    () => (state?.ingredientsText ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l, i) => parseIngredient(l, `vorschau-${i}`)),
    [state?.ingredientsText],
  )

  if (!state) {
    return errors.length ? <p className="msg-error" role="alert">{errors[0]}</p> : <p className="muted">Lade …</p>
  }

  const update = (patch: Partial<FormState>) => setState((s) => (s ? { ...s, ...patch } : s))
  const updateStep = (i: number, patch: Partial<StepRow>) =>
    update({ steps: state.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  const moveStep = (i: number, dir: -1 | 1) => {
    const steps = [...state.steps]
    ;[steps[i], steps[i + dir]] = [steps[i + dir], steps[i]]
    update({ steps })
  }

  async function addImages(files: FileList | null) {
    if (!files?.length) return
    const list = [...files].slice(0, MAX_IMAGES - state!.images.length)
    const problems: string[] = []
    if (files.length > list.length) problems.push(`Höchstens ${MAX_IMAGES} Fotos pro Rezept.`)
    for (const [i, file] of list.entries()) {
      setImageBusy(`Foto ${i + 1} von ${list.length} wird verkleinert …`)
      try {
        const image = await resizeImage(file)
        setState((s) => (s ? { ...s, images: [...s.images, { key: crypto.randomUUID(), kind: 'new', image }] } : s))
      } catch (e) {
        problems.push(errorText(e, `„${file.name}" konnte nicht hinzugefügt werden`))
      }
    }
    setImageBusy(null)
    setErrors(problems)
    if (fileInput.current) fileInput.current.value = ''
  }

  function moveImage(i: number, dir: -1 | 1) {
    const images = [...state!.images]
    ;[images[i], images[i + dir]] = [images[i + dir], images[i]]
    update({ images })
  }

  async function save() {
    const s = state!
    const problems: string[] = []
    const title = s.title.trim()
    if (!title) problems.push('Bitte einen Titel eingeben.')
    const servings = parseNumberField(s.servings, 'Portionen', problems, true)
    const activeMinutes = parseNumberField(s.activeMinutes, 'Arbeitszeit', problems)
    const totalMinutes = parseNumberField(s.totalMinutes, 'Gesamtzeit', problems)
    const sourceUrl = safeUrl(s.sourceUrl)
    if (s.sourceUrl.trim() && !sourceUrl) problems.push('Der Link muss eine Webadresse sein (z. B. https://www.instagram.com/…).')
    const steps = s.steps
      .filter((st) => st.text.trim())
      .map((st, i) => {
        const minutes = parseNumberField(st.timerMinutes, `Timer bei Schritt ${i + 1}`, problems, true)
        return { id: st.id, text: st.text.trim(), timerSeconds: minutes === null ? null : Math.round(minutes * 60) }
      })
    if (problems.length) {
      setErrors(problems)
      return
    }

    const lines = s.ingredientsText.split('\n').map((l) => l.trim()).filter(Boolean)
    const previousIds = original?.ingredients.map((i) => i.id) ?? []
    const now = new Date().toISOString()
    const recipe: Recipe = {
      id: original?.id ?? crypto.randomUUID(),
      createdAt: original?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
      favorite: original?.favorite ?? 0,
      title,
      sourceUrl,
      servings,
      activeMinutes,
      totalMinutes,
      tags: parseTags(s.tags),
      // IDs bleiben pro Zeile erhalten, damit spätere Funktionen (Einkaufsliste) Zutaten wiedererkennen.
      ingredients: lines.map((l, i) => parseIngredient(l, previousIds[i] ?? crypto.randomUUID())),
      steps,
    }
    const slots: ImageSlot[] = s.images.map((img) => (img.kind === 'existing' ? { kind: 'existing', id: img.record.id } : { kind: 'new', image: img.image }))

    setSaving(true)
    setErrors([])
    try {
      await saveRecipe(db, recipe, slots)
      setSaved(fingerprint(s))
      onDone(recipe.id)
    } catch (e) {
      // Eingaben bleiben im Formular – nichts geht verloren.
      setErrors([errorText(e, 'Speichern fehlgeschlagen. Deine Eingaben sind noch da, bitte erneut versuchen')])
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    if (dirty && !window.confirm('Ungespeicherte Änderungen verwerfen?')) return
    onCancel()
  }

  return (
    <form
      className="stack"
      // Eigene, verständliche Prüfung statt der Browser-Prüfung (die z. B. Links ohne https:// stumm blockiert).
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div className="toolbar">
        <button type="button" className="btn btn-quiet back" onClick={cancel}>
          ‹ Abbrechen
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || imageBusy !== null}>
          {saving ? 'Speichere …' : 'Speichern'}
        </button>
      </div>
      <h2>{id ? 'Rezept bearbeiten' : 'Neues Rezept'}</h2>

      <ErrorList errors={errors} />

      <label className="label">
        Titel *
        <input className="field" value={state.title} onChange={(e) => update({ title: e.target.value })} placeholder="z. B. Rote Linsensuppe" />
      </label>

      <label className="label">
        Link zum Video oder zur Quelle
        <input
          className="field"
          type="url"
          inputMode="url"
          autoCapitalize="off"
          value={state.sourceUrl}
          onChange={(e) => update({ sourceUrl: e.target.value })}
          placeholder="Link aus Instagram/TikTok einfügen"
        />
      </label>

      <div className="grid3">
        <label className="label">
          Portionen
          <input className="field" inputMode="decimal" value={state.servings} onChange={(e) => update({ servings: e.target.value })} />
        </label>
        <label className="label">
          Arbeitszeit (Min.)
          <input className="field" inputMode="numeric" value={state.activeMinutes} onChange={(e) => update({ activeMinutes: e.target.value })} />
        </label>
        <label className="label">
          Gesamtzeit (Min.)
          <input className="field" inputMode="numeric" value={state.totalMinutes} onChange={(e) => update({ totalMinutes: e.target.value })} />
        </label>
      </div>

      <label className="label">
        Schlagwörter
        <input className="field" value={state.tags} onChange={(e) => update({ tags: e.target.value })} placeholder="z. B. schnell, High Protein, vegetarisch" />
        <span className="hint">Mit Komma trennen.</span>
      </label>

      <fieldset className="card">
        <legend>Fotos</legend>
        {state.images.length > 0 && (
          <ul className="thumbs">
            {state.images.map((img, i) => (
              <li key={img.key}>
                <FormThumb row={img} label={i === 0 ? 'Vorschaubild' : `Foto ${i + 1}`} />
                <div className="thumb-actions">
                  <button type="button" className="icon-btn" aria-label={`Foto ${i + 1} nach links`} disabled={i === 0} onClick={() => moveImage(i, -1)}>
                    ‹
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Foto ${i + 1} entfernen`}
                    onClick={() => update({ images: state.images.filter((x) => x.key !== img.key) })}
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Foto ${i + 1} nach rechts`}
                    disabled={i === state.images.length - 1}
                    onClick={() => moveImage(i, 1)}
                  >
                    ›
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="btn"
          disabled={imageBusy !== null || state.images.length >= MAX_IMAGES}
          onClick={() => fileInput.current?.click()}
        >
          {imageBusy ?? '+ Fotos oder Screenshots hinzufügen'}
        </button>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => void addImages(e.target.files)} />
        <p className="hint">Das erste Foto ist das Vorschaubild. Fotos werden beim Hinzufügen verkleinert.</p>
      </fieldset>

      <fieldset className="card">
        <legend>Zutaten</legend>
        <textarea
          className="field"
          rows={Math.max(5, parsedIngredients.length + 1)}
          value={state.ingredientsText}
          onChange={(e) => update({ ingredientsText: e.target.value })}
          placeholder={'Eine Zutat pro Zeile, z. B.\n200 g rote Linsen\n½ Zwiebel, fein gehackt\n1 Dose passierte Tomaten\nSalz nach Geschmack\nChili (optional)'}
          aria-describedby="ingredients-preview"
        />
        {parsedIngredients.length > 0 && (
          <div id="ingredients-preview">
            <p className="hint">So wird es gespeichert:</p>
            <ul className="ingredients">
              {parsedIngredients.map((ing) => (
                <li key={ing.id}>
                  <span className="qty">{formatQuantity(ing) || '–'}</span>
                  <span>
                    {ing.name}
                    {ing.note && <span className="muted">, {ing.note}</span>}
                    {ing.optional && <span className="badge">optional</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </fieldset>

      <fieldset className="card">
        <legend>Zubereitung</legend>
        <ol className="step-rows">
          {state.steps.map((st, i) => (
            <li key={st.id}>
              <textarea
                className="field"
                rows={2}
                value={st.text}
                aria-label={`Schritt ${i + 1}`}
                placeholder={`Schritt ${i + 1}`}
                onChange={(e) => updateStep(i, { text: e.target.value })}
              />
              <div className="step-tools">
                <label className="inline-label">
                  ⏱
                  <input
                    className="field field-small"
                    inputMode="decimal"
                    aria-label={`Timer für Schritt ${i + 1} in Minuten`}
                    placeholder="Min."
                    value={st.timerMinutes}
                    onChange={(e) => updateStep(i, { timerMinutes: e.target.value })}
                  />
                </label>
                <button type="button" className="icon-btn" aria-label={`Schritt ${i + 1} nach oben`} disabled={i === 0} onClick={() => moveStep(i, -1)}>
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Schritt ${i + 1} nach unten`}
                  disabled={i === state.steps.length - 1}
                  onClick={() => moveStep(i, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Schritt ${i + 1} entfernen`}
                  onClick={() => update({ steps: state.steps.filter((x) => x.id !== st.id) })}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="btn" onClick={() => update({ steps: [...state.steps, { id: crypto.randomUUID(), text: '', timerMinutes: '' }] })}>
          + Schritt hinzufügen
        </button>
      </fieldset>

      <ErrorList errors={errors} />
      <button type="submit" className="btn btn-primary btn-block" disabled={saving || imageBusy !== null}>
        {saving ? 'Speichere …' : 'Speichern'}
      </button>
    </form>
  )
}

function ErrorList({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return (
    <div className="msg-error" role="alert">
      {errors.map((e) => (
        <p key={e}>{e}</p>
      ))}
    </div>
  )
}

function FormThumb({ row, label }: { row: ImageRow; label: string }) {
  const url = useImageUrl(row.kind === 'existing' ? row.record : row.image)
  return url ? <img src={url} alt={label} className="thumb" /> : <span className="thumb" />
}

/** „1,5" → 1.5; leer → null; Unsinn → Fehlermeldung. */
function parseNumberField(input: string, label: string, problems: string[], positive = false): number | null {
  const s = input.trim().replace(',', '.')
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0 || (positive && n === 0)) {
    problems.push(`${label}: bitte eine Zahl eingeben.`)
    return null
  }
  return n
}

function formatMinutes(seconds: number): string {
  return (Math.round((seconds / 60) * 100) / 100).toLocaleString('de-DE')
}
