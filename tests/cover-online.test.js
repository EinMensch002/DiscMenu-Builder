const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const C = require('../cover-tool/core.js');
const O = require('../cover-tool/online.js');
const Z = require('../cover-tool/zip.js');

// Kleiner Speicher-Ersatz für localStorage
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const withFetch = async (fn, impl) => { const old = globalThis.fetch; globalThis.fetch = impl; try { return await fn(); } finally { globalThis.fetch = old; } };
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, blob: async () => new Blob([JSON.stringify(body)]) });

const STEAM_MIN = '<strong>Minimum:</strong><br><ul class="bb_ul"><li><strong>OS *:</strong> Windows 7 / 8 / 10 (64-bit)<br></li><li><strong>Processor:</strong> Intel&reg; Core&trade; 2 Duo E6600 or AMD Phenom X3 8750<br></li><li><strong>Memory:</strong> 2 GB RAM<br></li><li><strong>Graphics:</strong> NVIDIA GeForce 8800 GT<br></li><li><strong>DirectX:</strong> Version 9.0c<br></li><li><strong>Storage:</strong> 8 GB available space<br></li><li><strong>Sound Card:</strong> DirectX compatible<br></li><li><strong>Additional Notes:</strong> Controller recommended</li></ul>';

test('Steam-Anforderungen: Bezeichnungen, Sonderzeichen und Größen', () => {
  const r = O.parseRequirements(STEAM_MIN);
  assert.equal(r.os, 'Windows 7 / 8 / 10 (64-bit)');
  assert.equal(r.processor, 'Intel® Core™ 2 Duo E6600 or AMD Phenom X3 8750');
  assert.equal(r.memory, '2 GB RAM');
  assert.equal(r.graphics, 'NVIDIA GeForce 8800 GT');
  assert.equal(r.directx, 'Version 9.0c');
  assert.equal(r.storage, '8 GB available space');
  assert.equal(r.notes, 'Controller recommended');
  assert.equal(O.parseSize('4 GB RAM'), '4');
  assert.equal(O.parseSize('512 MB'), '0.512');
  assert.equal(O.parseSize('1,5 GB'), '1.5');
  assert.equal(O.parseSize('viel'), '');
  assert.deepEqual(O.parseWindows('Windows XP, Vista, 7, 8.1, 10 (64-bit)'), { win: ['XP', 'Vista', '7', '8', '10'], x64: true });
  assert.deepEqual(O.parseWindows('SteamOS'), { win: [], x64: false });
});

test('Steam-Anforderungen: deutsche Bezeichnungen, Freitext und leere Angaben', () => {
  const de = O.parseRequirements('<ul><li><strong>Betriebssystem *:</strong> Windows 10<br></li><li><strong>Prozessor:</strong> Intel Core i5<br></li><li><strong>Arbeitsspeicher:</strong> 4 GB RAM<br></li><li><strong>Speicherplatz:</strong> 10 GB verfügbarer Speicherplatz</li></ul>');
  assert.deepEqual(Object.keys(de).sort(), ['memory', 'os', 'processor', 'storage']);
  assert.equal(O.parseRequirements('<strong>Minimum:</strong><br>Windows 98, Pentium 200 MHz, 32 MB RAM').notes, 'Windows 98, Pentium 200 MHz, 32 MB RAM');
  assert.deepEqual(O.parseRequirements(''), {});
  assert.deepEqual(O.parseRequirements(undefined), {});
  assert.deepEqual(O.parseRequirements('<strong>Minimum:</strong>'), {});
});

test('Steam: Auswahl für das Cover-Tool (Anforderungen, Plattformen, Funktionen)', () => {
  const details = {
    pc_requirements: { minimum: STEAM_MIN, recommended: '<ul><li><strong>OS *:</strong> Windows 10<br></li><li><strong>Memory:</strong> 8 GB RAM<br></li></ul>' },
    platforms: { windows: true, mac: false, linux: true },
    categories: [{ id: 2, description: 'Single-player' }, { id: 9 }, { id: 22 }, { id: 28 }, { id: 23 }, { id: 99 }],
  };
  const min = O.steamPatch(details, 'minimum');
  assert.deepEqual(min.patch.os, { win: ['7', '8', '10'], x64: true, mac: false, linux: true });
  assert.equal(min.patch.cpu.custom, 'Intel® Core™ 2 Duo E6600 or AMD Phenom X3 8750');
  assert.equal(min.patch.gpu.custom, 'NVIDIA GeForce 8800 GT');
  assert.equal(min.patch.ram, '2'); assert.equal(min.patch.space, '8'); assert.equal(min.patch.dx, 'Version 9.0c');
  assert.equal(min.patch.other, 'Soundkarte: DirectX compatible. Controller recommended');
  assert.deepEqual(min.patch.features, ['single_player', 'co_op', 'controller_support', 'achievements', 'cloud_saves']);
  assert.ok(min.hasRequirements && min.shown.length >= 8);
  const rec = O.steamPatch(details, 'recommended');
  assert.equal(rec.patch.ram, '8'); assert.deepEqual(rec.patch.os.win, ['10']);
  // Kein Eintrag, leere Liste (Steam liefert bei fehlenden Angaben ein leeres Array)
  const none = O.steamPatch({ pc_requirements: [], categories: [] }, 'minimum');
  assert.deepEqual(none.patch, {}); assert.equal(none.hasRequirements, false);
  // Lange Zusatzangaben werden gekürzt, damit sie auf das Cover passen
  const long = O.steamPatch({ pc_requirements: { minimum: '<ul><li><strong>Additional Notes:</strong> ' + 'x'.repeat(200) + '</li></ul>' } }, 'minimum');
  assert.ok(long.patch.other.length <= 90);
});

test('Der Auszug von Steam passt in den Zustand des Cover-Tools', () => {
  const details = { pc_requirements: { minimum: STEAM_MIN }, platforms: { windows: true }, categories: [{ id: 2 }] };
  const merged = C.mergeState({ ...C.defaultState(), ...O.steamPatch(details, 'minimum').patch, os: { ...C.defaultState().os, ...O.steamPatch(details, 'minimum').patch.os } });
  const rows = C.buildSpecs(merged);
  assert.equal(rows.find((r) => r.key === 'cpu').values[0], 'Intel® Core™ 2 Duo E6600 or AMD Phenom X3 8750');
  assert.equal(rows.find((r) => r.key === 'space').values[0], '8 GB freier Speicherplatz');
});

test('Rezept: Spiele sortiert, Anbieter geprüft, Größe als Speicherplatz', () => {
  const games = C.recipeGames({ games: [{ index: 2, name: 'C', provider: 'steam' }, { index: 0, name: 'A', provider: 'gog', estimatedSizeMB: 1500, cover: 'assets/a.png' }, { index: 1, name: 'B', provider: 'origin' }, { index: 3 }] });
  assert.deepEqual(games.map((g) => g.name), ['A', 'B', 'C']);
  assert.deepEqual(games.map((g) => g.provider), ['gog', 'gog', 'steam']);
  assert.deepEqual(C.statePatchFromGame(games[0]), { title: 'A', provider: 'gog', space: '1.5' });
  assert.deepEqual(C.statePatchFromGame(games[2]), { title: 'C', provider: 'steam' });
  assert.deepEqual(C.recipeGames(null), []);
});

test('ZIP lesen: gespeichert und komprimiert, Umlaute in Namen, kaputte Dateien', async () => {
  const text = 'menu.json Inhalt '.repeat(50);
  const files = [{ name: 'menu.json', data: Buffer.from(text), deflate: true }, { name: 'assets/Größe.png', data: Buffer.from([1, 2, 3, 4]) }];
  // minimale ZIP von Hand bauen (wie ein Rezept aus dem Konfigurator)
  const chunks = [], central = []; let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name), comp = f.deflate ? zlib.deflateRawSync(f.data) : f.data, method = f.deflate ? 8 : 0;
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(method, 8);
    h.writeUInt32LE(0, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(f.data.length, 22); h.writeUInt16LE(name.length, 26);
    chunks.push(h, name, comp);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(method, 10);
    c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(f.data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, name); offset += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  const zip = new Uint8Array(Buffer.concat([...chunks, cd, end]));
  const out = await Z.read(zip);
  assert.deepEqual(out.map((f) => f.name), ['menu.json', 'assets/Größe.png']);
  assert.equal(Buffer.from(out[0].data).toString(), text);
  assert.deepEqual([...out[1].data], [1, 2, 3, 4]);
  await assert.rejects(Z.read(new Uint8Array(10)), /keine gültige ZIP/);
});

test('Einstellungen teilen sich die Namen mit dem Konfigurator', () => {
  mem.clear();
  O.settings.save('  abc  ', ' https://p.example/?url={url} ');
  assert.equal(mem.get('sgdb-key'), 'abc');
  assert.equal(mem.get('sgdb-proxy'), 'https://p.example/?url={url}');
  assert.equal(O.settings.key, 'abc');
  O.settings.save('', '');
  assert.equal(mem.has('sgdb-key'), false);
});

test('SteamGridDB und Steam: Anfragen laufen über den Proxy, Fehler sind verständlich', async () => {
  mem.clear(); O.settings.save('KEY', 'https://proxy.example/?url={url}');
  const seen = [];
  const ok = (url, init) => {
    const proxy = new URL(url);
    assert.equal(proxy.origin, 'https://proxy.example');                       // jede Anfrage geht über den Proxy
    url = proxy.searchParams.get('url');
    seen.push({ url, auth: init && init.headers && init.headers.Authorization });
    if (/storesearch/.test(url)) return json({ items: [{ id: 10, name: 'Half-Life' }, { id: 0, name: 'x' }] });
    if (/appdetails/.test(url)) return json({ 10: { success: true, data: { name: 'Half-Life' } } });
    if (/autocomplete/.test(url)) return json({ success: true, data: [{ id: 5, name: 'Half-Life' }] });
    if (/grids/.test(url)) return json({ success: true, data: [{ id: 1, score: 1, language: 'en' }, { id: 2, score: 0, language: 'de' }] });
    return json({}, 404);
  };
  await withFetch(async () => {
    assert.deepEqual((await O.steamSearch('Half Life')).map((i) => i.id), [10]);
    assert.equal((await O.steamDetails('10')).name, 'Half-Life');
    assert.equal((await O.sgSearch('Half-Life'))[0].id, 5);
    assert.deepEqual((await O.sgImages(5, 'cover')).map((i) => i.id), [2, 1]);     // Deutsch zuerst
  }, ok);
  assert.ok(seen.every((s) => /^https:\/\/(store\.steampowered\.com|www\.steamgriddb\.com)\//.test(s.url)));
  assert.equal(seen.find((s) => /autocomplete/.test(s.url)).auth, 'Bearer KEY');
  assert.match(seen.find((s) => /grids/.test(s.url)).url, /dimensions=600x900/);

  await withFetch(async () => {
    await assert.rejects(O.sgSearch('x'), /Schlüssel wurde abgelehnt/);
  }, async () => json({ success: false }, 401));
  await withFetch(async () => {
    await assert.rejects(O.steamDetails('3'), /keine Daten/);
  }, async () => json({ 3: { success: false } }));
  await withFetch(async () => {
    await assert.rejects(O.sgSearch('x'), /Proxy ist nicht erreichbar/);
  }, async () => { throw new TypeError('Failed to fetch'); });
  O.settings.save('KEY', '');
  await withFetch(async () => {
    await assert.rejects(O.sgSearch('x'), /CORS/);
  }, async () => { throw new TypeError('Failed to fetch'); });
  O.settings.save('', '');
  await assert.rejects(O.sgSearch('x'), /API-Schlüssel in den Einstellungen/);
});
