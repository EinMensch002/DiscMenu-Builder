// Lädt den Kern des Menü-Teils (app/menu-core.js), ohne Browser.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8');

function loadCore() {
  return require('../app/menu-core.js');
}

function loadSchemaValidator() {
  const Ajv2020 = require('ajv/dist/2020');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return ajv.compile(JSON.parse(fs.readFileSync(path.join(root, 'schema', 'menu.schema.json'), 'utf8')));
}

module.exports = { root, html, loadCore, loadSchemaValidator };
