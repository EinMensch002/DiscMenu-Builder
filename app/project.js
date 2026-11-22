/* Gemeinsames Projekt (Menü und Hülle) ohne Oberfläche: Projektdatei packen und lesen, Felder verknüpfen.
   Ohne Zugriff auf die Seite, damit sich alles mit Node testen lässt.

   Projektdatei (ZIP), Version 2:
     menu.json            Rezept des Menüs (der Builder liest nur diese Datei und die Dateien, auf die sie verweist)
     assets/…             Bilder und Sounds des Menüs
     assets/huelle-….     Bilder der Hülle (Druckauflösung)
     cover.json           Hülle: type "discmenu-cover", version 2, link (welches Spiel), state ohne die verknüpften Felder
     fonts/…              eigene Schriften, die Texte der Hülle benutzen
   Verknüpft (nur einmal gespeichert, im Spiel link.game des Menüs): Name = Titel der Hülle, Anbieter, Beschreibung,
   geschätzte Größe = Speicherplatz.
   Ältere Dateien werden erkannt: Rezept-ZIP (menu.json + assets), einzelne menu.json, Cover-ZIP (cover.json Version 1). */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const M = () => (node ? require('./menu-core.js') : root.CORE);
  const F = () => (node ? require('./files.js') : root.CoverFiles);
  const C = () => (node ? require('./core.js') : root.CoverCore);
  const enc = (o) => new TextEncoder().encode(JSON.stringify(o, null, 2) + '\n');

  const defaultLink = () => ({ game: 0 });
  function normLink(l) { const g = Number(l && l.game); return { game: Number.isInteger(g) && g >= 0 && g < 100 ? g : 0 }; }
  /* Spiel, mit dem die Hülle verknüpft ist (fehlt es, das erste) */
  function linkedGame(menuState, link) { const gs = (menuState && menuState.games) || []; return gs[normLink(link).game] || gs[0] || null; }

  const gb = (mb) => String(Math.round((Number(mb) / 1024) * 10) / 10);
  /* Werte der Hülle aus dem Spiel. Leere Größe ändert den Speicherplatz nicht. */
  function coverPatchFromMenu(menuState, link) {
    const g = linkedGame(menuState, link); if (!g) return {};
    const p = { title: g.name || '', provider: g.provider || 'gog', back: { description: g.description || '' } };
    if (Number(g.estimatedSizeMB) > 0) p.space = gb(g.estimatedSizeMB);
    return p;
  }
  /* Werte des Spiels aus der Hülle */
  function menuPatchFromCover(coverState) {
    const s = coverState || {}, p = { name: String(s.title || ''), provider: s.provider || 'gog', description: String((s.back && s.back.description) || '') };
    if (Number(s.space) > 0) p.estimatedSizeMB = String(Math.round(Number(s.space) * 1024));
    return p;
  }
  /* Unterschiede zwischen Spiel und Hülle (leer = schon gleich) */
  function coverDiff(menuState, coverState, link) {
    const want = coverPatchFromMenu(menuState, link), s = coverState || {}, out = {};
    for (const k of ['title', 'provider', 'space']) if (k in want && String(want[k]) !== String(s[k] == null ? '' : s[k])) out[k] = want[k];
    if (want.back && want.back.description !== String((s.back && s.back.description) || '')) out.back = { description: want.back.description };
    return out;
  }
  function menuDiff(menuState, coverState, link) {
    const g = linkedGame(menuState, link); if (!g) return {};
    const want = menuPatchFromCover(coverState), out = {};
    for (const k of Object.keys(want)) {
      if (k === 'estimatedSizeMB' && Number(g.estimatedSizeMB) > 0 && gb(g.estimatedSizeMB) === String(coverState.space)) continue;     // gleiche Größe, nur gerundet
      if (String(want[k]) !== String(g[k] == null ? '' : g[k])) out[k] = want[k];
    }
    return out;
  }
  /* Hüllen-Zustand ohne die verknüpften Felder (stehen im Menü) */
  function stripLinked(coverState) {
    const s = JSON.parse(JSON.stringify(coverState || {}));
    delete s.title; delete s.provider;
    if (s.back) delete s.back.description;
    return s;
  }

  /* Projektdatei schreiben.
     p: { menuState, menuAssets: Map(id -> {data, ext}), coverState, coverImages: {key: {data, type, name}}, fonts: [...], link } */
  function pack(p) {
    const { menu, files } = M().buildMenu(p.menuState, p.menuAssets || new Map());
    const cover = F().projectEntries(stripLinked(p.coverState), p.coverImages || {}, p.fonts || [], { dir: 'assets/', prefix: 'huelle-', version: 2, extra: { link: normLink(p.link) } });
    return F().buildZip([{ name: 'menu.json', data: enc(menu) }, ...files, ...cover]);
  }

  /* Menü aus einer menu.json und den Dateien der ZIP */
  function menuFrom(json, files) {
    const byPath = new Map((files || []).map((x) => [x.name, x.data])), ids = new Map(), assets = new Map(); let counter = 1;
    const getAsset = (p) => {
      p = p.replace(/\\/g, '/'); if (ids.has(p)) return ids.get(p);
      const d = byPath.get(p); if (!d) return null;
      const id = 'a' + (counter++); assets.set(id, { data: d, ext: (p.split('.').pop() || '').toLowerCase() }); ids.set(p, id); return id;
    };
    const r = M().parseMenu(json, getAsset);
    return { state: r.state, assets, counter, notes: r.notes };
  }
  const parseJson = (data, what) => { try { return JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data)); } catch (e) { throw new Error('Die ' + what + ' ist beschädigt.'); } };

  /* Projektdatei, Rezept oder Cover-ZIP lesen. files: Ergebnis des ZIP-Lesers ([{name, data}]).
     Ergebnis: { kind: 'project' | 'recipe' | 'cover', menu: {state, assets, counter, notes}, cover: {state, images, missing, fonts} | null, link } */
  function read(files) {
    const mj = files.find((f) => f.name === 'menu.json'), cj = files.find((f) => f.name === 'cover.json');
    if (!mj && !cj) throw new Error('In der ZIP fehlen menu.json und cover.json. Das ist keine Projektdatei.');
    const menu = mj ? menuFrom(parseJson(mj.data, 'menu.json'), files) : null;
    let cover = null;
    if (cj) {
      cover = F().unpackProject(files);
      if (menu) { const lp = coverPatchFromMenu(menu.state, cover.link); cover.state = { ...cover.state, ...lp, back: { ...((cover.state && cover.state.back) || {}), ...(lp.back || {}) } }; }     // verknüpfte Felder aus dem Menü
    }
    if (menu) return { kind: cover ? 'project' : 'recipe', menu, cover, link: normLink(cover && cover.link) };
    // alte Cover-ZIP: ein Spiel aus Titel, Anbieter, Beschreibung und Speicherplatz
    const st = M().newState(), g = st.games[0];
    Object.assign(g, menuPatchFromCover(cover.state));
    st.title = g.name;
    return { kind: 'cover', menu: { state: st, assets: new Map(), counter: 1, notes: [] }, cover, link: defaultLink() };
  }
  /* einzelne menu.json */
  function readMenuJson(text) {
    return { kind: 'recipe', menu: menuFrom(parseJson(text, 'menu.json'), []), cover: null, link: defaultLink() };
  }

  const api = { pack, read, readMenuJson, coverPatchFromMenu, menuPatchFromCover, coverDiff, menuDiff, stripLinked, linkedGame, normLink, defaultLink };
  if (node) module.exports = api;
  else root.DiscProject = api;
})(typeof window !== 'undefined' ? window : globalThis);
