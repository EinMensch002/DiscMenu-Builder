// mkdemo erzeugt die Beispiel-Assets (Cover, Hintergrund, Klick-Sound) für examples/.
// Aufruf: go run ./tools/mkdemo examples/assets
package main

import (
	"encoding/binary"
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
	"path/filepath"
)

func main() {
	dir := "examples/assets"
	if len(os.Args) > 1 {
		dir = os.Args[1]
	}
	must(os.MkdirAll(dir, 0o755))
	cover := func(name string, a, b color.RGBA, seed int) {
		img := image.NewRGBA(image.Rect(0, 0, 400, 600))
		for y := 0; y < 600; y++ {
			t := float64(y) / 599
			for x := 0; x < 400; x++ {
				c := mix(a, b, t)
				// Ein paar Kreise als Muster, damit man die Bilder unterscheiden kann.
				for k := 1; k <= 3; k++ {
					cx, cy := float64(80*k*seed%400), float64(150*k+40*seed)
					d := math.Hypot(float64(x)-cx, float64(y)-math.Mod(cy, 600))
					if d < float64(36+14*k) && d > float64(30+14*k) {
						c = mix(c, color.RGBA{255, 255, 255, 255}, 0.55)
					}
				}
				img.SetRGBA(x, y, c)
			}
		}
		save(filepath.Join(dir, name), img)
	}
	cover("beispiel-spiel-1.png", color.RGBA{36, 52, 120, 255}, color.RGBA{150, 60, 160, 255}, 1)
	cover("beispiel-spiel-2.png", color.RGBA{20, 70, 60, 255}, color.RGBA{210, 160, 60, 255}, 2)
	cover("beispiel-spiel-3.png", color.RGBA{30, 40, 56, 255}, color.RGBA{102, 192, 244, 255}, 3)
	cover("beispiel-erweiterung.png", color.RGBA{90, 30, 30, 255}, color.RGBA{230, 120, 70, 255}, 4)

	bg := image.NewRGBA(image.Rect(0, 0, 960, 540))
	for y := 0; y < 540; y++ {
		for x := 0; x < 960; x++ {
			t := (float64(x)/959 + float64(y)/539) / 2
			bg.SetRGBA(x, y, mix(color.RGBA{14, 22, 54, 255}, color.RGBA{72, 28, 88, 255}, t))
		}
	}
	save(filepath.Join(dir, "background.png"), bg)

	// Klick: 70 ms, 880 Hz, ausblendend, 16 Bit mono, 44,1 kHz.
	const rate = 44100
	n := rate * 70 / 1000
	pcm := make([]byte, 0, 2*n)
	for i := 0; i < n; i++ {
		env := 1 - float64(i)/float64(n)
		v := int16(math.Sin(2*math.Pi*880*float64(i)/rate) * env * env * 9000)
		pcm = binary.LittleEndian.AppendUint16(pcm, uint16(v))
	}
	wav := []byte("RIFF")
	wav = binary.LittleEndian.AppendUint32(wav, uint32(36+len(pcm)))
	wav = append(wav, "WAVEfmt "...)
	wav = binary.LittleEndian.AppendUint32(wav, 16)
	wav = binary.LittleEndian.AppendUint16(wav, 1)
	wav = binary.LittleEndian.AppendUint16(wav, 1)
	wav = binary.LittleEndian.AppendUint32(wav, rate)
	wav = binary.LittleEndian.AppendUint32(wav, rate*2)
	wav = binary.LittleEndian.AppendUint16(wav, 2)
	wav = binary.LittleEndian.AppendUint16(wav, 16)
	wav = append(wav, "data"...)
	wav = binary.LittleEndian.AppendUint32(wav, uint32(len(pcm)))
	wav = append(wav, pcm...)
	must(os.WriteFile(filepath.Join(dir, "click.wav"), wav, 0o644))
}

func mix(a, b color.RGBA, t float64) color.RGBA {
	f := func(x, y uint8) uint8 { return uint8(float64(x)*(1-t) + float64(y)*t) }
	return color.RGBA{f(a.R, b.R), f(a.G, b.G), f(a.B, b.B), 255}
}

func save(path string, img image.Image) {
	f, err := os.Create(path)
	must(err)
	defer f.Close()
	must(png.Encode(f, img))
}

func must(err error) {
	if err != nil {
		panic(err)
	}
}
