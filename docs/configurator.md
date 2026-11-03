# Konfigurator

Eine Web-App, in der man das Menü per Maske zusammenstellt, statt die `menu.json` von Hand zu schreiben. Das Ergebnis ist eine ZIP-Datei im Format "Rezept-Paket" (siehe [menu-json-spec.md](menu-json-spec.md)), die der Builder direkt verarbeiten kann.

**Online:** https://einmensch002.github.io/DiscMenu-Builder/
**Datei:** [configurator/index.html](../configurator/index.html). Es ist eine einzelne, eigenständige Datei. Herunterladen, als `.html` speichern und lokal im Browser öffnen, dann geht es auch ohne Internet.

## Prinzip

- **Läuft komplett im Browser.** Kein Backend, nichts wird hochgeladen. Bilder, Sounds und die ZIP werden lokal verarbeitet.
- **Keine Abhängigkeiten.** Eine HTML-Datei ohne externe Bibliotheken. ZIP schreiben und lesen sind selbst eingebaut.
- Der Konfigurator erzeugt nur das Rezept. Die Menü-EXE macht der Builder.
- Die Veröffentlichung auf GitHub Pages läuft automatisch über `.github/workflows/pages.yml`, sobald sich etwas im Ordner `configurator/` ändert.

## Bedienung

Links die Liste der Spiele, rechts das Formular zum gewählten Eintrag, ganz rechts die Prüfung und eine Vorschau der `menu.json`. Auf dem Handy stehen die Bereiche untereinander.

- **Disc-Einstellungen:** Titel, EXE-Name, Hintergrundbild, Klick- und Hover-Sound.
- **Spiele:** hinzufügen, löschen, mit den Pfeilen sortieren. Der `index` ergibt sich aus der Reihenfolge (0, 1, 2 ...).
- **Pro Spiel:** Name, Cover, Beschreibung, Installer-Pfad, Parameter, geschätzte Größe.
- **Bereiche DLCs, Patches, Extras:** Einträge mit Name, Gruppe (Unterkategorie, mit Vorschlägen), Beschreibung, Bild und Aktion ("Installer starten" oder "Datei, Ordner oder Link öffnen"). Einträge lassen sich sortieren und entfernen.
- **SteamGridDB:** Spiele und Bilder lassen sich bei SteamGridDB suchen. Schlüssel und Proxy lassen sich in einer (optional verschlüsselten) Datei sichern und wieder einlesen. Siehe [steamgriddb.md](steamgriddb.md).
- **Beschreibungen:** Der Knopf "Beschreibung suchen" holt Texte aus dem Steam-Shop und von der deutschen Wikipedia und kann englische Texte übersetzen. Siehe [steamgriddb.md](steamgriddb.md).
- **Bilder** per Drag-and-drop, Antippen oder über die SteamGridDB-Suche. Beim Hinzufügen werden sie verkleinert und umgewandelt: Cover auf höchstens 800 Pixel als PNG, Hintergrund auf höchstens 1920 Pixel als JPEG. Das hält die Menü-EXE klein. Diese Werte sind vorläufig.
- **Sounds:** WAV, OGG oder MP3, unverändert übernommen.
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

- Der Browser kann nicht prüfen, ob die angegebenen Pfade auf der Disc existieren. Die Pfade werden von Hand eingetragen.
- Für das Umwandeln der Bilder braucht der Browser Unterstützung für `createImageBitmap` und Canvas (alle aktuellen Browser).
- Ist der Speicher des Browsers gesperrt oder voll, zeigt die Kopfzeile "Speichern im Browser nicht möglich". Dann bleibt nur der ZIP-Export.

## Später

- Optionale Prüfung der Disc-Dateien: Der Nutzer wählt den Disc-Ordner aus, und der Konfigurator prüft die Pfade. Das geht nur in Browsern mit Ordnerzugriff (z. B. Chrome, Edge).
- Bearbeitbare JSON-Ansicht.
- Vorschau des Menüs.
- Eigene Tabs, sobald das Format sie unterstützt.
- Gemeinsames JSON Schema für Konfigurator und Builder, damit die Regeln nicht auseinanderlaufen.

## Tests

Die Kernlogik (ZIP, Prüfung, Export, Import, Hilfen für Suche und Beschreibung) steht in der Datei als eigener Block `CORE` und lässt sich ohne Browser testen. Die Oberfläche wurde mit einem simulierten Browser (jsdom) und nachgebauten Antworten der Dienste durchgespielt. Automatische Tests liegen noch nicht im Repo.
