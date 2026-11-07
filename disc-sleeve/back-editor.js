/* Editor für die Rückseite (Pop-up): Bilder und Texte auf der Gestaltungsfläche frei anordnen.
   Ziehen zum Verschieben, Griffe zum Skalieren, Eigenschaften rechts, Bilder aus Datei oder direkt von Steam/GOG.
   Die Daten liegen in CoverApp.state.back.items (siehe core.js); gezeichnet wird mit BackDesign (back-design.js), genau wie auf dem Cover. */
(function () {
  'use strict';
  const C = window.CoverCore, O = window.CoverOnline, App = window.CoverApp, BD = window.BackDesign;
  if (!C || !App || !BD) return;
  const PX = 96 / 25.4;                                   // Bildschirmpunkte je mm
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const $ = (s, r) => (r || dlg).querySelector(s);
  const round = (n) => Math.round(n * 100) / 100;
  const snap025 = (n) => Math.round(n * 4) / 4;

  let dlg, stage, scaled, itemsBox, selBox, pane, panel, footA, footB;
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
    if (target) change(() => update(target, { img: key }), { panel: true });
    else change(() => { add(C.newItem('image', { ...center(w, h), w, h, img: key })); }, { panel: true });
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
    stage.style.backgroundImage = base ? 'url("' + base.url + '")' : 'none';
    footA.style.height = back().featH + 'mm'; footB.style.height = back().reqH + 'mm';
    BD.renderInto(itemsBox, items(), { images: App.images, state: App.state, editor: true });
    drawSel();
  }
  function drawSel() {
    const it = byId(selId);
    selBox.hidden = !it;
    if (!it) return;
    const s = selBox.style, hd = round(10 / (k * PX));
    s.left = it.x + 'mm'; s.top = it.y + 'mm'; s.width = it.w + 'mm'; s.height = it.h + 'mm';
    selBox.style.setProperty('--hd', hd + 'mm');
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
  function hit(p) { const l = items(); for (let i = l.length - 1; i >= 0; i--) { const it = l[i]; if (p.x >= it.x && p.x <= it.x + it.w && p.y >= it.y && p.y <= it.y + it.h) return it; } return null; }
  /* Einrasten an Kanten und Mitte der Fläche und anderer Elemente (ca. 4 Bildschirmpunkte) */
  function snapValue(v, targets) { const th = 4 / (PX * k); let best = v, d = th; for (const t of targets) if (Math.abs(t - v) < d) { d = Math.abs(t - v); best = t; } return best; }
  function targets(skip, axis) {
    const a = area(), t = axis === 'x' ? [0, a.w / 2, a.w] : [0, a.h / 2, a.h];
    for (const o of items()) if (o.id !== skip) t.push(axis === 'x' ? o.x : o.y, axis === 'x' ? o.x + o.w : o.y + o.h);
    return t;
  }
  function onDown(ev) {
    if (ev.button !== 0) return;
    const hdl = ev.target.closest('.hd'), p = toMm(ev);
    let it = hdl ? byId(selId) : hit(p);
    if (!it) { selId = null; refresh(true); return; }
    if (selId !== it.id) { selId = it.id; drawSel(); buildPanel(); }
    remember();
    drag = { id: it.id, mode: hdl ? hdl.dataset.h : 'move', p0: p, o: { x: it.x, y: it.y, w: it.w, h: it.h }, moved: false };
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
    if (m === 'move') {
      let nx = o.x + dx, ny = o.y + dy;
      const c = [sx(nx), sx(nx + o.w / 2) - o.w / 2, sx(nx + o.w) - o.w].reduce((b, v) => (Math.abs(v - nx) < Math.abs(b - nx) ? v : b), nx + 99);
      const d = [sy(ny), sy(ny + o.h / 2) - o.h / 2, sy(ny + o.h) - o.h].reduce((b, v) => (Math.abs(v - ny) < Math.abs(b - ny) ? v : b), ny + 99);
      x = Math.abs(c - nx) < 90 ? c : nx; y = Math.abs(d - ny) < 90 ? d : ny;
    } else {
      if (m.includes('e')) w = sx(o.x + o.w + dx) - o.x;
      if (m.includes('s')) h = sy(o.y + o.h + dy) - o.y;
      if (m.includes('w')) { const nx = sx(o.x + dx); w = o.x + o.w - nx; x = nx; }
      if (m.includes('n')) { const ny = sy(o.y + dy); h = o.y + o.h - ny; y = ny; }
      if (ev.shiftKey && it.type === 'image' && o.h > 0) { const ratio = o.w / o.h; if (m.includes('e') || m.includes('w')) { const nh = w / ratio; if (m.includes('n')) y = o.y + o.h - nh; h = nh; } else { const nw = h * ratio; if (m.includes('w')) x = o.x + o.w - nw; w = nw; } }
      if (w < 2) { if (m.includes('w')) x -= 2 - w; w = 2; }
      if (h < 2) { if (m.includes('n')) y -= 2 - h; h = 2; }
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
  const GEO = ['x', 'y', 'w', 'h'];
  function syncGeo() {
    const it = byId(selId); if (!it) return;
    for (const g of GEO) { const i = panel.querySelector('[data-g="' + g + '"]'); if (i && document.activeElement !== i) i.value = it[g]; }
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
    let first = true;
    i.addEventListener('input', () => { if (first) { remember(); first = false; } update(it, { [key]: Number(i.value) }); App.touch(); drawStage(); });
    i.addEventListener('change', () => { first = true; refresh(false); });
    return i;
  }
  function select(it, key, opts) {
    const s = el('select'); for (const [v, l] of opts) { const o = el('option', '', l); o.value = v; s.append(o); }
    s.value = String(it[key]); s.addEventListener('change', () => change(() => update(it, { [key]: s.value }), { panel: true })); return s;
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
    panel.append(el('h3', '', it.type === 'image' ? 'Bild' : 'Text'));
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
      panel.append(row('Schrift', select(it, 'font', Object.entries(BD.FONTS).map(([v, f]) => [v, f.label]))));
      panel.append(el('p', 'hint', 'Schriften kommen vom Betriebssystem und sehen auf anderen Rechnern etwas anders aus.'));
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
    } else {
      const src = el('div', 'drow');
      src.append(btn('Datei wählen …', () => pickFile((f) => addImageFile(f, it))), btn('Von Steam oder GOG …', () => openGallery(it)));
      panel.append(src);
      const img = App.images[it.img];
      panel.append(el('p', 'hint', img ? 'Bild: ' + (img.name || it.img) + (img.w ? ' (' + img.w + ' × ' + img.h + ' px)' : '') : 'Noch kein Bild gewählt.'), dpiNode(it));
      panel.append(row('Einpassen', select(it, 'fit', [['cover', 'Füllen (zuschneiden)'], ['contain', 'Ganz zeigen'], ['stretch', 'Strecken']])));
      if (it.fit === 'cover') { const t = el('div', 'two'); t.append(row('Ausschnitt waagerecht', range(it, 'posX', 0, 100)), row('Ausschnitt senkrecht', range(it, 'posY', 0, 100))); panel.append(t); }
    }
    panel.append(row('Deckkraft (%)', range(it, 'opacity', 5, 100)));
    panel.append(row('Rand und Übergang', select(it, 'edge', Object.entries(BD.EDGES))));
    if (it.edge !== 'none') {
      const unit = it.edge === 'torn' ? 'Zacken (mm)' : it.edge === 'round' ? 'Rundung (mm)' : it.edge === 'feather' ? 'Breite des Übergangs (mm)' : 'Rahmenbreite (mm)';
      const t = el('div', 'two'); t.append(row(unit, num(it, 'edgeSize', 0.25, 0, 20)));
      if (it.edge === 'border') t.append(row('Rahmenfarbe', color(it, 'borderColor')));
      panel.append(t, el('p', 'hint', 'Steht 0, gilt ein sinnvoller Standardwert.'));
    }
    const g = el('div', 'geo');
    g.append(row('X (mm)', num(it, 'x', 0.25)), row('Y (mm)', num(it, 'y', 0.25)), row('Breite (mm)', num(it, 'w', 0.25, 2)), row('Höhe (mm)', num(it, 'h', 0.25, 2)));
    panel.append(g);
    const acts = el('div', 'drow');
    acts.append(
      btn('Nach vorn', () => moveLayer(it, 1)), btn('Nach hinten', () => moveLayer(it, -1)),
      btn('Duplizieren', () => duplicate(it)), btn('Löschen', () => remove(it), 'danger'));
    panel.append(acts);
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
  function applyTemplate(id) {
    if (items().length && !confirm('Die vorhandenen Elemente werden durch die Vorlage ersetzt. Weitermachen?')) return false;
    const a = area();
    change(() => {
      back().items = []; selId = null;
      C.backTemplate(id, a.w, a.h).forEach((it) => { add(it); });
      selId = null;
    }, { panel: true });
    return true;
  }

  /* ---------- Aufbau des Pop-ups ---------- */
  function build() {
    dlg = el('dialog', 'bed'); dlg.id = 'bdlg';
    const head = el('div', 'dh');
    head.append(el('h2', '', 'Rückseite gestalten'), el('span', 'hint', ''), btn('Fertig', () => close(), 'pri'));
    head.children[1].id = 'bedCount';
    const bar = el('div', 'bed-bar');
    const tpl = el('select'); tpl.id = 'bedTpl'; tpl.title = 'Vorlage';
    const o0 = el('option', '', 'Vorlage wählen …'); o0.value = ''; tpl.append(o0);
    Object.entries(C.BACK_TEMPLATES).forEach(([v, l]) => { const o = el('option', '', l); o.value = v; tpl.append(o); });
    tpl.addEventListener('change', () => { if (tpl.value) applyTemplate(tpl.value); tpl.value = ''; });
    const undoB = btn('Rückgängig', undo); undoB.id = 'bedUndo'; const redoB = btn('Wiederholen', redo); redoB.id = 'bedRedo';
    bar.append(
      btn('+ Text', () => change(() => { const w = 60, h = 14; add(C.newItem('text', { ...center(w, h), w, h, text: 'Text', size: 12 })); }, { panel: true }), 'pri'),
      btn('+ Bild (Datei)', () => pickFile((f) => addImageFile(f, null))),
      btn('+ Bild von Steam oder GOG', () => openGallery(null)),
      tpl, undoB, redoB);
    const main = el('div', 'bed-main');
    pane = el('div', 'bed-pane');
    const wrap = el('div', 'bed-wrap'); scaled = el('div', 'bed-scaled');
    stage = el('div', 'bed-stage'); itemsBox = el('div', 'bitems'); selBox = el('div', 'bed-sel'); selBox.hidden = true;
    HANDLES.forEach((h) => { const d = el('span', 'hd hd-' + h); d.dataset.h = h; selBox.append(d); });
    stage.append(itemsBox, selBox);
    footA = el('div', 'bed-foot', 'Spielfunktionen (fester Teil)'); footB = el('div', 'bed-foot', 'Systemanforderungen und Logos (fester Teil)');
    scaled.append(stage, footA, footB); wrap.append(scaled); pane.append(wrap);
    panel = el('div', 'bed-panel');
    main.append(pane, panel);
    dlg.append(head, bar, main);
    document.body.append(dlg);
    buildGallery();
    pane.addEventListener('pointerdown', (ev) => { if (!scaled.contains(ev.target) && selId) { selId = null; refresh(true); } });
    scaled.addEventListener('pointerdown', onDown); scaled.addEventListener('pointermove', onMove); scaled.addEventListener('pointerup', onUp); scaled.addEventListener('pointercancel', onUp);
    dlg.addEventListener('keydown', onKey);
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
    selId = null; undoStack = []; redoStack = []; gal.hidden = true;
    if (!dlg.open) { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
    refresh(true);
    requestAnimationFrame(() => refresh(false));
  }
  function close() { if (dlg && typeof dlg.close === 'function') dlg.close(); else if (dlg) { dlg.removeAttribute('open'); onClosed(); } }

  document.addEventListener('DOMContentLoaded', () => { const b = document.getElementById('bDesign'); if (b) b.addEventListener('click', open); });
  if (document.readyState !== 'loading') { const b = document.getElementById('bDesign'); if (b) b.addEventListener('click', open); }
  window.BackEditor = { open, close };
})();
