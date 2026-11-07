// Rückseite aus Bausteinen: Vorlagen, Ein/Aus, Reihenfolge, Höhen, Beschreibung (Schrift passt sich an), freier Text, Bildleiste, Hinweise, Projekt speichern und laden.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const url = 'file://' + path.resolve(__dirname, '..', '..', 'disc-sleeve', 'index.html');

async function image(page, key, w, h, color) {
  await page.evaluate(async ({ key, w, h, color }) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    await CoverApp.setImage(key, new File([blob], key + '.png', { type: 'image/png' }));
  }, { key, w, h, color });
  await page.waitForTimeout(100);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload();

  const order = () => page.evaluate(() => ['#backTop', '#backDesc', '#backShots', '#backFeats', '#backBottom', '#backTextBox'].map((s) => { const n = document.querySelector(s); return [s, Number(n.style.order || 0), !n.hidden]; }).filter((x) => x[2]).sort((a, b) => a[1] - b[1]).map((x) => x[0]));
  const box = (s) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(), k = Number(getComputedStyle(document.querySelector('#preview')).getPropertyValue('--k')) || 1; return { top: r.top / k, h: r.height / k / 3.7795 }; }, s);

  // Standard: wie bisher (Bild, Streifen, Angaben), Maßangabe des Bildfeldes passt
  await page.click('#jump button:has-text("Rückseite")');
  assert.deepEqual(await order(), ['#backTop', '#backFeats', '#backBottom']);
  assert.equal(await page.locator('#blockList .brow').count(), 6);
  assert.equal(await page.locator('[data-k="back.template"] ~ .seg button.on').getAttribute('data-v'), 'classic');
  assert.match(await page.locator('[data-img=backTop] .spec').textContent(), /130 × 122 mm/);
  assert.equal(await page.locator('#backDescEdit').isVisible(), false);

  // Vorlage "Beschreibung und Bildleiste": Reihenfolge und Ein/Aus, Maße folgen
  await page.click('[data-k="back.template"] ~ .seg button[data-v=steam]'); await page.waitForTimeout(200);
  assert.deepEqual(await order(), ['#backTop', '#backDesc', '#backShots', '#backFeats', '#backBottom']);
  assert.match(await page.locator('[data-img=backTop] .spec').textContent(), /130 × 58 mm/);
  assert.match(await page.locator('[data-img=shot1] .spec').textContent(), /40 × 24 mm/);
  assert.equal(await page.locator('#backDescEdit').isVisible(), true); assert.equal(await page.locator('#backShotsEdit').isVisible(), true);
  assert.equal((await box('#backDesc')).h.toFixed(1), '34.0'); assert.equal((await box('#backShots')).h.toFixed(1), '30.0');
  assert.match(await page.locator('#notes').textContent(), /Beschreibung" ist eingeschaltet, aber leer/);
  assert.match(await page.locator('#blockList .brow').first().textContent(), /füllt den Rest: 58 mm/);

  // Beschreibung: lange Texte werden kleiner statt abgeschnitten, nach dem Löschen wieder groß
  await page.fill('[data-k="back.description"]', 'Kurz.'); await page.waitForTimeout(200);
  const big = await page.locator('#backDescText').evaluate((e) => parseFloat(e.style.fontSize));
  await page.fill('[data-k="back.description"]', 'Ein sehr langer Beschreibungstext, der in den Baustein passen soll. '.repeat(14)); await page.waitForTimeout(250);
  const small = await page.locator('#backDescText').evaluate((e) => ({ pt: parseFloat(e.style.fontSize), over: e.scrollHeight > e.clientHeight + 1 }));
  assert.ok(small.pt < big && small.pt >= 4.4, 'lange Beschreibung: Schrift wird kleiner (' + big + ' -> ' + small.pt + ')'); assert.equal(small.over, false, 'nichts wird abgeschnitten');
  assert.doesNotMatch(await page.locator('#notes').textContent(), /Beschreibung" ist eingeschaltet, aber leer/);

  // Höhe ändern: Pfeiltasten in 0,25-mm-Schritten, das Bild nimmt den Rest
  const hInp = page.locator('#blockList .brow[data-type=description] input[data-bf=h]');
  await hInp.focus(); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150);
  assert.equal(await hInp.inputValue(), '34.25'); assert.equal((await box('#backDesc')).h.toFixed(2), '34.25');
  await hInp.fill('40'); await page.waitForTimeout(200);
  assert.match(await page.locator('#blockList .brow').first().textContent(), /füllt den Rest: 52 mm/); assert.match(await page.locator('[data-img=backTop] .spec').textContent(), /× 52 mm/);

  // Reihenfolge: Beschreibung nach unten, Bildleiste rückt hoch
  await page.click('#blockList .brow[data-type=description] button[data-bf=down]'); await page.waitForTimeout(200);
  assert.deepEqual(await order(), ['#backTop', '#backShots', '#backDesc', '#backFeats', '#backBottom']);
  assert.equal(await page.locator('#blockList .brow').nth(2).getAttribute('data-type'), 'description');
  assert.equal(await page.locator('#blockList .brow').first().locator('button[data-bf=up]').isDisabled(), true, 'oberster Baustein kann nicht höher');

  // Baustein ausschalten: verschwindet, Platz geht ans Bild; freier Text einschalten
  await page.uncheck('#blockList .brow[data-type=shots] input[data-bf=on]'); await page.waitForTimeout(200);
  assert.deepEqual(await order(), ['#backTop', '#backDesc', '#backFeats', '#backBottom']);
  assert.equal(await page.locator('#backShotsEdit').isVisible(), false);
  await page.check('#blockList .brow[data-type=text] input[data-bf=on]'); await page.waitForTimeout(200);
  await page.fill('[data-k="back.text"]', 'Für Anna'); await page.waitForTimeout(150);
  assert.equal(await page.locator('#backTextP').textContent(), 'Für Anna'); assert.ok((await order()).includes('#backTextBox'));

  // Bildleiste: Anzahl der Bilder, Bilder per Feld
  await page.check('#blockList .brow[data-type=shots] input[data-bf=on]'); await page.waitForTimeout(150);
  await page.click('[data-k="back.shotsCount"] ~ .seg button[data-v="4"]'); await page.waitForTimeout(150);
  assert.equal(await page.locator('#backShots .shot:not([hidden])').count(), 4);
  assert.equal(await page.locator('[data-img=shot4]').isVisible(), true);
  await image(page, 'shot1', 800, 450, '#d33'); await image(page, 'shot2', 800, 450, '#3a3');
  assert.equal(await page.locator('#shot1').evaluate((e) => e.classList.contains('has-img')), true);
  await page.click('[data-k="back.shotsCount"] ~ .seg button[data-v="2"]'); await page.waitForTimeout(150);
  assert.equal(await page.locator('#backShots .shot:not([hidden])').count(), 2); assert.equal(await page.locator('[data-img=shot3]').isVisible(), false);

  // Zu hohe Bausteine: Hinweis, das Blatt bleibt unverändert
  const before = await page.locator('#sheet').boundingBox();
  await page.fill('#blockList .brow[data-type=requirements] input[data-bf=h]', '110'); await page.fill('#blockList .brow[data-type=description] input[data-bf=h]', '100'); await page.waitForTimeout(250);
  assert.match(await page.locator('#notes').textContent(), /zu hoch, das Hintergrundbild verschwindet/);
  const after = await page.locator('#sheet').boundingBox();
  assert.equal(Math.round(after.width), Math.round(before.width)); assert.equal(Math.round(after.height), Math.round(before.height));
  assert.equal((await page.locator('#back').evaluate((e) => e.getBoundingClientRect().height)) > 0, true);

  // Projekt: Rückseite und Bilder überstehen Speichern und Laden (Zurücksetzen dazwischen)
  const snap = await page.evaluate(() => { const s = CoverApp.snapshot(); return { back: JSON.stringify(s.state.back), imgs: Object.keys(s.images).sort() }; });
  assert.ok(snap.imgs.includes('shot1') && snap.imgs.includes('shot2'));
  await page.waitForTimeout(1500); await page.reload(); await page.waitForTimeout(800);                // Browser-Speicher (speichert 0,8 s nach der letzten Änderung)
  const again = await page.evaluate(() => ({ back: JSON.stringify(CoverApp.state.back), imgs: Object.keys(CoverApp.snapshot().images).sort() }));
  assert.deepEqual(JSON.parse(again.back), JSON.parse(snap.back)); assert.deepEqual(again.imgs, snap.imgs);

  // Zurücksetzen: wieder "wie bisher"
  await page.click('#bReset'); await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => CoverApp.state.back.template), 'classic'); assert.deepEqual(await order(), ['#backTop', '#backFeats', '#backBottom']);

  // Vorlage "Nur Anforderungen"
  await page.click('#jump button:has-text("Rückseite")');
  await page.click('[data-k="back.template"] ~ .seg button[data-v=minimal]'); await page.waitForTimeout(200);
  assert.deepEqual(await order(), ['#backTop', '#backBottom']);
  assert.match(await page.locator('[data-img=backTop] .spec').textContent(), /130 × 137 mm/);

  // Englisch: Bezeichnungen der Bausteine und Hinweise sind übersetzt
  await page.click('#langMenu summary'); await page.click('#langMenu button[data-lang=en]'); await page.waitForTimeout(250);
  assert.match(await page.locator('#blockList .brow[data-type=shots]').textContent(), /Image strip/);
  assert.match(await page.locator('#blockList .brow').first().textContent(), /fills the rest: 137 mm/);

  assert.deepEqual(errors, [], 'Keine Skriptfehler');
  await browser.close();
  console.log('Cover-Tool-Rückseiten-Test bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
