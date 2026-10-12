'use strict';
/* ===== CLOUDTOP BRAWL — how ASHURA the Thousand-Armed looks (drawing only; the rules are in ashura.js) =====
   His spectral arms and three faces, the six weapons, the chakram and the grasping hand, the rush trail,
   the mandala aim, the Thousand-Arm Annihilation finisher, his temple intro, his unlock scene and the trial stage. */

const AS_LOW = () => typeof PERF !== 'undefined' && PERF.low;
const asSeed = n => { const s = Math.sin(n * 71.17 + 1.93) * 43758.5453; return s - Math.floor(s); };
const AS_GOLD = '#ffd35c', AS_GLOW = 'rgba(255,211,92,';
/* a spectral arm from (x, y) at angle a, length L; the hand at the end is a fist or open */
function asArm(g, x, y, a, L, w, open, alpha) {
  g.save(); g.translate(x, y); g.rotate(a); g.globalAlpha *= alpha == null ? 1 : alpha;
  g.strokeStyle = AS_GLOW + '.85)'; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * 0.5, -w * 0.6, L, 0); g.stroke();
  g.fillStyle = '#fff1b8'; g.strokeStyle = '#c9832a'; g.lineWidth = 1.5;
  if (open) { g.beginPath(); g.ellipse(L + w * 0.6, 0, w * 0.9, w * 0.75, 0, 0, Math.PI * 2); g.fill(); g.stroke(); for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(L + w * 1.2, i * w * 0.4); g.lineTo(L + w * 2.0, i * w * 0.55); g.lineWidth = w * 0.35; g.strokeStyle = '#fff1b8'; g.stroke(); } }
  else { g.beginPath(); g.arc(L + w * 0.5, 0, w * 0.75, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.restore();
}
/* a fist flying along angle a */
function asFist(g, x, y, s, a) {
  g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
  g.fillStyle = AS_GLOW + '.35)'; g.beginPath(); g.ellipse(-14, 0, 18, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff1b8'; g.strokeStyle = '#c9832a'; g.lineWidth = 1.5; g.beginPath(); g.roundRect ? g.roundRect(-6, -6, 12, 12, 4) : g.rect(-6, -6, 12, 12); g.fill(); g.stroke();
  g.restore();
}
/* the six weapons (drawn pointing right, from the grip at 0,0) */
function asWeapon(g, i, s) {
  g.save(); g.scale(s, s); g.strokeStyle = OUTLINE; g.lineWidth = 1.5;
  if (i === 0) { g.fillStyle = '#e8eef4'; g.beginPath(); g.moveTo(4, -3); g.lineTo(46, -1); g.lineTo(52, 0); g.lineTo(46, 3); g.lineTo(4, 3); g.closePath(); g.fill(); g.stroke(); g.fillStyle = AS_GOLD; g.fillRect(-2, -6, 6, 12); }   // blade
  else if (i === 1) { g.fillStyle = '#8a5a2a'; g.fillRect(-10, -1.5, 66, 3); g.fillStyle = '#e8eef4'; g.beginPath(); g.moveTo(56, -5); g.lineTo(72, 0); g.lineTo(56, 5); g.closePath(); g.fill(); g.stroke(); }   // spear
  else if (i === 2) { g.fillStyle = '#8a5a2a'; g.fillRect(0, -2, 34, 4); g.fillStyle = AS_GOLD; circle(g, 40, 0, 11); g.fill(); g.stroke(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.beginPath(); g.moveTo(40 + Math.cos(a) * 10, Math.sin(a) * 10); g.lineTo(40 + Math.cos(a) * 15, Math.sin(a) * 15); g.stroke(); } }   // mace
  else if (i === 3) { g.strokeStyle = AS_GOLD; g.lineWidth = 4; circle(g, 14, 0, 12); g.stroke(); }   // chakram
  else if (i === 4) { g.fillStyle = '#8a5a2a'; g.fillRect(-6, -1.5, 52, 3); g.strokeStyle = AS_GOLD; g.lineWidth = 3; g.beginPath(); g.moveTo(46, -10); g.lineTo(46, 10); g.moveTo(46, -10); g.lineTo(58, -10); g.moveTo(46, 0); g.lineTo(62, 0); g.moveTo(46, 10); g.lineTo(58, 10); g.stroke(); }   // trident
  else { g.fillStyle = AS_GOLD; g.beginPath(); g.ellipse(14, 0, 14, 5, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.moveTo(0, 0); g.lineTo(-6, -6); g.moveTo(0, 0); g.lineTo(-6, 6); g.moveTo(28, 0); g.lineTo(34, -6); g.moveTo(28, 0); g.lineTo(34, 6); g.strokeStyle = AS_GOLD; g.lineWidth = 2.5; g.stroke(); }   // vajra
  g.restore();
}

/* ---------- his look: four spectral arms behind him, three faces, golden ornaments ---------- */
const LOOK_ASHURA = {
  back(g, K) {
    const { sw, shY, t, f } = K, busy = f && (f.hot || f.mv), sp = busy ? 0.3 : 0.06;
    const fan = [[-2.5, 0], [-2.0, 3], [-1.15, 5], [-0.65, 3]];
    fan.forEach(([a, wi], i) => {
      const sway = Math.sin(t * sp + i * 1.3) * 0.12;
      asArm(g, -sw * 0.05, shY + 8, a + sway, 34 + (i % 2) * 6, 5, i % 2 === 0, K.portrait ? 0.9 : 0.75);
      if (!K.portrait) { g.save(); g.translate(-sw * 0.05, shY + 8); g.rotate(a + sway); g.translate(44 + (i % 2) * 6, 0); g.rotate(-0.4); asWeapon(g, wi, 0.42); g.restore(); }
    });
  },
  torso(g, K) {   // a golden chest ornament and a red sash
    const { sw, shY, hipY } = K;
    g.strokeStyle = AS_GOLD; g.lineWidth = 3; g.beginPath(); g.arc(0, shY + 2, sw * 0.38, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.fillStyle = AS_GOLD; circle(g, 0, shY + sw * 0.38 + 2, 3.5); g.fill();
    g.fillStyle = '#c4161c'; g.fillRect(-sw * 0.5, hipY - 8, sw, 6);
  },
  head(g, K) {   // two more faces at the sides, a third eye and a flame-like crown
    const { hx, hy, hr, t } = K;
    for (const s of [-1, 1]) {   // side faces
      g.save(); g.translate(hx - hr * 0.75 * s - hr * 0.1, hy + hr * 0.05); g.scale(0.55, 0.55);
      g.fillStyle = '#b57a3e'; g.strokeStyle = OUTLINE; g.lineWidth = 2.5; circle(g, 0, 0, hr); g.fill(); g.stroke();
      g.fillStyle = '#1a0a06'; g.fillRect(-s * hr * 0.4 - 2, -hr * 0.15, 5, 2.5); g.restore();
    }
    g.fillStyle = '#ff6a2a'; g.beginPath(); g.ellipse(hx + hr * 0.25, hy - hr * 0.45, 1.8, 3.4, 0, 0, Math.PI * 2); g.fill();   // third eye
    g.fillStyle = AS_GOLD; g.strokeStyle = OUTLINE; g.lineWidth = 1.5;   // crown of flames
    g.beginPath(); g.moveTo(hx - hr * 0.7, hy - hr * 0.75);
    for (let i = 0; i < 5; i++) { const x = hx - hr * 0.7 + (i + 0.5) * hr * 0.28, up = (i === 2 ? 1.0 : 0.6) * hr + Math.sin(t * 0.15 + i) * 1.5; g.lineTo(x, hy - hr * 0.75 - up); g.lineTo(x + hr * 0.14, hy - hr * 0.8); }
    g.lineTo(hx + hr * 0.7, hy - hr * 0.75); g.closePath(); g.fill(); g.stroke();
  },
  hand(g, K) {   // golden armlets that glow
    const [x, y] = K.hand;
    g.strokeStyle = AS_GOLD; g.lineWidth = 3; circle(g, x, y - 8, 5); g.stroke();
    if (!K.portrait) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = AS_GLOW + '.25)'; circle(g, x, y, 9); g.fill(); g.restore(); }
  }
};
if (typeof lookHook === 'function') {
  const lookHookNoAshura = lookHook;
  lookHook = function (g, part, K) {
    if (K.has('ashura')) { LOOK_ASHURA[part] && LOOK_ASHURA[part](g, K); return; }
    lookHookNoAshura(g, part, K);
  };
}

/* ---------- projectiles: the chakram and the grasping hand ---------- */
if (typeof PROJ_NEW !== 'undefined') Object.assign(PROJ_NEW, {
  chakram(g, p, t, x, y, r, dir) {   // a spinning golden ring with blades
    g.save(); g.translate(x, y); g.rotate(t * 0.6);
    g.globalCompositeOperation = 'lighter'; g.fillStyle = AS_GLOW + '.25)'; circle(g, 0, 0, r * 1.6); g.fill(); g.globalCompositeOperation = 'source-over';
    g.strokeStyle = OUTLINE; g.lineWidth = 6; circle(g, 0, 0, r); g.stroke(); g.strokeStyle = AS_GOLD; g.lineWidth = 4; circle(g, 0, 0, r); g.stroke();
    g.fillStyle = '#fff1b8'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.lineTo(Math.cos(a + 0.35) * r * 1.45, Math.sin(a + 0.35) * r * 1.45); g.lineTo(Math.cos(a + 0.4) * r, Math.sin(a + 0.4) * r); g.fill(); }
    g.restore();
  },
  graspHand(g, p, t, x, y, r, dir) {   // a giant spectral hand bursting out of the floor
    const age = p.age != null ? p.age : 20, base = p.base != null ? p.base : y, held = !!p.armed;
    const rise = p.m ? Math.min(1, age / p.m.rise) : 1, top = held ? y : base - 130 * rise, w = 34;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const gl = g.createRadialGradient(x, base, 0, x, base, 90); gl.addColorStop(0, AS_GLOW + '.5)'); gl.addColorStop(1, AS_GLOW + '0)'); g.fillStyle = gl; g.fillRect(x - 90, base - 40, 180, 50);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = AS_GLOW + '.55)'; g.strokeStyle = '#c9832a'; g.lineWidth = 2;   // the forearm
    g.beginPath(); g.moveTo(x - w * 0.6, base); g.lineTo(x - w * 0.5, top + 30); g.lineTo(x + w * 0.5, top + 30); g.lineTo(x + w * 0.6, base); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,241,184,.85)';   // the hand: open while it rises, a closed fist while it holds someone
    if (held) { g.beginPath(); g.ellipse(x, top + 18, w * 0.95, w * 0.75, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.strokeStyle = '#c9832a'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x + i * 12, top); g.lineTo(x + i * 12, top + 14); g.stroke(); } }
    else {
      g.beginPath(); g.ellipse(x, top + 22, w * 0.8, w * 0.6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.32, L = i === 0 || i === 4 ? 26 : 34; g.save(); g.translate(x + (i - 2) * 10, top + 14); g.rotate(a + Math.PI / 2); g.beginPath(); g.ellipse(0, -L / 2, 5, L / 2, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore(); }
    }
    g.restore();
  }
});

/* ---------- move effects ---------- */
if (typeof fxEventNew === 'function') {
  const fxEventNoAshura = fxEventNew;
  fxEventNew = function (type, x, y, a, b, col) {
    switch (type) {
      case 'arsenal': spawnFx({ k: 'asweap', x, y, w: a >> 1, d: a & 1 ? 1 : -1, life: [22, 26, 36, 18, 26, 30][a >> 1] }); return;
      case 'ashmark': spawnFx({ k: 'asmark', x, y, d: a || 1, life: 30 }); return;
      case 'armburst': spawnFx({ k: 'asburst', x, y, r: a || 54, life: 16, seed: Math.random() * 10 }); spawnFx({ k: 'ring', x, y, life: 12, r0: 8, r1: (a || 54) * 1.1, col: AS_GOLD, lw: 4 }); return;
      case 'climb': spawnFx({ k: 'asclimb', x, y, ang: a / 100, life: 14 }); return;
      case 'grasp': spawnFx({ k: 'ring', x, y, life: 16, r0: 70, r1: 10, col: AS_GOLD, lw: 3 }); for (let i = 0; i < 8; i++) spawnFx({ k: 'spark', x: x + (Math.random() - 0.5) * 80, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 4, life: 18, col: AS_GOLD, size: 3 }); return;
      case 'grabbed': spawnFx({ k: 'ring', x, y, life: 12, r0: 10, r1: 60, col: '#ff6a2a', lw: 4 }); return;
      case 'graspmiss': for (let i = 0; i < 6; i++) spawnFx({ k: 'smoke', x: x + (Math.random() - 0.5) * 40, y, vx: (Math.random() - 0.5) * 2, vy: -1, life: 18, col: 'rgba(255,230,160,.4)', size: 8 }); return;
      case 'slamhand': spawnFx({ k: 'ring', x, y, life: 20, r0: 20, r1: 150, col: AS_GOLD, lw: 7 }); spawnFx({ k: 'flash', life: 6, a: 0.25, col: '255,211,92' }); return;
    }
    fxEventNoAshura(type, x, y, a, b, col);
  };
}
if (typeof drawFxNew === 'function') {
  const drawFxNoAshura = drawFxNew;
  drawFxNew = function (g, p, k) {
    if (p.k === 'asweap') {   // the weapon appears in a spectral hand, then swings / thrusts / smashes / flies / rises / bursts
      const W = p.w, d = p.d, swing = Math.min(1, Math.max(0, (k - 0.25) / 0.45));
      g.save(); g.translate(p.x, p.y); g.scale(d, 1); g.globalAlpha = Math.min(1, (1 - k) * 3);
      if (W === 0) { g.rotate(-1.2 + swing * 2.0); asWeapon(g, 0, 1.15); if (swing > 0 && swing < 1) { g.strokeStyle = AS_GLOW + '.6)'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 58, -1.2, -1.2 + swing * 2.0); g.stroke(); } }
      else if (W === 1) { g.translate(-20 + swing * 40, 0); asWeapon(g, 1, 1.1); }
      else if (W === 2) { g.rotate(-2.2 + swing * 2.6); asWeapon(g, 2, 1.2); if (swing >= 1) { g.globalAlpha *= 0.6; g.strokeStyle = AS_GOLD; g.lineWidth = 4; circle(g, 46, 0, 10 + (k - 0.7) * 120); g.stroke(); } }
      else if (W === 3) { if (k < 0.5) { g.rotate(-0.6); asWeapon(g, 3, 1.2); } }
      else if (W === 4) { g.rotate(-Math.PI / 2 * (0.3 + swing * 0.7)); g.translate(swing * 20, 0); asWeapon(g, 4, 1.1); }
      else {   // vajra: held up, then lightning in every direction
        g.translate(0, -20); asWeapon(g, 5, 1.2);
        if (swing > 0) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#bfe8ff'; g.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2, R = 30 + swing * 70; g.beginPath(); g.moveTo(14, 0); g.lineTo(14 + Math.cos(a) * R * 0.5 + 6, Math.sin(a) * R * 0.5 - 6); g.lineTo(14 + Math.cos(a) * R, Math.sin(a) * R); g.stroke(); } }
      }
      g.restore(); return;
    }
    if (p.k === 'asmark') { g.globalAlpha = (1 - k) * 0.9; g.fillStyle = AS_GLOW + '.5)'; circle(g, p.x, p.y, 16 + k * 6); g.fill(); asFist(g, p.x, p.y, 0.9, p.d > 0 ? Math.PI : 0); return; }
    if (p.k === 'asburst') {   // fists punch out in every direction
      g.globalAlpha = 1 - k;
      for (let i = 0; i < 6; i++) { const a = p.seed + i * Math.PI / 3, R = 8 + k * p.r; asFist(g, p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, 1.1, a); }
      return;
    }
    if (p.k === 'asclimb') { g.globalAlpha = 1 - k; asArm(g, p.x, p.y, p.ang, 40 + k * 50, 6, true, 1); return; }
    drawFxNoAshura(g, p, k);
  };
}
if (typeof SKFX_EVENTS !== 'undefined') Object.assign(SKFX_EVENTS, { ashmark: 1, armburst: 1, climb: 1, grasp: 1, slamhand: 1 });

/* ---------- the mandala aim ---------- */
if (typeof drawUltAimRemake === 'function') {
  const drawUltAimNoAshura = drawUltAimRemake;
  drawUltAimRemake = function (g, view, t) {
    const u = view.ult, f = view.fighters.find(x => x.slot === u.slot); if (!f) return false;
    const def = ultDef(f.c); if (def.aim !== 'mandala') return drawUltAimNoAshura(g, view, t);
    const B = view.stage.blast, lock = u.ph === 'lock', R = ULT_R;
    g.save();
    g.fillStyle = 'rgba(30,6,4,.5)'; g.fillRect(B.l - 400, B.t - 400, B.r - B.l + 800, B.b - B.t + 800);
    const col = lock ? (Math.floor(t / 3) % 2 ? '#ff3b2a' : '#ffffff') : AS_GOLD;
    g.translate(u.ax, u.ay);
    g.save(); g.rotate(t * 0.02); g.strokeStyle = col; g.lineWidth = 2;
    for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.beginPath(); g.ellipse(R * 0.62, 0, R * 0.3, R * 0.11, 0, 0, Math.PI * 2); g.stroke(); }
    g.restore();
    g.save(); g.rotate(-t * 0.03); if (!AS_LOW()) for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); asArm(g, R * 0.95, 0, 0, 18, 3, i % 2 === 0, 0.8); } g.restore();
    g.strokeStyle = col; g.lineWidth = 3; circle(g, 0, 0, R); g.stroke(); circle(g, 0, 0, R * 0.3); g.stroke();
    g.fillStyle = '#ff6a2a'; g.beginPath(); g.ellipse(0, 0, 4, 8, 0, 0, Math.PI * 2); g.fill();   // the third eye at the centre
    g.font = '700 15px "Chakra Petch", system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = col;
    g.fillText(lock ? 'A THOUSAND ARMS ANSWER' : 'CHOOSE YOUR JUDGMENT', 0, -R - 16);
    if (!lock) { g.strokeStyle = AS_GOLD; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, R + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, u.aim) / ULT_AIM); g.stroke(); }
    g.restore();
    return true;
  };
}

/* ---------- the finisher: a giant golden Ashura, a storm of fists, then the great clap ---------- */
if (typeof drawUltWorldRemake === 'function') {
  const drawUltWorldNoAshura = drawUltWorldRemake;
  drawUltWorldRemake = function (g, view, c, t) {
    const { f, tg, def, k } = c;
    if (def.style !== 'asura') return drawUltWorldNoAshura(g, view, c, t);
    const FIN = ULT_FX_FINAL * ULT_ART, low = AS_LOW();
    g.save();
    tg.forEach((o, j) => {
      const x = o.x, y = o.y - o.H / 2, fin = k >= FIN, p = fin ? Math.min(1, (k - FIN) / 22) : 0, show = Math.min(1, k / 14);
      // the giant golden Ashura behind them, arms fanned out
      g.save(); g.globalAlpha = show * (fin ? 1 - p * 0.7 : 0.6); g.globalCompositeOperation = 'lighter';
      const gx = x, gy = y - 40, S = 2.6;
      g.fillStyle = AS_GLOW + '.18)'; g.beginPath(); g.ellipse(gx, gy + 70 * S * 0.5, 40 * S, 70 * S, 0, 0, Math.PI * 2); g.fill();
      circle(g, gx, gy - 30 * S, 18 * S); g.fill();
      if (!low) for (let i = 0; i < 12; i++) { const a = -Math.PI + (i + 0.5) * Math.PI / 12 + Math.sin(k * 0.1 + i) * 0.05; asArm(g, gx, gy, a, 70 * S * show, 10, i % 2 === 0, 0.55); }
      g.restore();
      if (!fin) {   // the storm of fists: one volley per hit, and a steady rain in between
        const n = low ? 6 : 14;
        for (let i = 0; i < n; i++) { const a = asSeed(i + j * 7) * Math.PI * 2, q = ((k * 0.09 + asSeed(i + 3)) % 1), R = 220 * (1 - q); asFist(g, x + Math.cos(a) * R, y + Math.sin(a) * R, 1.4, a + Math.PI); }
        urmHits(def).forEach(at => { const q = (k - at + 4) / 8; if (q < 0 || q > 1) return; g.strokeStyle = AS_GLOW + (1 - q) + ')'; g.lineWidth = 5; circle(g, x, y, 16 + q * 60); g.stroke(); });
      } else {   // two colossal hands clap together on them
        const gap = Math.max(0, 1 - p * 3) * 260;
        for (const s of [-1, 1]) {   // a giant open hand, fingers up, flat palm toward them
          g.save(); g.translate(x + s * (gap + 34), y + 40); g.scale(s, 1);
          g.fillStyle = 'rgba(255,241,184,.92)'; g.strokeStyle = '#c9832a'; g.lineWidth = 3;
          g.beginPath(); g.moveTo(-6, 70); g.lineTo(-24, 70); g.lineTo(-30, -10); g.lineTo(0, -40); g.lineTo(6, 0); g.closePath(); g.fill(); g.stroke();   // palm and wrist
          for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(-4 - i * 7, -66 + Math.abs(i - 1.5) * 8, 6, 30, -0.05 * i, 0, Math.PI * 2); g.fill(); g.stroke(); }   // fingers
          g.beginPath(); g.ellipse(-34, -8, 6, 20, -0.7, 0, Math.PI * 2); g.fill(); g.stroke();   // thumb
          g.restore();
        }
        if (gap === 0) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = AS_GLOW + (1 - p) + ')'; g.lineWidth = 9; circle(g, x, y, 30 + p * 240); g.stroke(); circle(g, x, y, 10 + p * 140); g.stroke(); g.globalCompositeOperation = 'source-over'; }
      }
    });
    g.restore();
    return true;
  };
}

/* ---------- his opening scene: a temple at dusk, the arms unfold pair by pair, three faces open their eyes ---------- */
if (typeof UI_SCENES !== 'undefined') {
  UI_SCENES.asura = function (o) {
    const { g, f, k, vw, vh, S, cx, low } = o, gy = vh * 0.84;
    const sky = g.createLinearGradient(0, 0, 0, vh); sky.addColorStop(0, '#1a0410'); sky.addColorStop(0.6, '#8a2a12'); sky.addColorStop(1, '#ff8a3a');
    g.fillStyle = sky; g.fillRect(0, 0, vw, vh);
    const sun = g.createRadialGradient(cx, vh * 0.55, 10, cx, vh * 0.55, 150 * S); sun.addColorStop(0, '#ff6a2a'); sun.addColorStop(1, 'rgba(196,22,28,0)'); g.fillStyle = sun; circle(g, cx, vh * 0.55, 150 * S); g.fill();   // the setting sun behind him
    g.fillStyle = '#2a0808';   // temple pillars and roof
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) g.fillRect(cx + s * (260 + i * 120) * S - 16 * S, vh * 0.3, 32 * S, gy - vh * 0.3);
    g.beginPath(); g.moveTo(cx - vw * 0.5, vh * 0.3); g.quadraticCurveTo(cx, vh * 0.12, cx + vw * 0.5, vh * 0.3); g.lineTo(cx + vw * 0.5, vh * 0.34); g.lineTo(cx - vw * 0.5, vh * 0.34); g.fill();
    g.fillRect(0, gy, vw, vh - gy);
    // the arms unfold behind him, a pair at a time
    const pairs = 6, by = gy - 150 * S;
    for (let i = 0; i < pairs; i++) {
      const q = uiOut(uiSeg(k, 6 + i * 5, 16 + i * 5)); if (q <= 0) continue;
      for (const s of [-1, 1]) { const a = -Math.PI / 2 + s * (0.3 + i * 0.4) * q; asArm(g, cx, by, a, (170 + i * 8) * S * q, 11 * S, i % 2 === 0, 1); }
    }
    uiFig(g, f, cx, gy, 210 * S, k > 46 ? 'power' : 'idle', 1);
    // the three faces open their eyes
    if (k > 40) { const e = uiSeg(k, 40, 46); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,106,42,${e})`;
      [[-28, 0], [0, -6], [28, 0]].forEach(([dx, dy]) => { circle(g, cx + dx * S, gy - 186 * S + dy * S, 5 * S); g.fill(); circle(g, cx + dx * S, gy - 186 * S + dy * S, 12 * S * e); g.fill(); }); g.restore(); }
    if (!low) for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(255,211,92,${0.4 + 0.4 * asSeed(i)})`; circle(g, asSeed(i + 4) * vw, (asSeed(i + 9) * vh - k * 2 * S + vh) % vh, 2 * S); g.fill(); }   // embers
    if (k > 52) { g.font = `${Math.round(26 * S)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.globalAlpha = uiSeg(k, 52, 60); g.lineWidth = 6 * S; g.strokeStyle = '#1a0406'; g.strokeText('THOUSAND-ARM ANNIHILATION', cx, vh * 0.1); g.fillStyle = AS_GOLD; g.fillText('THOUSAND-ARM ANNIHILATION', cx, vh * 0.1); g.globalAlpha = 1; }
  };
}

/* ---------- his unlock scene: a stone statue on a stormy mountain cracks open (unlock-fx.js loads later) ---------- */
function asUnlockScene() {
  if (typeof UNL_SCENES === 'undefined') return;
  UNL_SCENES.ashura = function (g, c, k, vw, vh, S, low) {
    const sky = g.createLinearGradient(0, 0, 0, vh); sky.addColorStop(0, '#06040c'); sky.addColorStop(1, '#2a1420');
    g.fillStyle = sky; g.fillRect(0, 0, vw, vh);
    const gy = vh * 0.82, cx = vw / 2;
    g.fillStyle = '#120a10'; g.beginPath(); g.moveTo(0, gy); g.lineTo(vw * 0.2, vh * 0.5); g.lineTo(vw * 0.35, gy); g.lineTo(vw * 0.62, vh * 0.42); g.lineTo(vw * 0.85, gy); g.lineTo(vw, vh * 0.55); g.lineTo(vw, vh); g.lineTo(0, vh); g.fill();   // mountains
    // lightning strikes the statue
    const bolts = [1.0, 1.8, 2.4]; let fl = 0;
    bolts.forEach((b0, i) => { const d = k - b0; if (d < 0 || d > 0.25) return; fl = Math.max(fl, 1 - d / 0.25);
      g.strokeStyle = '#e8f4ff'; g.lineWidth = 4 * S; g.beginPath(); let x = cx + (i - 1) * 60 * S, y = 0; g.moveTo(x, y); while (y < gy - 240 * S) { x += (asSeed(i * 9 + y) - 0.5) * 60 * S; y += 40 * S; g.lineTo(x, y); } g.stroke(); });
    // the stone statue: arms fanned out, then gold shines through the cracks, then it shatters
    const crack = unlSeg(k, 1.0, 2.8), burst = unlSeg(k, 2.8, 3.3);
    if (burst < 1) {
      g.save(); g.globalAlpha = 1 - burst;
      for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const a = -Math.PI / 2 + s * (0.4 + i * 0.36); g.save(); g.translate(cx, gy - 170 * S); g.rotate(a); g.fillStyle = '#5a5560'; g.fillRect(0, -7 * S, 120 * S, 14 * S); circle(g, 126 * S, 0, 11 * S); g.fill(); g.restore(); }
      unlFighter(g, c, cx, gy, 230 * S, 'idle', 1, '#5a5560', 1);
      g.strokeStyle = `rgba(255,211,92,${crack})`; g.lineWidth = 3 * S;
      for (let i = 0; i < 8; i++) { if (i / 8 > crack) break; g.beginPath(); let x = cx + (asSeed(i) - 0.5) * 80 * S, y = gy - asSeed(i + 3) * 220 * S; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (asSeed(i * 5 + j) - 0.5) * 40 * S; y += 18 * S; g.lineTo(x, y); } g.stroke(); }
      g.restore();
    }
    if (k > 2.8) {   // the real Ashura, his arms of light
      const q = unlOut(unlSeg(k, 2.8, 3.6));
      for (let i = 0; i < 6; i++) for (const s of [-1, 1]) asArm(g, cx, gy - 170 * S, -Math.PI / 2 + s * (0.4 + i * 0.36) * q, 120 * S * q, 9 * S, i % 2 === 0, 0.9);
      unlFighter(g, c, cx, gy, 230 * S, 'power', 1, false, unlSeg(k, 2.8, 3.2));
      if (burst < 1) for (let i = 0; i < (low ? 10 : 24); i++) { const a = asSeed(i) * Math.PI * 2, R = burst * 300 * S; g.fillStyle = '#5a5560'; g.fillRect(cx + Math.cos(a) * R, gy - 120 * S + Math.sin(a) * R, 10 * S, 8 * S); }
    }
    if (fl > 0) { g.fillStyle = `rgba(232,244,255,${fl * 0.6})`; g.fillRect(0, 0, vw, vh); }
    if (k > 0.4 && k < 2.8) { g.font = `${Math.round(22 * S)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = AS_GOLD; g.fillText('A thousand arms. One will.', cx, vh * 0.14); }
  };
}
if (typeof window !== 'undefined') { if (document.readyState === 'complete') asUnlockScene(); else window.addEventListener('load', asUnlockScene); }

/* ---------- the Temple of a Thousand Arms (the trial's stage) ---------- */
if (typeof STAGE_ART !== 'undefined' && typeof evPlat === 'function') {
  const LOOK = ['#c4161c', AS_GOLD, '#5a2a1a', '#3a1610', '#8a7a6a', '#5a4a3a', 'tiles'];
  STAGE_ART.temple1000 = {
    bg(g, vw, vh, cam, t) {
      const px = cam.x - 800, gr = g.createLinearGradient(0, 0, 0, vh);
      gr.addColorStop(0, '#1a0410'); gr.addColorStop(0.55, '#7a2412'); gr.addColorStop(1, '#ff9a4a');
      g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
      evSilhouette(g, vw, vh, px, '#3a0e10', 0.62, 'peaks', 0);   // far mountains
      // the giant statue behind the temple, arms fanned out
      const sx = vw * 0.5 - px * 0.03, sy = vh * 0.5;
      g.save(); g.fillStyle = '#2a0a0c';
      for (let i = 0; i < 8; i++) for (const s of [-1, 1]) { g.save(); g.translate(sx, sy); g.rotate(-Math.PI / 2 + s * (0.35 + i * 0.3)); g.fillRect(0, -7, vh * 0.3, 14); circle(g, vh * 0.3 + 6, 0, 10); g.fill(); g.restore(); }
      g.beginPath(); g.ellipse(sx, sy + vh * 0.12, vh * 0.1, vh * 0.2, 0, 0, Math.PI * 2); g.fill(); circle(g, sx, sy - vh * 0.1, vh * 0.06); g.fill();
      g.fillStyle = `rgba(255,106,42,${0.5 + Math.sin(t * 0.03) * 0.3})`; circle(g, sx, sy - vh * 0.11, 3); g.fill();   // its third eye
      g.restore();
      evSilhouette(g, vw, vh, px, '#1e0608', 0.82, 'pagodas', 1);
      g.save(); evParticles(g, vw, vh, t, 'spark', ['#ffd35c', '#ff8a3a']); g.restore();   // embers
    },
    fg(g, st, t) {
      st.plats.forEach(p => evPlat(g, p, LOOK, t));
      st.solids.forEach(x => evSolid(g, x, st, LOOK, t));
      if (typeof drawStageFront === 'function') drawStageFront(g, st, t);
    }
  };
}
