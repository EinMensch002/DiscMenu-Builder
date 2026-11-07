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

  // Standardwerte: GOG dunkel (schmale Leiste), Titel mittig, USK voll deckend
  const cv = (v) => page.locator('#cover').evaluate((e, n) => getComputedStyle(e).getPropertyValue(n).trim(), v);
  assert.equal(await page.inputValue('[data-k=theme]'), 'dark');
  assert.deepEqual(await page.locator('[data-k=theme] option').allTextContents(), ['Weiß', 'Dunkel', 'Dunkel, durchscheinend']);
  assert.equal(await cv('--barB'), '#18181c');
  assert.equal(await page.locator('#spine').evaluate((e) => getComputedStyle(e).backgroundColor), 'rgb(35, 35, 40)');
  assert.equal(await page.locator('.gog-bar').evaluate((e) => Math.abs(e.getBoundingClientRect().height / (Number(getComputedStyle(document.querySelector('#preview')).getPropertyValue('--k')) || 1) / 3.7795 - 10) < 0.6), true, 'Leiste ist 10 mm schmal');
  // Logo ist immer da, "GOG.COM" lässt sich ein- und ausschalten, "PC · DRM-FREI" bleibt
  assert.equal(await page.locator('.gog-bar img').isVisible(), true);
  assert.equal(await page.locator('#barWm').isVisible(), true); assert.equal(await page.locator('#barWm').textContent(), 'GOG.COM');
  await page.uncheck('[data-k=gogText]'); await page.waitForTimeout(100);
  assert.equal(await page.locator('#barWm').isVisible(), false); assert.equal(await page.locator('.gog-bar img').isVisible(), true);
  assert.equal(await page.locator('#frontTag').textContent(), 'PC · DRM-FREI'); assert.equal(await page.locator('#frontTag').isVisible(), true);
  await page.check('[data-k=gogText]');
  // Weiß: helle Leiste mit dunklem Logo, die Leiste hat dunkle Schrift
  await page.selectOption('[data-k=theme]', 'white'); await page.waitForTimeout(150);
  assert.equal(await cv('--barA'), '#ffffff'); assert.equal(await cv('--barFg'), '#1c1c22');
  assert.match(await page.locator('.gog-bar img').evaluate((e) => getComputedStyle(e).filter), /brightness/, 'Logo ist auf Weiß dunkel eingefärbt');
  assert.equal(await page.locator('#cover').evaluate((e) => e.classList.contains('gog-dk')), false);
  // Durchscheinend: die Leiste liegt über dem Bild (Verlauf), das Frontbild beginnt ganz oben
  await page.selectOption('[data-k=theme]', 'glass'); await page.waitForTimeout(150);
  assert.match(await cv('--barA'), /rgba/);
  assert.equal(await page.locator('#front').evaluate((e) => getComputedStyle(e).paddingTop), '0px');
  assert.match(await page.locator('[data-img=front] .spec').textContent(), /× 183 mm/);
  await page.selectOption('[data-k=theme]', 'dark'); await page.waitForTimeout(150);
  assert.equal(await page.locator('#front').evaluate((e) => parseFloat(getComputedStyle(e).paddingTop) > 5), true);
  await page.selectOption('[data-k=provider]', 'steam'); await page.waitForTimeout(150);       // andere Anbieter: keine Farbvariante, das Feld ist ausgeblendet
  assert.equal(await page.locator('[data-k=theme] option').count(), 1);
  assert.equal(await page.locator('[data-k=theme]').isVisible(), false);
  assert.equal(await page.locator('#gogTextRow').isVisible(), false, 'Der GOG.COM-Schalter gibt es nur bei GOG');
  assert.equal(await page.inputValue('[data-k=theme]'), 'bar');
  await page.selectOption('[data-k=provider]', 'gog'); await page.selectOption('[data-k=theme]', 'dark');
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
