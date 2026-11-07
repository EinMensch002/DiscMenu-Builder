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

test('Eigene Maße: Grenzen, Anpassung und Vorlagen', () => {
  const st = (custom, caseType = 'custom') => ({ ...C.defaultState(), caseType, custom: { ...C.defaultState().custom, ...custom } });
  assert.deepEqual(C.caseDims(st({}, 'normal')), C.CASES.normal);
  const ok = C.caseDims(st({ back: '127,5', spine: '14', front: '127.5', h: '148' }));
  assert.deepEqual([ok.w, ok.h, ok.back, ok.spine, ok.front, ok.adjusted], [269, 148, 127.5, 14, 127.5, false]);
  // zu groß oder unlesbar: in die Grenzen gezwungen und gemeldet
  const big = C.caseDims(st({ back: '400', spine: '99', front: '150', h: '500' }));
  assert.ok(big.adjusted && big.w <= C.MAX_W && big.h === 198 && big.spine === 30);
  assert.ok(big.w + 12 <= C.PAPER.w && big.h + 12 <= C.PAPER.h, 'passt mit Schnittmarken auf das Blatt');
  const bad = C.caseDims(st({ back: 'abc', spine: '', front: '-5', h: '0' }));
  assert.ok(bad.adjusted && bad.back === 130 && bad.spine === 14 && bad.front === 100 && bad.h === 100);
  // Vorlagen liegen innerhalb der Grenzen und ergeben die genannte Gesamtbreite
  for (const [id, p] of Object.entries(C.PRESETS)) { const d = C.caseDims(st(p)); assert.equal(d.adjusted, false, id); assert.ok(d.w <= C.MAX_W); }
  assert.equal(C.caseDims(st(C.PRESETS.bluray)).w, 269);
  assert.equal(C.caseDims(st(C.PRESETS.blurayslim)).w, 262);
  // Bildmaße folgen den eigenen Maßen
  const sp = C.imageSpecs(C.caseDims(st(C.PRESETS.bluray)));
  assert.deepEqual(sp.front, { w: 127.5, h: 148 - C.BAR_HEIGHT });          // unter der Kopfleiste
  assert.equal(sp.backTop.h, 148 - C.BACK.banner - C.BACK.bottom);
  // gespeichert und wieder geladen
  assert.equal(C.mergeState({ caseType: 'custom', custom: { back: '120' } }).custom.back, '120');
  assert.equal(C.mergeState({ caseType: 'custom', custom: { spine: 5 } }).custom.spine, '14');   // Zahl statt Text: Standard
});

test('Prozessor- und Grafikkartentexte werden in Einträge zerlegt', () => {
  const cpu = (t) => C.parseCpuItems(t).map((i) => C.hwText('cpu', i));
  const gpu = (t) => C.parseGpuItems(t).map((i) => C.hwText('gpu', i));
  // "or", "oder" und "/" trennen die Möglichkeiten, jede wird ein eigener Eintrag (keine Grenze auf zwei)
  assert.deepEqual(cpu('Core i7-6700 or Ryzen 5 1600'), ['Intel Core i7-6700', 'AMD Ryzen 5 1600']);
  assert.deepEqual(cpu('Intel® Core™ i5-4460 or AMD FX-6300'), ['Intel Core i5-4460', 'AMD FX 6300']);
  assert.deepEqual(cpu('Core i3 or Core i5 or Ryzen 3'), ['Intel Core i3', 'Intel Core i5', 'AMD Ryzen 3']);
  assert.deepEqual(cpu('Intel Core i7-6700K'), ['Intel Core i7-6700K']);
  assert.deepEqual(cpu('AMD Ryzen 5 5600X (3.7 GHz) or better'), ['AMD Ryzen 5 5600X']);
  assert.deepEqual(cpu('Intel Core 2 Duo E6600 oder AMD Phenom X3 8750'), ['Intel Core 2 Duo E6600', 'AMD Phenom X3 8750']);
  assert.deepEqual(cpu('Core Ultra 5 245'), ['Intel Core Ultra 5 245']);
  // Was nicht in die Auswahlfelder passt, bleibt als Text erhalten (nichts geht verloren)
  assert.deepEqual(cpu('Pentium III 500 MHz'), ['Pentium III 500 MHz']);
  assert.deepEqual(C.parseCpuItems('Pentium III 500 MHz').map((i) => i.kind), ['text']);
  assert.deepEqual(cpu('2.33 GHz or faster x86-compatible processor'), ['2.33 GHz']);
  assert.deepEqual(cpu(''), []);
  // Grafikkarten: "GeForce" und "Radeon" ohne NVIDIA/AMD davor, Speicher als eigenes Feld, Zusätze wie Ti und SUPER
  assert.deepEqual(gpu('GeForce GTX 1060 6GB or Radeon RX 580 8GB'), ['GeForce GTX 1060 6 GB', 'Radeon RX 580 8 GB']);
  assert.deepEqual(gpu('NVIDIA GeForce RTX 3060 Ti'), ['GeForce RTX 3060 Ti']);
  assert.deepEqual(gpu('Nvidia GTX 650'), ['GeForce GTX 650']);
  assert.deepEqual(gpu('GTX 1660 SUPER 6GB'), ['GeForce GTX 1660 SUPER 6 GB']);
  assert.deepEqual(gpu('RTX 2060 Ti Super'), ['GeForce RTX 2060 Ti SUPER']);
  assert.deepEqual(gpu('AMD Radeon RX 6700 XT'), ['Radeon RX 6700 XT']);
  assert.deepEqual(gpu('NVIDIA GeForce GTX 560 Ti (1 GB) or AMD Radeon HD 6870'), ['GeForce GTX 560 Ti 1 GB', 'Radeon HD 6870']);
  assert.deepEqual(gpu('GeForce GTX 1060 6GB or Radeon RX 580 8GB or Arc A380'), ['GeForce GTX 1060 6 GB', 'Radeon RX 580 8 GB', 'Arc A380']);
  const arc = C.parseGpuItems('Arc A380')[0]; assert.equal(arc.kind, 'text');
  const g = C.parseGpuItems('GeForce GTX 1060 6GB')[0];
  assert.deepEqual([g.kind, g.pre, g.num, g.sfx, g.gb], ['geforce', 'GTX', '1060', '', '6']);
  assert.deepEqual(gpu('NVIDIA GeForce 8800 GT'), ['GeForce 8800 GT']);               // passt in kein Feld: Text, aber ohne NVIDIA
  assert.deepEqual(gpu('Intel HD Graphics 520'), ['Intel HD Graphics 520']);
  assert.deepEqual(gpu('GTX 1060 or GTX 1070'), ['GeForce GTX 1060', 'GeForce GTX 1070']);
});

test('Bildmaße: oben, grüner Streifen und unten ergeben die Höhe', () => {
  const s = C.imageSpecs('normal');
  assert.equal(s.backTop.h + C.BACK.banner + C.BACK.bottom, 183);
  assert.deepEqual(s.front, { w: 129, h: 164.4 });
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

test('Prozessor und Grafikkarte: Einträge an- und ausschalten, Namen ohne NVIDIA und AMD vor GeForce und Radeon', () => {
  const it = (type, kind, over) => ({ ...C.newHwItem(type, kind), ...over });
  const cpu = { items: [it('cpu', 'intel', { pre: 'Core i5', num: '12400', sfx: 'F' }), it('cpu', 'amd', { pre: 'Ryzen 5', num: '5600', sfx: 'X' }), it('cpu', 'text', { text: ' Pentium III ' })] };
  assert.deepEqual(C.cpuList(cpu), ['Intel Core i5-12400F', 'AMD Ryzen 5 5600X', 'Pentium III']);
  cpu.items[1].on = false;                                                         // ausgeschalteter Eintrag steht nicht auf dem Cover
  assert.deepEqual(C.cpuList(cpu), ['Intel Core i5-12400F', 'Pentium III']);
  assert.deepEqual(C.cpuList({ items: [it('cpu', 'intel', { num: '' })] }), ['Intel Core i5']);
  const gpu = { items: [it('gpu', 'geforce', { pre: 'RTX', num: '3060', sfx: 'Ti', gb: '12' }), it('gpu', 'radeon', { pre: 'RX', num: '6700', sfx: 'XT' }), it('gpu', 'text', { text: 'NVIDIA GeForce 8800 GT' }), it('gpu', 'text', { text: 'AMD Radeon HD 5870' })] };
  assert.deepEqual(C.gpuList(gpu), ['GeForce RTX 3060 Ti 12 GB', 'Radeon RX 6700 XT', 'GeForce 8800 GT', 'Radeon HD 5870']);
  assert.deepEqual(C.gpuList({ items: [it('gpu', 'geforce', { pre: 'Titan', num: '', sfx: 'Ti SUPER', gb: '6,5' })] }), ['GeForce Titan Ti SUPER 6.5 GB']);
  assert.deepEqual(C.gpuList({ items: [] }), []);
  // Ältere Einstellungen (Intel/AMD- und NVIDIA/AMD-Felder, eigener Text) werden umgewandelt
  const old = C.mergeState({ cpu: { intel: { on: true, pre: 'Core i7', num: '6700', sfx: 'K' }, amd: { on: false }, custom: '' }, gpu: { nvidia: { on: true, pre: 'GTX', num: '1060', sfx: 'Ti 6GB' }, amd: { on: true, pre: 'RX', num: '580', sfx: '8GB' }, custom: '' } });
  assert.deepEqual(C.cpuList(old.cpu), ['Intel Core i7-6700K']); assert.deepEqual(C.gpuList(old.gpu), ['GeForce GTX 1060 Ti 6 GB', 'Radeon RX 580 8 GB']);
  assert.deepEqual(C.cpuList(C.mergeState({ cpu: { custom: 'Pentium 4' } }).cpu), ['Pentium 4']);
  assert.equal(C.mergeState({ cpu: { items: Array.from({ length: 20 }, () => ({ kind: 'intel' })) } }).cpu.items.length, C.HW_MAX);   // Obergrenze
  assert.deepEqual(C.mergeState({ gpu: { items: [{ kind: 'quatsch', text: 'x' }, 5, null] } }).gpu.items.map((i) => i.kind), ['text']);
});

test('Zeilen der Systemanforderungen: leere entfallen, Sprache wählbar', () => {
  const s = C.defaultState();
  s.cpu.items = [{ ...C.newHwItem('cpu', 'text'), text: 'Pentium 4' }]; s.dx = 'Version 9.0c'; s.other = '';
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
  assert.ok(C.LABELS.de.reqTitle && C.LABELS.en.reqTitle && C.LABELS.de.tag && C.LABELS.en.tag);
  for (const f of C.FEATURE_ORDER) assert.ok(C.LABELS.de.feat[f], f);
});

test('Gespeicherte Einstellungen: kaputte oder alte Daten stören nicht', () => {
  const d = C.defaultState();
  assert.deepEqual(C.mergeState(null), d);
  assert.deepEqual(C.mergeState('quatsch'), d);
  const m = C.mergeState({ caseType: 'riesig', disc: 'bluray', usk: '99', lang: 'fr', title: 5, features: ['co_op', 7], os: { win: ['7'], mac: 'ja' }, cpu: { items: [{ kind: 'intel', pre: 'Core i9' }] }, unbekannt: 1 });
  assert.equal(m.caseType, 'normal');
  assert.equal(m.disc, 'bluray');
  assert.equal(m.usk, '0');
  assert.equal(m.lang, 'de');
  assert.equal(m.theme, 'dark');
  assert.equal(C.mergeState({ theme: 'modern' }).theme, 'dark');          // alter Stil "Modern" wird zu "Dunkel"
  assert.equal(C.mergeState({ theme: 'bar' }).theme, 'dark'); assert.equal(C.mergeState({ theme: 'x' }).theme, 'dark');
  assert.equal(C.mergeState({ theme: 'bunt' }).theme, 'dark');
  assert.equal(m.title, '');
  assert.deepEqual(m.features, ['co_op']);
  assert.deepEqual(m.os.win, ['7']);
  assert.equal(m.os.mac, false);
  assert.equal(m.cpu.items.length, 1);
  assert.equal(m.cpu.items[0].pre, 'Core i9');
  assert.equal(m.cpu.items[0].num, '');
  assert.equal(m.unbekannt, undefined);
  assert.equal(C.mergeState({ usk: 'none' }).usk, 'none');
});

test('Bilder werden für den Druck verkleinert, nie vergrößert', () => {
  assert.deepEqual(C.fitSize(5000, 2500, 2300), { w: 2300, h: 1150 });
  assert.deepEqual(C.fitSize(800, 600, 2300), { w: 800, h: 600 });
  assert.deepEqual(C.fitSize(1, 5000, 2300), { w: 1, h: 2300 });
});

test('Anbieter: Farben, Schriftzüge und Hinweise sind vollständig', () => {
  assert.deepEqual(Object.keys(C.PROVIDERS), ['gog', 'epic', 'steam']);
  for (const [id, p] of Object.entries(C.PROVIDERS)) {
    for (const k of ['brand', 'onBrand', 'dark', 'mid', 'accent', 'bannerA', 'bannerB']) assert.match(p[k], /^#[0-9a-f]{6}$/i, id + '.' + k);
    for (const lang of ['de', 'en']) { assert.ok(p.tag[lang] && p.note[lang], id + ' ' + lang); }
  }
  assert.equal(C.PROVIDERS.gog.wordmark, 'GOG.COM');                    // GOG: Logo, daneben (abschaltbar) der Schriftzug
  assert.ok(C.PROVIDERS.epic.wordmark && C.PROVIDERS.steam.wordmark);   // die anderen nur einen Schriftzug
  assert.ok(!/GOG/.test(C.PROVIDERS.epic.note.de + C.PROVIDERS.epic.note.en + C.PROVIDERS.steam.note.de + C.PROVIDERS.steam.note.en), 'Hinweise anderer Anbieter nennen nicht GOG');
  const brands = Object.values(C.PROVIDERS).map((p) => p.brand);
  assert.equal(new Set(brands).size, 3, 'Jeder Anbieter hat eine eigene Farbe');
});

test('Alle Grafiken des Tools sind SVG, vorhanden und nicht übergroß', () => {
  const fs = require('node:fs'), path = require('node:path');
  const root = path.join(__dirname, '..', 'cover-tool', 'assets', 'images');
  const need = [
    'gog_logo.svg',
    ...C.USK_VALUES.flatMap((v) => [`usk/usk_${v}.svg`, `usk/usk_${v}_bg.svg`]),          // Raute und Hintergrund (Kachel mit Rand) getrennt
    ...Object.values(C.PROVIDERS.gog.variants).filter((v) => v.logo).map((v) => v.logo),
    ...Object.values(C.DISCS).map((f) => `disc/${f}`),
  ];
  for (const f of C.FEATURE_ORDER) {                         // Linien-Symbole: alle Funktionen, klein und schwarz
    const p = path.join(root, 'features', 'line', f + '.svg');
    assert.ok(fs.existsSync(p), 'fehlt: ' + f + '.svg');
    assert.ok(fs.statSync(p).size < 4000, 'zu groß: ' + f + '.svg');
    assert.match(fs.readFileSync(p, 'utf8'), /stroke="#000"/);
  }
  for (const f of need) {
    const p = path.join(root, f);
    assert.ok(fs.existsSync(p), 'fehlt: ' + f);
    assert.ok(fs.statSync(p).size < 100 * 1024, 'zu groß: ' + f);
    const t = fs.readFileSync(p, 'utf8');
    assert.match(t, /^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)?<svg[\s>]/, 'kein SVG: ' + f);               // nur Vektorgrafiken, keine Rastergrafiken (auch nicht eingebettet)
    assert.doesNotMatch(t, /<image|data:image/, 'eingebettetes Bild: ' + f);
  }
});

test('Stil-Auswahl: GOG hat drei Varianten (Weiß, Dunkel, durchscheinend), die anderen Anbieter nur die Leiste', () => {
  assert.deepEqual(C.styleOptions('gog').map((o) => o[0]), ['white', 'dark', 'glass']);
  assert.deepEqual(C.styleOptions('steam').map((o) => o[0]), ['bar']);
  assert.equal(C.defaultState().theme, 'dark'); assert.equal(C.defaultState().gogText, true);
  for (const t of ['white', 'dark', 'glass']) assert.equal(C.mergeState({ provider: 'gog', theme: t }).theme, t);
  assert.equal(C.mergeState({ provider: 'steam', theme: 'white' }).theme, 'bar');                 // Varianten gibt es nur bei GOG
  assert.equal(C.mergeState({ provider: 'gog', theme: 'bar' }).theme, 'dark');                    // alte Stile werden zu "Dunkel"
  assert.equal(C.mergeState({ provider: 'gog', theme: 'bar-dark' }).theme, 'dark');
  assert.equal(C.mergeState({ provider: 'gog', theme: 'alt-dark' }).theme, 'dark');
  assert.equal(C.mergeState({ gogText: false }).gogText, false); assert.equal(C.mergeState({}).gogText, true);
  // Leiste: bei GOG schmal; bei "durchscheinend" liegt sie über dem Bild, das Frontbild beginnt ganz oben
  assert.equal(C.barHeight({ provider: 'gog' }), 10); assert.equal(C.barHeight({ provider: 'steam' }), C.BAR_HEIGHT);
  assert.equal(C.frontTop({ provider: 'gog', theme: 'white' }), 10); assert.equal(C.frontTop({ provider: 'gog', theme: 'glass' }), 0);
  assert.equal(C.frontTop({ provider: 'epic', theme: 'bar' }), C.BAR_HEIGHT);
  const dims = C.caseDims(C.mergeState({}));
  assert.equal(C.imageSpecs(dims, 0).front.h, dims.h); assert.equal(C.imageSpecs(dims, 10).front.h, dims.h - 10);
  for (const v of Object.values(C.PROVIDERS.gog.variants)) assert.ok(v.barA && v.barB && v.fg && v.spine && v.bannerA);
  const s = C.defaultState();
  assert.equal(s.spineArt, 'color'); assert.equal(s.spineUseLogo, true); assert.equal(s.spinePub, true);
  assert.equal(C.mergeState({ spineArt: 'komisch' }).spineArt, 'color'); assert.equal(C.mergeState({ spineArt: 'image' }).spineArt, 'image');
});

test('Projektdatei: Rückenlogo wird mitgespeichert', async () => {
  const F = require('../cover-tool/files.js'), Z = require('../cover-tool/zip.js');
  assert.ok(F.IMAGE_KEYS.includes('spineLogo'));
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
  const out = F.unpackProject(await Z.read(F.packProject(C.defaultState(), { spineLogo: { data: png, type: 'image/png', name: 'logo.png' } })));
  assert.deepEqual([...out.images.spineLogo.data.slice(0, 4)], [137, 80, 78, 71]);
});

test('Logo-Anpassung: Zu breite Logos werden gedreht, das Ergebnis passt immer in den Platz', () => {
  const fit = C.fitLogo;
  // Rücken 14 mm, Rand 1,2 mm: quer 11,6 mm. Ein breites Logo (3,8 : 1) wäre aufrecht nur 3 mm hoch -> automatisch gedreht
  let r = fit(3.8, 'auto', 11.6, 30, 0, 4);
  assert.equal(r.rotated, true); assert.ok(r.h <= 11.6 + 1e-9 && r.w <= 30 + 1e-9);
  r = fit(1.2, 'auto', 11.6, 30, 0, 4);                       // fast quadratisch: bleibt aufrecht
  assert.equal(r.rotated, false); assert.ok(Math.abs(r.w - 11.6) < 1e-9);
  assert.equal(fit(3.8, 'no', 11.6, 30, 0, 4).rotated, false);          // von Hand aufrecht
  assert.equal(fit(1.2, 'yes', 11.6, 30, 0, 4).rotated, true);          // von Hand gedreht
  r = fit(2, 'no', 11.6, 30, 6, 4);                           // eigene Breite
  assert.ok(Math.abs(r.w - 6) < 1e-9 && Math.abs(r.h - 3) < 1e-9);
  r = fit(0.4, 'no', 11.6, 12, 0, 4);                         // sehr hohes Logo: durch die Länge begrenzt
  assert.ok(r.h <= 12 + 1e-9 && r.w <= 11.6 + 1e-9);
  for (const a of [0.2, 0.7, 1, 2.5, 8]) for (const rot of ['auto', 'no', 'yes']) {
    const f = fit(a, rot, 10, 25, 0, 4), across = f.rotated ? f.h : f.w, along = f.rotated ? f.w : f.h;
    assert.ok(across <= 10 + 1e-9 && along <= 25 + 1e-9, a + '/' + rot);
  }
  const s = C.defaultState();
  assert.equal(s.spinePubRot, 'auto'); assert.equal(s.spineLogoRot, 'auto'); assert.equal(s.spinePubWidth, '');
  assert.equal(C.mergeState({ spinePubRot: 'schräg' }).spinePubRot, 'auto');
});

test('Aufgeräumt: keine GOG-Original-Symbole und kein Galaxy-Feld mehr, Unterlagen für Publisher-Logos', () => {
  const fs = require('node:fs'), path = require('node:path');
  const dir = path.join(__dirname, '..', 'cover-tool', 'assets', 'images', 'features');
  assert.deepEqual(fs.readdirSync(dir), ['line']);                                   // nur noch die SVG-Symbole
  const s = C.defaultState();
  assert.equal('galaxy' in s, false); assert.equal('iconStyle' in s, false);
  assert.equal(s.frontPubPlate, 'none'); assert.equal(s.spinePubPlate, 'white');
  assert.equal(C.mergeState({ frontPubPlate: 'black' }).frontPubPlate, 'black');
  assert.equal(C.mergeState({ frontPubPlate: 'rot', spinePubPlate: 'rot' }).spinePubPlate, 'white');
  assert.equal(C.mergeState({ galaxy: true }).galaxy, undefined);                    // alte Einstellung wird ignoriert
});

test('Im Bilderordner liegen keine Rastergrafiken', () => {
  const fs = require('node:fs'), path = require('node:path');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const bad = walk(path.join(__dirname, '..', 'cover-tool', 'assets', 'images')).filter((f) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(f));
  assert.deepEqual(bad, []);
});
