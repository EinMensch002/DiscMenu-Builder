# Plattformen und Technik

## Anforderungen

- Läuft unter **Windows 10 und 11**.
- Läuft unter **Linux mit Wine oder Proton**.
- Eine einzelne, kleine EXE ohne Installation, ohne Pflicht zu Administratorrechten.
- Spürbar verzögerungsfreie Bedienung (Hover, Klick, Sound).
- Bilder, Hover-Effekte und Sound müssen gut machbar sein.

Windows 7 ist nicht mehr Ziel. Das erleichtert die Technikauswahl, weil keine veralteten Systemversionen berücksichtigt werden müssen.

Die Technik wird nach diesen Anforderungen ausgewählt, nicht umgekehrt. Das gilt für den **Player** und den **Builder**. Der **Konfigurator** ist eine Web-App und davon unabhängig (siehe [configurator.md](configurator.md)).

## Entscheidung: Go mit Ebitengine

Player und Builder sind in **Go** geschrieben, der Player zeichnet mit **Ebitengine** (2D, reines Go).

| Punkt | Begründung |
|---|---|
| Eine EXE | Statisch gebunden, keine Laufzeit nötig (kein .NET, kein Visual C++). Etwa 14 MB für den Player |
| Kein C-Compiler | Ebitengine nutzt unter Windows DirectX 11 (oder OpenGL) ohne cgo. Die EXEs lassen sich von Linux aus bauen: `scripts/build.sh` |
| Wine/Proton | Direct3D 11 wird von Wine (wined3d) und Proton (DXVK) bereitgestellt. Bei Problemen lässt sich mit `-graphics opengl` umschalten |
| Bedienung | Hover, Klick-Sound und Bilder ohne Verzögerung, kein WebView |
| Windows-Funktionen | Rechteabfrage (UAC), Ordnerdialog, Registry und Zwischenablage über `golang.org/x/sys/windows` |
| Audio | Direkt über `oto`. Fehlt das Audiogerät (z. B. in Wine), bleibt das Menü stumm, statt abzustürzen |

Verworfen: WPF und WinForms (Wine/Proton bringen kein .NET mit), Tauri/WebView (Eingabeverzögerung), Godot (knapp 200 MB).

Der geplante Mini-Prototyp ist damit nicht mehr nötig, der Player selbst ist der Prototyp. Offen ist der **Praxistest** unter echtem Windows 10/11 und unter Wine/Proton (siehe [manuelle-pruefung.md](manuelle-pruefung.md)).

## Hinweise für Wine/Proton

- Autorun gibt es unter Linux nicht. Das Menü wird von Hand gestartet, z. B. mit `wine /Pfad/zur/Menue.exe`.
- Das Laufwerk der Disc erscheint in Wine als eigener Laufwerksbuchstabe oder als `Z:\`-Pfad.
- Installer, Registry-Zugriffe und Zielpfade beziehen sich auf das Wine-Präfix.

## Automatische Builds und Tests

Builds laufen über GitHub Actions (`.github/workflows/tests.yml`): Go-Tests, Windows-Build als Download (Artefakt `DiscMenu-Windows`) und ein Rauchtest unter Wine. Der Test baut mit dem Builder eine Menü-EXE und lässt den Player sie mit `-selftest` lesen und prüfen, ohne Fenster. Der Wine-Job ist noch nicht an einem echten Lauf bestätigt und beeinflusst das Gesamtergebnis nicht.
