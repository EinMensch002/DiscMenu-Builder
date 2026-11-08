/* Editor für die Rückseite (Pop-up): Bilder und Texte auf der Gestaltungsfläche frei anordnen.
   Ziehen zum Verschieben, Griffe zum Skalieren, Eigenschaften rechts, Bilder aus Datei oder direkt von Steam/GOG.
   Die Daten liegen in CoverApp.state.back.items (siehe core.js); gezeichnet wird mit BackDesign (back-design.js), genau wie auf dem Cover. */
(function () {
  'use strict';
  const C = window.CoverCore, O = window.CoverOnline, App = window.CoverApp, BD = window.BackDesign, F = window.CoverFiles;
  if (!C || !App || !BD) return;
  const PX = 96 / 25.4;                                   // Bildschirmpunkte je mm
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const $ = (s, r) => (r || dlg).querySelector(s);
  const round = (n) => Math.round(n * 100) / 100;
  const snap025 = (n) => Math.round(n * 4) / 4;

  let imgMode = false, shapeMenu, tplBar, dlg, stage, scaled, itemsBox, selBox, pane, panel, footA, footB;
  let selId = null, k = 1, undoStack = [], redoStack = [], drag = null;

  const back = () => App.state.back;
  const items = () => back().items;
  const byId = (id) => items().find((i) => i.id === id);
  const dims = () => App.caseDims();
  const area = () => { const d = dims(); return { w: d.back, h: C.designHeight(App.state, d) }; };

  /* ---------- Rückgängig ---------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function remember() { undoStack.push(clone({ items: items(), seq: back().seq, description: back().description })); if (undoStack.length > 50) undoStack.shift(); redoStack = []; }
  function restoreFrom(snap) { Object.assign(back(), clone(snap)); if (!byId(selId)) selId = null; App.touch(); refresh(true); }
  function undo() { if (!undoStack.length) return; redoStack.push(clone({ items: items(), seq: back().seq, description: back().description })); restoreFrom(undoStack.pop()); }
  function redo() { if (!redoStack.length) return; undoStack.push(clone({ items: items(), seq: back().seq, description: back().description })); restoreFrom(redoStack.pop()); }

  /* ---------- Änderungen ---------- */
  function change(fn, opts) {                               // fn ändert die Elemente; danach neu zeichnen
    if (!opts || !opts.noUndo) remember();
    fn(); App.touch(); refresh(!!(opts && opts.panel));
  }
  function update(it, props) {
    const n = C.normalizeItem({ ...it, ...props }); if (!n) return;
    n.id = it.id; Object.keys(it).forEach((key) => { if (!(key in n)) delete it[key]; }); Object.assign(it, n);
  }
  function add(it) {
    if (items().length >= C.MAX_ITEMS) { alert('Mehr als ' + C.MAX_ITEMS + ' Elemente passen nicht auf die Rückseite.'); return null; }
    let n = 1; while (byId('e' + n)) n++;
    it.id = 'e' + n; items().push(it); selId = it.id; return it;
  }
  function newKey() { const key = 'd' + back().seq; back().seq++; return key; }
  const center = (w, h) => { const a = area(); return { x: round((a.w - w) / 2), y: round((a.h - h) / 2) }; };

  async function addImageFile(file, target) {
    const key = newKey();
    await App.setImage(key, file);
    const img = App.images[key], ratio = img && img.w ? img.w / img.h : 1.5, a = area();
    let w = Math.min(a.w * 0.6, 70), h = round(w / ratio);
    if (h > a.h * 0.8) { h = round(a.h * 0.8); w = round(h * ratio); }
    if (target) change(() => update(target, target.type === 'shape' ? { img: key, useImg: true } : { img: key }), { panel: true });
    else change(() => { add(C.newItem('image', { ...center(w, h), w, h, img: key })); }, { panel: true });
  }
  const SHAPE_LABELS = [['ellipse', 'Kreis / Ellipse'], ['triangle', 'Dreieck'], ['rect', 'Viereck'], ['star', 'Stern'], ['poly', 'Freie Fläche']];
  function addShape(kind) {
    const w = 40, h = kind === 'triangle' ? 35 : 40;
    change(() => { add(C.newItem('shape', { shape: kind, color: '#e8a33a', ...center(w, h), w, h, pts: C.defaultPts(kind) })); }, { panel: true });
  }
  /* Schriftdateien wählen (mehrere möglich). Die zuletzt hinzugefügte gilt für dieses Textelement. */
  function addFontFile(it) {
    const inp = el('input'); inp.type = 'file'; inp.accept = '.woff2,.woff,.ttf,.otf,font/*'; inp.multiple = true; inp.id = 'bedFontFile';
    inp.addEventListener('change', async () => {
      const files = [...inp.files]; let last = null; const errs = [];
      for (const f of files) {
        try {
          const raw = await App.fonts.fromFile(f);
          const same = App.fonts.list().find((x) => x.name.toLowerCase() === raw.name.toLowerCase());
          last = same ? await App.fonts.replace(raw.name, raw) : await App.fonts.add(raw);
        } catch (e) { errs.push(e.message); }
      }
      if (last) change(() => update(it, { font: last.id }), { panel: true });
      [...new Set(errs)].forEach((m) => alert(m));
    });
    inp.hidden = true; document.body.append(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
  }
  function pickFile(cb) {
    const inp = el('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.addEventListener('change', async () => { for (const f of [...inp.files]) await cb(f); });
    inp.click();
  }

  /* ---------- Zeichnen ---------- */
  function fitScale() {
    const a = area(), total = a.h + Number(back().featH) + Number(back().reqH);
    const aw = Math.max(200, pane.clientWidth - 28), ah = Math.max(200, pane.clientHeight - 28);
    k = Math.min(aw / (a.w * PX), ah / (total * PX), 4);
    scaled.style.transform = 'scale(' + k + ')';
    scaled.parentNode.style.width = a.w * PX * k + 'px'; scaled.parentNode.style.height = total * PX * k + 'px';
    scaled.style.width = a.w + 'mm'; scaled.style.height = total + 'mm';
  }
  function drawStage() {
    const a = area(), base = App.images.backTop;
    stage.style.width = a.w + 'mm'; stage.style.height = a.h + 'mm';
    const span = !!back().span;
    scaled.classList.toggle('span', span);
    scaled.style.backgroundImage = span && base ? 'url("' + base.url + '")' : '';
    stage.style.backgroundImage = !span && base ? 'url("' + base.url + '")' : 'none';
    footA.style.height = back().featH + 'mm'; footB.style.height = back().reqH + 'mm';
    itemsBox.style.setProperty('--ol', round(2 / (k * PX)) + 'mm');   // Umriss immer ca. 2 Bildschirmpunkte dick
    BD.renderInto(itemsBox, items(), { images: App.images, state: App.state, editor: true, selId });
    drawSel();
  }
  function drawSel() {
    const it = byId(selId);
    selBox.hidden = !it;
    if (!it) return;
    const s = selBox.style, hd = round(10 / (k * PX));
    s.left = it.x + 'mm'; s.top = it.y + 'mm'; s.width = it.w + 'mm'; s.height = it.h + 'mm';
    selBox.querySelectorAll('.pt').forEach((n) => n.remove());
    if (it.type === 'shape' && ['rect', 'triangle', 'poly'].includes(it.shape)) it.pts.forEach((q, i) => { const d = el('span', 'pt'); d.dataset.i = i; d.style.left = q[0] + '%'; d.style.top = q[1] + '%'; d.title = 'Punkt ziehen'; selBox.append(d); });
    selBox.style.setProperty('--hd', hd + 'mm'); s.transform = it.rot ? 'rotate(' + it.rot + 'deg)' : '';
  }
  function refresh(rebuildPanel) {
    fitScale(); drawStage();
    if (rebuildPanel) buildPanel(); else syncGeo();
    $('#bedUndo').disabled = !undoStack.length; $('#bedRedo').disabled = !redoStack.length;
    $('#bedCount').textContent = items().length + ' / ' + C.MAX_ITEMS + ' Elemente';
  }

  /* ---------- Ziehen und Skalieren ---------- */
  const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  function toMm(ev) { const r = stage.getBoundingClientRect(); return { x: (ev.clientX - r.left) / (PX * k), y: (ev.clientY - r.top) / (PX * k) }; }
  const rotPt = (x, y, deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return { x: x * c - y * s, y: x * s + y * c }; };
  /* liegt der Punkt (Prozent des Rahmens) in der Form? */
  function inShape(it, fx, fy) {
    const pts = BD.shapePoints(it);
    if (!pts) return ((fx - 50) / 50) ** 2 + ((fy - 50) / 50) ** 2 <= 1;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > fy) !== (yj > fy) && fx < (xj - xi) * (fy - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function hit(p) {
    const l = items();
    for (let i = l.length - 1; i >= 0; i--) {
      const it = l[i], cx = it.x + it.w / 2, cy = it.y + it.h / 2, q = rotPt(p.x - cx, p.y - cy, -(it.rot || 0));
      if (Math.abs(q.x) > it.w / 2 || Math.abs(q.y) > it.h / 2) continue;
      if (it.type === 'shape' && !inShape(it, (q.x + it.w / 2) / it.w * 100, (q.y + it.h / 2) / it.h * 100)) continue;
      return it;
    }
    return null;
  }
  /* Einrasten an Kanten und Mitte der Fläche und anderer Elemente (ca. 4 Bildschirmpunkte) */
  function snapValue(v, targets) { const th = 4 / (PX * k); let best = v, d = th; for (const t of targets) if (Math.abs(t - v) < d) { d = Math.abs(t - v); best = t; } return best; }
  function targets(skip, axis) {
    const a = area(), t = axis === 'x' ? [0, a.w / 2, a.w] : [0, a.h / 2, a.h];
    for (const o of items()) {
      if (o.id !== skip) t.push(axis === 'x' ? o.x : o.y, axis === 'x' ? o.x + o.w : o.y + o.h);
      if (o.type === 'shape' && !o.rot && ['rect', 'triangle', 'poly'].includes(o.shape)) for (const q of o.pts) t.push(axis === 'x' ? o.x + q[0] / 100 * o.w : o.y + q[1] / 100 * o.h);
    }
    return t;
  }
  function onDown(ev) {
    if (ev.button !== 0) return;
    const hdl = ev.target.closest('.hd'), pt = ev.target.closest('.pt'), p = toMm(ev);
    let it = hdl || pt ? byId(selId) : hit(p);
    if (!it) { selId = null; refresh(true); return; }
    if (selId !== it.id) { selId = it.id; imgMode = false; drawStage(); buildPanel(); }
    remember();
    drag = { id: it.id, mode: hdl ? hdl.dataset.h : pt ? 'pt' : imgMode && it.img ? 'pan' : 'move', pi: pt ? Number(pt.dataset.i) : -1, p0: p, o: { x: it.x, y: it.y, w: it.w, h: it.h, rot: it.rot || 0, posX: it.posX, posY: it.posY, pts: it.pts ? clone(it.pts) : null }, moved: false };
    ev.preventDefault(); scaled.setPointerCapture(ev.pointerId);
  }
  function onMove(ev) {
    if (!drag) return;
    const it = byId(drag.id); if (!it) return;
    const p = toMm(ev), dx = p.x - drag.p0.x, dy = p.y - drag.p0.y, o = drag.o, m = drag.mode;
    if (!drag.moved && Math.hypot(dx, dy) * PX * k < 2) return;
    drag.moved = true;
    const tx = targets(it.id, 'x'), ty = targets(it.id, 'y'), noSnap = ev.altKey;
    const sx = (v) => (noSnap ? v : snapValue(v, tx)), sy = (v) => (noSnap ? v : snapValue(v, ty));
    let { x, y, w, h } = o;
    if (m === 'rot') {
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      let a = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
      if (ev.shiftKey) a = Math.round(a / 15) * 15;
      else if (Math.abs(((a % 90) + 90) % 90) < 2 || Math.abs(((a % 90) + 90) % 90 - 90) < 2) a = Math.round(a / 90) * 90;   // rastet bei 0, 90, 180, 270 ein
      a = ((a + 540) % 360) - 180;
      update(it, { rot: Math.round(a * 10) / 10 }); drawStage(); syncGeo(); return;
    }
    if (m === 'pt') {                                              // Punkt einer Form ziehen (rastet an Kanten, Mitte und Punkten ein)
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2, q = rotPt(p.x - cx, p.y - cy, -o.rot);
      let lx = q.x + o.w / 2, ly = q.y + o.h / 2;
      if (!o.rot && !noSnap) {
        const own = (ax) => o.pts.filter((_, i) => i !== drag.pi).map((r) => (ax === 'x' ? o.x + r[0] / 100 * o.w : o.y + r[1] / 100 * o.h));
        lx = snapValue(o.x + lx, tx.concat(own('x'))) - o.x; ly = snapValue(o.y + ly, ty.concat(own('y'))) - o.y;
      }
      const pts = clone(o.pts); pts[drag.pi] = [Math.min(100, Math.max(0, lx / o.w * 100)), Math.min(100, Math.max(0, ly / o.h * 100))];
      update(it, { pts }); drawStage(); syncGeo(); return;
    }
    if (m === 'pan') {                                             // Bild im Rahmen verschieben
      const img = App.images[it.img];
      if (img && img.w) {
        const d = rotPt(dx, dy, -o.rot), kk = Math.max(o.w / img.w, o.h / img.h) * (it.zoom || 100) / 100, fw = o.w - img.w * kk, fh = o.h - img.h * kk;
        update(it, { posX: fw ? o.posX + d.x / fw * 100 : o.posX, posY: fh ? o.posY + d.y / fh * 100 : o.posY }); drawStage(); syncGeo();
      }
      return;
    }
    if (m === 'move') {
      let nx = o.x + dx, ny = o.y + dy;
      const c = [sx(nx), sx(nx + o.w / 2) - o.w / 2, sx(nx + o.w) - o.w].reduce((b, v) => (Math.abs(v - nx) < Math.abs(b - nx) ? v : b), nx + 99);
      const d = [sy(ny), sy(ny + o.h / 2) - o.h / 2, sy(ny + o.h) - o.h].reduce((b, v) => (Math.abs(v - ny) < Math.abs(b - ny) ? v : b), ny + 99);
      x = Math.abs(c - nx) < 90 ? c : nx; y = Math.abs(d - ny) < 90 ? d : ny;
    } else {
      /* Skalieren im Rahmen des Elements (auch gedreht): Bewegung in den gedrehten Rahmen umrechnen, gegenüberliegende Kante bleibt stehen */
      const d = rotPt(dx, dy, -o.rot), cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      let L = -o.w / 2, R = o.w / 2, T = -o.h / 2, B = o.h / 2;
      if (m.includes('e')) R += d.x; if (m.includes('w')) L += d.x; if (m.includes('s')) B += d.y; if (m.includes('n')) T += d.y;
      if (!o.rot && !noSnap) { if (m.includes('e')) R = sx(cx + R) - cx; if (m.includes('w')) L = sx(cx + L) - cx; if (m.includes('s')) B = sy(cy + B) - cy; if (m.includes('n')) T = sy(cy + T) - cy; }
      if (ev.shiftKey && it.type === 'image' && o.h > 0 && m.length === 2) { const nh = (R - L) / (o.w / o.h); if (m.includes('n')) T = B - nh; else B = T + nh; }
      if (R - L < 2) { if (m.includes('w')) L = R - 2; else R = L + 2; }
      if (B - T < 2) { if (m.includes('n')) T = B - 2; else B = T + 2; }
      w = R - L; h = B - T;
      const off = rotPt((L + R) / 2, (T + B) / 2, o.rot);
      x = cx + off.x - w / 2; y = cy + off.y - h / 2;
    }
    update(it, { x: round(x), y: round(y), w: round(w), h: round(h) });
    drawStage(); syncGeo();
  }
  function onUp(ev) {
    if (!drag) return;
    const moved = drag.moved; drag = null;
    try { scaled.releasePointerCapture(ev.pointerId); } catch (e) { /* egal */ }
    if (moved) { App.touch(); refresh(false); } else undoStack.pop();
  }

  /* ---------- Eigenschaften ---------- */
  const GEO = ['x', 'y', 'w', 'h', 'rot', 'zoom', 'posX', 'posY'];
  function syncGeo() {
    const it = byId(selId); if (!it) return;
    for (const g of GEO) { const i = panel.querySelector('[data-g="' + g + '"]'); if (i && document.activeElement !== i) i.value = it[g]; }
    if (it.pts) panel.querySelectorAll('[data-p]').forEach((n) => { const [i, ax] = n.dataset.p.split(':').map(Number); if (it.pts[i] && document.activeElement !== n) n.value = it.pts[i][ax]; });
    const info = panel.querySelector('#bedDpi'); if (info) info.replaceWith(dpiNode(it));
  }
  function dpiNode(it) {
    const n = el('p', 'hint'); n.id = 'bedDpi';
    const img = App.images[it.img];
    if (it.type !== 'image' || !img || !img.w) return n;
    const mmPerPx = it.fit === 'cover' ? Math.max(it.w / img.w, it.h / img.h) : it.fit === 'contain' ? Math.max(it.w / img.w, it.h / img.h) : Math.min(it.w / img.w, it.h / img.h);
    const dpi = Math.round(25.4 / mmPerPx);
    n.textContent = 'Auflösung im Druck: etwa ' + dpi + ' dpi' + (dpi < 150 ? ' (eher unscharf)' : '');
    if (dpi < 150) n.classList.add('warn');
    return n;
  }
  function row(label, ...inputs) { const l = el('label', 'f'); l.append(el('span', 'lab', label), ...inputs); return l; }
  function num(it, key, step, min, max) {
    const i = el('input'); i.type = 'number'; i.step = String(step); if (min != null) i.min = min; if (max != null) i.max = max; i.value = it[key];
    if (GEO.includes(key)) i.dataset.g = key;
    let first = true;
    i.addEventListener('input', () => { if (i.value === '' || isNaN(Number(i.value))) return; if (first) { remember(); first = false; } update(it, { [key]: Number(i.value) }); App.touch(); drawStage(); });
    i.addEventListener('change', () => { first = true; refresh(false); });
    return i;
  }
  function range(it, key, min, max, step) {
    const i = el('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step || 1; i.value = it[key];
    if (GEO.includes(key)) i.dataset.g = key;
    let first = true;
    i.addEventListener('input', () => { if (first) { remember(); first = false; } update(it, { [key]: Number(i.value) }); App.touch(); drawStage(); });
    i.addEventListener('change', () => { first = true; refresh(false); });
    return i;
  }
  function select(it, key, opts) {
    const s = el('select'); for (const [v, l] of opts) { const o = el('option', '', l); o.value = v; s.append(o); }
    s.value = String(it[key]); s.addEventListener('change', () => change(() => update(it, { [key]: s.value }), { panel: true })); return s;
  }
  /* Schriftauswahl: jeder Eintrag steht in seiner eigenen Schrift (gruppiert: System, Spiele, eigene) */
  const UI_FONT = 'Lato, "Segoe UI", Arial, sans-serif';
  function fontSelect(it) {
    const s = el('select');
    for (const [label, test] of [['Systemschriften', (f) => !f.custom && f.group !== 'game'], ['Spiele-Schriften', (f) => f.group === 'game'], ['Eigene Schriften', (f) => f.custom]]) {
      const list = Object.entries(BD.FONTS).filter(([, f]) => test(f)); if (!list.length) continue;
      const g = document.createElement('optgroup'); g.label = label; g.style.fontFamily = UI_FONT; g.style.fontStyle = 'normal'; g.style.fontWeight = '900'; g.style.fontSize = '12px'; g.style.textTransform = 'uppercase'; g.style.letterSpacing = '.06em'; g.style.color = '#6b1a6e'; g.style.backgroundColor = '#efe3f2'; g.style.padding = '5px 6px';   // Überschrift nicht in der Schrift des Feldes
      for (const [v, f] of list) { const o = el('option', '', f.label); o.value = v; o.style.fontFamily = f.css; o.dataset.notr = ''; g.append(o); }
      s.append(g);
    }
    const cur = BD.FONTS[it.font] ? it.font : 'sans'; s.value = cur; s.style.fontFamily = BD.FONTS[cur].css;
    s.addEventListener('change', () => change(() => update(it, { font: s.value }), { panel: true }));
    return s;
  }
  function color(it, key) {
    const i = el('input'); i.type = 'color'; i.value = it[key] || '#000000'; let first = true;
    i.addEventListener('input', () => { if (first) { remember(); first = false; } update(it, { [key]: i.value }); App.touch(); drawStage(); });
    i.addEventListener('change', () => { first = true; refresh(false); });
    return i;
  }
  function check(it, key, label) {
    const l = el('label', 'chk'); const i = el('input'); i.type = 'checkbox'; i.checked = !!it[key];
    i.addEventListener('change', () => change(() => update(it, { [key]: i.checked }), { panel: true }));
    l.append(i, document.createTextNode(label)); return l;
  }
  function btn(label, fn, cls) { const b = el('button', cls || '', label); b.type = 'button'; b.addEventListener('click', fn); return b; }

  function buildPanel() {
    panel.replaceChildren();
    const it = byId(selId);
    if (!it) {
      panel.append(el('h3', '', 'Kein Element gewählt'), el('p', 'hint', 'Klicke ein Element auf der Fläche an oder füge oben ein Bild oder einen Text hinzu. Mit den Griffen änderst Du die Größe, mit den Pfeiltasten verschiebst Du fein (Umschalt: größere Schritte, Alt beim Ziehen: nicht einrasten).'));
      const d = el('p', 'hint'); d.textContent = 'Fläche: ' + area().w + ' × ' + area().h + ' mm.'; panel.append(d);
      return;
    }
    panel.append(el('h3', '', it.type === 'image' ? 'Bild' : it.type === 'shape' ? 'Form' : 'Text'));
    if (it.type === 'text') {
      const bind = select(it, 'bind', [['', 'Eigener Text'], ['title', 'Spieltitel'], ['description', 'Beschreibung des Spiels']]);
      panel.append(row('Inhalt', bind));
      const ta = el('textarea'); ta.rows = 4;
      if (it.bind === 'title') { ta.value = App.state.title; ta.disabled = true; ta.title = 'Der Titel steht im Formular unter Titel.'; }
      else {
        ta.value = it.bind === 'description' ? back().description : it.text;
        let first = true;
        ta.addEventListener('input', () => { if (first) { remember(); first = false; } if (it.bind === 'description') back().description = ta.value; else update(it, { text: ta.value }); App.touch(); drawStage(); const f = document.querySelector('[data-k="back.description"]'); if (f && it.bind === 'description') f.value = ta.value; });
        ta.addEventListener('change', () => { first = true; });
      }
      panel.append(row('Text', ta));
      panel.append(row('Schrift', fontSelect(it)));
      if (BD.FONTS[it.font] && BD.FONTS[it.font].custom) panel.append(btn('Diese eigene Schrift löschen', () => { if (confirm('Diese Schrift löschen? Texte, die sie benutzen, werden auf "Normal" gesetzt.')) App.fonts.remove(it.font).then(() => refresh(true)); }));
      panel.append(el('p', 'hint', 'Systemschriften sehen auf anderen Rechnern etwas anders aus. Eigene Schriften sehen überall gleich aus, wenn sie dort auch hinzugefügt sind.'));
      panel.append(btn('Eigene Schrift hinzufügen …', () => addFontFile(it)));
      const two = el('div', 'two');
      two.append(row('Größe (pt)', num(it, 'size', 0.5, 3, 120)), row('Farbe', color(it, 'color')));
      panel.append(two);
      panel.append(row('Stärke', select(it, 'weight', [['300', 'Dünn'], ['400', 'Normal'], ['700', 'Fett'], ['900', 'Extrafett']])));
      const cks = el('div', 'drow'); cks.append(check(it, 'italic', 'Kursiv'), check(it, 'caps', 'GROSSBUCHSTABEN'), check(it, 'fit', 'Schrift an Platz anpassen')); panel.append(cks);
      const two2 = el('div', 'two'); two2.append(row('Zeichenabstand', num(it, 'spacing', 1, -5, 60)), row('Zeilenhöhe', num(it, 'line', 0.05, 0.8, 3))); panel.append(two2);
      const two3 = el('div', 'two'); two3.append(row('Ausrichtung', select(it, 'align', [['left', 'Links'], ['center', 'Mitte'], ['right', 'Rechts'], ['justify', 'Blocksatz']])), row('Senkrecht', select(it, 'valign', [['top', 'Oben'], ['middle', 'Mitte'], ['bottom', 'Unten']]))); panel.append(two3);
      const hasBg = !!it.bg;
      const bgOn = el('label', 'chk'), bgi = el('input'); bgi.type = 'checkbox'; bgi.checked = hasBg;
      bgi.addEventListener('change', () => change(() => update(it, { bg: bgi.checked ? '#000000' : '' }), { panel: true })); bgOn.append(bgi, document.createTextNode('Hintergrund hinter dem Text'));
      panel.append(bgOn);
      if (hasBg) { const t = el('div', 'two'); t.append(row('Hintergrundfarbe', color(it, 'bg')), row('Deckkraft (%)', range(it, 'bgOpacity', 0, 100))); panel.append(t, row('Innenabstand (mm)', num(it, 'pad', 0.25, 0, 20))); }
    } else if (it.type === 'shape') {
      shapePanel(it);
    } else {
      const src = el('div', 'drow');
      src.append(btn('Datei wählen …', () => pickFile((f) => addImageFile(f, it))), btn('Von Steam oder GOG …', () => openGallery(it)));
      panel.append(src);
      const img = App.images[it.img];
      panel.append(el('p', 'hint', img ? 'Bild: ' + (img.name || it.img) + (img.w ? ' (' + img.w + ' × ' + img.h + ' px)' : '') : 'Noch kein Bild gewählt.'), dpiNode(it));
      panel.append(row('Einpassen', select(it, 'fit', [['cover', 'Füllen (zuschneiden)'], ['contain', 'Ganz zeigen'], ['stretch', 'Strecken']])));
      if (it.fit === 'cover') imageTools(it);
    }
    panel.append(row('Deckkraft (%)', range(it, 'opacity', 5, 100)));
    if (it.type !== 'shape') panel.append(row('Rand und Übergang', select(it, 'edge', Object.entries(BD.EDGES))));
    if (it.edge !== 'none') {
      const unit = it.edge === 'torn' ? 'Zacken (mm)' : it.edge === 'round' ? 'Rundung (mm)' : it.edge === 'feather' ? 'Breite des Übergangs (mm)' : 'Rahmenbreite (mm)';
      const t = el('div', 'two'); t.append(row(unit, num(it, 'edgeSize', 0.25, 0, 20)));
      if (it.edge === 'border') t.append(row('Rahmenfarbe', color(it, 'borderColor')));
      panel.append(t, el('p', 'hint', 'Steht 0, gilt ein sinnvoller Standardwert.'));
    }
    const g = el('div', 'geo');
    g.append(row('X (mm)', num(it, 'x', 0.25)), row('Y (mm)', num(it, 'y', 0.25)), row('Breite (mm)', num(it, 'w', 0.25, 2)), row('Höhe (mm)', num(it, 'h', 0.25, 2)));
    g.append(row('Drehung (°)', num(it, 'rot', 1, -180, 180)));
    panel.append(g);
    const acts = el('div', 'drow');
    acts.append(
      btn('Nach vorn', () => moveLayer(it, 1)), btn('Nach hinten', () => moveLayer(it, -1)),
      btn('Duplizieren', () => duplicate(it)), btn('Löschen', () => remove(it), 'danger'));
    panel.append(acts);
  }
  /* Zoom, Ausschnitt und Verschieben des Bildes im Rahmen (bei Bildern mit "Füllen" und bei Formen mit Bild) */
  function imageTools(it) {
    const t = el('div', 'two'); t.append(row('Ausschnitt waagerecht', range(it, 'posX', 0, 100, 0.5)), row('Ausschnitt senkrecht', range(it, 'posY', 0, 100, 0.5))); panel.append(t);
    panel.append(row('Zoom (%)', range(it, 'zoom', 100, 500)));
    if (!App.images[it.img]) return;
    const b = btn(imgMode ? 'Bild verschieben beenden' : 'Bild im Ausschnitt verschieben', () => { imgMode = !imgMode; buildPanel(); }, imgMode ? 'pri' : '');
    const dr = el('div', 'drow'); dr.append(b);
    panel.append(dr, el('p', 'hint', imgMode ? 'Ziehe auf der Fläche, um das Bild im Rahmen zu verschieben, das Mausrad zoomt. Außerhalb der Form ist das Bild grau zu sehen (nur hier, nicht im Druck).' : 'Mit diesem Knopf schiebst und zoomst Du das Bild innerhalb der Form oder des Rahmens.'));
  }
  /* Eigenschaften einer Form */
  function shapePanel(it) {
    const usesPts = ['rect', 'triangle', 'poly'].includes(it.shape);
    if (!it.useImg) panel.append(row('Füllfarbe', color(it, 'color')));
    panel.append(check(it, 'useImg', 'Bild statt Farbe'));
    if (it.useImg) {
      const src = el('div', 'drow'); src.append(btn('Datei wählen …', () => pickFile((f) => addImageFile(f, it))), btn('Von Steam oder GOG …', () => openGallery(it))); panel.append(src);
      const img = App.images[it.img];
      panel.append(el('p', 'hint', img ? 'Bild: ' + (img.name || it.img) + (img.w ? ' (' + img.w + ' × ' + img.h + ' px)' : '') : 'Noch kein Bild gewählt.'), dpiNode(it));
      imageTools(it);
    }
    { const t = el('div', 'two'); t.append(row('Rand (mm)', num(it, 'strokeW', 0.25, 0, 10)), row('Randfarbe', color(it, 'borderColor'))); panel.append(t); }
    if (it.shape === 'star') { const t = el('div', 'two'); t.append(row('Zacken', num(it, 'sides', 1, 3, 12)), row('Tiefe der Zacken (%)', range(it, 'inner', 10, 90))); panel.append(t); }
    if (!usesPts) {
      panel.append(btn('Als freie Fläche bearbeiten', () => change(() => {
        const pts = it.shape === 'ellipse' ? Array.from({ length: 16 }, (_, i) => [round(50 + 50 * Math.cos(i * Math.PI / 8)), round(50 + 50 * Math.sin(i * Math.PI / 8))]) : BD.shapePoints(it);
        update(it, { shape: 'poly', pts });
      }, { panel: true })));
      return;
    }
    panel.append(el('h3', '', 'Punkte'), el('p', 'hint', 'Ziehe die Punkte auf der Fläche (sie rasten an Kanten, Mitte und anderen Punkten ein, Alt: nicht einrasten) oder tippe die Werte ein (in Prozent des Rahmens).'));
    it.pts.forEach((q, i) => {
      const r = el('div', 'prow'); r.append(el('span', '', String(i + 1)));
      [0, 1].forEach((ax) => {
        const n = el('input'); n.type = 'number'; n.step = '0.5'; n.min = 0; n.max = 100; n.value = q[ax]; n.dataset.p = i + ':' + ax; let first = true;
        n.addEventListener('input', () => { if (n.value === '' || isNaN(Number(n.value))) return; if (first) { remember(); first = false; } const pts = clone(it.pts); pts[i][ax] = Number(n.value); update(it, { pts }); App.touch(); drawStage(); });
        n.addEventListener('change', () => { first = true; refresh(false); });
        r.append(n);
      });
      const d = btn('✕', () => change(() => update(it, { pts: it.pts.filter((_, j) => j !== i) }), { panel: true })); d.title = 'Punkt löschen'; d.disabled = it.pts.length <= 3; r.append(d);
      panel.append(r);
    });
    const add1 = btn('Punkt hinzufügen', () => change(() => {
      const pts = clone(it.pts); let bi = 0, bl = -1;
      pts.forEach((q, i) => { const n = pts[(i + 1) % pts.length], l = Math.hypot(n[0] - q[0], n[1] - q[1]); if (l > bl) { bl = l; bi = i; } });
      const a = pts[bi], b = pts[(bi + 1) % pts.length]; pts.splice(bi + 1, 0, [round((a[0] + b[0]) / 2), round((a[1] + b[1]) / 2)]);
      if (pts.length <= C.MAX_PTS) update(it, { shape: 'poly', pts });
    }, { panel: true }));
    panel.append(add1);
  }
  function moveLayer(it, dir) { change(() => { const l = items(), i = l.indexOf(it), j = i + dir; if (j < 0 || j >= l.length) return; l.splice(i, 1); l.splice(j, 0, it); }); }
  function duplicate(it) { change(() => { const c = clone(it); const n = add(c); if (n) { n.x = round(n.x + 3); n.y = round(n.y + 3); } }, { panel: true }); }
  function remove(it) { change(() => { const l = items(); l.splice(l.indexOf(it), 1); selId = null; }, { panel: true }); }

  /* ---------- Bilder von Steam und GOG ---------- */
  let gal;
  function buildGallery() {
    gal = el('div', 'bed-gal'); gal.hidden = true;
    dlg.append(gal);
  }
  function openGallery(target) {
    gal.hidden = false; gal.replaceChildren();
    const head = el('div', 'dh'); head.append(el('h2', '', 'Bilder von Steam oder GOG'), btn('Schließen', () => { gal.hidden = true; }));
    const src = el('select'); [['steam', 'Steam'], ['gog', 'GOG']].forEach(([v, l]) => { const o = el('option', '', l); o.value = v; src.append(o); });
    src.value = App.state.provider === 'gog' ? 'gog' : 'steam';
    const q = el('input'); q.type = 'text'; q.placeholder = 'Spielname, Adresse oder ID'; q.value = App.state.title || '';
    const go = btn('Suchen', () => search(), 'pri');
    const bar = el('div', 'drow'); bar.append(src, q, go);
    const msg = el('p', 'hint'), body = el('div', 'gal-body');
    gal.append(head, bar, msg, body);
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } });
    const say = (t, bad) => { msg.textContent = t; msg.classList.toggle('warn', !!bad); };

    async function search() {
      body.replaceChildren(); say('Suche …');
      try {
        const term = q.value.trim(); if (!term) { say('Bitte einen Spielnamen eingeben.', true); return; }
        if (src.value === 'steam') {
          const id = O.parseSteamRef(term);
          if (id) return showSteam(id);
          const list = await O.steamSearch(term);
          return pickGame(list.slice(0, 8).map((g) => ({ id: String(g.id), name: g.name })), showSteam);
        }
        const id = O.parseGogRef(term);
        if (id) return showGog(id);
        const list = await O.gogSearch(term);
        return pickGame(list.slice(0, 8).map((g) => ({ id: g.id, name: g.name + (g.year ? ' (' + g.year + ')' : '') })), showGog);
      } catch (e) { say(e.message || String(e), true); }
    }
    function pickGame(list, fn) {
      if (!list.length) { say('Nichts gefunden.', true); return; }
      say('Spiel wählen:');
      body.replaceChildren(...list.map((g) => btn(g.name, async () => { body.replaceChildren(); say('Lade Bilder …'); try { await fn(g.id); } catch (e) { say(e.message || String(e), true); } }, 'gal-game')));
    }
    async function showSteam(id) {
      const d = await O.steamDetails(id), list = [];
      (d.screenshots || []).forEach((s, i) => list.push({ thumb: s.path_thumbnail || s.path_full, full: s.path_full, name: 'Screenshot ' + (i + 1) }));
      if (d.background_raw || d.background) list.push({ thumb: d.background_raw || d.background, full: d.background_raw || d.background, name: 'Hintergrund' });
      if (d.header_image) list.push({ thumb: d.header_image, full: d.header_image, name: 'Titelbild (Shop)' });
      showImages(d.name, list);
    }
    async function showGog(id) {
      const v2 = await O.gogGame(id), im = O.gogImages(v2), list = [];
      im.shots.forEach((u, i) => list.push({ thumb: u, full: u, name: 'Screenshot ' + (i + 1) }));
      if (im.background) list.push({ thumb: im.background, full: im.background, name: 'Hintergrund' });
      if (im.logo) list.push({ thumb: im.logo, full: im.logo, name: 'Logo' });
      if (im.cover) list.push({ thumb: im.cover, full: im.cover, name: 'Cover (klein)' });
      showImages(O.gogDetails(v2).name, list);
    }
    function showImages(title, list) {
      if (!list.length) { say('Zu diesem Spiel gibt es keine Bilder.', true); return; }
      say((title || 'Spiel') + ': ' + (target ? 'ein Bild wählen' : 'Bilder wählen (mehrere möglich)'));
      const grid = el('div', 'gal-grid'), picked = new Set();
      list.forEach((im, i) => {
        const c = el('button', 'gal-img'); c.type = 'button'; c.title = im.name;
        const img = el('img'); img.src = im.thumb; img.alt = ''; img.loading = 'lazy'; c.append(img, el('span', '', im.name));
        c.addEventListener('click', () => { if (target) picked.clear(); if (picked.has(i)) picked.delete(i); else picked.add(i); grid.querySelectorAll('.gal-img').forEach((n, j) => n.classList.toggle('on', picked.has(j))); ok.disabled = !picked.size; });
        grid.append(c);
      });
      const ok = btn(target ? 'Bild übernehmen' : 'Gewählte Bilder hinzufügen', async () => {
        ok.disabled = true; let n = 0;
        for (const i of [...picked].sort((a, b) => a - b)) {
          say('Lade ' + (++n) + ' von ' + picked.size + ' …');
          try {
            const blob = await O.fetchBlob(list[i].full), file = new File([blob], list[i].name + (blob.type === 'image/png' ? '.png' : '.jpg'), { type: blob.type || 'image/jpeg' });
            await addImageFile(file, target);
          } catch (e) { say(e.message || String(e), true); ok.disabled = false; return; }
        }
        gal.hidden = true;
      }, 'pri');
      ok.disabled = true;
      body.replaceChildren(grid, ok);
    }
    if (q.value && !target) search();
  }

  /* ---------- Vorlagen ---------- */
  const customTpl = (id) => App.templates.list().find((t) => t.id === id);
  /* Elemente einer Vorlage (eingebaut oder eigene) für die aktuelle Fläche */
  function tplItems(id, a) { const t = customTpl(id); return t ? C.instantiateTemplate(t, a.w, a.h) : C.backTemplate(id, a.w, a.h); }
  function applyTemplate(id) {
    if (items().length && !confirm('Die vorhandenen Elemente werden durch die Vorlage ersetzt. Weitermachen?')) return false;
    const a = area();
    change(() => {
      back().items = []; selId = null;
      tplItems(id, a).forEach((it) => { add(it); });
      selId = null;
    }, { panel: true });
    return true;
  }
  /* Grobe Vorschau einer Vorlage: Bilder als graue Flächen, Texte als Zeilen, dunkle Flächen als Grund */
  function previewOf(id) {
    const a = area(), box = el('div', 'tp');
    box.style.aspectRatio = a.w + ' / ' + Math.max(1, a.h);
    for (const it of tplItems(id, a)) {
      if (it.type === 'shape') {
        if (!it.useImg && it.w >= a.w - 0.5 && it.h >= a.h - 0.5 && it.shape === 'rect') { box.style.background = it.color; continue; }
        const f = el('i', it.useImg ? 'tp-image' : 'tp-fill');
        Object.assign(f.style, { left: it.x / a.w * 100 + '%', top: it.y / a.h * 100 + '%', width: it.w / a.w * 100 + '%', height: it.h / a.h * 100 + '%', clipPath: BD.clipOf(it) });
        if (!it.useImg) f.style.backgroundColor = it.color;
        box.append(f); continue;
      }
      const isFill = it.type === 'text' && it.bg && !it.text && !it.bind;
      if (isFill && it.w >= a.w - 0.5) { box.style.background = it.bg; continue; }
      const n = el('i', isFill ? 'tp-fill' : 'tp-' + it.type);
      Object.assign(n.style, { left: it.x / a.w * 100 + '%', top: it.y / a.h * 100 + '%', width: it.w / a.w * 100 + '%', height: it.h / a.h * 100 + '%' });
      if (it.type === 'text') {
        if (it.bg) n.style.backgroundColor = isFill ? it.bg : 'transparent';
        n.style.color = it.color; if (it.size >= 14) n.classList.add('big');
        if (it.bg && !isFill) { n.style.boxShadow = 'inset 0 0 0 100px rgba(0,0,0,.35)'; }
      }
      if (it.rot) n.style.transform = 'rotate(' + it.rot + 'deg)';
      box.append(n);
    }
    return box;
  }
  function tplCard(id, label) {
    const c = el('button', 'tpl-card'); c.type = 'button'; c.dataset.tpl = id; c.title = label;
    c.append(previewOf(id), el('span', '', label));
    c.addEventListener('click', () => applyTemplate(id));
    return c;
  }
  const slugOf = (t) => String(t).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'vorlage';
  async function exportTemplate(t) {
    const blob = new Blob([await F.packBundle({ templates: [t] }, '')], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'discsleeve-vorlage-' + slugOf(t.name) + '.json';
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  /* Aktuelles Layout als eigene Vorlage speichern (ohne Bilder) */
  function saveAsTemplate() {
    if (!items().length) { alert('Das Layout ist leer. Es gibt nichts zu speichern.'); return; }
    const name = prompt('Name der Vorlage:', 'Eigene Vorlage'); if (name == null) return;
    const t = C.templateFromItems(items(), area(), name);
    if (!t.name) { alert('Bitte einen Namen eingeben.'); return; }
    const list = App.templates.list(), same = list.find((o) => o.name.toLowerCase() === t.name.toLowerCase());
    let saved;
    if (same && confirm('Es gibt schon eine Vorlage mit diesem Namen. Ersetzen? (Abbrechen: unter einem neuen Namen speichern)')) saved = App.templates.replace(t.name, t);
    else { t.name = F.freeName(t.name, list.map((o) => o.name)); saved = App.templates.add(t); }
    if (!saved) alert('Zu viele eigene Vorlagen. Bitte zuerst eine löschen.');
    tplBar.hidden = false; buildTplBar(); refresh(false);
  }
  /* Vorlagen aus einer Datei hinzufügen; bei gleichem Namen wird gefragt, nichts anderes wird verändert */
  async function importTemplates(file) {
    let b;
    try { b = await F.unpackBundle(await file.text(), ''); } catch (e) { alert(e.message === 'PASSWORD_NEEDED' ? 'Die Datei ist verschlüsselt. Bitte in den Einstellungen mit "Aus Datei einlesen" öffnen.' : e.message); return; }
    if (!b.templates || !b.templates.length) { alert('Die Datei enthält keine Vorlagen.'); return; }
    const cur = { templates: App.templates.list() }, plan = F.planImport({ templates: b.templates }, cur);
    const choices = plan.templates.map((e) => (e.conflict ? (confirm('Die Vorlage gibt es schon. Ersetzen? (Abbrechen: beide behalten)') ? 'replace' : 'both') : 'add'));
    const res = F.applyImport(plan, cur, { templates: choices }).templates;
    let full = false;
    res.replace.forEach((r) => App.templates.replace(r.name, r.item));
    res.add.forEach((t) => { if (!App.templates.add(t)) full = true; });
    if (full) alert('Zu viele eigene Vorlagen. Bitte zuerst eine löschen.');
    else if (b.skipped) alert('Einige Einträge in der Datei waren fehlerhaft und wurden übersprungen.');
    buildTplBar();
  }
  function buildTplBar() {
    const own = App.templates.list();
    const fin = el('input'); fin.type = 'file'; fin.accept = '.json,application/json'; fin.multiple = true; fin.hidden = true; fin.id = 'bedTplFile';
    fin.addEventListener('change', async () => { const files = [...fin.files]; fin.value = ''; for (const f of files) await importTemplates(f); });
    const nodes = Object.entries(C.BACK_TEMPLATES).map(([id, label]) => tplCard(id, label));
    if (own.length) nodes.push(el('h4', 'tpl-h', 'Eigene Vorlagen'));
    for (const t of own) {
      const w = el('div', 'tpl-wrap'), acts = el('div', 'tpl-acts');
      const ex = btn('Als Datei', () => exportTemplate(t)); ex.title = 'Als Datei sichern';
      const del = btn('Löschen', () => { if (confirm('Diese Vorlage löschen?')) { App.templates.remove(t.id); buildTplBar(); } }); del.title = 'Vorlage löschen'; del.dataset.del = t.id;
      acts.append(ex, del); w.append(tplCard(t.id, t.name), acts); nodes.push(w);
    }
    const addB = btn('Layout als Vorlage speichern …', saveAsTemplate, 'tpl-add'); addB.id = 'bedTplSave';
    const impB = btn('+ Vorlage importieren …', () => fin.click(), 'tpl-add'); impB.id = 'bedTplImport';
    tplBar.replaceChildren(...nodes, addB, impB, fin);
  }

  /* ---------- Aufbau des Pop-ups ---------- */
  function build() {
    dlg = el('dialog', 'bed'); dlg.id = 'bdlg';
    const head = el('div', 'dh');
    head.append(el('h2', '', 'Rückseite gestalten'), el('span', 'hint', ''), btn('Fertig', () => close(), 'pri'));
    head.children[1].id = 'bedCount';
    shapeMenu = el('span', 'shape-menu'); shapeMenu.hidden = true;
    SHAPE_LABELS.forEach(([kind, label]) => shapeMenu.append(btn(label, () => { addShape(kind); shapeMenu.hidden = true; })));
    const bar = el('div', 'bed-bar');
    const tplBtn = btn('Vorlagen', () => { tplBar.hidden = !tplBar.hidden; if (!tplBar.hidden) buildTplBar(); refresh(false); }); tplBtn.id = 'bedTplBtn';
    const spanL = el('label', 'chk'), spanI = el('input'); spanI.type = 'checkbox'; spanI.id = 'bedSpan';
    spanI.addEventListener('change', () => { remember(); back().span = spanI.checked; App.touch(); refresh(false); const f = document.querySelector('input[data-k="back.span"]:not(#bedSpan)'); if (f) f.checked = spanI.checked; });
    spanL.append(spanI, document.createTextNode('Durchgehendes Bild über die ganze Rückseite'));
    const undoB = btn('Rückgängig', undo); undoB.id = 'bedUndo'; const redoB = btn('Wiederholen', redo); redoB.id = 'bedRedo';
    bar.append(
      btn('+ Text', () => change(() => { const w = 60, h = 14; add(C.newItem('text', { ...center(w, h), w, h, text: 'Text', size: 12 })); }, { panel: true }), 'pri'),
      btn('+ Bild (Datei)', () => pickFile((f) => addImageFile(f, null))),
      btn('+ Bild von Steam oder GOG', () => openGallery(null)),
      btn('+ Form', () => { shapeMenu.hidden = !shapeMenu.hidden; }),
      shapeMenu,
      tplBtn, spanL, undoB, redoB);
    const main = el('div', 'bed-main');
    pane = el('div', 'bed-pane');
    const wrap = el('div', 'bed-wrap'); scaled = el('div', 'bed-scaled');
    stage = el('div', 'bed-stage'); itemsBox = el('div', 'bitems'); selBox = el('div', 'bed-sel'); selBox.hidden = true;
    HANDLES.forEach((h) => { const d = el('span', 'hd hd-' + h); d.dataset.h = h; selBox.append(d); });
    { const line = el('span', 'rot-line'), rot = el('span', 'hd hd-rot'); rot.dataset.h = 'rot'; rot.title = 'Drehen (Umschalt: in 15°-Schritten)'; selBox.append(line, rot); }
    stage.append(itemsBox, selBox);
    footA = el('div', 'bed-foot', 'Spielfunktionen (fester Teil)'); footB = el('div', 'bed-foot', 'Systemanforderungen und Logos (fester Teil)');
    scaled.append(stage, footA, footB); wrap.append(scaled); pane.append(wrap);
    panel = el('div', 'bed-panel');
    tplBar = el('div', 'bed-tpls'); tplBar.hidden = true;
    main.append(tplBar, pane, panel);
    dlg.append(head, bar, main);
    document.body.append(dlg);
    buildGallery();
    pane.addEventListener('pointerdown', (ev) => { if (!ev.composedPath().includes(scaled) && selId) { selId = null; refresh(true); } });
    scaled.addEventListener('wheel', (ev) => { const it = byId(selId); if (!imgMode || !it || !it.img) return; ev.preventDefault(); update(it, { zoom: (it.zoom || 100) - ev.deltaY / 4 }); App.touch(); drawStage(); syncGeo(); }, { passive: false });
    scaled.addEventListener('pointerdown', onDown); scaled.addEventListener('pointermove', onMove); scaled.addEventListener('pointerup', onUp); scaled.addEventListener('pointercancel', onUp);
    document.addEventListener('keydown', (ev) => { if (dlg.open && gal.hidden) onKey(ev); });
    dlg.addEventListener('close', onClosed);
    window.addEventListener('resize', () => { if (dlg.open) refresh(false); });
  }
  function onKey(ev) {
    const tag = (ev.target.tagName || '').toLowerCase();
    if (/^(input|textarea|select)$/.test(tag)) return;
    const mod = ev.ctrlKey || ev.metaKey, key = ev.key.toLowerCase();
    if (mod && key === 'z') { ev.preventDefault(); ev.shiftKey ? redo() : undo(); return; }
    if (mod && key === 'y') { ev.preventDefault(); redo(); return; }
    const it = byId(selId); if (!it) return;
    if (mod && key === 'd') { ev.preventDefault(); duplicate(it); return; }
    if (key === 'delete' || key === 'backspace') { ev.preventDefault(); remove(it); return; }
    const step = ev.shiftKey ? 1 : 0.25, d = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }[key];
    if (d) { ev.preventDefault(); change(() => update(it, { x: round(it.x + d[0]), y: round(it.y + d[1]) })); }
  }
  /* Beim Schließen nicht mehr benutzte Bilder der Gestaltungsfläche entfernen (Speicher und Projektdatei bleiben klein) */
  function onClosed() {
    const used = new Set(items().map((i) => i.img).filter(Boolean));
    Object.keys(App.images).filter((key) => /^d\d+$/.test(key) && !used.has(key)).forEach((key) => App.clearImage(key));
    App.touch();
  }
  function open() {
    if (!dlg) build();
    selId = null; imgMode = false; undoStack = []; redoStack = []; gal.hidden = true;
    $('#bedSpan').checked = !!back().span;
    if (!dlg.open) { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
    refresh(true);
    requestAnimationFrame(() => refresh(false));
  }
  function close() { if (dlg && typeof dlg.close === 'function') dlg.close(); else if (dlg) { dlg.removeAttribute('open'); onClosed(); } }

  document.addEventListener('DOMContentLoaded', () => { const b = document.getElementById('bDesign'); if (b) b.addEventListener('click', open); });
  if (document.readyState !== 'loading') { const b = document.getElementById('bDesign'); if (b) b.addEventListener('click', open); }
  window.BackEditor = { open, close };
})();
