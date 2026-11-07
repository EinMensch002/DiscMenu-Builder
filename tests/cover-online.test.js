const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const C = require('../disc-sleeve/core.js');
const O = require('../disc-sleeve/online.js');
const Z = require('../disc-sleeve/zip.js');

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
  // Prozessor: je ein Eintrag für Intel und AMD in den Auswahlfeldern, die alte Grafikkarte passt in kein Feld und bleibt Text (ohne NVIDIA davor)
  assert.deepEqual(min.patch.cpu.items.map((i) => [i.kind, i.pre, i.num]), [['intel', 'Core 2 Duo', 'E6600'], ['amd', 'Phenom', 'X3 8750']]);
  assert.deepEqual(min.patch.gpu.items.map((i) => [i.kind, i.text]), [['text', 'GeForce 8800 GT']]);
  assert.deepEqual(min.shown.find((r) => r[0] === 'Prozessor'), ['Prozessor', 'Intel Core 2 Duo E6600 / AMD Phenom X3 8750', 'Kategorie']);
  assert.deepEqual(min.shown.find((r) => r[0] === 'Grafik').slice(2), ['Text']);
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
  assert.ok(long.patch.other.length <= 240);
});

test('Steam: Prozessor und Grafikkarte werden in Einträge zerlegt (Beispiel Cyberpunk 2077)', () => {
  const details = { pc_requirements: { minimum: '<ul><li><strong>OS *:</strong> 64-bit Windows 10<br></li><li><strong>Processor:</strong> Core i7-6700 or Ryzen 5 1600<br></li><li><strong>Memory:</strong> 12 GB RAM<br></li><li><strong>Graphics:</strong> GeForce GTX 1060 6GB or Radeon RX 580 8GB<br></li><li><strong>Storage:</strong> 70 GB available space<br></li><li><strong>Additional Notes:</strong> SSD required. Attention: In this game you will encounter a variety of visual effects that might trigger photosensitivity<br></li></ul>' } };
  const p = O.steamPatch(details, 'minimum').patch;
  assert.deepEqual(p.cpu.items.map((i) => [i.kind, i.pre, i.num, i.sfx]), [['intel', 'Core i7', '6700', ''], ['amd', 'Ryzen 5', '1600', '']]);
  assert.deepEqual(p.gpu.items.map((i) => [i.kind, i.pre, i.num, i.gb]), [['geforce', 'GTX', '1060', '6'], ['radeon', 'RX', '580', '8']]);
  assert.ok(p.other.length <= 240);
  const state = C.mergeState({ ...C.defaultState(), cpu: { items: [{ kind: 'text', text: 'alter Text' }] } });
  const merged = C.mergeState({ ...state, ...p });                         // ein früherer Eintrag wird ersetzt
  assert.deepEqual(C.cpuList(merged.cpu), ['Intel Core i7-6700', 'AMD Ryzen 5 1600']);
  assert.deepEqual(C.gpuList(merged.gpu), ['GeForce GTX 1060 6 GB', 'Radeon RX 580 8 GB']);
  // "or" und eine dritte Karte (Arc) trennen in einzelne Zeilen, die Arc-Karte bleibt Text
  const arc = O.steamPatch({ pc_requirements: { minimum: '<ul><li><strong>Graphics:</strong> GeForce GTX 1060 6GB or Radeon RX 580 8GB or Arc A380<br></li></ul>' } }, 'minimum');
  assert.deepEqual(C.gpuList(arc.patch.gpu), ['GeForce GTX 1060 6 GB', 'Radeon RX 580 8 GB', 'Arc A380']);
  assert.equal(arc.shown.find((r) => r[0] === 'Grafik')[2], 'Gemischt');
});

test('Der Auszug von Steam passt in den Zustand des Cover-Tools', () => {
  const details = { pc_requirements: { minimum: STEAM_MIN }, platforms: { windows: true }, categories: [{ id: 2 }] };
  const merged = C.mergeState({ ...C.defaultState(), ...O.steamPatch(details, 'minimum').patch, os: { ...C.defaultState().os, ...O.steamPatch(details, 'minimum').patch.os } });
  const rows = C.buildSpecs(merged);
  assert.deepEqual(rows.find((r) => r.key === 'cpu').values, ['Intel Core 2 Duo E6600', 'AMD Phenom X3 8750']);
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

test('Steam: Mindest- und empfohlene Anforderungen auf einmal', () => {
  const details = {
    pc_requirements: {
      minimum: '<ul><li><strong>OS *:</strong> Windows 7<br></li><li><strong>Processor:</strong> Core i5-4460 or AMD FX-6300<br></li><li><strong>Memory:</strong> 4 GB RAM<br></li><li><strong>Graphics:</strong> GeForce GTX 660<br></li><li><strong>DirectX:</strong> Version 11<br></li></ul>',
      recommended: '<ul><li><strong>Processor:</strong> Core i7-6700 or Ryzen 5 1600<br></li><li><strong>Memory:</strong> 8 GB RAM<br></li><li><strong>Graphics:</strong> GeForce GTX 1060<br></li><li><strong>DirectX:</strong> Version 11<br></li></ul>',
    },
    platforms: { windows: true },
  };
  const both = O.steamPatchBoth(details);
  assert.equal(both.hasBoth, true);
  assert.equal(both.patch.rec.on, true);
  assert.deepEqual(both.patch.cpu.items.map((i) => [i.kind, i.pre, i.num]), [['intel', 'Core i5', '4460'], ['amd', 'FX', '6300']]);
  assert.deepEqual(both.patch.rec.cpu.items.map((i) => [i.kind, i.pre, i.num]), [['intel', 'Core i7', '6700'], ['amd', 'Ryzen 5', '1600']]);
  assert.equal(both.patch.rec.ram, '8'); assert.equal(both.patch.ram, '4');
  assert.equal(both.patch.rec.space, '');            // fehlende Angabe ersetzt einen alten Wert
  const cpuRow = both.shown.find((r) => r.label === 'Prozessor');
  assert.equal(cpuRow.min, 'Intel Core i5-4460 / AMD FX 6300'); assert.equal(cpuRow.rec, 'Intel Core i7-6700 / AMD Ryzen 5 1600');
  // Tabelle auf der Rückseite: gleiche Angaben (DirectX) nur einmal, der Rest als Mindest- und empfohlen
  const state = C.mergeState({ ...C.defaultState(), ...both.patch, os: { ...C.defaultState().os, ...both.patch.os } });
  const t = C.buildSpecTable(state);
  assert.equal(t.dual, true);
  assert.deepEqual(t.rows.find((r) => r.key === 'dx'), { key: 'dx', label: 'DirectX', short: 'DirectX', min: ['Version 11'], rec: [], shared: true });
  const cpu = t.rows.find((r) => r.key === 'cpu');
  assert.deepEqual(cpu.min, ['Intel Core i5-4460', 'AMD FX 6300']); assert.deepEqual(cpu.rec, ['Intel Core i7-6700', 'AMD Ryzen 5 1600']);
  // Nur eine Liste von Steam: sie wird zur Mindestanforderung, die empfohlene Spalte bleibt aus
  const one = O.steamPatchBoth({ pc_requirements: { recommended: '<ul><li><strong>Memory:</strong> 8 GB RAM<br></li></ul>' } });
  assert.equal(one.patch.rec.on, false); assert.equal(one.patch.ram, '8'); assert.equal(one.hasBoth, false);
});

test('Systemanforderungen: Alles aus den Feldern steht auch in der Tabelle der Rückseite', () => {
  const s = C.mergeState({ ...C.defaultState(), other: 'SSD required', cpu: { items: [{ kind: 'intel', pre: 'Core i5', num: '4460' }] }, dx: '11' });
  let t = C.buildSpecTable(s);
  assert.equal(t.dual, false);                                      // ohne empfohlene Angaben kein Doppelspalt
  assert.deepEqual(t.rows.map((r) => r.key), ['os', 'cpu', 'ram', 'dx', 'space', 'other']);
  assert.deepEqual(t.rows.find((r) => r.key === 'other').min, ['SSD required']);
  t = C.buildSpecTable({ ...s, rec: { ...s.rec, on: true, other: 'SSD required', ram: '8' } });
  assert.equal(t.dual, true);
  assert.deepEqual(t.rows.find((r) => r.key === 'ram'), { key: 'ram', label: 'Arbeitsspeicher', short: 'RAM', min: ['4 GB RAM'], rec: ['8 GB RAM'], shared: false });
  assert.equal(t.rows.find((r) => r.key === 'other').shared, true);
  assert.equal(C.buildSpecTable({ ...s, lang: 'en' }).labels.rec, 'RECOMMENDED');
  // Sonstiges Satz für Satz: Gleiche Sätze stehen einmal in der Mitte (über beide Spalten), abweichende in ihrer Spalte
  const o = C.buildSpecTable({ ...s, other: 'SSD required. Attention: this game has flashing lights ...', rec: { ...s.rec, on: true, other: 'SSD required.', ram: '8' } }).rows.filter((r) => r.key === 'other');
  assert.deepEqual(o.map((r) => [r.label, r.min, r.rec, r.shared, !!r.cont]), [['Sonstiges', ['SSD required'], [], true, false], ['', ['Attention: this game has flashing lights ...'], [], false, true]]);
  const o2 = C.buildSpecTable({ ...s, other: 'SSD required', rec: { ...s.rec, on: true, other: 'SSD required. 16 GB RAM recommended', ram: '8' } }).rows.filter((r) => r.key === 'other');
  assert.deepEqual(o2.map((r) => [r.min, r.rec, r.shared]), [[['SSD required'], [], true], [[], ['16 GB RAM recommended'], false]]);
  assert.deepEqual(C.buildSpecTable({ ...s, other: 'Eins. Zwei! Drei?' }).rows.find((r) => r.key === 'other').min, ['Eins', 'Zwei!', 'Drei?']);          // ohne Empfohlen: jeder Satz eine Zeile
});

test('Steam: Spielname, Publisher und Entwickler werden übernommen, Wikidata-Logosuche', async () => {
  const b = O.steamPatchBoth({ name: 'Cyberpunk 2077™', publishers: ['CD PROJEKT RED'], developers: ['CD PROJEKT RED'], pc_requirements: { minimum: '<ul><li><strong>Memory:</strong> 12 GB RAM</li></ul>' } });
  assert.equal(b.patch.title, 'Cyberpunk 2077'); assert.equal(b.patch.publisher, 'CD PROJEKT RED'); assert.equal(b.patch.developer, 'CD PROJEKT RED');
  assert.equal(b.shown[0].label, 'Spieletitel (Rücken)');
  assert.equal(O.steamPatchBoth({ pc_requirements: [] }).patch.title, undefined);
  const s = C.mergeState({ ...C.defaultState(), ...b.patch });
  assert.equal(s.title, 'Cyberpunk 2077'); assert.equal(s.publisher, 'CD PROJEKT RED');
  assert.equal(O.commonsUrl('File:Valve logo.svg', 300), 'https://commons.wikimedia.org/wiki/Special:FilePath/Valve%20logo.svg?width=300');
  // nur Treffer mit Logo (P154) erscheinen
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => ({ ok: true, json: async () => /wbsearchentities/.test(url)
    ? { search: [{ id: 'Q1', label: 'Valve', description: 'company' }, { id: 'Q2', label: 'Ventil' }] }
    : { entities: { Q1: { claims: { P154: [{ mainsnak: { datavalue: { value: 'Valve logo.svg' } } }] } }, Q2: { claims: {} } } } });
  // Ältere Logos (mit Enddatum) stehen hinten, bevorzugte vorn
  globalThis.fetch = async (url) => ({ ok: true, json: async () => /wbsearchentities/.test(url)
    ? { search: [{ id: 'Q1', label: 'CDP' }] }
    : { entities: { Q1: { claims: { P154: [
      { rank: 'normal', mainsnak: { datavalue: { value: 'alt.svg' } }, qualifiers: { P582: [{}] } },
      { rank: 'normal', mainsnak: { datavalue: { value: 'neu.svg' } } },
      { rank: 'preferred', mainsnak: { datavalue: { value: 'best.svg' } } },
      { rank: 'deprecated', mainsnak: { datavalue: { value: 'falsch.svg' } } }] } } } } });
  const sorted = await O.logoSearch('CDP');
  assert.deepEqual(sorted[0].logos, ['best.svg', 'neu.svg', 'alt.svg']); assert.deepEqual(sorted[0].old, ['alt.svg']);
  globalThis.fetch = async (url) => ({ ok: true, json: async () => ({ query: { pages: { 1: { imageinfo: [{ thumburl: 'https://upload.wikimedia.org/x/800px-a.svg.png', url: 'https://upload.wikimedia.org/x/a.svg' }] } } } }) });
  assert.equal(await O.commonsImageUrl('File:a.svg', 800), 'https://upload.wikimedia.org/x/800px-a.svg.png');
  globalThis.fetch = async (url) => ({ ok: true, json: async () => /wbsearchentities/.test(url)
    ? { search: [{ id: 'Q1', label: 'Valve', description: 'company' }, { id: 'Q2', label: 'Ventil' }] }
    : { entities: { Q1: { claims: { P154: [{ mainsnak: { datavalue: { value: 'Valve logo.svg' } } }] } }, Q2: { claims: {} } } } });
  try { assert.deepEqual(await O.logoSearch('Valve'), [{ id: 'Q1', label: 'Valve', description: 'company', logos: ['Valve logo.svg'], old: [] }]); }
  finally { globalThis.fetch = real; }
});

test('Steam: neue Funktionen (Online, LAN, Cross-Plattform, Mods, VR)', () => {
  assert.deepEqual(O.steamFeatures([{ id: 2 }, { id: 36 }, { id: 48 }, { id: 27 }, { id: 30 }, { id: 53 }, { id: 22 }]),
    ['single_player', 'co_op', 'multi_player', 'online', 'lan', 'cross_platform', 'achievements', 'mods', 'vr']);
  assert.deepEqual(O.steamFeatures([{ id: 25 }]), []);      // Bestenlisten gibt es nicht mehr
});

test('Steam: Altersfreigabe wird als USK übernommen', () => {
  assert.deepEqual(O.steamUsk({ ratings: { usk: { rating: '16' }, pegi: { rating: '18' } } }), { value: '16', source: 'USK laut Steam' });       // USK hat Vorrang
  assert.equal(O.steamUsk({ ratings: { pegi: { rating: '3' } } }).value, '0');
  assert.equal(O.steamUsk({ ratings: { pegi: { rating: '7' } } }).value, '6');
  assert.equal(O.steamUsk({ ratings: { esrb: { rating: 'm' } } }).value, '16');
  assert.equal(O.steamUsk({ required_age: '13' }).value, '12');
  assert.equal(O.steamUsk({ required_age: 18 }).value, '18');
  assert.equal(O.steamUsk({ required_age: 0, ratings: [] }), null);                    // nichts Brauchbares: USK bleibt unverändert
  const b = O.steamPatchBoth({ name: 'X', ratings: { usk: { rating: '12' } }, pc_requirements: [] });
  assert.equal(b.patch.usk, '12'); assert.match(b.shown.find((r) => r.label === 'USK-Freigabe').min, /ab 12 Jahren \(USK laut Steam\)/);
  assert.equal(O.steamPatchBoth({ name: 'X', pc_requirements: [] }).patch.usk, undefined);
  assert.ok(C.USK_VALUES.includes(b.patch.usk));
});

test('Brandfetch: Suche nach Firmenlogos mit Client-ID', async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const real = globalThis.fetch; let asked = '';
  try {
    await assert.rejects(O.brandSearch('Team Cherry'), /Client-ID/);                      // ohne ID kein Versuch
    O.settings.saveBrandfetch('  ID123 ');
    assert.equal(O.settings.brandfetch, 'ID123');
    globalThis.fetch = async (url) => { asked = url; return { ok: true, status: 200, json: async () => [
      { brandId: 'b1', name: 'Team Cherry', domain: 'teamcherry.com.au', icon: 'https://asset.example/icon.png', claimed: false },
      { brandId: 'b2', name: 'Ohne Icon', domain: 'x.example' }, { name: '' }, { brandId: 'b3', name: 'Ohne Domain und Bild' }] }; };
    const res = await O.brandSearch('Team Cherry');
    assert.equal(asked, 'https://api.brandfetch.io/v2/search/Team%20Cherry?c=ID123');
    assert.deepEqual(res.map((r) => [r.label, r.url]), [['Team Cherry', 'https://asset.example/icon.png'], ['Ohne Icon', 'https://cdn.brandfetch.io/x.example/w/400/h/400?c=ID123']]);
    globalThis.fetch = async () => ({ ok: false, status: 401 });
    await assert.rejects(O.brandSearch('x'), /abgelehnt/);
    globalThis.fetch = async () => ({ ok: false, status: 429 });
    await assert.rejects(O.brandSearch('x'), /zu viele/);
  } finally { globalThis.fetch = real; delete globalThis.localStorage; }
});

test('Einstellungsdatei: Brandfetch-ID ist optional und stört den Konfigurator nicht', async () => {
  const F = require('../disc-sleeve/files.js');
  const plain = JSON.parse(await F.packSettings({ key: 'k', proxy: 'https://p/?url={url}' }, ''));
  assert.equal('brandfetchId' in plain, false);                       // ohne ID bleibt die Datei wie beim Konfigurator
  const text = await F.packSettings({ key: 'k', proxy: '', brandfetch: 'ID1' }, '');
  assert.deepEqual(await F.unpackSettings(text, ''), { key: 'k', proxy: '', brandfetch: 'ID1' });
  const enc = await F.packSettings({ key: '', proxy: '', brandfetch: 'ID2' }, 'pw');
  assert.equal((await F.unpackSettings(enc, 'pw')).brandfetch, 'ID2');
});

/* ---------- GOG: Suche, Daten und Bilder (Antwort-Beispiel: The Witcher: Enhanced Edition, von api.gog.com/v2/games/1207658924) ---------- */
test('GOG: Katalogsuche, Produkt-ID und Adresse', async () => {
  const real = globalThis.fetch;
  try {
    let asked;
    globalThis.fetch = async (u) => { asked = String(u); return { ok: true, status: 200, json: async () => ({ products: [{ id: '5', title: 'Reigns: The Witcher' }, { id: '1495134320', title: 'The Witcher 3: Wild Hunt — Remastered', releaseDate: '2015.05.18', coverVertical: 'https://images.gog-statics.com/x.jpg' }, { id: '1' }, { id: '6', title: 'The Witcher Adventure Game' }] }), text: async () => '' }; };
    O.settings.save('', '');
    const res = await O.gogSearch('The Witcher 3');
    assert.equal(res[0].name, 'The Witcher 3: Wild Hunt — Remastered', 'der beste Treffer steht vorn (enthält alle Wörter), Einträge ohne Titel entfallen');
    assert.deepEqual({ ...res[0] }, { id: '1495134320', name: 'The Witcher 3: Wild Hunt — Remastered', year: '2015', cover: 'https://images.gog-statics.com/x.jpg' });
    assert.equal(res.length, 3);
    assert.match(asked, /^https:\/\/catalog\.gog\.com\/v1\/catalog\?.*productType=in%3Agame%2Cpack.*query=like%3Awitcher$/, 'es wird nach dem längsten Wort gesucht, auch Ausgaben ("pack") sind dabei');
    const exact = await O.gogSearch('witcher adventure game');
    assert.equal(exact[0].name, 'The Witcher Adventure Game');
  } finally { globalThis.fetch = real; }
  assert.equal(O.parseGogRef('1207658924'), '1207658924');
  assert.equal(O.parseGogRef('https://www.gogdb.org/product/1207658924'), '1207658924');
  assert.equal(O.parseGogRef('witcher'), null); assert.equal(O.parseGogRef('123'), null);
});

test('GOG: Spiel-Daten werden wie die von Steam ausgewertet (Anforderungen, Funktionen, USK, Publisher, Bilder)', () => {
  const v2 = require('./fixtures/gog-witcher-v2.json');
  const d = O.gogDetails(v2);
  assert.equal(d.name, 'The Witcher: Enhanced Edition');
  assert.deepEqual(d.publishers, ['CD PROJEKT RED']); assert.deepEqual(d.platforms, { windows: true, mac: true, linux: false });
  const r = O.steamPatchBoth(d);
  assert.equal(r.patch.title, 'The Witcher: Enhanced Edition'); assert.equal(r.patch.publisher, 'CD PROJEKT RED');
  assert.equal(r.patch.usk, '18'); assert.match(r.shown.find((x) => x.label === 'USK-Freigabe').min, /ab 18 Jahren \(USK laut GOG\)/);
  assert.deepEqual(r.patch.features, ['single_player', 'cloud_saves']);
  assert.equal(r.hasRequirements, true); assert.equal(r.patch.ram, '1.5'); assert.equal(r.patch.space, '15'); assert.equal(r.patch.dx, 'DirectX 9.0c');
  assert.ok(r.patch.os.mac === true);
  assert.ok(r.patch.cpu.items.some((i) => /Pentium 4|Athlon/.test(i.text || i.pre || '')) || r.patch.cpu.items.length > 0, 'Prozessor wird übernommen');
  const img = O.gogImages(v2);
  assert.match(img.cover, /^https:\/\/images\.gog-statics\.com\/[0-9a-f]{64}\.jpg$/); assert.match(img.logo, /\.png$/); assert.match(img.background, /\.jpg$/);
  assert.notEqual(img.background, img.cover);
  // Ohne Windows-Anforderungen oder Bewertung bleibt alles leer, ohne Fehler
  const bare = O.gogDetails({ _embedded: { product: { id: 1, title: 'X' } }, _links: {} });
  assert.equal(O.steamPatchBoth(bare).hasRequirements, false); assert.deepEqual(O.gogImages({}), { cover: '', logo: '', background: '' });
});
