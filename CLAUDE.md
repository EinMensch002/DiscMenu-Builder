# DiscMenu-Builder: Hinweise für Claude

Kurzer Überblick, damit eine neue Sitzung ohne den ganzen Verlauf weiterarbeiten kann. Ausführliches steht in `README.md` (Roadmap) und `docs/`.

## Zusammenarbeit
- Der Nutzer schreibt **Deutsch** und wird mit **"Du"** angesprochen. Antworten, Oberfläche, Doku und Commit-Texte sind deutsch.
- Der Nutzer arbeitet in kleinen Runden, gibt Rückmeldung mit Screenshots und ist neu bei Claude Code: Befehle kurz und einfach erklären.
- **Gemergt wird nur auf ausdrückliches "mergen"**. Vorher einen PR anlegen, CI abwarten, Stand berichten und fragen. Kein Force-Push (wird blockiert): bei einem bereits gemergten Branch `origin/main` per Merge zurückholen und normal pushen.
- Jeder PR bekommt eine Vorschau-Seite (`/pr/<Nummer>/`, `.github/workflows/preview.yml`), die beim Schließen oder Mergen gelöscht wird. Der Link steht im PR-Kommentar.
- Entwickelt wird auf dem in der Sitzung vorgegebenen Branch, ein neuer PR nur auf Wunsch.

## Aufbau
| Ordner | Inhalt |
|---|---|
| `configurator/` | Web-Konfigurator für das Disc-Menü (`menu.json`) |
| `disc-sleeve/` | **DiscSleeve** (früher Cover-Tool): Web-App für druckfertige Disc-Hüllen, reines HTML/CSS/JS ohne Build |
| `src/`, `schema/`, `examples/` | Go-Builder und -Player, JSON-Schema des Menüs |
| `tools/cors-proxy/` | Cloudflare-Worker (Proxy für SteamGridDB, Steam, GOG, Epic), `VERSION` im Worker und `WORKER_VERSION` in `online.js` müssen übereinstimmen |
| `tests/` | `*.test.js` (Node), `tests/ui/*.check.js` (Playwright) |
| `docs/` | Doku, u. a. `disc-sleeve.md` und `manuelle-pruefung.md` |

### DiscSleeve (`disc-sleeve/`)
- `core.js`: Zustand und Regeln ohne Oberfläche (Hüllenmaße in **mm**, Anbieter, Vorlagen, `normalizeItem`/`normalizeBack`, `imageSpecs`). Hier liegt die Prüfung aller gespeicherten Werte.
- `app.js`: Formular, Vorschau (`transform: scale(var(--k))`), Bilder (IndexedDB, Datei-URLs), `CoverApp`-Schnittstelle.
- `back-design.js`: zeichnet Elemente der Rückseite (Text, Bild, Form) für Cover und Editor.
- `back-editor.js`: Rückseiten-Editor (Pop-up): Ziehen, Skalieren, Drehen, Formen mit Punkten, Vorlagen, Steam/GOG-Bildergalerie, Rückgängig.
- `extras.js`: Menüs und Dialoge (Daten von Steam/GOG, Projekt als ZIP, Einstellungen, SteamGridDB).
- `online.js`: Zugriffe auf Steam, GOG, SteamGridDB, Wikidata, Proxy. `files.js`/`zip.js`: Projektdatei (`cover.json` plus `images/`).
- `i18n.js` + `lang-en.js`: Oberfläche Deutsch/Englisch. **Jeder neue deutsche Text braucht einen englischen Eintrag** (`dict` für ganze Texte, `parts`/`rules` für zusammengesetzte). Der Test prüft das und dass jeder Schlüssel wirklich im Code vorkommt.
- Reihenfolge der Skripte in `index.html`: `i18n`, `lang-en`, `core`, `zip`, `online`, `files`, `back-design`, `app`, `back-editor`, `extras`.
- Gedruckt wird A4 quer, Druckregeln in `style.css` (`@media print`).

## Tests (vor jedem Push ausführen)
```bash
npm test          # Logik-Tests, schnell
npm run test:ui   # Browser-Tests mit Playwright (Chromium ist vorinstalliert), dauert einige Minuten
```
- Neue Funktion: Logik-Test in `tests/cover.test.js` oder `tests/cover-files.test.js`, Bedienung in `tests/ui/cover-back.check.js` (Dienste mit `page.route` nachbauen, keine echten Verbindungen).
- Nach Änderungen warten Tests auf den nächsten Frame (`waitForFunction`), nicht sofort `textContent` prüfen.
- Doku mitpflegen: `docs/disc-sleeve.md`, Roadmap in `README.md`, neue manuelle Prüfpunkte in `docs/manuelle-pruefung.md`.

## Roadmap (kurz, Details in `README.md`)
- Beide Web-Tools zusammenführen mit gemeinsamer Projektdatei (`assets/`, `cover.json`, `recipe.json`), eine einzige HTML-Datei als Ausgabe (Code bleibt getrennt, ein Build fügt zusammen), ein Repository bleibt.
- Rückseite: Umriss, eigene Vorlagen, eigene Schriften, Sichern/Einlesen mit Auswahl und 18 mitgelieferte Spiele-Schriften sind fertig (Format und Regeln: `files.js` `packBundle`/`planImport`/`applyImport`, Schriftliste in `back-design.js` `FONTS`, Dateien und Lizenzen in `disc-sleeve/assets/fonts/games/`). Eigene Schriften reisen in der Projektdatei (ZIP, Ordner `fonts/`, `files.js` `packProject`/`unpackProject`) mit. Offen: Auswahlrechteck im Editor. Beim Ein-Datei-Build die Schriftdateien als Base64 einbetten.
- Offene manuelle Prüfungen (echter Druck, Firefox/Safari, echter Proxy) stehen in `docs/manuelle-pruefung.md`.
