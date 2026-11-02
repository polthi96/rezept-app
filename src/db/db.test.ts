import { describe, expect, it } from 'vitest'
import { AppDB } from './db'
import { SCHEMA_VERSIONS, type SchemaVersion } from './schema'
import { BACKUP_MIGRATIONS, BACKUP_TABLES } from '../backup/backup'
import { freshDb, seed, TEST_PNG_BYTES, testRecipe } from '../test/fixtures'

describe('Datenhaltung', () => {
  it('Daten bleiben nach Schließen und erneutem Öffnen erhalten (inkl. Bild)', async () => {
    const db = freshDb()
    await seed(db)
    db.close()

    const reopened = new AppDB(db.name)
    expect(await reopened.recipes.get(testRecipe.id)).toEqual(testRecipe)
    const img = await reopened.images.get('bild-test-1')
    expect(new Uint8Array(img!.data)).toEqual(TEST_PNG_BYTES)
    expect((await reopened.settings.get('beispiel'))?.value).toEqual({ a: 1, b: [true, 'x'] })
    reopened.close()
  })

  it('Versionsnummern sind lückenlos aufsteigend', () => {
    SCHEMA_VERSIONS.forEach((v, i) => expect(v.version).toBe(i + 1))
  })

  it('für jede ältere Version gibt es einen Backup-Umbauschritt', () => {
    for (const v of SCHEMA_VERSIONS.slice(0, -1)) expect(BACKUP_MIGRATIONS[v.version]).toBeTypeOf('function')
  })

  it('Backup deckt alle Tabellen der Datenbank ab', () => {
    const db = freshDb()
    expect(db.tables.map((t) => t.name).sort()).toEqual([...BACKUP_TABLES].sort())
  })

  it('Migration 1 → 2: Daten aus Phase 0 bleiben erhalten und bekommen die neuen Felder', async () => {
    const name = freshDb().name
    const v1 = new AppDB(name, SCHEMA_VERSIONS.slice(0, 1))
    await v1.table('recipes').bulkAdd([
      { id: 'alt-1', title: 'Altes Testrezept', createdAt: '2026-10-30T10:00:00.000Z', updatedAt: '2026-10-30T10:00:00.000Z', deletedAt: null },
      { id: 'alt-2', title: 'Ohne Papierkorb-Feld', createdAt: '2026-10-30T10:00:00.000Z', updatedAt: '2026-10-30T10:00:00.000Z' },
    ])
    await v1.table('images').add({ id: 'altbild', recipeId: 'alt-1', mime: 'image/png', data: TEST_PNG_BYTES.slice().buffer, createdAt: '2026-10-30T10:00:00.000Z' })
    await v1.table('settings').put({ key: 'lastBackupAt', value: '2026-10-31T10:00:00.000Z' })
    v1.close()

    const v2 = new AppDB(name)
    await v2.open()
    expect(v2.verno).toBe(2)
    expect(await v2.recipes.get('alt-1')).toEqual({
      id: 'alt-1',
      title: 'Altes Testrezept',
      createdAt: '2026-10-30T10:00:00.000Z',
      updatedAt: '2026-10-30T10:00:00.000Z',
      deletedAt: null,
      sourceUrl: null,
      servings: null,
      activeMinutes: null,
      totalMinutes: null,
      tags: [],
      favorite: 0,
      ingredients: [],
      steps: [],
    })
    expect((await v2.recipes.get('alt-2'))?.deletedAt).toBeNull()
    const img = await v2.images.get('altbild')
    expect(img?.position).toBe(0)
    expect(new Uint8Array(img!.data)).toEqual(TEST_PNG_BYTES)
    expect((await v2.settings.get('lastBackupAt'))?.value).toBe('2026-10-31T10:00:00.000Z')
    // Neue Indizes funktionieren
    expect(await v2.recipes.where('favorite').equals(0).count()).toBe(2)
    v2.close()
  })

  it('Migrationsweg auch für künftige Versionen: Upgrade erhält vorhandene Daten', async () => {
    const db = freshDb()
    await seed(db)
    db.close()

    const next: SchemaVersion = {
      version: SCHEMA_VERSIONS.length + 1,
      stores: { recipes: 'id, updatedAt, deletedAt, favorite, *tags, title' },
      upgrade: (tx) =>
        tx
          .table('recipes')
          .toCollection()
          .modify((r: Record<string, unknown>) => {
            r.rating = null
          })
          .then(() => undefined),
    }
    const upgraded = new AppDB(db.name, [...SCHEMA_VERSIONS, next])
    await upgraded.open()
    const recipe = (await upgraded.recipes.get(testRecipe.id)) as unknown as Record<string, unknown>
    expect(recipe).toEqual({ ...testRecipe, rating: null })
    expect(await upgraded.images.count()).toBe(1)
    upgraded.close()
  })
})
