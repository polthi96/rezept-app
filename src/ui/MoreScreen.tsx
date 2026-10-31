import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../db/instance'
import { countData, getLastBackupAt, setSetting } from '../db/db'
import { SETTING_LAST_BACKUP } from '../db/schema'
import { BackupError, createBackup, parseAndValidateBackup, restoreBackup, type ValidatedBackup } from '../backup/backup'
import { formatBytes, getStorageStatus, type StorageStatus } from '../storage'
import { useBlockUpdates } from '../update/updateBlockers'
import { checkForUpdateNow } from '../update/UpdateBanner'
import { addSelfTestData, removeSelfTestData } from '../selftest'

type Message = { kind: 'ok' | 'error'; text: string } | null

export function MoreScreen({ dataVersion, onDataChanged }: { dataVersion: number; onDataChanged: () => void }) {
  return (
    <div className="stack">
      <BackupSection onDataChanged={onDataChanged} />
      <StorageSection />
      <SelfTestSection dataVersion={dataVersion} onDataChanged={onDataChanged} />
      <AppSection />
    </div>
  )
}

// ---------- Datensicherung ----------

function BackupSection({ onDataChanged }: { onDataChanged: () => void }) {
  const [lastBackup, setLastBackup] = useState<string | undefined>()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<Message>(null)
  const [pending, setPending] = useState<ValidatedBackup | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useBlockUpdates(busy !== null || pending !== null, 'Datensicherung läuft')

  const refresh = useCallback(() => void getLastBackupAt(db).then(setLastBackup), [])
  useEffect(refresh, [refresh])

  async function exportBackup() {
    setBusy('export')
    setMessage(null)
    try {
      const { text, filename, summary } = await createBackup(db, __APP_VERSION__)
      const saved = await saveFile(text, filename)
      if (saved) {
        await setSetting(db, SETTING_LAST_BACKUP, summary.createdAt)
        refresh()
        setMessage({ kind: 'ok', text: `Backup erstellt und geprüft: ${describe(summary.recipes, summary.images)}.` })
      }
    } catch (e) {
      setMessage({ kind: 'error', text: errorText(e, 'Backup konnte nicht erstellt werden') })
    } finally {
      setBusy(null)
    }
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return
    setBusy('check')
    setMessage(null)
    setPending(null)
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
    setMessage(null)
    try {
      await restoreBackup(db, pending)
      setMessage({ kind: 'ok', text: `Wiederhergestellt: ${describe(pending.summary.recipes, pending.summary.images)}.` })
      setPending(null)
      refresh()
      onDataChanged()
    } catch (e) {
      setMessage({ kind: 'error', text: `${errorText(e, 'Wiederherstellung fehlgeschlagen')} Dein bisheriger Stand ist unverändert.` })
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
        <button className="btn btn-primary" onClick={exportBackup} disabled={busy !== null}>
          {busy === 'export' ? 'Erstelle …' : 'Backup erstellen'}
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

      {pending && (
        <div className="restore-box">
          <h3>Backup geprüft ✓</h3>
          <p>
            Erstellt am <strong>{formatDate(pending.summary.createdAt)}</strong> (App-Version {pending.summary.appVersion}
            ) mit {describe(pending.summary.recipes, pending.summary.images)}.
          </p>
          <p className="warn-text">
            Beim Wiederherstellen werden <strong>alle aktuellen Daten ersetzt</strong>. Alles, was du nach diesem Backup
            angelegt hast, ist danach weg.
          </p>
          <button className="btn" onClick={exportBackup} disabled={busy !== null}>
            Vorher aktuellen Stand sichern
          </button>
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
        </div>
      )}

      {message && <p className={message.kind === 'ok' ? 'msg-ok' : 'msg-error'}>{message.text}</p>}
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
        Dauerhafter Speicher:{' '}
        <strong>{status?.persisted === true ? 'aktiv' : status?.persisted === false ? 'nicht gewährt' : 'unbekannt'}</strong>
        {status?.usageBytes != null && <> · belegt: {formatBytes(status.usageBytes)}</>}
      </p>
      <p className="hint">Schützt nur vor automatischem Aufräumen durch iOS – ersetzt kein Backup.</p>
    </section>
  )
}

// ---------- Selbsttest ----------

function SelfTestSection({ dataVersion, onDataChanged }: { dataVersion: number; onDataChanged: () => void }) {
  const [counts, setCounts] = useState<{ recipes: number; images: number } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [message, setMessage] = useState<Message>(null)

  const refresh = useCallback(async () => {
    setCounts(await countData(db))
    const img = await db.images.toCollection().last()
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old)
      return img ? URL.createObjectURL(new Blob([img.data], { type: img.mime })) : null
    })
  }, [])
  // Lädt neu, wann immer sich Daten geändert haben (auch durch eine Wiederherstellung).
  useEffect(() => void refresh(), [refresh, dataVersion])

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
      {message && <p className="msg-error">{message.text}</p>}
    </section>
  )
}

// ---------- App ----------

function AppSection() {
  const [state, setState] = useState<string | null>(null)
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
            setState('Suche …')
            const ok = await checkForUpdateNow().catch(() => false)
            setState(ok ? 'Geprüft. Ist eine neue Version da, erscheint oben ein Hinweis.' : 'Update-Suche nur in der installierten App möglich.')
          }}
        >
          Nach Updates suchen
        </button>
      </div>
      {state && <p className="hint">{state}</p>}
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

function errorText(e: unknown, fallback: string): string {
  if (e instanceof BackupError) return e.message
  if (e instanceof DOMException && e.name === 'QuotaExceededError') {
    return 'Der Speicher auf dem iPhone ist voll. Bitte Platz schaffen und erneut versuchen.'
  }
  return `${fallback}.`
}
