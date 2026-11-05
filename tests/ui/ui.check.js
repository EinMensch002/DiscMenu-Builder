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

  // Anbieter wählen
  await page.locator('#editor select').first().selectOption('epic');
  assert.match(await page.locator('#nav').textContent(), /Epic Games/);

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

  // Vorschau mit Simulation (klassisches Installer-Fenster: links Bild und Beschreibung, rechts Knöpfe)
  await page.click('#bPrev');
  const stage = page.locator('.stage');
  assert.match(await stage.textContent(), /Wähle ein Spiel/);
  assert.match(await stage.textContent(), /Epic Games|GOG/);
  await page.locator('.stage .cbtn', { hasText: 'Spiel Eins' }).hover();
  assert.match(await page.locator('.stage .ldesc').textContent(), /Beschreibung von Spiel Eins/);   // Beim Darüberfahren
  await page.mouse.move(5, 5);                                                                      // Maus weg: Auswahl bleibt stehen
  await page.waitForTimeout(200);
  assert.match(await page.locator('.stage .ldesc').textContent(), /Beschreibung von Spiel Eins/);
  await page.locator('.stage .cbtn', { hasText: 'Spiel Eins' }).click();
  assert.match(await stage.textContent(), /Beschreibung von Spiel Eins/);
  await page.locator('.stage .cbtn', { hasText: 'Patches' }).click();
  assert.match(await stage.textContent(), /Sprache|SPRACHE/);
  assert.match(await stage.textContent(), /Patch A/);
  await page.locator('.stage .cbtn', { hasText: 'Zurück' }).click();

  // Stille Installation ohne Ziel -> Hinweis; mit Ziel -> Simulation läuft und endet mit Erfolg
  await page.locator('.stage .opts input[type=checkbox]').check();
  await page.locator('.stage input.fld2').fill('');
  await page.locator('.stage .cbtn.main', { hasText: /^Installieren$/ }).first().click();
  assert.match(await stage.textContent(), /Zielordner fehlt/);
  await page.locator('.stage .ovl .sbtn:has-text("OK")').click();
  await page.locator('.stage input.fld2').fill('C:\\Spiele\\Test');
  await page.selectOption('.simbar select >> nth=1', '3');   // schnell
  await page.locator('.stage .cbtn.main', { hasText: /^Installieren$/ }).first().click();
  assert.match(await stage.textContent(), /Installation läuft/);
  await page.waitForFunction(() => /Fertig/.test(document.querySelector('.stage').textContent), null, { timeout: 15000 });
  assert.match(await stage.textContent(), /Installiert nach: C:\\Spiele\\Test/);
  assert.match(await page.locator('.simlog').textContent(), /\/VERYSILENT \/SUPPRESSMSGBOXES \/NORESTART \/SP- \/DIR="C:\\Spiele\\Test"/);
  await page.screenshot({ path: process.env.SHOT || '/tmp/claude-0/preview.png' });
  await page.locator('.stage .ovl .sbtn:has-text("OK")').click();

  // Fehlerfall (Code 5) in der stillen Installation
  await page.selectOption('.simbar select >> nth=0', 'err5');
  await page.locator('.stage .cbtn.main', { hasText: /^Installieren$/ }).first().click();
  await page.waitForFunction(() => /nicht erfolgreich/.test(document.querySelector('.stage').textContent), null, { timeout: 15000 });
  assert.match(await stage.textContent(), /Code 5/);
  assert.match(await stage.textContent(), /Administratorrechte/);
  await page.locator('.stage .ovl .sbtn:has-text("OK")').click();

  // Normaler Modus: nachgebautes Installer-Fenster mit Weiter und Fertigstellen
  await page.selectOption('.simbar select >> nth=0', 'ok');
  await page.locator('.stage .opts input[type=checkbox]').uncheck();   // still aus
  await page.locator('.stage .cbtn.main', { hasText: /^Installieren$/ }).first().click();
  assert.match(await page.locator('.stage .win').textContent(), /Willkommen beim Setup-Assistenten/);
  await page.locator('.stage .win button:has-text("Weiter")').click();
  await page.locator('.stage .win button:has-text("Fertigstellen")').click({ timeout: 15000 });
  await page.waitForFunction(() => /Fertig/.test(document.querySelector('.stage').textContent));
  await page.locator('.stage .ovl .sbtn:has-text("OK")').click();
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
