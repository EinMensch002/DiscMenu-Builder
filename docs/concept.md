# Konzept

## Ziel

Eine Disc soll beim Einlegen ein einheitliches Installer-Menü zeigen. Das Menü soll sich aus einer einfachen JSON-Datei erzeugen lassen, ohne dass für jede Disc neu programmiert oder kompiliert werden muss.

## Ablauf

### Beim Erstellen (Build-Zeit)

1. Ordner vorbereiten: `menu.json`, Cover, Sounds und andere Assets.
2. `Menüersteller.exe` im selben Ordner starten.
3. Der Builder liest und prüft die `menu.json` (fehlende Dateien, doppelte IDs, ungültige Felder).
4. Der Builder packt `menu.json` und alle referenzierten Assets zu einem Paket (Payload).
5. Der Builder kopiert die fertige Player-EXE und hängt das Paket an.
6. Ergebnis: eine einzelne Menü-EXE, die später auf die Disc kommt.

### Beim Benutzen (Laufzeit)

1. Der Player liest sein eigenes Paket aus dem Ende der EXE.
2. Er zeigt das Menü: Spiele mit Cover, beim Hover Install-Button, darunter Extras und Beenden.
3. Beim Klick auf Install startet er den Installer des Spiels. Pfade sind relativ zum Ordner der Menü-EXE (Disc-Wurzel), da sich der Laufwerksbuchstabe ändert.
4. DLCs und Extras (Soundtrack, Handbuch, Map-DLC usw.) liegen als eigene Einträge im Menü.

## Payload-Format

```
[ Player.exe ][ payload.zip ][ Länge des Pakets: 8 Byte ][ Kennung: "DMENUPL1" ]
```

Der Player öffnet seine eigene Datei, liest von hinten die Kennung und die Länge und kann das Paket so ohne Entpacken auf die Festplatte lesen. Eine EXE mit angehängten Daten funktioniert unter Windows weiter, weil nur der vordere Teil als Programm geladen wird.

## Installer-Integration (GOG)

Die GOG-Windows-Installer sind in der Regel Inno-Setup-Installer. Pro Eintrag gibt es zwei Modi:

- **interaktiv:** Der Original-Installer öffnet sich in einem eigenen Fenster (einfachster Fall, reiner Forwarder).
- **still:** Das Menü startet den Installer mit Parametern wie `/VERYSILENT /NORESTART /DIR="Zielpfad"` und zeigt einen eigenen Fortschrittsbalken. Der Fortschritt lässt sich grob über die Größe des Zielordners im Verhältnis zur angegebenen Zielgröße schätzen.

Das Entpacken der Installer (z. B. mit `innoextract`) ist nur ein Plan B. Es überspringt Setup-Schritte wie Registry-Einträge und Redistributables, manche Spiele laufen danach nicht.

## Technik (Vorschlag, noch nicht entschieden)

C# mit WPF auf .NET Framework 4.8. Das ist in Windows 10/11 vorinstalliert, die EXE bleibt klein, und Hover-Effekte, Animationen und Sound sind gut machbar. Alternative: Rust mit egui. Frühere Versuche mit Tauri (Input-Lag) und Godot (zu groß) sollen vermieden werden.

## Grenzen und Risiken

- Installer liegen immer als eigene Dateien auf der Disc, nicht in der Menü-EXE (zu groß).
- Windows 10/11 führt `autorun.inf` nicht mehr automatisch aus, sondern zeigt nur eine AutoPlay-Benachrichtigung.
- Installer brauchen häufig Administratorrechte (UAC-Abfrage).
- Selbstgebaute EXEs mit angehängten Daten können Antivirus-Fehlalarme auslösen.
- Das Gefühl der Oberfläche (Lag, Sound-Timing) muss auf echter Hardware getestet werden.

## Offene Entscheidungen

- Endgültige Technik (WPF oder Alternative)
- Dateiname: `menu.json` (ohne Umlaut, um Probleme mit Dateinamen zu vermeiden)
- Wie genau der Fortschritt bei stillen Installationen angezeigt wird
- Mehrsprachigkeit des Menüs
