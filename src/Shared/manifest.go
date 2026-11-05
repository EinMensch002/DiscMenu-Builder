// Package shared enthält Format, Prüfung und Paketaufbau, die Builder und Player gemeinsam nutzen.
package shared

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sort"
)

// SchemaVersion ist die einzige bekannte Version der menu.json.
const SchemaVersion = 1

// Menu ist die menu.json (siehe docs/menu-json-spec.md und schema/menu.schema.json).
type Menu struct {
	SchemaVersion int     `json:"schemaVersion"`
	Title         string  `json:"title"`
	Output        string  `json:"output,omitempty"`
	Background    string  `json:"background,omitempty"`
	Sounds        *Sounds `json:"sounds,omitempty"`
	Games         []Game  `json:"games"`
}

// Sounds sind die optionalen Menü-Sounds (Assets).
type Sounds struct {
	Click string `json:"click,omitempty"`
	Hover string `json:"hover,omitempty"`
}

// Game ist ein Spiel auf der Disc.
type Game struct {
	Index           int      `json:"index"`
	Name            string   `json:"name"`
	Cover           string   `json:"cover,omitempty"`
	Description     string   `json:"description,omitempty"`
	Installer       string   `json:"installer"`
	Args            []string `json:"args,omitempty"`
	EstimatedSizeMB float64  `json:"estimatedSizeMB,omitempty"`
	Provider        string   `json:"provider,omitempty"`
	DLCs            []Entry  `json:"dlcs,omitempty"`
	Patches         []Entry  `json:"patches,omitempty"`
	Extras          []Entry  `json:"extras,omitempty"`
}

// Entry ist ein Eintrag in DLCs, Patches oder Extras. Genau eines von Installer oder Open ist gesetzt.
type Entry struct {
	Name        string   `json:"name"`
	Description string   `json:"description,omitempty"`
	Cover       string   `json:"cover,omitempty"`
	Group       string   `json:"group,omitempty"`
	Installer   string   `json:"installer,omitempty"`
	Args        []string `json:"args,omitempty"`
	Open        string   `json:"open,omitempty"`
}

// Sections nennt die drei Bereiche in fester Reihenfolge.
var Sections = []string{"dlcs", "patches", "extras"}

// SectionTitle ist die Überschrift eines Bereichs im Menü.
func SectionTitle(key string) string {
	switch key {
	case "dlcs":
		return "DLCs"
	case "patches":
		return "Patches"
	case "extras":
		return "Extras"
	}
	return key
}

// Entries liefert die Einträge eines Bereichs.
func (g *Game) Entries(section string) []Entry {
	switch section {
	case "dlcs":
		return g.DLCs
	case "patches":
		return g.Patches
	case "extras":
		return g.Extras
	}
	return nil
}

// ProviderID liefert den Anbieter mit Standard (gog).
func (g *Game) ProviderID() string {
	if g.Provider == "" {
		return ProviderGOG
	}
	return g.Provider
}

// Parse liest eine menu.json. Im strengen Modus sind unbekannte Felder ein Fehler (Builder),
// sonst werden sie ignoriert (Player, damit neuere Rezepte nicht scheitern).
// Die Spiele sind danach nach Index sortiert.
func Parse(data []byte, strict bool) (*Menu, error) {
	data = bytes.TrimPrefix(data, []byte("\xef\xbb\xbf"))
	dec := json.NewDecoder(bytes.NewReader(data))
	if strict {
		dec.DisallowUnknownFields()
	}
	var m Menu
	if err := dec.Decode(&m); err != nil {
		return nil, fmt.Errorf("menu.json ist ungültig: %w", err)
	}
	sort.SliceStable(m.Games, func(i, j int) bool { return m.Games[i].Index < m.Games[j].Index })
	return &m, nil
}
