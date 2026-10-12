'use strict';
// Run after building: node --test server/test/skins.cjs
// Skins: Sky Road skins unlock by level, event skins are free during their event and kept after 3 matches,
// and the game server only lets players wear skins they've unlocked.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const SRC = readFileSync(join(__dirname, '../src/worker.js'), 'utf8').replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = ');
const at = s => new Date(s + 'T20:00:00Z').getTime();
function load(now, extra) {
  const D = class extends Date { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
  const context = vm.createContext(Object.assign({ console, Intl, Date: D, setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {},
    crypto: { randomUUID: require('node:crypto').randomUUID }, Request, Response, Headers, URL, TextEncoder, TextDecoder }, extra || {}));
  vm.runInContext(SRC, context);
  return context;
}
class Storage {
  constructor() { this.rows = new Map(); this.queue = Promise.resolve(); }
  async get(k) { return structuredClone(this.rows.get(k)); } async put(k, v) { this.rows.set(k, structuredClone(v)); } async delete(k) { return this.rows.delete(k); }
  async list({ prefix = '', limit = Infinity } = {}) { return new Map([...this.rows].filter(([k]) => k.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b)).slice(0, limit)); }
  transaction(fn) { const r = this.queue.then(() => fn(this)); this.queue = r.catch(() => {}); return r; }
}

test('who can wear which skin: by level, during the event, kept event skins, the owner', () => {
  const c = load(at('2026-10-20')), ok = vm.runInContext('skinAllowed', c);
  assert.equal(ok({ level: 9 }, 'gold', null), false); assert.equal(ok({ level: 10 }, 'gold', null), true);
  assert.equal(ok({ level: 300 }, 'mythic', null), true); assert.equal(ok({ level: 274 }, 'mythic', null), false);
  assert.equal(ok({ level: 1 }, 'creepy', 'halloween'), true, 'free during Halloween');
  assert.equal(ok({ level: 1 }, 'creepy', null), false, 'not after it');
  assert.equal(ok({ level: 1, ev: ['halloween'] }, 'creepy', null), true, 'kept after 3 matches');
  assert.equal(ok({ level: 1 }, 'frosty', 'halloween'), false);
  assert.equal(ok({ level: 1, owner: true }, 'mythic', null), true);
  assert.equal(ok({ level: 300 }, 'nope', null), false);
  assert.equal(ok({ level: 1, gift: ['mythic'] }, 'mythic', null), true, 'given by an admin');
  assert.equal(ok({ level: 1, gift: ['mythic'] }, 'gold', null), false);
  const prof = vm.runInContext('skinProf', c);
  assert.equal(ok(prof({ xp: 0, giftSkins: ['diamond'] }, false), 'diamond', null), true, 'the game server reads given skins from the account');
  // every event has a skin, every Sky Road skin has a level
  const ids = JSON.parse(vm.runInContext('JSON.stringify(SKIN_IDS.map(id => [id, SKINS[id].level || 0, SKINS[id].event || ""]))', c));
  const evs = ids.filter(x => x[2]).map(x => x[2]).sort();
  assert.deepEqual(evs, ['christmas', 'cny', 'halloween', 'spring', 'summer', 'thanksgiving']);
  assert.ok(ids.filter(x => x[1]).length >= 10);
});

test('3 matches during an event keep its skin forever (time online does not count)', async () => {
  const c = load(at('2026-10-20'));
  const A = vm.runInContext('Accounts', c), st = new Storage(), acc = new A({ storage: st });
  const op = (o, d) => acc.fetch(new c.Request('https://acct/' + o, { method: 'POST', body: JSON.stringify(d) })).then(r => r.json());
  await op('get', { name: 'amy' });
  await op('xp-add', { amount: 5, why: 'Time online' });
  await op('xp-add', { amount: 10, match: true, why: 'Online match' });
  await op('xp-add', { amount: -20, match: true, why: 'Ranked loss' });   // even a loss counts as a match played
  let p = await op('get', {});
  assert.deepEqual(JSON.parse(JSON.stringify(p.evPlays)), { halloween2026: 2 }); assert.ok(!p.evSkins);
  await op('xp-add', { amount: 75, match: true, why: 'Ranked win' });
  p = await op('get', {});
  assert.deepEqual(JSON.parse(JSON.stringify(p.evSkins)), ['halloween']);
  const x = await op('xp-get', {});
  assert.deepEqual(JSON.parse(JSON.stringify(x.evSkins)), ['halloween']);
  // outside any event nothing is counted
  const c2 = load(at('2026-11-20')), A2 = vm.runInContext('Accounts', c2), acc2 = new A2({ storage: new Storage() });
  const op2 = (o, d) => acc2.fetch(new c2.Request('https://acct/' + o, { method: 'POST', body: JSON.stringify(d) })).then(r => r.json());
  await op2('get', { name: 'bob' }); await op2('xp-add', { amount: 10, match: true, why: 'Online match' });
  assert.ok(!(await op2('get', {})).evPlays);
});

test('the game server only lets players wear skins they have unlocked', async () => {
  const c = load(at('2026-11-20'), { env: { ACCOUNTS: { idFromName: n => n, get: () => ({ fetch: async url => ({ json: async () => url.endsWith('/hit') ? { ok: true } : { name: 'P', xp: 19000, beaten: 30, unlocked: [] } }) }) } } });
  const { Room } = vm.runInContext('({ Room })', c);
  // an online lobby: one player is level 20 (Shadow ok, Neon not), the other level 1
  const room = new Room({}, c.env), sent = [];
  const mk = (id, prof) => { const cl = { id, uid: 'u' + id, pres: {}, ws: { send: m => sent.push(m) }, skinProf: prof }; room.clients.set(id, cl); return cl; };
  const a = mk('pa', { level: 20, ev: [] }), b = mk('pb', { level: 1, ev: ['halloween'] });
  room.start({ stage: 0, stocks: 3, time: 3, slots: [{ type: 'remote', peer: 'pa', char: 'titan', skin: 'shadow' }, { type: 'remote', peer: 'pb', char: 'zephyr', skin: 'neon' }, { type: 'remote', peer: 'pa', char: 'nova', skin: 'neon' }] }, 1, a);
  const skins = room.g.fighters.map(f => f.skin);
  assert.deepEqual(JSON.parse(JSON.stringify(skins)), ['shadow', '', '']);
  room.stop(true);
  room.start({ stage: 0, stocks: 3, time: 3, slots: [{ type: 'remote', peer: 'pb', char: 'zephyr', skin: 'creepy' }, { type: 'remote', peer: 'pa', char: 'titan', skin: 'creepy' }] }, 2, a);
  assert.deepEqual(JSON.parse(JSON.stringify(room.g.fighters.map(f => f.skin))), ['creepy', ''], 'only the one who kept the Halloween skin');
  room.stop(true);
  // Boss Fight: the skin from the profile's level (19,000 XP = level 20) and it goes out in the fighter list
  const boss = new Room({}, c.env); boss.boss = true; boss.mode = 'boss';
  const p = { id: 'pz', uid: 'uz', ip: 't', pres: {}, ws: { send: m => sent.push(m) } }; boss.clients.set('pz', p);
  await boss.startBoss(p, { level: 1, char: 'titan', skin: 'shadow' });
  const fm = boss.srv.boss.fm.find(x => x[0] === 0);
  assert.equal(fm[8], 'shadow');
  boss.stop(true); boss.g = null;
  await boss.startBoss(p, { level: 1, char: 'titan', skin: 'galaxy' });
  assert.equal(boss.srv.boss.fm.find(x => x[0] === 0)[8], '', 'Galaxy needs level 80');
});
