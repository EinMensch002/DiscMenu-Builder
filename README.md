# DiscMenu-Builder

Baut aus einer einzigen `menu.json` ein einheitliches Installer-Menü (EXE) für selbst gebrannte Spiele-Discs, z. B. für die eigene GOG-Sammlung auf CD, DVD oder Blu-ray.

> **Status:** Konzeptphase. Es gibt noch keinen Code, nur Konzept, Ordnerstruktur und ein Beispiel für die `menu.json`.

## Idee

Große GOG-Sammlungen belegen viel Speicherplatz auf dem Server, obwohl man vieles selten spielt. Die Installer (inklusive DLCs und Extras) sollen deshalb auf Discs wandern, mit einem Menü im Stil der alten CD-Installer.

Damit nicht für jede Disc ein Menü neu programmiert werden muss, arbeitet das Projekt mit einem Rezept:

1. Du beschreibst die Disc in einer `menu.json` (Spiele, Cover, Installer, DLCs, Extras).
2. Der **Builder** liest die `menu.json` und erzeugt daraus eine fertige Menü-EXE.
3. Die Menü-EXE kommt zusammen mit den Installern auf die Disc.

## Bestandteile

| Teil | Aufgabe |
|---|---|
| **Builder** (`Menüersteller.exe`) | Liest `menu.json` und Assets im aktuellen Ordner, erzeugt die Menü-EXE |
| **Player** | Die Menü-EXE selbst: zeigt das Menü, startet Installer, spielt Sounds |
| **Shared** | Gemeinsamer Code: Config-Modelle, Payload-Format |

Der Builder kompiliert nichts. Er nimmt einen fertig gebauten Player, hängt Config und Bilder als Paket (Payload) an und speichert das Ergebnis als neue EXE. Details stehen in [docs/concept.md](docs/concept.md).

## Ordnerstruktur

```
DiscMenu-Builder/
├─ README.md
├─ LICENSE
├─ docs/
│  ├─ concept.md           Konzept, Ablauf, Architektur, Grenzen
│  └─ menu-json-spec.md    Beschreibung aller Felder der menu.json
├─ examples/
│  ├─ menu.example.json    Beispiel-Rezept
│  └─ assets/              Beispiel-Cover, -Sounds (später)
└─ src/
   ├─ Builder/             Menüersteller
   ├─ Player/              Laufzeit-Menü
   └─ Shared/              Config-Modelle, Payload-Format
```

## Roadmap

- [ ] Konzept und `menu.json`-Format festlegen (aktueller Stand)
- [ ] Technik bestätigen (Vorschlag: C# / WPF auf .NET Framework 4.8)
- [ ] Player: Menü aus Beispiel-Config anzeigen (Hover, Sound, Cover)
- [ ] Player: Installer starten (interaktiv und still)
- [ ] Builder: Player + Payload zur fertigen EXE zusammensetzen
- [ ] DLCs und Extras im Menü
- [ ] Fortschrittsanzeige bei stillen Installationen
- [ ] Automatischer Build über GitHub Actions
- [ ] Test auf echter Disc inklusive AutoPlay

## Lizenz

MIT, siehe [LICENSE](LICENSE).
