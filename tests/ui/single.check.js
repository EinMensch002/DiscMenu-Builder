// Ein-Datei-Build (scripts/build-single.js): Die erzeugte HTML-Datei läuft allein in einem leeren Ordner, ohne app/ und ohne Internet.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'discmenu-single-'));            // leerer Ordner: kein assets/ daneben
  const file = path.join(dir, 'DiscMenu-Builder.html');
  execFileSync(process.execPath, [path.join(__dirname, '..', '..', 'scripts', 'build-single.js'), file, '--version=test'], { stdio: 'pipe' });
  const html = fs.readFileSync(file, 'utf8');
  assert.ok(!/\?v=__VERSION__|__VERSION__/.test(html), 'Versionsplatzhalter ersetzt');
  assert.ok(!/<script src=|<link rel="stylesheet"/.test(html), 'keine externen Skripte oder Stile');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [], failed = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => failed.push(r.url()));
  page.on('request', (r) => { const u = r.url(); if (u.startsWith('file:') && !u.endsWith('DiscMenu-Builder.html')) failed.push('Datei nachgeladen: ' + u); });
  await page.goto('file://' + file + '#huelle');
  await page.waitForTimeout(800);
  assert.match(await page.locator('#ver').textContent(), /Version test/);
  // Bilder aus assets/ sind da: Anbieter-Logo, USK, Disc-Logo, Symbole der Spielfunktionen, Flagge
  const broken = await page.evaluate(() => [...document.querySelectorAll('#viewCover img, header img')].filter((i) => !i.hidden && i.getAttribute('src') && !(i.complete && i.naturalWidth > 0)).map((i) => i.id || i.className || i.src.slice(0, 40)));
  assert.deepEqual(broken, [], 'alle sichtbaren Bilder geladen');
  assert.ok(await page.evaluate(() => /^data:/.test(document.querySelector('#frontUsk').src)), 'USK als data:-Adresse');
  assert.ok(await page.evaluate(() => document.fonts.check('700 12px Lato')), 'Schrift Lato eingebettet');
  // beide Bereiche, Umschalten, Projekt
  await page.click('.views [data-go=menu]');
  await page.locator('#editor input').first().fill('Einzeldatei-Spiel');
  await page.click('.views [data-go=cover]');
  await page.waitForFunction(() => document.querySelector('[data-k=title]').value === 'Einzeldatei-Spiel');
  assert.deepEqual(errors, [], 'keine Fehler auf der Seite');
  assert.deepEqual(failed, [], 'nichts nachgeladen');
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('Ein-Datei-Build: Test bestanden (' + Math.round(html.length / 1024) + ' KB)');
})().catch((e) => { console.error(e); process.exit(1); });
