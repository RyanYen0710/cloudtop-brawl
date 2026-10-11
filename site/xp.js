'use strict';
/* ===== CLOUDTOP BRAWL — XP, levels and the Sky Road =====
   The game server is the only one that gives XP (data.js has the level math):
   +1 a minute signed in · online match +10 (+15 for a win, +1 per KO) · Vs CPU by level (a win gives 4 x the level;
   losing to a level 8-10 CPU costs XP) · Boss Fight +5 (a win gives 30 + the level). You never drop a level.
   - The level bar sits on the main menu; tap it for the Sky Road page (every reward on a long road, and your XP history).
   - After a match, the XP you got counts up with a ticking sound.
   - During a match, a small "+XP" slides in now and then (only when the server really gave you XP). */

const XP = { xp: null, base: null, uid: undefined, matchXp: null, matchAt: 0, matchCoins: null, lastScreen: '', lastSlide: 0, log: [], busy: false, polled: 0, pending: 0 };
/* the rewards along the Sky Road */
const XP_ROAD = { 5: ['⚔', 'Ranked mode', ''], 50: ['★', 'Professor Sprocket (fighter)', ''] };
[100, 150, 200, 250, 300].forEach(l => { XP_ROAD[l] = ['★', 'New fighter', 'coming soon']; });
// skins (skins.js) for every fighter
if (typeof SKINS !== 'undefined') Object.keys(SKINS).forEach(id => { const s = SKINS[id]; if (s.level && !XP_ROAD[s.level]) XP_ROAD[s.level] = ['🎨', s.name + ' skin', '']; });
// coin stops (shop-data.js): on their own, or added to a level that already has a reward
if (typeof coinStop === 'function') for (let lv = 2; lv <= XP_MAX_LEVEL; lv++) {
  const c = coinStop(lv); if (!c) continue;
  if (XP_ROAD[lv]) XP_ROAD[lv] = [XP_ROAD[lv][0], XP_ROAD[lv][1] + ' + ' + c + ' coins', XP_ROAD[lv][2]];
  else XP_ROAD[lv] = ['🪙', c + ' coins', ''];
}

const xpSigned = () => typeof acctSignedIn === 'function' && acctSignedIn() && ACCT.user && ACCT.profile;
const xpFmt = n => Math.round(n).toLocaleString();
function xpAgo(t) {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

async function xpFetch() {
  if (XP.busy || !xpSigned()) return null;
  XP.busy = true;
  try {
    const r = await acctApi('/api/xp'); XP.log = r.log || [];
    if (ACCT.profile) { if (r.evSkins) ACCT.profile.evSkins = r.evSkins; if (r.evPlays) ACCT.profile.evPlays = r.evPlays; }   // event skins you've kept
    if (Array.isArray(r.unlocked) && typeof setUnlocked === 'function') { if (ACCT.profile) ACCT.profile.unlocked = r.unlocked; setUnlocked(r.unlocked); }   // e.g. Professor Sprocket at level 50
    if (ACCT.profile && r.coins != null) { ACCT.profile.coins = r.coins; ACCT.profile.shopSkins = r.shopSkins || []; if (typeof shopRenderIcons === 'function') shopRenderIcons(); }   // coins (shop.js)
    xpSet(r.xp || 0); XP.polled = Date.now(); return r;
  }
  catch (e) { return null; }
  finally { XP.busy = false; }
}
function xpSet(xp) {
  const was = XP.xp; XP.xp = xp;
  if (XP.base == null) XP.base = xp;
  if (ACCT.profile) ACCT.profile.xp = xp;
  xpRenderBar();
  // during a fight: a short slide-in now and then (real XP only)
  if (was != null && xp > was && typeof G !== 'undefined' && G.screen === 'fight') { XP.pending += xp - was; xpMaybeSlide(); }
}

/* ---------- the level bar on the main menu ---------- */
function xpRenderBar() {
  const bar = document.getElementById('xp-bar'); if (!bar) return;
  if (!xpSigned() || XP.xp == null) { bar.hidden = true; return; }
  const L = xpLevel(XP.xp);
  bar.hidden = false;
  bar.querySelector('.xp-lv b').textContent = L.level;
  bar.querySelector('.xp-fill').style.width = (L.max ? 100 : Math.round(L.cur / L.need * 100)) + '%';
  bar.querySelector('.xp-num').textContent = L.max ? 'MAX LEVEL' : xpFmt(L.cur) + ' / ' + xpFmt(L.need) + ' XP';
  const next = Object.keys(XP_ROAD).map(Number).find(l => l > L.level);
  bar.querySelector('.xp-next').textContent = next ? 'Next reward: Lv ' + next : 'Sky Road';
  bar.setAttribute('aria-label', 'Level ' + L.level + ', ' + (L.max ? 'max level' : xpFmt(L.cur) + ' of ' + xpFmt(L.need) + ' XP') + '. Open the Sky Road');
}

/* ---------- small slide during a fight ---------- */
function xpMaybeSlide() {
  if (!XP.pending || Date.now() - XP.lastSlide < 60000) return;   // at most once a minute
  XP.lastSlide = Date.now();
  const amt = XP.pending; XP.pending = 0;
  const s = el('div', { class: 'xp-slide', role: 'status' }, [el('b', { text: '+' + xpFmt(amt) + ' XP' }), el('span', { text: 'this session +' + xpFmt(XP.xp - XP.base) })]);
  document.body.appendChild(s);
  requestAnimationFrame(() => s.classList.add('in'));
  setTimeout(() => { s.classList.remove('in'); setTimeout(() => s.remove(), 400); }, 2600);
}

/* ---------- after a match: the XP you got counts up ---------- */
async function xpAfterMatch() {
  const start = XP.matchXp, at = XP.matchAt, coins0 = XP.matchCoins; XP.matchXp = null;
  if (start == null || !xpSigned()) return;
  await new Promise(r => setTimeout(r, 1400));   // the server saves the result first
  await xpFetch();
  const gained = (XP.xp || 0) - start, coinsGot = coins0 != null && ACCT.profile ? (ACCT.profile.coins | 0) - coins0 : 0;
  if (!gained && !coinsGot) return;
  const why = XP.log.filter(e => e.at >= at - 2000 && !e.set).slice(0, 4).map(e => (e.amt > 0 ? '+' : '') + e.amt + ' · ' + e.why);
  if (coinsGot > 0) why.push('+' + xpFmt(coinsGot) + ' 🪙 coins');
  xpCountCard(start, XP.xp, why);
}
function xpCountCard(from, to, why) {
  const old = document.querySelector('.xp-card'); if (old) old.remove();
  const L0 = xpLevel(from);
  const card = el('div', { class: 'xp-card', role: 'status', 'aria-live': 'polite' });
  const big = el('div', { class: 'xp-big', text: '+0 XP' }), lv = el('div', { class: 'xp-card-lv', text: 'LV ' + L0.level });
  const fill = el('i', { class: 'xp-fill' }), track = el('div', { class: 'xp-track' }, [fill]);
  card.append(big, el('div', { class: 'xp-card-row' }, [lv, track]), el('ul', {}, why.map(w => el('li', { text: w }))));
  document.body.appendChild(card);
  requestAnimationFrame(() => card.classList.add('in'));
  const steps = Math.min(40, Math.max(8, Math.abs(to - from))), dur = 1400;
  let i = 0, lastLv = L0.level;
  const timer = setInterval(() => {
    i++;
    const v = from + (to - from) * Math.min(1, i / steps), L = xpLevel(v), d = Math.round(v - from);
    big.textContent = (d >= 0 ? '+' : '') + d + ' XP'; big.classList.toggle('neg', d < 0);
    lv.textContent = 'LV ' + L.level; fill.style.width = (L.max ? 100 : L.cur / L.need * 100) + '%';
    try { if (typeof SFX !== 'undefined' && SFX.tone) SFX.tone(d >= 0 ? 600 + i * 18 : 400 - i * 4, 0.04, 'square', 0.04); } catch (e) { }
    if (L.level > lastLv) { lastLv = L.level; card.classList.add('up'); lv.textContent = 'LEVEL UP! ' + L.level; try { [523, 659, 784, 1047].forEach((f, k) => setTimeout(() => SFX.tone(f, 0.18, 'triangle', 0.08), k * 70)); } catch (e) { } }
    if (i >= steps) clearInterval(timer);
  }, dur / steps);
  setTimeout(() => { card.classList.remove('in'); setTimeout(() => card.remove(), 400); }, 5200);
}

/* ---------- the Sky Road: a full page, a long road up through the sky ----------
   Level 1 is at the bottom, level 300 at the top. The sky turns from day to sunset to a starry night as you climb,
   clouds drift past at different speeds, the road you've walked glows, and every reward shows what you get:
   the whole fighter, a fighter wearing the skin, or spinning coins. */
const SR = { tab: 'road', raf: 0, io: null, live: new Set(), t: 0, last: 0, W: 0, pos: [], laid: false };
const srMotion = () => { try { return !matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } };
const srMyChar = () => { let c = ''; try { c = loadLocal('cb.char'); } catch (e) { } return c && typeof CHAR !== 'undefined' && CHAR[c] && !CHAR[c].hidden ? c : 'titan'; };
/* what you get at each level: { kind: 'ranked' | 'fighter' | 'mystery' | 'skin' | 'coins', id, name, coins } */
function srRewards() {
  const R = {};
  const add = (lv, o) => { R[lv] = Object.assign(R[lv] || {}, o); };
  add(5, { kind: 'ranked', name: 'Ranked mode' });
  if (typeof CHAR !== 'undefined') Object.keys(CHAR).forEach(id => { const c = CHAR[id]; if (c.unlockLevel && !c.hidden) add(c.unlockLevel, { kind: 'fighter', id, name: c.name }); });
  [100, 150, 200, 250, 300].forEach(lv => { if (!R[lv]) add(lv, { kind: 'mystery', name: 'New fighter' }); });
  if (typeof SKINS !== 'undefined') Object.keys(SKINS).forEach(id => { const s = SKINS[id]; if (s.level && !(R[s.level] && R[s.level].kind)) add(s.level, { kind: 'skin', id, name: s.name + ' skin' }); });
  if (typeof coinStop === 'function') for (let lv = 2; lv <= XP_MAX_LEVEL; lv++) { const c = coinStop(lv); if (c) { add(lv, { coins: c }); if (!R[lv].kind) R[lv].kind = 'coins'; } }
  return R;
}
function srScreen() {
  let s = document.getElementById('scr-road');
  if (!s) { s = el('section', { id: 'scr-road', class: 'screen sr', hidden: '' }); document.getElementById('app').appendChild(s); }
  return s;
}
function showSkyRoad() {
  if (!xpSigned()) return;
  if (typeof SFX !== 'undefined') SFX.play('ui');
  srScreen(); show('road'); SR.tab = 'road'; srRender(true);
  if (Date.now() - XP.polled > 15000) xpFetch().then(() => { if (G.screen === 'road' && SR.tab === 'road') srRender(false); });
}
/* a spinning 3D coin (a stack of them for the big stops) */
function srCoins(n, size) {
  const phase = -((n * 7919) % 2600) / 1000, many = n >= 300 ? 3 : n >= 150 ? 2 : 1, wrap = el('div', { class: 'sr-coins', 'aria-hidden': 'true', style: '--s:' + size + 'px' });
  for (let i = 0; i < many; i++) {
    const c = el('div', { class: 'sr-coin', style: 'animation-delay:' + (phase - i * 0.45).toFixed(2) + 's' });
    for (let z = -2; z <= 2; z++) c.appendChild(el('i', { class: 'e', style: 'transform:translateZ(' + z + 'px)' }));
    c.append(el('i', { class: 'f', text: '★' }), el('i', { class: 'b', text: '★' }));
    wrap.appendChild(c);
  }
  return wrap;
}
/* a mystery fighter: a dark shape with a glowing question mark */
function srMystery(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 120, h = cv.clientHeight || 110;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const cx = w / 2, s = h / 110;
  g.fillStyle = '#120d2c'; g.strokeStyle = 'rgba(200,168,255,.55)'; g.lineWidth = 2;
  g.beginPath(); g.arc(cx, 30 * s, 16 * s, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(cx - 26 * s, 100 * s); g.quadraticCurveTo(cx - 30 * s, 52 * s, cx, 50 * s); g.quadraticCurveTo(cx + 30 * s, 52 * s, cx + 26 * s, 100 * s); g.closePath(); g.fill(); g.stroke();
  g.font = '400 ' + Math.round(30 * s) + 'px ' + getComputedStyle(document.body).getPropertyValue('--disp');
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffd35c'; g.shadowColor = '#ffd35c'; g.shadowBlur = 12;
  g.fillText('?', cx, 76 * s);
}
function srCard(lv, r, got) {
  const kind = r.kind, card = el('div', { class: 'sr-card k-' + kind + (got ? ' got' : ' locked'), role: 'listitem',
    'aria-label': 'Level ' + lv + ': ' + (kind === 'coins' ? r.coins + ' coins' : r.name + (r.coins ? ' and ' + r.coins + ' coins' : '') + (kind === 'mystery' ? ', coming soon' : '')) + (got ? ', unlocked' : ', locked') });
  const pic = el('div', { class: 'sr-pic' });
  if (kind === 'coins') pic.appendChild(srCoins(r.coins, r.coins >= 300 ? 46 : 40));
  else if (kind === 'ranked') pic.appendChild(el('div', { class: 'sr-badge', 'aria-hidden': 'true' }, [el('span', { text: '⚔' })]));
  else { const cv = el('canvas', { class: 'sr-cv', 'aria-hidden': 'true' }); cv.dataset.kind = kind; cv.dataset.id = r.id || ''; pic.appendChild(cv); }
  card.append(el('span', { class: 'sr-lvtag', text: 'LV ' + lv }), pic,
    el('b', { class: 'sr-name', text: kind === 'coins' ? r.coins + ' coins' : r.name }));
  const sub = kind === 'mystery' ? 'Coming soon' : kind === 'fighter' ? 'New fighter' : kind === 'skin' ? 'Works on every fighter' : kind === 'ranked' ? 'Unlocks Ranked' : '';
  if (sub) card.appendChild(el('small', { class: 'sr-sub', text: sub }));
  if (r.coins && kind !== 'coins') card.appendChild(el('span', { class: 'sr-plus' }, [srCoins(r.coins, 18), el('em', { text: '+' + r.coins })]));
  card.appendChild(el('span', { class: 'sr-state', text: got ? '✓' : '🔒', 'aria-hidden': 'true' }));
  return card;
}
/* draw the fighters on cards near the screen; they keep moving while you can see them */
function srDraw(cv) {
  const k = cv.dataset.kind;
  if (k === 'mystery') return srMystery(cv);
  if (k === 'fighter') return drawPortrait(cv, cv.dataset.id, { t: SR.t });
  if (k === 'skin') return drawPortrait(cv, srMyChar(), { skin: cv.dataset.id, t: SR.t });
}
function srLoop(now) {
  SR.raf = 0;
  if (G.screen !== 'road' || SR.tab !== 'road') return;
  if (now - SR.last > 70) { SR.last = now; SR.t += 4; SR.live.forEach(cv => { if (cv.isConnected && cv.dataset.kind !== 'mystery') srDraw(cv); }); }
  SR.raf = requestAnimationFrame(srLoop);
}
/* the sky: day at the bottom, sunset in the middle, a starry night at the top */
const SR_SKY = [[0, '#5fb8ff', '#bfe7ff'], [0.45, '#ff8c5a', '#ffd08a'], [0.7, '#5a2a8a', '#c0508a'], [1, '#070620', '#1e1650']];
function srMix(a, b, k) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',') + ')'; }
function srSky(s) {
  const sky = s.querySelector('.sr-sky'); if (!sky) return;
  const max = Math.max(1, s.scrollHeight - s.clientHeight), p = 1 - s.scrollTop / max;   // 0 at level 1, 1 at level 300
  let i = 0; while (i < SR_SKY.length - 2 && p > SR_SKY[i + 1][0]) i++;
  const A = SR_SKY[i], B = SR_SKY[i + 1], k = Math.min(1, Math.max(0, (p - A[0]) / (B[0] - A[0])));
  sky.style.setProperty('--sk1', srMix(A[1], B[1], k)); sky.style.setProperty('--sk2', srMix(A[2], B[2], k));
  sky.style.setProperty('--night', Math.min(1, Math.max(0, (p - 0.6) / 0.3)).toFixed(3));
  sky.style.setProperty('--sun', Math.min(1, Math.max(0, 1 - p / 0.55)).toFixed(3));
  const vh = s.clientHeight + 320;
  sky.querySelectorAll('.sr-cloud').forEach(c => { const y = ((+c.dataset.y + s.scrollTop * +c.dataset.d) % vh + vh) % vh - 160; c.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)'; });
}
function srRender(jump) {
  const s = srScreen(), keep = s.scrollTop; s.textContent = '';
  if (SR.raf) cancelAnimationFrame(SR.raf), SR.raf = 0;
  if (SR.io) SR.io.disconnect(), SR.io = null;
  SR.live.clear();
  const L = xpLevel(XP.xp || 0), motion = srMotion();
  // the sky behind everything: gradient, sun, moon, stars and drifting clouds
  const sky = el('div', { class: 'sr-sky', 'aria-hidden': 'true' }, [el('i', { class: 'sr-stars' }), el('i', { class: 'sr-stars two' }), el('i', { class: 'sr-sun' }), el('i', { class: 'sr-moon' })]);
  for (let i = 0; i < 9; i++) {
    const d = (0.12 + (i % 3) * 0.14).toFixed(2), big = i % 3 === 2;
    sky.appendChild(el('i', { class: 'sr-cloud' + (big ? ' near' : ''), 'data-y': String(Math.round(i * 137 % 900)), 'data-d': d, style: 'left:' + ((i * 41) % 90 - 8) + '%' }, [el('b', { style: 'animation-duration:' + (40 + i * 7) + 's;animation-delay:' + (-i * 9) + 's' })]));
  }
  s.appendChild(sky);
  // the top bar
  const head = el('header', { class: 'sr-head' }, [
    el('button', { type: 'button', class: 'back', text: '← Back', on: { click: () => { if (typeof SFX !== 'undefined') SFX.play('ui'); show('main'); } } }),
    el('div', { class: 'xp-lv big' }, [el('small', { text: 'LEVEL' }), el('b', { text: String(L.level) })]),
    el('div', { class: 'sr-sum' }, [el('h2', { text: 'Sky Road' }),
      el('div', { class: 'xp-track' }, [el('i', { class: 'xp-fill', style: 'width:' + (L.max ? 100 : L.cur / L.need * 100) + '%' })]),
      el('p', { text: L.max ? 'Max level reached!' : xpFmt(L.cur) + ' / ' + xpFmt(L.need) + ' XP to level ' + (L.level + 1) })])]);
  const tabs = el('div', { class: 'sr-tabs', role: 'group', 'aria-label': 'Sky Road view' });
  [['road', 'Rewards'], ['hist', 'XP history']].forEach(([id, name]) => tabs.appendChild(el('button', { type: 'button', class: 'lb-view' + (SR.tab === id ? ' on' : ''), 'aria-pressed': String(SR.tab === id), text: name,
    on: { click: () => { if (SR.tab === id) return; SR.tab = id; srRender(id === 'road'); if (id === 'hist') xpFetch().then(() => { if (G.screen === 'road' && SR.tab === 'hist') srRender(false); }); } } })));
  head.appendChild(tabs);
  s.appendChild(head);
  if (SR.tab === 'hist') {
    const panel = el('div', { class: 'sr-hist card' }); s.appendChild(panel);
    panel.appendChild(el('p', { class: 'muted', text: xpFmt(L.xp) + ' XP in total' }));
    const list = el('ul', { class: 'xp-hist' }); panel.appendChild(list);
    if (!XP.log.length) list.appendChild(el('li', { class: 'muted', text: 'No XP yet. Play a match!' }));
    XP.log.forEach(e => list.appendChild(el('li', {}, [el('b', { class: e.amt < 0 ? 'neg' : '', text: (e.amt > 0 ? '+' : '') + xpFmt(e.amt) + ' XP' }), el('span', { text: e.why }), el('small', { text: xpAgo(e.at) + ' · Lv ' + xpLevel(e.xp).level })])));
    panel.appendChild(el('p', { class: 'muted xp-how', text: SR_HOW }));
    s.scrollTop = 0; srSky(s);
    return;
  }
  // the road: work out where every level goes
  const R = srRewards(), W = Math.min(s.clientWidth || 390, 980), phone = W < 560;
  const A = phone ? Math.min(70, W * 0.18) : Math.min(170, W * 0.2), CW = phone ? Math.min(150, W * 0.42) : 200;
  const road = el('div', { class: 'sr-road', role: 'list', 'aria-label': 'Rewards from level 1 to ' + XP_MAX_LEVEL, style: 'width:' + W + 'px' });
  const half = lv => { const r = R[lv]; return !r ? 8 : r.kind === 'coins' ? 54 : 100; };   // half the height of what sits at each level
  const pts = []; let y = 140;
  for (let lv = XP_MAX_LEVEL; lv >= 1; lv--) {
    y += lv === XP_MAX_LEVEL ? half(lv) : Math.max(40, half(lv) + half(lv + 1) + 18);
    pts.push({ lv, x: W / 2 + A * Math.sin(y / 230), y });
  }
  const H = y + 150;
  road.style.height = H + 'px';
  pts.reverse();   // level 1 first
  // the road itself (an SVG path), and the part you've walked, glowing
  const path = list => { let d = 'M' + list[0].x.toFixed(1) + ' ' + (list[0].y + 40).toFixed(1) + ' L' + list[0].x.toFixed(1) + ' ' + list[0].y.toFixed(1); for (let i = 1; i < list.length; i++) { const a = list[i - 1], b = list[i]; d += ' Q' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' ' + ((a.x + b.x) / 2).toFixed(1) + ' ' + ((a.y + b.y) / 2).toFixed(1); } const z = list[list.length - 1]; return d + ' L' + z.x.toFixed(1) + ' ' + z.y.toFixed(1); };
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'sr-svg'); svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('aria-hidden', 'true');
  const all = path(pts), walked = path(pts.slice(0, Math.max(1, L.level)));
  [['sr-edge', all], ['sr-path', all], ['sr-dash', all], ['sr-glow', walked], ['sr-walk', walked]].forEach(([c, d]) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', c); p.setAttribute('d', d); svg.appendChild(p); });
  road.appendChild(svg);
  // the start and the top
  road.appendChild(el('div', { class: 'sr-flag sr-start', style: 'left:' + pts[0].x + 'px;top:' + (pts[0].y + 52) + 'px', text: 'START' }));
  road.appendChild(el('div', { class: 'sr-flag sr-top', style: 'left:' + pts[pts.length - 1].x + 'px;top:' + (pts[pts.length - 1].y - 100) + 'px', text: '👑 LEVEL ' + XP_MAX_LEVEL }));
  let flip = false;
  pts.forEach(p => {
    const r = R[p.lv], got = L.level >= p.lv, here = L.level === p.lv;
    const dot = el('div', { class: 'sr-dot' + (got ? ' got' : '') + (r ? ' big' : '') + (here ? ' here' : '') + (p.lv % 5 === 0 ? ' five' : ''), style: 'left:' + p.x.toFixed(1) + 'px;top:' + p.y.toFixed(1) + 'px', 'aria-hidden': 'true' },
      [el('span', { text: r || p.lv % 5 === 0 || here ? String(p.lv) : '' })]);
    road.appendChild(dot);
    if (here) road.appendChild(el('div', { class: 'sr-you', style: 'left:' + p.x.toFixed(1) + 'px;top:' + p.y.toFixed(1) + 'px', 'aria-label': 'You are here: level ' + p.lv }, [el('i', { class: 'ring' }), el('i', { class: 'ring two' }), el('b', { text: 'YOU · LV ' + p.lv })]));
    if (!r) return;
    const off = p.x - W / 2; let side = off > A * 0.3 ? 'left' : off < -A * 0.3 ? 'right' : (flip = !flip) ? 'left' : 'right';
    const card = srCard(p.lv, r, got), ch = r.kind === 'coins' ? 104 : 196;
    let left = side === 'right' ? p.x + 28 : p.x - 28 - CW;
    left = Math.max(8, Math.min(W - 8 - CW, left));
    card.style.cssText = 'left:' + left.toFixed(1) + 'px;top:' + (p.y - ch / 2).toFixed(1) + 'px;width:' + CW + 'px';
    card.classList.add(side);
    road.appendChild(card);
  });
  s.appendChild(road);
  s.appendChild(el('p', { class: 'sr-how', text: SR_HOW }));
  // a button to jump back to where you are
  const me = pts[Math.max(0, L.level - 1)];
  const toMe = smooth => s.scrollTo({ top: Math.max(0, road.offsetTop + me.y - s.clientHeight * 0.6), behavior: smooth && motion ? 'smooth' : 'auto' });
  s.appendChild(el('button', { type: 'button', class: 'sr-jump btn', text: '⬇ Jump to me', on: { click: () => toMe(true) } }));
  // draw fighters only when they're near the screen
  SR.io = new IntersectionObserver(es => es.forEach(e => { const cv = e.target; if (e.isIntersecting) { if (!cv.dataset.drawn) { cv.dataset.drawn = '1'; srDraw(cv); } if (motion) SR.live.add(cv); } else SR.live.delete(cv); }), { root: s, rootMargin: '400px 0px' });
  road.querySelectorAll('canvas').forEach(cv => SR.io.observe(cv));
  if (jump) toMe(false); else s.scrollTop = keep;
  srSky(s);
  if (motion) SR.raf = requestAnimationFrame(srLoop);
}
const SR_HOW = 'How to get XP: +1 a minute signed in · online match +10 (win +15, +1 per KO) · Vs CPU: the higher the CPU level, the more XP (losing to a level 8-10 CPU costs XP) · Boss Fight +5 (win +30 + the level). Ranked gives the most: win +75, lose −20. You never drop a level. Coins: the coin stops on the road, plus 20 for every win and 5 for every other match. Spend them in the Shop.';
(function () {
  let on = false, sizeT = 0;
  document.addEventListener('scroll', e => {
    if (e.target && e.target.id === 'scr-road' && !on) { on = true; requestAnimationFrame(() => { on = false; srSky(e.target); }); }
  }, true);
  window.addEventListener('resize', () => { clearTimeout(sizeT); sizeT = setTimeout(() => { if (G.screen === 'road' && SR.tab === 'road') srRender(false); }, 200); });
})();

/* ---------- keeping up to date ---------- */
function xpTick() {
  const uid = xpSigned() ? ACCT.user.uid : null;
  if (uid !== XP.uid) { XP.uid = uid; XP.xp = null; XP.base = null; XP.log = []; if (uid) { if (ACCT.profile.xp != null) xpSet(ACCT.profile.xp); xpFetch(); } else xpRenderBar(); }
  if (!uid) return;
  const scr = typeof G !== 'undefined' ? G.screen : '';
  if (scr === 'fight' && XP.lastScreen !== 'fight') { XP.matchXp = XP.xp; XP.matchAt = Date.now(); XP.matchCoins = ACCT.profile ? ACCT.profile.coins | 0 : null; }
  if (scr !== 'fight' && XP.lastScreen === 'fight') xpAfterMatch();
  XP.lastScreen = scr;
  if (Date.now() - XP.polled > 60000 && document.visibilityState === 'visible') xpFetch();   // time online adds XP while you play
  if (scr === 'fight') xpMaybeSlide();
}
document.getElementById('xp-bar') && document.getElementById('xp-bar').addEventListener('click', showSkyRoad);
setInterval(xpTick, 1000);
xpTick();
