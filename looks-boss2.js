'use strict';
/* ===== CLOUDTOP BRAWL — art for Master Chuang (photography) and Mythic Hsi (basketball) =====
   outfits, projectiles, move effects, particles and their ultimate scenes */

/* ---------- Master Chuang: photographer's vest, beret, round glasses, camera ---------- */
const LOOK_PHOTO = {
  back(g, K) {
    // camera bag on the back hip
    const { sw, hipY, torsoH } = K;
    rrect(g, -sw * 0.75, hipY - torsoH * 0.45, sw * 0.42, torsoH * 0.42, 4); fillStroke(g, '#3a2d1e', 2);
    g.fillStyle = '#ffd84a'; g.fillRect(-sw * 0.72, hipY - torsoH * 0.36, sw * 0.36, 3);
  },
  torso(g, K) {
    const { sw, shY, hipY, torsoH, body, acc } = K;
    // shirt down the middle
    g.fillStyle = '#efe6d2'; g.beginPath(); g.moveTo(-sw * 0.16, shY - 2); g.lineTo(sw * 0.2, shY - 2); g.lineTo(sw * 0.14, hipY - 4); g.lineTo(-sw * 0.1, hipY - 4); g.closePath(); g.fill();
    // vest panels with pockets
    for (const side of [-1, 1]) {
      g.beginPath(); g.moveTo(side * sw * 0.18, shY - 2); g.lineTo(side * sw * 0.5, shY + 2); g.lineTo(side * sw * 0.5, hipY); g.lineTo(side * sw * 0.12, hipY); g.closePath();
      fillStroke(g, shade(body, -0.05), 1.8);
      rrect(g, side > 0 ? sw * 0.2 : -sw * 0.44, shY + torsoH * 0.18, sw * 0.24, torsoH * 0.2, 2); fillStroke(g, shade(body, 0.12), 1.4);
      rrect(g, side > 0 ? sw * 0.2 : -sw * 0.44, shY + torsoH * 0.52, sw * 0.24, torsoH * 0.24, 2); fillStroke(g, shade(body, 0.12), 1.4);
    }
    // camera strap across the chest
    g.strokeStyle = '#1d1a16'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(-sw * 0.4, shY + 1); g.lineTo(sw * 0.38, hipY - torsoH * 0.12); g.stroke();
    g.strokeStyle = acc; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-sw * 0.4, shY + 1); g.lineTo(sw * 0.38, hipY - torsoH * 0.12); g.stroke();
    // belt
    g.fillStyle = '#2b241c'; g.fillRect(-sw / 2 + 1, hipY - 5, sw - 2, 5); g.fillStyle = '#c9b27a'; g.fillRect(-3, hipY - 5, 6, 5);
  },
  head(g, K) {
    const { hx, hy, hr } = K;
    // hair at the back + sideburns
    g.fillStyle = K.L.hair || '#2a211b';
    g.beginPath(); g.ellipse(hx - hr * 0.35, hy - hr * 0.05, hr * 0.75, hr * 0.85, 0, Math.PI * 0.5, Math.PI * 1.5); g.fill();
    // round glasses
    g.strokeStyle = '#1b1712'; g.lineWidth = 2;
    circle(g, hx + hr * 0.5, hy - hr * 0.08, hr * 0.25); g.fillStyle = 'rgba(200,235,255,.35)'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(hx + hr * 0.25, hy - hr * 0.1); g.lineTo(hx - hr * 0.3, hy - hr * 0.2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.75)'; circle(g, hx + hr * 0.42, hy - hr * 0.16, hr * 0.06); g.fill();
    // little goatee
    g.fillStyle = K.L.hair || '#2a211b'; g.beginPath(); g.moveTo(hx + hr * 0.45, hy + hr * 0.55); g.lineTo(hx + hr * 0.7, hy + hr * 0.6); g.lineTo(hx + hr * 0.52, hy + hr * 0.92); g.closePath(); g.fill();
    // tilted beret
    g.save(); g.translate(hx - hr * 0.05, hy - hr * 0.72); g.rotate(-0.25);
    g.beginPath(); g.ellipse(0, 0, hr * 1.05, hr * 0.42, 0, 0, Math.PI * 2); fillStroke(g, '#8c1f2b', 2.2);
    g.fillStyle = '#a8303c'; g.beginPath(); g.ellipse(hr * 0.1, -hr * 0.1, hr * 0.7, hr * 0.22, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = OUTLINE; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -hr * 0.38); g.lineTo(hr * 0.06, -hr * 0.6); g.stroke();
    g.restore();
  },
  hand(g, K) {
    const { f, hand, acc, portrait } = K, r = hand[2];
    g.save(); g.translate(hand[0], hand[1]); g.rotate(-r + Math.PI / 2);
    // a compact camera held at the end of the arm; +x points along the forearm
    rrect(g, 0, -9, 22, 16, 3); fillStroke(g, '#24242b', 1.8);
    g.fillStyle = '#3a3a44'; g.fillRect(3, -13, 8, 4);
    g.fillStyle = acc; g.fillRect(14, -12, 6, 3);
    circle(g, 24, -1, 6.5); fillStroke(g, '#15151a', 1.8);
    g.fillStyle = '#6fa8ff'; circle(g, 24, -1, 3.4); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; circle(g, 23, -2.4, 1.2); g.fill();
    const firing = (f.mv === 'sp_neutral' || f.mv === 'sp_down') && (f.pt || 0) > 0.9;
    if (firing && !portrait) {
      g.globalCompositeOperation = 'lighter';
      const fg = g.createRadialGradient(17, -12, 0, 17, -12, 26); fg.addColorStop(0, 'rgba(255,255,255,1)'); fg.addColorStop(0.4, 'rgba(255,240,170,.7)'); fg.addColorStop(1, 'rgba(255,216,74,0)');
      g.fillStyle = fg; circle(g, 17, -12, 26); g.fill();
    }
    g.restore();
  }
};

/* ---------- Mythic Hsi: jersey #7, headband, basketball ---------- */
const LOOK_BALLER = {
  torso(g, K) {
    const { f, sw, shY, hipY, torsoH, body, acc, portrait } = K;
    // tank-top cut: show arms' shoulders, accent trim
    g.strokeStyle = acc; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-sw * 0.2, shY - 3); g.quadraticCurveTo(0, shY + torsoH * 0.18, sw * 0.24, shY - 3); g.stroke();
    g.beginPath(); g.moveTo(-sw * 0.5, shY + 2); g.quadraticCurveTo(-sw * 0.36, shY + torsoH * 0.3, -sw * 0.5, shY + torsoH * 0.42); g.stroke();
    g.beginPath(); g.moveTo(sw * 0.5, shY + 2); g.quadraticCurveTo(sw * 0.36, shY + torsoH * 0.3, sw * 0.5, shY + torsoH * 0.42); g.stroke();
    // side stripes
    g.fillStyle = shade(acc, -0.1); g.fillRect(-sw * 0.5, shY + torsoH * 0.45, 3, torsoH * 0.5); g.fillRect(sw * 0.5 - 3, shY + torsoH * 0.45, 3, torsoH * 0.5);
    // number 7 (kept readable whichever way he faces)
    g.save(); g.translate(sw * 0.02, shY + torsoH * 0.55); g.scale((f.face || 1) < 0 && !portrait ? -1 : 1, 1);
    g.font = `${Math.round(torsoH * 0.52)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.strokeText('7', 0, 0); g.fillStyle = acc; g.fillText('7', 0, 0);
    g.restore();
    // shorts waistband
    g.fillStyle = acc; g.fillRect(-sw / 2 + 1, hipY - 4, sw - 2, 4);
    g.fillStyle = body; g.fillRect(-sw / 2 + 1, hipY - 1, sw - 2, 2);
  },
  head(g, K) {
    const { hx, hy, hr, acc } = K;
    // short fade
    g.fillStyle = K.L.hair || '#1a1410';
    g.beginPath(); g.arc(hx, hy - hr * 0.05, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill();
    // headband
    g.save(); g.beginPath(); g.arc(hx, hy, hr * 1.03, 0, Math.PI * 2); g.clip();
    g.fillStyle = acc; g.fillRect(hx - hr * 1.1, hy - hr * 0.62, hr * 2.2, hr * 0.32);
    g.fillStyle = '#ffffff'; g.fillRect(hx - hr * 1.1, hy - hr * 0.5, hr * 2.2, hr * 0.06);
    g.restore();
    // headband tails
    g.strokeStyle = acc; g.lineWidth = 3; g.lineCap = 'round';
    const w = Math.sin(K.t * 0.25) * 3;
    g.beginPath(); g.moveTo(hx - hr * 0.95, hy - hr * 0.45); g.quadraticCurveTo(hx - hr * 1.5, hy - hr * 0.3 + w, hx - hr * 1.9, hy - hr * 0.1 + w); g.stroke();
    // confident brows
    g.strokeStyle = OUTLINE; g.lineWidth = 2; g.beginPath(); g.moveTo(hx + hr * 0.2, hy - hr * 0.22); g.lineTo(hx + hr * 0.5, hy - hr * 0.28); g.moveTo(hx + hr * 0.62, hy - hr * 0.28); g.lineTo(hx + hr * 0.9, hy - hr * 0.22); g.stroke();
  },
  hand(g, K) {
    const { f, hand, portrait, t } = K;
    const busy = f.act && f.mv !== 'sp_side';
    if (busy || f.mv === 'sp_neutral') return;
    // dribbling when running, palming the ball otherwise
    const running = f.pose === 'run' || f.mv === 'sp_side';
    const r = 9.5, by = running && !portrait ? Math.abs(Math.sin(t * 0.32)) * 26 : 0;
    drawBall(g, hand[0] + 6, hand[1] + 4 + by, r, t * (running ? 0.3 : 0.05));
  }
};
function drawBall(g, x, y, r, rot) {
  g.save(); g.translate(x, y); g.rotate(rot || 0);
  const bg = g.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r); bg.addColorStop(0, '#ffb15c'); bg.addColorStop(1, '#e0650a');
  circle(g, 0, 0, r); fillStroke(g, bg, 1.8);
  g.strokeStyle = '#3a1d06'; g.lineWidth = Math.max(1, r * 0.11);
  g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.moveTo(0, -r); g.lineTo(0, r); g.stroke();
  g.beginPath(); g.arc(-r * 1.25, 0, r * 0.95, -0.85, 0.85); g.stroke();
  g.beginPath(); g.arc(r * 1.25, 0, r * 0.95, Math.PI - 0.85, Math.PI + 0.85); g.stroke();
  g.restore();
}

/* ---------- projectiles ---------- */
Object.assign(PROJ_NEW, {
  flash(g, p, t, x, y, r, dir) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const R = r * 1.6, fg = g.createRadialGradient(x, y, 0, x, y, R);
    fg.addColorStop(0, 'rgba(255,255,255,1)'); fg.addColorStop(0.35, 'rgba(255,246,200,.85)'); fg.addColorStop(1, 'rgba(255,216,74,0)');
    g.fillStyle = fg; circle(g, x, y, R); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + t * 0.1, l = R * (i % 2 ? 0.9 : 1.35); g.beginPath(); g.moveTo(x + Math.cos(a) * R * 0.25, y + Math.sin(a) * R * 0.25); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    g.restore();
  },
  photo(g, p, t, x, y, r, dir) {
    g.translate(x, y); g.rotate(t * 0.35 * dir);
    const w = r * 1.7, h = r * 2.0;
    g.fillStyle = '#ffffff'; rrect(g, -w / 2, -h / 2, w, h, 2); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.6; g.stroke();
    const sg = g.createLinearGradient(0, -h * 0.4, 0, h * 0.2); sg.addColorStop(0, '#6fb7ff'); sg.addColorStop(1, '#ffd2a1');
    g.fillStyle = sg; g.fillRect(-w * 0.4, -h * 0.4, w * 0.8, h * 0.6);
    g.fillStyle = '#ffd84a'; circle(g, w * 0.15, -h * 0.2, r * 0.2); g.fill();
    g.fillStyle = '#4e8a4a'; g.beginPath(); g.moveTo(-w * 0.4, h * 0.2); g.lineTo(-w * 0.1, -h * 0.05); g.lineTo(w * 0.1, h * 0.08); g.lineTo(w * 0.4, -h * 0.1); g.lineTo(w * 0.4, h * 0.2); g.closePath(); g.fill();
  },
  cammine(g, p, t, x, y, r, dir) {
    g.translate(x, y);
    g.strokeStyle = '#2a2a30'; g.lineWidth = 2.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-r * 0.8, r * 0.9); g.moveTo(0, 0); g.lineTo(r * 0.8, r * 0.9); g.moveTo(0, 0); g.lineTo(0, r * 0.95); g.stroke();
    g.scale(p.face || dir || 1, 1);
    rrect(g, -r * 0.8, -r * 0.95, r * 1.5, r * 0.95, 3); fillStroke(g, '#24242b', 1.8);
    circle(g, r * 0.75, -r * 0.48, r * 0.38); fillStroke(g, '#15151a', 1.6);
    g.fillStyle = '#6fa8ff'; circle(g, r * 0.75, -r * 0.48, r * 0.18); g.fill();
    const blink = p.armed && ((t >> 3) & 1);
    g.fillStyle = blink ? '#ff3b3b' : '#5a1a1a'; circle(g, -r * 0.5, -r * 0.75, r * 0.12); g.fill();
    if (blink) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,60,60,.35)'; circle(g, -r * 0.5, -r * 0.75, r * 0.4); g.fill(); }
  },
  ball(g, p, t, x, y, r, dir) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,138,31,.18)';
    for (let i = 1; i <= 3; i++) { circle(g, x - (p.vx || dir * 6) * i * 1.3, y - (p.vy || 0) * i * 1.3, r * (1 - i * 0.18)); g.fill(); }
    g.restore();
    drawBall(g, x, y, r * 0.95, t * 0.25 * dir);
  }
});

/* ---------- move effects ---------- */
Object.assign(SWOOSH_NEW, {
  tripod(g, f, t) {
    // vaulting off the tripod: three legs planted under him for the first part of the leap
    const a = f.act; if (!a || a.t > 18) return;
    const k = a.t / 18, baseY = f.y + 10 + k * 60, x = f.x - (f.face || 1) * 6;
    g.globalAlpha = 1 - k * 0.6; g.strokeStyle = '#2a2a30'; g.lineWidth = 3.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, f.y - 4); g.lineTo(x - 22, baseY); g.moveTo(x, f.y - 4); g.lineTo(x + 22, baseY); g.moveTo(x, f.y - 4); g.lineTo(x + 2, baseY + 4); g.stroke();
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,216,74,.4)'; circle(g, f.x, f.y - f.H * 0.5, f.W * (0.7 + k * 0.4)); g.fill();
  },
  dribble(g, f, t) {
    const dir = f.face || 1;
    drawBall(g, f.x + dir * f.W * 0.7, f.y - 10 - Math.abs(Math.sin(t * 0.55)) * f.H * 0.35, 9.5, t * 0.4 * dir);
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,170,90,.6)'; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const y = f.y - f.H * (0.2 + i * 0.18); g.beginPath(); g.moveTo(f.x - dir * f.W * 0.6, y); g.lineTo(f.x - dir * (f.W * 0.6 + 26 + (i % 2) * 14), y); g.stroke(); }
  },
  dunk(g, f, t) {
    const dir = f.face || 1;
    g.globalCompositeOperation = 'lighter';
    const tg = g.createLinearGradient(0, f.y + 60, 0, f.y - f.H); tg.addColorStop(0, 'rgba(255,138,31,0)'); tg.addColorStop(1, 'rgba(255,190,110,.6)');
    g.fillStyle = tg; g.beginPath(); g.ellipse(f.x, f.y - f.H * 0.2, f.W * 0.55, f.H * 0.9, 0, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
    drawBall(g, f.x + dir * f.W * 0.25, f.y - f.H * 1.12, 10, t * 0.3);
  }
});

/* ---------- particles ---------- */
function fxEventBoss2(type, x, y, a, b) {
  switch (type) {
    case 'dazzle':
      spawnFx({ k: 'flash', life: 5, a: 0.25, col: '255,250,220' });
      spawnFx({ k: 'ring', x, y, life: 14, r0: 10, r1: 70, col: '#ffffff', lw: 5 });
      for (let i = 0; i < 10; i++) { const an = Math.random() * 6.28, s = 2 + Math.random() * 5; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, life: 18, col: i % 2 ? '#ffffff' : '#ffd84a', size: 3 }); }
      return true;
    case 'flashpop':
      spawnFx({ k: 'flash', life: 7, a: 0.35, col: '255,250,220' });
      spawnFx({ k: 'ring', x, y, life: 18, r0: 10, r1: 110, col: '#fff6c8', lw: 6 });
      return true;
    case 'trail':
      if (MOVEFX[b] === 'dribble') { for (let i = 0; i < 2; i++) spawnFx({ k: 'spark', x, y: y + 20, vx: -a * (1 + Math.random() * 2), vy: -Math.random() * 2, g: 0.2, life: 16, col: i ? '#ffb15c' : '#ffffff', size: 2.5 }); return true; }
      return false;
  }
  return false;
}

/* dazzled fighters see stars instead of lightning */
function drawDazzle(g, f, t) {
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = 'rgba(255,250,220,.22)'; g.beginPath(); g.ellipse(f.x, f.y - f.H / 2, f.W * 0.75, f.H * 0.62, 0, 0, Math.PI * 2); g.fill();
  const cy = f.y - f.H - 10;
  for (let i = 0; i < 4; i++) {
    const a = t * 0.12 + i / 4 * Math.PI * 2, sx = f.x + Math.cos(a) * f.W * 0.55, sy = cy + Math.sin(a) * 7;
    g.fillStyle = i % 2 ? '#ffffff' : '#ffd84a'; star(g, sx, sy, 6); g.fill();
  }
  g.restore();
}

/* ---------- ultimates ---------- */
function drawUltWorldBoss2(g, view, c, t) {
  const { f, tg, def, k } = c, B = view.stage.blast;
  if (def.theme === 'photo') {
    tg.forEach((o, j) => {
      const cx = o.x, cy = o.y - o.H / 2, s = 120 - Math.min(40, k * 0.6);
      // viewfinder brackets closing in
      g.strokeStyle = '#ffffff'; g.lineWidth = 5;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(cx + sx * s, cy + sy * (s - 28)); g.lineTo(cx + sx * s, cy + sy * s); g.lineTo(cx + sx * (s - 28), cy + sy * s); g.stroke(); }
      g.fillStyle = '#ff3b3b'; circle(g, cx - s + 14, cy - s + 14, 6); g.fill();
      // flashes on each small hit
      if ((k + j * 5) % 18 < 4) { const fg = g.createRadialGradient(cx, cy, 0, cx, cy, 160); fg.addColorStop(0, 'rgba(255,255,255,.95)'); fg.addColorStop(1, 'rgba(255,216,74,0)'); g.fillStyle = fg; circle(g, cx, cy, 160); g.fill(); }
      // polaroids swirling
      for (let i = 0; i < 6; i++) { const a = k * 0.06 + i / 6 * Math.PI * 2, rr = 70 + Math.sin(k * 0.05 + i) * 20; g.save(); g.globalCompositeOperation = 'source-over'; PROJ_NEW.photo(g, {}, t + i * 9, cx + Math.cos(a) * rr * 1.4, cy + Math.sin(a) * rr, 16, 1); g.restore(); }
    });
    if (k > 100) { g.fillStyle = `rgba(0,0,0,${Math.min(0.85, (k - 100) / 8)})`; g.fillRect(B.l, B.t, B.r - B.l, B.b - B.t); }
    return true;
  }
  if (def.theme === 'court') {
    tg.forEach((o, j) => {
      const cx = o.x, top = o.y - o.H - 130 + Math.max(0, 30 - k) * 6;
      // backboard + hoop above the target
      g.fillStyle = 'rgba(255,255,255,.9)'; rrect(g, cx - 70, top - 70, 140, 90, 6); g.fill(); g.strokeStyle = '#1a0f06'; g.lineWidth = 3; g.stroke();
      g.strokeStyle = '#ff3b3b'; g.lineWidth = 3; g.strokeRect(cx - 26, top - 30, 52, 38);
      g.strokeStyle = '#ff6a00'; g.lineWidth = 6; g.beginPath(); g.ellipse(cx, top + 24, 34, 9, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.6;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(cx + i * 10, top + 26); g.lineTo(cx + i * 6, top + 70); g.stroke(); }
      // basketballs raining through the hoop onto the target
      for (let i = 0; i < 5; i++) { const ph = ((k * 2.2 + i * 23 + j * 11) % 110) / 110; const bx = cx + Math.sin(i * 2.1 + k * 0.05) * 50 * (1 - ph), by = top - 200 + ph * (o.y - top + 200); drawBall(g, bx, by, 15, k * 0.2 + i); }
    });
    return true;
  }
  return false;
}
function drawThemeArtBoss2(g, def, vw, vh, t, k) {
  const col = def.colors;
  if (def.theme === 'photo') {
    // aperture blades + film strip edges
    const cx = vw * 0.76, cy = vh * 0.5, R = Math.min(vw, vh) * 0.42, open = 0.55 + Math.sin(k * 0.08) * 0.25;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + k * 0.01;
      g.fillStyle = hexA(i % 2 ? '#2a2a33' : '#3a3a46', 0.9);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * R * open, cy + Math.sin(a) * R * open); g.lineTo(cx + Math.cos(a + 0.8) * R * 1.4, cy + Math.sin(a + 0.8) * R * 1.4); g.lineTo(cx + Math.cos(a - 0.3) * R * 1.4, cy + Math.sin(a - 0.3) * R * 1.4); g.closePath(); g.fill();
    }
    g.strokeStyle = hexA(col[1], 0.8); g.lineWidth = 5; circle(g, cx, cy, R); g.stroke();
    for (const y of [0, vh - 38]) { g.fillStyle = 'rgba(10,10,14,.9)'; g.fillRect(0, y, vw, 38); g.fillStyle = 'rgba(255,240,200,.85)'; for (let x = (k * 6) % 40; x < vw; x += 40) g.fillRect(x, y + 10, 22, 18); }
    return;
  }
  if (def.theme === 'court') {
    // hardwood floor, court lines and a scoreboard
    for (let i = 0; i < 12; i++) { g.fillStyle = hexA(i % 2 ? '#c98a4b' : '#b8773a', 0.55); g.fillRect(0, vh * 0.62 + i * vh * 0.035, vw, vh * 0.035); }
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(vw * 0.75, vh * 0.98, vw * 0.3, vh * 0.25, 0, Math.PI, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(0, vh * 0.66); g.lineTo(vw, vh * 0.66); g.stroke();
    const sx = vw * 0.62, sy = vh * 0.08, sw = Math.min(260, vw * 0.3);
    g.fillStyle = 'rgba(10,8,6,.9)'; rrect(g, sx, sy, sw, 70, 8); g.fill(); g.strokeStyle = col[1]; g.lineWidth = 3; g.stroke();
    g.font = '700 34px "Chakra Petch", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = (k >> 3) & 1 ? '#ff3b3b' : '#ffd35c'; g.fillText('00:0' + Math.max(0, 3 - Math.floor(k / 35)), sx + sw / 2, sy + 36);
    for (let i = 0; i < 6; i++) drawBall(g, (i * 173 + k * 3) % vw, vh * 0.3 + Math.abs(Math.sin(k * 0.08 + i)) * vh * 0.25, 18, k * 0.1 + i);
  }
}
