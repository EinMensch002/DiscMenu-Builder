package main

import (
	"encoding/json"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"testing"
	"time"

	shared "github.com/einmensch002/discmenu-builder/src/Shared"
)

func TestSplitCommandLine(t *testing.T) {
	got := splitCommandLine(`/VERYSILENT /DIR="C:\GOG Games\Test Spiel" /LOG="C:\t\l.log"  /X`)
	want := []string{"/VERYSILENT", `/DIR=C:\GOG Games\Test Spiel`, `/LOG=C:\t\l.log`, "/X"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("%q", got)
	}
	if len(splitCommandLine("")) != 0 {
		t.Fatal("leer sollte leer bleiben")
	}
}

func TestProviderBranding(t *testing.T) {
	seen := map[[4]uint8]string{}
	for _, info := range shared.Providers() {
		p := ProviderFor(info.ID)
		if p.ID() != info.ID {
			t.Errorf("ID %s != %s", p.ID(), info.ID)
		}
		if p.Brand().Name != info.Name {
			t.Errorf("Anzeigename %q != %q", p.Brand().Name, info.Name)
		}
		if p.CanInstall() != info.Supported {
			t.Errorf("%s: CanInstall %v, Shared sagt Supported %v", info.ID, p.CanInstall(), info.Supported)
		}
		a := p.Brand().Accent
		key := [4]uint8{a.R, a.G, a.B, a.A}
		if other, dup := seen[key]; dup {
			t.Errorf("%s und %s haben dieselbe Akzentfarbe", info.ID, other)
		}
		seen[key] = info.ID
	}
	if ProviderFor("").ID() != shared.ProviderGOG {
		t.Error("ohne Angabe gilt gog")
	}
}

func TestSilentCommandPerProvider(t *testing.T) {
	gog := &InstallJob{Provider: ProviderFor("gog"), Silent: true, Target: `C:\GOG Games\A B`, LogPath: `C:\t\x.log`, EntryArgs: []string{"/LANG=german"}}
	want := `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP- /DIR="C:\GOG Games\A B" /LOG="C:\t\x.log" /LANG=german`
	if gog.Command() != want {
		t.Fatalf("GOG: %s", gog.Command())
	}
	normal := &InstallJob{Provider: ProviderFor("gog"), Silent: false, EntryArgs: []string{"/LANG=german"}}
	if normal.Command() != "" {
		t.Fatal("im normalen Modus gibt es keine Parameter")
	}
	epic := &InstallJob{Provider: ProviderFor("epic"), Silent: true, EntryArgs: []string{"/quiet", "/norestart"}, Target: `C:\x`}
	if epic.Command() != "/quiet /norestart" {
		t.Fatalf("Epic nutzt nur die Parameter des Eintrags: %q", epic.Command())
	}
	if ProviderFor("epic").SilentAvailable(nil) {
		t.Fatal("Epic ohne Parameter: nicht still")
	}
	if ProviderFor("steam").CanInstall() {
		t.Fatal("Steam wird noch nicht installiert")
	}
}

type fakeRunner struct {
	exe, cmdline string
	hidden       bool
	code         int
	err          error
	hook         func()
}

func (f *fakeRunner) Run(exe, cmdline, dir string, hidden bool) (int, error) {
	f.exe, f.cmdline, f.hidden = exe, cmdline, hidden
	if f.hook != nil {
		f.hook()
	}
	return f.code, f.err
}

func waitDone(t *testing.T, st *InstallState) InstallInfo {
	t.Helper()
	for i := 0; i < 400; i++ {
		if s := st.Snapshot(); s.Done {
			return s
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("Installation wurde nicht fertig")
	return InstallInfo{}
}

type fakeDetector struct{}

func (fakeDetector) Snapshot() map[string]string    { return map[string]string{} }
func (fakeDetector) Found(map[string]string) string { return `C:\GOG Games\Neu` }

func TestInstallSuccessAndFailure(t *testing.T) {
	r := &fakeRunner{}
	job := &InstallJob{Title: "X", Provider: ProviderFor("gog"), Installer: "/x/setup.exe", Silent: true, Target: t.TempDir(), EstimateMB: 1}
	info := waitDone(t, StartInstall(job, r, fakeDetector{}))
	if !info.Success() || info.Found != `C:\GOG Games\Neu` || info.Progress != 1 || !r.hidden {
		t.Fatalf("Erfolg: %+v", info)
	}
	ok, txt := describeResult(info)
	if !ok || !strings.Contains(txt, "Installiert nach") {
		t.Fatalf("Text: %s", txt)
	}

	log := filepath.Join(t.TempDir(), "i.log")
	os.WriteFile(log, []byte("Zeile 1\r\nFehler: Platte voll\r\n"), 0o644)
	job2 := &InstallJob{Title: "Y", Provider: ProviderFor("gog"), Installer: "/x/setup.exe", LogPath: log}
	info = waitDone(t, StartInstall(job2, &fakeRunner{code: 5}, fakeDetector{}))
	ok, txt = describeResult(info)
	if ok || info.Found != "" || !strings.Contains(txt, "Code 5") || !strings.Contains(txt, "Administratorrechte") || !strings.Contains(txt, "Platte voll") {
		t.Fatalf("Fehler: %v %s", ok, txt)
	}

	info = waitDone(t, StartInstall(job2, &fakeRunner{err: errors.New("kaputt")}, nil))
	if ok, txt = describeResult(info); ok || !strings.Contains(txt, "kaputt") {
		t.Fatalf("Startfehler: %s", txt)
	}
}

func TestProgressFollowsTargetSize(t *testing.T) {
	target := t.TempDir()
	r := &fakeRunner{hook: func() {
		os.WriteFile(filepath.Join(target, "a.bin"), make([]byte, 512*1024), 0o644)
		time.Sleep(1600 * time.Millisecond)
	}}
	job := &InstallJob{Title: "P", Provider: ProviderFor("gog"), Installer: "/x", Silent: true, Target: target, EstimateMB: 1}
	st := StartInstall(job, r, nil)
	time.Sleep(1200 * time.Millisecond)
	p := st.Snapshot().Progress
	if p < 0.4 || p > 0.6 {
		t.Fatalf("Fortschritt sollte bei etwa 50 %% liegen: %v", p)
	}
	if !waitDone(t, st).Success() {
		t.Fatal("sollte erfolgreich enden")
	}
}

// Ein echter Fake-Installer (Shell-Skript) prüft Start, Parameter, Exit-Code und Warten unter Linux.
func TestOSRunnerWithFakeInstaller(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Skript-Installer nur unter Linux")
	}
	dir := t.TempDir()
	out := filepath.Join(dir, "args.txt")
	script := filepath.Join(dir, "setup.sh")
	os.WriteFile(script, []byte("#!/bin/sh\nsleep 0.2\nprintf '%s\\n' \"$@\" > '"+out+"'\nexit 3\n"), 0o755)
	code, err := newRunner().Run(script, `/VERYSILENT /DIR="a b" /X`, dir, true)
	if err != nil || code != 3 {
		t.Fatalf("code %d err %v", code, err)
	}
	data, _ := os.ReadFile(out)
	if strings.TrimSpace(string(data)) != "/VERYSILENT\n/DIR=a b\n/X" {
		t.Fatalf("Parameter: %q", data)
	}
	if _, err := newRunner().Run(filepath.Join(dir, "gibtsnicht"), "", dir, false); err == nil {
		t.Fatal("fehlender Installer sollte einen Fehler liefern")
	}
}

func TestDefaultTargetAndFormat(t *testing.T) {
	if got := defaultTarget(`Sid Meier's: Civ/III?`); got != `C:\GOG Games\Sid Meier's CivIII` {
		t.Fatalf("%q", got)
	}
	if formatMB(1536) != "1.5 GB" || formatMB(800) != "800 MB" {
		t.Fatal("formatMB")
	}
}

func TestLayoutScaling(t *testing.T) {
	a := &App{}
	if w, h := a.Layout(1920, 1080); w != 1280 || h != 720 {
		t.Fatalf("Full HD: %dx%d", w, h)
	}
	if w, h := a.Layout(1280, 1024); w != 960 || h < 720 {
		t.Fatalf("schmal: %dx%d", w, h)
	}
}

// Das Paket am Ende einer Datei wird wirklich als Menü gelesen (so wie in der fertigen Menü-EXE).
func TestLoadRecipeFromAppendedPayload(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "menu.json"), []byte(`{"schemaVersion":1,"title":"Aus dem Paket","games":[{"index":0,"name":"A","installer":"a.exe"}]}`), 0o644)
	rec, err := shared.LoadRecipe(dir, true)
	if err != nil {
		t.Fatal(err)
	}
	payload, err := shared.BuildPayload(rec)
	if err != nil {
		t.Fatal(err)
	}
	exe := filepath.Join(dir, "Menu.exe")
	os.WriteFile(exe, shared.Append(append([]byte("MZ"), make([]byte, 1000)...), payload), 0o755)
	got, err := loadRecipe("", exe)
	if err != nil || got.Menu.Title != "Aus dem Paket" {
		t.Fatalf("%v %+v", err, got)
	}
	plain := filepath.Join(dir, "Player.exe")
	os.WriteFile(plain, []byte("MZ-nur-der-player"), 0o755)
	if _, err := loadRecipe("", plain); err == nil || !strings.Contains(err.Error(), "kein Menü-Paket") {
		t.Fatalf("ohne Paket: %v", err)
	}
}

// Die Vorschau im Konfigurator (JavaScript) und der Player (Go) müssen dieselben Parameter bilden.
func TestCommandLineMatchesWebPreview(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("node nicht installiert")
	}
	out, err := exec.Command(node, filepath.Join("..", "..", "tests", "plan-fixture.js")).Output()
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct {
		Provider  string   `json:"provider"`
		Silent    bool     `json:"silent"`
		Target    string   `json:"target"`
		LogPath   string   `json:"logPath"`
		EntryArgs []string `json:"entryArgs"`
		Available bool     `json:"available"`
		Command   string   `json:"command"`
	}
	if err := json.Unmarshal(out, &cases); err != nil || len(cases) == 0 {
		t.Fatalf("Fälle: %v", err)
	}
	for i, c := range cases {
		prov := ProviderFor(c.Provider)
		if prov.SilentAvailable(c.EntryArgs) != c.Available {
			t.Errorf("Fall %d: SilentAvailable Go=%v JS=%v", i, prov.SilentAvailable(c.EntryArgs), c.Available)
		}
		job := &InstallJob{Provider: prov, Silent: c.Silent, Target: c.Target, LogPath: c.LogPath, EntryArgs: c.EntryArgs}
		if got := job.Command(); got != c.Command {
			t.Errorf("Fall %d (%s): Go %q, JS %q", i, c.Provider, got, c.Command)
		}
	}
}
