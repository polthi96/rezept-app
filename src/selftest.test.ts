import { describe, expect, it } from 'vitest'
import { removeSelfTestData } from './selftest'
import { freshDb, makeRecipe, seed, testImage, testRecipe } from './test/fixtures'

describe('Selbsttest-Daten', () => {
  it('„Testdaten entfernen" löscht nur Testdaten, keine echten Daten', async () => {
    const db = freshDb()
    await seed(db)
    await db.recipes.add(makeRecipe({ id: 'selbsttest-1', title: 'Testrezept' }))
    await db.images.add({ ...testImage(), id: 'selbsttest-2', recipeId: 'selbsttest-1' })

    await removeSelfTestData(db)

    expect(await db.recipes.get('selbsttest-1')).toBeUndefined()
    expect(await db.images.get('selbsttest-2')).toBeUndefined()
    expect(await db.recipes.get(testRecipe.id)).toEqual(testRecipe)
    expect(await db.recipes.count()).toBe(2)
    expect(await db.images.count()).toBe(1)
    expect(await db.settings.count()).toBe(1)
  })
})
