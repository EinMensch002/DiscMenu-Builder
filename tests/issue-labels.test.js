const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Das Skript aus dem Workflow wird mit nachgebautem GitHub ausgeführt (keine echte Verbindung).
const root = path.join(__dirname, '..');
const yml = fs.readFileSync(path.join(root, '.github', 'workflows', 'issue-labels.yml'), 'utf8').replace(/\r\n/g, '\n');
const script = yml.split('script: |\n')[1].split('\n').map((l) => l.replace(/^ {12}/, '')).join('\n');
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

async function run(body) {
  const calls = [];
  const github = { rest: { issues: { addLabels: async (a) => { calls.push(a); } } } };
  const context = { repo: { owner: 'o', repo: 'r' }, payload: { issue: { number: 7, body } } };
  const core = { info: () => {} };
  await new AsyncFunction('github', 'context', 'core', script)(github, context, core);
  return calls.length ? calls[0].labels.sort() : [];
}

test('Issue-Formular: Bereiche und Stand werden zu Labels', async () => {
  const body = '### Bereich\n\nDiscSleeve, Tests und Veröffentlichung\n\n### Was ist passiert?\n\nKaputt\n\n### Stand\n\n- [x] Muss auf einem echten Gerät geprüft werden (Drucker, Disc, Windows, Wine)';
  assert.deepEqual(await run(body), ['ci', 'discsleeve', 'manuell testen']);
});

test('Issue-Formular: ohne Haken kein "manuell testen", fremde Werte werden ignoriert', async () => {
  assert.deepEqual(await run('### Bereich\n\nPlayer, Hack\n\n### Stand\n\n- [ ] Muss auf einem echten Gerät geprüft werden'), ['player']);
  assert.deepEqual(await run('Freier Text ohne Formular'), []);
  assert.deepEqual(await run(''), []);
});

test('Jede Auswahl in den Formularen hat ein Label im Workflow', () => {
  for (const f of ['fehler.yml', 'idee.yml']) {
    const form = fs.readFileSync(path.join(root, '.github', 'ISSUE_TEMPLATE', f), 'utf8').replace(/\r\n/g, '\n');
    const opts = form.split('options:\n')[1].split(/\n\s+validations:/)[0].split('\n').map((l) => l.replace(/^\s*- /, '').trim()).filter(Boolean);
    assert.ok(opts.length >= 6, f);
    for (const o of opts) assert.ok(script.includes("'" + o + "':"), f + ': ' + o + ' fehlt im Workflow');
  }
});
