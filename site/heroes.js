'use strict';
/* ===== CLOUDTOP BRAWL — Sky Road heroes: Marlowe (level 100), Terra Vale (level 175), Astra Quill (level 250) =====
   Each one plays in a way nobody else does:
   - Marlowe the Puppeteer: the longest reach in the game. Strings pull enemies in, his puppet kicks from far away
     and dances around him to push people off. He's light and his moves are slow to start.
   - Terra Vale the Architect: builds the battlefield. Brick walls that stop shots, a wrecking ball, scaffolds you
     can stand on, and blueprint traps that drop a cage.
   - Astra Quill the Star Cartographer: quick and safe. A burning constellation line, a shooting-star dash whose
     trail bursts behind her, a comet that carries her up, and Eclipse: untouchable for a moment, then a burst of
     light. Her hits are light, so Eclipse is her finisher, and it leaves her open if it misses.
   The rules live here (the game server uses this file too); how they look is in heroes-art.js. */

const HERO_LOOKS = {
  marlowe: { build: 'slim', body: '#3a1c3e', skin: '#f0c8a8', accent: '#e8c35a', hair: '#1a1020', legs: '#22142a', extra: ['marlowe'] },
  terra: { build: 'normal', body: '#e8a23a', skin: '#c98a5e', accent: '#ffd35c', hair: '#5a3418', legs: '#3a4a5a', extra: ['terra'] },
  astra: { build: 'slim', body: '#1a2a5a', skin: '#e8c4a8', accent: '#9fe7ff', hair: '#e8e2ff', legs: '#141a3a', extra: ['astra'] }
};

ROSTER.push({
  id: 'marlowe', name: 'Marlowe', title: 'The Puppeteer', locked: true, unlockLevel: 100,
  stats: { power: 8, speed: 6, weight: 4, jump: 7, defense: 6, skill: 8 },
  look: HERO_LOOKS.marlowe,
  passive: 'Long strings: the longest reach in the game, and strings pull enemies in. But he is light, and his moves are slow to start.',
  strongVs: ['rowan', 'blaze'], weakVs: ['titan', 'nyx'],
  ultimate: { style: 'finale', kind: 'aim', aim: 'spot', name: 'Grand Finale', desc: 'The curtains close and a spotlight hunts for the target. Strings make them dance on stage, then the chandelier crashes down.', theme: 'theatre', colors: ['#12060e', '#e8c35a', '#ff3b5a'], hits: 5, dmg: 3.4, final: { dmg: 17, b: 12, g: 1.3, angle: 78 } },
  specials: {
    neutral: { name: 'String Snare', desc: 'Flick a puppet string. It latches on, then yanks the enemy straight to him a moment later.', kind: 'proj',
      dmg: 4, b: 1, g: 0.1, angle: 20, startup: 8, end: 14, speed: 14, life: 30, size: 16, shape: 'string', color: '#e8c35a', max: 1, onHit: true, yank: { t: 16, v: 10 } },
    side: { name: 'Puppet Kick', desc: 'His wooden puppet swings out on its strings and kicks far in front of him. Huge reach, but slow to start.', kind: 'proj',
      dmg: 11, b: 7.4, g: 0.95, angle: 38, startup: 13, end: 18, speed: 0, life: 18, size: 44, shape: 'pupkick', color: '#c49a6a', max: 1, pierce: true, step: 'kick', reach: 230 },
    up: { name: 'Curtain Rise', desc: 'A stage curtain lifts him high. On the ground, the curtain stays behind and blocks enemy shots.', kind: 'leap',
      vy: 20, vx: 2, dmg: 5, b: 5, g: 0.5, angle: 80, startup: 6, active: 10, hx: 0, hy: 0.4, hw: 1.3, hh: 0.9,
      pad: { dmg: 0, b: 0, g: 0, angle: 0, speed: 0, life: 170, size: 40, shape: 'curtain', color: '#a8122a', ground: true, offset: 0.01, wall: true, noHit: true } },
    down: { name: 'Puppet Waltz', desc: 'His big puppet dances one circle around him on its strings and knocks away anyone it passes. Slow to start.', kind: 'proj',
      dmg: 8.5, b: 7, g: 0.85, angle: 48, startup: 11, end: 20, speed: 0, life: 32, size: 44, shape: 'pupwaltz', color: '#c49a6a', max: 1, pierce: true, step: 'waltz', r: 92 }
  }
});
CHAR.marlowe = ROSTER[ROSTER.length - 1];

ROSTER.push({
  id: 'terra', name: 'Terra Vale', title: 'The Architect', locked: true, unlockLevel: 175,
  stats: { power: 8, speed: 5, weight: 7, jump: 6, defense: 8, skill: 6 },
  look: HERO_LOOKS.terra,
  passive: 'Builder: she changes the battlefield. Brick walls stop enemy shots and her scaffolds are platforms anyone can stand on.',
  strongVs: ['blaze', 'rivet'], weakVs: ['zephyr', 'volt'],
  ultimate: { style: 'tower', kind: 'aim', aim: 'plan', name: 'Skyscraper', desc: 'Blueprints unfold into a city skyline. A tower bursts up under the target, then a crane drops a steel beam on them.', theme: 'build', colors: ['#0a1a2e', '#ffd35c', '#5ab4ff'], hits: 4, dmg: 3.8, final: { dmg: 18, b: 12.5, g: 1.35, angle: 86 } },
  specials: {
    neutral: { name: 'Brick Toss', desc: 'Lob a brick. Where it lands, a brick wall goes up that stops enemy shots.', kind: 'proj',
      dmg: 7, b: 4.5, g: 0.6, angle: 40, startup: 10, end: 14, speed: 9, aim: 30, grav: 0.45, life: 90, size: 22, shape: 'brick', color: '#c4562a', max: 1, land: true,
      child: { dmg: 0, b: 0, g: 0, angle: 0, speed: 0, life: 300, size: 40, shape: 'brickwall', color: '#c4562a', ground: true, wall: true, noHit: true } },
    side: { name: 'Wrecking Ball', desc: 'A wrecking ball swings down in front of her and smashes through everyone in its path.', kind: 'proj',
      dmg: 11, b: 7.5, g: 0.9, angle: 35, startup: 14, end: 18, speed: 0, life: 34, size: 46, shape: 'wreckball', color: '#4a4f5a', max: 1, pierce: true, step: 'swing', swing: { r: 230, from: -1.25, to: 1.1 } },
    up: { name: 'Scaffold', desc: 'Spring up and build a scaffold under her feet: a platform anyone can stand on for a few seconds.', kind: 'scaffold',
      startup: 5, vy: 16, at: 16, end: 10, dmg: 5, b: 5, g: 0.5, angle: 85, hw: 1.2, hh: 0.6, hy: 0.2,
      plat: { dmg: 0, b: 0, g: 0, angle: 0, speed: 0, life: 260, size: 120, shape: 'scaffold', color: '#ffd35c', noHit: true, step: 'scaffold' } },
    down: { name: 'Blueprint Trap', desc: 'Draw a blueprint on the floor. A moment later a steel cage drops on anyone standing on it.', kind: 'proj',
      dmg: 0, b: 0, g: 0, angle: 0, startup: 8, end: 14, speed: 0, life: 60, size: 60, shape: 'blueprint', color: '#5ab4ff', max: 1, ground: true, offset: 120, noHit: true,
      burst: { dmg: 10, b: 4, g: 0.5, angle: 70, r: 85, fx: 'cage', slow: 150 } }
  }
});
CHAR.terra = ROSTER[ROSTER.length - 1];

ROSTER.push({
  id: 'astra', name: 'Astra Quill', title: 'The Star Cartographer', locked: true, unlockLevel: 250,
  stats: { power: 6, speed: 8, weight: 5, jump: 8, defense: 6, skill: 8 },
  look: HERO_LOOKS.astra,
  passive: 'Quick and safe: fast long-range hits and the best recovery. Her hits are light, so Eclipse is her finisher, and it leaves her open if it misses.',
  strongVs: ['rivet', 'lumi'], weakVs: ['hsi', 'tseng'],
  ultimate: { style: 'zodiac', kind: 'aim', aim: 'chart', name: 'Zodiac Judgment', desc: 'Brass astrolabe rings close around her. The sky becomes a star chart and a zodiac beast made of stars pounces on the target.', theme: 'stars', colors: ['#050a24', '#9fe7ff', '#ffe8a8'], hits: 6, dmg: 3.2, final: { dmg: 17, b: 12.5, g: 1.3, angle: 45 } },
  specials: {
    neutral: { name: 'Star Line', desc: 'Three stars flash in a zig-zag in front of her and a burning line joins them at once.', kind: 'proj',
      dmg: 6, b: 3.8, g: 0.32, angle: 40, startup: 7, end: 12, speed: 0, life: 14, size: 10, shape: 'starline', color: '#ffe8a8', max: 1, noHit: true, step: 'cline', pts: [[30, -10], [110, -48], [185, 14], [260, -24]] },
    side: { name: 'Shooting Star', desc: 'Zip forward as a streak of light. The trail she leaves bursts a moment later.', kind: 'streak',
      startup: 5, dur: 11, speed: 17, end: 12, trail: { dmg: 6, b: 5, g: 0.5, angle: 55, speed: 0, life: 30, size: 34, shape: 'startrail', color: '#ffe8a8', pierce: true, noHit: true, step: 'trail', at: 18 } },
    up: { name: 'Comet Ride', desc: 'Ride a comet up and forward. It hits anyone in its path.', kind: 'comet',
      startup: 6, dur: 34, speed: 13, steer: false, tilt: 0.42, dmg: 6, b: 5.5, g: 0.6, angle: 70, hw: 1.1, hh: 0.9, hy: 0.5, rehit: 12 },
    down: { name: 'Eclipse', desc: 'A dark moon covers her (nothing can hurt her), then bursts into a ring of starlight. Long recovery if it misses.', kind: 'eclipse',
      startup: 5, hold: 15, end: 28, dmg: 12, b: 9, g: 1.1, angle: 55, hx: 0, hy: 0.5, hw: 3.6, hh: 2.2, sides: true }
  }
});
CHAR.astra = ROSTER[ROSTER.length - 1];

/* the new shapes (added at the end, so every older shape keeps its number online) */
['string', 'puppet', 'curtain', 'brick', 'brickwall', 'wreckball', 'scaffold', 'blueprint', 'starpin', 'pupkick', 'pupwaltz', 'starline', 'startrail'].forEach(s => { if (SHAPES.indexOf(s) < 0) SHAPES.push(s); });

/* ---------- the new move kinds ---------- */
function runActX(f, inp, g, dirX, a, m) {
  const S = m.startup || 1, E = m.end || 10;
  switch (m.kind) {
    case 'scaffold': {   // Terra springs up and builds a scaffold under her feet
      a.t++;
      if (a.t < S) { f.pose = 'charge'; f.pt = 0.4; f.vx *= 0.6; }
      else if (a.t === S) { f.vy = -m.vy; f.ground = null; f.y -= 2; emit(g, 'jump', f.x, f.y, 2); }
      if (a.t >= S && a.t < S + 10) { f.hot = true; hitCheck(f, g, m, a, 1); f.pose = 'up'; f.pt = 1; }
      if (a.t === S + (m.at || 16)) {
        const p = { owner: f, tid: f.tid, key: 'up', m: m.plat, shape: 'scaffold', color: m.plat.color, size: m.plat.size, x: f.x, y: f.y + 2, vx: 0, vy: 0, life: m.plat.life, dmg: 0, hit: new Set(), age: 0, armed: 0, stuck: false, face: f.face };
        g.projs.push(p); emit(g, 'build', f.x, f.y, 1, f.slot);
        f.vy = Math.min(f.vy, 0);
      }
      if (a.t >= S + (m.at || 16) + E) endAct(f);   // not helpless: she has somewhere to stand
      return true;
    }
    case 'streak': {   // Astra zips forward as a shooting star; her trail bursts a moment later
      a.t++;
      if (a.t < S) { f.pose = 'charge'; f.pt = 0.4; f.vx *= 0.5; if (!f.ground) f.vy *= 0.5; a.noGrav = !f.ground; }
      else if (a.t < S + m.dur) {
        a.noGrav = true; f.vx = f.face * m.speed; f.vy = 0; f.pose = 'dash'; f.pt = 1;
        if ((a.t - S) % 3 === 0) {
          const T = m.trail; a.trailHit = a.trailHit || new Set();   // one streak hits each enemy once
          g.projs.push({ owner: f, tid: f.tid, key: 'side', m: T, shape: T.shape, color: T.color, size: T.size, x: f.x - f.face * 10, y: f.y - f.H * 0.5, vx: 0, vy: 0, life: T.life, dmg: T.dmg, hit: a.trailHit, age: 0, armed: 0, stuck: false, face: f.face });
        }
        if (a.t % 2 === 0) emit(g, 'streak', f.x, f.y - f.H / 2, f.face, f.slot);
      } else { a.noGrav = false; f.vx *= 0.4; f.pose = 'idle'; f.pt = 0; if (a.t >= S + m.dur + E) endAct(f); }
      return true;
    }
    case 'comet': {   // Astra rides a comet she steers
      a.t++;
      if (a.t < S) { f.pose = 'charge'; f.pt = 0.4; f.vx *= 0.6; f.vy *= 0.5; a.noGrav = true; }
      else if (a.t < S + m.dur) {
        if (a.t === S) { a.ang = -Math.PI / 2 + f.face * (m.tilt || 0.35); f.ground = null; f.y -= 2; }
        if (m.steer !== false) a.ang += dirX * (m.turn || 0.1);
        a.ang = Math.max(-Math.PI + 0.35, Math.min(-0.35, a.ang));   // always heading upward
        f.vx = Math.cos(a.ang) * m.speed; f.vy = Math.sin(a.ang) * m.speed; a.noGrav = true;
        if (Math.abs(f.vx) > 1) f.face = Math.sign(f.vx);
        f.hot = true; f.pose = 'fly'; f.pt = 1;
        if (m.rehit && (a.t - S) % m.rehit === 0) a.hit.clear();
        hitCheck(f, g, m, a, 1);
        if (a.t % 3 === 0) emit(g, 'comet', f.x, f.y - f.H / 2, Math.round(a.ang * 100), f.slot);
      } else { a.noGrav = false; endAct(f); f.helpless = true; f.vy = Math.max(f.vy, -4); }
      return true;
    }
    case 'eclipse': {   // Astra: a dark moon covers her (untouchable), then bursts into a ring of starlight
      a.t++; f.vx *= 0.8;
      if (!f.ground) { a.noGrav = true; f.vy = Math.min(f.vy * 0.8, 1.2); }
      if (a.t < S) { f.pose = 'charge'; f.pt = 0.6; }
      else if (a.t < S + m.hold) { f.pose = 'charge'; f.pt = 1; f.inv = Math.max(f.inv, 2); f.eclipse = S + m.hold - a.t; if (a.t === S) emit(g, 'eclipse', f.x, f.y - f.H / 2, m.hold, f.slot); }
      else if (a.t === S + m.hold) { f.eclipse = 0; f.hot = true; f.pose = 'cast2'; f.pt = 1; hitCheck(f, g, m, a, 1); emit(g, 'eclipseburst', f.x, f.y - f.H / 2, 0, f.slot); g.shake = Math.max(g.shake, 5); }
      else { f.pose = 'idle'; f.pt = 0; a.noGrav = false; if (a.t >= S + m.hold + E) endAct(f); }
      return true;
    }
  }
  return false;
}

/* ---------- projectiles that move their own way ---------- */
function projStepX(p, g) {
  const m = p.m;
  if (m.step === 'kick') {   // Marlowe's puppet kicks out far in front of him, then is pulled back
    const o = p.owner, k = p.age / (m.life || 16), out = k < 0.45 ? 1 - Math.pow(1 - k / 0.45, 3) : 1 - (k - 0.45) / 0.55 * 0.35;
    p.face = o.face; p.x = o.x + o.face * (40 + (m.reach || 150) * out); p.y = o.y - o.H * 0.45; p.vx = o.face; p.vy = 0;
    if (o.hitstun > 0 || o.dead > 0 || o.out) p.life = 0;   // he got hit: the strings go slack
    return;
  }
  if (m.step === 'waltz') {   // his big puppet dances one circle around him
    const o = p.owner, an = (p.age / (m.life || 32)) * Math.PI * 2;   // starts in front of him, goes over the top, round the back
    p.x = o.x + p.face * Math.cos(an) * (m.r || 92); p.y = o.y - o.H * 0.5 - Math.sin(an) * (m.r || 92) * 0.5;
    p.vx = Math.sign(p.x - o.x) || p.face; p.vy = 0;   // it knocks people away from him
    if (o.hitstun > 0 || o.dead > 0 || o.out) p.life = 0;
    return;
  }
  if (m.step === 'cline') {   // Astra's star line: it stays where it was drawn (its hits are worked out in stepProjsX)
    if (p.sx == null) { p.sx = p.x - p.face * 30; p.sy = p.y; }
    return;
  }
  if (m.step === 'trail') {   // a bit of Astra's shooting-star trail: it bursts a moment after she passes
    if (p.age === m.at) { p.m = Object.assign({}, m, { noHit: false }); p.armed = 1; emit(g, 'trailpop', p.x, p.y, 0, p.owner.slot); }
    else if (p.age === m.at + 5) { p.m = m; p.armed = 2; }
    return;
  }
  if (m.step === 'swing') {   // the wrecking ball swings on a chain from above her
    if (p.age === 1) { const f = p.owner; p.ax = f.x + f.face * 40; p.ay = f.y - m.swing.r - 30; p.sface = f.face; }
    const k = Math.min(1, p.age / (m.life || 34)), e = k * k * (3 - 2 * k), an = m.swing.from + (m.swing.to - m.swing.from) * e;
    const nx = p.ax + p.sface * Math.sin(an) * m.swing.r, ny = p.ay + Math.cos(an) * m.swing.r;
    p.vx = nx - p.x; p.vy = ny - p.y; p.x = nx; p.y = ny; p.face = p.sface;
    if (p.vx === 0) p.vx = p.sface;
    return;
  }
  if (m.step === 'scaffold') {   // a platform anyone can stand on, while it lasts
    const st = g.stage;
    if (!p.plat) { p.plat = { x: p.x - m.size / 2, y: p.y, w: m.size, h: 12, bx: p.x - m.size / 2, by: p.y, dx: 0, dy: 0, soft: true, tmp: true }; st.surfaces.push(p.plat); (st.tmpPlats || (st.tmpPlats = [])).push(p.plat); }
    if (p.life <= 1) p.plat.off = true;
    return;
  }
}
function projOnHit(p, o, g) {
  const m = p.m;
  if (m.yank) { o.yankT = m.yank.t; o.yankV = m.yank.v; o.yankBy = p.owner; emit(g, 'string', p.owner.x, p.owner.y - p.owner.H * 0.6, Math.round(o.x), Math.round(o.y - o.H / 2)); }
}
/* every frame, after the projectiles move */
function stepProjsX(g) {
  // strings yank their catch to Marlowe
  for (const o of g.fighters) {
    if (!(o.yankT > 0)) continue;
    if (o.out || o.dead > 0 || !o.yankBy || o.yankBy.out || o.yankBy.dead > 0) { o.yankT = 0; continue; }
    if (--o.yankT === 0) {
      const by = o.yankBy, dx = by.x - o.x, d = Math.abs(dx);
      if (d > 40) { o.vx = Math.sign(dx) * Math.min(o.yankV, 2 + d / 14); o.vy = Math.min(o.vy, -3.5); o.ground = null; o.hitstun = Math.max(o.hitstun || 0, 14); }
      emit(g, 'yank', o.x, o.y - o.H / 2, Math.round(by.x), Math.round(by.y - by.H * 0.6));
    }
  }
  // scaffold platforms go away with their scaffold
  const st = g.stage;
  if (st.surfaces.some(s => s.tmp)) {
    const live = new Set(g.projs.filter(p => p.plat && p.life > 0).map(p => p.plat));
    st.surfaces = st.surfaces.filter(s => !s.tmp || live.has(s));
    st.tmpPlats = (st.tmpPlats || []).filter(s => live.has(s));
    for (const f of g.fighters) if (f.ground && f.ground.tmp && !live.has(f.ground)) { f.ground = null; }
  }
  // Astra's star line: everyone touching the zig-zag line between its stars gets burned, once
  for (const p of g.projs) {
    if (p.m.step !== 'cline' || p.life <= 0 || p.sx == null || p.age > 6) continue;
    const pts = p.m.pts.map(([dx, dy]) => [p.sx + p.face * dx, p.sy + dy]);
    for (const o of g.fighters) {
      if (o.out || o.dead > 0 || o.halo > 0 || o.vanish || o.tid === p.tid || p.hit.has(o)) continue;
      const hb = hurtbox(o), cx = hb.x + hb.w / 2, cy = hb.y + hb.h / 2;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1], vx = bx - ax, vy = by - ay, len2 = vx * vx + vy * vy || 1;
        const k = Math.max(0, Math.min(1, ((cx - ax) * vx + (cy - ay) * vy) / len2));
        if (Math.abs(ax + vx * k - cx) > hb.w / 2 + 8 || Math.abs(ay + vy * k - cy) > hb.h / 2 + 8) continue;
        p.hit.add(o);
        const r = applyHit(p.owner, o, { dmg: p.dmg, b: p.m.b, g: p.m.g, angle: p.m.angle }, p.face, g, p);
        if (r === 'block' || r === 'counter') p.life = 0;
        break;
      }
      if (p.life <= 0) break;
    }
  }
}
/* ---------- their ultimates (how the target is thrown around; the art is in heroes-art.js) ---------- */
if (typeof ULT_STYLES !== 'undefined') Object.assign(ULT_STYLES, {
  /* Marlowe: strings make the target dance left and right on stage, then the chandelier smashes them upward */
  finale: { hit: (o, i, u, g) => ultPush(o, g, (i % 2 ? -1 : 1) * 12, i % 2 ? -6 : 4), angle: () => ultRnd(74, 84), finMul: 0.92 },
  /* Terra: the tower rises under the target, carrying them up, then the steel beam knocks them away */
  tower: { tick: (o, k, u, g) => { if (k > 4 && k < ULT_FX_FINAL - 4 && k % 3 === 0) ultPush(o, g, 0, -3); }, angle: () => ultRnd(30, 42), dir: (o, u, f) => Math.sign(o.x - f.x) || f.face, finMul: 1.1 },
  /* Astra: star beasts strike from every side, then the zodiac beast pounces */
  zodiac: { hit: (o, i, u, g) => { const an = i * 2.1; ultPush(o, g, Math.cos(an) * 10, Math.sin(an) * 8); }, angle: () => ultRnd(40, 55), dir: () => Math.random() < 0.5 ? -1 : 1, finMul: 0.82 }
});
