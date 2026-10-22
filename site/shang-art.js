'use strict';
/* ===== CLOUDTOP BRAWL — how Mr. Shang looks (drawing only; the rules are in shang.js) =====
   His outfit and the weapon in his hand (it changes when he switches), flames, grenades, pellets, the slug,
   his move effects, the red-dot sight and the Full Arsenal finisher, and the opening scene of his ultimate. */

const SH_LOW = () => typeof PERF !== 'undefined' && PERF.low;
const shSeed = n => { const s = Math.sin(n * 73.13 + 3.7) * 43758.5453; return s - Math.floor(s); };
const SH_COL = ['#ff7a1a', '#8ad04a', '#4ab8ff'];   // flamethrower, grenade launcher, shotgun

/* the three weapons, drawn pointing right from the grip (0, 0) */
function shWeapon(g, w, s) {
  g.save(); g.scale(s, s); g.strokeStyle = OUTLINE; g.lineWidth = 1.6; g.lineJoin = 'round';
  if (w === 0) {   // flamethrower: a fat nozzle, a pilot light and a hose back to the tank
    g.fillStyle = '#3a3f4a'; g.beginPath(); g.rect(-6, -5, 30, 9); g.fill(); g.stroke();
    g.fillStyle = '#5a5f6a'; g.beginPath(); g.moveTo(24, -7); g.lineTo(34, -8); g.lineTo(34, 7); g.lineTo(24, 6); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff7a1a'; g.fillRect(4, -9, 10, 4); g.strokeRect(4, -9, 10, 4);
    g.fillStyle = '#ffb547'; g.beginPath(); g.ellipse(36, -1, 3, 2, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#26282e'; g.lineWidth = 3; g.beginPath(); g.moveTo(-6, 2); g.quadraticCurveTo(-18, 14, -26, 4); g.stroke();
  } else if (w === 1) {   // grenade launcher: a short wide barrel and a round drum
    g.fillStyle = '#4a5a32'; g.beginPath(); g.rect(-6, -6, 34, 11); g.fill(); g.stroke();
    g.fillStyle = '#2a3020'; g.beginPath(); g.rect(26, -8, 7, 15); g.fill(); g.stroke();
    g.fillStyle = '#6a7a42'; g.beginPath(); g.arc(4, 6, 8, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#2a3020'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; circle(g, 4 + Math.cos(a) * 4, 6 + Math.sin(a) * 4, 1.5); g.fill(); }
    g.fillStyle = '#8ad04a'; g.fillRect(12, -9, 6, 3);
  } else {   // shotgun: a long barrel, a pump and a wooden stock
    g.fillStyle = '#8a5a2a'; g.beginPath(); g.moveTo(-14, -2); g.lineTo(-2, -4); g.lineTo(-2, 4); g.lineTo(-14, 8); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#2e3138'; g.beginPath(); g.rect(-2, -5, 40, 6); g.fill(); g.stroke();
    g.fillStyle = '#8a5a2a'; g.beginPath(); g.rect(14, 1, 12, 5); g.fill(); g.stroke();
    g.fillStyle = '#4ab8ff'; g.fillRect(2, -7, 4, 2);
  }
  g.restore();
}

/* ---------- outfit ---------- */
const LOOK_SHANG = {
  back(g, K) {   // a fuel tank on his back with an orange stripe
    const { sw, shY, torsoH } = K;
    g.save(); g.translate(-sw * 0.5, shY + torsoH * 0.45);
    g.beginPath(); g.rect(-8, -torsoH * 0.45, 14, torsoH * 0.85); fillStroke(g, '#5a5f6a', 2);
    g.fillStyle = '#ff7a1a'; g.fillRect(-8, -torsoH * 0.12, 14, 5);
    g.beginPath(); g.ellipse(-1, -torsoH * 0.45, 7, 3, 0, 0, Math.PI * 2); fillStroke(g, '#3a3f4a', 1.5);
    g.restore();
  },
  torso(g, K) {   // a tactical vest with pouches and a shell belt
    const { sw, shY, hipY, torsoH } = K;
    g.fillStyle = '#262a32'; g.beginPath(); g.moveTo(-sw * 0.42, shY + 4); g.lineTo(sw * 0.42, shY + 4); g.lineTo(sw * 0.38, hipY - 3); g.lineTo(-sw * 0.38, hipY - 3); g.closePath(); g.fill();
    g.strokeStyle = OUTLINE; g.lineWidth = 1.5;
    [[-0.32, 0.5], [0.06, 0.5]].forEach(([a, b]) => { g.beginPath(); g.rect(sw * a, shY + torsoH * b, sw * 0.26, torsoH * 0.22); fillStroke(g, '#3a4250', 1.5); });
    g.strokeStyle = '#8a5a2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(-sw * 0.38, shY + 6); g.lineTo(sw * 0.36, hipY - 8); g.stroke();
    g.fillStyle = '#ffd35c'; for (let i = 0; i < 5; i++) { const k = 0.15 + i * 0.16; g.fillRect(-sw * 0.38 + sw * 0.74 * k - 1.5, shY + 6 + (hipY - 14 - shY) * k - 3, 3, 5); }   // shells
    g.fillStyle = '#ff7a1a'; g.fillRect(-sw * 0.5, hipY - 6, sw, 5);
  },
  head(g, K) {   // a black cap worn forward, rectangular glasses, short stubble
    const { hx, hy, hr } = K;
    g.beginPath(); g.arc(hx - hr * 0.05, hy - hr * 0.3, hr * 1.02, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); fillStroke(g, '#16181d', 2);
    g.beginPath(); g.moveTo(hx + hr * 0.5, hy - hr * 0.42); g.lineTo(hx + hr * 1.55, hy - hr * 0.34); g.lineTo(hx + hr * 1.5, hy - hr * 0.22); g.lineTo(hx + hr * 0.45, hy - hr * 0.3); g.closePath(); fillStroke(g, '#16181d', 1.8);
    g.fillStyle = '#ff7a1a'; g.fillRect(hx - hr * 0.35, hy - hr * 0.95, hr * 0.5, hr * 0.18);
    g.strokeStyle = '#16181d'; g.lineWidth = 1.8;
    g.strokeRect(hx + hr * 0.15, hy - hr * 0.24, hr * 0.38, hr * 0.26); g.strokeRect(hx + hr * 0.6, hy - hr * 0.24, hr * 0.38, hr * 0.26);
    g.beginPath(); g.moveTo(hx + hr * 0.53, hy - hr * 0.12); g.lineTo(hx + hr * 0.6, hy - hr * 0.12); g.stroke();
    g.fillStyle = 'rgba(20,20,20,.25)'; g.beginPath(); g.ellipse(hx + hr * 0.55, hy + hr * 0.5, hr * 0.5, hr * 0.22, 0, 0, Math.PI * 2); g.fill();
  },
  hand(g, K) {   // the weapon he has switched on
    const [x, y, r] = K.hand, f = K.f, w = K.portrait ? 1 : ((f && f.yenMode) | 0) % 3;
    g.save(); g.translate(x, y); g.rotate(Math.PI / 2 - (r == null ? Math.PI / 2 : r));
    shWeapon(g, w, Math.max(0.7, K.limbW / 9));
    if (!K.portrait && w === 0 && !SH_LOW()) {   // the pilot light flickers
      g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,170,60,${0.5 + Math.sin(K.t * 0.6) * 0.3})`; circle(g, 37 * Math.max(0.7, K.limbW / 9), -1, 3 + Math.sin(K.t * 0.9)); g.fill();
    }
    g.restore();
  }
};
if (typeof lookHook === 'function') {
  const lookHookNoShang = lookHook;
  lookHook = function (g, part, K) {
    if (K.has('shang')) { LOOK_SHANG[part] && LOOK_SHANG[part](g, K); return; }
    lookHookNoShang(g, part, K);
  };
}

/* ---------- shots ---------- */
if (typeof PROJ_NEW !== 'undefined') Object.assign(PROJ_NEW, {
  flame(g, p, t, x, y, r, dir) {   // a puff of fire that grows, cools from white to orange to smoke
    const k = Math.min(1, p.age / 15), R = r * 1.7;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,${Math.round(190 - k * 110)},${Math.round(60 - k * 50)},${0.75 * (1 - k * 0.55)})`;
    g.beginPath(); g.ellipse(x, y, R, R * 0.8, Math.sin(p.age + x) * 0.4, 0, Math.PI * 2); g.fill();
    if (k < 0.6) { g.fillStyle = `rgba(255,236,170,${0.75 * (1 - k * 1.6)})`; circle(g, x, y, R * 0.5); g.fill(); }
    g.restore();
    if (k > 0.6 && !SH_LOW()) { g.fillStyle = `rgba(60,50,50,${0.25 * (k - 0.6) / 0.4})`; circle(g, x, y - R * 0.3, R * 0.7); g.fill(); }
  },
  grenade(g, p, t, x, y, r0, dir) {   // a green grenade with a ridged body and a blinking light
    const r = r0 * 1.7;
    g.save(); g.translate(x, y); g.rotate(p.spin || 0);
    g.beginPath(); g.ellipse(0, 0, r * 0.62, r * 0.52, 0, 0, Math.PI * 2); fillStroke(g, p.m && p.m.boom && p.m.boom.r < 80 ? '#7a9a4a' : '#5a7a3a', 2);
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1.2; for (const d of [-0.25, 0, 0.25]) { g.beginPath(); g.moveTo(r * d, -r * 0.48); g.lineTo(r * d, r * 0.48); g.stroke(); }
    g.fillStyle = '#3a3f4a'; g.fillRect(-r * 0.15, -r * 0.75, r * 0.3, r * 0.25);
    g.restore();
    if (Math.floor(t / 4) % 2) { g.fillStyle = '#ff3b3b'; circle(g, x, y - r * 0.7, 2.2); g.fill(); }
  },
  pellet(g, p, t, x, y, r, dir) {   // a hot pellet with a short streak
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(255,224,138,.55)'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - p.vx * 1.4, y - p.vy * 1.4); g.lineTo(x, y); g.stroke();
    g.restore();
    g.fillStyle = '#ffe08a'; circle(g, x, y, 4); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1; g.stroke();
  },
  slug(g, p, t, x, y, r, dir) {   // a heavy slug with a long tracer
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(255,211,92,.4)'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - dir * 70, y); g.lineTo(x, y); g.stroke();
    g.strokeStyle = '#fff4c8'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - dir * 40, y); g.lineTo(x, y); g.stroke();
    g.restore();
    g.beginPath(); g.ellipse(x, y, 7, 4.5, 0, 0, Math.PI * 2); fillStroke(g, '#c9932a', 1.5);
  }
});

/* ---------- move effects drawn on him (Flame Jet, Recoil Jump, Swap Bash) ---------- */
if (typeof SWOOSH_NEW !== 'undefined') SWOOSH_NEW.shang = function (g, f, t, m, kind) {
  if (!f.hot) return;
  const dir = f.face || 1, cx = f.x, cy = f.y - f.H * 0.5;
  if (kind === 'dash') {   // a jet of fire behind him
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const L = 30 + i * 16 + Math.sin(t * 0.9 + i) * 6, w = 18 - i * 2.2;
      g.fillStyle = i < 2 ? 'rgba(255,240,200,.7)' : `rgba(255,${150 - i * 15},40,${0.6 - i * 0.07})`;
      g.beginPath(); g.ellipse(cx - dir * L, cy + Math.sin(t * 0.7 + i) * 3, w, w * 0.6, 0, 0, Math.PI * 2); g.fill();
    }
  } else if (kind === 'leap') {   // the blast below his feet that throws him up
    g.globalCompositeOperation = 'lighter';
    const by = f.y + 6, k = (t % 8) / 8;
    g.fillStyle = 'rgba(255,224,138,.55)'; g.beginPath(); g.moveTo(cx - 10, f.y); g.lineTo(cx + 10, f.y); g.lineTo(cx + 40, by + 50); g.lineTo(cx - 40, by + 50); g.closePath(); g.fill();
    g.strokeStyle = `rgba(255,170,60,${0.8 - k * 0.6})`; g.lineWidth = 4; g.beginPath(); g.ellipse(cx, by + 20 + k * 30, 20 + k * 30, 6 + k * 6, 0, 0, Math.PI * 2); g.stroke();
  } else {   // Swap Bash: a quick arc of the gun's stock
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.arc(cx + dir * f.W * 0.35, cy, f.W * 0.85, dir > 0 ? -1.2 : Math.PI - 0.6, dir > 0 ? 0.6 : Math.PI + 1.2); g.stroke();
  }
};

/* ---------- effects ---------- */
if (typeof fxEventNew === 'function') {
  const fxEventNoShang = fxEventNew;
  fxEventNew = function (type, x, y, a, b, col) {
    if (type === 'gboom') {   // a grenade blows up
      const r = a || 90, low = SH_LOW();
      spawnFx({ k: 'ring', x, y, life: 16, r0: 10, r1: r * 1.1, col: '#ffb547', lw: r > 80 ? 7 : 5 });
      spawnFx({ k: 'ring', x, y, life: 12, r0: 6, r1: r * 0.7, col: '#fff4c8', lw: 3 });
      for (let i = 0; i < (low ? 5 : 12); i++) { const an = Math.random() * 6.28, s = 2 + Math.random() * (r / 14); spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 1, life: 20, col: i % 3 ? '#ff8a1f' : '#ffe08a', size: 3.5 }); }
      if (!low) for (let i = 0; i < 6; i++) spawnFx({ k: 'smoke', x: x + (Math.random() - 0.5) * r * 0.6, y: y + (Math.random() - 0.5) * r * 0.4, vx: (Math.random() - 0.5) * 2, vy: -1.2, life: 26, col: 'rgba(70,60,60,.5)', size: r * 0.18 });
      return;
    }
    fxEventNoShang(type, x, y, a, b, col);
  };
}
/* his weapon switch: a ring in the new weapon's colour (Legend Yen's style switch looks different) */
if (typeof fxEvent === 'function') {
  const fxEventNoShangMode = fxEvent;
  fxEvent = function (e, getF) {
    if (e[1] === 'mode' && getF) {
      const f = getF(e[5]);
      if (f && f.c && f.c.weaponKit) {
        const x = e[2], y = e[3], col = SH_COL[(e[4] | 0) % 3];
        spawnFx({ k: 'ring', x, y, life: 14, r0: 50, r1: 12, col, lw: 4 });
        for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * 3, vy: Math.sin(an) * 3, life: 14, col, size: 3 }); }
        if (typeof SFX !== 'undefined' && SFX.play) try { SFX.play('ui'); } catch (er) { }
        return;
      }
    }
    return fxEventNoShangMode(e, getF);
  };
}
if (typeof SKFX_EVENTS !== 'undefined') Object.assign(SKFX_EVENTS, { gboom: 1 });

/* ---------- his ultimate: the red-dot sight ---------- */
if (typeof drawUltAimRemake === 'function') {
  const drawUltAimNoShang = drawUltAimRemake;
  drawUltAimRemake = function (g, view, t) {
    const u = view.ult, f = view.fighters.find(x => x.slot === u.slot); if (!f) return false;
    const def = ultDef(f.c); if (def.aim !== 'reddot') return drawUltAimNoShang(g, view, t);
    const B = view.stage.blast, lock = u.ph === 'lock', R = ULT_R;
    g.save();
    g.fillStyle = 'rgba(20,10,6,.45)'; g.fillRect(B.l - 400, B.t - 400, B.r - B.l + 800, B.b - B.t + 800);
    const col = lock ? (Math.floor(t / 3) % 2 ? '#ff3b3b' : '#ffffff') : '#ff3b3b';
    g.strokeStyle = col; g.lineWidth = 3; circle(g, u.ax, u.ay, R); g.stroke();
    g.lineWidth = 2; g.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(u.ax + dx * R * 0.45, u.ay + dy * R * 0.45); g.lineTo(u.ax + dx * (R + 16), u.ay + dy * (R + 16)); }
    g.stroke();
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,60,60,.9)'; circle(g, u.ax, u.ay, 5); g.fill(); g.fillStyle = 'rgba(255,60,60,.3)'; circle(g, u.ax, u.ay, 12); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.font = '700 15px "Chakra Petch", system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffb547';
    g.fillText(lock ? 'TARGET LOCKED' : 'ACQUIRING TARGET', u.ax, u.ay - R - 22);
    if (!lock) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(u.ax - 70, u.ay + R + 12, 140, 6); g.fillStyle = '#ff7a1a'; g.fillRect(u.ax - 70, u.ay + R + 12, 140 * Math.max(0, u.aim) / ULT_AIM, 6); }
    g.restore(); return true;
  };
}

/* ---------- the finisher: a wave of fire, a grenade barrage, then one shotgun blast ---------- */
if (typeof drawUltWorldRemake === 'function') {
  const drawUltWorldNoShang = drawUltWorldRemake;
  drawUltWorldRemake = function (g, view, c, t) {
    const { f, tg, def, k } = c;
    if (def.style !== 'loadout') return drawUltWorldNoShang(g, view, c, t);
    const FIN = ULT_FX_FINAL * ULT_ART, low = SH_LOW();
    g.save();
    tg.forEach((o, j) => {
      const x = o.x, y = o.y - o.H / 2, fin = k >= FIN, p = fin ? Math.min(1, (k - FIN) / 22) : 0, ph = k / FIN;
      if (!fin && ph < 0.45) {   // the fire wave rolls over them
        g.globalCompositeOperation = 'lighter';
        const n = low ? 6 : 12;
        for (let i = 0; i < n; i++) {
          const a = shSeed(i + j * 7), fx = x - 160 + ((ph / 0.45) * 320 + a * 80) % 320, fy = y + (shSeed(i + 3) - 0.5) * 120, rr = 24 + a * 26;
          g.fillStyle = `rgba(255,${Math.round(120 + a * 100)},40,${0.5})`; circle(g, fx, fy, rr); g.fill();
          g.fillStyle = 'rgba(255,240,200,.35)'; circle(g, fx, fy, rr * 0.45); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
      } else if (!fin) {   // grenades rain in and pop around them
        for (let i = 0; i < 5; i++) {
          const q = (ph - 0.45) / 0.55 * 5 - i; if (q < 0 || q > 1.4) continue;
          const gx = x + (shSeed(i + 11 + j) - 0.5) * 160, gy = y - 260 + Math.min(1, q) * 260 + (shSeed(i + 5) - 0.5) * 60;
          if (q < 1) { g.save(); g.translate(gx, gy); g.rotate(q * 8); g.beginPath(); g.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2); fillStroke(g, '#5a7a3a', 2.5); g.fillStyle = '#3a3f4a'; g.fillRect(-4, -16, 8, 5); g.restore(); }
          else { const b = (q - 1) / 0.4; g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,181,71,${1 - b})`; g.lineWidth = 6; circle(g, gx, gy, 10 + b * 60); g.stroke(); g.fillStyle = `rgba(255,224,138,${0.5 * (1 - b)})`; circle(g, gx, gy, 10 + b * 40); g.fill(); g.globalCompositeOperation = 'source-over'; }
        }
      } else {   // the last shotgun blast: a cone of pellets and a big ring
        const dir = Math.sign(o.x - f.x) || 1;
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(255,224,138,${0.5 * (1 - p)})`; g.beginPath(); g.moveTo(x - dir * 200, y); g.lineTo(x + dir * 40, y - 90 - p * 60); g.lineTo(x + dir * 40, y + 90 + p * 60); g.closePath(); g.fill();
        for (let i = 0; i < (low ? 6 : 14); i++) { const a = (shSeed(i + j) - 0.5) * 1.2; g.fillStyle = `rgba(255,240,200,${1 - p})`; circle(g, x - dir * 160 + dir * (200 + p * 260) * Math.cos(a), y + (200 + p * 260) * Math.sin(a), 3.5); g.fill(); }
        g.strokeStyle = `rgba(255,122,26,${1 - p})`; g.lineWidth = 8; circle(g, x, y, 30 + p * 220); g.stroke();
        g.globalCompositeOperation = 'source-over';
      }
    });
    g.restore();
    return true;
  };
}

/* ---------- the opening scene of his ultimate: the three weapons are laid out, he picks them all up ---------- */
if (typeof UI_SCENES !== 'undefined') UI_SCENES.loadout = function (o) {
  const { g, f, k, vw, vh, S, cx } = o, gy = vh * 0.8;
  g.fillStyle = '#14100c'; g.fillRect(0, 0, vw, vh);
  g.strokeStyle = 'rgba(255,122,26,.12)'; g.lineWidth = 1; g.beginPath();   // a workbench grid behind him
  for (let x = 0; x < vw; x += 34 * S) { g.moveTo(x, 0); g.lineTo(x, gy); } for (let y = 0; y < gy; y += 34 * S) { g.moveTo(0, y); g.lineTo(vw, y); } g.stroke();
  g.fillStyle = '#2a2018'; g.fillRect(0, gy, vw, vh - gy); g.fillStyle = '#ff7a1a'; g.fillRect(0, gy, vw, 5 * S);
  for (let i = 0; i < 3; i++) {   // the weapons slide in one by one, each with its colour
    const inK = Math.max(0, Math.min(1, (k - 6 - i * 10) / 12)), e = 1 - Math.pow(1 - inK, 3);
    if (e <= 0) continue;
    const wx = cx + (i - 1) * 230 * S, wy = vh * 0.22 + (1 - e) * -120 * S;
    g.save(); g.globalAlpha = e;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(wx - 95 * S, wy - 40 * S, 190 * S, 80 * S);
    g.strokeStyle = SH_COL[i]; g.lineWidth = 3 * S; g.strokeRect(wx - 95 * S, wy - 40 * S, 190 * S, 80 * S);
    g.translate(wx - 20 * S, wy); shWeapon(g, i, 2.4 * S);
    g.restore();
    g.font = `700 ${Math.round(13 * S)}px "Chakra Petch", system-ui, sans-serif`; g.textAlign = 'center'; g.fillStyle = SH_COL[i]; g.globalAlpha = e;
    g.fillText(['FLAMETHROWER', 'GRENADE LAUNCHER', 'SHOTGUN'][i], wx, wy + 58 * S); g.globalAlpha = 1;
  }
  uiFig(g, f, cx, gy + 4 * S, 200 * S, k > 46 ? 'power' : 'idle', 1);
  if (k > 48) { g.font = `${Math.round(30 * S)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.fillStyle = '#ffb547'; g.globalAlpha = Math.min(1, (k - 48) / 8); g.fillText('FULL ARSENAL', cx, vh * 0.52); g.globalAlpha = 1; }
};
