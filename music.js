'use strict';
/* ===== CLOUDTOP BRAWL — settings + procedural music =====
   Every stage has its own looping theme, generated live with the Web Audio API
   (no audio files needed). The menu has a calmer theme. */

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
   bpm, root (MIDI note), scale, prog (chord degree per bar, 8 bars),
   k/s/h = kick / snare / hat pattern over 16 steps, bass pattern ('x' root, 'o' octave, '5' fifth, '-' rest),
   lead = oscillator type, arp = arpeggio on/off, pad = chord pad on/off, seed = melody seed, density = how busy the melody is */
const TRACKS = {
  menu:   { bpm: 92,  root: 57, scale: 'dorian', prog: [0, 3, 5, 4, 0, 3, 6, 4], k: 'x-------x-------', s: '----x-------x---', h: '--x---x---x---x-', bass: 'x-----x---x-----', lead: 'triangle', arp: true, pad: true, seed: 7, density: 0.28 },
  temple: { bpm: 138, root: 62, scale: 'minor', prog: [0, 5, 3, 4, 0, 5, 6, 4], k: 'x---x---x---x---', s: '----x-------x---', h: 'x-x-x-x-x-x-x-xx', bass: 'x-xo-x-ox-xo-x5o', lead: 'square', arp: true, pad: true, seed: 11, density: 0.5 },
  ruins:  { bpm: 124, root: 57, scale: 'dorian', prog: [0, 0, 3, 3, 5, 4, 0, 4], k: 'x--x--x---x--x--', s: '----x--x----x---', h: '-xx--xx--xx--xx-', bass: 'x--x--x-o--x--5-', lead: 'triangle', arp: false, pad: true, seed: 23, density: 0.45 },
  roof:   { bpm: 150, root: 64, scale: 'phryg', prog: [0, 1, 0, 6, 0, 1, 5, 6], k: 'x---x---x---x---', s: '----x-------x-x-', h: 'xxxxxxxxxxxxxxxx', bass: 'xoxoxoxoxoxoxoxo', lead: 'sawtooth', arp: true, pad: false, seed: 31, density: 0.55 },
  forge:  { bpm: 144, root: 52, scale: 'harm', prog: [0, 0, 5, 4, 0, 0, 3, 4], k: 'x-x-x---x-x-x---', s: '----x-------x---', h: 'x-xxx-xxx-xxx-xx', bass: 'xx-xxx-xxx-xxx-5', lead: 'sawtooth', arp: false, pad: true, seed: 41, density: 0.5 },
  peak:   { bpm: 118, root: 67, scale: 'lydian', prog: [0, 4, 5, 3, 0, 4, 1, 4], k: 'x-------x--x----', s: '----x-------x---', h: '--x---x---x---x-', bass: 'x---o---x---5---', lead: 'triangle', arp: true, pad: true, seed: 53, density: 0.38 },
  orbit:  { bpm: 132, root: 60, scale: 'minor', prog: [0, 6, 5, 6, 0, 6, 3, 4], k: 'x---x---x---x---', s: '----x-------x---', h: '-x-x-x-x-x-x-x-x', bass: 'x-ox-ox-x-ox-o5o', lead: 'square', arp: true, pad: true, seed: 61, density: 0.48 },
  cove:   { bpm: 128, root: 62, scale: 'mixo', prog: [0, 4, 6, 3, 0, 4, 3, 4], k: 'x-----x-x-----x-', s: '----x-------x---', h: 'x-xx-xx-x-xx-xx-', bass: 'x-5-o-5-x-5-o-5-', lead: 'square', arp: false, pad: true, seed: 71, density: 0.52 },
  dojo:   { bpm: 110, root: 62, scale: 'phryg', prog: [0, 1, 0, 3, 4, 3, 1, 0], k: 'x-----x---x-----', s: '----x-------x---', h: '--x-----x---x-x-', bass: 'x-----x-o-----5-', lead: 'triangle', arp: true, pad: true, seed: 83, density: 0.36 }
};

function seeded(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

function degToNote(tr, deg, octave) {
  const sc = SCALES[tr.scale] || SCALES.minor, n = sc.length;
  const o = Math.floor(deg / n), i = ((deg % n) + n) % n;
  return tr.root + sc[i] + 12 * (o + (octave || 0));
}
function chordNotes(tr, deg) { return [degToNote(tr, deg), degToNote(tr, deg + 2), degToNote(tr, deg + 4)]; }

/* builds an 8-bar melody from the chord progression: phrase A, A', B, A */
function buildMelody(tr) {
  const rnd = seeded(tr.seed);
  const bars = [];
  const makeBar = (deg) => {
    const out = new Array(16).fill(null);
    let last = deg + 7;
    for (let s = 0; s < 16; s++) {
      const strong = s % 4 === 0;
      if (rnd() < (strong ? tr.density + 0.25 : tr.density * 0.7)) {
        const step = rnd() < 0.6 ? [0, 2, 4][Math.floor(rnd() * 3)] + deg + 7 : last + (rnd() < 0.5 ? 1 : -1);
        last = clamp(step, deg + 4, deg + 13);
        const len = rnd() < 0.3 ? 3 : rnd() < 0.5 ? 2 : 1;
        out[s] = { d: last, len };
        s += len - 1;
      }
    }
    return out;
  };
  const A = [makeBar(tr.prog[0]), makeBar(tr.prog[1])];
  const B = [makeBar(tr.prog[4]), makeBar(tr.prog[5])];
  bars.push(A[0], A[1], makeBar(tr.prog[2]), makeBar(tr.prog[3]), B[0], B[1], A[0], makeBar(tr.prog[7]));
  return bars;
}

const MUSIC = { want: null, cur: null, tr: null, mel: null, step: 0, next: 0, timer: null, out: null };

function musicPlay(id) {
  if (!TRACKS[id]) id = 'menu';
  MUSIC.want = id;
  if (!SFX.ctx) return;
  if (MUSIC.cur === id && MUSIC.timer) return;
  musicStart(id);
}
function musicStart(id) {
  const c = SFX.ctx; if (!c || !SFX.musicBus) return;
  musicStop(0.5);
  const tr = TRACKS[id];
  MUSIC.cur = id; MUSIC.tr = tr; MUSIC.mel = buildMelody(tr); MUSIC.step = 0;
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
function musicTick() {
  const c = SFX.ctx, tr = MUSIC.tr; if (!c || !tr || !MUSIC.out) return;
  if (MUSIC.next < c.currentTime - 0.2) MUSIC.next = c.currentTime + 0.05;
  const sixteenth = 60 / tr.bpm / 4;
  while (MUSIC.next < c.currentTime + 0.15) {
    playStep(MUSIC.step, MUSIC.next, sixteenth);
    MUSIC.next += sixteenth;
    MUSIC.step = (MUSIC.step + 1) % 128;
  }
}

function playStep(step, t, dur) {
  const tr = MUSIC.tr, s = step % 16, bar = Math.floor(step / 16) % 8;
  const deg = tr.prog[bar % tr.prog.length];
  if (tr.k[s] === 'x') drum('kick', t);
  if (tr.s[s] === 'x') drum('snare', t);
  if (tr.h[s] === 'x') drum('hat', t, s % 4 === 2 ? 0.7 : 0.45);
  const bp = tr.bass[s];
  if (bp && bp !== '-') {
    const root = degToNote(tr, deg, -2);
    const n = bp === 'o' ? root + 12 : bp === '5' ? degToNote(tr, deg + 4, -2) : root;
    synth(n, t, dur * 1.8, 'sawtooth', 0.16, 500);
  }
  if (tr.pad && s === 0) chordNotes(tr, deg).forEach((n, i) => synth(n - 12 + (i === 0 ? 12 : 0), t, dur * 15, 'sawtooth', 0.025, 1100, 0.3));
  if (tr.arp && s % 2 === 0) {
    const ch = chordNotes(tr, deg); const n = ch[(s / 2) % 3] + (s >= 8 ? 12 : 0);
    synth(n, t, dur * 1.2, 'triangle', 0.045, 3000);
  }
  const m = MUSIC.mel[bar] && MUSIC.mel[bar][s];
  if (m) synth(degToNote(tr, m.d), t, dur * m.len * 0.95, tr.lead, tr.lead === 'sawtooth' ? 0.05 : 0.07, 2600, 0, true);
}

function synth(note, t, dur, type, vol, cutoff, attack, vib) {
  const c = SFX.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = type; o.frequency.setValueAtTime(mtof(note), t);
  if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = mtof(note) * 0.006; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.1); }
  f.type = 'lowpass'; f.frequency.value = cutoff || 2000;
  const a = attack || 0.008;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a);
  g.gain.setValueAtTime(vol, t + Math.max(a, dur * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  o.connect(f); f.connect(g); g.connect(MUSIC.out);
  o.start(t); o.stop(t + dur + 0.1);
}
function drum(kind, t, vol) {
  const c = SFX.ctx;
  if (kind === 'kick') {
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(MUSIC.out); o.start(t); o.stop(t + 0.25);
    return;
  }
  if (!SFX.noise) return;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = SFX.noise;
  const len = kind === 'snare' ? 0.16 : 0.04;
  f.type = kind === 'snare' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 'snare' ? 1800 : 7000;
  g.gain.setValueAtTime(kind === 'snare' ? 0.22 : 0.07 * (vol || 0.5) * 2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(f); f.connect(g); g.connect(MUSIC.out); s.start(t, Math.random() * 0.3); s.stop(t + len + 0.02);
  if (kind === 'snare') { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = 190; og.gain.setValueAtTime(0.12, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); o.connect(og); og.connect(MUSIC.out); o.start(t); o.stop(t + 0.1); }
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
