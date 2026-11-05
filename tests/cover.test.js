const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../cover-tool/core.js');

test('Maße: Rücken und Seiten ergeben die Gesamtbreite', () => {
  for (const [name, c] of Object.entries(C.CASES)) {
    assert.equal(c.back + c.spine + c.front, c.w, name);
    assert.equal(c.h, 183);
  }
  // Das Blatt (A4 quer) muss Cover plus Schnittmarken (6 mm je Seite) aufnehmen
  for (const c of Object.values(C.CASES)) {
    assert.ok(c.w + 12 <= C.PAPER.w && c.h + 12 <= C.PAPER.h);
  }
});

test('Bildmaße: oben, grüner Streifen und unten ergeben die Höhe', () => {
  const s = C.imageSpecs('normal');
  assert.equal(s.backTop.h + C.BACK.banner + C.BACK.bottom, 183);
  assert.deepEqual(s.front, { w: 129, h: 183 });
  assert.deepEqual(s.backBottom, { w: 130, h: C.BACK.bottom });
  assert.equal(C.imageSpecs('slim').front.w, 129.5);
});

test('Speicherangaben', () => {
  assert.equal(C.formatStorage('4', 'RAM'), '4 GB RAM');
  assert.equal(C.formatStorage('0,5', 'RAM'), '500 MB RAM');
  assert.equal(C.formatStorage(4.25), '4.25 GB');
  assert.equal(C.formatStorage('', 'x'), '');
  assert.equal(C.formatStorage('abc', 'x'), '');
});

test('Betriebssysteme', () => {
  assert.equal(C.osString({ win: ['11', '10'], x64: true }, 'de'), 'Windows (10, 11, 64-Bit)');
  assert.equal(C.osString({ win: ['XP', 'Vista', '7'], x64: false }, 'en'), 'Windows (XP, Vista, 7)');
  assert.equal(C.osString({ win: ['10'], mac: true, linux: true, x64: true }, 'en'), 'Windows (10, 64-bit) / macOS / Linux');
  assert.equal(C.osString({ win: [], mac: true, linux: false }, 'de'), 'macOS');
  assert.equal(C.osString({ win: [] }, 'de'), '');
});

test('Prozessor und Grafikkarte', () => {
  const cpu = { intel: { on: true, pre: 'Core i5', num: '12400', sfx: 'F' }, amd: { on: true, pre: 'Ryzen 5', num: '5600', sfx: 'X' }, custom: '' };
  assert.deepEqual(C.cpuList(cpu), ['Intel Core i5-12400F', 'AMD Ryzen 5 5600X']);
  assert.deepEqual(C.cpuList({ ...cpu, custom: ' Pentium III ' }), ['Pentium III']);
  assert.deepEqual(C.cpuList({ intel: { on: true, pre: 'Core i5', num: '', sfx: '' }, amd: { on: false } , custom: ''}), ['Intel Core i5']);
  const gpu = { nvidia: { on: true, pre: 'RTX', num: '3060', sfx: 'Ti' }, amd: { on: true, pre: 'RX', num: '6700', sfx: 'XT' }, custom: '' };
  assert.deepEqual(C.gpuList(gpu), ['NVIDIA GeForce RTX 3060 Ti', 'AMD Radeon RX 6700 XT']);
  assert.deepEqual(C.gpuList({ nvidia: { on: true, pre: 'Quadro', num: 'K2000', sfx: '' }, amd: { on: false }, custom: '' }), ['NVIDIA Quadro K2000']);
  assert.deepEqual(C.gpuList({ nvidia: { on: false }, amd: { on: false }, custom: '' }), []);
});

test('Zeilen der Systemanforderungen: leere entfallen, Sprache wählbar', () => {
  const s = C.defaultState();
  s.cpu.custom = 'Pentium 4'; s.dx = 'Version 9.0c'; s.other = '';
  const rows = C.buildSpecs(s);
  assert.deepEqual(rows.map((r) => r.key), ['os', 'cpu', 'ram', 'dx', 'space']);   // Grafik und Sonstiges sind leer
  assert.equal(rows[0].label, 'Läuft auf');
  assert.deepEqual(rows[2].values, ['4 GB RAM']);
  s.lang = 'en';
  assert.equal(C.buildSpecs(s)[0].label, 'Works on');
  assert.deepEqual(C.buildSpecs(s).find((r) => r.key === 'space').values, ['10 GB available space']);
});

test('Beschriftungen gibt es in beiden Sprachen vollständig', () => {
  const keys = (o) => Object.keys(o).sort().join();
  assert.equal(keys(C.LABELS.de), keys(C.LABELS.en));
  assert.equal(keys(C.LABELS.de.feat), keys(C.LABELS.en.feat));
  assert.equal(keys(C.LABELS.de.galaxy), keys(C.LABELS.en.galaxy));
  for (const f of C.FEATURE_ORDER) assert.ok(C.LABELS.de.feat[f], f);
});

test('Gespeicherte Einstellungen: kaputte oder alte Daten stören nicht', () => {
  const d = C.defaultState();
  assert.deepEqual(C.mergeState(null), d);
  assert.deepEqual(C.mergeState('quatsch'), d);
  const m = C.mergeState({ caseType: 'riesig', disc: 'bluray', usk: '99', lang: 'fr', title: 5, features: ['co_op', 7], os: { win: ['7'], mac: 'ja' }, cpu: { intel: { on: true, pre: 'Core i9' } }, unbekannt: 1 });
  assert.equal(m.caseType, 'normal');
  assert.equal(m.disc, 'bluray');
  assert.equal(m.usk, '0');
  assert.equal(m.lang, 'de');
  assert.equal(m.title, '');
  assert.deepEqual(m.features, ['co_op']);
  assert.deepEqual(m.os.win, ['7']);
  assert.equal(m.os.mac, false);
  assert.equal(m.cpu.intel.on, true);
  assert.equal(m.cpu.intel.pre, 'Core i9');
  assert.equal(m.cpu.intel.num, '');
  assert.equal(m.unbekannt, undefined);
  assert.equal(C.mergeState({ usk: 'none' }).usk, 'none');
});

test('Bilder werden für den Druck verkleinert, nie vergrößert', () => {
  assert.deepEqual(C.fitSize(5000, 2500, 2300), { w: 2300, h: 1150 });
  assert.deepEqual(C.fitSize(800, 600, 2300), { w: 800, h: 600 });
  assert.deepEqual(C.fitSize(1, 5000, 2300), { w: 1, h: 2300 });
});

test('Alle Grafiken, die das Tool lädt, sind vorhanden und nicht übergroß', () => {
  const fs = require('node:fs'), path = require('node:path');
  const root = path.join(__dirname, '..', 'cover-tool', 'assets', 'images');
  const need = [
    'gog_logo.png',
    ...C.USK_VALUES.map((v) => `usk/usk_${v}.png`),
    ...Object.values(C.DISCS).map((f) => `disc/${f}`),
    ...C.FEATURE_ORDER.map((f) => `features/${f}.png`),
  ];
  for (const f of need) {
    const p = path.join(root, f);
    assert.ok(fs.existsSync(p), 'fehlt: ' + f);
    assert.ok(fs.statSync(p).size < 200 * 1024, 'zu groß: ' + f);
    const b = fs.readFileSync(p);
    assert.equal(b.readUInt32BE(16) <= 1000 && b.readUInt32BE(20) <= 1000, true, 'Bild zu hoch aufgelöst: ' + f);   // PNG-Kopf: Breite und Höhe
  }
});
