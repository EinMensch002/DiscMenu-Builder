// Erzeugt mit der Web-App (app/project.js) eine Projektdatei mit recipe.json für den Test im Go-Teil: node tests/project-fixture.js <ziel.zip>
const fs = require('node:fs');
const M = require('../app/menu-core.js');
const P = require('../app/project.js');
const C = require('../app/core.js');

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const s = M.newState(); s.title = 'Projekt aus der Web-App';
Object.assign(s.games[0], { name: 'Größen-Spiel', provider: 'gog', installer: 'Spiel1/setup.exe', estimatedSizeMB: '1500', cover: 'a1', description: 'Umlaute: äöüß' });
const e = M.newGame(); Object.assign(e, { name: 'Epic-Spiel', provider: 'epic', installer: 'E/setup.exe' }); s.games.push(e);
const cover = C.defaultState(); Object.assign(cover, { title: 'Größen-Spiel', provider: 'gog', publisher: 'Studio' });
const zip = P.pack({ menuState: s, menuAssets: new Map([['a1', { data: png, ext: 'png' }]]), coverState: cover,
  coverImages: { front: { data: png, type: 'image/jpeg', name: 'front.jpg' } }, fonts: [], link: { game: 0 } });
fs.writeFileSync(process.argv[2], zip);
