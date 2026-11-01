# DiscMenu-Builder

Baut aus einer einzigen `menu.json` ein einheitliches Installer-Menü (EXE) für selbst gebrannte Spiele-Discs, z. B. für die eigene GOG-Sammlung auf DVD oder Blu-ray. Das Menü wirkt wie ein klassischer Installer, ist aber ein Forwarder: Es startet die originalen Installer und öffnet Extras.

> **Status:** Der **Konfigurator** ist fertig und nutzbar: https://einmensch002.github.io/DiscMenu-Builder/
> Player und Builder sind noch in der Konzeptphase.

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
| [docs/configurator.md](docs/configurator.md) | Konfigurator (Web-App): Bedienung, Grenzen |
| [docs/menu-json-spec.md](docs/menu-json-spec.md) | Alle Felder der `menu.json`, Aufbau der Rezept-ZIP |
| [docs/installer-integration.md](docs/installer-integration.md) | Installer starten, still installieren, Ergebnis auslesen |
| [docs/platforms-and-tech.md](docs/platforms-and-tech.md) | Windows 10/11, Wine/Proton, Technikauswahl |
| [docs/disc-planung.md](docs/disc-planung.md) | Kapazität, Finalisieren, Updates, Langzeitarchivierung |
| [docs/decisions.md](docs/decisions.md) | Getroffene und offene Entscheidungen |

## Ordnerstruktur

```
DiscMenu-Builder/
├─ README.md
├─ LICENSE
├─ docs/                    Dokumentation (siehe Tabelle oben)
├─ configurator/            Konfigurator: index.html (eine eigenständige Datei)
├─ .github/workflows/       Veröffentlichung des Konfigurators auf GitHub Pages
├─ examples/
│  ├─ menu.example.json     Beispiel-Rezept mit zwei Spielen
│  └─ assets/               Beispiel-Cover und -Sounds (später)
└─ src/
   ├─ Builder/              Menüersteller
   ├─ Player/               Menü, das auf der Disc liegt
   └─ Shared/               Config-Modelle, EXE-Paketformat
```

## Roadmap

- [ ] Konzept und Formate festlegen (aktueller Stand)
- [ ] Mini-Prototyp zur Technikauswahl, getestet unter Windows 10/11 und Wine
- [ ] Echte GOG-Installer testen: still installieren, Exit-Code, Registry
- [ ] Player: Auswahlseite und Spielseite mit Hover, Sound und Cover
- [ ] Player: Installer starten (normal und still), Zielpfad wählen
- [ ] Player: DLCs, Patches und Extras mit Gruppen
- [ ] Builder: Player und Paket zur fertigen EXE zusammensetzen
- [x] Konfigurator: Maske, Bildverarbeitung, ZIP-Export, Import (Version 1)
- [ ] Konfigurator: gemeinsames JSON Schema, JSON-Ansicht, Vorschau
- [ ] Fortschrittsanzeige bei stillen Installationen
- [ ] Automatischer Build über GitHub Actions
- [ ] Test auf echter Disc inklusive AutoPlay und Linux
- [ ] Später: eigene Tabs (z. B. Mods)
- [ ] Später: Steam (Machbarkeit zuerst prüfen)

## Regeln für die Dokumentation

- Jedes Thema steht an genau einer Stelle. Andere Dateien verlinken dorthin.
- Ändert sich ein Konzept, werden alle betroffenen Dateien im selben Commit angepasst und überholte Dateien gelöscht.
- Entscheidungen und offene Punkte stehen in [docs/decisions.md](docs/decisions.md).

## Lizenz

MIT, siehe [LICENSE](LICENSE).
