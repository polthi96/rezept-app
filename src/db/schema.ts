import type { Transaction } from 'dexie'

// Datenmodell und Versionsgeschichte der lokalen Datenbank.
//
// REGELN (siehe docs/DATENBANK.md):
// 1. Bestehende Einträge in SCHEMA_VERSIONS nie ändern oder löschen – nur neue anhängen.
// 2. Jede neue Version, die Daten umbaut, bekommt eine `upgrade`-Funktion und einen Test.
// 3. Daten dürfen umgebaut, aber nie stillschweigend verworfen werden.
// 4. Neue Tabellen auch in BACKUP_TABLES (src/backup/backup.ts) aufnehmen – ein Test prüft das.

export interface Recipe {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  /** Gesetzt, wenn das Rezept im Papierkorb liegt. */
  deletedAt?: string | null
}

export interface ImageRecord {
  id: string
  /** Rezept, zu dem das Bild gehört (null = noch nicht zugeordnet). */
  recipeId: string | null
  mime: string
  /** Bilddaten als ArrayBuffer (zuverlässiger in Safari/IndexedDB als Blob). */
  data: ArrayBuffer
  width?: number
  height?: number
  createdAt: string
}

export interface Setting {
  key: string
  value: unknown
}

export interface SchemaVersion {
  version: number
  /** Dexie-Schreibweise: Primärschlüssel zuerst, dann indizierte Felder. */
  stores: Record<string, string | null>
  upgrade?: (tx: Transaction) => Promise<void> | void
}

export const SCHEMA_VERSIONS: SchemaVersion[] = [
  {
    version: 1,
    stores: {
      recipes: 'id, updatedAt',
      images: 'id, recipeId',
      settings: 'key',
    },
  },
]

export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSIONS[SCHEMA_VERSIONS.length - 1].version

export const SETTING_LAST_BACKUP = 'lastBackupAt'
