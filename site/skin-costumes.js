'use strict';
/* ===== CLOUDTOP BRAWL — skin costumes =====
   Every skin is a whole outfit, not just new colours: hats, masks, helmets, capes, wings and armour drawn on top of
   the fighter (any fighter). skins.js does the colours and the glow; this file draws the costume pieces at four
   moments of drawing a fighter: 'back' (wings, capes), 'torso' (armour, scarves), 'head' (hats, masks) and 'hand'. */

const COS_GLASS = 'rgba(200,240,255,.28)';
/* --- little drawing helpers --- */
function cosPoly(g, pts, col, lw) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); fillStroke(g, col, lw || 2.5); }
function cosStar(g, x, y, r, col) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); fillStroke(g, col, 1.5); }
function cosFlower(g, x, y, r, col, mid) { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; circle(g, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55); fillStroke(g, col, 1.2); } circle(g, x, y, r * 0.42); fillStroke(g, mid || '#ffd35c', 1.2); }
function cosGem(g, x, y, r, col) { cosPoly(g, [[x, y - r], [x + r * 0.8, y], [x, y + r], [x - r * 0.8, y]], col, 1.5); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x - r * 0.2, y - r * 0.55, r * 0.25, r * 0.4); }
/* a crown on top of the head: n points, gems along the band */
function cosCrown(g, K, col, gem, n, tall) {
  const { hx, hy, hr } = K, y0 = hy - hr * 0.72, w = hr * 1.05, h = hr * (tall || 0.7), pts = [[hx - w, y0]];
  for (let i = 0; i <= n * 2; i++) pts.push([hx - w + (2 * w) * i / (n * 2), i % 2 ? y0 - h * 0.45 : y0 - h]);
  pts.push([hx + w, y0]);
  cosPoly(g, pts, col, 2.5);
  g.fillStyle = shade(col, -0.25); g.fillRect(hx - w, y0 - hr * 0.16, w * 2, hr * 0.16);
  for (let i = 0; i < 3; i++) { circle(g, hx - w * 0.6 + i * w * 0.6, y0 - hr * 0.08, hr * 0.1); fillStroke(g, gem, 1.2); }
}
/* bat or dragon wings from the shoulder blades */
function cosWings(g, K, col, edge, span, flap) {
  const { sw, shY, t } = K, f = Math.sin(t * (flap || 0.12)) * 0.12;
  [1, 0.8].forEach((k, i) => {
    g.save(); g.translate(-sw * 0.2 - i * 6, shY + 8); g.rotate(-0.5 - f - i * 0.25); g.scale(k, k);
    const L = sw * (span || 1.5);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-L * 0.2, -L * 0.75); g.lineTo(-L, -L * 0.55);
    g.quadraticCurveTo(-L * 0.78, -L * 0.25, -L * 0.85, -L * 0.05); g.quadraticCurveTo(-L * 0.55, -L * 0.1, -L * 0.55, L * 0.12);
    g.quadraticCurveTo(-L * 0.3, 0, -L * 0.2, L * 0.25); g.closePath(); fillStroke(g, i ? shade(col, -0.2) : col, 2.5);
    g.strokeStyle = edge; g.lineWidth = 2; g.beginPath(); g.moveTo(-L * 0.2, -L * 0.75); g.lineTo(-L * 0.55, L * 0.12); g.moveTo(-L * 0.2, -L * 0.75); g.lineTo(-L * 0.85, -L * 0.05); g.stroke();
    g.restore();
  });
}
/* feathered wings (Prism) */
function cosFeathers(g, K, cols) {
  const { sw, shY, t } = K, f = Math.sin(t * 0.1) * 0.1;
  for (let i = 0; i < 5; i++) {
    g.save(); g.translate(-sw * 0.2, shY + 10); g.rotate(-1.25 + i * 0.28 - f);
    g.beginPath(); g.ellipse(-sw * 0.55, 0, sw * 0.6, sw * 0.14, 0, 0, Math.PI * 2); fillStroke(g, cols[i % cols.length], 2);
    g.restore();
  }
}
/* a cape hanging from the shoulders */
function cosCape(g, K, out, inside, trim) {
  const { sw, shY, hipY, legL, t } = K, s = Math.sin(t * 0.08) * 4, bottom = hipY + legL * 0.75;
  cosPoly(g, [[sw * 0.35, shY + 2], [-sw * 0.5, shY + 2], [-sw * 1.05 + s, bottom], [sw * 0.1 + s * 0.5, bottom + 6]], out, 2.5);
  if (inside) { g.fillStyle = inside; g.beginPath(); g.moveTo(-sw * 0.42, shY + 8); g.lineTo(-sw * 0.92 + s, bottom - 4); g.lineTo(-sw * 0.62 + s, bottom - 2); g.closePath(); g.fill(); }
  if (trim) { g.fillStyle = trim; g.fillRect(-sw * 1.05 + s, bottom - 3, sw * 1.15, 7); }
}
/* a scarf around the neck with a tail blowing behind */
function cosScarf(g, K, a, b) {
  const { sw, shY, t } = K;
  rrect(g, -sw * 0.42, shY - 6, sw * 0.84, 12, 6); fillStroke(g, a, 2);
  g.fillStyle = b; for (let i = 0; i < 3; i++) g.fillRect(-sw * 0.3 + i * sw * 0.25, shY - 5, sw * 0.08, 10);
  const w = Math.sin(t * 0.2) * 4;
  cosPoly(g, [[-sw * 0.3, shY - 2], [-sw * 0.72, shY + 6 + w], [-sw * 0.78, shY + 16 + w], [-sw * 0.25, shY + 8]], a, 2);
}
/* a helmet or mask that covers the whole head */
function cosDome(g, K, col, sc) { const { hx, hy, hr } = K; circle(g, hx, hy, hr * (sc || 1.12)); fillStroke(g, col, 2.5); }

const COSTUMES = {
  /* ---------- event skins ---------- */
  harvest: {   // scarecrow
    head(g, K) {
      const { hx, hy, hr } = K;
      ['#e8c46a', '#d9a441'].forEach((c, i) => { cosPoly(g, [[hx - hr * (1.05 - i * 0.1), hy - hr * 0.2], [hx - hr * (1.45 - i * 0.1), hy + hr * 0.15], [hx - hr * (1.0 - i * 0.1), hy + hr * 0.05]], c, 1.5); });
      g.beginPath(); g.ellipse(hx, hy - hr * 0.62, hr * 1.75, hr * 0.32, -0.06, 0, Math.PI * 2); fillStroke(g, '#d9a441', 2.5);
      g.beginPath(); g.moveTo(hx - hr * 0.85, hy - hr * 0.7); g.quadraticCurveTo(hx - hr * 0.8, hy - hr * 1.75, hx, hy - hr * 1.7); g.quadraticCurveTo(hx + hr * 0.8, hy - hr * 1.75, hx + hr * 0.85, hy - hr * 0.72); g.closePath(); fillStroke(g, '#e0b252', 2.5);
      g.fillStyle = '#b5401a'; g.fillRect(hx - hr * 0.84, hy - hr * 0.98, hr * 1.68, hr * 0.22);
    },
    torso(g, K) {
      const { sw, shY, torsoH } = K;
      [[-0.3, 0.25, '#8a5a2a'], [0.05, 0.55, '#c2401a']].forEach(([x, y, c]) => {
        g.fillStyle = c; g.fillRect(sw * x, shY + torsoH * y, sw * 0.24, torsoH * 0.22);
        g.strokeStyle = '#f4e3b0'; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.strokeRect(sw * x, shY + torsoH * y, sw * 0.24, torsoH * 0.22); g.setLineDash([]);
      });
    },
    hand(g, K) { const [x, y] = K.hand; g.strokeStyle = '#e8c46a'; g.lineWidth = 2; g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(x, y); g.lineTo(x + 7 + Math.abs(i), y + i * 4); } g.stroke(); }
  },
  creepy: {   // a jack-o'-lantern head and bat wings
    back(g, K) { cosWings(g, K, '#2a1240', '#9b5cff', 1.15, 0.18); },
    head(g, K) {
      const { hx, hy, hr, t } = K;
      g.beginPath(); g.ellipse(hx, hy, hr * 1.25, hr * 1.1, 0, 0, Math.PI * 2); fillStroke(g, '#ff8a1f', 2.5);
      g.strokeStyle = '#c25a10'; g.lineWidth = 2; [-0.55, 0, 0.55].forEach(k => { g.beginPath(); g.ellipse(hx + hr * k, hy, hr * 0.32, hr * 1.05, 0, -Math.PI / 2, Math.PI / 2); g.stroke(); });
      cosPoly(g, [[hx - hr * 0.08, hy - hr * 1.05], [hx + hr * 0.12, hy - hr * 1.45], [hx + hr * 0.28, hy - hr * 1.35], [hx + hr * 0.15, hy - hr * 1.0]], '#3f7a2a', 2);
      const glow = 'rgba(255,' + (200 + Math.round(Math.sin(t * 0.3) * 40)) + ',60,1)';
      g.fillStyle = glow;
      [[0.15], [0.7]].forEach(([x]) => { g.beginPath(); g.moveTo(hx + hr * (x - 0.2), hy - hr * 0.05); g.lineTo(hx + hr * x, hy - hr * 0.45); g.lineTo(hx + hr * (x + 0.2), hy - hr * 0.05); g.closePath(); g.fill(); });
      g.beginPath(); g.moveTo(hx - hr * 0.2, hy + hr * 0.3);
      for (let i = 0; i <= 6; i++) g.lineTo(hx - hr * 0.2 + i * hr * 0.2, hy + hr * (i % 2 ? 0.42 : 0.3));
      g.lineTo(hx + hr * 0.95, hy + hr * 0.45); g.quadraticCurveTo(hx + hr * 0.4, hy + hr * 0.85, hx - hr * 0.2, hy + hr * 0.3); g.fill();
    }
  },
  frosty: {   // Santa hat and a striped scarf
    torso(g, K) { cosScarf(g, K, '#e8364a', '#ffffff'); },
    head(g, K) {
      const { hx, hy, hr, t } = K, flop = Math.sin(t * 0.08) * hr * 0.1;
      g.beginPath(); g.moveTo(hx - hr * 0.95, hy - hr * 0.7); g.quadraticCurveTo(hx - hr * 0.2, hy - hr * 2.2, hx - hr * 1.5 + flop, hy - hr * 1.5); g.quadraticCurveTo(hx + hr * 0.2, hy - hr * 1.8, hx + hr * 0.95, hy - hr * 0.72); g.closePath(); fillStroke(g, '#e8364a', 2.5);
      rrect(g, hx - hr * 1.05, hy - hr * 0.95, hr * 2.1, hr * 0.38, hr * 0.18); fillStroke(g, '#ffffff', 2);
      circle(g, hx - hr * 1.5 + flop, hy - hr * 1.5, hr * 0.26); fillStroke(g, '#ffffff', 2);
    }
  },
  lucky: {   // a lion-dance headdress
    back(g, K) {
      const { sw, shY, hipY, t } = K;
      for (let i = 0; i < 6; i++) { const y = shY + i * (hipY - shY) / 5, s = Math.sin(t * 0.15 + i) * 3; cosPoly(g, [[-sw * 0.4, y - 4], [-sw * 0.95 + s, y + 2], [-sw * 0.4, y + 8]], i % 2 ? '#ffcf3a' : '#ff6a2a', 1.5); }
    },
    head(g, K) {
      const { hx, hy, hr, t } = K, b = Math.sin(t * 0.25) * hr * 0.05;
      g.beginPath(); g.ellipse(hx + hr * 0.1, hy - hr * 0.35 + b, hr * 1.35, hr * 1.0, 0, Math.PI, 0); g.lineTo(hx + hr * 1.45, hy - hr * 0.1 + b); g.lineTo(hx - hr * 1.25, hy - hr * 0.1 + b); g.closePath(); fillStroke(g, '#d81e25', 2.5);
      g.fillStyle = '#ffcf3a'; g.fillRect(hx - hr * 1.25, hy - hr * 0.3 + b, hr * 2.7, hr * 0.2);
      [[0.25], [0.85]].forEach(([x]) => { circle(g, hx + hr * x, hy - hr * 0.75 + b, hr * 0.24); fillStroke(g, '#ffffff', 1.5); g.fillStyle = OUTLINE; circle(g, hx + hr * x + hr * 0.06, hy - hr * 0.75 + b, hr * 0.11); g.fill(); });
      cosPoly(g, [[hx + hr * 0.4, hy - hr * 1.2 + b], [hx + hr * 0.55, hy - hr * 1.75 + b], [hx + hr * 0.75, hy - hr * 1.2 + b]], '#ffcf3a', 1.5);
      for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ffcf3a'; circle(g, hx - hr * 1.2 + i * hr * 0.42, hy - hr * 0.05 + b, hr * 0.12); g.fill(); }
    }
  },
  blossom: {   // a flower crown and a petal scarf
    torso(g, K) { cosScarf(g, K, '#ffc6d9', '#ff8ab0'); },
    head(g, K) { const { hx, hy, hr } = K; for (let i = 0; i < 5; i++) cosFlower(g, hx - hr * 0.9 + i * hr * 0.45, hy - hr * 0.88 - Math.sin(i / 4 * Math.PI) * hr * 0.18, hr * 0.24, i % 2 ? '#ffffff' : '#ff9cc4'); }
  },
  beach: {   // sunglasses, a flower lei and a flower shirt
    torso(g, K) {
      const { sw, shY, torsoH } = K;
      [[-0.25, 0.4], [0.15, 0.7], [0.2, 0.3], [-0.2, 0.78]].forEach(([x, y], i) => cosFlower(g, sw * x, shY + torsoH * y, sw * 0.09, i % 2 ? '#ffe14a' : '#ff5aa0', '#ffffff'));
      for (let i = 0; i < 7; i++) { const a = Math.PI * (0.1 + i * 0.8 / 6); circle(g, Math.cos(a) * sw * 0.36, shY + Math.sin(a) * torsoH * 0.32, sw * 0.08); fillStroke(g, ['#ff5aa0', '#ffe14a', '#46c8ff'][i % 3], 1.2); }
    },
    head(g, K) {
      const { hx, hy, hr } = K;
      g.strokeStyle = OUTLINE; g.lineWidth = 2.5; g.beginPath(); g.moveTo(hx - hr * 0.9, hy - hr * 0.15); g.lineTo(hx + hr * 1.0, hy - hr * 0.15); g.stroke();
      [0.25, 0.75].forEach(x => { rrect(g, hx + hr * (x - 0.24), hy - hr * 0.3, hr * 0.48, hr * 0.32, hr * 0.12); fillStroke(g, '#1a1a2a', 2); g.fillStyle = 'rgba(120,220,255,.5)'; g.fillRect(hx + hr * (x - 0.16), hy - hr * 0.24, hr * 0.12, hr * 0.08); });
    }
  },
  /* ---------- Sky Road skins ---------- */
  gold: {   // a crown and gold armour
    torso(g, K) {
      const { sw, shY, torsoH } = K;
      cosPoly(g, [[-sw * 0.42, shY + 2], [sw * 0.42, shY + 2], [sw * 0.36, shY + torsoH * 0.62], [0, shY + torsoH * 0.82], [-sw * 0.36, shY + torsoH * 0.62]], '#e6b422', 2.5);
      g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(-sw * 0.28, shY + 6, sw * 0.1, torsoH * 0.4);
      cosStar(g, sw * 0.05, shY + torsoH * 0.35, sw * 0.12, '#fff1a8');
    },
    head(g, K) { cosCrown(g, K, '#f2c230', '#e8364a', 3); }
  },
  shadow: {   // a ninja hood, mask and trailing ribbons
    back(g, K) { const { sw, shY, t } = K; g.lineCap = 'round'; [0, 1].forEach(i => { g.strokeStyle = '#a35cff'; g.lineWidth = 5; g.beginPath(); g.moveTo(-sw * 0.1, shY - 10 + i * 6); for (let k = 1; k <= 5; k++) g.lineTo(-sw * 0.1 - k * 12, shY - 10 + i * 8 + Math.sin(t * 0.25 + k + i) * 5 + k * 3); g.stroke(); }); },
    head(g, K) {
      const { hx, hy, hr } = K;
      cosDome(g, K, '#1a1530', 1.1);
      g.fillStyle = '#e8b98f'; rrect(g, hx - hr * 0.05, hy - hr * 0.42, hr * 1.1, hr * 0.42, hr * 0.15); g.fill();
      g.fillStyle = OUTLINE; circle(g, hx + hr * 0.3, hy - hr * 0.2, hr * 0.09); g.fill(); circle(g, hx + hr * 0.75, hy - hr * 0.2, hr * 0.09); g.fill();
      g.fillStyle = '#a35cff'; g.fillRect(hx - hr * 1.08, hy - hr * 0.75, hr * 2.15, hr * 0.2);
    }
  },
  neon: {   // a glowing visor and light lines
    torso(g, K) { const { sw, shY, torsoH, t } = K; g.save(); g.shadowColor = '#46e0ff'; g.shadowBlur = 10; g.strokeStyle = (t >> 4) & 1 ? '#46e0ff' : '#ff4fd8'; g.lineWidth = 3; g.beginPath(); g.moveTo(-sw * 0.35, shY + torsoH * 0.2); g.lineTo(0, shY + torsoH * 0.45); g.lineTo(sw * 0.35, shY + torsoH * 0.2); g.moveTo(0, shY + torsoH * 0.45); g.lineTo(0, shY + torsoH * 0.9); g.stroke(); g.restore(); },
    head(g, K) { const { hx, hy, hr } = K; g.save(); g.shadowColor = '#46e0ff'; g.shadowBlur = 14; rrect(g, hx - hr * 0.6, hy - hr * 0.4, hr * 1.75, hr * 0.42, hr * 0.2); fillStroke(g, '#46e0ff', 2); g.restore(); g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(hx - hr * 0.3, hy - hr * 0.33, hr * 1.1, hr * 0.08); }
  },
  crystal: {   // crystal shards on the shoulders and a tiara
    torso(g, K) {
      const { sw, shY } = K;
      [-1, 1].forEach(s => { [[0, 1.0], [0.18, 0.7], [-0.16, 0.6]].forEach(([dx, h]) => { const x = s * sw * (0.42 + dx * s * 0.6); cosPoly(g, [[x - 5, shY + 4], [x, shY - sw * 0.38 * h], [x + 5, shY + 4]], 'rgba(170,235,255,.92)', 1.5); }); });
    },
    head(g, K) { const { hx, hy, hr } = K; g.strokeStyle = '#cfefff'; g.lineWidth = 3; g.beginPath(); g.arc(hx, hy + hr * 0.1, hr * 0.98, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); cosGem(g, hx + hr * 0.1, hy - hr * 1.0, hr * 0.28, '#9fe7ff'); }
  },
  inferno: {   // flame hair and horns
    head(g, K) {
      const { hx, hy, hr, t } = K;
      [[-0.75, 0.9], [-0.35, 1.3], [0.05, 1.6], [0.45, 1.25], [0.8, 0.85]].forEach(([x, h], i) => {
        const f = Math.sin(t * 0.35 + i * 1.7) * hr * 0.15;
        cosPoly(g, [[hx + hr * (x - 0.3), hy - hr * 0.55], [hx + hr * x + f, hy - hr * (0.6 + h)], [hx + hr * (x + 0.3), hy - hr * 0.55]], i % 2 ? '#ffcf3a' : '#ff6a1a', 1.5);
      });
      [-0.65, 0.75].forEach(x => cosPoly(g, [[hx + hr * (x - 0.15), hy - hr * 0.75], [hx + hr * (x + 0.05), hy - hr * 1.35], [hx + hr * (x + 0.2), hy - hr * 0.7]], '#3a0806', 1.5));
    }
  },
  ocean: {   // a brass diving helmet and an air tank
    back(g, K) { const { sw, shY, torsoH } = K; rrect(g, -sw * 0.7, shY + torsoH * 0.05, sw * 0.32, torsoH * 0.8, sw * 0.12); fillStroke(g, '#c9932a', 2.5); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-sw * 0.64, shY + torsoH * 0.15, sw * 0.06, torsoH * 0.5); },
    head(g, K) {
      const { hx, hy, hr, t } = K;
      cosDome(g, K, '#c9932a', 1.22);
      circle(g, hx + hr * 0.45, hy - hr * 0.05, hr * 0.62); fillStroke(g, '#5a3a10', 2.5);
      circle(g, hx + hr * 0.45, hy - hr * 0.05, hr * 0.46); g.fillStyle = 'rgba(120,220,255,.45)'; g.fill();
      g.fillStyle = 'rgba(255,255,255,.6)'; circle(g, hx + hr * 0.3, hy - hr * 0.25, hr * 0.1); g.fill();
      [[-0.8, -0.6], [-0.9, 0.4], [0.3, -1.1]].forEach(([x, y]) => { circle(g, hx + hr * x, hy + hr * y, hr * 0.12); fillStroke(g, '#e6b84a', 1.2); });
      g.strokeStyle = 'rgba(220,245,255,.8)'; g.lineWidth = 1.5; circle(g, hx + hr * 1.3, hy - hr * (1.0 + ((t % 60) / 60) * 1.2), hr * 0.12); g.stroke();
    }
  },
  galaxy: {   // an astronaut helmet and a jetpack
    back(g, K) {
      const { sw, shY, torsoH, t } = K;
      rrect(g, -sw * 0.78, shY + torsoH * 0.05, sw * 0.38, torsoH * 0.75, 6); fillStroke(g, '#e8eef7', 2.5);
      g.fillStyle = (t >> 3) & 1 ? '#ffd35c' : '#ff6a2a'; cosPoly(g, [[-sw * 0.72, shY + torsoH * 0.8], [-sw * 0.6, shY + torsoH * (1.05 + ((t >> 2) & 1) * 0.1)], [-sw * 0.47, shY + torsoH * 0.8]], g.fillStyle, 1.5);
    },
    head(g, K) {
      const { hx, hy, hr } = K;
      circle(g, hx + hr * 0.1, hy, hr * 1.42); g.fillStyle = 'rgba(160,140,255,.22)'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#e8eef7'; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.5; g.beginPath(); g.arc(hx + hr * 0.1, hy, hr * 1.2, Math.PI * 1.15, Math.PI * 1.45); g.stroke();
      rrect(g, hx - hr * 1.0, hy + hr * 1.1, hr * 2.2, hr * 0.3, hr * 0.12); fillStroke(g, '#c8a8ff', 2);
    }
  },
  prism: {   // a rainbow halo and rainbow wings
    back(g, K) { cosFeathers(g, K, ['#ff6b6b', '#ffd35c', '#6fe39a', '#46e0ff', '#c8a8ff']); },
    head(g, K) { const { hx, hy, hr, t } = K; g.save(); g.lineWidth = hr * 0.18; g.strokeStyle = 'hsl(' + ((t * 3) % 360) + ',100%,65%)'; g.shadowColor = g.strokeStyle; g.shadowBlur = 12; g.beginPath(); g.ellipse(hx, hy - hr * 1.45, hr * 0.85, hr * 0.25, 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
  },
  royal: {   // a king's crown, a royal cape and a sceptre
    back(g, K) { cosCape(g, K, '#7a1aa8', '#c4161c', '#ffffff'); },
    head(g, K) { cosCrown(g, K, '#ffd35c', '#c4161c', 4, 0.85); },
    hand(g, K) {
      const [x, y] = K.hand, L = K.H * 0.38;
      g.save(); g.translate(x, y); g.rotate(-0.35); g.strokeStyle = OUTLINE; g.lineWidth = 6; g.beginPath(); g.moveTo(0, L * 0.3); g.lineTo(0, -L * 0.6); g.stroke();
      g.strokeStyle = '#ffd35c'; g.lineWidth = 3; g.stroke(); circle(g, 0, -L * 0.66, L * 0.1); fillStroke(g, '#c4161c', 2); g.restore();
    }
  },
  toxic: {   // a gas mask and a toxic tank
    back(g, K) { const { sw, shY, torsoH } = K; rrect(g, -sw * 0.72, shY + torsoH * 0.1, sw * 0.34, torsoH * 0.7, sw * 0.15); fillStroke(g, '#4fcf1a', 2.5); g.fillStyle = '#1a2a0a'; g.font = 'bold ' + Math.round(sw * 0.22) + 'px sans-serif'; g.textAlign = 'center'; g.fillText('☢', -sw * 0.55, shY + torsoH * 0.5); },
    head(g, K) {
      const { hx, hy, hr } = K;
      g.strokeStyle = '#2a3a2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(hx - hr * 0.95, hy - hr * 0.2); g.lineTo(hx + hr * 0.3, hy - hr * 0.2); g.stroke();
      [0.28, 0.78].forEach(x => { circle(g, hx + hr * x, hy - hr * 0.22, hr * 0.26); fillStroke(g, '#3a4a3a', 2); circle(g, hx + hr * x, hy - hr * 0.22, hr * 0.16); g.fillStyle = 'rgba(180,255,90,.8)'; g.fill(); });
      rrect(g, hx + hr * 0.35, hy + hr * 0.1, hr * 0.7, hr * 0.6, hr * 0.2); fillStroke(g, '#4a5a4a', 2.5);
      circle(g, hx + hr * 1.05, hy + hr * 0.42, hr * 0.28); fillStroke(g, '#2a3a2a', 2);
    }
  },
  phantom: {   // a ghostly hood and a tattered cloak
    back(g, K) {
      const { sw, shY, hipY, legL, t } = K, b = hipY + legL * 0.8, pts = [[sw * 0.3, shY]];
      for (let i = 0; i <= 6; i++) pts.push([sw * 0.2 - i * sw * 0.2 + Math.sin(t * 0.1 + i) * 3, b + (i % 2 ? -12 : 0)]);
      pts.push([-sw * 0.5, shY]);
      g.save(); g.globalAlpha *= 0.85; cosPoly(g, pts, '#bfd4e6', 2); g.restore();
    },
    head(g, K) {
      const { hx, hy, hr, t } = K;
      g.beginPath(); g.arc(hx, hy - hr * 0.05, hr * 1.25, Math.PI * 0.8, Math.PI * 2.2); g.lineTo(hx + hr * 1.1, hy + hr * 0.9); g.lineTo(hx - hr * 1.2, hy + hr * 0.9); g.closePath(); fillStroke(g, '#e6f2fa', 2.5);
      g.beginPath(); g.ellipse(hx + hr * 0.45, hy + hr * 0.05, hr * 0.62, hr * 0.75, 0, 0, Math.PI * 2); g.fillStyle = '#0d1424'; g.fill();
      g.save(); g.shadowColor = '#bff4ff'; g.shadowBlur = 10; g.fillStyle = 'rgba(191,244,255,' + (0.7 + Math.sin(t * 0.1) * 0.3) + ')'; circle(g, hx + hr * 0.25, hy - hr * 0.05, hr * 0.12); g.fill(); circle(g, hx + hr * 0.7, hy - hr * 0.05, hr * 0.12); g.fill(); g.restore();
    }
  },
  mythic: {   // dragon horns and dragon wings
    back(g, K) { cosWings(g, K, '#b3201a', '#ffd35c', 1.3, 0.1); },
    head(g, K) {
      const { hx, hy, hr } = K;
      [[-0.55, -1], [0.45, 1]].forEach(([x, s]) => { g.beginPath(); g.moveTo(hx + hr * (x - 0.15), hy - hr * 0.75); g.quadraticCurveTo(hx + hr * (x - 0.6), hy - hr * 1.6, hx + hr * (x - 0.15 - s * 0.05), hy - hr * 2.0); g.quadraticCurveTo(hx + hr * (x - 0.15), hy - hr * 1.4, hx + hr * (x + 0.2), hy - hr * 0.8); g.closePath(); fillStroke(g, '#ffd35c', 2); });
      g.fillStyle = '#ff3a2a'; [0.1, 0.5, 0.9].forEach(k => { g.beginPath(); g.moveTo(hx - hr * (0.9 + k * 0.1), hy - hr * (0.3 - k * 0.6)); g.lineTo(hx - hr * (1.35 + k * 0.1), hy - hr * (0.5 - k * 0.6)); g.lineTo(hx - hr * (0.95 + k * 0.1), hy - hr * (0.0 - k * 0.6)); g.fill(); });
    }
  },
  /* ---------- shop skins ---------- */
  bubblegum: {   // cat-ear headphones and a big bubblegum bubble
    head(g, K) {
      const { hx, hy, hr, t } = K, bub = hr * (0.35 + 0.2 * (0.5 + Math.sin(t * 0.06) * 0.5));
      g.strokeStyle = OUTLINE; g.lineWidth = 6; g.beginPath(); g.arc(hx, hy, hr * 1.08, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.strokeStyle = '#ff8ac4'; g.lineWidth = 3.5; g.stroke();
      [-0.75, 0.75].forEach(x => cosPoly(g, [[hx + hr * (x - 0.3), hy - hr * 0.8], [hx + hr * x, hy - hr * 1.45], [hx + hr * (x + 0.3), hy - hr * 0.75]], '#ff8ac4', 2));
      circle(g, hx - hr * 1.0, hy, hr * 0.3); fillStroke(g, '#ffe0f0', 2);
      circle(g, hx + hr * 1.05 + bub * 0.6, hy + hr * 0.35, bub); g.fillStyle = 'rgba(255,140,200,.85)'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#a8306a'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)'; circle(g, hx + hr * 0.95 + bub * 0.4, hy + hr * 0.2, bub * 0.25); g.fill();
    }
  },
  midnight: {   // a vampire cape with a high collar
    back(g, K) {
      cosCape(g, K, '#0a0a1a', '#b3121a', null);
      const { shY, hx, hr } = K;
      cosPoly(g, [[hx - hr * 1.0, shY + 2], [hx - hr * 1.5, shY - hr * 1.5], [hx - hr * 0.3, shY - hr * 0.4]], '#1a1f4a', 2);
      cosPoly(g, [[hx + hr * 0.8, shY + 2], [hx + hr * 1.3, shY - hr * 1.35], [hx + hr * 0.1, shY - hr * 0.4]], '#1a1f4a', 2);
    },
    head(g, K) { const { hx, hy, hr } = K; g.fillStyle = '#ffffff'; [0.55, 0.8].forEach(x => { g.beginPath(); g.moveTo(hx + hr * (x - 0.07), hy + hr * 0.42); g.lineTo(hx + hr * x, hy + hr * 0.62); g.lineTo(hx + hr * (x + 0.07), hy + hr * 0.42); g.fill(); }); }
  },
  lava: {   // rock armour with glowing cracks and a rock crest
    torso(g, K) {
      const { sw, shY, torsoH, t } = K, glow = 'rgba(255,' + (110 + Math.round(Math.sin(t * 0.2) * 40)) + ',20,1)';
      [[-0.45, 0.05, 0.45, 0.45], [0, 0.0, 0.45, 0.42], [-0.3, 0.5, 0.6, 0.38]].forEach(([x, y, w, h]) => cosPoly(g, [[sw * x, shY + torsoH * y], [sw * (x + w), shY + torsoH * (y + 0.04)], [sw * (x + w * 0.9), shY + torsoH * (y + h)], [sw * (x + 0.05), shY + torsoH * (y + h * 0.9)]], '#3a2a24', 2));
      g.strokeStyle = glow; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-sw * 0.3, shY + torsoH * 0.2); g.lineTo(-sw * 0.05, shY + torsoH * 0.48); g.lineTo(sw * 0.2, shY + torsoH * 0.3); g.moveTo(-sw * 0.05, shY + torsoH * 0.48); g.lineTo(0, shY + torsoH * 0.82); g.stroke();
    },
    head(g, K) { const { hx, hy, hr } = K; [[-0.6, 0.9], [-0.15, 1.25], [0.3, 1.0]].forEach(([x, h]) => cosPoly(g, [[hx + hr * (x - 0.25), hy - hr * 0.7], [hx + hr * x, hy - hr * (0.7 + h * 0.6)], [hx + hr * (x + 0.25), hy - hr * 0.75]], '#3a2a24', 2)); g.fillStyle = '#ff6a1a'; g.fillRect(hx - hr * 0.7, hy - hr * 0.78, hr * 1.2, hr * 0.08); }
  },
  arctic: {   // a fur-lined parka hood and toggles
    torso(g, K) { const { sw, shY, torsoH } = K; g.strokeStyle = '#3da5ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(sw * 0.02, shY + 4); g.lineTo(sw * 0.02, shY + torsoH); g.stroke(); [0.3, 0.55, 0.8].forEach(y => { rrect(g, sw * 0.06, shY + torsoH * y - 3, sw * 0.14, 6, 3); fillStroke(g, '#8a5a2a', 1.5); }); },
    head(g, K) {
      const { hx, hy, hr } = K;
      g.lineWidth = hr * 0.5; g.strokeStyle = OUTLINE; g.beginPath(); g.arc(hx, hy, hr * 1.22, 0, Math.PI * 2); g.stroke();
      g.lineWidth = hr * 0.4; g.strokeStyle = '#3d7ac0'; g.stroke();
      g.lineWidth = hr * 0.26; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(hx, hy, hr * 1.0, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 1.5; g.strokeStyle = '#cfe6f6'; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.beginPath(); g.moveTo(hx + Math.cos(a) * hr * 0.88, hy + Math.sin(a) * hr * 0.88); g.lineTo(hx + Math.cos(a) * hr * 1.12, hy + Math.sin(a) * hr * 1.12); g.stroke(); }
    }
  },
  circuit: {   // a robot helmet with an antenna, and a chest panel
    torso(g, K) { const { sw, shY, torsoH, t } = K; rrect(g, -sw * 0.25, shY + torsoH * 0.2, sw * 0.5, torsoH * 0.38, 4); fillStroke(g, '#0d2a20', 2); ['#46ffb0', '#46e0ff', '#ffd35c'].forEach((c, i) => { g.fillStyle = ((t >> 4) + i) % 3 ? c : '#1a4a3a'; circle(g, -sw * 0.12 + i * sw * 0.12, shY + torsoH * 0.32, sw * 0.045); g.fill(); }); g.fillStyle = '#46ffb0'; g.fillRect(-sw * 0.18, shY + torsoH * 0.44, sw * 0.36, 3); },
    head(g, K) {
      const { hx, hy, hr, t } = K;
      rrect(g, hx - hr * 1.1, hy - hr * 1.05, hr * 2.25, hr * 2.0, hr * 0.35); fillStroke(g, '#2a3a44', 2.5);
      rrect(g, hx - hr * 0.2, hy - hr * 0.45, hr * 1.2, hr * 0.45, hr * 0.15); fillStroke(g, '#04140e', 2);
      g.save(); g.shadowColor = '#46ffb0'; g.shadowBlur = 8; g.fillStyle = '#46ffb0'; g.fillRect(hx - hr * 0.05, hy - hr * 0.32, hr * 0.32, hr * 0.18); g.fillRect(hx + hr * 0.5, hy - hr * 0.32, hr * 0.32, hr * 0.18); g.restore();
      g.strokeStyle = OUTLINE; g.lineWidth = 3; g.beginPath(); g.moveTo(hx - hr * 0.3, hy - hr * 1.05); g.lineTo(hx - hr * 0.3, hy - hr * 1.6); g.stroke();
      circle(g, hx - hr * 0.3, hy - hr * 1.65, hr * 0.14); fillStroke(g, (t >> 4) & 1 ? '#ff4a3a' : '#46ffb0', 1.5);
      g.strokeStyle = '#46e0ff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(hx - hr * 0.9, hy + hr * 0.3); g.lineTo(hx - hr * 0.5, hy + hr * 0.3); g.lineTo(hx - hr * 0.5, hy + hr * 0.7); g.stroke();
    }
  },
  diamond: {   // a diamond crown and crystal armour
    torso(g, K) {
      const { sw, shY, torsoH } = K;
      cosPoly(g, [[-sw * 0.42, shY + 2], [0, shY + torsoH * 0.1], [sw * 0.42, shY + 2], [sw * 0.3, shY + torsoH * 0.55], [0, shY + torsoH * 0.78], [-sw * 0.3, shY + torsoH * 0.55]], 'rgba(200,244,255,.9)', 2);
      g.strokeStyle = 'rgba(120,180,220,.9)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-sw * 0.42, shY + 2); g.lineTo(0, shY + torsoH * 0.78); g.lineTo(sw * 0.42, shY + 2); g.moveTo(-sw * 0.3, shY + torsoH * 0.55); g.lineTo(sw * 0.3, shY + torsoH * 0.55); g.stroke();
    },
    head(g, K) { cosCrown(g, K, '#dff6ff', '#9fe7ff', 3, 0.75); cosGem(g, K.hx, K.hy - K.hr * 1.7, K.hr * 0.38, '#bff4ff'); }
  }
};
/* draw the costume after each part of the fighter (any fighter, in any mode and in the menus) */
if (typeof lookHook === 'function') {
  const lookHookBeforeCostumes = lookHook;
  lookHook = function (g, part, K) {
    lookHookBeforeCostumes(g, part, K);
    const cos = K.f && K.f.skin && COSTUMES[K.f.skin];
    if (!cos || !cos[part]) return;
    g.save();
    try { cos[part](g, K); } catch (e) { }
    g.restore();
  };
}
