//go:build windows

package main

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

// ownsConsole sagt, ob das Konsolenfenster nur zu diesem Programm gehört. Das ist der Fall nach Doppelklick
// oder Drag-and-drop im Explorer, dann würde das Fenster sonst sofort verschwinden.
func ownsConsole() bool {
	proc := windows.NewLazySystemDLL("kernel32.dll").NewProc("GetConsoleProcessList")
	var ids [4]uint32
	n, _, _ := proc.Call(uintptr(unsafe.Pointer(&ids[0])), uintptr(len(ids)))
	return n == 1
}
