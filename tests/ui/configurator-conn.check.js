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
  let epicDown = false, workerVersion = 2; const seen = [];
  await page.route('https://proxy.test/**', (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (new URL(req.url()).searchParams.has('info')) return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'discmenu-proxy', version: workerVersion, hosts: ['^www\\.steamgriddb\\.com$', '^store\\.steampowered\\.com$', '^catalog\\.gog\\.com$', '^api\\.gog\\.com$', '^store-content\\.ak\\.epicgames\\.com$'] }) });
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
  for (const n of ['Proxy-Worker', 'SteamGridDB', 'Steam-Shop', 'GOG-Katalog', 'GOG-Spieldaten', 'Epic Games Store', 'Übersetzung (MyMemory)']) assert.match(text, new RegExp('✓ ' + n.replace(/[()]/g, '\\$&')), n);
  assert.ok(seen.some((u) => /api\.gog\.com\/products\/1207658924/.test(u)), 'GOG-Spieldaten werden abgefragt');
  assert.match(text, /✓ Proxy-Worker: Version 2 \(aktuell\)/);

  // Veralteter Worker (Version 1): Kreuz mit Hinweis, die Zusammenfassung nennt den Dienst
  workerVersion = 1;
  await page.click('#dlg button:has-text("Verbindung testen")');
  await page.waitForFunction(() => /Verbindungen funktionieren nicht: Proxy-Worker/.test(document.querySelector('#dlg').textContent));
  assert.match(await page.locator('#sgTests').innerText(), /✗ Proxy-Worker: Proxy-Worker Version 1, aktuell ist 2\. Bitte den aktuellen Worker-Code einspielen\./);
  assert.match(await page.locator('#dlg').textContent(), /1 von 7 Verbindungen funktionieren nicht: Proxy-Worker\. Details unten\./);
  // Farben: grünes Häkchen, rotes Kreuz
  const color = (sel) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).color);
  assert.equal(await color('#sgTests .tline.bad .tmark'), 'rgb(180, 35, 24)', 'Kreuz ist rot');
  assert.equal(await color('#sgTests .tline.good .tmark'), 'rgb(6, 118, 71)', 'Häkchen ist grün');
  // Neuere Version als erwartet: gelb mit Warnzeichen, kein Fehler
  workerVersion = 9;
  await page.click('#dlg button:has-text("Verbindung testen")');
  await page.waitForFunction(() => /Version 9/.test(document.querySelector('#sgTests').textContent));
  assert.match(await page.locator('#sgTests').innerText(), /⚠ Proxy-Worker: Version 9 \(neuer als dieses Tool\)/);
  assert.equal(await color('#sgTests .tline.warn .tmark'), 'rgb(181, 71, 8)', 'Warnzeichen ist gelb/orange');
  assert.match(await page.locator('#dlg').textContent(), /Alle Verbindungen in Ordnung|Verbindungen funktionieren nicht: Epic/);
  workerVersion = 2;

  // Ein Dienst fällt aus (Worker veraltet): er steht mit Meldung da, die anderen bleiben grün
  epicDown = true;
  await page.click('#dlg button:has-text("Verbindung testen")');
  await page.waitForFunction(() => /Verbindungen funktionieren nicht: Epic Games Store/.test(document.querySelector('#dlg').textContent));
  const t2 = await page.locator('#sgTests').innerText();
  assert.match(t2, /✗ Epic Games Store: Der Proxy erlaubt Epic Games nicht/); assert.match(t2, /✓ GOG-Katalog/);

  // Ohne Schlüssel und Proxy: verständliche Hinweise statt Absturz
  await page.fill('#dlg input[placeholder="API-Schlüssel"]', ''); await page.fill('#dlg input[placeholder*="proxy"]', '');
  await page.click('#dlg button:has-text("Verbindung testen")');
  await page.waitForFunction(() => /Verbindungen funktionieren nicht/.test(document.querySelector('#dlg').textContent) && /Kein Proxy eingetragen/.test(document.querySelector('#sgTests').textContent));
  assert.match(await page.locator('#sgTests').innerText(), /✗ SteamGridDB: Kein API-Schlüssel eingetragen/);

  assert.deepEqual(errors, [], 'Keine Skriptfehler');
  await browser.close();
  console.log('Konfigurator-Verbindungstest bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
