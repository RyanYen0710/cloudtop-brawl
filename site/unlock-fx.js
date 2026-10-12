'use strict';
/* ===== CLOUDTOP BRAWL — "new fighter unlocked" =====
   Like Super Smash Bros: when you get a new fighter (Boss Fight chapter, Sky Road level, the shop, or a gift from an
   admin) a short story scene plays (about 5 seconds), then the fighter is revealed with "UNLOCKED!" and their name.
   - Each unlockable fighter has its own scene; any other locked fighter gets a spotlight scene.
   - It plays once per fighter per account (remembered in this browser). Signing in to an account that already has
     fighters doesn't play anything: only fighters that are new since this browser last saw the account.
   - It waits until you're out of a fight. Several new fighters play one after another.
   - Skip during the scene; "Try them now" opens Vs CPU with that fighter picked. */

const UNL = { q: [], on: null, raf: 0, seenKey: '' };

/* ---------- which fighters this browser has already celebrated, per account ---------- */
function unlSeenGet(uid) { try { const v = JSON.parse(loadLocal('cb.unlseen.' + uid) || 'null'); return Array.isArray(v) ? v : null; } catch (e) { return null; } }
function unlSeenSet(uid, list) { try { saveLocal('cb.unlseen.' + uid, JSON.stringify(list.slice(0, 200))); } catch (e) { } }
function unlCheck(list) {
  const uid = typeof ACCT !== 'undefined' && ACCT.user && ACCT.user.uid;
  if (!uid || !Array.isArray(list) || (typeof TESTER !== 'undefined' && TESTER.on)) return;
  const locked = list.filter(id => CHAR[id] && CHAR[id].locked && !CHAR[id].hidden);
  const seen = unlSeenGet(uid);
  if (!seen) { unlSeenSet(uid, locked); return; }   // first time on this browser: what they have now isn't "new"
  const fresh = locked.filter(id => seen.indexOf(id) < 0);
  if (!fresh.length) return;
  unlSeenSet(uid, seen.concat(fresh));
  fresh.forEach(id => { if (UNL.q.indexOf(id) < 0 && UNL.on !== id) UNL.q.push(id); });
  unlNext();
}
if (typeof setUnlocked === 'function') {
  const setUnlockedNoFx = setUnlocked;
  setUnlocked = function (list) { setUnlockedNoFx(list); try { unlCheck(list); } catch (e) { } };
}
/* play the next one, once you're out of a fight */
function unlNext() {
  if (UNL.on || !UNL.q.length) return;
  if (typeof G !== 'undefined' && (G.screen === 'fight' || G.screen === 'intro')) { clearTimeout(UNL.wait); UNL.wait = setTimeout(unlNext, 700); return; }
  clearTimeout(UNL.wait);
  UNL.wait = setTimeout(() => { if (!UNL.on && UNL.q.length && !(typeof G !== 'undefined' && G.screen === 'fight')) unlPlay(UNL.q.shift()); else unlNext(); }, 900);   // a moment to see the result screen first
}

/* ---------- the overlay ---------- */
const UNL_SCENE = 5.2, UNL_FLASH = 0.35;   // seconds
function unlPlay(id) {
  const c = CHAR[id]; if (!c) return unlNext();
  UNL.on = id;
  const box = el('div', { class: 'unl', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'New fighter unlocked: ' + c.name });
  const cv = el('canvas', { class: 'unl-cv', 'aria-hidden': 'true' });
  const skip = el('button', { type: 'button', class: 'unl-skip', text: 'Skip ›' });
  const card = el('div', { class: 'unl-card', hidden: '' }, [
    el('p', { class: 'unl-tag', text: 'NEW FIGHTER' }),
    el('h2', { class: 'unl-title', text: 'UNLOCKED!' }),
    el('p', { class: 'unl-name', text: c.name }),
    el('div', { class: 'unl-btns' }, [
      el('button', { type: 'button', class: 'btn start unl-try', text: 'Try them now' }),
      el('button', { type: 'button', class: 'btn unl-go', text: 'Continue' })])]);
  box.append(cv, skip, card); document.body.appendChild(box);
  const S = { id, c, box, cv, card, t0: performance.now(), skipAt: null, revealed: false, low: typeof PERF !== 'undefined' && PERF.low, conf: [] };
  UNL.S = S;
  const reveal = () => { if (S.revealed) return; S.skipAt = (performance.now() - S.t0) / 1000; };
  skip.addEventListener('click', reveal);
  const close = go => {
    if (UNL.on !== id) return;
    cancelAnimationFrame(UNL.raf); box.remove(); UNL.on = null; UNL.S = null;
    document.removeEventListener('keydown', key, true);
    if (go) { try { saveLocal('cb.char', id); } catch (e) { } const b = document.getElementById('go-solo'); if (b && typeof show === 'function') { show('main'); b.click(); } }
    unlNext();
  };
  card.querySelector('.unl-try').addEventListener('click', () => close(true));
  card.querySelector('.unl-go').addEventListener('click', () => close(false));
  box.addEventListener('click', e => { if (e.target === cv && S.revealed) close(false); else if (e.target === cv) reveal(); });
  function key(e) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (S.revealed) close(e.key !== 'Escape' && document.activeElement === card.querySelector('.unl-try')); else reveal(); }
  }
  document.addEventListener('keydown', key, true);
  if (typeof SFX !== 'undefined' && SFX.play) try { SFX.play('ult'); } catch (e) { }
  skip.focus();
  const frame = () => { unlDraw(S); UNL.raf = requestAnimationFrame(frame); };
  frame();
}

/* ---------- drawing ---------- */
const unlSeed = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const unlSeg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const unlOut = k => 1 - Math.pow(1 - k, 3);
function unlFighter(g, c, x, y, h, pose, face, sil, alpha) {
  if (typeof drawFighter !== 'function') return;
  const ph = typeof physFor === 'function' ? physFor(c) : null, H = (ph && ph.H) || 100, W = (ph && ph.W) || 50, s = h / H;
  const f = { c, W, H, x: 0, y: 0, face: face || 1, pose: pose || 'idle', pt: 1, inv: 0 };
  if (!sil) { g.save(); g.globalAlpha *= alpha == null ? 1 : alpha; g.translate(x, y); g.scale(s, s); try { drawFighter(g, f, performance.now() / 16, true); } catch (e) { } g.restore(); return; }
  // a black silhouette: draw on a small canvas, then fill it black
  const o = UNL.sil || (UNL.sil = document.createElement('canvas')), ow = Math.ceil(h * 1.6), oh = Math.ceil(h * 1.4);
  if (o.width !== ow || o.height !== oh) { o.width = ow; o.height = oh; }
  const q = o.getContext('2d'); q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, ow, oh);
  q.save(); q.translate(ow / 2, oh * 0.9); q.scale(s, s); try { drawFighter(q, f, performance.now() / 16, true); } catch (e) { } q.restore();
  q.globalCompositeOperation = 'source-in'; q.fillStyle = sil === true ? '#05040c' : sil; q.fillRect(0, 0, ow, oh); q.globalCompositeOperation = 'source-over';
  g.save(); g.globalAlpha *= alpha == null ? 1 : alpha; g.drawImage(o, x - ow / 2, y - oh * 0.9); g.restore();
}
function unlBolt(g, x0, y0, x1, y1, seed, w, col) {
  g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x0, y0);
  const n = 8; for (let i = 1; i < n; i++) { const k = i / n; g.lineTo(x0 + (x1 - x0) * k + (unlSeed(seed + i) - 0.5) * 60, y0 + (y1 - y0) * k); }
  g.lineTo(x1, y1); g.stroke();
}
function unlRays(g, x, y, r, t, col, n) {
  g.save(); g.translate(x, y); g.rotate(t * 0.25); g.fillStyle = col;
  for (let i = 0; i < n; i++) { g.rotate(Math.PI * 2 / n); g.beginPath(); g.moveTo(0, 0); g.lineTo(r, -r * 0.09); g.lineTo(r, r * 0.09); g.closePath(); g.fill(); }
  g.restore();
}

/* each scene draws the story for time k (0..UNL_SCENE seconds); vw, vh = screen size; S = scale */
const UNL_SCENES = {
  /* Master Chuang: night at the dojo, camera flashes in the dark, then he steps out with his camera */
  chuang(g, c, k, vw, vh, S, low) {
    const sky = g.createLinearGradient(0, 0, 0, vh); sky.addColorStop(0, '#05061a'); sky.addColorStop(1, '#1b1440');
    g.fillStyle = sky; g.fillRect(0, 0, vw, vh);
    g.fillStyle = '#fff'; for (let i = 0; i < (low ? 30 : 80); i++) { g.globalAlpha = 0.3 + 0.7 * unlSeed(i); g.fillRect(unlSeed(i + 1) * vw, unlSeed(i + 2) * vh * 0.6, 2, 2); } g.globalAlpha = 1;
    g.fillStyle = '#f4ecc8'; circle(g, vw * 0.8, vh * 0.2, 46 * S); g.fill();
    // the dojo
    const gy = vh * 0.78, dx = vw * 0.5 + (1 - unlOut(unlSeg(k, 0, 2))) * 60 * S;
    g.fillStyle = '#0a0816'; g.fillRect(0, gy, vw, vh - gy);
    g.beginPath(); g.moveTo(dx - 260 * S, gy - 150 * S); g.quadraticCurveTo(dx, gy - 230 * S, dx + 260 * S, gy - 150 * S); g.lineTo(dx + 210 * S, gy - 130 * S); g.lineTo(dx - 210 * S, gy - 130 * S); g.closePath(); g.fill();
    g.fillRect(dx - 190 * S, gy - 130 * S, 380 * S, 130 * S);
    for (let i = 0; i < 2; i++) { const lx = dx + (i ? 150 : -150) * S, sw = Math.sin(k * 2 + i) * 4 * S; g.fillStyle = '#ff5a3a'; g.globalAlpha = 0.85; circle(g, lx + sw, gy - 100 * S, 12 * S); g.fill(); g.globalAlpha = 0.25; circle(g, lx + sw, gy - 100 * S, 30 * S); g.fill(); g.globalAlpha = 1; }
    // camera flashes: one, then two, then a big one
    const flashes = [1.4, 2.3, 2.6, 3.5];
    let fl = 0; flashes.forEach(f0 => { const d = k - f0; if (d >= 0 && d < 0.35) fl = Math.max(fl, 1 - d / 0.35); });
    const step = unlOut(unlSeg(k, 3.5, 4.6)), fx = dx, fy = gy + 6 * S, fh = 230 * S;
    if (k > 1.4) unlFighter(g, c, fx, fy - step * 10 * S, fh * (0.85 + 0.15 * step), 'idle', 1, k < 3.5 ? true : false, 1);
    if (k > 3.5 && step < 1) unlFighter(g, c, fx, fy - step * 10 * S, fh * (0.85 + 0.15 * step), 'idle', 1, true, 1 - step);
    if (fl > 0) { g.fillStyle = `rgba(255,255,255,${fl * 0.9})`; g.fillRect(0, 0, vw, vh); }
    if (k > 3.6) { g.font = `${Math.round(22 * S)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = `rgba(255,211,92,${unlSeg(k, 3.6, 4.2)})`; g.fillText('“Say cheese.”', vw / 2, vh * 0.16); }
  },
  /* Mythic Hsi: storm over a mountain peak, runes light up, he comes down in a beam of light */
  hsi(g, c, k, vw, vh, S, low) {
    const sky = g.createLinearGradient(0, 0, 0, vh); sky.addColorStop(0, '#0d0624'); sky.addColorStop(1, '#3a1a5a');
    g.fillStyle = sky; g.fillRect(0, 0, vw, vh);
    // swirling clouds
    g.save(); g.translate(vw / 2, vh * 0.25);
    for (let i = 0; i < (low ? 10 : 22); i++) { const a = i / 22 * Math.PI * 2 + k * (0.3 + unlSeed(i) * 0.4), r = (80 + unlSeed(i + 3) * 260) * S;
      g.fillStyle = `rgba(${120 + unlSeed(i) * 60 | 0},${90 + unlSeed(i + 1) * 40 | 0},180,0.28)`; g.beginPath(); g.ellipse(Math.cos(a) * r, Math.sin(a) * r * 0.35, 90 * S, 30 * S, a, 0, Math.PI * 2); g.fill(); }
    g.restore();
    // lightning in the clouds
    if ((k > 0.8 && k < 0.95) || (k > 1.9 && k < 2.02)) { g.globalAlpha = 0.9; unlBolt(g, vw * (k < 1.5 ? 0.3 : 0.7), 0, vw * 0.5, vh * 0.45, k < 1.5 ? 3 : 9, 4 * S, '#e8d9ff'); g.globalAlpha = 1; }
    // the mountain
    const gy = vh * 0.8;
    g.fillStyle = '#140a24'; g.beginPath(); g.moveTo(0, vh); g.lineTo(0, gy + 40 * S); g.lineTo(vw * 0.35, gy - 40 * S); g.lineTo(vw * 0.5, gy - 70 * S); g.lineTo(vw * 0.65, gy - 40 * S); g.lineTo(vw, gy + 40 * S); g.lineTo(vw, vh); g.fill();
    // a ring of glowing runes on the peak
    const rk = unlSeg(k, 1.2, 2.8), px = vw / 2, py = gy - 70 * S;
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(200,168,255,${rk})`; g.lineWidth = 3 * S;
    g.beginPath(); g.ellipse(px, py, 150 * S * rk, 34 * S * rk, 0, 0, Math.PI * 2); g.stroke();
    g.font = `${Math.round(18 * S)}px serif`; g.textAlign = 'center'; g.fillStyle = `rgba(232,217,255,${rk})`;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + k; g.fillText('ᚠᚢᚦᚨᚱᚲᚷᚹ'[i], px + Math.cos(a) * 150 * S * rk, py + Math.sin(a) * 34 * S * rk + 6 * S); }
    // the beam of light he comes down in
    const beam = unlSeg(k, 2.6, 3.2) * (1 - unlSeg(k, 4.6, 5.2));
    if (beam > 0) { const gr = g.createLinearGradient(px - 60 * S, 0, px + 60 * S, 0); gr.addColorStop(0, 'rgba(200,168,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${beam})`); gr.addColorStop(1, 'rgba(200,168,255,0)'); g.fillStyle = gr; g.fillRect(px - 60 * S, 0, 120 * S, py); }
    g.restore();
    const down = unlOut(unlSeg(k, 3.0, 4.3)), fy = -40 * S + (py + 4 * S + 40 * S) * down;
    if (k > 3.0) unlFighter(g, c, px, fy, 220 * S, 'idle', 1, k < 4.3 ? '#2a1450' : false, 1);
    if (k > 4.3 && k < 4.5) { g.fillStyle = `rgba(255,255,255,${1 - (k - 4.3) / 0.2})`; g.fillRect(0, 0, vw, vh); }
  },
  /* Legend Yen: the sky cracks open, golden lightning, a crown of fire, then he lands with a shockwave */
  yen(g, c, k, vw, vh, S, low) {
    const red = unlSeg(k, 0.5, 2.5);
    const sky = g.createLinearGradient(0, 0, 0, vh); sky.addColorStop(0, `rgb(${10 + red * 60 | 0},4,${16 - red * 10 | 0})`); sky.addColorStop(1, `rgb(${40 + red * 90 | 0},${10 + red * 20 | 0},6)`);
    const shake = (k > 1 && k < 1.3) || (k > 4.2 && k < 4.7) ? (Math.random() - 0.5) * 16 * S : 0;
    g.save(); g.translate(shake, shake * 0.6);
    g.fillStyle = sky; g.fillRect(-20, -20, vw + 40, vh + 40);
    // the sky cracks
    const ck = unlSeg(k, 1.0, 1.6);
    if (ck > 0) { g.strokeStyle = `rgba(255,211,92,${ck})`; g.lineWidth = 3 * S;
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + unlSeed(i), L = (120 + unlSeed(i + 4) * 260) * S * ck; g.beginPath(); g.moveTo(vw / 2, vh * 0.22); let x = vw / 2, y = vh * 0.22;
        for (let j = 1; j <= 4; j++) { x += Math.cos(a + (unlSeed(i * 7 + j) - 0.5)) * L / 4; y += Math.sin(a + (unlSeed(i * 5 + j) - 0.5)) * L / 4; g.lineTo(x, y); } g.stroke(); }
      g.fillStyle = `rgba(255,240,180,${ck * 0.8})`; circle(g, vw / 2, vh * 0.22, 30 * S * ck); g.fill(); }
    // golden lightning
    const gy = vh * 0.82;
    g.fillStyle = '#120806'; g.fillRect(-20, gy, vw + 40, vh - gy + 20);
    [1.7, 2.1, 2.4, 2.9, 3.3].forEach((t0, i) => { const d = k - t0; if (d > 0 && d < 0.18) { g.globalCompositeOperation = 'lighter'; unlBolt(g, vw / 2 + (unlSeed(i) - 0.5) * vw * 0.8, 0, vw / 2 + (unlSeed(i + 9) - 0.5) * 200 * S, gy, i * 11, 5 * S, '#ffd35c'); g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(255,230,150,.25)'; g.fillRect(-20, -20, vw + 40, vh + 40); } });
    // the crown of fire
    const fk = unlSeg(k, 2.8, 3.6), cx = vw / 2, cy = vh * 0.3;
    if (fk > 0) { g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < (low ? 8 : 14); i++) { const a = -Math.PI / 2 + (i / 13 - 0.5) * 2.4, r = 110 * S, hgt = (40 + Math.sin(k * 12 + i) * 12) * S * fk;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.5; const gr = g.createLinearGradient(x, y, x, y - hgt); gr.addColorStop(0, 'rgba(255,90,20,.9)'); gr.addColorStop(1, 'rgba(255,211,92,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - 12 * S, y); g.quadraticCurveTo(x, y - hgt * 1.3, x + 12 * S, y); g.fill(); }
      g.restore(); }
    // he drops from the crown and lands
    const fall = unlSeg(k, 3.7, 4.2), fy = cy + (gy - cy) * fall * fall;
    if (k > 3.7) unlFighter(g, c, cx, fy, 240 * S, fall < 1 ? 'up' : 'power', 1, k < 4.5 ? '#2a0e04' : false, 1);
    const sw = unlSeg(k, 4.2, 4.9);
    if (sw > 0 && sw < 1) { g.strokeStyle = `rgba(255,211,92,${1 - sw})`; g.lineWidth = 10 * S * (1 - sw); g.beginPath(); g.ellipse(cx, gy, 40 * S + sw * vw * 0.6, 12 * S + sw * 40 * S, 0, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 12; i++) { const a = Math.PI + i / 11 * Math.PI, r = sw * 260 * S; g.fillStyle = `rgba(200,150,90,${0.6 * (1 - sw)})`; circle(g, cx + Math.cos(a) * r, gy + Math.sin(a) * r * 0.4, 14 * S); g.fill(); } }
    if (k > 4.2 && k < 4.4) { g.fillStyle = `rgba(255,240,200,${1 - (k - 4.2) / 0.2})`; g.fillRect(-20, -20, vw + 40, vh + 40); }
    g.restore();
  },
  /* Professor Sprocket: a lab full of spinning gears, sparks, a big BANG, and he springs out of the smoke */
  sprocket(g, c, k, vw, vh, S, low) {
    g.fillStyle = '#1a1206'; g.fillRect(0, 0, vw, vh);
    g.strokeStyle = 'rgba(201,147,42,.18)'; g.lineWidth = 2; for (let x = 0; x < vw; x += 60 * S) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, vh); g.stroke(); }
    const gear = (x, y, r, sp, col) => { g.save(); g.translate(x, y); g.rotate(k * sp); g.fillStyle = col; g.beginPath();
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, rr = i % 2 ? r : r * 1.18; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill();
      g.fillStyle = '#1a1206'; circle(g, 0, 0, r * 0.35); g.fill(); g.restore(); };
    const speed = 1 + unlSeg(k, 0, 2.6) * 5;
    gear(vw * 0.18, vh * 0.3, 70 * S, speed, '#8a6420'); gear(vw * 0.3, vh * 0.48, 44 * S, -speed * 1.6, '#c9932a');
    gear(vw * 0.82, vh * 0.28, 80 * S, -speed * 0.9, '#8a6420'); gear(vw * 0.7, vh * 0.5, 40 * S, speed * 1.8, '#c9932a');
    const gy = vh * 0.82; g.fillStyle = '#0c0803'; g.fillRect(0, gy, vw, vh - gy);
    // the machine in the middle shakes, then blows up
    const bang = 2.6, mx = vw / 2;
    if (k < bang) { const sh = unlSeg(k, 1.2, bang) * 6 * S * Math.sin(k * 60); g.fillStyle = '#5a4636'; g.fillRect(mx - 70 * S + sh, gy - 150 * S, 140 * S, 150 * S);
      g.fillStyle = k % 0.3 < 0.15 ? '#ff5a4d' : '#7ad7ff'; circle(g, mx + sh, gy - 110 * S, 16 * S); g.fill();
      if (!low && k > 1.2) for (let i = 0; i < 4; i++) { const a = unlSeed(Math.floor(k * 20) + i) * 6.28; g.fillStyle = '#ffd35c'; circle(g, mx + Math.cos(a) * 80 * S, gy - 80 * S + Math.sin(a) * 60 * S, 3 * S); g.fill(); } }
    const bk = unlSeg(k, bang, bang + 1.4);
    if (k >= bang) {
      for (let i = 0; i < (low ? 10 : 22); i++) { const a = unlSeed(i) * Math.PI * 2, r = (40 + unlSeed(i + 5) * 220) * S * unlOut(bk);
        g.fillStyle = `rgba(${120 + unlSeed(i) * 80 | 0},${110 + unlSeed(i) * 60 | 0},100,${0.8 * (1 - bk * 0.6)})`; circle(g, mx + Math.cos(a) * r, gy - 80 * S + Math.sin(a) * r * 0.6, (30 + unlSeed(i + 2) * 40) * S); g.fill(); }
      if (k < bang + 0.2) { g.fillStyle = `rgba(255,240,200,${1 - (k - bang) / 0.2})`; g.fillRect(0, 0, vw, vh); }
      // gears flying out
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (unlSeed(i + 30) - 0.5) * 2.6, d = bk * (200 + unlSeed(i) * 200) * S; gear(mx + Math.cos(a) * d, gy - 100 * S + Math.sin(a) * d + bk * bk * 300 * S, 14 * S, 6, '#c9932a'); }
    }
    // he springs out of the smoke
    const jk = unlSeg(k, 3.4, 4.6), hop = Math.abs(Math.sin(jk * Math.PI * 2)) * (1 - jk) * 140 * S;
    if (k > 3.4) unlFighter(g, c, mx, gy - hop, 220 * S, jk < 1 ? 'up' : 'idle', 1, k < 4.4 ? '#2a1d0a' : false, 1);
  },
  /* any other locked fighter: a spotlight comes on */
  any(g, c, k, vw, vh, S) {
    g.fillStyle = '#07060f'; g.fillRect(0, 0, vw, vh);
    const gy = vh * 0.82, on = unlSeg(k, 1.2, 1.5);
    if (on > 0) { const gr = g.createRadialGradient(vw / 2, gy - 120 * S, 10, vw / 2, gy - 120 * S, 300 * S); gr.addColorStop(0, `rgba(255,244,200,${0.5 * on})`); gr.addColorStop(1, 'rgba(255,244,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, vw, vh); }
    unlFighter(g, c, vw / 2, gy, 230 * S, 'idle', 1, k < 3.8 ? true : false, on);
    g.font = `${Math.round(26 * S)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = `rgba(255,107,46,${unlSeg(k, 0.2, 0.8) * (1 - unlSeg(k, 3, 3.6))})`;
    g.fillText('A NEW CHALLENGER…', vw / 2, vh * 0.2);
  }
};

function unlDraw(S) {
  const cv = S.cv, dpr = Math.min(2, window.devicePixelRatio || 1), vw = cv.clientWidth || window.innerWidth, vh = cv.clientHeight || window.innerHeight;
  if (cv.width !== Math.round(vw * dpr) || cv.height !== Math.round(vh * dpr)) { cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sc = Math.max(0.55, Math.min(1.4, Math.min(vw / 900, vh / 560)));
  let k = (performance.now() - S.t0) / 1000;
  const end = S.skipAt != null ? Math.min(S.skipAt, UNL_SCENE) : UNL_SCENE;
  const scene = UNL_SCENES[S.id] || UNL_SCENES.any;
  if (k < end) { try { scene(g, S.c, k, vw, vh, sc, S.low); } catch (e) { g.fillStyle = '#07060f'; g.fillRect(0, 0, vw, vh); } return; }
  // ---- the reveal ----
  const r = k - end;
  if (!S.revealed) {
    S.revealed = true; S.card.hidden = false; S.box.classList.add('on');
    const skip = S.box.querySelector('.unl-skip'); if (skip) skip.remove();
    if (typeof playFanfare === 'function') try { playFanfare(); } catch (e) { }
    for (let i = 0; i < (S.low ? 40 : 110); i++) S.conf.push({ x: vw / 2 + (Math.random() - 0.5) * 80, y: vh * 0.4, vx: (Math.random() - 0.5) * 16, vy: -6 - Math.random() * 10, r: Math.random() * 6, c: ['#ffd35c', '#ff6b2e', '#46e0ff', '#ff4fd8', '#6fe39a', '#ffffff'][i % 6], s: 4 + Math.random() * 5 });
    setTimeout(() => { const b = S.card.querySelector('.unl-try'); if (b && UNL.on === S.id) b.focus(); }, 50);
  }
  const bg = g.createRadialGradient(vw / 2, vh * 0.42, 10, vw / 2, vh * 0.42, Math.max(vw, vh) * 0.7);
  bg.addColorStop(0, '#3a1f6a'); bg.addColorStop(1, '#07060f'); g.fillStyle = bg; g.fillRect(0, 0, vw, vh);
  unlRays(g, vw / 2, vh * 0.42, Math.max(vw, vh), r, 'rgba(255,211,92,.10)', 18);
  const short = vh < 500, pop = unlOut(unlSeg(r, 0, 0.5)), fh = Math.min(vh * (short ? 0.34 : 0.42), 300 * sc), cy = vh * (short ? 0.3 : 0.42);   // short (phone) screens: higher, so the text fits
  unlFighter(g, S.c, vw / 2, cy + fh * 0.45, fh * (0.8 + 0.2 * pop), r < 0.6 ? 'power' : 'idle', 1, false, pop);
  // confetti
  S.conf.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.vx *= 0.99; p.r += 0.15;
    if (p.y < vh + 20) { g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); } });
  if (r < UNL_FLASH) { g.fillStyle = `rgba(255,255,255,${1 - r / UNL_FLASH})`; g.fillRect(0, 0, vw, vh); }
}
