'use strict';
/* ===== CLOUDTOP BRAWL — Professor Sprocket (unlocks at level 50 on the Sky Road) =====
   A gadget-packed inventor: spring legs (a triple jump and a huge Spring Leap that never carries him out of the top),
   an Extend-o Arm that punches from far away, and a Grapple Hand that reels him to a ledge from far away, even
   while falling. Fun to recover with, but weaker than the Boss Fight fighters. The game server uses this file too. */

ROSTER.push({
  id: 'sprocket', name: 'Professor Sprocket', title: 'Gadget-packed inventor', locked: true, unlockLevel: 50, safeTop: true,
  stats: { power: 5, speed: 6, weight: 4, jump: 9, defense: 4, skill: 7 },
  look: { build: 'slim', body: '#ece6d6', skin: '#e8b98f', accent: '#c9932a', hair: '#e2e2ea', legs: '#5a4636', extra: ['sprocket'] },
  passive: 'Spring legs: a triple jump and a giant Spring Leap that never carries him off the top. His Grapple Hand reels him to a ledge from far away, even while falling.',
  strongVs: ['titan', 'ulfgar'], weakVs: ['zephyr', 'talon'],
  ultimate: { style: 'beams', kind: 'aim', name: 'Gadget Barrage', desc: 'Aim the circle: a swarm of tiny rockets and boxing gloves rains down on whoever is inside, then one giant spring-loaded punch.', theme: 'tech', colors: ['#1a1206', '#c9932a', '#7ad7ff'], hits: 4, dmg: 4.4, final: { dmg: 16, b: 11.5, g: 1.3, angle: 80 } },
  specials: {
    neutral: { name: 'Gadget Glove', desc: 'Fire a little spring-loaded boxing glove. Two can be out at once.', kind: 'proj',
      dmg: 5, b: 3.5, g: 0.5, angle: 25, startup: 9, end: 14, speed: 14, life: 40, size: 12, shape: 'fist', color: '#c9932a', max: 2 },
    side: { name: 'Extend-o Arm', desc: 'His arm stretches out like an accordion and punches someone far away.', kind: 'melee',
      dmg: 10, b: 6.5, g: 0.85, angle: 30, startup: 11, active: 5, end: 20, hx: 2.1, hy: 0.6, hw: 3.4, hh: 0.35, pose: 'punch' },
    up: { name: 'Spring Leap', desc: 'Coil the spring legs and boing very high, hitting anyone above. It never carries him off the top.', kind: 'leap',
      vy: 22, vx: 3, dmg: 6, b: 5, g: 0.6, angle: 85, startup: 6, active: 12, hx: 0, hy: 0.2, hw: 1.2, hh: 0.6, fx: 'spring' },
    down: { name: 'Grapple Hand', desc: 'In the air, shoot the hand at the nearest ledge and reel in to hang on it (works even while falling). Otherwise a long claw grab.', kind: 'grapple',
      reach: 360, dmg: 7, b: 5, g: 0.7, angle: 40, startup: 8, active: 6, end: 18, hx: 1.6, hy: 0.55, hw: 2.2, hh: 0.4 }
  }
});
CHAR.sprocket = ROSTER[ROSTER.length - 1];
/* fighters unlocked by reaching a level (the game server adds them to your account) */
function levelUnlocksFor(level) { return ROSTER.filter(c => c.unlockLevel && level >= c.unlockLevel).map(c => c.id); }
