// Lädt den Kernblock (CORE) aus configurator/index.html, ohne Browser.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'configurator', 'index.html'), 'utf8');

function loadCore() {
  const start = html.indexOf('/* === KERN');
  const end = html.indexOf('/* === UI');
  if (start < 0 || end < 0) throw new Error('Kernblock in index.html nicht gefunden.');
  const fn = new Function('module', html.slice(start, end));
  const module = { exports: {} };
  fn(module);
  return module.exports;
}

function loadSchemaValidator() {
  const Ajv2020 = require('ajv/dist/2020');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return ajv.compile(JSON.parse(fs.readFileSync(path.join(root, 'schema', 'menu.schema.json'), 'utf8')));
}

module.exports = { root, html, loadCore, loadSchemaValidator };
