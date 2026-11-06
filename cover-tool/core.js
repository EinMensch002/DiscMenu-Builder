/* Kernlogik des Cover-Tools: Maße, Texte für die Systemanforderungen, Standardwerte.
   Ohne Zugriff auf die Seite, damit sie sich mit Node testen lässt (tests/cover.test.js). */
(function (root) {
  'use strict';

  /* --- Maße in Millimetern (Papier: A4 quer) --- */
  const PAPER = { w: 297, h: 210 };
  const CASES = {
    normal: { name: 'Normal (14 mm Rücken)', w: 273, h: 183, back: 130, spine: 14, front: 129 },
    slim: { name: 'Slim Case (7 mm Rücken)', w: 266, h: 183, back: 129.5, spine: 7, front: 129.5 },
  };
  /* Eigene Maße: erlaubte Bereiche in mm. Das Blatt (A4 quer) muss Cover plus Schnittmarken (je 6 mm) aufnehmen. */
  const CUSTOM_LIMITS = { back: [100, 150], spine: [3, 30], front: [100, 150], h: [100, 198] };
  const MAX_W = 285;
  /* Vorlagen für andere Hüllen. Das sind Richtwerte aus Herstellerangaben, die je nach Hersteller abweichen: bitte nachmessen. */
  const PRESETS = {
    bluray: { name: 'Blu-ray (Richtwert 269 × 148 mm)', back: '127.5', spine: '14', front: '127.5', h: '148' },
    blurayslim: { name: 'Blu-ray Slim (Richtwert 262 × 148 mm)', back: '127.5', spine: '7', front: '127.5', h: '148' },
  };
  /* Maße der gewählten Hülle. Eigene Werte werden in die erlaubten Bereiche gezwungen (adjusted: true, wenn etwas geändert wurde). */
  function caseDims(state) {
    if (state.caseType !== 'custom') return CASES[state.caseType] || CASES.normal;
    const c = state.custom || {}, defaults = { back: 130, spine: 14, front: 129, h: 183 };
    let adjusted = false;
    const num = (k) => {
      const [lo, hi] = CUSTOM_LIMITS[k];
      let v = parseFloat(String(c[k]).replace(',', '.'));
      if (!isFinite(v)) { v = defaults[k]; adjusted = true; }
      if (v < lo || v > hi) { v = Math.min(hi, Math.max(lo, v)); adjusted = true; }
      return v;
    };
    let back = num('back'), spine = num('spine'), front = num('front');
    const h = num('h');
    if (back + spine + front > MAX_W) {                      // zu breit für das Blatt: Rückseite und Vorderseite gleich viel kürzen
      const cut = (back + spine + front - MAX_W) / 2;
      back = round1(back - cut); front = round1(front - cut); adjusted = true;
    }
    return { name: 'Eigene Maße', w: round1(back + spine + front), h, back: round1(back), spine: round1(spine), front: round1(front), adjusted };
  }

  /* Rückseite: oben das Bild, dann der grüne Streifen, unten die Angaben. */
  const BACK = { banner: 13, bottom: 46 };

  /* Größe, in der die Bilder für den Druck angelegt werden sollten */
  function imageSpecs(caseOrDims) {
    const c = typeof caseOrDims === 'object' ? caseOrDims : (CASES[caseOrDims] || CASES.normal);
    return {
      front: { w: c.front, h: c.h },
      backTop: { w: c.back, h: round1(c.h - BACK.banner - BACK.bottom) },
      backBottom: { w: c.back, h: BACK.bottom },
    };
  }
  const round1 = (n) => Math.round(n * 10) / 10;

  /* --- Texte --- */
  const LABELS = {
    de: {
      reqTitle: 'SYSTEMANFORDERUNGEN', tag: 'PC · DRM-FREI',
      features: 'Spielfunktionen:', featuresNote: 'Einige Funktionen erfordern GOG Galaxy',
      min: 'MINIMUM', rec: 'EMPFOHLEN', short: { ram: 'RAM', space: 'Speicher' }, os: 'Läuft auf', cpu: 'Prozessor', ram: 'Arbeitsspeicher', gpu: 'Grafik', dx: 'DirectX', space: 'Speicherplatz', other: 'Sonstiges',
      ramUnit: 'RAM', spaceUnit: 'freier Speicherplatz', bit64: '64-Bit',
      galaxy: { title: 'GOG GALAXY 2.0', text: 'Alle deine Spiele und Freunde an einem Ort', join: 'JETZT BEITRETEN', url: 'www.gog.com/galaxy' },
      feat: { single_player: 'Single-Player', co_op: 'Co-op', multi_player: 'Multi-Player', controller_support: 'Controller Support', achievements: 'Erfolge', cloud_saves: 'Cloud Saves', leaderboards: 'Bestenlisten' },
    },
    en: {
      reqTitle: 'SYSTEM REQUIREMENTS', tag: 'PC · DRM-FREE',
      features: 'Game Features:', featuresNote: 'Some features require GOG Galaxy',
      min: 'MINIMUM', rec: 'RECOMMENDED', short: {}, os: 'Works on', cpu: 'Processor', ram: 'Memory', gpu: 'Graphics', dx: 'DirectX', space: 'Storage', other: 'Other',
      ramUnit: 'RAM', spaceUnit: 'available space', bit64: '64-bit',
      galaxy: { title: 'GOG GALAXY 2.0', text: 'All your games and friends in one place', join: 'JOIN NOW', url: 'www.gog.com/galaxy' },
      feat: { single_player: 'Single-Player', co_op: 'Co-op', multi_player: 'Multi-Player', controller_support: 'Controller Support', achievements: 'Achievements', cloud_saves: 'Cloud Saves', leaderboards: 'Leaderboards' },
    },
  };
  const FEATURE_ORDER = ['single_player', 'co_op', 'multi_player', 'controller_support', 'achievements', 'cloud_saves', 'leaderboards'];
  const WIN_VERSIONS = ['XP', 'Vista', '7', '8', '10', '11'];
  const USK_VALUES = ['0', '6', '12', '16', '18'];
  /* Anbieter: Farben und Schriftzug. Es gibt nur Text und Farben, keine Logos (außer dem vorhandenen GOG-Logo). */
  const PROVIDERS = {
    gog: { name: 'GOG', wordmark: '', brand: '#89268d', onBrand: '#ffffff', dark: '#17101f', mid: '#2b1842', accent: '#d65cff', bannerA: '#a8e02a', bannerB: '#84c01a', tag: { de: 'PC · DRM-FREI', en: 'PC · DRM-FREE' }, note: { de: 'Einige Funktionen erfordern GOG Galaxy', en: 'Some features require GOG Galaxy' } },
    epic: { name: 'Epic Games', wordmark: 'EPIC GAMES', brand: '#2d2d33', onBrand: '#ffffff', dark: '#111114', mid: '#24242a', accent: '#d6dae4', bannerA: '#eceef3', bannerB: '#c9ccd6', tag: { de: 'PC', en: 'PC' }, note: { de: 'Einige Funktionen erfordern den Epic Games Launcher', en: 'Some features require the Epic Games Launcher' } },
    steam: { name: 'Steam', wordmark: 'STEAM', brand: '#1b3a57', onBrand: '#66c0f4', dark: '#0e1722', mid: '#1b2838', accent: '#66c0f4', bannerA: '#7fcbf7', bannerB: '#4a9bc9', tag: { de: 'PC', en: 'PC' }, note: { de: 'Einige Funktionen erfordern Steam', en: 'Some features require Steam' } },
  };
  const THEMES = { classic: 'Klassisch (GOG-Original)', modern: 'Modern (Konsolen-Stil)' };
  const DISCS = { cd: 'cd.png', dvd: 'dvd.png', bluray: 'blu-ray.png' };

  /* 0,5 -> "500 MB", 4 -> "4 GB", "4,5" -> "4.5 GB" */
  function formatStorage(value, unit) {
    const n = parseFloat(String(value == null ? '' : value).replace(',', '.'));
    if (!isFinite(n) || n <= 0) return '';
    const text = n < 1 ? Math.round(n * 1000) + ' MB' : trimNumber(n) + ' GB';
    return unit ? text + ' ' + unit : text;
  }
  const trimNumber = (n) => String(Math.round(n * 100) / 100);

  /* Betriebssysteme: "Windows (7, 10, 11, 64-Bit) / Mac / Linux" */
  function osString(os, lang) {
    const L = LABELS[lang] || LABELS.de;
    const parts = [];
    const win = WIN_VERSIONS.filter((v) => (os.win || []).includes(v));
    if (win.length || (os.x64 && os.win && os.win.length)) {
      const inner = win.slice();
      if (os.x64) inner.push(L.bit64);
      parts.push(inner.length ? 'Windows (' + inner.join(', ') + ')' : 'Windows');
    }
    if (os.mac) parts.push('macOS');
    if (os.linux) parts.push('Linux');
    return parts.join(' / ');
  }

  /* Prozessor und Grafikkarte: Liste von Alternativen (eine oder zwei Marken) oder ein freier Text */
  function cpuList(cpu) {
    if (cpu.custom && cpu.custom.trim()) return [cpu.custom.trim()];
    const out = [];
    const i = cpu.intel, a = cpu.amd;
    if (i && i.on) out.push('Intel ' + i.pre + (i.num.trim() ? (/^Core i\d$/.test(i.pre) ? '-' : ' ') + i.num.trim() + (i.sfx || '') : ''));
    if (a && a.on) out.push('AMD ' + a.pre + (a.num.trim() ? ' ' + a.num.trim() + (a.sfx || '') : ''));
    return out;
  }
  function gpuList(gpu) {
    if (gpu.custom && gpu.custom.trim()) return [gpu.custom.trim()];
    const out = [];
    const n = gpu.nvidia, a = gpu.amd;
    if (n && n.on) {
      const geforce = ['RTX', 'GTX', 'GTS', 'GT'].includes(n.pre);
      out.push('NVIDIA ' + (geforce ? 'GeForce ' : '') + n.pre + (n.num.trim() ? ' ' + n.num.trim() : '') + (n.sfx ? ' ' + n.sfx : ''));
    }
    if (a && a.on) out.push('AMD Radeon ' + a.pre + (a.num.trim() ? ' ' + a.num.trim() : '') + (a.sfx ? ' ' + a.sfx : ''));
    return out;
  }

  /* ---------- Prozessor- und Grafikkartentexte (z. B. von Steam) in die Kategorien übersetzen ---------- */
  const clean = (t) => String(t || '').replace(/[®™]|\(R\)|\(TM\)|\(r\)|\(tm\)/g, '').replace(/\([^)]*\)/g, ' ')
    .replace(/\s+(?:or|oder)\s+(?:better|higher|equivalent|faster|newer|above|similar)\b.*$/i, '').replace(/\s+(?:or|oder)?\s*(?:equivalent|better)\s*$/i, '').replace(/\s+/g, ' ').trim();
  const split = (t) => clean(t).split(/\s+(?:or|oder)\s+|\s*\/\s*|\s*;\s*|,\s*(?=(?:AMD|Intel|NVIDIA|GeForce|Radeon|Ryzen|Core|Athlon|Phenom|FX)\b)/i).map((x) => x.trim()).filter(Boolean);

  /* Ein Prozessor -> { vendor: 'intel'|'amd', pre, num, sfx } oder null, wenn er nicht sauber in die Kategorien passt */
  function parseCpuOne(alt) {
    const t = alt.replace(/^(?:Intel|AMD)\s+/i, '');
    let m = t.match(/^Core\s*(i[3579])\s*-?\s*(\d{3,5})?([A-Z]{0,2})$/i);
    if (m) {
      const suffix = (m[3] || '').toUpperCase(), known = ['K', 'KF', 'F'].includes(suffix);
      return { vendor: 'intel', pre: 'Core ' + m[1].toLowerCase(), num: (m[2] || '') + (m[2] && !known ? suffix : ''), sfx: known ? suffix : '' };
    }
    m = t.match(/^(Core 2 Duo|Core 2 Quad|Pentium|Celeron)\s*(.*)$/i);
    if (m && /^[A-Za-z0-9 .+-]*$/.test(m[2]) && !/(?:mhz|ghz)/i.test(m[2])) {
      const pre = ['Core 2 Duo', 'Core 2 Quad', 'Pentium', 'Celeron'].find((p) => p.toLowerCase() === m[1].toLowerCase());
      return { vendor: 'intel', pre, num: m[2].trim(), sfx: '' };
    }
    m = t.match(/^Ryzen\s*([3579])\s*(\d{3,5})\s*(X3D|XT|X|G|GE|U|H|HS)?$/i);
    if (m) {
      const suffix = (m[3] || '').toUpperCase(), known = ['X', 'X3D', 'G'].includes(suffix);
      return { vendor: 'amd', pre: 'Ryzen ' + m[1], num: m[2] + (suffix && !known ? suffix : ''), sfx: known ? suffix : '' };
    }
    m = t.match(/^(Athlon|Phenom|FX)\s*-?\s*(.*)$/i);
    if (m && /^[A-Za-z0-9 .+-]*$/.test(m[2]) && !/(?:mhz|ghz)/i.test(m[2])) {
      return { vendor: 'amd', pre: ({ athlon: 'Athlon', phenom: 'Phenom', fx: 'FX' })[m[1].toLowerCase()], num: m[2].trim(), sfx: '' };
    }
    return null;
  }
  const detectCpuVendor = (a) => (/\b(?:amd|ryzen|athlon|phenom|fx|opteron)\b/i.test(a) ? 'amd' : /\b(?:intel|core|pentium|celeron|xeon)\b/i.test(a) ? 'intel' : '');

  /* Prozessor-Text -> { cpu: { intel, amd, custom } } für die Kategorien oder null (dann als Text übernehmen) */
  function parseCpuText(text) {
    const alts = split(text);
    if (!alts.length || alts.length > 2) return null;
    const out = { intel: { on: false, pre: 'Core i5', num: '', sfx: '' }, amd: { on: false, pre: 'Ryzen 5', num: '', sfx: '' }, custom: '' };
    for (const a of alts) {
      const r = parseCpuOne(a);
      if (!r || out[r.vendor].on || detectCpuVendor(a) && detectCpuVendor(a) !== r.vendor) return null;
      out[r.vendor] = { on: true, pre: r.pre, num: r.num, sfx: r.sfx };
    }
    return { cpu: out };
  }

  /* Eine Grafikkarte -> { vendor: 'nvidia'|'amd', pre, num, sfx } oder null */
  function parseGpuOne(alt) {
    if (/\bintel\b/i.test(alt)) return null;
    const t = alt.replace(/\b(?:NVIDIA|AMD|ATI|GeForce|Radeon)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    let m = t.match(/^(RTX|GTX|GTS|GT)\s*(\d{2,4})\s*(Ti|SUPER)?(?:\s+(\d+\s?GB))?$/i);
    if (m) return { vendor: 'nvidia', pre: m[1].toUpperCase(), num: m[2], sfx: [m[3] ? (m[3].toLowerCase() === 'ti' ? 'Ti' : 'SUPER') : '', (m[4] || '').replace(/\s+/, '').toUpperCase()].filter(Boolean).join(' ') };
    m = t.match(/^(RX|HD|R9|R7|R5)\s*(\d{3,4})\s*(XTX|XT|GRE)?(?:\s+(\d+\s?GB))?$/i);
    if (m) return { vendor: 'amd', pre: m[1].toUpperCase(), num: m[2], sfx: [(m[3] || '').toUpperCase(), (m[4] || '').replace(/\s+/, '').toUpperCase()].filter(Boolean).join(' ') };
    return null;
  }
  function parseGpuText(text) {
    const alts = split(text);
    if (!alts.length || alts.length > 2) return null;
    const out = { nvidia: { on: false, pre: 'RTX', num: '', sfx: '' }, amd: { on: false, pre: 'RX', num: '', sfx: '' }, custom: '' };
    for (const a of alts) {
      const r = parseGpuOne(a);
      if (!r || out[r.vendor].on) return null;
      out[r.vendor] = { on: true, pre: r.pre, num: r.num, sfx: r.sfx };
    }
    return { gpu: out };
  }

  /* Zeilen für die Systemanforderungen. Leere Zeilen entfallen. values ist eine Liste von Alternativen. */
  function buildSpecs(state) {
    const L = LABELS[state.lang] || LABELS.de;
    const rows = [
      ['os', L.os, [osString(state.os, state.lang)]],
      ['cpu', L.cpu, cpuList(state.cpu)],
      ['ram', L.ram, [formatStorage(state.ram, L.ramUnit)]],
      ['gpu', L.gpu, gpuList(state.gpu)],
      ['dx', L.dx, [(state.dx || '').trim()]],
      ['space', L.space, [formatStorage(state.space, L.spaceUnit)]],
      ['other', L.other, [(state.other || '').trim()]],
    ];
    return rows.map(([key, label, values]) => ({ key, label, values: values.filter(Boolean) })).filter((r) => r.values.length);
  }

  /* Tabelle für die Rückseite: je Zeile die Mindest- und (wenn eingeschaltet) die empfohlenen Angaben.
     Gleiche Angaben stehen nur einmal da (shared), das Betriebssystem gilt immer für beide. */
  function buildSpecTable(state) {
    const L = LABELS[state.lang] || LABELS.de;
    const pick = (s) => ({
      cpu: cpuList(s.cpu), ram: [formatStorage(s.ram, L.ramUnit)], gpu: gpuList(s.gpu),
      dx: [(s.dx || '').trim()], space: [formatStorage(s.space, L.spaceUnit)], other: [(s.other || '').trim()],
    });
    const m = pick(state), r = state.rec && state.rec.on ? pick(state.rec) : null;
    const rows = [];
    const os = osString(state.os, state.lang);
    if (os) rows.push({ key: 'os', label: L.os, short: L.short.os || L.os, min: [os], rec: [], shared: true });
    for (const [key, label] of [['cpu', L.cpu], ['ram', L.ram], ['gpu', L.gpu], ['dx', L.dx], ['space', L.space], ['other', L.other]]) {
      const min = m[key].filter(Boolean), rec = r ? r[key].filter(Boolean) : [];
      if (!min.length && !rec.length) continue;
      const same = !!rec.length && JSON.stringify(min) === JSON.stringify(rec);
      rows.push({ key, label, short: L.short[key] || label, min, rec: same ? [] : rec, shared: same || !r });
    }
    return { rows, dual: rows.some((x) => !x.shared), labels: { min: L.min, rec: L.rec } };
  }

  /* --- Standardwerte und Speichern --- */
  function defaultState() {
    return {
      caseType: 'normal', disc: 'dvd', lang: 'de', theme: 'classic', provider: 'gog', title: '', copyright: '© 2026 Fanpresse. All rights reserved. Trademarks belong to their respective owners.',
      custom: { back: '130', spine: '14', front: '129', h: '183' },
      usk: '0', uskBack: true, galaxy: true, spineLogo: 'fixed', cropMarks: true, foldLines: false, breakHw: false,
      features: ['single_player'],
      os: { win: ['10', '11'], mac: false, linux: false, x64: true },
      cpu: { intel: { on: false, pre: 'Core i5', num: '', sfx: '' }, amd: { on: false, pre: 'Ryzen 5', num: '', sfx: '' }, custom: '' },
      gpu: { nvidia: { on: false, pre: 'RTX', num: '', sfx: '' }, amd: { on: false, pre: 'RX', num: '', sfx: '' }, custom: '' },
      ram: '4', space: '10', dx: '', other: '',
      /* Empfohlene Anforderungen (optional, zusätzlich zu den Mindestanforderungen oben) */
      rec: {
        on: false,
        cpu: { intel: { on: false, pre: 'Core i5', num: '', sfx: '' }, amd: { on: false, pre: 'Ryzen 5', num: '', sfx: '' }, custom: '' },
        gpu: { nvidia: { on: false, pre: 'RTX', num: '', sfx: '' }, amd: { on: false, pre: 'RX', num: '', sfx: '' }, custom: '' },
        ram: '8', space: '10', dx: '', other: '',
      },
    };
  }

  /* Gespeicherte Einstellungen mit den Standardwerten zusammenführen (alte oder kaputte Daten stören nicht). */
  function mergeState(saved) {
    const base = defaultState();
    if (!saved || typeof saved !== 'object') return base;
    const out = {};
    for (const key of Object.keys(base)) {
      const b = base[key], s = saved[key];
      if (s === undefined || s === null) out[key] = b;
      else if (Array.isArray(b)) out[key] = Array.isArray(s) ? s.filter((x) => typeof x === 'string') : b;
      else if (typeof b === 'object') out[key] = mergeObject(b, s);
      else out[key] = typeof s === typeof b ? s : b;
    }
    if (!CASES[out.caseType] && out.caseType !== 'custom') out.caseType = 'normal';
    if (!DISCS[out.disc]) out.disc = 'dvd';
    if (!LABELS[out.lang]) out.lang = 'de';
    if (!THEMES[out.theme]) out.theme = 'classic';
    if (!PROVIDERS[out.provider]) out.provider = 'gog';
    if (out.usk !== 'none' && !USK_VALUES.includes(out.usk)) out.usk = '0';
    return out;
  }
  function mergeObject(base, saved) {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return base;
    const out = {};
    for (const key of Object.keys(base)) {
      const b = base[key], s = saved[key];
      if (s === undefined || s === null) out[key] = b;
      else if (Array.isArray(b)) out[key] = Array.isArray(s) ? s.filter((x) => typeof x === 'string') : b;
      else if (typeof b === 'object') out[key] = mergeObject(b, s);
      else out[key] = typeof s === typeof b ? s : b;
    }
    return out;
  }

  /* --- Übernahme aus einem Rezept (menu.json) --- */
  /* Spiele eines Rezepts, nach index sortiert */
  function recipeGames(menu) {
    const games = menu && Array.isArray(menu.games) ? menu.games.slice() : [];
    return games.filter((g) => g && typeof g.name === 'string')
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map((g) => ({ index: g.index || 0, name: g.name, provider: PROVIDERS[g.provider] ? g.provider : 'gog', cover: g.cover || '', description: g.description || '', sizeMB: Number(g.estimatedSizeMB) || 0 }));
  }
  /* Was aus einem Spiel übernommen wird: Titel, Anbieter, geschätzte Größe als Speicherplatz */
  function statePatchFromGame(game) {
    const patch = { title: game.name, provider: game.provider };
    if (game.sizeMB > 0) patch.space = String(Math.round((game.sizeMB / 1024) * 10) / 10);
    return patch;
  }

  /* Bildgröße für den Druck: längste Kante höchstens max Pixel (300 dpi bei 183 mm sind etwa 2160 Pixel). */
  function fitSize(w, h, max) {
    const k = Math.min(1, max / Math.max(w, h));
    return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
  }

  const api = { parseCpuText, parseGpuText, PAPER, CASES, BACK, CUSTOM_LIMITS, MAX_W, PRESETS, caseDims, THEMES, PROVIDERS, recipeGames, statePatchFromGame, LABELS, FEATURE_ORDER, WIN_VERSIONS, USK_VALUES, DISCS, imageSpecs, formatStorage, osString, cpuList, gpuList, buildSpecs, buildSpecTable, defaultState, mergeState, fitSize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CoverCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
