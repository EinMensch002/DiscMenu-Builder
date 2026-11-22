# Konfigurator

Eine Web-App, in der man das Menü per Maske zusammenstellt, statt die `menu.json` von Hand zu schreiben. Das Ergebnis ist eine ZIP-Datei im Format "Rezept-Paket" (siehe [menu-json-spec.md](menu-json-spec.md)), die der Builder direkt verarbeiten kann.

**Online:** https://einmensch002.github.io/DiscMenu-Builder/ (Bereich **Menü** der gemeinsamen Seite, oben links umschalten)
**Dateien:** [app/](../app/): `menu.js` (Oberfläche), `menu-core.js` (Kern ohne Oberfläche, auch in den Tests), `menu.css` (Stile, gelten nur im Bereich Menü). Zum lokalen Benutzen den Ordner `app/` herunterladen und `index.html` im Browser öffnen, dann geht es auch ohne Internet.

## Prinzip

- **Läuft komplett im Browser.** Kein Backend, nichts wird hochgeladen. Bilder, Sounds und die ZIP werden lokal verarbeitet.
- **Keine Abhängigkeiten.** Keine externen Bibliotheken. ZIP schreiben und lesen sind selbst eingebaut.
- Der Konfigurator erzeugt nur das Rezept. Die Menü-EXE macht der Builder.
- Die Veröffentlichung auf GitHub Pages läuft automatisch über `.github/workflows/pages.yml`, sobald sich etwas im Ordner `app/` ändert. Menü und [Hülle](disc-sleeve.md) sind eine gemeinsame Seite in der Wurzel. Oben in der Leiste wechselt man zwischen beiden, ohne dass die Seite neu lädt (`shell.js`). Die Adresse merkt sich den Bereich (`#menue`, `#huelle`). Beide Bereiche haben dasselbe helle Design und dieselbe Leiste, siehe [Gemeinsames Projekt](#gemeinsames-projekt-menü-und-hülle).

## Bedienung

Links die Liste der Spiele, rechts das Formular zum gewählten Eintrag, ganz rechts die Prüfung. Die `menu.json` öffnet sich unter **Sonstiges** in der Leiste. Auf dem Handy stehen die Bereiche untereinander.

- **Disc-Einstellungen:** Titel, EXE-Name, Hintergrundbild, Klick- und Hover-Sound.
- **Spiele:** hinzufügen, löschen, mit den Pfeilen sortieren. Der `index` ergibt sich aus der Reihenfolge (0, 1, 2 ...).
- **Pro Spiel:** Name, Quelle (GOG, Epic Games oder Steam, mit Abzeichen in Liste und Vorschau), Cover, Beschreibung, Installer-Pfad, Parameter, geschätzte Größe.
- **Bereiche DLCs, Patches, Extras:** Einträge mit Name, Gruppe (Unterkategorie, mit Vorschlägen), Beschreibung, Bild und Aktion ("Installer starten" oder "Datei, Ordner oder Link öffnen"). Einträge lassen sich sortieren und entfernen.
- **Hilfe-Links:** In den Dialogen für SteamGridDB, Proxy und Beschreibungen führen Links zu den passenden Abschnitten dieser Anleitung, zu SteamGridDB (API-Schlüssel) und zu Cloudflare (Proxy). Fehlermeldungen zu CORS oder zum Proxy enthalten einen Link zur Anleitung.
- **SteamGridDB:** Spiele und Bilder lassen sich bei SteamGridDB suchen. Schlüssel und Proxy stehen im gemeinsamen Dialog **Einstellungen** und lassen sich in einer (optional verschlüsselten) Datei sichern und wieder einlesen. Siehe [steamgriddb.md](steamgriddb.md).
- **Beschreibungen:** Der Knopf "Beschreibung suchen" holt Texte aus dem Steam-Shop, von GOG und aus dem Epic Games Store und kann englische Texte übersetzen. Siehe [steamgriddb.md](steamgriddb.md).
- **Bilder** per Drag-and-drop, Antippen oder über die SteamGridDB-Suche. Beim Hinzufügen werden sie verkleinert und umgewandelt: Cover auf höchstens 800 Pixel als PNG, Hintergrund auf höchstens 1920 Pixel als JPEG. Das hält die Menü-EXE klein. Diese Werte sind vorläufig.
- **Sounds:** WAV, OGG oder MP3, unverändert übernommen.
- **JSON:** **Sonstiges → menu.json bearbeiten …** öffnet die `menu.json` zum direkten Bearbeiten. "Änderungen übernehmen" liest sie zurück in die Maske. Bilder und Sounds bleiben über ihre Pfade (`assets/...`) verbunden, neue Dateien lassen sich nur in der Maske hinzufügen. Felder, die das Format nicht kennt, werden verworfen und gemeldet. Ungültiges JSON bleibt im Dialog stehen und wird nicht übernommen.
- **Vorschau und Simulation:** Der Knopf "Vorschau" zeigt das Menü im Stil klassischer Windows-Installer: ein Fenster mit Titelleiste auf dem Hintergrundbild, **links Bild und Beschreibung, rechts die Knöpfe** mit Symbol und Trennlinien (Installieren, DLCs, Patches, Extras, Beenden). Fährt man mit der Maus über ein Spiel oder einen Eintrag, zeigt die linke Seite dessen Bild und Beschreibung. **Hat ein Eintrag (z. B. ein DLC) ein eigenes Bild, wird dieses gezeigt, sonst das Bild des Spiels.** Das Abzeichen und die Akzentfarbe richten sich nach dem Anbieter. Man kann klicken, in die Bereiche wechseln und "Stille Installation" mit Zielordner (unten im Fenster) einschalten. "Installieren" startet eine **Simulation**, installiert wird nichts:
  - **Still:** Das Menü zeigt "Installation läuft" mit Fortschrittsbalken und danach das Ergebnis.
  - **Normal:** Es erscheint ein nachgebautes Installer-Fenster (Weiter, Installieren, Fertigstellen, Abbrechen), das Menü wartet wie im Player.
  - **Ergebnis wählbar:** Erfolg, Fehler mit Code 1 (Platte voll, mit Protokollauszug) oder Code 5 (Administratorrechte fehlen). Das Tempo lässt sich ändern.
  - Unter der Vorschau steht der **Ablauf** mit der Kommandozeile, mit der der Player den Installer starten würde (z. B. `/VERYSILENT ... /DIR="..."`). Die Befehlszeilen sind durch einen Test mit dem Go-Player abgeglichen.
  - Grenzen: Die Schrift ist die des Systems (der Player nutzt Go Regular), und das Installer-Fenster ist ein allgemeiner Nachbau, kein echter GOG-Installer. Zielordner-Dialog ("Durchsuchen ...") und "Beenden" werden nur simuliert.
- **Disc-Ordner prüfen:** Im Bereich "Prüfung" gibt es (nur in Chrome und Edge am Computer) den Knopf "Disc-Ordner prüfen". Man wählt den Ordner, der so aufgebaut ist wie die fertige Disc, und der Konfigurator meldet, welche Installer- und Extra-Pfade fehlen oder auf einen Ordner statt einer Datei zeigen. Die Groß-/Kleinschreibung wird dabei nicht beachtet. Es wird nur gelesen, nichts verändert oder hochgeladen. Links (`https://`) werden nicht geprüft.
- **Prüfung** nach den Regeln der Spezifikation. Gespeichert werden kann jederzeit, der Builder lehnt ein Rezept mit Fehlern aber ab.

## Gemeinsames Projekt (Menü und Hülle)

Menü und [Hülle](disc-sleeve.md) sind **ein Projekt** mit einem Speicher und einer Datei. Die Leiste oben ist in beiden Bereichen gleich: links der Umschalter **Disc-Menü | Cover & Hülle** und die Knöpfe, die nur zu einem Bereich gehören (**Vorschau** im Menü, **Drucken** bei der Hülle), rechts alles, was für das ganze Projekt gilt:

| Leiste | Inhalt |
|---|---|
| **Projekt** | **Öffnen …** (Projektdatei, auch ältere Dateien: Rezept als ZIP oder `menu.json`, Hüllen-Datei, einzelne `recipe.json`), **Speichern** (Strg+S, in beiden Bereichen), **Speichern unter …**, **Im Browser speichern**, **Neues Projekt** (leert Menü und Hülle) |
| **Daten übernehmen** | Spiel über SteamGridDB hinzufügen, **Spielordner einlesen** (siehe unten), Anforderungen von Steam, Daten von GOG |
| **Sonstiges** | **`recipe.json` bearbeiten** mit den Reitern **Alles**, **Gemeinsam**, **Menü** und **Hülle** (vorausgewählt ist der Bereich, in dem man gerade ist), Disc-Ordner prüfen (Chrome, Edge) |
| **Einstellungen** | ein Dialog für beide Bereiche: SteamGridDB-Schlüssel, Proxy, Brandfetch, Verbindungstest (alle Dienste beider Bereiche), eigene Schriften, Sichern und Einlesen |
| **Sprache** | Deutsch oder Englisch (der Bereich "Menü" ist noch nicht übersetzt) |

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

### Spielordner einlesen

**Daten übernehmen → Spielordner einlesen …** (oder der Knopf in der Prüfung rechts, nur Chrome und Edge am Computer): Man wählt den Ordner, der wie die Disc aufgebaut ist, z. B.:

```
DISK 1/
├─ base_game/              Installer des Spiels (setup_….exe, die .bin-Teile gehören dazu)
├─ Story_Erweiterungen/    DLCs, jeder Unterordner ein Eintrag
├─ Patches_und_Fixes/      Patches, Gruppe "Patches & Fixes"
├─ Hauptspiel_Overhauls/   Patches, Gruppe "Hauptspiel Overhauls"
└─ extras/                 Extras (jede Datei und jeder Unterordner wird geöffnet)
```

Der Browser fragt, ob die Seite den Ordner lesen darf. Gelesen werden nur die Namen, nichts wird hochgeladen. Die Seite schlägt nach den Ordnernamen vor, was Installer, DLC, Patch oder Extra ist (die Namen müssen nicht genau so heißen: `dlc`, `erweiterung`, `expansion`, `patch`, `fix`, `mod`, `overhaul`, `extra`, `bonus`, `soundtrack`, `handbuch` … werden erkannt). Der Vorschlag erscheint als Tabelle: **Art, Name und Gruppe lassen sich je Zeile ändern**, "nicht übernehmen" lässt eine Zeile weg. Erst "Übernehmen" trägt die Einträge beim gewählten Spiel ein (Pfade ab dem gewählten Ordner = Wurzel der Disc). Vorhandene Einträge bleiben, gleiche Pfade werden nicht doppelt eingetragen. **Namen** werden gesäubert (ohne Endung, Versionsnummern, Datum, "setup"/"installer" und ohne den Spielnamen vorn, z. B. "deus_ex_soundtrack" → "Soundtrack", "DXCU.3.4.1.2024-11-29.039.exe" → "DXCU"). **Extras** bekommen eine Gruppe nach Name und Inhalt: **Anleitungen** (Handbuch, Referenzkarte, Guide), **Musik** (Soundtrack, Audiodateien), **Artwork** (Wallpaper, Artbook, Bilder), **Videos** und **Zusätze** (alles andere, z. B. Zeitung, Erfolgsliste), in dieser Reihenfolge sortiert. Regeln: `project.js` `planFromFolder` und `cleanName`.

Wie die Datei gespeichert wird, hängt vom Browser ab:

| Browser | Verhalten |
|---|---|
| Chrome, Edge am Computer | Das erste "Speichern" fragt nach dem Ort, danach überschreibt "Speichern" dieselbe Datei. Eine über "Öffnen …" gewählte Projektdatei wird direkt überschrieben. |
| Chrome auf Android, Firefox, Safari | Der Browser lässt Webseiten keine vorhandenen Dateien überschreiben. Jedes Speichern wird neu heruntergeladen (z. B. `name(1).zip`). Bis dahin bleibt alles im Browser gesichert. |

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
