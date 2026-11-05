// Oberflächentest im echten Browser (Playwright). Nicht Teil von "npm test", Aufruf: npm run test:ui
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'configurator', 'index.html'));

  // Disc + zwei Spiele per Maske
  await page.click('text=Disc-Einstellungen');
  await page.fill('#editor input >> nth=0', 'Meine Collection');
  await page.click('text=0 (ohne Namen)').catch(() => {});
  await page.locator('.nv').nth(1).click();
  await page.fill('#editor input >> nth=0', 'Spiel Eins');
  await page.locator('#editor input[placeholder*="setup_stronghold"]').fill('Eins/setup.exe');
  await page.locator('#editor textarea').first().fill('Beschreibung von Spiel Eins');
  await page.click('text=+ Spiel hinzufügen');
  await page.fill('#editor input >> nth=0', 'Spiel Zwei');
  await page.locator('#editor input[placeholder*="setup_stronghold"]').fill('Zwei/setup.exe');

  // JSON bearbeiten
  await page.click('#bJson');
  const ta = page.locator('textarea.code');
  const json = JSON.parse(await ta.inputValue());
  assert.equal(json.games.length, 2);
  json.title = 'Per JSON geändert';
  json.games[0].patches = [{ name: 'Patch A', group: 'Sprache', installer: 'Eins/patch.exe' }];
  await ta.fill(JSON.stringify(json));
  await page.click('text=Änderungen übernehmen');
  await page.waitForSelector('dialog:not([open])', { state: 'attached' });
  assert.match(await page.locator('#side pre').textContent(), /Per JSON geändert/);
  await page.locator('.nv').nth(1).click();
  assert.match(await page.locator('#editor').textContent(), /Patch A/);

  // Ungültiges JSON bleibt im Dialog
  await page.click('#bJson');
  await page.locator('textarea.code').fill('{ kaputt');
  await page.click('text=Änderungen übernehmen');
  assert.match(await page.locator('#dlgBody .issue.error').textContent(), /Kein gültiges JSON/);
  await page.click('text=Abbrechen');

  // Vorschau
  await page.click('#bPrev');
  assert.match(await page.locator('.pv').textContent(), /Spiel auswählen/);
  await page.locator('.pv .tile').first().click();
  assert.match(await page.locator('.pv').textContent(), /Beschreibung von Spiel Eins/);
  await page.locator('.pv .tabs button:has-text("Patches")').click();
  assert.match(await page.locator('.pv').textContent(), /SPRACHE|Sprache/);
  assert.match(await page.locator('.pv').textContent(), /Patch A/);
  await page.screenshot({ path: process.env.SHOT || '/tmp/claude-0/preview.png' });

  await page.click('text=Schließen');

  // Disc-Prüfung mit nachgebautem Ordner (nur Eins/setup.exe und Eins/PATCH.EXE in anderer Schreibweise)
  await page.evaluate(() => {
    const file = n => ({ kind: 'file', name: n });
    const dir = (n, kids) => ({ kind: 'directory', name: n,
      async getDirectoryHandle(x) { const k = kids[x]; if (k && k.kind === 'directory') return k; throw new Error('nf'); },
      async getFileHandle(x) { const k = kids[x]; if (k && k.kind === 'file') return k; throw new Error('nf'); },
      async *entries() { for (const [a, b] of Object.entries(kids)) yield [a, b]; } });
    const root = dir('DISC', { Eins: dir('Eins', { 'setup.exe': file('setup.exe'), 'PATCH.EXE': file('PATCH.EXE') }) });
    window.showDirectoryPicker = async () => root;
  });
  await page.locator('.nv').nth(1).click();           // Spiel Eins: Installer vorhanden, Patch nur in anderer Schreibweise
  await page.evaluate(() => {});                       // Seitenleiste neu zeichnen lassen
  await page.waitForTimeout(400);
  await page.locator('#side button:has-text("Disc-Ordner prüfen")').click();
  const res = await page.locator('#dlgBody').textContent();
  assert.match(res, /Disc-Prüfung|Problem|Pfade/);
  assert.match(res, /Spiel 1 \(Spiel Zwei\), Installer: nicht gefunden/);   // Zwei/setup.exe fehlt
  assert.ok(!/Spiel 0 \(Spiel Eins\), Installer/.test(res));                // Eins/setup.exe gefunden
  assert.ok(!/Patch A/.test(res), 'Patch A (Eins/patch.exe) muss trotz anderer Schreibweise gefunden werden');
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('UI-Test bestanden');
})().catch(e => { console.error(e); process.exit(1); });
