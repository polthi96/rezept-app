import { useEffect, useSyncExternalStore } from 'react'

// Gründe, die einen App-Neustart gerade verbieten (z. B. „Kochmodus läuft",
// „ungespeicherte Änderungen"). Solange einer aktiv ist, bleibt „Jetzt neu starten" gesperrt.

const blockers = new Map<number, string>()
const listeners = new Set<() => void>()
let nextId = 1
let snapshot: string[] = []

function emit() {
  snapshot = [...blockers.values()]
  listeners.forEach((l) => l())
}

export function blockUpdates(reason: string): () => void {
  const id = nextId++
  blockers.set(id, reason)
  emit()
  return () => {
    blockers.delete(id)
    emit()
  }
}

export function getUpdateBlockers(): string[] {
  return snapshot
}

export function useUpdateBlockers(): string[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
  )
}

/** Sperrt Updates, solange `active` wahr ist. */
export function useBlockUpdates(active: boolean, reason: string): void {
  useEffect(() => (active ? blockUpdates(reason) : undefined), [active, reason])
}
