/* Dialoge des Cover-Tools: Übernahme aus einem Rezept, Anforderungen von Steam, Bildsuche bei SteamGridDB, Einstellungen. */
(function () {
  'use strict';
  const C = window.CoverCore, O = window.CoverOnline, Z = window.CoverZip, App = window.CoverApp;
  const $ = (s, r = document) => r.querySelector(s);
  const DOCS = 'https://github.com/EinMensch002/DiscMenu-Builder/blob/main/docs/';

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
    if (isError && /CORS|Proxy/i.test(text)) el.append(' ', h('a', { href: DOCS + 'steamgriddb.md#proxy-cors', target: '_blank', rel: 'noopener noreferrer' }, 'Anleitung zum Proxy'));
  }
  const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
  const fileFrom = (data, name) => new File([data], name.split('/').pop(), { type: MIME[(name.split('.').pop() || '').toLowerCase()] || 'image/png' });

  /* ---------- Einstellungen (gemeinsam mit dem Konfigurator) ---------- */
  function openSettings() {
    const key = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: 'API-Schlüssel von SteamGridDB' });
    const proxy = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: 'https://dein-proxy.workers.dev/?url={url}' });
    key.value = O.settings.key; proxy.value = O.settings.proxy;
    const msg = h('p', { class: 'dmsg' });
    openDlg('Einstellungen für SteamGridDB und Steam',
      h('p', { class: 'dmsg' }, 'Für die Suche bei SteamGridDB und Steam brauchst du einen API-Schlüssel (nur SteamGridDB) und fast immer einen eigenen Proxy, weil die Dienste Anfragen aus dem Browser sonst blockieren. Die Werte liegen nur in deinem Browser und sind dieselben wie im Konfigurator (auf GitHub Pages teilen sich beide Seiten den Speicher).'),
      h('label', { class: 'f' }, h('span', { class: 'lab' }, 'SteamGridDB-API-Schlüssel'), key),
      h('label', { class: 'f' }, h('span', { class: 'lab' }, 'Proxy-Adresse (mit {url} als Platzhalter)'), proxy),
      h('p', { class: 'dmsg' }, h('a', { href: 'https://www.steamgriddb.com/profile/preferences/api', target: '_blank', rel: 'noopener noreferrer' }, 'Schlüssel bei SteamGridDB erzeugen'), ' · ',
        h('a', { href: DOCS + 'steamgriddb.md#proxy-cors', target: '_blank', rel: 'noopener noreferrer' }, 'Anleitung zum Proxy')),
      h('div', { class: 'drow' }, h('button', { type: 'button', class: 'pri', onclick: () => { O.settings.save(key.value, proxy.value); say(msg, 'Gespeichert.'); } }, 'Speichern'),
        h('button', { type: 'button', onclick: closeDlg }, 'Schließen')), msg);
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
      const msg = h('p', { class: 'dmsg err' }, 'Das Rezept konnte nicht gelesen werden: ' + (e.message || e));
      openDlg('Aus Rezept übernehmen', msg, h('div', { class: 'drow' }, h('button', { type: 'button', onclick: closeDlg }, 'Schließen')));
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
    const input = h('input', { type: 'text', placeholder: 'Spieltitel, z. B. Half-Life' }); input.value = App.state.title || '';
    const msg = h('p', { class: 'dmsg' }, 'Sucht im Steam-Shop und liest Systemanforderungen, Plattformen und Funktionen aus (englische Angaben).');
    const list = h('div', { class: 'dlist' });
    const go = async () => {
      const t = input.value.trim(); if (!t) return;
      say(msg, 'Suche läuft ...'); list.replaceChildren();
      try {
        const res = (await O.steamSearch(t)).slice(0, 8);
        say(msg, res.length ? 'Spiel auswählen:' : 'Keine Treffer. Anderen Titel versuchen.');
        list.replaceChildren(...res.map((it) => h('button', { type: 'button', onclick: () => showDetails(it) }, it.name)));
      } catch (e) { say(msg, e.message, true); }
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    openDlg('Anforderungen von Steam', h('div', { class: 'drow' }, input, h('button', { type: 'button', class: 'pri', onclick: go }, 'Suchen')), msg, list);
    if (input.value && O.settings.proxy) go();

    async function showDetails(item) {
      const m2 = h('p', { class: 'dmsg' }, 'Daten werden geladen ...');
      openDlg(item.name, m2);
      let details;
      try { details = await O.steamDetails(item.id); } catch (e) { say(m2, e.message, true); return; }
      const which = h('select', {}, h('option', { value: 'minimum' }, 'Mindestanforderungen'), h('option', { value: 'recommended' }, 'Empfohlene Anforderungen'));
      const table = h('table', { class: 'shown' });
      let current = null;
      const draw = () => {
        current = O.steamPatch(details, which.value);
        table.replaceChildren(...current.shown.map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v))));
        note.textContent = current.hasRequirements ? '' : 'Steam hat zu diesem Spiel keine Systemanforderungen. Es werden nur Plattformen und Funktionen übernommen.';
        ok.disabled = !Object.keys(current.patch).length;
      };
      const note = h('p', { class: 'dmsg' });
      const ok = h('button', { type: 'button', class: 'pri', onclick: () => { App.patch(current.patch); closeDlg(); } }, 'Übernehmen');
      which.addEventListener('change', draw);
      openDlg(item.name,
        h('div', { class: 'drow' }, which, h('button', { type: 'button', onclick: openSteam }, '← Andere Suche')),
        table, note,
        h('p', { class: 'dmsg' }, 'Prozessor und Grafikkarte werden als eigener Text übernommen und ersetzen die Auswahl. Die Werte lassen sich danach ändern.'),
        h('div', { class: 'drow' }, ok, h('button', { type: 'button', onclick: closeDlg }, 'Abbrechen')));
      draw();
    }
  }

  /* ---------- Bildsuche bei SteamGridDB ---------- */
  const DEFAULT_KIND = { front: 'cover', backTop: 'hero', backBottom: 'hero', publisher: 'logo' };
  const TARGET_NAME = { front: 'Frontcover', backTop: 'Rückseite oben', backBottom: 'Rückseite unten', publisher: 'Publisher-Logo' };

  function openSteamGridDB(key) {
    const input = h('input', { type: 'text', placeholder: 'Spieltitel, z. B. Stronghold' }); input.value = App.state.title || '';
    const msg = h('p', { class: 'dmsg' }, O.settings.key ? '' : 'Für die Suche wird ein API-Schlüssel benötigt. Trage ihn über "Einstellungen für SteamGridDB und Steam" ein.');
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
  const recipeInput = $('#recipeFile');
  $('#bRecipe').addEventListener('click', () => recipeInput.click());
  recipeInput.addEventListener('change', () => { const f = recipeInput.files[0]; recipeInput.value = ''; if (f) onRecipeFile(f); });
  $('#bSteam').addEventListener('click', openSteam);
  $('#bSettings').addEventListener('click', openSettings);
  document.querySelectorAll('.drop .sg').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openSteamGridDB(b.closest('.drop').dataset.img); }));
})();
