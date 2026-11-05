# Installer-Integration

Das Menü startet die originalen GOG-Installer und wertet das Ergebnis aus. Es dekompiliert oder entpackt nichts.

## Zwei Modi

Der Nutzer wählt im Menü pro Installation:

| Modus | Verhalten |
|---|---|
| **Normal** (Silent Install = nein) | Der Original-Installer öffnet sich in seinem eigenen Fenster. Das Menü wartet, bis er beendet ist. |
| **Silent** (Silent Install = ja) | Der Zielpfad wird im Menü eingegeben. Der Installer läuft ohne eigene Oberfläche, das Menü zeigt den Status. |

Beide Modi werden von Anfang an eingebaut. Wie gut Silent bei allen Installern funktioniert, ist an echten Installern zu testen.

## Silent-Parameter (Inno Setup)

GOG-Windows-Installer sind in der Regel Inno-Setup-Installer. Relevante Parameter:

| Parameter | Wirkung |
|---|---|
| `/VERYSILENT` | Keine Oberfläche |
| `/SILENT` | Nur Fortschrittsfenster, keine Fragen |
| `/DIR="Pfad"` | Zielordner |
| `/NORESTART` | Kein automatischer Neustart |
| `/SUPPRESSMSGBOXES` | Unterdrückt Meldungsfenster |
| `/LOG="Datei"` | Schreibt ein Installationsprotokoll |

Zusätzliche Parameter pro Eintrag stehen im Feld `args` der `menu.json`. Nicht jeder ältere GOG-Installer ist ein Inno-Installer. Diese Fälle laufen im Modus Normal.

## Umsetzung im Player

- Der Installer wird über `ShellExecuteEx` gestartet (nicht `CreateProcess`). Dadurch erscheint die Rechteabfrage (UAC), wenn der Installer Administratorrechte verlangt. Das Menü wartet auf das Prozessende und liest den Exit-Code.
- **GOG still:** `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP- /DIR="<Ziel>" /LOG="<Datei>"`, danach die `args` des Eintrags.
- **Normal:** keine zusätzlichen Parameter. `args` gelten nur für still.
- **Epic still:** nur die `args` des Eintrags, ohne Zielordner. Ohne `args` läuft der Installer normal.
- Fehlerfall: Exit-Code und das Ende des Protokolls werden angezeigt, bei Code 5 oder 740 der Hinweis auf fehlende Administratorrechte.
- Fortschritt (nur still, mit `estimatedSizeMB`): Größe des Zielordners im Verhältnis zur Schätzung, höchstens 99 %, der Balken geht nie zurück.
- Der erkannte Installationsordner (GOG-Registry) wird für spätere DLCs und Patches desselben Spiels als Zielordner vorgeschlagen.

## Ergebnis auslesen

Ordner zu prüfen ist unzuverlässig, weil das Spiel auf einer anderen Platte liegen kann und kleine Pakete (z. B. Redistributables) unter Windows landen. Besser sind diese Quellen:

1. **Exit-Code des Installers.** `0` bedeutet Erfolg, andere Werte Abbruch oder Fehler. Die genauen Codes stehen in der Inno-Setup-Dokumentation.
2. **Log-Datei** über `/LOG`. Sie wird nach der Installation ausgewertet und bei Fehlern angezeigt.
3. **Registry.** GOG-Installer tragen nach bisherigem Wissen den Installationsordner unter `HKLM\SOFTWARE\WOW6432Node\GOG.com\Games\<Spiel-ID>` ein, außerdem gibt es einen normalen Uninstall-Eintrag mit `InstallLocation`. Das ist an echten Installern zu bestätigen.
4. **Zielordnergröße** dient nur für den Fortschrittsbalken (im Verhältnis zu `estimatedSizeMB`), nicht als Ergebnis.

Der gefundene Installationsordner ist auch für DLCs und Patches nützlich: Sie können denselben Ordner bekommen, falls ihr Installer ihn nicht selbst findet.

## Rechte

Viele Installer verlangen Administratorrechte. Das Menü muss sie deshalb über den Windows-Mechanismus für erhöhte Rechte starten (UAC-Abfrage), sonst scheitert der Start. Das Menü selbst braucht keine erhöhten Rechte.

## Linux (Wine/Proton)

Die Installer laufen im Wine-Präfix. Die Registry-Abfragen beziehen sich dann auf dieses Präfix. Zielpfade in Wine sehen anders aus (z. B. `Z:\...` für das Linux-Dateisystem). Mehr dazu in [platforms-and-tech.md](platforms-and-tech.md).
