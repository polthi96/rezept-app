# Phasenbericht Phase 0 – Fundament

- **Datum:** 02.11.2026
- **Geprüfter Stand:** Commit `e10cf39` (Version 0.1.1), Zweig `main`, veröffentlicht unter https://polthi96.github.io/rezept-app/
- **Ergebnis:** Phase 0 ist stabil und erfüllt die Anforderungen. Es gibt keine kritischen Befunde. Fünf Punkte sollten vor bzw. zu Beginn von Phase 1 behoben werden.

## Automatische Prüfungen

| Prüfung | Ergebnis |
|---|---|
| Tests (`npm test`) | ✅ 19 von 19 bestanden (2 Testdateien) |
| Typprüfung (`npm run typecheck`) | ✅ fehlerfrei |
| Build (`npm run build`) | ✅ fehlerfrei, 14 Dateien für Offline-Betrieb (348 KB) |
| Abhängigkeiten der App (`npm audit --omit=dev`) | ✅ 0 Schwachstellen |
| Abhängigkeiten inkl. Bauwerkzeuge (`npm audit`) | ⚠️ 10 Warnungen (2 niedrig, 8 mittel) in workbox-build, nur beim Bauen verwendet, nicht in der App |
| Lint | – nicht eingerichtet |
| Veröffentlichung GitHub Actions | ✅ grün (Tests + Build + Deploy) |

**Abgedeckt durch Tests:** Daten bleiben nach erneutem Öffnen erhalten, Migrationsweg, Backup deckt alle Tabellen ab, Export/Wiederherstellung inkl. Bild (bytegenau), 11 Arten fehlerhafter Dateien ohne Datenänderung, atomare Wiederherstellung.

## Funktionsprüfung

- **Mac-Browser (eingebauter Browser, gebaute App, Version 0.1.1):** Reiter, Testdaten anlegen, Backup erstellen, kaputte Datei abgelehnt (Daten unverändert), Wiederherstellen mit Pflicht-Häkchen, Aufräumen → alles ✅. Einzige Konsolenmeldung: Service Worker lässt sich im eingebauten Browser nicht registrieren (bekannte Einschränkung dieses Browsers, kein App-Fehler).
- **iPhone (durch den Nutzer):** Installation, Speichern, Backup in iCloud, Wiederherstellen inkl. Bild, dauerhafter Speicher „aktiv", Update-Hinweis 0.1.0 → 0.1.1 mit Neustart, Daten danach erhalten → laut Nutzer alles ✅ (Screenshot liegt vor).

## Befunde

Status: **bestätigt** = im Code nachgeprüft · **nicht bestätigt** = trifft nicht zu.

| # | Prio | Bereich | Befund | Fundstelle | Status | Vorschlag |
|---|---|---|---|---|---|---|
| 1 | Hoch | Fehlerbehandlung | Datenbank-Fehler beim Start (z. B. lässt sich nicht öffnen) werden nicht abgefangen. Die App sähe dann leer aus, ohne Erklärung | `src/ui/App.tsx:24-30`, `src/ui/MoreScreen.tsx:36, 199-207` | bestätigt | Zentrale Fehleranzeige „Daten lassen sich gerade nicht öffnen – bitte nichts löschen" + Fehlergrenze in `main.tsx` |
| 2 | Hoch | Backup-Prüfung | Rezepte werden nur auf Pflichtfelder geprüft, weitere Felder ungeprüft übernommen. In Phase 0 folgenlos, wird mit Phase 1 (Zutaten, Nährwerte) wichtig | `src/backup/backup.ts:164-175` | bestätigt | Regel in `docs/DATENBANK.md`: neues Feld ⇒ Prüfung + Test im Backup; in Phase 1 umsetzen |
| 3 | Hoch | Wiederherstellen (Bedienung) | Die Rückmeldung von „Vorher aktuellen Stand sichern" erscheint ganz unten, evtl. außer Sicht. Bei Abbruch gibt es gar keine Meldung | `src/ui/MoreScreen.tsx:128, 146` | bestätigt | Meldung direkt unter dem Knopf in der Wiederherstellen-Box, auch „nicht gesichert" bei Abbruch |
| 4 | Hoch | Barrierefreiheit | Meldungen werden von VoiceOver nicht angesagt (kein `role="status"/"alert"`); Tab-Leiste ohne Bezeichnung und ohne `aria-current` | `src/ui/App.tsx:50-52`, `src/ui/MoreScreen.tsx:146, 235, 262` | bestätigt | Rollen und Bezeichnungen ergänzen |
| 5 | Mittel | Speicher voll | Dexie meldet „Speicher voll" mit eigenem Fehlertyp, nicht als `DOMException`. Die verständliche Meldung würde deshalb nicht erscheinen | `src/ui/MoreScreen.tsx:279` | bestätigt | Fehler am Namen erkennen + Test |
| 6 | Mittel | Kontrast | Dunkelmodus: weiße Schrift auf orangem Knopf ca. 3,6:1 (Ziel 4,5:1) | `src/styles.css:23-34, 165-170` | bestätigt (nachgerechnet) | Dunkle Schrift auf Orange im Dunkelmodus |
| 7 | Mittel | Backup-Datum | Ungültiges oder zukünftiges Erstelldatum im Backup wird nicht geprüft → Backup-Erinnerung könnte ausbleiben | `src/backup/backup.ts:124, 224` | bestätigt | Datum prüfen, auf „jetzt" begrenzen |
| 8 | Mittel | Speicherverbrauch | Beim Export liegen Bilder mehrfach im Speicher; bei vielen Fotos könnte iOS die App beenden | `src/backup/backup.ts:70-93` | bestätigt (Risiko für spätere Phasen) | In Phase 1 mit vielen Bildern testen, Bildgrößen-Limit (Konzept 7a) hilft |
| 9 | Mittel | Versionswechsel | Wird die Datenbank wegen einer neueren Version geschlossen, schlagen spätere Speicherversuche ohne klare Meldung fehl | `src/db/instance.ts:8-12` | bestätigt (ab Phase 1 relevant) | Mit Phase 1 Speichern dann mit Meldung ablehnen |
| 10 | Mittel | Bedienung | Gesperrter „Jetzt ersetzen"-Knopf ohne Erklärung; kein sichtbarer Fokusrahmen | `src/styles.css:161-163`, `src/ui/MoreScreen.tsx:136` | bestätigt | Hinweis „Erst Häkchen setzen", `:focus-visible`-Stil |
| 11 | Mittel | Git | „Kein Git-Repository" | – | **nicht bestätigt** (Git ist eingerichtet, 3 Commits, auf GitHub) | – |
| 12 | Mittel | Sicherheitskopie | Keine automatische Sicherung vor „Ersetzen", nur optionaler Knopf | `src/ui/MoreScreen.tsx:128-137` | bestätigt, entspricht Konzept 5b | Zusammen mit #3 lösen; optional Pflicht-Sicherung |
| 13–20 | Niedrig | diverse | Formatversion nicht auf ≥ 1 geprüft; Prüfung nach Backup-Migration; Blob-URL wird nicht freigegeben; Update-Prüfung-Listener; Action-Versionen per Tag; Texte „nicht gewährt"/„Geprüft"; `aria-hidden`-Schreibweise; Statusleiste im Dunkelmodus | siehe Review | teils bestätigt | Bei Gelegenheit |

## Offene Punkte / fehlende Tests

- Kein Test für die Update-Sperre (`src/update/updateBlockers.ts`).
- Backup-Tests fehlen für: ungültiges Datum, ungültige Bildmaße, leere Bilddaten, doppelte Einstellungen, Umlaute im Roundtrip, Abbruch bei fehlgeschlagener Selbstprüfung, „Speicher voll".
- Kein Test, dass „Testdaten entfernen" keine echten Daten löscht. Laut Code-Prüfung ist das sicher: Es wird nur das Präfix `selbsttest-` gelöscht.
- Test für `BACKUP_MIGRATIONS`-Vollständigkeit (wird mit Datenbankversion 2 nötig).

## Nicht geprüft

- Offline-Start im Mac-Browser (der eingebaute Browser unterstützt keine Service Worker; für Playwright ist kein Browser installiert). Auf dem iPhone durch den Nutzer bestätigt.
- VoiceOver (Bildschirmvorleser) auf dem iPhone.
- Kontrastwerte nur berechnet, nicht am Gerät gemessen.

## Korrekturen nach dem Phasencheck (02.11.2026, Version 0.1.2)

| # | Befund | Umsetzung | Prüfung |
|---|---|---|---|
| 1 | DB-Fehler unsichtbar | Fehleranzeige „Daten lassen sich gerade nicht öffnen – bitte nichts löschen" (`App.tsx`, `MoreScreen.tsx`), Fehlergrenze für die ganze App (`ErrorBoundary.tsx`) | Build, Sichtprüfung des Codes (Fehlerfall im Browser nicht auslösbar) |
| 2 | Validierung nur Pflichtfelder | Als verbindliche Regel in `docs/DATENBANK.md` (Regel 7) und `docs/KONZEPT.md` 7a für Phase 1 aufgenommen | – (Umsetzung in Phase 1) |
| 3 | Rückmeldung „Vorher sichern" | Meldung direkt unter dem Knopf in der Wiederherstellen-Box, auch „Nicht gesichert" bei Abbruch/Fehler; Fehler beim Ersetzen erscheint in der Box | Browser ✅ |
| 4 | Barrierefreiheit | `role="status"`/`"alert"` für Meldungen, Hauptmenü beschriftet, `aria-current` am aktiven Reiter, `aria-hidden="true"`, ✓ aus Vorlesetext | Browser ✅ (VoiceOver selbst nicht getestet) |
| 5 | „Speicher voll" | Erkennung über den Fehlernamen (Browser und Dexie) in `src/ui/errors.ts` | Test ✅ |
| 6 | Kontrast | Hell: Akzent #b84a24 (ca. 5,2:1); Dunkel: dunkle Schrift auf Orange und Rot (ca. 4,9:1) | berechnet, Browser ✅ |
| 7 | Backup-Datum | Ungültiges Datum wird abgelehnt, Zukunftsdatum beim Wiederherstellen auf „jetzt" begrenzt; Erinnerung behandelt ungültige Daten wie „kein Backup" | Tests ✅ |
| 10 | Bedienung | Hinweis „erst nach dem Häkchen möglich", sichtbarer Fokusrahmen | Browser ✅ |
| Niedrig | diverse | Formatversion ≥ 1 und ganzzahlig, Prüfung nach Backup-Migration, Bildvorschau wird freigegeben, Texte „Schutz vor Aufräumen: an/aus", eigene Fehlermeldung bei fehlgeschlagener Update-Suche | Tests ✅ |
| 8, 9, 12 | Speicherverbrauch, Versionswechsel, Pflicht-Sicherung | auf Phase 1 verschoben (KONZEPT 7a) bzw. bewusst optional gelassen | – |

**Neue Tests:** 13 (insgesamt 32): Update-Sperre, „Speicher voll"-Erkennung, Testdaten-Entfernen löscht keine echten Daten, Umlaute/Emojis im Backup, „Letztes Backup" aus Datei ignoriert, Zukunftsdatum, ungültiges Datum, ungültige Formatversion, leere Bilddaten, ungültige Bildgröße, doppelte Einstellungen.

**Weiterhin offen:** Test für Abbruch bei fehlgeschlagener Selbstprüfung des Exports; Statusleiste im Dunkelmodus am Gerät prüfen; Action-Versionen per Commit-SHA (niedrig).
