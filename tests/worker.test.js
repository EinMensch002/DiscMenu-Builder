const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let worker;
test.before(async () => { worker = (await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'cors-proxy', 'worker.js')).href)).default; });

const call = (url, { origin, method = 'GET', env } = {}) => worker.fetch(new Request('https://proxy.example/?url=' + encodeURIComponent(url), { method, headers: origin ? { Origin: origin } : {} }), env);

test('Preflight (OPTIONS) liefert 204 mit CORS-Headern', async () => {
  const r = await call('https://store.steampowered.com/', { method: 'OPTIONS' });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
});

test('Nur GET, nur erlaubte Hosts, nur https', async () => {
  assert.equal((await call('https://store.steampowered.com/', { method: 'POST' })).status, 405);
  assert.equal((await call('https://evil.example/')).status, 403);
  assert.equal((await call('https://steamgriddb.com.evil.example/')).status, 403);
  assert.equal((await call('http://store.steampowered.com/')).status, 403);
  assert.equal((await worker.fetch(new Request('https://proxy.example/'), {})).status, 400);
});

test('Herkunftsbeschränkung (ALLOWED_ORIGIN)', async () => {
  const env = { ALLOWED_ORIGIN: 'https://a.example, https://b.example' };
  assert.equal((await call('https://evil.example/', { origin: 'https://x.example', env })).status, 403);
  assert.equal((await call('https://evil.example/', { env })).status, 403);
  const r = await call('https://evil.example/', { origin: 'https://b.example', env });
  assert.equal(r.status, 403);                       // Herkunft ok, aber Host nicht erlaubt
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://b.example');
});

test('Weiterleitung und Authorization werden korrekt behandelt', async () => {
  const real = globalThis.fetch; let seen;
  try {
    globalThis.fetch = async (u, init) => { seen = init.headers; return Object.defineProperty(new Response('ok', { status: 200 }), 'url', { value: String(u) }); };
    const req = new Request('https://proxy.example/?url=' + encodeURIComponent('https://www.steamgriddb.com/api/v2/x'), { headers: { Authorization: 'Bearer k' } });
    const r = await worker.fetch(req, {});
    assert.equal(r.status, 200);
    assert.equal(seen.get('Authorization'), 'Bearer k');
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    globalThis.fetch = async () => Object.defineProperty(new Response('x'), 'url', { value: 'https://evil.example/' });
    assert.equal((await call('https://store.steampowered.com/a')).status, 403);
  } finally { globalThis.fetch = real; }
});

test('Info-Abfrage: Version und erlaubte Hosts, abgestimmt mit den Tools', async () => {
  const fs = require('node:fs');
  const r = await worker.fetch(new Request('https://proxy.example/?info=1'), {});
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
  const info = await r.json();
  assert.equal(info.name, 'discmenu-proxy');
  const O = require('../disc-sleeve/online.js');
  assert.equal(info.version, O.WORKER_VERSION, 'VERSION im Worker und WORKER_VERSION im DiscSleeve sind gleich');
  const conf = fs.readFileSync(path.join(__dirname, '..', 'configurator', 'index.html'), 'utf8');
  assert.equal(Number(conf.match(/const WORKER_VERSION = (\d+);/)[1]), info.version, 'WORKER_VERSION im Konfigurator ist gleich');
  assert.deepEqual(JSON.parse(conf.match(/const REQUIRED_HOSTS = (\[.*?\]);/)[1].replace(/'/g, '"')), O.REQUIRED_HOSTS, 'beide Tools brauchen dieselben Hosts');
  for (const h of O.REQUIRED_HOSTS) assert.ok(info.hosts.some((src) => new RegExp(src).test(h)), 'Der Worker erlaubt ' + h);
  // Mit url-Parameter bleibt es ein normaler Proxy-Aufruf, ohne beides ein Fehler
  assert.equal((await worker.fetch(new Request('https://proxy.example/?info=1&url=' + encodeURIComponent('https://evil.example/')), {})).status, 403);
  // Die Herkunftsbeschränkung gilt auch für die Info
  assert.equal((await worker.fetch(new Request('https://proxy.example/?info=1', { headers: { Origin: 'https://x.example' } }), { ALLOWED_ORIGIN: 'https://a.example' })).status, 403);
});
