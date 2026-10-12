'use strict';
/* ===== CLOUDTOP BRAWL — skin effects =====
   Like Brawl Stars: a skin changes how a fighter's abilities look, not just the fighter.
   - Projectiles, attack swooshes and the ultimate's world art take the skin's colour (its glow colour, skins.js `aura`),
     and projectiles leave a little trail of the skin's floating bits (sparkles, embers, bats, leaves, snow...).
   - Hit sparks and ultimate hit effects use the skin's colours, plus a small burst of its bits.
   - Each skin has its own effect colour (SKFX_STYLE). Dark skins (Shadow, Midnight, Creepy) make effects BLACK with a
     thin glowing edge; Prism and Diamond cycle through every colour.
   - It covers everything the fighter does: projectiles, swooshes, move trails and bursts, glows on the body
     (Legend Yen's hands, core and style orbs), afterimages when moving, the ultimate aura and the ultimate's world art.
   Looks only: damage, hitboxes and timing are exactly the same with or without a skin.
   Online, everyone sees each player's skin effects (projectiles carry their owner's slot in the snapshot). */

/* the skin each fighter slot is wearing right now (filled while fighters are drawn) */
const SKFX_SLOT = {}, SKFX_POS = {};
const SKFX = {
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
/* each skin's effect colour: hue (degrees), colourfulness and brightness (0..1).
   dark: effects turn black with a glowing edge of that colour. rainbow: the hue keeps turning. */
const SKFX_STYLE = {
  gold: { h: 45, s: 1, l: 0.6 }, shadow: { dark: '#9a5cff' }, neon: { h: 188, s: 1, l: 0.6 }, crystal: { h: 195, s: 0.55, l: 0.86 },
  inferno: { h: 18, s: 1, l: 0.55 }, ocean: { h: 208, s: 0.9, l: 0.55 }, galaxy: { h: 272, s: 0.85, l: 0.62 }, prism: { rainbow: 1 },
  royal: { h: 290, s: 0.8, l: 0.55 }, toxic: { h: 100, s: 1, l: 0.5 }, phantom: { h: 195, s: 0.22, l: 0.9 }, mythic: { h: 2, s: 1, l: 0.52 },
  harvest: { h: 28, s: 0.9, l: 0.55 }, creepy: { dark: '#ff8a1f' }, frosty: { h: 198, s: 0.6, l: 0.88 }, lucky: { h: 356, s: 1, l: 0.5 },
  blossom: { h: 332, s: 0.8, l: 0.8 }, beach: { h: 188, s: 0.9, l: 0.6 }, bubblegum: { h: 325, s: 1, l: 0.72 }, midnight: { dark: '#3a6aff' },
  lava: { h: 14, s: 1, l: 0.5 }, arctic: { h: 200, s: 0.7, l: 0.86 }, circuit: { h: 155, s: 1, l: 0.55 }, diamond: { rainbow: 1, l: 0.86 }
};
const skfxStyle = s => (s && SKFX_STYLE[s._id || (s._id = SKIN_IDS.find(id => SKINS[id] === s))]) || null;
/* hue (degrees), how colourful (0..1) and how bright (0..1); rainbow skins spin the hue */
function skfxTone(s, t) {
  const st = skfxStyle(s);
  if (st && st.rainbow) return { h: (t * 2) % 360, s: 1, l: st.l || 0.62, rainbow: true };
  if (st && st.dark) { const [h, sat] = skfxHsl(skinHex(st.dark)); return { h, s: sat, l: 0.08, dark: st.dark }; }
  if (st) return { h: st.h, s: st.s, l: st.l };
  const rgb = skfxRgb(s);
  if (!rgb) return { h: (t * 2) % 360, s: 1, l: 0.62, rainbow: true };
  const [h, sat, l] = skfxHsl(rgb);
  return { h, s: sat, l };
}
/* three colours for sparks and rings: deep, main, bright */
function skfxCols(s, t) {
  const o = skfxTone(s, t);
  if (o.dark) return [skinMix(o.dark, '#000000', 0.55), o.dark, skinMix(o.dark, '#ffffff', 0.35)];   // sparks glow, so they use the edge colour
  const sat = Math.round(Math.max(0.25, o.s) * 100);
  return [`hsl(${o.h | 0},${sat}%,38%)`, `hsl(${o.h | 0},${sat}%,${Math.round(Math.min(0.68, Math.max(0.5, o.l)) * 100)}%)`, `hsl(${o.h | 0},${Math.min(100, sat + 10)}%,84%)`];
}
/* ---------- repainting a drawing in the skin's colour ----------
   Each colour the effect uses (fills, lines, glows and gradient stops) goes through the same maths as the CSS filters
   sepia + hue-rotate + saturate + brightness, so light and dark shading stay. Working on colours instead of using
   the canvas `filter` keeps it fast: a filter makes the browser render every effect on its own layer, every frame,
   which caused lag with skins. Colours are worked out once and remembered. */
const SKFX_P = typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D.prototype : null;
const SKFX_D = SKFX_P ? ['fillStyle', 'strokeStyle', 'shadowColor', 'shadowBlur'].reduce((o, n) => (o[n] = Object.getOwnPropertyDescriptor(SKFX_P, n), o), {}) : null;
const SKFX_PARSE = new Map(), SKFX_MAP = new Map();
let skfxScratch = null;
/* any CSS colour as [r, g, b, a] (0..255, alpha 0..1); the browser reads it for us */
function skfxParse(c) {
  let v = SKFX_PARSE.get(c); if (v) return v;
  if (!skfxScratch) skfxScratch = document.createElement('canvas').getContext('2d');
  SKFX_D.fillStyle.set.call(skfxScratch, '#000'); SKFX_D.fillStyle.set.call(skfxScratch, c);
  const x = SKFX_D.fillStyle.get.call(skfxScratch);
  if (x[0] === '#') v = [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16), 1];
  else { const m = x.match(/[\d.]+/g).map(Number); v = [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; }
  if (SKFX_PARSE.size > 4000) SKFX_PARSE.clear();
  SKFX_PARSE.set(c, v); return v;
}
const skfxCl = x => x < 0 ? 0 : x > 1 ? 1 : x;
const skfxMul = (M, c) => [skfxCl(M[0] * c[0] + M[1] * c[1] + M[2] * c[2]), skfxCl(M[3] * c[0] + M[4] * c[1] + M[5] * c[2]), skfxCl(M[6] * c[0] + M[7] * c[1] + M[8] * c[2])];
const SKFX_SEPIA = [.393, .769, .189, .349, .686, .168, .272, .534, .131];
function skfxHueM(deg) { const r = deg * Math.PI / 180, C = Math.cos(r), S = Math.sin(r); return [.213 + C * .787 - S * .213, .715 - C * .715 - S * .715, .072 - C * .072 + S * .928, .213 - C * .213 + S * .143, .715 + C * .285 + S * .140, .072 - C * .072 - S * .283, .213 - C * .213 - S * .787, .715 - C * .715 + S * .715, .072 + C * .928 + S * .072]; }
const skfxSatM = s => [.213 + .787 * s, .715 - .715 * s, .072 - .072 * s, .213 - .213 * s, .715 + .285 * s, .072 - .072 * s, .213 - .213 * s, .715 - .715 * s, .072 + .928 * s];
/* how to recolour for a skin right now (sepia's own hue is about 38deg).
   Dark skins: nearly black, see-through parts lean toward the edge colour, and a glowing edge. */
function skfxRecipe(s, t) {
  const o = skfxTone(s, t);
  if (o.dark) { const e = skfxParse(o.dark); return { key: 'd' + o.dark, steps: [[.1, 0, 0, 0, .1, 0, 0, 0, .1]], glow: skinMix(o.dark, '#ffffff', 0.15), tint: [e[0] / 255, e[1] / 255, e[2] / 255] }; }
  const sa = 1.4 + Math.max(0.15, o.s) * 3.2, br = o.l > 0.78 ? 1.18 : o.l < 0.45 ? 1.1 : 1.05, hu = Math.round(o.h - 38);
  return { key: hu + ',' + sa.toFixed(2) + ',' + br, steps: [SKFX_SEPIA, skfxHueM(hu), skfxSatM(sa), [br, 0, 0, 0, br, 0, 0, 0, br]] };
}
function skfxMapCol(R, c) {
  if (typeof c !== 'string') return c;
  const k = R.key + '|' + c; let v = SKFX_MAP.get(k); if (v) return v;
  const p = skfxParse(c); let x = [p[0] / 255, p[1] / 255, p[2] / 255];
  for (const M of R.steps) x = skfxMul(M, x);
  if (R.tint && p[3] < 1) { const q = (1 - p[3]) * 0.8; x = x.map((v, i) => v + (R.tint[i] - v) * q); }
  v = 'rgba(' + Math.round(x[0] * 255) + ',' + Math.round(x[1] * 255) + ',' + Math.round(x[2] * 255) + ',' + p[3] + ')';
  if (SKFX_MAP.size > 20000) SKFX_MAP.clear();
  SKFX_MAP.set(k, v); return v;
}
/* teach a canvas to recolour while g._skR is set. It still reports the colours the drawing code set (not the
   recoloured ones), and save()/restore() keep track of them too. Only canvases that draw skin effects get this. */
function skfxHook(g) {
  if (g._skHooked) return; g._skHooked = true;
  const D = SKFX_D, P = SKFX_P, raw = { fillStyle: null, strokeStyle: null, shadowColor: null, shadowBlur: null }, stack = [];
  const colour = n => ({ configurable: true, get() { return g._skR && raw[n] != null ? raw[n] : D[n].get.call(g); },
    set(v) { if (g._skR) { raw[n] = v; D[n].set.call(g, n === 'shadowColor' && g._skR.glow ? g._skR.glow : skfxMapCol(g._skR, v)); } else { raw[n] = null; D[n].set.call(g, v); } } });
  ['fillStyle', 'strokeStyle', 'shadowColor'].forEach(n => Object.defineProperty(g, n, colour(n)));
  Object.defineProperty(g, 'shadowBlur', { configurable: true, get() { return g._skR && raw.shadowBlur != null ? raw.shadowBlur : D.shadowBlur.get.call(g); },
    set(v) { raw.shadowBlur = g._skR ? v : null; D.shadowBlur.set.call(g, v); } });
  g._skRaw = raw;
  g.save = function () { stack.push(Object.assign({}, raw)); return P.save.call(g); };
  g.restore = function () { const r = stack.pop(); if (r) Object.assign(raw, r); return P.restore.call(g); };
  // gradients: their stops are recoloured, with a few stops in between so blends follow the recolour closely
  ['createLinearGradient', 'createRadialGradient', 'createConicGradient'].forEach(n => {
    if (!P[n]) return;
    g[n] = function () {
      const gr = P[n].apply(g, arguments), R = g._skR;
      if (R) {
        const add = gr.addColorStop; let last = null;
        gr.addColorStop = (o, c) => {
          const q = typeof c === 'string' ? skfxParse(c) : null;
          if (last && q && o > last.o) for (let i = 1; i < 4; i++) {
            const k = i / 4, m = last.q.map((v, j) => v + (q[j] - v) * k);
            add.call(gr, last.o + (o - last.o) * k, skfxMapCol(R, 'rgba(' + Math.round(m[0]) + ',' + Math.round(m[1]) + ',' + Math.round(m[2]) + ',' + m[3].toFixed(3) + ')'));
          }
          add.call(gr, o, skfxMapCol(R, c)); last = q ? { o, q } : null;
          if (q && q[3] < 0.5) gr._skFade = true;   // fades out: a soft glow
        };
      }
      return gr;
    };
  });
  // dark skins: a glowing edge drawn as two cheap outlines (a soft wide one and a thin bright rim) instead of a blur.
  // Blurred glows are one of the slowest things a browser can draw, so these never blur.
  const L = Object.getOwnPropertyDescriptor(P, 'lineWidth'), A = Object.getOwnPropertyDescriptor(P, 'globalAlpha');
  const rim = (outline, args, under, thin) => {
    const R = g._skR, a = A.get.call(g);
    if (!R || !R.glow || a < 0.2) return false;
    const fs = D.fillStyle.get.call(g);
    if (!under && typeof fs !== 'string' && fs._skFade) return false;   // soft see-through glows already fade into the edge colour
    const ss = D.strokeStyle.get.call(g), lw = L.get.call(g), sb = D.shadowBlur.get.call(g), base = under || 0;
    D.shadowBlur.set.call(g, 0); D.strokeStyle.set.call(g, R.glow);
    if (!thin) { A.set.call(g, a * 0.12); L.set.call(g, base + 13); outline(args); }
    A.set.call(g, a * (thin ? 0.22 : 0.3)); L.set.call(g, base + (thin ? 4 : 6)); outline(args);
    A.set.call(g, a * 0.85); L.set.call(g, base + 2.2); outline(args);
    A.set.call(g, a); L.set.call(g, lw); D.strokeStyle.set.call(g, ss); D.shadowBlur.set.call(g, sb);
    return true;
  };
  const path = args => args[0] instanceof Path2D ? P.stroke.call(g, args[0]) : P.stroke.call(g);
  g.fill = function () { P.fill.apply(g, arguments); rim(path, arguments); };
  g.fillRect = function () { P.fillRect.apply(g, arguments); rim(a => P.strokeRect.apply(g, a), arguments); };
  g.fillText = function () { P.fillText.apply(g, arguments); rim(x => P.strokeText.apply(g, x), arguments, 0, true); };
  g.stroke = function () { rim(path, arguments, L.get.call(g)); P.stroke.apply(g, arguments); };
  g.strokeRect = function () { rim(a => P.strokeRect.apply(g, a), arguments, L.get.call(g)); P.strokeRect.apply(g, arguments); };
}
function skfxOf(f) { const id = f && (f.skin || (f.slot != null && SKFX_SLOT[f.slot])); return id && typeof SKINS !== 'undefined' ? SKINS[id] || null : null; }

/* draw something in a skin's colour (or just draw it, when there's no skin or the device is struggling) */
function skfxPaint(g, s, t, draw) {
  if (!s || !SKFX_D || SKFX.low()) return draw();
  skfxHook(g);
  const R0 = g._skR, on0 = SKFX.on, R = skfxRecipe(s, t), D = SKFX_D, raw = g._skRaw;
  const keep = { fillStyle: g.fillStyle, strokeStyle: g.strokeStyle, shadowColor: g.shadowColor, shadowBlur: g.shadowBlur };   // what the drawing code had set
  const keepRaw = Object.assign({}, raw);
  g._skR = R; SKFX.on = true;
  ['fillStyle', 'strokeStyle', 'shadowColor', 'shadowBlur'].forEach(n => { g[n] = keep[n]; });   // colours set before the effect started get recoloured too
  if (R.glow) skfxDark(g, 1);
  try { return draw(); } finally {
    if (R.glow) skfxDark(g, -1);
    // like the old filter: whatever the effect set last stays set, in its own colours
    const last = { fillStyle: g.fillStyle, strokeStyle: g.strokeStyle, shadowColor: g.shadowColor, shadowBlur: g.shadowBlur };
    g._skR = R0; SKFX.on = on0; Object.assign(raw, keepRaw);
    if (!R0) ['fillStyle', 'strokeStyle', 'shadowColor'].forEach(n => { raw[n] = null; D[n].set.call(g, last[n]); });
    else ['fillStyle', 'strokeStyle', 'shadowColor', 'shadowBlur'].forEach(n => { g[n] = last[n]; });
    if (!R0) { raw.shadowBlur = null; D.shadowBlur.set.call(g, last.shadowBlur); }
  }
}
/* black effects can't glow: while a dark skin's effect is drawn, glowing ('lighter') drawing is turned into normal drawing */
const SKFX_GCO = typeof CanvasRenderingContext2D !== 'undefined' && Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'globalCompositeOperation');
function skfxDark(g, d) {
  if (!SKFX_GCO) return;
  g._skDark = (g._skDark || 0) + d;
  if (d > 0 && g._skDark === 1) {
    const fix = v => v === 'lighter' || v === 'screen' || v === 'plus-lighter' ? 'source-over' : v;
    Object.defineProperty(g, 'globalCompositeOperation', { configurable: true, get() { return SKFX_GCO.get.call(g); }, set(v) { SKFX_GCO.set.call(g, fix(v)); } });
    SKFX_GCO.set.call(g, fix(SKFX_GCO.get.call(g)));
  } else if (g._skDark <= 0) { g._skDark = 0; delete g.globalCompositeOperation; }
}
/* fighters drawn inside an effect (the ultimate's actor, someone caught in a net) keep their own colours */
function skfxPlain(g, draw) {
  if (!SKFX.on) return draw();
  const R0 = g._skR, dk = g._skDark || 0, raw = g._skRaw, D = SKFX_D;
  const keep = R0 ? { fillStyle: g.fillStyle, strokeStyle: g.strokeStyle, shadowColor: g.shadowColor, shadowBlur: g.shadowBlur } : null;
  if (R0) { g._skR = null; ['fillStyle', 'strokeStyle', 'shadowColor', 'shadowBlur'].forEach(n => { raw[n] = null; D[n].set.call(g, keep[n]); }); }
  SKFX.on = false;
  if (dk) { g._skDark = 1; skfxDark(g, -1); }
  try { return draw(); } finally {
    if (dk) { skfxDark(g, 1); g._skDark = dk; }
    SKFX.on = true;
    if (R0) { const last = { fillStyle: g.fillStyle, strokeStyle: g.strokeStyle, shadowColor: g.shadowColor, shadowBlur: g.shadowBlur }; g._skR = R0; ['fillStyle', 'strokeStyle', 'shadowColor', 'shadowBlur'].forEach(n => { g[n] = last[n]; }); }
  }
}
['drawUltActor', 'drawUltActorRemake'].forEach(n => {
  if (typeof window !== 'undefined' && typeof window[n] === 'function') {
    const plain = window[n];
    window[n] = function () { const a = arguments; return skfxPlain(a[0], () => plain.apply(this, a)); };
  }
});

/* ---------- the skin's little bits, as particles (hit bursts and projectile trails) ---------- */
/* skin bits make way when the screen is already busy, so big fights stay smooth */
const SKFX_ROOM = () => typeof FX === 'undefined' ? 99 : Math.max(0, 260 - FX.length);
function skfxBits(s, x, y, n, spd, life, t) {
  n = Math.min(n, SKFX_ROOM()); if (!n) return;
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

/* a soft round glow, painted once per colour and reused (drawing a picture is much faster than a fresh gradient each frame) */
const SKFX_GLOW = new Map();
function skfxGlowImg(col, inner) {
  const k = col + '|' + (inner || 0); let c = SKFX_GLOW.get(k); if (c) return c;
  if (SKFX_GLOW.size > 240) SKFX_GLOW.clear();
  c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 64 * (inner || 0), 64, 64, 64);
  const q = skfxParse(col); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(' + q[0] + ',' + q[1] + ',' + q[2] + ',0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  SKFX_GLOW.set(k, c); return c;
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
    g.drawImage(skfxGlowImg(c[2]), p.x - r * 1.8, p.y - r * 1.8, r * 3.6, r * 3.6); g.restore();
    if (!SKFX.low()) skfxPaint(g, s, t, () => drawProjNoSkin(g, p, t));
    else { const col0 = p.color; p.color = c[1]; try { drawProjNoSkin(g, p, t); } finally { p.color = col0; } }   // slow devices: just its main colour
    // the trail: a bit every few frames (fewer on slow devices)
    const every = SKFX.low() ? 9 : 4, key = (t + Math.round(p.x * 0.13)) | 0;
    if (key % every === 0 && typeof spawnFx === 'function' && SKFX_ROOM() > 0) skfxBits(s, p.x - (p.dir || Math.sign(p.vx) || 1) * r * 0.6, p.y, 1, 0.8, 26, t);
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
    if (portrait === 'ghost') return drawFighterNoSkinFx(g, f, t, portrait);   // afterimages: in the skin's effect colour (drawGhosts below)
    if (f && !portrait && f.slot != null) {
      if (f.skin) { SKFX_SLOT[f.slot] = f.skin; SKFX_POS[f.slot] = { x: f.x, y: f.y - f.H * 0.5, busy: !!(f.hot || f.mv || f.pose === 'dash' || f.pose === 'fly'), t: performance.now() }; }
      else { delete SKFX_SLOT[f.slot]; delete SKFX_POS[f.slot]; }
    }
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
/* effects that are never "a move's look" (they belong to whoever got hit, landed, or the whole match) */
const SKFX_NOPOS = { ko: 1, jump: 1, land: 1, dust: 1, ledge: 1, block: 1, sbreak: 1, freeze: 1, shatter: 1, bubbled: 1, bubblepop: 1, slowed: 1,
  ignite: 1, game: 1, mode: 1, orbget: 1, orbspawn: 1, orbhit: 1, ult: 1, ultmiss: 1, ulthitok: 1, ultlost: 1, clash: 1, reflect: 1, clank: 1, catch: 1, thunk: 1, wallburn: 1 };
/* the skinned fighter busy with a move closest to (x, y), if one is close enough */
function skfxNear(x, y) {
  let best = null, bd = 170, now = performance.now();
  for (const k in SKFX_POS) { const q = SKFX_POS[k]; if (!q.busy || now - q.t > 300) continue; const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = { slot: +k }; } }
  return best;
}
const SKFX_EVENTS = { hit: 1, ulthit: 1, ultfinal: 1, ultback: 1, ultlock: 1, zapline: 1, roll: 1, rollhit: 1, mechon: 1, mechoff: 1, frzarm: 1, frzfire: 1 };
if (typeof fxEvent === 'function') {
  const fxEventNoSkin = fxEvent;
  fxEvent = function (e, getF) {
    const type = e[1];
    let f = SKFX_EVENTS[type] && getF ? getF(e[5]) : null;
    if (!f && !SKFX_NOPOS[type]) f = skfxNear(e[2], e[3]);   // a move's own effect (a trail, a burst...): the skinned fighter doing a move right there
    const s = skfxOf(f);
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

/* ---------- things drawn on and around the fighter: glows, afterimages, the ultimate aura ---------- */
const skfxWrapF = name => {
  if (typeof window === 'undefined' || typeof window[name] !== 'function') return;
  const plain = window[name];
  window[name] = function (g, f, t) { const sk = f && skfxOf(f); if (!sk) return plain.apply(this, arguments); const a = arguments; return skfxPaint(g, sk, t, () => plain.apply(this, a)); };
};
['drawFighterFx', 'drawGhosts', 'drawUltAura', 'drawLegendOrbs'].forEach(skfxWrapF);
/* Legend Yen's cape, headband, hands and core glow use his style colour: with a skin, the skin's effect colour */
function skfxHex(s, t) {
  const o = skfxTone(s, t); if (o.dark) return '#150c24';
  const h = o.h / 360, sat = Math.max(0.25, o.s), l = Math.min(0.68, Math.max(0.5, o.l));
  const f = n => { const k = (n + h * 12) % 12, a = sat * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
}
if (typeof legendColor === 'function') {
  const legendColorNoSkin = legendColor;
  legendColor = function (f) { const sk = f && f.skin && SKINS[f.skin]; return sk ? skfxHex(sk, (typeof performance !== 'undefined' ? performance.now() : 0) / 16.7) : legendColorNoSkin(f); };
}
