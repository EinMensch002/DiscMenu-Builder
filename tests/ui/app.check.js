// Gemeinsame Seite: Menü und Hülle in einer index.html, Umschalten ohne Neuladen (shell.js). Aufruf: npm run test:ui
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const url = 'file://' + path.resolve(__dirname, '..', '..', 'app', 'index.html');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.goto(url); await page.reload();
  const vis = (s) => page.locator(s).isVisible();

  // Start ohne Angabe: Menü. Die Adresse zeigt den Bereich.
  assert.equal(await page.evaluate(() => document.body.dataset.view), 'menu');
  assert.ok((await page.evaluate(() => location.hash)) === '#menue');
  assert.equal(await vis('#viewMenu'), true); assert.equal(await vis('#viewCover'), false);
  assert.equal(await vis('#bExp'), true, 'Menü-Knöpfe in der Leiste'); assert.equal(await vis('#bPrint'), false, 'Drucken nur bei der Hülle');
  assert.equal(await vis('#bSettings'), true, 'Einstellungen in beiden Bereichen');

  // Eingabe im Menü, dann zur Hülle und zurück: dieselbe Seite, nichts geht verloren
  await page.evaluate(() => { window.__marker = 42; });
  await page.locator('#editor input').first().fill('Mein Spiel');
  await page.click('.views [data-go=cover]');
  assert.equal(await page.evaluate(() => location.hash), '#huelle');
  assert.equal(await vis('#viewCover'), true); assert.equal(await vis('#viewMenu'), false);
  assert.equal(await vis('#bPrint'), true); assert.equal(await vis('#bExp'), false);
  await page.fill('[data-k=title]', 'Titel der Hülle');
  await page.waitForFunction(() => document.querySelector('#viewCover .scalebox').getBoundingClientRect().width > 300, null, { timeout: 5000 });   // Vorschau nach dem Einblenden eingepasst
  await page.click('.views [data-go=menu]');
  assert.equal(await page.evaluate(() => window.__marker), 42, 'Kein Neuladen beim Umschalten');
  assert.equal(await page.locator('#editor input').first().inputValue(), 'Mein Spiel');
  await page.click('.views [data-go=cover]');
  assert.equal(await page.inputValue('[data-k=title]'), 'Titel der Hülle');

  // Einstellungen: im Menü öffnet sich dessen Dialog, bei der Hülle der eigene
  await page.click('#bSettings');
  assert.equal(await vis('#dlg'), true, 'Einstellungen der Hülle'); await page.click('#dlgX');
  await page.click('.views [data-go=menu]');
  await page.click('#bSettings');
  assert.equal(await vis('#mDlg'), true, 'Einstellungen im Menü'); assert.equal(await vis('#dlg'), false); await page.click('#mDlgX');

  // Neuladen und Adresse mit #huelle öffnen die Hülle direkt
  await page.goto(url + '#huelle'); await page.reload();
  assert.equal(await page.evaluate(() => document.body.dataset.view), 'cover');
  await page.goto('about:blank'); await page.goto(url);
  assert.equal(await page.evaluate(() => document.body.dataset.view), 'cover', 'Ohne Angabe gilt der zuletzt benutzte Bereich');

  // Stile bleiben getrennt: die Felder im Menü haben nicht das Aussehen der Hülle und umgekehrt
  await page.click('.views [data-go=menu]');
  const menuBg = await page.evaluate(() => getComputedStyle(document.querySelector('#viewMenu')).backgroundImage);
  assert.match(menuBg, /gradient/, 'Hintergrund des Menüs aus menu.css');
  await page.click('.views [data-go=cover]');
  const coverDrop = await page.evaluate(() => getComputedStyle(document.querySelector('#viewCover .drop')).minHeight);
  assert.notEqual(coverDrop, '72px', 'Regel ".drop" aus menu.css gilt nicht bei der Hülle');

  // Drucken: nur die Hülle
  await page.emulateMedia({ media: 'print' });
  assert.equal(await vis('#viewMenu'), false); assert.equal(await vis('header.top'), false);
  await page.emulateMedia({ media: 'screen' });

  assert.deepEqual(errors, [], 'Keine Fehler auf der Seite');
  await browser.close();
  console.log('Gemeinsame Seite: Test bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
