'use strict';
/* ===== CLOUDTOP BRAWL — Ranked (unlocks at level 5) =====
   Two ways to play, both run on the game server (like Boss Fight), so the results can be trusted:
   - Online Ranked: "Find match" waits in a queue until the server pairs you with another player.
     1v1, 3 lives, 5 minutes, random stage. Leaving early or giving up is a loss. No pausing.
   - CPU Ladder: 10 steps. Step N is a level N CPU (from step 8 a second CPU helps it). Win to climb.
   Win: +75 XP and +25 rank points (RP). Lose: -20 XP and -15 RP (never below 0).
   Tiers: Bronze, Silver (100 RP), Gold (250), Diamond (500), Legend (900). */

const RANKED = { info: null, loading: false, err: '', char: 'random', search: null, live: null, result: null };
const RANKED_NEED = 5;
const RANK_COLORS = { Bronze: '#d98b4a', Silver: '#d7dce6', Gold: '#ffd35c', Diamond: '#7ad7ff', Legend: '#ff5ad1' };
const RANKED_ERRORS = { level: 'Ranked unlocks at level ' + RANKED_NEED + '.', 'slow-down': 'Too many fights in a row. Wait a minute.',
  'no-match': 'That match has already ended. Find a new one.', 'not-yours': 'That match belongs to other players.', signin: 'Please sign in again.' };

const rankedSigned = () => typeof acctSignedIn === 'function' && acctSignedIn() && ACCT.profile;
function rankedLevel() {
  const xp = typeof XP !== 'undefined' && XP.xp != null ? XP.xp : (ACCT.profile && ACCT.profile.xp) || 0;
  return typeof xpLevel === 'function' ? xpLevel(xp).level : 1;
}
const rankedTester = () => typeof TESTER !== 'undefined' && TESTER.on;
const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

/* ---------- the Ranked tile on the main menu ---------- */
function rankedTile() {
  const t = document.getElementById('go-ranked'); if (!t) return;
  const lv = rankedLevel(), locked = !rankedSigned() || lv < RANKED_NEED, sub = t.querySelector('.rk-sub');
  t.classList.toggle('locked', locked);
  const text = !rankedSigned() ? 'Sign in · unlocks at level ' + RANKED_NEED : lv < RANKED_NEED ? '🔒 Unlocks at level ' + RANKED_NEED
    : RANKED.info ? RANKED.info.tier.name + ' · ' + RANKED.info.rp + ' RP' : 'Online · CPU Ladder';
  if (sub && sub.textContent !== text) sub.textContent = text;
}
function rankedOpen() {
  if (typeof SFX !== 'undefined') SFX.play('ui');
  if (rankedTester()) { toast('Ranked isn’t available in tester mode.'); return; }
  if (!rankedSigned()) { if (typeof showLogin === 'function') showLogin(); return; }
  const lv = rankedLevel();
  if (lv < RANKED_NEED) { toast('Ranked unlocks at level ' + RANKED_NEED + '. You’re level ' + lv + ' — keep playing to earn XP!'); return; }
  showRanked();
}

/* ---------- the Ranked screen ---------- */
function rankedScreen() {
  let s = document.getElementById('scr-ranked');
  if (!s) { s = el('section', { id: 'scr-ranked', class: 'screen rk', hidden: '' }); document.getElementById('app').appendChild(s); }
  return s;
}
function showRanked() { rankedScreen(); show('ranked'); renderRanked(); loadRanked(); }
async function loadRanked() {
  if (RANKED.loading || !rankedSigned()) return;
  RANKED.loading = true; RANKED.err = '';
  try { RANKED.info = await acctApi('/api/ranked'); }
  catch (e) { RANKED.err = 'Couldn’t load your rank. Check your internet and try again.'; }
  RANKED.loading = false; rankedTile();
  if (G.screen === 'ranked') renderRanked();
}
function rankedBack() { rankedCancel(true); show('main'); }

function renderRanked() {
  const s = rankedScreen(); s.textContent = '';
  const wrap = el('div', { class: 'wrap rk-wrap' }); s.appendChild(wrap);
  wrap.appendChild(el('header', { class: 'bar' }, [el('button', { type: 'button', class: 'back', text: '← Back', on: { click: rankedBack } }), el('h2', { text: 'Ranked' })]));
  const I = RANKED.info;
  if (RANKED.err) wrap.appendChild(el('p', { class: 'ad-message', role: 'alert', text: RANKED.err }));
  if (!I) { wrap.appendChild(el('p', { class: 'muted', text: RANKED.loading ? 'Loading your rank…' : '' })); return; }

  // the result of the match you just played
  const R = RANKED.result;
  if (R) {
    const head = R.cancel ? 'Match cancelled' : R.win === null ? 'Draw' : R.win ? 'Victory!' : 'Defeat';
    const lines = [];
    if (R.cancel) lines.push('Your opponent didn’t connect. Nothing changed. Find a new match.');
    else if (R.error) lines.push('The result couldn’t be saved. Your rank wasn’t changed.');
    else {
      lines.push((R.drp >= 0 ? '+' : '') + R.drp + ' RP · ' + (R.xp >= 0 ? '+' : '') + R.xp + ' XP');
      if (R.left) lines.push(R.mine ? 'You left the match early, so it counts as a loss.' : 'Your opponent left, so you win.');
      if (R.ladder && R.win) lines.push(R.step >= 10 ? 'You beat the top of the ladder!' : 'You climbed to step ' + R.next + '.');
    }
    wrap.appendChild(el('div', { class: 'rk-result card ' + (R.cancel ? '' : R.win ? 'win' : R.win === false ? 'lose' : ''), role: 'status' },
      [el('b', { text: head }), ...lines.map(t => el('span', { text: t }))]));
  }

  // your rank
  const T = I.tier, col = RANK_COLORS[T.name] || '#fff';
  const pct = T.next == null ? 100 : Math.round((I.rp - T.min) / (T.next - T.min) * 100);
  wrap.appendChild(el('section', { class: 'card rk-rank' }, [
    el('div', { class: 'rk-badge', style: '--rk:' + col, 'aria-hidden': 'true' }, [el('span', { text: T.name.slice(0, 1) })]),
    el('div', { class: 'rk-rank-txt' }, [
      el('div', { class: 'card-h' }, [el('span', { text: 'Your rank' }), el('span', { class: 'muted', text: I.wins + ' W · ' + I.losses + ' L' })]),
      el('h3', { text: T.name, style: 'color:' + col }),
      el('div', { class: 'xp-track' }, [el('i', { class: 'xp-fill', style: 'width:' + pct + '%;background:' + col })]),
      el('p', { class: 'muted', text: I.rp + ' RP' + (T.next == null ? ' · top tier!' : ' · ' + (T.next - I.rp) + ' RP to ' + I.tiers.find(t => t[1] === T.next)[0]) }),
      el('div', { class: 'rk-tiers' }, I.tiers.map(([n, min]) => el('span', { class: n === T.name ? 'on' : '', style: '--rk:' + (RANK_COLORS[n] || '#fff'), text: n + ' ' + min })))])]));

  // your fighter
  const opts = [...ROSTER.filter(c => isPickable(c.id, myPicks())), { id: 'random', name: 'Random' }];
  if (!opts.some(c => c.id === RANKED.char)) RANKED.char = 'random';
  const picker = el('div', { class: 'bs-chars', role: 'radiogroup', 'aria-label': 'Your fighter' });
  opts.forEach(c => {
    const on = c.id === RANKED.char;
    const t = el('button', { type: 'button', role: 'radio', 'aria-checked': String(on), class: 'tile bs-ch' + (on ? ' sel' : ''), 'data-id': c.id, title: c.name },
      [el('canvas', { class: 'tile-cv', 'aria-hidden': 'true' }), el('span', { class: 'tile-name', text: c.name })]);
    t.addEventListener('click', () => {
      SFX.play('ui'); RANKED.char = c.id;
      picker.querySelectorAll('.bs-ch').forEach(b => { const me = b.dataset.id === c.id; b.classList.toggle('sel', me); b.setAttribute('aria-checked', String(me)); });
    });
    picker.appendChild(t);
  });
  requestAnimationFrame(() => picker.querySelectorAll('.bs-ch').forEach(b => { try { drawPortrait(b.querySelector('canvas'), b.dataset.id); } catch (e) { } }));
  wrap.appendChild(el('section', { class: 'card' }, [el('div', { class: 'card-h' }, [el('span', { text: 'Your fighter' })]), picker]));

  const busy = !!RANKED.live, modes = el('div', { class: 'rk-modes' }); wrap.appendChild(modes);
  // Online Ranked
  const S = RANKED.search, online = [el('div', { class: 'card-h' }, [el('span', { text: 'Online Ranked' })]),
    el('p', { class: 'muted', text: '1v1 against another player · 3 lives · 5 minutes · random stage. Win +25 RP and +75 XP, lose −15 RP and −20 XP. Leaving early counts as a loss.' })];
  if (RANKED.live && RANKED.live.kind === 'ranked') online.push(el('p', { class: 'rk-status', role: 'status', text: 'Match found against ' + RANKED.live.opp + '! Connecting…' }));
  else if (S) {
    const secs = (Date.now() - S.since) / 1000;
    online.push(el('p', { class: 'rk-status', role: 'status' }, [el('span', { class: 'rk-spin', 'aria-hidden': 'true' }), document.createTextNode(' Searching for a player… '), el('b', { id: 'rk-timer', text: mmss(secs) })]));
    if (S.offer) {
      online.push(el('p', { class: 'muted', text: 'No one found yet. Keep waiting, or climb the CPU Ladder instead.' }),
        el('div', { class: 'gc-row' }, [el('button', { type: 'button', class: 'btn', text: 'Keep searching', on: { click: () => { S.offer = false; S.offered = true; renderRanked(); } } }),
          el('button', { type: 'button', class: 'btn start', text: 'Play CPU Ladder', on: { click: () => { rankedCancel(); rankedLadder(); } } })]));
    } else online.push(el('div', { class: 'gc-row' }, [el('button', { type: 'button', class: 'btn', text: 'Cancel', on: { click: () => rankedCancel() } })]));
  } else {
    const go = el('button', { type: 'button', class: 'btn start', text: 'Find match', on: { click: rankedFind } }); go.disabled = busy;
    online.push(go);
  }
  modes.appendChild(el('section', { class: 'card rk-mode rk-online' }, online));
  // CPU Ladder
  const step = I.ladder, dots = el('div', { class: 'rk-ladder', 'aria-label': 'Step ' + step + ' of ' + I.steps });
  for (let i = 1; i <= I.steps; i++) dots.appendChild(el('span', { class: (i < step ? 'done' : '') + (i === step ? ' here' : ''), text: String(i) }));
  const fight = el('button', { type: 'button', class: 'btn start', text: RANKED.live && RANKED.live.kind === 'ladder' ? 'Connecting…' : 'Fight step ' + step, on: { click: rankedLadder } });
  fight.disabled = busy || !!S;
  modes.appendChild(el('section', { class: 'card rk-mode rk-cpu' }, [el('div', { class: 'card-h' }, [el('span', { text: 'CPU Ladder' }), el('span', { class: 'muted', text: I.clears ? 'Cleared ×' + I.clears : '' })]),
    el('p', { class: 'muted', text: 'Step ' + step + ': a level ' + step + ' CPU' + (step >= 8 ? ' and a level ' + (step - 2) + ' helper' : '') + '. Win to climb, lose and you stay. Same RP and XP as Online Ranked.' }),
    dots, fight]));
  wrap.appendChild(el('p', { class: 'muted rk-note', text: 'Ranked matches run on the game server and can’t be paused.' }));
}

/* ---------- Online Ranked: the queue ---------- */
async function rankedFind() {
  if (RANKED.search || RANKED.live) return;
  if (typeof SFX !== 'undefined') SFX.play('ui');
  RANKED.result = null;
  RANKED.search = { since: Date.now(), offer: false, offered: false, busy: false, fails: 0 };
  renderRanked(); rankedPoll();
}
async function rankedPoll() {
  const S = RANKED.search; if (!S || S.busy) return;
  S.busy = true;
  try {
    const r = await acctApi('/api/ranked/queue', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    S.fails = 0;
    if (RANKED.search !== S) { acctApi('/api/ranked/leave', { method: 'POST', body: '{}' }).catch(() => {}); return; }
    if (r.match) { RANKED.search = null; rankedConnect('ranked', r.match.room, r.match.opp); return; }
  } catch (e) {
    if (RANKED.search !== S) return;
    if (e.message === 'level') { RANKED.search = null; toast(RANKED_ERRORS.level); renderRanked(); return; }
    if (++S.fails >= 4) { RANKED.search = null; toast('Lost touch with the game server. Try again.'); renderRanked(); return; }
  } finally { S.busy = false; }
}
function rankedCancel(silent) {
  if (!RANKED.search) return;
  RANKED.search = null;
  acctApi('/api/ranked/leave', { method: 'POST', body: '{}' }).catch(() => {});
  if (!silent && G.screen === 'ranked') renderRanked();
}

/* ---------- playing a Ranked match on the game server ---------- */
function rankedLadder() {
  if (RANKED.live || RANKED.search) return;
  if (typeof SFX !== 'undefined') SFX.play('ui');
  RANKED.result = null;
  const id = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 16).padEnd(10, 'x');
  rankedConnect('ladder', id, 'CPU');
}
async function rankedConnect(kind, room, opp) {
  RANKED.live = { kind, room, opp, at: Date.now(), started: false, done: false, gid: 0 };
  if (G.screen === 'ranked') renderRanked();
  try {
    closeRelay();
    RELAY.id = Math.random().toString(36).slice(2, 10);
    RELAY.code = room;
    RELAY.mine = { nick: (ACCT.profile && ACCT.profile.name) || 'Player', ib: 0, ic: IN.counters.slice() };
    NET.room = relayRoom; NET.me = RELAY.id;
    await connectServer(room, kind);
    SRV.ws.send(JSON.stringify({ cmd: kind, char: RANKED.char, skin: typeof mySkin === 'function' ? mySkin(RANKED.char) : '' }));
  } catch (e) { rankedEnd(); toast('Couldn’t reach the game server. Check your internet and try again.'); }
}
function rankedBegin(s) {
  const L = RANKED.live;
  L.started = true; L.gid = s.gid;
  const mySlot = s.sl && s.sl[RELAY.id] != null ? s.sl[RELAY.id] : 0;
  G.mode = 'ranked'; G.game = null; G.remote = true;
  NET.useServer = true; NET.gid = s.gid; NET.role = null;
  NET.lb = { fm: s.fm, st: s.st, sk: s.sk, gid: s.gid, ph: 'fight', sv: 1 };
  const mine = s.fm.find(x => x[0] === mySlot);
  SETUP.slots = [0, 1, 2, 3].map(i => i === mySlot ? { type: 'you', char: mine ? mine[1] : 'titan', lvl: 3, team: 0 } : { type: 'off', char: 'random', lvl: 3, team: 1 });
  SETUP.teams = L.kind === 'ladder';
  resetSnaps(); FX.length = 0; CAM.init = false;
  enterFight();
  // the pause menu: Ranked keeps running (no pausing), and quitting is giving up
  const $ = id => document.getElementById(id);
  $('pause-btn').textContent = 'Menu'; $('p-resume').textContent = 'Keep fighting'; $('p-quit').textContent = 'Give up'; $('p-setup').hidden = true;
  toast(L.kind === 'ranked' ? 'Ranked vs ' + L.opp + '. Good luck!' : 'CPU Ladder step ' + s.step + '. Good luck!');
}
async function rankedGiveUp() {
  const L = RANKED.live; if (!L) return;
  const ok = typeof gameConfirm === 'function' ? await gameConfirm('Give up? It counts as a loss.', 'Give up') : true;
  if (!ok || RANKED.live !== L) return;
  if (SRV.ws && SRV.ws.readyState === 1) { try { SRV.ws.send(JSON.stringify({ cmd: 'forfeit' })); } catch (e) { } }
  else { rankedEnd(); showRanked(); }
  document.getElementById('pause').hidden = true; IN.active = true;
}
function rankedFinish(res) {
  const L = RANKED.live; if (!L || L.done) return;
  L.done = true;
  RANKED.result = res;
  setTimeout(() => { rankedEnd(); showRanked(); if (res.win) SFX.play('orbget'); }, 600);
}
function rankedEnd() {
  RANKED.live = null;
  closeRelay(); NET.room = null; NET.lb = null; NET.vf = null;
  G.remote = false; G.game = null; G.paused = false;
  const p = document.getElementById('pause'); if (p) p.hidden = true;
  if (G.mode === 'ranked') G.mode = 'solo';
}
async function rankedDropped(L) {
  if (L.retrying) return;
  L.retrying = true;
  toast('Connection dropped. Reconnecting…');
  for (let i = 0; i < 3 && RANKED.live === L && !L.done; i++) {
    try { await connectServer(L.room, L.kind); L.retrying = false; toast('Reconnected!'); return; } catch (e) { await new Promise(r => setTimeout(r, 1500)); }
  }
  if (RANKED.live !== L) return;
  rankedEnd(); toast('Lost the connection to the game server.'); showRanked();
}
/* watch what the game server says (start, result, problems) */
function rankedWatch() {
  const L = RANKED.live;
  if (!L) return;
  const srv = RELAY.remote.get('srv'), d = (srv && srv.pres) || {};
  if (!L.started) {
    if (d.rkErr) { const e = d.rkErr; rankedEnd(); toast(RANKED_ERRORS[e] || 'The server couldn’t start the match.'); if (G.screen === 'ranked') renderRanked(); return; }
    if (d.rkCancel) { rankedEnd(); RANKED.result = { cancel: 1 }; if (G.screen === 'ranked') renderRanked(); return; }
    const s = L.kind === 'ranked' ? d.rk : d.ladder;
    if (s && s.fm) { rankedBegin(s); return; }
    if (Date.now() - L.at > (L.kind === 'ranked' ? 35000 : 15000)) { rankedEnd(); toast('The game server didn’t answer. Try again.'); if (G.screen === 'ranked') renderRanked(); }
    return;
  }
  if (L.kind === 'ranked' && d.rkRes && d.rkRes.gid === L.gid) {
    const me = d.rkRes.p && d.rkRes.p[RELAY.id];
    rankedFinish(Object.assign({ win: null }, me || { error: 1 }, { mine: !!(me && me.left), left: !!d.rkRes.left }));
    return;
  }
  if (L.kind === 'ladder' && d.ladderRes && d.ladderRes.gid === L.gid) { rankedFinish(Object.assign({ ladder: 1 }, d.ladderRes)); return; }
  if (!L.done && (!SRV.ws || SRV.ws.readyState > 1)) rankedDropped(L);
}
setInterval(() => {
  rankedWatch();
  const S = RANKED.search;
  if (S) {
    if (Date.now() - (S.last || 0) > 2500) { S.last = Date.now(); rankedPoll(); }
    if (!S.offer && !S.offered && Date.now() - S.since > 60000) { S.offer = true; if (G.screen === 'ranked') renderRanked(); }
    const t = document.getElementById('rk-timer'); if (t) t.textContent = mmss((Date.now() - S.since) / 1000);
    if (G.screen !== 'ranked') rankedCancel(true);
  }
  rankedTile();
}, 250);
// stop searching if the page is closed
window.addEventListener('pagehide', () => { if (RANKED.search) rankedCancel(true); });
// "Give up" in the pause menu (runs before the normal quit button handler)
document.getElementById('p-quit') && document.getElementById('p-quit').addEventListener('click', e => {
  if (G.mode !== 'ranked') return;
  e.stopImmediatePropagation(); rankedGiveUp();
}, true);
document.getElementById('go-ranked') && document.getElementById('go-ranked').addEventListener('click', rankedOpen);
rankedTile();
