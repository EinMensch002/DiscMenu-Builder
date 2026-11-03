# SteamGridDB, Beschreibungen und Übersetzung

Der Konfigurator kann Spiele und Bilder bei [SteamGridDB](https://www.steamgriddb.com/) suchen und Beschreibungstexte aus dem Steam-Shop und der deutschen Wikipedia holen. Das spart das Heraussuchen von Covern und das Abtippen von Texten.

## Was möglich ist

1. **Spiel über SteamGridDB hinzufügen** (Knopf in der Spieleliste):
   - Titel eingeben, Spiel aus den Treffern wählen.
   - Ein Cover aus den Bildern des Spiels auswählen (Hochformat, Querformat oder alle Formate). Bilder mit deutscher Sprache stehen zuerst.
   - Eine Beschreibung wird gesucht (siehe unten) und lässt sich vor dem Übernehmen ändern.
   - Das Spiel wird mit Name, Cover und Beschreibung angelegt. Ist nur das leere Standard-Spiel vorhanden, wird dieses ersetzt.
2. **Normal hinzufügen** (Knopf "+ Spiel hinzufügen") und danach bei jedem Bildfeld auf **"Bei SteamGridDB suchen"** klicken. Das geht für das Cover eines Spiels, für Bilder von DLCs, Patches und Extras und für das Hintergrundbild der Disc (dort werden "Heroes" angeboten).
3. **Beschreibung suchen:** Bei jedem Beschreibungsfeld (Spiele und Einträge) gibt es den Knopf "Beschreibung suchen". Er braucht keinen SteamGridDB-Schlüssel.

Die gewählten Bilder werden wie selbst hinzugefügte Bilder verkleinert und im Rezept gespeichert. Es werden keine Links gespeichert, die ZIP funktioniert also auch ohne Internet.

## Beschreibungen

Die Suche sammelt Texte aus zwei Quellen und zeigt deutsche Texte zuerst. Gibt es mehrere Treffer, lässt sich die Quelle in einer Auswahl wechseln. Der Text ist immer bearbeitbar.

| Quelle | Inhalt | Sprache |
|---|---|---|
| Steam-Shop | Kurzbeschreibung des Spiels, auf Deutsch angefragt. Gibt es keinen deutschen Text, liefert Steam den englischen. Das Spiel wird über den Namen gefunden (genauer Treffer oder ein eindeutiger Namensanfang, z. B. "Stronghold HD" findet "Stronghold"). Der gefundene Steam-Titel steht in der Quellenangabe. | Deutsch oder Englisch |
| Deutsche Wikipedia | Einleitung des Artikels zum Spiel, bis zu drei Treffer. Nur Artikel, die wie ein Spiel aussehen. | Deutsch |

Die Spracherkennung ist eine einfache Wortprüfung und kann bei sehr kurzen Texten danebenliegen.

**Übersetzen:** Bei englischen Texten erscheint der Knopf "Ins Deutsche übersetzen". Die Übersetzung läuft über den kostenlosen Dienst MyMemory, ohne Schlüssel. Sie ist maschinell und eher einfach, also kurz prüfen. Der Dienst hat ein Tageslimit. Ist es aufgebraucht, kommt eine Meldung, und es klappt später wieder. Der Text wird dafür an MyMemory gesendet.

Die Wikipedia-Texte stehen unter der Lizenz CC BY-SA 4.0. Wer Discs veröffentlicht oder weitergibt, sollte die Quelle nennen. Die Adresse des Artikels steht in der Quellenangabe unter dem Textfeld. Steam-Texte gehören dem jeweiligen Rechteinhaber.

Nicht jedes Spiel hat einen Steam- oder Wikipedia-Eintrag. Gerade bei GOG-Klassikern bleibt die Suche manchmal leer. Dann bleibt das Feld zum Selbstschreiben.

## Einrichten (SteamGridDB)

1. Kostenloses Konto bei SteamGridDB anlegen und im Profil unter Einstellungen einen API-Schlüssel erzeugen.
2. Im Konfigurator oben auf **SteamGridDB** klicken, den Schlüssel eintragen und mit **Verbindung testen** prüfen.

Der Schlüssel liegt nur im lokalen Speicher des Browsers und wird nie in die ZIP oder `menu.json` geschrieben. Hinweis: Der lokale Speicher gilt pro Adresse. Auf `einmensch002.github.io` können auch andere Seiten desselben GitHub-Kontos darauf zugreifen. Wer das nicht möchte, öffnet den Konfigurator als lokale Datei.

## Einstellungen in einer Datei sichern

Damit Schlüssel und Proxy-Adresse nicht jedes Mal neu eingetragen werden müssen (z. B. nach dem Löschen der Browserdaten oder auf einem anderen Gerät), gibt es im Dialog **SteamGridDB** den Abschnitt "Einstellungen sichern":

- **In Datei sichern** schreibt `discmenu-einstellungen.json`. Bietet der Browser eine Dateiauswahl an, kann man Ziel und Name wählen, sonst wird die Datei heruntergeladen.
- **Aus Datei einlesen** füllt die Felder aus der Datei und speichert sie sofort im Browser.
- **Passwort (optional):** Ist ein Passwort eingetragen, wird die Datei verschlüsselt (AES-256 mit einem aus dem Passwort abgeleiteten Schlüssel, PBKDF2). Zum Einlesen wird dasselbe Passwort gebraucht, ein vergessenes Passwort lässt sich nicht wiederherstellen. Ohne Passwort steht der Schlüssel im Klartext in der Datei.

Die Datei enthält deinen API-Schlüssel. Sie gehört nicht in ein Repo und nicht in eine Rezept-ZIP. Im Repo ist `discmenu-einstellungen*.json` deshalb in der `.gitignore` eingetragen.

## Proxy (CORS)

Browser erlauben Anfragen an fremde Dienste nur, wenn diese es ausdrücklich erlauben. Bei SteamGridDB und dem Steam-Shop hat die direkte Anfrage aus dem Browser nicht funktioniert (Meldung im Konfigurator). Mit einem kleinen eigenen Proxy läuft die Anbindung. Wikipedia und MyMemory brauchen keinen Proxy.

### Proxy einrichten (Cloudflare Worker)

1. Kostenloses Konto bei Cloudflare anlegen.
2. Unter "Workers & Pages" einen neuen Worker erstellen und den Code aus [tools/cors-proxy/worker.js](../tools/cors-proxy/worker.js) einfügen. Veröffentlichen.
3. Die Adresse des Workers notieren, z. B. `https://name.dein-konto.workers.dev`.
4. Im Konfigurator unter **SteamGridDB** als Proxy-Adresse eintragen: `https://name.dein-konto.workers.dev/?url={url}`

Der Proxy leitet nur GET-Anfragen an `steamgriddb.com` (mit Unterdomains) und `store.steampowered.com` weiter, ergänzt die CORS-Header und reicht den API-Schlüssel durch. Ändert SteamGridDB seinen Bild-Host, muss die Liste `ALLOWED_HOSTS` angepasst werden. Das Kontingent des kostenlosen Cloudflare-Tarifs reicht für diesen Zweck nach bisherigem Wissen aus, die aktuellen Grenzen stehen bei Cloudflare.

### Proxy auf die eigene Seite beschränken (empfohlen)

Ohne weitere Einstellung kann jede Webseite den Proxy benutzen und das Kontingent verbrauchen. Das lässt sich abstellen: Im Worker unter **Settings → Variables and Secrets** eine Variable `ALLOWED_ORIGIN` vom Typ Text anlegen, mit der Adresse der Seite, z. B. `https://einmensch002.github.io`. Mehrere Adressen werden mit Komma getrennt. Danach akzeptiert der Proxy nur noch Anfragen von dort. Wird der Konfigurator als lokale Datei geöffnet, geht das nicht mehr, dafür muss die Variable leer bleiben. Die Variable gibt es erst in der aktuellen Version von `worker.js`, ein älterer Worker muss dafür den neuen Code bekommen (einfügen und veröffentlichen).

Bilder werden zuerst direkt geladen und nur bei einem Fehler über den Proxy. Scheitert auch das, lässt sich das Bild bei SteamGridDB herunterladen und wie gewohnt in das Bildfeld ziehen.

## Verwendete Dienste

| Zweck | Anfrage | Proxy nötig |
|---|---|---|
| Spiel suchen | `GET https://www.steamgriddb.com/api/v2/search/autocomplete/{Titel}` | ja |
| Cover | `GET .../grids/game/{id}` mit `types=static`, `nsfw=false` und optional `dimensions` | ja |
| Hintergründe | `GET .../heroes/game/{id}` mit `types=static`, `nsfw=false` | ja |
| Steam-Kennung des Spiels | `GET .../games/id/{id}?platformdata=steam` | ja |
| Steam-Suche | `GET https://store.steampowered.com/api/storesearch/?term={Titel}&l=german&cc=DE` | ja |
| Steam-Beschreibung | `GET https://store.steampowered.com/api/appdetails?appids={id}&l=german` | ja |
| Wikipedia-Beschreibung | `GET https://de.wikipedia.org/w/api.php` (Suche mit Auszug, `origin=*`) | nein |
| Übersetzung | `GET https://api.mymemory.translated.net/get?langpair=en|de&q={Text}` | nein |

Die Anmeldung bei SteamGridDB erfolgt mit `Authorization: Bearer {Schlüssel}`.

## Ideen für später

- Beschreibungen aus dem GOG-Katalog (oft auf Deutsch vorhanden) als weitere Quelle. Dafür müssen Adressen und Antwortformate zuerst geprüft werden, und der Proxy braucht die GOG-Hosts in `ALLOWED_HOSTS`.
- Bessere Übersetzung, z. B. mit DeepL (eigener Schlüssel, läuft über den Proxy).

## Hinweise

- Die Bilder gehören ihren Urhebern auf SteamGridDB. Wer die Discs weitergibt oder veröffentlicht, sollte das beachten.
- Die Suche von SteamGridDB liefert auch Titel mit nicht jugendfreien Namen. Die Bilder sind per `nsfw=false` gefiltert.
