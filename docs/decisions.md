# Entscheidungen

## Getroffen

| Thema | Entscheidung |
|---|---|
| Projektname | DiscMenu-Builder |
| Rezept | `menu.json` (ohne Umlaut) plus Assets, als ZIP: `menu.json` im Root, Assets unter `assets/` |
| Rezept erstellen | Konfigurator als Web-App im Browser, ohne eigenes Backend |
| Rolle des Menüs | Forwarder: startet Original-Installer und öffnet Extras |
| Erste Quelle | GOG. Steam später, dafür ist `provider` reserviert |
| Spiele pro Disc | Eines oder mehrere. Reihenfolge über `index`, beginnend bei 0 |
| Verhalten | Ein Spiel: direkt Spielseite. Mehrere Spiele: Auswahlseite |
| Installation | Silent und normal werden beide eingebaut. Silent verlangt den Zielpfad im Menü |
| Bereiche | DLCs / Erweiterungen, Patches, Extras, je mit Unterkategorien (`group`). Eigene Tabs später |
| Patches | Nur feste Patches zum Brennzeitpunkt. Kein nachträgliches Ergänzen |
| Discs | Immer finalisiert, bei Updates neue Disc |
| Plattformen | Windows 10/11 und Linux über Wine/Proton. Windows 7 ist kein Ziel |
| Erstellen der Menü-EXE | Fertiger Player plus angehängtes Paket, kein Compiler beim Erstellen |

## Offen

| Thema | Frage |
|---|---|
| Technik | Welche Sprache und Bibliothek für Player und Builder? Entscheidung nach dem Mini-Prototyp, siehe [platforms-and-tech.md](platforms-and-tech.md) |
| Bedienform Konfigurator | Formular mit Baumansicht (Vorschlag) oder Blöcke? Siehe [configurator.md](configurator.md) |
| Hosting Konfigurator | GitHub Pages (braucht bei privatem Repo einen bezahlten Plan oder ein öffentliches Repo) und/oder Download als HTML-Datei |
| Builder-Eingabe | Soll der Builder die Rezept-ZIP direkt lesen? (Vorschlag: ja, zusätzlich zum Ordner) |
| Bildformat | Zielgröße und Format der Cover und Hintergründe, damit die EXE klein bleibt |
| 64 Bit | Reicht 64 Bit für Windows 10/11? |
| Silent-Standard | Soll das Menü einen Standardzielpfad vorschlagen? Soll Silent standardmäßig an oder aus sein? |
| Fortschritt | Wie genau wird der Fortschritt bei Silent angezeigt? (Zielordnergröße ist nur eine Schätzung) |
| Installer ohne Inno | Wie viele GOG-Installer sind keine Inno-Installer und laufen nur im Modus Normal? |
| Disc-Prüfung | Soll der Builder oder Konfigurator die Disc-Dateien prüfen, wenn der Disc-Ordner angegeben wird? |
| Eigene Tabs | Genaues Format von `customTabs` (Version 2 des Formats?) |
| Mehrsprachigkeit | Soll das Menü mehrere Sprachen unterstützen? |
| Steam | Lässt sich die Wiederherstellung eines Backups auslösen? Zuerst prüfen |
