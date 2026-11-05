// Builder: setzt aus einem Rezept (ZIP oder Ordner) und dem fertigen Player die Menü-EXE zusammen.
//
// Aufruf:  Builder [Optionen] <rezept.zip|Ordner>
// Auch per Drag-and-drop: ZIP auf Builder.exe ziehen.
package main

import (
	"bufio"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	shared "github.com/einmensch002/discmenu-builder/src/Shared"
)

func main() {
	os.Exit(run(os.Args[1:], os.Stdin, os.Stdout, os.Stderr))
}

func run(args []string, in io.Reader, out, errOut io.Writer) int {
	fs := flag.NewFlagSet("Builder", flag.ContinueOnError)
	fs.SetOutput(errOut)
	player := fs.String("player", "", "Pfad zur Player.exe (Standard: Player.exe neben dem Builder)")
	output := fs.String("o", "", "Ausgabedatei (Standard: Feld \"output\" der menu.json, neben dem Rezept)")
	disc := fs.String("disc", "", "Disc-Ordner: prüft, ob Installer und Extras dort vorhanden sind")
	check := fs.Bool("check", false, "Nur prüfen, nichts erzeugen")
	pause := fs.Bool("pause", false, "Am Ende auf Enter warten (praktisch bei Drag-and-drop)")
	fs.Usage = func() {
		fmt.Fprintln(errOut, "Aufruf: Builder [Optionen] <rezept.zip|Ordner>")
		fs.PrintDefaults()
	}
	if err := fs.Parse(args); err != nil {
		return 2
	}
	code := build(fs, *player, *output, *disc, *check, in, out, errOut)
	if *pause || (os.Getenv("DISCMENU_NO_PAUSE") == "" && ownsConsole()) {
		fmt.Fprint(out, "\nEnter drücken zum Beenden ...")
		bufio.NewReader(in).ReadString('\n')
	}
	return code
}

func build(fs *flag.FlagSet, playerPath, outPath, disc string, checkOnly bool, in io.Reader, out, errOut io.Writer) int {
	if fs.NArg() != 1 {
		fs.Usage()
		return 2
	}
	recipePath := fs.Arg(0)
	r, err := shared.LoadRecipe(recipePath, true)
	if err != nil {
		fmt.Fprintln(errOut, "Rezept konnte nicht gelesen werden:", err)
		return 1
	}
	issues := shared.Validate(r.Menu, r.Exists)
	if disc != "" {
		issues = append(issues, shared.CheckDisc(r.Menu, disc)...)
	}
	for _, i := range issues {
		fmt.Fprintln(errOut, i)
	}
	if shared.HasErrors(issues) {
		fmt.Fprintln(errOut, "Das Rezept hat Fehler. Es wurde nichts erzeugt.")
		return 1
	}
	if checkOnly {
		fmt.Fprintf(out, "Rezept in Ordnung (%d Spiel(e), %d Asset(s)).\n", len(r.Menu.Games), len(shared.Referenced(r.Menu)))
		return 0
	}

	if playerPath == "" {
		self, _ := os.Executable()
		playerPath = filepath.Join(filepath.Dir(self), "Player.exe")
	}
	player, err := os.ReadFile(playerPath)
	if err != nil {
		fmt.Fprintf(errOut, "Player nicht gefunden (%s). Mit -player den Pfad zur Player.exe angeben.\n", playerPath)
		return 1
	}
	if len(player) < 2 || player[0] != 'M' || player[1] != 'Z' {
		fmt.Fprintf(errOut, "%s ist keine Windows-Programmdatei (EXE).\n", playerPath)
		return 1
	}
	player = shared.StripPayload(player)

	payload, err := shared.BuildPayload(r)
	if err != nil {
		fmt.Fprintln(errOut, "Paket konnte nicht erstellt werden:", err)
		return 1
	}

	if outPath == "" {
		dir := "."
		if st, err := os.Stat(recipePath); err == nil {
			if st.IsDir() {
				dir = recipePath
			} else {
				dir = filepath.Dir(recipePath)
			}
		}
		outPath = filepath.Join(dir, filepath.Base(shared.DefaultOutputName(r.Menu)))
	}
	if strings.EqualFold(filepath.Clean(outPath), filepath.Clean(playerPath)) {
		fmt.Fprintln(errOut, "Die Ausgabedatei darf nicht die Player.exe selbst sein.")
		return 1
	}
	if err := os.WriteFile(outPath, shared.Append(player, payload), 0o755); err != nil {
		fmt.Fprintln(errOut, "Schreiben fehlgeschlagen:", err)
		return 1
	}
	fmt.Fprintf(out, "Fertig: %s (%.1f MB, Paket %.1f MB)\n", outPath, float64(len(player)+len(payload))/1048576, float64(len(payload))/1048576)
	fmt.Fprintln(out, "Die Menü-EXE kommt zusammen mit den Installern und Extras auf die Disc. Die Pfade der Rezeptdatei gelten ab dem Ordner, in dem die EXE liegt.")
	return 0
}
