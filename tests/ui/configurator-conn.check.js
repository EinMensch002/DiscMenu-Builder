// Verbindungstest im Konfigurator (SteamGridDB-Einstellungen): jeder Dienst einzeln (SteamGridDB, Steam, GOG-Katalog, GOG-Spieldaten, Epic Games, Übersetzung),
// ein Dienst, der ausfällt, steht mit Meldung da. Die Dienste sind nachgebaut (page.route), es gibt keine echte Verbindung.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  let epicDown = false; const seen = [];
  await page.route('https://proxy.test/**', (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const t = new URL(req.url()).searchParams.get('url'); seen.push(t);
    const json = (b, status = 200) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(b) });
    if (/steamgriddb/.test(t)) return json({ success: true, data: [{ id: 1, name: 'Half-Life' }] });
    if (/storesearch/.test(t)) return json({ items: [{ id: 70, name: 'Half-Life' }] });
    if (/catalog\.gog\.com/.test(t)) return json({ products: [{ id: '1', title: 'The Witcher' }] });
    if (/api\.gog\.com\/products/.test(t)) return json({ description: { full: 'x' } });
    if (/store-content/.test(t)) return epicDown ? route.fulfill({ status: 403, headers: CORS, body: 'Dieser Host ist nicht erlaubt.' }) : json({ pages: [] });
    return route.fulfill({ status: 404, headers: CORS, body: 'nicht nachgebaut' });
  });
  await page.route('https://api.mymemory.translated.net/**', (route) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ responseStatus: 200, responseData: { translatedText: 'Hallo' } }) }));

  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'configurator', 'index.html'));
  await page.evaluate(() => { localStorage.setItem('sgdb-key', 'KEY'); localStorage.setItem('sgdb-proxy', 'https://proxy.test/?url={url}'); });
  await page.reload();

  await page.click('#bSg');
  await page.click('#dlg button:has-text("Verbindung testen")');
  await page.waitForFunction(() => /Alle Verbindungen in Ordnung/.test(document.querySelector('#dlg').textContent));
  const text = await page.locator('#sgTests').innerText();
  for (const n of ['SteamGridDB', 'Steam-Shop', 'GOG-Katalog', 'GOG-Spieldaten', 'Epic Games Store', 'Übersetzung (MyMemory)']) assert.match(text, new RegExp('✓ ' + n.replace(/[()]/g, '\\$&')), n);
  assert.ok(seen.some((u) => /api\.gog\.com\/products\/1207658924/.test(u)), 'GOG-Spieldaten werden abgefragt');

  // Ein Dienst fällt aus (Worker veraltet): er steht mit Meldung da, die anderen bleiben grün
  epicDown = true;
  await page.click('#dlg button:has-text("Verbindung testen")');
  await page.waitForFunction(() => /Mindestens eine Verbindung funktioniert nicht/.test(document.querySelector('#dlg').textContent));
  const t2 = await page.locator('#sgTests').innerText();
  assert.match(t2, /✗ Epic Games Store: Der Proxy erlaubt Epic Games nicht/); assert.match(t2, /✓ GOG-Katalog/);

  // Ohne Schlüssel und Proxy: verständliche Hinweise statt Absturz
  await page.fill('#dlg input[placeholder="API-Schlüssel"]', ''); await page.fill('#dlg input[placeholder*="proxy"]', '');
  await page.click('#dlg button:has-text("Verbindung testen")');
  await page.waitForFunction(() => /Mindestens eine/.test(document.querySelector('#dlg').textContent) && /Kein Proxy eingetragen/.test(document.querySelector('#sgTests').textContent));
  assert.match(await page.locator('#sgTests').innerText(), /✗ SteamGridDB: Kein API-Schlüssel eingetragen/);

  assert.deepEqual(errors, [], 'Keine Skriptfehler');
  await browser.close();
  console.log('Konfigurator-Verbindungstest bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
