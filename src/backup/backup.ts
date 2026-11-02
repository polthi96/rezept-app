import type { AppDB } from '../db/db'
import { CURRENT_SCHEMA_VERSION, SETTING_LAST_BACKUP, type ImageRecord, type Recipe, type Setting } from '../db/schema'
import { imageV1toV2, recipeV1toV2 } from '../db/migrations'
import { arrayBufferToBase64, sha256Hex } from './encoding'
import { BackupError } from './errors'
import { validateImage, validateRecipe, validateSetting } from './validate'

export { BackupError }

// Versioniertes Backup-Format (siehe docs/KONZEPT.md, 5b).
//
// Datei = { format, formatVersion, schemaVersion, appVersion, createdAt, checksum, data }
// checksum = SHA-256 über JSON.stringify(data) – erkennt beschädigte oder veränderte Dateien.

export const BACKUP_FORMAT = 'rezept-app-backup'
export const BACKUP_FORMAT_VERSION = 1

/** Alle Tabellen, die gesichert werden. Muss alle Tabellen der Datenbank enthalten. */
export const BACKUP_TABLES = ['recipes', 'images', 'settings'] as const

type SerializedImage = Omit<ImageRecord, 'data'> & { dataBase64: string }

interface BackupData {
  recipes: Recipe[]
  images: SerializedImage[]
  settings: Setting[]
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  formatVersion: number
  schemaVersion: number
  appVersion: string
  createdAt: string
  checksum: string
  data: BackupData
}

export interface RestoreData {
  recipes: Recipe[]
  images: ImageRecord[]
  settings: Setting[]
}

export interface BackupSummary {
  createdAt: string
  appVersion: string
  schemaVersion: number
  recipes: number
  images: number
}

export interface ValidatedBackup {
  summary: BackupSummary
  data: RestoreData
}

/**
 * Migrationsschritte für Backups aus älteren Datenbankversionen:
 * BACKUP_MIGRATIONS[n] hebt die Daten von Version n auf n + 1.
 * Muss zu den `upgrade`-Funktionen in src/db/schema.ts passen.
 */
export const BACKUP_MIGRATIONS: Record<number, (data: Record<string, unknown[]>) => Record<string, unknown[]>> = {
  1: (data) => ({
    ...data,
    recipes: data.recipes.map((r) => recipeV1toV2(r as Record<string, unknown>)),
    images: data.images.map((img) => imageV1toV2(img as Record<string, unknown>)),
  }),
}

// ---------- Export ----------

export async function createBackup(
  db: AppDB,
  appVersion: string,
  now: Date = new Date(),
): Promise<{ text: string; filename: string; summary: BackupSummary }> {
  const { recipes, images, settings } = await db.transaction('r', db.recipes, db.images, db.settings, async () => ({
    recipes: await db.recipes.toArray(),
    images: await db.images.toArray(),
    settings: await db.settings.toArray(),
  }))

  const data: BackupData = {
    recipes,
    images: images.map(({ data, ...rest }) => ({ ...rest, dataBase64: arrayBufferToBase64(data) })),
    settings,
  }
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion,
    createdAt: now.toISOString(),
    checksum: await sha256Hex(JSON.stringify(data)),
    data,
  }
  const text = JSON.stringify(file)

  // Selbstprüfung: Die fertige Datei muss sich vollständig wieder einlesen lassen.
  const check = await parseAndValidateBackup(text)
  if (check.summary.recipes !== recipes.length || check.summary.images !== images.length) {
    throw new BackupError('Das Backup konnte nach dem Erstellen nicht korrekt gelesen werden.')
  }

  const day = now.toISOString().slice(0, 10)
  return { text, filename: `kochbuch-backup-${day}.json`, summary: check.summary }
}

// ---------- Prüfung ----------

/** Liest und prüft eine Backup-Datei vollständig. Verändert keine Daten. */
export async function parseAndValidateBackup(text: string): Promise<ValidatedBackup> {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('Die Datei ist beschädigt oder kein Kochbuch-Backup (kein gültiges JSON).')
  }
  if (!isObject(raw) || raw.format !== BACKUP_FORMAT) {
    throw new BackupError('Die Datei ist kein Kochbuch-Backup.')
  }
  if (typeof raw.formatVersion !== 'number' || !Number.isInteger(raw.formatVersion) || raw.formatVersion < 1) {
    throw new BackupError('Das Backup hat keine gültige Formatversion.')
  }
  if (raw.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupError('Das Backup stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.')
  }
  if (typeof raw.schemaVersion !== 'number' || !Number.isInteger(raw.schemaVersion) || raw.schemaVersion < 1) {
    throw new BackupError('Das Backup hat keine gültige Datenbankversion.')
  }
  if (raw.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new BackupError('Das Backup stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.')
  }
  if (typeof raw.createdAt !== 'string' || typeof raw.appVersion !== 'string' || typeof raw.checksum !== 'string') {
    throw new BackupError('Dem Backup fehlen Pflichtangaben.')
  }
  if (Number.isNaN(Date.parse(raw.createdAt))) {
    throw new BackupError('Das Erstelldatum des Backups ist ungültig.')
  }
  if (!isObject(raw.data)) {
    throw new BackupError('Das Backup enthält keine Daten.')
  }
  if ((await sha256Hex(JSON.stringify(raw.data))) !== raw.checksum) {
    throw new BackupError('Die Prüfsumme stimmt nicht – die Datei ist beschädigt oder wurde verändert.')
  }

  let data = raw.data as Record<string, unknown>
  for (const table of BACKUP_TABLES) {
    if (!Array.isArray(data[table])) throw new BackupError(`Im Backup fehlt der Bereich „${table}".`)
  }
  for (let v = raw.schemaVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const migrate = BACKUP_MIGRATIONS[v]
    if (!migrate) throw new BackupError(`Backups der Datenbankversion ${v} werden nicht unterstützt.`)
    data = migrate(data as Record<string, unknown[]>)
    for (const table of BACKUP_TABLES) {
      if (!Array.isArray(data[table])) throw new BackupError(`Backup konnte nicht umgewandelt werden („${table}").`)
    }
  }

  const recipes = (data.recipes as unknown[]).map((r, i) => validateRecipe(r, i))
  const recipeIds = new Set(recipes.map((r) => r.id))
  const images = (data.images as unknown[]).map((img, i) => validateImage(img, i, recipeIds))
  const settings = (data.settings as unknown[]).map((s, i) => validateSetting(s, i))
  assertUnique(recipes.map((r) => r.id), 'Rezept')
  assertUnique(images.map((r) => r.id), 'Bild')
  assertUnique(settings.map((r) => r.key), 'Einstellung')

  return {
    summary: {
      createdAt: raw.createdAt,
      appVersion: raw.appVersion,
      schemaVersion: raw.schemaVersion,
      recipes: recipes.length,
      images: images.length,
    },
    data: { recipes, images, settings },
  }
}

// ---------- Wiederherstellung ----------

/**
 * Modus „Ersetzen": Alle aktuellen Daten werden durch das Backup ersetzt –
 * in EINER Transaktion. Schlägt irgendein Schritt fehl, bleibt der alte Stand unverändert.
 * Nur mit einem Ergebnis von parseAndValidateBackup aufrufen.
 */
export async function restoreBackup(db: AppDB, backup: ValidatedBackup, now: Date = new Date()): Promise<void> {
  const { recipes, images, settings } = backup.data
  // Ein Datum in der Zukunft würde die Backup-Erinnerung aushebeln – höchstens „jetzt".
  const backupTime = Math.min(Date.parse(backup.summary.createdAt), now.getTime())
  await db.transaction('rw', db.recipes, db.images, db.settings, async () => {
    await Promise.all([db.recipes.clear(), db.images.clear(), db.settings.clear()])
    await db.recipes.bulkAdd(recipes)
    await db.images.bulkAdd(images)
    await db.settings.bulkAdd(settings.filter((s) => s.key !== SETTING_LAST_BACKUP))
    // Der wiederhergestellte Stand entspricht genau diesem Backup.
    await db.settings.put({ key: SETTING_LAST_BACKUP, value: new Date(backupTime).toISOString() })
  })
}

// ---------- Hilfen ----------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function assertUnique(ids: string[], label: string): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) throw new BackupError(`${label} „${id}" kommt im Backup doppelt vor.`)
    seen.add(id)
  }
}
