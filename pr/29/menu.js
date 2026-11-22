/* Menü-Teil (früher Konfigurator): Oberfläche. Liegt in <section id="viewMenu"> der gemeinsamen Seite. */
/* === UI === */
(() => {
  if (typeof document === 'undefined') return;
  const {PROVIDERS, silentAvailable, installCommand, defaultTarget, formatMB, describeResult, parseArgs, isUrl, checkDisc, slug, newItem, newGame, newState, buildZip, readZip, validate, buildMenu, parseMenu, usedIds, sane, htmlToText, rankByName, epicText, sortGrids, looksGerman, chunkText, packSettings, unpackSettings} = CORE;
  const GROUPS = {patches:['Spiel','Grafik','Sound','Sprache'], extras:['Musik','Artwork','Dokumente','Videos'], dlcs:[]};
  const MIME = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',wav:'audio/wav',ogg:'audio/ogg',mp3:'audio/mpeg'};
  const assets = new Map(); let state = newState(); let sel = 0; let counter = 1; let touched = false;
  const $ = s => document.querySelector(s);

  function h(tag, props, ...kids){
    const e = document.createElement(tag); let val;
    for (const [k,v] of Object.entries(props || {})){
      if (k === 'class') e.className = v;
      else if (k === 'value') val = v;
      else if (k === 'checked') e.checked = !!v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()){ if (kid == null || kid === false) continue; e.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
    if (val !== undefined) e.value = val;
    return e;
  }
  const fmt = n => n < 1024 ? n + ' B' : n < 1048576 ? (n/1024).toFixed(0) + ' KB' : (n/1048576).toFixed(1) + ' MB';
  let toastT; function toast(m){ const t = $('#mToast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 5000); }

  function addAsset(data, ext){ const id = 'a' + (counter++); assets.set(id, {data, ext}); return id; }
  function assetUrl(id){ const a = assets.get(id); if (!a) return ''; if (!a.url) a.url = URL.createObjectURL(new Blob([a.data], {type: MIME[a.ext] || ''})); return a.url; }

  async function processImage(file, kind){
    let bmp;
    try { bmp = await createImageBitmap(file); } catch (e) { throw new Error('Das Bild konnte nicht gelesen werden. Bitte PNG, JPEG oder WebP verwenden.'); }
    const max = kind === 'background' ? 1920 : 800, sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * sc)), hh = Math.max(1, Math.round(bmp.height * sc));
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    const ctx = c.getContext('2d');
    if (kind === 'background'){ ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,hh); }
    ctx.drawImage(bmp, 0, 0, w, hh);
    const mime = kind === 'background' ? 'image/jpeg' : 'image/png';
    const blob = await new Promise(r => c.toBlob(r, mime, 0.88));
    if (!blob) throw new Error('Das Bild konnte nicht umgewandelt werden.');
    return {data: new Uint8Array(await blob.arrayBuffer()), ext: kind === 'background' ? 'jpg' : 'png'};
  }

  /* --- SteamGridDB-Anbindung --- */
  const SG_BASE = 'https://www.steamgriddb.com/api/v2';
  const store = {
    get(k){ try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set(k,v){ try { if (v) localStorage.setItem(k,v); else localStorage.removeItem(k); } catch (e) { /* ignorieren */ } }
  };
  const cfg = { get key(){ return store.get('sgdb-key'); }, get proxy(){ return store.get('sgdb-proxy'); } };
  const CORS_HINT = 'Die Anfrage wurde vom Browser blockiert oder es gibt keine Verbindung. Meist liegt das an CORS: Der Dienst erlaubt Anfragen aus dem Browser eventuell nicht. Trage in den SteamGridDB-Einstellungen einen eigenen Proxy ein (siehe docs/steamgriddb.md).';

  async function net(url, init){
    const proxy = cfg.proxy;
    const target = proxy ? proxy.split('{url}').join(encodeURIComponent(url)) : url;
    try { return await fetch(target, init); }
    catch (e) { throw new Error(proxy ? 'Der Proxy ist nicht erreichbar oder blockiert die Anfrage. Bitte die Proxy-Adresse prüfen.' : CORS_HINT); }
  }
  async function sgGet(path, params){
    if (!cfg.key) throw new Error('Bitte zuerst den SteamGridDB-API-Schlüssel in den Einstellungen eintragen (Knopf "SteamGridDB" oben).');
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const r = await net(SG_BASE + path + qs, {headers: {Authorization: 'Bearer ' + cfg.key}});
    let j = null; try { j = await r.json(); } catch (e) { /* kein JSON */ }
    if (r.status === 401 || r.status === 403) throw new Error('Der API-Schlüssel wurde abgelehnt. Bitte in den SteamGridDB-Einstellungen prüfen.');
    if (!r.ok || !j || j.success === false) throw new Error((j && j.errors && j.errors[0]) || ('SteamGridDB hat mit Fehler ' + r.status + ' geantwortet.'));
    return j.data;
  }
  async function fetchImage(url){
    let r;
    try { r = await fetch(url); }
    catch (e) {
      if (!cfg.proxy) throw new Error('Das Bild konnte nicht geladen werden (vermutlich CORS). Lade es bei SteamGridDB herunter und ziehe es in das Bildfeld, oder richte einen Proxy ein.');
      r = await net(url);
    }
    if (!r.ok) throw new Error('Das Bild konnte nicht geladen werden (Fehler ' + r.status + ').');
    return await r.blob();
  }
  /* --- Links zu Anleitung und Diensten --- */
  const REPO = 'https://github.com/EinMensch002/DiscMenu-Builder';
  const LINKS = {sgdb: 'https://www.steamgriddb.com/', sgdbKey: 'https://www.steamgriddb.com/profile/preferences/api',
    cf: 'https://dash.cloudflare.com/', worker: REPO + '/blob/main/tools/cors-proxy/worker.js'};
  const ext = (text, url) => h('a', {href: url, target: '_blank', rel: 'noopener noreferrer'}, text + ' ↗');
  const docLink = (text, file, anchor) => ext(text, REPO + '/blob/main/docs/' + file + (anchor ? '#' + anchor : ''));
  function showMsg(el, text){ el.textContent = text; if (/CORS|Proxy/i.test(text)) el.append(' ', docLink('Anleitung zum Proxy', 'steamgriddb.md', 'proxy-cors')); }

  /* --- Dialog --- */
  const dlg = $('#mDlg');
  function openDlg(title, ...nodes){
    $('#mDlgTitle').textContent = title; $('#mDlgBody').replaceChildren(...nodes.flat().filter(Boolean));
    if (!dlg.open){ if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open',''); }
  }
  function closeDlg(){ if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }

  /* --- Suche und Bildauswahl ---
     o: {type:'grids'|'heroes', term, title, finishLabel, withDescription, allowNoImage, onDone({game,image,description})} */
  function sgdbPicker(o){
    const stepSearch = () => {
      const input = h('input', {type:'text', placeholder:'Spieltitel, z. B. Stronghold', value: o.term || ''});
      const msg = h('p', {class:'hint'}, cfg.key ? '' : 'Für die Suche wird ein API-Schlüssel benötigt. Trage ihn über den Knopf "SteamGridDB" oben ein.');
      const list = h('div', {class:'list'});
      const go = async () => {
        const t = input.value.trim(); if (!t) return;
        msg.textContent = 'Suche läuft ...'; list.replaceChildren();
        try {
          const res = await sgGet('/search/autocomplete/' + encodeURIComponent(t));
          msg.textContent = res.length ? 'Spiel auswählen:' : 'Keine Treffer. Anderen Titel versuchen.';
          list.replaceChildren(...res.slice(0,20).map(g => {
            const y = typeof g.release_date === 'number' ? new Date(g.release_date * 1000).getFullYear() : 0;
            return h('button', {type:'button', onclick: () => stepGallery(g)}, g.name + (g.verified ? ' ✓' : '') + (y > 1970 ? ' · ' + y : ''));
          }));
        } catch (e) { showMsg(msg, e.message); }
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); go(); } });
      openDlg(o.title || 'Bei SteamGridDB suchen', h('div', {class:'row'}, input, h('button', {type:'button', class:'pri', onclick: go}, 'Suchen')), msg, list,
        h('p', {class:'hint'}, ext('SteamGridDB', LINKS.sgdb), ' · ', docLink('Anleitung', 'steamgriddb.md', 'was-möglich-ist')));
      if (o.term && cfg.key) go();
    };

    const stepGallery = async game => {
      let chosen = null;
      const msg = h('p', {class:'hint'}, 'Bilder werden geladen ...');
      const gal = h('div', {class:'gal'});
      const fmtSel = o.type === 'heroes' ? null : h('select', {onchange: () => load()},
        h('option', {value:'600x900,342x482,660x930'}, 'Hochformat (Cover)'), h('option', {value:'920x430,460x215'}, 'Querformat'), h('option', {value:''}, 'Alle Formate'));
      const desc = o.withDescription ? descBlock({name: () => game.name, game, withCheck: true}) : null;
      const okBtn = h('button', {type:'button', class:'pri'}, o.finishLabel || 'Übernehmen');
      const finish = async useImage => {
        okBtn.disabled = true; msg.textContent = 'Bild wird übernommen ...';
        try {
          let image = null;
          if (useImage && chosen) image = await processImage(await fetchImage(chosen.url), o.type === 'heroes' ? 'background' : 'cover');
          await o.onDone({game, image, description: desc ? desc.value() : ''});
          closeDlg();
        } catch (e) { showMsg(msg, e.message); okBtn.disabled = false; }
      };
      okBtn.addEventListener('click', () => { if (!chosen && !o.allowNoImage){ msg.textContent = 'Bitte zuerst ein Bild auswählen.'; return; } finish(true); });
      const load = async () => {
        gal.replaceChildren(); chosen = null; msg.textContent = 'Bilder werden geladen ...';
        try {
          const params = {types:'static', nsfw:'false'}; if (fmtSel && fmtSel.value) params.dimensions = fmtSel.value;
          const list = sortGrids(await sgGet((o.type === 'heroes' ? '/heroes/game/' : '/grids/game/') + game.id, params)).slice(0,60);
          msg.textContent = list.length ? 'Bild auswählen (' + list.length + ' angezeigt):' : 'Keine Bilder in diesem Format gefunden.';
          gal.replaceChildren(...list.map(it => {
            const b = h('button', {type:'button', onclick: () => { gal.querySelectorAll('button').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); chosen = it; }},
              h('img', {src: it.thumb || it.url, alt:'', loading:'lazy', referrerpolicy:'no-referrer'}),
              h('small', {}, (it.width && it.height ? it.width + '×' + it.height : '') + (it.language ? ' · ' + it.language : '') + (it.style ? ' · ' + it.style : '')));
            return b;
          }));
        } catch (e) { showMsg(msg, e.message); }
      };
      openDlg(game.name,
        h('div', {class:'row'}, h('button', {type:'button', class:'sm', onclick: stepSearch}, '← Andere Suche'), fmtSel),
        msg, gal,
        desc ? desc.node : null,
        h('div', {class:'row'}, okBtn, o.allowNoImage ? h('button', {type:'button', onclick: () => finish(false)}, 'Ohne Bild übernehmen') : null));
      load();
      if (desc) desc.load();
    };
    stepSearch();
  }

  function addGameViaSgdb(){
    sgdbPicker({type:'grids', term:'', title:'Spiel über SteamGridDB hinzufügen', finishLabel:'Spiel anlegen', withDescription:true, allowNoImage:true,
      onDone: ({game, image, description}) => {
        const g = newGame(); g.name = game.name;
        if (image) g.cover = addAsset(image.data, image.ext);
        if (description) g.description = description;
        const only = state.games.length === 1 ? state.games[0] : null;
        const empty = only && !only.name && !only.cover && !only.description && !only.installer && !only.args && !only.estimatedSizeMB && !only.dlcs.length && !only.patches.length && !only.extras.length;
        if (empty) state.games[0] = g; else state.games.push(g);
        sel = state.games.indexOf(g); renderAll(); changed();
      }});
  }

  /* --- Beschreibungen: Quellen, Übersetzung, Dialog --- */
  /* Quellen für Beschreibungen: Steam-Shop, GOG und Epic Games Store (alle drei brauchen meist den Proxy) */
  async function steamDescriptions(name, game){
    const ids = [];
    if (game && game.id) try {
      const gd = await sgGet('/games/id/' + game.id, {platformdata: 'steam'});
      const st = gd && gd.external_platform_data && gd.external_platform_data.steam;
      if (Array.isArray(st) && st[0] && st[0].id) ids.push(String(st[0].id));
    } catch (e) { /* weiter mit der Steam-Suche */ }
    const r = await net('https://store.steampowered.com/api/storesearch/?l=german&cc=DE&term=' + encodeURIComponent(name));
    const j = await r.json();
    for (const it of rankByName(name, j.items, i => i.name, 3)){ const id = String(it.id); if (!ids.includes(id)) ids.push(id); }
    const out = await Promise.all(ids.slice(0,3).map(async id => {
      const r2 = await net('https://store.steampowered.com/api/appdetails?l=german&appids=' + id);
      const j2 = await r2.json(); const d = j2 && j2[id] && j2[id].data;
      const text = d ? htmlToText(d.short_description || '') : '';
      return text ? {label: 'Steam-Shop: ' + (d.name || id), lang: looksGerman(text) ? 'de' : 'en', text, url: 'https://store.steampowered.com/app/' + id} : null;
    }));
    return out.filter(Boolean);
  }
  async function gogDescriptions(name){
    const q = new URLSearchParams({limit:'10', query:'like:' + name, order:'desc:score', productType:'in:game,pack,dlc', page:'1', countryCode:'DE', locale:'de-DE', currencyCode:'EUR'});
    const r = await net('https://catalog.gog.com/v1/catalog?' + q.toString());
    if (!r.ok) throw new Error('GOG hat mit Fehler ' + r.status + ' geantwortet.');
    const j = await r.json();
    const list = (Array.isArray(j.products) ? j.products : []).map(p => ({id: String(p.id || p.productId || ''), title: String(p.title || p.name || ''), slug: p.slug || ''})).filter(p => p.id && p.title);
    const out = await Promise.all(rankByName(name, list, p => p.title, 3).map(async p => {
      const r2 = await net('https://api.gog.com/products/' + encodeURIComponent(p.id) + '?expand=description&locale=de-DE');
      if (!r2.ok) return null;
      const d = (await r2.json()).description; if (!d) return null;
      const text = CORE.trimIntro(htmlToText(d.full || d.lead || ''), 700);
      return text ? {label: 'GOG: ' + p.title, lang: looksGerman(text) ? 'de' : 'en', text, url: p.slug ? 'https://www.gog.com/game/' + p.slug : ''} : null;
    }));
    return out.filter(Boolean);
  }
  async function epicDescriptions(name){
    const base = slug(name), out = [];
    for (const sg of [...new Set([base, base.replace(/^the-/, '')])].filter(Boolean)){
      const r = await net('https://store-content.ak.epicgames.com/api/de/content/products/' + encodeURIComponent(sg));
      if (!r.ok) continue;
      const t = epicText(await r.json()); if (!t) continue;
      const text = CORE.trimIntro(t.text, 700);
      out.push({label: 'Epic Games Store: ' + (t.title || sg), lang: looksGerman(text) ? 'de' : 'en', text, url: 'https://store.epicgames.com/de/p/' + sg});
    }
    return out;
  }
  async function findDescriptions(name, game){
    const sources = [['Steam', () => steamDescriptions(name, game)], ['GOG', () => gogDescriptions(name)], ['Epic', () => epicDescriptions(name)]];
    const res = await Promise.allSettled(sources.map(([, fn]) => fn()));
    const items = [], failed = new Map();
    res.forEach((r, i) => {
      if (r.status === 'fulfilled') items.push(...r.value);
      else { const m = String((r.reason && r.reason.message) || r.reason); failed.set(m, (failed.get(m) || []).concat(sources[i][0])); }
    });
    const errors = [...failed].map(([m, names]) => names.join(', ') + ': ' + m);   // gleiche Meldung nur einmal zeigen
    items.sort((a,b) => (b.lang === 'de') - (a.lang === 'de'));
    return {items, errors};
  }
  async function translateToGerman(text){
    const out = [];
    for (const para of chunkText(text, 450)){
      const parts = [];
      for (const chunk of para){
        let r; try { r = await fetch('https://api.mymemory.translated.net/get?langpair=en%7Cde&q=' + encodeURIComponent(chunk)); } catch (e) { throw new Error('Der Übersetzungsdienst ist nicht erreichbar oder blockiert die Anfrage.'); }
        const j = await r.json().catch(() => null);
        if (!r.ok || !j || Number(j.responseStatus) !== 200 || !j.responseData) throw new Error((j && j.responseDetails) || 'Der Übersetzungsdienst hat nicht geantwortet.');
        parts.push(htmlToText(j.responseData.translatedText || ''));
      }
      out.push(parts.join(' '));
    }
    return out.join('\n');
  }
  function descBlock(o){
    let items = [];
    const info = h('small', {}, '');
    const sel = h('select', {onchange: () => { const it = items[sel.selectedIndex]; if (it){ ta.value = it.text; note(it); refresh(); } }}); sel.hidden = true;
    const ta = h('textarea', {rows:5, placeholder:'Beschreibung', oninput: () => refresh()});
    const tr = h('button', {type:'button', class:'sm', onclick: async () => {
      tr.disabled = true; info.textContent = 'Übersetze ...';
      try { ta.value = await translateToGerman(ta.value); info.textContent = 'Maschinell übersetzt (MyMemory). Bitte kurz prüfen.'; }
      catch (e) { info.textContent = /MYMEMORY WARNING/i.test(e.message) ? 'Das kostenlose Tageslimit des Übersetzungsdienstes ist aufgebraucht. Bitte später erneut versuchen.' : e.message; }
      tr.disabled = false; refresh();
    }}, 'Ins Deutsche übersetzen'); tr.hidden = true;
    const chk = o.withCheck ? h('input', {type:'checkbox', checked:true}) : null;
    function refresh(){ tr.hidden = !ta.value.trim() || looksGerman(ta.value); }
    function note(it){ info.textContent = 'Quelle: ' + it.label + (it.lang === 'de' ? ' (Deutsch)' : ' (Englisch, lässt sich übersetzen)') + (it.url ? ' · ' + it.url : ''); }
    const node = h('div', {class:'f'}, chk ? h('label', {class:'row'}, chk, 'Beschreibung übernehmen') : null, sel, ta, h('div', {class:'row'}, tr), info, h('small', {}, docLink('Hilfe zur Beschreibungssuche', 'steamgriddb.md', 'beschreibungen')));
    return {node, value: () => (chk && !chk.checked) ? '' : ta.value.trim(),
      async load(){
        info.textContent = 'Beschreibung wird gesucht ...'; sel.hidden = true; items = [];
        const r = await findDescriptions(o.name(), o.game);
        items = r.items; sel.replaceChildren(...items.map(i => h('option', {}, i.label + (i.lang === 'de' ? '' : ' (Englisch)')))); sel.hidden = items.length < 2;
        if (items.length){ sel.selectedIndex = 0; ta.value = items[0].text; note(items[0]); }
        else { if (chk) chk.checked = false; showMsg(info, 'Keine Beschreibung gefunden.' + (r.errors.length ? ' ' + r.errors.join(' ') : '')); }
        refresh();
      }};
  }
  function openDescDialog(o){
    const input = h('input', {type:'text', placeholder:'Titel', value: o.term || ''});
    const blk = descBlock({name: () => input.value.trim()});
    const go = () => { if (input.value.trim()) blk.load(); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); go(); } });
    openDlg('Beschreibung suchen', h('div', {class:'row'}, input, h('button', {type:'button', class:'pri', onclick: go}, 'Suchen')), blk.node,
      h('div', {class:'row'}, h('button', {type:'button', class:'pri', onclick: () => { const t = blk.value(); if (!t){ toast('Es gibt noch keine Beschreibung zum Übernehmen.'); return; } o.onDone(t); closeDlg(); }}, 'Übernehmen')));
    go();
  }
  const descBtn = (obj, termFn) => h('button', {type:'button', class:'sm sgbtn', onclick: () => openDescDialog({term: termFn(), onDone: t => { obj.description = t; renderEditor(); touch(); }})}, '🔎 Beschreibung suchen');

  /* --- Eingabefelder --- */
  let tT; function touch(){ clearTimeout(tT); tT = setTimeout(() => { renderNav(); renderSide(); changed(); }, 250); }
  function wrap(label, input, hint){ return h('label', {class:'f'}, h('span',{class:'lab'},label), input, hint ? h('small',{},hint) : null); }
  function txt(obj, key, o = {}){
    const el = h(o.multiline ? 'textarea' : 'input', {type: o.multiline ? null : (o.type || 'text'), placeholder: o.ph || '', rows: o.multiline ? 3 : null, list: o.list || null,
      oninput: () => { obj[key] = el.value; if (o.on) o.on(el.value); touch(); }});
    el.value = obj[key]; return el;
  }
  function fileField(label, obj, key, o){
    const box = h('div', {class:'drop'});
    const draw = () => {
      box.replaceChildren(); const id = obj[key];
      if (id && assets.has(id)){
        const a = assets.get(id);
        box.append(o.kind === 'sound' ? h('audio', {controls:true, src:assetUrl(id)}) : h('img', {src:assetUrl(id), alt:''}),
          h('span',{class:'meta'}, a.ext.toUpperCase() + ', ' + fmt(a.data.length)),
          h('button', {type:'button', class:'sm', onclick: () => { obj[key] = null; draw(); touch(); }}, 'Entfernen'));
      } else box.append(h('span',{class:'hint'}, o.kind === 'sound' ? 'Sound hierher ziehen oder tippen (WAV, OGG, MP3)' : 'Bild hierher ziehen oder tippen'));
    };
    const take = async f => {
      try {
        if (o.kind === 'sound'){
          const ext = (f.name.split('.').pop() || '').toLowerCase();
          if (!['wav','ogg','mp3'].includes(ext)) throw new Error('Nur WAV, OGG oder MP3 werden unterstützt.');
          obj[key] = addAsset(new Uint8Array(await f.arrayBuffer()), ext);
          if (f.size > 2097152) toast('Hinweis: Die Datei ist größer als 2 MB und macht die Menü-EXE größer.');
        } else { const r = await processImage(f, o.kind); obj[key] = addAsset(r.data, r.ext); }
        draw(); touch();
      } catch (e) { toast(e.message || 'Die Datei konnte nicht gelesen werden.'); }
    };
    const inp = h('input', {type:'file', accept: o.kind === 'sound' ? 'audio/*,.wav,.ogg,.mp3' : 'image/*', hidden:true, onchange: async () => { if (inp.files[0]) await take(inp.files[0]); inp.value = ''; }});
    box.addEventListener('click', e => { if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'AUDIO') inp.click(); });
    box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('over'); });
    box.addEventListener('dragleave', () => box.classList.remove('over'));
    box.addEventListener('drop', async e => { e.preventDefault(); box.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) await take(f); });
    draw();
    const sg = o.kind === 'sound' ? null : h('button', {type:'button', class:'sm sgbtn', onclick: () => sgdbPicker({
      type: o.kind === 'background' ? 'heroes' : 'grids', term: o.term ? o.term() : '',
      title: o.kind === 'background' ? 'Hintergrund bei SteamGridDB suchen' : 'Cover bei SteamGridDB suchen', finishLabel: 'Bild übernehmen',
      onDone: ({image}) => { if (image){ obj[key] = addAsset(image.data, image.ext); draw(); touch(); } }
    })}, '🔎 Bei SteamGridDB suchen');
    return h('div', {class:'f'}, h('span',{class:'lab'},label), box, sg, inp, o.hint ? h('small',{},o.hint) : null);
  }

  function move(arr, i, d){ const j = i + d; if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; }

  function itemCard(g, key, idx){
    const it = g[key][idx];
    const nameSpan = h('span', {}, it.name || '(ohne Namen)');
    const chip = h('span', {class:'chip'}, it.group); chip.hidden = !it.group;
    const d = h('details', {class:'card', ontoggle: () => { it._open = d.open; }}, h('summary', {}, nameSpan, chip));
    if (it._open) d.open = true;
    const kind = h('select', {value: it.kind, onchange: () => { it.kind = kind.value; renderEditor(); touch(); }},
      h('option', {value:'installer'}, 'Installer starten'), h('option', {value:'open'}, 'Datei, Ordner oder Link öffnen'));
    kind.value = it.kind;
    const body = h('div', {class:'body'},
      wrap('Name', txt(it,'name',{ph:'z. B. Deutscher Sprachpatch', on: v => { nameSpan.textContent = v || '(ohne Namen)'; }})),
      wrap('Gruppe (Unterkategorie, optional)', txt(it,'group',{list:'dl-'+key, on: v => { chip.textContent = v; chip.hidden = !v; }})),
      wrap('Beschreibung (optional)', txt(it,'description',{multiline:true})),
      descBtn(it, () => it.name || g.name),
      fileField('Bild (optional)', it, 'cover', {kind:'cover', term: () => g.name}),
      wrap('Aktion', kind),
      wrap(it.kind === 'installer' ? 'Installer-Pfad auf der Disc' : 'Pfad auf der Disc oder Link (https://...)', txt(it,'path',{ph: it.kind === 'installer' ? 'Spiel1/Patches/patch.exe' : 'Spiel1/Extras/Soundtrack'})),
      it.kind === 'installer' ? wrap('Zusätzliche Parameter (optional)', txt(it,'args',{ph:'/NORESTART'}), 'Mit Leerzeichen getrennt. Parameter mit Leerzeichen in Anführungszeichen setzen.') : null,
      h('div', {class:'row'},
        h('button',{type:'button',class:'sm',onclick:() => { if (move(g[key],idx,-1)){ renderEditor(); touch(); } }},'↑ Nach oben'),
        h('button',{type:'button',class:'sm',onclick:() => { if (move(g[key],idx,1)){ renderEditor(); touch(); } }},'↓ Nach unten'),
        h('button',{type:'button',class:'sm danger',onclick:() => { g[key].splice(idx,1); renderEditor(); touch(); }},'Entfernen')));
    d.append(body); return d;
  }
  function section(g, key, title, hint){
    return h('div', {}, h('h3', {}, title + ' (' + g[key].length + ')'), h('p',{class:'hint'},hint),
      h('datalist', {id:'dl-'+key}, GROUPS[key].map(x => h('option',{value:x}))),
      g[key].map((_,i) => itemCard(g,key,i)),
      h('button',{type:'button',onclick:() => { g[key].push(newItem()); renderEditor(); touch(); }},'+ Eintrag hinzufügen'));
  }

  function discForm(){
    return h('div', {}, h('h2',{},'Disc-Einstellungen'), h('p',{class:'hint'},'Gilt für das ganze Menü.'),
      wrap('Titel des Menüs', txt(state,'title',{ph:'z. B. Stronghold Collection'})),
      wrap('Dateiname der Menü-EXE (optional)', txt(state,'output',{ph:'Setup-Menu.exe'})),
      fileField('Hintergrundbild (optional)', state, 'background', {kind:'background', term: () => (state.games[0] ? state.games[0].name : ''), hint:'Wird auf höchstens 1920 Pixel verkleinert und als JPEG gespeichert.'}),
      fileField('Klick-Sound (optional)', state.sounds, 'click', {kind:'sound'}),
      fileField('Hover-Sound (optional)', state.sounds, 'hover', {kind:'sound'}));
  }
  function providerSelect(g){
    const sel = h('select', {onchange: () => { g.provider = sel.value; renderEditor(); renderNav(); touch(); }},
      Object.entries(PROVIDERS).map(([id, p]) => h('option', {value:id}, p.name)));
    sel.value = g.provider || 'gog'; return sel;
  }
  function gameForm(g, i){
    return h('div', {},
      h('div',{class:'row'}, h('h2',{style:'flex:1'}, 'Spiel ' + i),
        h('button',{type:'button',class:'sm',onclick:() => { if (move(state.games,i,-1)){ sel = i-1; renderAll(); changed(); } }},'↑'),
        h('button',{type:'button',class:'sm',onclick:() => { if (move(state.games,i,1)){ sel = i+1; renderAll(); changed(); } }},'↓'),
        h('button',{type:'button',class:'sm danger',onclick:() => { if (confirm('Dieses Spiel mit allen Einträgen löschen?')){ state.games.splice(i,1); sel = state.games.length ? Math.min(i, state.games.length-1) : 'disc'; renderAll(); changed(); } }},'Löschen')),
      h('p',{class:'hint'},'Der Index ergibt sich aus der Reihenfolge der Spiele (0, 1, 2 ...).'),
      wrap('Name', txt(g,'name',{ph:'z. B. Stronghold HD'})),
      wrap('Quelle des Spiels', providerSelect(g), PROVIDERS[g.provider || 'gog'].note || 'Bestimmt Abzeichen, Farbe und Installationsweg im Menü.'),
      fileField('Cover (optional)', g, 'cover', {kind:'cover', term: () => g.name, hint:'Wird auf höchstens 800 Pixel verkleinert und als PNG gespeichert.'}),
      wrap('Beschreibung (optional)', txt(g,'description',{multiline:true})),
      descBtn(g, () => g.name),
      wrap('Installer-Pfad auf der Disc', txt(g,'installer',{ph:'Stronghold/setup_stronghold.exe'}), 'Relativ zur Disc-Wurzel, mit Schrägstrich.'),
      wrap('Zusätzliche Parameter für die stille Installation (optional)', txt(g,'args',{ph:'/NORESTART'})),
      wrap('Geschätzte installierte Größe in MB (optional)', txt(g,'estimatedSizeMB',{type:'number',ph:'1500'}), 'Für die Fortschrittsanzeige bei stiller Installation.'),
      section(g,'dlcs','DLCs / Erweiterungen','Zusätzliche Installer zum Spiel.'),
      section(g,'patches','Patches','Z. B. Sprach-, Grafik- oder Sound-Patches. Mit "Gruppe" lassen sie sich unterteilen.'),
      section(g,'extras','Extras','Soundtrack, Artbooks, Handbücher und mehr. Mit "Gruppe" lassen sie sich unterteilen.'));
  }

  function providerChip(g){ const p = PROVIDERS[g.provider || 'gog']; return h('span', {class:'chip', style:'margin-left:6px;color:' + p.color + ';border-color:' + p.color}, p.name); }
  function renderNav(){
    $('#nav').replaceChildren(
      h('button',{type:'button',class:'nv' + (sel==='disc' ? ' on' : ''),onclick:() => { sel = 'disc'; renderAll(); }}, '⚙ Disc-Einstellungen'),
      ...state.games.map((g,i) => h('button',{type:'button',class:'nv' + (sel===i ? ' on' : ''),onclick:() => { sel = i; renderAll(); }}, h('b',{},String(i)), ' ', g.name || '(ohne Namen)', providerChip(g))),
      h('button',{type:'button',class:'nv add',onclick:() => { state.games.push(newGame()); sel = state.games.length-1; renderAll(); changed(); }}, '+ Spiel hinzufügen'),
      h('button',{type:'button',class:'nv add',onclick:addGameViaSgdb}, '🔎 Spiel über SteamGridDB hinzufügen'));
  }
  function renderEditor(){
    const ed = $('#editor'); ed.replaceChildren();
    if (sel === 'disc' || !state.games[sel]) { sel = 'disc'; ed.append(discForm()); } else ed.append(gameForm(state.games[sel], sel));
  }
  function renderSide(){
    const issues = validate(state), errs = issues.filter(i => i.level === 'error').length;
    $('#side').replaceChildren(
      h('div',{class:'box'}, h('h3',{style:'margin-top:0'},'Prüfung'),
        issues.length ? issues.map(i => h('div',{class:'issue ' + i.level}, (i.level === 'error' ? 'Fehler: ' : 'Hinweis: ') + i.msg)) : h('div',{class:'ok'},'Alles in Ordnung. Das Menü kann mit dem Builder erzeugt werden.'),
        typeof window.showDirectoryPicker === 'function' ? h('button',{type:'button',class:'sm',style:'margin-top:10px',onclick:runDiscCheck},'📁 Disc-Ordner prüfen') : h('small',{style:'display:block;margin-top:10px'},'Die Prüfung der Disc-Dateien braucht Chrome oder Edge am Computer.')));
  }
  function renderAll(){ renderNav(); renderEditor(); renderSide(); }

  /* --- Disc-Ordner prüfen --- */
  async function resolveIn(root, path){
    let dir = root; const parts = path.split('/').filter(Boolean);
    const find = async (d, name) => {              // exakt, sonst ohne Beachtung der Groß-/Kleinschreibung (Discs sind meist unempfindlich)
      for (const kind of ['getDirectoryHandle','getFileHandle']){ try { return [kind === 'getDirectoryHandle' ? 'dir' : 'file', await d[kind](name)]; } catch (e) { /* weiter */ } }
      for await (const [n, hd] of d.entries()) if (n.toLowerCase() === name.toLowerCase()) return [hd.kind === 'directory' ? 'dir' : 'file', hd];
      return null;
    };
    for (let i = 0; i < parts.length; i++){
      const r = await find(dir, parts[i]); if (!r) return null;
      if (i === parts.length - 1) return r[0];
      if (r[0] !== 'dir') return null; dir = r[1];
    }
    return 'dir';
  }
  async function runDiscCheck(){
    let root; try { root = await window.showDirectoryPicker({mode:'read'}); } catch (e) { if (!(e && e.name === 'AbortError')) toast('Ordner konnte nicht geöffnet werden: ' + (e.message || e)); return; }
    openDlg('Disc-Ordner wird geprüft ...', h('p', {class:'hint'}, 'Einen Moment.'));
    const r = await checkDisc(state, p => resolveIn(root, p));
    const errs = r.issues.filter(i => i.level === 'error').length;
    openDlg('Disc-Prüfung: ' + root.name,
      h('p', {class: errs ? 'issue error' : 'ok'}, errs ? errs + ' Problem(e) bei ' + r.checked + ' geprüften Pfaden.' : 'Alle ' + r.checked + ' Pfade gefunden.'),
      r.issues.map(i => h('div', {class:'issue ' + i.level}, (i.level === 'error' ? 'Fehler: ' : 'Hinweis: ') + i.msg)),
      h('p', {class:'hint'}, 'Es wird nur gelesen, nichts verändert und nichts hochgeladen. Der Ordner sollte so aufgebaut sein wie die fertige Disc (Wurzel = Ordner, in dem die Menü-EXE liegt).'));
  }

  /* --- JSON bearbeiten --- */
  function openJsonEditor(){
    const {menu, map} = buildMenu(state, assets);
    const byPath = new Map([...map].map(([id,pth]) => [pth,id]));
    const ta = h('textarea', {class:'code', spellcheck:'false'}); ta.value = JSON.stringify(menu, null, 2) + '\n';
    const msg = h('div', {class:'issue'}); 
    const apply = h('button', {type:'button', class:'pri', onclick: () => {
      let m; try { m = JSON.parse(ta.value); } catch (e) { msg.className = 'issue error'; msg.textContent = 'Kein gültiges JSON: ' + e.message; return; }
      try {
        const r = parseMenu(m, p => byPath.get(String(p).replace(/\\/g,'/')) || null);
        state = r.state; sel = 0; renderAll(); changed(); closeDlg();
        toast(r.notes.length ? 'Übernommen, mit Hinweisen:\n' + r.notes.slice(0,6).join('\n') : 'Änderungen übernommen. Die Prüfung rechts zeigt, ob alles passt.');
      } catch (e) { msg.className = 'issue error'; msg.textContent = e.message || String(e); }
    }}, 'Änderungen übernehmen');
    openDlg('menu.json bearbeiten',
      h('p', {class:'hint'}, 'Bilder und Sounds bleiben über ihren Pfad (assets/...) verbunden. Neue Dateien lassen sich nur in der Maske hinzufügen. Felder, die das Format nicht kennt, werden verworfen. Das Schema liegt unter ',
        h('a', {href:'https://github.com/EinMensch002/DiscMenu-Builder/blob/main/schema/menu.schema.json', target:'_blank', rel:'noopener noreferrer'}, 'schema/menu.schema.json'), '.'),
      ta, msg, h('div', {class:'row', style:'margin-top:10px'}, apply, h('button', {type:'button', onclick:closeDlg}, 'Abbrechen')));
  }

  /* --- Vorschau mit Simulation: bildet den Player nach (Layout, Farben, Anbieter-Look, Installationsablauf) --- */
  const hexRgb = c => [1,3,5].map(i => parseInt(c.slice(i, i+2), 16));
  const inkFor = c => { const [r,g,b] = hexRgb(c); return 0.299*r + 0.587*g + 0.114*b > 150 ? '#14161e' : '#ffffff'; };

  function openPreview(){
    const S = {page: state.games.length > 1 ? 'select' : 'game', cur: 0, cat: null, focus: null, silent: false, targets: {}, modal: null,
      result: 'ok', speed: 1, log: [], timers: new Set()};
    const stage = h('div', {class:'stage'}), wrap = h('div', {class:'stagewrap'}, stage);
    const logBox = h('div', {class:'simlog'});
    const say = (msg, strong) => { S.log.push([new Date().toLocaleTimeString('de-DE'), msg, strong]); if (S.log.length > 60) S.log.shift();
      logBox.replaceChildren(...S.log.map(([t,m,b]) => h('div', {}, t + '  ', b ? h('b', {}, m) : m))); logBox.scrollTop = logBox.scrollHeight; };
    const later = (fn, ms) => { const t = setTimeout(() => { S.timers.delete(t); fn(); }, ms / S.speed); S.timers.add(t); return t; };
    const every = (fn, ms) => { const t = setInterval(fn, ms); S.timers.add(t); return t; };
    const stop = t => { clearTimeout(t); clearInterval(t); S.timers.delete(t); };
    const play = k => { const id = state.sounds[k]; if (!id || !assets.has(id)) return; try { const a = new Audio(assetUrl(id)); const r = a.play(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* kein Ton */ } };
    const btn = (label, fn, cls, style) => { const b = h('button', {type:'button', class:'sbtn ' + (cls || ''), style: style || '', onclick: () => { play('click'); fn(); }}, label); b.addEventListener('mouseenter', () => { if (!b.disabled) play('hover'); }); return b; };
    const g = () => state.games[S.cur], P = gm => PROVIDERS[gm.provider || 'gog'];
    const badge = (gm, size) => { const p = P(gm); return h('span', {class:'badge', style:'background:' + p.badge + ';color:' + p.onBadge + ';font-size:' + (size || 14) + 'px;height:' + ((size || 14) + 10) + 'px'}, p.name); };
    const cover = (id, name, w, hh) => h('div', {class:'cover', style:'width:' + w + 'px;height:' + hh + 'px;border-radius:10px;font-size:' + (w > 150 ? 20 : 11) + 'px;padding:8px'}, id && assets.has(id) ? h('img', {src:assetUrl(id), alt:''}) : (name || '(ohne Namen)'));

    function fit(){ const avail = Math.max(300, $('#mDlgBody').clientWidth), sc = Math.max(0.35, Math.min(avail / 1280, (window.innerHeight - 360) / 720));
      wrap.style.width = Math.round(1280 * sc) + 'px'; wrap.style.margin = '0 auto'; stage.style.transform = 'scale(' + sc + ')'; wrap.style.height = Math.round(720 * sc) + 'px'; }
    const onResize = () => fit(); window.addEventListener('resize', onResize);
    dlg.addEventListener('close', () => { window.removeEventListener('resize', onResize); S.timers.forEach(stop); dlg.classList.remove('wide'); }, {once:true});

    /* --- Seiten: klassisches Installer-Fenster (links Bild und Beschreibung, rechts Knöpfe) --- */
    const ICON = {
      arrow:'M7 12h9m-4-4l4 4-4 4', plus:'M12 7v10M7 12h10', up:'M12 17V8m-4 4l4-4 4 4', back:'M16 12H8m4-4l-4 4 4 4', x:'M8 8l8 8M16 8l-8 8',
      doc:'M8 6.5h5.5L17 10v7.5H8zM13.5 6.5V10H17', folder:'M6 9h4l1.5 2H18v6.5H6z', link:'M10 14l4-4m-5.5 1.5L7 13a2.8 2.8 0 004 4l1.5-1.5m3-3L17 11a2.8 2.8 0 00-4-4l-1.5 1.5'
    };
    const icon = (name, color) => { const e = h('span', {class:'ic'}); e.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="' + color + '"/><path d="' + ICON[name] + '" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; return e; };
    const cbtn = (label, ic, color, fn, o = {}) => {
      const b = h('button', {type:'button', class:'cbtn' + (o.main ? ' main' : ''), title: o.title || label, onclick: () => { play('click'); fn(); }},
        ic ? icon(ic, color) : null, h('span', {class:'lb'}, label), o.tag ? h('span', {class:'tg'}, o.tag) : null);
      if (o.disabled) b.disabled = true;
      b.addEventListener('mouseenter', () => { if (!b.disabled) play('hover'); if (o.focus !== undefined){ S.focus = o.focus; fillLeft(); } });
      return b;
    };
    const rule = () => h('div', {class:'rule'});
    let leftEl = null;
    // Linke Seite: zeigt, worauf der Mauszeiger steht. Hat ein Eintrag ein eigenes Bild, wird dieses gezeigt, sonst das Bild des Spiels.
    function fillLeft(){
      if (!leftEl) return;
      const gm = state.games[S.cur] || state.games[0], f = S.focus;
      if (leftEl.lastFocus === f && leftEl.firstChild) return;
      leftEl.lastFocus = f;
      let name, cov, desc, hint = '';
      if (S.page === 'select'){
        // Ist nichts ausgewählt, zeigt die Seite das oberste Spiel. Fährt man über ein anderes, wechselt die Anzeige.
        const sf = f || state.games[0];
        name = sf.name || '(ohne Namen)'; cov = sf.cover; desc = sf.description.trim(); hint = desc ? '' : 'Keine Beschreibung.';
      } else if (f){ name = f.name || '(ohne Namen)'; cov = f.cover && assets.has(f.cover) ? f.cover : gm.cover; desc = f.description.trim(); hint = ''; }
      else { name = gm.name || '(ohne Namen)'; cov = gm.cover; desc = gm.description.trim(); hint = desc ? '' : 'Keine Beschreibung.'; }
      const box = h('div', {class:'cbox'}, cov && assets.has(cov) ? h('img', {src:assetUrl(cov), alt:''}) : name);
      leftEl.replaceChildren(box, h('div', {class:'lname'}, name), h('div', {class:'ldesc' + (desc ? '' : ' mut')}, desc || hint));
    }
    function optionsBar(gm, p){
      if (S.page === 'select' || !p.canInstall) return null;
      const cb = h('input', {type:'checkbox', onchange: () => { play('click'); S.silent = cb.checked; if (S.silent && p.usesTarget && !S.targets[S.cur]) S.targets[S.cur] = defaultTarget(gm.name); say('Stille Installation: ' + (S.silent ? 'an' : 'aus')); draw(); }});
      cb.checked = S.silent;
      const box = h('div', {class:'opts'}, h('label', {}, cb, 'Stille Installation (ohne Fenster des Installers)'));
      if (S.silent && p.usesTarget){
        const f = h('input', {class:'fld2', type:'text', placeholder:'z. B. C:\\GOG Games\\' + (gm.name || ''), oninput: () => { S.targets[S.cur] = f.value; }}); f.value = S.targets[S.cur] || '';
        box.append(h('div', {class:'tr'}, h('span', {}, 'Zielordner'), f, h('button', {type:'button', onclick: () => { play('click'); const v = 'D:\\Spiele\\' + (gm.name || 'Spiel').replace(/[\\/:*?"<>|]/g, ''); S.targets[S.cur] = v; say('Ordnerdialog (simuliert): ' + v); draw(); }}, 'Durchsuchen ...')));
      } else if (S.silent && !p.usesTarget && p.note) box.append(h('div', {class:'note', style:'margin-top:6px'}, p.note));
      return box;
    }
    function windowShell(title, accent, gm, rightTop, rightBottom, opts){
      leftEl = h('div', {class:'lc'});
      const win = h('div', {class:'cw', style:'--acc-c:' + accent},
        h('div', {class:'ttl'}, h('b', {}, title), gm ? badge(gm, 11) : null, h('div', {class:'wb'}, h('span', {}, '–'), h('span', {}, '☐'), h('span', {class:'x', onclick: quit}, '✕'))),
        h('div', {class:'bar', style:'background:' + accent}),
        h('div', {class:'cols'}, leftEl, h('div', {class:'rc'}, h('div', {class:'rtop'}, rightTop), rightBottom)),
        opts);
      fillLeft(); return win;
    }
    const quit = () => { say('"Beenden" gedrückt: Das Menü würde sich schließen.', true); toast('Simulation: Das Menü würde sich jetzt schließen.'); };

    function pageSelect(){
      const list = state.games.map((gm,i) => cbtn(gm.name || '(ohne Namen)', 'arrow', P(gm).accent, () => { S.cur = i; S.cat = null; S.page = 'game'; S.focus = null; say('Spiel geöffnet: ' + (gm.name || '(ohne Namen)')); draw(); }, {focus: gm, tag: P(gm).name}));
      return windowShell(state.title.trim() || '(ohne Titel)', '#5b8cff', null, list, h('div', {}, rule(), cbtn('Beenden', 'x', '#d03a2f', quit)));
    }

    function pageGame(){
      const gm = g(), p = P(gm), multi = state.games.length > 1;
      const cats = ['dlcs','patches','extras'].filter(k => gm[k].length);
      if (S.cat && !cats.includes(S.cat)) S.cat = null;
      const names = {dlcs:'DLCs / Erweiterungen', patches:'Patches', extras:'Extras'}, cicon = {dlcs:['plus','#2b7bd6'], patches:['up','#3aa56b'], extras:['folder','#d6892b']};
      const top = [];
      if (!S.cat){
        top.push(cbtn(p.canInstall ? 'Installieren' : 'Nicht verfügbar', 'arrow', p.canInstall ? p.accent : '#999', () => beginInstall(gm.name, gm.installer, parseArgs(gm.args), gm, p), {main:true, disabled: !p.canInstall, focus: null}));
        if (p.note) top.push(h('div', {class:'note'}, p.note));
        if (cats.length){ top.push(rule()); cats.forEach(k => top.push(cbtn(names[k], cicon[k][0], cicon[k][1], () => { S.cat = k; S.focus = null; draw(); }, {tag: '(' + gm[k].length + ')', focus: null}))); }
      } else {
        top.push(cbtn('Zurück', 'back', '#7a7a7a', () => { S.cat = null; S.focus = null; draw(); }, {focus: null}), rule());
        let last = '\u0000';
        gm[S.cat].forEach(e => {
          if (e.group !== last){ last = e.group; if (e.group) top.push(h('div', {class:'ghd'}, e.group)); }
          const isInst = e.kind === 'installer';
          const ic = isInst ? ['arrow', p.canInstall ? p.accent : '#999'] : (isUrl(e.path.trim()) ? ['link', '#2b7bd6'] : (/\.[a-z0-9]{2,4}$/i.test(e.path.trim()) ? ['doc', '#d6892b'] : ['folder', '#d6892b']));
          top.push(cbtn(e.name || '(ohne Namen)', ic[0], ic[1], () => isInst ? beginInstall(e.name, e.path, parseArgs(e.args), gm, p) : (say('Öffnen (simuliert): ' + e.path, true), toast('Simulation: "' + (e.name || '') + '" wird geöffnet.')),
            {focus: e, disabled: isInst && !p.canInstall, tag: isInst ? '' : 'öffnen'}));
        });
      }
      const bottom = h('div', {}, rule(), multi ? cbtn('Alle Spiele', 'back', '#7a7a7a', () => { S.page = 'select'; S.cat = null; S.focus = null; draw(); }) : null, cbtn('Beenden', 'x', '#d03a2f', quit));
      return windowShell(gm.name || '(ohne Namen)', p.accent, gm, top, bottom, optionsBar(gm, p));
    }

    /* --- Installationssimulation --- */
    function beginInstall(title, rel, entryArgs, gm, p){
      if (!p.canInstall){ S.modal = {kind:'msg', title:'Nicht unterstützt', body:p.note}; draw(); return; }
      const provId = gm.provider || 'gog';
      const silent = S.silent && silentAvailable(provId, entryArgs);
      const target = (S.targets[S.cur] || '').trim();
      if (silent && p.usesTarget && !target){ S.modal = {kind:'msg', title:'Zielordner fehlt', body:'Für die stille Installation muss ein Zielordner angegeben werden.'}; draw(); return; }
      const logPath = silent ? 'C:\\Users\\Du\\AppData\\Local\\Temp\\discmenu-install.log' : '';
      const cmd = installCommand(provId, {silent, target: p.usesTarget ? target : '', logPath: p.usesTarget ? logPath : '', entryArgs});
      say('Starte: ' + rel.replace(/\//g, '\\') + (cmd ? ' ' + cmd : '  (normal, ohne Parameter)'), true);
      const found = provId === 'gog' ? (silent ? target : defaultTarget(gm.name)) : '';
      const m = S.modal = {kind:'install', title, silent, target: silent ? target : '', unwanted: S.silent && !silent, done:false, progress: silent ? 0 : -1, step: 0, winProg: 0, res: null, found, rel};
      if (silent) runSilent(m); else { say('Der Installer öffnet sein eigenes Fenster (hier nachgebaut).'); }
      draw();
    }
    const failLog = 'Fehler: Zu wenig Speicherplatz auf dem Ziellaufwerk.\nSetup wurde vorzeitig beendet.';
    function finish(m, code){
      if (m.done) return; m.done = true; m.win = false;
      const r = describeResult({code, found: code === 0 ? m.found : '', logTail: code !== 0 && m.silent && code === 1 ? failLog : ''});
      m.res = r; m.progress = r.ok ? 1 : m.progress;
      say('Installer beendet mit Code ' + code + (r.ok ? ' (Erfolg)' : ' (Fehler)'), true); draw();
    }
    function runSilent(m){
      const failAt = S.result === 'ok' ? 2 : S.result === 'err5' ? 0.04 : 0.6, dur = 6000;
      const t0 = Date.now();
      const t = every(() => {
        const sp = Math.min(1, (Date.now() - t0) * S.speed / dur);
        m.progress = Math.min(sp, failAt);
        if (sp >= failAt || sp >= 1){ stop(t); finish(m, S.result === 'ok' ? 0 : S.result === 'err5' ? 5 : 1); return; }
        draw();
      }, 120);
    }
    // Normaler Modus: nachgebautes Installer-Fenster mit Weiter / Installieren / Fertigstellen
    function winNext(m){
      if (m.step === 0){ m.step = 1; m.winProg = 0; say('Installer: Installation gestartet'); const t0 = Date.now(), failAt = S.result === 'ok' ? 2 : 0.55;
        const t = every(() => { const sp = Math.min(1, (Date.now() - t0) * S.speed / 4500); m.winProg = Math.min(sp, failAt);
          if (sp >= failAt || sp >= 1){ stop(t); if (S.result === 'ok'){ m.step = 2; } else { m.step = 3; } }
          draw(); }, 120); }
      else if (m.step === 2) finish(m, 0);
      else if (m.step === 3) finish(m, S.result === 'err5' ? 5 : 1);
    }
    function winCancel(m){ if (m.step === 1) return; say('Installer: Abbruch durch den Benutzer', true); finish(m, 2); }
    function installerWindow(m){
      const gm = g(), nm = m.title || gm.name;
      let bodyEl, foot;
      if (m.step === 0){ bodyEl = [h('h5', {}, 'Willkommen beim Setup-Assistenten von ' + nm), h('div', {}, 'Dieser Assistent führt Sie durch die Installation. Klicken Sie auf "Weiter", um fortzufahren.')];
        foot = [h('button', {type:'button', onclick: () => { play('click'); winNext(m); }}, 'Weiter >'), h('button', {type:'button', onclick: () => { play('click'); winCancel(m); }}, 'Abbrechen')]; }
      else if (m.step === 1){ bodyEl = [h('h5', {}, 'Installiere ...'), h('div', {}, 'Bitte warten Sie, während ' + nm + ' installiert wird.'), h('div', {class:'wp'}, h('i', {style:'width:' + Math.round(m.winProg * 100) + '%'}))]; foot = [h('button', {type:'button', disabled:true}, 'Abbrechen')]; }
      else if (m.step === 2){ bodyEl = [h('h5', {}, 'Setup abgeschlossen'), h('div', {}, nm + ' wurde auf Ihrem Computer installiert.')]; foot = [h('button', {type:'button', onclick: () => { play('click'); winNext(m); }}, 'Fertigstellen')]; }
      else { bodyEl = [h('h5', {style:'color:#b00020'}, 'Setup konnte nicht abgeschlossen werden'), h('div', {}, S.result === 'err5' ? 'Zugriff verweigert (Simulation). Starten Sie das Setup als Administrator.' : 'Nicht genügend Speicherplatz (Simulation).')]; foot = [h('button', {type:'button', onclick: () => { play('click'); winNext(m); }}, 'OK')]; }
      return h('div', {class:'win'}, h('div', {class:'tb'}, h('span', {}, 'Setup - ' + nm), h('span', {}, '–  □  ×')), h('div', {class:'bd'}, bodyEl), h('div', {class:'ft'}, foot));
    }

    function modal(){
      const m = S.modal; if (!m) return null;
      const gm = g(), p = P(gm);
      let title, body, accent = p.accent, prog = null, ok = h('div', {style:'display:flex;justify-content:flex-end'}, btn('OK', () => { if (m.kind === 'install' && m.res && m.res.ok && m.found && !S.targets[S.cur]) S.targets[S.cur] = m.found; S.modal = null; draw(); }, 'main', 'width:140px;height:44px;background:' + accent + ';--ink:' + inkFor(accent)));
      if (m.kind === 'msg'){ title = m.title; body = m.body; }
      else if (!m.done){
        title = 'Installation läuft';
        body = m.title + (m.silent ? '\nDer Installer läuft ohne eigenes Fenster.' + (m.target ? '\nZiel: ' + m.target : '') : '\nDer Installer hat ein eigenes Fenster. Dieses Menü wartet, bis er fertig ist.') + (m.unwanted ? '\n(Für diesen Eintrag ist keine stille Installation möglich, der Installer läuft normal.)' : '');
        prog = h('div', {class:'prog'}, m.progress < 0 ? h('i', {class:'ind', style:'background:' + accent}) : h('i', {style:'width:' + Math.round(m.progress * 100) + '%;background:' + accent}));
        ok = null;
      } else { accent = m.res.ok ? '#3ddc97' : '#ff6b6b'; title = m.res.ok ? 'Fertig' : 'Installation nicht erfolgreich'; body = m.title + '\n\n' + m.res.text;
        prog = h('div', {class:'prog'}, h('i', {style:'width:100%;background:' + accent}));
        ok = h('div', {style:'display:flex;justify-content:flex-end;margin-top:18px'}, btn('OK', () => { if (m.res.ok && m.found && !S.targets[S.cur]) S.targets[S.cur] = m.found; S.modal = null; draw(); }, 'main', 'width:140px;height:44px;background:' + accent + ';--ink:#14161e')); }
      return h('div', {class:'ovl'}, h('div', {class:'box'}, h('div', {class:'top', style:'background:' + accent}), h('h4', {}, title), h('pre', {}, body), prog, ok),
        m.kind === 'install' && !m.silent && !m.done ? installerWindow(m) : null);
    }

    function draw(){
      const gm = state.games[S.cur] || state.games[0];
      if (!state.games[S.cur]) S.cur = 0;
      stage.style.setProperty('--acc-c', P(gm).accent);
      const bg = state.background && assets.has(state.background);
      stage.replaceChildren(...[bg ? h('div', {class:'bgimg', style:'background-image:url("' + assetUrl(state.background) + '")'}) : null, bg ? h('div', {class:'shade'}) : null,
        S.page === 'select' ? pageSelect() : pageGame(), modal()].filter(Boolean));
    }

    /* --- Bedienleiste --- */
    const sel = (opts, cur, fn) => { const e = h('select', {onchange: () => fn(e.value)}, opts.map(([v,l]) => h('option', {value:v}, l))); e.value = cur; return e; };
    const bar = h('div', {class:'simbar'},
      h('b', {}, 'Simulation'),
      h('label', {}, 'Ergebnis der Installation ', sel([['ok','Erfolg'],['err1','Fehler (Code 1, Platte voll)'],['err5','Fehler (Code 5, Rechte fehlen)']], S.result, v => { S.result = v; say('Ergebnis der nächsten Installation: ' + v); })),
      h('label', {}, 'Tempo ', sel([['1','Normal'],['3','Schnell'],['0.4','Langsam']], '1', v => { S.speed = Number(v); })),
      h('button', {type:'button', class:'sm', onclick: () => { S.timers.forEach(stop); S.modal = null; S.silent = false; S.targets = {}; S.page = state.games.length > 1 ? 'select' : 'game'; S.cat = null; S.focus = null; S.log = []; say('Zurückgesetzt'); draw(); }}, 'Zurücksetzen'));
    dlg.classList.add('wide');
    openDlg('Vorschau und Simulation',
      h('p', {class:'hint'}, 'Bildet das Menü nach, wie es der Player zeigt: Layout, Farben und Abzeichen je Anbieter. Klicken, Reiter, "Stille Installation" und Installieren funktionieren. Installiert wird nichts, es ist eine Simulation. Die Schrift ist hier die des Systems, im Player ist es Go Regular.'),
      bar, wrap, h('div', {class:'hint', style:'margin-top:10px'}, 'Ablauf (so würde der Player den Installer starten):'), logBox);
    fit(); say('Vorschau gestartet. Tipp: Oben das Ergebnis wählen, dann im Menü auf "Installieren" klicken.'); draw();
  }
  $('#bPrev').addEventListener('click', openPreview);
  $('#bJson').addEventListener('click', openJsonEditor);

  /* --- Schnittstelle zur gemeinsamen Seite ---
     Speichern, Öffnen und die Projektdatei übernimmt extras.js für Menü und Hülle zusammen. Das Menü meldet Änderungen (onChange)
     und lässt sich mit einem Projekt füllen (load). Verknüpfte Felder der Hülle setzt extras.js über patchGame und setGameCover. */
  const listeners = [];
  function changed(){ listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }
  window.MenuApp = {
    get state(){ return state; },
    get assets(){ return assets; },
    get counter(){ return counter; },
    onChange(fn){ listeners.push(fn); },
    /* Projekt einsetzen: {state, assets: Map(id -> {data, ext}), counter} */
    load(p){
      assets.clear(); for (const [k,a] of (p && p.assets) || new Map()) assets.set(k, {data: a.data, ext: a.ext});      // ohne alte Bild-Adressen (blob:), die gelten nur bis zum Neuladen
      state = p && CORE.sane(p.state) ? p.state : newState();
      counter = Math.max(Number(p && p.counter) || 1, ...[...assets.keys()].map(k => (Number(String(k).slice(1)) || 0) + 1));
      sel = 0; renderAll();
    },
    reset(){ this.load(null); },
    /* Felder des verknüpften Spiels ändern (z. B. Titel aus der Hülle) */
    patchGame(i, patch){ const g = state.games[i] || state.games[0]; if (!g) return; Object.assign(g, patch); renderAll(); changed(); },
    /* Cover des Spiels aus einer Datei (wird wie beim Hochladen auf höchstens 800 Pixel verkleinert), null entfernt es */
    async setGameCover(i, file){
      const g = state.games[i] || state.games[0]; if (!g) return;
      if (file){ const r = await processImage(file, 'cover'); g.cover = addAsset(r.data, r.ext); } else g.cover = null;
      renderAll(); changed();
    },
    /* nur die Dateien, die das Menü benutzt (für die Projektdatei) */
    usedAssets(){ const ids = CORE.usedIds(state); return new Map([...assets].filter(([k]) => ids.has(k)).map(([k,a]) => [k, {data: a.data, ext: a.ext}])); },
    validate(){ return validate(state); },
    render: renderAll, openJson: openJsonEditor, addGameViaSgdb, runDiscCheck,
  };
  $('#mDlgX').addEventListener('click', closeDlg);
  renderAll();
})();
