package shared

import (
	"fmt"
	"os"
	"regexp"
	"strings"
)

// Issue ist ein Prüfergebnis.
type Issue struct {
	Error bool
	Msg   string
}

func (i Issue) String() string {
	if i.Error {
		return "Fehler: " + i.Msg
	}
	return "Hinweis: " + i.Msg
}

// HasErrors sagt, ob mindestens ein Fehler dabei ist.
func HasErrors(list []Issue) bool {
	for _, i := range list {
		if i.Error {
			return true
		}
	}
	return false
}

var badFileName = regexp.MustCompile(`[\\/:*?"<>|]`)

// Validate prüft ein Rezept nach docs/menu-json-spec.md. assetExists sagt, ob ein Asset im Rezept liegt.
func Validate(m *Menu, assetExists func(path string) bool) []Issue {
	var out []Issue
	E := func(f string, a ...any) { out = append(out, Issue{true, fmt.Sprintf(f, a...)}) }
	W := func(f string, a ...any) { out = append(out, Issue{false, fmt.Sprintf(f, a...)}) }

	asset := func(where, p string) {
		if p == "" {
			return
		}
		if x := AssetPathIssue(p); x != "" {
			E("%s: Asset-Pfad %q %s.", where, p, x)
		} else if assetExists != nil && !assetExists(p) {
			E("%s: Asset %q fehlt im Rezept.", where, p)
		}
	}

	if m.SchemaVersion != SchemaVersion {
		E("schemaVersion %d ist unbekannt (erwartet: %d).", m.SchemaVersion, SchemaVersion)
	}
	if strings.TrimSpace(m.Title) == "" {
		E("Titel fehlt.")
	}
	if m.Output != "" {
		if badFileName.MatchString(m.Output) {
			E("Der EXE-Name %q enthält ungültige Zeichen.", m.Output)
		} else if !strings.HasSuffix(strings.ToLower(m.Output), ".exe") {
			W("Der EXE-Name %q sollte auf .exe enden.", m.Output)
		}
	}
	asset("Hintergrund", m.Background)
	if m.Sounds != nil {
		asset("Klick-Sound", m.Sounds.Click)
		asset("Hover-Sound", m.Sounds.Hover)
	}
	if len(m.Games) == 0 {
		E("Es wird mindestens ein Spiel benötigt.")
	}
	seen := map[int]bool{}
	for i := range m.Games {
		g := &m.Games[i]
		gn := fmt.Sprintf("Spiel %d (%s)", g.Index, orDash(g.Name))
		if g.Index < 0 {
			E("%s: index muss 0 oder größer sein.", gn)
		}
		if seen[g.Index] {
			E("%s: index %d kommt mehrfach vor.", gn, g.Index)
		}
		seen[g.Index] = true
		if strings.TrimSpace(g.Name) == "" {
			E("%s: Name fehlt.", gn)
		}
		asset(gn+", Cover", g.Cover)
		if strings.TrimSpace(g.Installer) == "" {
			E("%s: Installer-Pfad fehlt.", gn)
		} else if x := RelPathIssue(g.Installer); x != "" {
			E("%s: Installer-Pfad %s.", gn, x)
		}
		if g.EstimatedSizeMB < 0 {
			E("%s: estimatedSizeMB muss größer als 0 sein.", gn)
		}
		if info, ok := LookupProvider(g.Provider); !ok {
			E("%s: provider %q ist unbekannt (erlaubt: gog, epic, steam).", gn, g.Provider)
		} else if !info.Supported {
			W("%s: %s", gn, info.Note)
		} else if info.Note != "" {
			W("%s: %s", gn, info.Note)
		}
		for _, sec := range Sections {
			for j, it := range g.Entries(sec) {
				en := fmt.Sprintf("%s, %s %d (%s)", gn, SectionTitle(sec), j+1, orDash(it.Name))
				if strings.TrimSpace(it.Name) == "" {
					E("%s: Name fehlt.", en)
				}
				asset(en+", Bild", it.Cover)
				switch {
				case it.Installer != "" && it.Open != "":
					E("%s: Es darf nur eines von installer oder open gesetzt sein.", en)
				case it.Installer == "" && it.Open == "":
					E("%s: Es fehlt installer oder open.", en)
				case it.Installer != "":
					if x := RelPathIssue(it.Installer); x != "" {
						E("%s: Installer-Pfad %s.", en, x)
					}
				default:
					if len(it.Args) > 0 {
						E("%s: args gehört nur zu einem Installer.", en)
					}
					if !IsURL(it.Open) {
						if x := RelPathIssue(it.Open); x != "" {
							E("%s: Pfad %s.", en, x)
						}
					}
				}
			}
		}
	}
	return out
}

// CheckDisc prüft, ob Installer und Extras unter der Disc-Wurzel existieren.
func CheckDisc(m *Menu, root string) []Issue {
	var out []Issue
	check := func(where, rel string, mustBeFile bool) {
		if rel == "" || IsURL(rel) || RelPathIssue(rel) != "" {
			return
		}
		p, err := ResolveOnDisc(root, rel)
		if err != nil {
			out = append(out, Issue{true, fmt.Sprintf("%s: %q nicht gefunden.", where, rel)})
			return
		}
		if st, err := os.Stat(p); err == nil && mustBeFile && st.IsDir() {
			out = append(out, Issue{true, fmt.Sprintf("%s: %q ist ein Ordner, erwartet wird eine Datei.", where, rel)})
		}
	}
	for i := range m.Games {
		g := &m.Games[i]
		gn := fmt.Sprintf("Spiel %d (%s)", g.Index, orDash(g.Name))
		check(gn+", Installer", g.Installer, true)
		for _, sec := range Sections {
			for j, it := range g.Entries(sec) {
				en := fmt.Sprintf("%s, %s %d (%s)", gn, SectionTitle(sec), j+1, orDash(it.Name))
				if it.Installer != "" {
					check(en, it.Installer, true)
				} else {
					check(en, it.Open, false)
				}
			}
		}
	}
	return out
}

func orDash(s string) string {
	if strings.TrimSpace(s) == "" {
		return "ohne Namen"
	}
	return s
}
