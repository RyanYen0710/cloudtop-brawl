'use strict';
/* ===== CLOUDTOP BRAWL — ultimate art for the new fighters ===== */

function drawUltWorldNew(g, view, c, t) {
  const { f, tg, def, k } = c, B = view.stage.blast, st = view.stage;
  if (typeof drawUltWorldBoss2 === 'function' && drawUltWorldBoss2(g, view, c, t)) return true;
  const midY = tg.length ? tg.reduce((a, o) => a + o.y - o.H / 2, 0) / tg.length : st.spawnY + 150;
  switch (def.theme) {
    case 'legend': {
      const cols = (f.c.modes || []).map(id => CHAR[id].look.accent);
      tg.forEach((o, j) => {
        const i = Math.floor((k + j * 5) / 14) % cols.length, ph = ((k + j * 5) % 14) / 14, col = cols[i] || '#ffd35c';
        if (ph < 0.55) {
          const w = 26 + Math.sin(t * 0.6) * 6, lg = g.createLinearGradient(o.x - w, 0, o.x + w, 0);
          lg.addColorStop(0, hexA(col, 0)); lg.addColorStop(0.5, 'rgba(255,255,255,.95)'); lg.addColorStop(1, hexA(col, 0));
          g.fillStyle = lg; g.fillRect(o.x - w, B.t, w * 2, o.y - B.t);
          g.fillStyle = hexA(col, 0.4); g.fillRect(o.x - w * 2.2, B.t, w * 4.4, o.y - B.t);
        }
        g.strokeStyle = col; g.lineWidth = 5; circle(g, o.x, o.y - o.H / 2, 30 + ph * 90); g.stroke();
      });
      cols.forEach((col, i) => { const a = t * 0.05 + i / cols.length * Math.PI * 2; g.fillStyle = col; circle(g, f.x + Math.cos(a) * 90, f.y - f.H / 2 + Math.sin(a) * 50, 12); g.fill(); });
      return true;
    }
    case 'ocean': {
      const dir = f.x < st.cx ? 1 : -1, p = Math.min(1, k / 70);
      const L = B.l + 150, R = B.r - 150, front = dir > 0 ? L + (R - L) * p : R - (R - L) * p;
      const top = midY - 160 - Math.sin(k * 0.1) * 20, base = st.spawnY + 520;
      const wg = g.createLinearGradient(0, top, 0, base); wg.addColorStop(0, 'rgba(191,246,255,.55)'); wg.addColorStop(0.3, 'rgba(31,163,214,.45)'); wg.addColorStop(1, 'rgba(2,26,46,.2)');
      g.fillStyle = wg; g.beginPath(); g.moveTo(dir > 0 ? B.l : B.r, base);
      const from = dir > 0 ? B.l : B.r;
      for (let i = 0; i <= 24; i++) { const x = from + (front - from) * i / 24; g.lineTo(x, top + Math.sin(x * 0.02 + t * 0.15) * 18); }
      g.quadraticCurveTo(front + dir * 90, top - 60, front + dir * 40, top + 60); g.lineTo(front, base); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 5; g.beginPath(); g.arc(front + dir * 30, top + 10, 40, dir > 0 ? -2.2 : -0.9, dir > 0 ? 0.6 : 2.4); g.stroke();
      tg.forEach((o, j) => {
        const ph = ((k + j * 17) % 45) / 45;
        if (k < 20) return;
        const sx = o.x - dir * 120 + dir * ph * 240, sy = o.y + 140 - Math.sin(ph * Math.PI) * 330;
        g.save(); g.globalCompositeOperation = 'source-over';
        g.translate(sx, sy); g.rotate(dir * (-0.9 + ph * 1.8)); PROJ_NEW.shark(g, {}, t, 0, 0, 62, dir);
        g.restore();
      });
      return true;
    }
    case 'tactical': {
      tg.forEach((o, j) => {
        const cx = o.x, cy = o.y - o.H / 2, r = 46 - Math.min(24, k * 0.6), spin = t * 0.05;
        g.strokeStyle = '#e8354a'; g.lineWidth = 3; circle(g, cx, cy, r); g.stroke();
        for (let i = 0; i < 4; i++) { const a = spin + i * Math.PI / 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6); g.lineTo(cx + Math.cos(a) * r * 1.5, cy + Math.sin(a) * r * 1.5); g.stroke(); }
        if (k > 12 && (k + j * 3) % 6 < 3) {
          const fx0 = f.x + (f.face || 1) * f.W * 0.8, fy0 = f.y - f.H * 0.6;
          g.strokeStyle = 'rgba(255,233,168,.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(fx0, fy0); g.lineTo(cx + (Math.random() - 0.5) * 20, cy + (Math.random() - 0.5) * 20); g.stroke();
          g.fillStyle = 'rgba(255,240,200,.9)'; circle(g, fx0, fy0, 10 + Math.random() * 6); g.fill();
        }
      });
      g.strokeStyle = 'rgba(232,53,74,.25)'; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const y = st.spawnY - 300 + ((k * 8 + i * 140) % 840); g.beginPath(); g.moveTo(B.l + 200, y); g.lineTo(B.r - 200, y); g.stroke(); }
      return true;
    }
    case 'concert': {
      const beat = Math.abs(Math.sin(k * 0.21));
      for (let i = 0; i < 5; i++) {
        const sx = B.l + 300 + i * (B.r - B.l - 600) / 4, a = Math.sin(t * 0.04 + i * 1.3) * 0.5;
        const ex = sx + Math.sin(a) * 900, ey = st.spawnY + 500;
        const lg = g.createLinearGradient(sx, B.t + 100, ex, ey); lg.addColorStop(0, i % 2 ? 'rgba(255,61,240,.45)' : 'rgba(24,255,209,.45)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = lg; g.beginPath(); g.moveTo(sx - 10, B.t + 100); g.lineTo(sx + 10, B.t + 100); g.lineTo(ex + 120, ey); g.lineTo(ex - 120, ey); g.closePath(); g.fill();
      }
      tg.forEach(o => {
        for (let i = 0; i < 3; i++) { const kk = ((k * 0.05 + i / 3) % 1); g.strokeStyle = i % 2 ? `rgba(255,61,240,${1 - kk})` : `rgba(24,255,209,${1 - kk})`; g.lineWidth = 6; circle(g, o.x, o.y - o.H / 2, 20 + kk * 140); g.stroke(); }
      });
      g.save(); g.globalCompositeOperation = 'source-over';
      [-1, 1].forEach(s => {
        const sx = s < 0 ? st.cx - 520 : st.cx + 520, sy = st.spawnY + 300, sc = 1 + beat * 0.08;
        g.save(); g.translate(sx, sy); g.scale(sc, sc);
        rrect(g, -70, -200, 140, 200, 12); fillStroke(g, '#1a1726', 5);
        circle(g, 0, -70, 50); fillStroke(g, '#2c2840', 4); g.fillStyle = '#ff3df0'; circle(g, 0, -70, 18); g.fill();
        circle(g, 0, -160, 22); fillStroke(g, '#2c2840', 3); g.fillStyle = '#18ffd1'; circle(g, 0, -160, 8); g.fill();
        g.restore();
      });
      g.restore();
      return true;
    }
    case 'clock': {
      const cx = st.cx, cy = st.spawnY - 60, R = 260 * Math.min(1, k / 20);
      const cg = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R); cg.addColorStop(0, 'rgba(255,244,214,.08)'); cg.addColorStop(1, 'rgba(230,184,74,.3)');
      g.fillStyle = cg; circle(g, cx, cy, R); g.fill();
      g.strokeStyle = 'rgba(255,230,160,.8)'; g.lineWidth = 6; circle(g, cx, cy, R); g.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = i % 3 ? 4 : 9; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82); g.lineTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95); g.stroke(); }
      const speed = k < 100 ? 0.02 : 0.4, ha = -Math.PI / 2 + k * speed, ma = -Math.PI / 2 + k * speed * 8;
      g.lineWidth = 12; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ha) * R * 0.5, cy + Math.sin(ha) * R * 0.5); g.stroke();
      g.lineWidth = 7; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ma) * R * 0.78, cy + Math.sin(ma) * R * 0.78); g.stroke();
      tg.forEach(o => { g.strokeStyle = 'rgba(255,230,160,.7)'; g.lineWidth = 3; g.setLineDash([8, 8]); g.lineDashOffset = k; circle(g, o.x, o.y - o.H / 2, 60); g.stroke(); g.setLineDash([]); });
      return true;
    }
    case 'alchemy': {
      const dir = f.face || 1, cx = f.x - dir * 110, cy = f.y;
      g.save(); g.globalCompositeOperation = 'source-over';
      g.beginPath(); g.ellipse(cx, cy - 70, 110, 80, 0, 0, Math.PI); g.lineTo(cx - 110, cy - 70); g.closePath(); fillStroke(g, '#2a2433', 5);
      g.beginPath(); g.ellipse(cx, cy - 70, 112, 24, 0, 0, Math.PI * 2); fillStroke(g, '#3a3445', 5);
      g.beginPath(); g.ellipse(cx, cy - 70, 96, 17, 0, 0, Math.PI * 2); g.fillStyle = '#7cff6b'; g.fill();
      g.restore();
      for (let i = 0; i < 10; i++) { const kk = ((k * 0.03 + i * 0.13) % 1), bx = cx - 80 + ((i * 47) % 160), by = cy - 80 - kk * 160; g.strokeStyle = `rgba(190,255,180,${1 - kk})`; g.lineWidth = 3; circle(g, bx, by, 6 + kk * 10); g.stroke(); }
      tg.forEach((o, j) => {
        if (k < 15) return;
        const ph = ((k + j * 11) % 30) / 30, x0 = cx, y0 = cy - 90, x1 = o.x, y1 = o.y - o.H / 2;
        const px = x0 + (x1 - x0) * ph, py = y0 + (y1 - y0) * ph - Math.sin(ph * Math.PI) * 220;
        g.fillStyle = j % 2 ? 'rgba(255,122,184,.9)' : 'rgba(124,255,107,.9)'; circle(g, px, py, 16); g.fill();
        g.strokeStyle = 'rgba(200,255,190,.6)'; g.lineWidth = 5; circle(g, x1, y1, 30 + ph * 50); g.stroke();
      });
      return true;
    }
  }
  return false;
}

function drawThemeArtNew(g, def, vw, vh, t, k) {
  const col = def.colors;
  if ((def.theme === 'photo' || def.theme === 'court') && typeof drawThemeArtBoss2 === 'function') { drawThemeArtBoss2(g, def, vw, vh, t, k); return; }
  switch (def.theme) {
    case 'legend': {
      const cols = ['#34d1bf', '#ff6a1a', '#ffe14a', '#3fe0d0', '#e8354a', '#7cff6b', '#e6b84a'];
      cols.forEach((c, i) => { const a = t * 0.01 + i / cols.length * Math.PI * 2; g.fillStyle = hexA(c, 0.35); g.beginPath(); g.moveTo(vw * 0.75, vh * 0.5); g.arc(vw * 0.75, vh * 0.5, Math.max(vw, vh), a, a + 0.35); g.closePath(); g.fill(); });
      g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 40; i++) { star(g, (i * 97.3) % vw, ((i * 53.1) + k * 2) % vh, 2 + (i % 3)); g.fill(); }
      break;
    }
    case 'ocean':
      for (let i = 0; i < 4; i++) {
        g.fillStyle = hexA(i % 2 ? col[1] : col[2], 0.18 + i * 0.05); g.beginPath(); g.moveTo(0, vh);
        for (let x = 0; x <= vw; x += 24) g.lineTo(x, vh * (0.62 + i * 0.09) + Math.sin(x * 0.015 + t * 0.06 + i) * 22);
        g.lineTo(vw, vh); g.fill();
      }
      g.strokeStyle = hexA(col[2], 0.6); g.lineWidth = 2;
      for (let i = 0; i < 30; i++) { circle(g, (i * 131) % vw, vh - ((k * 4 + i * 47) % vh), 3 + (i % 4) * 2); g.stroke(); }
      break;
    case 'tactical':
      g.strokeStyle = hexA(col[1], 0.2); g.lineWidth = 1;
      for (let x = 0; x < vw; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, vh); g.stroke(); }
      for (let y = 0; y < vh; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(vw, y); g.stroke(); }
      { const cx = vw * 0.78, cy = vh * 0.5, r = Math.min(vw, vh) * 0.3; g.strokeStyle = hexA(col[1], 0.6); g.lineWidth = 4; circle(g, cx, cy, r); g.stroke(); circle(g, cx, cy, r * 0.5); g.stroke();
        g.beginPath(); g.moveTo(cx - r * 1.3, cy); g.lineTo(cx + r * 1.3, cy); g.moveTo(cx, cy - r * 1.3); g.lineTo(cx, cy + r * 1.3); g.stroke(); }
      g.fillStyle = hexA(col[2], 0.12); g.fillRect(0, (k * 9) % vh, vw, 24);
      break;
    case 'concert':
      for (let i = 0; i < 4; i++) {
        const sx = vw * (0.15 + i * 0.25), a = Math.sin(t * 0.05 + i * 1.5) * 0.4;
        g.fillStyle = hexA(i % 2 ? col[1] : col[2], 0.22); g.beginPath(); g.moveTo(sx - 8, 0); g.lineTo(sx + 8, 0); g.lineTo(sx + Math.sin(a) * vh + 140, vh); g.lineTo(sx + Math.sin(a) * vh - 140, vh); g.closePath(); g.fill();
      }
      for (let i = 0; i < 24; i++) { const h = vh * 0.25 * Math.abs(Math.sin(t * 0.15 + i * 0.7)); g.fillStyle = hexA(i % 2 ? col[1] : col[2], 0.55); g.fillRect(i * vw / 24 + 3, vh - h, vw / 24 - 6, h); }
      break;
    case 'clock': {
      const cx = vw * 0.75, cy = vh * 0.5, R = Math.min(vw, vh) * 0.4;
      g.strokeStyle = hexA(col[1], 0.6); g.lineWidth = 6; circle(g, cx, cy, R); g.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = i % 3 ? 3 : 7; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.85, cy + Math.sin(a) * R * 0.85); g.lineTo(cx + Math.cos(a) * R * 0.97, cy + Math.sin(a) * R * 0.97); g.stroke(); }
      g.lineWidth = 8; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(-k * 0.05 - 1.57) * R * 0.5, cy + Math.sin(-k * 0.05 - 1.57) * R * 0.5); g.stroke();
      g.lineWidth = 5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(-k * 0.4 - 1.57) * R * 0.8, cy + Math.sin(-k * 0.4 - 1.57) * R * 0.8); g.stroke();
      g.globalAlpha *= 0.5; gear(g, vw * 0.12, vh * 0.2, 60, 10, t * 0.02, col[1]); gear(g, vw * 0.22, vh * 0.85, 44, 8, -t * 0.03, col[1]);
      break;
    }
    case 'alchemy':
      for (let i = 0; i < 28; i++) { const kk = ((k * 0.012 + i * 0.037) % 1); g.strokeStyle = hexA(i % 3 ? col[1] : col[2], 0.6 * (1 - kk)); g.lineWidth = 3; circle(g, (i * 97) % vw, vh * (1 - kk), 6 + (i % 5) * 4); g.stroke(); }
      break;
  }
}
