# Web-App: Disc-Menü und Cover & Hülle

Die Web-App von DiscMenu-Builder ist **eine Seite mit zwei Bereichen**: Im **Disc-Menü** stellt man das Menü der Disc zusammen (Spiele, Installer, DLCs, Patches, Extras, Bilder, Sounds), aus dem der [Builder](player-und-builder.md) die Menü-EXE macht. Unter **Cover & Hülle** gestaltet man die druckfertige Hülle (Vorderseite, Rücken, Rückseite mit Systemanforderungen, Spielfunktionen und USK). Beide Bereiche gehören zu **einem Projekt** mit einem Speicher und einer Projektdatei.

**Online:** https://einmensch002.github.io/DiscMenu-Builder/ (direkt zur Hülle: `#huelle`, die alten Adressen `/disc-sleeve/` und `/cover/` leiten dorthin weiter)
**Dateien:** [app/](../app/). Zum lokalen Benutzen den Ordner herunterladen und `index.html` im Browser öffnen, dann geht es auch ohne Internet.

## Inhalt

- [Grundsätze](#grundsätze)
- [Leiste und Bereiche](#leiste-und-bereiche)
- [Gemeinsames Projekt](#gemeinsames-projekt) (Speicher, Projektdatei `recipe.json`, ältere Dateien)
- [Bereich Disc-Menü](#bereich-disc-menü) (Bedienung, Vorschau, Spielordner einlesen)
- [Bereich Cover & Hülle](#bereich-cover--hülle) (Bedienung, Daten übernehmen, Stil, Rückseiten-Editor, Drucken)
- [Einstellungen und Dienste](#einstellungen-und-dienste)
- [Sprache](#sprache)
- [Aufbau der Dateien](#aufbau-der-dateien), [Entwicklung](#entwicklung), [Tests](#tests), [Grenzen](#grenzen), [Hinweise](#hinweise)

## Grundsätze

- **Läuft komplett im Browser.** Kein Backend, nichts wird hochgeladen. Bilder, Sounds und Projektdateien werden lokal verarbeitet.
- **Keine Abhängigkeiten.** Keine externen Bibliotheken, ZIP schreiben und lesen sind selbst eingebaut. Der Code ist auf mehrere Dateien verteilt (siehe [Aufbau der Dateien](#aufbau-der-dateien)). Ein [Ein-Datei-Build](#ein-datei-build) soll ihn später zu einer HTML-Datei zusammenfassen.
- Die Web-App erzeugt das Rezept und das Cover. Die Menü-EXE macht der Builder.

## Leiste und Bereiche

Oben steht in beiden Bereichen dieselbe Leiste. Links der Umschalter **Disc-Menü | Cover & Hülle** (die Seite lädt dabei nicht neu, die Adresse merkt sich den Bereich mit `#menue` oder `#huelle`) und die Knöpfe, die nur zu einem Bereich gehören (**Vorschau** im Menü, **Drucken** bei der Hülle). Rechts alles, was für das ganze Projekt gilt:

| Leiste | Inhalt |
|---|---|
| **Projekt** | **Öffnen …** (Projektdatei, auch ältere Dateien: Rezept als ZIP oder `menu.json`, Hüllen-Datei, einzelne `recipe.json`), **Speichern** (Strg+S, in beiden Bereichen), **Speichern unter …**, **Im Browser speichern**, **Neues Projekt** (leert Menü und Hülle) |
| **Daten übernehmen** | Spiel über SteamGridDB hinzufügen, **Spielordner einlesen** (siehe unten), Anforderungen von Steam, Daten von GOG |
| **Sonstiges** | **`recipe.json` bearbeiten** mit den Reitern **Alles**, **Gemeinsam**, **Menü** und **Hülle** (vorausgewählt ist der Bereich, in dem man gerade ist), Disc-Ordner prüfen (Chrome, Edge) |
| **Einstellungen** | ein Dialog für beide Bereiche: SteamGridDB-Schlüssel, Proxy, Brandfetch, Verbindungstest (alle Dienste beider Bereiche), eigene Schriften, Sichern und Einlesen |
| **Sprache** | Deutsch oder Englisch für die ganze Oberfläche (siehe [Sprache](#sprache)) |
| Browser | Verhalten |
|---|---|
| Chrome, Edge am Computer | Das erste "Speichern" fragt nach dem Ort, danach überschreibt "Speichern" dieselbe Datei. Eine über "Öffnen …" gewählte Projektdatei wird direkt überschrieben. |
| Chrome auf Android, Firefox, Safari | Der Browser lässt Webseiten keine vorhandenen Dateien überschreiben. Jedes Speichern wird neu heruntergeladen (z. B. `name(1).zip`). Bis dahin bleibt alles im Browser gesichert. |

Beide Bereiche haben dasselbe helle Design. Oben erscheinen Hinweise, wenn etwas fehlt (z. B. Frontcover oder Titel), sie blockieren nichts.

## Gemeinsames Projekt

**Verknüpft, nichts doppelt:** Die Hülle gehört zum ersten Spiel des Menüs. **Name des Spiels = Titel der Hülle**, dazu Anbieter, Beschreibung, geschätzte Größe (= Speicherplatz auf der Hülle) und **Cover des Spiels = Frontcover**. Diese Werte stehen nur einmal im Projekt. Was man in einem Bereich ändert, steht sofort auch im anderen. Das Cover wird für jeden Zweck passend verkleinert (Menü: höchstens 800 Pixel, Hülle: Druckgröße), beide entstehen aus demselben Bild.

**Im Browser:** Das Projekt wird kurz nach jeder Änderung automatisch im Browser gesichert (IndexedDB `discmenu-projekte`) und ist nach dem Neuladen wieder da. Beim ersten Start übernimmt die Seite die Stände der früheren getrennten Tools (Konfigurator-Projekt und DiscSleeve), die alten Speicher bleiben unverändert. Die frühere Liste mehrerer Projekte im Browser gibt es nicht mehr: Jedes Projekt ist eine Datei.

**Projektdatei (ZIP):** Eine einzige Beschreibung, die `recipe.json`, erklärt das ganze Projekt. Gemeinsame Angaben stehen darin nur einmal:

```
recipe.json        Beschreibung des Projekts (siehe unten)
assets/…           alle Bilder und Sounds, jede Datei nur einmal (z. B. assets/cover.jpg = Frontcover und Cover im Menü, assets/huelle-… für die Hülle)
fonts/…            eigene Schriften, die Texte der Hülle benutzen
```

```json
{
  "format": "discmenu-recipe", "version": 1,
  "gameIndex": 0,
  "game":  { "title": "…", "provider": "gog", "description": "…", "publisher": "…", "developer": "…", "sizeMB": 1500, "cover": "assets/cover.jpg" },
  "menu":  { "schemaVersion": 1, "title": "…", "games": [ { "index": 0, "installer": "…", "patches": [ … ] } ] },
  "cover": { "state": { … }, "images": { "spineLogo": { "file": "assets/huelle-spineLogo.png", "name": "…" } }, "fonts": { … } }
}
```

- **game** (Gemeinsam): Titel, Anbieter, Beschreibung, Publisher, Entwickler, Größe und Cover des Spiels, das die Hülle zeigt (`gameIndex`). Sie gelten für Menü und Hülle und stehen nirgends sonst.
- **menu**: das Menü im Format der [menu.json](menu-json-spec.md), beim Spiel `gameIndex` ohne die gemeinsamen Angaben. Weitere Spiele stehen vollständig darin.
- **cover**: Einstellungen und Bilder der Hülle, ebenfalls ohne die gemeinsamen Angaben.

Der **Builder** liest die `recipe.json` direkt: Er setzt die gemeinsamen Angaben in das Spiel ein und verarbeitet das Menü wie eine `menu.json` (`src/Shared/recipe.go`, `MenuFromRecipe`). Logik und Format in der Web-App: `app/project.js`, Tests: `tests/app-project.test.js` und `TestWebAppProjectLoads` (Go).

**Ältere Dateien** lassen sich weiter öffnen: die Projektdatei der ersten Vorschau (`menu.json` und `cover.json` getrennt), ein Rezept (ZIP mit `menu.json`, die Hülle wird aus dem Spiel vorbereitet), eine einzelne `menu.json` und eine Hüllen-Datei der früheren DiscSleeve-Version (`cover.json` Version 1, das Menü wird aus der Hülle vorbereitet). **Beim Speichern** eines solchen Projekts (Strg+S oder "Speichern unter …") erscheint zuerst der Hinweis **Neues Dateiformat**: Gespeichert wird im neuen Format, ältere Versionen der Seite können die Datei danach nicht mehr öffnen. Erst mit "Im neuen Format speichern" wird geschrieben.

Wie die Datei gespeichert wird, hängt vom Browser ab:

| Browser | Verhalten |
|---|---|
| Chrome, Edge am Computer | Das erste "Speichern" fragt nach dem Ort, danach überschreibt "Speichern" dieselbe Datei. Eine über "Öffnen …" gewählte Projektdatei wird direkt überschrieben. |
| Chrome auf Android, Firefox, Safari | Der Browser lässt Webseiten keine vorhandenen Dateien überschreiben. Jedes Speichern wird neu heruntergeladen (z. B. `name(1).zip`). Bis dahin bleibt alles im Browser gesichert. |

## Bereich Disc-Menü

Links die Liste der Spiele, rechts das Formular zum gewählten Eintrag, ganz rechts die Prüfung. Die Beschreibung des Projekts öffnet sich unter **Sonstiges → recipe.json bearbeiten …**. Auf dem Handy stehen die Bereiche untereinander.

- **Disc-Einstellungen:** Titel, EXE-Name, Hintergrundbild, Klick- und Hover-Sound.
- **Spiele:** hinzufügen, löschen, mit den Pfeilen sortieren. Der `index` ergibt sich aus der Reihenfolge (0, 1, 2 ...).
- **Pro Spiel:** Name, Quelle (GOG, Epic Games oder Steam, mit Abzeichen in Liste und Vorschau), Cover, Beschreibung, Installer-Pfad, Parameter, geschätzte Größe.
- **Bereiche DLCs, Patches, Extras:** Einträge mit Name, Gruppe (Unterkategorie, mit Vorschlägen), Beschreibung, Bild und Aktion ("Installer starten" oder "Datei, Ordner oder Link öffnen"). Einträge lassen sich sortieren und entfernen.
- **Hilfe-Links:** In den Dialogen für SteamGridDB, Proxy und Beschreibungen führen Links zu den passenden Abschnitten dieser Anleitung, zu SteamGridDB (API-Schlüssel) und zu Cloudflare (Proxy). Fehlermeldungen zu CORS oder zum Proxy enthalten einen Link zur Anleitung.
- **SteamGridDB:** Spiele und Bilder lassen sich bei SteamGridDB suchen. Schlüssel und Proxy stehen im gemeinsamen Dialog **Einstellungen** und lassen sich in einer (optional verschlüsselten) Datei sichern und wieder einlesen. Siehe [steamgriddb.md](steamgriddb.md).
- **Beschreibungen:** Der Knopf "Beschreibung suchen" holt Texte aus dem Steam-Shop, von GOG und aus dem Epic Games Store und kann englische Texte übersetzen. Siehe [steamgriddb.md](steamgriddb.md).
- **Bilder** per Drag-and-drop, Antippen oder über die SteamGridDB-Suche. Beim Hinzufügen werden sie verkleinert und umgewandelt: Cover auf höchstens 800 Pixel als PNG, Hintergrund auf höchstens 1920 Pixel als JPEG. Das hält die Menü-EXE klein. Diese Werte sind vorläufig.
- **Sounds:** WAV, OGG oder MP3, unverändert übernommen.
- **recipe.json bearbeiten:** **Sonstiges → recipe.json bearbeiten …** zeigt die Beschreibung des Projekts mit den Reitern **Alles**, **Gemeinsam**, **Menü** und **Hülle** (vorausgewählt ist der Bereich, in dem man gerade ist). "Änderungen übernehmen" liest sie zurück. Bilder und Sounds bleiben über ihre Pfade (`assets/...`) verbunden, neue Dateien lassen sich nur in der Maske hinzufügen. Ungültiges JSON bleibt im Dialog stehen und wird nicht übernommen.
- **Vorschau und Simulation:** Der Knopf "Vorschau" zeigt das Menü im Stil klassischer Windows-Installer: ein Fenster mit Titelleiste auf dem Hintergrundbild, **links Bild und Beschreibung, rechts die Knöpfe** mit Symbol und Trennlinien (Installieren, DLCs, Patches, Extras, Beenden). Fährt man mit der Maus über ein Spiel oder einen Eintrag, zeigt die linke Seite dessen Bild und Beschreibung. **Hat ein Eintrag (z. B. ein DLC) ein eigenes Bild, wird dieses gezeigt, sonst das Bild des Spiels.** Das Abzeichen und die Akzentfarbe richten sich nach dem Anbieter. Man kann klicken, in die Bereiche wechseln und "Stille Installation" mit Zielordner (unten im Fenster) einschalten. "Installieren" startet eine **Simulation**, installiert wird nichts:
  - **Still:** Das Menü zeigt "Installation läuft" mit Fortschrittsbalken und danach das Ergebnis.
  - **Normal:** Es erscheint ein nachgebautes Installer-Fenster (Weiter, Installieren, Fertigstellen, Abbrechen), das Menü wartet wie im Player.
  - **Ergebnis wählbar:** Erfolg, Fehler mit Code 1 (Platte voll, mit Protokollauszug) oder Code 5 (Administratorrechte fehlen). Das Tempo lässt sich ändern.
  - Unter der Vorschau steht der **Ablauf** mit der Kommandozeile, mit der der Player den Installer starten würde (z. B. `/VERYSILENT ... /DIR="..."`). Die Befehlszeilen sind durch einen Test mit dem Go-Player abgeglichen.
  - Grenzen: Die nachgebaute Player-Ansicht ist wie der Player deutsch, die Schrift ist die des Systems (der Player nutzt Go Regular), und das Installer-Fenster ist ein allgemeiner Nachbau, kein echter GOG-Installer. Zielordner-Dialog ("Durchsuchen ...") und "Beenden" werden nur simuliert.
- **Disc-Ordner prüfen:** Im Bereich "Prüfung" gibt es (nur in Chrome und Edge am Computer) den Knopf "Disc-Ordner prüfen". Man wählt den Ordner, der so aufgebaut ist wie die fertige Disc, und die Seite meldet, welche Installer- und Extra-Pfade fehlen oder auf einen Ordner statt einer Datei zeigen. Die Groß-/Kleinschreibung wird dabei nicht beachtet. Es wird nur gelesen, nichts verändert oder hochgeladen. Links (`https://`) werden nicht geprüft.
- **Prüfung** (rechts) nach den Regeln der [Spezifikation](menu-json-spec.md). Gespeichert werden kann jederzeit, der Builder lehnt ein Rezept mit Fehlern aber ab.

#### Spielordner einlesen

**Daten übernehmen → Spielordner einlesen …** (oder der Knopf in der Prüfung rechts, nur Chrome und Edge am Computer): Man wählt den Ordner, der wie die Disc aufgebaut ist, z. B.:

```
DISK 1/
├─ base_game/              Installer des Spiels (setup_….exe, die .bin-Teile gehören dazu)
├─ Story_Erweiterungen/    DLCs, jeder Unterordner ein Eintrag
├─ Patches_und_Fixes/      Patches, Gruppe "Patches & Fixes"
├─ Hauptspiel_Overhauls/   Patches, Gruppe "Hauptspiel Overhauls"
└─ extras/                 Extras (jede Datei und jeder Unterordner wird geöffnet)
```

Der Browser fragt, ob die Seite den Ordner lesen darf. Gelesen werden nur die Namen, nichts wird hochgeladen. Die Seite schlägt nach den Ordnernamen vor, was Installer, DLC, Patch oder Extra ist (die Namen müssen nicht genau so heißen: `dlc`, `erweiterung`, `expansion`, `patch`, `fix`, `mod`, `overhaul`, `extra`, `bonus`, `soundtrack`, `handbuch` … werden erkannt). Der Vorschlag erscheint als Tabelle: **Art, Name und Gruppe lassen sich je Zeile ändern**, "nicht übernehmen" oder das **✕** am Ende der Zeile lassen eine Zeile weg. Erst "Übernehmen" trägt die Einträge beim gewählten Spiel ein (Pfade ab dem gewählten Ordner = Wurzel der Disc). Vorhandene Einträge bleiben, gleiche Pfade werden nicht doppelt eingetragen. **Mehrere Spiele auf einer Disc:** Liegt jedes Spiel in einem eigenen Ordner (z. B. `burgspiel/` und `burgspiel_kreuzzug/`, darin die Setups und ein Ordner `Bonus`), erkennt die Seite das. Die Tabelle hat dann je Spielordner eine Kopfzeile mit der Wahl **zu welchem Spiel im Menü** er gehört (passende Namen werden vorgewählt), **als neues Spiel anlegen** oder **nicht übernehmen**. Programme direkt in der Wurzel (meist die Menü-EXE selbst) und `autorun.inf` werden nicht übernommen. Im Spielordner gilt: Das Setup, dessen Name am besten zum Spiel passt (sonst das mit dem kürzesten Namen, meist die Grundversion), ist der Installer, weitere Setups (z. B. eine HD-Version) werden DLCs, andere Programme (z. B. ein Zusatzspiel) Extras, die gestartet werden.

**Nur ein Spielordner gewählt:** Wählt man z. B. nur `burgspiel_kreuzzug`, steht oben **Liegt auf der Disc im Ordner** (vorausgefüllt mit dem Ordnernamen, leer bei Namen wie "DISK 1"). Dieser Ordner wird allen Pfaden vorangestellt, damit sie zur fertigen Disc passen.

**Namen** werden gesäubert (ohne Endung, Versionsnummern, Datum, "setup"/"installer" und ohne den Spielnamen vorn, z. B. "mein_spiel_soundtrack" → "Soundtrack", "FixPack.3.4.1.2024-11-29.039.exe" → "FixPack"). **Extras** bekommen eine Gruppe nach Name und Inhalt: **Anleitungen** (Handbuch, Referenzkarte, Guide), **Musik** (Soundtrack, Audiodateien), **Artwork** (Wallpaper, Artbook, Bilder), **Videos** und **Zusätze** (alles andere, z. B. Zeitung, Erfolgsliste), in dieser Reihenfolge sortiert. Regeln: `project.js` `planFromFolder` und `cleanName`.

## Bereich Cover & Hülle

Die Hülle ist ein druckfertiges Blatt (A4 quer) mit Rückseite, Rücken und Vorderseite im Stil der Anbieter, auf Wunsch mit Systemanforderungen, Spielfunktionen und USK-Kennzeichnung. Das Menü liegt auf der Disc, das Cover steckt in der Hülle.

- **Läuft komplett im Browser.** Kein Backend, es wird nichts hochgeladen. Bilder werden lokal verarbeitet.
- **Live-Vorschau:** Links die Einstellungen, rechts das Blatt in Originalproportionen. Jede Änderung ist sofort sichtbar.
- **Ein Stil für alle Anbieter:** die Leiste (Kopfleiste über die ganze Breite, wie bei Handelsspielen). Bei GOG ist die Leiste schmal (10 mm) und es gibt sechs Varianten (Weiß, Warmweiß, Durchsichtig weiß, Durchsichtig schwarz, Dunkel, Dunkel mit Violett-Hauch).
- **Drei Anbieter:** GOG, Epic Games und Steam mit eigenen Farben, Logo und Schriftzug (siehe [Anbieter](#anbieter)).
- **Daten übernehmen:** Systemanforderungen und Funktionen von Steam und GOG, Bilder von SteamGridDB, Publisher-Logos von Wikidata und Brandfetch (siehe [Daten übernehmen](#daten-übernehmen)). Titel, Anbieter, Beschreibung, Größe und Frontcover kommen aus dem Menü (verknüpft).
- **Druckfertig:** A4 quer, Cover in Originalgröße mittig, Schnittmarken außerhalb des Covers, optional gestrichelte Falzmarken an den Rückenkanten (ebenfalls außerhalb).
- **Deutsch oder Englisch:** Die Beschriftung auf dem Cover lässt sich wählen.
- **USK statt PEGI oder ESRB, ohne Barcode.** Die USK-Kennzeichnung steht vorn (35 × 35 mm, 3 mm Abstand) und auf Wunsch kleiner hinten.

### Standardwerte

Neue Projekte starten mit **GOG, normaler Hülle (14 mm), DVD, dem Stil Durchsichtig schwarz**, sichtbarem "GOG.COM", dem Rücken passend zur Leiste, dem Rückentitel mittig und **eingeschalteten Falzmarken**. Wer schon gespeicherte Einstellungen im Browser hat, behält diese. **Projekt → Neues Projekt** stellt die Standardwerte her (und leert auch das Menü).

### Schnellstart

1. Im **Disc-Menü** das Spiel anlegen (Name, Anbieter, Cover) oder mit **Daten übernehmen → Spielordner einlesen** einen fertigen Spielordner einlesen. Titel, Anbieter und Cover stehen danach schon auf der Hülle.
2. Zu **Cover & Hülle** wechseln, optional **Daten übernehmen → Anforderungen von Steam** oder **Daten von GOG**.
3. **Hülle und Disc** wählen (Normal, Slim oder eigene Maße, CD, DVD oder Blu-ray).
4. **Bilder** prüfen oder laden: Frontcover und Rückseite oben, optional Rückseite unten und Publisher-Logo.
5. **Spielfunktionen** und **Systemanforderungen** ausfüllen.
6. Auf **Drucken** klicken (siehe [Drucken](#drucken)) und das Projekt mit **Strg+S** speichern.

### Einstellungen des Covers

Links stehen die **Einstellungen des Covers**, rechts die Vorschau in Originalproportionen. | Bereich | Inhalt |
|---|---|
| 1. Hülle und Stil | Anbieter (GOG, Epic Games, Steam). Hülle: Normal (14 mm Rücken), Slim (7 mm) oder Eigene Maße (mit Vorlagen für Blu-ray). Medium: CD, DVD oder Blu-ray (nur das Logo auf der Rückseite, bis 18 × 9,5 mm groß). Sprache der Beschriftung. Stil (nur bei GOG: Schieberegler mit sechs Varianten von Weiß bis Dunkel mit Violett-Hauch), Rücken (hell oder dunkel) und Haken "GOG.COM" zeigen |
| 2. Titel und Texte | Spieletitel für den Rücken, Copyright-Text (unten mittig auf der Rückseite) |
| 3. Bilder | Frontcover, Rückseite oben, Rückseite unten (optional). Pro Bild stehen die Maße dabei, nach dem Laden zeigt das Tool Dateiname, Pixelgröße und wie scharf es gedruckt wird. Bilder lassen sich per Drag-and-drop oder Klick laden, bei SteamGridDB suchen (🔎) und wieder entfernen |
| 4. Publisher-Logo und Altersfreigabe | Publisher-Logo (Vorderseite, Rückseite und Rücken), **Unterlage dahinter auf der Vorderseite** (keine, weiß oder schwarz), USK-Freigabe (0, 6, 12, 16, 18 oder keine), "USK auch auf der Rückseite zeigen" und Hintergrund der USK vorn (Deckkraft 0 bis 100 %, 0 = nur die Raute) |
| 5. Rücken | Titel (oben oder mittig), Hintergrund (Farbe, **eigenes Rückenbild** mit wählbarem Ausschnitt und Abdunkeln, oder Frontbild fortsetzen), Größe des Anbieter-Logos, Rückenlogo (statt des Titels) mit Ausrichtung und Abständen, Publisher-Logo am Fuß mit Unterlage, Ausrichtung, Abstand und Breite, "PC" am Fuß |
| 6. Spielfunktionen | Single-Player, Co-op, Multi-Player, Online, LAN, Cross-Plattform, Controller Support, Erfolge, Cloud Saves, Mods, VR. Die Reihenfolge auf dem Cover ist fest, die Symbole sind Linien-SVG. Sind so viele gewählt, dass ein Wort (z. B. "Controller" oder "Achievements" auf Englisch) nicht mehr in seinen Platz passt, wird die Schrift **aller** Beschriftungen automatisch so weit verkleinert (höchstens auf 55 %), dass sich nichts überlappt |
| 7. Systemanforderungen | Läuft auf: Windows XP, Vista, 7, 8, 10, 11, macOS, Linux, dazu "64-Bit" bei Windows. Prozessoren und Grafikkarten als Listen mit beliebig vielen Einträgen (siehe unten), Arbeitsspeicher und Speicherplatz (Regler oder Zahl), DirectX und Sonstiges (leer lassen blendet die Zeile aus) |
| 8. Drucken | Schnittmarken an den Ecken, Falzmarken außerhalb des Covers an den Rückenkanten (gestrichelt), Hinweis zu den Druckeinstellungen |

#### Prozessoren und Grafikkarten

Beides sind **Listen**: Mit **+ Intel**, **+ AMD** (Prozessor) bzw. **+ GeForce**, **+ Radeon** (Grafikkarte) kommt ein Eintrag hinzu, **+ Eigener Text** ergänzt freien Text (z. B. "Arc A380" oder "Pentium III 500 MHz"). Jeder Eintrag hat einen **Haken** (auf dem Cover zeigen oder ausschalten, ohne ihn zu löschen), die Art, Auswahlfelder und ✕ zum Entfernen. So sieht man auf einen Blick, um welche Karten es geht.

- **Prozessor:** Intel (Core i3 bis i9, Core Ultra, Pentium, Celeron, Core 2) oder AMD (Ryzen, Athlon, Phenom, FX) mit Modell und Zusatz (K, KF, F bzw. X, X3D, G). Ergebnis z. B. "Intel Core i5-12400F", "AMD Ryzen 5 5600X".
- **Grafikkarte:** GeForce (RTX, GTX, GTS, GT, Titan, Quadro) oder Radeon (RX, HD, R9, R7, R5, Vega) mit Modell, Zusatz (Ti, SUPER, **Ti SUPER**, XT, XTX, GRE) und **Speicher in GB**. Ergebnis z. B. "GeForce GTX 1060 6 GB", "Radeon RX 580 8 GB". Es steht **nur GeForce bzw. Radeon**, nie "NVIDIA GeForce" oder "AMD Radeon", auch nicht bei freiem Text (aus "NVIDIA GeForce 8800 GT" wird "GeForce 8800 GT").
- **Auf dem Cover steht jeder Eintrag in einer eigenen Zeile**, untereinander wie in einer Liste.
- **Import (z. B. Steam):** Ein "or", "oder" oder "/" trennt die Möglichkeiten, jede wird ein eigener Eintrag (keine Obergrenze außer 8). Was in die Auswahlfelder passt, kommt dorthin, z. B. "GeForce GTX 1060 6GB or Radeon RX 580 8GB or Arc A380" ergibt GeForce GTX 1060 / 6 GB, Radeon RX 580 / 8 GB und den Text "Arc A380". Was nicht passt, bleibt als Text erhalten, nichts geht verloren. Ein "or better" oder "or equivalent" am Ende entfällt.
- Ältere gespeicherte Einstellungen (Intel/AMD- und NVIDIA/AMD-Felder) werden beim Laden automatisch in Einträge umgewandelt.

#### Mindest- und empfohlene Anforderungen

Im Formular gibt es bei den Systemanforderungen die Reiter **Mindestanforderungen** und **Empfohlen**. "Läuft auf" (Betriebssystem) gilt für beide. Auf dem Reiter "Empfohlen" schaltet **Empfohlene Anforderungen zusätzlich auf der Hülle zeigen** die zweite Spalte ein. Prozessor, Grafikkarte, Speicher, DirectX und Sonstiges lassen sich dort getrennt eintragen.

Auf der Rückseite entsteht dann eine **Tabelle mit den Spalten Minimum und Empfohlen**. Angaben, die in beiden gleich sind (und das Betriebssystem), stehen nur einmal über beide Spalten, fehlt eine Angabe in einer Spalte, steht dort "–". Damit die Tabelle Platz hat, wird die rechte Spalte etwas schmaler. Ohne empfohlene Angaben bleibt es bei der einfachen Liste.

**Sonstiges Satz für Satz:** Der Text bei "Sonstiges" wird in einzelne Sätze zerlegt, jeder Satz steht in einer eigenen Zeile. Sätze, die bei Minimum und Empfohlen **gleich** sind, stehen **einmal in der Mitte** über beide Spalten. Abweichende Sätze stehen nur in ihrer Spalte (in der anderen steht "–"). So steht z. B. "SSD required" mittig und ein nur im Minimum genannter Hinweis nur links. Dasselbe gilt für die anderen Zeilen: gleiche Werte (z. B. DirectX) stehen einmal in der Mitte.

**Kopf mittig:** "Minimum" und "Empfohlen" stehen **mittig über dem tatsächlich beschriebenen Bereich** ihrer Spalte, also über der breitesten Zeile, nicht über der ganzen Spaltenbreite.

**Nichts wird abgeschnitten:** Lange Angaben (auch Sonstiges) brechen um, und die Schrift wird bei Platzmangel kleiner (bis 4,4 pt). Alles, was in den Feldern steht, steht auch auf der Hülle. Ein Test prüft das für beide Stile und Anbieter.

### Daten übernehmen

Unter **Daten übernehmen** in der Leiste stehen "Spiel über SteamGridDB hinzufügen", "Spielordner einlesen" (beide für das Menü), "Anforderungen von Steam" und "Daten von GOG". Alles Übernommene lässt sich danach von Hand ändern. Titel, Anbieter, Beschreibung und Größe landen dabei auch im Menü, weil sie verknüpft sind.

#### Anforderungen von Steam

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

#### Daten und Bilder von GOG

Unter **Daten übernehmen > Daten von GOG …** sucht DiscSleeve im **GOG-Katalog** (`catalog.gog.com`) und liest die Spiel-Daten bei `api.gog.com/v2` aus, also bei den Schnittstellen von GOG selbst (aus denen auch [gogdb.org](https://www.gogdb.org/moreinfo) seine Daten holt; deren Seite bittet darum, ihren Server nicht mit Einzelabfragen zu belasten, deshalb fragt DiscSleeve direkt bei GOG). Übernommen werden wie bei Steam:

- **Titel, Publisher, Entwickler**, die **Altersfreigabe** (USK von GOG, sonst PEGI) und die **Spielfunktionen** (Einzelspieler, Mehrspieler, Koop, Cloud-Speicherstände, Erfolge, Controller).
- **Systemanforderungen** für Windows (Minimum und, wenn vorhanden, Empfohlen): Prozessor und Grafikkarte kommen in die Auswahlfelder, Rest als Text, genau wie beim Steam-Import.
- **Bilder** (zum Haken): das **Spiel-Logo** (PNG, transparent, etwa 1600 Pixel breit) für den Rücken, der **Hintergrund** (etwa 2560 Pixel breit) als Rückseite oben, und das **GOG-Cover** als Frontcover.

**Wichtig zur Auflösung:** GOG liefert Cover nur in **etwa 342 × 482 Pixel** (bei älteren Spielen sogar nur 171 × 241). Das sind auf einer Hülle nur rund 67 dpi. Das GOG-Cover ist deshalb **nicht vorangekreuzt**. Logo und Hintergrund dagegen sind hochauflösend und eignen sich gut für Rücken und Rückseite. Gesucht werden Spiele und **Ausgaben** (viele Hauptspiele wie Cyberpunk 2077 führt GOG als Ausgabe), die Treffer sind nach Ähnlichkeit zum eingegebenen Titel sortiert. Die Suche und die Daten gehen wie bei Steam über den **Proxy** (GOG erlaubt Anfragen im Browser nur von gog.com), die Bilder von `images.gog-statics.com` erlauben Anfragen von überall und werden direkt geladen. Der Proxy-Worker erlaubt `catalog.gog.com` und `api.gog.com` bereits.

**Selbst gesetzte Funktionen bleiben:** Beim Übernehmen von Steam oder GOG ersetzt die Funktionsliste des Ladens die bisherige. Nur **"Mods"** bleibt erhalten, wenn Du es selbst eingeschaltet hast (die Läden kennen Mods von Disc-Zusätzen nicht, z. B. ein später installiertes Mod-Menü).

#### Woher kommen scharfe Cover?

| Quelle | Hochformat-Cover | Hinweis |
|---|---|---|
| **Steam** (Import) | **1200 × 1800** (`library_600x900_2x.jpg`), sonst 600 × 900 | die beste automatische Quelle, etwa 240 dpi |
| **SteamGridDB** | höchstens **660 × 930** | die Schnittstelle erlaubt für Hochformat nur 342 × 482, 600 × 900 und 660 × 930, etwa 120 bis 130 dpi |
| **GOG** | **342 × 482** | nur für Logo und Hintergrund (hochauflösend) sinnvoll |

Die Bildauswahl bei SteamGridDB zeigt zu jedem Bild die **dpi auf der gedruckten Hülle** (rot unter 150, orange unter 250, grün ab 250). Für Druck in 300 dpi brauchte ein Cover (127 × 183 mm) etwa 1500 × 2160 Pixel. Keine Quelle liefert das verlässlich für jedes Spiel: Pressematerial der Hersteller oder ein vorheriges Hochskalieren des Bildes helfen weiter.

#### Publisher-Logo suchen

Beim Publisher-Logo (🔎 im Bildfeld) sucht das Tool **nicht bei SteamGridDB, sondern bei Wikidata** (Logos kommen von Wikimedia Commons). Das Suchfeld ist mit dem **Publisher aus dem Steam-Import** vorbelegt (z. B. "Valve"), darunter stehen Knöpfe für Publisher und Entwickler (z. B. "CD PROJEKT RED"). Es erscheinen nur Firmen, bei denen ein Logo hinterlegt ist. Aktuelle Logos stehen vorn, ältere (bei Wikidata mit Enddatum) sind als "älteres Logo" gekennzeichnet. Ein Klick wählt das Logo, "Als Publisher-Logo übernehmen" lädt es (als PNG, 800 px breit, transparent). Es ist weder ein Schlüssel noch ein Proxy nötig. Nicht jede Firma hat ein Logo bei Wikidata (Indie-Studios oft nicht). Dann die **Quelle im Dialog auf Brandfetch** umstellen: Brandfetch findet Firmen über ihre Webseite und liefert das Firmensymbol. Dafür braucht man eine **kostenlose Client-ID** aus dem [Brandfetch-Entwicklerportal](https://developers.brandfetch.com/), die in den Einstellungen eingetragen wird (nur in diesem Browser gespeichert, auch in der Einstellungsdatei sicherbar). Brandfetch liefert meist das **Symbol** der Firma, nicht den langen Schriftzug. Hilft beides nicht, bleibt das Logo als Datei.

#### Bilder von SteamGridDB

Neben jedem Bildfeld (Frontcover, Rückseite oben und unten) gibt es einen Suchknopf 🔎. Der Ablauf: Spiel suchen, Bildart wählen (Cover im Hochformat, Querformat, Hintergründe, Logos), Bild anklicken und übernehmen. Voreingestellt ist für das Frontcover ein Hochformat-Cover, für die Rückseite ein Hintergrund und für das Publisher-Logo ein Logo. Deutsche Bilder stehen zuerst. Das Bild wird danach wie jedes andere auf Druckgröße verkleinert.

### Anbieter

Der Anbieter bestimmt Farben, Logo und Schriftzug der Hülle. Bei **Epic Games und Steam** ist der Streifen mit den Spielfunktionen auf der Rückseite dunkel statt hell (Steam: Marineblau mit blauer Linie, Epic: Dunkelgrau). Das Logo steht in der Kopfleiste der Vorderseite und oben auf dem Rücken. Bei Epic Games und Steam steht der Schriftzug unter bzw. neben dem Logo. Die Logos sind weiße Vektorgrafiken (SVG, je 1 bis 3 KB, in jeder Größe scharf) aus dem Projekt [Simple Icons](https://simpleicons.org/) (Lizenz CC0). Alle Grafiken des Tools (auch die USK-Zeichen, die DVD-/CD-/Blu-ray-Logos und das GOG-Logo, jeweils nur 2 bis 6 KB) sind **SVG**, es gibt keine Rastergrafiken mehr (Voraussetzung für den Ein-Datei-Build). Sie liegen in `app/assets/images/` (`epic_logo.svg`, `steam_logo.svg`, GOG: `gog_logo.svg`).

| Anbieter | Farbe | Vorderseite und Rücken | Besonderheiten |
|---|---|---|---|
| **GOG** | sechs Varianten von hell nach dunkel (neutral, ohne Lila) | GOG-Logo (immer sichtbar) und optional "GOG.COM" | Streifen hell (Weiß) oder dunkel (Dunkel, durchscheinend), in der Leiste "PC · DRM-FREI" |
| **Epic Games** | Anthrazit | Logo und Schriftzug "EPIC GAMES" | dunkler grauer Streifen, Hinweis "Epic Games Launcher" |
| **Steam** | Marineblau | Logo und Schriftzug "STEAM" | dunkelblauer Streifen mit blauer Akzentlinie, Hinweis "Steam" |

Der Anbieter ist mit dem Spiel im Menü verknüpft (siehe [Gemeinsames Projekt](#gemeinsames-projekt)). Dieselbe Farbzuordnung nutzt das Menü ([player-und-builder.md](player-und-builder.md)).

### Bilder und Maße

Die Bilder werden beim Laden auf Druckgröße verkleinert (längste Kante höchstens 2300 Pixel, Publisher-Logo 900 Pixel) und nie vergrößert. Fotos werden als JPEG, das Publisher-Logo als PNG mit Transparenz gehalten (SVG geht auch). Das Bild füllt seine Fläche und wird bei Bedarf zugeschnitten.

| Bild | Normal (14 mm) | Slim (7 mm) |
|---|---|---|
| Frontcover | 129 × 183 mm | 129,5 × 183 mm |
| Rückseite oben (über dem Streifen) | 130 × 124 mm | 129,5 × 124 mm |
| Rückseite unten (hinter den Angaben, optional) | 130 × 46 mm | 129,5 × 46 mm |
| Publisher-Logo | etwa 2:1, transparent | |

Ohne Bild für "Rückseite unten" setzt sich das obere Bild hinter den Angaben fort. Für ein scharfes Ergebnis sollten Bilder mindestens **200 dpi** haben (Front normal: etwa 1020 × 1450 Pixel), besser 300 dpi. Unter 200 dpi zeigt das Tool "wird unscharf".

#### Was verdeckt wird

| Element | Fläche |
|---|---|
| Kopfleiste | oberste 10 mm (GOG) bzw. 18,6 mm (Steam, Epic Games) der Vorderseite und des Rückens |
| USK vorn | 35 × 35 mm, 3 mm vom linken und unteren Rand |
| Publisher-Logo vorn | bis 32 × 14 mm, 6 mm vom rechten und unteren Rand |
| Grüner Streifen und Angabenfeld | 15 mm und 46 mm am unteren Rand der Rückseite |

### Eigene Maße

Für Hüllen mit anderen Maßen (z. B. Blu-ray) gibt es "Eigene Maße": Breite der Rückseite, des Rückens und der Vorderseite sowie die Höhe in Millimetern. Die Bildmaße, das Cover und der Druck richten sich danach.

- **Erlaubt:** Rückseite und Vorderseite 100 bis 150 mm, Rücken 3 bis 30 mm, Höhe 100 bis 198 mm, insgesamt höchstens 285 mm Breite, damit Cover und Schnittmarken auf A4 quer passen. Andere Werte werden angepasst, und das Tool sagt es.
- **Vorlagen:** "Blu-ray" (269 × 148 mm, 14 mm Rücken) und "Blu-ray Slim" (262 × 148 mm, 7 mm Rücken) füllen die Felder.

**Die Vorlagen sind Richtwerte.** Die Herstellerangaben für Blu-ray-Einleger weichen voneinander ab (Gesamtbreite 262 bis 272 mm, Seitenbreite 126 bis 129 mm, Rücken 11 bis 14 mm). Miss deinen Einleger nach und trage die Werte ein.

### Stil

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

#### Frontbild einpassen und USK-Hintergrund

- **Frontbild einpassen** (Bereich "Bilder", unter dem Frontcover): **Strecken** ist der Standard, das ganze Bild füllt die Fläche, bei einem anderen Seitenverhältnis (z. B. Blu-ray-Hülle) wird es leicht gestaucht, nichts fehlt. **Zuschneiden** füllt die Fläche ohne Verzerrung: **Zoom** (100 bis 300 %) und **Ausschnitt** waagerecht und senkrecht (0 bis 100 %) bestimmen, welcher Teil zu sehen ist. Bei "Bild über den Rücken fortsetzen" bleibt es beim Zuschneiden über Rücken und Vorderseite.
- **USK-Hintergrund:** Das USK-Zeichen besteht aus der **Raute** (immer voll sichtbar) und dem **Hintergrund** dahinter (abgerundetes Quadrat mit farbigem Rand). Der Regler "Hintergrund der USK auf der Vorderseite" stellt **nur den Hintergrund** ein: 100 % wie bisher, **0 % zeigt nur die Raute** ohne den farbigen Rand. Auf der **Rückseite steht immer nur die Raute**, etwas größer (19,5 mm), weil der Rand fehlt. Die Dateien liegen als `usk_<Wert>.svg` (Raute) und `usk_<Wert>_bg.svg` (Hintergrund) in `assets/images/usk/`.

#### Farbe von "PC" am Rücken

Im Bereich "Rücken" lässt sich die Farbe des **"PC"** am Fuß des Rückens wählen: **Automatisch** (weiß auf dunklem, dunkel auf hellem Rücken), **Weiß** oder **Schwarz**. Das gilt für alle Anbieter (z. B. Schwarz, wenn der Rücken ein helles Bild zeigt).

#### Bedienung: Schaltflächen und Sprungleiste

Damit sich das Tool auch ohne Vorkenntnisse bedienen lässt, stehen **Auswahlen mit wenigen Möglichkeiten als Schaltflächen** da (z. B. Anbieter, Hülle, Disc-Medium, Sprache der Beschriftung, Frontbild einpassen, Rücken hell oder dunkel, Farbe von "PC"): Man sieht alle Möglichkeiten auf einen Blick und wählt mit einem Klick statt über eine Aufklappliste. Der **Stil** ist ein Schieberegler mit Farbvorschau. Oben im Formular stehen **Sprungknöpfe zu allen Bereichen** (Hülle und Stil, Titel und Texte, Bilder ...), sie öffnen den Bereich und springen hin.

#### Rückseite gestalten (Editor)

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
| **Formen** | **+ Form**: Kreis/Ellipse, Dreieck, Viereck, Stern und **freie Fläche**. Füllfarbe, Deckkraft, Drehung, Größe wie bei allen Elementen. Bei Dreieck, Viereck und freier Fläche zeigt die gewählte Form **orange Punkte**: Zieh sie, dann entsteht jede beliebige Form (ein schiefes Dreieck, ein verzogenes Viereck). Die Punkte **rasten** an den Rändern und der Mitte der Fläche, an anderen Elementen und an den Punkten anderer Formen ein (Alt beim Ziehen: nicht einrasten). Im Bereich **Punkte** rechts lassen sich die Werte eintippen (Prozent des Rahmens), Punkte löschen (mindestens drei) und hinzufügen. Stern (Zacken, Tiefe) und Kreis kann man mit **Als freie Fläche bearbeiten** in Punkte umwandeln. **Umriss:** Im Editor hat die gewählte Form einen **orangen Umriss** (die Linien zwischen den Punkten), alle anderen Formen einen **feinen hellen Umriss**, damit man übereinanderliegende Flächen auseinanderhält. Der Umriss erscheint nur im Editor, nicht auf dem Cover und nicht im Druck. Mit **Rand (mm)** und **Randfarbe** bekommt eine Form einen **echten Rand**, der innen an der Form liegt und auch auf Cover und Druck erscheint (0 = kein Rand) |
| **Bild in der Form** | Haken **Bild statt Farbe**, dann Datei oder Steam/GOG. Mit **Bild im Ausschnitt verschieben** (oder dem Mausrad zum Zoomen) schiebst Du das Bild innerhalb der Form. Beim Bearbeiten ist das Bild außerhalb der Form **grau und blass** zu sehen, in der Form in voller Farbe. Gedruckt und im Cover erscheint nur der Teil in der Form. Das gilt auch für Bilder mit "Füllen" (Zoom und Ausschnitt) |
| **Drehen** | Element anklicken, am **runden Griff oberhalb** ziehen (rastet bei 0°, 90°, 180°, 270° ein, mit Umschalt in 15°-Schritten) oder im Feld **Drehung (°)** eintippen. Gedrehte Elemente lassen sich weiter verschieben und skalieren |
| **Mehrere Elemente** | Mit gedrückter **Strg-** oder **Umschalttaste** anklicken fügt ein Element zur Auswahl hinzu oder nimmt es wieder heraus (**Strg+A** wählt alle). Ein **Auswahlrechteck** zieht man auf leerer Fläche auf (auch im grauen Bereich unter der Fläche beginnen geht): Jedes Element, das das Rechteck berührt, wird gewählt. Mit Strg oder Umschalt bleibt die bisherige Auswahl erhalten. Ein Klick auf leere Fläche ohne Ziehen wählt alles ab. Gewählte Elemente haben einen orangen Rahmen, dazu gibt es einen gestrichelten Gesamtrahmen mit Drehgriff. **Ziehen** (oder die Pfeiltasten) verschiebt alle gemeinsam und rastet mit dem Gesamtrahmen ein. Der **Griff oben** (oder das Feld **Alle drehen um (°)**) dreht alle um denselben Winkel, **jedes um seine eigene Mitte**. Ein Klick ohne Ziehen auf ein Element der Auswahl behält nur dieses. Rechts stehen Nach vorn, Nach hinten, Duplizieren, Löschen und Auswahl aufheben. Skalieren und die Eigenschaften gibt es nur bei einem einzelnen Element. Die Auswahl bleibt nach dem Verschieben und Drehen erhalten, Rückgängig gilt für alle gemeinsam |
| Ordnung | Nach vorn, nach hinten, Duplizieren (Strg+D), Löschen (Entf) |
| Rückgängig | Rückgängig und Wiederholen (Strg+Z, Strg+Y), bis zu 50 Schritte |
| Vorlagen | Der Knopf **Vorlagen** öffnet links eine **Leiste mit Mini-Vorschauen** (Bilder als graue Flächen, Texte als Zeilen). Vorhanden: Leer, Titel und Beschreibung, Beschreibung und Bildleiste, **Party-Stil** (Among Us), **Vier Bilder** (Age of Empires), **Spalten** (Spider-Man), **Retro** (Half-Life) und **Zersplittert** (Alyx, vier schräge Bildflächen aus freien Formen). Eine Vorlage ersetzt die vorhandenen Elemente (vorher wird gefragt), danach ist alles frei änderbar |
| **Eigene Vorlagen** | Unten in der Vorlagenleiste: **Layout als Vorlage speichern …** (Name eintippen; gibt es ihn schon, wird gefragt, ob ersetzt oder unter neuem Namen gespeichert wird) und **+ Vorlage importieren …** (eine oder mehrere JSON-Dateien). Eigene Vorlagen stehen unter **Eigene Vorlagen** mit **Löschen** und **Als Datei** (sichert diese eine Vorlage). Eine Vorlage speichert **nur das Layout**: Positionen, Formen mit Punkten, Texte, Farben, Ränder. **Bilder werden nie gespeichert**, sie bleiben Platzhalter, die man nach dem Anwenden füllt. Die Größe passt sich der Gestaltungsfläche an (Schrift mit der Breite). Eigene Vorlagen liegen im Browser (bis zu 40) und können in den Einstellungen gesichert werden |
| **Durchgehendes Bild** | Haken im Editor (und im Formular): Das Bild "Rückseite oben" geht dann über die **ganze Rückseite** und wird nur vom Streifen mit den Spielfunktionen unterbrochen, unten liegt es hinter dem weißlichen Feld. Der graue Platzhalter "Rückseite oben" wird dabei ausgeblendet, sobald ein Bild da ist (ohne Bild bleibt er sichtbar). Standard sind zwei getrennte Bilder (oben und unten). Bildmaße: die ganze Rückseite |

- **Beschreibung:** Steam und GOG übernehmen beim Import die Kurzbeschreibung in das Feld "Beschreibung des Spiels" (Bereich "Rückseite"). Ein Textelement mit Inhalt "Beschreibung des Spiels" zeigt sie an.
- **Schriften:** Die Auswahl ist gruppiert und zeigt jeden Namen **in seiner eigenen Schrift**. **Systemschriften** (Normal/Lato, Serif, Schmal, Plakat, Schreibmaschine, Handschrift) kommen vom Betriebssystem und sehen auf anderen Rechnern etwas anders aus (nur Lato liegt bei). **Spiele-Schriften** liegen als Dateien bei und sehen überall gleich aus: Press Start 2P, Silkscreen, VT323 (Pixel/Retro), Orbitron, Audiowide, Rajdhani, Russo One (Sci-Fi und Technik), Black Ops One, Bebas Neue, Bungee (Plakat), Bangers, Permanent Marker (Comic und Handschrift), Special Elite (Schreibmaschine), Cinzel, MedievalSharp, Pirata One, Uncial Antiqua (Fantasy und Mittelalter) und Creepster (Horror). Alle enthalten deutsche Umlaute und ß (Orbitron ohne „ « »), sie stehen unter freien Lizenzen (SIL OFL 1.1 oder Apache 2.0), die Texte stehen in `app/assets/fonts/games/LIZENZEN.txt`. Sie werden erst geladen, wenn man sie benutzt. **Eigene Schriften** (`.woff2`, `.woff`, `.ttf`, `.otf`, höchstens 1,5 MB, bis zu 12) fügst Du im Textfeld des Editors mit **Eigene Schrift hinzufügen …** hinzu (mehrere Dateien auf einmal sind möglich, die zuletzt hinzugefügte gilt für den Text). Sie werden im Browser gespeichert (IndexedDB) und stehen in der Gruppe **Eigene Schriften**. **Löschen:** Im Editor mit **Diese eigene Schrift löschen** (wenn sie gewählt ist) oder in den Einstellungen unter **Eigene Schriften**. Texte, die sie benutzten, fallen danach auf "Normal" zurück. Fehlt eine eigene Schrift (anderer Rechner, anderer Browser), zeichnet das Tool ebenfalls mit "Normal", bis sie dort über die Einstellungsdatei eingelesen wurde. Beachte die Lizenz jeder eigenen Schrift. Die Papierkante ("Ausgerissen") sieht bei jedem Zeichnen gleich aus. Hinweis: Safari auf dem Mac zeigt Einträge im Dropdown ohne eigene Schrift (der Browser erlaubt dort keine Schrift in der Liste), die gewählte Schrift wird trotzdem benutzt.
- **Gespeichert** wird alles mit dem Projekt (Einstellungen, Elemente, Bilder, ZIP). Eigene Schriften, die ein Text im Projekt benutzt, liegen in der ZIP im Ordner `fonts/` (unbenutzte nicht). Beim **Öffnen** werden sie hinzugefügt, wenn es dieselbe Schriftdatei hier noch nicht gibt (gleicher Name, andere Datei: der Name bekommt " (2)"), sonst wird die vorhandene benutzt. Ist das Limit von 12 eigenen Schriften erreicht, steht ein Hinweis da und die Texte erscheinen in "Normal". Alte Projekte ohne Schriften öffnen sich wie bisher. Bilder der Gestaltungsfläche heißen `d1`, `d2` und so weiter und werden beim Schließen des Editors entfernt, wenn kein Element sie mehr braucht.
- **Zu hoch:** Sind die festen Teile zusammen so hoch wie die Rückseite, steht ein Hinweis da. Dann die Höhen verkleinern.

#### Längen in Millimetern und negative Abstände

Alle Felder, in denen man eine Länge in **Millimetern** eingibt (eigene Hüllenmaße, Abstände und Breite von Rückenlogo und Publisher-Logo am Rücken), sind Zahlenfelder: Mit **Pfeil nach oben und unten** (oder den kleinen Pfeilen im Feld) geht der Wert in **0,25-mm-Schritten**. Bei den **Abständen am Rücken** (zur Seite, zum Kopf oben, zum Fuß unten) sind auch **negative Zahlen** erlaubt: Das Logo wird dann größer und ragt über seinen Rahmen hinaus. Das hilft bei Logos mit viel leerem Rand ums Bild. Zur Seite hin wird alles am Rand des Rückens abgeschnitten, damit nichts auf Vorder- oder Rückseite zu sehen ist. Nach oben und unten darf das Logo über sein Feld hinaus in den Bereich von Leiste und "PC" ragen. Das kann dort etwas überdecken, bitte im Ausdruck prüfen.

### Feste Plätze auf der Rückseite

Die Rückseite hat feste Plätze: links die **Angaben** (am linken Rand, so breit wie möglich), rechts eine **schmale Spalte** mit **Publisher-Logo, Disc-Logo und USK** übereinander, unten in der Mitte das **Copyright**. Schaltet man die USK auf der Rückseite aus, **bleibt der Platz frei** und nichts rutscht. Die Angaben beginnen immer an derselben Stelle, fehlt eine Zeile, bleibt unten Platz. Das prüft ein automatischer Test.

### Rücken-Logo, Rückenbild und Publisher

- **Logo für den Rücken:** Im Bereich "Bilder" lässt sich ein Spiel-Logo laden (🔎 sucht bei SteamGridDB nach Logos). Es steht dann **statt des Titels**, um 90° gedreht und so groß wie der Rücken es zulässt. Mit dem Haken "Statt des Titels das Rückenlogo zeigen" lässt sich zum Titel zurückschalten. Breite Logos stehen gedreht (Ausrichtung einstellbar). Das Seitenverhältnis bleibt immer erhalten. Einstellbar sind die **Abstände in mm zu den Seiten, zum Kopf (oben) und zum Fuß (unten)**. Ist das Logo kürzer als der Platz, steht es oben bündig oder mittig zwischen den Abständen (je nach Einstellung "Titel auf dem Rücken" oben/mittig). Der **Steam-Import** lädt das Logo auf Wunsch mit (Haken im Dialog, von der Steam-Adresse `…/apps/<ID>/logo.png`). Hat Steam dort keins, steht ein Hinweis da und der Rücken zeigt den Titel.
- **Eigenes Rückenbild:** Im Bereich "Rücken" lässt sich ein eigenes Bild für den Rückenhintergrund laden (🔎 sucht bei SteamGridDB, am besten unter "Hintergründe"). Es füllt den Rücken zugeschnitten. Mit **"Ausschnitt"** (links ↔ rechts in %) wählst du die Stelle, mit **"Abdunkeln"** die Lesbarkeit für Titel und Logo. So bleibt das Frontbild unverändert, auch wenn es einen Schriftzug in der Mitte hat.
- **Bild über den Rücken fortsetzen:** Unter "Hintergrund des Rückens" lässt sich statt der Anbieterfarbe das **Frontbild über den Rücken weiterführen**, wie bei Hüllen mit durchgehendem Motiv. Der Rücken wird dafür etwas abgedunkelt, damit Titel und Logo lesbar bleiben. Bei der Leiste beginnt das Bild unter der Kopfleiste.
- **Publisher-Logo am Fuß:** Ist ein Publisher-Logo geladen, steht es am Fuß des Rückens auf einer weißen Kachel, **"PC" bleibt immer ganz unten an derselben Stelle, das Logo steht darüber**. Der Platz richtet sich nach dem Rücken, nicht nach dem Logo: Ein zu breites Logo macht den Rücken **nie** breiter. Zu breite Logos (aufrecht kleiner als etwa 4 mm hoch) werden **automatisch um 90° gedreht**. Einstellbar sind die **Ausrichtung** (Automatisch, Aufrecht, Gedreht), der **Abstand zur Seite** in mm und eine eigene **Breite** in mm (leer = automatisch; bei gedrehtem Logo ist es die Länge entlang des Rückens). Abschaltbar ("Publisher-Logo am Fuß des Rückens").
- **Hintergrund transparent machen:** Der Knopf ◧ am Publisher-Logo und am Rückenlogo macht einen einfarbigen Hintergrund (z. B. Weiß bei Logos von Brandfetch) transparent. Er arbeitet vom Rand aus und blendet die Kante weich über. Im Publisher-Dialog geschieht das automatisch (abschaltbar). Bei Farbverläufen oder mehrfarbigen Ecken meldet das Tool, dass nichts erkannt wurde.

### Rücken

- Das **GOG-Logo** steht oben, entweder in fester Größe (7 mm, Slim 5,5 mm) oder in Rückenbreite.
- Am Fuß steht **"PC"** (abschaltbar). 
- Der **Titel** steht oben unter dem Logo oder **mittig** (Auswahl "Titel auf dem Rücken").
- Der **Titel** steht senkrecht in normaler Schreibweise. Er wird so groß wie möglich (bis 12 pt, Slim bis 8 pt) und verkleinert sich bei langen Titeln selbst, höchstens bis 5 pt.

### Drucken

1. Auf **Drucken** klicken.
2. Im Druckdialog: Papier **A4**, Ausrichtung **quer**, Skalierung **100 %** (nicht "Anpassen"), Ränder **Keine**, **Hintergrundgrafiken** einschalten.
3. Ausdrucken und an den **Schnittmarken** ausschneiden. Die **Falzmarken** (kurze gestrichelte Striche oben und unten außerhalb des Covers, auf Höhe der Rückenkanten; standardmäßig eingeschaltet, auch im Druck) helfen beim Falten.

Rücken und Vorderseite überlappen um 0,6 mm, damit beim Drucken keine helle Naht zwischen ihnen entsteht. Flächen ohne Bild bleiben im Druck weiß. Ein Test misst die Naht in der Vorschau bei mehreren Maßstäben.

Das Cover wird in Originalgröße (273 × 183 mm, Slim 266 × 183 mm) mittig auf das Blatt gesetzt. Die Schnittmarken liegen 2 bis 6 mm außerhalb des Covers und passen dadurch auf das Blatt. Ein Test stellt sicher, dass der Druck genau eine A4-Seite quer ergibt.

**Tipp:** Miss nach dem ersten Ausdruck die Breite nach (273 mm). Weicht sie ab, steht im Druckdialog meist noch "Anpassen" statt 100 %.

### Symbole

Die Symbole der Spielfunktionen stammen aus [Lucide](https://lucide.dev/) (ISC-Lizenz, Datei `assets/images/features/line/LICENSE-lucide.txt`) und sind kleine schwarze SVG-Dateien (unter 1 KB), also in jeder Größe scharf. Das VR-Symbol ist selbst gezeichnet. Die früheren GOG-Original-Symbole (PNG) und die Bestenlisten gibt es nicht mehr.

### Zur Vorgängerversion der Hülle

Aufgeräumt wurde der Code der früheren Einzeldatei (v3.10.3). Behoben sind unter anderem:

- **Schnittmarken** erschienen nie (falscher CSS-Selektor) und saßen im Druck an der falschen Stelle. Jetzt liegen sie am Cover und werden bei jedem Test im Druck geprüft.
- **Blu-ray-Logo** wurde nicht geladen (Dateiname `blu_ray.svg` statt `blu-ray.svg`).
- **Leistung:** Die USK-Bilder hatten 5625 × 5625 Pixel (je rund 120 MB im Speicher) und sind jetzt 700 × 700. Hochgeladene Bilder werden auf Druckgröße verkleinert und nicht mehr als riesiger Base64-Text gehalten. Die Weichzeichnung (`backdrop-filter`) ist entfernt.
- **Schrift:** Lato lag im Archiv, wurde aber nie geladen.
- **Rücken:** Der Titel steht in normaler Schreibweise (wie bei den GOG-Vorlagen) und verkleinert sich bei langen Titeln von selbst.
- **Verschieben der Rückseite:** Ausgeblendete Elemente gaben ihren Platz im Layout frei und ließen andere rutschen. Jetzt hat die Rückseite feste Plätze.
- Hinzugekommen: Live-Vorschau statt Formular-Abschicken, Zeile "Sonstiges", Beschriftungen auf Deutsch oder Englisch, Windows XP und Vista, macOS und Linux, eigener Text für Prozessor und Grafikkarte, Bestenlisten-Symbol, Hinweis zur Bildschärfe, zweiter Stil "Modern".

## Einstellungen und Dienste

Über **Einstellungen** in der oberen Leiste. Für SteamGridDB braucht man einen **API-Schlüssel**, und für beide Dienste fast immer einen eigenen **Proxy** (Cloudflare Worker), weil sie Anfragen aus dem Browser sonst blockieren. Die Einrichtung ist in [steamgriddb.md](steamgriddb.md) beschrieben und gilt für beide Web-Apps: Menü und Hülle nutzen **denselben Dialog und dieselben Werte**. Der Schlüssel liegt nur in deinem Browser und wird im Dialog nicht im Klartext angezeigt.

- **Speichern, Löschen:** Die Proxy-Adresse muss den Platzhalter `{url}` enthalten.
- **Verbindung testen:** Prüft den Proxy-Worker und jeden Dienst einzeln (siehe [Daten und Bilder von GOG](#daten-und-bilder-von-gog)) und zeigt bei jedem, ob er erreichbar ist und woran es liegt (z. B. "Der Worker-Code ist veraltet" oder "Kein Proxy eingetragen").
- **In Datei sichern / Aus Datei einlesen:** Beim Sichern erscheint ein **Auswahlfenster mit Häkchen**: **Zugangsdaten** (Schlüssel, Proxy, Brandfetch), **eigene Vorlagen** und **eigene Schriften**, auch einzelne Einträge. Eingebaute Vorlagen und Schriften sind nie dabei, nur Selbsthinzugefügtes. Die Datei heißt `discmenu-einstellungen.json` (mit Zugangsdaten) oder `discsleeve-vorlagen-schriften.json`, **mit oder ohne Passwort** (verschlüsselt mit AES-GCM; das Passwort wählst Du im Auswahlfenster, zum Einlesen trägst Du es im Feld "Passwort" der Einstellungen ein). Beim Einlesen zeigt eine **Vorschau**, was in der Datei steht. **Verändert wird nur, was in der Datei steht**: Eine Datei nur mit Vorlagen lässt die Zugangsdaten in Ruhe und umgekehrt, so lassen sich mehrere Dateien nacheinander einlesen. Hat ein Zugangsdatum schon einen anderen Wert, bleibt er, bis Du **Vorhandene Werte überschreiben** wählst. Gleichnamige Vorlagen und Schriften lassen sich **beide behalten** (der neue Name bekommt eine Zahl) oder **ersetzen**. Leere Felder in der Datei löschen nie etwas. Ein vergessenes Passwort lässt sich nicht wiederherstellen. Ältere Einstellungsdateien des früheren Konfigurators lassen sich ebenfalls einlesen. Die Datei enthält deinen Schlüssel, also nicht weitergeben und nicht ins Repository legen.

> **Stand der Prüfung:** Die Abläufe sind mit nachgebauten Antworten von Steam und SteamGridDB getestet. Mit den echten Diensten wurde noch nicht geprüft, siehe [manuelle-pruefung.md](manuelle-pruefung.md).

**Verbindung testen** prüft zuerst den **Proxy-Worker** (Version und erlaubte Hosts, siehe [Proxy einrichten](steamgriddb.md)) und dann jeden Dienst einzeln: Steam-Shop, SteamGridDB, GOG-Katalog, GOG-Spieldaten, GOG-Bilder, Epic Games Store, Übersetzung (MyMemory), Wikidata und Brandfetch. Bei Fehlern nennt die Zeile oben, wie viele und welche Dienste nicht funktionieren. SteamGridDB-Suche, Beschreibungen und Übersetzung: [steamgriddb.md](steamgriddb.md).

## Sprache

Oben in der Leiste steht ein **Sprachmenü mit Flagge** (Deutsch, English). Es stellt die **ganze Benutzeroberfläche** beider Bereiche um: Beschriftungen, Hinweise, Dialoge, Fehlermeldungen und Rückfragen. Ausnahme ist die nachgebaute Player-Ansicht in der Vorschau des Disc-Menüs: Sie bleibt deutsch, weil der Player deutsch ist. Die Wahl wird im Browser gemerkt (oder mit `?lang=en` in der Adresse gesetzt).

- Bei **Deutsch** gibt es das Feld "Sprache der Beschriftung" (Deutsch oder English): Das ist die Sprache der Texte **auf dem Cover**.
- Bei **English** entfällt dieses Feld, das Cover wird englisch beschriftet.
- Das **Cover selbst** wird nie von der Oberfläche übersetzt, es folgt allein der Beschriftungssprache.

**Weitere Sprachen:** Deutsch ist die Grundsprache, im HTML und im Code stehen die deutschen Texte. Eine Sprache ist ein **Sprachpaket** (`lang-en.js`), das den deutschen Text auf die Zielsprache abbildet. Für eine neue Sprache legt man `lang-xx.js` an (`I18n.register('xx', { name, flag, dict, parts, rules })`), bindet sie in `index.html` ein und legt eine Flagge in `assets/images/flags/` ab. Das Menü zeigt sie dann automatisch an. `dict` enthält ganze Texte, `parts` Bruchstücke zusammengesetzter Meldungen ("... hat mit Fehler 500 geantwortet.") und `rules` Muster mit Zahlen. Ein Test (`tests/i18n.test.js`) prüft, dass jeder deutsche Text im HTML übersetzt ist und keine Schlüssel Tippfehler enthalten, ein Browsertest (`tests/ui/cover-i18n.check.js`) sucht in Oberfläche und Dialogen nach deutschen Resten.

## Aufbau der Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Die Seite: Leiste, Bereich Disc-Menü (`#viewMenu`), Bereich Cover & Hülle (`#viewCover`), Dialog |
| `shell.js` | Umschalten zwischen den Bereichen ohne Neuladen (`body[data-view]`, Adresse `#menue` / `#huelle`) |
| `project.js` | Gemeinsames Projekt ohne Oberfläche: Projektdatei (`recipe.json`) packen und lesen, ältere Dateien, verknüpfte Felder, Spielordner auswerten. Ohne Browser testbar |
| `menu.js`, `menu-core.js`, `menu.css` | Bereich Disc-Menü: Oberfläche, Kern (Rezept, ZIP, Prüfung, ohne Browser testbar), Stile (gelten nur in `#viewMenu`) |
| `core.js` | Hülle: Maße, Beschriftungen, Texte für die Systemanforderungen, Standardwerte, Prüfung aller gespeicherten Werte. Ohne Browser testbar |
| `app.js` | Hülle: Eingaben, Bilder, Zeichnen der Vorschau, Drucken |
| `back-design.js`, `back-editor.js` | Rückseite: Zeichnen der Elemente, Editor |
| `extras.js` | Gemeinsames Projekt (Speichern, Öffnen, Browser-Speicher, Verknüpfung), Dialoge: Steam, GOG, SteamGridDB, Einstellungen, recipe.json bearbeiten |
| `online.js` | Anfragen an Steam, GOG, SteamGridDB, Wikidata, Brandfetch (über den Proxy), Verbindungstest |
| `files.js`, `zip.js` | Einstellungsdatei (mit Passwort), ZIP schreiben und lesen, Dateien der Hülle |
| `i18n.js`, `lang-en.js` | Sprache der Oberfläche: Umschalten, Sprachpaket Englisch |
| `style.css` | Leiste und Hülle (alle Maße in Millimetern), Druckregeln. Gilt nie in `#viewMenu` (`:where(:not(#viewMenu, #viewMenu *))` an jeder Regel) |
| `assets/` | Schriften (Lato, 18 Spiele-Schriften), Logos, USK-, Disc-, Funktionssymbole, Flaggen (alles SVG) |

Reihenfolge der Skripte in `index.html`: `i18n`, `lang-en`, `core`, `zip`, `online`, `files`, `back-design`, `app`, `back-editor`, `menu-core`, `menu`, `project`, `extras`, `shell`.

## Entwicklung

GitHub Pages liefert Dateien bis zu 10 Minuten zwischengespeichert. Damit nach einer Aktualisierung nicht alte und neue Dateien gemischt werden, hängt der Build an alle Dateien `?v=<Version>`. Oben in der Leiste steht "Version …" (lokal: "lokal"). Sehen Menüs oder Dialoge ungestylt oder alt aus, die Seite mit Strg+F5 neu laden.

### Vorschau für Pull Requests

Jeder Pull Request aus diesem Repository bekommt eine **eigene Testseite**, damit man Änderungen (auch auf dem Tablet) vor dem Mergen ausprobieren kann:

- Disc-Menü: `https://einmensch002.github.io/DiscMenu-Builder/pr/<Nummer>/#menue`
- Cover & Hülle: `https://einmensch002.github.io/DiscMenu-Builder/pr/<Nummer>/#huelle`

Der Link steht als Kommentar im Pull Request. Die Seite erscheint ein bis zwei Minuten nach jedem Push (Stand `main` plus Änderung des Pull Requests) und wird **gelöscht, sobald der Pull Request geschlossen oder gemergt wird**. Technik: `.github/workflows/preview.yml` legt die Dateien im Zweig `gh-pages` unter `pr/<Nummer>/` ab (nur Pull Requests aus diesem Repository), `pages.yml` veröffentlicht sie zusammen mit `main`. Der Zweig `gh-pages` ist nur Zwischenspeicher, Pages selbst bleibt auf "GitHub Actions" eingestellt. Hinweis: Der lokale Speicher des Browsers (Schlüssel, Vorlagen, Schriften) gilt pro Domain, die Vorschau teilt ihn sich also mit der Hauptseite.

### Ein-Datei-Build

Geplant (siehe Roadmap in der [README](../README.md)): Ein Skript fasst den Ordner `app/` zu einer einzigen HTML-Datei zusammen (CSS, JavaScript, Bilder und Schriften eingebettet).

## Tests

Automatische Tests: `npm install`, dann `npm test` (Logik, schnell, auch in der CI über `.github/workflows/tests.yml`) und `npm run test:ui` (Browser-Tests mit Playwright, nur lokal). Die CI prüft außerdem das Lesen der Projektdatei im Go-Teil des Builders (`go test ./src/Shared/`).

- **Logik:** `tests/app-project.test.js` (Projektdatei, ältere Dateien, Verknüpfung, Spielordner), `tests/core.test.js` (Kern des Disc-Menüs: ZIP, Prüfung, Suche, Disc-Prüfung), `tests/schema.test.js` (Beispiel und Export gegen `schema/menu.schema.json`), `tests/cover.test.js` (Maße der Hülle), `tests/cover-online.test.js` (Steam, GOG, Proxy), `tests/cover-files.test.js` (Einstellungsdateien, Verbindungstest), `tests/i18n.test.js` (jeder deutsche Text der Seite übersetzt, keine toten Einträge), `tests/cover-site.test.js` (Versionsnummern, Pages-Workflow), `tests/worker.test.js` (Proxy).
- **Browser:** `app.check.js` (gemeinsame Seite: Umschalten, Leiste, Verknüpfung, Speichern, Öffnen, ältere Dateien, Spielordner, Englisch, Druck), `ui.check.js` (Disc-Menü: recipe.json bearbeiten, Vorschau mit Simulation, Disc-Prüfung), `cover.check.js`, `cover-online.check.js`, `cover-spine.check.js`, `cover-gog.check.js`, `cover-back.check.js`, `cover-font-project.check.js`, `cover-i18n.check.js`, `cover-save.check.js` (Speichern mit Dateiauswahl, scheitert auf manchen Windows-Rechnern am Dialog "Speichern unter").

Nicht automatisch geprüft sind ein echter Ausdruck, die echten Dienste und die Dateiauswahl mit Überschreiben. Dafür gibt es eine Prüfliste: [manuelle-pruefung.md](manuelle-pruefung.md).

## Grenzen

- Ohne Ordnerzugriff (Firefox, Safari, Android) gibt es weder "Disc-Ordner prüfen" noch "Spielordner einlesen", die Pfade werden von Hand eingetragen.
- Für das Umwandeln der Bilder braucht der Browser `createImageBitmap` und Canvas (alle aktuellen Browser).
- Ist der Speicher des Browsers gesperrt oder voll (z. B. privates Fenster), steht ein Hinweis in der Leiste. Dann bleibt das Speichern als Datei.
- Fest eingebaut sind zwei Hüllenformate (Normal 14 mm, Slim 7 mm). Andere Maße gehen über "Eigene Maße", die Blu-ray-Werte sind nur Richtwerte.
- Die Dienste (Steam, GOG, SteamGridDB, Epic, MyMemory) sind mit nachgebauten Antworten getestet, nicht mit den echten.
- Kein eigener PDF-Export: Gedruckt wird über den Browser (dort lässt sich als PDF speichern).
- Die Maße sind noch nicht mit einem echten Ausdruck und einer echten Hülle geprüft.

Was geplant ist, steht in der Roadmap in der [README](../README.md).

## Hinweise

- GOG, Epic Games, Steam (Namen und Logos) und die USK-Symbole sind Marken ihrer Inhaber. Das Tool ist für den privaten Druck eigener Hüllen gedacht.
- Die Schrift Lato steht unter der SIL Open Font License (siehe `app/assets/fonts/README.txt`).
