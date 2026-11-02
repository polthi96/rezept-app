import { useCallback, useEffect, useState } from 'react'
import { db } from '../db/instance'
import { countData, getLastBackupAt } from '../db/db'
import { UpdateBanner } from '../update/UpdateBanner'
import { MoreScreen } from './MoreScreen'
import { DB_UNAVAILABLE_TEXT, errorName } from './errors'

type Tab = 'today' | 'recipes' | 'plan' | 'more'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Heute', icon: '☀︎' },
  { id: 'recipes', label: 'Rezepte', icon: '📖' },
  { id: 'plan', label: 'Plan', icon: '🗓' },
  { id: 'more', label: 'Mehr', icon: '⋯' },
]

const BACKUP_REMINDER_DAYS = 7

export function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [backupDue, setBackupDue] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [dataVersion, setDataVersion] = useState(0)
  const onDataChanged = useCallback(() => setDataVersion((v) => v + 1), [])

  useEffect(() => {
    void (async () => {
      try {
        const [counts, last] = await Promise.all([countData(db), getLastBackupAt(db)])
        setDbError(null)
        const hasData = counts.recipes + counts.images > 0
        const lastTime = last ? new Date(last).getTime() : NaN
        // Ungültiges Datum zählt wie „kein Backup" – die Erinnerung darf nie still ausfallen.
        const old = Number.isNaN(lastTime) || Date.now() - lastTime > BACKUP_REMINDER_DAYS * 86_400_000
        setBackupDue(hasData && old)
      } catch (e) {
        setDbError(errorName(e))
      }
    })()
  }, [dataVersion, tab])

  return (
    <div className="app">
      <header className="topbar">
        <h1>{TABS.find((t) => t.id === tab)!.label}</h1>
      </header>
      {dbError && (
        <div className="banner banner-error" role="alert">
          <p>{DB_UNAVAILABLE_TEXT}</p>
          <p className="muted">Fehler: {dbError}</p>
        </div>
      )}
      <UpdateBanner />
      {backupDue && tab !== 'more' && (
        <button className="banner banner-warn banner-link" onClick={() => setTab('more')}>
          Dein letztes Backup ist älter als {BACKUP_REMINDER_DAYS} Tage. Jetzt sichern →
        </button>
      )}
      <main className="content">
        {tab === 'today' && <Placeholder phase="5" text="Hier siehst du bald deine Tagesübersicht mit Kalorien und Makros." />}
        {tab === 'recipes' && <Placeholder phase="1" text="Hier sammelst du bald deine Rezepte." />}
        {tab === 'plan' && <Placeholder phase="4" text="Hier planst du bald deine Woche und die Einkaufsliste." />}
        {tab === 'more' && <MoreScreen dataVersion={dataVersion} onDataChanged={onDataChanged} />}
      </main>
      <nav className="tabbar" aria-label="Hauptmenü">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? 'tab active' : 'tab'}
            aria-current={t.id === tab ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon" aria-hidden="true">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Placeholder({ phase, text }: { phase: string; text: string }) {
  return (
    <div className="placeholder">
      <p>{text}</p>
      <p className="muted">Kommt in Phase {phase}.</p>
    </div>
  )
}
