# Plattformen und Technik

## Anforderungen

- Läuft unter **Windows 10 und 11**.
- Läuft unter **Linux mit Wine oder Proton**.
- Eine einzelne, kleine EXE ohne Installation, ohne Pflicht zu Administratorrechten.
- Spürbar verzögerungsfreie Bedienung (Hover, Klick, Sound).
- Bilder, Hover-Effekte und Sound müssen gut machbar sein.

Windows 7 ist nicht mehr Ziel. Das erleichtert die Technikauswahl, weil keine veralteten Systemversionen berücksichtigt werden müssen.

Die Technik wird nach diesen Anforderungen ausgewählt, nicht umgekehrt. Das gilt für den **Player** und den **Builder**. Der **Konfigurator** ist eine Web-App und davon unabhängig (siehe [configurator.md](configurator.md)).

## Kandidaten für Player und Builder

| Option | Windows 10/11 | Wine/Proton | Bewertung |
|---|---|---|---|
| C# mit WPF (.NET Framework) | .NET ist in aktuellen Windows-Versionen vorinstalliert | WPF läuft in Wine nur lückenhaft | ungeeignet |
| C# mit WinForms (.NET Framework) | ja | über wine-mono meist möglich, Proton bringt kein .NET mit | möglich, aber unter Linux umständlich |
| Nativ (C++ oder Rust) mit SDL2 | ja | gut | **vorläufig bevorzugt** |
| Tauri / WebView | ja | unklar | bereits verworfen (Input-Lag) |
| Godot | ja | gut | bereits verworfen (knapp 200 MB) |

Stand: Das sind Annahmen, die noch nicht geprüft wurden. Vor der Entscheidung wird ein Mini-Prototyp gebaut.

## Mini-Prototyp

1. Fenster mit Cover-Bild, Hover-Effekt und Klick-Sound.
2. Einen Prozess starten und auf sein Ende warten.
3. Registry-Wert lesen.
4. EXE mit angehängtem Paket lesen.

Getestet wird unter Windows 10/11 und unter Wine. Auf dieser Basis fällt die Entscheidung für Sprache und Bibliothek.

## Hinweise für Wine/Proton

- Autorun gibt es unter Linux nicht. Das Menü wird von Hand gestartet, z. B. mit `wine /Pfad/zur/Menue.exe`.
- Das Laufwerk der Disc erscheint in Wine als eigener Laufwerksbuchstabe oder als `Z:\`-Pfad.
- Installer, Registry-Zugriffe und Zielpfade beziehen sich auf das Wine-Präfix.

## Automatische Builds und Tests

Builds laufen über GitHub Actions. Denkbar ist ein einfacher Test unter Wine auf einem Linux-Runner, der prüft, ob die EXE startet und das Paket liest.
