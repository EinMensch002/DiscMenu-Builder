# Entscheidungen

## Getroffen

| Thema | Entscheidung |
|---|---|
| Projektname | DiscMenu-Builder |
| Rezept | `menu.json` (ohne Umlaut) plus Assets, als ZIP: `menu.json` im Root, Assets unter `assets/` |
| Rezept erstellen | Konfigurator als Web-App im Browser, ohne Backend, als einzelne HTML-Datei (umgesetzt, siehe [configurator.md](configurator.md)) |
| Hosting Konfigurator | Repo ist öffentlich, Veröffentlichung auf GitHub Pages. Die HTML-Datei lässt sich auch lokal nutzen |
| Bedienform Konfigurator | Formular mit Spieleliste statt Blöcken |
| Bildformat (vorläufig) | Cover PNG bis 800 Pixel, Hintergrund JPEG bis 1920 Pixel |
| Bildquelle | SteamGridDB (Suche beim Hinzufügen und pro Bildfeld), siehe [steamgriddb.md](steamgriddb.md). Aus dem Browser nur über einen eigenen Proxy erreichbar |
| Beschreibungen | Steam-Shop, GOG und Epic Games Store (jeweils auf Deutsch angefragt), englische Texte lassen sich über MyMemory übersetzen. Alle drei brauchen den Proxy |
| Speichern | Projekte automatisch im Browser, ZIP-Export als Datei. Import legt ein neues Projekt an |
| Zugangsdaten | API-Schlüssel und Proxy im Browser, per Datei sicherbar, optional mit Passwort verschlüsselt. Nie in ZIP oder Repo |
| Format-Beschreibung | Gemeinsames JSON Schema in `schema/menu.schema.json`, wird in den Tests gegen Beispiel und Export geprüft |
| Disc-Prüfung | Im Konfigurator über Ordnerzugriff (Chrome, Edge), nur lesend, ohne Beachtung der Groß-/Kleinschreibung. Auch der Builder prüft mit `-disc <Ordner>`, ob Installer und Extras im Disc-Ordner vorhanden sind |
| Technik Player/Builder | Go mit Ebitengine, 64 Bit, eine EXE, bauen ohne C-Compiler (siehe [platforms-and-tech.md](platforms-and-tech.md)) |
| Anbieter | `provider` ist `gog` (Standard), `epic` oder `steam`. Jeder hat Abzeichen und Farbe im Menü, nur Text ohne Logos. GOG: Inno-Parameter. Epic: normal, still nur mit eigenen `args`. Steam: nur Anzeige, bis die Wiederherstellung geprüft ist |
| Silent-Standard | Aus. Bei Aktivierung schlägt das Menü `C:\GOG Games\<Name>` vor |
| Bildformat Player | PNG, JPEG und WebP werden gelesen |
| Cover-Tool | Liegt im selben Repo (`disc-sleeve/`) und wird als eigene Seite unter `/disc-sleeve/` veröffentlicht: gleiches Thema, gleiche Pages-Veröffentlichung, später Übernahme aus der `menu.json` möglich. Altersfreigabe: USK |
| Cover-Tool: andere Hüllenmaße | Keine festen Blu-ray-Maße, weil die Herstellerangaben abweichen. Stattdessen "Eigene Maße" mit Vorlagen als Richtwerte, die man nachmisst |
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
| GOG- und Epic-Beschreibungen | Funktionieren die inoffiziellen Schnittstellen mit echten Anfragen (Antwortformate, CORS über den Proxy)? Epic wird über die geratene Shop-Adresse gefunden, das ist nur eine Notlösung |
| Übersetzung | Reicht MyMemory (kostenlos, einfach) oder soll es DeepL mit eigenem Schlüssel sein? |
| Bildformat | Passen die vorläufigen Werte (800 und 1920 Pixel) oder sind andere Formate wie WebP besser? Hängt von der Player-Technik ab |
| 32 Bit | Der Player ist nur 64 Bit. Wird 32-Bit-Windows gebraucht? (Windows 10/11 gibt es fast nur noch in 64 Bit) |
| Fortschritt | Wie genau wird der Fortschritt bei Silent angezeigt? (Zielordnergröße ist nur eine Schätzung) |
| Installer ohne Inno | Wie viele GOG-Installer sind keine Inno-Installer und laufen nur im Modus Normal? |
| Eigene Tabs | Genaues Format von `customTabs` (Version 2 des Formats?) |
| Mehrsprachigkeit | Soll das Menü mehrere Sprachen unterstützen? |
| Steam | Lässt sich die Wiederherstellung eines Backups auslösen? Zuerst prüfen |
| Cover-Tool: Steam und SteamGridDB | Umgesetzt und mit nachgebauten Antworten getestet. Offen: Funktionieren die echten Dienste über den Proxy (Antwortformat, Sonderfälle bei den Anforderungen)? Prüfliste in [manuelle-pruefung.md](manuelle-pruefung.md) |
