// Prüft Anbieter-Stile, Übernahme aus dem Rezept, Steam, SteamGridDB und Einstellungen des Cover-Tools.
// Die Dienste sind nachgebaut (page.route), es gibt keine echte Verbindung. Aufruf: npm run test:ui
const path = require('node:path');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { loadCore } = require('../helpers');

const url = 'file://' + path.resolve(__dirname, '..', '..', 'cover-tool', 'index.html');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

// ZIP wie aus dem Konfigurator (eine Datei gespeichert, eine komprimiert)
function makeZip(files) {
  const chunks = [], central = []; let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name), comp = f.deflate ? zlib.deflateRawSync(f.data) : f.data, method = f.deflate ? 8 : 0;
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(method, 8);
    h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(f.data.length, 22); h.writeUInt16LE(name.length, 26); chunks.push(h, name, comp);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(method, 10);
    c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(f.data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42); central.push(c, name);
    offset += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, cd, end]);
}

const STEAM_MIN = '<strong>Minimum:</strong><br><ul class="bb_ul"><li><strong>OS *:</strong> Windows 7 / 8 / 10 (64-bit)<br></li><li><strong>Processor:</strong> Intel Core 2 Duo E6600<br></li><li><strong>Memory:</strong> 2 GB RAM<br></li><li><strong>Graphics:</strong> NVIDIA GeForce 8800 GT<br></li><li><strong>DirectX:</strong> Version 9.0c<br></li><li><strong>Storage:</strong> 8 GB available space<br></li></ul>';
const STEAM_CP = '<ul><li><strong>OS *:</strong> 64-bit Windows 10<br></li><li><strong>Processor:</strong> Core i7-6700 or Ryzen 5 1600<br></li><li><strong>Memory:</strong> 12 GB RAM<br></li><li><strong>Graphics:</strong> GeForce GTX 1060 6GB or Radeon RX 580 8GB<br></li><li><strong>DirectX:</strong> Version 12<br></li><li><strong>Storage:</strong> 70 GB available space<br></li><li><strong>Additional Notes:</strong> SSD required. Attention: In this game you will encounter a variety of visual effects that might trigger photosensitivity<br></li></ul>';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

  // Nachgebaute Dienste: alles geht über https://proxy.test/?url=...
  const calls = [];
  await page.route('https://proxy.test/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const target = new URL(req.url()).searchParams.get('url'); calls.push({ target, auth: req.headers().authorization });
    const ok = (body) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (/storesearch/.test(target)) return ok({ items: [{ id: 70, name: 'Half-Life' }, { id: 71, name: 'Half-Life 2' }] });
    if (/appdetails\?l=english&appids=1091500/.test(target)) return ok({ 1091500: { success: true, data: { name: 'Cyberpunk 2077', pc_requirements: { minimum: STEAM_CP }, platforms: { windows: true, mac: false, linux: false }, categories: [{ id: 2 }, { id: 22 }, { id: 28 }] } } });
    if (/appdetails/.test(target)) return ok({ 70: { success: true, data: { name: 'Half-Life', publishers: ['Valve'], developers: ['Valve'], ratings: { usk: { rating: '12' } }, pc_requirements: { minimum: STEAM_MIN, recommended: '<ul><li><strong>Memory:</strong> 4 GB RAM<br></li></ul>' }, platforms: { windows: true, mac: false, linux: true }, categories: [{ id: 2 }, { id: 1 }, { id: 22 }, { id: 28 }] } } });
    if (/autocomplete/.test(target)) return ok({ success: true, data: [{ id: 5, name: 'Half-Life', verified: true, release_date: 910000000 }] });
    if (/\/grids\/game\/5/.test(target)) return ok({ success: true, data: [{ id: 11, url: 'https://cdn.test/full.png', thumb: 'https://cdn.test/thumb.png', width: 600, height: 900, language: 'de', score: 3 }] });
    if (/\/heroes\/game\/5/.test(target)) return ok({ success: true, data: [{ id: 12, url: 'https://cdn.test/full.png', thumb: 'https://cdn.test/thumb.png', width: 1920, height: 620 }] });
    return route.fulfill({ status: 404, headers: CORS, body: '{}' });
  });
  // Wikidata/Commons (Publisher-Logos) und Steam-Cover-CDN: direkt, ohne Proxy
  const wdCalls = [];
  await page.route('https://www.wikidata.org/**', (route) => {
    const u = new URL(route.request().url()), a = u.searchParams.get('action'); wdCalls.push(u.searchParams.get('search') || u.searchParams.get('ids'));
    const json = (body) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (a === 'wbsearchentities') return json({ search: [{ id: 'Q1', label: 'Valve', description: 'video game company' }, { id: 'Q2', label: 'Valve (Ventil)', description: 'Bauteil' }] });
    return json({ entities: { Q1: { claims: { P154: [{ mainsnak: { datavalue: { value: 'Valve logo.svg' } } }, { mainsnak: { datavalue: { value: 'Valve old.png' } } }] } }, Q2: { claims: {} } } });
  });
  const bfCalls = [];
  await page.route('https://api.brandfetch.io/**', (route) => { bfCalls.push(route.request().url()); return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify([{ brandId: 'b1', name: 'Team Cherry', domain: 'teamcherry.com.au', icon: 'https://asset.brandfetch.test/cherry.png' }]) }); });
  await page.route('https://asset.brandfetch.test/**', (route) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body: PNG }));
  const cdnCalls = [];
  // Commons: Special:FilePath hat kein CORS (nur als <img> nutzbar), die Bilddatei kommt über die API von upload.wikimedia.org
  await page.route('https://commons.wikimedia.org/w/api.php**', (route) => { cdnCalls.push(route.request().url()); return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ query: { pages: { 1: { imageinfo: [{ thumburl: 'https://upload.wikimedia.org/thumb/800px-Valve_logo.svg.png' }] } } } }) }); });
  await page.route('https://commons.wikimedia.org/wiki/**', (route) => route.fulfill({ status: 200, headers: { 'content-type': 'image/png' }, body: PNG }));   // ohne CORS-Header
  await page.route(/https:\/\/(upload\.wikimedia\.org|cdn\.akamai\.steamstatic\.com)\/.*/, (route) => { cdnCalls.push(route.request().url()); return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body: PNG }); });
  await page.route('https://cdn.test/**', (route) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body: PNG }));

  await page.addInitScript(() => { delete window.showSaveFilePicker; });      // immer der normale Download (die Dateiauswahl lässt sich nicht automatisch bedienen)
  page.on('dialog', (d) => d.accept());
  const openMenu = (name) => page.click('.menu summary:has-text("' + name + '")');
  const download = async (action) => { const [dl] = await Promise.all([page.waitForEvent('download'), action()]); return { name: dl.suggestedFilename(), buffer: fs.readFileSync(await dl.path()) }; };
  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.selectOption('[data-k=theme]', 'classic');

  // ---- Obere Leiste: alles, was nicht das Cover einstellt, steht dort und nicht im Formular ----
  assert.equal(await page.locator('header.top #bSettings').isVisible(), true);
  assert.equal(await page.locator('header.top #bReset').isVisible(), true);
  assert.equal(await page.locator('header.top #bPrint').isVisible(), true);
  assert.equal(await page.locator('#form #bSettings, #form #bRecipe, #form #bSteam').count(), 0, 'Das Formular enthält nur Einstellungen des Covers');
  assert.doesNotMatch(await page.locator('#form').innerText(), /Daten übernehmen|Einstellungen für SteamGridDB/);
  assert.equal(await page.locator('#bRecipe').isVisible(), false, 'Das Menü ist zu');
  await openMenu('Daten übernehmen');
  assert.equal(await page.locator('#bRecipe').isVisible(), true);
  await page.click('body', { position: { x: 5, y: 400 } });                 // Klick daneben schließt das Menü
  assert.equal(await page.locator('#bRecipe').isVisible(), false);
  await openMenu('Projekt'); assert.equal(await page.locator('#bProjExport').isVisible(), true);
  await page.keyboard.press('Escape'); assert.equal(await page.locator('#bProjExport').isVisible(), false);

  // ---- Anbieter-Stile ----
  const css = (sel, prop) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s)).getPropertyValue(p).trim(), [sel, prop]);
  assert.equal(await css('#cover', '--brand'), '#89268d');
  assert.equal(await page.locator('#cornerWm').isVisible(), false);
  await page.selectOption('[data-k=provider]', 'epic');
  await page.waitForFunction(() => document.querySelector('#cover').classList.contains('has-wm'));
  assert.equal(await css('#cover', '--brand'), '#2d2d33');
  assert.equal(await page.locator('#cornerWm').textContent(), 'EPIC GAMES');
  // Epic-Logo in der Ecke (klassisch) und auf dem Rücken, geladen und sichtbar; die Leiste gibt es nur im Stil "Leiste"
  assert.equal(await page.locator('.gog-corner img').isVisible(), true);
  assert.equal(await page.locator('.gog-bar').isVisible(), false);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.brand-logo')].map((i) => [i.getAttribute('src'), i.naturalWidth > 0])), [['assets/images/epic_logo.svg', true], ['assets/images/epic_logo.svg', true], ['assets/images/epic_logo.svg', true]]);
  assert.equal(await page.locator('#spineLogo').isVisible(), true);
  assert.match(await page.locator('#featNote').textContent(), /Epic Games Launcher/);
  assert.equal(await page.locator('#galaxyChk').isDisabled(), true, 'Das Galaxy-Feld gibt es nur bei GOG');
  assert.equal(await page.locator('#galaxy').evaluate((e) => getComputedStyle(e).visibility), 'hidden');
  await page.selectOption('[data-k=provider]', 'steam');
  await page.waitForFunction(() => document.querySelector('#cornerWm').textContent === 'STEAM');
  assert.equal(await css('#cover', '--brand'), '#23394c');
  assert.equal(await page.locator('.gog-corner img').getAttribute('src'), 'assets/images/steam_logo.svg');
  assert.equal(await page.locator('.gog-corner img').evaluate((i) => i.naturalWidth > 0), true);
  await page.selectOption('[data-k=theme]', 'bar');
  await page.waitForFunction(() => document.querySelector('#cover').classList.contains('theme-bar'));
  assert.equal(await page.locator('#barWm').innerText(), 'STEAM');
  assert.equal(await page.locator('.gog-bar img').getAttribute('src'), 'assets/images/steam_logo.svg', 'Im Streifen steht das Steam-Logo');
  assert.equal(await page.locator('.gog-bar img').isVisible(), true);
  assert.equal(await page.locator('#spineLogo').isVisible(), true);
  assert.equal(await page.locator('#frontTag').textContent(), 'PC');
  await page.selectOption('[data-k=theme]', 'classic');
  await page.selectOption('[data-k=provider]', 'gog');
  await page.waitForFunction(() => !document.querySelector('#cover').classList.contains('has-wm'));
  assert.equal(await page.locator('#galaxyChk').isDisabled(), false);
  assert.equal(await page.locator('#frontTag').textContent(), 'PC · DRM-FREI');
  assert.match(await page.locator('#featNote').textContent(), /GOG Galaxy/);

  // ---- Aus Rezept übernehmen (ZIP) ----
  const menu = { schemaVersion: 1, title: 'Sammlung', games: [
    { index: 0, name: 'Spiel Eins', provider: 'gog', installer: 'a.exe', cover: 'assets/covers/eins.png', estimatedSizeMB: 1500 },
    { index: 1, name: 'Spiel Zwei', provider: 'epic', installer: 'b.exe', cover: 'assets/covers/zwei.png', estimatedSizeMB: 800 } ] };
  const zip = makeZip([{ name: 'menu.json', data: Buffer.from(JSON.stringify(menu)), deflate: true }, { name: 'assets/covers/eins.png', data: PNG }, { name: 'assets/covers/zwei.png', data: PNG }]);
  await page.setInputFiles('#recipeFile', { name: 'rezept.zip', mimeType: 'application/zip', buffer: zip });
  await page.locator('#dlg .dlist button', { hasText: 'Spiel Zwei · Epic Games · mit Cover' }).click();
  await page.waitForFunction(() => document.querySelector('[data-img=front]').classList.contains('has'));
  assert.equal(await page.inputValue('[data-k=title]'), 'Spiel Zwei');
  assert.equal(await page.inputValue('[data-k=provider]'), 'epic');
  assert.equal(await page.inputValue('input[type=text][data-k=space]'), '0.8');
  assert.equal(await page.locator('#spineTitle').textContent(), 'Spiel Zwei');
  assert.equal(await page.locator('#dlg').evaluate((d) => d.open), false, 'Der Dialog schließt sich');
  // menu.json allein: Titel und Anbieter, kein Cover
  await page.setInputFiles('#recipeFile', { name: 'menu.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(menu)) });
  await page.locator('#dlg .dlist button', { hasText: 'Spiel Eins' }).click();
  await page.waitForFunction(() => document.querySelector('[data-k=provider]').value === 'gog');
  assert.equal(await page.inputValue('[data-k=title]'), 'Spiel Eins');
  // kaputte Datei: verständliche Meldung
  await page.setInputFiles('#recipeFile', { name: 'kaputt.zip', mimeType: 'application/zip', buffer: Buffer.from('keine zip') });
  assert.match(await page.locator('#dlg .dmsg.err').textContent(), /konnte nicht gelesen werden/);
  await page.click('#dlgX');

  // ---- Einstellungen (gemeinsam mit dem Konfigurator) ----
  await page.click('#bSettings');
  await page.fill('#dlg input[placeholder*="API-Schlüssel"]', 'TESTKEY');
  await page.fill('#dlg input[placeholder*="proxy"]', 'https://proxy.test/?url={url}');
  await page.click('#dlg button:has-text("Speichern")');
  assert.match(await page.locator('#dlg .dmsg', { hasText: 'Einstellungen gespeichert' }).first().textContent(), /gespeichert/);
  assert.equal(await page.evaluate(() => localStorage.getItem('sgdb-key')), 'TESTKEY');
  assert.equal(await page.evaluate(() => localStorage.getItem('sgdb-proxy')), 'https://proxy.test/?url={url}');
  await page.click('#dlgX');

  // ---- Anforderungen von Steam ----
  if (await page.locator('[data-img=front]').evaluate((e) => e.classList.contains('has'))) await page.click('[data-img=front] .x');
  await page.fill('[data-k=title]', 'Alter Titel');
  await openMenu('Daten übernehmen'); await page.click('#bSteam');
  await page.locator('#dlg .dlist button', { hasText: /^Half-Life\s+\(App 70\)$/ }).click();
  await page.waitForSelector('#dlg .shown');
  const shown = await page.locator('#dlg .shown').innerText();
  assert.match(shown, /Windows \(7, 8, 10\) \/ Linux/); assert.match(shown, /NVIDIA GeForce 8800 GT/); assert.match(shown, /Version 9\.0c/);
  // Beide Spalten auf einmal: Minimum 2 GB, Empfohlen 4 GB
  assert.match(await page.locator('#dlg .shown').innerText(), /Minimum[\s\S]*Empfohlen/);
  assert.match(await page.locator('#dlg .shown tr', { hasText: 'Arbeitsspeicher' }).innerText(), /2 GB RAM[\s\S]*4 GB RAM/);
  assert.match(shown, /USK-Freigabe[\s\S]*ab 12 Jahren/);
  assert.match(shown, /Spieletitel[\s\S]*Half-Life/); assert.match(shown, /Publisher \/ Entwickler[\s\S]*Valve/);
  assert.equal(await page.locator('#dlg input[type=checkbox]').first().isChecked(), true, 'Steam-Cover ist ohne vorhandenes Frontcover vorgewählt');
  await page.click('#dlg button:has-text("Übernehmen")');
  await page.waitForFunction(() => document.querySelector('[data-k="cpu.intel.on"]').checked && document.querySelector('[data-k=title]').value === 'Half-Life');
  // Titel (Rücken) und Cover kommen von Steam
  assert.equal(await page.inputValue('[data-k=title]'), 'Half-Life');
  await page.waitForFunction(() => document.querySelector('#spineTitle').textContent === 'Half-Life');
  await page.waitForFunction(() => document.querySelector('[data-img=front]').classList.contains('has'));
  assert.ok(cdnCalls.some((u) => /steam\/apps\/70\/library_600x900_2x\.jpg/.test(u)), 'Steam-Cover (Hochformat) wurde geladen');
  await page.waitForFunction(() => document.querySelector('[data-img=spineLogo]').classList.contains('has'));
  assert.ok(cdnCalls.some((u) => /steam\/apps\/70\/logo\.png/.test(u)), 'Spiel-Logo für den Rücken wurde geladen');
  assert.equal(await page.locator('#spineLogoImg').isVisible(), true, 'Rücken zeigt das Logo statt des Titels');
  assert.deepEqual(await page.evaluate(() => [CoverApp.state.publisher, CoverApp.state.developer]), ['Valve', 'Valve']);
  await page.waitForFunction(() => document.querySelector('#frontUsk').getAttribute('src') === 'assets/images/usk/usk_12.png');      // Altersfreigabe von Steam
  assert.equal(await page.inputValue('[data-k=usk]'), '12');
  // Prozessor in der Kategorie Intel mit Modell (AMD bleibt aus), die alte Grafikkarte bleibt Text
  assert.equal(await page.locator('[data-k="cpu.amd.on"]').isChecked(), false);
  assert.equal(await page.inputValue('[data-k="cpu.intel.pre"]'), 'Core 2 Duo'); assert.equal(await page.inputValue('[data-k="cpu.intel.num"]'), 'E6600');
  assert.equal(await page.inputValue('[data-k="cpu.custom"]'), '');
  assert.equal(await page.inputValue('[data-k="gpu.custom"]'), 'NVIDIA GeForce 8800 GT');
  assert.equal(await page.inputValue('input[type=text][data-k=ram]'), '2');
  assert.equal(await page.inputValue('[data-k=dx]'), 'Version 9.0c');
  assert.equal(await page.locator('[data-k=features][value=achievements]').isChecked(), true);
  assert.equal(await page.locator('[data-k=features][value=cloud_saves]').isChecked(), false);
  assert.equal(await page.locator('[data-k="os.linux"]').isChecked(), true);
  assert.equal(await page.locator('[data-k="os.win"][value="7"]').isChecked(), true);
  await page.waitForTimeout(100);
  assert.match(await page.locator('#specs').innerText(), /Intel Core 2 Duo E6600[\s\S]*2 GB RAM/);
  // Mindest- und empfohlene Angaben stehen beide auf der Hülle
  assert.equal(await page.locator('[data-k="rec.on"]').isChecked(), true);
  assert.equal(await page.inputValue('input[type=text][data-k="rec.ram"]'), '4');
  assert.equal(await page.locator('#specs.dual').count(), 1);
  const ramRow = await page.locator('#specs li', { hasText: /^RAM/ }).innerText();
  assert.match(ramRow, /2 GB RAM[\s\S]*4 GB RAM/);
  assert.match(await page.locator('#specs li.head').innerText(), /MINIMUM[\s\S]*EMPFOHLEN/);

  // ---- SteamGridDB: Frontcover und Rückseite ----
  await page.click('[data-img=front] .sg');
  await page.waitForSelector('#dlg .dlist button');
  await page.locator('#dlg .dlist button', { hasText: 'Half-Life' }).click();
  await page.waitForSelector('#dlg .gal button');
  assert.match(await page.locator('#dlg .gal small').first().textContent(), /600×900 · de/);
  await page.locator('#dlg .gal button').first().click();
  await page.click('#dlg button:has-text("Als Frontcover übernehmen")');
  await page.waitForFunction(() => document.querySelector('[data-img=front]').classList.contains('has'));
  assert.ok(calls.some((c) => /grids\/game\/5/.test(c.target) && /dimensions=600x900/.test(c.target)), 'Frontcover sucht Hochformat');
  assert.ok(calls.filter((c) => /steamgriddb/.test(c.target)).every((c) => c.auth === 'Bearer TESTKEY'));
  await page.click('[data-img=backTop] .sg');
  await page.locator('#dlg .dlist button', { hasText: 'Half-Life' }).click();
  await page.waitForSelector('#dlg .gal button');
  assert.ok(calls.some((c) => /heroes\/game\/5/.test(c.target)), 'Rückseite sucht Hintergründe');
  await page.click('#dlgX');

  // ---- Publisher-Logo: Suche über Wikidata, Vorgabe aus dem Steam-Import, kein SteamGridDB-Schlüssel nötig ----
  await page.evaluate(() => localStorage.removeItem('sgdb-key'));
  await page.click('[data-img=publisher] .sg');
  assert.match(await page.locator('#dlgTitle').textContent(), /Publisher-Logo/);
  assert.equal(await page.inputValue('#dlg input[type=text]'), 'Valve');
  await page.waitForSelector('#dlg .gal button');
  assert.equal(await page.locator('#dlg .gal button').count(), 2, 'Nur Firmen mit Logo, beide Logos von Valve');
  assert.ok(wdCalls.includes('Valve'));
  assert.equal(await page.locator('#dlg button:has-text("Als Publisher-Logo übernehmen")').isDisabled(), true);
  await page.locator('#dlg .gal button').first().click();
  await page.click('#dlg button:has-text("Als Publisher-Logo übernehmen")');
  await page.waitForFunction(() => document.querySelector('[data-img=publisher]').classList.contains('has'));
  assert.ok(cdnCalls.some((u) => /upload\.wikimedia\.org\/thumb\/800px-Valve_logo/.test(u)) && cdnCalls.some((u) => /w\/api\.php.*titles=File%3AValve%20logo\.svg/.test(u)), 'Logo wurde über die Commons-API von upload.wikimedia.org geladen');
  assert.ok(!calls.some((c) => /steamgriddb/.test(c.target) && /logos/.test(c.target)), 'Kein SteamGridDB für Publisher-Logos');

  // ---- Zweite Quelle: Brandfetch (Indie-Studios), Client-ID in den Einstellungen ----
  await page.click('[data-img=publisher] .x');
  await page.click('[data-img=publisher] .sg');
  await page.selectOption('#dlg select', 'brandfetch');
  assert.match(await page.locator('#dlg .dmsg.err').textContent(), /Client-ID/, 'ohne ID ein Hinweis');
  await page.click('#dlgX');
  await page.click('#bSettings');
  await page.fill('#dlg input[placeholder*="Brandfetch"]', 'BFID');
  await page.click('#dlg button:has-text("Speichern")');
  assert.equal(await page.evaluate(() => localStorage.getItem('brandfetch-id')), 'BFID');
  await page.click('#dlgX');
  await page.click('[data-img=publisher] .sg');
  await page.selectOption('#dlg select', 'brandfetch');
  await page.waitForFunction(() => /Team Cherry/.test((document.querySelector('#dlg .gal small') || {}).textContent || ''));
  assert.match(await page.locator('#dlg .gal small').first().textContent(), /Team Cherry · teamcherry\.com\.au/);
  assert.ok(bfCalls.some((u) => /v2\/search\/Valve\?c=BFID/.test(u)), 'Suche mit der gespeicherten Client-ID');
  await page.locator('#dlg .gal button').first().click();
  await page.click('#dlg button:has-text("Als Publisher-Logo übernehmen")');
  await page.waitForFunction(() => document.querySelector('[data-img=publisher]').classList.contains('has'));

  // ---- Einstellungen sichern und einlesen: Datei, mit und ohne Passwort, kompatibel mit dem Konfigurator ----
  await page.evaluate(() => { localStorage.setItem('sgdb-key', 'KEY2'); localStorage.setItem('sgdb-proxy', 'https://proxy.test/?url={url}'); });
  await page.click('#bSettings');
  const pwField = '#dlg input[placeholder="Passwort (optional)"]', keyField = '#dlg input[placeholder="API-Schlüssel"]';
  assert.equal(await page.inputValue(keyField), 'KEY2');
  assert.equal(await page.locator(keyField).getAttribute('type'), 'password', 'Der Schlüssel wird nicht im Klartext angezeigt');
  let file = await download(() => page.click('#dlg button:has-text("In Datei sichern")'));
  assert.equal(file.name, 'discmenu-einstellungen.json');
  assert.match(file.buffer.toString(), /"sgdbKey": "KEY2"/);
  await page.fill(pwField, 'geheim');
  file = await download(() => page.click('#dlg button:has-text("In Datei sichern")'));
  assert.ok(!file.buffer.toString().includes('KEY2') && /"encrypted": true/.test(file.buffer.toString()), 'Mit Passwort ist die Datei verschlüsselt');
  await page.click('#dlg button:has-text("Löschen")');
  assert.equal(await page.evaluate(() => localStorage.getItem('sgdb-key')), null);
  const load = (buffer) => page.setInputFiles('#dlg input[type=file]', { name: 'einstellungen.json', mimeType: 'application/json', buffer });
  await page.fill(pwField, ''); await load(file.buffer);
  await page.waitForFunction(() => /verschlüsselt. Bitte das Passwort/.test(document.querySelector('#dlg').textContent));
  await page.fill(pwField, 'falsch'); await load(file.buffer);
  await page.waitForFunction(() => /Falsches Passwort/.test(document.querySelector('#dlg').textContent));
  await page.fill(pwField, 'geheim'); await load(file.buffer);
  await page.waitForFunction(() => /eingelesen und gespeichert/.test(document.querySelector('#dlg').textContent));
  assert.equal(await page.evaluate(() => localStorage.getItem('sgdb-key')), 'KEY2');
  assert.equal(await page.inputValue(keyField), 'KEY2');
  // Datei, die der Konfigurator gesichert hat (anderer Code, gleiches Format)
  const K = loadCore();
  await page.fill(pwField, '');
  await load(Buffer.from(await K.packSettings({ key: 'FROMCONF', proxy: 'https://c.example/?url={url}' }, '')));
  await page.waitForFunction(() => localStorage.getItem('sgdb-key') === 'FROMCONF');
  await load(Buffer.from(await K.packSettings({ key: 'ENC', proxy: 'https://c.example/?url={url}' }, 'pw1')));
  await page.fill(pwField, 'pw1'); await load(Buffer.from(await K.packSettings({ key: 'ENC', proxy: 'https://c.example/?url={url}' }, 'pw1')));
  await page.waitForFunction(() => localStorage.getItem('sgdb-key') === 'ENC');
  // Proxy ohne Platzhalter wird abgelehnt, keine Einstellungsdatei ebenso
  await page.fill('#dlg input[placeholder*="proxy"]', 'https://ohne-platzhalter.example/');
  await page.click('#dlg button:has-text("Speichern")');
  assert.match(await page.locator('#dlg .dmsg.err').first().textContent(), /Platzhalter \{url\}/);
  await page.fill(pwField, ''); await load(Buffer.from('{"type":"etwas-anderes"}'));
  await page.waitForFunction(() => /keine Einstellungsdatei/.test(document.querySelector('#dlg').textContent));
  await page.fill('#dlg input[placeholder*="proxy"]', 'https://proxy.test/?url={url}'); await page.click('#dlg button:has-text("Speichern")');

  // Verbindungstest: beide Dienste einzeln
  await page.click('#dlg button:has-text("Verbindung testen")');
  await page.waitForFunction(() => /Alle Verbindungen in Ordnung/.test(document.querySelector('#dlg').textContent));
  assert.match(await page.locator('#dlg').innerText(), /✓ Steam-Shop[\s\S]*✓ SteamGridDB/);
  const blocked = (route) => route.fulfill({ status: 403, headers: CORS, body: 'Dieser Host ist nicht erlaubt.' });
  await page.route('https://proxy.test/**', blocked);
  await page.click('#dlg button:has-text("Verbindung testen")');
  await page.waitForFunction(() => /✗ Steam-Shop/.test(document.querySelector('#dlg').textContent));
  assert.match(await page.locator('#dlg').innerText(), /Worker-Code ist wahrscheinlich veraltet/);
  await page.click('#dlgX');

  // Steam: Fehler des Proxys werden erklärt, die Steam-Adresse umgeht die Suche
  await page.fill('[data-k=title]', 'Half-Life');
  await openMenu('Daten übernehmen'); await page.click('#bSteam');
  await page.waitForFunction(() => /Worker-Code ist wahrscheinlich veraltet/.test(document.querySelector('#dlg').textContent));
  await page.unroute('https://proxy.test/**', blocked);
  await page.fill('#dlg input[type=text]', 'https://store.steampowered.com/app/70/Half-Life/');
  await page.press('#dlg input[type=text]', 'Enter');
  await page.waitForSelector('#dlg .shown');
  assert.match(await page.locator('#dlg .shown').innerText(), /Version 9\.0c/);
  assert.ok(calls.some((c) => /appdetails\?l=english&appids=70/.test(c.target)), 'Die Adresse führt direkt zu App 70');
  await page.click('#dlg button:has-text("Abbrechen")');

  // ---- Steam: Prozessor und Grafikkarte in die Kategorien (Beispiel aus der Praxis: Cyberpunk 2077) ----
  await openMenu('Daten übernehmen'); await page.click('#bSteam');
  await page.fill('#dlg input[type=text]', '1091500'); await page.press('#dlg input[type=text]', 'Enter');
  await page.waitForSelector('#dlg .shown');
  const cpRows = await page.locator('#dlg .shown tr').allInnerTexts();
  assert.ok(cpRows.some((r) => /Prozessor\s+Intel Core i7-6700 \/ AMD Ryzen 5 1600\s+in Kategorien/.test(r)), cpRows.join(' | '));
  assert.ok(cpRows.some((r) => /Grafik\s+NVIDIA GeForce GTX 1060 6GB \/ AMD Radeon RX 580 8GB\s+in Kategorien/.test(r)), cpRows.join(' | '));
  await page.click('#dlg button:has-text("Übernehmen")');
  await page.waitForFunction(() => document.querySelector('[data-k="gpu.nvidia.on"]').checked);
  assert.equal(await page.inputValue('[data-k="cpu.intel.pre"]'), 'Core i7'); assert.equal(await page.inputValue('[data-k="cpu.intel.num"]'), '6700');
  assert.equal(await page.inputValue('[data-k="cpu.amd.pre"]'), 'Ryzen 5'); assert.equal(await page.inputValue('[data-k="cpu.amd.num"]'), '1600');
  assert.equal(await page.inputValue('[data-k="cpu.custom"]'), '', 'Ein früherer eigener Text wird ersetzt');
  assert.equal(await page.inputValue('[data-k="gpu.nvidia.pre"]'), 'GTX'); assert.equal(await page.inputValue('[data-k="gpu.nvidia.num"]'), '1060');
  assert.equal(await page.inputValue('[data-k="gpu.amd.pre"]'), 'RX'); assert.equal(await page.inputValue('[data-k="gpu.amd.num"]'), '580');
  await page.waitForTimeout(150);
  assert.match(await page.locator('#specs').innerText(), /Intel Core i7-6700[\s\S]*AMD Ryzen 5 1600[\s\S]*NVIDIA GeForce GTX 1060 6GB[\s\S]*AMD Radeon RX 580 8GB/);
  // Die lange Zusatzangabe passt in das Feld: Die Liste endet innerhalb der Rückseite
  assert.ok(await page.evaluate(() => { const p = document.querySelector('.panel-back').getBoundingClientRect(), s = document.querySelector('#specs').getBoundingClientRect(); return s.bottom <= p.bottom && s.top >= p.top; }), 'Angaben ragen aus dem Feld');

  // ---- Projekt exportieren und importieren ----
  const giveImage = (key, w, h, type) => page.evaluate(async ({ key, w, h, type }) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d'); ctx.fillStyle = '#e0498a'; ctx.fillRect(0, 0, w, h);
    const blob = await new Promise((r) => cv.toBlob(r, type)); const dt = new DataTransfer(); dt.items.add(new File([blob], key + '.png', { type }));
    const input = document.querySelector('[data-img=' + key + '] input[type=file]'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { key, w, h, type });
  await page.fill('[data-k=title]', 'Größen-Test'); await page.selectOption('[data-k=provider]', 'steam'); await page.selectOption('[data-k=theme]', 'bar');
  await page.check('[data-k=caseType][value=custom]'); await page.fill('[data-k="custom.back"]', '120'); await page.check('[data-k=features][value=mods]');
  await giveImage('publisher', 400, 200, 'image/png');
  await page.waitForFunction(() => document.querySelector('[data-img=publisher]').classList.contains('has'));
  await page.waitForTimeout(150);
  await openMenu('Projekt');
  const proj = await download(() => page.click('#bProjExport'));
  assert.equal(proj.name, 'groessen-test-cover.zip');
  const CF = require('../../cover-tool/files.js'), CZ = require('../../cover-tool/zip.js');
  const inside = CF.unpackProject(await CZ.read(new Uint8Array(proj.buffer)));
  assert.equal(inside.state.title, 'Größen-Test'); assert.equal(inside.state.provider, 'steam');
  assert.ok(inside.images.front && inside.images.publisher, 'Bilder sind in der Projektdatei');      // Frontcover kam aus dem SteamGridDB-Test
  assert.match(await page.locator('#saveInfo').textContent(), /heruntergeladen: groessen-test-cover\.zip/);
  // Zurücksetzen löscht alles, der Import bringt es zurück
  await page.click('#bReset');
  await page.waitForFunction(() => document.querySelector('[data-k=title]').value === '');
  assert.equal(await page.locator('[data-img=publisher]').getAttribute('class'), 'drop');
  await page.setInputFiles('#projectFile', { name: proj.name, mimeType: 'application/zip', buffer: proj.buffer });
  await page.waitForFunction(() => /Projekt geöffnet/.test(document.querySelector('#dlg').textContent));
  assert.equal(await page.inputValue('[data-k=title]'), 'Größen-Test');
  assert.equal(await page.inputValue('[data-k=provider]'), 'steam');
  assert.equal(await page.inputValue('[data-k=theme]'), 'bar');
  assert.equal(await page.locator('[data-k=caseType][value=custom]').isChecked(), true);
  assert.equal(await page.inputValue('[data-k="custom.back"]'), '120');
  assert.equal(await page.locator('[data-k=features][value=mods]').isChecked(), true);
  assert.match(await page.locator('[data-img=publisher]').getAttribute('class'), /has/);
  assert.match(await page.locator('[data-img=front]').getAttribute('class'), /has/);
  assert.equal(await page.locator('#cover').evaluate((e) => e.classList.contains('has-wm') && e.classList.contains('theme-bar')), true);
  assert.equal(await page.locator('#spineTitle').textContent(), 'Größen-Test');
  assert.ok(await page.evaluate(() => /^blob:/.test(document.querySelector('#frontPub').src)), 'Publisher-Logo ist wieder da');
  await page.click('#dlg button:has-text("Schließen")');
  // falsche Dateien: verständliche Meldung, nichts geht kaputt
  await page.setInputFiles('#projectFile', { name: 'x.zip', mimeType: 'application/zip', buffer: Buffer.from('keine zip') });
  await page.waitForFunction(() => /konnte nicht geladen werden/.test(document.querySelector('#dlg').textContent));
  await page.click('#dlg button:has-text("Schließen")');
  await page.setInputFiles('#projectFile', { name: 'rezept.zip', mimeType: 'application/zip', buffer: zip });
  await page.waitForFunction(() => /fehlt die cover\.json/.test(document.querySelector('#dlg').textContent));
  await page.click('#dlg button:has-text("Schließen")');
  assert.equal(await page.inputValue('[data-k=title]'), 'Größen-Test', 'Fehlgeschlagene Importe ändern nichts');

  assert.deepEqual(errors, []);
  await browser.close();
  console.log('Cover-Tool-Online-Test bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
