# Spezifikation der menu.json (Entwurf, Version 1)

## Pfade

- **Assets** (Cover, Hintergrund, Sounds): relativ zur `menu.json`. Sie werden beim Erstellen in die Menü-EXE gepackt.
- **Installer und Extras**: relativ zum Ordner der fertigen Menü-EXE (Disc-Wurzel). Sie werden erst beim Benutzen aufgelöst.
- Schrägstriche `/` als Trennzeichen, keine Laufwerksbuchstaben.

## Oberste Ebene

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `schemaVersion` | Zahl | ja | Format-Version, aktuell `1` |
| `title` | Text | ja | Titel des Menüs, z. B. Name der Collection |
| `output` | Text | nein | Dateiname der erzeugten EXE |
| `background` | Text | nein | Hintergrundbild (Asset) |
| `sounds` | Objekt | nein | `click`, `hover` (Assets) |
| `games` | Liste | ja | Spiele auf der Disc (mindestens eins) |

Hat `games` nur einen Eintrag, öffnet der Player direkt die Spielseite. Bei mehreren Einträgen zeigt er die Auswahlseite.

## Spiel (`games[]`)

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `index` | Zahl | ja | Reihenfolge auf der Auswahlseite, beginnt bei 0, eindeutig pro Disc |
| `name` | Text | ja | Anzeigename |
| `cover` | Text | nein | Cover-Bild (Asset) |
| `description` | Text | nein | Beschreibung / Lore |
| `installer` | Text | ja | Pfad zum Installer des Spiels |
| `args` | Liste | nein | Zusätzliche Parameter für die stille Installation |
| `estimatedSizeMB` | Zahl | nein | Geschätzte installierte Größe, für die Fortschrittsanzeige |
| `dlcs` | Liste | nein | Einträge für den Bereich DLCs / Erweiterungen |
| `patches` | Liste | nein | Einträge für den Bereich Patches |
| `extras` | Liste | nein | Einträge für den Bereich Extras |
| `provider` | Text | nein | Reserviert, zurzeit nur `gog` (Standard) |
| `customTabs` | Liste | nein | **Geplant, nicht Teil von Version 1.** Eigene Tabs mit `title` und `items` |

## Eintrag (in `dlcs`, `patches`, `extras`)

Alle Bereiche nutzen dasselbe Format.

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `name` | Text | ja | Anzeigename |
| `description` | Text | nein | Beschreibung / Lore |
| `cover` | Text | nein | Bild (Asset) |
| `group` | Text | nein | Unterkategorie, z. B. "Grafik", "Soundtrack". Einträge mit gleicher Gruppe werden unter einer Überschrift zusammengefasst |
| `installer` | Text | * | Pfad zu einem Installer oder Patch-Programm |
| `args` | Liste | nein | Zusätzliche Parameter für die stille Installation (nur mit `installer`) |
| `open` | Text | * | Datei, Ordner oder Link (`http://`, `https://`), der geöffnet werden soll |

\* Genau eines von `installer` oder `open` ist nötig.

## Nicht in der JSON

Diese Einstellungen trifft man erst im Menü, nicht beim Erstellen:
- Silent Install (ja/nein)
- Zielpfad der Installation

## Regeln, die der Builder prüft

- `index` ist eindeutig pro Disc, Werte sind ganze Zahlen ab 0.
- Alle Assets existieren.
- Jeder Eintrag hat genau eines von `installer` oder `open`.
- `schemaVersion` ist bekannt.

Ob die Installer- und Extra-Dateien auf der Disc vorhanden sind, kann der Builder nur prüfen, wenn der Disc-Ordner angegeben wird (offen, siehe [decisions.md](decisions.md)).

## Beispiel

Siehe [examples/menu.example.json](../examples/menu.example.json).
