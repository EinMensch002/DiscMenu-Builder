# DiscMenu-Builder

Werkzeuge für selbst gebrannte Spiele-Discs, z. B. für die eigene GOG-Sammlung auf DVD oder Blu-ray. Das Projekt hat zwei Seiten:

- **Das Menü auf der Disc:** Aus einer einzigen `menu.json` entsteht ein einheitliches Installer-Menü (EXE). Es wirkt wie ein klassischer Installer, ist aber ein Forwarder: Es startet die originalen Installer und öffnet Extras.
- **Die Hülle drumherum:** Druckfertige Hüllen (Vorderseite, Rücken, Rückseite mit Systemanforderungen) im Stil von GOG, Epic Games oder Steam.

Beides stellt man in **einer Web-App** zusammen (Bereiche **Disc-Menü** und **Cover & Hülle**), gespeichert wird es in einer Projektdatei (`recipe.json` mit Bildern), die der Builder direkt verarbeitet.

> **Status und Links**
>
> | Werkzeug | Stand | Aufrufen |
> |---|---|---|
> | **Web-App**: Disc-Menü und Cover & Hülle | fertig und nutzbar, Ausdruck mit echtem Drucker noch zu prüfen | https://einmensch002.github.io/DiscMenu-Builder/ (oben zwischen "Menü" und "Hülle" wechseln, direkt zur Hülle: `#huelle`) |
> | **Builder** und **Player** (die Menü-EXE) | gebaut (Go, eine EXE ohne Installation), noch nicht auf echtem Windows und Wine/Proton geprüft | [Anleitung](docs/player-und-builder.md) |
>
> Die Seite läuft komplett im Browser, nichts wird hochgeladen. Die alten Adressen `/disc-sleeve/` und `/cover/` führen zur Hülle.

## Die Werkzeuge im Überblick

| Werkzeug | Aufgabe | Dokumentation |
|---|---|---|
| **Web-App, Bereich Disc-Menü** (`app/`) | Das Menü der Disc per Maske zusammenstellen (Spiele, Installer, DLCs, Patches, Extras, Bilder, Sounds), Spielordner einlesen, Vorschau mit Installations-Simulation | [docs/web-app.md](docs/web-app.md#bereich-disc-menü) |
| **Builder** (`src/Builder`) | Aus dem Rezept und dem Player die fertige Menü-EXE zusammensetzen und das Rezept prüfen | [docs/player-und-builder.md](docs/player-und-builder.md) |
| **Player** (`src/Player`) | Das Menü selbst, das auf der Disc liegt (Windows 10/11, Linux über Wine/Proton) | [docs/player-und-builder.md](docs/player-und-builder.md) |
| **Web-App, Bereich Cover & Hülle** (`app/`) | Druckfertige Hüllen: Cover, Rücken und Rückseite mit Systemanforderungen, Spielfunktionen und USK, A4 quer mit Schnittmarken | [docs/web-app.md](docs/web-app.md#bereich-cover--hülle) |

Der übliche Ablauf für eine Disc: In der **Web-App** das Projekt anlegen (Disc-Menü, gern per "Spielordner einlesen", dann Cover & Hülle), als Projektdatei speichern, mit dem **Builder** die Menü-EXE erzeugen, Disc brennen und die Hülle drucken.

## Eckpunkte

- **Ein Rezept:** Alles steht in einer Projektdatei (ZIP mit `recipe.json` und Assets). Für eine neue Disc wird nichts neu programmiert.
- **Eine Web-App ohne Backend** (Deutsch oder Englisch) mit zwei Bereichen: **Disc-Menü** (das Menü per Maske zusammenstellen statt JSON zu schreiben, Spielordner einlesen) und **Cover & Hülle** (Cover, Rücken und Rückseite mit Systemanforderungen im Stil des Anbieters, USK-Kennzeichnung, ohne Barcode). Gemeinsame Angaben wie Titel und Cover stehen nur einmal im Projekt.
- **Einheitlicher Look, anpassbar:** Layout und Bedienung sind immer gleich, Texte, Cover, Hintergrund und Sounds kommen aus der Rezeptdatei.
- **Eine oder mehrere Spiele pro Disc:** Bei mehreren Spielen gibt es eine Auswahlseite (Reihenfolge über `index`), bei nur einem Spiel öffnet sich direkt dessen Seite.
- **Pro Spiel:** Installieren (wahlweise still mit Zielpfad), DLCs/Erweiterungen, Patches (z. B. Sprach- oder Grafikpatches), Extras (Soundtrack, Artbooks, Handbücher). Eigene Tabs (z. B. Mods) sind später geplant.
- **Langlebig:** Discs werden immer finalisiert und sind unabhängig vom Internet nutzbar. Gibt es ein Update, kommt eine neue Disc.
- **Plattformen:** Windows 10/11 sowie Linux über Wine/Proton.
- **Zuerst GOG**, daneben Epic Games. Steam ist vorbereitet (Anzeige), später möglicherweise mit Backups und Steam-Daten.

## Dokumentation

| Datei | Inhalt |
|---|---|
| [docs/concept.md](docs/concept.md) | Konzept, Bausteine, Ablauf, Menüaufbau, EXE-Aufbau |
| [docs/player-und-builder.md](docs/player-und-builder.md) | Builder und Player: Bauen, Benutzen, Windows 11, Wine/Proton, Anbieter-Look |
| [docs/web-app.md](docs/web-app.md) | Web-App (Disc-Menü und Cover & Hülle): Leiste, gemeinsames Projekt und Projektdatei, Spielordner einlesen, Hülle gestalten und drucken, Dateien, Tests, Grenzen |
| [docs/steamgriddb.md](docs/steamgriddb.md) | Bilder, Beschreibungen und Übersetzung, Einrichtung, Proxy |
| [docs/menu-json-spec.md](docs/menu-json-spec.md) | Alle Felder der `menu.json`, Aufbau der Rezept-ZIP |
| [docs/installer-integration.md](docs/installer-integration.md) | Installer starten, still installieren, Ergebnis auslesen |
| [docs/platforms-and-tech.md](docs/platforms-and-tech.md) | Windows 10/11, Wine/Proton, Technikauswahl |
| [docs/disc-planung.md](docs/disc-planung.md) | Kapazität, Finalisieren, Updates, Langzeitarchivierung |
| [docs/manuelle-pruefung.md](docs/manuelle-pruefung.md) | Prüfliste für echte Dienste und Browser |
| [docs/decisions.md](docs/decisions.md) | Getroffene und offene Entscheidungen |

## Ordnerstruktur

```
DiscMenu-Builder/
├─ README.md
├─ LICENSE
├─ docs/                    Dokumentation (siehe Tabelle oben)
├─ go.mod, scripts/build.sh Go-Projekt und Build-Skript für die Windows-EXEs
├─ scripts/build-single.js  Ein-Datei-Build der Web-App (npm run build)
├─ app/                     Gemeinsame Web-App: index.html mit den Bereichen Menü (menu.js, menu-core.js, menu.css) und Hülle (DiscSleeve), shell.js schaltet um (Seite in der Wurzel, alt: /disc-sleeve/ und /cover/ leiten weiter)
├─ schema/                  JSON Schema der menu.json
├─ tests/                   Automatische Tests
├─ tools/mkdemo/            Erzeugt die Beispiel-Assets
├─ tools/cors-proxy/        Optionaler Proxy (Cloudflare Worker) für SteamGridDB
├─ .github/ISSUE_TEMPLATE/  Formular für Fehler, Ideen und Fragen (Labels werden automatisch gesetzt)
├─ .github/workflows/       Tests der Web-Tools, Veröffentlichung auf GitHub Pages (`pages.yml`), Vorschau-Seiten für Pull Requests (`preview.yml`), Labels aus Issue-Formularen (`issue-labels.yml`) (Windows-Build und Wine-Test vorerst abgeschaltet)
├─ examples/
│  ├─ recipe.example.json   Beispiel-Projekt im Format der Web-App (gemeinsame Angaben, Menü, Hülle)
│  ├─ menu.example.json     dasselbe Menü als reine menu.json (Format des Builders, drei Spiele: GOG, Epic, Steam)
│  └─ assets/               Beispiel-Cover, -Hintergrund und -Klick-Sound (erzeugt mit tools/mkdemo)
└─ src/
   ├─ Builder/              Menüersteller (Kommandozeile, Drag-and-drop)
   ├─ Player/               Menü, das auf der Disc liegt
   └─ Shared/               Format, Prüfung, Paketformat, Anbieter
```

## Roadmap

Stand: November 2026. Erledigt ist ein Punkt, wenn er im Repo umgesetzt und mit Tests oder im Browser geprüft ist.

### Web-App: Bereich Disc-Menü (früher Konfigurator)

- [x] Maske mit Spieleliste, Bereichen (DLCs, Patches, Extras) und Gruppen
- [x] Bildverarbeitung (Verkleinern, Umwandeln), Sounds
- [x] ZIP-Export und Import (Import legt ein neues Projekt an)
- [x] Projekte im Browser, automatisches Speichern, Speichern mit Dateiauswahl
- [x] SteamGridDB: Spiele suchen, Cover und Hintergründe wählen, Schlüssel und Proxy sichern (optional verschlüsselt)
- [x] Beschreibungssuche bei Steam, GOG und Epic Games, Übersetzung ins Deutsche (MyMemory)
- [x] Proxy (Cloudflare Worker) mit Herkunftsbeschränkung, Anleitung mit Hilfe-Links
- [x] Überarbeitetes Design, helle und dunkle Ansicht
- [x] Veröffentlichung auf GitHub Pages über GitHub Actions
- [ ] GOG- und Epic-Beschreibungen mit echten Anfragen prüfen (bisher nur nachgebaute Antworten)
- [ ] Mit echten Diensten prüfen: Chrome am Computer (Dateiauswahl, Überschreiben), Android-Chrome
- [x] Gemeinsames JSON Schema für Konfigurator und Builder (`schema/menu.schema.json`)
- [x] JSON-Ansicht zum direkten Bearbeiten, Vorschau im Look des Players mit Installations-Simulation
- [x] Automatische Tests im Repo (Kernlogik, Schema, Worker, Oberfläche) mit CI
- [x] Prüfung der Disc-Dateien über Ordnerzugriff (Chrome, Edge)

### Entwicklung und Veröffentlichung

- [x] **Vorschau-Seite für jeden Pull Request** (`/pr/<Nummer>/`, auch auf dem Tablet testbar), wird beim Schließen oder Mergen gelöscht ([Beschreibung](docs/web-app.md#vorschau-für-pull-requests))
- [x] Veröffentlichung auf GitHub Pages bricht laufende Läufe nicht mehr ab (keine roten Deployments mehr)
- [x] **Issue-Formular** "Fehler, Idee oder Frage": Art, Bereich und Stand werden nach dem Absenden automatisch zu Labels, auch für Leute ohne Rechte am Repository; beim Bearbeiten passen sie sich an (`.github/ISSUE_TEMPLATE/issue.yml`, `.github/workflows/issue-labels.yml`)

### Web-App: Bereich Cover & Hülle (früher DiscSleeve)

- [x] Aufgeräumt und neu aufgebaut: Live-Vorschau, USK statt PEGI/ESRB, ohne Barcode, Deutsch oder Englisch
- [x] Druck geprüft: A4 quer, 100 %, Schnittmarken, Falzmarken (Test im Browser)
- [x] Prozessoren und Grafikkarten als Listen (mehrere Einträge, an- und ausschaltbar, GeForce/Radeon, Speicher in GB), Import zerlegt "or" in einzelne Zeilen
- [x] Rückseite mit festen Plätzen: nichts verschiebt sich beim Ausblenden der USK
- [x] Stil "Leiste" (Kopfleiste wie bei Handelsspielen) für alle Anbieter, bei GOG schmal in sechs Varianten (Schieberegler von hell nach dunkel)
- [x] Bilder werden auf Druckgröße verkleinert, Hinweis zur Schärfe (dpi)
- [x] Tests im Repo (Logik, Druck, feste Plätze, beide Stile, Online-Abläufe) und Veröffentlichung unter `/disc-sleeve/`
- [ ] Mit echtem Drucker und echter Hülle prüfen (Maße, Schnittmarken)
- [x] Titel, Anbieter, Größe und Cover aus der `menu.json` oder Rezept-ZIP übernehmen
- [x] Stile passend zum Anbieter (GOG, Epic Games, Steam) mit eigenen Farben, Logo und Schriftzug
- [x] **SteamGridDB** angebunden: Bilder suchen und direkt als Frontcover, Rückseite oder Publisher-Logo übernehmen (mit nachgebauten Antworten getestet)
- [x] **Steam**: Systemanforderungen, Plattformen und Funktionen einlesen (mit nachgebauten Antworten getestet, SteamDB hat keine offene Schnittstelle)
- [x] Gemeinsame Einstellungen mit dem Konfigurator (Schlüssel und Proxy, auf Pages derselbe Speicher)
- [x] Einstellungen wie im Konfigurator: Dialog mit Verbindungstest, Sicherung in Datei mit oder ohne Passwort (gleiches Format, gegenseitig lesbar)
- [x] Projekt (Einstellungen und Bilder) als ZIP exportieren und importieren
- [x] Obere Leiste für alles, was nicht das Cover selbst einstellt (Daten übernehmen, Projekt, Einstellungen)
- [x] Steam-Suche robuster: verständliche Fehlermeldungen, Steam-Adresse oder App-ID statt Suche, gekürzte Angaben
- [x] Eigene Hüllenmaße mit Vorlagen für Blu-ray (Richtwerte, nachmessen)
- [x] **Publisher-Logos** über Wikidata (ohne Schlüssel) und Brandfetch (Client-ID als Passwortfeld), Hintergrund transparent machen, Verbindungstest prüft alle Dienste (mit nachgebauten Antworten getestet)
- [x] **Alle Grafiken als SVG** (USK, DVD, CD, Blu-ray, GOG, Anbieter, Symbole): keine Rastergrafiken mehr, jede Datei nur wenige KB, in jeder Größe scharf (Test sorgt dafür)
- [x] Falzmarken als gestrichelte Striche außerhalb des Covers an den Rückenkanten, mehr Platz im Funktionsstreifen
- [ ] **SteamGridDB und Steam mit den echten Diensten prüfen** und nachbessern ([Checkliste](docs/manuelle-pruefung.md))
- [x] **Daten von GOG** (Katalogsuche, Anforderungen, Funktionen, USK, Publisher, Spiel-Logo und Hintergrund in hoher Auflösung) über die Schnittstellen von GOG, mit nachgebauten Antworten getestet; dpi-Hinweis in der SteamGridDB-Auswahl
- [ ] Eigener PDF-Export (bis dahin: im Druckdialog "Als PDF speichern")

### Builder und Player (gebaut, Praxistest steht aus)

- [x] Technik festgelegt: Go mit Ebitengine, eine EXE ohne C-Compiler und ohne .NET (siehe [docs/platforms-and-tech.md](docs/platforms-and-tech.md))
- [x] Builder: Rezept (ZIP oder Ordner) lesen, prüfen (optional gegen den Disc-Ordner) und Player mit Paket zur Menü-EXE zusammensetzen
- [x] Player: Auswahlseite und Spielseite mit Hover, Sound, Cover und Hintergrund
- [x] Player: Installation normal und still, Zielordner wählen, Fortschrittsanzeige, Ergebnis mit Exit-Code und Protokoll
- [x] Player: DLCs, Patches und Extras mit Gruppen
- [x] Anbieter `gog`, `epic`, `steam` mit eigenem Abzeichen und eigener Farbe (Steam noch ohne Wiederherstellung)
- [x] Tests im Repo und CI für die Web-Tools (Windows-Build und Wine-Rauchtest sind vorerst aus der CI genommen, `go test ./...` und `scripts/build.sh` laufen von Hand)
- [ ] Player an das neue Installer-Layout der Web-Vorschau angleichen (Fenster mit Titelleiste, links Bild und Beschreibung, rechts Knöpfe, Bild folgt dem Mauszeiger)
- [ ] Praxistest unter Windows 10/11: Start, UAC, Ordnerdialog, Zwischenablage ([Checkliste](docs/manuelle-pruefung.md))
- [ ] Praxistest unter Wine und Proton: Start, Grafik (DirectX oder OpenGL), Installer ([Checkliste](docs/manuelle-pruefung.md))
- [ ] Echte GOG-Installer testen: still installieren, Exit-Code, Log, Registry
- [ ] Test auf echter Disc inklusive AutoPlay
- [ ] Programm-Symbol und Versionsangaben in der EXE, Signierung (gegen die SmartScreen-Warnung)

### Nächste Schritte der Web-Tools (Reihenfolge)

- [x] **GOG-Stil überarbeitet:** schmale Leiste wie bei den echten GOG-Hüllen in sechs Varianten (Schieberegler von hell nach dunkel), Logo immer sichtbar, "GOG.COM" ein-/ausschaltbar, Rücken und Streifen neutral statt Lila
- [x] **Oberfläche in Deutsch und Englisch** (Sprachmenü mit Flagge oben, Sprachpakete für weitere Sprachen), Farbe von "PC" am Rücken, GOG-Varianten Weiß, Warmweiß, Dunkel, Violett-Hauch, durchscheinend, heller Rücken
- [x] **Rückseite frei gestalten:** Editor (Pop-up) mit Texten und Bildern zum Anordnen, Schriftarten, Rändern und Übergängen (abgerundet, Rahmen, weich, ausgerissen), Bildern direkt von Steam und GOG und drei Vorlagen; der untere Teil (Spielfunktionen, Anforderungen, Logos) bleibt fest, nur die Höhen sind einstellbar
- [x] Rückseite: Drehen von Elementen, Vorlagen-Leiste mit Vorschau (nach Steam-Hüllen: Among Us, Age of Empires, Spider-Man, Half-Life, Alyx) und durchgehendes Bild über die ganze Rückseite
- [x] Rückseite: Formen (Kreis, Dreieck, Viereck, Stern, freie Fläche) mit beweglichen, einrastenden Punkten; Bilder in Formen mit Verschieben und Zoom (außerhalb grau); Vorlage "Zersplittert" nach Half-Life: Alyx
- [ ] **Rückseite, nächste Stufen** (Reihenfolge wie geplant, Details in [docs/web-app.md](docs/web-app.md#rückseite-gestalten-editor)):
  - [x] **Umriss im Editor:** gewählte Form mit orangem Umriss und Linien zwischen den Punkten, andere Formen mit feinem hellem Umriss (nur im Editor); dazu ein echter Rand (Breite in mm, Farbe) pro Form als Gestaltungsmittel
  - [x] **Eigene Vorlagen:** "+ Vorlage importieren" und "Layout als Vorlage speichern" unten in der Vorlagenleiste, Löschen und "Als Datei" je Vorlage; eine Vorlage speichert nur das Layout (Bilder bleiben Platzhalter)
  - [x] **Sichern und Einlesen der Einstellungen:** Auswahlfenster mit Häkchen (Zugangsdaten, eigene Vorlagen, eigene Schriften, auch einzeln), Vorschau mit Rückfragen beim Einlesen; Teildateien lassen sich nacheinander einlesen, ohne etwas zu überschreiben, was nicht in der Datei steht
  - [x] **Eigene Schriften:** Schriftdateien (.woff2, .woff, .ttf, .otf) im Textfeld des Editors hinzufügen, im Browser gespeichert und im Sichern der Einstellungen enthalten
  - [x] **Eigene Schriften in der Projektdatei (ZIP):** Schriften, die Texte benutzen, werden mitgespeichert und beim Öffnen auf einem anderen Rechner automatisch hinzugefügt
  - [x] **Mehrfachauswahl im Editor:** Elemente mit Strg oder Umschalt wählen (Strg+A alle), gemeinsam verschieben und drehen (jedes um die eigene Mitte), duplizieren, löschen
  - [x] **Durchgehendes Bild:** Die Vorschau zeigt es jetzt auch (der Platzhalter "Rückseite oben" verdeckte es); Standard bleiben zwei getrennte Bilder
  - [x] **Standardschriften:** 18 Spiele-Schriften mit freier Lizenz (OFL/Apache) mitgeliefert (Pixel-Retro, Sci-Fi, Fantasy, Horror, Comic u. a.), im Dropdown jeweils in der eigenen Schrift; eigene Schriften lassen sich im Editor und in den Einstellungen wieder löschen
  - [x] **Spielfunktionen mit vielen Symbolen:** Passt ein Wort nicht mehr in seinen Platz (z. B. "Achievements"), wird die Schrift aller Beschriftungen automatisch kleiner, nichts überlappt mehr (Issue #23)
  - [x] **Auswahlrechteck im Editor:** auf leerer Fläche aufziehen wählt alle berührten Elemente (mit Strg/Umschalt zur Auswahl hinzufügen)
  - [ ] Ausrichtungshilfen (Raster)
- [ ] **Beide Web-Tools zusammenführen** (in Arbeit, drei Schritte):
  - [x] **Eine Seite:** gemeinsamer Ordner `app/`, eine `index.html`, oben eine Leiste mit dem Wechsel "Disc-Menü | Cover & Hülle" ohne Neuladen; die Knöpfe der Leiste passen sich dem Bereich an
  - [x] **Ein Projekt:** ein Speicher und eine Projektdatei für Menü und Hülle (eine `recipe.json` mit den Bereichen Gemeinsam, Menü und Hülle, dazu `assets/` und `fonts/`; der Builder liest sie direkt), verknüpft und nichts doppelt (Spielname = Titel der Hülle, Anbieter, Beschreibung, Größe, Cover), ein Einstellungsdialog, eine Leiste für beide Bereiche, helles Design im Menü; alte Rezepte und Hüllen-Dateien lassen sich weiter öffnen
  - [x] **Spielordner einlesen:** Ordner wie die Disc wählen, Installer, DLCs, Patches und Extras werden vorgeschlagen und lassen sich vor dem Übernehmen ändern
  - [x] **recipe.json bearbeiten** mit den Reitern Alles, Gemeinsam, Menü und Hülle; Hinweis beim Speichern alter Dateien im neuen Format
  - [ ] **Englisch** auch für den Bereich "Menü"
  - Ziel: Menü-Ersteller und Cover-Tool unter einem Dach, mit **einer gemeinsamen Projektdatei** (eine ZIP mit Rezept, Menü-Daten, Cover-Einstellungen und allen Bildern), die man speichern, überschreiben und wieder öffnen kann
- [x] **Ein-Datei-Build:** `npm run build` (Skript `scripts/build-single.js`) macht aus dem Ordner `app/` eine einzige HTML-Datei (rund 1,7 MB, CSS, JavaScript, Bilder und Schriften eingebettet, läuft ohne Internet). Zum Herunterladen auch auf GitHub Pages: [DiscMenu-Builder.html](https://einmensch002.github.io/DiscMenu-Builder/DiscMenu-Builder.html)

### Später

- [ ] Eigene Tabs (z. B. Mods)
- [ ] Bessere Übersetzung (z. B. DeepL mit eigenem Schlüssel)
- [ ] GOG-Katalog als Beschreibungsquelle mit deutschen Texten
- [ ] Steam-Provider: Backups wiederherstellen (Machbarkeit zuerst prüfen)
- [ ] **Soundtrack im Menü abspielen:** Erkennt der Spielordner einen Soundtrack (Gruppe "Musik"), listet das Menü die einzelnen Titel auf und spielt sie direkt ab, statt nur den Ordner zu öffnen (Player: Wiedergabe von MP3/OGG/FLAC, Web-Vorschau: Liste mit Wiedergabe). Idee für den Feinschliff

## Fehler melden und Ideen einreichen

Jeder mit einem GitHub-Konto kann über **Issues → New issue → Fehler, Idee oder Frage** ein Issue anlegen. Im Formular wählt man:

- **Art:** Fehler (`bug`), Idee oder Wunsch (`enhancement`, `idee`), Frage (`question`), Dokumentation (`documentation`), Barrierefreiheit (`accessibility`)
- **Bereich:** Disc-Menü, Cover & Hülle, Builder, Player, Proxy, Tests und Veröffentlichung (Labels `konfigurator`, `discsleeve`, `builder`, `player`, `proxy`, `ci`)
- **Stand:** Haken "muss auf einem echten Gerät geprüft werden" (`manuell testen`)

Nach dem Absenden setzt eine GitHub Action (`.github/workflows/issue-labels.yml`) die passenden Labels, dafür braucht man **keine Rechte** am Repository. Bearbeitet man das Issue und ändert die Auswahl, werden die Labels angepasst. Die Action verwaltet nur diese freigegebenen Labels: `wontfix`, `duplicate`, `invalid`, `in arbeit`, `blockiert`, `help wanted` und `good first issue` setzt nur der Besitzer, sie bleiben immer erhalten. Leere Issues ohne Formular sind weiter möglich, dort setzt die Action nichts. Neue Auswahl im Formular braucht einen Eintrag in `FORM` im Workflow, `tests/issue-labels.test.js` prüft das.

## Regeln für die Dokumentation

- Jedes Thema steht an genau einer Stelle. Andere Dateien verlinken dorthin.
- Ändert sich ein Konzept, werden alle betroffenen Dateien im selben Commit angepasst und überholte Dateien gelöscht.
- Entscheidungen und offene Punkte stehen in [docs/decisions.md](docs/decisions.md).

## Lizenz

MIT, siehe [LICENSE](LICENSE).
