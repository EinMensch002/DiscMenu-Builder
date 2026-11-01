# Plattformen und Technik

## Anforderungen

- Läuft unter **Windows 7** (mit Service Pack 1) und neuer.
- Läuft unter **Linux mit Wine oder Proton**.
- Eine einzelne, kleine EXE ohne Installation, ohne Pflicht zu Administratorrechten.
- Spürbar verzögerungsfreie Bedienung (Hover, Klick, Sound).
- Bilder, Hover-Effekte und Sound müssen gut machbar sein.

Die Technik wird danach ausgewählt, nicht umgekehrt.

## Kandidaten

| Option | Windows 7 | Wine/Proton | Bewertung |
|---|---|---|---|
| C# mit WPF (.NET Framework) | .NET muss nachinstalliert werden | WPF läuft in Wine nur lückenhaft | ungeeignet |
| C# mit WinForms (.NET Framework) | .NET muss nachinstalliert werden | über wine-mono meist möglich, Proton bringt kein .NET mit | möglich, aber unter Linux umständlich |
| Nativ (C++ oder Rust) mit SDL2 | SDL2 unterstützt Windows 7 | gut | **vorläufig bevorzugt** |
| Tauri / WebView | WebView2 unterstützt Windows 7 nur in einer alten Version | unklar | bereits verworfen (Input-Lag) |
| Godot | ja | gut | bereits verworfen (knapp 200 MB) |

Stand: Das sind Annahmen, die noch nicht geprüft wurden. Besonders die Unterstützung von Windows 7 durch die jeweilige Sprache und Toolchain muss vor der Entscheidung bestätigt werden. Rust stellt die Unterstützung für Windows 7 in neueren Versionen nur noch eingeschränkt bereit.

## Mini-Prototyp

Bevor der echte Player entsteht, entsteht ein kleiner Test:

1. Fenster mit Cover-Bild, Hover-Effekt und Klick-Sound.
2. Einen Prozess starten und auf sein Ende warten.
3. Registry-Wert lesen.
4. EXE mit angehängtem Paket lesen.

Getestet wird unter Windows 10/11, Windows 7 (virtuelle Maschine) und Wine. Auf dieser Basis fällt die Entscheidung für Sprache und Bibliothek.

## Hinweise für Wine/Proton

- Autorun gibt es unter Linux nicht. Das Menü wird von Hand gestartet, z. B. mit `wine /Pfad/zur/Menue.exe`.
- Das Laufwerk der Disc erscheint in Wine als eigener Laufwerksbuchstabe oder als `Z:\`-Pfad.
- Installer, Registry-Zugriffe und Zielpfade beziehen sich auf das Wine-Präfix.

## Automatische Builds und Tests

Builds laufen über GitHub Actions. Denkbar ist ein einfacher Test unter Wine auf einem Linux-Runner, der prüft, ob die EXE startet und das Paket liest.
