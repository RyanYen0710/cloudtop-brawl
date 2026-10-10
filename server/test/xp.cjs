'use strict';
// Run after building: node --test server/test/xp.cjs
// XP and levels (the Sky Road): only the server gives XP, you never drop a level, and admins can set levels.
const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const crypto = require('node:crypto');
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...keys.publicKey.export({ format: 'jwk' }), kid: 'test-key' };
const email = id => id + '@example.invalid';
function token(id, extra = {}) {
  const now = Math.floor(Date.now() / 1000);
  const head = Buffer.from(JSON.stringify({ alg: 'RS256', kid: jwk.kid })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ aud: 'test-project', iss: 'https://securetoken.google.com/test-project',
    sub: id, name: id, email: email(id), email_verified: true, iat: now, auth_time: now, exp: now + 600,
    firebase: { sign_in_provider: 'google.com' }, ...extra })).toString('base64url');
  return head + '.' + body + '.' + crypto.sign('RSA-SHA256', Buffer.from(head + '.' + body), keys.privateKey).toString('base64url');
}
class Storage {
  constructor() { this.rows = new Map(); this.queue = Promise.resolve(); }
  async get(key) { return structuredClone(this.rows.get(key)); }
  async put(key, value) { this.rows.set(key, structuredClone(value)); }
  async delete(key) { return this.rows.delete(key); }
  async list({ prefix = '', limit = Infinity, startAfter = '' } = {}) {
    return new Map([...this.rows].filter(([key]) => key.startsWith(prefix) && key > startAfter)
      .sort(([a], [b]) => a.localeCompare(b)).slice(0, limit).map(([key, value]) => [key, structuredClone(value)]));
  }
  transaction(fn) { const result = this.queue.then(() => fn(this)); this.queue = result.catch(() => {}); return result; }
}
function setup() {
  const objects = new Map();
  const context = vm.createContext({ Request, Response, Headers, URL, TextEncoder, TextDecoder, atob,
    crypto: { subtle: crypto.webcrypto.subtle, randomUUID: crypto.randomUUID },
    fetch: async url => { assert.equal(url, 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'); return new Response(JSON.stringify({ keys: [jwk] })); }
  });
  const source = readFileSync(join(__dirname, '../src/worker.js'), 'utf8')
    .replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = ');
  vm.runInContext(source, context);
  const { worker, Accounts, isTester } = vm.runInContext('({ worker, Accounts, isTester })', context);
  const env = { FIREBASE_PROJECT_ID: 'test-project', ALLOWED_ORIGINS: 'https://game.example.invalid',
    TESTER_EMAILS: email('admin1'), OWNER_EMAILS: email('owner1'),
    ACCOUNTS: { idFromName: name => name, get: name => {
      if (!objects.has(name)) { const storage = new Storage(); objects.set(name, { storage, instance: new Accounts({ storage }) }); }
      return { fetch: (url, opts) => objects.get(name).instance.fetch(new Request(url, opts)) };
    } }
  };
  const call = async (id, path, data, extra = {}, origin = 'https://game.example.invalid') => {
    const r = await worker.fetch(new Request('https://worker.example.invalid' + path, {
      method: data === undefined ? 'GET' : 'POST', headers: { origin, authorization: 'Bearer ' + token(id, extra), 'content-type': 'application/json' },
      ...(data === undefined ? {} : { body: JSON.stringify(data) })
    }), env);
    return { status: r.status, data: await r.json() };
  };
  return { env, objects, call, isTester, worker };
}

const xpOf = async (f, id) => (await f.call(id, '/api/me')).data.xp || 0;
const setXp = (f, id, xp) => { const st = f.objects.get('u:' + id).storage, p = st.rows.get('profile'); p.xp = xp; st.rows.set('profile', p); };

test('the level math: 100 XP for level 2, +100 more each level, 2,000 a level from 20 on, max 300', () => {
  const ctx = vm.createContext({});
  vm.runInContext(readFileSync(join(__dirname, '../src/worker.js'), 'utf8').replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = '), ctx);
  const { xpTotal, xpLevel, XP_CAP } = vm.runInContext('({ xpTotal, xpLevel, XP_CAP })', ctx);
  assert.deepEqual([xpTotal(1), xpTotal(2), xpTotal(3), xpTotal(5), xpTotal(20), xpTotal(21), XP_CAP], [0, 100, 300, 1000, 19000, 21000, 579000]);
  for (let lv = 1; lv <= 300; lv++) { assert.equal(xpLevel(xpTotal(lv)).level, lv); if (lv > 1) assert.equal(xpLevel(xpTotal(lv) - 1).level, lv - 1); }
  assert.equal(xpLevel(1e9).level, 300); assert.equal(xpLevel(150).cur, 50); assert.equal(xpLevel(150).need, 200);
});

test('Vs CPU: XP grows with the CPU level; losing to a level 8-10 CPU costs XP, but never a level', async () => {
  const f = setup(); await f.call('player1', '/api/me');
  let r = await f.call('player1', '/api/cpu-result', { win: true, kos: 3, falls: 1, lvl: 10 });
  assert.equal(r.status, 200); assert.equal(r.data.xp, 40);
  r = await f.call('player1', '/api/cpu-result', { win: false, kos: 0, falls: 3, lvl: 3 });
  assert.equal(r.data.xp, 43);
  r = await f.call('player1', '/api/cpu-result', { win: false, kos: 0, falls: 3, lvl: 10 });
  assert.equal(r.data.xp, 28, 'lost 15');
  setXp(f, 'player1', 1005);   // level 5 (1,000 XP) plus 5
  r = await f.call('player1', '/api/cpu-result', { win: false, kos: 0, falls: 3, lvl: 10 });
  assert.equal(r.data.xp, 1000, 'stops at the start of level 5');
  assert.equal((await f.call('player1', '/api/cpu-result', { win: true, kos: 0, falls: 0, lvl: 11 })).status, 400);
  const h = (await f.call('player1', '/api/xp')).data;
  assert.equal(h.xp, 1000); assert.ok(h.log.length >= 3); assert.equal(h.log[0].why, 'Vs CPU level 10');
});

test('time online gives +1 XP a minute (from the "still here" ping)', async () => {
  const f = setup(); await f.call('player1', '/api/me');
  const rows = f.objects.get('u:__admin').storage.rows, rec = rows.get('player:player1');
  rec.seen = Date.now() - 120000; rows.set('player:player1', rec);
  const r = await f.call('player1', '/api/ping', {});
  assert.equal(r.data.xp, 2);
  assert.equal((await f.call('player1', '/api/xp')).data.log[0].why, 'Time online');
});

test('admins and the owner can set a level; admins can\'t change the owner; players can\'t at all', async () => {
  const f = setup(); for (const id of ['owner1', 'admin1', 'player1']) await f.call(id, '/api/me');
  assert.equal((await f.call('player1', '/api/admin/level', { uid: 'player1', level: 50 })).status, 403);
  let r = await f.call('admin1', '/api/admin/level', { uid: 'player1', level: 12 });
  assert.equal(r.status, 200); assert.equal(r.data.profile.xp, 50 * 12 * 11);
  assert.equal(await xpOf(f, 'player1'), 6600);
  assert.equal((await f.call('admin1', '/api/admin/level', { uid: 'player1', level: 301 })).status, 400);
  assert.equal((await f.call('admin1', '/api/admin/level', { uid: 'owner1', level: 1 })).status, 409, 'not the owner');
  assert.equal((await f.call('owner1', '/api/admin/level', { uid: 'owner1', level: 300 })).status, 200);
  assert.equal(await xpOf(f, 'owner1'), 579000);
  const hist = (await f.call('owner1', '/api/admin/account?uid=player1')).data.history[0];
  assert.match(hist.reason, /Level 1 → 12/); assert.equal(hist.actor.uid, 'admin1');
});

/* a game room whose account calls are recorded (no real storage) */
function roomSetup() {
  let now = 1000; const calls = [];
  const context = vm.createContext({ Date: class extends Date { static now() { return now; } }, setInterval: () => 1, clearInterval: () => {},
    env: { ACCOUNTS: { idFromName: n => n, get: name => ({ fetch: async (url, o) => {
      calls.push({ store: name, op: url.split('/').pop(), ...JSON.parse(o.body) });
      return { json: async () => url.endsWith('/hit') ? { ok: true } : { name: 'Tester', beaten: 0, unlocked: [] } };
    } }) } } });
  vm.runInContext(readFileSync(join(__dirname, '../src/worker.js'), 'utf8').replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = '), context);
  const { Room } = vm.runInContext('({ Room })', context);
  const room = new Room({}, context.env);
  const client = (id, uid, pname) => { const c = { id, uid, pname, tester: true, authUntil: now + 3600000, pres: { ib: 0, ic: Array(10).fill(0) }, ws: { send: () => {} }, win: now, n: 0, ip: 't' }; room.clients.set(id, c); return c; };
  const end = async winTid => { room.g.over = true; room.g.overT = 200; room.g.winTid = winTid; room.g.frame = 5400; room.g.fighters.forEach(x => { x.ctrl = { type: 'none' }; }); now += 17; room.tick(); await new Promise(r => setTimeout(r, 0)); };
  return { room, client, calls, end };
}
test('online matches and Boss Fights give XP on the server (win more than lose)', async () => {
  const f = roomSetup();
  const host = f.client('h1', 'uid-1', 'Ryan'); f.client('g1', 'uid-2', 'Jams');
  f.room.start({ stage: 0, stocks: 3, time: 5, slots: [{ type: 'remote', peer: 'h1', char: 'titan', name: 'Ryan' }, { type: 'remote', peer: 'g1', char: 'zephyr', name: 'Jams' }] }, 3, host);
  const ryan = f.room.g.fighters.find(x => x.ctrl.peer === 'h1'); ryan.kos = 3;
  await f.end(ryan.tid);
  const xp = Object.fromEntries(f.calls.filter(c => c.op === 'xp-add').map(c => [c.store, c.amount]));
  assert.deepEqual(xp, { 'u:uid-1': 28, 'u:uid-2': 10 });
  const b = roomSetup(); b.room.boss = true;
  const p = b.client('p1', 'uid-9', 'Ryan');
  await b.room.startBoss(p, { level: 1, char: 'tseng' });
  await b.end(0);
  const bx = b.calls.find(c => c.op === 'xp-add');
  assert.equal(bx.store, 'u:uid-9'); assert.equal(bx.amount, 31); assert.match(bx.why, /Boss Fight level 1 win/);
});
