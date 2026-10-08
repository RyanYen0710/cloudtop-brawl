'use strict';
/* ===== CLOUDTOP BRAWL — phone / tablet controls =====
   Floating joystick: put your thumb anywhere on the left side and drag.
   Buttons on the right: slide your thumb between them without lifting.
   Flicking the stick up quickly jumps (can be turned off in Settings). */

const TOUCH = { on: false, stickBits: 0, btnBits: 0, held: new Map(), sid: null, cx: 0, cy: 0, centerAt: 0, wasUp: false };

function touchWanted() {
  const m = (typeof SETTINGS !== 'undefined' && SETTINGS.touch) || 'auto';
  if (m === 'on') return true;
  if (m === 'off') return false;
  return isTouch();
}
function updateTouchUI() {
  const show = G.screen === 'fight' && touchWanted();
  TOUCH.on = show;
  document.getElementById('app').classList.toggle('touch-on', show);
  document.getElementById('touch').hidden = !show;
  document.getElementById('fs-btn').hidden = !show || !document.documentElement.requestFullscreen;
  const size = (typeof SETTINGS !== 'undefined' && SETTINGS.tsize) || 1;
  document.getElementById('touch').style.setProperty('--ts', size);
  updateRotateHint();
  if (typeof updateHintsVisibility === 'function') updateHintsVisibility();
  if (!show) { TOUCH.stickBits = 0; TOUCH.btnBits = 0; TOUCH.held.clear(); syncTouchBits(); }
}
function updateRotateHint() {
  const portrait = window.innerHeight > window.innerWidth * 1.1;
  document.getElementById('rotate-hint').hidden = !(TOUCH.on && portrait && !TOUCH.hintClosed);
}
window.addEventListener('resize', updateRotateHint);

function syncTouchBits() { IN.touch = TOUCH.stickBits | TOUCH.btnBits; }
function buzz() { if (typeof SETTINGS !== 'undefined' && SETTINGS.haptics && navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { } } }

function setupTouch() {
  const zone = document.getElementById('stickzone'), stick = document.getElementById('stick'), knob = document.getElementById('knob');
  const radius = () => stick.offsetWidth * 0.42;

  const place = (x, y) => {
    const r = zone.getBoundingClientRect(), half = stick.offsetWidth / 2;
    TOUCH.cx = clamp(x, r.left + half, r.right - half);
    TOUCH.cy = clamp(y, r.top + half, r.bottom - half);
    stick.style.left = (TOUCH.cx - r.left - half) + 'px';
    stick.style.top = (TOUCH.cy - r.top - half) + 'px';
    stick.style.bottom = 'auto';
  };
  const move = (x, y) => {
    const R = radius(), dx = x - TOUCH.cx, dy = y - TOUCH.cy, d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    const nx = dx / R, ny = dy / R;
    let nb = 0;
    if (nx < -0.32) nb |= BL; if (nx > 0.32) nb |= BR;
    if (ny < -0.45) nb |= BU; if (ny > 0.5) nb |= BD;
    const now = performance.now();
    if (d < R * 0.3) TOUCH.centerAt = now;
    const up = ny < -0.7;
    if (up && !TOUCH.wasUp && now - TOUCH.centerAt < 140 && (typeof SETTINGS === 'undefined' || SETTINGS.flick)) IN.press |= BJ;
    TOUCH.wasUp = up;
    IN.press |= nb & ~TOUCH.stickBits;
    TOUCH.stickBits = nb; syncTouchBits();
  };
  const release = () => {
    TOUCH.sid = null; TOUCH.stickBits = 0; TOUCH.wasUp = false; syncTouchBits();
    knob.style.transform = ''; stick.classList.remove('live');
    stick.style.left = ''; stick.style.top = ''; stick.style.bottom = '';
  };
  zone.addEventListener('pointerdown', e => {
    if (TOUCH.sid !== null) return;
    e.preventDefault(); SFX.unlock();
    TOUCH.sid = e.pointerId; zone.setPointerCapture(e.pointerId);
    stick.classList.add('live'); place(e.clientX, e.clientY);
    TOUCH.centerAt = performance.now(); move(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', e => { if (e.pointerId === TOUCH.sid) { e.preventDefault(); move(e.clientX, e.clientY); } });
  const endZ = e => { if (e.pointerId === TOUCH.sid) release(); };
  zone.addEventListener('pointerup', endZ); zone.addEventListener('pointercancel', endZ); zone.addEventListener('lostpointercapture', endZ);

  const pad = document.getElementById('tbtns');
  const bitAt = (x, y) => { const el = document.elementFromPoint(x, y); const b = el && el.closest ? el.closest('.tb') : null; return b ? +b.dataset.b : 0; };
  const refresh = () => {
    let bits = 0; TOUCH.held.forEach(b => { bits |= b; }); TOUCH.btnBits = bits; syncTouchBits();
    pad.querySelectorAll('.tb').forEach(b => b.classList.toggle('on', !!(bits & +b.dataset.b)));
  };
  pad.addEventListener('pointerdown', e => {
    e.preventDefault(); SFX.unlock();
    pad.setPointerCapture(e.pointerId);
    const b = bitAt(e.clientX, e.clientY);
    TOUCH.held.set(e.pointerId, b);
    if (b) { IN.press |= b; buzz(); }
    refresh();
  });
  pad.addEventListener('pointermove', e => {
    if (!TOUCH.held.has(e.pointerId)) return;
    e.preventDefault();
    const b = bitAt(e.clientX, e.clientY), old = TOUCH.held.get(e.pointerId);
    if (b !== old) { TOUCH.held.set(e.pointerId, b); if (b) { IN.press |= b; buzz(); } refresh(); }
  });
  const endB = e => { if (TOUCH.held.delete(e.pointerId)) refresh(); };
  pad.addEventListener('pointerup', endB); pad.addEventListener('pointercancel', endB); pad.addEventListener('lostpointercapture', endB);

  document.getElementById('touch').addEventListener('contextmenu', e => e.preventDefault());
  document.getElementById('rotate-close').addEventListener('click', () => { TOUCH.hintClosed = true; updateRotateHint(); });
  document.getElementById('fs-btn').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); return; }
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => { });
    } catch (e) { toast('Full screen isn’t available here. Turn your phone sideways for a bigger view.'); }
  });
}
