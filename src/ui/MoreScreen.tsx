import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../db/instance'
import { countData, getLastBackupAt, setSetting } from '../db/db'
import { SETTING_LAST_BACKUP } from '../db/schema'
import { createBackup, parseAndValidateBackup, restoreBackup, type ValidatedBackup } from '../backup/backup'
import { formatBytes, getStorageStatus, type StorageStatus } from '../storage'
import { useBlockUpdates } from '../update/updateBlockers'
import { checkForUpdateNow } from '../update/UpdateBanner'
import { addSelfTestData, removeSelfTestData } from '../selftest'
import { DB_UNAVAILABLE_TEXT, errorText } from './errors'
import { TrashSection } from './TrashSection'

type Message = { kind: 'ok' | 'error'; text: string } | null
type ExportResult = 'saved' | 'cancelled' | 'failed'

export function MoreScreen({ dataVersion, onDataChanged }: { dataVersion: number; onDataChanged: () => void }) {
  return (
    <div className="stack">
      <BackupSection onDataChanged={onDataChanged} />
      <TrashSection />
      <StorageSection />
      <SelfTestSection dataVersion={dataVersion} onDataChanged={onDataChanged} />
      <AppSection />
    </div>
  )
}

/** Meldung, die VoiceOver vorliest: Erfolg höflich, Fehler sofort. */
function Notice({ message }: { message: Message }) {
  if (!message) return null
  return (
    <p className={message.kind === 'ok' ? 'msg-ok' : 'msg-error'} role={message.kind === 'ok' ? 'status' : 'alert'}>
      {message.text}
    </p>
  )
}

// ---------- Datensicherung ----------

function BackupSection({ onDataChanged }: { onDataChanged: () => void }) {
  const [lastBackup, setLastBackup] = useState<string | undefined>()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<Message>(null)
  const [pending, setPending] = useState<ValidatedBackup | null>(null)
  const [preBackup, setPreBackup] = useState<Message>(null)
  const [restoreError, setRestoreError] = useState<Message>(null)
  const [confirmed, setConfirmed] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useBlockUpdates(busy !== null || pending !== null, 'Datensicherung läuft')

  const refresh = useCallback(() => {
    getLastBackupAt(db)
      .then(setLastBackup)
      .catch(() => setMessage({ kind: 'error', text: DB_UNAVAILABLE_TEXT }))
  }, [])
  useEffect(refresh, [refresh])

  /** Erstellt ein Backup und bietet es zum Speichern an. Meldet, ob es wirklich gespeichert wurde. */
  async function exportBackup(report: (m: Message) => void): Promise<ExportResult> {
    setBusy('export')
    report(null)
    try {
      const { text, filename, summary } = await createBackup(db, __APP_VERSION__)
      if (!(await saveFile(text, filename))) {
        report({ kind: 'error', text: 'Nicht gesichert – das Speichern wurde abgebrochen.' })
        return 'cancelled'
      }
      await setSetting(db, SETTING_LAST_BACKUP, summary.createdAt)
      refresh()
      report({ kind: 'ok', text: `Gesichert und geprüft: ${describe(summary.recipes, summary.images)}.` })
      return 'saved'
    } catch (e) {
      report({ kind: 'error', text: `Nicht gesichert: ${errorText(e, 'Backup konnte nicht erstellt werden')}` })
      return 'failed'
    } finally {
      setBusy(null)
    }
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return
    setBusy('check')
    setMessage(null)
    setPending(null)
    setPreBackup(null)
    setRestoreError(null)
    setConfirmed(false)
    try {
      setPending(await parseAndValidateBackup(await file.text()))
    } catch (e) {
      setMessage({ kind: 'error', text: `${errorText(e, 'Datei konnte nicht gelesen werden')} Deine Daten wurden nicht verändert.` })
    } finally {
      setBusy(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function restore() {
    if (!pending) return
    setBusy('restore')
    setRestoreError(null)
    try {
      await restoreBackup(db, pending)
      setMessage({ kind: 'ok', text: `Wiederhergestellt: ${describe(pending.summary.recipes, pending.summary.images)}.` })
      setPending(null)
      refresh()
      onDataChanged()
    } catch (e) {
      setRestoreError({ kind: 'error', text: `${errorText(e, 'Wiederherstellung fehlgeschlagen')} Dein bisheriger Stand ist unverändert.` })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card">
      <h2>Datensicherung</h2>
      <p className="muted">
        Letztes Backup: <strong>{lastBackup ? formatDate(lastBackup) : 'noch keins'}</strong>
      </p>
      <p className="hint">
        Deine Daten liegen nur auf diesem iPhone. Sie gehen verloren, wenn du die App vom Startbildschirm löschst,
        Safari-Daten löschst oder das iPhone wechselst. <strong>Nur ein Backup schützt sie.</strong> Speichere die Datei
        in „Dateien" → iCloud Drive.
      </p>
      <div className="row">
        <button className="btn btn-primary" onClick={() => void exportBackup(setMessage)} disabled={busy !== null}>
          {busy === 'export' && !pending ? 'Erstelle …' : 'Backup erstellen'}
        </button>
        <button className="btn" onClick={() => fileInput.current?.click()} disabled={busy !== null}>
          {busy === 'check' ? 'Prüfe …' : 'Wiederherstellen …'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => void chooseFile(e.target.files?.[0])}
        />
      </div>

      {!pending && <Notice message={message} />}

      {pending && (
        <div className="restore-box">
          <h3>
            Backup geprüft <span aria-hidden="true">✓</span>
          </h3>
          <p>
            Erstellt am <strong>{formatDate(pending.summary.createdAt)}</strong> (App-Version {pending.summary.appVersion})
            mit {describe(pending.summary.recipes, pending.summary.images)}.
          </p>
          <p className="warn-text">
            Beim Wiederherstellen werden <strong>alle aktuellen Daten ersetzt</strong>. Alles, was du nach diesem Backup
            angelegt hast, ist danach weg.
          </p>
          <button className="btn" onClick={() => void exportBackup(setPreBackup)} disabled={busy !== null}>
            {busy === 'export' ? 'Sichere …' : 'Vorher aktuellen Stand sichern'}
          </button>
          <Notice message={preBackup} />
          <label className="check">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            Ich möchte alle aktuellen Daten durch dieses Backup ersetzen.
          </label>
          <div className="row">
            <button className="btn btn-danger" onClick={restore} disabled={!confirmed || busy !== null}>
              {busy === 'restore' ? 'Stelle wieder her …' : 'Jetzt ersetzen'}
            </button>
            <button className="btn" onClick={() => setPending(null)} disabled={busy !== null}>
              Abbrechen
            </button>
          </div>
          {!confirmed && <p className="hint">„Jetzt ersetzen" ist erst nach dem Häkchen möglich.</p>}
          <Notice message={restoreError} />
        </div>
      )}
    </section>
  )
}

/** Bietet die Datei zum Speichern an. Liefert false, wenn du abgebrochen hast. */
async function saveFile(text: string, filename: string): Promise<boolean> {
  const file = new File([text], filename, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false
      throw e
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}

// ---------- Speicher ----------

function StorageSection() {
  const [status, setStatus] = useState<StorageStatus | null>(null)
  useEffect(() => void getStorageStatus().then(setStatus), [])

  return (
    <section className="card">
      <h2>Speicher</h2>
      <p className="muted">
        Schutz vor Aufräumen durch iOS:{' '}
        <strong>{status?.persisted === true ? 'an' : status?.persisted === false ? 'aus' : 'unbekannt'}</strong>
        {status?.usageBytes != null && <> · belegt: {formatBytes(status.usageBytes)}</>}
      </p>
      <p className="hint">Schützt nur davor, dass iOS bei Platzmangel aufräumt – ersetzt kein Backup.</p>
    </section>
  )
}

// ---------- Selbsttest ----------

function SelfTestSection({ dataVersion, onDataChanged }: { dataVersion: number; onDataChanged: () => void }) {
  const [counts, setCounts] = useState<{ recipes: number; images: number } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [message, setMessage] = useState<Message>(null)

  const refresh = useCallback(async () => {
    try {
      setCounts(await countData(db))
      const img = await db.images.toCollection().last()
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old)
        return img ? URL.createObjectURL(new Blob([img.data], { type: img.mime })) : null
      })
    } catch {
      setMessage({ kind: 'error', text: DB_UNAVAILABLE_TEXT })
    }
  }, [])
  // Lädt neu, wann immer sich Daten geändert haben (auch durch eine Wiederherstellung).
  useEffect(() => void refresh(), [refresh, dataVersion])
  // Bildvorschau beim Verlassen freigeben.
  useEffect(() => () => setPreview((old) => (old && URL.revokeObjectURL(old), null)), [])

  async function run(action: () => Promise<void>) {
    setMessage(null)
    try {
      await action()
      onDataChanged()
    } catch (e) {
      setMessage({ kind: 'error', text: errorText(e, 'Speichern fehlgeschlagen') })
    }
  }

  return (
    <section className="card">
      <h2>Selbsttest</h2>
      <p className="hint">
        Zum Ausprobieren von Speichern, Backup und Wiederherstellen, solange es noch keine Rezept-Eingabe gibt.
      </p>
      <p className="muted">Gespeichert: {counts ? describe(counts.recipes, counts.images) : '…'}</p>
      {preview && <img className="test-preview" src={preview} alt="Zuletzt gespeichertes Testbild" />}
      <div className="row">
        <button className="btn" onClick={() => void run(() => addSelfTestData(db))}>
          Testdaten anlegen
        </button>
        <button className="btn" onClick={() => void run(() => removeSelfTestData(db))}>
          Testdaten entfernen
        </button>
      </div>
      <Notice message={message} />
    </section>
  )
}

// ---------- App ----------

function AppSection() {
  const [state, setState] = useState<Message>(null)
  return (
    <section className="card">
      <h2>App</h2>
      <p className="muted">
        Version {__APP_VERSION__} · erstellt {formatDate(__BUILD_TIME__)}
      </p>
      <div className="row">
        <button
          className="btn"
          onClick={async () => {
            setState({ kind: 'ok', text: 'Suche …' })
            try {
              const ok = await checkForUpdateNow()
              setState(
                ok
                  ? { kind: 'ok', text: 'Geprüft. Ist eine neue Version da, erscheint oben ein Hinweis.' }
                  : { kind: 'error', text: 'Update-Suche ist nur in der installierten App möglich.' },
              )
            } catch {
              setState({ kind: 'error', text: 'Update-Suche fehlgeschlagen. Bitte später noch einmal versuchen.' })
            }
          }}
        >
          Nach Updates suchen
        </button>
      </div>
      <Notice message={state} />
    </section>
  )
}

// ---------- Hilfen ----------

function describe(recipes: number, images: number): string {
  return `${recipes} ${recipes === 1 ? 'Rezept' : 'Rezepte'}, ${images} ${images === 1 ? 'Bild' : 'Bilder'}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}
