/* Gemeinsame Seite: Leiste und Umschalten zwischen Menü (#viewMenu) und Hülle (#viewCover), ohne die Seite zu wechseln.
   Die Ansicht steht in der Adresse (#menue oder #huelle), damit Lesezeichen und Neuladen dort weitermachen.
   Sichtbarkeit regelt nur das Attribut data-view am <body> (Regeln in style.css): Elemente mit data-view="menu" bzw. "cover"
   erscheinen nur in ihrer Ansicht. */
(function () {
  'use strict';
  const HASH = { menu: '#menue', cover: '#huelle' };
  const fromHash = () => (/^#(huelle|cover)$/i.test(location.hash) ? 'cover' : /^#(menue|menu)$/i.test(location.hash) ? 'menu' : null);
  const STORE = 'discmenu-view';
  const tabs = [...document.querySelectorAll('.views [data-go]')];

  function show(view) {
    if (view !== 'menu' && view !== 'cover') view = 'menu';
    const changed = document.body.dataset.view !== view;
    document.body.dataset.view = view;
    for (const b of tabs) b.setAttribute('aria-selected', String(b.dataset.go === view));
    if (location.hash !== HASH[view]) history.replaceState(null, '', HASH[view]);
    try { localStorage.setItem(STORE, view); } catch (e) { /* egal */ }
    document.querySelectorAll('details.menu[open]').forEach((d) => { d.open = false; });
    // Die Vorschau der Hülle misst ihre Breite: war sie versteckt, nach dem Einblenden neu einpassen
    if (changed && view === 'cover') requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  for (const b of tabs) b.addEventListener('click', () => show(b.dataset.go));
  window.addEventListener('hashchange', () => { const v = fromHash(); if (v) show(v); });

  // "Einstellungen": im Menü öffnet sich dessen Dialog (gleiche Schlüssel und Proxy, beide Teile teilen sie schon)
  const bSettings = document.getElementById('bSettings'), bSg = document.getElementById('bSg');
  if (bSettings && bSg) bSettings.addEventListener('click', (e) => {
    if (document.body.dataset.view !== 'menu') return;
    e.stopImmediatePropagation(); bSg.click();
  }, true);

  let start = fromHash();
  if (!start) { try { start = localStorage.getItem(STORE); } catch (e) { start = null; } }
  show(start || 'menu');
  window.DiscMenuShell = { show, view: () => document.body.dataset.view };
})();
