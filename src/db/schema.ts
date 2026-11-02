import type { Transaction } from 'dexie'
import { imageV1toV2, recipeV1toV2 } from './migrations'

// Datenmodell und Versionsgeschichte der lokalen Datenbank.
//
// REGELN (siehe docs/DATENBANK.md):
// 1. Bestehende Einträge in SCHEMA_VERSIONS nie ändern oder löschen – nur neue anhängen.
// 2. Jede neue Version, die Daten umbaut, bekommt eine `upgrade`-Funktion und einen Test.
// 3. Daten dürfen umgebaut, aber nie stillschweigend verworfen werden.
// 4. Neue Tabellen auch in BACKUP_TABLES (src/backup/backup.ts) aufnehmen – ein Test prüft das.
// 5. Neue Felder auch in der Backup-Prüfung (src/backup/validate.ts) prüfen – mit Test.

export interface Ingredient {
  id: string
  /** z. B. „Zwiebel", „passierte Tomaten" */
  name: string
  /** Menge als Zahl (0,5 für ½). null = keine Menge („Salz nach Geschmack"). */
  amount: number | null
  /** Obergrenze bei Bereichen („2–3 Zehen"), sonst null. */
  amountMax: number | null
  /** Freie Einheit: „g", „Dose", „Bund" … oder leer. */
  unit: string
  /** Hinweis: „nach Geschmack", „fein gehackt" … oder leer. */
  note: string
  optional: boolean
}

export interface Step {
  id: string
  text: string
  /** Optionale Timer-Dauer für diesen Schritt (für den Kochmodus in Phase 2). */
  timerSeconds: number | null
}

export interface Recipe {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  /** Gesetzt, wenn das Rezept im Papierkorb liegt. */
  deletedAt: string | null
  /** Link zum Video/zur Quelle (nur http/https). */
  sourceUrl: string | null
  servings: number | null
  activeMinutes: number | null
  totalMinutes: number | null
  tags: string[]
  /** 1 = Favorit, 0 = nicht (Zahl statt true/false, damit es indiziert werden kann). */
  favorite: 0 | 1
  ingredients: Ingredient[]
  steps: Step[]
}

export interface ImageRecord {
  id: string
  /** Rezept, zu dem das Bild gehört (null = noch nicht zugeordnet). */
  recipeId: string | null
  /** Reihenfolge innerhalb des Rezepts; das erste Bild ist das Vorschaubild. */
  position: number
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
  {
    // Phase 1: vollständige Rezepte (Zutaten, Schritte, Zeiten, Schlagwörter, Favorit) und Bildreihenfolge.
    version: 2,
    stores: {
      recipes: 'id, updatedAt, deletedAt, favorite, *tags',
      images: 'id, recipeId, [recipeId+position]',
    },
    upgrade: async (tx) => {
      await tx
        .table('recipes')
        .toCollection()
        .modify((r: Record<string, unknown>) => {
          Object.assign(r, recipeV1toV2(r))
        })
      await tx
        .table('images')
        .toCollection()
        .modify((img: Record<string, unknown>) => {
          Object.assign(img, imageV1toV2(img))
        })
    },
  },
]

export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSIONS[SCHEMA_VERSIONS.length - 1].version

export const SETTING_LAST_BACKUP = 'lastBackupAt'
