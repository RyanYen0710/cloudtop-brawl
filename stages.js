'use strict';
/* ===== CLOUDTOP BRAWL — stage layouts, moving platforms, hazards, day/night =====
   Each stage: solids (big bases you can stand on and grab the edges of) and
   plats (thin platforms you can jump through). Anything can move:
     mx / my  = sway distance left-right / up-down,  per = frames per cycle (60 = 1 sec), ph = offset 0..1
     blink: [onFrames, offFrames, offset]  → platform appears and disappears
   Everything is computed from the match clock, so every player sees the same thing. */

const S = (x, y, w, h, o) => Object.assign({ x, y, w, h, solid: true }, o || {});
const P = (x, y, w, o) => Object.assign({ x, y, w, h: 12, soft: true }, o || {});

STAGES.length = 0;
STAGES.push(
  { id: 'temple', name: 'Cloud Temple', swatch: ['#1d1647', '#6b2f6e', '#f0875e'], blurb: 'Drifting clouds, day and night',
    solids: [S(480, 620, 640, 80)],
    plats: [P(360, 510, 130, { mx: 70, per: 540 }), P(1110, 510, 130, { mx: 70, per: 540, ph: 0.5 }), P(600, 470, 140), P(860, 470, 140), P(730, 350, 140), P(745, 225, 110, { my: 26, per: 420 })],
    cycle: { per: 7200, tint: '#0b0a2a', max: 0.55 } },
  { id: 'ruins', name: 'Jungle Ruins', swatch: ['#0d2a2b', '#1f4d3c', '#5f9a4a'], blurb: 'Two islands and a stone lift',
    solids: [S(300, 640, 400, 90), S(900, 640, 400, 90)],
    plats: [P(730, 590, 140, { my: 150, per: 420 }), P(360, 510, 140), P(1100, 510, 140), P(540, 420, 130), P(930, 420, 130), P(735, 300, 130)],
    cycle: { per: 6000, tint: '#061a18', max: 0.45 }, hazard: 'rain' },
  { id: 'roof', name: 'Neon Rooftop', swatch: ['#07061a', '#2a1350', '#ff4fd8'], blurb: 'Split rooftops, elevator, flickering signs',
    solids: [S(340, 600, 380, 150), S(900, 660, 380, 150)],
    plats: [P(740, 610, 120, { my: 170, per: 480 }), P(380, 470, 120), P(1150, 530, 110), P(560, 380, 120, { blink: [420, 240, 0] }), P(960, 420, 120, { blink: [420, 240, 0.5] }), P(760, 280, 110)],
    cycle: { per: 3600, neon: true } },
  { id: 'forge', name: 'Magma Forge', swatch: ['#1a0606', '#6a1a0c', '#ff7a1a'], blurb: 'The lava rises every 40 seconds',
    solids: [S(520, 640, 560, 90)],
    plats: [P(380, 560, 120, { mx: 60, per: 500 }), P(1100, 560, 120, { mx: 60, per: 500, ph: 0.5 }), P(600, 470, 120), P(880, 470, 120), P(740, 350, 120), P(740, 230, 110, { mx: 140, per: 900 })],
    hazard: 'lava' },
  { id: 'peak', name: 'Frozen Peak', swatch: ['#6fb4f0', '#cfeaff', '#ffffff'], blurb: 'Six ice ledges and blizzard winds',
    solids: [S(400, 640, 800, 80)],
    plats: [P(450, 530, 130, { my: 10, per: 300 }), P(735, 530, 130, { my: 10, per: 300, ph: 0.3 }), P(1020, 530, 130, { my: 10, per: 300, ph: 0.6 }), P(590, 420, 130, { my: 10, per: 300, ph: 0.15 }), P(880, 420, 130, { my: 10, per: 300, ph: 0.45 }), P(735, 305, 130, { my: 10, per: 300, ph: 0.75 })],
    hazard: 'wind', cycle: { per: 6600, tint: '#1a2a5a', max: 0.35 } },
  { id: 'orbit', name: 'Orbit Station', swatch: ['#05040f', '#2b1d5c', '#46e0ff'], blurb: 'Hologram platforms and low gravity',
    solids: [S(460, 620, 680, 60)],
    plats: [P(540, 490, 150, { blink: [600, 300, 0] }), P(910, 490, 150, { blink: [600, 300, 0.5] }), P(725, 370, 150, { blink: [600, 300, 0.25] }), P(725, 240, 120, { mx: 200, per: 720 })],
    hazard: 'lowgrav' },
  { id: 'cove', name: 'Pirate Cove', swatch: ['#ff9a5a', '#e2557a', '#1d5a8a'], blurb: 'A rocking ship, a dock and floating barrels',
    solids: [S(560, 640, 620, 70, { my: 10, per: 300 }), S(250, 690, 170, 60)],
    plats: [P(660, 450, 110, { my: 10, per: 300 }), P(1030, 520, 130, { my: 10, per: 300 }), P(290, 570, 100), P(1260, 610, 90, { my: 14, per: 200 }), P(450, 620, 80, { my: 12, per: 240, ph: 0.4 })],
    cycle: { per: 7200, tint: '#1a1040', max: 0.5 } },
  { id: 'dojo', name: 'Sakura Dojo', swatch: ['#3b2a4a', '#b0689a', '#f7c3d4'], blurb: 'Twin halls, a bridge and swinging beams',
    solids: [S(360, 620, 340, 70), S(900, 620, 340, 70)],
    plats: [P(720, 612, 160), P(420, 490, 120), P(1060, 490, 120), P(590, 395, 120, { mx: 50, per: 420 }), P(890, 395, 120, { mx: 50, per: 420, ph: 0.5 }), P(740, 285, 120)],
    cycle: { per: 7200, tint: '#120a24', max: 0.55 } }
);

function buildStage(def) {
  const st = JSON.parse(JSON.stringify(def));
  st.solids.forEach(s => { s.bx = s.x; s.by = s.y; s.dx = 0; s.dy = 0; });
  st.plats.forEach(p => { p.bx = p.x; p.by = p.y; p.dx = 0; p.dy = 0; p.soft = true; });
  st.surfaces = [...st.solids, ...st.plats];
  st.main = st.solids[0];
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  st.surfaces.forEach(s => {
    minx = Math.min(minx, s.x - (s.mx || 0)); maxx = Math.max(maxx, s.x + s.w + (s.mx || 0));
    miny = Math.min(miny, s.y - (s.my || 0)); if (s.solid) maxy = Math.max(maxy, s.y + s.h);
  });
  st.bounds = { minx, maxx, miny, maxy };
  st.cx = (minx + maxx) / 2;
  const topSolid = Math.min(...st.solids.map(s => s.y));
  st.spawnY = topSolid - 230;
  st.blast = { l: minx - 520, r: maxx + 520, t: Math.min(topSolid - 520, miny - 260), b: maxy + 460 };
  st.frame = -1;
  return st;
}
STAGES.forEach(s => { s.blast = buildStage(s).blast; s.main = s.solids[0]; });

function updateStage(st, frame) {
  if (st.frame === frame) return;
  st.frame = frame;
  const TAU = Math.PI * 2;
  for (const s of st.surfaces) {
    const ox = s.x, oy = s.y;
    if (s.mx) s.x = s.bx + Math.sin(TAU * (frame / s.per + (s.ph || 0))) * s.mx;
    if (s.my) s.y = s.by + Math.sin(TAU * (frame / s.per + (s.ph || 0))) * s.my;
    s.dx = s.x - ox; s.dy = s.y - oy;
    if (Math.abs(s.dx) > 40 || Math.abs(s.dy) > 40) { s.dx = 0; s.dy = 0; }
    if (s.blink) {
      const [on, off, ph] = s.blink, cyc = on + off;
      const k = ((frame + ph * cyc) % cyc + cyc) % cyc;
      s.off = k >= on;
      s.warn = !s.off && on - k < 100;
    }
  }
}

/* ---------- hazards (all driven by the match clock) ---------- */
function lavaState(frame) {
  const cyc = 2400, k = frame % cyc;
  const low = 1, high = 0; // 1 = hidden below, 0 = at peak
  if (frame < 1200) return { lvl: low, warn: false };
  if (k < 1640) return { lvl: low, warn: false };
  if (k < 1820) return { lvl: low, warn: true };
  if (k < 1910) return { lvl: 1 - (k - 1820) / 90, warn: true };
  if (k < 2280) return { lvl: high, warn: false, up: true };
  return { lvl: (k - 2280) / 120, warn: false };
}
function lavaY(st, frame) {
  const m = st.solids[0], s = lavaState(frame);
  const top = m.y - 55, bottom = m.y + m.h + 170;
  return top + (bottom - top) * s.lvl;
}
function windState(frame) {
  const cyc = 3000, k = frame % cyc, n = Math.floor(frame / cyc);
  const dir = n % 2 ? -1 : 1;
  if (frame < 1500) return { on: false };
  if (k >= 2280 && k < 2400) return { on: false, warn: true, dir };
  if (k >= 2400) return { on: true, dir, k: Math.min(1, (k - 2400) / 60) * Math.min(1, (cyc - k) / 60) };
  return { on: false };
}
function lowGravState(frame) {
  const cyc = 2700, k = frame % cyc;
  if (frame < 1300) return { on: false };
  if (k >= 1980 && k < 2100) return { on: false, warn: true };
  if (k >= 2100) return { on: true };
  return { on: false };
}
function rainState(frame) { const k = frame % 4200; return { on: k > 2600, k }; }

function envHit(f, g, dmg, vx, vy) {
  if (f.inv > 0 || f.dead > 0 || f.out || f.halo > 0 || f.vanish) return;
  f.dmg = Math.min(999, f.dmg + dmg * f.ph.dt);
  endAct(f); f.ledge = null; f.flyT = 0; f.helpless = false; f.upUsed = false; f.shielding = false;
  f.vx = vx; f.vy = vy; f.ground = null; f.y -= 2;
  f.hitstun = 30; f.inv = 45;
  emit(g, 'hit', f.x, f.y - f.H / 2, 14, -1);
  g.shake = Math.max(g.shake, 8);
}

function stageHazards(g) {
  const st = g.stage;
  g.gravMul = 1;
  if (st.hazard === 'lava') {
    const ly = lavaY(st, g.frame), ls = lavaState(g.frame), m = st.solids[0];
    for (const f of g.fighters) {
      if (f.out || f.dead || f.vanish) continue;
      if (f.ground && f.y < ly) f.lavaN = 0;                 // safely standing above the lava again
      if (f.y <= ly + 4) continue;
      // the lava pit below the stage is deadly: falling in is a KO (it used to bounce you forever)
      if (ls.lvl >= 0.999 || f.y > m.y + m.h + 30 || (f.lavaN || 0) >= 2) {
        if (f.halo > 0) { f.y = ly - 2; f.vy = Math.min(f.vy, -14); continue; }
        emit(g, 'ignite', f.x, ly); emit(g, 'boom', f.x, ly);
        koF(f, g); continue;
      }
      if (f.inv > 0 || f.halo > 0) continue;
      // risen lava: burn and launch them out, sideways first if they're tucked beside / under the stage
      const tucked = f.y > m.y - 4 && f.x > m.x - 30 && f.x < m.x + m.w + 30 && !f.ground;
      const vx = tucked ? Math.sign(f.x - (m.x + m.w / 2) || 1) * 9 : clamp((st.cx - f.x) * 0.012, -9, 9);
      envHit(f, g, 12, vx, -17 - f.dmg * 0.05);
      f.lavaN = (f.lavaN || 0) + 1; f.hitstun = 20; f.jumps = Math.max(f.jumps, 1);
    }
    for (const p of g.projs) if (p.m.mine && p.y > ly) p.life = 0;
  } else if (st.hazard === 'wind') {
    const w = windState(g.frame);
    if (w.on) {
      for (const f of g.fighters) if (!f.out && !f.dead && !f.ledge && !f.vanish && f.halo <= 0) f.x += w.dir * w.k * (f.ground ? 0.8 : 1.5);
      for (const p of g.projs) if (!p.m.mine) p.x += w.dir * w.k * 1.2;
    }
  } else if (st.hazard === 'lowgrav') {
    if (lowGravState(g.frame).on) g.gravMul = 0.55;
  }
}

/* banner text for stage events (drawn by the renderer) */
function stageBanner(st, frame) {
  if (st.hazard === 'lava') { const s = lavaState(frame); if (s.warn) return ['LAVA RISING!', '#ff7a1a']; }
  if (st.hazard === 'wind') { const w = windState(frame); if (w.warn) return [w.dir > 0 ? 'BLIZZARD →' : '← BLIZZARD', '#cfeaff']; }
  if (st.hazard === 'lowgrav') { const s = lowGravState(frame); if (s.warn) return ['LOW GRAVITY!', '#b89cff']; }
  return null;
}

/* ---------- drawing ---------- */
const STYLE = {
  temple: { top: '#e8d5a8', trim: '#ffcc66', face: '#9c3b34', face2: '#7a2a28', under: ['#5b3a5e', '#2a1b40'], pTop: '#f3e3bd', pUnder: '#9c3b34', cloud: true },
  ruins: { top: '#6dbb4a', trim: '#4f8a3a', face: '#7b7f69', face2: '#5a5d4c', under: ['#3c3f33', '#22251d'], pTop: '#8b8e77', pUnder: '#5a5d4c', moss: true, bricks: true },
  roof: { top: '#3ff2ff', trim: '#3ff2ff', face: '#1e1c33', face2: '#2a2745', under: null, pTop: '#2b2a44', pUnder: '#ff4fd8', neon: true, windows: true, tall: true },
  forge: { top: '#3a3440', trim: '#ff8a1f', face: '#1d1a22', face2: '#ff7a1a', under: ['#151218', '#0a0808'], pTop: '#3a3440', pUnder: '#ff8a1f', cracks: true, chains: true },
  peak: { top: '#ffffff', trim: '#c9ecff', face: '#9fd4f2', face2: '#7fbde3', under: null, pTop: '#ffffff', pUnder: 'rgba(190,235,255,.8)', icicles: true },
  orbit: { top: '#50586e', trim: '#46e0ff', face: '#3b4256', face2: '#2a2f40', under: null, pTop: '#46e0ff', pUnder: 'rgba(70,224,255,.25)', holo: true, thrusters: true },
  cove: { top: '#c9a26a', trim: '#8a5a2c', face: '#6b4424', face2: '#4a2c16', under: null, pTop: '#7a5030', pUnder: '#5a3a22', planks: true },
  dojo: { top: '#c79a63', trim: '#a57a47', face: '#8a4a2e', face2: '#6a3822', under: ['#6a6470', '#3a3440'], pTop: '#a57a47', pUnder: '#c62f2a', lantern: true }
};

function drawSolid(g, s, st, sty, t) {
  const x = s.x, y = s.y, w = s.w, h = s.h;
  if (sty.under) {
    const ug = g.createLinearGradient(0, y + h, 0, y + h + 170); ug.addColorStop(0, sty.under[0]); ug.addColorStop(1, sty.under[1]);
    g.fillStyle = ug; g.beginPath(); g.moveTo(x + 8, y + h); g.lineTo(x + w - 8, y + h); g.lineTo(x + w * 0.62, y + h + 150); g.lineTo(x + w * 0.4, y + h + 180); g.closePath(); g.fill();
  }
  if (sty.tall) { g.fillStyle = sty.face; g.fillRect(x, y, w, st.blast.b - y); for (let yy = y + 40; yy < y + 520; yy += 44) for (let xx = x + 22; xx < x + w - 20; xx += 46) { g.fillStyle = ((xx + yy) % 7) < 2 ? '#ffd27a' : '#2a2745'; g.fillRect(xx, yy, 22, 16); } }
  else { g.fillStyle = sty.face; g.fillRect(x, y, w, h); }
  if (sty.bricks) { g.strokeStyle = sty.face2; g.lineWidth = 2; for (let r = 0; r < 3; r++) { const yy = y + 14 + r * 26; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); for (let xx = x + (r % 2) * 40; xx < x + w; xx += 80) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 26); g.stroke(); } } }
  if (sty.planks) { g.strokeStyle = sty.face2; g.lineWidth = 2; for (let yy = y + 16; yy < y + h; yy += 14) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); } g.fillStyle = '#2a1a0e'; for (let xx = x + 50; xx < x + w - 20; xx += 110) { circle(g, xx, y + h * 0.6, 8); g.fill(); } }
  if (sty.cracks) { g.save(); g.shadowColor = '#ff7a1a'; g.shadowBlur = 12; g.strokeStyle = `rgba(255,${130 + Math.sin(t * 0.08) * 40 | 0},40,.9)`; g.lineWidth = 3; for (let i = 0; i < 4; i++) { const a = x + w * (0.1 + i * 0.24); g.beginPath(); g.moveTo(a, y + h * 0.25); g.lineTo(a + 18, y + h * 0.55); g.lineTo(a + 4, y + h * 0.9); g.stroke(); } g.restore(); }
  if (st.id === 'temple') { g.fillStyle = sty.face2; for (let xx = x + 30; xx < x + w - 20; xx += 70) g.fillRect(xx, y + 18, 16, h - 18); g.fillStyle = sty.trim; for (let xx = x + 20; xx < x + w; xx += 35) { circle(g, xx, y + h - 12, 3); g.fill(); } }
  if (sty.thrusters) {
    g.save(); g.globalCompositeOperation = 'lighter';
    [0.2, 0.5, 0.8].forEach(k => { const xx = x + w * k, l = 55 + Math.random() * 30; const fg2 = g.createLinearGradient(xx, y + h + 30, xx, y + h + 30 + l); fg2.addColorStop(0, '#bff4ff'); fg2.addColorStop(1, 'rgba(70,224,255,0)'); g.fillStyle = fg2; g.beginPath(); g.moveTo(xx - 14, y + h + 30); g.lineTo(xx + 14, y + h + 30); g.lineTo(xx, y + h + 30 + l); g.fill(); });
    g.restore(); g.fillStyle = sty.face2; [0.2, 0.5, 0.8].forEach(k => g.fillRect(x + w * k - 20, y + h, 40, 30));
    g.save(); g.shadowColor = '#46e0ff'; g.shadowBlur = 10; for (let xx = x + 12; xx < x + w - 12; xx += 40) { g.fillStyle = ((xx / 40 + (t >> 3)) % 6 | 0) === 0 ? '#fff' : '#46e0ff'; g.fillRect(xx, y + 26, 22, 4); } g.restore();
  }
  if (sty.icicles) { g.fillStyle = sty.face2; for (let xx = x + 8; xx < x + w - 8; xx += 26) { g.beginPath(); g.moveTo(xx, y + h); g.lineTo(xx + 13, y + h); g.lineTo(xx + 6, y + h + 18 + (xx % 3) * 10); g.fill(); } }
  // top surface
  if (sty.neon) { g.save(); g.shadowColor = neonColor(t); g.shadowBlur = 14; g.fillStyle = neonColor(t); g.fillRect(x - 4, y - 2, w + 8, 5); g.restore(); }
  else if (sty.icicles) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x - 8, y + 6); for (let xx = x - 8; xx <= x + w + 8; xx += 20) g.quadraticCurveTo(xx + 10, y - 8, xx + 20, y + 4); g.lineTo(x + w + 8, y + 10); g.lineTo(x - 8, y + 10); g.fill(); }
  else { g.fillStyle = sty.top; g.fillRect(x - 5, y - (sty.moss ? 4 : 0), w + 10, sty.moss ? 10 : 12); g.fillStyle = sty.trim; g.fillRect(x - 5, y + (sty.moss ? 6 : 11), w + 10, 3); }
  if (sty.moss) { g.strokeStyle = '#3f8a3a'; g.lineWidth = 3; for (let xx = x + 20; xx < x + w; xx += 55) { g.beginPath(); g.moveTo(xx, y + 4); g.quadraticCurveTo(xx + 8 + Math.sin(t * 0.03 + xx) * 4, y + 40, xx + 2, y + 60 + (xx % 30)); g.stroke(); } }
}

function neonColor(t) { const k = (Math.sin(t * 0.004) + 1) / 2; return k < 0.5 ? '#3ff2ff' : '#ff4fd8'; }

function drawPlat(g, p, st, sty, t) {
  let a = 1;
  if (p.off) a = 0.12;
  else if (p.warn && ((t >> 3) & 1)) a = 0.45;
  g.save(); g.globalAlpha = a;
  const x = p.x, y = p.y, w = p.w;
  if (sty.cloud) { g.fillStyle = 'rgba(255,245,235,.55)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x + w * (0.25 + i * 0.25), y + 18, 26, 9, 0, 0, Math.PI * 2); g.fill(); } }
  if (sty.chains) { g.strokeStyle = '#4a4450'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 10, y); g.lineTo(x + 10, y - 500); g.moveTo(x + w - 10, y); g.lineTo(x + w - 10, y - 500); g.stroke(); }
  if (sty.holo) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = sty.pUnder; g.fillRect(x, y, w, 12);
    g.strokeStyle = sty.pTop; g.lineWidth = 2; g.strokeRect(x, y, w, 12);
    for (let xx = x + 6; xx < x + w; xx += 12) { g.fillStyle = 'rgba(160,240,255,.35)'; g.fillRect(xx, y + 3, 6, 6); }
    g.restore();
  } else if (sty.neon) {
    g.fillStyle = sty.pTop; g.fillRect(x, y, w, 10);
    g.save(); g.shadowColor = neonColor(t + 400); g.shadowBlur = 12; g.fillStyle = neonColor(t + 400); g.fillRect(x, y - 2, w, 3); g.restore();
    if (p.my) { g.strokeStyle = '#4a4870'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 8, y); g.lineTo(x + 8, y - 400); g.moveTo(x + w - 8, y); g.lineTo(x + w - 8, y - 400); g.stroke(); }
  } else {
    g.fillStyle = sty.pUnder; g.fillRect(x, y + 6, w, 7);
    g.fillStyle = sty.pTop; g.fillRect(x, y, w, 7);
    if (sty.moss) { g.fillStyle = '#6dbb4a'; g.fillRect(x - 2, y - 3, w + 4, 5); }
    if (sty.lantern) { g.strokeStyle = '#1e1a22'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 14, y + 13); g.lineTo(x + 14, y + 24); g.moveTo(x + w - 14, y + 13); g.lineTo(x + w - 14, y + 24); g.stroke(); g.fillStyle = '#ffd35c'; circle(g, x + 14, y + 30, 5); g.fill(); circle(g, x + w - 14, y + 30, 5); g.fill(); }
  }
  if (p.blink && !p.off) { g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x, y, w, 2); }
  g.restore();
}

function drawStageDecor(g, st, t) {
  if (st.id === 'cove') {
    const ship = st.solids[0], mastX = ship.x + 110;
    g.fillStyle = '#5a3a22'; g.fillRect(mastX - 7, ship.y - 330, 14, 330);
    g.fillStyle = '#f3e6c8'; g.beginPath(); g.moveTo(mastX + 8, ship.y - 300); g.quadraticCurveTo(mastX + 150, ship.y - 230, mastX + 8, ship.y - 120); g.fill();
    g.fillStyle = '#1a1a1a'; g.fillRect(mastX - 6, ship.y - 360, 34, 20);
    g.fillStyle = '#6b4424'; g.beginPath(); g.moveTo(ship.x - 20, ship.y + ship.h); g.lineTo(ship.x + ship.w + 40, ship.y + ship.h); g.lineTo(ship.x + ship.w - 20, ship.y + ship.h + 50); g.lineTo(ship.x + 30, ship.y + ship.h + 50); g.fill();
    const d = st.solids[1]; g.fillStyle = '#4a2c16'; for (let xx = d.x + 10; xx < d.x + d.w; xx += 50) g.fillRect(xx, d.y + d.h, 12, 200);
  }
  if (st.id === 'dojo') {
    st.solids.forEach(s => { [s.x + 12, s.x + s.w - 12].forEach(x => { g.fillStyle = '#c62f2a'; g.fillRect(x - 6, s.y - 150, 12, 150); }); g.fillStyle = '#c62f2a'; g.fillRect(s.x - 10, s.y - 160, s.w + 20, 12); g.fillStyle = '#1e1a22'; g.fillRect(s.x - 20, s.y - 172, s.w + 40, 10); });
  }
}
function drawStageFront(g, st, t) {
  if (st.hazard === 'lava') {
    const ly = lavaY(st, st.frame);
    const lg = g.createLinearGradient(0, ly, 0, ly + 300); lg.addColorStop(0, '#ffcf5a'); lg.addColorStop(0.1, '#ff7a1a'); lg.addColorStop(1, '#6a1005');
    g.fillStyle = lg; g.beginPath(); g.moveTo(st.blast.l, st.blast.b + 200);
    for (let x = st.blast.l; x <= st.blast.r; x += 30) g.lineTo(x, ly + Math.sin(x * 0.02 + t * 0.07) * 5);
    g.lineTo(st.blast.r, st.blast.b + 200); g.fill();
  }
  if (st.id === 'cove') {
    g.fillStyle = 'rgba(20,70,120,.6)'; g.beginPath(); g.moveTo(st.blast.l, st.blast.b + 200);
    const wy = st.solids[1].y + 30;
    for (let x = st.blast.l; x <= st.blast.r; x += 30) g.lineTo(x, wy + Math.sin(x * 0.02 + t * 0.06) * 6);
    g.lineTo(st.blast.r, st.blast.b + 200); g.fill();
  }
}

/* screen-space weather + day/night tint, drawn over the background */
function drawStageSky(g, st, vw, vh, t) {
  const c = st.cycle;
  if (c && c.tint) {
    const k = (1 - Math.cos(Math.PI * 2 * (st.frame / c.per))) / 2;
    if (k > 0.01) {
      g.fillStyle = hexA(c.tint, k * c.max); g.fillRect(0, 0, vw, vh);
      g.fillStyle = `rgba(255,255,255,${k * 0.8})`;
      for (let i = 0; i < 40; i++) { const x = (i * 97.3) % vw, y = (i * 53.7) % (vh * 0.5); g.fillRect(x, y, 1.6, 1.6); }
    }
  }
  if (c && c.neon) { g.fillStyle = hexA(neonColor(t), 0.07); g.fillRect(0, 0, vw, vh); }
  if (st.hazard === 'rain' && rainState(st.frame).on) {
    g.strokeStyle = 'rgba(200,230,255,.35)'; g.lineWidth = 1.5; g.beginPath();
    for (let i = 0; i < 120; i++) { const x = ((i * 71.3 + t * 3) % (vw + 60)) - 30, y = ((i * 131.7 + t * 14) % (vh + 40)) - 20; g.moveTo(x, y); g.lineTo(x - 5, y + 16); }
    g.stroke(); g.fillStyle = 'rgba(10,30,40,.18)'; g.fillRect(0, 0, vw, vh);
  }
  if (st.hazard === 'wind') {
    const w = windState(st.frame);
    if (w.on) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 70; i++) { const y = (i * 61.7) % vh, x = ((i * 113 + t * 18 * w.dir) % (vw + 100) + vw + 100) % (vw + 100) - 50; g.moveTo(x, y); g.lineTo(x - w.dir * 40, y + 3); } g.stroke(); }
  }
  if (st.hazard === 'lowgrav' && lowGravState(st.frame).on) { g.fillStyle = 'rgba(150,110,255,.12)'; g.fillRect(0, 0, vw, vh); }
}

STAGE_ART.temple = {}; STAGE_ART.ruins = {}; STAGE_ART.roof = {};
Object.keys(STYLE).forEach(id => {
  STAGE_ART[id].fg = function (g, st, t) {
    const sty = STYLE[st.id];
    drawStageDecor(g, st, t);
    st.plats.forEach(p => drawPlat(g, p, st, sty, t));
    st.solids.forEach(s => drawSolid(g, s, st, sty, t));
    drawStageFront(g, st, t);
  };
});
