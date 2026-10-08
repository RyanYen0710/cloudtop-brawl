'use strict';
/* ===== CLOUDTOP BRAWL — on-screen button hints (keyboard players) =====
   A bar on the left lists your fighter's moves with the key for each.
   Rows light up while you press them. Press H to hide or show it. */

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
  const el = document.getElementById('hints');
  const c = CHAR[localCharId()];
  HINTS.builtFor = c ? hintKey() : null;
  if (!c) { el.innerHTML = ''; return; }
  const k = t => `<kbd>${esc(t)}</kbd>`;
  const lf = c.modes ? localFighterNow() : null;
  const sp = lf ? fSpecials(lf) : c.specials;
  const styleName = c.modes ? CHAR[c.modes[lf ? lf.yenMode | 0 : 0]].name : '';
  const rows = [
    { id: 'move', keys: k(bindLabel('up')) + k(bindLabel('left')) + k(bindLabel('down')) + k(bindLabel('right')), name: 'Move' },
    { id: 'jump', keys: k(bindLabel('jump')), name: 'Jump', sub: 'press again in the air' },
    { id: 'atk', keys: k(bindLabel('atk')), name: 'Attack', sub: 'add a direction for other hits' },
    { id: 'sm', keys: k(bindLabel('sm')), name: 'Smash', sub: 'hold to charge' },
    { id: 'sh', keys: k(bindLabel('sh')), name: 'Shield', sub: '+ ← → to roll' },
    { id: 'ledge', keys: k(bindLabel('jump')), name: 'Leap up from an edge', sub: 'you grab edges when close' },
    { id: 'ult', keys: k(bindLabel('ult')), name: (c.ultimate || DEFAULT_ULT).name, sub: `break the orb, then aim and press ${bindLabel('sp')}` },
    ...(c.freezeRay ? [{ id: 'frz', keys: k(bindLabel('frz')), name: 'Freeze Ray on/off', sub: 'next Ice Shard freezes · 30s cooldown' }] : []),
    ...(c.modes ? [{ id: 'mode', keys: k('1') + k('–') + k('7'), name: 'Switch style', sub: 'now: ' + styleName }] : []),
    { sep: true, name: c.modes ? styleName + ' style' : c.name },
    { id: 'spN', keys: k(bindLabel('sp')), name: sp.neutral ? sp.neutral.name : '—' },
    { id: 'spS', keys: k(bindLabel('left') + bindLabel('right')) + k(bindLabel('sp')), name: sp.side ? sp.side.name : '—' },
    { id: 'spU', keys: k(bindLabel('up')) + k(bindLabel('sp')), name: sp.up ? sp.up.name : '—', sub: 'recovery' },
    { id: 'spD', keys: k(bindLabel('down')) + k(bindLabel('sp')), name: sp.down ? sp.down.name : '—' }
  ];
  el.innerHTML = rows.map(r => r.sep
    ? `<div class="h-sep">${esc(r.name)} specials</div>`
    : `<div class="h-row" data-h="${r.id}"><span class="h-keys">${r.keys}</span><span class="h-txt"><b>${esc(r.name)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span></div>`
  ).join('') + `<div class="h-foot">Press ${k('H')} to hide</div>`;
  HINTS.rows = [...el.querySelectorAll('.h-row')];
}

function updateHintsVisibility() {
  const want = G.screen === 'fight' && !TOUCH.on && (typeof SETTINGS === 'undefined' || SETTINGS.hints !== false);
  const el = document.getElementById('hints');
  if (want && !HINTS.shown) buildHints();
  HINTS.shown = want;
  el.hidden = !want;
}

/* called every frame: light up the rows for keys being held */
function tickHints() {
  if (!HINTS.shown) return;
  if (HINTS.builtFor !== hintKey()) buildHints();
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
