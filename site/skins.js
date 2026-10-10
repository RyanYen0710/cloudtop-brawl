'use strict';
/* ===== CLOUDTOP BRAWL — skins =====
   A skin is a whole costume (hats, masks, capes, wings, armour: skin-costumes.js) plus new colours, a glow and
   floating bits. Every fighter can wear every skin.
   - Sky Road skins unlock at a level (Gold at 10, Shadow at 20 ...).
   - Event skins can be worn by anyone during their event, and you keep one forever after playing
     3 matches during that event.
   - Shop skins are bought with coins (shop-data.js).
   The game server uses this same file to check that nobody wears a skin they haven't unlocked. */

const SKINS = {
  gold: { name: 'Gold', level: 10, pal: ['#6a4a08', '#d9a520', '#fff1a8'], acc: '#ffffff', aura: '255,211,92', fx: 'sparkle', fxc: ['#fff1a8', '#ffd35c'] },
  shadow: { name: 'Shadow', level: 20, pal: ['#07060e', '#2a2140', '#6a5a8a'], acc: '#a35cff', aura: '120,60,220', fx: 'smoke', fxc: ['rgba(60,40,100,.7)'] },
  neon: { name: 'Neon', level: 30, pal: ['#04121e', '#00b8e6', '#c8fbff'], acc: '#ff4fd8', aura: '0,212,255', fx: 'sparkle', fxc: ['#ff4fd8', '#46e0ff'] },
  crystal: { name: 'Crystal', level: 40, pal: ['#2a5a7a', '#9fe7ff', '#ffffff'], acc: '#ffffff', aura: '190,240,255', fx: 'sparkle', fxc: ['#ffffff', '#cff4ff'] },
  inferno: { name: 'Inferno', level: 60, pal: ['#3a0806', '#d8401a', '#ffcf5a'], acc: '#ffe14a', aura: '255,110,30', fx: 'ember', fxc: ['#ff8a1f', '#ffd35c'] },
  ocean: { name: 'Ocean', level: 70, pal: ['#06283a', '#1f7ab8', '#9fe7ff'], acc: '#ffffff', aura: '70,170,255', fx: 'bubble', fxc: ['rgba(220,245,255,.85)'] },
  galaxy: { name: 'Galaxy', level: 80, pal: ['#0a0620', '#3a1a7a', '#c8a8ff'], acc: '#ffffff', aura: '150,100,255', fx: 'star', fxc: ['#ffffff', '#c8a8ff'] },
  prism: { name: 'Prism', level: 90, prism: true, acc: '#ffffff', aura: 'prism', fx: 'sparkle', fxc: ['#ff6b6b', '#ffd35c', '#6fe39a', '#46e0ff', '#c8a8ff'] },
  royal: { name: 'Royal', level: 125, pal: ['#2a0a3a', '#7a1aa8', '#ffd35c'], acc: '#ffd35c', aura: '200,120,255', fx: 'sparkle', fxc: ['#ffd35c'] },
  toxic: { name: 'Toxic', level: 175, pal: ['#0a2a0a', '#4fcf1a', '#e8ff9a'], acc: '#e8ff9a', aura: '120,255,60', fx: 'bubble', fxc: ['rgba(180,255,90,.85)'] },
  phantom: { name: 'Phantom', level: 225, pal: ['#2a3a4a', '#9fb8c8', '#ffffff'], acc: '#bff4ff', aura: '200,230,255', fx: 'smoke', fxc: ['rgba(220,240,255,.55)'], ghost: true },
  mythic: { name: 'Mythic', level: 275, pal: ['#3a0a0a', '#ff3a2a', '#ffd35c'], acc: '#ffffff', aura: 'prism', fx: 'star', fxc: ['#ffd35c', '#ffffff', '#ff8a1f'] },
  // event skins
  harvest: { name: 'Harvest', event: 'thanksgiving', pal: ['#3a1608', '#b5571c', '#ffc23a'], acc: '#ffe08a', aura: '255,160,60', fx: 'leaf', fxc: ['#e8742a', '#c2401a', '#ffc23a'] },
  creepy: { name: 'Creepy', event: 'halloween', pal: ['#0e0818', '#4a2a6a', '#ff8a1f'], acc: '#ff8a1f', tone: '#9be37a', aura: '140,60,220', fx: 'bat', fxc: ['#140a20'] },
  frosty: { name: 'Frosty', event: 'christmas', pal: ['#5a8ac0', '#e8f6ff', '#ffffff'], acc: '#e8364a', aura: '200,235,255', fx: 'snow', fxc: ['#ffffff'] },
  lucky: { name: 'Lucky Red', event: 'cny', pal: ['#5a0608', '#c4161c', '#ffcf3a'], acc: '#ffcf3a', aura: '255,200,60', fx: 'sparkle', fxc: ['#ffcf3a', '#ff6a2a'] },
  blossom: { name: 'Blossom', event: 'spring', pal: ['#a85a7a', '#ffc6d9', '#ffffff'], acc: '#7ad06a', aura: '255,170,210', fx: 'petal', fxc: ['#ffc6d9', '#ffffff'] },
  beach: { name: 'Beach', event: 'summer', pal: ['#0a5a7a', '#2ec4e8', '#ffe14a'], acc: '#ff5aa0', aura: '80,210,255', fx: 'bubble', fxc: ['rgba(255,255,255,.85)'] },
  // shop-only skins (bought with coins: shop-data.js)
  bubblegum: { name: 'Bubblegum', shop: 1500, pal: ['#a8306a', '#ff8ac4', '#ffe0f0'], acc: '#7ad7ff', aura: '255,140,200', fx: 'bubble', fxc: ['rgba(255,190,225,.9)'] },
  midnight: { name: 'Midnight', shop: 2000, pal: ['#05060f', '#1a1f4a', '#5a6ab8'], acc: '#e8364a', aura: '90,100,220', fx: 'bat', fxc: ['#0a0a1a'] },
  lava: { name: 'Lava', shop: 3000, pal: ['#1a0a06', '#4a2a1e', '#ff6a1a'], acc: '#ffcf3a', aura: '255,90,20', fx: 'ember', fxc: ['#ff6a1a', '#ffcf3a'] },
  arctic: { name: 'Arctic', shop: 3000, pal: ['#3a6a8a', '#cfeaf8', '#ffffff'], acc: '#3da5ff', aura: '180,230,255', fx: 'snow', fxc: ['#ffffff', '#dff4ff'] },
  circuit: { name: 'Circuit', shop: 4000, pal: ['#04140e', '#1a4a3a', '#46ffb0'], acc: '#46e0ff', aura: '60,255,180', fx: 'sparkle', fxc: ['#46ffb0', '#46e0ff'] },
  diamond: { name: 'Diamond', shop: 8000, pal: ['#4a7a9a', '#c8f4ff', '#ffffff'], acc: '#ffffff', aura: 'prism', fx: 'star', fxc: ['#ffffff', '#c8f4ff', '#ffd6f4'] }
};
const SKIN_IDS = Object.keys(SKINS);
const EVENT_SKIN = {}; SKIN_IDS.forEach(id => { if (SKINS[id].event) EVENT_SKIN[SKINS[id].event] = id; });
const EVENT_SKIN_PLAYS = 3;   // matches to play during an event to keep its skin

/* can this player wear this skin? prof = { level, ev: [events whose skin they kept], shop: [skins they bought], owner } */
function skinAllowed(prof, id, ev) {
  const s = SKINS[id]; if (!s) return false;
  if (prof && prof.owner) return true;
  if (s.level) return !!prof && (prof.level | 0) >= s.level;
  if (s.event) return s.event === ev || !!(prof && Array.isArray(prof.ev) && prof.ev.indexOf(s.event) >= 0);
  if (s.shop) return !!(prof && Array.isArray(prof.shop) && prof.shop.indexOf(id) >= 0);
  return false;
}
function skinProf(p, owner) { return { level: typeof xpLevel === 'function' ? xpLevel((p && p.xp) || 0).level : 1, ev: (p && p.evSkins) || [], shop: (p && p.shopSkins) || [], owner: !!owner }; }
/* a skin that's allowed, or '' (the fighter's normal look) */
function cleanSkin(prof, id, ev) { id = String(id || ''); return id && skinAllowed(prof, id, ev) ? id : ''; }

/* ---------- drawing (the browser only) ---------- */
function skinHex(h) { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function skinMix(a, b, k) { const A = skinHex(a), B = skinHex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
/* a colour's brightness picks a spot on the skin's dark -> main -> light palette, so shading is kept */
function skinTint(col, pal) {
  if (typeof col !== 'string' || col[0] !== '#') return col;
  const [r, g, b] = skinHex(col), l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return l < 0.5 ? skinMix(pal[0], pal[1], l / 0.5) : skinMix(pal[1], pal[2], (l - 0.5) / 0.5);
}
function skinPrismPal(t) { const h = (t * 1.5) % 360; return ['hsl(' + h + ',70%,22%)', 'hsl(' + ((h + 40) % 360) + ',85%,55%)', 'hsl(' + ((h + 80) % 360) + ',100%,85%)']; }
const SKIN_CACHE = new Map();
function skinChar(c, id, t) {
  const s = SKINS[id];
  const key = c.id + ':' + id + (s.prism ? ':' + ((t / 6) | 0) % 60 : '');
  let o = SKIN_CACHE.get(key);
  if (o) return o;
  const pal = s.prism ? skinPrismPal(((t / 6) | 0) * 6).map(h => { const d = document.createElement('canvas').getContext('2d'); d.fillStyle = h; return d.fillStyle; }) : s.pal;
  const L = Object.assign({}, c.look);
  ['body', 'legs', 'hair', 'cape', 'metal', 'belly'].forEach(k => { if (L[k]) L[k] = skinTint(L[k], pal); });
  L.accent = s.acc;
  if (s.tone) L.skin = s.tone;
  o = Object.create(c); o.look = L;
  if (SKIN_CACHE.size > 600) SKIN_CACHE.clear();
  SKIN_CACHE.set(key, o);
  return o;
}
function skinAuraCol(s, t, a) { if (s.aura === 'prism') return 'hsla(' + ((t * 2) % 360) + ',100%,65%,' + a + ')'; return 'rgba(' + s.aura + ',' + a + ')'; }
/* the glow behind the fighter */
function skinAura(g, f, t, s) {
  const cx = f.x, cy = f.y - f.H * 0.5, r = f.H * 0.75;
  const gr = g.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
  gr.addColorStop(0, skinAuraCol(s, t, 0.32 + 0.08 * Math.sin(t * 0.08))); gr.addColorStop(1, skinAuraCol(s, t, 0));
  g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
}
/* the little bits floating around the fighter */
function skinBits(g, f, t, s) {
  const n = 6, cx = f.x, cy = f.y - f.H * 0.5;
  for (let i = 0; i < n; i++) {
    const k = ((t * 0.6 + i * 37) % 120) / 120, col = s.fxc[i % s.fxc.length];
    const ox = Math.sin(i * 2.4 + t * 0.02) * f.W * 0.8, oy = f.H * (0.45 - k * 1.1);
    const x = cx + ox, y = cy + (s.fx === 'snow' || s.fx === 'leaf' || s.fx === 'petal' ? -oy : oy);
    g.globalAlpha = Math.sin(k * Math.PI) * 0.9;
    g.fillStyle = col; g.strokeStyle = col;
    if (s.fx === 'sparkle' || s.fx === 'star') { const r = s.fx === 'star' ? 4 : 3; g.beginPath(); g.moveTo(x, y - r * 1.6); g.lineTo(x + r * 0.5, y - r * 0.5); g.lineTo(x + r * 1.6, y); g.lineTo(x + r * 0.5, y + r * 0.5); g.lineTo(x, y + r * 1.6); g.lineTo(x - r * 0.5, y + r * 0.5); g.lineTo(x - r * 1.6, y); g.lineTo(x - r * 0.5, y - r * 0.5); g.fill(); }
    else if (s.fx === 'ember') { g.beginPath(); g.arc(x, y, 2.5, 0, Math.PI * 2); g.fill(); }
    else if (s.fx === 'smoke') { g.beginPath(); g.arc(x, y, 6 + k * 6, 0, Math.PI * 2); g.fill(); }
    else if (s.fx === 'bubble') { g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 3 + k * 3, 0, Math.PI * 2); g.stroke(); }
    else if (s.fx === 'snow') { g.beginPath(); g.arc(x, y, 2.5, 0, Math.PI * 2); g.fill(); }
    else if (s.fx === 'leaf' || s.fx === 'petal') { g.save(); g.translate(x, y); g.rotate(t * 0.05 + i); g.beginPath(); g.ellipse(0, 0, s.fx === 'leaf' ? 5 : 4, s.fx === 'leaf' ? 2.5 : 2, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    else if (s.fx === 'bat') { const w = 6, fl = Math.sin(t * 0.4 + i) * 3; g.lineWidth = 2; g.beginPath(); g.moveTo(x - w, y - fl); g.quadraticCurveTo(x - w / 2, y + 2, x, y); g.quadraticCurveTo(x + w / 2, y + 2, x + w, y - fl); g.stroke(); }
  }
  g.globalAlpha = 1;
}
let SKIN_PORTRAIT = '';   // the skin to show on a fighter card or menu tile
if (typeof drawPortrait === 'function') {
  const drawPortraitPlain = drawPortrait;
  drawPortrait = function (cv, charId, opts) {
    SKIN_PORTRAIT = (opts && opts.skin) || '';
    try { drawPortraitPlain(cv, charId, opts); } finally { SKIN_PORTRAIT = ''; }
  };
}
if (typeof drawFighter === 'function') {
  const drawFighterPlain = drawFighter;
  drawFighter = function (g, f, t, portrait) {
    if (f && portrait && !f.skin && SKIN_PORTRAIT) f.skin = SKIN_PORTRAIT;
    const s = f && f.skin && SKINS[f.skin];
    if (!s || !f.c) return drawFighterPlain(g, f, t, portrait);
    const vanish = f.pose === 'vanish' || f.vanish;
    if (!vanish && !f.out && !(f.dead > 0)) { g.save(); skinAura(g, f, t, s); g.restore(); }
    const c0 = f.c;
    f.c = skinChar(c0, f.skin, t);
    try {
      if (s.ghost) { g.save(); g.globalAlpha *= 0.82; drawFighterPlain(g, f, t, portrait); g.restore(); }
      else drawFighterPlain(g, f, t, portrait);
    } finally { f.c = c0; }
    if (!vanish && !f.out && !(f.dead > 0)) { g.save(); skinBits(g, f, t, s); g.restore(); }
  };
}
