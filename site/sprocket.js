'use strict';
/* ===== CLOUDTOP BRAWL — Professor Sprocket (unlocks at level 50 on the Sky Road) =====
   A gadget-packed inventor: spring legs (a triple jump and a huge Spring Leap that never carries him out of the top,
   leaving a spring pad behind), a Gear Cannon, a wind-up Robo-Pup, and a Grapple Hand that reels him to a ledge from far
   away (on the ground it drops a Magnet Trap). His ultimate puts him in a Mega Mech for a few seconds.
   Fun to recover with, but weaker than the Boss Fight fighters. The game server uses this file too. */

ROSTER.push({
  id: 'sprocket', name: 'Professor Sprocket', title: 'Gadget-packed inventor', locked: true, unlockLevel: 50, safeTop: true,
  stats: { power: 5, speed: 6, weight: 4, jump: 9, defense: 4, skill: 7 },
  look: { build: 'slim', body: '#ece6d6', skin: '#e8b98f', accent: '#c9932a', hair: '#e2e2ea', legs: '#5a4636', extra: ['sprocket'] },
  passive: 'Spring legs: a triple jump and a giant Spring Leap that never carries him off the top. His Grapple Hand reels him to a ledge from far away, even while falling.',
  strongVs: ['titan', 'ulfgar'], weakVs: ['zephyr', 'talon'],
  ultimate: { style: 'mech', kind: 'mech', name: 'Mega Mech', desc: 'Jump into a giant mech suit for 6 seconds: bigger, heavier, super armor, rocket punches, a jet charge and huge stomps.', theme: 'tech', colors: ['#1a1206', '#c9932a', '#7ad7ff'], dur: 360 },
  specials: {
    neutral: { name: 'Gear Cannon', desc: 'His shoulder cannon fires a spinning gear that bounces along the floor (up to 3 times) and zaps whoever it hits. Hold to charge a giant gear that cuts through everyone.', kind: 'proj',
      dmg: 5, b: 3.4, g: 0.5, angle: 35, startup: 10, end: 14, speed: 10, aim: 14, grav: 0.38, life: 110, size: 20, shape: 'gear', color: '#c9932a', max: 2, bounce: 3, zap: 12, charge: 45, chargeMul: 1.7 },
    side: { name: 'Robo-Pup', desc: 'Wind up a little robot dog. It runs along the floor, leaps on the first enemy and blows up in springs and bolts.', kind: 'proj',
      dmg: 3, b: 2, g: 0.3, angle: 40, startup: 12, end: 16, speed: 6.5, life: 130, size: 30, shape: 'robopup', color: '#c9932a', max: 1, ground: true, pup: true,
      burst: { dmg: 10, b: 7, g: 0.9, angle: 50, r: 95, fx: 'pupboom' } },
    up: { name: 'Spring Leap', desc: 'Coil the spring legs and boing very high, hitting anyone above. Leaves a spring pad behind that bounces enemies who step on it. It never carries him off the top.', kind: 'leap',
      vy: 22, vx: 3, dmg: 6, b: 5, g: 0.6, angle: 85, startup: 6, active: 12, hx: 0, hy: 0.2, hw: 1.2, hh: 0.6, fx: 'spring',
      pad: { dmg: 4, b: 7.5, g: 0.6, angle: 88, speed: 0, life: 150, size: 40, shape: 'springpad', color: '#c9932a', ground: true, offset: 0.01, pierce: true, rehit: 40 } },
    down: { name: 'Grapple Hand', desc: 'In the air, shoot the hand at the nearest ledge and reel in to hang on it (works even while falling). On the ground, drop a Magnet Trap that pulls enemies in, then zaps them.', kind: 'grapple',
      reach: 360, dmg: 7, b: 5, g: 0.7, angle: 40, startup: 8, active: 6, end: 18, hx: 1.6, hy: 0.55, hw: 2.2, hh: 0.4,
      magnet: { dmg: 1, b: 0.5, g: 0.1, angle: 45, speed: 0, life: 80, size: 30, shape: 'magnet', color: '#e8354a', ground: true, offset: 80, pierce: true, rehit: 18, pull: 2.6, pullR: 140,
        burst: { dmg: 9, b: 6.5, g: 0.8, angle: 55, r: 90, fx: 'magburst', zap: 26 } } }
  }
});
CHAR.sprocket = ROSTER[ROSTER.length - 1];

/* ---------- Mega Mech (his ultimate): a few seconds in a giant mech suit ----------
   bigger, heavier (hard to launch), super armor against normal hits, stronger hits, and these moves instead */
const MECH_SPECIALS = {
  neutral: { name: 'Rocket Fist', desc: 'Fire a huge rocket fist that flies through everyone.', kind: 'proj',
    dmg: 11, b: 7, g: 0.9, angle: 30, startup: 8, end: 12, speed: 15, life: 50, size: 34, shape: 'fist', color: '#ff8a1f', max: 2, pierce: true },
  side: { name: 'Jet Charge', desc: 'Jets blazing, the mech rams forward.', kind: 'dash',
    dmg: 13, b: 8, g: 1.0, angle: 35, startup: 6, dur: 20, vx: 16, end: 12, hx: 0.6, hy: 0.5, hw: 1.2, hh: 0.8, armor: true, fx: 'fire', finalB: 9 },
  up: { name: 'Jet Boost', desc: 'Blast straight up on the jets, uppercutting anyone above.', kind: 'leap',
    vy: 21, vx: 3, dmg: 9, b: 7, g: 0.8, angle: 85, startup: 5, active: 14, hx: 0.2, hy: 1.0, hw: 1.4, hh: 0.7, noHelpless: true },
  down: { name: 'Mega Stomp', desc: 'Slam both mech feet down and shake the whole floor.', kind: 'slam',
    fall: 26, dmg: 16, b: 8.5, g: 1.1, angle: 70, startup: 8, end: 18, hw: 5.2, hh: 0.5, armor: true }
};
const MECH_SIZE = 1.35;
function startMech(f, g) {
  const d = ((f.c.ultimate && f.c.ultimate.dur) || 360) | 0;
  f.mech = d; f.mechPh = f.ph; f.mechWH = [f.W, f.H];
  f.ph = Object.assign({}, f.ph, { pm: f.ph.pm * 1.4, wf: f.ph.wf * 0.55, dt: f.ph.dt * 0.8 });
  f.W *= MECH_SIZE; f.H *= MECH_SIZE;
  f.helpless = false; f.upUsed = false; f.sideUsed = false;
  emit(g, 'mechon', f.x, f.y - f.H / 2, 0, f.slot); g.shake = Math.max(g.shake, 12);
}
function endMech(f, g) {
  if (!f.mechPh) { f.mech = 0; return; }
  f.ph = f.mechPh; f.mechPh = null;
  if (f.mechWH) { f.W = f.mechWH[0]; f.H = f.mechWH[1]; f.mechWH = null; }
  f.mech = 0;
  emit(g, 'mechoff', f.x, f.y - f.H / 2, 0, f.slot);
}
/* every frame: the suit runs out, or comes off if he's knocked out */
function stepMechs(g) {
  for (const f of g.fighters) {
    if (!(f.mech > 0)) continue;
    if (f.out || f.dead > 0) { endMech(f, g); continue; }
    if (--f.mech <= 0) endMech(f, g);
  }
}
/* fighters unlocked by reaching a level (the game server adds them to your account) */
function levelUnlocksFor(level) { return ROSTER.filter(c => c.unlockLevel && level >= c.unlockLevel).map(c => c.id); }
