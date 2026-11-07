'use strict';
/* Sprachpakete der Oberfläche: Jeder deutsche Text im HTML hat eine Übersetzung, und es gibt keine Schlüssel, die nirgends vorkommen (Tippfehler). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const I = require('../disc-sleeve/i18n.js');
const en = require('../disc-sleeve/lang-en.js');

const dir = path.join(__dirname, '..', 'disc-sleeve');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const sources = ['index.html', 'app.js', 'extras.js', 'online.js', 'files.js', 'core.js'].map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const flat = unesc(sources).replace(/\\(['"])/g, '$1');
const norm = (s) => s.replace(/\s+/g, ' ').trim();

/* sichtbare Texte der Oberfläche (außerhalb des Covers) aus dem HTML */
function uiTexts() {
  const i = html.indexOf('id="sheet"'), j = html.indexOf('<script', i);
  const ui = html.slice(0, i) + html.slice(j);
  const out = new Set();
  for (const m of ui.matchAll(/>([^<>]+)</g)) { const t = norm(unesc(m[1])); if (/[A-Za-zÄÖÜäöüß]{2}/.test(t)) out.add(t); }
  for (const m of ui.matchAll(/\b(?:placeholder|title|aria-label)="([^"]+)"/g)) out.add(norm(unesc(m[1])));
  return [...out];
}

/* Texte, die in beiden Sprachen gleich lauten (Namen, Einheiten, Kürzel) */
const SAME = /^(💿 DiscSleeve|Version .*|GOG|Epic Games|Steam|Normal \(14 mm\)|Slim \(7 mm\)|Blu-ray|Blu-ray Slim|CD|DVD|Deutsch|English|Zoom \(%\)|\(optional\)|Single-Player|Co-op|Multi-Player|Online|LAN|Controller|Cloud Saves|Mods|VR|Win .*|macOS|Linux|\+ Intel|\+ AMD|\+ GeForce|\+ Radeon|Version 11)$/;

test('Englisch: jeder deutsche Text der Oberfläche im HTML ist übersetzt', () => {
  const missing = uiTexts().filter((t) => !SAME.test(t) && en.dict[t] === undefined);
  assert.deepEqual(missing, [], 'ohne englische Übersetzung');
});

test('Englisch: jeder Schlüssel und jedes Bruchstück kommt im HTML oder Code wirklich vor (keine Tippfehler)', () => {
  const dead = Object.keys(en.dict).filter((k) => !flat.includes(k));
  assert.deepEqual(dead, [], 'Schlüssel im Wörterbuch, die nirgends vorkommen');
  const deadParts = Object.keys(en.parts).filter((k) => !flat.includes(k.trim()));
  assert.deepEqual(deadParts, [], 'Bruchstücke, die nirgends vorkommen');
});

test('Englisch: die Texte werden ersetzt, Unbekanntes bleibt, Deutsch bleibt unverändert', () => {
  assert.equal(I.tr('Speichern unter …', 'en'), 'Save as …');
  assert.equal(I.tr('  Drucken ', 'en'), '  Print ');                                  // Leerraum bleibt erhalten
  assert.equal(I.tr('Ganz neuer Text', 'en'), 'Ganz neuer Text');
  assert.equal(I.tr('Speichern', 'de'), 'Speichern');
  assert.equal(I.tr('SteamGridDB hat mit Fehler 500 geantwortet.', 'en'), 'SteamGridDB responded with error 500.');
  assert.equal(I.tr('Wikidata hat mit Fehler 404 geantwortet.', 'en'), 'Wikidata responded with error 404.');
  assert.equal(I.tr('5 Treffer für den Test', 'en'), '5 results for the test');
  assert.equal(I.tr('Das Projekt konnte nicht geladen werden: Die cover.json ist beschädigt.', 'en'), 'The project could not be loaded: The cover.json is damaged.');
  assert.equal(I.tr('Als Frontcover übernehmen', 'en'), 'Use as front cover');
  assert.equal(I.tr('Bild auswählen (12 angezeigt):', 'en'), 'Choose an image (12 shown):');
  assert.equal(I.tr('ab 16 Jahren (USK laut Steam)', 'en'), 'from age 16 (USK according to Steam)');
  assert.equal(I.tr('Das aktuelle Projekt wird durch "a.zip" ersetzt. Weiter?', 'en'), 'The current project will be replaced by "a.zip". Continue?');
});

test('Sprachpakete: Name und Flagge vorhanden, Deutsch ist die Grundsprache', () => {
  assert.ok(I.packs.de && I.packs.en);
  assert.equal(I.packs.en.name, 'English');
  for (const code of Object.keys(I.packs)) assert.ok(fs.existsSync(path.join(dir, I.packs[code].flag)), 'Flagge fehlt: ' + code);
});
