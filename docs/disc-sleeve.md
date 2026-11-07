# DiscSleeve (Cover-Tool)

**DiscSleeve** ist der Name des Cover-Tools. Eine Web-App für die **Hüllen** der Discs. Sie erzeugt ein druckfertiges Blatt (A4 quer) mit Rückseite, Rücken und Vorderseite im GOG-Stil, auf Wunsch mit Systemanforderungen, Spielfunktionen und USK-Kennzeichnung. Sie ergänzt den [Konfigurator](configurator.md) und das Menü ([Builder und Player](player-und-builder.md)): Das Menü liegt auf der Disc, das Cover steckt in der Hülle.

**Online:** https://einmensch002.github.io/DiscMenu-Builder/disc-sleeve/ (die alte Adresse `/cover/` leitet weiter)
**Dateien:** [disc-sleeve/](../disc-sleeve/). Zum lokalen Benutzen den Ordner herunterladen und `index.html` im Browser öffnen, dann geht es auch ohne Internet.

## Überblick

- **Läuft komplett im Browser.** Kein Backend, es wird nichts hochgeladen. Bilder werden lokal verarbeitet.
- **Live-Vorschau:** Links die Einstellungen, rechts das Blatt in Originalproportionen. Jede Änderung ist sofort sichtbar.
- **Ein Stil für alle Anbieter:** die Leiste (Kopfleiste über die ganze Breite, wie bei Handelsspielen). Bei GOG ist die Leiste schmal (10 mm) und es gibt sechs Varianten (Weiß, Warmweiß, Durchsichtig weiß, Durchsichtig schwarz, Dunkel, Dunkel mit Violett-Hauch).
- **Drei Anbieter:** GOG, Epic Games und Steam mit eigenen Farben, Logo und Schriftzug (siehe [Anbieter](#anbieter)).
- **Daten übernehmen:** Titel, Anbieter und Cover aus einem Rezept, Systemanforderungen und Funktionen von Steam, Bilder von SteamGridDB, Publisher-Logos von Wikidata (siehe [Daten übernehmen](#daten-übernehmen)).
- **Druckfertig:** A4 quer, Cover in Originalgröße mittig, Schnittmarken außerhalb des Covers, optional gestrichelte Falzmarken an den Rückenkanten (ebenfalls außerhalb).
- **Deutsch oder Englisch:** Die Beschriftung auf dem Cover lässt sich wählen.
- **USK statt PEGI oder ESRB, ohne Barcode.** Die USK-Kennzeichnung steht vorn (35 × 35 mm, 3 mm Abstand) und auf Wunsch kleiner hinten.

## Standardwerte

Neue Projekte starten mit **GOG, normaler Hülle (14 mm), DVD, dem Stil Durchsichtig schwarz**, sichtbarem "GOG.COM", dem Rücken passend zur Leiste, dem Rückentitel mittig und **eingeschalteten Falzmarken**. Wer schon gespeicherte Einstellungen im Browser hat, behält diese. "Zurücksetzen" in der Leiste stellt die Standardwerte her.

## Schnellstart

1. Optional oben in der Leiste unter **Daten übernehmen** ein Rezept laden (spart Titel, Anbieter und Cover) oder Anforderungen von Steam holen.
2. **Hülle und Disc** wählen (Normal, Slim oder eigene Maße, CD, DVD oder Blu-ray) und den **Anbieter**.
3. **Bilder** laden: Frontcover und Rückseite oben, optional Rückseite unten und Publisher-Logo.
4. **Titel** für den Rücken eintragen.
5. **Spielfunktionen** und **Systemanforderungen** ausfüllen.
6. Auf **Drucken** klicken (Einstellungen siehe [Drucken](#drucken)).

## Bedienung

Links stehen die **Einstellungen des Covers**, rechts die Vorschau. Alles, was nicht direkt das Cover einstellt, liegt in der **oberen Leiste** (von links: Name, Speicherstand, dann Projekt, Daten übernehmen, Einstellungen, Zurücksetzen, **Sprache** mit Flagge und ganz rechts **Drucken**):

| Knopf | Aufgabe |
|---|---|
| **Daten übernehmen** | Menü mit "Aus Rezept (ZIP oder `menu.json`)" und "Anforderungen von Steam" |
| **Projekt** | Menü mit "Im Browser speichern", "Speichern" (Strg+S), "Speichern unter" und "Öffnen". Daneben steht, ob Änderungen noch nicht in der Datei gespeichert sind und wann der Browser zuletzt gesichert hat |
| **Einstellungen** | SteamGridDB-Schlüssel, Proxy, Verbindungstest und Sicherung der Einstellungen in einer Datei |
| **Zurücksetzen** | Löscht alle Einstellungen und Bilder |
| **Drucken** | Öffnet den Druckdialog |

Die Einstellungen des Covers links:

| Bereich | Inhalt |
|---|---|
| 1. Hülle und Stil | Anbieter (GOG, Epic Games, Steam). Hülle: Normal (14 mm Rücken), Slim (7 mm) oder Eigene Maße (mit Vorlagen für Blu-ray). Medium: CD, DVD oder Blu-ray (nur das Logo auf der Rückseite, bis 18 × 9,5 mm groß). Sprache der Beschriftung. Stil (nur bei GOG: Schieberegler mit sechs Varianten von Weiß bis Dunkel mit Violett-Hauch), Rücken (hell oder dunkel) und Haken "GOG.COM" zeigen |
| 2. Titel und Texte | Spieletitel für den Rücken, Copyright-Text (unten mittig auf der Rückseite) |
| 3. Bilder | Frontcover, Rückseite oben, Rückseite unten (optional). Pro Bild stehen die Maße dabei, nach dem Laden zeigt das Tool Dateiname, Pixelgröße und wie scharf es gedruckt wird. Bilder lassen sich per Drag-and-drop oder Klick laden, bei SteamGridDB suchen (🔎) und wieder entfernen |
| 4. Publisher-Logo und Altersfreigabe | Publisher-Logo (Vorderseite, Rückseite und Rücken), **Unterlage dahinter auf der Vorderseite** (keine, weiß oder schwarz), USK-Freigabe (0, 6, 12, 16, 18 oder keine), "USK auch auf der Rückseite zeigen" und Hintergrund der USK vorn (Deckkraft 0 bis 100 %, 0 = nur die Raute) |
| 5. Rücken | Titel (oben oder mittig), Hintergrund (Farbe, **eigenes Rückenbild** mit wählbarem Ausschnitt und Abdunkeln, oder Frontbild fortsetzen), Größe des Anbieter-Logos, Rückenlogo (statt des Titels) mit Ausrichtung und Abständen, Publisher-Logo am Fuß mit Unterlage, Ausrichtung, Abstand und Breite, "PC" am Fuß |
| 6. Spielfunktionen | Single-Player, Co-op, Multi-Player, Online, LAN, Cross-Plattform, Controller Support, Erfolge, Cloud Saves, Mods, VR. Die Reihenfolge auf dem Cover ist fest, die Symbole sind Linien-SVG |
| 7. Systemanforderungen | Läuft auf: Windows XP, Vista, 7, 8, 10, 11, macOS, Linux, dazu "64-Bit" bei Windows. Prozessoren und Grafikkarten als Listen mit beliebig vielen Einträgen (siehe unten), Arbeitsspeicher und Speicherplatz (Regler oder Zahl), DirectX und Sonstiges (leer lassen blendet die Zeile aus) |
| 8. Drucken | Schnittmarken an den Ecken, Falzmarken außerhalb des Covers an den Rückenkanten (gestrichelt), Hinweis zu den Druckeinstellungen |

Einstellungen werden im Browser gemerkt (**ohne Bilder**, die müssen nach dem Neuladen erneut geladen werden). Wer die Bilder behalten will, exportiert das **Projekt** (siehe unten). "Zurücksetzen" löscht Einstellungen und Bilder.

Oben erscheinen Hinweise, wenn etwas fehlt (Frontcover, Titel, Spielfunktionen). Sie blockieren nichts.

### Prozessoren und Grafikkarten

Beides sind **Listen**: Mit **+ Intel**, **+ AMD** (Prozessor) bzw. **+ GeForce**, **+ Radeon** (Grafikkarte) kommt ein Eintrag hinzu, **+ Eigener Text** ergänzt freien Text (z. B. "Arc A380" oder "Pentium III 500 MHz"). Jeder Eintrag hat einen **Haken** (auf dem Cover zeigen oder ausschalten, ohne ihn zu löschen), die Art, Auswahlfelder und ✕ zum Entfernen. So sieht man auf einen Blick, um welche Karten es geht.

- **Prozessor:** Intel (Core i3 bis i9, Core Ultra, Pentium, Celeron, Core 2) oder AMD (Ryzen, Athlon, Phenom, FX) mit Modell und Zusatz (K, KF, F bzw. X, X3D, G). Ergebnis z. B. "Intel Core i5-12400F", "AMD Ryzen 5 5600X".
- **Grafikkarte:** GeForce (RTX, GTX, GTS, GT, Titan, Quadro) oder Radeon (RX, HD, R9, R7, R5, Vega) mit Modell, Zusatz (Ti, SUPER, **Ti SUPER**, XT, XTX, GRE) und **Speicher in GB**. Ergebnis z. B. "GeForce GTX 1060 6 GB", "Radeon RX 580 8 GB". Es steht **nur GeForce bzw. Radeon**, nie "NVIDIA GeForce" oder "AMD Radeon", auch nicht bei freiem Text (aus "NVIDIA GeForce 8800 GT" wird "GeForce 8800 GT").
- **Auf dem Cover steht jeder Eintrag in einer eigenen Zeile**, untereinander wie in einer Liste.
- **Import (z. B. Steam):** Ein "or", "oder" oder "/" trennt die Möglichkeiten, jede wird ein eigener Eintrag (keine Obergrenze außer 8). Was in die Auswahlfelder passt, kommt dorthin, z. B. "GeForce GTX 1060 6GB or Radeon RX 580 8GB or Arc A380" ergibt GeForce GTX 1060 / 6 GB, Radeon RX 580 / 8 GB und den Text "Arc A380". Was nicht passt, bleibt als Text erhalten, nichts geht verloren. Ein "or better" oder "or equivalent" am Ende entfällt.
- Ältere gespeicherte Einstellungen (Intel/AMD- und NVIDIA/AMD-Felder) werden beim Laden automatisch in Einträge umgewandelt.

### Mindest- und empfohlene Anforderungen

Im Formular gibt es bei den Systemanforderungen die Reiter **Mindestanforderungen** und **Empfohlen**. "Läuft auf" (Betriebssystem) gilt für beide. Auf dem Reiter "Empfohlen" schaltet **Empfohlene Anforderungen zusätzlich auf der Hülle zeigen** die zweite Spalte ein. Prozessor, Grafikkarte, Speicher, DirectX und Sonstiges lassen sich dort getrennt eintragen.

Auf der Rückseite entsteht dann eine **Tabelle mit den Spalten Minimum und Empfohlen**. Angaben, die in beiden gleich sind (und das Betriebssystem), stehen nur einmal über beide Spalten, fehlt eine Angabe in einer Spalte, steht dort "–". Damit die Tabelle Platz hat, wird die rechte Spalte etwas schmaler. Ohne empfohlene Angaben bleibt es bei der einfachen Liste.

**Sonstiges Satz für Satz:** Der Text bei "Sonstiges" wird in einzelne Sätze zerlegt, jeder Satz steht in einer eigenen Zeile. Sätze, die bei Minimum und Empfohlen **gleich** sind, stehen **einmal in der Mitte** über beide Spalten. Abweichende Sätze stehen nur in ihrer Spalte (in der anderen steht "–"). So steht z. B. "SSD required" mittig und ein nur im Minimum genannter Hinweis nur links. Dasselbe gilt für die anderen Zeilen: gleiche Werte (z. B. DirectX) stehen einmal in der Mitte.

**Kopf mittig:** "Minimum" und "Empfohlen" stehen **mittig über dem tatsächlich beschriebenen Bereich** ihrer Spalte, also über der breitesten Zeile, nicht über der ganzen Spaltenbreite.

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
- **Prozessor** und **Grafikkarte** werden an "or", "oder" und "/" in einzelne Einträge zerlegt und, wo es passt, in die Auswahlfelder übernommen (Reihe, Modell, Zusatz, Speicher in GB), sonst als Text (siehe [Prozessoren und Grafikkarten](#prozessoren-und-grafikkarten)). In der Vorschau-Tabelle steht je Zeile "in Auswahlfeldern", "teils als Text" oder "als Text",
- **Sonstiges** aus Soundkarte und Zusatzhinweisen (auf etwa 240 Zeichen gekürzt),
- die **Spielfunktionen**: Single-Player, Mehrspieler, Co-op, Erfolge, Cloud Saves, Controller, Online, LAN, Cross-Plattform, Mods und VR (aus den Steam-Kategorien).

Zusätzlich übernimmt der Steam-Import die **Altersfreigabe als USK** (die USK, die Steam bei vielen Spielen mitliefert, sonst abgeleitet aus PEGI, ESRB oder dem Steam-Mindestalter, im Dialog steht die Herkunft dabei; liefert Steam nichts, bleibt die USK unverändert), den **Spielnamen als Titel auf dem Rücken** sowie **Publisher und Entwickler** (als Vorgabe für die Logo-Suche). Ein Haken im Dialog lädt außerdem das **Steam-Cover (Hochformat, 600×900)** als Frontcover. Er ist vorgewählt, wenn noch kein Frontcover geladen ist. Klappt das Laden nicht (CORS oder ein Proxy, der den Host `cdn.akamai.steamstatic.com` nicht erlaubt), sind die Angaben trotzdem übernommen und es erscheint ein Hinweis.

Die Angaben kommen auf Englisch, so wie Steam sie liefert. Lange Angaben (z. B. ganze Sätze bei der Grafikkarte) werden für das Cover gekürzt. Hat ein Spiel keine Anforderungen, werden nur Plattformen und Funktionen übernommen. **SteamDB** hat keine offene Schnittstelle und wird deshalb nicht genutzt.

**Findet die Suche nichts oder kommt eine Fehlermeldung?**

1. Unter **Einstellungen** auf **Verbindung testen** klicken. Dort steht, ob der Proxy fehlt, der Worker-Code veraltet ist oder die Herkunft nicht erlaubt ist.
2. Statt des Titels die **Adresse der Steam-Seite** (`https://store.steampowered.com/app/...`) oder die **App-ID** einfügen. Dann entfällt die Suche.
3. Den Titel englisch und kürzer eingeben (z. B. "Half-Life" statt "Half-Life: Source - Deutsche Version").
4. Manche Spiele liefert Steam nur nach Anmeldung oder gar nicht aus, dann bleibt nur Eintippen.

### Publisher-Logo suchen

Beim Publisher-Logo (🔎 im Bildfeld) sucht das Tool **nicht bei SteamGridDB, sondern bei Wikidata** (Logos kommen von Wikimedia Commons). Das Suchfeld ist mit dem **Publisher aus dem Steam-Import** vorbelegt (z. B. "Valve"), darunter stehen Knöpfe für Publisher und Entwickler (z. B. "CD PROJEKT RED"). Es erscheinen nur Firmen, bei denen ein Logo hinterlegt ist. Aktuelle Logos stehen vorn, ältere (bei Wikidata mit Enddatum) sind als "älteres Logo" gekennzeichnet. Ein Klick wählt das Logo, "Als Publisher-Logo übernehmen" lädt es (als PNG, 800 px breit, transparent). Es ist weder ein Schlüssel noch ein Proxy nötig. Nicht jede Firma hat ein Logo bei Wikidata (Indie-Studios oft nicht). Dann die **Quelle im Dialog auf Brandfetch** umstellen: Brandfetch findet Firmen über ihre Webseite und liefert das Firmensymbol. Dafür braucht man eine **kostenlose Client-ID** aus dem [Brandfetch-Entwicklerportal](https://developers.brandfetch.com/), die in den Einstellungen eingetragen wird (nur in diesem Browser gespeichert, auch in der Einstellungsdatei sicherbar). Brandfetch liefert meist das **Symbol** der Firma, nicht den langen Schriftzug. Hilft beides nicht, bleibt das Logo als Datei.

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

- **Im Browser speichern (automatisch):** Einstellungen **und Bilder** werden kurz nach jeder Änderung im Speicher des Browsers gesichert (Einstellungen in `localStorage`, Bilder in der `IndexedDB`). Nach dem **Neuladen der Seite ist der ganze Stand wieder da**, auch die Bilder, ohne Datei. "Im Browser speichern" sichert sofort. Der Speicher gilt pro Browser und pro Adresse (lokale Datei und GitHub Pages sind getrennt). "Zurücksetzen" leert ihn. Wird er vom Browser gesperrt (z. B. privates Fenster), steht ein Hinweis da. Für Sicherungskopien und zum Weitergeben bleibt "Speichern" in eine Datei.
- **Speichern (Strg+S):** Schreibt alle Einstellungen und Bilder in eine Datei `<titel>-cover.zip`. In **Chrome und Edge** merkt sich das Tool die Datei: Das erste Speichern fragt nach dem Ort, danach **überschreibt** "Speichern" dieselbe Datei ohne Nachfrage (auch nach "Öffnen"). In anderen Browsern (z. B. Firefox) kann ein Programm keine Datei überschreiben, dort lädt jedes Speichern die ZIP neu herunter. Die ZIP enthält `cover.json` mit den Einstellungen und die Bilder unter `images/`. Der SteamGridDB-Schlüssel steht **nicht** darin.
- **Speichern unter:** Fragt immer nach einer neuen Datei.
- **Öffnen:** Lädt so eine ZIP und ersetzt das aktuelle Projekt (mit Rückfrage). In Chrome und Edge überschreibt "Speichern" danach genau diese Datei. Fehlt ein Bild in der ZIP, wird der Rest trotzdem geladen und das Fehlende gemeldet. Falsche oder beschädigte Dateien werden abgelehnt, ohne das aktuelle Projekt zu verändern.
- **Ungespeichert:** Neben dem Menü steht der Dateiname und "● ungespeichert", sobald sich etwas geändert hat. Beim Schließen der Seite warnt der Browser, wenn Bilder geladen und noch nicht gespeichert sind. Die Einstellungen (ohne Bilder) merkt sich das Tool unabhängig davon automatisch im Browser.

Die Bilder werden dabei unverändert übernommen (nicht erneut verkleinert oder neu kodiert).

## Anbieter

Der Anbieter bestimmt Farben, Logo und Schriftzug der Hülle. Bei **Epic Games und Steam** ist der Streifen mit den Spielfunktionen auf der Rückseite dunkel statt hell (Steam: Marineblau mit blauer Linie, Epic: Dunkelgrau). Das Logo steht in der Kopfleiste der Vorderseite und oben auf dem Rücken. Bei Epic Games und Steam steht der Schriftzug unter bzw. neben dem Logo. Die Logos sind weiße Vektorgrafiken (SVG, je 1 bis 3 KB, in jeder Größe scharf) aus dem Projekt [Simple Icons](https://simpleicons.org/) (Lizenz CC0). Alle Grafiken des Tools (auch die USK-Zeichen, die DVD-/CD-/Blu-ray-Logos und das GOG-Logo, jeweils nur 2 bis 6 KB) sind **SVG**, es gibt keine Rastergrafiken mehr (Voraussetzung für die spätere Ein-Datei-Version). Sie liegen in `disc-sleeve/assets/images/` (`epic_logo.svg`, `steam_logo.svg`, GOG: `gog_logo.svg`).

| Anbieter | Farbe | Vorderseite und Rücken | Besonderheiten |
|---|---|---|---|
| **GOG** | sechs Varianten von hell nach dunkel (neutral, ohne Lila) | GOG-Logo (immer sichtbar) und optional "GOG.COM" | Streifen hell (Weiß) oder dunkel (Dunkel, durchscheinend), in der Leiste "PC · DRM-FREI" |
| **Epic Games** | Anthrazit | Logo und Schriftzug "EPIC GAMES" | dunkler grauer Streifen, Hinweis "Epic Games Launcher" |
| **Steam** | Marineblau | Logo und Schriftzug "STEAM" | dunkelblauer Streifen mit blauer Akzentlinie, Hinweis "Steam" |

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
| Kopfleiste | oberste 10 mm (GOG) bzw. 18,6 mm (Steam, Epic Games) der Vorderseite und des Rückens |
| USK vorn | 35 × 35 mm, 3 mm vom linken und unteren Rand |
| Publisher-Logo vorn | bis 32 × 14 mm, 6 mm vom rechten und unteren Rand |
| Grüner Streifen und Angabenfeld | 15 mm und 46 mm am unteren Rand der Rückseite |

## Eigene Maße

Für Hüllen mit anderen Maßen (z. B. Blu-ray) gibt es "Eigene Maße": Breite der Rückseite, des Rückens und der Vorderseite sowie die Höhe in Millimetern. Die Bildmaße, das Cover und der Druck richten sich danach.

- **Erlaubt:** Rückseite und Vorderseite 100 bis 150 mm, Rücken 3 bis 30 mm, Höhe 100 bis 198 mm, insgesamt höchstens 285 mm Breite, damit Cover und Schnittmarken auf A4 quer passen. Andere Werte werden angepasst, und das Tool sagt es.
- **Vorlagen:** "Blu-ray" (269 × 148 mm, 14 mm Rücken) und "Blu-ray Slim" (262 × 148 mm, 7 mm Rücken) füllen die Felder.

**Die Vorlagen sind Richtwerte.** Die Herstellerangaben für Blu-ray-Einleger weichen voneinander ab (Gesamtbreite 262 bis 272 mm, Seitenbreite 126 bis 129 mm, Rücken 11 bis 14 mm). Miss deinen Einleger nach und trage die Werte ein.

## Stil

Es gibt einen Stil für alle Anbieter, die **Leiste**: Kopfleiste mit Farbverlauf über die ganze Breite der Vorderseite, Logo (bei Steam und Epic mit Schriftzug, bei GOG schmal, siehe unten) und Hinweis "PC", darunter eine **Akzentlinie, die über den Rücken durchläuft** (Steam blau, Epic hellgrau, GOG nur bei "Dunkel" in feinem Lila). Auf dem Rücken steht das Logo in derselben Leiste. Das **Frontbild beginnt unter der Leiste** (es wird nicht überdeckt), die Maßangabe am Bildfeld zeigt dafür die passende Höhe (z. B. 129 × 164,4 mm bei Steam und Epic, 129 × 173 mm bei GOG, statt 183 mm). Passt das Seitenverhältnis nicht, wird unten statt oben abgeschnitten.

Bei **GOG** ist die Leiste wie bei den echten GOG-Hüllen **schmal (10 mm)**, damit auf Blu-ray-Hüllen Platz für das Bild bleibt, und es gibt sechs Varianten (Feld "Stil", ein **Schieberegler mit sechs Punkten** von hell nach dunkel, die Punkte lassen sich auch anklicken). **Durchsichtig schwarz** ist der Standard:

- **Weiß:** helle Leiste mit feiner Trennlinie, dem **Rahmen-Logo** (`gog_logo_outline.svg`, dunkel gezeichnet) und dunkler Schrift. Der Streifen mit den Spielfunktionen ist hellgrau.
- **Warmweiß:** wie Weiß, aber mit warmem Hellgrau statt reinem Weiß (auf Papier weniger kalt).
- **Durchsichtig weiß:** weiße Leiste als **weicher Verlauf über dem Bild** (läuft nach unten ganz durchsichtig aus, ohne harte Kante), dunkle Schrift und dunkles Logo. Das Frontbild beginnt dann ganz oben (Bildmaß z. B. 129 × 183 mm statt 173 mm).
- **Durchsichtig schwarz:** dasselbe in Dunkel (dunkler Verlauf, weiße Schrift, weißes Logo).
- **Dunkel:** anthrazitfarbene Leiste ohne Linie, weißes Kachel-Logo, dunkler Streifen mit den Spielfunktionen.
- **Dunkel mit Violett-Hauch:** fast schwarz mit einem leichten Violett-Ton, bewusst keine Lila-Fläche (der Unterschied zu Dunkel ist klein).

Bei GOG gibt es außerdem das Feld **"Rücken (GOG)"**: **Passend zur Leiste** (Standard: der Rücken hat die Farbe der Leiste, also hell bei Weiß, Warmweiß und Durchsichtig weiß und dunkel bei den dunklen Stilen), **Dunkel (anthrazit)** oder **Hell**. Auf hellem Rücken sind Rückentitel und "PC" dunkel. Die **Naht** zwischen Rücken und Vorderseite ist bei durchscheinender Leiste ohne Strich, weil beide Leisten dort genau aneinanderstoßen.

Das **GOG-Logo ist immer zu sehen** (bei Dunkel und durchscheinend die weiße Kachel `gog_logo.svg`, bei Weiß das Rahmen-Logo). Der Schriftzug **"GOG.COM"** daneben lässt sich mit dem Haken "GOG.COM neben dem Logo zeigen" ein- und ausschalten. Rechts in der Leiste steht immer **"PC · DRM-FREI"**. Frühere Stile (GOG-Farben mit Lila und Grün, Dunkel mit Lila) werden beim Laden zu **Dunkel**. Bei Steam und Epic gibt es nichts zu wählen.

Beide Anbieter-Farben und die Rückseite (helles Feld mit den Angaben) sind in allen Fällen gleich aufgebaut.

### Frontbild einpassen und USK-Hintergrund

- **Frontbild einpassen** (Bereich "Bilder", unter dem Frontcover): **Strecken** ist der Standard, das ganze Bild füllt die Fläche, bei einem anderen Seitenverhältnis (z. B. Blu-ray-Hülle) wird es leicht gestaucht, nichts fehlt. **Zuschneiden** füllt die Fläche ohne Verzerrung: **Zoom** (100 bis 300 %) und **Ausschnitt** waagerecht und senkrecht (0 bis 100 %) bestimmen, welcher Teil zu sehen ist. Bei "Bild über den Rücken fortsetzen" bleibt es beim Zuschneiden über Rücken und Vorderseite.
- **USK-Hintergrund:** Das USK-Zeichen besteht aus der **Raute** (immer voll sichtbar) und dem **Hintergrund** dahinter (abgerundetes Quadrat mit farbigem Rand). Der Regler "Hintergrund der USK auf der Vorderseite" stellt **nur den Hintergrund** ein: 100 % wie bisher, **0 % zeigt nur die Raute** ohne den farbigen Rand. Auf der **Rückseite steht immer nur die Raute**, etwas größer (19,5 mm), weil der Rand fehlt. Die Dateien liegen als `usk_<Wert>.svg` (Raute) und `usk_<Wert>_bg.svg` (Hintergrund) in `assets/images/usk/`.


### Farbe von "PC" am Rücken

Im Bereich "Rücken" lässt sich die Farbe des **"PC"** am Fuß des Rückens wählen: **Automatisch** (weiß auf dunklem, dunkel auf hellem Rücken), **Weiß** oder **Schwarz**. Das gilt für alle Anbieter (z. B. Schwarz, wenn der Rücken ein helles Bild zeigt).

### Sprache der Oberfläche

Oben in der Leiste steht ein **Sprachmenü mit Flagge** (Deutsch, English). Es stellt die **ganze Benutzeroberfläche** um: Beschriftungen, Hinweise, Dialoge, Fehlermeldungen und Rückfragen. Die Wahl wird im Browser gemerkt (oder mit `?lang=en` in der Adresse gesetzt).

- Bei **Deutsch** gibt es das Feld "Sprache der Beschriftung" (Deutsch oder English): Das ist die Sprache der Texte **auf dem Cover**.
- Bei **English** entfällt dieses Feld, das Cover wird englisch beschriftet.
- Das **Cover selbst** wird nie von der Oberfläche übersetzt, es folgt allein der Beschriftungssprache.

**Weitere Sprachen:** Deutsch ist die Grundsprache, im HTML und im Code stehen die deutschen Texte. Eine Sprache ist ein **Sprachpaket** (`lang-en.js`), das den deutschen Text auf die Zielsprache abbildet. Für eine neue Sprache legt man `lang-xx.js` an (`I18n.register('xx', { name, flag, dict, parts, rules })`), bindet sie in `index.html` ein und legt eine Flagge in `assets/images/flags/` ab. Das Menü zeigt sie dann automatisch an. `dict` enthält ganze Texte, `parts` Bruchstücke zusammengesetzter Meldungen ("... hat mit Fehler 500 geantwortet.") und `rules` Muster mit Zahlen. Ein Test (`tests/i18n.test.js`) prüft, dass jeder deutsche Text im HTML übersetzt ist und keine Schlüssel Tippfehler enthalten, ein Browsertest (`tests/ui/cover-i18n.check.js`) sucht in Oberfläche und Dialogen nach deutschen Resten.


### Bedienung: Schaltflächen und Sprungleiste

Damit sich das Tool auch ohne Vorkenntnisse bedienen lässt, stehen **Auswahlen mit wenigen Möglichkeiten als Schaltflächen** da (z. B. Anbieter, Hülle, Disc-Medium, Sprache der Beschriftung, Frontbild einpassen, Rücken hell oder dunkel, Farbe von "PC"): Man sieht alle Möglichkeiten auf einen Blick und wählt mit einem Klick statt über eine Aufklappliste. Der **Stil** ist ein Schieberegler mit Farbvorschau. Oben im Formular stehen **Sprungknöpfe zu allen Bereichen** (Hülle und Stil, Titel und Texte, Bilder ...), sie öffnen den Bereich und springen hin.


### Rückseite gestalten (Editor)

Die Rückseite besteht aus **zwei Teilen**:

- **Unten, immer gleich (fester Teil):** der Streifen mit den **Spielfunktionen** und darunter **Systemanforderungen, Logos, USK und Copyright**. Er sieht bei GOG, Epic und Steam gleich aus. Nur die **Höhen** lassen sich von Hand einstellen (Bereich "Rückseite" im Formular, 0,25-mm-Schritte), zum Beispiel für eine Blu-ray-Hülle.
- **Darüber, frei (Gestaltungsfläche):** Als Grund dient das Bild "Rückseite oben" (Bereich "Bilder"). Darauf liegen beliebig viele **Bilder und Texte**, die man im **Editor** (Pop-up) anordnet. Geöffnet wird er mit **"Rückseite gestalten …"** oder mit einem **Klick auf die Fläche** in der Vorschau. Was über die Fläche hinausragt, wird abgeschnitten (es verschwindet "hinter dem Weiß").

**Im Editor:**

| Was | Wie |
|---|---|
| Hinzufügen | **+ Text**, **+ Bild (Datei)**, **+ Bild von Steam oder GOG** (Suche, Screenshots, Hintergrund und Titelbild; mehrere Bilder auf einmal wählbar) |
| Verschieben, Größe | Ziehen, Griffe an den Ecken und Kanten (Umschalt hält bei Bildern das Seitenverhältnis), Pfeiltasten (0,25 mm, mit Umschalt 1 mm). Es **rastet** an Rändern, Mitte und anderen Elementen ein (Alt beim Ziehen: nicht einrasten) |
| Text | Inhalt (eigener Text, **Spieltitel** oder **Beschreibung des Spiels**), Schriftart (Lato, Serif, Schmal, Plakat, Schreibmaschine, Handschrift), Größe in pt, Farbe, Stärke, **kursiv**, **GROSSBUCHSTABEN**, Zeichenabstand, Zeilenhöhe, Ausrichtung (auch Blocksatz, senkrecht), "Schrift an Platz anpassen", Hintergrund hinter dem Text mit Deckkraft |
| Bild | Einpassen (füllen, ganz zeigen, strecken), Ausschnitt, Deckkraft, Anzeige der Druckauflösung (dpi) |
| **Rand und Übergang** | Ohne, **Abgerundet**, **Rahmen** (Breite und Farbe), **Weicher Rand** (Bild blendet an den Kanten aus) und **Ausgerissen (Papier)** (unregelmäßiger, ausgefranster Rand) |
| Ordnung | Nach vorn, nach hinten, Duplizieren (Strg+D), Löschen (Entf) |
| Rückgängig | Rückgängig und Wiederholen (Strg+Z, Strg+Y), bis zu 50 Schritte |
| Vorlagen | **Leer**, **Titel und Beschreibung**, **Beschreibung und Bildleiste** (wie bei Steam-Hüllen). Eine Vorlage ersetzt die vorhandenen Elemente (vorher wird gefragt), danach ist alles frei änderbar |

- **Beschreibung:** Steam und GOG übernehmen beim Import die Kurzbeschreibung in das Feld "Beschreibung des Spiels" (Bereich "Rückseite"). Ein Textelement mit Inhalt "Beschreibung des Spiels" zeigt sie an.
- **Schriften** kommen vom Betriebssystem (nur Lato liegt bei). Auf einem anderen Rechner kann ein Text deshalb etwas anders aussehen. Die Papierkante ("Ausgerissen") sieht bei jedem Zeichnen gleich aus.
- **Gespeichert** wird alles mit dem Projekt (Einstellungen, Elemente, Bilder, ZIP). Bilder der Gestaltungsfläche heißen `d1`, `d2` und so weiter und werden beim Schließen des Editors entfernt, wenn kein Element sie mehr braucht.
- **Zu hoch:** Sind die festen Teile zusammen so hoch wie die Rückseite, steht ein Hinweis da. Dann die Höhen verkleinern.

### Längen in Millimetern und negative Abstände

Alle Felder, in denen man eine Länge in **Millimetern** eingibt (eigene Hüllenmaße, Abstände und Breite von Rückenlogo und Publisher-Logo am Rücken), sind Zahlenfelder: Mit **Pfeil nach oben und unten** (oder den kleinen Pfeilen im Feld) geht der Wert in **0,25-mm-Schritten**. Bei den **Abständen am Rücken** (zur Seite, zum Kopf oben, zum Fuß unten) sind auch **negative Zahlen** erlaubt: Das Logo wird dann größer und ragt über seinen Rahmen hinaus. Das hilft bei Logos mit viel leerem Rand ums Bild. Zur Seite hin wird alles am Rand des Rückens abgeschnitten, damit nichts auf Vorder- oder Rückseite zu sehen ist. Nach oben und unten darf das Logo über sein Feld hinaus in den Bereich von Leiste und "PC" ragen. Das kann dort etwas überdecken, bitte im Ausdruck prüfen.


### Daten und Bilder von GOG

Unter **Daten übernehmen > Daten von GOG …** sucht DiscSleeve im **GOG-Katalog** (`catalog.gog.com`) und liest die Spiel-Daten bei `api.gog.com/v2` aus, also bei den Schnittstellen von GOG selbst (aus denen auch [gogdb.org](https://www.gogdb.org/moreinfo) seine Daten holt; deren Seite bittet darum, ihren Server nicht mit Einzelabfragen zu belasten, deshalb fragt DiscSleeve direkt bei GOG). Übernommen werden wie bei Steam:

- **Titel, Publisher, Entwickler**, die **Altersfreigabe** (USK von GOG, sonst PEGI) und die **Spielfunktionen** (Einzelspieler, Mehrspieler, Koop, Cloud-Speicherstände, Erfolge, Controller).
- **Systemanforderungen** für Windows (Minimum und, wenn vorhanden, Empfohlen): Prozessor und Grafikkarte kommen in die Auswahlfelder, Rest als Text, genau wie beim Steam-Import.
- **Bilder** (zum Haken): das **Spiel-Logo** (PNG, transparent, etwa 1600 Pixel breit) für den Rücken, der **Hintergrund** (etwa 2560 Pixel breit) als Rückseite oben, und das **GOG-Cover** als Frontcover.

**Wichtig zur Auflösung:** GOG liefert Cover nur in **etwa 342 × 482 Pixel** (bei älteren Spielen sogar nur 171 × 241). Das sind auf einer Hülle nur rund 67 dpi. Das GOG-Cover ist deshalb **nicht vorangekreuzt**. Logo und Hintergrund dagegen sind hochauflösend und eignen sich gut für Rücken und Rückseite. Gesucht werden Spiele und **Ausgaben** (viele Hauptspiele wie Cyberpunk 2077 führt GOG als Ausgabe), die Treffer sind nach Ähnlichkeit zum eingegebenen Titel sortiert. Die Suche und die Daten gehen wie bei Steam über den **Proxy** (GOG erlaubt Anfragen im Browser nur von gog.com), die Bilder von `images.gog-statics.com` erlauben Anfragen von überall und werden direkt geladen. Der Proxy-Worker erlaubt `catalog.gog.com` und `api.gog.com` bereits.

**Selbst gesetzte Funktionen bleiben:** Beim Übernehmen von Steam oder GOG ersetzt die Funktionsliste des Ladens die bisherige. Nur **"Mods"** bleibt erhalten, wenn Du es selbst eingeschaltet hast (die Läden kennen Mods von Disc-Zusätzen nicht, z. B. ein später installiertes Mod-Menü).

**Verbindung testen** (Einstellungen) prüft zuerst den **Proxy-Worker** (Version und erlaubte Hosts, siehe [Proxy einrichten](steamgriddb.md)) und dann jeden Dienst einzeln: Steam-Shop, SteamGridDB, GOG-Katalog, GOG-Spieldaten, GOG-Bilder, Wikidata und Brandfetch. Bei Fehlern nennt die Zeile oben, wie viele und welche Dienste nicht funktionieren. Der **Konfigurator** testet ebenfalls einzeln (auch den Proxy-Worker): SteamGridDB, Steam-Shop, GOG-Katalog, GOG-Spieldaten, Epic Games Store und die Übersetzung (MyMemory).

### Woher kommen scharfe Cover?

| Quelle | Hochformat-Cover | Hinweis |
|---|---|---|
| **Steam** (Import) | **1200 × 1800** (`library_600x900_2x.jpg`), sonst 600 × 900 | die beste automatische Quelle, etwa 240 dpi |
| **SteamGridDB** | höchstens **660 × 930** | die Schnittstelle erlaubt für Hochformat nur 342 × 482, 600 × 900 und 660 × 930, etwa 120 bis 130 dpi |
| **GOG** | **342 × 482** | nur für Logo und Hintergrund (hochauflösend) sinnvoll |

Die Bildauswahl bei SteamGridDB zeigt zu jedem Bild die **dpi auf der gedruckten Hülle** (rot unter 150, orange unter 250, grün ab 250). Für Druck in 300 dpi brauchte ein Cover (127 × 183 mm) etwa 1500 × 2160 Pixel. Keine Quelle liefert das verlässlich für jedes Spiel: Pressematerial der Hersteller oder ein vorheriges Hochskalieren des Bildes helfen weiter.

## Feste Plätze auf der Rückseite

Die Rückseite hat feste Plätze: links die **Angaben** (am linken Rand, so breit wie möglich), rechts eine **schmale Spalte** mit **Publisher-Logo, Disc-Logo und USK** übereinander, unten in der Mitte das **Copyright**. Schaltet man die USK auf der Rückseite aus, **bleibt der Platz frei** und nichts rutscht. Die Angaben beginnen immer an derselben Stelle, fehlt eine Zeile, bleibt unten Platz. Das prüft ein automatischer Test.

## Rücken-Logo, Rückenbild und Publisher

- **Logo für den Rücken:** Im Bereich "Bilder" lässt sich ein Spiel-Logo laden (🔎 sucht bei SteamGridDB nach Logos). Es steht dann **statt des Titels**, um 90° gedreht und so groß wie der Rücken es zulässt. Mit dem Haken "Statt des Titels das Rückenlogo zeigen" lässt sich zum Titel zurückschalten. Breite Logos stehen gedreht (Ausrichtung einstellbar). Das Seitenverhältnis bleibt immer erhalten. Einstellbar sind die **Abstände in mm zu den Seiten, zum Kopf (oben) und zum Fuß (unten)**. Ist das Logo kürzer als der Platz, steht es oben bündig oder mittig zwischen den Abständen (je nach Einstellung "Titel auf dem Rücken" oben/mittig). Der **Steam-Import** lädt das Logo auf Wunsch mit (Haken im Dialog, von der Steam-Adresse `…/apps/<ID>/logo.png`). Hat Steam dort keins, steht ein Hinweis da und der Rücken zeigt den Titel.
- **Eigenes Rückenbild:** Im Bereich "Rücken" lässt sich ein eigenes Bild für den Rückenhintergrund laden (🔎 sucht bei SteamGridDB, am besten unter "Hintergründe"). Es füllt den Rücken zugeschnitten. Mit **"Ausschnitt"** (links ↔ rechts in %) wählst du die Stelle, mit **"Abdunkeln"** die Lesbarkeit für Titel und Logo. So bleibt das Frontbild unverändert, auch wenn es einen Schriftzug in der Mitte hat.
- **Bild über den Rücken fortsetzen:** Unter "Hintergrund des Rückens" lässt sich statt der Anbieterfarbe das **Frontbild über den Rücken weiterführen**, wie bei Hüllen mit durchgehendem Motiv. Der Rücken wird dafür etwas abgedunkelt, damit Titel und Logo lesbar bleiben. Bei der Leiste beginnt das Bild unter der Kopfleiste.
- **Publisher-Logo am Fuß:** Ist ein Publisher-Logo geladen, steht es am Fuß des Rückens auf einer weißen Kachel, **"PC" bleibt immer ganz unten an derselben Stelle, das Logo steht darüber**. Der Platz richtet sich nach dem Rücken, nicht nach dem Logo: Ein zu breites Logo macht den Rücken **nie** breiter. Zu breite Logos (aufrecht kleiner als etwa 4 mm hoch) werden **automatisch um 90° gedreht**. Einstellbar sind die **Ausrichtung** (Automatisch, Aufrecht, Gedreht), der **Abstand zur Seite** in mm und eine eigene **Breite** in mm (leer = automatisch; bei gedrehtem Logo ist es die Länge entlang des Rückens). Abschaltbar ("Publisher-Logo am Fuß des Rückens").
- **Hintergrund transparent machen:** Der Knopf ◧ am Publisher-Logo und am Rückenlogo macht einen einfarbigen Hintergrund (z. B. Weiß bei Logos von Brandfetch) transparent. Er arbeitet vom Rand aus und blendet die Kante weich über. Im Publisher-Dialog geschieht das automatisch (abschaltbar). Bei Farbverläufen oder mehrfarbigen Ecken meldet das Tool, dass nichts erkannt wurde.

## Rücken

- Das **GOG-Logo** steht oben, entweder in fester Größe (7 mm, Slim 5,5 mm) oder in Rückenbreite.
- Am Fuß steht **"PC"** (abschaltbar). 
- Der **Titel** steht oben unter dem Logo oder **mittig** (Auswahl "Titel auf dem Rücken").
- Der **Titel** steht senkrecht in normaler Schreibweise. Er wird so groß wie möglich (bis 12 pt, Slim bis 8 pt) und verkleinert sich bei langen Titeln selbst, höchstens bis 5 pt.

## Drucken

1. Auf **Drucken** klicken.
2. Im Druckdialog: Papier **A4**, Ausrichtung **quer**, Skalierung **100 %** (nicht "Anpassen"), Ränder **Keine**, **Hintergrundgrafiken** einschalten.
3. Ausdrucken und an den **Schnittmarken** ausschneiden. Die **Falzmarken** (kurze gestrichelte Striche oben und unten außerhalb des Covers, auf Höhe der Rückenkanten; standardmäßig eingeschaltet, auch im Druck) helfen beim Falten.

Rücken und Vorderseite überlappen um 0,6 mm, damit beim Drucken keine helle Naht zwischen ihnen entsteht. Flächen ohne Bild bleiben im Druck weiß. Ein Test misst die Naht in der Vorschau bei mehreren Maßstäben.

Das Cover wird in Originalgröße (273 × 183 mm, Slim 266 × 183 mm) mittig auf das Blatt gesetzt. Die Schnittmarken liegen 2 bis 6 mm außerhalb des Covers und passen dadurch auf das Blatt. Ein Test stellt sicher, dass der Druck genau eine A4-Seite quer ergibt.

**Tipp:** Miss nach dem ersten Ausdruck die Breite nach (273 mm). Weicht sie ab, steht im Druckdialog meist noch "Anpassen" statt 100 %.

## Symbole

Die Symbole der Spielfunktionen stammen aus [Lucide](https://lucide.dev/) (ISC-Lizenz, Datei `assets/images/features/line/LICENSE-lucide.txt`) und sind kleine schwarze SVG-Dateien (unter 1 KB), also in jeder Größe scharf. Das VR-Symbol ist selbst gezeichnet. Die früheren GOG-Original-Symbole (PNG) und die Bestenlisten gibt es nicht mehr.

## Aufbau der Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite mit Formular, Vorschau und Dialog |
| `style.css` | Oberfläche und Cover (alle Maße in Millimetern), beide Stile, Druckregeln |
| `core.js` | Maße, Beschriftungen, Texte für die Systemanforderungen, Standardwerte. Ohne Browser testbar |
| `app.js` | Eingaben, Bilder, Zeichnen der Vorschau, Drucken |
| `extras.js` | Dialoge: Rezept, Steam, SteamGridDB, Einstellungen |
| `i18n.js`, `lang-en.js` | Sprache der Oberfläche: Umschalten, Sprachpaket Englisch |
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
- **Blu-ray-Logo** wurde nicht geladen (Dateiname `blu_ray.svg` statt `blu-ray.svg`).
- **Leistung:** Die USK-Bilder hatten 5625 × 5625 Pixel (je rund 120 MB im Speicher) und sind jetzt 700 × 700. Hochgeladene Bilder werden auf Druckgröße verkleinert und nicht mehr als riesiger Base64-Text gehalten. Die Weichzeichnung (`backdrop-filter`) ist entfernt.
- **Schrift:** Lato lag im Archiv, wurde aber nie geladen.
- **Rücken:** Der Titel steht in normaler Schreibweise (wie bei den GOG-Vorlagen) und verkleinert sich bei langen Titeln von selbst.
- **Verschieben der Rückseite:** Ausgeblendete Elemente gaben ihren Platz im Layout frei und ließen andere rutschen. Jetzt hat die Rückseite feste Plätze.
- Hinzugekommen: Live-Vorschau statt Formular-Abschicken, Zeile "Sonstiges", Beschriftungen auf Deutsch oder Englisch, Windows XP und Vista, macOS und Linux, eigener Text für Prozessor und Grafikkarte, Bestenlisten-Symbol, Hinweis zur Bildschärfe, zweiter Stil "Modern".

## Tests

`npm test` prüft die Logik: Maße und eigene Maße (`tests/cover.test.js`), die Auswertung der Steam-Daten, den ZIP-Leser, die Anfragen über den Proxy mit Fehlerfällen und die gemeinsamen Einstellungen (`tests/cover-online.test.js`) sowie die Einstellungs- und Projektdateien samt Austausch mit dem Konfigurator (`tests/cover-files.test.js`).

`npm run test:ui` lädt das Tool in einem echten Chromium. `tests/ui/cover.check.js` prüft Eingaben, Bildverkleinerung, Disc-Logos, Hüllenwechsel, eigene Maße, Speichern der Einstellungen, **feste Plätze** (nichts verschiebt sich), beide Stile und den **Druck** (genau eine A4-Seite quer, Cover mittig in Originalgröße, Schnittmarken im Blatt). `tests/ui/cover-online.check.js` prüft die obere Leiste, Anbieter-Stile, die Übernahme aus Rezept und Steam (auch per Steam-Adresse und mit Fehlern des Proxys), die Bildsuche bei SteamGridDB, den Einstellungsdialog mit Sicherung in Datei (mit und ohne Passwort, auch mit einer Datei aus dem Konfigurator) sowie Export und Import des Projekts, alles mit nachgebauten Diensten. Nicht automatisch geprüft sind ein echter Ausdruck und die echten Dienste.

## Hinweise

- GOG, Epic Games, Steam (Namen und Logos) und die USK-Symbole sind Marken ihrer Inhaber. Das Tool ist für den privaten Druck eigener Hüllen gedacht.
- Die Schrift Lato steht unter der SIL Open Font License (siehe `disc-sleeve/assets/fonts/README.txt`).

