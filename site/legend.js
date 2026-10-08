'use strict';
/* ===== CLOUDTOP BRAWL — Legend Yen: the ultra max fighter =====
   Keys 1–7 (or the STYLE button on phones) switch between the styles of
   Zephyr, Blaze, Volt, Mr. Chiu, Mr. Guo, Lumi and Kiro. A pop-up in the
   bottom-left corner shows which style is on. */

function legendColor(f) {
  const c = f.c; if (!c || !c.modes) return '#ffd35c';
  const m = CHAR[c.modes[f.yenMode | 0]];
  return m ? m.look.accent : '#ffd35c';
}

/* ---------- look ---------- */
const LOOK_LEGEND = {
  back(g, K) {
    const { sw, shY, hipY, legL, f, t } = K, col = K.portrait ? '#ffd35c' : legendColor(f);
    const wv = Math.sin(t * 0.1) * 6 + (f.pose === 'run' ? Math.sin(t * 0.35) * 5 : 0);
    g.beginPath(); g.moveTo(-sw * 0.45, shY); g.lineTo(sw * 0.3, shY);
    g.quadraticCurveTo(-sw * 0.1 + wv, hipY, -sw * 0.3 + wv * 1.3, hipY + legL * 0.98);
    g.lineTo(-sw * 1.15 + wv * 1.7, hipY + legL * 0.9);
    g.quadraticCurveTo(-sw * 0.9, hipY - 10, -sw * 0.45, shY); g.closePath();
    const cg = g.createLinearGradient(0, shY, 0, hipY + legL); cg.addColorStop(0, '#1d1830'); cg.addColorStop(1, col);
    g.fillStyle = cg; g.fill(); g.lineWidth = 3; g.strokeStyle = OUTLINE; g.stroke();
    g.strokeStyle = '#ffd35c'; g.lineWidth = 2; g.beginPath(); g.moveTo(-sw * 0.3 + wv * 1.3, hipY + legL * 0.95); g.lineTo(-sw * 1.12 + wv * 1.7, hipY + legL * 0.87); g.stroke();
  },
  torso(g, K) {
    const { sw, shY, hipY, torsoH, f, portrait } = K, col = portrait ? '#ffd35c' : legendColor(f);
    // gold shoulder plates + V emblem + glowing core in the style colour
    [[-0.36], [0.36]].forEach(([x]) => { g.beginPath(); g.ellipse(sw * x, shY + 3, sw * 0.2, torsoH * 0.13, 0, 0, Math.PI * 2); fillStroke(g, '#ffd35c', 2); });
    g.strokeStyle = '#ffd35c'; g.lineWidth = 3; g.beginPath(); g.moveTo(-sw * 0.3, shY + 4); g.lineTo(sw * 0.05, shY + torsoH * 0.55); g.lineTo(sw * 0.38, shY + 4); g.stroke();
    circle(g, sw * 0.05, shY + torsoH * 0.42, sw * 0.13); fillStroke(g, col, 2);
    if (!portrait) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = hexA(col, 0.45); circle(g, sw * 0.05, shY + torsoH * 0.42, sw * 0.26 + Math.sin(K.t * 0.2) * 2); g.fill(); g.restore(); }
    g.fillStyle = '#ffd35c'; g.fillRect(-sw / 2 + 1, hipY - 6, sw - 2, 6);
    g.fillStyle = col; g.fillRect(-4, hipY - 7, 8, 8);
  },
  head(g, K) {
    const { hx, hy, hr, f, t, portrait, L } = K, col = portrait ? '#ffd35c' : legendColor(f);
    // tall golden spiky hair
    g.beginPath(); g.moveTo(hx - hr * 1.0, hy + hr * 0.1);
    [[-1.5, -0.4], [-1.05, -0.75], [-1.45, -1.35], [-0.6, -1.1], [-0.55, -2.0], [-0.05, -1.25], [0.35, -2.05], [0.55, -1.15], [1.25, -1.5], [0.95, -0.7], [1.3, -0.45]].forEach(([a, b]) => g.lineTo(hx + hr * a, hy + hr * b + (b < -1.2 && !portrait ? Math.sin(t * 0.2 + a) * 1.5 : 0)));
    g.lineTo(hx + hr * 0.6, hy - hr * 0.4); g.lineTo(hx - hr * 0.3, hy - hr * 0.35); g.closePath();
    const hg = g.createLinearGradient(0, hy - hr * 2, 0, hy); hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, L.hair || '#fff3c4');
    fillStroke(g, hg, 2.5);
    // headband in the style colour with flowing tails
    g.fillStyle = col; g.fillRect(hx - hr * 1.0, hy - hr * 0.55, hr * 2.0, hr * 0.2);
    const tw = portrait ? 0 : Math.sin(t * 0.25) * 4;
    g.strokeStyle = col; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx - hr, hy - hr * 0.45); g.quadraticCurveTo(hx - hr * 1.6, hy - hr * 0.2 + tw, hx - hr * 2.1, hy + tw); g.stroke();
    // glowing eyes
    g.save(); if (!portrait) { g.shadowColor = col; g.shadowBlur = 10; }
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(hx + hr * 0.3, hy - hr * 0.12, hr * 0.13, hr * 0.08, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(hx + hr * 0.7, hy - hr * 0.12, hr * 0.13, hr * 0.08, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = col; circle(g, hx + hr * 0.33, hy - hr * 0.12, hr * 0.06); g.fill(); circle(g, hx + hr * 0.73, hy - hr * 0.12, hr * 0.06); g.fill();
    g.restore();
    g.strokeStyle = OUTLINE; g.lineWidth = 1.8; g.beginPath(); g.moveTo(hx + hr * 0.4, hy + hr * 0.4); g.lineTo(hx + hr * 0.75, hy + hr * 0.36); g.stroke();
  },
  hand(g, K) {
    if (K.portrait) return;
    const [x, y] = K.hand, col = legendColor(K.f);
    g.save(); g.globalCompositeOperation = 'lighter';
    const gl = g.createRadialGradient(x, y, 0, x, y, 18); gl.addColorStop(0, 'rgba(255,255,255,.7)'); gl.addColorStop(0.5, hexA(col, 0.5)); gl.addColorStop(1, hexA(col, 0));
    g.fillStyle = gl; circle(g, x, y, 18); g.fill(); g.restore();
  }
};

/* seven little style orbs circling Legend Yen; the active one is bigger */
function drawLegendOrbs(g, f, t) {
  if (!f.c || !f.c.modes || f.frozen > 0) return;
  const n = f.c.modes.length, cur = f.yenMode | 0, cx = f.x, cy = f.y - f.H * 0.55;
  g.save();
  for (let i = 0; i < n; i++) {
    const a = t * 0.04 + i / n * Math.PI * 2, x = cx + Math.cos(a) * f.W * 1.05, y = cy + Math.sin(a) * f.H * 0.22;
    const col = CHAR[f.c.modes[i]].look.accent, on = i === cur;
    if (Math.sin(a) < 0 && !on) g.globalAlpha = 0.55; else g.globalAlpha = 1;
    circle(g, x, y, on ? 6 : 3.5); g.fillStyle = col; g.fill();
    if (on) { g.lineWidth = 2; g.strokeStyle = '#ffffff'; g.stroke(); }
  }
  g.restore();
}

/* ---------- style pop-up (bottom left) ---------- */
const LEGEND = { el: null, last: null, hideT: 0, key: '' };
function legendEl() {
  if (LEGEND.el) return LEGEND.el;
  const st = document.createElement('style');
  st.textContent = `#style-pop{position:fixed;left:16px;bottom:118px;z-index:60;pointer-events:none;background:rgba(17,14,36,.88);border:2px solid var(--pc,#ffd35c);border-radius:14px;padding:10px 14px 10px;min-width:210px;opacity:0;transform:translateY(10px);transition:opacity .2s ease,transform .2s ease;font-family:"Chakra Petch",system-ui,sans-serif;color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.45)}
#style-pop.show{opacity:1;transform:none}
#style-pop .sp-big{display:flex;align-items:center;gap:10px;font-family:"Dela Gothic One",Impact,sans-serif;font-size:24px;line-height:1}
#style-pop .sp-num{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;background:var(--pc,#ffd35c);color:#120d24;font-size:20px}
#style-pop .sp-sub{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#c9c5e6;margin:0 0 6px}
#style-pop .sp-row{display:flex;gap:4px;margin-top:9px}
#style-pop .sp-row i{display:grid;place-items:center;width:22px;height:22px;border-radius:6px;font-style:normal;font-size:11px;font-weight:700;background:rgba(255,255,255,.1);color:#fff;border:1px solid transparent}
#style-pop .sp-row i.on{background:var(--c);color:#120d24;border-color:#fff}
#style-btn{right:calc(18px * var(--ts));bottom:calc(190px * var(--ts));width:calc(60px * var(--ts));height:calc(60px * var(--ts));font-size:calc(10px * var(--ts));background:rgba(255,211,92,.4);border-color:#ffe9a8}
@media (max-width:560px){#style-pop{bottom:96px;left:10px;min-width:180px}#style-pop .sp-big{font-size:19px}}`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'style-pop'; el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  LEGEND.el = el;
  // phone button that steps through the styles
  const tb = document.getElementById('tbtns');
  if (tb) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tb'; b.id = 'style-btn'; b.textContent = 'STYLE'; b.hidden = true; b.setAttribute('aria-label', 'Switch style');
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      const f = LEGEND.f; if (!f || !f.c.modes) return;
      IN.mode = ((f.yenMode | 0) + 1) % f.c.modes.length + 1;
      b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 120);
    });
    tb.appendChild(b);
  }
  return el;
}

function showStylePop(f, intro) {
  const el = legendEl(), c = f.c, cur = f.yenMode | 0, m = CHAR[c.modes[cur]];
  el.style.setProperty('--pc', m.look.accent);
  el.innerHTML = `<p class="sp-sub">${intro ? (TOUCH.on ? 'Tap STYLE to switch' : 'Press 1–7 to switch style') : 'Style'}</p>
    <div class="sp-big"><span class="sp-num">${cur + 1}</span><span>${esc(m.name)}</span></div>
    <div class="sp-row">${c.modes.map((id, i) => `<i class="${i === cur ? 'on' : ''}" style="--c:${CHAR[id].look.accent}" title="${esc(CHAR[id].name)}">${i + 1}</i>`).join('')}</div>`;
  // sits bottom-left above the damage cards; if the left key-hint bar is stacked above the cards, go just above it
  const h = document.getElementById('hints'), hl = document.getElementById('hints-l');
  const hr = h && !h.hidden && hl ? hl.getBoundingClientRect() : null;
  const base = innerWidth < 560 ? 96 : 118;
  el.style.left = (innerWidth < 560 ? 10 : 16) + 'px';
  el.style.bottom = (hr && hr.height ? Math.max(base, Math.round(innerHeight - hr.top + 10)) : base) + 'px';
  el.classList.add('show');
  clearTimeout(LEGEND.hideT);
  LEGEND.hideT = setTimeout(() => el.classList.remove('show'), intro ? 3200 : 1800);
}

/* called every frame from draw(): watches the local fighter's style */
function tickLegend(view, hud) {
  let f = null;
  if (hud && view && view.fighters) {
    const slot = typeof localSlotNow === 'function' ? localSlotNow() : null;
    f = view.fighters.find(x => x.slot === slot && x.c && x.c.modes) || null;
  }
  LEGEND.f = f;
  const btn = document.getElementById('style-btn') || (f ? (legendEl(), document.getElementById('style-btn')) : null);
  if (btn) btn.hidden = !f;
  if (!f) { LEGEND.last = null; if (LEGEND.el) LEGEND.el.classList.remove('show'); return; }
  const key = G.mode === 'guest' || G.remote ? 'net' + NET.gid : G.game;
  if (LEGEND.key !== key) { LEGEND.key = key; LEGEND.last = f.yenMode | 0; showStylePop(f, true); return; }
  if (LEGEND.last !== (f.yenMode | 0)) { LEGEND.last = f.yenMode | 0; showStylePop(f, false); }
}

/* effect + sound when anyone switches style */
function fxLegend(type, x, y, a, b) {
  if (type !== 'mode') return false;
  const id = CHAR.yen && CHAR.yen.modes[a], col = id ? CHAR[id].look.accent : '#ffd35c';
  spawnFx({ k: 'ring', x, y, life: 18, r0: 70, r1: 10, col, lw: 5 });
  spawnFx({ k: 'ring', x, y, life: 22, r0: 10, r1: 90, col: '#ffffff', lw: 3 });
  for (let i = 0; i < 14; i++) { const an = Math.random() * 6.28, s = 2 + Math.random() * 5; spawnFx({ k: 'spark', x, y, vx: Math.cos(an) * s, vy: Math.sin(an) * s, life: 20, col: i % 2 ? '#ffffff' : col, size: 3 }); }
  return true;
}
