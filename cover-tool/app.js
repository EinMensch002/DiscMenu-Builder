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
  function syncControls() {
    $$('[data-k]').forEach(writeControl);
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
  function changed() {
    if (dirty) return;
    dirty = true;
    requestAnimationFrame(() => { dirty = false; render(); save(); });
  }

  /* ---------- Bilder: auf Druckgröße verkleinern, als Datei-Adresse statt als Base64-Text halten ---------- */
  const MAX_EDGE = { front: 2300, backTop: 2300, backBottom: 2300, publisher: 900 };

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
      const png = key === 'publisher';              // Logos behalten ihre Transparenz
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
    const spec = C.imageSpecs(state.caseType)[key];
    if (!spec || !img.w) return 0;
    const mmPerPx = Math.max(spec.w / img.w, spec.h / img.h);
    return Math.round(25.4 / mmPerPx);
  }
  function renderDrops() {
    const specs = C.imageSpecs(C.caseDims(state));
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
    cover.classList.toggle('theme-modern', state.theme === 'modern');
    cover.classList.toggle('slim', c.spine < 10);
    $('#customBox').hidden = state.caseType !== 'custom';
    applyProvider(cover);
    wrap.classList.toggle('marks', state.cropMarks);
    wrap.classList.toggle('fold', state.foldLines);

    /* Bilder */
    setBg($('#front'), images.front);
    setBg($('#backTop'), images.backTop);
    setBg($('#backBottom'), images.backBottom || images.backTop);     // ohne eigenes Bild setzt sich das obere fort
    $('#backBottom').style.backgroundPosition = images.backBottom ? 'center' : 'center bottom';
    const pubUrl = images.publisher && images.publisher.url;
    setImg($('#frontPub'), pubUrl);
    setImg($('#backPub'), pubUrl);

    /* Alterskennzeichen (USK) */
    const usk = state.usk === 'none' ? '' : 'assets/images/usk/usk_' + state.usk + '.png';
    setImg($('#frontUsk'), usk);
    setImg($('#backUsk'), state.uskBack ? usk : '');
    setImg($('#discLogo'), 'assets/images/disc/' + C.DISCS[state.disc]);

    /* Rücken */
    $('#spine').classList.toggle('fill', state.spineLogo === 'fill');
    $('#spine').classList.toggle('nopc', !state.spinePC);
    $('#spine').classList.toggle('tcenter', state.spineTitle === 'center');
    $('#spineTitle').textContent = state.title.trim();
    fitSpineTitle(c);

    /* Rückseite: Spielfunktionen, Angaben, GOG-Galaxy-Feld, Copyright */
    $('#featTitle').textContent = L.features;
    $('#featNote').textContent = C.PROVIDERS[state.provider].note[state.lang];
    const feats = $('#feats');
    feats.replaceChildren(...C.FEATURE_ORDER.filter((k) => state.features.includes(k)).map((k) => {
      const item = el('div', 'feat'), img = el('img'); img.src = (state.iconStyle === 'line' || !C.ORIGINAL_ICONS.includes(k)) ? 'assets/images/features/line/' + k + '.svg' : 'assets/images/features/' + k + '.png'; img.alt = '';
      item.append(img, el('span', '', L.feat[k])); return item;
    }));
    $('#galaxy').classList.toggle('off', !(state.galaxy && state.provider === 'gog'));      // das Feld gibt es nur bei GOG
    $('#galaxyChk').disabled = state.provider !== 'gog';
    $('#reqTitle').textContent = L.reqTitle;
    $('#gxTitle').textContent = L.galaxy.title; $('#gxText').textContent = L.galaxy.text;
    $('#gxJoin').textContent = L.galaxy.join; $('#gxUrl').textContent = L.galaxy.url;
    $('#copy').textContent = state.copyright.trim();
    renderSpecs();
    renderBarcode();

    renderDrops();
    renderNotes();
    fitPreview();
  }

  /* Farben und Schriftzug des Anbieters. Nur GOG hat ein Logo, bei den anderen steht ein Schriftzug. */
  function applyProvider(cover) {
    const P = C.PROVIDERS[state.provider];
    const vars = { brand: P.brand, 'on-brand': P.onBrand, dark: P.dark, mid: P.mid, accent: P.accent, bannerA: P.bannerA, bannerB: P.bannerB };
    for (const [k, v] of Object.entries(vars)) cover.style.setProperty('--' + k, v);
    cover.classList.toggle('has-wm', state.provider !== 'gog');
    $$('.brand-logo').forEach((img) => { img.src = 'assets/images/' + P.logo; img.alt = P.name; });
    $('#cornerWm').textContent = P.wordmark;
    $('#barWm').textContent = P.wordmark.replace('\n', ' ');
    $('#spineWm').textContent = P.wordmark.split('\n')[0];
    $('#frontTag').textContent = P.tag[state.lang];
  }

  /* Systemanforderungen: Ohne empfohlene Angaben steht links die Bezeichnung und rechts der Wert. Mit empfohlenen Angaben ist es eine
     Tabelle mit den Spalten Minimum und Empfohlen. Gleiche Angaben (und das Betriebssystem) stehen nur einmal über beide Spalten. */
  function renderSpecs() {
    const list = $('#specs'), table = C.buildSpecTable(state);
    list.classList.toggle('dual', table.dual);
    const alts = (values) => {
      const v = el('span', 'v' + (state.breakHw && values.length > 1 ? ' stack' : ''));
      values.forEach((text, i) => {
        if (i) v.append(el('span', 'sep', ' / '));
        v.append(el('span', 'alt', text));
      });
      return v;
    };
    const cell = (cls, values) => { const c = el('span', 'cell ' + cls); if (values.length) c.append(alts(values)); else c.textContent = '–'; return c; };
    const rows = table.rows.map((row) => {
      const li = el('li', row.key === 'other' ? 'other' : '');
      if (!table.dual) { li.append(el('span', 'k', row.label), el('span', 'vals', '')); li.lastChild.append(alts(row.min)); return li; }
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
    const panel = $('.panel-back');
    panel.classList.toggle('dual', table.dual);
    panel.classList.toggle('nogx', $('#galaxy').classList.contains('off'));
    fitSpecs();
    /* Beim Umbruch zwischen zwei Alternativen ist der Schrägstrich überflüssig */
    $$('.sep', list).forEach((sep) => {
      const a = sep.previousElementSibling, b = sep.nextElementSibling;
      if (state.breakHw || (a && b && a.offsetTop !== b.offsetTop)) sep.style.display = 'none';
    });
  }

  /* Die Angaben müssen vollständig in das Feld passen: Ist die Liste höher als der Platz, wird die Schrift kleiner (bis 4,4 pt).
     Es wird nichts abgeschnitten. */
  function fitSpecs() {
    const col = $('.speccol'), list = $('#specs'), title = $('#reqTitle');
    list.style.fontSize = '';
    const titleH = getComputedStyle(title).display === 'none' ? 0 : title.offsetHeight + parseFloat(getComputedStyle(title).marginBottom || 0);
    let pt = parseFloat(getComputedStyle(list).fontSize) * 72 / 96;
    while (pt > 4.4 && list.offsetHeight + titleH > col.clientHeight) { pt -= 0.2; list.style.fontSize = pt.toFixed(1) + 'pt'; }
  }

  /* Titel auf dem Rücken so groß wie möglich, ohne über die Hülle hinauszuragen */
  function fitSpineTitle(c) {
    const title = $('#spineTitle'), box = $('#spineBox');
    const maxPt = c.spine >= 12 ? 12 : c.spine >= 9 ? 10 : 8;
    let pt = maxPt;
    title.style.fontSize = pt + 'pt';
    while (pt > 5 && title.scrollHeight > box.clientHeight - 2) { pt -= 0.25; title.style.fontSize = pt + 'pt'; }
  }

  /* Barcode (Code 128) unter dem USK-Zeichen. Die Strichbreite richtet sich nach dem Platz (höchstens 40 mm),
     ist sie zu schmal zum Scannen, steht ein Hinweis bei den Notizen. */
  /* Platz für den Barcode: die rechte Spalte ist 41 mm breit, mit der Tabelle Minimum/Empfohlen nur 33 mm */
  const maxBarcodeMm = () => ($('.panel-back').classList.contains('dual') ? 31 : 40);
  function barcodeInfo() {
    if (!state.barcode.on) return null;
    const bits = C.code128(state.barcode.text.trim());
    if (!bits) return { bits: null };
    const modules = bits.length + 20;                       // je 10 Module Ruhezone links und rechts
    return { bits, modules, module: Math.min(0.4, maxBarcodeMm() / modules) };
  }
  function renderBarcode() {
    const info = barcodeInfo(), box = $('#barcode');
    box.hidden = !(info && info.bits);
    if (box.hidden) return;
    const svg = $('#barcodeSvg');
    let d = '', run = 0;
    [...info.bits, '0'].forEach((b, i) => { if (b === '1') run++; else { if (run) d += 'M' + (i - run + 10) + ' 0h' + run + 'v1h-' + run + 'z'; run = 0; } });
    svg.setAttribute('viewBox', '0 0 ' + info.modules + ' 1');
    svg.style.width = (info.modules * info.module).toFixed(2) + 'mm';
    svg.replaceChildren();
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); p.setAttribute('fill', '#000');
    svg.append(p);
    $('#barcodeText').textContent = state.barcode.text.trim();
  }

  /* Hinweise zur Vorlage (blockieren nichts) */
  function renderNotes() {
    const notes = [];
    if (!images.front) notes.push('Es fehlt noch das Frontcover.');
    if (!state.title.trim()) notes.push('Der Spieletitel für den Rücken fehlt.');
    const dims = C.caseDims(state);
    if (dims.adjusted) notes.push('Die eigenen Maße wurden angepasst (erlaubt: Rückseite und Vorderseite 100–150 mm, Rücken 3–30 mm, Höhe 100–198 mm, insgesamt höchstens ' + C.MAX_W + ' mm breit). Verwendet wird: ' + dims.back + ' + ' + dims.spine + ' + ' + dims.front + ' × ' + dims.h + ' mm.');
    const bc = barcodeInfo();
    if (bc && !bc.bits) notes.push('Der Barcode-Inhalt fehlt oder ist ungültig (erlaubt: Buchstaben, Ziffern und Satzzeichen ohne Umlaute, höchstens 40 Zeichen).');
    else if (bc && bc.module < C.BARCODE_MIN_MODULE) notes.push('Der Barcode ist sehr dicht (' + bc.module.toFixed(2) + ' mm je Strich) und lässt sich vielleicht nicht scannen. Kürze den Inhalt (z. B. s.team/a/70 statt langer Adressen).');
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
    bindControls();
    bindDrops();
    syncControls();
    $('#bPrint').addEventListener('click', () => window.print());
    $('#bReset').addEventListener('click', () => {
      if (!confirm('Alle Einstellungen und Bilder zurücksetzen?')) return;
      Object.keys(images).forEach(clearImage);
      state = C.defaultState();
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
