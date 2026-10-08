'use strict';
// Run after building: node --test server/test/boss-pause.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

async function fight() {
  let now = 1000, nextTimer = 0;
  const timers = new Map(), messages = [], accountWrites = [];
  const context = vm.createContext({
    Date: class extends Date { static now() { return now; } },
    setInterval: fn => { timers.set(++nextTimer, fn); return nextTimer; },
    clearInterval: id => timers.delete(id),
    env: { ACCOUNTS: {
      idFromName: name => name,
      get: () => ({ fetch: async (url, options) => {
        if (url.endsWith('/beat')) accountWrites.push(JSON.parse(options.body));
        return { json: async () => url.endsWith('/hit') ? { ok: true } : { name: 'Tester', beaten: 0, unlocked: [] } };
      } })
    } }
  });
  const worker = readFileSync(join(__dirname, '../src/worker.js'), 'utf8')
    .replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = ');
  vm.runInContext(worker, context);
  const { Room, srvEncodeState } = vm.runInContext('({ Room, srvEncodeState })', context);
  const room = new Room({}, context.env);
  const player = { id: 'player', uid: 'player-uid', pres: { ib: 0, ic: Array(10).fill(0) },
    ws: { send: raw => messages.push(JSON.parse(raw)) }, win: now, n: 0, ip: 'test' };
  room.clients.set(player.id, player); room.boss = true;
  await room.startBoss(player, { level: 1, char: 'tseng' });
  const pause = (paused, client = player, extra = {}) => room.onMsg(client,
    JSON.stringify({ cmd: 'pause', gid: room.gid, paused, ...extra }));
  const advance = ms => { now += ms; room.tick(); };
  return { room, player, timers, messages, accountWrites, pause, advance,
    snapshot: () => JSON.stringify(srvEncodeState(room.g, room.gid)) };
}

test('pause freezes the real Boss Fight simulation and countdown; resume discards paused wall time', async () => {
  const f = await fight();
  f.advance(17);
  const frame = f.room.g.frame, time = f.room.g.timeLeft;
  assert.equal(frame, 1);
  f.pause(true);
  const frozen = f.snapshot();
  assert.equal(f.timers.size, 0);
  f.advance(10 * 60 * 1000);
  assert.equal(f.snapshot(), frozen);
  assert.equal(f.room.g.timeLeft, time);
  assert.equal(f.accountWrites.length, 0);
  assert.equal(f.messages.at(-1).d.bossPause.paused, true);
  f.pause(false);
  assert.equal(f.timers.size, 1);
  assert.equal(f.messages.at(-1).d.bossPause.paused, false);
  f.room.tick();
  assert.equal(f.room.g.frame, frame);
  f.advance(17);
  assert.equal(f.room.g.frame, frame + 1);
  assert.equal(f.room.g.timeLeft, time - 1);
});

test('only the current authenticated fight player can pause, with the current game id and a boolean', async () => {
  const f = await fight();
  const other = { ...f.player, id: 'other' };
  f.room.clients.set(other.id, other);
  f.pause(true, other);                            // even the same account on another peer
  f.pause(true, { ...f.player });                   // replaced socket
  f.pause(true, f.player, { gid: f.room.gid - 1 });
  f.pause('true');
  f.player.uid = null;
  f.pause(true);
  assert.equal(f.room.bossPaused, false);
  assert.equal(f.timers.size, 1);
  f.advance(17);
  assert.equal(f.room.g.frame, 1);
});

test('duplicate pause/resume messages do not create extra timers or reset the active clock', async () => {
  const f = await fight();
  f.pause(true); f.pause(true);
  assert.equal(f.timers.size, 0);
  f.pause(false);
  f.advance(8);
  f.pause(false);
  f.advance(9);
  assert.equal(f.timers.size, 1);
  assert.equal(f.room.g.frame, 1);
});

test('resume consumes button presses from during the pause; quitting resets pause state', async () => {
  const f = await fight();
  f.pause(true);
  f.player.pres.ic[5]++;
  f.pause(false);
  const playerFighter = f.room.g.fighters.find(p => p.ctrl.type === 'remote');
  assert.equal(f.room.input(playerFighter).pr, 0);
  f.pause(true);
  f.room.stop(true);
  assert.equal(f.room.g, null);
  assert.equal(f.room.bossRun, null);
  assert.equal(f.room.bossPaused, false);
  assert.equal(f.timers.size, 0);
});

test('pause cannot delay a finished fight or affect an ordinary online match', async () => {
  const f = await fight();
  f.room.g.over = true;
  f.pause(true);
  assert.equal(f.room.bossPaused, false);
  f.room.boss = false;
  f.room.start({ stage: 0, time: 2, stocks: 3, slots: [
    { type: 'remote', peer: f.player.id, char: 'tseng' }, { type: 'cpu', char: 'tseng', lvl: 3 }
  ] }, 42, f.player);
  f.pause(true);
  f.advance(17);
  assert.equal(f.room.bossPaused, false);
  assert.equal(f.room.g.frame, 1);
  assert.equal(f.room.g.timeLeft, 2 * 3600 - 1);
});
