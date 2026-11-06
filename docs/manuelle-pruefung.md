# Manuelle Prüfung des Konfigurators

Diese Punkte lassen sich nicht automatisch testen, weil sie echte Dienste oder echte Browser brauchen. Abhaken, sobald geprüft, und Auffälligkeiten als Issue anlegen. Voraussetzung für die Dienste: ein eigener Proxy (siehe [steamgriddb.md](steamgriddb.md)) und ein SteamGridDB-Schlüssel.

## Beschreibungssuche (mit Proxy)

- [ ] **Steam:** "Beschreibung suchen" für ein bekanntes Spiel (z. B. Portal 2). Es erscheint ein deutscher Text.
- [ ] **GOG:** Suche liefert einen Treffer mit Text. Falls nicht: Fehlermeldung notieren, Antwortformat von `https://catalog.gog.com/v1/catalog?query=like:<Name>` und `https://api.gog.com/products/<id>?expand=description` prüfen.
- [ ] **Epic:** Suche liefert einen Treffer (läuft über die geratene Shop-Adresse bei `store-content.ak.epicgames.com`). Bei Spielen mit ungewöhnlichem Namen kann das scheitern, das ist bekannt.
- [ ] **Übersetzung:** Ein englischer Text wird über MyMemory ins Deutsche übersetzt, auch bei langen Texten (mehrere Teile).
- [ ] **Nur eine Quelle fällt aus:** Die übrigen Quellen zeigen weiterhin Treffer, die Fehlermeldung erscheint nur einmal.

## SteamGridDB

- [ ] Spiel hinzufügen (Suche, Cover und Hintergrund wählen).
- [ ] Bildsuche pro Feld (Cover, Hintergrund).
- [ ] Einstellungen sichern und wieder einlesen, einmal ohne und einmal mit Passwort.

## Browser

- [ ] **Chrome am Computer:** ZIP mit "Speichern unter" und mit "Überschreiben". Import über den Dateidialog verknüpft die Datei.
- [ ] **Chrome am Computer:** "Disc-Ordner prüfen" mit einem echten Disc-Ordner (oder einem Ordner, der so aufgebaut ist).
- [ ] **Android-Chrome:** Bedienung per Touch, Bilder per Antippen, Export als Download, Vorschau und JSON-Ansicht lesbar.
- [ ] **Firefox oder Safari:** Alles außer Dateiauswahl, Überschreiben und Disc-Prüfung funktioniert.

# Manuelle Prüfung von Player und Builder

Der Player wurde bisher nur unter Linux (Xvfb) und als Windows-Build geprüft. Diese Punkte brauchen echte Systeme.

## Windows 10/11

- [ ] `Builder.exe` mit einer ZIP aus dem Konfigurator: Menü-EXE entsteht. Drag-and-drop auf `Builder.exe` zeigt am Ende "Enter drücken".
- [ ] Die Menü-EXE startet per Doppelklick (SmartScreen-Warnung ist erwartet). Auswahlseite und Spielseite sehen aus wie im Konfigurator-Vorschau.
- [ ] Hover- und Klick-Sound sind zu hören.
- [ ] **Normal installieren** mit einem echten GOG-Installer: Rechteabfrage erscheint, Installer läuft, das Menü zeigt danach "Fertig".
- [ ] **Still installieren** (Zielordner wählen): kein Installerfenster, Balken bewegt sich, Ergebnis stimmt, Spiel liegt im Zielordner.
- [ ] Installer abbrechen oder scheitern lassen: Meldung mit Exit-Code und Protokoll.
- [ ] "Durchsuchen ..." öffnet den Ordnerdialog, Strg+V fügt im Zielordner-Feld ein.
- [ ] Nach einer normalen Installation wird der Ordner in der Registry erkannt (siehe "Installiert nach") und für DLCs vorgeschlagen.
- [ ] Extras öffnen: Datei, Ordner und Link.
- [ ] Menü schließen, während ein Installer läuft: wird abgelehnt.
- [ ] Der Player sieht der Vorschau im Konfigurator ähnlich (Layout, Farben, Abzeichen). Abweichungen als Issue melden, die Vorschau soll den Player abbilden.
- [ ] Hohe Bildschirmauflösung (150 % Skalierung): Schrift und Bedienelemente sind scharf und passend groß.

## Wine und Proton

- [ ] `wine Menue.exe -selftest` und `wine Menue.exe -version` geben Text aus.
- [ ] Das Fenster öffnet sich mit dem Standard (Direct3D 11). Sonst: `-graphics opengl`.
- [ ] Ohne Audiogerät startet das Menü trotzdem.
- [ ] Bedienung mit Maus, Mausrad und Tastatur.
- [ ] Installer starten, normal und still. Zielordner liegt im Präfix.
- [ ] Extras öffnen (Ordner und Link öffnen sich auf dem Linux-Desktop).
- [ ] Proton: als Nicht-Steam-Spiel gestartet, Disc-Wurzel stimmt (sonst `-disc`).
- [ ] CI-Job "Wine-Rauchtest" in GitHub Actions läuft grün.

## Echte Disc

- [ ] Menü-EXE und Inhalte brennen, finalisieren und von der Disc starten: Pfade stimmen, Installer sind erreichbar.
- [ ] `Builder.exe -disc <Disc-Ordner>` meldet keine fehlenden Dateien.

# Manuelle Prüfung des Cover-Tools

Das [Cover-Tool](cover-tool.md) ist mit nachgebauten Diensten und im Browser-Druck getestet. Diese Punkte brauchen echte Dienste und einen echten Drucker. Voraussetzung für die Dienste: derselbe Proxy und SteamGridDB-Schlüssel wie im Konfigurator (Einstellungen im Cover-Tool prüfen, auf Pages sollten sie schon da sein).

## Steam und SteamGridDB (mit Proxy)

- [ ] **Steam:** "Anforderungen von Steam" mit einem bekannten Spiel (z. B. Portal 2). Die Suche liefert Treffer, die Anforderungen erscheinen (Windows-Versionen, Prozessor, Grafik, Speicher, DirectX), und "Übernehmen" füllt die Felder.
- [ ] **Steam per Adresse:** Die Adresse einer Steam-Seite (oder die App-ID) in das Suchfeld einfügen führt direkt zu den Anforderungen.
- [ ] **Verbindung testen** in den Einstellungen zeigt für Steam-Shop und SteamGridDB je ein Häkchen.
- [ ] **Steam, Sonderfälle:** Ein altes Spiel ohne Angaben, ein Spiel nur mit Freitext bei den Anforderungen und eines mit deutschem Shop-Text. Notieren, was nicht erkannt wird.
- [ ] **Funktionen:** Die gesetzten Spielfunktionen stimmen mit dem Steam-Shop überein (Single-Player, Mehrspieler, Co-op, Erfolge, Cloud Saves, Controller).
- [ ] **SteamGridDB:** Suche über das 🔎 am Frontcover. Hochformat-Cover erscheinen, die Übernahme klappt (Bild wird über den Proxy geladen).
- [ ] **Rückseite und Logo:** Hintergründe (Hero) und Logos lassen sich laden und übernehmen.
- [ ] **Fehlerfälle:** Falscher Schlüssel, falsche Proxy-Adresse und ohne Proxy zeigen eine verständliche Meldung.
- [ ] **Gemeinsame Einstellungen:** Schlüssel und Proxy aus dem Konfigurator sind im Cover-Tool schon eingetragen (und umgekehrt).

## Einstellungen und Projekt

- [ ] **Einstellungen sichern** (mit Dialog zur Dateiauswahl in Chrome oder Edge): Datei mit und ohne Passwort speichern, löschen, wieder einlesen.
- [ ] Eine im **Konfigurator** gesicherte Einstellungsdatei lässt sich im Cover-Tool einlesen (und umgekehrt).
- [ ] **Projekt exportieren** und wieder **importieren**: Einstellungen und Bilder sind danach wie vorher.

## Ausdruck

- [ ] **Naht:** Im Ausdruck ist zwischen Rücken und Vorderseite kein heller Strich zu sehen (besonders an der GOG-Logo-Ecke).
- [ ] **Steam-Übernahme:** Prozessor und Grafikkarte erscheinen in den Kategorien (z. B. Cyberpunk 2077), die Angaben passen in das Feld.
- [ ] Hülle drucken (A4 quer, 100 %, Ränder "Keine", Hintergrundgrafiken an) und nachmessen: Cover 273 × 183 mm, Rücken 14 mm, Schnittmarken an den Ecken.
- [ ] Schnittmarken und Falzlinien treffen die Kanten der echten Hülle.
- [ ] **Slim:** 266 × 183 mm mit 7 mm Rücken.
- [ ] **Blu-ray-Vorlage:** Die Richtwerte (269 × 148 mm, 14 mm Rücken) passen zu deinem Einleger, sonst eigene Maße notieren und das Ergebnis melden.
- [ ] Der Titel auf dem Rücken liest sich in der Hülle richtig herum, USK vorn (35 mm) und das Motiv sind nicht abgeschnitten.
- [ ] Beide Stile (Klassisch und Modern) und alle drei Anbieter sehen gedruckt gut aus (Farben, Lesbarkeit der Angaben auf dem dunklen Feld).

