import type { NewImage } from './repo'

// Fotos werden vor dem Speichern verkleinert (Konzept 7a):
// längste Seite höchstens 1600 px, JPEG, Ziel deutlich unter 1 MB.

export const MAX_SIDE = 1600
const TARGET_BYTES = 900 * 1024
const QUALITIES = [0.82, 0.7, 0.6]

export class ImageReadError extends Error {}

/** Größe nach dem Verkleinern (Seitenverhältnis bleibt). Nie vergrößern. */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export async function resizeImage(file: File): Promise<NewImage> {
  const img = await loadImage(file)
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageReadError('Das Bild konnte nicht verarbeitet werden.')
  ctx.fillStyle = '#ffffff' // durchsichtige PNGs bekommen weißen Hintergrund statt Schwarz
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  let blob: Blob | null = null
  for (const q of QUALITIES) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', q))
    if (blob && blob.size <= TARGET_BYTES) break
  }
  canvas.width = canvas.height = 0 // Speicher sofort freigeben (wichtig auf dem iPhone)
  if (!blob) throw new ImageReadError('Das Bild konnte nicht verkleinert werden.')
  return { mime: 'image/jpeg', data: await blob.arrayBuffer(), width, height }
}

/** Lädt über ein <img>, damit die Drehung aus der Kamera (EXIF) automatisch beachtet wird. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageReadError(`„${file.name}" konnte nicht als Bild gelesen werden.`))
    }
    img.src = url
  })
}
