'use strict';
/* ===== CLOUDTOP BRAWL — main menu hub =====
   Big tiles instead of one long list: Single Player (opens Vs CPU / Training Lab / Boss Fight),
   Online and How to Play. The circle in the middle shows a different fighter every few seconds.
   The buttons keep their old ids, so app.js / boss.js / account.js still wire them up. */

(function () {
  const $ = id => document.getElementById(id);
  const home = $('hub-home'), single = $('hub-single'), tip = $('hub-tip');
  if (!home || !single) return;
  const DEFAULT_TIP = 'Pick a mode to start brawling!';

  function view(which) {
    home.hidden = which !== 'home'; single.hidden = which !== 'single'; $('hub-back').hidden = which === 'home';
    const first = (which === 'home' ? home : single).querySelector('.hub-tile');
    setTip(first);
  }
  function setTip(b) { if (tip) tip.textContent = (b && b.dataset.tip) || DEFAULT_TIP; }

  $('go-single').addEventListener('click', () => { if (typeof SFX !== 'undefined') SFX.play('ui'); view('single'); const f = single.querySelector('.hub-tile'); if (f) f.focus({ preventScroll: true }); });
  $('hub-back').addEventListener('click', () => { if (typeof SFX !== 'undefined') SFX.play('ui'); view('home'); $('go-single').focus({ preventScroll: true }); });
  document.querySelectorAll('#scr-main .hub-tile').forEach(b => {
    b.addEventListener('mouseenter', () => setTip(b));
    b.addEventListener('focus', () => setTip(b));
  });
  // Escape / Backspace inside the Single Player tiles goes back
  single.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); $('hub-back').click(); } });
  view('home');

  /* the fighter showcase in the middle circle */
  const cv = $('hub-cv'); if (!cv) return;
  const g = cv.getContext('2d');
  let idx = Math.floor(Math.random() * 1000), shownAt = 0, last = 0;
  function pickList() {
    const all = typeof ROSTER !== 'undefined' ? ROSTER : [];
    const mine = typeof MY_UNLOCKED !== 'undefined' && MY_UNLOCKED ? all.filter(c => !c.locked || MY_UNLOCKED.includes(c.id)) : all.filter(c => !c.locked);
    return mine.length ? mine : all;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const scr = $('scr-main'); if (!scr || scr.hidden || now - last < 33) return;   // ~30 fps, only while the menu is showing
    last = now;
    const dpr = Math.min(2, window.devicePixelRatio || 1), s = cv.clientWidth; if (!s) return;
    if (cv.width !== Math.round(s * dpr)) { cv.width = cv.height = Math.round(s * dpr); }
    const list = pickList(); if (!list.length) return;
    if (now - shownAt > 2600) { idx++; shownAt = now; }
    const c = list[idx % list.length], k = (now - shownAt) / 2600;
    const W = cv.width, col = (c.ultimate && c.ultimate.colors) || ['#1b1540', '#ffb547', '#ffffff'];
    g.setTransform(1, 0, 0, 1, 0, 0);
    const bg = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    bg.addColorStop(0, col[1]); bg.addColorStop(0.55, col[0]); bg.addColorStop(1, '#0a0818');
    g.fillStyle = bg; g.fillRect(0, 0, W, W);
    g.save(); g.globalCompositeOperation = 'lighter'; g.translate(W / 2, W / 2); g.rotate(now * 0.0003);   // rotating light rays
    for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, -W * 0.09); g.lineTo(W, W * 0.09); g.fill(); }
    g.restore();
    // slide in, hold, slide out
    const slide = k < 0.15 ? (1 - k / 0.15) : k > 0.88 ? -(k - 0.88) / 0.12 : 0;
    const ph = typeof physFor === 'function' ? physFor(c) : { W: 50, H: 90 }, sc = (W * 0.82) / (ph.H * 1.25);
    g.save(); g.globalAlpha = 1 - Math.abs(slide);
    g.translate(W / 2 + slide * W * 0.6, W * 0.9); g.scale(sc, sc);
    try { drawFighter(g, { c, W: ph.W, H: ph.H, x: 0, y: 0, face: 1, pose: 'power', pt: 1, inv: 0 }, now / 16, true); } catch (e) { }
    g.restore();
    const nm = $('hub-name'); if (nm && nm.dataset.id !== c.id) { nm.dataset.id = c.id; nm.textContent = c.name; }
  }
  requestAnimationFrame(frame);
})();
