/* Rückseite: Elemente der Gestaltungsfläche zeichnen (Bilder und Texte mit Position und Größe in mm).
   Wird für die Vorschau auf dem Cover und für den Editor (Pop-up) benutzt. Rein darstellend: Daten kommen aus state.back.items (siehe core.js). */
(function (root) {
  'use strict';

  /* Schriftarten: Systemschriften (je nach Rechner etwas anders aussehend). Lato liegt als Datei bei, die anderen kommen vom Betriebssystem. */
  const FONTS = {
    sans: { label: 'Normal (Lato)', css: 'Lato, "Segoe UI", Arial, sans-serif' },
    serif: { label: 'Serif (Georgia)', css: 'Georgia, "Times New Roman", Times, serif' },
    condensed: { label: 'Schmal', css: '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif' },
    display: { label: 'Plakat (Impact)', css: 'Impact, Haettenschweiler, "Arial Black", "Franklin Gothic Heavy", sans-serif' },
    mono: { label: 'Schreibmaschine', css: '"Courier New", Courier, monospace' },
    hand: { label: 'Handschrift', css: '"Segoe Script", "Brush Script MT", "Bradley Hand", cursive' },
  };
  const EDGES = { none: 'Ohne', round: 'Abgerundet', border: 'Rahmen', feather: 'Weicher Rand (ausgeblendet)', torn: 'Ausgerissen (Papier)' };

  const mm = (n) => (Math.round(n * 100) / 100) + 'mm';

  /* Zufallszahlen mit festem Startwert: Der ausgerissene Rand sieht bei jedem Zeichnen gleich aus */
  function rng(seed) { let a = seed >>> 0; return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* Ausgerissener Rand: Polygon in mm, die Kanten springen unregelmäßig bis amp nach innen */
  function tornPolygon(w, h, seed, amp) {
    const r = rng(hash(seed)), step = 1.1, a = Math.max(0.4, amp), pts = [];
    const jag = () => r() * a * (r() < 0.12 ? 1.6 : 1);
    for (let x = 0; x < w; x += step) pts.push([x, jag()]);
    for (let y = 0; y < h; y += step) pts.push([w - jag(), y]);
    for (let x = w; x > 0; x -= step) pts.push([x, h - jag()]);
    for (let y = h; y > 0; y -= step) pts.push([jag(), y]);
    return 'polygon(' + pts.map(([x, y]) => mm(x) + ' ' + mm(y)).join(',') + ')';
  }

  /* Rand und Übergang eines Elements (Rahmen, Rundung, weicher Rand, ausgerissen) */
  function applyEdge(node, it) {
    const s = node.style, size = it.edgeSize;
    if (it.edge === 'round') s.borderRadius = mm(size > 0 ? size : 2);
    else if (it.edge === 'border') { s.boxSizing = 'border-box'; s.border = mm(size > 0 ? size : 0.6) + ' solid ' + (it.borderColor || '#ffffff'); }
    else if (it.edge === 'feather') {
      const f = mm(Math.min(size > 0 ? size : 4, it.w / 2, it.h / 2));
      const g = (dir) => 'linear-gradient(' + dir + ', transparent 0, #000 ' + f + ', #000 calc(100% - ' + f + '), transparent 100%)';
      const mask = g('to right') + ', ' + g('to bottom');
      s.webkitMaskImage = mask; s.maskImage = mask; s.webkitMaskComposite = 'source-in'; s.maskComposite = 'intersect';
    } else if (it.edge === 'torn') s.clipPath = tornPolygon(it.w, it.h, it.id, size > 0 ? size : 1.6);
  }

  /* Text eines Elements: eigener Text oder (bei Verknüpfung) Titel bzw. Beschreibung des Spiels */
  function textOf(it, state) {
    if (it.bind === 'title') return String((state && state.title) || '').trim();
    if (it.bind === 'description') return String((state && state.back && state.back.description) || '').trim();
    return it.text || '';
  }

  /* Form: Punkte in Prozent des Rahmens (null = Ellipse). Der Stern wird aus Zackenzahl und Tiefe berechnet. */
  function shapePoints(it) {
    if (it.shape === 'ellipse') return null;
    if (it.shape === 'star') {
      const n = it.sides, r = it.inner / 100, pts = [];
      for (let i = 0; i < 2 * n; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rad = i % 2 ? r : 1; pts.push([Math.round((50 + 50 * rad * Math.cos(a)) * 10) / 10, Math.round((50 + 50 * rad * Math.sin(a)) * 10) / 10]); }
      return pts;
    }
    return it.pts;
  }
  const clipOf = (it) => { const p = shapePoints(it); return p ? 'polygon(' + p.map((q) => q[0] + '% ' + q[1] + '%').join(',') + ')' : 'ellipse(50% 50% at 50% 50%)'; };
  /* Linie um die Form als SVG in Millimetern (gleichmäßig dick, auch bei breiten oder schmalen Formen) */
  const round2 = (v) => Math.round(v * 100) / 100;
  function outlineSvg(it, cls) {
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), p = shapePoints(it);
    svg.setAttribute('class', cls); svg.setAttribute('viewBox', '0 0 ' + it.w + ' ' + it.h); svg.setAttribute('preserveAspectRatio', 'none');
    let g;
    if (p) { g = document.createElementNS(NS, 'polygon'); g.setAttribute('points', p.map((q) => round2(q[0] * it.w / 100) + ',' + round2(q[1] * it.h / 100)).join(' ')); } else {
      g = document.createElementNS(NS, 'ellipse'); g.setAttribute('cx', String(it.w / 2)); g.setAttribute('cy', String(it.h / 2)); g.setAttribute('rx', String(it.w / 2)); g.setAttribute('ry', String(it.h / 2));
    }
    g.setAttribute('fill', 'none'); g.setAttribute('stroke-linejoin', 'round'); svg.append(g);
    return { svg, g };
  }
  /* Bild im Rahmen: füllen mit Zoom und Ausschnitt (Anteile), sonst einpassen */
  function paintImage(layer, it, img) {
    const st = layer.style;
    st.backgroundImage = 'url("' + img.url + '")'; st.backgroundRepeat = 'no-repeat';
    if (it.fit === 'cover' && img.w > 0 && img.h > 0) {
      const k = Math.max(it.w / img.w, it.h / img.h) * (it.zoom || 100) / 100, sw = img.w * k, sh = img.h * k;
      st.backgroundSize = mm(sw) + ' ' + mm(sh); st.backgroundPosition = mm((it.w - sw) * it.posX / 100) + ' ' + mm((it.h - sh) * it.posY / 100);
    } else {
      st.backgroundSize = it.fit === 'contain' ? 'contain' : it.fit === 'stretch' ? '100% 100%' : 'cover';
      st.backgroundPosition = it.fit === 'cover' ? it.posX + '% ' + it.posY + '%' : 'center';
    }
  }

  /* env: { images: { schlüssel: { url, w, h } }, state, editor: Wahr im Editor (leere Elemente sind sichtbar) } */
  function buildNode(it, env) {
    const node = document.createElement('div');
    node.className = 'bi bi-' + it.type; node.dataset.id = it.id;
    const s = node.style;
    s.left = mm(it.x); s.top = mm(it.y); s.width = mm(it.w); s.height = mm(it.h);
    if (it.opacity < 100) s.opacity = String(it.opacity / 100);
    if (it.rot) s.transform = 'rotate(' + it.rot + 'deg)';
    if (it.type === 'shape') {
      const img = it.useImg && env.images && env.images[it.img];
      const inner = document.createElement('div'); inner.className = 'bi-in'; inner.style.clipPath = clipOf(it);
      if (it.useImg) {
        if (img) {
          if (env.editor && env.selId === it.id) { const dim = document.createElement('div'); dim.className = 'bi-dim'; paintImage(dim, it, img); node.append(dim); }
          paintImage(inner, it, img);
        } else if (env.editor) { inner.style.backgroundColor = '#cfd4df'; } else node.hidden = true;
      } else inner.style.backgroundColor = it.color;
      node.append(inner);
      if (it.strokeW > 0) { const o = outlineSvg(it, 'bi-rand'); o.g.setAttribute('stroke', it.borderColor); o.g.setAttribute('stroke-width', String(it.strokeW * 2)); o.svg.style.clipPath = clipOf(it); node.append(o.svg); }
      if (env.editor) node.append(outlineSvg(it, env.selId === it.id ? 'bi-out bi-out-sel' : 'bi-out').svg);   // Umriss nur im Editor
      return node;
    }
    if (it.type === 'image') {
      const img = env.images && env.images[it.img];
      const inner = document.createElement('div'); inner.className = 'bi-in';
      if (img) paintImage(inner, it, img);
      else if (env.editor) { node.classList.add('empty'); inner.textContent = 'Bild'; }
      else node.hidden = true;
      node.append(inner);
    } else {
      const p = document.createElement('p'); p.className = 'bi-p';
      const txt = textOf(it, env.state);
      p.textContent = txt;
      if (!txt && !it.bg) { if (env.editor) { node.classList.add('empty'); p.textContent = it.bind === 'title' ? 'Spieltitel' : it.bind === 'description' ? 'Beschreibung' : 'Text'; } else node.hidden = true; }
      const f = FONTS[it.font] || FONTS.sans;
      Object.assign(p.style, { fontFamily: f.css, fontSize: it.size + 'pt', fontWeight: it.weight, fontStyle: it.italic ? 'italic' : 'normal', textTransform: it.caps ? 'uppercase' : 'none',
        letterSpacing: it.spacing / 100 + 'em', lineHeight: String(it.line), textAlign: it.align, color: it.color });
      node.dataset.fit = it.fit ? '1' : ''; node.dataset.size = String(it.size);
      s.display = 'flex'; s.alignItems = it.valign === 'middle' ? 'center' : it.valign === 'bottom' ? 'flex-end' : 'flex-start';
      s.padding = mm(it.pad); s.boxSizing = 'border-box';
      if (it.bg) { const h = it.bg, a = it.bgOpacity / 100; s.backgroundColor = 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + a + ')'; }
      node.append(p);
    }
    applyEdge(node, it);
    return node;
  }

  /* Alle Elemente zeichnen (von unten nach oben). Danach passen fitTexts() die Schrift an den Platz an. */
  function renderInto(container, items, env) {
    container.replaceChildren(...items.map((it) => buildNode(it, env)));
    fitTexts(container);
  }
  /* Text so groß wie eingestellt, aber so klein wie nötig, damit nichts abgeschnitten wird (nicht unter 4 pt) */
  function fitTexts(container) {
    container.querySelectorAll('.bi-text[data-fit="1"]').forEach((node) => {
      const p = node.firstChild; if (!p || node.hidden) return;
      let pt = Number(node.dataset.size) || 8;
      p.style.fontSize = pt + 'pt';
      const over = () => { const cs = getComputedStyle(node), padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom); return p.scrollHeight > node.clientHeight - padY + 1; };
      while (pt > 4 && over()) { pt -= 0.2; p.style.fontSize = pt.toFixed(1) + 'pt'; }
    });
  }

  const api = { shapePoints, clipOf, paintImage, FONTS, EDGES, tornPolygon, applyEdge, buildNode, renderInto, fitTexts, textOf, hash, rng };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BackDesign = api;
})(typeof window !== 'undefined' ? window : globalThis);
