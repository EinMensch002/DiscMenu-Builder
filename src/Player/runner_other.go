//go:build !windows

package main

import (
	"errors"
	"os/exec"
)

// Auf Systemen ohne Windows (nur für Entwicklung und Tests) wird das Programm direkt gestartet.
type osRunner struct{}

func newRunner() Runner { return osRunner{} }

func (osRunner) Run(exe, cmdline, dir string, hidden bool) (int, error) {
	cmd := exec.Command(exe, splitCommandLine(cmdline)...)
	cmd.Dir = dir
	err := cmd.Run()
	var ee *exec.ExitError
	if errors.As(err, &ee) {
		return ee.ExitCode(), nil
	}
	return 0, err
}

// openTarget öffnet eine Datei, einen Ordner oder einen Link mit dem Standardprogramm.
func openTarget(target string) error {
	return exec.Command("xdg-open", target).Start()
}

func newDetector() InstallDirDetector { return nil }

// browseFolder: Auf Entwicklungssystemen gibt es keinen Ordnerdialog.
func browseFolder(title string) (string, error) {
	return "", errors.New("kein Ordnerdialog verfügbar")
}

func clipboardText() string { return "" }

func fatalDialog(title, msg string) { println(title + ": " + msg) }

func attachConsole() {}
