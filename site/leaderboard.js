'use strict';
/* ===== CLOUDTOP BRAWL — Leaderboard =====
   The numbers come from the game server, which counts them itself when an online match or a Boss Fight ends,
   so nobody can fake them from their browser. The list is public: usernames and numbers only, never emails.
   Vs CPU games run in your own browser, so they never rank. Signed in, they're saved to your account ("Your stats");
   signed out, they're kept on this device.
   Time online = time the game is open while you're signed in (the game tells the server "still here" every 2 minutes).
   The owner (and only the owner, checked by the server) gets ↑ ↓ arrows to reorder a section and can tap a number to edit it. */

const LB = { data: null, tab: 'overall', busy: false, err: '' };
const LB_TABS = [
  ['season', 'This season', 'Monthly standings from server-verified online matches and Boss Fights'],
  ['overall', 'Overall', 'Wins, KOs, Boss Fight level and time online together'],
  ['online', 'Most online', 'Most time spent in the game while signed in'],
  ['wins', 'Most wins', 'Online and Boss Fight wins'],
  ['games', 'Most games', 'Online matches and Boss Fights played'],
  ['boss', 'Boss Fight', 'Highest Boss Fight level beaten']
];

/* 75 minutes -> "1h 15m", 3 days -> "3d 0h", and so on up to years */
function lbTime(ms) {
  const m = Math.floor((ms || 0) / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24), mo = Math.floor(d / 30), y = Math.floor(d / 365);
  if (y) return y + 'y ' + Math.floor((d - y * 365) / 30) + 'mo';
  if (mo) return mo + 'mo ' + (d - mo * 30) + 'd';
  if (d) return d + 'd ' + (h - d * 24) + 'h';
  if (h) return h + 'h ' + (m - h * 60) + 'm';
  return m + 'm';
}
const lbRatio = (a, b) => { a = +a || 0; b = +b || 0; return (b ? a / b : a).toFixed(2); };
function lbMain(tab, x) {
  if (tab === 'online') return lbTime(x.onlineMs);
  if (tab === 'wins') return x.wins + (x.wins === 1 ? ' win' : ' wins');
  if (tab === 'games') return x.games + (x.games === 1 ? ' game' : ' games');
  if (tab === 'boss') return 'Level ' + x.bestLevel;
  return x.score + ' pts';
}
function lbDetails(tab, x) {
  if (tab === 'season') return [['Wins', x.wins], ['KOs', x.kos], ['Games', x.games]];
  if (tab === 'overall') return [['K/D', lbRatio(x.kos, x.deaths)], ['W/L', lbRatio(x.wins, x.losses)], ['Boss', 'Lv ' + x.bestLevel], ['Online', lbTime(x.onlineMs)]];
  if (tab === 'wins') return [['Losses', x.losses], ['W/L', lbRatio(x.wins, x.losses)]];
  if (tab === 'games') return [['Wins', x.wins], ['Losses', x.losses]];
  if (tab === 'boss') return [['Boss wins', x.bossWins]];
  return [['Games', x.games]];
}
function lbCpuStats() { try { return JSON.parse(loadLocal('cb.cpuStats') || 'null') || { games: 0, wins: 0, kos: 0, deaths: 0 }; } catch (e) { return { games: 0, wins: 0, kos: 0, deaths: 0 }; } }
/* called by app.js when a Vs CPU match ends: saved to your account when signed in, otherwise on this device */
function lbRecordCpu(row) {
  if (!row) return;
  if (typeof acctSignedIn === 'function' && acctSignedIn() && typeof acctApi === 'function') {
    acctApi('/api/cpu-result', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ win: !!row.win, kos: Math.min(50, row.kos | 0), falls: Math.min(50, row.falls | 0) }) }).catch(() => {});
    return;
  }
  const s = lbCpuStats();
  s.games++; if (row.win) s.wins++; s.kos += row.kos | 0; s.deaths += row.falls | 0;
  saveLocal('cb.cpuStats', JSON.stringify(s));
}

function lbScreen() {
  let s = document.getElementById('scr-leaderboard');
  if (!s) { s = el('section', { id: 'scr-leaderboard', class: 'screen lb', hidden: '' }); document.getElementById('app').appendChild(s); }
  return s;
}
function showLeaderboard() {
  if (typeof SFX !== 'undefined') SFX.play('ui');
  lbScreen(); show('leaderboard'); renderLeaderboard(); loadLeaderboard();
}
async function loadLeaderboard() {
  if (LB.busy) return;
  if (!serverUrl()) { LB.err = 'The leaderboard needs the game server. Play on cloudtop-brawl.com to see it.'; renderLeaderboard(); return; }
  LB.busy = true; LB.err = ''; renderLeaderboard();
  try {
    const t = typeof acctToken === 'function' ? await acctToken() : null;
    const r = await fetch(serverUrl() + '/api/leaderboard', { cache: 'no-store', headers: t ? { authorization: 'Bearer ' + t } : {} });
    if (!r.ok) throw new Error('http');
    LB.data = await r.json();
  } catch (e) { LB.err = 'Couldn’t load the leaderboard. Check your connection and try again.'; }
  finally { LB.busy = false; if (G.screen === 'leaderboard') renderLeaderboard(); }
}
function lbMedal(rank) { return el('span', { class: 'lb-medal m' + rank, 'aria-label': ['', 'Gold', 'Silver', 'Bronze'][rank] + ' medal, rank ' + rank }, [el('b', { text: String(rank) })]); }
/* ---- owner tools ---- */
const lbOwner = () => !!(LB.data && LB.data.owner && typeof acctApi === 'function');
const lbPost = (path, data) => acctApi(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
async function lbMove(i, dir) {
  const list = LB.data.sections[LB.tab] || [], j = i + dir;
  if (LB.busy || j < 0 || j >= list.length) return;
  const uids = list.map(x => x.uid);
  [uids[i], uids[j]] = [uids[j], uids[i]];
  LB.busy = true; renderLeaderboard();
  try { await lbPost('/api/admin/board/order', { section: LB.tab, uids }); } catch (e) { toast('Couldn’t move that player. Try again.'); }
  LB.busy = false; loadLeaderboard();
}
async function lbResetOrder() {
  if (LB.busy || !(await gameConfirm('Put “' + LB_TABS.find(x => x[0] === LB.tab)[1] + '” back in order by the numbers?', 'Yes, reset'))) return;
  LB.busy = true; renderLeaderboard();
  try { await lbPost('/api/admin/board/order', { section: LB.tab, reset: true }); } catch (e) { toast('Couldn’t reset the order. Try again.'); }
  LB.busy = false; loadLeaderboard();
}
function lbEdit(x) {
  const back = el('div', { class: 'gc-back' }), box = el('form', { class: 'gc-box card lb-edit', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Edit ' + x.name });
  const num = (label, key, value, max) => {
    const i = el('input', { type: 'number', min: '0', max: String(max), step: '1', value: String(value), 'aria-label': label }); i.dataset.k = key;
    return el('label', { class: 'lb-edit-f' }, [el('span', { text: label }), i]);
  };
  const h = Math.floor(x.onlineMs / 3600000), m = Math.floor((x.onlineMs % 3600000) / 60000);
  box.append(el('h3', { text: 'Edit ' + x.name }), el('p', { class: 'muted', text: 'Only you can do this. The change is saved right away and logged.' }),
    el('div', { class: 'lb-edit-grid' }, [num('Online hours', 'h', h, 876000), num('Online minutes', 'm', m, 59), num('Games', 'games', x.games, 1e7),
      num('Wins', 'wins', x.wins, 1e7), num('Losses', 'losses', x.losses, 1e7), num('KOs', 'kos', x.kos, 1e7), num('Deaths', 'deaths', x.deaths, 1e7),
      num('Boss wins', 'bossWins', x.bossWins, 1e7), num('Boss level', 'bestLevel', x.bestLevel, BOSS_LEVELS.length)]));
  const msg = el('p', { class: 'ad-message', role: 'status' });
  const cancel = el('button', { type: 'button', class: 'btn', text: 'Cancel' }), save = el('button', { type: 'submit', class: 'btn start', text: 'Save' });
  box.append(msg, el('div', { class: 'gc-row' }, [cancel, save]));
  back.appendChild(box); document.body.appendChild(back);
  const close = () => back.remove();
  cancel.addEventListener('click', close);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } e.stopPropagation(); });
  box.addEventListener('submit', async e => {
    e.preventDefault();
    const v = {}; box.querySelectorAll('input').forEach(i => { v[i.dataset.k] = Math.max(0, Math.min(+i.max, Math.floor(+i.value || 0))); });
    const set = { onlineMs: (v.h * 60 + v.m) * 60000 };
    ['games', 'wins', 'losses', 'kos', 'deaths', 'bossWins', 'bestLevel'].forEach(k => { set[k] = v[k]; });
    save.disabled = true; msg.textContent = 'Saving…';
    try { await lbPost('/api/admin/board', { uid: x.uid, set }); close(); loadLeaderboard(); }
    catch (err) { msg.textContent = 'Couldn’t save. Check the numbers and try again.'; save.disabled = false; }
  });
  setTimeout(() => { const f = box.querySelector('input'); if (f) f.focus(); }, 0);
}
function lbArrows(i, n) {
  const up = el('button', { type: 'button', class: 'lb-arrow', text: '▲', 'aria-label': 'Move up', on: { click: e => { e.stopPropagation(); lbMove(i, -1); } } });
  const dn = el('button', { type: 'button', class: 'lb-arrow', text: '▼', 'aria-label': 'Move down', on: { click: e => { e.stopPropagation(); lbMove(i, 1); } } });
  up.disabled = LB.busy || i === 0; dn.disabled = LB.busy || i === n - 1;
  return el('span', { class: 'lb-arrows' }, [up, dn]);
}
/* in owner mode the number is a button that opens the editor */
function lbValue(cls, x, text) {
  if (!lbOwner() || LB.tab === 'season') return el(cls === 'lb-pval' ? 'div' : 'span', { class: cls, text });
  return el('button', { type: 'button', class: cls + ' lb-editable', text, title: 'Tap to edit', 'aria-label': 'Edit ' + x.name + ': ' + text, on: { click: () => lbEdit(x) } });
}

function renderLeaderboard() {
  const s = lbScreen(); s.textContent = '';
  const wrap = el('div', { class: 'wrap lb-wrap' }); s.appendChild(wrap);
  const refresh = el('button', { type: 'button', class: 'mini', text: LB.busy ? 'Loading…' : '↻ Refresh', on: { click: loadLeaderboard } }); refresh.disabled = LB.busy;
  wrap.appendChild(el('header', { class: 'bar' }, [
    el('button', { type: 'button', class: 'back', text: '← Back', on: { click: () => show('main') } }),
    el('h2', { class: 'lb-title', text: 'Leaderboard' }), refresh]));
  const tabs = el('div', { class: 'lb-tabs', role: 'tablist', 'aria-label': 'Leaderboard sections' });
  LB_TABS.forEach(([id, name]) => tabs.appendChild(el('button', { type: 'button', role: 'tab', class: 'lb-tab' + (LB.tab === id ? ' on' : ''),
    'aria-selected': String(LB.tab === id), text: name, on: { click: () => { LB.tab = id; if (typeof SFX !== 'undefined') SFX.play('ui'); renderLeaderboard(); } } })));
  wrap.appendChild(tabs);
  const tabInfo = LB_TABS.find(x => x[0] === LB.tab);
  wrap.appendChild(el('p', { class: 'lb-sub', text: tabInfo[2] + (LB.tab === 'overall' ? ' · points = 10 per win + 2 per KO + 5 per Boss level + 1 per hour online' : '') }));
  if (LB.tab === 'season' && LB.data && LB.data.season) {
    wrap.appendChild(el('p', { class: 'lb-season-note', text: 'Season ' + LB.data.season.month + ' · Calendar month in UTC · 10 points per win + 2 per KO. Starts with new matches after titles launch. Ties: most wins, then a fixed account order. #1 keeps Season Champion when the month ends.' }));
    const winners = LB.data.season.winners || [];
    if (winners.length) wrap.appendChild(el('p', { class: 'lb-season-note', text: 'Previous champions: ' + winners.slice(-3).map(x => x.month + ' — ' + x.name).join(' · ') }));
  }
  if (lbOwner() && LB.tab !== 'season') {
    const tools = el('div', { class: 'lb-owner' }, [el('span', { class: 'ad-badge ad-badge-owner', text: 'OWNER TOOLS' }),
      el('span', { text: 'Use ▲ ▼ to move players. Tap a number to edit it.' })]);
    if (LB.data.custom && LB.data.custom[LB.tab]) { const r = el('button', { type: 'button', class: 'mini', text: 'Reset order', on: { click: lbResetOrder } }); r.disabled = LB.busy; tools.appendChild(r); }
    wrap.appendChild(tools);
  }
  if (LB.err) { wrap.appendChild(el('p', { class: 'lb-empty', text: LB.err })); return; }
  if (!LB.data) { wrap.appendChild(el('p', { class: 'lb-empty', text: 'Loading the top players…' })); return; }
  const list = LB.data.sections[LB.tab] || [];
  if (!list.length) wrap.appendChild(el('p', { class: 'lb-empty', text: 'No one is on this board yet. Win an online match or a Boss Fight to be first!' }));
  // podium for the top 3 (2nd, 1st, 3rd, like a real podium)
  const podium = el('div', { class: 'lb-podium' });
  [1, 0, 2].forEach(i => {
    const x = list[i]; if (!x) return;
    const rank = i + 1;
    podium.appendChild(el('div', { class: 'lb-step s' + rank + (x.me ? ' me' : '') }, [
      lbOwner() && LB.tab !== 'season' ? lbArrows(i, list.length) : null,
      lbMedal(rank), el('div', { class: 'lb-pname', text: x.name }), lbValue('lb-pval', x, lbMain(LB.tab, x)),
      LB.tab === 'season' ? titleRibbon(rank === 1 ? 'season-leader' : 'top-ten', true) : null,
      el('div', { class: 'lb-pdet', text: lbDetails(LB.tab, x).map(([k, v]) => k + ' ' + v).join(' · ') }),
      el('div', { class: 'lb-block', 'aria-hidden': 'true', text: String(rank) })]));
  });
  if (list.length) wrap.appendChild(podium);
  if (list.length > 3) {
    const rows = el('ol', { class: 'lb-list', start: '4' }); wrap.appendChild(rows);
    list.slice(3).forEach((x, i) => rows.appendChild(el('li', { class: 'lb-row' + (x.me ? ' me' : '') + (lbOwner() ? ' own' : '') }, [
      lbOwner() && LB.tab !== 'season' ? lbArrows(i + 3, list.length) : null,
      el('span', { class: 'lb-rank', text: String(i + 4) }), el('span', { class: 'lb-name', text: x.name }),
      el('span', { class: 'lb-det' }, lbDetails(LB.tab, x).map(([k, v]) => el('span', {}, [el('small', { text: k }), el('b', { text: String(v) })]))),
      lbValue('lb-val', x, lbMain(LB.tab, x))])));
  }
  // your own numbers
  const me = LB.data.me, cpu = lbCpuStats(), mine = el('div', { class: 'card lb-me' }, [el('div', { class: 'card-h', text: 'Your stats' })]);
  if (me && me.stats) {
    const rank = me[LB.tab];
    mine.appendChild(el('p', { class: 'lb-me-rank', text: rank ? 'You’re #' + rank + ' in ' + tabInfo[1] + '.' : 'You’re not on this board yet.' }));
    const x = me.stats;
    mine.appendChild(el('div', { class: 'lb-me-grid' }, [['Online time', lbTime(x.onlineMs)], ['Games', x.games], ['Wins', x.wins], ['Losses', x.losses],
      ['K/D', lbRatio(x.kos, x.deaths)], ['W/L', lbRatio(x.wins, x.losses)], ['Boss level', x.bestLevel], ['Points', x.score]]
      .map(([k, v]) => el('div', {}, [el('small', { text: k }), el('b', { text: String(v) })]))));
  } else mine.appendChild(el('p', { class: 'muted', text: acctSignedIn() ? 'Win an online match or a Boss Fight to get on the leaderboard.' : 'Sign in, then play online or Boss Fight to get on the leaderboard.' }));
  const acc = me && me.stats ? { games: me.stats.cpuGames | 0, wins: me.stats.cpuWins | 0, kos: me.stats.cpuKos | 0, deaths: me.stats.cpuDeaths | 0 } : null;
  const c = acc || cpu;
  mine.appendChild(el('p', { class: 'muted lb-cpu', text: 'Vs CPU ' + (acc ? 'on your account' : 'on this device') + ' (not on the leaderboard): ' + c.games + ' games · ' + c.wins + ' wins · K/D ' + lbRatio(c.kos, c.deaths) }));
  wrap.appendChild(mine);
}
document.getElementById('go-leaderboard').addEventListener('click', showLeaderboard);
