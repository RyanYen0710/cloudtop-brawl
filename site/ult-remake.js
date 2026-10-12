'use strict';
/* ===== CLOUDTOP BRAWL — remade ultimates and side specials (drawing only) =====
   Ultimates: Master Chuang's camera viewfinder, Mr. Guo's Lunar Cannon, Volt's Chain Lightning, Rowan's bow storm (Hunter's Snare),
   Professor Sprocket's Mega Mech.
   Side specials: Blaze's Fire Wall, Mythic Hsi's Ankle Breaker, Lumi's Bubble Trap, Talon's Hawk Call.
   The rules (who gets hit, how hard) live in ult.js / engine.js / match.js; this file only draws them. */

const URM_LOW = () => typeof PERF !== 'undefined' && PERF.low;
const urmSeed = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

/* ---------- aiming sights ---------- */
function drawUltAimRemake(g, view, t) {
  const u = view.ult, f = view.fighters.find(x => x.slot === u.slot); if (!f) return false;
  const def = ultDef(f.c);
  if (def.aim === 'frame') { urmViewfinder(g, u, t, def); return true; }
  if (def.aim === 'scope') { urmScope(g, view, u, t); return true; }
  if (def.aim === 'bows') { urmBows(g, view, u, t); return true; }
  if (def.aim === 'moon') { urmMoonScan(g, view, u, t); return true; }
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
  if (st !== 'photo' && st !== 'snipe' && st !== 'chain' && st !== 'snare' && st !== 'moon') return false;
  const FIN = ULT_FX_FINAL * ULT_ART, low = URM_LOW();
  g.save();
  if (st === 'photo') urmPhoto(g, tg, k, FIN, t);
  else if (st === 'snipe') urmSnipe(g, f, tg, k, FIN, def);
  else if (st === 'chain') urmChain(g, view, f, tg, k, FIN, low);
  else if (st === 'moon') urmMoonBeam(g, view, tg, k, FIN, low);
  else { urmArrowStorm(g, view, tg, k, low); urmSnare(g, f, tg, k, FIN, low); }
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
  if (st === 'moon') return true;   // Mr. Guo is on the moon, at the cannon's controls
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
  /* Talon's Hawk Call: an emerald hawk, wings beating */
  hawk(g, p, t, x, y, r, dir) {
    const flap = Math.sin(t * 0.55 + (p.size || 0)), col = p.color || '#3fcf7a', dark = '#1f8a5b';
    r *= 1.5;   // drawn bigger than its catch area, so it reads even next to Titan
    g.save(); g.translate(x, y); g.scale(dir, 1);
    g.globalAlpha = 0.35; g.fillStyle = col; g.beginPath(); g.ellipse(-r * 0.9, 0, r * 1.3, r * 0.45, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;   // a soft trail
    g.fillStyle = dark; g.strokeStyle = '#0c2a1a'; g.lineWidth = 2;
    for (const s2 of [1, -1]) {   // the wings
      g.beginPath(); g.moveTo(-r * 0.2, -r * 0.1); g.quadraticCurveTo(-r * 0.6, -r * (0.6 + flap * 0.9) * s2, -r * 1.3, -r * (0.2 + flap * 1.1) * s2); g.lineTo(-r * 0.7, r * 0.1 * s2); g.closePath(); g.fill(); g.stroke();
    }
    g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, r * 0.75, r * 0.38, 0, 0, Math.PI * 2); g.fill(); g.stroke();   // body
    g.fillStyle = dark; g.beginPath(); g.moveTo(-r * 0.7, 0); g.lineTo(-r * 1.15, -r * 0.22); g.lineTo(-r * 1.15, r * 0.22); g.closePath(); g.fill();   // tail
    g.fillStyle = col; g.beginPath(); g.arc(r * 0.72, -r * 0.12, r * 0.3, 0, Math.PI * 2); g.fill(); g.stroke();   // head
    g.fillStyle = '#f28b2c'; g.beginPath(); g.moveTo(r * 0.98, -r * 0.18); g.lineTo(r * 1.3, -r * 0.02); g.lineTo(r * 0.98, r * 0.04); g.closePath(); g.fill();   // beak
    g.fillStyle = '#f2e36b'; g.beginPath(); g.arc(r * 0.8, -r * 0.2, r * 0.08, 0, Math.PI * 2); g.fill();   // eye
    g.strokeStyle = '#f2c14e'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(r * 0.1, r * 0.3); g.lineTo(r * 0.2, r * 0.6); g.moveTo(-r * 0.15, r * 0.3); g.lineTo(-r * 0.05, r * 0.6); g.stroke();   // talons
    g.restore();
    if (!URM_LOW() && t % 6 === 0) spawnFx({ k: 'leaf', x: x - dir * r, y, vx: -dir * (0.5 + Math.random()), vy: (Math.random() - 0.5) * 1.2, g: 0.04, life: 26, col: Math.random() < 0.5 ? '#3fcf7a' : '#f28b2c', size: 5, rot: Math.random() * 6 });
  },
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
    case 'snatch':   // Talon's hawk catches someone (and drops them)
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

/* ===================================================================================================
   Rowan's bow storm, Mr. Guo's Lunar Cannon, Professor Sprocket's gadgets and Mega Mech (drawing only)
   =================================================================================================== */

/* ---------- Rowan: bows all around the map, dotted aim lines, then every bow fires ---------- */
function urmBowSpots(view) {
  // around the edges of what's on screen right now (so every bow is visible), across the top half
  const n = URM_LOW() ? 8 : 12, out = [];
  let cx, cy, rx, ry;
  if (typeof CAM !== 'undefined' && CAM.init && typeof document !== 'undefined') {
    const cv = document.getElementById('cv'), w = cv ? cv.clientWidth : 1280, h = cv ? cv.clientHeight : 720;
    cx = CAM.x; cy = CAM.y + h / 2 / CAM.z * 0.15; rx = w / 2 / CAM.z * 0.84; ry = h / 2 / CAM.z * 0.95;
  } else { const m = view.stage.solids[0]; cx = m.x + m.w / 2; cy = m.y - 140; rx = m.w / 2 + 230; ry = 430; }
  for (let i = 0; i < n; i++) { const a = Math.PI * (0.98 + 1.04 * i / (n - 1)); out.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }); }
  return out;
}
const urmArc = (P, T, s) => { const cx = (P.x + T.x) / 2, cy = Math.min(P.y, T.y) - 140; const q = 1 - s; return { x: q * q * P.x + 2 * q * s * cx + s * s * T.x, y: q * q * P.y + 2 * q * s * cy + s * s * T.y }; };
function urmBow(g, P, T, draw, glow, t) {
  const a = Math.atan2(T.y - P.y, T.x - P.x), R = 40;
  g.save(); g.translate(P.x, P.y); g.rotate(a);
  if (glow) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(155,196,90,.25)'; circle(g, 0, 0, 40); g.fill(); g.globalCompositeOperation = 'source-over'; }
  g.strokeStyle = '#5a3d1e'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, R, -1.15, 1.15); g.stroke();   // the bow
  g.strokeStyle = '#9bc45a'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R, -1.15, 1.15); g.stroke();
  const tx = Math.cos(1.15) * R, ty = Math.sin(1.15) * R, back = -draw * 22;   // the string, pulled back
  g.strokeStyle = '#f2e3b3'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(tx, -ty); g.lineTo(back, 0); g.lineTo(tx, ty); g.stroke();
  if (draw > 0.05) { g.strokeStyle = '#f2e3b3'; g.lineWidth = 3; g.beginPath(); g.moveTo(back, 0); g.lineTo(back + 46, 0); g.stroke(); g.fillStyle = '#e8ffd0'; g.beginPath(); g.moveTo(back + 54, 0); g.lineTo(back + 44, -5); g.lineTo(back + 44, 5); g.closePath(); g.fill(); }
  g.restore();
}
function urmBows(g, view, u, t) {
  const lock = u.ph === 'lock', lk = lock ? 1 - u.lock / ULT_LOCK : 0, T = { x: u.ax, y: u.ay };
  const spots = urmBowSpots(view), appear = Math.min(1, (ULT_AIM - u.aim + 1) / 24), draw = lock ? 1 : Math.min(1, 0.35 + (ULT_AIM - u.aim) / 90);
  g.save();
  spots.forEach((P, i) => {
    const vis = Math.min(1, Math.max(0, appear * 1.6 - i * 0.05)); if (vis <= 0) return;
    g.globalAlpha = vis;
    // the dotted path from this bow to the aim point
    const n = 16, off = (t * 0.04 + i * 0.13) % (1 / n);
    g.fillStyle = lock ? (Math.floor(t / 3) % 2 ? '#ff5a4d' : '#ffffff') : 'rgba(230,255,190,.85)';
    for (let j = 0; j < n; j++) { const s = j / n + off; if (s > 0.97 || s < 0.06) continue; const q = urmArc(P, T, s); circle(g, q.x, q.y, lock ? 4.5 : 3.6); g.fill(); }
    urmBow(g, P, urmArc(P, T, 0.08), draw, lock, t);
  });
  g.globalAlpha = 1;
  // where they'll land: a small marker (the arrows reach about this far)
  const pulse = 1 + Math.sin(t * 0.25) * 0.08;
  g.strokeStyle = lock ? '#ff5a4d' : 'rgba(230,255,190,.35)'; g.setLineDash([6, 10]); g.lineWidth = 2; circle(g, u.ax, u.ay, ULT_R * pulse); g.stroke(); g.setLineDash([]);
  g.strokeStyle = lock ? '#ffffff' : '#e8ffd0'; g.lineWidth = 3;
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t * 0.03; g.beginPath(); g.moveTo(u.ax + Math.cos(a) * 12, u.ay + Math.sin(a) * 12); g.lineTo(u.ax + Math.cos(a) * 26, u.ay + Math.sin(a) * 26); g.stroke(); }
  g.fillStyle = lock ? '#ff5a4d' : '#9bc45a'; circle(g, u.ax, u.ay, 5 + lk * 4); g.fill();
  if (!lock) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(u.ax - 70, u.ay + ULT_R + 18, 140, 6); g.fillStyle = '#9bc45a'; g.fillRect(u.ax - 70, u.ay + ULT_R + 18, 140 * Math.max(0, u.aim) / ULT_AIM, 6); }
  g.restore();
}
/* when K is pressed: every bow fires, a storm of arrows streams down the dotted paths */
function urmArrowStorm(g, view, tg, k, low) {
  if (!tg.length || k > 70) return;
  const spots = urmBowSpots(view), N = low ? 26 : 84;
  g.save();
  if (k < 56) spots.forEach(P => { g.globalAlpha = Math.min(1, Math.max(0, (56 - k) / 16)); urmBow(g, P, { x: tg[0].x, y: tg[0].y - tg[0].H / 2 }, Math.max(0, 1 - (k % 8) / 4), false, k); });
  g.globalAlpha = 1;
  for (let i = 0; i < N; i++) {
    const o = tg[i % tg.length], P = spots[i % spots.length], T = { x: o.x + (urmSeed(i) - 0.5) * o.W * 0.8, y: o.y - o.H * (0.25 + urmSeed(i + 9) * 0.55) };
    const s = (k - (i / N) * 44) / 9; if (s < 0 || s > 1.3) continue;
    if (s >= 1) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(230,255,190,${(1.3 - s) * 3})`; circle(g, T.x, T.y, 10); g.fill(); g.globalCompositeOperation = 'source-over'; continue; }
    const a = urmArc(P, T, s), b = urmArc(P, T, Math.max(0, s - 0.14));
    g.strokeStyle = 'rgba(170,230,90,.55)'; g.lineWidth = 9; g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(a.x, a.y); g.stroke();
    g.strokeStyle = '#fff4c8'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(a.x, a.y); g.stroke();
    const an = Math.atan2(a.y - b.y, a.x - b.x); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(a.x + Math.cos(an) * 13, a.y + Math.sin(an) * 13); g.lineTo(a.x + Math.cos(an + 2.6) * 11, a.y + Math.sin(an + 2.6) * 11); g.lineTo(a.x + Math.cos(an - 2.6) * 11, a.y + Math.sin(an - 2.6) * 11); g.closePath(); g.fill();
    g.strokeStyle = '#7fd14a'; g.lineWidth = 3; g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x + Math.cos(an + 2.5) * 9, b.y + Math.sin(an + 2.5) * 9); g.moveTo(b.x, b.y); g.lineTo(b.x + Math.cos(an - 2.5) * 9, b.y + Math.sin(an - 2.5) * 9); g.stroke();
  }
  g.restore();
}

/* ---------- Mr. Guo: Lunar Cannon ---------- */
/* aiming: a green scanner from space looks down on the battlefield */
function urmMoonScan(g, view, u, t) {
  const B = view.stage.blast, lock = u.ph === 'lock', lk = lock ? 1 - u.lock / ULT_LOCK : 0, R = ULT_SCOPE_R;
  g.save();
  g.fillStyle = 'rgba(0,30,12,.42)'; g.fillRect(B.l - 400, B.t - 400, B.r - B.l + 800, B.b - B.t + 800);
  g.strokeStyle = 'rgba(70,255,138,.10)'; g.lineWidth = 1; g.beginPath();
  for (let y = B.t - 400; y < B.b + 400; y += 9) { g.moveTo(B.l - 400, y); g.lineTo(B.r + 400, y); }
  g.stroke();
  g.strokeStyle = 'rgba(70,255,138,.18)'; g.beginPath();
  for (let x = Math.floor((B.l - 400) / 140) * 140; x < B.r + 400; x += 140) { g.moveTo(x, B.t - 400); g.lineTo(x, B.b + 400); }
  for (let y = Math.floor((B.t - 400) / 140) * 140; y < B.b + 400; y += 140) { g.moveTo(B.l - 400, y); g.lineTo(B.r + 400, y); }
  g.stroke();
  // a scanning sweep line
  const sy = B.t + ((t * 9) % (B.b - B.t)); g.fillStyle = 'rgba(70,255,138,.12)'; g.fillRect(B.l - 400, sy - 30, B.r - B.l + 800, 30);
  // the lock-on box (this is how far the beam reaches)
  const col = lock ? (Math.floor(t / 3) % 2 ? '#ff3b3b' : '#ffffff') : '#46ff8a', s = R + 14 - lk * 10, c = 28;
  g.strokeStyle = col; g.lineWidth = 4;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = u.ax + dx * s, y = u.ay + dy * s; g.beginPath(); g.moveTo(x, y - dy * c); g.lineTo(x, y); g.lineTo(x - dx * c, y); g.stroke(); }
  g.save(); g.translate(u.ax, u.ay); g.rotate(t * 0.04); g.lineWidth = 2; g.strokeStyle = col;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, R * 0.62, i * 2.09, i * 2.09 + 1.2); g.stroke(); }
  g.restore();
  g.beginPath(); g.moveTo(u.ax - 18, u.ay); g.lineTo(u.ax + 18, u.ay); g.moveTo(u.ax, u.ay - 18); g.lineTo(u.ax, u.ay + 18); g.stroke();
  g.font = '700 15px "Chakra Petch", system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = col;
  g.fillText(lock ? 'TARGET LOCKED · FIRING' : 'LUNAR CANNON · SCANNING', u.ax, u.ay - s - 14);
  g.textAlign = 'left'; g.fillText('LAT ' + (u.ay / 10).toFixed(1) + '  LON ' + (u.ax / 10).toFixed(1), u.ax + s + 10, u.ay - s + 10);
  if (!lock) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(u.ax - s, u.ay + s + 12, s * 2, 6); g.fillStyle = '#46ff8a'; g.fillRect(u.ax - s, u.ay + s + 12, s * 2 * Math.max(0, u.aim) / ULT_AIM, 6); }
  g.restore();
}
/* firing: four beams join into one, then a giant beam slams down from the sky */
function urmMoonBeam(g, view, tg, k, FIN, low) {
  const B = view.stage.blast;
  tg.forEach((o, j) => {
    const x = o.x, y = o.y - o.H / 2, top = B.t - 200, meet = Math.max(B.t + 40, y - 360);
    g.globalCompositeOperation = 'lighter';
    if (k < 18) {   // four thin beams converge
      const p = Math.min(1, k / 14);
      for (let i = 0; i < 4; i++) { const sx = x + (i - 1.5) * 220 * (1 - p * 0.15); g.strokeStyle = 'rgba(70,255,138,.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx, top); g.lineTo(sx + (x - sx) * p, top + (meet - top) * p); g.stroke(); }
      if (p >= 1) { g.fillStyle = 'rgba(200,255,220,.8)'; circle(g, x, meet, 18 + Math.sin(k) * 4); g.fill(); }
    } else if (k < FIN + 26) {   // the giant beam
      const fin = k >= FIN, p = fin ? Math.min(1, (k - FIN) / 26) : 0;
      const w = (fin ? 120 + p * 140 : 64 + Math.sin(k * 0.9) * 10) * (fin ? 1 - p * 0.9 : 1);
      const gr = g.createLinearGradient(x - w, 0, x + w, 0);
      gr.addColorStop(0, 'rgba(70,255,138,0)'); gr.addColorStop(0.3, 'rgba(70,255,138,.55)'); gr.addColorStop(0.5, 'rgba(235,255,240,.95)'); gr.addColorStop(0.7, 'rgba(70,255,138,.55)'); gr.addColorStop(1, 'rgba(70,255,138,0)');
      g.fillStyle = gr; g.fillRect(x - w, top, w * 2, o.y - top + 10);
      g.fillStyle = 'rgba(200,255,220,.5)'; g.beginPath(); g.ellipse(x, o.y, w * 1.6, 18, 0, 0, Math.PI * 2); g.fill();   // scorch glow on the floor
      if (!low && k % 2 === 0) for (let i = 0; i < 3; i++) spawnFx({ k: 'spark', x: x + (Math.random() - 0.5) * w, y: o.y - Math.random() * 30, vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 4, g: 0.15, life: 18, col: i % 2 ? '#46ff8a' : '#e8fff0', size: 3 });
      if (fin) { g.strokeStyle = `rgba(200,255,220,${1 - p})`; g.lineWidth = 8; circle(g, x, y, 40 + p * 260); g.stroke(); circle(g, x, y, 20 + p * 160); g.stroke(); }
    }
    g.globalCompositeOperation = 'source-over';
  });
}
if (typeof UI_SCENES !== 'undefined') {
  /* Mr. Guo: the scene cuts to the moon. A giant telescope-cannon rises from a crater, turns toward Earth and charges */
  UI_SCENES.moon = function (o) {
    const { g, f, k, vw, vh, S, low } = o;
    g.fillStyle = '#03040b'; g.fillRect(0, 0, vw, vh);
    g.fillStyle = '#ffffff'; for (let i = 0; i < (low ? 40 : 110); i++) { g.globalAlpha = 0.3 + uiSeed(i) * 0.7; g.fillRect(uiSeed(i + 3) * vw, uiSeed(i + 7) * vh * 0.7, 2, 2); }
    g.globalAlpha = 1;
    // Earth in the sky
    const ex = vw * 0.78, ey = vh * 0.24, er = 70 * S;
    const eg = g.createRadialGradient(ex - er * 0.3, ey - er * 0.3, er * 0.1, ex, ey, er); eg.addColorStop(0, '#7ad7ff'); eg.addColorStop(0.7, '#1f6fbf'); eg.addColorStop(1, '#0a2a5a');
    g.fillStyle = eg; circle(g, ex, ey, er); g.fill();
    g.fillStyle = 'rgba(111,227,154,.8)'; g.beginPath(); g.ellipse(ex - er * 0.2, ey - er * 0.1, er * 0.35, er * 0.22, 0.6, 0, Math.PI * 2); g.ellipse(ex + er * 0.35, ey + er * 0.3, er * 0.2, er * 0.14, -0.4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(122,215,255,.35)'; g.lineWidth = 8 * S; circle(g, ex, ey, er + 6 * S); g.stroke();
    // the moon's surface
    const gy = vh * 0.72;
    g.fillStyle = '#8a8f9c'; g.beginPath(); g.moveTo(0, vh); g.lineTo(0, gy + 30 * S); g.quadraticCurveTo(vw / 2, gy - 50 * S, vw, gy + 30 * S); g.lineTo(vw, vh); g.closePath(); g.fill();
    g.fillStyle = '#6c717d'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(uiSeed(i + 20) * vw, gy + 50 * S + uiSeed(i + 30) * vh * 0.18, (20 + uiSeed(i) * 40) * S, (6 + uiSeed(i) * 10) * S, 0, 0, Math.PI * 2); g.fill(); }
    const cx = vw * 0.42; g.fillStyle = '#4e525c'; g.beginPath(); g.ellipse(cx, gy + 10 * S, 120 * S, 26 * S, 0, 0, Math.PI * 2); g.fill();   // the crater
    // the cannon rises, turns toward Earth, then charges
    const rise = uiOut(uiSeg(k, 4, 34)), turn = uiOut(uiSeg(k, 34, 58)), charge = uiSeg(k, 58, 84);
    const bx = cx, by = gy + 10 * S - rise * 120 * S;
    g.fillStyle = '#3a3f4a'; g.fillRect(bx - 28 * S, by, 56 * S, gy + 10 * S - by);   // the tower
    g.fillStyle = '#c8ccd6'; g.beginPath(); g.ellipse(bx, by, 60 * S, 22 * S, 0, 0, Math.PI * 2); g.fill();
    const aim = Math.atan2(ey - by, ex - bx), ang = -0.15 + (aim + 0.15) * turn, L = 190 * S;
    g.save(); g.translate(bx, by - 10 * S); g.rotate(ang);
    g.fillStyle = '#e8ebf2'; g.strokeStyle = '#1a1d26'; g.lineWidth = 3 * S;
    g.beginPath(); g.moveTo(-50 * S, -30 * S); g.lineTo(L, -22 * S); g.lineTo(L, 22 * S); g.lineTo(-50 * S, 30 * S); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#9aa3ad'; for (let i = 0; i < 3; i++) g.fillRect((i * 50 - 10) * S, -32 * S, 12 * S, 64 * S);
    g.fillStyle = '#1a1d26'; g.beginPath(); g.ellipse(L, 0, 10 * S, 26 * S, 0, 0, Math.PI * 2); g.fill();
    if (charge > 0) {   // four beams join at the mouth, like the Death Star
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { const yy = (i - 1.5) * 18 * S; g.strokeStyle = `rgba(70,255,138,${0.4 + charge * 0.6})`; g.lineWidth = 3 * S; g.beginPath(); g.moveTo(L, yy); g.lineTo(L + 70 * S * charge, 0); g.stroke(); }
      g.fillStyle = `rgba(220,255,230,${charge})`; circle(g, L + 70 * S * charge, 0, (8 + charge * 22) * S); g.fill();
      if (k >= 84) { g.fillStyle = 'rgba(70,255,138,.85)'; g.fillRect(L + 70 * S, -22 * S, vw * 2, 44 * S); g.fillStyle = '#ffffff'; g.fillRect(L + 70 * S, -8 * S, vw * 2, 16 * S); }
      g.globalCompositeOperation = 'source-over';
    }
    g.restore();
    // Mr. Guo at the controls
    uiFig(g, f, vw * 0.16, gy + 40 * S, 150 * S, 'cast', 1);
    g.fillStyle = '#1a1d26'; g.fillRect(vw * 0.16 + 26 * S, gy - 20 * S, 60 * S, 46 * S); g.fillStyle = k % 8 < 4 ? '#46ff8a' : '#1a7a40'; g.fillRect(vw * 0.16 + 32 * S, gy - 14 * S, 48 * S, 20 * S);
    if (k > 84) { g.fillStyle = `rgba(220,255,230,${(k - 84) / 8})`; g.fillRect(0, 0, vw, vh); }
  };
  /* Professor Sprocket: mech parts fly in from every side and lock on around him */
  UI_SCENES.mech = function (o) {
    const { g, f, k, vw, vh, S, cx } = o, gy = vh * 0.84, H = 300 * S;
    g.strokeStyle = 'rgba(201,147,42,.25)'; g.lineWidth = 2; for (let x = 0; x < vw; x += 60 * S) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, vh); g.stroke(); }
    const jump = uiSeg(k, 0, 18), fy = gy - Math.sin(jump * Math.PI) * 60 * S;
    uiFig(g, f, cx, fy, 170 * S, k < 18 ? 'up' : 'power', 1);
    const p = uiOut(uiSeg(k, 14, 58));
    urmMechArt(g, cx, gy, H, 1, k, 1, p);
    if (k > 60) {
      g.font = `${28 * S | 0}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#ffd35c'; g.globalAlpha = uiSeg(k, 60, 68);
      g.fillText('MEGA MECH ONLINE', cx, vh * 0.16); g.globalAlpha = 1;
      if (k < 66) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, vw, vh); }
    }
  };
}

/* ---------- Professor Sprocket ---------- */
/* the mech suit around him: x,y = feet, h = height. asm (0..1) = parts flying in (1 = all on) */
function urmMechArt(g, x, y, h, face, t, alpha, asm, pose, air) {
  asm = asm == null ? 1 : asm;
  const fly = (dx, dy) => [(1 - asm) * dx * h, (1 - asm) * dy * h];
  const brass = '#c9932a', dark = '#2a1d0a', steel = '#9aa3ad', W = h * 0.62;
  g.save(); g.globalAlpha *= alpha == null ? 1 : alpha; g.translate(x, y); g.scale(face, 1);
  g.strokeStyle = dark; g.lineWidth = Math.max(2, h * 0.012); g.lineJoin = 'round';
  // jetpack (flames when flying)
  let [ox, oy] = fly(-1.4, -0.4);
  g.fillStyle = steel; g.fillRect(ox - W * 0.62, oy - h * 0.78, W * 0.26, h * 0.34); g.strokeRect(ox - W * 0.62, oy - h * 0.78, W * 0.26, h * 0.34);
  if (air && asm >= 1) { g.globalCompositeOperation = 'lighter'; const fl = h * (0.16 + Math.random() * 0.08); g.fillStyle = 'rgba(255,138,31,.85)'; g.beginPath(); g.moveTo(-W * 0.6, -h * 0.44); g.lineTo(-W * 0.49, -h * 0.44 + fl); g.lineTo(-W * 0.38, -h * 0.44); g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over'; }
  // legs
  [ox, oy] = fly(0, 1.2);
  for (const sx of [-1, 1]) {
    g.fillStyle = steel; g.fillRect(ox + sx * W * 0.22 - W * 0.09, oy - h * 0.42, W * 0.18, h * 0.32); g.strokeRect(ox + sx * W * 0.22 - W * 0.09, oy - h * 0.42, W * 0.18, h * 0.32);
    g.fillStyle = brass; g.beginPath(); g.arc(ox + sx * W * 0.22, oy - h * 0.26, W * 0.1, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillRect(ox + sx * W * 0.22 - W * 0.17, oy - h * 0.1, W * 0.34, h * 0.1); g.strokeRect(ox + sx * W * 0.22 - W * 0.17, oy - h * 0.1, W * 0.34, h * 0.1);
  }
  // body plate
  [ox, oy] = fly(1.4, 0.2);
  g.fillStyle = brass; g.beginPath(); g.roundRect ? g.roundRect(ox - W * 0.38, oy - h * 0.74, W * 0.76, h * 0.34, h * 0.05) : g.rect(ox - W * 0.38, oy - h * 0.74, W * 0.76, h * 0.34); g.fill(); g.stroke();
  g.fillStyle = '#7ad7ff'; circle(g, ox, oy - h * 0.58, W * 0.09); g.fill(); g.stroke();   // the power core
  g.fillStyle = dark; for (const [rx, ry] of [[-0.3, -0.7], [0.3, -0.7], [-0.3, -0.45], [0.3, -0.45]]) { circle(g, ox + rx * W, oy + ry * h, h * 0.012); g.fill(); }
  // arms with big fists (the front one punches out)
  [ox, oy] = fly(-1.2, -0.8);
  const reach = pose === 'punch' || pose === 'dash' ? W * 0.55 : 0;
  for (const sx of [-1, 1]) {
    const ax = ox + sx * W * 0.5 + (sx > 0 ? reach : 0), ay = oy - h * 0.6;
    g.fillStyle = steel; g.fillRect(Math.min(ox + sx * W * 0.42, ax) - W * 0.06, ay - h * 0.04, Math.abs(ax - ox - sx * W * 0.42) + W * 0.12, h * 0.08);
    g.fillStyle = brass; g.beginPath(); g.arc(ox + sx * W * 0.44, oy - h * 0.7, W * 0.15, 0, Math.PI * 2); g.fill(); g.stroke();   // shoulder pad
    g.beginPath(); g.arc(ax, ay + h * 0.02, W * 0.15, 0, Math.PI * 2); g.fill(); g.stroke();   // fist
  }
  // cockpit glass around his head
  [ox, oy] = fly(0, -1.4);
  g.fillStyle = 'rgba(122,215,255,.22)'; g.strokeStyle = steel; g.lineWidth = Math.max(2, h * 0.016);
  g.beginPath(); g.arc(ox, oy - h * 0.86, W * 0.3, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(ox + W * 0.3, oy - h * 0.76); g.lineTo(ox - W * 0.3, oy - h * 0.76); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = (t >> 3) % 2 ? '#ff5a4d' : '#ffd35c'; circle(g, ox, oy - h * 0.99, h * 0.016); g.fill();   // antenna light
  g.restore();
}
if (typeof drawFighter === 'function') {
  const drawFighterNoMech = drawFighter;
  drawFighter = function (g, f, t, portrait) {
    drawFighterNoMech(g, f, t, portrait);
    if (f && f.mech > 0 && !portrait && !f.out && !(f.dead > 0)) {
      try { urmMechArt(g, f.x, f.y, f.H, f.face || 1, t, 1, 1, f.pose, !f.ground && (f.vy < 0 || f.pose === 'up' || f.pose === 'fly')); } catch (e) { }
    }
  };
}
Object.assign(PROJ_NEW, {
  /* Robo-Pup: a wind-up robot dog running along the floor */
  robopup(g, p, t, x, y, r, dir) {
    const run = Math.sin(t * 0.8) * 4, s = r / 15;
    g.save(); g.translate(x, y - 2 * s); g.scale(dir * s, s);
    g.strokeStyle = '#2a1d0a'; g.lineWidth = 1.6;
    g.fillStyle = '#9aa3ad'; for (const lx of [-8, 6]) { g.fillRect(lx - 2, 4, 4, 9 + (lx < 0 ? run : -run) * 0.5); }
    g.fillStyle = '#c9932a'; g.beginPath(); g.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#e8d9b0'; g.fillRect(8, -12, 12, 10); g.strokeRect(8, -12, 12, 10);   // head
    g.fillStyle = '#c9932a'; g.beginPath(); g.moveTo(10, -12); g.lineTo(12, -18); g.lineTo(14, -12); g.fill();   // ear
    g.fillStyle = '#ff5a4d'; circle(g, 17, -8, 1.8); g.fill();   // eye
    g.save(); g.translate(-4, -9); g.rotate(t * 0.4); g.fillStyle = '#e8d9b0'; g.fillRect(-1, -6, 2, 12); g.fillRect(-5, -6, 10, 3); g.restore();   // the wind-up key
    g.strokeStyle = '#9aa3ad'; g.lineWidth = 2; g.beginPath(); g.moveTo(-13, -2); g.quadraticCurveTo(-20, -8 + run, -22, -12); g.stroke();   // tail
    g.restore();
  },
  /* Sprocket's spring pad */
  springpad(g, p, t, x, y, r, dir) {
    const sq = 1 + Math.sin(t * 0.5) * 0.1, base = y + p.size * 0.55, h = 18 * sq, fade = Math.min(1, p.life / 20);
    g.save(); g.globalAlpha *= fade; g.strokeStyle = '#2a1d0a'; g.lineWidth = 2;
    g.fillStyle = '#5a4636'; g.fillRect(x - 22, base - 5, 44, 6); g.strokeRect(x - 22, base - 5, 44, 6);
    g.strokeStyle = '#c8ccd6'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 10, base - 5);
    for (let i = 1; i <= 5; i++) g.lineTo(x + (i % 2 ? 10 : -10), base - 5 - h * i / 5);
    g.stroke();
    g.fillStyle = '#c9932a'; g.strokeStyle = '#2a1d0a'; g.lineWidth = 2; g.fillRect(x - 20, base - 9 - h, 40, 6); g.strokeRect(x - 20, base - 9 - h, 40, 6);
    g.restore();
  },
  /* Magnet Trap: a big horseshoe magnet with a pulling field */
  magnet(g, p, t, x, y, r, dir) {
    const base = y + p.size * 0.5;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const q = ((t * 0.04 + i / 3) % 1); g.strokeStyle = `rgba(122,215,255,${0.5 * (1 - q)})`; g.lineWidth = 3; circle(g, x, base - 20, 140 * (1 - q)); g.stroke(); }   // same size as its pull (sprocket.js pullR)
    g.globalCompositeOperation = 'source-over';
    g.lineCap = 'butt'; g.strokeStyle = '#2a1d0a'; g.lineWidth = 18; g.beginPath(); g.arc(x, base - 22, 18, Math.PI, 0); g.stroke();
    g.strokeStyle = '#e8354a'; g.lineWidth = 14; g.beginPath(); g.arc(x, base - 22, 18, Math.PI, 0); g.stroke();
    g.fillStyle = '#e8354a'; g.fillRect(x - 25, base - 22, 14, 14); g.fillRect(x + 11, base - 22, 14, 14);
    g.fillStyle = '#e8ebf2'; g.fillRect(x - 25, base - 10, 14, 9); g.fillRect(x + 11, base - 10, 14, 9);
    if ((t >> 2) % 2) { g.strokeStyle = '#7ad7ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 18, base); g.lineTo(x - 6, base - 8); g.lineTo(x + 4, base + 2); g.lineTo(x + 18, base - 6); g.stroke(); }
    g.restore();
  }
});
if (typeof fxEventRemake === 'function') {
  const fxEventRemake1 = fxEventRemake;
  fxEventRemake = function (type, x, y, a, b) {
    switch (type) {
      case 'pupboom':   // Robo-Pup blows up: springs and bolts everywhere
        spawnFx({ k: 'ring', x, y, life: 16, r0: 10, r1: a || 95, col: '#ffd35c', lw: 6 });
        for (let i = 0; i < (URM_LOW() ? 8 : 18); i++) { const an = Math.random() * 6.28, s = 3 + Math.random() * 6; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 2, g: 0.25, life: 30, col: i % 3 ? '#9aa3ad' : '#c9932a', size: 4 }); }
        for (let i = 0; i < 6; i++) spawnFx({ k: 'smoke', x: x + (Math.random() - 0.5) * 40, y, vx: (Math.random() - 0.5) * 2, vy: -1.5, life: 30, col: 'rgba(90,80,70,.6)', size: 12 });
        return true;
      case 'magburst':   // the Magnet Trap zaps everyone it pulled in
        spawnFx({ k: 'ring', x, y, life: 18, r0: 20, r1: a || 90, col: '#7ad7ff', lw: 6 });
        for (let i = 0; i < (URM_LOW() ? 8 : 16); i++) { const an = Math.random() * 6.28, s = 3 + Math.random() * 5; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, life: 18, col: i % 2 ? '#7ad7ff' : '#ffffff', size: 3 }); }
        return true;
      case 'mechon':   // the Mega Mech powers up
        spawnFx({ k: 'ring', x, y, life: 22, r0: 30, r1: 170, col: '#ffd35c', lw: 8 });
        spawnFx({ k: 'flash', life: 8, a: 0.3, col: '255,211,92' });
        for (let i = 0; i < 12; i++) spawnFx({ k: 'smoke', x: x + (Math.random() - 0.5) * 80, y: y + 40, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 2, life: 34, col: 'rgba(230,230,240,.6)', size: 14 });
        return true;
      case 'mechoff':   // the suit falls apart
        for (let i = 0; i < 14; i++) { const an = -Math.PI * Math.random(), s = 2 + Math.random() * 5; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, g: 0.3, life: 34, col: i % 2 ? '#c9932a' : '#9aa3ad', size: 5 }); }
        for (let i = 0; i < 8; i++) spawnFx({ k: 'smoke', x: x + (Math.random() - 0.5) * 60, y, vx: (Math.random() - 0.5) * 2, vy: -1.2, life: 30, col: 'rgba(90,80,70,.55)', size: 12 });
        return true;
    }
    return fxEventRemake1(type, x, y, a, b);
  };
}
