'use strict';
/* ===== CLOUDTOP BRAWL — keyboard menus =====
   In every menu (not during a fight):
   - Esc goes back, like pressing the screen's "← Back" button.
   - The arrow keys move between buttons and tiles, and Enter or Space picks the highlighted one.
   Typing in a text box, a number box or a dropdown keeps the arrow keys for that box. */
(function () {
  const TYPING = /^(INPUT|TEXTAREA|SELECT)$/;
  const visible = e => !!(e && e.offsetParent !== null && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden');
  function area() {
    if (document.getElementById('boot')) return null;                       // the start-up screen has its own keys
    if (document.querySelector('.gc-back') || (typeof GUI !== 'undefined' && GUI.open)) return null;   // pop-ups handle their own keys
    const set = document.getElementById('settings');
    if (set && !set.hidden) return set;
    if (typeof G === 'undefined' || G.screen === 'fight') return null;     // in a fight the arrows move your fighter
    const drawer = document.getElementById('cs-drawer');
    if (G.screen === 'setup' && drawer && !drawer.hidden) return drawer;
    return document.getElementById('scr-' + G.screen);
  }
  function backButton(root) {
    if (root.id === 'scr-main') { const b = document.getElementById('hub-back'); return b && !b.hidden ? b : null; }
    return [...root.querySelectorAll('.back, .cs-back')].find(visible) || null;
  }
  function targets(root) {
    return [...root.querySelectorAll('button, a[href], input[type=checkbox], input[type=range], [tabindex="0"]')]
      .filter(e => !e.disabled && !e.classList.contains('gs-native') && visible(e) && e.getBoundingClientRect().width > 0);
  }
  /* pick the closest button in the arrow's direction (straight lines count more than diagonals) */
  function nearest(from, list, key) {
    const a = from.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bestScore = Infinity;
    list.forEach(e => {
      if (e === from) return;
      const b = e.getBoundingClientRect(), dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
      const main = key === 'ArrowRight' ? dx : key === 'ArrowLeft' ? -dx : key === 'ArrowDown' ? dy : -dy;
      const side = key === 'ArrowRight' || key === 'ArrowLeft' ? Math.abs(dy) : Math.abs(dx);
      if (main <= 2) return;
      const score = main + side * 2.5;
      if (score < bestScore) { bestScore = score; best = e; }
    });
    return best;
  }
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && (TYPING.test(t.tagName) && !(t.type === 'checkbox')) || (t && t.isContentEditable)) return;
    const root = area(); if (!root) return;
    if (e.key === 'Escape') {
      if (root.id === 'settings' || root.id === 'cs-drawer') return;          // those close themselves on Esc
      const b = backButton(root); if (!b) return;
      e.preventDefault(); b.click(); return;
    }
    if (!/^Arrow(Up|Down|Left|Right)$/.test(e.key)) return;
    const list = targets(root); if (!list.length) return;
    const cur = document.activeElement && list.includes(document.activeElement) ? document.activeElement : null;
    const next = cur ? nearest(cur, list, e.key) : (root.querySelector('.hub-grid:not([hidden]) .hub-tile') || list[0]);
    if (!next) return;
    e.preventDefault();
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
})();
