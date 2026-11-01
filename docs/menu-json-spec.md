# Spezifikation der menu.json (Entwurf, Version 1)

Alle Pfade zu **Assets** (Cover, Sounds) sind relativ zur `menu.json` und werden beim Erstellen in die Menü-EXE gepackt.
Alle Pfade zu **Installern und Extras** sind relativ zum Ordner der fertigen Menü-EXE (Disc-Wurzel) und werden erst beim Benutzen aufgelöst.

## Oberste Ebene

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `schemaVersion` | Zahl | ja | Version des Formats, aktuell `1` |
| `title` | Text | ja | Titel des Menüs, z. B. Name der Disc oder Collection |
| `output` | Text | nein | Dateiname der erzeugten EXE |
| `background` | Text | nein | Hintergrundbild (Asset) |
| `sounds` | Objekt | nein | z. B. `click`, `hover` (Assets) |
| `patches` | Objekt | nein | Einstellungen zum Patches-Tab, siehe unten |
| `games` | Liste | ja | Spiele auf der Disc (eins oder mehrere) |
| `extras` | Liste | nein | Globale Extras (nicht an ein Spiel gebunden) |

## Patches-Einstellungen (`patches`)

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `enabled` | Wahrheitswert | nein | Patches-Tab anzeigen, Standard `true` |
| `folder` | Text | nein | Ordnername auf der Disc, Standard `Patches` |

## Spiel (`games[]`)

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `id` | Text | ja | Eindeutige ID, nur Kleinbuchstaben, Zahlen, Bindestrich |
| `index` | Zahl | ja | Reihenfolge im Menü (0, 1, 2, ...), eindeutig pro Disc. Dient auch als Ordnername unter `Patches/` |
| `name` | Text | ja | Anzeigename |
| `provider` | Text | nein | Quelle des Spiels, Standard `gog`. Später z. B. `steam` |
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

## Installer (`installer`, Provider `gog`)

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `path` | Text | ja | Pfad zur Installer-EXE, relativ zur Disc-Wurzel |
| `mode` | Text | nein | `interactive` (Standard) oder `silent` |
| `args` | Liste | nein | Zusätzliche Parameter, z. B. `["/NORESTART"]` |
| `estimatedSizeMB` | Zahl | nein | Geschätzte installierte Größe für den Fortschrittsbalken |

Für andere Provider (z. B. `steam`) kommen später eigene Felder dazu. Das Format wird dafür nur erweitert, nicht umgebaut.

## Extra (`extras[]`)

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `name` | Text | ja | Anzeigename, z. B. "Soundtrack" |
| `type` | Text | ja | `file`, `folder` oder `link` |
| `path` | Text | ja | Pfad relativ zur Disc-Wurzel (bei `link` eine URL) |

## Regeln, die der Builder prüft

- `id` ist eindeutig, `index` ist eindeutig pro Disc.
- Alle Assets existieren.
- `mode` und `provider` haben gültige Werte.
