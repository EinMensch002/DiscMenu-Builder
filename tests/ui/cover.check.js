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
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.selectOption('[data-k=theme]', 'classic');   // die Tests gehen vom klassischen Stil aus (Standard ist die Leiste)

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

  // Die Rückseite bleibt stabil: Das Ausblenden der USK hinten verschiebt nichts, fehlende Zeilen lassen die übrigen oben stehen
  const layout = () => page.evaluate(() => {
    const o = document.querySelector('#cover').getBoundingClientRect();
    const r = (sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return [sel, Math.round((b.left - o.left) * 10) / 10, Math.round((b.top - o.top) * 10) / 10]; };
    return ['#feats', '#specs', '#specs li', '#discLogo', '#copy', '#spineTitle', '#frontUsk'].map(r);
  });
  await page.check('[data-k=uskBack]');
  await page.waitForTimeout(150);
  const noGx = await layout();
  assert.ok(noGx.find((r) => r[0] === '#specs')[1] < 60, 'Die Angaben beginnen am linken Rand der Rückseite');
  await page.uncheck('[data-k=uskBack]'); await page.waitForTimeout(150);
  assert.deepEqual(await layout(), noGx, 'Ohne USK auf der Rückseite darf sich nichts verschieben');
  await page.fill('[data-k=other]', ''); await page.waitForTimeout(150);          // eine Zeile weniger: die übrigen bleiben oben stehen
  const fewer = await layout();
  assert.deepEqual(fewer.find((x) => x[0] === '#specs li'), noGx.find((x) => x[0] === '#specs li'));
  assert.deepEqual(fewer.find((x) => x[0] === '#feats'), noGx.find((x) => x[0] === '#feats'));
  await page.check('[data-k=uskBack]');

  // Stil "Leiste": Kopfleiste über Vorderseite und Rücken (die Akzentlinie läuft durch), alles bleibt auf dem Blatt
  await page.selectOption('[data-k=theme]', 'bar');
  await page.waitForFunction(() => document.querySelector('#cover').classList.contains('theme-bar'));
  assert.equal(await page.locator('.gog-bar').isVisible(), true);
  assert.equal(await page.locator('.gog-corner').isVisible(), false);
  // Das Frontbild füllt nur den Teil unter der Kopfleiste (sonst wäre der obere Bildrand verdeckt)
  assert.deepEqual(await page.evaluate(() => { const f = document.querySelector('#front'), c = getComputedStyle(f), bar = document.querySelector('.gog-bar').getBoundingClientRect(), k = Number(getComputedStyle(document.querySelector('#preview')).getPropertyValue('--k')) || 1; return [c.backgroundClip, c.backgroundOrigin, Math.abs(parseFloat(c.paddingTop) - bar.height / k) < 1.5]; }), ['content-box', 'content-box', true]);
  assert.match(await page.locator('[data-img=front] .spec').textContent(), /× 164\.4 mm/, 'Maße des Frontbilds ohne die Kopfleiste');
  const lineY = await page.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(), a = r('.gog-bar'), b = r('.spine-head'); return [Math.round(a.top * 10) / 10, Math.round(a.bottom * 10) / 10, Math.round(b.top * 10) / 10, Math.round(b.bottom * 10) / 10]; });
  assert.deepEqual([lineY[0], lineY[1]], [lineY[2], lineY[3]], 'Leiste auf Vorderseite und Rücken sind gleich hoch, die Linie läuft durch');
  for (const p of ['steam', 'epic', 'gog']) { await page.selectOption('[data-k=provider]', p); await page.waitForTimeout(100); assert.equal(await page.locator('#spineLogo').isVisible(), true, p); assert.equal(await page.evaluate(() => { const l = document.querySelector('#spineLogo').getBoundingClientRect(), h = document.querySelector('.spine-head').getBoundingClientRect(); return l.top >= h.top && l.bottom <= h.bottom; }), true, 'Rückenlogo bleibt in der Leiste: ' + p); }
  await page.selectOption('[data-k=provider]', 'gog');
  assert.equal(await page.locator('#frontTag').textContent(), 'PC · DRM-FREI');
  assert.equal(await page.locator('#spineFoot').isVisible(), true);
  await page.selectOption('[data-k=lang]', 'en');
  await page.waitForFunction(() => document.querySelector('#frontTag').textContent === 'PC · DRM-FREE');
  await page.selectOption('[data-k=lang]', 'de');
  const spec = await page.evaluate(() => { const p = document.querySelector('.panel-back').getBoundingClientRect(), s = document.querySelector('#specs').getBoundingClientRect(); return s.bottom <= p.bottom + 0.5; });
  assert.ok(spec, 'Die Systemanforderungen müssen im Leisten-Stil in das Feld passen');
  await page.selectOption('[data-k=theme]', 'classic');
  await page.waitForFunction(() => !document.querySelector('#cover').classList.contains('theme-bar'));

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

  // Naht: Zwischen Rücken und Vorderseite scheint in keiner Zoomstufe ein heller Streifen durch
  await page.selectOption('[data-k=caseType]', 'normal').catch(() => {});
  await page.check('[data-k=caseType][value=normal]');
  await page.selectOption('[data-k=theme]', 'classic');
  for (const width of [1000, 1280, 1500, 1800]) {            // die Vorschau wählt je nach Fensterbreite einen anderen Maßstab
    await page.setViewportSize({ width, height: 950 });
    await page.waitForTimeout(200);
    const k = await page.evaluate(() => Number(getComputedStyle(document.querySelector('#preview')).getPropertyValue('--k')));
    const info = await page.evaluate(() => { const s = document.querySelector('#sheet').getBoundingClientRect(), f = document.querySelector('#front').getBoundingClientRect(), c = document.querySelector('.gog-corner').getBoundingClientRect(); return { bx: Math.round(f.left - s.left), y0: Math.round(c.top - s.top) + 3, y1: Math.round(c.bottom - s.top) - 3 }; });
    const shot = (await page.locator('#sheet').screenshot()).toString('base64');
    const bad = await page.evaluate(async ({ shot, info }) => {
      const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + shot)).blob());
      const cv = new OffscreenCanvas(bmp.width, bmp.height), ctx = cv.getContext('2d'); ctx.drawImage(bmp, 0, 0);
      const out = [];
      for (let x = info.bx - 3; x <= info.bx + 3; x++) for (let y = info.y0; y < info.y1; y++) {
        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
        if (!(Math.abs(r - 137) < 25 && Math.abs(g - 38) < 25 && Math.abs(b - 141) < 25)) out.push([x, y, r, g, b]);
      }
      return out;
    }, { shot, info });
    assert.equal(bad.length, 0, 'Helle Naht zwischen Rücken und Vorderseite bei Fensterbreite ' + width + ' (Maßstab ' + k + '): ' + JSON.stringify(bad.slice(0, 2)));
  }

  await page.setViewportSize({ width: 1500, height: 950 });

  // Lange Angaben: Die Liste bleibt im Feld (Schrift wird kleiner, jeder Wert zeigt höchstens zwei Zeilen)
  await page.fill('[data-k=other]', 'SSD required. Attention: In this game you will encounter a variety of visual effects that may trigger photosensitivity and more text here');
  await page.fill('[data-k="cpu.custom"]', 'Intel Core i5-4460 (3.2 GHz) or AMD FX-6300 (3.5 GHz) with a very long additional description of the processor');
  await page.fill('[data-k=dx]', 'Version 12'); await page.waitForTimeout(200);
  assert.ok(await page.evaluate(() => { const p = document.querySelector('.panel-back').getBoundingClientRect(), s = document.querySelector('#specs').getBoundingClientRect(); return s.bottom <= p.bottom && s.top >= p.top; }), 'Angaben ragen aus dem Feld');
  await page.fill('[data-k=other]', ''); await page.fill('[data-k="cpu.custom"]', '');

  // Minimum und Empfohlen: alles steht in der Tabelle und passt vollständig in das Feld (Prozessor, Grafik, Sonstiges)
  await page.evaluate(() => CoverApp.patch({
    cpu: { intel: { on: true, pre: 'Core i7', num: '6700', sfx: '' }, amd: { on: true, pre: 'Ryzen 5', num: '1600', sfx: '' }, custom: '' },
    gpu: { nvidia: { on: true, pre: 'GTX', num: '1060', sfx: '6GB' }, amd: { on: true, pre: 'RX', num: '580', sfx: '8GB' }, custom: '' },
    dx: 'Version 12', other: 'SSD recommended. Attention: this game may trigger photosensitivity and more text here',
    rec: { on: true, cpu: { intel: { on: true, pre: 'Core i7', num: '12700', sfx: '' }, amd: { on: true, pre: 'Ryzen 7', num: '7800', sfx: 'X3D' }, custom: '' },
      gpu: { nvidia: { on: true, pre: 'RTX', num: '2060', sfx: 'SUPER' }, amd: { on: true, pre: 'RX', num: '5700', sfx: 'XT' }, custom: '' }, ram: '16', space: '70', dx: 'Version 12', other: 'SSD required' },
  }));
  for (const provider of ['gog', 'steam']) for (const theme of ['classic', 'bar']) {
    await page.selectOption('[data-k=provider]', provider); await page.selectOption('[data-k=theme]', theme); await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const col = document.querySelector('.speccol').getBoundingClientRect(), list = document.querySelector('#specs');
      const cells = [...list.querySelectorAll('li')].map((li) => li.getBoundingClientRect());
      return { dual: list.classList.contains('dual'), inside: cells.every((c) => c.bottom <= col.bottom + 0.5 && c.top >= col.top - 0.5), text: list.innerText, pt: parseFloat(getComputedStyle(list).fontSize) * 72 / 96 };
    });
    const where = provider + '/' + theme;
    assert.equal(r.dual, true, where); assert.ok(r.inside, 'Anforderungen ragen aus dem Feld: ' + where);
    for (const t of ['Core i7-6700', 'Ryzen 5 1600', 'Core i7-12700', 'GTX 1060', 'RTX 2060', 'Sonstiges', 'SSD required', 'photosensitivity']) assert.ok(r.text.includes(t), t + ' fehlt (' + where + ')');
    assert.ok(r.pt >= 4.4, 'Schrift zu klein: ' + r.pt);
  }
  await page.selectOption('[data-k=provider]', 'gog'); await page.selectOption('[data-k=theme]', 'classic');
  // Reiter im Formular: "Empfohlen" zeigt die zweiten Felder und schaltet die Spalte ein
  await page.click('[data-reqtab=rec]');
  assert.equal(await page.locator('[data-pane=rec]').isVisible(), true); assert.equal(await page.locator('[data-pane=min]').isVisible(), false);
  await page.uncheck('[data-k="rec.on"]'); await page.waitForTimeout(150);
  assert.equal(await page.locator('#specs.dual').count(), 0);
  await page.click('[data-reqtab=min]');
  await page.evaluate(() => CoverApp.patch({ dx: '', other: '', cpu: { intel: { on: false }, amd: { on: false } }, gpu: { nvidia: { on: false }, amd: { on: false } }, rec: { on: false } }));

  // Copyright mittig unten, "PC" am Fuß des Rückens, Titel mittig
  const keep = await page.evaluate(() => ({ title: CoverApp.state.title, copyright: CoverApp.state.copyright }));
  await page.fill('[data-k=copyright]', '© 2026 Beispiel. Alle Rechte vorbehalten.'); await page.fill('[data-k=title]', 'Mitte'); await page.waitForTimeout(200);
  const geoNow = () => page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect(), back = r('.panel-back'), copy = r('#copy'), sp = r('#spineBox'), tt = (() => { const g = document.createRange(); g.selectNodeContents(document.querySelector('#spineTitle')); return g.getBoundingClientRect(); })();
    return { copyMid: (copy.left + copy.right) / 2 - (back.left + back.right) / 2, copyLow: back.bottom - copy.bottom, titleTop: tt.top - sp.top, titleBottom: sp.bottom - tt.bottom, foot: getComputedStyle(document.querySelector('#spineFoot')).display, footText: document.querySelector('#spineFoot').textContent };
  });
  let g = await geoNow();
  assert.ok(Math.abs(g.copyMid) < 6, 'Copyright steht mittig: ' + g.copyMid);
  assert.ok(g.copyLow >= 0, 'Copyright steht im Feld');
  assert.equal(g.foot, 'flex'); assert.equal(g.footText, 'PC');
  assert.equal(await page.inputValue('[data-k=spineTitle]'), 'center');
  await page.selectOption('[data-k=spineTitle]', 'top'); await page.waitForTimeout(150);
  g = await geoNow();
  assert.ok(g.titleTop < g.titleBottom - 20, 'Titel steht oben (Auswahl)');
  await page.selectOption('[data-k=spineTitle]', 'center'); await page.waitForTimeout(150);
  g = await geoNow();
  assert.ok(Math.abs(g.titleTop - g.titleBottom) < 8, 'Titel steht mittig: ' + g.titleTop + ' / ' + g.titleBottom);
  await page.selectOption('[data-k=spineTitle]', 'top');
  await page.uncheck('[data-k=spinePC]'); await page.waitForTimeout(100);
  assert.equal(await page.locator('#spineFoot .pc').evaluate((e) => getComputedStyle(e).display), 'none', '"PC" ist abschaltbar'); await page.check('[data-k=spinePC]');
  await page.fill('[data-k=title]', keep.title); await page.fill('[data-k=copyright]', keep.copyright);
  // Symbole: alle Funktionen als Linien-SVG
  await page.evaluate(() => CoverApp.patch({ features: ['single_player', 'vr'] })); await page.waitForTimeout(100);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#feats img')].map((i) => [i.getAttribute('src'), i.naturalWidth > 0])), [['assets/images/features/line/single_player.svg', true], ['assets/images/features/line/vr.svg', true]]);
  await page.evaluate(() => CoverApp.patch({ features: ['single_player'] }));

  // Druck: Flächen ohne Bild bleiben weiß (nicht grau), die Vorschau zeigt Platzhalter
  await page.evaluate(() => document.querySelectorAll('.drop .x').forEach((x) => x.click()));   // Zustand ohne Bilder
  await page.emulateMedia({ media: 'print' }); await page.waitForTimeout(300);
  assert.equal(await page.locator('#backTop').evaluate((e) => getComputedStyle(e).backgroundColor), 'rgb(255, 255, 255)');
  await page.emulateMedia({ media: 'screen' });
  assert.notEqual(await page.locator('#backTop').evaluate((e) => getComputedStyle(e).backgroundColor), 'rgb(255, 255, 255)');

  // Einstellungen UND Bilder bleiben nach dem Neuladen (Einstellungen in localStorage, Bilder in der IndexedDB des Browsers)
  await giveImage(page, 'front', 600, 900);
  await page.click('.menu summary:has-text("Projekt")'); await page.click('#bBrowserSave');           // sichert sofort (sonst nach etwa 1 s von selbst)
  await page.waitForFunction(() => /Im Browser gesichert/.test(document.querySelector('#autoInfo').textContent)); await page.waitForTimeout(400);
  await page.reload();
  assert.equal(await page.inputValue('[data-k=theme]'), 'classic');
  assert.equal(await page.inputValue('[data-k=title]'), 'Sehr langer Spieltitel: Die Rückkehr der Titel & Co. <b>');
  await page.waitForFunction(() => document.querySelector('[data-img=front]').classList.contains('has'));
  assert.match(await page.locator('#autoInfo').textContent(), /aus dem Browser-Speicher geladen/);
  await page.waitForFunction(() => /600 × 900 px/.test(document.querySelector('[data-img=front] .info').textContent));

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
