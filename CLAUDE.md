# Kochbuch – Rezept- & Ernährungs-App (PWA fürs iPhone)

Konzept und Phasenplan: `docs/KONZEPT.md` (verbindlich, inkl. Abschnitt 7a „Anforderungen je Phase").

## Arbeitsregeln
- **Jede neue Phase nur nach ausdrücklicher Freigabe** des Nutzers.
- Nach jeder Phase: `npm test` + `npm run build`, dann `/phasencheck` empfehlen und `docs/SELBSTTEST.md` ergänzen.
- Nach Phase 3 kommt ein **Alltagstest mit ca. zehn echten Rezepten** – vorher keine neuen Funktionen.
- Nie behaupten, etwas sei auf dem iPhone geprüft, wenn es nur im Mac-Browser/Test lief.

## Technik
- React + TypeScript + Vite, Dexie (IndexedDB), vite-plugin-pwa (`registerType: 'prompt'`), Vitest + fake-indexeddb.
- Veröffentlichung: GitHub Pages über `.github/workflows/deploy.yml`, feste Basis `/rezept-app/` (in `vite.config.ts`). **Basis/Repository-Name nie ändern** – lokale Daten hängen an der Adresse.

## Befehle
- `npm run dev` · `npm test` · `npm run build` · `npm run preview` (Port 4173)
- Offline/Update nur in `build` + `preview` testbar. Der eingebaute Browser der Desktop-App registriert keine Service Worker.

## Daten & Sicherheit
- Daten nur lokal auf dem Gerät. Externe Dienste nur nach Konzept und Zustimmung (KI/Garmin erst Phase 6/7).
- Datenbank-Änderungen nur nach `docs/DATENBANK.md` (neue Version anhängen, Migration + Backup-Migration + Test).
- Backup: versioniertes Format, vollständige Prüfung vor jeder Änderung, Wiederherstellung atomar („Ersetzen"). Änderungen daran immer mit Tests in `src/backup/backup.test.ts`.
- Was ungespeicherte Eingaben hat oder den Kochmodus betreibt, sperrt Updates mit `useBlockUpdates(...)` (`src/update/updateBlockers.ts`).
- Keine echten persönlichen Daten oder Zugangsdaten in Code, Tests, Beispieldaten oder Repository. Backup-Dateien sind per `.gitignore` ausgeschlossen.
- Unumkehrbare Aktionen nur mit Bestätigung; Papierkorb statt endgültigem Löschen.
