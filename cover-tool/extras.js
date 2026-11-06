/* Dialoge und Menüs der oberen Leiste: Daten übernehmen (Rezept, Steam), Projekt exportieren und importieren,
   Einstellungen (SteamGridDB-Schlüssel, Proxy, Sicherung in Datei) und die Bildsuche bei SteamGridDB. */
(function () {
  'use strict';
  const C = window.CoverCore, O = window.CoverOnline, Z = window.CoverZip, F = window.CoverFiles, App = window.CoverApp;
  const $ = (s, r = document) => r.querySelector(s);
  const REPO = 'https://github.com/EinMensch002/DiscMenu-Builder';
  const DOCS = REPO + '/blob/main/docs/steamgriddb.md';
  const LINKS = {
    sgdb: 'https://www.steamgriddb.com/', sgdbKey: 'https://www.steamgriddb.com/profile/preferences/api', cf: 'https://dash.cloudflare.com/',
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
  const fileFrom = (data, name) => new File([data], name.split('/').pop(), { type: MIME[(name.split('.').pop() || '').toLowerCase()] || 'image/png' });
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
  const menus = [...document.querySelectorAll('.menu')];
  const closeMenus = () => menus.forEach((m) => { m.open = false; });
  document.addEventListener('click', (e) => { menus.forEach((m) => { if (!m.contains(e.target)) m.open = false; }); });
  menus.forEach((m) => m.addEventListener('click', (e) => { if (e.target.closest('button')) closeMenus(); }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

  /* ---------- Einstellungen (gemeinsam mit dem Konfigurator) ---------- */
  function openSettings() {
    const key = h('input', { type: 'password', autocomplete: 'off', placeholder: 'API-Schlüssel' }); key.value = O.settings.key;
    const proxy = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: 'https://mein-proxy.example.workers.dev/?url={url}' }); proxy.value = O.settings.proxy;
    const pw = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Passwort (optional)' });
    const msg = h('p', { class: 'dmsg' }), msg2 = h('p', { class: 'dmsg' }), tests = h('div', { class: 'dmsg' });
    const fin = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async () => {
      const f = fin.files[0]; fin.value = ''; if (!f) return;
      try {
        const v = await F.unpackSettings(await f.text(), pw.value);
        if (v.proxy && !v.proxy.includes('{url}')) throw new Error('Die Proxy-Adresse in der Datei enthält keinen Platzhalter {url}.');
        key.value = v.key; proxy.value = v.proxy; O.settings.save(v.key, v.proxy);
        say(msg2, 'Einstellungen eingelesen und gespeichert.');
      } catch (e) { say(msg2, e.message === 'PASSWORD_NEEDED' ? 'Die Datei ist verschlüsselt. Bitte das Passwort eintragen und die Datei erneut einlesen.' : e.message, true); }
    } });
    const saveCfg = () => {
      const p = proxy.value.trim();
      if (p && !p.includes('{url}')) { say(msg, 'Die Proxy-Adresse muss den Platzhalter {url} enthalten.', true); return false; }
      O.settings.save(key.value, p); return true;
    };
    openDlg('Einstellungen für SteamGridDB und Steam',
      h('p', { class: 'dmsg' }, 'Den API-Schlüssel gibt es kostenlos im SteamGridDB-Profil. Er wird nur in diesem Browser gespeichert. Die Einstellungen gelten auch im Konfigurator (auf GitHub Pages teilen sich beide Seiten den Speicher), und eine dort gesicherte Datei lässt sich hier einlesen.'),
      h('p', { class: 'dmsg' }, ext('Schlüssel bei SteamGridDB erzeugen', LINKS.sgdbKey), ' · ', ext('SteamGridDB', LINKS.sgdb), ' · ', ext('Anleitung', LINKS.setup)),
      wrapField('API-Schlüssel (nur für SteamGridDB)', key),
      wrapField('Proxy-Adresse', proxy, 'Für die Suche bei Steam und SteamGridDB fast immer nötig, weil der Browser die Anfragen sonst blockiert (CORS). {url} wird durch die Zieladresse ersetzt.'),
      h('p', { class: 'dmsg' }, 'Proxy einrichten: ', ext('Anleitung', LINKS.proxy), ' · ', ext('Cloudflare öffnen', LINKS.cf), ' · ', ext('Worker-Code', LINKS.worker), ' · ', ext('Proxy absichern', LINKS.secure)),
      msg,
      h('div', { class: 'drow' },
        h('button', { type: 'button', class: 'pri', onclick: () => { if (saveCfg()) { say(msg, 'Einstellungen gespeichert.'); } } }, 'Speichern'),
        h('button', { type: 'button', onclick: async () => {
          if (!saveCfg()) return;
          say(msg, 'Teste die Verbindung ...'); tests.replaceChildren();
          const res = await O.testConnection();
          say(msg, res.every((r) => r.ok) ? 'Alle Verbindungen in Ordnung.' : 'Mindestens eine Verbindung funktioniert nicht, Details unten.', !res.every((r) => r.ok));
          tests.replaceChildren(...res.map((r) => h('div', { class: r.ok ? '' : 'err' }, (r.ok ? '✓ ' : '✗ ') + r.name + ': ' + r.text)));
        } }, 'Verbindung testen'),
        h('button', { type: 'button', onclick: () => { O.settings.save('', ''); key.value = ''; proxy.value = ''; say(msg, 'Gespeicherte Werte gelöscht.'); } }, 'Löschen')),
      tests,
      h('h3', {}, 'Einstellungen sichern'),
      h('p', { class: 'dmsg' }, 'Speichert Schlüssel und Proxy-Adresse in einer Datei, die sich später wieder einlesen lässt, z. B. nach dem Löschen der Browserdaten oder auf einem anderen Gerät. Die Datei enthält deinen Schlüssel: nicht weitergeben und nicht ins Repository legen. ', ext('Mehr dazu', LINKS.backup)),
      wrapField('Passwort (optional)', pw, 'Wird beim Sichern zum Verschlüsseln und beim Einlesen zum Entschlüsseln benutzt. Ein vergessenes Passwort lässt sich nicht wiederherstellen.'),
      h('div', { class: 'drow' },
        h('button', { type: 'button', onclick: async () => {
          const vals = { key: key.value.trim(), proxy: proxy.value.trim() };
          if (!vals.key && !vals.proxy) { say(msg2, 'Es gibt noch nichts zu sichern.', true); return; }
          try {
            const text = await F.packSettings(vals, pw.value);
            const where = await saveFile(new Blob([text], { type: 'application/json' }), 'discmenu-einstellungen.json', 'Einstellungen (JSON)', 'application/json', '.json');
            if (where) say(msg2, (pw.value ? 'Verschlüsselte Datei "' : 'Datei "') + where + '" gespeichert.' + (pw.value ? '' : ' Sie ist nicht verschlüsselt, also gut aufbewahren.'));
          } catch (e) { say(msg2, e.message, true); }
        } }, 'In Datei sichern'),
        h('button', { type: 'button', onclick: () => fin.click() }, 'Aus Datei einlesen')),
      msg2, fin);
  }

  /* ---------- Projekt exportieren und importieren ---------- */
  async function exportProject() {
    const snap = App.snapshot(), images = {};
    for (const [k, v] of Object.entries(snap.images)) images[k] = { data: new Uint8Array(await v.blob.arrayBuffer()), type: v.type, name: v.name };
    const zip = F.packProject(snap.state, images);
    const name = (slug(snap.state.title) || 'cover') + '-cover.zip';
    const where = await saveFile(new Blob([zip], { type: 'application/zip' }), name, 'Cover-Projekt (ZIP)', 'application/zip', '.zip');
    if (where) openDlg('Projekt exportiert', h('p', { class: 'dmsg' }, '"' + where + '" enthält alle Einstellungen und ' + Object.keys(images).length + ' Bild(er). Mit "Projekt importieren" lässt sich alles wieder laden.'),
      h('div', { class: 'drow' }, h('button', { type: 'button', onclick: closeDlg }, 'Schließen')));
  }
  async function importProject(file) {
    try {
      const { state, images, missing } = F.unpackProject(await Z.read(new Uint8Array(await file.arrayBuffer())));
      if (!confirm('Das aktuelle Projekt wird durch "' + file.name + '" ersetzt. Weiter?')) return;
      await App.restore(state, images);
      openDlg('Projekt importiert', h('p', { class: 'dmsg' }, 'Einstellungen und ' + Object.keys(images).length + ' Bild(er) wurden geladen.' + (missing.length ? ' Nicht gefunden: ' + missing.join(', ') + '.' : '')),
        h('div', { class: 'drow' }, h('button', { type: 'button', onclick: closeDlg }, 'Schließen')));
    } catch (e) {
      openDlg('Projekt importieren', h('p', { class: 'dmsg err' }, 'Das Projekt konnte nicht geladen werden: ' + (e.message || e)), h('div', { class: 'drow' }, h('button', { type: 'button', onclick: closeDlg }, 'Schließen')));
    }
  }

  /* ---------- Aus einem Rezept übernehmen ---------- */
  async function onRecipeFile(file) {
    try {
      let menu; const assets = new Map();
      if (/\.json$/i.test(file.name)) menu = JSON.parse(await file.text());
      else {
        const files = await Z.read(new Uint8Array(await file.arrayBuffer()));
        const mj = files.find((f) => f.name === 'menu.json');
        if (!mj) throw new Error('In der ZIP fehlt die menu.json im Wurzelverzeichnis.');
        menu = JSON.parse(new TextDecoder().decode(mj.data));
        for (const f of files) assets.set(f.name, f.data);
      }
      const games = C.recipeGames(menu);
      if (!games.length) throw new Error('Im Rezept sind keine Spiele eingetragen.');
      chooseGame(games, assets, /\.json$/i.test(file.name));
    } catch (e) {
      openDlg('Aus Rezept übernehmen', h('p', { class: 'dmsg err' }, 'Das Rezept konnte nicht gelesen werden: ' + (e.message || e)), h('div', { class: 'drow' }, h('button', { type: 'button', onclick: closeDlg }, 'Schließen')));
    }
  }
  function chooseGame(games, assets, jsonOnly) {
    const useCover = h('input', { type: 'checkbox' }); useCover.checked = true;
    const msg = h('p', { class: 'dmsg' }, jsonOnly ? 'Bei einer einzelnen menu.json gibt es keine Bilder, nur Titel, Anbieter und Größe werden übernommen.' : '');
    const list = games.map((g) => h('button', { type: 'button', onclick: async () => {
      App.patch(C.statePatchFromGame(g));
      const data = g.cover && assets.get(g.cover);
      if (useCover.checked && data) { try { await App.setImage('front', fileFrom(data, g.cover)); } catch (e) { say(msg, 'Das Cover konnte nicht übernommen werden: ' + e.message, true); return; } }
      closeDlg();
    } }, g.name + ' · ' + C.PROVIDERS[g.provider].name + (g.cover && assets.has(g.cover) ? ' · mit Cover' : '')));
    openDlg('Aus Rezept übernehmen',
      h('p', { class: 'dmsg' }, 'Welches Spiel soll übernommen werden? Übernommen werden Titel, Anbieter, die geschätzte Größe als Speicherplatz und das Cover als Frontcover. Alles lässt sich danach noch ändern.'),
      assets.size ? h('label', { class: 'chk' }, useCover, 'Cover des Spiels als Frontcover übernehmen') : null,
      h('div', { class: 'dlist' }, list), msg);
  }

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
      const ok = h('button', { type: 'button', class: 'pri', onclick: () => { App.patch(current.patch); closeDlg(); } }, 'Übernehmen');
      const draw = () => {
        current = O.steamPatchBoth(details);
        const two = current.hasBoth;
        table.replaceChildren(h('tr', { class: 'head' }, h('th', {}, ''), h('th', {}, two ? 'Minimum' : 'Angaben'), h('th', {}, two ? 'Empfohlen' : ''), h('th', {}, '')),
          ...current.shown.map((r) => h('tr', {}, h('td', {}, r.label), h('td', {}, r.min), h('td', {}, r.rec || (two && r.rec === '' ? '–' : '')), h('td', { class: 'kind' }, r.kind ? (r.kind === 'Kategorie' ? 'in Kategorien' : 'als Text') : ''))));
        note.textContent = current.hasRequirements ? '' : 'Steam hat zu diesem Spiel keine Systemanforderungen. Es werden nur Plattformen und Funktionen übernommen.';
        ok.disabled = !Object.keys(current.patch).length;
        if (ok.disabled) note.textContent = 'Zu diesem Spiel liefert Steam nichts, was sich übernehmen lässt.';
      };
      openDlg(details.name || item.name,
        h('div', { class: 'drow' }, h('button', { type: 'button', onclick: openSteam }, '← Andere Suche')),
        table, note,
        h('p', { class: 'dmsg' }, 'Prozessor und Grafikkarte werden, wo es passt, in die Kategorien übernommen (Intel, AMD, NVIDIA, Radeon mit Modell). Was nicht hineinpasst, steht als eigener Text und ersetzt dann die Auswahl. Lange Angaben werden gekürzt. Alles lässt sich danach ändern.'),
        h('div', { class: 'drow' }, ok, h('button', { type: 'button', onclick: closeDlg }, 'Abbrechen')));
      draw();
    }
  }

  /* ---------- Bildsuche bei SteamGridDB ---------- */
  const DEFAULT_KIND = { front: 'cover', backTop: 'hero', backBottom: 'hero', publisher: 'logo' };
  const TARGET_NAME = { front: 'Frontcover', backTop: 'Rückseite oben', backBottom: 'Rückseite unten', publisher: 'Publisher-Logo' };

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
              h('small', {}, (it.width && it.height ? it.width + '×' + it.height : '') + (it.language ? ' · ' + it.language : '')));
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

  /* ---------- Knöpfe verbinden ---------- */
  const recipeInput = $('#recipeFile'), projectInput = $('#projectFile');
  $('#bRecipe').addEventListener('click', () => recipeInput.click());
  recipeInput.addEventListener('change', () => { const f = recipeInput.files[0]; recipeInput.value = ''; if (f) onRecipeFile(f); });
  $('#bProjExport').addEventListener('click', exportProject);
  $('#bProjImport').addEventListener('click', () => projectInput.click());
  projectInput.addEventListener('change', () => { const f = projectInput.files[0]; projectInput.value = ''; if (f) importProject(f); });
  $('#bSteam').addEventListener('click', openSteam);
  $('#bSettings').addEventListener('click', openSettings);
  document.querySelectorAll('.drop .sg').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openSteamGridDB(b.closest('.drop').dataset.img); }));
})();
