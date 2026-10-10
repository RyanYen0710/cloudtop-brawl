'use strict';
/* ===== CLOUDTOP BRAWL — ultimate "style" animations =====
   Each fighter's ultimate behaves differently (see ULT_STYLES in ult.js). This file draws what each
   behavior is doing, on top of the fighter's themed art: sharks charging in, the black hole pulling,
   lightning landing exactly where it strikes, and so on. Drawing only — the game rules never read it.
   Kept light: plain shapes, a handful of particles, fewer on slow devices (PERF.low). */

const UFX_LOW = () => typeof PERF !== 'undefined' && PERF.low;
/* when small hit number i lands (same formula as stepUlt) */
const ufxHitAt = (i, hits) => 6 + Math.floor(i * (ULT_FX_FINAL - 14) / hits);
const ufxSeed = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
const ufxEase = p => p < 0 ? 0 : p > 1 ? 1 : 1 - (1 - p) * (1 - p);

function ufxShark(g, x, y, s, dir, col) {
  g.save(); g.translate(x, y); g.scale(dir * s, s);
  g.fillStyle = col; g.strokeStyle = '#0a2236'; g.lineWidth = 3 / s;
  g.beginPath(); g.moveTo(46, 0); g.quadraticCurveTo(10, -20, -34, -6); g.lineTo(-54, -20); g.lineTo(-46, 0); g.lineTo(-54, 18); g.lineTo(-34, 6); g.quadraticCurveTo(10, 18, 46, 0); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(4, -12); g.lineTo(-8, -32); g.lineTo(-14, -10); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#e9fbff'; g.beginPath(); g.moveTo(44, 2); g.quadraticCurveTo(14, 12, -24, 5); g.quadraticCurveTo(14, 6, 44, 2); g.fill();
  g.fillStyle = '#0a2236'; g.beginPath(); g.arc(30, -4, 2.6, 0, Math.PI * 2); g.fill();
  g.restore();
}
function ufxBall(g, x, y, r, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = '#ff8a1f'; g.strokeStyle = '#2a1404'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.moveTo(0, -r); g.lineTo(0, r); g.stroke();
  g.beginPath(); g.arc(-r * 1.4, 0, r, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(r * 1.4, 0, r, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
  g.restore();
}
function ufxBolt(g, x, top, y, seed, w, col) {
  g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x, top);
  let lx = x, ly = top, i = 0; const step = Math.max(30, (y - top) / 9);
  while (ly < y - step) { ly += step; lx = x + (ufxSeed(seed + i++) - 0.5) * 60; g.lineTo(lx, ly); }
  g.lineTo(x, y); g.stroke();
}

/* drawn every frame of the finisher, in world space */
function drawUltStyle(g, view, t) {
  const u = view.ult; if (!u || (u.ph && u.ph !== 'fx')) return;
  const f = view.fighters.find(x => x.slot === u.slot); if (!f) return;
  const def = ultDef(f.c), sty = def.style; if (!sty) return;
  const k = u.t - ULT_CUT; if (k <= 0 || k > ULT_FX_END) return;
  const S = ULT_STYLES[sty] || {}, hits = def.hits || 3, FIN = ULT_FX_FINAL, col = def.colors;
  const tg = (u.targets || []).map(s => view.fighters.find(x => x.slot === s)).filter(o => o && !o.out && !o.dead);
  const low = UFX_LOW(), B = view.stage.blast;
  g.save();
  // free styles: show the danger zone so players can see where to run
  if (S.free && k < FIN) {
    const R = ULT_R * (S.reach || 1.2);
    g.setLineDash([14, 10]); g.lineDashOffset = -t * 2; g.strokeStyle = 'rgba(255,70,60,.85)'; g.lineWidth = 4;
    g.beginPath(); g.arc(u.ax, u.ay, R, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(255,60,40,.08)'; g.beginPath(); g.arc(u.ax, u.ay, R, 0, Math.PI * 2); g.fill();
  }
  for (const o of tg) {
    const cx = o.x, cy = o.y - o.H / 2;
    switch (sty) {
      case 'sharks': {
        for (let i = 0; i < hits; i++) {
          const at = ufxHitAt(i, hits), p = (k - (at - 14)) / 20; if (p < 0 || p > 1) continue;
          const side = i % 2 ? 1 : -1;   // the shark comes from the side opposite the way it pushes
          const x = cx + side * 420 * (1 - p * 1.3), y = cy + Math.sin(p * 6) * 8;
          ufxShark(g, x, y, 0.9, -side, col[1]);
          if (!low && p > 0.6) { g.fillStyle = 'rgba(191,246,255,.6)'; for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(x + side * (30 + j * 18), y + ufxSeed(i * 7 + j) * 20 - 10, 4, 0, Math.PI * 2); g.fill(); } }
        }
        const p = (k - (FIN - 16)) / 24;
        if (p > 0 && p < 1) { const y = cy + 260 - ufxEase(p * 1.6) * 260; ufxShark(g, cx, y, 2.2, 1, '#1f6f9c'); }
        break;
      }
      case 'stomp': {
        for (let i = 0; i <= hits; i++) {
          const at = i < hits ? ufxHitAt(i, hits) : FIN, p = (k - (at - 10)) / 14; if (p < 0 || p > 1) continue;
          const big = i === hits, y = cy - 300 + ufxEase(p * 1.4) * (260 - o.H * 0.3), w = big ? 120 : 80;
          g.globalAlpha = 1 - Math.max(0, p - 0.7) / 0.3;
          g.fillStyle = '#4a3a2a'; g.strokeStyle = '#1b130b'; g.lineWidth = 4;
          g.beginPath(); g.ellipse(cx, y, w, w * 0.45, 0, 0, Math.PI * 2); g.fill(); g.stroke();
          g.fillStyle = '#6dbb4a'; for (let j = -2; j <= 2; j++) { g.beginPath(); g.ellipse(cx + j * w * 0.36, y + w * 0.32, w * 0.16, w * 0.12, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
          g.globalAlpha = 1;
        }
        break;
      }
      case 'dragon': {
        const n = low ? 10 : 18;
        for (let j = n - 1; j >= 0; j--) {
          const a = k * 0.18 - j * 0.35, r = 70 + j * 2;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.6;
          g.fillStyle = j === 0 ? '#ff3b30' : j % 2 ? '#d4a017' : '#f5c84a'; g.strokeStyle = '#5a0a0a'; g.lineWidth = 2;
          g.beginPath(); g.arc(x, y, j === 0 ? 16 : 12 - j * 0.3, 0, Math.PI * 2); g.fill(); g.stroke();
        }
        break;
      }
      case 'slash': case 'legend': {
        for (let i = 0; i < hits; i++) {
          const at = ufxHitAt(i, hits), p = (k - at + 2) / 8; if (p < 0 || p > 1) continue;
          const a = ufxSeed(i * 3.1 + u.ax) * Math.PI, L = 150;
          const c = sty === 'legend' ? `hsl(${i * 51},100%,70%)` : '#e6ecff';
          g.globalAlpha = 1 - p; g.strokeStyle = c; g.lineWidth = 10 * (1 - p) + 2;
          g.beginPath(); g.moveTo(cx - Math.cos(a) * L, cy - Math.sin(a) * L); g.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); g.stroke();
        }
        if (sty === 'legend' && k < FIN) {
          for (let j = 0; j < 7; j++) { const a = j / 7 * Math.PI * 2 + k * 0.12, r = 120 * (1 - k / FIN) + 30; g.globalAlpha = 0.9; g.fillStyle = `hsl(${j * 51},100%,65%)`; g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 9, 0, Math.PI * 2); g.fill(); }
        }
        g.globalAlpha = 1;
        break;
      }
      case 'pillars': {
        for (let i = 0; i < hits; i++) {
          const at = ufxHitAt(i, hits), p = (k - at + 4) / 16; if (p < 0 || p > 1) continue;
          const w = 46 * (1 - p * 0.6), h = 520 * ufxEase(p * 2);
          g.globalAlpha = 1 - p; g.fillStyle = 'rgba(255,240,180,.85)'; g.fillRect(cx - w / 2, o.y - h, w, h);
          g.fillStyle = '#fff'; g.fillRect(cx - w / 6, o.y - h, w / 3, h);
        }
        g.globalAlpha = 1;
        break;
      }
      case 'shatter': case 'clock': {
        if (k < FIN) {
          const r = 62, cr = Math.min(1, k / FIN);
          if (sty === 'shatter') {
            g.fillStyle = 'rgba(180,235,255,.35)'; g.strokeStyle = 'rgba(230,250,255,.95)'; g.lineWidth = 3;
            g.beginPath(); for (let j = 0; j < 6; j++) { const a = j / 6 * Math.PI * 2 + 0.5; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.2); } g.closePath(); g.fill(); g.stroke();
            g.strokeStyle = '#ffffff'; g.lineWidth = 2; for (let j = 0; j < Math.floor(cr * 7); j++) { const a = ufxSeed(j) * 6.28; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke(); }
          } else {
            g.fillStyle = 'rgba(30,22,10,.55)'; g.strokeStyle = '#e6b84a'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, r + 10, 0, Math.PI * 2); g.fill(); g.stroke();
            for (let j = 0; j < 12; j++) { const a = j / 12 * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2)); g.lineTo(cx + Math.cos(a) * (r + 8), cy + Math.sin(a) * (r + 8)); g.stroke(); }
            const ha = -Math.PI / 2 + cr * Math.PI * 2; g.strokeStyle = '#fff4d6'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ha) * r * 0.8, cy + Math.sin(ha) * r * 0.8); g.stroke();
            g.font = '700 14px "Chakra Petch", system-ui'; g.fillStyle = '#ffd35c'; g.textAlign = 'center'; g.fillText('×' + (u.bank ? Math.round(u.bank) : Math.round(cr * hits)), cx, cy - r - 18);
          }
        }
        break;
      }
      case 'phoenix': {
        for (let i = 0; i < hits; i++) {
          const at = ufxHitAt(i, hits), p = (k - (at - 8)) / 16; if (p < 0 || p > 1) continue;
          const side = i % 2 ? 1 : -1, x = cx + side * 300 * (1 - p * 2), y = cy - 40 + p * 80;
          g.fillStyle = '#ff6a1a'; g.beginPath(); g.moveTo(x - side * 30, y); g.lineTo(x + side * 10, y - 26); g.lineTo(x + side * 4, y); g.lineTo(x + side * 10, y + 26); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,211,92,.7)'; for (let j = 1; j < (low ? 3 : 6); j++) { g.beginPath(); g.arc(x + side * j * 18, y - j * 3, 10 - j, 0, Math.PI * 2); g.fill(); }
        }
        break;
      }
      case 'vortex': {
        if (k < FIN) {
          const arms = low ? 3 : 5, rr = 220 * (1 - k / FIN * 0.6);
          g.strokeStyle = 'rgba(163,92,255,.75)'; g.lineWidth = 5;
          for (let j = 0; j < arms; j++) { g.beginPath(); for (let s = 0; s <= 20; s++) { const p = s / 20, a = j / arms * Math.PI * 2 + k * 0.15 + p * 3.2, r = rr * (1 - p); g.lineTo(u.ax + Math.cos(a) * r, u.ay + Math.sin(a) * r * 0.75); } g.stroke(); }
          g.fillStyle = '#05020d'; g.strokeStyle = '#e8d9ff'; g.lineWidth = 3; g.beginPath(); g.arc(u.ax, u.ay, 26 + Math.sin(t * 0.4) * 3, 0, Math.PI * 2); g.fill(); g.stroke();
        }
        break;
      }
      case 'hammer': {
        const p = (k - (FIN - 26)) / 30; if (p < 0 || p > 1) break;
        const lift = p < 0.8 ? -1.2 * p / 0.8 : -1.2 + (p - 0.8) / 0.2 * 1.9;
        g.save(); g.translate(cx, cy - 220); g.rotate(lift);
        g.fillStyle = '#6a5a4a'; g.fillRect(-8, 0, 16, 200);
        g.fillStyle = '#cfd8dc'; g.strokeStyle = '#2fd6ff'; g.lineWidth = 4; g.fillRect(-70, 180, 140, 70); g.strokeRect(-70, 180, 140, 70);
        g.restore();
        break;
      }
      case 'tornado': {
        if (k < FIN) {
          const n = low ? 6 : 10;
          for (let j = 0; j < n; j++) { const y = o.y - j * 26, w = 20 + j * 9, a = k * 0.4 + j; g.strokeStyle = j % 2 ? 'rgba(63,207,122,.7)' : 'rgba(242,227,107,.6)'; g.lineWidth = 4; g.beginPath(); g.ellipse(cx + Math.sin(a) * 6, y, w, 7, 0, 0, Math.PI * 2); g.stroke(); }
        }
        break;
      }
      case 'barrage': {
        for (let i = 0; i < hits; i++) {
          const at = ufxHitAt(i, hits), p = (k - at + 3) / 5; if (p < 0 || p > 1) continue;
          const side = Math.sign(cx - u.ax) || 1, sx = cx - side * 500, sy = cy + (ufxSeed(i) - 0.5) * 40;
          g.globalAlpha = 1 - p; g.strokeStyle = '#e8354a'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx + (cx - sx) * p * 0.6, sy); g.lineTo(cx, cy); g.stroke();
        }
        g.globalAlpha = 1;
        break;
      }
      case 'encore': {
        for (const side of [-1, 1]) {
          const x = cx + side * 240, y = o.y - 60;
          g.fillStyle = '#1b1430'; g.strokeStyle = '#ff3df0'; g.lineWidth = 3; g.fillRect(x - 28, y - 50, 56, 100); g.strokeRect(x - 28, y - 50, 56, 100);
          g.beginPath(); g.arc(x, y + 15, 18, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(x, y - 28, 9, 0, Math.PI * 2); g.stroke();
        }
        for (let i = 0; i < hits; i++) {
          const at = ufxHitAt(i, hits), p = (k - at + 6) / 12; if (p < 0 || p > 1) continue;
          const side = i % 2 ? 1 : -1, x = cx - side * 240;   // blast comes from the speaker opposite the push
          g.strokeStyle = i % 2 ? '#18ffd1' : '#ff3df0'; g.lineWidth = 5; g.globalAlpha = 1 - p;
          for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(x, o.y - 45, 30 + p * 200 + j * 22, side > 0 ? -0.6 : Math.PI - 0.6, side > 0 ? 0.6 : Math.PI + 0.6); g.stroke(); }
        }
        g.globalAlpha = 1;
        break;
      }
      case 'elixir': {
        if (k < FIN) {
          const n = low ? 5 : 10;
          for (let j = 0; j < n; j++) { const p = ((k * 1.5 + j * 13) % 60) / 60, x = cx + (ufxSeed(j) - 0.5) * 90, y = o.y - p * 140; g.globalAlpha = 1 - p; g.fillStyle = j % 2 ? '#7cff6b' : '#ff7ab8'; g.beginPath(); g.arc(x, y, 5 + ufxSeed(j + 9) * 6, 0, Math.PI * 2); g.fill(); }
          g.globalAlpha = 1;
        }
        break;
      }
      case 'photo': break;   // Master Chuang's polaroid is drawn in ult-remake.js
      case 'court': {
        for (let i = 0; i < hits; i++) {
          const at = ufxHitAt(i, hits), p = (k - (at - 12)) / 16; if (p < 0 || p > 1) continue;
          const side = ufxSeed(i) < 0.5 ? -1 : 1, sx = cx + side * 360, sy = cy - 260;
          const x = sx + (cx - sx) * p, y = sy + (cy - sy) * p - Math.sin(p * Math.PI) * 120;
          ufxBall(g, x, y, 16, k * 0.3);
        }
        const p = (k - (FIN - 18)) / 22;
        if (p > 0 && p < 1) {
          g.strokeStyle = '#ff8a1f'; g.lineWidth = 5; g.beginPath(); g.ellipse(cx, cy - 150, 46, 12, 0, 0, Math.PI * 2); g.stroke();
          g.fillStyle = '#f2f2f2'; g.fillRect(cx - 60, cy - 230, 120, 70); g.strokeStyle = '#1a0f06'; g.strokeRect(cx - 60, cy - 230, 120, 70);
          ufxBall(g, cx, cy - 150 + ufxEase(p * 1.4) * 150, 20, k * 0.3);
        }
        break;
      }
    }
  }
  g.restore();
}

/* one-shot effects when a small hit lands (or misses): spawned into the normal FX list */
function ultHitFx(x, y, a, b, col, getF) {
  const f = getF ? getF(b) : null; if (!f || !f.c) return;
  const def = ultDef(f.c), sty = def.style, low = UFX_LOW(), miss = a === 2;
  if (sty === 'storm') spawnFx({ k: 'ubolt', x, y, life: 12, col: def.colors[1], seed: Math.random() * 99 });
  else if (sty === 'beams') spawnFx({ k: 'ubeam', x, y, life: 14, col: def.colors[1] });
  else if (sty === 'arrows') for (let i = 0; i < (low ? 3 : 6); i++) spawnFx({ k: 'uarrow', x: x + (Math.random() - 0.5) * 70, y: y - 300 - Math.random() * 120, vx: 0, vy: 26, life: 12, col: def.colors[2] });
  if (miss) spawnFx({ k: 'ring', x, y, life: 14, r0: 8, r1: 46, col: 'rgba(255,255,255,.6)', lw: 3 });
}

/* drawing for the new FX kinds; anything else goes to the older drawer */
const ufxPrevDrawFx = typeof drawFxNew === 'function' ? drawFxNew : null;
drawFxNew = function (g, p, k) {
  if (p.k === 'ubolt') {
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k;
    ufxBolt(g, p.x, p.y - 700, p.y, p.seed, 12, 'rgba(255,225,74,.35)'); ufxBolt(g, p.x, p.y - 700, p.y, p.seed, 4, '#ffffff');
  } else if (p.k === 'ubeam') {
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k;
    const w = 40 * (1 - k * 0.5); g.fillStyle = p.col; g.fillRect(p.x - w / 2, p.y - 900, w, 900); g.fillStyle = '#ffffff'; g.fillRect(p.x - w / 6, p.y - 900, w / 3, 900);
  } else if (p.k === 'uarrow') {
    g.globalAlpha = Math.min(1, (1 - k) * 2); g.strokeStyle = '#3a2a14'; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x, p.y - 40); g.lineTo(p.x, p.y); g.stroke();
    g.fillStyle = p.col; g.beginPath(); g.moveTo(p.x, p.y + 8); g.lineTo(p.x - 5, p.y - 2); g.lineTo(p.x + 5, p.y - 2); g.closePath(); g.fill();
  } else if (ufxPrevDrawFx) ufxPrevDrawFx(g, p, k);
};
