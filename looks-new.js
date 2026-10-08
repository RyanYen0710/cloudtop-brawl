'use strict';
/* ===== CLOUDTOP BRAWL — art for the new fighters (Mr. Chiu, Mr. Guo, Echo, Kiro, Lumi):
   outfits, summoned creatures, projectiles, flight effects, move effects and status effects ===== */

/* ---------- outfits (called from drawFighter; coordinates are mirrored so +x is "forward") ---------- */
function lookHook(g, part, K) {
  const { has } = K;
  if (has('tamer')) LOOK_TAMER[part] && LOOK_TAMER[part](g, K);
  else if (has('agent')) LOOK_AGENT[part] && LOOK_AGENT[part](g, K);
  else if (has('dj')) LOOK_DJ[part] && LOOK_DJ[part](g, K);
  else if (has('clock')) LOOK_CLOCK[part] && LOOK_CLOCK[part](g, K);
  else if (has('alchemist')) LOOK_ALCH[part] && LOOK_ALCH[part](g, K);
  else if (has('legend') && typeof LOOK_LEGEND !== 'undefined') LOOK_LEGEND[part] && LOOK_LEGEND[part](g, K);
  else if (has('photo') && typeof LOOK_PHOTO !== 'undefined') LOOK_PHOTO[part] && LOOK_PHOTO[part](g, K);
  else if (has('baller') && typeof LOOK_BALLER !== 'undefined') LOOK_BALLER[part] && LOOK_BALLER[part](g, K);
}

function tideOrb(g, x, y, r, top, spin) {
  g.save(); g.translate(x, y); g.rotate(spin || 0);
  g.beginPath(); g.arc(0, 0, r, Math.PI, 0); g.closePath(); fillStroke(g, top, Math.max(1.5, r * 0.18));
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI); g.closePath(); fillStroke(g, '#eef7fb', Math.max(1.5, r * 0.18));
  g.fillStyle = shade(top, -0.45); g.fillRect(-r, -r * 0.1, r * 2, r * 0.2);
  circle(g, 0, 0, r * 0.32); fillStroke(g, '#ffffff', Math.max(1.2, r * 0.12));
  g.fillStyle = top; circle(g, 0, 0, r * 0.14); g.fill();
  g.restore();
}

const LOOK_TAMER = {
  torso(g, K) {
    const { sw, shY, hipY, torsoH, acc } = K, vest = '#e7dcc0';
    [[-1, -0.5], [1, 0.16]].forEach(([s2, x0]) => {
      g.beginPath();
      if (s2 < 0) { g.moveTo(-sw * 0.5, shY); g.lineTo(-sw * 0.12, shY); g.lineTo(-sw * 0.2, hipY + 6); g.lineTo(-sw * 0.5, hipY + 6); }
      else { g.moveTo(sw * 0.5, shY); g.lineTo(sw * 0.2, shY); g.lineTo(sw * 0.14, hipY + 6); g.lineTo(sw * 0.5, hipY + 6); }
      g.closePath(); fillStroke(g, vest, 2.5);
      g.fillStyle = shade(vest, -0.15); g.fillRect(sw * (s2 < 0 ? -0.44 : 0.24), shY + torsoH * 0.45, sw * 0.18, torsoH * 0.2);
    });
    g.strokeStyle = acc; g.lineWidth = 2; g.beginPath(); g.moveTo(-sw * 0.12, shY + 1); g.lineTo(-sw * 0.2, hipY + 5); g.moveTo(sw * 0.2, shY + 1); g.lineTo(sw * 0.14, hipY + 5); g.stroke();
    // shark-tooth necklace
    g.strokeStyle = '#3b2a1e'; g.lineWidth = 1.6; g.beginPath(); g.arc(sw * 0.05, shY - 2, sw * 0.2, 0.35, Math.PI - 0.35); g.stroke();
    g.beginPath(); g.moveTo(sw * 0.0, shY + sw * 0.18); g.lineTo(sw * 0.1, shY + sw * 0.18); g.lineTo(sw * 0.05, shY + sw * 0.34); g.closePath(); fillStroke(g, '#fbf7ec', 1.5);
    // belt with tide orbs
    g.fillStyle = '#3a2b20'; g.fillRect(-sw / 2 + 1, hipY - 6, sw - 2, 7);
    for (let i = 0; i < 3; i++) tideOrb(g, -sw * 0.32 + i * sw * 0.3, hipY - 2.5, Math.max(3.2, sw * 0.075), i === 1 ? '#ffe14a' : acc, 0);
  },
  head(g, K) {
    const { hx, hy, hr, acc, t } = K, cap = '#13406a';
    g.beginPath(); g.arc(hx, hy - hr * 0.05, hr * 1.05, Math.PI * 1.0, Math.PI * 2.0); g.closePath(); fillStroke(g, cap, 2.5);
    g.beginPath(); g.arc(hx + hr * 0.15, hy - hr * 0.05, hr * 0.78, Math.PI * 1.28, Math.PI * 1.85); g.lineTo(hx + hr * 0.15, hy - hr * 0.05); g.closePath(); g.fillStyle = '#f2f7fa'; g.fill();
    g.beginPath(); g.ellipse(hx + hr * 0.95, hy - hr * 0.08, hr * 0.72, hr * 0.16, -0.08, 0, Math.PI * 2); fillStroke(g, acc, 2);
    // wave emblem on the cap
    g.strokeStyle = acc; g.lineWidth = Math.max(1.5, hr * 0.12); g.beginPath();
    g.arc(hx + hr * 0.35, hy - hr * 0.48, hr * 0.2, Math.PI * 0.9, Math.PI * 2.1); g.quadraticCurveTo(hx + hr * 0.6, hy - hr * 0.3, hx + hr * 0.75, hy - hr * 0.45); g.stroke();
    g.fillStyle = K.L.hair || '#2a1d18'; g.fillRect(hx - hr * 1.0, hy - hr * 0.1, hr * 0.35, hr * 0.5);
    // friendly smile
    g.strokeStyle = OUTLINE; g.lineWidth = 1.6; g.beginPath(); g.arc(hx + hr * 0.55, hy + hr * 0.3, hr * 0.22, 0.2, Math.PI - 0.6); g.stroke();
  },
  hand(g, K) {
    const f = K.f;
    if (f.mv && f.mv.startsWith('sp_') && f.mv !== 'sp_up' && f.mv !== 'sp_down' && (f.pose === 'cast' || f.pose === 'charge') && (f.pt || 0) < 0.6) {
      const [x, y] = K.hand; tideOrb(g, x, y - 2, K.limbW * 0.9, f.mv === 'sp_side' ? '#ffe14a' : K.acc, K.t * 0.3);
    }
  }
};

const LOOK_AGENT = {
  torso(g, K) {
    const { sw, shY, hipY, torsoH, acc, body } = K;
    // tactical jacket: high collar, accent stripe, chest rig
    g.beginPath(); g.moveTo(-sw * 0.3, shY - 2); g.lineTo(-sw * 0.16, shY - 9); g.lineTo(sw * 0.3, shY - 9); g.lineTo(sw * 0.38, shY - 1); g.closePath(); fillStroke(g, shade(body, 0.12), 2);
    g.fillStyle = acc; g.beginPath(); g.moveTo(-sw * 0.5, shY + torsoH * 0.05); g.lineTo(-sw * 0.32, shY + torsoH * 0.05); g.lineTo(sw * 0.1, hipY); g.lineTo(-sw * 0.08, hipY); g.closePath(); g.fill();
    rrect(g, sw * 0.08, shY + torsoH * 0.3, sw * 0.3, torsoH * 0.28, 2); fillStroke(g, '#3b4048', 1.6);
    rrect(g, -sw * 0.38, shY + torsoH * 0.32, sw * 0.24, torsoH * 0.26, 2); fillStroke(g, '#3b4048', 1.6);
    g.fillStyle = '#16181d'; g.fillRect(-sw / 2 + 1, hipY - 6, sw - 2, 6);
    g.fillStyle = '#c9ccd2'; g.fillRect(-3, hipY - 6, 6, 6);
    // holster on the back hip
    rrect(g, -sw * 0.56, hipY - 8, sw * 0.2, torsoH * 0.5, 3); fillStroke(g, '#1b1d22', 1.8);
  },
  head(g, K) {
    const { hx, hy, hr, acc } = K;
    // short spiky hair
    g.fillStyle = K.L.hair || '#151515';
    g.beginPath(); g.moveTo(hx - hr * 1.0, hy - hr * 0.1);
    [[-1.05, -0.8], [-0.7, -1.25], [-0.35, -0.95], [0.0, -1.35], [0.3, -1.0], [0.7, -1.2], [0.85, -0.65], [0.95, -0.45]].forEach(([a, b]) => g.lineTo(hx + hr * a, hy + hr * b));
    g.lineTo(hx + hr * 0.3, hy - hr * 0.55); g.lineTo(hx - hr * 0.5, hy - hr * 0.4); g.closePath(); g.fill();
    // headset with mic
    g.strokeStyle = '#1b1d22'; g.lineWidth = hr * 0.2; g.beginPath(); g.arc(hx - hr * 0.05, hy, hr * 1.04, Math.PI * 1.15, Math.PI * 1.75); g.stroke();
    circle(g, hx - hr * 0.2, hy + hr * 0.05, hr * 0.32); fillStroke(g, '#22252b', 2);
    g.fillStyle = acc; circle(g, hx - hr * 0.2, hy + hr * 0.05, hr * 0.13); g.fill();
    g.strokeStyle = '#22252b'; g.lineWidth = 2; g.beginPath(); g.moveTo(hx - hr * 0.05, hy + hr * 0.25); g.quadraticCurveTo(hx + hr * 0.3, hy + hr * 0.75, hx + hr * 0.75, hy + hr * 0.5); g.stroke();
    g.fillStyle = acc; circle(g, hx + hr * 0.78, hy + hr * 0.5, hr * 0.09); g.fill();
    // stern brows + cheek marks
    g.strokeStyle = OUTLINE; g.lineWidth = 2; g.beginPath(); g.moveTo(hx + hr * 0.15, hy - hr * 0.35); g.lineTo(hx + hr * 0.45, hy - hr * 0.25); g.moveTo(hx + hr * 0.6, hy - hr * 0.25); g.lineTo(hx + hr * 0.9, hy - hr * 0.33); g.stroke();
    g.strokeStyle = acc; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx + hr * 0.75, hy + hr * 0.12); g.lineTo(hx + hr * 0.95, hy + hr * 0.12); g.moveTo(hx + hr * 0.72, hy + hr * 0.22); g.lineTo(hx + hr * 0.92, hy + hr * 0.22); g.stroke();
  },
  hand(g, K) {
    const { f, hand, H, acc, portrait } = K, r = hand[2], ux = Math.sin(r), uy = Math.cos(r);
    const knife = f.mv === 'sp_down';
    g.save(); g.translate(hand[0], hand[1]); g.rotate(-r + Math.PI / 2);
    // local frame: +x points along the forearm
    if (knife) {
      const L = H * 0.3;
      g.fillStyle = '#1b1d22'; rrect(g, -4, -3.5, 12, 7, 2); g.fill();
      g.beginPath(); g.moveTo(8, -4); g.lineTo(8 + L, 0); g.lineTo(8, 4); g.closePath();
      const kg = g.createLinearGradient(8, 0, 8 + L, 0); kg.addColorStop(0, '#d9dde3'); kg.addColorStop(1, '#ffffff');
      g.fillStyle = kg; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.5; g.stroke();
      g.strokeStyle = acc; g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, 0); g.lineTo(6 + L * 0.8, 0); g.stroke();
      if (f.hot && !portrait) { g.globalCompositeOperation = 'lighter'; g.fillStyle = hexA(acc, 0.35); g.beginPath(); g.ellipse(8 + L * 0.5, 0, L * 0.7, 7, 0, 0, Math.PI * 2); g.fill(); }
    } else {
      // the Ghostor: compact pistol with a long silencer
      g.fillStyle = '#2b2f37'; rrect(g, -3, -2, 9, 12, 2); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 1.5; g.stroke();
      rrect(g, -4, -6, 22, 7, 2); fillStroke(g, '#3a3f49', 1.5);
      rrect(g, 17, -5.5, 14, 6, 3); fillStroke(g, '#1d2026', 1.5);
      g.fillStyle = acc; g.fillRect(2, -5, 10, 1.6);
      const firing = f.mv === 'sp_neutral' && f.pose === 'cast' && (f.pt || 0) > 0.95;
      if (firing && !portrait && ((K.t >> 1) & 1)) {
        g.globalCompositeOperation = 'lighter';
        const mg = g.createRadialGradient(36, -2.5, 0, 36, -2.5, 14); mg.addColorStop(0, 'rgba(255,255,230,.95)'); mg.addColorStop(0.5, 'rgba(255,200,90,.6)'); mg.addColorStop(1, 'rgba(255,120,40,0)');
        g.fillStyle = mg; circle(g, 36, -2.5, 14); g.fill();
      }
    }
    g.restore();
  }
};

const LOOK_DJ = {
  torso(g, K) {
    const { sw, shY, hipY, torsoH, acc, t, L, portrait } = K;
    // hoodie pocket + drawstrings
    rrect(g, -sw * 0.3, hipY - torsoH * 0.38, sw * 0.6, torsoH * 0.3, 5); fillStroke(g, shade(K.body, 0.08), 2);
    g.strokeStyle = '#eae6f5'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(sw * 0.0, shY + 2); g.lineTo(sw * 0.0, shY + torsoH * 0.3); g.moveTo(sw * 0.18, shY + 2); g.lineTo(sw * 0.2, shY + torsoH * 0.32); g.stroke();
    // equalizer bars that bounce to the beat
    const n = 5, bw = sw * 0.09;
    for (let i = 0; i < n; i++) {
      const lvl = portrait ? 0.6 + 0.3 * Math.sin(i * 1.7) : 0.35 + 0.65 * Math.abs(Math.sin(t * 0.18 + i * 1.3) * Math.cos(t * 0.07 + i));
      const bh = torsoH * 0.36 * lvl, x = -sw * 0.27 + i * bw * 1.25, y = shY + torsoH * 0.5;
      g.fillStyle = i % 2 ? acc : (L.hair || '#18ffd1'); g.fillRect(x, y - bh, bw, bh);
    }
  },
  head(g, K) {
    const { hx, hy, hr, acc, L } = K;
    // spiky teal hair
    g.beginPath(); g.moveTo(hx - hr * 0.95, hy - hr * 0.2);
    [[-1.2, -0.9], [-0.6, -1.0], [-0.55, -1.6], [-0.1, -1.05], [0.2, -1.65], [0.45, -1.0], [0.95, -1.3], [0.85, -0.55]].forEach(([a, b]) => g.lineTo(hx + hr * a, hy + hr * b));
    g.lineTo(hx + hr * 0.2, hy - hr * 0.5); g.closePath(); fillStroke(g, L.hair || '#18ffd1', 2);
    // shades
    rrect(g, hx + hr * 0.1, hy - hr * 0.32, hr * 0.95, hr * 0.32, hr * 0.12); fillStroke(g, '#12101c', 1.8);
    g.fillStyle = hexA(acc, 0.8); g.fillRect(hx + hr * 0.2, hy - hr * 0.26, hr * 0.3, hr * 0.06);
    // grin
    g.strokeStyle = OUTLINE; g.lineWidth = 1.8; g.beginPath(); g.arc(hx + hr * 0.55, hy + hr * 0.25, hr * 0.25, 0.25, Math.PI - 0.5); g.stroke();
    // big headphones
    g.strokeStyle = '#1a1726'; g.lineWidth = hr * 0.24; g.beginPath(); g.arc(hx - hr * 0.25, hy - hr * 0.05, hr * 1.1, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
    circle(g, hx - hr * 0.6, hy + hr * 0.05, hr * 0.46); fillStroke(g, '#1a1726', 2.5);
    circle(g, hx - hr * 0.6, hy + hr * 0.05, hr * 0.28); g.fillStyle = acc; g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; circle(g, hx - hr * 0.68, hy - hr * 0.04, hr * 0.08); g.fill();
  }
};

const LOOK_CLOCK = {
  back(g, K) {
    const { sw, hipY, legL, body, f, t } = K;
    const sway = f.pose === 'run' ? Math.sin(t * 0.35) * 4 : Math.sin(t * 0.07) * 1.5;
    const lift = f.pose === 'jump' || f.pose === 'fall' ? -6 : 0;
    g.beginPath(); g.moveTo(-sw * 0.45, hipY - 8); g.lineTo(-sw * 0.05, hipY - 8);
    g.lineTo(-sw * 0.35 + sway, hipY + legL * 0.85 + lift); g.lineTo(-sw * 0.6 + sway, hipY + legL * 0.7 + lift);
    g.lineTo(-sw * 0.8 + sway * 1.3, hipY + legL * 0.92 + lift); g.closePath(); fillStroke(g, shade(body, -0.12));
  },
  torso(g, K) {
    const { sw, shY, hipY, torsoH, acc } = K;
    // waistcoat + buttons + watch chain
    g.beginPath(); g.moveTo(-sw * 0.15, shY); g.lineTo(sw * 0.38, shY); g.lineTo(sw * 0.38, hipY); g.lineTo(-sw * 0.15, hipY); g.closePath(); fillStroke(g, '#7a2e2a', 2);
    g.fillStyle = '#f4ecdc'; g.beginPath(); g.moveTo(sw * 0.02, shY); g.lineTo(sw * 0.22, shY); g.lineTo(sw * 0.12, shY + torsoH * 0.35); g.closePath(); g.fill();
    g.fillStyle = acc; for (let i = 0; i < 3; i++) { circle(g, sw * 0.13, shY + torsoH * (0.45 + i * 0.17), 2.2); g.fill(); }
    g.strokeStyle = acc; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sw * 0.13, shY + torsoH * 0.6); g.quadraticCurveTo(sw * 0.25, shY + torsoH * 0.85, sw * 0.36, shY + torsoH * 0.7); g.stroke();
    circle(g, sw * 0.36, shY + torsoH * 0.72, 3.4); fillStroke(g, acc, 1.2);
  },
  head(g, K) {
    const { hx, hy, hr, acc, t, L, portrait } = K;
    // white side hair + moustache
    g.fillStyle = L.hair || '#d8d8e0'; g.beginPath(); g.ellipse(hx - hr * 0.7, hy + hr * 0.05, hr * 0.32, hr * 0.5, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(hx + hr * 0.5, hy + hr * 0.22); g.quadraticCurveTo(hx + hr * 0.2, hy + hr * 0.5, hx + hr * 0.05, hy + hr * 0.25); g.quadraticCurveTo(hx + hr * 0.35, hy + hr * 0.3, hx + hr * 0.5, hy + hr * 0.15);
    g.quadraticCurveTo(hx + hr * 0.75, hy + hr * 0.3, hx + hr * 1.0, hy + hr * 0.2); g.quadraticCurveTo(hx + hr * 0.85, hy + hr * 0.5, hx + hr * 0.5, hy + hr * 0.22); g.fill();
    // monocle on the front eye
    g.strokeStyle = acc; g.lineWidth = 2.2; circle(g, hx + hr * 0.7, hy - hr * 0.1, hr * 0.24); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fill();
    g.lineWidth = 1; g.beginPath(); g.moveTo(hx + hr * 0.75, hy + hr * 0.13); g.quadraticCurveTo(hx + hr * 0.6, hy + hr * 0.9, hx + hr * 0.2, hy + hr * 1.0); g.stroke();
    // top hat with a turning gear
    const hb = hy - hr * 0.72;
    g.beginPath(); g.ellipse(hx, hb, hr * 1.3, hr * 0.2, -0.05, 0, Math.PI * 2); fillStroke(g, '#2a1f18', 2.2);
    rrect(g, hx - hr * 0.78, hb - hr * 1.25, hr * 1.56, hr * 1.25, 3); fillStroke(g, '#2a1f18', 2.2);
    g.fillStyle = acc; g.fillRect(hx - hr * 0.78, hb - hr * 0.42, hr * 1.56, hr * 0.24);
    gear(g, hx + hr * 0.3, hb - hr * 0.3, hr * 0.32, 8, portrait ? 0 : t * 0.04, '#f2d27a');
  },
  hand(g, K) {
    const f = K.f;
    if (f.mv === 'sp_side' || f.mv === 'sp_down' || f.pose === 'power') {
      const [x, y] = K.hand, r = K.limbW * 0.95;
      circle(g, x, y, r); fillStroke(g, K.acc, 2); g.fillStyle = '#fff8e6'; circle(g, x, y, r * 0.72); g.fill();
      g.strokeStyle = OUTLINE; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(K.t * 0.3) * r * 0.6, y + Math.sin(K.t * 0.3) * r * 0.6); g.moveTo(x, y); g.lineTo(x, y - r * 0.45); g.stroke();
    }
  }
};

const LOOK_ALCH = {
  back(g, K) {
    const { hx, hy, hr, L, t, sw, hipY, legL } = K, hc = L.hair || '#ff7ab8';
    // pigtails
    [[-1.05, 0.2], [-0.55, 0.55]].forEach(([a, b], i) => {
      const sw2 = Math.sin(t * 0.12 + i) * 3;
      g.beginPath(); g.ellipse(hx + hr * a + sw2, hy + hr * (b + 0.45), hr * 0.32, hr * 0.62, 0.3, 0, Math.PI * 2); fillStroke(g, hc, 2);
      g.fillStyle = K.acc; circle(g, hx + hr * a, hy + hr * (b - 0.15), hr * 0.14); g.fill();
    });
    // lab coat tails
    g.beginPath(); g.moveTo(-sw * 0.5, hipY - 6); g.lineTo(sw * 0.45, hipY - 6); g.lineTo(sw * 0.4, hipY + legL * 0.55); g.lineTo(-sw * 0.62, hipY + legL * 0.6); g.closePath(); fillStroke(g, '#f7f5ee', 2.2);
  },
  torso(g, K) {
    const { sw, shY, hipY, torsoH, acc } = K;
    g.fillStyle = '#54446e'; g.beginPath(); g.moveTo(-sw * 0.05, shY); g.lineTo(sw * 0.28, shY); g.lineTo(sw * 0.12, hipY - 2); g.closePath(); g.fill();
    g.strokeStyle = '#cfcabb'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-sw * 0.05, shY); g.lineTo(sw * 0.12, hipY - 2); g.lineTo(sw * 0.28, shY); g.stroke();
    // pocket with test tubes
    rrect(g, -sw * 0.42, shY + torsoH * 0.45, sw * 0.3, torsoH * 0.32, 2); fillStroke(g, '#e6e2d6', 1.5);
    ['#ff7ab8', '#7cff6b', '#7ad7ff'].forEach((c, i) => { g.fillStyle = c; g.fillRect(-sw * 0.38 + i * sw * 0.09, shY + torsoH * 0.3, sw * 0.06, torsoH * 0.22); });
    g.fillStyle = acc; g.fillRect(-sw / 2 + 1, hipY - 5, sw - 2, 4);
  },
  head(g, K) {
    const { hx, hy, hr, acc, L } = K;
    g.beginPath(); g.arc(hx, hy, hr * 1.02, Math.PI * 1.02, Math.PI * 1.85); g.quadraticCurveTo(hx + hr * 0.3, hy - hr * 0.35, hx - hr * 0.1, hy - hr * 0.25); g.lineTo(hx - hr * 0.9, hy + hr * 0.2); g.closePath(); fillStroke(g, L.hair || '#ff7ab8', 2);
    // goggles pushed up on the forehead
    g.strokeStyle = '#3a2d2a'; g.lineWidth = hr * 0.18; g.beginPath(); g.arc(hx, hy, hr * 0.98, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    [0.15, 0.62].forEach(dx => { circle(g, hx + hr * dx, hy - hr * 0.72, hr * 0.26); fillStroke(g, '#c08a3e', 2); g.fillStyle = hexA(acc, 0.85); circle(g, hx + hr * dx, hy - hr * 0.72, hr * 0.17); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; circle(g, hx + hr * (dx - 0.06), hy - hr * 0.78, hr * 0.05); g.fill(); });
    g.fillStyle = 'rgba(255,120,150,.45)'; circle(g, hx + hr * 0.65, hy + hr * 0.25, hr * 0.15); g.fill();
    g.strokeStyle = OUTLINE; g.lineWidth = 1.6; g.beginPath(); g.arc(hx + hr * 0.5, hy + hr * 0.28, hr * 0.15, 0.2, Math.PI - 0.2); g.stroke();
  },
  hand(g, K) {
    const { f, hand, limbW, acc, t } = K;
    if (f.pose === 'cast' && (f.pt || 0) > 0.6) return; // just thrown
    const [x, y] = hand, r = limbW * 0.85;
    g.strokeStyle = OUTLINE; g.lineWidth = 2;
    rrect(g, x - r * 0.3, y - r * 1.9, r * 0.6, r * 0.9, 2); g.fillStyle = 'rgba(230,245,255,.85)'; g.fill(); g.stroke();
    circle(g, x, y - r * 0.4, r * 0.95); g.fillStyle = 'rgba(230,245,255,.85)'; g.fill(); g.stroke();
    g.fillStyle = `hsl(${(t * 3) % 360},90%,62%)`; g.beginPath(); g.arc(x, y - r * 0.4, r * 0.8, 0.1, Math.PI - 0.1); g.fill();
    g.fillStyle = 'rgba(255,255,255,.8)'; circle(g, x - r * 0.3, y - r * 0.7, r * 0.18); g.fill();
    g.fillStyle = '#8a5a2c'; g.fillRect(x - r * 0.35, y - r * 2.1, r * 0.7, r * 0.3);
  }
};

function gear(g, x, y, r, teeth, rot, col) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = i / (teeth * 2) * Math.PI * 2, a1 = (i + 1) / (teeth * 2) * Math.PI * 2, rr = i % 2 ? r * 0.78 : r;
    g.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr); g.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  g.closePath(); fillStroke(g, col, Math.max(1.2, r * 0.12));
  g.fillStyle = shade(col, -0.45); circle(g, 0, 0, r * 0.3); g.fill();
  g.restore();
}

/* ---------- flying effects ---------- */
const FLY_NEW = {
  manta(g, f, t) {
    const flap = Math.sin(t * 0.16), x = f.x, y = f.y + 10, span = f.W * 1.25, dir = f.face || 1;
    g.translate(x, y); g.scale(dir, 1);
    g.beginPath(); g.moveTo(span * 0.55, 0);
    g.quadraticCurveTo(span * 0.2, -14 - flap * 6, -span * 0.15, -10);
    g.quadraticCurveTo(-span * 0.6, -18 - flap * 26, -span * 1.0, flap * 18);
    g.quadraticCurveTo(-span * 0.5, 8, -span * 0.3, 10);
    g.quadraticCurveTo(span * 0.1, 14, span * 0.55, 0);
    const mg = g.createLinearGradient(0, -20, 0, 14); mg.addColorStop(0, '#2c7fb0'); mg.addColorStop(1, '#0f3d5e');
    g.fillStyle = mg; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 2.5; g.stroke();
    g.beginPath(); g.moveTo(span * 0.4, 2); g.quadraticCurveTo(span * 1.0, -6 + flap * 22, span * 1.2, -flap * 12); g.quadraticCurveTo(span * 0.8, 6, span * 0.4, 8); g.closePath();
    g.fillStyle = '#21689a'; g.fill(); g.stroke();
    g.fillStyle = 'rgba(191,246,255,.75)'; for (let i = 0; i < 4; i++) { circle(g, -span * 0.1 + i * span * 0.14, -6 + (i % 2) * 4, 2.2); g.fill(); }
    g.strokeStyle = '#0f3d5e'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-span * 0.3, 6); g.quadraticCurveTo(-span * 0.9, 18 + Math.sin(t * 0.2) * 6, -span * 1.4, 10); g.stroke();
    g.fillStyle = '#fff'; circle(g, span * 0.45, -3, 2.4); g.fill();
    if (!PERF.low && t % 4 === 0) spawnFx({ k: 'spark', x: f.x - dir * span * 0.8, y: f.y + 14, vx: -dir * 1.5, vy: 1.5, life: 18, col: '#9fe7ff', size: 2.5 });
  },
  hover(g, f, t) {
    g.globalCompositeOperation = 'lighter';
    const x = f.x, y = f.y + 4;
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.06 + i / 3) % 1);
      g.strokeStyle = `rgba(140,240,255,${0.55 * (1 - k)})`; g.lineWidth = 3;
      g.beginPath(); g.ellipse(x, y + k * 34, f.W * (0.45 + k * 0.6), 6 + k * 4, 0, 0, Math.PI * 2); g.stroke();
    }
    const gr = g.createLinearGradient(0, y - 6, 0, y + 50); gr.addColorStop(0, 'rgba(180,250,255,.45)'); gr.addColorStop(1, 'rgba(60,160,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - f.W * 0.4, y); g.lineTo(x + f.W * 0.4, y); g.lineTo(x + f.W * 0.75, y + 50); g.lineTo(x - f.W * 0.75, y + 50); g.closePath(); g.fill();
  },
  balloon(g, f, t) {
    const sway = Math.sin(t * 0.05) * 10, bx = f.x - (f.face || 1) * 8 + sway, by = f.y - f.H - 58, r = f.W * 0.62;
    g.strokeStyle = '#f4efe4'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(f.x + (f.face || 1) * 4, f.y - f.H * 0.62); g.quadraticCurveTo(bx - sway, by + r * 1.6, bx, by + r * 1.08); g.stroke();
    g.beginPath(); g.ellipse(bx, by, r, r * 1.12, sway * 0.01, 0, Math.PI * 2);
    const bg = g.createRadialGradient(bx - r * 0.35, by - r * 0.4, 2, bx, by, r * 1.1); bg.addColorStop(0, '#d8ffd2'); bg.addColorStop(0.4, '#7cff6b'); bg.addColorStop(1, '#2f9a3a');
    g.fillStyle = bg; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = '#2f9a3a'; g.beginPath(); g.moveTo(bx - 5, by + r * 1.1); g.lineTo(bx + 5, by + r * 1.1); g.lineTo(bx, by + r * 1.22); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(bx - r * 0.38, by - r * 0.45, r * 0.16, r * 0.28, -0.4, 0, Math.PI * 2); g.fill();
    if (!PERF.low && t % 9 === 0) spawnFx({ k: 'bubble', x: bx + (Math.random() - 0.5) * r, y: by + r, vx: (Math.random() - 0.5), vy: -0.6, life: 40, col: '#bfffb5', size: 3 + Math.random() * 3 });
  }
};

/* ---------- move effects (attack swooshes for the new moves) ---------- */
const SWOOSH_NEW = {
  knife(g, f, t, m) {
    if (!f.hot) return;
    g.globalCompositeOperation = 'lighter';
    const b = hbox(f, m), cx = b.x + b.w / 2, cy = b.y + b.h / 2, dir = f.face || 1;
    g.translate(cx, cy); g.scale(dir, 1);
    const sl = g.createLinearGradient(-b.w * 0.6, 0, b.w * 0.6, 0); sl.addColorStop(0, 'rgba(232,53,74,0)'); sl.addColorStop(0.7, 'rgba(255,120,140,.8)'); sl.addColorStop(1, 'rgba(255,255,255,.95)');
    g.fillStyle = sl; g.beginPath(); g.moveTo(-b.w * 0.6, b.h * 0.35); g.quadraticCurveTo(0, -b.h * 0.9, b.w * 0.6, -b.h * 0.15); g.quadraticCurveTo(0, -b.h * 0.35, -b.w * 0.6, b.h * 0.35); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-b.w * 0.4, b.h * 0.1); g.quadraticCurveTo(0, -b.h * 0.6, b.w * 0.55, -b.h * 0.15); g.stroke();
  },
  beat(g, f, t, m, kind) {
    if (!f.hot) return;
    g.globalCompositeOperation = 'lighter';
    const dir = f.face || 1;
    for (let i = 0; i < 4; i++) {
      const k = ((t * 0.08 + i / 4) % 1), x = f.x - dir * (f.W * 0.3 + k * 80), y = f.y - f.H * 0.5;
      g.strokeStyle = i % 2 ? `rgba(255,61,240,${0.7 * (1 - k)})` : `rgba(24,255,209,${0.7 * (1 - k)})`; g.lineWidth = 4;
      g.beginPath(); g.ellipse(x, y, 10 + k * 10, f.H * (0.35 + k * 0.25), 0, 0, Math.PI * 2); g.stroke();
    }
  },
  fizz(g, f, t) {
    if (!f.hot) return;
    const dir = f.face || 1;
    for (let i = 0; i < 9; i++) {
      const x = f.x - dir * (f.W * 0.4 + i * 12 + (t * 3 % 12)), y = f.y - f.H * (0.2 + ((i * 37) % 60) / 100);
      g.fillStyle = i % 3 ? 'rgba(220,255,210,.75)' : 'rgba(255,122,184,.75)'; circle(g, x, y, 3 + (i % 3) * 2.5); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1; g.stroke();
    }
    g.globalCompositeOperation = 'lighter';
    const fg = g.createLinearGradient(f.x - dir * f.W * 2.5, 0, f.x, 0); fg.addColorStop(dir > 0 ? 0 : 1, 'rgba(124,255,107,0)'); fg.addColorStop(dir > 0 ? 1 : 0, 'rgba(200,255,190,.55)');
    g.fillStyle = fg; g.beginPath(); g.ellipse(f.x - dir * f.W * 1.2, f.y - f.H * 0.45, f.W * 1.3, f.H * 0.3, 0, 0, Math.PI * 2); g.fill();
  },
  speaker(g, f, t, m) {
    if (!f.hot) return;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.1 + i / 3) % 1);
      g.strokeStyle = `rgba(24,255,209,${0.75 * (1 - k)})`; g.lineWidth = 4;
      g.beginPath(); g.ellipse(f.x, f.y + 6 + k * 40, f.W * (0.4 + k * 1.1), 6 + k * 8, 0, 0, Math.PI); g.stroke();
    }
  },
  spring(g, f, t, m) {
    if (!f.hot) return;
    const x = f.x, y0 = f.y + 2, n = 7, h = 46;
    g.strokeStyle = '#e6b84a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y0);
    for (let i = 1; i <= n; i++) g.lineTo(x + (i % 2 ? 1 : -1) * f.W * 0.32, y0 + h * i / n);
    g.stroke();
    g.strokeStyle = OUTLINE; g.lineWidth = 1; g.stroke();
  },
  mindwisp(g, f, t, m) {
    if (!f.hot) return;
    const b = hbox(f, m), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.045 + i / 3) % 1);
      g.strokeStyle = `rgba(214,170,255,${0.6 * (1 - k)})`; g.lineWidth = 4 - k * 2;
      g.beginPath(); g.ellipse(cx, cy, b.w / 2 * (0.25 + k * 0.85), b.h / 2 * (0.25 + k * 0.85), 0, 0, Math.PI * 2); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    drawSpirit(g, f.x - (f.face || 1) * f.W * 0.2, f.y - f.H * 1.45 + Math.sin(t * 0.15) * 5, f.H * 0.42, t, f.face || 1);
  },
  bass(g, f, t, m) {
    if (!f.hot) return;
    const b = hbox(f, m), cx = b.x + b.w / 2, cy = f.y - 4;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const k = ((t * 0.06 + i / 4) % 1);
      g.strokeStyle = i % 2 ? `rgba(255,61,240,${0.7 * (1 - k)})` : `rgba(24,255,209,${0.7 * (1 - k)})`; g.lineWidth = 6 - k * 4;
      g.beginPath(); g.ellipse(cx, cy, b.w / 2 * (0.2 + k), 10 + k * b.h * 0.4, 0, Math.PI, Math.PI * 2); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    [-1, 1].forEach(s => {
      const sx = f.x + s * f.W * 1.1, sy = f.y;
      rrect(g, sx - 15, sy - 40, 30, 40, 4); fillStroke(g, '#1a1726', 2.5);
      const pulse = 1 + Math.sin(t * 0.9) * 0.12;
      circle(g, sx, sy - 14, 9 * pulse); fillStroke(g, '#2c2840', 2); g.fillStyle = '#ff3df0'; circle(g, sx, sy - 14, 3.5); g.fill();
      circle(g, sx, sy - 32, 4); fillStroke(g, '#2c2840', 1.5);
    });
  },
  clockfield(g, f, t, m) {
    if (!f.hot) return;
    const b = hbox(f, m), cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.min(b.w, b.h * 1.8) / 2;
    g.globalCompositeOperation = 'lighter';
    const cg = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R); cg.addColorStop(0, 'rgba(255,230,160,.05)'); cg.addColorStop(0.85, 'rgba(230,184,74,.18)'); cg.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = cg; circle(g, cx, cy, R); g.fill();
    g.strokeStyle = 'rgba(255,225,150,.6)'; g.lineWidth = 3; circle(g, cx, cy, R * 0.9); g.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = i % 3 ? 2 : 4; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78); g.lineTo(cx + Math.cos(a) * R * 0.88, cy + Math.sin(a) * R * 0.88); g.stroke(); }
    const ha = t * 0.02 - Math.PI / 2, ma = t * 0.12 - Math.PI / 2;
    g.strokeStyle = 'rgba(255,245,210,.85)'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ha) * R * 0.45, cy + Math.sin(ha) * R * 0.45); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ma) * R * 0.7, cy + Math.sin(ma) * R * 0.7); g.stroke();
  }
};

/* the psychic spirit (an original crystal spirit with ribbon tails) */
function drawSpirit(g, x, y, s, t, dir) {
  g.save(); g.translate(x, y); g.scale(dir, 1);
  g.globalCompositeOperation = 'lighter';
  const halo = g.createRadialGradient(0, 0, 2, 0, 0, s * 1.4); halo.addColorStop(0, 'rgba(230,200,255,.65)'); halo.addColorStop(1, 'rgba(150,80,255,0)');
  g.fillStyle = halo; circle(g, 0, 0, s * 1.4); g.fill();
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 3; i++) {
    g.strokeStyle = i === 1 ? '#f0d9ff' : '#b07cff'; g.lineWidth = 3; g.beginPath(); g.moveTo(-s * 0.1, s * 0.3);
    g.bezierCurveTo(-s * 0.5, s * (0.7 + i * 0.1), -s * (0.9 + i * 0.1), s * 0.3 + Math.sin(t * 0.2 + i) * s * 0.3, -s * (1.3 + i * 0.15), s * (0.6 + Math.sin(t * 0.15 + i) * 0.2)); g.stroke();
  }
  g.beginPath(); g.moveTo(0, -s * 0.75); g.lineTo(s * 0.48, 0); g.lineTo(0, s * 0.6); g.lineTo(-s * 0.48, 0); g.closePath();
  const bg = g.createLinearGradient(0, -s * 0.75, 0, s * 0.6); bg.addColorStop(0, '#f6eaff'); bg.addColorStop(1, '#9a62ff'); fillStroke(g, bg, 2.5);
  [[-0.6, -0.2], [0.6, -0.2]].forEach(([a, b]) => { g.beginPath(); g.moveTo(s * a * 0.6, s * b); g.lineTo(s * a, s * (b - 0.45)); g.lineTo(s * a * 1.05, s * (b + 0.15)); g.closePath(); fillStroke(g, '#c9a4ff', 2); });
  g.fillStyle = '#2a0f55'; g.beginPath(); g.ellipse(s * 0.1, -s * 0.12, s * 0.11, s * 0.07, 0.2, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(s * 0.32, -s * 0.12, s * 0.09, s * 0.06, -0.2, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffd6ff'; circle(g, s * 0.12, -s * 0.14, s * 0.035); g.fill();
  g.restore();
}

/* ---------- projectiles ---------- */
function projAng(p, dir) {
  if (p.ang != null && (p.vy === undefined || typeof p.vy !== 'number')) return p.ang;
  if (typeof p.vy === 'number' && (p.vx || p.vy)) return Math.atan2(p.vy, p.vx);
  return dir > 0 ? 0 : Math.PI;
}
const PROJ_NEW = {
  capture(g, p, t, x, y, r, dir) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const gl = g.createRadialGradient(x, y, 0, x, y, r * 2.4); gl.addColorStop(0, hexA(p.color, 0.5)); gl.addColorStop(1, hexA(p.color, 0));
    g.fillStyle = gl; circle(g, x, y, r * 2.4); g.fill(); g.restore();
    tideOrb(g, x, y, r * 1.05, p.color, t * 0.35 * dir);
  },
  shark(g, p, t, x, y, r, dir) {
    const L = r * 2.2, chomp = Math.abs(Math.sin(t * 0.32)), tail = Math.sin(t * 0.45) * 0.5;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(120,220,255,.55)'; g.lineWidth = 3;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x - dir * (L * 0.4 + i * 22), y + r * 0.55, 10 + i * 4, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.restore();
    g.translate(x, y); g.scale(dir, 1);
    // tail
    g.save(); g.translate(-L * 0.62, 0); g.rotate(tail);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-L * 0.42, -L * 0.36); g.lineTo(-L * 0.28, 0); g.lineTo(-L * 0.42, L * 0.3); g.closePath(); fillStroke(g, '#4f7fa0', 2.5); g.restore();
    // dorsal + side fins
    g.beginPath(); g.moveTo(-L * 0.1, -r * 0.55); g.lineTo(-L * 0.32, -r * 1.25); g.lineTo(L * 0.12, -r * 0.5); g.closePath(); fillStroke(g, '#4f7fa0', 2.5);
    g.beginPath(); g.moveTo(0, r * 0.3); g.lineTo(-L * 0.25, r * 0.95); g.lineTo(L * 0.12, r * 0.4); g.closePath(); fillStroke(g, '#3f6b89', 2);
    // body
    g.beginPath(); g.moveTo(L * 0.7, -r * 0.05 - chomp * r * 0.18);
    g.quadraticCurveTo(L * 0.4, -r * 0.75, -L * 0.2, -r * 0.6); g.quadraticCurveTo(-L * 0.6, -r * 0.35, -L * 0.65, 0);
    g.quadraticCurveTo(-L * 0.5, r * 0.5, 0, r * 0.55); g.quadraticCurveTo(L * 0.45, r * 0.55, L * 0.68, r * 0.15 + chomp * r * 0.2);
    g.lineTo(L * 0.3, r * 0.05); g.closePath();
    const sg = g.createLinearGradient(0, -r * 0.7, 0, r * 0.6); sg.addColorStop(0, '#6c9cbd'); sg.addColorStop(0.55, '#5d8fb0'); sg.addColorStop(0.56, '#eaf4f7'); sg.addColorStop(1, '#d4e4ea');
    fillStroke(g, sg, 2.5);
    // teeth
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) { const tx = L * (0.35 + i * 0.08); g.beginPath(); g.moveTo(tx, r * 0.04); g.lineTo(tx + L * 0.03, r * (0.04 + 0.12)); g.lineTo(tx + L * 0.06, r * 0.04); g.fill(); }
    // gills + eye
    g.strokeStyle = '#2d4f66'; g.lineWidth = 1.5; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(L * (0.12 - i * 0.06), -r * 0.2); g.lineTo(L * (0.09 - i * 0.06), r * 0.15); g.stroke(); }
    g.fillStyle = OUTLINE; circle(g, L * 0.42, -r * 0.3, r * 0.1); g.fill(); g.fillStyle = '#fff'; circle(g, L * 0.44, -r * 0.33, r * 0.035); g.fill();
    g.strokeStyle = OUTLINE; g.lineWidth = 2; g.beginPath(); g.moveTo(L * 0.34, -r * 0.42); g.lineTo(L * 0.5, -r * 0.36); g.stroke();
    if (!PERF.low && t % 3 === 0) spawnFx({ k: 'spark', x: x - dir * L * 0.7, y: y + (Math.random() - 0.5) * r, vx: -dir * 2, vy: -Math.random() * 2, g: 0.15, life: 18, col: Math.random() < 0.5 ? '#bff6ff' : '#4fc3f7', size: 2.5 });
  },
  eel(g, p, t, x, y, r, dir) {
    const n = 9, seg = r * 0.42, pts = [];
    for (let i = 0; i < n; i++) pts.push([x - dir * i * seg, y + Math.sin(t * 0.4 - i * 0.8) * r * 0.32]);
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(255,225,74,.35)'; g.lineWidth = r * 0.9; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); g.restore();
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = OUTLINE; g.lineWidth = r * 0.55; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
    g.strokeStyle = '#ffe14a'; g.lineWidth = r * 0.4; g.stroke();
    g.strokeStyle = '#3a3010'; g.lineWidth = 2;
    for (let i = 2; i < n; i += 2) { g.beginPath(); g.moveTo(pts[i][0], pts[i][1] - r * 0.2); g.lineTo(pts[i][0], pts[i][1] + r * 0.2); g.stroke(); }
    circle(g, x + dir * 3, pts[0][1], r * 0.32); fillStroke(g, '#ffe14a', 2);
    g.fillStyle = OUTLINE; circle(g, x + dir * 5, pts[0][1] - r * 0.08, r * 0.08); g.fill();
    if ((t % 6) < 3) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#fffbd0'; g.lineWidth = 1.6;
      for (let k = 0; k < 2; k++) { const q = pts[2 + k * 4]; g.beginPath(); g.moveTo(q[0], q[1]); let lx = q[0], ly = q[1]; for (let i = 0; i < 3; i++) { lx += (Math.random() - 0.5) * 18; ly += (Math.random() - 0.5) * 18; g.lineTo(lx, ly); } g.stroke(); }
      g.restore();
    }
  },
  bullet(g, p, t, x, y, r, dir) {
    const a = projAng(p, dir);
    g.translate(x, y); g.rotate(a); g.globalCompositeOperation = 'lighter';
    const tg = g.createLinearGradient(-46, 0, 0, 0); tg.addColorStop(0, 'rgba(255,90,90,0)'); tg.addColorStop(1, 'rgba(255,233,168,.9)');
    g.strokeStyle = tg; g.lineWidth = r * 0.9; g.lineCap = 'round'; g.beginPath(); g.moveTo(-46, 0); g.lineTo(0, 0); g.stroke();
    g.fillStyle = '#fffbe8'; g.beginPath(); g.ellipse(0, 0, r * 0.9, r * 0.45, 0, 0, Math.PI * 2); g.fill();
  },
  dagger(g, p, t, x, y, r, dir) {
    const a = projAng(p, dir);
    g.translate(x, y); g.rotate(a);
    g.save(); g.globalCompositeOperation = 'lighter';
    const tg = g.createLinearGradient(-r * 4, 0, 0, 0); tg.addColorStop(0, 'rgba(120,230,255,0)'); tg.addColorStop(1, 'rgba(159,242,255,.55)');
    g.fillStyle = tg; g.beginPath(); g.moveTo(-r * 4, 0); g.lineTo(0, -r * 0.4); g.lineTo(0, r * 0.4); g.fill(); g.restore();
    g.beginPath(); g.moveTo(r * 1.4, 0); g.lineTo(-r * 0.2, -r * 0.32); g.lineTo(-r * 0.2, r * 0.32); g.closePath();
    const bg = g.createLinearGradient(-r * 0.2, 0, r * 1.4, 0); bg.addColorStop(0, '#9ff2ff'); bg.addColorStop(1, '#ffffff');
    fillStroke(g, bg, 1.4);
    g.fillStyle = '#1b1d22'; g.fillRect(-r * 1.0, -r * 0.18, r * 0.8, r * 0.36);
    g.fillStyle = '#e8354a'; g.fillRect(-r * 0.3, -r * 0.45, r * 0.15, r * 0.9);
  },
  soundwave(g, p, t, x, y, r, dir) {
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const rr = r * (0.5 + i * 0.28) + Math.sin(t * 0.5 + i) * 2;
      g.strokeStyle = i % 2 ? 'rgba(255,61,240,.75)' : 'rgba(24,255,209,.8)'; g.lineWidth = 5 - i;
      g.beginPath(); g.arc(x - dir * r * 0.6, y, rr, dir > 0 ? -0.9 : Math.PI - 0.9, dir > 0 ? 0.9 : Math.PI + 0.9); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 2; i++) { const nx = x - dir * r * (0.2 + i * 0.5), ny = y - r * 0.9 + Math.sin(t * 0.2 + i * 2) * 4; circle(g, nx, ny, 3); g.fill(); g.fillRect(nx + 2, ny - 10, 1.6, 10); }
  },
  gear(g, p, t, x, y, r, dir) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,220,130,.25)'; circle(g, x, y, r * 1.6); g.fill(); g.restore();
    gear(g, x, y, r * 1.1, 9, t * 0.3 * dir, p.color || '#e6b84a');
  },
  potion(g, p, t, x, y, r, dir) {
    g.translate(x, y); g.rotate(t * 0.25 * dir);
    g.strokeStyle = OUTLINE; g.lineWidth = 2;
    rrect(g, -r * 0.3, -r * 1.6, r * 0.6, r * 0.8, 2); g.fillStyle = 'rgba(230,245,255,.9)'; g.fill(); g.stroke();
    circle(g, 0, 0, r); g.fillStyle = 'rgba(230,245,255,.9)'; g.fill(); g.stroke();
    g.fillStyle = `hsl(${(t * 6) % 360},95%,60%)`; g.beginPath(); g.arc(0, 0, r * 0.84, -0.2, Math.PI + 0.2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; circle(g, -r * 0.35, -r * 0.35, r * 0.2); g.fill();
    g.fillStyle = '#8a5a2c'; g.fillRect(-r * 0.35, -r * 1.85, r * 0.7, r * 0.35);
  },
  puddle(g, p, t, x, y, r, dir) {
    const c = p.color || '#7cff6b', w = r * 1.0, fire = c === '#ff7a1a', frost = c === '#9fe7ff';
    g.save(); g.globalCompositeOperation = 'lighter';
    const pg = g.createRadialGradient(x, y, 2, x, y, w); pg.addColorStop(0, hexA(c, 0.75)); pg.addColorStop(1, hexA(c, 0));
    g.fillStyle = pg; g.beginPath(); g.ellipse(x, y, w, w * 0.22, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    g.beginPath(); g.ellipse(x, y, w * 0.8, w * 0.14, 0, 0, Math.PI * 2); g.fillStyle = hexA(c, 0.6); g.fill(); g.strokeStyle = hexA(shade(c, -0.3), 0.9); g.lineWidth = 2; g.stroke();
    if (fire) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const fx0 = x - w * 0.6 + i * w * 0.3, fh = 18 + Math.sin(t * 0.35 + i * 1.7) * 8;
        const gr = g.createLinearGradient(0, y, 0, y - fh); gr.addColorStop(0, 'rgba(255,210,90,.85)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(fx0 - 7, y); g.quadraticCurveTo(fx0 - 5, y - fh * 0.6, fx0 + Math.sin(t * 0.3 + i) * 3, y - fh); g.quadraticCurveTo(fx0 + 5, y - fh * 0.5, fx0 + 7, y); g.fill();
      }
      g.restore();
    } else if (frost) {
      g.fillStyle = 'rgba(230,250,255,.9)'; g.strokeStyle = '#ffffff'; g.lineWidth = 1;
      for (let i = 0; i < 4; i++) { const sx = x - w * 0.5 + i * w * 0.33, sh = 10 + (i % 2) * 8; g.beginPath(); g.moveTo(sx - 4, y); g.lineTo(sx, y - sh); g.lineTo(sx + 4, y); g.closePath(); g.fill(); g.stroke(); }
    } else {
      for (let i = 0; i < 4; i++) {
        const k = ((t * 0.03 + i * 0.27) % 1), bx = x - w * 0.5 + ((i * 0.37) % 1) * w, by = y - k * 18;
        g.strokeStyle = `rgba(200,255,190,${1 - k})`; g.lineWidth = 1.5; circle(g, bx, by, 3 + k * 4); g.stroke();
      }
    }
  },
  flask(g, p, t, x, y, r, dir) {
    g.translate(x, y); if (!p.armed) g.rotate(t * 0.2 * dir);
    g.beginPath(); g.moveTo(-r * 0.3, -r * 1.3); g.lineTo(r * 0.3, -r * 1.3); g.lineTo(r * 0.3, -r * 0.5); g.lineTo(r * 1.0, r * 0.8); g.lineTo(-r * 1.0, r * 0.8); g.lineTo(-r * 0.3, -r * 0.5); g.closePath();
    g.fillStyle = 'rgba(230,245,255,.9)'; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.moveTo(-r * 0.62, r * 0.15); g.lineTo(r * 0.62, r * 0.15); g.lineTo(r * 0.95, r * 0.75); g.lineTo(-r * 0.95, r * 0.75); g.closePath(); g.fillStyle = p.armed && ((t >> 2) & 1) ? '#ffffff' : '#ff7ab8'; g.fill();
    g.fillStyle = '#8a5a2c'; g.fillRect(-r * 0.35, -r * 1.55, r * 0.7, r * 0.3);
    if (p.armed) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,90,170,.35)'; circle(g, 0, 0, r * 1.6 + Math.sin(t * 0.8) * 4); g.fill(); }
  }
};

/* ---------- status effects ---------- */
function drawStatusNew(g, f, t) {
  if (f.c && f.c.modes && typeof drawLegendOrbs === 'function') drawLegendOrbs(g, f, t);
  if (f.zap > 0 && f.dazzle && typeof drawDazzle === 'function') drawDazzle(g, f, t);
  else if (f.zap > 0 && !(t % 3 === 2)) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#fff6a0'; g.lineWidth = 2; g.lineJoin = 'miter';
    if (!PERF.low) { g.shadowColor = '#ffe14a'; g.shadowBlur = 8; }
    for (let k = 0; k < 3; k++) {
      g.beginPath(); let lx = f.x + (Math.random() - 0.5) * f.W, ly = f.y - Math.random() * f.H; g.moveTo(lx, ly);
      for (let i = 0; i < 4; i++) { lx += (Math.random() - 0.5) * 26; ly += (Math.random() - 0.5) * 26; g.lineTo(lx, ly); }
      g.stroke();
    }
    g.fillStyle = 'rgba(255,240,120,.18)'; g.beginPath(); g.ellipse(f.x, f.y - f.H / 2, f.W * 0.7, f.H * 0.6, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  if (f.slow > 0) {
    const cx = f.x, cy = f.y - f.H - 20;
    g.save();
    g.strokeStyle = 'rgba(230,184,74,.7)'; g.lineWidth = 2; g.setLineDash([5, 6]); g.lineDashOffset = t * 0.3;
    g.beginPath(); g.ellipse(f.x, f.y - 2, f.W * 0.8, 8, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    circle(g, cx, cy, 9); fillStroke(g, '#fff4d6', 2);
    g.strokeStyle = OUTLINE; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - 6); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(t * 0.05) * 5, cy + Math.sin(t * 0.05) * 5); g.stroke();
    g.restore();
  }
}

/* ---------- new particle effects ---------- */
function fxEventNew(type, x, y, a, b, col) {
  if (typeof fxLegend === 'function' && fxLegend(type, x, y, a, b)) return;
  if (typeof fxEventBoss2 === 'function' && fxEventBoss2(type, x, y, a, b)) return;
  switch (type) {
    case 'summon': {
      const sh = SHAPES[a] || '';
      const c = sh === 'puddle' ? '#bfffb5' : sh === 'eel' ? '#ffe14a' : '#9fe7ff';
      spawnFx({ k: 'ring', x, y, life: 18, r0: 8, r1: 70, col: c, lw: 5 });
      for (let i = 0; i < 16; i++) { const an = -Math.PI * Math.random(), s = 2 + Math.random() * 6; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, g: 0.25, life: 24, col: i % 2 ? '#ffffff' : c, size: 3 }); }
      break;
    }
    case 'rewind': {
      const x2 = a, y2 = b, n = 12;
      for (let i = 0; i <= n; i++) spawnFx({ k: 'spark', x: x + (x2 - x) * i / n, y: y + (y2 - y) * i / n, vx: 0, vy: 0, life: 14 + i * 1.5, col: i % 2 ? '#fff4d6' : '#e6b84a', size: 3.5 });
      spawnFx({ k: 'clock', x: x2, y: y2, life: 26, r: 46 });
      spawnFx({ k: 'ring', x, y, life: 14, r0: 40, r1: 6, col: '#e6b84a', lw: 4 });
      spawnFx({ k: 'flash', life: 5, a: 0.18, col: '255,235,180' });
      break;
    }
    case 'clank': for (let i = 0; i < 6; i++) { const an = -Math.PI * Math.random(); spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * 4, vy: Math.sin(an) * 4, life: 12, col: '#ffe9a8', size: 2.5 }); } break;
    case 'shock': for (let i = 0; i < (a ? 12 : 4); i++) { const an = Math.random() * 6.28, s = 2 + Math.random() * 5; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, life: 14, col: i % 2 ? '#fffbd0' : '#ffe14a', size: 3 }); } if (a) spawnFx({ k: 'ring', x, y, life: 12, r0: 10, r1: 60, col: '#ffe14a', lw: 4 }); break;
    case 'slowed': spawnFx({ k: 'clock', x, y, life: 22, r: 34 }); break;
    case 'trail': {
      const fx = MOVEFX[b];
      if (fx === 'beat') spawnFx({ k: 'note', x, y: y - 10 + (Math.random() - 0.5) * 30, vx: -a * 1.2, vy: -1.2, life: 34, col: Math.random() < 0.5 ? '#ff3df0' : '#18ffd1', size: 8 });
      else if (fx === 'fizz') for (let i = 0; i < 3; i++) spawnFx({ k: 'bubble', x, y: y + (Math.random() - 0.5) * 30, vx: -a * Math.random() * 2, vy: -0.5 - Math.random(), life: 30, col: i % 2 ? '#ff7ab8' : '#bfffb5', size: 3 + Math.random() * 4 });
      break;
    }
    case 'speaker': spawnFx({ k: 'speaker', x, y, life: 34 }); for (let i = 0; i < 3; i++) spawnFx({ k: 'ring', x, y: y - 20, life: 16 + i * 6, r0: 10, r1: 70 + i * 30, col: i % 2 ? '#ff3df0' : '#18ffd1', lw: 4 }); break;
    case 'spring': spawnFx({ k: 'spring', x, y, life: 24 }); break;
    case 'mindwisp': for (let i = 0; i < 5; i++) { const an = Math.random() * 6.28; spawnFx({ k: 'spark', x: x + Math.cos(an) * 20, y: y + Math.sin(an) * 20, vx: Math.cos(an) * 6, vy: Math.sin(an) * 3, life: 16, col: i % 2 ? '#f0d9ff' : '#b07cff', size: 3 }); } break;
    case 'bass': spawnFx({ k: 'ring', x, y, life: 18, r0: 20, r1: a * 0.75, col: Math.random() < 0.5 ? '#ff3df0' : '#18ffd1', lw: 6 }); spawnFx({ k: 'flash', life: 3, a: 0.08, col: '255,61,240' }); break;
    case 'clockfield': for (let i = 0; i < 3; i++) { const an = Math.random() * 6.28, rr = Math.random() * a * 0.5; spawnFx({ k: 'spark', x: x + Math.cos(an) * rr, y: y + Math.sin(an) * rr * 0.6, vx: 0, vy: -0.6, life: 26, col: '#ffe9a8', size: 2.5 }); } break;
  }
}

function drawFxNew(g, p, k) {
  switch (p.k) {
    case 'note': {
      g.globalAlpha = 1 - k; g.fillStyle = p.col; g.translate(p.x, p.y); g.rotate(Math.sin(p.t * 0.2) * 0.3);
      g.beginPath(); g.ellipse(0, 0, p.size * 0.6, p.size * 0.45, -0.4, 0, Math.PI * 2); g.fill();
      g.fillRect(p.size * 0.42, -p.size * 1.6, 2.2, p.size * 1.6); g.fillRect(p.size * 0.42, -p.size * 1.6, p.size * 0.7, 2.6);
      break;
    }
    case 'bubble': g.globalAlpha = 1 - k; g.strokeStyle = p.col; g.lineWidth = 1.5; circle(g, p.x, p.y, p.size); g.stroke(); g.fillStyle = 'rgba(255,255,255,.6)'; circle(g, p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.25); g.fill(); break;
    case 'clock': {
      g.globalAlpha = (1 - k) * 0.9; g.globalCompositeOperation = 'lighter';
      const r = p.r * (0.6 + k * 0.6);
      g.strokeStyle = '#ffe9a8'; g.lineWidth = 3; circle(g, p.x, p.y, r); g.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(p.x + Math.cos(a) * r * 0.8, p.y + Math.sin(a) * r * 0.8); g.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); g.stroke(); }
      const ha = -k * Math.PI * 4 - Math.PI / 2;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + Math.cos(ha) * r * 0.7, p.y + Math.sin(ha) * r * 0.7); g.stroke();
      break;
    }
    case 'speaker': {
      g.globalAlpha = Math.min(1, (1 - k) * 2); const pulse = 1 + Math.sin(p.t * 0.9) * 0.08;
      g.translate(p.x, p.y);
      rrect(g, -24, -56, 48, 56, 6); fillStroke(g, '#1a1726', 3);
      circle(g, 0, -20, 15 * pulse); fillStroke(g, '#2c2840', 2.5); g.fillStyle = '#ff3df0'; circle(g, 0, -20, 6); g.fill();
      circle(g, 0, -45, 6); fillStroke(g, '#2c2840', 2); g.fillStyle = '#18ffd1'; g.fillRect(-20, -4, 40, 2);
      break;
    }
    case 'spring': {
      g.globalAlpha = 1 - k; const h = 40 * (1 - Math.abs(Math.sin(k * Math.PI * 3)) * 0.5 * (1 - k));
      g.strokeStyle = '#e6b84a'; g.lineWidth = 4; g.beginPath(); g.moveTo(p.x, p.y);
      for (let i = 1; i <= 7; i++) g.lineTo(p.x + (i % 2 ? 1 : -1) * 16, p.y - h * i / 7);
      g.stroke(); g.fillStyle = '#7a5a2a'; g.fillRect(p.x - 20, p.y - 3, 40, 6); g.fillRect(p.x - 18, p.y - h - 3, 36, 5);
      break;
    }
  }
}
