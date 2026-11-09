// Eigene Schriften in der Projektdatei (ZIP): speichern, ohne die Schrift wieder öffnen (sie wird hinzugefügt), nochmal öffnen (keine Doppelung).
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const url = 'file://' + path.resolve(__dirname, '..', '..', 'disc-sleeve', 'index.html');
const latoPath = path.resolve(__dirname, '..', '..', 'disc-sleeve', 'assets', 'fonts', 'Lato-Bold.ttf');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(() => { delete window.showSaveFilePicker; delete window.showOpenFilePicker; });   // normaler Download statt Dateidialog
  await page.goto(url);
  const b64 = fs.readFileSync(latoPath).toString('base64');

  // Schrift hinzufügen, Text damit anlegen, dazu eine zweite, unbenutzte Schrift
  const id = await page.evaluate(async (data) => {
    const used = await CoverApp.fonts.add({ name: 'Meine Testschrift', ext: 'ttf', data });
    await CoverApp.fonts.add({ name: 'Unbenutzt', ext: 'ttf', data });
    CoverApp.patch({ back: { items: [window.CoverCore.newItem('text', { text: 'Hallo', font: used.id })] } });
    return used.id;
  }, b64);
  assert.equal(await page.evaluate(() => CoverApp.fonts.list().length), 2);

  const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
  const zipPath = await dl.path();
  const names = fs.readFileSync(zipPath).toString('latin1');
  assert.ok(names.includes('fonts/' + id + '.ttf'), 'Benutzte Schrift liegt in der ZIP');
  assert.equal((names.match(/fonts\/uf-[a-z0-9]+\.ttf/g) || []).length, 3, 'Nur eine Schrift (Name steht in cover.json, im Kopf und im Verzeichnis)');

  // Schriften entfernen (wie auf einem anderen Rechner), Projekt öffnen: Schrift kommt zurück, Text benutzt sie
  await page.evaluate(async () => { for (const f of CoverApp.fonts.list()) await CoverApp.fonts.remove(f.id); });
  await page.setInputFiles('#projectFile', zipPath);
  await page.waitForFunction(() => CoverApp.fonts.list().length === 1);
  const after = await page.evaluate(() => ({ f: CoverApp.fonts.list()[0], font: CoverApp.state.back.items[0].font }));
  assert.equal(after.f.name, 'Meine Testschrift');
  assert.equal(after.font, after.f.id, 'Text benutzt die hinzugefügte Schrift');
  assert.equal(await page.evaluate((i) => !!window.BackDesign.FONTS[i], after.f.id), true);
  await page.waitForSelector('dialog[open]');
  assert.match(await page.locator('dialog[open]').first().innerText(), /1 eigene Schrift/);

  // Nochmal öffnen: gleiche Schrift ist da, nichts wird doppelt
  await page.click('dialog[open] button:has-text("Schließen")');
  await page.setInputFiles('#projectFile', zipPath);
  await page.waitForSelector('dialog[open]');
  assert.equal(await page.evaluate(() => CoverApp.fonts.list().length), 1, 'Keine doppelte Schrift');
  assert.equal(await page.evaluate(() => CoverApp.state.back.items[0].font), after.f.id);

  assert.deepEqual(errors, []);
  await browser.close();
  console.log('cover-font-project: ok');
})().catch((e) => { console.error(e); process.exit(1); });
