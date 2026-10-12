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

test('Marlowe: String Snare yanks, Puppet Kick reaches far, Puppet Waltz knocks people away', () => {
  const c = load(), K = B(c);
  // String Snare: latch on, then yank toward him
  let g = game(c, 'marlowe'); const [f2, o2] = g.fighters; o2.x = f2.x + 260;
  press(c, g, K.BS, 0);
  let i = 0; while (!(o2.dmg > 0) && i++ < 40) run(c, g, 1);
  assert.ok(o2.dmg > 0, 'the string hit');
  const x0 = o2.x; run(c, g, 20);
  assert.ok(o2.x < x0 - 20, 'yanked toward Marlowe');
  // Puppet Kick: hits an enemy far in front of him (out of normal reach), and is slow to start
  g = game(c, 'marlowe'); const [f, o] = g.fighters; o.x = f.x + 170; o.dmg = 0;
  press(c, g, K.BR | K.BS, 0);
  run(c, g, 10); assert.equal(o.dmg, 0, 'nothing yet: it is slow to start');
  run(c, g, 20); assert.ok(o.dmg > 0, 'the puppet kicked from far away');
  assert.ok(o.vx > 0, 'knocked away from him');
  // Puppet Waltz: an enemy BEHIND him gets knocked away too
  g = game(c, 'marlowe'); const [f3, o3] = g.fighters; o3.x = f3.x - 80; o3.dmg = 0; f3.face = 1; const bx = o3.x;
  press(c, g, K.BD | K.BS, 50);
  assert.ok(o3.dmg > 0, 'the waltz hit someone behind him');
  assert.ok(o3.x < bx - 20, 'knocked away from Marlowe');
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

test('Astra Quill: Star Line, Shooting Star trail, an automatic Comet Ride, Eclipse', () => {
  const c = load(), K = B(c);
  // Star Line: hits right away at long range
  let g = game(c, 'astra'); const [f, o] = g.fighters; o.x = f.x + 220; o.dmg = 0;
  press(c, g, K.BS, 12);
  assert.ok(o.dmg > 0, 'the star line burned them');
  const one = o.dmg; run(c, g, 20); assert.equal(o.dmg, one, 'it hits once');
  // Shooting Star: she zips forward; an enemy she passed gets hit when the trail bursts
  g = game(c, 'astra'); const [f2, o2] = g.fighters; o2.x = f2.x + 90; o2.dmg = 0; const sx = f2.x;
  press(c, g, K.BR | K.BS, 0); run(c, g, 16);
  assert.ok(f2.x > sx + 120, 'zipped forward');
  assert.equal(o2.dmg, 0, 'no hit from the dash itself');
  run(c, g, 24); assert.ok(o2.dmg > 0, 'the trail burst');
  // Comet Ride: up and forward on its own, no steering needed
  g = game(c, 'astra'); const [f3] = g.fighters; const y0 = f3.y, x0 = f3.x;
  press(c, g, K.BU | K.BS, 30);
  assert.ok(f3.y < y0 - 150, 'flew up'); assert.ok(f3.x > x0 + 60, 'and forward');
  // Eclipse: she can't be hurt while the moon covers her, then the burst hits on both sides
  g = game(c, 'astra'); const [f4, o4] = g.fighters; o4.x = f4.x - 70; o4.dmg = 0;
  press(c, g, K.BD | K.BS, 10);
  assert.ok(f4.inv > 0, 'untouchable during the eclipse');
  run(c, g, 20); assert.ok(o4.dmg > 0, 'the burst hit someone behind her');
});
