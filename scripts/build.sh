#!/usr/bin/env bash
# Baut Player.exe und Builder.exe für Windows (64 Bit) in den Ordner dist/.
# Läuft unter Linux, macOS und Windows (Git Bash) und braucht nur Go, keinen C-Compiler.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${VERSION:-$(git describe --tags --always --dirty 2>/dev/null || echo dev)}"
OUT="${OUT:-dist}"
mkdir -p "$OUT"
export GOOS=windows GOARCH=amd64 CGO_ENABLED=0

# -H=windowsgui: kein Konsolenfenster für das Menü. -s -w: kleinere Datei.
go build -trimpath -ldflags "-H=windowsgui -s -w -X main.version=$VERSION" -o "$OUT/Player.exe" ./src/Player
go build -trimpath -ldflags "-s -w" -o "$OUT/Builder.exe" ./src/Builder

cp schema/menu.schema.json "$OUT/"
mkdir -p "$OUT/examples"
cp -r examples/menu.example.json examples/assets "$OUT/examples/"
ls -la "$OUT"
echo "Fertig. Player.exe und Builder.exe müssen im selben Ordner liegen."
