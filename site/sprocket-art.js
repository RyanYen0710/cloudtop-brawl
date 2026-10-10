'use strict';
/* ===== CLOUDTOP BRAWL — how Professor Sprocket looks =====
   Lab coat, wild white hair, brass goggles, coil springs on his legs, a brass gadget glove,
   the Extend-o Arm (an accordion arm) and the Grapple Hand's cable. */

const SPROCKET_BRASS = '#c9932a', SPROCKET_DARK = '#7a5418';
function sprocketCoil(g, x1, y1, x2, y2, w, n) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  g.lineCap = 'round';
  g.strokeStyle = OUTLINE; g.lineWidth = 5.5; g.beginPath();
  for (let i = 0; i <= n; i++) { const k = i / n, s = (i % 2 ? 1 : -1) * w; g.lineTo(x1 + dx * k + nx * s, y1 + dy * k + ny * s); }
  g.stroke();
  g.strokeStyle = '#d8dde6'; g.lineWidth = 3; g.beginPath();
  for (let i = 0; i <= n; i++) { const k = i / n, s = (i % 2 ? 1 : -1) * w; g.lineTo(x1 + dx * k + nx * s, y1 + dy * k + ny * s); }
  g.stroke();
}
function sprocketGlove(g, x, y, r, col) {
  circle(g, x, y, r); fillStroke(g, col || SPROCKET_BRASS, 2.5);
  g.fillStyle = 'rgba(255,255,255,.35)'; circle(g, x - r * 0.3, y - r * 0.35, r * 0.3); g.fill();
  g.fillStyle = SPROCKET_DARK; [[-0.45, 0.4], [0.45, 0.4]].forEach(([a, b]) => { circle(g, x + a * r, y + b * r, r * 0.13); g.fill(); });
}
const LOOK_SPROCKET = {
  back(g, K) {   // a gadget backpack with a spinning gear and an antenna
    const { sw, shY, torsoH, t, acc } = K;
    g.beginPath(); g.rect(-sw * 0.62, shY + torsoH * 0.1, sw * 0.42, torsoH * 0.7); fillStroke(g, '#6a5a48', 2.5);
    g.save(); g.translate(-sw * 0.42, shY + torsoH * 0.42); g.rotate(t * 0.05);
    g.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? sw * 0.12 : sw * 0.16, an = i / 16 * Math.PI * 2; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); fillStroke(g, acc, 2);
    g.restore();
    g.strokeStyle = OUTLINE; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-sw * 0.5, shY + torsoH * 0.1); g.lineTo(-sw * 0.62, shY - torsoH * 0.55); g.stroke();
    g.fillStyle = (Math.floor(t / 15) % 2) ? '#ff4a3a' : '#ffd35c'; circle(g, -sw * 0.62, shY - torsoH * 0.55, 3.5); g.fill();
  },
  torso(g, K) {
    const { sw, shY, hipY, torsoH, legL, A, limbW } = K;
    // lab coat lapels, a bow tie and a pocket full of pens
    g.fillStyle = '#5a4636'; g.beginPath(); g.moveTo(-sw * 0.08, shY + 1); g.lineTo(sw * 0.2, shY + 1); g.lineTo(sw * 0.06, shY + torsoH * 0.55); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(sw * 0.06, shY + 4); g.lineTo(-sw * 0.06, shY - 2); g.lineTo(-sw * 0.06, shY + 10); g.closePath(); fillStroke(g, '#d9483b', 1.5);
    g.beginPath(); g.moveTo(sw * 0.06, shY + 4); g.lineTo(sw * 0.2, shY - 2); g.lineTo(sw * 0.2, shY + 10); g.closePath(); fillStroke(g, '#d9483b', 1.5);
    g.fillStyle = '#c9c2b0'; g.fillRect(sw * 0.14, shY + torsoH * 0.35, sw * 0.24, torsoH * 0.22);
    ['#3da5ff', '#ff4a3a'].forEach((c2, i) => { g.fillStyle = c2; g.fillRect(sw * (0.18 + i * 0.08), shY + torsoH * 0.27, 2.5, torsoH * 0.14); });
    g.fillStyle = SPROCKET_DARK; g.fillRect(-sw * 0.5, hipY - 5, sw, 5);
    // coil springs on the shins
    [[-sw * 0.16, A.legB, -A.kneeB], [sw * 0.16, A.legF, -A.kneeF]].forEach(([x, a1, a2]) => {
      const r1 = a1 * D2R, ex = x + Math.sin(r1) * legL * 0.52, ey = hipY + Math.cos(r1) * legL * 0.52;
      const r2 = (a1 + a2) * D2R, fx = ex + Math.sin(r2) * legL * 0.5, fy = ey + Math.cos(r2) * legL * 0.5;
      sprocketCoil(g, ex + (fx - ex) * 0.15, ey + (fy - ey) * 0.15, fx, fy, limbW * 0.75, 7);
    });
  },
  head(g, K) {
    const { hx, hy, hr, t } = K;
    // wild white hair puffs
    g.fillStyle = '#eceef4';
    [[-1.05, -0.2, 0.42], [-0.85, -0.75, 0.38], [-0.3, -1.05, 0.36], [0.95, -0.55, 0.3]].forEach(([a, b, r]) => { circle(g, hx + a * hr, hy + b * hr, r * hr); g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUTLINE; g.stroke(); });
    // brass goggles on the forehead
    g.strokeStyle = '#3a2a18'; g.lineWidth = 3; g.beginPath(); g.moveTo(hx - hr, hy - hr * 0.5); g.lineTo(hx + hr, hy - hr * 0.5); g.stroke();
    [0.05, 0.6].forEach(a => { circle(g, hx + a * hr, hy - hr * 0.5, hr * 0.3); fillStroke(g, SPROCKET_BRASS, 2); g.fillStyle = '#7ad7ff'; circle(g, hx + a * hr, hy - hr * 0.5, hr * 0.18); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; circle(g, hx + a * hr - 2, hy - hr * 0.55, hr * 0.06); g.fill(); });
    // a bushy moustache
    g.fillStyle = '#eceef4'; g.beginPath(); g.ellipse(hx + hr * 0.6, hy + hr * 0.35, hr * 0.35, hr * 0.13, 0.1, 0, Math.PI * 2); g.fill();
  },
  hand(g, K) {
    const { f, hand, W } = K, [x, y] = hand;
    const ext = f && !K.portrait && (f.mv === 'sp_side' || (f.mv === 'sp_down' && f.pose === 'punch')) && f.pose === 'punch' ? f.pt : 0;
    if (ext > 0.05) {   // the Extend-o Arm / Grapple claw: an accordion arm to the front, then a big glove or claw
      const L = W * (f.mv === 'sp_side' ? 3.4 : 2.2) * Math.min(1, ext), n = Math.max(4, Math.round(L / 9));
      sprocketCoil(g, x, y, x + L, y, 5, n);
      if (f.mv === 'sp_side') sprocketGlove(g, x + L + 6, y, W * 0.24, '#d9483b');
      else { sprocketGlove(g, x + L + 4, y, W * 0.17); g.strokeStyle = OUTLINE; g.lineWidth = 3; g.beginPath(); g.moveTo(x + L + 8, y - 6); g.lineTo(x + L + 18, y - 12); g.moveTo(x + L + 8, y + 6); g.lineTo(x + L + 18, y + 12); g.stroke(); }
      return;
    }
    sprocketGlove(g, x, y, W * 0.14);
  }
};
if (typeof lookHook === 'function') {
  const lookHookPlain = lookHook;
  lookHook = function (g, part, K) { if (K.has('sprocket')) { LOOK_SPROCKET[part] && LOOK_SPROCKET[part](g, K); return; } lookHookPlain(g, part, K); };
}
/* the Grapple Hand's cable, from his hand to the ledge */
if (typeof fxEventNew === 'function') {
  const fxEventPlain = fxEventNew;
  fxEventNew = function (type, x, y, a, b, col) {
    if (type === 'grapple') { spawnFx({ k: 'gcable', x, y, x2: a, y2: b, life: 16 }); return; }
    fxEventPlain(type, x, y, a, b, col);
  };
}
if (typeof drawFxNew === 'function') {
  const drawFxPlain = drawFxNew;
  drawFxNew = function (g, p, k) {
    if (p.k !== 'gcable') { drawFxPlain(g, p, k); return; }
    // the hand is already on the ledge; he reels in along the cable (the start follows him)
    const sx = p.x + (p.x2 - p.x) * k, sy = p.y + (p.y2 - p.y) * k, ex = p.x2, ey = p.y2;
    g.strokeStyle = OUTLINE; g.lineWidth = 5; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    g.strokeStyle = SPROCKET_BRASS; g.lineWidth = 2.5; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
    sprocketGlove(g, ex, ey, 9);
  };
}
