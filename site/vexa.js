'use strict';
/* ===== CLOUDTOP BRAWL — Queen Vexa of the Hive (Boss Fight Chapter 4: The Overgrown Kingdom) =====
   Boss-class. Beat levels 31-40 to unlock her.
   - Venom Stinger: every stinger that lands adds a venom mark; the 3rd mark bursts into Royal Toxin
     (a short stun, then poison that keeps ticking for a few seconds).
   - Swarm Cloud: a slow cloud of bees drifts after the nearest enemy, then clings to them and keeps stinging.
   - Royal Wings: a buzzing zig-zag climb that hits on every zig.
   - Hive Nest: a hive on the floor that keeps sending homing bees at anyone who comes close.
   Also here: her ultimate's rules, the boss-only Overgrown Kingdom stage, and the chapter's stage numbers.
   The rules live here (the game server uses this file too); how it all looks is in vexa-art.js. */

ROSTER.push({
  id: 'vexa', name: 'Queen Vexa', title: 'Queen of the Hive', legend: true, locked: true,
  stats: { power: 8, speed: 8, weight: 6, jump: 9, defense: 6, skill: 8 },
  look: { build: 'slim', body: '#2a1a08', skin: '#e8c49a', accent: '#ffc21a', hair: '#1a1206', legs: '#1a1206', extra: ['queen'] },
  passive: 'Boss-class. Venom: her stingers mark enemies and the 3rd mark bursts into poison. Her swarm clings to its target and her hive never stops sending bees.',
  strongVs: ['marlowe', 'chuang'], weakVs: ['blaze', 'talon'],
  ultimate: { style: 'hive', kind: 'aim', aim: 'comb', name: "Queen's Decree", desc: 'Aim a honeycomb. Wax walls seal the target inside a hive cell, the swarm stings them over and over, then her royal stinger lance pierces through.', theme: 'hive', colors: ['#1a0e02', '#ffc21a', '#fff1b8'], hits: 6, dmg: 3.3, final: { dmg: 20, b: 13, g: 1.4, angle: 62 } },
  specials: {
    neutral: { name: 'Venom Stinger', desc: 'Fire a stinger. Each one that lands adds a venom mark; the 3rd mark bursts into Royal Toxin: a short stun, then poison.', kind: 'proj',
      dmg: 5, b: 2.6, g: 0.3, angle: 35, startup: 8, end: 12, speed: 15, life: 42, size: 12, shape: 'stinger', color: '#c8ff3a', max: 2, onHit: true,
      venom: { need: 3, keep: 360, burst: { dmg: 6, b: 5, g: 0.6, angle: 55, zap: 14 }, tox: 150, every: 25, tick: 1.2 } },
    side: { name: 'Swarm Cloud', desc: 'Send out a slow cloud of bees. It drifts after the nearest enemy, then clings to them and keeps stinging.', kind: 'proj',
      dmg: 1.9, b: 1.2, g: 0.05, angle: 70, startup: 12, end: 16, speed: 3.6, life: 170, size: 46, shape: 'swarm', color: '#ffc21a', max: 1, pierce: true, rehit: 12,
      onHit: true, step: 'swarm', turn: 0.22, cling: 64 },
    up: { name: 'Royal Wings', desc: 'Her wings buzz and she climbs in a fast zig-zag, hitting anyone she passes on every zig.', kind: 'zig',
      startup: 4, dur: 36, vy: 9.5, vx: 7.5, every: 9, dmg: 4, b: 3.5, g: 0.35, angle: 80, hw: 1.3, hh: 1.0, hy: 0.5, finalB: 7.5 },
    down: { name: 'Hive Nest', desc: 'Plant a hive on the floor (one at a time). It keeps sending homing bees at anyone who comes close.', kind: 'proj',
      dmg: 0, b: 0, g: 0, angle: 0, startup: 12, end: 14, speed: 0, life: 540, size: 44, shape: 'hive', color: '#e8a21a', max: 1, ground: true, offset: 70, noHit: true,
      hive: { every: 64, range: 520, first: 24 },
      bee: { dmg: 4.5, b: 3.2, g: 0.35, angle: 50, speed: 6.8, life: 110, size: 14, shape: 'bee', color: '#ffc21a', step: 'bee', seekT: 0.5 } }
  }
});
CHAR.vexa = ROSTER[ROSTER.length - 1];

/* the new shapes (added at the end, so every older shape keeps its number online) */
['stinger', 'swarm', 'hive', 'bee'].forEach(s => { if (SHAPES.indexOf(s) < 0) SHAPES.push(s); });

/* ---------- Royal Wings: the zig-zag climb ---------- */
if (typeof runActX === 'function') {
  const runActNoVexa = runActX;
  runActX = function (f, inp, g, dirX, a, m) {
    if (m.kind !== 'zig') return runActNoVexa(f, inp, g, dirX, a, m);
    const S = m.startup || 1, D = m.dur || 36;
    a.t++;
    if (a.t < S) { f.pose = 'charge'; f.pt = 0.4; f.vx *= 0.5; a.noGrav = true; if (!f.ground) f.vy *= 0.5; return true; }
    if (a.t < S + D) {
      const k = a.t - S, leg = Math.floor(k / (m.every || 9));
      if (k === 0) { a.zz = dirX || f.face; f.ground = null; f.y -= 2; emit(g, 'jump', f.x, f.y, 2); }
      const side = leg % 2 ? -a.zz : a.zz;
      f.vx = side * m.vx + dirX * 1.2; f.vy = -m.vy; a.noGrav = true; f.face = Math.sign(f.vx) || f.face;
      if (k % (m.every || 9) === 0) { a.hit.clear(); emit(g, 'zig', f.x, f.y - f.H / 2, side, f.slot); }
      f.hot = true; f.pose = 'fly'; f.pt = 1;
      const fin = m.finalB && k === D - 1;
      if (fin) a.hit.clear();
      hitCheck(f, g, fin ? Object.assign({}, m, { b: m.finalB, g: m.g * 2.5 }) : m, a, 1);
      return true;
    }
    a.noGrav = false; f.vy = Math.max(f.vy, -3); endAct(f); if (!f.ground) f.helpless = true;
    return true;
  };
}

/* ---------- projectiles that move their own way ---------- */
if (typeof projStepX === 'function') {
  const projStepNoVexa = projStepX;
  projStepX = function (p, g) {
    const m = p.m;
    if (p.orbit || (m.step !== 'swarm' && m.step !== 'bee')) return projStepNoVexa(p, g);
    if (m.step === 'swarm') {
      const o = p.cling != null ? g.fighters.find(q => q.slot === p.cling) : null;
      if (o && !(o.out || o.dead > 0 || o.vanish)) {   // clinging: it rides along with them
        p.x += (o.x - p.x) * 0.5; p.y += (o.y - o.H / 2 - p.y) * 0.5; p.vx = (o.x - p.x) || p.vx; p.vy = 0; p.armed = 1;
        return;
      }
      if (p.cling != null) { p.life = Math.min(p.life, 10); p.cling = null; p.armed = 0; }
      const t = nearestEnemy(p.owner, g, 900);
      if (t && p.age > 6) {   // drift toward the nearest enemy
        const dx = t.x - p.x, dy = (t.y - t.H / 2) - p.y, d = Math.hypot(dx, dy) || 1, sp = m.speed || 3.6;
        p.vx += dx / d * (m.turn || 0.2); p.vy += dy / d * (m.turn || 0.2);
        const v = Math.hypot(p.vx, p.vy); if (v > sp) { p.vx *= sp / v; p.vy *= sp / v; }
      }
      p.x += p.vx; p.y += p.vy + Math.sin(p.age * 0.2) * 0.6;
      return;
    }
    // a bee from the hive: lifts off, then homes in on its target
    const t = p.target != null ? g.fighters.find(q => q.slot === p.target) : null, sp = m.speed || 6.8;
    if (p.age < 14 || !t || t.out || t.dead > 0 || t.vanish) { p.vy -= p.age < 14 ? 0.25 : 0; }
    else {
      const dx = t.x - p.x, dy = (t.y - t.H / 2) - p.y, d = Math.hypot(dx, dy) || 1;
      p.vx += dx / d * (m.seekT || 0.5); p.vy += dy / d * (m.seekT || 0.5);
    }
    const v = Math.hypot(p.vx, p.vy); if (v > sp) { p.vx *= sp / v; p.vy *= sp / v; }
    p.x += p.vx; p.y += p.vy; p.face = Math.sign(p.vx) || p.face;
  };
}

/* ---------- venom marks and Royal Toxin; the swarm clings to whoever it stings ---------- */
if (typeof projOnHit === 'function') {
  const projOnHitNoVexa = projOnHit;
  projOnHit = function (p, o, g) {
    const m = p.m;
    if (m.step === 'swarm') {
      if (p.cling == null) { p.cling = o.slot; p.life = Math.min(p.life, m.cling || 80); emit(g, 'swarmon', o.x, o.y - o.H / 2, 0, p.owner.slot); }
      return;
    }
    if (m.venom) {
      const V = m.venom, by = p.owner;
      if (o.venomBy !== by) o.venomN = 0;
      o.venomBy = by; o.venomN = (o.venomN || 0) + 1; o.venomKeep = V.keep;
      if (o.venomN >= V.need) {   // Royal Toxin
        o.venomN = 0;
        emit(g, 'toxin', o.x, o.y - o.H / 2, 0, by.slot);
        applyHit(by, o, V.burst, Math.sign(o.x - by.x) || by.face, g, true);
        o.toxT = V.tox; o.toxM = V; o.toxBy = by;
      } else emit(g, 'venom', o.x, o.y - o.H * 0.75, o.venomN, by.slot);
      return;
    }
    projOnHitNoVexa(p, o, g);
  };
}

/* every frame, after the projectiles move: poison ticks, venom wears off, hives send bees */
if (typeof stepProjsX === 'function') {
  const stepProjsNoVexa = stepProjsX;
  stepProjsX = function (g) {
    stepProjsNoVexa(g);
    for (const o of g.fighters) {
      if (o.out || o.dead > 0) { o.venomN = 0; o.toxT = 0; continue; }
      if (o.venomKeep > 0 && --o.venomKeep === 0) o.venomN = 0;
      if (o.toxT > 0) {
        o.toxT--;
        const V = o.toxM, by = o.toxBy;
        if (V && by && o.toxT % V.every === 0) {
          const d = V.tick * by.ph.pm * (by.boss ? by.boss.pow : 1) * o.ph.dt * (o.boss ? o.boss.dmgIn : 1);
          o.dmg = Math.min(999, o.dmg + d);
          emit(g, 'toxtick', o.x, o.y - o.H / 2, 0, by.slot);
        }
      }
    }
    const bees = [];
    for (const p of g.projs) {
      if (p.m.shape !== 'hive' || p.life <= 0 || !p.m.hive) continue;
      const H = p.m.hive;
      p.beeT = p.beeT == null ? H.first : p.beeT - 1;
      p.armed = p.beeT < 10 ? 1 : 0;   // the hive shakes just before a bee comes out
      if (p.beeT > 0) continue;
      let t = null, bd = H.range;
      for (const o of g.fighters) {
        if (o.out || o.dead > 0 || o.vanish || o.tid === p.tid) continue;
        const d = Math.hypot(o.x - p.x, (o.y - o.H / 2) - p.y); if (d < bd) { bd = d; t = o; }
      }
      if (!t) { p.beeT = 8; continue; }
      p.beeT = H.every;
      const b = p.m.bee, dir = Math.sign(t.x - p.x) || 1;
      bees.push({ owner: p.owner, tid: p.tid, key: 'bee', m: b, shape: b.shape, color: b.color, size: b.size, x: p.x, y: p.y - p.size * 0.4, vx: dir * 2, vy: -4,
        life: b.life, dmg: b.dmg, hit: new Set(), age: 0, armed: 0, stuck: false, face: dir, target: t.slot });
      emit(g, 'beeout', p.x, p.y - p.size * 0.4, dir, p.owner.slot);
    }
    if (bees.length) g.projs.push(...bees);
  };
}

/* ---------- her ultimate: sealed in a honeycomb cell, the swarm stings, then the royal stinger ---------- */
if (typeof ULT_STYLES !== 'undefined') Object.assign(ULT_STYLES, {
  hive: { hit: (o, i, u, g) => ultPush(o, g, (i % 2 ? -1 : 1) * 3, -1.5), angle: () => ultRnd(58, 66), finMul: 0.95 }
});

/* ---------- the Overgrown Kingdom: a boss-only stage (event 'boss' never runs, so it never shows up in stage lists) ---------- */
const VEXA_STAGE = { id: 'kingdom', event: 'boss', name: 'Overgrown Kingdom', swatch: ['#0e1a0a', '#3a6a1a', '#ffc21a'], blurb: 'A vine-covered castle, swaying vines and flowers that open and close',
  solids: [EV_S(440, 640, 720, 80)],
  plats: [EV_P(400, 530, 120, { mx: 40, per: 420 }), EV_P(1080, 530, 120, { mx: 40, per: 420, ph: 0.5 }), EV_P(600, 420, 120, { blink: [480, 180, 0] }), EV_P(880, 420, 120, { blink: [480, 180, 0.5] }),
    EV_P(740, 310, 130), EV_P(745, 205, 100, { my: 30, per: 400 })],
  cycle: { per: 7200, tint: '#06120a', max: 0.35 } };
VEXA_STAGE.blast = buildStage(VEXA_STAGE).blast; VEXA_STAGE.main = VEXA_STAGE.solids[0];
STAGES.push(VEXA_STAGE);
const VEXA_STAGE_N = STAGES.length - 1;
// Chapter 4's levels name their stage 'kingdom' in data.js: give them its number
BOSS_LEVELS.forEach(L => { if (L.stage === 'kingdom') L.stage = VEXA_STAGE_N; });
