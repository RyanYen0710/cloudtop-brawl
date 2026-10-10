'use strict';
// Run after building: node --test server/test/remake.cjs
// The remade side specials (Fire Wall, Ankle Breaker, Bubble Trap) and ultimates (camera frame, sniper scope,
// Chain Lightning, Hunter's Snare) on the solo engine and on the online server build.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const root = join(__dirname, '../..');
const read = p => readFileSync(join(root, p), 'utf8');

function load(server) {
  const context = vm.createContext({ console, performance, toast() {}, setInterval: () => 1, clearInterval() {} });
  if (server) vm.runInContext(read('server/src/worker.js').replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = '), context);
  else for (const file of ['data', 'engine', 'match', 'stages2', 'stages', 'ult']) vm.runInContext(read('site/' + file + '.js'), context);
  return vm.runInContext('({ makeGame, stepGame, tryUlt, applyHit, ULT_CUT, ULT_AIM, ULT_R, ULT_SCOPE_R, ULT_FX_END, BL, BR, BS, BZ, CHAR })', context);
}
/* me vs a standing dummy (and a third fighter far away) on the main platform */
function fresh(api, char, enemy, third) {
  const slots = [{ type: 'you', char, team: 0, ctrl: { type: 'local' } }, { type: 'peer', char: enemy || 'zephyr', team: 1, ctrl: { type: 'dummy', mode: 'stand' } }];
  if (third) slots.push({ type: 'peer', char: third, team: 2, ctrl: { type: 'dummy', mode: 'stand' } });
  const g = api.makeGame({ stage: 0, stocks: 3, time: 0, teams: false, endless: true, slots });
  const m = g.stage.solids[0], [f, o, p] = g.fighters;
  for (const x of g.fighters) { x.y = m.y; x.ground = m; x.inv = 0; x.halo = 0; x.vx = 0; x.vy = 0; }
  f.x = m.x + m.w * 0.35; f.face = 1; o.x = f.x + 150; o.face = -1;
  if (p) p.x = m.x + m.w * 0.05;
  const tick = (b = 0, pr = 0, ob = 0, opr = 0) => api.stepGame(g, g.fighters.map(x => x === f ? { b, pr } : x === o ? { b: ob, pr: opr } : { b: 0, pr: 0 }));
  const run = (n, b, pr) => { for (let i = 0; i < n; i++) tick(i === 0 ? b : 0, i === 0 ? pr : 0); };
  return { g, f, o, p, m, tick, run };
}

for (const server of [false, true]) {
  const label = server ? 'Worker' : 'solo';

  test(label + ': Blaze\'s Fire Wall stands for 3 seconds, burns enemies and burns up their projectiles', () => {
    const api = load(server), s = fresh(api, 'blaze', 'zephyr');
    s.o.x = s.f.x + 95;
    s.run(14, api.BR, api.BS);
    const wall = s.g.projs.find(p => p.shape === 'firewall');
    assert.ok(wall, 'the wall is placed'); assert.equal(Math.round(wall.x), Math.round(s.f.x + 95));
    assert.ok(s.o.dmg > 0 && s.o.burn > 0, 'whoever stands in it burns');
    // an enemy shuriken flying into the wall is burned up; the wall stays
    s.g.projs.push({ owner: s.o, tid: s.o.tid, key: 'neutral', m: api.CHAR.zephyr.specials.neutral, shape: 'star', color: '#fff', size: 10,
      x: wall.x + 70, y: wall.y - 50, vx: -15, vy: 0, life: 45, dmg: 4, hit: new Set(), age: 0, armed: 0, stuck: false, face: -1 });
    s.run(6);
    assert.ok(!s.g.projs.some(p => p.shape === 'star'), 'the shuriken burned up'); assert.ok(s.g.projs.includes(wall));
    s.run(200);
    assert.ok(!s.g.projs.includes(wall), 'gone after about 3 seconds');
  });

  test(label + ': Mythic Hsi\'s Ankle Breaker passes the enemy, trips (stuns) them and ends up behind', () => {
    const api = load(server), s = fresh(api, 'hsi', 'titan');
    const start = s.o.dmg; let i = 0;
    s.tick(api.BR, api.BS);
    while (!(s.o.zap > 0) && i++ < 30) s.tick();
    assert.ok(s.o.zap > 0, 'stunned'); assert.ok(s.o.dmg > start);
    s.run(30);
    assert.ok(s.f.x > s.o.x, 'Hsi is behind the enemy now');
    assert.ok(Math.abs(s.o.vx) < 3, 'barely moved: tripped, not launched');
  });

  test(label + ': Lumi\'s Bubble Trap floats the enemy up, then pops with a small hit; another hit pops it early', () => {
    const api = load(server), s = fresh(api, 'lumi', 'titan');
    let i = 0; s.tick(api.BR, api.BS);
    while (!(s.o.bubble > 0) && i++ < 90) s.tick();
    assert.ok(s.o.bubble > 0, 'trapped'); const y0 = s.o.y, d0 = s.o.dmg;
    s.run(20);
    assert.ok(s.o.y < y0 - 15, 'floats up'); assert.ok(s.o.bubble > 0);
    s.run(60);
    assert.equal(s.o.bubble, 0); assert.ok(s.o.dmg > d0, 'the pop hits');
    // a second bubble, popped early by a punch
    const s2 = fresh(api, 'lumi', 'titan'); s2.tick(api.BR, api.BS); i = 0;
    while (!(s2.o.bubble > 0) && i++ < 90) s2.tick();
    assert.ok(s2.o.bubble > 0);
    api.applyHit(s2.f, s2.o, { dmg: 4, b: 3, g: 0.3, angle: 40 }, 1, s2.g, false);
    assert.equal(s2.o.bubble, 0, 'popped by the punch');
  });

  test(label + ': Talon\'s Sky Snatch catches the first enemy and flings them behind him', () => {
    const api = load(server), s = fresh(api, 'talon', 'titan', 'zephyr');
    s.p.x = s.o.x + 40;   // a second enemy right behind the first one is not hit
    let i = 0; s.tick(api.BR, api.BS);
    while (!(s.o.hitstun > 0) && i++ < 30) s.tick();
    assert.ok(s.o.hitstun > 0, 'caught'); assert.ok(s.o.vx < -2, 'flung backward (behind Talon)');
    assert.equal(s.p.dmg, 0, 'only the first enemy');
  });

  const ult = (s, api, aimMoves) => {
    s.f.ult = true; s.tick(0, api.BZ);
    for (let i = 0; i < api.ULT_CUT + 2 && s.g.ult && s.g.ult.ph === 'cut'; i++) s.tick();
    if (s.g.ult && s.g.ult.ph === 'aim') { aimMoves(); s.tick(0, api.BS); for (let i = 0; i < 20 && s.g.ult && s.g.ult.ph !== 'fx'; i++) s.tick(); }
  };

  test(label + ': Master Chuang aims a camera frame (wide rectangle), not a circle', () => {
    const api = load(server), s = fresh(api, 'chuang', 'titan');
    // the target just outside where the old circle would reach, but inside the 280px-wide frame
    const dx = api.ULT_R + s.o.W * 0.35 + 12;
    ult(s, api, () => { s.g.ult.ax = s.o.x - dx; s.g.ult.ay = s.o.y - s.o.H / 2; });
    assert.ok(s.g.ult && s.g.ult.ph === 'fx', 'caught in the frame'); assert.deepEqual(JSON.parse(JSON.stringify(s.g.ult.targets)), [s.o.slot]);
  });

  test(label + ': Mr. Guo\'s sniper scope is smaller than the old circle', () => {
    const api = load(server), s = fresh(api, 'guo', 'titan');
    const dx = api.ULT_SCOPE_R + s.o.W * 0.35 + 8;   // the old 110px circle would still have caught this
    assert.ok(dx < api.ULT_R + s.o.W * 0.35);
    ult(s, api, () => { s.g.ult.ax = s.o.x - dx; s.g.ult.ay = s.o.y - s.o.H / 2; });
    assert.equal(s.g.ult, null, 'missed: just outside the scope');
    const s2 = fresh(api, 'guo', 'titan');
    ult(s2, api, () => { s2.g.ult.ax = s2.o.x - 30; s2.g.ult.ay = s2.o.y - s2.o.H / 2; });
    assert.ok(s2.g.ult && s2.g.ult.ph === 'fx');
    const d0 = s2.o.dmg; for (let i = 0; i < 120 && s2.g.ult; i++) s2.tick();
    assert.ok(s2.o.dmg > d0 + 20, 'three heavy shots and the final one');
  });

  test(label + ': Volt\'s Chain Lightning needs no aiming and hits every enemy', () => {
    const api = load(server), s = fresh(api, 'volt', 'titan', 'zephyr');
    ult(s, api, () => { throw new Error('should not aim'); });
    assert.ok(s.g.ult && s.g.ult.ph === 'fx');
    assert.deepEqual(JSON.parse(JSON.stringify(s.g.ult.targets)).sort(), [s.o.slot, s.p.slot].sort());
    const d = [s.o.dmg, s.p.dmg]; for (let i = 0; i < 120 && s.g.ult; i++) s.tick();
    assert.ok(s.o.dmg > d[0] + 10 && s.p.dmg > d[1] + 10);
  });

  test(label + ': Rowan\'s Hunter\'s Snare holds the target (no escaping), then launches them away from Rowan', () => {
    const api = load(server), s = fresh(api, 'rowan', 'titan');
    ult(s, api, () => { s.g.ult.ax = s.o.x; s.g.ult.ay = s.o.y - s.o.H / 2; });
    assert.ok(s.g.ult && s.g.ult.ph === 'fx');
    const x0 = s.o.x;
    for (let i = 0; i < 40; i++) s.tick(0, 0, api.BL);   // tries to run away
    assert.ok(Math.abs(s.o.x - x0) < 30, 'trapped');
    for (let i = 0; i < 60 && s.g.ult; i++) s.tick();
    assert.ok(s.o.vx > 2, 'sent flying away from Rowan');
  });
}
