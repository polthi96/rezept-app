# Selbsttest auf dem echten iPhone

Bitte nach jeder Phase durchgehen und Ergebnis (✓ / ✗ + kurze Notiz) an Claude zurückmelden.

## Phase 1 – Rezeptsammlung (Version 0.2.0)

**Vorher:** In der alten Version „Mehr" → **Backup erstellen** und in iCloud sichern.

**Update & Umbau der Daten**
- [ ] 1. App öffnen → **Jetzt neu starten** → „Mehr" → „App" zeigt **Version 0.2.0**.
- [ ] 2. Reiter **Rezepte**: Deine alten Testrezepte aus Phase 0 sind da (ohne Zutaten). „Mehr" → **Testdaten entfernen** räumt sie weg.

**Rezept anlegen**
- [ ] 3. **+ Neues Rezept** → Titel, Link aus Instagram/TikTok einfügen (Link im Video über „Teilen" → „Link kopieren"), Portionen, Zeiten, Schlagwörter.
- [ ] 4. Zutaten, eine pro Zeile: `200 g rote Linsen`, `½ Zwiebel, fein gehackt`, `1 Dose passierte Tomaten`, `Salz nach Geschmack`, `Chili (optional)` → die Vorschau darunter zeigt Menge und Zutat getrennt, „optional" als Markierung.
- [ ] 5. Zwei Schritte, beim zweiten **⏱ 20** eintragen.
- [ ] 6. **+ Fotos** → 2–3 Fotos aus der Galerie (auch ein Screenshot) → erscheinen als Vorschau; mit ‹ › umsortieren.
- [ ] 7. Während das Formular halb ausgefüllt ist: kurz Reiter **Heute** antippen und zurück → alles noch da.
- [ ] 8. **Speichern** → Detailansicht mit Fotos (wischen), Zutaten, Schritten, ⏱-Markierung. **Video / Quelle öffnen** öffnet den Link.

**Finden**
- [ ] 9. Liste zeigt das Vorschaubild. Suche nach einer Zutat (z. B. „linsen") findet das Rezept. Filter ★ Favoriten, „bis 30 Min.", #Schlagwort funktionieren.

**Bearbeiten & Fehler**
- [ ] 10. **Bearbeiten** → Titel ändern → **‹ Abbrechen** → Nachfrage „Änderungen verwerfen?" erscheint.
- [ ] 11. Link-Feld mit Unsinn füllen (z. B. `abc def`) → Speichern → verständliche Meldung, Eingaben bleiben.

**Papierkorb**
- [ ] 12. Detail → **In den Papierkorb legen** → Rezept weg aus der Liste. „Mehr" → Papierkorb → **Zurückholen** → wieder da.

**Backup mit echten Fotos**
- [ ] 13. 3–5 Rezepte mit je 2–3 Fotos anlegen → **Backup erstellen** → in iCloud sichern. Notiere ungefähr, wie lange es dauert und wie groß die Datei ist (Dateien-App → lange drücken → Informationen).
- [ ] 14. **Wiederherstellen** mit dieser Datei → alle Rezepte und Fotos sind korrekt da.

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
