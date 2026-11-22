// Gemeinsame Seite: Menü und Hülle in einer index.html, ein Projekt, eine Leiste. Aufruf: npm run test:ui
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const M = require('../../app/menu-core.js');

const url = 'file://' + path.resolve(__dirname, '..', '..', 'app', 'index.html');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(url);
  await page.evaluate(() => { localStorage.clear(); return new Promise((r) => { const q = indexedDB.deleteDatabase('discmenu-projekte'); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await page.goto(url); await page.reload();
  const vis = (s) => page.locator(s).isVisible();
  const view = () => page.evaluate(() => document.body.dataset.view);
  const go = (v) => page.click('.views [data-go=' + v + ']');
  const nameInput = () => page.locator('#editor input').first();

  // Start ohne Angabe: Menü. Die Adresse zeigt den Bereich, die Leiste rechts ist in beiden Bereichen gleich.
  assert.equal(await view(), 'menu'); assert.equal(await page.evaluate(() => location.hash), '#menue');
  assert.equal(await vis('#viewMenu'), true); assert.equal(await vis('#viewCover'), false);
  assert.equal(await vis('#bPrev'), true, 'Vorschau nur im Menü'); assert.equal(await vis('#bPrint'), false, 'Drucken nur bei der Hülle');
  for (const s of ['#bSettings', '#langMenu', '.top nav details.menu >> nth=0']) assert.equal(await vis(s), true, s);
  await go('cover');
  assert.equal(await vis('#bPrint'), true); assert.equal(await vis('#bPrev'), false);
  for (const s of ['#bSettings', '#langMenu', '.top nav details.menu >> nth=0']) assert.equal(await vis(s), true, s);
  await go('menu');
  assert.equal(await page.locator('#side details').count(), 0, 'keine zweite JSON-Vorschau in der Seite (steht unter "Sonstiges")');

  // Verknüpft: Spielname im Menü = Titel der Hülle und umgekehrt, ohne Neuladen
  await page.evaluate(() => { window.__marker = 42; });
  await nameInput().fill('Mein Spiel');
  await go('cover');
  await page.waitForFunction(() => document.querySelector('[data-k=title]').value === 'Mein Spiel', null, { timeout: 5000 });
  await page.waitForFunction(() => document.querySelector('#viewCover .scalebox').getBoundingClientRect().width > 300, null, { timeout: 5000 });   // Vorschau eingepasst
  await page.fill('[data-k=title]', 'Neuer Titel');
  await page.click('[data-k=provider] + *').catch(() => {});
  await page.evaluate(() => CoverApp.patch({ provider: 'steam' }));
  await go('menu');
  await page.waitForFunction(() => document.querySelector('#editor input').value === 'Neuer Titel', null, { timeout: 5000 });
  assert.equal(await page.evaluate(() => MenuApp.state.games[0].provider), 'steam', 'Anbieter verknüpft');
  assert.equal(await page.evaluate(() => window.__marker), 42, 'Kein Neuladen beim Umschalten');

  // Frontcover der Hülle wird Cover des Spiels
  await page.evaluate(async () => { const cv = document.createElement('canvas'); cv.width = 300; cv.height = 400; cv.getContext('2d').fillRect(0, 0, 300, 400); const b = await new Promise((r) => cv.toBlob(r)); await CoverApp.setImage('front', new File([b], 'f.png', { type: 'image/png' })); });
  await page.waitForFunction(() => !!MenuApp.state.games[0].cover, null, { timeout: 5000 });
  assert.equal(await page.locator('#editor .drop img').count(), 1, 'Cover im Menü sichtbar');

  // Einstellungen: ein Dialog für beide Bereiche
  await page.click('#bSettings'); assert.equal(await vis('#dlg'), true); await page.click('#dlgX');
  await go('cover'); await page.click('#bSettings'); assert.equal(await vis('#dlg'), true); await page.click('#dlgX');

  // Projektdatei: menu.json, cover.json, Bilder unter assets/
  await page.evaluate(() => { window.showSaveFilePicker = undefined; });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('bSave').click())]);
  const file = path.join(require('node:os').tmpdir(), 'discmenu-app-test.zip'); await dl.saveAs(file);
  const names = (await M.readZip(new Uint8Array(fs.readFileSync(file)))).map((f) => f.name);
  assert.ok(names.includes('recipe.json') && !names.includes('menu.json') && !names.includes('cover.json'), 'eine Beschreibung: ' + names.join());
  assert.ok(names.some((n) => /^assets\/cover\.(png|jpg)$/.test(n)), 'Frontcover ist auch das Cover des Menüs: ' + names.join());

  // Alte Datei öffnen und speichern: vorher kommt der Hinweis auf das neue Format (auch bei Strg+S)
  const oldZip = M.buildZip([{ name: 'menu.json', data: new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, title: 'Alt', games: [{ index: 0, name: 'Altes Spiel', installer: 'a.exe' }] })) }]);
  const oldFile = path.join(require('node:os').tmpdir(), 'discmenu-alt.zip'); fs.writeFileSync(oldFile, oldZip);
  await page.setInputFiles('#projectFile', oldFile);
  await page.waitForFunction(() => /Das Menü wurde geladen/.test(document.querySelector('#dlg').textContent));
  await page.click('#dlgX');
  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => /Neues Dateiformat/.test(document.querySelector('#dlg').textContent));
  assert.match(await page.locator('#dlg').textContent(), /Rezept nur mit dem Menü/);
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#dlg button:has-text("Im neuen Format speichern")')]);
  const names2 = (await M.readZip(new Uint8Array(fs.readFileSync(await dl2.path())))).map((f) => f.name);
  assert.ok(names2.includes('recipe.json'), names2.join());
  const [dl3] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('bSave').click())]);
  assert.ok(dl3, 'Danach speichert es ohne erneute Frage');
  await page.setInputFiles('#projectFile', file);
  await page.waitForFunction(() => /Menü, Hülle und alle Bilder wurden geladen/.test(document.querySelector('#dlg').textContent));
  await page.click('#dlgX');

  // Neues Projekt leert beide Bereiche
  await page.evaluate(() => document.getElementById('bReset').click());
  await page.waitForFunction(() => MenuApp.state.games[0].name === '' && CoverApp.state.title === '', null, { timeout: 5000 });
  assert.equal(await page.evaluate(() => !!CoverApp.images.front), false);

  // Öffnen bringt alles zurück (beide Bereiche)
  await page.setInputFiles('#projectFile', file);
  await page.waitForFunction(() => MenuApp.state.games[0].name === 'Neuer Titel' && CoverApp.state.title === 'Neuer Titel' && !!CoverApp.images.front, null, { timeout: 5000 });
  await page.click('#dlgX').catch(() => {});

  // Neuladen: das Projekt kommt aus dem Browser-Speicher, die Adresse bestimmt den Bereich
  await page.waitForTimeout(1200);
  await page.goto(url + '#huelle'); await page.reload();
  assert.equal(await view(), 'cover');
  await page.waitForFunction(() => MenuApp.state.games[0].name === 'Neuer Titel' && !!CoverApp.images.front, null, { timeout: 5000 });

  // Spielordner einlesen: Vorschlag als Tabelle, Zeilen lassen sich ändern, dann übernehmen (die Ordnerauswahl selbst lässt sich nicht automatisch bedienen)
  await go('menu');
  await page.evaluate(() => MenuApp.showFolderPlan('DISK 1', DiscProject.planFromFolder([
    { path: 'base_game/setup_spiel.exe' }, { path: 'base_game/setup_spiel-1.bin' }, { path: 'Story_Erweiterungen/Kapitel2/setup_k2.exe' },
    { path: 'Patches_und_Fixes/Fix/fix.exe' }, { path: 'extras/handbuch.pdf' }, { path: 'Sonstiges/tool.exe' }])));
  const rowsCount = await page.locator('#mDlg .fplan tr').count();
  assert.equal(rowsCount, 6, 'Kopfzeile und fünf Vorschläge');
  await page.locator('#mDlg .fplan tr', { hasText: 'Sonstiges/tool.exe' }).locator('select').selectOption('extras');      // Zuordnung ändern
  await page.click('#mDlg button:has-text("Übernehmen")');
  const g0 = await page.evaluate(() => MenuApp.state.games[0]);
  assert.equal(g0.installer, 'base_game/setup_spiel.exe');
  assert.deepEqual(g0.dlcs.map((i) => [i.name, i.path]), [['Kapitel2', 'Story_Erweiterungen/Kapitel2/setup_k2.exe']]);
  assert.deepEqual(g0.patches.map((i) => [i.name, i.group]), [['Fix', 'Patches & Fixes']]);
  assert.deepEqual(g0.extras.map((i) => [i.path, i.kind]).sort(), [['Sonstiges/tool.exe', 'open'], ['extras/handbuch.pdf', 'open']]);

  // Stile bleiben getrennt, Drucken zeigt nur die Hülle
  const coverDrop = await page.evaluate(() => getComputedStyle(document.querySelector('#viewCover .drop')).minHeight);
  assert.notEqual(coverDrop, '72px', 'Regel ".drop" aus menu.css gilt nicht bei der Hülle');
  await page.emulateMedia({ media: 'print' });
  assert.equal(await vis('#viewMenu'), false); assert.equal(await vis('header.top'), false);
  await page.emulateMedia({ media: 'screen' });

  assert.deepEqual(errors, [], 'Keine Fehler auf der Seite');
  await browser.close();
  console.log('Gemeinsame Seite: Test bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
