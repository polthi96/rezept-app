import type { AppDB } from '../db/db'
import type { ImageRecord, Recipe } from '../db/schema'

// Alle Schreibzugriffe auf Rezepte. Jede Funktion läuft in EINER Transaktion:
// Rezept und Bilder werden zusammen gespeichert oder gar nicht.

export const TRASH_DAYS = 30

export interface NewImage {
  mime: string
  data: ArrayBuffer
  width: number
  height: number
}

/** Bildliste im Formular: vorhandene Bilder (per ID) und neu hinzugefügte, in gewünschter Reihenfolge. */
export type ImageSlot = { kind: 'existing'; id: string } | { kind: 'new'; image: NewImage }

/**
 * Speichert ein Rezept samt Bildern. Entfernte Bilder werden gelöscht, neue angelegt,
 * die Reihenfolge übernommen. Schlägt etwas fehl, bleibt alles wie vorher.
 */
export async function saveRecipe(db: AppDB, recipe: Recipe, images: ImageSlot[], now: Date = new Date()): Promise<Recipe> {
  const saved: Recipe = { ...recipe, updatedAt: now.toISOString() }
  await db.transaction('rw', db.recipes, db.images, async () => {
    const existing = await db.images.where('recipeId').equals(recipe.id).toArray()
    const keep = new Set(images.flatMap((s) => (s.kind === 'existing' ? [s.id] : [])))
    const toDelete = existing.filter((img) => !keep.has(img.id)).map((img) => img.id)
    await db.images.bulkDelete(toDelete)

    for (const [position, slot] of images.entries()) {
      if (slot.kind === 'existing') {
        await db.images.update(slot.id, { position })
      } else {
        const record: ImageRecord = {
          id: crypto.randomUUID(),
          recipeId: recipe.id,
          position,
          createdAt: now.toISOString(),
          ...slot.image,
        }
        await db.images.add(record)
      }
    }
    await db.recipes.put(saved)
  })
  return saved
}

export async function toggleFavorite(db: AppDB, id: string): Promise<void> {
  await db.transaction('rw', db.recipes, async () => {
    const r = await db.recipes.get(id)
    if (r) await db.recipes.update(id, { favorite: r.favorite === 1 ? 0 : 1 })
  })
}

/** In den Papierkorb legen (nichts wird gelöscht). */
export async function moveToTrash(db: AppDB, id: string, now: Date = new Date()): Promise<void> {
  await db.recipes.update(id, { deletedAt: now.toISOString() })
}

export async function restoreFromTrash(db: AppDB, id: string): Promise<void> {
  await db.recipes.update(id, { deletedAt: null })
}

/** Endgültig löschen – nur für Rezepte, die im Papierkorb liegen. */
export async function deletePermanently(db: AppDB, ids: string[]): Promise<number> {
  return db.transaction('rw', db.recipes, db.images, async () => {
    const inTrash = (await db.recipes.bulkGet(ids)).filter((r): r is Recipe => !!r && r.deletedAt !== null).map((r) => r.id)
    await db.images.where('recipeId').anyOf(inTrash).delete()
    await db.recipes.bulkDelete(inTrash)
    return inTrash.length
  })
}

export async function emptyTrash(db: AppDB): Promise<number> {
  const ids = (await db.recipes.toArray()).filter((r) => r.deletedAt !== null).map((r) => r.id)
  return deletePermanently(db, ids)
}

/** Löscht Rezepte, die länger als TRASH_DAYS Tage im Papierkorb liegen. */
export async function purgeExpiredTrash(db: AppDB, now: Date = new Date()): Promise<number> {
  const limit = now.getTime() - TRASH_DAYS * 86_400_000
  const ids = (await db.recipes.toArray())
    .filter((r) => r.deletedAt !== null && Date.parse(r.deletedAt) < limit)
    .map((r) => r.id)
  return ids.length ? deletePermanently(db, ids) : 0
}

/** Tage, bis ein Rezept im Papierkorb automatisch gelöscht wird. */
export function daysLeftInTrash(deletedAt: string, now: Date = new Date()): number {
  const left = TRASH_DAYS - (now.getTime() - Date.parse(deletedAt)) / 86_400_000
  return Math.max(0, Math.ceil(left))
}
