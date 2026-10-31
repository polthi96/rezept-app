import { AppDB } from './db'

/** Die eine Datenbank-Instanz der App (Tests erzeugen eigene). */
export const db = new AppDB()

// Öffnet eine neuere App-Version (z. B. in einem zweiten Fenster) die Datenbank mit
// höherer Version, schließen wir hier, damit die Migration dort nicht blockiert wird.
db.on('versionchange', () => {
  db.close()
  window.dispatchEvent(new CustomEvent('db-closed-for-upgrade'))
  return false
})
