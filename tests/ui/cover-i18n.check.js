// Sprache der Oberfläche im Cover-Tool: Umschalten Deutsch/Englisch im Menü oben, Merken der Wahl, Feld "Sprache der Beschriftung" nur bei Deutsch,
// keine deutschen Reste in Oberfläche und Dialogen (auch bei Fehlermeldungen), zurückwechseln stellt alles wieder her.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const url = 'file://' + path.resolve(__dirname, '..', '..', 'disc-sleeve', 'index.html');
const GER = /[äöüß]|\b(und|der|die|das|nicht|bitte|oder|für|wird|mit|auf|zum|zur|aus|ein|eine|noch|nur|kein|keine|wurde|werden|zuerst|lokal|ungespeichert|gespeichert|geöffnet|Treffer|Fehler|Datei|Rückseite|Frontcover)\b/i;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const dialogs = []; page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload();

  /* sichtbarer deutscher Text außerhalb des Covers */
  const leftovers = (root) => page.evaluate(({ root, src }) => {
    const re = new RegExp(src, 'i'), bad = [];
    const w = document.createTreeWalker(document.querySelector(root), NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const el = n.parentElement; if (!el || el.closest('[data-notr], script, style, #langMenu') || (el.closest('#sheet') && !el.closest('.ph'))) continue;
      if (el.tagName === 'OPTION' && /^(Deutsch|English)$/.test(n.data.trim())) continue;
      const t = n.data.replace(/\s+/g, ' ').trim(); if (t && re.test(t)) bad.push(t);
    }
    for (const el of document.querySelectorAll(root + ' [placeholder], ' + root + ' [title], ' + root + ' [aria-label]')) {
      if (el.closest('#sheet, [data-notr]')) continue;
      for (const a of ['placeholder', 'title', 'aria-label']) { const t = el.getAttribute(a); if (t && re.test(t)) bad.push(a + ': ' + t); }
    }
    return bad;
  }, { root, src: GER.source });

  // Standard: Deutsch, das Feld "Sprache der Beschriftung" ist da
  assert.equal(await page.locator('html').getAttribute('lang'), 'de');
  assert.equal(await page.locator('#bPrint').textContent(), 'Drucken');
  assert.equal(await page.locator('[data-k=lang]').isVisible(), true);
  assert.match(await page.locator('#langMenu summary').textContent(), /Deutsch/);
  assert.equal(await page.locator('#langMenu summary img.flag').count(), 1, 'Flagge im Menü');

  // Auf Englisch umstellen
  await page.click('#langMenu summary');
  assert.deepEqual(await page.locator('#langMenu .pop button').allTextContents(), ['Deutsch', 'English']);
  await page.click('#langMenu button[data-lang=en]'); await page.waitForTimeout(200);
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.locator('#bPrint').textContent(), 'Print');
  assert.equal(await page.locator('#bSettings').textContent(), 'Settings');
  assert.match(await page.locator('h1').textContent(), /DiscSleeve/);
  assert.match(await page.locator('#langMenu summary').textContent(), /English/);
  assert.equal(await page.title(), 'DiscSleeve – Cover Tool for Disc Cases');
  assert.equal(await page.getAttribute('[data-k=title]', 'placeholder'), 'e.g. The Witcher: Enhanced Edition');
  assert.equal(await page.locator('[data-k=lang]').isVisible(), false, 'Bei Englisch entfällt das Feld "Sprache der Beschriftung"');
  assert.equal(await page.evaluate(() => CoverApp.state.lang), 'en', 'Das Cover wird englisch beschriftet');
  assert.match(await page.locator('#cover').textContent(), /Game Features|GAME FEATURES|System requirements|SYSTEM REQUIREMENTS/i);
  assert.deepEqual(await leftovers('body'), [], 'Deutsche Reste in der Oberfläche');
  assert.equal(await page.locator('.flag').count(), 3, 'Flaggen im Menü (Zusammenfassung und zwei Einträge)');

  // Das Cover selbst wird nicht übersetzt, sondern folgt der Beschriftungssprache; Texte, die später entstehen (Hinweise), werden übersetzt
  assert.match(await page.locator('#notes').textContent(), /front cover is still missing/);

  // Die Wahl bleibt nach dem Neuladen
  await page.reload();
  assert.equal(await page.locator('#bPrint').textContent(), 'Print');
  assert.equal(await page.evaluate(() => CoverApp.state.lang), 'en');

  // Dialoge auf Englisch, auch mit Fehlermeldungen (alle Anfragen schlagen fehl)
  await page.route(/^https?:/, (r) => r.abort());
  await page.click('#bSettings');
  assert.match(await page.locator('#dlg').textContent(), /Settings for SteamGridDB and Steam/);
  await page.click('#dlg button:has-text("Test connection")');
  await page.waitForFunction(() => /At least one connection is not working/.test(document.querySelector('#dlg').textContent));
  assert.deepEqual(await leftovers('#dlg'), [], 'Deutsche Reste im Einstellungsdialog');
  await page.click('#dlgX');
  await page.click('details.menu:has-text("Import data") summary'); await page.click('#bSteam');
  assert.match(await page.locator('#dlg').textContent(), /Requirements from Steam/);
  await page.fill('#dlg input', 'Half-Life'); await page.click('#dlg button:has-text("Search")');
  await page.waitForTimeout(600);
  assert.deepEqual(await leftovers('#dlg'), [], 'Deutsche Reste im Steam-Dialog (auch Fehlermeldung)');
  await page.click('#dlgX');
  await page.click('[data-img=publisher] button.sg');
  await page.waitForTimeout(300);
  assert.match(await page.locator('#dlg').textContent(), /Search publisher logo/);
  await page.click('#dlg button:has-text("Search")'); await page.waitForTimeout(500);
  assert.deepEqual(await leftovers('#dlg'), [], 'Deutsche Reste im Publisher-Dialog');
  await page.click('#dlgX');
  await page.unroute(/^https?:/);

  // confirm-Meldungen werden übersetzt
  await page.click('#bReset'); await page.waitForTimeout(200);
  assert.equal(dialogs.pop(), 'Reset all settings and images?');
  await page.evaluate(() => CoverApp.patch({ lang: 'en' }));

  // Zurück auf Deutsch: alles wie vorher, das Feld ist wieder da
  await page.click('#langMenu summary'); await page.click('#langMenu button[data-lang=de]'); await page.waitForTimeout(200);
  assert.equal(await page.locator('#bPrint').textContent(), 'Drucken');
  assert.equal(await page.title(), 'DiscSleeve – Cover-Tool für Disc-Hüllen');
  assert.equal(await page.getAttribute('[data-k=title]', 'placeholder'), 'z. B. The Witcher: Enhanced Edition');
  assert.equal(await page.locator('[data-k=lang]').isVisible(), true);
  assert.match(await page.locator('#notes').textContent(), /Es fehlt noch das Frontcover/);
  assert.equal(await page.evaluate(() => CoverApp.state.lang), 'en', 'Die Beschriftungssprache bleibt, bis man sie ändert');

  assert.deepEqual(errors, [], 'Keine Skriptfehler');
  await browser.close();
  console.log('Cover-Tool-Sprachen-Test bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
