package main

import (
	"image/color"
	"strings"

	shared "github.com/einmensch002/discmenu-builder/src/Shared"
)

// Brand beschreibt, wie ein Anbieter im Menü aussieht. Nur Text und Farbe, keine Logos.
type Brand struct {
	Name    string
	Accent  color.RGBA // Hauptfarbe: Hauptknopf, Linien
	Badge   color.RGBA // Hintergrund des Abzeichens
	OnBadge color.RGBA // Schriftfarbe im Abzeichen
}

// Provider kapselt, wie ein Anbieter behandelt wird. Neue Quellen kommen als weitere Implementierung dazu.
type Provider interface {
	ID() string
	Brand() Brand
	// CanInstall sagt, ob der Player Installer dieses Anbieters startet.
	CanInstall() bool
	// SilentAvailable sagt, ob für diesen Eintrag eine stille Installation möglich ist.
	SilentAvailable(entryArgs []string) bool
	// UsesTargetDir sagt, ob der Zielordner im Menü gewählt werden kann (und per Parameter übergeben wird).
	UsesTargetDir() bool
	// SilentArgs sind die Parameter des Anbieters für die stille Installation (ohne die Parameter des Eintrags).
	SilentArgs(targetDir, logPath string) []string
	// Note erscheint auf der Spielseite, wenn der Anbieter Einschränkungen hat.
	Note() string
}

// ProviderFor liefert die Behandlung für einen Anbieter. Unbekannte Werte werden wie GOG behandelt
// (die Prüfung im Builder lässt sie gar nicht erst zu).
func ProviderFor(id string) Provider {
	switch id {
	case shared.ProviderEpic:
		return epicProvider{}
	case shared.ProviderSteam:
		return steamProvider{}
	}
	return gogProvider{}
}

// --- GOG: Inno-Setup-Installer ---

type gogProvider struct{}

func (gogProvider) ID() string { return shared.ProviderGOG }
func (gogProvider) Brand() Brand {
	return Brand{Name: "GOG", Accent: color.RGBA{158, 78, 190, 255}, Badge: color.RGBA{118, 52, 148, 255}, OnBadge: color.RGBA{255, 255, 255, 255}}
}
func (gogProvider) CanInstall() bool              { return true }
func (gogProvider) SilentAvailable([]string) bool { return true }
func (gogProvider) UsesTargetDir() bool           { return true }
func (gogProvider) Note() string                  { return "" }
func (gogProvider) SilentArgs(target, log string) []string {
	a := []string{"/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/SP-"}
	if target != "" {
		a = append(a, "/DIR="+quote(target))
	}
	if log != "" {
		a = append(a, "/LOG="+quote(log))
	}
	return a
}

// --- Epic Games: keine einheitlichen Offline-Installer ---

type epicProvider struct{}

func (epicProvider) ID() string { return shared.ProviderEpic }
func (epicProvider) Brand() Brand {
	return Brand{Name: "Epic Games", Accent: color.RGBA{214, 218, 228, 255}, Badge: color.RGBA{52, 54, 62, 255}, OnBadge: color.RGBA{255, 255, 255, 255}}
}
func (epicProvider) CanInstall() bool { return true }

// Still nur, wenn der Eintrag eigene Parameter mitbringt: Ohne Wissen über den Installer gibt es keine allgemeingültigen.
func (epicProvider) SilentAvailable(args []string) bool { return len(args) > 0 }
func (epicProvider) UsesTargetDir() bool                { return false }
func (epicProvider) SilentArgs(string, string) []string { return nil }
func (epicProvider) Note() string {
	return "Epic hat keine einheitlichen Offline-Installer. Der Installer startet normal; still geht es nur mit eigenen Parametern aus der menu.json."
}

// --- Steam: vorbereitet, noch ohne Wiederherstellung ---

type steamProvider struct{}

func (steamProvider) ID() string { return shared.ProviderSteam }
func (steamProvider) Brand() Brand {
	return Brand{Name: "Steam", Accent: color.RGBA{102, 192, 244, 255}, Badge: color.RGBA{34, 62, 92, 255}, OnBadge: color.RGBA{150, 214, 255, 255}}
}
func (steamProvider) CanInstall() bool                   { return false }
func (steamProvider) SilentAvailable([]string) bool      { return false }
func (steamProvider) UsesTargetDir() bool                { return false }
func (steamProvider) SilentArgs(string, string) []string { return nil }
func (steamProvider) Note() string {
	return "Steam-Backups kann dieses Menü noch nicht wiederherstellen. DLCs, Patches und Extras lassen sich trotzdem öffnen."
}

// quote setzt einen Wert in Anführungszeichen (Windows-Kommandozeile).
func quote(s string) string {
	if strings.HasPrefix(s, `"`) {
		return s
	}
	return `"` + s + `"`
}
