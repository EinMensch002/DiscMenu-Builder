# Spezifikation der menu.json (Entwurf, Version 1)

Alle Pfade zu **Assets** (Cover, Sounds) sind relativ zur `menu.json` und werden beim Erstellen in die Menü-EXE gepackt.
Alle Pfade zu **Installern und Extras** sind relativ zum Ordner der fertigen Menü-EXE (Disc-Wurzel) und werden erst beim Benutzen aufgelöst.

## Oberste Ebene

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `schemaVersion` | Zahl | ja | Version des Formats, aktuell `1` |
| `title` | Text | ja | Titel des Menüs, z. B. Name der Disc |
| `output` | Text | nein | Dateiname der erzeugten EXE |
| `background` | Text | nein | Hintergrundbild (Asset) |
| `sounds` | Objekt | nein | z. B. `click`, `hover` (Assets) |
| `games` | Liste | ja | Spiele auf der Disc |
| `extras` | Liste | nein | Globale Extras (nicht an ein Spiel gebunden) |

## Spiel (`games[]`)

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `id` | Text | ja | Eindeutige ID, nur Kleinbuchstaben, Zahlen, Bindestrich |
| `name` | Text | ja | Anzeigename |
| `cover` | Text | nein | Cover-Bild (Asset) |
| `description` | Text | nein | Beschreibung / Lore |
| `installer` | Objekt | ja | siehe unten |
| `dlcs` | Liste | nein | DLCs zu diesem Spiel |
| `extras` | Liste | nein | Extras zu diesem Spiel |

## DLC (`dlcs[]`)

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `id` | Text | ja | Eindeutige ID |
| `name` | Text | ja | Anzeigename |
| `cover` | Text | nein | DLC-Cover (Asset) |
| `lore` | Text | nein | Beschreibung / Lore |
| `installer` | Objekt | ja | siehe unten |

## Installer (`installer`)

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `path` | Text | ja | Pfad zur Installer-EXE, relativ zur Disc-Wurzel |
| `mode` | Text | nein | `interactive` (Standard) oder `silent` |
| `args` | Liste | nein | Zusätzliche Parameter, z. B. `["/NORESTART"]` |
| `estimatedSizeMB` | Zahl | nein | Geschätzte installierte Größe für den Fortschrittsbalken |

## Extra (`extras[]`)

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `name` | Text | ja | Anzeigename, z. B. "Soundtrack" |
| `type` | Text | ja | `file`, `folder` oder `link` |
| `path` | Text | ja | Pfad relativ zur Disc-Wurzel (bei `link` eine URL) |
