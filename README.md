# DiscMenu-Builder

Werkzeuge für selbst gebrannte Spiele-Discs, z. B. für die eigene GOG-Sammlung auf DVD oder Blu-ray. Das Projekt hat zwei Seiten:

- **Das Menü auf der Disc:** Aus einer einzigen `menu.json` entsteht ein einheitliches Installer-Menü (EXE). Es wirkt wie ein klassischer Installer, ist aber ein Forwarder: Es startet die originalen Installer und öffnet Extras.
- **Die Hülle drumherum:** Das **Cover-Tool** erzeugt druckfertige Hüllen (Vorderseite, Rücken, Rückseite mit Systemanforderungen) im GOG-Stil.

> **Status und Links**
>
> | Werkzeug | Stand | Aufrufen |
> |---|---|---|
> | **Menü-Konfigurator** | fertig und nutzbar | https://einmensch002.github.io/DiscMenu-Builder/ |
> | **DiscSleeve** (Hüllen zum Ausdrucken) | fertig und nutzbar, Ausdruck mit echtem Drucker noch zu prüfen | https://einmensch002.github.io/DiscMenu-Builder/disc-sleeve/ |
> | **Builder** und **Player** (die Menü-EXE) | gebaut (Go, eine EXE ohne Installation), noch nicht auf echtem Windows und Wine/Proton geprüft | [Anleitung](docs/player-und-builder.md) |
>
> Beide Web-Apps laufen komplett im Browser, nichts wird hochgeladen, und verlinken sich gegenseitig.

## Die Werkzeuge im Überblick

| Werkzeug | Aufgabe | Dokumentation |
|---|---|---|
| **Konfigurator** (`configurator/`) | Das Rezept (`menu.json` mit Bildern und Sounds) per Maske zusammenstellen, mit Vorschau und Installations-Simulation. Exportiert eine ZIP | [docs/configurator.md](docs/configurator.md) |
| **Builder** (`src/Builder`) | Aus dem Rezept und dem Player die fertige Menü-EXE zusammensetzen und das Rezept prüfen | [docs/player-und-builder.md](docs/player-und-builder.md) |
| **Player** (`src/Player`) | Das Menü selbst, das auf der Disc liegt (Windows 10/11, Linux über Wine/Proton) | [docs/player-und-builder.md](docs/player-und-builder.md) |
| **DiscSleeve** (`disc-sleeve/`) | Druckfertige Hüllen: Cover, Rücken und Rückseite mit Systemanforderungen, Spielfunktionen und USK, A4 quer mit Schnittmarken | [docs/disc-sleeve.md](docs/disc-sleeve.md) |

Der übliche Ablauf für eine Disc: Rezept im **Konfigurator** erstellen, mit dem **Builder** die Menü-EXE erzeugen, Disc brennen und mit dem **Cover-Tool** die Hülle drucken.

## Eckpunkte

- **Ein Rezept:** Alles steht in der `menu.json` (mit Assets, als ZIP). Für eine neue Disc wird nichts neu programmiert.
- **Konfigurator:** Eine Web-App ohne Backend, in der man das Rezept per Maske zusammenstellt, statt die JSON zu schreiben.
- **DiscSleeve (früher Cover-Tool):** Eine zweite Web-App für die Hülle der Disc. Sie druckt Cover, Rücken und Rückseite mit Systemanforderungen im GOG-Stil (Leistenstil, Deutsch oder Englisch, USK-Kennzeichnung, ohne Barcode).
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
| [docs/disc-sleeve.md](docs/disc-sleeve.md) | DiscSleeve (Cover-Tool): Bedienung, Maße, Stile, Drucken, Grenzen, Geplantes |
| [docs/configurator.md](docs/configurator.md) | Konfigurator (Web-App): Bedienung, Grenzen |
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
├─ configurator/            Konfigurator: index.html (eine eigenständige Datei)
├─ go.mod, scripts/build.sh Go-Projekt und Build-Skript für die Windows-EXEs
├─ disc-sleeve/              DiscSleeve: druckfertige Hüllen (Web-App, Seite unter /disc-sleeve/, alt: /cover/ leitet weiter)
├─ schema/                  JSON Schema der menu.json
├─ tests/                   Automatische Tests
├─ tools/mkdemo/            Erzeugt die Beispiel-Assets
├─ tools/cors-proxy/        Optionaler Proxy (Cloudflare Worker) für SteamGridDB
├─ .github/workflows/       Tests der Web-Tools und Veröffentlichung von Konfigurator und Cover-Tool auf GitHub Pages (Windows-Build und Wine-Test vorerst abgeschaltet)
├─ examples/
│  ├─ menu.example.json     Beispiel-Rezept mit drei Spielen (GOG, Epic, Steam)
│  └─ assets/               Beispiel-Cover, -Hintergrund und -Klick-Sound (erzeugt mit tools/mkdemo)
└─ src/
   ├─ Builder/              Menüersteller (Kommandozeile, Drag-and-drop)
   ├─ Player/               Menü, das auf der Disc liegt
   └─ Shared/               Format, Prüfung, Paketformat, Anbieter
```

## Roadmap

Stand: November 2026. Erledigt ist ein Punkt, wenn er im Repo umgesetzt und mit Tests oder im Browser geprüft ist.

### Konfigurator (Web-App, live)

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

### DiscSleeve (Web-App, live unter /disc-sleeve/)

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
- [ ] **Rückseite, nächste Stufen:** eigene Vorlagen speichern und importieren, eigene Schriftdateien mitliefern, Ausrichtungshilfen (Raster)
- [ ] **Beide Web-Tools zusammenführen:** Menü-Ersteller und Cover-Tool unter einem Dach, mit **einer gemeinsamen Projektdatei** (eine ZIP mit Rezept, Menü-Daten, Cover-Einstellungen und allen Bildern), die man speichern, überschreiben und wieder öffnen kann
- [ ] **Ein-Datei-Build** (Vorarbeit erledigt: alle Grafiken sind SVG, nur die Schrift Lato ist noch eine Binärdatei): Der Code bleibt für die Arbeit auf mehrere Dateien aufgeteilt (HTML, CSS, JavaScript, Symbole). Ein Build-Schritt erzeugt daraus **eine einzige HTML-Datei**, in der CSS, JavaScript und alle Grafiken (SVG als Text, die Schrift als eingebettete Daten) stecken. Zum Veröffentlichen oder Weitergeben genügt dann diese eine Datei, ohne Ordner mit Zusatzdateien

### Später

- [ ] Eigene Tabs (z. B. Mods)
- [ ] Bessere Übersetzung (z. B. DeepL mit eigenem Schlüssel)
- [ ] GOG-Katalog als Beschreibungsquelle mit deutschen Texten
- [ ] Steam-Provider: Backups wiederherstellen (Machbarkeit zuerst prüfen)

## Regeln für die Dokumentation

- Jedes Thema steht an genau einer Stelle. Andere Dateien verlinken dorthin.
- Ändert sich ein Konzept, werden alle betroffenen Dateien im selben Commit angepasst und überholte Dateien gelöscht.
- Entscheidungen und offene Punkte stehen in [docs/decisions.md](docs/decisions.md).

## Lizenz

MIT, siehe [LICENSE](LICENSE).
