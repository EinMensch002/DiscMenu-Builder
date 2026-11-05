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
  /* Rückseite: oben das Bild, dann der grüne Streifen, unten die Angaben. */
  const BACK = { banner: 13, bottom: 46 };

  /* Größe, in der die Bilder für den Druck angelegt werden sollten */
  function imageSpecs(caseType) {
    const c = CASES[caseType] || CASES.normal;
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
      features: 'Spielfunktionen:', featuresNote: 'Einige Funktionen erfordern GOG Galaxy',
      os: 'Läuft auf', cpu: 'Prozessor', ram: 'Arbeitsspeicher', gpu: 'Grafik', dx: 'DirectX', space: 'Speicherplatz', other: 'Sonstiges',
      ramUnit: 'RAM', spaceUnit: 'freier Speicherplatz', bit64: '64-Bit',
      galaxy: { title: 'GOG GALAXY 2.0', text: 'Alle deine Spiele und Freunde an einem Ort', join: 'JETZT BEITRETEN', url: 'www.gog.com/galaxy' },
      feat: { single_player: 'Single-Player', co_op: 'Co-op', multi_player: 'Multi-Player', controller_support: 'Controller Support', achievements: 'Erfolge', cloud_saves: 'Cloud Saves', leaderboards: 'Bestenlisten' },
    },
    en: {
      features: 'Game Features:', featuresNote: 'Some features require GOG Galaxy',
      os: 'Works on', cpu: 'Processor', ram: 'Memory', gpu: 'Graphics', dx: 'DirectX', space: 'Storage', other: 'Other',
      ramUnit: 'RAM', spaceUnit: 'available space', bit64: '64-bit',
      galaxy: { title: 'GOG GALAXY 2.0', text: 'All your games and friends in one place', join: 'JOIN NOW', url: 'www.gog.com/galaxy' },
      feat: { single_player: 'Single-Player', co_op: 'Co-op', multi_player: 'Multi-Player', controller_support: 'Controller Support', achievements: 'Achievements', cloud_saves: 'Cloud Saves', leaderboards: 'Leaderboards' },
    },
  };
  const FEATURE_ORDER = ['single_player', 'co_op', 'multi_player', 'controller_support', 'achievements', 'cloud_saves', 'leaderboards'];
  const WIN_VERSIONS = ['XP', 'Vista', '7', '8', '10', '11'];
  const USK_VALUES = ['0', '6', '12', '16', '18'];
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
    if (i && i.on) out.push('Intel ' + i.pre + (i.num.trim() ? '-' + i.num.trim() + (i.sfx || '') : ''));
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

  /* --- Standardwerte und Speichern --- */
  function defaultState() {
    return {
      caseType: 'normal', disc: 'dvd', lang: 'de', title: '', copyright: '© 2026 Fanpresse. All rights reserved. Trademarks belong to their respective owners.',
      usk: '0', uskBack: true, galaxy: true, spineLogo: 'fixed', cropMarks: true, foldLines: false, breakHw: false,
      features: ['single_player'],
      os: { win: ['10', '11'], mac: false, linux: false, x64: true },
      cpu: { intel: { on: false, pre: 'Core i5', num: '', sfx: '' }, amd: { on: false, pre: 'Ryzen 5', num: '', sfx: '' }, custom: '' },
      gpu: { nvidia: { on: false, pre: 'RTX', num: '', sfx: '' }, amd: { on: false, pre: 'RX', num: '', sfx: '' }, custom: '' },
      ram: '4', space: '10', dx: '', other: '',
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
    if (!CASES[out.caseType]) out.caseType = 'normal';
    if (!DISCS[out.disc]) out.disc = 'dvd';
    if (!LABELS[out.lang]) out.lang = 'de';
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

  /* Bildgröße für den Druck: längste Kante höchstens max Pixel (300 dpi bei 183 mm sind etwa 2160 Pixel). */
  function fitSize(w, h, max) {
    const k = Math.min(1, max / Math.max(w, h));
    return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
  }

  const api = { PAPER, CASES, BACK, LABELS, FEATURE_ORDER, WIN_VERSIONS, USK_VALUES, DISCS, imageSpecs, formatStorage, osString, cpuList, gpuList, buildSpecs, defaultState, mergeState, fitSize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CoverCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
