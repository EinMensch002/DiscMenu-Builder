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
- **Bilder** per Drag-and-drop oder Antippen. Beim Hinzufügen werden sie verkleinert und umgewandelt: Cover auf höchstens 800 Pixel als PNG, Hintergrund auf höchstens 1920 Pixel als JPEG. Das hält die Menü-EXE klein. Diese Werte sind vorläufig.
- **Sounds:** WAV, OGG oder MP3, unverändert übernommen.
- **Prüfung** nach den Regeln der Spezifikation. Exportieren geht erst, wenn keine Fehler mehr da sind. Hinweise blockieren nicht.
- **Export** als ZIP. Die Dateinamen der Assets vergibt der Konfigurator selbst aus den Namen, damit die Pfade in der `menu.json` stimmen.
- **Import** einer vorhandenen ZIP (auch mit Deflate-Kompression) oder `menu.json`. Fehlende Dateien und nicht unterstützte Felder (z. B. `customTabs`) werden als Hinweis gemeldet.
- **Entwurf:** Der Zwischenstand inklusive Bildern wird im Browser (IndexedDB) gespeichert und beim nächsten Öffnen wiederhergestellt. "Neu" verwirft ihn.

Der Konfigurator schreibt zurzeit nur Version 1 der `menu.json`. Eigene Tabs und `provider` gehören noch nicht dazu.

## Grenzen

- Der Browser kann nicht prüfen, ob die angegebenen Pfade auf der Disc existieren. Die Pfade werden von Hand eingetragen.
- Der gespeicherte Entwurf liegt nur im jeweiligen Browser auf diesem Gerät. Für die Weitergabe oder Sicherung dient der ZIP-Export.
- Für das Umwandeln der Bilder braucht der Browser Unterstützung für `createImageBitmap` und Canvas (alle aktuellen Browser).

## Später

- Optionale Prüfung der Disc-Dateien: Der Nutzer wählt den Disc-Ordner aus, und der Konfigurator prüft die Pfade. Das geht nur in Browsern mit Ordnerzugriff (z. B. Chrome, Edge).
- Bearbeitbare JSON-Ansicht.
- Vorschau des Menüs.
- Eigene Tabs, sobald das Format sie unterstützt.
- Gemeinsames JSON Schema für Konfigurator und Builder, damit die Regeln nicht auseinanderlaufen.

## Tests

Die Kernlogik (ZIP, Prüfung, Export, Import) lässt sich ohne Browser testen, weil sie in der Datei als eigener Block `CORE` steht.
