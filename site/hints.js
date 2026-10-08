'use strict';
/* ===== CLOUDTOP BRAWL — on-screen button hints (keyboard players) =====
   Two flat bars along the bottom, one on each side of the damage cards, so the keys are
   right where you're already looking: moving + normal attacks on the left, specials (K)
   and the ultimate on the right. Keys light up while you press them. Press H to hide or show. */

const HINTS = { rows: [], shown: false };

function localCharId() {
  if (G.mode === 'guest' || G.remote) {
    const slot = G.remote ? localSlotNow() : SETUP.edit;
    const v = NET.vf && NET.vf.find(x => x.slot === slot);
    if (v) return v.c.id;
    const s = SETUP.slots[slot]; return s ? s.char : null;
  }
  const lf = G.game && G.game.fighters.find(x => x.ctrl && x.ctrl.type === 'local');
  if (lf) return lf.c.id;
  const s = SETUP.slots.find(x => x.type === 'you');
  return s ? s.char : null;
}

function localFighterNow() {
  const slot = typeof localSlotNow === 'function' ? localSlotNow() : null;
  if (G.mode === 'guest' || G.remote) return (NET.vf || []).find(x => x.slot === slot) || null;
  return G.game ? G.game.fighters.find(x => x.ctrl && x.ctrl.type === 'local') || null : null;
}
function hintKey() { const id = localCharId(); const f = CHAR[id] && CHAR[id].modes ? localFighterNow() : null; return CHAR[id] ? id + ':' + (f ? f.yenMode | 0 : 0) : null; }
function buildHints() {
  const el = document.getElementById('hints'), L = document.getElementById('hints-l'), R = document.getElementById('hints-r');
  const c = CHAR[localCharId()];
  HINTS.builtFor = c ? hintKey() : null;
  if (!c) { L.innerHTML = ''; R.innerHTML = ''; HINTS.rows = []; return; }
  const k = t => `<kbd>${esc(t)}</kbd>`;
  const lf = c.modes ? localFighterNow() : null;
  const sp = lf ? fSpecials(lf) : c.specials;
  const styleName = c.modes ? CHAR[c.modes[lf ? lf.yenMode | 0 : 0]].name : '';
  // left bar: moving and normal attacks
  const left = [
    { id: 'move', keys: k(bindLabel('up')) + k(bindLabel('left')) + k(bindLabel('down')) + k(bindLabel('right')), name: 'Move' },
    { id: 'jump', keys: k(bindLabel('jump')), name: 'Jump' },
    { id: 'atk', keys: k(bindLabel('atk')), name: 'Attack' },
    { id: 'sm', keys: k(bindLabel('sm')), name: 'Smash' },
    { id: 'sh', keys: k(bindLabel('sh')), name: 'Shield' }
  ];
  // right bar: the fighter's specials (K + direction) and the ultimate
  const right = [
    { id: 'spN', keys: k(bindLabel('sp')), name: sp.neutral ? sp.neutral.name : '—' },
    { id: 'spS', keys: k(bindLabel('left') + bindLabel('right')) + k(bindLabel('sp')), name: sp.side ? sp.side.name : '—' },
    { id: 'spU', keys: k(bindLabel('up')) + k(bindLabel('sp')), name: sp.up ? sp.up.name : '—' },
    { id: 'spD', keys: k(bindLabel('down')) + k(bindLabel('sp')), name: sp.down ? sp.down.name : '—' },
    { id: 'ult', keys: k(bindLabel('ult')), name: (c.ultimate || DEFAULT_ULT).name, cls: 'h-ult' },
    ...(c.freezeRay ? [{ id: 'frz', keys: k(bindLabel('frz')), name: 'Freeze Ray' }] : []),
    ...(c.modes ? [{ id: 'mode', keys: k('Y') + k('1') + k('–') + k('7'), name: 'Style: ' + styleName }] : [])
  ];
  const chip = r => `<div class="h-row${r.cls ? ' ' + r.cls : ''}" data-h="${r.id}"><span class="h-keys">${r.keys}</span><b class="h-name">${esc(r.name)}</b></div>`;
  L.innerHTML = `<span class="h-tag">Moves</span>` + left.map(chip).join('');
  R.innerHTML = `<span class="h-tag">${esc(c.modes ? styleName : c.name)}</span>` + right.map(chip).join('') + `<span class="h-foot">${k('H')} hide</span>`;
  HINTS.rows = [...el.querySelectorAll('.h-row')];
  HINTS.lay = '';
}

/* put the two bars beside the damage cards (same row) when there's room, otherwise just above them */
function layoutHints() {
  const L = document.getElementById('hints-l'), R = document.getElementById('hints-r'); if (!L || !R) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const n = Math.max(1, (G.game ? G.game.fighters.length : (NET.vf || []).length) || 2);
  const gap = 8, cw = Math.min(210, (vw - 16 - gap * (n - 1)) / n), total = cw * n + gap * (n - 1);
  const hudH = vw < 560 ? 78 : 92, side = (vw - total) / 2 - 16;
  const key = [vw, vh, n].join(',');
  if (HINTS.lay === key) return;
  HINTS.lay = key;
  const beside = side >= 300;
  [L, R].forEach(b => {
    b.style.bottom = (beside ? 6 : hudH + 6) + 'px';
    b.style.width = (beside ? side : Math.min(vw / 2 - 18, 560)) + 'px';
    b.style.minHeight = beside ? (hudH - 12) + 'px' : '';
  });
}

function updateHintsVisibility() {
  const want = G.screen === 'fight' && !TOUCH.on && (typeof SETTINGS === 'undefined' || SETTINGS.hints !== false);
  const el = document.getElementById('hints');
  if (want && !HINTS.shown) buildHints();
  HINTS.shown = want;
  el.hidden = !want;
  if (want) { HINTS.lay = ''; layoutHints(); }
}

/* called every frame: light up the rows for keys being held */
function tickHints() {
  if (!HINTS.shown) return;
  if (HINTS.builtFor !== hintKey()) buildHints();
  layoutHints();
  const b = IN.prev | keyBits();
  const dir = b & BU ? 'spU' : b & BD ? 'spD' : b & (BL | BR) ? 'spS' : 'spN';
  const on = {
    move: !!(b & (BL | BR | BU | BD)), jump: !!(b & BJ), atk: !!(b & BA), sm: !!(b & BM), sh: !!(b & BH),
    spN: false, spS: false, spU: false, spD: false
  };
  if (b & BS) on[dir] = true;
  HINTS.rows.forEach(r => r.classList.toggle('on', !!on[r.dataset.h]));
}

window.addEventListener('keydown', e => {
  if (e.code !== 'KeyH' || G.screen !== 'fight' || e.repeat) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  SETTINGS.hints = SETTINGS.hints === false;
  saveSettings();
  const cb = document.getElementById('set-hints'); if (cb) cb.checked = SETTINGS.hints;
  updateHintsVisibility();
});
document.getElementById('set-hints').addEventListener('change', e => { SETTINGS.hints = e.target.checked; saveSettings(); updateHintsVisibility(); });
