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

test('an online match counts for every signed-in player: win/loss, KOs and deaths', async () => {
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
  assert.equal(byUid['uid-1'].add.onlineMs, undefined);   // time online comes from the "still here" ping instead
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
function token(id, at) {
  const now = Math.floor((at || Date.now()) / 1000);
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
function apiSetup(clock) {
  const objects = new Map();
  const context = vm.createContext({ Request, Response, Headers, URL, TextEncoder, TextDecoder, atob,
    ...(clock ? { Date: class extends Date { static now() { return clock.now; } } } : {}),
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
  const get = async (id, view) => {
    const r = await worker.fetch(new Request('https://w.example.invalid/api/leaderboard' + (view ? '?view=' + view : ''), { headers: { origin: 'https://game.example.invalid', ...(id ? { authorization: 'Bearer ' + token(id, clock && clock.now) } : {}) } }), env);
    return { status: r.status, data: await r.json() };
  };
  return { add, get, worker, env, objects };
}

test('the leaderboard is public, sorted, and never shows emails or account ids', async () => {
  const f = apiSetup();
  await f.add('u1', 'Ryan', { onlineMs: 3000000, games: 10, wins: 7, losses: 3, kos: 20, deaths: 8 });
  await f.add('u2', 'Jams', { onlineMs: 1800000, games: 12, wins: 4, losses: 8, kos: 9, deaths: 15 });
  await f.add('u3', 'Bob', { games: 2, bossGames: 2, wins: 2, bossWins: 2, kos: 3, deaths: 1 }, 7);
  const r = await f.get();
  assert.equal(r.status, 200);
  // everyone is listed; players on 0 come last (A-Z)
  assert.deepEqual(r.data.sections.online.map(x => x.name), ['Ryan', 'Jams', 'Bob']);
  assert.deepEqual(r.data.sections.wins.map(x => x.name), ['Ryan', 'Jams', 'Bob']);
  assert.deepEqual(r.data.sections.games.map(x => x.name), ['Jams', 'Ryan', 'Bob']);
  assert.deepEqual(r.data.sections.boss.map(x => x.name), ['Bob', 'Jams', 'Ryan']);
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
  assert.equal(r.data.me.online, 2); assert.equal(r.data.me.games, 1); assert.equal(r.data.me.boss, 1);   // 0 for both: A-Z
  assert.equal(r.data.me.stats.name, 'Jams');
  assert.equal(r.data.sections.games[0].me, true);
});

test('stats only go up, and one result can never add an absurd amount', async () => {
  const f = apiSetup();
  await f.add('u1', 'Ryan', { onlineMs: 999999999999, wins: 1e9, games: -5 }, 999);
  const s = (await f.get()).data.sections.online[0];
  assert.equal(s.onlineMs, 3600000); assert.equal(s.wins, 1000); assert.equal(s.games, 0); assert.equal(s.bestLevel, 30);
});

/* ---- the owner can edit the leaderboard; nobody else can ---- */
function editSetup(clock) {
  const f = apiSetup(clock);
  f.post = async (id, path, body) => {
    const r = await f.worker.fetch(new Request('https://w.example.invalid' + path, { method: 'POST', body: JSON.stringify(body),
      headers: { origin: 'https://game.example.invalid', 'content-type': 'application/json', authorization: 'Bearer ' + token(id, clock && clock.now) } }), f.env);
    return { status: r.status, data: await r.json() };
  };
  f.season = async id => {
    const r = await f.worker.fetch(new Request('https://w.example.invalid/api/season', { headers: { origin: 'https://game.example.invalid',
      ...(id ? { authorization: 'Bearer ' + token(id, clock && clock.now) } : {}) } }), f.env);
    return { status: r.status, data: await r.json() };
  };
  return f;
}
test('only the owner sees account ids on the leaderboard (needed for editing)', async () => {
  const f = editSetup(); f.env.OWNER_EMAILS = 'boss@example.invalid';
  await f.add('u1', 'Ryan', { games: 3, wins: 2 });
  assert.equal((await f.get('u2')).data.sections.wins[0].uid, undefined);
  assert.equal((await f.get('u2')).data.owner, undefined);
  const o = (await f.get('boss')).data;
  assert.equal(o.owner, true); assert.equal(o.sections.wins[0].uid, 'u1');
});
test('the owner can set exact numbers; bad values and other players are refused', async () => {
  const f = editSetup(); f.env.OWNER_EMAILS = 'boss@example.invalid';
  await f.add('u1', 'Ryan', { games: 3, wins: 2, onlineMs: 60000 });
  assert.equal((await f.post('u1', '/api/admin/board', { uid: 'u1', set: { wins: 99 } })).status, 403);
  for (const set of [{ wins: -1 }, { wins: 1.5 }, { bestLevel: 31 }, { name: 'x' }, {}])
    assert.equal((await f.post('boss', '/api/admin/board', { uid: 'u1', set })).status, 400);
  assert.equal((await f.post('boss', '/api/admin/board', { uid: 'u1', set: { wins: 1 }, season: 0 })).status, 400);
  assert.equal((await f.post('boss', '/api/admin/board', { uid: 'u1', season: 1, set: { wins: 50, onlineMs: 7200000, bestLevel: 12 } })).status, 200);
  const s = (await f.get()).data.sections.wins[0];
  assert.equal(s.wins, 50); assert.equal(s.onlineMs, 7200000); assert.equal(s.bestLevel, 12); assert.equal(s.games, 3);
});
test('the owner can move players with the arrows and reset the order', async () => {
  const f = editSetup(); f.env.OWNER_EMAILS = 'boss@example.invalid';
  await f.add('u1', 'Ryan', { wins: 9 }); await f.add('u2', 'Jams', { wins: 5 }); await f.add('u3', 'Bob', { wins: 1 });
  assert.equal((await f.post('u2', '/api/admin/board/order', { section: 'wins', uids: ['u3', 'u1', 'u2'] })).status, 403);
  assert.equal((await f.post('boss', '/api/admin/board/order', { section: 'nope', uids: ['u1'] })).status, 400);
  assert.equal((await f.post('boss', '/api/admin/board/order', { section: 'wins', uids: ['u1', 'u1'] })).status, 400);
  assert.equal((await f.post('boss', '/api/admin/board/order', { section: 'wins', season: 1, uids: ['u3', 'u1', 'u2'] })).status, 200);
  let r = (await f.get()).data;
  assert.deepEqual(r.sections.wins.map(x => x.name), ['Bob', 'Ryan', 'Jams']); assert.equal(r.custom.wins, true);
  assert.deepEqual(r.sections.games.map(x => x.name), ['Bob', 'Jams', 'Ryan']);   // other sections untouched (all 0: A-Z)
  assert.equal((await f.post('boss', '/api/admin/board/order', { section: 'wins', season: 1, reset: true })).status, 200);
  r = (await f.get()).data;
  assert.deepEqual(r.sections.wins.map(x => x.name), ['Ryan', 'Jams', 'Bob']); assert.equal(r.custom.wins, undefined);
});

test('time online counts while the game is open (the "still here" ping), up to 3 minutes per ping', async () => {
  const f = editSetup();
  const ping = id => f.worker.fetch(new Request('https://w.example.invalid/api/ping', { method: 'POST', body: '{}',
    headers: { origin: 'https://game.example.invalid', authorization: 'Bearer ' + token(id) } }), f.env);
  assert.equal((await ping('u9')).status, 200);   // first signal: nothing to count yet
  assert.deepEqual((await f.get()).data.sections.online, []);
  const rows = f.objects.get('u:__admin').state.storage.rows, rec = rows.get('player:u9');
  rec.seen = Date.now() - 120000; rows.set('player:u9', rec);   // the last signal was 2 minutes ago
  await ping('u9');
  const t = (await f.get()).data.sections.online[0].onlineMs;
  assert.ok(t >= 120000 && t < 125000, String(t));
  rec.seen = Date.now() - 3600000; rows.set('player:u9', rec);   // came back after an hour away: the gap is not counted
  await ping('u9');
  assert.ok((await f.get()).data.sections.online[0].onlineMs < 125000);
});

test('Vs CPU results save to the account but never rank on the leaderboard', async () => {
  const f = editSetup();
  for (const bad of [{ win: 'yes', kos: 1, falls: 0 }, { win: true, kos: 99, falls: 0 }, { win: true, kos: 1.5, falls: 0 }])
    assert.equal((await f.post('u5', '/api/cpu-result', bad)).status, 400);
  assert.equal((await f.post('u5', '/api/cpu-result', { win: true, kos: 3, falls: 1 })).status, 200);
  assert.equal((await f.post('u5', '/api/cpu-result', { win: false, kos: 1, falls: 3 })).status, 200);
  const r = (await f.get('u5')).data;
  assert.equal(r.me.stats.cpuGames, 2); assert.equal(r.me.stats.cpuWins, 1); assert.equal(r.me.stats.cpuKos, 4); assert.equal(r.me.stats.cpuDeaths, 4);
  for (const k in r.sections) assert.ok(r.sections[k].every(x => !x.wins && !x.games && !x.kos && !x.score), k + ' must not count Vs CPU');
  assert.ok(!JSON.stringify((await f.get()).data).includes('cpu'));   // other people never see your CPU numbers
});

/* ---- seasons: 30 days, a 2-day break, then the next season; #1 in each section wins a title ---- */
const DAY = 86400000;
test('Season 1 starts on first use, counts its own board, and the break does not count', async () => {
  const clock = { now: Date.now() }, f = editSetup(clock);
  await f.add('u1', 'Ryan', { wins: 3, games: 4 });
  let s = (await f.season()).data.season;
  assert.equal(s.n, 1); assert.equal(s.active, true); assert.equal(s.end - s.start, 30 * DAY); assert.equal(s.next - s.start, 32 * DAY);
  clock.now += 10 * DAY; await f.add('u2', 'Jams', { wins: 1, games: 1 });
  assert.deepEqual((await f.get()).data.sections.wins.map(x => [x.name, x.wins]), [['Ryan', 3], ['Jams', 1]]);
  assert.equal((await f.get()).data.view, 'season'); assert.equal((await f.get(null, 'all')).data.view, 'all');
  clock.now += 21 * DAY;   // day 31: the break
  s = (await f.season()).data.season; assert.equal(s.n, 1); assert.equal(s.active, false);
  await f.add('u2', 'Jams', { wins: 10, games: 10 });   // counts all-time only
  assert.equal((await f.get()).data.sections.wins[0].name, 'Ryan');
  assert.equal((await f.get(null, 'all')).data.sections.wins[0].name, 'Jams');
  clock.now += 2 * DAY;    // day 33: Season 2, everyone back to 0 (still listed)
  s = (await f.season()).data.season; assert.equal(s.n, 2); assert.equal(s.active, true);
  const w = (await f.get()).data.sections.wins;
  assert.deepEqual(w.map(x => x.wins), [0, 0]); assert.deepEqual(w.map(x => x.name), ['Jams', 'Ryan']);
  assert.equal((await f.get(null, 'all')).data.sections.wins[0].wins, 11);
});

test('when a season ends, #1 in each section wins a title; the Overall #1 writes their own', async () => {
  const clock = { now: Date.now() }, f = editSetup(clock); f.env.OWNER_EMAILS = 'boss@example.invalid';
  await f.add('u1', 'Ryan', { wins: 9, games: 9, kos: 20 });
  await f.add('u2', 'Jams', { wins: 2, games: 12, onlineMs: 3000000 });
  await f.add('u3', 'Bob', { games: 1, bossWins: 1 }, 6);
  assert.equal((await f.season('u1')).data.result, null);
  clock.now += 30 * DAY + 1000;
  const r = (await f.season('u1')).data;
  assert.equal(r.result.n, 1);
  assert.deepEqual(Object.fromEntries(Object.entries(r.result.winners).map(([k, v]) => [k, v.name])),
    { overall: 'Ryan', online: 'Jams', wins: 'Ryan', games: 'Jams', boss: 'Bob' });
  assert.equal(r.result.top.wins.length, 3); assert.ok(!JSON.stringify(r.result).includes('"uid"'));
  assert.deepEqual(r.awards.map(a => [a.section, a.title, a.claimed]), [['overall', '', false], ['wins', 'Sky Champion', false]]);
  // claiming: only your own titles, the Overall one needs a clean title
  assert.equal((await f.post('u3', '/api/season/claim', { season: 1, section: 'wins' })).status, 404);
  assert.equal((await f.post('u1', '/api/season/claim', { season: 1, section: 'overall', title: 'bad<title>' })).status, 400);
  assert.equal((await f.post('u1', '/api/season/claim', { season: 1, section: 'overall', title: 'x'.repeat(21) })).status, 400);
  assert.equal((await f.post('u1', '/api/season/claim', { season: 1, section: 'nope' })).status, 400);
  assert.equal((await f.post('u1', '/api/season/claim', { season: 1, section: 'wins' })).status, 200);
  assert.equal((await f.get(null, 'all')).data.sections.wins.find(x => x.name === 'Ryan').title, 'Sky Champion');
  const c = await f.post('u1', '/api/season/claim', { season: 1, section: 'overall', title: '  Cloud   King ' });
  assert.equal(c.status, 200); assert.equal(c.data.title, 'Cloud King');
  assert.equal((await f.post('u1', '/api/season/claim', { season: 1, section: 'overall', title: 'Sky Lord' })).data.title, 'Sky Lord');   // can change it
  assert.equal((await f.season('u1')).data.title, 'Sky Lord');
  // the owner can remove a title; the Overall winner can write a new one
  assert.equal((await f.post('u1', '/api/admin/board/title', { uid: 'u1' })).status, 403);
  assert.equal((await f.post('boss', '/api/admin/board/title', { uid: 'u1' })).status, 200);
  const after = (await f.season('u1')).data;
  assert.equal(after.title, ''); assert.equal(after.awards.find(a => a.section === 'overall').claimed, false);
  assert.equal((await f.get(null, 'all')).data.sections.wins.find(x => x.name === 'Ryan').title, undefined);
  // results are saved once; later requests do not hand out titles again
  clock.now += DAY; await f.season('u1');
  assert.equal((await f.season('u2')).data.awards.length, 2);
});

test("the owner's arrow order decides the winner; a section nobody played has no winner", async () => {
  const clock = { now: Date.now() }, f = editSetup(clock); f.env.OWNER_EMAILS = 'boss@example.invalid';
  await f.add('u1', 'Ryan', { wins: 9, games: 9 }); await f.add('u2', 'Jams', { wins: 1, games: 1 });
  assert.equal((await f.post('boss', '/api/admin/board/order', { section: 'wins', season: 1, uids: ['u2'] })).status, 200);
  clock.now += 30 * DAY + 1;
  const res = (await f.season()).data.result;
  assert.equal(res.winners.wins.name, 'Jams'); assert.equal(res.winners.boss, undefined);
  assert.equal((await f.season('u2')).data.awards[0].title, 'Sky Champion');
});
