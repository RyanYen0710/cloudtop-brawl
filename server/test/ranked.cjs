'use strict';
// Run after building: node --test server/test/ranked.cjs
// Ranked: unlocks at level 5, the Online Ranked queue and match room, the CPU Ladder, rank points and tiers.
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


const setXp = (f, id, xp) => { const st = f.objects.get('u:' + id).storage, p = st.rows.get('profile'); p.xp = xp; st.rows.set('profile', p); };
const prof = (f, id) => f.objects.get('u:' + id).storage.rows.get('profile');

test('Ranked unlocks at level 5, and the queue pairs two players into the same private room', async () => {
  const f = setup(); for (const id of ['amy', 'bob', 'cat']) await f.call(id, '/api/me');
  let r = await f.call('amy', '/api/ranked');
  assert.equal(r.data.unlocked, false); assert.equal(r.data.need, 5); assert.equal(r.data.tier.name, 'Bronze'); assert.equal(r.data.ladder, 1);
  assert.equal((await f.call('amy', '/api/ranked/queue', {})).status, 403, 'level 1 cannot search');
  for (const id of ['amy', 'bob', 'cat']) setXp(f, id, 1000);   // level 5
  r = await f.call('amy', '/api/ranked/queue', {});
  assert.equal(r.status, 200); assert.equal(r.data.waiting, true);
  const b = await f.call('bob', '/api/ranked/queue', {});
  assert.ok(b.data.match && /^[a-z0-9]{16}$/.test(b.data.match.room)); assert.equal(b.data.match.opp, 'amy');
  const a = await f.call('amy', '/api/ranked/queue', {});
  assert.equal(a.data.match.room, b.data.match.room, 'both get the same room'); assert.equal(a.data.match.opp, 'bob');
  const room = f.objects.get('u:__queue').storage.rows.get('r:' + a.data.match.room);
  assert.deepEqual(JSON.parse(JSON.stringify(room.uids)).sort(), ['amy', 'bob']);
  // a third player waits; leaving the queue takes them out
  assert.equal((await f.call('cat', '/api/ranked/queue', {})).data.waiting, true);
  await f.call('cat', '/api/ranked/leave', {});
  assert.equal(f.objects.get('u:__queue').storage.rows.has('q:cat'), false);
});

test('rank points: +25 a win, -15 a loss (never below 0), tiers, and the CPU Ladder step', async () => {
  const f = setup(); await f.call('amy', '/api/me');
  const add = d => f.objects.get('u:amy').instance.fetch(new Request('https://acct/ranked-add', { method: 'POST', body: JSON.stringify(d) })).then(r => r.json());
  let r = await add({ win: false });
  assert.equal(r.rp, 0); assert.equal(r.drp, 0);
  for (let i = 0; i < 4; i++) r = await add({ win: true });
  assert.equal(r.rp, 100); assert.equal(r.tier.name, 'Silver'); assert.equal(r.tier.next, 250);
  r = await add({ win: false }); assert.equal(r.rp, 85); assert.equal(r.drp, -15); assert.equal(r.tier.name, 'Bronze');
  r = await add({ win: null }); assert.equal(r.rp, 85, 'a draw changes nothing');
  r = await add({ win: true, ladder: true }); assert.equal(r.ladder, 2);
  r = await add({ win: false, ladder: true }); assert.equal(r.ladder, 2, 'a loss keeps you on the same step');
  prof(f, 'amy').ladder = 10;
  r = await add({ win: true, ladder: true }); assert.equal(r.ladder, 10); assert.equal(r.clears, 1);
  const info = (await f.call('amy', '/api/ranked')).data;
  assert.equal(info.wins, 6); assert.equal(info.losses, 3); assert.equal(info.ladder, 10); assert.equal(info.clears, 1);
});

/* a game room whose account calls are recorded */
function roomSetup(mode, profile) {
  let now = 1000; const calls = [];
  const context = vm.createContext({ Date: class extends Date { static now() { return now; } }, setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1, clearTimeout: () => {},
    crypto: { randomUUID: crypto.randomUUID },
    env: { ACCOUNTS: { idFromName: n => n, get: name => ({ fetch: async (url, o) => {
      const op = url.split('/').pop(), d = JSON.parse(o.body);
      calls.push({ store: name, op, ...d });
      const out = op === 'hit' ? { ok: true } : op === 'mm-room' ? { uids: ['uid-1', 'uid-2'] }
        : op === 'ranked-add' ? { rp: d.win ? 25 : 0, drp: d.win ? 25 : 0, tier: { name: 'Bronze' }, ladder: 4 }
        : op === 'xp-add' ? { xp: 1000, amt: d.amount } : Object.assign({ name: 'P', xp: 1000, unlocked: [], ladder: 3 }, profile || {});
      return { json: async () => out };
    } }) } } });
  vm.runInContext(readFileSync(join(__dirname, '../src/worker.js'), 'utf8').replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = '), context);
  const { Room } = vm.runInContext('({ Room })', context);
  const room = new Room({}, context.env);
  room.mode = mode; room.code = 'abcdefgh12345678';
  const sent = [];
  const client = (id, uid) => { const c = { id, uid, pname: uid, authUntil: now + 3600000, pres: { ib: 0, ic: Array(10).fill(0) }, ws: { send: m => sent.push([id, JSON.parse(m)]) }, win: now, n: 0, ip: 't' }; room.clients.set(id, c); return c; };
  const flush = () => new Promise(r => setTimeout(r, 0));
  const msg = async (c, m) => { room.onMsg(c, JSON.stringify(m)); for (let i = 0; i < 5; i++) await flush(); };
  const tick = async ms => { now += ms; room.tick(); for (let i = 0; i < 5; i++) await flush(); };
  return { room, client, calls, sent, msg, tick, flush, srv: k => { const x = sent.filter(([, m]) => m.from === 'srv' && m.d[k]).pop(); return x && x[1].d[k]; } };
}

test('Online Ranked: both players ready -> a server-run 1v1 (3 lives, 5 minutes); the winner gets +75 XP / +25 RP, the loser -20 / -15', async () => {
  const f = roomSetup('ranked');
  const a = f.client('pa', 'uid-1'), b = f.client('pb', 'uid-2');
  await f.msg(a, { cmd: 'ranked', char: 'titan' });
  assert.equal(f.room.g, null, 'waits for the other player');
  await f.msg(b, { cmd: 'ranked', char: 'zephyr' });
  const rk = f.srv('rk');
  assert.ok(f.room.g && rk); assert.equal(rk.sk, 3); assert.equal(f.room.g.cfg.time, 5); assert.equal(f.room.g.fighters.length, 2);
  assert.ok(rk.sl.pa != null && rk.sl.pb != null);
  const fa = f.room.g.fighters.find(x => x.ctrl.peer === 'pa');
  f.room.g.over = true; f.room.g.overT = 200; f.room.g.winTid = fa.tid;
  await f.tick(17);
  const res = f.srv('rkRes');
  assert.equal(res.p.pa.win, true); assert.equal(res.p.pb.win, false);
  const xp = f.calls.filter(c => c.op === 'xp-add').map(c => [c.store, c.amount]).sort();
  assert.deepEqual(xp, [['u:uid-1', 75], ['u:uid-2', -20]]);
  assert.deepEqual(f.calls.filter(c => c.op === 'ranked-add').map(c => [c.store, c.win]).sort(), [['u:uid-1', true], ['u:uid-2', false]]);
  assert.ok(f.calls.some(c => c.op === 'mm-done' && c.room === 'abcdefgh12345678'));
});

test('Online Ranked: leaving for more than 8 seconds, or giving up, is a loss; strangers and low levels are turned away', async () => {
  let f = roomSetup('ranked');
  let a = f.client('pa', 'uid-1'), b = f.client('pb', 'uid-2');
  await f.msg(a, { cmd: 'ranked' }); await f.msg(b, { cmd: 'ranked' });
  f.room.clients.delete('pb');
  await f.tick(17); await f.tick(5000);
  assert.equal(f.srv('rkRes'), undefined, 'still waiting for them to come back');
  await f.tick(4000);
  const res = f.srv('rkRes');
  assert.equal(res.p.pb.win, false); assert.equal(res.p.pb.left, 1); assert.equal(res.p.pa.win, true);
  // Give up
  f = roomSetup('ranked'); a = f.client('pa', 'uid-1'); b = f.client('pb', 'uid-2');
  await f.msg(a, { cmd: 'ranked' }); await f.msg(b, { cmd: 'ranked' });
  await f.msg(a, { cmd: 'forfeit' });
  assert.equal(f.srv('rkRes').p.pa.win, false);
  // someone who wasn't matched into this room
  f = roomSetup('ranked'); const x = f.client('px', 'uid-9');
  await f.msg(x, { cmd: 'ranked' });
  assert.equal(f.srv('rkErr'), 'not-yours'); assert.equal(f.room.g, null);
  // below level 5
  f = roomSetup('ranked', { xp: 100 }); a = f.client('pa', 'uid-1');
  await f.msg(a, { cmd: 'ranked' });
  assert.equal(f.srv('rkErr'), 'level');
  // a lobby room can't be turned into a Ranked match, and nobody can "stop" a Ranked match as host
  f = roomSetup(''); a = f.client('pa', 'uid-1');
  await f.msg(a, { cmd: 'ranked' });
  assert.equal(f.room.g, null);
});

test('CPU Ladder: your step sets the CPU level (a second CPU from step 8); win +75 XP and climb, give up = loss', async () => {
  let f = roomSetup('ladder', { ladder: 9 });
  let a = f.client('pa', 'uid-1');
  await f.msg(a, { cmd: 'ladder', char: 'titan' });
  const lad = f.srv('ladder');
  assert.equal(lad.step, 9);
  const cpus = JSON.parse(JSON.stringify(f.room.g.fighters.filter(x => x.ctrl.type === 'cpu').map(x => x.lvl).sort()));
  assert.deepEqual(cpus, [7, 9]);
  f.room.g.over = true; f.room.g.overT = 200; f.room.g.winTid = 0;
  await f.tick(17);
  const res = f.srv('ladderRes');
  assert.equal(res.win, true); assert.equal(res.step, 9); assert.equal(res.next, 4);
  assert.ok(f.calls.some(c => c.op === 'ranked-add' && c.win === true && c.ladder === true));
  assert.ok(f.calls.some(c => c.op === 'xp-add' && c.amount === 75));
  f = roomSetup('ladder', { ladder: 2 }); a = f.client('pa', 'uid-1');
  await f.msg(a, { cmd: 'ladder' });
  assert.deepEqual(JSON.parse(JSON.stringify(f.room.g.fighters.filter(x => x.ctrl.type === 'cpu').map(x => x.lvl))), [2]);
  await f.msg(a, { cmd: 'forfeit' });
  assert.equal(f.srv('ladderRes').win, false);
  assert.ok(f.calls.some(c => c.op === 'xp-add' && c.amount === -20));
  f = roomSetup('ladder', { xp: 0 }); a = f.client('pa', 'uid-1');
  await f.msg(a, { cmd: 'ladder' });
  assert.equal(f.srv('rkErr'), 'level'); assert.equal(f.room.g, null);
});
