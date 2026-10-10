'use strict';
/* ===== CLOUDTOP BRAWL — event mode rules (the game server uses this same file) =====
   Every seasonal event (stages3.js) has 3 buffed fighters. In event matches (Event Vs CPU, or an online lobby with
   event rules on) they hit 20% harder, move 10% faster and get launched 20% less, but a buff never pushes a stat past
   Legend Yen's (he stays the strongest). Event wins go on the event leaderboard; when the event ends the top 10 get XP. */

const EVENT_BUFFS = {
  thanksgiving: ['titan', 'ulfgar', 'rowan'],
  halloween: ['nyx', 'echo', 'blaze'],
  christmas: ['mira', 'lumi', 'rivet'],
  cny: ['tseng', 'chui', 'kiro'],
  spring: ['zephyr', 'talon', 'nova'],
  summer: ['volt', 'guo', 'titan']
};
const EVENT_BUFF = { pow: 1.2, spd: 1.1, kb: 0.8 };
const EVENT_CPU_LVL = 7;   // the CPU in Event Vs CPU: good, but beatable
const EVENT_PRIZES = [10000, 6000, 4000, 1500, 1500, 1500, 1500, 1500, 1500, 1500];   // XP for places 1-10
const EVENT_WIN_GAP = 60000;   // event wins count at most once a minute per player

function eventBuffed(ev) { return (ev && EVENT_BUFFS[ev]) || []; }
/* the event that's on now, as one occurrence: { id, key, start, end } (day numbers, Vancouver time), or null */
function evOccurrence(now) {
  const t = evToday(now == null ? Date.now() : now);
  for (const y of [t.y - 1, t.y]) for (const [id, a, b] of evWindows(y)) if (t.n >= a && t.n <= b) return { id, key: id + '-' + a, start: a, end: b, daysLeft: b - t.n + 1 };
  return null;
}
/* a buffed fighter's physics: stronger, faster, harder to launch, but never past Legend Yen in any of those */
function evBuffPhys(ph) {
  const Y = typeof CHAR !== 'undefined' && CHAR.yen ? physFor(CHAR.yen) : null;
  const up = (v, k, cap) => (cap == null ? v * k : Math.max(v, Math.min(v * k, cap)));
  return Object.assign({}, ph, {
    pm: up(ph.pm, EVENT_BUFF.pow, Y && Y.pm), run: up(ph.run, EVENT_BUFF.spd, Y && Y.run), air: up(ph.air, EVENT_BUFF.spd, Y && Y.air),
    wf: Y ? Math.min(ph.wf, Math.max(ph.wf * EVENT_BUFF.kb, Y.wf)) : ph.wf * EVENT_BUFF.kb
  });
}
/* event matches: the buffed fighters get their buff when the match starts */
if (typeof makeGame === 'function') {
  const makeGamePlain = makeGame;
  makeGame = function (cfg) {
    const g = makeGamePlain(cfg), list = cfg && cfg.evMode ? eventBuffed(cfg.evMode) : [];
    if (list.length) g.fighters.forEach(f => { if (list.indexOf(f.c.id) >= 0) { f.evb = true; f.ph = evBuffPhys(f.ph); } });
    return g;
  };
}
