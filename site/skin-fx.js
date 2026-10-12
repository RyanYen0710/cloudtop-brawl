'use strict';
/* ===== CLOUDTOP BRAWL — skin effects =====
   Like Brawl Stars: a skin changes how a fighter's abilities look, not just the fighter.
   - Projectiles, attack swooshes and the ultimate's world art take the skin's colour (its glow colour, skins.js `aura`),
     and projectiles leave a little trail of the skin's floating bits (sparkles, embers, bats, leaves, snow...).
   - Hit sparks and ultimate hit effects use the skin's colours, plus a small burst of its bits.
   - Prism, Mythic and Diamond (the rainbow glows) cycle through every colour.
   Looks only: damage, hitboxes and timing are exactly the same with or without a skin.
   Online, everyone sees each player's skin effects (projectiles carry their owner's slot in the snapshot). */

/* the skin each fighter slot is wearing right now (filled while fighters are drawn) */
const SKFX_SLOT = {};
const SKFX = {
  /* can this browser recolour drawings with canvas filters? (fast, keeps all the shading) */
  filter: (function () { try { const c = document.createElement('canvas').getContext('2d'); if (typeof c.filter !== 'string') return false; c.filter = 'sepia(1)'; return c.filter === 'sepia(1)'; } catch (e) { return false; } })(),
  low: () => typeof PERF !== 'undefined' && PERF.low
};

/* ---------- a skin's effect colours ---------- */
function skfxRgb(s) { return s.aura && s.aura !== 'prism' ? s.aura.split(',').map(Number) : null; }
function skfxHsl(rgb) {
  const [r, g, b] = rgb.map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
/* hue (degrees), how colourful (0..1) and how bright (0..1); rainbow skins spin the hue */
function skfxTone(s, t) {
  const rgb = skfxRgb(s);
  if (!rgb) return { h: (t * 2) % 360, s: 1, l: 0.62, rainbow: true };
  const [h, sat, l] = skfxHsl(rgb);
  return { h, s: sat, l };
}
/* three colours for sparks and rings: deep, main, bright */
function skfxCols(s, t) {
  const o = skfxTone(s, t), sat = Math.round(Math.max(0.25, o.s) * 100);
  return [`hsl(${o.h | 0},${sat}%,38%)`, `hsl(${o.h | 0},${sat}%,${Math.round(Math.min(0.68, Math.max(0.5, o.l)) * 100)}%)`, `hsl(${o.h | 0},${Math.min(100, sat + 10)}%,84%)`];
}
/* a canvas filter that repaints a drawing in the skin's colour, keeping light and dark (sepia's own hue is about 38deg) */
function skfxFilter(s, t) {
  const o = skfxTone(s, t);
  const sat = (1.4 + Math.max(0.15, o.s) * 3.2).toFixed(2), br = o.l > 0.78 ? 1.18 : o.l < 0.45 ? 1.1 : 1.05;
  return `sepia(1) hue-rotate(${Math.round(o.h - 38)}deg) saturate(${sat}) brightness(${br})`;
}
function skfxOf(f) { const id = f && (f.skin || (f.slot != null && SKFX_SLOT[f.slot])); return id && typeof SKINS !== 'undefined' ? SKINS[id] || null : null; }

/* draw something in a skin's colour (or just draw it, when there's no skin or the device is struggling) */
function skfxPaint(g, s, t, draw) {
  if (!s || !SKFX.filter || SKFX.low()) return draw();
  const f0 = g.filter, on0 = SKFX.on;
  g.filter = skfxFilter(s, t); SKFX.on = true;
  try { return draw(); } finally { g.filter = f0 || 'none'; SKFX.on = on0; }
}
/* fighters drawn inside an effect (the ultimate's actor, someone caught in a net) keep their own colours */
function skfxPlain(g, draw) {
  if (!SKFX.on) return draw();
  const f0 = g.filter; g.filter = 'none'; SKFX.on = false;
  try { return draw(); } finally { g.filter = f0; SKFX.on = true; }
}
['drawUltActor', 'drawUltActorRemake'].forEach(n => {
  if (typeof window !== 'undefined' && typeof window[n] === 'function') {
    const plain = window[n];
    window[n] = function () { const a = arguments; return skfxPlain(a[0], () => plain.apply(this, a)); };
  }
});

/* ---------- the skin's little bits, as particles (hit bursts and projectile trails) ---------- */
function skfxBits(s, x, y, n, spd, life, t) {
  const cols = s.fxc && s.fxc.length ? s.fxc : skfxCols(s, t);
  for (let i = 0; i < n; i++) {
    const an = Math.random() * 6.28, v = spd * (0.4 + Math.random() * 0.8);
    spawnFx({ k: 'skbit', fx: s.fx || 'sparkle', x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v - (s.fx === 'ember' ? 1 : 0), g: s.fx === 'snow' || s.fx === 'leaf' || s.fx === 'petal' ? 0.06 : 0, life: life * (0.7 + Math.random() * 0.5), col: cols[i % cols.length], size: 3 + Math.random() * 2, rot: Math.random() * 6 });
  }
}
if (typeof drawFxNew === 'function') {
  const drawFxNoSkin = drawFxNew;
  drawFxNew = function (g, p, k) {
    if (p.k !== 'skbit') return drawFxNoSkin(g, p, k);
    const a = Math.min(1, (1 - k) * 1.6), x = p.x, y = p.y, r = p.size;
    g.globalAlpha = a; g.fillStyle = p.col; g.strokeStyle = p.col;
    switch (p.fx) {
      case 'sparkle': case 'star': {
        const q = p.fx === 'star' ? r * 1.3 : r; g.globalCompositeOperation = 'lighter';
        g.translate(x, y); g.rotate(p.t * 0.1 + p.rot); g.beginPath();
        for (let i = 0; i < 8; i++) { const rr = i % 2 ? q * 0.35 : q * 1.6, an = i * Math.PI / 4; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
        g.closePath(); g.fill(); break;
      }
      case 'ember': g.globalCompositeOperation = 'lighter'; circle(g, x, y, r * 0.8); g.fill(); g.globalAlpha = a * 0.35; circle(g, x, y, r * 2); g.fill(); break;
      case 'smoke': g.globalAlpha = a * 0.6; circle(g, x, y, r * (1.6 + k * 2)); g.fill(); break;
      case 'bubble': g.lineWidth = 1.5; circle(g, x, y, r * (1 + k)); g.stroke(); break;
      case 'snow': circle(g, x, y, r * 0.75); g.fill(); break;
      case 'leaf': case 'petal': g.translate(x, y); g.rotate(p.t * 0.15 + p.rot); g.beginPath(); g.ellipse(0, 0, r * 1.5, r * 0.7, 0, 0, Math.PI * 2); g.fill(); break;
      case 'bat': { const w = r * 2, fl = Math.sin(p.t * 0.6 + p.rot) * r; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x - w, y - fl); g.quadraticCurveTo(x - w / 2, y + 2, x, y); g.quadraticCurveTo(x + w / 2, y + 2, x + w, y - fl); g.stroke(); break; }
      default: circle(g, x, y, r); g.fill();
    }
  };
}

/* ---------- projectiles: the skin's colour and a trail of its bits ---------- */
if (typeof drawProj === 'function') {
  const drawProjNoSkin = drawProj;
  drawProj = function (g, p, t) {
    const own = p.owner || (p.os != null && p.os >= 0 ? { slot: p.os } : null), s = skfxOf(own);
    if (!s) return drawProjNoSkin(g, p, t);
    // a soft glow of the skin's colour under it
    const c = skfxCols(s, t), r = Math.max(10, (p.size || 10) * 1.1);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45;
    const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.8); gr.addColorStop(0, c[2]); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(p.x - r * 1.8, p.y - r * 1.8, r * 3.6, r * 3.6); g.restore();
    if (SKFX.filter && !SKFX.low()) skfxPaint(g, s, t, () => drawProjNoSkin(g, p, t));
    else { const col0 = p.color; p.color = c[1]; try { drawProjNoSkin(g, p, t); } finally { p.color = col0; } }   // older browsers: just its main colour
    // the trail: a bit every few frames (fewer on slow devices)
    const every = SKFX.low() ? 9 : 4, key = (t + Math.round(p.x * 0.13)) | 0;
    if (key % every === 0 && typeof spawnFx === 'function') skfxBits(s, p.x - (p.dir || Math.sign(p.vx) || 1) * r * 0.6, p.y, 1, 0.8, 26, t);
  };
}

/* ---------- melee swooshes in the skin's colour ---------- */
if (typeof drawSwoosh === 'function') {
  const drawSwooshNoSkin = drawSwoosh;
  drawSwoosh = function (g, f, t) {
    const s = f && f.hot ? skfxOf(f) : null;
    if (!s) return drawSwooshNoSkin(g, f, t);
    return skfxPaint(g, s, t, () => drawSwooshNoSkin(g, f, t));
  };
}

/* ---------- remember which skin each slot wears (projectiles online only know their owner's slot) ---------- */
if (typeof drawFighter === 'function') {
  const drawFighterNoSkinFx = drawFighter;
  drawFighter = function (g, f, t, portrait) {
    if (f && !portrait && f.slot != null) { if (f.skin) SKFX_SLOT[f.slot] = f.skin; else delete SKFX_SLOT[f.slot]; }
    return skfxPlain(g, () => drawFighterNoSkinFx(g, f, t, portrait));
  };
}

/* ---------- the ultimate's world art (beams, arrows, vines, lightning...) in the skin's colour ---------- */
if (typeof drawUltWorld === 'function') {
  const drawUltWorldNoSkin = drawUltWorld;
  drawUltWorld = function (g, view, t) {
    const u = view && view.ult, f = u && view.fighters && view.fighters.find(x => x.slot === u.slot), s = skfxOf(f);
    if (!s) return drawUltWorldNoSkin(g, view, t);
    return skfxPaint(g, s, t, () => drawUltWorldNoSkin(g, view, t));
  };
}

/* ---------- hit sparks and other attack effects ---------- */
/* effects whose last number is the attacker's slot */
const SKFX_EVENTS = { hit: 1, ulthit: 1, ultfinal: 1, ultback: 1, ultlock: 1, zapline: 1, roll: 1, rollhit: 1, mechon: 1, mechoff: 1, frzarm: 1, frzfire: 1 };
if (typeof fxEvent === 'function') {
  const fxEventNoSkin = fxEvent;
  fxEvent = function (e, getF) {
    const type = e[1], f = SKFX_EVENTS[type] && getF ? getF(e[5]) : null, s = skfxOf(f);
    if (!s || typeof spawnFx !== 'function') return fxEventNoSkin(e, getF);
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 16.7;
    const cols = skfxCols(s, t), spawn0 = spawnFx;
    // while this effect is made, its particles take the skin's colours (white stays white, so hits still pop)
    spawnFx = function (o) {
      if (o && typeof o.col === 'string' && o.k !== 'flash') {
        const w = /^#f{3,6}$/i.test(o.col) || /^#fff[0-9a-f]{3}$/i.test(o.col) && o.k === 'spark';
        if (!w) o.col = o.k === 'ring' ? cols[1] : cols[(Math.random() * 3) | 0];
      }
      return spawn0(o);
    };
    try { fxEventNoSkin(e, getF); } finally { spawnFx = spawn0; }
    if (type === 'hit') skfxBits(s, e[2], e[3], SKFX.low() ? 3 : Math.min(10, 4 + (e[4] | 0) / 3), 3.5, 30, t);
    else if (type === 'ulthit' || type === 'ultfinal') skfxBits(s, e[2], e[3], SKFX.low() ? 4 : 12, 5, 34, t);
  };
}
