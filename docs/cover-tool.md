# Cover-Tool

Eine Web-App für die **Hüllen** der Discs. Sie erzeugt ein druckfertiges Blatt (A4 quer) mit Rückseite, Rücken und Vorderseite im GOG-Stil, auf Wunsch mit Systemanforderungen, Spielfunktionen und USK-Kennzeichnung. Sie ergänzt den [Konfigurator](configurator.md) und das Menü ([Builder und Player](player-und-builder.md)): Das Menü liegt auf der Disc, das Cover steckt in der Hülle.

**Online:** https://einmensch002.github.io/DiscMenu-Builder/cover/
**Dateien:** [cover-tool/](../cover-tool/). Zum lokalen Benutzen den Ordner herunterladen und `index.html` im Browser öffnen, dann geht es auch ohne Internet.

## Überblick

- **Läuft komplett im Browser.** Kein Backend, es wird nichts hochgeladen. Bilder werden lokal verarbeitet.
- **Live-Vorschau:** Links die Einstellungen, rechts das Blatt in Originalproportionen. Jede Änderung ist sofort sichtbar.
- **Zwei Stile:** Klassisch (wie die GOG-Originalhüllen) und Modern (angelehnt an Konsolenhüllen).
- **Druckfertig:** A4 quer, Cover in Originalgröße mittig, Schnittmarken außerhalb des Covers, optional Falzlinien.
- **Deutsch oder Englisch:** Die Beschriftung auf dem Cover lässt sich wählen.
- **USK statt PEGI oder ESRB, ohne Barcode.** Die USK-Kennzeichnung steht vorn (35 × 35 mm, 3 mm Abstand) und auf Wunsch kleiner hinten.

## Schnellstart

1. **Hülle und Disc** wählen (Normal oder Slim, CD, DVD oder Blu-ray).
2. **Bilder** laden: Frontcover und Rückseite oben, optional Rückseite unten und Publisher-Logo.
3. **Titel** für den Rücken eintragen.
4. **Spielfunktionen** und **Systemanforderungen** ausfüllen.
5. Auf **Drucken** klicken (Einstellungen siehe [Drucken](#drucken)).

## Bedienung

| Bereich | Inhalt |
|---|---|
| Hülle und Disc | Hülle: Normal (14 mm Rücken) oder Slim (7 mm). Medium: CD, DVD oder Blu-ray (nur das Logo auf der Rückseite). Sprache der Beschriftung: Deutsch oder English. USK-Freigabe: 0, 6, 12, 16, 18 oder keine anzeigen, dazu "USK auch auf der Rückseite zeigen" |
| Bilder | Frontcover, Rückseite oben, Rückseite unten (optional), Publisher-Logo (optional). Pro Bild stehen die Maße dabei, nach dem Laden zeigt das Tool Dateiname, Pixelgröße und wie scharf es gedruckt wird. Bilder lassen sich per Drag-and-drop oder Klick laden und wieder entfernen |
| Texte | Spieletitel für den Rücken und der Copyright-Text unten auf der Rückseite |
| Spielfunktionen | Single-Player, Co-op, Multi-Player, Controller Support, Erfolge, Cloud Saves, Bestenlisten. Die Reihenfolge auf dem Cover ist fest |
| Systemanforderungen | Läuft auf: Windows XP, Vista, 7, 8, 10, 11, macOS, Linux, dazu "64-Bit" bei Windows. Prozessor (Intel, AMD oder eigener Text), Grafikkarte (NVIDIA, AMD Radeon oder eigener Text), Arbeitsspeicher und Speicherplatz (Regler oder Zahl), DirectX und Sonstiges (leer lassen blendet die Zeile aus), Umbruch bei zwei Prozessoren oder Grafikkarten |
| Darstellung und Druck | Stil, Größe des GOG-Logos auf dem Rücken (fest 6 mm oder Rückenbreite), GOG-Galaxy-Feld, Schnittmarken, Falzlinien |

Einstellungen werden im Browser gemerkt (**ohne Bilder**, die müssen nach dem Neuladen erneut geladen werden). "Zurücksetzen" löscht Einstellungen und Bilder.

Oben erscheinen Hinweise, wenn etwas fehlt (Frontcover, Titel, Spielfunktionen). Sie blockieren nichts.

### Prozessor und Grafikkarte

Die Auswahl erzeugt Texte wie "Intel Core i5-12400F", "AMD Ryzen 5 5600X", "NVIDIA GeForce RTX 3060 Ti" oder "AMD Radeon RX 6700 XT". Das Modell darf fehlen ("Intel Core i5"). Für alte Spiele gibt es das Feld **eigener Text**, das die Auswahl ersetzt (z. B. "Pentium III 500 MHz"). Sind Intel und AMD (oder NVIDIA und AMD) angehakt, stehen beide mit " / " nebeneinander. Ist dafür kein Platz, bricht die zweite Angabe um und der Schrägstrich entfällt. Mit "immer untereinander" lässt sich das erzwingen.

## Bilder und Maße

Die Bilder werden beim Laden auf Druckgröße verkleinert (längste Kante höchstens 2300 Pixel, Publisher-Logo 900 Pixel) und nie vergrößert. Fotos werden als JPEG, das Publisher-Logo als PNG mit Transparenz gehalten (SVG geht auch). Das Bild füllt seine Fläche und wird bei Bedarf zugeschnitten.

| Bild | Normal (14 mm) | Slim (7 mm) |
|---|---|---|
| Frontcover | 129 × 183 mm | 129,5 × 183 mm |
| Rückseite oben (über dem Streifen) | 130 × 124 mm | 129,5 × 124 mm |
| Rückseite unten (hinter den Angaben, optional) | 130 × 46 mm | 129,5 × 46 mm |
| Publisher-Logo | etwa 2:1, transparent | |

Ohne Bild für "Rückseite unten" setzt sich das obere Bild hinter den Angaben fort. Für ein scharfes Ergebnis sollten Bilder mindestens **200 dpi** haben (Front normal: etwa 1020 × 1450 Pixel), besser 300 dpi. Unter 200 dpi zeigt das Tool "wird unscharf".

### Was verdeckt wird

| Element | Fläche |
|---|---|
| GOG-Logo-Ecke (Klassisch) | oben links, etwa 22 × 21 mm |
| Streifen oben (Modern) | oberste 11 mm der Vorderseite |
| USK vorn | 35 × 35 mm, 3 mm vom linken und unteren Rand |
| Publisher-Logo vorn | bis 32 × 14 mm, 6 mm vom rechten und unteren Rand |
| Grüner Streifen und Angabenfeld | 13 mm und 46 mm am unteren Rand der Rückseite |

## Stile

| Stil | Aussehen |
|---|---|
| **Klassisch** (Standard) | Wie die GOG-Originalhüllen: lila Logo-Ecke oben links auf der Vorderseite, grüner Streifen mit Spielfunktionen, helles Feld mit den Angaben, lila Rücken |
| **Modern** (Konsolen-Stil) | Angelehnt an Hüllen von PlayStation, Switch und Xbox: lila Streifen über die ganze Breite oben auf der Vorderseite mit GOG-Logo und "PC · DRM-FREI", dunkler Rücken mit lila Kopf (Logo) und Fuß ("PC"), dunkler Streifen mit hellen Symbolen, dunkles Feld mit gerahmter Überschrift "Systemanforderungen". Disc- und Publisher-Logo stehen auf weißen Kacheln |

Beide Stile zeigen auf der Rückseite die Systemanforderungen und auf Vorderseite und Rücken das GOG-Logo. Der Stil wird mit den Einstellungen gemerkt.

## Feste Plätze auf der Rückseite

Die Rückseite hat feste Plätze: links das **GOG-Galaxy-Feld** (26 × 30 mm), in der Mitte die **Angaben**, rechts **Logos, USK und Copyright**. Schaltet man das Galaxy-Feld oder die USK auf der Rückseite aus, **bleibt der Platz frei** und nichts rutscht. Die Angaben beginnen immer an derselben Stelle, fehlt eine Zeile, bleibt unten Platz. Das prüft ein automatischer Test.

## Rücken

- Das **GOG-Logo** steht oben, entweder in fester Größe (6 mm) oder in Rückenbreite.
- Der **Titel** steht senkrecht in normaler Schreibweise. Er wird so groß wie möglich (bis 12 pt, Slim bis 8 pt) und verkleinert sich bei langen Titeln selbst, höchstens bis 5 pt.

## Drucken

1. Auf **Drucken** klicken.
2. Im Druckdialog: Papier **A4**, Ausrichtung **quer**, Skalierung **100 %** (nicht "Anpassen"), Ränder **Keine**, **Hintergrundgrafiken** einschalten.
3. Ausdrucken und an den **Schnittmarken** ausschneiden. Die **Falzlinien** am Rücken (gestrichelt, nur wenn eingeschaltet) helfen beim Falten.

Das Cover wird in Originalgröße (273 × 183 mm, Slim 266 × 183 mm) mittig auf das Blatt gesetzt. Die Schnittmarken liegen 2 bis 6 mm außerhalb des Covers und passen dadurch auf das Blatt. Ein Test stellt sicher, dass der Druck genau eine A4-Seite quer ergibt.

**Tipp:** Miss nach dem ersten Ausdruck die Breite nach (273 mm). Weicht sie ab, steht im Druckdialog meist noch "Anpassen" statt 100 %.

## Aufbau der Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite mit Formular und Vorschau |
| `style.css` | Oberfläche und Cover (alle Maße in Millimetern), beide Stile, Druckregeln |
| `core.js` | Maße, Beschriftungen, Texte für die Systemanforderungen, Standardwerte. Ohne Browser testbar |
| `app.js` | Eingaben, Bilder, Zeichnen der Vorschau, Drucken |
| `assets/` | Schriften (Lato), GOG-Logo, USK-, Disc- und Funktionssymbole |

Die Seite hat keine Abhängigkeiten und braucht kein Internet.

## Grenzen

- Es gibt zwei Hüllenformate (Normal 14 mm, Slim 7 mm). Andere Maße (z. B. Blu-ray-Hüllen) fehlen noch.
- Bilder werden nicht gespeichert, nur die Einstellungen.
- Es gibt kein eigenes Booklet-Layout und keinen PDF-Export. Gedruckt wird über den Browser (dort lässt sich als PDF speichern).
- Die Maße sind noch nicht mit einem echten Ausdruck und einer echten Hülle geprüft.
- Titel, Anbieter und Cover müssen von Hand eingegeben werden (eine Übernahme aus der `menu.json` ist geplant).

## Geplant

- **SteamGridDB**: Cover, Hintergründe und Logos suchen und direkt als Front, Rückseite und Publisher-Logo übernehmen, mit derselben Einrichtung (Schlüssel und Proxy) wie im Konfigurator (siehe [steamgriddb.md](steamgriddb.md)).
- **Steam und SteamDB**: Systemanforderungen und Spielfunktionen eines Spiels automatisch einlesen (Machbarkeit und Proxy zuerst prüfen).
- Titel, Anbieter und Cover aus der `menu.json` oder der Rezept-ZIP übernehmen.
- Stile passend zum Anbieter (Epic Games, Steam) wie die Abzeichen im Menü.
- Weitere Hüllenformate und PDF-Export.

Der Stand der Planung steht in der Roadmap in der [README](../README.md).

## Zur Vorgängerversion

Aufgeräumt wurde der Code der früheren Einzeldatei (v3.10.3). Behoben sind unter anderem:

- **Schnittmarken** erschienen nie (falscher CSS-Selektor) und saßen im Druck an der falschen Stelle. Jetzt liegen sie am Cover und werden bei jedem Test im Druck geprüft.
- **Blu-ray-Logo** wurde nicht geladen (Dateiname `blu_ray.png` statt `blu-ray.png`).
- **Leistung:** Die USK-Bilder hatten 5625 × 5625 Pixel (je rund 120 MB im Speicher) und sind jetzt 700 × 700. Hochgeladene Bilder werden auf Druckgröße verkleinert und nicht mehr als riesiger Base64-Text gehalten. Die Weichzeichnung (`backdrop-filter`) ist entfernt.
- **Schrift:** Lato lag im Archiv, wurde aber nie geladen.
- **Rücken:** Der Titel steht in normaler Schreibweise (wie bei den GOG-Vorlagen) und verkleinert sich bei langen Titeln von selbst.
- **Verschieben der Rückseite:** Ausgeblendete Elemente gaben ihren Platz im Layout frei und ließen andere rutschen. Jetzt hat die Rückseite feste Plätze.
- Hinzugekommen: Live-Vorschau statt Formular-Abschicken, GOG-Galaxy-Feld, Zeile "Sonstiges", Beschriftungen auf Deutsch oder Englisch, Windows XP und Vista, macOS und Linux, eigener Text für Prozessor und Grafikkarte, Bestenlisten-Symbol, Hinweis zur Bildschärfe, zweiter Stil "Modern".

## Tests

`npm test` prüft Maße, Texte und Standardwerte (`tests/cover.test.js`), darunter die Bildmaße, die Systemanforderungstexte, das Zusammenführen gespeicherter Einstellungen und dass alle Grafiken vorhanden und nicht übergroß sind.

`npm run test:ui` lädt das Tool in einem echten Chromium (`tests/ui/cover.check.js`) und prüft Eingaben, Bildverkleinerung, Disc-Logos, Hüllenwechsel, Speichern der Einstellungen, **feste Plätze** (nichts verschiebt sich), beide Stile und den **Druck** (genau eine A4-Seite quer, Cover mittig in Originalgröße, Schnittmarken im Blatt). Nicht automatisch geprüft ist ein echter Ausdruck.

## Hinweise

- GOG, die USK-Symbole und das GOG-Galaxy-Feld sind Marken ihrer Inhaber. Das Tool ist für den privaten Druck eigener Hüllen gedacht.
- Die Schrift Lato steht unter der SIL Open Font License (siehe `cover-tool/assets/fonts/README.txt`).
