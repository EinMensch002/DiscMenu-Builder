package main

import (
	"bytes"
	"io"
	"path"
	"strings"
	"time"

	"github.com/ebitengine/oto/v3"
	"github.com/hajimehoshi/ebiten/v2/audio/mp3"
	"github.com/hajimehoshi/ebiten/v2/audio/vorbis"
	"github.com/hajimehoshi/ebiten/v2/audio/wav"
)

const sampleRate = 44100

// Sounds spielt die kurzen Menü-Sounds. Es nutzt oto direkt statt ebiten/audio: Ebitengine beendet das
// ganze Programm, wenn kein Audiogerät startet. Das darf einem Menü auf einer Disc (und unter
// Wine/Proton ohne Audio) nie passieren, dann bleibt es einfach stumm.
type Sounds struct {
	ctx     *oto.Context
	data    map[string][]byte // "click", "hover" -> PCM (16 Bit, stereo, little endian)
	players []*oto.Player
}

func newSounds() *Sounds {
	s := &Sounds{data: map[string][]byte{}}
	done := make(chan struct{})
	go func() {
		defer func() { _ = recover(); close(done) }()
		ctx, ready, err := oto.NewContext(&oto.NewContextOptions{SampleRate: sampleRate, ChannelCount: 2, Format: oto.FormatSignedInt16LE})
		if err != nil {
			return
		}
		select {
		case <-ready:
			s.ctx = ctx
		case <-time.After(3 * time.Second):
		}
	}()
	select {
	case <-done:
	case <-time.After(4 * time.Second): // Treiber hängt: ohne Ton weitermachen
	}
	return s
}

// Load dekodiert einen Sound (WAV, OGG oder MP3) einmal in PCM.
func (s *Sounds) Load(name, file string, raw []byte) error {
	var r io.Reader
	var err error
	switch strings.ToLower(path.Ext(file)) {
	case ".wav":
		r, err = wav.DecodeWithSampleRate(sampleRate, bytes.NewReader(raw))
	case ".ogg":
		r, err = vorbis.DecodeWithSampleRate(sampleRate, bytes.NewReader(raw))
	case ".mp3":
		r, err = mp3.DecodeWithSampleRate(sampleRate, bytes.NewReader(raw))
	default:
		return nil
	}
	if err != nil {
		return err
	}
	pcm, err := io.ReadAll(r)
	if err != nil {
		return err
	}
	s.data[name] = pcm
	return nil
}

// Play spielt einen Sound ab, falls vorhanden und ein Audiogerät läuft.
func (s *Sounds) Play(name string) {
	if s == nil || s.ctx == nil || s.data[name] == nil {
		return
	}
	defer func() { _ = recover() }()
	live := s.players[:0]
	for _, p := range s.players {
		if p.IsPlaying() {
			live = append(live, p)
		}
	}
	s.players = live
	p := s.ctx.NewPlayer(bytes.NewReader(s.data[name]))
	p.Play()
	s.players = append(s.players, p)
}
