package main

import (
	"bytes"
	"image"
	"image/color"
	"math"
	"strings"
	"time"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/inpututil"
	"github.com/hajimehoshi/ebiten/v2/text/v2"
	"github.com/hajimehoshi/ebiten/v2/vector"
	"golang.org/x/image/font/gofont/gobold"
	"golang.org/x/image/font/gofont/goregular"
)

// Farben des Menüs.
var (
	colBg      = color.RGBA{14, 16, 22, 255}
	colPanel   = color.RGBA{27, 31, 41, 235}
	colPanel2  = color.RGBA{40, 45, 58, 255}
	colHover   = color.RGBA{54, 61, 80, 255}
	colLine    = color.RGBA{66, 73, 92, 255}
	colText    = color.RGBA{236, 239, 245, 255}
	colMuted   = color.RGBA{160, 168, 184, 255}
	colAccent  = color.RGBA{91, 140, 255, 255}
	colOK      = color.RGBA{61, 220, 151, 255}
	colErr     = color.RGBA{255, 107, 107, 255}
	colOverlay = color.RGBA{6, 8, 14, 190}
)

type fontKey struct {
	bold bool
	size float64
}

// Fonts hält die eingebauten Schriften (Go Regular und Go Bold, mit deutschen Umlauten).
type Fonts struct {
	regular, bold *text.GoTextFaceSource
	faces         map[fontKey]*text.GoTextFace
	wrapCache     map[wrapKey][]string
}

type wrapKey struct {
	s    string
	size float64
	bold bool
	w    int
}

func newFonts() (*Fonts, error) {
	r, err := text.NewGoTextFaceSource(bytes.NewReader(goregular.TTF))
	if err != nil {
		return nil, err
	}
	b, err := text.NewGoTextFaceSource(bytes.NewReader(gobold.TTF))
	if err != nil {
		return nil, err
	}
	return &Fonts{regular: r, bold: b, faces: map[fontKey]*text.GoTextFace{}, wrapCache: map[wrapKey][]string{}}, nil
}

func (f *Fonts) face(size float64, bold bool) *text.GoTextFace {
	k := fontKey{bold, size}
	if fc, ok := f.faces[k]; ok {
		return fc
	}
	src := f.regular
	if bold {
		src = f.bold
	}
	fc := &text.GoTextFace{Source: src, Size: size}
	f.faces[k] = fc
	return fc
}

func (f *Fonts) width(s string, size float64, bold bool) float64 {
	w, _ := text.Measure(s, f.face(size, bold), 0)
	return w
}

func lineHeight(size float64) int { return int(math.Round(size * 1.4)) }

// wrap bricht Text an Wortgrenzen um. Zeilenumbrüche im Text bleiben erhalten.
func (f *Fonts) wrap(s string, size float64, bold bool, maxW int) []string {
	k := wrapKey{s, size, bold, maxW}
	if v, ok := f.wrapCache[k]; ok {
		return v
	}
	var out []string
	for _, para := range strings.Split(strings.ReplaceAll(s, "\r", ""), "\n") {
		words := strings.Fields(para)
		if len(words) == 0 {
			out = append(out, "")
			continue
		}
		cur := ""
		for _, w := range words {
			try := w
			if cur != "" {
				try = cur + " " + w
			}
			if cur != "" && f.width(try, size, bold) > float64(maxW) {
				out = append(out, cur)
				cur = w
			} else {
				cur = try
			}
			// Sehr lange Wörter (z. B. Pfade) hart umbrechen.
			for f.width(cur, size, bold) > float64(maxW) && len([]rune(cur)) > 1 {
				rs := []rune(cur)
				n := len(rs)
				for n > 1 && f.width(string(rs[:n]), size, bold) > float64(maxW) {
					n--
				}
				out = append(out, string(rs[:n]))
				cur = string(rs[n:])
			}
		}
		out = append(out, cur)
	}
	if len(f.wrapCache) > 400 {
		f.wrapCache = map[wrapKey][]string{}
	}
	f.wrapCache[k] = out
	return out
}

// ellipsize kürzt eine Zeile mit "..." auf die Breite.
func (f *Fonts) ellipsize(s string, size float64, bold bool, maxW int) string {
	if f.width(s, size, bold) <= float64(maxW) {
		return s
	}
	rs := []rune(s)
	for len(rs) > 1 && f.width(string(rs)+"...", size, bold) > float64(maxW) {
		rs = rs[:len(rs)-1]
	}
	return string(rs) + "..."
}

// UI ist ein einfaches Sofort-Oberflächen-Gerüst: Pro Bild wird die Seite neu aufgebaut. Dabei entstehen
// Zeichenbefehle und Klickziele, Zeichnen und Eingabe sind so immer im Einklang.
type UI struct {
	fonts *Fonts
	cmds  []func(*ebiten.Image)
	W, H  int

	mx, my   int
	pressed  bool // Maustaste in diesem Bild gedrückt (frisch)
	wheel    float64
	inputOn  bool
	clip     image.Rectangle
	clipOn   bool
	pending  func()
	hoverID  string
	lastHov  string
	pointer  bool
	playHov  bool // Hover-Sound auslösen
	playClk  bool // Klick-Sound auslösen
	scroll   map[string]int
	contentH map[string]int

	// Texteingabe
	focus     string
	chars     []rune
	backspace bool
	del       bool
	paste     string
	enter     bool
	now       time.Time
}

func newUI(f *Fonts) *UI {
	return &UI{fonts: f, scroll: map[string]int{}, contentH: map[string]int{}}
}

func (u *UI) begin(w, h int) {
	u.W, u.H = w, h
	u.cmds = u.cmds[:0]
	u.pending = nil
	u.lastHov, u.hoverID = u.hoverID, ""
	u.pointer, u.playHov, u.playClk = false, false, false
	u.inputOn = true
	u.clipOn = false
	u.now = time.Now()
}

func (u *UI) end() {
	if u.hoverID != "" && u.hoverID != u.lastHov {
		u.playHov = true
	}
	if u.pending != nil {
		u.playClk = true
	}
}

func (u *UI) add(draw func(*ebiten.Image)) {
	clip, on := u.clip, u.clipOn
	u.cmds = append(u.cmds, func(dst *ebiten.Image) {
		if on {
			sub := dst.SubImage(clip).(*ebiten.Image)
			draw(sub)
			return
		}
		draw(dst)
	})
}

func (u *UI) draw(dst *ebiten.Image) {
	for _, c := range u.cmds {
		c(dst)
	}
}

func (u *UI) pushClip(r image.Rectangle) {
	if u.clipOn {
		r = r.Intersect(u.clip)
	}
	u.clip, u.clipOn = r, true
}
func (u *UI) popClip() { u.clipOn = false }

func (u *UI) mouseIn(r image.Rectangle) bool {
	if !u.inputOn {
		return false
	}
	p := image.Pt(u.mx, u.my)
	if u.clipOn && !p.In(u.clip) {
		return false
	}
	return p.In(r)
}

// --- Zeichnen ---

func fillRound(dst *ebiten.Image, r image.Rectangle, rad int, c color.Color) {
	x, y, w, h := float32(r.Min.X), float32(r.Min.Y), float32(r.Dx()), float32(r.Dy())
	if rad <= 0 || w < 2*float32(rad) || h < 2*float32(rad) {
		vector.FillRect(dst, x, y, w, h, c, true)
		return
	}
	rr := float32(rad)
	var p vector.Path
	p.MoveTo(x+rr, y)
	p.LineTo(x+w-rr, y)
	p.ArcTo(x+w, y, x+w, y+rr, rr)
	p.LineTo(x+w, y+h-rr)
	p.ArcTo(x+w, y+h, x+w-rr, y+h, rr)
	p.LineTo(x+rr, y+h)
	p.ArcTo(x, y+h, x, y+h-rr, rr)
	p.LineTo(x, y+rr)
	p.ArcTo(x, y, x+rr, y, rr)
	p.Close()
	dop := &vector.DrawPathOptions{AntiAlias: true}
	dop.ColorScale.ScaleWithColor(c)
	vector.FillPath(dst, &p, &vector.FillOptions{}, dop)
}

func (u *UI) Rect(r image.Rectangle, rad int, c color.Color) {
	u.add(func(d *ebiten.Image) { fillRound(d, r, rad, c) })
}

func (u *UI) Text(x, y int, s string, size float64, bold bool, c color.Color) {
	face := u.fonts.face(size, bold)
	u.add(func(d *ebiten.Image) {
		op := &text.DrawOptions{}
		op.GeoM.Translate(float64(x), float64(y))
		op.ColorScale.ScaleWithColor(c)
		text.Draw(d, s, face, op)
	})
}

// TextRight zeichnet rechtsbündig bis x.
func (u *UI) TextRight(x, y int, s string, size float64, bold bool, c color.Color) {
	u.Text(x-int(u.fonts.width(s, size, bold)), y, s, size, bold, c)
}

// Paragraph zeichnet umbrochenen Text und gibt die Höhe zurück. maxLines <= 0 bedeutet unbegrenzt.
func (u *UI) Paragraph(x, y, w int, s string, size float64, bold bool, c color.Color, maxLines int) int {
	lines := u.fonts.wrap(s, size, bold, w)
	if maxLines > 0 && len(lines) > maxLines {
		lines = append([]string{}, lines[:maxLines]...)
		lines[maxLines-1] = u.fonts.ellipsize(lines[maxLines-1]+" ...", size, bold, w)
	}
	lh := lineHeight(size)
	for i, ln := range lines {
		if ln != "" {
			u.Text(x, y+i*lh, ln, size, bold, c)
		}
	}
	return len(lines) * lh
}

type fitMode int

const (
	fitContain fitMode = iota // ganz sichtbar, zentriert
	fitCover                  // füllt den Bereich, Überstand wird abgeschnitten
)

func (u *UI) Image(r image.Rectangle, img *ebiten.Image, mode fitMode, alpha float32) {
	if img == nil {
		return
	}
	u.add(func(d *ebiten.Image) {
		iw, ih := float64(img.Bounds().Dx()), float64(img.Bounds().Dy())
		sx, sy := float64(r.Dx())/iw, float64(r.Dy())/ih
		s := math.Min(sx, sy)
		if mode == fitCover {
			s = math.Max(sx, sy)
		}
		w, h := iw*s, ih*s
		op := &ebiten.DrawImageOptions{Filter: ebiten.FilterLinear}
		op.GeoM.Scale(s, s)
		op.GeoM.Translate(float64(r.Min.X)+(float64(r.Dx())-w)/2, float64(r.Min.Y)+(float64(r.Dy())-h)/2)
		op.ColorScale.ScaleAlpha(alpha)
		if mode == fitCover {
			d = d.SubImage(r).(*ebiten.Image)
		}
		d.DrawImage(img, op)
	})
}

// --- Bedienelemente ---

type btnStyle struct {
	fill, hover, label color.RGBA
	size               float64
	bold               bool
}

func (a *App) styleSecondary() btnStyle {
	return btnStyle{fill: colPanel2, hover: colHover, label: colText, size: 17}
}
func (a *App) stylePrimary(accent color.RGBA) btnStyle {
	lab := color.RGBA{255, 255, 255, 255}
	if luminance(accent) > 150 {
		lab = color.RGBA{20, 22, 30, 255}
	}
	h := brighten(accent, 24)
	return btnStyle{fill: accent, hover: h, label: lab, size: 19, bold: true}
}

func luminance(c color.RGBA) float64 {
	return 0.299*float64(c.R) + 0.587*float64(c.G) + 0.114*float64(c.B)
}
func brighten(c color.RGBA, n int) color.RGBA {
	f := func(v uint8) uint8 {
		if int(v)+n > 255 {
			return 255
		}
		return uint8(int(v) + n)
	}
	return color.RGBA{f(c.R), f(c.G), f(c.B), c.A}
}

// Button zeichnet einen Knopf. onClick == nil sperrt ihn.
func (u *UI) Button(id string, r image.Rectangle, label string, st btnStyle, onClick func()) {
	enabled := onClick != nil
	hov := enabled && u.mouseIn(r)
	fill := st.fill
	if hov {
		fill = st.hover
		u.hoverID, u.pointer = id, true
		if u.pressed {
			u.pending = onClick
		}
	}
	lab := st.label
	if !enabled {
		fill = color.RGBA{fill.R/2 + 14, fill.G/2 + 14, fill.B/2 + 14, fill.A}
		lab = color.RGBA{lab.R/2 + 40, lab.G/2 + 40, lab.B/2 + 40, lab.A}
	}
	u.Rect(r, 10, fill)
	label = u.fonts.ellipsize(label, st.size, st.bold, r.Dx()-16)
	tw := int(u.fonts.width(label, st.size, st.bold))
	u.Text(r.Min.X+(r.Dx()-tw)/2, r.Min.Y+(r.Dy()-lineHeight(st.size))/2+1, label, st.size, st.bold, lab)
}

// Check zeichnet ein Kontrollkästchen mit Beschriftung.
func (u *UI) Check(id string, r image.Rectangle, label string, on bool, accent color.RGBA, enabled bool, toggle func()) {
	box := image.Rect(r.Min.X, r.Min.Y+(r.Dy()-24)/2, r.Min.X+24, r.Min.Y+(r.Dy()-24)/2+24)
	hov := enabled && u.mouseIn(r)
	if hov {
		u.hoverID, u.pointer = id, true
		if u.pressed {
			u.pending = toggle
		}
	}
	bg := colPanel2
	if hov {
		bg = colHover
	}
	u.Rect(box, 6, bg)
	if on {
		u.Rect(box.Inset(4), 4, accent)
	}
	c := color.Color(colText)
	if !enabled {
		c = colMuted
	}
	u.Text(box.Max.X+12, r.Min.Y+(r.Dy()-lineHeight(17))/2, label, 17, false, c)
}

// Field ist ein einzeiliges Textfeld. Es zeigt das Ende des Textes, solange er nicht hineinpasst.
func (u *UI) Field(id string, r image.Rectangle, value *string, placeholder string, accent color.RGBA) {
	hov := u.mouseIn(r)
	if hov {
		u.pointer = true
		if u.pressed {
			u.focus = id
		}
	} else if u.pressed && u.inputOn && u.focus == id {
		u.focus = ""
	}
	focused := u.focus == id && u.inputOn
	if focused {
		*value += string(u.chars)
		if u.paste != "" {
			*value += strings.NewReplacer("\r", "", "\n", "").Replace(u.paste)
		}
		if (u.backspace || u.del) && *value != "" {
			rs := []rune(*value)
			*value = string(rs[:len(rs)-1])
		}
		if u.enter {
			u.focus = ""
		}
	}
	bg := color.RGBA{18, 21, 29, 255}
	u.Rect(r, 8, bg)
	if focused {
		u.Rect(image.Rect(r.Min.X, r.Max.Y-3, r.Max.X, r.Max.Y), 0, accent)
	}
	inner := r.Dx() - 24
	shown, c := *value, color.Color(colText)
	if shown == "" {
		shown, c = placeholder, colMuted
	} else {
		rs := []rune(shown)
		for len(rs) > 1 && u.fonts.width(string(rs), 17, false) > float64(inner-8) {
			rs = rs[1:]
		}
		shown = string(rs)
	}
	ty := r.Min.Y + (r.Dy()-lineHeight(17))/2
	u.Text(r.Min.X+12, ty, shown, 17, false, c)
	if focused && (u.now.UnixMilli()/500)%2 == 0 {
		x := r.Min.X + 12
		if *value != "" {
			x += int(u.fonts.width(shown, 17, false)) + 1
		}
		u.Rect(image.Rect(x, ty+2, x+2, ty+lineHeight(17)-2), 0, colText)
	}
}

// Progress zeichnet einen Fortschrittsbalken. p < 0 zeigt einen laufenden Streifen (unbestimmt).
func (u *UI) Progress(r image.Rectangle, p float64, c color.RGBA) {
	u.Rect(r, r.Dy()/2, colPanel2)
	if p < 0 {
		t := float64(u.now.UnixMilli()%1600) / 1600
		w := r.Dx() / 3
		x := r.Min.X + int(t*float64(r.Dx()+w)) - w
		seg := image.Rect(x, r.Min.Y, x+w, r.Max.Y).Intersect(r)
		if !seg.Empty() {
			u.Rect(seg, r.Dy()/2, c)
		}
		return
	}
	if p > 1 {
		p = 1
	}
	w := int(float64(r.Dx()) * p)
	if w < r.Dy() {
		w = r.Dy()
	}
	u.Rect(image.Rect(r.Min.X, r.Min.Y, r.Min.X+w, r.Max.Y), r.Dy()/2, c)
}

// ScrollArea baut einen scrollbaren Bereich. build bekommt die obere Kante des Inhalts und liefert dessen Höhe.
func (u *UI) ScrollArea(id string, r image.Rectangle, build func(top int) int) {
	off := u.scroll[id]
	maxOff := u.contentH[id] - r.Dy()
	if maxOff < 0 {
		maxOff = 0
	}
	if u.mouseIn(r) && u.wheel != 0 {
		off -= int(u.wheel * 48)
	}
	if off < 0 {
		off = 0
	}
	if off > maxOff {
		off = maxOff
	}
	u.scroll[id] = off
	u.pushClip(r)
	h := build(r.Min.Y - off)
	u.popClip()
	u.contentH[id] = h
	if h > r.Dy() {
		tr := image.Rect(r.Max.X-6, r.Min.Y, r.Max.X-2, r.Max.Y)
		th := r.Dy() * r.Dy() / h
		if th < 30 {
			th = 30
		}
		ty := r.Min.Y + (r.Dy()-th)*off/maxInt(1, h-r.Dy())
		u.Rect(tr, 2, color.RGBA{255, 255, 255, 18})
		u.Rect(image.Rect(tr.Min.X, ty, tr.Max.X, ty+th), 2, color.RGBA{255, 255, 255, 90})
	}
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Badge zeichnet das Abzeichen eines Anbieters und gibt die Breite zurück.
func (u *UI) Badge(x, y int, b Brand, size float64) int {
	w := int(u.fonts.width(b.Name, size, true)) + 22
	h := lineHeight(size) + 4
	u.Rect(image.Rect(x, y, x+w, y+h), h/2, b.Badge)
	u.Text(x+11, y+2, b.Name, size, true, b.OnBadge)
	return w
}

// readInput liest Tastatur und Maus für dieses Bild.
func (u *UI) readInput() {
	cx, cy := ebiten.CursorPosition()
	u.mx, u.my = cx, cy
	u.pressed = inpututil.IsMouseButtonJustPressed(ebiten.MouseButtonLeft)
	_, wy := ebiten.Wheel()
	u.wheel = wy
	u.chars = ebiten.AppendInputChars(u.chars[:0])
	rep := func(k ebiten.Key) bool {
		d := inpututil.KeyPressDuration(k)
		return d == 1 || (d > 24 && d%3 == 0)
	}
	u.backspace = rep(ebiten.KeyBackspace)
	u.del = false
	u.enter = inpututil.IsKeyJustPressed(ebiten.KeyEnter) || inpututil.IsKeyJustPressed(ebiten.KeyNumpadEnter)
	u.paste = ""
	if (ebiten.IsKeyPressed(ebiten.KeyControl) || ebiten.IsKeyPressed(ebiten.KeyMeta)) && inpututil.IsKeyJustPressed(ebiten.KeyV) {
		u.paste = clipboardText()
	}
}
