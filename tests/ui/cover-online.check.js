// Prüft Anbieter-Stile, Übernahme aus dem Rezept, Steam, SteamGridDB und Einstellungen des Cover-Tools.
// Die Dienste sind nachgebaut (page.route), es gibt keine echte Verbindung. Aufruf: npm run test:ui
const path = require('node:path');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

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
    if (/appdetails/.test(target)) return ok({ 70: { success: true, data: { name: 'Half-Life', pc_requirements: { minimum: STEAM_MIN, recommended: '<ul><li><strong>Memory:</strong> 4 GB RAM<br></li></ul>' }, platforms: { windows: true, mac: false, linux: true }, categories: [{ id: 2 }, { id: 1 }, { id: 22 }, { id: 28 }] } } });
    if (/autocomplete/.test(target)) return ok({ success: true, data: [{ id: 5, name: 'Half-Life', verified: true, release_date: 910000000 }] });
    if (/\/grids\/game\/5/.test(target)) return ok({ success: true, data: [{ id: 11, url: 'https://cdn.test/full.png', thumb: 'https://cdn.test/thumb.png', width: 600, height: 900, language: 'de', score: 3 }] });
    if (/\/heroes\/game\/5/.test(target)) return ok({ success: true, data: [{ id: 12, url: 'https://cdn.test/full.png', thumb: 'https://cdn.test/thumb.png', width: 1920, height: 620 }] });
    return route.fulfill({ status: 404, headers: CORS, body: '{}' });
  });
  await page.route('https://cdn.test/**', (route) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body: PNG }));

  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload();

  // ---- Anbieter-Stile ----
  const css = (sel, prop) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s)).getPropertyValue(p).trim(), [sel, prop]);
  assert.equal(await css('#cover', '--brand'), '#89268d');
  assert.equal(await page.locator('#cornerWm').isVisible(), false);
  await page.selectOption('[data-k=provider]', 'epic');
  await page.waitForFunction(() => document.querySelector('#cover').classList.contains('has-wm'));
  assert.equal(await css('#cover', '--brand'), '#2d2d33');
  assert.equal(await page.locator('#cornerWm').textContent(), 'EPIC GAMES');
  assert.equal(await page.locator('.gog-corner img').isVisible(), false);
  assert.match(await page.locator('#featNote').textContent(), /Epic Games Launcher/);
  assert.equal(await page.locator('#galaxyChk').isDisabled(), true, 'Das Galaxy-Feld gibt es nur bei GOG');
  assert.equal(await page.locator('#galaxy').evaluate((e) => getComputedStyle(e).visibility), 'hidden');
  await page.selectOption('[data-k=provider]', 'steam');
  await page.waitForFunction(() => document.querySelector('#cornerWm').textContent === 'STEAM');
  assert.equal(await css('#cover', '--brand'), '#1b3a57');
  await page.selectOption('[data-k=theme]', 'modern');
  await page.waitForFunction(() => document.querySelector('#cover').classList.contains('theme-modern'));
  assert.equal(await page.locator('#barWm').innerText(), 'STEAM');
  assert.equal(await page.locator('.gog-bar img').isVisible(), false, 'Bei Steam steht kein GOG-Logo im Streifen');
  assert.equal(await page.locator('#spineLogo').isVisible(), false);
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
  assert.equal(await page.evaluate(() => localStorage.getItem('sgdb-key')), 'TESTKEY');
  assert.equal(await page.evaluate(() => localStorage.getItem('sgdb-proxy')), 'https://proxy.test/?url={url}');
  await page.click('#dlgX');

  // ---- Anforderungen von Steam ----
  await page.fill('[data-k=title]', 'Half-Life');
  await page.click('#bSteam');
  await page.locator('#dlg .dlist button', { hasText: /^Half-Life$/ }).click();
  await page.waitForSelector('#dlg .shown');
  const shown = await page.locator('#dlg .shown').innerText();
  assert.match(shown, /Windows \(7, 8, 10\) \/ Linux/); assert.match(shown, /NVIDIA GeForce 8800 GT/); assert.match(shown, /Version 9\.0c/);
  await page.selectOption('#dlg select', 'recommended');
  assert.match(await page.locator('#dlg .shown').innerText(), /4 GB RAM/);
  await page.selectOption('#dlg select', 'minimum');
  await page.click('#dlg button:has-text("Übernehmen")');
  await page.waitForFunction(() => document.querySelector('[data-k="cpu.custom"]').value.includes('Core 2 Duo'));
  assert.equal(await page.inputValue('[data-k="gpu.custom"]'), 'NVIDIA GeForce 8800 GT');
  assert.equal(await page.inputValue('input[type=text][data-k=ram]'), '2');
  assert.equal(await page.inputValue('[data-k=dx]'), 'Version 9.0c');
  assert.equal(await page.locator('[data-k=features][value=achievements]').isChecked(), true);
  assert.equal(await page.locator('[data-k=features][value=cloud_saves]').isChecked(), false);
  assert.equal(await page.locator('[data-k="os.linux"]').isChecked(), true);
  assert.equal(await page.locator('[data-k="os.win"][value="7"]').isChecked(), true);
  await page.waitForTimeout(100);
  assert.match(await page.locator('#specs').innerText(), /Core 2 Duo[\s\S]*2 GB RAM/);

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

  // ---- Ohne Schlüssel: verständlicher Hinweis ----
  await page.evaluate(() => localStorage.removeItem('sgdb-key'));
  await page.click('[data-img=publisher] .sg');
  assert.match(await page.locator('#dlg .dmsg').first().textContent(), /API-Schlüssel/);
  await page.click('#dlgX');

  assert.deepEqual(errors, []);
  await browser.close();
  console.log('Cover-Tool-Online-Test bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
