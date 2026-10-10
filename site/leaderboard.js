'use strict';
/* ===== CLOUDTOP BRAWL — Leaderboard =====
   The numbers come from the game server, which counts them itself when an online match or a Boss Fight ends,
   so nobody can fake them from their browser. The list is public: usernames and numbers only, never emails.
   Vs CPU games run in your own browser, so they are only shown in "Your stats" on this device. */

const LB = { data: null, tab: 'overall', busy: false, err: '' };
const LB_TABS = [
  ['overall', 'Overall', 'Wins, KOs, Boss Fight level and time online together'],
  ['online', 'Most online', 'Most time spent playing online'],
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
const lbRatio = (a, b) => (b ? a / b : a).toFixed(2);
function lbMain(tab, x) {
  if (tab === 'online') return lbTime(x.onlineMs);
  if (tab === 'wins') return x.wins + (x.wins === 1 ? ' win' : ' wins');
  if (tab === 'games') return x.games + (x.games === 1 ? ' game' : ' games');
  if (tab === 'boss') return 'Level ' + x.bestLevel;
  return x.score + ' pts';
}
function lbDetails(tab, x) {
  if (tab === 'overall') return [['K/D', lbRatio(x.kos, x.deaths)], ['W/L', lbRatio(x.wins, x.losses)], ['Boss', 'Lv ' + x.bestLevel], ['Online', lbTime(x.onlineMs)]];
  if (tab === 'wins') return [['Losses', x.losses], ['W/L', lbRatio(x.wins, x.losses)]];
  if (tab === 'games') return [['Wins', x.wins], ['Losses', x.losses]];
  if (tab === 'boss') return [['Boss wins', x.bossWins]];
  return [['Games', x.games]];
}
function lbCpuStats() { try { return JSON.parse(loadLocal('cb.cpuStats') || 'null') || { games: 0, wins: 0, kos: 0, deaths: 0 }; } catch (e) { return { games: 0, wins: 0, kos: 0, deaths: 0 }; } }
/* called by app.js when a Vs CPU match ends (this device only) */
function lbRecordCpu(row) {
  if (!row) return;
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
      lbMedal(rank), el('div', { class: 'lb-pname', text: x.name }), el('div', { class: 'lb-pval', text: lbMain(LB.tab, x) }),
      el('div', { class: 'lb-pdet', text: lbDetails(LB.tab, x).map(([k, v]) => k + ' ' + v).join(' · ') }),
      el('div', { class: 'lb-block', 'aria-hidden': 'true', text: String(rank) })]));
  });
  if (list.length) wrap.appendChild(podium);
  if (list.length > 3) {
    const rows = el('ol', { class: 'lb-list', start: '4' }); wrap.appendChild(rows);
    list.slice(3).forEach((x, i) => rows.appendChild(el('li', { class: 'lb-row' + (x.me ? ' me' : '') }, [
      el('span', { class: 'lb-rank', text: String(i + 4) }), el('span', { class: 'lb-name', text: x.name }),
      el('span', { class: 'lb-det' }, lbDetails(LB.tab, x).map(([k, v]) => el('span', {}, [el('small', { text: k }), el('b', { text: String(v) })]))),
      el('span', { class: 'lb-val', text: lbMain(LB.tab, x) })])));
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
  mine.appendChild(el('p', { class: 'muted lb-cpu', text: 'Vs CPU on this device (not on the leaderboard): ' + cpu.games + ' games · ' + cpu.wins + ' wins · K/D ' + lbRatio(cpu.kos, cpu.deaths) }));
  wrap.appendChild(mine);
}
document.getElementById('go-leaderboard').addEventListener('click', showLeaderboard);
