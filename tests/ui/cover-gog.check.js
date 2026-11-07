// Daten von GOG im Cover-Tool: Suche im GOG-Katalog, Anforderungen/Funktionen/USK/Publisher übernehmen, Logo und Hintergrund laden (Cover nur auf Wunsch),
// Auflösungshinweis (dpi) in der SteamGridDB-Auswahl. Die Dienste sind nachgebaut (page.route), es gibt keine echte Verbindung.
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const url = 'file://' + path.resolve(__dirname, '..', '..', 'disc-sleeve', 'index.html');
const FIX = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'fixtures', 'gog-witcher-v2.json'), 'utf8'));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('sgdb-proxy', 'https://proxy.test/?url={url}'); } catch (e) { /* egal */ } });

  const calls = [], imgCalls = [];
  await page.route('https://proxy.test/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const target = new URL(req.url()).searchParams.get('url'); calls.push(target);
    const ok = (body) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (/catalog\.gog\.com/.test(target)) return ok({ products: [{ id: '1207658924', title: 'The Witcher: Enhanced Edition', releaseDate: '2007.10.26' }, { id: '1495134320', title: 'The Witcher 3: Wild Hunt', releaseDate: '2015.05.18' }] });
    if (/api\.gog\.com\/v2\/games\/1207658924/.test(target)) return ok(FIX);
    return route.fulfill({ status: 404, headers: CORS, body: 'nicht nachgebaut' });
  });
  await page.route('https://images.gog-statics.com/**', (route) => { imgCalls.push(route.request().url()); route.fulfill({ status: 200, headers: { ...CORS, 'content-type': /\.png/.test(route.request().url()) ? 'image/png' : 'image/jpeg' }, body: PNG }); });

  await page.goto(url);
  await page.evaluate(() => localStorage.setItem('sgdb-proxy', 'https://proxy.test/?url={url}'));
  await page.reload();
  const openGog = async () => { await page.click('details.menu:has-text("Daten übernehmen") summary'); await page.click('#bGog'); };

  // Suche -> Treffer -> Daten
  await openGog();
  assert.match(await page.locator('#dlg').textContent(), /Daten von GOG/);
  await page.fill('#dlg input', 'witcher'); await page.click('#dlg button:has-text("Suchen")');
  await page.waitForSelector('#dlg button:has-text("The Witcher: Enhanced Edition")');
  assert.match(await page.locator('#dlg .dlist').textContent(), /\(2007\)/);
  assert.ok(calls.some((c) => /catalog\.gog\.com\/v1\/catalog\?.*query=like%3Awitcher/.test(c)), 'Suche geht über den Proxy');
  await page.click('#dlg button:has-text("The Witcher: Enhanced Edition")');
  await page.waitForSelector('#dlg table.shown');
  const tbl = await page.locator('#dlg table.shown').innerText();
  assert.match(tbl, /Spieletitel \(Rücken\)[\s\S]*The Witcher: Enhanced Edition/);
  assert.match(tbl, /USK-Freigabe[\s\S]*ab 18 Jahren \(USK laut GOG\)/);
  assert.match(tbl, /Publisher \/ Entwickler[\s\S]*CD PROJEKT RED/);
  assert.match(tbl, /Arbeitsspeicher[\s\S]*1\.5 GB/);
  // Voreinstellung: Logo ja (Rückenlogo ist leer), Hintergrund und das kleine GOG-Cover nein
  const chk = page.locator('#dlg label.chk input');
  assert.equal(await chk.count(), 3);
  assert.equal(await chk.nth(0).isChecked(), true); assert.equal(await chk.nth(1).isChecked(), false); assert.equal(await chk.nth(2).isChecked(), false);
  assert.match(await page.locator('#dlg').textContent(), /342 × 482/);
  await chk.nth(1).check();
  await page.click('#dlg button:has-text("Übernehmen")');
  await page.waitForFunction(() => !document.querySelector('#dlg').open);
  const st = await page.evaluate(() => ({ title: CoverApp.state.title, usk: CoverApp.state.usk, pub: CoverApp.state.publisher, feats: CoverApp.state.features, imgs: Object.keys(CoverApp.snapshot().images) }));
  assert.equal(st.title, 'The Witcher: Enhanced Edition'); assert.equal(st.usk, '18'); assert.deepEqual(st.feats, ['single_player', 'cloud_saves']);
  assert.ok(st.imgs.includes('spineLogo') && st.imgs.includes('backTop'), 'Logo und Hintergrund geladen: ' + st.imgs);
  assert.ok(!st.imgs.includes('front'), 'Das kleine GOG-Cover wird nur auf Wunsch geladen');
  assert.equal(imgCalls.length, 2, 'Bilder kommen direkt von images.gog-statics.com');
  assert.ok(!calls.some((c) => /gog-statics/.test(c)), 'Bilder gehen nicht über den Proxy');

  // GOG-Produkt-ID direkt: keine Suche
  await openGog(); await page.waitForSelector('#dlg .dlist button');             // der Titel ist vorbelegt: die Suche startet gleich
  const before = calls.length;
  await page.fill('#dlg input', '1207658924'); await page.click('#dlg button:has-text("Suchen")');
  await page.waitForSelector('#dlg table.shown');
  assert.ok(!calls.slice(before).some((c) => /catalog\.gog\.com/.test(c)), 'Mit ID entfällt die Suche');
  await page.click('#dlgX');

  // Fehler: Spiel unbekannt -> verständliche Meldung
  await openGog(); await page.fill('#dlg input', '999999999'); await page.click('#dlg button:has-text("Suchen")');
  await page.waitForFunction(() => /nicht nachgebaut|hat mit Fehler 404/.test(document.querySelector('#dlg').textContent));
  await page.click('#dlgX');

  // Verbindungstest nennt GOG
  await page.click('#bSettings'); await page.click('#dlg button:has-text("Verbindung testen")');
  await page.waitForFunction(() => /GOG-Katalog/.test(document.querySelector('#dlg').textContent));
  assert.match(await page.locator('#dlg').innerText(), /✓ GOG-Katalog/);
  await page.click('#dlgX');

  assert.deepEqual(errors, [], 'Keine Skriptfehler');
  await browser.close();
  console.log('Cover-Tool-GOG-Test bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
