/* Gemeinsames Projekt (Menü und Hülle) ohne Oberfläche: Projektdatei packen und lesen, Felder verknüpfen, Spielordner auswerten.
   Ohne Zugriff auf die Seite, damit sich alles mit Node testen lässt.

   Projektdatei (ZIP) mit EINER Beschreibung, recipe.json:
     {
       "format": "discmenu-recipe", "version": 1,
       "gameIndex": 0,            welches Spiel des Menüs die Hülle zeigt
       "game":  { … },            gemeinsame Angaben dieses Spiels (stehen nur hier): title, provider, description, publisher,
                                  developer, sizeMB, cover (Bild für Menü und Frontcover)
       "menu":  { … },            Menü wie in der menu.json (schemaVersion, title, games …), beim Spiel gameIndex ohne die gemeinsamen Angaben
       "cover": { "state": { … }, "images": { key: { file, name } }, "fonts": { id: { file, name } } }   Hülle ohne die gemeinsamen Angaben
     }
     assets/…   alle Bilder und Sounds (jede Datei einmal), fonts/…   eigene Schriften der Hülle
   Ältere Dateien werden erkannt: Projektdatei mit menu.json + cover.json (Vorschau-Version), Rezept-ZIP (menu.json + assets),
   einzelne menu.json und Hüllen-ZIP (cover.json Version 1). Der Builder liest recipe.json (src/Shared/recipe.go, MenuFromRecipe). */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const M = () => (node ? require('./menu-core.js') : root.CORE);
  const F = () => (node ? require('./files.js') : root.CoverFiles);
  const enc = (o) => new TextEncoder().encode(JSON.stringify(o, null, 2) + '\n');
  const FORMAT = 'discmenu-recipe', VERSION = 1;

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

  /* ---------- Gemeinsame Angaben ---------- */
  const SHARED_GAME = { title: 'name', provider: 'provider', description: 'description', sizeMB: 'estimatedSizeMB', cover: 'cover' };   // recipe.game -> Spiel der menu.json
  /* Hüllen-Zustand ohne die gemeinsamen Angaben */
  function stripShared(coverState) {
    const s = JSON.parse(JSON.stringify(coverState || {}));
    for (const k of ['title', 'provider', 'space', 'publisher', 'developer']) delete s[k];
    if (s.back) delete s.back.description;
    return s;
  }
  /* menu.json aus einer recipe.json (gemeinsame Angaben ins Spiel gameIndex). Gleiche Regel wie MenuFromRecipe im Builder. */
  function menuJsonFromRecipe(r) {
    if (!r || r.format !== FORMAT) throw new Error('Das ist keine recipe.json von DiscMenu.');
    if (Number(r.version) > VERSION) throw new Error('Die recipe.json stammt aus einer neueren Version.');
    const menu = JSON.parse(JSON.stringify(r.menu || {})), games = Array.isArray(menu.games) ? menu.games : [];
    const g = games[normLink({ game: r.gameIndex }).game] || games[0], sh = r.game || {};
    if (g) for (const [k, m] of Object.entries(SHARED_GAME)) if (sh[k] !== undefined && sh[k] !== '' && sh[k] !== null) g[m] = sh[k];
    return menu;
  }

  /* Projektdatei schreiben.
     p: { menuState, menuAssets: Map(id -> {data, ext}), coverState, coverImages: {key: {data, type, name}}, fonts: [...], link } */
  function build(p) {
    const link = normLink(p.link), cs = p.coverState || {};
    const { menu, files } = M().buildMenu(p.menuState, p.menuAssets || new Map());
    const games = menu.games || [], g = games[link.game] || games[0];
    const game = { title: cs.title || '', provider: cs.provider || 'gog', description: (cs.back && cs.back.description) || '', publisher: cs.publisher || '', developer: cs.developer || '' };
    const out = files.slice(), imgs = Object.assign({}, p.coverImages || {});
    if (g) {
      game.title = g.name || game.title; game.provider = g.provider || game.provider; game.description = g.description || game.description;
      if (g.estimatedSizeMB) game.sizeMB = g.estimatedSizeMB;
      const own = g.cover;
      for (const k of ['name', 'provider', 'description', 'estimatedSizeMB', 'cover']) delete g[k];
      if (imgs.front) {
        // Frontcover in Druckauflösung ist auch das Cover im Menü: eine Datei statt zwei
        const ext = F().EXT_BY_TYPE[imgs.front.type] || 'png', path = 'assets/cover.' + ext;
        game.cover = path; out.push({ name: path, data: imgs.front.data });
        const stillUsed = own && JSON.stringify(menu).includes('"' + own + '"');
        if (own && !stillUsed) { const i = out.findIndex((f) => f.name === own); if (i >= 0) out.splice(i, 1); }
      } else if (own) game.cover = own;
    }
    delete imgs.front;
    const coverFiles = F().projectEntries(stripShared(cs), imgs, p.fonts || [], { dir: 'assets/', prefix: 'huelle-' });
    const cj = JSON.parse(new TextDecoder().decode(coverFiles[0].data));
    const recipe = { format: FORMAT, version: VERSION, gameIndex: link.game, game, menu, cover: { state: cj.state, images: cj.images } };
    if (cj.fonts) recipe.cover.fonts = cj.fonts;
    return { recipe, files: out.concat(coverFiles.slice(1)) };
  }
  function pack(p) { const b = build(p); return F().buildZip([{ name: 'recipe.json', data: enc(b.recipe) }, ...b.files]); }

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
  const withShared = (state, sh) => {
    const s = { ...(state || {}) };
    if (sh.title !== undefined) s.title = String(sh.title || '');
    if (sh.provider) s.provider = sh.provider;
    if (sh.publisher !== undefined) s.publisher = String(sh.publisher || '');
    if (sh.developer !== undefined) s.developer = String(sh.developer || '');
    if (Number(sh.sizeMB) > 0) s.space = gb(sh.sizeMB);
    s.back = { ...(s.back || {}), description: String(sh.description || '') };
    return s;
  };

  /* recipe.json mit den Dateien der ZIP lesen */
  function readRecipe(r, files) {
    const menuJson = menuJsonFromRecipe(r), sh = r.game || {}, link = normLink({ game: r.gameIndex });
    const menu = menuFrom(menuJson, files);
    const c = r.cover || {}, images = Object.assign({}, c.images || {});
    if (sh.cover) images.front = { file: sh.cover, name: String(sh.cover).split('/').pop() };
    const pseudo = { type: 'discmenu-cover', version: 2, state: withShared(c.state, sh), images };
    if (c.fonts) pseudo.fonts = c.fonts;
    const cover = F().unpackProject([{ name: 'cover.json', data: enc(pseudo) }, ...files.filter((f) => f.name !== 'cover.json')]);
    return { kind: 'project', menu, cover, link };
  }

  /* Projektdatei oder ältere Datei lesen. files: Ergebnis des ZIP-Lesers ([{name, data}]).
     Ergebnis: { kind, menu: {state, assets, counter, notes}, cover: {state, images, missing, fonts} | null, link }
     kind: 'project' (recipe.json) · 'combined' (menu.json + cover.json, Vorschau-Version) · 'menu' (altes Rezept) · 'cover' (alte Hüllen-Datei) */
  function read(files) {
    const rj = files.find((f) => f.name === 'recipe.json');
    if (rj) return readRecipe(parseJson(rj.data, 'recipe.json'), files);
    const mj = files.find((f) => f.name === 'menu.json'), cj = files.find((f) => f.name === 'cover.json');
    if (!mj && !cj) throw new Error('In der ZIP fehlt die recipe.json. Das ist keine Projektdatei.');
    const menu = mj ? menuFrom(parseJson(mj.data, 'menu.json'), files) : null;
    let cover = null;
    if (cj) {
      cover = F().unpackProject(files);
      if (menu) { const lp = coverPatchFromMenu(menu.state, cover.link); cover.state = { ...cover.state, ...lp, back: { ...((cover.state && cover.state.back) || {}), ...(lp.back || {}) } }; }     // verknüpfte Felder aus dem Menü
    }
    if (menu) return { kind: cover ? 'combined' : 'menu', menu, cover, link: normLink(cover && cover.link) };
    // alte Hüllen-ZIP: ein Spiel aus Titel, Anbieter, Beschreibung und Speicherplatz
    const st = M().newState(), g = st.games[0];
    Object.assign(g, menuPatchFromCover(cover.state));
    st.title = g.name;
    return { kind: 'cover', menu: { state: st, assets: new Map(), counter: 1, notes: [] }, cover, link: defaultLink() };
  }
  /* einzelne JSON-Datei: recipe.json (ohne Bilder) oder menu.json */
  function readJson(text) {
    const j = parseJson(text, 'JSON-Datei');
    if (j && j.format === FORMAT) return readRecipe(j, []);
    return { kind: 'menu', menu: menuFrom(j, []), cover: null, link: defaultLink() };
  }

  /* ---------- Spielordner einlesen ----------
     entries: [{ path: 'base_game/setup_x.exe', dir: false }, …] relativ zum gewählten Ordner (der Wurzel der Disc).
     Ergebnis: Vorschläge [{ path, kind: 'installer'|'dlcs'|'patches'|'extras'|'skip', name, group, open }], die man vor dem Übernehmen ändern kann.
     Regeln nach dem Namen des obersten Ordners (Groß-/Kleinschreibung egal), sonst nach dem Dateityp. */
  const RULES = [
    ['installer', /^(base[ _-]?game|game|hauptspiel|spiel|setup|install(er)?)$/i],
    ['dlcs', /dlc|erweiterung|expansion|add[ _-]?on|story/i],
    ['patches', /patch|fix|update|overhaul|mod|tweak|grafik|sprach/i],
    ['extras', /extra|bonus|goodies|soundtrack|ost|music|musik|artbook|art|manual|handbuch|wallpaper|video/i],
  ];
  const prettify = (s) => String(s || '').replace(/\.[^.]+$/, '').replace(/^setup_/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  /* Lesbarer Name aus einem Datei- oder Ordnernamen: ohne Endung, ohne Klammern, ohne "setup"/"installer", ohne Versionsnummern und Datum am Ende,
     ohne den Spielnamen vorn (z. B. "deus_ex_soundtrack" bei "Deus Ex: …" -> "Soundtrack", "DXCU.3.4.1.2024-11-29.039" -> "DXCU"). */
  function cleanName(raw, game) {
    let s = String(raw || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/\([^)]*\)/g, ' ');
    let toks = s.split(/[\s._]+/).filter(Boolean).filter((t) => !/^(setup|installer|install)$/i.test(t));
    const isVer = (t) => /^v?\d+([.-]\d+)*[a-z]{0,3}$/i.test(t) || /^\d{4}-\d{1,2}-\d{1,2}$/.test(t);
    while (toks.length > 1 && isVer(toks[toks.length - 1])) toks.pop();
    const gw = String(game || '').toLowerCase().split(/[^a-z0-9äöüß]+/).filter(Boolean);
    let i = 0; while (i < gw.length && i < toks.length - 1 && toks[i].toLowerCase() === gw[i]) i++;
    if (i >= 2 || (i === 1 && gw.length === 1)) toks = toks.slice(i);
    const n = toks.join(' ').trim();
    return n ? n[0].toUpperCase() + n.slice(1) : prettify(raw);
  }
  /* Gruppe eines Extras nach Name und Inhalt: Anleitungen, Musik, Artwork, Videos, sonst Zusätze (z. B. Zeitung, Erfolgsliste) */
  const EXTRA_GROUPS = [
    ['Anleitungen', /manual|handbuch|anleitung|reference|referenz|guide|quick.?start|readme|walkthrough|l(ö|oe)sung|keyboard|tastatur|card|karte/i, null],
    ['Musik', /soundtrack|\bost\b|music|musik|audio|score/i, /\.(mp3|flac|ogg|wav|m4a|aac)$/i],
    ['Artwork', /wallpaper|artbook|\bart\b|artwork|concept|poster|screenshot|avatar|icon/i, /\.(jpe?g|png|webp|gif|bmp)$/i],
    ['Videos', /video|trailer|making.?of|intro|cinematic/i, /\.(mp4|mkv|avi|webm|mov|wmv)$/i],
  ];
  const EXTRA_ORDER = ['Anleitungen', 'Musik', 'Artwork', 'Videos', 'Zusätze'];
  function extraGroup(path, list) {
    const name = path.split('/').pop();
    for (const [g, re] of EXTRA_GROUPS) if (re.test(name.replace(/[_.-]+/g, ' '))) return g;
    const inner = list.filter((x) => !x.dir && x.path.startsWith(path + '/')).map((x) => x.path);
    for (const [g, , ext] of EXTRA_GROUPS) if (ext && (ext.test(name) || (inner.length && inner.filter((f) => ext.test(f)).length * 2 >= inner.length))) return g;
    return 'Zusätze';
  }
  const groupOf = (folder) => prettify(folder).replace(/\b(und|and)\b/gi, '&');      // z. B. Patches_und_Fixes -> Patches & Fixes
  function planFromFolder(entries, opts) {
    const game = (opts && opts.game) || '';
    const list = (entries || []).map((e) => ({ path: String(e.path).replace(/\\/g, '/').replace(/^\/+/, ''), dir: !!e.dir })).filter((e) => e.path);
    const top = (p) => p.split('/')[0], depth = (p) => p.split('/').length;
    const kindOfTop = (t) => { for (const [k, re] of RULES) if (re.test(t)) return k; return null; };
    const out = [], isExe = (p) => /\.exe$/i.test(p);
    const seenInstaller = { done: false };
    for (const t of [...new Set(list.map((e) => top(e.path)))]) {
      const inside = list.filter((e) => top(e.path) === t && e.path !== t), kind = kindOfTop(t);
      if (!inside.length) {                                     // Datei direkt in der Wurzel
        const e = list.find((x) => x.path === t);
        if (e && !e.dir && isExe(t)) out.push({ path: t, kind: seenInstaller.done ? 'skip' : 'installer', name: seenInstaller.done ? cleanName(t, game) : game || cleanName(t, ''), group: '', open: false });
        if (e && !e.dir && isExe(t)) seenInstaller.done = true;
        continue;
      }
      if (kind === 'extras') {                                   // Extras: jede Datei oder jeder Unterordner direkt darin wird geöffnet
        const ex = inside.filter((x) => depth(x.path) === 2).map((e) => ({ path: e.path, kind: 'extras', name: cleanName(e.path.split('/')[1], game), group: extraGroup(e.path, list), open: true }));
        ex.sort((a, b) => EXTRA_ORDER.indexOf(a.group) - EXTRA_ORDER.indexOf(b.group));          // nach Gruppen geordnet: Anleitungen zuerst, Zusätze zuletzt
        out.push(...ex);
        continue;
      }
      // Installer-Ordner: Programme (.exe), die Teile eines Installers (.bin) gehören zur .exe und erscheinen nicht
      const exes = inside.filter((x) => !x.dir && isExe(x.path)).sort((a, b) => depth(a.path) - depth(b.path) || a.path.localeCompare(b.path));
      exes.forEach((e) => {
        let k = kind || 'skip';
        if (k === 'installer') { k = seenInstaller.done ? 'patches' : 'installer'; seenInstaller.done = true; }
        const parts = e.path.split('/'), sub = parts.length > 2 ? parts[parts.length - 2] : '';
        // Installer des Spiels: der Name ist der des Spiels (ohne Spielnamen fehlt sonst das Wichtigste), sonst eigener Unterordner = Name, oberster Ordner = Gruppe
        const nm = k === 'installer' ? game || cleanName(parts[parts.length - 1], '') : cleanName(sub || parts[parts.length - 1], game);
        out.push({ path: e.path, kind: k, name: nm, group: k === 'patches' ? groupOf(t) : '', open: false });      // eigener Unterordner = Name, oberster Ordner = Gruppe
      });
    }
    return out;
  }
  const KINDS = ['installer', 'dlcs', 'patches', 'extras', 'skip'];

  const api = { FORMAT, VERSION, pack, build, read, readJson, readRecipe, menuJsonFromRecipe, stripShared, coverPatchFromMenu, menuPatchFromCover, coverDiff, menuDiff, linkedGame, normLink, defaultLink, planFromFolder, cleanName, KINDS };
  if (node) module.exports = api;
  else root.DiscProject = api;
})(typeof window !== 'undefined' ? window : globalThis);
