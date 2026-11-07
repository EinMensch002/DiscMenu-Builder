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
  const BACK = { banner: 15, bottom: 46 };

  /* Größe, in der die Bilder für den Druck angelegt werden sollten */
  /* Höhe der Kopfleiste (mm): Das Frontbild füllt nur den Teil darunter */
  const BAR_HEIGHT = 18.6;
  function imageSpecs(caseOrDims) {
    const c = typeof caseOrDims === 'object' ? caseOrDims : (CASES[caseOrDims] || CASES.normal);
    return {
      front: { w: c.front, h: round1(c.h - BAR_HEIGHT) },
      backTop: { w: c.back, h: round1(c.h - BACK.banner - BACK.bottom) },
      backBottom: { w: c.back, h: BACK.bottom },
      spineBg: { w: c.spine, h: c.h },
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
      feat: { single_player: 'Single-Player', co_op: 'Co-op', multi_player: 'Multi-Player', online: 'Online', lan: 'LAN', cross_platform: 'Cross-Plattform', mods: 'Mods', vr: 'VR', controller_support: 'Controller Support', achievements: 'Erfolge', cloud_saves: 'Cloud Saves' },
    },
    en: {
      reqTitle: 'SYSTEM REQUIREMENTS', tag: 'PC · DRM-FREE',
      features: 'Game Features:', featuresNote: 'Some features require GOG Galaxy',
      min: 'MINIMUM', rec: 'RECOMMENDED', short: {}, os: 'Works on', cpu: 'Processor', ram: 'Memory', gpu: 'Graphics', dx: 'DirectX', space: 'Storage', other: 'Other',
      ramUnit: 'RAM', spaceUnit: 'available space', bit64: '64-bit',
      feat: { single_player: 'Single-Player', co_op: 'Co-op', multi_player: 'Multi-Player', online: 'Online', lan: 'LAN', cross_platform: 'Cross-Platform', mods: 'Mods', vr: 'VR', controller_support: 'Controller Support', achievements: 'Achievements', cloud_saves: 'Cloud Saves' },
    },
  };
  const FEATURE_ORDER = ['single_player', 'co_op', 'multi_player', 'online', 'lan', 'cross_platform', 'controller_support', 'achievements', 'cloud_saves', 'mods', 'vr'];
  const WIN_VERSIONS = ['XP', 'Vista', '7', '8', '10', '11'];
  const USK_VALUES = ['0', '6', '12', '16', '18'];
  /* Anbieter: Farben und Schriftzug. Es gibt nur Text und Farben, keine Logos (außer dem vorhandenen GOG-Logo). */
  const PROVIDERS = {
    gog: { name: 'GOG', logo: 'gog_logo.svg', wordmark: '', brand: '#89268d', onBrand: '#ffffff', dark: '#17101f', mid: '#2b1842', accent: '#d65cff', bannerA: '#a8e02a', bannerB: '#84c01a', barA: '#9b32a3', barB: '#6c1c72', line: '#a8e02a', darkBar: { barA: '#37373e', barB: '#1b1b1f', line: '#b45ad1', spine: '#232328' }, tag: { de: 'PC · DRM-FREI', en: 'PC · DRM-FREE' }, note: { de: 'Einige Funktionen erfordern GOG Galaxy', en: 'Some features require GOG Galaxy' } },
    epic: { name: 'Epic Games', logo: 'epic_logo.svg', wordmark: 'EPIC GAMES', brand: '#2d2d33', onBrand: '#ffffff', dark: '#0f0f12', mid: '#26262b', accent: '#d6dae4', bannerA: '#3a3a42', bannerB: '#222227', barA: '#3a3a42', barB: '#222227', line: '#d6dae4', tag: { de: 'PC', en: 'PC' }, note: { de: 'Einige Funktionen erfordern den Epic Games Launcher', en: 'Some features require the Epic Games Launcher' } },
    steam: { name: 'Steam', logo: 'steam_logo.svg', wordmark: 'STEAM', brand: '#23394c', onBrand: '#e3e9f0', dark: '#06090d', mid: '#1a2939', accent: '#29abe1', bannerA: '#2a465c', bannerB: '#1a2939', barA: '#2a465c', barB: '#1a2939', line: '#29abe1', tag: { de: 'PC', en: 'PC' }, note: { de: 'Einige Funktionen erfordern Steam', en: 'Some features require Steam' } },
  };
  const THEMES = { bar: 'Leiste, GOG-Farben (Lila mit Grün)', 'bar-dark': 'Leiste, dunkel mit Lila' };
  /* Auswahl im Stil-Menü: Nur GOG hat zwei Farbvarianten (Lila mit Grün, dunkel mit Lila), bei Steam und Epic sind die Farben ohnehin dunkel. */
  function styleOptions(provider) {
    return provider === 'gog' ? [['bar', 'GOG-Farben (Lila mit Grün)'], ['bar-dark', 'Dunkel mit Lila']] : [['bar', 'Leiste']];
  }
  const DISCS = { cd: 'cd.svg', dvd: 'dvd.svg', bluray: 'blu-ray.svg' };

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

  /* ---------- Prozessoren und Grafikkarten ----------
     Beide sind Listen mit beliebig vielen Einträgen. Jeder Eintrag lässt sich an- und ausschalten und ist entweder aus Auswahlfeldern aufgebaut
     (Prozessor: Intel oder AMD mit Reihe, Modell, Zusatz; Grafikkarte: GeForce oder Radeon mit Reihe, Modell, Zusatz, Speicher in GB)
     oder ein freier Text (z. B. "Arc A380"). Auf dem Cover steht jeder Eintrag in einer eigenen Zeile. */
  const HW = {
    cpu: {
      intel: { label: 'Intel', first: 'Core i5', series: ['Core i3', 'Core i5', 'Core i7', 'Core i9', 'Core Ultra 5', 'Core Ultra 7', 'Core Ultra 9', 'Pentium', 'Celeron', 'Core 2 Duo', 'Core 2 Quad'], sfx: ['', 'K', 'KF', 'F'] },
      amd: { label: 'AMD', first: 'Ryzen 5', series: ['Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9', 'Athlon', 'Phenom', 'FX'], sfx: ['', 'X', 'X3D', 'G'] },
    },
    gpu: {
      geforce: { label: 'GeForce', first: 'RTX', series: ['RTX', 'GTX', 'GTS', 'GT', 'Titan', 'Quadro'], sfx: ['', 'Ti', 'SUPER', 'Ti SUPER'] },
      radeon: { label: 'Radeon', first: 'RX', series: ['RX', 'HD', 'R9', 'R7', 'R5', 'Vega'], sfx: ['', 'XT', 'XTX', 'GRE'] },
    },
  };
  const HW_MAX = 8;
  const hwKinds = (type) => Object.keys(HW[type]);

  function newHwItem(type, kind) {
    const spec = HW[type][kind];
    return { on: true, kind: spec ? kind : 'text', pre: spec ? spec.first : '', num: '', sfx: '', gb: '', text: '' };
  }

  /* Markennamen vereinheitlichen: "NVIDIA GeForce RTX 3060" -> "GeForce RTX 3060", "AMD Radeon RX 580" -> "Radeon RX 580" */
  function brandText(t) {
    return String(t || '').replace(/[®™]/g, '').replace(/\bNVIDIA\s+GeForce\b/gi, 'GeForce').replace(/\bAMD\s+Radeon\b/gi, 'Radeon')
      .replace(/\b(?:NVIDIA|Nvidia)\s+(?=(?:RTX|GTX|GTS|GT)\b)/g, 'GeForce ').replace(/\s+/g, ' ').trim();
  }
  const gbText = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) && n > 0 ? trimNumber(n) + ' GB' : ''; };

  function hwText(type, it) {
    if (!it) return '';
    if (it.kind === 'text') return brandText(it.text);
    const num = String(it.num || '').trim(), sfx = it.sfx || '';
    if (type === 'cpu') {
      if (it.kind === 'intel') return 'Intel ' + it.pre + (num ? (/^Core i\d$/.test(it.pre) ? '-' : ' ') + num + sfx : '');
      return 'AMD ' + it.pre + (num ? ' ' + num + sfx : '');
    }
    return [HW.gpu[it.kind].label, it.pre + (num ? ' ' + num : '') + (sfx ? ' ' + sfx : '') + (gbText(it.gb) ? ' ' + gbText(it.gb) : '')].join(' ');
  }
  const hwList = (type, x) => ((x && x.items) || []).filter((it) => it && it.on !== false).map((it) => hwText(type, it)).filter(Boolean);
  const cpuList = (cpu) => hwList('cpu', cpu);
  const gpuList = (gpu) => hwList('gpu', gpu);

  /* Gespeicherte oder übernommene Daten bereinigen. Ältere Einstellungen (Intel/AMD- bzw. NVIDIA/AMD-Felder, eigener Text) werden in Einträge umgewandelt. */
  function legacyHw(x, type) {
    const out = [];
    if (x.custom && String(x.custom).trim()) return [{ ...newHwItem(type, 'text'), text: String(x.custom).trim() }];
    const fields = type === 'cpu' ? [['intel', 'intel'], ['amd', 'amd']] : [['nvidia', 'geforce'], ['amd', 'radeon']];
    for (const [old, kind] of fields) {
      const o = x[old];
      if (!o || !o.on) continue;
      const it = newHwItem(type, kind);
      it.pre = typeof o.pre === 'string' ? o.pre : it.pre; it.num = typeof o.num === 'string' ? o.num : '';
      let sfx = typeof o.sfx === 'string' ? o.sfx : '';
      const m = sfx.match(/(\d+)\s*GB/i);
      if (m) { it.gb = m[1]; sfx = sfx.replace(m[0], '').trim(); }
      it.sfx = sfx;
      out.push(it);
    }
    return out;
  }
  function normalizeHw(x, type) {
    let items = [];
    if (x && Array.isArray(x.items)) items = x.items;
    else if (x && typeof x === 'object') items = legacyHw(x, type);
    const str = (v) => (typeof v === 'string' ? v : '');
    return { items: items.filter((i) => i && typeof i === 'object').slice(0, HW_MAX).map((i) => {
      const kind = hwKinds(type).includes(i.kind) ? i.kind : 'text', spec = HW[type][kind];
      return { on: i.on !== false, kind, pre: spec && spec.series.includes(i.pre) ? i.pre : (spec ? spec.first : ''), num: str(i.num), sfx: spec && spec.sfx.includes(i.sfx) ? i.sfx : '', gb: str(i.gb), text: str(i.text) };
    }) };
  }

  /* ---------- Texte (z. B. von Steam) in Einträge zerlegen ----------
     Ein "or" / "oder" / "/" trennt die Möglichkeiten, jede wird ein eigener Eintrag. Was in Auswahlfelder passt, kommt dorthin
     (z. B. "GeForce GTX 1060 6GB" -> GeForce, GTX, 1060, 6 GB), alles andere bleibt als Text erhalten. */
  const clean = (t) => String(t || '').replace(/[®™]|\(R\)|\(TM\)|\(r\)|\(tm\)/g, '').replace(/\(\s*(\d+(?:[.,]\d+)?\s*GB)\s*\)/gi, ' $1 ').replace(/\([^)]*\)/g, ' ')
    .replace(/\s+(?:or|oder)\s+(?:better|higher|equivalent|faster|newer|above|similar)\b.*$/i, '').replace(/\s+(?:or|oder)?\s*(?:equivalent|better)\s*$/i, '').replace(/\s+/g, ' ').trim();
  const split = (t) => clean(t).split(/\s+(?:or|oder)\s+|\s*\/\s*|\s*;\s*|,\s*(?=(?:AMD|Intel|NVIDIA|GeForce|Radeon|Ryzen|Core|Athlon|Phenom|FX)\b)/i).map((x) => x.trim()).filter(Boolean);

  function parseCpuPart(part) {
    const t = part.replace(/^(?:Intel|AMD)\s+/i, '');
    const item = (kind, pre, num, sfx) => ({ ...newHwItem('cpu', kind), pre, num, sfx });
    let m = t.match(/^Core\s*(i[3579])\s*-?\s*(\d{3,5})?([A-Z]{0,2})$/i);
    if (m) {
      const suffix = (m[3] || '').toUpperCase(), known = ['K', 'KF', 'F'].includes(suffix);
      return item('intel', 'Core ' + m[1].toLowerCase(), (m[2] || '') + (m[2] && !known ? suffix : ''), known ? suffix : '');
    }
    m = t.match(/^Core\s+Ultra\s*([579])\s*(\d{3}[A-Z]{0,2})?$/i);
    if (m) return item('intel', 'Core Ultra ' + m[1], (m[2] || '').toUpperCase(), '');
    m = t.match(/^(Core 2 Duo|Core 2 Quad|Pentium|Celeron)\s*(.*)$/i);
    if (m && /^[A-Za-z0-9 .+-]*$/.test(m[2]) && !/(?:mhz|ghz)/i.test(m[2])) {
      return item('intel', ['Core 2 Duo', 'Core 2 Quad', 'Pentium', 'Celeron'].find((p) => p.toLowerCase() === m[1].toLowerCase()), m[2].trim(), '');
    }
    m = t.match(/^Ryzen\s*([3579])\s*(\d{3,5})?\s*(X3D|XT|X|G|GE|U|H|HS)?$/i);
    if (m) {
      const suffix = (m[3] || '').toUpperCase(), known = ['X', 'X3D', 'G'].includes(suffix);
      return item('amd', 'Ryzen ' + m[1], (m[2] || '') + (m[2] && suffix && !known ? suffix : ''), m[2] && known ? suffix : '');
    }
    m = t.match(/^(Athlon|Phenom|FX)\s*-?\s*(.*)$/i);
    if (m && /^[A-Za-z0-9 .+-]*$/.test(m[2]) && !/(?:mhz|ghz)/i.test(m[2])) return item('amd', ({ athlon: 'Athlon', phenom: 'Phenom', fx: 'FX' })[m[1].toLowerCase()], m[2].trim(), '');
    return { ...newHwItem('cpu', 'text'), text: brandText(part) };
  }
  function parseGpuPart(part) {
    const text = () => ({ ...newHwItem('gpu', 'text'), text: brandText(part) });
    if (/\b(?:intel|arc)\b/i.test(part)) return text();
    const t = part.replace(/\b(?:NVIDIA|AMD|ATI|GeForce|Radeon)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    const mem = '(?:\\s+(\\d+(?:[.,]\\d+)?)\\s?GB)?(?:\\s+VRAM)?$';
    let m = t.match(new RegExp('^(RTX|GTX|GTS|GT)\\s*(\\d{3,4})\\s*(Ti\\s*SUPER|SUPER|Ti)?' + mem, 'i'));
    if (m) return { ...newHwItem('gpu', 'geforce'), pre: m[1].toUpperCase(), num: m[2], sfx: m[3] ? (/ti\s*super/i.test(m[3]) ? 'Ti SUPER' : m[3].toLowerCase() === 'ti' ? 'Ti' : 'SUPER') : '', gb: (m[4] || '').replace(',', '.') };
    m = t.match(new RegExp('^(RX|HD|R9|R7|R5)\\s*(\\d{3,4})\\s*(XTX|XT|GRE)?' + mem, 'i'));
    if (m) return { ...newHwItem('gpu', 'radeon'), pre: m[1].toUpperCase(), num: m[2], sfx: (m[3] || '').toUpperCase(), gb: (m[4] || '').replace(',', '.') };
    m = t.match(new RegExp('^Vega\\s*(\\d{2,3})?' + mem, 'i'));
    if (m) return { ...newHwItem('gpu', 'radeon'), pre: 'Vega', num: m[1] || '', gb: (m[2] || '').replace(',', '.') };
    return text();
  }
  const parseCpuItems = (text) => split(text).slice(0, HW_MAX).map(parseCpuPart);
  const parseGpuItems = (text) => split(text).slice(0, HW_MAX).map(parseGpuPart);

  /* Logo in einen Platz einpassen. across = Platz quer zum Rücken, along = Platz entlang des Rückens (beide in mm), a = Seitenverhältnis (Breite / Höhe).
     rot: 'auto' | 'no' | 'yes'. Automatisch wird gedreht, wenn das Logo aufrecht kaum lesbar wäre (Höhe unter minH). maxW begrenzt die Breite (mm, 0 = keine Grenze).
     -> { rotated, w, h } mit w und h in mm als Größe des Bildes (vor dem Drehen), das Ergebnis passt immer in across × along. */
  function fitLogo(a, rot, across, along, maxW, minH) {
    a = a > 0.05 ? a : 1;
    across = Math.max(1, across); along = Math.max(1, along);
    const upright = () => { let w = Math.min(across, along * a); if (maxW > 0) w = Math.min(w, maxW); return { rotated: false, w, h: w / a }; };
    const rotated = () => { let l = Math.min(along, across * a); if (maxW > 0) l = Math.min(l, maxW); return { rotated: true, w: l, h: l / a }; };
    if (rot === 'yes') return rotated();
    if (rot === 'no') return upright();
    const up = upright();
    return up.h >= (minH || 4) ? up : rotated();
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

  /* "Sonstiges" in einzelne Sätze zerlegen (Zeilenumbruch oder Satzende), Punkt am Ende entfällt */
  const otherLines = (t) => String(t || '').split(/\n+/).flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9])/)).map((x) => x.trim().replace(/(?<!\.)\.$/, '').trim()).filter(Boolean);

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
      if (key === 'other') {                     // Sonstiges: Satz für Satz. Gleiche Sätze stehen einmal in der Mitte, nur abweichende in ihrer Spalte.
        const ml = otherLines(state.other), rl = r ? otherLines(state.rec.other) : [];
        if (!ml.length && !rl.length) continue;
        const low = (x) => x.toLowerCase(), common = ml.filter((l) => rl.some((q) => low(q) === low(l)));
        const onlyMin = ml.filter((l) => !common.includes(l)), onlyRec = rl.filter((l) => !common.some((c) => low(c) === low(l)));
        const short = L.short.other || label;
        if (!r) { rows.push({ key, label, short, min: ml, rec: [], shared: true }); continue; }
        let first = true;
        for (const line of common) { rows.push({ key, label: first ? label : '', short: first ? short : '', min: [line], rec: [], shared: true, cont: !first }); first = false; }
        if (onlyMin.length || onlyRec.length) rows.push({ key, label: first ? label : '', short: first ? short : '', min: onlyMin, rec: onlyRec, shared: false, cont: !first });
        continue;
      }
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
      caseType: 'normal', disc: 'dvd', lang: 'de', theme: 'bar', provider: 'gog', title: '', copyright: '© 2026 Fanpresse. All rights reserved. Trademarks belong to their respective owners.',
      custom: { back: '130', spine: '14', front: '129', h: '183' },
      usk: '0', uskOpacity: '100', uskBack: true, spineLogo: 'fixed', cropMarks: true, foldLines: false, breakHw: false,
      features: ['single_player'],
      os: { win: ['10', '11'], mac: false, linux: false, x64: true },
      cpu: { items: [] },
      gpu: { items: [] },
      ram: '4', space: '10', dx: '', other: '',
      frontPubPlate: 'none', spinePubPlate: 'white',          /* Unterlage hinter dem Publisher-Logo: 'none' | 'white' | 'black' */
      spinePC: true, spineTitle: 'center', spineArt: 'color', spineBgX: '50', spineBgDim: '25', spineUseLogo: true, spinePub: true,
      spineLogoRot: 'auto', spineLogoSide: '1.5', spineLogoTop: '3', spineLogoBottom: '3',      /* Rückenlogo: Drehung, Abstände (mm) zu den Seiten und zu Kopf und Fuß */
      spinePubRot: 'auto', spinePubSide: '1.2', spinePubWidth: '',                             /* Publisher am Fuß: Drehung, Abstand zur Seite (mm), eigene Breite (mm, leer = automatisch) */
      publisher: '', developer: '',         /* z. B. von Steam übernommen, Vorgabe für die Suche nach dem Publisher-Logo */
      /* Empfohlene Anforderungen (optional, zusätzlich zu den Mindestanforderungen oben) */
      rec: {
        on: false,
        cpu: { items: [] },
        gpu: { items: [] },
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
    out.cpu = normalizeHw(saved.cpu, 'cpu'); out.gpu = normalizeHw(saved.gpu, 'gpu');
    out.rec.cpu = normalizeHw(saved.rec && saved.rec.cpu, 'cpu'); out.rec.gpu = normalizeHw(saved.rec && saved.rec.gpu, 'gpu');
    if (!CASES[out.caseType] && out.caseType !== 'custom') out.caseType = 'normal';
    if (!DISCS[out.disc]) out.disc = 'dvd';
    if (!LABELS[out.lang]) out.lang = 'de';
    if (out.theme === 'modern') out.theme = 'bar';             // der frühere Stil "Modern" ist weggefallen, die Leiste kommt ihm am nächsten
    out.theme = (/-dark$/.test(String(out.theme)) || (saved.gogBar === 'dark' && out.provider === 'gog')) ? 'bar-dark' : 'bar';
    if (out.provider !== 'gog') out.theme = 'bar';
    if (!PROVIDERS[out.provider]) out.provider = 'gog';
    for (const k of ['frontPubPlate', 'spinePubPlate']) if (!['none', 'white', 'black'].includes(out[k])) out[k] = k === 'spinePubPlate' ? 'white' : 'none';
    if (out.spineTitle !== 'top') out.spineTitle = 'center';
    if (!['image', 'own'].includes(out.spineArt)) out.spineArt = 'color';
    for (const k of ['spineLogoRot', 'spinePubRot']) if (!['auto', 'no', 'yes'].includes(out[k])) out[k] = 'auto';
    out.uskOpacity = String(Math.min(100, Math.max(30, parseInt(out.uskOpacity, 10) || 100)));
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

  const api = { BAR_HEIGHT, fitLogo, styleOptions, HW, HW_MAX, newHwItem, hwText, normalizeHw, parseCpuItems, parseGpuItems, brandText, PAPER, CASES, BACK, CUSTOM_LIMITS, MAX_W, PRESETS, caseDims, THEMES, PROVIDERS, recipeGames, statePatchFromGame, LABELS, FEATURE_ORDER, WIN_VERSIONS, USK_VALUES, DISCS, imageSpecs, formatStorage, osString, cpuList, gpuList, buildSpecs, buildSpecTable, defaultState, mergeState, fitSize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CoverCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
