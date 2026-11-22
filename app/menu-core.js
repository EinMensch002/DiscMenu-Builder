/* Menü-Teil: Kern ohne Oberfläche (Rezept, ZIP, Prüfung). Wird auch in den Node-Tests geladen. */
/* === KERN (ohne DOM, wird auch in Tests verwendet) === */
const CORE = (() => {
  const UML = {'ä':'ae','ö':'oe','ü':'ue','Ä':'ae','Ö':'oe','Ü':'ue','ß':'ss'};
  const SECTIONS = ['dlcs','patches','extras'];
  // Aussehen und Verhalten je Anbieter. Muss zu src/Player/providers.go passen (ein Test vergleicht die Befehlszeilen).
  const PROVIDERS = {
    gog:{name:'GOG', color:'#9e4ebe', accent:'#9e4ebe', badge:'#763494', onBadge:'#ffffff', note:'', canInstall:true, usesTarget:true, silent:'always'},
    epic:{name:'Epic Games', color:'#8d93a5', accent:'#d6dae4', badge:'#34363e', onBadge:'#ffffff', note:'Epic hat keine einheitlichen Offline-Installer. Der Player startet sie normal, still nur mit eigenen Parametern.', canInstall:true, usesTarget:false, silent:'args'},
    steam:{name:'Steam', color:'#66c0f4', accent:'#66c0f4', badge:'#223e5c', onBadge:'#96d6ff', note:'Steam-Backups kann der Player noch nicht wiederherstellen. Der Eintrag wird nur angezeigt, Extras lassen sich öffnen.', canInstall:false, usesTarget:false, silent:'never'}
  };
  const quote = v => /^"/.test(v) ? v : '"' + v + '"';
  /* Ist für diesen Eintrag eine stille Installation möglich? entryArgs ist eine Liste. */
  function silentAvailable(provId, entryArgs){
    const p = PROVIDERS[provId] || PROVIDERS.gog;
    return p.silent === 'always' || (p.silent === 'args' && entryArgs.length > 0);
  }
  /* Parameter des Installers, wie sie der Player übergibt (leer im normalen Modus). */
  function installCommand(provId, o){
    if (!o.silent) return '';
    const p = PROVIDERS[provId] || PROVIDERS.gog, a = [];
    if (p.silent === 'always'){
      a.push('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-');
      if (o.target) a.push('/DIR=' + quote(o.target));
      if (o.logPath) a.push('/LOG=' + quote(o.logPath));
    }
    return a.concat(o.entryArgs || []).join(' ');
  }
  function defaultTarget(name){ return 'C:\\GOG Games\\' + String(name || '').replace(/[\\/:*?"<>|]/g, '').trim(); }
  function formatMB(mb){ return mb >= 1024 ? (mb/1024).toFixed(1) + ' GB' : Math.round(mb) + ' MB'; }
  /* Ergebnistext nach einer Installation (gleiche Texte wie der Player). */
  function describeResult(r){
    if (r.err) return {ok:false, text:'Der Installer konnte nicht gestartet werden:\n' + r.err};
    if (r.code === 0) return {ok:true, text:'Die Installation wurde ohne Fehler beendet.' + (r.found ? '\nInstalliert nach: ' + r.found : '')};
    let t = 'Der Installer wurde mit dem Code ' + r.code + ' beendet.';
    if (r.code === 5 || r.code === 740) t += '\nWahrscheinlich fehlten Administratorrechte.';
    if (r.logTail) t += '\n\nProtokoll (Ende):\n' + r.logTail;
    return {ok:false, text:t};
  }

  function slug(s){
    return String(s == null ? '' : s).replace(/[äöüÄÖÜß]/g, c => UML[c]).normalize('NFKD')
      .replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
  }
  function parseArgs(str){ return String(str || '').match(/(?:[^\s"]+|"[^"]*")+/g) || []; }
  function fromArgs(list){ return Array.isArray(list) ? list.join(' ') : ''; }
  function isUrl(p){ return /^https?:\/\//i.test(p); }
  function relPathIssue(p){
    if (/^[a-zA-Z]:/.test(p) || /^[\\/]/.test(p)) return 'muss relativ zur Disc sein (kein Laufwerk, kein führender Schrägstrich)';
    if (p.split(/[\\/]/).includes('..')) return 'darf kein ".." enthalten';
    return null;
  }

  function newItem(){ return {name:'',description:'',cover:null,group:'',kind:'installer',path:'',args:'',_open:true}; }
  function newGame(){ return {name:'',provider:'gog',cover:null,description:'',installer:'',args:'',estimatedSizeMB:'',dlcs:[],patches:[],extras:[]}; }
  function newState(){ return {title:'',output:'',background:null,sounds:{click:null,hover:null},games:[newGame()]}; }

  /* --- CRC32 und ZIP (Speichern ohne Kompression, Lesen mit Deflate) --- */
  let T = null;
  function crc32(u8){
    if (!T){ T = new Uint32Array(256); for (let n=0;n<256;n++){ let c=n; for (let k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; T[n]=c>>>0; } }
    let c = 0xFFFFFFFF; for (let i=0;i<u8.length;i++) c = T[(c^u8[i])&255]^(c>>>8);
    return (c^0xFFFFFFFF)>>>0;
  }
  function buildZip(files){
    const enc = new TextEncoder(), now = new Date();
    const time = (now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
    const date = ((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
    const es = files.map(f => ({nb: enc.encode(f.name), data: f.data, crc: crc32(f.data)}));
    let size = 22; for (const e of es) size += 30 + e.nb.length + e.data.length + 46 + e.nb.length;
    const out = new Uint8Array(size), dv = new DataView(out.buffer); let p = 0; const offs = [];
    for (const e of es){
      offs.push(p);
      dv.setUint32(p,0x04034b50,true); dv.setUint16(p+4,20,true); dv.setUint16(p+6,0x0800,true); dv.setUint16(p+8,0,true);
      dv.setUint16(p+10,time,true); dv.setUint16(p+12,date,true); dv.setUint32(p+14,e.crc,true);
      dv.setUint32(p+18,e.data.length,true); dv.setUint32(p+22,e.data.length,true);
      dv.setUint16(p+26,e.nb.length,true); dv.setUint16(p+28,0,true); p += 30;
      out.set(e.nb,p); p += e.nb.length; out.set(e.data,p); p += e.data.length;
    }
    const cd = p;
    es.forEach((e,i) => {
      dv.setUint32(p,0x02014b50,true); dv.setUint16(p+4,20,true); dv.setUint16(p+6,20,true); dv.setUint16(p+8,0x0800,true); dv.setUint16(p+10,0,true);
      dv.setUint16(p+12,time,true); dv.setUint16(p+14,date,true); dv.setUint32(p+16,e.crc,true);
      dv.setUint32(p+20,e.data.length,true); dv.setUint32(p+24,e.data.length,true);
      dv.setUint16(p+28,e.nb.length,true); dv.setUint16(p+30,0,true); dv.setUint16(p+32,0,true); dv.setUint16(p+34,0,true);
      dv.setUint16(p+36,0,true); dv.setUint32(p+38,0,true); dv.setUint32(p+42,offs[i],true); p += 46;
      out.set(e.nb,p); p += e.nb.length;
    });
    dv.setUint32(p,0x06054b50,true); dv.setUint16(p+4,0,true); dv.setUint16(p+6,0,true);
    dv.setUint16(p+8,es.length,true); dv.setUint16(p+10,es.length,true);
    dv.setUint32(p+12,p-cd,true); dv.setUint32(p+16,cd,true); dv.setUint16(p+20,0,true);
    return out;
  }
  async function readZip(buf){
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let e = -1;
    for (let i=buf.length-22; i>=Math.max(0,buf.length-22-65535); i--){ if (dv.getUint32(i,true)===0x06054b50){ e=i; break; } }
    if (e < 0) throw new Error('Das ist keine gültige ZIP-Datei.');
    const n = dv.getUint16(e+10,true); let p = dv.getUint32(e+16,true);
    const dec = new TextDecoder(), out = [];
    for (let i=0;i<n;i++){
      if (dv.getUint32(p,true) !== 0x02014b50) throw new Error('Die ZIP-Datei ist beschädigt.');
      const method = dv.getUint16(p+10,true), csize = dv.getUint32(p+20,true);
      const nl = dv.getUint16(p+28,true), xl = dv.getUint16(p+30,true), cl = dv.getUint16(p+32,true), lo = dv.getUint32(p+42,true);
      const name = dec.decode(buf.subarray(p+46,p+46+nl)).replace(/\\/g,'/');
      p += 46 + nl + xl + cl;
      if (name.endsWith('/')) continue;
      const start = lo + 30 + dv.getUint16(lo+26,true) + dv.getUint16(lo+28,true);
      const raw = buf.subarray(start, start+csize);
      let data;
      if (method === 0) data = raw.slice();
      else if (method === 8) data = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else throw new Error('Nicht unterstützte ZIP-Kompression bei ' + name);
      out.push({name, data});
    }
    return out;
  }

  /* --- Prüfung nach der Spezifikation --- */
  function validate(s){
    const out = [], E = m => out.push({level:'error',msg:m}), W = m => out.push({level:'warn',msg:m});
    if (!s.title.trim()) E('Disc-Einstellungen: Titel fehlt.');
    if (s.output.trim()){
      if (/[\\/:*?"<>|]/.test(s.output)) E('Disc-Einstellungen: Der EXE-Name enthält ungültige Zeichen.');
      else if (!/\.exe$/i.test(s.output.trim())) W('Disc-Einstellungen: Der EXE-Name sollte auf .exe enden.');
    }
    if (!s.games.length) E('Es wird mindestens ein Spiel benötigt.');
    const label = {dlcs:'DLC',patches:'Patch',extras:'Extra'};
    s.games.forEach((g,i) => {
      const gn = 'Spiel ' + i + ' (' + (g.name.trim() || 'ohne Namen') + ')';
      if (!g.name.trim()) E(gn + ': Name fehlt.');
      if (!g.installer.trim()) E(gn + ': Installer-Pfad fehlt.');
      else { const x = relPathIssue(g.installer.trim()); if (x) E(gn + ': Installer-Pfad ' + x + '.'); }
      if (g.provider === 'steam') W(gn + ': ' + PROVIDERS.steam.note);
      if (String(g.estimatedSizeMB).trim() !== '' && !(Number(g.estimatedSizeMB) > 0)) E(gn + ': Die Größe muss eine Zahl über 0 sein.');
      SECTIONS.forEach(k => g[k].forEach((it,j) => {
        const n = gn + ', ' + label[k] + ' ' + (j+1) + ' (' + (it.name.trim() || 'ohne Namen') + ')';
        if (!it.name.trim()) E(n + ': Name fehlt.');
        const p = it.path.trim();
        if (!p) E(n + ': ' + (it.kind === 'installer' ? 'Installer-Pfad' : 'Pfad oder Link') + ' fehlt.');
        else if (it.kind === 'installer'){ const x = relPathIssue(p); if (x) E(n + ': Installer-Pfad ' + x + '.'); }
        else if (!isUrl(p)){ const x = relPathIssue(p); if (x) E(n + ': Pfad ' + x + '.'); }
      }));
    });
    return out;
  }

  /* --- Zustand -> menu.json + Asset-Dateien --- */
  function buildMenu(s, assets){
    const used = new Set(), map = new Map(), files = [];
    const take = (id, dir, base) => {
      if (!id || !assets.has(id)) return undefined;
      if (map.has(id)) return map.get(id);
      const a = assets.get(id), b = slug(base) || 'datei', d = 'assets/' + (dir ? dir + '/' : '');
      let p = d + b + '.' + a.ext, n = 2;
      while (used.has(p)) p = d + b + '-' + (n++) + '.' + a.ext;
      used.add(p); map.set(id,p); files.push({name:p, data:a.data}); return p;
    };
    const norm = p => p.trim().replace(/\\/g,'/');
    const itemOut = (it,g) => {
      const o = {name: it.name.trim()};
      if (it.description.trim()) o.description = it.description.trim();
      const c = take(it.cover,'covers', g.name + ' ' + it.name); if (c) o.cover = c;
      if (it.group.trim()) o.group = it.group.trim();
      if (it.kind === 'installer'){ o.installer = norm(it.path); const a = parseArgs(it.args); if (a.length) o.args = a; }
      else o.open = isUrl(it.path.trim()) ? it.path.trim() : norm(it.path);
      return o;
    };
    const m = {schemaVersion:1, title:s.title.trim()};
    if (s.output.trim()) m.output = s.output.trim();
    const bg = take(s.background,'','background'); if (bg) m.background = bg;
    const snd = {}; for (const k of ['click','hover']){ const p = take(s.sounds[k],'sounds',k); if (p) snd[k] = p; }
    if (Object.keys(snd).length) m.sounds = snd;
    m.games = s.games.map((g,i) => {
      const o = {index:i, name:g.name.trim()};
      const c = take(g.cover,'covers',g.name); if (c) o.cover = c;
      if (g.description.trim()) o.description = g.description.trim();
      o.installer = norm(g.installer);
      if (g.provider && g.provider !== 'gog' && PROVIDERS[g.provider]) o.provider = g.provider;
      const a = parseArgs(g.args); if (a.length) o.args = a;
      if (String(g.estimatedSizeMB).trim() !== '') o.estimatedSizeMB = Number(g.estimatedSizeMB);
      SECTIONS.forEach(k => { if (g[k].length) o[k] = g[k].map(it => itemOut(it,g)); });
      return o;
    });
    return {menu:m, files, map};
  }

  /* --- menu.json -> Zustand (Import) --- */
  function parseMenu(m, getAsset){
    if (!m || typeof m !== 'object' || Array.isArray(m)) throw new Error('Die menu.json ist kein gültiges Objekt.');
    const notes = [], s = newState(); s.games = [];
    if (m.schemaVersion !== 1) notes.push('schemaVersion ' + m.schemaVersion + ' ist unbekannt, es wird Version 1 angenommen.');
    s.title = String(m.title || ''); s.output = String(m.output || '');
    const asset = p => { if (!p) return null; const id = getAsset(String(p)); if (!id) notes.push('Datei nicht gefunden: ' + p); return id || null; };
    s.background = asset(m.background);
    s.sounds.click = asset(m.sounds && m.sounds.click); s.sounds.hover = asset(m.sounds && m.sounds.hover);
    const item = it => {
      const o = newItem(); o._open = false;
      o.name = String(it.name || ''); o.description = String(it.description || ''); o.group = String(it.group || '');
      o.cover = asset(it.cover);
      if (it.installer != null){ o.kind = 'installer'; o.path = String(it.installer); o.args = fromArgs(it.args); }
      else { o.kind = 'open'; o.path = String(it.open || ''); }
      return o;
    };
    const games = (Array.isArray(m.games) ? m.games.slice() : []).sort((a,b) => (a.index || 0) - (b.index || 0));
    for (const g of games){
      const ng = newGame();
      ng.name = String(g.name || ''); ng.cover = asset(g.cover); ng.description = String(g.description || '');
      ng.installer = String(g.installer || ''); ng.args = fromArgs(g.args);
      ng.estimatedSizeMB = g.estimatedSizeMB == null ? '' : String(g.estimatedSizeMB);
      SECTIONS.forEach(k => { ng[k] = (Array.isArray(g[k]) ? g[k] : []).map(item); });
      if (g.customTabs) notes.push('"' + ng.name + '": customTabs gehören nicht zu Version 1 und werden nicht übernommen.');
      if (g.provider){ if (PROVIDERS[g.provider]) ng.provider = g.provider; else notes.push('"' + ng.name + '": provider "' + g.provider + '" ist unbekannt, es wird gog angenommen.'); }
      s.games.push(ng);
    }
    if (!s.games.length) s.games.push(newGame());
    return {state:s, notes};
  }

  function usedIds(s){
    const ids = new Set(); const add = id => { if (id) ids.add(id); };
    add(s.background); add(s.sounds.click); add(s.sounds.hover);
    s.games.forEach(g => { add(g.cover); SECTIONS.forEach(k => g[k].forEach(it => add(it.cover))); });
    return ids;
  }
  function sane(s){
    return s && typeof s === 'object' && typeof s.title === 'string' && Array.isArray(s.games) && s.sounds &&
      s.games.every(g => g && SECTIONS.every(k => Array.isArray(g[k])) && (!g.provider || PROVIDERS[g.provider]));
  }
  /* --- Disc-Dateien prüfen (exists(pfad) liefert 'file', 'dir' oder null) --- */
  function discRefs(s){
    const refs = [], label = {dlcs:'DLC',patches:'Patch',extras:'Extra'}, norm = p => p.trim().replace(/\\/g,'/');
    s.games.forEach((g,i) => {
      const gn = 'Spiel ' + i + ' (' + (g.name.trim() || 'ohne Namen') + ')';
      if (g.installer.trim()) refs.push({where: gn + ', Installer', path: norm(g.installer), mustBeFile: true});
      SECTIONS.forEach(k => g[k].forEach((it,j) => {
        const p = it.path.trim(); if (!p || isUrl(p)) return;
        refs.push({where: gn + ', ' + label[k] + ' ' + (j+1) + ' (' + (it.name.trim() || 'ohne Namen') + ')', path: norm(p), mustBeFile: it.kind === 'installer'});
      }));
    });
    return refs;
  }
  async function checkDisc(s, exists){
    const refs = discRefs(s), out = []; let okCount = 0;
    for (const r of refs){
      if (relPathIssue(r.path)){ out.push({level:'error', msg: r.where + ': Pfad ungültig (' + r.path + ').'}); continue; }
      let kind = null; try { kind = await exists(r.path); } catch (e) { kind = null; }
      if (!kind) out.push({level:'error', msg: r.where + ': nicht gefunden (' + r.path + ').'});
      else if (r.mustBeFile && kind !== 'file') out.push({level:'error', msg: r.where + ': ist ein Ordner, es wird eine Datei erwartet (' + r.path + ').'});
      else if (r.mustBeFile && !/\.(exe|msi|bat|cmd)$/i.test(r.path)) { out.push({level:'warn', msg: r.where + ': Endung ungewöhnlich für einen Installer (' + r.path + ').'}); okCount++; }
      else okCount++;
    }
    return {issues: out, checked: refs.length, ok: okCount};
  }

  /* --- Hilfen für die SteamGridDB-Anbindung --- */
  function htmlToText(s){
    const map = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
    return String(s || '').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,'')
      .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m,e) => {
        if (e[0] === '#'){ try { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2),16) : parseInt(e.slice(1),10); return String.fromCodePoint(n); } catch (x) { return m; } }
        return map[e.toLowerCase()] !== undefined ? map[e.toLowerCase()] : m;
      }).replace(/\n{3,}/g,'\n\n').trim();
  }
  function normName(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g,''); }
  function rankByName(query, items, nameOf, max){
    const n = normName(query); if (!n) return [];
    const score = nm => { const m = normName(nm); if (!m) return 0; if (m === n) return 4; if (m.startsWith(n)) return 3; if (n.startsWith(m)) return 2; if (m.includes(n)) return 1; return 0; };
    return (items || []).map((it,i) => ({it, s: score(nameOf(it)), i})).filter(x => x.s > 0)
      .sort((a,b) => (b.s - a.s) || (a.i - b.i)).slice(0, max || 3).map(x => x.it);
  }
  function mdToText(t){
    return htmlToText(String(t || '').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^#{1,6}\s*/gm,'').replace(/(\*\*|__)/g,''));
  }
  function epicText(j){
    const pages = j && Array.isArray(j.pages) ? j.pages : [];
    for (const p of pages){
      const a = p && p.data && p.data.about; if (!a) continue;
      const t = a.shortDescription || a.description;
      if (t && String(t).trim()) return {title: String(a.title || p._title || j._title || ''), text: mdToText(t)};
    }
    return null;
  }
  function sortGrids(list){
    return (list || []).slice().sort((a,b) => ((b.language === 'de') - (a.language === 'de')) || ((b.score || 0) - (a.score || 0)));
  }
  function looksGerman(t){
    const text = String(t || ''), w = text.toLowerCase().match(/[a-zäöüß]+/g) || [];
    if (w.length < 8) return /[äöüß]/i.test(text);
    const de = new Set(['der','die','das','und','ist','mit','ein','eine','den','dem','von','zu','nicht','auf','für','sich','auch','werden','wird','als','bei','nach','aus']);
    const en = new Set(['the','and','is','with','of','to','a','an','for','you','your','are','that','this','on','as','by','from','it','their','be']);
    let d = 0, e = 0; for (const x of w){ if (de.has(x)) d++; if (en.has(x)) e++; }
    return d > e;
  }
  function chunkText(text, max){
    max = max || 450;
    return String(text || '').split(/\n+/).map(p => p.trim()).filter(Boolean).map(p => {
      const out = []; let cur = '';
      const flush = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
      for (let s of (p.match(/[^.!?]+[.!?]*\s*/g) || [p])){
        while (s.length > max){ flush(); let cut = s.lastIndexOf(' ', max); if (cut < 1) cut = max; out.push(s.slice(0, cut).trim()); s = s.slice(cut); }
        if ((cur + s).length > max) flush();
        cur += s;
      }
      flush(); return out;
    });
  }
  function trimIntro(t, max){
    let out = ''; for (const p of String(t).split(/\n+/).filter(Boolean)){ if ((out + p).length > max && out) break; out += (out ? '\n' : '') + p; }
    if (out.length > max){ const cut = out.lastIndexOf('. ', max); out = cut > 200 ? out.slice(0, cut + 1) : out.slice(0, max).trim() + '…'; }
    return out;
  }
  /* --- Einstellungen sichern (optional mit Passwort verschlüsselt) --- */
  const b64 = u8 => { let t = ''; for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(t); };
  const unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
  const subtleOrNull = () => (globalThis.crypto && globalThis.crypto.subtle) || null;
  async function deriveKey(password, salt, iterations){
    const base = await subtleOrNull().importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return subtleOrNull().deriveKey({name:'PBKDF2', salt, iterations, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
  }
  async function packSettings(values, password){
    const plain = {type:'discmenu-settings', version:1, sgdbKey: values.key || '', proxy: values.proxy || ''};
    if (!password) return JSON.stringify(plain, null, 2) + '\n';
    if (!subtleOrNull()) throw new Error('Dieser Browser kann hier nicht verschlüsseln. Die Datei lässt sich nur ohne Passwort sichern.');
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16)), iv = globalThis.crypto.getRandomValues(new Uint8Array(12)), iterations = 250000;
    const key = await deriveKey(password, salt, iterations);
    const data = new Uint8Array(await subtleOrNull().encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(JSON.stringify(plain))));
    return JSON.stringify({type:'discmenu-settings', version:1, encrypted:true, kdf:'PBKDF2-SHA256', iterations, salt:b64(salt), iv:b64(iv), data:b64(data)}, null, 2) + '\n';
  }
  async function unpackSettings(text, password){
    let j; try { j = JSON.parse(text); } catch (e) { throw new Error('Die Datei ist keine gültige Einstellungsdatei.'); }
    if (!j || j.type !== 'discmenu-settings') throw new Error('Das ist keine Einstellungsdatei dieses Konfigurators.');
    let plain = j;
    if (j.encrypted){
      if (!password) throw new Error('PASSWORD_NEEDED');
      if (!subtleOrNull()) throw new Error('Dieser Browser kann hier nicht entschlüsseln.');
      const it = Number(j.iterations); if (!(it >= 100000 && it <= 2000000)) throw new Error('Die Einstellungsdatei ist beschädigt.');
      try {
        const key = await deriveKey(password, unb64(j.salt), it);
        plain = JSON.parse(new TextDecoder().decode(await subtleOrNull().decrypt({name:'AES-GCM', iv:unb64(j.iv)}, key, unb64(j.data))));
      } catch (e) { throw new Error('Falsches Passwort oder beschädigte Datei.'); }
    }
    // Eine Datei ohne Zugangsdaten (z. B. nur eigene Vorlagen aus dem Cover-Tool) darf Schlüssel und Proxy nicht leeren
    if (!('sgdbKey' in plain) && !('proxy' in plain)) throw new Error('Die Datei enthält keine Zugangsdaten.');
    return {key: String(plain.sgdbKey || ''), proxy: String(plain.proxy || '')};
  }
  return {PROVIDERS, silentAvailable, installCommand, defaultTarget, formatMB, describeResult, discRefs, checkDisc, packSettings, unpackSettings, looksGerman, chunkText, trimIntro, rankByName, mdToText, epicText, htmlToText, normName, sortGrids, slug, parseArgs, fromArgs, isUrl, newItem, newGame, newState, crc32, buildZip, readZip, validate, buildMenu, parseMenu, usedIds, sane, SECTIONS};
})();
if (typeof module !== 'undefined') module.exports = CORE;
