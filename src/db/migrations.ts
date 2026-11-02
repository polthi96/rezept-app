// Umbau-Schritte zwischen Datenbankversionen.
// Werden SOWOHL beim Datenbank-Upgrade (schema.ts) ALS AUCH beim Import alter Backups
// (backup.ts, BACKUP_MIGRATIONS) verwendet – so bleiben beide Wege garantiert gleich.

type Rec = Record<string, unknown>

/** Version 1 → 2: Rezepte bekommen alle neuen Felder mit leeren Standardwerten. Vorhandene Werte bleiben. */
export function recipeV1toV2(r: Rec): Rec {
  return {
    deletedAt: null,
    sourceUrl: null,
    servings: null,
    activeMinutes: null,
    totalMinutes: null,
    tags: [],
    favorite: 0,
    ingredients: [],
    steps: [],
    ...r,
    // Ein in Version 1 fehlendes Papierkorb-Datum heißt „nicht gelöscht".
    ...(r.deletedAt === undefined ? { deletedAt: null } : {}),
  }
}

/** Version 1 → 2: Bilder bekommen eine Reihenfolge. */
export function imageV1toV2(img: Rec): Rec {
  return { position: 0, ...img }
}
