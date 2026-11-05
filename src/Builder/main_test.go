package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	shared "github.com/einmensch002/discmenu-builder/src/Shared"
)

func writeRecipe(t *testing.T, menu string) string {
	t.Helper()
	dir := t.TempDir()
	os.MkdirAll(filepath.Join(dir, "assets"), 0o755)
	os.WriteFile(filepath.Join(dir, "assets", "c.png"), []byte("png"), 0o644)
	os.WriteFile(filepath.Join(dir, "menu.json"), []byte(menu), 0o644)
	return dir
}

const okMenu = `{"schemaVersion":1,"title":"T","output":"Mein-Menue.exe","games":[{"index":0,"name":"A","cover":"assets/c.png","installer":"A/setup.exe"}]}`

func fakePlayer(t *testing.T) string {
	p := filepath.Join(t.TempDir(), "Player.exe")
	os.WriteFile(p, append([]byte("MZ"), bytes.Repeat([]byte{1}, 500)...), 0o644)
	return p
}

func TestBuildCreatesMenuExe(t *testing.T) {
	recipe, player := writeRecipe(t, okMenu), fakePlayer(t)
	var out, errOut bytes.Buffer
	t.Setenv("DISCMENU_NO_PAUSE", "1")
	if code := run([]string{"-player", player, recipe}, strings.NewReader(""), &out, &errOut); code != 0 {
		t.Fatalf("Code %d: %s", code, errOut.String())
	}
	exe := filepath.Join(recipe, "Mein-Menue.exe")
	r, n, closeFn, err := shared.OpenPayload(exe)
	if err != nil {
		t.Fatal(err)
	}
	defer closeFn()
	buf := make([]byte, n)
	r.ReadAt(buf, 0)
	back, err := shared.LoadRecipeZip(buf, true)
	if err != nil || back.Menu.Title != "T" || !back.Exists("assets/c.png") {
		t.Fatalf("Paket: %v %+v", err, back)
	}
	data, _ := os.ReadFile(exe)
	if string(data[:2]) != "MZ" {
		t.Fatal("die EXE muss mit dem Player beginnen")
	}
}

func TestBuildTwiceDoesNotStackPayloads(t *testing.T) {
	recipe, player := writeRecipe(t, okMenu), fakePlayer(t)
	t.Setenv("DISCMENU_NO_PAUSE", "1")
	var o, e bytes.Buffer
	run([]string{"-player", player, recipe}, strings.NewReader(""), &o, &e)
	exe := filepath.Join(recipe, "Mein-Menue.exe")
	// Eine fertige Menü-EXE als "Player" verwenden: das alte Paket muss entfernt werden.
	out2 := filepath.Join(recipe, "Zweite.exe")
	if code := run([]string{"-player", exe, "-o", out2, recipe}, strings.NewReader(""), &o, &e); code != 0 {
		t.Fatalf("Code %d: %s", code, e.String())
	}
	a, _ := os.ReadFile(exe)
	b, _ := os.ReadFile(out2)
	if len(a) != len(b) {
		t.Fatalf("Größen %d und %d sollten gleich sein", len(a), len(b))
	}
}

func TestBuildRejectsBrokenRecipe(t *testing.T) {
	t.Setenv("DISCMENU_NO_PAUSE", "1")
	recipe := writeRecipe(t, `{"schemaVersion":1,"title":"","games":[{"index":0,"name":"A","cover":"assets/fehlt.png","installer":"C:\\x.exe"}]}`)
	var out, errOut bytes.Buffer
	if code := run([]string{"-player", fakePlayer(t), recipe}, strings.NewReader(""), &out, &errOut); code != 1 {
		t.Fatalf("Code %d", code)
	}
	for _, want := range []string{"Titel fehlt", "fehlt im Rezept", "relativ"} {
		if !strings.Contains(errOut.String(), want) {
			t.Errorf("Ausgabe enthält %q nicht:\n%s", want, errOut.String())
		}
	}
	if _, err := os.Stat(filepath.Join(recipe, "Setup-Menu.exe")); err == nil {
		t.Fatal("bei Fehlern darf keine EXE entstehen")
	}
}

func TestDiscCheckAndPlayerChecks(t *testing.T) {
	t.Setenv("DISCMENU_NO_PAUSE", "1")
	recipe := writeRecipe(t, okMenu)
	disc := t.TempDir()
	var out, errOut bytes.Buffer
	if code := run([]string{"-check", "-disc", disc, recipe}, strings.NewReader(""), &out, &errOut); code != 1 || !strings.Contains(errOut.String(), "nicht gefunden") {
		t.Fatalf("fehlender Installer: %d %s", code, errOut.String())
	}
	os.MkdirAll(filepath.Join(disc, "a"), 0o755)
	os.WriteFile(filepath.Join(disc, "a", "SETUP.EXE"), []byte("x"), 0o644)
	out.Reset()
	errOut.Reset()
	if code := run([]string{"-check", "-disc", disc, recipe}, strings.NewReader(""), &out, &errOut); code != 0 {
		t.Fatalf("Installer vorhanden (andere Schreibweise): %d %s", code, errOut.String())
	}
	notExe := filepath.Join(t.TempDir(), "x.exe")
	os.WriteFile(notExe, []byte("kein exe"), 0o644)
	errOut.Reset()
	if code := run([]string{"-player", notExe, recipe}, strings.NewReader(""), &out, &errOut); code != 1 || !strings.Contains(errOut.String(), "keine Windows") {
		t.Fatalf("Nicht-EXE: %d %s", code, errOut.String())
	}
}
