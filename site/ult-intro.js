'use strict';
/* ===== CLOUDTOP BRAWL — ultimate opening scenes =====
   When an ultimate starts, each fighter gets their own short animation (about 1.5 s) instead of a
   plain title card: Zephyr dashes around slashing the screen, Mr. Chiu's giant shark bursts out of
   the water, Rowan fires an arrow at the camera, and so on. It ends with a small name tag.
   Drawing only (screen space). Plain shapes and a few particles, fewer on slow devices. */

const UI_LOW = () => typeof PERF !== 'undefined' && PERF.low;
const uiSeed = n => { const s = Math.sin(n * 91.345 + 7.1) * 43758.5453; return s - Math.floor(s); };
const uiClamp = (v, a, b) => v < a ? a : v > b ? b : v;
const uiSeg = (k, a, b) => uiClamp((k - a) / (b - a), 0, 1);          // 0→1 between frames a and b
const uiOut = p => 1 - (1 - p) * (1 - p);
const uiIn = p => p * p;

/* draw the fighter at screen position (x = centre, y = feet), h pixels tall */
function uiFig(g, f, x, y, h, pose, face, alpha) {
  if (typeof drawFighter !== 'function') return;
  const s = h / f.H;
  g.save(); g.globalAlpha *= alpha == null ? 1 : alpha; g.translate(x, y); g.scale(s, s);
  try { drawFighter(g, { c: f.c, W: f.W, H: f.H, x: 0, y: 0, face: face || 1, pose: pose || 'power', pt: 1, inv: 0 }, performance.now() / 16, true); } catch (e) { }
  g.restore();
}
function uiBurst(g, x, y, r, n, col, lw) {
  g.strokeStyle = col; g.lineWidth = lw || 3;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + uiSeed(i) * 0.3, r0 = r * (0.3 + uiSeed(i + 5) * 0.2); g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); }
}
/* screen-crack lines from a point */
function uiCrack(g, x, y, r, seed, a) {
  g.save(); g.globalAlpha *= a; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    let px = x, py = y; const an = i / 7 * Math.PI * 2 + uiSeed(seed + i);
    g.beginPath(); g.moveTo(px, py);
    for (let j = 1; j <= 4; j++) { px = x + Math.cos(an + (uiSeed(seed + i * 9 + j) - 0.5) * 0.5) * r * j / 4; py = y + Math.sin(an + (uiSeed(seed + i * 7 + j) - 0.5) * 0.5) * r * j / 4; g.lineTo(px, py); }
    g.stroke();
  }
  g.restore();
}

/* one function per ultimate style. o = { g, f, def, col, k, vw, vh, cx, cy, S, low, t } */
const UI_SCENES = {
  slash(o) {   // Zephyr: the ninja zips around the screen, each dash leaves a cut, then the cuts flash
    const { g, f, k, vw, vh, S } = o;
    const pts = [[0.12, 0.7], [0.82, 0.3], [0.2, 0.25], [0.88, 0.72], [0.5, 0.5]];
    const step = 9, n = Math.min(pts.length - 1, Math.floor(k / step));
    for (let i = 0; i < n; i++) {   // finished cuts
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], fl = k > 50 ? 1 : 0.75;
      g.strokeStyle = `rgba(230,236,255,${fl})`; g.lineWidth = (k > 50 ? 9 : 4) * S;
      g.beginPath(); g.moveTo(ax * vw, ay * vh); g.lineTo(bx * vw, by * vh); g.stroke();
    }
    if (k < step * (pts.length - 1)) {   // the dash happening now, with after-images
      const i = n, p = (k % step) / step, [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      for (let j = 3; j >= 0; j--) { const q = Math.max(0, p - j * 0.12); uiFig(g, f, (ax + (bx - ax) * q) * vw, (ay + (by - ay) * q) * vh + 60 * S, 120 * S, 'dash', bx > ax ? 1 : -1, j ? 0.25 : 1); }
      g.strokeStyle = 'rgba(52,209,191,.8)'; g.lineWidth = 3 * S; g.beginPath(); g.moveTo(ax * vw, ay * vh); g.lineTo((ax + (bx - ax) * p) * vw, (ay + (by - ay) * p) * vh); g.stroke();
    } else uiFig(g, f, vw * 0.5, vh * 0.5 + 70 * S, 150 * S, 'power', 1);
    if (k > 50 && k < 56) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, 0, vw, vh); }
  },
  stomp(o) {   // Titan: a giant shadow, then the foot slams down and the screen shakes and cracks
    const { g, f, k, vw, vh, S, cx } = o, hit = 30, gy = vh * 0.82;
    if (k < hit) { const p = k / hit; g.fillStyle = `rgba(0,0,0,${0.2 + p * 0.4})`; g.beginPath(); g.ellipse(cx, gy, 60 * S + p * 200 * S, 14 * S + p * 30 * S, 0, 0, Math.PI * 2); g.fill(); }
    const fy = k < hit ? -200 * S + uiIn(k / hit) * (gy + 200 * S) : gy, w = 230 * S;
    if (k < hit + 18) {
      g.save(); g.translate(cx, fy - w * 0.25);
      g.fillStyle = '#4a3a2a'; g.strokeStyle = '#1b130b'; g.lineWidth = 6 * S;
      g.fillRect(-w * 0.32, -vh, w * 0.64, vh);
      g.beginPath(); g.ellipse(0, 0, w, w * 0.42, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#6dbb4a'; for (let j = -2; j <= 2; j++) { g.beginPath(); g.ellipse(j * w * 0.36, w * 0.3, w * 0.16, w * 0.12, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
      g.restore();
    }
    if (k >= hit) {
      const p = uiSeg(k, hit, hit + 30);
      uiCrack(g, cx, gy, 380 * S, 3, 1 - p * 0.5);
      g.fillStyle = 'rgba(150,120,80,.6)';
      for (let i = 0; i < (o.low ? 8 : 18); i++) { const a = Math.PI + uiSeed(i) * Math.PI, d = p * (120 + uiSeed(i + 3) * 260) * S; g.beginPath(); g.arc(cx + Math.cos(a) * d, gy + Math.sin(a) * d * 0.5, (10 - p * 7) * S, 0, Math.PI * 2); g.fill(); }
      if (k > hit + 12) uiFig(g, f, cx, gy, 200 * S * uiOut(uiSeg(k, hit + 12, hit + 24)), 'power', 1);
    }
  },
  dragon(o) {   // Mr. Tseng: a golden dragon snakes across the screen, then coils around him
    const { g, f, k, vw, vh, S, cx, cy } = o, n = o.low ? 14 : 26;
    if (typeof drawChineseFrame === 'function') drawChineseFrame(g, vw, vh);
    uiFig(g, f, cx, cy + 90 * S, 170 * S, 'cast', 1, uiSeg(k, 20, 34));
    for (let j = n - 1; j >= 0; j--) {
      let x, y; const d = k - j * 1.3;
      if (d < 40) { x = -100 * S + d / 40 * (vw + 200 * S); y = cy - 120 * S + Math.sin(d * 0.25) * 80 * S; }
      else { const a = (d - 40) * 0.22 + j * 0.55, r = 150 * S; x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r * 0.55; }
      g.fillStyle = j === 0 ? '#ff3b30' : j % 2 ? '#d4a017' : '#f5c84a'; g.strokeStyle = '#5a0a0a'; g.lineWidth = 2 * S;
      g.beginPath(); g.arc(x, y, (j === 0 ? 24 : 17 - j * 0.35) * S, 0, Math.PI * 2); g.fill(); g.stroke();
      if (j === 0) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 8 * S, y - 6 * S, 4 * S, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#d4a017'; g.lineWidth = 3 * S; g.beginPath(); g.moveTo(x, y - 18 * S); g.lineTo(x - 22 * S, y - 40 * S); g.stroke(); }
    }
  },
  beams(o) {   // Rivet: lock-on squares close in, then a satellite laser slams down
    const { g, f, k, vw, vh, S, cx, cy } = o;
    uiFig(g, f, cx, vh * 0.86, 150 * S, 'cast', 1);
    const lock = uiSeg(k, 0, 30), sz = (220 - lock * 150) * S;
    g.strokeStyle = k < 30 ? '#ff8a1f' : '#ff3b3b'; g.lineWidth = 4 * S;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(cx + sx * sz, cy + sy * (sz - 30 * S)); g.lineTo(cx + sx * sz, cy + sy * sz); g.lineTo(cx + sx * (sz - 30 * S), cy + sy * sz); g.stroke(); }
    if (k < 30 && (k >> 2) % 2) { g.font = `700 ${16 * S | 0}px "Chakra Petch", system-ui`; g.fillStyle = '#ff8a1f'; g.textAlign = 'center'; g.fillText('TARGET LOCKING', cx, cy - sz - 14 * S); }
    g.fillStyle = '#9aa3ad'; g.fillRect(cx - 40 * S, 10 * S, 80 * S, 26 * S); g.fillStyle = '#3a6fd8'; g.fillRect(cx - 110 * S, 16 * S, 60 * S, 14 * S); g.fillRect(cx + 50 * S, 16 * S, 60 * S, 14 * S);
    if (k >= 32) {
      const p = uiSeg(k, 32, 60), w = (90 - p * 50) * S;
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= 1 - p * 0.6;
      g.fillStyle = 'rgba(255,90,40,.7)'; g.fillRect(cx - w, 36 * S, w * 2, vh); g.fillStyle = '#fff'; g.fillRect(cx - w / 3, 36 * S, w * 2 / 3, vh);
      g.restore();
      if (k < 35) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(0, 0, vw, vh); }
    }
  },
  pillars(o) {   // Dame Aurelia: pillars of light rise one after another, she rises in a halo
    const { g, f, k, vw, vh, S, cx } = o, n = 7;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const p = uiSeg(k, i * 5, i * 5 + 16), x = (i + 0.5) / n * vw, w = 34 * S * (1 - uiSeg(k, 55, 80) * 0.5);
      if (p <= 0) continue;
      g.fillStyle = 'rgba(255,225,140,.35)'; g.fillRect(x - w, vh * (1 - p), w * 2, vh * p);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x - w / 3, vh * (1 - p), w * 2 / 3, vh * p);
    }
    const hp = uiSeg(k, 30, 55); g.strokeStyle = `rgba(255,211,92,${hp})`; g.lineWidth = 8 * S; g.beginPath(); g.arc(cx, vh * 0.42, 110 * S, 0, Math.PI * 2); g.stroke();
    g.restore();
    uiFig(g, f, cx, vh * 0.86 - uiOut(uiSeg(k, 25, 55)) * 60 * S, 190 * S, 'power', 1, uiSeg(k, 20, 34));
  },
  shatter(o) {   // Mira: frost creeps in from the edges, the screen freezes, then shatters
    const { g, f, k, vw, vh, S, cx, cy } = o, p = uiSeg(k, 0, 40);
    uiFig(g, f, cx, cy + 100 * S, 190 * S, 'cast', 1);
    const fg = g.createRadialGradient(cx, cy, Math.max(vw, vh) * (0.9 - p * 0.6), cx, cy, Math.max(vw, vh) * 0.9);
    fg.addColorStop(0, 'rgba(180,235,255,0)'); fg.addColorStop(1, 'rgba(200,240,255,.85)'); g.fillStyle = fg; g.fillRect(0, 0, vw, vh);
    g.strokeStyle = 'rgba(240,252,255,.9)'; g.lineWidth = 2 * S;
    for (let i = 0; i < (o.low ? 8 : 16); i++) {   // ice crystals growing from the edges
      const side = i % 4, u0 = uiSeed(i), len = p * (60 + uiSeed(i + 2) * 120) * S;
      const x = side === 0 ? u0 * vw : side === 1 ? vw : side === 2 ? u0 * vw : 0, y = side === 0 ? 0 : side === 1 ? u0 * vh : side === 2 ? vh : u0 * vh;
      const a = Math.atan2(cy - y, cx - x);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
      for (const b of [-0.6, 0.6]) { g.beginPath(); g.moveTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5); g.lineTo(x + Math.cos(a) * len * 0.5 + Math.cos(a + b) * len * 0.35, y + Math.sin(a) * len * 0.5 + Math.sin(a + b) * len * 0.35); g.stroke(); }
    }
    if (k >= 40 && k < 52) { g.fillStyle = 'rgba(200,240,255,.55)'; g.fillRect(0, 0, vw, vh); uiCrack(g, cx, cy, Math.max(vw, vh) * 0.6, 11, 1); }
    if (k >= 52) {   // shards fly outward
      const q = uiSeg(k, 52, 80);
      for (let i = 0; i < (o.low ? 10 : 22); i++) {
        const a = uiSeed(i) * Math.PI * 2, d = q * (200 + uiSeed(i + 1) * 500) * S, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, r = (14 + uiSeed(i + 4) * 20) * S;
        g.save(); g.translate(x, y); g.rotate(q * 6 + i); g.globalAlpha *= 1 - q;
        g.fillStyle = 'rgba(200,240,255,.8)'; g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.6, r * 0.4); g.lineTo(-r * 0.5, r * 0.6); g.closePath(); g.fill(); g.restore();
      }
    }
  },
  phoenix(o) {   // Blaze: a burning phoenix swoops across, leaving a trail of fire
    const { g, f, k, vw, vh, S, cx } = o, p = uiSeg(k, 4, 50);
    uiFig(g, f, cx, vh * 0.88, 170 * S, 'power', 1, uiSeg(k, 30, 44));
    const path = q => [-150 * S + q * (vw + 300 * S), vh * 0.85 - Math.sin(q * Math.PI) * vh * 0.65];
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let j = 0; j < (o.low ? 12 : 26); j++) { const q = p - j * 0.012; if (q < 0) continue; const [x, y] = path(q); g.fillStyle = j % 3 ? 'rgba(255,120,30,.55)' : 'rgba(255,220,120,.7)'; g.beginPath(); g.arc(x, y + Math.sin(j) * 10 * S, (30 - j) * S, 0, Math.PI * 2); g.fill(); }
    g.restore();
    if (p < 1) {
      const [x, y] = path(p), [x2, y2] = path(Math.min(1, p + 0.01)), a = Math.atan2(y2 - y, x2 - x), flap = Math.sin(k * 0.6) * 0.5;
      g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#ff6a1a';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-30 * S, s * (70 + flap * 40) * S, -90 * S, s * (50 + flap * 30) * S); g.lineTo(-20 * S, 0); g.fill(); }
      g.fillStyle = '#ffd35c'; g.beginPath(); g.ellipse(0, 0, 34 * S, 14 * S, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(30 * S, 0); g.lineTo(46 * S, -6 * S); g.lineTo(30 * S, 6 * S); g.fill();
      g.restore();
    }
    const fl = g.createLinearGradient(0, vh, 0, vh * 0.6); fl.addColorStop(0, 'rgba(255,90,20,.6)'); fl.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = fl; g.globalAlpha *= uiSeg(k, 25, 45); g.fillRect(0, vh * 0.6, vw, vh * 0.4);
  },
  storm(o) {   // Volt: storm clouds, three lightning strikes, he's lit up by the last one
    const { g, f, k, vw, vh, S, cx } = o, strikes = [12, 24, 38];
    g.fillStyle = 'rgba(15,18,40,.7)';
    for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse((i + 0.5) / 7 * vw + Math.sin(k * 0.05 + i) * 20, 40 * S + (i % 2) * 20 * S, 120 * S, 45 * S, 0, 0, Math.PI * 2); g.fill(); }
    uiFig(g, f, cx, vh * 0.86, 190 * S, 'power', 1, k >= strikes[2] ? 1 : 0.15);
    strikes.forEach((s0, i) => {
      if (k < s0 || k > s0 + 8) return;
      const x = i === 2 ? cx : (i ? 0.78 : 0.22) * vw, a = 1 - (k - s0) / 8;
      g.save(); g.globalAlpha *= a; g.globalCompositeOperation = 'lighter';
      if (typeof ufxBolt === 'function') { ufxBolt(g, x, 0, vh * 0.86, i * 13, 18 * S, 'rgba(255,225,74,.4)'); ufxBolt(g, x, 0, vh * 0.86, i * 13, 5 * S, '#ffffff'); }
      g.fillStyle = `rgba(255,250,200,${0.35 * a})`; g.fillRect(0, 0, vw, vh); g.restore();
    });
    if (k > strikes[2]) { g.save(); g.globalCompositeOperation = 'lighter'; uiBurst(g, cx, vh * 0.86 - 95 * S, 160 * S, 12, 'rgba(122,215,255,.6)', 3 * S); g.restore(); }
  },
  vortex(o) {   // Nyx: a black hole opens, everything spirals in, she steps out of it
    const { g, f, k, vw, vh, S, cx, cy } = o, R = uiOut(uiSeg(k, 0, 30)) * 90 * S;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < (o.low ? 40 : 90); i++) { const a = i * 0.7 + k * 0.08, rr = ((uiSeed(i) * 600 - k * 9) % 600 + 600) % 600 * S; g.fillStyle = `rgba(${170 + (i % 3) * 30},110,255,${Math.min(1, rr / 200 / S)})`; g.beginPath(); g.arc(cx + Math.cos(a + rr * 0.01) * rr, cy + Math.sin(a + rr * 0.01) * rr * 0.6, 2.5 * S, 0, Math.PI * 2); g.fill(); }
    g.restore();
    g.strokeStyle = 'rgba(163,92,255,.8)'; g.lineWidth = 6 * S;
    for (let j = 0; j < 4; j++) { g.beginPath(); for (let s = 0; s <= 24; s++) { const q = s / 24, a = j / 4 * Math.PI * 2 + k * 0.12 + q * 3.5, r = R * 2.8 * (1 - q) + R; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6); } g.stroke(); }
    g.fillStyle = '#05020d'; g.strokeStyle = '#e8d9ff'; g.lineWidth = 3 * S; g.beginPath(); g.ellipse(cx, cy, R, R * 0.8, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    if (k > 30) uiFig(g, f, cx, cy + 90 * S, 180 * S * uiOut(uiSeg(k, 30, 50)), 'power', 1);
  },
  arrows(o) {   // Rowan: draws his bow, the arrow flies straight at the camera and sticks in the screen
    const { g, f, k, vw, vh, S, cx, cy } = o, fire = 26;
    const ax = vw * 0.22, ay = vh * 0.62;
    uiFig(g, f, ax, vh * 0.88, 210 * S, k < fire ? 'charge' : 'cast', 1);
    if (k < fire) { const pull = uiSeg(k, 4, fire) * 40 * S; g.strokeStyle = '#3a2a14'; g.lineWidth = 3 * S; g.beginPath(); g.moveTo(ax + 60 * S - pull, ay - 30 * S); g.lineTo(ax + 120 * S, ay - 30 * S); g.stroke(); return; }
    const p = uiSeg(k, fire, fire + 18), x = ax + 120 * S + (cx - ax - 120 * S) * p, y = ay - 30 * S + (cy - ay + 30 * S) * p, sc = 1 + uiIn(p) * 7;
    if (p < 1) {
      g.save(); g.translate(x, y); g.scale(sc, sc); g.rotate(-0.2 * (1 - p));
      g.strokeStyle = '#3a2a14'; g.lineWidth = 3 * S; g.beginPath(); g.moveTo(-50 * S, 0); g.lineTo(10 * S, 0); g.stroke();
      g.fillStyle = '#f2e3b3'; g.beginPath(); g.moveTo(18 * S, 0); g.lineTo(6 * S, -6 * S); g.lineTo(6 * S, 6 * S); g.fill();
      g.fillStyle = '#9bc45a'; g.beginPath(); g.moveTo(-50 * S, 0); g.lineTo(-60 * S, -7 * S); g.lineTo(-40 * S, 0); g.lineTo(-60 * S, 7 * S); g.fill();
      g.restore();
    } else {   // stuck in the screen, still wobbling
      const wob = Math.sin(k * 1.4) * Math.max(0, 1 - (k - fire - 18) / 20) * 0.15;
      uiCrack(g, cx, cy, 160 * S, 5, 1);
      g.save(); g.translate(cx, cy); g.rotate(wob); g.fillStyle = '#3a2a14'; g.beginPath(); g.arc(0, 0, 14 * S, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#9bc45a'; for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(10 * S, 0); g.lineTo(46 * S, -14 * S); g.lineTo(38 * S, 0); g.lineTo(46 * S, 14 * S); g.fill(); }
      g.restore();
    }
  },
  hammer(o) {   // Ulfgar: a giant lightning hammer swings down from the sky and smashes the ground
    const { g, f, k, vw, vh, S, cx } = o, hit = 34, gy = vh * 0.86;
    uiFig(g, f, cx - 200 * S, gy, 170 * S, 'power', 1);
    const a = k < hit ? -1.9 + uiIn(k / hit) * 1.9 : 0;
    g.save(); g.translate(cx + 140 * S, gy - 420 * S); g.rotate(a);
    g.fillStyle = '#6a5a4a'; g.fillRect(-12 * S, 0, 24 * S, 300 * S);
    g.fillStyle = '#cfd8dc'; g.strokeStyle = '#2fd6ff'; g.lineWidth = 6 * S; g.fillRect(-110 * S, 290 * S, 220 * S, 120 * S); g.strokeRect(-110 * S, 290 * S, 220 * S, 120 * S);
    g.restore();
    if (k >= hit) {
      const p = uiSeg(k, hit, hit + 24);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= 1 - p;
      uiBurst(g, cx + 140 * S, gy, 420 * S, 16, 'rgba(47,214,255,.8)', 5 * S);
      if (typeof ufxBolt === 'function') for (let i = 0; i < 3; i++) ufxBolt(g, cx + 140 * S + (i - 1) * 140 * S, 0, gy, i * 5 + 2, 6 * S, '#e8fbff');
      g.restore();
      uiCrack(g, cx + 140 * S, gy, 300 * S, 8, 1 - p * 0.5);
      if (k < hit + 4) { g.fillStyle = 'rgba(230,250,255,.6)'; g.fillRect(0, 0, vw, vh); }
    }
  },
  tornado(o) {   // Talon: a tornado of leaves builds up and grows to fill the screen
    const { g, f, k, vw, vh, S, cx } = o, p = uiSeg(k, 0, 50), n = o.low ? 9 : 16;
    for (let j = 0; j < n; j++) {
      const y = vh * 0.9 - j * vh * 0.055, w = (30 + j * 14) * S * (0.4 + p * 0.9), a = k * 0.35 + j * 0.8;
      if (j / n > p + 0.15) continue;
      g.strokeStyle = j % 2 ? 'rgba(63,207,122,.75)' : 'rgba(242,227,107,.6)'; g.lineWidth = 5 * S;
      g.beginPath(); g.ellipse(cx + Math.sin(a) * 12 * S, y, w, w * 0.18, 0, 0, Math.PI * 2); g.stroke();
    }
    for (let i = 0; i < (o.low ? 14 : 30); i++) {
      const a = k * 0.2 + i * 0.9, hh = uiSeed(i), r = (60 + hh * 180) * S * (0.4 + p);
      g.save(); g.translate(cx + Math.cos(a) * r, vh * 0.9 - hh * vh * 0.8); g.rotate(a * 2);
      g.fillStyle = i % 3 ? 'rgba(111,211,90,.9)' : 'rgba(242,227,107,.9)'; g.beginPath(); g.ellipse(0, 0, 12 * S, 5 * S, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
    uiFig(g, f, cx, vh * 0.5 + 60 * S, 150 * S, 'spin', Math.sin(k * 0.4) > 0 ? 1 : -1, uiSeg(k, 20, 32));
  },
  sharks(o) {   // Mr. Chiu: the water rises, shark fins circle, then a giant shark bursts out
    const { g, f, k, vw, vh, S, cx } = o, wl = vh * (1 - uiOut(uiSeg(k, 0, 20)) * 0.42), burst = 38;
    // water
    g.fillStyle = 'rgba(31,163,214,.75)'; g.beginPath(); g.moveTo(0, vh);
    for (let x = 0; x <= vw; x += 24) g.lineTo(x, wl + Math.sin(x * 0.02 + k * 0.3) * 10 * S);
    g.lineTo(vw, vh); g.fill();
    // fins circling
    if (k < burst + 6) for (let i = 0; i < (o.low ? 3 : 5); i++) {
      const x = ((uiSeed(i) * vw + k * (6 + i * 2) * S * (i % 2 ? 1 : -1)) % vw + vw) % vw, y = wl + Math.sin(x * 0.02 + k * 0.3) * 10 * S, dir = i % 2 ? 1 : -1;
      g.fillStyle = '#1f6f9c'; g.strokeStyle = '#0a2236'; g.lineWidth = 3 * S;
      g.beginPath(); g.moveTo(x - dir * 26 * S, y); g.quadraticCurveTo(x - dir * 6 * S, y - 50 * S, x + dir * 22 * S, y - 46 * S); g.lineTo(x + dir * 18 * S, y); g.closePath(); g.fill(); g.stroke();
    }
    if (k >= burst) {   // the big one
      const p = uiSeg(k, burst, burst + 16), y = wl + 200 * S - uiOut(p) * 380 * S;
      if (typeof ufxShark === 'function') { g.save(); g.translate(cx, y); g.rotate(-1.2); ufxShark(g, 0, 0, 4.2 * S, 1, '#1f6f9c'); g.restore(); }
      g.fillStyle = 'rgba(191,246,255,.85)';
      for (let i = 0; i < (o.low ? 10 : 24); i++) { const a = Math.PI + uiSeed(i) * Math.PI, d = uiSeg(k, burst, burst + 26) * (120 + uiSeed(i + 2) * 300) * S; g.beginPath(); g.arc(cx + Math.cos(a) * d, wl + Math.sin(a) * d * 0.9 + uiIn(uiSeg(k, burst, burst + 26)) * 120 * S, 7 * S, 0, Math.PI * 2); g.fill(); }
    } else uiFig(g, f, vw * 0.16, wl + 10 * S, 150 * S, 'cast', 1);
  },
  barrage(o) {   // Mr. Guo: looking down a scope, rapid shots punch holes in the screen
    const { g, f, k, vw, vh, S, cx, cy } = o, R = Math.min(vw, vh) * 0.36;
    uiFig(g, f, cx, cy + 120 * S, 230 * S, 'cast', 1);
    g.save(); g.fillStyle = 'rgba(0,0,0,.88)'; g.beginPath(); g.rect(0, 0, vw, vh); g.arc(cx, cy, R, 0, Math.PI * 2, true); g.fill(); g.restore();
    g.strokeStyle = '#e8354a'; g.lineWidth = 2 * S; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    for (let i = 0; i < 10; i++) {
      const at = 14 + i * 4; if (k < at) break;
      const x = cx + (uiSeed(i) - 0.5) * vw * 0.8, y = cy + (uiSeed(i + 20) - 0.5) * vh * 0.7;
      if (k < at + 2) { g.fillStyle = 'rgba(255,220,150,.35)'; g.fillRect(0, 0, vw, vh); }
      uiCrack(g, x, y, 50 * S, i * 3, 0.8);
      g.fillStyle = '#111'; g.strokeStyle = '#555'; g.lineWidth = 2 * S; g.beginPath(); g.arc(x, y, 8 * S, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  },
  encore(o) {   // Echo: spotlights, pumping speakers and an equalizer to the beat
    const { g, f, k, vw, vh, S, cx } = o, beat = Math.abs(Math.sin(k * 0.35));
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const a = Math.PI / 2 + Math.sin(k * 0.06 + i * 1.7) * 0.6, x0 = (i + 0.5) / 4 * vw; g.fillStyle = i % 2 ? 'rgba(255,61,240,.16)' : 'rgba(24,255,209,.14)'; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + Math.cos(a - 0.15) * vh * 1.3, Math.sin(a - 0.15) * vh * 1.3); g.lineTo(x0 + Math.cos(a + 0.15) * vh * 1.3, Math.sin(a + 0.15) * vh * 1.3); g.fill(); }
    g.restore();
    const bars = o.low ? 14 : 28, bw = vw / bars;
    for (let i = 0; i < bars; i++) { const h = (0.2 + Math.abs(Math.sin(k * 0.3 + i * 0.7)) * 0.8 * uiSeg(k, 0, 20)) * vh * 0.35; g.fillStyle = i % 2 ? 'rgba(255,61,240,.7)' : 'rgba(24,255,209,.7)'; g.fillRect(i * bw + 2, vh - h, bw - 4, h); }
    for (const sd of [-1, 1]) {
      const x = cx + sd * vw * 0.36, y = vh * 0.5, s = 1 + beat * 0.08;
      g.save(); g.translate(x, y); g.scale(s, s);
      g.fillStyle = '#1b1430'; g.strokeStyle = '#ff3df0'; g.lineWidth = 4 * S; g.fillRect(-60 * S, -110 * S, 120 * S, 220 * S); g.strokeRect(-60 * S, -110 * S, 120 * S, 220 * S);
      g.beginPath(); g.arc(0, 35 * S, 42 * S, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, -60 * S, 22 * S, 0, Math.PI * 2); g.stroke(); g.restore();
      g.strokeStyle = 'rgba(24,255,209,.6)'; g.lineWidth = 4 * S;
      for (let j = 0; j < 3; j++) { const r = ((k * 6 + j * 40) % 120) * S + 50 * S; g.beginPath(); g.arc(x, y + 35 * S, r, sd > 0 ? Math.PI - 0.7 : -0.7, sd > 0 ? Math.PI + 0.7 : 0.7); g.stroke(); }
    }
    uiFig(g, f, cx, vh * 0.8, 190 * S * (1 + beat * 0.04), 'power', 1);
  },
  clock(o) {   // Kiro: a giant clock, the hands spin wildly, then time stops and the colour drains
    const { g, f, k, vw, vh, S, cx, cy } = o, R = Math.min(vw, vh) * 0.36, stop = 48;
    g.fillStyle = 'rgba(30,22,10,.6)'; g.strokeStyle = '#e6b84a'; g.lineWidth = 8 * S; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill(); g.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = (i % 3 ? 3 : 6) * S; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86); g.lineTo(cx + Math.cos(a) * R * 0.96, cy + Math.sin(a) * R * 0.96); g.stroke(); }
    for (let i = 0; i < 3; i++) {   // gears
      const gx = cx + [-1, 1, 0.8][i] * R * 1.15, gy = cy + [-0.6, 0.5, -0.9][i] * R, gr = (40 + i * 15) * S, rot = (k < stop ? k : stop) * 0.08 * (i % 2 ? 1 : -1);
      g.save(); g.translate(gx, gy); g.rotate(rot); g.strokeStyle = 'rgba(230,184,74,.7)'; g.lineWidth = 6 * S; g.beginPath(); g.arc(0, 0, gr, 0, Math.PI * 2); g.stroke();
      for (let t2 = 0; t2 < 8; t2++) { g.rotate(Math.PI / 4); g.fillStyle = 'rgba(230,184,74,.7)'; g.fillRect(gr - 2 * S, -6 * S, 14 * S, 12 * S); } g.restore();
    }
    const spin = k < stop ? k * k * 0.006 : stop * stop * 0.006;
    g.strokeStyle = '#fff4d6'; g.lineCap = 'round';
    g.lineWidth = 8 * S; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(spin * 0.25 - 1.5) * R * 0.5, cy + Math.sin(spin * 0.25 - 1.5) * R * 0.5); g.stroke();
    g.lineWidth = 5 * S; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(spin - 1.5) * R * 0.78, cy + Math.sin(spin - 1.5) * R * 0.78); g.stroke(); g.lineCap = 'butt';
    uiFig(g, f, cx, cy + R * 0.75, 150 * S, 'cast', 1);
    if (k >= stop) { const q = uiSeg(k, stop, stop + 8); g.fillStyle = `rgba(120,120,130,${0.35 * q})`; g.fillRect(0, 0, vw, vh); if (k < stop + 3) { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(0, 0, vw, vh); } }
  },
  elixir(o) {   // Lumi: the cauldron bubbles over, potions fly up, then a big splash
    const { g, f, k, vw, vh, S, cx } = o, gy = vh * 0.92, splash = 44;
    uiFig(g, f, cx - 210 * S, gy, 170 * S, 'cast', 1);
    for (let i = 0; i < (o.low ? 8 : 18); i++) { const q = ((k * 1.6 + i * 11) % 70) / 70, x = cx + (uiSeed(i) - 0.5) * 160 * S, y = gy - 120 * S - q * vh * 0.6; g.globalAlpha = 1 - q; g.fillStyle = i % 2 ? '#7cff6b' : '#ff7ab8'; g.beginPath(); g.arc(x, y, (6 + uiSeed(i + 3) * 10) * S, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    g.fillStyle = '#2a2a33'; g.strokeStyle = '#111'; g.lineWidth = 5 * S; g.beginPath(); g.ellipse(cx, gy - 70 * S, 130 * S, 90 * S, 0, 0, Math.PI); g.fill(); g.stroke();
    g.fillStyle = '#7cff6b'; g.beginPath(); g.ellipse(cx, gy - 70 * S, 125 * S, 26 * S, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 3; i++) {   // flying potions
      const p = uiSeg(k, 8 + i * 8, 40 + i * 8); if (p <= 0 || p >= 1) continue;
      const x = cx + (i - 1) * 220 * S * p, y = gy - 70 * S - Math.sin(p * Math.PI) * vh * 0.5;
      g.save(); g.translate(x, y); g.rotate(p * 8); g.fillStyle = ['#ff7ab8', '#7cff6b', '#9fd8ff'][i]; g.beginPath(); g.arc(0, 0, 18 * S, 0, Math.PI * 2); g.fill(); g.fillStyle = '#d9d9d9'; g.fillRect(-6 * S, -32 * S, 12 * S, 16 * S); g.restore();
    }
    if (k >= splash) { const q = uiSeg(k, splash, splash + 20); g.fillStyle = `rgba(124,255,107,${0.55 * (1 - q)})`; g.beginPath(); g.arc(cx, gy - 70 * S, q * Math.max(vw, vh) * 0.8, 0, Math.PI * 2); g.fill(); }
  },
  photo(o) {   // Master Chuang: viewfinder focuses in, flash, flash, then polaroids rain down
    const { g, f, k, vw, vh, S, cx, cy } = o, foc = uiSeg(k, 0, 22), r = (300 - foc * 120) * S;
    uiFig(g, f, cx, cy + 110 * S, 200 * S, 'power', 1);
    g.strokeStyle = '#ffd84a'; g.lineWidth = 5 * S;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(cx + sx * r, cy + sy * (r - 40 * S)); g.lineTo(cx + sx * r, cy + sy * r); g.lineTo(cx + sx * (r - 40 * S), cy + sy * r); g.stroke(); }
    g.lineWidth = 2 * S; g.beginPath(); g.arc(cx, cy, 40 * S + (1 - foc) * 60 * S, 0, Math.PI * 2); g.stroke();
    if (k < 26 && (k >> 2) % 2) { g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(cx + r - 20 * S, cy - r + 20 * S, 8 * S, 0, Math.PI * 2); g.fill(); }
    for (const fl of [26, 36]) if (k >= fl && k < fl + 6) { g.fillStyle = `rgba(255,255,255,${1 - (k - fl) / 6})`; g.fillRect(0, 0, vw, vh); }
    if (k > 38) for (let i = 0; i < (o.low ? 6 : 12); i++) {
      const q = uiSeg(k, 38 + i * 2, 70 + i * 2), x = uiSeed(i) * vw, y = -80 * S + q * (vh * 0.7 + uiSeed(i + 9) * vh * 0.3);
      g.save(); g.translate(x, y); g.rotate((uiSeed(i + 4) - 0.5) * 0.8 + q * 0.4);
      g.fillStyle = '#fafafa'; g.fillRect(-40 * S, -46 * S, 80 * S, 92 * S); g.fillStyle = ['#ffd84a', '#3a6fd8', '#e8354a', '#3fcf7a'][i % 4]; g.fillRect(-32 * S, -38 * S, 64 * S, 60 * S); g.restore();
    }
  },
  court(o) {   // Mythic Hsi: a basketball bounces toward the camera, then slams through a giant hoop
    const { g, f, k, vw, vh, S, cx } = o, dunk = 40;
    g.strokeStyle = 'rgba(255,226,184,.35)'; g.lineWidth = 4 * S;
    g.beginPath(); g.ellipse(cx, vh * 0.95, vw * 0.45, vh * 0.12, 0, Math.PI, 0); g.stroke(); g.beginPath(); g.moveTo(0, vh * 0.95); g.lineTo(vw, vh * 0.95); g.stroke();
    const hx = cx, hy = vh * 0.3, hs = uiOut(uiSeg(k, 10, 28));
    if (hs > 0) {
      g.fillStyle = '#f2f2f2'; g.strokeStyle = '#1a0f06'; g.lineWidth = 4 * S; g.fillRect(hx - 130 * S * hs, hy - 130 * S * hs, 260 * S * hs, 140 * S * hs); g.strokeRect(hx - 130 * S * hs, hy - 130 * S * hs, 260 * S * hs, 140 * S * hs);
      g.strokeStyle = '#ff8a1f'; g.lineWidth = 8 * S; g.beginPath(); g.ellipse(hx, hy + 20 * S * hs, 90 * S * hs, 20 * S * hs, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2 * S; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(hx + i * 26 * S * hs, hy + 24 * S * hs); g.lineTo(hx + i * 14 * S * hs, hy + 110 * S * hs * (k > dunk ? 1 + Math.sin((k - dunk) * 0.8) * 0.15 : 1)); g.stroke(); }
    }
    let bx, by, br;
    if (k < dunk) { const p = k / dunk; bx = vw * 0.1 + p * (hx - vw * 0.1); by = vh * 0.9 - Math.abs(Math.sin(p * Math.PI * 3)) * vh * 0.5 * (1 - p * 0.3) - p * vh * 0.4; br = (20 + p * 50) * S; }
    else { const p = uiSeg(k, dunk, dunk + 14); bx = hx; by = hy - 20 * S + p * 200 * S; br = 70 * S; }
    if (typeof ufxBall === 'function') ufxBall(g, bx, by, br, k * 0.3);
    if (k >= dunk && k < dunk + 5) { g.fillStyle = 'rgba(255,200,120,.5)'; g.fillRect(0, 0, vw, vh); }
    uiFig(g, f, vw * 0.84, vh * 0.95, 190 * S, k > dunk ? 'power' : 'jump', -1);
  },
  legend(o) {   // Legend Yen: seven style orbs orbit in, merge into him, rainbow rays burst out
    const { g, f, k, vw, vh, S, cx, cy } = o, merge = uiSeg(k, 10, 42);
    if (k > 40) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + k * 0.02; g.fillStyle = `hsla(${i * 26},100%,60%,.18)`; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * vw, cy + Math.sin(a) * vw); g.lineTo(cx + Math.cos(a + 0.18) * vw, cy + Math.sin(a + 0.18) * vw); g.fill(); } g.restore(); }
    uiFig(g, f, cx, cy + 110 * S, 220 * S, 'power', 1, uiSeg(k, 30, 44));
    if (merge < 1) for (let j = 0; j < 7; j++) {
      const a = j / 7 * Math.PI * 2 + k * 0.15, r = (1 - uiIn(merge)) * Math.min(vw, vh) * 0.45 + 10 * S;
      g.fillStyle = `hsl(${j * 51},100%,65%)`; g.shadowColor = g.fillStyle; g.shadowBlur = 16 * S;
      g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 18 * S, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
    }
    if (k >= 42 && k < 47) { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, 0, vw, vh); }
  }
};

/* the small name tag that slides in at the end */
function uiTag(g, f, def, k, K, vw, vh, S) {
  const p = uiOut(uiSeg(k, K - 34, K - 24)); if (p <= 0) return;
  const col = def.colors, nm = def.name.toUpperCase(), who = ((f.tag ? f.tag + ' \u00b7 ' : '') + f.c.name).toUpperCase();
  const fs = Math.max(16, Math.round(26 * S)), fs2 = Math.max(10, Math.round(13 * S));
  g.save();
  g.font = `${fs}px "Dela Gothic One", Impact, sans-serif`;
  const w = Math.min(vw - 24, g.measureText(nm).width + 44 * S), h = fs + fs2 + 22 * S;
  const x = vw - w - 16 + (1 - p) * (w + 40), y = vh - h - Math.min(vh * 0.07, 50) - 12;
  g.fillStyle = 'rgba(8,6,18,.82)'; rrect(g, x, y, w, h, 8 * S); g.fill();
  g.fillStyle = col[1]; g.fillRect(x, y, 6 * S, h);
  g.strokeStyle = hexA(col[2], 0.7); g.lineWidth = 2; rrect(g, x, y, w, h, 8 * S); g.stroke();
  g.textAlign = 'left'; g.textBaseline = 'top';
  g.font = `700 ${fs2}px "Chakra Petch", system-ui, sans-serif`; g.fillStyle = hexA(col[2] === '#ffffff' ? col[1] : col[2], 0.95); g.fillText(who, x + 18 * S, y + 9 * S);
  g.font = `${fs}px "Dela Gothic One", Impact, sans-serif`; g.fillStyle = '#fff'; g.fillText(nm, x + 18 * S, y + 12 * S + fs2, w - 30 * S);
  g.restore();
}

/* replaces the old title card (called from drawUltCutscene in ult.js) */
function drawUltIntro(g, view, c, vw, vh, t) {
  const { f, def } = c, k = c.u.t, K = ULT_CUT, col = def.colors;
  const scene = UI_SCENES[def.style]; if (!scene) return false;
  const a = Math.min(1, k / 6) * Math.min(1, (K - k) / 8);
  const S = Math.max(0.45, Math.min(vw / 1000, vh / 600));
  g.save(); g.globalAlpha = a;
  const bg = g.createRadialGradient(vw / 2, vh / 2, 0, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
  bg.addColorStop(0, shade(col[0], 0.18)); bg.addColorStop(1, col[0]);
  g.fillStyle = bg; g.fillRect(0, 0, vw, vh);
  // a little shake right when things hit
  const sh = (def.style === 'stomp' && k >= 30 && k < 42) || (def.style === 'hammer' && k >= 34 && k < 46) ? 10 * S : 0;
  if (sh) g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
  g.save();
  scene({ g, f, def, col, k, vw, vh, cx: vw / 2, cy: vh * 0.46, S, low: UI_LOW(), t });
  g.restore();
  // cinematic bars
  const bar = Math.min(vh * 0.07, 50) * uiOut(uiSeg(k, 0, 10));
  g.fillStyle = '#000'; g.fillRect(-20, -20, vw + 40, bar + 20); g.fillRect(-20, vh - bar, vw + 40, bar + 20);
  uiTag(g, f, def, k, K, vw, vh, S);
  g.restore();
  if (k < 5) { g.fillStyle = `rgba(255,255,255,${(1 - k / 5) * 0.8})`; g.fillRect(0, 0, vw, vh); }
  return true;
}
