'use strict';
// Run after building: node --test server/test/tester-mode.cjs
// Admin test mode: only admins can start a test Boss Fight, any level and fighter is allowed,
// and a test run never writes anything to the player's account.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function setup(admin) {
  let now = 1000;
  const messages = [], accountWrites = [];
  const context = vm.createContext({
    Date: class extends Date { static now() { return now; } },
    setInterval: () => 1, clearInterval: () => {},
    env: { ACCOUNTS: {
      idFromName: name => name,
      get: () => ({ fetch: async (url, options) => {
        if (!url.endsWith('/hit') && !url.endsWith('/get')) accountWrites.push(url);
        return { json: async () => url.endsWith('/hit') ? { ok: true } : { name: 'Tester', beaten: 0, unlocked: [] } };
      } })
    } }
  });
  const worker = readFileSync(join(__dirname, '../src/worker.js'), 'utf8')
    .replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = ');
  vm.runInContext(worker, context);
  const { Room, BOSS_LEVELS } = vm.runInContext('({ Room, BOSS_LEVELS })', context);
  const room = new Room({}, context.env);
  const player = { id: 'player', uid: 'player-uid', tester: admin, authUntil: now + 3600000, pres: { ib: 0, ic: Array(10).fill(0) },
    ws: { send: raw => messages.push(JSON.parse(raw)) }, win: now, n: 0, ip: 'test' };
  room.clients.set(player.id, player); room.boss = true;
  return { room, player, messages, accountWrites, BOSS_LEVELS, later: ms => { now += ms; } };
}
const finish = async (f, win) => {
  const room = f.room;
  room.g.over = true; room.g.overT = 200; room.g.winTid = win ? 0 : 1;
  room.g.fighters.forEach(x => { x.ctrl = { type: 'none' }; });
  f.later(17); room.tick();
  await new Promise(r => setTimeout(r, 0));
};

test('a normal player cannot start a test run or a locked level', async () => {
  const f = setup(false);
  await f.room.startBoss(f.player, { level: 30, char: 'yen', test: 1 });
  assert.equal(f.room.g, null);
  assert.equal(f.messages.at(-1).err, 'not-admin');
  await f.room.startBoss(f.player, { level: 30, char: 'yen' });
  assert.equal(f.room.g, null);
  assert.equal(f.messages.at(-1).err, 'locked');
});

test('an admin can run any level with a locked fighter', async () => {
  const f = setup(true);
  await f.room.startBoss(f.player, { level: f.BOSS_LEVELS.length, char: 'yen', test: 1 });
  assert.ok(f.room.g);
  assert.equal(f.room.bossRun.test, true);
  assert.equal(f.room.g.fighters[0].c.id, 'yen');
});

test('an expired admin session cannot run a test fight', async () => {
  const f = setup(true);
  f.later(3600001);
  await f.room.startBoss(f.player, { level: 30, char: 'yen', test: 1 });
  assert.equal(f.room.g, null);
  assert.equal(f.messages.at(-1).err, 'not-admin');
});

test('a won test run is reported but never saved to the account', async () => {
  const f = setup(true);
  await f.room.startBoss(f.player, { level: 12, char: 'yen', test: 1 });
  await finish(f, true);
  const res = f.messages.map(m => m.d && m.d.bossRes).filter(Boolean).at(-1);
  assert.equal(res.test, 1);
  assert.equal(res.win, true);
  assert.equal(res.level, 12);
  assert.deepEqual(f.accountWrites, []);
});

test('a normal won run still saves progress', async () => {
  const f = setup(false);
  await f.room.startBoss(f.player, { level: 1, char: 'tseng' });
  await finish(f, true);
  assert.ok(f.accountWrites.some(u => u.endsWith('/beat')));
});
