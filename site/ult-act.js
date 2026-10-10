'use strict';
/* ===== CLOUDTOP BRAWL — the fighter acts out their ultimate =====
   While an ultimate's damage plays, the fighter who used it shows up and does it
   themselves (Zephyr dashes all over the map, Titan crashes down from the sky, ...).
   Looks only: the hits, timing and knockback are still decided in ult.js, so this
   never changes balance or online play. */

/* art-time (the k from ultCtx runs 0..ULT_FX) for each small hit and the final blow */
function uaTimes(def) {
  const n = def.hits || 3, T = [0];
  for (let i = 0; i < n; i++) T.push((6 + Math.floor(i * (ULT_FX_FINAL - 14) / n)) * ULT_ART);
  T.push(ULT_FX_FINAL * ULT_ART);
  return T;
}
/* which beat we're heading to (j: 1..n = small hits, n+1 = final) and how far along (p) */
function uaSeg(T, k) {
  let j = 1; while (j < T.length - 1 && T[j] < k) j++;
  const a = T[j - 1], b = T[j];
  return { j, p: k >= b ? 1 : clamp((k - a) / Math.max(1, b - a), 0, 1), after: k > T[T.length - 1] };
}
const uaLerp = (a, b, p) => a + (b - a) * p;
const uaEase = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
/* a stable pseudo-random number for beat i (same on every screen) */
const uaRnd = (i, s) => { const x = Math.sin(i * 12.9898 + (s || 0) * 78.233) * 43758.5453; return x - Math.floor(x); };

/* draw the fighter (or a ghost of one) at a spot, optionally scaled up */
function uaDraw(g, f, o, t) {
  const a = Object.assign({ c: f.c, W: f.W, H: f.H, slot: f.slot, color: f.color, yenMode: f.yenMode, face: 1, pose: 'idle', pt: 1, inv: 0, x: 0, y: 0 }, o);
  const s = o.scale || 1;
  g.save();
  g.globalAlpha = clamp(o.alpha == null ? 1 : o.alpha, 0, 1);
  g.translate(a.x, a.y); g.scale(s, s);
  a.x = 0; a.y = 0; a._ghostA = g.globalAlpha;
  try { drawFighter(g, a, t, false); } catch (e) { }
  g.restore();
}
function uaGlow(g, x, y, r, col, a) {
  g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(255,255,255,${0.9 * a})`); gr.addColorStop(0.35, hexA(col, 0.55 * a)); gr.addColorStop(1, hexA(col, 0));
  g.fillStyle = gr; circle(g, x, y, r); g.fill(); g.restore();
}
function uaLine(g, x1, y1, x2, y2, col, w, a) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.lineCap = 'round';
  g.strokeStyle = col; g.lineWidth = w * 2.4; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = w * 0.7; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.restore();
}
/* a quick flash right after each beat (0..1, 1 = just hit) */
function uaFlash(T, k, len) {
  for (let j = 1; j < T.length; j++) { const d = k - T[j]; if (d >= 0 && d < len) return 1 - d / len; }
  return 0;
}

function drawUltActor(g, view, c, t) {
  const { u, f, tg, def, k } = c;
  if (!f || k <= 0 || k > ULT_FX + 2) return;
  const st = view.stage, B = st.blast, T = uaTimes(def), S = uaSeg(T, k), n = T.length - 2;
  const col = (def.colors && def.colors[1]) || f.c.look.accent || '#ffd35c';
  const anchor = { x: u.ax, y: u.ay + f.H / 2, H: f.H, W: f.W };
  const tgt = i => tg.length ? tg[((i % tg.length) + tg.length) % tg.length] : anchor;
  const T0 = tgt(0), midX = tg.length ? tg.reduce((a, o) => a + o.x, 0) / tg.length : anchor.x;
  const midY = tg.length ? tg.reduce((a, o) => a + o.y, 0) / tg.length : anchor.y;
  // fade in at the start and out at the very end so nobody pops in or out
  const fade = Math.min(1, k / 6) * Math.min(1, (ULT_FX - k) / 10);
  const fl = uaFlash(T, k, 7), finFl = k >= T[n + 1] ? Math.max(0, 1 - (k - T[n + 1]) / 10) : 0;
  const side = i => (i % 2 ? -1 : 1);
  const D = (o) => uaDraw(g, f, Object.assign({ alpha: fade }, o), t);
  const trail = (pos, num, gap) => { for (let q = num; q >= 1; q--) { const p = pos(k - q * gap); if (p) D(Object.assign({}, p, { alpha: fade * (0.32 - q * 0.05) })); } };

  if (typeof drawUltActorRemake === 'function' && drawUltActorRemake(g, c, t, D, fade, fl, T, n, k)) return;   // remade ultimates (ult-remake.js)
  switch (def.style) {
    /* Zephyr: dashes all over the map, appears next to the target for every cut, last cut from behind */
    case 'slash': {
      const L = B.l + 260, R = B.r - 260, top = st.spawnY - 120;
      const pos = kk => {
        if (kk <= 0) return { x: f.x, y: f.y, face: f.face, pose: 'vanish', pt: 0.5 };
        const s = uaSeg(T, kk), o = tgt(s.j - 1), sd = s.j > n ? -(o.face || 1) : side(s.j);
        const hx = o.x + sd * (o.W * 0.5 + 34), hy = o.y;
        const prev = s.j === 1 ? { x: f.x, y: f.y } : (() => { const po = tgt(s.j - 2); return { x: po.x + side(s.j - 1) * (po.W * 0.5 + 34), y: po.y }; })();
        const mx = uaLerp(L, R, uaRnd(s.j, 1)), my = top + uaRnd(s.j, 2) * 220;   // somewhere else on the map
        if (s.after) return { x: hx, y: hy, face: -sd, pose: 'idle', pt: 1 };
        if (s.p < 0.5) { const p = uaEase(s.p / 0.5); return { x: uaLerp(prev.x, mx, p), y: uaLerp(prev.y, my, p) - Math.sin(p * Math.PI) * 60, face: mx > prev.x ? 1 : -1, pose: 'dash', pt: 1 }; }
        if (s.p < 0.85) { const p = uaEase((s.p - 0.5) / 0.35); return { x: uaLerp(mx, hx, p), y: uaLerp(my, hy, p), face: hx > mx ? 1 : -1, pose: 'dash', pt: 1 }; }
        return { x: hx, y: hy, face: -sd, pose: 'punch', pt: (s.p - 0.85) / 0.15 };
      };
      trail(pos, 5, 1.6);
      const p = pos(k); D(p);
      if (fl > 0) { const o = tgt(S.j - 2 < 0 ? 0 : S.j - 2); uaLine(g, o.x - 90, o.y - o.H * 0.9, o.x + 90, o.y - o.H * 0.1, col, 5, fl); }
      if (finFl > 0) tg.forEach(o => { uaLine(g, o.x - 140, o.y - o.H, o.x + 140, o.y, '#ffffff', 7, finFl); uaLine(g, o.x + 140, o.y - o.H, o.x - 140, o.y, col, 7, finFl); });
      break;
    }
    /* Titan Ape: grows huge, leaps off the screen and crashes down on the target every hit */
    case 'stomp': {
      const grow = Math.min(1, k / 14), sc = 1 + 1.1 * grow;
      const o = tgt(S.j - 1), fromX = S.j === 1 ? f.x : tgt(S.j - 2).x, fromY = S.j === 1 ? f.y : tgt(S.j - 2).y;
      let x, y, pose, pt = 1;
      if (S.after) { x = o.x - (o.face || 1) * 30; y = o.y; pose = 'stomp'; }
      else { const p = uaEase(S.p), hgt = S.j > n ? 900 : 420; x = uaLerp(fromX, o.x, p); y = uaLerp(fromY, o.y, p) - Math.sin(p * Math.PI) * hgt; pose = S.p > 0.85 ? 'stomp' : 'jump'; }
      D({ x, y, face: o.x >= x ? 1 : -1, pose, pt, scale: sc });
      if (fl > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(200,255,150,${fl})`; g.lineWidth = 8; g.beginPath(); g.ellipse(x, y, 200 * (1.2 - fl), 40 * (1.2 - fl), 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
      break;
    }
    /* Mr. Tseng: rides the dragon's head, then leaps off it with a palm strike */
    case 'dragon': {
      const p = Math.min(1, k / 100), L = B.l + 200, R = B.r - 200, dir = f.x < st.cx ? 1 : -1;
      const hx = dir > 0 ? L + (R - L) * p : R - (R - L) * p;
      const mY = tg.length ? tg.reduce((a, o) => a + o.y - o.H / 2, 0) / tg.length : st.spawnY + 150;
      const hy = mY + Math.sin(hx * 0.012 + t * 0.1) * 70;
      if (k < T[n + 1] - 10) D({ x: hx + dir * 10, y: hy - 22, face: dir, pose: 'power', pt: 1 });
      else { const q = clamp((k - (T[n + 1] - 10)) / 10, 0, 1); D({ x: uaLerp(hx, T0.x - dir * 50, q), y: uaLerp(hy - 22, T0.y, q) - Math.sin(q * Math.PI) * 80, face: dir, pose: 'punch', pt: q }); }
      if (finFl > 0) uaGlow(g, T0.x, T0.y - T0.H / 2, 150, '#ffd35c', finFl);
      break;
    }
    /* Ulfgar: rises above the target calling the storm, then rides the hammer down */
    case 'hammer': {
      const o = T0, fin = T[n + 1];
      if (k < fin - 12) { const up = Math.min(1, k / 20); D({ x: uaLerp(f.x, o.x - 60, up), y: uaLerp(f.y, o.y - 300, up) + Math.sin(t * 0.15) * 6, face: o.x >= f.x ? 1 : -1, pose: 'cast2', pt: 1 }); if ((k | 0) % 9 < 3) uaLine(g, o.x - 60, o.y - 380, o.x - 60 + uaRnd(k | 0, 3) * 40 - 20, B.t, '#2fd6ff', 3, 0.8); }
      else { const q = clamp((k - (fin - 12)) / 12, 0, 1); D({ x: o.x - 60 + 40 * q, y: uaLerp(o.y - 300, o.y, uaEase(q)), face: 1, pose: q < 1 ? 'slam' : 'stomp', pt: q }); }
      if (finFl > 0) uaGlow(g, o.x, o.y - 20, 220, '#2fd6ff', finFl);
      break;
    }
    /* Talon: spins inside the tornado, carrying the target up, then flings them */
    case 'tornado': {
      const o = T0, up = Math.min(1, k / 60);
      if (k < T[n + 1]) D({ x: o.x + Math.cos(k * 0.35) * 60, y: o.y + 20 - up * 40 + Math.sin(k * 0.35) * 10, face: Math.sin(k * 0.35) > 0 ? -1 : 1, pose: 'spin', pt: 1 });
      else D({ x: o.x - 60, y: o.y, face: 1, pose: 'punch', pt: 1 });
      break;
    }
    /* Lumi: stirs the giant cauldron beside the target, then tips it over */
    case 'elixir': {
      const o = T0, sd = o.x > f.x ? -1 : 1, x = o.x + sd * 150;
      const stir = k < T[n + 1] ? ((k * 0.25) % 2 < 1 ? 'punch' : 'cast') : 'cast2';
      D({ x, y: o.y, face: -sd, pose: stir, pt: 0.5 + 0.5 * Math.sin(k * 0.3) });
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { const bp = ((k * 0.05 + i / 4) % 1); g.fillStyle = `rgba(150,255,120,${0.7 * (1 - bp) * fade})`; circle(g, x - sd * 30 + Math.sin(i * 2 + k * 0.1) * 12, o.y - f.H * 0.6 - bp * 90, 6 + i * 2); g.fill(); }
      g.restore();
      break;
    }
    /* Mythic Hsi: dribbles around the target, then flies up and slam-dunks them */
    case 'court': {
      const o = T0, fin = T[n + 1];
      if (k < fin - 14) { const sd = side(S.j), x = o.x + sd * (o.W * 0.5 + 50 + Math.sin(k * 0.2) * 20); D({ x, y: o.y - Math.abs(Math.sin(k * 0.35)) * 20, face: -sd, pose: 'low', pt: 1 }); g.fillStyle = '#ff8a2a'; circle(g, x - sd * 26, o.y - 12 - Math.abs(Math.sin(k * 0.6)) * 50, 10); g.fill(); }
      else { const q = clamp((k - (fin - 14)) / 14, 0, 1); D({ x: uaLerp(o.x + 120, o.x + 10, q), y: o.y - Math.sin(q * Math.PI * 0.9) * 260, face: -1, pose: q > 0.7 ? 'slam' : 'up', pt: q }); }
      break;
    }
    /* Rivet: stays back, calling in the satellite lasers with a targeting beam */
    case 'beams': {
      const o = T0, x = f.x, y = f.y, face = o.x >= x ? 1 : -1;
      D({ x, y, face, pose: 'cast', pt: 1 });
      uaLine(g, x + face * f.W * 0.6, y - f.H * 0.6, o.x, o.y - o.H / 2, '#ff3b3b', 1.2, 0.6 * fade);
      const sx = o.x + Math.sin(k * 0.05) * 60, sy = B.t + 180;
      g.save(); g.fillStyle = '#c9d2dc'; g.fillRect(sx - 16, sy - 10, 32, 20); g.fillStyle = '#3da5ff'; g.fillRect(sx - 60, sy - 6, 40, 12); g.fillRect(sx + 20, sy - 6, 40, 12); g.restore();
      uaGlow(g, sx, sy + 12, 30, '#ff3b3b', 0.6 + 0.4 * Math.sin(k * 0.4));
      break;
    }
    /* Volt: floats above the target and throws lightning down with his fists */
    case 'storm': {
      const o = T0, x = o.x + Math.sin(k * 0.08) * 40, y = o.y - 190 + Math.sin(k * 0.12) * 10;
      D({ x, y, face: 1, pose: fl > 0.3 ? 'slam' : 'cast2', pt: 1 });
      if (fl > 0) uaLine(g, x, y - f.H * 0.4, o.x, o.y - o.H / 2, '#ffe14a', 4, fl);
      break;
    }
    /* Rowan: leaps above the target and fires the arrow rain himself */
    case 'arrows': {
      const o = T0, sd = o.x > f.x ? -1 : 1, x = o.x + sd * 190, y = o.y - 190;
      const up = Math.min(1, k / 16);
      D({ x: uaLerp(f.x, x, up), y: uaLerp(f.y, y, up), face: -sd, pose: fl > 0 ? 'punch' : 'cast', pt: 1 });
      if (fl > 0) for (let i = 0; i < 3; i++) uaLine(g, x - sd * 30, y - f.H * 0.6, o.x + (i - 1) * 40, o.y - o.H / 2, '#e6ffbe', 1.6, fl * 0.8);
      break;
    }
    /* Mr. Guo: blinks around the target, firing from a new spot every shot */
    case 'barrage': {
      const o = T0, a = uaRnd(S.j, 5) * Math.PI, x = o.x + Math.cos(a) * 200, y = o.y - Math.sin(a) * 120;
      const blink = S.p < 0.15 ? S.p / 0.15 : 1;
      D({ x, y, face: o.x >= x ? 1 : -1, pose: 'punch', pt: 1, alpha: fade * blink });
      if (fl > 0) { uaLine(g, x + (o.x >= x ? 1 : -1) * f.W * 0.7, y - f.H * 0.6, o.x, o.y - o.H / 2, '#9fe8ff', 2, fl); uaGlow(g, x + (o.x >= x ? 1 : -1) * f.W * 0.8, y - f.H * 0.6, 26, '#9fe8ff', fl); }
      break;
    }
    /* Master Chuang: snaps photos from all around the target */
    case 'photo': {
      const o = T0, a = Math.PI * (0.15 + uaRnd(S.j, 7) * 0.7), x = o.x + Math.cos(a) * 190 * side(S.j), y = o.y - Math.sin(a) * 110;
      D({ x, y, face: o.x >= x ? 1 : -1, pose: 'cast', pt: 1, alpha: fade * (S.p < 0.2 ? S.p / 0.2 : 1) });
      if (fl > 0) uaGlow(g, x + (o.x >= x ? 1 : -1) * f.W * 0.7, y - f.H * 0.62, 70, '#ffffff', fl);
      break;
    }
    /* Dame Aurelia: raises her shield to the sky, then the pillars of light erupt */
    case 'pillars': {
      const o = T0, sd = o.x > f.x ? -1 : 1, x = o.x + sd * 140;
      D({ x, y: o.y, face: -sd, pose: k < T[n + 1] ? 'cast2' : 'up', pt: 1 });
      uaLine(g, x, o.y - f.H * 1.2, x, B.t, '#fff6c8', 6, 0.35 * fade);
      break;
    }
    /* Mira Frost: freezes the target with a beam from her staff, then shatters the ice with a spinning kick */
    case 'shatter': {
      const o = T0, sd = o.x > f.x ? -1 : 1, fin = T[n + 1];
      if (k < fin - 10) { const x = o.x + sd * 260; D({ x, y: o.y, face: -sd, pose: 'cast', pt: 1 }); uaLine(g, x - sd * f.W * 0.7, o.y - f.H * 0.6, o.x, o.y - o.H / 2, '#bff4ff', 3, 0.7 * fade); }
      else { const q = clamp((k - (fin - 10)) / 10, 0, 1); D({ x: uaLerp(o.x + sd * 260, o.x + sd * 40, q), y: o.y - Math.sin(q * Math.PI) * 60, face: -sd, pose: 'spin', pt: 1 }); }
      if (finFl > 0) uaGlow(g, o.x, o.y - o.H / 2, 160, '#bff4ff', finFl);
      break;
    }
    /* Blaze: he IS the phoenix, diving through the target again and again */
    case 'phoenix': {
      const p = Math.min(1, k / 95), dir = f.x < st.cx ? 1 : -1, L = B.l + 250, R = B.r - 250;
      const px = dir > 0 ? L + (R - L) * p : R - (R - L) * p;
      const mY = tg.length ? tg.reduce((a, o) => a + o.y - o.H / 2, 0) / tg.length : st.spawnY + 150;
      const py = mY - 60 + Math.sin(p * Math.PI) * 60;
      if (k < T[n + 1]) D({ x: px, y: py + f.H * 0.4, face: dir, pose: 'dash', pt: 1 });
      else D({ x: T0.x - dir * 50, y: T0.y, face: dir, pose: 'punch', pt: 1 });
      uaGlow(g, px, py, 60, '#ff7a1a', 0.8 * fade);
      break;
    }
    /* Nyx: floats over the black hole with her scythe raised, then cuts through it */
    case 'vortex': {
      const cy0 = (tg.length ? tg.reduce((a, o) => a + o.y - o.H / 2, 0) / tg.length : st.spawnY + 150) - 60;
      const sd = midX > f.x ? -1 : 1, R0 = Math.min(1, k / 40) * 110;
      if (k < T[n + 1] - 8) D({ x: midX + sd * (R0 + 110), y: cy0 + 70 + Math.sin(k * 0.1) * 8, face: -sd, pose: 'cast2', pt: 1 });
      else { const q = clamp((k - (T[n + 1] - 8)) / 8, 0, 1); D({ x: uaLerp(midX + sd * 220, midX - sd * 220, q), y: cy0 + 70, face: -sd, pose: 'dash', pt: 1 }); }
      break;
    }
    /* Mr. Chiu: surfs in on the wave, then rides the giant shark into the target */
    case 'sharks': {
      const dir = f.x < st.cx ? 1 : -1, p = Math.min(1, k / 70), L = B.l + 150, R = B.r - 150;
      const front = dir > 0 ? L + (R - L) * p : R - (R - L) * p;
      const mY = tg.length ? tg.reduce((a, o) => a + o.y - o.H / 2, 0) / tg.length : st.spawnY + 150;
      const top = mY - 160 - Math.sin(k * 0.1) * 20;
      if (k < 70) D({ x: front, y: top, face: dir, pose: 'power', pt: 1 });
      else { const q = clamp((k - 70) / Math.max(1, T[n + 1] - 70), 0, 1); D({ x: uaLerp(front, T0.x - dir * 40, q), y: uaLerp(top, T0.y, q) - Math.sin(q * Math.PI) * 120, face: dir, pose: q > 0.8 ? 'slam' : 'jump', pt: 1 }); }
      break;
    }
    /* Echo: a DJ booth appears and she scratches to the beat */
    case 'encore': {
      const o = T0, sd = o.x > f.x ? -1 : 1, x = o.x + sd * 150, y = o.y, beat = (k % 16) < 8;
      g.save(); rrect(g, x - 60, y - 52, 120, 52, 8); g.fillStyle = '#1b1530'; g.fill(); g.strokeStyle = '#ff4dd8'; g.lineWidth = 3; g.stroke();
      [-30, 30].forEach(dx => { g.fillStyle = '#2a2244'; circle(g, x + dx, y - 54, 18); g.fill(); g.strokeStyle = '#7ad7ff'; g.lineWidth = 2; g.beginPath(); g.arc(x + dx, y - 54, 12, k * 0.3, k * 0.3 + 4); g.stroke(); });
      g.restore();
      D({ x, y: y - 14, face: -sd, pose: beat ? 'punch' : 'cast', pt: beat ? 1 : 0.4 });
      if (beat) uaGlow(g, x, y - 60, 70, '#ff4dd8', 0.5 * fade);
      break;
    }
    /* Kiro: time stops; he walks up and lands every hit himself */
    case 'clock': {
      const o = T0, walk = clamp(k / 26, 0, 1), sd = side(S.j), hx = o.x + sd * (o.W * 0.5 + 30);
      if (walk < 1) D({ x: uaLerp(f.x, o.x - (o.x > f.x ? 1 : -1) * 60, walk), y: uaLerp(f.y, o.y, walk), face: o.x > f.x ? 1 : -1, pose: 'run', pt: 1 });
      else D({ x: hx, y: o.y, face: -sd, pose: S.p > 0.7 || S.after ? 'punch' : 'idle', pt: 1 });
      break;
    }
    /* Legend Yen: ghosts of all seven style fighters strike in turn, then Yen lands the last blow */
    case 'legend': {
      const o = T0, modes = (f.c.modes || []).filter(id => !CHAR[id].hidden), fin = T[n + 1];
      modes.forEach((id, i) => {
        const a = i / modes.length * Math.PI * 2 + k * 0.03, active = (S.j - 1) % modes.length === i && !S.after;
        const r = active ? 70 : 170, x = o.x + Math.cos(a) * r, y = o.y - 20 - Math.sin(a) * 60;
        uaDraw(g, { c: CHAR[id], W: f.W, H: f.H, slot: f.slot }, { x, y, face: o.x >= x ? 1 : -1, pose: active ? 'punch' : 'idle', pt: 1, alpha: fade * (active ? 0.85 : 0.4) }, t);
        if (active && fl > 0) uaGlow(g, o.x, o.y - o.H / 2, 60, CHAR[id].look.accent, fl);
      });
      if (k < fin - 10) D({ x: o.x, y: o.y - 300 + Math.sin(k * 0.1) * 8, face: 1, pose: 'cast2', pt: 1 });
      else { const q = clamp((k - (fin - 10)) / 10, 0, 1); D({ x: o.x - 30 * q, y: uaLerp(o.y - 300, o.y, uaEase(q)), face: 1, pose: 'punch', pt: q }); }
      if (finFl > 0) uaGlow(g, o.x, o.y - o.H / 2, 240, '#ffd35c', finFl);
      break;
    }
    default: {
      const o = T0, sd = o.x > f.x ? -1 : 1;
      D({ x: o.x + sd * 160, y: o.y, face: -sd, pose: k < T[n + 1] ? 'cast2' : 'punch', pt: 1 });
    }
  }
}
