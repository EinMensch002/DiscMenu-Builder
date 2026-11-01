# Konfigurator

Eine Web-App, in der man das Menü per Maske zusammenstellt, statt die `menu.json` von Hand zu schreiben. Das Ergebnis ist eine ZIP-Datei, die der Builder direkt verarbeiten kann.

## Prinzip

- **Läuft komplett im Browser.** Kein eigenes Backend, nichts wird hochgeladen. Bilder, Sounds und die ZIP werden lokal im Browser verarbeitet.
- **Zwei Wege zur Nutzung:**
  1. Online über GitHub Pages.
  2. Als einzelne HTML-Datei zum Herunterladen, die auch ohne Internet funktioniert (z. B. als Release-Datei).
- Der Konfigurator erzeugt nur das Rezept. Die Menü-EXE macht weiterhin der Builder.

Hinweis zu GitHub Pages: Bei einem privaten Repo steht Pages nur mit bezahltem GitHub-Plan zur Verfügung. Mit dem kostenlosen Plan braucht es ein öffentliches Repo (z. B. ein eigenes für den Konfigurator). Die Download-Variante hat diese Einschränkung nicht.

## Bedienform

Vorschlag: **Formular mit Baumansicht**, nicht Blöcke.

- Links ein Baum: Disc → Spiele → Bereiche (DLCs, Patches, Extras) → Einträge.
- Rechts das Formular zum gerade gewählten Element mit allen Feldern aus der [Spezifikation](menu-json-spec.md).
- Bilder und Sounds per Drag-and-drop in die jeweiligen Felder.

Warum nicht Blöcke im Sketch-Stil: Die Struktur ist fest (Spiele mit festen Bereichen und Einträgen). Blöcke würden Aufwand bringen, aber kaum Vorteil gegenüber einer Maske. Eine Blockansicht bleibt als spätere Idee offen.

## Funktionen

Erste Version:
- Spiele anlegen, löschen und per Ziehen sortieren. Der `index` ergibt sich aus der Reihenfolge (ab 0).
- Pro Spiel: Name, Cover, Beschreibung, Installer-Pfad, Größe, und die Bereiche DLCs, Patches, Extras mit Einträgen und Gruppen.
- Pro Eintrag die Wahl zwischen Installer und "Öffnen".
- Bilder werden beim Hinzufügen in ein einheitliches Format und eine begrenzte Größe umgewandelt (hält die Menü-EXE klein).
- Prüfung nach denselben Regeln wie der Builder, mit verständlichen Fehlermeldungen.
- Export als ZIP.
- Import einer vorhandenen ZIP oder `menu.json`, um ein Rezept später weiterzubearbeiten.
- Entwurf im Browser zwischenspeichern.

Später:
- JSON-Ansicht zum direkten Bearbeiten.
- Vorschau des Menüs.
- Eigene Tabs (sobald das Format sie unterstützt).
- Optionale Prüfung der Disc-Dateien: Der Nutzer wählt den Disc-Ordner aus, und der Konfigurator prüft, ob die Installer-Pfade existieren. Das funktioniert nur in Browsern mit Ordnerzugriff (z. B. Chrome, Edge).

## Ausgabe

Das ZIP-Layout steht in der [Spezifikation](menu-json-spec.md) unter "Rezept-Paket". Der Konfigurator vergibt die Dateinamen der Assets selbst, damit die Pfade in der `menu.json` immer stimmen.

## Zusammenspiel mit dem Builder

Der Builder soll das Rezept entweder aus einem Ordner oder direkt aus der ZIP lesen. Da das Paket in der Menü-EXE ohnehin eine ZIP ist, kann die Rezept-ZIP fast unverändert übernommen werden.

## Regeln nur einmal definieren

Die Regeln für die `menu.json` stehen in der Spezifikation. Konfigurator und Builder müssen dieselben Regeln anwenden. Damit sie nicht auseinanderlaufen, soll später ein JSON Schema als gemeinsame Quelle dienen.
