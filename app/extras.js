/* Dialoge und Menüs der oberen Leiste: Daten übernehmen (Steam, GOG), das gemeinsame Projekt von Menü und Hülle (speichern, öffnen, im Browser sichern),
   Einstellungen (SteamGridDB-Schlüssel, Proxy, Sicherung in Datei) und die Bildsuche bei SteamGridDB. */
(function () {
  'use strict';
  const C = window.CoverCore, O = window.CoverOnline, Z = window.CoverZip, F = window.CoverFiles, App = window.CoverApp;
  /* Suchen nur außerhalb des Menü-Bereichs (#viewMenu): Beide Teile liegen auf einer Seite und nutzen teils gleiche Klassen (z. B. .drop). */
  const ours = (e) => !e.closest('#viewMenu');
  const $ = (s, r = document) => (r === document ? [...r.querySelectorAll(s)].find(ours) || null : r.querySelector(s));
  const REPO = 'https://github.com/EinMensch002/DiscMenu-Builder';
  const DOCS = REPO + '/blob/main/docs/steamgriddb.md';
  const LINKS = {
    sgdb: 'https://www.steamgriddb.com/', brandfetch: 'https://developers.brandfetch.com/', sgdbKey: 'https://www.steamgriddb.com/profile/preferences/api', cf: 'https://dash.cloudflare.com/',
    worker: REPO + '/blob/main/tools/cors-proxy/worker.js', setup: DOCS + '#einrichten-steamgriddb', proxy: DOCS + '#proxy-einrichten-cloudflare-worker',
    secure: DOCS + '#proxy-auf-die-eigene-seite-beschränken-empfohlen', cors: DOCS + '#proxy-cors', backup: DOCS + '#einstellungen-in-einer-datei-sichern',
  };

  /* ---------- kleine Hilfen ---------- */
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return e;
  }
  const ext = (text, href) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text);
  const dlg = $('#dlg');
  function openDlg(title, ...nodes) {
    $('#dlgTitle').textContent = title;
    $('#dlgBody').replaceChildren(...nodes.flat().filter(Boolean));
    if (!dlg.open) { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
  }
  function closeDlg() { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
  $('#dlgX').addEventListener('click', closeDlg);

  /* Meldungszeile; bei Netzwerkproblemen mit Link zur Anleitung */
  function say(el, text, isError) {
    el.textContent = text;
    el.className = 'dmsg' + (isError ? ' err' : '');
    if (isError && /CORS|Proxy/i.test(text)) el.append(' ', ext('Anleitung zum Proxy', LINKS.cors));
  }
  const wrapField = (label, input, hint) => h('label', { class: 'f' }, h('span', { class: 'lab' }, label), input, hint ? h('small', { class: 'dmsg' }, hint) : null);
  const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
  const UML = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };
  const slug = (t) => String(t || '').replace(/[äöüÄÖÜß]/g, (c) => UML[c.toLowerCase()]).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

  /* Datei speichern: mit Dateiauswahl, wo der Browser es kann (Chrome, Edge), sonst als normaler Download. null = abgebrochen. */
  function download(blob, name) {
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function saveFile(blob, name, description, mime, extension) {
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const hd = await window.showSaveFilePicker({ suggestedName: name, types: [{ description, accept: { [mime]: [extension] } }] });
        const w = await hd.createWritable(); await w.write(blob); await w.close();
        return hd.name;
      } catch (e) { if (e && e.name === 'AbortError') return null; /* sonst: normaler Download */ }
    }
    download(blob, name);
    return name;
  }

  /* ---------- Menüs der oberen Leiste ---------- */
  const menus = [...document.querySelectorAll('.menu')].filter(ours);
  const closeMenus = () => menus.forEach((m) => { m.open = false; });
  document.addEventListener('click', (e) => { menus.forEach((m) => { if (!m.contains(e.target)) m.open = false; }); });
  menus.forEach((m) => m.addEventListener('click', (e) => { if (e.target.closest('button')) closeMenus(); }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

  /* ---------- Einstellungen (gemeinsam mit dem Konfigurator) ---------- */
  function openSettings() {
    const key = h('input', { type: 'password', autocomplete: 'off', placeholder: 'API-Schlüssel' }); key.value = O.settings.key;
    const proxy = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: 'https://mein-proxy.example.workers.dev/?url={url}' }); proxy.value = O.settings.proxy;
    const bf = h('input', { type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: 'Client-ID von Brandfetch (optional)' }); bf.value = O.settings.brandfetch;
    const pw = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Passwort (optional)' });
    const msg = h('p', { class: 'dmsg' }), msg2 = h('p', { class: 'dmsg' }), tests = h('div', { class: 'dmsg' });
    const fin = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async () => {
      const f = fin.files[0]; fin.value = ''; if (!f) return;
      try {
        const b = await F.unpackBundle(await f.text(), pw.value);
        if (!b.creds && !(b.templates || []).length && !(b.fonts || []).length) throw new Error('Die Datei enthält nichts, was sich einlesen lässt.');
        openRestore(b);
      } catch (e) { say(msg2, e.message === 'PASSWORD_NEEDED' ? 'Die Datei ist verschlüsselt. Bitte das Passwort eintragen und die Datei erneut einlesen.' : e.message, true); }
    } });
    const fontList = h('div', { class: 'flist' });
    const fillFonts = () => {
      const list = App.fonts.list();
      fontList.replaceChildren(...(list.length ? list.map((f) => h('div', { class: 'frow' }, h('span', { style: 'font-family:"' + f.id + '", sans-serif', 'data-notr': '' }, f.name),
        h('button', { type: 'button', onclick: async () => { if (!confirm('Diese Schrift löschen? Texte, die sie benutzen, werden auf "Normal" gesetzt.')) return; await App.fonts.remove(f.id); fillFonts(); } }, 'Löschen'))) : [h('p', { class: 'dmsg' }, 'Noch keine eigenen Schriften.')]));
    };
    fillFonts();
    const saveCfg = () => {
      const p = proxy.value.trim();
      if (p && !p.includes('{url}')) { say(msg, 'Die Proxy-Adresse muss den Platzhalter {url} enthalten.', true); return false; }
      O.settings.save(key.value, p); O.settings.saveBrandfetch(bf.value); return true;
    };
    openDlg('Einstellungen für SteamGridDB und Steam',
      h('p', { class: 'dmsg' }, 'Den API-Schlüssel gibt es kostenlos im SteamGridDB-Profil. Er wird nur in diesem Browser gespeichert. Die Einstellungen gelten auch im Konfigurator (auf GitHub Pages teilen sich beide Seiten den Speicher), und eine dort gesicherte Datei lässt sich hier einlesen.'),
      h('p', { class: 'dmsg' }, ext('Schlüssel bei SteamGridDB erzeugen', LINKS.sgdbKey), ' · ', ext('SteamGridDB', LINKS.sgdb), ' · ', ext('Anleitung', LINKS.setup)),
      wrapField('API-Schlüssel (nur für SteamGridDB)', key),
      wrapField('Proxy-Adresse', proxy, 'Für die Suche bei Steam und SteamGridDB fast immer nötig, weil der Browser die Anfragen sonst blockiert (CORS). {url} wird durch die Zieladresse ersetzt.'),
      wrapField('Brandfetch-Client-ID (für Publisher-Logos)', bf, 'Zweite Quelle für Publisher-Logos, wenn Wikidata nichts findet (z. B. bei Indie-Studios). Die Client-ID ist kostenlos im Brandfetch-Entwicklerportal erhältlich und gehört nur in diesen Browser.'),
      h('p', { class: 'dmsg' }, ext('Brandfetch-Entwicklerportal', LINKS.brandfetch)),
      h('p', { class: 'dmsg' }, 'Proxy einrichten: ', ext('Anleitung', LINKS.proxy), ' · ', ext('Cloudflare öffnen', LINKS.cf), ' · ', ext('Worker-Code', LINKS.worker), ' · ', ext('Proxy absichern', LINKS.secure)),
      msg,
      h('div', { class: 'drow' },
        h('button', { type: 'button', class: 'pri', onclick: () => { if (saveCfg()) { say(msg, 'Einstellungen gespeichert.'); } } }, 'Speichern'),
        h('button', { type: 'button', onclick: async () => {
          if (!saveCfg()) return;
          say(msg, 'Teste die Verbindung ...'); tests.replaceChildren();
          const res = await O.testConnection();
          const bad = res.filter((r) => !r.ok);
          say(msg, bad.length ? bad.length + ' von ' + res.length + ' Verbindungen funktionieren nicht: ' + bad.map((r) => r.name).join(', ') + '. Details unten.' : 'Alle Verbindungen in Ordnung.', !!bad.length);
          tests.replaceChildren(...res.map((r) => h('div', { class: 'tline ' + (!r.ok ? 'bad' : r.warn ? 'warn' : 'good') }, h('b', { class: 'tmark' }, !r.ok ? '✗' : r.warn ? '⚠' : '✓'), ' ' + r.name + ': ' + r.text)));
        } }, 'Verbindung testen'),
        h('button', { type: 'button', onclick: () => { O.settings.save('', ''); O.settings.saveBrandfetch(''); key.value = ''; proxy.value = ''; bf.value = ''; say(msg, 'Gespeicherte Werte gelöscht.'); } }, 'Löschen')),
      tests,
      h('h3', {}, 'Eigene Schriften'),
      h('p', { class: 'dmsg' }, 'Schriften, die Du im Rückseiten-Editor hinzugefügt hast. Hier lassen sie sich wieder löschen.'),
      fontList,
      h('h3', {}, 'Einstellungen sichern'),
      h('p', { class: 'dmsg' }, 'Speichert Zugangsdaten, eigene Vorlagen und eigene Schriften in einer Datei, die sich später wieder einlesen lässt, z. B. nach dem Löschen der Browserdaten oder auf einem anderen Gerät. Beim Sichern wählst Du, was in die Datei kommt (eingebaute Vorlagen und Schriften sind nie dabei). Beim Einlesen wird nur verändert, was in der Datei steht. Eine Datei mit Zugangsdaten enthält deinen Schlüssel: nicht weitergeben und nicht ins Repository legen. ', ext('Mehr dazu', LINKS.backup)),
      wrapField('Passwort (optional)', pw, 'Wird zum Entschlüsseln beim Einlesen benutzt. Das Passwort zum Verschlüsseln wählst Du beim Sichern. Ein vergessenes Passwort lässt sich nicht wiederherstellen.'),
      h('div', { class: 'drow' },
        h('button', { type: 'button', onclick: () => openBackup({ key: key.value.trim(), proxy: proxy.value.trim(), brandfetch: bf.value.trim() }) }, 'In Datei sichern'),
        h('button', { type: 'button', onclick: () => fin.click() }, 'Aus Datei einlesen')),
      msg2, fin);
  }

  /* ---------- Sichern und Einlesen mit Auswahl ---------- */
  const tick = (checked, disabled) => h('input', { type: 'checkbox', checked: !!checked, disabled: !!disabled });
  /* Bereich mit Haken und (bei Listen) einem Haken je Eintrag. rows: [{ box, node }] */
  function section(title, count, rows, head) {
    head.addEventListener('change', () => rows.forEach((r) => { r.box.checked = head.checked; }));
    rows.forEach((r) => r.box.addEventListener('change', () => { head.checked = rows.some((x) => x.box.checked); }));
    return h('div', { class: 'bgrp' }, h('label', { class: 'chk' }, head, h('b', {}, title), count == null ? null : h('small', { class: 'dmsg' }, '(' + count + ')')), rows.map((r) => r.node));
  }
  const backTo = () => h('button', { type: 'button', onclick: () => openSettings() }, 'Zurück zu den Einstellungen');

  function openBackup(vals) {
    const tpls = App.templates.list(), fts = App.fonts.list(), hasCreds = !!(vals.key || vals.proxy || vals.brandfetch);
    const pwb = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Passwort (optional)' }), msg = h('p', { class: 'dmsg' });
    const names = [vals.key && 'API-Schlüssel', vals.proxy && 'Proxy-Adresse', vals.brandfetch && 'Brandfetch-Client-ID'].filter(Boolean);
    const hc = tick(hasCreds, !hasCreds), ht = tick(tpls.length, !tpls.length), hf = tick(fts.length, !fts.length);
    const rowsOf = (list, disabled) => list.map((x) => { const box = tick(!disabled, disabled); return { box, node: h('label', { class: 'chk brow' }, box, x.name) }; });
    const rt = rowsOf(tpls), rf = rowsOf(fts);
    const gc = section('Zugangsdaten', null, names.map((n) => ({ box: { checked: true, addEventListener() {} }, node: h('div', { class: 'dmsg brow' }, n) })), hc);
    if (!hasCreds) gc.append(h('div', { class: 'dmsg brow' }, 'Noch keine eingetragen.'));
    const gt = section('Eigene Vorlagen', tpls.length, rt, ht), gf = section('Eigene Schriften', fts.length, rf, hf);
    if (!tpls.length) gt.append(h('div', { class: 'dmsg brow' }, 'Noch keine eigenen Vorlagen.'));
    if (!fts.length) gf.append(h('div', { class: 'dmsg brow' }, 'Noch keine eigenen Schriften.'));
    openDlg('Einstellungen sichern',
      h('p', { class: 'dmsg' }, 'Wähle, was in die Datei kommt.'), gc, gt, gf,
      wrapField('Passwort (optional)', pwb, 'Verschlüsselt die ganze Datei. Empfohlen, wenn Zugangsdaten dabei sind. Ein vergessenes Passwort lässt sich nicht wiederherstellen.'),
      msg,
      h('div', { class: 'drow' },
        h('button', { type: 'button', class: 'pri', onclick: async () => {
          const parts = {};
          if (hc.checked && hasCreds) parts.creds = vals;
          if (ht.checked) parts.templates = tpls.filter((_, i) => rt[i].box.checked);
          if (hf.checked) parts.fonts = fts.filter((_, i) => rf[i].box.checked);
          if (!parts.creds && !(parts.templates || []).length && !(parts.fonts || []).length) { say(msg, 'Bitte mindestens einen Eintrag auswählen.', true); return; }
          try {
            const text = await F.packBundle(parts, pwb.value);
            const where = await saveFile(new Blob([text], { type: 'application/json' }), parts.creds ? 'discmenu-einstellungen.json' : 'discsleeve-vorlagen-schriften.json', 'Einstellungen (JSON)', 'application/json', '.json');
            if (where) say(msg, (pwb.value ? 'Verschlüsselte Datei "' : 'Datei "') + where + '" gespeichert.' + (pwb.value || !parts.creds ? '' : ' Sie ist nicht verschlüsselt, also gut aufbewahren.'));
          } catch (e) { say(msg, e.message, true); }
        } }, 'Sichern'),
        backTo()));
  }

  function openRestore(b) {
    const cur = { creds: { key: O.settings.key, proxy: O.settings.proxy, brandfetch: O.settings.brandfetch }, templates: App.templates.list(), fonts: App.fonts.list() };
    const plan = F.planImport(b, cur), msg = h('p', { class: 'dmsg' });
    const nodes = [h('p', { class: 'dmsg' }, 'Wähle, was übernommen wird. Alles, was nicht in der Datei steht, bleibt unverändert.')];
    if (b.skipped) nodes.push(h('p', { class: 'dmsg err' }, 'Einige Einträge in der Datei waren fehlerhaft und wurden übersprungen.'));
    const LAB = { key: 'API-Schlüssel', proxy: 'Proxy-Adresse', brandfetch: 'Brandfetch-Client-ID' };
    const hc = tick(true), credMode = h('select', {}, h('option', { value: 'skip' }, 'Vorhandene Werte behalten'), h('option', { value: 'replace' }, 'Vorhandene Werte überschreiben'));
    if (plan.creds) {
      const rows = plan.creds.map((e) => ({ box: { checked: true }, node: h('div', { class: 'dmsg brow' }, LAB[e.field] + ' ', h('b', {}, e.conflict ? 'hat schon einen anderen Wert' : 'neu')) }));
      const g = section('Zugangsdaten', null, [], hc); g.append(...rows.map((r) => r.node));
      if (plan.creds.some((e) => e.conflict)) g.append(h('div', { class: 'brow' }, credMode));
      nodes.push(g);
    }
    const lists = {};
    for (const [sec, title] of [['templates', 'Eigene Vorlagen'], ['fonts', 'Eigene Schriften']]) {
      if (!plan[sec]) continue;
      const head = tick(true);
      const rows = plan[sec].map((e) => {
        const box = tick(true), sel = e.conflict ? h('select', {}, h('option', { value: 'both' }, 'Beide behalten'), h('option', { value: 'replace' }, 'Ersetzen')) : null;
        return { box, sel, node: h('div', { class: 'brow' }, h('label', { class: 'chk' }, box, e.name), h('small', { class: 'dmsg' }, e.conflict ? 'gibt es schon' : 'neu'), sel) };
      });
      lists[sec] = { head, rows }; nodes.push(section(title, plan[sec].length, rows, head));
    }
    const apply = async () => {
      const choices = { sections: { creds: !plan.creds || hc.checked, templates: !lists.templates || lists.templates.head.checked, fonts: !lists.fonts || lists.fonts.head.checked }, creds: credMode.value };
      for (const sec of ['templates', 'fonts']) if (lists[sec]) choices[sec] = lists[sec].rows.map((r) => (!r.box.checked ? 'skip' : r.sel ? r.sel.value : 'add'));
      const res = F.applyImport(plan, cur, choices), out = [];
      if (res.creds && res.creds.proxy && !res.creds.proxy.includes('{url}')) { say(msg, 'Die Proxy-Adresse in der Datei enthält keinen Platzhalter {url}.', true); return; }   // vor jeder Änderung prüfen
      if (res.creds && Object.keys(res.creds).length) {
        O.settings.save(res.creds.key !== undefined ? res.creds.key : O.settings.key, res.creds.proxy !== undefined ? res.creds.proxy : O.settings.proxy);
        if (res.creds.brandfetch) O.settings.saveBrandfetch(res.creds.brandfetch);
        out.push(h('p', { class: 'dmsg' }, 'Zugangsdaten übernommen.'));
      }
      const errs = [];
      if (res.templates) {
        let n = 0;
        res.templates.replace.forEach((r) => { if (App.templates.replace(r.name, r.item)) n++; });
        res.templates.add.forEach((t) => { if (App.templates.add(t)) n++; else errs.push('Zu viele eigene Vorlagen. Bitte zuerst eine löschen.'); });
        if (n) out.push(h('p', { class: 'dmsg' }, 'Vorlagen übernommen: ' + n));
      }
      if (res.fonts) {
        let n = 0;
        for (const r of res.fonts.replace) { try { await App.fonts.replace(r.name, r.item); n++; } catch (e) { errs.push(e.message); } }
        for (const t of res.fonts.add) { try { await App.fonts.add(t); n++; } catch (e) { errs.push(e.message); } }
        if (n) out.push(h('p', { class: 'dmsg' }, 'Schriften übernommen: ' + n));
      }
      openDlg('Einlesen abgeschlossen', out.length ? out : h('p', { class: 'dmsg' }, 'Es wurde nichts übernommen.'), [...new Set(errs)].map((t) => h('p', { class: 'dmsg err' }, t)), h('div', { class: 'drow' }, backTo()));
    };
    openDlg('Aus Datei einlesen', nodes, msg, h('div', { class: 'drow' }, h('button', { type: 'button', class: 'pri', onclick: apply }, 'Übernehmen'), h('button', { type: 'button', onclick: () => openSettings() }, 'Abbrechen')));
  }

  /* ---------- Gemeinsames Projekt: Menü und Hülle ----------
     Ein Projekt umfasst das Menü (MenuApp, menu.js) und die Hülle (App). Kurz nach jeder Änderung wird es im Browser gesichert
     (IndexedDB "discmenu-projekte"), "Speichern" schreibt eine Projektdatei (ZIP, Format in project.js).
     Verknüpft und nur einmal gespeichert (im Spiel des Menüs): Name = Titel der Hülle, Anbieter, Beschreibung, Größe = Speicherplatz,
     Cover des Spiels = Frontcover. Was sich in einem Bereich ändert, steht sofort auch im anderen. */
  const Menu = window.MenuApp, P = window.DiscProject;
  let link = P.defaultLink(), menuChanges = 0;

  /* --- Verknüpfung --- */
  const NONE = {};                                    // "noch nicht abgeglichen"
  let syncing = false, lastFront = NONE, lastMenuCover = NONE;
  const game = () => P.linkedGame(Menu.state, link);
  const gameIndex = () => Math.min(link.game, Math.max(0, Menu.state.games.length - 1));
  const MIME_OF = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
  async function fromMenu() {
    if (syncing) return; syncing = true;
    try {
      const d = P.coverDiff(Menu.state, App.state, link);
      if (Object.keys(d).length) App.patch(d);
      const g = game(), id = g ? g.cover || null : null;
      if (id !== lastMenuCover) {
        lastMenuCover = id;
        const a = id && Menu.assets.get(id);
        if (a) await App.setImage('front', new File([a.data], 'cover.' + a.ext, { type: MIME_OF[a.ext] || 'image/png' }));
        else if (App.images.front) App.clearImage('front');
        lastFront = App.images.front;
      }
    } catch (e) { console.error(e); } finally { syncing = false; }
  }
  async function fromCover() {
    if (syncing) return; syncing = true;
    try {
      const d = P.menuDiff(Menu.state, App.state, link);
      if (Object.keys(d).length) Menu.patchGame(gameIndex(), d);
      const f = App.images.front;
      if (f !== lastFront) {
        lastFront = f;
        await Menu.setGameCover(gameIndex(), f ? new File([f.blob], f.name || 'cover.png', { type: f.type }) : null);
        const g = game(); lastMenuCover = g ? g.cover || null : null;
      }
    } catch (e) { console.error(e); } finally { syncing = false; }
  }
  /* Projekt einsetzen. r: { kind, menu: {state, assets, counter}, cover: {state, images} | null, link }.
     Bei einer Projektdatei passt alles schon zusammen. Bei einem Rezept wird die Hülle aus dem Spiel vorbereitet, bei einer älteren Hüllen-Datei das Spiel aus der Hülle. */
  async function applyProject(r) {
    syncing = true;
    try {
      Menu.load(r.menu);
      link = P.normLink(r.link);
      await App.restore(r.cover ? r.cover.state : C.defaultState(), r.cover ? r.cover.images : {});
    } finally { syncing = false; }
    if (r.kind === 'project' || r.kind === 'combined') { const g = game(); lastMenuCover = g ? g.cover || null : null; lastFront = App.images.front; }
    else { lastMenuCover = NONE; lastFront = NONE; if (r.kind === 'cover') await fromCover(); else await fromMenu(); }
  }

  /* --- Im Browser sichern --- */
  const IDB_NAME = 'discmenu-projekte', IDB_STORE = 'project';
  const idbOpenNamed = (name, store) => new Promise((res, rej) => {
    try { const r = indexedDB.open(name, 1); r.onupgradeneeded = () => r.result.createObjectStore(store); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('IndexedDB gesperrt')); }
    catch (e) { rej(e); }
  });
  const idbRunOn = async (name, store, mode, fn) => { const db = await idbOpenNamed(name, store); try { return await new Promise((res, rej) => { const tx = db.transaction(store, mode), q = fn(tx.objectStore(store)); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }); } finally { db.close(); } };
  const idbRun = (mode, fn) => idbRunOn(IDB_NAME, IDB_STORE, mode, fn);
  const auto = $('#autoInfo');
  let browserReady = false, autoTimer = 0, lastAuto = '';
  const clock = () => new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  async function saveToBrowser() {
    clearTimeout(autoTimer);
    try {
      const snap = App.snapshot();
      await idbRun('readwrite', (st) => st.put({ menu: { state: Menu.state, counter: Menu.counter, assets: [...Menu.usedAssets()] }, cover: { state: snap.state, images: snap.images }, link, savedAt: Date.now() }, 'current'));
      lastAuto = 'Im Browser gesichert (' + clock() + ')';
    } catch (e) { lastAuto = 'Bilder lassen sich in diesem Browser nicht sichern: ' + (e && e.message || e); }
    auto.textContent = lastAuto; auto.classList.toggle('dirty', /nicht sichern/.test(lastAuto));
  }
  const scheduleAuto = () => { if (!browserReady) return; clearTimeout(autoTimer); autoTimer = setTimeout(saveToBrowser, 800); };
  const blobImages = async (imgs) => { const out = {}; for (const [k, v] of Object.entries(imgs || {})) out[k] = { data: await v.blob.arrayBuffer(), type: v.type, name: v.name }; return out; };
  /* Beim Start: das zuletzt bearbeitete Projekt aus dem Browser-Speicher laden */
  async function loadFromBrowser() {
    const rec = await idbRun('readonly', (st) => st.get('current'));
    if (rec && rec.menu && rec.cover) {
      await applyProject({ kind: 'project', menu: { state: rec.menu.state, assets: new Map(rec.menu.assets || []), counter: rec.menu.counter }, cover: { state: rec.cover.state, images: await blobImages(rec.cover.images) }, link: rec.link });
      auto.textContent = 'Projekt aus dem Browser-Speicher geladen';
    }
  }

  /* --- Speichern, Speichern unter, Öffnen ---
     In Chrome und Edge merkt sich die Seite die Datei und "Speichern" überschreibt sie. In anderen Browsern lädt "Speichern" die Datei jeweils neu herunter. */
  const ZIP_TYPE = { description: 'Projekt (ZIP)', accept: { 'application/zip': ['.zip'] } };
  const OPEN_TYPES = [{ description: 'Projekt oder Rezept (ZIP oder menu.json)', accept: { 'application/zip': ['.zip'], 'application/json': ['.json'] } }];
  let projHandle = null, projName = '', savedAt = App.changes, savedMenu = 0, savedMsg = '';
  const info = $('#saveInfo');
  const dirtyNow = () => App.changes !== savedAt || menuChanges !== savedMenu;
  const markSaved = () => { savedAt = App.changes; savedMenu = menuChanges; };
  function showInfo() {
    info.classList.toggle('dirty', dirtyNow());
    info.textContent = dirtyNow() ? (projName ? projName + ' · ' : '') + '● ungespeichert' : (projName ? savedMsg + projName : '');
    info.title = projHandle ? 'Strg+S überschreibt diese Datei' : 'Strg+S speichert das Projekt als ZIP';
  }
  Menu.onChange(() => { menuChanges++; showInfo(); scheduleAuto(); fromMenu(); });
  App.onChange(() => { showInfo(); scheduleAuto(); fromCover(); });
  App.onReset(() => {
    Menu.reset(); link = P.defaultLink(); lastFront = App.images.front; lastMenuCover = null;
    clearTimeout(autoTimer); idbRun('readwrite', (st) => st.delete('current')).catch(() => {}); auto.textContent = '';
    projHandle = null; projName = ''; legacyKind = null; menuChanges = 0; markSaved(); showInfo();
  });
  window.addEventListener('beforeunload', (e) => { if (dirtyNow() && (App.hasImages || Menu.assets.size)) { e.preventDefault(); e.returnValue = ''; } });

  async function packProject() {
    const snap = App.snapshot(), images = {};
    for (const [k, v] of Object.entries(snap.images)) images[k] = { data: new Uint8Array(await v.blob.arrayBuffer()), type: v.type, name: v.name };
    const used = F.usedFontIds(snap.state), fonts = App.fonts.list().filter((f) => used.includes(f.id));     // nur eigene Schriften, die Texte wirklich benutzen
    const zip = P.pack({ menuState: Menu.state, menuAssets: Menu.usedAssets(), coverState: snap.state, coverImages: images, fonts, link });
    const g = game();
    return { blob: new Blob([zip], { type: 'application/zip' }), name: (slug(Menu.state.title || (g && g.name) || snap.state.title) || 'projekt') + '.zip', count: Object.keys(images).length };
  }
  /* Stammt das Projekt aus einer Datei im älteren Format, wird vor dem Speichern gefragt (bei Strg+S und bei "Speichern unter"). */
  let legacyKind = null;
  const OLD_FORMAT = {
    combined: 'Menü und Hülle in zwei Beschreibungen (menu.json und cover.json)',
    menu: 'Rezept nur mit dem Menü (menu.json)',
    cover: 'Hüllen-Datei der früheren DiscSleeve-Version (cover.json)',
  };
  function saveProject(asNew) {
    if (!legacyKind) return writeProject(asNew);
    openDlg('Neues Dateiformat',
      h('p', { class: 'dmsg' }, 'Dieses Projekt stammt aus einer Datei im älteren Format: ' + OLD_FORMAT[legacyKind] + '.'),
      h('p', { class: 'dmsg' }, 'Gespeichert wird im neuen Format: eine recipe.json mit den gemeinsamen Angaben (Titel, Anbieter, Publisher, Beschreibung, Größe, Cover) und je einem Bereich für Menü und Hülle, dazu die Ordner assets/ und fonts/. Der Builder liest die neue Datei, ältere Versionen dieser Seite können sie nicht mehr öffnen.'),
      h('div', { class: 'drow' },
        h('button', { type: 'button', class: 'pri', onclick: () => { closeDlg(); legacyKind = null; writeProject(asNew); } }, 'Im neuen Format speichern'),
        h('button', { type: 'button', onclick: closeDlg }, 'Abbrechen')));
  }
  async function writeProject(asNew) {
    const { blob, name } = await packProject();
    let hd = (!asNew && projHandle) || null, where = null;
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        if (hd && hd.requestPermission && (await hd.requestPermission({ mode: 'readwrite' })) !== 'granted') hd = null;
        if (!hd) hd = await window.showSaveFilePicker({ suggestedName: projName || name, types: [ZIP_TYPE] });
        const w = await hd.createWritable(); await w.write(blob); await w.close();
        projHandle = hd; where = hd.name; savedMsg = 'gespeichert: ';
      } catch (e) { if (e && e.name === 'AbortError') return; hd = null; /* sonst: normaler Download */ }
    }
    if (!where) { download(blob, name); where = name; projHandle = null; savedMsg = 'heruntergeladen: '; }
    projName = where; markSaved(); showInfo();
  }
  async function openProject() {
    if (typeof window.showOpenFilePicker === 'function') {
      try {
        const [hd] = await window.showOpenFilePicker({ types: OPEN_TYPES, multiple: false });
        return importProject(await hd.getFile(), hd);
      } catch (e) { if (e && e.name === 'AbortError') return; /* sonst: Dateiauswahl des Browsers */ }
    }
    projectInput.click();
  }
  const KIND_TEXT = {
    project: 'Menü, Hülle und alle Bilder wurden geladen.',
    combined: 'Menü, Hülle und alle Bilder wurden geladen. Die Datei hat noch das ältere Format (menu.json und cover.json) und wird beim Speichern umgestellt.',
    menu: 'Das Menü wurde geladen. Die Hülle wurde aus dem Spiel vorbereitet (Titel, Anbieter, Beschreibung, Größe, Cover).',
    cover: 'Die Hülle wurde geladen. Das Menü wurde aus der Hülle vorbereitet (ein Spiel mit Titel, Anbieter und Cover). Installer-Pfad und Weiteres im Bereich "Menü" ergänzen.',
  };
  async function importProject(file, hd) {
    try {
      const json = /\.json$/i.test(file.name);
      const r = json ? P.readJson(await file.text()) : P.read(await Z.read(new Uint8Array(await file.arrayBuffer())));
      if (dirtyNow() && !confirm('Das aktuelle Projekt hat ungespeicherte Änderungen und wird durch "' + file.name + '" ersetzt. Weiter?')) return;
      if (!dirtyNow() && !confirm('Das aktuelle Projekt wird durch "' + file.name + '" ersetzt. Weiter?')) return;
      const added = [], failed = [], map = {};
      for (const f of (r.cover && r.cover.fonts) || []) {          // eigene Schriften des Projekts: gleiche Datei schon da = benutzen, sonst hinzufügen
        const have = App.fonts.list(), same = have.find((x) => x.data === f.data);
        if (same) { if (same.id !== f.id) map[f.id] = same.id; continue; }
        try { const res = await App.fonts.add({ name: F.freeName(f.name, have.map((x) => x.name)), ext: f.ext, data: f.data }); map[f.id] = res.id; added.push(res.name); } catch (e) { failed.push(f.name); }
      }
      if (r.cover) F.remapFonts(r.cover.state, map);
      await applyProject(r);
      projHandle = (!json && hd) || null; projName = json ? '' : file.name; legacyKind = OLD_FORMAT[r.kind] ? r.kind : null;      // eine einzelne JSON-Datei wird nie mit einer ZIP überschrieben
      menuChanges++; markSaved(); savedMsg = 'geöffnet: '; showInfo();
      const missing = (r.cover && r.cover.missing) || [], notes = r.menu.notes || [];
      openDlg('Projekt geöffnet', h('p', { class: 'dmsg' }, KIND_TEXT[r.kind] + (missing.length ? ' Nicht gefunden: ' + missing.join(', ') + '.' : '') + (projHandle ? (legacyKind ? ' "Speichern" überschreibt diese Datei im neuen Format (vorher wird gefragt).' : ' "Speichern" überschreibt diese Datei.') : ' "Speichern" legt eine neue Projektdatei an.')),
        notes.length ? h('p', { class: 'dmsg' }, 'Hinweise: ' + notes.slice(0, 6).join(' · ')) : '',
        added.length ? h('p', { class: 'dmsg' }, added.length + ' eigene Schrift(en) wurden hinzugefügt: ' + added.join(', ')) : '',
        failed.length ? h('p', { class: 'dmsg err' }, failed.length + ' Schrift(en) konnten nicht hinzugefügt werden (zu viele eigene Schriften?): ' + failed.join(', ') + '. Texte damit erscheinen in "Normal".') : '',
        h('div', { class: 'drow' }, h('button', { type: 'button', onclick: closeDlg }, 'Schließen')));
    } catch (e) {
      openDlg('Projekt öffnen', h('p', { class: 'dmsg err' }, 'Das Projekt konnte nicht geladen werden: ' + (e.message || e)), h('div', { class: 'drow' }, h('button', { type: 'button', onclick: closeDlg }, 'Schließen')));
    }
  }
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(false); } });

  /* --- recipe.json bearbeiten ---
     Zeigt die Beschreibung des Projekts, wie sie gespeichert würde, ganz oder nur einen Bereich: Gemeinsam (game), Menü (menu), Hülle (cover).
     "Änderungen übernehmen" liest sie wie eine geöffnete Projektdatei zurück, Bilder und Schriften bleiben über ihre Pfade verbunden. */
  async function currentBuild() {
    const snap = App.snapshot(), images = {};
    for (const [k, v] of Object.entries(snap.images)) images[k] = { data: new Uint8Array(await v.blob.arrayBuffer()), type: v.type, name: v.name };
    const used = F.usedFontIds(snap.state), fonts = App.fonts.list().filter((f) => used.includes(f.id));
    return P.build({ menuState: Menu.state, menuAssets: Menu.usedAssets(), coverState: snap.state, coverImages: images, fonts, link });
  }
  const SECTIONS = [['all', 'Alles'], ['game', 'Gemeinsam'], ['menu', 'Menü'], ['cover', 'Hülle']];
  async function openRecipeEditor(start) {
    const b = await currentBuild(), recipe = b.recipe;
    let part = start || 'all';
    const ta = h('textarea', { class: 'code', spellcheck: 'false', rows: '22' });
    const msg = h('p', { class: 'dmsg' });
    const tabs = h('div', { class: 'drow seg' });
    const pick = (k) => {
      part = k; ta.value = JSON.stringify(k === 'all' ? recipe : recipe[k], null, 2) + '\n'; say(msg, '');
      tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.part === k));
    };
    tabs.append(...SECTIONS.map(([k, l]) => h('button', { type: 'button', 'data-part': k, onclick: () => pick(k) }, l)));
    const apply = async () => {
      let v; try { v = JSON.parse(ta.value); } catch (err) { say(msg, 'Kein gültiges JSON: ' + err.message, true); return; }
      const next = part === 'all' ? v : { ...recipe, [part]: v };
      try {
        const r = P.readRecipe(next, b.files);
        await applyProject(r); menuChanges++; showInfo(); scheduleAuto();
        closeDlg();
      } catch (err) { say(msg, err.message || String(err), true); }
    };
    openDlg('recipe.json bearbeiten',
      h('p', { class: 'dmsg' }, 'So wird das Projekt gespeichert. "Gemeinsam" gilt für Menü und Hülle (Titel, Anbieter, Publisher, Beschreibung, Größe, Cover), "Menü" und "Hülle" enthalten den Rest. Bilder bleiben über ihre Pfade (assets/…) verbunden, neue Dateien lassen sich nur in der Maske hinzufügen.'),
      tabs, ta, msg,
      h('div', { class: 'drow' }, h('button', { type: 'button', class: 'pri', onclick: apply }, 'Änderungen übernehmen'), h('button', { type: 'button', onclick: closeDlg }, 'Abbrechen')));
    pick(part);
  }
  (async () => {
    try { await loadFromBrowser(); } catch (e) { /* kein Speicher vorhanden oder gesperrt: dann eben ohne */ }
    menuChanges = 0; markSaved(); showInfo();                        // das Laden aus dem Browser zählt nicht als ungespeicherte Änderung der Datei
    browserReady = true;
  })();

  /* ---------- Anforderungen von Steam ---------- */
  function openSteam() {
    const input = h('input', { type: 'text', placeholder: 'Spieltitel, Steam-Adresse oder App-ID' }); input.value = App.state.title || '';
    const msg = h('p', { class: 'dmsg' }, 'Sucht im Steam-Shop und liest Systemanforderungen, Plattformen und Funktionen aus (englische Angaben). Du kannst auch die Adresse der Steam-Seite (store.steampowered.com/app/...) oder die App-ID einfügen, dann entfällt die Suche.');
    const list = h('div', { class: 'dlist' });
    const go = async () => {
      const t = input.value.trim(); if (!t) return;
      const ref = O.parseSteamRef(t);
      if (ref) { showDetails({ id: ref, name: 'Steam-App ' + ref }); return; }
      say(msg, 'Suche läuft ...'); list.replaceChildren();
      try {
        const res = (await O.steamSearch(t)).slice(0, 8);
        say(msg, res.length ? 'Spiel auswählen:' : 'Keine Treffer. Anderen Titel versuchen (am besten englisch und kürzer) oder die Steam-Adresse einfügen.');
        list.replaceChildren(...res.map((it) => h('button', { type: 'button', onclick: () => showDetails(it) }, it.name + '  (App ' + it.id + ')')));
      } catch (e) { say(msg, e.message, true); }
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    openDlg('Anforderungen von Steam', h('div', { class: 'drow' }, input, h('button', { type: 'button', class: 'pri', onclick: go }, 'Suchen')), msg, list,
      h('p', { class: 'dmsg' }, 'Funktioniert die Suche nicht, hilft ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); openSettings(); } }, '"Verbindung testen" in den Einstellungen'), '.'));
    if (input.value.trim() && O.settings.proxy) go();

    async function showDetails(item) {
      const m2 = h('p', { class: 'dmsg' }, 'Daten werden geladen ...');
      openDlg(item.name, m2);
      let details;
      try { details = await O.steamDetails(item.id); } catch (e) { say(m2, e.message, true); openDlg(item.name, m2, h('div', { class: 'drow' }, h('button', { type: 'button', onclick: openSteam }, '← Andere Suche'))); return; }
      const table = h('table', { class: 'shown' });
      const note = h('p', { class: 'dmsg' });
      let current = null;
      const have = App.snapshot().images;
      const coverChk = h('input', { type: 'checkbox', checked: !have.front });
      const logoChk = h('input', { type: 'checkbox', checked: !have.spineLogo });
      const CDN = 'https://cdn.akamai.steamstatic.com/steam/apps/' + encodeURIComponent(item.id) + '/';
      const firstBlob = async (names) => { let err; for (const n of names) { try { return await O.fetchBlob(CDN + n); } catch (e) { err = e; } } throw err; };
      const apply = async () => {
        App.patch(O.keepManualFeatures(current.patch, App.state.features));
        if (!coverChk.checked && !logoChk.checked) { closeDlg(); return; }
        ok.disabled = true; const problems = [];
        if (coverChk.checked) {
          say(note, 'Steam-Cover wird geladen ...');
          try { const blob = await firstBlob(['library_600x900_2x.jpg', 'library_600x900.jpg']); await App.setImage('front', new File([blob], 'steam-' + item.id + '.jpg', { type: blob.type || 'image/jpeg' })); }
          catch (e) { problems.push('das Cover (' + e.message + ')'); }
        }
        if (logoChk.checked) {
          say(note, 'Spiel-Logo wird geladen ...');
          try { const blob = await firstBlob(['logo.png', 'library_logo.png']); await App.setImage('spineLogo', new File([blob], 'steam-logo-' + item.id + '.png', { type: blob.type || 'image/png' })); }
          catch (e) { problems.push('das Spiel-Logo für den Rücken (Steam hat für dieses Spiel keins unter der bekannten Adresse oder es ist nicht ladbar; der Rücken zeigt dann den Titel. Alternativ per 🔎 bei SteamGridDB suchen)'); }
        }
        if (!problems.length) { closeDlg(); return; }
        say(note, 'Die Angaben sind übernommen, nicht geladen wurde ' + problems.join(' und ') + '. (Mit dem Proxy muss der Host cdn.akamai.steamstatic.com erlaubt sein.)', true);
        ok.disabled = false;
      };
      const ok = h('button', { type: 'button', class: 'pri', onclick: apply }, 'Übernehmen');
      const draw = () => {
        current = O.steamPatchBoth(details);
        const two = current.hasBoth;
        table.replaceChildren(h('tr', { class: 'head' }, h('th', {}, ''), h('th', {}, two ? 'Minimum' : 'Angaben'), h('th', {}, two ? 'Empfohlen' : ''), h('th', {}, '')),
          ...current.shown.map((r) => h('tr', {}, h('td', {}, r.label), h('td', {}, r.min), h('td', {}, r.rec || (two && r.rec === '' ? '–' : '')), h('td', { class: 'kind' }, r.kind ? ({ Kategorie: 'in Auswahlfeldern', Gemischt: 'teils als Text' }[r.kind] || 'als Text') : ''))));
        note.textContent = current.hasRequirements ? '' : 'Steam hat zu diesem Spiel keine Systemanforderungen. Es werden nur Plattformen und Funktionen übernommen.';
        ok.disabled = !Object.keys(current.patch).length;
        if (ok.disabled) note.textContent = 'Zu diesem Spiel liefert Steam nichts, was sich übernehmen lässt.';
      };
      openDlg(details.name || item.name,
        h('div', { class: 'drow' }, h('button', { type: 'button', onclick: openSteam }, '← Andere Suche')),
        table, note,
        h('label', { class: 'chk' }, coverChk, ' Steam-Cover (Hochformat) als Frontcover laden'),
        h('label', { class: 'chk' }, logoChk, ' Spiel-Logo für den Rücken laden (statt des Titels, wenn Steam eins hat)'),
        h('p', { class: 'dmsg' }, 'Prozessor und Grafikkarte werden bei "or" bzw. "/" in einzelne Einträge zerlegt (jeder steht auf dem Cover in einer eigenen Zeile). Was in die Auswahlfelder passt (Intel, AMD, GeForce, Radeon mit Modell und Speicher), kommt dorthin, der Rest bleibt als Text. Lange Angaben werden gekürzt. Alles lässt sich danach ändern.'),
        h('div', { class: 'drow' }, ok, h('button', { type: 'button', onclick: closeDlg }, 'Abbrechen')));
      draw();
    }
  }

  /* ---------- Daten von GOG (Katalog und Spiel-Daten, Bilder von GOG) ---------- */
  function openGog() {
    const input = h('input', { type: 'text', placeholder: 'Spieltitel oder GOG-Produkt-ID' }); input.value = App.state.title || '';
    const msg = h('p', { class: 'dmsg' }, 'Sucht im GOG-Katalog und liest Systemanforderungen, Funktionen, Altersfreigabe und Publisher aus (englische Angaben). Du kannst auch die GOG-Produkt-ID oder die Adresse einer gogdb.org-Seite einfügen, dann entfällt die Suche.');
    const list = h('div', { class: 'dlist' });
    const go = async () => {
      const t = input.value.trim(); if (!t) return;
      const ref = O.parseGogRef(t);
      if (ref) { showDetails({ id: ref, name: 'GOG-Produkt ' + ref }); return; }
      say(msg, 'Suche läuft ...'); list.replaceChildren();
      try {
        const res = (await O.gogSearch(t)).slice(0, 8);
        say(msg, res.length ? 'Spiel auswählen:' : 'Keine Treffer. Anderen Titel versuchen (am besten englisch) oder die GOG-Produkt-ID einfügen.');
        list.replaceChildren(...res.map((it) => h('button', { type: 'button', onclick: () => showDetails(it) }, it.name + (it.year ? '  (' + it.year + ')' : ''))));
      } catch (e) { say(msg, e.message, true); }
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    openDlg('Daten von GOG', h('div', { class: 'drow' }, input, h('button', { type: 'button', class: 'pri', onclick: go }, 'Suchen')), msg, list,
      h('p', { class: 'dmsg' }, 'Funktioniert die Suche nicht, hilft ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); openSettings(); } }, '"Verbindung testen" in den Einstellungen'), '.'));
    if (input.value.trim() && O.settings.proxy) go();

    async function showDetails(item) {
      const m2 = h('p', { class: 'dmsg' }, 'Daten werden geladen ...');
      openDlg(item.name, m2);
      let game;
      try { game = await O.gogGame(item.id); } catch (e) { say(m2, e.message, true); openDlg(item.name, m2, h('div', { class: 'drow' }, h('button', { type: 'button', onclick: openGog }, '← Andere Suche'))); return; }
      const details = O.gogDetails(game), img = O.gogImages(game), have = App.snapshot().images;
      const table = h('table', { class: 'shown' }), note = h('p', { class: 'dmsg' });
      const logoChk = h('input', { type: 'checkbox', checked: !!img.logo && !have.spineLogo });
      const bgChk = h('input', { type: 'checkbox', checked: false });
      const coverChk = h('input', { type: 'checkbox', checked: false });
      let current = null;
      const apply = async () => {
        App.patch(O.keepManualFeatures(current.patch, App.state.features));
        const jobs = [[logoChk, 'spineLogo', img.logo, 'das GOG-Logo', 'png'], [bgChk, 'backTop', img.background, 'das Hintergrundbild', 'jpg'], [coverChk, 'front', img.cover, 'das Cover', 'jpg']].filter((j) => j[0].checked && j[2]);
        if (!jobs.length) { closeDlg(); return; }
        ok.disabled = true; const problems = [];
        for (const [, key, url, what, ext] of jobs) {
          say(note, 'Bilder werden geladen ...');
          try { const blob = await O.fetchBlob(url); await App.setImage(key, new File([blob], 'gog-' + item.id + '-' + key + '.' + ext, { type: blob.type || (ext === 'png' ? 'image/png' : 'image/jpeg') })); }
          catch (e) { problems.push(what + ' (' + e.message + ')'); }
        }
        if (!problems.length) { closeDlg(); return; }
        say(note, 'Die Angaben sind übernommen, nicht geladen wurde ' + problems.join(' und ') + '.', true);
        ok.disabled = false;
      };
      const ok = h('button', { type: 'button', class: 'pri', onclick: apply }, 'Übernehmen');
      current = O.steamPatchBoth(details);
      const two = current.hasBoth;
      table.replaceChildren(h('tr', { class: 'head' }, h('th', {}, ''), h('th', {}, two ? 'Minimum' : 'Angaben'), h('th', {}, two ? 'Empfohlen' : ''), h('th', {}, '')),
        ...current.shown.map((r) => h('tr', {}, h('td', {}, r.label), h('td', {}, r.min), h('td', {}, r.rec || (two && r.rec === '' ? '–' : '')), h('td', { class: 'kind' }, r.kind ? ({ Kategorie: 'in Auswahlfeldern', Gemischt: 'teils als Text', Text: 'als Text' }[r.kind] || '') : ''))));
      note.textContent = current.hasRequirements ? '' : 'GOG hat zu diesem Spiel keine Systemanforderungen. Es werden nur Plattformen und Funktionen übernommen.';
      ok.disabled = !Object.keys(current.patch).length;
      if (ok.disabled) note.textContent = 'Zu diesem Spiel liefert GOG nichts, was sich übernehmen lässt.';
      openDlg(details.name || item.name,
        h('div', { class: 'drow' }, h('button', { type: 'button', onclick: openGog }, '← Andere Suche')),
        table, note,
        h('label', { class: 'chk' }, logoChk, ' Spiel-Logo für den Rücken laden (hochauflösend, transparent)'),
        h('label', { class: 'chk' }, bgChk, ' Hintergrundbild (etwa 2560 Pixel breit) als Rückseite oben laden'),
        h('label', { class: 'chk' }, coverChk, ' GOG-Cover als Frontcover laden (nur etwa 342 × 482 Pixel, also unscharf; besser Steam oder SteamGridDB)'),
        h('p', { class: 'dmsg' }, 'GOG liefert Cover nur in kleiner Größe (etwa 342 × 482 Pixel, das sind auf der Hülle rund 67 dpi). Logo und Hintergrund sind dagegen hochauflösend.'),
        h('div', { class: 'drow' }, ok, h('button', { type: 'button', onclick: closeDlg }, 'Abbrechen')));
    }
  }

  /* ---------- Bildsuche bei SteamGridDB ---------- */
  const DEFAULT_KIND = { front: 'cover', backTop: 'hero', backBottom: 'hero', publisher: 'logo', spineLogo: 'logo', spineBg: 'hero' };
  const TARGET_NAME = { front: 'Frontcover', backTop: 'Rückseite oben', backBottom: 'Rückseite unten', publisher: 'Publisher-Logo', spineLogo: 'Rückenlogo', spineBg: 'Rückenbild' };

  function openSteamGridDB(key) {
    const input = h('input', { type: 'text', placeholder: 'Spieltitel, z. B. Stronghold' }); input.value = App.state.title || '';
    const msg = h('p', { class: 'dmsg' }, O.settings.key ? '' : 'Für die Suche wird ein API-Schlüssel benötigt. Trage ihn oben unter "Einstellungen" ein.');
    const list = h('div', { class: 'dlist' });
    const go = async () => {
      const t = input.value.trim(); if (!t) return;
      say(msg, 'Suche läuft ...'); list.replaceChildren();
      try {
        const res = (await O.sgSearch(t)).slice(0, 20);
        say(msg, res.length ? 'Spiel auswählen:' : 'Keine Treffer. Anderen Titel versuchen.');
        list.replaceChildren(...res.map((g) => {
          const y = typeof g.release_date === 'number' ? new Date(g.release_date * 1000).getFullYear() : 0;
          return h('button', { type: 'button', onclick: () => gallery(g) }, g.name + (g.verified ? ' ✓' : '') + (y > 1970 ? ' · ' + y : ''));
        }));
      } catch (e) { say(msg, e.message, true); }
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    openDlg('Bild bei SteamGridDB suchen: ' + TARGET_NAME[key], h('div', { class: 'drow' }, input, h('button', { type: 'button', class: 'pri', onclick: go }, 'Suchen')), msg, list);
    if (input.value && O.settings.key) go();

    function gallery(game) {
      let chosen = null;
      const m2 = h('p', { class: 'dmsg' }, 'Bilder werden geladen ...');
      const gal = h('div', { class: 'gal' });
      const kind = h('select', {}, Object.entries(O.SG_KINDS).map(([k, v]) => h('option', { value: k }, v.label))); kind.value = DEFAULT_KIND[key];
      const ok = h('button', { type: 'button', class: 'pri', disabled: true, onclick: async () => {
        ok.disabled = true; say(m2, 'Bild wird übernommen ...');
        try { const blob = await O.fetchBlob(chosen.url); await App.setImage(key, new File([blob], 'steamgriddb-' + chosen.id + '.' + ((blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg')), { type: blob.type || 'image/png' })); closeDlg(); }
        catch (e) { say(m2, e.message, true); ok.disabled = false; }
      } }, 'Als ' + TARGET_NAME[key] + ' übernehmen');
      const load = async () => {
        gal.replaceChildren(); chosen = null; ok.disabled = true; say(m2, 'Bilder werden geladen ...');
        try {
          const imgs = (await O.sgImages(game.id, kind.value)).slice(0, 60);
          say(m2, imgs.length ? 'Bild auswählen (' + imgs.length + ' angezeigt):' : 'Keine Bilder in dieser Art gefunden.');
          gal.replaceChildren(...imgs.map((it) => {
            const b = h('button', { type: 'button', onclick: () => { gal.querySelectorAll('button').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); chosen = it; ok.disabled = false; } },
              h('img', { src: it.thumb || it.url, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }),
              h('small', {}, (it.width && it.height ? it.width + '×' + it.height : '') + (it.language ? ' · ' + it.language : '')),
              (() => { const dpi = it.width && it.height ? App.dpiOf(key, it.width, it.height) : 0; return dpi ? h('small', { class: dpi < 150 ? 'dpi-low' : dpi < 250 ? 'dpi-mid' : 'dpi-ok' }, '≈ ' + dpi + ' dpi') : ''; })());
            return b;
          }));
        } catch (e) { say(m2, e.message, true); }
      };
      kind.addEventListener('change', load);
      openDlg(game.name, h('div', { class: 'drow' }, h('button', { type: 'button', onclick: () => openSteamGridDB(key) }, '← Andere Suche'), kind), m2, gal,
        h('div', { class: 'drow' }, ok, h('button', { type: 'button', onclick: closeDlg }, 'Abbrechen')));
      load();
    }
  }

  /* ---------- Publisher-Logo suchen (Wikidata / Wikimedia Commons, kein Schlüssel nötig) ---------- */
  function openPublisherLogo() {
    const st = App.state, input = h('input', { type: 'text', placeholder: 'Firma, z. B. Valve oder Team Cherry' });
    input.value = st.publisher || st.developer || '';
    const source = h('select', {}, h('option', { value: 'wikidata' }, 'Wikidata (ohne Schlüssel)'), h('option', { value: 'brandfetch' }, 'Brandfetch (mit Client-ID, findet auch kleine Studios)'));
    const bgChk = h('input', { type: 'checkbox', checked: true });
    const msg = h('p', { class: 'dmsg' }, 'Vorgabe ist der Publisher aus dem Steam-Import. Findet Wikidata nichts (z. B. bei Indie-Studios), die Quelle auf Brandfetch umstellen.');
    const gal = h('div', { class: 'gal' });
    let chosen = null;
    const ok = h('button', { type: 'button', class: 'pri', disabled: true, onclick: async () => {
      ok.disabled = true; say(msg, 'Logo wird übernommen ...');
      try {
        const blob = await O.fetchBlob(chosen.file ? await O.commonsImageUrl(chosen.file, 800) : chosen.url);
        await App.setImage('publisher', new File([blob], 'logo-' + chosen.id.replace(/[^\w-]+/g, '') + '.' + ((blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg')), { type: blob.type || 'image/png' }));
        if (bgChk.checked) await App.removeBackground('publisher');
        closeDlg();
      } catch (e) { say(msg, e.message, true); ok.disabled = false; }
    } }, 'Als Publisher-Logo übernehmen');
    const pick = (e, c) => { gal.querySelectorAll('button').forEach((b) => b.classList.remove('sel')); e.currentTarget.classList.add('sel'); chosen = c; ok.disabled = false; };
    let run = 0;                                   // nur die jüngste Suche darf die Anzeige ändern (langsame ältere Antworten werden verworfen)
    const go = async () => {
      const t = input.value.trim(); if (!t) return;
      const me = ++run;
      say(msg, 'Suche läuft ...'); gal.replaceChildren(); chosen = null; ok.disabled = true;
      try {
        if (source.value === 'brandfetch') {
          const res = await O.brandSearch(t); if (me !== run) return;
          say(msg, res.length ? 'Logo auswählen (Symbole der Firmen, gefunden über die Webseite):' : 'Brandfetch kennt diesen Namen nicht. Anderen Namen versuchen oder das Logo als Datei laden.');
          gal.replaceChildren(...res.slice(0, 12).map((r) => h('button', { type: 'button', onclick: (e) => pick(e, { id: r.id, url: r.url }) },
            h('img', { src: r.url, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }), h('small', {}, r.label + (r.description ? ' · ' + r.description : '')))));
          return;
        }
        const res = await O.logoSearch(t); if (me !== run) return;
        say(msg, res.length ? 'Logo auswählen (aktuelle zuerst, ältere sind gekennzeichnet):' : 'Kein Eintrag mit Logo gefunden. Anderen Namen versuchen, die Quelle auf Brandfetch umstellen oder das Logo als Datei laden.');
        gal.replaceChildren(...res.flatMap((r) => r.logos.slice(0, 6).map((file) => h('button', { type: 'button', onclick: (e) => pick(e, { id: r.id, file }) },
          h('img', { src: O.commonsUrl(file, 240), alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }), h('small', {}, r.label + (r.description ? ' · ' + r.description : '') + (r.old.includes(file) ? ' · älteres Logo' : ''))))));
      } catch (e) { if (me === run) say(msg, e.message, true); }
    };
    source.addEventListener('change', () => { run++; gal.replaceChildren(); if (source.value === 'brandfetch' && !O.settings.brandfetch) say(msg, 'Für Brandfetch fehlt noch die kostenlose Client-ID. Sie gehört in die Einstellungen (Knopf oben in der Leiste).', true); else go(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    const quick = [['Publisher', st.publisher], ['Entwickler', st.developer]].filter(([, v]) => v).map(([l, v]) => h('button', { type: 'button', onclick: () => { input.value = v; go(); } }, l + ': ' + v));
    openDlg('Publisher-Logo suchen', h('div', { class: 'drow' }, input, h('button', { type: 'button', class: 'pri', onclick: go }, 'Suchen')), h('div', { class: 'drow' }, source),
      h('label', { class: 'chk' }, bgChk, ' Einfarbigen Hintergrund (z. B. Weiß) automatisch transparent machen'),
      quick.length ? h('div', { class: 'drow' }, ...quick) : null, msg, gal,
      h('div', { class: 'drow' }, ok, h('button', { type: 'button', onclick: closeDlg }, 'Abbrechen')));
    if (input.value) go();
  }

  /* ---------- Knöpfe verbinden ---------- */
  const projectInput = $('#projectFile');
  $('#bBrowserSave').addEventListener('click', () => saveToBrowser());
  $('#bSave').addEventListener('click', () => saveProject(false));
  $('#bProjExport').addEventListener('click', () => saveProject(true));
  $('#bProjImport').addEventListener('click', openProject);
  projectInput.addEventListener('change', () => { const f = projectInput.files[0]; projectInput.value = ''; if (f) importProject(f); });
  $('#bSteam').addEventListener('click', openSteam);
  $('#bGog').addEventListener('click', openGog);
  $('#bSettings').addEventListener('click', openSettings);
  /* Funktionen des Menüs (Dialoge liegen im Bereich "Menü", shell.js schaltet dorthin) */
  $('#bSgAdd').addEventListener('click', () => Menu.addGameViaSgdb());
  $('#bJson').addEventListener('click', () => openRecipeEditor(document.body.dataset.view === 'cover' ? 'cover' : 'menu'));
  $('#bFolder').hidden = typeof window.showDirectoryPicker !== 'function';
  $('#bFolder').addEventListener('click', () => Menu.importFolder());
  $('#bDisc').hidden = typeof window.showDirectoryPicker !== 'function';
  $('#bDisc').addEventListener('click', () => Menu.runDiscCheck());
  [...document.querySelectorAll('.drop .sg')].filter(ours).forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); const key = b.closest('.drop').dataset.img; key === 'publisher' ? openPublisherLogo() : openSteamGridDB(key); }));

  /* Sprache der Oberfläche: Bei Deutsch lässt sich die Sprache der Beschriftung des Covers wählen, bei jeder anderen Sprache entfällt das Feld
     und das Cover wird englisch beschriftet. */
  if (window.I18n) {
    const syncLang = (code) => {
      const lab = document.querySelector('[data-k=lang]').closest('label');
      lab.hidden = code !== 'de';
      App.buildJump();
      if (code !== 'de' && App.state.lang !== 'en') App.patch({ lang: 'en' });
    };
    I18n.onChange(syncLang);
    I18n.init();
  }
})();
