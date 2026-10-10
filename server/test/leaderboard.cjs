'use strict';
// Run after building: node --test server/test/leaderboard.cjs
// Leaderboard stats are written only by the game server when a real online match or Boss Fight ends,
// test runs never count, and the public leaderboard shows usernames and numbers only (never emails or ids).
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const crypto = require('node:crypto');

const source = () => readFileSync(join(__dirname, '../src/worker.js'), 'utf8')
  .replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = ');

/* ---- a game room with fake account storage that records every stat write ---- */
function roomSetup() {
  let now = 1000;
  const stats = [];
  const context = vm.createContext({
    Date: class extends Date { static now() { return now; } },
    setInterval: () => 1, clearInterval: () => {},
    env: { ACCOUNTS: {
      idFromName: name => name,
      get: name => ({ fetch: async (url, options) => {
        if (url.endsWith('/stat-add')) stats.push({ store: name, ...JSON.parse(options.body) });
        return { json: async () => url.endsWith('/hit') ? { ok: true } : { name: 'Tester', beaten: 0, unlocked: [] } };
      } })
    } }
  });
  vm.runInContext(source(), context);
  const { Room } = vm.runInContext('({ Room })', context);
  const room = new Room({}, context.env);
  const client = (id, uid, pname) => {
    const c = { id, uid, pname, tester: true, authUntil: now + 3600000, pres: { ib: 0, ic: Array(10).fill(0) },
      ws: { send: () => {} }, win: now, n: 0, ip: 'test' };
    room.clients.set(id, c); return c;
  };
  const end = async winTid => {
    room.g.over = true; room.g.overT = 200; room.g.winTid = winTid; room.g.frame = 60 * 90;   // a 90 second match
    room.g.fighters.forEach(x => { x.ctrl = { type: 'none' }; });
    now += 17; room.tick();
    await new Promise(r => setTimeout(r, 0));
  };
  return { room, client, stats, end };
}

test('a real Boss Fight win counts: game, win, and the level reached', async () => {
  const f = roomSetup(); f.room.boss = true;
  const p = f.client('p1', 'uid-1', 'Ryan');
  await f.room.startBoss(p, { level: 1, char: 'tseng' });
  await f.end(0);
  assert.equal(f.stats.length, 1);
  const s = f.stats[0];
  assert.equal(s.store, 'u:__board'); assert.equal(s.uid, 'uid-1'); assert.equal(s.name, 'Ryan');
  assert.equal(s.add.games, 1); assert.equal(s.add.wins, 1); assert.equal(s.add.bossWins, 1); assert.equal(s.level, 1);
  assert.equal(s.add.onlineMs, undefined);   // Boss Fight is not online time
});

test('a lost Boss Fight counts as a loss and no level', async () => {
  const f = roomSetup(); f.room.boss = true;
  const p = f.client('p1', 'uid-1', 'Ryan');
  await f.room.startBoss(p, { level: 1, char: 'tseng' });
  await f.end(1);
  assert.equal(f.stats[0].add.losses, 1); assert.equal(f.stats[0].add.wins, 0); assert.equal(f.stats[0].level, 0);
});

test('Tester-mode boss runs never count on the leaderboard', async () => {
  const f = roomSetup(); f.room.boss = true;
  const p = f.client('p1', 'uid-1', 'Ryan');
  await f.room.startBoss(p, { level: 30, char: 'yen', test: 1 });
  await f.end(0);
  assert.deepEqual(f.stats, []);
});

test('an online match counts for every signed-in player: win/loss, KOs, deaths and time played', async () => {
  const f = roomSetup();
  const host = f.client('h1', 'uid-1', 'Ryan'), guest = f.client('g1', 'uid-2', 'Jams');
  f.client('g2', null, 'Guest');   // not signed in: never counted
  f.room.start({ stage: 0, stocks: 3, time: 5, slots: [
    { type: 'remote', peer: 'h1', char: 'titan', name: 'Ryan' },
    { type: 'remote', peer: 'g1', char: 'zephyr', name: 'Jams' },
    { type: 'remote', peer: 'g2', char: 'rivet', name: 'Guest' },
    { type: 'cpu', char: 'blaze', lvl: 5 }] }, 7, host);
  assert.ok(f.room.g);
  const ryan = f.room.g.fighters.find(x => x.ctrl.peer === 'h1');
  ryan.kos = 2; ryan.falls = 1;
  await f.end(ryan.tid);
  const byUid = Object.fromEntries(f.stats.map(s => [s.uid, s]));
  assert.deepEqual(Object.keys(byUid).sort(), ['uid-1', 'uid-2']);
  assert.equal(byUid['uid-1'].add.wins, 1); assert.equal(byUid['uid-1'].add.kos, 2); assert.equal(byUid['uid-1'].add.deaths, 1);
  assert.equal(byUid['uid-2'].add.losses, 1); assert.equal(byUid['uid-2'].add.wins, 0);
  assert.ok(byUid['uid-1'].add.onlineMs >= 90000 && byUid['uid-1'].add.onlineMs < 91000);
});

test('one account playing two fighters in the same match is only counted once', async () => {
  const f = roomSetup();
  const a = f.client('a1', 'uid-1', 'Ryan'); f.client('a2', 'uid-1', 'Ryan');
  f.room.start({ stage: 0, stocks: 3, time: 5, slots: [
    { type: 'remote', peer: 'a1', char: 'titan' }, { type: 'remote', peer: 'a2', char: 'zephyr' }] }, 3, a);
  await f.end(0);
  assert.equal(f.stats.length, 1);
});

/* ---- the public API ---- */
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...keys.publicKey.export({ format: 'jwk' }), kid: 'test-key' };
function token(id) {
  const now = Math.floor(Date.now() / 1000);
  const head = Buffer.from(JSON.stringify({ alg: 'RS256', kid: jwk.kid })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ aud: 'test-project', iss: 'https://securetoken.google.com/test-project', sub: id, name: id,
    email: id + '@example.invalid', email_verified: true, iat: now, auth_time: now, exp: now + 600, firebase: { sign_in_provider: 'google.com' } })).toString('base64url');
  return head + '.' + body + '.' + crypto.sign('RSA-SHA256', Buffer.from(head + '.' + body), keys.privateKey).toString('base64url');
}
class Storage {
  constructor() { this.rows = new Map(); }
  async get(k) { return structuredClone(this.rows.get(k)); }
  async put(k, v) { this.rows.set(k, structuredClone(v)); }
  async delete(k) { return this.rows.delete(k); }
  async list({ prefix = '', limit = Infinity } = {}) { return new Map([...this.rows].filter(([k]) => k.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b)).slice(0, limit)); }
  transaction(fn) { return fn(this); }
}
function apiSetup() {
  const objects = new Map();
  const context = vm.createContext({ Request, Response, Headers, URL, TextEncoder, TextDecoder, atob,
    crypto: { subtle: crypto.webcrypto.subtle, randomUUID: crypto.randomUUID },
    fetch: async () => new Response(JSON.stringify({ keys: [jwk] })) });
  vm.runInContext(source(), context);
  const { worker, Accounts } = vm.runInContext('({ worker, Accounts })', context);
  const env = { FIREBASE_PROJECT_ID: 'test-project', ALLOWED_ORIGINS: 'https://game.example.invalid',
    ACCOUNTS: { idFromName: n => n, get: n => {
      if (!objects.has(n)) { const storage = new Storage(); objects.set(n, new Accounts({ storage })); }
      return { fetch: (url, opts) => objects.get(n).fetch(new Request(url, opts)) };
    } } };
  const add = (uid, name, a, level) => env.ACCOUNTS.get('u:__board').fetch('https://acct/stat-add', { method: 'POST', body: JSON.stringify({ uid, name, add: a, level }) });
  const get = async id => {
    const r = await worker.fetch(new Request('https://w.example.invalid/api/leaderboard', { headers: { origin: 'https://game.example.invalid', ...(id ? { authorization: 'Bearer ' + token(id) } : {}) } }), env);
    return { status: r.status, data: await r.json() };
  };
  return { add, get };
}

test('the leaderboard is public, sorted, and never shows emails or account ids', async () => {
  const f = apiSetup();
  await f.add('u1', 'Ryan', { onlineMs: 3000000, games: 10, wins: 7, losses: 3, kos: 20, deaths: 8 });
  await f.add('u2', 'Jams', { onlineMs: 1800000, games: 12, wins: 4, losses: 8, kos: 9, deaths: 15 });
  await f.add('u3', 'Bob', { games: 2, bossGames: 2, wins: 2, bossWins: 2, kos: 3, deaths: 1 }, 7);
  const r = await f.get();
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.sections.online.map(x => x.name), ['Ryan', 'Jams']);
  assert.deepEqual(r.data.sections.wins.map(x => x.name), ['Ryan', 'Jams', 'Bob']);
  assert.deepEqual(r.data.sections.games.map(x => x.name), ['Jams', 'Ryan', 'Bob']);
  assert.deepEqual(r.data.sections.boss.map(x => x.name), ['Bob']);
  assert.equal(r.data.sections.boss[0].bestLevel, 7);
  assert.equal(r.data.sections.overall[0].name, 'Ryan');
  const text = JSON.stringify(r.data);
  assert.ok(!text.includes('@'), 'no emails'); assert.ok(!text.includes('"uid"'), 'no account ids'); assert.ok(!text.includes('u1'));
  assert.equal(r.data.me, null);
});

test('a signed-in player also gets their own rank in every section', async () => {
  const f = apiSetup();
  await f.add('u1', 'Ryan', { onlineMs: 3000000, games: 10, wins: 7, losses: 3, kos: 20, deaths: 8 });
  await f.add('u2', 'Jams', { onlineMs: 1800000, games: 12, wins: 4, losses: 8, kos: 9, deaths: 15 });
  const r = await f.get('u2');
  assert.equal(r.data.me.online, 2); assert.equal(r.data.me.games, 1); assert.equal(r.data.me.boss, null);
  assert.equal(r.data.me.stats.name, 'Jams');
  assert.equal(r.data.sections.games[0].me, true);
});

test('stats only go up, and one result can never add an absurd amount', async () => {
  const f = apiSetup();
  await f.add('u1', 'Ryan', { onlineMs: 999999999999, wins: 1e9, games: -5 }, 999);
  const s = (await f.get()).data.sections.online[0];
  assert.equal(s.onlineMs, 3600000); assert.equal(s.wins, 1000); assert.equal(s.games, 0); assert.equal(s.bestLevel, 30);
});
