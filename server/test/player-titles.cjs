'use strict';
// Isolated real Worker routes and signed tokens; never uses live player accounts.
const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const crypto = require('node:crypto');
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...keys.publicKey.export({ format: 'jwk' }), kid: 'titles-key' };
class Storage {
  constructor() { this.rows = new Map(); this.queue = Promise.resolve(); }
  async get(k) { return structuredClone(this.rows.get(k)); }
  async put(k, v) { this.rows.set(k, structuredClone(v)); }
  async delete(k) { return this.rows.delete(k); }
  async list({ prefix = '', limit = Infinity, startAfter = '' } = {}) {
    return new Map([...this.rows].filter(([k]) => k.startsWith(prefix) && k > startAfter).sort(([a], [b]) => a.localeCompare(b)).slice(0, limit).map(([k, v]) => [k, structuredClone(v)]));
  }
  transaction(fn) { const next = this.queue.then(() => fn(this)); this.queue = next.catch(() => {}); return next; }
}
function setup() {
  let now = Date.UTC(2026, 9, 10);
  const objects = new Map(), context = vm.createContext({ Request, Response, Headers, URL, TextEncoder, TextDecoder, atob,
    Date: class extends Date { static now() { return now; } }, setInterval: () => 1, clearInterval: () => {},
    crypto: { subtle: crypto.webcrypto.subtle, randomUUID: crypto.randomUUID },
    fetch: async () => new Response(JSON.stringify({ keys: [jwk] })) });
  const source = readFileSync(join(__dirname, '../src/worker.js'), 'utf8').replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = ');
  vm.runInContext(source, context);
  const { worker, Accounts, Room } = vm.runInContext('({ worker, Accounts, Room })', context);
  const env = { FIREBASE_PROJECT_ID: 'test-project', ALLOWED_ORIGINS: 'https://game.example.invalid', OWNER_EMAILS: 'owner@example.invalid', TESTER_EMAILS: 'tester@example.invalid',
    ACCOUNTS: { idFromName: n => n, get: n => {
      if (!objects.has(n)) { const storage = new Storage(); objects.set(n, { storage, instance: new Accounts({ storage }) }); }
      return { fetch: (url, opts) => objects.get(n).instance.fetch(new Request(url, opts)) };
    } } };
  const internal = async (uid, op, d = {}) => (await env.ACCOUNTS.get('u:' + uid).fetch('https://acct/' + op, { method: 'POST', body: JSON.stringify(d) })).json();
  const call = async (id, path, d, extra = {}) => {
    const sec = Math.floor(now / 1000), head = Buffer.from(JSON.stringify({ alg: 'RS256', kid: jwk.kid })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ aud: 'test-project', iss: 'https://securetoken.google.com/test-project', sub: id, name: id, email: id + '@example.invalid', email_verified: true,
      iat: sec, auth_time: sec, exp: sec + 600, firebase: { sign_in_provider: 'google.com' }, ...extra })).toString('base64url');
    const token = head + '.' + body + '.' + crypto.sign('RSA-SHA256', Buffer.from(head + '.' + body), keys.privateKey).toString('base64url');
    const r = await worker.fetch(new Request('https://worker.example.invalid' + path, { method: d === undefined ? 'GET' : 'POST', headers: { origin: 'https://game.example.invalid', authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      ...(d === undefined ? {} : { body: JSON.stringify(d) }) }), env);
    return { status: r.status, data: await r.json() };
  };
  return { call, internal, env, objects, Room, at: t => { now = t; }, now: () => now };
}
test('role ribbons follow existing Owner, OP and Collab checks; Tester is not Admin', async () => {
  const f = setup();
  assert.deepEqual((await f.call('owner', '/api/me')).data.ownedTitles.sort(), ['admin', 'owner']);
  for (const id of ['player', 'tester']) {
    assert.deepEqual((await f.call(id, '/api/me')).data.ownedTitles, []);
    assert.equal((await f.call(id, '/api/title', { title: 'admin', owner: true, facts: ['admin'] })).status, 403);
  }
  await f.call('player', '/api/me');
  await f.internal('player', 'roles', { op: true, collab: true, actor: { uid: 'owner' } });
  assert.deepEqual((await f.call('player', '/api/me')).data.ownedTitles.sort(), ['admin', 'collab']);
  assert.equal((await f.call('player', '/api/title', { title: 'admin' })).status, 200);
  await f.internal('player', 'roles', { op: false, collab: false, actor: { uid: 'owner' } });
  assert.equal((await f.call('player', '/api/me')).data.equippedTitle, '');
  assert.equal((await f.call('player', '/api/title', { title: 'admin' })).status, 403);
});
test('unknown/unearned titles and invalid auth are rejected; equip and removal persist', async () => {
  const f = setup(); await f.call('player', '/api/me');
  assert.equal((await f.call('player', '/api/title', { title: '<script>' })).status, 400);
  assert.equal((await f.call('player', '/api/title', { title: {} })).status, 400);
  assert.equal((await f.call('player', '/api/title', { title: 'season-champion' })).status, 403);
  assert.equal((await f.call('owner', '/api/title', { title: 'owner' }, { exp: 0 })).status, 401);
  await f.internal('player', 'beat', { level: 1 });
  assert.equal((await f.call('player', '/api/title', { title: 'first-victory', uid: 'owner' })).status, 200);
  assert.equal((await f.call('player', '/api/me')).data.equippedTitle, 'first-victory');
  await f.call('player', '/api/title', { title: '' });
  assert.equal((await f.call('player', '/api/me')).data.equippedTitle, '');
});
test('owner auto-unlocks and repaired progress do not earn victories; only confirmed Boss wins do', async () => {
  const f = setup(); const p = (await f.call('player', '/api/me')).data;
  await f.call('owner', '/api/admin/account', { uid: 'player', revision: p.revision, beaten: 30, wins: 999, unlocked: [], reason: 'Test repair' });
  assert.deepEqual((await f.call('player', '/api/me')).data.ownedTitles, []);
  await f.internal('player', 'beat', { level: 31 });
  assert.deepEqual((await f.call('player', '/api/me')).data.ownedTitles, []);
  for (const level of [1, 10, 30]) await f.internal('player', 'beat', { level });
  assert.deepEqual((await f.call('player', '/api/me')).data.ownedTitles.sort(), ['boss-master', 'first-victory', 'legend-slayer']);
});
test('monthly ranks change hands; completed champions persist across UTC rollover and idle months', async () => {
  const f = setup();
  const add = (uid, wins, kos = 0) => f.internal('__board', 'stat-add', { uid, name: uid, add: { games: 1, wins, kos } });
  await add('player', 1); await add('rival', 0);
  assert.ok((await f.call('player', '/api/me')).data.ownedTitles.includes('season-leader'));
  await f.call('player', '/api/title', { title: 'season-leader' });
  await add('rival', 1, 10);
  assert.equal((await f.call('player', '/api/me')).data.equippedTitle, '');
  f.at(Date.UTC(2026, 10, 1));
  const winner = (await f.call('rival', '/api/me')).data;
  assert.ok(winner.ownedTitles.includes('season-champion')); assert.deepEqual(winner.titleSeasons, ['2026-10']);
  assert.ok(!winner.ownedTitles.includes('season-leader'));
  await f.call('rival', '/api/title', { title: 'season-champion' });
  await add('player', 1, 99);
  f.at(Date.UTC(2027, 0, 1));
  assert.equal((await f.call('rival', '/api/me')).data.equippedTitle, 'season-champion');
  assert.deepEqual((await f.call('player', '/api/me')).data.titleSeasons, ['2026-11']);
});
test('manual leaderboard edits, pins, CPU results and online time cannot earn seasonal titles', async () => {
  const f = setup(); await f.call('player', '/api/me');
  await f.internal('__board', 'stat-add', { uid: 'player', name: 'player', add: { cpuGames: 999, cpuWins: 999, onlineMs: 3600000 } });
  await f.internal('__board', 'stat-set', { uid: 'player', actor: { uid: 'owner' }, set: { games: 999, wins: 999, kos: 999 } });
  await f.internal('__board', 'order-set', { section: 'overall', uids: ['player'] });
  assert.deepEqual((await f.call('player', '/api/me')).data.ownedTitles, []);
  assert.deepEqual((await f.call('player', '/api/leaderboard')).data.sections.season, []);
});
test('concurrent real results are counted once each; Top Ten and regular-play thresholds work', async () => {
  const f = setup();
  await Promise.all(Array.from({ length: 25 }, () => f.internal('__board', 'stat-add', { uid: 'player', name: 'player', add: { games: 1, wins: 1, kos: 1 } })));
  const p = (await f.call('player', '/api/me')).data;
  assert.ok(p.ownedTitles.includes('arena-regular')); assert.ok(p.ownedTitles.includes('top-ten'));
  const board = (await f.call('player', '/api/leaderboard')).data;
  assert.equal(board.sections.season[0].games, 25); assert.equal(board.sections.season[0].score, 300);
  for (let i = 0; i < 10; i++) await f.internal('__board', 'stat-add', { uid: 'rival' + i, name: 'rival' + i, add: { games: 100, wins: 100 } });
  assert.ok(!(await f.call('player', '/api/me')).data.ownedTitles.includes('top-ten'));
});
test('tied standings have a stable winner; public seasons never expose account ids', async () => {
  const f = setup();
  for (const uid of ['z-private', 'a-private']) await f.internal('__board', 'stat-add', { uid, name: uid[0] + 'Player', add: { games: 1, wins: 1 } });
  const board = (await f.call('spectator', '/api/leaderboard')).data;
  assert.equal(board.sections.season[0].name, 'aPlayer');
  const text = JSON.stringify(board); assert.ok(!text.includes('a-private')); assert.ok(!text.includes('z-private')); assert.ok(!text.includes('@'));
});
test('online title metadata is loaded from accounts, ignores host claims, and rechecks revoked roles', async () => {
  const f = setup(); await f.call('player', '/api/me'); await f.internal('player', 'roles', { op: true }); await f.call('player', '/api/title', { title: 'admin' });
  const room = new f.Room({}, f.env), messages = [];
  const c = { id: 'peer', uid: 'player', authUntil: f.now() + 60000, pres: { title: 'owner' }, ws: { send: s => messages.push(JSON.parse(s)) } };
  room.clients.set(c.id, c); const game = { fighters: [{ slot: 0, ctrl: { type: 'remote', peer: c.id } }] }; room.g = game; room.gid = 8;
  await room.refreshMatchTitles(game, 8); assert.equal(room.srv.titles.slots[0][1], 'admin');
  await f.internal('player', 'roles', { op: false }); await room.refreshMatchTitles(game, 8); assert.equal(room.srv.titles.slots[0][1], '');
  c.authUntil = 0; c.owner = true; await room.refreshMatchTitles(game, 8); assert.equal(room.srv.titles.slots[0][1], '');
});
test('the server peer id is reserved, and public relay presence cannot impersonate title metadata', async () => {
  const f = setup(), room = new f.Room({}, f.env);
  for (const id of ['srv', 'SRV']) assert.equal((await room.fetch(new Request('https://worker.example.invalid/room/ABCD?id=' + id))).status, 400);
  const c = vm.createContext({ SRV: { titles: null }, RELAY: { remote: new Map([['srv', { pres: { titles: { gid: 1, slots: [[0, 'owner']] } } }]]) }, renderAcctChip: () => {} });
  vm.runInContext(readFileSync(join(__dirname, '../../site/title-data.js'), 'utf8') + '\n' + readFileSync(join(__dirname, '../../site/titles.js'), 'utf8'), c);
  assert.equal(vm.runInContext('trustedMatchTitle(0, 1)', c), '');
  c.SRV.titles = { gid: 1, slots: [[0, 'first-victory']] };
  assert.equal(vm.runInContext('trustedMatchTitle(0, 1)', c), 'first-victory');
  assert.equal(vm.runInContext('trustedMatchTitle(0, 2)', c), '');
});
