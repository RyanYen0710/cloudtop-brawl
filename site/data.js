'use strict';
/* =====================================================================
   CLOUDTOP BRAWL — DATA FILE
   ---------------------------------------------------------------------
   ADD YOUR OWN FIGHTERS HERE. Copy one entry in ROSTER and change it.

   stats (1–10) drive both the stat card AND the real physics:
     power   → how hard all attacks hit
     speed   → run / air speed
     weight  → heavier = harder to launch, falls faster
     jump    → jump height (9+ gets a triple jump)
     defense → takes less damage, stronger shield
     skill   → difficulty rating only (shown on the card)

   look.build: 'bulky' | 'normal' | 'slim' | 'small'
   look.extra: any of 'ape','robe','beard','topknot','ninja','robot','knight','witch','flame','storm','reaper','archer','thunder','bird','tamer','agent','dj','clock','alchemist','photo','baller'

   Each special picks a "kind". Kinds the engine understands:
     melee    dmg,b,g,angle,startup,active,end,hx,hy,hw,hh  (+charge, armor, lunge, rehit)
     proj     dmg,b,g,angle,startup,end,speed,life,size,shape,color,max  (+pierce,freeze,grav,mine,ground)
              shapes: orb, star, laser, fist, mine, shard, spike
     dash     vx,dur + hit fields (+armor)
     leap     vy,vx + hit fields (+rehit, finalB)  → helpless after
     fly      dur (frames, 60 = 1 sec), speed, fx: 'cloud' | 'jet' | 'snow'
     slam     fall, hw,hh + hit fields (+spike:{dmg,b,g,angle})
     counter  window, mult, min, b,g,angle
     reflect  window, range
     teleport dist (or behind:true), inv (+ hit fields for a strike, or pathHit{} to hit along the way)
     aura     dur, rehit, hw,hh + hit fields (+final:{dmg,b,g,angle}, pull, drain=heal per hit)
   Any hit can add burn: frames (sets the target on fire), zap: frames (stun), slow: frames (half speed).
   proj extras: child (a creature/puddle spawned where it lands or hits; an array = random pick), land (pops on
                touching ground), auto {every,max} (hold to keep firing), grow, maxSize, bounce, wave, jitter
   aura extras: pull < 0 pushes enemies away, reflect: true bounces projectiles back, slow, fx
   teleport extras: rewind (frames back in time), heal
     buff     dur, power, speed

   ultimate (optional, used after breaking the Ultimate Orb):
     name, desc, theme ('dragon','jungle','slash','tech','holy','ice' or anything else for a plain one),
     colors [dark, main, accent], hits + dmg (small hits), final {dmg,b,g,angle} (the big finishing hit), freeze
   Hitbox fields hx,hy,hw,hh are in units of the fighter's width/height.
   b = base knockback, g = knockback growth with damage, angle in degrees.
   ===================================================================== */

const ROSTER = [
  {
    id: 'titan', name: 'Titan Ape', title: 'Jungle wrecking ball',
    stats: { power: 10, speed: 8, weight: 10, jump: 6, defense: 9, skill: 4 },
    look: { build: 'bulky', body: '#3d312e', skin: '#b58d69', accent: '#d9483b', extra: ['ape'] },
    passive: 'Super armor while winding up punches and rushes, so small hits can’t stop him.',
    strongVs: ['zephyr', 'nova'], weakVs: ['tseng', 'mira'],
    ultimate: { kind: 'avalanche', style: 'boulder', name: 'Jungle Juggernaut', desc: 'Curl into a giant boulder and roll for up to 4 seconds. Steer left/right; the moment you slam into a rival the roll stops and they go flying. Stops by itself at the edge of a platform. Jump or shield to dodge it.', theme: 'jungle', colors: ['#0f2a17', '#6dbb4a', '#d9483b'], hit: { dmg: 12, b: 10, g: 1.0, angle: 40 } },
    specials: {
      neutral: { name: 'Mega Punch', desc: 'Hold to charge a ground-shaking punch. Super armor while winding up.', kind: 'melee',
        dmg: 15, b: 8.5, g: 1.3, angle: 32, startup: 13, active: 6, end: 19, hx: 1.25, hy: 0.6, hw: 1.5, hh: 0.45, charge: 70, armor: true, lunge: 3 },
      side: { name: 'Gorilla Rush', desc: 'Barrel forward shoulder-first and bulldoze anyone in the way.', kind: 'dash',
        dmg: 12, b: 7, g: 0.95, angle: 30, startup: 7, dur: 22, vx: 14, end: 12, hx: 0.6, hy: 0.5, hw: 1.1, hh: 0.8, armor: true },
      up: { name: 'Titan Leap', desc: 'A towering jump that uppercuts anyone above.', kind: 'leap',
        vy: 20, vx: 3.5, dmg: 11, b: 7, g: 0.85, angle: 80, startup: 5, active: 14, hx: 0.2, hy: 1.0, hw: 1.4, hh: 0.7 },
      down: { name: 'Earthquake Slam', desc: 'Pound the ground (or plunge from the air) and send a shockwave both ways.', kind: 'slam',
        fall: 24, dmg: 14, b: 7.5, g: 1.05, angle: 70, startup: 9, end: 16, hw: 4.4, hh: 0.5, spike: { dmg: 8, b: 5, g: 0.6, angle: -80 } }
    }
  },
  {
    id: 'tseng', name: 'Mr. Tseng', title: 'Ancient master of the heavens',
    stats: { power: 8, speed: 7, weight: 6, jump: 8, defense: 6, skill: 7 },
    look: { build: 'normal', body: '#ece0c4', skin: '#e3bd95', accent: '#c62f2a', hair: '#f5f5f5', extra: ['robe', 'beard', 'topknot'] },
    passive: 'Cloud Walk lets him fly anywhere for 5 seconds, once per trip into the air.',
    strongVs: ['titan', 'rivet'], weakVs: ['zephyr', 'nova'],
    ultimate: { style: 'dragon', kind: 'close', name: 'Heavenly Dragon Emperor', desc: 'A golden dragon coils around the target, carries them into the sky and hurls them.', theme: 'dragon', colors: ['#7a0a0a', '#d4a017', '#ff3b30'], hits: 6, dmg: 4, final: { dmg: 20, b: 13, g: 1.45, angle: 60 } },
    specials: {
      neutral: { name: 'Qi Orb', desc: 'Push a sphere of golden qi that passes through enemies.', kind: 'proj',
        dmg: 9, b: 4, g: 0.6, angle: 35, startup: 12, end: 18, speed: 7, life: 80, size: 20, shape: 'orb', color: '#ffd35c', max: 2, pierce: true },
      side: { name: 'Heaven Palm', desc: 'A super punch filled with divine power that sends people flying.', kind: 'melee',
        dmg: 16, b: 10, g: 1.35, angle: 28, startup: 13, active: 4, end: 26, hx: 1.2, hy: 0.6, hw: 1.3, hh: 0.5, lunge: 5, fx: 'palm' },
      up: { name: 'Cloud Walk', desc: 'Summon a cloud and fly freely for 5 seconds. You can still attack while flying.', kind: 'fly',
        dur: 300, speed: 6.5, startup: 6, fx: 'cloud' },
      down: { name: 'Mirror of the Sage', desc: 'Read the attack. If hit during the stance, strike back 1.6× harder.', kind: 'counter',
        window: 24, startup: 3, end: 20, mult: 1.6, min: 10, b: 8, g: 1.1, angle: 40 }
    }
  },
  {
    id: 'zephyr', name: 'Zephyr', title: 'Wind-step ninja',
    stats: { power: 4, speed: 10, weight: 3, jump: 9, defense: 3, skill: 9 },
    look: { build: 'slim', body: '#252a4d', skin: '#e6b98f', accent: '#34d1bf', extra: ['ninja'] },
    passive: 'Triple jump and the fastest run in the game, but light and easy to launch.',
    strongVs: ['rivet', 'mira'], weakVs: ['titan', 'nova'],
    ultimate: { style: 'slash', kind: 'close', name: 'Thousand Wind Cuts', desc: 'Vanishes and slashes the target from every side, knocking them around, then one last cut.', theme: 'slash', colors: ['#06101c', '#34d1bf', '#e6ecff'], hits: 12, dmg: 2.5, final: { dmg: 14, b: 12, g: 1.3, angle: 45 } },
    specials: {
      neutral: { name: 'Shuriken', desc: 'Flick a fast throwing star. Weak, but three can be out at once.', kind: 'proj',
        dmg: 4, b: 2.5, g: 0.25, angle: 20, startup: 5, end: 9, speed: 15, life: 45, size: 10, shape: 'star', color: '#e6ecff', max: 3 },
      side: { name: 'Shadow Step', desc: 'Vanish and reappear behind the closest enemy with a slash.', kind: 'teleport',
        behind: true, startup: 5, inv: 14, dmg: 8, b: 6, g: 0.8, angle: 40, active: 5, end: 14, hx: 0.9, hy: 0.55, hw: 1.3, hh: 0.5 },
      up: { name: 'Whirlwind', desc: 'Spin upward inside a tornado, hitting several times.', kind: 'leap',
        vy: 17, vx: 4, dmg: 3, b: 3, g: 0.3, angle: 85, rehit: 5, startup: 5, active: 20, hx: 0, hy: 0.6, hw: 1.8, hh: 1.4, finalB: 7, pose: 'spin' },
      down: { name: 'Smoke Bomb', desc: 'Poof backward in a cloud of smoke, untouchable for a moment.', kind: 'teleport',
        dist: -190, startup: 4, inv: 30, end: 10 }
    }
  },
  {
    id: 'rivet', name: 'Rivet', title: 'Scrapyard siege robot',
    stats: { power: 6, speed: 4, weight: 8, jump: 4, defense: 7, skill: 5 },
    look: { build: 'normal', body: '#8a95a8', skin: '#6d778a', accent: '#ff8a1f', extra: ['robot'] },
    passive: 'Controls space from far away with lasers, rockets and mines.',
    strongVs: ['titan', 'tseng'], weakVs: ['zephyr', 'nova'],
    ultimate: { style: 'beams', kind: 'aim', name: 'Orbital Strike', desc: 'Satellite lasers rain on the circle. Get out fast and some of them miss.', theme: 'tech', colors: ['#1a1006', '#ff8a1f', '#ff3b3b'], hits: 4, dmg: 5, final: { dmg: 18, b: 12, g: 1.35, angle: 88 } },
    specials: {
      neutral: { name: 'Arm Laser', desc: 'A long, fast laser bolt.', kind: 'proj',
        dmg: 6, b: 3, g: 0.4, angle: 15, startup: 10, end: 14, speed: 18, life: 50, size: 8, shape: 'laser', color: '#ff5a3c', max: 2 },
      side: { name: 'Rocket Fist', desc: 'Launch a heavy fist that flies straight and hits hard.', kind: 'proj',
        dmg: 12, b: 6, g: 1.0, angle: 30, startup: 16, end: 22, speed: 9, life: 70, size: 18, shape: 'fist', color: '#ff8a1f', max: 1 },
      up: { name: 'Jetpack', desc: 'Hover on thrusters for just over a second.', kind: 'fly',
        dur: 75, speed: 6, startup: 4, fx: 'jet' },
      down: { name: 'Proximity Mine', desc: 'Drop a mine that explodes when an enemy gets close.', kind: 'proj',
        dmg: 13, b: 7, g: 0.9, angle: 80, startup: 8, end: 12, speed: 0, grav: 0.6, life: 900, size: 12, shape: 'mine', color: '#ffdb3a', max: 2, mine: true }
    }
  },
  {
    id: 'nova', name: 'Dame Aurelia', title: 'Mirror-shield knight',
    stats: { power: 7, speed: 6, weight: 7, jump: 6, defense: 9, skill: 4 },
    look: { build: 'normal', body: '#c9d2e3', skin: '#f0c9a8', accent: '#3a6bd6', hair: '#e8c35a', extra: ['knight'] },
    passive: 'Best defense in the game. Her Mirror Shield sends projectiles back, faster.',
    strongVs: ['rivet', 'tseng', 'mira'], weakVs: ['titan'],
    ultimate: { style: 'pillars', kind: 'all', name: 'Judgment of Light', desc: 'Pillars of holy light rise under the target and launch them straight up.', theme: 'holy', colors: ['#0e1a4a', '#ffd35c', '#ffffff'], hits: 5, dmg: 4, final: { dmg: 19, b: 12, g: 1.4, angle: 70 } },
    specials: {
      neutral: { name: 'Crescent Slash', desc: 'Hold to charge a wide sword arc with long reach.', kind: 'melee',
        dmg: 10, b: 6, g: 1.05, angle: 38, startup: 12, active: 6, end: 20, hx: 1.3, hy: 0.6, hw: 1.9, hh: 0.9, charge: 50, fx: 'arc' },
      side: { name: 'Lance Charge', desc: 'Dash forward behind a lance.', kind: 'dash',
        dmg: 9, b: 6, g: 0.85, angle: 25, startup: 10, dur: 18, vx: 12, end: 18, hx: 1.1, hy: 0.55, hw: 1.4, hh: 0.35 },
      up: { name: 'Rising Blade', desc: 'Leap up with a spinning sword.', kind: 'leap',
        vy: 17, vx: 2, dmg: 8, b: 6, g: 0.75, angle: 85, startup: 5, active: 12, hx: 0.3, hy: 1.0, hw: 1.3, hh: 0.9 },
      down: { name: 'Mirror Shield', desc: 'Raise a polished shield that reflects projectiles back.', kind: 'reflect',
        window: 30, startup: 3, end: 14, range: 1.6 }
    }
  },
  {
    id: 'mira', name: 'Mira Frost', title: 'Glacier witch',
    stats: { power: 5, speed: 5, weight: 4, jump: 7, defense: 5, skill: 8 },
    look: { build: 'slim', body: '#2d4d7a', skin: '#f3d7c4', accent: '#9fe7ff', hair: '#e9f4ff', extra: ['witch'] },
    passive: 'Press F to arm the Freeze Ray: her next Ice Shard freezes the target solid. 30-second cooldown.',
    freezeRay: { cd: 1800, freeze: 55 },
    strongVs: ['titan', 'tseng'], weakVs: ['zephyr', 'nova', 'blaze'],
    ultimate: { style: 'shatter', kind: 'all', name: 'Absolute Zero', desc: 'Freezes the target solid, then shatters the ice with a sideways blast.', theme: 'ice', colors: ['#06182e', '#9fe7ff', '#ffffff'], hits: 1, dmg: 4, freeze: true, final: { dmg: 24, b: 12, g: 1.4, angle: 80 } },
    specials: {
      neutral: { name: 'Ice Shard', desc: 'Fire an icy shard. With the Freeze Ray armed (F), it freezes whoever it hits.', kind: 'proj',
        dmg: 6, b: 3, g: 0.3, angle: 30, startup: 10, end: 16, speed: 10, life: 55, size: 12, shape: 'shard', color: '#9fe7ff', max: 1 },
      side: { name: 'Glacier Spikes', desc: 'Ice spikes race along the ground and pop enemies upward.', kind: 'proj',
        dmg: 9, b: 5, g: 0.8, angle: 80, startup: 14, end: 18, speed: 8, life: 50, size: 16, shape: 'spike', color: '#c9f3ff', max: 1, ground: true, pierce: true },
      up: { name: 'Snow Float', desc: 'Float on falling snow for two seconds.', kind: 'fly',
        dur: 120, speed: 4, startup: 5, fx: 'snow' },
      down: { name: 'Blizzard', desc: 'Whip up a storm around you that hits many times.', kind: 'aura',
        dur: 40, rehit: 6, dmg: 2, b: 2, g: 0.1, angle: 60, final: { dmg: 6, b: 7, g: 0.9, angle: 60 }, startup: 8, end: 16, hx: 0, hy: 0.5, hw: 2.8, hh: 1.4 }
    }
  },
  {
    id: 'blaze', name: 'Blaze', title: 'Inferno street fighter',
    stats: { power: 8, speed: 8, weight: 5, jump: 7, defense: 4, skill: 6 },
    look: { build: 'normal', body: '#2b1d1d', skin: '#e8b48c', accent: '#ff6a1a', hair: '#ffb02e', extra: ['flame'] },
    passive: 'Every fire attack sets enemies ablaze, so they keep taking damage while they burn.',
    strongVs: ['mira', 'titan'], weakVs: ['nova', 'rivet'],
    ultimate: { style: 'phoenix', kind: 'all', name: 'Inferno Phoenix', desc: 'A blazing phoenix dives through the target again and again and leaves them burning.', theme: 'fire', colors: ['#2a0600', '#ff6a1a', '#ffd35c'], hits: 6, dmg: 3.5, final: { dmg: 21, b: 13, g: 1.4, angle: 55 } },
    specials: {
      neutral: { name: 'Fireball', desc: 'Throw a roaring fireball that sets the target on fire.', kind: 'proj',
        dmg: 7, b: 3.5, g: 0.5, angle: 30, startup: 9, end: 14, speed: 11, life: 60, size: 20, shape: 'fire', color: '#ff7a1a', max: 2, burn: 180 },
      side: { name: 'Fire Wall', desc: 'Plant a wall of fire in front of you for 3 seconds. It burns anyone who walks through it and burns up enemy projectiles.', kind: 'proj',
        dmg: 3, b: 4.5, g: 0.35, angle: 65, startup: 12, end: 18, speed: 0, life: 180, size: 30, shape: 'firewall', color: '#ff6a1a', max: 1, ground: true, pierce: true, wall: true, rehit: 24, offset: 95, burn: 120 },
      up: { name: 'Phoenix Rise', desc: 'Spiral upward in a pillar of fire that hits again and again.', kind: 'leap',
        vy: 18, vx: 3, dmg: 3, b: 3, g: 0.3, angle: 85, rehit: 5, startup: 5, active: 22, hx: 0, hy: 0.6, hw: 1.6, hh: 1.4, finalB: 8, pose: 'spin', fx: 'fire', burn: 90 },
      down: { name: 'Eruption', desc: 'Punch the ground to blast a column of fire up in front of you.', kind: 'proj',
        dmg: 12, b: 7, g: 1.05, angle: 85, startup: 16, end: 18, speed: 0, life: 36, size: 34, shape: 'pillar', color: '#ff6a1a', max: 1, ground: true, pierce: true, tall: true, offset: 110, burn: 150 }
    }
  },
  {
    id: 'volt', name: 'Volt', title: 'Storm-charged striker',
    stats: { power: 6, speed: 9, weight: 4, jump: 8, defense: 4, skill: 8 },
    look: { build: 'slim', body: '#1b2440', skin: '#d9b08c', accent: '#ffe14a', hair: '#fff38a', extra: ['storm'] },
    passive: 'Has the fastest projectile in the game and can call lightning down on enemies from the sky.',
    strongVs: ['rivet', 'titan'], weakVs: ['nova', 'nyx'],
    ultimate: { style: 'chain', kind: 'all', name: 'Chain Lightning', desc: 'No aiming: a bolt leaps from Volt to every enemy in a chain, shocks them again and again, then one huge thunderclap.', theme: 'storm', colors: ['#070a1c', '#ffe14a', '#7ad7ff'], hits: 8, dmg: 2.2, final: { dmg: 19, b: 13, g: 1.4, angle: 80 } },
    specials: {
      neutral: { name: 'Thunderbolt', desc: 'Fire a crackling bolt that flies faster than any other projectile.', kind: 'proj',
        dmg: 5, b: 3, g: 0.35, angle: 20, startup: 6, end: 10, speed: 22, life: 34, size: 12, shape: 'bolt', color: '#ffe14a', max: 2, pierce: true },
      side: { name: 'Flash Step', desc: 'Become lightning and zip forward, shocking everyone along the path.', kind: 'teleport',
        dist: 230, startup: 6, inv: 12, end: 14, pathHit: { dmg: 8, b: 6, g: 0.8, angle: 35 } },
      up: { name: 'Storm Ascent', desc: 'Launch skyward on a bolt of lightning.', kind: 'leap',
        vy: 20, vx: 5, dmg: 7, b: 6, g: 0.75, angle: 80, startup: 4, active: 10, hx: 0.2, hy: 0.9, hw: 1.3, hh: 1.0, fx: 'bolt' },
      down: { name: 'Sky Strike', desc: 'Call a lightning strike down on the nearest enemy.', kind: 'proj',
        dmg: 13, b: 7, g: 1.05, angle: 80, startup: 18, end: 16, speed: 32, life: 40, size: 26, shape: 'strike', color: '#fff6a0', max: 1, sky: true, pierce: true }
    }
  },
  {
    id: 'nyx', name: 'Nyx', title: 'Void reaper',
    stats: { power: 7, speed: 6, weight: 6, jump: 6, defense: 5, skill: 7 },
    look: { build: 'slim', body: '#17122b', skin: '#c9c2e8', accent: '#a35cff', extra: ['reaper'] },
    passive: 'Bends space: black holes drag enemies in, and the scythe reaches farther than any other weapon.',
    strongVs: ['zephyr', 'volt'], weakVs: ['nova', 'titan'],
    ultimate: { style: 'vortex', kind: 'all', name: 'Event Horizon', desc: 'A black hole drags the target into the middle, then explodes outward.', theme: 'void', colors: ['#05020d', '#a35cff', '#e8d9ff'], hits: 6, dmg: 3.5, final: { dmg: 22, b: 13, g: 1.45, angle: 70 } },
    specials: {
      neutral: { name: 'Black Hole', desc: 'Launch a slow black hole that drags enemies in, then bursts.', kind: 'proj',
        dmg: 2, b: 1.5, g: 0.1, angle: 50, startup: 14, end: 18, speed: 2.6, life: 110, size: 30, shape: 'void', color: '#a35cff', max: 1, pierce: true, rehit: 12, pull: 0.38, pullR: 220,
        burst: { dmg: 9, b: 6.5, g: 0.85, angle: 65, r: 120 } },
      side: { name: "Reaper's Arc", desc: 'A huge scythe sweep with the longest reach in the game.', kind: 'melee',
        dmg: 12, b: 7, g: 1.1, angle: 40, startup: 12, active: 5, end: 22, hx: 1.45, hy: 0.6, hw: 2.3, hh: 0.9, lunge: 3, fx: 'scythe' },
      up: { name: 'Shadow Wings', desc: 'Spread wings of shadow and glide freely for 2.5 seconds.', kind: 'fly',
        dur: 150, speed: 5.5, startup: 5, fx: 'wings' },
      down: { name: 'Soul Drain', desc: 'Pull nearby enemies in and drain them, healing some of your own damage.', kind: 'aura',
        dur: 36, rehit: 6, dmg: 2, b: 1.5, g: 0.1, angle: 60, pull: 0.5, drain: 1.5, final: { dmg: 6, b: 7, g: 0.9, angle: 55 }, startup: 8, end: 18, hx: 0, hy: 0.5, hw: 3.0, hh: 1.5 }
    }
  },
  {
    id: 'rowan', name: 'Rowan', title: 'Wildwood ranger',
    stats: { power: 6, speed: 7, weight: 5, jump: 7, defense: 5, skill: 7 },
    look: { build: 'normal', body: '#4a5d2a', skin: '#c98e62', accent: '#b5412b', hair: '#7a3f1d', legs: '#5a3b22', extra: ['archer'] },
    passive: 'The best range in the game: charge arrows until they pierce, rain them from the sky, or plant a blast arrow.',
    strongVs: ['nyx', 'tseng'], weakVs: ['zephyr', 'nova'],
    ultimate: { style: 'snare', kind: 'aim', name: "Hunter's Snare", desc: 'Aim the circle. Vines and a net trap whoever is inside so they can’t escape, then one giant glowing arrow pierces them.', theme: 'arrows', colors: ['#10180a', '#9bc45a', '#f2e3b3'], hits: 5, dmg: 3.2, final: { dmg: 18, b: 12.5, g: 1.35, angle: 50 } },
    specials: {
      neutral: { name: 'Power Shot', desc: 'Hold to draw the bow further. A full draw fires a glowing arrow that pierces.', kind: 'proj',
        dmg: 7, b: 3.2, g: 0.55, angle: 20, startup: 10, end: 12, speed: 16, life: 55, size: 14, shape: 'arrow', color: '#e8d9b0', max: 3, charge: 50, chargeMul: 1.4 },
      side: { name: 'Arrow Rain', desc: 'Fire a volley into the sky that rains arrows down in front of you.', kind: 'proj',
        dmg: 4, b: 2.5, g: 0.35, angle: 60, startup: 16, end: 20, speed: 17, life: 60, size: 12, shape: 'arrow', color: '#e8d9b0', max: 6, rain: { n: 6, first: 90, gap: 45, height: 480 } },
      up: { name: 'Grapple Arrow', desc: 'Shoot a rope arrow upward and zip up after it.', kind: 'leap',
        vy: 19, vx: 4, dmg: 5, b: 5, g: 0.6, angle: 75, startup: 5, active: 10, hx: 0.2, hy: 1.0, hw: 1.1, hh: 0.8, fx: 'rope' },
      down: { name: 'Blast Arrow', desc: 'Lob an arrow that sticks where it lands, then explodes.', kind: 'proj',
        dmg: 11, b: 7, g: 1.0, angle: 70, startup: 12, end: 16, speed: 11, aim: 32, grav: 0.4, life: 240, size: 14, shape: 'arrowbomb', color: '#ff5a3c', max: 1, fuse: 45 }
    }
  },
  {
    id: 'ulfgar', name: 'Ulfgar', title: 'Thunder god of the northern storms',
    stats: { power: 8, speed: 5, weight: 8, jump: 5, defense: 6, skill: 5 },
    look: { build: 'bulky', body: '#6b7c86', skin: '#ecccab', accent: '#2fd6ff', hair: '#eef2f5', cape: '#1f4e5f', metal: '#c08a3e', extra: ['thunder'] },
    passive: 'His hammer always flies back to his hand, and his thunder splits the sky. Heavy and hard to launch.',
    strongVs: ['nyx', 'blaze'], weakVs: ['zephyr', 'rowan'],
    ultimate: { style: 'hammer', kind: 'close', name: 'Hammer of the Heavens', desc: 'One giant hammer of lightning crashes down. Slow, but it hits the hardest.', theme: 'thunder', colors: ['#041018', '#2fd6ff', '#eef2f5'], hits: 4, dmg: 5, final: { dmg: 23, b: 13.5, g: 1.45, angle: 80 } },
    specials: {
      neutral: { name: 'Thunder Spear', desc: 'Hurl a spear of pure lightning that pierces through enemies.', kind: 'proj',
        dmg: 7, b: 4.2, g: 0.75, angle: 30, startup: 17, end: 20, speed: 14, life: 45, size: 22, shape: 'javelin', color: '#9ff0ff', max: 1, pierce: true },
      side: { name: 'Storm Hammer', desc: 'Throw the hammer. It hits on the way out and again on the way back.', kind: 'proj',
        dmg: 8, b: 5.5, g: 0.8, angle: 35, startup: 14, end: 18, speed: 13, life: 110, size: 28, shape: 'hammer', color: '#2fd6ff', max: 1, pierce: true, returns: true, turn: 26 },
      up: { name: 'Hammer Cyclone', desc: 'Spin the hammer overhead and rise in a crackling storm.', kind: 'leap',
        vy: 17, vx: 3, dmg: 3, b: 3, g: 0.3, angle: 85, rehit: 6, startup: 6, active: 24, hx: 0, hy: 0.7, hw: 1.8, hh: 1.3, finalB: 8, pose: 'spin', fx: 'thunder' },
      down: { name: 'Thunder Call', desc: 'Raise the hammer and call three giant thunderbolts down around you.', kind: 'proj',
        dmg: 9, b: 6, g: 0.85, angle: 75, startup: 24, end: 26, speed: 34, life: 40, size: 26, shape: 'tstrike', color: '#2fd6ff', max: 3, pierce: true, skyFx: 'tzap', rain: { n: 3, first: -170, gap: 170, height: 520 } }
    }
  },
  {
    id: 'talon', name: 'Talon', title: 'Emerald sky warden',
    stats: { power: 6, speed: 8, weight: 4, jump: 10, defense: 5, skill: 6 },
    jumps: 5,
    look: { build: 'slim', body: '#1f8a5b', skin: '#f2c14e', accent: '#f28b2c', hair: '#8be06a', legs: '#e0a93a', belly: '#e9f5d0', extra: ['bird'] },
    passive: 'Five mid-air jumps and the longest flight in the game: Soar lasts 7 seconds.',
    strongVs: ['titan', 'ulfgar'], weakVs: ['volt', 'rowan'],
    ultimate: { style: 'tornado', kind: 'close', name: 'Emerald Tempest', desc: 'A tornado of leaves spins the target up and flings them in a random direction.', theme: 'leaf', colors: ['#04160d', '#3fcf7a', '#f2e36b'], hits: 9, dmg: 2.5, final: { dmg: 18, b: 13, g: 1.4, angle: 88 } },
    specials: {
      neutral: { name: 'Leaf Tornado', desc: 'Send out a tornado of leaves that carries enemies up, then bursts.', kind: 'proj',
        dmg: 3, b: 3.4, g: 0.2, angle: 88, startup: 10, end: 14, speed: 5, life: 90, size: 36, shape: 'leafnado', color: '#6fd35a', max: 1, pierce: true, rehit: 9, tall: true, yoff: 18,
        burst: { dmg: 7, b: 8, g: 1.0, angle: 85, r: 95, fx: 'leafburst' } },
      side: { name: 'Sky Snatch', desc: 'Swoop forward, catch the first enemy in your talons and fling them behind you.', kind: 'dash',
        dmg: 9, b: 7.5, g: 0.85, angle: 55, startup: 6, dur: 16, vx: 13.5, end: 14, hx: 0.6, hy: 0.5, hw: 1.2, hh: 0.8, fx: 'feathers', fling: true },
      up: { name: 'Soar', desc: 'Spread the wings and fly anywhere for 7 seconds.', kind: 'fly',
        dur: 420, speed: 7.5, startup: 3, fx: 'birdwings' },
      down: { name: 'Feather Fan', desc: 'Flick three razor feathers in a spread.', kind: 'proj',
        dmg: 5, b: 3.5, g: 0.5, angle: 35, startup: 7, end: 12, speed: 15, life: 42, size: 14, shape: 'feather', color: '#f28b2c', max: 3, spread: [-12, 8, 28] }
    }
  },
  {
    id: 'chui', name: 'Mr. Chiu', title: 'Tide-tamer mentor',
    stats: { power: 6, speed: 6, weight: 6, jump: 6, defense: 6, skill: 7 },
    look: { build: 'normal', body: '#1d5f8a', skin: '#e2b48f', accent: '#3fe0d0', hair: '#2a1d18', legs: '#2b3446', extra: ['tamer'] },
    passive: 'A summoner: every special throws a Tide Orb that releases a creature to fight for him. His partner is a shark.',
    strongVs: ['blaze', 'titan'], weakVs: ['volt', 'rowan'],
    ultimate: { style: 'sharks', kind: 'all', name: 'Megalodon Tide', desc: 'A school of sharks charges in from both sides, then a giant shark launches the target. Tough targets can survive it.', theme: 'ocean', colors: ['#021a2e', '#1fa3d6', '#bff6ff'], hits: 6, dmg: 3.5, final: { dmg: 21, b: 13, g: 1.4, angle: 70 } },
    specials: {
      neutral: { name: 'Shark Summon', desc: 'Lob a Tide Orb. Where it lands (or hits), a shark bursts out and charges forward, biting again and again.', kind: 'proj',
        dmg: 3, b: 2, g: 0.2, angle: 40, startup: 10, end: 16, speed: 10, aim: 28, grav: 0.45, life: 70, size: 16, shape: 'capture', color: '#3fe0d0', max: 1, land: true,
        child: { dmg: 3.6, b: 3.4, g: 0.45, angle: 38, speed: 7, life: 62, size: 38, shape: 'shark', color: '#5d8fb0', pierce: true, rehit: 13, yoff: -18, finalB: true } },
      side: { name: 'Volt Eel', desc: 'Fling a Tide Orb straight ahead. It pops open into an electric eel that stuns whoever it touches.', kind: 'proj',
        dmg: 2, b: 1.5, g: 0.1, angle: 30, startup: 9, end: 16, speed: 15, life: 15, size: 14, shape: 'capture', color: '#ffe14a', max: 1,
        child: { dmg: 5, b: 2.5, g: 0.3, angle: 35, speed: 9, life: 48, size: 26, shape: 'eel', color: '#ffe14a', wave: 2.6, zap: 42 } },
      up: { name: 'Sky Ray', desc: 'Summon a manta ray and ride it through the air for 2.5 seconds.', kind: 'fly',
        dur: 150, speed: 5.8, startup: 5, fx: 'manta' },
      down: { name: 'Mind Spirit', desc: 'A psychic spirit appears, shoves everyone away and bounces back projectiles.', kind: 'aura',
        dur: 34, rehit: 9, dmg: 2.5, b: 2.5, g: 0.15, angle: 45, pull: -1.15, reflect: true, fx: 'mindwisp', final: { dmg: 7, b: 8, g: 1.0, angle: 45 }, startup: 8, end: 18, hx: 0, hy: 0.5, hw: 3.0, hh: 1.6 }
    }
  },
  {
    id: 'guo', name: 'Mr. Guo', title: 'Phantom agent',
    stats: { power: 5, speed: 8, weight: 4, jump: 7, defense: 4, skill: 8 },
    look: { build: 'slim', body: '#2a2d34', skin: '#e8c19c', accent: '#e8354a', hair: '#151515', legs: '#3a3f4a', extra: ['agent'] },
    passive: 'Hold the special button to keep firing the Ghostor. He can shoot, throw daggers and knife people while hovering.',
    strongVs: ['rowan', 'nyx'], weakVs: ['nova', 'titan'],
    ultimate: { style: 'snipe', kind: 'aim', aim: 'scope', name: 'Phantom Sniper', desc: 'Look down a sniper scope (the rest of the screen goes dark). Three precise shots, each one pushing the target back.', theme: 'tactical', colors: ['#0a0c12', '#e8354a', '#f2f4f8'], hits: 3, dmg: 8.4, final: { dmg: 17, b: 12.5, g: 1.35, angle: 40 } },
    specials: {
      neutral: { name: 'Ghostor', desc: 'A silenced pistol that fires really fast. Hold the button to keep shooting (up to 8 shots).', kind: 'proj',
        dmg: 2.1, b: 1.6, g: 0.12, angle: 18, startup: 5, end: 10, speed: 26, life: 26, size: 8, shape: 'bullet', color: '#ffe9a8', max: 8, jitter: 1.2, auto: { every: 6, max: 8 } },
      side: { name: 'Dagger Fan', desc: 'Throw three glowing daggers in a spread.', kind: 'proj',
        dmg: 4, b: 3.2, g: 0.45, angle: 30, startup: 8, end: 14, speed: 19, life: 36, size: 14, shape: 'dagger', color: '#9ff2ff', max: 3, spread: [-6, 3, 12] },
      up: { name: 'Updraft Hover', desc: 'Jump on a gust and hover for a moment. You can still shoot and throw while hovering.', kind: 'fly',
        dur: 85, speed: 5.2, startup: 3, fx: 'hover' },
      down: { name: 'Combat Knife', desc: 'Pull the knife and lunge with a lightning-fast slash.', kind: 'melee',
        dmg: 8.5, b: 6, g: 0.9, angle: 35, startup: 4, active: 4, end: 13, hx: 1.0, hy: 0.55, hw: 1.3, hh: 0.45, lunge: 8, fx: 'knife' }
    }
  },
  {
    id: 'echo', name: 'Echo', title: 'Bass-drop DJ',
    stats: { power: 6, speed: 7, weight: 5, jump: 7, defense: 5, skill: 6 },
    look: { build: 'normal', body: '#1b1033', skin: '#a8734f', accent: '#ff3df0', hair: '#18ffd1', legs: '#241640', extra: ['dj'] },
    passive: 'Sound waves grow bigger the farther they travel, and the Bass Drop blasts everyone away.',
    strongVs: ['zephyr', 'kiro'], weakVs: ['nova', 'guo'],
    ultimate: { style: 'encore', kind: 'all', name: 'Final Encore', desc: 'The speakers blast the target left and right to the beat, then the final chord.', theme: 'concert', colors: ['#0b0420', '#ff3df0', '#18ffd1'], hits: 8, dmg: 3, final: { dmg: 20, b: 13, g: 1.4, angle: 60 } },
    specials: {
      neutral: { name: 'Sound Wave', desc: 'Send out a ring of sound that gets bigger as it travels and passes through enemies.', kind: 'proj',
        dmg: 7, b: 4.2, g: 0.62, angle: 30, startup: 10, end: 16, speed: 7.5, life: 58, size: 18, shape: 'soundwave', color: '#18ffd1', max: 1, pierce: true, grow: 0.9, maxSize: 64 },
      side: { name: 'Beat Dash', desc: 'Slide forward to the beat, hitting three times.', kind: 'dash',
        dmg: 3.5, b: 3, g: 0.3, angle: 40, rehit: 6, finalB: 7, startup: 6, dur: 20, vx: 12, end: 14, hx: 0.6, hy: 0.5, hw: 1.3, hh: 0.8, fx: 'beat' },
      up: { name: 'Speaker Launch', desc: 'Drop a speaker and get blasted into the sky. The blast hits anyone below.', kind: 'leap',
        vy: 19, vx: 3, dmg: 9, b: 6.5, g: 0.8, angle: 70, startup: 7, active: 8, hx: 0, hy: 0.1, hw: 2.0, hh: 0.8, fx: 'speaker' },
      down: { name: 'Bass Drop', desc: 'Drop the bass. Shock rings push everyone away, then a huge thump.', kind: 'aura',
        dur: 30, rehit: 10, dmg: 2, b: 2, g: 0.1, angle: 50, pull: -1.4, fx: 'bass', final: { dmg: 9, b: 8.5, g: 1.05, angle: 50 }, startup: 10, end: 18, hx: 0, hy: 0.4, hw: 3.4, hh: 1.4 }
    }
  },
  {
    id: 'kiro', name: 'Kiro', title: 'Clockwork time-bender',
    stats: { power: 6, speed: 6, weight: 5, jump: 7, defense: 6, skill: 9 },
    look: { build: 'normal', body: '#4a3426', skin: '#e9c7a6', accent: '#e6b84a', hair: '#d8d8e0', legs: '#2e2219', extra: ['clock'] },
    passive: 'Bends time: Rewind sends him back to where he was a second ago and undoes some damage, and the Time Field slows enemies down.',
    strongVs: ['blaze', 'volt'], weakVs: ['zephyr', 'echo'],
    ultimate: { style: 'clock', kind: 'all', name: 'Stopped Clock', desc: 'Freezes time. Every hit is stored up, then they all land at once.', theme: 'clock', colors: ['#120d06', '#e6b84a', '#fff4d6'], hits: 1, dmg: 4, freeze: true, final: { dmg: 23, b: 13, g: 1.42, angle: 65 } },
    specials: {
      neutral: { name: 'Bouncing Gear', desc: 'Toss a spinning gear that bounces along the ground three times.', kind: 'proj',
        dmg: 6, b: 4, g: 0.55, angle: 45, startup: 9, end: 14, speed: 8.5, aim: 18, grav: 0.5, life: 110, size: 20, shape: 'gear', color: '#e6b84a', max: 2, bounce: 3 },
      side: { name: 'Rewind', desc: 'Jump back to where you were one second ago and undo up to 8% damage. Great for escaping.', kind: 'teleport',
        rewind: 55, heal: 8, startup: 6, inv: 16, end: 12 },
      up: { name: 'Spring Coil', desc: 'Pop up on a giant spring and kick anyone above.', kind: 'leap',
        vy: 20, vx: 3, dmg: 7, b: 6, g: 0.75, angle: 82, startup: 4, active: 10, hx: 0.1, hy: 1.0, hw: 1.2, hh: 0.8, fx: 'spring' },
      down: { name: 'Time Field', desc: 'Open a field of slow time. Enemies caught inside move at half speed for a while.', kind: 'aura',
        dur: 40, rehit: 12, dmg: 2, b: 1.2, g: 0.05, angle: 60, slow: 100, fx: 'clockfield', startup: 8, end: 16, hx: 0, hy: 0.5, hw: 3.4, hh: 1.8 }
    }
  },
  {
    id: 'lumi', name: 'Lumi', title: 'Fizzy potion alchemist',
    stats: { power: 5, speed: 7, weight: 3, jump: 8, defense: 5, skill: 7 },
    look: { build: 'small', body: '#f3f0e6', skin: '#f1cdb0', accent: '#7cff6b', hair: '#ff7ab8', legs: '#54446e', extra: ['alchemist'] },
    passive: 'Every potion is a surprise: fire burns, frost freezes and toxic slows. Small and floaty.',
    strongVs: ['titan', 'ulfgar'], weakVs: ['zephyr', 'guo'],
    ultimate: { style: 'elixir', kind: 'close', name: 'Grand Elixir', desc: 'A giant cauldron splashes the target with poison that slows and burns them.', theme: 'alchemy', colors: ['#0d1a10', '#7cff6b', '#ff7ab8'], hits: 7, dmg: 3, final: { dmg: 20, b: 13, g: 1.4, angle: 80 } },
    specials: {
      neutral: { name: 'Mystery Potion', desc: 'Lob a random potion. It smashes into a puddle of fire (burns), frost (freezes) or toxic goo (slows).', kind: 'proj',
        dmg: 4, b: 2.5, g: 0.3, angle: 50, startup: 9, end: 15, speed: 10, aim: 35, grav: 0.45, life: 80, size: 14, shape: 'potion', color: '#7cff6b', max: 2, land: true,
        child: [
          { dmg: 3, b: 2.5, g: 0.2, angle: 80, speed: 0, life: 200, size: 64, shape: 'puddle', color: '#ff7a1a', ground: true, pierce: true, rehit: 36, burn: 120 },
          { dmg: 3, b: 2, g: 0.15, angle: 80, speed: 0, life: 200, size: 64, shape: 'puddle', color: '#9fe7ff', ground: true, pierce: true, rehit: 50, freeze: 22 },
          { dmg: 3, b: 2.5, g: 0.2, angle: 80, speed: 0, life: 200, size: 64, shape: 'puddle', color: '#7cff6b', ground: true, pierce: true, rehit: 36, slow: 90 }
        ] },
      side: { name: 'Bubble Trap', desc: 'Blow a big fizzy bubble that floats forward. Whoever it touches is trapped inside and floats up for a second, then it pops.', kind: 'proj',
        dmg: 3, b: 0, g: 0, angle: 90, bubble: 55, startup: 10, end: 16, speed: 4.5, life: 100, size: 36, shape: 'bubble', color: '#bff3ff', max: 1, wave: 0.9 },
      up: { name: 'Balloon Brew', desc: 'Drink a floaty potion and drift around on a balloon for 2 seconds.', kind: 'fly',
        dur: 125, speed: 4.6, startup: 4, fx: 'balloon' },
      down: { name: 'Explosive Flask', desc: 'Lob a bubbling flask that sticks where it lands and explodes.', kind: 'proj',
        dmg: 12, b: 7, g: 1.0, angle: 70, startup: 11, end: 16, speed: 9, aim: 48, grav: 0.45, life: 240, size: 14, shape: 'flask', color: '#ff7ab8', max: 1, fuse: 45 }
    }
  },
  {
    id: 'chuang', name: 'Master Chuang', title: 'Shutter-speed photographer', legend: true, locked: true,
    stats: { power: 8, speed: 8, weight: 6, jump: 8, defense: 6, skill: 8 },
    look: { build: 'normal', body: '#6b5638', skin: '#e5bf98', accent: '#ffd84a', hair: '#2a211b', legs: '#2f3340', extra: ['photo'] },
    passive: 'Boss-class. His flashes dazzle (stun) anyone they catch, Film Strip fires five photos, and two Photo Traps can be set at once.',
    strongVs: ['guo', 'zephyr'], weakVs: ['titan', 'hsi'],
    ultimate: { style: 'photo', kind: 'aim', aim: 'frame', name: 'Final Exposure', desc: 'Aim a camera viewfinder. Snap! Whoever is in the frame is frozen inside a giant polaroid while the flashes hit, then the photo bursts.', theme: 'photo', colors: ['#0c0b10', '#ffd84a', '#ffffff'], hits: 6, dmg: 3.2, final: { dmg: 21, b: 13.2, g: 1.42, angle: 55 } },
    specials: {
      neutral: { name: 'Flash Burst', desc: 'Pop the camera flash in front of you. Short range, but it dazzles whoever it catches.', kind: 'proj',
        dmg: 6, b: 4, g: 0.45, angle: 30, startup: 7, end: 17, speed: 14, life: 15, size: 34, shape: 'flash', color: '#fff6c8', max: 1, pierce: true, grow: 3.5, maxSize: 74, zap: 17, flash: true },
      side: { name: 'Film Strip', desc: 'Fling five razor-sharp photos in a wide spread.', kind: 'proj',
        dmg: 4.5, b: 3.4, g: 0.45, angle: 30, startup: 8, end: 14, speed: 18, life: 34, size: 15, shape: 'photo', color: '#ffffff', max: 5, spread: [-16, -8, 0, 8, 16] },
      up: { name: 'Tripod Vault', desc: 'Pole-vault sky-high off his tripod, clipping anyone on the way up, then a big finishing smack.', kind: 'leap',
        vy: 21, vx: 4, dmg: 3, b: 3, g: 0.3, angle: 85, rehit: 5, startup: 4, active: 18, hx: 0.2, hy: 0.8, hw: 1.5, hh: 1.1, finalB: 8, fx: 'tripod' },
      down: { name: 'Photo Trap', desc: 'Set a camera on a mini tripod (two at once). It flashes and dazzles when an enemy walks in front of it.', kind: 'proj',
        dmg: 11, b: 7.5, g: 0.95, angle: 65, startup: 10, end: 14, speed: 0, life: 720, size: 18, shape: 'cammine', color: '#ffd84a', max: 2, mine: true, zap: 22, flash: true }
    }
  },
  {
    id: 'hsi', name: 'Mythic Hsi', title: 'Sky-walking point guard', legend: true, locked: true,
    stats: { power: 9, speed: 9, weight: 6, jump: 9, defense: 6, skill: 6 },
    look: { build: 'normal', body: '#5b2a86', skin: '#d9a87e', accent: '#ff8a1f', hair: '#1a1410', legs: '#5b2a86', extra: ['baller'] },
    passive: 'Boss-class. Triple jump, two bouncing Jump Shots at once, an Ankle Breaker crossover that trips people, and a multi-hit Alley-Oop.',
    strongVs: ['chuang', 'rowan'], weakVs: ['nova', 'kiro'],
    ultimate: { style: 'court', kind: 'close', name: 'Buzzer Beater', desc: 'Basketballs bounce the target around, then he slam-dunks them.', theme: 'court', colors: ['#1a0f06', '#ff8a1f', '#ffe2b8'], hits: 5, dmg: 3.4, final: { dmg: 21, b: 13.2, g: 1.42, angle: 70 } },
    specials: {
      neutral: { name: 'Jump Shot', desc: 'Shoot a basketball in an arc. It bounces off the floor and can hit again.', kind: 'proj',
        dmg: 8, b: 5.2, g: 0.75, angle: 45, startup: 8, end: 14, speed: 12, aim: 30, grav: 0.4, life: 120, size: 19, shape: 'ball', color: '#ff8a1f', max: 2, bounce: 3 },
      side: { name: 'Ankle Breaker', desc: 'A lightning-quick crossover right past the enemy. Whoever he passes trips and is stunned for a moment, and he ends up behind them.', kind: 'dash',
        dmg: 7, b: 2, g: 0.1, angle: 80, zap: 32, trip: true, startup: 5, dur: 16, vx: 15.5, end: 10, hx: 0.3, hy: 0.5, hw: 1.3, hh: 0.85, fx: 'dribble' },
      up: { name: 'Alley-Oop', desc: 'Sky high off one foot, swatting anyone above again and again, then a big finish.', kind: 'leap',
        vy: 22, vx: 3, dmg: 3, b: 3, g: 0.3, angle: 85, rehit: 5, startup: 4, active: 18, hx: 0.2, hy: 0.9, hw: 1.4, hh: 1.0, finalB: 8.5, fx: 'dunk' },
      down: { name: 'Posterize', desc: 'Slam down like a dunk. In the air it spikes anyone below; on the ground it sends out a shockwave.', kind: 'slam',
        fall: 27, dmg: 15, b: 8.2, g: 1.08, angle: 75, startup: 7, end: 15, hw: 4.4, hh: 0.55, armor: true, spike: { dmg: 10, b: 6, g: 0.7, angle: -80 } }
    }
  },
  {
    id: 'yen', name: 'Legend Yen', title: 'The ultra max legend', legend: true, locked: true,
    modes: ['zephyr', 'blaze', 'volt', 'chui', 'guo', 'lumi', 'kiro', 'yenlegend'],   // the last one is his own Legend style (key Y)
    stats: { power: 9, speed: 9, weight: 7, jump: 9, defense: 8, skill: 10 },
    jumps: 3,
    bonus: { pow: 1.15, dmgIn: 0.85, kb: 0.88 },   // the legend edge (not used in Boss Fight, where levels set the boss's strength)
    look: { build: 'normal', body: '#15131f', skin: '#e9c3a0', accent: '#ffd35c', hair: '#fff3c4', legs: '#24203a', extra: ['legend'] },
    passive: 'The ultra max fighter. Press Y for his own Legend style, or 1–7 to switch to the specials of Zephyr, Blaze, Volt, Mr. Chiu, Mr. Guo, Lumi or Kiro.',
    strongVs: ['titan', 'ulfgar', 'nova'], weakVs: [],
    ultimate: { style: 'legend', kind: 'all', name: 'Legend Ascension', desc: 'All seven styles strike at once in a storm of light. The strongest ultimate.', theme: 'legend', colors: ['#0b0716', '#ffd35c', '#ffffff'], hits: 7, dmg: 3.2, final: { dmg: 22, b: 13.5, g: 1.45, angle: 60 } },
    specials: null
  }
];

/* Basic attacks everyone shares (scaled by each fighter's size and power). */
const NORMALS = {
  jab:    { dmg: 3,  b: 3.2, g: 0.25, angle: 40,  startup: 3,  active: 3, end: 8,  hx: 0.85, hy: 0.58, hw: 0.9, hh: 0.32, pose: 'punch' },
  ftilt:  { dmg: 7,  b: 4.5, g: 0.72, angle: 35,  startup: 6,  active: 4, end: 14, hx: 1.05, hy: 0.55, hw: 1.25, hh: 0.38, pose: 'punch' },
  utilt:  { dmg: 6,  b: 5,   g: 0.7,  angle: 88,  startup: 5,  active: 5, end: 12, hx: 0.2,  hy: 1.05, hw: 1.2, hh: 0.55, pose: 'up' },
  dtilt:  { dmg: 5,  b: 4,   g: 0.6,  angle: 18,  startup: 4,  active: 4, end: 10, hx: 0.95, hy: 0.12, hw: 1.2, hh: 0.26, pose: 'low' },
  fsmash: { dmg: 15, b: 7,   g: 1.15, angle: 38,  startup: 14, active: 4, end: 24, hx: 1.15, hy: 0.55, hw: 1.45, hh: 0.45, pose: 'punch', charge: 45, lunge: 2 },
  usmash: { dmg: 14, b: 7,   g: 1.1,  angle: 88,  startup: 12, active: 5, end: 24, hx: 0.1,  hy: 1.2, hw: 1.4, hh: 0.65, pose: 'up', charge: 45 },
  dsmash: { dmg: 13, b: 6.5, g: 1.05, angle: 25,  startup: 11, active: 5, end: 24, hx: 0,    hy: 0.15, hw: 3.0, hh: 0.3, pose: 'split', charge: 45, sides: true },
  nair:   { dmg: 7,  b: 4,   g: 0.65, angle: 45,  startup: 4,  active: 8, end: 10, hx: 0,    hy: 0.5, hw: 2.0, hh: 1.15, pose: 'spin', sides: true },
  fair:   { dmg: 8,  b: 4.5, g: 0.8,  angle: 40,  startup: 6,  active: 4, end: 12, hx: 0.95, hy: 0.5, hw: 1.2, hh: 0.65, pose: 'punch' },
  bair:   { dmg: 10, b: 5,   g: 0.9,  angle: 140, startup: 7,  active: 4, end: 12, hx: -0.95, hy: 0.5, hw: 1.2, hh: 0.55, pose: 'back' },
  uair:   { dmg: 7,  b: 4.5, g: 0.75, angle: 88,  startup: 5,  active: 5, end: 10, hx: 0,    hy: 1.15, hw: 1.4, hh: 0.55, pose: 'up' },
  dair:   { dmg: 10, b: 3,   g: 0.7,  angle: -80, startup: 10, active: 5, end: 14, hx: 0,    hy: -0.05, hw: 1.1, hh: 0.45, pose: 'stomp' }
};

const STAGES = [
  { id: 'temple', name: 'Cloud Temple', main: { x: 500, y: 620, w: 600, h: 80 },
    plats: [{ x: 560, y: 490, w: 150 }, { x: 890, y: 490, w: 150 }, { x: 725, y: 370, w: 150 }],
    swatch: ['#1d1647', '#6b2f6e', '#f0875e'] },
  { id: 'ruins', name: 'Jungle Ruins', main: { x: 460, y: 640, w: 680, h: 90 },
    plats: [{ x: 520, y: 505, w: 170 }, { x: 910, y: 505, w: 170 }],
    swatch: ['#0d2a2b', '#1f4d3c', '#5f9a4a'] },
  { id: 'roof', name: 'Neon Rooftop', main: { x: 540, y: 610, w: 520, h: 120 },
    plats: [{ x: 400, y: 520, w: 120 }, { x: 1080, y: 520, w: 120 }, { x: 735, y: 450, w: 130 }],
    swatch: ['#07061a', '#2a1350', '#ff4fd8'] }
];
function prepStage(s) {
  const m = s.main;
  s.plats.forEach(p => { p.soft = true; });
  s.surfaces = [m, ...s.plats];
  s.blast = { l: m.x - 560, r: m.x + m.w + 560, t: m.y - 520, b: m.y + 520 };
}
STAGES.forEach(prepStage);

const SLOT_COLORS = ['#ff4d5e', '#3da5ff', '#ffc93c', '#4be08a'];
const TEAM_COLORS = ['#ff4d5e', '#3da5ff'];
const TEAM_NAMES = ['Red', 'Blue'];
const STAT_KEYS = [['power', 'Power', '#ff6b5b'], ['speed', 'Speed', '#41d3ff'], ['weight', 'Weight', '#c7a4ff'], ['jump', 'Jump', '#6fe39a'], ['defense', 'Defense', '#ffb547'], ['skill', 'Skill needed', '#ff8ad8']];

const BL = 1, BR = 2, BU = 4, BD = 8, BJ = 16, BA = 32, BS = 64, BM = 128, BH = 256, BZ = 512;
const BITS = [BL, BR, BU, BD, BJ, BA, BS, BM, BH, BZ];
const POSES = ['idle', 'run', 'jump', 'fall', 'helpless', 'land', 'hurt', 'shield', 'guard', 'roll', 'dodge', 'punch', 'up', 'low', 'split', 'spin', 'back', 'stomp', 'charge', 'dash', 'slam', 'counter', 'cast', 'cast2', 'fly', 'vanish', 'frozen', 'dizzy', 'halo', 'power', 'ledge', 'climb'];
const MOVEFX = ['fire', 'bolt', 'thunder', 'feathers', 'rope', 'scythe', 'arc', 'beat', 'fizz', 'knife', 'speaker', 'spring', 'palm', 'dribble', 'tripod', 'dunk'];
const MOVEKEYS = [...Object.keys(NORMALS), 'sp_neutral', 'sp_side', 'sp_up', 'sp_down'];
const SHAPES = ['orb', 'star', 'laser', 'fist', 'mine', 'shard', 'spike', 'fire', 'bolt', 'strike', 'void', 'pillar', 'arrow', 'arrowbomb', 'javelin', 'hammer', 'tstrike', 'leafnado', 'feather', 'capture', 'shark', 'eel', 'bullet', 'dagger', 'soundwave', 'gear', 'potion', 'puddle', 'flask', 'flash', 'photo', 'cammine', 'ball', 'firewall', 'bubble'];

/* 'random' is a pick, not a fighter: it becomes a real fighter when the battle starts */
/* fighters this player has unlocked (filled in after signing in) */
let MY_UNLOCKED = [];
function isPick(id) { return id === 'random' || (!!CHAR[id] && !CHAR[id].hidden); }
/* locked fighters (the Boss Fight bosses) can only be picked after unlocking them in Boss Fight */
function isPickable(id, unlocked) { return id === 'random' || (!!CHAR[id] && !CHAR[id].hidden && (!CHAR[id].locked || !!(unlocked && unlocked.indexOf(id) >= 0))); }
function resolvePick(id) { if (id !== 'random') return id; const pool = ROSTER.filter(c => !c.legend); return pool[Math.floor(Math.random() * pool.length)].id; }
const CHAR = {};
ROSTER.forEach(c => { CHAR[c.id] = c; });
/* Legend Yen's own style (key Y): not a fighter you can pick, just his own set of specials, the best in the game */
CHAR.yenlegend = {
  id: 'yenlegend', name: 'Legend', hidden: true, locked: true, legend: true, look: { accent: '#ffd35c' },
  specials: {
    neutral: { name: 'Legend Orb', desc: 'A big golden orb that flies through everyone in its way.', kind: 'proj',
      dmg: 13, b: 6.5, g: 0.95, angle: 35, startup: 8, end: 14, speed: 13, life: 70, size: 26, shape: 'orb', color: '#ffd35c', max: 2, pierce: true },
    side: { name: 'Golden Flash', desc: 'Flash behind the closest enemy and land a heavy golden slash.', kind: 'teleport', fx: 'legend',
      behind: true, startup: 4, inv: 16, dmg: 13, b: 7.5, g: 1.0, angle: 40, active: 6, end: 12, hx: 0.9, hy: 0.55, hw: 1.4, hh: 0.55 },
    up: { name: 'Ascension', desc: 'Rocket upward in a spinning column of light that hits again and again.', kind: 'leap', fx: 'legend',
      vy: 19, vx: 5, dmg: 3, b: 3, g: 0.3, angle: 85, rehit: 4, startup: 4, active: 22, hx: 0, hy: 0.6, hw: 2, hh: 1.5, finalB: 9, pose: 'spin' },
    down: { name: 'Legend Quake', desc: 'Slam down (or plunge from the air) and send golden shockwaves both ways.', kind: 'slam', fx: 'legend',
      fall: 28, dmg: 16, b: 8.6, g: 1.12, angle: 70, startup: 7, end: 14, hw: 5, hh: 0.55, armor: true, spike: { dmg: 11, b: 6.5, g: 0.7, angle: -80 } }
  }
};
/* Legend Yen borrows the specials of whichever style is switched on (keys 1–7, Y = his own) */
ROSTER.forEach(c => { if (c.modes) c.specials = CHAR[c.modes[0]].specials; });
function fSpecials(f) {
  const c = f.c;
  if (c.modes) { const m = CHAR[c.modes[f.yenMode | 0]]; if (m) return m.specials; }
  return c.specials;
}

const D2R = Math.PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

function physFor(c) {
  const s = c.stats;
  const size = { bulky: [74, 100], normal: [48, 86], slim: [42, 82], small: [40, 66] }[c.look.build] || [48, 86];
  return {
    W: size[0], H: size[1],
    run: 2.6 + s.speed * 0.42, air: 2.4 + s.speed * 0.28,
    jumpV: 11 + s.jump * 0.6, jumps: c.jumps || (s.jump >= 9 ? 3 : 2),
    grav: 0.5 + s.weight * 0.022, maxFall: 8.5 + s.weight * 0.35,
    wf: 1.45 - s.weight * 0.05, pm: 0.72 + s.power * 0.063, dt: 1.15 - s.defense * 0.03,
    shieldMax: 40 + s.defense * 7
  };
}
function moveDef(c, key) {
  if (!key) return null;
  return key.startsWith('sp_') ? c.specials[key.slice(3)] : NORMALS[key];
}

/* ===== Boss Fight: 30 levels in three chapters of 10. Beat a chapter's last level to unlock its boss.
   The game server reads this table, so players can't make a level easier. =====
   cpu = boss skill (10 = top CPU level, 11 = boss-only MAX brain), stocks = boss lives, pow = boss attack power,
   kb = how far the boss flies when hit (lower = heavier), dmgIn = damage the boss takes,
   minions = extra CPU helpers on the boss's team (their skill level). */
const BOSS_CHAPTERS = [
  { boss: 'yen', from: 1, to: 10, title: 'Chapter 1', blurb: 'The ultra max fighter. He switches between seven fighters’ styles.' },
  { boss: 'chuang', from: 11, to: 20, title: 'Chapter 2', blurb: 'The shutter-speed photographer. His flashes dazzle and his camera traps wait for you.' },
  { boss: 'hsi', from: 21, to: 30, title: 'Chapter 3', blurb: 'The sky-walking point guard. Triple jump, bouncing jump shots and crushing dunks.' }
];
const BOSS_ID = 'yen';
const BOSS_SIZE = 1.15;
const BOSS_PLAYER_STOCKS = 3;
const BOSS_LEVELS = [
  // chapter 1 — Legend Yen
  { name: 'Awakening',    stage: 0, cpu: 10, stocks: 1, pow: 1.10, kb: 0.95, dmgIn: 0.95, minions: [] },
  { name: 'First Light',  stage: 1, cpu: 10, stocks: 1, pow: 1.15, kb: 0.92, dmgIn: 0.92, minions: [] },
  { name: 'Rising Storm', stage: 2, cpu: 10, stocks: 2, pow: 1.20, kb: 0.88, dmgIn: 0.90, minions: [] },
  { name: 'Seven Styles', stage: 3, cpu: 11, stocks: 2, pow: 1.25, kb: 0.85, dmgIn: 0.88, minions: [] },
  { name: 'Iron Will',    stage: 4, cpu: 11, stocks: 3, pow: 1.30, kb: 0.80, dmgIn: 0.85, minions: [] },
  { name: 'No Mercy',     stage: 6, cpu: 11, stocks: 3, pow: 1.35, kb: 0.76, dmgIn: 0.82, minions: [] },
  { name: 'Legion',       stage: 5, cpu: 11, stocks: 3, pow: 1.40, kb: 0.72, dmgIn: 0.80, minions: [6] },
  { name: 'Overdrive',    stage: 7, cpu: 11, stocks: 3, pow: 1.40, kb: 0.72, dmgIn: 0.80, minions: [] },
  { name: 'The Gauntlet', stage: 5, cpu: 11, stocks: 3, pow: 1.45, kb: 0.70, dmgIn: 0.80, minions: [5] },
  { name: 'Ultra Max',    stage: 2, cpu: 11, stocks: 3, pow: 1.50, kb: 0.66, dmgIn: 0.76, minions: [6] },
  // chapter 2 — Master Chuang
  { name: 'Say Cheese',     stage: 3, cpu: 10, stocks: 1, pow: 1.10, kb: 0.95, dmgIn: 0.95, minions: [] },
  { name: 'Overexposed',    stage: 0, cpu: 10, stocks: 2, pow: 1.05, kb: 0.95, dmgIn: 0.95, minions: [] },
  { name: 'Darkroom',       stage: 7, cpu: 10, stocks: 2, pow: 1.10, kb: 0.92, dmgIn: 0.92, minions: [] },
  { name: 'Red Eye',        stage: 6, cpu: 10, stocks: 2, pow: 1.15, kb: 0.90, dmgIn: 0.90, minions: [] },
  { name: 'Panorama',       stage: 1, cpu: 10, stocks: 2, pow: 1.20, kb: 0.86, dmgIn: 0.88, minions: [] },
  { name: 'Long Exposure',  stage: 4, cpu: 11, stocks: 3, pow: 1.25, kb: 0.84, dmgIn: 0.86, minions: [] },
  { name: 'Burst Mode',     stage: 2, cpu: 11, stocks: 3, pow: 1.30, kb: 0.80, dmgIn: 0.84, minions: [4] },
  { name: 'Golden Hour',    stage: 5, cpu: 11, stocks: 3, pow: 1.35, kb: 0.76, dmgIn: 0.82, minions: [] },
  { name: 'Flash Flood',    stage: 3, cpu: 11, stocks: 3, pow: 1.35, kb: 0.76, dmgIn: 0.82, minions: [4] },
  { name: 'Final Exposure', stage: 0, cpu: 11, stocks: 3, pow: 1.45, kb: 0.70, dmgIn: 0.78, minions: [5] },
  // chapter 3 — Mythic Hsi
  { name: 'Tip-Off',          stage: 1, cpu: 10, stocks: 2, pow: 1.15, kb: 0.92, dmgIn: 0.92, minions: [] },
  { name: 'Fast Break',       stage: 2, cpu: 10, stocks: 2, pow: 1.20, kb: 0.90, dmgIn: 0.90, minions: [] },
  { name: 'Full-Court Press', stage: 4, cpu: 10, stocks: 2, pow: 1.25, kb: 0.86, dmgIn: 0.88, minions: [] },
  { name: 'Pick and Roll',    stage: 7, cpu: 11, stocks: 2, pow: 1.25, kb: 0.84, dmgIn: 0.86, minions: [] },
  { name: 'Triple Double',    stage: 0, cpu: 11, stocks: 3, pow: 1.30, kb: 0.80, dmgIn: 0.84, minions: [] },
  { name: 'Shot Clock',       stage: 3, cpu: 11, stocks: 3, pow: 1.35, kb: 0.76, dmgIn: 0.82, minions: [4] },
  { name: 'Half-Court Heave', stage: 6, cpu: 11, stocks: 3, pow: 1.40, kb: 0.72, dmgIn: 0.80, minions: [5] },
  { name: 'Overtime',         stage: 5, cpu: 11, stocks: 3, pow: 1.40, kb: 0.72, dmgIn: 0.80, minions: [4] },
  { name: 'Playoffs',         stage: 2, cpu: 11, stocks: 3, pow: 1.45, kb: 0.70, dmgIn: 0.78, minions: [5] },
  { name: 'Hall of Fame',     stage: 1, cpu: 11, stocks: 3, pow: 1.50, kb: 0.66, dmgIn: 0.76, minions: [6] }
];
function bossChapter(level) { return BOSS_CHAPTERS.find(c => level >= c.from && level <= c.to) || BOSS_CHAPTERS[0]; }
BOSS_LEVELS.forEach((L, i) => { L.boss = bossChapter(i + 1).boss; });
/* every chapter boss whose last level is beaten */
function bossUnlocksFor(beaten) { return BOSS_CHAPTERS.filter(c => beaten >= c.to).map(c => c.boss); }
/* builds the match settings for a boss level (used by the game server) */
function bossConfig(level, playerChar, player) {
  const L = BOSS_LEVELS[level - 1];
  const pool = ROSTER.filter(c => !c.legend);
  const slots = [Object.assign({ type: 'you', char: playerChar, lvl: 5, team: 0 }, player || {})];
  slots.push({ type: 'cpu', char: L.boss, lvl: L.cpu, team: 1, boss: { pow: L.pow, kb: L.kb, dmgIn: L.dmgIn, size: BOSS_SIZE }, stocks: L.stocks, name: CHAR[L.boss].name, tag: 'BOSS' });
  L.minions.forEach(lv => slots.push({ type: 'cpu', char: pool[Math.floor(Math.random() * pool.length)].id, lvl: lv, team: 1, stocks: 1 }));
  while (slots.length < 4) slots.push({ type: 'off' });
  return { stage: L.stage, stocks: BOSS_PLAYER_STOCKS, time: 6, teams: true, boss: level, slots };
}
