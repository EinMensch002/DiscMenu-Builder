# Entscheidungen

## Getroffen

| Thema | Entscheidung |
|---|---|
| Projektname | DiscMenu-Builder |
| Rezeptdatei | `menu.json` (ohne Umlaut) |
| Rolle des Menüs | Forwarder: startet Original-Installer und öffnet Extras |
| Erste Quelle | GOG. Steam später, dafür ist `provider` reserviert |
| Spiele pro Disc | Eines oder mehrere. Reihenfolge über `index`, beginnend bei 0 |
| Verhalten | Ein Spiel: direkt Spielseite. Mehrere Spiele: Auswahlseite |
| Installation | Silent und normal werden beide eingebaut. Silent verlangt den Zielpfad im Menü |
| Bereiche | DLCs / Erweiterungen, Patches, Extras, je mit Unterkategorien (`group`). Eigene Tabs später |
| Patches | Nur feste Patches zum Brennzeitpunkt. Kein nachträgliches Ergänzen |
| Discs | Immer finalisiert, bei Updates neue Disc |
| Plattformen | Windows 7 und neuer, Linux über Wine/Proton |
| Erstellen der Menü-EXE | Fertiger Player plus angehängtes Paket, kein Compiler beim Erstellen |

## Offen

| Thema | Frage |
|---|---|
| Technik | Welche Sprache und Bibliothek? Entscheidung nach dem Mini-Prototyp, siehe [platforms-and-tech.md](platforms-and-tech.md) |
| Windows 7 | 32 Bit, 64 Bit oder beides? |
| Silent-Standard | Soll das Menü einen Standardzielpfad vorschlagen? Soll Silent standardmäßig an oder aus sein? |
| Fortschritt | Wie genau wird der Fortschritt bei Silent angezeigt? (Zielordnergröße ist nur eine Schätzung) |
| Installer ohne Inno | Wie viele GOG-Installer sind keine Inno-Installer und laufen nur im Modus Normal? |
| Builder-Prüfung | Soll der Builder die Disc-Dateien prüfen, wenn der Disc-Ordner angegeben wird? |
| Eigene Tabs | Genaues Format von `customTabs` (Version 2 des Formats?) |
| Mehrsprachigkeit | Soll das Menü mehrere Sprachen unterstützen? |
| Steam | Lässt sich die Wiederherstellung eines Backups auslösen? Zuerst prüfen |
