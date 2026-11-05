package main

import (
	"fmt"
	"image"
	"image/color"
	_ "image/jpeg"
	_ "image/png"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/inpututil"
	_ "golang.org/x/image/webp"

	shared "github.com/einmensch002/discmenu-builder/src/Shared"
)

type page int

const (
	pageSelect page = iota
	pageGame
)

type message struct{ title, body string }

// App ist das Menü: Zustand, Eingabe und Seitenaufbau.
type App struct {
	recipe   *shared.Recipe
	menu     *shared.Menu
	discRoot string
	runner   Runner
	detector InstallDirDetector
	sounds   *Sounds
	ui       *UI

	imgs map[string]*ebiten.Image

	page    page
	cur     int    // Index in menu.Games
	tab     string // "game", "dlcs", "patches", "extras"
	silent  bool
	targets map[int]string // Zielordner pro Spiel
	msg     *message
	install *InstallState
	quit    bool

	frames     int
	lastScreen *ebiten.Image
	shotTo     string // Pfad für einen Screenshot (Prüfung der Oberfläche), danach Beenden
	W, H       int
	started    time.Time
}

func newApp(r *shared.Recipe, discRoot string) (*App, error) {
	f, err := newFonts()
	if err != nil {
		return nil, err
	}
	a := &App{recipe: r, menu: r.Menu, discRoot: discRoot, runner: newRunner(), detector: newDetector(),
		sounds: newSounds(), ui: newUI(f), imgs: map[string]*ebiten.Image{}, targets: map[int]string{}, tab: "game", started: time.Now()}
	if r.Menu.Sounds != nil {
		for name, file := range map[string]string{"click": r.Menu.Sounds.Click, "hover": r.Menu.Sounds.Hover} {
			if file == "" {
				continue
			}
			if raw, err := r.ReadAsset(file); err == nil {
				_ = a.sounds.Load(name, file, raw)
			}
		}
	}
	if len(a.menu.Games) == 1 {
		a.page = pageGame
	}
	return a, nil
}

// image lädt ein Bild aus dem Paket (einmal) und gibt es zurück, nil wenn es fehlt.
func (a *App) image(p string) *ebiten.Image {
	if p == "" {
		return nil
	}
	if img, ok := a.imgs[p]; ok {
		return img
	}
	var out *ebiten.Image
	if raw, err := fs.ReadFile(a.recipe.Assets, p); err == nil {
		if im, _, err := image.Decode(strings.NewReader(string(raw))); err == nil {
			out = ebiten.NewImageFromImage(im)
		}
	}
	a.imgs[p] = out
	return out
}

func (a *App) game() *shared.Game { return &a.menu.Games[a.cur] }

// Layout wählt die logische Größe: mindestens 960x720, sonst passend zum Fenster.
func (a *App) Layout(ow, oh int) (int, int) {
	s := minF(float64(ow)/960, float64(oh)/720)
	if s <= 0 {
		s = 1
	}
	w, h := int(float64(ow)/s), int(float64(oh)/s)
	a.W, a.H = w, h
	return w, h
}

func minF(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func (a *App) Update() error {
	a.frames++
	if a.quit {
		return ebiten.Termination
	}
	if ebiten.IsWindowBeingClosed() {
		if a.installing() {
			a.msg = &message{"Installation läuft", "Bitte warte, bis der Installer fertig ist, bevor du das Menü schließt."}
		} else {
			return ebiten.Termination
		}
	}
	a.ui.readInput()
	a.build()
	a.applyAudioAndCursor()
	if a.shotTo != "" && a.frames == 12 {
		return a.saveShot()
	}
	return nil
}

func (a *App) installing() bool { return a.install != nil && !a.install.Snapshot().Done }

func (a *App) applyAudioAndCursor() {
	if a.ui.pointer {
		ebiten.SetCursorShape(ebiten.CursorShapePointer)
	} else {
		ebiten.SetCursorShape(ebiten.CursorShapeDefault)
	}
	if a.ui.playClk {
		a.sounds.Play("click")
	} else if a.ui.playHov {
		a.sounds.Play("hover")
	}
}

func (a *App) Draw(screen *ebiten.Image) {
	screen.Fill(colBg)
	a.ui.draw(screen)
	a.lastScreen = screen
}

// build setzt die aktuelle Seite zusammen und führt danach einen Klick aus.
func (a *App) build() {
	u := a.ui
	u.begin(a.W, a.H)
	a.buildBackground()
	modal := a.msg != nil || a.install != nil
	u.inputOn = !modal
	switch a.page {
	case pageSelect:
		a.buildSelect()
	case pageGame:
		a.buildGame()
	}
	if modal {
		u.inputOn = true
		a.buildModal()
	}
	if !modal && inpututil.IsKeyJustPressed(ebiten.KeyEscape) {
		if a.page == pageGame && len(a.menu.Games) > 1 {
			a.page = pageSelect
		}
	}
	u.end()
	if u.pending != nil {
		u.pending()
	}
}

func (a *App) buildBackground() {
	u := a.ui
	if img := a.image(a.menu.Background); img != nil {
		u.Image(image.Rect(0, 0, a.W, a.H), img, fitCover, 1)
	}
	u.Rect(image.Rect(0, 0, a.W, a.H), 0, colOverlayFor(a.menu.Background != ""))
}

func colOverlayFor(hasBg bool) color.RGBA {
	if hasBg {
		return color.RGBA{8, 10, 16, 200}
	}
	return color.RGBA{0, 0, 0, 0}
}

// --- Auswahlseite ---

func (a *App) buildSelect() {
	u := a.ui
	u.Text(48, 30, a.menu.Title, 36, true, colText)
	u.Text(48, 78, "Wähle ein Spiel", 18, false, colMuted)

	area := image.Rect(32, 116, a.W-32, a.H-84)
	const tw, th, gap = 200, 300, 28
	cols := maxInt(1, (area.Dx()-16+gap)/(tw+gap))
	u.ScrollArea("select", area, func(top int) int {
		used := minInt(cols, len(a.menu.Games))
		left := area.Min.X + (area.Dx()-(used*tw+(used-1)*gap))/2
		y := top + 8
		rowH := th + 78
		for i := range a.menu.Games {
			g := &a.menu.Games[i]
			c, r := i%cols, i/cols
			x := left + c*(tw+gap)
			yy := y + r*(rowH+10)
			a.gameTile(i, g, image.Rect(x, yy, x+tw, yy+th))
		}
		rows := (len(a.menu.Games) + cols - 1) / cols
		return 8 + rows*(rowH+10)
	})
	a.footer(false)
}

func (a *App) gameTile(i int, g *shared.Game, r image.Rectangle) {
	u := a.ui
	prov := ProviderFor(g.ProviderID())
	br := prov.Brand()
	hit := image.Rect(r.Min.X-8, r.Min.Y-8, r.Max.X+8, r.Max.Y+70)
	hov := u.mouseIn(hit)
	if hov {
		u.hoverID, u.pointer = fmt.Sprintf("tile%d", i), true
		if u.pressed {
			idx := i
			u.pending = func() { a.openGame(idx) }
		}
		u.Rect(hit, 14, colPanel)
		u.Rect(image.Rect(hit.Min.X, hit.Max.Y-4, hit.Max.X, hit.Max.Y), 0, br.Accent)
	}
	u.Rect(r, 10, colPanel2)
	if img := a.image(g.Cover); img != nil {
		u.Image(r, img, fitContain, 1)
	} else {
		u.Paragraph(r.Min.X+14, r.Min.Y+r.Dy()/2-24, r.Dx()-28, g.Name, 20, true, colMuted, 3)
	}
	u.Text(r.Min.X, r.Max.Y+10, u.fonts.ellipsize(g.Name, 18, true, r.Dx()), 18, true, colText)
	u.Badge(r.Min.X, r.Max.Y+38, br, 13)
}

func (a *App) openGame(i int) {
	a.page, a.cur, a.tab = pageGame, i, "game"
}

// footer zeichnet die Fußzeile mit Beenden.
func (a *App) footer(showHint bool) {
	u := a.ui
	u.Button("quit", image.Rect(a.W-48-140, a.H-64, a.W-48, a.H-24), "Beenden", a.styleSecondary(), func() { a.quit = true })
	if showHint && len(a.menu.Games) > 1 {
		u.Text(48, a.H-54, "Esc: zurück zur Auswahl", 14, false, colMuted)
	}
}

// --- Spielseite ---

var tabNames = map[string]string{"game": "Spiel", "dlcs": "DLCs", "patches": "Patches", "extras": "Extras"}

func (a *App) buildGame() {
	u := a.ui
	g := a.game()
	prov := ProviderFor(g.ProviderID())
	br := prov.Brand()
	multi := len(a.menu.Games) > 1

	x := 48
	if multi {
		u.Button("back", image.Rect(48, 24, 48+150, 24+36), "← Alle Spiele", a.styleSecondary(), func() { a.page = pageSelect })
		x = 48 + 150 + 20
	}
	nameW := a.W - x - 48
	bw := u.Badge(0, -100, br, 14) // nur Breite messen (außerhalb des Bildes gezeichnet)
	title := u.fonts.ellipsize(g.Name, 30, true, nameW-bw-16)
	u.Text(x, 22, title, 30, true, colText)
	u.Badge(x+int(u.fonts.width(title, 30, true))+14, 30, br, 14)

	// Linke Spalte: Cover
	coverW := 260
	coverH := minInt(390, a.H-84-110)
	cover := image.Rect(48, 84, 48+coverW, 84+coverH)
	u.Rect(cover, 12, colPanel2)
	if img := a.image(g.Cover); img != nil {
		u.Image(cover, img, fitContain, 1)
	} else {
		u.Paragraph(cover.Min.X+16, cover.Min.Y+cover.Dy()/2-24, cover.Dx()-32, g.Name, 22, true, colMuted, 3)
	}
	u.Rect(image.Rect(cover.Min.X, cover.Max.Y+10, cover.Max.X, cover.Max.Y+13), 1, br.Accent)
	if g.EstimatedSizeMB > 0 {
		u.Text(cover.Min.X, cover.Max.Y+22, fmt.Sprintf("ca. %s auf der Festplatte", formatMB(g.EstimatedSizeMB)), 14, false, colMuted)
	}

	// Rechts: Reiter und Inhalt
	px := 348
	pw := a.W - px - 48
	tabs := []string{"game"}
	for _, sec := range shared.Sections {
		if len(g.Entries(sec)) > 0 {
			tabs = append(tabs, sec)
		}
	}
	if !contains(tabs, a.tab) {
		a.tab = "game"
	}
	tx := px
	for _, t := range tabs {
		w := int(u.fonts.width(tabNames[t], 18, true)) + 40
		st := a.styleSecondary()
		st.bold = true
		st.size = 18
		if t == a.tab {
			st = a.stylePrimary(br.Accent)
			st.size = 18
		}
		tname := t
		u.Button("tab-"+t, image.Rect(tx, 84, tx+w, 84+40), tabNames[t], st, func() { a.tab = tname })
		tx += w + 8
	}
	body := image.Rect(px, 132, px+pw, a.H-84)
	u.Rect(body, 14, colPanel)

	inner := body.Inset(18)
	if a.tab != "extras" {
		inner = a.settingsBar(inner, g, prov, br)
	}
	a.tabContent(inner, g, prov, br)
	a.footer(true)
}

func formatMB(mb float64) string {
	if mb >= 1024 {
		return fmt.Sprintf("%.1f GB", mb/1024)
	}
	return fmt.Sprintf("%.0f MB", mb)
}

func contains(l []string, s string) bool {
	for _, x := range l {
		if x == s {
			return true
		}
	}
	return false
}

// settingsBar zeichnet Stille Installation und Zielordner und gibt den Rest des Bereichs zurück.
func (a *App) settingsBar(r image.Rectangle, g *shared.Game, prov Provider, br Brand) image.Rectangle {
	u := a.ui
	if !prov.CanInstall() {
		return r
	}
	u.Check("silent", image.Rect(r.Min.X, r.Min.Y, r.Max.X, r.Min.Y+32), "Stille Installation (ohne Fenster des Installers)", a.silent, br.Accent, true, func() {
		a.silent = !a.silent
		if a.silent && prov.UsesTargetDir() && a.targets[a.cur] == "" {
			a.targets[a.cur] = defaultTarget(g.Name)
		}
	})
	y := r.Min.Y + 38
	if a.silent && prov.UsesTargetDir() {
		u.Text(r.Min.X, y+10, "Zielordner", 15, false, colMuted)
		fx := r.Min.X + 100
		bw := 160
		f := image.Rect(fx, y, r.Max.X-bw-10, y+42)
		t := a.targets[a.cur]
		u.Field("target", f, &t, `z. B. C:\GOG Games\`+g.Name, br.Accent)
		a.targets[a.cur] = t
		u.Button("browse", image.Rect(r.Max.X-bw, y, r.Max.X, y+42), "Durchsuchen ...", a.styleSecondary(), func() { a.browseTarget() })
		y += 52
	} else if a.silent && !prov.UsesTargetDir() && prov.Note() != "" {
		y += u.Paragraph(r.Min.X, y, r.Dx(), prov.Note(), 14, false, colMuted, 3) + 6
	}
	u.Rect(image.Rect(r.Min.X, y+2, r.Max.X, y+3), 0, colLine)
	return image.Rect(r.Min.X, y+12, r.Max.X, r.Max.Y)
}

func defaultTarget(name string) string {
	clean := strings.Map(func(r rune) rune {
		if strings.ContainsRune(`\/:*?"<>|`, r) {
			return -1
		}
		return r
	}, name)
	return `C:\GOG Games\` + strings.TrimSpace(clean)
}

func (a *App) browseTarget() {
	idx := a.cur
	go func() {
		p, err := browseFolder("Zielordner für die Installation wählen")
		if err != nil {
			a.msg = &message{"Ordner wählen", err.Error()}
			return
		}
		if p != "" {
			a.targets[idx] = p
		}
	}()
}

func (a *App) tabContent(r image.Rectangle, g *shared.Game, prov Provider, br Brand) {
	u := a.ui
	if a.tab == "game" {
		u.ScrollArea("game-"+fmt.Sprint(a.cur), r, func(top int) int {
			y := top
			label := "Installieren"
			var click func()
			if prov.CanInstall() {
				gi := a.cur
				click = func() { a.startInstall(gi, g.Name, g.Installer, g.Args) }
			} else {
				label = "Nicht verfügbar"
			}
			u.Button("install-game", image.Rect(r.Min.X, y, r.Min.X+300, y+54), label, a.stylePrimary(br.Accent), click)
			y += 54 + 14
			if n := prov.Note(); n != "" {
				y += u.Paragraph(r.Min.X, y, r.Dx()-16, n, 15, false, colMuted, 0) + 10
			}
			if d := strings.TrimSpace(g.Description); d != "" {
				y += u.Paragraph(r.Min.X, y, r.Dx()-16, d, 17, false, colText, 0)
			} else {
				y += u.Paragraph(r.Min.X, y, r.Dx()-16, "Keine Beschreibung.", 16, false, colMuted, 0)
			}
			return y - top + 8
		})
		return
	}
	entries := g.Entries(a.tab)
	u.ScrollArea("tab-"+a.tab+fmt.Sprint(a.cur), r, func(top int) int {
		y := top
		lastGroup := "\x00"
		for i := range entries {
			e := &entries[i]
			if e.Group != lastGroup {
				lastGroup = e.Group
				if e.Group != "" {
					y += 8
					u.Text(r.Min.X, y, strings.ToUpper(e.Group), 14, true, br.Accent)
					y += 24
				}
			}
			y += a.entryRow(image.Rect(r.Min.X, y, r.Max.X-14, y+0), e, g, prov, br) + 10
		}
		return y - top + 8
	})
}

// entryRow zeichnet eine Zeile und gibt ihre Höhe zurück.
func (a *App) entryRow(r image.Rectangle, e *shared.Entry, g *shared.Game, prov Provider, br Brand) int {
	u := a.ui
	hasCover := e.Cover != "" && a.image(e.Cover) != nil
	tx := r.Min.X + 16
	if hasCover {
		tx += 48 + 12
	}
	btnW := 150
	textW := r.Max.X - 16 - btnW - 16 - tx
	nameLines := u.fonts.wrap(e.Name, 18, true, textW)
	h := 14 + len(nameLines[:minInt(2, len(nameLines))])*lineHeight(18)
	desc := strings.TrimSpace(e.Description)
	descLines := 0
	if desc != "" {
		descLines = minInt(3, len(u.fonts.wrap(desc, 15, false, textW)))
		h += 4 + descLines*lineHeight(15)
	}
	h += 14
	if h < 76 {
		h = 76
	}
	row := image.Rect(r.Min.X, r.Min.Y, r.Max.X, r.Min.Y+h)
	u.Rect(row, 12, colPanel2)
	if hasCover {
		u.Image(image.Rect(r.Min.X+16, row.Min.Y+(h-68)/2, r.Min.X+16+48, row.Min.Y+(h-68)/2+68), a.image(e.Cover), fitContain, 1)
	}
	y := row.Min.Y + 14
	y += u.Paragraph(tx, y, textW, e.Name, 18, true, colText, 2)
	if desc != "" {
		u.Paragraph(tx, y+4, textW, desc, 15, false, colMuted, 3)
	}
	label, click := "Öffnen", func() { a.openEntry(e) }
	st := a.styleSecondary()
	if e.Installer != "" {
		label = "Installieren"
		st = a.stylePrimary(br.Accent)
		st.size = 17
		if prov.CanInstall() {
			gi, name := a.cur, e.Name
			click = func() { a.startInstall(gi, name, e.Installer, e.Args) }
		} else {
			click = nil
		}
	}
	u.Button(fmt.Sprintf("e-%p", e), image.Rect(row.Max.X-16-btnW, row.Min.Y+(h-42)/2, row.Max.X-16, row.Min.Y+(h-42)/2+42), label, st, click)
	return h
}

// --- Aktionen ---

func (a *App) openEntry(e *shared.Entry) {
	target := e.Open
	if !shared.IsURL(target) {
		p, err := shared.ResolveOnDisc(a.discRoot, target)
		if err != nil {
			a.msg = &message{"Nicht gefunden", fmt.Sprintf("%s\n\nDie Datei liegt nicht auf der Disc (gesucht in %s).", target, a.discRoot)}
			return
		}
		target = p
	}
	if err := openTarget(target); err != nil {
		a.msg = &message{"Öffnen fehlgeschlagen", err.Error()}
	}
}

func (a *App) startInstall(gi int, title, rel string, entryArgs []string) {
	g := &a.menu.Games[gi]
	prov := ProviderFor(g.ProviderID())
	if !prov.CanInstall() {
		a.msg = &message{"Nicht unterstützt", prov.Note()}
		return
	}
	exe, err := shared.ResolveOnDisc(a.discRoot, rel)
	if err != nil {
		a.msg = &message{"Installer nicht gefunden", fmt.Sprintf("%s\n\nDie Datei liegt nicht auf der Disc (gesucht in %s).", rel, a.discRoot)}
		return
	}
	job := &InstallJob{Title: title, Provider: prov, Installer: exe, EntryArgs: entryArgs, EstimateMB: g.EstimatedSizeMB}
	job.Silent = a.silent && prov.SilentAvailable(entryArgs)
	if job.Silent && prov.UsesTargetDir() {
		job.Target = strings.TrimSpace(a.targets[gi])
		if job.Target == "" {
			a.msg = &message{"Zielordner fehlt", "Für die stille Installation muss ein Zielordner angegeben werden."}
			return
		}
	}
	if job.Silent {
		job.LogPath = filepath.Join(os.TempDir(), fmt.Sprintf("discmenu-install-%d.log", time.Now().UnixNano()))
	}
	a.install = StartInstall(job, a.runner, a.detector)
}

// --- Fenster für Meldungen und Installation ---

func (a *App) buildModal() {
	u := a.ui
	u.Rect(image.Rect(0, 0, a.W, a.H), 0, colOverlay)
	w := minInt(760, a.W-80)
	inner := w - 56
	if a.install != nil {
		a.installModal(w, inner)
		return
	}
	m := a.msg
	lines := len(u.fonts.wrap(m.body, 17, false, inner))
	h := 28 + 40 + minInt(lines, 14)*lineHeight(17) + 24 + 52 + 28
	box := image.Rect((a.W-w)/2, (a.H-h)/2, (a.W+w)/2, (a.H+h)/2)
	u.Rect(box, 16, colPanel2)
	u.Text(box.Min.X+28, box.Min.Y+24, m.title, 24, true, colText)
	u.Paragraph(box.Min.X+28, box.Min.Y+68, inner, m.body, 17, false, colText, 14)
	u.Button("ok", image.Rect(box.Max.X-28-140, box.Max.Y-28-44, box.Max.X-28, box.Max.Y-28), "OK", a.stylePrimary(colAccent), func() { a.msg = nil })
}

func (a *App) installModal(w, inner int) {
	u := a.ui
	info := a.install.Snapshot()
	g := a.game()
	br := ProviderFor(g.ProviderID()).Brand()
	var title, body string
	ok := true
	if !info.Done {
		title = "Installation läuft"
		body = info.Job.Title
		if info.Job.Silent {
			body += "\nDer Installer läuft ohne eigenes Fenster."
			if info.Job.Target != "" {
				body += "\nZiel: " + info.Job.Target
			}
		} else {
			body += "\nDer Installer hat ein eigenes Fenster. Dieses Menü wartet, bis er fertig ist."
		}
		if a.silent && !info.Job.Silent {
			body += "\n(Für diesen Eintrag ist keine stille Installation möglich, der Installer läuft normal.)"
		}
	} else {
		ok, body = describeResult(info)
		title = "Fertig"
		if !ok {
			title = "Installation nicht erfolgreich"
		}
		body = info.Job.Title + "\n\n" + body
	}
	lines := minInt(14, len(u.fonts.wrap(body, 16, false, inner)))
	h := 28 + 40 + lines*lineHeight(16) + 20 + 22 + 20 + 52 + 28
	box := image.Rect((a.W-w)/2, (a.H-h)/2, (a.W+w)/2, (a.H+h)/2)
	u.Rect(box, 16, colPanel2)
	accent := br.Accent
	if info.Done && !ok {
		accent = colErr
	} else if info.Done {
		accent = colOK
	}
	u.Rect(image.Rect(box.Min.X, box.Min.Y, box.Max.X, box.Min.Y+5), 0, accent)
	u.Text(box.Min.X+28, box.Min.Y+24, title, 24, true, colText)
	y := box.Min.Y + 68
	y += u.Paragraph(box.Min.X+28, y, inner, body, 16, false, colText, 14) + 20
	u.Progress(image.Rect(box.Min.X+28, y, box.Max.X-28, y+14), progressFor(info), accent)
	if info.Done {
		u.Button("done", image.Rect(box.Max.X-28-140, box.Max.Y-28-44, box.Max.X-28, box.Max.Y-28), "OK", a.stylePrimary(accent), func() {
			if info.Found != "" && a.targets[a.cur] == "" {
				a.targets[a.cur] = info.Found
			}
			a.install = nil
		})
	}
}

func progressFor(i InstallInfo) float64 {
	if i.Done {
		return 1
	}
	return i.Progress
}

// --- Screenshot (nur zur Prüfung der Oberfläche) ---

func (a *App) saveShot() error {
	if a.lastScreen == nil {
		return nil
	}
	b := a.lastScreen.Bounds()
	pix := make([]byte, 4*b.Dx()*b.Dy())
	a.lastScreen.ReadPixels(pix)
	img := &image.RGBA{Pix: pix, Stride: 4 * b.Dx(), Rect: image.Rect(0, 0, b.Dx(), b.Dy())}
	f, err := os.Create(a.shotTo)
	if err != nil {
		return err
	}
	defer f.Close()
	if err := encodePNG(f, img); err != nil {
		return err
	}
	return ebiten.Termination
}
