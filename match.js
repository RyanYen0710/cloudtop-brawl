'use strict';
/* ===== CLOUDTOP BRAWL — projectiles, match, CPU bots ===== */

function surfaceBelow(st, x, y) {
  let best = null;
  for (const s of st.surfaces) {
    if (!s.off && x >= s.x && x <= s.x + s.w && s.y >= y - 2 && (best === null || s.y < best)) best = s.y;
  }
  return best;
}

function spawnProj(f, g, m, key, frac) {
  frac = frac || 0;
  const make = (x, y, vx, vy) => ({
    owner: f, tid: f.tid, key, m, shape: m.shape || 'orb', color: m.color || '#ffffff', size: m.size || 10,
    x, y, vx: vx, vy: vy + (m.jitter ? (Math.random() - 0.5) * m.jitter : 0), life: m.life || 60, dmg: m.dmg, hit: new Set(), age: 0, armed: 0, stuck: false, face: f.face
  });
  const sp = (m.speed || 0) * (1 + frac * 0.5);
  const list = [];
  if (m.rain) {
    const R = m.rain;
    for (let i = 0; i < R.n; i++) list.push(make(f.x + f.face * (R.first + i * R.gap), f.y - R.height - (i % 2) * 40 - i * 12, f.face * 1.2, sp));
  } else if (m.spread) {
    m.spread.forEach(d => { const a2 = d * D2R; list.push(make(f.x + f.face * f.W * 0.6, f.y - f.H * 0.6, f.face * sp * Math.cos(a2), -sp * Math.sin(a2))); });
  } else {
    const p = make(f.x + f.face * f.W * 0.7, f.y - f.H * 0.6, f.face * sp, 0);
    if (m.aim) { const a2 = m.aim * D2R; p.vx = f.face * sp * Math.cos(a2); p.vy = -sp * Math.sin(a2); }
    if (m.yoff != null) p.y = f.y - m.yoff;
    if (m.mine) { p.x = f.x + f.face * f.W * 0.3; p.y = f.y - p.size; p.vx = f.face * 1.2; p.vy = -3; }
    if (m.offset) p.x = f.x + f.face * m.offset;
    if (m.sky) {
      let best = null, bd = 620;
      for (const o of g.fighters) {
        if (o === f || o.out || o.dead > 0 || o.vanish || o.tid === f.tid) continue;
        const d = Math.abs(o.x - f.x) + Math.abs(o.y - f.y) * 0.5; if (d < bd) { bd = d; best = o; }
      }
      p.x = best ? best.x + best.vx * 6 : f.x + f.face * 200;
      p.y = Math.min(f.y, best ? best.y : f.y) - 560; p.vx = 0; p.vy = m.speed; p.dir = 1;
    }
    if (m.ground) {
      const sy = f.ground ? f.y : surfaceBelow(g.stage, p.x, f.y);
      if (sy === null) return;
      p.y = sy - p.size * 0.6;
    }
    if (frac > 0) {
      p.dmg *= 1 + frac * ((m.chargeMul || 1) - 1 + 0.6); p.bMul = 1 + frac * 0.6; p.size *= 1 + frac * 0.35;
      if (frac >= 0.8) { p.pierce = true; p.charged = true; }
    }
    list.push(p);
  }
  // Mira's Freeze Ray: an armed shot freezes, then the ray goes on cooldown
  const FR = f.c.freezeRay;
  if (FR && key === 'neutral' && f.frzOn && !(f.frzCD > 0) && list.length) {
    list.forEach(p => { p.frz = FR.freeze; p.size *= 1.35; p.color = '#ffffff'; p.charged = true; });
    f.frzOn = false; f.frzCD = FR.cd;
    emit(g, 'frzfire', f.x, f.y - f.H * 0.6, 0, f.slot);
  }
  list.forEach(p => g.projs.push(p));
  if (list.length) emit(g, 'shoot', list[0].x, list[0].y, SHAPES.indexOf(list[0].shape));
}

/* a projectile that releases something where it ends (summoned creatures, potion puddles) */
function spawnChild(p, g, out) {
  const c = Array.isArray(p.m.child) ? p.m.child[Math.floor(Math.random() * p.m.child.length)] : p.m.child;
  const B = g.stage.blast;
  if (p.x < B.l + 40 || p.x > B.r - 40 || p.y > B.b - 40 || p.y < B.t) return;
  const dir = p.face || Math.sign(p.vx) || 1;
  let y = p.y + (c.yoff || 0);
  if (c.ground) {
    const sy = surfaceBelow(g.stage, p.x, p.y - 30);
    if (sy === null || sy - p.y > 220) return;
    y = sy - c.size * 0.12;
  }
  out.push({
    owner: p.owner, tid: p.tid, key: p.key, m: c, shape: c.shape, color: c.color, size: c.size,
    x: p.x, y, vx: dir * (c.speed || 0), vy: 0, life: c.life || 60, dmg: c.dmg, hit: new Set(), age: 0, armed: 0, stuck: false, face: dir, child: 1
  });
  emit(g, 'summon', p.x, y, SHAPES.indexOf(c.shape), dir);
}

function reflectProjs(f, g, m) {
  const r = m.range || 1.5;
  const box = { x: f.face > 0 ? f.x - f.W * 0.2 : f.x - f.W * r, y: f.y - f.H * 1.1, w: f.W * (r + 0.2), h: f.H * 1.2 };
  for (const p of g.projs) {
    if (p.tid === f.tid || p.m.mine || p.m.ground) continue;
    if (!circRect(p.x, p.y, p.size * 0.6, box)) continue;
    p.vx = f.face * Math.max(Math.abs(p.vx), 6) * 1.25; p.vy *= -0.3;
    p.owner = f; p.tid = f.tid; p.dmg *= 1.25; p.hit = new Set(); p.life = Math.max(p.life, 50);
    emit(g, 'reflect', p.x, p.y);
  }
}

function burstProj(p, g) {
  const b = p.m.burst;
  emit(g, b.fx || 'voidburst', p.x, p.y, b.r || 110);
  g.shake = Math.max(g.shake, 9);
  for (const o of g.fighters) {
    if (o.out || o.dead > 0 || o.tid === p.tid) continue;
    if (Math.hypot(o.x - p.x, (o.y - o.H / 2) - p.y) < (b.r || 110) + o.W * 0.4) applyHit(p.owner, o, b, Math.sign(o.x - p.x) || 1, g, true);
  }
}

function explode(p, g) {
  p.life = 0;
  emit(g, p.m.flash ? 'flashpop' : 'boom', p.x, p.y);
  g.shake = Math.max(g.shake, p.m.flash ? 5 : 10);
  for (const o of g.fighters) {
    if (o.out || o.dead > 0 || o.tid === p.tid) continue;
    if (Math.hypot(o.x - p.x, (o.y - o.H / 2) - p.y) < 95) {
      applyHit(p.owner, o, { dmg: p.dmg, b: p.m.b, g: p.m.g, angle: p.m.angle, burn: p.m.burn, zap: p.m.zap, slow: p.m.slow, flash: p.m.flash }, Math.sign(o.x - p.x) || 1, g, true);
    }
  }
}

function stepProjs(g) {
  const st = g.stage, B = st.blast;
  for (const p of g.projs) {
    p.age++; p.life--;
    const m = p.m;
    if (m.rehit && p.age % m.rehit === 0) { const hadOrb = p.hit.has('orb'); p.hit.clear(); if (hadOrb) p.hit.add('orb'); }
    if (m.pull) pullEnemies(p.owner, g, p.x, p.y, m.pullR || 200, m.pull);
    if (p.life <= 0 && m.burst && !p.burst) { p.burst = 1; burstProj(p, g); continue; }
    if (m.mine) {
      if (p.stuck && p.on) { if (p.on.off) { p.stuck = false; p.on = null; } else { p.x += p.on.dx || 0; p.y += p.on.dy || 0; } }
      if (!p.stuck) {
        p.vy += m.grav || 0.5; p.x += p.vx; p.y += p.vy;
        const bot = p.y + p.size * 0.5, prev = bot - p.vy;
        for (const s of st.surfaces) {
          if (!s.off && p.x >= s.x && p.x <= s.x + s.w && prev <= s.y + 2 && bot >= s.y) { p.y = s.y - p.size * 0.5; p.stuck = true; p.on = s; p.vx = 0; p.vy = 0; break; }
        }
      }
      if (p.age > 35) p.armed = 1;
      if (p.armed) {
        for (const o of g.fighters) {
          if (o.out || o.dead > 0 || o.vanish || o.tid === p.tid) continue;
          if (Math.hypot(o.x - p.x, (o.y - o.H / 2) - p.y) < o.W * 0.5 + 40) { explode(p, g); break; }
        }
      }
    } else if (m.ground && p.child) {
      /* puddles sit on the floor (and ride moving platforms) */
      if (p.vx) p.x += p.vx;
      const s = surfaceBelow(st, p.x, p.y - 20);
      if (s === null || Math.abs(s - p.y) > 40) p.life = Math.min(p.life, 8); else p.y = s - p.size * 0.12;
    } else if (m.ground) {
      p.x += p.vx;
      const s = surfaceBelow(st, p.x, p.y + p.size * 0.6 - 4);
      if (s === null || Math.abs(s - (p.y + p.size * 0.6)) > 6) p.life = 0;
    } else if (m.fuse) {
      if (p.stuck && p.on) { if (p.on.off) { p.stuck = false; p.on = null; } else { p.x += p.on.dx || 0; p.y += p.on.dy || 0; } }
      if (!p.stuck) {
        p.vy += m.grav || 0.4; p.x += p.vx; p.y += p.vy;
        for (const s of st.surfaces) {
          if (s.off || p.x < s.x || p.x > s.x + s.w) continue;
          const inSolid = s.solid && p.y > s.y && p.y < s.y + s.h;
          if ((p.y - p.vy <= s.y + 2 && p.y >= s.y) || inSolid) { p.ang = Math.atan2(p.vy, p.vx); p.y = s.y - 2; p.stuck = true; p.on = s; p.vx = 0; p.vy = 0; p.fuseT = m.fuse; emit(g, 'thunk', p.x, p.y); break; }
        }
      } else if (--p.fuseT <= 0) { explode(p, g); continue; }
      p.armed = p.stuck ? 1 : 0;
    } else {
      if (m.returns && p.age > (m.turn || 26)) {
        const o = p.owner, dx = o.x - p.x, dy = (o.y - o.H / 2) - p.y, d = Math.hypot(dx, dy) || 1;
        if (!p.back) { p.back = 1; const hadOrb = p.hit.has('orb'); p.hit.clear(); if (hadOrb) p.hit.add('orb'); }
        p.vx += dx / d * 1.3; p.vy += dy / d * 1.3;
        const v = Math.hypot(p.vx, p.vy), vm = (m.speed || 10) * 1.15; if (v > vm) { p.vx *= vm / v; p.vy *= vm / v; }
        if (d < 34 || o.dead > 0 || o.out) { p.life = 0; if (d < 34) emit(g, 'catch', o.x, o.y - o.H / 2); continue; }
      }
      p.vy += m.grav || 0; p.x += p.vx; p.y += p.vy;
      if (m.wave) p.y += Math.cos(p.age * 0.28) * m.wave;
      if (m.grow && p.size < (m.maxSize || 80)) p.size += m.grow;
      if ((m.land || m.bounce) && p.vy > 0) {
        const bot = p.y + p.size * 0.45;
        for (const s of st.surfaces) {
          if (s.off || p.x < s.x || p.x > s.x + s.w || bot - p.vy > s.y + 3 || bot < s.y) continue;
          p.y = s.y - p.size * 0.45;
          if (m.land) { p.life = 0; break; }
          p.bounces = (p.bounces || 0) + 1;
          if (p.bounces > m.bounce) { p.life = 0; emit(g, 'clank', p.x, s.y); break; }
          p.vy = -Math.max(5, Math.abs(p.vy) * 0.72); emit(g, 'clank', p.x, s.y);
          p.hit.clear();
          break;
        }
        if (p.life <= 0) continue;
      }
      if (!m.returns) for (const mb of st.solids) if (p.x > mb.x && p.x < mb.x + mb.w && p.y > mb.y + 4 && p.y < mb.y + mb.h + 60) {
        if (m.sky || m.skyFx) { emit(g, m.skyFx || 'zap', p.x, mb.y); g.shake = Math.max(g.shake, 6); }
        if (m.burst && !p.burst) { p.burst = 1; burstProj(p, g); }
        p.life = 0;
      }
    }
    if (p.life <= 0) continue;
    if (m.finalB && p.life === 8) { p.hit.clear(); p.dmg = m.dmg * 1.8; p.bMul = 2.2; }
    if (!m.mine) {
      for (const o of g.fighters) {
        if (o.out || o.dead > 0 || o.halo > 0 || o.vanish || o.tid === p.tid || p.hit.has(o)) continue;
        if (m.tall ? !overlap({ x: p.x - p.size * 0.55, y: p.y - p.size * 3.4, w: p.size * 1.1, h: p.size * 3.9 }, hurtbox(o)) : !circRect(p.x, p.y, p.size * 0.6, hurtbox(o))) continue;
        p.hit.add(o);
        const dir = Math.sign(p.vx) || (o.x > p.x ? 1 : -1);
        if (m.fuse) { if (!p.stuck) explode(p, g); p.hit.delete(o); break; }
        const r = applyHit(p.owner, o, { dmg: p.dmg, b: m.b * (p.bMul || 1), g: m.g, angle: m.angle, freeze: m.freeze || p.frz, burn: m.burn, zap: m.zap, slow: m.slow, flash: m.flash }, dir, g, p);
        if (!(m.pierce || p.pierce) || r === 'block' || r === 'counter') { p.life = 0; break; }
      }
    }
    if (p.life > 0 && g.orb && !m.mine && !p.hit.has('orb') && !p.owner.ult && Math.hypot(p.x - g.orb.x, p.y - g.orb.y) < ORB_R + p.size * 0.5) {
      p.hit.add('orb'); hitOrb(p.owner, g, p.dmg, Math.sign(p.vx) || 1, 0);
      if (!(m.pierce || p.pierce)) p.life = 0;
    }
    if (p.x < B.l || p.x > B.r || p.y > B.b || p.y < B.t) p.life = 0;
  }
  const ps = g.projs;
  for (let i = 0; i < ps.length; i++) {
    const a = ps[i]; if (a.life <= 0 || a.m.mine || a.m.shape === 'puddle') continue;
    for (let j = i + 1; j < ps.length; j++) {
      const b = ps[j]; if (b.life <= 0 || b.m.mine || b.m.shape === 'puddle' || a.tid === b.tid) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < (a.size + b.size) * 0.5) {
        if (!a.m.pierce || b.m.pierce) b.life = 0;
        if (!b.m.pierce || a.m.pierce) a.life = 0;
        emit(g, 'clash', (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
    }
  }
  const kids = [];
  for (const p of ps) if (p.life <= 0 && p.m.child && !p.kid) { p.kid = 1; spawnChild(p, g, kids); }
  g.projs = ps.filter(p => p.life > 0).concat(kids);
}

/* ---------- match ---------- */
function spawnSpots(st, n) {
  const B = st.bounds, out = [];
  for (let k = 0; k < n; k++) {
    let x = B.minx + 80 + (B.maxx - B.minx - 160) * ((k + 0.5) / n);
    let best = null, bd = 1e9;
    for (const s of st.solids) {
      const cx = clamp(x, s.x + 40, s.x + s.w - 40), d = Math.abs(cx - x);
      if (d < bd) { bd = d; best = { x: cx, y: s.y }; }
    }
    out.push(best);
  }
  return out;
}

function makeGame(cfg) {
  const st = buildStage(STAGES[cfg.stage] || STAGES[0]);
  updateStage(st, 0);
  const g = { cfg, stage: st, fighters: [], projs: [], events: [], evId: 0, frame: 0, over: false, overT: 0, elim: [], shake: 0, winTid: null, seen: 0, gravMul: 1,
    timeLeft: (!cfg.endless && cfg.time) ? cfg.time * 3600 : 0, timeUp: false, orb: null, orbNext: 1800 + Math.floor(Math.random() * 1200), ult: null };
  const active = cfg.slots.map((s, i) => Object.assign({}, s, { slot: i })).filter(s => s.type === 'you' || s.type === 'peer' || s.type === 'cpu');
  const spots = spawnSpots(st, active.length);
  active.forEach((s, k) => {
    const tid = cfg.teams ? s.team : s.slot;
    const f = new Fighter({
      slot: s.slot, charId: s.char, tid, team: s.team, name: s.name || ('P' + (s.slot + 1)),
      stocks: s.stocks || cfg.stocks, boss: s.boss || null, ctrl: s.ctrl || { type: 'none' }, lvl: s.lvl || 5, sx: spots[k].x, sy: spots[k].y,
      color: cfg.teams ? TEAM_COLORS[s.team] : SLOT_COLORS[s.slot], tag: s.tag || ('P' + (s.slot + 1))
    });
    f.face = f.x < st.cx ? 1 : -1;
    g.fighters.push(f);
  });
  return g;
}

function decodeIn(o) {
  const b = o ? o.b : 0, p = o ? o.pr : 0;
  return {
    mode: (b >> 10) & 7,
    l: !!(b & BL), r: !!(b & BR), u: !!(b & BU), d: !!(b & BD), jump: !!(b & BJ), atk: !!(b & BA), sp: !!(b & BS), sm: !!(b & BM), sh: !!(b & BH), z: !!(b & BZ),
    lp: !!(p & BL), rp: !!(p & BR), up: !!(p & BU), dp: !!(p & BD), jp: !!(p & BJ), ap: !!(p & BA), spp: !!(p & BS), smp: !!(p & BM), shp: !!(p & BH), zp: !!(p & BZ)
  };
}

function stepGame(g, inputs) {
  g.frame++;
  if (g.over) g.overT++;
  if (typeof stepUlt === 'function' && stepUlt(g, inputs)) { if (g.shake > 0) g.shake *= 0.9; return; }
  updateStage(g.stage, g.frame);
  stageHazards(g);
  g.fighters.forEach((f, i) => {
    if (f.vanish) return;                          // off aiming an ultimate
    const inp = decodeIn(g.over ? null : inputs[i]);
    if (f.c.freezeRay) {                               // F toggles the freeze ray (sent as a style value: even = on)
      if (f.frzCD > 0) f.frzCD--;
      if (f.frzMode === undefined) f.frzMode = inp.mode;
      else if (inp.mode !== f.frzMode) {
        f.frzMode = inp.mode;
        const want = inp.mode > 0 && inp.mode % 2 === 0;
        if (inp.mode && want !== !!f.frzOn && !(want && f.frzCD > 0)) { f.frzOn = want; emit(g, 'frzarm', f.x, f.y - f.H / 2, want ? 1 : 0, f.slot); }
      }
    }
    if (inp.mode && f.c.modes && inp.mode <= f.c.modes.length && f.yenMode !== inp.mode - 1 && !f.out && f.dead <= 0) {
      f.yenMode = inp.mode - 1; emit(g, 'mode', f.x, f.y - f.H / 2, f.yenMode, f.slot);
    }
    if (inp.zp && typeof tryUlt === 'function') tryUlt(f, g);
    stepFighter(f, inp, g);
  });
  stepProjs(g);
  if (typeof stepOrb === 'function') stepOrb(g);
  if (g.shake > 0) g.shake = g.shake * 0.86 < 0.3 ? 0 : g.shake * 0.86;
  if (!g.over && !g.cfg.endless && g.fighters.length > 1) {
    const alive = new Set(g.fighters.filter(f => !f.out).map(f => f.tid));
    if (alive.size <= 1) { g.over = true; g.overT = 0; g.winTid = alive.size ? [...alive][0] : null; emit(g, 'game', 800, 300); }
    else if (g.timeLeft > 0 && --g.timeLeft === 0) timeUp(g);
  }
}

function teamScore(g) {
  const sc = new Map();
  g.fighters.forEach(f => {
    const o = sc.get(f.tid) || { stocks: 0, dmg: 0 };
    if (!f.out) { o.stocks += f.stocks; o.dmg += f.dmg; }
    sc.set(f.tid, o);
  });
  return sc;
}
function timeUp(g) {
  g.over = true; g.overT = 0; g.timeUp = true;
  const sc = [...teamScore(g).entries()].sort((a, b) => b[1].stocks - a[1].stocks || a[1].dmg - b[1].dmg);
  const tie = sc.length > 1 && sc[0][1].stocks === sc[1][1].stocks && Math.round(sc[0][1].dmg) === Math.round(sc[1][1].dmg);
  g.winTid = tie ? null : sc[0][0];
  emit(g, 'game', 800, 300, 1);
}

function computeResults(g) {
  const rows = g.fighters.map(f => ({ slot: f.slot, name: f.name, tag: f.tag, char: f.c.id, kos: f.kos, falls: f.falls, color: f.color, tid: f.tid, team: f.team, win: g.winTid !== null && f.tid === g.winTid, place: 0, stocks: f.out ? 0 : f.stocks, dmg: f.dmg, out: f.out }));
  if (g.timeUp) {
    const elimIdx = f => { const i = g.elim.findIndex(e => e.slot === f.slot); return i < 0 ? 999 : i; };
    rows.sort((a, b) => (b.win - a.win) || (b.out === a.out ? 0 : a.out ? 1 : -1) || b.stocks - a.stocks || a.dmg - b.dmg || elimIdx(b) - elimIdx(a));
    rows.forEach((r, i) => { r.place = r.win ? 1 : i + 1; });
    return rows;
  }
  rows.forEach(r => { if (r.win) r.place = 1; });
  let place = rows.filter(r => r.win).length + 1;
  g.elim.slice().reverse().forEach(f => { const r = rows.find(x => x.slot === f.slot); if (r && !r.place) r.place = place++; });
  rows.forEach(r => { if (!r.place) r.place = place++; });
  rows.sort((a, b) => a.place - b.place || b.kos - a.kos);
  return rows;
}

/* ---------- CPU brain ---------- */
/* a CPU Legend Yen switches style every few seconds */
function aiThink(f, g) {
  if (g.ult && g.ult.slot === f.slot && g.ult.ph === 'aim' && typeof aiUltAim === 'function') return aiUltAim(f, g);
  const r = aiThinkCore(f, g);
  if (f.c.freezeRay && f.ai && !f.out && f.dead <= 0) {
    const A = f.ai; if (A.frzV == null) A.frzV = 1;
    const t = nearestEnemy(f, g);
    if (!f.frzOn && !(f.frzCD > 0) && t && Math.abs(t.x - f.x) < 520 && Math.random() < 0.02 * clamp(f.lvl || 5, 1, 11) / 5) A.frzV = A.frzV === 2 ? 4 : 2;
    else if (A.frzV % 2 === 0 && !f.frzOn) A.frzV = A.frzV === 2 ? 3 : 1;
    r.b = (r.b & ~(7 << 10)) | (A.frzV << 10);
  }
  if (f.c.modes && !f.out && f.dead <= 0 && f.ai) {
    if (f.ai.modeT == null) f.ai.modeT = 120 + Math.floor(Math.random() * 240);
    if (--f.ai.modeT <= 0) {
      f.ai.modeT = 240 + Math.floor(Math.random() * 420);
      const m = Math.floor(Math.random() * f.c.modes.length);
      r.b |= (m + 1) << 10;
    }
  }
  return r;
}
/* skill tables by CPU level (index = level; 11 is the boss-only "MAX" brain) */
const AI_DEF = [0, 0.08, 0.18, 0.3, 0.45, 0.6, 0.7, 0.8, 0.88, 0.93, 0.97, 0.99]; // chance to notice and answer a threat
const AI_RX = [0, 24, 21, 18, 15, 13, 11, 9, 7, 5, 4, 3];                            // reaction time in frames

/* how far an enemy's current move can reach (rough, generous) */
function aiMoveReach(t, m) {
  const k = m.kind || 'melee';
  if (k === 'dash') return (m.vx || 10) * (m.dur || 16) * 0.7 + t.W;
  if (k === 'teleport') return m.behind ? 320 : Math.abs(m.dist || 0) + t.W * 1.5;
  if (k === 'aura') return (m.r || m.range || 130) + t.W * 0.5;
  if (k === 'slam') return (m.hw || 3) * t.W * 0.6 + 30;
  if (k === 'leap') return (m.hw || 1.4) * t.W * 0.7 + 40;
  return ((m.hx || 0.8) + (m.hw || 1) / 2) * t.W + (m.lunge || 0) * 6 + 18;
}
/* the most urgent danger to f: an incoming projectile or an enemy attack about to land */
function aiThreat(f, g) {
  let best = null;
  const fy0 = f.y - f.H, fy1 = f.y;
  for (const p of g.projs) {
    if (p.tid === f.tid || p.stuck || p.life <= 0 || p.hit.has(f)) continue;
    const rel = f.x - p.x, pad = (p.size || 10) + f.W * 0.5;
    let tt;
    if (Math.abs(p.vx) < 0.6) {
      if (Math.abs(rel) > pad + 10) continue;
      if (p.vy > 0.5 && p.y < fy1) tt = Math.max(0, (fy0 - p.y) / p.vy); else if (p.y >= fy0 - pad && p.y <= fy1 + pad) tt = 0; else continue;
    } else {
      const close = (p.vx - f.vx) * Math.sign(rel);           // closing speed, counting our own movement
      if (close <= 0.3 && Math.abs(rel) > pad) continue;
      tt = Math.max(0, (Math.abs(rel) - pad) / Math.max(0.3, close));
      const py = p.y + p.vy * tt - f.vy * tt;
      if (py < fy0 - (p.size || 10) - 6 || py > fy1 + (p.size || 10) + 6) continue;
    }
    if (tt > 26) continue;
    if (!best || tt < best.tt) best = { tt, key: p, proj: p, x: p.x, low: p.y > f.y - f.H * 0.55 };
  }
  for (const o of g.fighters) {
    if (o === f || o.out || o.dead > 0 || o.tid === f.tid || !o.act) continue;
    const m = o.act.m, k = m.kind || 'melee';
    if (k === 'proj' || k === 'fly' || k === 'counter' || k === 'reflect') continue;
    const S = m.startup || 1, Act = m.active || m.dur || 6;
    if (o.act.t > S + Act) continue;
    const dx = f.x - o.x, adx = Math.abs(dx);
    const facing = Math.sign(dx) === o.face || k === 'aura' || k === 'slam' || m.sides || m.behind;
    if (!facing || adx > aiMoveReach(o, m) || Math.abs(f.y - o.y) > o.H * 1.6 + 40) continue;
    const tt = Math.max(0, S - o.act.t);
    if (!best || tt < best.tt) best = { tt, key: o.act, att: o, x: o.x, low: false };
  }
  return best;
}
/* pick an attack aimed at t from close range */
function aiStrike(f, t, P, toward) {
  let b = 0, pr = 0;
  const dy = t.y - f.y, adx = Math.abs(t.x - f.x);
  if (Math.sign(t.x - f.x) !== f.face) b |= toward;
  if (f.ground) {
    if (dy < -f.H * 0.8) { b |= BU; pr |= Math.random() < 0.5 ? BA : BM; }
    else if (t.dmg > 85 - P * 15 && adx < f.W * 1.6 + 30 && Math.random() < 0.55 + P * 0.3) { b |= toward; pr |= BM; }
    else { const q = Math.random(); if (q < 0.4) pr |= BA; else if (q < 0.8) { b |= toward; pr |= BA; } else { b |= toward; pr |= BM; } }
  } else {
    if (dy < -f.H * 0.5) b |= BU; else if (dy > f.H * 0.5) b |= BD; else b |= toward;
    pr |= BA;
  }
  return { b, pr };
}
function aiThinkCore(f, g) {
  const A = f.ai || (f.ai = { held: 0, cd: 0 });
  const LV = clamp(f.lvl || 5, 1, 11), P = LV / 10;
  let b = 0, pr = 0;
  if (f.out || f.dead > 0) return { b, pr };
  const brain = aiBrain(f, g, A, LV, P);
  if (brain) return brain;
  if (f.halo > 0) { if (Math.random() < 0.02 + P * 0.03) pr |= BD; return { b, pr }; }
  const st = g.stage;
  if (g.ult && g.ult.ph !== 'aim' && g.ult.ph !== 'lock') return { b: 0, pr: 0 };
  if (f.ult) {
    if (A.ultWait == null) A.ultWait = Math.round(20 + Math.random() * 70);
    if (--A.ultWait <= 0 && !f.ledge && f.hitstun <= 0) { A.ultWait = null; return { b: 0, pr: BZ }; }
  }
  let ns = st.solids[0], nd = 1e9;
  for (const s of st.solids) { const d = Math.abs(clamp(f.x, s.x, s.x + s.w) - f.x) + Math.max(0, f.y - s.y) * 0.3; if (d < nd) { nd = d; ns = s; } }
  const m = ns, cx = m.x + m.w / 2;
  if (f.ledge) {
    if (A.ledgeWait == null) A.ledgeWait = Math.round(8 + Math.random() * (60 - P * 45));
    if (--A.ledgeWait > 0 || f.ledge.mode) return { b: 0, pr: 0 };
    A.ledgeWait = null;
    const r = Math.random(), inward = f.ledge.side < 0 ? BR : BL;
    if (r < 0.35) return { b: 0, pr: BJ };
    if (r < 0.7) return { b: inward, pr: inward };
    if (r < 0.85) return { b: BH, pr: BH };
    return { b: 0, pr: BA };
  }
  A.ledgeWait = null;
  const overSomething = surfaceBelow(st, f.x, f.y) !== null;
  const offstage = !f.ground && (!overSomething || f.y > m.y + 5 && (f.x < m.x - 5 || f.x > m.x + m.w + 5));
  if (offstage && f.hitstun <= 0) {
    b |= f.x < cx ? BR : BL;
    if (f.flyT > 0) { if (f.y > m.y - 90) b |= BU; return { b, pr }; }
    if (f.helpless) return { b, pr };
    const up = fSpecials(f).up;
    if (f.vy > -1 && f.jumps > 0 && Math.random() < 0.3) pr |= BJ;
    else if (f.jumps === 0 && f.vy > 0 && !f.upUsed && (up.kind === 'fly' ? f.canFly : (f.y > m.y - 70 || Math.abs(f.x - cx) > m.w / 2 + 150))) { b |= BU; pr |= BS; }
    return { b, pr };
  }
  let t = nearestEnemy(f, g);
  if (g.orb && !f.ult && (!t || Math.hypot(g.orb.x - f.x, g.orb.y - f.y) < Math.hypot(t.x - f.x, t.y - f.y) * 1.3 || (A.orbFocus = (A.orbFocus || 0) > 0 ? A.orbFocus - 1 : (Math.random() < 0.004 ? 240 : 0)) > 0)) {
    t = { x: g.orb.x, y: g.orb.y + f.H * 0.5, W: 50, H: 50, act: null, isOrb: true };
  }
  if (!t) return { b, pr };
  if (t.isOrb) {
    const odx = g.orb.x - f.x, ody = g.orb.y - (f.y - f.H * 0.5);
    if (A.cd > 0) { A.cd--; return { b: A.held, pr: 0 }; }
    A.cd = Math.round(6 - P * 4);
    let ob = Math.abs(odx) > 30 ? (odx > 0 ? BR : BL) : 0, opr = 0;
    if (ody < -60 && Math.abs(odx) < 180) { if (f.ground || (f.jumps > 0 && f.vy > -2)) opr |= BJ; }
    if (Math.hypot(odx, ody) < f.W + 70) { if (ody < -f.H * 0.4) ob |= BU; opr |= Math.random() < 0.25 ? BM : BA; }
    A.held = ob & (BL | BR | BU);
    return { b: ob, pr: opr };
  }
  if (A.cd > 0) { A.cd--; return { b: A.held, pr: 0 }; }
  A.cd = Math.max(1, Math.round(13 - P * 10 + Math.random() * 4));
  const dx = t.x - f.x, adx = Math.abs(dx), dy = t.y - f.y;
  const toward = dx > 0 ? BR : BL, away = dx > 0 ? BL : BR, faceOk = Math.sign(dx) === f.face;
  const reach = f.W * 1.2 + 34;
  const gr = f.ground;
  const nearEdge = !!gr && ((toward === BR && f.x > gr.x + gr.w - 36 && surfaceBelow(st, f.x + 60, f.y) === null) || (toward === BL && f.x < gr.x + 36 && surfaceBelow(st, f.x - 60, f.y) === null));
  const tOff = !t.isOrb && surfaceBelow(st, t.x, t.y - 5) === null;

  if (t.act && t.hot !== undefined && adx < t.W * 2 + 70 && f.ground && Math.random() < P * 0.5) {
    b = BH; if (Math.random() < 0.3 * P) pr |= away;
    A.held = BH; A.cd = 8 + Math.round(Math.random() * 8);
    return { b, pr };
  }
  const sp = fSpecials(f);
  if (adx > reach) {
    if (sp.neutral.kind === 'proj' && adx > 200 && Math.abs(dy) < 70 && Math.random() < 0.12 + 0.25 * P) {
      if (faceOk) pr |= BS; else b |= toward;
    } else if ((sp.side.kind === 'dash' || sp.side.kind === 'teleport' && !sp.side.rewind || sp.side.kind === 'proj') && adx < 420 && Math.abs(dy) < 60 && !tOff && Math.random() < 0.07 * P + 0.02) {
      b |= toward; pr |= BS;
    } else {
      if (!nearEdge && !(tOff && f.ground)) b |= toward;
      if (dy < -70 && f.ground && Math.random() < 0.55) pr |= BJ;
      else if (dy < -70 && !f.ground && f.jumps > 0 && f.vy > 0 && Math.random() < 0.3) pr |= BJ;
    }
  } else {
    const r = Math.random();
    if (r < 0.3 + 0.6 * P) {
      if (!faceOk) b |= toward;
      if (dy < -f.H * 0.8) { b |= BU; pr |= Math.random() < 0.35 * P ? BM : BA; }
      else if (!f.ground) { if (dy > f.H * 0.4) b |= BD; else if (faceOk) b |= toward; pr |= BA; }
      else {
        const q = Math.random();
        if (q < 0.3) pr |= BA;
        else if (q < 0.5) { b |= toward; pr |= BA; }
        else if (q < 0.66 + 0.1 * P) { b |= toward; pr |= BM; if (P > 0.6 && Math.random() < 0.4) b |= BM; }
        else if (q < 0.8) { b |= BD; pr |= BS; }
        else if (q < 0.9) { b |= toward; pr |= BS; }
        else pr |= BS;
      }
    } else if (r < 0.85) {
      if (!nearEdge) b |= away;
      if (Math.random() < 0.25) pr |= BJ;
    }
  }
  A.held = b & (BL | BR | BU | BD | BH | BM);
  return { b, pr };
}

/* the "smart" layer: defend against shots and attacks, punish mistakes, follow up combos,
   and get out of combos. Returns inputs, or null to let the basic brain decide. */
function aiBrain(f, g, A, LV, P) {
  const DEF = AI_DEF[LV], RX = AI_RX[LV];
  const wasStun = A.stun || 0; A.stun = f.hitstun;
  if (g.ult && (g.ult.ph === 'aim' || g.ult.ph === 'lock') && !f.ledge && f.hitstun <= 0 && g.ult.slot !== f.slot) {
    // an ultimate crosshair is hunting. How well a CPU dodges is pure skill, set by its level (no dice rolls):
    //  - how far away it notices the crosshair     lvl 1: only when it's on top of it   lvl 10: from far away
    //  - how fast it reacts when the circle locks  lvl 1: ~0.5 s (too slow to escape)    lvl 10: ~0.07 s
    //  - low levels just run straight away (even toward an edge); level 4+ steer toward open floor,
    //    level 6+ jump when the circle is low, level 8+ roll out at the last moment
    const u = g.ult, ddx = f.x - u.ax, d = Math.hypot(ddx, f.y - f.H / 2 - u.ay);
    if (A.udKey !== u) { A.udKey = u; A.udAim = -1; A.udLock = -1; }
    const notice = ULT_R * 0.6 + LV * 22, react = Math.max(3, 34 - LV * 3);
    let go = false;
    if (u.ph === 'aim') {
      if (LV >= 3 && d < notice) { if (A.udAim < 0) A.udAim = g.frame; go = g.frame - A.udAim >= react; }
      else A.udAim = -1;
    } else {
      if (A.udLock < 0) A.udLock = g.frame;
      go = g.frame - A.udLock >= react && d < ULT_R + 40 + LV * 6;
    }
    if (go) {
      const st0 = g.stage, run = ddx >= 0 ? BR : BL;
      const edge = surfaceBelow(st0, f.x + (ddx >= 0 ? 110 : -110), f.y) === null;
      const dir = LV >= 4 && edge ? (run === BR ? BL : BR) : run;      // smarter CPUs don't run off the stage
      let pr0 = 0;
      const lockLeft = u.ph === 'lock' ? u.lock : 99;
      if (LV >= 8 && u.ph === 'lock' && f.ground && lockLeft <= 20 && d < ULT_R + 10) return { b: BH, pr: dir };   // roll out
      if (LV >= 6 && f.ground && (u.ay > f.y - f.H * 1.1 || dir !== run) && (g.frame + f.slot * 7) % 24 === 0) pr0 |= BJ;
      A.held = dir; A.cd = 2; return { b: dir, pr: pr0 };
    }
  }
  if (f.halo > 0 || f.ledge || (g.ult && g.ult.ph !== 'aim' && g.ult.ph !== 'lock') || f.hitstun > 0 || f.frozen > 0 || f.zap > 0 || f.shieldBreak > 0) { A.guard = 0; return null; }
  // lava stage: get up onto a platform before the lava rises (and stay there while it's up)
  if (g.stage.hazard === 'lava' && typeof lavaState === 'function') {
    const ls = lavaState(g.frame), top = g.stage.solids[0].y - 55;
    if ((ls.warn || ls.lvl < 1) && f.y > top - 8 && Math.random() < 0.35 + DEF * 0.65) {
      let best = null, bd = 1e9;
      for (const p of g.stage.plats) { if (p.y > top - 20) continue; const d = Math.abs(p.x + p.w / 2 - f.x) + Math.abs(f.y - p.y) * 0.5; if (d < bd) { bd = d; best = p; } }
      if (best) {
        const px = best.x + best.w / 2, b0 = Math.abs(px - f.x) > best.w * 0.3 ? (px > f.x ? BR : BL) : 0;
        let p0 = 0;
        if (f.ground && Math.abs(px - f.x) < 170) p0 |= BJ;
        else if (!f.ground && f.vy > -1 && f.jumps > 0 && f.y > best.y + 10) p0 |= BJ;
        A.held = b0; A.cd = 2; return { b: b0, pr: p0 };
      }
    }
  }
  if (f.ult) return null;
  const t = nearestEnemy(f, g);
  if (!t) return null;
  const dx = t.x - f.x, adx = Math.abs(dx), dy = t.y - f.y;
  const toward = dx > 0 ? BR : BL, away = dx > 0 ? BL : BR;
  const st = g.stage, overGround = surfaceBelow(st, f.x, f.y) !== null;
  const reach = f.W * 1.2 + 34;
  const shieldOk = f.shieldHP > f.ph.shieldMax * 0.3;

  // 1) just escaped hitstun in the air with an enemy close by: break the combo
  if (wasStun > 0 && !f.ground && adx < 200 && Math.random() < DEF) {
    if (!f.airDodged && Math.random() < 0.6) return { b: away | (dy > 0 ? BU : 0), pr: BH };
    if (f.jumps > 0) return { b: away, pr: BJ };
  }

  // 2) keep holding a guard we already decided on, then punish out of it
  if (A.guard > 0) {
    A.guard--;
    if (f.shielding && t.act && adx < reach + 40) {
      const m = t.act.m, S = m.startup || 1, Act = m.active || m.dur || 6;
      if (t.act.t >= S + Act && Math.random() < DEF) { A.guard = 0; A.cd = 2; const r = aiStrike(f, t, P, toward); r.b &= ~BH; return r; }
    }
    if (A.guard > 0 && f.ground && shieldOk) return { b: BH, pr: 0 };
    A.guard = 0;
  }

  // 3) danger incoming? (seen after a reaction delay, answered with a skill roll)
  const th = aiThreat(f, g);
  if (th) {
    if (A.thKey !== th.key) { A.thKey = th.key; A.thSeen = 0; A.thWill = Math.random() < DEF; }
    A.thSeen++;
    if (A.thWill && A.thSeen >= RX * 0.5 && th.tt <= 12 + LV) {
      const down = fSpecials(f).down, src = th.att || th.proj.owner;
      const sdir = src && src.x > f.x ? BR : BL, sAway = sdir === BR ? BL : BR;
      // counters and reflectors are the best answer when timed right
      if ((down.kind === 'counter' || (down.kind === 'reflect' && th.proj)) && th.tt >= (down.startup || 3) - 1 && th.tt <= (down.startup || 3) + 6 && Math.random() < 0.6) {
        A.thWill = false; A.cd = 6; return { b: BD, pr: BS };
      }
      if (f.ground) {
        const r = Math.random();
        if (th.proj) {
          if (th.low && r < 0.3 && th.tt > 4) { A.thWill = false; A.cd = 4; return { b: sdir, pr: BJ }; }           // hop over it toward the shooter
          if (shieldOk && r < 0.85) { A.guard = Math.round(th.tt + 8); A.thWill = false; return { b: BH, pr: 0 }; }
          A.thWill = false; A.cd = 4; return { b: sdir, pr: BJ };
        }
        if (shieldOk && r < 0.6) { A.guard = Math.round(th.tt + (th.att.act.m.active || 6) + 6); A.thWill = false; return { b: BH, pr: 0 }; }
        A.thWill = false; A.cd = 6;
        if (r < 0.82) return { b: BH, pr: r < 0.72 ? sAway : sdir };                                     // roll away (or behind them)
        return { b: sAway, pr: BJ };
      }
      const home = overGround ? sAway : (f.x < st.cx ? BR : BL);
      if (th.tt <= 6 && !f.airDodged) { A.thWill = false; A.cd = 4; return { b: home, pr: BH }; }
      if (f.jumps > 0 && th.low && th.tt <= 12) { A.thWill = false; A.cd = 4; return { b: home, pr: BJ }; }
      if (!th.low && overGround && f.vy > -2) return { b: home | BD, pr: BD };                         // fast-fall under a high shot
      return { b: home, pr: 0 };
    }
  } else A.thKey = null;

  // 4) don't swing into a counter / mirror stance
  if (t.act && (t.act.m.kind === 'counter' || t.act.m.kind === 'reflect') && adx < 260 && Math.random() < DEF) {
    A.cd = 4; A.held = 0; return { b: adx < 140 && f.ground ? away : 0, pr: 0 };
  }

  // 5) punish a whiffed move (they're stuck in end lag)
  if (t.act && f.ground && !t.act.m.window) {
    const m = t.act.m, S = m.startup || 1, Act = m.active || m.dur || 6, E = m.end || 10;
    const left = S + Act + E - t.act.t;
    if (t.act.t >= S + Act && left > 4) {
      if (A.punKey !== t.act) { A.punKey = t.act; A.punWill = Math.random() < DEF * 0.9; }
      if (A.punWill) {
        if (adx < reach + 6) { A.cd = 3; return aiStrike(f, t, P, toward); }
        if (adx < reach + f.ph.run * left * 0.8 && Math.abs(dy) < 60) { A.held = toward; A.cd = 1; return { b: toward, pr: 0 }; }
      }
    }
  }

  // 6) follow up while they're in hitstun (combos)
  if (t.hitstun > 2 && !t.out && adx < 260 && Math.abs(dy) < 260) {
    if (A.comboKey !== t.lastHitT || A.comboVictim !== t) { A.comboVictim = t; A.comboKey = t.lastHitT; A.comboWill = Math.random() < DEF; }
    if (A.comboWill && t.lastHit === f.slot) {
      const px = t.x + t.vx * 6, py = t.y + t.vy * 6, pdx = px - f.x, pdy = py - f.y;
      const tw = pdx > 0 ? BR : BL;
      const stageOk = surfaceBelow(st, f.x + Math.sign(pdx) * 70, f.y) !== null || !f.ground;
      if (Math.abs(pdx) < reach + 10 && Math.abs(pdy) < f.H * 1.4) { A.cd = 4; return aiStrike(f, { x: px, y: py, dmg: t.dmg }, P, tw); }
      let ob = stageOk || !f.ground ? tw : 0, opr = 0;
      if (pdy < -f.H && Math.abs(pdx) < 160) { if (f.ground) opr |= BJ; else if (f.jumps > 0 && f.vy > -1) opr |= BJ; }
      A.held = ob; A.cd = 2; return { b: ob, pr: opr };
    }
  }

  // 7) being zoned: when a shooter is far away, approach in jumps instead of walking into shots
  if (LV >= 4 && t.act && t.act.m.kind === 'proj' && adx > 220 && f.ground && Math.random() < DEF * 0.6) {
    const ahead = surfaceBelow(st, f.x + Math.sign(dx) * 120, f.y) !== null;
    if (ahead) { A.held = toward; A.cd = 6; return { b: toward, pr: BJ }; }
  }

  // 8) spacing at higher levels: sometimes wait just outside their reach instead of running in
  if (LV >= 6 && f.ground && !t.act && t.ground && adx > reach + 10 && adx < reach + 90 && Math.random() < 0.25 * DEF) {
    A.cd = 3 + Math.floor(Math.random() * 6); A.held = Math.random() < 0.5 ? 0 : away;
    return { b: A.held, pr: 0 };
  }
  return null;
}
