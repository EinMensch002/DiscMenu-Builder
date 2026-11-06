# Konfigurator

Eine Web-App, in der man das Menü per Maske zusammenstellt, statt die `menu.json` von Hand zu schreiben. Das Ergebnis ist eine ZIP-Datei im Format "Rezept-Paket" (siehe [menu-json-spec.md](menu-json-spec.md)), die der Builder direkt verarbeiten kann.

**Online:** https://einmensch002.github.io/DiscMenu-Builder/
**Datei:** [configurator/index.html](../configurator/index.html). Es ist eine einzelne, eigenständige Datei. Herunterladen, als `.html` speichern und lokal im Browser öffnen, dann geht es auch ohne Internet.

## Prinzip

- **Läuft komplett im Browser.** Kein Backend, nichts wird hochgeladen. Bilder, Sounds und die ZIP werden lokal verarbeitet.
- **Keine Abhängigkeiten.** Eine HTML-Datei ohne externe Bibliotheken. ZIP schreiben und lesen sind selbst eingebaut.
- Der Konfigurator erzeugt nur das Rezept. Die Menü-EXE macht der Builder.
- Die Veröffentlichung auf GitHub Pages läuft automatisch über `.github/workflows/pages.yml`, sobald sich etwas im Ordner `configurator/` oder `cover-tool/` ändert. Der Konfigurator liegt in der Wurzel der Seite, das [Cover-Tool](cover-tool.md) unter `/cover/`. Beide verlinken sich gegenseitig.

## Bedienung

Links die Liste der Spiele, rechts das Formular zum gewählten Eintrag, ganz rechts die Prüfung und eine Vorschau der `menu.json`. Auf dem Handy stehen die Bereiche untereinander.

- **Disc-Einstellungen:** Titel, EXE-Name, Hintergrundbild, Klick- und Hover-Sound.
- **Spiele:** hinzufügen, löschen, mit den Pfeilen sortieren. Der `index` ergibt sich aus der Reihenfolge (0, 1, 2 ...).
- **Pro Spiel:** Name, Quelle (GOG, Epic Games oder Steam, mit Abzeichen in Liste und Vorschau), Cover, Beschreibung, Installer-Pfad, Parameter, geschätzte Größe.
- **Bereiche DLCs, Patches, Extras:** Einträge mit Name, Gruppe (Unterkategorie, mit Vorschlägen), Beschreibung, Bild und Aktion ("Installer starten" oder "Datei, Ordner oder Link öffnen"). Einträge lassen sich sortieren und entfernen.
- **Hilfe-Links:** In den Dialogen für SteamGridDB, Proxy und Beschreibungen führen Links zu den passenden Abschnitten dieser Anleitung, zu SteamGridDB (API-Schlüssel) und zu Cloudflare (Proxy). Fehlermeldungen zu CORS oder zum Proxy enthalten einen Link zur Anleitung.
- **SteamGridDB:** Spiele und Bilder lassen sich bei SteamGridDB suchen. Schlüssel und Proxy lassen sich in einer (optional verschlüsselten) Datei sichern und wieder einlesen. Siehe [steamgriddb.md](steamgriddb.md).
- **Beschreibungen:** Der Knopf "Beschreibung suchen" holt Texte aus dem Steam-Shop, von GOG und aus dem Epic Games Store und kann englische Texte übersetzen. Siehe [steamgriddb.md](steamgriddb.md).
- **Bilder** per Drag-and-drop, Antippen oder über die SteamGridDB-Suche. Beim Hinzufügen werden sie verkleinert und umgewandelt: Cover auf höchstens 800 Pixel als PNG, Hintergrund auf höchstens 1920 Pixel als JPEG. Das hält die Menü-EXE klein. Diese Werte sind vorläufig.
- **Sounds:** WAV, OGG oder MP3, unverändert übernommen.
- **JSON:** Der Knopf "JSON" öffnet die `menu.json` zum direkten Bearbeiten. "Änderungen übernehmen" liest sie zurück in die Maske. Bilder und Sounds bleiben über ihre Pfade (`assets/...`) verbunden, neue Dateien lassen sich nur in der Maske hinzufügen. Felder, die das Format nicht kennt, werden verworfen und gemeldet. Ungültiges JSON bleibt im Dialog stehen und wird nicht übernommen.
- **Vorschau und Simulation:** Der Knopf "Vorschau" zeigt das Menü im Stil klassischer Windows-Installer: ein Fenster mit Titelleiste auf dem Hintergrundbild, **links Bild und Beschreibung, rechts die Knöpfe** mit Symbol und Trennlinien (Installieren, DLCs, Patches, Extras, Beenden). Fährt man mit der Maus über ein Spiel oder einen Eintrag, zeigt die linke Seite dessen Bild und Beschreibung. **Hat ein Eintrag (z. B. ein DLC) ein eigenes Bild, wird dieses gezeigt, sonst das Bild des Spiels.** Das Abzeichen und die Akzentfarbe richten sich nach dem Anbieter. Man kann klicken, in die Bereiche wechseln und "Stille Installation" mit Zielordner (unten im Fenster) einschalten. "Installieren" startet eine **Simulation**, installiert wird nichts:
  - **Still:** Das Menü zeigt "Installation läuft" mit Fortschrittsbalken und danach das Ergebnis.
  - **Normal:** Es erscheint ein nachgebautes Installer-Fenster (Weiter, Installieren, Fertigstellen, Abbrechen), das Menü wartet wie im Player.
  - **Ergebnis wählbar:** Erfolg, Fehler mit Code 1 (Platte voll, mit Protokollauszug) oder Code 5 (Administratorrechte fehlen). Das Tempo lässt sich ändern.
  - Unter der Vorschau steht der **Ablauf** mit der Kommandozeile, mit der der Player den Installer starten würde (z. B. `/VERYSILENT ... /DIR="..."`). Die Befehlszeilen sind durch einen Test mit dem Go-Player abgeglichen.
  - Grenzen: Die Schrift ist die des Systems (der Player nutzt Go Regular), und das Installer-Fenster ist ein allgemeiner Nachbau, kein echter GOG-Installer. Zielordner-Dialog ("Durchsuchen ...") und "Beenden" werden nur simuliert.
- **Disc-Ordner prüfen:** Im Bereich "Prüfung" gibt es (nur in Chrome und Edge am Computer) den Knopf "Disc-Ordner prüfen". Man wählt den Ordner, der so aufgebaut ist wie die fertige Disc, und der Konfigurator meldet, welche Installer- und Extra-Pfade fehlen oder auf einen Ordner statt einer Datei zeigen. Die Groß-/Kleinschreibung wird dabei nicht beachtet. Es wird nur gelesen, nichts verändert oder hochgeladen. Links (`https://`) werden nicht geprüft.
- **Prüfung** nach den Regeln der Spezifikation. Exportieren geht erst, wenn keine Fehler mehr da sind. Hinweise blockieren nicht.

## Projekte, Speichern, Export und Import

**Projekte** liegen im Browser (IndexedDB) und werden bei jeder Änderung automatisch gespeichert, inklusive aller Bilder und Sounds. Der Knopf "Speichern" speichert sofort und bestätigt es. Unter "Projekte" gibt es die Liste aller Projekte mit Öffnen und Löschen sowie "Neues Projekt". Man kann also mehrere Discs parallel und über Tage hinweg bearbeiten, ohne ZIP-Dateien anzulegen. Beim nächsten Öffnen der Seite ist das zuletzt geöffnete Projekt wieder da.

Projekte gelten nur für diesen Browser auf diesem Gerät. Löscht man die Website-Daten des Browsers, sind sie weg. Eine Sicherung ist der ZIP-Export.

**Import** einer ZIP (auch mit Deflate-Kompression) oder `menu.json` legt immer ein **neues Projekt** an. Alle Dateien werden dabei vollständig in den Browser gelesen. Die Original-ZIP wird danach nicht mehr gebraucht und lässt sich löschen oder verschieben. Fehlende Dateien und nicht unterstützte Felder (z. B. `customTabs`) werden als Hinweis gemeldet.

**Export** erzeugt die ZIP komplett neu aus dem Projekt. Bilder und Sounds bleiben dabei unverändert (Bytes identisch), Dateinamen ergeben sich aus den Namen im Projekt. Import und erneuter Export einer unveränderten ZIP liefern dieselbe `menu.json` und dieselben Dateien.

Wie die Datei gespeichert wird, hängt vom Browser ab:

| Browser | Verhalten |
|---|---|
| Chrome, Edge am Computer | Beim Export fragt der Konfigurator: in die bekannte Datei **überschreiben**, **speichern unter** oder normal herunterladen. Die Verknüpfung zur Datei wird beim Projekt gemerkt. Beim Import über den Dateidialog wird die ZIP direkt als Ziel verknüpft. |
| Chrome auf Android, Firefox, Safari | Der Browser lässt Webseiten keine vorhandenen Dateien überschreiben. Jeder Export wird neu heruntergeladen, wiederholte Exporte heißen dann z. B. `name(1).zip`. Deshalb am besten erst exportieren, wenn das Projekt fertig ist. Bis dahin bleibt alles unter "Projekte". |

Die Dateiauswahl mit Überschreiben ist bisher nur mit nachgebauten Browserfunktionen getestet, nicht in einem echten Chrome oder Edge.

## Grenzen

- Ohne Ordnerzugriff (Firefox, Safari, Android) kann der Browser nicht prüfen, ob die Pfade auf der Disc existieren. Die Pfade werden von Hand eingetragen.
- Für das Umwandeln der Bilder braucht der Browser Unterstützung für `createImageBitmap` und Canvas (alle aktuellen Browser).
- Ist der Speicher des Browsers gesperrt oder voll, zeigt die Kopfzeile "Speichern im Browser nicht möglich". Dann bleibt nur der ZIP-Export.

## Später

- Eigene Tabs, sobald das Format sie unterstützt.

## Tests

Im Repo liegen automatische Tests (`npm install`, dann `npm test`). Sie laufen bei jedem Push über `.github/workflows/tests.yml`. Diese Datei prüft vorerst nur die Web-Tools, der Windows-Build (Builder, Player, Wine-Test) ist bewusst nicht dabei.

- `tests/core.test.js`: Kernlogik des Konfigurators (ZIP, Prüfung, Export und Import, Hilfen für Suche und Beschreibung, Einstellungen, Disc-Prüfung). Der Block `CORE` in `index.html` wird ohne Browser geladen.
- `tests/schema.test.js`: Beispiel-Rezept und Konfigurator-Export gegen `schema/menu.schema.json`, plus abgelehnte Fälle.
- `tests/worker.test.js`: CORS-Proxy (Hosts, Herkunft, Weiterleitung).
- `tests/ui/ui.check.js` (`npm run test:ui`): Oberfläche in einem echten Chromium mit Playwright (JSON-Ansicht, Vorschau mit Simulation in beiden Modi und Fehlerfall, Disc-Prüfung mit nachgebautem Ordner). Läuft lokal, nicht in der CI.

Nicht automatisch geprüft sind die echten Dienste (SteamGridDB, Steam, GOG, Epic, MyMemory) und die Dateiauswahl mit Überschreiben. Dafür gibt es eine Prüfliste zum Abhaken: [manuelle-pruefung.md](manuelle-pruefung.md).
