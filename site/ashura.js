'use strict';
/* ===== CLOUDTOP BRAWL — ASHURA the Thousand-Armed, and the Trial of Ashura =====
   Legendary: the second strongest fighter (Legend Yen stays the strongest).
   - Arsenal Wheel: his six arms hold six weapons; each press uses the next one
     (blade sweep, long spear thrust, heavy mace, looping chakram, rising trident, vajra lightning burst).
   - Thousand-Arm Rush: a dash that leaves a glowing trail; a beat later the whole trail erupts in punches.
   - Heaven Climb: spectral arms pull him up three times; each pull goes the way you hold.
   - Karmic Grasp: a giant spectral hand bursts out of the floor under the nearest enemy, grabs them,
     lifts them and slams them down.
   The Trial of Ashura opens once you reach Sky Road level 300 AND beat Boss Fight Chapter 4. Win it to unlock him.
   The rules live here (the game server uses this file too, and decides who may enter the trial);
   how it all looks is in ashura-art.js. */

const ASHURA_WHEEL = [   // the six weapons, in order
  { w: 'blade', kind: 'melee', dmg: 8, b: 5.5, g: 0.6, angle: 40, startup: 6, active: 5, end: 12, hx: 0.9, hy: 0.55, hw: 1.9, hh: 0.8, pose: 'punch' },
  { w: 'spear', kind: 'melee', dmg: 9, b: 6.5, g: 0.7, angle: 25, startup: 9, active: 4, end: 14, hx: 1.6, hy: 0.55, hw: 2.4, hh: 0.3, lunge: 3, pose: 'punch' },
  { w: 'mace', kind: 'melee', dmg: 14, b: 8.5, g: 1.05, angle: 50, startup: 16, active: 4, end: 20, hx: 1.0, hy: 0.45, hw: 1.6, hh: 0.9, armor: true, pose: 'slam' },
  { w: 'chakram', kind: 'proj', dmg: 7, b: 4.5, g: 0.55, angle: 45, startup: 8, end: 12, speed: 11, life: 70, size: 24, shape: 'chakram', color: '#ffd35c', pierce: true, rehit: 30, step: 'loop' },
  { w: 'trident', kind: 'melee', dmg: 10, b: 7, g: 0.85, angle: 85, startup: 8, active: 5, end: 14, hx: 0.5, hy: 1.05, hw: 1.4, hh: 1.1, pose: 'up' },
  { w: 'vajra', kind: 'melee', dmg: 7, b: 6, g: 0.7, angle: 60, startup: 12, active: 4, end: 16, hx: 0, hy: 0.5, hw: 3.0, hh: 1.4, sides: true, zap: 10, pose: 'spin' }
];

ROSTER.push({
  id: 'ashura', name: 'Ashura', title: 'The Thousand-Armed', legend: true, locked: true,
  stats: { power: 10, speed: 7, weight: 8, jump: 7, defense: 9, skill: 9 },
  look: { build: 'normal', body: '#7a2a12', skin: '#c98a4a', accent: '#ffd35c', hair: '#1a0a06', legs: '#3a1206', extra: ['ashura'] },
  passive: 'Legendary. Six weapons in six arms (each neutral special uses the next one), a rush that leaves a trail of punches behind, and a giant hand that grabs from the ground.',
  strongVs: ['vexa', 'hsi'], weakVs: ['yen', 'zephyr'],
  ultimate: { style: 'asura', kind: 'aim', aim: 'mandala', name: 'Thousand-Arm Annihilation', desc: 'Aim a spinning mandala. A giant golden Ashura rises behind the target, a storm of fists rains down, then two colossal hands clap together.', theme: 'asura', colors: ['#1a0606', '#ffd35c', '#ff6a2a'], hits: 8, dmg: 2.2, final: { dmg: 20, b: 13.4, g: 1.44, angle: 58 } },
  specials: {
    neutral: { name: 'Arsenal Wheel', desc: 'Six arms, six weapons: each press uses the next one. Blade, spear, mace, a looping chakram, a rising trident, then a vajra lightning burst.', kind: 'arsenal', wheel: ASHURA_WHEEL },
    side: { name: 'Thousand-Arm Rush', desc: 'Dash forward leaving a glowing trail. A moment later the whole trail erupts in a storm of spectral punches.', kind: 'rush',
      startup: 6, dur: 16, vx: 13, end: 12, dmg: 4, b: 3, g: 0.3, angle: 50, hx: 0.3, hy: 0.5, hw: 1.2, hh: 0.8,
      trail: { every: 3, delay: 16, r: 54, dmg: 5, b: 4.5, g: 0.5, angle: 70 } },
    up: { name: 'Heaven Climb', desc: 'Spectral arms pull him up three times. Each pull goes the way you hold, and hits anyone in the way.', kind: 'climb',
      startup: 4, pulls: 3, pull: 9, rest: 4, speed: 12.5, dmg: 5, b: 4.5, g: 0.45, angle: 80, hx: 0, hy: 0.5, hw: 1.3, hh: 1.0 },
    down: { name: 'Karmic Grasp', desc: 'A giant spectral hand bursts out of the floor under the nearest enemy, grabs them, lifts them high and slams them down.', kind: 'grasp',
      startup: 14, end: 18, range: 560,
      hand: { dmg: 0, b: 0, g: 0, angle: 0, speed: 0, life: 60, size: 70, shape: 'graspHand', color: '#ffd35c', noHit: true, step: 'grasp', rise: 12, lift: 26,
        grab: { dmg: 4, b: 0, g: 0, angle: 90 }, slam: { dmg: 12, b: 8, g: 0.95, angle: 75 } } }
  }
});
CHAR.ashura = ROSTER[ROSTER.length - 1];

/* the new shapes (added at the end, so every older shape keeps its number online) */
['chakram', 'graspHand'].forEach(s => { if (SHAPES.indexOf(s) < 0) SHAPES.push(s); });

/* ---------- his move kinds ---------- */
if (typeof runActX === 'function') {
  const runActNoAshura = runActX;
  runActX = function (f, inp, g, dirX, a, m) {
    const S = m.startup || 1, E = m.end || 10;
    switch (m.kind) {
      case 'arsenal': {   // pick the next weapon, then the move plays as that weapon
        const i = (f.wheelI | 0) % m.wheel.length, sub = m.wheel[i];
        f.wheelI = i + 1;
        a.m = Object.assign({ name: m.name }, sub);
        emit(g, 'arsenal', f.x, f.y - f.H * 0.6, i * 2 + (f.face > 0 ? 1 : 0), f.slot);   // which weapon, and which way he faces
        return true;
      }
      case 'rush': {   // dash, laying a trail that erupts later
        a.t++;
        if (a.t < S) { f.vx *= 0.5; f.vy *= 0.6; a.noGrav = !f.ground; f.pose = 'charge'; f.pt = 0.3; return true; }
        if (a.t < S + m.dur) {
          a.noGrav = false; f.vx = f.face * m.vx; if (!f.ground) f.vy = Math.min(f.vy, 1);
          f.hot = true; f.pose = 'dash'; f.pt = 1;
          hitCheck(f, g, m, a, 1);
          if ((a.t - S) % m.trail.every === 0) {
            (g.ashTrail || (g.ashTrail = [])).push({ x: f.x, y: f.y - f.H * 0.5, at: g.frame + m.trail.delay + Math.floor((a.t - S) / m.trail.every) * 2, by: f, T: m.trail });
            emit(g, 'ashmark', f.x, f.y - f.H * 0.5, f.face, f.slot);
          }
          return true;
        }
        f.vx *= 0.85; f.pose = 'dash'; f.pt = Math.max(0, 1 - (a.t - S - m.dur) / E);
        if (a.t >= S + m.dur + E) endAct(f);
        return true;
      }
      case 'climb': {   // three aimed pulls
        a.t++;
        if (a.t < S) { f.pose = 'charge'; f.pt = 0.4; f.vx *= 0.5; a.noGrav = true; if (!f.ground) f.vy *= 0.4; return true; }
        const k = a.t - S, per = m.pull + m.rest, n = Math.floor(k / per), inPull = k % per < m.pull;
        if (n >= m.pulls) { a.noGrav = false; f.vy = Math.max(f.vy, -3); endAct(f); if (!f.ground) f.helpless = true; return true; }
        a.noGrav = true; f.ground = null;
        if (k % per === 0) {   // aim this pull
          let dx = dirX, dy = inp.d ? 0 : -1;
          if (!dx && dy === 0) dy = -1;
          const d = Math.hypot(dx, dy) || 1; a.cx = dx / d; a.cy = dy / d; a.hit.clear();
          if (dx) f.face = dx;
          emit(g, 'climb', f.x, f.y - f.H * 0.5, Math.round(Math.atan2(a.cy, a.cx) * 100), f.slot);
        }
        if (inPull) { f.vx = a.cx * m.speed; f.vy = a.cy * m.speed; f.hot = true; f.pose = 'fly'; f.pt = 1; hitCheck(f, g, m, a, 1); }
        else { f.vx *= 0.5; f.vy *= 0.3; f.pose = 'up'; f.pt = 0.6; }
        return true;
      }
      case 'grasp': {   // the hand bursts out under the nearest enemy
        a.t++; f.pose = 'cast2'; f.pt = Math.min(1, a.t / S);
        if (a.t === S) {
          const t = nearestEnemy(f, g, m.range), H = m.hand;
          let x = t ? t.x : f.x + f.face * 160, sy = surfaceBelow(g.stage, x, (t ? t.y : f.y) - 40);
          if (sy === null) { sy = surfaceBelow(g.stage, f.x + f.face * 160, f.y - 40); x = f.x + f.face * 160; }
          if (sy !== null) {
            g.projs.push({ owner: f, tid: f.tid, key: 'down', m: H, shape: H.shape, color: H.color, size: H.size, x, y: sy, vx: 0, vy: 0, life: H.life, dmg: 0, hit: new Set(), age: 0, armed: 0, stuck: false, face: f.face, target: t ? t.slot : -1, base: sy });
            emit(g, 'grasp', x, sy, 0, f.slot);
          }
        }
        if (a.t >= S + E) endAct(f);
        return true;
      }
    }
    return runActNoAshura(f, inp, g, dirX, a, m);
  };
}

/* ---------- the looping chakram and the grasping hand ---------- */
if (typeof projStepX === 'function') {
  const projStepNoAshura = projStepX;
  projStepX = function (p, g) {
    const m = p.m;
    if (p.orbit || (m.step !== 'loop' && m.step !== 'grasp')) return projStepNoAshura(p, g);
    if (m.step === 'loop') {   // flies out, makes one full loop in the air, then keeps going
      if (p.age === 1) { p.sp = Math.hypot(p.vx, p.vy) || m.speed; p.dirc = Math.sign(p.vx) || 1; p.ang = p.dirc > 0 ? 0 : Math.PI; }
      if (p.age > 14 && p.age <= 14 + 26) p.ang -= p.dirc * (Math.PI * 2 / 26);   // the loop
      p.vx = Math.cos(p.ang) * p.sp; p.vy = Math.sin(p.ang) * p.sp; p.x += p.vx; p.y += p.vy;
      return;
    }
    // Karmic Grasp: rise (warning), grab, lift, slam
    const o = p.target >= 0 ? g.fighters.find(q => q.slot === p.target) : null;
    if (p.age === m.rise) {
      if (o && !(o.out || o.dead > 0 || o.vanish || o.inv > 0) && Math.abs(o.x - p.x) < p.size * 0.75 && o.y > p.base - 260 && o.y < p.base + 30) {
        const r = applyHit(p.owner, o, m.grab, p.face, g, p);
        if (r === 'hit' || r === 'armor') { p.held = 1; p.armed = 1; emit(g, 'grabbed', o.x, o.y - o.H / 2, 0, p.owner.slot); }
      }
      if (!p.held) { p.life = Math.min(p.life, 10); emit(g, 'graspmiss', p.x, p.base - 60, 0, p.owner.slot); }
    }
    if (p.held && o) {
      if (o.out || o.dead > 0) { p.held = 0; p.life = Math.min(p.life, 6); return; }
      const k = Math.min(1, (p.age - m.rise) / m.lift);
      p.y = p.base - 40 - k * 170;   // the hand lifts them high
      o.x = p.x; o.y = p.y - 10; o.vx = 0; o.vy = 0; o.ground = null; o.hitstun = Math.max(o.hitstun || 0, 4); o.zap = 0; o.hitlag = 0;
      if (p.age >= m.rise + m.lift) {   // slam them down
        p.held = 0; p.armed = 0;
        applyHit(p.owner, o, m.slam, p.face, g, p);
        emit(g, 'slamhand', o.x, o.y - o.H / 2, 0, p.owner.slot); g.shake = Math.max(g.shake, 12);
        p.life = Math.min(p.life, 12);
      }
    }
  };
}

/* every frame, after the projectiles move: the rush trail erupts */
if (typeof stepProjsX === 'function') {
  const stepProjsNoAshura = stepProjsX;
  stepProjsX = function (g) {
    stepProjsNoAshura(g);
    if (!g.ashTrail || !g.ashTrail.length) return;
    const left = [];
    for (const s of g.ashTrail) {
      if (g.frame < s.at) { left.push(s); continue; }
      const f = s.by, T = s.T;
      if (f.out || f.dead > 0) continue;
      emit(g, 'armburst', s.x, s.y, T.r, f.slot);
      for (const o of g.fighters) {
        if (o.out || o.dead > 0 || o.halo > 0 || o.vanish || o.tid === f.tid) continue;
        if (Math.hypot(o.x - s.x, (o.y - o.H / 2) - s.y) > T.r + o.W * 0.4) continue;
        if (o.ashHitF === g.frame) continue;   // one hit per frame even where bursts overlap
        o.ashHitF = g.frame;
        applyHit(f, o, T, Math.sign(o.x - s.x) || f.face, g, true);
      }
    }
    g.ashTrail = left;
  };
}

/* ---------- his ultimate: a giant golden Ashura, a storm of fists, then the great clap ---------- */
if (typeof ULT_STYLES !== 'undefined') Object.assign(ULT_STYLES, {
  asura: { hit: (o, i, u, g) => ultPush(o, g, (i % 2 ? 1 : -1) * 4, i % 3 === 0 ? -3 : 1), angle: () => ultRnd(54, 62), finMul: 1.0 }
});

/* ---------- the Temple of a Thousand Arms: the trial's own stage (boss-only, never in stage lists) ---------- */
const ASHURA_STAGE = { id: 'temple1000', event: 'boss', name: 'Temple of a Thousand Arms', swatch: ['#1a0606', '#8a2a12', '#ffd35c'], blurb: 'A mountaintop temple at dusk, stone palms that rise and sink',
  solids: [EV_S(460, 630, 680, 90)],
  plats: [EV_P(390, 520, 120, { my: 40, per: 480 }), EV_P(1090, 520, 120, { my: 40, per: 480, ph: 0.5 }), EV_P(600, 410, 120), EV_P(880, 410, 120), EV_P(740, 300, 140, { mx: 120, per: 720 })],
  cycle: { per: 7200, tint: '#12020a', max: 0.4 } };
ASHURA_STAGE.blast = buildStage(ASHURA_STAGE).blast; ASHURA_STAGE.main = ASHURA_STAGE.solids[0];
STAGES.push(ASHURA_STAGE);
const ASHURA_STAGE_N = STAGES.length - 1;

/* ---------- the Trial of Ashura ---------- */
const ASHURA_TRIAL = { name: 'Trial of Ashura', needLevel: 300, stage: ASHURA_STAGE_N, cpu: 11, stocks: 3, pow: 1.55, kb: 0.62, dmgIn: 0.72, xpWin: 100 };
/* the trial is open once you reach Sky Road level 300 and have beaten every Boss Fight level (Chapter 4 included) */
function trialOpen(p) { return !!p && xpLevel(p.xp || 0).level >= ASHURA_TRIAL.needLevel && (p.beaten | 0) >= BOSS_LEVELS.length; }
/* the match settings for the trial (used by the game server): you against Ashura, no helpers */
function trialConfig(playerChar, player) {
  const T = ASHURA_TRIAL;
  const slots = [Object.assign({ type: 'you', char: playerChar, lvl: 5, team: 0 }, player || {}),
    { type: 'cpu', char: 'ashura', lvl: T.cpu, team: 1, boss: { pow: T.pow, kb: T.kb, dmgIn: T.dmgIn, size: BOSS_SIZE }, stocks: T.stocks, name: CHAR.ashura.name, tag: 'TRIAL' },
    { type: 'off' }, { type: 'off' }];
  return { stage: T.stage, stocks: BOSS_PLAYER_STOCKS, time: 6, teams: true, trial: 1, slots };
}
