# Datenbank: Versionen und Migrationen

Die Daten liegen auf dem Gerät in IndexedDB (Datenbankname `rezept-app`), verwaltet mit Dexie.

## Wo was steht

| Datei | Inhalt |
|---|---|
| `src/db/schema.ts` | Datentypen und **Versionsgeschichte** (`SCHEMA_VERSIONS`) |
| `src/db/db.ts` | Datenbank-Klasse, die alle Versionen der Reihe nach anwendet |
| `src/backup/backup.ts` | Backup-Format, Prüfung, Wiederherstellung, `BACKUP_MIGRATIONS` |

## Regeln

1. Einträge in `SCHEMA_VERSIONS` werden **nie geändert oder gelöscht** – nur neue Versionen angehängt (lückenlos 1, 2, 3 …).
2. Baut eine neue Version Daten um, bekommt sie eine `upgrade`-Funktion. Daten werden umgebaut, nie stillschweigend verworfen.
3. Für jede `upgrade`-Funktion gibt es einen **passenden Backup-Schritt** in `BACKUP_MIGRATIONS[alteVersion]`, damit ältere Backup-Dateien importierbar bleiben.
4. Neue Tabellen werden in `BACKUP_TABLES` aufgenommen (ein Test schlägt sonst fehl).
5. Jede Migration bekommt einen Test nach dem Muster in `src/db/db.test.ts` („Migrationsweg"): Daten in alter Version anlegen → mit neuer Version öffnen → Daten vollständig und korrekt umgebaut.
6. Vor dem Veröffentlichen einer Version mit Migration: Backup auf dem iPhone erstellen.
7. **Neues Feld im Datenmodell ⇒ Prüfung im Backup-Import + Test.** Die `validate…`-Funktionen in `src/backup/backup.ts` prüfen jedes Feld auf Typ und erlaubte Werte; ungeprüfte Felder dürfen nicht in die Datenbank gelangen.
8. Sobald Datenbankversion 2 existiert: Test, dass `BACKUP_MIGRATIONS` für jede Version von 1 bis zur vorletzten einen Schritt hat.

## Beispiel: neue Version hinzufügen

```ts
// src/db/schema.ts
export const SCHEMA_VERSIONS: SchemaVersion[] = [
  { version: 1, stores: { recipes: 'id, updatedAt', images: 'id, recipeId', settings: 'key' } },
  {
    version: 2,
    stores: { recipes: 'id, updatedAt, favorite' }, // nur Geändertes angeben
    upgrade: (tx) => tx.table('recipes').toCollection().modify((r) => { r.favorite = 0 }).then(() => undefined),
  },
]

// src/backup/backup.ts
const BACKUP_MIGRATIONS = {
  1: (data) => ({ ...data, recipes: data.recipes.map((r) => ({ ...r, favorite: 0 })) }),
}
```

## Was beim Update auf dem iPhone passiert

Neue App-Version → Hinweis „Neue Version verfügbar" → du tippst „Jetzt neu starten" → beim Öffnen der Datenbank führt Dexie die fehlenden `upgrade`-Schritte automatisch aus. Schlägt ein Schritt fehl, bricht Dexie die ganze Umstellung ab und die Daten bleiben in der alten Version.
