# Disc-Planung

## Grundsatz

Discs sollen **Jahrzehnte** halten, unabhängig vom Internet nutzbar sein und sich unter Windows 10/11 und Linux lesen lassen. Deshalb gilt:

- **Jede Disc wird finalisiert.** Offene Discs (Mehrfach-Session) werden nicht von jedem Laufwerk oder Betriebssystem sauber erkannt. Das Risiko ist für ein Archiv zu hoch.
- **Kein nachträgliches Ergänzen** von Patches oder Dateien auf einer gebrannten Disc.
- **Updates bedeuten eine neue Disc.** Gibt es später einen wichtigen Patch, wird die Disc in einer neuen Revision komplett neu gebaut und gebrannt (z. B. "Revision 2" auf dem Aufdruck).

## Kapazität

- BD-R mit einer Schicht: 25 GB laut Hersteller, Windows zeigt rund 23,3 GB an (Rechnung in GiB). Geplant wird mit der Windows-Anzeige.
- BD-R mit zwei Schichten: 50 GB (Windows: rund 46,6 GB).
- Für den Platz zählt alles zusammen: Spiele, DLCs, Extras, Menü-EXE.
- Mehrere Spiele pro Disc sind vorgesehen (Collections), solange sie zusammen passen.

## Dateisystem

GOG-Installer bestehen oft aus Dateien mit bis zu rund 4 GB. Das reine ISO-9660-Dateisystem kann das nicht, deshalb wird **UDF** genutzt. Welche UDF-Version für Windows 10/11 und Linux die sicherste ist, wird beim ersten Test-Brennen geprüft. Dabei auch die Länge der Dateipfade beachten (Windows hat Grenzen).

## Langzeitarchivierung

- Menü-Rezept (`menu.json` und Assets) im Repo oder auf dem Server aufheben, damit sich Discs später neu bauen lassen.
- Prüfsummen der Dateien speichern und die Disc nach dem Brennen prüfen.
- Wichtige Discs doppelt brennen und getrennt lagern.
- Discs gelegentlich auslesen und prüfen. Die Haltbarkeitsangaben der Hersteller sind keine Garantie.

## Test vor der Serienproduktion

Eine einzelne Test-Disc brennen und prüfen:
1. Wird sie unter Windows 10/11 und Linux gelesen?
2. Funktioniert die AutoPlay-Meldung unter Windows?
3. Startet das Menü und lassen sich Installer ausführen?
