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
/* a canvas filter that repaints a drawing in the skin's colour, keeping light and dark (sepia's own hue is about 38deg) */
function skfxFilter(s, t) {
  const o = skfxTone(s, t);
  if (o.dark) return `brightness(0.1) drop-shadow(0 0 2px ${o.dark}) drop-shadow(0 0 5px ${o.dark})`;   // black, with a glowing edge
  const sat = (1.4 + Math.max(0.15, o.s) * 3.2).toFixed(2), br = o.l > 0.78 ? 1.18 : o.l < 0.45 ? 1.1 : 1.05;
  return `sepia(1) hue-rotate(${Math.round(o.h - 38)}deg) saturate(${sat}) brightness(${br})`;
}
function skfxOf(f) { const id = f && (f.skin || (f.slot != null && SKFX_SLOT[f.slot])); return id && typeof SKINS !== 'undefined' ? SKINS[id] || null : null; }

/* draw something in a skin's colour (or just draw it, when there's no skin or the device is struggling) */
function skfxPaint(g, s, t, draw) {
  if (!s || !SKFX.filter || SKFX.low()) return draw();
  const f0 = g.filter, on0 = SKFX.on, dark = !!skfxTone(s, t).dark;
  g.filter = skfxFilter(s, t); SKFX.on = true;
  if (dark) skfxDark(g, 1);
  try { return draw(); } finally { if (dark) skfxDark(g, -1); g.filter = f0 || 'none'; SKFX.on = on0; }
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
  const f0 = g.filter, dk = g._skDark || 0; g.filter = 'none'; SKFX.on = false;
  if (dk) { g._skDark = 1; skfxDark(g, -1); }
  try { return draw(); } finally { if (dk) { skfxDark(g, 1); g._skDark = dk; } g.filter = f0; SKFX.on = true; }
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
