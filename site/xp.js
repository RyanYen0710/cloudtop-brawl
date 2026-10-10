'use strict';
/* ===== CLOUDTOP BRAWL — XP, levels and the Sky Road =====
   The game server is the only one that gives XP (data.js has the level math):
   +1 a minute signed in · online match +10 (+15 for a win, +1 per KO) · Vs CPU by level (a win gives 4 x the level;
   losing to a level 8-10 CPU costs XP) · Boss Fight +5 (a win gives 30 + the level). You never drop a level.
   - The level bar sits on the main menu; tap it for the Sky Road (rewards and your XP history).
   - After a match, the XP you got counts up with a ticking sound.
   - During a match, a small "+XP" slides in now and then (only when the server really gave you XP). */

const XP = { xp: null, base: null, uid: undefined, matchXp: null, matchAt: 0, lastScreen: '', lastSlide: 0, log: [], busy: false, polled: 0, pending: 0 };
/* the rewards along the Sky Road */
const XP_ROAD = { 5: ['⚔', 'Ranked mode', 'coming soon'], 50: ['★', 'Professor Sprocket (fighter)', 'coming soon'] };
[100, 150, 200, 250, 300].forEach(l => { XP_ROAD[l] = ['★', 'New fighter', 'coming soon']; });

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
  try { const r = await acctApi('/api/xp'); XP.log = r.log || []; xpSet(r.xp || 0); XP.polled = Date.now(); return r; }
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
  const start = XP.matchXp, at = XP.matchAt; XP.matchXp = null;
  if (start == null || !xpSigned()) return;
  await new Promise(r => setTimeout(r, 1400));   // the server saves the result first
  await xpFetch();
  const gained = (XP.xp || 0) - start;
  if (!gained) return;
  const why = XP.log.filter(e => e.at >= at - 2000 && !e.set).slice(0, 4).map(e => (e.amt > 0 ? '+' : '') + e.amt + ' · ' + e.why);
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

/* ---------- the Sky Road: rewards along the levels, and your XP history ---------- */
function showSkyRoad() {
  if (!xpSigned()) return;
  if (typeof SFX !== 'undefined') SFX.play('ui');
  const back = el('div', { class: 'gc-back' }), box = el('div', { class: 'gc-box card xp-road', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Sky Road', tabindex: '-1' });
  back.appendChild(box); document.body.appendChild(back);
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  const close = () => { document.removeEventListener('keydown', onKey, true); back.remove(); };
  document.addEventListener('keydown', onKey, true);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  let tab = 'road';
  const draw = () => {
    box.textContent = '';
    const L = xpLevel(XP.xp || 0);
    box.append(el('div', { class: 'xp-road-head' }, [el('div', { class: 'xp-lv big' }, [el('small', { text: 'LEVEL' }), el('b', { text: String(L.level) })]),
      el('div', { class: 'xp-road-sum' }, [el('h3', { text: 'Sky Road' }),
        el('div', { class: 'xp-track' }, [el('i', { class: 'xp-fill', style: 'width:' + (L.max ? 100 : L.cur / L.need * 100) + '%' })]),
        el('p', { class: 'muted', text: L.max ? 'Max level reached!' : xpFmt(L.cur) + ' / ' + xpFmt(L.need) + ' XP to level ' + (L.level + 1) + ' · ' + xpFmt(L.xp) + ' XP in total' })])]));
    const tabs = el('div', { class: 'lb-views' });
    [['road', 'Rewards'], ['hist', 'XP history']].forEach(([id, name]) => tabs.appendChild(el('button', { type: 'button', class: 'lb-view' + (tab === id ? ' on' : ''), 'aria-pressed': String(tab === id), text: name, on: { click: () => { tab = id; draw(); if (id === 'hist') xpFetch().then(draw); } } })));
    box.appendChild(tabs);
    if (tab === 'road') {
      const road = el('div', { class: 'xp-path', role: 'list' }); box.appendChild(road);
      for (let lv = 1; lv <= XP_MAX_LEVEL; lv++) {
        const r = XP_ROAD[lv], got = L.level >= lv, here = L.level === lv;
        const node = el('div', { class: 'xp-node' + (r ? ' reward' : '') + (got ? ' got' : '') + (here ? ' here' : ''), role: 'listitem', 'aria-label': 'Level ' + lv + (r ? ': ' + r[1] + (r[2] ? ' (' + r[2] + ')' : '') : '') + (got ? ', reached' : '') },
          [el('span', { class: 'xp-dot', text: got ? '✓' : r ? r[0] : '' }), el('small', { text: String(lv) })]);
        if (r) node.appendChild(el('em', { text: r[1] + (r[2] ? ' · ' + r[2] : '') }));
        road.appendChild(node);
      }
      setTimeout(() => { const h = road.querySelector('.here'); if (h) road.scrollLeft = h.offsetLeft - road.clientWidth / 2; }, 0);
      box.appendChild(el('p', { class: 'muted xp-how', text: 'How to get XP: +1 a minute signed in · online match +10 (win +15, +1 per KO) · Vs CPU: the higher the CPU level, the more XP (losing to a level 8-10 CPU costs XP) · Boss Fight +5 (win +30 + the level). You never drop a level. Ranked (coming soon) gives the most.' }));
    } else {
      const list = el('ul', { class: 'xp-hist' }); box.appendChild(list);
      if (!XP.log.length) list.appendChild(el('li', { class: 'muted', text: 'No XP yet. Play a match!' }));
      XP.log.forEach(e => list.appendChild(el('li', {}, [el('b', { class: e.amt < 0 ? 'neg' : '', text: (e.amt > 0 ? '+' : '') + xpFmt(e.amt) + ' XP' }), el('span', { text: e.why }), el('small', { text: xpAgo(e.at) + ' · Lv ' + xpLevel(e.xp).level })])));
    }
    box.appendChild(el('div', { class: 'gc-row' }, [el('button', { type: 'button', class: 'btn', text: 'Close', on: { click: close } })]));
  };
  draw();
  setTimeout(() => box.focus({ preventScroll: true }), 0);
}

/* ---------- keeping up to date ---------- */
function xpTick() {
  const uid = xpSigned() ? ACCT.user.uid : null;
  if (uid !== XP.uid) { XP.uid = uid; XP.xp = null; XP.base = null; XP.log = []; if (uid) { if (ACCT.profile.xp != null) xpSet(ACCT.profile.xp); xpFetch(); } else xpRenderBar(); }
  if (!uid) return;
  const scr = typeof G !== 'undefined' ? G.screen : '';
  if (scr === 'fight' && XP.lastScreen !== 'fight') { XP.matchXp = XP.xp; XP.matchAt = Date.now(); }
  if (scr !== 'fight' && XP.lastScreen === 'fight') xpAfterMatch();
  XP.lastScreen = scr;
  if (Date.now() - XP.polled > 60000 && document.visibilityState === 'visible') xpFetch();   // time online adds XP while you play
  if (scr === 'fight') xpMaybeSlide();
}
document.getElementById('xp-bar') && document.getElementById('xp-bar').addEventListener('click', showSkyRoad);
setInterval(xpTick, 1000);
xpTick();
