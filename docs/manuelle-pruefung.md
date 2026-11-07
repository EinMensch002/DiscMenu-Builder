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

- [ ] **Naht:** Im Ausdruck ist zwischen Rücken und Vorderseite kein heller Strich zu sehen (besonders an der Kopfleiste).
- [ ] **Minimum und Empfohlen:** Steam-Spiel mit beiden Listen übernehmen. Die Tabelle auf der Rückseite zeigt beide Spalten, nichts ist abgeschnitten. Ausdrucken und prüfen, ob die kleine Schrift gut lesbar ist.
- [ ] **Steam-Übernahme:** Prozessor und Grafikkarte erscheinen als einzelne Einträge in den Auswahlfeldern (z. B. Cyberpunk 2077: GeForce GTX 1060 6 GB, Radeon RX 580 8 GB, Arc A380 als Text), jeder in einer eigenen Zeile.
- [ ] Hülle drucken (A4 quer, 100 %, Ränder "Keine", Hintergrundgrafiken an) und nachmessen: Cover 273 × 183 mm, Rücken 14 mm, Schnittmarken an den Ecken.
- [ ] Schnittmarken und Falzmarken treffen die Kanten der echten Hülle.
- [ ] **Slim:** 266 × 183 mm mit 7 mm Rücken.
- [ ] **Blu-ray-Vorlage:** Die Richtwerte (269 × 148 mm, 14 mm Rücken) passen zu deinem Einleger, sonst eigene Maße notieren und das Ergebnis melden.
- [ ] Der Titel auf dem Rücken liest sich in der Hülle richtig herum, USK vorn (35 mm) und das Motiv sind nicht abgeschnitten.
- [ ] Die Leiste und alle drei Anbieter (GOG in allen fünf Varianten) sehen gedruckt gut aus (Farben, Lesbarkeit). Bei der Leiste: Die Akzentlinie läuft sauber über den Rücken, das Logo oben ragt nirgends heraus.

- [ ] **Steam-Import mit Titel und Cover:** Nach dem Übernehmen steht der Spielname auf dem Rücken und das Steam-Hochformat-Cover vorn. Falls das Cover nicht lädt: Meldung lesen (ggf. `cdn.akamai.steamstatic.com` im Proxy erlauben).
- [ ] **Publisher-Logo (Wikidata):** 🔎 beim Publisher-Logo zeigt den Publisher aus dem Steam-Import vorbelegt, Logos erscheinen und lassen sich übernehmen (z. B. Valve, CD PROJEKT RED).
- [ ] **Symbole und Rücken:** Linien-Symbole, "PC" am Rückenfuß, mittiger Titel und das etwas größere Logo auf dem Ausdruck ansehen.
- [ ] **Steam und Epic Games:** Die dunkle Kopfleiste vorn (Logo, Schriftzug, Akzentlinie) und der dunkle Streifen mit den Spielfunktionen hinten gefallen auf dem Ausdruck, in beiden Stilen.
- [ ] **Speichern:** In Chrome/Edge: Speichern, etwas ändern, Strg+S, die Datei wird überschrieben (nicht neu angelegt) und wieder ladbar. In Firefox: Speichern lädt jedes Mal neu herunter.
- [ ] **Brandfetch:** Client-ID eintragen, im Publisher-Dialog die Quelle Brandfetch wählen (z. B. "Team Cherry"). Treffer erscheinen und das Logo lässt sich übernehmen. (Antwortformat und Bilder von Brandfetch wurden nur nachgebaut geprüft.)
- [ ] **GOG-Leiste:** Weiß, Dunkel und Dunkel durchscheinend auf dem Ausdruck zu hellen und dunklen Covern ansehen. Das Logo ist scharf, der Verlauf bei "durchscheinend" sieht gedruckt gut aus, "PC · DRM-FREI" ist lesbar. Auf einer Blu-ray-Hülle (148 mm hoch) reicht das Bild.
- [ ] **Rückenlogo und Publisher am Fuß:** Auf dem Ausdruck sind das gedrehte Logo und das Publisher-Logo unter "PC" gut lesbar. Bei einem Spiel mit Steam-Logo (`logo.png`) zeigt der Import es auf dem Rücken.
- [ ] **Bild über den Rücken:** Das Motiv geht an den Falzkanten ohne Sprung weiter, der Rücken ist nicht zu dunkel.
- [ ] **Hintergrund transparent (◧):** Bei Logos von Brandfetch verschwindet der weiße Hintergrund, die Kante hat keinen hellen Saum.
- [ ] **Breites Publisher-Logo (z. B. Valve):** Der Rücken bleibt 14 mm breit, das Logo steht gedreht über "PC", "PC" bleibt bei jedem Logo an derselben Stelle. Auf der Rückseite ragen Disc- und Publisher-Logo nicht unter den Rücken.
- [ ] **Falzmarken:** Die Falzmarken einschalten, das Blatt bleibt sichtbar (Vorschau und Druckansicht), kurze gestrichelte Striche stehen oben und unten außerhalb des Covers auf Höhe der Rückenkanten (nicht auf dem Cover).
- [ ] **Unterlage hinter dem Publisher-Logo:** Bei einem durchsichtigen Logo auf unruhigem Frontbild hilft Weiß oder Schwarz, auf dem Ausdruck gut lesbar.
- [ ] **Browser-Speicher:** Bilder laden, Seite neu laden, alles ist wieder da. Zurücksetzen leert ihn. (In Firefox und Safari ebenfalls prüfen.)
- [ ] **Rückenbild:** Ein breites Bild (SteamGridDB-Hintergrund) als Rückenbild laden, Ausschnitt und Abdunkeln einstellen, auf dem Ausdruck gut lesbar.
- [ ] **Rückseite:** Die schmale Spalte mit Publisher, Disc und USK wirkt aufgeräumt, die Angaben sind groß genug lesbar.
- [ ] **Minimum/Empfohlen:** "Minimum" und "Empfohlen" stehen mittig über ihrem Text, gleiche Sätze bei "Sonstiges" mittig über beiden Spalten, die Schrift ist gedruckt lesbar.
- [ ] **Frontbild einpassen:** Auf einer Blu-ray-Hülle (148 mm hoch) mit einem Hochformat-Cover: "Strecken" füllt die Fläche, "Zuschneiden" mit Zoom und Ausschnitt sieht gedruckt gut aus.
- [ ] **USK-Hintergrund:** Bei 0 % steht nur die Raute (kein roter Rand), bei 100 % wie gewohnt. Auf der Rückseite nur die Raute.
- [ ] **GOG-Varianten:** Weiß, Warmweiß, Dunkel, Dunkel mit Violett-Hauch und durchscheinend sehen gedruckt gut aus. Bei "durchscheinend" kein Strich links oder rechts oben in der Leiste (Linien im Bild selbst sind Teil des Covers). "Rücken hell" und die Farbe von "PC" (Weiß/Schwarz) wirken auf dem Ausdruck gut.
- [ ] **Englische Oberfläche:** Sprache oben auf English stellen: alle Beschriftungen, Dialoge und Meldungen sind englisch, das Feld "Sprache der Beschriftung" fehlt, das Cover ist englisch beschriftet.
