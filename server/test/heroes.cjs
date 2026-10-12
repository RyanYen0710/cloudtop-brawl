'use strict';
// Run after building: node --test server/test/heroes.cjs
// The Sky Road heroes: Marlowe (level 100), Terra Vale (level 175), Astra Quill (level 250).
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const SRC = readFileSync(join(__dirname, '../src/worker.js'), 'utf8').replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = ');
function load() {
  const context = vm.createContext({ console, Intl, setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {}, crypto: { randomUUID: require('node:crypto').randomUUID }, Request, Response, Headers, URL, TextEncoder, TextDecoder });
  vm.runInContext(SRC, context);
  return context;
}
/* hero vs a standing dummy on the first stage, both on the main floor */
function game(c, who) {
  return vm.runInContext(`(() => {
    const g = makeGame({ stage: 0, stocks: 3, time: 3, teams: false, slots: [
      { type: 'you', char: '${who}', team: 0, ctrl: { type: 'local' } }, { type: 'cpu', char: 'titan', team: 1, ctrl: { type: 'dummy', mode: 'stand' } }] });
    const m = g.stage.solids[0];
    for (const f of g.fighters) { f.inv = 0; f.halo = 0; f.y = m.y; f.ground = m; f.vx = 0; f.vy = 0; }
    const [f, o] = g.fighters; f.x = m.x + m.w * 0.3; f.face = 1; o.x = f.x + 160; o.face = -1;
    return g;
  })()`, c);
}
const step = (c, g, b, pr) => vm.runInContext('(g, b, pr) => stepGame(g, g.fighters.map((f, i) => i === 0 ? { b, pr } : { b: 0, pr: 0 }))', c)(g, b | 0, pr | 0);
const run = (c, g, n) => { for (let i = 0; i < n; i++) step(c, g, 0, 0); };
const press = (c, g, bits, n) => { step(c, g, bits, bits); run(c, g, n || 0); };
const B = c => vm.runInContext('({ BL, BR, BU, BD, BA, BS })', c);

test('they unlock on the Sky Road at levels 100, 175 and 250, and are weaker than the bosses', () => {
  const c = load(), at = vm.runInContext('levelUnlocksFor', c);
  assert.ok(!at(99).includes('marlowe') && at(100).includes('marlowe'));
  assert.ok(!at(174).includes('terra') && at(175).includes('terra'));
  assert.ok(!at(249).includes('astra') && at(250).includes('astra'));
  const sum = vm.runInContext("id => Object.values(CHAR[id].stats).reduce((a, b) => a + b, 0) - CHAR[id].stats.skill", c);
  for (const h of ['marlowe', 'terra', 'astra']) for (const boss of ['chuang', 'hsi', 'yen']) assert.ok(sum(h) < sum(boss), h + ' < ' + boss);
  // nobody shares a special or an ultimate style with anyone else
  const all = JSON.parse(vm.runInContext("JSON.stringify(ROSTER.map(c => ({ id: c.id, sp: Object.values(c.specials).map(m => m.name), u: c.ultimate.style })))", c));
  for (const h of ['marlowe', 'terra', 'astra']) {
    const me = all.find(x => x.id === h);
    for (const o of all) if (o.id !== h && o.id !== 'yen') { assert.notEqual(o.u, me.u); for (const n of me.sp) assert.ok(!o.sp.includes(n), n); }
    assert.ok(vm.runInContext(`!!ULT_STYLES[CHAR.${h}.ultimate.style]`, c));
  }
});

test('Marlowe: his puppet copies his hits; String Snare yanks; Marionette Swap trades places', () => {
  const c = load(), K = B(c);
  let g = game(c, 'marlowe'); const [f, o] = g.fighters;
  press(c, g, K.BD | K.BS, 30);   // Puppet Double: 60 in front of him
  const pp = g.projs.find(p => p.m.puppet); assert.ok(pp, 'a puppet');
  // walk the dummy next to the puppet and Marlowe far away; his jab still lands through the puppet
  o.x = pp.x + 30; f.x = pp.x - 220; f.face = 1; o.dmg = 0;
  press(c, g, K.BA, 20);
  assert.ok(o.dmg > 0, 'the puppet copied the hit');
  // Marionette Swap: trade places with the puppet
  const px = pp.x, fx = f.x; run(c, g, 20);
  press(c, g, K.BR | K.BS, 6);
  assert.ok(Math.abs(f.x - px) < 2, 'Marlowe is where the puppet was');
  assert.ok(Math.abs(pp.x - fx) < 2, 'the puppet is where Marlowe was');
  // String Snare: latch on, then yank toward him
  g = game(c, 'marlowe'); const [f2, o2] = g.fighters; o2.x = f2.x + 260;
  press(c, g, K.BS, 0);
  let i = 0; while (!(o2.dmg > 0) && i++ < 40) run(c, g, 1);
  assert.ok(o2.dmg > 0, 'the string hit');
  const x0 = o2.x; run(c, g, 20);
  assert.ok(o2.x < x0 - 20, 'yanked toward Marlowe');
});

test('Terra Vale: brick walls stop shots, the wrecking ball, a scaffold to stand on, the blueprint cage', () => {
  const c = load(), K = B(c);
  let g = game(c, 'terra'); const [f, o] = g.fighters; o.x = f.x + 600;
  press(c, g, K.BS, 0); let i = 0; while (!g.projs.some(p => p.shape === 'brickwall') && i++ < 90) run(c, g, 1);
  const wall = g.projs.find(p => p.shape === 'brickwall'); assert.ok(wall, 'a brick wall went up');
  // an enemy shot flying into the wall is stopped
  vm.runInContext('(g, w) => { const o = g.fighters[1]; g.projs.push({ owner: o, tid: o.tid, key: "neutral", m: { speed: 8, life: 80, size: 14, dmg: 5, b: 3, g: 0.3, angle: 30 }, shape: "orb", color: "#fff", size: 14, x: w.x + 120, y: w.y - 40, vx: -8, vy: 0, life: 80, dmg: 5, hit: new Set(), age: 0, armed: 0, stuck: false, face: -1 }); }', c)(g, wall);
  run(c, g, 30);
  assert.ok(!g.projs.some(p => p.shape === 'orb'), 'the wall stopped it');
  // Wrecking Ball
  g = game(c, 'terra'); const [f2, o2] = g.fighters; o2.x = f2.x + 150;
  press(c, g, K.BR | K.BS, 0); i = 0; while (!(o2.dmg > 0) && i++ < 70) run(c, g, 1);
  assert.ok(o2.dmg >= 10, 'smashed');
  // Scaffold: she ends up standing on her own platform
  g = game(c, 'terra'); const [f3] = g.fighters;
  press(c, g, K.BU | K.BS, 0); i = 0; while (!g.projs.some(p => p.shape === 'scaffold') && i++ < 60) run(c, g, 1);
  assert.ok(g.projs.some(p => p.shape === 'scaffold'), 'a scaffold');
  run(c, g, 40);
  assert.ok(f3.ground && f3.ground.tmp, 'standing on the scaffold');
  run(c, g, 300);
  assert.ok(!g.stage.surfaces.some(s => s.tmp), 'the scaffold is gone after a while');
  // Blueprint Trap
  g = game(c, 'terra'); const [f4, o4] = g.fighters; o4.x = f4.x + 120;
  press(c, g, K.BD | K.BS, 0); run(c, g, 80);
  assert.ok(o4.dmg >= 9 && o4.slow > 0, 'caged');
});

test('Astra Quill: star pins (3 at most), burning links, a steerable comet, the gravity well throws shots back', () => {
  const c = load(), K = B(c);
  let g = game(c, 'astra'); const [f, o] = g.fighters; o.x = f.x + 900;
  for (let k = 0; k < 4; k++) { press(c, g, K.BS, 20); }
  assert.equal(g.projs.filter(p => p.shape === 'starpin').length, 3, 'three at most');
  // two stars with the dummy between them, then link them
  g = game(c, 'astra'); const [f2, o2] = g.fighters; o2.x = f2.x + 380;
  press(c, g, K.BS, 20); f2.y -= 0; f2.x += 0;
  const s1 = g.projs.find(p => p.shape === 'starpin'); s1.x = o2.x - 80; s1.y = o2.y - o2.H / 2; s1.vx = s1.vy = 0;
  press(c, g, K.BS, 20);
  const s2 = g.projs.filter(p => p.shape === 'starpin')[1]; s2.x = o2.x + 80; s2.y = o2.y - o2.H / 2; s2.vx = s2.vy = 0;
  o2.dmg = 0; press(c, g, K.BR | K.BS, 10);
  assert.ok(o2.dmg > 0, 'burned by the link');
  // Comet Ride goes up, and steering bends it
  g = game(c, 'astra'); const [f3] = g.fighters; const y0 = f3.y, x0 = f3.x;
  press(c, g, K.BU | K.BS, 0); for (let k = 0; k < 30; k++) step(c, g, K.BR, 0);
  assert.ok(f3.y < y0 - 150, 'flew up'); assert.ok(f3.x > x0 + 60, 'steered right');
  // Gravity Well: an enemy shot gets caught, orbits, then flies back at the enemy
  g = game(c, 'astra'); const [f4, o4] = g.fighters; o4.x = f4.x + 320; o4.dmg = 0;
  press(c, g, K.BD | K.BS, 8);
  vm.runInContext('(g) => { const [f, o] = g.fighters; g.projs.push({ owner: o, tid: o.tid, key: "neutral", m: { speed: 8, life: 120, size: 14, dmg: 6, b: 3, g: 0.3, angle: 30 }, shape: "orb", color: "#fff", size: 14, x: f.x + 140, y: f.y - f.H / 2, vx: -8, vy: 0, life: 120, dmg: 6, hit: new Set(), age: 0, armed: 0, stuck: false, face: -1 }); }', c)(g);
  run(c, g, 6);
  const shot = g.projs.find(p => p.shape === 'orb'); assert.ok(shot && shot.orbit && shot.tid === f4.tid, 'caught in orbit');
  let i = 0; while (!(o4.dmg > 0) && i++ < 160) run(c, g, 1);
  assert.ok(o4.dmg > 0, 'thrown back and hit');
});
