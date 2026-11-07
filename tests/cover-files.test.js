const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore } = require('./helpers');
const F = require('../disc-sleeve/files.js');
const Z = require('../disc-sleeve/zip.js');
const C = require('../disc-sleeve/core.js');
const O = require('../disc-sleeve/online.js');

test('Einstellungsdatei: ohne und mit Passwort, falsches Passwort, fremde Datei', async () => {
  const vals = { key: 'abc-123', proxy: 'https://p.example/?url={url}' };
  const plain = await F.packSettings(vals, '');
  assert.match(plain, /"sgdbKey": "abc-123"/);
  assert.deepEqual(await F.unpackSettings(plain, ''), vals);
  const enc = await F.packSettings(vals, 'geheim');
  assert.ok(!enc.includes('abc-123') && !enc.includes('p.example'), 'verschlüsselt: keine Klartextwerte');
  assert.deepEqual(await F.unpackSettings(enc, 'geheim'), vals);
  await assert.rejects(F.unpackSettings(enc, ''), /PASSWORD_NEEDED/);
  await assert.rejects(F.unpackSettings(enc, 'falsch'), /Falsches Passwort/);
  await assert.rejects(F.unpackSettings('{"type":"etwas-anderes"}', ''), /keine Einstellungsdatei/);
  await assert.rejects(F.unpackSettings('kein json', ''), /keine gültige Einstellungsdatei/);
  const tampered = JSON.parse(enc); tampered.iterations = 5;
  await assert.rejects(F.unpackSettings(JSON.stringify(tampered), 'geheim'), /beschädigt/);
  assert.deepEqual(await F.unpackSettings('{"type":"discmenu-settings","version":1}', ''), { key: '', proxy: '' });
});

test('Einstellungsdatei: Konfigurator und Cover-Tool lesen die Dateien des jeweils anderen', async () => {
  const K = loadCore();                                   // Kern des Konfigurators
  const vals = { key: 'KEY', proxy: 'https://p.example/?url={url}' };
  for (const pw of ['', 'pw']) {
    assert.deepEqual(await F.unpackSettings(await K.packSettings(vals, pw), pw), vals, 'Konfigurator -> Cover-Tool, Passwort "' + pw + '"');
    assert.deepEqual(await K.unpackSettings(await F.packSettings(vals, pw), pw), vals, 'Cover-Tool -> Konfigurator, Passwort "' + pw + '"');
  }
});

test('ZIP schreiben: CRC32 und Aufbau werden vom ZIP-Leser gelesen', async () => {
  assert.equal(F.crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
  const zip = F.buildZip([{ name: 'a.txt', data: new TextEncoder().encode('Hallo') }, { name: 'ordner/Größe ä.bin', data: new Uint8Array([0, 255, 7]) }, { name: 'leer', data: new Uint8Array(0) }]);
  const back = await Z.read(zip);
  assert.deepEqual(back.map((f) => f.name), ['a.txt', 'ordner/Größe ä.bin', 'leer']);
  assert.equal(new TextDecoder().decode(back[0].data), 'Hallo');
  assert.deepEqual([...back[1].data], [0, 255, 7]);
  assert.equal(back[2].data.length, 0);
});

test('Projektdatei: Einstellungen und Bilder überstehen Export und Import', async () => {
  const state = C.mergeState({ title: 'Größe & Co', provider: 'epic', theme: 'bar', caseType: 'custom', custom: { back: '127.5', spine: '14', front: '127.5', h: '148' }, features: ['co_op'], cpu: { custom: 'Pentium III' } });
  const jpg = new Uint8Array(5000).map((_, i) => (i * 7) % 256), png = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
  const zip = F.packProject(state, { front: { data: jpg, type: 'image/jpeg', name: 'Vorne ä.jpg' }, publisher: { data: png, type: 'image/png', name: 'logo.png' } });
  const out = F.unpackProject(await Z.read(zip));
  assert.deepEqual(C.mergeState(out.state), state);
  assert.deepEqual(Object.keys(out.images).sort(), ['front', 'publisher']);
  assert.deepEqual([...out.images.front.data], [...jpg]);
  assert.equal(out.images.front.type, 'image/jpeg'); assert.equal(out.images.front.name, 'Vorne ä.jpg');
  assert.equal(out.images.publisher.type, 'image/png');
  assert.deepEqual(out.missing, []);
  // ganz ohne Bilder
  assert.deepEqual(Object.keys(F.unpackProject(await Z.read(F.packProject(state, {}))).images), []);
});

test('Projektdatei: falsche und beschädigte Dateien werden verständlich abgelehnt', async () => {
  const text = (o) => new TextEncoder().encode(typeof o === 'string' ? o : JSON.stringify(o));
  const files = (list) => list.map(([name, data]) => ({ name, data }));
  assert.throws(() => F.unpackProject(files([['menu.json', text({})]])), /fehlt die cover\.json/);
  assert.throws(() => F.unpackProject(files([['cover.json', text('{kaputt')]])), /beschädigt/);
  assert.throws(() => F.unpackProject(files([['cover.json', text({ type: 'rezept' })]])), /keine Projektdatei/);
  assert.throws(() => F.unpackProject(files([['cover.json', text({ type: F.PROJECT_TYPE, version: 9, state: {} })]])), /neueren Version/);
  const out = F.unpackProject(files([['cover.json', text({ type: F.PROJECT_TYPE, version: 1, state: {}, images: { front: { file: 'images/front.jpg' }, publisher: { file: 'images/publisher.png' } } })], ['images/publisher.png', new Uint8Array([1])]]));
  assert.deepEqual(out.missing, ['front']);                // fehlende Bilddatei: gemeldet, Rest wird geladen
  assert.deepEqual(Object.keys(out.images), ['publisher']);
  assert.deepEqual(C.mergeState(out.state), C.defaultState());     // leerer Zustand ergibt die Standardwerte
  assert.deepEqual(C.mergeState({ caseType: 'custom', custom: 5 }).custom, C.defaultState().custom);
});

test('Steam: Adresse oder App-ID erkennen, lange Angaben kürzen', () => {
  assert.equal(O.parseSteamRef('https://store.steampowered.com/app/620/Portal_2/'), '620');
  assert.equal(O.parseSteamRef(' store.steampowered.com/app/70 '), '70');
  assert.equal(O.parseSteamRef('https://steamdb.info/app/220/'), '220');
  assert.equal(O.parseSteamRef('620'), '620');
  assert.equal(O.parseSteamRef('Portal 2'), null);
  assert.equal(O.parseSteamRef('7'), null);                 // eine einzelne Ziffer ist eher Teil eines Titels
  const long = 'Video card must be 128 MB or more and should be a DirectX 9-compatible with support for Pixel Shader 2.0b (ATI Radeon X800 or higher / NVIDIA GeForce 7600 or higher / Intel HD Graphics 2000 or higher).';
  const short = O.shorten(long, 80);
  assert.ok(short.length <= 80 && short.endsWith('...'), short);
  assert.equal(O.shorten('Intel Core 2 Duo E6600'), 'Intel Core 2 Duo E6600');
  assert.equal(O.shorten('  viel   Platz  '), 'viel Platz');
  const p = O.steamPatch({ pc_requirements: { minimum: '<ul><li><strong>Graphics:</strong> ' + long + '<br></li><li><strong>DirectX:</strong> Version 9.0c<br></li></ul>' } }, 'minimum').patch;
  assert.ok(p.gpu.items.every((i) => (i.text || '').length <= 110));
});

test('Steam: Fehler des Proxys werden in verständliche Meldungen übersetzt', async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  O.settings.save('', 'https://proxy.example/?url={url}');
  const reply = (status, body) => async () => ({ ok: status < 400, status, text: async () => body, json: async () => JSON.parse(body) });
  const run = async (impl, fn) => { const old = globalThis.fetch; globalThis.fetch = impl; try { return await fn(); } finally { globalThis.fetch = old; } };
  await run(reply(403, 'Diese Herkunft ist nicht erlaubt.'), () => assert.rejects(O.steamSearch('x'), /ALLOWED_ORIGIN/));
  await run(reply(403, 'Dieser Host ist nicht erlaubt.'), () => assert.rejects(O.steamSearch('x'), /Worker-Code ist wahrscheinlich veraltet/));
  await run(reply(429, ''), () => assert.rejects(O.steamDetails('1'), /zu viele Anfragen/));
  await run(reply(500, 'kaputt'), () => assert.rejects(O.steamDetails('1'), /Fehler 500/));
  await run(reply(200, '<html>keine JSON-Antwort</html>'), () => assert.rejects(O.steamSearch('x'), /unerwartete Antwort/));
  await run(reply(200, '{"620":{"success":false}}'), () => assert.rejects(O.steamDetails('620'), /keine Daten/));
  // Verbindungstest: jeder Dienst einzeln
  const gogFix = require('./fixtures/gog-witcher-v2.json');
  const info = { version: O.WORKER_VERSION, hosts: O.REQUIRED_HOSTS.map((h) => '^' + h.replace(/\./g, '\\.') + '$') };
  const ok = (url) => { if (/info=1/.test(url)) return info; if (!/proxy\.example/.test(url)) return {}; const t = new URL(url).searchParams.get('url'); return /storesearch/.test(t) ? { items: [{ id: 70, name: 'Half-Life' }] } : /api\.gog\.com\/v2/.test(t) ? gogFix : { success: true, data: [{ id: 1 }] }; };
  O.settings.save('KEY', 'https://proxy.example/?url={url}');
  const good = await run(async (u) => { const b = ok(u); return { ok: true, status: 200, json: async () => b, text: async () => '', blob: async () => ({ size: 1 }) }; }, () => O.testConnection());
  assert.deepEqual(good.map((r) => [r.name, r.ok]), [['Proxy-Worker', true], ['Steam-Shop', true], ['SteamGridDB', true], ['GOG-Katalog', true], ['GOG-Spieldaten', true], ['GOG-Bilder', true], ['Wikidata (Publisher-Logos)', true], ['Brandfetch', true]]);
  assert.match(good[0].text, /Version \d+ \(aktuell\)/); assert.ok(!good[0].warn); assert.match(good[4].text, /The Witcher/); assert.match(good[7].text, /optional/);
  // Proxy-Worker: veraltet, ohne Versionsangabe, Host fehlt, neuer als das Tool
  const worker = (body, status = 200) => run(async (u) => (/[?&]info=1/.test(u) ? { ok: status === 200, status, json: async () => { if (body === 'kein JSON') throw new Error('x'); return body; }, text: async () => '' } : { ok: true, status: 200, json: async () => ok(u), text: async () => '' }), () => O.checkWorker().then((t) => ({ ok: true, ...t }), (e) => ({ ok: false, text: e.message })));
  assert.deepEqual(await worker({ version: O.WORKER_VERSION - 1, hosts: info.hosts }), { ok: false, text: 'Proxy-Worker Version ' + (O.WORKER_VERSION - 1) + ', aktuell ist ' + O.WORKER_VERSION + '. Bitte den aktuellen Worker-Code einspielen.' });
  assert.match((await worker('kein JSON', 400)).text, /Alte Version des Proxy-Workers \(ohne Versionsangabe\)/);
  const miss = await worker({ version: O.WORKER_VERSION, hosts: info.hosts.filter((h) => !/gog/.test(h)) }); assert.equal(miss.ok, false); assert.match(miss.text, /Er erlaubt nicht: catalog\.gog\.com, api\.gog\.com/);
  assert.deepEqual(await worker({ version: O.WORKER_VERSION + 1, hosts: info.hosts }), { ok: true, warn: true, text: 'Version ' + (O.WORKER_VERSION + 1) + ' (neuer als dieses Tool)' });                                   // ohne Client-ID: kein Fehler
  O.settings.saveBrandfetch('ID1');
  const bfOk = await run(async (u) => ({ ok: true, status: 200, json: async () => (/brandfetch/.test(u) ? [{ brandId: 'b', name: 'Valve', domain: 'valve.com' }] : { search: [] }), text: async () => '' }), () => O.testConnection());
  assert.deepEqual(bfOk.slice(-2).map((r) => [r.name, r.ok]), [['Wikidata (Publisher-Logos)', true], ['Brandfetch', true]]); assert.match(bfOk[bfOk.length - 1].text, /1 Treffer/);
  const bfBad = await run(async (u) => ({ ok: false, status: /brandfetch/.test(u) ? 403 : 200, json: async () => ({ search: [] }), text: async () => '' }), () => O.testConnection());
  assert.equal(bfBad[bfBad.length - 1].ok, false); assert.match(bfBad[bfBad.length - 1].text, /abgelehnt/);
  O.settings.saveBrandfetch('');
  O.settings.save('', '');
  const none = await run(async () => { throw new TypeError('x'); }, () => O.testConnection());
  assert.deepEqual(none.map((r) => [r.name, r.ok]), [['Proxy', false], ['Steam-Shop', false], ['SteamGridDB', false], ['GOG-Katalog', false], ['GOG-Spieldaten', false], ['GOG-Bilder', false], ['Wikidata (Publisher-Logos)', false], ['Brandfetch', true]]);
  assert.match(none[0].text, /Kein Proxy/); assert.match(none[2].text, /Kein API-Schlüssel/);
});
