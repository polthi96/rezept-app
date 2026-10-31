import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useUpdateBlockers } from './updateBlockers'

const CHECK_INTERVAL_MS = 60 * 60 * 1000

let checkForUpdate: (() => Promise<void>) | null = null

/** Manuelle Update-Suche (z. B. aus „Mehr"). */
export async function checkForUpdateNow(): Promise<boolean> {
  if (!checkForUpdate) return false
  await checkForUpdate()
  return true
}

export function UpdateBanner() {
  const blockers = useUpdateBlockers()
  const [restarting, setRestarting] = useState(false)
  const [dbClosed, setDbClosed] = useState(false)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      checkForUpdate = () => registration.update().then(() => undefined)
      setInterval(() => void registration.update(), CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update()
      })
    },
  })

  useEffect(() => {
    const onClosed = () => setDbClosed(true)
    window.addEventListener('db-closed-for-upgrade', onClosed)
    return () => window.removeEventListener('db-closed-for-upgrade', onClosed)
  }, [])

  if (dbClosed) {
    return (
      <div className="banner banner-warn" role="alert">
        <p>Eine neuere Version der App wurde in einem anderen Fenster geöffnet. Bitte diese Seite neu laden.</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          Neu laden
        </button>
      </div>
    )
  }

  if (!needRefresh) return null
  const blocked = blockers.length > 0

  return (
    <div className="banner" role="status">
      <p>
        <strong>Neue Version verfügbar.</strong>{' '}
        {blocked
          ? `Neustart erst möglich, wenn du fertig bist: ${blockers.join(', ')}.`
          : 'Deine Daten bleiben erhalten.'}
      </p>
      <button
        className="btn btn-primary"
        disabled={blocked || restarting}
        onClick={() => {
          setRestarting(true)
          void updateServiceWorker(true)
        }}
      >
        {restarting ? 'Startet neu …' : 'Jetzt neu starten'}
      </button>
    </div>
  )
}
