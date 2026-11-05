const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore } = require('./helpers');
const C = loadCore();

function sampleState() {
  const s = C.newState();
  s.title = 'Test Collection';
  s.output = 'Setup.exe';
  const g = s.games[0];
  g.name = 'Spiel Eins'; g.installer = 'Spiel1\\setup.exe'; g.args = '/SILENT "/DIR=C:\\Spiele x"'; g.estimatedSizeMB = '1500';
  const p = C.newItem(); p.name = 'Sprachpatch'; p.group = 'Sprache'; p.path = 'Spiel1/Patches/de.exe'; g.patches.push(p);
  const e = C.newItem(); e.name = 'Handbuch'; e.kind = 'open'; e.path = 'Spiel1/Extras/handbuch.pdf'; g.extras.push(e);
  const l = C.newItem(); l.name = 'Webseite'; l.kind = 'open'; l.path = 'https://example.com'; g.extras.push(l);
  return s;
}

test('slug: Umlaute und Sonderzeichen', () => {
  assert.equal(C.slug('Größe & Ärger!'), 'groesse-aerger');
  assert.equal(C.slug(null), '');
  assert.equal(C.slug('a'.repeat(100)).length, 60);
});

test('parseArgs / fromArgs: Anführungszeichen bleiben zusammen', () => {
  assert.deepEqual(C.parseArgs('/A "/DIR=C:\\x y" /B'), ['/A', '"/DIR=C:\\x y"', '/B']);
  assert.deepEqual(C.parseArgs(''), []);
  assert.equal(C.fromArgs(['/A', '/B']), '/A /B');
  assert.equal(C.fromArgs(undefined), '');
});

test('crc32 und ZIP: schreiben, lesen, Reihenfolge und Inhalt', async () => {
  const enc = new TextEncoder();
  assert.equal(C.crc32 ? C.crc32(enc.encode('123456789')) : 0xCBF43926, 0xCBF43926);
  const zip = C.buildZip([{ name: 'menu.json', data: enc.encode('{"a":1}') }, { name: 'assets/x.bin', data: new Uint8Array([0, 1, 2, 255]) }]);
  const files = await C.readZip(zip);
  assert.deepEqual(files.map(f => f.name), ['menu.json', 'assets/x.bin']);
  assert.equal(new TextDecoder().decode(files[0].data), '{"a":1}');
  assert.deepEqual([...files[1].data], [0, 1, 2, 255]);
});

test('validate: leerer Entwurf liefert Fehler, gültiger nicht', () => {
  assert.ok(C.validate(C.newState()).some(i => i.level === 'error'));
  assert.deepEqual(C.validate(sampleState()).filter(i => i.level === 'error'), []);
});

test('validate: absolute Pfade, "..", Größe, EXE-Name', () => {
  const s = sampleState();
  s.games[0].installer = 'C:\\setup.exe';
  s.games[0].patches[0].path = '../x.exe';
  s.games[0].estimatedSizeMB = '-3';
  s.output = 'a/b.exe';
  const msgs = C.validate(s).map(i => i.msg).join('\n');
  assert.match(msgs, /Installer-Pfad muss relativ/);
  assert.match(msgs, /"\.\."/);
  assert.match(msgs, /Größe/);
  assert.match(msgs, /EXE-Name enthält ungültige/);
});

test('buildMenu: Pfade normalisiert, Reihenfolge als index, Assets ohne Kollision', () => {
  const s = sampleState();
  const assets = new Map([['a1', { data: new Uint8Array([1]), ext: 'png' }], ['a2', { data: new Uint8Array([2]), ext: 'png' }]]);
  s.games[0].cover = 'a1'; s.games[0].patches[0].cover = 'a2'; s.background = 'a1';
  const { menu, files } = C.buildMenu(s, assets);
  assert.equal(menu.schemaVersion, 1);
  assert.equal(menu.games[0].index, 0);
  assert.equal(menu.games[0].installer, 'Spiel1/setup.exe');
  assert.deepEqual(menu.games[0].args, ['/SILENT', '"/DIR=C:\\Spiele x"']);
  assert.equal(menu.games[0].estimatedSizeMB, 1500);
  assert.equal(menu.games[0].extras[1].open, 'https://example.com');
  assert.equal(menu.games[0].patches[0].installer, 'Spiel1/Patches/de.exe');
  const names = files.map(f => f.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every(n => n.startsWith('assets/')));
  assert.equal(menu.background, 'assets/background.png');
});

test('Export -> Import ergibt denselben Zustand (Rundreise)', () => {
  const s = sampleState();
  const assets = new Map([['a1', { data: new Uint8Array([9, 9]), ext: 'png' }]]);
  s.games[0].cover = 'a1';
  const { menu, files } = C.buildMenu(s, assets);
  const byPath = new Map(files.map(f => [f.name, f.data]));
  const imp = new Map(); let n = 0;
  const r = C.parseMenu(JSON.parse(JSON.stringify(menu)), p => { if (!byPath.has(p)) return null; const id = 'b' + (n++); imp.set(id, { data: byPath.get(p), ext: p.split('.').pop() }); return id; });
  assert.deepEqual(r.notes, []);
  const again = C.buildMenu(r.state, imp).menu;
  assert.deepEqual(again, menu);
});

test('parseMenu: sortiert nach index, meldet fehlende Dateien und unbekannte Felder', () => {
  const m = { schemaVersion: 2, title: 'T', background: 'assets/fehlt.png', games: [
    { index: 1, name: 'B', installer: 'b.exe', provider: 'steam' },
    { index: 0, name: 'A', installer: 'a.exe', customTabs: [{}] } ] };
  const r = C.parseMenu(m, () => null);
  assert.deepEqual(r.state.games.map(g => g.name), ['A', 'B']);
  const notes = r.notes.join('\n');
  assert.match(notes, /schemaVersion 2/);
  assert.match(notes, /Datei nicht gefunden/);
  assert.match(notes, /customTabs/);
  assert.match(notes, /provider "steam"/);
  assert.throws(() => C.parseMenu([], () => null), /kein gültiges Objekt/);
});

test('sane / usedIds', () => {
  assert.ok(C.sane(C.newState()));
  assert.ok(!C.sane({ title: 1 }));
  const s = sampleState(); s.background = 'x'; s.games[0].patches[0].cover = 'y';
  assert.deepEqual([...C.usedIds(s)].sort(), ['x', 'y']);
});

test('Hilfen für Beschreibungen: HTML, Sprache, Teilen, Namen', () => {
  assert.equal(C.htmlToText('<p>Hallo &amp; <b>Welt</b></p>').trim(), 'Hallo & Welt');
  assert.ok(C.looksGerman('Das ist ein Spiel, das nicht für Kinder ist und mit einer langen Geschichte kommt.'));
  assert.ok(!C.looksGerman('This is a game that is not for children and comes with a long story to tell.'));
  const paras = C.chunkText('Satz eins. Satz zwei. Satz drei. '.repeat(30) + '\nZweiter Absatz.', 100);
  assert.equal(paras.length, 2);
  assert.ok(paras[0].length > 1 && paras[0].every(p => p.length <= 100));
  assert.equal(C.normName('Half-Life 2!'), 'halflife2');
});

test('Einstellungen sichern: mit und ohne Passwort, falsches Passwort', async () => {
  const v = { key: 'abc', proxy: 'https://p.example' };
  const plain = await C.packSettings(v, '');
  assert.deepEqual(await C.unpackSettings(plain, ''), v);
  const enc = await C.packSettings(v, 'geheim');
  assert.ok(!enc.includes('abc'));
  assert.deepEqual(await C.unpackSettings(enc, 'geheim'), v);
  await assert.rejects(C.unpackSettings(enc, 'falsch'), /Falsches Passwort/);
});

test('Disc-Prüfung: gefunden, fehlt, Ordner statt Datei, Links ausgenommen', async () => {
  const s = sampleState();
  s.games[0].patches[0].path = 'Spiel1\\Patches\\de.exe';
  const present = new Map([['Spiel1/setup.exe', 'file'], ['Spiel1/Patches/de.exe', 'dir'], ['Spiel1/Extras/handbuch.pdf', 'file']]);
  const r = await C.checkDisc(s, async p => present.get(p) || null);
  assert.equal(r.checked, 3);                       // Link wird nicht geprüft
  assert.equal(r.ok, 2);
  assert.equal(r.issues.length, 1);
  assert.match(r.issues[0].msg, /Ordner, es wird eine Datei erwartet/);
  const r2 = await C.checkDisc(s, async () => null);
  assert.equal(r2.issues.length, 3);
  assert.ok(r2.issues.every(i => /nicht gefunden/.test(i.msg)));
  const r3 = await C.checkDisc(s, async () => { throw new Error('x'); });
  assert.equal(r3.issues.length, 3);
});

test('Disc-Prüfung: ungewöhnliche Endung ist nur ein Hinweis', async () => {
  const s = sampleState(); s.games[0].installer = 'Spiel1/setup.bin';
  const r = await C.checkDisc(s, async () => 'file');
  assert.deepEqual(r.issues.map(i => i.level), ['warn']);
});
