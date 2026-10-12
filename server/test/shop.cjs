'use strict';
// Run after building: node --test server/test/shop.cjs
// Coins and the shop: Sky Road coin stops (paid once, also to players who were already past them), 20 coins for a win
// and 5 for any other match, and buying fighters and shop skins (the server checks the price and the coins).
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const SRC = readFileSync(join(__dirname, '../src/worker.js'), 'utf8').replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = ');
function load() {
  const context = vm.createContext({ console, Intl, setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {},
    crypto: { randomUUID: require('node:crypto').randomUUID }, Request, Response, Headers, URL, TextEncoder, TextDecoder });
  vm.runInContext(SRC, context);
  return context;
}
class Storage {
  constructor() { this.rows = new Map(); this.queue = Promise.resolve(); }
  async get(k) { return structuredClone(this.rows.get(k)); } async put(k, v) { this.rows.set(k, structuredClone(v)); } async delete(k) { return this.rows.delete(k); }
  async list({ prefix = '', limit = Infinity } = {}) { return new Map([...this.rows].filter(([k]) => k.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b)).slice(0, limit)); }
  transaction(fn) { const r = this.queue.then(() => fn(this)); this.queue = r.catch(() => {}); return r; }
}
function account(c, storage) {
  const A = vm.runInContext('Accounts', c), acc = new A({ storage: storage || new Storage() });
  const op = async (o, d) => { const r = await acc.fetch(new c.Request('https://acct/' + o, { method: 'POST', body: JSON.stringify(d || {}) })); return { status: r.status, body: JSON.parse(JSON.stringify(await r.json())) }; };
  return op;
}

test('Sky Road coin stops: every 2 levels to 30 (500 down to 150), then every 3 levels (140 down to 50)', () => {
  const c = load(), stop = vm.runInContext('coinStop', c), sum = vm.runInContext('coinsForLevels', c);
  assert.equal(stop(1), 0); assert.equal(stop(2), 500); assert.equal(stop(3), 0); assert.equal(stop(4), 475); assert.equal(stop(30), 150);
  assert.equal(stop(31), 0); assert.equal(stop(32), 0); assert.equal(stop(33), 140); assert.equal(stop(36), 135); assert.equal(stop(300), 50);
  for (let lv = 34; lv <= 300; lv++) assert.ok(stop(lv) === 0 || (stop(lv) >= 50 && stop(lv) <= 140), String(lv));
  assert.equal(sum(1, 30), 4875);
  assert.equal(sum(1, 4), 975);
});

test('coins come from the Sky Road and from matches, only once each', async () => {
  const c = load(), op = account(c), total = vm.runInContext('xpTotal', c);
  await op('get', { name: 'amy' });
  let r = await op('xp-add', { amount: total(4), why: 'test' });
  assert.equal(r.body.coins, 975, 'levels 2 and 4');
  r = await op('xp-add', { amount: 5, why: 'Time online' });
  assert.equal(r.body.coins, 975, 'no match, no new stop');
  r = await op('xp-add', { amount: 25, match: true, won: true, why: 'Online match win' });
  assert.equal(r.body.coins, 995, 'a win gives 20');
  r = await op('xp-add', { amount: 10, match: true, won: false, why: 'Online match' });
  assert.equal(r.body.coins, 1000, 'a loss gives 5');
  r = await op('xp-add', { amount: -20, match: true, won: false, why: 'Ranked loss' });
  assert.equal(r.body.coins, 1005, 'even a match that costs XP gives 5 coins');
  // Vs CPU results less than 45 seconds apart give nothing (not even coins)
  await op('xp-add', { amount: 20, cpu: true, match: true, won: true, why: 'Vs CPU level 5 win' });
  r = await op('xp-add', { amount: 20, cpu: true, match: true, won: true, why: 'Vs CPU level 5 win' });
  assert.equal(r.body.tooSoon, true);
  const x = await op('xp-get', {});
  assert.equal(x.body.coins, 1025);
  // Vs CPU coins stop at 200 a day (the browser reports those results)
  const st2 = new Storage(), op2 = account(c, st2);
  await op2('get', { name: 'cpu' });
  for (let i = 0; i < 12; i++) { const pr = await st2.get('profile'); pr.cpuAt = 0; await st2.put('profile', pr); await op2('xp-add', { amount: 20, cpu: true, match: true, won: true, why: 'Vs CPU level 5 win' }); }
  assert.equal((await op2('xp-get', {})).body.coins, 200 + 500, '200 from Vs CPU wins, plus the level 2 coin stop');
  // an admin setting the level higher pays the stops in between, and setting it lower never takes coins back
  await op('xp-set', { level: 10, byOwner: true, actor: { name: 'owner' } });
  assert.equal((await op('xp-get', {})).body.coins, 1025 + 450 + 425 + 400);
  await op('xp-set', { level: 2, byOwner: true, actor: { name: 'owner' } });
  await op('xp-set', { level: 10, byOwner: true, actor: { name: 'owner' } });
  assert.equal((await op('xp-get', {})).body.coins, 1025 + 450 + 425 + 400, 'stops are only paid once');
});

test('players who were already high level get the coin stops they passed', async () => {
  const c = load(), st = new Storage(), total = vm.runInContext('xpTotal', c);
  await st.put('profile', { name: 'old', beaten: 0, unlocked: [], wins: 0, created: 1, xp: total(31) });
  const op = account(c, st);
  const p = (await op('get', {})).body;
  assert.equal(p.coins, 4875);
  assert.equal((await op('get', {})).body.coins, 4875, 'only once');
});

test('the shop: prices from the server, enough coins, no buying twice, fighters and skins', async () => {
  const c = load(), st = new Storage();
  await st.put('profile', { name: 'bo', beaten: 0, unlocked: [], wins: 0, created: 1, xp: 0, coins: 10500, coinLv: 1 });
  const op = account(c, st);
  let r = await op('buy', { item: 'char:chuang' });
  assert.equal(r.status, 409); assert.equal(r.body.error, 'coins');
  r = await op('buy', { item: 'char:sprocket' });
  assert.equal(r.status, 200); assert.equal(r.body.coins, 2500); assert.ok(r.body.unlocked.includes('sprocket'));
  r = await op('buy', { item: 'char:sprocket' });
  assert.equal(r.body.error, 'owned');
  r = await op('buy', { item: 'char:titan' });
  assert.equal(r.status, 400, 'free fighters are not for sale');
  r = await op('buy', { item: 'skin:gold' });
  assert.equal(r.status, 400, 'Sky Road skins are not for sale');
  r = await op('buy', { item: 'skin:lava' });
  assert.equal(r.body.error, 'coins');
  r = await op('buy', { item: 'skin:bubblegum' });
  assert.equal(r.status, 200); assert.deepEqual(r.body.shopSkins, ['bubblegum']); assert.equal(r.body.coins, 1000);
  const p = (await op('get', {})).body;
  assert.equal(p.coins, 1000); assert.ok(p.unlocked.includes('sprocket'));
  // the skin checks: only players who bought a shop skin can wear it
  const ok = vm.runInContext('(p, id) => cleanSkin(skinProf(p, false), id, null)', c);
  assert.equal(ok(p, 'bubblegum'), 'bubblegum');
  assert.equal(ok({ xp: 0 }, 'bubblegum'), '');
  assert.equal(ok({ xp: 0, shopSkins: ['lava'] }, 'bubblegum'), '');
  // everything in the shop has a price, every shop skin has a picture setup, and Legend Yen costs the most
  const items = JSON.parse(vm.runInContext('JSON.stringify(Object.keys(SHOP_CHARS).map(id => shopItem("char:" + id)).concat(SKIN_IDS.filter(id => SKINS[id].shop).map(id => shopItem("skin:" + id))))', c));
  assert.equal(items.length, 11); assert.ok(items.every(x => x && x.price > 0));
  const chars = items.filter(x => x.kind === 'char');
  assert.equal(chars.reduce((a, b) => (b.price > a.price ? b : a)).id, 'yen');
});
