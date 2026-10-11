'use strict';
/* ===== CLOUDTOP BRAWL — event mode rules (the game server uses this same file) =====
   Every seasonal event (stages3.js) has 3 buffed fighters. In event matches (Event Vs CPU, or an online lobby with
   event rules on) they hit 20% harder, move 10% faster and get launched 20% less, but a buff never pushes a stat past
   Legend Yen's (he stays the strongest). They also get upgraded moves (EVENT_UPGRADES) in event matches only.
   Event wins go on the event leaderboard; when the event ends the top 10 get XP. */

const EVENT_BUFFS = {
  thanksgiving: ['titan', 'talon', 'chui'],
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

/* upgraded moves for the buffed fighters, in event matches only. Each move lists only what changes; note says what's new */
const EVENT_UPGRADES = {
  titan: {
    neutral: { charge: 44, dmg: 17, quake: { dmg: 7, b: 6, g: 0.8, angle: 60, hw: 3.4 }, note: 'Mega Punch charges faster and sends a shockwave along the ground' },
    side: { dur: 26, vx: 15.5, crack: true, finalB: 9.5, note: 'Gorilla Rush goes farther, cracks the ground and ends with a big shove' },
    up: { vy: 22, dmg: 13, note: 'Titan Leap jumps higher and hits harder' },
    down: { twice: true, end: 26, note: 'Earthquake Slam shakes the ground twice' }
  },
  talon: {
    neutral: { size: 48, pull: 0.55, pullR: 180, burst: { dmg: 9, b: 9, g: 1.0, angle: 85, r: 120, fx: 'leafburst' }, note: 'Leaf Tornado is bigger and pulls enemies in' },
    side: { max: 2, spread: [-6, 24], note: 'Hawk Call sends out 2 hawks' },
    up: { dur: 540, note: 'Soar lasts 9 seconds' },
    down: { max: 5, spread: [-20, -6, 8, 22, 36], note: 'Feather Fan throws 5 feathers' }
  },
  chui: {
    neutral: { child: { twin: true }, note: 'Shark Summon releases 2 sharks, one each way' },
    side: { child: { chain: 300 }, note: 'Volt Eel\'s shock jumps to a second enemy' },
    up: { dur: 220, speed: 6.6, note: 'Sky Ray flies longer and faster' },
    down: { hw: 3.6, final: { dmg: 9, b: 9, g: 1.05, angle: 45 }, note: 'Mind Spirit reaches farther and shoves harder' }
  }
};
/* a buffed fighter's upgraded moves (the plain moves with the changes on top) */
const EVU_CACHE = {};
function evUpgraded(id, base) {
  const U = EVENT_UPGRADES[id]; if (!U || !base) return base;
  if (EVU_CACHE[id] && EVU_CACHE[id].base === base) return EVU_CACHE[id].sp;
  const sp = {};
  Object.keys(base).forEach(w => {
    const u = U[w]; if (!u) { sp[w] = base[w]; return; }
    const m = Object.assign({}, base[w], u, { upgraded: true });
    delete m.note;
    if (u.child && base[w].child) m.child = Object.assign({}, base[w].child, u.child);
    sp[w] = m;
  });
  EVU_CACHE[id] = { base, sp };
  return sp;
}
const evUpgradeNotes = id => { const U = EVENT_UPGRADES[id]; return U ? ['neutral', 'side', 'up', 'down'].filter(w => U[w]).map(w => U[w].note) : []; };
if (typeof fSpecials === 'function') {
  const fSpecialsPlain = fSpecials;
  fSpecials = function (f) { const s = fSpecialsPlain(f); return f && f.evb && f.c && !f.c.modes ? evUpgraded(f.c.id, s) : s; };
}

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
