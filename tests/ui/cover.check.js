// Oberflächentest des Cover-Tools in einem echten Chromium. Aufruf: npm run test:ui
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const url = 'file://' + path.resolve(__dirname, '..', '..', 'cover-tool', 'index.html');

// Legt ein Testbild an und übergibt es wie eine Datei aus dem Dateidialog
async function giveImage(page, key, w, h, type = 'image/jpeg') {
  await page.evaluate(async ({ key, w, h, type }) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'); const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#2b5bd7'); g.addColorStop(1, '#e0498a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const blob = await new Promise((r) => cv.toBlob(r, type));
    const dt = new DataTransfer(); dt.items.add(new File([blob], key + '.' + (type === 'image/png' ? 'png' : 'jpg'), { type }));
    const input = document.querySelector('[data-img=' + key + '] input[type=file]');
    input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { key, w, h, type });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload();

  // Titel, Funktionen, Systemanforderungen
  await page.fill('[data-k=title]', 'Sehr langer Spieltitel: Die Rückkehr der Titel & Co. <b>');
  await page.check('[data-k=features][value=controller_support]');
  await page.check('[data-k=features][value=cloud_saves]');
  await page.check('[data-k="cpu.intel.on"]'); await page.fill('[data-k="cpu.intel.num"]', '12400'); await page.click('[data-k="cpu.intel.sfx"][data-v="F"]');
  await page.check('[data-k="cpu.amd.on"]'); await page.fill('[data-k="cpu.amd.num"]', '5600');
  await page.check('[data-k="gpu.nvidia.on"]'); await page.fill('[data-k="gpu.nvidia.num"]', '3060'); await page.click('[data-k="gpu.nvidia.sfx"][data-v="Ti"]');
  await page.fill('[data-k=dx]', 'Version 11'); await page.fill('[data-k=other]', '16-Bit-Soundkarte');
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#spineTitle').textContent(), 'Sehr langer Spieltitel: Die Rückkehr der Titel & Co. <b>');   // wird als Text behandelt
  assert.equal(await page.locator('#feats .feat').count(), 3);                       // Single-Player (Standard) + 2
  const rows = await page.locator('#specs li .k').allTextContents();
  assert.deepEqual(rows, ['Läuft auf', 'Prozessor', 'Arbeitsspeicher', 'Grafik', 'DirectX', 'Speicherplatz', 'Sonstiges']);
  assert.match(await page.locator('#specs').textContent(), /Intel Core i5-12400F.*AMD Ryzen 5 5600.*NVIDIA GeForce RTX 3060 Ti/s);
  // Der lange Titel passt auf den Rücken
  const fits = await page.evaluate(() => { const t = document.querySelector('#spineTitle'), b = document.querySelector('#spineBox'); return t.scrollHeight <= b.clientHeight; });
  assert.ok(fits, 'Der Rückentitel ragt über die Hülle hinaus');

  // Bilder: große Dateien werden verkleinert, Hinweise zur Schärfe erscheinen
  await giveImage(page, 'front', 6000, 4000);
  await page.waitForFunction(() => /dpi/.test(document.querySelector('[data-img=front] .info').textContent));
  const info = await page.locator('[data-img=front] .info').textContent();
  assert.match(info, /2300 × 1533 px/);
  await giveImage(page, 'backTop', 300, 400);
  await page.waitForFunction(() => /wird unscharf/.test(document.querySelector('[data-img=backTop] .info').textContent));
  await giveImage(page, 'publisher', 400, 200, 'image/png');
  await page.waitForFunction(() => !document.querySelector('#frontPub').hidden);
  assert.equal(await page.locator('#backPub').isHidden(), false);
  assert.ok(await page.evaluate(() => /^blob:/.test(document.querySelector('#front').style.backgroundImage.slice(5))));   // keine Base64-Texte

  // Disc-Logos laden alle (früher fehlte das Blu-ray-Logo)
  for (const d of ['cd', 'dvd', 'bluray']) {
    await page.check('[data-k=disc][value=' + d + ']');
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(() => document.querySelector('#discLogo').complete && document.querySelector('#discLogo').naturalWidth > 0), 'Disc-Logo ' + d);
  }

  // USK ausblenden, Hülle wechseln
  await page.selectOption('[data-k=usk]', 'none');
  await page.waitForFunction(() => document.querySelector('#frontUsk').hidden);
  await page.selectOption('[data-k=usk]', '18');
  await page.waitForFunction(() => document.querySelector('#frontUsk').getAttribute('src') === 'assets/images/usk/usk_18.png');
  const wNormal = (await page.locator('#cover').boundingBox()).width;
  await page.check('[data-k=caseType][value=slim]');
  await page.waitForTimeout(100);
  const wSlim = (await page.locator('#cover').boundingBox()).width;
  assert.ok(Math.abs(wSlim / wNormal - 266 / 273) < 0.01, 'Slim-Hülle ist 266 statt 273 mm breit');
  assert.match(await page.locator('[data-img=front] .spec').textContent(), /129\.5 × 183 mm/);
  await page.check('[data-k=caseType][value=normal]');

  // Die Rückseite bleibt stabil: Weder das Ausblenden des GOG-Galaxy-Felds noch der USK hinten verschiebt etwas
  const layout = () => page.evaluate(() => {
    const o = document.querySelector('#cover').getBoundingClientRect();
    const r = (sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return [sel, Math.round((b.left - o.left) * 10) / 10, Math.round((b.top - o.top) * 10) / 10]; };
    return ['#feats', '#specs', '#specs li', '#discLogo', '#copy', '#spineTitle', '#frontUsk'].map(r);
  });
  await page.check('[data-k=galaxy]'); await page.check('[data-k=uskBack]');
  await page.waitForTimeout(150);
  const base = await layout();
  await page.uncheck('[data-k=galaxy]'); await page.waitForTimeout(150);
  assert.deepEqual(await layout(), base, 'Ohne Galaxy-Feld darf sich nichts verschieben');
  await page.uncheck('[data-k=uskBack]'); await page.waitForTimeout(150);
  assert.deepEqual(await layout(), base, 'Ohne USK auf der Rückseite darf sich nichts verschieben');
  await page.fill('[data-k=other]', ''); await page.waitForTimeout(150);          // eine Zeile weniger: die übrigen bleiben oben stehen
  const fewer = await layout();
  assert.deepEqual(fewer.find((x) => x[0] === '#specs li'), base.find((x) => x[0] === '#specs li'));
  assert.deepEqual(fewer.find((x) => x[0] === '#feats'), base.find((x) => x[0] === '#feats'));
  await page.check('[data-k=galaxy]'); await page.check('[data-k=uskBack]');

  // Stil "Modern": Streifen oben, Überschrift der Systemanforderungen, alles bleibt auf dem Blatt
  await page.selectOption('[data-k=theme]', 'modern');
  await page.waitForFunction(() => document.querySelector('#cover').classList.contains('theme-modern'));
  assert.equal(await page.locator('.gog-bar').isVisible(), true);
  assert.equal(await page.locator('.gog-corner').isVisible(), false);
  assert.equal(await page.locator('#reqTitle').textContent(), 'SYSTEMANFORDERUNGEN');
  assert.equal(await page.locator('#frontTag').textContent(), 'PC · DRM-FREI');
  assert.equal(await page.locator('#spineFoot').isVisible(), true);
  await page.selectOption('[data-k=lang]', 'en');
  await page.waitForFunction(() => document.querySelector('#frontTag').textContent === 'PC · DRM-FREE');
  await page.selectOption('[data-k=lang]', 'de');
  const spec = await page.evaluate(() => { const p = document.querySelector('.panel-back').getBoundingClientRect(), s = document.querySelector('#specs').getBoundingClientRect(); return s.bottom <= p.bottom + 0.5; });
  assert.ok(spec, 'Die Systemanforderungen müssen im Modern-Stil in das Feld passen');
  await page.selectOption('[data-k=theme]', 'classic');
  await page.waitForFunction(() => !document.querySelector('#cover').classList.contains('theme-modern'));

  // Eigene Maße (Blu-ray-Vorlage): Cover hat die Maße, Bildmaße folgen, Druck bleibt eine Seite
  await page.check('[data-k=caseType][value=custom]');
  await page.waitForFunction(() => !document.querySelector('#customBox').hidden);
  await page.click('[data-preset=bluray]');
  await page.waitForFunction(() => document.querySelector('[data-img=front] .spec').textContent.includes('127.5 × 148 mm'));
  assert.equal(await page.inputValue('[data-k="custom.back"]'), '127.5');
  const wBlu = (await page.locator('#cover').boundingBox()).width, hBlu = (await page.locator('#cover').boundingBox()).height;
  assert.ok(Math.abs(wBlu / hBlu - 269 / 148) < 0.01, 'Seitenverhältnis 269 : 148');
  await page.fill('[data-k="custom.h"]', '900');
  await page.waitForFunction(() => /angepasst/.test(document.querySelector('#notes').textContent));
  await page.click('[data-preset=bluray]');
  await page.waitForFunction(() => !/angepasst/.test(document.querySelector('#notes').textContent));
  await page.emulateMedia({ media: 'print' });
  const pdfBlu = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString('latin1');
  assert.equal((pdfBlu.match(/\/Type\s*\/Page[^s]/g) || []).length, 1, 'Auch mit eigenen Maßen genau eine Seite');
  await page.emulateMedia({ media: 'screen' });
  await page.check('[data-k=caseType][value=normal]');

  // Einstellungen bleiben nach dem Neuladen, Bilder nicht
  await page.waitForTimeout(200); await page.reload();
  assert.equal(await page.inputValue('[data-k=theme]'), 'classic');
  assert.equal(await page.inputValue('[data-k=title]'), 'Sehr langer Spieltitel: Die Rückkehr der Titel & Co. <b>');
  assert.equal(await page.locator('[data-img=front]').getAttribute('class'), 'drop');

  // Druck: genau eine A4-Seite quer, Cover in Originalgröße, Schnittmarken innerhalb des Blatts
  await giveImage(page, 'front', 1500, 2100);
  await page.waitForFunction(() => /dpi/.test(document.querySelector('[data-img=front] .info').textContent));
  await page.emulateMedia({ media: 'print' });
  const geo = await page.evaluate(() => {
    const mm = (el) => { const r = el.getBoundingClientRect(); const k = 25.4 / 96; return { x: r.left * k, y: r.top * k, w: r.width * k, h: r.height * k }; };
    const cover = mm(document.querySelector('#cover')), sheet = mm(document.querySelector('#sheet'));
    const marks = [...document.querySelectorAll('.mark')].map(mm);
    return { cover, sheet, marks, hidden: getComputedStyle(document.querySelector('#form')).display };
  });
  assert.equal(geo.hidden, 'none', 'Das Formular darf nicht gedruckt werden');
  assert.ok(Math.abs(geo.cover.w - 273) < 0.5 && Math.abs(geo.cover.h - 183) < 0.5, 'Cover ist im Druck 273 × 183 mm: ' + JSON.stringify(geo.cover));
  assert.ok(Math.abs(geo.cover.x + geo.cover.w / 2 - 148.5) < 0.6 && Math.abs(geo.cover.y + geo.cover.h / 2 - 104.75) < 0.6, 'Cover sitzt mittig auf dem Blatt');
  for (const m of geo.marks) assert.ok(m.x >= 0 && m.y >= 0 && m.x + m.w <= 297 && m.y + m.h <= 210, 'Schnittmarke außerhalb des Blatts');
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const text = pdf.toString('latin1');
  assert.equal((text.match(/\/Type\s*\/Page[^s]/g) || []).length, 1, 'Der Druck soll genau eine Seite haben');
  const box = text.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/);
  assert.ok(box && Math.abs(box[1] - 841.9) < 1 && Math.abs(box[2] - 595.3) < 1, 'A4 quer erwartet, war ' + (box && box.slice(1, 3)));
  await page.emulateMedia({ media: 'screen' });

  assert.deepEqual(errors, []);
  await browser.close();
  console.log('Cover-Tool-Test bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
