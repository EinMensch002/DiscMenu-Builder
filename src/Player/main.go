// Player: das Menü, das auf der Disc liegt. Es liest sein Paket aus dem Ende der eigenen EXE.
package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/hajimehoshi/ebiten/v2"

	shared "github.com/einmensch002/discmenu-builder/src/Shared"
)

// version wird beim Bauen gesetzt (-ldflags "-X main.version=...").
var version = "dev"

func main() {
	var (
		recipePath = flag.String("recipe", "", "Entwicklung: Rezept (ZIP oder Ordner) statt des angehängten Pakets verwenden")
		disc       = flag.String("disc", "", "Disc-Ordner (Standard: Ordner dieser EXE)")
		graphics   = flag.String("graphics", "auto", "Grafik: auto, directx oder opengl (opengl hilft manchmal unter Wine)")
		selftest   = flag.Bool("selftest", false, "Paket lesen und prüfen, Ergebnis ausgeben, kein Fenster öffnen")
		showVer    = flag.Bool("version", false, "Version ausgeben")
		scene      = flag.String("scene", "", "Entwicklung: Startansicht, z. B. game:0:patches")
		shot       = flag.String("shot", "", "Entwicklung: Screenshot speichern und beenden")
		size       = flag.String("size", "1280x720", "Fenstergröße")
	)
	flag.Parse()
	if *showVer || *selftest {
		attachConsole()
	}
	if *showVer {
		fmt.Println("DiscMenu Player", version)
		return
	}

	self, _ := os.Executable()
	root := *disc
	if root == "" {
		root = filepath.Dir(self)
	}
	r, err := loadRecipe(*recipePath, self)
	if err != nil {
		fatal("Menü konnte nicht geladen werden", err.Error())
	}
	issues := shared.Validate(r.Menu, r.Exists)
	if *selftest {
		fmt.Printf("Menü %q: %d Spiel(e), %d Asset(s), Disc-Ordner %s\n", r.Menu.Title, len(r.Menu.Games), len(shared.Referenced(r.Menu)), root)
		for _, i := range issues {
			fmt.Println(i)
		}
		if shared.HasErrors(issues) {
			os.Exit(1)
		}
		return
	}
	if shared.HasErrors(issues) {
		var sb strings.Builder
		for _, i := range issues {
			if i.Error {
				sb.WriteString(i.Msg + "\n")
			}
		}
		fatal("Das Menü ist fehlerhaft", sb.String())
	}

	app, err := newApp(r, root)
	if err != nil {
		fatal("Start fehlgeschlagen", err.Error())
	}
	applyScene(app, *scene)
	app.shotTo = *shot

	w, h := 1280, 720
	if parts := strings.SplitN(*size, "x", 2); len(parts) == 2 {
		if a, e1 := strconv.Atoi(parts[0]); e1 == nil {
			if b, e2 := strconv.Atoi(parts[1]); e2 == nil && a >= 480 && b >= 360 {
				w, h = a, b
			}
		}
	}
	ebiten.SetWindowSize(w, h)
	ebiten.SetWindowSizeLimits(800, 600, -1, -1)
	ebiten.SetWindowTitle(r.Menu.Title)
	ebiten.SetWindowResizingMode(ebiten.WindowResizingModeEnabled)
	ebiten.SetWindowClosingHandled(true)
	ebiten.SetScreenClearedEveryFrame(true)
	opts := &ebiten.RunGameOptions{}
	switch strings.ToLower(*graphics) {
	case "opengl":
		opts.GraphicsLibrary = ebiten.GraphicsLibraryOpenGL
	case "directx":
		opts.GraphicsLibrary = ebiten.GraphicsLibraryDirectX
	}
	if err := ebiten.RunGameWithOptions(app, opts); err != nil {
		fatal("Das Menü ist abgestürzt", err.Error())
	}
}

// loadRecipe nimmt entweder ein Rezept aus -recipe oder das Paket am Ende der eigenen EXE.
func loadRecipe(recipePath, self string) (*shared.Recipe, error) {
	if recipePath != "" {
		return shared.LoadRecipe(recipePath, false)
	}
	pr, n, closeFn, err := shared.OpenPayload(self)
	if err != nil {
		if err == shared.ErrNoPayload {
			return nil, fmt.Errorf("An dieser Datei hängt kein Menü-Paket.\nDer Player ist nur die Vorlage, erst der Builder macht daraus eine Menü-EXE.")
		}
		return nil, err
	}
	defer closeFn()
	buf := make([]byte, n)
	if _, err := pr.ReadAt(buf, 0); err != nil {
		return nil, err
	}
	return shared.LoadRecipeZip(buf, false)
}

func applyScene(a *App, scene string) {
	parts := strings.Split(scene, ":")
	if len(parts) >= 2 && parts[0] == "game" {
		if i, err := strconv.Atoi(parts[1]); err == nil && i >= 0 && i < len(a.menu.Games) {
			a.openGame(i)
			if len(parts) >= 3 {
				a.tab = parts[2]
			}
		}
	}
	if len(parts) >= 4 && parts[3] == "silent" {
		a.silent = true
		a.targets[a.cur] = defaultTarget(a.game().Name)
	}
}

func fatal(title, msg string) {
	fatalDialog(title, msg)
	fmt.Fprintln(os.Stderr, title+": "+msg)
	os.Exit(1)
}
