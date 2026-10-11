'use strict';
// Run after building: node --test server/test/event-mode.cjs
// Event mode: 3 buffed fighters per event (stronger only in event matches, never past Legend Yen), the event
// leaderboard (wins, at most one a minute), prizes for the top 10 when the event ends (once), and the Ranked leaderboard.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const SRC = readFileSync(join(__dirname, '../src/worker.js'), 'utf8').replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = ');
const at = s => new Date(s + 'T20:00:00Z').getTime();   // noon in Vancouver
function load(now, extra) {
  const D = class extends Date { constructor(...a) { super(...(a.length ? a : [D.t])); } static now() { return D.t; } };
  D.t = now || at('2026-10-20');
  const context = vm.createContext(Object.assign({ console, Intl, Date: D, setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {},
    crypto: { randomUUID: require('node:crypto').randomUUID }, Request, Response, Headers, URL, TextEncoder, TextDecoder }, extra || {}));
  vm.runInContext(SRC, context);
  context.__D = D;
  return context;
}
class Storage {
  constructor() { this.rows = new Map(); this.queue = Promise.resolve(); }
  async get(k) { return structuredClone(this.rows.get(k)); } async put(k, v) { this.rows.set(k, structuredClone(v)); } async delete(k) { return this.rows.delete(k); }
  async list({ prefix = '', limit = Infinity } = {}) { return new Map([...this.rows].filter(([k]) => k.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b)).slice(0, limit)); }
  transaction(fn) { const r = this.queue.then(() => fn(this)); this.queue = r.catch(() => {}); return r; }
}
/* every account / board as its own Accounts object, like Durable Objects (the server names them 'u:' + uid) */
function accounts(c) {
  const A = vm.runInContext('Accounts', c), objs = new Map();
  const get = name => { if (!objs.has(name)) objs.set(name, new A({ storage: new Storage() })); const o = objs.get(name); return { fetch: (url, init) => o.fetch(new c.Request(url, init)) }; };
  const env = { ACCOUNTS: { idFromName: n => n, get } };
  const op = async (name, o, d) => JSON.parse(JSON.stringify(await (await get('u:' + name).fetch('https://acct/' + o, { method: 'POST', body: JSON.stringify(d || {}) })).json()));
  return { env, op };
}
const J = (c, code) => JSON.parse(vm.runInContext('JSON.stringify(' + code + ')', c));

test('every event has 3 buffed fighters (normal, unlocked fighters), different each event', () => {
  const c = load(), buffs = J(c, 'EVENT_BUFFS'), events = J(c, 'Object.keys(EVENTS)');
  assert.deepEqual(Object.keys(buffs).sort(), events.slice().sort());
  for (const ev of events) {
    assert.equal(buffs[ev].length, 3, ev);
    for (const id of buffs[ev]) assert.ok(J(c, '!!CHAR["' + id + '"] && !CHAR["' + id + '"].legend && !CHAR["' + id + '"].locked'), ev + ': ' + id);
  }
  assert.ok(new Set(events.map(e => buffs[e].join())).size === events.length);
});

test('buffs only in event matches, only for that event\'s 3 fighters, and never past Legend Yen', () => {
  const c = load();
  const mk = vm.runInContext('(ev, a, b) => { const g = makeGame({ stage: 0, stocks: 3, time: 3, teams: false, evMode: ev, slots: [{ type: "cpu", char: a, lvl: 5, team: 0, ctrl: { type: "cpu" } }, { type: "cpu", char: b, lvl: 5, team: 1, ctrl: { type: "cpu" } }] }); return g.fighters.map(f => ({ id: f.c.id, evb: !!f.evb, ph: f.ph })); }', c);
  const base = J(c, 'Object.fromEntries(ROSTER.map(r => [r.id, physFor(r)]))'), Y = base.yen;
  let g = JSON.parse(JSON.stringify(mk('halloween', 'nyx', 'titan')));
  assert.equal(g[0].evb, true); assert.equal(g[1].evb, false);
  assert.ok(g[0].ph.pm > base.nyx.pm && g[0].ph.run > base.nyx.run && g[0].ph.wf < base.nyx.wf, 'Nyx is stronger, faster and harder to launch');
  assert.deepEqual(g[1].ph, base.titan, 'Titan is not buffed during Halloween');
  g = JSON.parse(JSON.stringify(mk(undefined, 'nyx', 'echo')));
  assert.ok(!g[0].evb && !g[1].evb, 'no event rules, no buffs');
  // every buffed fighter: no stat goes past Legend Yen's (unless it already was)
  const buffs = J(c, 'EVENT_BUFFS');
  for (const ev in buffs) for (const id of buffs[ev]) {
    const f = JSON.parse(JSON.stringify(mk(ev, id, 'yen')))[0], b = base[id];
    assert.ok(f.evb, ev + ' ' + id);
    assert.ok(f.ph.pm <= Math.max(b.pm, Y.pm) + 1e-9 && f.ph.run <= Math.max(b.run, Y.run) + 1e-9 && f.ph.air <= Math.max(b.air, Y.air) + 1e-9, ev + ' ' + id + ' power/speed');
    assert.ok(f.ph.wf >= Math.min(b.wf, Y.wf) - 1e-9, ev + ' ' + id + ' weight');
  }
  // a buffed fighter really hits harder
  const hit = vm.runInContext('ev => { const g = makeGame({ stage: 0, stocks: 3, time: 3, teams: false, evMode: ev, slots: [{ type: "cpu", char: "nyx", lvl: 5, team: 0, ctrl: { type: "cpu" } }, { type: "cpu", char: "titan", lvl: 5, team: 1, ctrl: { type: "cpu" } }] }); const [a, b] = g.fighters; b.inv = 0; applyHit(a, b, { dmg: 10, b: 3, g: 0.5, angle: 45 }, 1, g, false); return b.dmg; }', c);
  assert.ok(hit('halloween') > hit(undefined) * 1.1);
});

/* me (with or without event rules) vs standing dummies on the main platform */
function duel(c, ev, char, enemy, third) {
  const api = vm.runInContext('({ makeGame, stepGame, BL, BR, BU, BD, BS })', c);
  const slots = [{ type: 'you', char, team: 0, ctrl: { type: 'local' } }, { type: 'peer', char: enemy, team: 1, ctrl: { type: 'dummy', mode: 'stand' } }];
  if (third) slots.push({ type: 'peer', char: third, team: 2, ctrl: { type: 'dummy', mode: 'stand' } });
  const g = api.makeGame({ stage: 0, stocks: 3, time: 0, teams: false, endless: true, evMode: ev, slots });
  const m = g.stage.solids[0], [f, o, p] = g.fighters;
  for (const x of g.fighters) { x.y = m.y; x.ground = m; x.inv = 0; x.halo = 0; x.vx = 0; x.vy = 0; }
  f.x = m.x + m.w * 0.3; f.face = 1; o.x = f.x + 160; o.face = -1; if (p) p.x = o.x + 140;
  const tick = (b = 0, pr = 0) => api.stepGame(g, g.fighters.map(x => x === f ? { b, pr } : { b: 0, pr: 0 }));
  return { api, g, f, o, p, m, tick };
}

test('Thanksgiving: Titan, Talon and Mr. Chiu get upgraded moves, only in event matches', () => {
  const c = load(at('2026-10-11'));
  assert.equal(J(c, 'evOccurrence().id'), 'thanksgiving');
  assert.deepEqual(J(c, 'EVENT_BUFFS.thanksgiving'), ['titan', 'talon', 'chui']);
  const sp = (ev, id) => J(c, '(() => { const g = makeGame({ stage: 0, stocks: 3, time: 3, teams: false, evMode: ' + JSON.stringify(ev || null) + ', slots: [{ type: "cpu", char: "' + id + '", lvl: 5, team: 0, ctrl: { type: "cpu" } }, { type: "cpu", char: "rivet", lvl: 5, team: 1, ctrl: { type: "cpu" } }] }); const s = fSpecials(g.fighters[0]); return { n: s.neutral, d: s.down, s: s.side, base: CHAR["' + id + '"].specials }; })()');
  let t = sp('thanksgiving', 'titan');
  assert.ok(t.n.upgraded && t.n.charge < t.base.neutral.charge && t.n.quake, 'Mega Punch: faster charge and a shockwave');
  assert.ok(t.d.twice, 'Earthquake Slam twice');
  t = sp(null, 'titan'); assert.ok(!t.n.upgraded && !t.n.quake && !t.d.twice, 'no event rules: the normal moves');
  t = sp('halloween', 'titan'); assert.ok(!t.n.upgraded, 'not buffed in Halloween');
  t = sp('thanksgiving', 'chui'); assert.ok(t.n.child.twin && t.s.child.chain, 'Chiu: 2 sharks, chain shock');
  assert.equal(J(c, '!!CHAR.chui.specials.neutral.child.twin'), false, 'his normal moves are untouched');
  // every upgrade explains itself on the Event screen
  for (const id of ['titan', 'talon', 'chui']) assert.equal(J(c, 'evUpgradeNotes("' + id + '").length'), 4, id);
});

test('upgraded moves work: 2 hawks, a double slam, 2 sharks, a chain shock', () => {
  const c = load(at('2026-10-11'));
  // Talon: Hawk Call sends 2 hawks
  let s = duel(c, 'thanksgiving', 'talon', 'titan');
  s.tick(s.api.BR, s.api.BS); for (let i = 0; i < 12; i++) s.tick();
  assert.equal(s.g.projs.filter(p => p.shape === 'hawk').length, 2);
  s = duel(c, null, 'talon', 'titan');
  s.tick(s.api.BR, s.api.BS); for (let i = 0; i < 12; i++) s.tick();
  assert.equal(s.g.projs.filter(p => p.shape === 'hawk').length, 1, 'one hawk without event rules');
  // Titan: Earthquake Slam hits twice
  s = duel(c, 'thanksgiving', 'titan', 'rivet'); s.o.x = s.f.x + 120;
  const d = []; s.tick(s.api.BD, s.api.BS);
  for (let i = 0; i < 40; i++) { s.tick(); d.push(s.o.dmg); s.o.x = s.f.x + 120; s.o.y = s.m.y; s.o.vx = 0; s.o.vy = 0; s.o.ground = s.m; s.o.hitstun = 0; s.o.inv = 0; }
  const hits = d.filter((v, i) => i && v > d[i - 1]).length;
  assert.equal(hits, 2, 'two quakes');
  // Mr. Chiu: Shark Summon releases 2 sharks
  s = duel(c, 'thanksgiving', 'chui', 'rivet'); s.o.x = s.f.x + 600;
  s.tick(0, s.api.BS); let n = 0;
  for (let i = 0; i < 80 && !n; i++) { s.tick(); n = s.g.projs.filter(p => p.shape === 'shark').length; }
  assert.equal(n, 2);
  // Mr. Chiu: Volt Eel's shock jumps to a second enemy
  s = duel(c, 'thanksgiving', 'chui', 'rivet', 'zephyr'); s.p.x = s.o.x + 120;
  s.tick(s.api.BR, s.api.BS);
  for (let i = 0; i < 60 && !(s.p.dmg > 0); i++) s.tick();
  assert.ok(s.o.dmg > 0 && s.p.dmg > 0, 'both shocked');
});

test('the event leaderboard: wins only, at most one a minute, most wins first', async () => {
  const c = load(), { op } = accounts(c), D = c.__D, key = 'halloween-' + J(c, 'evOccurrence().start');
  assert.equal(J(c, 'evOccurrence().id'), 'halloween');
  let r = await op('__evboard', 'ev-win', { uid: 'a', name: 'Amy', key });
  assert.equal(r.wins, 1);
  r = await op('__evboard', 'ev-win', { uid: 'a', name: 'Amy', key });
  assert.equal(r.tooSoon, true, 'a second win in the same minute does not count');
  D.t += 61000; await op('__evboard', 'ev-win', { uid: 'a', name: 'Amy', key });
  await op('__evboard', 'ev-win', { uid: 'b', name: 'Bo', key });
  const b = await op('__evboard', 'ev-board', { key, uid: 'b' });
  assert.deepEqual(b.top.map(x => [x.name, x.wins, x.prize]), [['Amy', 2, 10000], ['Bo', 1, 6000]]);
  assert.deepEqual(b.me, { rank: 2, wins: 1 });
  assert.equal(b.players, 2);
});

test('when the event ends, the top 10 get their XP prize once (not before)', async () => {
  const c = load(at('2026-10-20')), { env, op } = accounts(c), D = c.__D, key = 'halloween-' + J(c, 'evOccurrence().start');
  for (let i = 0; i < 12; i++) {
    await op('u' + i, 'get', { name: 'p' + i });
    for (let w = 0; w <= 11 - i; w++) { D.t += 61000; await op('__evboard', 'ev-win', { uid: 'u' + i, name: 'p' + i, key }); }
  }
  const settle = vm.runInContext('settleEvents', c);
  await settle(env);   // still Halloween: nothing yet
  assert.equal((await op('u0', 'xp-get', {})).xp, 0);
  D.t = at('2026-11-05');   // Halloween is over
  await settle(env); await settle(env);
  const xp = []; for (let i = 0; i < 12; i++) xp.push((await op('u' + i, 'xp-get', {})).xp);
  assert.deepEqual(xp, [10000, 6000, 4000, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 0, 0], 'top 10 paid once');
  const log = (await op('u0', 'xp-get', {})).log;
  assert.ok(log.some(e => /Halloween event #1/.test(e.why)));
  const last = (await op('__evboard', 'ev-board', { key: '' })).last;
  assert.equal(last.name, 'Halloween'); assert.equal(last.top[0].name, 'p0'); assert.equal(last.top.length, 10);
});

test('online lobbies only get event rules during that event', () => {
  for (const [day, want] of [['2026-10-20', 'halloween'], ['2026-11-20', undefined]]) {
    const c = load(at(day)), { env } = accounts(c);
    const { Room } = vm.runInContext('({ Room })', c);
    const room = new Room({}, env), host = { id: 'h', uid: 'uh', pres: {}, ws: { send() {} } }; room.clients.set('h', host);
    room.start({ stage: 0, stocks: 3, time: 3, evMode: 'halloween', slots: [{ type: 'remote', peer: 'h', char: 'nyx' }, { type: 'cpu', char: 'titan', lvl: 7, team: 1 }] }, 1, host);
    assert.equal(room.g.cfg.evMode, want, day);
    assert.equal(room.g.fighters[0].evb, want ? true : undefined, day);
    assert.equal(room.fighterMap()[0][9], want ? 1 : 0);
    room.stop(true);
  }
});

test('the Ranked leaderboard: most rank points first, with tiers', async () => {
  const c = load(), { op } = accounts(c);
  await op('__rankboard', 'rk-set', { uid: 'a', name: 'Amy', rp: 260, w: 12, l: 3 });
  await op('__rankboard', 'rk-set', { uid: 'b', name: 'Bo', rp: 920, w: 40, l: 9 });
  await op('__rankboard', 'rk-set', { uid: 'c', name: 'Cy', rp: 40, w: 2, l: 4 });
  await op('__rankboard', 'rk-set', { uid: 'a', name: 'Amy', rp: 285, w: 13, l: 3 });   // updates, not a second row
  const r = await op('__rankboard', 'rk-list', { uid: 'a' });
  assert.deepEqual(r.top.map(x => [x.name, x.rp, x.tier]), [['Bo', 920, 'Legend'], ['Amy', 285, 'Gold'], ['Cy', 40, 'Bronze']]);
  assert.equal(r.me.rank, 2); assert.equal(r.players, 3);
  // a Ranked result keeps the board up to date (wins and losses come back from the account)
  await op('u9', 'get', { name: 'Zed' });
  const rr = await op('u9', 'ranked-add', { win: true });
  assert.equal(rr.rw, 1); assert.equal(rr.name, 'Zed');
});
