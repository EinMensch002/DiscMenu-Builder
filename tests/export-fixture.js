// Erzeugt mit dem Konfigurator-Kern ein Rezept (ZIP) für den Test im Go-Teil: node tests/export-fixture.js <ziel.zip>
const fs = require('node:fs');
const { loadCore } = require('./helpers');
const C = loadCore();

const s = C.newState();
s.title = 'Export aus dem Konfigurator'; s.output = 'Test-Menue.exe';
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const assets = new Map([['a1', { data: png, ext: 'png' }], ['a2', { data: png, ext: 'png' }], ['s1', { data: new Uint8Array([1, 2, 3]), ext: 'wav' }]]);
s.background = 'a2'; s.sounds.click = 's1';
const g = s.games[0];
Object.assign(g, { name: 'Größen-Spiel', installer: 'Spiel1\\setup.exe', args: '/LANG=german "/X=a b"', estimatedSizeMB: '1500', cover: 'a1', description: 'Umlaute: äöüß' });
const p = C.newItem(); Object.assign(p, { name: 'Patch', group: 'Sprache', path: 'Spiel1/p.exe', args: '/S' }); g.patches.push(p);
const o = C.newItem(); Object.assign(o, { name: 'Link', kind: 'open', path: 'https://example.com' }); g.extras.push(o);
const e = C.newGame(); Object.assign(e, { name: 'Epic-Spiel', provider: 'epic', installer: 'E/setup.exe' }); s.games.push(e);
const t = C.newGame(); Object.assign(t, { name: 'Steam-Spiel', provider: 'steam', installer: 'S/setup.exe' }); s.games.push(t);

const { menu, files } = C.buildMenu(s, assets);
const zip = C.buildZip([{ name: 'menu.json', data: new TextEncoder().encode(JSON.stringify(menu, null, 2) + '\n') }, ...files]);
fs.writeFileSync(process.argv[2], zip);
