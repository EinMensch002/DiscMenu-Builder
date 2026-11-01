# Disc-Planung

## Kapazität

- BD-R mit einer Schicht: 25 GB laut Hersteller. Windows zeigt rund 23,3 GB an, weil es in GiB rechnet. Planst du mit der Windows-Anzeige, bist du auf der sicheren Seite.
- BD-R mit zwei Schichten: 50 GB (Windows: rund 46,6 GB).
- Pro Disc gilt: Summe aus Spielen, DLCs, Extras, Menü-EXE und reserviertem Patch-Platz muss unter diesem Wert bleiben.

## Platz für Patches reservieren

Die Idee: Nach dem Brennen von Spielen und Menü bleibt Freiraum (z. B. 8 GB). Dieser Platz soll später für Patches genutzt werden, indem neue Dateien in den Ordner `Patches/` nachgebrannt werden.

Das geht nur, wenn die Disc **nicht finalisiert** wurde und das Brennprogramm Mehrfach-Sessions unterstützt.

## Mehrfach-Session und Finalisieren

- Bei einer beschreibbaren Disc (BD-R) werden Daten dauerhaft geschrieben. Gelöschte oder ersetzte Dateien geben **keinen** Platz frei, neue Dateien belegen zusätzlichen Platz.
- Eine nicht finalisierte Disc ist nicht beschädigt, sie ist nur "offen". Eine finalisierte Disc ist abgeschlossen und kann nicht mehr beschrieben werden.
- Offene Discs werden nicht von jedem Laufwerk oder Player gelesen. Viele PC-Laufwerke kommen damit zurecht, manche nicht.
- Jede zusätzliche Session braucht etwas Verwaltungsplatz.
- Ob Windows Explorer, dein Brennprogramm und dein Laufwerk gemeinsam Mehrfach-Sessions auf BD-R sauber unterstützen, sollte vorab mit einer einzelnen Test-Disc geprüft werden.

## Empfohlene Strategie (zu prüfen)

1. Test mit einer günstigen Disc: Spiel und Menü brennen, offen lassen, später einen Patch in einer zweiten Session ergänzen und auf einem zweiten Rechner lesen.
2. Funktioniert das, bleibt eine Disc offen, solange Platz für Patches reserviert ist.
3. Ist der Platz aufgebraucht oder kommen keine Updates mehr, die Disc finalisieren.
4. Reicht der Platz nicht, den Patch auf eine neue Disc oder einen anderen Speicher legen. Der Player soll dafür später weitere Patch-Quellen lesen können (siehe offene Entscheidungen im Konzept).
