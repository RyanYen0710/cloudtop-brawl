'use strict';
/* ===== CLOUDTOP BRAWL — Sky Road heroes: Marlowe (level 100), Terra Vale (level 175), Astra Quill (level 250) =====
   Each one plays in a way nobody else does:
   - Marlowe the Puppeteer: strings that yank enemies to him, a wooden puppet that copies every hit he throws,
     and he can swap places with it.
   - Terra Vale the Architect: builds the battlefield. Brick walls that stop shots, a wrecking ball, scaffolds you
     can stand on, and blueprint traps that drop a cage.
   - Astra Quill the Star Cartographer: pins stars in the air and links them with burning lines, steers a comet,
     and a gravity well that steals enemy shots, spins them around her and throws them back.
   The rules live here (the game server uses this file too); how they look is in heroes-art.js. */

const HERO_LOOKS = {
  marlowe: { build: 'slim', body: '#3a1c3e', skin: '#f0c8a8', accent: '#e8c35a', hair: '#1a1020', legs: '#22142a', extra: ['marlowe'] },
  terra: { build: 'normal', body: '#e8a23a', skin: '#c98a5e', accent: '#ffd35c', hair: '#5a3418', legs: '#3a4a5a', extra: ['terra'] },
  astra: { build: 'slim', body: '#1a2a5a', skin: '#e8c4a8', accent: '#9fe7ff', hair: '#e8e2ff', legs: '#141a3a', extra: ['astra'] }
};

ROSTER.push({
  id: 'marlowe', name: 'Marlowe', title: 'The Puppeteer', locked: true, unlockLevel: 100,
  stats: { power: 6, speed: 7, weight: 4, jump: 7, defense: 5, skill: 9 },
  look: HERO_LOOKS.marlowe,
  passive: 'Puppet Double: his wooden puppet copies every hit he throws, from wherever it stands. Strings pull enemies right to him.',
  strongVs: ['rowan', 'blaze'], weakVs: ['titan', 'nyx'],
  ultimate: { style: 'finale', kind: 'aim', aim: 'spot', name: 'Grand Finale', desc: 'The curtains close and a spotlight hunts for the target. Strings make them dance on stage, then the chandelier crashes down.', theme: 'theatre', colors: ['#12060e', '#e8c35a', '#ff3b5a'], hits: 5, dmg: 3.4, final: { dmg: 17, b: 12, g: 1.3, angle: 78 } },
  specials: {
    neutral: { name: 'String Snare', desc: 'Flick a puppet string. It latches on, then yanks the enemy straight to him a moment later.', kind: 'proj',
      dmg: 4, b: 1, g: 0.1, angle: 20, startup: 8, end: 14, speed: 14, life: 30, size: 16, shape: 'string', color: '#e8c35a', max: 1, onHit: true, yank: { t: 16, v: 10 } },
    side: { name: 'Marionette Swap', desc: 'Swap places with his puppet, wherever it is. No puppet out? He tosses one ahead.', kind: 'swap',
      startup: 6, end: 14, dist: 190 },
    up: { name: 'Curtain Rise', desc: 'A stage curtain lifts him high. On the ground, the curtain stays behind and blocks enemy shots.', kind: 'leap',
      vy: 20, vx: 2, dmg: 5, b: 5, g: 0.5, angle: 80, startup: 6, active: 10, hx: 0, hy: 0.4, hw: 1.3, hh: 0.9,
      pad: { dmg: 0, b: 0, g: 0, angle: 0, speed: 0, life: 170, size: 40, shape: 'curtain', color: '#a8122a', ground: true, offset: 0.01, wall: true, noHit: true } },
    down: { name: 'Puppet Double', desc: 'Set down a wooden puppet (one at a time). It copies every hit Marlowe throws, from where it stands.', kind: 'puppet',
      startup: 10, end: 14, life: 600, offset: 60 }
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
  stats: { power: 7, speed: 7, weight: 5, jump: 8, defense: 6, skill: 9 },
  look: HERO_LOOKS.astra,
  passive: 'Star chart: up to 3 star pins hang in the air. Linked, they become burning lines. Her Gravity Well steals enemy shots and throws them back.',
  strongVs: ['rivet', 'lumi'], weakVs: ['hsi', 'tseng'],
  ultimate: { style: 'zodiac', kind: 'aim', aim: 'chart', name: 'Zodiac Judgment', desc: 'Brass astrolabe rings close around her. The sky becomes a star chart and a zodiac beast made of stars pounces on the target.', theme: 'stars', colors: ['#050a24', '#9fe7ff', '#ffe8a8'], hits: 6, dmg: 3.2, final: { dmg: 17, b: 12.5, g: 1.3, angle: 45 } },
  specials: {
    neutral: { name: 'Star Pin', desc: 'Throw a star that slides to a stop and hangs in the air (up to 3). It stings anyone who touches it.', kind: 'proj',
      dmg: 3, b: 2.5, g: 0.3, angle: 50, startup: 8, end: 12, speed: 11, life: 480, size: 20, shape: 'starpin', color: '#ffe8a8', max: 3, pierce: true, rehit: 40, step: 'star' },
    side: { name: 'Connect the Stars', desc: 'Link her star pins with burning lines for a moment. Anyone touching a line gets burned.', kind: 'link',
      startup: 6, end: 16, dur: 100, dmg: 5, b: 4.5, g: 0.5, angle: 60, rehit: 24 },
    up: { name: 'Comet Ride', desc: 'Ride a comet. It flies up and you steer it left and right; it hits anyone in its path.', kind: 'comet',
      startup: 6, dur: 36, speed: 12.5, turn: 0.045, dmg: 6, b: 5.5, g: 0.6, angle: 70, hw: 1.1, hh: 0.9, hy: 0.5, rehit: 12 },
    down: { name: 'Gravity Well', desc: 'Open a gravity well around her. Enemy shots that come close get caught in orbit, then she throws them all back.', kind: 'well',
      startup: 6, dur: 70, end: 12, r: 150 }
  }
});
CHAR.astra = ROSTER[ROSTER.length - 1];

/* the new shapes (added at the end, so every older shape keeps its number online) */
['string', 'puppet', 'curtain', 'brick', 'brickwall', 'wreckball', 'scaffold', 'blueprint', 'starpin'].forEach(s => { if (SHAPES.indexOf(s) < 0) SHAPES.push(s); });

/* ---------- the new move kinds ---------- */
const HERO_PUPPET = { shape: 'puppet', color: '#c49a6a', size: 44, dmg: 0, b: 0, g: 0, angle: 0, speed: 0, noHit: true, puppet: true, ground: true };
function heroPuppetOf(f, g) { for (const p of g.projs) if (p.owner === f && p.m.puppet && p.life > 0) return p; return null; }
function heroSpawnPuppet(f, g, x, life) {
  const old = heroPuppetOf(f, g); if (old) old.life = 0;
  const m = Object.assign({}, HERO_PUPPET, { life: life || 600, offset: 0.01 });
  const sy = surfaceBelow(g.stage, x, f.y - 40);
  if (sy === null || sy - f.y > 400) return null;
  const p = { owner: f, tid: f.tid, key: 'down', m, shape: 'puppet', color: m.color, size: m.size, x, y: sy - m.size * 0.6, vx: 0, vy: 0, life: m.life, dmg: 0, hit: new Set(), age: 0, armed: 0, stuck: false, face: f.face };
  g.projs.push(p); emit(g, 'puppet', x, sy, f.face, f.slot);
  return p;
}
function runActX(f, inp, g, dirX, a, m) {
  const S = m.startup || 1, E = m.end || 10;
  switch (m.kind) {
    case 'puppet': {   // Marlowe sets down his puppet
      a.t++; f.pose = 'cast'; f.pt = Math.min(1, a.t / S);
      if (a.t === S) heroSpawnPuppet(f, g, f.x + f.face * (m.offset || 60), m.life);
      if (a.t >= S + E) endAct(f);
      return true;
    }
    case 'swap': {   // Marlowe swaps places with his puppet (or tosses one ahead)
      a.t++;
      if (a.t < S) { f.pose = 'vanish'; f.pt = a.t / S; f.vx *= 0.5; a.noGrav = !f.ground; if (!f.ground) f.vy *= 0.5; }
      else if (a.t === S) {
        const pp = heroPuppetOf(f, g);
        if (pp) {
          const fx = f.x, fy = f.y, py = pp.y + pp.size * 0.6;
          emit(g, 'swap', fx, fy - f.H / 2, Math.round(pp.x), Math.round(py - f.H / 2));
          f.x = pp.x; f.y = py; f.vx = 0; f.vy = 0; f.ground = null; f.inv = Math.max(f.inv, 8);
          const sy = surfaceBelow(g.stage, fx, fy - 40);
          if (sy !== null && sy - fy < 300) { pp.x = fx; pp.y = sy - pp.size * 0.6; } else pp.life = 0;   // the puppet can't hang in mid-air
        } else heroSpawnPuppet(f, g, f.x + f.face * (m.dist || 190), 420);
        a.noGrav = false;
      } else { f.pose = 'idle'; f.pt = 0; if (a.t >= S + E) endAct(f); }
      return true;
    }
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
    case 'link': {   // Astra links her stars
      a.t++; f.pose = 'cast2'; f.pt = Math.min(1, a.t / S);
      if (a.t === S) {
        let n = 0; for (const p of g.projs) if (p.owner === f && p.m.shape === 'starpin') { p.linkT = m.dur; p.linkM = m; p.armed = 1; p.linkHit = new Map(); n++; }
        emit(g, 'starlink', f.x, f.y - f.H / 2, n, f.slot);
      }
      if (a.t >= S + E) endAct(f);
      return true;
    }
    case 'comet': {   // Astra rides a comet she steers
      a.t++;
      if (a.t < S) { f.pose = 'charge'; f.pt = 0.4; f.vx *= 0.6; f.vy *= 0.5; a.noGrav = true; }
      else if (a.t < S + m.dur) {
        if (a.t === S) { a.ang = -Math.PI / 2 + f.face * 0.35; f.ground = null; f.y -= 2; }
        a.ang += dirX * (m.turn || 0.1);
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
    case 'well': {   // Astra opens a gravity well
      a.t++; f.pose = 'cast2'; f.pt = 1;
      if (!f.ground) f.vy = Math.min(f.vy, 1);
      const cx = f.x, cy = f.y - f.H / 2;
      if (a.t >= S && a.t < S + m.dur) {
        f.wellT = S + m.dur - a.t;
        if (a.t % 6 === 0) emit(g, 'well', cx, cy, m.r, f.slot);
        for (const p of g.projs) {   // catch enemy shots that come close
          if (p.tid === f.tid || p.orbit || p.carry != null || p.m.mine || p.m.ground || p.m.fuse || p.m.wall || p.m.step || p.m.noHit || p.life <= 0) continue;
          if (Math.hypot(p.x - cx, p.y - cy) > m.r) continue;
          p.owner = f; p.tid = f.tid; p.hit = new Set(); p.orbit = { ang: Math.atan2(p.y - cy, p.x - cx), r: 60 + Math.random() * 30 }; p.life = Math.max(p.life, 120);
          emit(g, 'catch', p.x, p.y);
        }
      }
      if (a.t === S + m.dur) {   // throw everything she caught at the nearest enemy
        f.wellT = 0;
        const t = nearestEnemy(f, g, 1400);
        for (const p of g.projs) if (p.orbit && p.owner === f) {
          const tx = t ? t.x : p.x + f.face * 300, ty = t ? t.y - t.H / 2 : p.y, d = Math.hypot(tx - p.x, ty - p.y) || 1, sp = Math.max(10, p.m.speed || 10) * 1.2;
          p.orbit = null; p.vx = (tx - p.x) / d * sp; p.vy = (ty - p.y) / d * sp; p.dmg *= 1.2; p.hit = new Set(); p.life = Math.max(p.life, 80); p.thrown = 1;
        }
        emit(g, 'wellthrow', cx, cy, 0, f.slot);
      }
      if (a.t >= S + m.dur + E) endAct(f);
      return true;
    }
  }
  return false;
}

/* ---------- projectiles that move their own way ---------- */
function projStepX(p, g) {
  const m = p.m;
  if (p.orbit) {   // caught in Astra's gravity well
    const o = p.owner;
    if (!o || o.out || o.dead > 0 || !(o.wellT > 0)) { const an = p.orbit.ang; p.orbit = null; p.vx = Math.cos(an) * 6; p.vy = Math.sin(an) * 6; return; }   // the well closed early: it flies off
    p.orbit.ang += 0.16; p.x = o.x + Math.cos(p.orbit.ang) * p.orbit.r; p.y = o.y - o.H / 2 + Math.sin(p.orbit.ang) * p.orbit.r * 0.8;
    p.vx = -Math.sin(p.orbit.ang); p.vy = 0; p.life = Math.max(p.life, 4);
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
  if (m.step === 'star') {   // a star pin slides to a stop and hangs there
    p.vx *= 0.88; p.vy *= 0.88; p.x += p.vx; p.y += p.vy;
    if (p.linkT > 0) { p.linkT--; p.armed = p.linkT > 0 ? 1 : 0; }
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
  // a gravity well closes if Astra gets interrupted
  for (const f of g.fighters) if (f.wellT > 0 && !(f.act && f.act.m.kind === 'well')) f.wellT = 0;
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
  // Astra's linked stars: burning lines between them
  const byOwner = new Map();
  for (const p of g.projs) if (p.m.shape === 'starpin' && p.linkT > 0 && p.life > 0) { if (!byOwner.has(p.owner)) byOwner.set(p.owner, []); byOwner.get(p.owner).push(p); }
  byOwner.forEach((stars, f) => {
    if (stars.length < 2) return;
    stars.sort((a, b) => a.age - b.age);
    const segs = []; for (let i = 0; i < stars.length - 1; i++) segs.push([stars[i], stars[i + 1]]);
    if (stars.length >= 3) segs.push([stars[stars.length - 1], stars[0]]);
    const L = stars[0].linkM;
    for (const o of g.fighters) {
      if (o.out || o.dead > 0 || o.halo > 0 || o.vanish || o.tid === f.tid) continue;
      const cx = o.x, cy = o.y - o.H / 2;
      for (const [a, b] of segs) {
        const vx = b.x - a.x, vy = b.y - a.y, len2 = vx * vx + vy * vy || 1, k = Math.max(0, Math.min(1, ((cx - a.x) * vx + (cy - a.y) * vy) / len2));
        const d = Math.hypot(a.x + vx * k - cx, a.y + vy * k - cy);
        if (d > o.W * 0.5 + 10) continue;
        const last = a.linkHit.get(o) || -999;
        if (g.frame - last < (L.rehit || 24)) break;
        a.linkHit.set(o, g.frame);
        applyHit(f, o, { dmg: L.dmg, b: L.b, g: L.g, angle: L.angle, burn: 60 }, Math.sign(cx - (a.x + b.x) / 2) || 1, g, true);
        break;
      }
    }
  });
}
/* Marlowe's puppet copies every hit he throws, from where it stands */
if (typeof hitCheck === 'function') {
  const hitCheckNoPuppet = hitCheck;
  hitCheck = function (f, g, h, a, cm) {
    hitCheckNoPuppet(f, g, h, a, cm);
    if (!f || !f.c || f.c.id !== 'marlowe' || !a || !g.projs) return;
    const pp = heroPuppetOf(f, g); if (!pp) return;
    const ox = f.x, oy = f.y, hit0 = a.hit;
    a.pupHit = a.pupHit || new Map(); a.hit = a.pupHit;
    f.x = pp.x; f.y = pp.y + pp.size * 0.6;
    try { hitCheckNoPuppet(f, g, Object.assign({}, h, { dmg: (h.dmg || 0) * 0.7 }), a, cm); }
    finally { f.x = ox; f.y = oy; a.hit = hit0; }
    if (!pp.copyT || g.frame - pp.copyT > 8) { pp.copyT = g.frame; pp.armed = 1; emit(g, 'pupcopy', pp.x, pp.y, f.face, f.slot); }
  };
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
