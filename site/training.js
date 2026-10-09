'use strict';
/* ===== CLOUDTOP BRAWL — Training Lab =====
   Practice with any fighter you own against a training dummy that respawns forever.
   Your ultimate is always ready (no orb needed) and cooldowns are switched off. */

const TRAIN = { combo: 0, best: 0, last: 0, lastT: 0, reset: false, el: null };
const DUMMY_MODES = [['stand', 'Stand still'], ['walk', 'Walk around'], ['fight', 'Fight back']];

function startTrainingSetup() {
  G.mode = 'solo'; G.training = true;
  const c = loadLocal('cb.char');
  SETUP.slots = [
    { type: 'you', char: isPickable(c, MY_UNLOCKED) ? c : 'titan', lvl: 5, team: 0, nick: '' },
    { type: 'cpu', char: 'titan', lvl: 5, team: 1, nick: '', dummy: 'stand' },
    { type: 'off', char: 'random', lvl: 5, team: 1, nick: '' },
    { type: 'off', char: 'random', lvl: 5, team: 1, nick: '' }
  ];
  SETUP.edit = 0; SETUP.teams = false;
  if (SETUP.stage < 0) SETUP.stage = 0;
  showSetup();
}

/* what the dummy does: nothing, wander (no attacks), or fight like a CPU */
function dummyInput(f, g) {
  const m = f.ctrl.mode || 'stand';
  if (m === 'fight') return aiThink(f, g);
  if (m === 'walk') { const r = aiThink(f, g), keep = BL | BR | BU | BD | BJ; return { b: r.b & keep, pr: r.pr & keep }; }
  return { b: 0, pr: 0 };
}

/* runs every frame in a training match, before the game steps */
function trainingTick(g, inputs) {
  g.fighters.forEach((f, i) => {
    if (f.ctrl.type === 'dummy') inputs[i] = dummyInput(f, g);
    if (f.ctrl.type === 'local') {
      if (!f.ult && !f.avalanche && f.carriedBy == null && !g.ult && f.dead <= 0 && !f.vanish) { f.ult = true; f.ultT = 1e9; f.trainUlt = true; }
      if (f.frzCD > 0) f.frzCD = 0;
    }
  });
  if (TRAIN.reset) {
    TRAIN.reset = false;
    const spots = spawnSpots(g.stage, g.fighters.length);
    g.fighters.forEach((f, k) => { if (!f.vanish) { f.spawn(spots[k].x, spots[k].y, false); f.dmg = 0; } });
    g.projs.length = 0; TRAIN.combo = 0;
    toast('Reset!');
  }
  // combo counter: hits that land while the dummy is still reeling
  const me = g.fighters.find(f => f.ctrl.type === 'local'), d = g.fighters.find(f => f.ctrl.type === 'dummy');
  if (me && d) {
    if (d.dmg > (TRAIN.prevD || 0) + 0.4 && d.lastHit === me.slot) {
      const stunned = TRAIN.stunned;
      TRAIN.combo = stunned ? TRAIN.combo + 1 : 1;
      TRAIN.last = d.dmg - (TRAIN.prevD || 0); TRAIN.lastT = g.frame;
      if (TRAIN.combo > TRAIN.best) TRAIN.best = TRAIN.combo;
    }
    TRAIN.stunned = d.hitstun > 0 || d.frozen > 0 || d.zap > 0 || d.hitlag > 0;
    if (!TRAIN.stunned && g.frame - TRAIN.lastT > 40) TRAIN.combo = 0;
    TRAIN.prevD = d.dead > 0 ? 0 : d.dmg;
  }
}

/* the small panel at the top of the screen during training */
function trainHud() {
  if (TRAIN.el) return TRAIN.el;
  const st = document.createElement('style');
  st.textContent = `#train-hud{position:fixed;top:calc(58px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:40;display:flex;flex-direction:column;align-items:center;gap:6px;font-family:"Chakra Petch",system-ui,sans-serif;color:#fff;pointer-events:none}
#train-hud[hidden]{display:none}
#train-hud .th-top{display:flex;gap:8px;align-items:center;background:rgba(17,14,36,.85);border:2px solid #6fe39a;border-radius:12px;padding:6px 12px;pointer-events:auto;flex-wrap:wrap;justify-content:center}
#train-hud .th-t{font-family:"Dela Gothic One",Impact,sans-serif;font-size:15px;color:#6fe39a;letter-spacing:.04em}
#train-hud .th-b{font:700 12px "Chakra Petch",system-ui,sans-serif;color:#fff;background:#241d52;border:1px solid #4a4380;border-radius:7px;padding:4px 8px;cursor:pointer}
#train-hud .th-b.on{background:#6fe39a;color:#0c1f14;border-color:#bff5d0}
#train-hud .th-info{font-size:12px;color:#c9c5e6;background:rgba(17,14,36,.7);border-radius:8px;padding:3px 10px}
#train-hud .th-combo{font-family:"Dela Gothic One",Impact,sans-serif;font-size:26px;color:#ffd35c;text-shadow:0 3px 0 #120d24;min-height:30px}
@media (max-width:560px){#train-hud{top:calc(64px + env(safe-area-inset-top,0px))}#train-hud .th-info{display:none}}`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'train-hud'; el.hidden = true;
  const top = document.createElement('div'); top.className = 'th-top';
  const t = document.createElement('span'); t.className = 'th-t'; t.textContent = 'TRAINING LAB'; top.appendChild(t);
  DUMMY_MODES.forEach(([id, name]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'th-b'; b.dataset.m = id; b.textContent = name;
    b.addEventListener('click', e => { e.stopPropagation(); setDummyMode(id); b.blur(); });
    top.appendChild(b);
  });
  const rb = document.createElement('button'); rb.type = 'button'; rb.className = 'th-b'; rb.textContent = 'Reset (R)';
  rb.addEventListener('click', e => { e.stopPropagation(); TRAIN.reset = true; rb.blur(); });
  top.appendChild(rb);
  const info = document.createElement('div'); info.className = 'th-info';
  const combo = document.createElement('div'); combo.className = 'th-combo';
  el.append(top, info, combo);
  document.body.appendChild(el);
  TRAIN.el = el; TRAIN.info = info; TRAIN.comboEl = combo;
  return el;
}
function setDummyMode(m) {
  const g = G.game; if (!g) return;
  g.fighters.forEach(f => { if (f.ctrl.type === 'dummy') { f.ctrl.mode = m; f.ai = null; } });
  const s = SETUP.slots[1]; if (s) s.dummy = m;
  SFX.play('ui');
}
/* called every frame from draw() */
function tickTrainingHud() {
  const covered = !document.getElementById('settings').hidden || !document.getElementById('pause').hidden;
  const on = G.screen === 'fight' && G.training && G.game && !G.remote && !covered;
  if (!on && !TRAIN.el) return;
  const el = trainHud(); el.hidden = !on;
  if (!on) return;
  const d = G.game.fighters.find(f => f.ctrl.type === 'dummy'), mode = d ? d.ctrl.mode : 'stand';
  el.querySelectorAll('.th-b[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
  const ultKey = typeof bindLabel === 'function' ? bindLabel('ult') : 'Z';
  const txt = `${ultKey} = ultimate (always ready) · R = reset · best combo ${TRAIN.best}`;
  if (TRAIN.info.textContent !== txt) TRAIN.info.textContent = txt;
  const c = TRAIN.combo >= 2 ? `${TRAIN.combo} HIT COMBO!` : '';
  if (TRAIN.comboEl.textContent !== c) TRAIN.comboEl.textContent = c;
}
window.addEventListener('keydown', e => {
  if (e.code !== 'KeyR' || e.repeat || !G.training || G.screen !== 'fight' || G.paused) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  TRAIN.reset = true;
});
