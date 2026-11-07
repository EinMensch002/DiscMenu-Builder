/* Liest eine ZIP-Datei (Rezept-ZIP aus dem Konfigurator). Speichern (0) und Deflate (8) werden unterstützt.
   Gleiche Logik wie im Konfigurator, dort liegt sie in der einen HTML-Datei. */
(function (root) {
  'use strict';

  async function read(buf) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let e = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    }
    if (e < 0) throw new Error('Das ist keine gültige ZIP-Datei.');
    const n = dv.getUint16(e + 10, true);
    let p = dv.getUint32(e + 16, true);
    const dec = new TextDecoder(), out = [];
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Die ZIP-Datei ist beschädigt.');
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = dec.decode(buf.subarray(p + 46, p + 46 + nl)).replace(/\\/g, '/');
      p += 46 + nl + xl + cl;
      if (name.endsWith('/')) continue;
      const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
      const raw = buf.subarray(start, start + csize);
      let data;
      if (method === 0) data = raw.slice();
      else if (method === 8) data = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else throw new Error('Nicht unterstützte ZIP-Kompression bei ' + name);
      out.push({ name, data });
    }
    return out;
  }

  const api = { read };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CoverZip = api;
})(typeof window !== 'undefined' ? window : globalThis);
