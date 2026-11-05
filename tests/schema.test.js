const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, loadCore, loadSchemaValidator } = require('./helpers');
const C = loadCore();
const validateSchema = loadSchemaValidator();
const ok = m => { const r = validateSchema(m); assert.ok(r, JSON.stringify(validateSchema.errors)); };
const bad = m => assert.equal(validateSchema(m), false, 'sollte abgelehnt werden: ' + JSON.stringify(m));

const base = () => ({ schemaVersion: 1, title: 'T', games: [{ index: 0, name: 'A', installer: 'a/setup.exe' }] });

test('Beispiel-Rezept erfüllt das Schema', () => {
  ok(JSON.parse(fs.readFileSync(path.join(root, 'examples', 'menu.example.json'), 'utf8')));
});

test('Schema: gültige Minimal- und Volldateien', () => {
  ok(base());
  const m = base();
  m.output = 'Setup.exe'; m.background = 'assets/background.jpg'; m.sounds = { click: 'assets/sounds/click.wav' };
  m.games[0].estimatedSizeMB = 1500; m.games[0].args = ['/SILENT']; m.games[0].provider = 'gog';
  m.games[0].extras = [{ name: 'Link', open: 'https://example.com/x' }, { name: 'Ordner', open: 'Spiel/Extras' }, { name: 'P', installer: 'p.exe', args: ['/S'] }];
  ok(m);
});

test('Schema: ungültige Dateien werden abgelehnt', () => {
  let m = base(); m.schemaVersion = 2; bad(m);
  m = base(); delete m.title; bad(m);
  m = base(); m.games = []; bad(m);
  m = base(); m.unbekannt = 1; bad(m);
  m = base(); m.games[0].installer = 'C:\\setup.exe'; bad(m);
  m = base(); m.games[0].installer = '/setup.exe'; bad(m);
  m = base(); m.games[0].installer = '../setup.exe'; bad(m);
  m = base(); m.games[0].index = -1; bad(m);
  m = base(); m.games[0].index = 1.5; bad(m);
  m = base(); m.games[0].estimatedSizeMB = 0; bad(m);
  m = base(); m.games[0].provider = 'steam'; bad(m);
  m = base(); m.background = 'bild.png'; bad(m);
  m = base(); m.background = 'assets/../x.png'; bad(m);
  m = base(); m.output = 'a/b.exe'; bad(m);
  m = base(); m.games[0].extras = [{ name: 'X' }]; bad(m);
  m = base(); m.games[0].extras = [{ name: 'X', installer: 'a.exe', open: 'b' }]; bad(m);
  m = base(); m.games[0].extras = [{ name: 'X', open: 'b', args: ['/S'] }]; bad(m);
  m = base(); m.games[0].extras = [{ name: 'X', open: 'ftp://x' }]; bad(m);
});

test('Konfigurator-Export erfüllt das Schema (mit und ohne Assets)', () => {
  const s = C.newState();
  s.title = 'Export'; const g = s.games[0]; g.name = 'Spiel'; g.installer = 'S\\setup.exe'; g.estimatedSizeMB = '12';
  const a = C.newItem(); a.name = 'DLC'; a.path = 'S/dlc.exe'; a.args = '/S "/X y"'; g.dlcs.push(a);
  const b = C.newItem(); b.name = 'Web'; b.kind = 'open'; b.path = 'https://example.com'; g.extras.push(b);
  s.games.push(Object.assign(C.newGame(), { name: 'Zwei', installer: 'Z/setup.exe' }));
  const assets = new Map([['a1', { data: new Uint8Array([1]), ext: 'png' }], ['a2', { data: new Uint8Array([2]), ext: 'ogg' }]]);
  s.games[0].cover = 'a1'; s.sounds.hover = 'a2'; s.background = 'a1';
  assert.deepEqual(C.validate(s).filter(i => i.level === 'error'), []);
  ok(C.buildMenu(s, assets).menu);
});

test('Prüfung im Konfigurator und Schema sind sich einig', () => {
  // Fälle, die beide ablehnen müssen
  const cases = [
    s => { s.games[0].installer = 'C:\\x.exe'; },
    s => { s.games[0].installer = '../x.exe'; },
    s => { s.games[0].installer = '/x.exe'; },
    s => { s.games[0].estimatedSizeMB = '0'; },
    s => { s.output = 'a/b.exe'; },
  ];
  for (const mut of cases) {
    const s = C.newState(); s.title = 'T'; s.games[0].name = 'A'; s.games[0].installer = 'a/b.exe';
    mut(s);
    const hasErr = C.validate(s).some(i => i.level === 'error');
    assert.ok(hasErr, 'Konfigurator sollte Fehler melden');
    assert.equal(validateSchema(C.buildMenu(s, new Map()).menu), false, 'Schema sollte ablehnen');
  }
});
