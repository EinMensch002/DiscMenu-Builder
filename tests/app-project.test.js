// Gemeinsame Projektdatei (app/project.js): Menü und Hülle in einer ZIP, verknüpfte Felder, ältere Dateien.
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../app/project.js');
const M = require('../app/menu-core.js');
const F = require('../app/files.js');
const C = require('../app/core.js');
const { loadSchemaValidator } = require('./helpers');

const bytes = (n, v) => new Uint8Array(n).fill(v);
const readZip = (u8) => M.readZip(u8);
const LATO = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'app', 'assets', 'fonts', 'Lato-Bold.ttf'));

function sample() {
  const st = M.newState(); st.title = 'Meine Disc';
  Object.assign(st.games[0], { name: 'Half-Life', provider: 'steam', description: 'Ein Klassiker.', installer: 'HL/setup.exe', estimatedSizeMB: '2048', cover: 'a1' });
  st.background = 'a2';
  const assets = new Map([['a1', { data: bytes(40, 1), ext: 'png' }], ['a2', { data: bytes(50, 2), ext: 'jpg' }]]);
  const cover = C.defaultState(); cover.title = 'Half-Life'; cover.provider = 'steam'; cover.back.description = 'Ein Klassiker.'; cover.space = '2'; cover.usk = '16';
  cover.back.items = [{ type: 'text', text: 'Hallo', font: 'uf-abc', x: 1, y: 1, w: 20, h: 5 }];
  const images = { front: { data: bytes(60, 3), type: 'image/jpeg', name: 'front.jpg' }, spineLogo: { data: bytes(30, 4), type: 'image/png', name: 'logo.png' } };
  const fonts = [{ id: 'uf-abc', name: 'Meine Schrift', ext: 'ttf', data: F.toBase64(new Uint8Array(LATO)) }];
  return { menuState: st, menuAssets: assets, coverState: cover, coverImages: images, fonts, link: { game: 0 } };
}

test('Projektdatei: menu.json, Assets des Menüs, cover.json, Bilder der Hülle unter assets/, Schriften unter fonts/', async () => {
  const files = await readZip(P.pack(sample()));
  const names = files.map((f) => f.name).sort();
  assert.ok(names.includes('menu.json') && names.includes('cover.json'));
  assert.ok(names.some((n) => /^assets\/huelle-front\.jpg$/.test(n)), names.join());
  assert.ok(names.some((n) => /^assets\/huelle-spineLogo\.png$/.test(n)));
  assert.ok(names.some((n) => /^fonts\/uf-abc\.ttf$/.test(n)));
  assert.ok(!names.some((n) => n.startsWith('images/')), 'kein eigener Bilderordner mehr');
  assert.equal(new Set(names).size, names.length, 'jede Datei nur einmal');
  const cj = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'cover.json').data));
  assert.equal(cj.version, 2); assert.deepEqual(cj.link, { game: 0 });
  assert.equal(cj.state.title, undefined, 'Titel steht nur im Menü'); assert.equal(cj.state.provider, undefined); assert.equal(cj.state.back.description, undefined);
  assert.equal(cj.state.usk, '16');
  const menu = JSON.parse(new TextDecoder().decode(files.find((f) => f.name === 'menu.json').data));
  assert.ok(loadSchemaValidator()(menu), 'menu.json der Projektdatei erfüllt das Schema (der Builder kann sie lesen)');
});

test('Projektdatei lesen: alles kommt zurück, verknüpfte Felder aus dem Menü', async () => {
  const r = P.read(await readZip(P.pack(sample())));
  assert.equal(r.kind, 'project');
  const g = r.menu.state.games[0];
  assert.equal(g.name, 'Half-Life'); assert.equal(r.menu.assets.size, 2);
  assert.equal(r.cover.state.title, 'Half-Life'); assert.equal(r.cover.state.provider, 'steam'); assert.equal(r.cover.state.back.description, 'Ein Klassiker.');
  assert.equal(r.cover.state.space, '2'); assert.equal(r.cover.state.usk, '16');
  assert.deepEqual(Object.keys(r.cover.images).sort(), ['front', 'spineLogo']);
  assert.equal(r.cover.fonts.length, 1);
});

test('Ältere Dateien: Rezept-ZIP, einzelne menu.json, Cover-ZIP', async () => {
  const s = sample();
  const { menu, files } = M.buildMenu(s.menuState, s.menuAssets);
  const recipe = M.buildZip([{ name: 'menu.json', data: new TextEncoder().encode(JSON.stringify(menu)) }, ...files]);
  let r = P.read(await readZip(recipe));
  assert.equal(r.kind, 'recipe'); assert.equal(r.cover, null); assert.equal(r.menu.state.games[0].name, 'Half-Life'); assert.equal(r.menu.assets.size, 2);
  r = P.readMenuJson(JSON.stringify(menu));
  assert.equal(r.kind, 'recipe'); assert.equal(r.menu.state.games[0].name, 'Half-Life');
  const old = F.packProject(s.coverState, s.coverImages, s.fonts);       // Version 1, Bilder unter images/
  r = P.read(await readZip(old));
  assert.equal(r.kind, 'cover');
  assert.equal(r.menu.state.games[0].name, 'Half-Life', 'aus dem Titel der Hülle wird das Spiel');
  assert.equal(r.menu.state.games[0].provider, 'steam'); assert.equal(r.menu.state.games[0].estimatedSizeMB, '2048');
  assert.deepEqual(Object.keys(r.cover.images).sort(), ['front', 'spineLogo']);
  await assert.rejects(async () => P.read(await readZip(M.buildZip([{ name: 'x.txt', data: bytes(3, 1) }]))), /keine Projektdatei/);
});

test('Verknüpfte Felder: Unterschiede in beide Richtungen', () => {
  const s = sample();
  assert.deepEqual(P.coverDiff(s.menuState, s.coverState, s.link), {}, 'schon gleich');
  s.menuState.games[0].name = 'Half-Life 2';
  assert.deepEqual(P.coverDiff(s.menuState, s.coverState, s.link), { title: 'Half-Life 2' });
  s.coverState.provider = 'gog'; s.coverState.title = 'Half-Life 2';
  assert.deepEqual(P.menuDiff(s.menuState, s.coverState, s.link), { provider: 'gog' });
  s.coverState.space = '3';
  assert.deepEqual(P.menuDiff(s.menuState, s.coverState, s.link), { provider: 'gog', estimatedSizeMB: '3072' });
  s.menuState.games[0].estimatedSizeMB = '';
  assert.equal(P.coverDiff(s.menuState, s.coverState, s.link).space, undefined, 'leere Größe überschreibt den Speicherplatz nicht');
  assert.deepEqual(P.normLink({ game: 'x' }), { game: 0 });
});
