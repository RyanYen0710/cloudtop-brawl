'use strict';
/* ===== CLOUDTOP BRAWL — ENGINE: fighters, moves, hits ===== */

function emit(g, type, x, y, a, b) {
  g.events.push([++g.evId, type, Math.round(x), Math.round(y), a == null ? 0 : a, b == null ? 0 : b]);
  if (g.events.length > 18) g.events.shift();
}

class Fighter {
  constructor(o) {
    Object.assign(this, o);
    this.c = CHAR[o.charId] || ROSTER[0];
    this.ph = physFor(this.c);
    this.W = this.ph.W; this.H = this.ph.H;
    if (this.boss && this.boss.size) { this.W *= this.boss.size; this.H *= this.boss.size; }
    this.dmg = 0; this.kos = 0; this.falls = 0; this.out = false; this.dead = 0; this.yenMode = 0;
    this.spawn(o.sx, o.sy, false);
  }
  spawn(x, y, respawn) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.face = x < 800 ? 1 : -1;
    this.ground = null; this.jumps = this.ph.jumps - 1; this.act = null; this.mv = null; this.hot = false;
    this.hitstun = 0; this.hitlag = 0; this.inv = respawn ? 150 : 0; this.halo = respawn ? 140 : 0;
    this.shieldHP = this.ph.shieldMax; this.shielding = false; this.shieldBreak = 0;
    this.flyT = 0; this.flySpd = 5; this.flyFx = 'cloud'; this.canFly = true; this.helpless = false;
    this.airDodge = 0; this.airDodged = false; this.frozen = 0; this.sideUsed = false; this.upUsed = false;
    this.buffT = 0; this.buffPow = 1; this.buffSpd = 1; this.pose = respawn ? 'halo' : 'idle'; this.pt = 0;
    this.anim = 0; this.land = 0; this.roll = 0; this.rollDir = 1; this.lastHit = -1; this.lastHitT = 0;
    this.dropT = 0; this.ff = false; this.armor = false; this.charge = 0;
    this.ledge = null; this.ledgeCD = 0; this.ledgeGrabs = 0; this.burn = 0;
    this.zap = 0; this.slow = 0; this.hist = [];
  }
}

function hbox(f, h) {
  const W = f.W, H = f.H;
  const cx = f.x + f.face * (h.hx || 0) * W, cy = f.y - (h.hy == null ? 0.5 : h.hy) * H;
  const w = (h.hw || 1) * W, hh = (h.hh || 0.5) * H;
  return { x: cx - w / 2, y: cy - hh / 2, w, h: hh };
}
function hurtbox(o) { return { x: o.x - o.W * 0.42, y: o.y - o.H, w: o.W * 0.84, h: o.H }; }
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function circRect(cx, cy, r, b) {
  const nx = clamp(cx, b.x, b.x + b.w), ny = clamp(cy, b.y, b.y + b.h);
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}

function stepFighter(f, inp, g) {
  f.anim++;
  f.hot = false;
  if (f.out) return;
  if (f.dead > 0) {
    if (--f.dead === 0) {
      if (f.stocks > 0) respawnF(f, g);
      else { f.out = true; g.elim.push(f); }
    }
    return;
  }
  if (f.hitlag > 0) { f.hitlag--; f.hot = !!f.act; return; }
  /* slowed by a time field: only every other frame happens */
  if (f.slow > 0) { f.slow--; if (f.slow % 2 === 1) { f.hot = !!f.act; return; } }
  /* remember where we were (for Rewind) */
  f.hist.push([f.x, f.y, f.dmg]); if (f.hist.length > 70) f.hist.shift();
  if (f.burn > 0) { f.burn--; if (f.burn % 30 === 15 && f.halo <= 0) f.dmg = Math.min(999, f.dmg + 1.2 * f.ph.dt); }
  const ph = f.ph;
  if (f.inv > 0) f.inv--;
  if (f.lastHitT > 0 && --f.lastHitT === 0) f.lastHit = -1;
  if (f.buffT > 0) f.buffT--;
  if (f.dropT > 0) f.dropT--;
  if (!f.shielding && f.shieldHP < ph.shieldMax) f.shieldHP = Math.min(ph.shieldMax, f.shieldHP + 0.3);
  f.charge = 0;

  if (f.halo > 0) {
    f.halo--; f.vx = 0; f.vy = 0; f.pose = 'halo';
    if (f.halo > 0 && !(inp.l || inp.r || inp.dp || inp.jp || inp.ap || inp.spp || inp.smp)) return;
    f.halo = 0; f.jumps = ph.jumps - 1;
  }

  if (f.ledgeCD > 0) f.ledgeCD--;
  if (f.ledge) { stepLedge(f, inp, g); return; }
  if (f.ground && f.ground.off) f.ground = null;
  if (f.ground && (f.ground.dx || f.ground.dy)) { f.x += f.ground.dx; f.y += f.ground.dy; }
  const wasGround = !!f.ground;
  let grav = ph.grav * (g.gravMul || 1), fallCap = ph.maxFall * (g.gravMul < 1 ? 0.75 : 1), controlled = true;
  if (f.frozen > 0) {
    f.frozen--; f.vx *= 0.92; controlled = false; f.pose = 'frozen';
    if (f.frozen === 0) emit(g, 'shatter', f.x, f.y - f.H / 2);
  } else if (f.zap > 0) {
    f.zap--; f.vx *= 0.86; controlled = false; f.pose = 'hurt'; f.pt = 1;
    if (f.zap % 9 === 0) emit(g, 'shock', f.x, f.y - f.H / 2);
  } else if (f.shieldBreak > 0) {
    f.shieldBreak--; f.vx *= 0.8; controlled = false; f.pose = 'dizzy';
    if (f.shieldBreak === 0) f.shieldHP = ph.shieldMax * 0.4;
  } else if (f.hitstun > 0) {
    f.hitstun--; f.vx *= 0.985; controlled = false; f.pose = 'hurt'; grav *= 0.95; fallCap *= 1.7;
  } else if (f.land > 0) {
    f.land--; f.vx *= 0.75; controlled = false; f.pose = 'land';
  } else if (f.roll > 0) {
    f.roll--; f.vx = f.rollDir * (f.roll > 8 ? 8 : 2); controlled = false; f.pose = 'roll';
  } else if (f.airDodge > 0) {
    f.airDodge--; f.vx *= 0.9; f.vy *= 0.85; grav = 0; controlled = false; f.pose = 'dodge';
  }
  if (controlled) control(f, inp, g);

  const flying = f.flyT > 0 && controlled;
  const noGrav = f.act && f.act.noGrav;
  if (!flying && !noGrav && grav > 0) {
    const cap = f.ff ? ph.maxFall * 1.5 : fallCap;
    if (f.vy < cap) f.vy = Math.min(cap, f.vy + grav);
  }
  const vyBefore = f.vy;
  moveCollide(f, g);
  if (f.ground && !wasGround) onLand(f, g, vyBefore);
  if (!f.ground) tryGrabLedge(f, g);

  const B = g.stage.blast;
  if (f.x < B.l || f.x > B.r || f.y > B.b || f.y < B.t) koF(f, g);
}

function moveCollide(f, g) {
  const st = g.stage;
  const px = f.x, py = f.y;
  f.x += f.vx; f.y += f.vy;
  f.ground = null;
  const fw = f.W * 0.3;
  for (const m of st.solids) {
    if (!(f.x + fw > m.x && f.x - fw < m.x + m.w)) continue;
    const tol = 0.01 + Math.max(0, -(m.dy || 0)) + 1;
    if (py <= m.y + tol && f.y >= m.y && f.vy >= (m.dy || 0) - 0.5) { f.y = m.y; f.vy = 0; f.ground = m; break; }
    if (f.y > m.y && f.y - f.H < m.y + m.h) {
      if (py - f.H >= m.y + m.h - 1 && f.vy < 0) { f.y = m.y + m.h + f.H; f.vy = 0; }
      else if (py > m.y + tol) {
        if (px < m.x + m.w / 2) f.x = m.x - fw; else f.x = m.x + m.w + fw;
        f.vx = 0;
      }
    }
  }
  if (!f.ground && f.dropT <= 0) {
    for (const p of st.plats) {
      if (p.off) continue;
      const tol = 0.01 + Math.max(0, -(p.dy || 0)) + 1;
      if (f.vy >= (p.dy || 0) - 0.5 && f.x > p.x - 4 && f.x < p.x + p.w + 4 && py <= p.y + tol && f.y >= p.y) {
        f.y = p.y; f.vy = 0; f.ground = p; break;
      }
    }
  }
}

function onLand(f, g, vy) {
  if (f.hitstun > 0) {
    if (vy > 7) { f.y -= 1; f.vy = -vy * 0.45; f.ground = null; emit(g, 'land', f.x, f.y, 2); return; }
    f.land = Math.min(10, Math.max(4, f.hitstun)); f.hitstun = 0; // landing never adds stun on top of a light hit
  }
  f.jumps = f.ph.jumps - 1; f.canFly = true; f.flyT = 0; f.helpless = false; f.ledgeGrabs = 0;
  f.airDodged = false; f.sideUsed = false; f.upUsed = false; f.ff = false;
  if (f.act) {
    const k = f.act.m.kind;
    if (f.act.air && (!k || k === 'melee')) { endAct(f); f.land = 6; }
  }
  if (vy > 4) emit(g, 'land', f.x, f.y, 1);
}

function control(f, inp, g) {
  const ph = f.ph, dirX = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
  const spd = f.buffT > 0 ? f.buffSpd : 1;
  if (f.flyT > 0) { f.flyT--; if (f.flyT % 7 === 0) emit(g, 'fly', f.x, f.y, 0, f.slot); }
  if (f.act) { runAct(f, inp, g, dirX); return; }

  if (f.ground) {
    f.ff = false;
    if (inp.sh) {
      f.shielding = true;
      if (inp.lp || inp.rp) { f.shielding = false; f.roll = 20; f.rollDir = inp.lp ? -1 : 1; f.inv = Math.max(f.inv, 14); return; }
      if (inp.jp) { f.shielding = false; doJump(f, g); return; }
      f.shieldHP -= 0.22; f.vx *= 0.6; f.pose = 'shield';
      if (f.shieldHP <= 0) breakShield(f, g);
      return;
    }
    f.shielding = false;
    if (inp.jp) { doJump(f, g); return; }
    if (inp.smp) { startNormal(f, inp, dirX, true); return; }
    if (inp.ap) { startNormal(f, inp, dirX, false); return; }
    if (inp.spp) { startSpecial(f, inp, dirX, g); return; }
    if (inp.dp && f.ground.soft) { f.dropT = 12; f.ground = null; f.y += 3; return; }
    f.vx += clamp(dirX * ph.run * spd - f.vx, -1.2, 1.2);
    if (dirX) f.face = dirX;
    f.pose = Math.abs(f.vx) > 0.6 ? 'run' : 'idle';
  } else {
    f.shielding = false;
    if (f.flyT > 0) {
      const s = f.flySpd * spd, dy = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
      f.vx += clamp(dirX * s - f.vx, -0.6, 0.6); f.vy += clamp(dy * s - f.vy, -0.6, 0.6);
      if (dirX) f.face = dirX;
      f.pose = 'fly';
    } else {
      if (dirX) f.vx += clamp(dirX * ph.air * spd - f.vx, -0.5, 0.5); else f.vx *= 0.97;
      f.pose = f.helpless ? 'helpless' : (f.vy < 0 ? 'jump' : 'fall');
    }
    if (f.helpless) return;
    if (inp.jp && f.jumps > 0 && !(f.flyT > 0)) {
      f.vy = -ph.jumpV * 0.92; f.jumps--; f.ff = false; emit(g, 'jump', f.x, f.y, 1); return;
    }
    if (inp.shp && !f.airDodged) {
      f.airDodge = 22; f.airDodged = true; f.inv = Math.max(f.inv, 18); f.flyT = 0;
      f.vx = dirX * 6; f.vy = ((inp.d ? 1 : 0) - (inp.u ? 1 : 0)) * 6; return;
    }
    if (inp.ap || inp.smp) { startAerial(f, inp, dirX); return; }
    if (inp.spp) { startSpecial(f, inp, dirX, g); return; }
    if (inp.dp && f.vy > -2 && !(f.flyT > 0)) f.ff = true;
  }
}

function doJump(f, g) {
  f.vy = -f.ph.jumpV; f.ground = null; f.y -= 1; f.pose = 'jump'; emit(g, 'jump', f.x, f.y, 0);
}
function breakShield(f, g) {
  f.shielding = false; f.shieldBreak = 150; f.vy = -9; f.ground = null; f.y -= 1;
  emit(g, 'sbreak', f.x, f.y - f.H * 0.6);
}

function startNormal(f, inp, dirX, smash) {
  let key;
  if (smash) key = inp.u ? 'usmash' : inp.d ? 'dsmash' : 'fsmash';
  else key = inp.u ? 'utilt' : inp.d ? 'dtilt' : dirX ? 'ftilt' : 'jab';
  if (dirX) f.face = dirX;
  beginAct(f, key, NORMALS[key], smash ? 'sm' : 'atk');
}
function startAerial(f, inp, dirX) {
  const key = inp.u ? 'uair' : inp.d ? 'dair' : !dirX ? 'nair' : dirX === f.face ? 'fair' : 'bair';
  beginAct(f, key, NORMALS[key], inp.smp ? 'sm' : 'atk');
}
function startSpecial(f, inp, dirX, g) {
  const w = inp.u ? 'up' : inp.d ? 'down' : dirX ? 'side' : 'neutral';
  const m = fSpecials(f)[w];
  if (!m) return;
  if (dirX && w === 'side') f.face = dirX;
  const air = !f.ground;
  if (air && w === 'side' && f.sideUsed) return;
  if (w === 'up' && f.upUsed) return;
  if (m.kind === 'fly' && (!f.canFly || f.flyT > 0)) return;
  if (m.kind === 'proj') {
    let n = 0; for (const p of g.projs) if (p.owner === f && p.key === w) n++;
    if (n >= (m.max || 1)) return;
  }
  if (air && w === 'side') f.sideUsed = true;
  if (w === 'up' && m.kind !== 'fly') f.upUsed = true;
  beginAct(f, 'sp_' + w, m, 'sp');
}
function beginAct(f, key, m, btn) {
  f.act = { key, m, t: 0, btn, charge: 0, hit: new Map(), air: !f.ground, sub: 0, noGrav: false, countered: 0 };
  f.mv = key; f.shielding = false;
}
function endAct(f) { f.act = null; f.armor = false; f.mv = null; }

function ptPose(f, a, S, A, E, pose) {
  f.pose = pose;
  f.pt = a.t < S ? (a.t / S) * 0.5 : a.t < S + A ? 1 : Math.max(0, 1 - (a.t - S - A) / E);
}

function runAct(f, inp, g, dirX) {
  const a = f.act, m = a.m, ph = f.ph, kind = m.kind || 'melee';
  const held = a.btn === 'atk' ? inp.atk : a.btn === 'sm' ? inp.sm : inp.sp;
  if (!f.ground) {
    if (f.flyT > 0) {
      const s = f.flySpd, dy = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
      f.vx += clamp(dirX * s - f.vx, -0.4, 0.4); f.vy += clamp(dy * s - f.vy, -0.4, 0.4);
    } else if (kind !== 'dash' && kind !== 'slam' && kind !== 'teleport') {
      f.vx += clamp(dirX * ph.air * 0.85 - f.vx, -0.3, 0.3);
    }
  } else if (kind !== 'dash') f.vx *= 0.8;

  const S = m.startup || 1, A = m.active || 1, E = m.end || 10;
  switch (kind) {
    case 'melee': {
      if (m.charge && a.t === S - 1 && held && a.charge < m.charge) {
        a.charge++; f.charge = a.charge / m.charge; f.pose = 'charge'; f.pt = 0.2; f.armor = !!m.armor;
        if (a.charge % 10 === 0) emit(g, 'charge', f.x + f.face * f.W * 0.4, f.y - f.H * 0.6);
        return;
      }
      a.t++;
      if (m.lunge && f.ground && a.t >= S - 2 && a.t < S + A) f.vx = f.face * m.lunge * (1 + a.charge / 60);
      f.armor = !!m.armor && a.t < S + A;
      if (a.t >= S && a.t < S + A) {
        f.hot = true;
        const frac = m.charge ? a.charge / m.charge : 0;
        if (a.t === S && m.fx === 'palm') emit(g, 'palm', f.x + f.face * f.W, f.y - f.H * 0.6, f.face);
        hitCheck(f, g, m, a, 1 + 0.8 * frac);
      }
      ptPose(f, a, S, A, E, m.pose || 'punch');
      if (a.t >= S + A + E) endAct(f);
      break;
    }
    case 'dash': {
      a.t++;
      f.armor = !!m.armor && a.t < S + m.dur;
      if (a.t < S) { f.vx *= 0.5; f.vy *= 0.6; a.noGrav = !f.ground; f.pose = 'charge'; f.pt = 0.3; }
      else if (a.t < S + m.dur) {
        a.noGrav = false; f.vx = f.face * m.vx; if (!f.ground) f.vy = Math.min(f.vy, 1);
        f.hot = true; f.pose = 'dash'; f.pt = 1;
        if (m.finalB && a.t === S + m.dur - 1) { a.hit.clear(); hitCheck(f, g, Object.assign({}, m, { b: m.finalB, g: m.g * 2.5, rehit: 0 }), a, 1); }
        else hitCheck(f, g, m, a, 1);
        if (m.fx && a.t % 5 === 0) emit(g, 'trail', f.x - f.face * f.W * 0.3, f.y - f.H * 0.5, f.face, MOVEFX.indexOf(m.fx));
        if (a.t % 4 === 0) emit(g, 'dust', f.x - f.face * f.W * 0.4, f.y);
      } else {
        f.vx *= 0.85; f.pose = 'dash'; f.pt = Math.max(0, 1 - (a.t - S - m.dur) / E);
        if (a.t >= S + m.dur + E) endAct(f);
      }
      break;
    }
    case 'leap': {
      a.t++;
      if (a.t < S) { f.pose = 'charge'; f.pt = 0.4; f.vx *= 0.6; }
      else if (a.t === S) {
        f.vy = -m.vy; f.vx = f.face * (m.vx || 0) + dirX * 1.5; f.ground = null; f.y -= 2; emit(g, 'jump', f.x, f.y, 2);
        if (m.fx === 'speaker' || m.fx === 'spring') { emit(g, m.fx, f.x, f.y + 2); g.shake = Math.max(g.shake, 5); }
      }
      if (a.t >= S && a.t < S + A) {
        f.hot = true;
        const fin = m.finalB && a.t === S + A - 1;
        if (fin) a.hit.clear();
        hitCheck(f, g, fin ? Object.assign({}, m, { b: m.finalB, g: m.g * 2.5, rehit: 0 }) : m, a, 1);
        f.pose = m.pose || 'up'; f.pt = 1;
      }
      if (a.t >= S + A) { endAct(f); if (!f.ground && !m.noHelpless) f.helpless = true; }
      break;
    }
    case 'fly': {
      a.t++; f.pose = 'fly'; f.pt = 1;
      if (a.t >= S) {
        f.flyT = m.dur; f.flySpd = m.speed; f.flyFx = m.fx || 'cloud'; f.canFly = false;
        if (f.ground) { f.ground = null; f.y -= 2; }
        f.vy = -3; emit(g, 'fly', f.x, f.y, 1, f.slot); endAct(f);
      }
      break;
    }
    case 'slam': {
      a.t++;
      f.armor = !!m.armor && a.sub < 2;              // armored slams can't be knocked out of the wind-up or the fall
      if (a.sub === 0) {
        f.pose = 'slam'; f.pt = Math.min(1, a.t / S); a.noGrav = !f.ground;
        if (!f.ground) { f.vx *= 0.8; f.vy = -0.5; }
        if (a.t >= S) {
          if (f.ground) startWave(f, g, a);
          else { a.sub = 1; a.noGrav = false; a.t = 0; }
        }
      } else if (a.sub === 1) {
        f.vy = m.fall; f.vx *= 0.9; f.hot = true; f.pose = 'stomp'; f.pt = 1;
        if (m.spike) hitCheck(f, g, Object.assign({ hx: 0, hy: 0.1, hw: 1.2, hh: 0.6 }, m.spike), a, 1);
        if (f.ground) startWave(f, g, a);
        else if (a.t > 90) endAct(f);
      } else {
        f.pose = 'slam'; f.pt = Math.max(0, 1 - a.t / E); f.vx *= 0.7;
        if (a.t <= 5) { f.hot = true; hitCheck(f, g, Object.assign({}, m, { sides: true, hx: 0, hy: 0.2 }), a, 1); }
        if (a.t >= E) endAct(f);
      }
      break;
    }
    case 'counter': {
      a.t++; f.pose = 'counter'; f.pt = a.countered ? 1 : 0.6;
      if (a.countered) { if (a.t >= a.countered + 16) endAct(f); }
      else if (a.t >= S + m.window + E) endAct(f);
      break;
    }
    case 'reflect': {
      a.t++; f.pose = 'guard'; f.pt = 1;
      if (a.t >= S && a.t < S + m.window) { f.hot = true; reflectProjs(f, g, m); }
      if (a.t >= S + m.window + E) endAct(f);
      break;
    }
    case 'teleport': {
      a.t++;
      if (a.t < S) { f.pose = 'vanish'; f.pt = a.t / S; f.vx *= 0.5; f.vy *= 0.5; a.noGrav = true; }
      else if (a.t === S) {
        let tx = f.x + f.face * (m.dist || 160), ty = f.y;
        if (m.rewind) {
          const h = f.hist[Math.max(0, f.hist.length - m.rewind)] || [f.x, f.y, f.dmg];
          tx = h[0]; ty = h[1];
          f.dmg = Math.max(h[2], f.dmg - (m.heal || 0), 0);
          emit(g, 'rewind', f.x, f.y - f.H / 2, Math.round(tx), Math.round(ty - f.H / 2));
        }
        if (m.behind) {
          const t = nearestEnemy(f, g, 650);
          if (t) { tx = t.x - t.face * (t.W / 2 + f.W / 2 + 6); ty = t.y; f.face = t.x > tx ? 1 : -1; }
        }
        const ox = f.x, oy = f.y;
        if (m.pathHit) emit(g, 'zapline', ox, oy - f.H / 2, Math.round(tx), f.slot); else if (!m.rewind) emit(g, 'tele', f.x, f.y - f.H / 2);
        f.x = tx; f.y = ty; f.vx = 0; f.vy = Math.min(f.vy, 0);
        if (m.pathHit) {
          const lo = Math.min(ox, tx) - f.W * 0.5, hi = Math.max(ox, tx) + f.W * 0.5;
          if (g.orb && !f.ult && g.orb.x > lo && g.orb.x < hi && Math.abs(g.orb.y - (oy - f.H / 2)) < f.H) hitOrb(f, g, m.pathHit.dmg, f.face, 0);
          for (const o of g.fighters) {
            if (o === f || o.out || o.dead > 0 || o.halo > 0 || o.vanish || o.tid === f.tid) continue;
            if (o.x > lo && o.x < hi && Math.abs((o.y - o.H / 2) - (oy - f.H / 2)) < (o.H + f.H) * 0.5) applyHit(f, o, m.pathHit, f.face, g, false);
          }
        }
        for (const mb of g.stage.solids) if (f.x > mb.x && f.x < mb.x + mb.w && f.y > mb.y + 2 && f.y < mb.y + mb.h + f.H) f.y = mb.y;
        f.ground = null; f.inv = Math.max(f.inv, m.inv || 10); a.noGrav = false;
        if (m.rewind) { f.vy = 0; f.helpless = false; } else emit(g, 'tele', f.x, f.y - f.H / 2);
      }
      if (a.t > S) {
        if (m.dmg) {
          const s2 = S + 3, act = m.active || 4;
          if (a.t >= s2 && a.t < s2 + act) { f.hot = true; hitCheck(f, g, m, a, 1); }
          f.pose = 'punch'; f.pt = a.t < s2 ? 0.5 : a.t < s2 + act ? 1 : Math.max(0, 1 - (a.t - s2 - act) / E);
          if (a.t >= s2 + act + E) endAct(f);
        } else { f.pose = 'idle'; f.pt = 0; if (a.t >= S + E) endAct(f); }
      }
      break;
    }
    case 'aura': {
      a.t++; f.pose = 'cast2'; f.pt = 1;
      if (!f.ground) f.vy = Math.min(f.vy, 1.2);
      if (a.t >= S && a.t < S + m.dur) {
        f.hot = true;
        const fin = m.final && a.t === S + m.dur - 1;
        if (fin) { a.hit.clear(); hitCheck(f, g, Object.assign({}, m, m.final, { rehit: 0, drain: 0 }), a, 1); }
        else hitCheck(f, g, m, a, 1);
        if (m.pull) pullEnemies(f, g, f.x, f.y - f.H / 2, f.W * (m.hw || 2) * (m.pull < 0 ? 0.9 : 0.75), m.pull);
        if (m.reflect) reflectAround(f, g, f.W * (m.hw || 2) * 0.6);
        if (a.t % (m.fx ? 6 : 5) === 0) emit(g, m.fx || (m.pull ? 'voidpuff' : 'snow'), f.x, f.y - f.H / 2, Math.round(f.W * (m.hw || 2)));
      }
      if (a.t >= S + m.dur + E) endAct(f);
      break;
    }
    case 'proj': {
      if (m.charge && a.t === S - 1 && held && a.charge < m.charge) {
        a.charge++; f.charge = a.charge / m.charge; f.pose = 'charge'; f.pt = 0.3;
        if (a.charge % 10 === 0) emit(g, 'charge', f.x + f.face * f.W * 0.5, f.y - f.H * 0.6);
        return;
      }
      a.t++;
      if (a.t === S) { spawnProj(f, g, m, a.key.slice(3), m.charge ? a.charge / m.charge : 0); a.shots = 1; a.last = S; }
      if (m.auto && a.t > S && a.t - a.last >= m.auto.every && a.shots < m.auto.max) {
        const keep = f.ctrl && f.ctrl.type === 'cpu' ? a.shots < 4 : held;
        if (keep) { spawnProj(f, g, m, a.key.slice(3), 0); a.shots++; a.last = a.t; }
      }
      if (m.auto) { f.pose = 'cast'; f.pt = a.t - a.last < 3 ? 1 : 0.7; if (a.t >= a.last + E) endAct(f); break; }
      ptPose(f, a, S, 4, E, 'cast');
      if (a.t >= S + E) endAct(f);
      break;
    }
    case 'buff': {
      a.t++; f.pose = 'power'; f.pt = 1;
      if (a.t === S) { f.buffT = m.dur || 300; f.buffPow = m.power || 1.3; f.buffSpd = m.speed || 1.15; emit(g, 'buff', f.x, f.y - f.H / 2); }
      if (a.t >= S + E) endAct(f);
      break;
    }
    default: endAct(f);
  }
}

function startWave(f, g, a) {
  a.sub = 2; a.t = 0; a.hit = new Map();
  emit(g, 'wave', f.x, f.y, Math.round(f.W * (a.m.hw || 3)));
  if (a.m.fx === 'thunder') emit(g, 'tzap', f.x, f.y);
  g.shake = Math.max(g.shake, 12);
}

function hitCheck(f, g, h, a, cm) {
  const bx = hbox(f, h);
  if (g.orb) orbHitCheck(f, g, bx, h, a, cm);
  for (const o of g.fighters) {
    if (o === f || o.out || o.dead > 0 || o.halo > 0 || o.vanish || o.tid === f.tid) continue;
    if (!overlap(bx, hurtbox(o))) continue;
    const last = a.hit.get(o);
    if (last !== undefined && (!h.rehit || a.t - last < h.rehit)) continue;
    a.hit.set(o, a.t);
    const dir = h.sides ? (Math.sign(o.x - f.x) || f.face) : f.face;
    const r = applyHit(f, o, { dmg: h.dmg * cm, b: h.b * (1 + (cm - 1) * 0.45), g: h.g, angle: h.angle, freeze: h.freeze, burn: h.burn, zap: h.zap, slow: h.slow }, dir, g, false);
    if (h.drain && (r === 'hit' || r === 'armor')) f.dmg = Math.max(0, f.dmg - h.drain);
  }
}

/* bounce enemy projectiles back from all around (Mind Spirit) */
function reflectAround(f, g, r) {
  for (const p of g.projs) {
    if (p.tid === f.tid || p.m.mine || p.m.ground || p.m.fuse) continue;
    const dx = p.x - f.x, dy = p.y - (f.y - f.H / 2);
    if (dx * dx + dy * dy > r * r) continue;
    const d = Math.hypot(dx, dy) || 1, v = Math.max(Math.hypot(p.vx, p.vy), 6) * 1.2;
    p.vx = dx / d * v; p.vy = dy / d * v * 0.6;
    p.owner = f; p.tid = f.tid; p.dmg *= 1.2; p.hit = new Set(); p.life = Math.max(p.life, 40);
    emit(g, 'reflect', p.x, p.y);
  }
}

/* drag enemies toward a point (black holes, soul drain) */
function pullEnemies(f, g, x, y, radius, strength) {
  for (const o of g.fighters) {
    if (o === f || o.out || o.dead > 0 || o.halo > 0 || o.vanish || o.ledge || o.tid === (f ? f.tid : -1)) continue;
    const dx = x - o.x, dy = y - (o.y - o.H / 2), d = Math.hypot(dx, dy);
    if (d > radius || d < 8) continue;
    const k = strength * (1 - d / radius * 0.5);
    o.vx += dx / d * k; if (!o.ground) o.vy += dy / d * k * 0.6;
    else if (strength < 0 && o.hitstun <= 0) o.vx += dx / d * k * 0.6;
    o.vx = clamp(o.vx, -9, 9);
  }
}

function applyHit(att, tgt, h, dir, g, proj) {
  if (tgt.inv > 0 || tgt.dead > 0 || tgt.out || tgt.vanish) return 'miss';
  const ta = tgt.act;
  if (ta && ta.m.kind === 'counter' && !ta.countered && ta.t >= ta.m.startup && ta.t < ta.m.startup + ta.m.window) {
    const m = ta.m;
    ta.countered = ta.t; tgt.inv = 24;
    emit(g, 'counter', tgt.x, tgt.y - tgt.H * 0.6);
    g.shake = Math.max(g.shake, 10);
    if (!proj && Math.abs(att.x - tgt.x) < 260 && att.tid !== tgt.tid) {
      tgt.face = Math.sign(att.x - tgt.x) || tgt.face;
      applyHit(tgt, att, { dmg: Math.max(m.min || 8, h.dmg * (m.mult || 1.5)), b: m.b, g: m.g, angle: m.angle }, tgt.face, g, false);
    }
    return 'counter';
  }
  if (tgt.shielding && tgt.ground) {
    tgt.shieldHP -= h.dmg * 1.3;
    tgt.vx += dir * Math.min(6, 1 + h.dmg * 0.3);
    if (!proj) att.hitlag = 4;
    tgt.hitlag = 4;
    emit(g, 'block', tgt.x, tgt.y - tgt.H * 0.5, att.slot);
    if (tgt.shieldHP <= 0) breakShield(tgt, g);
    return 'block';
  }
  const aB = !att.boss && att.c && att.c.bonus, tB = !tgt.boss && tgt.c && tgt.c.bonus;
  const pow = att.ph.pm * (att.buffT > 0 ? att.buffPow : 1) * (att.boss ? att.boss.pow : 1) * (aB ? aB.pow : 1);
  const dmg = h.dmg * pow * tgt.ph.dt * (tgt.boss ? tgt.boss.dmgIn : 1) * (tB ? tB.dmgIn : 1);
  tgt.dmg = Math.min(999, tgt.dmg + dmg);
  const kb = (h.b + tgt.dmg * h.g / 10) * tgt.ph.wf * (0.85 + 0.15 * Math.min(pow, 1.6)) * (tgt.boss ? tgt.boss.kb : 1) * (tB ? tB.kb : 1);
  const hl = Math.min(14, Math.round(3 + dmg * 0.45));
  if (!proj) att.hitlag = hl;
  tgt.hitlag = hl;
  tgt.lastHit = att.slot; tgt.lastHitT = 360;
  if (tgt.armor && kb < 16) {
    emit(g, 'hit', tgt.x, tgt.y - tgt.H * 0.55, Math.round(kb * 0.5), att.slot);
    return 'armor';
  }
  const ang = h.angle * D2R;
  tgt.vx = Math.cos(ang) * kb * dir;
  tgt.vy = -Math.sin(ang) * kb;
  if (tgt.ground && tgt.vy > 0) tgt.vy = -tgt.vy * 0.5;
  if (tgt.vy < 0) { tgt.ground = null; tgt.y -= 1; }
  tgt.hitstun = kb < 5 ? Math.round(kb * 3) + 4 : Math.round(kb * 2.8);
  endAct(tgt);
  tgt.shielding = false; tgt.flyT = 0; tgt.helpless = false; tgt.upUsed = false; tgt.sideUsed = false;
  tgt.ff = false; tgt.roll = 0; tgt.land = 0; tgt.airDodge = 0; tgt.halo = 0;
  if (tgt.ledge) { tgt.ledge = null; tgt.ledgeCD = 40; }
  if (h.burn) { tgt.burn = Math.max(tgt.burn || 0, h.burn); emit(g, 'ignite', tgt.x, tgt.y - tgt.H / 2); }
  if (h.slow) { if (!(tgt.slow > 0)) emit(g, 'slowed', tgt.x, tgt.y - tgt.H / 2); tgt.slow = Math.max(tgt.slow || 0, h.slow | 1); }
  if (h.zap) {
    tgt.zap = Math.round(h.zap + tgt.dmg * 0.08); tgt.hitstun = 0; tgt.dazzle = !!h.flash;
    tgt.vx *= 0.35; tgt.vy = Math.min(tgt.vy * 0.35, 0);
    emit(g, h.flash ? 'dazzle' : 'shock', tgt.x, tgt.y - tgt.H / 2, 1);
  } else { tgt.zap = 0; tgt.dazzle = false; }
  if (h.freeze) {
    tgt.frozen = Math.round(h.freeze + tgt.dmg * 0.15); tgt.hitstun = 0;
    tgt.vx *= 0.3; tgt.vy = Math.min(tgt.vy * 0.3, 0);
    emit(g, 'freeze', tgt.x, tgt.y - tgt.H / 2);
  }
  // shots chained back-to-back stun less and less, so nobody can be shot-locked forever
  if (proj && proj !== true) {
    if (tgt.pLast !== proj) { tgt.pChain = g.frame - (tgt.pHitF || -999) < 45 ? (tgt.pChain || 0) + 1 : 0; tgt.pLast = proj; }
    tgt.pHitF = g.frame;
    if (tgt.pChain > 0) {
      const k = Math.max(0.3, 1 - 0.25 * tgt.pChain);
      tgt.hitstun = Math.max(2, Math.round(tgt.hitstun * k));
      if (tgt.frozen > 0) tgt.frozen = Math.max(4, Math.round(tgt.frozen * k));
      if (tgt.zap > 0) tgt.zap = Math.max(4, Math.round(tgt.zap * k));
    }
  }
  g.shake = Math.max(g.shake, Math.min(18, kb * 0.6));
  emit(g, 'hit', tgt.x, tgt.y - tgt.H * 0.55, Math.round(kb), att.slot);
  return 'hit';
}

function nearestEnemy(f, g, maxD) {
  let best = null, bd = maxD || 1e9;
  for (const o of g.fighters) {
    if (o === f || o.out || o.dead > 0 || o.vanish || o.tid === f.tid) continue;
    const d = Math.hypot(o.x - f.x, o.y - f.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

function respawnF(f, g) {
  const st = g.stage;
  f.spawn(st.cx + (f.slot - 1.5) * 70, st.spawnY, true);
  f.dmg = 0;
}

function koF(f, g) {
  const B = g.stage.blast, st = g.stage;
  const x = clamp(f.x, B.l + 10, B.r - 10), y = clamp(f.y - f.H / 2, B.t + 10, B.b - 10);
  const ang = Math.atan2(st.spawnY + 100 - y, st.cx - x);
  emit(g, 'ko', x, y, Math.round(ang * 100), f.slot);
  if (!g.cfg.endless) f.stocks--;
  f.falls++;
  if (f.lastHit >= 0) { const k = g.fighters.find(o => o.slot === f.lastHit); if (k && k !== f) k.kos++; }
  f.dead = 75; endAct(f); f.hitstun = 0; f.vx = 0; f.vy = 0; f.frozen = 0; f.flyT = 0; f.zap = 0; f.slow = 0; f.burn = 0;
  g.shake = 20;
}

/* ===== ledge hanging (like Smash): grab the corners of big bases when you're close ===== */
function tryGrabLedge(f, g) {
  if (f.ledgeCD > 0 || f.hitstun > 0 || f.frozen > 0 || f.zap > 0 || f.shieldBreak > 0 || f.airDodge > 0 || f.dead > 0 || f.halo > 0) return;
  if (f.vy < -4 || f.ledgeGrabs >= 4) return;
  if (f.act && f.act.m.kind === 'slam') return;
  const st = g.stage, hand = f.y - f.H * 0.85;
  for (let si = 0; si < st.solids.length; si++) {
    const m = st.solids[si];
    if (Math.abs(hand - m.y) > 42 || f.y <= m.y + 4) continue;
    let side = 0;
    if (f.x > m.x - f.W * 1.0 && f.x < m.x + 4) side = -1;
    else if (f.x < m.x + m.w + f.W * 1.0 && f.x > m.x + m.w - 4) side = 1;
    if (!side) continue;
    const edgeX = side < 0 ? m.x : m.x + m.w;
    if (st.solids.some(o => o !== m && Math.abs(o.y - m.y) < 30 && edgeX + side * 20 > o.x && edgeX + side * 20 < o.x + o.w)) continue;
    if (g.fighters.some(o => o !== f && o.ledge && o.ledge.si === si && o.ledge.side === side && !o.dead)) continue;
    f.ledge = { si, side, t: 0, climb: 0, mode: null };
    f.ledgeGrabs++;
    f.x = side < 0 ? m.x - f.W * 0.32 : m.x + m.w + f.W * 0.32;
    f.y = m.y + f.H * 0.78;
    f.face = -side; f.vx = 0; f.vy = 0;
    endAct(f);
    f.flyT = 0; f.helpless = false; f.upUsed = false; f.sideUsed = false; f.canFly = true; f.airDodged = false; f.ff = false;
    f.jumps = f.ph.jumps - 1;
    if (f.ledgeGrabs <= 2) f.inv = Math.max(f.inv, 50);
    f.pose = 'ledge'; f.pt = 0;
    emit(g, 'ledge', f.x, m.y);
    return;
  }
}

function stepLedge(f, inp, g) {
  const L = f.ledge, m = g.stage.solids[L.si], inward = -L.side;
  const edgeX = L.side < 0 ? m.x : m.x + m.w;
  L.t++;
  if (L.mode) {
    const total = L.mode === 'attack' ? 10 : 14;
    L.climb++;
    const k = Math.min(1, L.climb / total);
    const tx = edgeX + inward * f.W * 0.5;
    const sx = edgeX - inward * f.W * 0.32, sy = m.y + f.H * 0.78;
    f.x = sx + (tx - sx) * k;
    f.y = sy + (m.y - sy) * Math.min(1, k * 1.4);
    f.pose = 'climb'; f.pt = k; f.inv = Math.max(f.inv, 2);
    if (k >= 1) {
      f.ledge = null; f.ledgeCD = 20; f.x = tx; f.y = m.y; f.vy = 0; f.ground = m; f.face = inward;
      if (L.mode === 'attack') beginAct(f, 'ftilt', NORMALS.ftilt, 'atk');
      else if (L.mode === 'roll') { f.roll = 22; f.rollDir = inward; f.inv = Math.max(f.inv, 22); }
    }
    return;
  }
  f.x = edgeX - inward * f.W * 0.32; f.y = m.y + f.H * 0.78;
  f.vx = 0; f.vy = 0; f.pose = 'ledge'; f.pt = 0;
  if (L.t < 6) return;
  const toward = inward > 0 ? inp.rp : inp.lp;
  const away = inward > 0 ? inp.lp : inp.rp;
  if (inp.jp || inp.up) {
    f.ledge = null; f.ledgeCD = 30;
    f.vy = -f.ph.jumpV * 1.05; f.vx = inward * 2.2; f.x += inward * 6; f.pose = 'jump';
    emit(g, 'jump', f.x, f.y, 1);
    return;
  }
  if (toward || inp.ap || inp.smp || inp.shp) {
    L.mode = inp.shp ? 'roll' : (inp.ap || inp.smp) ? 'attack' : 'climb';
    L.climb = 0;
    return;
  }
  if (away || inp.dp || L.t > 300) {
    f.ledge = null; f.ledgeCD = 40; f.vy = 1; f.vx = -inward * 1.5;
  }
}
