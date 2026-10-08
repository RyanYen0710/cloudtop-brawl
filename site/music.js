'use strict';
/* ===== CLOUDTOP BRAWL — settings + procedural music =====
   All music is generated live with the Web Audio API (no audio files needed).
   Every song has a real structure (intro, verse, chorus, bridge, last chorus a key higher)
   instead of one short loop. Battles rotate between the stage's own theme and a mix of
   high-energy battle songs; menus rotate between three themes; the character select has
   its own hype track. Near the end of a match the music speeds up, and a fanfare plays
   for the winner. */

const SETTINGS = Object.assign({ master: 0.8, music: 0.55, sfx: 0.8, shake: true, tags: true, hints: true, touch: 'auto', tsize: 1, flick: true, haptics: true }, (() => {
  try { return JSON.parse(loadLocal('cb.settings') || '{}') || {}; } catch (e) { return {}; }
})());
function saveSettings() { saveLocal('cb.settings', JSON.stringify(SETTINGS)); SFX.applyVol(); }

const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11],
  harm: [0, 2, 3, 5, 7, 8, 11], phryg: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10]
};

/* Track recipe:
   bpm, root (MIDI note), scale, prog (chord degree per bar, 8 bars) — the verse,
   chorus / bridge (optional 8-bar progressions; made from prog if missing),
   k/s/h = kick / snare / hat pattern over 16 steps, bass pattern ('x' root, 'o' octave, '5' fifth, '-' rest),
   lead = oscillator type, arp = arpeggio on/off, pad = chord pad on/off, seed = melody seed, density = how busy the melody is,
   stab = chord-hit pattern (brass / power chords) used in the chorus, style = sound flavour,
   tom = taiko / tom pattern, name = shown nowhere yet but handy when tuning. mix: true = part of the battle mix. */
const TRACKS = {
  // ---- menus ----
  menu:   { name: 'Cloudtop Lobby', bpm: 92, root: 57, scale: 'dorian', prog: [0, 3, 5, 4, 0, 3, 6, 4], k: 'x-------x-------', s: '----x-------x---', h: '--x---x---x---x-', bass: 'x-----x---x-----', lead: 'triangle', arp: true, pad: true, seed: 7, density: 0.28 },
  menu2:  { name: 'Ready Room', bpm: 112, root: 60, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], chorus: [3, 4, 2, 5, 3, 4, 0, 0], k: 'x---x---x---x---', s: '----x-------x---', h: '-x-x-x-x-x-x-x-x', bass: 'x--x-o--x--x-o5-', lead: 'square', arp: true, pad: true, seed: 101, density: 0.36, stab: '--x---x---x---x-', style: 'pop' },
  menu3:  { name: 'Sky Plaza', bpm: 100, root: 62, scale: 'lydian', prog: [0, 1, 0, 1, 5, 4, 3, 4], k: 'x-----x---x-----', s: '----x-------x---', h: 'x-x-xxx-x-x-xxx-', bass: 'x--o--x---5--o--', lead: 'triangle', arp: true, pad: true, seed: 113, density: 0.32, style: 'funk' },
  select: { name: 'Choose Your Fighter', bpm: 140, root: 58, scale: 'mixo', prog: [0, 6, 3, 0, 0, 6, 3, 4], chorus: [3, 4, 0, 5, 3, 4, 6, 4], k: 'x---x---x---x---', s: '----x-------x-x-', h: 'x-xxx-xxx-xxx-xx', bass: 'x-xox-xox-xox-5o', lead: 'square', arp: true, pad: true, seed: 127, density: 0.42, stab: 'x--x--x---x-x---', style: 'rock' },

  // ---- stage themes ----
  temple: { name: 'Cloud Temple', bpm: 138, root: 62, scale: 'minor', prog: [0, 5, 3, 4, 0, 5, 6, 4], k: 'x---x---x---x---', s: '----x-------x---', h: 'x-x-x-x-x-x-x-xx', bass: 'x-xo-x-ox-xo-x5o', lead: 'square', arp: true, pad: true, seed: 11, density: 0.5, stab: 'x-----x---x-----' },
  ruins:  { name: 'Jungle Ruins', bpm: 124, root: 57, scale: 'dorian', prog: [0, 0, 3, 3, 5, 4, 0, 4], k: 'x--x--x---x--x--', s: '----x--x----x---', h: '-xx--xx--xx--xx-', bass: 'x--x--x-o--x--5-', lead: 'triangle', arp: false, pad: true, seed: 23, density: 0.45, tom: 'x--x------x-x---' },
  roof:   { name: 'Neon Rooftop', bpm: 150, root: 64, scale: 'phryg', prog: [0, 1, 0, 6, 0, 1, 5, 6], k: 'x---x---x---x---', s: '----x-------x-x-', h: 'xxxxxxxxxxxxxxxx', bass: 'xoxoxoxoxoxoxoxo', lead: 'sawtooth', arp: true, pad: false, seed: 31, density: 0.55, stab: '--x---x---x---x-' },
  forge:  { name: 'Magma Forge', bpm: 144, root: 52, scale: 'harm', prog: [0, 0, 5, 4, 0, 0, 3, 4], k: 'x-x-x---x-x-x---', s: '----x-------x---', h: 'x-xxx-xxx-xxx-xx', bass: 'xx-xxx-xxx-xxx-5', lead: 'sawtooth', arp: false, pad: true, seed: 41, density: 0.5, stab: 'x--x--x---x-----', style: 'rock' },
  peak:   { name: 'Frozen Peak', bpm: 118, root: 67, scale: 'lydian', prog: [0, 4, 5, 3, 0, 4, 1, 4], k: 'x-------x--x----', s: '----x-------x---', h: '--x---x---x---x-', bass: 'x---o---x---5---', lead: 'triangle', arp: true, pad: true, seed: 53, density: 0.38 },
  orbit:  { name: 'Orbit Station', bpm: 132, root: 60, scale: 'minor', prog: [0, 6, 5, 6, 0, 6, 3, 4], k: 'x---x---x---x---', s: '----x-------x---', h: '-x-x-x-x-x-x-x-x', bass: 'x-ox-ox-x-ox-o5o', lead: 'square', arp: true, pad: true, seed: 61, density: 0.48, style: 'synth' },
  cove:   { name: 'Pirate Cove', bpm: 128, root: 62, scale: 'mixo', prog: [0, 4, 6, 3, 0, 4, 3, 4], k: 'x-----x-x-----x-', s: '----x-------x---', h: 'x-xx-xx-x-xx-xx-', bass: 'x-5-o-5-x-5-o-5-', lead: 'square', arp: false, pad: true, seed: 71, density: 0.52, stab: 'x---x---x---x---' },
  dojo:   { name: 'Sakura Dojo', bpm: 110, root: 62, scale: 'phryg', prog: [0, 1, 0, 3, 4, 3, 1, 0], k: 'x-----x---x-----', s: '----x-------x---', h: '--x-----x---x-x-', bass: 'x-----x-o-----5-', lead: 'triangle', arp: true, pad: true, seed: 83, density: 0.36, tom: 'x-------x--x----' },

  // ---- the battle mix (rotates with the stage themes) ----
  finale:   { mix: true, name: 'Final Clash', bpm: 152, root: 50, scale: 'harm', prog: [0, 5, 3, 4, 0, 5, 6, 4], chorus: [5, 3, 0, 4, 5, 3, 6, 4], k: 'x---x---x-x-x---', s: '----x-------x---', h: 'x-x-x-x-x-x-x-x-', bass: 'x-xox-xox-xox-xo', lead: 'sawtooth', arp: true, pad: true, seed: 201, density: 0.5, stab: 'x--x--x---x-x---', style: 'orch', tom: '------------x-x-' },
  anthem:   { mix: true, name: 'Rival Anthem', bpm: 162, root: 52, scale: 'minor', prog: [0, 5, 6, 4, 0, 5, 3, 4], chorus: [5, 6, 0, 4, 5, 6, 4, 4], k: 'x---x-x-x---x-x-', s: '----x-------x---', h: 'x-x-x-x-x-x-x-x-', bass: 'xxxxxxxxxxxxxxxx', lead: 'square', arp: false, pad: true, seed: 211, density: 0.52, stab: 'x--x--x-x--x--x-', style: 'rock' },
  pixel:    { mix: true, name: 'Pixel Rush', bpm: 168, root: 60, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], chorus: [3, 4, 2, 5, 3, 4, 0, 0], k: 'x---x---x---x---', s: '----x-------x---', h: 'x-x-x-x-x-x-x-x-', bass: 'xoxoxoxoxoxoxoxo', lead: 'square', arp: true, pad: false, seed: 223, density: 0.55, style: 'chip' },
  breakneck:{ mix: true, name: 'Breakneck', bpm: 172, root: 53, scale: 'minor', prog: [0, 0, 5, 5, 3, 3, 4, 4], chorus: [0, 5, 3, 4, 0, 5, 6, 4], k: 'x---------x-----', s: '----x-------x---', h: 'xxxxxxxxxxxxxxxx', bass: 'x-------x-----5-', lead: 'square', arp: true, pad: true, seed: 233, density: 0.46, style: 'dnb' },
  neon:     { mix: true, name: 'Neon Drive', bpm: 118, root: 57, scale: 'minor', prog: [0, 5, 3, 6, 0, 5, 3, 4], k: 'x---x---x---x---', s: '----x-------x---', h: '-x-x-x-x-x-x-x-x', bass: 'xoxoxoxoxoxoxoxo', lead: 'sawtooth', arp: true, pad: true, seed: 241, density: 0.4, style: 'synth' },
  fiesta:   { mix: true, name: 'Fiesta Brawl', bpm: 138, root: 58, scale: 'mixo', prog: [0, 3, 4, 3, 0, 3, 4, 4], chorus: [3, 4, 0, 5, 3, 4, 0, 4], k: 'x--x--x-x--x--x-', s: '--x--x----x--x--', h: 'x-xxx-xxx-xxx-xx', bass: 'x--5--o-x--5--o-', lead: 'square', arp: false, pad: true, seed: 251, density: 0.5, stab: 'x--x--x---x-x---', style: 'latin' },
  warDrums: { mix: true, name: 'War Drums', bpm: 128, root: 50, scale: 'phryg', prog: [0, 1, 0, 6, 0, 1, 5, 4], k: 'x-----x-x-------', s: '----x-------x---', h: '--x---x---x---x-', bass: 'x-----x-x-----5-', lead: 'triangle', arp: false, pad: true, seed: 263, density: 0.42, tom: 'x--x--x-x-x-x---', style: 'taiko' },
  skyHigh:  { mix: true, name: 'Sky High', bpm: 176, root: 61, scale: 'major', prog: [3, 4, 2, 5, 3, 4, 0, 0], chorus: [3, 4, 2, 5, 1, 4, 0, 0], k: 'x---x---x---x---', s: '----x-------x---', h: 'x-x-x-x-x-x-x-x-', bass: 'x-xox-xox-xox-xo', lead: 'square', arp: true, pad: true, seed: 271, density: 0.54, stab: 'x-----x---x---x-', style: 'pop' },
  gauntlet: { mix: true, name: 'Gauntlet', bpm: 184, root: 52, scale: 'phryg', prog: [0, 0, 1, 0, 0, 0, 6, 5], chorus: [0, 5, 6, 1, 0, 5, 6, 4], k: 'x-x-x-x-x-x-x-x-', s: '----x-------x---', h: 'x---x---x---x---', bass: 'xxxxxxxxxxxxxxx5', lead: 'sawtooth', arp: false, pad: true, seed: 281, density: 0.5, stab: 'x--x--x---------', style: 'rock' },
  heroes:   { mix: true, name: 'March of Heroes', bpm: 132, root: 55, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], chorus: [3, 0, 4, 5, 3, 0, 4, 4], k: 'x---x---x---x---', s: '----x-x-----x-xx', h: 'x-x-x-x-x-x-x-x-', bass: 'x---o---x---5---', lead: 'sawtooth', arp: false, pad: true, seed: 293, density: 0.44, stab: 'x---x---x-x-x---', style: 'orch', tom: '----------x-x-xx' },
  groove:   { mix: true, name: 'Skyline Groove', bpm: 122, root: 62, scale: 'dorian', prog: [0, 3, 0, 3, 0, 3, 5, 4], chorus: [3, 4, 0, 5, 3, 4, 6, 4], k: 'x---x---x---x---', s: '----x-------x---', h: '-x-x-x-x-x-x-x-x', bass: 'x--x-ox--x-xo-x-', lead: 'square', arp: false, pad: true, seed: 307, density: 0.46, stab: '--x---x---x---x-', style: 'funk' },
  surge:    { mix: true, name: 'Power Surge', bpm: 128, root: 55, scale: 'minor', prog: [0, 0, 5, 5, 3, 3, 4, 4], chorus: [0, 5, 3, 4, 0, 5, 6, 4], k: 'x---x---x---x---', s: '----x-------x---', h: '--x---x---x---x-', bass: '--x---x---x---x-', lead: 'sawtooth', arp: true, pad: true, seed: 311, density: 0.44, stab: '--x---x---x---x-', style: 'synth' }
};
const MENU_MIX = ['menu', 'menu2', 'menu3'];
const BATTLE_MIX = Object.keys(TRACKS).filter(k => TRACKS[k].mix);

function seeded(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

function degToNote(tr, deg, octave) {
  const sc = SCALES[tr.scale] || SCALES.minor, n = sc.length;
  const o = Math.floor(deg / n), i = ((deg % n) + n) % n;
  return tr.root + sc[i] + 12 * (o + (octave || 0)) + (MUSIC.key || 0);
}
function chordNotes(tr, deg) { return [degToNote(tr, deg), degToNote(tr, deg + 2), degToNote(tr, deg + 4)]; }

/* an 8-bar melody over a progression: phrase A, A', B, A */
function buildMelody(prog, seed, density) {
  const rnd = seeded(seed);
  const makeBar = (deg) => {
    const out = new Array(16).fill(null);
    let last = deg + 7;
    for (let s = 0; s < 16; s++) {
      const strong = s % 4 === 0;
      if (rnd() < (strong ? density + 0.25 : density * 0.7)) {
        const step = rnd() < 0.6 ? [0, 2, 4][Math.floor(rnd() * 3)] + deg + 7 : last + (rnd() < 0.5 ? 1 : -1);
        last = clamp(step, deg + 4, deg + 13);
        const len = rnd() < 0.3 ? 3 : rnd() < 0.5 ? 2 : 1;
        out[s] = { d: last, len };
        s += len - 1;
      }
    }
    return out;
  };
  const A = [makeBar(prog[0]), makeBar(prog[1])];
  return [A[0], A[1], makeBar(prog[2]), makeBar(prog[3]), makeBar(prog[4]), makeBar(prog[5]), A[0], makeBar(prog[7])];
}

/* turns a recipe into a full song: intro, verse, chorus, verse, chorus, bridge, final chorus (a key higher).
   e = energy: 0 intro, 1 verse, 1.5 bridge (half-time), 2 chorus, 3 final chorus */
function buildSong(tr) {
  const verse = tr.prog, chorus = tr.chorus || tr.prog.slice(4).concat(tr.prog.slice(0, 4));
  const bridge = tr.bridge || [tr.prog[2], tr.prog[2], tr.prog[3], tr.prog[3], tr.prog[5], tr.prog[5], 4, 4];
  const mV = buildMelody(verse, tr.seed, tr.density), mC = buildMelody(chorus, tr.seed + 1, Math.min(0.75, tr.density + 0.12));
  const mB = buildMelody(bridge, tr.seed + 2, tr.density * 0.6);
  const sec = (name, prog, mel, e, bars, key) => ({ name, prog, mel, e, bars: bars || 8, key: key || 0 });
  const parts = [sec('intro', verse, null, 0, 4), sec('verse', verse, mV, 1), sec('chorus', chorus, mC, 2), sec('verse', verse, mV, 1),
    sec('chorus', chorus, mC, 2), sec('bridge', bridge, mB, 1.5), sec('final', chorus, mC, 3, 8, 2), sec('final', chorus, mC, 3, 8, 2)];
  let at = 0; parts.forEach(p => { p.start = at; at += p.bars * 16; });
  return { parts, total: at };
}

const MUSIC = { want: null, wantOk: false, cur: null, tr: null, song: null, step: 0, next: 0, timer: null, out: null, key: 0, last: null, hype: false, fanfareEnd: 0, fanfareFor: null, stage: null, kind: null };

function pickFrom(list, avoid) {
  const opts = list.filter(x => x !== avoid);
  return opts[Math.floor(Math.random() * opts.length)] || list[0];
}
/* id = 'menu' or a stage id (what the game asks for). Picks the actual song from the rotations. */
function musicPlay(id, resolved) {
  let pick = id;
  if (id === MUSIC.want && MUSIC.wantOk && !MUSIC.timer) resolved = true;   // replaying after the browser unlocks audio
  if (!(resolved && TRACKS[id])) {
    const screen = typeof G !== 'undefined' ? G.screen : '';
    if (!TRACKS[id] || id === 'menu') {
      if (screen === 'setup') pick = 'select';
      else pick = MENU_MIX.indexOf(MUSIC.cur) >= 0 ? MUSIC.cur : pickFrom(MENU_MIX, MUSIC.last);
      MUSIC.kind = 'menu';
    } else {
      // a battle: half the time the stage's own theme, otherwise a song from the battle mix
      MUSIC.stage = id; MUSIC.kind = 'battle';
      pick = Math.random() < 0.45 && id !== MUSIC.last ? id : pickFrom(BATTLE_MIX, MUSIC.last);
    }
  }
  MUSIC.want = pick; MUSIC.wantOk = true;
  if (!SFX.ctx) return;
  if (MUSIC.cur === pick && MUSIC.timer) return;
  musicStart(pick);
}
function musicStart(id) {
  const c = SFX.ctx; if (!c || !SFX.musicBus) return;
  musicStop(0.5);
  // let the victory fanfare finish before the next song starts
  if (c.currentTime < MUSIC.fanfareEnd - 0.1) { clearTimeout(MUSIC.waitT); MUSIC.waitT = setTimeout(() => { if (MUSIC.want === id && !MUSIC.timer) musicStart(id); }, (MUSIC.fanfareEnd - c.currentTime) * 1000); return; }
  const tr = TRACKS[id];
  MUSIC.cur = id; MUSIC.last = id; MUSIC.tr = tr; MUSIC.song = buildSong(tr); MUSIC.step = 0; MUSIC.key = 0;
  MUSIC.out = c.createGain(); MUSIC.out.gain.setValueAtTime(0.0001, c.currentTime);
  MUSIC.out.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.8);
  MUSIC.out.connect(SFX.musicBus);
  MUSIC.next = c.currentTime + 0.1;
  MUSIC.timer = setInterval(musicTick, 25);
}
function musicStop(fade) {
  if (MUSIC.timer) { clearInterval(MUSIC.timer); MUSIC.timer = null; }
  const o = MUSIC.out, c = SFX.ctx;
  if (o && c) {
    o.gain.cancelScheduledValues(c.currentTime);
    o.gain.setValueAtTime(o.gain.value || 0.5, c.currentTime);
    o.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (fade || 0.3));
    setTimeout(() => { try { o.disconnect(); } catch (e) { } }, (fade || 0.3) * 1000 + 100);
  }
  MUSIC.out = null; MUSIC.cur = null;
}
/* when a song finishes: battles move to another battle song (or the stage theme), menus to the next menu song */
function musicNext() {
  const cur = MUSIC.cur;
  if (MUSIC.kind === 'battle') musicPlay(pickFrom(BATTLE_MIX.concat(MUSIC.stage ? [MUSIC.stage] : []), cur), true);
  else if (cur === 'select') musicStart('select');
  else musicPlay(pickFrom(MENU_MIX, cur), true);
}

/* is the match close to the end? (last 30 seconds, or everyone left is on their last life) */
function musicHype() {
  const gm = typeof G !== 'undefined' && G.screen === 'fight' && G.game;
  if (!gm || gm.over || gm.cfg && gm.cfg.endless) return false;
  if (gm.timeLeft > 0 && gm.timeLeft <= 1800) return true;
  const alive = gm.fighters.filter(f => !f.out);
  return alive.length >= 2 && alive.every(f => f.stocks === 1);
}
function musicTick() {
  const c = SFX.ctx, tr = MUSIC.tr; if (!c || !tr || !MUSIC.out) return;
  const gm = typeof G !== 'undefined' && G.game;
  if (gm && gm.over && MUSIC.fanfareFor !== gm && G.screen === 'fight') { MUSIC.fanfareFor = gm; playFanfare(); return; }
  MUSIC.hype = musicHype();
  if (MUSIC.next < c.currentTime - 0.2) MUSIC.next = c.currentTime + 0.05;
  const sixteenth = 60 / (tr.bpm * (MUSIC.hype ? 1.07 : 1)) / 4;
  while (MUSIC.next < c.currentTime + 0.15) {
    if (MUSIC.step >= MUSIC.song.total) { setTimeout(musicNext, 0); MUSIC.step = 0; return; }
    playStep(MUSIC.step, MUSIC.next, sixteenth);
    MUSIC.next += sixteenth;
    MUSIC.step++;
  }
}

function playStep(step, t, dur) {
  const tr = MUSIC.tr, song = MUSIC.song;
  let p = song.parts[0]; for (const q of song.parts) if (step >= q.start) p = q;
  const local = step - p.start, s = local % 16, barIn = Math.floor(local / 16), e = p.e, hype = MUSIC.hype;
  MUSIC.key = p.key;
  const deg = p.prog[barIn % p.prog.length];
  const lastBar = barIn === p.bars - 1;
  // drums
  if (local === 0 && p.name !== 'intro') drum('crash', t);
  if (e === 0) { if (s % 8 === 0) drum('kick', t); if (barIn >= 2 && s % 2 === 0) drum('hat', t, 0.35); }
  else if (e === 1.5) {   // bridge: half-time feel
    if (s === 0 || (s === 10 && barIn % 2)) drum('kick', t);
    if (s === 8) drum('snare', t);
    if (s % 4 === 2) drum('hat', t, 0.5);
  } else {
    const fill = lastBar && s >= 8;
    if (tr.k[s] === 'x' && !(fill && s >= 12)) drum('kick', t);
    if (fill) { if (s >= 12 || s % 2 === 0) drum('snare', t, 0.7 + (s - 8) * 0.05); }
    else if (tr.s[s] === 'x') drum('snare', t);
    if (tr.h[s] === 'x' || ((e >= 2 || hype) && s % 2 === 1)) drum('hat', t, s % 4 === 2 ? 0.7 : 0.45);
    if (tr.tom && tr.tom[s] === 'x') drum('tom', t, tr.style === 'taiko' ? 1 : 0.6);
  }
  // bass
  const bp = e === 0 ? (s === 0 ? 'x' : '-') : tr.bass[s];
  if (bp && bp !== '-') {
    const root = degToNote(tr, deg, -2);
    const n = bp === 'o' ? root + 12 : bp === '5' ? degToNote(tr, deg + 4, -2) : root;
    synth(n, t, dur * (tr.style === 'dnb' ? 6 : 1.8), tr.style === 'chip' ? 'triangle' : 'sawtooth', 0.16, tr.style === 'dnb' ? 380 : 500);
  }
  // pad + arpeggio
  if (tr.pad && s === 0) chordNotes(tr, deg).forEach((n, i) => synth(n - 12 + (i === 0 ? 12 : 0), t, dur * 15, 'sawtooth', e >= 2 ? 0.03 : 0.025, 1100, 0.3));
  if (tr.arp && (e >= 1 || barIn >= 2) && s % (tr.style === 'chip' ? 1 : 2) === 0) {
    const ch = chordNotes(tr, deg), k = tr.style === 'chip' ? s : s / 2; const n = ch[k % 3] + (s >= 8 ? 12 : 0);
    synth(n, t, dur * 1.2, tr.style === 'chip' ? 'square' : 'triangle', tr.style === 'chip' ? 0.025 : 0.045, 3000);
  }
  // chord stabs in the chorus (brass hits / power chords)
  if (tr.stab && e >= 2 && tr.stab[s] === 'x') {
    const r = degToNote(tr, deg, -1);
    const notes = tr.style === 'rock' ? [r, r + 7, r + 12] : chordNotes(tr, deg).map(n => n - 12);
    const type = tr.style === 'rock' || tr.style === 'chip' ? 'square' : 'sawtooth';
    notes.forEach(n => synth(n, t, dur * 1.6, type, 0.032, tr.style === 'orch' || tr.style === 'latin' ? 1800 : 1400, 0.012));
  }
  // lead melody (the chorus doubles it an octave lower for a bigger sound)
  const m = p.mel && p.mel[barIn] && p.mel[barIn][s];
  if (m) {
    const n = degToNote(tr, m.d), vol = tr.lead === 'sawtooth' ? 0.05 : 0.07;
    synth(n, t, dur * m.len * 0.95, tr.lead, vol, 2600, 0, true);
    if (e >= 2) synth(n - 12, t, dur * m.len * 0.95, tr.lead === 'square' ? 'sawtooth' : 'square', vol * 0.45, 1600);
  }
}

function synth(note, t, dur, type, vol, cutoff, attack, vib, dest) {
  const c = SFX.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = type; o.frequency.setValueAtTime(mtof(note), t);
  if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = mtof(note) * 0.006; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.1); }
  f.type = 'lowpass'; f.frequency.value = cutoff || 2000;
  const a = attack || 0.008;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a);
  g.gain.setValueAtTime(vol, t + Math.max(a, dur * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  o.connect(f); f.connect(g); g.connect(dest || MUSIC.out);
  o.start(t); o.stop(t + dur + 0.1);
}
function drum(kind, t, vol, dest) {
  const c = SFX.ctx, out = dest || MUSIC.out;
  if (kind === 'kick' || kind === 'tom') {
    const o = c.createOscillator(), g = c.createGain(), tom = kind === 'tom';
    o.frequency.setValueAtTime(tom ? 110 : 150, t); o.frequency.exponentialRampToValueAtTime(tom ? 55 : 42, t + (tom ? 0.25 : 0.12));
    g.gain.setValueAtTime((tom ? 0.42 : 0.5) * (vol || 1), t); g.gain.exponentialRampToValueAtTime(0.0001, t + (tom ? 0.45 : 0.22));
    o.connect(g); g.connect(out); o.start(t); o.stop(t + (tom ? 0.5 : 0.25));
    return;
  }
  if (!SFX.noise) return;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = SFX.noise;
  const len = kind === 'crash' ? 1.1 : kind === 'snare' ? 0.16 : 0.04;
  f.type = kind === 'snare' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 'snare' ? 1800 : kind === 'crash' ? 5000 : 7000;
  const v0 = kind === 'crash' ? 0.12 : kind === 'snare' ? 0.22 * (vol || 1) : 0.07 * (vol || 0.5) * 2;
  g.gain.setValueAtTime(v0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.3); s.stop(t + len + 0.02);
  if (kind === 'snare') { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = 190; og.gain.setValueAtTime(0.12 * (vol || 1), t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.1); }
}

/* short victory fanfare when a match ends */
function playFanfare() {
  const c = SFX.ctx; if (!c || !SFX.musicBus) return;
  musicStop(0.25);
  const out = c.createGain(); out.gain.value = 1; out.connect(SFX.musicBus);
  const t0 = c.currentTime + 0.25, b = 60 / 172 / 2;   // eighth notes at 172 bpm
  const R = 60;   // C major
  const line = [[R + 7, 1], [R + 7, 1], [R + 7, 1], [R + 12, 3], [R + 8, 3], [R + 10, 3], [R + 12, 2], [R + 10, 1], [R + 12, 6]];
  let t = t0;
  line.forEach(([n, len]) => {
    synth(n, t, b * len * 0.9, 'square', 0.07, 3200, 0.005, len > 3, out);
    synth(n - 12, t, b * len * 0.9, 'sawtooth', 0.035, 1800, 0.005, false, out);
    t += b * len;
  });
  const chordAt = t0 + b * 15;
  [R, R + 4, R + 7, R + 12].forEach(n => synth(n - 12, chordAt, b * 6, 'sawtooth', 0.03, 1400, 0.02, false, out));
  [0, 3, 6].forEach(i => drum('snare', t0 + b * i, 0.8, out));
  drum('crash', chordAt, 1, out); drum('kick', chordAt, 1, out); drum('tom', t0 + b * 9, 0.8, out); drum('tom', t0 + b * 12, 0.8, out);
  MUSIC.fanfareEnd = t + 0.4;
  setTimeout(() => { try { out.disconnect(); } catch (e) { } }, (t - c.currentTime + 2) * 1000);
}

document.addEventListener('visibilitychange', () => {
  if (!SFX.ctx) return;
  if (document.hidden) SFX.ctx.suspend(); else SFX.ctx.resume();
});

/* ---------- settings panel ---------- */
function openSettings() {
  const m = document.getElementById('settings');
  m.hidden = false; IN.active = false;
  if (G.screen === 'fight' && G.mode === 'solo') G.paused = true;
  ['master', 'music', 'sfx'].forEach(k => {
    const el = document.getElementById('set-' + k); el.value = Math.round(SETTINGS[k] * 100);
    document.getElementById('val-' + k).textContent = el.value + '%';
  });
  document.getElementById('set-shake').checked = !!SETTINGS.shake;
  document.getElementById('set-tags').checked = !!SETTINGS.tags;
  document.getElementById('set-hints').checked = SETTINGS.hints !== false;
  document.getElementById('set-touch').value = SETTINGS.touch || 'auto';
  document.getElementById('set-tsize').value = Math.round((SETTINGS.tsize || 1) * 100);
  document.getElementById('val-tsize').textContent = Math.round((SETTINGS.tsize || 1) * 100) + '%';
  document.getElementById('set-flick').checked = !!SETTINGS.flick;
  document.getElementById('set-haptics').checked = !!SETTINGS.haptics;
  document.getElementById('set-master').focus();
}
function closeSettings() {
  if (typeof stopKeyWait === 'function') stopKeyWait();
  document.getElementById('settings').hidden = true;
  const pauseOpen = !document.getElementById('pause').hidden;
  IN.active = G.screen === 'fight' && !pauseOpen;
  if (G.screen === 'fight' && G.mode === 'solo' && !pauseOpen) G.paused = false;
}
document.getElementById('set-close').addEventListener('click', closeSettings);
['master', 'music', 'sfx'].forEach(k => {
  document.getElementById('set-' + k).addEventListener('input', e => {
    SETTINGS[k] = (+e.target.value) / 100;
    document.getElementById('val-' + k).textContent = e.target.value + '%';
    SFX.unlock(); saveSettings();
  });
});
document.getElementById('set-sfx').addEventListener('change', () => SFX.play('hit', 12));
document.getElementById('set-shake').addEventListener('change', e => { SETTINGS.shake = e.target.checked; saveSettings(); });
document.getElementById('set-tags').addEventListener('change', e => { SETTINGS.tags = e.target.checked; saveSettings(); });
document.getElementById('set-touch').addEventListener('change', e => { SETTINGS.touch = e.target.value; saveSettings(); updateTouchUI(); });
document.getElementById('set-tsize').addEventListener('input', e => { SETTINGS.tsize = (+e.target.value) / 100; document.getElementById('val-tsize').textContent = e.target.value + '%'; saveSettings(); updateTouchUI(); });
document.getElementById('set-flick').addEventListener('change', e => { SETTINGS.flick = e.target.checked; saveSettings(); });
document.getElementById('set-haptics').addEventListener('change', e => { SETTINGS.haptics = e.target.checked; saveSettings(); });
document.getElementById('settings').addEventListener('click', e => { if (e.target.id === 'settings') closeSettings(); });
document.querySelectorAll('[data-open-settings]').forEach(b => b.addEventListener('click', () => { SFX.play('ui'); openSettings(); }));
window.addEventListener('keydown', e => { if (e.code === 'Escape' && !document.getElementById('settings').hidden && !(typeof SETUI !== 'undefined' && SETUI.wait)) { e.stopImmediatePropagation(); closeSettings(); } }, true);
