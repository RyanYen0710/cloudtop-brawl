'use strict';
// Real Worker routes, signed Firebase-shaped JWTs, and isolated Durable Object storage. No live accounts.
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
const edit = p => ({ uid: 'player1', revision: p.revision || 0, beaten: 10, wins: 7, unlocked: ['hsi'], reason: 'Restore lost progress' });
const report = () => ({ title: 'Boss jump gets stuck', details: 'The fighter stops moving after jumping near the ledge.',
  steps: 'Choose a fighter, jump into the ledge.', category: 'gameplay', severity: 'medium', context: { screen: 'boss', mode: 'solo', level: 10, browser: 'test browser' } });

test('only the owner gets the Owner tools; testers keep only the Tester button', async () => {
  const f = setup();
  for (const id of ['player1', 'admin1']) {
    assert.equal((await f.call(id, '/api/admin/reports')).status, 403);
    assert.equal((await f.call(id, '/api/admin/players')).status, 403);
    assert.equal((await f.call(id, '/api/admin/account?uid=' + id)).status, 403);
    assert.equal((await f.call(id, '/api/admin/roles', { uid: id, op: true, collab: true })).status, 403);
  }
  assert.equal((await f.call('player1', '/api/me')).data.tester, false);
  assert.equal((await f.call('admin1', '/api/me')).data.tester, true);   // TESTER_EMAILS still gives the Tester button
  const owner = (await f.call('owner1', '/api/me')).data;
  assert.equal(owner.owner, true); assert.equal(owner.tester, true);
  assert.equal((await f.call('owner1', '/api/admin/reports')).status, 200);
  assert.equal((await f.call('owner1', '/api/admin/reports', undefined, { email_verified: false })).status, 403);
});

test('unsigned, expired, wrong-project tokens and disallowed origins cannot use admin routes', async () => {
  const f = setup();
  const parts = token('admin1').split('.'); parts[2] = Buffer.from('forged signature').toString('base64url');
  const forged = await f.worker.fetch(new Request('https://worker.example.invalid/api/admin/reports', {
    headers: { origin: 'https://game.example.invalid', authorization: 'Bearer ' + parts.join('.') }
  }), f.env);
  assert.equal(forged.status, 401);
  assert.equal((await f.call('owner1', '/api/admin/reports', undefined, { exp: 0 })).status, 401);
  assert.equal((await f.call('owner1', '/api/admin/reports', undefined, { aud: 'other' })).status, 401);
  assert.equal((await f.call('owner1', '/api/admin/reports', undefined, {}, 'https://evil.example.invalid')).status, 403);
  assert.equal((await f.call('owner1', '/api/admin/reports', undefined, { firebase: { sign_in_provider: 'anonymous' } })).status, 401);
});

test('account lookup and grants save only approved fields, earned bosses, and a durable before/after audit', async () => {
  const f = setup(); const p = (await f.call('player1', '/api/me')).data;
  const found = await f.call('owner1', '/api/admin/account?username=player1');
  assert.equal(found.data.uid, 'player1');
  const changed = await f.call('owner1', '/api/admin/account', { ...edit(p), owner: true, admin: true, name: 'hacked' });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.profile.beaten, 10);
  assert.equal(changed.data.profile.wins, 7);
  assert.ok(changed.data.profile.unlocked.includes('hsi'));
  assert.ok(changed.data.profile.unlocked.includes('yen'));
  const current = (await f.call('player1', '/api/me')).data;
  assert.equal(current.name, 'player1'); assert.equal(current.owner, false); assert.equal(current.tester, false);
  const detail = (await f.call('owner1', '/api/admin/account?uid=player1')).data;
  assert.equal(detail.history.length, 1); assert.equal(detail.history[0].actor.uid, 'owner1');
  assert.equal(detail.history[0].before.beaten, 0); assert.equal(detail.history[0].after.beaten, 10);
  assert.equal(detail.history[0].reason, 'Restore lost progress');
  const reset = await f.call('owner1', '/api/admin/account', { ...edit(detail.profile), beaten: 0, wins: 0, unlocked: [], reason: 'Reset testing account' });
  assert.equal(reset.status, 200); assert.deepEqual(reset.data.profile.unlocked, []);
});

test('invalid edits, unknown accounts and stale revisions leave saved progress unchanged', async () => {
  const f = setup(); const p = (await f.call('player1', '/api/me')).data;
  for (const data of [{ ...edit(p), beaten: 999 }, { ...edit(p), beaten: 1.5 }, { ...edit(p), wins: -1 },
    { ...edit(p), unlocked: ['not-a-fighter'] }, { ...edit(p), unlocked: ['yenlegend'] }, { ...edit(p), reason: '' }])
    assert.equal((await f.call('owner1', '/api/admin/account', data)).status, 400);
  assert.equal((await f.call('owner1', '/api/admin/account?uid=missing')).status, 404);
  assert.equal((await f.call('owner1', '/api/admin/account', { ...edit(p), uid: 'missing' })).status, 404);
  assert.equal((await f.call('player1', '/api/me')).data.beaten, 0);
  await f.call('owner1', '/api/admin/account', edit(p));
  assert.equal((await f.call('owner1', '/api/admin/account', edit(p))).status, 409);
  assert.equal((await f.call('player1', '/api/me')).data.beaten, 10);
});

test('simultaneous admin edits do not overwrite each other and boss results invalidate stale edits', async () => {
  const f = setup(); const p = (await f.call('player1', '/api/me')).data;
  const [a, b] = await Promise.all([f.call('owner1', '/api/admin/account', edit(p)), f.call('owner1', '/api/admin/account', { ...edit(p), beaten: 20 })]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  const now = (await f.call('owner1', '/api/admin/account?uid=player1')).data.profile;
  await f.env.ACCOUNTS.get('u:player1').fetch('https://acct/beat', { method: 'POST', body: JSON.stringify({ level: now.beaten + 1 }) });
  assert.equal((await f.call('owner1', '/api/admin/account', edit(now))).status, 409);
});

test('creator auto-unlocks remain protected from admin reset', async () => {
  const f = setup(); const owner = (await f.call('owner1', '/api/me')).data;
  assert.equal(owner.beaten, 30); assert.ok(owner.unlocked.includes('yen'));
  assert.equal((await f.call('owner1', '/api/admin/account', { ...edit(owner), uid: 'owner1', beaten: 0, wins: 0, unlocked: [] })).status, 409);
  assert.equal((await f.call('owner1', '/api/me')).data.beaten, 30);
});

test('players submit private reports; admins review, update and detect conflicting edits', async () => {
  const f = setup(); await f.call('player1', '/api/me');
  const created = await f.call('player1', '/api/reports', { ...report(), uid: 'owner1', status: 'resolved', notes: 'forged' });
  assert.equal(created.status, 201);
  assert.equal((await f.call('player1', '/api/admin/reports')).status, 403);
  assert.equal((await f.call('player1', '/api/reports')).status, 404);
  const inbox = (await f.call('owner1', '/api/admin/reports')).data;
  assert.equal(inbox.reports.length, 1); const r = inbox.reports[0];
  assert.equal(r.uid, 'player1'); assert.equal(r.status, 'open'); assert.equal(r.notes, '');
  const data = { id: r.id, expectedUpdated: r.updated, status: 'investigating', notes: 'Reproduced on level 10' };
  assert.equal((await f.call('owner1', '/api/admin/reports', data)).status, 200);
  assert.equal((await f.call('owner1', '/api/admin/reports', data)).status, 409);
  const updated = (await f.call('owner1', '/api/admin/reports')).data.reports[0];
  assert.equal(updated.updatedBy.uid, 'owner1'); assert.equal(updated.status, 'investigating');
});

test('report validation and quotas reject spam without storing it', async () => {
  const f = setup();
  assert.equal((await f.call('player1', '/api/reports', { ...report(), title: '' })).status, 400);
  assert.equal((await f.call('player1', '/api/reports', report(), { email_verified: false })).status, 403);
  assert.equal((await f.call('player1', '/api/reports', report())).status, 201);
  assert.equal((await f.call('player1', '/api/reports', report())).status, 201);
  assert.equal((await f.call('player1', '/api/reports', report())).status, 429);
  assert.equal((await f.call('owner1', '/api/admin/reports')).data.reports.length, 2);
});

test('report submission fails closed if quota storage is unavailable', async () => {
  const f = setup(), get = f.env.ACCOUNTS.get;
  f.env.ACCOUNTS.get = name => name.startsWith('rl:uid:') && name.endsWith('player1') ? {
    fetch: async (url, opts) => JSON.parse(opts.body).kind === 'reports' ? Promise.reject(new Error('storage unavailable')) : get(name).fetch(url, opts)
  } : get(name);
  assert.equal((await f.call('player1', '/api/reports', report())).status, 429);
  assert.equal((await f.call('owner1', '/api/admin/reports')).data.reports.length, 0);
});

test('report pagination returns every report once and validates its cursor', async () => {
  const f = setup();
  const stub = f.env.ACCOUNTS.get('u:__admin');
  for (let i = 0; i < 53; i++) await stub.fetch('https://acct/report-create', { method: 'POST', body: JSON.stringify({ report: { ...report(), title: 'Report ' + i, uid: 'player1' } }) });
  const first = (await f.call('owner1', '/api/admin/reports')).data;
  assert.equal(first.reports.length, 50); assert.ok(first.cursor);
  const second = (await f.call('owner1', '/api/admin/reports?cursor=' + encodeURIComponent(first.cursor))).data;
  assert.equal(second.reports.length, 3); assert.equal(second.cursor, null);
  assert.equal(new Set([...first.reports, ...second.reports].map(r => r.id)).size, 53);
  assert.equal((await f.call('owner1', '/api/admin/reports?cursor=profile')).status, 400);
});

test('an OP (Admin panel) sees players and reports and edits other accounts, but never roles or the owner', async () => {
  const f = setup(); for (const id of ['owner1', 'player1', 'player2']) await f.call(id, '/api/me');
  const p2 = (await f.call('player2', '/api/me')).data;
  assert.equal((await f.call('player1', '/api/admin/players')).status, 403);          // not an OP yet
  assert.equal((await f.call('player2', '/api/admin/roles', { uid: 'player1', op: true, collab: false })).status, 403);
  assert.equal((await f.call('owner1', '/api/admin/roles', { uid: 'player1', op: true, collab: true })).status, 200);
  const me = (await f.call('player1', '/api/me')).data;
  assert.equal(me.op, true); assert.equal(me.collab, true); assert.equal(me.owner, false);
  // the player list and account details: emails yes, roles no
  const list = (await f.call('player1', '/api/admin/players')).data.players;
  assert.equal(list.find(x => x.uid === 'player2').email, 'player2@example.invalid');
  assert.ok(list.every(x => x.roles === undefined && x.owner === undefined), 'admins never see roles');
  const other = (await f.call('player1', '/api/admin/account?uid=player2')).data;
  assert.equal(other.uid, 'player2'); assert.equal(other.info.email, 'player2@example.invalid'); assert.equal(other.profile.roles, undefined);
  const self = (await f.call('player1', '/api/admin/account?uid=player1')).data;
  assert.equal(self.profile.roles, undefined);
  // editing another player works and is logged with the admin's name
  const saved = await f.call('player1', '/api/admin/account', { ...edit(p2), uid: 'player2' });
  assert.equal(saved.status, 200); assert.equal(saved.data.profile.roles, undefined);
  assert.equal((await f.call('player2', '/api/me')).data.beaten, 10);
  assert.equal((await f.call('owner1', '/api/admin/account?uid=player2')).data.history[0].actor.uid, 'player1');
  // the owner's account can never be changed by an admin
  const owner = (await f.call('owner1', '/api/me')).data;
  assert.equal((await f.call('player1', '/api/admin/account', { ...edit(owner), uid: 'owner1', beaten: 0, wins: 0, unlocked: [] })).status, 409);
  assert.equal((await f.call('owner1', '/api/me')).data.beaten, 30);
  // bug reports: read, update and delete
  await f.call('player2', '/api/reports', report());
  const r = (await f.call('player1', '/api/admin/reports')).data.reports[0];
  assert.equal((await f.call('player1', '/api/admin/reports', { id: r.id, expectedUpdated: r.updated, status: 'resolved', notes: 'Fixed' })).status, 200);
  assert.equal((await f.call('player1', '/api/admin/reports/delete', { id: r.id })).status, 200);
  // never roles or leaderboard edits
  assert.equal((await f.call('player1', '/api/admin/roles', { uid: 'player2', op: true, collab: true })).status, 403);
  assert.equal((await f.call('player1', '/api/admin/board', { uid: 'player2', set: { wins: 5 } })).status, 403);
  assert.equal((await f.call('player1', '/api/admin/board/order', { section: 'wins', reset: true })).status, 403);
  // a collab label alone gives no powers, and removing OP takes the powers away again
  await f.call('owner1', '/api/admin/roles', { uid: 'player1', op: false, collab: true });
  assert.equal((await f.call('player1', '/api/admin/players')).status, 403);
  assert.equal((await f.call('owner1', '/api/admin/roles', { uid: 'owner1', op: true, collab: true })).status, 409);
  assert.equal((await f.call('owner1', '/api/admin/roles', { uid: 'player1', op: 'yes', collab: true })).status, 400);
});

test('the owner sees every player with email and online status; nobody else does', async () => {
  const f = setup(); await f.call('player1', '/api/me'); await f.call('player2', '/api/me');
  const list = (await f.call('owner1', '/api/admin/players')).data.players;
  const p1 = list.find(x => x.uid === 'player1');
  assert.equal(p1.email, 'player1@example.invalid'); assert.equal(p1.online, true); assert.equal(p1.name, 'player1');
  const detail = (await f.call('owner1', '/api/admin/account?uid=player2')).data;
  assert.equal(detail.info.email, 'player2@example.invalid'); assert.equal(detail.info.online, true);
  // players who only exist in the username list (not signed in since this update) still appear, without an email
  await f.env.ACCOUNTS.get('u:__names').fetch('https://acct/claim', { method: 'POST', body: JSON.stringify({ name: 'oldplayer', uid: 'old1' }) });
  const old = (await f.call('owner1', '/api/admin/players')).data.players.find(x => x.uid === 'old1');
  assert.equal(old.name, 'oldplayer'); assert.equal(old.email, ''); assert.equal(old.online, false);
  assert.equal((await f.call('player1', '/api/ping', {})).status, 200);
  assert.equal((await f.call('player1', '/api/admin/players')).status, 403);
});

test('the Owner panel lists the owner first, then Collab, then OP, then players; the Admin panel keeps its normal order', async () => {
  const f = setup(); for (const id of ['owner1', 'opper', 'collabber', 'plain1']) await f.call(id, '/api/me');
  await f.call('owner1', '/api/admin/roles', { uid: 'opper', op: true, collab: false });
  await f.call('owner1', '/api/admin/roles', { uid: 'collabber', op: false, collab: true });
  const ids = list => list.map(x => x.uid);
  assert.deepEqual(ids((await f.call('owner1', '/api/admin/players')).data.players), ['owner1', 'collabber', 'opper', 'plain1']);
  // the Admin panel: no role order (that would give roles away), same as before
  const adminList = (await f.call('opper', '/api/admin/players')).data.players;
  const normal = [...adminList].sort((a, b) => (b.online - a.online) || (b.seen - a.seen) || a.name.localeCompare(b.name));
  assert.deepEqual(ids(adminList), ids(normal));
});

test('only the owner may use a 1-2 letter username', async () => {
  const f = setup(); await f.call('owner1', '/api/me'); await f.call('player1', '/api/me');
  await f.call('owner1', '/api/admin/roles', { uid: 'player1', op: true, collab: false });
  assert.equal((await f.call('player1', '/api/name', { name: 'R' })).status, 400);
  assert.equal((await f.call('player1', '/api/name', { name: 'Ry' })).status, 400);
  assert.equal((await f.call('owner1', '/api/name', { name: 'R' })).status, 200);
  assert.equal((await f.call('owner1', '/api/me')).data.name, 'R');
  assert.equal((await f.call('player1', '/api/name', { name: 'r' })).status, 400);
  assert.equal((await f.call('owner1', '/api/name', { name: 'bad name' })).status, 400);
});

test('the owner can delete a bug report; others cannot', async () => {
  const f = setup(); await f.call('player1', '/api/me');
  await f.call('player1', '/api/reports', report());
  const r = (await f.call('owner1', '/api/admin/reports')).data.reports[0];
  assert.equal((await f.call('player1', '/api/admin/reports/delete', { id: r.id })).status, 403);
  assert.equal((await f.call('admin1', '/api/admin/reports/delete', { id: r.id })).status, 403);
  assert.equal((await f.call('owner1', '/api/admin/reports/delete', { id: 'nope' })).status, 400);
  assert.equal((await f.call('owner1', '/api/admin/reports/delete', { id: r.id })).status, 200);
  assert.equal((await f.call('owner1', '/api/admin/reports')).data.reports.length, 0);
  assert.equal((await f.call('owner1', '/api/admin/reports/delete', { id: r.id })).status, 404);
});
