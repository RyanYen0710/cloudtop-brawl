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
  const { worker, Accounts, isAdmin } = vm.runInContext('({ worker, Accounts, isAdmin })', context);
  const env = { FIREBASE_PROJECT_ID: 'test-project', ALLOWED_ORIGINS: 'https://game.example.invalid',
    ADMIN_EMAILS: email('admin1'), OWNER_EMAILS: email('owner1'), TESTER_EMAILS: email('oldtester'),
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
  return { env, objects, call, isAdmin, worker };
}
const edit = p => ({ uid: 'player1', revision: p.revision || 0, beaten: 10, wins: 7, unlocked: ['hsi'], reason: 'Restore lost progress' });
const report = () => ({ title: 'Boss jump gets stuck', details: 'The fighter stops moving after jumping near the ledge.',
  steps: 'Choose a fighter, jump into the ledge.', category: 'gameplay', severity: 'medium', context: { screen: 'boss', mode: 'solo', level: 10, browser: 'test browser' } });

test('only explicitly allowlisted verified accounts are admins; legacy tester and owner lists grant no admin role', async () => {
  const f = setup();
  for (const id of ['player1', 'oldtester', 'owner1']) {
    assert.equal((await f.call(id, '/api/me')).data.admin, false);
    assert.equal((await f.call(id, '/api/admin/reports')).status, 403);
    assert.equal((await f.call(id, '/api/admin/account', { admin: true, uid: id })).status, 403);
  }
  assert.equal((await f.call('admin1', '/api/me')).data.admin, true);
  assert.equal((await f.call('admin1', '/api/admin/reports', undefined, { email_verified: false })).status, 403);
  f.env.ADMIN_EMAILS += ',' + email('admin2');
  assert.equal((await f.call('admin2', '/api/me')).data.admin, true);
  f.env.ADMIN_EMAILS += ',' + email('admin3');
  assert.equal((await f.call('admin1', '/api/admin/reports')).status, 403);
  f.env.ADMIN_EMAILS = '';
  assert.equal((await f.call('admin1', '/api/admin/reports')).status, 403);
});

test('unsigned, expired, wrong-project tokens and disallowed origins cannot use admin routes', async () => {
  const f = setup();
  const parts = token('admin1').split('.'); parts[2] = Buffer.from('forged signature').toString('base64url');
  const forged = await f.worker.fetch(new Request('https://worker.example.invalid/api/admin/reports', {
    headers: { origin: 'https://game.example.invalid', authorization: 'Bearer ' + parts.join('.') }
  }), f.env);
  assert.equal(forged.status, 401);
  assert.equal((await f.call('admin1', '/api/admin/reports', undefined, { exp: 0 })).status, 401);
  assert.equal((await f.call('admin1', '/api/admin/reports', undefined, { aud: 'other' })).status, 401);
  assert.equal((await f.call('admin1', '/api/admin/reports', undefined, {}, 'https://evil.example.invalid')).status, 403);
  assert.equal((await f.call('admin1', '/api/admin/reports', undefined, { firebase: { sign_in_provider: 'anonymous' } })).status, 401);
});

test('account lookup and grants save only approved fields, earned bosses, and a durable before/after audit', async () => {
  const f = setup(); const p = (await f.call('player1', '/api/me')).data;
  const found = await f.call('admin1', '/api/admin/account?username=player1');
  assert.equal(found.data.uid, 'player1');
  const changed = await f.call('admin1', '/api/admin/account', { ...edit(p), owner: true, admin: true, name: 'hacked' });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.profile.beaten, 10);
  assert.equal(changed.data.profile.wins, 7);
  assert.ok(changed.data.profile.unlocked.includes('hsi'));
  assert.ok(changed.data.profile.unlocked.includes('yen'));
  const current = (await f.call('player1', '/api/me')).data;
  assert.equal(current.name, 'player1'); assert.equal(current.owner, false); assert.equal(current.admin, false);
  const detail = (await f.call('admin1', '/api/admin/account?uid=player1')).data;
  assert.equal(detail.history.length, 1); assert.equal(detail.history[0].actor.uid, 'admin1');
  assert.equal(detail.history[0].before.beaten, 0); assert.equal(detail.history[0].after.beaten, 10);
  assert.equal(detail.history[0].reason, 'Restore lost progress');
  const reset = await f.call('admin1', '/api/admin/account', { ...edit(detail.profile), beaten: 0, wins: 0, unlocked: [], reason: 'Reset testing account' });
  assert.equal(reset.status, 200); assert.deepEqual(reset.data.profile.unlocked, []);
});

test('invalid edits, unknown accounts and stale revisions leave saved progress unchanged', async () => {
  const f = setup(); const p = (await f.call('player1', '/api/me')).data;
  for (const data of [{ ...edit(p), beaten: 999 }, { ...edit(p), beaten: 1.5 }, { ...edit(p), wins: -1 },
    { ...edit(p), unlocked: ['not-a-fighter'] }, { ...edit(p), unlocked: ['yenlegend'] }, { ...edit(p), reason: '' }])
    assert.equal((await f.call('admin1', '/api/admin/account', data)).status, 400);
  assert.equal((await f.call('admin1', '/api/admin/account?uid=missing')).status, 404);
  assert.equal((await f.call('admin1', '/api/admin/account', { ...edit(p), uid: 'missing' })).status, 404);
  assert.equal((await f.call('player1', '/api/me')).data.beaten, 0);
  await f.call('admin1', '/api/admin/account', edit(p));
  assert.equal((await f.call('admin1', '/api/admin/account', edit(p))).status, 409);
  assert.equal((await f.call('player1', '/api/me')).data.beaten, 10);
});

test('simultaneous admin edits do not overwrite each other and boss results invalidate stale edits', async () => {
  const f = setup(); const p = (await f.call('player1', '/api/me')).data;
  const [a, b] = await Promise.all([f.call('admin1', '/api/admin/account', edit(p)), f.call('admin1', '/api/admin/account', { ...edit(p), beaten: 20 })]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  const now = (await f.call('admin1', '/api/admin/account?uid=player1')).data.profile;
  await f.env.ACCOUNTS.get('u:player1').fetch('https://acct/beat', { method: 'POST', body: JSON.stringify({ level: now.beaten + 1 }) });
  assert.equal((await f.call('admin1', '/api/admin/account', edit(now))).status, 409);
});

test('creator auto-unlocks remain protected from admin reset', async () => {
  const f = setup(); const owner = (await f.call('owner1', '/api/me')).data;
  assert.equal(owner.beaten, 30); assert.ok(owner.unlocked.includes('yen'));
  assert.equal((await f.call('admin1', '/api/admin/account', { ...edit(owner), uid: 'owner1', beaten: 0, wins: 0, unlocked: [] })).status, 409);
  assert.equal((await f.call('owner1', '/api/me')).data.beaten, 30);
});

test('players submit private reports; admins review, update and detect conflicting edits', async () => {
  const f = setup(); await f.call('player1', '/api/me');
  const created = await f.call('player1', '/api/reports', { ...report(), uid: 'admin1', status: 'resolved', notes: 'forged' });
  assert.equal(created.status, 201);
  assert.equal((await f.call('player1', '/api/admin/reports')).status, 403);
  assert.equal((await f.call('player1', '/api/reports')).status, 404);
  const inbox = (await f.call('admin1', '/api/admin/reports')).data;
  assert.equal(inbox.reports.length, 1); const r = inbox.reports[0];
  assert.equal(r.uid, 'player1'); assert.equal(r.status, 'open'); assert.equal(r.notes, '');
  const data = { id: r.id, expectedUpdated: r.updated, status: 'investigating', notes: 'Reproduced on level 10' };
  assert.equal((await f.call('admin1', '/api/admin/reports', data)).status, 200);
  assert.equal((await f.call('admin1', '/api/admin/reports', data)).status, 409);
  const updated = (await f.call('admin1', '/api/admin/reports')).data.reports[0];
  assert.equal(updated.updatedBy.uid, 'admin1'); assert.equal(updated.status, 'investigating');
});

test('report validation and quotas reject spam without storing it', async () => {
  const f = setup();
  assert.equal((await f.call('player1', '/api/reports', { ...report(), title: '' })).status, 400);
  assert.equal((await f.call('player1', '/api/reports', report(), { email_verified: false })).status, 403);
  assert.equal((await f.call('player1', '/api/reports', report())).status, 201);
  assert.equal((await f.call('player1', '/api/reports', report())).status, 201);
  assert.equal((await f.call('player1', '/api/reports', report())).status, 429);
  assert.equal((await f.call('admin1', '/api/admin/reports')).data.reports.length, 2);
});

test('report submission fails closed if quota storage is unavailable', async () => {
  const f = setup(), get = f.env.ACCOUNTS.get;
  f.env.ACCOUNTS.get = name => name.startsWith('rl:uid:') && name.endsWith('player1') ? {
    fetch: async (url, opts) => JSON.parse(opts.body).kind === 'reports' ? Promise.reject(new Error('storage unavailable')) : get(name).fetch(url, opts)
  } : get(name);
  assert.equal((await f.call('player1', '/api/reports', report())).status, 429);
  assert.equal((await f.call('admin1', '/api/admin/reports')).data.reports.length, 0);
});

test('report pagination returns every report once and validates its cursor', async () => {
  const f = setup();
  const stub = f.env.ACCOUNTS.get('u:__admin');
  for (let i = 0; i < 53; i++) await stub.fetch('https://acct/report-create', { method: 'POST', body: JSON.stringify({ report: { ...report(), title: 'Report ' + i, uid: 'player1' } }) });
  const first = (await f.call('admin1', '/api/admin/reports')).data;
  assert.equal(first.reports.length, 50); assert.ok(first.cursor);
  const second = (await f.call('admin1', '/api/admin/reports?cursor=' + encodeURIComponent(first.cursor))).data;
  assert.equal(second.reports.length, 3); assert.equal(second.cursor, null);
  assert.equal(new Set([...first.reports, ...second.reports].map(r => r.id)).size, 53);
  assert.equal((await f.call('admin1', '/api/admin/reports?cursor=profile')).status, 400);
});
