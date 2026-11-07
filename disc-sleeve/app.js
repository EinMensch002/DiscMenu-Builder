/* Cover-Tool: Oberfläche. Die Logik für Maße und Texte steht in core.js. */
(function () {
  'use strict';
  const C = window.CoverCore;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const STORE = 'discmenu-cover:v1';

  let state = load();
  const images = {};      // key -> { url, w, h, name, svg }
  let dirty = false;

  /* ---------- Speichern (nur Einstellungen, keine Bilder) ---------- */
  function load() {
    try { return C.mergeState(JSON.parse(localStorage.getItem(STORE))); } catch (e) { return C.defaultState(); }
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* Speicher gesperrt: egal */ } }

  /* ---------- Zugriff auf verschachtelte Werte ("cpu.intel.pre") ---------- */
  const walk = (path) => path.split('.');
  function get(path) { return walk(path).reduce((o, k) => (o == null ? o : o[k]), state); }
  function set(path, value) {
    const keys = walk(path), last = keys.pop();
    keys.reduce((o, k) => o[k], state)[last] = value;
  }

  /* ---------- Eingabeelemente und Zustand verbinden ---------- */
  function readControl(el) {
    const k = el.dataset.k;
    if (el.type === 'radio') { if (el.checked) set(k, el.value); }
    else if (el.type === 'checkbox' && 'list' in el.dataset) {
      const list = new Set(get(k));
      el.checked ? list.add(el.value) : list.delete(el.value);
      set(k, [...list]);
    } else if (el.type === 'checkbox') set(k, el.checked);
    else if (el.tagName === 'BUTTON') set(k, get(k) === el.dataset.v ? '' : el.dataset.v);
    else set(k, el.value);
  }
  function writeControl(el) {
    const k = el.dataset.k, v = get(k);
    if (el.type === 'radio') el.checked = v === el.value;
    else if (el.type === 'checkbox' && 'list' in el.dataset) el.checked = v.includes(el.value);
    else if (el.type === 'checkbox') el.checked = !!v;
    else if (el.tagName === 'BUTTON') el.classList.toggle('on', v === el.dataset.v);
    else if (document.activeElement !== el) el.value = v;   // beim Tippen nichts überschreiben
  }
  /* ---------- Listen für Prozessoren und Grafikkarten ----------
     Jeder Eintrag ist eine Zeile mit Haken (auf dem Cover zeigen), Art, Auswahlfeldern und Löschen. Mit den Knöpfen darunter kommen weitere Einträge dazu. */
  const HW_KIND_LABEL = { intel: 'Intel', amd: 'AMD', geforce: 'GeForce', radeon: 'Radeon', text: 'Text' };
  function hwRow(type, it) {
    const row = el('div', 'hwrow' + (it.on ? '' : ' off')), spec = C.HW[type][it.kind];
    const field = (tag, f, props) => { const n = document.createElement(tag); n.dataset.f = f; Object.assign(n, props || {}); return n; };
    const select = (f, values, current, label) => { const n = field('select', f); values.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; n.append(o); }); n.value = current; if (label) n.title = label; return n; };
    const on = field('input', 'on', { type: 'checkbox', checked: it.on, title: 'Auf dem Cover zeigen' });
    row.append(on, select('kind', [...Object.keys(C.HW[type]), 'text'].map((k) => [k, HW_KIND_LABEL[k]]), it.kind, 'Art'));
    if (!spec) row.append(field('input', 'text', { type: 'text', value: it.text, placeholder: 'z. B. Arc A380 oder Pentium III 500 MHz', className: 'grow' }));
    else {
      row.append(select('pre', spec.series.map((x) => [x, x]), it.pre, 'Reihe'), field('input', 'num', { type: 'text', value: it.num, size: 6, placeholder: type === 'cpu' ? '12400' : '3060', title: 'Modell' }),
        select('sfx', spec.sfx.map((x) => [x, x || '–']), it.sfx, 'Zusatz'));
      if (type === 'gpu') row.append(field('input', 'gb', { type: 'text', value: it.gb, size: 3, placeholder: 'GB', title: 'Speicher in GB (z. B. 6)', inputMode: 'decimal' }));
    }
    row.append(field('button', 'del', { type: 'button', textContent: '✕', title: 'Eintrag entfernen' }));
    return row;
  }
  function renderHw() {
    $$('[data-hw]').forEach((box) => {
      const type = box.dataset.hw, items = get(box.dataset.path).items, sig = JSON.stringify(items);
      if (box.dataset.sig === sig) return;
      box.dataset.sig = sig;
      $('.hwitems', box).replaceChildren(...items.map((it) => hwRow(type, it)));
    });
  }
  function bindHw() {
    const box = (n) => n.closest('[data-hw]');
    const edit = (e) => {
      const n = e.target, b = n.dataset && n.dataset.f ? box(n) : null;
      if (!b) return;
      const type = b.dataset.hw, items = get(b.dataset.path).items, row = n.closest('.hwrow'), idx = [...row.parentNode.children].indexOf(row), it = items[idx], f = n.dataset.f;
      if (!it || f === 'del') return;
      if (f === 'on') { it.on = n.checked; row.classList.toggle('off', !it.on); }
      else if (f === 'kind') { Object.assign(it, C.newHwItem(type, n.value), { on: it.on }); b.dataset.sig = ''; }
      else it[f] = n.value;
      if (b.dataset.sig !== '') b.dataset.sig = JSON.stringify(items);
      renderHw(); changed();
    };
    $('#form').addEventListener('input', edit);
    $('#form').addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.f && e.target.tagName === 'SELECT') edit(e); });
    $('#form').addEventListener('click', (e) => {
      const add = e.target.closest('[data-hwadd]'), del = e.target.closest('[data-f=del]');
      if (add) {
        const b = box(add), items = get(b.dataset.path).items;
        if (items.length < C.HW_MAX) items.push(C.newHwItem(b.dataset.hw, add.dataset.hwadd));
        b.dataset.sig = ''; renderHw(); changed();
      } else if (del) {
        const b = box(del), items = get(b.dataset.path).items, row = del.closest('.hwrow');
        items.splice([...row.parentNode.children].indexOf(row), 1);
        b.dataset.sig = ''; renderHw(); changed();
      }
    });
  }

  /* Stil-Auswahl: Nur GOG hat mehrere Varianten, sie werden als Schieberegler mit sechs Punkten gezeigt (von hell nach dunkel). Bei den anderen
     Anbietern gibt es nichts zu wählen, die Zeile ist dann ausgeblendet. Die Auswahlliste (data-k=theme) bleibt als Datenhalter unsichtbar erhalten. */
  let styleFor = null;
  function fillStyleOptions() {
    const sel = $('[data-k=theme]');
    if (!sel) return;
    if (state.provider !== 'gog') state.theme = 'bar';
    else if (!Object.keys(C.PROVIDERS.gog.variants).includes(state.theme)) state.theme = 'dark';
    $('#gogSpineRow').hidden = state.provider !== 'gog';
    $('#gogTextRow').hidden = state.provider !== 'gog';
    if (styleFor === state.provider && sel.options.length) return;
    styleFor = state.provider;
    const opts = C.styleOptions(state.provider);
    sel.replaceChildren(...opts.map(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; return o; }));
    $('#styleRow').hidden = opts.length < 2;
    const slider = $('#styleSlider'), ticks = $('#styleTicks');
    slider.max = String(opts.length - 1);
    ticks.style.gridTemplateColumns = 'repeat(' + opts.length + ', minmax(0, 1fr))';
    ticks.replaceChildren(...opts.map(([v, l]) => {
      const b = document.createElement('button'), sw = document.createElement('i'), V = (C.PROVIDERS.gog.variants || {})[v];
      b.type = 'button'; b.dataset.theme = v; sw.className = 'sw';
      if (V) sw.style.background = 'linear-gradient(' + V.barA + ', ' + V.barB + '), repeating-conic-gradient(#cfd3dc 0 25%, #fff 0 50%) 0 0 / 8px 8px';
      b.append(sw, l); return b;
    }));
  }
  function updateStylePicker() {
    const sel = $('[data-k=theme]'), idx = Math.max(0, [...sel.options].findIndex((o) => o.value === sel.value));
    $('#styleSlider').value = String(idx);
    $$('#styleTicks button').forEach((b) => b.classList.toggle('on', b.dataset.theme === sel.value));
  }
  function bindStylePicker() {
    const pick = (v) => { const sel = $('[data-k=theme]'); if (sel.value === v) return; sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); };
    $('#styleSlider').addEventListener('input', (e) => { const o = $('[data-k=theme]').options[Number(e.target.value)]; if (o) pick(o.value); });
    $('#styleTicks').addEventListener('click', (e) => { const b = e.target.closest('button[data-theme]'); if (b) pick(b.dataset.theme); });
  }

  /* Auswahlen mit wenigen Möglichkeiten (data-seg) als Schaltflächen: alle Möglichkeiten auf einen Blick statt Aufklappliste */
  function renderSeg(sel) {
    const box = sel._seg, sig = [...sel.options].map((o) => o.value + '|' + o.textContent).join('/');
    if (box.dataset.sig !== sig) {
      box.dataset.sig = sig;
      box.replaceChildren(...[...sel.options].map((o) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = o.value; b.textContent = o.textContent; return b; }));
    }
    [...box.children].forEach((b) => b.classList.toggle('on', b.dataset.v === sel.value));
  }
  function buildSegs() {
    $$('select[data-seg]').forEach((sel) => {
      const box = document.createElement('div'); box.className = 'seg'; sel.classList.add('seg-src'); sel.tabIndex = -1; sel.after(box); sel._seg = box;
      box.addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b || sel.value === b.dataset.v) return; sel.value = b.dataset.v; sel.dispatchEvent(new Event('change', { bubbles: true })); });
    });
  }

  /* Sprungleiste: ein Knopf je Bereich, öffnet ihn und springt hin (bei Sprachwechsel neu aufgebaut, damit die Namen zur Sprache passen) */
  function buildJump() {
    const nav = $('#jump'); if (!nav) return;
    nav.replaceChildren(...$$('#form > details.sec').map((d) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = d.querySelector('summary').textContent.trim();
      b.addEventListener('click', () => { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      return b;
    }));
  }
  function syncControls() {
    fillStyleOptions();
    renderHw();
    $$('[data-k]').forEach(writeControl);
    updateStylePicker();
    $$('select[data-seg]').forEach(renderSeg);
    $$('[data-enable]').forEach((el) => el.classList.toggle('on', !!get(el.dataset.enable)));
  }
  function bindControls() {
    $('#form').addEventListener('input', onChange);
    $('#form').addEventListener('change', onChange);
    $('#form').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-k]'); if (b) onChange({ target: b });
      const tab = e.target.closest('button[data-reqtab]');
      if (tab) showReqTab(tab.dataset.reqtab);
      const p = e.target.closest('button[data-preset]');
      if (p) { Object.assign(state.custom, C.PRESETS[p.dataset.preset]); delete state.custom.name; state.caseType = 'custom'; syncControls(); changed(); }
    });
  }
  /* Reiter "Mindestanforderungen" / "Empfohlen" im Formular (nur Ansicht, nicht Teil der Einstellungen) */
  function showReqTab(which) {
    $$('[data-reqtab]').forEach((b) => b.classList.toggle('on', b.dataset.reqtab === which));
    $$('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== which; });
  }
  function onChange(e) {
    const el = e.target;
    if (!el.dataset || !el.dataset.k) return;
    readControl(el);
    syncControls();
    changed();
  }

  /* Änderungen höchstens einmal pro Bild zeichnen (flüssig auch bei schnellem Tippen) */
  let changes = 0;                     // zählt alle Änderungen (für "ungespeichert" in der Leiste)
  const hooks = { change: [], reset: [] };
  function changed() {
    changes++; hooks.change.forEach((f) => f());
    if (dirty) return;
    dirty = true;
    requestAnimationFrame(() => { dirty = false; render(); save(); });
  }

  /* ---------- Bilder: auf Druckgröße verkleinern, als Datei-Adresse statt als Base64-Text halten ---------- */
  const MAX_EDGE = { front: 2300, backTop: 2300, backBottom: 2300, publisher: 900, spineLogo: 1200, spineBg: 2000 };

  async function loadImage(key, file) {
    let result;
    if (file.type === 'image/svg+xml') {
      result = { url: URL.createObjectURL(file), w: 0, h: 0, svg: true, blob: file, type: 'image/svg+xml' };
    } else {
      const bmp = await createImageBitmap(file);
      const size = C.fitSize(bmp.width, bmp.height, MAX_EDGE[key]);
      const cv = document.createElement('canvas');
      cv.width = size.w; cv.height = size.h;
      const ctx = cv.getContext('2d');
      const png = key === 'publisher' || key === 'spineLogo';              // Logos behalten ihre Transparenz
      if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size.w, size.h); }
      ctx.drawImage(bmp, 0, 0, size.w, size.h);
      const blob = await new Promise((res) => cv.toBlob(res, png ? 'image/png' : 'image/jpeg', 0.92));
      result = { url: URL.createObjectURL(blob), w: size.w, h: size.h, srcW: bmp.width, srcH: bmp.height, blob, type: png ? 'image/png' : 'image/jpeg' };
      bmp.close();
    }
    result.name = file.name;
    clearImage(key);
    images[key] = result;
    renderDrops();
    changed();
  }
  /* Einfarbigen Hintergrund (z. B. Weiß bei Logos von Brandfetch) transparent machen: Vom Rand aus werden alle verbundenen Pixel
     entfernt, die der Eckfarbe ähneln. Die Kante wird weich übergeblendet. Liefert false, wenn die Ecken nicht einfarbig sind,
     das Bild schon transparent ist oder fast nichts zu entfernen war. */
  async function removeBackground(key) {
    const img = images[key];
    if (!img || img.svg || !img.blob) return false;
    const bmp = await createImageBitmap(img.blob), w = bmp.width, h = bmp.height;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(bmp, 0, 0); bmp.close();
    const id = ctx.getImageData(0, 0, w, h), d = id.data, at = (x, y) => (y * w + x) * 4;
    const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => d.slice(at(x, y), at(x, y) + 4));
    if (corners.some((c) => c[3] < 250)) return false;
    const [r0, g0, b0] = corners[0];
    if (corners.some((c) => Math.abs(c[0] - r0) + Math.abs(c[1] - g0) + Math.abs(c[2] - b0) > 60)) return false;
    const TOL = 48, dist = (i) => Math.max(Math.abs(d[i] - r0), Math.abs(d[i + 1] - g0), Math.abs(d[i + 2] - b0));
    const seen = new Uint8Array(w * h), stack = [];
    const push = (x, y) => { const k = y * w + x; if (seen[k] || dist(k * 4) > TOL) return; seen[k] = 1; stack.push(k); };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) {
      const k = stack.pop(), x = k % w, y = (k - x) / w;
      if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
    }
    let removed = 0;
    for (let k = 0; k < w * h; k++) if (seen[k]) { d[k * 4 + 3] = 0; removed++; }
    if (removed < w * h * 0.02) return false;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {                      // weiche Kante an den Rändern der entfernten Fläche
      const k = y * w + x; if (seen[k]) continue;
      if ((x > 0 && seen[k - 1]) || (x < w - 1 && seen[k + 1]) || (y > 0 && seen[k - w]) || (y < h - 1 && seen[k + w])) {
        const dd = dist(k * 4); if (dd < TOL * 2) d[k * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, (dd - TOL) / TOL)));
      }
    }
    ctx.putImageData(id, 0, 0);
    const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
    URL.revokeObjectURL(img.url);
    images[key] = { ...img, url: URL.createObjectURL(blob), blob, type: 'image/png', w, h, name: img.name.replace(/\.\w+$/, '') + '.png' };
    renderDrops(); changed();
    return true;
  }
  /* Bild aus einer Projektdatei wiederherstellen (ohne es erneut zu verkleinern oder neu zu kodieren) */
  async function restoreImage(key, data, type, name) {
    const blob = new Blob([data], { type });
    let w = 0, h = 0;
    if (type !== 'image/svg+xml') { const bmp = await createImageBitmap(blob); w = bmp.width; h = bmp.height; bmp.close(); }
    clearImage(key);
    images[key] = { url: URL.createObjectURL(blob), w, h, name, blob, type, svg: type === 'image/svg+xml' };
  }
  function clearImage(key) {
    if (images[key]) { URL.revokeObjectURL(images[key].url); delete images[key]; }
  }
  /* Wie scharf wird das Bild gedruckt? Das Bild füllt die Fläche (zuschneiden), also entscheidet die knappere Seite. */
  function dpiOf(key, img) {
    const spec = C.imageSpecs(C.caseDims(state), C.frontTop(state))[key];
    if (!spec || !img.w) return 0;
    const mmPerPx = Math.max(spec.w / img.w, spec.h / img.h);
    return Math.round(25.4 / mmPerPx);
  }
  function renderDrops() {
    const specs = C.imageSpecs(C.caseDims(state), C.frontTop(state));
    $$('.drop').forEach((drop) => {
      const key = drop.dataset.img, img = images[key], spec = specs[key];
      drop.classList.toggle('has', !!img);
      if (spec) $('.spec', drop).textContent = 'Maße: ' + spec.w + ' × ' + spec.h + ' mm';
      const thumb = $('.thumb', drop);
      thumb.style.backgroundImage = img ? 'url("' + img.url + '")' : 'none';
      thumb.textContent = img ? '' : '+';
      const info = $('.info', drop);
      if (!img) { info.className = 'info'; if (key !== 'backBottom') info.textContent = ''; return; }
      const dpi = dpiOf(key, img);
      info.className = 'info ' + (dpi && dpi < 200 ? 'warn' : 'ok');
      info.textContent = img.name + (dpi ? ' · ' + img.w + ' × ' + img.h + ' px ≈ ' + dpi + ' dpi' + (dpi < 200 ? ' (wird unscharf)' : '') : '');
    });
  }
  function bindDrops() {
    $$('.drop').forEach((drop) => {
      const key = drop.dataset.img, input = $('input[type=file]', drop);
      const take = async (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        try { await loadImage(key, file); } catch (e) { alert('Das Bild konnte nicht gelesen werden: ' + (e.message || e)); }
      };
      input.addEventListener('change', () => { take(input.files[0]); input.value = ''; });
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); take(e.dataTransfer.files[0]); });
      $('.x', drop).addEventListener('click', () => { clearImage(key); renderDrops(); changed(); });
      const bgx = $('.bgx', drop);
      if (bgx) bgx.addEventListener('click', async () => { if (!images[key]) return; if (!(await removeBackground(key))) alert('Es wurde kein einfarbiger Hintergrund erkannt (oder das Bild ist schon transparent).'); });
    });
  }

  /* ---------- Cover zeichnen ---------- */
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const setBg = (node, img) => { node.style.backgroundImage = img ? 'url("' + img.url + '")' : 'none'; node.classList.toggle('has-img', !!img); };
  function setImg(node, src) { if (src) { node.src = src; node.hidden = false; } else { node.removeAttribute('src'); node.hidden = true; } }

  function render() {
    const c = C.caseDims(state), L = C.LABELS[state.lang];
    const cover = $('#cover'), wrap = $('#wrap');
    for (const n of [cover, wrap]) {
      n.style.setProperty('--w', c.w + 'mm'); n.style.setProperty('--h', c.h + 'mm');
      n.style.setProperty('--back', c.back + 'mm'); n.style.setProperty('--spine', c.spine + 'mm'); n.style.setProperty('--front', c.front + 'mm');
    }
    cover.classList.toggle('slim', c.spine < 10);
    $('#customBox').hidden = state.caseType !== 'custom';
    applyProvider(cover);
    wrap.classList.toggle('marks', state.cropMarks);
    wrap.classList.toggle('show-fold', state.foldLines);

    /* Bilder */
    setBg($('#front'), images.front);
    setBg($('#backTop'), images.backTop);
    setBg($('#backBottom'), images.backBottom || images.backTop);     // ohne eigenes Bild setzt sich das obere fort
    $('#backBottom').style.backgroundPosition = images.backBottom ? 'center' : 'center bottom';
    const pubUrl = images.publisher && images.publisher.url;
    setImg($('#frontPub'), pubUrl);
    $('#frontPub').className = 'front-pub plate-' + state.frontPubPlate;
    setImg($('#backPub'), pubUrl);

    /* Alterskennzeichen (USK) */
    const usk = state.usk === 'none' ? '' : 'assets/images/usk/usk_' + state.usk + '.svg';
    /* Die Raute (usk_N.svg) ist immer voll sichtbar. Der Regler stellt nur den Hintergrund dahinter ein (usk_N_bg.svg, Kachel mit Rand): 0 % = nur die Raute.
       Auf der Rückseite steht immer nur die Raute. */
    setImg($('#frontUsk'), usk);
    setImg($('#frontUskBg'), usk && Number(state.uskOpacity) > 0 ? usk.replace(/\.svg$/, '_bg.svg') : '');
    $('#frontUskBg').style.opacity = String(Number(state.uskOpacity) / 100);
    setImg($('#backUsk'), state.uskBack ? usk : '');
    $('#frontCropBox').hidden = state.frontFit !== 'crop';
    setImg($('#discLogo'), 'assets/images/disc/' + C.DISCS[state.disc]);

    /* Rücken */
    $('#spine').classList.toggle('fill', state.spineLogo === 'fill');
    $('#spine').classList.toggle('nopc', !state.spinePC);
    $('#spine').classList.toggle('tcenter', state.spineTitle === 'center');
    $('#spineTitle').textContent = state.title.trim();
    renderSpine(c);

    /* Rückseite: Spielfunktionen, Angaben, Copyright */
    $('#featTitle').textContent = L.features;
    $('#featNote').textContent = C.PROVIDERS[state.provider].note[state.lang];
    const feats = $('#feats');
    feats.replaceChildren(...C.FEATURE_ORDER.filter((k) => state.features.includes(k)).map((k) => {
      const item = el('div', 'feat'), img = el('img'); img.src = 'assets/images/features/line/' + k + '.svg'; img.alt = '';
      item.append(img, el('span', '', L.feat[k])); return item;
    }));
    $('#reqTitle').textContent = L.reqTitle;
    $('#copy').textContent = state.copyright.trim();
    renderSpecs();

    renderDrops();
    renderNotes();
    fitPreview();
  }

  /* Farben und Schriftzug des Anbieters. Nur GOG hat ein Logo, bei den anderen steht ein Schriftzug. */
  function applyProvider(cover) {
    const P = C.PROVIDERS[state.provider];
    const vars = { brand: P.brand, 'on-brand': P.onBrand, dark: P.dark, mid: P.mid, accent: P.accent, bannerA: P.bannerA, bannerB: P.bannerB, barA: P.barA, barB: P.barB, line: P.line, spineBg: P.brand };
    const V = P.variants && P.variants[state.theme];
    /* Rücken: "passend zur Leiste" (Standard) hell bei hellen und dunkel bei dunklen Leisten, oder fest dunkel bzw. hell */
    const lightSpine = !!(V && (state.gogSpine === 'light' || (state.gogSpine === 'match' && !V.dk)));
    if (V) Object.assign(vars, { barA: V.barA, barB: V.barB, line: V.line, spineBg: lightSpine ? V.spineLight : V.spine, bannerA: V.bannerA, bannerB: V.bannerB, barFg: V.fg, barGrad: V.grad || 'linear-gradient(' + V.barA + ', ' + V.barB + ')', 'bar-h': C.barHeight(state) + 'mm', 'bar-line': V.barLine });
    else Object.assign(vars, { barFg: P.onBrand, barGrad: 'linear-gradient(' + P.barA + ', ' + P.barB + ')', 'bar-h': C.BAR_HEIGHT + 'mm', 'bar-line': '1.6mm' });
    for (const [k, v] of Object.entries(vars)) cover.style.setProperty('--' + k, v);
    cover.classList.toggle('has-wm', state.provider !== 'gog');
    cover.classList.toggle('gog', state.provider === 'gog');
    cover.classList.toggle('gog-text', state.provider === 'gog' && !!state.gogText);
    cover.classList.toggle('gog-tint', !!(V && V.tint));
    cover.classList.toggle('gog-dk', !!(V && V.dk));
    cover.classList.toggle('bar-over', !!(V && V.over));
    cover.classList.toggle('spine-light', lightSpine);
    /* Farbe von "PC" am Fuß des Rückens: automatisch passend zum Rücken (weiß auf dunkel, schwarz auf hell) oder fest */
    cover.style.setProperty('--pc', state.pcColor === 'white' ? '#ffffff' : state.pcColor === 'black' ? '#111111' : lightSpine ? '#1c1c22' : '#ffffff');
    $$('.brand-logo').forEach((img) => { img.src = 'assets/images/' + ((V && V.logo) || P.logo); img.alt = P.name; });
    $('#barWm').textContent = P.wordmark.replace('\n', ' ');
    $('#spineWm').textContent = P.wordmark.split('\n')[0];
    $('#frontTag').textContent = P.tag[state.lang];
  }

  /* Systemanforderungen: Ohne empfohlene Angaben steht links die Bezeichnung und rechts der Wert. Mit empfohlenen Angaben ist es eine
     Tabelle mit den Spalten Minimum und Empfohlen. Gleiche Angaben (und das Betriebssystem) stehen nur einmal über beide Spalten.
     Mehrere Werte (z. B. mehrere Grafikkarten oder Sätze) stehen immer untereinander. */
  function renderSpecs() {
    const list = $('#specs'), table = C.buildSpecTable(state);
    list.classList.toggle('dual', table.dual);
    const stack = (values) => { const v = el('span', 'v stack'); values.forEach((text) => v.append(el('span', 'alt', text))); return v; };
    const cell = (cls, values) => { const c = el('span', 'cell ' + cls); if (values.length) c.append(stack(values)); else c.textContent = '–'; return c; };
    const rows = table.rows.map((row) => {
      const li = el('li', (row.key === 'other' ? 'other' : '') + (row.cont ? ' cont' : ''));
      if (!table.dual) { li.append(el('span', 'k', row.label), el('span', 'vals', '')); li.lastChild.append(stack(row.min)); return li; }
      li.append(el('span', 'k', row.short));
      if (row.shared) li.append(cell('span2', row.min));
      else li.append(cell('min', row.min), cell('rec', row.rec));
      return li;
    });
    if (table.dual) {
      const head = el('li', 'head');
      head.append(el('span', 'k'), el('span', 'cell', ''), el('span', 'cell', ''));
      head.children[1].append(el('span', 'chip min', table.labels.min)); head.children[2].append(el('span', 'chip rec', table.labels.rec));
      rows.unshift(head);
    }
    list.replaceChildren(...rows);
    $('.panel-back').classList.toggle('dual', table.dual);
    fitSpecs();
    centerHeads(list);
  }

  /* "Minimum" und "Empfohlen" stehen mittig über dem tatsächlich beschriebenen Bereich der Spalte (breiteste Zeile), nicht über der ganzen Spaltenbreite */
  function centerHeads(list) {
    if (!list.classList.contains('dual')) return;
    const k = Number(getComputedStyle($('#preview')).getPropertyValue('--k')) || 1;
    for (const col of ['min', 'rec']) {
      const chip = $('.chip.' + col, list);
      if (!chip) continue;
      chip.style.marginLeft = '0px';
      let maxW = 0;
      $$('.cell.' + col + ' .alt', list).forEach((alt) => {
        const r = document.createRange(), left = alt.parentNode.parentNode.getBoundingClientRect().left;
        r.selectNodeContents(alt);
        for (const q of r.getClientRects()) maxW = Math.max(maxW, q.right - left);
      });
      const chipW = chip.getBoundingClientRect().width;
      chip.style.marginLeft = Math.max(0, (maxW - chipW) / 2 / k) + 'px';
    }
  }

  /* Die Angaben müssen vollständig in das Feld passen: Ist die Liste höher als der Platz, wird die Schrift kleiner (bis 4,4 pt).
     Es wird nichts abgeschnitten. */
  function fitSpecs() {
    const col = $('.speccol'), list = $('#specs'), title = $('#reqTitle');
    list.style.fontSize = '';
    const titleH = getComputedStyle(title).display === 'none' ? 0 : title.offsetHeight + parseFloat(getComputedStyle(title).marginBottom || 0);
    let pt = parseFloat(getComputedStyle(list).fontSize) * 72 / 96;
    while (pt > 4.4 && list.offsetHeight + titleH > col.clientHeight - 1) { pt -= 0.2; list.style.fontSize = pt.toFixed(1) + 'pt'; }
  }

  /* Frontbild einpassen: Standard ist "Strecken" (das ganze Bild füllt die Fläche, bei anderem Seitenverhältnis leicht gestaucht). "Zuschneiden" füllt
     die Fläche ohne Verzerrung, mit Zoom (100 bis 300 %) und Ausschnitt (X, Y in %). Die Fläche beginnt unter der Leiste (bei GOG durchscheinend ganz oben). */
  function fitFront(front, c) {
    const f = images.front;
    if (!f || !(f.w > 0 && f.h > 0)) { front.style.backgroundSize = ''; front.style.backgroundPosition = ''; return; }
    if (state.frontFit !== 'crop') { front.style.backgroundSize = '100% 100%'; front.style.backgroundPosition = '0 0'; return; }
    const W = c.front, H = c.h - C.frontTop(state), z = num(state.frontZoom, 100, 100, 300) / 100, x = num(state.frontX, 50, 0, 100) / 100, y = num(state.frontY, 50, 0, 100) / 100;
    const k = Math.max(W / f.w, H / f.h) * z, sw = f.w * k, sh = f.h * k, mm = (n) => n.toFixed(3) + 'mm';
    front.style.backgroundSize = mm(sw) + ' ' + mm(sh);
    front.style.backgroundPosition = mm(-(sw - W) * x) + ' ' + mm(-(sh - H) * y);
  }

  /* Rücken: Bild der Vorderseite fortsetzen, Logo statt Titel, Publisher-Logo am Fuß */
  function renderSpine(c) {
    const spine = $('#spine'), front = $('#front'), barH = C.frontTop(state), f = images.front;
    const art = state.spineArt === 'image' && f && f.w > 0 && f.h > 0;
    spine.classList.toggle('art', !!art);
    if (art) {
      /* Das Bild wird wie bei "cover" auf Rücken und Vorderseite zusammen skaliert und mittig zugeschnitten (oben bündig unter der Leiste),
         jede Fläche zeigt ihren Ausschnitt. Der Rücken ragt 0,6 mm in die Nachbarn (--ov), das ist in der Position berücksichtigt. */
      const W = c.spine + c.front, H = c.h - barH, k = Math.max(W / f.w, H / f.h), sw = f.w * k, sh = f.h * k;
      const offX = (sw - W) / 2, offY = 0, ov = 0.6, mm = (n) => n.toFixed(3) + 'mm';
      front.style.backgroundSize = mm(sw) + ' ' + mm(sh);
      front.style.backgroundPosition = mm(-(offX + c.spine)) + ' ' + mm(-offY);
      spine.style.backgroundImage = 'linear-gradient(rgba(0,0,0,.3), rgba(0,0,0,.3)), url("' + f.url + '")';
      spine.style.backgroundSize = '100% 100%, ' + mm(sw) + ' ' + mm(sh);
      spine.style.backgroundPosition = '0 0, ' + mm(ov - offX) + ' ' + mm(barH - offY);
    } else if (state.spineArt === 'own' && images.spineBg) {
      /* Eigenes Rückenbild: füllt den Rücken (zugeschnitten), der Ausschnitt ist links/rechts wählbar, optional abgedunkelt */
      const dim = num(state.spineBgDim, 25, 0, 80) / 100, x = num(state.spineBgX, 50, 0, 100);
      spine.classList.add('art');
      fitFront(front, c);
      spine.style.backgroundImage = 'linear-gradient(rgba(0,0,0,' + dim + '), rgba(0,0,0,' + dim + ')), url("' + images.spineBg.url + '")';
      spine.style.backgroundSize = '100% 100%, cover';
      spine.style.backgroundPosition = '0 0, ' + x + '% 50%';
    } else {
      fitFront(front, c);
      spine.style.backgroundImage = ''; spine.style.backgroundSize = ''; spine.style.backgroundPosition = '';
    }
    const sl = images.spineLogo, useLogo = !!(state.spineUseLogo && sl), pub = images.publisher, showPub = !!(state.spinePub && pub);
    setImg($('#spineLogoImg'), useLogo ? sl.url : '');
    spine.classList.toggle('usingLogo', useLogo);
    setImg($('#spinePubImg'), showPub ? pub.url : '');
    spine.classList.toggle('nopub', !showPub);
    $('#spinePubBox').hidden = !showPub;
    $('#spinePubBox').className = 'spine-pubbox plate-' + state.spinePubPlate;
    refitSpine();
  }
  function refitSpine() { fitSpinePub(); fitSpineTitle(C.caseDims(state)); fitSpineLogo(); }
  const num = (v, d, lo, hi) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const aspectOf = (img, el) => (el.naturalWidth && el.naturalHeight ? el.naturalWidth / el.naturalHeight : (img && img.w && img.h ? img.w / img.h : 1.6));

  /* Publisher-Logo am Fuß: Der Platz richtet sich nach dem Rücken, nicht nach dem Logo. Zu breite Logos werden automatisch gedreht
     (oder per Auswahl), die Breite lässt sich von Hand festlegen. Das Logo sitzt auf einer weißen Kachel über "PC". */
  function fitSpinePub() {
    const box = $('#spinePubBox'), el = $('#spinePubImg'), pub = images.publisher;
    box.hidden = !(state.spinePub && pub);
    if (box.hidden) return;
    const c = C.caseDims(state), pad = 0.6;
    const side = num(state.spinePubSide, 1.2, -10, Math.max(0, c.spine / 2 - 2)), manual = num(state.spinePubWidth, 0, 0, 60);
    const across = Math.max(2, c.spine - 2 * side) - 2 * pad;
    const fit = C.fitLogo(aspectOf(pub, el), state.spinePubRot, across, 30, manual > 0 ? manual - 2 * pad : 0, 4);
    const w = fit.w, h = fit.h, mm = (n) => n.toFixed(2) + 'mm';
    box.style.width = mm((fit.rotated ? h : w) + 2 * pad); box.style.height = mm((fit.rotated ? w : h) + 2 * pad);
    el.style.width = mm(w); el.style.height = mm(h);
    el.style.transform = 'translate(-50%, -50%)' + (fit.rotated ? ' rotate(90deg)' : '');
  }
  /* Rückenlogo (statt des Titels): Abstände zu den Seiten, zum Kopf und zum Fuß sind einstellbar. Breite Logos stehen gedreht (Leserichtung wie beim Titel). */
  function fitSpineLogo() {
    const box = $('#spineBox'), li = $('#spineLogoImg'), sl = images.spineLogo;
    if (li.hidden || !sl) return;
    const c = C.caseDims(state), probe = $('#mmProbe'), k = probe.offsetWidth / 10 || 3.78;          // Pixel je mm (unabhängig von der Vorschaugröße)
    const side = num(state.spineLogoSide, 1.5, -10, Math.max(0, c.spine / 2 - 2)), top = num(state.spineLogoTop, 3, -30, 60), bottom = num(state.spineLogoBottom, 3, -30, 60);
    box.classList.toggle('free', top < 0 || bottom < 0);
    const along = Math.max(5, box.clientHeight / k - top - bottom), across = Math.max(2, c.spine - 2 * side);
    const a = aspectOf(sl, li), fit = C.fitLogo(a, state.spineLogoRot === 'auto' ? (a > 1.4 ? 'yes' : 'no') : state.spineLogoRot, across, along, 0, 0);
    li.style.width = (fit.w * k) + 'px'; li.style.height = (fit.h * k) + 'px';
    const len = fit.rotated ? fit.w : fit.h;                       // Länge des Logos entlang des Rückens
    li.style.top = ((top + (state.spineTitle === 'top' ? len / 2 : along / 2)) * k) + 'px'; li.style.left = '50%';       // wie der Titel: oben bündig oder mittig zwischen den Abständen
    li.style.transform = 'translate(-50%, -50%)' + (fit.rotated ? ' rotate(90deg)' : '');
  }

  /* Titel auf dem Rücken so groß wie möglich, ohne über die Hülle hinauszuragen */
  function fitSpineTitle(c) {
    const title = $('#spineTitle'), box = $('#spineBox');
    const maxPt = c.spine >= 12 ? 12 : c.spine >= 9 ? 10 : 8;
    let pt = maxPt;
    title.style.fontSize = pt + 'pt';
    while (pt > 5 && title.scrollHeight > box.clientHeight - 2) { pt -= 0.25; title.style.fontSize = pt + 'pt'; }
  }

  /* Hinweise zur Vorlage (blockieren nichts) */
  function renderNotes() {
    const notes = [];
    if (!images.front) notes.push('Es fehlt noch das Frontcover.');
    if (!state.title.trim()) notes.push('Der Spieletitel für den Rücken fehlt.');
    const dims = C.caseDims(state);
    if (dims.adjusted) notes.push('Die eigenen Maße wurden angepasst (erlaubt: Rückseite und Vorderseite 100–150 mm, Rücken 3–30 mm, Höhe 100–198 mm, insgesamt höchstens ' + C.MAX_W + ' mm breit). Verwendet wird: ' + dims.back + ' + ' + dims.spine + ' + ' + dims.front + ' × ' + dims.h + ' mm.');
    if (!state.features.length) notes.push('Es ist keine Spielfunktion gewählt, der grüne Streifen bleibt leer.');
    $('#notes').replaceChildren(...notes.map((t) => el('p', '', t)));
  }

  /* ---------- Vorschau auf Fensterbreite einpassen (gedruckt wird immer in Originalgröße) ---------- */
  function fitPreview() {
    const pane = $('#preview'), probe = el('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;width:297mm;height:0';
    document.body.append(probe);
    const sheetPx = probe.getBoundingClientRect().width;
    probe.remove();
    const k = Math.min(1.6, Math.max(0.2, (pane.clientWidth - 2) / sheetPx));
    pane.style.setProperty('--k', k.toFixed(4));
  }

  /* ---------- Start ---------- */
  function init() {
    const ver = $('#ver'); if (ver && /__/.test(ver.textContent)) ver.textContent = 'lokal';
    buildSegs();
    bindStylePicker();
    bindControls();
    bindHw();
    ['spineLogoImg', 'spinePubImg'].forEach((id) => $('#' + id).addEventListener('load', refitSpine));
    bindDrops();
    syncControls();
    buildJump();
    $('#bPrint').addEventListener('click', () => window.print());
    $('#bReset').addEventListener('click', () => {
      if (!confirm('Alle Einstellungen und Bilder zurücksetzen?')) return;
      Object.keys(images).forEach(clearImage);
      state = C.defaultState();
      hooks.reset.forEach((f) => f());
      syncControls();
      render(); save();
    });
    window.addEventListener('resize', fitPreview);
    const start = () => { render(); };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
    render();
  }
  init();

  /* ---------- Schnittstelle für die Dialoge in extras.js ---------- */
  function merge(target, patch) {
    for (const [k, v] of Object.entries(patch)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object') merge(target[k], v);
      else target[k] = v;
    }
  }
  window.CoverApp = {
    get state() { return state; },
    get changes() { return changes; },
    get hasImages() { return Object.keys(images).length > 0; },
    onChange(f) { hooks.change.push(f); },
    removeBackground(key) { return removeBackground(key); },
    onReset(f) { hooks.reset.push(f); },
    buildJump,
    dpiOf(key, w, h) { return dpiOf(key, { w, h }); },
    /* Werte aus Rezept oder Steam übernehmen (Listen werden ersetzt, Objekte zusammengeführt) */
    patch(patch) { merge(state, patch); state = C.mergeState(state); syncControls(); changed(); },
    /* Aktuelle Einstellungen und Bilder (für den Projektexport) */
    snapshot() { return { state: JSON.parse(JSON.stringify(state)), images: Object.fromEntries(Object.entries(images).map(([k, v]) => [k, { blob: v.blob, type: v.type, name: v.name }])) }; },
    /* Projekt einsetzen: Einstellungen und Bilder ersetzen das aktuelle Projekt */
    async restore(newState, imgs) {
      Object.keys(images).forEach(clearImage);
      for (const [k, v] of Object.entries(imgs || {})) await restoreImage(k, v.data, v.type, v.name);
      state = C.mergeState(newState);
      syncControls(); renderDrops(); changed();
    },
    /* Bild laden (Datei oder Blob), wie beim Ziehen in das Bildfeld */
    async setImage(key, file) { await loadImage(key, file); },
  };
})();
