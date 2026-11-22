package shared

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Recipe ist ein gelesenes Rezept: menu.json plus Assets.
type Recipe struct {
	Menu   *Menu
	Raw    []byte // Inhalt der menu.json
	Assets fs.FS  // Wurzel = Ordner der menu.json
}

// Exists sagt, ob ein Asset im Rezept liegt.
func (r *Recipe) Exists(p string) bool {
	st, err := fs.Stat(r.Assets, p)
	return err == nil && !st.IsDir()
}

// ReadAsset liest ein Asset.
func (r *Recipe) ReadAsset(p string) ([]byte, error) { return fs.ReadFile(r.Assets, p) }

// LoadRecipe liest ein Rezept aus einer ZIP oder einem Ordner.
func LoadRecipe(path string, strict bool) (*Recipe, error) {
	st, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	var fsys fs.FS
	if st.IsDir() {
		fsys = os.DirFS(path)
	} else {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		return LoadRecipeZip(data, strict)
	}
	raw, err := readMenuJSON(fsys)
	if err != nil {
		return nil, fmt.Errorf("im Ordner: %w", err)
	}
	m, err := Parse(raw, strict)
	if err != nil {
		return nil, err
	}
	return &Recipe{Menu: m, Raw: raw, Assets: fsys}, nil
}

// LoadRecipeZip liest ein Rezept aus ZIP-Daten (Rezept-ZIP oder Paket in der Menü-EXE).
func LoadRecipeZip(data []byte, strict bool) (*Recipe, error) {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("ZIP nicht lesbar: %w", err)
	}
	raw, err := readMenuJSON(zr)
	if err != nil {
		return nil, fmt.Errorf("in der ZIP: %w", err)
	}
	m, err := Parse(raw, strict)
	if err != nil {
		return nil, err
	}
	return &Recipe{Menu: m, Raw: raw, Assets: zr}, nil
}

// readMenuJSON liest die menu.json eines Rezepts. Fehlt sie, wird die recipe.json der Web-App (gemeinsames Projekt von
// Menü und Hülle) gelesen und in eine menu.json umgewandelt.
func readMenuJSON(fsys fs.FS) ([]byte, error) {
	raw, err := fs.ReadFile(fsys, "menu.json")
	if err == nil {
		return raw, nil
	}
	rec, err2 := fs.ReadFile(fsys, "recipe.json")
	if err2 != nil {
		return nil, fmt.Errorf("es fehlt die recipe.json (oder menu.json) im Wurzelverzeichnis")
	}
	return MenuFromRecipe(rec)
}

// sharedGameFields ordnet die gemeinsamen Angaben der recipe.json ("game") den Feldern eines Spiels der menu.json zu.
var sharedGameFields = map[string]string{"title": "name", "provider": "provider", "description": "description", "sizeMB": "estimatedSizeMB", "cover": "cover"}

// MenuFromRecipe macht aus einer recipe.json den Inhalt einer menu.json: der Bereich "menu", beim Spiel "gameIndex"
// ergänzt um die gemeinsamen Angaben aus "game" (Titel, Anbieter, Beschreibung, Größe, Cover). Der Bereich "cover"
// (die Hülle) spielt für das Menü keine Rolle. Gleiche Regel wie menuJsonFromRecipe in app/project.js.
func MenuFromRecipe(raw []byte) ([]byte, error) {
	var r struct {
		Format    string                     `json:"format"`
		Version   int                        `json:"version"`
		GameIndex int                        `json:"gameIndex"`
		Game      map[string]json.RawMessage `json:"game"`
		Menu      map[string]json.RawMessage `json:"menu"`
	}
	if err := json.Unmarshal(raw, &r); err != nil {
		return nil, fmt.Errorf("recipe.json ist kein gültiges JSON: %w", err)
	}
	if r.Format != "discmenu-recipe" {
		return nil, fmt.Errorf("recipe.json hat ein unbekanntes Format (%q)", r.Format)
	}
	if r.Version > 1 {
		return nil, fmt.Errorf("recipe.json stammt aus einer neueren Version (%d)", r.Version)
	}
	if r.Menu == nil {
		return nil, fmt.Errorf("in der recipe.json fehlt der Bereich \"menu\"")
	}
	if g, ok := r.Menu["games"]; ok {
		var games []map[string]json.RawMessage
		if err := json.Unmarshal(g, &games); err != nil {
			return nil, fmt.Errorf("recipe.json: Spiele nicht lesbar: %w", err)
		}
		if len(games) > 0 {
			i := r.GameIndex
			if i < 0 || i >= len(games) {
				i = 0
			}
			for from, to := range sharedGameFields {
				if v, ok := r.Game[from]; ok && !emptyJSON(v) {
					games[i][to] = v
				}
			}
			b, err := json.Marshal(games)
			if err != nil {
				return nil, err
			}
			r.Menu["games"] = b
		}
	}
	return json.MarshalIndent(r.Menu, "", "  ")
}

func emptyJSON(v json.RawMessage) bool {
	s := strings.TrimSpace(string(v))
	return s == "" || s == "null" || s == `""`
}

// Referenced nennt alle im Menü verwendeten Assets, sortiert und ohne Doppelte.
func Referenced(m *Menu) []string {
	set := map[string]bool{}
	add := func(p string) {
		if p != "" {
			set[p] = true
		}
	}
	add(m.Background)
	if m.Sounds != nil {
		add(m.Sounds.Click)
		add(m.Sounds.Hover)
	}
	for _, g := range m.Games {
		add(g.Cover)
		for _, sec := range Sections {
			for _, it := range g.Entries(sec) {
				add(it.Cover)
			}
		}
	}
	out := make([]string, 0, len(set))
	for p := range set {
		out = append(out, p)
	}
	sort.Strings(out)
	return out
}

// BuildPayload packt menu.json und die verwendeten Assets in eine ZIP (Assets unkomprimiert,
// da Bilder und Sounds schon komprimiert sind).
func BuildPayload(r *Recipe) ([]byte, error) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	put := func(name string, data []byte, method uint16) error {
		w, err := zw.CreateHeader(&zip.FileHeader{Name: name, Method: method})
		if err != nil {
			return err
		}
		_, err = w.Write(data)
		return err
	}
	if err := put("menu.json", r.Raw, zip.Deflate); err != nil {
		return nil, err
	}
	for _, p := range Referenced(r.Menu) {
		data, err := r.ReadAsset(p)
		if err != nil {
			return nil, fmt.Errorf("Asset %q: %w", p, err)
		}
		if err := put(p, data, zip.Store); err != nil {
			return nil, err
		}
	}
	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ReadAll liest einen Reader komplett (kleine Hilfe für Tests und Builder).
func ReadAll(r io.Reader) ([]byte, error) { return io.ReadAll(r) }

// DefaultOutputName ergibt den Namen der Menü-EXE.
func DefaultOutputName(m *Menu) string {
	if strings.TrimSpace(m.Output) != "" {
		return m.Output
	}
	return "Setup-Menu.exe"
}

// CleanBase gibt nur den Dateinamen zurück.
func CleanBase(p string) string { return filepath.Base(p) }
