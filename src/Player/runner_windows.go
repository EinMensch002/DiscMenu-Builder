//go:build windows

package main

import (
	"errors"
	"fmt"
	"os"
	"runtime"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

var (
	shell32  = windows.NewLazySystemDLL("shell32.dll")
	user32   = windows.NewLazySystemDLL("user32.dll")
	kernel32 = windows.NewLazySystemDLL("kernel32.dll")
	ole32    = windows.NewLazySystemDLL("ole32.dll")

	procShellExecuteExW      = shell32.NewProc("ShellExecuteExW")
	procSHBrowseForFolderW   = shell32.NewProc("SHBrowseForFolderW")
	procSHGetPathFromIDListW = shell32.NewProc("SHGetPathFromIDListW")
	procCoTaskMemFree        = ole32.NewProc("CoTaskMemFree")
	procMessageBoxW          = user32.NewProc("MessageBoxW")
	procOpenClipboard        = user32.NewProc("OpenClipboard")
	procCloseClipboard       = user32.NewProc("CloseClipboard")
	procGetClipboardData     = user32.NewProc("GetClipboardData")
	procGlobalLock           = kernel32.NewProc("GlobalLock")
	procGlobalUnlock         = kernel32.NewProc("GlobalUnlock")
)

const (
	seeMaskNoCloseProcess = 0x00000040
	seeMaskNoAsync        = 0x00000100
	swHide                = 0
	swShowNormal          = 1
	cfUnicodeText         = 13
)

// shellExecuteInfo entspricht SHELLEXECUTEINFOW.
type shellExecuteInfo struct {
	cbSize       uint32
	fMask        uint32
	hwnd         uintptr
	lpVerb       *uint16
	lpFile       *uint16
	lpParameters *uint16
	lpDirectory  *uint16
	nShow        int32
	hInstApp     uintptr
	lpIDList     uintptr
	lpClass      *uint16
	hkeyClass    uintptr
	dwHotKey     uint32
	hIcon        uintptr
	hProcess     uintptr
}

func utf16OrNil(s string) *uint16 {
	if s == "" {
		return nil
	}
	p, _ := windows.UTF16PtrFromString(s)
	return p
}

// winRunner startet Installer über ShellExecuteEx. Anders als CreateProcess zeigt das die Rechteabfrage
// (UAC), wenn der Installer Administratorrechte verlangt. Unter Wine/Proton läuft es ohne Abfrage.
type winRunner struct{}

func newRunner() Runner { return winRunner{} }

func (winRunner) Run(exe, cmdline, dir string, hidden bool) (int, error) {
	// ShellExecuteEx braucht auf dem aufrufenden Thread initialisiertes COM.
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	if err := windows.CoInitializeEx(0, windows.COINIT_APARTMENTTHREADED|windows.COINIT_DISABLE_OLE1DDE); err == nil {
		defer windows.CoUninitialize()
	}
	show := int32(swShowNormal)
	if hidden {
		show = swHide
	}
	info := shellExecuteInfo{
		fMask:        seeMaskNoCloseProcess | seeMaskNoAsync,
		lpFile:       utf16OrNil(exe),
		lpParameters: utf16OrNil(cmdline),
		lpDirectory:  utf16OrNil(dir),
		nShow:        show,
	}
	info.cbSize = uint32(unsafe.Sizeof(info))
	r, _, callErr := procShellExecuteExW.Call(uintptr(unsafe.Pointer(&info)))
	if r == 0 {
		if errors.Is(callErr, windows.ERROR_CANCELLED) {
			return 0, errors.New("Die Rechteabfrage wurde abgebrochen.")
		}
		return 0, fmt.Errorf("ShellExecuteEx fehlgeschlagen: %v", callErr)
	}
	if info.hProcess == 0 {
		return 0, errors.New("Windows hat kein Prozess-Handle geliefert, das Ende des Installers lässt sich nicht abwarten.")
	}
	h := windows.Handle(info.hProcess)
	defer windows.CloseHandle(h)
	if ev, err := windows.WaitForSingleObject(h, windows.INFINITE); err != nil || ev != windows.WAIT_OBJECT_0 {
		return 0, fmt.Errorf("Warten auf den Installer fehlgeschlagen: %v", err)
	}
	var code uint32
	if err := windows.GetExitCodeProcess(h, &code); err != nil {
		return 0, err
	}
	return int(int32(code)), nil
}

// openTarget öffnet eine Datei, einen Ordner oder einen Link mit dem Standardprogramm.
func openTarget(target string) error {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	if err := windows.CoInitializeEx(0, windows.COINIT_APARTMENTTHREADED|windows.COINIT_DISABLE_OLE1DDE); err == nil {
		defer windows.CoUninitialize()
	}
	verb, _ := windows.UTF16PtrFromString("open")
	file, err := windows.UTF16PtrFromString(target)
	if err != nil {
		return err
	}
	return windows.ShellExecute(0, verb, file, nil, nil, swShowNormal)
}

// browseFolder zeigt den Ordnerdialog von Windows.
func browseFolder(title string) (string, error) {
	type result struct {
		path string
		err  error
	}
	ch := make(chan result, 1)
	go func() {
		runtime.LockOSThread()
		defer runtime.UnlockOSThread()
		// Für den modernen Ordnerdialog braucht der Thread COM.
		if err := windows.CoInitializeEx(0, windows.COINIT_APARTMENTTHREADED); err == nil {
			defer windows.CoUninitialize()
		}
		type browseInfo struct {
			hwndOwner      uintptr
			pidlRoot       uintptr
			pszDisplayName *uint16
			lpszTitle      *uint16
			ulFlags        uint32
			lpfn           uintptr
			lParam         uintptr
			iImage         int32
		}
		const (
			bifReturnOnlyFSDirs = 0x0001
			bifNewDialogStyle   = 0x0040
		)
		display := make([]uint16, windows.MAX_PATH)
		bi := browseInfo{pszDisplayName: &display[0], lpszTitle: utf16OrNil(title), ulFlags: bifReturnOnlyFSDirs | bifNewDialogStyle}
		pidl, _, _ := procSHBrowseForFolderW.Call(uintptr(unsafe.Pointer(&bi)))
		if pidl == 0 {
			ch <- result{}
			return
		}
		defer procCoTaskMemFree.Call(pidl)
		buf := make([]uint16, windows.MAX_PATH)
		ok, _, _ := procSHGetPathFromIDListW.Call(pidl, uintptr(unsafe.Pointer(&buf[0])))
		if ok == 0 {
			ch <- result{err: errors.New("Der gewählte Eintrag ist kein Ordner im Dateisystem.")}
			return
		}
		ch <- result{path: windows.UTF16ToString(buf)}
	}()
	r := <-ch
	return r.path, r.err
}

// clipboardText liest Text aus der Zwischenablage (für Strg+V im Zielordner-Feld).
func clipboardText() string {
	if r, _, _ := procOpenClipboard.Call(0); r == 0 {
		return ""
	}
	defer procCloseClipboard.Call()
	h, _, _ := procGetClipboardData.Call(cfUnicodeText)
	if h == 0 {
		return ""
	}
	p, _, _ := procGlobalLock.Call(h)
	if p == 0 {
		return ""
	}
	defer procGlobalUnlock.Call(h)
	return windows.UTF16PtrToString(*(**uint16)(unsafe.Pointer(&p)))
}

// fatalDialog zeigt eine Fehlermeldung, wenn es kein Konsolenfenster gibt.
func fatalDialog(title, msg string) {
	t, _ := windows.UTF16PtrFromString(title)
	m, _ := windows.UTF16PtrFromString(msg)
	procMessageBoxW.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x10)
}

// --- GOG: Installationsordner aus der Registry ---

// gogRegistry liest die Einträge unter HKLM\SOFTWARE\WOW6432Node\GOG.com\Games. Das Format ist
// bisher nur aus Beschreibungen bekannt und an echten Installern zu bestätigen (siehe docs/installer-integration.md).
type gogRegistry struct{}

func newDetector() InstallDirDetector { return gogRegistry{} }

const gogGamesKey = `SOFTWARE\WOW6432Node\GOG.com\Games`

func (gogRegistry) Snapshot() map[string]string {
	out := map[string]string{}
	k, err := registry.OpenKey(registry.LOCAL_MACHINE, gogGamesKey, registry.ENUMERATE_SUB_KEYS)
	if err != nil {
		return out
	}
	defer k.Close()
	names, _ := k.ReadSubKeyNames(-1)
	for _, n := range names {
		sub, err := registry.OpenKey(registry.LOCAL_MACHINE, gogGamesKey+`\`+n, registry.QUERY_VALUE)
		if err != nil {
			continue
		}
		p, _, _ := sub.GetStringValue("path")
		sub.Close()
		out[n] = p
	}
	return out
}

// Found liefert den Ordner eines neuen oder geänderten Eintrags.
func (g gogRegistry) Found(before map[string]string) string {
	for n, p := range g.Snapshot() {
		if old, ok := before[n]; (!ok || old != p) && strings.TrimSpace(p) != "" {
			return p
		}
	}
	return ""
}

// attachConsole hängt die EXE (ohne eigenes Konsolenfenster) an die Konsole an, aus der sie gestartet wurde,
// damit -selftest und -version dort etwas ausgeben können.
func attachConsole() {
	const attachParentProcess = ^uintptr(0)
	if r, _, _ := kernel32.NewProc("AttachConsole").Call(attachParentProcess); r == 0 {
		return
	}
	if f, err := os.OpenFile("CONOUT$", os.O_WRONLY, 0); err == nil {
		os.Stdout, os.Stderr = f, f
	}
}
