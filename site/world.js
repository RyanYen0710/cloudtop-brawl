'use strict';
/* ===== CLOUDTOP BRAWL — stages, effects, camera, HUD ===== */

const RNG = (() => { let s = 1234567; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const BGDATA = {
  peaks: Array.from({ length: 14 }, (_, i) => ({ x: i / 13, h: 0.18 + RNG() * 0.22 })),
  clouds: Array.from({ length: 9 }, () => ({ x: RNG(), y: 0.15 + RNG() * 0.6, s: 0.6 + RNG() * 0.9, v: 0.15 + RNG() * 0.35 })),
  trees: Array.from({ length: 22 }, (_, i) => ({ x: i / 21, r: 0.06 + RNG() * 0.07, y: RNG() * 0.1 })),
  bugs: Array.from({ length: 18 }, () => ({ x: RNG(), y: RNG(), p: RNG() * 6 })),
  city: Array.from({ length: 26 }, (_, i) => ({ x: i / 25, w: 0.03 + RNG() * 0.04, h: 0.2 + RNG() * 0.45, win: Array.from({ length: 30 }, () => RNG() < 0.35) })),
  city2: Array.from({ length: 18 }, (_, i) => ({ x: i / 17, w: 0.05 + RNG() * 0.05, h: 0.15 + RNG() * 0.3 }))
};

function drawBackground(g, st, vw, vh, cam, t) {
  if (typeof STAGE_ART !== 'undefined' && STAGE_ART[st.id] && STAGE_ART[st.id].bg) { STAGE_ART[st.id].bg(g, vw, vh, cam, t); return; }
  const px = cam.x - 800;
  if (st.id === 'temple') {
    const gr = g.createLinearGradient(0, 0, 0, vh); gr.addColorStop(0, '#1d1647'); gr.addColorStop(0.55, '#6b2f6e'); gr.addColorStop(1, '#f0875e');
    g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
    const sx = vw * 0.72 - px * 0.03, sy = vh * 0.66;
    const sg = g.createRadialGradient(sx, sy, 0, sx, sy, vh * 0.3); sg.addColorStop(0, 'rgba(255,220,150,.95)'); sg.addColorStop(0.35, 'rgba(255,190,120,.55)'); sg.addColorStop(1, 'rgba(255,160,110,0)');
    g.fillStyle = sg; g.fillRect(0, 0, vw, vh);
    g.fillStyle = '#3a2764';
    g.beginPath(); g.moveTo(0, vh);
    BGDATA.peaks.forEach(p => g.lineTo(p.x * vw * 1.2 - vw * 0.1 - px * 0.06, vh * (0.95 - p.h)));
    g.lineTo(vw, vh); g.closePath(); g.fill();
    const pgx = vw * 0.3 - px * 0.06, pgy = vh * 0.6;
    g.fillStyle = '#2a1b4d';
    for (let i = 0; i < 4; i++) { const w = 70 - i * 14, y = pgy - i * 22; g.beginPath(); g.moveTo(pgx - w, y); g.lineTo(pgx + w, y); g.lineTo(pgx + w * 0.6, y - 12); g.lineTo(pgx - w * 0.6, y - 12); g.closePath(); g.fill(); g.fillRect(pgx - w * 0.45, y, w * 0.9, 12); }
    g.fillRect(pgx - 30, pgy, 60, vh);
    BGDATA.clouds.forEach(c => {
      const x = ((c.x * (vw + 400) + t * c.v - px * 0.1) % (vw + 400) + vw + 400) % (vw + 400) - 200, y = c.y * vh;
      g.fillStyle = 'rgba(255,220,220,.18)';
      for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * 40 * c.s, y + (k % 2) * 8, 60 * c.s, 20 * c.s, 0, 0, Math.PI * 2); g.fill(); }
    });
  } else if (st.id === 'ruins') {
    const gr = g.createLinearGradient(0, 0, 0, vh); gr.addColorStop(0, '#0d2a2b'); gr.addColorStop(0.6, '#1f4d3c'); gr.addColorStop(1, '#4f8a4c');
    g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const x = vw * (0.15 + i * 0.25) - px * 0.04; g.fillStyle = 'rgba(255,245,190,.05)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 60, 0); g.lineTo(x + 260, vh); g.lineTo(x + 120, vh); g.fill(); }
    g.restore();
    [[0.62, '#153b31', 0.05], [0.78, '#0f2e27', 0.1]].forEach(([yy, col, par]) => {
      g.fillStyle = col;
      BGDATA.trees.forEach(tr => { g.beginPath(); g.arc(tr.x * vw * 1.3 - vw * 0.15 - px * par, vh * (yy + tr.y), vh * tr.r * 1.6, 0, Math.PI * 2); g.fill(); });
      g.fillRect(0, vh * (yy + 0.05), vw, vh);
    });
    g.fillStyle = '#fff6a8';
    BGDATA.bugs.forEach(b => { const a = 0.4 + 0.6 * Math.sin(t * 0.05 + b.p); g.globalAlpha = Math.max(0, a); circle(g, b.x * vw + Math.sin(t * 0.01 + b.p) * 20, b.y * vh * 0.8, 2); g.fill(); });
    g.globalAlpha = 1;
  } else {
    const gr = g.createLinearGradient(0, 0, 0, vh); gr.addColorStop(0, '#07061a'); gr.addColorStop(0.6, '#1b0f3d'); gr.addColorStop(1, '#40195c');
    g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
    g.fillStyle = '#f5ecd0'; circle(g, vw * 0.8 - px * 0.02, vh * 0.2, vh * 0.06); g.fill();
    g.fillStyle = '#07061a'; circle(g, vw * 0.8 - px * 0.02 + vh * 0.025, vh * 0.19, vh * 0.055); g.fill();
    g.fillStyle = '#1a1340';
    BGDATA.city2.forEach(b => g.fillRect(b.x * vw * 1.2 - vw * 0.1 - px * 0.04, vh * (1 - b.h - 0.1), b.w * vw, vh));
    BGDATA.city.forEach(b => {
      const x = b.x * vw * 1.2 - vw * 0.1 - px * 0.09, y = vh * (1 - b.h), w = b.w * vw;
      g.fillStyle = '#100b28'; g.fillRect(x, y, w, vh);
      b.win.forEach((on, i) => { if (!on) return; const cx = x + 5 + (i % 3) * (w - 10) / 3, cy = y + 10 + Math.floor(i / 3) * 16; if (cy < vh) { g.fillStyle = i % 4 ? '#ffd27a' : '#6ff2ff'; g.fillRect(cx, cy, 4, 6); } });
    });
  }
}

function drawStage(g, st, t) {
  if (typeof STAGE_ART !== 'undefined' && STAGE_ART[st.id]) { STAGE_ART[st.id].fg(g, st, t); return; }
  const m = st.main;
  if (st.id === 'temple') {
    g.beginPath(); g.moveTo(m.x + 10, m.y + m.h); g.lineTo(m.x + m.w - 10, m.y + m.h); g.lineTo(m.x + m.w * 0.62, m.y + m.h + 170); g.lineTo(m.x + m.w * 0.42, m.y + m.h + 210); g.closePath();
    const rg = g.createLinearGradient(0, m.y, 0, m.y + m.h + 210); rg.addColorStop(0, '#5b3a5e'); rg.addColorStop(1, '#2a1b40');
    g.fillStyle = rg; g.fill();
    g.fillStyle = '#9c3b34'; g.fillRect(m.x, m.y + 12, m.w, m.h - 12);
    g.fillStyle = '#7a2a28'; for (let x = m.x + 30; x < m.x + m.w - 20; x += 70) g.fillRect(x, m.y + 18, 16, m.h - 18);
    g.fillStyle = '#ffcc66'; for (let x = m.x + 20; x < m.x + m.w; x += 35) { circle(g, x, m.y + m.h - 12, 3); g.fill(); }
    g.fillStyle = '#e8d5a8'; g.fillRect(m.x - 6, m.y, m.w + 12, 14);
    g.fillStyle = '#ffcc66'; g.fillRect(m.x - 6, m.y + 12, m.w + 12, 3);
    g.fillStyle = 'rgba(255,245,235,.85)';
    for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(m.x + m.w * 0.4 + Math.sin(t * 0.02 + i) * 8 + (i - 3) * 38, m.y + m.h + 180 + (i % 2) * 14, 42, 16, 0, 0, Math.PI * 2); g.fill(); }
    st.plats.forEach(p => {
      g.fillStyle = 'rgba(255,245,235,.5)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(p.x + p.w * (0.25 + i * 0.25), p.y + 18, 26, 9, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#9c3b34'; g.fillRect(p.x, p.y + 6, p.w, 6);
      g.fillStyle = '#f3e3bd'; g.fillRect(p.x, p.y, p.w, 7);
      g.fillStyle = '#ffcc66'; g.fillRect(p.x + 4, p.y + 12, 3, 10); g.fillRect(p.x + p.w - 7, p.y + 12, 3, 10);
    });
  } else if (st.id === 'ruins') {
    g.beginPath(); g.moveTo(m.x, m.y + m.h); g.lineTo(m.x + m.w, m.y + m.h); g.lineTo(m.x + m.w - 60, m.y + m.h + 160); g.lineTo(m.x + 60, m.y + m.h + 160); g.closePath();
    g.fillStyle = '#3c3f33'; g.fill();
    g.fillStyle = '#7b7f69'; g.fillRect(m.x, m.y, m.w, m.h);
    g.strokeStyle = '#5a5d4c'; g.lineWidth = 2;
    for (let r = 0; r < 3; r++) { const y = m.y + 14 + r * 26; g.beginPath(); g.moveTo(m.x, y); g.lineTo(m.x + m.w, y); g.stroke(); for (let x = m.x + (r % 2) * 40; x < m.x + m.w; x += 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 26); g.stroke(); } }
    g.fillStyle = '#6dbb4a'; g.fillRect(m.x - 4, m.y - 4, m.w + 8, 10);
    g.strokeStyle = '#3f8a3a'; g.lineWidth = 3;
    for (let x = m.x + 20; x < m.x + m.w; x += 55) { g.beginPath(); g.moveTo(x, m.y + 4); g.quadraticCurveTo(x + 8 + Math.sin(t * 0.03 + x) * 4, m.y + 40, x + 2, m.y + 60 + (x % 30)); g.stroke(); }
    st.plats.forEach(p => { g.fillStyle = '#8b8e77'; g.fillRect(p.x, p.y, p.w, 14); g.fillStyle = '#6dbb4a'; g.fillRect(p.x - 2, p.y - 3, p.w + 4, 6); g.fillStyle = '#5a5d4c'; g.fillRect(p.x + 10, p.y + 14, 14, 18); g.fillRect(p.x + p.w - 24, p.y + 14, 14, 18); });
  } else {
    g.fillStyle = '#1e1c33'; g.fillRect(m.x, m.y, m.w, st.blast.b - m.y);
    g.fillStyle = '#2a2745'; for (let y = m.y + 40; y < m.y + 500; y += 44) for (let x = m.x + 22; x < m.x + m.w - 20; x += 46) { g.fillStyle = ((x + y) % 7) < 2 ? '#ffd27a' : '#2a2745'; g.fillRect(x, y, 22, 16); }
    g.fillStyle = '#34304f'; g.fillRect(m.x + 60, m.y - 26, 60, 26); g.fillRect(m.x + m.w - 150, m.y - 18, 80, 18);
    g.save(); g.shadowColor = '#3ff2ff'; g.shadowBlur = 14; g.fillStyle = '#3ff2ff'; g.fillRect(m.x - 4, m.y - 2, m.w + 8, 5); g.restore();
    st.plats.forEach(p => {
      g.fillStyle = '#2b2a44'; g.fillRect(p.x, p.y, p.w, 10);
      g.strokeStyle = '#2b2a44'; g.lineWidth = 2; for (let x = p.x + 8; x < p.x + p.w; x += 14) { g.beginPath(); g.moveTo(x, p.y + 10); g.lineTo(x + 7, p.y + 22); g.stroke(); }
      g.save(); g.shadowColor = '#ff4fd8'; g.shadowBlur = 12; g.fillStyle = '#ff4fd8'; g.fillRect(p.x, p.y - 2, p.w, 3); g.restore();
    });
  }
}

/* ---------- particle effects ---------- */
const FX = [];
function spawnFx(o) { if (FX.length < (typeof PERF !== 'undefined' && PERF.low ? 160 : 500)) FX.push(Object.assign({ t: 0, vx: 0, vy: 0, g: 0 }, o)); }
function fxEvent(e, getF) {
  const [, type, x, y, a, b] = e;
  const f = getF ? getF(b) : null;
  const col = f ? f.color : '#ffffff';
  switch (type) {
    case 'hit': {
      const n = 6 + Math.min(18, a);
      for (let i = 0; i < n; i++) { const an = Math.random() * 6.28, s = 2 + Math.random() * (3 + a * 0.35); spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, life: 16 + Math.random() * 10, col: i % 3 ? '#fff4c2' : col, size: 3 }); }
      spawnFx({ k: 'ring', x, y, life: 14, r0: 8, r1: 30 + a * 2.5, col: '#ffffff', lw: 4 });
      if (a > 16) spawnFx({ k: 'flash', life: 6, a: Math.min(0.35, a * 0.012) });
      break;
    }
    case 'ko': {
      const ang = a / 100;
      spawnFx({ k: 'beam', x, y, ang, life: 45, col });
      spawnFx({ k: 'flash', life: 10, a: 0.4 });
      for (let i = 0; i < 30; i++) { const an = ang + (Math.random() - 0.5) * 1.2, s = 4 + Math.random() * 14; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, life: 30, col: i % 2 ? col : '#fff', size: 4 }); }
      break;
    }
    case 'block': spawnFx({ k: 'ring', x, y, life: 10, r0: 20, r1: 44, col: '#9fd8ff', lw: 3 }); break;
    case 'counter': spawnFx({ k: 'ring', x, y, life: 22, r0: 10, r1: 110, col: '#ffd76b', lw: 6 }); spawnFx({ k: 'flash', life: 8, a: 0.3, col: '255,220,120' }); break;
    case 'reflect': case 'clash': for (let i = 0; i < 10; i++) { const an = Math.random() * 6.28; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * 5, vy: Math.sin(an) * 5, life: 14, col: '#bfe6ff', size: 3 }); } break;
    case 'boom': spawnFx({ k: 'ring', x, y, life: 22, r0: 10, r1: 100, col: '#ffb547', lw: 8 }); for (let i = 0; i < 24; i++) { const an = Math.random() * 6.28, s = 2 + Math.random() * 8; spawnFx({ k: 'smoke', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 1, life: 30, col: i % 2 ? '#ff8a1f' : '#ffd35c', size: 10 }); } break;
    case 'wave': spawnFx({ k: 'wave', x, y, life: 24, w: a }); for (let i = 0; i < 16; i++) spawnFx({ k: 'smoke', x: x + (Math.random() - 0.5) * a, y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5, life: 28, col: '#c9b48a', size: 12 }); break;
    case 'jump': case 'land': case 'dust': for (let i = 0; i < (type === 'dust' ? 2 : 6); i++) spawnFx({ k: 'smoke', x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 1.5, life: 20, col: 'rgba(255,255,255,.7)', size: 7 }); break;
    case 'tele': for (let i = 0; i < 12; i++) { const an = Math.random() * 6.28; spawnFx({ k: 'smoke', x, y, vx: Math.cos(an) * 3, vy: Math.sin(an) * 3, life: 26, col: '#5b5f88', size: 14 }); } break;
    case 'freeze': case 'shatter': for (let i = 0; i < 14; i++) { const an = Math.random() * 6.28, s = 2 + Math.random() * 5; spawnFx({ k: 'shard', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, g: 0.2, life: 26, col: '#cff4ff', size: 5 }); } break;
    case 'sbreak': spawnFx({ k: 'ring', x, y, life: 20, r0: 30, r1: 80, col: '#ff6b5b', lw: 5 }); break;
    case 'snow': for (let i = 0; i < 4; i++) { const an = Math.random() * 6.28, r = Math.random() * a * 0.5; spawnFx({ k: 'spark', x: x + Math.cos(an) * r, y: y + Math.sin(an) * r * 0.5, vx: Math.sin(an) * 3, vy: -Math.cos(an) * 2, life: 18, col: '#e6f9ff', size: 3 }); } break;
    case 'charge': spawnFx({ k: 'ring', x, y, life: 12, r0: 34, r1: 6, col: '#fff1b8', lw: 3 }); break;
    case 'palm': spawnFx({ k: 'palm', x, y, life: 18, dir: a }); break;
    case 'fly': spawnFx({ k: 'smoke', x: x + (Math.random() - 0.5) * 24, y: y + 8, vx: 0, vy: 0.6, life: 22, col: 'rgba(255,250,235,.8)', size: 8 }); break;
    case 'orbhit': for (let i = 0; i < 6; i++) { const an = Math.random() * 6.28; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * 4, vy: Math.sin(an) * 4, life: 14, col: `hsl(${Math.random() * 360},100%,70%)`, size: 3 }); } break;
    case 'orbget': case 'orbspawn': spawnFx({ k: 'ring', x, y, life: 30, r0: 10, r1: 160, col: '#ffffff', lw: 6 }); for (let i = 0; i < 24; i++) { const an = Math.random() * 6.28, s = 3 + Math.random() * 8; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, life: 30, col: `hsl(${i * 15},100%,65%)`, size: 4 }); } break;
    case 'ult': spawnFx({ k: 'flash', life: 12, a: 0.6 }); break;
    case 'ulthit': if (typeof ultHitFx === 'function') ultHitFx(x, y, a, b, col, getF); for (let i = 0; i < (a === 2 ? 0 : 8); i++) { const an = Math.random() * 6.28, s = 3 + Math.random() * 6; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, life: 16, col: i % 2 ? '#fff' : col, size: 3 }); } break;
    case 'ultfinal': spawnFx({ k: 'flash', life: 14, a: 0.7 }); break;
    // Titan's Jungle Juggernaut: curling up into the boulder, and the big impact when it hits someone
    case 'roll': spawnFx({ k: 'ring', x, y: y - 40, life: 22, r0: 90, r1: 20, col: '#6dbb4a', lw: 6 }); for (let i = 0; i < 16; i++) { const an = Math.random() * 6.28, s = 2 + Math.random() * 4; spawnFx({ k: i % 2 ? 'leaf' : 'smoke', x, y: y - 20, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 2, g: i % 2 ? 0.1 : 0, life: 34, col: i % 2 ? (i % 4 === 1 ? '#6fd35a' : '#3fa64a') : 'rgba(200,180,140,.75)', size: i % 2 ? 7 : 12, rot: Math.random() * 6 }); } break;
    case 'rollhit': spawnFx({ k: 'ring', x, y, life: 26, r0: 20, r1: 190, col: '#d9483b', lw: 10 }); spawnFx({ k: 'ring', x, y, life: 20, r0: 10, r1: 120, col: '#ffffff', lw: 5 }); for (let i = 0; i < 30; i++) { const an = Math.random() * 6.28, s = 4 + Math.random() * 10; spawnFx({ k: i % 3 ? 'spark' : 'leaf', x, y, vx: Math.cos(an) * s + a * 3, vy: Math.sin(an) * s - 2, g: i % 3 ? 0 : 0.15, life: 30, col: i % 3 === 1 ? '#fff4c2' : i % 3 === 2 ? '#d9483b' : '#6fd35a', size: i % 3 ? 4 : 8, rot: Math.random() * 6 }); } break;
    case 'ultaim': spawnFx({ k: 'ring', x, y, life: 24, r0: 10, r1: 140, col: '#ffffff', lw: 5 }); break;
    case 'ultlock': spawnFx({ k: 'ring', x, y, life: 20, r0: 200, r1: 120, col: '#ff3b3b', lw: 6 }); break;
    case 'ultmiss': spawnFx({ k: 'ring', x, y, life: 26, r0: 120, r1: 10, col: '#c9c5e6', lw: 4 }); for (let i = 0; i < 14; i++) { const an = Math.random() * 6.28, s2 = 2 + Math.random() * 4; spawnFx({ k: 'smoke', x, y, vx: Math.cos(an) * s2, vy: Math.sin(an) * s2, life: 26, col: 'rgba(200,200,220,.6)', size: 10 }); } if (typeof ultSplash === 'function' && typeof G !== 'undefined' && G.screen === 'fight') ultSplash('MISS!'); break;
    case 'ulthitok': spawnFx({ k: 'flash', life: 8, a: 0.4 }); if (typeof ultSplash === 'function' && typeof G !== 'undefined' && G.screen === 'fight') { const uf = getF ? getF(b) : null; ultSplash(a > 1 ? 'HIT ×' + a + '!' : 'HIT!', uf ? ultDef(uf.c).colors[1] : '#ff6b2e'); } break;
    case 'ultback': spawnFx({ k: 'ring', x, y, life: 22, r0: 90, r1: 10, col: col, lw: 5 }); for (let i = 0; i < 16; i++) { const an = Math.random() * 6.28, s2 = 2 + Math.random() * 5; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s2, vy: Math.sin(an) * s2, life: 20, col: i % 2 ? '#fff' : col, size: 3 }); } break;
    case 'frzarm': spawnFx({ k: 'ring', x, y, life: 18, r0: a ? 70 : 10, r1: a ? 10 : 70, col: '#9fe7ff', lw: 4 }); break;
    case 'frzfire': spawnFx({ k: 'ring', x, y, life: 16, r0: 10, r1: 80, col: '#ffffff', lw: 5 }); for (let i = 0; i < 12; i++) { const an = Math.random() * 6.28, s2 = 2 + Math.random() * 5; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s2, vy: Math.sin(an) * s2, life: 18, col: i % 2 ? '#ffffff' : '#9fe7ff', size: 3 }); } break;
    case 'ignite': for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + (Math.random() - 0.5) * 2, s = 2 + Math.random() * 5; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, life: 22, col: i % 2 ? '#ffb02e' : '#ff4a1a', size: 3 }); } break;
    case 'zap': spawnFx({ k: 'flash', life: 5, a: 0.35, col: '255,250,200' }); spawnFx({ k: 'ring', x, y, life: 16, r0: 10, r1: 90, col: '#ffe14a', lw: 5 }); for (let i = 0; i < 16; i++) { const an = -Math.PI * Math.random(), s = 3 + Math.random() * 8; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, life: 18, col: i % 2 ? '#fff' : '#ffe14a', size: 3 }); } break;
    case 'zapline': { const x2 = a, n = Math.max(4, Math.round(Math.abs(x2 - x) / 18)); for (let i = 0; i <= n; i++) { const xx = x + (x2 - x) * i / n; spawnFx({ k: 'spark', x: xx, y: y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 14 + Math.random() * 8, col: i % 2 ? '#fffbd0' : '#ffe14a', size: 3.5 }); } spawnFx({ k: 'flash', life: 4, a: 0.2, col: '255,250,200' }); break; }
    case 'voidburst': spawnFx({ k: 'ring', x, y, life: 22, r0: a, r1: 12, col: '#e8d9ff', lw: 5 }); spawnFx({ k: 'ring', x, y, life: 26, r0: 10, r1: a * 1.3, col: '#a35cff', lw: 8 }); for (let i = 0; i < 24; i++) { const an = Math.random() * 6.28, s = 3 + Math.random() * 7; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, life: 26, col: i % 2 ? '#e8d9ff' : '#a35cff', size: 3.5 }); } break;
    case 'voidpuff': for (let i = 0; i < 4; i++) { const an = Math.random() * 6.28, rr = a * 0.6; spawnFx({ k: 'spark', x: x + Math.cos(an) * rr, y: y + Math.sin(an) * rr * 0.5, vx: -Math.cos(an) * 4, vy: -Math.sin(an) * 2, life: 16, col: '#c9a4ff', size: 3 }); } break;
    case 'leafburst': spawnFx({ k: 'ring', x, y, life: 20, r0: 10, r1: a * 1.2, col: '#8be06a', lw: 5 }); for (let i = 0; i < 26; i++) { const an = Math.random() * 6.28, s = 3 + Math.random() * 7; spawnFx({ k: 'leaf', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 2, g: 0.08, life: 40, col: i % 3 === 0 ? '#e8c24a' : i % 2 ? '#6fd35a' : '#3fa64a', size: 6, rot: i }); } break;
    case 'tzap': spawnFx({ k: 'flash', life: 6, a: 0.3, col: '200,245,255' }); spawnFx({ k: 'ring', x, y, life: 20, r0: 10, r1: 130, col: '#2fd6ff', lw: 6 }); for (let i = 0; i < 20; i++) { const an = -Math.PI * Math.random(), s = 4 + Math.random() * 9; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, life: 22, col: i % 2 ? '#f2feff' : '#2fd6ff', size: 3.5 }); } break;
    case 'thunk': for (let i = 0; i < 5; i++) spawnFx({ k: 'smoke', x, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, life: 14, col: 'rgba(200,180,140,.7)', size: 5 }); break;
    case 'catch': spawnFx({ k: 'ring', x, y, life: 12, r0: 30, r1: 6, col: '#2fd6ff', lw: 4 }); break;
    default: if (typeof fxEventNew === 'function') fxEventNew(type, x, y, a, b, col); break;
    case 'buff': spawnFx({ k: 'ring', x, y, life: 20, r0: 10, r1: 70, col: '#ff7a3c', lw: 5 }); break;
  }
}
function drawFx(g) {
  for (let i = FX.length - 1; i >= 0; i--) {
    const p = FX[i]; p.t++;
    if (p.t > p.life) { FX.splice(i, 1); continue; }
    if (p.k === 'flash') continue;
    const k = p.t / p.life;
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.94; p.vy *= 0.94;
    g.save();
    switch (p.k) {
      case 'spark': g.globalCompositeOperation = 'lighter'; g.fillStyle = p.col; g.globalAlpha = 1 - k; circle(g, p.x, p.y, p.size * (1 - k * 0.5)); g.fill(); break;
      case 'leaf': g.fillStyle = p.col; g.globalAlpha = Math.min(1, (1 - k) * 1.5); g.translate(p.x, p.y); g.rotate(p.t * 0.2 + (p.rot || 0)); g.beginPath(); g.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(20,60,20,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-p.size, 0); g.lineTo(p.size, 0); g.stroke(); break;
      case 'shard': g.fillStyle = p.col; g.globalAlpha = 1 - k; g.translate(p.x, p.y); g.rotate(p.t * 0.3); g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); break;
      case 'smoke': g.fillStyle = p.col; g.globalAlpha = (1 - k) * 0.7; circle(g, p.x, p.y, p.size * (0.6 + k)); g.fill(); break;
      case 'ring': g.strokeStyle = p.col; g.globalAlpha = 1 - k; g.lineWidth = p.lw * (1 - k * 0.6); circle(g, p.x, p.y, p.r0 + (p.r1 - p.r0) * Math.sqrt(k)); g.stroke(); break;
      case 'wave': g.strokeStyle = '#ffe0a0'; g.globalAlpha = 1 - k; g.lineWidth = 6; const w = p.w * (0.3 + 0.7 * k); g.beginPath(); g.ellipse(p.x, p.y, w, 14 * (1 - k) + 4, 0, Math.PI, Math.PI * 2); g.stroke(); break;
      case 'palm': {
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k; g.translate(p.x + p.dir * k * 30, p.y); g.scale(1 + k * 0.8, 1 + k * 0.8);
        g.fillStyle = 'rgba(255,215,110,.8)'; g.beginPath(); g.ellipse(0, 6, 22, 26, 0, 0, Math.PI * 2); g.fill();
        for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(-15 + i * 10, -26, 5, 13, 0, 0, Math.PI * 2); g.fill(); }
        g.beginPath(); g.ellipse(p.dir * 24, 6, 5, 12, p.dir * 0.8, 0, Math.PI * 2); g.fill(); break;
      }
      default: if (typeof drawFxNew === 'function') drawFxNew(g, p, k); break;
      case 'beam': {
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k; g.translate(p.x, p.y); g.rotate(p.ang);
        const L = 1400, w = 70 * (1 - k * 0.7);
        const gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.2, p.col); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(L, -w); g.lineTo(L, w); g.closePath(); g.fill(); break;
      }
    }
    g.restore();
  }
}
function drawFlash(g, vw, vh) {
  for (const p of FX) if (p.k === 'flash') { g.fillStyle = `rgba(${p.col || '255,255,255'},${p.a * (1 - p.t / p.life)})`; g.fillRect(0, 0, vw, vh); }
}

/* ---------- camera ---------- */
const CAM = { x: 800, y: 480, z: 0.6, init: false };
function updateCam(view, vw, vh, hudH) {
  const st = view.stage, B = st.blast, topS = Math.min(...st.solids.map(s => s.y));
  let minx = st.cx - 340, maxx = st.cx + 340, miny = topS - 250, maxy = topS + 70;
  for (const f of view.fighters) {
    if (f.out || f.dead > 0) continue;
    minx = Math.min(minx, f.x - 70); maxx = Math.max(maxx, f.x + 70);
    miny = Math.min(miny, f.y - f.H - 70); maxy = Math.max(maxy, f.y + 50);
  }
  minx = Math.max(minx, B.l); maxx = Math.min(maxx, B.r); miny = Math.max(miny, B.t); maxy = Math.min(maxy, B.b);
  const ah = Math.max(100, vh - hudH);
  let z = Math.min(vw / (maxx - minx + 140), ah / (maxy - miny + 120));
  z = clamp(z, Math.min(vw, ah) / 1800, Math.min(vw, ah) / 380);
  const tx = (minx + maxx) / 2, ty = (miny + maxy) / 2;
  if (!CAM.init) { CAM.x = tx; CAM.y = ty; CAM.z = z; CAM.init = true; }
  CAM.z += (z - CAM.z) * 0.07; CAM.x += (tx - CAM.x) * 0.1; CAM.y += (ty - CAM.y) * 0.1;
}

/* ---------- main scene render ---------- */
function renderScene(g, view, vw, vh, t, opts) {
  const hudH = opts.hud ? (opts.hudTop ? (vh < 420 ? 60 : 72) : (vw < 560 ? 78 : 92)) : 0;
  const lp = opts.leftPad || 0, cxs = lp + (vw - lp) / 2;
  updateCam(view, vw - lp, vh, hudH);
  drawBackground(g, view.stage, vw, vh, CAM, t);
  if (typeof drawStageSky === 'function' && view.stage.solids) drawStageSky(g, view.stage, vw, vh, t);
  const ah = vh - hudH;
  const top = opts.hudTop ? hudH : 0;
  const sh = (typeof SETTINGS === 'undefined' || SETTINGS.shake) ? (view.shake || 0) : 0;
  const ox = (Math.random() - 0.5) * sh * 0.8, oy = (Math.random() - 0.5) * sh * 0.8;
  const toS = (x, y) => [(x - CAM.x) * CAM.z + cxs, (y - CAM.y) * CAM.z + ah / 2 + top];
  g.save();
  g.translate(cxs + ox, ah / 2 + oy + top); g.scale(CAM.z, CAM.z); g.translate(-CAM.x, -CAM.y);
  drawStage(g, view.stage, t);
  for (const f of view.fighters) {
    if (f.out || f.dead > 0 || f.vanish) continue;
    g.fillStyle = 'rgba(0,0,0,.25)';
    const gy = shadowY(view.stage, f);
    if (gy !== null) { g.beginPath(); g.ellipse(f.x, gy, f.W * 0.45, 5, 0, 0, Math.PI * 2); g.fill(); }
  }
  view.projs.forEach(p => drawProj(g, p, t));
  if (view.orb) drawOrb(g, view.orb, t);
  const order = view.fighters.slice().sort((a, b) => (a.hot ? 1 : 0) - (b.hot ? 1 : 0));
  for (const f of order) {
    if (f.out || f.dead > 0 || f.vanish) continue;
    if (f.flyT > 0) drawFighterFx(g, Object.assign({}, f, { shielding: false, frozen: 0, pose: 'x', armor: false, halo: 0, buffT: 0 }), t);
    if (typeof drawGhosts === 'function') drawGhosts(g, f, f.anim || t);
    drawFighter(g, f, f.anim || t);
    drawSwoosh(g, f, t);
    drawFighterFx(g, Object.assign({}, f, { flyT: 0 }), t);
    drawUltAura(g, f, t);
  }
  drawFx(g);
  drawUltWorld(g, view, t);
  if (typeof drawUltAim === 'function') drawUltAim(g, view, t);
  g.restore();
  // name tags + offscreen bubbles
  for (const f of view.fighters) {
    if (f.out || f.dead > 0 || f.vanish) continue;
    let [sx, sy] = toS(f.x, f.y - f.H);
    const off = sx < 0 || sx > vw || sy < top || sy > ah + top + 20;
    if (off) {
      const cx = clamp(sx, 34, vw - 34), cy = clamp(sy + f.H * CAM.z * 0.5, top + 34, top + ah - 34);
      circle(g, cx, cy, 26); g.fillStyle = 'rgba(17,14,36,.85)'; g.fill(); g.strokeStyle = f.color; g.lineWidth = 3; g.stroke();
      g.save(); g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.clip();
      g.translate(cx, cy + 20); g.scale(0.36, 0.36);
      drawFighter(g, Object.assign({}, f, { x: 0, y: 0 }), t, true);
      g.restore();
    } else if (opts.tags && (typeof SETTINGS === 'undefined' || SETTINGS.tags)) {
      const tag = f.tag || '';
      g.font = '700 12px "Chakra Petch", system-ui, sans-serif';
      const w = g.measureText(tag).width + 12;
      g.fillStyle = f.color; rrect(g, sx - w / 2, sy - 30, w, 18, 5); g.fill();
      g.beginPath(); g.moveTo(sx - 5, sy - 12); g.lineTo(sx + 5, sy - 12); g.lineTo(sx, sy - 6); g.fill();
      g.fillStyle = '#120d24'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tag, sx, sy - 21);
    }
  }
  if (opts.localSlot != null) {
    const f = view.fighters.find(o => o.slot === opts.localSlot);
    if (f && !f.out && !f.dead && f.pose === 'ledge') {
      const [sx, sy] = toS(f.x, f.y - f.H - 8);
      const txt = opts.touchHint ? 'JUMP: leap up  ·  push stick in: climb' : `Space: leap up  ·  ${f.face > 0 ? '\u2192' : '\u2190'}: climb  ·  L: roll in`;
      g.font = '600 12px "Chakra Petch", system-ui, sans-serif';
      const w = g.measureText(txt).width + 16, x = clamp(sx - w / 2, 8, vw - w - 8), y = sy - 58;
      g.fillStyle = 'rgba(17,14,36,.9)'; rrect(g, x, y, w, 22, 6); g.fill();
      g.strokeStyle = '#ffb547'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, x + 8, y + 11);
    }
  }
  drawUltTint(g, view, vw, vh, t);
  drawFlash(g, vw, vh);
  if (opts.hud) drawHUD(g, view, vw, vh, hudH, t, !!opts.hudTop);
  if (opts.hud) drawTimerAndBanner(g, view, vw, vh, hudH, t, !!opts.hudTop, cxs);
  if (opts.hud && view.over) {
    const k = Math.min(1, (view.overT || 30) / 20);
    g.save(); g.translate(vw / 2, top + ah * 0.42); g.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
    g.font = `${Math.min(120, vw * 0.2)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = '#120d24'; g.strokeText('GAME!', 0, 0);
    const gr = g.createLinearGradient(0, -50, 0, 50); gr.addColorStop(0, '#fff3c4'); gr.addColorStop(1, '#ffb547');
    g.fillStyle = gr; g.fillText(view.timeUp ? 'TIME!' : 'GAME!', 0, 0); g.restore();
  }
  drawUltCutscene(g, view, vw, vh, t);
  if (typeof drawUltAimHud === 'function') drawUltAimHud(g, view, vw, vh, t, opts.localSlot);
  if (typeof drawUltSplash === 'function') drawUltSplash(g, vw, vh);
}

function drawTimerAndBanner(g, view, vw, vh, hudH, t, atTop, cx) {
  const y0 = atTop ? hudH + 8 : 10;
  if (view.timeLeft > 0) {
    const sec = Math.ceil(view.timeLeft / 60), mm = Math.floor(sec / 60), ss = sec % 60;
    const txt = mm + ':' + String(ss).padStart(2, '0'), low = sec <= 10;
    g.font = `${low ? 30 : 22}px "Dela Gothic One", Impact, sans-serif`;
    const w = g.measureText(txt).width + 24, h = low ? 40 : 32;
    g.fillStyle = 'rgba(17,14,36,.8)'; rrect(g, cx - w / 2, y0, w, h, 8); g.fill();
    g.strokeStyle = low ? '#ff5a4d' : 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = low ? ((t >> 4) & 1 ? '#ff5a4d' : '#fff') : '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, cx, y0 + h / 2 + 1);
  }
  const bn = view.stage.solids ? stageBanner(view.stage, view.stage.frame) : null;
  if (bn && (t >> 4) & 1) {
    g.font = `${Math.min(34, vw * 0.06)}px "Dela Gothic One", Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 7; g.strokeStyle = '#120d24'; g.strokeText(bn[0], cx, y0 + 70); g.fillStyle = bn[1]; g.fillText(bn[0], cx, y0 + 70);
  }
}

function shadowY(st, f) {
  let best = null;
  for (const s of st.surfaces) if (!s.off && f.x >= s.x && f.x <= s.x + s.w && s.y >= f.y - 1 && (best === null || s.y < best)) best = s.y;
  return best;
}

function dmgColor(d) {
  if (d < 40) return '#f5f2ff';
  if (d < 80) return '#ffe38a';
  if (d < 120) return '#ffa24d';
  if (d < 170) return '#ff5a4d';
  return '#d62a4a';
}

function drawHUD(g, view, vw, vh, hudH, t, atTop) {
  const fs = view.fighters, n = fs.length;
  const gap = 8, cw = Math.min(210, (vw - 16 - gap * (n - 1)) / n), total = cw * n + gap * (n - 1);
  let x = (vw - total) / 2; const y = atTop ? 6 : vh - hudH + 6, h = hudH - 12;
  const small = cw < 150 || h < 56, tiny = h < 56;
  fs.forEach(f => {
    g.save();
    rrect(g, x, y, cw, h, 10); g.fillStyle = 'rgba(17,14,36,.82)'; g.fill();
    g.lineWidth = 2; g.strokeStyle = f.out ? '#3a3360' : f.color; g.stroke();
    g.save(); rrect(g, x, y, cw, h, 10); g.clip();
    const pr = small ? 0 : h * 0.9;
    if (!small) {
      g.fillStyle = hexA(f.color, 0.25); g.fillRect(x, y, pr, h);
      g.save(); g.beginPath(); g.rect(x, y, pr, h); g.clip();
      g.translate(x + pr / 2, y + h + 6); const s = (h * 1.15) / (f.H * 1.2); g.scale(s, s);
      drawFighter(g, { c: f.c, W: f.W, H: f.H, x: 0, y: 0, face: 1, pose: 'idle', pt: 0, inv: 0 }, t, true);
      g.restore();
    }
    g.restore();
    if (f.out) g.globalAlpha = 0.45;
    const tx = x + pr + 10;
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.fillStyle = f.color; g.font = `700 ${small ? 11 : 12}px "Chakra Petch", system-ui, sans-serif`;
    // name on the left, fighter name after it, both kept clear of the life dots
    const dotsW = view.endless ? 0 : Math.min(f.stocks, 6) * (small ? 8 : 10) + 8;
    const room = x + cw - dotsW - tx - 4;
    const fit = (str, w) => { if (g.measureText(str).width <= w) return str; let k = str.length; while (k > 1 && g.measureText(str.slice(0, k) + '…').width > w) k--; return str.slice(0, k) + '…'; };
    const tag = fit(String(f.tag || ''), room);
    g.fillText(tag, tx, y + (tiny ? 14 : 16));
    const tagW = g.measureText(tag).width;
    g.fillStyle = '#a39cc9'; g.font = `500 ${small ? 10 : 11}px "Chakra Petch", system-ui, sans-serif`;
    const left = room - tagW - 8;
    if (left > 24) g.fillText(fit(f.c.name, left), tx + tagW + 8, y + 16);
    const d = Math.floor(f.dmg);
    const bump = f.lastBump && t - f.lastBump < 8 ? 1.15 : 1;
    g.font = `${Math.round((tiny ? 21 : small ? 26 : 32) * bump)}px "Dela Gothic One", Impact, sans-serif`;
    g.lineWidth = 5; g.strokeStyle = '#120d24';
    const txt = f.out ? 'OUT' : d + '%';
    const by = y + h - (tiny ? 5 : 10); g.strokeText(txt, tx, by); g.fillStyle = f.out ? '#6f6899' : dmgColor(d); g.fillText(txt, tx, by);
    if ((f.ult || f.avalanche) && !f.out) {
      g.save(); g.font = '700 10px "Chakra Petch", system-ui, sans-serif'; const bw = 34;
      g.fillStyle = `hsl(${(t * 4) % 360},90%,60%)`; rrect(g, x + cw - bw - 6, y + h - 20, bw, 15, 4); g.fill();
      g.fillStyle = '#120d24'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(f.avalanche ? (f.avalanche.left / 60).toFixed(1) + 's' : 'ULT', x + cw - bw / 2 - 6, y + h - 12); g.restore();
    }
    if (!view.endless) {
      const sp = small ? 8 : 10;
      for (let i = 0; i < Math.min(f.stocks, 6); i++) { circle(g, x + cw - 10 - i * sp, y + 13, small ? 3 : 3.8); g.fillStyle = f.color; g.fill(); }
      if (f.stocks > 6) { g.fillStyle = '#fff'; g.font = '600 11px "Chakra Petch"'; g.textAlign = 'right'; g.fillText('×' + f.stocks, x + cw - 8, y + 30); }
    }
    g.restore();
    x += cw + gap;
  });
}
