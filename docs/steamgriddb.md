# SteamGridDB-Anbindung

Der Konfigurator kann Spiele und Bilder bei [SteamGridDB](https://www.steamgriddb.com/) suchen. Das spart das Heraussuchen und Hochladen von Covern von Hand.

## Was möglich ist

1. **Spiel über SteamGridDB hinzufügen** (Knopf in der Spieleliste):
   - Titel eingeben, Spiel aus den Treffern wählen.
   - Ein Cover aus den Bildern des Spiels auswählen (Hochformat, Querformat oder alle Formate). Bilder mit deutscher Sprache stehen zuerst.
   - Die Beschreibung wird beim Steam-Shop auf Deutsch angefragt und lässt sich vor dem Übernehmen ändern. Gibt es keinen deutschen Text, liefert Steam meist den englischen. Findet sich kein passendes Spiel, bleibt die Beschreibung leer.
   - Das Spiel wird mit Name, Cover und Beschreibung angelegt. Ist nur das leere Standard-Spiel vorhanden, wird dieses ersetzt.
2. **Normal hinzufügen** (Knopf "+ Spiel hinzufügen") und danach bei jedem Bildfeld auf **"Bei SteamGridDB suchen"** klicken. Das geht für das Cover eines Spiels, für Bilder von DLCs, Patches und Extras und für das Hintergrundbild der Disc (dort werden "Heroes" angeboten).

Die gewählten Bilder werden wie selbst hinzugefügte Bilder verkleinert und im Rezept gespeichert. Es werden keine Links gespeichert, die ZIP funktioniert also auch ohne Internet.

## Einrichten

1. Kostenloses Konto bei SteamGridDB anlegen und im Profil unter Einstellungen einen API-Schlüssel erzeugen.
2. Im Konfigurator oben auf **SteamGridDB** klicken, den Schlüssel eintragen und mit **Verbindung testen** prüfen.

Der Schlüssel liegt nur im lokalen Speicher des Browsers und wird nie in die ZIP oder `menu.json` geschrieben. Hinweis: Der lokale Speicher gilt pro Adresse. Auf `einmensch002.github.io` können auch andere Seiten desselben GitHub-Kontos darauf zugreifen. Wer das nicht möchte, öffnet den Konfigurator als lokale Datei.

## Wenn der Browser die Anfragen blockiert (CORS)

Browser erlauben Anfragen an fremde Dienste nur, wenn diese es ausdrücklich erlauben. Ob SteamGridDB und der Steam-Shop das für Anfragen aus dem Browser tun, ist **nicht geprüft** (die Anbindung wurde nur gegen nachgebaute Antworten getestet). Funktioniert die Verbindung nicht, zeigt der Konfigurator eine Meldung zu CORS. Dann hilft ein kleiner eigener Proxy.

### Proxy einrichten (Cloudflare Worker)

1. Kostenloses Konto bei Cloudflare anlegen.
2. Unter "Workers & Pages" einen neuen Worker erstellen und den Code aus [tools/cors-proxy/worker.js](../tools/cors-proxy/worker.js) einfügen. Veröffentlichen.
3. Die Adresse des Workers notieren, z. B. `https://name.dein-konto.workers.dev`.
4. Im Konfigurator unter **SteamGridDB** als Proxy-Adresse eintragen: `https://name.dein-konto.workers.dev/?url={url}`

Der Proxy leitet nur GET-Anfragen an `steamgriddb.com` (mit Unterdomains) und `store.steampowered.com` weiter, ergänzt die CORS-Header und reicht den API-Schlüssel durch. Er erlaubt Zugriffe von jeder Seite. Wer das einschränken will, ersetzt `*` bei `Access-Control-Allow-Origin` durch die eigene Adresse. Ändert SteamGridDB seinen Bild-Host, muss die Liste `ALLOWED_HOSTS` angepasst werden. Das Kontingent des kostenlosen Cloudflare-Tarifs reicht für diesen Zweck nach bisherigem Wissen aus, die aktuellen Grenzen stehen bei Cloudflare.

Bilder werden zuerst direkt geladen und nur bei einem Fehler über den Proxy. Scheitert auch das, lässt sich das Bild bei SteamGridDB herunterladen und wie gewohnt in das Bildfeld ziehen.

## Verwendete Endpunkte

| Zweck | Anfrage |
|---|---|
| Spiel suchen | `GET https://www.steamgriddb.com/api/v2/search/autocomplete/{Titel}` |
| Cover | `GET .../grids/game/{id}` mit `types=static`, `nsfw=false` und optional `dimensions` |
| Hintergründe | `GET .../heroes/game/{id}` mit `types=static`, `nsfw=false` |
| Steam-Kennung des Spiels | `GET .../games/id/{id}?platformdata=steam` |
| Steam-Suche (Ersatz) | `GET https://store.steampowered.com/api/storesearch/?term={Titel}&l=german&cc=DE` |
| Beschreibung | `GET https://store.steampowered.com/api/appdetails?appids={id}&l=german` |

Die Anmeldung erfolgt mit `Authorization: Bearer {Schlüssel}`. Die Antwortformate stammen aus der öffentlichen SteamGridDB-Dokumentation und den offiziellen Bibliotheken. Weicht ein Feld ab, ist das hier zuerst zu prüfen.

## Hinweise

- Die Bilder gehören ihren Urhebern auf SteamGridDB. Wer die Discs weitergibt oder veröffentlicht, sollte das beachten.
- Die Beschreibungen stammen aus dem Steam-Shop. GOG-Spiele, die es bei Steam nicht gibt, bekommen keine automatische Beschreibung.
