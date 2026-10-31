import Dexie, { type Table } from 'dexie'
import { SCHEMA_VERSIONS, SETTING_LAST_BACKUP, type ImageRecord, type Recipe, type SchemaVersion, type Setting } from './schema'

export const DB_NAME = 'rezept-app'

export class AppDB extends Dexie {
  recipes!: Table<Recipe, string>
  images!: Table<ImageRecord, string>
  settings!: Table<Setting, string>

  constructor(name: string = DB_NAME, versions: SchemaVersion[] = SCHEMA_VERSIONS) {
    super(name)
    for (const v of versions) {
      const version = this.version(v.version).stores(v.stores)
      if (v.upgrade) version.upgrade(v.upgrade)
    }
  }
}

export async function getSetting<T>(db: AppDB, key: string): Promise<T | undefined> {
  const row = await db.settings.get(key)
  return row?.value as T | undefined
}

export async function setSetting(db: AppDB, key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

export async function getLastBackupAt(db: AppDB): Promise<string | undefined> {
  return getSetting<string>(db, SETTING_LAST_BACKUP)
}

export async function countData(db: AppDB): Promise<{ recipes: number; images: number }> {
  const [recipes, images] = await Promise.all([db.recipes.count(), db.images.count()])
  return { recipes, images }
}
