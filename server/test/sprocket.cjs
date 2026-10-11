'use strict';
// Run after building: node --test server/test/sprocket.cjs
// Professor Sprocket: unlocks at level 50, his spring legs never carry him off the top, the Grapple Hand reels him
// to a ledge from far away (even while falling), his gadgets (Gear Cannon, Robo-Pup, spring pad, Magnet Trap), the
// Mega Mech ultimate, and he's weaker than the bosses.
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
class Storage {
  constructor() { this.rows = new Map(); this.queue = Promise.resolve(); }
  async get(k) { return structuredClone(this.rows.get(k)); } async put(k, v) { this.rows.set(k, structuredClone(v)); } async delete(k) { return this.rows.delete(k); }
  async list({ prefix = '', limit = Infinity } = {}) { return new Map([...this.rows].filter(([k]) => k.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b)).slice(0, limit)); }
  transaction(fn) { const r = this.queue.then(() => fn(this)); this.queue = r.catch(() => {}); return r; }
}
/* Sprocket vs a standing dummy on stage i */
function game(c, stage) {
  return vm.runInContext('(' + makeOn.toString() + ')', c)(stage);
}
/* runs inside the game's own context */
function makeOn(stage) {
  const g = makeGame({ stage, stocks: 3, time: 3, teams: false, slots: [
    { type: 'you', char: 'sprocket', team: 0, ctrl: { type: 'local' } }, { type: 'cpu', char: 'titan', team: 1, ctrl: { type: 'dummy', mode: 'stand' } }] });
  for (const f of g.fighters) { f.inv = 0; f.halo = 0; }
  return g;
}
const step = (c, g, b, pr) => vm.runInContext('(g, b, pr) => stepGame(g, g.fighters.map((f, i) => i === 0 ? { b, pr } : { b: 0, pr: 0 }))', c)(g, b | 0, pr | 0);

test('Professor Sprocket unlocks at level 50 (and Random never hands out a locked fighter)', async () => {
  const c = load(), A = vm.runInContext('Accounts', c), acc = new A({ storage: new Storage() });
  const op = (o, d) => acc.fetch(new c.Request('https://acct/' + o, { method: 'POST', body: JSON.stringify(d) })).then(r => r.json());
  let p = await op('get', { name: 'amy' });
  assert.ok(!p.unlocked.includes('sprocket'));
  const total = vm.runInContext('xpTotal', c);
  await op('xp-add', { amount: total(50) - 10, why: 'test' });
  assert.ok(!(await op('get', {})).unlocked.includes('sprocket'), 'level 49');
  await op('xp-add', { amount: 20, match: true, why: 'Online match' });
  p = await op('get', {});
  assert.ok(p.unlocked.includes('sprocket'), 'level 50');
  assert.ok((await op('xp-get', {})).unlocked.includes('sprocket'));
  // an admin setting someone to level 50 unlocks him too
  const acc2 = new A({ storage: new Storage() }), op2 = (o, d) => acc2.fetch(new c.Request('https://acct/' + o, { method: 'POST', body: JSON.stringify(d) })).then(r => r.json());
  await op2('get', { name: 'bob' }); await op2('xp-set', { level: 50, byOwner: true, actor: { name: 'owner' } });
  assert.ok((await op2('get', {})).unlocked.includes('sprocket'));
  const pick = vm.runInContext("() => resolvePick('random')", c);
  for (let i = 0; i < 500; i++) assert.notEqual(pick(), 'sprocket');
});

test('he is weaker than the Boss Fight fighters', () => {
  const c = load(), sum = vm.runInContext("id => Object.values(CHAR[id].stats).reduce((a, b) => a + b, 0) - CHAR[id].stats.skill", c);
  for (const boss of ['chuang', 'hsi', 'yen']) assert.ok(sum('sprocket') < sum(boss), boss);
});

test('Spring Leap and his triple jump never carry him off the top, on any stage', () => {
  const c = load(), B = vm.runInContext('({ BU, BJ, BS })', c), n = vm.runInContext('STAGES.length', c);
  for (let s = 0; s < n; s++) {
    const g = game(c, s), f = g.fighters[0];
    const top = g.stage.plats.length ? g.stage.plats.reduce((a, p) => (p.y < a.y ? p : a)) : g.stage.solids[0];
    f.x = top.x + top.w / 2; f.y = top.y; f.ground = top; f.vx = 0; f.vy = 0;
    for (let k = 0; k < 3; k++) { step(c, g, B.BJ, B.BJ); for (let i = 0; i < 14; i++) step(c, g, 0, 0); }
    step(c, g, B.BU | B.BS, B.BS);
    for (let i = 0; i < 160; i++) step(c, g, B.BU, 0);
    assert.equal(f.falls, 0, g.stage.id + ': he stays in'); assert.ok(f.y > g.stage.blast.t, g.stage.id);
  }
});

test('Grapple Hand: reels him to a ledge from far away, even while falling helpless; out of reach it misses', () => {
  const c = load(), B = vm.runInContext('({ BD, BS })', c);
  // below and to the left of the main stage's left corner, ~250px away, helpless after an up special
  let g = game(c, 0), f = g.fighters[0], m = g.stage.solids[0];
  f.ground = null; f.x = m.x - 180; f.y = m.y + 230; f.vx = 0; f.vy = 4; f.helpless = true; f.upUsed = true;
  step(c, g, B.BD | B.BS, B.BS);
  let i = 0; while (!f.ledge && i++ < 40) step(c, g, 0, 0);
  assert.ok(f.ledge, 'hanging on the ledge'); assert.equal(f.ledge.side, -1);
  assert.equal(f.helpless, false);
  // far away: no ledge, he keeps falling
  g = game(c, 0); f = g.fighters[0]; m = g.stage.solids[0];
  f.ground = null; f.x = m.x - 520; f.y = m.y + 350; f.vy = 4; f.helpless = true;
  step(c, g, B.BD | B.BS, B.BS); for (let k = 0; k < 40; k++) step(c, g, 0, 0);
  assert.ok(!f.ledge);
  // only once per jump
  g = game(c, 0); f = g.fighters[0]; m = g.stage.solids[0];
  f.ground = null; f.x = m.x - 520; f.y = m.y + 120; f.vy = 2;
  step(c, g, B.BD | B.BS, B.BS); for (let k = 0; k < 40; k++) step(c, g, 0, 0);
  const used = f.grappleUsed; f.x = m.x - 150; f.y = m.y + 150;
  step(c, g, B.BD | B.BS, B.BS); for (let k = 0; k < 40; k++) step(c, g, 0, 0);
  assert.ok(used); assert.ok(!f.ledge, 'the second try in the same jump does nothing');
});

const near = (c, g) => { const [f, o] = g.fighters, m = g.stage.solids[0]; for (const x of g.fighters) { x.y = m.y; x.ground = m; x.vx = 0; x.vy = 0; } f.x = m.x + m.w * 0.3; f.face = 1; o.x = f.x + 200; o.face = -1; return { f, o, m }; };

test('Gear Cannon: a gear that bounces along the floor and zaps; hold it for a giant gear', () => {
  const c = load(), B = vm.runInContext('({ BS })', c);
  let g = game(c, 0), { f, o } = near(c, g);
  step(c, g, B.BS, B.BS); for (let i = 0; i < 12; i++) step(c, g, 0, 0);
  const gear = g.projs.find(p => p.shape === 'gear');
  assert.ok(gear, 'a gear'); assert.equal(gear.m.bounce, 3);
  let i = 0; while (!(o.dmg > 0) && i++ < 90) step(c, g, 0, 0);
  assert.ok(o.dmg > 0, 'hit'); assert.ok(o.zap > 0 || o.hitstun > 0, 'zapped');
  g = game(c, 0); ({ f, o } = near(c, g));
  step(c, g, B.BS, B.BS); for (let k = 0; k < 60; k++) step(c, g, B.BS, 0); step(c, g, 0, 0);
  for (let k = 0; k < 4; k++) step(c, g, 0, 0);
  const big = g.projs.find(p => p.shape === 'gear');
  assert.ok(big && big.charged && big.pierce, 'a charged gear goes through people');
});

test('Robo-Pup runs along the floor and blows up on the first enemy', () => {
  const c = load(), B = vm.runInContext('({ BR, BS })', c);
  const g = game(c, 0), { f, o } = near(c, g); o.x = f.x + 320;
  step(c, g, B.BR | B.BS, B.BS); for (let i = 0; i < 16; i++) step(c, g, 0, 0);
  const pup = g.projs.find(p => p.shape === 'robopup'); assert.ok(pup, 'the pup is out');
  const y0 = pup.y;
  let i = 0; while (!(o.dmg > 0) && i++ < 120) step(c, g, 0, 0);
  assert.ok(o.dmg >= 8, 'it blew up on them'); assert.ok(Math.abs(y0 - (pup.y)) < 3, 'it ran along the floor');
  assert.equal(g.projs.filter(p => p.shape === 'robopup').length, 0);
});

test('Spring Leap leaves a spring pad that bounces enemies; on the ground Grapple Hand drops a Magnet Trap', () => {
  const c = load(), B = vm.runInContext('({ BU, BD, BS })', c);
  let g = game(c, 0), { f, o } = near(c, g);
  step(c, g, B.BU | B.BS, B.BS); for (let i = 0; i < 8; i++) step(c, g, 0, 0);
  const pad = g.projs.find(p => p.shape === 'springpad'); assert.ok(pad, 'a spring pad');
  o.x = pad.x; o.y = g.stage.solids[0].y; o.ground = g.stage.solids[0];
  let i = 0; while (!(o.vy < -3) && i++ < 30) step(c, g, 0, 0);
  assert.ok(o.vy < -3 && o.dmg > 0, 'bounced up');
  g = game(c, 0); ({ f, o } = near(c, g)); o.x = f.x + 240;
  step(c, g, B.BD | B.BS, B.BS); for (let i = 0; i < 10; i++) step(c, g, 0, 0);
  const mag = g.projs.find(p => p.shape === 'magnet'); assert.ok(mag, 'a magnet');
  const x0 = o.x; for (let k = 0; k < 20; k++) step(c, g, 0, 0);
  assert.ok(Math.abs(o.x - mag.x) < Math.abs(x0 - mag.x), 'pulled in');
  i = 0; while (g.projs.some(p => p.shape === 'magnet') && i++ < 120) step(c, g, 0, 0);
  assert.ok(o.dmg >= 8, 'zapped at the end');
});

test('Mega Mech: bigger, heavier, super armor and new moves for a few seconds, then back to normal', () => {
  const c = load(), B = vm.runInContext('({ BZ, BS })', c), K = vm.runInContext('({ ULT_CUT, MECH_SIZE })', c);
  const g = game(c, 0), { f, o } = near(c, g), H0 = f.H, pm0 = f.ph.pm;
  f.ult = true; step(c, g, 0, B.BZ);
  for (let i = 0; i < K.ULT_CUT + 3; i++) step(c, g, 0, 0);
  assert.ok(f.mech > 0, 'in the mech'); assert.equal(g.ult, null);
  assert.ok(Math.abs(f.H - H0 * K.MECH_SIZE) < 1e-6 && f.ph.pm > pm0, 'bigger and stronger');
  const sp = vm.runInContext('f => fSpecials(f)', c)(f);
  assert.equal(sp.neutral.name, 'Rocket Fist'); assert.equal(sp.down.name, 'Mega Stomp');
  f.inv = 0; const r = vm.runInContext('applyHit', c)(o, f, { dmg: 6, b: 4, g: 0.4, angle: 45 }, 1, g, false);
  assert.equal(r, 'armor', 'normal hits don\'t knock him around');
  for (let i = 0; i < 400; i++) step(c, g, 0, 0);
  assert.ok(!(f.mech > 0), 'the suit runs out'); assert.equal(f.H, H0); assert.equal(f.ph.pm, pm0);
  assert.equal(vm.runInContext('f => fSpecials(f)', c)(f).neutral.name, 'Gear Cannon');
});
