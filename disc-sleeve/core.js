/* Kernlogik des Cover-Tools: Maße, Texte für die Systemanforderungen, Standardwerte.
   Ohne Zugriff auf die Seite, damit sie sich mit Node testen lässt (tests/cover.test.js). */
(function (root) {
  'use strict';

  /* --- Maße in Millimetern (Papier: A4 quer) --- */
  const PAPER = { w: 297, h: 210 };
  const CASES = {
    normal: { name: 'Normal (14 mm Rücken)', w: 273, h: 183, back: 130, spine: 14, front: 129 },
    slim: { name: 'Slim Case (7 mm Rücken)', w: 266, h: 183, back: 129.5, spine: 7, front: 129.5 },
  };
  /* Eigene Maße: erlaubte Bereiche in mm. Das Blatt (A4 quer) muss Cover plus Schnittmarken (je 6 mm) aufnehmen. */
  const CUSTOM_LIMITS = { back: [100, 150], spine: [3, 30], front: [100, 150], h: [100, 198] };
  const MAX_W = 285;
  /* Vorlagen für andere Hüllen. Das sind Richtwerte aus Herstellerangaben, die je nach Hersteller abweichen: bitte nachmessen. */
  const PRESETS = {
    bluray: { name: 'Blu-ray (Richtwert 269 × 148 mm)', back: '127.5', spine: '14', front: '127.5', h: '148' },
    blurayslim: { name: 'Blu-ray Slim (Richtwert 262 × 148 mm)', back: '127.5', spine: '7', front: '127.5', h: '148' },
  };
  /* Maße der gewählten Hülle. Eigene Werte werden in die erlaubten Bereiche gezwungen (adjusted: true, wenn etwas geändert wurde). */
  function caseDims(state) {
    if (state.caseType !== 'custom') return CASES[state.caseType] || CASES.normal;
    const c = state.custom || {}, defaults = { back: 130, spine: 14, front: 129, h: 183 };
    let adjusted = false;
    const num = (k) => {
      const [lo, hi] = CUSTOM_LIMITS[k];
      let v = parseFloat(String(c[k]).replace(',', '.'));
      if (!isFinite(v)) { v = defaults[k]; adjusted = true; }
      if (v < lo || v > hi) { v = Math.min(hi, Math.max(lo, v)); adjusted = true; }
      return v;
    };
    let back = num('back'), spine = num('spine'), front = num('front');
    const h = num('h');
    if (back + spine + front > MAX_W) {                      // zu breit für das Blatt: Rückseite und Vorderseite gleich viel kürzen
      const cut = (back + spine + front - MAX_W) / 2;
      back = round1(back - cut); front = round1(front - cut); adjusted = true;
    }
    return { name: 'Eigene Maße', w: round1(back + spine + front), h, back: round1(back), spine: round1(spine), front: round1(front), adjusted };
  }

  /* ---------- Rückseite: unten fest, oben frei gestaltbar ----------
     Unten steht immer derselbe Teil (Streifen mit den Spielfunktionen und Systemanforderungen mit Logos), bei allen Anbietern gleich. Die Höhen lassen sich
     von Hand anpassen (z. B. bei einer Blu-ray-Hülle). Darüber liegt die Gestaltungsfläche: Als Grund das Bild "Rückseite oben", darauf beliebig viele
     Elemente (Bilder und Texte) mit Position und Größe in mm, in der Reihenfolge von unten nach oben. Bearbeitet wird sie im Editor (Pop-up). */
  const BACK = { banner: 15, bottom: 46 };                                           // Standardhöhen unten (mm)
  const BACK_LIMITS = { featH: [10, 30], reqH: [30, 110] };
  const BACK_FONTS = ['sans', 'serif', 'condensed', 'display', 'mono', 'hand'];
  /* Eigene Schriften heißen uf-<id>. Ob es die Schrift auf diesem Rechner gibt, entscheidet erst das Zeichnen (sonst Rückfall auf Normal). */
  const isCustomFont = (v) => typeof v === 'string' && /^uf-[a-z0-9]{1,12}$/.test(v);
  const BACK_EDGES = ['none', 'round', 'border', 'feather', 'torn'];
  const MAX_ITEMS = 60;
  const clampN = (v, lo, hi, d) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const hexOk = (v, d) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v).toLowerCase() : d);
  const oneOf = (v, list, d) => (list.includes(v) ? v : d);
  const IMAGE_KEY_RE = /^(front|backTop|backBottom|publisher|spineLogo|spineBg|d\d+)$/;
  const isImageKey = (k) => IMAGE_KEY_RE.test(String(k));

  /* Formen: Kreis, Dreieck, Viereck, Stern und freie Fläche. Punkte liegen in Prozent des Rahmens (0 bis 100), so wachsen sie beim Skalieren mit. */
  const SHAPE_KINDS = ['rect', 'ellipse', 'triangle', 'star', 'poly'];
  const MAX_PTS = 24;
  const DEFAULT_PTS = { rect: [[0, 0], [100, 0], [100, 100], [0, 100]], triangle: [[50, 0], [100, 100], [0, 100]], poly: [[12, 8], [92, 0], [100, 68], [52, 100], [0, 62]] };
  const defaultPts = (kind) => (DEFAULT_PTS[kind] || DEFAULT_PTS.poly).map((q) => q.slice());
  const normRot = (v) => { const n = parseFloat(String(v).replace(',', '.')); if (!isFinite(n)) return 0; let r = ((n % 360) + 360) % 360; if (r > 180) r -= 360; return Math.round(r * 10) / 10; };
  /* Ein Element der Gestaltungsfläche prüfen (fehlende Werte bekommen Standardwerte) */
  function normalizeItem(raw) {
    if (!raw || typeof raw !== 'object' || !['image', 'text', 'shape'].includes(raw.type)) return null;
    const it = {
      id: typeof raw.id === 'string' && /^[a-z0-9_-]{1,12}$/i.test(raw.id) ? raw.id : '',
      type: raw.type,
      x: clampN(raw.x, -300, 600, 0), y: clampN(raw.y, -300, 600, 0), w: clampN(raw.w, 2, 600, 40), h: clampN(raw.h, 2, 600, 20),
      opacity: Math.round(clampN(raw.opacity, 5, 100, 100)), rot: normRot(raw.rot),
      edge: oneOf(raw.edge, BACK_EDGES, 'none'), edgeSize: clampN(raw.edgeSize, 0, 20, 0), borderColor: hexOk(raw.borderColor, '#ffffff'),
    };
    if (it.type === 'image' || it.type === 'shape') {
      it.img = isImageKey(raw.img) ? raw.img : '';
      it.fit = it.type === 'shape' ? 'cover' : oneOf(raw.fit, ['cover', 'contain', 'stretch'], 'cover');
      it.posX = Math.round(clampN(raw.posX, 0, 100, 50) * 10) / 10; it.posY = Math.round(clampN(raw.posY, 0, 100, 50) * 10) / 10; it.zoom = Math.round(clampN(raw.zoom, 100, 500, 100));
      if (it.type === 'shape') {
        it.shape = oneOf(raw.shape, SHAPE_KINDS, 'rect'); it.color = hexOk(raw.color, '#2f2f36'); it.useImg = !!raw.useImg;
        it.sides = Math.round(clampN(raw.sides, 3, 12, 5)); it.inner = Math.round(clampN(raw.inner, 10, 90, 40));
        const ok = Array.isArray(raw.pts) && raw.pts.length >= 3 && raw.pts.length <= MAX_PTS && raw.pts.every((q) => Array.isArray(q) && q.length === 2);
        it.pts = ok ? raw.pts.map((q) => [Math.round(clampN(q[0], 0, 100, 0) * 10) / 10, Math.round(clampN(q[1], 0, 100, 0) * 10) / 10]) : defaultPts(it.shape);
        it.edge = 'none'; it.strokeW = Math.round(clampN(raw.strokeW, 0, 10, 0) * 4) / 4;
      }
    } else {
      it.text = typeof raw.text === 'string' ? raw.text.slice(0, 4000) : '';
      it.bind = oneOf(raw.bind, ['', 'title', 'description'], '');
      it.font = isCustomFont(raw.font) ? raw.font : oneOf(raw.font, BACK_FONTS, 'sans');
      it.size = clampN(raw.size, 3, 120, 8); it.color = hexOk(raw.color, '#222222');
      it.weight = oneOf(String(raw.weight), ['300', '400', '700', '900'], '400'); it.italic = !!raw.italic; it.caps = !!raw.caps;
      it.spacing = clampN(raw.spacing, -5, 60, 0); it.line = clampN(raw.line, 0.8, 3, 1.3);
      it.align = oneOf(raw.align, ['left', 'center', 'right', 'justify'], 'left'); it.valign = oneOf(raw.valign, ['top', 'middle', 'bottom'], 'top');
      it.fit = raw.fit !== false; it.bg = raw.bg ? hexOk(raw.bg, '') : ''; it.bgOpacity = Math.round(clampN(raw.bgOpacity, 0, 100, 80)); it.pad = clampN(raw.pad, 0, 20, 1);
    }
    return it;
  }
  function defaultBack() { return { featH: String(BACK.banner), reqH: String(BACK.bottom), span: false, description: '', seq: 1, items: [] }; }
  function normalizeBack(saved) {
    const s = saved && typeof saved === 'object' ? saved : {}, out = defaultBack();
    out.featH = String(Math.round(clampN(s.featH, BACK_LIMITS.featH[0], BACK_LIMITS.featH[1], BACK.banner) * 100) / 100);
    out.reqH = String(Math.round(clampN(s.reqH, BACK_LIMITS.reqH[0], BACK_LIMITS.reqH[1], BACK.bottom) * 100) / 100);
    out.span = !!s.span;
    out.description = typeof s.description === 'string' ? s.description.slice(0, 4000) : '';
    const seen = new Set(); let maxN = 0;
    for (const raw of Array.isArray(s.items) ? s.items.slice(0, MAX_ITEMS) : []) {
      const it = normalizeItem(raw); if (!it) continue;
      if (!it.id || seen.has(it.id)) { let n = 1; while (seen.has('e' + n)) n++; it.id = 'e' + n; }
      seen.add(it.id); out.items.push(it);
    }
    for (const it of out.items) { const m = /^d(\d+)$/.exec(it.img || ''); if (m) maxN = Math.max(maxN, Number(m[1])); }
    out.seq = Math.max(Math.round(clampN(s.seq, 1, 100000, 1)), maxN + 1);
    return out;
  }
  /* Höhe der Gestaltungsfläche (mm): alles über dem Streifen mit den Spielfunktionen */
  function designHeight(state, dims) {
    const c = dims || caseDims(state), b = (state && state.back) || defaultBack();
    return Math.max(0, round1(c.h - Number(b.featH) - Number(b.reqH)));
  }
  /* Neues Element mit Standardwerten (Position in mm auf der Gestaltungsfläche) */
  function newItem(type, props) { return normalizeItem({ type, ...(props || {}) }); }
  /* Vorlagen für die Gestaltungsfläche: Elemente, die an die Größe der Fläche angepasst sind (Bilder bleiben leer, bis man sie wählt) */
  const BACK_TEMPLATES = { none: 'Leer', text: 'Titel und Beschreibung', steam: 'Beschreibung und Bildleiste', among: 'Party-Stil (Among Us)', aoe: 'Vier Bilder (Age of Empires)', spider: 'Spalten (Spider-Man)', halflife: 'Retro (Half-Life)', alyx: 'Zersplittert (Alyx)' };
  /* Vorlagen nach dem Vorbild bekannter Steam-Hüllen. Maße sind Anteile der Gestaltungsfläche (x, y, Breite, Höhe von 0 bis 1), Schriftgrößen gelten für 130 mm Breite.
     Eine Fläche ("fill") ist ein Textelement ohne Text mit Hintergrund, sie dient als dunkler Grund. */
  const W = '#ffffff';
  const fill = (c, o) => ['shape', 0, 0, 1, 1, { shape: 'rect', color: c, opacity: o || 100 }];
  /* Bildfläche mit beliebigen Ecken: Punkte als Anteile der ganzen Fläche, daraus wird der Rahmen berechnet */
  const facet = (pts, p) => { const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys); return ['shape', x0, y0, x1 - x0, y1 - y0, { shape: 'poly', useImg: true, pts: pts.map((q) => [(q[0] - x0) / (x1 - x0) * 100, (q[1] - y0) / (y1 - y0) * 100]), ...(p || {}) }]; };
  const txt = (x, y, w, h, p) => ['text', x, y, w, h, { size: 7, color: W, ...p }];
  const img = (x, y, w, h, p) => ['image', x, y, w, h, p || {}];
  const TEMPLATE_DEFS = {
    among: [fill('#0b0b0f'),
      txt(0.06, 0.03, 0.88, 0.17, { text: 'Überschrift', font: 'display', size: 17, weight: '900', align: 'center', valign: 'middle' }),
      txt(0.08, 0.2, 0.84, 0.09, { text: 'Kurzer Text …', size: 8, align: 'center' }),
      img(0.1, 0.31, 0.8, 0.13), txt(0.1, 0.445, 0.8, 0.05, { text: 'Bildunterschrift', size: 6.5, align: 'center' }),
      img(0.1, 0.52, 0.8, 0.13), txt(0.1, 0.655, 0.8, 0.05, { text: 'Bildunterschrift', size: 6.5, align: 'center' }),
      txt(0.06, 0.72, 0.88, 0.26, { bind: 'description', size: 8, align: 'center' })],
    aoe: [fill('#17110c'),
      txt(0.05, 0.03, 0.9, 0.1, { text: 'Überschrift', font: 'display', size: 15, weight: '900', caps: true, align: 'center', valign: 'middle', color: '#e8d9b0', spacing: 3 }),
      img(0.05, 0.16, 0.43, 0.26, { edge: 'border', edgeSize: 0.5, borderColor: '#e8d9b0' }), img(0.52, 0.16, 0.43, 0.26, { edge: 'border', edgeSize: 0.5, borderColor: '#e8d9b0' }),
      txt(0.05, 0.425, 0.43, 0.12, { text: 'Bildunterschrift', size: 6, color: '#e8d9b0' }), txt(0.52, 0.425, 0.43, 0.12, { text: 'Bildunterschrift', size: 6, color: '#e8d9b0' }),
      img(0.05, 0.56, 0.43, 0.26, { edge: 'border', edgeSize: 0.5, borderColor: '#e8d9b0' }), img(0.52, 0.56, 0.43, 0.26, { edge: 'border', edgeSize: 0.5, borderColor: '#e8d9b0' }),
      txt(0.05, 0.825, 0.43, 0.12, { text: 'Bildunterschrift', size: 6, color: '#e8d9b0' }), txt(0.52, 0.825, 0.43, 0.12, { text: 'Bildunterschrift', size: 6, color: '#e8d9b0' })],
    spider: [fill('#0a0a0c'),
      txt(0.05, 0.04, 0.9, 0.12, { text: 'Überschrift', font: 'display', size: 18, weight: '900', caps: true, valign: 'top', spacing: 2 }),
      txt(0.05, 0.2, 0.43, 0.17, { text: 'Kurzer Text …' }), txt(0.05, 0.39, 0.43, 0.17, { text: 'Kurzer Text …' }), txt(0.05, 0.58, 0.43, 0.17, { text: 'Kurzer Text …' }), txt(0.05, 0.77, 0.43, 0.17, { text: 'Kurzer Text …' }),
      img(0.53, 0.2, 0.42, 0.21), img(0.53, 0.44, 0.42, 0.21), img(0.53, 0.68, 0.42, 0.21)],
    halflife: [fill('#14110e'),
      txt(0.04, 0.03, 0.92, 0.1, { text: 'Überschrift', font: 'display', size: 22, weight: '900', caps: true, color: '#f2a33a', valign: 'middle' }),
      txt(0.06, 0.15, 0.88, 0.14, { bind: 'description', size: 8, italic: true, color: '#f0e6d6', align: 'center' }),
      img(0.06, 0.33, 0.42, 0.24), txt(0.52, 0.33, 0.42, 0.24, { text: 'Kurzer Text …', color: '#f0e6d6' }),
      img(0.06, 0.62, 0.42, 0.24), txt(0.52, 0.62, 0.42, 0.24, { text: 'Kurzer Text …', color: '#f0e6d6' })],
    alyx: [fill('#1c1c1f'),
      facet([[0, 0], [1, 0], [1, 0.47], [0.62, 0.43], [0, 0.33]]),
      facet([[0, 0.33], [0.62, 0.43], [0.62, 0.6], [0, 0.5]]),
      facet([[0, 0.5], [0.62, 0.6], [0.5, 1], [0, 1]]),
      facet([[0.62, 0.43], [1, 0.47], [1, 1], [0.5, 1], [0.62, 0.6]]),
      txt(0.28, 0.36, 0.7, 0.08, { bind: 'description', size: 6.5, align: 'center', valign: 'middle', bg: '#000000', bgOpacity: 55, pad: 1 })],
  };
  function backTemplate(id, w, h) {
    const m = 6, inner = Math.max(10, w - 2 * m);
    if (TEMPLATE_DEFS[id]) {
      return TEMPLATE_DEFS[id].map(([type, fx, fy, fw, fh, p]) => newItem(type, { ...p, x: round1(fx * w), y: round1(fy * h), w: round1(fw * w), h: round1(fh * h), ...(p.size ? { size: round1(p.size * w / 130) } : {}) }));
    }
    if (id === 'text') {
      return [
        newItem('text', { bind: 'title', x: m, y: h * 0.38, w: inner, h: 9, font: 'display', size: 16, weight: '900', caps: true, align: 'center', valign: 'middle', color: '#ffffff', spacing: 4, bg: '#000000', bgOpacity: 45, pad: 1.5 }),
        newItem('text', { bind: 'description', x: m, y: h * 0.38 + 11, w: inner, h: h * 0.6 - 13, size: 8, color: '#ffffff', align: 'left', bg: '#000000', bgOpacity: 45, pad: 2 }),
      ];
    }
    if (id === 'steam') {
      const stripH = Math.round(h * 0.26 * 10) / 10, gap = 3, iw = Math.round(((inner - 2 * gap) / 3) * 10) / 10, y = round1(h - stripH - 4);
      const out = [
        newItem('text', { bind: 'title', x: m, y: round1(h * 0.34), w: inner, h: 8, font: 'display', size: 15, weight: '900', caps: true, align: 'center', valign: 'middle', color: '#1c1c22', spacing: 3 }),
        newItem('text', { bind: 'description', x: m, y: round1(h * 0.34 + 9), w: inner, h: round1(y - h * 0.34 - 12), size: 7.5, color: '#222222', align: 'left' }),
      ];
      for (let i = 0; i < 3; i++) out.push(newItem('image', { x: round1(m + i * (iw + gap)), y, w: iw, h: stripH, edge: 'border', edgeSize: 0.6, borderColor: '#ffffff' }));
      return out;
    }
    return [];
  }
  /* ---------- Eigene Vorlagen ----------
     Eine Vorlage speichert nur das Layout: Elemente in mm für eine Bezugsfläche (ref), Bilder bleiben leer (Platzhalter).
     Beim Anwenden wird auf die Größe der Gestaltungsfläche umgerechnet (Schriftgröße mit der Breite). */
  const MAX_TEMPLATES = 40, MAX_FONTS = 12, MAX_NAME = 60;
  const cleanName = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  function templateFromItems(items, area, name) {
    const ref = { w: round1(clampN(area && area.w, 20, 400, 130)), h: round1(clampN(area && area.h, 20, 400, 122)) };
    const out = (Array.isArray(items) ? items : []).slice(0, MAX_ITEMS).map((raw) => normalizeItem(raw)).filter(Boolean).map((it) => {
      it.id = ''; if (it.type !== 'text') it.img = ''; return it;
    });
    return { name: cleanName(name), ref, items: out };
  }
  /* Prüft eine Vorlage aus Datei oder Speicher. Ungültiges ergibt null, einzelne kaputte Elemente werden weggelassen. */
  function normalizeTemplate(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = cleanName(raw.name); if (!name) return null;
    const r = raw.ref && typeof raw.ref === 'object' ? raw.ref : {};
    const t = templateFromItems(Array.isArray(raw.items) ? raw.items : [], { w: r.w, h: r.h }, name);
    t.id = typeof raw.id === 'string' && /^u-[a-z0-9]{1,12}$/i.test(raw.id) ? raw.id : '';
    return t;
  }
  /* Elemente einer eigenen Vorlage für eine Gestaltungsfläche der Größe w × h (mm) */
  function instantiateTemplate(t, w, h) {
    const sx = w / t.ref.w, sy = h / t.ref.h;
    return t.items.map((it) => newItem(it.type, { ...it, id: '', x: round1(it.x * sx), y: round1(it.y * sy), w: round1(it.w * sx), h: round1(it.h * sy), ...(it.type === 'text' ? { size: round1(it.size * sx) } : {}) }));
  }
  function imageSpecs(caseOrDims, top, state) {
    if (top === undefined) top = BAR_HEIGHT;
    const c = typeof caseOrDims === 'object' ? caseOrDims : (CASES[caseOrDims] || CASES.normal);
    const b = (state && state.back) || defaultBack();
    return {
      front: { w: c.front, h: round1(c.h - top) },
      backTop: { w: c.back, h: b.span ? c.h : designHeight({ back: b }, c) },
      backBottom: { w: c.back, h: Number(b.reqH) },
      spineBg: { w: c.spine, h: c.h },
    };
  }

  /* Größe, in der die Bilder für den Druck angelegt werden sollten */
  /* Höhe der Kopfleiste (mm): Das Frontbild füllt nur den Teil darunter */
  const BAR_HEIGHT = 18.6;
  const round1 = (n) => Math.round(n * 10) / 10;

  /* --- Texte --- */
  const LABELS = {
    de: {
      reqTitle: 'SYSTEMANFORDERUNGEN', tag: 'PC · DRM-FREI',
      features: 'Spielfunktionen:', featuresNote: 'Einige Funktionen erfordern GOG Galaxy',
      min: 'MINIMUM', rec: 'EMPFOHLEN', short: { ram: 'RAM', space: 'Speicher' }, os: 'Läuft auf', cpu: 'Prozessor', ram: 'Arbeitsspeicher', gpu: 'Grafik', dx: 'DirectX', space: 'Speicherplatz', other: 'Sonstiges',
      ramUnit: 'RAM', spaceUnit: 'freier Speicherplatz', bit64: '64-Bit',
      feat: { single_player: 'Single-Player', co_op: 'Co-op', multi_player: 'Multi-Player', online: 'Online', lan: 'LAN', cross_platform: 'Cross-Plattform', mods: 'Mods', vr: 'VR', controller_support: 'Controller Support', achievements: 'Erfolge', cloud_saves: 'Cloud Saves' },
    },
    en: {
      reqTitle: 'SYSTEM REQUIREMENTS', tag: 'PC · DRM-FREE',
      features: 'Game Features:', featuresNote: 'Some features require GOG Galaxy',
      min: 'MINIMUM', rec: 'RECOMMENDED', short: {}, os: 'Works on', cpu: 'Processor', ram: 'Memory', gpu: 'Graphics', dx: 'DirectX', space: 'Storage', other: 'Other',
      ramUnit: 'RAM', spaceUnit: 'available space', bit64: '64-bit',
      feat: { single_player: 'Single-Player', co_op: 'Co-op', multi_player: 'Multi-Player', online: 'Online', lan: 'LAN', cross_platform: 'Cross-Platform', mods: 'Mods', vr: 'VR', controller_support: 'Controller Support', achievements: 'Achievements', cloud_saves: 'Cloud Saves' },
    },
  };
  const FEATURE_ORDER = ['single_player', 'co_op', 'multi_player', 'online', 'lan', 'cross_platform', 'controller_support', 'achievements', 'cloud_saves', 'mods', 'vr'];
  const WIN_VERSIONS = ['XP', 'Vista', '7', '8', '10', '11'];
  const USK_VALUES = ['0', '6', '12', '16', '18'];
  /* Anbieter: Farben und Schriftzug. Es gibt nur Text und Farben, keine Logos (außer dem vorhandenen GOG-Logo). */
  const PROVIDERS = {
    gog: { name: 'GOG', logo: 'gog_logo.svg', wordmark: 'GOG.COM', brand: '#2b2b31', onBrand: '#ffffff', dark: '#17171b', mid: '#2b2b31', accent: '#b45ad1', bannerA: '#3a3a42', bannerB: '#222227', barA: '#303036', barB: '#18181c', line: '#b45ad1',
      /* Leisten-Varianten: Weiß, Dunkel und Dunkel durchscheinend (die Leiste liegt über dem Bild, mit Verlauf nach unten). fg = Farbe von Schrift in der Leiste */
      variants: {
        white: { logo: 'gog_logo_outline.svg', barA: '#ffffff', barB: '#f1f1f4', fg: '#1c1c22', line: 'rgba(0,0,0,.18)', barLine: '.25mm', spine: '#2b2b31', spineLight: '#f1f1f4', bannerA: '#e6e6ec', bannerB: '#d1d1da', tint: true, dk: false, over: false },
        warm: { logo: 'gog_logo_outline.svg', barA: '#f8f6f2', barB: '#ece9e3', fg: '#25221e', line: 'rgba(70,55,40,.22)', barLine: '.25mm', spine: '#2b2b31', spineLight: '#ece9e3', bannerA: '#ebe8e1', bannerB: '#d9d5cc', tint: true, dk: false, over: false },
        dark: { barA: '#323238', barB: '#18181c', fg: '#ffffff', line: 'transparent', barLine: '0mm', spine: '#232328', spineLight: '#e9e9ee', bannerA: '#3a3a42', bannerB: '#222227', tint: false, dk: true, over: false },
        violet: { barA: '#2a2238', barB: '#0f0b17', fg: '#ffffff', line: 'transparent', barLine: '0mm', spine: '#17141d', spineLight: '#ebe9f0', bannerA: '#2b2536', bannerB: '#17131f', tint: false, dk: true, over: false },
        glasswhite: { logo: 'gog_logo_outline.svg', barA: 'rgba(255,255,255,.92)', barB: 'rgba(255,255,255,0)', grad: 'linear-gradient(rgba(255,255,255,.92), rgba(255,255,255,.72) 45%, rgba(255,255,255,0))', fg: '#15151a', line: 'transparent', barLine: '0mm', spine: '#2b2b31', spineLight: '#f1f1f4', bannerA: '#e6e6ec', bannerB: '#d1d1da', tint: true, dk: false, over: true },
        glass: { barA: 'rgba(12,12,16,.9)', barB: 'rgba(12,12,16,0)', grad: 'linear-gradient(rgba(12,12,16,.9), rgba(12,12,16,.7) 45%, rgba(12,12,16,0))', fg: '#ffffff', line: 'transparent', barLine: '0mm', spine: '#232328', spineLight: '#e9e9ee', bannerA: '#3a3a42', bannerB: '#222227', tint: false, dk: true, over: true },
      },
      tag: { de: 'PC · DRM-FREI', en: 'PC · DRM-FREE' }, note: { de: 'Einige Funktionen erfordern GOG Galaxy', en: 'Some features require GOG Galaxy' } },
    epic: { name: 'Epic Games', logo: 'epic_logo.svg', wordmark: 'EPIC GAMES', brand: '#2d2d33', onBrand: '#ffffff', dark: '#0f0f12', mid: '#26262b', accent: '#d6dae4', bannerA: '#3a3a42', bannerB: '#222227', barA: '#3a3a42', barB: '#222227', line: '#d6dae4', tag: { de: 'PC', en: 'PC' }, note: { de: 'Einige Funktionen erfordern den Epic Games Launcher', en: 'Some features require the Epic Games Launcher' } },
    steam: { name: 'Steam', logo: 'steam_logo.svg', wordmark: 'STEAM', brand: '#23394c', onBrand: '#e3e9f0', dark: '#06090d', mid: '#1a2939', accent: '#29abe1', bannerA: '#2a465c', bannerB: '#1a2939', barA: '#2a465c', barB: '#1a2939', line: '#29abe1', tag: { de: 'PC', en: 'PC' }, note: { de: 'Einige Funktionen erfordern Steam', en: 'Some features require Steam' } },
  };
  const THEMES = { bar: 'Leiste', white: 'Weiß', warm: 'Warmweiß', glasswhite: 'Durchsichtig weiß', glass: 'Durchsichtig schwarz', dark: 'Dunkel', violet: 'Dunkel mit Violett-Hauch' };
  /* Auswahl im Stil-Menü: Nur GOG hat zwei Farbvarianten (Lila mit Grün, dunkel mit Lila), bei Steam und Epic sind die Farben ohnehin dunkel. */
  function styleOptions(provider) {
    return provider === 'gog' ? [['white', 'Weiß'], ['warm', 'Warmweiß'], ['glasswhite', 'Durchsichtig weiß'], ['glass', 'Durchsichtig schwarz'], ['dark', 'Dunkel'], ['violet', 'Dunkel mit Violett-Hauch']] : [['bar', 'Leiste']];
  }
  /* Höhe der Leiste (mm) und Beginn des Frontbildes: GOG hat eine schmale Leiste, bei "durchscheinend" liegt sie über dem Bild (Bild beginnt ganz oben) */
  const GOG_BAR_HEIGHT = 10;
  function barHeight(state) { return state && state.provider === 'gog' ? GOG_BAR_HEIGHT : BAR_HEIGHT; }
  function frontTop(state) {
    if (state && state.provider === 'gog') { const v = PROVIDERS.gog.variants[state.theme]; return v && v.over ? 0 : GOG_BAR_HEIGHT; }
    return BAR_HEIGHT;
  }
  const DISCS = { cd: 'cd.svg', dvd: 'dvd.svg', bluray: 'blu-ray.svg' };

  /* 0,5 -> "500 MB", 4 -> "4 GB", "4,5" -> "4.5 GB" */
  function formatStorage(value, unit) {
    const n = parseFloat(String(value == null ? '' : value).replace(',', '.'));
    if (!isFinite(n) || n <= 0) return '';
    const text = n < 1 ? Math.round(n * 1000) + ' MB' : trimNumber(n) + ' GB';
    return unit ? text + ' ' + unit : text;
  }
  const trimNumber = (n) => String(Math.round(n * 100) / 100);

  /* Betriebssysteme: "Windows (7, 10, 11, 64-Bit) / Mac / Linux" */
  function osString(os, lang) {
    const L = LABELS[lang] || LABELS.de;
    const parts = [];
    const win = WIN_VERSIONS.filter((v) => (os.win || []).includes(v));
    if (win.length || (os.x64 && os.win && os.win.length)) {
      const inner = win.slice();
      if (os.x64) inner.push(L.bit64);
      parts.push(inner.length ? 'Windows (' + inner.join(', ') + ')' : 'Windows');
    }
    if (os.mac) parts.push('macOS');
    if (os.linux) parts.push('Linux');
    return parts.join(' / ');
  }

  /* ---------- Prozessoren und Grafikkarten ----------
     Beide sind Listen mit beliebig vielen Einträgen. Jeder Eintrag lässt sich an- und ausschalten und ist entweder aus Auswahlfeldern aufgebaut
     (Prozessor: Intel oder AMD mit Reihe, Modell, Zusatz; Grafikkarte: GeForce oder Radeon mit Reihe, Modell, Zusatz, Speicher in GB)
     oder ein freier Text (z. B. "Arc A380"). Auf dem Cover steht jeder Eintrag in einer eigenen Zeile. */
  const HW = {
    cpu: {
      intel: { label: 'Intel', first: 'Core i5', series: ['Core i3', 'Core i5', 'Core i7', 'Core i9', 'Core Ultra 5', 'Core Ultra 7', 'Core Ultra 9', 'Pentium', 'Celeron', 'Core 2 Duo', 'Core 2 Quad'], sfx: ['', 'K', 'KF', 'F'] },
      amd: { label: 'AMD', first: 'Ryzen 5', series: ['Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9', 'Athlon', 'Phenom', 'FX'], sfx: ['', 'X', 'X3D', 'G'] },
    },
    gpu: {
      geforce: { label: 'GeForce', first: 'RTX', series: ['RTX', 'GTX', 'GTS', 'GT', 'Titan', 'Quadro'], sfx: ['', 'Ti', 'SUPER', 'Ti SUPER'] },
      radeon: { label: 'Radeon', first: 'RX', series: ['RX', 'HD', 'R9', 'R7', 'R5', 'Vega'], sfx: ['', 'XT', 'XTX', 'GRE'] },
    },
  };
  const HW_MAX = 8;
  const hwKinds = (type) => Object.keys(HW[type]);

  function newHwItem(type, kind) {
    const spec = HW[type][kind];
    return { on: true, kind: spec ? kind : 'text', pre: spec ? spec.first : '', num: '', sfx: '', gb: '', text: '' };
  }

  /* Markennamen vereinheitlichen: "NVIDIA GeForce RTX 3060" -> "GeForce RTX 3060", "AMD Radeon RX 580" -> "Radeon RX 580" */
  function brandText(t) {
    return String(t || '').replace(/[®™]/g, '').replace(/\bNVIDIA\s+GeForce\b/gi, 'GeForce').replace(/\bAMD\s+Radeon\b/gi, 'Radeon')
      .replace(/\b(?:NVIDIA|Nvidia)\s+(?=(?:RTX|GTX|GTS|GT)\b)/g, 'GeForce ').replace(/\s+/g, ' ').trim();
  }
  const gbText = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) && n > 0 ? trimNumber(n) + ' GB' : ''; };

  function hwText(type, it) {
    if (!it) return '';
    if (it.kind === 'text') return brandText(it.text);
    const num = String(it.num || '').trim(), sfx = it.sfx || '';
    if (type === 'cpu') {
      if (it.kind === 'intel') return 'Intel ' + it.pre + (num ? (/^Core i\d$/.test(it.pre) ? '-' : ' ') + num + sfx : '');
      return 'AMD ' + it.pre + (num ? ' ' + num + sfx : '');
    }
    return [HW.gpu[it.kind].label, it.pre + (num ? ' ' + num : '') + (sfx ? ' ' + sfx : '') + (gbText(it.gb) ? ' ' + gbText(it.gb) : '')].join(' ');
  }
  const hwList = (type, x) => ((x && x.items) || []).filter((it) => it && it.on !== false).map((it) => hwText(type, it)).filter(Boolean);
  const cpuList = (cpu) => hwList('cpu', cpu);
  const gpuList = (gpu) => hwList('gpu', gpu);

  /* Gespeicherte oder übernommene Daten bereinigen. Ältere Einstellungen (Intel/AMD- bzw. NVIDIA/AMD-Felder, eigener Text) werden in Einträge umgewandelt. */
  function legacyHw(x, type) {
    const out = [];
    if (x.custom && String(x.custom).trim()) return [{ ...newHwItem(type, 'text'), text: String(x.custom).trim() }];
    const fields = type === 'cpu' ? [['intel', 'intel'], ['amd', 'amd']] : [['nvidia', 'geforce'], ['amd', 'radeon']];
    for (const [old, kind] of fields) {
      const o = x[old];
      if (!o || !o.on) continue;
      const it = newHwItem(type, kind);
      it.pre = typeof o.pre === 'string' ? o.pre : it.pre; it.num = typeof o.num === 'string' ? o.num : '';
      let sfx = typeof o.sfx === 'string' ? o.sfx : '';
      const m = sfx.match(/(\d+)\s*GB/i);
      if (m) { it.gb = m[1]; sfx = sfx.replace(m[0], '').trim(); }
      it.sfx = sfx;
      out.push(it);
    }
    return out;
  }
  function normalizeHw(x, type) {
    let items = [];
    if (x && Array.isArray(x.items)) items = x.items;
    else if (x && typeof x === 'object') items = legacyHw(x, type);
    const str = (v) => (typeof v === 'string' ? v : '');
    return { items: items.filter((i) => i && typeof i === 'object').slice(0, HW_MAX).map((i) => {
      const kind = hwKinds(type).includes(i.kind) ? i.kind : 'text', spec = HW[type][kind];
      return { on: i.on !== false, kind, pre: spec && spec.series.includes(i.pre) ? i.pre : (spec ? spec.first : ''), num: str(i.num), sfx: spec && spec.sfx.includes(i.sfx) ? i.sfx : '', gb: str(i.gb), text: str(i.text) };
    }) };
  }

  /* ---------- Texte (z. B. von Steam) in Einträge zerlegen ----------
     Ein "or" / "oder" / "/" trennt die Möglichkeiten, jede wird ein eigener Eintrag. Was in Auswahlfelder passt, kommt dorthin
     (z. B. "GeForce GTX 1060 6GB" -> GeForce, GTX, 1060, 6 GB), alles andere bleibt als Text erhalten. */
  const clean = (t) => String(t || '').replace(/[®™]|\(R\)|\(TM\)|\(r\)|\(tm\)/g, '').replace(/\(\s*(\d+(?:[.,]\d+)?\s*GB)\s*\)/gi, ' $1 ').replace(/\([^)]*\)/g, ' ')
    .replace(/\s+(?:or|oder)\s+(?:better|higher|equivalent|faster|newer|above|similar)\b.*$/i, '').replace(/\s+(?:or|oder)?\s*(?:equivalent|better)\s*$/i, '').replace(/\s+/g, ' ').trim();
  const split = (t) => clean(t).split(/\s+(?:or|oder)\s+|\s*\/\s*|\s*;\s*|,\s*(?=(?:AMD|Intel|NVIDIA|GeForce|Radeon|Ryzen|Core|Athlon|Phenom|FX)\b)/i).map((x) => x.trim()).filter(Boolean);

  function parseCpuPart(part) {
    const t = part.replace(/^(?:Intel|AMD)\s+/i, '');
    const item = (kind, pre, num, sfx) => ({ ...newHwItem('cpu', kind), pre, num, sfx });
    let m = t.match(/^Core\s*(i[3579])\s*-?\s*(\d{3,5})?([A-Z]{0,2})$/i);
    if (m) {
      const suffix = (m[3] || '').toUpperCase(), known = ['K', 'KF', 'F'].includes(suffix);
      return item('intel', 'Core ' + m[1].toLowerCase(), (m[2] || '') + (m[2] && !known ? suffix : ''), known ? suffix : '');
    }
    m = t.match(/^Core\s+Ultra\s*([579])\s*(\d{3}[A-Z]{0,2})?$/i);
    if (m) return item('intel', 'Core Ultra ' + m[1], (m[2] || '').toUpperCase(), '');
    m = t.match(/^(Core 2 Duo|Core 2 Quad|Pentium|Celeron)\s*(.*)$/i);
    if (m && /^[A-Za-z0-9 .+-]*$/.test(m[2]) && !/(?:mhz|ghz)/i.test(m[2])) {
      return item('intel', ['Core 2 Duo', 'Core 2 Quad', 'Pentium', 'Celeron'].find((p) => p.toLowerCase() === m[1].toLowerCase()), m[2].trim(), '');
    }
    m = t.match(/^Ryzen\s*([3579])\s*(\d{3,5})?\s*(X3D|XT|X|G|GE|U|H|HS)?$/i);
    if (m) {
      const suffix = (m[3] || '').toUpperCase(), known = ['X', 'X3D', 'G'].includes(suffix);
      return item('amd', 'Ryzen ' + m[1], (m[2] || '') + (m[2] && suffix && !known ? suffix : ''), m[2] && known ? suffix : '');
    }
    m = t.match(/^(Athlon|Phenom|FX)\s*-?\s*(.*)$/i);
    if (m && /^[A-Za-z0-9 .+-]*$/.test(m[2]) && !/(?:mhz|ghz)/i.test(m[2])) return item('amd', ({ athlon: 'Athlon', phenom: 'Phenom', fx: 'FX' })[m[1].toLowerCase()], m[2].trim(), '');
    return { ...newHwItem('cpu', 'text'), text: brandText(part) };
  }
  function parseGpuPart(part) {
    const text = () => ({ ...newHwItem('gpu', 'text'), text: brandText(part) });
    if (/\b(?:intel|arc)\b/i.test(part)) return text();
    const t = part.replace(/\b(?:NVIDIA|AMD|ATI|GeForce|Radeon)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    const mem = '(?:\\s+(\\d+(?:[.,]\\d+)?)\\s?GB)?(?:\\s+VRAM)?$';
    let m = t.match(new RegExp('^(RTX|GTX|GTS|GT)\\s*(\\d{3,4})\\s*(Ti\\s*SUPER|SUPER|Ti)?' + mem, 'i'));
    if (m) return { ...newHwItem('gpu', 'geforce'), pre: m[1].toUpperCase(), num: m[2], sfx: m[3] ? (/ti\s*super/i.test(m[3]) ? 'Ti SUPER' : m[3].toLowerCase() === 'ti' ? 'Ti' : 'SUPER') : '', gb: (m[4] || '').replace(',', '.') };
    m = t.match(new RegExp('^(RX|HD|R9|R7|R5)\\s*(\\d{3,4})\\s*(XTX|XT|GRE)?' + mem, 'i'));
    if (m) return { ...newHwItem('gpu', 'radeon'), pre: m[1].toUpperCase(), num: m[2], sfx: (m[3] || '').toUpperCase(), gb: (m[4] || '').replace(',', '.') };
    m = t.match(new RegExp('^Vega\\s*(\\d{2,3})?' + mem, 'i'));
    if (m) return { ...newHwItem('gpu', 'radeon'), pre: 'Vega', num: m[1] || '', gb: (m[2] || '').replace(',', '.') };
    return text();
  }
  const parseCpuItems = (text) => split(text).slice(0, HW_MAX).map(parseCpuPart);
  const parseGpuItems = (text) => split(text).slice(0, HW_MAX).map(parseGpuPart);

  /* Logo in einen Platz einpassen. across = Platz quer zum Rücken, along = Platz entlang des Rückens (beide in mm), a = Seitenverhältnis (Breite / Höhe).
     rot: 'auto' | 'no' | 'yes'. Automatisch wird gedreht, wenn das Logo aufrecht kaum lesbar wäre (Höhe unter minH). maxW begrenzt die Breite (mm, 0 = keine Grenze).
     -> { rotated, w, h } mit w und h in mm als Größe des Bildes (vor dem Drehen), das Ergebnis passt immer in across × along. */
  function fitLogo(a, rot, across, along, maxW, minH) {
    a = a > 0.05 ? a : 1;
    across = Math.max(1, across); along = Math.max(1, along);
    const upright = () => { let w = Math.min(across, along * a); if (maxW > 0) w = Math.min(w, maxW); return { rotated: false, w, h: w / a }; };
    const rotated = () => { let l = Math.min(along, across * a); if (maxW > 0) l = Math.min(l, maxW); return { rotated: true, w: l, h: l / a }; };
    if (rot === 'yes') return rotated();
    if (rot === 'no') return upright();
    const up = upright();
    return up.h >= (minH || 4) ? up : rotated();
  }

  /* Zeilen für die Systemanforderungen. Leere Zeilen entfallen. values ist eine Liste von Alternativen. */
  function buildSpecs(state) {
    const L = LABELS[state.lang] || LABELS.de;
    const rows = [
      ['os', L.os, [osString(state.os, state.lang)]],
      ['cpu', L.cpu, cpuList(state.cpu)],
      ['ram', L.ram, [formatStorage(state.ram, L.ramUnit)]],
      ['gpu', L.gpu, gpuList(state.gpu)],
      ['dx', L.dx, [(state.dx || '').trim()]],
      ['space', L.space, [formatStorage(state.space, L.spaceUnit)]],
      ['other', L.other, [(state.other || '').trim()]],
    ];
    return rows.map(([key, label, values]) => ({ key, label, values: values.filter(Boolean) })).filter((r) => r.values.length);
  }

  /* "Sonstiges" in einzelne Sätze zerlegen (Zeilenumbruch oder Satzende), Punkt am Ende entfällt */
  const otherLines = (t) => String(t || '').split(/\n+/).flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9])/)).map((x) => x.trim().replace(/(?<!\.)\.$/, '').trim()).filter(Boolean);

  /* Tabelle für die Rückseite: je Zeile die Mindest- und (wenn eingeschaltet) die empfohlenen Angaben.
     Gleiche Angaben stehen nur einmal da (shared), das Betriebssystem gilt immer für beide. */
  function buildSpecTable(state) {
    const L = LABELS[state.lang] || LABELS.de;
    const pick = (s) => ({
      cpu: cpuList(s.cpu), ram: [formatStorage(s.ram, L.ramUnit)], gpu: gpuList(s.gpu),
      dx: [(s.dx || '').trim()], space: [formatStorage(s.space, L.spaceUnit)], other: [(s.other || '').trim()],
    });
    const m = pick(state), r = state.rec && state.rec.on ? pick(state.rec) : null;
    const rows = [];
    const os = osString(state.os, state.lang);
    if (os) rows.push({ key: 'os', label: L.os, short: L.short.os || L.os, min: [os], rec: [], shared: true });
    for (const [key, label] of [['cpu', L.cpu], ['ram', L.ram], ['gpu', L.gpu], ['dx', L.dx], ['space', L.space], ['other', L.other]]) {
      if (key === 'other') {                     // Sonstiges: Satz für Satz. Gleiche Sätze stehen einmal in der Mitte, nur abweichende in ihrer Spalte.
        const ml = otherLines(state.other), rl = r ? otherLines(state.rec.other) : [];
        if (!ml.length && !rl.length) continue;
        const low = (x) => x.toLowerCase(), common = ml.filter((l) => rl.some((q) => low(q) === low(l)));
        const onlyMin = ml.filter((l) => !common.includes(l)), onlyRec = rl.filter((l) => !common.some((c) => low(c) === low(l)));
        const short = L.short.other || label;
        if (!r) { rows.push({ key, label, short, min: ml, rec: [], shared: true }); continue; }
        let first = true;
        for (const line of common) { rows.push({ key, label: first ? label : '', short: first ? short : '', min: [line], rec: [], shared: true, cont: !first }); first = false; }
        if (onlyMin.length || onlyRec.length) rows.push({ key, label: first ? label : '', short: first ? short : '', min: onlyMin, rec: onlyRec, shared: false, cont: !first });
        continue;
      }
      const min = m[key].filter(Boolean), rec = r ? r[key].filter(Boolean) : [];
      if (!min.length && !rec.length) continue;
      const same = !!rec.length && JSON.stringify(min) === JSON.stringify(rec);
      rows.push({ key, label, short: L.short[key] || label, min, rec: same ? [] : rec, shared: same || !r });
    }
    return { rows, dual: rows.some((x) => !x.shared), labels: { min: L.min, rec: L.rec } };
  }

  /* --- Standardwerte und Speichern --- */
  function defaultState() {
    return {
      caseType: 'normal', disc: 'dvd', lang: 'de', theme: 'glass', gogText: true, gogSpine: 'match', pcColor: 'auto', provider: 'gog', title: '', copyright: '© 2026 Fanpresse. All rights reserved. Trademarks belong to their respective owners.',
      custom: { back: '130', spine: '14', front: '129', h: '183' },
      usk: '0', uskOpacity: '100', frontFit: 'stretch', frontZoom: '100', frontX: '50', frontY: '50', uskBack: true, spineLogo: 'fixed', cropMarks: true, foldLines: true, breakHw: false,
      back: defaultBack(),
      features: ['single_player'],
      os: { win: ['10', '11'], mac: false, linux: false, x64: true },
      cpu: { items: [] },
      gpu: { items: [] },
      ram: '4', space: '10', dx: '', other: '',
      frontPubPlate: 'none', spinePubPlate: 'white',          /* Unterlage hinter dem Publisher-Logo: 'none' | 'white' | 'black' */
      spinePC: true, spineTitle: 'center', spineArt: 'color', spineBgX: '50', spineBgDim: '25', spineUseLogo: true, spinePub: true,
      spineLogoRot: 'auto', spineLogoSide: '1.5', spineLogoTop: '3', spineLogoBottom: '3',      /* Rückenlogo: Drehung, Abstände (mm) zu den Seiten und zu Kopf und Fuß */
      spinePubRot: 'auto', spinePubSide: '1.2', spinePubWidth: '',                             /* Publisher am Fuß: Drehung, Abstand zur Seite (mm), eigene Breite (mm, leer = automatisch) */
      publisher: '', developer: '',         /* z. B. von Steam übernommen, Vorgabe für die Suche nach dem Publisher-Logo */
      /* Empfohlene Anforderungen (optional, zusätzlich zu den Mindestanforderungen oben) */
      rec: {
        on: false,
        cpu: { items: [] },
        gpu: { items: [] },
        ram: '8', space: '10', dx: '', other: '',
      },
    };
  }

  /* Gespeicherte Einstellungen mit den Standardwerten zusammenführen (alte oder kaputte Daten stören nicht). */
  function mergeState(saved) {
    const base = defaultState();
    if (!saved || typeof saved !== 'object') return base;
    const out = {};
    for (const key of Object.keys(base)) {
      const b = base[key], s = saved[key];
      if (s === undefined || s === null) out[key] = b;
      else if (Array.isArray(b)) out[key] = Array.isArray(s) ? s.filter((x) => typeof x === 'string') : b;
      else if (typeof b === 'object') out[key] = mergeObject(b, s);
      else out[key] = typeof s === typeof b ? s : b;
    }
    out.back = normalizeBack(saved.back);
    out.cpu = normalizeHw(saved.cpu, 'cpu'); out.gpu = normalizeHw(saved.gpu, 'gpu');
    out.rec.cpu = normalizeHw(saved.rec && saved.rec.cpu, 'cpu'); out.rec.gpu = normalizeHw(saved.rec && saved.rec.gpu, 'gpu');
    if (!CASES[out.caseType] && out.caseType !== 'custom') out.caseType = 'normal';
    if (!DISCS[out.disc]) out.disc = 'dvd';
    if (!LABELS[out.lang]) out.lang = 'de';
    if (!PROVIDERS[out.provider]) out.provider = 'gog';
    /* GOG: Weiß, Warmweiß, Dunkel, Dunkel mit Violett-Hauch oder durchscheinend. Alle früheren Stile (Leiste in GOG-Farben, dunkel mit Lila, Modern ...) werden zu "Dunkel" */
    out.theme = out.provider === 'gog' ? (['white', 'warm', 'glasswhite', 'glass', 'dark', 'violet'].includes(out.theme) ? out.theme : 'dark') : 'bar';
    if (!['match', 'dark', 'light'].includes(out.gogSpine)) out.gogSpine = 'match';
    if (!['auto', 'white', 'black'].includes(out.pcColor)) out.pcColor = 'auto';
    out.gogText = out.gogText !== false;
    for (const k of ['frontPubPlate', 'spinePubPlate']) if (!['none', 'white', 'black'].includes(out[k])) out[k] = k === 'spinePubPlate' ? 'white' : 'none';
    if (out.spineTitle !== 'top') out.spineTitle = 'center';
    if (!['image', 'own'].includes(out.spineArt)) out.spineArt = 'color';
    for (const k of ['spineLogoRot', 'spinePubRot']) if (!['auto', 'no', 'yes'].includes(out[k])) out[k] = 'auto';
    out.uskOpacity = String(Math.min(100, Math.max(0, Number.isNaN(parseInt(out.uskOpacity, 10)) ? 100 : parseInt(out.uskOpacity, 10))));     // Deckkraft des Hintergrunds hinter der Raute (0 = nur die Raute)
    if (!['stretch', 'crop'].includes(out.frontFit)) out.frontFit = 'stretch';
    out.frontZoom = String(Math.min(300, Math.max(100, parseInt(out.frontZoom, 10) || 100)));
    for (const k of ['frontX', 'frontY']) { const n = parseInt(out[k], 10); out[k] = String(Math.min(100, Math.max(0, Number.isNaN(n) ? 50 : n))); }
    if (out.usk !== 'none' && !USK_VALUES.includes(out.usk)) out.usk = '0';
    return out;
  }
  function mergeObject(base, saved) {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return base;
    const out = {};
    for (const key of Object.keys(base)) {
      const b = base[key], s = saved[key];
      if (s === undefined || s === null) out[key] = b;
      else if (Array.isArray(b)) out[key] = Array.isArray(s) ? s.filter((x) => typeof x === 'string') : b;
      else if (typeof b === 'object') out[key] = mergeObject(b, s);
      else out[key] = typeof s === typeof b ? s : b;
    }
    return out;
  }

  /* --- Übernahme aus einem Rezept (menu.json) --- */
  /* Spiele eines Rezepts, nach index sortiert */
  function recipeGames(menu) {
    const games = menu && Array.isArray(menu.games) ? menu.games.slice() : [];
    return games.filter((g) => g && typeof g.name === 'string')
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map((g) => ({ index: g.index || 0, name: g.name, provider: PROVIDERS[g.provider] ? g.provider : 'gog', cover: g.cover || '', description: g.description || '', sizeMB: Number(g.estimatedSizeMB) || 0 }));
  }
  /* Was aus einem Spiel übernommen wird: Titel, Anbieter, geschätzte Größe als Speicherplatz */
  function statePatchFromGame(game) {
    const patch = { title: game.name, provider: game.provider };
    if (game.sizeMB > 0) patch.space = String(Math.round((game.sizeMB / 1024) * 10) / 10);
    return patch;
  }

  /* Bildgröße für den Druck: längste Kante höchstens max Pixel (300 dpi bei 183 mm sind etwa 2160 Pixel). */
  function fitSize(w, h, max) {
    const k = Math.min(1, max / Math.max(w, h));
    return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
  }

  const api = { SHAPE_KINDS, MAX_PTS, defaultPts, BACK_LIMITS, BACK_FONTS, BACK_EDGES, BACK_TEMPLATES, MAX_ITEMS, MAX_TEMPLATES, MAX_FONTS, MAX_NAME, isCustomFont, templateFromItems, normalizeTemplate, instantiateTemplate, isImageKey, normalizeItem, normalizeBack, defaultBack, designHeight, newItem, backTemplate, BAR_HEIGHT, GOG_BAR_HEIGHT, barHeight, frontTop, fitLogo, styleOptions, HW, HW_MAX, newHwItem, hwText, normalizeHw, parseCpuItems, parseGpuItems, brandText, PAPER, CASES, BACK, CUSTOM_LIMITS, MAX_W, PRESETS, caseDims, THEMES, PROVIDERS, recipeGames, statePatchFromGame, LABELS, FEATURE_ORDER, WIN_VERSIONS, USK_VALUES, DISCS, imageSpecs, formatStorage, osString, cpuList, gpuList, buildSpecs, buildSpecTable, defaultState, mergeState, fitSize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CoverCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
