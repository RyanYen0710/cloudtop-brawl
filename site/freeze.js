'use strict';
/* ===== CLOUDTOP BRAWL — Mira Frost's Freeze Ray: F toggles it, a chip shows the cooldown ===== */
const FRZ = { el: null, btn: null, f: null };

function frzUi() {
  if (FRZ.el) return;
  const st = document.createElement('style');
  st.textContent = `#frz-chip{position:fixed;left:50%;bottom:104px;transform:translateX(-50%);z-index:60;pointer-events:none;display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:12px;background:rgba(17,14,36,.88);border:2px solid #6b86a8;font-family:"Chakra Petch",system-ui,sans-serif;color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.45);min-width:230px}
#frz-chip[hidden]{display:none}
#frz-chip .fz-ic{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:#21385a;font-size:18px}
#frz-chip b{display:block;font-size:14px;letter-spacing:.04em}
#frz-chip small{display:block;font-size:11px;color:#c9c5e6}
#frz-chip .fz-bar{height:4px;border-radius:2px;background:#15122f;margin-top:4px;overflow:hidden}
#frz-chip .fz-bar i{display:block;height:100%;background:linear-gradient(90deg,#9fe7ff,#ffffff)}
#frz-chip.ready{border-color:#9fe7ff}
#frz-chip.on{border-color:#ffffff;box-shadow:0 0 18px rgba(159,231,255,.7)}
#frz-chip.on .fz-ic{background:#9fe7ff;color:#0b1830}
#frz-btn{right:calc(18px * var(--ts));bottom:calc(190px * var(--ts));width:calc(60px * var(--ts));height:calc(60px * var(--ts));font-size:calc(10px * var(--ts));background:rgba(159,231,255,.35);border-color:#d8f6ff}
#frz-chip.tch{left:calc(10px + env(safe-area-inset-left,0px));top:62px;bottom:auto;transform:none;min-width:0;padding:6px 10px;gap:8px}
#frz-chip.tch .fz-ic{width:24px;height:24px;font-size:14px}
#frz-chip.tch b{font-size:12px}#frz-chip.tch small{font-size:10px}`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'frz-chip'; el.hidden = true; el.setAttribute('aria-live', 'polite');
  const ic = document.createElement('span'); ic.className = 'fz-ic'; ic.textContent = '❄';
  const tx = document.createElement('div'); tx.style.flex = '1';
  const b = document.createElement('b'), sm = document.createElement('small'), bar = document.createElement('div'), fill = document.createElement('i');
  bar.className = 'fz-bar'; bar.appendChild(fill); tx.append(b, sm, bar); el.append(ic, tx);
  document.body.appendChild(el);
  FRZ.el = el; FRZ.b = b; FRZ.sm = sm; FRZ.fill = fill;
  const tb = document.getElementById('tbtns');
  if (tb) {
    const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'tb'; bt.id = 'frz-btn'; bt.textContent = 'FREEZE'; bt.hidden = true; bt.setAttribute('aria-label', 'Toggle freeze ray');
    bt.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); frzToggle(); bt.classList.add('on'); setTimeout(() => bt.classList.remove('on'), 120); });
    tb.appendChild(bt); FRZ.btn = bt;
  }
}

/* sends a new "style" value each press: even = armed, odd = off (the game only reacts to changes) */
function frzToggle() {
  const f = FRZ.f; if (!f) return;
  IN.mode = f.frzOn ? (IN.mode === 1 ? 3 : 1) : (IN.mode === 2 ? 4 : 2);
}
window.addEventListener('keydown', e => {
  if (!(BINDS.frz || []).includes(e.code) || e.repeat || !IN.active || typeof G === 'undefined' || G.screen !== 'fight') return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  if (!FRZ.f) return;
  e.preventDefault(); frzToggle();
});

/* called every frame from draw() */
function tickFreezeRay(view, hud) {
  let f = null;
  if (hud && view && view.fighters) {
    const slot = typeof localSlotNow === 'function' ? localSlotNow() : null;
    f = view.fighters.find(x => x.slot === slot && x.c && x.c.freezeRay && !x.out) || null;
  }
  FRZ.f = f;
  if (!f && !FRZ.el) return;
  frzUi();
  FRZ.el.hidden = !f; if (FRZ.btn) FRZ.btn.hidden = !f;
  if (!f) return;
  const cd = f.frzCD || 0, max = f.c.freezeRay.cd, touch = typeof TOUCH !== 'undefined' && TOUCH.on;
  const state = cd > 0 ? 'cd' : f.frzOn ? 'on' : 'ready';
  if (FRZ.state !== state + Math.ceil(cd / 60) + touch) {
    FRZ.state = state + Math.ceil(cd / 60) + touch;
    FRZ.el.className = (state === 'on' ? 'on' : state === 'ready' ? 'ready' : '') + (touch ? ' tch' : '');
    FRZ.b.textContent = state === 'on' ? 'FREEZE RAY ARMED' : state === 'ready' ? 'FREEZE RAY READY' : 'FREEZE RAY ' + Math.ceil(cd / 60) + 's';
    FRZ.sm.textContent = state === 'on' ? (touch ? 'Next Ice Shard (B) freezes' : 'Next Ice Shard (' + bindLabel('sp') + ') freezes · ' + bindLabel('frz') + ' to cancel') : state === 'ready' ? (touch ? 'Tap FREEZE to arm' : 'Press ' + bindLabel('frz') + ' to arm it') : 'Recharging…';
  }
  FRZ.fill.style.width = (state === 'cd' ? (1 - cd / max) * 100 : 100) + '%';
}
