import { describe, expect, it } from 'vitest'
import { AppDB } from './db'
import { SCHEMA_VERSIONS, type SchemaVersion } from './schema'
import { BACKUP_TABLES } from '../backup/backup'
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

  it('Backup deckt alle Tabellen der Datenbank ab', () => {
    const db = freshDb()
    expect(db.tables.map((t) => t.name).sort()).toEqual([...BACKUP_TABLES].sort())
  })

  it('Migrationsweg: ein Versions-Upgrade erhält vorhandene Daten und baut sie um', async () => {
    // Simuliert eine künftige Version 2, die Rezepten ein neues Feld gibt.
    const db = freshDb()
    await seed(db)
    db.close()

    const v2: SchemaVersion = {
      version: 2,
      stores: { recipes: 'id, updatedAt, favorite' },
      upgrade: (tx) =>
        tx
          .table('recipes')
          .toCollection()
          .modify((r: Record<string, unknown>) => {
            r.favorite = 0
          })
          .then(() => undefined),
    }
    const upgraded = new AppDB(db.name, [...SCHEMA_VERSIONS, v2])
    await upgraded.open()
    expect(upgraded.verno).toBe(2)
    const recipe = (await upgraded.recipes.get(testRecipe.id)) as unknown as Record<string, unknown>
    expect(recipe.title).toBe(testRecipe.title)
    expect(recipe.favorite).toBe(0)
    expect(await upgraded.recipes.count()).toBe(2)
    expect(await upgraded.images.count()).toBe(1)
    upgraded.close()
  })
})
