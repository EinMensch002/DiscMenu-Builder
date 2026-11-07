// Speichern im Cover-Tool: Standardwerte, "Speichern" überschreibt dieselbe Datei, "Speichern unter", Öffnen, ungespeichert-Anzeige, USK-Deckkraft.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const url = 'file://' + path.resolve(__dirname, '..', '..', 'cover-tool', 'index.html');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());

  // Nachgebaute Dateisystem-Schnittstelle (Chrome/Edge): zählt Dateiauswahlen und merkt sich, was in welche Datei geschrieben wird
  await page.addInitScript(() => {
    window.__picks = 0; window.__files = {};
    const makeHandle = (name) => ({
      name, async requestPermission() { return 'granted'; },
      async createWritable() { const parts = []; return { async write(b) { parts.push(b); }, async close() { window.__files[name] = (window.__files[name] || 0) + 1; window.__last = new Blob(parts); window.__lastName = name; } }; },
      async getFile() { return new File([window.__last], name, { type: 'application/zip' }); },
    });
    window.showSaveFilePicker = async (o) => { window.__picks++; return makeHandle(o.suggestedName); };
    window.showOpenFilePicker = async () => [makeHandle(window.__lastName)];
  });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload();

  // Standardwerte: Leiste in GOG-Farben (Lila mit Grün), Titel mittig, USK voll deckend
  assert.equal(await page.inputValue('[data-k=theme]'), 'bar');
  assert.deepEqual(await page.locator('[data-k=theme] option').allTextContents(), ['GOG-Farben (Lila mit Grün)', 'Dunkel mit Lila']);
  assert.equal(await page.locator('#cover').evaluate((e) => getComputedStyle(e).getPropertyValue('--barB').trim()), '#6c1c72');
  await page.selectOption('[data-k=theme]', 'bar-dark'); await page.waitForTimeout(150);       // dunkle Variante: Anthrazit mit lila Linie, auch auf dem Rücken
  assert.equal(await page.locator('#cover').evaluate((e) => getComputedStyle(e).getPropertyValue('--barB').trim()), '#1b1b1f');
  assert.equal(await page.locator('#spine').evaluate((e) => getComputedStyle(e).backgroundColor), 'rgb(35, 35, 40)');
  await page.selectOption('[data-k=provider]', 'steam'); await page.waitForTimeout(150);       // andere Anbieter: keine Farbvariante, das Feld ist ausgeblendet
  assert.equal(await page.locator('[data-k=theme] option').count(), 1);
  assert.equal(await page.locator('[data-k=theme]').isVisible(), false);
  assert.equal(await page.inputValue('[data-k=theme]'), 'bar');
  await page.selectOption('[data-k=provider]', 'gog'); await page.selectOption('[data-k=theme]', 'bar');
  assert.equal(await page.inputValue('[data-k=spineTitle]'), 'center');
  assert.equal(await page.inputValue('input[type=text][data-k=uskOpacity]'), '100');

  // USK-Deckkraft wirkt nur auf die Vorderseite
  await page.fill('input[type=text][data-k=uskOpacity]', '55'); await page.waitForTimeout(150);
  assert.equal(await page.locator('#frontUsk').evaluate((e) => e.style.opacity), '0.55');
  assert.notEqual(await page.locator('#backUsk').evaluate((e) => e.style.opacity), '0.55');
  await page.fill('input[type=text][data-k=uskOpacity]', '10'); await page.waitForTimeout(150);
  assert.equal(await page.inputValue('[data-k=uskOpacity] >> nth=0'), '30', 'Deckkraft hat eine Untergrenze von 30 %');
  await page.fill('input[type=text][data-k=uskOpacity]', '100');

  // Speichern: erst Dateiauswahl, danach wird dieselbe Datei überschrieben
  await page.fill('[data-k=title]', 'Mein Spiel'); await page.waitForTimeout(100);
  assert.match(await page.locator('#saveInfo').textContent(), /ungespeichert/);
  await page.click('.menu summary:has-text("Projekt")'); await page.click('#bSave');
  await page.waitForFunction(() => /gespeichert: mein-spiel-cover\.zip/.test(document.querySelector('#saveInfo').textContent));
  assert.equal(await page.evaluate(() => window.__picks), 1);
  await page.fill('[data-k=title]', 'Mein Spiel 2'); await page.waitForTimeout(100);
  assert.match(await page.locator('#saveInfo').textContent(), /ungespeichert/);
  await page.keyboard.press('Control+s');                                            // Strg+S überschreibt ohne neue Auswahl
  await page.waitForFunction(() => /gespeichert: mein-spiel-cover\.zip/.test(document.querySelector('#saveInfo').textContent));
  assert.equal(await page.evaluate(() => window.__picks), 1, 'keine zweite Dateiauswahl');
  assert.equal(await page.evaluate(() => window.__files['mein-spiel-cover.zip']), 2, 'dieselbe Datei wurde zweimal geschrieben');

  // Speichern unter: neue Dateiauswahl
  await page.click('.menu summary:has-text("Projekt")'); await page.click('#bProjExport');
  await page.waitForFunction(() => window.__picks === 2);

  // Öffnen: lädt die Datei und merkt sie sich zum Überschreiben
  await page.fill('[data-k=title]', 'Etwas anderes'); await page.waitForTimeout(100);
  await page.click('.menu summary:has-text("Projekt")'); await page.click('#bProjImport');
  await page.waitForFunction(() => /Projekt geöffnet/.test(document.querySelector('#dlg').textContent));
  assert.equal(await page.inputValue('[data-k=title]'), 'Mein Spiel 2');
  assert.match(await page.locator('#saveInfo').textContent(), /geöffnet: mein-spiel-cover\.zip/);
  assert.doesNotMatch(await page.locator('#saveInfo').textContent(), /ungespeichert/);
  await page.click('#dlgX');

  // Zurücksetzen vergisst die Datei
  await page.click('#bReset'); await page.waitForTimeout(150);
  assert.equal(await page.locator('#saveInfo').textContent(), '');

  assert.deepEqual(errors, []);
  await browser.close();
  console.log('Cover-Tool-Speichern-Test bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
