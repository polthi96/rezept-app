import { describe, expect, it } from 'vitest'
import { allTags, EMPTY_FILTERS, filterRecipes, parseTags, safeUrl } from './search'
import { daysLeftInTrash, deletePermanently, emptyTrash, moveToTrash, purgeExpiredTrash, restoreFromTrash, saveRecipe, toggleFavorite, type NewImage } from './repo'
import { freshDb, makeRecipe, seed, testImage, testRecipe, testRecipeInTrash } from '../test/fixtures'

const NOW = new Date('2026-11-10T12:00:00.000Z')
const img = (n: number): NewImage => ({ mime: 'image/jpeg', data: new Uint8Array([n, n, n]).buffer, width: 10, height: 10 })

describe('Suche und Filter', () => {
  const recipes = [
    makeRecipe({ id: 'a', title: 'Linsensuppe', tags: ['schnell', 'Vegan'], totalMinutes: 25, favorite: 1, updatedAt: '2026-11-01T00:00:00Z',
      ingredients: [{ id: 'i', name: 'rote Linsen', amount: 200, amountMax: null, unit: 'g', note: '', optional: false }] }),
    makeRecipe({ id: 'b', title: 'Käsespätzle', tags: ['Ofen'], activeMinutes: 50, updatedAt: '2026-11-03T00:00:00Z' }),
    makeRecipe({ id: 'c', title: 'Overnight Oats', tags: ['schnell'], updatedAt: '2026-11-02T00:00:00Z' }),
    makeRecipe({ id: 'd', title: 'Gelöschte Suppe', deletedAt: '2026-11-04T00:00:00Z' }),
  ]
  const ids = (f: Partial<typeof EMPTY_FILTERS>) => filterRecipes(recipes, { ...EMPTY_FILTERS, ...f }).map((r) => r.id)

  it('ohne Filter: alle außer Papierkorb, neueste zuerst', () => expect(ids({})).toEqual(['b', 'c', 'a']))
  it('Suche in Titel, Zutaten und Schlagwörtern, ohne Groß/Klein und Akzente', () => {
    expect(ids({ query: 'kase' })).toEqual(['b'])
    expect(ids({ query: 'LINSEN' })).toEqual(['a'])
    expect(ids({ query: 'vegan suppe' })).toEqual(['a'])
    expect(ids({ query: 'suppe' })).toEqual(['a'])
  })
  it('Favoriten', () => expect(ids({ favoritesOnly: true })).toEqual(['a']))
  it('Dauer: Rezepte ohne Zeitangabe fallen heraus', () => {
    expect(ids({ maxMinutes: 30 })).toEqual(['a'])
    expect(ids({ maxMinutes: 60 })).toEqual(['b', 'a'])
  })
  it('Schlagwort', () => expect(ids({ tag: 'Schnell' })).toEqual(['c', 'a']))
  it('Schlagwort-Liste ohne Doppelte und ohne Papierkorb', () => expect(allTags(recipes)).toEqual(['Ofen', 'schnell', 'Vegan']))
  it('Schlagwörter eingeben', () => expect(parseTags(' schnell, High  Protein,schnell ;#Vegan')).toEqual(['schnell', 'High Protein', 'Vegan']))
  it('nur sichere Links', () => {
    expect(safeUrl('https://www.instagram.com/reel/abc')).toBe('https://www.instagram.com/reel/abc')
    expect(safeUrl('tiktok.com/@koch/video/1')).toBe('https://tiktok.com/@koch/video/1')
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('')).toBeNull()
  })
})

describe('Rezepte speichern', () => {
  it('speichert Rezept und Bilder in gewünschter Reihenfolge, entfernt gelöschte Bilder', async () => {
    const db = freshDb()
    await seed(db)
    await saveRecipe(db, testRecipe, [{ kind: 'new', image: img(1) }, { kind: 'existing', id: testImage().id }, { kind: 'new', image: img(2) }], NOW)
    let images = (await db.images.where('recipeId').equals(testRecipe.id).sortBy('position'))
    expect(images.map((i) => i.position)).toEqual([0, 1, 2])
    expect(images[1].id).toBe(testImage().id)
    expect((await db.recipes.get(testRecipe.id))?.updatedAt).toBe(NOW.toISOString())

    await saveRecipe(db, testRecipe, [{ kind: 'existing', id: images[2].id }], NOW)
    images = await db.images.where('recipeId').equals(testRecipe.id).toArray()
    expect(images.map((i) => i.position)).toEqual([0])
    expect(await db.images.count()).toBe(1)
  })

  it('Fehler beim Speichern → weder Rezept noch Bilder halb gespeichert', async () => {
    const db = freshDb()
    const recipe = makeRecipe({ id: 'neu', title: 'Neu' })
    // Fehler provozieren: Das zweite neue Bild bekommt eine ID, die schon vergeben ist.
    await db.images.add({ ...testImage(), id: 'fest' })
    const original = crypto.randomUUID
    let calls = 0
    crypto.randomUUID = (() => (++calls === 2 ? 'fest' : original.call(crypto))) as typeof crypto.randomUUID
    try {
      await expect(saveRecipe(db, recipe, [{ kind: 'new', image: img(1) }, { kind: 'new', image: img(2) }])).rejects.toThrow()
    } finally {
      crypto.randomUUID = original
    }
    expect(await db.recipes.get('neu')).toBeUndefined()
    expect(await db.images.count()).toBe(1)
  })

  it('Favorit umschalten', async () => {
    const db = freshDb()
    await seed(db)
    await toggleFavorite(db, testRecipe.id)
    expect((await db.recipes.get(testRecipe.id))?.favorite).toBe(0)
  })
})

describe('Papierkorb', () => {
  it('in den Papierkorb und zurück – nichts geht verloren', async () => {
    const db = freshDb()
    await seed(db)
    await moveToTrash(db, testRecipe.id, NOW)
    expect((await db.recipes.get(testRecipe.id))?.deletedAt).toBe(NOW.toISOString())
    expect(await db.images.count()).toBe(1)
    await restoreFromTrash(db, testRecipe.id)
    expect(await db.recipes.get(testRecipe.id)).toEqual(testRecipe)
  })

  it('endgültig löschen nur aus dem Papierkorb, samt Bildern', async () => {
    const db = freshDb()
    await seed(db)
    expect(await deletePermanently(db, [testRecipe.id])).toBe(0)
    expect(await db.recipes.count()).toBe(2)

    await moveToTrash(db, testRecipe.id, NOW)
    expect(await deletePermanently(db, [testRecipe.id])).toBe(1)
    expect(await db.recipes.get(testRecipe.id)).toBeUndefined()
    expect(await db.images.count()).toBe(0)
  })

  it('Papierkorb leeren betrifft nur gelöschte Rezepte', async () => {
    const db = freshDb()
    await seed(db)
    expect(await emptyTrash(db)).toBe(1)
    expect(await db.recipes.get(testRecipe.id)).toEqual(testRecipe)
  })

  it('nach 30 Tagen automatisch gelöscht, vorher nicht', async () => {
    const db = freshDb()
    await seed(db) // testRecipeInTrash: gelöscht am 04.10.2026
    expect(await purgeExpiredTrash(db, new Date('2026-11-02T12:00:00Z'))).toBe(0)
    expect(daysLeftInTrash(testRecipeInTrash.deletedAt!, new Date('2026-11-02T12:00:00Z'))).toBe(1)
    expect(await purgeExpiredTrash(db, new Date('2026-11-04T12:00:00Z'))).toBe(1)
    expect(await db.recipes.get(testRecipeInTrash.id)).toBeUndefined()
    expect(await db.recipes.get(testRecipe.id)).toEqual(testRecipe)
  })
})

describe('Bilder verkleinern – Größenberechnung', () => {
  it('längste Seite höchstens 1600 px, Seitenverhältnis bleibt, nie vergrößern', async () => {
    const { fitWithin } = await import('./images')
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(1170, 2532)).toEqual({ width: 739, height: 1600 })
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })
})
