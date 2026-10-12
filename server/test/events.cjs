'use strict';
// Run after building: node --test server/test/events.cjs
// Seasonal events: the calendar (Canadian dates, Chinese New Year by the lunar calendar), the event maps,
// and the game server picking event maps for Ranked / the CPU Ladder only during their event.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const SRC = readFileSync(join(__dirname, '../src/worker.js'), 'utf8').replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = ');
function load(extra) {
  const context = vm.createContext(Object.assign({ console, Intl, setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {} }, extra || {}));
  vm.runInContext(SRC, context);
  return context;
}
const at = s => new Date(s + 'T20:00:00Z').getTime();   // noon in Vancouver

test('the event calendar: Canadian Thanksgiving, Halloween, Christmas, Chinese New Year, Spring Break, Summer', () => {
  const c = load(), info = vm.runInContext('eventInfo', c);
  const id = s => { const e = info(at(s)); return e ? e.id : null; };
  const cases = {
    '2026-10-04': null, '2026-10-05': 'thanksgiving', '2026-10-12': 'thanksgiving', '2026-10-13': 'halloween', '2026-11-01': 'halloween', '2026-11-02': null,
    '2026-12-01': 'christmas', '2026-12-25': 'christmas', '2027-01-01': 'christmas', '2027-01-02': null,
    '2027-02-02': null, '2027-02-03': 'cny', '2027-02-06': 'cny', '2027-02-20': 'cny', '2027-02-21': null, '2028-01-23': 'cny',
    '2027-03-12': null, '2027-03-13': 'spring', '2027-03-28': 'spring', '2027-03-29': null,
    '2027-06-30': null, '2027-07-01': 'summer', '2027-09-06': 'summer', '2027-09-07': null,
    '2027-10-04': 'thanksgiving', '2027-10-11': 'thanksgiving', '2027-10-12': 'halloween'
  };
  for (const [d, want] of Object.entries(cases)) assert.equal(id(d), want, d);
  assert.equal(info(at('2026-10-10')).daysLeft, 3);
  assert.equal(info(at('2026-11-01')).daysLeft, 1);
});

/* runs inside the game's own context: a short match on stage i */
function playOn(i) {
  const g = makeGame({ stage: i, stocks: 3, time: 3, teams: false, slots: [
    { type: 'cpu', char: 'titan', lvl: 9, team: 0, ctrl: { type: 'cpu' }, name: 'A', tag: 'A' },
    { type: 'cpu', char: 'zephyr', lvl: 9, team: 1, ctrl: { type: 'cpu' }, name: 'B', tag: 'B' }] });
  g.fighters.forEach(f => { f.ctrl = { type: 'dummy', mode: 'stand' }; });   // standing still first: both land on the stage
  let landed = 0;
  for (let k = 0; k < 150; k++) stepGame(g, g.fighters.map(() => ({ b: 0, pr: 0 })));
  landed = g.fighters.filter(f => f.ground).length;
  g.fighters.forEach(f => { f.ctrl = { type: 'cpu' }; });   // then two CPUs fight on it
  for (let k = 0; k < 900; k++) stepGame(g, g.fighters.map(f => aiThink(f, g)));
  return { landed, ok: g.fighters.every(f => Number.isFinite(f.x) && Number.isFinite(f.y)), id: g.stage.id };
}

test('event maps are added after the 8 normal stages, every event has 2-3 of them, and each one is playable', () => {
  const c = load();
  const ids = JSON.parse(vm.runInContext('JSON.stringify(STAGES.map(s => s.id + ":" + (s.event || "")))', c));
  assert.deepEqual(ids.slice(0, 8).map(x => x.split(':')[0]), ['temple', 'ruins', 'roof', 'forge', 'peak', 'orbit', 'cove', 'dojo']);
  const byEvent = {};
  ids.slice(8).forEach(x => { const [s, e] = x.split(':'); assert.ok(e, s + ' belongs to an event'); if (e !== 'boss') (byEvent[e] = byEvent[e] || []).push(s); });   // 'boss': Boss Fight-only maps
  assert.deepEqual(Object.keys(byEvent).sort(), ['christmas', 'cny', 'halloween', 'spring', 'summer', 'thanksgiving']);
  for (const [e, list] of Object.entries(byEvent)) assert.ok(list.length >= 2 && list.length <= 3, e);
  const play = vm.runInContext('(' + playOn.toString() + ')', c);
  for (let i = 8; i < ids.length; i++) {
    const r = play(i);
    assert.equal(r.landed, 2, r.id + ': both fighters land on the stage after spawning');
    assert.ok(r.ok, r.id);
  }
});

test('Random stage: normal stages outside events; during an event about half are its maps, never another event\'s', () => {
  const c = load(), pick = vm.runInContext('pickStage', c), ev = vm.runInContext('i => STAGES[i].event || null', c);
  let n = 0;
  for (let i = 0; i < 2000; i++) { const s = pick(null); assert.equal(ev(s), null); }
  for (let i = 0; i < 2000; i++) { const e = ev(pick('halloween')); assert.ok(e === null || e === 'halloween'); if (e) n++; }
  assert.ok(n > 800 && n < 1200, String(n));
  const vis = vm.runInContext('stageVisible', c), idx = vm.runInContext('STAGES.findIndex(s => s.id === "manor")', c);
  assert.equal(vis(idx, 'halloween'), true); assert.equal(vis(idx, 'christmas'), false); assert.equal(vis(idx, null), false); assert.equal(vis(0, null), true);
});

test('the game server uses the event maps for the CPU Ladder only during the event', async () => {
  for (const [day, want] of [['2026-10-20', 'halloween'], ['2026-11-20', null]]) {
    const now = at(day);
    const c = load({ Date: class extends Date { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } },
      env: { ACCOUNTS: { idFromName: n => n, get: () => ({ fetch: async (url) => ({ json: async () => url.endsWith('/hit') ? { ok: true } : { name: 'P', xp: 1000, unlocked: [], ladder: 2 } }) }) } } });
    const { Room } = vm.runInContext('({ Room })', c);
    const room = new Room({}, c.env); room.mode = 'ladder';
    const cl = { id: 'pa', uid: 'u1', pres: {}, ws: { send() {} } }; room.clients.set('pa', cl);
    const seen = new Set();
    for (let i = 0; i < 40; i++) { room.g = null; await room.startLadder(cl, { char: 'titan' }); seen.add(room.g.stage.id); }
    const events = vm.runInContext('ids => ids.map(id => (STAGES.find(s => s.id === id) || {}).event || null)', c)([...seen]);
    if (want) assert.ok(events.includes(want), 'some Halloween maps: ' + [...seen]);
    assert.ok(events.every(e => e === null || e === want), day + ': ' + [...seen]);
  }
});
