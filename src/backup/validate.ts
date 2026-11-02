import type { ImageRecord, Ingredient, Recipe, Setting, Step } from '../db/schema'
import { base64ToArrayBuffer } from './encoding'
import { BackupError } from './errors'

// Prüft jeden Datensatz eines Backups Feld für Feld und baut ein sauberes Objekt
// NUR aus bekannten Feldern. Unbekannte oder falsch typisierte Werte gelangen nie in die Datenbank.

type Rec = Record<string, unknown>

export function validateRecipe(r: unknown, i: number): Recipe {
  const where = `Rezept Nr. ${i + 1}`
  const o = obj(r, where)
  const ingredients = arr(o.ingredients, where, 'Zutaten').map((x, j) => validateIngredient(x, `${where}, Zutat ${j + 1}`))
  const steps = arr(o.steps, where, 'Schritte').map((x, j) => validateStep(x, `${where}, Schritt ${j + 1}`))
  const tags = arr(o.tags, where, 'Schlagwörter').map((t) => {
    if (typeof t !== 'string') throw new BackupError(`${where}: Schlagwort ist ungültig.`)
    return t
  })
  if (o.favorite !== 0 && o.favorite !== 1) throw new BackupError(`${where}: Favorit ist ungültig.`)
  const sourceUrl = nullable(o.sourceUrl, where, 'Link', (v) => typeof v === 'string' && /^https?:\/\//i.test(v))
  return {
    id: str(o.id, where, 'ID', true),
    title: str(o.title, where, 'Titel'),
    createdAt: date(o.createdAt, where, 'Erstelldatum'),
    updatedAt: date(o.updatedAt, where, 'Änderungsdatum'),
    deletedAt: o.deletedAt === null || o.deletedAt === undefined ? null : date(o.deletedAt, where, 'Papierkorb-Datum'),
    sourceUrl: sourceUrl as string | null,
    servings: nullable(o.servings, where, 'Portionen', isPositive) as number | null,
    activeMinutes: nullable(o.activeMinutes, where, 'Arbeitszeit', isNonNegative) as number | null,
    totalMinutes: nullable(o.totalMinutes, where, 'Gesamtzeit', isNonNegative) as number | null,
    tags,
    favorite: o.favorite,
    ingredients,
    steps,
  }
}

function validateIngredient(x: unknown, where: string): Ingredient {
  const o = obj(x, where)
  if (typeof o.optional !== 'boolean') throw new BackupError(`${where}: „optional" ist ungültig.`)
  return {
    id: str(o.id, where, 'ID', true),
    name: str(o.name, where, 'Name'),
    amount: nullable(o.amount, where, 'Menge', isNonNegative) as number | null,
    amountMax: nullable(o.amountMax, where, 'Menge (bis)', isNonNegative) as number | null,
    unit: str(o.unit, where, 'Einheit'),
    note: str(o.note, where, 'Hinweis'),
    optional: o.optional,
  }
}

function validateStep(x: unknown, where: string): Step {
  const o = obj(x, where)
  return {
    id: str(o.id, where, 'ID', true),
    text: str(o.text, where, 'Text'),
    timerSeconds: nullable(o.timerSeconds, where, 'Timer', isPositive) as number | null,
  }
}

export function validateImage(img: unknown, i: number, recipeIds: Set<string>): ImageRecord {
  const where = `Bild Nr. ${i + 1}`
  const o = obj(img, where)
  if (typeof o.mime !== 'string' || !o.mime.startsWith('image/')) {
    throw new BackupError(`${where}: Bildformat ist ungültig.`)
  }
  if (o.recipeId !== null && (typeof o.recipeId !== 'string' || !recipeIds.has(o.recipeId))) {
    throw new BackupError(`${where} gehört zu einem Rezept, das im Backup fehlt.`)
  }
  if (typeof o.position !== 'number' || !Number.isInteger(o.position) || o.position < 0) {
    throw new BackupError(`${where}: Reihenfolge ist ungültig.`)
  }
  for (const dim of ['width', 'height'] as const) {
    if (o[dim] !== undefined && !isPositive(o[dim])) throw new BackupError(`${where}: Bildgröße ist ungültig.`)
  }
  if (typeof o.dataBase64 !== 'string') throw new BackupError(`${where}: Bilddaten fehlen.`)
  let data: ArrayBuffer
  try {
    data = base64ToArrayBuffer(o.dataBase64)
  } catch {
    throw new BackupError(`${where}: Bilddaten sind beschädigt.`)
  }
  if (data.byteLength === 0) throw new BackupError(`${where}: Bilddaten sind leer.`)
  const result: ImageRecord = {
    id: str(o.id, where, 'ID', true),
    recipeId: o.recipeId as string | null,
    position: o.position,
    mime: o.mime,
    data,
    createdAt: date(o.createdAt, where, 'Erstelldatum'),
  }
  if (o.width !== undefined) result.width = o.width as number
  if (o.height !== undefined) result.height = o.height as number
  return result
}

export function validateSetting(s: unknown, i: number): Setting {
  const o = obj(s, `Einstellung Nr. ${i + 1}`)
  return { key: str(o.key, `Einstellung Nr. ${i + 1}`, 'Name', true), value: o.value }
}

// ---------- Bausteine ----------

function obj(v: unknown, where: string): Rec {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new BackupError(`${where} ist ungültig.`)
  return v as Rec
}

function arr(v: unknown, where: string, field: string): unknown[] {
  if (!Array.isArray(v)) throw new BackupError(`${where}: ${field} fehlen oder sind ungültig.`)
  return v
}

function str(v: unknown, where: string, field: string, nonEmpty = false): string {
  if (typeof v !== 'string' || (nonEmpty && v.length === 0)) {
    throw new BackupError(`${where}: ${field} fehlt oder ist ungültig.`)
  }
  return v
}

function date(v: unknown, where: string, field: string): string {
  const s = str(v, where, field)
  if (Number.isNaN(Date.parse(s))) throw new BackupError(`${where}: ${field} ist ungültig.`)
  return s
}

function nullable(v: unknown, where: string, field: string, ok: (v: unknown) => boolean): unknown {
  if (v === null) return null
  if (!ok(v)) throw new BackupError(`${where}: ${field} ist ungültig.`)
  return v
}

function isPositive(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v > 0
}

function isNonNegative(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
}
