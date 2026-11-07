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
  assert.equal(await page.inputValue('[data-k=theme]'), 'glass', 'Standard: Durchsichtig schwarz');
  assert.equal(await page.locator('[data-k=gogText]').isChecked(), true, 'GOG.COM ist standardmäßig sichtbar'); assert.equal(await page.locator('#barWm').isVisible(), true);
  assert.equal(await page.inputValue('[data-k=gogSpine]'), 'match'); assert.equal(await page.locator('[data-k=foldLines]').isChecked(), true, 'Falzmarken sind standardmäßig an');
  assert.equal(await page.inputValue('[data-k=caseType]:checked'), 'normal'); assert.equal(await page.inputValue('[data-k=disc]:checked'), 'dvd');
  assert.equal(await page.locator('#spine').evaluate((e) => getComputedStyle(e).backgroundColor), 'rgb(35, 35, 40)', 'Rücken passt zur dunklen Leiste');
  assert.deepEqual(await page.locator('[data-k=theme] option').allTextContents(), ['Weiß', 'Warmweiß', 'Durchsichtig weiß', 'Durchsichtig schwarz', 'Dunkel', 'Dunkel mit Violett-Hauch']);
  await page.selectOption('[data-k=theme]', 'dark'); await page.waitForTimeout(150);
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
  // Stil als Schieberegler mit sechs Punkten (von hell nach dunkel), Punkte lassen sich auch anklicken
  assert.equal(await page.locator('#styleTicks button').count(), 6);
  assert.deepEqual(await page.locator('#styleTicks button').allTextContents(), ['Weiß', 'Warmweiß', 'Durchsichtig weiß', 'Durchsichtig schwarz', 'Dunkel', 'Dunkel mit Violett-Hauch']);
  assert.equal(await page.locator('#styleSlider').inputValue(), '4', 'Dunkel ist der fünfte Punkt');
  await page.locator('#styleSlider').fill('0'); await page.waitForTimeout(150);
  assert.equal(await page.inputValue('[data-k=theme]'), 'white'); assert.equal(await cv('--barA'), '#ffffff');
  await page.click('#styleTicks button[data-theme=glasswhite]'); await page.waitForTimeout(150);
  assert.equal(await page.inputValue('[data-k=theme]'), 'glasswhite'); assert.equal(await page.locator('#styleSlider').inputValue(), '2');
  assert.match(await cv('--barA'), /rgba\(255, ?255, ?255/); assert.equal(await page.locator('#front').evaluate((e) => getComputedStyle(e).paddingTop), '0px', 'Durchsichtig weiß liegt über dem Bild');
  assert.equal(await page.locator('#styleTicks button.on').getAttribute('data-theme'), 'glasswhite');
  await page.click('#styleTicks button[data-theme=dark]'); await page.waitForTimeout(150);
  // Auswahlen mit wenigen Möglichkeiten sind Schaltflächen; Bereiche lassen sich über die Sprungleiste öffnen
  assert.equal(await page.locator('[data-k=frontFit] ~ .seg button').count(), 2);
  await page.click('[data-k=frontFit] ~ .seg button[data-v=crop]'); await page.waitForTimeout(150);
  assert.equal(await page.inputValue('[data-k=frontFit]'), 'crop'); assert.equal(await page.locator('#frontCropBox').isVisible(), true);
  await page.click('[data-k=frontFit] ~ .seg button[data-v=stretch]'); await page.waitForTimeout(100);
  assert.equal(await page.locator('[data-k=frontFit] ~ .seg button.on').getAttribute('data-v'), 'stretch');
  assert.equal(await page.locator('#jump button').count(), await page.locator('#form > details.sec').count());
  await page.click('#jump button:has-text("Rücken")'); await page.waitForTimeout(200);
  assert.equal(await page.locator('#form > details.sec:has(summary:text-is("Rücken"))').evaluate((e) => e.open), true);
  // Kopfleiste: Reihenfolge von rechts: Drucken, Sprache, Zurücksetzen, Einstellungen, Daten übernehmen, Projekt; kein Link zum Konfigurator
  const ids = await page.evaluate(() => [...document.querySelectorAll('.top nav > *')].map((e) => e.id || (e.querySelector && e.querySelector('summary') ? e.querySelector('summary').textContent.trim() : '')));
  assert.deepEqual(ids.filter(Boolean).slice(-6), ['Projekt', 'Daten übernehmen', 'bSettings', 'bReset', 'langMenu', 'bPrint']);
  assert.equal(await page.locator('.top a').count(), 0, 'Der Link zum Konfigurator ist entfernt');
  assert.match(await page.locator('h1').textContent(), /DiscSleeve/);

  // Warmweiß und Violett-Hauch: eigene Farben, gleiche Logik
  await page.selectOption('[data-k=theme]', 'warm'); await page.waitForTimeout(150);
  assert.equal(await cv('--barA'), '#f8f6f2'); assert.equal(await page.locator('.gog-bar img').getAttribute('src'), 'assets/images/gog_logo_outline.svg');
  await page.selectOption('[data-k=theme]', 'violet'); await page.waitForTimeout(150);
  assert.equal(await cv('--barA'), '#2a2238'); assert.equal(await page.locator('#cover').evaluate((e) => e.classList.contains('gog-dk')), true);
  await page.selectOption('[data-k=theme]', 'dark'); await page.waitForTimeout(100);
  // Rücken hell und Farbe von "PC": automatisch passend, oder fest Weiß/Schwarz
  const pcColor = () => page.locator('#spine .pc').evaluate((e) => getComputedStyle(e).color);
  assert.equal(await pcColor(), 'rgb(255, 255, 255)', 'auf dunklem Rücken ist PC weiß');
  await page.selectOption('[data-k=gogSpine]', 'light'); await page.waitForTimeout(150);
  assert.equal(await page.locator('#spine').evaluate((e) => getComputedStyle(e).backgroundColor), 'rgb(233, 233, 238)');
  assert.equal(await pcColor(), 'rgb(28, 28, 34)', 'auf hellem Rücken ist PC automatisch dunkel');
  assert.equal(await page.locator('#spineTitle').evaluate((e) => getComputedStyle(e).color), 'rgb(28, 28, 34)', 'Rückentitel ist auf hellem Rücken dunkel');
  await page.selectOption('[data-k=pcColor]', 'white'); await page.waitForTimeout(100);
  assert.equal(await pcColor(), 'rgb(255, 255, 255)');
  await page.selectOption('[data-k=pcColor]', 'black'); await page.selectOption('[data-k=gogSpine]', 'dark'); await page.waitForTimeout(100);
  assert.equal(await pcColor(), 'rgb(17, 17, 17)', 'Schwarz lässt sich fest wählen');
  await page.selectOption('[data-k=pcColor]', 'auto');
  // Naht der durchscheinenden Leiste: Leiste der Vorderseite beginnt dort, wo die des Rückens endet (keine doppelte Überlagerung)
  await page.selectOption('[data-k=theme]', 'glass'); await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => { const b = document.querySelector('.gog-bar').getBoundingClientRect(), h = document.querySelector('.spine-head').getBoundingClientRect(); return Math.abs(b.left - h.right) < 0.8; }), true, 'Leisten überlappen sich nicht');
  await page.selectOption('[data-k=theme]', 'dark'); await page.waitForTimeout(100);
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

  // USK: Der Regler stellt nur den Hintergrund (Kachel mit Rand) hinter der Raute ein, die Raute bleibt voll sichtbar, auf der Rückseite steht nur die Raute
  await page.fill('input[type=text][data-k=uskOpacity]', '55'); await page.waitForTimeout(150);
  assert.equal(await page.locator('#frontUskBg').evaluate((e) => e.style.opacity), '0.55');
  assert.equal(await page.locator('#frontUsk').evaluate((e) => e.style.opacity), '', 'Die Raute selbst bleibt voll deckend');
  assert.match(await page.locator('#frontUskBg').getAttribute('src'), /usk_0_bg\.svg$/);
  assert.equal(await page.locator('#backUsk').evaluate((e) => e.style.opacity), '');
  await page.fill('input[type=text][data-k=uskOpacity]', '0'); await page.waitForTimeout(150);
  assert.equal(await page.inputValue('[data-k=uskOpacity] >> nth=0'), '0', '0 % ist möglich: dann bleibt nur die Raute');
  assert.equal(await page.locator('#frontUskBg').isVisible(), false); assert.equal(await page.locator('#frontUsk').isVisible(), true);
  await page.fill('input[type=text][data-k=uskOpacity]', '100');

  // Frontbild einpassen: Standard strecken (das ganze Bild füllt die Fläche), alternativ zuschneiden mit Zoom und Ausschnitt
  await page.evaluate(async () => { const cv = document.createElement('canvas'); cv.width = 400; cv.height = 200; cv.getContext('2d').fillRect(0, 0, 400, 200); const b = await new Promise((r) => cv.toBlob(r, 'image/png')); await CoverApp.setImage('front', new File([b], 'f.png', { type: 'image/png' })); });
  await page.waitForTimeout(300);
  assert.equal(await page.inputValue('[data-k=frontFit]'), 'stretch');
  assert.equal(await page.locator('#frontCropBox').isVisible(), false);
  assert.equal(await page.locator('#front').evaluate((e) => e.style.backgroundSize), '100% 100%', 'Querformat-Bild wird auf die Fläche gestaucht statt abgeschnitten');
  await page.selectOption('[data-k=frontFit]', 'crop'); await page.waitForTimeout(150);
  assert.equal(await page.locator('#frontCropBox').isVisible(), true);
  const sz = () => page.locator('#front').evaluate((e) => ({ s: e.style.backgroundSize.split(' ').map(parseFloat), p: e.style.backgroundPosition.split(' ').map(parseFloat) }));
  let g = await sz(); assert.ok(Math.abs(g.s[1] - 173) < 0.01 && g.s[0] > 340, 'füllt die Höhe, die Breite wird zugeschnitten (' + g.s + ')');
  assert.ok(Math.abs(g.p[0] + (g.s[0] - 129) / 2) < 0.01, 'mittig');
  await page.fill('input[type=text][data-k=frontZoom]', '200'); await page.fill('input[type=text][data-k=frontX]', '0'); await page.waitForTimeout(150);
  g = await sz(); assert.ok(Math.abs(g.s[1] - 346) < 0.01, 'Zoom 200 %'); assert.equal(g.p[0], 0, 'Ausschnitt links');
  await page.fill('input[type=text][data-k=frontX]', '100'); await page.waitForTimeout(150);
  g = await sz(); assert.ok(Math.abs(g.p[0] + (g.s[0] - 129)) < 0.01, 'Ausschnitt rechts');
  await page.selectOption('[data-k=frontFit]', 'stretch'); await page.waitForTimeout(100);
  assert.equal(await page.locator('#front').evaluate((e) => e.style.backgroundSize), '100% 100%');

  // GOG Weiß: das andere Logo (Rahmen), nicht das Kachel-Logo; Dunkel: keine lila Linie
  assert.equal(await page.locator('.gog-bar img').getAttribute('src'), 'assets/images/gog_logo.svg');
  assert.equal(await cv('--line'), 'transparent');
  await page.selectOption('[data-k=theme]', 'white'); await page.waitForTimeout(150);
  assert.equal(await page.locator('.gog-bar img').getAttribute('src'), 'assets/images/gog_logo_outline.svg');
  assert.equal(await page.locator('#spineLogo').getAttribute('src'), 'assets/images/gog_logo_outline.svg');
  await page.selectOption('[data-k=theme]', 'dark'); await page.waitForTimeout(150);
  assert.equal(await page.locator('.gog-bar img').getAttribute('src'), 'assets/images/gog_logo.svg');
  // Durchscheinend: weicher Verlauf ohne harte Unterkante (läuft bis ganz durchsichtig aus)
  await page.selectOption('[data-k=theme]', 'glass'); await page.waitForTimeout(150);
  assert.match(await cv('--barGrad'), /rgba\(12, ?12, ?16, ?0\)\)?$/);
  await page.selectOption('[data-k=theme]', 'dark'); await page.waitForTimeout(100);

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
