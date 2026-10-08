'use strict';
/* ===== CLOUDTOP BRAWL — retro handheld-style boot screen =====
   The logo drops onto a little LCD screen, then "PRESS ANY BUTTON".
   Any key, click or tap plays the chime (this also switches the sound on) and opens the menu. */
(function () {
  const wrap = document.createElement('div');
  wrap.id = 'boot';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#14112b;cursor:pointer;touch-action:none;transition:opacity .45s ease, transform .45s ease';
  const cv = document.createElement('canvas');
  cv.style.cssText = 'width:100%;height:100%;display:block';
  wrap.appendChild(cv);
  document.body.appendChild(wrap);
  const g = cv.getContext('2d');
  const t0 = performance.now();
  let done = false, leaving = 0, skipTo = 0;

  const LCD = '#c5d19c', INK = '#1f2a14', INK2 = '#3c4a26';
  const DROP = 900, POP = 1250, READY = 1650;

  function ease(x) { return 1 - Math.pow(1 - x, 3); }
  function bounce(x) { // a small bounce when the logo lands
    if (x < 0.7) return ease(x / 0.7);
    const k = (x - 0.7) / 0.3; return 1 + Math.sin(k * Math.PI) * 0.06 * (1 - k);
  }

  function frame(now) {
    if (done || !wrap.isConnected) return;
    requestAnimationFrame(frame);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const vw = cv.clientWidth, vh = cv.clientHeight;
    if (cv.width !== Math.round(vw * dpr) || cv.height !== Math.round(vh * dpr)) { cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ms = Math.max(now - t0, skipTo);

    // handheld body
    g.fillStyle = '#14112b'; g.fillRect(0, 0, vw, vh);
    const sw = Math.min(vw * 0.86, 560), sh = Math.min(vh * 0.62, sw * 0.72), sx = (vw - sw) / 2, sy = (vh - sh) / 2 - vh * 0.04;
    const bezel = 18;
    rrect(g, sx - bezel, sy - bezel, sw + bezel * 2, sh + bezel * 2 + 26, 22); g.fillStyle = '#5b5f74'; g.fill();
    rrect(g, sx - bezel + 4, sy - bezel + 4, sw + bezel * 2 - 8, sh + bezel * 2 + 18, 18); g.fillStyle = '#41445a'; g.fill();
    // power light
    const on = ms > 120;
    g.fillStyle = on ? '#ff3b4a' : '#4a1f26'; circle(g, sx + 10, sy + sh / 2, 5); g.fill();
    if (on) { g.fillStyle = 'rgba(255,60,80,.3)'; circle(g, sx + 10, sy + sh / 2, 10); g.fill(); }
    g.font = '700 10px "Chakra Petch", system-ui, sans-serif'; g.fillStyle = '#9ea2b8'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('POWER', sx - 6, sy + sh / 2 + 18);
    // LCD
    const ix = sx + 30, iy = sy + 6, iw = sw - 40, ih = sh - 12;
    rrect(g, ix, iy, iw, ih, 6); g.fillStyle = on ? LCD : '#6d7558'; g.fill();
    g.save(); rrect(g, ix, iy, iw, ih, 6); g.clip();
    // pixel grid for that LCD feel
    g.fillStyle = 'rgba(31,42,20,.05)';
    for (let y = iy; y < iy + ih; y += 4) g.fillRect(ix, y, iw, 1);
    for (let x = ix; x < ix + iw; x += 4) g.fillRect(x, iy, 1, ih);
    const cx = ix + iw / 2, cy = iy + ih * 0.42;
    let fs = Math.min(iw * 0.15, 72);
    g.font = `${Math.round(fs)}px "Dela Gothic One", Impact, sans-serif`;
    const tw = g.measureText('CLOUDTOP').width; if (tw > iw * 0.84) fs *= iw * 0.84 / tw;
    // logo drops in
    const dk = Math.min(1, Math.max(0, (ms - 150) / DROP));
    const ly = (iy - fs) + (cy - (iy - fs)) * bounce(dk);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${Math.round(fs)}px "Dela Gothic One", Impact, sans-serif`;
    g.fillStyle = INK2; g.fillText('CLOUDTOP', cx + 3, ly + 3);
    g.fillStyle = INK; g.fillText('CLOUDTOP', cx, ly);
    // BRAWL pops in after the landing
    const pk = Math.min(1, Math.max(0, (ms - POP) / 260));
    if (pk > 0) {
      const s = 0.4 + 0.6 * ease(pk) + Math.sin(pk * Math.PI) * 0.15;
      g.save(); g.translate(cx, cy + fs * 0.95); g.scale(s, s);
      g.font = `${Math.round(fs * 0.62)}px "Dela Gothic One", Impact, sans-serif`;
      g.fillStyle = INK2; g.fillText('BRAWL', 3, 3);
      g.fillStyle = '#2f4a8a'; g.fillText('BRAWL', 0, 0);
      g.restore();
      // sparkle
      const sp = Math.min(1, (ms - POP) / 500);
      if (sp < 1) {
        g.fillStyle = INK; const sxp = cx + fs * 2.2, syp = cy + fs * 0.6, r = 10 * Math.sin(sp * Math.PI);
        g.beginPath(); g.moveTo(sxp, syp - r * 2); g.lineTo(sxp + r * 0.4, syp); g.lineTo(sxp, syp + r * 2); g.lineTo(sxp - r * 0.4, syp); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(sxp - r * 2, syp); g.lineTo(sxp, syp + r * 0.4); g.lineTo(sxp + r * 2, syp); g.lineTo(sxp, syp - r * 0.4); g.closePath(); g.fill();
      }
    }
    // press any button
    if (ms > READY && Math.floor((ms - READY) / 480) % 2 === 0 && !leaving) {
      g.font = `700 ${Math.round(Math.max(13, fs * 0.28))}px "Chakra Petch", system-ui, sans-serif`;
      g.fillStyle = INK; g.fillText(window.matchMedia && matchMedia('(pointer: coarse)').matches ? 'TAP TO START' : 'PRESS ANY BUTTON', cx, iy + ih * 0.86);
    }
    if (leaving) { const k = Math.min(1, (now - leaving) / 300); g.fillStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; g.fillRect(ix, iy, iw, ih); }
    g.restore();
    // brand line on the bezel
    g.font = '700 12px "Chakra Petch", system-ui, sans-serif'; g.fillStyle = '#c9cbe0'; g.textAlign = 'left';
    g.fillText('CLOUDTOP', sx + 6, sy + sh + bezel + 2);
    g.fillStyle = '#ff4fd8'; g.fillText('POCKET', sx + 72, sy + sh + bezel + 2);
  }
  requestAnimationFrame(frame);

  function chime() {
    try {
      SFX.unlock();
      setTimeout(() => { SFX.tone(1047, 0.09, 'square', 0.07); setTimeout(() => SFX.tone(2093, 0.5, 'square', 0.06), 90); }, 30);
    } catch (e) { }
  }
  function go(e) {
    if (done) return;
    if (!wrap.isConnected) { done = true; window.removeEventListener('keydown', go, true); return; }
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const ms = Math.max(performance.now() - t0, skipTo);
    if (ms < POP) { skipTo = READY; return; } // first press skips the animation
    if (leaving) return;
    leaving = performance.now();
    chime();
    wrap.style.opacity = '0'; wrap.style.transform = 'scale(1.06)';
    if (typeof afterIntro === 'function') afterIntro();
    setTimeout(() => { done = true; wrap.remove(); window.removeEventListener('keydown', go, true); }, 460);
  }
  window.addEventListener('keydown', go, true);
  wrap.addEventListener('pointerdown', go);
})();
