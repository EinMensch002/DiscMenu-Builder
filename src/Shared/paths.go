package shared

import (
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var driveRe = regexp.MustCompile(`^[a-zA-Z]:`)

// IsURL erkennt http- und https-Links.
func IsURL(p string) bool {
	l := strings.ToLower(p)
	return strings.HasPrefix(l, "http://") || strings.HasPrefix(l, "https://")
}

// RelPathIssue prüft einen Pfad relativ zur Disc. Leere Rückgabe bedeutet in Ordnung.
func RelPathIssue(p string) string {
	if driveRe.MatchString(p) || strings.HasPrefix(p, "/") || strings.HasPrefix(p, `\`) {
		return "muss relativ zur Disc sein (kein Laufwerk, kein führender Schrägstrich)"
	}
	for _, part := range strings.FieldsFunc(p, func(r rune) bool { return r == '/' || r == '\\' }) {
		if part == ".." {
			return `darf kein ".." enthalten`
		}
	}
	return ""
}

// AssetPathIssue prüft einen Asset-Pfad (relativ zur menu.json, unter assets/).
func AssetPathIssue(p string) string {
	if !strings.HasPrefix(p, "assets/") || len(p) == len("assets/") {
		return `muss mit "assets/" beginnen`
	}
	if strings.ContainsAny(p, `\:`) {
		return `darf weder "\" noch ":" enthalten`
	}
	for _, part := range strings.Split(p, "/") {
		if part == ".." || part == "" {
			return `darf kein ".." und keine leeren Teile enthalten`
		}
	}
	return ""
}

// ResolveOnDisc setzt einen Pfad aus der menu.json (mit "/" oder "\") unter der Disc-Wurzel zusammen.
// Existiert der Pfad nur in anderer Groß-/Kleinschreibung, wird diese gefunden (Discs und
// Linux-Dateisysteme sind sonst empfindlich, Windows nicht). Gibt den gefundenen Pfad zurück
// oder, wenn nichts passt, den einfach zusammengesetzten Pfad und os.ErrNotExist.
func ResolveOnDisc(root, rel string) (string, error) {
	parts := strings.FieldsFunc(rel, func(r rune) bool { return r == '/' || r == '\\' })
	plain := filepath.Join(append([]string{root}, parts...)...)
	if _, err := os.Stat(plain); err == nil {
		return plain, nil
	}
	cur := root
	for _, part := range parts {
		next := filepath.Join(cur, part)
		if _, err := os.Stat(next); err == nil {
			cur = next
			continue
		}
		entries, err := os.ReadDir(cur)
		if err != nil {
			return plain, os.ErrNotExist
		}
		found := false
		for _, e := range entries {
			if strings.EqualFold(e.Name(), part) {
				cur = filepath.Join(cur, e.Name())
				found = true
				break
			}
		}
		if !found {
			return plain, os.ErrNotExist
		}
	}
	return cur, nil
}

// ErrNotFound wird gemeldet, wenn ein Pfad auf der Disc fehlt.
var ErrNotFound = errors.New("nicht gefunden")
