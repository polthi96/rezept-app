# Selbsttest auf dem echten iPhone

Bitte nach jeder Phase durchgehen und Ergebnis (✓ / ✗ + kurze Notiz) an Claude zurückmelden.

## Phase 0 – Fundament

Voraussetzung: App ist veröffentlicht (siehe EINRICHTUNG.md) und über Safari → „Zum Home-Bildschirm" installiert.

**Installation & Start**
- [ ] 1. Symbol (weißer Teller auf Terrakotta) erscheint auf dem Home-Bildschirm, Name „Kochbuch".
- [ ] 2. Antippen öffnet die App **ohne** Safari-Adressleiste, unten 4 Reiter (Heute, Rezepte, Plan, Mehr).
- [ ] 3. „Mehr" → „Speicher": Steht dort „Dauerhafter Speicher: aktiv"? (Notiere, was steht – auf dem iPhone kann es abweichen.)

**Speichern**
- [ ] 4. „Mehr" → „Selbsttest" → **Testdaten anlegen**. Anzeige: „1 Rezept, 1 Bild", Testbild (Teller mit „TEST") sichtbar.
- [ ] 5. App ganz schließen (vom unteren Rand hochwischen, App wegwischen), neu öffnen → „Mehr": Daten und Bild noch da.

**Offline**
- [ ] 6. Flugmodus **an**, App ganz schließen und neu öffnen → App startet, Testdaten sind da.
- [ ] 7. Flugmodus wieder **aus**.

**Backup**
- [ ] 8. **Backup erstellen** → Teilen-Menü erscheint → „In Dateien sichern" → iCloud Drive → Sichern. Meldung „Backup erstellt und geprüft", „Letztes Backup" zeigt jetzt Datum und Uhrzeit.
- [ ] 9. In der Dateien-App: Datei `kochbuch-backup-JJJJ-MM-TT.json` liegt in iCloud Drive.

**Wiederherstellen**
- [ ] 10. Noch einmal **Testdaten anlegen** → jetzt „2 Rezepte, 2 Bilder".
- [ ] 11. **Wiederherstellen …** → die Backup-Datei aus Schritt 8 wählen → Zusammenfassung „Backup geprüft ✓ … 1 Rezept, 1 Bild".
- [ ] 12. „Jetzt ersetzen" ist gesperrt, bis das Häkchen gesetzt ist. Häkchen setzen → **Jetzt ersetzen** → wieder „1 Rezept, 1 Bild", Testbild korrekt.

**Fehlerhafte Datei**
- [ ] 13. **Wiederherstellen …** → eine beliebige andere Datei wählen (z. B. ein PDF oder Foto, falls wählbar) → Fehlermeldung „… Deine Daten wurden nicht verändert", Anzeige weiterhin „1 Rezept, 1 Bild".

**Update** *(erst möglich, wenn Claude eine zweite Version veröffentlicht hat)*
- [ ] 14. App öffnen → nach kurzer Zeit erscheint „Neue Version verfügbar" (ggf. „Mehr" → **Nach Updates suchen**, oder App schließen und neu öffnen).
- [ ] 15. **Jetzt neu starten** → App lädt neu, Daten sind noch da, „Mehr" → „App" zeigt die neue Version.

**Aufräumen**
- [ ] 16. **Testdaten entfernen** → „0 Rezepte, 0 Bilder".
