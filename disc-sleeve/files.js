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
  async function packSettings(values, password) {
    const plain = { type: 'discmenu-settings', version: 1, sgdbKey: values.key || '', proxy: values.proxy || '' };
    if (values.brandfetch) plain.brandfetchId = values.brandfetch;      // optional, der Konfigurator ignoriert das Feld
    if (!password) return JSON.stringify(plain, null, 2) + '\n';
    if (!subtle()) throw new Error('Dieser Browser kann hier nicht verschlüsseln. Die Datei lässt sich nur ohne Passwort sichern.');
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16)), iv = globalThis.crypto.getRandomValues(new Uint8Array(12)), iterations = 250000;
    const key = await deriveKey(password, salt, iterations);
    const data = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(plain))));
    return JSON.stringify({ type: 'discmenu-settings', version: 1, encrypted: true, kdf: 'PBKDF2-SHA256', iterations, salt: b64(salt), iv: b64(iv), data: b64(data) }, null, 2) + '\n';
  }

  /* Gibt { key, proxy } zurück. Ist die Datei verschlüsselt und kein Passwort da, ist der Fehlertext "PASSWORD_NEEDED". */
  async function unpackSettings(text, password) {
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
    const out = { key: String(plain.sgdbKey || ''), proxy: String(plain.proxy || '') };
    if (plain.brandfetchId) out.brandfetch = String(plain.brandfetchId);
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
  const IMAGE_KEYS = ['front', 'backTop', 'backBottom', 'publisher', 'spineLogo', 'spineBg', 'shot1', 'shot2', 'shot3', 'shot4'];
  const EXT_BY_TYPE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };
  const TYPE_BY_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };

  /* state: Einstellungen des Cover-Tools. images: { schlüssel: { data: Uint8Array, type, name } }. Ergebnis: ZIP als Uint8Array. */
  function packProject(state, images) {
    const files = [], meta = {};
    for (const key of IMAGE_KEYS) {
      const img = images && images[key];
      if (!img) continue;
      const ext = EXT_BY_TYPE[img.type] || 'png', path = 'images/' + key + '.' + ext;
      files.push({ name: path, data: img.data });
      meta[key] = { file: path, name: img.name || '' };
    }
    const json = { type: PROJECT_TYPE, version: 1, state, images: meta };
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
    for (const key of IMAGE_KEYS) {
      const m = j.images && j.images[key];
      if (!m || typeof m.file !== 'string') continue;
      const f = files.find((x) => x.name === m.file);
      if (!f) { missing.push(key); continue; }
      images[key] = { data: f.data, type: TYPE_BY_EXT[(m.file.split('.').pop() || '').toLowerCase()] || 'image/png', name: String(m.name || m.file.split('/').pop()) };
    }
    return { state: j.state, images, missing };
  }

  const api = { packSettings, unpackSettings, buildZip, crc32, packProject, unpackProject, IMAGE_KEYS, TYPE_BY_EXT, PROJECT_TYPE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CoverFiles = api;
})(typeof window !== 'undefined' ? window : globalThis);
