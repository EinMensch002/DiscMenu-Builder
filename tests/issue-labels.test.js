const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Das Skript aus dem Workflow wird mit nachgebautem GitHub ausgeführt (keine echte Verbindung).
const root = path.join(__dirname, '..');
const yml = fs.readFileSync(path.join(root, '.github', 'workflows', 'issue-labels.yml'), 'utf8').replace(/\r\n/g, '\n');
const script = yml.split('script: |\n')[1].split('\n').map((l) => l.replace(/^ {12}/, '')).join('\n');
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

async function run(body, labels = []) {
  const added = [], removed = [];
  const github = { rest: { issues: {
    addLabels: async (a) => { added.push(...a.labels); },
    removeLabel: async (a) => { removed.push(a.name); },
  } } };
  const context = { repo: { owner: 'o', repo: 'r' }, payload: { issue: { number: 7, body, labels: labels.map((name) => ({ name })) } } };
  await new AsyncFunction('github', 'context', 'core', script)(github, context, { info: () => {} });
  return { added: added.sort(), removed: removed.sort() };
}
const form = (art, bereich, device) => '### Art\n\n' + art + '\n\n### Bereich\n\n' + bereich + '\n\n### Beschreibung\n\nText\n\n### Stand\n\n- [' + (device ? 'x' : ' ') + '] Muss auf einem echten Gerät geprüft werden (Drucker, Disc, Windows, Wine)';

test('Issue-Formular: Art, Bereiche und Stand werden zu Labels', async () => {
  assert.deepEqual(await run(form('Idee oder Wunsch, Frage', 'DiscSleeve, Tests und Veröffentlichung', true)),
    { added: ['ci', 'discsleeve', 'enhancement', 'idee', 'manuell testen', 'question'], removed: [] });
});

test('Issue-Formular: fremde Werte und Texte ohne Formular ändern nichts', async () => {
  assert.deepEqual(await run(form('Fehler, wontfix', 'Player, Hack', false)), { added: ['bug', 'player'], removed: [] });
  assert.deepEqual(await run('Freier Text ohne Formular', ['bug', 'discsleeve']), { added: [], removed: [] });
  assert.deepEqual(await run(''), { added: [], removed: [] });
});

test('Issue-Formular: Bearbeiten passt Labels an, Labels des Besitzers bleiben', async () => {
  const r = await run(form('Fehler', 'Builder', false), ['bug', 'discsleeve', 'manuell testen', 'wontfix', 'in arbeit']);
  assert.deepEqual(r, { added: ['builder'], removed: ['discsleeve', 'manuell testen'] });
});

test('Jede Auswahl im Formular hat ein Label im Workflow, nur freigegebene Labels', () => {
  const tpl = fs.readFileSync(path.join(root, '.github', 'ISSUE_TEMPLATE', 'issue.yml'), 'utf8').replace(/\r\n/g, '\n');
  const blocks = tpl.split('options:\n').slice(1, 3).map((b) => b.split(/\n\s+validations:/)[0].split('\n').map((l) => l.replace(/^\s*- /, '').trim()).filter(Boolean));
  assert.equal(blocks.length, 2);
  for (const o of blocks.flat()) assert.ok(script.includes("'" + o + "': ["), o + ' fehlt im Workflow');
  for (const l of ['wontfix', 'duplicate', 'invalid', 'in arbeit', 'blockiert', 'help wanted', 'good first issue']) assert.ok(!script.includes("'" + l + "'"), l + ' darf nicht von Fremden gesetzt werden');
  assert.ok(!/^labels:/m.test(tpl), 'Das Formular setzt keine festen Labels, das macht der Workflow');
});
