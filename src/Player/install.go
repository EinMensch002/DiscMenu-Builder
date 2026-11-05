package main

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// InstallJob beschreibt einen Installer-Start.
type InstallJob struct {
	Title      string
	Provider   Provider
	Installer  string   // absoluter Pfad
	EntryArgs  []string // Parameter des Eintrags (für still)
	Silent     bool
	Target     string // Zielordner (nur still und nur wenn der Anbieter ihn nutzt)
	EstimateMB float64
	LogPath    string
}

// Command liefert die Kommandozeile für den Installer.
func (j *InstallJob) Command() string {
	if !j.Silent {
		return ""
	}
	args := append([]string{}, j.Provider.SilentArgs(j.Target, j.LogPath)...)
	args = append(args, j.EntryArgs...)
	return commandLine(args)
}

// Runner startet ein Programm und wartet auf sein Ende. Unter Windows läuft es über ShellExecuteEx,
// damit auch Installer mit Administrator-Manifest die Rechteabfrage (UAC) bekommen.
type Runner interface {
	Run(exe, cmdline, dir string, hidden bool) (exitCode int, err error)
}

// InstallInfo ist der Zustand einer laufenden oder beendeten Installation (für die Oberfläche).
type InstallInfo struct {
	Job      *InstallJob
	Done     bool
	Progress float64 // 0..1, nur bei still; -1 = unbestimmt
	ExitCode int
	Err      error
	LogTail  string
	Found    string // erkannter Installationsordner
}

// Success sagt, ob die Installation ohne Fehler endete.
func (i InstallInfo) Success() bool { return i.Done && i.Err == nil && i.ExitCode == 0 }

// InstallState schützt den Zustand für den Zugriff aus mehreren Threads.
type InstallState struct {
	mu   sync.Mutex
	info InstallInfo
}

// Snapshot kopiert den Zustand zum sicheren Lesen.
func (s *InstallState) Snapshot() InstallInfo {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.info
}

// StartInstall startet die Installation im Hintergrund.
func StartInstall(job *InstallJob, r Runner, detect InstallDirDetector) *InstallState {
	st := &InstallState{info: InstallInfo{Job: job, Progress: -1}}
	go func() {
		var before map[string]string
		if detect != nil {
			before = detect.Snapshot()
		}
		stop := make(chan struct{})
		if job.Silent && job.Target != "" && job.EstimateMB > 0 {
			st.set(func(i *InstallInfo) { i.Progress = 0 })
			go pollProgress(st, job, stop)
		}
		code, err := r.Run(job.Installer, job.Command(), filepath.Dir(job.Installer), job.Silent)
		close(stop)
		tail := ""
		if job.LogPath != "" && (err != nil || code != 0) {
			tail = readTail(job.LogPath, 1800)
		}
		found := ""
		if detect != nil && err == nil && code == 0 {
			found = detect.Found(before)
		}
		st.set(func(i *InstallInfo) {
			i.Done, i.ExitCode, i.Err, i.LogTail, i.Found = true, code, err, tail, found
			if err == nil && code == 0 && i.Progress >= 0 {
				i.Progress = 1
			}
		})
	}()
	return st
}

func (s *InstallState) set(f func(*InstallInfo)) { s.mu.Lock(); f(&s.info); s.mu.Unlock() }

// InstallDirDetector findet nach der Installation, wohin installiert wurde (unter Windows über die GOG-Registry).
type InstallDirDetector interface {
	Snapshot() map[string]string
	Found(before map[string]string) string
}

func pollProgress(st *InstallState, job *InstallJob, stop <-chan struct{}) {
	total := job.EstimateMB * 1024 * 1024
	t := time.NewTicker(700 * time.Millisecond)
	defer t.Stop()
	for {
		select {
		case <-stop:
			return
		case <-t.C:
			p := float64(dirSize(job.Target)) / total
			if p > 0.99 {
				p = 0.99
			}
			st.set(func(i *InstallInfo) {
				if p > i.Progress { // Der Balken geht nie zurück
					i.Progress = p
				}
			})
		}
	}
}

// dirSize summiert die Dateigrößen unter einem Ordner. Fehler werden ignoriert (der Ordner entsteht erst).
func dirSize(root string) int64 {
	var n int64
	filepath.WalkDir(root, func(_ string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		if info, err := d.Info(); err == nil {
			n += info.Size()
		}
		return nil
	})
	return n
}

// readTail gibt die letzten Zeichen einer Textdatei zurück (Inno schreibt ANSI oder UTF-8, wir zeigen nur Text).
func readTail(path string, max int) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	s := strings.ToValidUTF8(string(data), "?")
	s = strings.ReplaceAll(s, "\r", "")
	if len(s) > max {
		s = "..." + s[len(s)-max:]
	}
	return strings.TrimSpace(s)
}

// describeResult macht aus dem Ergebnis einen Text für die Oberfläche.
func describeResult(s InstallInfo) (ok bool, text string) {
	switch {
	case s.Err != nil:
		return false, "Der Installer konnte nicht gestartet werden:\n" + s.Err.Error()
	case s.ExitCode == 0:
		t := "Die Installation wurde ohne Fehler beendet."
		if s.Found != "" {
			t += "\nInstalliert nach: " + s.Found
		}
		return true, t
	default:
		t := fmt.Sprintf("Der Installer wurde mit dem Code %d beendet.", s.ExitCode)
		if s.ExitCode == 5 || s.ExitCode == 740 {
			t += "\nWahrscheinlich fehlten Administratorrechte."
		}
		if s.LogTail != "" {
			t += "\n\nProtokoll (Ende):\n" + s.LogTail
		}
		return false, t
	}
}
