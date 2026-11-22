#!/usr/bin/env node
/* Ein-Datei-Build der Web-App: fasst den Ordner app/ zu EINER HTML-Datei zusammen, die ohne weitere Dateien und ohne Internet läuft.

   Aufruf:  node scripts/build-single.js [Ziel.html] [--version=TEXT]
            (ohne Ziel: dist/DiscMenu-Builder.html, ohne Version: kurze Git-Kennung oder "einzeldatei")
   oder:    npm run build

   Was passiert:
   - <link rel="stylesheet" href="…"> wird zu <style>, Schriften und Bilder darin (url(assets/…)) werden zu data:-Adressen.
   - <script src="…"> wird zu <script> mit dem Inhalt der Datei.
   - Feste Pfade auf Dateien in assets/ (im HTML und als Text im JavaScript) werden zu data:-Adressen.
   - Pfade, die erst zur Laufzeit entstehen (z. B. USK-Zeichen, Symbole der Spielfunktionen), findet die Seite über window.DISC_ASSETS
     (Tabelle aller Bilder aus assets/images, siehe asset() in app.js).
   Der Code im Ordner app/ bleibt unverändert, gearbeitet wird weiter dort. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');
const args = process.argv.slice(2);
const out = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'dist', 'DiscMenu-Builder.html'));
let version = (args.find((a) => a.startsWith('--version=')) || '').slice('--version='.length);
if (!version) { try { version = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { version = 'einzeldatei'; } }

const MIME = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' };
const read = (rel) => fs.readFileSync(path.join(APP, rel), 'utf8');
const used = new Set();
function dataUri(rel) {
  const file = path.join(APP, rel), ext = path.extname(file).slice(1).toLowerCase();
  if (!MIME[ext] || !fs.existsSync(file)) return null;
  used.add(rel);
  return 'data:' + MIME[ext] + ';base64,' + fs.readFileSync(file).toString('base64');
}
// feste Pfade wie assets/images/gog_logo.svg (in HTML-Attributen und JavaScript-Texten)
const ASSET_PATH = /assets\/[A-Za-z0-9_\-/.]+\.(?:svg|png|jpe?g|webp|gif|ttf|otf|woff2?)/g;
const inlinePaths = (text) => text.replace(ASSET_PATH, (p) => dataUri(p) || p);
const inlineCss = (css) => css.replace(/url\((['"]?)(assets\/[^)'"]+)\1\)/g, (m, q, p) => { const d = dataUri(p); return d ? 'url("' + d + '")' : m; });
const safeScript = (js) => js.replace(/<\/script/gi, '<\\/script');           // kein vorzeitiges Ende des <script>-Blocks

// Tabelle aller Bilder für Pfade, die erst zur Laufzeit entstehen
const table = {};
(function walk(dir) {
  for (const e of fs.readdirSync(path.join(APP, dir), { withFileTypes: true })) {
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) walk(rel);
    else if (/\.(svg|png|jpe?g|webp|gif)$/i.test(e.name)) table[rel] = dataUri(rel);
  }
})('assets/images');

let html = read('index.html');
const links = [], scripts = [];
html = html.replace(/<link rel="stylesheet" href="([^"?]+)(?:\?v=__VERSION__)?">/g, (m, f) => { links.push(f); return '<style>\n' + inlineCss(read(f)) + '\n</style>'; });
html = html.replace(/<script src="([^"?]+)(?:\?v=__VERSION__)?"><\/script>/g, (m, f) => { scripts.push(f); return '<script>\n' + safeScript(inlinePaths(read(f))) + '\n</script>'; });
html = inlinePaths(html).split('__VERSION__').join(version);
// Tabelle vor dem ersten Skript einfügen (erst jetzt, sonst würden ihre Schlüssel oben selbst ersetzt)
const first = html.indexOf('<script>\n');
html = html.slice(0, first) + '<script>window.DISC_ASSETS = ' + JSON.stringify(table) + ';</script>\n' + html.slice(first);

// Kontrolle: keine Verweise auf Dateien neben der Seite mehr
const markup = html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '');      // nur das HTML selbst, Skripte setzen Adressen zur Laufzeit
const left = [...markup.matchAll(/(?:src|href)="(?!data:|https?:|#|mailto:)([^"]+)"/g)].map((m) => m[1]);
const leftAssets = (html.match(/(?<![A-Za-z0-9+/=])assets\/[A-Za-z0-9_\-/.]+\.(?:svg|png|ttf|woff2?)/g) || []).filter((p) => !(p in table));
if (left.length || leftAssets.length) {
  console.error('Nicht eingebettet: ' + [...left, ...leftAssets].join(', '));
  process.exitCode = 1;
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
const kb = (n) => Math.round(n / 1024) + ' KB';
console.log('Ein-Datei-Build: ' + path.relative(process.cwd(), out) + ' (' + kb(Buffer.byteLength(html)) + ', Version ' + version + ')');
console.log('  ' + links.length + ' Stilvorlage(n), ' + scripts.length + ' Skripte, ' + used.size + ' Dateien aus assets/ eingebettet');
