// Bittet den Browser um „dauerhaften Speicher" und liest den Speicherstatus.
// Wichtig: Das schützt nur vor automatischem Aufräumen – es ersetzt KEIN Backup.

export interface StorageStatus {
  persisted: boolean | null
  usageBytes: number | null
  quotaBytes: number | null
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const persisted = navigator.storage?.persisted ? await navigator.storage.persisted().catch(() => null) : null
  const estimate = navigator.storage?.estimate ? await navigator.storage.estimate().catch(() => null) : null
  return {
    persisted,
    usageBytes: estimate?.usage ?? null,
    quotaBytes: estimate?.quota ?? null,
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}
