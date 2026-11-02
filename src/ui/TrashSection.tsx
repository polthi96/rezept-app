import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/instance'
import { daysLeftInTrash, deletePermanently, emptyTrash, restoreFromTrash, TRASH_DAYS } from '../recipes/repo'
import { errorText } from './errors'

export function TrashSection() {
  const trashed = useLiveQuery(async () => {
    const all = await db.recipes.toArray()
    return all.filter((r) => r.deletedAt !== null).sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!))
  }, [])
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function act(action: () => Promise<unknown>, ok: string, fallback: string) {
    setMessage(null)
    try {
      await action()
      setMessage({ kind: 'ok', text: ok })
    } catch (e) {
      setMessage({ kind: 'error', text: errorText(e, fallback) })
    }
  }

  return (
    <section className="card">
      <h2>Papierkorb</h2>
      <p className="hint">Gelöschte Rezepte bleiben {TRASH_DAYS} Tage hier und werden danach automatisch endgültig gelöscht.</p>
      {!trashed?.length ? (
        <p className="muted">Der Papierkorb ist leer.</p>
      ) : (
        <>
          <ul className="trash-list">
            {trashed.map((r) => (
              <li key={r.id}>
                <span>
                  <strong>{r.title}</strong>
                  <span className="muted small"> · noch {daysLeftInTrash(r.deletedAt!)} Tage</span>
                </span>
                <span className="row">
                  <button className="btn" onClick={() => void act(() => restoreFromTrash(db, r.id), `„${r.title}" ist zurück.`, 'Zurückholen fehlgeschlagen')}>
                    Zurückholen
                  </button>
                  <button
                    className="btn btn-quiet"
                    onClick={() => {
                      if (window.confirm(`„${r.title}" endgültig löschen? Das kann nicht rückgängig gemacht werden.`)) {
                        void act(() => deletePermanently(db, [r.id]), `„${r.title}" wurde endgültig gelöscht.`, 'Löschen fehlgeschlagen')
                      }
                    }}
                  >
                    Endgültig löschen
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm(`Alle ${trashed.length} Rezepte im Papierkorb endgültig löschen? Das kann nicht rückgängig gemacht werden.`)) {
                void act(() => emptyTrash(db), 'Papierkorb geleert.', 'Leeren fehlgeschlagen')
              }
            }}
          >
            Papierkorb leeren
          </button>
        </>
      )}
      {message && (
        <p className={message.kind === 'ok' ? 'msg-ok' : 'msg-error'} role={message.kind === 'ok' ? 'status' : 'alert'}>
          {message.text}
        </p>
      )}
    </section>
  )
}
