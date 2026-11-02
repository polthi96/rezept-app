import { describe, expect, it } from 'vitest'
import { BackupError, createBackup, parseAndValidateBackup, restoreBackup, type ValidatedBackup } from './backup'
import { arrayBufferToBase64, sha256Hex } from './encoding'
import { getLastBackupAt, type AppDB } from '../db/db'
import { freshDb, makeRecipe, seed, TEST_PNG_BYTES, testImage, testRecipe, testRecipeInTrash } from '../test/fixtures'

const NOW = new Date('2026-10-31T12:00:00.000Z')

async function snapshot(db: AppDB) {
  const images = await db.images.toArray()
  return {
    recipes: await db.recipes.toArray(),
    images: images.map((i) => ({ ...i, data: Array.from(new Uint8Array(i.data)) })),
    settings: await db.settings.toArray(),
  }
}

/** Ein Datenbestand, der beim fehlerhaften Import unverändert bleiben muss. */
async function dbWithOtherData(): Promise<AppDB> {
  const db = freshDb()
  await db.recipes.add(makeRecipe({ id: 'bleibt', title: 'Bestehendes Rezept' }))
  await db.settings.put({ key: 'lastBackupAt', value: '2026-01-01T00:00:00.000Z' })
  return db
}

/** Verändert die Backup-Daten und rechnet die Prüfsumme passend neu (simuliert „gültig aussehende" Fehler). */
async function tamper(text: string, change: (file: Record<string, any>) => void): Promise<string> {
  const file = JSON.parse(text)
  change(file)
  file.checksum = await sha256Hex(JSON.stringify(file.data))
  return JSON.stringify(file)
}

describe('Backup – Export und Wiederherstellung', () => {
  it('Export → Wiederherstellung in leere Datenbank ergibt identische Daten inkl. Bild', async () => {
    const source = freshDb()
    await seed(source)
    const backup = await createBackup(source, '0.1.0', NOW)
    expect(backup.filename).toBe('kochbuch-backup-2026-10-31.json')
    expect(backup.summary).toMatchObject({ recipes: 2, images: 1, schemaVersion: 2 })

    const target = freshDb()
    await restoreBackup(target, await parseAndValidateBackup(backup.text))

    expect(await target.recipes.get(testRecipe.id)).toEqual(testRecipe)
    expect(await target.recipes.get(testRecipeInTrash.id)).toEqual(testRecipeInTrash)
    const img = await target.images.get(testImage().id)
    const { data, ...meta } = img!
    const { data: _d, ...expectedMeta } = testImage()
    expect(meta).toEqual(expectedMeta)
    expect(new Uint8Array(data)).toEqual(TEST_PNG_BYTES)
    expect((await target.settings.get('beispiel'))?.value).toEqual({ a: 1, b: [true, 'x'] })
    expect(await getLastBackupAt(target)).toBe(NOW.toISOString())
  })

  it('Wiederherstellung ersetzt den bisherigen Stand vollständig', async () => {
    const source = freshDb()
    await seed(source)
    const { text } = await createBackup(source, '0.1.0', NOW)

    const target = await dbWithOtherData()
    await restoreBackup(target, await parseAndValidateBackup(text))
    expect(await target.recipes.get('bleibt')).toBeUndefined()
    expect(await target.recipes.count()).toBe(2)
  })

  it('Umlaute, Sonderzeichen und Emojis überstehen Export und Wiederherstellung', async () => {
    const source = freshDb()
    const title = 'Käsespätzle „Omas Art" – ½ Zwiebel & Grüße 🧀'
    await source.recipes.add({ ...testRecipe, title })
    const { text } = await createBackup(source, '0.1.0', NOW)
    const target = freshDb()
    await restoreBackup(target, await parseAndValidateBackup(text))
    expect((await target.recipes.get(testRecipe.id))?.title).toBe(title)
  })

  it('„Letztes Backup" aus der Datei wird ignoriert, Erstelldatum des Backups gilt', async () => {
    const source = freshDb()
    await source.settings.put({ key: 'lastBackupAt', value: '2020-01-01T00:00:00.000Z' })
    const { text } = await createBackup(source, '0.1.0', NOW)
    const target = freshDb()
    await restoreBackup(target, await parseAndValidateBackup(text), NOW)
    expect(await getLastBackupAt(target)).toBe(NOW.toISOString())
  })

  it('Erstelldatum in der Zukunft wird beim Wiederherstellen auf „jetzt" begrenzt', async () => {
    const { text } = await createBackup(freshDb(), '0.1.0', new Date('2030-01-01T00:00:00.000Z'))
    const target = freshDb()
    await restoreBackup(target, await parseAndValidateBackup(text), NOW)
    expect(await getLastBackupAt(target)).toBe(NOW.toISOString())
  })

  it('Leere Datenbank lässt sich sichern und wiederherstellen', async () => {
    const { text } = await createBackup(freshDb(), '0.1.0', NOW)
    const target = await dbWithOtherData()
    await restoreBackup(target, await parseAndValidateBackup(text))
    expect(await target.recipes.count()).toBe(0)
  })
})

describe('Backup – fehlerhafte Dateien verändern keine Daten', () => {
  async function expectRejectedAndUnchanged(text: string, message: RegExp) {
    const db = await dbWithOtherData()
    const before = await snapshot(db)
    let error: unknown
    try {
      await restoreBackup(db, await parseAndValidateBackup(text))
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(BackupError)
    expect((error as Error).message).toMatch(message)
    expect(await snapshot(db)).toEqual(before)
  }

  async function validBackupText(): Promise<string> {
    const source = freshDb()
    await seed(source)
    return (await createBackup(source, '0.1.0', NOW)).text
  }

  it('kein JSON', async () => {
    await expectRejectedAndUnchanged('das ist kein backup', /kein gültiges JSON/)
  })

  it('abgeschnittene Datei', async () => {
    const text = await validBackupText()
    await expectRejectedAndUnchanged(text.slice(0, text.length / 2), /beschädigt/)
  })

  it('fremde JSON-Datei', async () => {
    await expectRejectedAndUnchanged(JSON.stringify({ hallo: 'welt' }), /kein Kochbuch-Backup/)
  })

  it('veränderter Inhalt (Prüfsumme passt nicht)', async () => {
    const file = JSON.parse(await validBackupText())
    file.data.recipes[0].title = 'Manipuliert'
    await expectRejectedAndUnchanged(JSON.stringify(file), /Prüfsumme/)
  })

  it('Backup aus neuerer Datenbankversion', async () => {
    const text = await tamper(await validBackupText(), (f) => (f.schemaVersion = 99))
    await expectRejectedAndUnchanged(text, /neueren App-Version/)
  })

  it('Backup aus neuerem Dateiformat', async () => {
    const text = await tamper(await validBackupText(), (f) => (f.formatVersion = 2))
    await expectRejectedAndUnchanged(text, /neueren App-Version/)
  })

  it('beschädigte Bilddaten', async () => {
    const text = await tamper(await validBackupText(), (f) => (f.data.images[0].dataBase64 = '%%%kaputt%%%'))
    await expectRejectedAndUnchanged(text, /Bilddaten sind beschädigt/)
  })

  it('Bild ohne zugehöriges Rezept', async () => {
    const text = await tamper(await validBackupText(), (f) => (f.data.images[0].recipeId = 'gibt-es-nicht'))
    await expectRejectedAndUnchanged(text, /Rezept, das im Backup fehlt/)
  })

  it('Rezept ohne ID', async () => {
    const text = await tamper(await validBackupText(), (f) => delete f.data.recipes[0].id)
    await expectRejectedAndUnchanged(text, /ID fehlt/)
  })

  it('doppelte IDs', async () => {
    const text = await tamper(await validBackupText(), (f) => (f.data.recipes[1].id = f.data.recipes[0].id))
    await expectRejectedAndUnchanged(text, /doppelt/)
  })

  it('ungültiges Erstelldatum', async () => {
    const text = await tamper(await validBackupText(), (f) => (f.createdAt = 'gestern'))
    await expectRejectedAndUnchanged(text, /Erstelldatum des Backups ist ungültig/)
  })

  it('ungültige Formatversion', async () => {
    const text = await tamper(await validBackupText(), (f) => (f.formatVersion = 0))
    await expectRejectedAndUnchanged(text, /keine gültige Formatversion/)
  })

  it('leere Bilddaten', async () => {
    const text = await tamper(await validBackupText(), (f) => (f.data.images[0].dataBase64 = ''))
    await expectRejectedAndUnchanged(text, /Bilddaten sind leer/)
  })

  it('ungültige Bildgröße', async () => {
    const text = await tamper(await validBackupText(), (f) => (f.data.images[0].width = 'breit'))
    await expectRejectedAndUnchanged(text, /Bildgröße ist ungültig/)
  })

  it('doppelte Einstellungen', async () => {
    const text = await tamper(await validBackupText(), (f) => f.data.settings.push({ ...f.data.settings[0] }))
    await expectRejectedAndUnchanged(text, /doppelt/)
  })

  it('fehlender Datenbereich', async () => {
    const text = await tamper(await validBackupText(), (f) => delete f.data.images)
    await expectRejectedAndUnchanged(text, /fehlt der Bereich/)
  })
})

describe('Backup – Rezeptfelder (Phase 1)', () => {
  async function validBackupText(): Promise<string> {
    const source = freshDb()
    await seed(source)
    return (await createBackup(source, '0.2.0', NOW)).text
  }

  async function expectRejected(change: (f: Record<string, any>) => void, message: RegExp) {
    const text = await tamper(await validBackupText(), change)
    await expect(parseAndValidateBackup(text)).rejects.toThrow(message)
  }

  it('flexible Zutaten (½, Dose, nach Geschmack, optional) überstehen Export und Wiederherstellung', async () => {
    const target = freshDb()
    await restoreBackup(target, await parseAndValidateBackup(await validBackupText()))
    expect((await target.recipes.get(testRecipe.id))?.ingredients).toEqual(testRecipe.ingredients)
    expect((await target.recipes.get(testRecipe.id))?.steps).toEqual(testRecipe.steps)
  })

  it('unbekannte Felder werden nicht übernommen', async () => {
    const text = await tamper(await validBackupText(), (f) => {
      f.data.recipes[0].geheim = 'soll nicht in die Datenbank'
      f.data.recipes[0].ingredients[0].extra = 1
    })
    const { data } = await parseAndValidateBackup(text)
    expect(data.recipes[0]).not.toHaveProperty('geheim')
    expect(data.recipes[0].ingredients[0]).not.toHaveProperty('extra')
  })

  it('Link, der nicht mit http(s) beginnt, wird abgelehnt', async () => {
    await expectRejected((f) => (f.data.recipes[0].sourceUrl = 'javascript:alert(1)'), /Link ist ungültig/)
  })

  it('falsche Typen in Zutaten, Schritten und Zahlen werden abgelehnt', async () => {
    await expectRejected((f) => (f.data.recipes[0].ingredients[0].amount = '200'), /Zutat 1: Menge ist ungültig/)
    await expectRejected((f) => (f.data.recipes[0].ingredients[1].optional = 'ja'), /Zutat 2: „optional" ist ungültig/)
    await expectRejected((f) => (f.data.recipes[0].steps[1].timerSeconds = -5), /Schritt 2: Timer ist ungültig/)
    await expectRejected((f) => (f.data.recipes[0].servings = 0), /Portionen ist ungültig/)
    await expectRejected((f) => (f.data.recipes[0].tags = 'schnell'), /Schlagwörter fehlen/)
    await expectRejected((f) => (f.data.recipes[0].favorite = true), /Favorit ist ungültig/)
    await expectRejected((f) => (f.data.images[0].position = -1), /Reihenfolge ist ungültig/)
  })

  it('Backup aus Phase 0 (Datenbankversion 1) lässt sich importieren und wird umgebaut', async () => {
    const data = {
      recipes: [{ id: 'alt', title: 'Altes Testrezept', createdAt: '2026-10-30T10:00:00.000Z', updatedAt: '2026-10-30T10:00:00.000Z', deletedAt: null }],
      images: [{ id: 'altbild', recipeId: 'alt', mime: 'image/png', dataBase64: arrayBufferToBase64(TEST_PNG_BYTES.slice().buffer), width: 1, height: 1, createdAt: '2026-10-30T10:00:00.000Z' }],
      settings: [],
    }
    const text = JSON.stringify({
      format: 'rezept-app-backup', formatVersion: 1, schemaVersion: 1, appVersion: '0.1.2',
      createdAt: '2026-10-31T10:00:00.000Z', checksum: await sha256Hex(JSON.stringify(data)), data,
    })
    const backup = await parseAndValidateBackup(text)
    const target = freshDb()
    await restoreBackup(target, backup)
    const r = await target.recipes.get('alt')
    expect(r).toMatchObject({ title: 'Altes Testrezept', ingredients: [], steps: [], tags: [], favorite: 0, servings: null })
    expect((await target.images.get('altbild'))?.position).toBe(0)
  })

  it('viele Bilder (40 × 300 KB) lassen sich sichern und wiederherstellen', async () => {
    const source = freshDb()
    await source.recipes.add(testRecipe)
    const bytes = new Uint8Array(300 * 1024).map((_, i) => (i * 31) % 256)
    await source.images.bulkAdd(
      Array.from({ length: 40 }, (_, i) => ({ ...testImage(), id: `bild-${i}`, position: i, mime: 'image/jpeg', data: bytes.slice().buffer })),
    )
    const { text, summary } = await createBackup(source, '0.2.0', NOW)
    expect(summary.images).toBe(40)
    const target = freshDb()
    await restoreBackup(target, await parseAndValidateBackup(text))
    const restored = await target.images.get('bild-39')
    expect(new Uint8Array(restored!.data)).toEqual(bytes)
  }, 30_000)
})

describe('Backup – Wiederherstellung ist „alles oder nichts"', () => {
  it('Fehler mitten im Schreiben → alter Stand bleibt vollständig erhalten', async () => {
    const db = await dbWithOtherData()
    const before = await snapshot(db)

    // Umgeht die Prüfung absichtlich: doppelte Bild-ID lässt das Schreiben
    // NACH dem Leeren der Tabellen scheitern. Die Transaktion muss alles zurückrollen.
    const broken: ValidatedBackup = {
      summary: { createdAt: NOW.toISOString(), appVersion: '0.1.0', schemaVersion: 1, recipes: 1, images: 2 },
      data: { recipes: [testRecipe], images: [testImage(), testImage()], settings: [] },
    }
    await expect(restoreBackup(db, broken)).rejects.toThrow()
    expect(await snapshot(db)).toEqual(before)
  })
})
