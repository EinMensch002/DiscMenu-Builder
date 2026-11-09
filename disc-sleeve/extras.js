/* Dialoge und Menüs der oberen Leiste: Daten übernehmen (Rezept, Steam), Projekt exportieren und importieren,
   Einstellungen (SteamGridDB-Schlüssel, Proxy, Sicherung in Datei) und die Bildsuche bei SteamGridDB. */
(function () {
  'use strict';
  const C = window.CoverCore, O = window.CoverOnline, Z = window.CoverZip, F = window.CoverFiles, App = window.CoverApp;
  const $ = (s, r = document) => r.querySelector(s);
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

  /* ---------- Automatisch im Browser sichern ----------
     Einstellungen merkt sich das Tool schon in localStorage. Bilder sind zu groß dafür, sie kommen in die IndexedDB des Browsers. Dadurch bleibt der ganze
     Stand nach dem Neuladen erhalten, ohne Datei. Gespeichert wird kurz nach jeder Änderung, "Im Browser speichern" tut es sofort. "Zurücksetzen" leert den Speicher. */
  const IDB_NAME = 'discmenu-cover', IDB_STORE = 'project';
  const idbOpen = () => new Promise((res, rej) => {
    try { const r = indexedDB.open(IDB_NAME, 1); r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('IndexedDB gesperrt')); }
    catch (e) { rej(e); }
  });
  const idbRun = async (mode, fn) => { const db = await idbOpen(); try { return await new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, mode), q = fn(tx.objectStore(IDB_STORE)); tx.oncomplete = () => res(q && q.result); tx.onerror = tx.onabort = () => rej(tx.error || new Error('Speichern fehlgeschlagen')); }); } finally { db.close(); } };
  const auto = $('#autoInfo');
  let browserReady = false, autoTimer = 0, lastAuto = '';
  const clock = () => new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  async function saveToBrowser() {
    clearTimeout(autoTimer);
    try {
      const snap = App.snapshot();
      await idbRun('readwrite', (st) => st.put({ images: snap.images, savedAt: Date.now() }, 'current'));
      lastAuto = 'Im Browser gesichert (' + clock() + ')';
    } catch (e) { lastAuto = 'Bilder lassen sich in diesem Browser nicht sichern: ' + (e && e.message || e); }
    auto.textContent = lastAuto; auto.classList.toggle('dirty', /nicht sichern/.test(lastAuto));
  }
  App.onChange(() => { if (!browserReady) return; clearTimeout(autoTimer); autoTimer = setTimeout(saveToBrowser, 800); });
  App.onReset(() => { clearTimeout(autoTimer); idbRun('readwrite', (st) => st.delete('current')).catch(() => {}); auto.textContent = ''; });
  (async () => {
    try {
      const rec = await idbRun('readonly', (st) => st.get('current'));
      const keys = rec && rec.images ? Object.keys(rec.images) : [];
      if (keys.length) {
        const imgs = {};
        for (const k of keys) imgs[k] = { data: await rec.images[k].blob.arrayBuffer(), type: rec.images[k].type, name: rec.images[k].name };
        await App.restore(App.state, imgs);                       // die Einstellungen stehen schon (localStorage), nur die Bilder kommen dazu
        auto.textContent = keys.length + ' Bild(er) aus dem Browser-Speicher geladen';
        savedAt = App.changes; showInfo();                   // das Laden aus dem Browser zählt nicht als ungespeicherte Änderung der Datei
      }
    } catch (e) { /* kein Speicher vorhanden oder gesperrt: dann eben ohne */ }
    browserReady = true;
  })();

  /* ---------- Projekt speichern, speichern unter und öffnen ----------
     In Chrome und Edge merkt sich das Tool die Datei und "Speichern" überschreibt sie (wie im Menü-Ersteller). In anderen Browsern
     lädt "Speichern" die Datei jeweils neu herunter. */
  const ZIP_TYPE = { description: 'Cover-Projekt (ZIP)', accept: { 'application/zip': ['.zip'] } };
  let projHandle = null, projName = '', savedAt = App.changes, savedMsg = '';
  const info = $('#saveInfo');
  const dirtyNow = () => App.changes !== savedAt;
  function showInfo() {
    info.classList.toggle('dirty', dirtyNow());
    info.textContent = dirtyNow() ? (projName ? projName + ' · ' : '') + '● ungespeichert' : (projName ? savedMsg + projName : '');
    info.title = projHandle ? 'Strg+S überschreibt diese Datei' : 'Strg+S speichert das Projekt als ZIP';
  }
  App.onChange(showInfo);
  App.onReset(() => { projHandle = null; projName = ''; savedAt = App.changes; showInfo(); });
  window.addEventListener('beforeunload', (e) => { if (dirtyNow() && App.hasImages) { e.preventDefault(); e.returnValue = ''; } });

  async function packProject() {
    const snap = App.snapshot(), images = {};
    for (const [k, v] of Object.entries(snap.images)) images[k] = { data: new Uint8Array(await v.blob.arrayBuffer()), type: v.type, name: v.name };
    const used = F.usedFontIds(snap.state), fonts = App.fonts.list().filter((f) => used.includes(f.id));     // nur eigene Schriften, die Texte wirklich benutzen
    return { blob: new Blob([F.packProject(snap.state, images, fonts)], { type: 'application/zip' }), name: (slug(snap.state.title) || 'cover') + '-cover.zip', count: Object.keys(images).length };
  }
  async function saveProject(asNew) {
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
    projName = where; savedAt = App.changes; showInfo();
  }
  async function openProject() {
    if (typeof window.showOpenFilePicker === 'function') {
      try {
        const [hd] = await window.showOpenFilePicker({ types: [ZIP_TYPE], multiple: false });
        return importProject(await hd.getFile(), hd);
      } catch (e) { if (e && e.name === 'AbortError') return; /* sonst: Dateiauswahl des Browsers */ }
    }
    projectInput.click();
  }
  async function importProject(file, hd) {
    try {
      const { state, images, missing, fonts } = F.unpackProject(await Z.read(new Uint8Array(await file.arrayBuffer())));
      if (dirtyNow() && !confirm('Das aktuelle Projekt hat ungespeicherte Änderungen und wird durch "' + file.name + '" ersetzt. Weiter?')) return;
      if (!dirtyNow() && !confirm('Das aktuelle Projekt wird durch "' + file.name + '" ersetzt. Weiter?')) return;
      const added = [], failed = [], map = {};
      for (const f of fonts) {                     // eigene Schriften des Projekts: gleiche Datei schon da = benutzen, sonst hinzufügen
        const have = App.fonts.list(), same = have.find((x) => x.data === f.data);
        if (same) { if (same.id !== f.id) map[f.id] = same.id; continue; }
        try { const r = await App.fonts.add({ name: F.freeName(f.name, have.map((x) => x.name)), ext: f.ext, data: f.data }); map[f.id] = r.id; added.push(r.name); } catch (e) { failed.push(f.name); }
      }
      F.remapFonts(state, map);
      await App.restore(state, images);
      projHandle = hd || null; projName = file.name; savedAt = App.changes; savedMsg = 'geöffnet: '; showInfo();
      openDlg('Projekt geöffnet', h('p', { class: 'dmsg' }, 'Einstellungen und ' + Object.keys(images).length + ' Bild(er) wurden geladen.' + (missing.length ? ' Nicht gefunden: ' + missing.join(', ') + '.' : '') + (hd ? ' "Speichern" überschreibt jetzt diese Datei.' : '')),
        added.length ? h('p', { class: 'dmsg' }, added.length + ' eigene Schrift(en) wurden hinzugefügt: ' + added.join(', ')) : '',
        failed.length ? h('p', { class: 'dmsg err' }, failed.length + ' Schrift(en) konnten nicht hinzugefügt werden (zu viele eigene Schriften?): ' + failed.join(', ') + '. Texte damit erscheinen in "Normal".') : '',
        h('div', { class: 'drow' }, h('button', { type: 'button', onclick: closeDlg }, 'Schließen')));
    } catch (e) {
      openDlg('Projekt öffnen', h('p', { class: 'dmsg err' }, 'Das Projekt konnte nicht geladen werden: ' + (e.message || e)), h('div', { class: 'drow' }, h('button', { type: 'button', onclick: closeDlg }, 'Schließen')))
    }
  }
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(false); } });

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
  const recipeInput = $('#recipeFile'), projectInput = $('#projectFile');
  $('#bRecipe').addEventListener('click', () => recipeInput.click());
  recipeInput.addEventListener('change', () => { const f = recipeInput.files[0]; recipeInput.value = ''; if (f) onRecipeFile(f); });
  $('#bBrowserSave').addEventListener('click', () => saveToBrowser());
  $('#bSave').addEventListener('click', () => saveProject(false));
  $('#bProjExport').addEventListener('click', () => saveProject(true));
  $('#bProjImport').addEventListener('click', openProject);
  projectInput.addEventListener('change', () => { const f = projectInput.files[0]; projectInput.value = ''; if (f) importProject(f); });
  $('#bSteam').addEventListener('click', openSteam);
  $('#bGog').addEventListener('click', openGog);
  $('#bSettings').addEventListener('click', openSettings);
  document.querySelectorAll('.drop .sg').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); const key = b.closest('.drop').dataset.img; key === 'publisher' ? openPublisherLogo() : openSteamGridDB(key); }));

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
