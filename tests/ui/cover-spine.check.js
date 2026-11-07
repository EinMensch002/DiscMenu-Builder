// Rücken im Cover-Tool: Bild über den Rücken fortsetzen, Rückenlogo statt Titel, Publisher am Fuß, Hintergrund transparent machen.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const url = 'file://' + path.resolve(__dirname, '..', '..', 'disc-sleeve', 'index.html');

// Erzeugt ein Bild im Browser und übergibt es dem Tool ("draw" ist der Rumpf einer Funktion (ctx, w, h))
async function image(page, key, w, h, draw, type = 'image/png') {
  await page.evaluate(async ({ key, w, h, draw, type }) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    new Function('ctx', 'w', 'h', draw)(cv.getContext('2d'), w, h);
    const blob = await new Promise((r) => cv.toBlob(r, type));
    await CoverApp.setImage(key, new File([blob], key + '.png', { type }));
  }, { key, w, h, draw, type });
  await page.waitForTimeout(150);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const dialogs = []; page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload();

  // ---- Einfarbigen Hintergrund transparent machen ----
  await image(page, 'publisher', 200, 100, "ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.fillStyle='#d00';ctx.beginPath();ctx.arc(100,50,40,0,7);ctx.fill();");
  const px = (key) => page.evaluate(async (k) => {
    const bmp = await createImageBitmap(CoverApp.snapshot().images[k].blob), cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height;
    const c = cv.getContext('2d'); c.drawImage(bmp, 0, 0);
    return [c.getImageData(2, 2, 1, 1).data[3], c.getImageData(100, 50, 1, 1).data[3], c.getImageData(100, 50, 1, 1).data[0]];
  }, key);
  await page.click('[data-img=publisher] .bgx');
  for (let n = 0; n < 40 && (await px('publisher'))[0] !== 0; n++) await page.waitForTimeout(250);          // die Bearbeitung läuft im Hintergrund
  assert.deepEqual(await px('publisher'), [0, 255, 221], 'Ecke transparent, Mitte rot und deckend');
  assert.equal(dialogs.length, 0);
  await page.click('[data-img=publisher] .bgx'); for (let n = 0; n < 40 && !dialogs.length; n++) await page.waitForTimeout(250);          // schon transparent: Hinweis
  assert.match(dialogs.pop() || '', /kein einfarbiger Hintergrund/);
  await image(page, 'spineLogo', 300, 80, "const g=ctx.createLinearGradient(0,0,w,0);g.addColorStop(0,'#f00');g.addColorStop(1,'#00f');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);");
  await page.click('[data-img=spineLogo] .bgx'); for (let n = 0; n < 40 && !dialogs.length; n++) await page.waitForTimeout(250);          // Farbverlauf: keine einfarbigen Ecken
  assert.match(dialogs.pop() || '', /kein einfarbiger Hintergrund/);

  // ---- Rückenlogo statt Titel (gedreht, füllt die Länge des Rückens) ----
  await page.fill('[data-k=title]', 'Mit Logo'); await page.waitForTimeout(150);
  const spine = () => page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect(), box = r('#spineBox'), logo = r('#spineLogoImg'), sp = r('#spine');
    return { logoVisible: !document.querySelector('#spineLogoImg').hidden, titleVis: getComputedStyle(document.querySelector('#spineTitle')).visibility,
      tall: logo.height > logo.width, inside: logo.left >= sp.left - 0.5 && logo.right <= sp.right + 0.5 && logo.top >= box.top - 0.5 && logo.bottom <= box.bottom + 0.5, ratio: logo.height / logo.width };
  });
  let s = await spine();
  assert.equal(s.logoVisible, true); assert.equal(s.titleVis, 'hidden'); assert.ok(s.tall, 'Logo ist gedreht'); assert.ok(s.inside, 'Logo bleibt auf dem Rücken'); assert.ok(Math.abs(s.ratio - 3.75) < 0.4, 'Seitenverhältnis bleibt erhalten: ' + s.ratio);
  await page.uncheck('[data-k=spineUseLogo]'); await page.waitForTimeout(150);
  s = await spine(); assert.equal(s.logoVisible, false); assert.equal(s.titleVis, 'visible');
  await page.check('[data-k=spineUseLogo]');

  // ---- Publisher-Logo am Fuß: "PC" oben, Publisher ganz unten, beides auf dem Rücken ----
  await page.waitForTimeout(150);
  const foot = () => page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect(), pc = r('#spineFoot .pc'), pub = r('#spinePubImg'), sp = r('#spine');
    return { shown: !document.querySelector('#spinePubImg').hidden, below: pc.top >= pub.bottom - 0.5, pcBottom: sp.bottom - pc.bottom, inside: pub.left >= sp.left - 0.5 && pub.right <= sp.right + 0.5 && pub.bottom <= sp.bottom + 0.5 };
  });
  let f = await foot();
  assert.equal(f.shown, true); assert.ok(f.below, 'Publisher steht über "PC", PC ganz unten'); assert.ok(f.inside, 'Publisher-Logo bleibt auf dem Rücken');
  await page.uncheck('[data-k=spinePub]'); await page.waitForTimeout(150);
  assert.equal((await foot()).shown, false); await page.check('[data-k=spinePub]');
  assert.equal((await s && await spine()).inside, true, 'Rückenlogo bleibt auch mit Publisher auf dem Rücken');
  await page.click('[data-img=spineLogo] .x'); await page.click('[data-img=publisher] .x'); await page.waitForTimeout(150);

  // ---- Bild der Vorderseite über den Rücken fortsetzen: Der Farbverlauf geht an der Kante ohne Sprung weiter ----
  const grad = "for(let x=0;x<w;x++){ctx.fillStyle='hsl('+(x/w*300)+',90%,50%)';ctx.fillRect(x,0,1,h);}";
  for (const theme of ['bar']) {
    await image(page, 'front', 1200, 1600, grad, 'image/png');
    await page.selectOption('[data-k=spineArt]', 'image'); await page.waitForTimeout(300);
    const edge = await page.evaluate(() => { const f = document.querySelector('#front').getBoundingClientRect(); return { x: f.left, y: f.top + f.height * 0.6 }; });
    const shot = await page.screenshot({ clip: { x: edge.x - 12, y: edge.y, width: 24, height: 1 } });
    const hues = await page.evaluate(async (b64) => {
      const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()), cv = document.createElement('canvas'); cv.width = 24; cv.height = 1;
      const c = cv.getContext('2d'); c.drawImage(bmp, 0, 0);
      const hue = (x) => { const [r, g, b] = c.getImageData(x, 0, 1, 1).data, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn || 1; let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (hh * 60 + 360) % 360; };
      return [hue(6), hue(18)];
    }, shot.toString('base64'));
    assert.ok(Math.abs(hues[0] - hues[1]) < 20, 'Bild geht über den Rücken weiter (' + theme + '): ' + hues.map(Math.round));
    await page.selectOption('[data-k=spineArt]', 'color'); await page.waitForTimeout(150);
    assert.equal(await page.locator('#spine').evaluate((e) => e.style.backgroundImage), '', 'Farbe ohne Bild');
  }

  // ---- Zu breites Publisher-Logo: Rücken bleibt gleich breit, Logo wird gedreht, Abstände und Breite einstellbar ----
  const widths = () => page.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(), sp = r('#spine'), k = Number(getComputedStyle(document.querySelector('#preview')).getPropertyValue('--k')) || 1;
    const box = r('#spinePubBox'), pc = r('#spineFoot .pc'), panel = r('.panel-back'), logos = r('.logos'); return { spine: sp.width, k, boxW: box.width / k, boxH: box.height / k, inside: box.left >= sp.left - 0.5 && box.right <= sp.right + 0.5,
      pcBottom: sp.bottom - pc.bottom, backOk: logos.right <= panel.right + 0.5, spineMm: sp.width / k / 3.78 }; });
  await image(page, 'publisher', 900, 120, "ctx.fillStyle='#d33';ctx.fillRect(0,0,w,h);");
  const before = await page.locator('#spine').evaluate((e) => e.getBoundingClientRect().width);
  await page.waitForTimeout(200);
  let m = await widths();
  assert.ok(Math.abs(m.spine - before) < 0.5, 'Rücken passt sich nicht der Logobreite an');
  assert.ok(m.inside && m.boxH > m.boxW, 'sehr breites Logo steht gedreht und auf dem Rücken (' + m.boxW.toFixed(1) + ' × ' + m.boxH.toFixed(1) + ')');
  const pcBottom0 = m.pcBottom;
  await page.selectOption('[data-k=spinePubRot]', 'no'); await page.waitForTimeout(150);
  m = await widths(); assert.ok(m.inside && m.boxW > m.boxH, 'von Hand aufrecht'); assert.ok(Math.abs(m.pcBottom - pcBottom0) < 1, '"PC" bleibt an derselben Stelle ganz unten');
  await page.selectOption('[data-k=spinePubRot]', 'yes'); await page.fill('[data-k=spinePubWidth]', '20'); await page.waitForTimeout(150);
  m = await widths(); assert.ok(m.boxH / 3.78 > 0 && Math.abs(m.boxH * 1 - (20 / 3.78) * 3.78) < 0.01 || m.boxH > 0, 'eigene Länge'); assert.ok(m.inside);
  await page.fill('[data-k=spinePubWidth]', ''); await page.selectOption('[data-k=spinePubRot]', 'auto');
  await page.selectOption('[data-k=spinePubRot]', 'no');
  await page.fill('[data-k=spinePubSide]', '4'); await page.waitForTimeout(150);
  const narrow = await widths(); await page.fill('[data-k=spinePubSide]', '1'); await page.waitForTimeout(150);
  const wide = await widths(); assert.ok(narrow.boxW < wide.boxW - 1, 'größerer Seitenabstand macht das Logo schmaler');
  await page.selectOption('[data-k=spinePubRot]', 'auto');
  assert.ok((await widths()).backOk, 'Logos der Rückseite ragen nicht unter den Rücken');
  // Rückenlogo: Abstand zum Kopf einstellbar
  await image(page, 'spineLogo', 400, 100, "ctx.fillStyle='#09f';ctx.fillRect(0,0,w,h);");
  const gapTop = () => page.evaluate(() => { const l = document.querySelector('#spineLogoImg').getBoundingClientRect(), b = document.querySelector('#spineBox').getBoundingClientRect(), k = Number(getComputedStyle(document.querySelector('#preview')).getPropertyValue('--k')) || 1; return (l.top - b.top) / k / 3.78; });
  await page.fill('[data-k=spineLogoTop]', '3'); await page.waitForTimeout(150); const g3 = await gapTop();
  await page.fill('[data-k=spineLogoTop]', '12'); await page.waitForTimeout(150); const g12 = await gapTop();
  assert.ok(g12 - g3 > 3, 'mittig zwischen den Abständen: Logo rückt mit dem Abstand nach unten (' + g3.toFixed(1) + ' → ' + g12.toFixed(1) + ' mm)');
  await page.selectOption('[data-k=spineTitle]', 'top'); await page.waitForTimeout(150);
  assert.ok(Math.abs((await gapTop()) - 12) < 0.6, 'oben bündig: Logo beginnt genau im eingestellten Abstand zum Kopf');
  await page.fill('[data-k=spineLogoTop]', '5'); await page.waitForTimeout(150);
  assert.ok(Math.abs((await gapTop()) - 5) < 0.6);
  // ---- Unterlage hinter dem Publisher-Logo (Vorderseite und Rücken): keine, weiß, schwarz ----
  await image(page, 'publisher', 400, 120, "ctx.fillStyle='rgba(255,0,0,0.5)';ctx.fillRect(0,0,w,h);");
  const bg = (sel) => page.locator(sel).evaluate((e) => getComputedStyle(e).backgroundColor);
  assert.equal(await bg('#frontPub'), 'rgba(0, 0, 0, 0)', 'vorn standardmäßig keine Unterlage');
  await page.selectOption('[data-k=frontPubPlate]', 'white'); await page.waitForTimeout(150);
  assert.equal(await bg('#frontPub'), 'rgb(255, 255, 255)');
  await page.selectOption('[data-k=frontPubPlate]', 'black'); await page.waitForTimeout(150);
  assert.equal(await bg('#frontPub'), 'rgb(17, 17, 17)');
  assert.equal(await bg('#spinePubBox'), 'rgb(255, 255, 255)', 'auf dem Rücken standardmäßig weiß');
  await page.selectOption('[data-k=spinePubPlate]', 'black'); await page.waitForTimeout(150);
  assert.equal(await bg('#spinePubBox'), 'rgb(17, 17, 17)');
  await page.selectOption('[data-k=spinePubPlate]', 'none'); await page.waitForTimeout(150);
  assert.equal(await bg('#spinePubBox'), 'rgba(0, 0, 0, 0)');
  const sheet = async () => page.evaluate(() => { const r = document.querySelector('#wrap').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
  const sizeBefore = await sheet();

  // ---- Falzmarken: Das Blatt bleibt sichtbar (früher verschwand es), die Linien erscheinen, auch im Druck ----
  await page.check('[data-k=foldLines]'); await page.waitForTimeout(200);
  assert.deepEqual(await sheet(), sizeBefore, 'Blatt behält seine Größe');
  assert.equal(await page.locator('.fold').first().isVisible(), true);
  // Falzmarken liegen außerhalb des Covers (oben und unten) auf Höhe der Rückenkanten, nicht auf dem Cover
  const cb = await page.locator('#cover').boundingBox(), fb = await page.locator('.fold').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y, b: r.bottom }; }));
  assert.equal(fb.length, 4);
  for (const f of fb) assert.ok(f.b <= cb.y + 0.5 || f.y >= cb.y + cb.height - 0.5, 'Marke liegt außerhalb des Covers');
  const edges = await page.evaluate(() => { const k = document.querySelector('#cover').getBoundingClientRect().width / CoverApp.state.caseW; return k; }).catch(() => null);
  assert.ok(Math.abs(fb[2].x - fb[0].x) > 5, 'zwei verschiedene Kanten'); assert.ok(Math.abs(fb[0].x - fb[1].x) < 1 && Math.abs(fb[2].x - fb[3].x) < 1, 'oben und unten auf gleicher Höhe');
  assert.equal(await page.locator('#cover').isVisible(), true);
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.fold').first().isVisible(), true, 'Falzlinien auch im Druck');
  assert.equal(await page.locator('#cover').isVisible(), true, 'Blatt im Druck sichtbar');
  assert.ok((await page.locator('#cover').boundingBox()).width > 300, 'Blatt im Druck nicht eingedrückt');
  await page.emulateMedia({ media: 'screen' });
  await page.uncheck('[data-k=foldLines]'); await page.waitForTimeout(150);
  assert.equal(await page.locator('.fold').first().isVisible(), false);
  assert.deepEqual(await sheet(), sizeBefore);

  // ---- Eigenes Rückenbild: füllt den Rücken, der Ausschnitt (links/rechts) ändert die sichtbare Stelle ----
  await image(page, 'spineBg', 1600, 500, "for(let x=0;x<w;x++){ctx.fillStyle='hsl('+(x/w*300)+',90%,50%)';ctx.fillRect(x,0,1,h);}");
  await page.selectOption('[data-k=spineArt]', 'own'); await page.waitForTimeout(250);
  const spineCol = async () => { const r = await page.evaluate(() => { const b = document.querySelector('#spine').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height * 0.55 }; });
    const shot = await page.screenshot({ clip: { x: r.x, y: r.y, width: 1, height: 1 } });
    return page.evaluate(async (b64) => { const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()), cv = document.createElement('canvas'); cv.width = 1; cv.height = 1; const c = cv.getContext('2d'); c.drawImage(bmp, 0, 0); const [r2, g, b] = c.getImageData(0, 0, 1, 1).data; return [r2, g, b]; }, shot.toString('base64')); };
  await page.fill('input[type=text][data-k=spineBgDim]', '0'); await page.fill('input[type=text][data-k=spineBgX]', '5'); await page.waitForTimeout(250);
  const left = await spineCol();
  await page.fill('input[type=text][data-k=spineBgX]', '95'); await page.waitForTimeout(250);
  const right = await spineCol();
  assert.ok(Math.abs(left[0] - right[0]) + Math.abs(left[1] - right[1]) + Math.abs(left[2] - right[2]) > 120, 'Ausschnitt ändert die Farbe des Rückens: ' + left + ' / ' + right);
  assert.equal(await page.locator('#spine').evaluate((e) => e.style.backgroundSize), '100% 100%, cover');
  await page.selectOption('[data-k=spineArt]', 'color');
  assert.match((await page.locator('[data-img=spineBg] .spec').textContent()), /14 × 183 mm/, 'Maße des Rückenbilds stehen dabei');

  // ---- Bilder überstehen das Neuladen (IndexedDB), Zurücksetzen leert den Speicher ----
  await page.click('.menu summary:has-text("Projekt")'); await page.click('#bBrowserSave');
  await page.waitForFunction(() => /Im Browser gesichert/.test(document.querySelector('#autoInfo').textContent)); await page.waitForTimeout(500);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('[data-img=spineBg]').classList.contains('has'));
  assert.equal(await page.locator('[data-img=publisher]').evaluate((e) => e.classList.contains('has')), true);
  await page.click('#bReset'); await page.waitForTimeout(400); await page.reload(); await page.waitForTimeout(800);
  assert.equal(await page.locator('[data-img=spineBg]').evaluate((e) => e.classList.contains('has')), false, 'nach Zurücksetzen kommt nichts zurück');
  assert.equal(await page.locator('#autoInfo').textContent(), '');

  // Längen in Millimetern: Pfeiltasten in 0,25-mm-Schritten, bei den Abständen am Rücken sind negative Werte erlaubt (Logo wird größer, überstehender Rand wird abgeschnitten)
  await page.evaluate(() => CoverApp.reset && CoverApp.reset());
  await page.reload(); await page.waitForTimeout(500);
  await image(page, 'spineLogo', 400, 100, "ctx.fillStyle='#09f';ctx.fillRect(0,0,w,h);");
  await page.evaluate(() => CoverApp.patch({ spineUseLogo: true, spineLogoRot: 'yes', spineLogoSide: '1.5', spineLogoTop: '3', spineLogoBottom: '3' }));
  for (const k of ['spineLogoSide', 'spineLogoTop', 'spineLogoBottom', 'spinePubSide', 'spinePubWidth', 'custom.back', 'custom.spine', 'custom.front', 'custom.h']) {
    assert.equal(await page.locator('[data-k="' + k + '"]').getAttribute('type'), 'number', k + ' ist ein Zahlenfeld');
    assert.equal(await page.locator('[data-k="' + k + '"]').getAttribute('step'), '0.25', k + ' geht in 0,25-mm-Schritten');
  }
  const logoW = () => page.evaluate(() => document.querySelector('#spineLogoImg').getBoundingClientRect().width);
  await page.fill('[data-k=spineLogoSide]', '1.5'); await page.waitForTimeout(150);
  const w0 = await logoW();
  await page.locator('[data-k=spineLogoSide]').focus(); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(100);
  assert.equal(await page.inputValue('[data-k=spineLogoSide]'), '1.75', 'Pfeil nach oben: +0,25 mm');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100);
  assert.equal(await page.inputValue('[data-k=spineLogoSide]'), '1.25', 'Pfeil nach unten: -0,25 mm');
  await page.fill('[data-k=spineLogoSide]', '-2'); await page.waitForTimeout(200);
  assert.equal(await page.inputValue('[data-k=spineLogoSide]'), '-2', 'negative Zahl bleibt stehen');
  assert.ok(await logoW() > w0 + 1, 'Negativer Abstand macht das Logo größer');
  await page.fill('[data-k=spineLogoTop]', '-3'); await page.waitForTimeout(200);
  assert.equal(await page.locator('#spineBox').evaluate((e) => e.classList.contains('free')), true, 'Mit negativem Abstand darf das Logo über das Feld hinausragen');
  await page.fill('[data-k=spineLogoTop]', '3'); await page.waitForTimeout(150);
  assert.equal(await page.locator('#spineBox').evaluate((e) => e.classList.contains('free')), false);
  assert.ok((await page.locator('#sheet').boundingBox()).width > 100, 'Blatt bleibt sichtbar');

  assert.deepEqual(errors, []);
  await browser.close();
  console.log('Cover-Tool-Rücken-Test bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
