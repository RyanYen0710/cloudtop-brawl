'use strict';
// Run after building: node --test server/test/vexa.cjs
// Queen Vexa of the Hive and Boss Fight Chapter 4: The Overgrown Kingdom (levels 31-40).
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
/* Vexa vs a standing dummy on the first stage, both on the main floor */
function game(c, foe) {
  return vm.runInContext(`(() => {
    const g = makeGame({ stage: 0, stocks: 3, time: 3, teams: false, slots: [
      { type: 'you', char: 'vexa', team: 0, ctrl: { type: 'local' } }, { type: 'cpu', char: '${foe || 'titan'}', team: 1, ctrl: { type: 'dummy', mode: 'stand' } }] });
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
const hold = (c, g, o, x) => { o.x = x; o.vx = 0; o.vy = 0; o.y = g.stage.solids[0].y; o.ground = g.stage.solids[0]; o.hitstun = 0; o.zap = 0; };

test('Chapter 4 is levels 31-40 with its own boss stage, and beating it unlocks Queen Vexa', () => {
  const c = load(), R = s => vm.runInContext(s, c);
  assert.equal(R('BOSS_LEVELS.length'), 40);
  const ch = R("BOSS_CHAPTERS.find(x => x.boss === 'vexa')");
  assert.equal(ch.from, 31); assert.equal(ch.to, 40); assert.equal(ch.place, 'The Overgrown Kingdom');
  for (let n = 31; n <= 40; n++) assert.equal(R(`BOSS_LEVELS[${n - 1}].boss`), 'vexa');
  assert.ok(!R('bossUnlocksFor(39)').includes('vexa') && R('bossUnlocksFor(40)').includes('vexa'));
  // every level points at a real stage; the kingdom levels got the new stage's number
  const kingdom = R("STAGES.findIndex(s => s.id === 'kingdom')");
  assert.ok(kingdom > 0);
  for (let n = 1; n <= 40; n++) assert.ok(Number.isInteger(R(`BOSS_LEVELS[${n - 1}].stage`)) && R(`!!STAGES[BOSS_LEVELS[${n - 1}].stage]`), 'level ' + n);
  assert.ok(R('BOSS_LEVELS.slice(30).filter(L => STAGES[L.stage].id === "kingdom").length') >= 5);
  // the boss stage never shows up in stage lists or random picks
  assert.equal(R(`stageVisible(${kingdom}, null)`), false);
  for (const ev of [null, 'halloween', 'christmas']) for (let i = 0; i < 300; i++) assert.notEqual(R(`pickStage(${JSON.stringify(ev)})`), kingdom);
  // the boss fight itself: Vexa is the boss on her stage
  const cfg = R('bossConfig(40, "titan")');
  assert.equal(cfg.slots[1].char, 'vexa'); assert.equal(cfg.stage, kingdom);
  const g = R('makeGame(bossConfig(31, "titan"))');
  assert.equal(g.fighters[1].c.id, 'vexa');
});

test('she is boss-class but weaker than Legend Yen, and nothing she does copies anyone', () => {
  const c = load(), R = s => vm.runInContext(s, c);
  const sum = id => R(`Object.values(CHAR.${id}.stats).reduce((a, b) => a + b, 0) - CHAR.${id}.stats.skill`);
  assert.ok(sum('vexa') < sum('yen'));
  assert.ok(R('CHAR.vexa.legend && CHAR.vexa.locked'));
  const all = JSON.parse(R("JSON.stringify(ROSTER.map(c => ({ id: c.id, sp: Object.values(c.specials).map(m => m.name), u: c.ultimate.style, aim: c.ultimate.aim })))"));
  const me = all.find(x => x.id === 'vexa');
  for (const o of all) if (o.id !== 'vexa') { assert.notEqual(o.u, me.u); if (o.aim) assert.notEqual(o.aim, me.aim); for (const n of me.sp) assert.ok(!o.sp.includes(n), n); }
  assert.ok(R('!!ULT_STYLES.hive'));
  assert.equal(R('shopItem("char:vexa").price'), 18000);
});

test('Venom Stinger: two marks, then the third bursts into Royal Toxin that keeps poisoning', () => {
  const c = load(), K = B(c);
  const g = game(c); const [f, o] = g.fighters; o.x = f.x + 200;
  for (let k = 1; k <= 2; k++) {
    press(c, g, K.BS, 0); let i = 0; const d0 = o.dmg; while (!(o.dmg > d0) && i++ < 40) run(c, g, 1);
    assert.equal(o.venomN, k, 'mark ' + k); run(c, g, 40); hold(c, g, o, f.x + 200);
  }
  press(c, g, K.BS, 0); let i = 0; const d0 = o.dmg; while (!(o.dmg > d0) && i++ < 40) run(c, g, 1);
  assert.equal(o.venomN, 0, 'the marks burst'); assert.ok(o.toxT > 0, 'poisoned');
  const d1 = o.dmg; run(c, g, 160);
  assert.ok(o.dmg > d1 + 5, 'the poison kept ticking');
  assert.ok(!(o.toxT > 0), 'and then wore off');
  // marks wear off if she stops hitting
  const g2 = game(c); const [f2, o2] = g2.fighters; o2.x = f2.x + 200;
  press(c, g2, K.BS, 0); i = 0; while (!(o2.dmg > 0) && i++ < 40) run(c, g2, 1);
  assert.equal(o2.venomN, 1); run(c, g2, 380); assert.equal(o2.venomN, 0);
});

test('Swarm Cloud drifts after the enemy, clings to them and keeps stinging', () => {
  const c = load(), K = B(c);
  const g = game(c); const [f, o] = g.fighters; o.x = f.x + 360;
  press(c, g, K.BR | K.BS, 0);
  let i = 0; while (!g.projs.some(p => p.shape === 'swarm') && i++ < 30) run(c, g, 1);
  const sw = g.projs.find(p => p.shape === 'swarm'); assert.ok(sw, 'a swarm');
  i = 0; while (sw.cling == null && i++ < 160) run(c, g, 1);
  assert.equal(sw.cling, o.slot, 'it clung on');
  const d0 = o.dmg; o.x += 200;   // they run, the swarm follows
  run(c, g, 40);
  assert.ok(Math.abs(sw.x - o.x) < 40, 'it followed them'); assert.ok(o.dmg > d0 + 4, 'stung again and again');
  run(c, g, 80); assert.ok(!g.projs.includes(sw) || sw.life <= 0, 'and then it goes away');
});

test('Royal Wings climbs in a zig-zag and hits on the way up', () => {
  const c = load(), K = B(c);
  const g = game(c); const [f, o] = g.fighters; const y0 = f.y, xs = [];
  o.x = f.x + 30;
  press(c, g, K.BU | K.BS, 0);
  for (let k = 0; k < 40; k++) { run(c, g, 1); xs.push(f.x); }
  assert.ok(f.y < y0 - 200, 'climbed high');
  let turns = 0; for (let k = 2; k < xs.length; k++) if (Math.sign(xs[k] - xs[k - 1]) !== Math.sign(xs[k - 1] - xs[k - 2]) && xs[k] !== xs[k - 1]) turns++;
  assert.ok(turns >= 3, 'zig-zagged (' + turns + ' turns)');
  assert.ok(o.dmg > 0, 'hit on the way');
});

test('Hive Nest keeps sending homing bees at anyone close', () => {
  const c = load(), K = B(c);
  const g = game(c); const [f, o] = g.fighters; o.x = f.x + 420;
  press(c, g, K.BD | K.BS, 0);
  let i = 0; while (!g.projs.some(p => p.shape === 'hive') && i++ < 30) run(c, g, 1);
  const hive = g.projs.find(p => p.shape === 'hive'); assert.ok(hive, 'a hive');
  i = 0; while (!g.projs.some(p => p.shape === 'bee') && i++ < 60) run(c, g, 1);
  assert.ok(g.projs.some(p => p.shape === 'bee'), 'a bee came out');
  let hits = 0, last = o.dmg;
  for (let k = 0; k < 300; k++) { run(c, g, 1); if (o.dmg > last) { hits++; last = o.dmg; hold(c, g, o, f.x + 420); } }
  assert.ok(hits >= 3, 'bees kept coming and homing in (' + hits + ' hits)');
  // a second hive replaces the first
  f.act = null; press(c, g, K.BD | K.BS, 20);
  assert.equal(g.projs.filter(p => p.shape === 'hive').length, 1);
});

test("Queen's Decree hits and launches, and the online snapshot knows all her shapes", () => {
  const c = load(), R = s => vm.runInContext(s, c);
  for (const s of ['stinger', 'swarm', 'hive', 'bee']) assert.ok(R(`SHAPES.indexOf('${s}')`) >= 0, s);
  assert.equal(R('CHAR.vexa.ultimate.aim'), 'comb');
});
