/* Sprache der Benutzeroberfläche.
   Grundsprache ist Deutsch: Die Texte stehen im HTML und im Code auf Deutsch. Eine weitere Sprache ist ein Sprachpaket (siehe lang-en.js), das den
   deutschen Text auf den Text der Zielsprache abbildet. Beim Wechsel ersetzt diese Datei alle Texte der Oberfläche (auch später entstehende, z. B. in
   Dialogen, per MutationObserver) und merkt sich den deutschen Originaltext, um zurückzuwechseln.
   Nicht übersetzt wird das Cover selbst (#sheet): Dessen Texte richten sich nach der Sprache der Beschriftung (Feld "Sprache der Beschriftung").
   Ein Sprachpaket hat drei Teile:
     dict:  genauer deutscher Text  ->  Text der Zielsprache (ganze Texte, Beschriftungen, Meldungen)
     parts: Bruchstücke, die in zusammengesetzten Meldungen vorkommen ("... hat mit Fehler " + Nummer + " geantwortet.")
     rules: [RegExp, Ersatz] für Texte mit Zahlen oder Namen
   Neue Sprache: Datei lang-xx.js mit I18n.register('xx', { name, flag, dict, parts, rules }) anlegen und in index.html einbinden. */
(function (root) {
  'use strict';
  const STORE = 'discmenu-cover-ui-lang';
  const packs = { de: { name: 'Deutsch', flag: 'assets/images/flags/de.svg', dict: {}, parts: [], rules: [] } };
  const listeners = [];
  let lang = 'de';

  function register(code, pack) {
    packs[code] = {
      name: pack.name || code, flag: pack.flag || '', dict: pack.dict || {},
      parts: Object.entries(pack.parts || {}).sort((a, b) => b[0].length - a[0].length), rules: pack.rules || [],
      /* ganze Sätze des Wörterbuchs, die auch mitten in einer zusammengesetzten Meldung vorkommen können (z. B. "Das Projekt ... : <Fehlertext>") */
      phrases: Object.entries(pack.dict || {}).filter(([k]) => k.length >= 20).sort((a, b) => b[0].length - a[0].length),
    };
  }
  const norm = (s) => s.replace(/\s+/g, ' ').trim();

  /* Deutschen Text in die Sprache `code` (Standard: aktuelle) übersetzen. Unbekanntes bleibt unverändert. */
  function tr(text, code) {
    code = code || lang;
    const p = packs[code];
    if (code === 'de' || !p || typeof text !== 'string') return text;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
    if (!m[2]) return text;
    const hit = p.dict[norm(m[2])];
    if (hit !== undefined) return m[1] + hit + m[3];
    let out = text;
    for (const [a, b] of p.parts) if (out.includes(a)) out = out.split(a).join(b);
    for (const [a, b] of p.phrases) if (out.includes(a)) out = out.split(a).join(b);
    for (const [re, rep] of p.rules) out = out.replace(re, rep);
    return out;
  }

  if (typeof document === 'undefined') { const api = { register, tr, packs, setLang(c) { lang = c; }, lang: () => lang }; if (typeof module !== 'undefined') module.exports = api; return; }

  /* ---- Oberfläche umschalten ---- */
  const ATTRS = ['placeholder', 'title', 'aria-label', 'label'];
  const textRec = new WeakMap();      // Textknoten -> { src: deutscher Text, out: aktuell gesetzter Text }
  const attrRec = new WeakMap();      // Element -> { attr: { src, out } }
  /* Das Cover (#sheet) wird nicht übersetzt, nur seine Platzhalter (.ph, "Frontcover" usw.) */
  const skip = (node) => { const el = node.nodeType === 1 ? node : node.parentElement; return !el || !!el.closest('[data-notr], script, style, textarea') || (!!el.closest('#sheet') && !el.closest('.ph')); };

  function doText(n) {
    if (skip(n)) return;
    const cur = n.data;
    let r = textRec.get(n);
    if (!r || cur !== r.out) r = { src: cur, out: cur };
    const out = lang === 'de' ? r.src : tr(r.src);
    r.out = out; textRec.set(n, r);
    if (n.data !== out) n.data = out;
  }
  const skipAttrs = (el) => !!el.closest('[data-notr], script, style') || (!!el.closest('#sheet') && !el.closest('.ph'));        // Eingabefelder (textarea) tragen Platzhalter, die übersetzt werden
  function doAttrs(el) {
    if (skipAttrs(el)) return;
    let rec = attrRec.get(el); if (!rec) { rec = {}; attrRec.set(el, rec); }
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a); let r = rec[a];
      if (!r || cur !== r.out) r = { src: cur, out: cur };
      const out = lang === 'de' ? r.src : tr(r.src);
      r.out = out; rec[a] = r;
      if (cur !== out) el.setAttribute(a, out);
    }
  }
  function walk(node) {
    if (node.nodeType === 3) { doText(node); return; }
    if (node.nodeType !== 1 || node.matches('[data-notr], script, style')) return;
    doAttrs(node);
    if (node.tagName === 'TEXTAREA') return;                  // Inhalt eines Eingabefeldes ist Eingabe, kein Text der Oberfläche                       // (innerhalb des Covers ohne Wirkung: skip() lässt dort nur .ph durch)
    for (let c = node.firstChild; c; c = c.nextSibling) walk(c);
  }

  let obs = null;
  function start() {
    if (obs || !root.MutationObserver) return;
    obs = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') doAttrs(m.target);
        else m.addedNodes.forEach(walk);
      }
    });
    obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  /* confirm, alert und prompt zeigen Meldungen, die nicht im Dokument stehen */
  for (const fn of ['alert', 'confirm', 'prompt']) {
    const orig = root[fn];
    if (typeof orig === 'function') root[fn] = function (msg, ...rest) { return orig.call(root, tr(String(msg)), ...rest); };
  }

  function codes() { return Object.keys(packs); }
  function renderMenu() {
    const menu = document.getElementById('langMenu');
    if (!menu) return;
    const cur = packs[lang], sum = menu.querySelector('summary'), pop = menu.querySelector('.pop');
    const flag = (p) => (p.flag ? '<img class="flag" alt="" src="' + p.flag + '">' : '');
    sum.innerHTML = flag(cur) + '<span>' + cur.name + '</span>';
    pop.innerHTML = '';
    for (const c of codes()) {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.lang = c; b.innerHTML = flag(packs[c]) + '<span>' + packs[c].name + '</span>';
      if (c === lang) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', () => { setLang(c); menu.open = false; });
      pop.appendChild(b);
    }
  }

  function setLang(code, remember) {
    if (!packs[code]) code = 'de';
    lang = code;
    if (remember !== false) { try { localStorage.setItem(STORE, code); } catch (e) { /* ohne Speicher gilt die Wahl nur bis zum Neuladen */ } }
    document.documentElement.lang = code;
    walk(document.documentElement);
    renderMenu();
    listeners.forEach((f) => f(code));
  }

  function init() {
    let code = 'de';
    try { code = localStorage.getItem(STORE) || 'de'; } catch (e) { /* egal */ }
    const q = new URLSearchParams(root.location ? root.location.search : '').get('lang');
    if (q && packs[q]) code = q;
    start();
    setLang(packs[code] ? code : 'de', false);
  }

  const api = { register, tr, setLang, lang: () => lang, codes, onChange: (f) => listeners.push(f), init, packs };
  root.I18n = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
