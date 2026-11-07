# SteamGridDB, Beschreibungen und Übersetzung

Der Konfigurator kann Spiele und Bilder bei [SteamGridDB](https://www.steamgriddb.com/) suchen und Beschreibungstexte aus dem Steam-Shop, von GOG und aus dem Epic Games Store holen. Das spart das Heraussuchen von Covern und das Abtippen von Texten.

## Was möglich ist

1. **Spiel über SteamGridDB hinzufügen** (Knopf in der Spieleliste):
   - Titel eingeben, Spiel aus den Treffern wählen.
   - Ein Cover aus den Bildern des Spiels auswählen (Hochformat, Querformat oder alle Formate). Bilder mit deutscher Sprache stehen zuerst.
   - Eine Beschreibung wird gesucht (siehe unten) und lässt sich vor dem Übernehmen ändern.
   - Das Spiel wird mit Name, Cover und Beschreibung angelegt. Ist nur das leere Standard-Spiel vorhanden, wird dieses ersetzt.
2. **Normal hinzufügen** (Knopf "+ Spiel hinzufügen") und danach bei jedem Bildfeld auf **"Bei SteamGridDB suchen"** klicken. Das geht für das Cover eines Spiels, für Bilder von DLCs, Patches und Extras und für das Hintergrundbild der Disc (dort werden "Heroes" angeboten).
3. **Beschreibung suchen:** Bei jedem Beschreibungsfeld (Spiele und Einträge) gibt es den Knopf "Beschreibung suchen". Er braucht keinen SteamGridDB-Schlüssel, aber den Proxy (siehe unten).

Die gewählten Bilder werden wie selbst hinzugefügte Bilder verkleinert und im Rezept gespeichert. Es werden keine Links gespeichert, die ZIP funktioniert also auch ohne Internet.

## Beschreibungen

Die Suche fragt drei Quellen gleichzeitig ab und zeigt deutsche Texte zuerst. Pro Quelle gibt es bis zu drei Treffer. Die Reihenfolge richtet sich danach, wie genau der Titel passt (genauer Treffer, Titel beginnt mit dem Suchbegriff, Titel enthält ihn). Die Treffer lassen sich in einer Auswahl wechseln, der Text ist immer bearbeitbar. Unter dem Textfeld stehen Titel und Adresse des Treffers, damit man erkennt, ob es das richtige Spiel ist.

| Quelle | Inhalt | Hinweise |
|---|---|---|
| Steam-Shop | Kurzbeschreibung, auf Deutsch angefragt (gibt es keinen deutschen Text, kommt der englische) | Läuft die Suche über SteamGridDB, wird zuerst die dort hinterlegte Steam-Kennung des Spiels benutzt. |
| GOG | Beschreibung aus dem GOG-Katalog, auf Deutsch angefragt, auf etwa 700 Zeichen gekürzt | Inoffizielle Schnittstellen, die auch der GOG-Shop selbst nutzt. Sie können sich ändern. Besonders sinnvoll für GOG-Klassiker. |
| Epic Games Store | Beschreibung der Shop-Seite, auf Deutsch angefragt | Es gibt keine öffentliche Suche. Der Konfigurator rät die Adresse der Shop-Seite aus dem Titel (z. B. "Cyberpunk 2077" wird zu `cyberpunk-2077`). Das klappt nur bei Spielen, deren Adresse so heißt. Inoffiziell. |

Alle drei Quellen brauchen im Browser den Proxy (siehe unten). Die Antwortformate von GOG und Epic stammen aus öffentlichen Beschreibungen inoffizieller Programmbibliotheken und wurden nur mit nachgebauten Antworten getestet. Liefert eine Quelle nichts, steht der Grund unter dem Textfeld.

Die Spracherkennung ist eine einfache Wortprüfung und kann bei sehr kurzen Texten danebenliegen.

**Übersetzen:** Bei englischen Texten erscheint der Knopf "Ins Deutsche übersetzen". Die Übersetzung läuft über den kostenlosen Dienst MyMemory, ohne Schlüssel und ohne Proxy. Sie ist maschinell und eher einfach, also kurz prüfen. Der Dienst hat ein Tageslimit. Ist es aufgebraucht, kommt eine Meldung, und es klappt später wieder. Der Text wird dafür an MyMemory gesendet.

Die Texte gehören den jeweiligen Shops und Rechteinhabern. Wer Discs veröffentlicht oder weitergibt, sollte das beachten.

Nicht jedes Spiel steht in allen drei Shops. Findet keine Quelle etwas, bleibt das Feld zum Selbstschreiben.

## Einrichten (SteamGridDB)

1. Kostenloses Konto bei [SteamGridDB](https://www.steamgriddb.com/) anlegen und auf der Seite [API-Schlüssel](https://www.steamgriddb.com/profile/preferences/api) im Profil einen Schlüssel erzeugen.
2. Im [Konfigurator](https://einmensch002.github.io/DiscMenu-Builder/) oben auf **SteamGridDB** klicken, den Schlüssel eintragen und mit **Verbindung testen** prüfen.

Der Schlüssel liegt nur im lokalen Speicher des Browsers und wird nie in die ZIP oder `menu.json` geschrieben. Hinweis: Der lokale Speicher gilt pro Adresse. Auf `einmensch002.github.io` können auch andere Seiten desselben GitHub-Kontos darauf zugreifen. Wer das nicht möchte, öffnet den Konfigurator als lokale Datei.

## Einstellungen in einer Datei sichern

> Dieselbe Datei lässt sich auch im [Cover-Tool](disc-sleeve.md) einlesen und dort sichern (gleiches Format, auch mit Passwort). Auf GitHub Pages teilen sich beide Web-Apps außerdem denselben Speicher, einmal eintragen genügt.

Damit Schlüssel und Proxy-Adresse nicht jedes Mal neu eingetragen werden müssen (z. B. nach dem Löschen der Browserdaten oder auf einem anderen Gerät), gibt es im Dialog **SteamGridDB** den Abschnitt "Einstellungen sichern":

- **In Datei sichern** schreibt `discmenu-einstellungen.json`. Bietet der Browser eine Dateiauswahl an, kann man Ziel und Name wählen, sonst wird die Datei heruntergeladen.
- **Aus Datei einlesen** füllt die Felder aus der Datei und speichert sie sofort im Browser.
- **Passwort (optional):** Ist ein Passwort eingetragen, wird die Datei verschlüsselt (AES-256 mit einem aus dem Passwort abgeleiteten Schlüssel, PBKDF2). Zum Einlesen wird dasselbe Passwort gebraucht, ein vergessenes Passwort lässt sich nicht wiederherstellen. Ohne Passwort steht der Schlüssel im Klartext in der Datei.

Die Datei enthält deinen API-Schlüssel. Sie gehört nicht in ein Repo und nicht in eine Rezept-ZIP. Im Repo ist `discmenu-einstellungen*.json` deshalb in der `.gitignore` eingetragen.

## Proxy (CORS)

Browser erlauben Anfragen an fremde Dienste nur, wenn diese es ausdrücklich erlauben. Bei SteamGridDB und dem Steam-Shop hat die direkte Anfrage aus dem Browser nicht funktioniert (Meldung im Konfigurator). GOG und Epic sind ähnlich. Mit einem kleinen eigenen Proxy läuft die Anbindung. Nur die Übersetzung über MyMemory braucht keinen Proxy.

### Proxy einrichten (Cloudflare Worker)

1. Kostenloses Konto bei [Cloudflare](https://dash.cloudflare.com/sign-up) anlegen.
2. Im [Cloudflare-Dashboard](https://dash.cloudflare.com/) den Bereich **Workers & Pages** öffnen und einen neuen Worker erstellen (Knopf **Create application** bzw. **Anwendung erstellen**).
3. Als Startpunkt **Mit Hello World beginnen** (englisch: *Start with Hello World!*) wählen. Das legt einen Worker mit einem kleinen Beispielcode an, den wir gleich ersetzen.
   **Nicht** die anderen Möglichkeiten wählen: weder ein Repository importieren (damit würde der Worker mit Git und einem Repo verbunden) noch eine Vorlage verwenden. Beides ist für den Proxy nicht nötig und führt nur zu Verwirrung.
4. Dem Worker einen Namen geben, z. B. `discmenu-proxy`, und auf **Deploy** (Bereitstellen) klicken. Der Beispielcode wird damit zum ersten Mal veröffentlicht.
5. Danach auf **Edit code** (Code bearbeiten) klicken. Im Editor den gesamten Beispielcode löschen.
6. Die Datei [tools/cors-proxy/worker.js](../tools/cors-proxy/worker.js) auf GitHub öffnen und den **ganzen** Inhalt kopieren (am einfachsten mit dem Kopieren-Knopf oben rechts über dem Code). Im Editor von Cloudflare einfügen und wieder auf **Deploy** klicken.
7. Die Adresse des Workers notieren, z. B. `https://discmenu-proxy.dein-konto.workers.dev`.
8. Im Konfigurator unter **SteamGridDB** als Proxy-Adresse eintragen: `https://discmenu-proxy.dein-konto.workers.dev/?url={url}`. Das `{url}` am Ende muss genau so mitgeschrieben werden.
9. Mit **Verbindung testen** prüfen, ob es klappt.

Die Oberfläche von Cloudflare ändert sich gelegentlich, die Bezeichnungen können daher leicht abweichen. Die Schritte bleiben aber gleich.

**Wichtig bei einem schon eingerichteten Proxy:** Für GOG und Epic muss der Worker die erweiterte Host-Liste kennen. Dazu im Cloudflare-Dashboard den Worker öffnen, auf **Edit code** klicken, den alten Code durch den ganzen Inhalt von `worker.js` ersetzen (siehe Schritt 6) und **Deploy** klicken. Die Proxy-Adresse im Konfigurator bleibt gleich.

**Ist der Worker aktuell?** Der Worker meldet seine **Version** und die Liste der erlaubten Hosts (Abfrage `https://<dein-worker>/?info=1`). In den Einstellungen zeigt **"Verbindung testen"** dazu eine Zeile **"Proxy-Worker"**: **Version 2 (aktuell)** mit Häkchen, oder ein **Kreuz**, wenn der Worker zu alt ist (auch ein alter Worker ganz ohne Versionsangabe) oder einen Host nicht erlaubt, den die Tools brauchen, mit dem Hinweis, den aktuellen Code einzuspielen. Zusätzlich steht jeder Dienst, der nicht erreichbar ist, einzeln mit Kreuz und Meldung da, und die Zeile oben nennt, wie viele und welche es sind. Beim Ändern von `worker.js` wird `VERSION` dort und `WORKER_VERSION` in `disc-sleeve/online.js` und `configurator/index.html` erhöht (ein Test prüft, dass alle drei gleich sind und der Worker alle Hosts der Tools erlaubt).

Der Proxy leitet nur GET-Anfragen an `steamgriddb.com` (mit Unterdomains), `store.steampowered.com`, `catalog.gog.com`, `api.gog.com` und `store-content.ak.epicgames.com` weiter, ergänzt die CORS-Header und reicht den API-Schlüssel durch. Ändert SteamGridDB seinen Bild-Host, muss die Liste `ALLOWED_HOSTS` angepasst werden. Das Kontingent des kostenlosen Cloudflare-Tarifs reicht für diesen Zweck nach bisherigem Wissen aus, die aktuellen Grenzen stehen bei Cloudflare.

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
| GOG-Suche | `GET https://catalog.gog.com/v1/catalog?query=like:{Titel}&locale=de-DE&countryCode=DE&currencyCode=EUR&productType=in:game,pack,dlc` | ja |
| GOG-Beschreibung | `GET https://api.gog.com/products/{id}?expand=description&locale=de-DE` | ja |
| Epic-Beschreibung | `GET https://store-content.ak.epicgames.com/api/de/content/products/{Adresse}` | ja |
| Übersetzung | `GET https://api.mymemory.translated.net/get?langpair=en|de&q={Text}` | nein |

Die Anmeldung bei SteamGridDB erfolgt mit `Authorization: Bearer {Schlüssel}`.

## Ideen für später

- Epic-Suche mit echter Suchabfrage statt Adressraten (die Suchschnittstelle ist nicht öffentlich dokumentiert und ändert sich).
- Bessere Übersetzung, z. B. mit DeepL (eigener Schlüssel, läuft über den Proxy).

## Hinweise

- Die Bilder gehören ihren Urhebern auf SteamGridDB. Wer die Discs weitergibt oder veröffentlicht, sollte das beachten.
- Die Suche von SteamGridDB liefert auch Titel mit nicht jugendfreien Namen. Die Bilder sind per `nsfw=false` gefiltert.
