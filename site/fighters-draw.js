'use strict';
/* ===== CLOUDTOP BRAWL — fighter drawing ===== */

function shade(hex, amt) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function rrect(g, x, y, w, h, r) {
  if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); }

const OUTLINE = '#120d24';

function poseAngles(f, t) {
  const pt = f.pt || 0;
  const a = { armF: 12, armB: -12, elbF: -25, elbB: -25, legF: 6, legB: -6, kneeF: 0, kneeB: 0, lean: 0, rot: 0, crouch: 0, bob: 0, jit: 0 };
  switch (f.pose) {
    case 'idle': case 'halo': a.bob = Math.sin(t * 0.08) * 1.5; a.armF = 14 + Math.sin(t * 0.08) * 4; break;
    case 'run': {
      const ph = f._anim && f._anim.runPh != null ? f._anim.runPh : t * 0.35, s = Math.sin(ph), c2 = Math.cos(ph);
      a.armF = s * 58; a.armB = -s * 58; a.elbF = -48 - Math.max(0, s) * 20; a.elbB = -48 - Math.max(0, -s) * 20;
      a.legF = -s * 44; a.legB = s * 44; a.kneeF = s > 0 ? 18 + s * 62 : 8; a.kneeB = s < 0 ? 18 - s * 62 : 8;
      a.lean = 12; a.bob = -Math.abs(c2) * 3.2 + 1.5; break;
    }
    case 'jump': a.armF = 140; a.armB = -50; a.elbF = -10; a.legF = 35; a.kneeF = 50; a.legB = -12; a.kneeB = 40; break;
    case 'fall': a.armF = 110; a.armB = -110; a.elbF = -20; a.elbB = -20; a.legF = 15; a.legB = -15; a.kneeB = 30; break;
    case 'helpless': a.armF = 165; a.armB = -165; a.legF = 10; a.legB = -20; a.kneeB = 35; a.lean = -8 + Math.sin(t * 0.2) * 6; break;
    case 'land': a.crouch = 0.4; a.armF = 35; a.armB = -35; a.kneeF = 40; a.kneeB = 40; a.legF = 25; a.legB = -10; break;
    case 'hurt': case 'frozen': a.lean = -25; a.armF = 150; a.armB = -140; a.elbF = -30; a.legF = 30; a.legB = -30; a.kneeB = 40; break;
    case 'shield': case 'guard': a.crouch = 0.15; a.armF = 80; a.elbF = -70; a.armB = 55; a.elbB = -80; a.kneeF = 15; a.kneeB = 15; break;
    case 'roll': a.crouch = 0.5; a.rot = t * 0.45; a.armF = 60; a.armB = 60; a.legF = 60; a.legB = 50; a.kneeF = 80; a.kneeB = 80; break;
    case 'dodge': a.armF = 40; a.armB = -40; a.legF = 25; a.kneeF = 40; break;
    case 'punch': a.armF = 20 + 72 * pt; a.elbF = -45 * (1 - pt); a.armB = -30 - 25 * pt; a.lean = 12 * pt; a.legF = 28 * pt; a.legB = -28 * pt; a.kneeB = 15; break;
    case 'up': a.armF = 20 + 155 * pt; a.elbF = -10; a.armB = -25; a.lean = -6 * pt; a.legF = 10; a.legB = -8; break;
    case 'low': a.crouch = 0.35 * pt; a.armF = 40 + 20 * pt; a.legF = 75 * pt; a.kneeF = 0; a.legB = -15; a.kneeB = 40; a.lean = -6; break;
    case 'split': a.crouch = 0.35; a.armF = 20 + 75 * pt; a.armB = -20 - 75 * pt; a.elbF = 0; a.elbB = 0; a.legF = 60 * pt; a.legB = -60 * pt; break;
    case 'spin': a.rot = pt >= 1 ? t * 0.5 : 0; a.armF = 100; a.armB = -100; a.elbF = 0; a.elbB = 0; a.legF = 40; a.legB = -40; break;
    case 'back': a.armB = -30 - 70 * pt; a.elbB = 0; a.legB = -85 * pt; a.kneeB = 0; a.armF = 40; a.lean = -10 * pt; break;
    case 'stomp': a.armF = 160; a.armB = -160; a.legF = 8; a.legB = -8; break;
    case 'charge': a.armF = -55; a.elbF = -95; a.armB = -35; a.crouch = 0.18; a.lean = -8; a.jit = 1.5; a.kneeF = 20; a.kneeB = 20; break;
    case 'dash': a.lean = 28; a.armF = 85; a.elbF = 0; a.armB = -60; a.legF = 40; a.kneeF = 10; a.legB = -50; a.kneeB = 30; break;
    case 'slam': a.armF = 175 - 150 * (1 - pt); a.armB = 175 - 150 * (1 - pt); a.elbF = -10; a.elbB = -10; a.crouch = 0.25 * (1 - pt); break;
    case 'counter': a.armF = 70; a.elbF = -95; a.armB = 40; a.elbB = -100; a.crouch = 0.12; a.legF = 20; a.legB = -20; break;
    case 'cast': a.armF = 20 + 72 * pt; a.elbF = 0; a.armB = -25; a.lean = 6 * pt; a.legF = 18; a.legB = -12; break;
    case 'cast2': a.armF = 150; a.armB = -150; a.elbF = -20; a.elbB = -20; a.bob = Math.sin(t * 0.3) * 2; break;
    case 'fly': a.armF = 100; a.armB = -100; a.elbF = -10; a.elbB = -10; a.legF = 10; a.legB = -15; a.kneeB = 30; a.bob = Math.sin(t * 0.1) * 3; break;
    case 'vanish': a.crouch = 0.3; a.armF = 60; a.elbF = -80; break;
    case 'dizzy': a.armF = 8; a.armB = -8; a.elbF = 0; a.elbB = 0; a.lean = Math.sin(t * 0.15) * 14; break;
    case 'ledge': a.armF = 172; a.armB = 165; a.elbF = -8; a.elbB = -8; a.legF = 12; a.legB = -4; a.kneeF = 25; a.kneeB = 30; a.bob = Math.sin(t * 0.08) * 1; break;
    case 'climb': a.armF = 150 - 100 * pt; a.armB = 140 - 100 * pt; a.legF = 70 * (1 - pt); a.kneeF = 80 * (1 - pt); a.legB = 20; a.kneeB = 40 * (1 - pt); a.lean = 20 * (1 - pt); break;
    case 'power': a.armF = 25; a.armB = -25; a.elbF = -60; a.elbB = -60; a.crouch = 0.2; a.jit = 1; break;
  }
  return a;
}

function limb(g, x, y, a1, a2, l1, l2, w, col, endR, endCol) {
  const r1 = a1 * D2R, ex = x + Math.sin(r1) * l1, ey = y + Math.cos(r1) * l1;
  const r2 = (a1 + a2) * D2R, fx = ex + Math.sin(r2) * l2, fy = ey + Math.cos(r2) * l2;
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = OUTLINE; g.lineWidth = w + 5;
  g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.lineTo(fx, fy); g.stroke();
  g.strokeStyle = col; g.lineWidth = w;
  g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.lineTo(fx, fy); g.stroke();
  if (endR) { circle(g, fx, fy, endR); g.fillStyle = endCol || col; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUTLINE; g.stroke(); }
  return [fx, fy, r2];
}

function fillStroke(g, col, lw) { g.fillStyle = col; g.fill(); g.lineWidth = lw || 3; g.strokeStyle = OUTLINE; g.stroke(); }

function drawAvalancheFighter(g, f) {
  const a = f.avalanche, r = avalancheRadius(f), L = f.c.look;
  g.save(); g.translate(f.x, f.y - r);
  g.strokeStyle = '#6dbb4a'; g.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const y = (i - 1) * r * 0.46;
    g.beginPath(); g.moveTo(-f.face * (r + 8), y); g.lineTo(-f.face * (r + 25 + i * 9), y); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 5; circle(g, 0, 0, r + 8); g.stroke();
  g.strokeStyle = a.left < 60 ? '#ffd35c' : '#6dbb4a';
  g.beginPath(); g.arc(0, 0, r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * a.left / AVALANCHE_FRAMES); g.stroke();
  g.save(); g.rotate(a.spin);
  g.strokeStyle = OUTLINE; g.lineWidth = 3.5; g.fillStyle = L.body; circle(g, 0, 0, r); g.fill(); g.stroke();
  g.fillStyle = L.skin; g.beginPath(); g.ellipse(0, 4, r * 0.63, r * 0.68, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = L.body;
  for (const s of [-1, 1]) { circle(g, s * r * 0.67, r * 0.3, r * 0.29); g.fill(); g.stroke(); }
  g.fillStyle = L.accent; rrect(g, -r * 0.75, r * 0.12, r * 1.5, r * 0.18, 4); g.fill();
  g.fillStyle = L.skin; g.beginPath(); g.ellipse(r * 0.1, -r * 0.45, r * 0.41, r * 0.3, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = OUTLINE; circle(g, -r * 0.03, -r * 0.5, 2.3); g.fill(); circle(g, r * 0.23, -r * 0.5, 2.3); g.fill();
  g.restore(); g.restore();
}
function drawFighter(g, f, t, portrait) {
  if (!portrait && f.avalanche) { drawAvalancheFighter(g, f); return; }
  const c = f.c, L = c.look, W = f.W, H = f.H, ex = L.extra || [];
  const has = k => ex.indexOf(k) >= 0;
  let A = f._A || poseAngles(f, t);
  const AN = !portrait && typeof animStep === 'function' ? animStep(f, A, t) : null;
  if (AN) A = AN.A;
  const bulk = L.build === 'bulky' ? 1.45 : L.build === 'slim' ? 0.85 : L.build === 'small' ? 0.9 : 1;
  g.save();
  g.translate(f.x + (A.jit ? Math.sin(t * 1.9) * A.jit : 0) + (AN ? AN.ox : 0), f.y);
  if (AN) g.scale(AN.sx, AN.sy);
  let alpha = 1;
  if (f.pose === 'vanish') alpha = 1 - (f.pt || 0) * 0.9;
  if (f.pose === 'dodge') alpha = 0.45;
  if (!portrait && f.inv > 0 && f.pose !== 'vanish' && ((t >> 2) & 1)) alpha *= 0.55;
  g.globalAlpha = alpha * (f._ghostA || 1);
  g.scale(f.face || 1, 1);
  const legL = H * 0.36, torsoH = H * 0.33, hr = H * 0.125 * (has('ape') ? 1.1 : 1);
  const hipY = -legL + A.crouch * legL * 0.6 + A.bob;
  if (A.rot) { g.translate(0, -H * 0.5); g.rotate(A.rot); g.translate(0, H * 0.5); }
  g.translate(0, hipY); g.rotate(A.lean * D2R); g.translate(0, -hipY);
  const shY = hipY - torsoH;
  const sw = W * 0.56 * bulk * (has('ape') ? 1.12 : 1);
  const limbW = Math.max(6, W * 0.16 * bulk);
  const armL = H * 0.34 * (has('ape') ? 1.22 : 1);
  const body = L.body, skin = L.skin, acc = L.accent;
  const legC = L.legs || shade(body, -0.28);
  const sleeve = has('robe') || has('witch') ? body : has('ape') ? body : has('robot') ? shade(body, -0.15) : has('knight') ? shade(body, -0.1) : body;
  const handC = has('robot') ? acc : has('knight') ? '#e9eef7' : has('ape') ? shade(skin, -0.25) : has('bird') ? (L.hair || skin) : has('thunder') ? (L.metal || skin) : has('archer') ? '#6b4a2a' : skin;
  const handR = limbW * (has('ape') ? 0.85 : 0.6);
  const hx = sw * 0.08, hy = shY - hr * 0.88;
  const K = typeof lookHook === 'function' ? { f, L, W, H, sw, shY, hipY, torsoH, legL, hx, hy, hr, limbW, body, skin, acc, t, portrait, has, A, armL } : null;

  // back layers
  if (has('knight')) {
    const wv = Math.sin(t * 0.12) * 5;
    g.beginPath(); g.moveTo(-sw * 0.35, shY + 2); g.lineTo(sw * 0.2, shY + 2);
    g.lineTo(-sw * 0.3 + wv, -8); g.lineTo(-sw * 1.05 + wv, -4); g.closePath();
    fillStroke(g, acc);
  }
  if (has('witch')) {
    g.beginPath(); g.moveTo(hx - hr * 0.9, hy - hr * 0.3);
    g.quadraticCurveTo(hx - hr * 1.8, hy + hr * 1.5, hx - hr * 1.2 + Math.sin(t * 0.1) * 3, shY + torsoH * 0.7);
    g.lineTo(hx - hr * 0.1, shY + 4); g.closePath(); fillStroke(g, L.hair || '#fff', 2.5);
  }
  if (has('thunder')) {
    const wv = Math.sin(t * 0.09) * 6, cp = L.cape || '#1f4e5f';
    g.beginPath(); g.moveTo(-sw * 0.45, shY - 2); g.lineTo(sw * 0.3, shY - 2);
    g.quadraticCurveTo(-sw * 0.2 + wv, hipY, -sw * 0.25 + wv * 1.4, hipY + legL * 0.95);
    g.lineTo(-sw * 0.95 + wv * 1.6, hipY + legL * 0.85); g.quadraticCurveTo(-sw * 0.8, hipY - torsoH * 0.3, -sw * 0.45, shY - 2); g.closePath();
    fillStroke(g, cp);
    g.save(); g.clip(); g.fillStyle = shade(cp, 0.18);
    for (let i = 0; i < 3; i++) { const cx0 = -sw * (0.45 + i * 0.25) + wv, cy0 = shY + torsoH * (0.6 + i * 0.5); g.beginPath(); g.ellipse(cx0, cy0, sw * 0.28, torsoH * 0.12, 0, 0, Math.PI * 2); g.ellipse(cx0 + sw * 0.18, cy0 - 4, sw * 0.2, torsoH * 0.1, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
    g.fillStyle = '#e8e2d6'; g.beginPath(); g.ellipse(-sw * 0.05, shY, sw * 0.62, torsoH * 0.16, 0, 0, Math.PI * 2); g.fill();
  }
  if (has('archer')) {
    g.save(); g.translate(-sw * 0.25, shY + torsoH * 0.45); g.rotate(-0.45);
    rrect(g, -limbW * 0.7, -torsoH * 0.75, limbW * 1.4, torsoH * 1.2, 4); fillStroke(g, '#6b4a2a', 2.5);
    g.fillStyle = '#4a3018'; g.fillRect(-limbW * 0.7, -torsoH * 0.2, limbW * 1.4, 4);
    for (let i = 0; i < 3; i++) {
      const ax = (i - 1) * limbW * 0.45, ay = -torsoH * 0.75;
      g.strokeStyle = '#d9c7a0'; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, ay - torsoH * 0.35); g.stroke();
      g.fillStyle = i === 1 ? '#f4efe4' : acc; g.beginPath(); g.moveTo(ax, ay - torsoH * 0.18); g.lineTo(ax - 5, ay - torsoH * 0.42); g.lineTo(ax, ay - torsoH * 0.36); g.lineTo(ax + 5, ay - torsoH * 0.42); g.closePath(); g.fill();
    }
    g.restore();
    g.fillStyle = L.hair || '#7a3f1d'; const pw = Math.sin(t * 0.15) * 3;
    g.beginPath(); g.moveTo(hx - hr * 0.7, hy - hr * 0.2); g.quadraticCurveTo(hx - hr * 1.9 + pw, hy + hr * 0.3, hx - hr * 1.5 + pw * 1.6, hy + hr * 1.7); g.quadraticCurveTo(hx - hr * 1.1, hy + hr * 0.6, hx - hr * 0.5, hy + hr * 0.3); g.closePath(); fillStroke(g, L.hair || '#7a3f1d', 2);
  }
  if (has('bird')) {
    const fold = f.flyT > 0 ? 0.5 : 0, wf = Math.sin(t * 0.12) * 0.05;
    g.save(); g.translate(-sw * 0.1, shY + 4); g.rotate(0.35 + wf - fold);
    for (let i = 0; i < 5; i++) {
      const len = torsoH * (1.1 + i * 0.22), ang2 = -0.15 + i * 0.16;
      g.save(); g.rotate(ang2);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-sw * 0.35, len * 0.5, -sw * 0.08, len); g.quadraticCurveTo(sw * 0.12, len * 0.5, 0, 0);
      fillStroke(g, i === 4 ? acc : shade(body, i * 0.06), 2); g.restore();
    }
    g.restore();
    for (let i = 0; i < 3; i++) {
      g.save(); g.translate(-sw * 0.25, hipY - 2); g.rotate(0.9 + i * 0.22 + Math.sin(t * 0.1 + i) * 0.04);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-6, legL * 0.5, 0, legL * 0.95); g.quadraticCurveTo(6, legL * 0.5, 0, 0);
      fillStroke(g, i === 1 ? acc : shade(body, -0.1), 2); g.restore();
    }
  }
  if (has('reaper')) {
    const wv = Math.sin(t * 0.1) * 5;
    g.beginPath(); g.moveTo(-sw * 0.4, shY); g.lineTo(sw * 0.25, shY);
    g.lineTo(-sw * 0.1 + wv, hipY + legL * 0.95);
    for (let i = 0; i < 5; i++) g.lineTo(-sw * 0.1 - i * sw * 0.22 + wv * (1 + i * 0.2), hipY + legL * (i % 2 ? 0.8 : 1.0));
    g.lineTo(-sw * 1.2 + wv * 1.8, hipY + legL * 0.7); g.closePath();
    fillStroke(g, shade(body, 0.08));
  }
  if (has('storm')) {
    g.lineCap = 'round'; g.lineJoin = 'miter'; g.strokeStyle = acc; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-sw * 0.1, shY + 3);
    for (let i = 1; i <= 5; i++) g.lineTo(-sw * 0.1 - i * 10, shY + 3 + (i % 2 ? -6 : 6) + Math.sin(t * 0.3 + i) * 3 + i * 2);
    g.stroke();
  }
  if (has('ninja')) {
    g.lineCap = 'round'; g.strokeStyle = acc; g.lineWidth = 6;
    g.beginPath(); g.moveTo(-sw * 0.1, shY + 3);
    for (let i = 1; i <= 4; i++) g.lineTo(-sw * 0.1 - i * 11, shY + 3 + Math.sin(t * 0.25 + i) * 5 + i * 3);
    g.stroke();
  }

  if (K) lookHook(g, 'back', K);
  // back arm & back leg
  limb(g, -sw * 0.26, shY + limbW * 0.4, A.armB, A.elbB, armL * 0.5, armL * 0.5, limbW * (has('robe') ? 1.25 : 1), shade(sleeve, -0.12), handR, shade(handC, -0.1));
  limb(g, -sw * 0.16, hipY, A.legB, -A.kneeB, legL * 0.52, legL * 0.5, limbW * 1.1, shade(legC, -0.12), limbW * 0.55, OUTLINE);
  limb(g, sw * 0.16, hipY, A.legF, -A.kneeF, legL * 0.52, legL * 0.5, limbW * 1.1, legC, limbW * 0.55, OUTLINE);

  // torso
  rrect(g, -sw / 2, shY - 2, sw, hipY - shY + 8, Math.min(12, sw * 0.3));
  if (has('robot')) {
    const gr = g.createLinearGradient(0, shY, 0, hipY); gr.addColorStop(0, shade(body, 0.2)); gr.addColorStop(1, shade(body, -0.2));
    fillStroke(g, gr);
    rrect(g, -sw * 0.25, shY + 6, sw * 0.5, torsoH * 0.45, 4); fillStroke(g, acc, 2);
    g.fillStyle = OUTLINE; circle(g, -sw * 0.35, shY + 6, 2); g.fill(); circle(g, sw * 0.35, shY + 6, 2); g.fill();
  } else if (has('knight')) {
    const gr = g.createLinearGradient(-sw / 2, 0, sw / 2, 0); gr.addColorStop(0, shade(body, -0.2)); gr.addColorStop(0.5, shade(body, 0.3)); gr.addColorStop(1, shade(body, -0.25));
    fillStroke(g, gr);
    g.fillStyle = acc; g.fillRect(-sw * 0.22, shY + 6, sw * 0.44, torsoH + 2);
    g.fillStyle = '#ffd35c'; circle(g, 0, shY + torsoH * 0.45, sw * 0.12); g.fill();
  } else {
    fillStroke(g, body);
    if (has('ape')) { g.beginPath(); g.ellipse(sw * 0.08, shY + torsoH * 0.45, sw * 0.28, torsoH * 0.35, 0, 0, Math.PI * 2); g.fillStyle = shade(skin, -0.1); g.fill(); g.fillStyle = acc; g.fillRect(-sw / 2 + 2, hipY - 5, sw - 4, 7); }
    if (has('robe')) {
      g.strokeStyle = acc; g.lineWidth = 3; g.beginPath(); g.moveTo(-sw * 0.2, shY); g.lineTo(sw * 0.12, shY + torsoH * 0.55); g.lineTo(sw * 0.3, shY); g.stroke();
      g.fillStyle = acc; g.fillRect(-sw / 2 + 1, hipY - 7, sw - 2, 7);
    }
    if (has('ninja')) { g.strokeStyle = acc; g.lineWidth = 4; g.beginPath(); g.moveTo(-sw * 0.45, shY + 4); g.lineTo(sw * 0.45, hipY - 2); g.stroke(); }
    if (has('witch')) { g.fillStyle = acc; g.fillRect(-sw / 2 + 2, hipY - 5, sw - 4, 4); }
    if (has('flame')) {
      g.save(); rrect(g, -sw / 2, shY - 2, sw, hipY - shY + 8, Math.min(12, sw * 0.3)); g.clip();
      for (let i = 0; i < 4; i++) {
        const fx0 = -sw / 2 + (i + 0.5) * sw / 4, fh = torsoH * (0.45 + 0.2 * Math.sin(t * 0.25 + i * 1.7));
        const gr = g.createLinearGradient(0, hipY + 6, 0, hipY - fh); gr.addColorStop(0, '#ffd35c'); gr.addColorStop(0.5, acc); gr.addColorStop(1, 'rgba(255,60,0,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(fx0 - sw * 0.14, hipY + 6); g.quadraticCurveTo(fx0 - sw * 0.1, hipY - fh * 0.5, fx0, hipY - fh); g.quadraticCurveTo(fx0 + sw * 0.1, hipY - fh * 0.5, fx0 + sw * 0.14, hipY + 6); g.fill();
      }
      g.restore();
      g.strokeStyle = shade(acc, -0.3); g.lineWidth = 3; g.beginPath(); g.moveTo(sw * 0.05, shY); g.lineTo(sw * 0.05, hipY); g.stroke();
      g.fillStyle = '#1a1010'; g.fillRect(-sw / 2 + 1, hipY - 6, sw - 2, 6);
    }
    if (has('storm')) {
      g.save(); g.shadowColor = acc; g.shadowBlur = 8; g.fillStyle = acc;
      const cx0 = sw * 0.05, cy0 = shY + torsoH * 0.2, u = torsoH * 0.13;
      g.beginPath(); g.moveTo(cx0 + u * 0.6, cy0); g.lineTo(cx0 - u * 0.8, cy0 + u * 2.2); g.lineTo(cx0 + u * 0.1, cy0 + u * 2.2); g.lineTo(cx0 - u * 0.5, cy0 + u * 4.2); g.lineTo(cx0 + u * 1.1, cy0 + u * 1.6); g.lineTo(cx0 + u * 0.2, cy0 + u * 1.6); g.closePath(); g.fill(); g.restore();
      g.fillStyle = shade(body, 0.2); g.fillRect(-sw / 2 + 1, hipY - 5, sw - 2, 5);
    }
    if (has('thunder')) {
      const mt = L.metal || '#c08a3e';
      g.strokeStyle = shade(body, -0.25); g.lineWidth = 1.2;
      for (let yy = shY + 6; yy < hipY; yy += 6) { g.beginPath(); for (let xx = -sw / 2 + 3; xx < sw / 2; xx += 6) g.arc(xx, yy, 2.4, 0, Math.PI); g.stroke(); }
      [[-0.22, 0.3], [0.26, 0.3]].forEach(([px0, py0]) => { circle(g, sw * px0, shY + torsoH * py0, sw * 0.17); fillStroke(g, mt, 2.5); g.save(); g.shadowColor = acc; g.shadowBlur = 8; g.fillStyle = acc; circle(g, sw * px0, shY + torsoH * py0, sw * 0.06); g.fill(); g.restore(); });
      g.fillStyle = '#3a2a1a'; g.fillRect(-sw / 2 + 1, hipY - 9, sw - 2, 9);
      rrect(g, -sw * 0.14, hipY - 11, sw * 0.28, 13, 3); fillStroke(g, mt, 2);
    }
    if (has('archer')) {
      g.strokeStyle = '#5a3b22'; g.lineWidth = 4; g.beginPath(); g.moveTo(sw * 0.4, shY + 2); g.lineTo(-sw * 0.4, hipY - 6); g.stroke();
      g.fillStyle = '#3d2814'; g.fillRect(-sw / 2 + 1, hipY - 7, sw - 2, 7); g.fillStyle = '#d9b25a'; g.fillRect(-4, hipY - 7, 8, 7);
      g.fillStyle = shade(body, 0.12); g.beginPath(); g.moveTo(-sw / 2, shY); g.lineTo(sw / 2, shY); g.lineTo(0, shY + torsoH * 0.3); g.closePath(); g.fill();
    }
    if (has('bird')) {
      g.beginPath(); g.ellipse(sw * 0.1, shY + torsoH * 0.6, sw * 0.3, torsoH * 0.45, 0, 0, Math.PI * 2); g.fillStyle = L.belly || '#e9f5d0'; g.fill();
      g.strokeStyle = shade(L.belly || '#e9f5d0', -0.15); g.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(sw * 0.1, shY + torsoH * (0.4 + i * 0.2), sw * 0.18, 0.3, Math.PI - 0.3); g.stroke(); }
    }
    if (has('reaper')) {
      g.strokeStyle = acc; g.lineWidth = 3; g.beginPath(); g.moveTo(-sw * 0.35, shY + 2); g.lineTo(sw * 0.1, hipY - 4); g.stroke();
      g.fillStyle = '#e8e2ff'; circle(g, -sw * 0.05, shY + torsoH * 0.35, sw * 0.1); g.fill();
      g.fillStyle = OUTLINE; circle(g, -sw * 0.09, shY + torsoH * 0.33, sw * 0.03); g.fill(); circle(g, -sw * 0.01, shY + torsoH * 0.33, sw * 0.03); g.fill();
    }
  }
  if (has('ape')) { circle(g, -sw * 0.36, shY + 6, limbW * 0.95); fillStroke(g, body); circle(g, sw * 0.36, shY + 6, limbW * 0.95); fillStroke(g, body); }
  if (K) lookHook(g, 'torso', K);
  // skirts
  if (has('reaper')) {
    const sway = f.pose === 'run' ? Math.sin(t * 0.35) * 5 : Math.sin(t * 0.08) * 2;
    g.beginPath(); g.moveTo(-sw * 0.5, hipY - 4); g.lineTo(sw * 0.5, hipY - 4);
    g.lineTo(sw * 0.75 + sway, hipY + legL * 0.9);
    for (let i = 0; i <= 6; i++) g.lineTo(sw * 0.75 - i * sw * 0.25 + sway, hipY + legL * (i % 2 ? 0.78 : 0.95));
    g.closePath(); fillStroke(g, body);
    g.strokeStyle = hexA(acc, 0.8); g.lineWidth = 2; g.beginPath(); g.moveTo(-sw * 0.72 + sway, hipY + legL * 0.86); g.lineTo(sw * 0.72 + sway, hipY + legL * 0.86); g.stroke();
  }
  if (has('robe') || has('witch')) {
    const long = has('witch') ? 0.92 : 0.7;
    const sway = f.pose === 'run' ? Math.sin(t * 0.35) * 4 : 0;
    g.beginPath(); g.moveTo(-sw * 0.5, hipY - 4); g.lineTo(sw * 0.5, hipY - 4);
    g.lineTo(sw * 0.7 + sway, hipY + legL * long); g.lineTo(-sw * 0.7 + sway, hipY + legL * long); g.closePath();
    fillStroke(g, body);
    g.fillStyle = acc; g.fillRect(-sw * 0.7 + sway + 2, hipY + legL * long - 5, sw * 1.4 - 4, 4);
  }

  // head
  if (has('robot')) {
    rrect(g, hx - hr * 1.05, hy - hr * 0.95, hr * 2.1, hr * 1.85, hr * 0.5); fillStroke(g, shade(body, 0.12));
    g.save(); g.shadowColor = acc; g.shadowBlur = 10;
    rrect(g, hx - hr * 0.2, hy - hr * 0.4, hr * 1.1, hr * 0.5, 3); g.fillStyle = acc; g.fill(); g.restore();
    g.strokeStyle = OUTLINE; g.lineWidth = 3; g.beginPath(); g.moveTo(hx - hr * 0.3, hy - hr * 0.95); g.lineTo(hx - hr * 0.5, hy - hr * 1.6); g.stroke();
    circle(g, hx - hr * 0.5, hy - hr * 1.65, 3.5); g.fillStyle = (t >> 4) & 1 ? acc : '#fff5c2'; g.fill();
  } else if (has('ape')) {
    circle(g, hx - hr * 0.85, hy - hr * 0.1, hr * 0.32); fillStroke(g, body, 2.5);
    circle(g, hx, hy, hr * 1.02); fillStroke(g, body);
    g.beginPath(); g.ellipse(hx + hr * 0.32, hy + hr * 0.25, hr * 0.68, hr * 0.58, 0, 0, Math.PI * 2); fillStroke(g, skin, 2);
    g.fillStyle = shade(body, -0.35); rrect(g, hx - hr * 0.2, hy - hr * 0.42, hr * 1.1, hr * 0.26, 4); g.fill();
    g.fillStyle = '#fff'; circle(g, hx + hr * 0.2, hy - hr * 0.1, hr * 0.13); g.fill(); circle(g, hx + hr * 0.6, hy - hr * 0.1, hr * 0.13); g.fill();
    g.fillStyle = OUTLINE; circle(g, hx + hr * 0.24, hy - hr * 0.1, hr * 0.07); g.fill(); circle(g, hx + hr * 0.64, hy - hr * 0.1, hr * 0.07); g.fill();
    circle(g, hx + hr * 0.5, hy + hr * 0.2, hr * 0.06); g.fill(); circle(g, hx + hr * 0.72, hy + hr * 0.2, hr * 0.06); g.fill();
    g.strokeStyle = OUTLINE; g.lineWidth = 2; g.beginPath(); g.moveTo(hx + hr * 0.15, hy + hr * 0.52); g.lineTo(hx + hr * 0.85, hy + hr * 0.48); g.stroke();
  } else if (has('bird')) {
    for (let i = 0; i < 3; i++) {
      g.save(); g.translate(hx - hr * 0.3, hy - hr * 0.8); g.rotate(-1.9 + i * 0.35 + Math.sin(t * 0.1 + i) * 0.08);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(hr * 0.3, hr * 0.7, 0, hr * (1.4 - i * 0.15)); g.quadraticCurveTo(-hr * 0.3, hr * 0.7, 0, 0);
      fillStroke(g, i === 1 ? acc : (L.hair || '#8be06a'), 2); g.restore();
    }
    circle(g, hx, hy, hr * 1.02); fillStroke(g, body);
    g.beginPath(); g.ellipse(hx + hr * 0.35, hy + hr * 0.25, hr * 0.5, hr * 0.45, 0, 0, Math.PI * 2); g.fillStyle = L.belly || '#e9f5d0'; g.fill();
    g.beginPath(); g.moveTo(hx + hr * 0.7, hy - hr * 0.2); g.quadraticCurveTo(hx + hr * 1.9, hy - hr * 0.05, hx + hr * 1.75, hy + hr * 0.45);
    g.quadraticCurveTo(hx + hr * 1.3, hy + hr * 0.25, hx + hr * 0.7, hy + hr * 0.3); g.closePath(); fillStroke(g, skin, 2.5);
    g.strokeStyle = shade(skin, -0.35); g.lineWidth = 1.5; g.beginPath(); g.moveTo(hx + hr * 0.75, hy + hr * 0.1); g.lineTo(hx + hr * 1.55, hy + hr * 0.2); g.stroke();
    circle(g, hx + hr * 0.4, hy - hr * 0.2, hr * 0.24); g.fillStyle = acc; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
    g.fillStyle = OUTLINE; circle(g, hx + hr * 0.46, hy - hr * 0.2, hr * 0.11); g.fill();
    g.fillStyle = '#fff'; circle(g, hx + hr * 0.5, hy - hr * 0.26, hr * 0.04); g.fill();
    g.strokeStyle = shade(body, -0.4); g.lineWidth = 3; g.beginPath(); g.moveTo(hx + hr * 0.1, hy - hr * 0.5); g.lineTo(hx + hr * 0.7, hy - hr * 0.42); g.stroke();
  } else if (has('reaper')) {
    g.beginPath(); g.moveTo(hx - hr * 1.15, hy + hr * 0.9); g.quadraticCurveTo(hx - hr * 1.4, hy - hr * 1.3, hx - hr * 0.2, hy - hr * 1.35);
    g.quadraticCurveTo(hx + hr * 1.1, hy - hr * 1.2, hx + hr * 1.2, hy + hr * 0.2); g.lineTo(hx + hr * 0.9, hy + hr * 1.0); g.closePath();
    fillStroke(g, shade(body, 0.12));
    g.beginPath(); g.ellipse(hx + hr * 0.35, hy + hr * 0.05, hr * 0.62, hr * 0.78, 0, 0, Math.PI * 2); g.fillStyle = '#05030c'; g.fill();
    g.save(); g.shadowColor = acc; g.shadowBlur = 12; g.fillStyle = '#e2c9ff';
    g.beginPath(); g.ellipse(hx + hr * 0.18, hy - hr * 0.05, hr * 0.12, hr * 0.07, 0.2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(hx + hr * 0.6, hy - hr * 0.05, hr * 0.12, hr * 0.07, -0.2, 0, Math.PI * 2); g.fill(); g.restore();
  } else if (has('knight')) {
    circle(g, hx, hy, hr); fillStroke(g, '#d6dde9');
    g.fillStyle = OUTLINE; g.fillRect(hx + hr * 0.05, hy - hr * 0.15, hr * 0.95, hr * 0.18);
    g.strokeStyle = acc; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx - hr * 0.2, hy - hr * 0.9);
    g.quadraticCurveTo(hx - hr * 1.2, hy - hr * 1.6, hx - hr * 1.8 + Math.sin(t * 0.15) * 3, hy - hr * 0.6); g.stroke();
  } else {
    circle(g, hx, hy, hr); fillStroke(g, has('ninja') ? body : skin);
    if (has('ninja')) {
      rrect(g, hx - hr * 0.05, hy - hr * 0.4, hr * 1.02, hr * 0.42, 4); g.fillStyle = skin; g.fill();
      g.fillStyle = OUTLINE; g.fillRect(hx + hr * 0.3, hy - hr * 0.28, hr * 0.14, hr * 0.2); g.fillRect(hx + hr * 0.68, hy - hr * 0.28, hr * 0.14, hr * 0.2);
      g.fillStyle = acc; g.fillRect(hx - hr, hy - hr * 0.72, hr * 2, hr * 0.22);
      g.strokeStyle = acc; g.lineWidth = 3; g.beginPath(); g.moveTo(hx - hr, hy - hr * 0.6); g.lineTo(hx - hr * 1.7, hy - hr * 0.4 + Math.sin(t * 0.3) * 4); g.stroke();
    } else {
      if (L.hair && !has('witch') && !has('flame') && !has('storm') && !has('thunder') && !has('archer')) { g.beginPath(); g.arc(hx, hy, hr, Math.PI * 0.85, Math.PI * 1.75); g.lineTo(hx - hr * 0.1, hy - hr * 0.2); g.closePath(); g.fillStyle = L.hair; g.fill(); }
      if (has('witch')) { g.beginPath(); g.arc(hx, hy, hr, Math.PI * 1.0, Math.PI * 1.9); g.quadraticCurveTo(hx + hr * 0.4, hy - hr * 0.3, hx - hr * 0.6, hy - hr * 0.1); g.closePath(); g.fillStyle = L.hair || '#fff'; g.fill(); }
      if (has('topknot')) {
        circle(g, hx - hr * 0.35, hy - hr * 1.05, hr * 0.38); fillStroke(g, L.hair || '#fff', 2.5);
        g.fillStyle = acc; g.fillRect(hx - hr * 0.55, hy - hr * 0.8, hr * 0.42, hr * 0.14);
      }
      if (has('beard')) {
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(hx + hr * 0.15, hy - hr * 0.3); g.lineTo(hx + hr * 0.5, hy - hr * 0.38); g.moveTo(hx + hr * 0.6, hy - hr * 0.38); g.lineTo(hx + hr * 0.92, hy - hr * 0.3); g.stroke();
        g.strokeStyle = OUTLINE; g.lineWidth = 2; g.beginPath(); g.moveTo(hx + hr * 0.25, hy - hr * 0.1); g.lineTo(hx + hr * 0.45, hy - hr * 0.1); g.moveTo(hx + hr * 0.65, hy - hr * 0.1); g.lineTo(hx + hr * 0.85, hy - hr * 0.1); g.stroke();
        const sw2 = Math.sin(t * 0.09) * 2;
        g.beginPath(); g.moveTo(hx - hr * 0.05, hy + hr * 0.3); g.lineTo(hx + hr * 0.95, hy + hr * 0.25);
        g.lineTo(hx + hr * 0.45 + sw2, hy + hr * 2.1); g.closePath(); fillStroke(g, '#f7f7f2', 2);
        g.strokeStyle = '#f7f7f2'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(hx + hr * 0.55, hy + hr * 0.2); g.quadraticCurveTo(hx + hr * 1.25, hy + hr * 0.3, hx + hr * 1.2, hy + hr * 0.9); g.stroke();
      } else if (has('storm')) {
        g.save(); g.shadowColor = acc; g.shadowBlur = 10; g.fillStyle = '#fffbd0';
        g.beginPath(); g.moveTo(hx + hr * 0.15, hy - hr * 0.2); g.lineTo(hx + hr * 0.48, hy - hr * 0.12); g.lineTo(hx + hr * 0.2, hy - hr * 0.02); g.fill();
        g.beginPath(); g.moveTo(hx + hr * 0.58, hy - hr * 0.12); g.lineTo(hx + hr * 0.92, hy - hr * 0.2); g.lineTo(hx + hr * 0.88, hy - hr * 0.02); g.fill(); g.restore();
      } else {
        if (!has('thunder')) { g.fillStyle = OUTLINE; circle(g, hx + hr * 0.3, hy - hr * 0.1, hr * 0.12); g.fill(); circle(g, hx + hr * 0.7, hy - hr * 0.1, hr * 0.12); g.fill(); }
        g.fillStyle = has('thunder') ? 'rgba(0,0,0,0)' : has('flame') ? '#ffb02e' : has('archer') ? '#9bd46a' : '#fff'; circle(g, hx + hr * 0.34, hy - hr * 0.15, hr * 0.045); g.fill(); circle(g, hx + hr * 0.74, hy - hr * 0.15, hr * 0.045); g.fill();
      }
      if (has('flame')) {
        g.save(); g.globalCompositeOperation = portrait ? 'source-over' : 'lighter';
        for (let i = 0; i < 6; i++) {
          const bx = hx - hr * 0.95 + i * hr * 0.36, fl = hr * (1.1 + 0.35 * Math.sin(t * 0.3 + i * 1.9)) * (i === 2 || i === 3 ? 1.25 : 1);
          const tip = bx - hr * 0.45 + Math.sin(t * 0.2 + i) * hr * 0.12;
          const gr = g.createLinearGradient(0, hy - hr * 0.3, 0, hy - hr * 0.3 - fl); gr.addColorStop(0, L.hair || '#ffb02e'); gr.addColorStop(0.55, acc); gr.addColorStop(1, 'rgba(255,40,0,0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(bx - hr * 0.26, hy - hr * 0.2); g.quadraticCurveTo(bx - hr * 0.3, hy - hr * 0.3 - fl * 0.5, tip, hy - hr * 0.3 - fl); g.quadraticCurveTo(bx + hr * 0.3, hy - hr * 0.3 - fl * 0.4, bx + hr * 0.26, hy - hr * 0.2); g.fill();
        }
        g.restore();
        g.beginPath(); g.arc(hx, hy, hr, Math.PI * 0.95, Math.PI * 1.9); g.lineTo(hx - hr * 0.2, hy - hr * 0.3); g.closePath(); g.fillStyle = shade(L.hair || '#ffb02e', -0.15); g.fill();
      }
      if (has('thunder')) {
        const mt = L.metal || '#c08a3e', hc = L.hair || '#eef2f5';
        g.beginPath(); g.arc(hx, hy, hr * 1.02, Math.PI * 0.8, Math.PI * 1.95); g.quadraticCurveTo(hx - hr * 0.2, hy - hr * 0.5, hx - hr * 0.9, hy + hr * 0.2); g.closePath(); fillStroke(g, hc, 2);
        g.beginPath(); g.moveTo(hx - hr * 0.95, hy - hr * 0.1); g.quadraticCurveTo(hx - hr * 1.7, hy + hr * 1.0, hx - hr * 1.35, hy + hr * 2.0); g.lineTo(hx - hr * 0.7, hy + hr * 0.6); g.closePath(); fillStroke(g, hc, 2);
        g.beginPath(); g.moveTo(hx - hr * 0.35, hy + hr * 0.15); g.lineTo(hx + hr * 1.05, hy + hr * 0.05); g.lineTo(hx + hr * 0.95, hy + hr * 1.3); g.lineTo(hx + hr * 0.25, hy + hr * 1.35); g.closePath(); fillStroke(g, hc, 2);
        [0.45, 0.8].forEach((bx, i) => {
          const sw3 = Math.sin(t * 0.09 + i) * 1.5;
          g.beginPath(); g.moveTo(hx + hr * (bx - 0.14), hy + hr * 1.25); g.lineTo(hx + hr * (bx + 0.14), hy + hr * 1.25); g.lineTo(hx + hr * bx + sw3, hy + hr * 2.3); g.closePath(); fillStroke(g, hc, 2);
          rrect(g, hx + hr * (bx - 0.16) + sw3 * 0.5, hy + hr * 1.6, hr * 0.32, hr * 0.2, 2); fillStroke(g, mt, 1.5);
        });
        g.strokeStyle = shade(hc, -0.2); g.lineWidth = 2; g.beginPath(); g.moveTo(hx + hr * 0.2, hy + hr * 0.3); g.quadraticCurveTo(hx + hr * 0.6, hy + hr * 0.5, hx + hr * 0.95, hy + hr * 0.25); g.stroke();
        g.strokeStyle = mt; g.lineWidth = hr * 0.22; g.beginPath(); g.arc(hx, hy + hr * 0.1, hr * 1.0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
        g.save(); g.shadowColor = acc; g.shadowBlur = 12; g.fillStyle = acc;
        g.beginPath(); g.moveTo(hx + hr * 0.1, hy - hr * 1.05); g.lineTo(hx + hr * 0.25, hy - hr * 0.8); g.lineTo(hx + hr * 0.1, hy - hr * 0.55); g.lineTo(hx - hr * 0.05, hy - hr * 0.8); g.closePath(); g.fill();
        g.fillStyle = '#dffaff'; circle(g, hx + hr * 0.3, hy - hr * 0.12, hr * 0.09); g.fill(); circle(g, hx + hr * 0.72, hy - hr * 0.12, hr * 0.09); g.fill(); g.restore();
      }
      if (has('archer')) {
        g.beginPath(); g.arc(hx, hy, hr * 1.02, Math.PI * 0.85, Math.PI * 1.7); g.lineTo(hx + hr * 0.1, hy - hr * 0.35); g.closePath(); g.fillStyle = L.hair || '#7a3f1d'; g.fill();
        g.beginPath(); g.moveTo(hx - hr * 1.1, hy - hr * 0.45); g.quadraticCurveTo(hx - hr * 0.1, hy - hr * 1.6, hx + hr * 1.15, hy - hr * 0.55);
        g.quadraticCurveTo(hx - hr * 0.2, hy - hr * 0.75, hx - hr * 1.6, hy - hr * 0.1); g.closePath(); fillStroke(g, shade(body, -0.1), 2.5);
        g.save(); g.translate(hx - hr * 0.5, hy - hr * 0.95); g.rotate(-0.9 + Math.sin(t * 0.1) * 0.08);
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(hr * 0.35, -hr * 0.7, 0, -hr * 1.45); g.quadraticCurveTo(-hr * 0.3, -hr * 0.7, 0, 0); fillStroke(g, acc, 2); g.restore();
      }
      if (has('storm')) {
        g.beginPath(); g.moveTo(hx - hr * 1.05, hy + hr * 0.1);
        const spikes = [[-1.5, -0.5], [-0.8, -0.7], [-1.2, -1.4], [-0.3, -1.05], [-0.2, -1.8], [0.3, -1.1], [0.9, -1.55], [0.8, -0.8], [1.35, -0.8], [0.95, -0.35]];
        spikes.forEach(([a2, b2]) => g.lineTo(hx + hr * a2 * 0.95, hy + hr * b2 * 0.95 + (b2 < -1 ? Math.sin(t * 0.2 + a2) * 1.5 : 0)));
        g.lineTo(hx + hr * 0.2, hy - hr * 0.45); g.lineTo(hx - hr * 0.6, hy - hr * 0.2); g.closePath();
        fillStroke(g, L.hair || '#fff38a', 2.5);
      }
      if (has('witch')) {
        g.beginPath(); g.ellipse(hx, hy - hr * 0.72, hr * 1.5, hr * 0.28, -0.08, 0, Math.PI * 2); fillStroke(g, shade(body, -0.3), 2.5);
        g.beginPath(); g.moveTo(hx - hr * 0.8, hy - hr * 0.8); g.lineTo(hx + hr * 0.75, hy - hr * 0.85); g.lineTo(hx - hr * 1.1 + Math.sin(t * 0.08) * 2, hy - hr * 2.6); g.closePath(); fillStroke(g, shade(body, -0.3), 2.5);
        g.fillStyle = acc; g.fillRect(hx - hr * 0.72, hy - hr * 1.08, hr * 1.4, hr * 0.2);
      }
    }
  }

  if (K) lookHook(g, 'head', K);
  // front arm
  const hand = limb(g, sw * 0.26, shY + limbW * 0.4, A.armF, A.elbF, armL * 0.5, armL * 0.5, limbW * (has('robe') ? 1.25 : 1), sleeve, handR, handC);
  if (K) { K.hand = hand; lookHook(g, 'hand', K); }
  if (has('knight')) {
    const r = hand[2], len = H * 0.55;
    const sx = hand[0] + Math.sin(r) * len, sy = hand[1] + Math.cos(r) * len;
    g.lineCap = 'round'; g.strokeStyle = OUTLINE; g.lineWidth = 8; g.beginPath(); g.moveTo(hand[0], hand[1]); g.lineTo(sx, sy); g.stroke();
    g.strokeStyle = '#eef3fb'; g.lineWidth = 4.5; g.stroke();
    g.strokeStyle = '#ffd35c'; g.lineWidth = 5; g.beginPath(); g.moveTo(hand[0] - Math.cos(r) * 8, hand[1] + Math.sin(r) * 8); g.lineTo(hand[0] + Math.cos(r) * 8, hand[1] - Math.sin(r) * 8); g.stroke();
  }
  if (has('archer')) {
    const r = hand[2], ux = Math.sin(r), uy = Math.cos(r), px2 = Math.cos(r), py2 = -Math.sin(r), bl = H * 0.42;
    const draw = f.pose === 'charge' ? 0.35 : f.pose === 'cast' ? 0.12 * (1 - (f.pt || 0)) : 0.05;
    const t1x = hand[0] + px2 * bl, t1y = hand[1] + py2 * bl, t2x = hand[0] - px2 * bl, t2y = hand[1] - py2 * bl;
    g.lineCap = 'round'; g.strokeStyle = OUTLINE; g.lineWidth = 7; g.beginPath(); g.moveTo(t1x, t1y); g.quadraticCurveTo(hand[0] + ux * bl * 0.55, hand[1] + uy * bl * 0.55, t2x, t2y); g.stroke();
    g.strokeStyle = '#8a5a2c'; g.lineWidth = 4; g.stroke();
    const sx2 = hand[0] - ux * bl * draw * 2, sy2 = hand[1] - uy * bl * draw * 2;
    g.strokeStyle = '#f4efe4'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(t1x, t1y); g.lineTo(sx2, sy2); g.lineTo(t2x, t2y); g.stroke();
    if (f.pose === 'charge' && !portrait) {
      g.strokeStyle = '#d9c7a0'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(sx2, sy2); g.lineTo(hand[0] + ux * bl * 0.5, hand[1] + uy * bl * 0.5); g.stroke();
      if ((f.charge || 0) > 0.8) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(230,255,180,.8)'; circle(g, hand[0] + ux * bl * 0.55, hand[1] + uy * bl * 0.55, 6 + Math.sin(t * 0.5) * 2); g.fill(); g.restore(); }
    }
  }
  if (has('thunder')) {
    const r = hand[2], ux = Math.sin(r), uy = Math.cos(r), px2 = Math.cos(r), py2 = -Math.sin(r), hl = H * 0.36, mt = L.metal || '#c08a3e';
    const ex = hand[0] + ux * hl, ey = hand[1] + uy * hl;
    g.lineCap = 'round'; g.strokeStyle = OUTLINE; g.lineWidth = 8; g.beginPath(); g.moveTo(hand[0] - ux * 8, hand[1] - uy * 8); g.lineTo(ex, ey); g.stroke();
    g.strokeStyle = '#5a3b22'; g.lineWidth = 5; g.stroke();
    g.save(); g.translate(ex, ey); g.rotate(-r);
    rrect(g, -H * 0.2, -H * 0.02, H * 0.4, H * 0.2, 4); fillStroke(g, '#8f9aa3', 3);
    g.fillStyle = mt; g.fillRect(-H * 0.2, H * 0.02, H * 0.4, H * 0.035); g.fillRect(-H * 0.2, H * 0.12, H * 0.4, H * 0.035);
    if (!portrait) { g.save(); g.shadowColor = acc; g.shadowBlur = 10; }
    g.strokeStyle = acc; g.lineWidth = 2; g.beginPath(); g.moveTo(-H * 0.05, H * 0.03); g.lineTo(H * 0.02, H * 0.09); g.lineTo(-H * 0.02, H * 0.11); g.lineTo(H * 0.05, H * 0.17); g.stroke();
    if (!portrait) g.restore();
    g.restore();
    if (!portrait && (t % 36) < 5) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#bff6ff'; g.lineWidth = 2;
      g.beginPath(); let lx = ex, ly = ey; g.moveTo(lx, ly); for (let i = 0; i < 4; i++) { lx += (Math.random() - 0.5) * 30; ly += (Math.random() - 0.5) * 30; g.lineTo(lx, ly); } g.stroke(); g.restore();
    }
  }
  if (has('reaper')) {
    const r = hand[2], fwd = H * 0.62, back = H * 0.28;
    const ax = hand[0] - Math.sin(r) * back, ay = hand[1] - Math.cos(r) * back;
    const bx2 = hand[0] + Math.sin(r) * fwd, by2 = hand[1] + Math.cos(r) * fwd;
    g.lineCap = 'round'; g.strokeStyle = OUTLINE; g.lineWidth = 7; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx2, by2); g.stroke();
    g.strokeStyle = '#3a2d52'; g.lineWidth = 4; g.stroke();
    const px2 = Math.cos(r), py2 = -Math.sin(r);
    g.beginPath(); g.moveTo(bx2, by2);
    g.quadraticCurveTo(bx2 + px2 * H * 0.35 - Math.sin(r) * H * 0.05, by2 + py2 * H * 0.35 - Math.cos(r) * H * 0.05, bx2 + px2 * H * 0.5 - Math.sin(r) * H * 0.28, by2 + py2 * H * 0.5 - Math.cos(r) * H * 0.28);
    g.quadraticCurveTo(bx2 + px2 * H * 0.22 - Math.sin(r) * H * 0.02, by2 + py2 * H * 0.22 - Math.cos(r) * H * 0.02, bx2 - Math.sin(r) * H * 0.06, by2 - Math.cos(r) * H * 0.06);
    g.closePath();
    g.save(); if (!portrait) { g.shadowColor = acc; g.shadowBlur = 10; }
    fillStroke(g, '#d9ccf5', 2); g.restore();
  }
  if (has('flame') && !portrait) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const fr = handR * (1.6 + 0.3 * Math.sin(t * 0.4));
    const gl = g.createRadialGradient(hand[0], hand[1], 0, hand[0], hand[1], fr * 1.6);
    gl.addColorStop(0, 'rgba(255,230,140,.8)'); gl.addColorStop(0.5, 'rgba(255,110,20,.45)'); gl.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = gl; circle(g, hand[0], hand[1], fr * 1.6); g.fill(); g.restore();
  }
  if (has('storm') && !portrait && (t % 50) < 6) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#fff6a0'; g.lineWidth = 2;
    g.beginPath(); let lx = -sw * 0.4, ly = shY - 4; g.moveTo(lx, ly);
    for (let i = 0; i < 5; i++) { lx += sw * 0.2; ly += (i % 2 ? 1 : -1) * 7 + torsoH * 0.12; g.lineTo(lx, ly); }
    g.stroke(); g.restore();
  }
  if ((f.pose === 'cast' || f.pose === 'charge' || f.pose === 'cast2') && !portrait) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const gl = g.createRadialGradient(hand[0], hand[1], 0, hand[0], hand[1], 18 + (f.charge || 0) * 16);
    gl.addColorStop(0, 'rgba(255,255,255,.9)'); gl.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = gl; circle(g, hand[0], hand[1], 20 + (f.charge || 0) * 16); g.fill(); g.restore();
  }
  g.restore();
}

/* overlays that should not be mirrored */
function drawFighterFx(g, f, t) {
  const cx = f.x, cy = f.y - f.H * 0.5;
  if (f.flyT > 0 && f.pose === 'fly' || (f.flyT > 0)) {
    const fx = f.flyFx || 'cloud';
    if (fx === 'cloud') {
      g.fillStyle = 'rgba(255,248,230,.92)';
      for (let i = -2; i <= 2; i++) { circle(g, f.x + i * 13, f.y + 6 + Math.sin(t * 0.2 + i) * 2, 14 - Math.abs(i) * 2); g.fill(); }
      g.fillStyle = 'rgba(255,211,92,.55)'; circle(g, f.x, f.y + 4, 8); g.fill();
    } else if (fx === 'birdwings') {
      const flap = Math.sin(t * 0.3), sy0 = f.y - f.H * 0.68, col = f.c.look.body, tip = f.c.look.accent;
      [-1, 1].forEach(side => {
        g.save(); g.translate(f.x - f.face * 4, sy0); g.scale(side, 1); g.rotate(-0.25 - flap * 0.45);
        for (let i = 0; i < 6; i++) {
          const len = f.W * (1.1 + i * 0.18), a3 = -0.5 + i * 0.2;
          g.save(); g.rotate(a3);
          g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -10, len, 0); g.quadraticCurveTo(len * 0.5, 9, 0, 0);
          g.fillStyle = i > 3 ? tip : shade(col, 0.08 * i); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.5; g.stroke(); g.restore();
        }
        g.restore();
      });
      if ((t % 12) === 0 && typeof spawnFx === 'function') spawnFx({ k: 'leaf', x: f.x + (Math.random() - 0.5) * f.W * 2, y: f.y - f.H * 0.5, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random(), life: 40, col: Math.random() < 0.5 ? '#8be06a' : '#3fcf7a', size: 5 });
    } else if (fx === 'wings') {
      const flap = Math.sin(t * 0.25) * 0.35, sy0 = f.y - f.H * 0.7;
      g.save(); g.globalCompositeOperation = 'lighter';
      [-1, 1].forEach(side => {
        g.save(); g.translate(f.x - f.face * 6, sy0); g.scale(side, 1); g.rotate(-0.3 + flap);
        const wg = g.createLinearGradient(0, 0, f.W * 1.6, 0); wg.addColorStop(0, 'rgba(163,92,255,.75)'); wg.addColorStop(1, 'rgba(60,20,120,0)');
        g.fillStyle = wg; g.beginPath(); g.moveTo(0, 0);
        g.quadraticCurveTo(f.W * 0.8, -f.H * 0.55, f.W * 1.7, -f.H * 0.35);
        for (let i = 0; i < 4; i++) g.lineTo(f.W * (1.5 - i * 0.35), f.H * (0.05 + (i % 2) * 0.18));
        g.closePath(); g.fill(); g.restore();
      });
      g.restore();
    } else if (fx === 'jet') {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const x = f.x - f.face * (6 + i * 12), l = 20 + Math.random() * 14;
        const gr = g.createLinearGradient(x, f.y - f.H * 0.45, x, f.y - f.H * 0.45 + l + 20);
        gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.4, '#ff8a1f'); gr.addColorStop(1, 'rgba(255,60,0,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - 6, f.y - f.H * 0.45); g.lineTo(x + 6, f.y - f.H * 0.45); g.lineTo(x, f.y - f.H * 0.45 + l + 20); g.fill();
      }
      g.restore();
    } else if (typeof FLY_NEW !== 'undefined' && FLY_NEW[fx]) {
      g.save(); FLY_NEW[fx](g, f, t); g.restore();
    } else {
      g.fillStyle = 'rgba(210,245,255,.8)';
      for (let i = 0; i < 6; i++) { const a = t * 0.05 + i; circle(g, f.x + Math.cos(a * 1.7) * 26, f.y - 4 + ((t * 1.2 + i * 9) % 30), 2.5); g.fill(); }
    }
  }
  if (f.shielding) {
    const k = clamp(f.shieldHP / (f.ph ? f.ph.shieldMax : 100), 0.15, 1);
    const r = Math.max(f.W, f.H) * 0.62 * (0.45 + 0.55 * k);
    const gr = g.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, hexA(f.color, 0.55));
    g.fillStyle = gr; circle(g, cx, cy, r); g.fill();
    g.strokeStyle = hexA('#ffffff', 0.7); g.lineWidth = 2; g.stroke();
  }
  if (f.burn > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const bx = f.x + (i - 1.5) * f.W * 0.28, fl = f.H * (0.28 + 0.12 * Math.sin(t * 0.35 + i * 2));
      const by = f.y - f.H * (0.25 + (i % 2) * 0.3);
      const gr = g.createLinearGradient(0, by, 0, by - fl); gr.addColorStop(0, 'rgba(255,200,80,.85)'); gr.addColorStop(1, 'rgba(255,50,0,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(bx - 8, by); g.quadraticCurveTo(bx - 6, by - fl * 0.6, bx + Math.sin(t * 0.3 + i) * 4, by - fl); g.quadraticCurveTo(bx + 6, by - fl * 0.5, bx + 8, by); g.fill();
    }
    g.restore();
  }
  if (typeof drawStatusNew === 'function') drawStatusNew(g, f, t);
  if (f.frozen > 0) {
    rrect(g, f.x - f.W * 0.62, f.y - f.H * 1.05, f.W * 1.24, f.H * 1.08, 8);
    g.fillStyle = 'rgba(170,235,255,.45)'; g.fill(); g.strokeStyle = 'rgba(230,250,255,.9)'; g.lineWidth = 2.5; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(f.x - f.W * 0.4, f.y - f.H * 0.9); g.lineTo(f.x - f.W * 0.1, f.y - f.H * 0.6); g.stroke();
  }
  if (f.pose === 'counter') {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(255,215,110,${0.5 + 0.3 * Math.sin(t * 0.5)})`; g.lineWidth = 4;
    circle(g, cx, cy, f.H * 0.62); g.stroke(); g.restore();
  }
  if (f.pose === 'guard') {
    const x = f.x + f.face * f.W * 0.75;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(160,210,255,.35)'; g.strokeStyle = 'rgba(220,240,255,.95)'; g.lineWidth = 3;
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.lineTo(x + Math.cos(a) * f.W * 0.35, cy + Math.sin(a) * f.H * 0.55); } g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  if (f.armor) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,90,60,.55)'; g.lineWidth = 5;
    rrect(g, f.x - f.W * 0.6, f.y - f.H * 1.05, f.W * 1.2, f.H * 1.08, 14); g.stroke(); g.restore();
  }
  if (f.pose === 'dizzy') {
    g.fillStyle = '#ffe36b';
    for (let i = 0; i < 3; i++) { const a = t * 0.12 + i * 2.1; star(g, f.x + Math.cos(a) * f.W * 0.5, f.y - f.H - 6 + Math.sin(a) * 5, 5); g.fill(); }
  }
  if (f.halo > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.ellipse(f.x, f.y + 4, f.W * 0.9, 9, 0, 0, Math.PI * 2);
    g.fillStyle = hexA(f.color, 0.5); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); g.restore();
  }
  if (f.buffT > 0) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,120,60,${0.4 + 0.2 * Math.sin(t * 0.4)})`; g.lineWidth = 3;
    circle(g, cx, cy, f.H * 0.6); g.stroke(); g.restore();
  }
}

function star(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath();
}
function hexA(hex, a) {
  let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

/* attack swoosh drawn from the active move's hitbox */
function drawSwoosh(g, f, t) {
  if (!f.hot || !f.mv) return;
  const m = f.mv && f.mv.startsWith('sp_') && typeof fSpecials === 'function' ? fSpecials(f)[f.mv.slice(3)] : moveDef(f.c, f.mv);
  if (!m) return;
  const kind = m.kind || 'melee';
  if (m.fx && typeof SWOOSH_NEW !== 'undefined' && SWOOSH_NEW[m.fx]) { g.save(); SWOOSH_NEW[m.fx](g, f, t, m, kind); g.restore(); return; }
  if (kind === 'proj' || kind === 'fly' || kind === 'teleport' && !m.dmg || kind === 'counter') return;
  if (kind === 'reflect' || kind === 'slam' || kind === 'aura') {
    if (kind === 'aura') {
      g.save(); g.globalCompositeOperation = 'lighter';
      const b = hbox(f, m); g.beginPath(); g.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
      if (m.pull) {
        const vx0 = b.x + b.w / 2, vy0 = b.y + b.h / 2;
        const vg = g.createRadialGradient(vx0, vy0, 4, vx0, vy0, b.w / 2); vg.addColorStop(0, 'rgba(20,0,40,.0)'); vg.addColorStop(0.6, 'rgba(120,60,220,.18)'); vg.addColorStop(1, 'rgba(163,92,255,0)');
        g.fillStyle = vg; g.fill();
        g.strokeStyle = 'rgba(200,160,255,.55)'; g.lineWidth = 2;
        for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(vx0, vy0, b.w / 2 * (1 - ((t * 0.02 + i / 3) % 1)), b.h / 2 * (1 - ((t * 0.02 + i / 3) % 1)), 0, 0, Math.PI * 2); g.stroke(); }
      } else { g.fillStyle = 'rgba(170,230,255,.14)'; g.fill(); g.strokeStyle = 'rgba(220,245,255,.45)'; g.lineWidth = 2; g.setLineDash([8, 10]); g.lineDashOffset = -t * 2; g.stroke(); }
      g.restore();
    }
    return;
  }
  const b = hbox(f, m);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  g.save(); g.globalCompositeOperation = 'lighter';
  if (m.fx === 'fire') {
    const n = kind === 'dash' ? 7 : 9;
    for (let i = 0; i < n; i++) {
      const a2 = kind === 'dash' ? 0 : t * 0.45 + i * 0.7;
      const fx0 = kind === 'dash' ? f.x - f.face * (f.W * 0.3 + i * 16) : cx + Math.cos(a2) * b.w * 0.45;
      const fy0 = kind === 'dash' ? f.y - f.H * (0.15 + (i % 3) * 0.28) : cy + Math.sin(a2) * b.h * 0.45;
      const rr = kind === 'dash' ? 18 - i * 1.5 : 14;
      const gr = g.createRadialGradient(fx0, fy0, 0, fx0, fy0, rr);
      gr.addColorStop(0, 'rgba(255,240,170,.9)'); gr.addColorStop(0.5, 'rgba(255,120,20,.6)'); gr.addColorStop(1, 'rgba(255,40,0,0)');
      g.fillStyle = gr; circle(g, fx0, fy0, rr); g.fill();
    }
  } else if (m.fx === 'bolt') {
    g.strokeStyle = '#fff6a0'; g.lineWidth = 3; g.shadowColor = '#ffe14a'; g.shadowBlur = 12;
    for (let k = 0; k < 2; k++) {
      g.beginPath(); let lx = f.x + (Math.random() - 0.5) * f.W, ly = f.y + 30; g.moveTo(lx, ly);
      for (let i = 0; i < 6; i++) { lx += (Math.random() - 0.5) * 24; ly -= f.H * 0.28; g.lineTo(lx, ly); }
      g.stroke();
    }
  } else if (m.fx === 'thunder') {
    g.strokeStyle = 'rgba(47,214,255,.85)'; g.lineWidth = 4; g.shadowColor = '#2fd6ff'; g.shadowBlur = 14;
    for (let k = 0; k < 3; k++) {
      const a0 = t * 0.5 + k * 2.1; g.beginPath();
      for (let i = 0; i <= 8; i++) { const a2 = a0 + i * 0.25, rr = b.w * 0.5 + (Math.random() - 0.5) * 12; const px3 = cx + Math.cos(a2) * rr, py3 = cy + Math.sin(a2) * b.h * 0.5; i ? g.lineTo(px3, py3) : g.moveTo(px3, py3); }
      g.stroke();
    }
  } else if (m.fx === 'feathers') {
    for (let i = 0; i < 6; i++) {
      const fx0 = f.x - f.face * (f.W * 0.4 + i * 18), fy0 = f.y - f.H * (0.25 + (i % 3) * 0.22) + Math.sin(t * 0.4 + i) * 5;
      g.save(); g.translate(fx0, fy0); g.rotate(t * 0.2 + i);
      g.fillStyle = i % 2 ? 'rgba(242,139,44,.8)' : 'rgba(139,224,106,.8)'; g.beginPath(); g.ellipse(0, 0, 9, 3, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const y = f.y - f.H * (0.2 + i * 0.2); g.beginPath(); g.moveTo(f.x - f.face * f.W * 0.5, y); g.quadraticCurveTo(f.x - f.face * f.W * 1.5, y - 10, f.x - f.face * f.W * 2.4, y + 4); g.stroke(); }
  } else if (m.fx === 'rope') {
    g.globalCompositeOperation = 'source-over';
    const topY = f.y - f.H - 260;
    g.strokeStyle = '#d9c7a0'; g.lineWidth = 2; g.beginPath(); g.moveTo(f.x + f.face * 6, f.y - f.H * 0.7);
    g.quadraticCurveTo(f.x + f.face * 20, f.y - f.H - 120, f.x + f.face * 10, topY); g.stroke();
    g.fillStyle = '#c0c6cc'; g.beginPath(); g.moveTo(f.x + f.face * 10, topY - 12); g.lineTo(f.x + f.face * 10 - 6, topY); g.lineTo(f.x + f.face * 10 + 6, topY); g.closePath(); g.fill();
  } else if (m.fx === 'scythe') {
    const R = f.W * 2.6, ox = f.x - f.face * f.W * 0.2, oy = f.y - f.H * 0.55;
    const a0 = f.face > 0 ? -1.3 : Math.PI - 0.5, a1 = f.face > 0 ? 0.5 : Math.PI + 1.3;
    const gr = g.createRadialGradient(ox, oy, R * 0.6, ox, oy, R);
    gr.addColorStop(0, 'rgba(163,92,255,0)'); gr.addColorStop(0.85, 'rgba(190,140,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,.9)');
    g.fillStyle = gr; g.beginPath(); g.arc(ox, oy, R, a0, a1); g.arc(ox, oy, R * 0.6, a1, a0, true); g.closePath(); g.fill();
  } else if (m.fx === 'arc') {
    g.strokeStyle = 'rgba(190,220,255,.8)'; g.lineWidth = 10;
    g.beginPath(); g.arc(f.x, f.y - f.H * 0.55, f.W * 1.9, f.face > 0 ? -1.1 : Math.PI - 0.6, f.face > 0 ? 0.6 : Math.PI + 1.1); g.stroke();
  } else if (m.pose === 'spin' || f.mv === 'nair') {
    g.strokeStyle = hexA(f.color, 0.55); g.lineWidth = 6; g.beginPath();
    g.ellipse(cx, cy, b.w / 2, b.h / 2, 0, t * 0.4, t * 0.4 + 4.2); g.stroke();
  } else if (kind === 'dash') {
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
    for (let i = 0; i < 5; i++) { const y = f.y - f.H * (0.2 + i * 0.16); g.beginPath(); g.moveTo(f.x - f.face * f.W * 0.6, y); g.lineTo(f.x - f.face * (f.W * 0.6 + 30 + (i % 2) * 20), y); g.stroke(); }
  } else {
    const grd = g.createRadialGradient(cx, cy, 2, cx, cy, Math.max(b.w, b.h) * 0.6);
    grd.addColorStop(0, 'rgba(255,255,255,.75)'); grd.addColorStop(0.6, hexA(f.color, 0.35)); grd.addColorStop(1, hexA(f.color, 0));
    g.fillStyle = grd; g.beginPath(); g.ellipse(cx, cy, b.w * 0.6, b.h * 0.6, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

function drawProj(g, p, t) {
  const r = p.size * 0.5, x = p.x, y = p.y, dir = p.dir || Math.sign(p.vx) || 1;
  g.save();
  switch (p.shape) {
    case 'orb': {
      g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.2); gr.addColorStop(0, '#fffbe6'); gr.addColorStop(0.35, p.color); gr.addColorStop(1, 'rgba(255,200,60,0)');
      g.fillStyle = gr; circle(g, x, y, r * 2.2); g.fill();
      g.strokeStyle = 'rgba(255,240,180,.6)'; g.lineWidth = 2; circle(g, x, y, r * (1.2 + 0.2 * Math.sin(t * 0.4))); g.stroke();
      break;
    }
    case 'star': g.translate(x, y); g.rotate(t * 0.6); star(g, 0, 0, r * 1.5); g.fillStyle = p.color; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 2; g.stroke(); break;
    case 'laser': {
      g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      g.strokeStyle = hexA(p.color, 0.6); g.lineWidth = r * 2.4; g.beginPath(); g.moveTo(x - dir * 36, y); g.lineTo(x, y); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = r * 0.8; g.stroke(); break;
    }
    case 'fist': {
      g.globalCompositeOperation = 'lighter';
      const gr = g.createLinearGradient(x - dir * 40, y, x, y); gr.addColorStop(0, 'rgba(255,90,0,0)'); gr.addColorStop(1, 'rgba(255,200,80,.9)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - dir * 44, y); g.lineTo(x, y - r * 0.8); g.lineTo(x, y + r * 0.8); g.fill();
      g.globalCompositeOperation = 'source-over';
      rrect(g, x - r, y - r * 0.8, r * 2, r * 1.6, r * 0.5); fillStroke(g, '#8a95a8'); g.fillStyle = p.color; g.fillRect(x - dir * r - (dir > 0 ? 0 : -4), y - r * 0.8, 4 * dir, r * 1.6);
      break;
    }
    case 'mine': {
      circle(g, x, y, r); fillStroke(g, '#2e3242', 2.5);
      g.fillStyle = p.armed ? ((t >> 3) & 1 ? '#ff3b3b' : '#ffdb3a') : '#777';
      circle(g, x, y - r * 0.2, r * 0.35); g.fill(); break;
    }
    case 'shard': {
      g.translate(x, y); g.rotate(dir > 0 ? 0 : Math.PI);
      g.beginPath(); g.moveTo(r * 1.6, 0); g.lineTo(0, -r * 0.7); g.lineTo(-r * 1.3, 0); g.lineTo(0, r * 0.7); g.closePath();
      g.fillStyle = p.color; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); break;
    }
    case 'spike': {
      const base = y + r * 1.2;
      for (let i = -1; i <= 1; i++) {
        const h = r * (2.2 - Math.abs(i) * 0.7);
        g.beginPath(); g.moveTo(x + i * r * 0.8 - r * 0.45, base); g.lineTo(x + i * r * 0.8, base - h); g.lineTo(x + i * r * 0.8 + r * 0.45, base); g.closePath();
        g.fillStyle = p.color; g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.stroke();
      }
      break;
    }
    case 'fire': {
      g.globalCompositeOperation = 'lighter';
      for (let i = 5; i >= 0; i--) {
        const tx2 = x - dir * i * r * 0.55, ty2 = y + Math.sin(t * 0.5 + i) * r * 0.15, rr = r * (1.25 - i * 0.14);
        const gr = g.createRadialGradient(tx2, ty2, 0, tx2, ty2, rr * 1.6);
        gr.addColorStop(0, i === 0 ? '#fff6d0' : 'rgba(255,200,90,.7)'); gr.addColorStop(0.45, 'rgba(255,110,20,.6)'); gr.addColorStop(1, 'rgba(255,40,0,0)');
        g.fillStyle = gr; circle(g, tx2, ty2, rr * 1.6); g.fill();
      }
      if ((t & 1) && typeof spawnFx === 'function') spawnFx({ k: 'spark', x: x - dir * r, y: y + (Math.random() - 0.5) * r, vx: -dir * (1 + Math.random() * 2), vy: -Math.random() * 2, life: 16, col: Math.random() < 0.5 ? '#ffb02e' : '#ff5a1a', size: 2.5 });
      break;
    }
    case 'bolt': {
      g.globalCompositeOperation = 'lighter'; g.lineJoin = 'miter';
      const L = 70;
      [[7, 'rgba(255,225,74,.35)'], [3, '#fffbd0']].forEach(([w, c]) => {
        g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x - dir * L, y);
        const seed = Math.floor(t / 2);
        for (let i = 1; i <= 6; i++) g.lineTo(x - dir * L + dir * L * i / 6, y + (i === 6 ? 0 : Math.sin(seed * 7.1 + i * 3.3) * 9));
        g.stroke();
      });
      g.fillStyle = '#fff'; circle(g, x, y, r * 0.5); g.fill();
      break;
    }
    case 'strike': {
      g.globalCompositeOperation = 'lighter'; g.lineJoin = 'miter';
      const top = y - 900, seed = Math.floor(t / 2);
      [[26, 'rgba(255,225,74,.18)'], [12, 'rgba(255,240,150,.5)'], [4, '#ffffff']].forEach(([w, c]) => {
        g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x + Math.sin(seed) * 20, top);
        for (let i = 1; i <= 10; i++) g.lineTo(x + (i === 10 ? 0 : Math.sin(seed * 3.7 + i * 2.1) * 22), top + (y - top) * i / 10);
        g.stroke();
      });
      const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.2); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,225,74,0)');
      g.fillStyle = gr; circle(g, x, y, r * 2.2); g.fill();
      break;
    }
    case 'void': {
      const pr = r * (1 + 0.08 * Math.sin(t * 0.3));
      g.save(); g.globalCompositeOperation = 'lighter';
      const halo = g.createRadialGradient(x, y, pr * 0.8, x, y, pr * 3.2); halo.addColorStop(0, 'rgba(163,92,255,.55)'); halo.addColorStop(1, 'rgba(80,20,160,0)');
      g.fillStyle = halo; circle(g, x, y, pr * 3.2); g.fill();
      g.strokeStyle = 'rgba(220,180,255,.8)'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(x, y, pr * 2.1, pr * 0.55, t * 0.03, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 8; i++) { const an = t * 0.12 + i * 0.785, rr = pr * (1.2 + ((t * 0.04 + i * 0.37) % 1) * 1.8); g.fillStyle = 'rgba(230,210,255,.8)'; circle(g, x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.6, 2); g.fill(); }
      g.restore();
      g.fillStyle = '#05020d'; circle(g, x, y, pr); g.fill();
      g.strokeStyle = '#e8d9ff'; g.lineWidth = 2; g.stroke();
      break;
    }
    case 'pillar': {
      g.globalCompositeOperation = 'lighter';
      const base = y + r * 1.2, h = r * 7 * (0.85 + 0.15 * Math.sin(t * 0.6));
      for (let i = 0; i < 3; i++) {
        const w = r * (1.5 - i * 0.4);
        const gr = g.createLinearGradient(0, base, 0, base - h);
        gr.addColorStop(0, i === 2 ? '#fff6d0' : 'rgba(255,190,70,.8)'); gr.addColorStop(0.5, 'rgba(255,100,20,.65)'); gr.addColorStop(1, 'rgba(255,40,0,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, base);
        for (let k = 0; k <= 6; k++) g.lineTo(x - w + (w * 2) * k / 6 + Math.sin(t * 0.5 + k + i) * 4, base - h * (k % 2 ? 0.9 : 1) * (1 - Math.abs(k - 3) / 7));
        g.lineTo(x + w, base); g.closePath(); g.fill();
      }
      if (typeof spawnFx === 'function' && (t % 3 === 0)) spawnFx({ k: 'spark', x: x + (Math.random() - 0.5) * r * 2, y: base - Math.random() * h, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 3, life: 20, col: '#ffb02e', size: 3 });
      break;
    }
    case 'arrow': case 'arrowbomb': {
      const ang = p.ang != null && (p.stuck || p.vx === undefined || (!p.vx && !p.vy)) ? p.ang : (p.vx !== undefined && (p.vx || p.vy) && typeof p.vy === 'number' ? Math.atan2(p.vy, p.vx) : (p.ang || (dir > 0 ? 0 : Math.PI)));
      const L = 18 + r * 1.6;
      g.translate(x, y); g.rotate(ang);
      if (p.charged || p.size > 16) {
        g.save(); g.globalCompositeOperation = 'lighter';
        const tg = g.createLinearGradient(-L * 2.2, 0, 0, 0); tg.addColorStop(0, 'rgba(200,255,150,0)'); tg.addColorStop(1, 'rgba(230,255,190,.8)');
        g.fillStyle = tg; g.fillRect(-L * 2.2, -4, L * 2.2, 8); g.restore();
      }
      g.strokeStyle = '#8a5a2c'; g.lineWidth = 3; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L * 0.6, 0); g.stroke();
      g.fillStyle = '#d8dde2'; g.beginPath(); g.moveTo(L, 0); g.lineTo(L * 0.5, -5); g.lineTo(L * 0.5, 5); g.closePath(); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1; g.stroke();
      g.fillStyle = p.shape === 'arrowbomb' ? '#ffdb3a' : '#b5412b';
      g.beginPath(); g.moveTo(-L, 0); g.lineTo(-L - 7, -6); g.lineTo(-L + 6, 0); g.lineTo(-L - 7, 6); g.closePath(); g.fill();
      if (p.shape === 'arrowbomb') {
        circle(g, L * 0.35, 0, 6); g.fillStyle = p.armed && ((t >> 2) & 1) ? '#ffffff' : '#ff3b2a'; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.5; g.stroke();
        if (p.armed) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,80,40,.35)'; circle(g, L * 0.35, 0, 14 + Math.sin(t * 0.8) * 4); g.fill(); g.restore(); }
      }
      break;
    }
    case 'javelin': {
      g.globalCompositeOperation = 'lighter'; g.lineJoin = 'miter';
      const L = 70, seed = Math.floor(t / 2);
      g.translate(x, y); g.scale(dir, 1);
      [[12, 'rgba(47,214,255,.25)'], [5, 'rgba(159,240,255,.8)'], [2, '#ffffff']].forEach(([w, c]) => {
        g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(-L, 0);
        for (let i = 1; i <= 7; i++) g.lineTo(-L + L * i / 7, Math.sin(seed * 5.3 + i * 2.7) * 4);
        g.lineTo(r * 0.8, 0); g.stroke();
        g.beginPath(); g.moveTo(r * 0.8, 0); g.lineTo(-r * 0.2, -r * 0.55); g.moveTo(r * 0.8, 0); g.lineTo(-r * 0.2, r * 0.55); g.stroke();
      });
      break;
    }
    case 'hammer': {
      g.translate(x, y); g.rotate(t * 0.55 * dir);
      g.save(); g.globalCompositeOperation = 'lighter';
      const hg = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.8); hg.addColorStop(0, 'rgba(159,240,255,.5)'); hg.addColorStop(1, 'rgba(47,214,255,0)');
      g.fillStyle = hg; circle(g, 0, 0, r * 1.8); g.fill(); g.restore();
      g.strokeStyle = OUTLINE; g.lineWidth = 7; g.beginPath(); g.moveTo(0, r * 0.2); g.lineTo(0, r * 1.2); g.stroke();
      g.strokeStyle = '#5a3b22'; g.lineWidth = 4; g.stroke();
      rrect(g, -r * 0.75, -r * 0.4, r * 1.5, r * 0.75, 4); g.fillStyle = '#8f9aa3'; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = '#c08a3e'; g.fillRect(-r * 0.75, -r * 0.3, r * 1.5, r * 0.12); g.fillRect(-r * 0.75, r * 0.15, r * 1.5, r * 0.12);
      g.strokeStyle = '#bff6ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-r * 0.9, 0); g.lineTo(-r * 1.3, -r * 0.4); g.moveTo(r * 0.9, 0); g.lineTo(r * 1.3, r * 0.4); g.stroke();
      break;
    }
    case 'tstrike': {
      g.globalCompositeOperation = 'lighter'; g.lineJoin = 'miter';
      const top = y - 950, seed = Math.floor(t / 2) + Math.round(x);
      [[44, 'rgba(47,214,255,.16)'], [18, 'rgba(120,230,255,.45)'], [6, '#f2feff']].forEach(([w, c]) => {
        g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x, top);
        for (let i = 1; i <= 12; i++) g.lineTo(x + (i === 12 ? 0 : Math.sin(seed * 1.7 + i * 2.3) * 30), top + (y - top) * i / 12);
        g.stroke();
      });
      g.strokeStyle = 'rgba(160,240,255,.6)'; g.lineWidth = 2;
      for (let k = 0; k < 3; k++) { g.beginPath(); let lx = x, ly = y - 200 - k * 150; g.moveTo(lx, ly); for (let i = 0; i < 4; i++) { lx += (k % 2 ? 1 : -1) * 18; ly += 18 + Math.sin(seed + i) * 6; g.lineTo(lx, ly); } g.stroke(); }
      const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.5); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(47,214,255,0)');
      g.fillStyle = gr; circle(g, x, y, r * 2.5); g.fill();
      break;
    }
    case 'leafnado': {
      const base = y + r, top = y - r * 6.6;
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const k = i / 8, yy = base - (base - top) * k, w = r * (0.35 + k * 1.0) + Math.sin(t * 0.3 + i) * 3;
        g.strokeStyle = `rgba(${120 + i * 10},${210 + i * 4},${120 + i * 8},${0.55 - k * 0.25})`; g.lineWidth = 3;
        g.beginPath(); g.ellipse(x + Math.sin(t * 0.15 + k * 3) * r * 0.25, yy, w, w * 0.22, 0, t * 0.4 + i, t * 0.4 + i + 4.4); g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 12; i++) {
        const k = ((i / 12) + t * 0.004) % 1, yy = base - (base - top) * k, a2 = t * 0.25 + i * 1.7, w = r * (0.35 + k * 1.0);
        g.save(); g.translate(x + Math.cos(a2) * w, yy + Math.sin(a2) * w * 0.22); g.rotate(a2 * 1.3);
        g.fillStyle = i % 3 === 0 ? '#e8c24a' : i % 2 ? '#6fd35a' : '#3fa64a'; g.beginPath(); g.ellipse(0, 0, 7, 3.2, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(20,60,20,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.stroke(); g.restore();
      }
      break;
    }
    case 'feather': {
      const ang = p.ang != null && (p.vx === undefined || typeof p.vy !== 'number') ? p.ang : (typeof p.vy === 'number' ? Math.atan2(p.vy, p.vx) : (dir > 0 ? 0 : Math.PI));
      g.translate(x, y); g.rotate(ang + Math.sin(t * 0.6) * 0.15);
      g.beginPath(); g.moveTo(r * 1.4, 0); g.quadraticCurveTo(0, -r * 0.7, -r * 1.3, 0); g.quadraticCurveTo(0, r * 0.7, r * 1.4, 0);
      const fg2 = g.createLinearGradient(-r * 1.3, 0, r * 1.4, 0); fg2.addColorStop(0, '#1f8a5b'); fg2.addColorStop(0.6, '#8be06a'); fg2.addColorStop(1, p.color);
      g.fillStyle = fg2; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.5; g.stroke();
      g.strokeStyle = '#f7f2dc'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-r * 1.5, 0); g.lineTo(r * 1.2, 0); g.stroke();
      break;
    }
    default:
      if (typeof PROJ_NEW !== 'undefined' && PROJ_NEW[p.shape]) PROJ_NEW[p.shape](g, p, t, x, y, r, dir);
      else { circle(g, x, y, r); g.fillStyle = p.color; g.fill(); }
  }
  g.restore();
}

/* small portrait for menus */
function drawPortrait(cv, charId, opts) {
  if (charId === 'random') { drawRandomPortrait(cv); return; }
  const c = CHAR[charId]; if (!c) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const ph = physFor(c);
  const s = (h * 0.8) / (ph.H * 1.25);
  g.save(); g.translate(w / 2, h * 0.92); g.scale(s, s);
  drawFighter(g, { c, W: ph.W, H: ph.H, x: 0, y: 0, face: 1, pose: (opts && opts.pose) || 'idle', pt: 1, inv: 0 }, (opts && opts.t) || 0, true);
  g.restore();
}

function drawRandomPortrait(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const r = Math.min(w, h) * 0.38, cx = w / 2, cy = h * 0.52;
  const gr = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  gr.addColorStop(0, '#ff4d5e'); gr.addColorStop(0.35, '#ffc93c'); gr.addColorStop(0.65, '#4be08a'); gr.addColorStop(1, '#3da5ff');
  g.fillStyle = gr; circle(g, cx, cy, r); g.fill();
  g.lineWidth = 3; g.strokeStyle = OUTLINE; g.stroke();
  g.font = `${Math.round(r * 1.35)}px "Dela Gothic One", Impact, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = Math.max(4, r * 0.14); g.strokeStyle = OUTLINE; g.strokeText('?', cx, cy + r * 0.06);
  g.fillStyle = '#fff'; g.fillText('?', cx, cy + r * 0.06);
}
