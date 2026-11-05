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
