// Gemeinsame Projektdatei (app/project.js): eine recipe.json für Menü und Hülle, gemeinsame Angaben nur einmal, ältere Dateien, Spielordner.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../app/project.js');
const M = require('../app/menu-core.js');
const F = require('../app/files.js');
const C = require('../app/core.js');
const { loadSchemaValidator } = require('./helpers');

const bytes = (n, v) => new Uint8Array(n).fill(v);
const LATO = fs.readFileSync(path.join(__dirname, '..', 'app', 'assets', 'fonts', 'Lato-Bold.ttf'));
const dec = (f) => JSON.parse(new TextDecoder().decode(f.data));

function sample() {
  const st = M.newState(); st.title = 'Meine Disc';
  Object.assign(st.games[0], { name: 'Half-Life', provider: 'steam', description: 'Ein Klassiker.', installer: 'HL/setup.exe', estimatedSizeMB: '2048', cover: 'a1' });
  st.games.push(Object.assign(M.newGame(), { name: 'Zweites Spiel', installer: 'B/setup.exe', cover: 'a3' }));
  st.background = 'a2';
  const assets = new Map([['a1', { data: bytes(40, 1), ext: 'png' }], ['a2', { data: bytes(50, 2), ext: 'jpg' }], ['a3', { data: bytes(20, 5), ext: 'png' }]]);
  const cover = C.defaultState(); Object.assign(cover, { title: 'Half-Life', provider: 'steam', space: '2', usk: '16', publisher: 'Valve', developer: 'Valve' });
  cover.back.description = 'Ein Klassiker.';
  cover.back.items = [{ type: 'text', text: 'Hallo', font: 'uf-abc', x: 1, y: 1, w: 20, h: 5 }];
  const images = { front: { data: bytes(60, 3), type: 'image/jpeg', name: 'front.jpg' }, spineLogo: { data: bytes(30, 4), type: 'image/png', name: 'logo.png' } };
  const fonts = [{ id: 'uf-abc', name: 'Meine Schrift', ext: 'ttf', data: F.toBase64(new Uint8Array(LATO)) }];
  return { menuState: st, menuAssets: assets, coverState: cover, coverImages: images, fonts, link: { game: 0 } };
}

test('Projektdatei: eine recipe.json, gemeinsame Angaben nur einmal, jede Datei einmal', async () => {
  const files = await M.readZip(P.pack(sample()));
  const names = files.map((f) => f.name).sort();
  assert.ok(names.includes('recipe.json'));
  assert.ok(!names.includes('menu.json') && !names.includes('cover.json'), 'keine zweite Beschreibung');
  assert.ok(names.includes('assets/cover.jpg'), 'Frontcover ist auch das Cover im Menü: ' + names.join());
  assert.ok(!names.some((n) => /^assets\/covers\/half-life/.test(n)), 'das kleinere Menü-Cover wird nicht zusätzlich gespeichert');
  assert.ok(names.includes('assets/huelle-spineLogo.png') && names.some((n) => /^fonts\/uf-abc\.ttf$/.test(n)));
  assert.equal(new Set(names).size, names.length);
  const r = dec(files.find((f) => f.name === 'recipe.json'));
  assert.equal(r.format, 'discmenu-recipe'); assert.equal(r.version, 1); assert.equal(r.gameIndex, 0);
  assert.deepEqual(r.game, { title: 'Half-Life', provider: 'steam', description: 'Ein Klassiker.', publisher: 'Valve', developer: 'Valve', sizeMB: 2048, cover: 'assets/cover.jpg' });
  const g0 = r.menu.games[0];
  for (const k of ['name', 'provider', 'description', 'estimatedSizeMB', 'cover']) assert.equal(g0[k], undefined, k + ' steht nur unter "game"');
  assert.equal(g0.installer, 'HL/setup.exe');
  assert.equal(r.menu.games[1].name, 'Zweites Spiel', 'andere Spiele bleiben vollständig');
  for (const k of ['title', 'provider', 'space', 'publisher', 'developer']) assert.equal(r.cover.state[k], undefined, k + ' steht nur unter "game"');
  assert.equal(r.cover.state.back.description, undefined);
  assert.equal(r.cover.state.usk, '16');
  assert.ok(loadSchemaValidator()(P.menuJsonFromRecipe(r)), 'daraus entsteht eine gültige menu.json (wie im Builder)');
  assert.equal(P.menuJsonFromRecipe(r).games[0].name, 'Half-Life');
});

test('Projektdatei lesen: alles kommt zurück', async () => {
  const r = P.read(await M.readZip(P.pack(sample())));
  assert.equal(r.kind, 'project');
  const g = r.menu.state.games[0];
  assert.equal(g.name, 'Half-Life'); assert.equal(g.provider, 'steam'); assert.equal(g.description, 'Ein Klassiker.'); assert.equal(String(g.estimatedSizeMB), '2048');
  assert.ok(g.cover && r.menu.assets.get(g.cover).ext === 'jpg', 'Menü-Cover aus dem gemeinsamen Bild');
  assert.equal(r.menu.state.games[1].name, 'Zweites Spiel');
  const s = r.cover.state;
  assert.equal(s.title, 'Half-Life'); assert.equal(s.provider, 'steam'); assert.equal(s.publisher, 'Valve'); assert.equal(s.space, '2'); assert.equal(s.back.description, 'Ein Klassiker.'); assert.equal(s.usk, '16');
  assert.deepEqual(Object.keys(r.cover.images).sort(), ['front', 'spineLogo']);
  assert.equal(r.cover.fonts.length, 1);
  // ohne Frontcover: das Cover des Menüs ist das gemeinsame Bild
  const p = sample(); delete p.coverImages.front;
  const files = await M.readZip(P.pack(p)), rec = dec(files.find((f) => f.name === 'recipe.json'));
  assert.match(rec.game.cover, /^assets\/covers\//);
  assert.ok(P.read(files).cover.images.front, 'wird beim Öffnen auch Frontcover');
});

test('Ältere Dateien: Vorschau-Version (menu.json + cover.json), Rezept-ZIP, menu.json, Hüllen-ZIP', async () => {
  const s = sample();
  const { menu, files } = M.buildMenu(s.menuState, s.menuAssets);
  const recipeZip = M.buildZip([{ name: 'menu.json', data: new TextEncoder().encode(JSON.stringify(menu)) }, ...files]);
  let r = P.read(await M.readZip(recipeZip));
  assert.equal(r.kind, 'menu'); assert.equal(r.cover, null); assert.equal(r.menu.state.games[0].name, 'Half-Life');
  const combined = M.buildZip([{ name: 'menu.json', data: new TextEncoder().encode(JSON.stringify(menu)) }, ...files, ...F.projectEntries(s.coverState, s.coverImages, [], { dir: 'assets/', prefix: 'huelle-', version: 2, extra: { link: { game: 0 } } })]);
  r = P.read(await M.readZip(combined));
  assert.equal(r.kind, 'combined'); assert.equal(r.cover.state.usk, '16'); assert.ok(r.cover.images.front);
  r = P.readJson(JSON.stringify(menu));
  assert.equal(r.kind, 'menu'); assert.equal(r.menu.state.games[0].name, 'Half-Life');
  r = P.read(await M.readZip(F.packProject(s.coverState, s.coverImages, s.fonts)));
  assert.equal(r.kind, 'cover'); assert.equal(r.menu.state.games[0].name, 'Half-Life'); assert.equal(r.menu.state.games[0].estimatedSizeMB, '2048');
  await assert.rejects(async () => P.read(await M.readZip(M.buildZip([{ name: 'x.txt', data: bytes(3, 1) }]))), /keine Projektdatei/);
  // eine recipe.json allein (ohne Bilder) lässt sich ebenfalls öffnen
  const rj = dec((await M.readZip(P.pack(s))).find((f) => f.name === 'recipe.json'));
  r = P.readJson(JSON.stringify(rj));
  assert.equal(r.kind, 'project'); assert.equal(r.menu.state.games[0].name, 'Half-Life');
  assert.throws(() => P.menuJsonFromRecipe({ format: 'discmenu-recipe', version: 99 }), /neueren Version/);
});

test('Verknüpfte Felder: Unterschiede in beide Richtungen', () => {
  const s = sample();
  assert.deepEqual(P.coverDiff(s.menuState, s.coverState, s.link), {});
  s.menuState.games[0].name = 'Half-Life 2';
  assert.deepEqual(P.coverDiff(s.menuState, s.coverState, s.link), { title: 'Half-Life 2' });
  s.coverState.provider = 'gog'; s.coverState.title = 'Half-Life 2';
  assert.deepEqual(P.menuDiff(s.menuState, s.coverState, s.link), { provider: 'gog' });
  s.coverState.space = '3';
  assert.deepEqual(P.menuDiff(s.menuState, s.coverState, s.link), { provider: 'gog', estimatedSizeMB: '3072' });
  s.menuState.games[0].estimatedSizeMB = '';
  assert.equal(P.coverDiff(s.menuState, s.coverState, s.link).space, undefined);
  assert.deepEqual(P.normLink({ game: 'x' }), { game: 0 });
});

test('Spielordner: Vorschläge nach den Ordnernamen, Teile eines Installers erscheinen nicht', () => {
  const plan = P.planFromFolder([
    { path: 'base_game', dir: true }, { path: 'base_game/setup_mein_spiel_gold.exe' }, { path: 'base_game/setup_mein_spiel_gold-1.bin' },
    { path: 'extras', dir: true }, { path: 'extras/Soundtrack', dir: true }, { path: 'extras/Soundtrack/01.mp3' }, { path: 'extras/manual.pdf' },
    { path: 'Hauptspiel_Overhauls/Retexture/setup_retexture.exe' }, { path: 'Patches_und_Fixes/Starthilfe/launcher_setup.exe' },
    { path: 'Story_Erweiterungen/Kapitel2/setup_kapitel2.exe' }, { path: 'Sonstiges/tool.exe' },
  ]);
  const row = (p) => plan.find((x) => x.path === p);
  assert.equal(row('base_game/setup_mein_spiel_gold.exe').kind, 'installer');
  assert.equal(plan.filter((x) => x.kind === 'installer').length, 1);
  assert.ok(!plan.some((x) => /\.bin$/.test(x.path)));
  assert.deepEqual([row('extras/Soundtrack').kind, row('extras/Soundtrack').open, row('extras/manual.pdf').name], ['extras', true, 'Manual']);
  assert.ok(!row('extras/Soundtrack/01.mp3'), 'Inhalt eines Extra-Ordners wird als Ordner geöffnet');
  assert.deepEqual([row('Hauptspiel_Overhauls/Retexture/setup_retexture.exe').kind, row('Hauptspiel_Overhauls/Retexture/setup_retexture.exe').name, row('Hauptspiel_Overhauls/Retexture/setup_retexture.exe').group], ['patches', 'Retexture', 'Hauptspiel Overhauls']);
  assert.equal(row('Patches_und_Fixes/Starthilfe/launcher_setup.exe').group, 'Patches & Fixes');
  assert.deepEqual([row('Story_Erweiterungen/Kapitel2/setup_kapitel2.exe').kind, row('Story_Erweiterungen/Kapitel2/setup_kapitel2.exe').name], ['dlcs', 'Kapitel2']);
  assert.equal(row('Sonstiges/tool.exe').kind, 'skip', 'Unbekanntes wird nicht übernommen, lässt sich aber zuordnen');
});

test('Spielordner: lesbare Namen und Gruppen für Extras', () => {
  const plan = P.planFromFolder([
    { path: 'extras/mein_spiel_soundtrack', dir: true }, { path: 'extras/mein_spiel_soundtrack/01.mp3' }, { path: 'extras/mein_spiel_wallpapers', dir: true },
    { path: 'extras/Mein Spiel manual.pdf' }, { path: 'extras/mein spiel reference card.pdf' }, { path: 'extras/Mein Spiel newspaper handout.pdf' },
    { path: 'extras/Bilder', dir: true }, { path: 'extras/Bilder/a.jpg' }, { path: 'extras/Bilder/b.png' },
    { path: 'Patches_und_Fixes/FixPack.3.4.1.2024-11-29.039.exe' }, { path: 'Story_Erweiterungen/Die_Grosse_Mod_Installer_2025-11-5_1723.exe' },
    { path: 'Story_Erweiterungen/2099_1.2.1.exe' },
  ], { game: 'Mein Spiel: Gold Edition' });
  const by = (p) => plan.find((x) => x.path === p);
  assert.deepEqual([by('extras/mein_spiel_soundtrack').name, by('extras/mein_spiel_soundtrack').group], ['Soundtrack', 'Musik']);
  assert.deepEqual([by('extras/mein_spiel_wallpapers').name, by('extras/mein_spiel_wallpapers').group], ['Wallpapers', 'Artwork']);
  assert.deepEqual([by('extras/Mein Spiel manual.pdf').name, by('extras/Mein Spiel manual.pdf').group], ['Manual', 'Anleitungen']);
  assert.equal(by('extras/mein spiel reference card.pdf').group, 'Anleitungen');
  assert.equal(by('extras/Mein Spiel newspaper handout.pdf').group, 'Zusätze');
  assert.equal(by('extras/Bilder').group, 'Artwork', 'Ordner mit Bildern');
  assert.deepEqual(plan.filter((x) => x.kind === 'extras').map((x) => x.group), ['Anleitungen', 'Anleitungen', 'Musik', 'Artwork', 'Artwork', 'Zusätze'], 'nach Gruppen geordnet');
  assert.equal(by('Patches_und_Fixes/FixPack.3.4.1.2024-11-29.039.exe').name, 'FixPack');
  assert.equal(by('Story_Erweiterungen/Die_Grosse_Mod_Installer_2025-11-5_1723.exe').name, 'Die Grosse Mod');
  assert.equal(by('Story_Erweiterungen/2099_1.2.1.exe').name, '2099');
});

test('Spielordner: der Installer des Spiels trägt den Namen des Spiels', () => {
  const exe = 'base_game/setup_mein_spiel_gold_1.112fm(revision_1.6.3.0)_(51757).exe';
  assert.equal(P.planFromFolder([{ path: exe }], { game: 'Mein Spiel: Gold Edition' })[0].name, 'Mein Spiel: Gold Edition');
  assert.equal(P.planFromFolder([{ path: exe }])[0].name, 'Mein spiel gold', 'ohne Spielnamen: der Dateiname ohne Version');
});

test('Spielordner: Disc mit mehreren Spielen in eigenen Ordnern', () => {
  const L = [{ path: 'autorun.inf' }, { path: 'disc-menue.exe' },
    { path: 'burgspiel/setup_burgspiel_2.0.0.9.exe' }, { path: 'burgspiel/setup_burgspiel_hd_1.41_(german)_(20341).exe' }, { path: 'burgspiel/Minispiel.exe' },
    { path: 'burgspiel/Bonus/burgspiel_manual.pdf' }, { path: 'burgspiel/Bonus/burgspiel_hd_soundtrack', dir: true },
    { path: 'burgspiel_kreuzzug/setup_burgspiel_kreuzzug_2.0.0.2.exe' }, { path: 'burgspiel_kreuzzug/setup_burgspiel_kreuzzug_extra_hd_1.41(a)_(german)_(45299).exe' }];
  let plan = P.planFromFolder(L);
  const by = (p) => plan.find((x) => x.path === p);
  assert.deepEqual([...new Set(plan.map((x) => x.game))], ['burgspiel', 'burgspiel_kreuzzug', ''], 'je Spielordner, dazu die Wurzel');
  assert.deepEqual([by('burgspiel/setup_burgspiel_2.0.0.9.exe').kind, by('burgspiel/setup_burgspiel_2.0.0.9.exe').name], ['installer', 'Burgspiel'], 'ohne Spiel im Menü: das Setup mit dem kürzesten Namen');
  assert.equal(by('burgspiel/setup_burgspiel_hd_1.41_(german)_(20341).exe').kind, 'dlcs', 'ein weiteres Setup wird DLC');
  assert.deepEqual([by('burgspiel/Minispiel.exe').kind, by('burgspiel/Minispiel.exe').open], ['extras', true], 'andere Programme werden gestartet');
  assert.deepEqual([by('burgspiel/Bonus/burgspiel_manual.pdf').name, by('burgspiel/Bonus/burgspiel_manual.pdf').group], ['Manual', 'Anleitungen'], 'Ordnername vorn entfernt');
  assert.deepEqual([by('disc-menue.exe').kind, by('disc-menue.exe').game], ['skip', ''], 'die Menü-EXE in der Wurzel wird nicht übernommen');
  assert.ok(!by('autorun.inf'));
  assert.equal(by('burgspiel_kreuzzug/setup_burgspiel_kreuzzug_2.0.0.2.exe').gameName, 'Burgspiel Kreuzzug');
  // mit Spielen im Menü: passender Ordner zum passenden Spiel, der passende Installer
  plan = P.planFromFolder(L, { games: ['Burgspiel HD'] });
  assert.equal(by('burgspiel/setup_burgspiel_hd_1.41_(german)_(20341).exe').kind, 'installer', 'HD passt zu "Burgspiel HD"');
  assert.equal(by('burgspiel/setup_burgspiel_hd_1.41_(german)_(20341).exe').gameIndex, 0);
  assert.equal(by('burgspiel_kreuzzug/setup_burgspiel_kreuzzug_2.0.0.2.exe').gameIndex, -1, 'Kreuzzug gehört nicht zu "Burgspiel HD"');
  // ein einzelner Spielordner: wie bisher ein Spiel, der Ordnername wird vorn aus den Namen entfernt
  plan = P.planFromFolder(L.filter((e) => e.path.startsWith('burgspiel/')).map((e) => ({ path: e.path.slice('burgspiel/'.length) })), { game: 'Burgspiel HD', folder: 'burgspiel' });
  assert.ok(plan.every((x) => !x.game));
  assert.equal(by('setup_burgspiel_hd_1.41_(german)_(20341).exe').kind, 'installer');
  assert.equal(by('Bonus/burgspiel_manual.pdf').name, 'Manual');
});
