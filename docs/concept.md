# Konzept

## Ziel

Ein einheitliches, anpassbares Installer-Menü für Spiele-Discs. Es soll zuerst für **GOG-Spiele** entstehen, aber so aufgebaut sein, dass später weitere Quellen (z. B. Steam-Backups) dazukommen können.

Das Menü wird aus einer Rezeptdatei (`menu.json`) erzeugt. Für eine neue Disc muss nichts neu programmiert oder kompiliert werden.

## Grundprinzipien

1. **Einheitlicher Look, trotzdem anpassbar:** Layout und Bedienung sind immer gleich, Titel, Cover, Hintergrund, Sounds und Texte kommen aus der `menu.json`.
2. **Multi-Installer:** Eine Disc kann mehrere Spiele enthalten (Collection), z. B. Deus Ex mit Invisible War oder mehrere Call-of-Juarez-Teile. Die Reihenfolge im Menü bestimmt ein `index` pro Spiel.
3. **Rezept statt Code:** Alles, was Spiele, DLCs, Extras und Installer verbindet, steht in der `menu.json`.
4. **Erweiterbar:** Spiele haben einen `provider` (zuerst `gog`, später z. B. `steam`). Das Menü bleibt gleich, nur die Art der Installation unterscheidet sich.
5. **Patches zur Laufzeit:** Ein Patches-Ordner auf der Disc wird beim Start ausgelesen. Neue Patches können später hinzukommen, ohne die Menü-EXE neu zu bauen.

## Ablauf

### Beim Erstellen (Build-Zeit)

1. Ordner vorbereiten: `menu.json`, Cover, Sounds und andere Assets.
2. `Menüersteller.exe` im selben Ordner starten.
3. Der Builder liest und prüft die `menu.json` (fehlende Dateien, doppelte IDs oder Indizes, ungültige Felder).
4. Der Builder packt `menu.json` und alle referenzierten Assets zu einem Paket (Payload).
5. Der Builder kopiert die fertige Player-EXE und hängt das Paket an.
6. Ergebnis: eine einzelne Menü-EXE, die später auf die Disc kommt.

### Beim Benutzen (Laufzeit)

1. Der Player liest sein eigenes Paket aus dem Ende der EXE.
2. Er zeigt das Menü: Spiele nach `index` sortiert, mit Cover, beim Hover erscheint der Install-Button. Darunter Extras und Beenden.
3. Beim Klick auf Install startet er den Installer des Spiels. Pfade sind relativ zum Ordner der Menü-EXE (Disc-Wurzel), da sich der Laufwerksbuchstabe ändert.
4. DLCs und Extras (Soundtrack, Handbuch, Map-DLC usw.) liegen als eigene Einträge im Menü.
5. Im Tab **Patches** zeigt der Player alles, was er zur Laufzeit im Patches-Ordner findet (siehe unten).

## Menüaufbau

- **Spiele:** Hauptansicht, Reihenfolge über `index` (0, 1, 2, ...).
- **Extras:** Soundtracks, Handbücher, Karten usw.
- **Patches:** Neuer Tab. Zeigt gefundene Patches pro Spiel in der Reihenfolge ihres Patch-Index.
- **Beenden**

## Patches

Struktur auf der Disc (neben der Menü-EXE):

```
Patches/
└─ <Spiel-Index>/
   └─ <Patch-Index>/
      ├─ patch.json          Metadaten
      └─ <Patch-Datei>.exe   der eigentliche Patch
```

- Der erste Ordner entspricht dem `index` des Spiels in der `menu.json`.
- Der zweite Ordner ist der Patch-Index (1, 2, 3, ...) und bestimmt die Reihenfolge.
- Der Player scannt den Ordner bei jedem Start. Ein neuer Patch ist ein neuer Unterordner mit `patch.json` und Patch-Datei, an der Menü-EXE ändert sich nichts.
- Felder der `patch.json` stehen in [patches-spec.md](patches-spec.md).

Hinweis: Weil der Spiel-Index zugleich der Ordnername ist, sollte er nach dem Brennen nicht mehr geändert werden. Mögliche Alternative: ein eigenes festes Feld (z. B. `patchFolder`) pro Spiel. Siehe offene Entscheidungen.

Wie sich so ein Patch später auf eine bereits gebrannte Disc bringen lässt (Mehrfach-Session), steht in [disc-planung.md](disc-planung.md).

## Provider (Zukunft: Steam)

Jedes Spiel hat einen `provider`. Der Standardwert ist `gog`. Der Player ruft je nach Provider unterschiedlichen Code auf:

| Provider | Installation |
|---|---|
| `gog` (jetzt) | Inno-Setup-Installer der Disc starten, interaktiv oder still |
| `steam` (später) | Backup-Dateien einer Steam-Installation wiederherstellen und Steam das Spiel erkennen lassen |

Zu Steam ist noch einiges offen und muss vor dem Bau geprüft werden:
- Die Wiederherstellung eines Steam-Backups gibt es als Funktion im Steam-Client. Ob und wie sie sich von außen auslösen lässt, ist unklar.
- Möglicher Weg: Spieldateien in den Steam-Bibliotheksordner kopieren, passende `appmanifest`-Datei anlegen, Steam das Spiel prüfen und aktualisieren lassen.
- Administratorrechte können nötig sein.

Für jetzt bedeutet das nur: Der Code soll Installer-Aufrufe hinter einer Schnittstelle kapseln (ein Provider pro Quelle), damit Steam später keinen Umbau des Menüs erfordert.

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
- Eine fertig gebrannte Menü-EXE lässt sich auf einer Write-Once-Disc nicht mehr ändern. Das Format der `menu.json` und der Patch-Ordner muss deshalb von Anfang an stabil und vorwärtskompatibel sein (`schemaVersion`).

## Offene Entscheidungen

- Endgültige Technik (WPF oder Alternative)
- Dateiname: `menu.json` (ohne Umlaut, um Probleme mit Dateinamen zu vermeiden)
- Patch-Ordner über den Spiel-`index` oder ein eigenes festes Feld benennen
- Weitere Patch-Quellen neben der Disc (z. B. ein Ordner auf dem Server oder USB-Stick)
- Wie genau der Fortschritt bei stillen Installationen angezeigt wird
- Mehrsprachigkeit des Menüs
- Steam-Provider: Machbarkeit der Wiederherstellung prüfen
