'use strict';
/* ===== CLOUDTOP BRAWL — smooth animation layer (drawing only, never touches the match) =====
   Every fighter gets a little animation state (_anim) that makes movement feel natural:
   - poses blend into each other instead of snapping
   - squash when landing, stretch when jumping, lean into air movement
   - a front flip on double jumps, a run cycle that follows real speed
   - afterimages when moving fast, dust from footsteps and skids, a shake when hit
   Also watches the frame rate and switches to a lighter "low effects" mode on slow devices. */

const PERF = { low: false, ms: 16.7, bad: 0, good: 0, forced: null };

/* glow (shadowBlur) is the most expensive canvas effect: in low mode it is switched off everywhere */
(function () {
  try {
    const P = CanvasRenderingContext2D.prototype, d = Object.getOwnPropertyDescriptor(P, 'shadowBlur');
    if (!d || !d.set) return;
    Object.defineProperty(P, 'shadowBlur', {
      configurable: true,
      get() { return d.get.call(this); },
      set(v) { d.set.call(this, PERF.low ? 0 : v); }
    });
  } catch (e) { }
})();

/* called once per animation frame with the real time between frames */
function perfTick(dt) {
  if (!(dt > 0) || dt > 250) return;
  PERF.ms += (dt - PERF.ms) * 0.05;
  if (PERF.forced != null) { PERF.low = PERF.forced; return; }
  if (!PERF.low) {
    if (PERF.ms > 22) { if (++PERF.bad > 90) { PERF.low = true; PERF.bad = 0; PERF.good = 0; } } else PERF.bad = Math.max(0, PERF.bad - 2);
  } else {
    if (PERF.ms < 14) { if (++PERF.good > 600) { PERF.low = false; PERF.good = 0; } } else PERF.good = 0;
  }
}

const AIR_POSES = { jump: 1, fall: 1, helpless: 1, fly: 1, dodge: 1 };
const GROUND_POSES = { idle: 1, run: 1, land: 1, shield: 1, guard: 1 };
const SNAPPY = { punch: 0.6, up: 0.6, low: 0.6, split: 0.6, back: 0.6, stomp: 0.6, cast: 0.55, dash: 0.55, slam: 0.6, charge: 0.45, hurt: 0.75, frozen: 1, roll: 1, spin: 1, climb: 0.6, ledge: 0.5, counter: 0.5, run: 0.55 };
const ANG_KEYS = ['armF', 'armB', 'elbF', 'elbB', 'legF', 'legB', 'kneeF', 'kneeB', 'lean', 'crouch', 'bob'];

function mixPose(a, b, k) { const o = Object.assign({}, a); ANG_KEYS.forEach(n => { o[n] = a[n] + (b[n] - a[n]) * k; }); return o; }

function animStep(f, A, t) {
  let an = f._anim;
  const now = performance.now();
  if (!an) {
    an = f._anim = { t: -1, px: f.x, py: f.py != null ? f.py : f.y, vx: 0, vy: 0, A: Object.assign({}, A), sx: 1, sy: 1, land: 0, flip: 0, flipDir: 1, tumble: 0, jit: 0, runPh: 0, prevPose: f.pose, trail: [], lastNow: now, step: 0, pvy: 0 };
  }
  if (an.t !== t) {
    const k = clamp((now - an.lastNow) / 16.67, 0.5, 3);
    an.lastNow = now; an.t = t;
    let dx = f.x - an.px, dy = f.y - an.py;
    if (Math.abs(dx) > 120 || Math.abs(dy) > 120) { dx = 0; dy = 0; an.trail.length = 0; }
    an.px = f.x; an.py = f.y;
    const vx = dx / k, vy = dy / k;
    an.vx += (vx - an.vx) * 0.6; an.pvy = an.vy; an.vy += (vy - an.vy) * 0.6;
    const pose = f.pose, prev = an.prevPose;
    const air = !!AIR_POSES[pose], wasAir = !!AIR_POSES[prev] || prev === 'hurt';

    /* landing squash / take-off stretch */
    if (wasAir && GROUND_POSES[pose] && an.pvy > 2) { an.land = Math.min(1, 0.45 + an.pvy * 0.06); dust(f, 3); }
    if (pose === 'jump' && GROUND_POSES[prev]) an.land = -0.6;
    /* front flip on mid-air jumps */
    if (pose === 'jump' && (prev === 'jump' || prev === 'fall') && an.vy - an.pvy < -5 && an.flip <= 0 && !(f.flyT > 0)) { an.flip = 1; an.flipDir = 1; }
    if (an.flip > 0) an.flip = Math.max(0, an.flip - 0.055 * k);
    if (!air && pose !== 'hurt') an.flip = 0;
    /* hit shake */
    if (pose === 'hurt' && prev !== 'hurt') an.jit = 7;
    an.jit *= Math.pow(0.8, k);
    /* tumble when launched hard */
    const spd = Math.hypot(an.vx, an.vy);
    if (pose === 'hurt' && spd > 12) an.tumble += spd * 0.012 * k;
    else if (an.tumble) {
      const tw = Math.PI * 2, m = ((an.tumble % tw) + tw) % tw, target = m > Math.PI ? tw : 0;
      const nm = m + (target - m) * Math.min(1, 0.3 * k);
      an.tumble = Math.abs(target - nm) < 0.02 ? 0 : nm;
    }
    /* run cycle follows real speed, with footstep dust */
    if (pose === 'run') {
      const before = Math.floor(an.runPh / Math.PI);
      an.runPh += clamp(Math.abs(an.vx) * 0.085, 0.14, 0.5) * k;
      if (Math.floor(an.runPh / Math.PI) !== before && !PERF.low && Math.random() < 0.7) dust(f, 1);
    }
    /* skid when turning around */
    if ((pose === 'run' || pose === 'idle') && an.vx * (f.face || 1) < -2.2 && !PERF.low) dust(f, 1, -Math.sign(an.vx));

    /* squash & stretch target */
    let tsy = 1;
    if (air && pose !== 'fly') tsy = an.vy < 0 ? 1 + clamp(-an.vy * 0.011, 0, 0.14) : 1 + clamp(an.vy * 0.005, 0, 0.06);
    if (an.land > 0) { tsy = 1 - 0.2 * an.land; an.land = Math.max(0, an.land - 0.16 * k); }
    else if (an.land < 0) { tsy = 1 + 0.16 * -an.land; an.land = Math.min(0, an.land + 0.2 * k); }
    if (pose === 'idle') tsy *= 1 + Math.sin(t * 0.07) * 0.012;
    an.sy += (tsy - an.sy) * Math.min(1, 0.5 * k); an.sx = 1 / Math.sqrt(an.sy) * (an.sy < 1 ? 1.04 : 1);

    /* target pose: jump/fall flow into each other by vertical speed */
    let T = A;
    if ((pose === 'jump' || pose === 'fall') && !A._mixed) {
      const J = poseAngles({ pose: 'jump', pt: 0 }, t), Fp = poseAngles({ pose: 'fall', pt: 0 }, t);
      const u = clamp((an.vy + 5) / 11, 0, 1);
      T = mixPose(J, Fp, u);
      const apex = 1 - clamp(Math.abs(an.vy) / 4, 0, 1);
      T.kneeF += apex * 25; T.kneeB += apex * 25; T.legF += apex * 18; T.armF -= apex * 20;
      T.rot = 0; T.jit = 0;
    }
    if (air && pose !== 'hurt' && pose !== 'spin') T.lean = (T.lean || 0) + clamp(an.vx * (f.face || 1) * 1.6, -14, 16);
    const kb = Math.min(1, (SNAPPY[pose] || 0.32) * k);
    const out = Object.assign({}, T);
    ANG_KEYS.forEach(n => { out[n] = (pose !== prev && kb >= 1) ? T[n] : an.A[n] + (T[n] - an.A[n]) * kb; });
    an.A = out;
    an.prevPose = pose;

    /* afterimage trail */
    if (!PERF.low && (spd > 11 || pose === 'dash') && pose !== 'hurt') {
      an.trail.push({ x: f.x, y: f.y, A: Object.assign({}, out, { rot: (T.rot || 0) + flipRot(an) }), face: f.face, pose, pt: f.pt, life: 1 });
      if (an.trail.length > 3) an.trail.shift();
    }
    an.trail.forEach(q => { q.life -= 0.22 * k; });
    an.trail = an.trail.filter(q => q.life > 0);
  }
  const R = Object.assign({}, an.A);
  R.rot = (A.rot || 0) + flipRot(an) + an.tumble * (f.face || 1) * -1;
  R.jit = A.jit;
  return { A: R, sx: an.sx, sy: an.sy, ox: an.jit ? Math.sin(t * 2.7) * an.jit : 0 };
}
function flipRot(an) { if (an.flip <= 0) return 0; const p = 1 - an.flip, e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; return e * Math.PI * 2; }

function dust(f, n, dir) {
  if (typeof spawnFx !== 'function') return;
  for (let i = 0; i < n; i++) spawnFx({ k: 'smoke', x: f.x + (Math.random() - 0.5) * f.W * 0.6, y: f.y - 2, vx: (dir || (Math.random() - 0.5)) * (1 + Math.random() * 1.5), vy: -Math.random() * 1.2, life: 18, col: 'rgba(240,235,225,.55)', size: 5 + Math.random() * 3 });
}

/* faded copies of the fighter left behind when moving fast */
function drawGhosts(g, f, t) {
  const an = f._anim; if (!an || !an.trail.length || PERF.low) return;
  an.trail.forEach((q, i) => {
    if (Math.hypot(q.x - f.x, q.y - f.y) < 8) return;
    drawFighter(g, Object.assign({}, f, { x: q.x, y: q.y, face: q.face, pose: q.pose, pt: q.pt, inv: 0, _A: q.A, _ghostA: 0.16 + q.life * 0.14 * (i + 1) / an.trail.length, _anim: null }), t, 'ghost');
  });
}
