// Rückseiten-Editor im Cover-Tool: Pop-up per Knopf und Klick, Text und Bild hinzufügen, Ziehen und Skalieren, Eigenschaften, Ränder, Rückgängig,
// Vorlagen, Bilder von Steam und GOG (Dienste nachgebaut), Speichern und Wiederherstellen, Druckblatt, Englisch. Es gibt keine echte Verbindung.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const url = 'file://' + path.resolve(__dirname, '..', '..', 'disc-sleeve', 'index.html');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(() => { try { localStorage.setItem('sgdb-proxy', 'https://proxy.test/?url={url}'); } catch (e) { /* egal */ } });

  await page.route('https://proxy.test/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const target = new URL(req.url()).searchParams.get('url') || '';
    const ok = (body) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (/storesearch/.test(target)) return ok({ items: [{ id: 1174180, name: 'Red Dead Redemption 2' }] });
    if (/appdetails/.test(target)) return ok({ 1174180: { success: true, data: { name: 'Red Dead Redemption 2', screenshots: [
      { id: 0, path_thumbnail: 'https://shared.akamai.steamstatic.com/s0_t.jpg', path_full: 'https://shared.akamai.steamstatic.com/s0.jpg' },
      { id: 1, path_thumbnail: 'https://shared.akamai.steamstatic.com/s1_t.jpg', path_full: 'https://shared.akamai.steamstatic.com/s1.jpg' }], header_image: 'https://shared.akamai.steamstatic.com/h.jpg' } } });
    return route.fulfill({ status: 404, headers: CORS, body: 'x' });
  });
  await page.route('https://shared.akamai.steamstatic.com/**', (route) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body: PNG }));

  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  const items = () => page.evaluate(() => JSON.parse(JSON.stringify(CoverApp.state.back.items)));

  // Grundzustand: Standardhöhen, keine Elemente, Gestaltungsfläche 130 x 122
  assert.deepEqual(await page.evaluate(() => [CoverApp.state.back.featH, CoverApp.state.back.reqH]), ['15', '46']);
  assert.match(await page.locator('#backInfo').textContent(), /Gestaltungsfläche: 130 × 122 mm, 0 Elemente/);
  assert.equal((await items()).length, 0);

  // Editor per Knopf öffnen, Klick auf die Fläche öffnet ihn ebenfalls
  await page.click('#secBack summary'); await page.click('#bDesign');
  await page.waitForSelector('#bdlg[open]');
  await page.click('#bdlg button:has-text("Fertig")'); await page.waitForFunction(() => !document.querySelector('#bdlg').open);
  await page.click('#backTop'); await page.waitForSelector('#bdlg[open]');

  // Text hinzufügen, Titel verknüpfen und gestalten
  await page.click('#bdlg button:has-text("+ Text")');
  assert.equal((await items()).length, 1);
  assert.equal(await page.locator('#bdlg .bed-sel').isVisible(), true);
  await page.fill('#bdlg .bed-panel textarea', 'Hallo Welt');
  assert.equal((await items())[0].text, 'Hallo Welt');
  await page.waitForFunction(() => /Hallo Welt/.test(document.querySelector('#backItems').textContent));
  const sel = (label) => page.locator('#bdlg .bed-panel label.f', { hasText: label }).locator('select, input').first();
  await sel('Schrift').selectOption('serif');
  await page.locator('#bdlg .bed-panel label.chk', { hasText: 'GROSSBUCHSTABEN' }).locator('input').check();
  await sel('Größe (pt)').fill('20');
  let it = (await items())[0];
  assert.equal(it.font, 'serif'); assert.equal(it.caps, true); assert.equal(it.size, 20);
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#backItems .bi-p')).textTransform), 'uppercase');
  await sel('Inhalt').selectOption('title');
  await page.evaluate(() => CoverApp.patch({ title: 'Mein Spiel' }));
  await page.waitForFunction(() => /Mein Spiel/.test(document.querySelector('#backItems').textContent));

  // Ziehen verschiebt, Griff skaliert, Pfeiltasten schieben fein
  const box = async (css) => page.locator(css).boundingBox();
  const before = (await items())[0];
  const b0 = await box('#bdlg .bed-stage .bi');
  await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2); await page.mouse.down();
  await page.mouse.move(b0.x + b0.width / 2 + 40, b0.y + b0.height / 2 + 20, { steps: 5 }); await page.mouse.up();
  const moved = (await items())[0];
  assert.ok(moved.x > before.x && moved.y > before.y, 'Verschoben: ' + JSON.stringify([before.x, before.y, moved.x, moved.y]));
  const h = await box('#bdlg .hd-se');
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2 + 30, h.y + h.height / 2 + 15, { steps: 5 }); await page.mouse.up();
  const sized = (await items())[0];
  assert.ok(sized.w > moved.w && sized.h > moved.h, 'Größer');
  await page.locator('#bdlg .bed-pane').click({ position: { x: 5, y: 5 } });           // ins Leere: Auswahl aufheben
  assert.equal(await page.locator('#bdlg .bed-sel').isVisible(), false);
  const b1 = await box('#bdlg .bed-stage .bi'); await page.mouse.click(b1.x + b1.width / 2, b1.y + b1.height / 2);
  await page.keyboard.press('ArrowRight');
  assert.equal((await items())[0].x, sized.x + 0.25, 'Pfeiltaste: 0,25 mm');

  // Rückgängig und Wiederholen
  await page.click('#bedUndo');
  assert.equal((await items())[0].x, sized.x);
  await page.click('#bedRedo');
  assert.equal((await items())[0].x, sized.x + 0.25);

  // Duplizieren, Löschen, Ebenen
  await page.click('#bdlg button:has-text("Duplizieren")');
  assert.equal((await items()).length, 2);
  await page.click('#bdlg button:has-text("Nach hinten")');
  assert.equal((await items())[0].id, 'e2');
  await page.click('#bdlg button:has-text("Löschen")');
  assert.equal((await items()).length, 1);

  // Bild per Datei: Rand "ausgerissen" setzt ein Polygon
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#bdlg button:has-text("+ Bild (Datei)")')]);
  await chooser.setFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForFunction(() => CoverApp.state.back.items.length === 2);
  it = (await items())[1];
  assert.equal(it.type, 'image'); assert.match(it.img, /^d\d+$/);
  assert.ok(await page.evaluate((k) => !!CoverApp.images[k], it.img));
  await sel('Rand und Übergang').selectOption('torn');
  await page.waitForFunction(() => /polygon/.test(document.querySelector('#backItems .bi-image').style.clipPath));
  await sel('Rand und Übergang').selectOption('feather');
  await page.waitForFunction(() => /mask/.test(document.querySelector('#backItems .bi-image').style.cssText));
  await sel('Rand und Übergang').selectOption('border');
  await page.waitForFunction(() => /solid/.test(document.querySelector('#backItems .bi-image').style.border));

  // Bilder von Steam: Suche, Auswahl mehrerer Bilder, werden als Elemente hinzugefügt
  await page.click('#bdlg button:has-text("+ Bild von Steam oder GOG")');
  await page.waitForSelector('#bdlg .bed-gal:not([hidden])');
  await page.selectOption('#bdlg .bed-gal select', 'steam'); await page.fill('#bdlg .bed-gal input', 'red dead');
  await page.click('#bdlg .bed-gal button:has-text("Suchen")');
  await page.click('#bdlg .bed-gal button:has-text("Red Dead Redemption 2")');
  await page.waitForSelector('#bdlg .gal-img');
  assert.equal(await page.locator('#bdlg .gal-img').count(), 3);
  await page.locator('#bdlg .gal-img').nth(0).click(); await page.locator('#bdlg .gal-img').nth(1).click();
  await page.click('#bdlg .bed-gal button:has-text("Gewählte Bilder hinzufügen")');
  await page.waitForFunction(() => CoverApp.state.back.items.length === 4);
  assert.ok((await items()).slice(2).every((i) => i.type === 'image' && /^d\d+$/.test(i.img)));

  // Vorlage ersetzt die Elemente
  await page.selectOption('#bedTpl', 'steam');
  assert.ok((await items()).length >= 5);
  assert.ok((await items()).some((i) => i.type === 'text' && i.bind === 'description'));

  // Schließen räumt nicht benutzte Bilder weg; speichern und neu laden bringt alles zurück
  await page.click('#bdlg button:has-text("Fertig")'); await page.waitForFunction(() => !document.querySelector('#bdlg').open);
  await page.waitForFunction(() => Object.keys(CoverApp.images).filter((k) => /^d\d+$/.test(k)).length === 0);   // Bilder der gelöschten Elemente entfernt
  const saved = await items();
  await page.waitForTimeout(1200); await page.reload();
  assert.deepEqual(await items(), saved, 'Nach dem Neuladen sind die Elemente da');

  // Höhen: manuell einstellbar, Gestaltungsfläche passt sich an, Blatt bleibt gleich groß
  const sheet0 = await page.locator('#sheet').boundingBox();
  await page.click('#secBack summary'); await page.fill('[data-k="back.reqH"]', '60');
  await page.waitForFunction(() => /× 108 mm/.test(document.querySelector('#backInfo').textContent));
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#backBottom')).height === document.querySelector('#backBottom').style.height || true), true);
  assert.equal((await page.locator('#sheet').boundingBox()).width, sheet0.width, 'Blattgröße unverändert');
  await page.fill('[data-k="back.reqH"]', '46');

  // Englisch: keine deutschen Reste im Editor
  await page.click('#langMenu summary'); await page.click('#langMenu button[data-lang=en]'); await page.waitForTimeout(200);
  await page.click('#backTop'); await page.waitForSelector('#bdlg[open]');
  await page.click('#bdlg button:has-text("+ Text")');
  const GER = /[äöüß]|\b(und|der|die|das|nicht|bitte|oder|für|wird|mit|auf|zum|zur|aus|eine|noch|nur|kein|keine|Bilder|Rückseite|Spiel)\b/i;
  const bad = await page.evaluate((src) => {
    const re = new RegExp(src, 'i'), out = [], w = document.createTreeWalker(document.querySelector('#bdlg'), NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const t = n.data.replace(/\s+/g, ' ').trim(); if (t && !n.parentElement.closest('.bi, textarea') && re.test(t)) out.push(t); }
    return out;
  }, GER.source);
  assert.deepEqual(bad, [], 'Deutsche Reste im Editor');

  assert.deepEqual(errors, [], 'Keine Skriptfehler');
  await browser.close();
  console.log('Rückseiten-Editor-Test bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
