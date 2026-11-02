// Kleiner CORS-Proxy für den DiscMenu-Konfigurator (Cloudflare Worker).
// Leitet nur GET-Anfragen an erlaubte Hosts weiter und ergänzt die CORS-Header.
// Anleitung: docs/steamgriddb.md

const ALLOWED_HOSTS = [
  /^([a-z0-9-]+\.)*steamgriddb\.com$/,
  /^store\.steampowered\.com$/,
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const isAllowed = (host) => ALLOWED_HOSTS.some((re) => re.test(host));
const reply = (body, status) => new Response(body, { status, headers: CORS });

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'GET') return reply('Nur GET ist erlaubt.', 405);

    let target;
    try {
      target = new URL(new URL(request.url).searchParams.get('url'));
    } catch (e) {
      return reply('Parameter "url" fehlt oder ist ungültig.', 400);
    }
    if (target.protocol !== 'https:' || !isAllowed(target.hostname)) {
      return reply('Dieser Host ist nicht erlaubt.', 403);
    }

    const headers = new Headers({ 'User-Agent': 'DiscMenu-Konfigurator' });
    const auth = request.headers.get('Authorization');
    if (auth) headers.set('Authorization', auth);

    const upstream = await fetch(target, { headers });
    // Nach Weiterleitungen darf das Ziel nicht aus der Liste der erlaubten Hosts herausführen.
    if (upstream.url && !isAllowed(new URL(upstream.url).hostname)) {
      return reply('Weiterleitung auf einen nicht erlaubten Host.', 403);
    }

    const out = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(CORS)) out.set(k, v);
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
