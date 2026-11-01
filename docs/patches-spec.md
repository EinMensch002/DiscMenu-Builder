# Patches (Entwurf, Version 1)

Der Player liest den Patches-Ordner zur Laufzeit aus, er ist nicht Teil der Menü-EXE.

## Ordnerstruktur

```
Patches/
└─ <Spiel-Index>/
   └─ <Patch-Index>/
      ├─ patch.json
      └─ <Patch-Datei>
```

- `<Spiel-Index>` entspricht dem Feld `index` des Spiels in der `menu.json`.
- `<Patch-Index>` ist eine fortlaufende Zahl und bestimmt die Reihenfolge (aufsteigend).
- Ordner ohne gültige `patch.json` werden ignoriert und im Log vermerkt.

## patch.json

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `schemaVersion` | Zahl | ja | Version des Formats, aktuell `1` |
| `name` | Text | ja | Anzeigename, z. B. "Patch 1.2" |
| `version` | Text | ja | Versionsnummer des Patches |
| `description` | Text | nein | Kurzbeschreibung oder Änderungsliste |
| `file` | Text | ja | Dateiname der Patch-EXE, relativ zum Patch-Ordner |
| `mode` | Text | nein | `interactive` (Standard) oder `silent` |
| `args` | Liste | nein | Zusätzliche Parameter |
| `date` | Text | nein | Veröffentlichungsdatum (`JJJJ-MM-TT`) |

## Beispiel

```json
{
  "schemaVersion": 1,
  "name": "Patch 1.2",
  "version": "1.2.0",
  "description": "Fehlerbehebungen und Verbesserungen.",
  "file": "patch_1_2.exe",
  "mode": "interactive",
  "date": "2026-11-01"
}
```
