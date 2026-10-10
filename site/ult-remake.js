'use strict';
/* ===== CLOUDTOP BRAWL — remade ultimates and side specials (drawing only) =====
   Ultimates: Master Chuang's camera viewfinder, Mr. Guo's sniper scope, Volt's Chain Lightning, Rowan's Hunter's Snare.
   Side specials: Blaze's Fire Wall, Mythic Hsi's Ankle Breaker, Lumi's Bubble Trap, Talon's Sky Snatch.
   The rules (who gets hit, how hard) live in ult.js / engine.js / match.js; this file only draws them. */

const URM_LOW = () => typeof PERF !== 'undefined' && PERF.low;
const urmSeed = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

/* ---------- aiming sights ---------- */
function drawUltAimRemake(g, view, t) {
  const u = view.ult, f = view.fighters.find(x => x.slot === u.slot); if (!f) return false;
  const def = ultDef(f.c);
  if (def.aim === 'frame') { urmViewfinder(g, u, t, def); return true; }
  if (def.aim === 'scope') { urmScope(g, view, u, t); return true; }
  return false;
}
/* Master Chuang: a camera viewfinder. Whoever is inside the frame gets photographed. */
function urmViewfinder(g, u, t, def) {
  const W = ULT_FRAME_W, H = ULT_FRAME_H, x = u.ax - W / 2, y = u.ay - H / 2;
  const lock = u.ph === 'lock', lk = lock ? 1 - u.lock / ULT_LOCK : 0;
  g.save();
  g.fillStyle = lock ? `rgba(255,255,255,${0.06 + 0.1 * lk})` : 'rgba(255,255,255,.05)'; g.fillRect(x, y, W, H);
  // rule-of-thirds grid
  g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1.5; g.beginPath();
  for (let i = 1; i < 3; i++) { g.moveTo(x + W * i / 3, y); g.lineTo(x + W * i / 3, y + H); g.moveTo(x, y + H * i / 3); g.lineTo(x + W, y + H * i / 3); }
  g.stroke();
  // corner brackets
  const c = 34; g.strokeStyle = lock ? (Math.floor(t / 3) % 2 ? '#ff3b3b' : '#ffffff') : '#ffffff'; g.lineWidth = 5; g.lineCap = 'square';
  for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const cx = x + sx * W, cy = y + sy * H, dx = sx ? -1 : 1, dy = sy ? -1 : 1;
    g.beginPath(); g.moveTo(cx, cy + dy * c); g.lineTo(cx, cy); g.lineTo(cx + dx * c, cy); g.stroke();
  }
  // focus box in the middle (snaps green when locked)
  const fb = lock ? 30 - lk * 8 : 34 + Math.sin(t * 0.25) * 4;
  g.strokeStyle = lock ? '#6cf08a' : '#ffd84a'; g.lineWidth = 3; g.strokeRect(u.ax - fb, u.ay - fb * 0.7, fb * 2, fb * 1.4);
  g.beginPath(); g.moveTo(u.ax - 8, u.ay); g.lineTo(u.ax + 8, u.ay); g.moveTo(u.ax, u.ay - 8); g.lineTo(u.ax, u.ay + 8); g.stroke();
  // REC, shot info and the time left
  g.font = '700 15px "Chakra Petch", system-ui, sans-serif'; g.textBaseline = 'middle';
  if (Math.floor(t / 20) % 2 === 0 || lock) { g.fillStyle = '#ff3b3b'; circle(g, x + 18, y + 18, 6); g.fill(); }
  g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.fillText(lock ? 'FOCUS LOCKED' : 'REC', x + 30, y + 19);
  g.textAlign = 'right'; g.fillText('1/4000  f/2.8  ISO 800', x + W - 10, y + H - 16);
  if (!lock) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x, y + H + 10, W, 6); g.fillStyle = '#ffd84a'; g.fillRect(x, y + H + 10, W * Math.max(0, u.aim) / ULT_AIM, 6); }   // time left
  // the shutter starts to close while locking on
  if (lock) {
    g.fillStyle = 'rgba(12,11,16,.92)'; const sh = H * 0.5 * lk * 0.9;
    g.fillRect(x, y, W, sh); g.fillRect(x, y + H - sh, W, sh);
  }
  g.restore();
}
/* Mr. Guo: a sniper scope. Everything outside the lens goes dark. */
function urmScope(g, view, u, t) {
  const B = view.stage.blast, R = ULT_SCOPE_R, lock = u.ph === 'lock', lk = lock ? 1 - u.lock / ULT_LOCK : 0;
  const sway = lock ? 0 : 1, x = u.ax + Math.sin(t * 0.05) * 3 * sway, y = u.ay + Math.cos(t * 0.04) * 3 * sway;
  g.save();
  g.fillStyle = 'rgba(4,5,10,.82)'; g.beginPath(); g.rect(B.l - 400, B.t - 400, B.r - B.l + 800, B.b - B.t + 800); g.arc(x, y, R + 10, 0, Math.PI * 2, true); g.fill();
  g.strokeStyle = '#0a0c12'; g.lineWidth = 20; circle(g, x, y, R + 10); g.stroke();
  g.strokeStyle = lock ? '#ff3b3b' : '#9aa3ad'; g.lineWidth = 3; circle(g, x, y, R); g.stroke();
  // crosshair with mil-dots
  g.strokeStyle = lock ? '#ff3b3b' : '#e8edf2'; g.lineWidth = 2; g.beginPath();
  g.moveTo(x - R, y); g.lineTo(x - 10, y); g.moveTo(x + 10, y); g.lineTo(x + R, y); g.moveTo(x, y - R); g.lineTo(x, y - 10); g.moveTo(x, y + 10); g.lineTo(x, y + R); g.stroke();
  g.fillStyle = g.strokeStyle;
  for (let i = 1; i <= 4; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { circle(g, x + dx * i * 18, y + dy * i * 18, 2.4); g.fill(); }
  g.fillStyle = '#ff3b3b'; circle(g, x, y, 3.5); g.fill();
  if (lock) { g.strokeStyle = '#ffffff'; g.lineWidth = 2; circle(g, x, y, R * (1.3 - 0.3 * lk)); g.stroke(); }
  // lens glint and the time left
  g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(160,220,255,.08)'; g.beginPath(); g.ellipse(x - R * 0.35, y - R * 0.4, R * 0.45, R * 0.2, -0.6, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';
  if (!lock) { g.strokeStyle = '#e8354a'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, R + 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, u.aim) / ULT_AIM); g.stroke(); }
  g.restore();
}

/* ---------- the finishers (world space) ---------- */
function drawUltWorldRemake(g, view, c, t) {
  const { f, tg, def, k, u } = c, st = def.style;
  if (st !== 'photo' && st !== 'snipe' && st !== 'chain' && st !== 'snare') return false;
  const FIN = ULT_FX_FINAL * ULT_ART, low = URM_LOW();
  g.save();
  if (st === 'photo') urmPhoto(g, tg, k, FIN, t);
  else if (st === 'snipe') urmSnipe(g, f, tg, k, FIN, def);
  else if (st === 'chain') urmChain(g, view, f, tg, k, FIN, low);
  else urmSnare(g, f, tg, k, FIN, low);
  g.restore();
  return true;
}
const urmHits = def => { const n = def.hits || 3, T = []; for (let i = 0; i < n; i++) T.push((6 + Math.floor(i * (ULT_FX_FINAL - 14) / n)) * ULT_ART); return T; };

/* Chuang: shutter snaps, the target is frozen inside a giant polaroid while flashes pop, then the photo bursts apart */
function urmPhoto(g, tg, k, FIN, t) {
  tg.forEach((o, j) => {
    const cx = o.x, cy = o.y - o.H / 2, W = Math.max(150, o.W * 2.6), H = Math.max(170, o.H * 1.9), x = cx - W / 2, y = cy - H / 2 - 8;
    g.globalCompositeOperation = 'source-over';
    if (k < FIN) {
      // the photo: sepia tint inside, thick white border, caption
      g.fillStyle = 'rgba(255,214,150,.18)'; g.fillRect(x, y, W, H);
      g.fillStyle = '#f6f2e8'; g.strokeStyle = '#0c0b10'; g.lineWidth = 3;
      g.beginPath(); g.rect(x - 14, y - 14, W + 28, H + 62); g.rect(x, y, W, H); g.fill('evenodd'); g.stroke();
      g.strokeRect(x, y, W, H);
      g.fillStyle = '#2a2420'; g.font = '700 16px "Chakra Petch", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(j % 2 ? 'NICE SHOT!' : 'SAY CHEESE!', cx, y + H + 26);
      // the shutter opening at the start
      if (k < 12) { const p = 1 - k / 12; g.fillStyle = '#0c0b10'; g.fillRect(x, y, W, H * 0.5 * p); g.fillRect(x, y + H - H * 0.5 * p, W, H * 0.5 * p); }
    } else {
      // the photo bursts into four pieces
      const p = Math.min(1, (k - FIN) / 22);
      g.globalAlpha = 1 - p; g.fillStyle = '#f6f2e8'; g.strokeStyle = '#0c0b10'; g.lineWidth = 3;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.save(); g.translate(cx + sx * (W / 4 + p * 140), cy + sy * (H / 4 + p * 110) - p * 40); g.rotate(sx * sy * p * 1.2);
        g.fillRect(-W / 4, -H / 4, W / 2, H / 2); g.strokeRect(-W / 4, -H / 4, W / 2, H / 2); g.restore();
      }
      g.globalAlpha = 1;
    }
  });
}
/* Guo: a red laser sight finds the target, then a tracer streaks in from far away for every shot */
function urmSnipe(g, f, tg, k, FIN, def) {
  const T = urmHits(def).concat([FIN]);
  tg.forEach(o => {
    const cx = o.x, cy = o.y - o.H / 2, side = Math.sign(cx - f.x) || 1, sx = cx - side * 700, sy = cy - 60;
    g.globalCompositeOperation = 'lighter';
    if (k < FIN) { g.strokeStyle = 'rgba(255,40,60,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, sy); g.lineTo(cx, cy); g.stroke(); g.fillStyle = '#ff3b3b'; circle(g, cx, cy, 5); g.fill(); }
    T.forEach((at, i) => {
      const p = (k - at + 4) / 8; if (p < 0 || p > 1) return;
      const big = i === T.length - 1;
      g.globalAlpha = 1 - p; g.strokeStyle = big ? '#ffffff' : '#ffe9a8'; g.lineWidth = big ? 8 : 4;
      g.beginPath(); g.moveTo(sx + (cx - sx) * Math.max(0, p - 0.4), sy + (cy - sy) * Math.max(0, p - 0.4)); g.lineTo(cx, cy); g.stroke();
      g.strokeStyle = '#e8354a'; g.lineWidth = 3; circle(g, cx, cy, 14 + p * (big ? 90 : 40)); g.stroke();
    });
    g.globalAlpha = 1;
  });
}
/* Volt: one jagged bolt from Volt through every target in turn; flickers on every hit; a huge thunderclap at the end */
function urmBolt(g, x1, y1, x2, y2, seed, w, col) {
  const n = 8; g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x1, y1);
  for (let i = 1; i < n; i++) { const p = i / n; g.lineTo(x1 + (x2 - x1) * p + (urmSeed(seed + i) - 0.5) * 50, y1 + (y2 - y1) * p + (urmSeed(seed + i * 3.1) - 0.5) * 50); }
  g.lineTo(x2, y2); g.stroke();
}
function urmChain(g, view, f, tg, k, FIN, low) {
  if (!tg.length) return;
  const st = view.stage, hx = tg.reduce((a, o) => a + o.x, 0) / tg.length, hy = Math.min(...tg.map(o => o.y)) - 230;
  // nearest-first chain starting from Volt (who hovers above the fight, see ult-act.js)
  const left = tg.slice(), pts = [[hx, hy]];
  let cur = [hx, hy];
  while (left.length) { left.sort((a, b) => Math.hypot(a.x - cur[0], a.y - cur[1]) - Math.hypot(b.x - cur[0], b.y - cur[1])); const o = left.shift(); cur = [o.x, o.y - o.H / 2]; pts.push(cur); }
  g.globalCompositeOperation = 'lighter';
  if (k < FIN) {
    const seed = Math.floor(k / 3) * 17;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      if (!low) urmBolt(g, x1, y1, x2, y2, seed + i * 7, 14, 'rgba(122,215,255,.3)');
      urmBolt(g, x1, y1, x2, y2, seed + i * 7, 4, '#fff6a0');
      g.fillStyle = 'rgba(255,225,74,.35)'; circle(g, x2, y2, 30 + Math.sin(k * 0.8 + i) * 8); g.fill();
    }
  } else {
    const p = Math.min(1, (k - FIN) / 18);
    pts.slice(1).forEach(([x, y], i) => {
      g.globalAlpha = 1 - p;
      urmBolt(g, x, st.blast.t, x, y + 40, 99 + i, 26, 'rgba(255,225,74,.45)'); urmBolt(g, x, st.blast.t, x, y + 40, 99 + i, 8, '#ffffff');
      g.strokeStyle = '#ffe14a'; g.lineWidth = 6; circle(g, x, y, 30 + p * 160); g.stroke();
    });
    g.globalAlpha = 1;
  }
}
/* Rowan: vines grow up and wrap the target, a net drops over them, then one giant glowing arrow pierces through */
function urmSnare(g, f, tg, k, FIN, low) {
  tg.forEach(o => {
    const cx = o.x, cy = o.y - o.H / 2, grow = Math.min(1, k / 30);
    g.globalCompositeOperation = 'source-over';
    if (k < FIN + 4) {
      const n = low ? 3 : 5;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, top = o.y - o.H * grow * 1.05;
        g.strokeStyle = i % 2 ? '#3f8a2c' : '#6fbf3f'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + Math.cos(a) * 40, o.y + 4);
        for (let s = 1; s <= 8; s++) { const yy = o.y - (o.y - top) * s / 8; g.lineTo(cx + Math.sin(a + s * 0.9) * o.W * 0.55, yy); }
        g.stroke();
        if (grow >= 1) { g.fillStyle = '#7fd34f'; g.beginPath(); g.ellipse(cx + Math.sin(a + 3) * o.W * 0.6, cy + Math.cos(a * 2) * 20, 9, 4, a, 0, Math.PI * 2); g.fill(); }
      }
      // the net drops down over them
      const drop = Math.min(1, Math.max(0, (k - 14) / 16)), ny = cy - 260 * (1 - drop), W = o.W * 1.5, H = o.H * 1.1;
      g.strokeStyle = 'rgba(242,227,179,.9)'; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i <= 6; i++) { const xx = cx - W / 2 + W * i / 6; g.moveTo(xx, ny - H / 2); g.lineTo(xx + Math.sin(k * 0.1 + i) * 4, ny + H / 2); }
      for (let i = 0; i <= 6; i++) { const yy = ny - H / 2 + H * i / 6; g.moveTo(cx - W / 2, yy); g.lineTo(cx + W / 2, yy); }
      g.stroke();
    }
    // the giant arrow
    const p = (k - (FIN - 10)) / 22;
    if (p > 0 && p < 1) {
      const side = Math.sign(cx - f.x) || 1, x = cx - side * 520 + side * 1040 * p;
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(155,196,90,.35)'; g.fillRect(Math.min(x, x - side * 300), cy - 14, 300, 28);
      g.globalCompositeOperation = 'source-over';
      g.save(); g.translate(x, cy); g.scale(side, 1);
      g.fillStyle = '#5a3d1e'; g.fillRect(-170, -5, 170, 10);
      g.fillStyle = '#f2e3b3'; g.beginPath(); g.moveTo(34, 0); g.lineTo(0, -17); g.lineTo(0, 17); g.closePath(); g.fill(); g.strokeStyle = '#10180a'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#9bc45a'; g.beginPath(); g.moveTo(-170, 0); g.lineTo(-200, -18); g.lineTo(-150, 0); g.lineTo(-200, 18); g.closePath(); g.fill();
      g.restore();
    }
  });
}

/* the fighter acting it out (called from ult-act.js for these styles) */
function drawUltActorRemake(g, c, t, D, fade, fl, T, n, k) {
  const { f, tg, def } = c, st = def.style;
  if (st !== 'snipe' && st !== 'chain' && st !== 'snare') return false;
  const o = tg[0] || { x: c.u.ax, y: c.u.ay + f.H / 2, H: f.H, W: f.W };
  if (st === 'snipe') {   // lying far back, one eye on the scope
    const side = Math.sign(o.x - f.x) || 1, x = o.x - side * 640, y = o.y;
    D({ x, y, face: side, pose: fl > 0.2 ? 'punch' : 'cast', pt: 1 });
    if (fl > 0) uaGlow(g, x + side * f.W * 0.9, y - f.H * 0.55, 34, '#ffe9a8', fl);
  } else if (st === 'chain') {   // hovering above the fight, arms out, crackling
    const x = tg.length ? tg.reduce((a, q) => a + q.x, 0) / tg.length : o.x, y = Math.min(...(tg.length ? tg : [o]).map(q => q.y)) - 230 + f.H / 2 + Math.sin(k * 0.15) * 8;
    D({ x, y, face: 1, pose: 'cast2', pt: 1 });
    uaGlow(g, x, y - f.H / 2, 60 + fl * 50, '#ffe14a', 0.5 + fl * 0.5);
  } else {   // drawing a huge bow from a distance
    const side = Math.sign(o.x - f.x) || 1, x = o.x - side * 420;
    D({ x, y: o.y, face: side, pose: k > T[n + 1] - 4 ? 'punch' : 'cast', pt: 1 });
    g.save(); g.strokeStyle = '#5a3d1e'; g.lineWidth = 5; g.beginPath(); g.arc(x + side * f.W * 0.5, o.y - f.H * 0.6, f.H * 0.55, -1.1, 1.1); g.stroke(); g.restore();
  }
  return true;
}

/* ---------- new projectiles ---------- */
Object.assign(PROJ_NEW, {
  /* Blaze's Fire Wall: a row of tall flames standing on the floor */
  firewall(g, p, t, x, y) {
    const life = Math.min(1, p.life / 20, (p.age || 0) / 8), base = y + p.size * 0.6;
    g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(0, base, 0, base - 140); gr.addColorStop(0, `rgba(255,120,30,${0.55 * life})`); gr.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = gr; g.fillRect(x - 46, base - 140, 92, 140);
    const n = URM_LOW() ? 5 : 8;
    for (let i = 0; i < n; i++) {
      const fx = x - 40 + 80 * i / (n - 1), h = (70 + urmSeed(i) * 50 + Math.sin(t * 0.35 + i * 1.7) * 18) * life, w = 14 + urmSeed(i + 4) * 8;
      g.fillStyle = i % 2 ? `rgba(255,106,26,${0.85 * life})` : `rgba(255,211,92,${0.8 * life})`;
      g.beginPath(); g.moveTo(fx - w, base); g.quadraticCurveTo(fx - w * 0.6, base - h * 0.5, fx + Math.sin(t * 0.3 + i) * 6, base - h); g.quadraticCurveTo(fx + w * 0.6, base - h * 0.5, fx + w, base); g.closePath(); g.fill();
    }
    g.fillStyle = `rgba(255,255,220,${0.5 * life})`; g.fillRect(x - 44, base - 6, 88, 6);
  },
  /* Lumi's Bubble Trap: a big shiny fizzy bubble */
  bubble(g, p, t, x, y, r) {
    const R = r * 1.1 + Math.sin(t * 0.3) * 1.5;
    g.fillStyle = 'rgba(191,243,255,.18)'; circle(g, x, y, R); g.fill();
    g.strokeStyle = 'rgba(191,243,255,.9)'; g.lineWidth = 2.5; circle(g, x, y, R); g.stroke();
    g.strokeStyle = 'rgba(255,122,184,.6)'; g.lineWidth = 1.5; circle(g, x, y, R - 3); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(x - R * 0.35, y - R * 0.4, R * 0.25, R * 0.12, -0.6, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(255,255,255,.6)'; circle(g, x + Math.cos(t * 0.1 + i * 2) * R * 0.5, y + R * 0.3 - ((t * 0.6 + i * 9) % (R * 0.9)), 2); g.fill(); }
  }
});

/* someone trapped in a bubble (Lumi's Bubble Trap) */
function drawBubbleStatus(g, f, t) {
  const R = Math.max(f.W, f.H) * 0.62, x = f.x, y = f.y - f.H / 2;
  g.save();
  g.fillStyle = 'rgba(191,243,255,.16)'; circle(g, x, y, R); g.fill();
  g.strokeStyle = 'rgba(191,243,255,.95)'; g.lineWidth = 3; circle(g, x, y, R + Math.sin(t * 0.25) * 2); g.stroke();
  g.strokeStyle = 'rgba(255,122,184,.55)'; g.lineWidth = 2; circle(g, x, y, R - 4); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(x - R * 0.38, y - R * 0.42, R * 0.24, R * 0.1, -0.6, 0, Math.PI * 2); g.fill();
  g.restore();
}

/* ---------- one-shot effects ---------- */
function fxEventRemake(type, x, y, a, b) {
  switch (type) {
    case 'ankles':   // Mythic Hsi's Ankle Breaker
      spawnFx({ k: 'urtext', x, y: y - 10, vy: -1.2, life: 46, text: 'ANKLES!', col: '#ff8a1f' });
      for (let i = 0; i < 6; i++) { const an = -Math.PI * (0.1 + Math.random() * 0.8), s = 2 + Math.random() * 3; spawnFx({ k: 'spark', x, y: y + 20, vx: Math.cos(an) * s, vy: Math.sin(an) * s, g: 0.15, life: 20, col: i % 2 ? '#ffffff' : '#ffd84a', size: 3 }); }
      return true;
    case 'bubbled':
      spawnFx({ k: 'ring', x, y, life: 14, r0: 10, r1: 60, col: '#bff3ff', lw: 4 });
      return true;
    case 'bubblepop':
      spawnFx({ k: 'ring', x, y, life: 16, r0: 30, r1: 90, col: '#bff3ff', lw: 3 });
      for (let i = 0; i < 10; i++) { const an = Math.random() * 6.28, s = 2 + Math.random() * 4; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, g: 0.1, life: 18, col: i % 2 ? '#bff3ff' : '#ff7ab8', size: 3 }); }
      return true;
    case 'wallburn':   // a projectile burned up in the Fire Wall
      for (let i = 0; i < 6; i++) spawnFx({ k: 'smoke', x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 1.5, vy: -1.5 - Math.random(), life: 26, col: 'rgba(80,60,50,.6)', size: 8 + Math.random() * 6 });
      spawnFx({ k: 'ring', x, y, life: 10, r0: 6, r1: 34, col: '#ffd35c', lw: 3 });
      return true;
    case 'snatch':   // Talon catches someone
      for (let i = 0; i < 8; i++) { const an = Math.random() * 6.28, s = 2 + Math.random() * 4; spawnFx({ k: 'leaf', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 1, g: 0.08, life: 30, col: i % 2 ? '#3fcf7a' : '#f28b2c', size: 6, rot: Math.random() * 6 }); }
      spawnFx({ k: 'ring', x, y, life: 12, r0: 8, r1: 50, col: '#f2e36b', lw: 4 });
      return true;
  }
  return false;
}
/* small hits of the remade ultimates */
const urmPrevHitFx = typeof ultHitFx === 'function' ? ultHitFx : null;
ultHitFx = function (x, y, a, b, col, getF) {
  const f = getF ? getF(b) : null, sty = f && f.c ? ultDef(f.c).style : '';
  if (sty === 'chain') { for (let i = 0; i < (URM_LOW() ? 3 : 7); i++) { const an = Math.random() * 6.28, s = 3 + Math.random() * 5; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, life: 14, col: i % 2 ? '#ffe14a' : '#ffffff', size: 3 }); } }
  else if (sty === 'snare') { for (let i = 0; i < 5; i++) spawnFx({ k: 'leaf', x: x + (Math.random() - 0.5) * 50, y, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2, g: 0.06, life: 28, col: i % 2 ? '#6fbf3f' : '#9bc45a', size: 6, rot: Math.random() * 6 }); }
  else if (sty === 'snipe') spawnFx({ k: 'ring', x, y, life: 10, r0: 4, r1: 40, col: '#ffe9a8', lw: 3 });
  if (urmPrevHitFx) urmPrevHitFx(x, y, a, b, col, getF);
};
/* floating words (ANKLES!) */
const urmPrevDrawFx = typeof drawFxNew === 'function' ? drawFxNew : null;
drawFxNew = function (g, p, k) {
  if (p.k === 'urtext') {
    g.globalAlpha = Math.min(1, (1 - k) * 2.5); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${Math.round(26 * (1 + Math.max(0, 0.3 - k)))}px "Dela Gothic One", Impact, sans-serif`;
    g.lineWidth = 5; g.strokeStyle = '#1a0f06'; g.strokeText(p.text, p.x, p.y); g.fillStyle = p.col; g.fillText(p.text, p.x, p.y);
  } else if (urmPrevDrawFx) urmPrevDrawFx(g, p, k);
};

/* the opening cutscenes: the remade ultimates reuse their fighter's scene (Volt's storm, Rowan's bow, Guo's scope) */
if (typeof UI_SCENES !== 'undefined') { UI_SCENES.chain = UI_SCENES.storm; UI_SCENES.snare = UI_SCENES.arrows; UI_SCENES.snipe = UI_SCENES.barrage; }
