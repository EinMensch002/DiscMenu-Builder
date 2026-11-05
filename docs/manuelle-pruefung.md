# Manuelle Prüfung des Konfigurators

Diese Punkte lassen sich nicht automatisch testen, weil sie echte Dienste oder echte Browser brauchen. Abhaken, sobald geprüft, und Auffälligkeiten als Issue anlegen. Voraussetzung für die Dienste: ein eigener Proxy (siehe [steamgriddb.md](steamgriddb.md)) und ein SteamGridDB-Schlüssel.

## Beschreibungssuche (mit Proxy)

- [ ] **Steam:** "Beschreibung suchen" für ein bekanntes Spiel (z. B. Portal 2). Es erscheint ein deutscher Text.
- [ ] **GOG:** Suche liefert einen Treffer mit Text. Falls nicht: Fehlermeldung notieren, Antwortformat von `https://catalog.gog.com/v1/catalog?query=like:<Name>` und `https://api.gog.com/products/<id>?expand=description` prüfen.
- [ ] **Epic:** Suche liefert einen Treffer (läuft über die geratene Shop-Adresse bei `store-content.ak.epicgames.com`). Bei Spielen mit ungewöhnlichem Namen kann das scheitern, das ist bekannt.
- [ ] **Übersetzung:** Ein englischer Text wird über MyMemory ins Deutsche übersetzt, auch bei langen Texten (mehrere Teile).
- [ ] **Nur eine Quelle fällt aus:** Die übrigen Quellen zeigen weiterhin Treffer, die Fehlermeldung erscheint nur einmal.

## SteamGridDB

- [ ] Spiel hinzufügen (Suche, Cover und Hintergrund wählen).
- [ ] Bildsuche pro Feld (Cover, Hintergrund).
- [ ] Einstellungen sichern und wieder einlesen, einmal ohne und einmal mit Passwort.

## Browser

- [ ] **Chrome am Computer:** ZIP mit "Speichern unter" und mit "Überschreiben". Import über den Dateidialog verknüpft die Datei.
- [ ] **Chrome am Computer:** "Disc-Ordner prüfen" mit einem echten Disc-Ordner (oder einem Ordner, der so aufgebaut ist).
- [ ] **Android-Chrome:** Bedienung per Touch, Bilder per Antippen, Export als Download, Vorschau und JSON-Ansicht lesbar.
- [ ] **Firefox oder Safari:** Alles außer Dateiauswahl, Überschreiben und Disc-Prüfung funktioniert.
