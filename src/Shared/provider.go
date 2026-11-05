package shared

// Anbieter (Quelle) eines Spiels. Der Player zeigt sie unterschiedlich an und
// behandelt sie über eigene Provider-Implementierungen (siehe src/Player/providers.go).
const (
	ProviderGOG   = "gog"
	ProviderEpic  = "epic"
	ProviderSteam = "steam"
)

// ProviderInfo beschreibt einen Anbieter für Anzeige und Prüfung.
type ProviderInfo struct {
	ID        string
	Name      string // Anzeigename im Abzeichen
	Supported bool   // vom Player vollständig unterstützt
	Note      string // Hinweis für Prüfung und Menü, falls nicht vollständig unterstützt
}

var providers = map[string]ProviderInfo{
	ProviderGOG:   {ID: ProviderGOG, Name: "GOG", Supported: true},
	ProviderEpic:  {ID: ProviderEpic, Name: "Epic Games", Supported: true, Note: "Epic hat keine einheitlichen Offline-Installer. Der Installer wird normal gestartet, still nur mit eigenen Parametern."},
	ProviderSteam: {ID: ProviderSteam, Name: "Steam", Supported: false, Note: "Steam-Backups werden vom Player noch nicht wiederhergestellt. Der Eintrag wird nur angezeigt."},
}

// Providers nennt alle bekannten Anbieter in fester Reihenfolge.
func Providers() []ProviderInfo {
	return []ProviderInfo{providers[ProviderGOG], providers[ProviderEpic], providers[ProviderSteam]}
}

// LookupProvider liefert die Infos zu einem Anbieter. Leer bedeutet gog.
func LookupProvider(id string) (ProviderInfo, bool) {
	if id == "" {
		id = ProviderGOG
	}
	p, ok := providers[id]
	return p, ok
}
