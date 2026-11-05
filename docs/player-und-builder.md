# Builder und Player

Der **Builder** macht aus einem Rezept (ZIP oder Ordner mit `menu.json`) eine **Menü-EXE**. Der **Player** ist der Teil dieser EXE, der auf der Disc läuft. Beide sind in Go geschrieben, siehe [platforms-and-tech.md](platforms-and-tech.md).

## Bauen

Nötig ist nur [Go](https://go.dev/dl/) (Version laut `go.mod`). Ein C-Compiler wird nicht gebraucht, auch nicht für die Windows-EXEs.

```bash
scripts/build.sh
```

Das Ergebnis liegt in `dist/`: `Player.exe`, `Builder.exe`, das Schema und das Beispiel. Fertige Builds gibt es auch in GitHub Actions als Artefakt `DiscMenu-Windows`. `Player.exe` und `Builder.exe` müssen im selben Ordner liegen.

## Menü-EXE erzeugen

1. Im [Konfigurator](configurator.md) das Rezept zusammenstellen und als ZIP exportieren.
2. Die ZIP auf `Builder.exe` ziehen. Oder in der Konsole:

```bash
Builder.exe rezept.zip
Builder.exe -disc E:\ rezept.zip
```

| Option | Bedeutung |
|---|---|
| `-player <Datei>` | Andere `Player.exe` verwenden (Standard: neben dem Builder) |
| `-o <Datei>` | Ausgabedatei (Standard: Feld `output` der `menu.json`, sonst `Setup-Menu.exe`, neben dem Rezept) |
| `-disc <Ordner>` | Prüft, ob Installer und Extras im Disc-Ordner vorhanden sind (Groß-/Kleinschreibung egal) |
| `-check` | Nur prüfen, nichts erzeugen |
| `-pause` | Am Ende auf Enter warten |

Der Builder bricht bei Fehlern ab und erzeugt dann keine Datei. Hinweise (z. B. zu Steam) sind kein Abbruchgrund. Danach kommt die Menü-EXE zusammen mit den Installern und Extras auf die Disc, in dem Aufbau, den die Pfade der `menu.json` vorgeben (siehe [disc-planung.md](disc-planung.md)).

## Bedienung des Menüs

> **Hinweis:** Das Layout wurde in der Web-Vorschau des Konfigurators überarbeitet (klassischer Installer: links Bild und Beschreibung, rechts Knöpfe, das Bild folgt dem Mauszeiger). Der Go-Player hat noch das frühere Layout mit Reitern und wird danach angeglichen (siehe Roadmap).

- **Auswahlseite** bei mehreren Spielen, sonst direkt die Spielseite. Mausrad scrollt, Esc geht zurück.
- **Spielseite:** Reiter Spiel, DLCs, Patches und Extras (nur wenn es Einträge gibt), Gruppen als Überschriften.
- **Stille Installation:** Häkchen, dann Zielordner eintippern, einfügen (Strg+V) oder über "Durchsuchen ..." wählen. Vorschlag: `C:\GOG Games\<Name>`. Der Installer läuft ohne eigenes Fenster, ein Balken zeigt den Fortschritt (geschätzt aus `estimatedSizeMB`).
- **Normal:** Der Original-Installer öffnet sich, das Menü wartet.
- Das Menü lässt sich nicht schließen, solange ein Installer läuft.
- Fehlt eine Datei auf der Disc, zeigt das Menü, welche Datei und wo gesucht wurde.

## Anbieter und Aussehen

Jedes Spiel hat ein Abzeichen mit dem Namen des Anbieters und eine Akzentfarbe (Auswahlseite, Spielseite, Hauptknöpfe):

| `provider` | Abzeichen | Farbe | Verhalten |
|---|---|---|---|
| `gog` (Standard) | GOG | violett | Inno-Setup, still mit Zielordner |
| `epic` | Epic Games | silbern | normal, still nur mit `args` des Eintrags |
| `steam` | Steam | blau | nur Anzeige, "Nicht verfügbar", Extras lassen sich öffnen |

Es werden nur Text und Farben verwendet, keine Logos. GOG, Epic Games und Steam sind Marken ihrer Inhaber, die Namen dienen nur zur Kennzeichnung der Quelle. Neue Quellen werden in `src/Player/providers.go` ergänzt.

## Windows 11

- Die Menü-EXE braucht keine Installation und keine Administratorrechte. Installer, die sie verlangen, lösen die normale Rechteabfrage (UAC) aus.
- **SmartScreen:** Die EXE ist nicht signiert. Beim ersten Start kann Windows warnen ("Weitere Informationen" → "Trotzdem ausführen"). Eine Signierung ist noch offen (siehe Roadmap).
- **AutoPlay:** Eine `autorun.inf` auf der Disc wird von aktuellen Windows-Versionen nicht mehr automatisch ausgeführt. Die EXE wird im Explorer gestartet.

## Linux: Wine und Proton

Es gibt kein AutoPlay. Das Menü wird von Hand gestartet.

```bash
wine /run/media/$USER/DISC/Setup-Menu.exe
```

- **Proton:** Menü-EXE in Steam als "Nicht-Steam-Spiel" hinzufügen und mit Proton starten, oder mit dem Proton-Starter der Wahl (z. B. Heroic, Lutris, Bottles) im gewünschten Präfix.
- **Disc-Ordner:** Der Player nimmt den Ordner der EXE als Disc-Wurzel, im Präfix also z. B. `Z:\run\media\...`. Mit `-disc <Ordner>` lässt er sich überschreiben.
- **Grafik:** Standard ist Direct3D 11 (Wine: wined3d, Proton: DXVK). Bei Darstellungsproblemen `-graphics opengl` versuchen. Das lässt sich auch in den Startoptionen von Steam oder Lutris eintragen.
- **Ton:** Ohne Audiogerät bleibt das Menü stumm und läuft weiter.
- **Installer** laufen im Wine-Präfix. Zielordner wie `C:\GOG Games\...` liegen im Präfix (`drive_c`). Die GOG-Registry wird ebenfalls im Präfix gelesen.
- **Ordnerdialog:** "Durchsuchen ..." nutzt den Windows-Dialog von Wine. Alternativ den Pfad eintippern oder einfügen.

## Hilfen für Fehlersuche

```bash
Menue.exe -selftest     Paket lesen und prüfen, Ergebnis in der Konsole, kein Fenster
Menue.exe -version
Menue.exe -graphics opengl
```

Bei einer GUI-EXE erscheint die Ausgabe nur, wenn sie aus einer Konsole gestartet wird.

Für Entwicklung und Tests gibt es zusätzlich `-recipe <ZIP|Ordner>` (Rezept direkt statt des angehängten Pakets), `-scene game:0:patches` und `-shot datei.png` (Screenshot und Beenden).

## Tests

`go test ./...` prüft Format, Paket, Builder und den Installer-Ablauf (mit einem echten Fake-Installer-Skript). Ein Test lässt den Konfigurator ein Rezept exportieren und liest es streng mit dem Go-Teil, damit beide nicht auseinanderlaufen. Die Oberfläche wurde unter Xvfb mit Screenshots geprüft.

**Nicht geprüft:** Alles, was nur unter echtem Windows oder Wine läuft (UAC-Start, Ordnerdialog, Registry, Zwischenablage, DirectX/DXVK). Dafür gilt die Checkliste in [manuelle-pruefung.md](manuelle-pruefung.md).
