# Konzept

## Ziel

Ein einheitliches, anpassbares Installer-Menü für Spiele-Discs. Es entsteht zuerst für GOG-Spiele und ist so aufgebaut, dass später weitere Quellen (z. B. Steam-Backups) dazukommen können.

Das Menü wird aus einem Rezept (`menu.json` mit Assets) erzeugt. Für eine neue Disc muss nichts programmiert oder kompiliert werden. Das Menü ist ein **Forwarder**: Es installiert nichts selbst, sondern startet die originalen Installer und öffnet Extras.

## Bausteine

| Baustein | Aufgabe | Beschreibung |
|---|---|---|
| **Konfigurator** | Rezept erstellen | Web-App, erzeugt eine ZIP mit `menu.json` und Assets. Siehe [configurator.md](configurator.md) |
| **Builder** | Menü-EXE erzeugen | Liest das Rezept und setzt daraus die fertige EXE zusammen |
| **Player** | Menü anzeigen | Der Teil der EXE, der auf der Disc läuft |

## Ablauf

### Beim Erstellen

1. Rezept im Konfigurator zusammenstellen und als ZIP exportieren. (Von Hand geht es auch: Ordner mit `menu.json` und `assets/`, Aufbau siehe [menu-json-spec.md](menu-json-spec.md).)
2. Den Builder mit dem Rezept (ZIP oder Ordner) starten. Er prüft es nach den Regeln der Spezifikation.
3. Der Builder kopiert den fertigen Player, hängt das Rezept als Paket an und speichert das Ergebnis als neue EXE.
4. Die Menü-EXE kommt zusammen mit Installern und Extras auf die Disc (siehe [disc-planung.md](disc-planung.md)).

### Beim Benutzen

1. Der Player liest sein eigenes Paket aus dem Ende der EXE.
2. Hat die Disc **mehrere Spiele**, zeigt er eine Auswahlseite mit allen Spielen, sortiert nach `index`. Hat sie **nur ein Spiel**, öffnet sich direkt dessen Spielseite.
3. Auf der Spielseite wählt man, ob installiert wird, und startet die Installation. Dazu und zu den weiteren Bereichen siehe unten.

## Menüaufbau

**Auswahlseite** (nur bei mehreren Spielen): Spiele mit Cover und Name, Hover-Effekt, Klick öffnet die Spielseite. Unten: Beenden.

**Spielseite:**

1. **Installieren:** Auswahl "Silent Install" (ja/nein). Bei "ja" wird der Zielpfad direkt im Menü eingegeben, der Installer läuft ohne eigenes Fenster. Bei "nein" öffnet sich der normale Installer. Details in [installer-integration.md](installer-integration.md).
2. **Bereiche** (Tabs), die nur angezeigt werden, wenn sie Einträge haben:
   - **DLCs / Erweiterungen**
   - **Patches** (z. B. Sprach-, Grafik-, Sound-Patches), mit Unterkategorien
   - **Extras** (Soundtrack, Concept Art, Artbooks, Handbücher, ...), mit Unterkategorien
   - **Eigene Tabs** (z. B. Mods): geplant, nicht Teil der ersten Version
3. Zurück zur Auswahlseite (nur bei mehreren Spielen), Beenden.

Alle Bereiche nutzen dasselbe Eintragsformat (Name, Beschreibung, Cover, Gruppe, Aktion). Dadurch lassen sich eigene Tabs später ohne Umbau ergänzen.

## Aufbau der Menü-EXE

```
[ Player.exe ][ payload.zip ][ Länge des Pakets: 8 Byte ][ Kennung: "DMENUPL1" ]
```

Der Player öffnet seine eigene Datei, liest von hinten die Kennung und die Länge und kann das Paket so direkt lesen. Eine EXE mit angehängten Daten läuft unter Windows weiter, weil nur der vordere Teil als Programm geladen wird. Die Installer liegen immer als eigene Dateien auf der Disc, nicht im Paket (zu groß).

## Patches

Gemeint sind feste Patches, die zum Brennzeitpunkt schon bekannt sind, z. B. ein Sprachpatch oder Grafikpatch für ein älteres Spiel. Sie sind normale Einträge im Bereich Patches der `menu.json`.

Nachträgliches Ergänzen von Patches auf einer bereits gebrannten Disc ist bewusst nicht vorgesehen. Gründe stehen in [disc-planung.md](disc-planung.md).

## Provider (Zukunft: Steam)

Jedes Spiel hat einen reservierten `provider` (zurzeit nur `gog`). Der Player kapselt die Installation hinter einer Schnittstelle, ein Provider pro Quelle. So kann später ein `steam`-Provider ergänzt werden, ohne das Menü umzubauen.

Zu Steam ist vorab zu prüfen:
- Die Wiederherstellung eines Steam-Backups ist eine Funktion des Steam-Clients. Ob sie sich von außen auslösen lässt, ist offen.
- Möglicher Weg: Spieldateien in die Steam-Bibliothek kopieren, passende `appmanifest`-Datei anlegen und Steam das Spiel prüfen lassen.
- Administratorrechte können nötig sein.

## Weitere Themen

- Plattformen und Technikauswahl: [platforms-and-tech.md](platforms-and-tech.md)
- Entscheidungen und offene Punkte: [decisions.md](decisions.md)
