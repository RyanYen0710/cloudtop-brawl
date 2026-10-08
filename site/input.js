'use strict';
/* ===== CLOUDTOP BRAWL — input (keyboard, touch, gamepad) and sound ===== */

/* ---------- key bindings (changeable in Settings → Controls; saved on this device) ---------- */
const BIND_ACTIONS = [
  ['left', 'Move left', BL], ['right', 'Move right', BR], ['up', 'Up / aim up', BU], ['down', 'Down / drop', BD],
  ['jump', 'Jump', BJ], ['atk', 'Attack', BA], ['sp', 'Special', BS], ['sm', 'Smash attack', BM],
  ['sh', 'Shield / dodge', BH], ['ult', 'Ultimate', BZ], ['frz', 'Freeze Ray (Mira Frost)', 0]
];
const DEFAULT_BINDS = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  jump: ['Space', ''], atk: ['KeyJ', ''], sp: ['KeyK', 'KeyX'], sm: ['KeyU', 'KeyC'], sh: ['KeyL', 'ShiftLeft'], ult: ['KeyZ', ''], frz: ['KeyF', '']
};
/* keys the game already uses for something else */
const RESERVED_KEYS = { Escape: 'removing a key', KeyP: 'pause', KeyH: 'hiding the hints', KeyR: 'reset in Training Lab', Tab: 'moving around the page' };
for (let i = 1; i <= 7; i++) { RESERVED_KEYS['Digit' + i] = 'Legend Yen’s styles'; RESERVED_KEYS['Numpad' + i] = 'Legend Yen’s styles'; }
function loadBinds() {
  const b = JSON.parse(JSON.stringify(DEFAULT_BINDS));
  try { const s = JSON.parse(localStorage.getItem('cb.keys') || 'null'); if (s) for (const k in b) if (Array.isArray(s[k])) b[k] = [String(s[k][0] || ''), String(s[k][1] || '')]; } catch (e) { }
  return b;
}
let BINDS = loadBinds();
const KEYMAP = {};
function rebuildKeymap() {
  for (const k in KEYMAP) delete KEYMAP[k];
  BIND_ACTIONS.forEach(([id, , bit]) => { if (bit) (BINDS[id] || []).forEach(c => { if (c) KEYMAP[c] = (KEYMAP[c] || 0) | bit; }); });
}
rebuildKeymap();
function saveBinds() { try { localStorage.setItem('cb.keys', JSON.stringify(BINDS)); } catch (e) { } rebuildKeymap(); if (typeof HINTS !== 'undefined') HINTS.builtFor = null; }
/* put a key on an action (slot 0 or 1); the key is taken off any other action first */
function setBind(id, slot, code) {
  for (const k in BINDS) BINDS[k] = BINDS[k].map(c => (c === code ? '' : c));
  BINDS[id][slot] = code || '';
  saveBinds();
}
function resetBinds() { BINDS = JSON.parse(JSON.stringify(DEFAULT_BINDS)); saveBinds(); }
function keyName(code) {
  if (!code) return '';
  const m = { Space: 'Space', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'L-Alt', AltRight: 'R-Alt', MetaLeft: 'L-Cmd', MetaRight: 'R-Cmd', Enter: 'Enter', Backspace: 'Backspace', CapsLock: 'Caps', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`' };
  if (m[code]) return m[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return 'Num ' + code.slice(6);
  return code;
}
function bindLabel(id) { const c = (BINDS[id] || []).filter(Boolean); return c.length ? keyName(c[0]) : '—'; }
const IN = { keys: new Set(), press: 0, prev: 0, touch: 0, counters: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], active: false };

function keyBits() { let b = 0; IN.keys.forEach(k => { b |= KEYMAP[k] || 0; }); return b | ((IN.mode || 0) << 10); }

/* number keys 1–7 pick a style (only Legend Yen uses it) */
window.addEventListener('keydown', e => {
  const m = /^(?:Digit|Numpad)([1-7])$/.exec(e.code);
  if (!m || !IN.active || typeof G === 'undefined' || G.screen !== 'fight') return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  IN.mode = +m[1];
});

window.addEventListener('keydown', e => {
  const bit = KEYMAP[e.code];
  if (!bit || !IN.active) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  e.preventDefault();
  if (!e.repeat) { IN.keys.add(e.code); IN.press |= bit; }
});
window.addEventListener('keyup', e => { IN.keys.delete(e.code); });
window.addEventListener('blur', () => { IN.keys.clear(); IN.touch = 0; });

function padBits() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let b = 0;
  for (const p of pads) {
    if (!p) continue;
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0, bt = i => p.buttons[i] && p.buttons[i].pressed;
    if (ax < -0.45 || bt(14)) b |= BL; if (ax > 0.45 || bt(15)) b |= BR;
    if (ay < -0.5 || bt(12)) b |= BU; if (ay > 0.5 || bt(13)) b |= BD;
    if (bt(0)) b |= BJ; if (bt(2)) b |= BA; if (bt(1)) b |= BS; if (bt(3)) b |= BM;
    if (bt(4) || bt(5) || bt(6) || bt(7)) b |= BH;
    if (bt(8) || bt(10) || bt(11)) b |= BZ;
    break;
  }
  return b;
}

function pollLocal() {
  let bits = 0;
  try { bits = keyBits() | IN.touch | padBits(); } catch (e) { bits = keyBits() | IN.touch; }
  const pr = IN.press | (bits & ~IN.prev);
  IN.prev = bits; IN.press = 0;
  BITS.forEach((bt, i) => { if (pr & bt) IN.counters[i] = (IN.counters[i] + 1) % 1000; });
  return { b: bits, pr };
}

/* ---------- sound (tiny synth, starts after first click) ---------- */
const SFX = {
  ctx: null, on: true, noise: null,
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      const len = this.ctx.sampleRate * 0.5, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
      this.applyVol();
      if (typeof MUSIC !== 'undefined' && MUSIC.want) setTimeout(() => musicPlay(MUSIC.want), 0);
    } catch (e) { this.ctx = null; }
  },
  applyVol() {
    if (!this.ctx || typeof SETTINGS === 'undefined') return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(SETTINGS.master * SETTINGS.master, t, 0.03);
    this.sfxBus.gain.setTargetAtTime(SETTINGS.sfx * SETTINGS.sfx, t, 0.03);
    this.musicBus.gain.setTargetAtTime(SETTINGS.music * SETTINGS.music * 0.9, t, 0.03);
    this.on = SETTINGS.sfx > 0 && SETTINGS.master > 0;
  },
  tone(freq, dur, type, vol, slide) {
    const c = this.ctx; if (!c) return;
    const o = c.createOscillator(), gn = c.createGain(), t = c.currentTime;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(gn); gn.connect(this.sfxBus); o.start(t); o.stop(t + dur + 0.02);
  },
  hiss(dur, vol, freq, q) {
    const c = this.ctx; if (!c || !this.noise) return;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain(), t = c.currentTime;
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 0.8;
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(gn); gn.connect(this.sfxBus); s.start(t); s.stop(t + dur);
  },
  play(type, a) {
    if (!this.on || !this.ctx) return;
    switch (type) {
      case 'hit': { const p = Math.min(1, (a || 5) / 24); this.hiss(0.08 + p * 0.2, 0.18 + p * 0.3, 900 + p * 800); this.tone(160 - p * 60, 0.12 + p * 0.2, 'sine', 0.3 + p * 0.3, 50); break; }
      case 'ko': this.hiss(0.9, 0.5, 500, 0.4); this.tone(400, 0.8, 'sawtooth', 0.15, 60); break;
      case 'block': this.tone(900, 0.08, 'triangle', 0.12, 700); break;
      case 'counter': this.tone(1320, 0.5, 'sine', 0.2); this.tone(1980, 0.4, 'sine', 0.1); break;
      case 'reflect': this.tone(1600, 0.15, 'square', 0.06, 2400); break;
      case 'boom': case 'wave': this.hiss(0.5, 0.45, 300, 0.5); this.tone(90, 0.4, 'sine', 0.4, 40); break;
      case 'jump': this.tone(300, 0.08, 'triangle', 0.05, 520); break;
      case 'shoot': if (SHAPES[a] === 'bullet') { this.hiss(0.05, 0.12, 2600, 1.2); this.tone(1400, 0.04, 'square', 0.03, 500); } else if (SHAPES[a] === 'soundwave') { this.tone(220, 0.25, 'sine', 0.12, 440); this.tone(330, 0.25, 'triangle', 0.05, 660); } else if (SHAPES[a] === 'capture' || SHAPES[a] === 'potion' || SHAPES[a] === 'flask') this.tone(500, 0.12, 'triangle', 0.06, 900); else this.tone(700, 0.1, 'square', 0.04, 300); break;
      case 'mode': [523, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 'triangle', 0.06), i * 45)); break;
      case 'summon': this.hiss(0.35, 0.22, 900, 0.6); this.tone(330, 0.2, 'sine', 0.12, 660); setTimeout(() => this.tone(660, 0.18, 'triangle', 0.07), 70); break;
      case 'rewind': [880, 740, 587, 440].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 'triangle', 0.07), i * 45)); this.hiss(0.3, 0.1, 3000, 1); break;
      case 'clank': this.tone(1500, 0.06, 'square', 0.04, 900); break;
      case 'shock': if (a) { this.hiss(0.3, 0.25, 4000, 0.8); this.tone(1900, 0.1, 'square', 0.06, 400); } break;
      case 'slowed': this.tone(600, 0.4, 'sine', 0.08, 200); break;
      case 'speaker': case 'bass': this.tone(70, 0.35, 'sine', 0.35, 40); this.hiss(0.15, 0.15, 300, 0.6); break;
      case 'spring': this.tone(250, 0.25, 'triangle', 0.1, 900); break;
      case 'mindwisp': this.tone(1100 + Math.random() * 300, 0.25, 'sine', 0.04, 700); break;
      case 'clockfield': this.tone(2000, 0.03, 'square', 0.03); break;
      case 'freeze': case 'shatter': this.tone(2200, 0.25, 'triangle', 0.06, 1400); this.hiss(0.2, 0.1, 5000, 2); break;
      case 'tele': this.hiss(0.25, 0.12, 2500, 1); break;
      case 'sbreak': this.tone(500, 0.6, 'square', 0.1, 120); break;
      case 'palm': this.tone(220, 0.3, 'sawtooth', 0.08, 110); break;
      case 'game': this.tone(523, 0.3, 'triangle', 0.15); setTimeout(() => this.tone(784, 0.5, 'triangle', 0.15), 120); break;
      case 'orbspawn': this.tone(880, 0.4, 'sine', 0.1, 1760); setTimeout(() => this.tone(1320, 0.4, 'sine', 0.08, 2000), 120); break;
      case 'orbhit': this.tone(1200 + Math.random() * 400, 0.06, 'triangle', 0.06, 900); break;
      case 'orbget': [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.12), i * 70)); break;
      case 'ult': this.hiss(0.6, 0.3, 2000, 0.5); [440, 554, 660, 880].forEach((f, i) => setTimeout(() => this.tone(f, 0.6, 'sawtooth', 0.07), i * 90)); break;
      case 'ulthit': this.hiss(0.1, 0.2, 1500); this.tone(200, 0.12, 'square', 0.08, 90); break;
      case 'ultaim': [660, 990].forEach((f, i) => setTimeout(() => this.tone(f, 0.15, 'square', 0.05), i * 80)); break;
      case 'ultlock': [1320, 1320, 1760].forEach((f, i) => setTimeout(() => this.tone(f, 0.07, 'square', 0.07), i * 110)); break;
      case 'ultmiss': this.tone(300, 0.5, 'sawtooth', 0.08, 120); break;
      case 'ulthitok': this.hiss(0.4, 0.3, 1200, 0.6); [523, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'square', 0.08), i * 60)); break;
      case 'ultback': this.tone(500, 0.2, 'triangle', 0.08, 1000); break;
      case 'frzarm': this.tone(a ? 1400 : 700, 0.15, 'triangle', 0.07, a ? 2200 : 400); break;
      case 'frzfire': this.tone(2400, 0.3, 'triangle', 0.08, 1200); this.hiss(0.2, 0.12, 6000, 2); break;
      case 'ultfinal': this.hiss(1, 0.6, 400, 0.4); this.tone(110, 0.9, 'sawtooth', 0.25, 40); break;
      case 'ignite': this.hiss(0.25, 0.14, 700, 0.6); break;
      case 'zap': this.hiss(0.35, 0.35, 3500, 0.7); this.tone(1800, 0.08, 'square', 0.08, 300); break;
      case 'zapline': this.tone(2400, 0.12, 'square', 0.06, 600); this.hiss(0.15, 0.15, 4000); break;
      case 'voidburst': this.tone(90, 0.5, 'sine', 0.3, 40); this.hiss(0.4, 0.2, 400, 0.5); break;
      case 'tzap': this.hiss(0.6, 0.45, 2200, 0.5); this.tone(70, 0.6, 'sawtooth', 0.2, 35); break;
      case 'leafburst': this.hiss(0.4, 0.2, 1500, 0.4); this.tone(600, 0.2, 'sine', 0.06, 900); break;
      case 'thunk': this.tone(180, 0.06, 'square', 0.06, 90); break;
      case 'catch': this.tone(900, 0.08, 'triangle', 0.06, 1400); break;
      case 'ledge': this.tone(520, 0.05, 'square', 0.05, 380); this.hiss(0.05, 0.08, 3000); break;
      case 'ui': this.tone(660, 0.06, 'triangle', 0.06, 880); break;
    }
  }
};
window.addEventListener('pointerdown', () => SFX.unlock(), { capture: true });
window.addEventListener('keydown', () => SFX.unlock(), { capture: true });
