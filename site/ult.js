'use strict';
/* ===== CLOUDTOP BRAWL — Ultimate Orb + ultimates =====
   Now and then a glowing orb drifts around the stage. It has 50 hit points:
   every hit takes at least 1, and big hits take more. Whoever breaks it holds
   their ultimate for 20 seconds. Press Z (or the ULT button) to unleash it. */

const ULT_CUT = 90, ULT_FX = 130;
/* aimed ultimates: after the splash the user vanishes and steers a crosshair (WASD / arrows).
   K fires (or it fires itself when time runs out). Only enemies inside the circle get hit. */
const ULT_AIM = 300, ULT_LOCK = 15, ULT_R = 110, ULT_SPD = 6.5;
/* the finisher itself is quick: small hits, then the big blow at FX_FINAL, done at FX_END.
   The art was drawn for ULT_FX frames, so it plays sped up by ULT_ART to match. */
const ULT_FX_FINAL = 60, ULT_FX_END = 72, ULT_ART = ULT_FX / ULT_FX_END;
/* final blow: launches hard but is never a sure KO — lighter targets at low damage usually survive */
const ULT_FIN_B = 4, ULT_FIN_G = 0.8;
const ultRnd = (a, b) => a + Math.random() * (b - a);
const ultPush = (o, g, dx, dy) => { const B = g.stage.blast; o.x = clamp(o.x + dx, B.l + 120, B.r - 120); o.y = clamp(o.y + dy, B.t + 120, B.b - 40); };
/* how each fighter's ultimate behaves once someone is caught.
   free: the target can still move and only gets hit while inside the circle (skill to escape part of it)
   chance: each small hit only lands this often
   hit(o,i,…): what a small hit does; tick(o,k,…): every frame; angle/dir: the final launch; after: extra status */
const ULT_STYLES = {
  basic: {},
  sharks: { chance: 0.8, hit: (o, i, u, g) => ultPush(o, g, (i % 2 ? -1 : 1) * 16, 0), angle: () => ultRnd(18, 34), dir: () => Math.random() < 0.5 ? -1 : 1, finMul: 0.96 },
  stomp: { hit: (o, i, u, g) => ultPush(o, g, 0, -22), tick: (o, k, u, g) => { if (k % 4 === 0) ultPush(o, g, 0, 6); }, angle: () => ultRnd(76, 86), finMul: 1.3 },
  dragon: { tick: (o, k, u, g) => { if (k > 8 && k < ULT_FX_FINAL - 4) ultPush(o, g, Math.sin(k * 0.2) * 4, -2.6); }, angle: () => ultRnd(42, 58), finMul: 1.15 },
  slash: { hit: (o, i, u, g) => ultPush(o, g, ultRnd(-12, 12), ultRnd(-8, 6)), angle: () => ultRnd(35, 55), dir: () => Math.random() < 0.5 ? -1 : 1, finMul: 0.99 },
  beams: { free: true, reach: 1.25, chance: 0.85, finMul: 1.52 },
  pillars: { hit: (o, i, u, g) => ultPush(o, g, 0, -10), angle: () => ultRnd(84, 90), finMul: 1.44 },
  shatter: { angle: () => ultRnd(20, 35), finMul: 0.59 },
  phoenix: { hit: (o, i, u, g) => ultPush(o, g, (i % 2 ? -1 : 1) * 10, -4), angle: () => ultRnd(45, 60), after: { burn: 240 }, finMul: 0.5 },
  storm: { free: true, reach: 1.35, chance: 0.65, finMul: 1.24 },
  vortex: { tick: (o, k, u, g) => { if (k < ULT_FX_FINAL) { o.x += (u.ax - o.x) * 0.08; o.y += ((u.ay + o.H / 2) - o.y) * 0.08; } }, angle: () => ultRnd(45, 70), dir: (o, u) => Math.sign(o.x - u.ax) || (Math.random() < 0.5 ? -1 : 1), finMul: 0.98 },
  arrows: { free: true, reach: 1.3, chance: 0.75, angle: () => ultRnd(25, 40), finMul: 0.51 },
  hammer: { angle: () => ultRnd(80, 88), finMul: 1.5 },
  tornado: { tick: (o, k, u, g) => { if (k > 6 && k < ULT_FX_FINAL - 2) ultPush(o, g, Math.cos(k * 0.35) * 7, -2); }, angle: () => ultRnd(35, 145), finMul: 1.32 },
  barrage: { hit: (o, i, u, g, f) => ultPush(o, g, (Math.sign(o.x - u.ax) || 1) * 5, 0), angle: () => ultRnd(20, 32), finMul: 0.34 },
  encore: { hit: (o, i, u, g) => ultPush(o, g, (i % 2 ? -1 : 1) * 14, -3), angle: () => ultRnd(52, 68), finMul: 0.68 },
  clock: { stored: true, angle: () => ultRnd(55, 72), finMul: 0.78 },
  elixir: { angle: () => ultRnd(60, 80), after: { slow: 300, burn: 300 }, finMul: 0.92 },
  photo: { angle: () => ultRnd(55, 70), finMul: 0.68 },
  court: { hit: (o, i, u, g) => ultPush(o, g, ultRnd(-8, 8), i % 2 ? -18 : 14), angle: () => ultRnd(70, 82), finMul: 1.23 },
  legend: { hit: (o, i, u, g) => ultPush(o, g, ultRnd(-10, 10), ultRnd(-10, 4)), angle: () => ultRnd(50, 70), finMul: 1.05 }
};
const ULT_PH = ['cut', 'aim', 'lock', 'fx'];
/* three kinds of ultimate (set per fighter in data.js as ultimate.kind):
   aim   - steer the red circle, then fire (the original kind)
   all   - no aiming: hits every opponent on the stage, but launches a bit softer
   close - the opponent has to be right in front of you when you press it; miss and it's wasted */
const ULT_KIND_MUL = { aim: 1, all: 0.85, close: 1.05 };
const ULT_CLOSE_W = 230, ULT_CLOSE_BACK = 30, ULT_CLOSE_UP = 90;
const ultKind = def => (def && ULT_KIND_MUL[def.kind] ? def.kind : 'aim');
const ultEnemies = (f, g) => g.fighters.filter(o => o !== f && !o.out && o.dead <= 0 && !o.vanish && o.carriedBy == null && o.tid !== f.tid);
/* is o inside f's close-range ultimate box (in front of f)? */
function ultInClose(f, o) {
  const rel = (o.x - f.x) * (f.face || 1);
  return rel > -ULT_CLOSE_BACK - o.W * 0.3 && rel < ULT_CLOSE_W + o.W * 0.3 && o.y > f.y - f.H - ULT_CLOSE_UP && o.y - o.H < f.y + 40;
}
const ORB_R = 28;
const DEFAULT_ULT = { name: 'Ultimate Burst', desc: 'A huge blast of power hits every enemy.', theme: 'plain', hits: 4, dmg: 4, final: { dmg: 18, b: 12, g: 1.35, angle: 60 } };
function ultDef(c) {
  const u = c.ultimate || DEFAULT_ULT;
  if (!u.colors) u.colors = ['#120d24', c.look.accent || '#ffb547', '#ffffff'];
  return u;
}

function spawnOrb(g) {
  const st = g.stage;
  g.orb = { x: st.cx, y: st.spawnY - 20, vx: 0, vy: 0, hp: 50, max: 50, age: 0, flash: 0, tx: st.cx, ty: st.spawnY };
  emit(g, 'orbspawn', g.orb.x, g.orb.y);
}

function stepOrb(g) {
  for (const f of g.fighters) {
    if (!f.ult) continue;
    f.ultT--;
    if (f.ultT <= 0 || f.dead > 0 || f.out) { f.ult = false; emit(g, 'ultlost', f.x, f.y - f.H / 2, 0, f.slot); g.orbNext = g.frame + 1800 + Math.floor(Math.random() * 1200); }
  }
  const o = g.orb;
  if (!o) {
    if (g.frame >= g.orbNext && !g.cfg.endless && !g.ult && !g.fighters.some(f => f.ult || f.avalanche) && !g.over) spawnOrb(g);
    return;
  }
  const st = g.stage, B = st.bounds;
  o.age++;
  if (o.age % 160 === 0 || Math.hypot(o.tx - o.x, o.ty - o.y) < 30) {
    o.tx = B.minx + 80 + Math.random() * (B.maxx - B.minx - 160);
    const topS = Math.min(...st.solids.map(s => s.y));
    o.ty = topS - 250 + Math.random() * 190;
  }
  o.vx += clamp((o.tx - o.x) * 0.002, -0.12, 0.12);
  o.vy += clamp((o.ty - o.y) * 0.002, -0.12, 0.12);
  o.vx *= 0.975; o.vy *= 0.975;
  const sp = Math.hypot(o.vx, o.vy), vmax = o.flash ? 6 : 3.2; if (sp > vmax) { o.vx *= vmax / sp; o.vy *= vmax / sp; }
  o.x += o.vx; o.y += o.vy + Math.sin(o.age * 0.06) * 0.5;
  o.x = clamp(o.x, st.blast.l + 200, st.blast.r - 200); o.y = clamp(o.y, st.blast.t + 120, st.bounds.maxy);
  if (o.flash > 0) o.flash--;
}

function hitOrb(f, g, dmg, dirx, diry) {
  const o = g.orb; if (!o || !f || f.out || f.avalanche || f.carriedBy != null) return;
  o.hp -= 1 + Math.floor(dmg / 6);
  o.vx += dirx * 2.5; o.vy += diry * 2 - 0.5; o.flash = 6;
  emit(g, 'orbhit', o.x, o.y, Math.max(0, o.hp), f.slot);
  if (o.hp <= 0) {
    g.orb = null; f.ult = true; f.ultT = 1200;
    emit(g, 'orbget', o.x, o.y, 0, f.slot);
    g.shake = Math.max(g.shake, 10);
  }
}
function orbHitCheck(f, g, bx, h, a, cm) {
  const o = g.orb; if (!o || f.ult) return;
  if (!circRect(o.x, o.y, ORB_R, bx)) return;
  const last = a.hit.get('orb');
  if (last !== undefined && (!h.rehit || a.t - last < h.rehit)) return;
  a.hit.set('orb', a.t);
  hitOrb(f, g, h.dmg * cm, f.face, -0.3);
}

/* Titan's playable ultimate uses the same rules on the browser and Worker. */
const AVALANCHE_FRAMES = 240, AVALANCHE_START = 18;
function avalancheRadius(f) { return Math.max(f.W * 0.58, f.H * 0.38); }
function avalancheInterrupted(f, g) { return g.over || f.dead > 0 || f.out || f.hitstun > 0 || f.frozen > 0 || f.zap > 0 || f.shieldBreak > 0; }
function startAvalanche(f, g) {
  f.ult = false; f.ultT = 0; endAct(f);
  f.shielding = false; f.flyT = 0; f.helpless = false; f.roll = 0; f.airDodge = 0; f.land = 0; f.ff = false;
  f.vx *= 0.35; f.vy = Math.min(f.vy, 0); f.hitlag = 0;
  f.avalanche = { left: AVALANCHE_FRAMES, age: 0, captured: null, spin: 0, bumped: new Map() };
  f.armor = true;
  emit(g, 'ult', f.x, f.y - f.H / 2, 0, f.slot);
}
function pinAvalancheTarget(f, o) {
  const r = avalancheRadius(f);
  o.x = f.x - f.face * r * 0.3; o.y = f.y - r * 1.45;
  o.vx = 0; o.vy = 0; o.ground = null; o.pose = 'hurt';
  o.hitlag = 0; o.hitstun = 0; o.inv = 2; o.armor = false;
}
function syncAvalancheCaptives(g) {
  for (const o of g.fighters) {
    if (o.carriedBy == null) continue;
    const f = g.fighters.find(f => f.slot === o.carriedBy);
    if (f?.avalanche?.captured === o.slot && !f.out && f.dead <= 0 && !o.out && o.dead <= 0) pinAvalancheTarget(f, o);
    else { o.carriedBy = null; o.inv = Math.max(o.inv, 24); o.hitlag = 0; o.hitstun = 0; }
  }
}
function finishAvalanche(f, g, throwTarget) {
  const a = f.avalanche; if (!a) return;
  const o = g.fighters.find(o => o.slot === a.captured && o.carriedBy === f.slot);
  f.avalanche = null; f.armor = false; f.hot = false; f.hitlag = 0; f.vx *= 0.25; f.land = Math.max(f.land, 28); f.pose = 'land';
  if (o) {
    o.carriedBy = null; o.inv = 0; o.hitlag = 0; o.hitstun = 0; o.frozen = 0; o.zap = 0;
    o.ground = null; o.ledge = null; o.ledgeCD = 20; o.shielding = false; o.armor = false;
    o.jumps = o.ph.jumps - 1; o.upUsed = false; o.sideUsed = false; o.airDodged = false; o.helpless = false; o.canFly = true;
    const B = g.stage.blast;
    o.x = clamp(f.x + f.face * (avalancheRadius(f) + o.W * 0.6 + 4), B.l + o.W, B.r - o.W);
    o.y = clamp(f.y - avalancheRadius(f) * 0.6, B.t + o.H + 4, B.b - o.H);
    if (throwTarget && !o.out && o.dead <= 0) {
      applyHit(f, o, { dmg: 5, b: 11, g: 0.8, angle: 38 }, f.face, g, true);
      o.inv = 18;
      emit(g, 'ultfinal', o.x, o.y - o.H / 2, 0, f.slot);
      g.shake = Math.max(g.shake, 12);
    } else {
      // A carrier falling through the blast zone cannot take a helpless captive with him.
      if (f.x < B.l || f.x > B.r || f.y < B.t || f.y > B.b) {
        const m = g.stage.solids[0]; o.x = clamp(f.x, m.x + o.W, m.x + m.w - o.W); o.y = m.y - 10;
      }
      o.vx = f.face * 4; o.vy = -10; o.hitstun = 0; o.inv = 30;
    }
  }
  emit(g, 'land', f.x, f.y, 2, f.slot);
  g.orbNext = g.frame + 2400 + Math.floor(Math.random() * 1800);
}
function stepAvalanche(f, inp, g) {
  const a = f.avalanche, r = avalancheRadius(f), dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
  f.pose = 'roll'; f.pt = a.age / AVALANCHE_FRAMES; f.armor = true; f.hot = a.age >= AVALANCHE_START;
  if (dir) f.face = dir;
  if (a.age < AVALANCHE_START) f.vx *= 0.75;
  else f.vx += clamp((dir || f.face) * 11.5 - f.vx, -0.75, 0.75);
  const wasGround = !!f.ground;
  if (f.ground?.dx || f.ground?.dy) { f.x += f.ground.dx || 0; f.y += f.ground.dy || 0; }
  f.vy = Math.min(f.ph.maxFall, f.vy + f.ph.grav * (g.gravMul || 1));
  moveCollide(f, g);
  if (f.ground && !wasGround) { f.jumps = f.ph.jumps - 1; emit(g, 'land', f.x, f.y, 1); }
  a.spin += f.vx / r;
  const B = g.stage.blast;
  if (f.x < B.l || f.x > B.r || f.y < B.t || f.y > B.b) { koF(f, g); return; }
  if (a.age < AVALANCHE_START) return;
  if (f.ground && a.age % 5 === 0) emit(g, 'land', f.x - f.face * r, f.y, 0);
  if (a.captured != null) {
    const o = g.fighters.find(o => o.slot === a.captured);
    if (!o || o.out || o.dead > 0 || o.carriedBy !== f.slot) finishAvalanche(f, g, false);
    else pinAvalancheTarget(f, o);
    return;
  }
  for (const o of g.fighters) {
    if (o === f || o.tid === f.tid || o.out || o.dead > 0 || o.halo > 0 || o.inv > 0 || o.vanish || o.carriedBy != null || o.avalanche) continue;
    if (!circRect(f.x, f.y - r, r, hurtbox(o))) continue;
    const counter = o.act?.m.kind === 'counter' && !o.act.countered && o.act.t >= o.act.m.startup && o.act.t < o.act.m.startup + o.act.m.window;
    if ((o.shielding && o.ground) || counter) {
      if (g.frame - (a.bumped.get(o.slot) ?? -100) >= 30) {
        a.bumped.set(o.slot, g.frame);
        applyHit(f, o, { dmg: 2, b: 3, g: 0.2, angle: 35 }, f.face, g, false);
        f.vx *= 0.35;
        if (avalancheInterrupted(f, g)) { finishAvalanche(f, g, false); return; }
      }
      continue;
    }
    a.captured = o.slot; o.carriedBy = f.slot;
    endAct(o); o.shielding = false; o.flyT = 0; o.roll = 0; o.airDodge = 0; o.land = 0; o.ledge = null; o.frozen = 0; o.zap = 0;
    o.lastHit = f.slot; o.lastHitT = 360;
    pinAvalancheTarget(f, o); emit(g, 'hit', o.x, o.y - o.H / 2, 4, f.slot);
    break;
  }
}
function aiAvalanche(f, g) {
  const a = f.avalanche, target = nearestEnemy(f, g), m = f.ground || g.stage.solids[0];
  const nearEdge = f.x < m.x + 90 || f.x > m.x + m.w - 90;
  const x = nearEdge || a.captured != null ? m.x + m.w / 2 : (target ? target.x : g.stage.cx);
  return { b: f.x < x ? BR : BL, pr: a.captured != null && (a.age > 65 || nearEdge) ? BZ : 0 };
}
function tryUlt(f, g) {
  if (f.avalanche) { finishAvalanche(f, g, !avalancheInterrupted(f, g)); return; }
  if (!f.ult || g.ult || g.over || f.carriedBy != null || f.dead > 0 || f.out || f.halo > 0 || f.hitstun > 0 || f.frozen > 0 || f.ledge || f.shieldBreak > 0) return;
  if (f.c.id === 'titan' && f.c.ultimate?.kind === 'avalanche') { if (f.zap > 0) return; startAvalanche(f, g); return; }
  f.ult = false; endAct(f); f.vx = 0; f.vy = 0;
  g.ult = { slot: f.slot, t: 0, targets: [], ph: 'cut', ax: f.x, ay: f.y - f.H / 2, aim: ULT_AIM, lock: 0 };
  f.vanish = true; f.inv = Math.max(f.inv, 4);
  emit(g, 'ult', f.x, f.y - f.H / 2, 0, f.slot);
}
function endUlt(g, f) {
  g.ult = null;
  if (f) { f.vanish = false; f.hitlag = 0; f.inv = 60; f.vx = 0; f.vy = 0; emit(g, 'ultback', f.x, f.y - f.H / 2, 0, f.slot); }
  g.orbNext = g.frame + 2400 + Math.floor(Math.random() * 1800);
}

/* returns true while the cutscene freezes the match */
function stepUlt(g, inputs) {
  // The opening cutscene pauses simulation, just like every other match timer.
  if (!g.ult || g.ult.ph !== 'cut') for (const f of g.fighters) {
    if (!f.avalanche) continue;
    f.avalanche.age++; f.avalanche.left--;
    if (avalancheInterrupted(f, g)) finishAvalanche(f, g, false);
    else if (f.avalanche.left <= 0) finishAvalanche(f, g, true);
  }
  const u = g.ult; if (!u) return false;
  const f = g.fighters.find(x => x.slot === u.slot);
  if (!f) { g.ult = null; return false; }
  if (u.ph === 'cut') {
    u.t++; f.vanish = true;
    if (u.t >= ULT_CUT) {
      const kind = ultKind(ultDef(f.c));
      if (kind === 'aim') { u.ph = 'aim'; emit(g, 'ultaim', u.ax, u.ay, 0, f.slot); return true; }
      const tg = ultEnemies(f, g).filter(o => kind === 'all' || ultInClose(f, o));
      if (!tg.length) { emit(g, 'ultmiss', f.x + (f.face || 1) * 120, f.y - f.H / 2, 0, f.slot); endUlt(g, f); return false; }
      u.targets = tg.map(o => o.slot);
      if (kind === 'all') { const m = g.stage.solids[0]; u.ax = m.x + m.w / 2; u.ay = m.y - 170; }
      else { u.ax = tg[0].x; u.ay = tg[0].y - tg[0].H / 2; }
      u.ph = 'fx'; emit(g, 'ulthitok', u.ax, u.ay, tg.length, f.slot);
    }
    return true;
  }
  if (u.ph === 'aim' || u.ph === 'lock') {
    f.vanish = true; f.inv = Math.max(f.inv, 4); f.hitstun = 0; f.vx = 0; f.vy = 0;
    if (u.ph === 'aim') {
      const inp = decodeIn(inputs ? inputs[g.fighters.indexOf(f)] : null);
      const mx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), my = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
      const B = g.stage.blast;
      u.ax = clamp(u.ax + mx * ULT_SPD, B.l + 80, B.r - 80);
      u.ay = clamp(u.ay + my * ULT_SPD, B.t + 80, B.b - 60);
      u.aim--;
      if (inp.spp || inp.ap || inp.smp || inp.zp || u.aim <= 0) { u.ph = 'lock'; u.lock = ULT_LOCK; emit(g, 'ultlock', u.ax, u.ay, 0, f.slot); }
    } else if (--u.lock <= 0) {
      u.targets = g.fighters.filter(o => o !== f && !o.out && o.dead <= 0 && !o.vanish && o.carriedBy == null && o.tid !== f.tid &&
        Math.hypot(o.x - u.ax, (o.y - o.H / 2) - u.ay) < ULT_R + o.W * 0.35).map(o => o.slot);
      if (!u.targets.length) { emit(g, 'ultmiss', u.ax, u.ay, 0, f.slot); endUlt(g, f); return false; }
      u.ph = 'fx'; u.t = ULT_CUT; emit(g, 'ulthitok', u.ax, u.ay, u.targets.length, f.slot);
    }
    return false;
  }
  // 'fx': the themed finisher plays on whoever got caught (the rest of the match keeps going)
  u.t++;
  const def = ultDef(f.c), st = ULT_STYLES[def.style] || ULT_STYLES.basic, k = u.t - ULT_CUT;
  const tg = u.targets.map(s => g.fighters.find(x => x.slot === s)).filter(o => o && !o.out && o.dead <= 0 && o.carriedBy == null);
  // free styles: the target can keep moving; hits only land while they're still inside the (slightly bigger) circle
  const inside = o => !st.free || Math.hypot(o.x - u.ax, (o.y - o.H / 2) - u.ay) < ULT_R * (st.reach || 1.2) + o.W * 0.35;
  f.vanish = true; f.inv = Math.max(f.inv, 4);
  if (k === 1 && def.freeze) tg.forEach(o => { o.frozen = ULT_FX_FINAL + 4; emit(g, 'freeze', o.x, o.y - o.H / 2); });
  const hits = def.hits || 3;
  if (k < ULT_FX_FINAL && !st.free) tg.forEach(o => { if (!def.freeze) o.hitlag = 2; });
  if (st.tick && k < ULT_FX_FINAL) tg.forEach(o => st.tick(o, k, u, g, f));
  for (let i = 0; i < hits; i++) {
    if (k === 6 + Math.floor(i * (ULT_FX_FINAL - 14) / hits)) tg.forEach(o => {
      if (!inside(o) || (st.chance && Math.random() > st.chance)) { emit(g, 'ulthit', u.ax + ultRnd(-60, 60), u.ay + ultRnd(-40, 40), 2, f.slot); return; }
      const d = def.dmg * f.ph.pm * o.ph.dt;
      if (st.stored) u.bank = (u.bank || 0) + d; else o.dmg = Math.min(999, o.dmg + d);
      if (st.hit) st.hit(o, i, u, g, f);
      emit(g, 'ulthit', o.x, o.y - o.H / 2, 6, f.slot);
    });
  }
  if (k === ULT_FX_FINAL) {
    tg.forEach(o => {
      if (!inside(o)) { emit(g, 'ultmiss', o.x, o.y - o.H / 2, 0, f.slot); return; }
      if (u.bank) o.dmg = Math.min(999, o.dmg + u.bank);
      const fin = Object.assign({}, def.final, st.after || {}, {
        b: ULT_FIN_B * (st.finMul || 1) * ULT_KIND_MUL[ultKind(def)] * ultRnd(0.85, 1.1),
        g: ULT_FIN_G * (st.finMul || 1) * ULT_KIND_MUL[ultKind(def)],
        angle: st.angle ? st.angle(o, u, f) : def.final.angle
      });
      const dir = st.dir ? st.dir(o, u, f) : (Math.sign(o.x - u.ax) || f.face);
      o.hitlag = 0; o.frozen = 0; o.inv = 0; o.ledge = null;
      applyHit(f, o, fin, dir, g, true);
    });
    u.bank = 0;
    g.shake = 24;
    emit(g, 'ultfinal', u.ax, u.ay, 0, f.slot);
  }
  if (k >= ULT_FX_END) endUlt(g, f);
  return false;
}

/* CPU steering the crosshair: chase the nearest enemy and fire once it's lined up */
function aiUltAim(f, g) {
  const u = g.ult, A = f.ai || (f.ai = { held: 0, cd: 0 });
  let best = null, bd = 1e9;
  for (const o of g.fighters) {
    if (o === f || o.out || o.dead > 0 || o.vanish || o.tid === f.tid) continue;
    const d = Math.hypot(o.x - u.ax, o.y - o.H / 2 - u.ay); if (d < bd) { bd = d; best = o; }
  }
  if (!best) return { b: 0, pr: BS };
  // the CPU's hand isn't perfect: it lags behind and wobbles, so a moving target can stay ahead of it
  const lv = clamp(f.lvl || 5, 1, 11);
  if (A.uw == null || --A.uwT <= 0) { A.uw = (Math.random() - 0.5) * (90 - lv * 5); A.uwv = (Math.random() - 0.5) * (60 - lv * 3); A.uwT = 20 + Math.floor(Math.random() * 30); }
  const tx = best.x + A.uw, ty = best.y - best.H / 2 + A.uwv * 0.6;
  let b = 0;
  if (tx > u.ax + 10) b |= BR; else if (tx < u.ax - 10) b |= BL;
  if (ty > u.ay + 10) b |= BD; else if (ty < u.ay - 10) b |= BU;
  if (A.ultHold == null) A.ultHold = 40 + Math.floor(Math.random() * 100);
  A.ultHold--;
  // fires when it's roughly lined up (or it's been chasing a while)
  const fire = (Math.hypot(best.x - u.ax, best.y - best.H / 2 - u.ay) < 45 && A.ultHold <= 0) || u.aim < 20;
  if (fire) { A.ultHold = null; A.uw = null; }
  return { b, pr: fire ? BS : 0 };
}

/* ---------- drawing ---------- */
function drawOrb(g, o, t) {
  if (!o) return;
  const r = ORB_R * (1 + 0.06 * Math.sin(t * 0.15));
  g.save(); g.globalCompositeOperation = 'lighter';
  const gl = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, r * 2.6);
  gl.addColorStop(0, 'rgba(255,255,255,.9)'); gl.addColorStop(0.3, `hsla(${(t * 3) % 360},100%,65%,.7)`); gl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gl; circle(g, o.x, o.y, r * 2.6); g.fill();
  g.restore();
  const og = g.createRadialGradient(o.x - r * 0.3, o.y - r * 0.3, 2, o.x, o.y, r);
  og.addColorStop(0, '#ffffff'); og.addColorStop(0.35, `hsl(${(t * 3) % 360},95%,65%)`); og.addColorStop(1, `hsl(${(t * 3 + 120) % 360},90%,45%)`);
  g.fillStyle = og; circle(g, o.x, o.y, r); g.fill();
  g.lineWidth = 3; g.strokeStyle = o.flash ? '#fff' : 'rgba(18,13,36,.9)'; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(o.x, o.y, r * 0.62, t * 0.08 + i * 2.1, t * 0.08 + i * 2.1 + 1.1); g.stroke(); }
  g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.45)'; circle(g, o.x, o.y, r + 9); g.stroke();
  g.strokeStyle = '#ffd35c'; g.beginPath(); g.arc(o.x, o.y, r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (o.hp / o.max)); g.stroke();
  g.font = '700 13px "Chakra Petch", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 4; g.strokeStyle = '#120d24'; g.strokeText(Math.max(0, Math.ceil(o.hp)) + ' hits', o.x, o.y - r - 22); g.fillStyle = '#fff'; g.fillText(Math.max(0, Math.ceil(o.hp)) + ' hits', o.x, o.y - r - 22);
}

function drawUltAura(g, f, t) {
  if (!f.ult || f.out || f.dead > 0 || f.trainUlt) return;
  const cx = f.x, cy = f.y - f.H * 0.5;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    g.strokeStyle = `hsla(${(t * 4 + i * 120) % 360},100%,65%,${0.45 - i * 0.1})`; g.lineWidth = 5 - i;
    g.beginPath(); g.ellipse(cx, cy, f.W * (0.8 + i * 0.18) + Math.sin(t * 0.2 + i) * 3, f.H * (0.65 + i * 0.1), 0, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
}

function ultCtx(view) {
  const u = view.ult; if (!u) return null;
  const f = view.fighters.find(x => x.slot === u.slot); if (!f) return null;
  const tg = (u.targets || []).map(s => view.fighters.find(x => x.slot === s)).filter(o => o && !o.out && !o.dead);
  // the finisher art was drawn for ULT_FX frames; play it sped up so it lines up with the quicker hits
  const k = u.t - ULT_CUT;
  return { u, f, tg, def: ultDef(f.c), k: u.ph === 'fx' || (!u.ph && k > 0) ? Math.round(k * ULT_ART) : k };
}

/* world-space effects during the ultimate */
function drawUltWorld(g, view, t) {
  const c = ultCtx(view); if (!c || c.k <= 0 || c.u.ph === 'aim' || c.u.ph === 'lock') return;
  const { f, tg, def, k } = c, col = def.colors, B = view.stage.blast;
  g.save(); g.globalCompositeOperation = 'lighter';
  if (def.theme === 'dragon') {
    const p = Math.min(1, k / 100), L = B.l + 200, R = B.r - 200;
    const hx = f.x < view.stage.cx ? L + (R - L) * p : R - (R - L) * p, dir = f.x < view.stage.cx ? 1 : -1;
    const midY = tg.length ? tg.reduce((a, o) => a + o.y - o.H / 2, 0) / tg.length : view.stage.spawnY + 150;
    for (let i = 28; i >= 0; i--) {
      const x = hx - dir * i * 26, y = midY + Math.sin((x * 0.012) + t * 0.1) * 70;
      const r = 30 - i * 0.7;
      g.fillStyle = i % 2 ? '#d4a017' : '#ff3b30'; circle(g, x, y, r); g.fill();
      g.fillStyle = 'rgba(255,240,170,.6)'; circle(g, x, y - r * 0.3, r * 0.45); g.fill();
    }
    const hy = midY + Math.sin(hx * 0.012 + t * 0.1) * 70;
    g.fillStyle = '#ffd35c'; g.beginPath(); g.ellipse(hx + dir * 20, hy, 46, 30, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffec9e'; g.lineWidth = 4; g.beginPath(); g.moveTo(hx + dir * 50, hy + 6); g.quadraticCurveTo(hx + dir * 110, hy + 40, hx + dir * 150, hy + 10); g.moveTo(hx + dir * 50, hy - 6); g.quadraticCurveTo(hx + dir * 110, hy - 50, hx + dir * 150, hy - 20); g.stroke();
    g.fillStyle = '#fff'; circle(g, hx + dir * 34, hy - 10, 6); g.fill();
    for (let i = 0; i < 8; i++) { const lx = B.l + 300 + ((i * 210 + k * 3) % (B.r - B.l - 600)), ly = midY + 220 - ((k * 2 + i * 60) % 400); g.fillStyle = 'rgba(255,60,40,.8)'; g.beginPath(); g.ellipse(lx, ly, 14, 18, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,220,120,.9)'; g.fillRect(lx - 8, ly - 20, 16, 4); }
  } else if (def.theme === 'jungle') {
    tg.forEach((o, i) => { const kk = (k % 30) / 30, y = o.y - 400 * (1 - kk); g.fillStyle = 'rgba(80,60,50,.85)'; g.beginPath(); g.ellipse(o.x, y - 40, 60, 70, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(160,255,120,.7)'; g.lineWidth = 6; circle(g, o.x, o.y, 40 + kk * 120); g.stroke(); });
  } else if (def.theme === 'slash') {
    tg.forEach(o => { for (let i = 0; i < 4; i++) { const a = (t * 0.7 + i * 1.3) % Math.PI, L = 160; g.strokeStyle = i % 2 ? col[1] : '#ffffff'; g.lineWidth = 4; g.beginPath(); g.moveTo(o.x - Math.cos(a) * L, o.y - o.H / 2 - Math.sin(a) * L); g.lineTo(o.x + Math.cos(a) * L, o.y - o.H / 2 + Math.sin(a) * L); g.stroke(); } });
  } else if (def.theme === 'tech') {
    tg.forEach(o => {
      const cy = o.y - o.H / 2;
      g.strokeStyle = '#ff3b3b'; g.lineWidth = 3; circle(g, o.x, cy, 50 - Math.min(30, k * 0.5)); g.stroke();
      g.beginPath(); g.moveTo(o.x - 70, cy); g.lineTo(o.x + 70, cy); g.moveTo(o.x, cy - 70); g.lineTo(o.x, cy + 70); g.stroke();
      if (k > 30) { const w = 30 + Math.sin(t * 0.8) * 8; const lg = g.createLinearGradient(o.x - w, 0, o.x + w, 0); lg.addColorStop(0, 'rgba(255,60,40,0)'); lg.addColorStop(0.5, 'rgba(255,240,200,.95)'); lg.addColorStop(1, 'rgba(255,60,40,0)'); g.fillStyle = lg; g.fillRect(o.x - w, B.t, w * 2, o.y - B.t); }
    });
  } else if (def.theme === 'holy') {
    tg.forEach(o => { const w = 40 + Math.sin(t * 0.3) * 10; const lg = g.createLinearGradient(o.x - w, 0, o.x + w, 0); lg.addColorStop(0, 'rgba(255,210,90,0)'); lg.addColorStop(0.5, 'rgba(255,250,220,.9)'); lg.addColorStop(1, 'rgba(255,210,90,0)'); g.fillStyle = lg; g.fillRect(o.x - w, B.t, w * 2, o.y - B.t); for (let i = 0; i < 3; i++) { const sy = o.y - 300 + ((k * 6 + i * 90) % 300); g.fillStyle = '#fff6c8'; g.fillRect(o.x - 3 + (i - 1) * 30, sy, 6, 40); g.fillRect(o.x - 10 + (i - 1) * 30, sy + 8, 20, 4); } });
  } else if (def.theme === 'fire') {
    const p = Math.min(1, k / 95), dir = f.x < view.stage.cx ? 1 : -1;
    const L = B.l + 250, R = B.r - 250, px = dir > 0 ? L + (R - L) * p : R - (R - L) * p;
    const midY = tg.length ? tg.reduce((a2, o) => a2 + o.y - o.H / 2, 0) / tg.length : view.stage.spawnY + 150;
    const py = midY - 60 + Math.sin(p * Math.PI) * 60;
    for (let i = 0; i < 26; i++) {
      const tx = px - dir * i * 22, ty = py + Math.sin(i * 0.5 + t * 0.2) * 14 * (i / 26);
      const rr = 34 - i;
      const gr = g.createRadialGradient(tx, ty, 0, tx, ty, rr);
      gr.addColorStop(0, i < 3 ? '#fff6d0' : 'rgba(255,200,80,.8)'); gr.addColorStop(0.5, 'rgba(255,100,20,.55)'); gr.addColorStop(1, 'rgba(255,40,0,0)');
      g.fillStyle = gr; circle(g, tx, ty, rr); g.fill();
    }
    [-1, 1].forEach(sd => {
      const wf = Math.sin(t * 0.3) * 0.4;
      g.save(); g.translate(px, py); g.scale(dir, 1); g.rotate(sd * (0.9 + wf));
      const wg = g.createLinearGradient(0, 0, -170, 0); wg.addColorStop(0, 'rgba(255,220,120,.85)'); wg.addColorStop(1, 'rgba(255,60,0,0)');
      g.fillStyle = wg; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-80, -sd * 70, -180, -sd * 20); g.lineTo(-120, sd * 10); g.lineTo(-150, sd * 30); g.lineTo(-60, sd * 20); g.closePath(); g.fill(); g.restore();
    });
    tg.forEach(o => {
      const h = 180 + Math.sin(t * 0.5 + o.x) * 30, base = o.y;
      const gr = g.createLinearGradient(0, base, 0, base - h); gr.addColorStop(0, 'rgba(255,220,120,.8)'); gr.addColorStop(0.5, 'rgba(255,90,20,.5)'); gr.addColorStop(1, 'rgba(255,40,0,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(o.x - 45, base); g.quadraticCurveTo(o.x - 30, base - h * 0.6, o.x + Math.sin(t * 0.3) * 10, base - h); g.quadraticCurveTo(o.x + 30, base - h * 0.5, o.x + 45, base); g.fill();
    });
    for (let i = 0; i < 14; i++) { const fx0 = B.l + 300 + ((i * 173) % (B.r - B.l - 600)), fy0 = view.stage.spawnY - 200 + ((k * 9 + i * 97) % 700); g.fillStyle = 'rgba(255,150,40,.8)'; circle(g, fx0, fy0, 5); g.fill(); g.fillStyle = 'rgba(255,90,20,.35)'; g.fillRect(fx0 - 2, fy0 - 26, 4, 24); }
  } else if (def.theme === 'storm') {
    tg.forEach((o, j) => {
      if (((k + j * 7) % 14) < 5) {
        const top = B.t, seed = Math.floor(t / 2) + j * 13;
        [[30, 'rgba(255,225,74,.2)'], [12, 'rgba(255,245,170,.55)'], [4, '#ffffff']].forEach(([w, c]) => {
          g.strokeStyle = c; g.lineWidth = w; g.lineJoin = 'miter'; g.beginPath(); g.moveTo(o.x + Math.sin(seed) * 40, top);
          for (let i = 1; i <= 12; i++) g.lineTo(o.x + (i === 12 ? 0 : Math.sin(seed * 2.3 + i * 1.9) * 30), top + (o.y - o.H / 2 - top) * i / 12);
          g.stroke();
        });
      }
      g.strokeStyle = 'rgba(122,215,255,.7)'; g.lineWidth = 2;
      for (let i = 0; i < 3; i++) { g.beginPath(); let lx = o.x, ly = o.y - o.H / 2; g.moveTo(lx, ly); for (let q = 0; q < 4; q++) { lx += (Math.random() - 0.5) * 40; ly += (Math.random() - 0.5) * 40; g.lineTo(lx, ly); } g.stroke(); }
    });
  } else if (def.theme === 'void') {
    const cx0 = tg.length ? tg.reduce((a2, o) => a2 + o.x, 0) / tg.length : view.stage.cx;
    const cy0 = (tg.length ? tg.reduce((a2, o) => a2 + o.y - o.H / 2, 0) / tg.length : view.stage.spawnY + 150) - 60;
    const R = Math.min(1, k / 40) * 110 * (k > 100 ? 1 + (k - 100) * 0.2 : 1);
    const halo = g.createRadialGradient(cx0, cy0, R * 0.8, cx0, cy0, R * 3.5); halo.addColorStop(0, 'rgba(163,92,255,.6)'); halo.addColorStop(1, 'rgba(60,10,140,0)');
    g.fillStyle = halo; circle(g, cx0, cy0, R * 3.5); g.fill();
    for (let i = 0; i < 3; i++) { g.strokeStyle = `rgba(220,190,255,${0.7 - i * 0.2})`; g.lineWidth = 4 - i; g.beginPath(); g.ellipse(cx0, cy0, R * (2.2 + i * 0.5), R * (0.5 + i * 0.12), t * 0.02 + i, 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 30; i++) { const an = t * 0.08 + i * 0.6, rr = R * (1.2 + ((k * 0.03 + i * 0.13) % 1) * 3.5); g.fillStyle = 'rgba(232,217,255,.8)'; circle(g, cx0 + Math.cos(an) * rr, cy0 + Math.sin(an) * rr * 0.5, 2.5); g.fill(); }
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#030108'; circle(g, cx0, cy0, R); g.fill();
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#e8d9ff'; g.lineWidth = 3; circle(g, cx0, cy0, R); g.stroke();
    tg.forEach(o => { g.strokeStyle = 'rgba(200,160,255,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(o.x, o.y - o.H / 2); g.quadraticCurveTo((o.x + cx0) / 2, o.y - o.H / 2 - 60, cx0, cy0); g.stroke(); });
  } else if (def.theme === 'arrows') {
    tg.forEach((o, j) => {
      for (let i = 0; i < 9; i++) {
        const ph = ((k * 1.6 + i * 23 + j * 11) % 60) / 60, ax = o.x - 120 + i * 30 + ph * 60, ay = o.y - 520 + ph * 480;
        const ang = Math.atan2(8, 1);
        g.save(); g.translate(ax, ay); g.rotate(ang);
        g.strokeStyle = 'rgba(230,255,190,.35)'; g.lineWidth = 6; g.beginPath(); g.moveTo(-60, 0); g.lineTo(0, 0); g.stroke();
        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = '#8a5a2c'; g.lineWidth = 3; g.beginPath(); g.moveTo(-26, 0); g.lineTo(14, 0); g.stroke();
        g.fillStyle = '#e8eef2'; g.beginPath(); g.moveTo(22, 0); g.lineTo(12, -5); g.lineTo(12, 5); g.fill();
        g.fillStyle = '#b5412b'; g.beginPath(); g.moveTo(-26, 0); g.lineTo(-33, -6); g.lineTo(-20, 0); g.lineTo(-33, 6); g.fill();
        g.globalCompositeOperation = 'lighter'; g.restore();
      }
      g.strokeStyle = 'rgba(155,196,90,.7)'; g.lineWidth = 3; circle(g, o.x, o.y - o.H / 2, 40 + (k % 15) * 3); g.stroke();
    });
  } else if (def.theme === 'thunder') {
    tg.forEach((o, j) => {
      const cyc = (k + j * 9) % 28, drop = Math.min(1, cyc / 10), hy2 = o.y - o.H / 2 - 420 * (1 - drop);
      if (cyc < 14) {
        const seed = Math.floor(t / 2) + j * 7;
        [[34, 'rgba(47,214,255,.2)'], [12, 'rgba(160,240,255,.6)'], [4, '#ffffff']].forEach(([w, c]) => {
          g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(o.x, B.t);
          for (let i = 1; i <= 10; i++) g.lineTo(o.x + (i === 10 ? 0 : Math.sin(seed * 1.9 + i * 2.2) * 26), B.t + (hy2 - B.t) * i / 10);
          g.stroke();
        });
      }
      g.save(); g.translate(o.x, hy2 - 60); g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#5a3b22'; g.fillRect(-7, -150, 14, 150);
      rrect(g, -80, -10, 160, 90, 10); g.fillStyle = '#8f9aa3'; g.fill(); g.strokeStyle = '#120d24'; g.lineWidth = 5; g.stroke();
      g.fillStyle = '#c08a3e'; g.fillRect(-80, 8, 160, 12); g.fillRect(-80, 52, 160, 12);
      g.shadowColor = '#2fd6ff'; g.shadowBlur = 20; g.strokeStyle = '#2fd6ff'; g.lineWidth = 4; g.beginPath(); g.moveTo(-15, 20); g.lineTo(8, 36); g.lineTo(-6, 42); g.lineTo(16, 60); g.stroke();
      g.restore();
    });
  } else if (def.theme === 'leaf') {
    tg.forEach((o, j) => {
      const base = o.y + 20, top = o.y - 460;
      for (let i = 0; i < 14; i++) {
        const kk = i / 13, yy = base - (base - top) * kk, w = 40 + kk * 150 + Math.sin(t * 0.2 + i) * 8;
        g.strokeStyle = `rgba(${90 + i * 8},${200 + i * 3},${110 + i * 6},${0.55 - kk * 0.3})`; g.lineWidth = 4;
        g.beginPath(); g.ellipse(o.x + Math.sin(t * 0.1 + kk * 4) * 20, yy, w, w * 0.2, 0, t * 0.5 + i, t * 0.5 + i + 4.6); g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 26; i++) {
        const kk = ((i / 26) + k * 0.012) % 1, yy = base - (base - top) * kk, a2 = t * 0.3 + i * 1.3, w = 40 + kk * 150;
        g.save(); g.translate(o.x + Math.cos(a2) * w, yy + Math.sin(a2) * w * 0.2); g.rotate(a2);
        g.fillStyle = i % 3 === 0 ? '#e8c24a' : i % 2 ? '#6fd35a' : '#3fa64a'; g.beginPath(); g.ellipse(0, 0, 11, 5, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
      g.globalCompositeOperation = 'lighter';
    });
  } else if (typeof drawUltWorldNew === 'function' && drawUltWorldNew(g, view, c, t)) {
  } else if (def.theme === 'ice') {
    tg.forEach(o => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + t * 0.03, r = 70; g.fillStyle = 'rgba(200,245,255,.8)'; g.save(); g.translate(o.x + Math.cos(a) * r, o.y - o.H / 2 + Math.sin(a) * r); g.rotate(a); g.fillRect(-4, -14, 8, 28); g.restore(); } });
  } else {
    tg.forEach(o => { g.strokeStyle = col[1]; g.lineWidth = 6; circle(g, o.x, o.y - o.H / 2, 30 + (k % 20) * 4); g.stroke(); });
  }
  g.restore();
  if (typeof drawUltActor === 'function') drawUltActor(g, view, c, t);   // the fighter acts it out (ult-act.js)
  if (typeof drawUltStyle === 'function') drawUltStyle(g, view, t);
}

/* screen tint during the ultimate: the whole stage takes on the fighter's theme */
function drawUltTint(g, view, vw, vh, t) {
  const c = ultCtx(view); if (!c || c.k <= 0) return;
  const { def, k } = c, col = def.colors;
  const a = Math.min(1, k / 15) * Math.min(1, (ULT_FX - k) / 15);
  g.save();
  g.fillStyle = hexA(col[0], 0.45 * a); g.fillRect(0, 0, vw, vh);
  const vg = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.3, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, hexA(col[1], 0.5 * a));
  g.fillStyle = vg; g.fillRect(0, 0, vw, vh);
  if (def.theme === 'dragon') { g.globalAlpha = a; drawChineseFrame(g, vw, vh); }
  g.restore();
}

function drawChineseFrame(g, vw, vh) {
  const m = 10, s = 16;
  g.strokeStyle = '#d4a017'; g.lineWidth = 4; g.strokeRect(m, m, vw - m * 2, vh - m * 2);
  g.strokeStyle = '#b3120f'; g.lineWidth = 10; g.strokeRect(m - 7, m - 7, vw - m * 2 + 14, vh - m * 2 + 14);
  g.strokeStyle = '#ffd35c'; g.lineWidth = 3;
  [[m, m, 1, 1], [vw - m, m, -1, 1], [m, vh - m, 1, -1], [vw - m, vh - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    g.beginPath(); g.moveTo(x, y + sy * s * 3); g.lineTo(x + sx * s * 3, y + sy * s * 3); g.lineTo(x + sx * s * 3, y + sy * s); g.lineTo(x + sx * s, y + sy * s); g.lineTo(x + sx * s, y + sy * s * 2); g.lineTo(x + sx * s * 2, y + sy * s * 2); g.stroke();
  });
}

/* the big cutscene splash when an ultimate starts (like Smash) */
function drawUltCutscene(g, view, vw, vh, t) {
  const c = ultCtx(view); if (!c || c.u.t > ULT_CUT || (c.u.ph && c.u.ph !== 'cut')) return;
  if (typeof drawUltIntro === 'function' && drawUltIntro(g, view, c, vw, vh, t)) return;   // per-fighter opening scene (ult-intro.js)
  const { f, def } = c, col = def.colors, k = c.u.t;
  const inA = Math.min(1, k / 14), outA = Math.min(1, (ULT_CUT - k) / 14), a = inA * outA;
  g.save();
  g.globalAlpha = a;
  const bg = g.createLinearGradient(0, 0, vw, vh); bg.addColorStop(0, col[0]); bg.addColorStop(0.6, shade(col[0], 0.12)); bg.addColorStop(1, col[1]);
  g.fillStyle = bg; g.fillRect(0, 0, vw, vh);
  // speed lines
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = hexA(col[2], 0.25); g.lineWidth = 2;
  for (let i = 0; i < 60; i++) { const an = i * 0.618 * Math.PI * 2 + t * 0.002, r1 = Math.max(vw, vh) * (0.25 + ((i * 37 + k * 9) % 100) / 300); g.beginPath(); g.moveTo(vw / 2 + Math.cos(an) * r1, vh / 2 + Math.sin(an) * r1); g.lineTo(vw / 2 + Math.cos(an) * (r1 + 120), vh / 2 + Math.sin(an) * (r1 + 120)); g.stroke(); }
  g.restore();
  drawThemeArt(g, def, vw, vh, t, k);
  // diagonal band
  const slide = Math.min(1, Math.max(0, (k - 8) / 14));
  const bandH = Math.min(vh * 0.42, 260), cy = vh * 0.5;
  g.save(); g.translate((1 - slide) * -vw, 0);
  g.beginPath(); g.moveTo(0, cy - bandH / 2 + 40); g.lineTo(vw, cy - bandH / 2 - 40); g.lineTo(vw, cy + bandH / 2 - 40); g.lineTo(0, cy + bandH / 2 + 40); g.closePath();
  const bgr = g.createLinearGradient(0, 0, vw, 0); bgr.addColorStop(0, hexA(col[1], 0.95)); bgr.addColorStop(1, hexA(col[2], 0.85));
  g.fillStyle = bgr; g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke();
  // portrait
  const ps = (bandH * 0.78) / f.H * (1 + Math.max(0, k - 30) * 0.0015);
  g.save(); g.beginPath(); g.moveTo(0, cy - bandH / 2 + 40); g.lineTo(vw, cy - bandH / 2 - 40); g.lineTo(vw, cy + bandH / 2 - 40); g.lineTo(0, cy + bandH / 2 + 40); g.closePath(); g.clip();
  g.translate(Math.min(vw * 0.24, 230), cy + bandH * 0.36); g.scale(ps, ps);
  drawFighter(g, { c: f.c, W: f.W, H: f.H, x: 0, y: 0, face: 1, pose: 'power', pt: 1, inv: 0 }, t, true);
  g.restore();
  // text
  const tx = Math.min(vw * 0.5, vw - 40), fs = Math.min(64, vw * 0.075);
  g.textAlign = vw < 600 ? 'center' : 'left'; g.textBaseline = 'middle';
  const x0 = vw < 600 ? vw / 2 : tx;
  g.font = `700 ${Math.round(fs * 0.34)}px "Chakra Petch", system-ui, sans-serif`;
  g.fillStyle = '#fff'; g.fillText((f.tag ? f.tag + ' · ' : '') + f.c.name.toUpperCase(), x0, cy - fs * 0.9);
  g.font = `${Math.round(fs)}px "Dela Gothic One", Impact, sans-serif`;
  g.lineWidth = 8; g.strokeStyle = '#120d24';
  const nm = def.name.toUpperCase();
  const words = nm.split(' '), lines = [];
  let cur = '';
  words.forEach(w => { const test = cur ? cur + ' ' + w : w; if (g.measureText(test).width > (vw < 600 ? vw - 30 : vw - tx - 20) && cur) { lines.push(cur); cur = w; } else cur = test; });
  lines.push(cur);
  lines.forEach((ln, i) => { const y = cy + i * fs * 1.02 - (lines.length - 1) * fs * 0.3; g.strokeText(ln, x0, y); const tg2 = g.createLinearGradient(0, y - fs / 2, 0, y + fs / 2); tg2.addColorStop(0, '#ffffff'); tg2.addColorStop(1, col[2] === '#ffffff' ? col[1] : col[2]); g.fillStyle = tg2; g.fillText(ln, x0, y); });
  g.restore();
  if (k < 8) { g.fillStyle = `rgba(255,255,255,${1 - k / 8})`; g.fillRect(0, 0, vw, vh); }
  g.restore();
}

function drawThemeArt(g, def, vw, vh, t, k) {
  const col = def.colors;
  g.save();
  if (def.theme === 'dragon') {
    drawChineseFrame(g, vw, vh);
    g.globalAlpha *= 0.55;
    for (let i = 0; i < 40; i++) { const an = t * 0.02 + i * 0.22, r = Math.min(vw, vh) * 0.42, x = vw * 0.72 + Math.cos(an) * r * 0.9, y = vh * 0.5 + Math.sin(an * 1.3) * r * 0.5; g.fillStyle = i % 2 ? '#d4a017' : '#ff5a3a'; circle(g, x, y, 24 - i * 0.45); g.fill(); }
    for (let i = 0; i < 6; i++) { const lx = (i + 0.5) * vw / 6, ly = vh * 0.15 + Math.sin(t * 0.05 + i) * 10; g.globalAlpha = 0.9; g.fillStyle = '#e02a1c'; g.beginPath(); g.ellipse(lx, ly, 18, 24, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffd35c'; g.fillRect(lx - 10, ly - 27, 20, 5); g.fillRect(lx - 10, ly + 22, 20, 5); g.strokeStyle = '#ffd35c'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, ly + 27); g.lineTo(lx, ly + 44); g.stroke(); }
  } else if (def.theme === 'jungle') {
    g.fillStyle = hexA(col[1], 0.4);
    for (let i = 0; i < 14; i++) { g.save(); g.translate((i * 137 + k * 6) % vw, (i * 71) % vh); g.rotate(i + t * 0.02); g.beginPath(); g.ellipse(0, 0, 40, 14, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  } else if (def.theme === 'slash') {
    g.strokeStyle = hexA(col[1], 0.6); g.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const y = (i * 97 + k * 20) % (vh + 200) - 100; g.beginPath(); g.moveTo(-50, y); g.lineTo(vw + 50, y - 200); g.stroke(); }
  } else if (def.theme === 'tech') {
    g.strokeStyle = hexA(col[1], 0.25); g.lineWidth = 1;
    for (let x = 0; x < vw; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, vh); g.stroke(); }
    for (let y = (k * 2) % 40; y < vh; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(vw, y); g.stroke(); }
  } else if (def.theme === 'holy') {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2 + t * 0.005; g.fillStyle = 'rgba(255,230,150,.12)'; g.beginPath(); g.moveTo(vw * 0.7, vh * 0.5); g.lineTo(vw * 0.7 + Math.cos(an) * vw, vh * 0.5 + Math.sin(an) * vw); g.lineTo(vw * 0.7 + Math.cos(an + 0.15) * vw, vh * 0.5 + Math.sin(an + 0.15) * vw); g.fill(); }
  } else if (def.theme === 'fire') {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 50; i++) { const x = (i * 97.3) % vw, y = vh - ((k * (3 + i % 4) + i * 53) % (vh + 40)); g.fillStyle = i % 3 ? 'rgba(255,150,40,.8)' : 'rgba(255,230,140,.9)'; circle(g, x, y, 2 + (i % 3)); g.fill(); }
    const fg = g.createLinearGradient(0, vh, 0, vh * 0.55); fg.addColorStop(0, 'rgba(255,90,20,.55)'); fg.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = fg; g.beginPath(); g.moveTo(0, vh);
    for (let x = 0; x <= vw; x += 30) g.lineTo(x, vh * 0.72 + Math.sin(x * 0.03 + t * 0.2) * 30 + Math.sin(x * 0.011 - t * 0.1) * 40);
    g.lineTo(vw, vh); g.fill();
  } else if (def.theme === 'storm') {
    g.fillStyle = 'rgba(20,24,50,.6)';
    for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse((i * 173 + k * 2) % (vw + 200) - 100, vh * 0.08 + (i % 3) * 20, 140, 45, 0, 0, Math.PI * 2); g.fill(); }
    if (k % 18 < 4) {
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#fffbd0'; g.lineWidth = 3; g.shadowColor = '#ffe14a'; g.shadowBlur = 16;
      const sx = (Math.floor(k / 18) * 331) % vw; g.beginPath(); g.moveTo(sx, 0); let lx = sx, ly = 0;
      while (ly < vh) { lx += (Math.random() - 0.5) * 70; ly += 40; g.lineTo(lx, ly); }
      g.stroke();
    }
  } else if (def.theme === 'void') {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 80; i++) {
      const an = i * 0.35 + t * 0.03, rr = (i * 7 + k * 4) % (Math.max(vw, vh) * 0.7);
      g.fillStyle = `rgba(${170 + (i % 3) * 30},120,255,${0.6 * (1 - rr / (Math.max(vw, vh) * 0.7))})`;
      circle(g, vw * 0.7 + Math.cos(an) * rr, vh * 0.5 + Math.sin(an) * rr * 0.55, 2.5); g.fill();
    }
  } else if (def.theme === 'arrows') {
    for (let i = 0; i < 26; i++) {
      const ph = ((k * 2.2 + i * 37) % 120) / 120, ax = (i * 71) % vw - vw * 0.2 + ph * vw * 0.5, ay = -80 + ph * (vh + 160);
      g.save(); g.translate(ax, ay); g.rotate(1.05);
      g.strokeStyle = hexA(col[2], 0.55); g.lineWidth = 3; g.beginPath(); g.moveTo(-40, 0); g.lineTo(20, 0); g.stroke();
      g.fillStyle = hexA(col[1], 0.8); g.beginPath(); g.moveTo(28, 0); g.lineTo(16, -6); g.lineTo(16, 6); g.fill(); g.restore();
    }
  } else if (def.theme === 'thunder') {
    g.fillStyle = 'rgba(12,30,40,.55)';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse((i * 151 + k) % (vw + 240) - 120, vh * 0.06 + (i % 3) * 22, 160, 50, 0, 0, Math.PI * 2); g.fill(); }
    g.globalCompositeOperation = 'lighter';
    if (k % 14 < 5) {
      const sx = (Math.floor(k / 14) * 419 + 120) % vw;
      [[16, 'rgba(47,214,255,.3)'], [4, '#f2feff']].forEach(([w, c]) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(sx, 0); let lx = sx, ly = 0; let seed = Math.floor(k / 14); while (ly < vh) { lx += Math.sin(seed++ * 2.7) * 50; ly += 45; g.lineTo(lx, ly); } g.stroke(); });
    }
  } else if (def.theme === 'leaf') {
    for (let i = 0; i < 44; i++) {
      const an = t * 0.03 + i * 0.5, rr = ((i * 37 + k * 5) % Math.max(vw, vh)) * 0.6;
      g.save(); g.translate(vw * 0.7 + Math.cos(an) * rr, vh * 0.5 + Math.sin(an) * rr * 0.5); g.rotate(an * 2);
      g.fillStyle = i % 3 === 0 ? 'rgba(242,227,107,.85)' : i % 2 ? 'rgba(111,211,90,.85)' : 'rgba(63,166,74,.85)';
      g.beginPath(); g.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  } else if (def.theme === 'ice') {
    g.fillStyle = 'rgba(230,250,255,.8)';
    for (let i = 0; i < 40; i++) { star(g, (i * 97.3) % vw, ((i * 53.1) + k * 3) % vh, 3 + (i % 3)); g.fill(); }
  } else if (typeof drawThemeArtNew === 'function') drawThemeArtNew(g, def, vw, vh, t, k);
  g.restore();
}

/* ---------- aimed ultimate: crosshair (world) + banner (screen) ---------- */
function drawUltAim(g, view, t) {
  const u = view.ult; if (!u || (u.ph !== 'aim' && u.ph !== 'lock')) return;
  const f = view.fighters.find(x => x.slot === u.slot); if (!f) return;
  const col = ultDef(f.c).colors[1] || '#ffd35c', x = u.ax, y = u.ay, R = ULT_R;
  const lock = u.ph === 'lock', lk = lock ? 1 - (u.lock / ULT_LOCK) : 0;
  g.save();
  // danger zone
  g.fillStyle = lock ? `rgba(255,60,60,${0.12 + 0.18 * lk})` : 'rgba(255,255,255,.07)';
  circle(g, x, y, R); g.fill();
  g.lineWidth = lock ? 5 : 4; g.strokeStyle = lock ? (Math.floor(t / 3) % 2 ? '#ff3b3b' : '#ffffff') : col;
  g.setLineDash(lock ? [] : [18, 10]); g.lineDashOffset = -t * 1.5;
  circle(g, x, y, R); g.stroke(); g.setLineDash([]);
  // closing lock ring
  if (lock) { g.strokeStyle = '#ffffff'; g.lineWidth = 3; circle(g, x, y, R * (1.6 - 0.6 * lk)); g.stroke(); }
  // cross
  g.strokeStyle = lock ? '#ff3b3b' : '#ffffff'; g.lineWidth = 3;
  const a = R * 0.35, b2 = R * 0.85;
  g.beginPath(); g.moveTo(x - b2, y); g.lineTo(x - a, y); g.moveTo(x + a, y); g.lineTo(x + b2, y); g.moveTo(x, y - b2); g.lineTo(x, y - a); g.moveTo(x, y + a); g.lineTo(x, y + b2); g.stroke();
  g.fillStyle = lock ? '#ff3b3b' : col; circle(g, x, y, 6); g.fill();
  // rotating brackets
  g.strokeStyle = col; g.lineWidth = 5;
  for (let i = 0; i < 4; i++) { const an = t * 0.04 + i * Math.PI / 2; g.beginPath(); g.arc(x, y, R + 14, an, an + 0.5); g.stroke(); }
  // timer arc
  if (!lock) { g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 6; circle(g, x, y, R + 26); g.stroke(); g.strokeStyle = '#ffd35c'; g.beginPath(); g.arc(x, y, R + 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, u.aim) / ULT_AIM); g.stroke(); }
  g.restore();
}
function drawUltAimHud(g, view, vw, vh, t, localSlot) {
  const u = view.ult; if (!u || (u.ph !== 'aim' && u.ph !== 'lock')) return;
  const f = view.fighters.find(x => x.slot === u.slot); if (!f) return;
  const me = localSlot != null && localSlot === u.slot, def = ultDef(f.c), col = def.colors[1] || '#ffd35c';
  const touch = typeof TOUCH !== 'undefined' && TOUCH.on;
  const big = u.ph === 'lock' ? (me ? 'LOCKED ON!' : 'GET OUT!') : me ? 'AIM YOUR ULTIMATE' : 'DODGE!';
  const sub = u.ph === 'lock' ? def.name : me ? (touch ? 'Move the stick to aim · tap B to fire' : (typeof bindLabel === 'function' ? `${bindLabel('up')}${bindLabel('left')}${bindLabel('down')}${bindLabel('right')} to aim · ${bindLabel('sp')} to fire` : 'WASD to aim · K to fire')) : `${f.name || 'Someone'} is aiming ${def.name}`;
  const secs = u.ph === 'aim' ? (Math.max(0, u.aim) / 60).toFixed(1) + 's' : '';
  const w = Math.min(vw - 24, 440), x = (vw - w) / 2, y = 64;
  g.save();
  g.fillStyle = 'rgba(17,14,36,.86)'; rrect(g, x, y, w, 64, 14); g.fill();
  g.lineWidth = 3; g.strokeStyle = u.ph === 'lock' ? '#ff3b3b' : col; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '22px "Dela Gothic One", Impact, sans-serif'; g.fillStyle = '#ffffff'; g.fillText(big + (secs ? '  ' + secs : ''), vw / 2, y + 24);
  g.font = '700 13px "Chakra Petch", system-ui, sans-serif'; g.fillStyle = '#c9c5e6'; g.fillText(sub, vw / 2, y + 48);
  if (u.ph === 'aim') { g.fillStyle = '#ffd35c'; rrect(g, x + 10, y + 58, Math.max(0, (w - 20) * u.aim / ULT_AIM), 3, 2); g.fill(); }
  g.restore();
}

/* big MISS! / HIT! splash in the middle of the screen when an aimed ultimate lands or whiffs */
const ULT_SPLASH = { text: '', at: 0, col: '#fff' };
function ultSplash(text, col) { ULT_SPLASH.text = text; ULT_SPLASH.col = col; ULT_SPLASH.at = performance.now(); }
function drawUltSplash(g, vw, vh) {
  if (!ULT_SPLASH.text) return;
  const ms = performance.now() - ULT_SPLASH.at, DUR = 1300;
  if (ms > DUR) { ULT_SPLASH.text = ''; return; }
  const k = ms / DUR;
  const pop = k < 0.12 ? 0.3 + (k / 0.12) * 1.0 : k < 0.2 ? 1.3 - ((k - 0.12) / 0.08) * 0.3 : 1;
  const a = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
  const miss = ULT_SPLASH.text.startsWith('MISS');
  const size = Math.min(vw * 0.2, 150);
  g.save();
  g.globalAlpha = a;
  g.translate(vw / 2, vh * 0.42 + (miss ? Math.sin(ms * 0.05) * 6 * (1 - k) : 0));
  g.rotate(miss ? -0.06 : 0.04);
  g.scale(pop, pop);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${Math.round(size)}px "Dela Gothic One", Impact, sans-serif`;
  g.lineJoin = 'round';
  g.lineWidth = size * 0.16; g.strokeStyle = '#120d24'; g.strokeText(ULT_SPLASH.text, 0, size * 0.04);
  const gr = g.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
  if (miss) { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#9a96b8'); }
  else { gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.5, '#ffd35c'); gr.addColorStop(1, ULT_SPLASH.col || '#ff6b2e'); }
  g.fillStyle = gr; g.fillText(ULT_SPLASH.text, 0, 0);
  g.lineWidth = 3; g.strokeStyle = miss ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.85)'; g.strokeText(ULT_SPLASH.text, 0, 0);
  g.restore();
}
