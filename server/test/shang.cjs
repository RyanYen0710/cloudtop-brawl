'use strict';
// Run after building: node --test server/test/shang.cjs
// Mr. Shang: a free fighter who switches between a Flamethrower, a Grenade Launcher and a Shotgun (keys 1 / 2 / 3).
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
/* Mr. Shang vs a standing dummy on the first stage, both on the main floor */
function game(c, dist) {
  return vm.runInContext(`(() => {
    const g = makeGame({ stage: 0, stocks: 3, time: 3, teams: false, slots: [
      { type: 'you', char: 'shang', team: 0, ctrl: { type: 'local' } }, { type: 'cpu', char: 'titan', team: 1, ctrl: { type: 'dummy', mode: 'stand' } }] });
    const m = g.stage.solids[0];
    for (const f of g.fighters) { f.inv = 0; f.halo = 0; f.y = m.y; f.ground = m; f.vx = 0; f.vy = 0; }
    const [f, o] = g.fighters; f.x = m.x + m.w * 0.3; f.face = 1; o.x = f.x + ${dist || 160}; o.face = -1;
    return g;
  })()`, c);
}
const step = (c, g, b, pr) => vm.runInContext('(g, b, pr) => stepGame(g, g.fighters.map((f, i) => i === 0 ? { b, pr } : { b: 0, pr: 0 }))', c)(g, b | 0, pr | 0);
const run = (c, g, n) => { for (let i = 0; i < n; i++) step(c, g, 0, 0); };
const press = (c, g, bits, n) => { step(c, g, bits, bits); run(c, g, n || 0); };
const B = c => vm.runInContext('({ BL, BR, BU, BD, BA, BS })', c);
const weapon = (c, g, n) => { step(c, g, n << 10, 0); run(c, g, 1); };   // keys 1 / 2 / 3
const neutralName = (c, f) => vm.runInContext('f => fSpecials(f).neutral.name', c)(f);

test('Mr. Shang is free, has three weapons, starts with the Flamethrower, and copies nobody', () => {
  const c = load();
  assert.ok(vm.runInContext("!!CHAR.shang && !CHAR.shang.locked && !CHAR.shang.hidden && ROSTER.includes(CHAR.shang)", c));
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(CHAR.shang.modes.map(id => CHAR[id].name))', c)), ['Flamethrower', 'Grenade Launcher', 'Shotgun']);
  const g = game(c); assert.equal(g.fighters[0].yenMode, 0); assert.equal(neutralName(c, g.fighters[0]), 'Flame Spray');
  // a mid-tier fighter: weaker on paper than every legend
  const sum = vm.runInContext("id => Object.values(CHAR[id].stats).reduce((a, b) => a + b, 0) - CHAR[id].stats.skill", c);
  for (const boss of ['chuang', 'hsi', 'yen', 'vexa', 'ashura']) assert.ok(sum('shang') < sum(boss), 'weaker than ' + boss);
  // no other fighter has one of his special names or his ultimate style
  const mine = JSON.parse(vm.runInContext("JSON.stringify([...new Set(CHAR.shang.modes.flatMap(id => Object.values(CHAR[id].specials).map(m => m.name)))])", c));
  const others = JSON.parse(vm.runInContext("JSON.stringify(Object.values(CHAR).filter(x => x.specials && x.id !== 'shang' && !(x.weapon)).flatMap(x => Object.values(x.specials).map(m => m.name)))", c));
  for (const n of mine) assert.ok(!others.includes(n), n);
  assert.equal(vm.runInContext("ROSTER.filter(x => x.ultimate.style === 'loadout').length", c), 1);
  assert.ok(vm.runInContext('!!ULT_STYLES.loadout', c));
});

test('keys 1 / 2 / 3 switch his weapon, and the neutral special changes with it', () => {
  const c = load(); const g = game(c), f = g.fighters[0];
  weapon(c, g, 2); assert.equal(f.yenMode, 1); assert.equal(neutralName(c, f), 'Grenade Lob');
  weapon(c, g, 3); assert.equal(f.yenMode, 2); assert.equal(neutralName(c, f), 'Buckshot');
  weapon(c, g, 1); assert.equal(f.yenMode, 0); assert.equal(neutralName(c, f), 'Flame Spray');
  weapon(c, g, 7); assert.equal(f.yenMode, 0, 'keys past 3 do nothing');
});

test('Flamethrower: the spray burns up close but does not reach far; Flame Jet shoots him forward', () => {
  const c = load(), K = B(c);
  let g = game(c, 110); let [f, o] = g.fighters;
  for (let i = 0; i < 40; i++) step(c, g, K.BS, i === 0 ? K.BS : 0);   // hold
  assert.ok(o.dmg > 3, 'burned up close (' + o.dmg + ')'); assert.ok(o.burn > 0, 'set on fire');
  g = game(c, 420); [f, o] = g.fighters;
  for (let i = 0; i < 40; i++) step(c, g, K.BS, i === 0 ? K.BS : 0);
  assert.equal(o.dmg, 0, 'too far away');
  g = game(c, 900); [f] = g.fighters; const x0 = f.x;
  press(c, g, K.BR | K.BS, 26); assert.ok(f.x > x0 + 150, 'Flame Jet moved him forward');
});

test('Grenade Launcher: a grenade blows up on an enemy; with nobody there it bounces, then blows up', () => {
  const c = load(), K = B(c);
  let g = game(c, 200); let [f, o] = g.fighters; weapon(c, g, 2);
  press(c, g, K.BS, 0); let i = 0; while (!(o.dmg > 0) && i++ < 120) run(c, g, 1);
  assert.ok(o.dmg >= 8, 'the grenade hit (' + o.dmg + ')');
  g = game(c, 2000); [f, o] = g.fighters; f.x = g.stage.solids[0].x + g.stage.solids[0].w * 0.08; weapon(c, g, 2);
  press(c, g, K.BS, 0); let bounced = false, boom = false;
  for (i = 0; i < 160 && !boom; i++) { run(c, g, 1); const evs = g.events.map(e => e[1]); if (evs.includes('clank')) bounced = true; if (evs.includes('gboom')) boom = true; }
  assert.ok(bounced, 'bounced'); assert.ok(boom, 'then blew up');
  // Cluster Volley: three grenades
  g = game(c, 2000); weapon(c, g, 2); press(c, g, K.BR | K.BS, 14);
  assert.equal(g.projs.filter(p => p.shape === 'grenade').length, 3);
});

test('Shotgun: Buckshot is much stronger up close than far away', () => {
  const c = load(), K = B(c);
  let g = game(c, 70); let [, o] = g.fighters; weapon(c, g, 3); press(c, g, K.BS, 30); const near = o.dmg;
  g = game(c, 230); [, o] = g.fighters; weapon(c, g, 3); press(c, g, K.BS, 30); const far = o.dmg;
  assert.ok(near >= 8, 'up close (' + near + ')'); assert.ok(far < near / 2, 'far away (' + far + ')');
  // Slug reaches a long way
  g = game(c, 420); [, o] = g.fighters; weapon(c, g, 3); press(c, g, K.BR | K.BS, 50); assert.ok(o.dmg > 0, 'the slug hit from far away');
});

test('Recoil Jump throws him up; Swap Bash hits and switches to the next weapon', () => {
  const c = load(), K = B(c);
  let g = game(c, 900); let [f] = g.fighters; const y0 = f.y;
  press(c, g, K.BU | K.BS, 14); assert.ok(f.y < y0 - 120, 'flew up');
  g = game(c, 70); [f] = g.fighters; const o = g.fighters[1];
  press(c, g, K.BD | K.BS, 30);
  assert.equal(f.yenMode, 1, 'now holding the Grenade Launcher'); assert.ok(o.dmg > 0, 'the stock hit');
  press(c, g, K.BD | K.BS, 30); assert.equal(f.yenMode, 2);
  press(c, g, K.BD | K.BS, 30); assert.equal(f.yenMode, 0, 'back to the Flamethrower');
});

test('the CPU switches weapons on its own', () => {
  const c = load();
  const seen = vm.runInContext(`(() => {
    const g = makeGame({ stage: 0, stocks: 3, time: 3, teams: false, slots: [{ type: 'cpu', char: 'shang', lvl: 7, team: 0 }, { type: 'cpu', char: 'titan', lvl: 7, team: 1 }] });
    const s = new Set(); for (let i = 0; i < 60 * 40; i++) { stepGame(g, g.fighters.map(f => aiThink(f, g))); s.add(g.fighters[0].yenMode | 0); }
    return [...s];
  })()`, c);
  assert.ok(seen.length >= 2, 'used ' + seen.length + ' weapons');
});
