const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'cover-tool', 'index.html'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'pages.yml'), 'utf8');

// Auf GitHub Pages dürfen Browser Dateien bis zu 10 Minuten zwischenspeichern. Ohne Versionsnummer in der Adresse
// mischte ein Browser dann eine neue index.html mit alten Skripten und Stilen (kaputte Menüs, alter Einstellungsdialog).
test('Alle eigenen Dateien der Seite haben eine Versionsnummer in der Adresse', () => {
  const refs = [...html.matchAll(/<(?:script|link)[^>]*(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https?:/.test(u));
  assert.ok(refs.length >= 7, 'Skripte und Stil gefunden: ' + refs);
  for (const ref of refs) assert.match(ref, /\?v=__VERSION__$/, ref);
  for (const ref of refs) assert.ok(fs.existsSync(path.join(root, 'cover-tool', ref.split('?')[0])), 'Datei fehlt: ' + ref);
  assert.match(html, /id="ver"[^>]*>Version __VERSION__</, 'Die Versionsnummer wird auf der Seite angezeigt');
});

test('Der Pages-Workflow setzt die Versionsnummer ein', () => {
  assert.match(workflow, /sed -i "s\/__VERSION__\/\$\{GITHUB_SHA::7\}\/g" site\/cover\/index\.html/);
  // dasselbe Ersetzen auf der echten Datei: danach bleibt kein Platzhalter übrig
  const out = html.replace(/__VERSION__/g, '0c9d65a');
  assert.ok(!out.includes('__VERSION__'));
  assert.match(out, /style\.css\?v=0c9d65a/);
  assert.match(out, /extras\.js\?v=0c9d65a/);
});

// Jeder Anbieter hat ein Logo für Vorderseite und Rücken: Datei vorhanden, klein (Vektor bzw. wenige KB) und mit weißer Füllung
test('Anbieter-Logos: Dateien vorhanden und klein', () => {
  const C = require('../cover-tool/core.js');
  for (const [key, p] of Object.entries(C.PROVIDERS)) {
    const file = path.join(root, 'cover-tool', 'assets', 'images', p.logo);
    assert.ok(fs.existsSync(file), key + ': ' + p.logo + ' fehlt');
    assert.ok(fs.statSync(file).size < 40000, key + ': Logo ist zu groß');
    assert.ok(p.logo.endsWith('.svg'), key + ': Logo muss SVG sein');
    assert.match(fs.readFileSync(file, 'utf8'), /fill="#(ffffff|fff)"/);
  }
  assert.equal((html.match(/class="[^"]*brand-logo/g) || []).length, 2, 'Kopfleiste und Rücken');
});
