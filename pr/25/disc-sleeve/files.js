/* Dateien des Cover-Tools:
   1. Einstellungsdatei (SteamGridDB-Schlüssel und Proxy), optional mit Passwort verschlüsselt. Das Format ist
      dasselbe wie im Konfigurator, eine dort gesicherte Datei lässt sich hier einlesen und umgekehrt.
   2. Projektdatei: ZIP mit cover.json (alle Einstellungen) und den Bildern.
   Ohne Zugriff auf die Seite, damit sich alles mit Node testen lässt. */
(function (root) {
  'use strict';

  /* ---------- Einstellungsdatei ---------- */
  const b64 = (u8) => { let t = ''; for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(t); };
  const unb64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
  const subtle = () => (globalThis.crypto && globalThis.crypto.subtle) || null;

  async function deriveKey(password, salt, iterations) {
    const base = await subtle().importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return subtle().deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  /* values: { key, proxy }. Ohne Passwort entsteht lesbarer Text, mit Passwort eine verschlüsselte Datei. */
  const credsPart = (values) => { const p = { sgdbKey: values.key || '', proxy: values.proxy || '' }; if (values.brandfetch) p.brandfetchId = values.brandfetch; return p; };   // Brandfetch optional, der Konfigurator ignoriert das Feld
  async function packSettings(values, password) { return packPlain({ type: 'discmenu-settings', version: 1, ...credsPart(values) }, password); }
  async function packPlain(plain, password) {
    if (!password) return JSON.stringify(plain, null, 2) + '\n';
    if (!subtle()) throw new Error('Dieser Browser kann hier nicht verschlüsseln. Die Datei lässt sich nur ohne Passwort sichern.');
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16)), iv = globalThis.crypto.getRandomValues(new Uint8Array(12)), iterations = 250000;
    const key = await deriveKey(password, salt, iterations);
    const data = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(plain))));
    return JSON.stringify({ type: 'discmenu-settings', version: 1, encrypted: true, kdf: 'PBKDF2-SHA256', iterations, salt: b64(salt), iv: b64(iv), data: b64(data) }, null, 2) + '\n';
  }

  /* Gibt { key, proxy } zurück. Ist die Datei verschlüsselt und kein Passwort da, ist der Fehlertext "PASSWORD_NEEDED". */
  async function unpackSettings(text, password) {
    const plain = await readPlain(text, password);
    const out = { key: String(plain.sgdbKey || ''), proxy: String(plain.proxy || '') };
    if (plain.brandfetchId) out.brandfetch = String(plain.brandfetchId);
    return out;
  }
  async function readPlain(text, password) {
    let j;
    try { j = JSON.parse(text); } catch (e) { throw new Error('Die Datei ist keine gültige Einstellungsdatei.'); }
    if (!j || j.type !== 'discmenu-settings') throw new Error('Das ist keine Einstellungsdatei von DiscMenu.');
    let plain = j;
    if (j.encrypted) {
      if (!password) throw new Error('PASSWORD_NEEDED');
      if (!subtle()) throw new Error('Dieser Browser kann hier nicht entschlüsseln.');
      const it = Number(j.iterations);
      if (!(it >= 100000 && it <= 2000000)) throw new Error('Die Einstellungsdatei ist beschädigt.');
      try {
        const key = await deriveKey(password, unb64(j.salt), it);
        plain = JSON.parse(new TextDecoder().decode(await subtle().decrypt({ name: 'AES-GCM', iv: unb64(j.iv) }, key, unb64(j.data))));
      } catch (e) { throw new Error('Falsches Passwort oder beschädigte Datei.'); }
    }
    return plain;
  }

  /* ---------- Sicherungsdatei mit Bereichen ----------
     Dieselbe Datei (type discmenu-settings) kann Zugangsdaten, eigene Vorlagen und eigene Schriften enthalten, jeder Bereich ist optional.
     Beim Einlesen werden nur Bereiche verändert, die in der Datei stehen. */
  const FONT_MIME = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' };
  const MAX_FONT_BYTES = 1500000;
  const b64Bytes = (s) => Math.floor(s.length * 3 / 4) - (s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0);
  const core = () => (typeof module !== 'undefined' && module.exports ? require('./core.js') : root.CoverCore);
  /* Schrift aus Datei oder Speicher prüfen: { name, ext, data (Base64) }. Ungültiges ergibt null. */
  function normalizeFont(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = String(raw.name == null ? '' : raw.name).replace(/\s+/g, ' ').trim().slice(0, core().MAX_NAME);
    const ext = FONT_MIME[raw.ext] ? raw.ext : '';
    const data = typeof raw.data === 'string' ? raw.data : '';
    if (!name || !ext || !/^[A-Za-z0-9+/]+={0,2}$/.test(data) || data.length % 4 || b64Bytes(data) > MAX_FONT_BYTES || b64Bytes(data) < 100) return null;
    return { name, ext, data };
  }
  const hasCreds = (c) => !!(c && (c.key || c.proxy || c.brandfetch));
  /* parts: { creds?: { key, proxy, brandfetch }, templates?: [Vorlage], fonts?: [Schrift] }. Leere Bereiche werden nicht geschrieben. */
  async function packBundle(parts, password) {
    const plain = { type: 'discmenu-settings', version: 1 };
    if (hasCreds(parts.creds)) Object.assign(plain, credsPart(parts.creds));
    if (parts.templates && parts.templates.length) plain.templates = parts.templates.map((t) => ({ name: t.name, ref: t.ref, items: t.items }));
    if (parts.fonts && parts.fonts.length) plain.fonts = parts.fonts.map((x) => ({ name: x.name, ext: x.ext, data: x.data }));
    return packPlain(plain, password);
  }
  /* Ergebnis: nur die Bereiche, die in der Datei stehen (und gültig sind). Fehlerhaftes wird weggelassen, ihre Zahl steht in skipped. */
  async function unpackBundle(text, password) {
    const plain = await readPlain(text, password), C = core(), out = { skipped: 0 };
    const c = { key: String(plain.sgdbKey || ''), proxy: String(plain.proxy || ''), brandfetch: String(plain.brandfetchId || '') };
    if (hasCreds(c)) out.creds = c;
    if (Array.isArray(plain.templates)) {
      const list = plain.templates.slice(0, C.MAX_TEMPLATES).map((t) => C.normalizeTemplate(t)).filter(Boolean);
      out.skipped += plain.templates.length - list.length; out.templates = list;
    }
    if (Array.isArray(plain.fonts)) {
      const list = plain.fonts.slice(0, C.MAX_FONTS).map((x) => normalizeFont(x)).filter(Boolean);
      out.skipped += plain.fonts.length - list.length; out.fonts = list;
    }
    return out;
  }
  const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();
  /* Was würde das Einlesen tun? current: { creds: {key, proxy, brandfetch}, templates: [...], fonts: [...] } (nur Eigenes).
     Ergebnis zeigt je Eintrag, ob er neu ist oder mit Vorhandenem zusammenstößt. Verändert nichts. */
  function planImport(bundle, current) {
    const cur = current || {}, plan = {};
    if (bundle.creds) {
      const have = cur.creds || {};
      plan.creds = ['key', 'proxy', 'brandfetch'].filter((f) => bundle.creds[f]).map((f) => ({ field: f, value: bundle.creds[f], conflict: !!have[f] && have[f] !== bundle.creds[f] }));
    }
    for (const sec of ['templates', 'fonts']) {
      if (!bundle[sec]) continue;
      plan[sec] = bundle[sec].map((x) => ({ item: x, name: x.name, conflict: (cur[sec] || []).some((y) => sameName(y.name, x.name)) }));
    }
    return plan;
  }
  /* Eindeutiger Name: "Name", "Name (2)", "Name (3)" ... */
  function freeName(name, taken) {
    if (!taken.some((n) => sameName(n, name))) return name;
    for (let i = 2; i < 1000; i++) { const n = name.slice(0, 54) + ' (' + i + ')'; if (!taken.some((t) => sameName(t, n))) return n; }
    return name;
  }
  /* Ergebnis des Einlesens berechnen (ohne etwas zu speichern). choices:
       sections: { creds, templates, fonts } = false schließt einen Bereich aus (Standard: an)
       creds: 'replace' | 'skip' für Felder, die schon einen anderen Wert haben (Standard: skip)
       templates / fonts: Liste je Eintrag in der Reihenfolge des Plans: 'replace' | 'both' | 'skip' (Standard bei Namensgleichheit: both)
     Ergebnis: { creds: {feld: wert}, templates: { add: [...], replace: [{ name, item }] }, fonts: ... } */
  function applyImport(plan, current, choices) {
    const ch = choices || {}, on = (s) => !ch.sections || ch.sections[s] !== false, cur = current || {}, out = {};
    if (plan.creds && on('creds')) {
      out.creds = {};
      for (const e of plan.creds) if (!e.conflict || ch.creds === 'replace') out.creds[e.field] = e.value;     // Leeres in der Datei löscht nie etwas, Vorhandenes bleibt ohne Zustimmung
    }
    for (const sec of ['templates', 'fonts']) {
      if (!plan[sec] || !on(sec)) continue;
      const res = { add: [], replace: [] }, taken = (cur[sec] || []).map((y) => y.name);
      plan[sec].forEach((e, i) => {
        const c = (ch[sec] && ch[sec][i]) || (e.conflict ? 'both' : 'add');
        if (c === 'skip') return;
        if (e.conflict && c === 'replace') { res.replace.push({ name: e.name, item: e.item }); return; }
        const item = { ...e.item, name: e.conflict ? freeName(e.name, taken) : e.name }; taken.push(item.name); res.add.push(item);
      });
      out[sec] = res;
    }
    return out;
  }

  /* ---------- ZIP schreiben (gespeichert, ohne Kompression) ---------- */
  let T = null;
  function crc32(u8) {
    if (!T) { T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; } }
    let c = 0xFFFFFFFF;
    for (let i = 0; i < u8.length; i++) c = T[(c ^ u8[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function buildZip(files) {
    const enc = new TextEncoder(), now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const es = files.map((f) => ({ nb: enc.encode(f.name), data: f.data, crc: crc32(f.data) }));
    let size = 22;
    for (const e of es) size += 30 + e.nb.length + e.data.length + 46 + e.nb.length;
    const out = new Uint8Array(size), dv = new DataView(out.buffer);
    let p = 0;
    const offs = [];
    for (const e of es) {
      offs.push(p);
      dv.setUint32(p, 0x04034b50, true); dv.setUint16(p + 4, 20, true); dv.setUint16(p + 6, 0x0800, true); dv.setUint16(p + 8, 0, true);
      dv.setUint16(p + 10, time, true); dv.setUint16(p + 12, date, true); dv.setUint32(p + 14, e.crc, true);
      dv.setUint32(p + 18, e.data.length, true); dv.setUint32(p + 22, e.data.length, true);
      dv.setUint16(p + 26, e.nb.length, true); dv.setUint16(p + 28, 0, true); p += 30;
      out.set(e.nb, p); p += e.nb.length; out.set(e.data, p); p += e.data.length;
    }
    const cd = p;
    es.forEach((e, i) => {
      dv.setUint32(p, 0x02014b50, true); dv.setUint16(p + 4, 20, true); dv.setUint16(p + 6, 20, true); dv.setUint16(p + 8, 0x0800, true); dv.setUint16(p + 10, 0, true);
      dv.setUint16(p + 12, time, true); dv.setUint16(p + 14, date, true); dv.setUint32(p + 16, e.crc, true);
      dv.setUint32(p + 20, e.data.length, true); dv.setUint32(p + 24, e.data.length, true);
      dv.setUint16(p + 28, e.nb.length, true); dv.setUint16(p + 30, 0, true); dv.setUint16(p + 32, 0, true); dv.setUint16(p + 34, 0, true);
      dv.setUint16(p + 36, 0, true); dv.setUint32(p + 38, 0, true); dv.setUint32(p + 42, offs[i], true); p += 46;
      out.set(e.nb, p); p += e.nb.length;
    });
    dv.setUint32(p, 0x06054b50, true); dv.setUint16(p + 4, 0, true); dv.setUint16(p + 6, 0, true);
    dv.setUint16(p + 8, es.length, true); dv.setUint16(p + 10, es.length, true);
    dv.setUint32(p + 12, p - cd, true); dv.setUint32(p + 16, cd, true); dv.setUint16(p + 20, 0, true);
    return out;
  }

  /* ---------- Projektdatei ---------- */
  const PROJECT_TYPE = 'discmenu-cover';
  const IMAGE_KEYS = ['front', 'backTop', 'backBottom', 'publisher', 'spineLogo', 'spineBg'];        // feste Bildfelder; dazu kommen Bilder der Gestaltungsfläche (d1, d2, ...)
  const isImageKey = (k) => IMAGE_KEYS.includes(k) || /^d\d{1,6}$/.test(String(k));
  const EXT_BY_TYPE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };
  const TYPE_BY_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };

  const FONT_ID = /^uf-[a-z0-9]{1,12}$/;
  /* Kennungen eigener Schriften, die Texte im Projekt benutzen */
  function usedFontIds(state) {
    const ids = [];
    for (const it of (state && state.back && Array.isArray(state.back.items)) ? state.back.items : []) if (it && typeof it.font === 'string' && FONT_ID.test(it.font) && !ids.includes(it.font)) ids.push(it.font);
    return ids;
  }
  /* Kennungen ersetzen (alt -> neu), z. B. wenn eine Schrift beim Öffnen unter neuer Kennung gespeichert wurde. Ändert state. */
  function remapFonts(state, map) {
    for (const it of (state && state.back && Array.isArray(state.back.items)) ? state.back.items : []) if (it && map[it.font]) it.font = map[it.font];
    return state;
  }

  /* state: Einstellungen des Cover-Tools. images: { schlüssel: { data: Uint8Array, type, name } }.
     fonts (optional): eigene Schriften { id, name, ext, data (Base64) }, die im Projekt benutzt werden. Ergebnis: ZIP als Uint8Array. */
  function packProject(state, images, fonts) {
    const files = [], meta = {}, fmeta = {};
    for (const key of Object.keys(images || {}).filter(isImageKey)) {
      const img = images[key];
      if (!img) continue;
      const ext = EXT_BY_TYPE[img.type] || 'png', path = 'images/' + key + '.' + ext;
      files.push({ name: path, data: img.data });
      meta[key] = { file: path, name: img.name || '' };
    }
    for (const f of (fonts || []).slice(0, core().MAX_FONTS)) {
      const n = normalizeFont(f);
      if (!n || !FONT_ID.test(String(f.id))) continue;
      const path = 'fonts/' + f.id + '.' + n.ext;
      files.push({ name: path, data: unb64(n.data) });
      fmeta[f.id] = { file: path, name: n.name };
    }
    const json = { type: PROJECT_TYPE, version: 1, state, images: meta };
    if (Object.keys(fmeta).length) json.fonts = fmeta;
    return buildZip([{ name: 'cover.json', data: new TextEncoder().encode(JSON.stringify(json, null, 2) + '\n') }, ...files]);
  }

  /* files: Ergebnis des ZIP-Lesers ([{name, data}]). Ergebnis: { state, images }. */
  function unpackProject(files) {
    const cj = files.find((f) => f.name === 'cover.json');
    if (!cj) throw new Error('In der ZIP fehlt die cover.json. Das ist keine Projektdatei des Cover-Tools.');
    let j;
    try { j = JSON.parse(new TextDecoder().decode(cj.data)); } catch (e) { throw new Error('Die cover.json ist beschädigt.'); }
    if (!j || j.type !== PROJECT_TYPE) throw new Error('Das ist keine Projektdatei des Cover-Tools.');
    if (j.version > 1) throw new Error('Die Projektdatei stammt aus einer neueren Version des Cover-Tools.');
    const images = {}, missing = [];
    for (const key of Object.keys((j.images && typeof j.images === 'object') ? j.images : {}).filter(isImageKey)) {
      const m = j.images[key];
      if (!m || typeof m.file !== 'string') continue;
      const f = files.find((x) => x.name === m.file);
      if (!f) { missing.push(key); continue; }
      images[key] = { data: f.data, type: TYPE_BY_EXT[(m.file.split('.').pop() || '').toLowerCase()] || 'image/png', name: String(m.name || m.file.split('/').pop()) };
    }
    const fonts = [];
    for (const id of Object.keys((j.fonts && typeof j.fonts === 'object') ? j.fonts : {}).slice(0, core().MAX_FONTS)) {
      const m = j.fonts[id];
      if (!FONT_ID.test(id) || !m || typeof m.file !== 'string') continue;
      const f = files.find((x) => x.name === m.file);
      const n = f && normalizeFont({ name: m.name, ext: (m.file.split('.').pop() || '').toLowerCase(), data: b64(f.data) });
      if (n) fonts.push({ id, ...n });
    }
    return { state: j.state, images, missing, fonts };
  }

  const api = { packSettings, unpackSettings, packBundle, unpackBundle, planImport, applyImport, freeName, toBase64: b64, fromBase64: unb64, normalizeFont, FONT_MIME, MAX_FONT_BYTES, buildZip, crc32, usedFontIds, remapFonts, packProject, unpackProject, IMAGE_KEYS, isImageKey, TYPE_BY_EXT, PROJECT_TYPE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CoverFiles = api;
})(typeof window !== 'undefined' ? window : globalThis);
