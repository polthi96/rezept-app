import type { AppDB } from './db/db'

// Testdaten für den Selbsttest auf dem iPhone (Phase 0 hat noch keine Rezept-Eingabe).
// Klar erkennbar am Präfix „selbsttest-" und vollständig wieder entfernbar.

const PREFIX = 'selbsttest-'

export async function addSelfTestData(db: AppDB): Promise<void> {
  const now = new Date().toISOString()
  const recipeId = `${PREFIX}${crypto.randomUUID()}`
  const image = await drawTestImage()
  await db.transaction('rw', db.recipes, db.images, async () => {
    await db.recipes.add({ id: recipeId, title: `Testrezept ${new Date().toLocaleTimeString('de-DE')}`, createdAt: now, updatedAt: now, deletedAt: null })
    await db.images.add({ id: `${PREFIX}${crypto.randomUUID()}`, recipeId, mime: 'image/png', data: image.data, width: image.width, height: image.height, createdAt: now })
  })
}

export async function removeSelfTestData(db: AppDB): Promise<void> {
  await db.transaction('rw', db.recipes, db.images, async () => {
    await db.images.filter((i) => i.id.startsWith(PREFIX)).delete()
    await db.recipes.filter((r) => r.id.startsWith(PREFIX)).delete()
  })
}

async function drawTestImage(): Promise<{ data: ArrayBuffer; width: number; height: number }> {
  const width = 240
  const height = 160
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#c4552d'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 50, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c4552d'
  ctx.font = 'bold 22px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('TEST', width / 2, height / 2 + 8)
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht erzeugt werden'))), 'image/png'),
  )
  return { data: await blob.arrayBuffer(), width, height }
}
