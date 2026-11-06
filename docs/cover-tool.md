# Cover-Tool

Eine Web-App für die **Hüllen** der Discs. Sie erzeugt ein druckfertiges Blatt (A4 quer) mit Rückseite, Rücken und Vorderseite im GOG-Stil, auf Wunsch mit Systemanforderungen, Spielfunktionen und USK-Kennzeichnung. Sie ergänzt den [Konfigurator](configurator.md) und das Menü ([Builder und Player](player-und-builder.md)): Das Menü liegt auf der Disc, das Cover steckt in der Hülle.

**Online:** https://einmensch002.github.io/DiscMenu-Builder/cover/
**Dateien:** [cover-tool/](../cover-tool/). Zum lokalen Benutzen den Ordner herunterladen und `index.html` im Browser öffnen, dann geht es auch ohne Internet.

## Überblick

- **Läuft komplett im Browser.** Kein Backend, es wird nichts hochgeladen. Bilder werden lokal verarbeitet.
- **Live-Vorschau:** Links die Einstellungen, rechts das Blatt in Originalproportionen. Jede Änderung ist sofort sichtbar.
- **Zwei Stile für alle Anbieter:** Klassisch (Logo-Ecke wie bei den GOG-Originalhüllen) und Leiste (Kopfleiste über die ganze Breite wie bei Handelsspielen).
- **Drei Anbieter:** GOG, Epic Games und Steam mit eigenen Farben, Logo und Schriftzug (siehe [Anbieter](#anbieter)).
- **Daten übernehmen:** Titel, Anbieter und Cover aus einem Rezept, Systemanforderungen und Funktionen von Steam, Bilder von SteamGridDB, Publisher-Logos von Wikidata (siehe [Daten übernehmen](#daten-übernehmen)).
- **Druckfertig:** A4 quer, Cover in Originalgröße mittig, Schnittmarken außerhalb des Covers, optional Falzlinien.
- **Deutsch oder Englisch:** Die Beschriftung auf dem Cover lässt sich wählen.
- **USK statt PEGI oder ESRB, ohne Barcode.** Die USK-Kennzeichnung steht vorn (35 × 35 mm, 3 mm Abstand) und auf Wunsch kleiner hinten.

## Schnellstart

1. Optional oben in der Leiste unter **Daten übernehmen** ein Rezept laden (spart Titel, Anbieter und Cover) oder Anforderungen von Steam holen.
2. **Hülle und Disc** wählen (Normal, Slim oder eigene Maße, CD, DVD oder Blu-ray) und den **Anbieter**.
3. **Bilder** laden: Frontcover und Rückseite oben, optional Rückseite unten und Publisher-Logo.
4. **Titel** für den Rücken eintragen.
5. **Spielfunktionen** und **Systemanforderungen** ausfüllen.
6. Auf **Drucken** klicken (Einstellungen siehe [Drucken](#drucken)).

## Bedienung

Links stehen die **Einstellungen des Covers**, rechts die Vorschau. Alles, was nicht direkt das Cover einstellt, liegt in der **oberen Leiste**:

| Knopf | Aufgabe |
|---|---|
| **Zum Konfigurator** | Wechselt zur Menü-Web-App |
| **Daten übernehmen** | Menü mit "Aus Rezept (ZIP oder `menu.json`)" und "Anforderungen von Steam" |
| **Projekt** | Menü mit "Projekt exportieren (ZIP)" und "Projekt importieren" |
| **Einstellungen** | SteamGridDB-Schlüssel, Proxy, Verbindungstest und Sicherung der Einstellungen in einer Datei |
| **Zurücksetzen** | Löscht alle Einstellungen und Bilder |
| **Drucken** | Öffnet den Druckdialog |

Die Einstellungen des Covers links:

| Bereich | Inhalt |
|---|---|
| Hülle und Disc | Anbieter (GOG, Epic Games, Steam). Hülle: Normal (14 mm Rücken), Slim (7 mm) oder Eigene Maße (mit Vorlagen für Blu-ray). Medium: CD, DVD oder Blu-ray (nur das Logo auf der Rückseite). Sprache der Beschriftung: Deutsch oder English. USK-Freigabe: 0, 6, 12, 16, 18 oder keine anzeigen, dazu "USK auch auf der Rückseite zeigen" |
| Bilder | Frontcover, Rückseite oben, Rückseite unten (optional), Publisher-Logo (optional). Pro Bild stehen die Maße dabei, nach dem Laden zeigt das Tool Dateiname, Pixelgröße und wie scharf es gedruckt wird. Bilder lassen sich per Drag-and-drop oder Klick laden, bei SteamGridDB suchen (🔎) und wieder entfernen |
| Texte | Spieletitel für den Rücken, Copyright-Text (unten mittig auf der Rückseite) |
| Spielfunktionen | Single-Player, Co-op, Multi-Player, Online, LAN, Cross-Plattform, Controller Support, Erfolge, Cloud Saves, Mods, VR. Die Reihenfolge auf dem Cover ist fest. Die Symbole gibt es im **Linienstil** (Standard) oder als **GOG-Original** (nur die ersten sieben, die anderen bleiben im Linienstil) |
| Systemanforderungen | Läuft auf: Windows XP, Vista, 7, 8, 10, 11, macOS, Linux, dazu "64-Bit" bei Windows. Prozessor (Intel, AMD oder eigener Text), Grafikkarte (NVIDIA, AMD Radeon oder eigener Text), Arbeitsspeicher und Speicherplatz (Regler oder Zahl), DirectX und Sonstiges (leer lassen blendet die Zeile aus), Umbruch bei zwei Prozessoren oder Grafikkarten |
| Darstellung und Druck | Stil, Größe des GOG-Logos auf dem Rücken (fest 7 mm oder Rückenbreite), Titel oben oder mittig auf dem Rücken, "PC" am Fuß des Rückens, GOG-Galaxy-Feld, Schnittmarken, Falzlinien |

Einstellungen werden im Browser gemerkt (**ohne Bilder**, die müssen nach dem Neuladen erneut geladen werden). Wer die Bilder behalten will, exportiert das **Projekt** (siehe unten). "Zurücksetzen" löscht Einstellungen und Bilder.

Oben erscheinen Hinweise, wenn etwas fehlt (Frontcover, Titel, Spielfunktionen). Sie blockieren nichts.

### Prozessor und Grafikkarte

Die Auswahl erzeugt Texte wie "Intel Core i5-12400F", "AMD Ryzen 5 5600X", "NVIDIA GeForce RTX 3060 Ti" oder "AMD Radeon RX 6700 XT". Das Modell darf fehlen ("Intel Core i5"). Für alte Spiele gibt es das Feld **eigener Text**, das die Auswahl ersetzt (z. B. "Pentium III 500 MHz"). Sind Intel und AMD (oder NVIDIA und AMD) angehakt, stehen beide mit " / " nebeneinander. Ist dafür kein Platz, bricht die zweite Angabe um und der Schrägstrich entfällt. Mit "immer untereinander" lässt sich das erzwingen.

### Mindest- und empfohlene Anforderungen

Im Formular gibt es bei den Systemanforderungen die Reiter **Mindestanforderungen** und **Empfohlen**. "Läuft auf" (Betriebssystem) gilt für beide. Auf dem Reiter "Empfohlen" schaltet **Empfohlene Anforderungen zusätzlich auf der Hülle zeigen** die zweite Spalte ein. Prozessor, Grafikkarte, Speicher, DirectX und Sonstiges lassen sich dort getrennt eintragen.

Auf der Rückseite entsteht dann eine **Tabelle mit den Spalten Minimum und Empfohlen**. Angaben, die in beiden gleich sind (und das Betriebssystem), stehen nur einmal über beide Spalten, fehlt eine Angabe in einer Spalte, steht dort "–". Damit die Tabelle Platz hat, werden Galaxy-Feld und rechte Spalte etwas schmaler. Ist das Galaxy-Feld aus (Epic, Steam), nimmt die Tabelle seinen Platz mit. Ohne empfohlene Angaben bleibt es bei der einfachen Liste.

**Nichts wird abgeschnitten:** Lange Angaben (auch Sonstiges) brechen um, und die Schrift wird bei Platzmangel kleiner (bis 4,4 pt). Alles, was in den Feldern steht, steht auch auf der Hülle. Ein Test prüft das für beide Stile und Anbieter.

## Daten übernehmen

Unter "Daten übernehmen" stehen drei Knöpfe. Alles Übernommene lässt sich danach von Hand ändern.

### Aus Rezept

Lädt eine Rezept-ZIP aus dem [Konfigurator](configurator.md) oder eine einzelne `menu.json`. Danach wählt man das Spiel aus der Liste. Übernommen werden:

- der **Titel** (für den Rücken),
- der **Anbieter** (`gog`, `epic`, `steam`, damit Farben und Schriftzug stimmen),
- die **geschätzte Größe** (`estimatedSizeMB`) als Speicherplatz, in GB gerundet,
- das **Cover** des Spiels als Frontcover (nur aus einer ZIP, eine einzelne `menu.json` hat keine Bilder). Das Cover im Rezept ist für das Menü gedacht, prüfe also den Zuschnitt.

### Anforderungen von Steam

Sucht das Spiel im Steam-Shop und liest die Systemanforderungen aus. Mindest- und empfohlene Anforderungen werden **zusammen** gelesen und nebeneinander angezeigt (Minimum | Empfohlen). Mit **Übernehmen** landen die Mindestangaben in den normalen Feldern und die empfohlenen im Reiter "Empfohlen". Liefert Steam nur eine Liste, wird sie zur Mindestanforderung und die zweite Spalte bleibt aus. Übernommen werden:

- Windows-Versionen (aus "OS", z. B. "Windows 7 / 8 / 10 (64-bit)"), macOS und Linux (aus den Plattformen),
- **Prozessor** und **Grafikkarte** werden den **Kategorien** zugeordnet (Hersteller, Reihe, Modell, bei Alternativen wie "Core i7-6700 or Ryzen 5 1600" je Marke eine, höchstens zwei). Erkennt das Tool die Angabe nicht (z. B. nur "2.4 GHz"), steht sie stattdessen als Text. In der Vorschau-Tabelle steht je Zeile "in Kategorien" oder "als Text". **Arbeitsspeicher**, **Speicherplatz**, **DirectX**,
- **Sonstiges** aus Soundkarte und Zusatzhinweisen (auf etwa 140 Zeichen gekürzt),
- die **Spielfunktionen**: Single-Player, Mehrspieler, Co-op, Erfolge, Cloud Saves, Controller, Online, LAN, Cross-Plattform, Mods und VR (aus den Steam-Kategorien).

Zusätzlich übernimmt der Steam-Import den **Spielnamen als Titel auf dem Rücken** sowie **Publisher und Entwickler** (als Vorgabe für die Logo-Suche). Ein Haken im Dialog lädt außerdem das **Steam-Cover (Hochformat, 600×900)** als Frontcover. Er ist vorgewählt, wenn noch kein Frontcover geladen ist. Klappt das Laden nicht (CORS oder ein Proxy, der den Host `cdn.akamai.steamstatic.com` nicht erlaubt), sind die Angaben trotzdem übernommen und es erscheint ein Hinweis.

Die Angaben kommen auf Englisch, so wie Steam sie liefert. Lange Angaben (z. B. ganze Sätze bei der Grafikkarte) werden für das Cover gekürzt. Hat ein Spiel keine Anforderungen, werden nur Plattformen und Funktionen übernommen. **SteamDB** hat keine offene Schnittstelle und wird deshalb nicht genutzt.

**Findet die Suche nichts oder kommt eine Fehlermeldung?**

1. Unter **Einstellungen** auf **Verbindung testen** klicken. Dort steht, ob der Proxy fehlt, der Worker-Code veraltet ist oder die Herkunft nicht erlaubt ist.
2. Statt des Titels die **Adresse der Steam-Seite** (`https://store.steampowered.com/app/...`) oder die **App-ID** einfügen. Dann entfällt die Suche.
3. Den Titel englisch und kürzer eingeben (z. B. "Half-Life" statt "Half-Life: Source - Deutsche Version").
4. Manche Spiele liefert Steam nur nach Anmeldung oder gar nicht aus, dann bleibt nur Eintippen.

### Publisher-Logo suchen

Beim Publisher-Logo (🔎 im Bildfeld) sucht das Tool **nicht bei SteamGridDB, sondern bei Wikidata** (Logos kommen von Wikimedia Commons). Das Suchfeld ist mit dem **Publisher aus dem Steam-Import** vorbelegt (z. B. "Valve"), darunter stehen Knöpfe für Publisher und Entwickler (z. B. "CD PROJEKT RED"). Es erscheinen nur Firmen, bei denen ein Logo hinterlegt ist. Aktuelle Logos stehen vorn, ältere (bei Wikidata mit Enddatum) sind als "älteres Logo" gekennzeichnet. Ein Klick wählt das Logo, "Als Publisher-Logo übernehmen" lädt es (als PNG, 800 px breit, transparent). Es ist weder ein Schlüssel noch ein Proxy nötig. Nicht jede Firma hat ein Logo bei Wikidata, dann hilft ein anderer Name oder das Logo als Datei.

### Bilder von SteamGridDB

Neben jedem Bildfeld (Frontcover, Rückseite oben und unten) gibt es einen Suchknopf 🔎. Der Ablauf: Spiel suchen, Bildart wählen (Cover im Hochformat, Querformat, Hintergründe, Logos), Bild anklicken und übernehmen. Voreingestellt ist für das Frontcover ein Hochformat-Cover, für die Rückseite ein Hintergrund und für das Publisher-Logo ein Logo. Deutsche Bilder stehen zuerst. Das Bild wird danach wie jedes andere auf Druckgröße verkleinert.

### Einstellungen und Proxy

Über **Einstellungen** in der oberen Leiste (der Dialog entspricht dem im Konfigurator). Für SteamGridDB braucht man einen **API-Schlüssel**, und für beide Dienste fast immer einen eigenen **Proxy** (Cloudflare Worker), weil sie Anfragen aus dem Browser sonst blockieren. Die Einrichtung ist in [steamgriddb.md](steamgriddb.md) beschrieben und gilt für beide Web-Apps: Das Cover-Tool nutzt **dieselben Einstellungen wie der Konfigurator**. Auf GitHub Pages liegen beide unter demselben Ursprung und teilen sich den Speicher, einmal eintragen genügt. Der Schlüssel liegt nur in deinem Browser und wird im Dialog nicht im Klartext angezeigt.

- **Speichern, Löschen:** Die Proxy-Adresse muss den Platzhalter `{url}` enthalten.
- **Verbindung testen:** Prüft den Steam-Shop und SteamGridDB einzeln und zeigt bei jedem, ob er erreichbar ist und woran es liegt (z. B. "Der Worker-Code ist veraltet" oder "Kein Proxy eingetragen").
- **In Datei sichern / Aus Datei einlesen:** Sichert Schlüssel und Proxy in `discmenu-einstellungen.json`, **mit oder ohne Passwort** (verschlüsselt mit AES-GCM). Ein vergessenes Passwort lässt sich nicht wiederherstellen. Das Dateiformat ist dasselbe wie im Konfigurator: Eine dort gesicherte Datei lässt sich hier einlesen und umgekehrt. Die Datei enthält deinen Schlüssel, also nicht weitergeben und nicht ins Repository legen.

> **Stand der Prüfung:** Die Abläufe sind mit nachgebauten Antworten von Steam und SteamGridDB getestet. Mit den echten Diensten wurde noch nicht geprüft, siehe [manuelle-pruefung.md](manuelle-pruefung.md).

### Veraltete Darstellung (Cache)

GitHub Pages liefert Dateien bis zu 10 Minuten zwischengespeichert. Damit nach einer Aktualisierung nicht alte und neue Dateien gemischt werden, hängt der Build an alle Dateien `?v=<Version>`. Oben in der Leiste steht "Version …" (lokal: "lokal"). Sehen Menüs oder Dialoge ungestylt oder alt aus, die Seite mit Strg+F5 neu laden.

## Projekt speichern und laden

Über **Projekt** in der oberen Leiste:

- **Projekt exportieren (ZIP):** Speichert alle Einstellungen und die Bilder in einer Datei `<titel>-cover.zip` (in Chrome und Edge mit Dateiauswahl, sonst als Download). Die ZIP enthält `cover.json` mit den Einstellungen und die Bilder unter `images/`. Der SteamGridDB-Schlüssel steht **nicht** darin.
- **Projekt importieren:** Lädt so eine ZIP und ersetzt das aktuelle Projekt (mit Rückfrage). Fehlt ein Bild in der ZIP, wird der Rest trotzdem geladen und das Fehlende gemeldet. Falsche oder beschädigte Dateien werden abgelehnt, ohne das aktuelle Projekt zu verändern.

Die Bilder werden dabei unverändert übernommen (nicht erneut verkleinert oder neu kodiert).

## Anbieter

Der Anbieter bestimmt Farben, Logo und Schriftzug der Hülle. Bei **Epic Games und Steam** ist der Streifen mit den Spielfunktionen auf der Rückseite dunkel statt hell (Steam: Marineblau mit blauer Linie, Epic: Dunkelgrau). Das Logo steht in der Ecke (Stil Klassisch) bzw. in der Kopfleiste (Stil Leiste) auf der Vorderseite und oben auf dem Rücken. Bei Epic Games und Steam steht der Schriftzug unter bzw. neben dem Logo. Die Logos sind weiße Vektorgrafiken (SVG, je 1 bis 3 KB, in jeder Größe scharf) aus dem Projekt [Simple Icons](https://simpleicons.org/) (Lizenz CC0). Sie liegen in `cover-tool/assets/images/` (`epic_logo.svg`, `steam_logo.svg`, GOG: `gog_logo.png`).

| Anbieter | Farbe | Vorderseite und Rücken | Besonderheiten |
|---|---|---|---|
| **GOG** | Lila | GOG-Logo | Galaxy-Feld, grüner Streifen, in der Leiste "PC · DRM-FREI", Leiste in Lila mit grüner Linie |
| **Epic Games** | Anthrazit | Logo und Schriftzug "EPIC GAMES" | dunkler grauer Streifen, Hinweis "Epic Games Launcher", kein Galaxy-Feld |
| **Steam** | Marineblau | Logo und Schriftzug "STEAM" | dunkelblauer Streifen mit blauer Akzentlinie, Hinweis "Steam", kein Galaxy-Feld |

Der Anbieter wird mit den Einstellungen gemerkt und aus dem Rezept übernommen. Dieselbe Farbzuordnung nutzt das Menü ([player-und-builder.md](player-und-builder.md)).

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
| Kopfleiste (Stil Leiste) | oberste 18,6 mm der Vorderseite und des Rückens |
| USK vorn | 35 × 35 mm, 3 mm vom linken und unteren Rand |
| Publisher-Logo vorn | bis 32 × 14 mm, 6 mm vom rechten und unteren Rand |
| Grüner Streifen und Angabenfeld | 13 mm und 46 mm am unteren Rand der Rückseite |

## Eigene Maße

Für Hüllen mit anderen Maßen (z. B. Blu-ray) gibt es "Eigene Maße": Breite der Rückseite, des Rückens und der Vorderseite sowie die Höhe in Millimetern. Die Bildmaße, das Cover und der Druck richten sich danach.

- **Erlaubt:** Rückseite und Vorderseite 100 bis 150 mm, Rücken 3 bis 30 mm, Höhe 100 bis 198 mm, insgesamt höchstens 285 mm Breite, damit Cover und Schnittmarken auf A4 quer passen. Andere Werte werden angepasst, und das Tool sagt es.
- **Vorlagen:** "Blu-ray" (269 × 148 mm, 14 mm Rücken) und "Blu-ray Slim" (262 × 148 mm, 7 mm Rücken) füllen die Felder.

**Die Vorlagen sind Richtwerte.** Die Herstellerangaben für Blu-ray-Einleger weichen voneinander ab (Gesamtbreite 262 bis 272 mm, Seitenbreite 126 bis 129 mm, Rücken 11 bis 14 mm). Miss deinen Einleger nach und trage die Werte ein.

## Stile

| Stil | Aussehen |
|---|---|
| **Klassisch** (Standard) | Wie die GOG-Originalhüllen: lila Logo-Ecke oben links auf der Vorderseite, grüner Streifen mit Spielfunktionen, helles Feld mit den Angaben, lila Rücken |
| **Leiste** | Wie Handelsspiele im Laden: Kopfleiste mit Farbverlauf über die ganze Breite der Vorderseite, großes Logo (bei Steam und Epic mit Schriftzug) und Hinweis "PC", darunter eine **Akzentlinie, die über den Rücken durchläuft** (Steam blau, GOG grün, Epic hellgrau). Auf dem Rücken steht das Logo in derselben Leiste. Die Rückseite bleibt wie beim klassischen Stil |

Beide Stile zeigen auf der Rückseite die Systemanforderungen und auf Vorderseite und Rücken das GOG-Logo. Der Stil wird mit den Einstellungen gemerkt. Der frühere Stil "Modern" (dunkle Rückseite) ist entfallen, gespeicherte Projekte damit öffnen sich im Stil Leiste.

## Feste Plätze auf der Rückseite

Die Rückseite hat feste Plätze: links das **GOG-Galaxy-Feld** (20 × 24 mm, bewusst klein, damit mehr Platz für die Angaben bleibt), in der Mitte die **Angaben**, rechts **Logos, USK und Copyright**. Schaltet man die USK auf der Rückseite aus, **bleibt der Platz frei** und nichts rutscht. Schaltet man das Galaxy-Feld aus (oder wählt Epic Games oder Steam), **rücken nur die Angaben nach links an den Rand** und nutzen den freien Platz, alles andere bleibt, wo es ist. Die Angaben beginnen immer an derselben Stelle, fehlt eine Zeile, bleibt unten Platz. Das prüft ein automatischer Test.

## Rücken

- Das **GOG-Logo** steht oben, entweder in fester Größe (7 mm, Slim 5,5 mm) oder in Rückenbreite.
- Am Fuß steht **"PC"** (abschaltbar). 
- Der **Titel** steht oben unter dem Logo oder **mittig** (Auswahl "Titel auf dem Rücken").
- Der **Titel** steht senkrecht in normaler Schreibweise. Er wird so groß wie möglich (bis 12 pt, Slim bis 8 pt) und verkleinert sich bei langen Titeln selbst, höchstens bis 5 pt.

## Drucken

1. Auf **Drucken** klicken.
2. Im Druckdialog: Papier **A4**, Ausrichtung **quer**, Skalierung **100 %** (nicht "Anpassen"), Ränder **Keine**, **Hintergrundgrafiken** einschalten.
3. Ausdrucken und an den **Schnittmarken** ausschneiden. Die **Falzlinien** am Rücken (gestrichelt, nur wenn eingeschaltet) helfen beim Falten.

Rücken und Vorderseite überlappen um 0,6 mm, damit beim Drucken keine helle Naht zwischen ihnen entsteht. Flächen ohne Bild bleiben im Druck weiß. Ein Test misst die Naht in der Vorschau bei mehreren Maßstäben.

Das Cover wird in Originalgröße (273 × 183 mm, Slim 266 × 183 mm) mittig auf das Blatt gesetzt. Die Schnittmarken liegen 2 bis 6 mm außerhalb des Covers und passen dadurch auf das Blatt. Ein Test stellt sicher, dass der Druck genau eine A4-Seite quer ergibt.

**Tipp:** Miss nach dem ersten Ausdruck die Breite nach (273 mm). Weicht sie ab, steht im Druckdialog meist noch "Anpassen" statt 100 %.

## Symbole

Die Linien-Symbole stammen aus [Lucide](https://lucide.dev/) (ISC-Lizenz, Datei `assets/images/features/line/LICENSE-lucide.txt`) und sind kleine schwarze SVG-Dateien (unter 1 KB), also in jeder Größe scharf. Die GOG-Originale bleiben als Auswahl erhalten.

## Aufbau der Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite mit Formular, Vorschau und Dialog |
| `style.css` | Oberfläche und Cover (alle Maße in Millimetern), beide Stile, Druckregeln |
| `core.js` | Maße, Beschriftungen, Texte für die Systemanforderungen, Standardwerte. Ohne Browser testbar |
| `app.js` | Eingaben, Bilder, Zeichnen der Vorschau, Drucken |
| `extras.js` | Dialoge: Rezept, Steam, SteamGridDB, Einstellungen |
| `assets/images/` | Logos (GOG als PNG, Epic Games und Steam als SVG), Funktions-, USK- und Disc-Symbole |
| `online.js` | Anfragen an SteamGridDB und Steam (über den Proxy), Fehlermeldungen, Verbindungstest und Auswertung der Antworten |
| `files.js` | Einstellungsdatei (mit Passwort), ZIP schreiben, Projektdatei |
| `zip.js` | Liest die Rezept-ZIP |
| `assets/` | Schriften (Lato), GOG-Logo, USK-, Disc- und Funktionssymbole |

Die Seite hat keine Abhängigkeiten und braucht kein Internet.

## Grenzen

- Fest eingebaut sind zwei Hüllenformate (Normal 14 mm, Slim 7 mm). Andere Maße gehen über "Eigene Maße", die Blu-ray-Werte sind nur Richtwerte.
- SteamGridDB und Steam sind mit nachgebauten Antworten getestet, nicht mit den echten Diensten.
- Im Browser werden nur die Einstellungen gemerkt, die Bilder nicht. Dafür gibt es den Projektexport.
- Es gibt kein eigenes Booklet-Layout und keinen PDF-Export. Gedruckt wird über den Browser (dort lässt sich als PDF speichern).
- Die Maße sind noch nicht mit einem echten Ausdruck und einer echten Hülle geprüft.
- Es gibt kein GOG-Pendant zu den Steam-Daten (Anforderungen aus dem GOG-Katalog), die Angaben für GOG-Spiele müssen von Hand oder über Steam kommen.

## Geplant

- Mit **echtem Drucker und echter Hülle** prüfen (Maße, Schnittmarken, Blu-ray-Werte).
- **SteamGridDB und Steam** mit den echten Diensten prüfen und nachbessern ([Checkliste](manuelle-pruefung.md)).
- **PDF-Export** direkt aus dem Tool. Bis dahin lässt sich im Druckdialog des Browsers "Als PDF speichern" wählen. Ein eigener Export bräuchte eine Zusatzbibliothek, und das Tool hat bewusst keine Abhängigkeiten.
- Anforderungen und Funktionen aus dem **GOG-Katalog** übernehmen.
- Mehrere Hüllen in einem Rutsch aus einem Rezept erzeugen.

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

`npm test` prüft die Logik: Maße und eigene Maße (`tests/cover.test.js`), die Auswertung der Steam-Daten, den ZIP-Leser, die Anfragen über den Proxy mit Fehlerfällen und die gemeinsamen Einstellungen (`tests/cover-online.test.js`) sowie die Einstellungs- und Projektdateien samt Austausch mit dem Konfigurator (`tests/cover-files.test.js`).

`npm run test:ui` lädt das Tool in einem echten Chromium. `tests/ui/cover.check.js` prüft Eingaben, Bildverkleinerung, Disc-Logos, Hüllenwechsel, eigene Maße, Speichern der Einstellungen, **feste Plätze** (nichts verschiebt sich), beide Stile und den **Druck** (genau eine A4-Seite quer, Cover mittig in Originalgröße, Schnittmarken im Blatt). `tests/ui/cover-online.check.js` prüft die obere Leiste, Anbieter-Stile, die Übernahme aus Rezept und Steam (auch per Steam-Adresse und mit Fehlern des Proxys), die Bildsuche bei SteamGridDB, den Einstellungsdialog mit Sicherung in Datei (mit und ohne Passwort, auch mit einer Datei aus dem Konfigurator) sowie Export und Import des Projekts, alles mit nachgebauten Diensten. Nicht automatisch geprüft sind ein echter Ausdruck und die echten Dienste.

## Hinweise

- GOG, Epic Games, Steam (Namen und Logos), die USK-Symbole und das GOG-Galaxy-Feld sind Marken ihrer Inhaber. Das Tool ist für den privaten Druck eigener Hüllen gedacht.
- Die Schrift Lato steht unter der SIL Open Font License (siehe `cover-tool/assets/fonts/README.txt`).

