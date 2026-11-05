# DiscMenu-Builder

Baut aus einer einzigen `menu.json` ein einheitliches Installer-Menü (EXE) für selbst gebrannte Spiele-Discs, z. B. für die eigene GOG-Sammlung auf DVD oder Blu-ray. Das Menü wirkt wie ein klassischer Installer, ist aber ein Forwarder: Es startet die originalen Installer und öffnet Extras.

> **Status:** Der **Konfigurator** ist fertig und nutzbar: https://einmensch002.github.io/DiscMenu-Builder/
> **Builder** und **Player** sind gebaut (Go, eine EXE ohne Installation), aber noch nicht auf echtem Windows und Wine/Proton geprüft. Anleitung: [docs/player-und-builder.md](docs/player-und-builder.md)

## Eckpunkte

- **Ein Rezept:** Alles steht in der `menu.json` (mit Assets, als ZIP). Für eine neue Disc wird nichts neu programmiert.
- **Konfigurator:** Eine Web-App ohne Backend, in der man das Rezept per Maske zusammenstellt, statt die JSON zu schreiben.
- **Einheitlicher Look, anpassbar:** Layout und Bedienung sind immer gleich, Texte, Cover, Hintergrund und Sounds kommen aus der Rezeptdatei.
- **Eine oder mehrere Spiele pro Disc:** Bei mehreren Spielen gibt es eine Auswahlseite (Reihenfolge über `index`), bei nur einem Spiel öffnet sich direkt dessen Seite.
- **Pro Spiel:** Installieren (wahlweise still mit Zielpfad), DLCs/Erweiterungen, Patches (z. B. Sprach- oder Grafikpatches), Extras (Soundtrack, Artbooks, Handbücher). Eigene Tabs (z. B. Mods) sind später geplant.
- **Langlebig:** Discs werden immer finalisiert und sind unabhängig vom Internet nutzbar. Gibt es ein Update, kommt eine neue Disc.
- **Plattformen:** Windows 10/11 sowie Linux über Wine/Proton.
- **Zuerst GOG**, später möglicherweise Steam-Backups.

## Dokumentation

| Datei | Inhalt |
|---|---|
| [docs/concept.md](docs/concept.md) | Konzept, Bausteine, Ablauf, Menüaufbau, EXE-Aufbau |
| [docs/player-und-builder.md](docs/player-und-builder.md) | Builder und Player: Bauen, Benutzen, Windows 11, Wine/Proton, Anbieter-Look |
| [docs/cover-tool.md](docs/cover-tool.md) | Cover-Tool: Hüllen und Booklets zum Ausdrucken |
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
├─ cover-tool/              Cover-Tool: druckfertige Hüllen (Web-App, eigene Seite unter /cover/)
├─ schema/                  JSON Schema der menu.json
├─ tests/                   Automatische Tests
├─ tools/mkdemo/            Erzeugt die Beispiel-Assets
├─ tools/cors-proxy/        Optionaler Proxy (Cloudflare Worker) für SteamGridDB
├─ .github/workflows/       Veröffentlichung des Konfigurators auf GitHub Pages
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

### Cover-Tool (Web-App, im Repo, Seite unter /cover/)

- [x] Aufgeräumt und neu aufgebaut: Live-Vorschau, USK statt PEGI/ESRB, ohne Barcode, GOG-Galaxy-Feld, deutsch oder englisch
- [x] Druck geprüft: A4 quer, 100 %, Schnittmarken, Falzlinien
- [x] Rückseite mit festen Plätzen (nichts verschiebt sich beim Ausblenden von Galaxy-Feld oder USK), zweiter Stil "Modern" (Konsolen-Stil)
- [x] Tests im Repo (Logik und Druck)
- [ ] Mit echtem Drucker und echter Hülle prüfen (Maße, Schnittmarken)
- [ ] Optional: Titel, Anbieter und Cover direkt aus der `menu.json` übernehmen

### Builder und Player (gebaut, Praxistest steht aus)

- [x] Technik festgelegt: Go mit Ebitengine, eine EXE ohne C-Compiler und ohne .NET (siehe [docs/platforms-and-tech.md](docs/platforms-and-tech.md))
- [x] Builder: Rezept (ZIP oder Ordner) lesen, prüfen (optional gegen den Disc-Ordner) und Player mit Paket zur Menü-EXE zusammensetzen
- [x] Player: Auswahlseite und Spielseite mit Hover, Sound, Cover und Hintergrund
- [x] Player: Installation normal und still, Zielordner wählen, Fortschrittsanzeige, Ergebnis mit Exit-Code und Protokoll
- [x] Player: DLCs, Patches und Extras mit Gruppen
- [x] Anbieter `gog`, `epic`, `steam` mit eigenem Abzeichen und eigener Farbe (Steam noch ohne Wiederherstellung)
- [x] Tests im Repo und CI mit Windows-Build und Wine-Rauchtest
- [ ] Player an das neue Installer-Layout der Web-Vorschau angleichen (Fenster mit Titelleiste, links Bild und Beschreibung, rechts Knöpfe, Bild folgt dem Mauszeiger)
- [ ] Praxistest unter Windows 10/11: Start, UAC, Ordnerdialog, Zwischenablage ([Checkliste](docs/manuelle-pruefung.md))
- [ ] Praxistest unter Wine und Proton: Start, Grafik (DirectX oder OpenGL), Installer ([Checkliste](docs/manuelle-pruefung.md))
- [ ] Echte GOG-Installer testen: still installieren, Exit-Code, Log, Registry
- [ ] Test auf echter Disc inklusive AutoPlay
- [ ] Programm-Symbol und Versionsangaben in der EXE, Signierung (gegen die SmartScreen-Warnung)

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
