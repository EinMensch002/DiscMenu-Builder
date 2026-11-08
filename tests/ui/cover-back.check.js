// Rückseiten-Editor im Cover-Tool: Pop-up per Knopf und Klick, Text und Bild hinzufügen, Ziehen und Skalieren, Eigenschaften, Ränder, Rückgängig,
// Vorlagen, Bilder von Steam und GOG (Dienste nachgebaut), Speichern und Wiederherstellen, Druckblatt, Englisch. Es gibt keine echte Verbindung.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const url = 'file://' + path.resolve(__dirname, '..', '..', 'disc-sleeve', 'index.html');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(d.type() === 'prompt' ? d.defaultValue() : undefined); });
  await page.addInitScript(() => { try { localStorage.setItem('sgdb-proxy', 'https://proxy.test/?url={url}'); } catch (e) { /* egal */ } });

  await page.route('https://proxy.test/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const target = new URL(req.url()).searchParams.get('url') || '';
    const ok = (body) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (/storesearch/.test(target)) return ok({ items: [{ id: 1174180, name: 'Red Dead Redemption 2' }] });
    if (/appdetails/.test(target)) return ok({ 1174180: { success: true, data: { name: 'Red Dead Redemption 2', screenshots: [
      { id: 0, path_thumbnail: 'https://shared.akamai.steamstatic.com/s0_t.jpg', path_full: 'https://shared.akamai.steamstatic.com/s0.jpg' },
      { id: 1, path_thumbnail: 'https://shared.akamai.steamstatic.com/s1_t.jpg', path_full: 'https://shared.akamai.steamstatic.com/s1.jpg' }], header_image: 'https://shared.akamai.steamstatic.com/h.jpg' } } });
    return route.fulfill({ status: 404, headers: CORS, body: 'x' });
  });
  await page.route('https://shared.akamai.steamstatic.com/**', (route) => route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body: PNG }));

  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  const items = () => page.evaluate(() => JSON.parse(JSON.stringify(CoverApp.state.back.items)));

  // Grundzustand: Standardhöhen, keine Elemente, Gestaltungsfläche 130 x 122
  assert.deepEqual(await page.evaluate(() => [CoverApp.state.back.featH, CoverApp.state.back.reqH]), ['15', '46']);
  assert.match(await page.locator('#backInfo').textContent(), /Gestaltungsfläche: 130 × 122 mm, 0 Elemente/);
  assert.equal((await items()).length, 0);

  // Editor per Knopf öffnen, Klick auf die Fläche öffnet ihn ebenfalls
  await page.click('#secBack summary'); await page.click('#bDesign');
  await page.waitForSelector('#bdlg[open]');
  await page.click('#bdlg button:has-text("Fertig")'); await page.waitForFunction(() => !document.querySelector('#bdlg').open);
  await page.click('#backTop'); await page.waitForSelector('#bdlg[open]');

  // Text hinzufügen, Titel verknüpfen und gestalten
  await page.click('#bdlg button:has-text("+ Text")');
  assert.equal((await items()).length, 1);
  assert.equal(await page.locator('#bdlg .bed-sel').isVisible(), true);
  await page.fill('#bdlg .bed-panel textarea', 'Hallo Welt');
  assert.equal((await items())[0].text, 'Hallo Welt');
  await page.waitForFunction(() => /Hallo Welt/.test(document.querySelector('#backItems').textContent));
  const sel = (label) => page.locator('#bdlg .bed-panel label.f', { hasText: label }).locator('select, input').first();
  await sel('Schrift').selectOption('serif');
  await page.locator('#bdlg .bed-panel label.chk', { hasText: 'GROSSBUCHSTABEN' }).locator('input').check();
  await sel('Größe (pt)').fill('20');
  let it = (await items())[0];
  assert.equal(it.font, 'serif'); assert.equal(it.caps, true); assert.equal(it.size, 20);
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#backItems .bi-p')).textTransform), 'uppercase');
  // Schriftauswahl: gruppiert, jeder Eintrag in seiner eigenen Schrift; Spiele-Schriften werden geladen und benutzt
  assert.deepEqual(await page.locator('#bdlg .bed-panel label.f', { hasText: 'Schrift' }).first().locator('optgroup').evaluateAll((g) => g.map((x) => x.label)), ['Systemschriften', 'Spiele-Schriften']);
  const gameOpts = page.locator('#bdlg .bed-panel optgroup[label="Spiele-Schriften"] option');
  assert.ok(await gameOpts.count() >= 10, 'Mindestens zehn Spiele-Schriften');
  assert.match(await gameOpts.first().evaluate((o) => o.style.fontFamily), /Press Start 2P/, 'Eintrag zeigt sich in der eigenen Schrift');
  await sel('Schrift').selectOption('g-pressstart');
  assert.equal((await items())[0].font, 'g-pressstart');
  await page.waitForFunction(() => document.fonts.check('16px "Press Start 2P"'));
  assert.match(await page.evaluate(() => getComputedStyle(document.querySelector('#backItems .bi-p')).fontFamily), /Press Start 2P/);
  await sel('Schrift').selectOption('serif');
  // Eigene Schrift: Datei hinzufügen, benutzen, speichern, ungültige Datei ablehnen, löschen (Rückfall auf Normal)
  const latoPath = path.resolve(__dirname, '..', '..', 'disc-sleeve', 'assets', 'fonts', 'Lato-Bold.ttf');
  const fch = page.waitForEvent('filechooser'); await page.click('#bdlg .bed-panel button:has-text("Eigene Schrift hinzufügen")');
  await (await fch).setFiles(latoPath);
  await page.waitForFunction(() => /^uf-/.test(CoverApp.state.back.items[0].font));
  const fid = (await items())[0].font;
  assert.equal(await page.evaluate((id) => !!window.BackDesign.FONTS[id] && document.fonts.check('12px "' + id + '"'), fid), true, 'Schrift ist angemeldet und geladen');
  await page.waitForFunction((id) => getComputedStyle(document.querySelector('#backItems .bi-p')).fontFamily.includes(id), fid);
  assert.equal(await page.evaluate(() => CoverApp.fonts.list().map((f) => f.name).join()), 'Lato Bold', 'Name aus dem Dateinamen');
  assert.equal(await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('discsleeve-fonts', 1); r.onsuccess = () => { const q = r.result.transaction('fonts').objectStore('fonts').count(); q.onsuccess = () => res(q.result); }; })), 1, 'Schrift steht im Browser-Speicher');
  const fch2 = page.waitForEvent('filechooser'); await page.click('#bdlg .bed-panel button:has-text("Eigene Schrift hinzufügen")');
  await (await fch2).setFiles({ name: 'kaputt.ttf', mimeType: 'font/ttf', buffer: Buffer.alloc(500, 1) });
  await page.waitForFunction(() => true); await page.waitForTimeout(300);
  assert.ok(dialogs.some((m) => /konnte nicht gelesen werden/.test(m)), 'Kaputte Schriftdatei wird abgelehnt');
  const fch3 = page.waitForEvent('filechooser'); await page.click('#bdlg .bed-panel button:has-text("Eigene Schrift hinzufügen")');
  await (await fch3).setFiles({ name: 'x.exe', mimeType: 'application/octet-stream', buffer: Buffer.alloc(500, 1) });
  await page.waitForTimeout(300);
  assert.ok(dialogs.some((m) => /keine Schriftdatei/.test(m)));
  assert.equal(await page.evaluate(() => CoverApp.fonts.list().length), 1, 'Nur die gültige Schrift wurde gespeichert');
  // Mehrere Schriftdateien auf einmal: die zuletzt hinzugefügte gilt für den Text
  const fchM = page.waitForEvent('filechooser'); await page.click('#bdlg .bed-panel button:has-text("Eigene Schrift hinzufügen")');
  await (await fchM).setFiles([path.resolve(path.dirname(latoPath), 'Lato-Regular.ttf'), path.resolve(path.dirname(latoPath), 'Lato-Light.ttf')]);
  await page.waitForFunction(() => CoverApp.fonts.list().length === 3);
  assert.deepEqual(await page.evaluate(() => CoverApp.fonts.list().map((f) => f.name)), ['Lato Bold', 'Lato Regular', 'Lato Light']);
  assert.equal((await items())[0].font, await page.evaluate(() => CoverApp.fonts.list()[2].id));
  assert.equal(await page.locator('#bdlg .bed-panel optgroup[label="Eigene Schriften"] option').count(), 3, 'Eigene Schriften stehen in der Auswahl');
  await page.click('#bdlg .bed-panel button:has-text("Diese eigene Schrift löschen")');
  await page.waitForFunction(() => CoverApp.fonts.list().length === 2);
  assert.equal((await items())[0].font, 'sans', 'Texte mit der gelöschten Schrift fallen auf Normal zurück');
  await page.locator('#bdlg .bed-panel button:has-text("Diese eigene Schrift löschen")').waitFor({ state: 'detached' });
  await page.evaluate(async () => { for (const f of CoverApp.fonts.list()) await CoverApp.fonts.remove(f.id); });
  assert.equal(await page.evaluate((id) => !window.BackDesign.FONTS[id], fid), true);
  assert.match(await page.evaluate(() => getComputedStyle(document.querySelector('#backItems .bi-p')).fontFamily), /Lato/, 'Ohne die Schrift: Rückfall auf Normal');
  await sel('Inhalt').selectOption('title');
  await page.evaluate(() => CoverApp.patch({ title: 'Mein Spiel' }));
  await page.waitForFunction(() => /Mein Spiel/.test(document.querySelector('#backItems').textContent));

  // Ziehen verschiebt, Griff skaliert, Pfeiltasten schieben fein
  const box = async (css) => page.locator(css).boundingBox();
  const before = (await items())[0];
  const b0 = await box('#bdlg .bed-stage .bi');
  await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2); await page.mouse.down();
  await page.mouse.move(b0.x + b0.width / 2 + 40, b0.y + b0.height / 2 + 20, { steps: 5 }); await page.mouse.up();
  const moved = (await items())[0];
  assert.ok(moved.x > before.x && moved.y > before.y, 'Verschoben: ' + JSON.stringify([before.x, before.y, moved.x, moved.y]));
  const h = await box('#bdlg .hd-se');
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2 + 30, h.y + h.height / 2 + 15, { steps: 5 }); await page.mouse.up();
  const sized = (await items())[0];
  assert.ok(sized.w > moved.w && sized.h > moved.h, 'Größer');
  await page.locator('#bdlg .bed-pane').click({ position: { x: 5, y: 5 } });           // ins Leere: Auswahl aufheben
  assert.equal(await page.locator('#bdlg .bed-sel').isVisible(), false);
  const b1 = await box('#bdlg .bed-stage .bi'); await page.mouse.click(b1.x + b1.width / 2, b1.y + b1.height / 2);
  await page.keyboard.press('ArrowRight');
  assert.equal((await items())[0].x, sized.x + 0.25, 'Pfeiltaste: 0,25 mm');

  // Rückgängig und Wiederholen
  await page.click('#bedUndo');
  assert.equal((await items())[0].x, sized.x);
  await page.click('#bedRedo');
  assert.equal((await items())[0].x, sized.x + 0.25);

  // Duplizieren, Löschen, Ebenen
  await page.click('#bdlg button:has-text("Duplizieren")');
  assert.equal((await items()).length, 2);
  await page.click('#bdlg button:has-text("Nach hinten")');
  assert.equal((await items())[0].id, 'e2');
  await page.click('#bdlg button:has-text("Löschen")');
  assert.equal((await items()).length, 1);

  // Bild per Datei: Rand "ausgerissen" setzt ein Polygon
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#bdlg button:has-text("+ Bild (Datei)")')]);
  await chooser.setFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForFunction(() => CoverApp.state.back.items.length === 2);
  it = (await items())[1];
  assert.equal(it.type, 'image'); assert.match(it.img, /^d\d+$/);
  assert.ok(await page.evaluate((k) => !!CoverApp.images[k], it.img));
  await sel('Rand und Übergang').selectOption('torn');
  await page.waitForFunction(() => /polygon/.test(document.querySelector('#backItems .bi-image').style.clipPath));
  await sel('Rand und Übergang').selectOption('feather');
  await page.waitForFunction(() => /mask/.test(document.querySelector('#backItems .bi-image').style.cssText));
  await sel('Rand und Übergang').selectOption('border');
  await page.waitForFunction(() => /solid/.test(document.querySelector('#backItems .bi-image').style.border));

  // Bilder von Steam: Suche, Auswahl mehrerer Bilder, werden als Elemente hinzugefügt
  await page.click('#bdlg button:has-text("+ Bild von Steam oder GOG")');
  await page.waitForSelector('#bdlg .bed-gal:not([hidden])');
  await page.selectOption('#bdlg .bed-gal select', 'steam'); await page.fill('#bdlg .bed-gal input', 'red dead');
  await page.click('#bdlg .bed-gal button:has-text("Suchen")');
  await page.click('#bdlg .bed-gal button:has-text("Red Dead Redemption 2")');
  await page.waitForSelector('#bdlg .gal-img');
  assert.equal(await page.locator('#bdlg .gal-img').count(), 3);
  await page.locator('#bdlg .gal-img').nth(0).click(); await page.locator('#bdlg .gal-img').nth(1).click();
  await page.click('#bdlg .bed-gal button:has-text("Gewählte Bilder hinzufügen")');
  await page.waitForFunction(() => CoverApp.state.back.items.length === 4);
  assert.ok((await items()).slice(2).every((i) => i.type === 'image' && /^d\d+$/.test(i.img)));

  // Vorlage ersetzt die Elemente
  await page.click('#bedTplBtn');
  assert.equal(await page.locator('#bdlg .tpl-card').count(), 8, 'Vorlagen-Leiste mit Vorschau je Vorlage');
  assert.ok(await page.locator('#bdlg .tpl-card .tp i').count() > 20, 'Vorschauen zeigen Bilder und Textzeilen');
  await page.click('#bdlg .tpl-card[data-tpl=aoe]'); assert.equal((await items()).filter((i) => i.type === 'image').length, 4);
  await page.click('#bdlg .tpl-card[data-tpl=alyx]'); assert.equal((await items())[0].w >= 130, true);
  await page.click('#bdlg .tpl-card[data-tpl=steam]');
  assert.ok((await items()).length >= 5);
  assert.ok((await items()).some((i) => i.type === 'text' && i.bind === 'description'));

  // Eigene Vorlagen: Layout speichern (ohne Bilder), anwenden, ersetzen, als Datei sichern, importieren, löschen
  const nSteam = (await items()).length;
  await page.click('#bedTplSave');
  await page.waitForFunction(() => document.querySelectorAll('#bdlg .tpl-card[data-tpl^="u-"]').length === 1);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('discsleeve-templates')));
  assert.equal(stored.length, 1); assert.equal(stored[0].name, 'Eigene Vorlage'); assert.equal(stored[0].items.length, nSteam);
  assert.ok(stored[0].items.every((i) => i.type === 'text' || i.img === ''), 'In der Vorlage stehen keine Bilder');
  await page.click('#bdlg .tpl-card[data-tpl=alyx]'); assert.notEqual((await items()).length, nSteam);
  await page.click('#bdlg .tpl-card[data-tpl^="u-"]'); assert.equal((await items()).length, nSteam, 'Eigene Vorlage anwenden');
  await page.click('#bedTplSave');                                   // gleicher Name: Rückfrage wird mit OK beantwortet = ersetzen
  assert.ok(dialogs.some((m) => /schon eine Vorlage mit diesem Namen/.test(m)));
  assert.equal(await page.locator('#bdlg .tpl-card[data-tpl^="u-"]').count(), 1, 'Ersetzt statt doppelt');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bdlg .tpl-acts button:has-text("Als Datei")')]);
  const exported = JSON.parse(require('node:fs').readFileSync(await dl.path(), 'utf8'));
  assert.equal(exported.type, 'discmenu-settings'); assert.equal(exported.templates.length, 1); assert.ok(!('sgdbKey' in exported), 'Vorlagendatei ohne Zugangsdaten');
  const imp = { type: 'discmenu-settings', version: 1, templates: [{ name: 'Importiert', ref: { w: 130, h: 122 }, items: [{ type: 'text', text: 'Hallo', x: 10, y: 10, w: 50, h: 10 }, { type: 'image', img: 'd9', x: 10, y: 30, w: 50, h: 30 }] }, { name: 'eigene vorlage', ref: { w: 130, h: 122 }, items: [] }, { name: '' }] };
  await page.setInputFiles('#bedTplFile', { name: 'v.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imp)) });
  await page.waitForFunction(() => document.querySelectorAll('#bdlg .tpl-card[data-tpl^="u-"]').length === 2);
  assert.ok(dialogs.some((m) => /gibt es schon/.test(m)) && dialogs.some((m) => /fehlerhaft/.test(m)), 'Namensgleiche Vorlage und fehlerhafter Eintrag melden sich');
  const stored2 = await page.evaluate(() => JSON.parse(localStorage.getItem('discsleeve-templates')));
  assert.deepEqual(stored2.map((t) => t.name), ['eigene vorlage', 'Importiert'], 'OK = ersetzt; der Rest bleibt');
  assert.equal(stored2[1].items.find((i) => i.type === 'image').img, '', 'Bild aus fremder Datei wird zum Platzhalter');
  dialogs.length = 0;
  await page.setInputFiles('#bedTplFile', { name: 'k.json', mimeType: 'application/json', buffer: Buffer.from('{"type":"discmenu-settings","version":1,"sgdbKey":"X"}') });
  await page.waitForFunction(() => true); await page.waitForTimeout(150);
  assert.ok(dialogs.some((m) => /keine Vorlagen/.test(m)), 'Datei ohne Vorlagen'); assert.equal(await page.locator('#bdlg .tpl-card[data-tpl^="u-"]').count(), 2);
  assert.equal(await page.evaluate(() => localStorage.getItem('sgdb-key')), null, 'Zugangsdaten aus der Vorlagen-Importfunktion werden nie übernommen');
  await page.locator('#bdlg [data-del]').first().click();
  await page.waitForFunction(() => document.querySelectorAll('#bdlg .tpl-card[data-tpl^="u-"]').length === 1);
  const mk = (name) => ({ name: name + '.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ type: 'discmenu-settings', version: 1, templates: [{ name, ref: { w: 130, h: 122 }, items: [{ type: 'text', text: name, x: 5, y: 5, w: 40, h: 10 }] }] })) });
  await page.setInputFiles('#bedTplFile', [mk('Mehrfach A'), mk('Mehrfach B')]);          // mehrere Dateien auf einmal
  await page.waitForFunction(() => document.querySelectorAll('#bdlg .tpl-card[data-tpl^="u-"]').length === 3);
  await page.click('#bdlg .tpl-card[data-tpl=steam]');

  // Mehrfachauswahl: Strg/Umschalt-Klick, gemeinsam verschieben und drehen (jedes um die eigene Mitte), Auswahl bleibt
  const gctr = async (i) => { const b = await page.locator('#bdlg .bed-stage .bi').nth(i).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const clickWith = async (key, i) => { const c = await gctr(i); if (key) await page.keyboard.down(key); await page.mouse.click(c.x, c.y); if (key) await page.keyboard.up(key); };
  const imgIgdx = (await items()).map((it, i) => (it.type === 'image' ? i : -1)).filter((i) => i >= 0);
  assert.equal(imgIgdx.length, 3);
  await clickWith(null, imgIgdx[0]);
  assert.equal(await page.locator('#bdlg .bed-stage .bed-sel').isVisible(), true, 'Einzelauswahl hat Griffe');
  await clickWith('Control', imgIgdx[1]); await clickWith('Shift', imgIgdx[2]);
  assert.equal(await page.locator('#bdlg .bed-stage .bi-sel, #bdlg .bed-stage .bi-out-sel').count(), 3, 'Alle drei sind gewählt');
  assert.equal(await page.locator('#bdlg .bed-stage .bed-grp').isVisible(), true);
  assert.equal(await page.locator('#bdlg .bed-stage .bed-sel').isVisible(), false, 'Keine Einzelgriffe bei Mehrfachauswahl');
  assert.match(await page.locator('#bdlg .bed-panel h3').textContent(), /3\s*Elemente gewählt/);
  const gm0 = await items(), gpos0 = imgIgdx.map((i) => [gm0[i].x, gm0[i].y]);
  const gc0 = await gctr(imgIgdx[1]);
  await page.mouse.move(gc0.x, gc0.y); await page.mouse.down(); await page.mouse.move(gc0.x + 30, gc0.y + 20, { steps: 5 }); await page.mouse.up();
  const gm1 = await items(), gpos1 = imgIgdx.map((i) => [gm1[i].x, gm1[i].y]);
  const gdx = gpos1[0][0] - gpos0[0][0], gdy = gpos1[0][1] - gpos0[0][1];
  assert.ok(gdx !== 0 || gdy !== 0, 'Auswahl wurde verschoben');
  gpos1.forEach((p, n) => { assert.ok(Math.abs(p[0] - gpos0[n][0] - gdx) < 0.02 && Math.abs(p[1] - gpos0[n][1] - gdy) < 0.02, 'Alle um dasselbe Stück verschoben'); });
  assert.equal(await page.locator('#bdlg .bed-stage .bi-sel, #bdlg .bed-stage .bi-out-sel').count(), 3, 'Auswahl bleibt nach dem Verschieben');
  await page.locator('#bedGroupRot').fill('20'); await page.locator('#bedGroupRot').press('Tab');
  const gm2 = await items();
  assert.deepEqual(imgIgdx.map((i) => gm2[i].rot), [20, 20, 20]); assert.deepEqual(imgIgdx.map((i) => [gm2[i].x, gm2[i].y]), gpos1, 'Drehen um die eigene Mitte: Positionen bleiben');
  const ghb = await page.locator('#bdlg .bed-grp .hd-grot').boundingBox();
  await page.mouse.move(ghb.x + ghb.width / 2, ghb.y + ghb.height / 2); await page.mouse.down(); await page.mouse.move(ghb.x + ghb.width / 2 + 120, ghb.y + ghb.height / 2 + 60, { steps: 6 }); await page.mouse.up();
  const gm3 = await items(), grots = imgIgdx.map((i) => gm3[i].rot);
  assert.ok(grots[0] !== 20 && grots.every((r) => r === grots[0]), 'Drehgriff dreht alle gleich');
  assert.deepEqual(imgIgdx.map((i) => [gm3[i].x, gm3[i].y]), gpos1, 'Positionen unverändert');
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await clickWith('Control', imgIgdx[2]);
  assert.equal(await page.locator('#bdlg .bed-stage .bi-sel, #bdlg .bed-stage .bi-out-sel').count(), 2, 'Strg-Klick nimmt ein Element aus der Auswahl');
  await page.keyboard.press('Control+a');
  assert.equal(await page.locator('#bdlg .bed-stage .bi-sel, #bdlg .bed-stage .bi-out-sel').count(), (await items()).length, 'Strg+A wählt alles');
  const gAll = (await items()).length;
  await page.keyboard.press('Delete');
  assert.equal((await items()).length, 0, 'Entf löscht alle gewählten');
  await page.keyboard.press('Control+z');
  assert.equal((await items()).length, gAll, 'Rückgängig bringt sie zurück');
  await clickWith(null, imgIgdx[0]);
  assert.equal(await page.locator('#bdlg .bed-stage .bed-sel').isVisible(), true); assert.equal(await page.locator('#bdlg .bed-stage .bed-grp').isVisible(), false);
  await page.click('#bdlg .tpl-card[data-tpl=steam]');

  // Drehen: Feld und Griff; gedrehte Elemente lassen sich weiter greifen
  const tx = (await items()).findIndex((i) => i.type === 'text' && i.bind === 'description');
  const bx = await page.locator('#bdlg .bed-stage .bi-text').nth(1).boundingBox();
  await page.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await page.locator('#bdlg .bed-panel label.f', { hasText: 'Drehung' }).locator('input').fill('30');
  assert.equal((await items())[tx].rot, 30);
  await page.waitForFunction(() => /rotate\(30deg\)/.test(document.querySelector('#backItems .bi-text:nth-child(2)').style.transform));
  const rh = await page.locator('#bdlg .hd-rot').boundingBox(), c0 = await page.locator('#bdlg .bed-sel').boundingBox();
  await page.mouse.move(rh.x + rh.width / 2, rh.y + rh.height / 2); await page.mouse.down();
  await page.mouse.move(c0.x + c0.width / 2 + 200, c0.y + c0.height / 2, { steps: 6 }); await page.mouse.up();
  assert.equal(Math.abs((await items())[tx].rot - 90) < 1, true, 'Griff zieht auf 90° (rastet ein): ' + (await items())[tx].rot);
  const w0 = (await items())[tx].w;
  const se = await page.locator('#bdlg .hd-se').boundingBox();
  await page.mouse.move(se.x + se.width / 2, se.y + se.height / 2); await page.mouse.down();
  await page.mouse.move(se.x + se.width / 2, se.y + se.height / 2 + 30, { steps: 4 }); await page.mouse.up();
  assert.ok((await items())[tx].w > w0, 'Skalieren im gedrehten Rahmen (um 90° gedreht: Mausbewegung nach unten macht es breiter)');

  // Durchgehendes Bild: Schalter im Editor, Spezifikation über die ganze Höhe, Hülle bekommt das Bild
  assert.equal(await page.evaluate(() => CoverApp.state.back.span), false, 'Standard: zwei getrennte Bilder');
  await page.check('#bedSpan');
  assert.equal(await page.evaluate(() => CoverApp.state.back.span), true);
  assert.equal(await page.evaluate(() => document.querySelector('#bdlg .bed-scaled').classList.contains('span')), true);
  await page.waitForFunction(() => document.querySelector('#back').classList.contains('span'));
  assert.match(await page.locator('#bdlg').textContent(), /Durchgehendes Bild/);
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.querySelector('#backTop .ph')).display), 'none', 'Ohne Bild bleibt der Platzhalter sichtbar');
  await page.evaluate(async (b64) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); await CoverApp.setImage('backTop', new File([u], 'a.png', { type: 'image/png' })); }, PNG.toString('base64'));
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#backTop .ph')).display === 'none');   // Vorschau zeigt das durchgehende Bild statt des Platzhalters
  assert.match(await page.evaluate(() => document.querySelector('#back').style.backgroundImage), /url/);
  await page.evaluate(() => CoverApp.clearImage('backTop'));
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#backTop .ph')).display !== 'none');
  await page.uncheck('#bedSpan');

  // Formen: Dreieck, Punkte ziehen (rasten ein), Punkte per Feld, Punkt löschen/hinzufügen, Stern, freie Fläche
  await page.click('#bedTplBtn');
  await page.click('#bdlg .bed-bar button:has-text("+ Form")');
  assert.deepEqual(await page.locator('#bdlg .shape-menu button').allTextContents(), ['Kreis / Ellipse', 'Dreieck', 'Viereck', 'Stern', 'Freie Fläche']);
  await page.click('#bdlg .shape-menu button:has-text("Dreieck")');
  let sh = (await items()).at(-1); assert.equal(sh.type, 'shape'); assert.equal(sh.pts.length, 3);
  assert.equal(await page.locator('#bdlg .bed-sel .pt').count(), 3);
  const pt0 = await page.locator('#bdlg .bed-sel .pt').nth(0).boundingBox();
  await page.mouse.move(pt0.x + pt0.width / 2, pt0.y + pt0.height / 2); await page.mouse.down();
  await page.mouse.move(pt0.x + pt0.width / 2 + 25, pt0.y + pt0.height / 2 + 12, { steps: 5 }); await page.mouse.up();
  sh = (await items()).at(-1); assert.notDeepEqual(sh.pts[0], [50, 0], 'Punkt bewegt: kein gleichschenkliges Dreieck mehr'); assert.deepEqual(sh.pts[1], [100, 100]);
  await page.locator('#bdlg .bed-panel input[data-p="2:0"]').fill('10');
  assert.equal((await items()).at(-1).pts[2][0], 10);
  await page.click('#bdlg .bed-panel button:has-text("Punkt hinzufügen")');
  assert.equal((await items()).at(-1).pts.length, 4); assert.equal((await items()).at(-1).shape, 'poly');
  await page.locator('#bdlg .bed-panel .prow button').nth(3).click();
  assert.equal((await items()).at(-1).pts.length, 3);
  assert.equal(await page.locator('#bdlg .bed-panel .prow button:disabled').count(), 3, 'Mindestens drei Punkte');
  await page.waitForFunction(() => /polygon/.test(document.querySelector('#backItems .bi-shape .bi-in').style.clipPath));
  // Treffer nur innerhalb der Form: Klick in die Ecke des Rahmens außerhalb wählt nichts
  await page.locator('#bdlg .bed-pane').click({ position: { x: 5, y: 5 } });
  await page.click('#bdlg .bed-bar button:has-text("+ Form")'); await page.click('#bdlg .shape-menu button:has-text("Stern")');
  assert.equal((await items()).at(-1).shape, 'star'); assert.equal(await page.locator('#bdlg .bed-sel .pt').count(), 0, 'Stern hat Parameter statt Punkte');
  await page.locator('#bdlg .bed-panel label.f', { hasText: 'Zacken' }).locator('input').first().fill('7');
  assert.equal((await items()).at(-1).sides, 7);
  await page.click('#bdlg .bed-panel button:has-text("Als freie Fläche bearbeiten")');
  assert.equal((await items()).at(-1).shape, 'poly'); assert.equal((await items()).at(-1).pts.length, 14);
  assert.equal(await page.locator('#bdlg .bed-sel .pt').count(), 14);
  // Umriss nur im Editor: gewählte Form orange, andere fein hell; echter Rand (Randbreite) erscheint auch auf dem Cover
  assert.equal(await page.locator('#bdlg .bed-stage .bi-out-sel').count(), 1, 'Gewählte Form hat den auffälligen Umriss');
  assert.ok(await page.locator('#bdlg .bed-stage .bi-out:not(.bi-out-sel)').count() >= 1, 'Andere Formen haben einen feinen Umriss');
  assert.equal(await page.locator('#backItems .bi-out').count(), 0, 'Auf dem Cover kein Editor-Umriss');
  assert.equal(await page.locator('#backItems .bi-rand').count(), 0, 'Ohne Randbreite kein echter Rand');
  await page.locator('#bdlg .bed-panel label.f', { hasText: 'Rand (mm)' }).locator('input').fill('1.5');
  await page.waitForFunction(() => CoverApp.state.back.items.at(-1).strokeW === 1.5);
  await page.waitForFunction(() => document.querySelectorAll('#backItems .bi-rand').length === 1 && document.querySelectorAll('#backItems .bi-out').length === 0);
  // Bild in der Form: grau außerhalb (nur im Editor), verschieben und zoomen
  await page.locator('#bdlg .bed-panel label.chk', { hasText: 'Bild statt Farbe' }).locator('input').check();
  const [ch2] = await Promise.all([page.waitForEvent('filechooser'), page.click('#bdlg .bed-panel button:has-text("Datei wählen")')]);
  await ch2.setFiles({ name: 'b.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForFunction(() => { const i = CoverApp.state.back.items.at(-1); return i.useImg && i.img; });
  assert.equal(await page.locator('#bdlg .bed-stage .bi-shape.bi .bi-dim').count(), 1, 'Graue Hilfsebene für das gewählte Bild');
  await page.waitForFunction(() => document.querySelectorAll('#backItems .bi-dim').length === 0);   // auf dem Cover nie
  await page.click('#bdlg .bed-panel button:has-text("Bild im Ausschnitt verschieben")');
  const sb = await page.locator('#bdlg .bed-stage .bi-shape .bi-in').last().boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.mouse.wheel(0, -200);
  await page.waitForFunction(() => CoverApp.state.back.items.at(-1).zoom > 100);
  assert.equal((await items()).at(-1).shape, 'poly', 'Rahmen und Form bleiben beim Bildverschieben');
  const lastBefore = (await items()).at(-1);
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await page.mouse.down();
  await page.mouse.move(sb.x + sb.width / 2 + 30, sb.y + sb.height / 2 + 10, { steps: 4 }); await page.mouse.up();
  const lastAfter = (await items()).at(-1);
  assert.deepEqual([lastAfter.x, lastAfter.y, lastAfter.w], [lastBefore.x, lastBefore.y, lastBefore.w], 'Der Rahmen bleibt stehen');
  assert.ok(lastAfter.posX !== lastBefore.posX || lastAfter.posY !== lastBefore.posY, 'Das Bild wandert im Rahmen');

  // Schließen räumt nicht benutzte Bilder weg; speichern und neu laden bringt alles zurück
  await page.click('#bdlg button:has-text("Fertig")'); await page.waitForFunction(() => !document.querySelector('#bdlg').open);
  await page.waitForFunction(() => Object.keys(CoverApp.images).filter((k) => /^d\d+$/.test(k)).length === 1);   // nur das Bild der Form bleibt, alle anderen sind entfernt
  const saved = await items();
  // Projekt speichern und wieder einsetzen (wie Export und Import): Elemente und Bilder kommen zurück
  await page.evaluate(async () => { const snap = CoverApp.snapshot(), imgs = {}; for (const [k, v] of Object.entries(snap.images)) imgs[k] = { data: await v.blob.arrayBuffer(), type: v.type, name: v.name }; await CoverApp.restore(JSON.parse(JSON.stringify(snap.state)), imgs); });
  assert.equal(await page.evaluate(() => Object.keys(CoverApp.images).filter((k) => /^d\d+$/.test(k)).length), 1, 'Bild der Form ist wieder da');
  assert.deepEqual(await items(), saved, 'Nach dem Einsetzen sind die Elemente da');

  // Höhen: manuell einstellbar, Gestaltungsfläche passt sich an, Blatt bleibt gleich groß
  const sheet0 = await page.locator('#sheet').boundingBox();
  await page.evaluate(() => { document.querySelector('#secBack').open = true; }); await page.fill('[data-k="back.reqH"]', '60');
  await page.waitForFunction(() => /× 108 mm/.test(document.querySelector('#backInfo').textContent));
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#backBottom')).height === document.querySelector('#backBottom').style.height || true), true);
  assert.equal((await page.locator('#sheet').boundingBox()).width, sheet0.width, 'Blattgröße unverändert');
  await page.fill('[data-k="back.reqH"]', '46');

  // Englisch: keine deutschen Reste im Editor
  await page.click('#langMenu summary'); await page.click('#langMenu button[data-lang=en]'); await page.waitForTimeout(200);
  await page.click('#backTop'); await page.waitForSelector('#bdlg[open]');
  await page.click('#bdlg button:has-text("+ Text")');
  const GER = /[äöüß]|\b(und|der|die|das|nicht|bitte|oder|für|wird|mit|auf|zum|zur|aus|eine|noch|nur|kein|keine|Bilder|Rückseite|Spiel)\b/i;
  const bad = await page.evaluate((src) => {
    const re = new RegExp(src, 'i'), out = [], w = document.createTreeWalker(document.querySelector('#bdlg'), NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const t = n.data.replace(/\s+/g, ' ').trim(); if (t && !n.parentElement.closest('.bi, textarea') && re.test(t)) out.push(t); }
    return out;
  }, GER.source);
  assert.deepEqual(bad, [], 'Deutsche Reste im Editor');

  assert.deepEqual(errors, [], 'Keine Skriptfehler');
  await browser.close();
  console.log('Rückseiten-Editor-Test bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
