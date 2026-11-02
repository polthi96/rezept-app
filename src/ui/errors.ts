import { BackupError } from '../backup/backup'

// Übersetzt technische Fehler in Meldungen für die Oberfläche.

/** Erkennt „Speicher voll" – egal ob vom Browser (DOMException) oder von Dexie verpackt. */
export function isQuotaError(e: unknown): boolean {
  const err = e as { name?: string; inner?: { name?: string } } | null
  return err?.name === 'QuotaExceededError' || err?.inner?.name === 'QuotaExceededError'
}

export function errorText(e: unknown, fallback: string): string {
  if (e instanceof BackupError) return e.message
  if (isQuotaError(e)) return 'Der Speicher auf dem iPhone ist voll. Bitte Platz schaffen und erneut versuchen.'
  return `${fallback}.`
}

export const DB_UNAVAILABLE_TEXT =
  'Deine Daten lassen sich gerade nicht öffnen. Bitte nichts löschen und die App ganz schließen und neu öffnen. Hilft das nicht, Claude Bescheid geben.'

export function errorName(e: unknown): string {
  return (e as { name?: string } | null)?.name ?? 'unbekannt'
}
