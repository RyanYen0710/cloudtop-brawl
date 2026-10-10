'use strict';
/* ===== CLOUDTOP BRAWL — seasonal events and their maps =====
   One event at a time, all dates in Vancouver time (Canada), Chinese New Year from the Chinese lunar calendar:
     Thanksgiving  the week before Canadian Thanksgiving (2nd Monday of October), ending on the Monday
     Halloween     the day after Thanksgiving to Nov 1
     Christmas     Dec 1 to Jan 1
     Chinese NY    3 days before New Year's Day to the Lantern Festival (day 15)
     Spring Break  two weeks in mid-March, like BC schools (the Saturday before the 3rd Monday, for 16 days)
     Summer        Canada Day (Jul 1) to Labour Day (1st Monday of September)
   Event maps are added to the end of STAGES (so every stage number stays the same) and only show up during
   their event. The game server uses this same file, so online and Ranked matches pick the same maps. */

const EVENTS = {
  thanksgiving: { name: 'Thanksgiving', icon: '🦃' },
  halloween: { name: 'Halloween', icon: '🎃' },
  christmas: { name: 'Christmas', icon: '🎄' },
  cny: { name: 'Chinese New Year', icon: '🧧' },
  spring: { name: 'Spring Break', icon: '🌸' },
  summer: { name: 'Summer', icon: '☀️' }
};
// Chinese New Year's Day (from the Chinese lunar calendar)
const CNY_DAYS = { 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3], 2031: [1, 23], 2032: [2, 11], 2033: [1, 31], 2034: [2, 19], 2035: [2, 8] };

/* today's date in Vancouver as a day number (days since 1970) */
function evDayNum(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 86400000); }
function evToday(now) {
  try {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now));
    const v = k => +p.find(x => x.type === k).value;
    return { y: v('year'), n: evDayNum(v('year'), v('month'), v('day')) };
  } catch (e) { const d = new Date(now - 7 * 3600000); return { y: d.getUTCFullYear(), n: evDayNum(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) }; }
}
/* the n-th given weekday (0 = Sunday) of a month */
function evNthDay(y, m, wd, nth) { const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); return evDayNum(y, m, 1 + ((wd - first + 7) % 7) + (nth - 1) * 7); }
/* every event window of a year: [id, first day, last day] */
function evWindows(y) {
  const tg = evNthDay(y, 10, 1, 2), sb = evNthDay(y, 3, 1, 3) - 2, list = [
    ['thanksgiving', tg - 7, tg], ['halloween', tg + 1, evDayNum(y, 11, 1)],
    ['christmas', evDayNum(y, 12, 1), evDayNum(y + 1, 1, 1)],
    ['spring', sb, sb + 15], ['summer', evDayNum(y, 7, 1), evNthDay(y, 9, 1, 1)]];
  const c = CNY_DAYS[y]; if (c) { const d = evDayNum(y, c[0], c[1]); list.push(['cny', d - 3, d + 14]); }
  return list;
}
/* which event is on (or null), and when it ends */
function eventInfo(now) {
  const t = evToday(now == null ? Date.now() : now);
  for (const y of [t.y - 1, t.y]) for (const [id, a, b] of evWindows(y)) if (t.n >= a && t.n <= b) return { id, name: EVENTS[id].name, icon: EVENTS[id].icon, daysLeft: b - t.n + 1 };
  return null;
}
function eventNow(now) { const e = eventInfo(now); return e ? e.id : null; }
/* a stage shows up in the stage list: always for the normal ones, only during its event for event maps */
function stageVisible(i, ev) { const s = STAGES[i]; return !!s && (!s.event || s.event === ev); }
/* "Random stage": during an event, about half the time one of its maps */
function pickStage(ev, rnd) {
  rnd = rnd || Math.random;
  const evIdx = [], base = [];
  STAGES.forEach((s, i) => { if (!s.event) base.push(i); else if (s.event === ev) evIdx.push(i); });
  if (evIdx.length && rnd() < 0.5) return evIdx[Math.floor(rnd() * evIdx.length)];
  return base[Math.floor(rnd() * base.length)];
}

/* ---------- the event maps ---------- */
const EV_S = (x, y, w, h, o) => Object.assign({ x, y, w, h, solid: true }, o || {});
const EV_P = (x, y, w, o) => Object.assign({ x, y, w, h: 12, soft: true }, o || {});
const EV_STAGES = [
  // Thanksgiving
  { id: 'harvest', event: 'thanksgiving', name: 'Harvest Farm', swatch: ['#3a1d10', '#c2571c', '#ffcf6a'], blurb: 'A barn roof, hay bales and a tractor that drives back and forth',
    solids: [EV_S(470, 630, 660, 80)],
    plats: [EV_P(360, 520, 120), EV_P(1120, 520, 120), EV_P(740, 470, 140, { mx: 180, per: 600 }), EV_P(600, 370, 120), EV_P(880, 370, 120), EV_P(745, 260, 110)],
    cycle: { per: 7200, tint: '#2a0f20', max: 0.45 } },
  { id: 'maple', event: 'thanksgiving', name: 'Maple Forest', swatch: ['#2a1608', '#b5401a', '#ffa23a'], blurb: 'Tree stumps, branches and leaves that drift down',
    solids: [EV_S(330, 640, 360, 90), EV_S(910, 640, 360, 90)],
    plats: [EV_P(735, 560, 130, { my: 120, per: 480 }), EV_P(400, 500, 120), EV_P(1080, 500, 120), EV_P(560, 400, 120, { mx: 40, per: 400 }), EV_P(910, 400, 120, { mx: 40, per: 400, ph: 0.5 }), EV_P(740, 290, 120)] },
  // Halloween
  { id: 'manor', event: 'halloween', name: 'Haunted Manor', swatch: ['#120a24', '#4a2a6a', '#ff8a1f'], blurb: 'A creaky roof, sinking chimneys and windows that flicker',
    solids: [EV_S(460, 620, 680, 90)],
    plats: [EV_P(420, 500, 110, { my: 20, per: 360 }), EV_P(1070, 500, 110, { my: 20, per: 360, ph: 0.5 }), EV_P(600, 400, 130, { blink: [480, 180, 0] }), EV_P(870, 400, 130, { blink: [480, 180, 0.5] }), EV_P(740, 280, 110)],
    cycle: { per: 6000, tint: '#05020f', max: 0.4 } },
  { id: 'pumpkin', event: 'halloween', name: 'Pumpkin Patch', swatch: ['#0e0a1e', '#2e5a2a', '#ff8a1f'], blurb: 'Hay bales, giant pumpkins and a bobbing scarecrow',
    solids: [EV_S(420, 640, 760, 80)],
    plats: [EV_P(470, 530, 120), EV_P(1010, 530, 120), EV_P(740, 450, 120, { my: 60, per: 420 }), EV_P(590, 350, 120), EV_P(890, 350, 120), EV_P(745, 240, 100, { mx: 120, per: 720 })] },
  { id: 'grave', event: 'halloween', name: 'Graveyard', swatch: ['#07060f', '#2a2d3a', '#9be37a'], blurb: 'Tombstones, a floating coffin and ghost platforms that fade',
    solids: [EV_S(330, 640, 360, 90), EV_S(910, 640, 360, 90)],
    plats: [EV_P(735, 600, 130, { my: 160, per: 480 }), EV_P(380, 520, 100), EV_P(1120, 520, 100), EV_P(560, 410, 120, { blink: [420, 200, 0] }), EV_P(910, 410, 120, { blink: [420, 200, 0.5] }), EV_P(740, 290, 110, { blink: [420, 200, 0.25] })] },
  // Christmas
  { id: 'workshop', event: 'christmas', name: "Santa's Workshop", swatch: ['#1a0e1e', '#b3202a', '#3fae5a'], blurb: 'Toy shelves, a moving conveyor and a flying sleigh',
    solids: [EV_S(480, 630, 640, 80)],
    plats: [EV_P(740, 520, 140, { mx: 160, per: 600 }), EV_P(400, 450, 120), EV_P(1080, 450, 120), EV_P(600, 340, 120), EV_P(880, 340, 120), EV_P(740, 230, 120, { mx: 220, per: 900 })] },
  { id: 'village', event: 'christmas', name: 'Frozen Village', swatch: ['#1b2a52', '#9fc8ee', '#ffffff'], blurb: 'Snowy rooftops and blizzard winds',
    solids: [EV_S(400, 640, 800, 80)],
    plats: [EV_P(460, 520, 140), EV_P(1000, 520, 140), EV_P(730, 430, 140), EV_P(560, 320, 120, { my: 20, per: 400 }), EV_P(910, 320, 120, { my: 20, per: 400, ph: 0.5 })],
    hazard: 'wind', cycle: { per: 6600, tint: '#0a1030', max: 0.4 } },
  { id: 'candy', event: 'christmas', name: 'Candy Cane Peaks', swatch: ['#ffd6e4', '#e8364a', '#ffffff'], blurb: 'Two sweet peaks, candy bridges and gumdrop ledges that pop in and out',
    solids: [EV_S(330, 640, 340, 90), EV_S(930, 640, 340, 90)],
    plats: [EV_P(735, 610, 130), EV_P(460, 500, 110, { my: 30, per: 360 }), EV_P(1030, 500, 110, { my: 30, per: 360, ph: 0.5 }), EV_P(735, 400, 140), EV_P(600, 290, 110, { blink: [540, 200, 0] }), EV_P(880, 290, 110, { blink: [540, 200, 0.5] })] },
  // Chinese New Year
  { id: 'lanterns', event: 'cny', name: 'Lantern Festival Street', swatch: ['#2a0608', '#c4161c', '#ffcf3a'], blurb: 'A night market with floating lanterns',
    solids: [EV_S(460, 630, 680, 80)],
    plats: [EV_P(400, 520, 110, { my: 24, per: 300 }), EV_P(1090, 520, 110, { my: 24, per: 300, ph: 0.5 }), EV_P(600, 420, 120, { my: 24, per: 300, ph: 0.25 }), EV_P(880, 420, 120, { my: 24, per: 300, ph: 0.75 }), EV_P(740, 310, 120)],
    cycle: { per: 7200, tint: '#12020a', max: 0.35 } },
  { id: 'dragon', event: 'cny', name: 'Dragon Temple', swatch: ['#1a0a10', '#8a1a1a', '#ffd35c'], blurb: 'A dragon-dance platform sweeps across the temple',
    solids: [EV_S(500, 620, 600, 90)],
    plats: [EV_P(740, 500, 150, { mx: 200, per: 800 }), EV_P(420, 450, 110), EV_P(1070, 450, 110), EV_P(740, 340, 140), EV_P(745, 220, 100, { my: 30, per: 420 })] },
  { id: 'firecracker', event: 'cny', name: 'Firecracker Rooftops', swatch: ['#12050a', '#7a0f14', '#ffb02e'], blurb: 'Tiled rooftops, a lift and signs that flash with fireworks',
    solids: [EV_S(330, 610, 370, 150), EV_S(900, 650, 370, 150)],
    plats: [EV_P(735, 610, 120, { my: 160, per: 480 }), EV_P(380, 470, 110), EV_P(1150, 520, 110), EV_P(560, 370, 120, { blink: [360, 240, 0] }), EV_P(950, 410, 120, { blink: [360, 240, 0.5] }), EV_P(760, 270, 110)] },
  // Spring Break
  { id: 'blossom', event: 'spring', name: 'Blossom Park', swatch: ['#ffe2ef', '#ff9cc4', '#7ad06a'], blurb: 'Cherry trees, a swinging bridge and spring showers',
    solids: [EV_S(440, 640, 720, 80)],
    plats: [EV_P(480, 530, 120), EV_P(1000, 530, 120), EV_P(740, 450, 140, { mx: 80, per: 500 }), EV_P(600, 340, 120), EV_P(880, 340, 120), EV_P(745, 230, 100)],
    hazard: 'rain' },
  { id: 'boardwalk', event: 'spring', name: 'Beach Boardwalk', swatch: ['#8fdcff', '#ffe08a', '#ff7a8a'], blurb: 'A pier, a lifeguard tower and floats on the waves',
    solids: [EV_S(520, 640, 560, 70), EV_S(220, 690, 170, 60)],
    plats: [EV_P(760, 520, 130, { my: 10, per: 300 }), EV_P(1100, 560, 120, { my: 14, per: 240 }), EV_P(600, 420, 110, { mx: 60, per: 400 }), EV_P(900, 400, 110), EV_P(740, 290, 110)] },
  // Summer
  { id: 'island', event: 'summer', name: 'Tropical Island', swatch: ['#2ec4e8', '#ffe08a', '#2fa85a'], blurb: 'Palm trees and a raft that drifts overhead',
    solids: [EV_S(470, 640, 660, 80)],
    plats: [EV_P(420, 500, 110), EV_P(1070, 500, 110), EV_P(740, 420, 140, { my: 20, per: 360 }), EV_P(600, 310, 110), EV_P(880, 310, 110), EV_P(740, 210, 100, { mx: 160, per: 700 })],
    cycle: { per: 7200, tint: '#1a1040', max: 0.4 } },
  { id: 'waterpark', event: 'summer', name: 'Water Park', swatch: ['#46c8ff', '#ffffff', '#ff5aa0'], blurb: 'Two pools, a slide lift and swinging floats',
    solids: [EV_S(330, 640, 360, 90), EV_S(910, 640, 360, 90)],
    plats: [EV_P(735, 620, 130, { my: 180, per: 540 }), EV_P(400, 510, 110), EV_P(1100, 510, 110), EV_P(570, 400, 120, { mx: 40, per: 360 }), EV_P(900, 400, 120, { mx: 40, per: 360, ph: 0.5 }), EV_P(740, 280, 110)] },
  { id: 'campfire', event: 'summer', name: 'Campfire Lake', swatch: ['#0a1428', '#1f4a3a', '#ff9a3a'], blurb: 'A dock at night, a drifting canoe and firefly ledges',
    solids: [EV_S(480, 630, 640, 80)],
    plats: [EV_P(400, 520, 110, { my: 12, per: 300 }), EV_P(1080, 560, 120, { mx: 60, per: 420 }), EV_P(600, 420, 120), EV_P(880, 420, 120), EV_P(740, 310, 120), EV_P(740, 200, 90, { blink: [600, 240, 0] })],
    cycle: { per: 6000, tint: '#03050f', max: 0.35 } }
];
EV_STAGES.forEach(s => { s.blast = buildStage(s).blast; s.main = s.solids[0]; STAGES.push(s); });

/* ---------- drawing (the browser only; the game server never draws) ---------- */
const EV_R = (() => { let s = 424242; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const EV_RND = { hill: Array.from({ length: 24 }, () => EV_R()), parts: Array.from({ length: 60 }, () => ({ x: EV_R(), y: EV_R(), s: 0.6 + EV_R(), p: EV_R() * 6 })) };
const evWrap = (v, m) => ((v % m) + m) % m;

/* the sky, a moon or sun, layered silhouettes and floating bits */
const EV_BG = {
  harvest: { sky: ['#3a1d50', '#e2683a', '#ffcf6a'], orb: ['#fff1b8', 0.72, 0.3, 0.08], layers: [['#7a3a1a', 0.7, 'hills'], ['#4a2410', 0.82, 'barns']], parts: ['leaf', ['#e8742a', '#c2401a', '#ffb02e']] },
  maple: { sky: ['#4a2a18', '#b5571c', '#ffbf6a'], layers: [['#6a2a10', 0.62, 'trees'], ['#3a1608', 0.8, 'trees']], parts: ['leaf', ['#e8402a', '#ff8a1f', '#ffc23a']] },
  manor: { sky: ['#07041a', '#2a1450', '#5a2a6a'], orb: ['#fff4d0', 0.75, 0.22, 0.09], layers: [['#1a0f2e', 0.7, 'spires'], ['#0d0818', 0.85, 'deadtrees']], parts: ['bat', ['#0a0612']] },
  pumpkin: { sky: ['#0a0820', '#2a1a4a', '#6a3a5a'], orb: ['#ffe9a0', 0.25, 0.2, 0.08], layers: [['#1e2a1a', 0.72, 'hills'], ['#141e12', 0.84, 'pumpkins']], parts: ['firefly', ['#ffcf5a']] },
  grave: { sky: ['#04040a', '#141a24', '#2a3a3a'], orb: ['#e6f2ff', 0.7, 0.25, 0.07], layers: [['#141820', 0.7, 'deadtrees'], ['#0a0c12', 0.86, 'tombs']], parts: ['ghost', ['rgba(200,255,200,.35)']] },
  workshop: { sky: ['#1a0e1e', '#4a1a2a', '#8a3a3a'], layers: [['#3a1a1a', 0.7, 'shelves'], ['#2a1010', 0.86, 'gifts']], parts: ['spark', ['#ffd35c', '#ffffff']] },
  village: { sky: ['#0e1838', '#3a5a9a', '#9fc8ee'], orb: ['#f4f8ff', 0.2, 0.22, 0.06], layers: [['#c8dcf0', 0.68, 'pines'], ['#9ab8d8', 0.82, 'houses']], parts: ['snow', ['#ffffff']] },
  candy: { sky: ['#ff9cc4', '#ffd6e4', '#fff4f8'], layers: [['#ffffff', 0.66, 'peaks'], ['#f6b6cc', 0.82, 'hills']], parts: ['snow', ['#ffffff', '#ffd6e4']] },
  lanterns: { sky: ['#12020a', '#4a0a14', '#8a1a1a'], layers: [['#2a0608', 0.7, 'pagodas'], ['#1a0306', 0.85, 'buildings']], parts: ['lantern', ['#ff3a2a', '#ffb02e']] },
  dragon: { sky: ['#1a0a10', '#5a1414', '#c2401a'], orb: ['#ffe6a0', 0.72, 0.28, 0.1], layers: [['#3a0c0c', 0.68, 'pagodas'], ['#240606', 0.84, 'hills']], parts: ['spark', ['#ffd35c', '#ff6a2a']] },
  firecracker: { sky: ['#0a0208', '#2a0612', '#5a1220'], layers: [['#1e050a', 0.7, 'buildings'], ['#120306', 0.86, 'buildings']], parts: ['firework', ['#ff3a2a', '#ffd35c', '#ff8ad8']] },
  blossom: { sky: ['#9fd8ff', '#d6efff', '#fff4f8'], orb: ['#fff8d0', 0.78, 0.2, 0.07], layers: [['#a8dc8a', 0.7, 'hills'], ['#f4a6c4', 0.8, 'blossoms']], parts: ['petal', ['#ffc6d9', '#ffffff']] },
  boardwalk: { sky: ['#4ab8f0', '#9fdcff', '#fff0c8'], orb: ['#fff6b0', 0.2, 0.22, 0.07], layers: [['#2a8ac8', 0.66, 'sea'], ['#ffe08a', 0.86, 'dunes']], parts: ['gull', ['#ffffff']] },
  island: { sky: ['#2ec4e8', '#8fe4ff', '#fff4c8'], orb: ['#fff6b0', 0.75, 0.2, 0.08], layers: [['#1fa0c8', 0.66, 'sea'], ['#2fa85a', 0.8, 'palms']], parts: ['gull', ['#ffffff']] },
  waterpark: { sky: ['#46c8ff', '#a8e8ff', '#ffffff'], orb: ['#fff6b0', 0.82, 0.18, 0.07], layers: [['#ff5aa0', 0.7, 'slides'], ['#46a8e8', 0.86, 'sea']], parts: ['bubble', ['rgba(255,255,255,.7)']] },
  campfire: { sky: ['#03050f', '#0a1428', '#1a2a48'], orb: ['#f4f2e0', 0.24, 0.2, 0.06], layers: [['#0e2018', 0.7, 'pines'], ['#08140e', 0.86, 'pines']], parts: ['firefly', ['#d8ff6a', '#ffe06a']] }
};
function evSilhouette(g, vw, vh, px, col, base, kind, li) {
  g.fillStyle = col;
  const H = EV_RND.hill, par = 0.04 + li * 0.05, off = -px * par;
  if (kind === 'hills' || kind === 'dunes' || kind === 'peaks') {
    g.beginPath(); g.moveTo(0, vh);
    for (let i = 0; i <= 12; i++) { const x = i / 12 * vw * 1.3 - vw * 0.15 + off; g.lineTo(x, vh * (base - H[(i + li * 5) % 24] * (kind === 'peaks' ? 0.28 : 0.1) - (kind === 'peaks' && i % 2 ? 0.08 : 0))); }
    g.lineTo(vw, vh); g.fill(); return;
  }
  if (kind === 'sea') { g.fillRect(0, vh * base, vw, vh); g.fillStyle = 'rgba(255,255,255,.35)'; for (let r = 0; r < 5; r++) g.fillRect(evWrap(r * 173 + off * 3, vw), vh * (base + 0.03 + r * 0.035), 60, 2); return; }
  if (kind !== 'slides') g.fillRect(0, vh * base, vw, vh);
  const step = kind === 'tombs' || kind === 'pumpkins' || kind === 'gifts' ? vw / 9 : vw / 7;
  for (let i = -1; i < 10; i++) {
    const x = evWrap(i * step + off, vw + step * 2) - step, h = H[(i + 30 + li * 7) % 24], y = vh * base;
    if (kind === 'trees' || kind === 'blossoms') { g.fillRect(x - 4, y - vh * 0.12, 8, vh * 0.12); g.beginPath(); g.arc(x, y - vh * (0.13 + h * 0.05), vh * (0.06 + h * 0.03), 0, Math.PI * 2); g.arc(x - vh * 0.04, y - vh * 0.1, vh * 0.045, 0, Math.PI * 2); g.arc(x + vh * 0.04, y - vh * 0.1, vh * 0.045, 0, Math.PI * 2); g.fill(); }
    else if (kind === 'pines') { for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x, y - vh * (0.2 + h * 0.06) + k * vh * 0.05); g.lineTo(x - vh * (0.04 + k * 0.015), y - vh * (0.08 - k * 0.03)); g.lineTo(x + vh * (0.04 + k * 0.015), y - vh * (0.08 - k * 0.03)); g.fill(); } }
    else if (kind === 'deadtrees') { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - vh * (0.16 + h * 0.06)); g.moveTo(x, y - vh * 0.1); g.lineTo(x - vh * 0.05, y - vh * 0.17); g.moveTo(x, y - vh * 0.13); g.lineTo(x + vh * 0.05, y - vh * 0.2); g.stroke(); }
    else if (kind === 'spires' || kind === 'pagodas') {
      const w = vh * 0.07, top = y - vh * (0.18 + h * 0.1); g.fillRect(x - w / 2, top, w, y - top);
      if (kind === 'spires') { g.beginPath(); g.moveTo(x - w * 0.7, top); g.lineTo(x, top - vh * 0.08); g.lineTo(x + w * 0.7, top); g.fill(); g.fillStyle = 'rgba(255,200,90,.6)'; g.fillRect(x - 5, top + 14, 10, 12); g.fillStyle = col; }
      else for (let k = 0; k < 3; k++) { const yy = top + k * (y - top) / 3; g.beginPath(); g.moveTo(x - w * 1.1, yy + 8); g.quadraticCurveTo(x, yy - 10, x + w * 1.1, yy + 8); g.fill(); }
    }
    else if (kind === 'buildings' || kind === 'houses' || kind === 'barns' || kind === 'shelves') {
      const w = step * 0.7, top = y - vh * (0.08 + h * (kind === 'buildings' ? 0.22 : 0.08)); g.fillRect(x - w / 2, top, w, y - top);
      if (kind !== 'buildings' && kind !== 'shelves') { g.beginPath(); g.moveTo(x - w * 0.6, top); g.lineTo(x, top - vh * 0.06); g.lineTo(x + w * 0.6, top); g.fill(); }
      g.fillStyle = kind === 'houses' ? 'rgba(255,220,140,.75)' : kind === 'shelves' ? 'rgba(255,211,92,.35)' : 'rgba(255,190,90,.45)';
      for (let k = 0; k < 3; k++) g.fillRect(x - w / 3 + k * w / 4, top + 12, w / 8, w / 8);
      if (kind === 'houses') { g.fillStyle = '#ffffff'; g.fillRect(x - w * 0.6, top - 4, w * 1.2, 6); }
      g.fillStyle = col;
    }
    else if (kind === 'tombs') { const w = step * 0.25; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y - vh * 0.05); g.arc(x, y - vh * 0.05, w / 2, Math.PI, 0); g.lineTo(x + w / 2, y); g.fill(); }
    else if (kind === 'pumpkins') { g.fillStyle = '#e8741a'; g.beginPath(); g.ellipse(x, y - vh * 0.025, vh * 0.04, vh * 0.028, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffd35c'; g.fillRect(x - 6, y - vh * 0.03, 4, 4); g.fillRect(x + 2, y - vh * 0.03, 4, 4); g.fillStyle = col; }
    else if (kind === 'gifts') { const s = vh * 0.05; g.fillStyle = i % 2 ? '#3fae5a' : '#e8364a'; g.fillRect(x - s / 2, y - s, s, s); g.fillStyle = '#ffd35c'; g.fillRect(x - 3, y - s, 6, s); g.fillStyle = col; }
    else if (kind === 'palms') { g.strokeStyle = '#7a5030'; g.lineWidth = 6; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - vh * 0.1, x + 6, y - vh * 0.2); g.stroke(); g.fillStyle = col; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + 6 + Math.cos(k * 1.3) * vh * 0.04, y - vh * 0.2 + Math.sin(k * 1.3) * vh * 0.015, vh * 0.05, vh * 0.012, k * 1.3, 0, Math.PI * 2); g.fill(); } }
    else if (kind === 'slides') { g.strokeStyle = i % 2 ? '#ff5aa0' : '#ffd35c'; g.lineWidth = 10; g.beginPath(); g.moveTo(x - step * 0.3, y); g.bezierCurveTo(x - step * 0.3, y - vh * 0.15, x + step * 0.3, y - vh * 0.05, x + step * 0.2, y - vh * 0.22); g.stroke(); }
  }
}
function evParticles(g, vw, vh, t, kind, cols) {
  const P = EV_RND.parts, n = kind === 'firework' ? 4 : kind === 'bat' || kind === 'gull' || kind === 'lantern' || kind === 'ghost' ? 14 : 50;
  for (let i = 0; i < n; i++) {
    const p = P[i], col = cols[i % cols.length];
    g.fillStyle = col; g.strokeStyle = col;
    if (kind === 'leaf' || kind === 'petal') { const x = evWrap(p.x * vw + Math.sin(t * 0.02 + p.p) * 40 + t * 0.4, vw), y = evWrap(p.y * vh + t * p.s * 0.7, vh); g.save(); g.translate(x, y); g.rotate(t * 0.03 + p.p); g.beginPath(); g.ellipse(0, 0, (kind === 'leaf' ? 6 : 4) * p.s, (kind === 'leaf' ? 3 : 2.2) * p.s, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    else if (kind === 'snow') { const x = evWrap(p.x * vw + Math.sin(t * 0.02 + p.p) * 20, vw), y = evWrap(p.y * vh + t * p.s * 0.7, vh); g.beginPath(); g.arc(x, y, p.s * 1.6, 0, Math.PI * 2); g.fill(); }
    else if (kind === 'firefly' || kind === 'spark') { const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.05 + p.p * 3)); g.globalAlpha = a; const x = evWrap(p.x * vw + Math.sin(t * 0.01 + p.p) * 30, vw), y = kind === 'spark' ? evWrap(p.y * vh - t * p.s * 0.6, vh) : p.y * vh * 0.9 + Math.cos(t * 0.013 + p.p) * 20; g.beginPath(); g.arc(x, y, p.s * 1.8, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    else if (kind === 'bat' || kind === 'gull') { const x = evWrap(p.x * vw + t * (0.6 + p.s), vw + 80) - 40, y = p.y * vh * 0.5 + Math.sin(t * 0.03 + p.p) * 16, f = Math.sin(t * 0.3 + p.p) * 6, s = 6 + p.s * 4; g.lineWidth = kind === 'gull' ? 2 : 3; g.beginPath(); g.moveTo(x - s, y - f); g.quadraticCurveTo(x - s / 2, y + 2, x, y); g.quadraticCurveTo(x + s / 2, y + 2, x + s, y - f); g.stroke(); }
    else if (kind === 'lantern') { const x = evWrap(p.x * vw + Math.sin(t * 0.01 + p.p) * 20, vw), y = evWrap(p.y * vh - t * p.s * 0.25, vh + 40) - 20; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(x, y, 7 * p.s, 9 * p.s, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,230,120,.5)'; g.beginPath(); g.arc(x, y, 3 * p.s, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    else if (kind === 'ghost') { const x = evWrap(p.x * vw + t * 0.3 * p.s, vw + 60) - 30, y = p.y * vh * 0.6 + Math.sin(t * 0.02 + p.p) * 24, s = 10 + p.s * 6; g.beginPath(); g.arc(x, y, s, Math.PI, 0); g.lineTo(x + s, y + s * 1.2); for (let k = 0; k < 4; k++) g.lineTo(x + s - (k + 0.5) * s / 2, y + s * (k % 2 ? 1.2 : 0.9)); g.lineTo(x - s, y + s * 1.2); g.fill(); }
    else if (kind === 'bubble') { const x = evWrap(p.x * vw + Math.sin(t * 0.02 + p.p) * 10, vw), y = evWrap(p.y * vh - t * p.s * 0.5, vh); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, p.s * 4, 0, Math.PI * 2); g.stroke(); }
    else if (kind === 'firework') { const per = 160, k = ((t + i * 40) % per) / per, x = p.x * vw, y = vh * (0.15 + p.y * 0.25); if (k < 0.7) { g.globalAlpha = 1 - k / 0.7; for (let r = 0; r < 12; r++) { const an = r / 12 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(an) * k * 90, y + Math.sin(an) * k * 90 + k * k * 30, 2.5, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1; } }
  }
}
function evBackground(id) {
  const c = EV_BG[id];
  return function (g, vw, vh, cam, t) {
    const px = cam.x - 800, gr = g.createLinearGradient(0, 0, 0, vh);
    gr.addColorStop(0, c.sky[0]); gr.addColorStop(0.55, c.sky[1]); gr.addColorStop(1, c.sky[2]);
    g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
    if (c.orb) { const [col, ox, oy, r] = c.orb, x = vw * ox - px * 0.02, y = vh * oy; const og = g.createRadialGradient(x, y, 0, x, y, vh * r * 2.4); og.addColorStop(0, col); og.addColorStop(0.35, col); og.addColorStop(0.36, 'rgba(255,255,255,.12)'); og.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = og; g.fillRect(x - vh * r * 2.4, y - vh * r * 2.4, vh * r * 4.8, vh * r * 4.8); }
    c.layers.forEach(([col, base, kind], li) => evSilhouette(g, vw, vh, px, col, base, kind, li));
    if (c.parts) { g.save(); evParticles(g, vw, vh, t, c.parts[0], c.parts[1]); g.restore(); }
  };
}

/* how the ground and platforms look: [top, trim, face, face2, plat top, plat under, extra] */
const EV_LOOK = {
  harvest: ['#c2571c', '#ffcf6a', '#8a2a1a', '#6a1e12', '#e8c46a', '#a87a2a', 'hay'],
  maple: ['#c2401a', '#ffa23a', '#5a3a22', '#3a2412', '#7a5030', '#5a3a22', 'leaves'],
  manor: ['#3a2a4a', '#ff8a1f', '#2a1a3a', '#1a1028', '#4a3a5a', '#ff8a1f', 'web'],
  pumpkin: ['#4a7a3a', '#e8741a', '#3a2a1a', '#2a1e12', '#e8c46a', '#a87a2a', 'pumpkins'],
  grave: ['#3a4a3a', '#9be37a', '#2a2d3a', '#1a1d26', '#6a7080', '#3a3d4a', 'tombs'],
  workshop: ['#c79a63', '#e8364a', '#8a2a1a', '#6a1e12', '#3fae5a', '#e8364a', 'gifts'],
  village: ['#ffffff', '#c9ecff', '#7a5a4a', '#5a4034', '#ffffff', '#9fd4f2', 'snow'],
  candy: ['#ffffff', '#e8364a', '#ffd6e4', '#f6b6cc', '#ffffff', '#e8364a', 'stripes'],
  lanterns: ['#c4161c', '#ffcf3a', '#5a1414', '#3a0c0c', '#ffcf3a', '#c4161c', 'lanterns'],
  dragon: ['#ffd35c', '#c4161c', '#8a1a1a', '#5a1010', '#c4161c', '#ffd35c', 'lanterns'],
  firecracker: ['#c4161c', '#ffb02e', '#2a0a10', '#40121a', '#3a1018', '#ffb02e', 'tiles'],
  blossom: ['#7ad06a', '#4fa84a', '#a8805a', '#86603e', '#ffc6d9', '#e58db0', 'flowers'],
  boardwalk: ['#e8c48a', '#a87a4a', '#a87a4a', '#86603e', '#ffffff', '#ff7a8a', 'planks'],
  island: ['#ffe08a', '#e8c46a', '#a87a4a', '#86603e', '#2fa85a', '#7a5030', 'sand'],
  waterpark: ['#46c8ff', '#ffffff', '#e8eef4', '#c8d4e0', '#ff5aa0', '#ffffff', 'pool'],
  campfire: ['#7a5030', '#5a3a22', '#5a3a22', '#3a2412', '#7a5030', '#5a3a22', 'planks']
};
function evPlat(g, p, look, t) {
  let a = p.off ? 0.12 : p.warn && ((t >> 3) & 1) ? 0.45 : 1;
  g.save(); g.globalAlpha = a;
  g.fillStyle = look[5]; g.fillRect(p.x, p.y + 6, p.w, 7);
  g.fillStyle = look[4]; g.fillRect(p.x, p.y, p.w, 7);
  if (look[6] === 'stripes') { g.fillStyle = '#e8364a'; for (let x = p.x; x < p.x + p.w - 6; x += 16) g.fillRect(x, p.y, 7, 7); }
  if (look[6] === 'snow' || look[6] === 'stripes') { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(p.x + p.w / 2, p.y, p.w / 2 + 4, 5, 0, Math.PI, 0); g.fill(); }
  if (look[6] === 'lanterns') { g.fillStyle = '#ff3a2a'; [p.x + 14, p.x + p.w - 14].forEach(x => { g.beginPath(); g.ellipse(x, p.y + 26, 7, 9, 0, 0, Math.PI * 2); g.fill(); }); g.fillStyle = '#ffcf3a'; [p.x + 14, p.x + p.w - 14].forEach(x => g.fillRect(x - 1, p.y + 13, 2, 6)); }
  if (look[6] === 'flowers') { for (let x = p.x + 8; x < p.x + p.w; x += 18) { g.fillStyle = (x / 18 | 0) % 2 ? '#ffffff' : '#ffe14a'; g.beginPath(); g.arc(x, p.y - 2, 3, 0, Math.PI * 2); g.fill(); } }
  if (look[6] === 'web' || look[6] === 'tombs') { g.strokeStyle = 'rgba(220,220,240,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(p.x + 4, p.y + 13); g.lineTo(p.x + 18, p.y + 28); g.moveTo(p.x + p.w - 4, p.y + 13); g.lineTo(p.x + p.w - 18, p.y + 28); g.stroke(); }
  if (p.blink && !p.off) { g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(p.x, p.y, p.w, 2); }
  g.restore();
}
function evSolid(g, s, st, look, t) {
  const { x, y, w, h } = s;
  const ug = g.createLinearGradient(0, y + h, 0, y + h + 160); ug.addColorStop(0, look[3]); ug.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = ug; g.beginPath(); g.moveTo(x + 8, y + h); g.lineTo(x + w - 8, y + h); g.lineTo(x + w * 0.62, y + h + 150); g.lineTo(x + w * 0.4, y + h + 170); g.closePath(); g.fill();
  g.fillStyle = look[2]; g.fillRect(x, y, w, h);
  g.strokeStyle = look[3]; g.lineWidth = 2;
  for (let yy = y + 22; yy < y + h; yy += 22) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
  const ex = look[6];
  if (ex === 'tiles') { g.fillStyle = look[3]; for (let yy = y + 14; yy < y + h; yy += 18) for (let xx = x + ((yy / 18 | 0) % 2) * 12; xx < x + w; xx += 24) { g.beginPath(); g.arc(xx, yy, 10, 0, Math.PI); g.fill(); } }
  if (ex === 'pool') { g.fillStyle = 'rgba(70,200,255,.55)'; g.fillRect(x + 20, y + 16, w - 40, h - 28); g.fillStyle = 'rgba(255,255,255,.5)'; for (let xx = x + 30; xx < x + w - 30; xx += 40) g.fillRect(xx + Math.sin(t * 0.05 + xx) * 4, y + 24, 18, 3); }
  if (ex === 'gifts') { [0.2, 0.75].forEach((k, i) => { const gx = x + w * k, s2 = 34; g.fillStyle = i ? '#3fae5a' : '#e8364a'; g.fillRect(gx, y - s2, s2, s2); g.fillStyle = '#ffd35c'; g.fillRect(gx + s2 / 2 - 3, y - s2, 6, s2); g.fillRect(gx, y - s2 / 2 - 3, s2, 6); }); }
  if (ex === 'pumpkins') { [0.12, 0.88].forEach(k => { const px = x + w * k; g.fillStyle = '#e8741a'; g.beginPath(); g.ellipse(px, y - 18, 24, 18, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2e5a2a'; g.fillRect(px - 3, y - 40, 6, 8); g.fillStyle = 'rgba(255,' + (200 + Math.sin(t * 0.1) * 40 | 0) + ',80,.95)'; g.beginPath(); g.moveTo(px - 12, y - 24); g.lineTo(px - 6, y - 18); g.lineTo(px - 14, y - 16); g.fill(); g.beginPath(); g.moveTo(px + 12, y - 24); g.lineTo(px + 6, y - 18); g.lineTo(px + 14, y - 16); g.fill(); g.fillRect(px - 10, y - 10, 20, 4); }); }
  if (ex === 'tombs') { [0.15, 0.85].forEach(k => { const tx = x + w * k; g.fillStyle = '#6a7080'; g.beginPath(); g.moveTo(tx - 14, y); g.lineTo(tx - 14, y - 26); g.arc(tx, y - 26, 14, Math.PI, 0); g.lineTo(tx + 14, y); g.fill(); g.fillStyle = '#3a3d4a'; g.fillRect(tx - 2, y - 34, 4, 16); g.fillRect(tx - 7, y - 28, 14, 4); }); }
  if (ex === 'web') { g.strokeStyle = 'rgba(230,230,250,.4)'; g.lineWidth = 1; [x, x + w].forEach((cx, i) => { const d = i ? -1 : 1; for (let r = 12; r <= 48; r += 12) { g.beginPath(); g.arc(cx, y, r, i ? Math.PI / 2 : 0, i ? Math.PI : Math.PI / 2); g.stroke(); } for (let k = 0; k <= 3; k++) { const an = k / 3 * Math.PI / 2; g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + d * Math.cos(an) * 50, y + Math.sin(an) * 50); g.stroke(); } }); }
  if (ex === 'lanterns') { for (let xx = x + 30; xx < x + w - 20; xx += 90) { g.strokeStyle = '#3a0c0c'; g.lineWidth = 2; g.beginPath(); g.moveTo(xx, y + h); g.lineTo(xx, y + h + 14); g.stroke(); g.fillStyle = '#ff3a2a'; g.beginPath(); g.ellipse(xx, y + h + 26, 9, 12, 0, 0, Math.PI * 2); g.fill(); } }
  if (ex === 'sand') { g.fillStyle = 'rgba(255,255,255,.25)'; for (let xx = x + 10; xx < x + w; xx += 37) g.fillRect(xx, y + 30 + (xx % 3) * 8, 6, 3); }
  // top surface
  g.fillStyle = look[0]; g.fillRect(x - 5, y, w + 10, 12);
  g.fillStyle = look[1]; g.fillRect(x - 5, y + 11, w + 10, 3);
  if (ex === 'snow' || ex === 'stripes') { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - 8, y + 6); for (let xx = x - 8; xx <= x + w + 8; xx += 20) g.quadraticCurveTo(xx + 10, y - 8, xx + 20, y + 4); g.lineTo(x + w + 8, y + 10); g.lineTo(x - 8, y + 10); g.fill(); }
  if (ex === 'stripes') { g.fillStyle = '#e8364a'; for (let xx = x; xx < x + w; xx += 28) g.fillRect(xx, y + 14, 12, h - 14); }
  if (ex === 'leaves' || ex === 'flowers') { for (let xx = x; xx < x + w; xx += 14) { g.fillStyle = ex === 'leaves' ? ((xx / 14 | 0) % 3 ? '#e8742a' : '#ffc23a') : ((xx / 14 | 0) % 2 ? '#ffc6d9' : '#ffffff'); g.beginPath(); g.ellipse(xx + 6, y - 1, 6, 3, (xx % 5) * 0.4, 0, Math.PI * 2); g.fill(); } }
  if (ex === 'hay') { g.fillStyle = '#e8c46a'; [0.08, 0.92].forEach(k => { g.fillRect(x + w * k - 22, y - 26, 44, 26); g.strokeStyle = '#a87a2a'; g.lineWidth = 2; g.strokeRect(x + w * k - 22, y - 26, 44, 26); }); }
}
if (typeof STAGE_ART !== 'undefined') {
  EV_STAGES.forEach(s => {
    const look = EV_LOOK[s.id];
    STAGE_ART[s.id] = {
      bg: evBackground(s.id),
      fg(g, st, t) {
        st.plats.forEach(p => evPlat(g, p, look, t));
        st.solids.forEach(x => evSolid(g, x, st, look, t));
        if (typeof drawStageFront === 'function') drawStageFront(g, st, t);
      }
    };
  });
}
