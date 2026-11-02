# Konzept: Rezept- & Ernährungs-App (Arbeitstitel „Kochbuch")

Stand: 02.11.2026 · Status: **freigegeben – Phase 0 abgeschlossen, Phase 1 umgesetzt (Test auf dem iPhone ausstehend)**

## 1. Kontext & Ziel

- **Problem:** Viele Rezepte liegen verstreut als gespeicherte Videos (Instagram/TikTok), in der Handy-Galerie oder als Screenshots. Beim Kochen fehlt der schnelle Überblick: Was brauche ich, wie lange dauert es, welche Schritte?
- **Nutzer:** nur du, auf deinem **iPhone**.
- **Ziel:** Eine App auf dem Startbildschirm, in der du
  1. Rezepte sammelst und schnell findest,
  2. planst, wann du was kochst (inkl. Einkaufsliste),
  3. Schritt für Schritt mit Timer kochst,
  4. Kalorien und Makros (Protein, Kohlenhydrate, Fett) trackst – mit Tagesübersicht.
- **KI:** Bewusst **erst ohne eingebaute KI** starten. Als kostenlose Brücke nutzt du deinen Claude-Chat (Pro-Abo): Claude wandelt Videos/Fotos in einen Text um, den die App einliest. Eingebaute KI kann später ergänzt werden.

## 2. Funktionen, priorisiert

### Muss (erste nutzbare Version)
- Rezept anlegen: Titel, Link zum Video, Fotos/Screenshots, Portionen, Gesamtdauer, Zutaten mit Mengen, Schritte (optional mit Zeit pro Schritt), Schlagwörter (z. B. „schnell", „High Protein")
- Rezeptliste mit Suche und Filtern (Dauer, Schlagwort, Favorit)
- Rezept-Detail: auf einen Blick Zutaten, Dauer, Schritte
- **Kochmodus:** große Schritte, Timer pro Schritt, mehrere Timer gleichzeitig, Bildschirm bleibt an
- Datensicherung per Export/Import (Datei in iCloud Drive ablegen)

### Soll
- **Ernährungscoach (Ziele berechnen und wöchentlich anpassen)** – siehe Abschnitt 2a
- **Wochenplan:** Rezept auf einen Tag legen
- **Einkaufsliste** automatisch aus dem Wochenplan (nur eindeutig gleiche Zutaten werden zusammengefasst, abhakbar – Details in Abschnitt 7a)
- **Portionsrechner:** Mengen automatisch umrechnen (2 → 4 Portionen)
- **Kalorien-Tagebuch:** Mahlzeiten eintragen, Tagesziel für kcal/Protein/KH/Fett, Tagesübersicht mit Balken
- Lebensmittelsuche + Barcode-Scan über die freie Datenbank *Open Food Facts* (es wird nur der Suchbegriff/Barcode gesendet, keine persönlichen Daten)
- Nährwerte pro Rezept-Portion → „Dieses Rezept gegessen" mit einem Tipp ins Tagebuch
- **Claude-Brücke:** Feld „Aus Claude einfügen" – du lässt im Claude-Chat ein Video/Foto auswerten, Claude antwortet in einem festen Format, du fügst es ein, prüfst die Vorschau und speicherst

### Kann später
- **Eingebaute KI** (nur nach deiner Zustimmung, eigenes API-Konto, ca. 1–5 €/Monat): Essensfoto → kcal-Schätzung, Video direkt auswerten, Chat-Coach in der App, Rezeptvorschläge passend zu deinen restlichen Makros
- **Garmin:** verbrauchte Kalorien holen → echte Tagesbilanz; an Trainingstagen angepasste Ziele (Halbmarathon-Vorbereitung)
- **Vorrat:** „Was habe ich zu Hause?" → passende Rezepte
- Gewichtsverlauf, Wasser, Bewertung/Notizen nach dem Kochen („beim nächsten Mal weniger Salz")
- Sync zwischen mehreren Geräten (Cloud)

## 2a. Ernährungscoach: Ziele berechnen und anpassen

> **Status: Entwurf.** Die folgenden Rechenregeln und Sicherheitsgrenzen sind ein erster Vorschlag. Sie werden **vor Beginn von Phase 5b fachlich geprüft** (Quellen, Grenzwerte, Sonderfälle wie Trainingstage) und erst danach umgesetzt.

Läuft **ohne KI**, mit festen, nachvollziehbaren Rechenregeln direkt auf dem Handy. Deine Körperdaten verlassen das Gerät nicht.

**Einmalig eingeben (in der App, nicht im Code):** Größe, Alter, Geschlecht, Startgewicht, Alltagsaktivität, Ziel (z. B. abnehmen mit 0,5 % Körpergewicht pro Woche).

**Startwerte berechnen (Entwurf):**
- Grundumsatz nach der gängigen Formel *Mifflin-St Jeor* × Aktivitätsfaktor = Tagesbedarf
- Kalorienziel = Tagesbedarf minus Defizit passend zum Wunschtempo
- Protein: ca. **2 g pro kg Körpergewicht** (schützt Muskeln beim Abnehmen und hilft bei der Erholung vom Lauftraining)
- Fett mindestens ca. 0,8 g/kg, der Rest Kohlenhydrate

**Wöchentliche Anpassung (Entwurf, z. B. jeden Montag):**
- Du trägst dein Gewicht ein, ideal mehrmals pro Woche. Die App rechnet mit dem **Wochendurchschnitt**, damit Wasserschwankungen das Ergebnis nicht verfälschen.
- Ist dein Gewicht langsamer gefallen als geplant, senkt die App das Kalorienziel um etwa 100–150 kcal. Fällt es zu schnell, hebt sie es an. Liegst du im Plan, bleibt alles gleich.
- Protein- und Kalorienziel passen sich automatisch an dein neues, hoffentlich niedrigeres Gewicht an.
- Du bekommst eine kurze Wochenauswertung: Gewichtstrend, Durchschnitt kcal/Protein, neues Ziel und warum.

**Sicherheitsgrenzen (Entwurf):** Die App geht nie unter einen Mindestwert (ca. Grundumsatz) und schlägt nie mehr als 1 % Gewichtsverlust pro Woche vor. Sie gibt den Hinweis, dass sie keine ärztliche Beratung ersetzt.

**Später:** An Trainingstagen gibt es mehr Kalorien und Kohlenhydrate (Garmin, Phase 7). Gewicht kann dann auch von der Garmin-Waage kommen.

## 3. Technik-Empfehlung

| Schicht | Was sie tut | Empfehlung | Warum |
|---|---|---|---|
| App-Art | Wie die App aufs Handy kommt | **Web-App (PWA)** – Webseite, die man auf den Startbildschirm legt | Kein App Store, kein Mac-Entwicklerkonto (99 €/Jahr), läuft sofort auf dem iPhone, offline nutzbar |
| Oberfläche | Was du siehst und antippst | **React + TypeScript** mit **Vite** | Sehr verbreitet, viele Hilfen, TypeScript findet Fehler früh |
| Datenablage | Wo Rezepte & Tagebuch liegen | **Auf dem iPhone** in der App-eigenen Datenbank (IndexedDB, über die Bibliothek *Dexie*) | Deine Daten verlassen das Handy nicht, keine laufenden Kosten |
| Veröffentlichung | Damit das iPhone die App laden kann | **GitHub Pages**, feste Adresse `https://<github-name>.github.io/rezept-app/` | GitHub-Konto ist vorhanden, kostenlos, automatische Veröffentlichung nach jeder Änderung. Dort liegt nur der Programmcode, **nicht** deine Daten |
| Backup | Schutz vor Datenverlust | Versionierte Export-Datei → iCloud Drive; Erinnerung, wenn das letzte Backup > 7 Tage alt ist | Einfach, ohne Server |
| Später: KI | Fotos/Videos auswerten | Claude-API über eine kleine Server-Funktion (*Cloudflare Worker*) | Der geheime API-Schlüssel darf nie in der App selbst stehen |

**Hinweis zu GitHub Pages:** Im kostenlosen GitHub-Konto muss das Code-Verzeichnis (Repository) dafür **öffentlich** sein. Das ist unkritisch, weil dort ausschließlich Programmcode liegt – keine Rezepte, keine Körperdaten, keine Zugangsdaten. Wer das nicht möchte, kann auf Cloudflare Pages ausweichen (privates Repository möglich); dann ändert sich aber die Adresse (siehe 5c).

**Erweiterbarkeit als Ziel:** Die Architektur ist so gewählt, dass KI, Garmin und Cloud-Sync später **möglichst ohne Neuentwicklung** ergänzt werden können. Das ist ein Ziel, keine Garantie: Je nach Erweiterung können Umbauten nötig werden (z. B. ein Server für Cloud-Sync oder Benachrichtigungen).

**Bekannte iPhone-Einschränkungen (ehrlich benannt):**
- Teilen direkt aus Instagram/TikTok in die Web-App geht auf dem iPhone nicht → Link kopieren und einfügen.
- Timer laufen zuverlässig, solange die App offen ist; der Kochmodus hält deshalb den Bildschirm an. **Alarme bei gesperrtem Handy oder geschlossener App werden nicht versprochen** – eine Web-App kann das auf dem iPhone nicht zuverlässig.
- Ganze Videos speichert die App nicht (zu groß) – nur Link, Vorschaubild und Screenshots.

## 4. Datenmodell im Überblick

- **Rezept:** Titel, Quelle/Link, Bilder, Portionen, Dauer (aktiv / gesamt), Schlagwörter, Favorit, Nährwerte pro Portion (einzelne Werte dürfen „unbekannt" sein)
- **Zutat:** Name, Menge (Zahl oder Bruch, darf fehlen), Einheit (frei, z. B. „g", „Dose", „Bund"), Hinweis (z. B. „nach Geschmack"), optional ja/nein
- **Schritt:** Reihenfolge, Text, optionale Timer-Dauer
- **Bild:** verkleinerte Bilddaten, Format, Breite/Höhe (gehört zu einem Rezept)
- **Planeintrag:** Datum, Mahlzeit (Frühstück/Mittag/Abend), Rezept, Portionen
- **Einkaufslisten-Eintrag:** Zutat, Menge, abgehakt
- **Tagebuch-Eintrag:** Datum, Uhrzeit, Bezeichnung, Menge, kcal, Protein, KH, Fett, Quelle (Rezept / Lebensmittel / manuell / Claude) – als **eingefrorene Kopie** der Werte zum Zeitpunkt des Eintrags
- **Profil:** Größe, Alter, Geschlecht, Aktivität, Ziel-Tempo
- **Gewichtseintrag:** Datum, Gewicht
- **Zielverlauf:** ab Datum gültiges kcal-/Protein-/KH-/Fett-Ziel mit Begründung
- **Einstellungen:** letztes Backup, Anpassungstag

## 5. Sicherheit, Datenschutz & Backups

- Daten liegen **nur auf deinem iPhone**, getrennt vom Programmcode.
- Die App bittet iOS um „dauerhaften Speicher", damit nichts automatisch aufgeräumt wird. **Das ersetzt kein Backup** (siehe 5c).
- **Externe Dienste:** nur Open Food Facts (Suchbegriff/Barcode, ab Phase 5). Eingebaute KI und Garmin erst nach deiner ausdrücklichen Zustimmung in einer späteren Phase.
- **Löschen:** Papierkorb (30 Tage) statt endgültigem Löschen; Rückfrage vor dem Leeren.
- Keine echten persönlichen Daten oder Zugangsdaten in Code, Beispieldaten oder Repository. Backup-Dateien sind per `.gitignore` vom Repository ausgeschlossen.

### 5a. Datenbankversionen und sichere Migrationen (ab Phase 0)

- Die Datenbank hat eine **Versionsnummer**. Jede Änderung am Datenmodell bekommt eine neue Version mit einem **Migrationsschritt** (Umbau-Anleitung von alter zu neuer Version).
- **Regeln:** Alte Versionen werden nie geändert oder gelöscht, nur neue angehängt. Migrationen dürfen Daten umbauen, aber nie stillschweigend verwerfen. Felder werden nicht umbenannt, ohne die Werte zu übertragen.
- Jede Migration bekommt einen automatischen Test: Daten in alter Version anlegen → neue Version öffnen → Daten vollständig vorhanden.
- Backups enthalten die Datenbankversion. Ältere Backups werden beim Import über dieselben Schritte auf den aktuellen Stand gebracht; Backups aus einer **neueren** App-Version werden abgelehnt („Bitte App zuerst aktualisieren").

### 5b. Belastbare Backups und Wiederherstellung (ab Phase 0)

- **Format:** eine JSON-Datei mit Kennung, **Formatversion**, Datenbankversion, Erstellungsdatum, App-Version, allen Daten (Bilder eingebettet) und einer **Prüfsumme** (erkennt beschädigte Dateien).
- **Beim Erstellen** wird die fertige Datei sofort wieder eingelesen und vollständig geprüft. Erst dann wird sie angeboten.
- **Beim Import** wird die Datei **komplett geprüft, bevor irgendetwas verändert wird**: lesbar, richtige Kennung, unterstützte Version, Prüfsumme stimmt, jeder Datensatz und jedes Bild gültig. Beschädigte oder unpassende Dateien werden mit verständlicher Meldung abgelehnt – bestehende Daten bleiben unverändert.
- **Wiederherstellungsmodus „Ersetzen" (festgelegt für Phase 0):**
  1. Du wählst die Backup-Datei.
  2. Die App prüft sie und zeigt dir an, was drin ist (Datum, Anzahl Einträge und Bilder).
  3. Die App empfiehlt, vorher den aktuellen Stand zu sichern (ein Knopf dafür ist direkt daneben).
  4. Nach deiner Bestätigung werden **alle** aktuellen Daten durch den Inhalt des Backups **ersetzt** – in einem einzigen Schritt („alles oder nichts"). Geht dabei etwas schief, bleibt der alte Stand vollständig erhalten.
  - Es wird nicht zusammengeführt. Einträge, die nach dem Backup entstanden sind, sind danach weg – deshalb Schritt 3.
- **Automatische Tests** prüfen Export und Wiederherstellung mit Testdaten inklusive Bild sowie beschädigte, manipulierte und zu neue Dateien.

### 5c. Grenzen der lokalen Speicherung

- Die Daten liegen im Speicher, den iOS der Web-App zuweist. **Sie sind weg**, wenn du
  - die App vom Startbildschirm löschst,
  - in den Einstellungen Safari-/Website-Daten löschst,
  - das iPhone zurücksetzt oder ein neues iPhone einrichtest (Web-App-Daten werden nicht zuverlässig über iCloud-Backups übertragen).
- „Dauerhafter Speicher" schützt nur vor dem automatischen Aufräumen bei Speichermangel, **nicht** vor diesen Fällen. **Nur die Backup-Datei schützt deine Daten.**
- **Gerätewechsel:** auf dem alten iPhone Backup erstellen → Datei in iCloud Drive → auf dem neuen iPhone die App unter derselben Adresse öffnen und zum Startbildschirm hinzufügen → „Mehr" → „Wiederherstellen" → Datei wählen.
- **Feste Adresse:** Die Daten sind an die genaue Web-Adresse gebunden. Die App wird deshalb dauerhaft unter `https://<github-name>.github.io/rezept-app/` veröffentlicht. Wird die Adresse je geändert (anderer Dienst, anderer Repository-Name), sieht die App unter der neuen Adresse **leer** aus → vorher Backup erstellen und danach dort wiederherstellen.

### 5d. Kontrollierte App-Updates (ab Phase 0)

- Neue Versionen werden im Hintergrund geladen, aber **nicht automatisch aktiviert**.
- Die App zeigt einen Hinweis „Neue Version verfügbar" mit dem Knopf „Jetzt neu starten". Erst dein Tipp aktiviert die neue Version.
- Solange ungespeicherte Änderungen offen sind oder der Kochmodus läuft, ist der Neustart gesperrt und der Hinweis erklärt, warum. Ein Update unterbricht also nie das Kochen und verwirft keine Eingaben.
- Ein Datenbank-Versionswechsel durch ein Update läuft beim Neustart über die Migrationen aus 5a.

## 6. Navigation / Bildschirme

Untere Leiste mit 4 Reitern:

1. **Heute** – Tagesübersicht: kcal/Makros als Balken, heute geplante Rezepte, „Mahlzeit hinzufügen"
2. **Rezepte** – Liste mit Suche/Filter → Detail → „Jetzt kochen" (Kochmodus) / „Planen" / „Gegessen"
3. **Plan** – Wochenansicht + Einkaufsliste
4. **Mehr** – Ziele, Backup/Wiederherstellen, Speicherstatus, App-Version, „Aus Claude einfügen", Papierkorb

## 7. Entwicklungsplan in kleinen Phasen

| Phase | Inhalt | Ergebnis für dich |
|---|---|---|
| 0 – Fundament | Projektgerüst, Git, installierbare PWA mit Offline-Start, versionierte Datenbank mit Migrationsweg, versioniertes Backup (Export/Import mit Prüfung), kontrollierte Updates, Veröffentlichung vorbereiten | Leere App-Hülle auf deinem Startbildschirm, Backup und Wiederherstellung funktionieren |
| 1 – Rezeptsammlung | Rezepte anlegen/bearbeiten, flexible Zutaten, Bilder (verkleinert), Liste, Suche, Filter, Papierkorb | Du kannst deine ersten Rezepte erfassen und finden |
| 2 – Kochmodus | Schritt-für-Schritt-Ansicht, robuste Timer, Bildschirm bleibt an, Portionsrechner | Du kochst mit der App |
| 3 – Claude-Brücke | Festes Textformat + Vorlage für deinen Claude-Chat, „Einfügen" mit bearbeitbarer Vorschau | Videos/Fotos via Claude-Chat in Sekunden als Rezept |
| **Alltagstest** | Ca. **zehn echte Rezepte** erfassen und damit kochen; Erkenntnisse sammeln und Konzept anpassen. **Keine neuen Funktionen**, bis der Test ausgewertet ist | Sicherheit, dass die Grundlage im Alltag trägt |
| 4 – Plan & Einkauf | Wochenplan, Einkaufsliste mit vorsichtigem Zusammenfassen | Du planst die Woche und kaufst gezielt ein |
| 5 – Kalorien-Tracking | Tagebuch mit eingefrorenen Werten, Tagesübersicht, Open Food Facts + Barcode, Rezept-Nährwerte, Claude-Mahlzeit einfügen | Dein Tracking läuft in der App |
| 5b – Coach | Fachliche Prüfung der Regeln aus 2a, dann Profil, Zielberechnung, Gewicht, wöchentliche Anpassung, Wochenauswertung | Die App rechnet deine Ziele selbst und passt sie jede Woche an |
| 6 – Eingebaute KI *(optional)* | Server-Funktion, Foto-Schätzung, Chat-Coach, Vorschläge | Alles direkt in der App, ohne Umweg |
| 7 – Garmin *(optional)* | Verbrauchte kcal, Trainingstag-Ziele | Echte Energiebilanz |

**Warum diese Reihenfolge:** Rezepte und Kochmodus sind dein Hauptwunsch und brauchen keine externen Dienste. Die Claude-Brücke (Phase 3) liefert die „KI macht es selbst"-Erfahrung schon früh und kostenlos. Der Alltagstest danach verhindert, dass auf einer unpassenden Grundlage weitergebaut wird. Tracking kommt danach, weil es auf den Rezepten aufbaut (Nährwerte pro Portion). Bezahlte KI und Garmin erst, wenn die Grundlage steht und du weißt, ob sich die Kosten lohnen.

### 7a. Verbindliche Anforderungen je Phase (jetzt nur dokumentiert)

**Phase 1 – Flexible Zutaten**
- Erlaubt sind u. a. „200 g Mehl", „1 Dose Kichererbsen", „½ Zwiebel", „Salz nach Geschmack", „Chili (optional)".
- Menge darf fehlen oder ein Bruch sein; Einheit ist frei wählbar; Zutaten können als **optional** markiert werden; Hinweise wie „nach Geschmack" bleiben als Text erhalten.
- Der Portionsrechner (Phase 2) skaliert nur vorhandene Zahlen; „nach Geschmack" bleibt unverändert.

**Phase 1 – Backup-Prüfung und Speichern (aus Phasencheck 0)**
- Die Backup-Prüfung wird für alle neuen Rezeptfelder (Zutaten, Schritte, Nährwerte …) erweitert, jeweils mit Test.
- Wird die Datenbank wegen einer neueren App-Version in einem anderen Fenster geschlossen, lehnt das Speichern mit klarer Meldung ab, und die Eingaben bleiben im Formular.
- Backup mit vielen Bildern auf dem iPhone testen (Speicherverbrauch beim Export).

**Phase 1 – Bilder**
- Bilder werden **vor dem Speichern verkleinert** (längste Seite ca. 1600 px, komprimiert, Ziel: deutlich unter 1 MB pro Bild).
- Speicherfehler (z. B. Speicher voll) werden **verständlich angezeigt**; das Rezept wird dann nicht halb gespeichert, und deine Eingaben bleiben im Formular erhalten.

**Phase 2 – Timer**
- Ein Timer speichert seinen **Endzeitpunkt** (z. B. „fertig um 18:42:10"), nicht einen herunterzählenden Wert. Nach App-Wechsel, Bildschirmsperre oder Neuladen wird die Restzeit aus dem Endzeitpunkt neu berechnet; abgelaufene Timer werden als „abgelaufen" angezeigt.
- Prüfung auf dem echten iPhone: App wechseln, iPhone sperren, zurückkehren – Restzeit stimmt.
- Es werden **keine Hintergrundalarme versprochen** (siehe Abschnitt 3).

**Phase 3 – Claude-Import**
- Vor dem Speichern erscheint eine **bearbeitbare Vorschau**; nichts wird ohne deine Bestätigung gespeichert.
- Fehlende Mengen oder Nährwerte bleiben **„unbekannt"** und sind als solche sichtbar – sie werden **nie automatisch zu 0**.

**Phase 4 – Einkaufsliste**
- Zusammengefasst wird nur, was eindeutig gleich ist (gleicher Name **und** verrechenbare Einheit). Ähnliche, aber verschiedene Zutaten (z. B. „Tomaten" und „passierte Tomaten") bleiben getrennt oder werden dir als „zusammenfassen?" vorgeschlagen.

**Phase 5 – Tagebuch**
- Ein Tagebucheintrag speichert eine **Kopie** von Menge und Nährwerten zum Zeitpunkt des Eintrags. Wird das Rezept später bearbeitet, ändern sich vergangene Einträge **nicht**.

## 8. Überprüfung

- Automatische Tests für Datenhaltung, Migrationen, Backup/Wiederherstellung (inkl. beschädigter Dateien) und später für Rechenlogik (Portionsrechner, Makro-Summen, Einkaufsliste, Coach-Regeln).
- Nach jeder Phase: Tests ausführen, `/phasencheck` empfohlen.
- Selbsttest-Checkliste pro Phase auf dem echten iPhone (siehe `docs/SELBSTTEST.md`).

## 9. Offene Fragen / Annahmen

- **Annahme:** nur ein Nutzer, ein Gerät (iPhone). Sync mit Mac/Partner später möglich (dann mit Umbauten).
- **Annahme:** Oberfläche auf Deutsch, Einheiten metrisch.
- **Entschieden:** Ziele berechnet die App selbst (Abschnitt 2a, Regeln vor Phase 5b fachlich prüfen). Körperdaten gibst du in der App ein, nicht im Chat.
- **Entschieden:** GitHub-Konto ist vorhanden. Projektordner: `~/Desktop/Rezept-App`. Veröffentlichung über GitHub Pages, Repository-Name `rezept-app`.
- **Offen:** GitHub-Anmeldung auf dem Mac fehlt noch (für das erste Hochladen nötig, siehe `docs/EINRICHTUNG.md`).
