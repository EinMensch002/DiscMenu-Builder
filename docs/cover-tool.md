# Cover-Tool

Eine Web-App für die **Hüllen** der Discs: Sie erzeugt ein druckfertiges Blatt (A4 quer) mit Rückseite, Rücken und Vorderseite im GOG-Stil. Sie läuft komplett im Browser, nichts wird hochgeladen.

**Online:** https://einmensch002.github.io/DiscMenu-Builder/cover/
**Dateien:** [cover-tool/](../cover-tool/). Zum lokalen Benutzen den Ordner herunterladen und `index.html` im Browser öffnen.

## Bedienung

Links die Einstellungen, rechts die Vorschau in Originalproportionen, die sich bei jeder Änderung sofort aktualisiert.

| Bereich | Inhalt |
|---|---|
| Hülle und Disc | Normal (14 mm Rücken) oder Slim (7 mm), CD, DVD oder Blu-ray, Sprache der Beschriftung (Deutsch oder English), USK-Freigabe (0, 6, 12, 16, 18 oder keine), USK auch auf der Rückseite |
| Bilder | Frontcover, Rückseite oben, Rückseite unten (optional), Publisher-Logo. Die Maße stehen dabei, und nach dem Laden zeigt das Tool, wie scharf das Bild gedruckt wird |
| Texte | Spieletitel für den Rücken und der Copyright-Text |
| Spielfunktionen | Single-Player, Co-op, Multi-Player, Controller, Erfolge, Cloud Saves, Bestenlisten |
| Systemanforderungen | Windows-Versionen (XP bis 11), macOS, Linux, Prozessor und Grafikkarte (Auswahl oder eigener Text), Arbeitsspeicher, Speicherplatz, DirectX, Sonstiges |
| Darstellung und Druck | Stil (Klassisch oder Modern), Größe des GOG-Logos auf dem Rücken, GOG-Galaxy-Feld, Schnittmarken, Falzlinien |

Der Barcode der echten GOG-Hüllen fehlt bewusst. Statt PEGI oder ESRB wird die **USK**-Kennzeichnung verwendet (vorne 35 × 35 mm mit 3 mm Abstand, hinten kleiner).

Einstellungen werden im Browser gemerkt (ohne Bilder). "Zurücksetzen" löscht sie.

## Stile

| Stil | Aussehen |
|---|---|
| **Klassisch** (Standard) | Wie die GOG-Originalhüllen: lila Logo-Ecke oben links auf der Vorderseite, grüner Streifen mit Spielfunktionen, helles Feld mit den Angaben, lila Rücken |
| **Modern** (Konsolen-Stil) | Angelehnt an Hüllen von PlayStation, Switch und Xbox: lila Streifen über die ganze Breite oben auf der Vorderseite mit GOG-Logo und "PC · DRM-FREI", dunkler Rücken mit Kopf und Fuß in GOG-Lila, dunkles Feld mit klar gerahmter Überschrift "Systemanforderungen" |

Beim Stil "Modern" überdeckt der Streifen die obersten 11 mm der Vorderseite, das Motiv sollte dort nichts Wichtiges zeigen.

## Feste Plätze

Die Rückseite hat feste Plätze: links das GOG-Galaxy-Feld, in der Mitte die Angaben, rechts Logos, USK und Copyright. Schaltet man das Galaxy-Feld oder die USK auf der Rückseite aus, **bleibt der Platz frei** und nichts rutscht. Die Angaben beginnen immer an derselben Stelle, fehlt eine Zeile, bleibt unten Platz. Das prüft ein Test.

## Drucken

1. Auf "Drucken" klicken.
2. Papier **A4 quer**, Skalierung **100 %** (nicht "Anpassen"), Ränder **Keine**, **Hintergrundgrafiken** einschalten.
3. Ausdrucken und an den Schnittmarken ausschneiden. Die Falzlinien am Rücken sind optional.

Das Cover wird in Originalgröße (273 × 183 mm, Slim 266 × 183 mm) mittig auf das Blatt gesetzt. Die Schnittmarken liegen 2 bis 6 mm außerhalb des Covers und passen dadurch auf das Blatt.

## Aufbau der Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite mit Formular und Vorschau |
| `style.css` | Oberfläche und Cover (alle Maße in Millimetern) |
| `core.js` | Maße, Beschriftungen, Texte für die Systemanforderungen, Standardwerte. Ohne Browser testbar |
| `app.js` | Eingaben, Bilder, Zeichnen der Vorschau, Drucken |
| `assets/` | Schriften (Lato), GOG-Logo, USK-, Disc- und Funktionssymbole |

## Zur Vorgängerversion

Aufgeräumt wurde der Code der früheren Einzeldatei (v3.10.3). Behoben sind unter anderem:

- **Schnittmarken** erschienen nie (falscher CSS-Selektor) und saßen im Druck an der falschen Stelle. Jetzt liegen sie am Cover und werden bei jedem Test im Druck geprüft.
- **Blu-ray-Logo** wurde nicht geladen (Dateiname `blu_ray.png` statt `blu-ray.png`).
- **Leistung:** Die USK-Bilder hatten 5625 × 5625 Pixel (je rund 120 MB im Speicher) und sind jetzt 700 × 700. Hochgeladene Bilder werden auf Druckgröße verkleinert und nicht mehr als riesiger Base64-Text gehalten. Die Weichzeichnung (`backdrop-filter`) ist entfernt.
- **Schrift:** Lato lag im Archiv, wurde aber nie geladen.
- **Rücken:** Der Titel steht in normaler Schreibweise (wie bei den GOG-Vorlagen) und verkleinert sich bei langen Titeln von selbst.
- Hinzugekommen: Live-Vorschau statt Formular-Abschicken, GOG-Galaxy-Feld, Zeile "Sonstiges", Beschriftungen auf Deutsch oder Englisch, Windows XP und Vista, macOS und Linux, eigener Text für Prozessor und Grafikkarte, Bestenlisten-Symbol, Hinweis zur Bildschärfe.

## Tests

`npm test` prüft Maße, Texte und Standardwerte (`tests/cover.test.js`). `npm run test:ui` lädt das Tool in einem echten Chromium und prüft Eingaben, Bilder, Disc-Logos, Hüllenwechsel, Speichern und den **Druck** (genau eine A4-Seite quer, Cover mittig in Originalgröße, Schnittmarken im Blatt).

## Hinweise

- Die GOG- und USK-Symbole und das GOG-Galaxy-Feld sind Marken ihrer Inhaber. Das Tool ist für den privaten Druck eigener Hüllen gedacht.
- Die Schrift Lato steht unter der SIL Open Font License (siehe `assets/fonts/README.txt`).
