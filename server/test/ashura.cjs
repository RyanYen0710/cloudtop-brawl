'use strict';
// Run after building: node --test server/test/ashura.cjs
// ASHURA the Thousand-Armed and the Trial of Ashura (Sky Road level 300 + Boss Fight Chapter 4 to enter).
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const SRC = readFileSync(join(__dirname, '../src/worker.js'), 'utf8').replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = ');
function load(extra) {
  const context = vm.createContext(Object.assign({ console, Intl, setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {}, crypto: { randomUUID: require('node:crypto').randomUUID }, Request, Response, Headers, URL, TextEncoder, TextDecoder }, extra || {}));
  vm.runInContext(SRC, context);
  return context;
}
/* Ashura vs a standing dummy on the first stage, both on the main floor */
function game(c) {
  return vm.runInContext(`(() => {
    const g = makeGame({ stage: 0, stocks: 3, time: 3, teams: false, slots: [
      { type: 'you', char: 'ashura', team: 0, ctrl: { type: 'local' } }, { type: 'cpu', char: 'titan', team: 1, ctrl: { type: 'dummy', mode: 'stand' } }] });
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
const reset = (c, g, dx) => { const [f, o] = g.fighters, m = g.stage.solids[0]; for (const x of g.fighters) { x.y = m.y; x.ground = m; x.vx = x.vy = 0; x.hitstun = 0; x.zap = 0; x.act = null; } f.x = m.x + m.w * 0.3; o.x = f.x + dx; f.face = 1; o.dmg = 0; };

test('he is the second strongest (Legend Yen stays the strongest), unique, and not for sale', () => {
  const c = load(), R = s => vm.runInContext(s, c);
  const sum = id => R(`Object.values(CHAR.${id}.stats).reduce((a, b) => a + b, 0) - CHAR.${id}.stats.skill`);
  assert.ok(sum('ashura') < sum('yen'));
  for (const id of ['chuang', 'hsi', 'vexa']) assert.ok(sum(id) < sum('ashura'), id);   // above every other boss
  assert.ok(R('CHAR.ashura.legend && CHAR.ashura.locked'));
  assert.ok(!R('levelUnlocksFor(300)').includes('ashura'));
  assert.ok(!R('bossUnlocksFor(40)').includes('ashura'));
  assert.equal(R('shopItem("char:ashura")'), null);
  const all = JSON.parse(R("JSON.stringify(ROSTER.map(c => ({ id: c.id, sp: Object.values(c.specials).map(m => m.name), u: c.ultimate.style, aim: c.ultimate.aim })))"));
  const me = all.find(x => x.id === 'ashura');
  for (const o of all) if (o.id !== 'ashura') { assert.notEqual(o.u, me.u); if (o.aim) assert.notEqual(o.aim, me.aim); for (const n of me.sp) assert.ok(!o.sp.includes(n), n); }
  assert.ok(R('!!ULT_STYLES.asura'));
});

test('the trial opens only at Sky Road level 300 with all 40 Boss Fight levels beaten', () => {
  const c = load(), R = s => vm.runInContext(s, c);
  assert.equal(R('trialOpen({ xp: xpTotal(300), beaten: 40 })'), true);
  assert.equal(R('trialOpen({ xp: xpTotal(299), beaten: 40 })'), false);
  assert.equal(R('trialOpen({ xp: xpTotal(300), beaten: 39 })'), false);
  assert.equal(R('trialOpen(null)'), false);
  const cfg = R('trialConfig("titan")');
  assert.equal(cfg.slots[1].char, 'ashura'); assert.equal(cfg.slots.filter(s => s.type === 'cpu').length, 1, 'no helpers');
  assert.equal(R(`STAGES[${cfg.stage}].id`), 'temple1000');
  assert.equal(R(`stageVisible(${cfg.stage}, null)`), false);
  const g = R('makeGame(trialConfig("titan"))'); assert.equal(g.fighters[1].c.id, 'ashura'); assert.ok(g.fighters[1].boss);
});

/* the game server's Boss Fight room with a pretend account */
function room(profile, tester) {
  let now = 1000;
  const messages = [], writes = [];
  const c = load({
    Date: class extends Date { static now() { return now; } },
    env: { ACCOUNTS: { idFromName: n => n, get: () => ({ fetch: async url => {
      if (!url.endsWith('/hit') && !url.endsWith('/get')) writes.push(url.split('/').pop());
      return { json: async () => url.endsWith('/hit') ? { ok: true } : profile };
    } }) } }
  });
  const { Room } = vm.runInContext('({ Room })', c);
  const r = new Room({}, c.env);
  const player = { id: 'p', uid: 'p-uid', tester: !!tester, authUntil: now + 3600000, pres: { ib: 0, ic: Array(10).fill(0) }, ws: { send: raw => messages.push(JSON.parse(raw)) }, win: now, n: 0, ip: 't' };
  r.clients.set('p', player); r.boss = true;
  const finish = async win => { r.g.over = true; r.g.overT = 200; r.g.winTid = win ? 0 : 1; r.g.fighters.forEach(x => { x.ctrl = { type: 'none' }; }); now += 17; r.tick(); await new Promise(res => setTimeout(res, 0)); };
  return { c, r, player, messages, writes, finish };
}

test('the server refuses the trial until both requirements are met, and a win unlocks Ashura', async () => {
  const c0 = load(), XP = n => vm.runInContext(`xpTotal(${n})`, c0);
  let f = room({ name: 'P', beaten: 40, xp: XP(299), unlocked: [] });
  await f.r.startBoss(f.player, { trial: 1, char: 'titan' });
  assert.equal(f.r.g, null); assert.equal(f.messages.at(-1).err, 'locked');
  f = room({ name: 'P', beaten: 30, xp: XP(300), unlocked: [] });
  await f.r.startBoss(f.player, { trial: 1, char: 'titan' });
  assert.equal(f.r.g, null); assert.equal(f.messages.at(-1).err, 'locked');
  // both met: the fight starts against Ashura, and a win asks the account to unlock him
  f = room({ name: 'P', beaten: 40, xp: XP(300), unlocked: [] });
  await f.r.startBoss(f.player, { trial: 1, char: 'titan' });
  assert.ok(f.r.g); assert.equal(f.r.g.fighters[1].c.id, 'ashura'); assert.equal(f.r.bossRun.trial, true);
  assert.equal(f.messages.find(m => m.d && m.d.boss).d.boss.trial, 1);
  await f.finish(true);
  assert.ok(f.writes.includes('trial')); assert.ok(!f.writes.includes('beat'));
  assert.equal(f.messages.map(m => m.d && m.d.bossRes).filter(Boolean).at(-1).trial, 1);
  // a loss saves nothing about the trial
  f = room({ name: 'P', beaten: 40, xp: XP(300), unlocked: [] });
  await f.r.startBoss(f.player, { trial: 1, char: 'titan' });
  await f.finish(false);
  assert.ok(!f.writes.includes('trial'));
  // testers can run it any time, and it is never saved
  f = room({ name: 'P', beaten: 0, xp: 0, unlocked: [] }, true);
  await f.r.startBoss(f.player, { trial: 1, char: 'ashura', test: 1 });
  assert.ok(f.r.g); await f.finish(true);
  assert.ok(!f.writes.includes('trial'));
});

test('the account only adds Ashura when the trial is really open', async () => {
  const c = load(), { Accounts } = vm.runInContext('({ Accounts })', c);
  class Storage {
    constructor() { this.rows = new Map(); }
    async get(k) { return structuredClone(this.rows.get(k)); } async put(k, v) { this.rows.set(k, structuredClone(v)); }
    async delete(k) { return this.rows.delete(k); } async list() { return new Map(); }
    transaction(fn) { return fn(this); }
  }
  const acct = async (profile, op) => { const s = new Storage(); await s.put('profile', profile); const a = new Accounts({ storage: s });
    const r = await a.fetch(new Request('https://acct/' + op, { method: 'POST', body: '{}' })); return r.json(); };
  const XP = n => vm.runInContext(`xpTotal(${n})`, c);
  assert.ok(!(await acct({ name: 'P', beaten: 39, xp: XP(300), unlocked: [] }, 'trial')).unlocked.includes('ashura'));
  assert.ok(!(await acct({ name: 'P', beaten: 40, xp: XP(250), unlocked: [] }, 'trial')).unlocked.includes('ashura'));
  const ok = await acct({ name: 'P', beaten: 40, xp: XP(300), unlocked: ['yen'] }, 'trial');
  assert.ok(ok.unlocked.includes('ashura')); assert.equal(ok.trialWins, 1);
});

test('Arsenal Wheel goes through all six weapons in order; the chakram loops', () => {
  const c = load(), K = B(c), g = game(c), [f, o] = g.fighters;
  const seen = [];
  for (let k = 0; k < 7; k++) {
    reset(c, g, k === 3 ? 400 : 70);
    press(c, g, K.BS, 1);
    seen.push(f.act && f.act.m.w);
    run(c, g, 50);
  }
  assert.deepEqual(seen, ['blade', 'spear', 'mace', 'chakram', 'trident', 'vajra', 'blade']);
  // the chakram makes a loop: at some point it flies backward, then forward again
  reset(c, g, 900); f.wheelI = 3; press(c, g, K.BS, 0);
  const xs = []; for (let k = 0; k < 60; k++) { run(c, g, 1); const p = g.projs.find(q => q.shape === 'chakram'); if (p) xs.push(p.vx); }
  assert.ok(xs.some(v => v < 0) && xs.at(-1) > 0, 'looped');
  // each weapon hits
  for (let i = 0; i < 6; i++) {
    const g2 = game(c), [f2, o2] = g2.fighters; o2.x = f2.x + (i === 3 ? 200 : i === 1 ? 110 : 60); f2.wheelI = i;
    press(c, g2, K.BS, 0); let n = 0; while (!(o2.dmg > 0) && n++ < 80) run(c, g2, 1);
    assert.ok(o2.dmg > 0, 'weapon ' + i + ' hits');
  }
});

test('Thousand-Arm Rush: the trail erupts a beat later, even after he has moved on', () => {
  const c = load(), K = B(c), g = game(c), [f, o] = g.fighters;
  reset(c, g, 600);
  press(c, g, K.BR | K.BS, 14);
  assert.ok(g.ashTrail && g.ashTrail.length >= 3, 'a trail was laid');
  const spot = g.ashTrail[0]; assert.ok(Math.abs(f.x - spot.x) > 80, 'he has already moved on'); o.x = spot.x; o.y = g.stage.solids[0].y; o.ground = g.stage.solids[0]; o.vx = o.vy = 0; o.dmg = 0;
  run(c, g, 40);
  assert.ok(o.dmg > 0, 'the trail erupted on them');
});

test('Heaven Climb: three pulls, each going the way you hold', () => {
  const c = load(), K = B(c), g = game(c), [f] = g.fighters;
  reset(c, g, 600); const y0 = f.y, x0 = f.x;
  press(c, g, K.BU | K.BS, 0);
  for (let k = 0; k < 13; k++) step(c, g, K.BU, 0);   // first pull: straight up
  const x1 = f.x;
  for (let k = 0; k < 13; k++) step(c, g, K.BR, 0);   // second pull: to the right
  assert.ok(f.y < y0 - 100, 'went up'); assert.ok(Math.abs(x1 - x0) < 30, 'first pull was straight up'); assert.ok(f.x > x1 + 60, 'second pull went right');
  run(c, g, 20); assert.ok(!f.act && f.helpless, 'three pulls, then helpless');
});

test('Karmic Grasp: the hand comes up under the enemy, lifts them and slams them', () => {
  const c = load(), K = B(c), g = game(c), [f, o] = g.fighters;
  reset(c, g, 380);
  press(c, g, K.BD | K.BS, 0);
  let i = 0; while (!g.projs.some(p => p.shape === 'graspHand') && i++ < 30) run(c, g, 1);
  const h = g.projs.find(p => p.shape === 'graspHand'); assert.ok(h, 'a hand'); assert.ok(Math.abs(h.x - o.x) < 5, 'under the enemy');
  run(c, g, 14); assert.ok(h.held, 'grabbed'); const y0 = o.y;
  run(c, g, 14); assert.ok(o.y < y0 - 60, 'lifted');
  const d0 = o.dmg; run(c, g, 20); assert.ok(o.dmg > d0 + 8, 'slammed');
  // nobody near the hand: it closes on nothing
  reset(c, g, 380); g.projs.length = 0; press(c, g, K.BD | K.BS, 15);
  o.x += 300; run(c, g, 20); assert.ok(!g.projs.some(p => p.held));
});
