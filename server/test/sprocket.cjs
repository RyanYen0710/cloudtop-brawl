'use strict';
// Run after building: node --test server/test/sprocket.cjs
// Professor Sprocket: unlocks at level 50, his spring legs never carry him off the top, the Grapple Hand reels him
// to a ledge from far away (even while falling), the Extend-o Arm hits from range, and he's weaker than the bosses.
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

test('Extend-o Arm hits from about 3 body widths away', () => {
  const c = load(), B = vm.runInContext('({ BR, BS })', c);
  const g = game(c, 0), [f, o] = g.fighters, m = g.stage.solids[0];
  for (const x of g.fighters) { x.y = m.y; x.ground = m; x.vx = 0; }
  f.x = m.x + m.w * 0.3; f.face = 1; o.x = f.x + f.W * 3; o.face = -1;
  step(c, g, B.BR | B.BS, B.BS); for (let i = 0; i < 25; i++) step(c, g, 0, 0);
  assert.ok(o.dmg > 0, 'hit from range');
});
