'use strict';
/* ===== CLOUDTOP BRAWL — how Queen Vexa and the Overgrown Kingdom look (drawing only; the rules are in vexa.js) =====
   Her crown, wings and scepter, her stingers, swarms, hives and bees, the venom effects, the honeycomb aim,
   the Queen's Decree finisher, her throne-room intro, her unlock scene and the boss-only Overgrown Kingdom stage. */

const VX_LOW = () => typeof PERF !== 'undefined' && PERF.low;
const vxSeed = n => { const s = Math.sin(n * 57.31 + 3.71) * 43758.5453; return s - Math.floor(s); };
function vxHex(g, x, y, r, rot) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = (rot || 0) + i * Math.PI / 3; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
/* a little bee: striped body, see-through wings that flap */
function vxBee(g, x, y, s, ang, t, col) {
  g.save(); g.translate(x, y); g.rotate(ang || 0); g.scale(s, s);
  g.fillStyle = 'rgba(230,245,255,.75)'; const fl = Math.sin(t * 1.7) * 0.5;
  g.beginPath(); g.ellipse(-1, -5, 4, 6, -0.6 + fl, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(2, -5, 3.5, 5.5, 0.5 - fl, 0, Math.PI * 2); g.fill();
  g.fillStyle = col || '#ffc21a'; g.beginPath(); g.ellipse(0, 0, 7, 4.6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1a1206'; g.fillRect(-2.5, -4.4, 2, 8.8); g.fillRect(1.5, -4.2, 2, 8.4); circle(g, 6.5, 0, 2.6); g.fill();
  g.beginPath(); g.moveTo(-7, 0); g.lineTo(-10, 0); g.strokeStyle = '#1a1206'; g.lineWidth = 1.4; g.stroke();
  g.restore();
}

/* ---------- her outfit ---------- */
const LOOK_QUEEN = {
  back(g, K) {   // four see-through wings that buzz
    const { sw, shY, t, f } = K, busy = f && (f.pose === 'fly' || f.hot), fl = Math.sin(t * (busy ? 1.6 : 0.25)) * (busy ? 0.35 : 0.12);
    g.save(); g.translate(-sw * 0.15, shY + 8);
    for (const [len, w, a] of [[58, 22, -0.95], [44, 16, -0.25]]) {
      g.save(); g.rotate(a + fl); g.beginPath(); g.ellipse(-len * 0.5, 0, len * 0.5, w * 0.5, 0, 0, Math.PI * 2);
      const gr = g.createLinearGradient(-len, 0, 0, 0); gr.addColorStop(0, 'rgba(255,240,190,.25)'); gr.addColorStop(1, 'rgba(220,240,255,.6)');
      g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(80,60,20,.7)'; g.lineWidth = 1.4; g.stroke();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-len * 0.8, -w * 0.15); g.moveTo(-len * 0.35, 0); g.lineTo(-len * 0.6, w * 0.3); g.strokeStyle = 'rgba(80,60,20,.4)'; g.stroke();
      g.restore();
    }
    g.restore();
  },
  torso(g, K) {   // black and gold stripes, a royal ruff collar
    const { sw, shY, hipY, torsoH } = K;
    g.fillStyle = '#ffc21a'; for (let i = 0; i < 3; i++) g.fillRect(-sw * 0.44, shY + torsoH * (0.3 + i * 0.22), sw * 0.88, torsoH * 0.1);
    g.fillStyle = '#fff4d6'; g.strokeStyle = OUTLINE; g.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(i * sw * 0.16, shY + 2, sw * 0.13, 5, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.fillStyle = '#8a1a6a'; g.beginPath(); g.moveTo(-sw * 0.1, hipY - 4); g.lineTo(sw * 0.1, hipY - 4); g.lineTo(0, hipY + 8); g.closePath(); g.fill();   // a royal sash end
  },
  head(g, K) {   // a gold crown with jewels and curled antennae
    const { hx, hy, hr, t } = K, sw = Math.sin(t * 0.08) * 2;
    g.strokeStyle = '#1a1206'; g.lineWidth = 2; g.lineCap = 'round';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx + s * hr * 0.25, hy - hr * 0.9); g.quadraticCurveTo(hx + s * hr * 0.6 + sw, hy - hr * 2.0, hx + s * hr * 1.0 + sw, hy - hr * 1.85); g.stroke(); g.fillStyle = '#ffc21a'; circle(g, hx + s * hr * 1.0 + sw, hy - hr * 1.85, 2.6); g.fill(); }
    g.beginPath(); const by = hy - hr * 0.78, w = hr * 1.25;
    g.moveTo(hx - w / 2, by); g.lineTo(hx - w / 2, by - hr * 0.42); g.lineTo(hx - w * 0.25, by - hr * 0.2); g.lineTo(hx, by - hr * 0.6); g.lineTo(hx + w * 0.25, by - hr * 0.2); g.lineTo(hx + w / 2, by - hr * 0.42); g.lineTo(hx + w / 2, by); g.closePath();
    fillStroke(g, '#ffc21a', 1.8);
    g.fillStyle = '#c8ff3a'; circle(g, hx, by - hr * 0.14, 2.4); g.fill(); g.fillStyle = '#8a1a6a'; circle(g, hx - w * 0.3, by - hr * 0.1, 1.8); g.fill(); circle(g, hx + w * 0.3, by - hr * 0.1, 1.8); g.fill();
  },
  hand(g, K) {   // a royal scepter topped with a glowing honeycomb gem
    const [x, y] = K.hand, t = K.t;
    g.save(); g.translate(x, y); g.rotate(-0.35);
    g.fillStyle = '#c9932a'; g.fillRect(-1.8, -30, 3.6, 40); g.strokeStyle = OUTLINE; g.lineWidth = 1.2; g.strokeRect(-1.8, -30, 3.6, 40);
    vxHex(g, 0, -34, 7, Math.PI / 6); fillStroke(g, '#ffc21a', 1.5);
    if (!K.portrait) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,214,90,${0.35 + Math.sin(t * 0.15) * 0.15})`; circle(g, 0, -34, 11); g.fill(); }
    g.restore();
  }
};
if (typeof lookHook === 'function') {
  const lookHookNoQueen = lookHook;
  lookHook = function (g, part, K) {
    if (K.has('queen')) { LOOK_QUEEN[part] && LOOK_QUEEN[part](g, K); return; }
    lookHookNoQueen(g, part, K);
  };
}

/* ---------- projectiles ---------- */
const vxAng = p => p.m ? Math.atan2(p.vy || 0, p.vx || p.face || 1) : (p.ang != null ? p.ang : 0);   // online views only have the angle
if (typeof PROJ_NEW !== 'undefined') Object.assign(PROJ_NEW, {
  stinger(g, p, t, x, y, r, dir) {   // a sharp stinger dripping green venom
    g.save(); g.translate(x, y); g.rotate(vxAng(p));
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(200,255,58,.35)'; g.beginPath(); g.ellipse(-8, 0, 16, 5, 0, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -4); g.lineTo(-12, 0); g.lineTo(-8, 4); g.closePath(); fillStroke(g, '#2a1a08', 1.2);
    g.fillStyle = p.color || '#c8ff3a'; g.beginPath(); g.moveTo(14, 0); g.lineTo(4, -1.6); g.lineTo(4, 1.6); g.closePath(); g.fill();
    g.fillStyle = '#ffc21a'; g.fillRect(-9, -3, 3, 6);
    g.restore();
  },
  swarm(g, p, t, x, y, r, dir) {   // a buzzing cloud of bees; tighter and angrier while it clings to someone
    const n = VX_LOW() ? 6 : (p.armed ? 14 : 11), R = p.armed ? 44 : (p.size || 46) * 0.55;   // clinging: spread around their whole body
    g.save(); g.globalCompositeOperation = 'lighter';
    const gl = g.createRadialGradient(x, y, 0, x, y, R * 1.5); gl.addColorStop(0, 'rgba(255,194,26,.22)'); gl.addColorStop(1, 'rgba(255,194,26,0)'); g.fillStyle = gl; circle(g, x, y, R * 1.5); g.fill();
    g.restore();
    for (let i = 0; i < n; i++) {
      const a = t * (0.09 + vxSeed(i) * 0.08) * (i % 2 ? 1 : -1) + i * 2.3, rr = R * (0.35 + vxSeed(i + 5) * 0.65);
      const bx = x + Math.cos(a) * rr, by = y + Math.sin(a * 1.3) * rr * (p.armed ? 1.1 : 0.75);
      vxBee(g, bx, by, p.armed ? 0.9 : 0.75, Math.cos(a) > 0 ? 0.3 : Math.PI - 0.3, t + i, p.color);
    }
  },
  hive(g, p, t, x, y, r, dir) {   // a dome-shaped hive on the floor; it shakes when a bee is about to come out
    const base = y + p.size * 0.6, sh = p.armed ? Math.sin(t * 2.2) * 2.5 : 0, w = 30, h = 46;
    g.save(); g.translate(x + sh, base);
    g.beginPath(); g.moveTo(-w, 0); g.bezierCurveTo(-w * 1.1, -h * 0.7, -w * 0.5, -h, 0, -h); g.bezierCurveTo(w * 0.5, -h, w * 1.1, -h * 0.7, w, 0); g.closePath();
    const gr = g.createLinearGradient(0, -h, 0, 0); gr.addColorStop(0, '#ffd35c'); gr.addColorStop(1, '#c9832a'); g.fillStyle = gr; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 2; g.stroke();
    g.strokeStyle = 'rgba(120,70,10,.6)'; g.lineWidth = 2;
    for (let i = 1; i < 4; i++) { const yy = -h * i / 4, ww = w * (1.05 - Math.pow(i / 4, 2) * 0.6); g.beginPath(); g.moveTo(-ww, yy); g.quadraticCurveTo(0, yy + 5, ww, yy); g.stroke(); }
    g.fillStyle = '#2a1806'; g.beginPath(); g.ellipse(0, -h * 0.3, 7, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,214,90,.9)'; g.beginPath(); g.ellipse(-w * 0.55, -3, 6, 3, 0, 0, Math.PI * 2); g.fill();   // a honey drip
    g.restore();
    if (!VX_LOW()) for (let i = 0; i < 2; i++) { const a = t * 0.07 + i * Math.PI; vxBee(g, x + Math.cos(a) * 34, base - 46 + Math.sin(a * 2) * 8, 0.6, Math.cos(a) > 0 ? Math.PI : 0, t + i * 5); }
  },
  bee(g, p, t, x, y, r, dir) {   // a worker bee from the hive
    vxBee(g, x, y, 1.15, vxAng(p), t, p.color);
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,240,180,.35)'; g.lineWidth = 2; const a = vxAng(p);
    g.beginPath(); g.moveTo(x - Math.cos(a) * 10, y - Math.sin(a) * 10); g.lineTo(x - Math.cos(a) * 22, y - Math.sin(a) * 22); g.stroke(); g.restore();
  }
});

/* ---------- move effects ---------- */
if (typeof fxEventNew === 'function') {
  const fxEventNoQueen = fxEventNew;
  fxEventNew = function (type, x, y, a, b, col) {
    switch (type) {
      case 'venom': spawnFx({ k: 'vxmarks', x, y, n: a || 1, life: 40 }); spawnFx({ k: 'ring', x, y: y + 10, life: 12, r0: 6, r1: 28, col: '#c8ff3a', lw: 2 }); return;
      case 'toxin':
        spawnFx({ k: 'ring', x, y, life: 20, r0: 10, r1: 110, col: '#c8ff3a', lw: 6 }); spawnFx({ k: 'ring', x, y, life: 16, r0: 6, r1: 70, col: '#8a1a6a', lw: 4 });
        spawnFx({ k: 'flash', life: 5, a: 0.18, col: '200,255,58' });
        for (let i = 0; i < (VX_LOW() ? 6 : 14); i++) spawnFx({ k: 'vxbub', x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4, life: 26, size: 3 + Math.random() * 4 });
        return;
      case 'toxtick': for (let i = 0; i < 3; i++) spawnFx({ k: 'vxbub', x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5), vy: -1.2, life: 22, size: 2.5 + Math.random() * 2 }); return;
      case 'swarmon': spawnFx({ k: 'ring', x, y, life: 14, r0: 50, r1: 12, col: '#ffc21a', lw: 3 }); return;
      case 'zig': spawnFx({ k: 'vxgust', x, y, d: a || 1, life: 12 }); return;
      case 'beeout': spawnFx({ k: 'ring', x, y, life: 10, r0: 4, r1: 22, col: '#ffd35c', lw: 2 }); return;
    }
    fxEventNoQueen(type, x, y, a, b, col);
  };
}
if (typeof drawFxNew === 'function') {
  const drawFxNoQueen = drawFxNew;
  drawFxNew = function (g, p, k) {
    if (p.k === 'vxmarks') {   // venom drops over their head: one, two... (the third bursts)
      g.globalAlpha = Math.min(1, (1 - k) * 2);
      for (let i = 0; i < 3; i++) { const xx = p.x + (i - 1) * 14, yy = p.y - 16 - k * 8; g.beginPath(); g.moveTo(xx, yy - 7); g.quadraticCurveTo(xx + 6, yy + 1, xx, yy + 5); g.quadraticCurveTo(xx - 6, yy + 1, xx, yy - 7);
        g.fillStyle = i < p.n ? '#c8ff3a' : 'rgba(0,0,0,.25)'; g.fill(); g.strokeStyle = '#2a1a08'; g.lineWidth = 1.2; g.stroke(); }
      return;
    }
    if (p.k === 'vxbub') { p.x += p.vx || 0; p.y += p.vy || 0; g.globalAlpha = 1 - k; g.fillStyle = 'rgba(200,255,58,.75)'; circle(g, p.x, p.y, p.size); g.fill(); g.strokeStyle = 'rgba(138,26,106,.8)'; g.lineWidth = 1; g.stroke(); return; }
    if (p.k === 'vxgust') { g.globalAlpha = 1 - k; g.strokeStyle = 'rgba(255,240,190,.8)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(p.x - p.d * (14 + i * 8), p.y + i * 6, 18 + k * 20, -0.8, 0.8); g.stroke(); } return; }
    drawFxNoQueen(g, p, k);
  };
}
if (typeof SKFX_EVENTS !== 'undefined') Object.assign(SKFX_EVENTS, { zig: 1, beeout: 1, swarmon: 1 });

/* ---------- the honeycomb aim ---------- */
if (typeof drawUltAimRemake === 'function') {
  const drawUltAimNoQueen = drawUltAimRemake;
  drawUltAimRemake = function (g, view, t) {
    const u = view.ult, f = view.fighters.find(x => x.slot === u.slot); if (!f) return false;
    const def = ultDef(f.c); if (def.aim !== 'comb') return drawUltAimNoQueen(g, view, t);
    const B = view.stage.blast, lock = u.ph === 'lock', R = ULT_R;
    g.save();
    g.fillStyle = 'rgba(40,24,2,.42)'; g.fillRect(B.l - 400, B.t - 400, B.r - B.l + 800, B.b - B.t + 800);
    const col = lock ? (Math.floor(t / 3) % 2 ? '#ff4a2a' : '#ffffff') : '#ffc21a';
    // a ring of honeycomb cells around the reticle
    g.strokeStyle = 'rgba(255,194,26,.35)'; g.lineWidth = 2;
    const hs = R * 0.36;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + t * 0.01; vxHex(g, u.ax + Math.cos(a) * hs * 1.75, u.ay + Math.sin(a) * hs * 1.75, hs, Math.PI / 6); g.stroke(); }
    vxHex(g, u.ax, u.ay, R, Math.PI / 6); g.strokeStyle = col; g.lineWidth = 3; g.stroke();
    vxHex(g, u.ax, u.ay, hs, Math.PI / 6); g.fillStyle = lock ? 'rgba(255,74,42,.35)' : 'rgba(255,194,26,.25)'; g.fill(); g.stroke();
    if (!VX_LOW()) for (let i = 0; i < 6; i++) { const a = t * 0.08 + i * Math.PI / 3; vxBee(g, u.ax + Math.cos(a) * (R + 16), u.ay + Math.sin(a) * (R + 16), 0.8, a + Math.PI / 2, t + i); }
    g.font = '700 15px "Chakra Petch", system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = col;
    g.fillText(lock ? 'BY ORDER OF THE QUEEN!' : 'CHOOSE THE HIVE CELL', u.ax, u.ay - R - 14);
    if (!lock) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(u.ax - 70, u.ay + R + 12, 140, 6); g.fillStyle = '#ffc21a'; g.fillRect(u.ax - 70, u.ay + R + 12, 140 * Math.max(0, u.aim) / ULT_AIM, 6); }
    g.restore();
    return true;
  };
}

/* ---------- the finisher: sealed in a honeycomb cell, the swarm stings, the royal stinger lance ---------- */
if (typeof drawUltWorldRemake === 'function') {
  const drawUltWorldNoQueen = drawUltWorldRemake;
  drawUltWorldRemake = function (g, view, c, t) {
    const { f, tg, def, k } = c;
    if (def.style !== 'hive') return drawUltWorldNoQueen(g, view, c, t);
    const FIN = ULT_FX_FINAL * ULT_ART, low = VX_LOW();
    g.save();
    tg.forEach((o, j) => {
      const x = o.x, y = o.y - o.H / 2, fin = k >= FIN, p = fin ? Math.min(1, (k - FIN) / 22) : 0;
      const seal = Math.min(1, k / 12), R = 70;
      // the wax cell walls close in around them, with the cells around it
      if (!fin || p < 0.4) {
        g.globalAlpha = fin ? 1 - p / 0.4 : 1;
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; vxHex(g, x + Math.cos(a) * R * 1.73, y + Math.sin(a) * R * 1.73, R * seal, 0); g.fillStyle = 'rgba(232,162,26,.55)'; g.fill(); g.strokeStyle = '#8a5a0a'; g.lineWidth = 5; g.stroke(); }
        vxHex(g, x, y, R * (2 - seal), 0); g.strokeStyle = '#ffc21a'; g.lineWidth = 7; g.stroke(); g.fillStyle = 'rgba(255,214,90,.18)'; g.fill();
        g.globalAlpha = 1;
      }
      if (!fin) {   // the swarm stings from every side
        const n = low ? 8 : 16;
        for (let i = 0; i < n; i++) { const a = k * 0.25 + i * 2 * Math.PI / n, rr = R * (0.6 + 0.4 * Math.sin(k * 0.3 + i)); vxBee(g, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8, 1, a + Math.PI, k + i); }
        urmHits(def).forEach(at => { const q = (k - at + 4) / 8; if (q < 0 || q > 1) return; g.strokeStyle = `rgba(200,255,58,${1 - q})`; g.lineWidth = 4; circle(g, x, y, 14 + q * 50); g.stroke(); });
      } else {   // the royal stinger lance pierces through, wax shatters
        const dir = Math.sign(x - f.x) || 1, len = 260, tip = x + dir * (-60 + p * 160);
        g.save(); g.translate(tip, y); g.scale(dir, 1);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-len, -16); g.lineTo(-len - 20, 0); g.lineTo(-len, 16); g.closePath();
        const lg = g.createLinearGradient(-len, 0, 0, 0); lg.addColorStop(0, '#1a1206'); lg.addColorStop(0.6, '#ffc21a'); lg.addColorStop(1, '#fff1b8'); g.fillStyle = lg; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 2.5; g.stroke();
        g.fillStyle = '#1a1206'; for (let i = 1; i < 5; i++) g.fillRect(-len * i / 5, -12 + i * 2, 10, 24 - i * 4);
        g.restore();
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,214,90,${1 - p})`; g.lineWidth = 8; circle(g, x, y, 30 + p * 230); g.stroke(); g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.save(); g.translate(x + Math.cos(a) * p * 190, y + Math.sin(a) * p * 140); g.rotate(a + p * 5); vxHex(g, 0, 0, 10 * (1 - p * 0.5), 0); g.fillStyle = `rgba(232,162,26,${1 - p})`; g.fill(); g.restore(); }
      }
    });
    g.restore();
    return true;
  };
}

/* ---------- her opening scene: the throne room inside the great hive ---------- */
if (typeof UI_SCENES !== 'undefined') {
  UI_SCENES.hive = function (o) {
    const { g, f, k, vw, vh, S, cx, low } = o, gy = vh * 0.82;
    const bg = g.createRadialGradient(cx, vh * 0.45, 20, cx, vh * 0.45, vw * 0.7); bg.addColorStop(0, '#5a3406'); bg.addColorStop(1, '#140a02');
    g.fillStyle = bg; g.fillRect(0, 0, vw, vh);
    // honeycomb walls light up cell by cell, from the middle out
    const hr = 34 * S, dx = hr * Math.sqrt(3), lit = k * 0.3;
    for (let row = -1; row < vh / (hr * 1.5) + 1; row++) for (let col = -1; col < vw / dx + 1; col++) {
      const x = col * dx + (row % 2 ? dx / 2 : 0), y = row * hr * 1.5, d = Math.hypot(x - cx, y - vh * 0.45) / (40 * S);
      vxHex(g, x, y, hr * 0.94, Math.PI / 6);
      const on = Math.max(0, Math.min(1, lit - d));
      g.fillStyle = `rgba(${150 + on * 80 | 0},${80 + on * 70 | 0},${6 + on * 20 | 0},${0.2 + on * 0.35})`; g.fill();
      g.strokeStyle = 'rgba(40,20,0,.8)'; g.lineWidth = 3 * S; g.stroke();
    }
    // honey dripping from the top
    if (!low) for (let i = 0; i < 7; i++) { const x = vw * (0.08 + i * 0.14), len = (40 + vxSeed(i) * 90) * S * Math.min(1, k / 40); g.fillStyle = 'rgba(255,194,26,.9)'; g.fillRect(x - 4 * S, 0, 8 * S, len); circle(g, x, len, 7 * S); g.fill(); }
    // the throne, then the queen rises on it
    g.fillStyle = '#2a1806'; g.fillRect(0, gy, vw, vh - gy);
    const tw = 170 * S; g.fillStyle = '#4a2006'; g.beginPath(); g.moveTo(cx - tw / 2, gy); g.lineTo(cx - tw / 2, gy - 220 * S); g.quadraticCurveTo(cx, gy - 300 * S, cx + tw / 2, gy - 220 * S); g.lineTo(cx + tw / 2, gy); g.closePath(); g.fill();
    g.strokeStyle = '#ffd35c'; g.lineWidth = 4 * S; g.stroke();
    const rise = uiOut(uiSeg(k, 8, 34));
    uiFig(g, f, cx, gy - 30 * S * rise, 210 * S, k > 44 ? 'power' : 'idle', 1);
    // the swarm spirals in and forms a crown of bees over her
    const n = low ? 10 : 22;
    for (let i = 0; i < n; i++) {
      const q = uiOut(uiSeg(k, 10 + i, 50 + i)), a = i / n * Math.PI * 2 + k * 0.05, rr = (1 - q) * vw * 0.6 + q * 70 * S;
      vxBee(g, cx + Math.cos(a) * rr, vh * 0.3 + Math.sin(a) * rr * (0.3 + 0.7 * (1 - q)), 1.5 * S, a + Math.PI / 2, k + i);
    }
    if (k > 52) { g.font = `${Math.round(30 * S)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.globalAlpha = uiSeg(k, 52, 60); g.lineWidth = 6 * S; g.strokeStyle = '#1a0a02'; g.strokeText("QUEEN'S DECREE", cx, vh * 0.12); g.fillStyle = '#ffd35c'; g.fillText("QUEEN'S DECREE", cx, vh * 0.12); g.globalAlpha = 1; }
  };
}

/* ---------- her unlock scene (unlock-fx.js loads later, so add it once the page has loaded) ---------- */
function vxUnlockScene() {
  if (typeof UNL_SCENES === 'undefined') return;
  /* night in the overgrown castle garden: a giant flower bud glows and opens, a swarm pours out
     and becomes her, then a crown drops onto her head */
  UNL_SCENES.vexa = function (g, c, k, vw, vh, S, low) {
    const sky = g.createLinearGradient(0, 0, 0, vh); sky.addColorStop(0, '#050c08'); sky.addColorStop(1, '#1a2a10');
    g.fillStyle = sky; g.fillRect(0, 0, vw, vh);
    const gy = vh * 0.8;
    // castle ruins and vines in the back
    g.fillStyle = '#0c160a'; for (let i = 0; i < 5; i++) { const x = vw * (0.05 + i * 0.22), h = (140 + vxSeed(i) * 160) * S; g.fillRect(x, gy - h, 60 * S, h); for (let j = 0; j < 3; j++) g.fillRect(x + j * 24 * S, gy - h - 16 * S, 14 * S, 16 * S); }
    g.strokeStyle = '#1e3a12'; g.lineWidth = 5 * S; for (let i = 0; i < 6; i++) { const x = vw * vxSeed(i + 20); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 40 * S, vh * 0.2, x - 40 * S, vh * 0.4, x + 10 * S, vh * 0.55); g.stroke(); }
    g.fillStyle = '#0a1206'; g.fillRect(0, gy, vw, vh - gy);
    // pollen drifting in the dark
    g.fillStyle = '#ffd35c'; for (let i = 0; i < (low ? 16 : 40); i++) { g.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(k * 2 + i)); circle(g, vxSeed(i) * vw, (vxSeed(i + 7) * vh * 0.7 - k * 20 * S + vh) % vh, 2 * S); g.fill(); } g.globalAlpha = 1;
    // the giant bud opens
    const cx = vw / 2, open = unlOut(unlSeg(k, 0.6, 2.2));
    if (k < 3.4) {
      g.save(); g.translate(cx, gy);
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * (0.18 + open * 0.32); g.save(); g.rotate(a + Math.PI / 2); g.beginPath(); g.ellipse(0, -110 * S, 40 * S, 110 * S, 0, 0, Math.PI * 2);
        g.fillStyle = i % 2 ? '#8a1a6a' : '#a8327a'; g.globalAlpha = 1 - unlSeg(k, 2.8, 3.4); g.fill(); g.restore(); }
      g.globalAlpha = 1; g.restore();
      const gl = g.createRadialGradient(cx, gy - 120 * S, 0, cx, gy - 120 * S, 160 * S); gl.addColorStop(0, `rgba(255,214,90,${0.6 * open})`); gl.addColorStop(1, 'rgba(255,214,90,0)'); g.fillStyle = gl; g.fillRect(0, 0, vw, vh);
    }
    // the swarm pours out and gathers into her shape
    const gather = unlOut(unlSeg(k, 1.6, 3.2)), n = low ? 18 : 40;
    if (k > 1.4 && k < 3.6) for (let i = 0; i < n; i++) {
      const a = i * 2.4 + k * 3, r0 = 200 * S * (1 - gather) + 20 * S, tx = cx + (vxSeed(i) - 0.5) * 70 * S, ty = gy - (20 + vxSeed(i + 3) * 190) * S;
      vxBee(g, tx + Math.cos(a) * r0, ty + Math.sin(a) * r0 * 0.6, 1.4 * S, a, k * 60 + i);
    }
    if (k > 2.8) unlFighter(g, c, cx, gy, 230 * S, 'idle', 1, k < 3.6 ? '#3a2a06' : false, unlSeg(k, 2.8, 3.3));
    // the crown drops onto her head
    if (k > 3.4 && k < 4.6) { const q = unlOut(unlSeg(k, 3.4, 4.1)), y = vh * 0.05 + (gy - 236 * S - vh * 0.05) * q;
      g.save(); g.translate(cx + 8 * S, y); g.scale(S * 2, S * 2); g.beginPath(); g.moveTo(-14, 0); g.lineTo(-14, -10); g.lineTo(-7, -4); g.lineTo(0, -14); g.lineTo(7, -4); g.lineTo(14, -10); g.lineTo(14, 0); g.closePath(); fillStroke(g, '#ffc21a', 1.5); g.restore();
      if (q >= 1) { g.fillStyle = `rgba(255,240,190,${1 - unlSeg(k, 4.1, 4.6)})`; g.fillRect(0, 0, vw, vh); } }
    if (k > 0.4 && k < 2.8) { g.font = `${Math.round(22 * S)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#ffd35c'; g.fillText('…the hive is waking up', vw / 2, vh * 0.14); }
  };
}
if (typeof window !== 'undefined') { if (document.readyState === 'complete') vxUnlockScene(); else window.addEventListener('load', vxUnlockScene); }

/* ---------- the Overgrown Kingdom stage ---------- */
if (typeof STAGE_ART !== 'undefined' && typeof evPlat === 'function') {
  const LOOK = ['#4a8a2a', '#ffc21a', '#5a5a4a', '#3a3a30', '#3a7a2a', '#2a5a1a', 'flowers'];
  STAGE_ART.kingdom = {
    bg(g, vw, vh, cam, t) {
      const px = cam.x - 800, gr = g.createLinearGradient(0, 0, 0, vh);
      gr.addColorStop(0, '#0e1a12'); gr.addColorStop(0.55, '#3a5a1a'); gr.addColorStop(1, '#c9a23a');
      g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
      const sx = vw * 0.72 - px * 0.02, sy = vh * 0.26, sg = g.createRadialGradient(sx, sy, 0, sx, sy, vh * 0.2);   // a low golden sun
      sg.addColorStop(0, '#fff1b8'); sg.addColorStop(0.3, 'rgba(255,214,90,.9)'); sg.addColorStop(1, 'rgba(255,214,90,0)'); g.fillStyle = sg; g.fillRect(sx - vh * 0.2, sy - vh * 0.2, vh * 0.4, vh * 0.4);
      evSilhouette(g, vw, vh, px, '#1e3a16', 0.7, 'spires', 0);   // the castle, far away
      // vines climbing the castle and hanging from the top
      g.strokeStyle = '#2e5a1a'; g.lineWidth = 6;
      for (let i = 0; i < 7; i++) { const x = ((i * 211 - px * 0.06) % (vw + 100) + vw + 100) % (vw + 100) - 50; g.beginPath(); g.moveTo(x, -10); g.bezierCurveTo(x + 30, vh * 0.15, x - 30, vh * 0.25, x + Math.sin(t * 0.01 + i) * 10, vh * (0.28 + vxSeed(i) * 0.12)); g.stroke();
        g.fillStyle = '#3a7a2a'; for (let j = 1; j < 4; j++) { g.beginPath(); g.ellipse(x + (j % 2 ? 10 : -10), vh * 0.07 * j, 9, 4, j % 2 ? 0.5 : -0.5, 0, Math.PI * 2); g.fill(); } }
      // giant flowers in front of the castle
      const off = -px * 0.09;
      for (let i = 0; i < 6; i++) {
        const x = ((i * 260 + off) % (vw + 260) + vw + 260) % (vw + 260) - 130, y = vh * (0.72 + vxSeed(i + 3) * 0.06), r = vh * (0.05 + vxSeed(i) * 0.03);
        g.strokeStyle = '#1e3a16'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, vh); g.quadraticCurveTo(x + 20, y + r * 2, x, y); g.stroke();
        for (let pI = 0; pI < 6; pI++) { const a = pI / 6 * Math.PI * 2 + Math.sin(t * 0.01 + i) * 0.1; g.fillStyle = i % 2 ? '#a8327a' : '#e86a3a'; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, r * 0.7, r * 0.35, a, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#ffc21a'; circle(g, x, y, r * 0.45); g.fill();
      }
      evSilhouette(g, vw, vh, px, '#14260e', 0.86, 'hills', 1);
      g.save(); evParticles(g, vw, vh, t, 'firefly', ['#ffd35c', '#fff1b8']); g.restore();   // pollen
      // a big hive hanging from a branch at the top
      const hx = vw * 0.2 - px * 0.04, hy = vh * 0.1;
      g.strokeStyle = '#2a1806'; g.lineWidth = 8; g.beginPath(); g.moveTo(hx - 120, hy - 30); g.lineTo(hx + 120, hy - 20); g.stroke();
      g.fillStyle = '#b8781a'; g.beginPath(); g.ellipse(hx, hy + 30, 36, 50, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(90,50,5,.7)'; g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(hx, hy + 30, 36 - i * 2, 50, 0, Math.PI * (0.15 + i * 0.12), Math.PI * (0.85 - i * 0.12)); g.stroke(); }
    },
    fg(g, st, t) {
      st.plats.forEach(p => evPlat(g, p, LOOK, t));
      st.solids.forEach(x => {
        evSolid(g, x, st, LOOK, t);
        g.strokeStyle = '#3a7a2a'; g.lineWidth = 4;   // vines over the castle wall
        for (let xx = x.x + 30; xx < x.x + x.w - 20; xx += 110) { g.beginPath(); g.moveTo(xx, x.y + 4); g.bezierCurveTo(xx + 20, x.y + 30, xx - 20, x.y + 50, xx + 6, x.y + x.h + 20); g.stroke(); g.fillStyle = '#4a9a2a'; g.beginPath(); g.ellipse(xx + 8, x.y + 34, 7, 3.5, 0.6, 0, Math.PI * 2); g.fill(); }
      });
      if (typeof drawStageFront === 'function') drawStageFront(g, st, t);
    }
  };
}
