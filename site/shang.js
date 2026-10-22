'use strict';
/* ===== CLOUDTOP BRAWL — Mr. Shang, the Arsenal (a free fighter) =====
   He carries three weapons and switches between them with keys 1 / 2 / 3 (or the SWAP button on phones),
   like Legend Yen switches styles. The weapon changes his neutral and side specials:
     1 Flamethrower      Flame Spray (hold: a short cone of fire that burns) · Flame Jet (fire shoots him forward)
     2 Grenade Launcher  Grenade Lob (bounces, then blows up; blows up at once on an enemy) · Cluster Volley (3 small ones)
     3 Shotgun           Buckshot (a pellet spread: strong up close, weak far away) · Slug (one long shot, slow reload)
   With every weapon: Recoil Jump (up: he fires down and the blast throws him up) and Swap Bash (down: a hit with the
   gun's stock that also switches to his next weapon).
   The rules live here (the game server uses this file too); how he looks is in shang-art.js. */

const SHANG_UP = { name: 'Recoil Jump', desc: 'Fire straight down: the blast throws him high and hits anyone below.', kind: 'leap', fx: 'shang',
  vy: 19, vx: 3, dmg: 7, b: 6, g: 0.7, angle: 75, startup: 5, active: 8, hx: 0, hy: -0.05, hw: 1.5, hh: 0.8 };
const SHANG_DOWN = { name: 'Swap Bash', desc: 'Whack them with the gun\'s stock and switch to the next weapon.', kind: 'swapbash', fx: 'shang',
  dmg: 7, b: 5.5, g: 0.75, angle: 40, startup: 7, active: 4, end: 12, hx: 0.95, hy: 0.5, hw: 1.3, hh: 0.5 };

/* his three weapons (hidden: they aren't fighters of their own) */
CHAR.shangflame = { id: 'shangflame', name: 'Flamethrower', hidden: true, weapon: true, look: { accent: '#ff7a1a' },
  specials: {
    neutral: { name: 'Flame Spray', desc: 'Hold to spray a short cone of fire. Everything it touches burns.', kind: 'proj',
      dmg: 1.2, b: 1.1, g: 0.04, angle: 30, startup: 6, end: 12, speed: 10, life: 15, size: 18, grow: 1.6, maxSize: 46, jitter: 2.2,
      shape: 'flame', color: '#ff8a1f', max: 14, pierce: true, burn: 70, auto: { every: 3, max: 12 } },
    side: { name: 'Flame Jet', desc: 'Blast fire out behind him and shoot forward, burning anyone in the way.', kind: 'dash', fx: 'shang',
      dmg: 8, b: 5.5, g: 0.7, angle: 30, startup: 9, dur: 16, vx: 13, end: 18, hx: 0.9, hy: 0.55, hw: 1.4, hh: 0.45, burn: 120 },
    up: SHANG_UP, down: SHANG_DOWN
  } };
CHAR.shanggren = { id: 'shanggren', name: 'Grenade Launcher', hidden: true, weapon: true, look: { accent: '#8ad04a' },
  specials: {
    neutral: { name: 'Grenade Lob', desc: 'Lob a grenade. It bounces twice, then blows up. Hit an enemy and it blows up at once.', kind: 'proj',
      dmg: 10, b: 7, g: 0.95, angle: 60, startup: 10, end: 16, speed: 10.5, aim: 32, grav: 0.45, life: 150, size: 14, shape: 'grenade',
      color: '#5a7a3a', max: 2, noHit: true, step: 'grenade', bounces: 2, boom: { r: 90 } },
    side: { name: 'Cluster Volley', desc: 'Fire three small grenades in a spread. Each one blows up where it lands.', kind: 'proj',
      dmg: 5, b: 4.6, g: 0.55, angle: 55, startup: 12, end: 18, speed: 9.5, grav: 0.45, life: 120, size: 11, shape: 'grenade',
      color: '#7a9a4a', max: 3, noHit: true, step: 'grenade', bounces: 0, boom: { r: 62 }, spread: [18, 34, 50] },
    up: SHANG_UP, down: SHANG_DOWN
  } };
CHAR.shangshot = { id: 'shangshot', name: 'Shotgun', hidden: true, weapon: true, look: { accent: '#4ab8ff' },
  specials: {
    neutral: { name: 'Buckshot', desc: 'A spread of pellets. Up close every pellet hits and they fly far; far away only a few reach.', kind: 'proj',
      dmg: 2.6, b: 3.7, g: 0.32, angle: 30, startup: 7, end: 16, speed: 19, life: 8, size: 10, shape: 'pellet', color: '#ffe08a',
      max: 5, spread: [-16, -8, 0, 8, 16] },
    side: { name: 'Slug', desc: 'One heavy long-range shot. Slow to reload.', kind: 'proj',
      dmg: 9, b: 6.4, g: 0.8, angle: 25, startup: 14, end: 24, speed: 24, life: 38, size: 12, shape: 'slug', color: '#ffd35c', max: 1 },
    up: SHANG_UP, down: SHANG_DOWN
  } };

ROSTER.push({
  id: 'shang', name: 'Mr. Shang', title: 'The Arsenal',
  modes: ['shangflame', 'shanggren', 'shangshot'], weaponKit: true,
  stats: { power: 7, speed: 6, weight: 6, jump: 6, defense: 6, skill: 7 },
  look: { build: 'normal', body: '#3a4250', skin: '#e2b48c', accent: '#ff7a1a', hair: '#141414', legs: '#262a32', extra: ['shang'] },
  passive: 'Arsenal: carries a Flamethrower, a Grenade Launcher and a Shotgun. Switch with 1 / 2 / 3 (or Swap Bash) to change his neutral and side specials.',
  strongVs: ['mira', 'kiro'], weakVs: ['zephyr', 'nova'],
  ultimate: { style: 'loadout', kind: 'aim', aim: 'reddot', name: 'Full Arsenal', desc: 'Lock a red dot on the target, then unload everything: a wave of fire, a grenade barrage and one last shotgun blast.',
    theme: 'arsenal', colors: ['#14100c', '#ff7a1a', '#ffe08a'], hits: 6, dmg: 3.2, final: { dmg: 18, b: 12, g: 1.3, angle: 42 } },
  specials: null
});
CHAR.shang = ROSTER[ROSTER.length - 1];
CHAR.shang.specials = CHAR.shangflame.specials;   // the first weapon (the game reads the switched-on one)

/* the new shapes (added at the end, so every older shape keeps its number online) */
['flame', 'grenade', 'pellet', 'slug'].forEach(s => { if (SHAPES.indexOf(s) < 0) SHAPES.push(s); });

/* he starts every match holding the Flamethrower (Legend Yen starts in his own style, the last one) */
if (typeof makeGame === 'function') {
  const makeGameNoShang = makeGame;
  makeGame = function () {
    const g = makeGameNoShang.apply(this, arguments);
    if (g && g.fighters) g.fighters.forEach(f => { if (f.c && f.c.weaponKit) f.yenMode = 0; });
    return g;
  };
}

/* ---------- Swap Bash ---------- */
if (typeof runActX === 'function') {
  const runActNoShang = runActX;
  runActX = function (f, inp, g, dirX, a, m) {
    if (m.kind !== 'swapbash') return runActNoShang(f, inp, g, dirX, a, m);
    const S = m.startup || 1, A = m.active || 4, E = m.end || 10;
    a.t++;
    if (a.t < S) { f.pose = 'charge'; f.pt = a.t / S; f.vx *= 0.7; }
    if (a.t === S && f.c && f.c.modes) {   // switch to the next weapon
      f.yenMode = ((f.yenMode | 0) + 1) % f.c.modes.length;
      emit(g, 'mode', f.x, f.y - f.H / 2, f.yenMode, f.slot);
    }
    if (a.t >= S && a.t < S + A) { f.hot = true; f.pose = 'punch'; f.pt = 1; hitCheck(f, g, m, a, 1); }
    if (a.t >= S + A) { f.pose = 'punch'; f.pt = Math.max(0, 1 - (a.t - S - A) / E); }
    if (a.t >= S + A + E) endAct(f);
    return true;
  };
}

/* ---------- grenades: bounce, then blow up (or blow up on the first enemy they touch) ---------- */
function shangBoom(p, g) {
  if (p.boomed) return; p.boomed = 1; p.life = 0;
  const m = p.m, r = (m.boom && m.boom.r) || 90;
  emit(g, 'gboom', p.x, p.y, r, p.owner ? p.owner.slot : -1);
  g.shake = Math.max(g.shake, r > 80 ? 9 : 5);
  for (const o of g.fighters) {
    if (o.out || o.dead > 0 || o.tid === p.tid) continue;
    if (Math.hypot(o.x - p.x, (o.y - o.H / 2) - p.y) < r + o.W * 0.4)
      applyHit(p.owner, o, { dmg: p.dmg, b: m.b, g: m.g, angle: m.angle }, Math.sign(o.x - p.x) || p.face || 1, g, true);
  }
}
if (typeof projStepX === 'function') {
  const projStepNoShang = projStepX;
  projStepX = function (p, g) {
    if (p.m.step !== 'grenade' || p.orbit) return projStepNoShang(p, g);
    const m = p.m, st = g.stage;
    p.vy += m.grav || 0.45; p.x += p.vx; p.y += p.vy;
    p.spin = (p.spin || 0) + p.vx * 0.06;
    const bot = p.y + p.size * 0.5;
    if (p.vy > 0) for (const s of st.surfaces) {   // bounce on floors and platforms
      if (s.off || p.x < s.x || p.x > s.x + s.w || bot - p.vy > s.y + 3 || bot < s.y) continue;
      p.y = s.y - p.size * 0.5;
      p.bn = (p.bn || 0) + 1;
      if (p.bn > (m.bounces || 0)) { shangBoom(p, g); return; }
      p.vy = -Math.max(4, Math.abs(p.vy) * 0.55); p.vx *= 0.55; emit(g, 'clank', p.x, s.y);
      break;
    }
    for (const mb of st.solids) if (p.x > mb.x && p.x < mb.x + mb.w && p.y > mb.y + 4 && p.y < mb.y + mb.h) { shangBoom(p, g); return; }   // hit a wall
    for (const o of g.fighters) {   // touched an enemy: boom
      if (o.out || o.dead > 0 || o.halo > 0 || o.vanish || o.tid === p.tid) continue;
      if (circRect(p.x, p.y, p.size * 0.7, hurtbox(o))) { shangBoom(p, g); return; }
    }
    if (p.life <= 1) shangBoom(p, g);   // the fuse runs out
  };
}

/* ---------- his ultimate: how the target gets thrown around (the art is in shang-art.js) ---------- */
if (typeof ULT_STYLES !== 'undefined') ULT_STYLES.loadout = {
  hit: (o, i, u, g) => ultPush(o, g, (i % 2 ? -1 : 1) * 7, i < 2 ? 2 : -7),   // fire shoves them, then the grenades bounce them up
  angle: () => ultRnd(36, 48), finMul: 0.95
};
