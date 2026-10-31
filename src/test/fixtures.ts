import { AppDB } from '../db/db'
import type { ImageRecord, Recipe } from '../db/schema'

// Erfundene Testdaten – keine echten persönlichen Daten.

let counter = 0
export function freshDb(): AppDB {
  counter += 1
  return new AppDB(`test-db-${Date.now()}-${counter}`)
}

/** Kleines, gültiges PNG (1×1 Pixel), Bytes exakt bekannt. */
export const TEST_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01,
  0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0xf8, 0xcf, 0xc0, 0xf0, 0x1f, 0x00, 0x05, 0x00, 0x01, 0xff, 0x89, 0x99, 0x3d, 0x1d, 0x00, 0x00,
  0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
])

export const testRecipe: Recipe = {
  id: 'rezept-test-1',
  title: 'Test-Linsensuppe',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  deletedAt: null,
}

export const testRecipeInTrash: Recipe = {
  id: 'rezept-test-2',
  title: 'Test-Pfannkuchen',
  createdAt: '2026-10-03T10:00:00.000Z',
  updatedAt: '2026-10-03T10:00:00.000Z',
  deletedAt: '2026-10-04T10:00:00.000Z',
}

export function testImage(): ImageRecord {
  return {
    id: 'bild-test-1',
    recipeId: testRecipe.id,
    mime: 'image/png',
    data: TEST_PNG_BYTES.slice().buffer,
    width: 1,
    height: 1,
    createdAt: '2026-10-01T10:05:00.000Z',
  }
}

export async function seed(db: AppDB): Promise<void> {
  await db.recipes.bulkAdd([testRecipe, testRecipeInTrash])
  await db.images.add(testImage())
  await db.settings.put({ key: 'beispiel', value: { a: 1, b: [true, 'x'] } })
}
