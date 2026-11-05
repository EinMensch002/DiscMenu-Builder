package shared

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func exampleMenu(t *testing.T) *Menu {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join("..", "..", "examples", "menu.example.json"))
	if err != nil {
		t.Fatal(err)
	}
	m, err := Parse(raw, true)
	if err != nil {
		t.Fatal(err)
	}
	return m
}

func TestExampleParsesAndValidates(t *testing.T) {
	m := exampleMenu(t)
	if len(m.Games) != 3 || m.Games[0].Name != "Beispiel-Spiel 1" {
		t.Fatalf("unerwartete Spiele: %+v", m.Games)
	}
	if got := Validate(m, func(string) bool { return true }); HasErrors(got) {
		t.Fatalf("Beispiel sollte gültig sein: %v", got)
	}
}

func TestParseStrictRejectsUnknownFields(t *testing.T) {
	data := []byte(`{"schemaVersion":1,"title":"T","games":[],"neu":1}`)
	if _, err := Parse(data, true); err == nil {
		t.Fatal("streng sollte ein unbekanntes Feld ablehnen")
	}
	if _, err := Parse(data, false); err != nil {
		t.Fatalf("locker sollte es ignorieren: %v", err)
	}
	if _, err := Parse([]byte("\xef\xbb\xbf"+`{"schemaVersion":1}`), false); err != nil {
		t.Fatalf("BOM sollte erlaubt sein: %v", err)
	}
}

func TestParseSortsByIndex(t *testing.T) {
	m, err := Parse([]byte(`{"schemaVersion":1,"title":"T","games":[{"index":2,"name":"C","installer":"c"},{"index":0,"name":"A","installer":"a"},{"index":1,"name":"B","installer":"b"}]}`), true)
	if err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, g := range m.Games {
		names = append(names, g.Name)
	}
	if strings.Join(names, "") != "ABC" {
		t.Fatalf("Reihenfolge: %v", names)
	}
}

func TestValidateRules(t *testing.T) {
	base := func() *Menu {
		return &Menu{SchemaVersion: 1, Title: "T", Games: []Game{{Index: 0, Name: "A", Installer: "a/setup.exe"}}}
	}
	has := func(list []Issue, sub string) bool {
		for _, i := range list {
			if strings.Contains(i.Msg, sub) {
				return true
			}
		}
		return false
	}
	cases := []struct {
		name string
		mut  func(m *Menu)
		want string
	}{
		{"Version", func(m *Menu) { m.SchemaVersion = 2 }, "schemaVersion"},
		{"Titel", func(m *Menu) { m.Title = " " }, "Titel fehlt"},
		{"EXE-Name", func(m *Menu) { m.Output = "a/b.exe" }, "ungültige Zeichen"},
		{"keine Spiele", func(m *Menu) { m.Games = nil }, "mindestens ein Spiel"},
		{"doppelter Index", func(m *Menu) { m.Games = append(m.Games, Game{Index: 0, Name: "B", Installer: "b.exe"}) }, "mehrfach"},
		{"negativer Index", func(m *Menu) { m.Games[0].Index = -1 }, "0 oder größer"},
		{"absoluter Installer", func(m *Menu) { m.Games[0].Installer = `C:\x.exe` }, "relativ"},
		{"Punkt-Punkt", func(m *Menu) { m.Games[0].Installer = "../x.exe" }, `".."`},
		{"Anbieter", func(m *Menu) { m.Games[0].Provider = "origin" }, "unbekannt"},
		{"Asset-Pfad", func(m *Menu) { m.Background = "bild.png" }, "assets/"},
		{"Asset fehlt", func(m *Menu) { m.Background = "assets/x.png" }, "fehlt im Rezept"},
		{"Eintrag ohne Aktion", func(m *Menu) { m.Games[0].Extras = []Entry{{Name: "X"}} }, "installer oder open"},
		{"Eintrag mit beidem", func(m *Menu) { m.Games[0].Extras = []Entry{{Name: "X", Installer: "a", Open: "b"}} }, "nur eines"},
		{"args bei open", func(m *Menu) { m.Games[0].Extras = []Entry{{Name: "X", Open: "b", Args: []string{"/S"}}} }, "args"},
	}
	for _, c := range cases {
		m := base()
		c.mut(m)
		if got := Validate(m, func(string) bool { return false }); !has(got, c.want) || !HasErrors(got) {
			t.Errorf("%s: erwartet Fehler mit %q, bekam %v", c.name, c.want, got)
		}
	}
	m := base()
	m.Games[0].Extras = []Entry{{Name: "L", Open: "https://example.com"}, {Name: "O", Open: "Spiel/Extras"}}
	m.Games[0].Provider = ProviderEpic
	if got := Validate(m, nil); HasErrors(got) {
		t.Errorf("gültiges Rezept: %v", got)
	}
	m.Games[0].Provider = ProviderSteam
	got := Validate(m, nil)
	if HasErrors(got) || !has(got, "noch nicht") {
		t.Errorf("Steam sollte nur einen Hinweis liefern: %v", got)
	}
}

func TestPayloadRoundTrip(t *testing.T) {
	player := bytes.Repeat([]byte("MZ-player-"), 100)
	payload := []byte("zip-bytes")
	exe := Append(player, payload)
	start, n, err := Locate(bytes.NewReader(exe), int64(len(exe)))
	if err != nil || start != int64(len(player)) || n != int64(len(payload)) {
		t.Fatalf("Locate: %d %d %v", start, n, err)
	}
	if !bytes.Equal(StripPayload(exe), player) {
		t.Fatal("StripPayload liefert nicht den ursprünglichen Player")
	}
	if _, _, err := Locate(bytes.NewReader(player), int64(len(player))); err != ErrNoPayload {
		t.Fatalf("ohne Paket: %v", err)
	}
	bad := Append(player, payload)
	copy(bad[len(bad)-16:], []byte{0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f})
	if _, _, err := Locate(bytes.NewReader(bad), int64(len(bad))); err == nil || err == ErrNoPayload {
		t.Fatalf("beschädigte Länge sollte einen Fehler liefern: %v", err)
	}
}

func TestResolveOnDiscCaseInsensitive(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "Spiel1", "Patches"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "Spiel1", "Patches", "DE.EXE"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := ResolveOnDisc(root, `spiel1\patches/de.exe`)
	if err != nil || filepath.Base(got) != "DE.EXE" {
		t.Fatalf("ResolveOnDisc: %q %v", got, err)
	}
	if _, err := ResolveOnDisc(root, "Spiel1/fehlt.exe"); err == nil {
		t.Fatal("fehlende Datei sollte einen Fehler liefern")
	}
}

func TestBuildPayloadFromFolder(t *testing.T) {
	dir := t.TempDir()
	os.MkdirAll(filepath.Join(dir, "assets"), 0o755)
	os.WriteFile(filepath.Join(dir, "assets", "c.png"), []byte("png"), 0o644)
	os.WriteFile(filepath.Join(dir, "assets", "unbenutzt.png"), []byte("x"), 0o644)
	os.WriteFile(filepath.Join(dir, "menu.json"), []byte(`{"schemaVersion":1,"title":"T","games":[{"index":0,"name":"A","cover":"assets/c.png","installer":"a.exe"}]}`), 0o644)
	r, err := LoadRecipe(dir, true)
	if err != nil {
		t.Fatal(err)
	}
	zipData, err := BuildPayload(r)
	if err != nil {
		t.Fatal(err)
	}
	back, err := LoadRecipeZip(zipData, true)
	if err != nil {
		t.Fatal(err)
	}
	if !back.Exists("assets/c.png") || back.Exists("assets/unbenutzt.png") {
		t.Fatal("nur verwendete Assets gehören ins Paket")
	}
}

// Ein vom Konfigurator erzeugtes Rezept muss vom Go-Teil streng gelesen und als gültig erkannt werden.
func TestKonfiguratorExportLoads(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("node nicht installiert")
	}
	out := filepath.Join(t.TempDir(), "export.zip")
	cmd := exec.Command(node, filepath.Join("..", "..", "tests", "export-fixture.js"), out)
	if b, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("Export: %v %s", err, b)
	}
	r, err := LoadRecipe(out, true)
	if err != nil {
		t.Fatal(err)
	}
	if got := Validate(r.Menu, r.Exists); HasErrors(got) {
		t.Fatalf("Export des Konfigurators ist laut Go ungültig: %v", got)
	}
	g := r.Menu.Games
	if g[0].Name != "Größen-Spiel" || g[0].Description != "Umlaute: äöüß" || g[0].EstimatedSizeMB != 1500 {
		t.Fatalf("Spiel 0: %+v", g[0])
	}
	if g[0].Installer != "Spiel1/setup.exe" || len(g[0].Args) != 2 || g[0].Args[1] != `"/X=a b"` {
		t.Fatalf("Installer und Parameter: %+v", g[0])
	}
	if g[1].ProviderID() != ProviderEpic || g[2].ProviderID() != ProviderSteam || g[0].ProviderID() != ProviderGOG {
		t.Fatal("Anbieter")
	}
	if _, err := BuildPayload(r); err != nil {
		t.Fatal(err)
	}
}
