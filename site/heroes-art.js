'use strict';
/* ===== CLOUDTOP BRAWL — how the Sky Road heroes look (drawing only; the rules are in heroes.js) =====
   Marlowe the Puppeteer, Terra Vale the Architect, Astra Quill the Star Cartographer:
   their outfits, projectiles, move effects, ultimate sights, finishers, opening scenes and unlock scenes. */

const HA_LOW = () => typeof PERF !== 'undefined' && PERF.low;
const haSeed = n => { const s = Math.sin(n * 91.345 + 7.13) * 43758.5453; return s - Math.floor(s); };
const haSeg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const haOut = k => 1 - Math.pow(1 - k, 3);
function haStar(g, x, y, r, n, inner) { g.beginPath(); for (let i = 0; i < (n || 5) * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / (n || 5), rr = i % 2 ? r * (inner || 0.45) : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }

/* ---------- outfits ---------- */
const LOOK_MARLOWE = {
  back(g, K) {   // a long theatre cape, deep red inside
    const { sw, shY, hipY, legL, t, f } = K, wv = Math.sin(t * 0.09) * 5 + (f && f.pose === 'run' ? Math.sin(t * 0.3) * 6 : 0);
    g.beginPath(); g.moveTo(-sw * 0.4, shY); g.lineTo(sw * 0.25, shY); g.quadraticCurveTo(-sw * 0.2 + wv, hipY, -sw * 0.35 + wv, hipY + legL * 0.95);
    g.lineTo(-sw * 1.1 + wv * 1.4, hipY + legL * 0.85); g.quadraticCurveTo(-sw * 0.9, hipY - 8, -sw * 0.4, shY); g.closePath();
    fillStroke(g, '#1a0c1e', 2.5);
    g.strokeStyle = '#a8122a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-sw * 0.35 + wv, hipY + legL * 0.92); g.lineTo(-sw * 1.05 + wv * 1.4, hipY + legL * 0.83); g.stroke();
  },
  torso(g, K) {   // waistcoat, gold buttons, a big bow tie
    const { sw, shY, hipY, torsoH } = K;
    g.fillStyle = '#5a1a3a'; g.beginPath(); g.moveTo(-sw * 0.3, shY + 6); g.lineTo(sw * 0.36, shY + 6); g.lineTo(sw * 0.3, hipY - 4); g.lineTo(-sw * 0.24, hipY - 4); g.closePath(); g.fill();
    g.fillStyle = '#e8c35a'; for (let i = 0; i < 3; i++) { circle(g, sw * 0.06, shY + torsoH * (0.35 + i * 0.18), 2.4); g.fill(); }
    g.beginPath(); g.moveTo(sw * 0.06, shY + 5); g.lineTo(-sw * 0.12, shY - 2); g.lineTo(-sw * 0.12, shY + 12); g.closePath(); fillStroke(g, '#a8122a', 1.5);
    g.beginPath(); g.moveTo(sw * 0.06, shY + 5); g.lineTo(sw * 0.24, shY - 2); g.lineTo(sw * 0.24, shY + 12); g.closePath(); fillStroke(g, '#a8122a', 1.5);
  },
  head(g, K) {   // a tall top hat with a gold band, a curled moustache
    const { hx, hy, hr } = K;
    g.beginPath(); g.ellipse(hx + hr * 0.1, hy - hr * 0.72, hr * 1.25, hr * 0.22, 0, 0, Math.PI * 2); fillStroke(g, '#140a16', 2);
    g.beginPath(); g.rect(hx - hr * 0.62, hy - hr * 2.05, hr * 1.42, hr * 1.35); fillStroke(g, '#140a16', 2);
    g.fillStyle = '#e8c35a'; g.fillRect(hx - hr * 0.62, hy - hr * 0.98, hr * 1.42, hr * 0.2);
    g.strokeStyle = '#1a1020'; g.lineWidth = 2.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx + hr * 0.55, hy + hr * 0.32); g.quadraticCurveTo(hx + hr * 0.95, hy + hr * 0.2, hx + hr * 1.05, hy + hr * 0.02); g.stroke();
    g.beginPath(); g.moveTo(hx + hr * 0.55, hy + hr * 0.32); g.quadraticCurveTo(hx + hr * 0.2, hy + hr * 0.22, hx + hr * 0.08, hy + hr * 0.05); g.stroke();
  },
  hand(g, K) {   // the puppeteer's wooden control cross, strings hanging down
    const [x, y] = K.hand, t = K.t;
    g.save(); g.translate(x, y - 6); g.rotate(Math.sin(t * 0.1) * 0.15);
    g.fillStyle = '#8a5a2a'; g.strokeStyle = OUTLINE; g.lineWidth = 1.5;
    g.fillRect(-12, -2, 24, 4); g.strokeRect(-12, -2, 24, 4); g.fillRect(-2, -10, 4, 18); g.strokeRect(-2, -10, 4, 18);
    if (!K.portrait) { g.strokeStyle = 'rgba(232,195,90,.7)'; g.lineWidth = 1; [-11, 0, 11].forEach((d, i) => { g.beginPath(); g.moveTo(d, 0); g.lineTo(d + Math.sin(t * 0.12 + i) * 3, 26); g.stroke(); }); }
    g.restore();
  }
};
const LOOK_TERRA = {
  back(g, K) {   // a rolled-up blueprint in a tube on her back
    const { sw, shY, torsoH } = K;
    g.save(); g.translate(-sw * 0.45, shY + torsoH * 0.4); g.rotate(-0.5);
    g.beginPath(); g.rect(-6, -torsoH * 0.7, 12, torsoH * 1.2); fillStroke(g, '#2a5a8a', 2);
    g.fillStyle = '#9fd0ff'; g.fillRect(-6, -torsoH * 0.7, 12, 5); g.restore();
  },
  torso(g, K) {   // hi-vis vest stripes, a tool belt
    const { sw, shY, hipY, torsoH } = K;
    g.fillStyle = '#f2f2e8'; g.fillRect(-sw * 0.42, shY + torsoH * 0.38, sw * 0.84, 4); g.fillRect(-sw * 0.42, shY + torsoH * 0.62, sw * 0.84, 4);
    g.fillStyle = '#5a3a1a'; g.fillRect(-sw * 0.5, hipY - 7, sw, 7);
    [[-0.3, '#9aa3ad'], [0.1, '#c4562a'], [0.32, '#ffd35c']].forEach(([a, c]) => { g.fillStyle = c; g.fillRect(sw * a, hipY - 4, 5, 9); });
  },
  head(g, K) {   // a yellow hard hat with a lamp
    const { hx, hy, hr } = K;
    g.beginPath(); g.arc(hx + hr * 0.05, hy - hr * 0.35, hr * 1.05, Math.PI, 0); g.closePath(); fillStroke(g, '#ffd35c', 2);
    g.beginPath(); g.ellipse(hx + hr * 0.15, hy - hr * 0.35, hr * 1.35, hr * 0.18, 0, 0, Math.PI * 2); fillStroke(g, '#e8b52a', 2);
    g.fillStyle = '#ffffff'; circle(g, hx + hr * 0.6, hy - hr * 0.8, hr * 0.18); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.5; g.stroke();
  },
  hand(g, K) {   // a hammer
    const [x, y] = K.hand;
    g.save(); g.translate(x, y); g.rotate(-0.6);
    g.fillStyle = '#8a5a2a'; g.fillRect(-2, -22, 4, 26); g.strokeStyle = OUTLINE; g.lineWidth = 1.5; g.strokeRect(-2, -22, 4, 26);
    g.beginPath(); g.rect(-9, -28, 18, 8); fillStroke(g, '#5a5f6a', 1.5); g.restore();
  }
};
const LOOK_ASTRA = {
  back(g, K) {   // a starry cloak and a little brass astrolabe
    const { sw, shY, hipY, legL, t } = K, wv = Math.sin(t * 0.08) * 4;
    g.beginPath(); g.moveTo(-sw * 0.4, shY); g.lineTo(sw * 0.2, shY); g.lineTo(-sw * 0.3 + wv, hipY + legL * 0.9); g.lineTo(-sw * 1.0 + wv, hipY + legL * 0.75); g.closePath();
    fillStroke(g, '#0e1638', 2.5);
    g.fillStyle = '#ffe8a8'; for (let i = 0; i < 6; i++) { circle(g, -sw * (0.3 + haSeed(i) * 0.55) + wv * 0.5, shY + (hipY + legL * 0.7 - shY) * haSeed(i + 9), 1.6); g.fill(); }
    g.save(); g.translate(-sw * 0.55, shY + 6); g.rotate(t * 0.03); g.strokeStyle = '#c9932a'; g.lineWidth = 2;
    circle(g, 0, 0, 9); g.stroke(); g.beginPath(); g.ellipse(0, 0, 9, 4, 0.6, 0, Math.PI * 2); g.stroke(); g.restore();
  },
  torso(g, K) {   // a sash with a little constellation
    const { sw, shY, hipY } = K;
    g.strokeStyle = '#9fe7ff'; g.lineWidth = 4; g.beginPath(); g.moveTo(-sw * 0.35, shY + 3); g.lineTo(sw * 0.38, hipY - 6); g.stroke();
    g.fillStyle = '#ffe8a8'; [[-0.1, 0.35], [0.1, 0.55], [0.22, 0.4]].forEach(([a, b]) => { circle(g, sw * a, shY + (hipY - shY) * b, 1.8); g.fill(); });
  },
  head(g, K) {   // long silver hair with stars, round glasses
    const { hx, hy, hr, t } = K;
    g.fillStyle = '#e8e2ff'; g.beginPath(); g.moveTo(hx - hr * 0.9, hy - hr * 0.5); g.quadraticCurveTo(hx - hr * 1.6, hy + hr * 1.2, hx - hr * 1.0, hy + hr * 2.0); g.lineTo(hx - hr * 0.3, hy + hr * 0.6); g.closePath(); g.fill();
    g.fillStyle = '#ffe8a8'; [[-1.2, 0.9], [-1.0, 1.5]].forEach(([a, b], i) => { haStar(g, hx + hr * a, hy + hr * b, 3 + Math.sin(t * 0.1 + i), 4, 0.4); g.fill(); });
    g.strokeStyle = '#c9932a'; g.lineWidth = 1.6; circle(g, hx + hr * 0.3, hy - hr * 0.1, hr * 0.22); g.stroke(); circle(g, hx + hr * 0.75, hy - hr * 0.1, hr * 0.22); g.stroke();
  },
  hand(g, K) {   // a glowing quill
    const [x, y] = K.hand, t = K.t;
    g.save(); g.translate(x, y); g.rotate(-0.9);
    g.fillStyle = '#e8f4ff'; g.beginPath(); g.ellipse(0, -14, 4, 13, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.2; g.stroke();
    if (!K.portrait) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(159,231,255,${0.5 + Math.sin(t * 0.2) * 0.2})`; circle(g, 0, 2, 4); g.fill(); }
    g.restore();
  }
};
if (typeof lookHook === 'function') {
  const lookHookNoHeroes = lookHook;
  lookHook = function (g, part, K) {
    const L = K.has('marlowe') ? LOOK_MARLOWE : K.has('terra') ? LOOK_TERRA : K.has('astra') ? LOOK_ASTRA : null;
    if (L) { L[part] && L[part](g, K); return; }
    lookHookNoHeroes(g, part, K);
  };
}

/* ---------- projectiles ---------- */
const HA_STARS = { t: -1, list: [] };   // star pins drawn this frame (to draw the links between them)
if (typeof PROJ_NEW !== 'undefined') Object.assign(PROJ_NEW, {
  string(g, p, t, x, y, r, dir) {   // a golden string with a little hook
    g.strokeStyle = '#e8c35a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - dir * 60, y + Math.sin(t * 0.5) * 3); g.quadraticCurveTo(x - dir * 30, y - 6, x, y); g.stroke();
    g.strokeStyle = OUTLINE; g.lineWidth = 2.5; g.beginPath(); g.arc(x + dir * 3, y + 3, 5, Math.PI, Math.PI * 2.2); g.stroke();
  },
  puppet(g, p, t, x, y, r, dir) {   // a wooden marionette on strings from above
    const base = y + p.size * 0.6, h = 60, sway = Math.sin(t * 0.08) * 3, hot = p.armed;
    g.save();
    g.strokeStyle = 'rgba(232,195,90,.55)'; g.lineWidth = 1; [-10, 0, 10].forEach(d => { g.beginPath(); g.moveTo(x + d * 0.6 + sway, base - h - 160); g.lineTo(x + d + sway, base - h + 8 + Math.abs(d) * 2); g.stroke(); });
    g.translate(x + sway, base); g.scale(dir, 1);
    g.strokeStyle = OUTLINE; g.lineWidth = 2; const wood = '#c49a6a';
    g.fillStyle = wood; g.beginPath(); g.ellipse(0, -h * 0.55, 9, 15, 0, 0, Math.PI * 2); g.fill(); g.stroke();   // body
    circle(g, 0, -h * 0.9, 9); g.fill(); g.stroke();   // head
    g.fillStyle = '#140a16'; g.fillRect(-7, -h * 1.12, 14, 6); g.fillRect(-10, -h * 1.03, 20, 2);   // little top hat
    const arm = hot ? 1 : 0; g.strokeStyle = wood; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, -h * 0.68); g.lineTo(12 + arm * 10, -h * 0.68 - arm * 4); g.moveTo(0, -h * 0.68); g.lineTo(-10, -h * 0.45); g.stroke();
    g.beginPath(); g.moveTo(-4, -h * 0.3); g.lineTo(-6, 0); g.moveTo(4, -h * 0.3); g.lineTo(6, 0); g.stroke();
    g.fillStyle = '#140a16'; circle(g, 3, -h * 0.92, 1.4); g.fill();
    g.restore();
  },
  curtain(g, p, t, x, y, r, dir) {   // a red stage curtain on a gold rail
    const top = y - 124, bot = y + 18, w = 88, fade = Math.min(1, p.life / 20);
    g.save(); g.globalAlpha *= fade;
    g.fillStyle = '#c9932a'; g.fillRect(x - w / 2 - 6, top - 6, w + 12, 7);
    for (let i = 0; i < 6; i++) { const xx = x - w / 2 + i * w / 6, wv = Math.sin(t * 0.08 + i) * 2; g.fillStyle = i % 2 ? '#8a0e22' : '#a8122a'; g.beginPath(); g.moveTo(xx, top); g.lineTo(xx + w / 6, top); g.lineTo(xx + w / 6 + wv, bot); g.lineTo(xx + wv, bot); g.closePath(); g.fill(); }
    g.fillStyle = '#e8c35a'; g.fillRect(x - w / 2, bot - 6, w, 4);
    g.restore();
  },
  brick(g, p, t, x, y, r, dir) { g.save(); g.translate(x, y); g.rotate(t * 0.25); g.beginPath(); g.rect(-r, -r * 0.55, r * 2, r * 1.1); fillStroke(g, '#c4562a', 2); g.strokeStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(0, -r * 0.55); g.lineTo(0, r * 0.55); g.stroke(); g.restore(); },
  brickwall(g, p, t, x, y, r, dir) {   // a short wall of bricks
    const base = y + 14, w = 84, rows = 7, bh = 18, grow = Math.min(1, p.age / 10), fade = Math.min(1, p.life / 20);
    g.save(); g.globalAlpha *= fade; g.strokeStyle = OUTLINE; g.lineWidth = 1.5;
    for (let rI = 0; rI < Math.ceil(rows * grow); rI++) {
      const yy = base - (rI + 1) * bh, off = rI % 2 ? 14 : 0;
      for (let c = -1; c < 3; c++) { const xx = x - w / 2 + off + c * 28; const x0 = Math.max(x - w / 2, xx), x1 = Math.min(x + w / 2, xx + 28); if (x1 <= x0) continue; g.fillStyle = (rI + c) % 3 ? '#c4562a' : '#a8441e'; g.fillRect(x0, yy, x1 - x0, bh); g.strokeRect(x0, yy, x1 - x0, bh); }
    }
    g.restore();
  },
  wreckball(g, p, t, x, y, r, dir) {   // a heavy ball on a chain from a crane above
    const ax = p.ax != null ? p.ax : x - dir * 120, ay = p.ay != null ? p.ay : y - 220;
    g.strokeStyle = '#3a3f4a'; g.lineWidth = 4; g.setLineDash([7, 4]); g.beginPath(); g.moveTo(ax, ay); g.lineTo(x, y); g.stroke(); g.setLineDash([]);
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); gr.addColorStop(0, '#9aa3ad'); gr.addColorStop(1, '#2a2e36');
    g.fillStyle = gr; circle(g, x, y, r); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 3; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.25)'; circle(g, x - r * 0.35, y - r * 0.35, r * 0.25); g.fill();
  },
  scaffold(g, p, t, x, y, r, dir) {   // a yellow steel scaffold
    const w = p.size || 120, top = y, fade = Math.min(1, p.life / 25), blink = p.life < 50 && Math.floor(t / 4) % 2;
    g.save(); g.globalAlpha *= fade * (blink ? 0.5 : 1);
    g.fillStyle = '#ffd35c'; g.strokeStyle = OUTLINE; g.lineWidth = 2; g.fillRect(x - w / 2, top, w, 10); g.strokeRect(x - w / 2, top, w, 10);
    g.strokeStyle = '#c9932a'; g.lineWidth = 3;
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(x + sx * w * 0.42, top + 10); g.lineTo(x + sx * w * 0.42, top + 90); g.stroke(); }
    g.beginPath(); g.moveTo(x - w * 0.42, top + 14); g.lineTo(x + w * 0.42, top + 86); g.moveTo(x + w * 0.42, top + 14); g.lineTo(x - w * 0.42, top + 86); g.stroke();
    g.fillStyle = '#1a1a1a'; for (let i = 0; i < 6; i++) g.fillRect(x - w / 2 + i * w / 6, top + 2, w / 12, 6);
    g.restore();
  },
  blueprint(g, p, t, x, y, r, dir) {   // a glowing blueprint on the floor, then the cage drop warning
    const base = y + p.size * 0.6, w = 120, warn = p.life < 22;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(90,180,255,.18)'; g.beginPath(); g.ellipse(x, base - 4, w / 2, 12, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = warn && Math.floor(t / 3) % 2 ? '#ffffff' : '#5ab4ff'; g.lineWidth = 2; g.setLineDash([6, 4]);
    g.beginPath(); g.ellipse(x, base - 4, w / 2, 12, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(x + i * 22, base - 14); g.lineTo(x + i * 22, base + 6); } g.stroke();
    if (warn) { const k = 1 - p.life / 22; g.strokeStyle = 'rgba(200,210,230,.8)'; g.lineWidth = 3; const cy = base - 110 + k * 30; g.strokeRect(x - 44, cy - 60, 88, 60); for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x - 44 + i * 22, cy - 60); g.lineTo(x - 44 + i * 22, cy); g.stroke(); } }
    g.restore();
  },
  starpin(g, p, t, x, y, r, dir) {   // a hanging star; linked stars draw burning lines to each other
    if (HA_STARS.t !== t) { HA_STARS.t = t; HA_STARS.list = []; }
    const own = p.owner ? p.owner.slot : p.os, me = { x, y, own, on: !!p.armed };
    const sc = p.color && p.color !== '#ffe8a8' ? p.color : null;   // a skin's colour on slow devices (no filters there)
    if (me.on) {
      g.save(); g.globalCompositeOperation = 'lighter';
      HA_STARS.list.forEach(q => {
        if (!q.on || q.own !== own) return;
        g.strokeStyle = sc || 'rgba(255,170,60,.5)'; if (sc) g.globalAlpha *= 0.5; g.lineWidth = 12; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(x, y); g.stroke();
        if (sc) g.globalAlpha *= 2; g.strokeStyle = '#fff4c8'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(x, y); g.stroke();
        for (let i = 0; i < 3; i++) { const k = (t * 0.04 + i / 3) % 1; g.fillStyle = sc || '#ffd35c'; circle(g, q.x + (x - q.x) * k, q.y + (y - q.y) * k + Math.sin(t * 0.5 + i) * 3, 3); g.fill(); }
      });
      g.restore();
    }
    HA_STARS.list.push(me);
    g.save(); g.globalCompositeOperation = 'lighter';
    const gl = g.createRadialGradient(x, y, 0, x, y, r * 2.4); gl.addColorStop(0, 'rgba(255,232,168,.6)'); gl.addColorStop(1, 'rgba(255,232,168,0)'); g.fillStyle = gl; circle(g, x, y, r * 2.4); g.fill();
    g.restore();
    g.save(); g.translate(x, y); g.rotate(t * 0.04); haStar(g, 0, 0, r * 1.1, 4, 0.35); g.fillStyle = sc || (me.on ? '#ffd35c' : '#ffe8a8'); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); g.restore();
  }
});

/* ---------- move effects ---------- */
if (typeof fxEventNew === 'function') {
  const fxEventNoHeroes = fxEventNew;
  fxEventNew = function (type, x, y, a, b, col) {
    switch (type) {
      case 'puppet': spawnFx({ k: 'ring', x, y: y - 30, life: 14, r0: 6, r1: 50, col: '#e8c35a', lw: 3 }); for (let i = 0; i < 8; i++) spawnFx({ k: 'smoke', x: x + (Math.random() - 0.5) * 40, y: y - 5, vx: (Math.random() - 0.5) * 2, vy: -1, life: 20, col: 'rgba(196,154,106,.6)', size: 8 }); return;
      case 'pupcopy': spawnFx({ k: 'ring', x, y, life: 10, r0: 4, r1: 30, col: '#e8c35a', lw: 2 }); return;
      case 'swap': spawnFx({ k: 'haline', x, y, x2: a, y2: b, life: 14, col: '#e8c35a', w: 3 }); spawnFx({ k: 'ring', x, y, life: 14, r0: 30, r1: 6, col: '#e8c35a', lw: 3 }); spawnFx({ k: 'ring', x: a, y: b, life: 14, r0: 6, r1: 40, col: '#e8c35a', lw: 3 }); return;
      case 'string': spawnFx({ k: 'haline', x, y, x2: a, y2: b, life: 18, col: '#e8c35a', w: 2 }); return;
      case 'yank': spawnFx({ k: 'haline', x, y, x2: a, y2: b, life: 10, col: '#fff4c8', w: 3 }); spawnFx({ k: 'ring', x, y, life: 12, r0: 10, r1: 44, col: '#e8c35a', lw: 3 }); return;
      case 'build': for (let i = 0; i < 10; i++) spawnFx({ k: 'spark', x: x + (Math.random() - 0.5) * 100, y, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, life: 16, col: i % 2 ? '#ffd35c' : '#ffffff', size: 3 }); return;
      case 'cage':
        spawnFx({ k: 'cagefx', x, y, life: 30 }); spawnFx({ k: 'ring', x, y, life: 16, r0: 10, r1: a || 85, col: '#9fd0ff', lw: 5 });
        for (let i = 0; i < 10; i++) spawnFx({ k: 'spark', x, y, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 6, g: 0.3, life: 20, col: '#c8ccd6', size: 3 }); return;
      case 'starlink': spawnFx({ k: 'ring', x, y, life: 16, r0: 10, r1: 70, col: '#ffd35c', lw: 3 }); return;
      case 'comet': { const an = a / 100; for (let i = 0; i < (HA_LOW() ? 1 : 3); i++) spawnFx({ k: 'spark', x: x - Math.cos(an) * 20, y: y - Math.sin(an) * 20, vx: -Math.cos(an) * 3 + (Math.random() - 0.5) * 2, vy: -Math.sin(an) * 3 + (Math.random() - 0.5) * 2, life: 18, col: i % 2 ? '#9fe7ff' : '#ffffff', size: 4 }); return; }
      case 'well': spawnFx({ k: 'ring', x, y, life: 18, r0: a || 150, r1: 20, col: 'rgba(159,231,255,.8)', lw: 2 }); return;
      case 'wellthrow': spawnFx({ k: 'ring', x, y, life: 16, r0: 20, r1: 160, col: '#9fe7ff', lw: 5 }); spawnFx({ k: 'flash', life: 5, a: 0.2, col: '159,231,255' }); return;
    }
    fxEventNoHeroes(type, x, y, a, b, col);
  };
}
if (typeof drawFxNew === 'function') {
  const drawFxNoHeroes = drawFxNew;
  drawFxNew = function (g, p, k) {
    if (p.k === 'haline') { g.globalAlpha = 1 - k; g.strokeStyle = p.col; g.lineWidth = p.w * (1 - k * 0.5); g.beginPath(); g.moveTo(p.x, p.y); g.quadraticCurveTo((p.x + p.x2) / 2, Math.min(p.y, p.y2) - 30, p.x2, p.y2); g.stroke(); return; }
    if (p.k === 'cagefx') {   // a steel cage slams down
      const drop = Math.min(1, k * 4), cy = p.y + 30 - (1 - drop) * 140;
      g.globalAlpha = Math.min(1, (1 - k) * 2); g.strokeStyle = '#c8ccd6'; g.lineWidth = 4; g.strokeRect(p.x - 46, cy - 80, 92, 80);
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(p.x - 46 + i * 23, cy - 80); g.lineTo(p.x - 46 + i * 23, cy); g.stroke(); }
      return;
    }
    drawFxNoHeroes(g, p, k);
  };
}
if (typeof SKFX_EVENTS !== 'undefined') Object.assign(SKFX_EVENTS, { puppet: 1, pupcopy: 1, build: 1, starlink: 1, comet: 1, well: 1, wellthrow: 1 });

/* ---------- ultimate sights ---------- */
if (typeof drawUltAimRemake === 'function') {
  const drawUltAimNoHeroes = drawUltAimRemake;
  drawUltAimRemake = function (g, view, t) {
    const u = view.ult, f = view.fighters.find(x => x.slot === u.slot); if (!f) return false;
    const def = ultDef(f.c), B = view.stage.blast, lock = u.ph === 'lock', R = ULT_R;
    if (def.aim === 'spot') {   // Marlowe: the stage goes dark and a spotlight hunts
      g.save();
      g.fillStyle = 'rgba(10,4,12,.72)'; g.beginPath(); g.rect(B.l - 400, B.t - 400, B.r - B.l + 800, B.b - B.t + 800); g.arc(u.ax, u.ay, R + 6, 0, Math.PI * 2, true); g.fill();
      g.globalCompositeOperation = 'lighter';
      const top = u.ay - 700, gr = g.createLinearGradient(u.ax, top, u.ax, u.ay + R); gr.addColorStop(0, 'rgba(255,244,200,0)'); gr.addColorStop(1, 'rgba(255,244,200,.22)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(u.ax - 30, top); g.lineTo(u.ax + 30, top); g.lineTo(u.ax + R, u.ay); g.lineTo(u.ax - R, u.ay); g.closePath(); g.fill();
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = lock ? (Math.floor(t / 3) % 2 ? '#ff3b5a' : '#ffffff') : '#e8c35a'; g.lineWidth = 3; circle(g, u.ax, u.ay, R); g.stroke();
      g.font = '700 15px "Chakra Petch", system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#e8c35a';
      g.fillText(lock ? 'SHOWTIME!' : 'FIND THE STAR OF THE SHOW', u.ax, u.ay - R - 14);
      if (!lock) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(u.ax - 70, u.ay + R + 12, 140, 6); g.fillStyle = '#e8c35a'; g.fillRect(u.ax - 70, u.ay + R + 12, 140 * Math.max(0, u.aim) / ULT_AIM, 6); }
      g.restore(); return true;
    }
    if (def.aim === 'plan') {   // Terra: blueprint grid and a building plot
      g.save();
      g.fillStyle = 'rgba(10,40,90,.35)'; g.fillRect(B.l - 400, B.t - 400, B.r - B.l + 800, B.b - B.t + 800);
      g.strokeStyle = 'rgba(159,208,255,.18)'; g.lineWidth = 1; g.beginPath();
      for (let x = Math.floor((B.l - 400) / 40) * 40; x < B.r + 400; x += 40) { g.moveTo(x, B.t - 400); g.lineTo(x, B.b + 400); }
      for (let y = Math.floor((B.t - 400) / 40) * 40; y < B.b + 400; y += 40) { g.moveTo(B.l - 400, y); g.lineTo(B.r + 400, y); }
      g.stroke();
      const col = lock ? (Math.floor(t / 3) % 2 ? '#ff3b3b' : '#ffffff') : '#ffd35c';
      g.strokeStyle = col; g.lineWidth = 3; g.setLineDash([10, 6]); g.strokeRect(u.ax - R, u.ay - R, R * 2, R * 2); g.setLineDash([]);
      g.beginPath(); g.moveTo(u.ax - R - 20, u.ay); g.lineTo(u.ax + R + 20, u.ay); g.moveTo(u.ax, u.ay - R - 20); g.lineTo(u.ax, u.ay + R + 20); g.stroke();
      g.font = '700 14px "Chakra Petch", system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = col;
      g.fillText(lock ? 'BUILDING PERMIT APPROVED' : 'PLOT ' + Math.round(u.ax / 10) + '-' + Math.round(u.ay / 10), u.ax, u.ay - R - 12);
      if (!lock) { g.fillStyle = '#ffd35c'; g.fillRect(u.ax - R, u.ay + R + 10, R * 2 * Math.max(0, u.aim) / ULT_AIM, 5); }
      g.restore(); return true;
    }
    if (def.aim === 'chart') {   // Astra: a star chart reticle with zodiac rings
      g.save();
      g.fillStyle = 'rgba(4,8,30,.55)'; g.fillRect(B.l - 400, B.t - 400, B.r - B.l + 800, B.b - B.t + 800);
      g.fillStyle = '#ffffff'; for (let i = 0; i < 60; i++) { g.globalAlpha = 0.3 + 0.5 * haSeed(i); g.fillRect(B.l + haSeed(i + 1) * (B.r - B.l), B.t + haSeed(i + 2) * (B.b - B.t), 2, 2); } g.globalAlpha = 1;
      const col = lock ? (Math.floor(t / 3) % 2 ? '#ff6b6b' : '#ffffff') : '#9fe7ff';
      g.strokeStyle = col; g.lineWidth = 2; circle(g, u.ax, u.ay, R); g.stroke();
      g.save(); g.translate(u.ax, u.ay); g.rotate(t * 0.02); g.lineWidth = 1.5; circle(g, 0, 0, R * 0.7); g.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke(); }
      g.restore();
      haStar(g, u.ax, u.ay, 10, 4, 0.35); g.fillStyle = col; g.fill();
      if (!lock) { g.strokeStyle = '#ffe8a8'; g.lineWidth = 4; g.beginPath(); g.arc(u.ax, u.ay, R + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, u.aim) / ULT_AIM); g.stroke(); }
      g.restore(); return true;
    }
    return drawUltAimNoHeroes(g, view, t);
  };
}

/* ---------- the finishers ---------- */
if (typeof drawUltWorldRemake === 'function') {
  const drawUltWorldNoHeroes = drawUltWorldRemake;
  drawUltWorldRemake = function (g, view, c, t) {
    const { f, tg, def, k } = c, st = def.style;
    if (st !== 'finale' && st !== 'tower' && st !== 'zodiac') return drawUltWorldNoHeroes(g, view, c, t);
    const FIN = ULT_FX_FINAL * ULT_ART, B = view.stage.blast, low = HA_LOW();
    g.save();
    tg.forEach((o, j) => {
      const x = o.x, y = o.y - o.H / 2, fin = k >= FIN, p = fin ? Math.min(1, (k - FIN) / 22) : 0;
      if (st === 'finale') {   // curtains frame the target, strings make them dance, the chandelier crashes
        const cw = 170, ch = 230;
        g.fillStyle = '#a8122a'; for (const s of [-1, 1]) { const open = fin ? 1 : Math.min(1, k / 14); g.fillRect(x + s * (cw * 0.5 + 10) - (s > 0 ? 0 : 30 + 20 * (1 - open)), y - ch / 2, 30 + 20 * (1 - open), ch); }
        g.fillStyle = '#c9932a'; g.fillRect(x - cw / 2 - 40, y - ch / 2 - 10, cw + 80, 10);
        g.strokeStyle = 'rgba(232,195,90,.8)'; g.lineWidth = 1.5;
        if (!fin) for (let i = 0; i < 4; i++) { const sx = x - 30 + i * 20, wig = Math.sin(k * 0.4 + i) * 10; g.beginPath(); g.moveTo(sx, y - ch / 2); g.lineTo(sx + wig, y - o.H * 0.2 + (i % 2) * 20); g.stroke(); }
        const chY = fin ? y - 40 + p * 30 : y - ch / 2 - 60 + Math.min(1, k / FIN) * 20;   // the chandelier
        g.save(); g.translate(x, chY);
        g.strokeStyle = '#c9932a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, fin ? -400 : -200); g.lineTo(0, -10); g.stroke();
        g.fillStyle = '#e8c35a'; g.beginPath(); g.ellipse(0, 0, 50, 12, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 2; g.stroke();
        g.globalCompositeOperation = 'lighter'; for (let i = -2; i <= 2; i++) { g.fillStyle = 'rgba(255,230,150,.8)'; circle(g, i * 20, -8, 5); g.fill(); }
        g.restore();
        if (fin) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,220,140,${1 - p})`; g.lineWidth = 6; circle(g, x, y, 30 + p * 200); g.stroke(); g.globalCompositeOperation = 'source-over';
          for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.fillStyle = `rgba(200,230,255,${1 - p})`; g.save(); g.translate(x + Math.cos(a) * p * 160, y + Math.sin(a) * p * 120); g.rotate(a + p * 4); g.fillRect(-4, -8, 8, 16); g.restore(); } }
      } else if (st === 'tower') {   // a skyscraper bursts up under the target, then a crane drops a steel beam
        const base = Math.min(B.b, o.y + 400), riseK = Math.min(1, k / 30), topY = o.y + 10;
        const h = (base - topY) * riseK, w = 120;
        g.fillStyle = '#1a2a44'; g.fillRect(x - w / 2, base - h, w, h);
        g.fillStyle = '#5ab4ff'; for (let r = 0; r < h / 26; r++) for (let cI = 0; cI < 4; cI++) { if (haSeed(r * 5 + cI + j * 31) < 0.35) continue; g.fillRect(x - w / 2 + 10 + cI * 27, base - h + 8 + r * 26, 16, 12); }
        g.strokeStyle = '#ffd35c'; g.lineWidth = 3; g.strokeRect(x - w / 2, base - h, w, h);
        const crX = x + 160, crTop = y - 320;   // the crane
        g.strokeStyle = '#ffd35c'; g.lineWidth = 5; g.beginPath(); g.moveTo(crX, base); g.lineTo(crX, crTop); g.lineTo(x - 60, crTop); g.stroke();
        const beamY = fin ? y - 20 : crTop + 30 + Math.min(1, k / FIN) * 80, beamA = fin ? 0.4 * (1 - p) : 0;
        g.strokeStyle = '#3a3f4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, crTop); g.lineTo(x, beamY); g.stroke();
        g.save(); g.translate(x, beamY); g.rotate(beamA); g.fillStyle = '#c4562a'; g.fillRect(-90, -9, 180, 18); g.strokeStyle = OUTLINE; g.lineWidth = 2; g.strokeRect(-90, -9, 180, 18);
        g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = -80; i < 90; i += 24) g.fillRect(i, -9, 6, 18); g.restore();
        if (fin) { g.strokeStyle = `rgba(255,211,92,${1 - p})`; g.lineWidth = 8; circle(g, x, y, 30 + p * 220); g.stroke();
          if (!low) for (let i = 0; i < 6; i++) spawnFx({ k: 'smoke', x: x + (Math.random() - 0.5) * 120, y: y + 20, vx: (Math.random() - 0.5) * 4, vy: -2, life: 24, col: 'rgba(180,170,160,.5)', size: 14 }); }
      } else {   // zodiac: the sky turns into a star chart and a star beast pounces
        g.fillStyle = 'rgba(4,8,30,.45)'; g.fillRect(x - 300, y - 300, 600, 600);
        const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + j, rr = 120 + haSeed(i + j * 13) * 80; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7]); }
        g.globalCompositeOperation = 'lighter';
        const show = Math.min(pts.length, Math.floor(k / 6) + 1);
        g.strokeStyle = 'rgba(159,231,255,.6)'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < show; i++) { const [px, py] = pts[i]; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
        for (let i = 0; i < show; i++) { haStar(g, pts[i][0], pts[i][1], 7, 4, 0.35); g.fillStyle = '#ffe8a8'; g.fill(); }
        if (!fin) {   // star streaks from the constellation into the target
          urmHits(def).forEach((at, i) => { const q = (k - at + 6) / 10; if (q < 0 || q > 1) return; const [sx, sy] = pts[i % pts.length]; g.strokeStyle = `rgba(255,232,168,${1 - q})`; g.lineWidth = 5; g.beginPath(); g.moveTo(sx + (x - sx) * q * 0.6, sy + (y - sy) * q * 0.6); g.lineTo(sx + (x - sx) * q, sy + (y - sy) * q); g.stroke(); });
        } else {   // the beast: a great star lion's head
          const s = 1 + p * 0.6; g.save(); g.translate(x - 80 * (1 - p), y - 40); g.scale(s, s);
          g.strokeStyle = `rgba(159,231,255,${1 - p * 0.7})`; g.lineWidth = 3; g.beginPath();
          for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r1 = i % 2 ? 70 : 95; g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); } g.closePath(); g.stroke();
          g.fillStyle = '#ffe8a8'; haStar(g, -20, -10, 8, 4, 0.35); g.fill(); haStar(g, 20, -10, 8, 4, 0.35); g.fill();
          g.beginPath(); g.moveTo(-30, 25); g.lineTo(0, 45); g.lineTo(30, 25); g.stroke();
          g.restore();
          g.strokeStyle = `rgba(255,232,168,${1 - p})`; g.lineWidth = 7; circle(g, x, y, 30 + p * 230); g.stroke();
        }
        g.globalCompositeOperation = 'source-over';
      }
    });
    g.restore();
    return true;
  };
}

/* ---------- the opening scenes (before aiming) ---------- */
if (typeof UI_SCENES !== 'undefined') {
  /* Marlowe: a theatre. The curtains close, a spotlight finds him, the crowd applauds */
  UI_SCENES.finale = function (o) {
    const { g, f, k, vw, vh, S, cx } = o, gy = vh * 0.8;
    g.fillStyle = '#1a0610'; g.fillRect(0, 0, vw, vh);
    g.fillStyle = '#3a1a10'; g.fillRect(0, gy, vw, vh - gy); g.fillStyle = '#c9932a'; g.fillRect(0, gy, vw, 6 * S);
    const sp = uiOut(uiSeg(k, 10, 30));   // the spotlight
    if (sp > 0) { g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(cx, 0, cx, gy); gr.addColorStop(0, 'rgba(255,244,200,0)'); gr.addColorStop(1, `rgba(255,244,200,${0.4 * sp})`); g.fillStyle = gr; g.beginPath(); g.moveTo(cx - 30 * S, 0); g.lineTo(cx + 30 * S, 0); g.lineTo(cx + 150 * S, gy); g.lineTo(cx - 150 * S, gy); g.closePath(); g.fill(); g.restore(); }
    uiFig(g, f, cx, gy + 4 * S, 200 * S, k > 40 ? 'power' : 'idle', 1);
    const close = uiOut(uiSeg(k, 0, 18)) * (1 - uiOut(uiSeg(k, 30, 44))) * 0.5 + (k > 70 ? uiOut(uiSeg(k, 70, 88)) * 0.5 : 0);   // curtains close, open, close again
    for (const s of [-1, 1]) { const w = vw * (0.12 + close); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#8a0e22' : '#a8122a'; const xx = s < 0 ? i * w / 6 : vw - w + i * w / 6; g.fillRect(xx, 0, w / 6 + 1, gy); } }
    g.fillStyle = '#c9932a'; g.fillRect(0, 0, vw, 18 * S);
    if (k > 44 && k < 80) { g.font = `${Math.round(30 * S)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#e8c35a'; g.globalAlpha = uiSeg(k, 44, 52); g.fillText('★ GRAND FINALE ★', cx, vh * 0.2); g.globalAlpha = 1;
      g.font = `${Math.round(16 * S)}px system-ui, sans-serif`; g.fillStyle = '#fff4c8'; for (let i = 0; i < 5; i++) g.fillText('👏', vw * (0.15 + i * 0.17), gy + 40 * S + Math.sin(k * 0.5 + i) * 4 * S); }
  };
  /* Terra: blueprints unfold into a city skyline, building itself in fast motion */
  UI_SCENES.tower = function (o) {
    const { g, f, k, vw, vh, S, cx } = o, gy = vh * 0.84;
    g.fillStyle = '#0a1a2e'; g.fillRect(0, 0, vw, vh);
    const unfold = uiOut(uiSeg(k, 0, 20));   // the blueprint sheet unrolls
    g.fillStyle = '#123a6a'; g.fillRect(cx - vw * 0.45 * unfold, vh * 0.08, vw * 0.9 * unfold, vh * 0.72);
    g.strokeStyle = 'rgba(159,208,255,.35)'; g.lineWidth = 1; g.beginPath();
    for (let x = cx - vw * 0.45 * unfold; x < cx + vw * 0.45 * unfold; x += 30 * S) { g.moveTo(x, vh * 0.08); g.lineTo(x, vh * 0.8); }
    for (let y = vh * 0.08; y < vh * 0.8; y += 30 * S) { g.moveTo(cx - vw * 0.45 * unfold, y); g.lineTo(cx + vw * 0.45 * unfold, y); } g.stroke();
    // the skyline builds itself, outline first then solid
    for (let i = 0; i < 9; i++) {
      const bw = (50 + haSeed(i) * 60) * S, bx = vw * 0.08 + i * vw * 0.1, bh = (120 + haSeed(i + 4) * 260) * S, grow = uiOut(uiSeg(k, 20 + i * 3, 50 + i * 3));
      if (grow <= 0) continue;
      g.strokeStyle = '#9fd0ff'; g.lineWidth = 2; g.strokeRect(bx, gy - bh, bw, bh);
      g.fillStyle = '#1a2a44'; g.fillRect(bx, gy - bh * grow, bw, bh * grow);
      g.fillStyle = '#ffd35c'; for (let r = 0; r < bh * grow / (22 * S); r++) for (let c = 0; c < 3; c++) if (haSeed(i * 40 + r * 3 + c) > 0.4) g.fillRect(bx + 8 * S + c * bw / 3.4, gy - bh * grow + 8 * S + r * 22 * S, 8 * S, 10 * S);
    }
    g.fillStyle = '#0a0f1a'; g.fillRect(0, gy, vw, vh - gy);
    uiFig(g, f, cx, gy, 190 * S, k > 50 ? 'power' : 'cast', 1);
    if (k > 56) { g.font = `${Math.round(28 * S)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#ffd35c'; g.globalAlpha = uiSeg(k, 56, 64); g.fillText('SKYSCRAPER', cx, vh * 0.16); g.globalAlpha = 1; }
  };
  /* Astra: brass astrolabe rings close around her and lock into place */
  UI_SCENES.zodiac = function (o) {
    const { g, f, k, vw, vh, S, cx, low } = o, cy = vh * 0.5;
    g.fillStyle = '#050a24'; g.fillRect(0, 0, vw, vh);
    g.fillStyle = '#fff'; for (let i = 0; i < (low ? 40 : 120); i++) { g.globalAlpha = 0.3 + 0.7 * haSeed(i); g.fillRect(haSeed(i + 1) * vw, haSeed(i + 2) * vh, 2, 2); } g.globalAlpha = 1;
    uiFig(g, f, cx, cy + 110 * S, 190 * S, k > 40 ? 'power' : 'cast', 1);
    for (let i = 0; i < 3; i++) {   // three rings fly in from far away and settle at different tilts
      const r = (150 + i * 40) * S, inK = uiOut(uiSeg(k, 4 + i * 8, 30 + i * 8)), sc = 3 - 2 * inK;
      g.save(); g.translate(cx, cy); g.rotate(k * 0.02 * (i % 2 ? -1 : 1) + i); g.scale(sc, sc * (0.3 + i * 0.2));
      g.strokeStyle = '#c9932a'; g.lineWidth = 5 * S / sc; g.globalAlpha = inK; circle(g, 0, 0, r); g.stroke();
      g.fillStyle = '#ffe8a8'; for (let j = 0; j < 12; j++) { const a = j / 12 * Math.PI * 2; circle(g, Math.cos(a) * r, Math.sin(a) * r, 3 * S / sc); g.fill(); }
      g.restore();
    }
    if (k > 50) {   // the zodiac signs light up around the rings
      const sg = '♈♉♊♋♌♍♎♏♐♑♒♓'; g.font = `${Math.round(20 * S)}px serif`; g.textAlign = 'center'; g.fillStyle = '#9fe7ff';
      for (let i = 0; i < 12; i++) { if (i > (k - 50) / 2) break; const a = i / 12 * Math.PI * 2 - Math.PI / 2; g.fillText(sg[i], cx + Math.cos(a) * 250 * S, cy + Math.sin(a) * 160 * S); }
      g.font = `${Math.round(26 * S)}px "Dela Gothic One", Impact, sans-serif`; g.fillStyle = '#ffe8a8'; g.globalAlpha = uiSeg(k, 60, 68); g.fillText('ZODIAC JUDGMENT', cx, vh * 0.12); g.globalAlpha = 1;
    }
  };
}

/* ---------- their unlock scenes (unlock-fx.js loads later, so add them once the page has loaded) ---------- */
function haUnlockScenes() {
  if (typeof UNL_SCENES === 'undefined') return;
  /* Marlowe: an empty stage, a puppet dances on its own... then the puppeteer steps out holding its strings */
  UNL_SCENES.marlowe = function (g, c, k, vw, vh, S) {
    g.fillStyle = '#12060e'; g.fillRect(0, 0, vw, vh);
    const gy = vh * 0.8; g.fillStyle = '#3a1a10'; g.fillRect(0, gy, vw, vh - gy);
    for (const s of [-1, 1]) { const w = vw * 0.18; for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#8a0e22' : '#a8122a'; g.fillRect(s < 0 ? i * w / 5 : vw - w + i * w / 5, 0, w / 5 + 1, gy); } }
    const on = unlSeg(k, 0.3, 0.8); g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(vw * 0.5, gy - 80 * S, 10, vw * 0.5, gy - 80 * S, 280 * S); gr.addColorStop(0, `rgba(255,244,200,${0.45 * on})`); gr.addColorStop(1, 'rgba(255,244,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, vw, vh); g.restore();
    const px = vw * 0.5 + Math.sin(k * 3) * 40 * S * (1 - unlSeg(k, 3, 3.5));   // the puppet dances by itself
    if (PROJ_NEW.puppet) { g.save(); g.translate(px, gy); g.scale(2.4 * S, 2.4 * S); PROJ_NEW.puppet(g, { size: 44, armed: Math.floor(k * 4) % 2 }, k * 60, 0, -26, 22, 1); g.restore(); }
    if (k > 3) unlFighter(g, c, vw * 0.5 + 130 * S, gy, 220 * S, 'idle', -1, k < 4.2 ? '#2a0e1e' : false, unlSeg(k, 3, 3.4));
    if (k > 1.4 && k < 3.2) { g.font = `${Math.round(22 * S)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#e8c35a'; g.fillText('…who is pulling the strings?', vw / 2, vh * 0.16); }
  };
  /* Terra: an empty lot. Beams drop, a tower builds itself in seconds, she's standing on top with her hammer */
  UNL_SCENES.terra = function (g, c, k, vw, vh, S) {
    g.fillStyle = '#0a1a2e'; g.fillRect(0, 0, vw, vh);
    const gy = vh * 0.85; g.fillStyle = '#2a1a0e'; g.fillRect(0, gy, vw, vh - gy);
    const bw = 200 * S, bx = vw / 2 - bw / 2, H = vh * 0.5, grow = unlOut(unlSeg(k, 0.5, 3.4)), h = H * grow;
    g.strokeStyle = '#ffd35c'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { const yy = gy - (i + 1) * H / 6; if (gy - yy > h) break; g.strokeRect(bx, yy, bw, H / 6); g.beginPath(); g.moveTo(bx, yy); g.lineTo(bx + bw, yy + H / 6); g.stroke(); }
    g.fillStyle = 'rgba(26,42,68,.9)'; g.fillRect(bx, gy - h, bw, h);
    for (let i = 0; i < 12; i++) { const d = k - 0.5 - i * 0.22; if (d < 0 || d > 0.3) continue; g.fillStyle = '#ffd35c'; g.fillRect(bx + haSeed(i) * bw, gy - h - 40 * S, 6 * S, 30 * S); }   // sparks of welding
    if (k > 3.5) unlFighter(g, c, vw / 2, gy - h, 190 * S, 'power', 1, k < 4.4 ? '#2a1a0e' : false, unlSeg(k, 3.5, 3.8));
    if (k > 0.3 && k < 3.4) { g.font = `${Math.round(22 * S)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#ffd35c'; g.fillText('UNDER CONSTRUCTION', vw / 2, vh * 0.12); }
  };
  /* Astra: night sky. Stars connect into her silhouette, then she steps down from the constellation */
  UNL_SCENES.astra = function (g, c, k, vw, vh, S, low) {
    g.fillStyle = '#050a24'; g.fillRect(0, 0, vw, vh);
    g.fillStyle = '#fff'; for (let i = 0; i < (low ? 40 : 140); i++) { g.globalAlpha = 0.3 + 0.7 * haSeed(i); g.fillRect(haSeed(i + 1) * vw, haSeed(i + 2) * vh, 2, 2); } g.globalAlpha = 1;
    const cx = vw / 2, cy = vh * 0.5, pts = [[0, -1.6], [0.5, -1.1], [0.7, -0.2], [0.4, 0.6], [0.5, 1.5], [-0.5, 1.5], [-0.4, 0.6], [-0.7, -0.2], [-0.5, -1.1]];
    const n = Math.min(pts.length, Math.floor(unlSeg(k, 0.4, 2.6) * pts.length + 0.5));
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#9fe7ff'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i < n; i++) { const x = cx + pts[i][0] * 90 * S, y = cy + pts[i][1] * 100 * S; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    if (n === pts.length) g.closePath(); g.stroke();
    for (let i = 0; i < n; i++) { haStar(g, cx + pts[i][0] * 90 * S, cy + pts[i][1] * 100 * S, 7 * S, 4, 0.35); g.fillStyle = '#ffe8a8'; g.fill(); }
    g.restore();
    if (k > 2.8) unlFighter(g, c, cx, cy + 160 * S, 230 * S, 'idle', 1, k < 4 ? '#1a2a6a' : false, unlSeg(k, 2.8, 3.4));
    if (k > 0.5 && k < 2.8) { g.font = `${Math.round(22 * S)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#9fe7ff'; g.fillText('The stars are aligning…', cx, vh * 0.12); }
  };
}
if (typeof window !== 'undefined') { if (document.readyState === 'complete') haUnlockScenes(); else window.addEventListener('load', haUnlockScenes); }
