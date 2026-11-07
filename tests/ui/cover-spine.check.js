// Rücken im Cover-Tool: Bild über den Rücken fortsetzen, Rückenlogo statt Titel, Publisher am Fuß, Hintergrund transparent machen.
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const url = 'file://' + path.resolve(__dirname, '..', '..', 'cover-tool', 'index.html');

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
  await page.selectOption('[data-k=theme]', 'classic');

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
      tall: logo.height > logo.width, inside: logo.left >= sp.left - 0.5 && logo.right <= sp.right + 0.5 && logo.top >= box.top - 0.5 && logo.bottom <= box.bottom + 0.5, long: logo.height > box.height * 0.8 };
  });
  let s = await spine();
  assert.equal(s.logoVisible, true); assert.equal(s.titleVis, 'hidden'); assert.ok(s.tall, 'Logo ist gedreht'); assert.ok(s.inside, 'Logo bleibt auf dem Rücken'); assert.ok(s.long, 'Logo füllt die Länge');
  await page.uncheck('[data-k=spineUseLogo]'); await page.waitForTimeout(150);
  s = await spine(); assert.equal(s.logoVisible, false); assert.equal(s.titleVis, 'visible');
  await page.check('[data-k=spineUseLogo]');

  // ---- Publisher-Logo am Fuß: "PC" oben, Publisher ganz unten, beides auf dem Rücken ----
  await page.waitForTimeout(150);
  const foot = () => page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect(), pc = r('#spineFoot .pc'), pub = r('#spinePubImg'), sp = r('#spine');
    return { shown: !document.querySelector('#spinePubImg').hidden, below: pub.top >= pc.bottom - 0.5, inside: pub.left >= sp.left - 0.5 && pub.right <= sp.right + 0.5 && pub.bottom <= sp.bottom + 0.5 };
  });
  let f = await foot();
  assert.equal(f.shown, true); assert.ok(f.below, 'Publisher steht unter "PC"'); assert.ok(f.inside, 'Publisher-Logo bleibt auf dem Rücken');
  await page.uncheck('[data-k=spinePub]'); await page.waitForTimeout(150);
  assert.equal((await foot()).shown, false); await page.check('[data-k=spinePub]');
  assert.equal((await s && await spine()).inside, true, 'Rückenlogo bleibt auch mit Publisher auf dem Rücken');
  await page.click('[data-img=spineLogo] .x'); await page.click('[data-img=publisher] .x'); await page.waitForTimeout(150);

  // ---- Bild der Vorderseite über den Rücken fortsetzen: Der Farbverlauf geht an der Kante ohne Sprung weiter ----
  const grad = "for(let x=0;x<w;x++){ctx.fillStyle='hsl('+(x/w*300)+',90%,50%)';ctx.fillRect(x,0,1,h);}";
  for (const theme of ['classic', 'bar']) {
    await page.selectOption('[data-k=theme]', theme);
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

  assert.deepEqual(errors, []);
  await browser.close();
  console.log('Cover-Tool-Rücken-Test bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
