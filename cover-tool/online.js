/* Online-Dienste des Cover-Tools: SteamGridDB (Bilder) und Steam-Shop (Systemanforderungen, Funktionen).
   Die Browser blockieren Anfragen an diese Dienste meist (CORS), deshalb läuft alles über den optionalen Proxy
   aus den Einstellungen. Schlüssel und Proxy liegen unter denselben Namen wie im Konfigurator, so teilen sich
   beide Seiten die Einstellungen (auf GitHub Pages liegen sie im selben Speicher).
   Die Auswertung der Antworten (parseRequirements, steamPatch) ist reine Logik und lässt sich mit Node testen. */
(function (root) {
  'use strict';

  const Core = (typeof module !== 'undefined' && module.exports) ? require('./core.js') : root.CoverCore;
  const SG_BASE = 'https://www.steamgriddb.com/api/v2';
  const KEY_KEY = 'sgdb-key', KEY_PROXY = 'sgdb-proxy';

  /* ---------- Einstellungen (gemeinsam mit dem Konfigurator) ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* Speicher gesperrt */ } },
  };
  const settings = {
    get key() { return store.get(KEY_KEY); },
    get proxy() { return store.get(KEY_PROXY); },
    save(key, proxy) { store.set(KEY_KEY, (key || '').trim()); store.set(KEY_PROXY, (proxy || '').trim()); },
  };

  const CORS_HINT = 'Die Anfrage wurde vom Browser blockiert oder es gibt keine Verbindung. Meist liegt das an CORS: Der Dienst erlaubt Anfragen aus dem Browser nicht. Trage in den Einstellungen einen eigenen Proxy ein (Anleitung im Repository: docs/steamgriddb.md).';

  /* ---------- Anfragen ---------- */
  async function net(url, init) {
    const proxy = settings.proxy;
    const target = proxy ? proxy.split('{url}').join(encodeURIComponent(url)) : url;
    try { return await fetch(target, init); }
    catch (e) { throw new Error(proxy ? 'Der Proxy ist nicht erreichbar oder blockiert die Anfrage. Bitte die Proxy-Adresse prüfen.' : CORS_HINT); }
  }

  async function sgGet(path, params) {
    if (!settings.key) throw new Error('Bitte zuerst den SteamGridDB-API-Schlüssel in den Einstellungen eintragen.');
    const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const r = await net(SG_BASE + path + qs, { headers: { Authorization: 'Bearer ' + settings.key } });
    let j = null;
    try { j = await r.json(); } catch (e) { /* keine JSON-Antwort */ }
    if (r.status === 401 || r.status === 403) throw new Error('Der API-Schlüssel wurde abgelehnt. Bitte in den Einstellungen prüfen.');
    if (!r.ok || !j || j.success === false) throw new Error((j && j.errors && j.errors[0]) || ('SteamGridDB hat mit Fehler ' + r.status + ' geantwortet.'));
    return j.data;
  }

  /* Bildart -> Abfrage bei SteamGridDB */
  const SG_KINDS = {
    cover: { label: 'Cover (Hochformat)', path: '/grids/game/', params: { types: 'static', nsfw: 'false', dimensions: '600x900,342x482,660x930' } },
    grid: { label: 'Querformat und andere', path: '/grids/game/', params: { types: 'static', nsfw: 'false' } },
    hero: { label: 'Hintergründe (Hero)', path: '/heroes/game/', params: { types: 'static', nsfw: 'false' } },
    logo: { label: 'Logos', path: '/logos/game/', params: { types: 'static', nsfw: 'false' } },
  };
  const sgSearch = (term) => sgGet('/search/autocomplete/' + encodeURIComponent(term));
  async function sgImages(gameId, kind) {
    const k = SG_KINDS[kind];
    if (!k) throw new Error('Unbekannte Bildart.');
    return sortImages(await sgGet(k.path + gameId, k.params));
  }
  /* Deutsche Bilder zuerst, dann nach Bewertung */
  function sortImages(list) {
    return (list || []).slice().sort((a, b) => ((b.language === 'de') - (a.language === 'de')) || ((b.score || 0) - (a.score || 0)));
  }

  /* Bild laden: erst direkt, bei Sperre über den Proxy */
  async function fetchBlob(url) {
    let r;
    try { r = await fetch(url); }
    catch (e) {
      if (!settings.proxy) throw new Error('Das Bild konnte nicht geladen werden (vermutlich CORS). Lade es bei SteamGridDB herunter und ziehe es in das Bildfeld, oder richte einen Proxy ein.');
      r = await net(url);
    }
    if (!r.ok) throw new Error('Das Bild konnte nicht geladen werden (Fehler ' + r.status + ').');
    return await r.blob();
  }

  /* ---------- Steam-Shop ---------- */
  /* Verständliche Meldung statt "Unexpected token": Der Worker-Proxy antwortet bei Sperren mit Klartext. */
  async function checkResponse(r, what) {
    if (r.ok) return;
    let body = '';
    try { body = (await r.text()).slice(0, 200); } catch (e) { /* ohne Text */ }
    if (r.status === 403 && /Herkunft/i.test(body)) throw new Error('Der Proxy erlaubt Anfragen von dieser Seite nicht (ALLOWED_ORIGIN im Worker). Trage dort die Adresse dieser Seite ein.');
    if (r.status === 403 && /Host/i.test(body)) throw new Error('Der Proxy erlaubt ' + what + ' nicht. Der Worker-Code ist wahrscheinlich veraltet, bitte den aktuellen aus docs/steamgriddb.md einspielen.');
    if (r.status === 429) throw new Error(what + ' antwortet gerade nicht (zu viele Anfragen). Bitte kurz warten.');
    throw new Error(what + ' hat mit Fehler ' + r.status + ' geantwortet.');
  }
  async function steamJson(url, what) {
    const r = await net(url);
    await checkResponse(r, what);
    try { return await r.json(); } catch (e) { throw new Error(what + ' hat eine unerwartete Antwort geliefert. Läuft der Proxy richtig? Prüfe ihn mit "Verbindung testen" in den Einstellungen.'); }
  }
  /* Steam-Adresse oder reine ID -> App-ID, sonst null. So lässt sich ein Spiel auch ohne Suche wählen. */
  function parseSteamRef(text) {
    const t = String(text || '').trim();
    const m = t.match(/store\.steampowered\.com\/app\/(\d+)/i) || t.match(/steamdb\.info\/app\/(\d+)/i) || t.match(/^(\d{2,9})$/);
    return m ? m[1] : null;
  }
  async function steamSearch(term) {
    const j = await steamJson('https://store.steampowered.com/api/storesearch/?l=english&cc=us&term=' + encodeURIComponent(term), 'Die Steam-Suche');
    return (j && j.items ? j.items : []).filter((i) => i && i.id && i.name);
  }
  async function steamDetails(id) {
    const j = await steamJson('https://store.steampowered.com/api/appdetails?l=english&appids=' + encodeURIComponent(id), 'Steam');
    const d = j && j[id] && j[id].success !== false ? j[id].data : null;
    if (!d) throw new Error('Steam liefert zu diesem Spiel keine Daten (manche Spiele sind im Shop nicht mehr oder nur nach Anmeldung abrufbar).');
    return d;
  }

  /* Verbindungstest für die Einstellungen: jeder Dienst einzeln, damit man sieht, woran es liegt */
  async function testConnection() {
    const out = [];
    const run = async (name, fn) => { try { out.push({ name, ok: true, text: await fn() }); } catch (e) { out.push({ name, ok: false, text: e.message || String(e) }); } };
    if (!settings.proxy) out.push({ name: 'Proxy', ok: false, text: 'Kein Proxy eingetragen. Ohne Proxy blockiert der Browser die Anfragen meist (CORS).' });
    await run('Steam-Shop', async () => { const r = await steamSearch('Half-Life'); return r.length + ' Treffer für den Test'; });
    if (settings.key) await run('SteamGridDB', async () => { const r = await sgSearch('Half-Life'); return r.length + ' Treffer für den Test'; });
    else out.push({ name: 'SteamGridDB', ok: false, text: 'Kein API-Schlüssel eingetragen.' });
    return out;
  }

  /* ---------- Steam-Daten auswerten ---------- */
  const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', reg: '®', trade: '™', copy: '©' };
  const decode = (s) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENTITIES[e.toLowerCase()] !== undefined ? ENTITIES[e.toLowerCase()] : m;
  });
  const plain = (html) => decode(String(html).replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

  const REQ_LABELS = {
    os: ['os', 'betriebssystem'],
    processor: ['processor', 'prozessor', 'cpu'],
    memory: ['memory', 'arbeitsspeicher', 'speicher', 'ram'],
    graphics: ['graphics', 'grafik', 'grafikkarte', 'video card'],
    directx: ['directx'],
    storage: ['storage', 'speicherplatz', 'festplatte', 'hard drive', 'hard disk space', 'disk space'],
    sound: ['sound card', 'soundkarte'],
    notes: ['additional notes', 'zusätzliche anmerkungen', 'anmerkungen', 'notes'],
  };

  /* Die Anforderungen von Steam kommen als HTML: <li><strong>OS *:</strong> Windows 7<br></li> ... */
  function parseRequirements(html) {
    const out = {};
    if (!html || typeof html !== 'string') return out;
    const parts = html.split(/<li\b[^>]*>|<br\s*\/?>/i);
    let any = false;
    for (const part of parts) {
      const text = plain(part);
      const m = text.match(/^([^:]{2,40}?)\s*\*?\s*:\s*(.+)$/);
      if (!m) continue;
      const label = m[1].replace(/\*/g, '').trim().toLowerCase();
      if (label === 'minimum' || label === 'recommended' || label === 'mindestens' || label === 'empfohlen') continue;
      for (const [key, names] of Object.entries(REQ_LABELS)) {
        if (names.includes(label) && !out[key]) { out[key] = m[2].trim(); any = true; }
      }
    }
    if (!any) {          // ältere Spiele: ein Freitext ohne Bezeichnungen
      const t = plain(html.replace(/<strong>\s*(minimum|recommended|mindestens|empfohlen)\s*:?\s*<\/strong>/ig, ''));
      if (t && !/^(minimum|recommended)\s*:?$/i.test(t)) out.notes = t;
    }
    return out;
  }

  /* "4 GB RAM" -> 4, "512 MB" -> 0.512 (in GB, wie im Cover-Tool) */
  function parseSize(text) {
    const m = String(text || '').match(/(\d+(?:[.,]\d+)?)\s*(GB|GiB|MB|MiB|TB)/i);
    if (!m) return '';
    let n = parseFloat(m[1].replace(',', '.'));
    const unit = m[2].toLowerCase();
    if (unit === 'mb' || unit === 'mib') n /= 1000;
    else if (unit === 'tb') n *= 1000;
    return String(Math.round(n * 1000) / 1000);
  }

  /* Windows-Versionen aus "Windows 7 / 8 / 10 (64-bit)" */
  function parseWindows(text) {
    const t = String(text || '');
    if (!/windows|win\b/i.test(t)) return { win: [], x64: /64\s*-?\s*bit/i.test(t) };
    const win = [];
    if (/\bxp\b/i.test(t)) win.push('XP');
    if (/\bvista\b/i.test(t)) win.push('Vista');
    if (/\b7\b/.test(t)) win.push('7');
    if (/\b8(\.1)?\b/.test(t)) win.push('8');
    if (/\b10\b/.test(t)) win.push('10');
    if (/\b11\b/.test(t)) win.push('11');
    return { win, x64: /64\s*-?\s*bit/i.test(t) };
  }

  /* Steam-Kategorien -> Spielfunktionen des Cover-Tools */
  const FEATURE_BY_ID = { 2: 'single_player', 1: 'multi_player', 49: 'multi_player', 36: 'multi_player', 9: 'co_op', 38: 'co_op', 39: 'co_op', 22: 'achievements', 23: 'cloud_saves', 28: 'controller_support', 18: 'controller_support', 25: 'leaderboards' };
  const FEATURE_ORDER = ['single_player', 'co_op', 'multi_player', 'controller_support', 'achievements', 'cloud_saves', 'leaderboards'];
  function steamFeatures(categories) {
    const found = new Set();
    for (const c of categories || []) if (c && FEATURE_BY_ID[c.id]) found.add(FEATURE_BY_ID[c.id]);
    return FEATURE_ORDER.filter((f) => found.has(f));
  }

  /* Steam-Texte sind oft sehr lang (z. B. ganze Sätze bei der Grafikkarte). Auf dem Cover ist wenig Platz:
     lange Angaben werden an einer Stelle mit Komma, Schrägstrich oder "or" gekürzt. */
  function shorten(text, max) {
    const t = String(text || '').trim().replace(/\s+/g, ' ');
    if (t.length <= (max || 80)) return t;
    const limit = (max || 80) - 4, cut = t.slice(0, limit);          // Platz für " ..."
    const at = Math.max(cut.lastIndexOf(', '), cut.lastIndexOf(' / '), cut.lastIndexOf(' or '), cut.lastIndexOf('; '), cut.lastIndexOf('. '), cut.lastIndexOf(' ('));
    return (at > 25 ? cut.slice(0, at) : cut.replace(/\s+\S*$/, '')).trim().replace(/[,;.]$/, '') + ' ...';
  }

  /* Ergebnis: Änderungen für den Zustand des Cover-Tools (nur gefundene Werte) und eine Liste zur Anzeige */
  function steamPatch(details, which) {
    const req = (details.pc_requirements && !Array.isArray(details.pc_requirements) ? details.pc_requirements : {});
    const r = parseRequirements(which === 'recommended' ? (req.recommended || req.minimum) : (req.minimum || req.recommended));
    const patch = {}, shown = [];
    const add = (label, value, kind) => { if (value) shown.push([label, value, kind || '']); };
    const os = parseWindows(r.os), plat = details.platforms || {};
    if (os.win.length || plat.mac || plat.linux) {
      patch.os = {}; if (os.win.length) { patch.os.win = os.win; patch.os.x64 = os.x64; }
      if ('mac' in plat) patch.os.mac = !!plat.mac;
      if ('linux' in plat) patch.os.linux = !!plat.linux;
      add('Läuft auf', [os.win.length ? 'Windows (' + os.win.join(', ') + ')' : '', plat.mac ? 'macOS' : '', plat.linux ? 'Linux' : ''].filter(Boolean).join(' / '));
    }
    /* Prozessor und Grafikkarte kommen möglichst in die Kategorien (Intel, AMD, NVIDIA, Radeon). Passt der Text nicht
       sauber hinein (z. B. "Pentium III 500 MHz", "Intel HD Graphics 520"), wird er als eigener Text übernommen. */
    if (r.processor) {
      const c = Core && Core.parseCpuText(r.processor);
      if (c) { patch.cpu = { ...c.cpu, custom: '' }; add('Prozessor', Core.cpuList(c.cpu).join(' / '), 'Kategorie'); }
      else { patch.cpu = { custom: shorten(r.processor) }; add('Prozessor', patch.cpu.custom, 'Text'); }
    }
    if (r.graphics) {
      const g = Core && Core.parseGpuText(r.graphics);
      if (g) { patch.gpu = { ...g.gpu, custom: '' }; add('Grafik', Core.gpuList(g.gpu).join(' / '), 'Kategorie'); }
      else { patch.gpu = { custom: shorten(r.graphics) }; add('Grafik', patch.gpu.custom, 'Text'); }
    }
    const ram = parseSize(r.memory); if (ram) { patch.ram = ram; add('Arbeitsspeicher', r.memory); }
    const space = parseSize(r.storage); if (space) { patch.space = space; add('Speicherplatz', r.storage); }
    if (r.directx) { patch.dx = shorten(r.directx, 40); add('DirectX', patch.dx); }
    const other = [r.sound ? (/sound/i.test(r.sound) ? r.sound : 'Soundkarte: ' + r.sound) : '', r.notes].filter(Boolean).join('. ');
    if (other) { patch.other = shorten(other, 60); add('Sonstiges', patch.other); }
    const feats = steamFeatures(details.categories);
    if (feats.length) { patch.features = feats; add('Spielfunktionen', feats.join(', ')); }
    return { patch, shown, hasRequirements: Object.keys(r).length > 0 };
  }

  const api = { settings, net, sgGet, sgSearch, sgImages, sortImages, fetchBlob, steamSearch, steamDetails, parseSteamRef, shorten, testConnection, checkResponse, parseRequirements, parseSize, parseWindows, steamFeatures, steamPatch, SG_KINDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CoverOnline = api;
})(typeof window !== 'undefined' ? window : globalThis);
