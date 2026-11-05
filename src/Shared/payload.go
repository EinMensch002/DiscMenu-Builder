package shared

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"os"
)

// Aufbau der Menü-EXE: [ Player.exe ][ payload.zip ][ Länge: 8 Byte, little endian ][ Kennung ]
const Magic = "DMENUPL1"

const trailerSize = 8 + len(Magic)

// ErrNoPayload bedeutet: an der Datei hängt kein Paket.
var ErrNoPayload = errors.New("kein Menü-Paket gefunden")

// Append hängt das Paket an eine Player-EXE an.
func Append(player, payload []byte) []byte {
	out := make([]byte, 0, len(player)+len(payload)+trailerSize)
	out = append(out, player...)
	out = append(out, payload...)
	var n [8]byte
	binary.LittleEndian.PutUint64(n[:], uint64(len(payload)))
	out = append(out, n[:]...)
	return append(out, Magic...)
}

// Locate sucht das Paket am Ende einer Datei und gibt Start und Länge zurück.
func Locate(r io.ReaderAt, size int64) (start, length int64, err error) {
	if size < int64(trailerSize) {
		return 0, 0, ErrNoPayload
	}
	t := make([]byte, trailerSize)
	if _, err := r.ReadAt(t, size-int64(trailerSize)); err != nil {
		return 0, 0, err
	}
	if !bytes.Equal(t[8:], []byte(Magic)) {
		return 0, 0, ErrNoPayload
	}
	n := int64(binary.LittleEndian.Uint64(t[:8]))
	if n <= 0 || n > size-int64(trailerSize) {
		return 0, 0, fmt.Errorf("das Menü-Paket ist beschädigt (Länge %d)", n)
	}
	return size - int64(trailerSize) - n, n, nil
}

// OpenPayload öffnet die Datei und gibt das Paket als Abschnitt zurück. Zum Schließen close() aufrufen.
func OpenPayload(path string) (r *io.SectionReader, size int64, closeFn func() error, err error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, 0, nil, err
	}
	st, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, 0, nil, err
	}
	start, n, err := Locate(f, st.Size())
	if err != nil {
		f.Close()
		return nil, 0, nil, err
	}
	return io.NewSectionReader(f, start, n), n, f.Close, nil
}

// StripPayload entfernt ein vorhandenes Paket (z. B. wenn eine fertige Menü-EXE als Player dient).
func StripPayload(exe []byte) []byte {
	start, _, err := Locate(bytes.NewReader(exe), int64(len(exe)))
	if err != nil {
		return exe
	}
	return exe[:start]
}
