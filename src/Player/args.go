package main

import "strings"

// commandLine fügt Parameter zu einer Windows-Kommandozeile zusammen. Parameter aus der menu.json
// stehen dort schon so, wie sie der Installer erwartet (inklusive Anführungszeichen).
func commandLine(args []string) string { return strings.Join(args, " ") }

// splitCommandLine trennt eine Kommandozeile wieder in Parameter und entfernt Anführungszeichen
// (so wie es ein Windows-Programm sieht). Wird auf Systemen ohne eigene Kommandozeile gebraucht.
func splitCommandLine(s string) []string {
	var out []string
	var cur strings.Builder
	inQ, has := false, false
	for _, r := range s {
		switch {
		case r == '"':
			inQ, has = !inQ, true
		case (r == ' ' || r == '\t') && !inQ:
			if has || cur.Len() > 0 {
				out = append(out, cur.String())
				cur.Reset()
				has = false
			}
		default:
			cur.WriteRune(r)
		}
	}
	if has || cur.Len() > 0 {
		out = append(out, cur.String())
	}
	return out
}
