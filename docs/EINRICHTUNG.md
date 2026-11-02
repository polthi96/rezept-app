# Einrichtung & Veröffentlichung

## Auf dem Mac starten (zum Entwickeln)

Voraussetzung: Node.js (installiert, Version 24).

```bash
npm install        # einmalig: Pakete laden
npm test           # automatische Prüfungen
npm run dev        # Entwicklungsversion: http://localhost:5173/rezept-app/
npm run build      # fertige App nach dist/ bauen
npm run preview    # fertige App ansehen: http://localhost:4173/rezept-app/
```

Hinweis: Offline-Start und Update-Hinweis funktionieren nur in der **gebauten** App (`build` + `preview` oder veröffentlicht), nicht in `npm run dev`.

## Veröffentlichung: GitHub Pages

**Warum GitHub Pages:** Dein GitHub-Konto ist vorhanden, es ist kostenlos, und nach jeder Änderung wird automatisch neu veröffentlicht. Vorher laufen die Tests (`.github/workflows/deploy.yml`) – schlägt einer fehl, bleibt die alte Version online.

**Feste Adresse:** `https://<dein-github-name>.github.io/rezept-app/`
Diese Adresse **nie ändern** (Repository nicht umbenennen, nicht verschieben). Deine Daten auf dem iPhone hängen an genau dieser Adresse – unter einer neuen Adresse wäre die App leer (siehe KONZEPT.md, 5c).

**Öffentliches Repository:** Im kostenlosen Konto muss das Repository für GitHub Pages öffentlich sein. Darin liegt nur Programmcode – keine Rezepte, Körperdaten, Backups oder Zugangsdaten (`.gitignore` schließt Backup-Dateien und `.env`-Dateien aus).

### Noch fehlender Schritt: Mac mit GitHub verbinden

Auf diesem Mac ist noch **keine GitHub-Anmeldung** eingerichtet. Die Verbindung mit Claude im Browser reicht dafür nicht.

#### Weg A (gewählt): Terminal, ohne zusätzliche Installation

Git ist auf dem Mac schon vorhanden und speichert die Anmeldung im macOS-Schlüsselbund.

1. **Repository anlegen** auf github.com: oben rechts **+ → New repository**
   - Repository name: `rezept-app` (genau so)
   - **Public**
   - Kein Häkchen bei README, .gitignore oder License (das Repository muss leer sein)
   - **Create repository**
2. **Pages einschalten:** im neuen Repository **Settings → Pages → Build and deployment → Source: „GitHub Actions"**.
3. **Zugangsschlüssel (Token) erstellen:** Profilbild → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
   - Name: `rezept-app Mac`, Ablauf: z. B. 90 Tage
   - Repository access: **Only select repositories** → `rezept-app`
   - Permissions → Repository permissions: **Contents: Read and write** und **Workflows: Read and write**
   - **Generate token** → Schlüssel kopieren. Er wird nur einmal angezeigt. Nicht in Chats, Dateien oder Notizen einfügen.
4. **Deinen GitHub-Benutzernamen** an Claude schicken (der ist nicht geheim). Claude trägt dann die Adresse des Repositorys ein.
5. **Hochladen – selbst im Terminal eingeben:**
   ```bash
   git push -u origin main
   ```
   - „Username": dein GitHub-Benutzername
   - „Password": den **Token** einfügen (beim Tippen ist nichts zu sehen, das ist normal) → Enter
   - Der Schlüsselbund merkt sich den Token, du musst ihn nur einmal eingeben.
6. Auf github.com unter **Actions** prüfen, ob „Veröffentlichen" grün ist. Ist der Lauf rot, weil Pages noch nicht aktiv war: Lauf öffnen → **Re-run all jobs**.

Läuft der Token ab, einfach einen neuen erstellen. Beim nächsten `git push` fragt das Terminal dann wieder.

#### Weg B: GitHub Desktop (ohne Terminal)

1. **GitHub Desktop** installieren (offizielles Programm von GitHub: <https://desktop.github.com>) und mit deinem GitHub-Konto anmelden.
2. In GitHub Desktop: **File → Add Local Repository…** → Ordner `Desktop/Rezept-App` wählen.
3. **Publish repository** klicken:
   - Name: `rezept-app` (genau so)
   - Häkchen bei **„Keep this code private" entfernen**
4. Auf github.com im Repository: **Settings → Pages → Build and deployment → Source: „GitHub Actions"** wählen.
5. In GitHub Desktop **„Push origin"** klicken bzw. unter **Actions** auf github.com den Lauf „Veröffentlichen" neu starten. Nach 1–2 Minuten ist die App unter der Adresse oben erreichbar.

Danach reicht für jede neue Version: in GitHub Desktop **Push origin** – oder du sagst Claude Bescheid.

### Auf dem iPhone installieren

1. Adresse in **Safari** öffnen (nicht in Chrome oder der Instagram-App).
2. Teilen-Symbol → **„Zum Home-Bildschirm"** → Hinzufügen.
3. Die App ab jetzt **immer über das Symbol** öffnen. (Safari-Tab und Home-Bildschirm-App haben auf dem iPhone getrennte Daten.)

## Bekannte Hinweise

- `npm audit` meldet mittlere Sicherheitswarnungen in Hilfspaketen, die nur beim **Bauen** der Offline-Funktion verwendet werden (workbox-build). Sie landen nicht in der App auf dem iPhone. Bei Updates von `vite-plugin-pwa` erneut prüfen.
- App-Symbole neu erzeugen: `python3 scripts/make-icons.py`
