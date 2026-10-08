'use strict';
/* ===== CLOUDTOP BRAWL — five more stages =====
   To add a stage: push an entry into STAGES, call prepStage on it,
   and give it bg/fg drawing functions in STAGE_ART (plus a music theme in TRACKS). */

[
  { id: 'forge', name: 'Magma Forge', main: { x: 480, y: 640, w: 640, h: 90 },
    plats: [{ x: 560, y: 500, w: 140 }, { x: 900, y: 500, w: 140 }], swatch: ['#1a0606', '#6a1a0c', '#ff7a1a'] },
  { id: 'peak', name: 'Frozen Peak', main: { x: 520, y: 630, w: 560, h: 80 },
    plats: [{ x: 590, y: 500, w: 130 }, { x: 880, y: 500, w: 130 }, { x: 735, y: 385, w: 130 }], swatch: ['#6fb4f0', '#cfeaff', '#ffffff'] },
  { id: 'orbit', name: 'Orbit Station', main: { x: 500, y: 620, w: 600, h: 60 },
    plats: [], swatch: ['#05040f', '#2b1d5c', '#46e0ff'] },
  { id: 'cove', name: 'Pirate Cove', main: { x: 470, y: 640, w: 660, h: 70 },
    plats: [{ x: 575, y: 470, w: 120 }, { x: 930, y: 520, w: 150 }], swatch: ['#ff9a5a', '#e2557a', '#1d5a8a'] },
  { id: 'dojo', name: 'Sakura Dojo', main: { x: 520, y: 620, w: 560, h: 70 },
    plats: [{ x: 600, y: 485, w: 140 }, { x: 860, y: 485, w: 140 }], swatch: ['#3b2a4a', '#b0689a', '#f7c3d4'] }
].forEach(s => { prepStage(s); STAGES.push(s); });

const R2 = (() => { let s = 97531; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const ART = {
  embers: Array.from({ length: 40 }, () => ({ x: R2(), y: R2(), s: 0.5 + R2(), p: R2() * 6 })),
  snow: Array.from({ length: 70 }, () => ({ x: R2(), y: R2(), s: 0.6 + R2() * 1.4, p: R2() * 6 })),
  stars: Array.from({ length: 120 }, () => ({ x: R2(), y: R2(), s: R2() * 1.6 + 0.3, p: R2() * 6 })),
  petals: Array.from({ length: 36 }, () => ({ x: R2(), y: R2(), s: 0.6 + R2(), p: R2() * 6 })),
  ridge: Array.from({ length: 16 }, () => 0.2 + R2() * 0.3),
  trees: Array.from({ length: 12 }, () => ({ x: R2(), r: 0.05 + R2() * 0.05 }))
};
const wrap = (v, m) => ((v % m) + m) % m;

const STAGE_ART = {
  forge: {
    bg(g, vw, vh, cam, t) {
      const px = cam.x - 800;
      const gr = g.createLinearGradient(0, 0, 0, vh); gr.addColorStop(0, '#140404'); gr.addColorStop(0.55, '#4a0e0a'); gr.addColorStop(1, '#c2410c');
      g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
      const vx = vw * 0.62 - px * 0.04, vy = vh * 0.45;
      g.fillStyle = '#240807'; g.beginPath(); g.moveTo(vx - vw * 0.45, vh); g.lineTo(vx - 60, vy); g.lineTo(vx + 60, vy); g.lineTo(vx + vw * 0.45, vh); g.fill();
      const cg = g.createRadialGradient(vx, vy, 0, vx, vy, 140); cg.addColorStop(0, 'rgba(255,170,60,.9)'); cg.addColorStop(1, 'rgba(255,80,20,0)');
      g.fillStyle = cg; g.fillRect(vx - 160, vy - 160, 320, 320);
      g.strokeStyle = 'rgba(255,120,40,.5)'; g.lineWidth = 3;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(vx - 20 + i * 20, vy); g.lineTo(vx - 90 + i * 70 + Math.sin(t * 0.02 + i) * 8, vh); g.stroke(); }
      g.fillStyle = '#1a0605'; g.beginPath(); g.moveTo(0, vh);
      ART.ridge.forEach((h, i) => g.lineTo(i / 15 * vw * 1.2 - vw * 0.1 - px * 0.08, vh * (1 - h * 0.6)));
      g.lineTo(vw, vh); g.fill();
      g.save(); g.globalCompositeOperation = 'lighter';
      ART.embers.forEach(e => { const y = wrap(e.y * vh - t * e.s * 0.8, vh); g.fillStyle = `rgba(255,${120 + (e.p * 20 | 0)},40,${0.5 + 0.5 * Math.sin(t * 0.1 + e.p)})`; g.fillRect(e.x * vw + Math.sin(t * 0.03 + e.p) * 12, y, 2.5, 2.5); });
      g.restore();
    },
    fg(g, st, t) {
      const m = st.main;
      const lg = g.createLinearGradient(0, m.y + m.h, 0, m.y + m.h + 400); lg.addColorStop(0, '#ff8a1f'); lg.addColorStop(1, '#8a1a05');
      g.fillStyle = lg; g.fillRect(st.blast.l, m.y + m.h + 150 + Math.sin(t * 0.03) * 6, st.blast.r - st.blast.l, 600);
      g.beginPath(); g.moveTo(m.x, m.y + m.h); g.lineTo(m.x + m.w, m.y + m.h); g.lineTo(m.x + m.w - 90, m.y + m.h + 170); g.lineTo(m.x + 90, m.y + m.h + 170); g.closePath();
      g.fillStyle = '#151218'; g.fill();
      g.fillStyle = '#1d1a22'; g.fillRect(m.x, m.y, m.w, m.h);
      g.save(); g.shadowColor = '#ff7a1a'; g.shadowBlur = 12; g.strokeStyle = `rgba(255,${130 + Math.sin(t * 0.08) * 40 | 0},40,.9)`; g.lineWidth = 3;
      [[0.1, 0.3, 0.2, 0.8], [0.35, 0.15, 0.45, 0.9], [0.6, 0.2, 0.52, 0.7], [0.82, 0.3, 0.9, 0.85]].forEach(([a, b, c2, d]) => { g.beginPath(); g.moveTo(m.x + m.w * a, m.y + m.h * b); g.lineTo(m.x + m.w * (a + c2) / 2 + 10, m.y + m.h * 0.5); g.lineTo(m.x + m.w * c2, m.y + m.h * d); g.stroke(); });
      g.restore();
      g.fillStyle = '#3a3440'; g.fillRect(m.x - 4, m.y, m.w + 8, 8);
      st.plats.forEach(p => {
        g.strokeStyle = '#4a4450'; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x + 10, p.y); g.lineTo(p.x + 10, p.y - 400); g.moveTo(p.x + p.w - 10, p.y); g.lineTo(p.x + p.w - 10, p.y - 400); g.stroke();
        g.fillStyle = '#3a3440'; g.fillRect(p.x, p.y, p.w, 10);
        g.fillStyle = '#ff8a1f'; for (let x = p.x + 6; x < p.x + p.w - 6; x += 12) g.fillRect(x, p.y + 3, 6, 3);
      });
    }
  },
  peak: {
    bg(g, vw, vh, cam, t) {
      const px = cam.x - 800;
      const gr = g.createLinearGradient(0, 0, 0, vh); gr.addColorStop(0, '#5a9fe0'); gr.addColorStop(0.6, '#bfe3ff'); gr.addColorStop(1, '#eef8ff');
      g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
      [[0.55, '#dcecf8', 0.03, 0.9], [0.7, '#b8d4ea', 0.07, 0.75], [0.85, '#8fb3d3', 0.12, 0.6]].forEach(([base, col, par, amp], li) => {
        g.fillStyle = col; g.beginPath(); g.moveTo(0, vh);
        for (let i = 0; i <= 10; i++) { const x = i / 10 * vw * 1.3 - vw * 0.15 - px * par; const h = ART.ridge[(i + li * 3) % 16] * amp; g.lineTo(x, vh * (base - h * 0.5 + (i % 2 ? 0.1 : 0))); }
        g.lineTo(vw, vh); g.fill();
      });
      g.fillStyle = 'rgba(255,255,255,.85)';
      ART.snow.forEach(s => { const y = wrap(s.y * vh + t * s.s * 0.7, vh); const x = wrap(s.x * vw + Math.sin(t * 0.02 + s.p) * 20 - px * 0.05, vw); circle(g, x, y, s.s * 1.4); g.fill(); });
    },
    fg(g, st, t) {
      const m = st.main;
      g.fillStyle = '#9fd4f2'; g.fillRect(m.x, m.y, m.w, m.h);
      g.fillStyle = '#c9ecff'; g.fillRect(m.x + 10, m.y + 18, m.w - 20, 10);
      g.fillStyle = '#7fbde3';
      for (let x = m.x + 8; x < m.x + m.w - 8; x += 26) { g.beginPath(); g.moveTo(x, m.y + m.h); g.lineTo(x + 13, m.y + m.h); g.lineTo(x + 6, m.y + m.h + 18 + (x % 3) * 10); g.fill(); }
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(m.x - 8, m.y + 6);
      for (let x = m.x - 8; x <= m.x + m.w + 8; x += 20) g.quadraticCurveTo(x + 10, m.y - 8, x + 20, m.y + 4);
      g.lineTo(m.x + m.w + 8, m.y + 10); g.lineTo(m.x - 8, m.y + 10); g.fill();
      st.plats.forEach(p => {
        g.fillStyle = 'rgba(190,235,255,.75)'; g.fillRect(p.x, p.y, p.w, 12);
        g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.strokeRect(p.x, p.y, p.w, 12);
        g.fillStyle = '#fff'; g.fillRect(p.x - 2, p.y - 3, p.w + 4, 5);
      });
    }
  },
  orbit: {
    bg(g, vw, vh, cam, t) {
      const px = cam.x - 800;
      const gr = g.createLinearGradient(0, 0, vw, vh); gr.addColorStop(0, '#05040f'); gr.addColorStop(1, '#1d1245');
      g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
      ART.stars.forEach(s => { g.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(t * 0.02 + s.p))})`; g.fillRect(wrap(s.x * vw - px * 0.02 * s.s, vw), s.y * vh, s.s, s.s); });
      const cx = vw * 0.25 - px * 0.03, cy = vh * 0.78, r = vh * 0.34;
      const pg = g.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r); pg.addColorStop(0, '#6ad3ff'); pg.addColorStop(0.6, '#2a5fb8'); pg.addColorStop(1, '#10204a');
      g.fillStyle = pg; circle(g, cx, cy, r); g.fill();
      g.strokeStyle = 'rgba(200,170,255,.5)'; g.lineWidth = 6; g.beginPath(); g.ellipse(cx, cy, r * 1.6, r * 0.3, -0.25, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#f2e8d0'; circle(g, vw * 0.82 - px * 0.05, vh * 0.2, 16); g.fill();
    },
    fg(g, st, t) {
      const m = st.main;
      g.save(); g.globalCompositeOperation = 'lighter';
      [0.2, 0.5, 0.8].forEach(k => {
        const x = m.x + m.w * k, l = 60 + Math.random() * 30;
        const fg2 = g.createLinearGradient(x, m.y + m.h + 30, x, m.y + m.h + 30 + l);
        fg2.addColorStop(0, '#bff4ff'); fg2.addColorStop(1, 'rgba(70,224,255,0)');
        g.fillStyle = fg2; g.beginPath(); g.moveTo(x - 14, m.y + m.h + 30); g.lineTo(x + 14, m.y + m.h + 30); g.lineTo(x, m.y + m.h + 30 + l); g.fill();
      });
      g.restore();
      g.fillStyle = '#2a2f40'; [0.2, 0.5, 0.8].forEach(k => g.fillRect(m.x + m.w * k - 20, m.y + m.h, 40, 32));
      g.beginPath(); g.moveTo(m.x - 20, m.y); g.lineTo(m.x + m.w + 20, m.y); g.lineTo(m.x + m.w - 20, m.y + m.h); g.lineTo(m.x + 20, m.y + m.h); g.closePath();
      g.fillStyle = '#3b4256'; g.fill();
      g.fillStyle = '#50586e'; g.fillRect(m.x - 20, m.y, m.w + 40, 10);
      g.save(); g.shadowColor = '#46e0ff'; g.shadowBlur = 10;
      for (let x = m.x + 10; x < m.x + m.w - 10; x += 40) { g.fillStyle = ((x / 40 + (t >> 3)) % 6 | 0) === 0 ? '#ffffff' : '#46e0ff'; g.fillRect(x, m.y + 26, 22, 4); }
      g.restore();
    }
  },
  cove: {
    bg(g, vw, vh, cam, t) {
      const px = cam.x - 800;
      const gr = g.createLinearGradient(0, 0, 0, vh * 0.62); gr.addColorStop(0, '#6a3a8a'); gr.addColorStop(0.5, '#e2557a'); gr.addColorStop(1, '#ffb36a');
      g.fillStyle = gr; g.fillRect(0, 0, vw, vh * 0.62);
      const sx = vw * 0.5 - px * 0.02;
      g.fillStyle = '#ffe0a0'; circle(g, sx, vh * 0.6, vh * 0.1); g.fill();
      const sg = g.createLinearGradient(0, vh * 0.6, 0, vh); sg.addColorStop(0, '#2c6fa0'); sg.addColorStop(1, '#0f2f55');
      g.fillStyle = sg; g.fillRect(0, vh * 0.6, vw, vh * 0.4);
      g.fillStyle = 'rgba(255,220,150,.5)';
      for (let i = 0; i < 12; i++) { const y = vh * 0.62 + i * 12; const w = (80 - i * 5) * (1 + 0.15 * Math.sin(t * 0.05 + i)); g.fillRect(sx - w / 2, y, w, 3); }
      g.fillStyle = '#1d3a2a'; g.beginPath(); g.moveTo(vw * 0.75 - px * 0.05, vh * 0.61); g.quadraticCurveTo(vw * 0.88 - px * 0.05, vh * 0.42, vw * 1.02 - px * 0.05, vh * 0.61); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2;
      for (let r = 0; r < 6; r++) { const y = vh * (0.66 + r * 0.06); g.beginPath(); for (let x = 0; x <= vw; x += 20) g.lineTo(x, y + Math.sin(x * 0.03 + t * 0.05 + r) * 3); g.stroke(); }
    },
    fg(g, st, t) {
      const m = st.main, bob = Math.sin(t * 0.03) * 2;
      g.save(); g.translate(0, bob);
      const mastX = m.x + 175;
      g.fillStyle = '#5a3a22'; g.fillRect(mastX - 7, m.y - 330, 14, 330);
      g.fillStyle = '#f3e6c8'; g.beginPath(); g.moveTo(mastX + 8, m.y - 300); g.quadraticCurveTo(mastX + 150, m.y - 230, mastX + 8, m.y - 120); g.fill();
      g.fillStyle = '#1a1a1a'; g.fillRect(mastX - 6, m.y - 360, 34, 20);
      g.fillStyle = '#6b4424';
      g.beginPath(); g.moveTo(m.x - 20, m.y); g.lineTo(m.x + m.w + 40, m.y); g.lineTo(m.x + m.w - 20, m.y + m.h + 50); g.lineTo(m.x + 30, m.y + m.h + 50); g.closePath(); g.fill();
      g.strokeStyle = '#4a2c16'; g.lineWidth = 2;
      for (let y = m.y + 18; y < m.y + m.h + 50; y += 16) { g.beginPath(); g.moveTo(m.x, y); g.lineTo(m.x + m.w, y); g.stroke(); }
      g.fillStyle = '#c9a26a'; g.fillRect(m.x - 20, m.y, m.w + 60, 10);
      g.fillStyle = '#2a1a0e'; for (let x = m.x + 60; x < m.x + m.w; x += 110) { circle(g, x, m.y + 40, 9); g.fill(); }
      st.plats.forEach(p => {
        g.fillStyle = '#7a5030'; g.fillRect(p.x, p.y, p.w, 12);
        g.fillStyle = '#5a3a22'; g.fillRect(p.x + 8, p.y + 12, 8, 30); g.fillRect(p.x + p.w - 16, p.y + 12, 8, 30);
      });
      g.restore();
      g.fillStyle = 'rgba(20,70,120,.55)';
      g.beginPath(); g.moveTo(st.blast.l, st.blast.b);
      for (let x = st.blast.l; x <= st.blast.r; x += 30) g.lineTo(x, m.y + m.h + 40 + Math.sin(x * 0.02 + t * 0.06) * 6);
      g.lineTo(st.blast.r, st.blast.b); g.fill();
    }
  },
  dojo: {
    bg(g, vw, vh, cam, t) {
      const px = cam.x - 800;
      const gr = g.createLinearGradient(0, 0, 0, vh); gr.addColorStop(0, '#2e2140'); gr.addColorStop(0.6, '#8a5485'); gr.addColorStop(1, '#f2b5c8');
      g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
      g.fillStyle = '#fff3e0'; circle(g, vw * 0.7 - px * 0.02, vh * 0.25, vh * 0.09); g.fill();
      g.fillStyle = '#4a2f52'; g.beginPath(); g.moveTo(0, vh);
      for (let i = 0; i <= 8; i++) g.lineTo(i / 8 * vw * 1.2 - vw * 0.1 - px * 0.04, vh * (0.62 - ART.ridge[i] * 0.3));
      g.lineTo(vw, vh); g.fill();
      ART.trees.forEach((tr, i) => {
        const x = tr.x * vw * 1.2 - vw * 0.1 - px * 0.08, y = vh * 0.78;
        g.strokeStyle = '#3a2233'; g.lineWidth = 6; g.beginPath(); g.moveTo(x, vh); g.lineTo(x, y); g.stroke();
        g.fillStyle = i % 2 ? '#e58db0' : '#f4b2cb';
        for (let k = 0; k < 4; k++) { circle(g, x + Math.cos(k * 1.6) * vh * tr.r, y - vh * tr.r * 0.6 + Math.sin(k * 1.6) * vh * tr.r * 0.5, vh * tr.r * 0.8); g.fill(); }
      });
      g.fillStyle = '#ffc6d9';
      ART.petals.forEach(p => { const y = wrap(p.y * vh + t * p.s * 0.6, vh), x = wrap(p.x * vw + Math.sin(t * 0.02 + p.p) * 40 - t * 0.3, vw); g.save(); g.translate(x, y); g.rotate(t * 0.03 + p.p); g.beginPath(); g.ellipse(0, 0, 4 * p.s, 2.2 * p.s, 0, 0, Math.PI * 2); g.fill(); g.restore(); });
    },
    fg(g, st, t) {
      const m = st.main;
      g.fillStyle = '#6a6470'; g.beginPath(); g.moveTo(m.x + 20, m.y + m.h); g.lineTo(m.x + m.w - 20, m.y + m.h); g.lineTo(m.x + m.w - 70, m.y + m.h + 120); g.lineTo(m.x + 70, m.y + m.h + 120); g.closePath(); g.fill();
      g.fillStyle = '#8a4a2e'; g.fillRect(m.x, m.y + 12, m.w, m.h - 12);
      g.fillStyle = '#c79a63'; g.fillRect(m.x - 6, m.y, m.w + 12, 14);
      g.strokeStyle = '#a57a47'; g.lineWidth = 1.5; for (let x = m.x + 40; x < m.x + m.w; x += 40) { g.beginPath(); g.moveTo(x, m.y); g.lineTo(x, m.y + 14); g.stroke(); }
      [m.x + 12, m.x + m.w - 12].forEach(x => {
        g.fillStyle = '#c62f2a'; g.fillRect(x - 6, m.y - 150, 12, 150);
      });
      g.fillStyle = '#c62f2a'; g.fillRect(m.x - 20, m.y - 160, 60, 12); g.fillRect(m.x + m.w - 40, m.y - 160, 60, 12);
      g.fillStyle = '#1e1a22'; g.fillRect(m.x - 26, m.y - 172, 72, 10); g.fillRect(m.x + m.w - 46, m.y - 172, 72, 10);
      st.plats.forEach(p => {
        g.fillStyle = '#a57a47'; g.fillRect(p.x, p.y, p.w, 10);
        g.fillStyle = '#c62f2a'; g.fillRect(p.x, p.y + 10, p.w, 4);
        g.strokeStyle = '#1e1a22'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x + 14, p.y + 14); g.lineTo(p.x + 14, p.y + 26); g.moveTo(p.x + p.w - 14, p.y + 14); g.lineTo(p.x + p.w - 14, p.y + 26); g.stroke();
        g.fillStyle = '#ffd35c'; circle(g, p.x + 14, p.y + 32, 5); g.fill(); circle(g, p.x + p.w - 14, p.y + 32, 5); g.fill();
      });
    }
  }
};
