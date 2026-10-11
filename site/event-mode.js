'use strict';
/* ===== CLOUDTOP BRAWL — event mode =====
   During a seasonal event, tap the event chip on the main menu for the Event screen:
   - an intro (first time each event, and replayable) showing this event's 3 buffed fighters
   - Event Vs CPU: you pick any fighter, the CPU plays a buffed fighter at level 7
   - Play friends: an online lobby with event rules on (the host can switch them on or off in the rules)
   - the event leaderboard: wins only; when the event ends the top 10 get XP (event-buffs.js has the numbers)
   Also here: the Ranked leaderboard (a button on the Ranked screen). */

const EVM = { board: null, busy: false, err: '', all: false, rk: null, rkBusy: false };
const evmName = id => (CHAR[id] && CHAR[id].name) || id;
const evmFmt = n => Math.round(n).toLocaleString();
const evmPlace = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
function evmEvent() { const id = typeof nowEvent === 'function' ? nowEvent() : null; return id && EVENTS[id] ? Object.assign({ id }, EVENTS[id]) : null; }

/* the event this match counts for: event rules on, you against level 7+ CPUs playing buffed fighters (Vs CPU) */
function eventMatchId(cfg) {
  if (!cfg || !cfg.evMode || cfg.training) return undefined;
  const cpus = cfg.slots.filter(s => s.type === 'cpu'), you = cfg.slots.filter(s => s.type === 'you');
  const buffed = eventBuffed(cfg.evMode);
  return you.length === 1 && cpus.length >= 1 && cpus.every(s => (s.lvl | 0) >= EVENT_CPU_LVL && buffed.indexOf(s.char) >= 0) ? cfg.evMode : undefined;
}

/* event rules switch off when you go back to the main menu */
if (typeof show === 'function') {
  const showPlain = show;
  show = function (id) { if (id === 'main' && typeof SETUP !== 'undefined') SETUP.evMode = null; return showPlain(id); };
}

/* ---------- the Event screen ---------- */
function evmScreen() {
  let s = document.getElementById('scr-event');
  if (!s) { s = el('section', { id: 'scr-event', class: 'screen evm', hidden: '' }); document.getElementById('app').appendChild(s); }
  return s;
}
function showEvent() {
  const ev = evmEvent(); if (!ev) return;
  if (typeof SFX !== 'undefined') SFX.play('ui');
  evmScreen(); show('event'); renderEvent(); loadEventBoard();
  const key = ev.id + ':' + new Date().getFullYear();
  let seen = ''; try { seen = loadLocal('cb.evIntro') || ''; } catch (e) { }
  if (seen !== key) { try { saveLocal('cb.evIntro', key); } catch (e) { } showEventIntro(ev); }
}
async function loadEventBoard() {
  if (EVM.busy) return;
  if (typeof serverUrl !== 'function' || !serverUrl()) { EVM.err = 'The event leaderboard needs the game server. Play on cloudtop-brawl.com to see it.'; renderEvent(); return; }
  EVM.busy = true; EVM.err = '';
  try {
    const t = typeof acctToken === 'function' ? await acctToken() : null;
    const r = await fetch(serverUrl() + '/api/event/board', { cache: 'no-store', headers: t ? { authorization: 'Bearer ' + t } : {} });
    if (!r.ok) throw new Error('http');
    EVM.board = await r.json();
  } catch (e) { EVM.err = 'Couldn’t load the event leaderboard. Check your connection and try again.'; }
  EVM.busy = false;
  if (G.screen === 'event') renderEvent();
}
function evmFighterCard(id, big) {
  const cv = el('canvas', { class: 'evm-cv', 'aria-hidden': 'true' });
  const card = el('div', { class: 'evm-buff' + (big ? ' big' : '') }, [el('div', { class: 'evm-pic' }, [cv, el('span', { class: 'evm-tag', text: '⚡ BUFFED' })]),
    el('b', { text: evmName(id) }),
    el('div', { class: 'evm-ups' }, [el('span', { text: '▲ Damage' }), el('span', { text: '▲ Speed' }), el('span', { text: '▲ Weight' })])]);
  const notes = typeof evUpgradeNotes === 'function' ? evUpgradeNotes(id) : [];
  if (notes.length) card.appendChild(el('span', { class: 'evm-upg-tag', text: '⚡ ' + notes.length + ' upgrades' }));
  requestAnimationFrame(() => drawPortrait(cv, id, { skin: '' }));
  return card;
}
/* what each buffed fighter's upgraded moves do (full width, so it reads well on phones) */
function evmUpgradeList(buffs) {
  const list = buffs.filter(id => typeof evUpgradeNotes === 'function' && evUpgradeNotes(id).length);
  if (!list.length) return null;
  return el('div', { class: 'evm-upgs' }, list.map(id => el('div', { class: 'evm-upgs-f' }, [el('b', { text: '⚡ ' + evmName(id) + '’s upgraded moves' }),
    el('ul', { class: 'evm-upg' }, evUpgradeNotes(id).map(n => el('li', { text: n })))])));
}
function renderEvent() {
  const s = evmScreen(); s.textContent = '';
  const ev = evmEvent();
  const wrap = el('div', { class: 'wrap evm-wrap' }); s.appendChild(wrap);
  wrap.appendChild(el('header', { class: 'bar' }, [el('button', { type: 'button', class: 'back', text: '← Back', on: { click: () => { if (typeof SFX !== 'undefined') SFX.play('ui'); show('main'); } } }),
    el('h2', { text: ev ? ev.icon + ' ' + ev.name + ' event' : 'Event' })]));
  if (!ev) { wrap.appendChild(el('p', { class: 'muted', text: 'There’s no event right now. The next one starts soon!' })); return; }
  const info = typeof eventInfo === 'function' ? eventInfo() : null;
  // the power-ups
  const buffs = eventBuffed(ev.id);
  wrap.appendChild(el('section', { class: 'card evm-power' }, [
    el('div', { class: 'card-h' }, [el('span', { text: 'This event’s power-ups' }), el('span', { class: 'muted', text: info && info.id === ev.id ? (info.daysLeft <= 1 ? 'last day!' : 'ends in ' + info.daysLeft + ' days') : '' })]),
    el('div', { class: 'evm-buffs' }, buffs.map(id => evmFighterCard(id))),
    evmUpgradeList(buffs),
    el('p', { class: 'muted', text: 'In event matches these 3 hit harder, move faster, get launched less and get upgraded moves. Legend Yen is still the strongest.' }),
    el('button', { type: 'button', class: 'mini', text: '▶ Replay intro', on: { click: () => showEventIntro(ev) } })]));
  // play
  wrap.appendChild(el('div', { class: 'evm-play' }, [
    el('button', { type: 'button', class: 'evm-go cpu', on: { click: () => startEventCpu(ev.id) } }, [el('b', { text: '⚔ Event Vs CPU' }), el('span', { text: 'Pick any fighter. The CPU plays a buffed fighter at level ' + EVENT_CPU_LVL + '.' })]),
    el('button', { type: 'button', class: 'evm-go friends', on: { click: () => startEventOnline(ev.id) } }, [el('b', { text: '🌐 Play friends' }), el('span', { text: 'Host a lobby with event rules on. Everyone’s buffed fighters get the power-ups.' })])]));
  // the leaderboard
  const B = EVM.board, card = el('section', { class: 'card evm-board' });
  card.appendChild(el('div', { class: 'card-h' }, [el('span', { text: '🏆 Event leaderboard · wins' }), el('span', { class: 'muted', text: B ? evmFmt(B.players || 0) + ' players' : '' })]));
  card.appendChild(el('div', { class: 'evm-prizes', 'aria-label': 'Prizes when the event ends' }, [el('span', { text: '1st ' + evmFmt(EVENT_PRIZES[0]) + ' XP' }), el('span', { text: '2nd ' + evmFmt(EVENT_PRIZES[1]) + ' XP' }), el('span', { text: '3rd ' + evmFmt(EVENT_PRIZES[2]) + ' XP' }), el('span', { text: '4th–10th ' + evmFmt(EVENT_PRIZES[3]) + ' XP' })]));
  if (EVM.err) card.appendChild(el('p', { class: 'ad-message', role: 'alert', text: EVM.err }));
  else if (!B) card.appendChild(el('p', { class: 'muted', text: 'Loading…' }));
  else {
    const rows = B.top || [], list = el('ol', { class: 'evm-list' });
    if (!rows.length) list.appendChild(el('li', { class: 'muted empty', text: 'No wins yet. Be the first!' }));
    rows.slice(0, EVM.all ? 50 : 10).forEach((x, i) => list.appendChild(el('li', { class: (x.me ? 'me ' : '') + (i < 3 ? 'm' + (i + 1) : '') }, [
      el('span', { class: 'evm-rank', text: String(i + 1) }), el('span', { class: 'evm-name', text: x.name }), el('b', { text: x.wins + (x.wins === 1 ? ' win' : ' wins') }),
      x.prize ? el('small', { text: '+' + evmFmt(x.prize) + ' XP' }) : null])));
    card.appendChild(list);
    if (rows.length > 10) card.appendChild(el('button', { type: 'button', class: 'mini', text: EVM.all ? 'Show top 10' : 'Show top 50', on: { click: () => { EVM.all = !EVM.all; renderEvent(); } } }));
    const signed = typeof acctSignedIn === 'function' && acctSignedIn();
    card.appendChild(el('p', { class: 'muted evm-me', text: !signed ? 'Sign in to get on the leaderboard.' : B.me ? 'You: ' + evmPlace(B.me.rank) + ' with ' + B.me.wins + (B.me.wins === 1 ? ' win' : ' wins') + '.' : 'Win an event match to get on the board.' }));
    card.appendChild(el('p', { class: 'muted small', text: 'Event wins: Event Vs CPU against a level ' + EVENT_CPU_LVL + '+ buffed CPU, or online event lobbies. At most one win a minute counts.' }));
    if (B.last && B.last.top && B.last.top.length) card.appendChild(el('p', { class: 'muted small', text: 'Last event (' + B.last.name + '): ' + B.last.top.slice(0, 3).map((x, i) => evmPlace(i + 1) + ' ' + x.name).join(' · ') }));
  }
  wrap.appendChild(card);
}
function startEventCpu(ev) {
  if (typeof SFX !== 'undefined') SFX.play('ui');
  G.mode = 'solo'; G.training = false; SETUP.slots = defaultSlots('solo');
  const c = loadLocal('cb.char'); if (isPickable(c, myPicks())) SETUP.slots[0].char = c;
  const buffs = eventBuffed(ev), pick = buffs[Math.floor(Math.random() * buffs.length)];
  Object.assign(SETUP.slots[1], { type: 'cpu', char: pick, lvl: EVENT_CPU_LVL, team: 1 });
  SETUP.edit = 0; SETUP.teams = false;
  showSetup();
  SETUP.evMode = ev;
  renderSetup();
}
function startEventOnline(ev) {
  if (typeof SFX !== 'undefined') SFX.play('ui');
  showOnline();
  SETUP.evMode = ev;
  toast('Host a lobby: event rules are on, so the buffed fighters get their power-ups.');
}

/* ---------- the intro: this event's power-ups ---------- */
function showEventIntro(ev) {
  const old = document.querySelector('.evi'); if (old) old.remove();
  const buffs = eventBuffed(ev.id);
  const box = el('div', { class: 'evi ev-' + ev.id, role: 'dialog', 'aria-modal': 'true', 'aria-label': ev.name + ' power-ups' });
  const close = () => { document.removeEventListener('keydown', onKey, true); box.classList.add('out'); setTimeout(() => box.remove(), 300); };
  const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); close(); } };
  box.append(el('div', { class: 'evi-rays', 'aria-hidden': 'true' }),
    el('div', { class: 'evi-in' }, [
      el('div', { class: 'evi-ev', text: ev.icon + ' ' + ev.name.toUpperCase() + ' EVENT' }),
      el('h2', { class: 'evi-title', text: 'THIS SEASON’S POWER-UPS' }),
      el('div', { class: 'evi-cards' }, buffs.map((id, i) => { const c = evmFighterCard(id, true); c.style.animationDelay = (0.7 + i * 0.45) + 's'; return c; })),
      el('p', { class: 'evi-sub', text: 'Stronger, faster, heavier and with upgraded moves in event matches. Play them, or beat them!' }),
      el('button', { type: 'button', class: 'btn primary evi-go', text: 'Let’s go!', on: { click: close } })]),
    el('button', { type: 'button', class: 'evi-skip', text: 'Skip', on: { click: close } }));
  document.body.appendChild(box);
  document.addEventListener('keydown', onKey, true);
  try { [0.7, 1.15, 1.6].forEach((d, i) => setTimeout(() => { SFX.tone(330 + i * 110, 0.12, 'square', 0.07); SFX.tone(660 + i * 220, 0.2, 'triangle', 0.06); }, d * 1000 + 150)); } catch (e) { }
  setTimeout(() => { const b = box.querySelector('.evi-go'); if (b) b.focus({ preventScroll: true }); }, 2300);
}

/* ---------- event rules in the lobby (the host can switch them) ---------- */
if (typeof renderSetup === 'function') {
  const renderSetupPlain = renderSetup;
  renderSetup = function () {
    renderSetupPlain.apply(this, arguments);
    const ev = evmEvent(), r = document.getElementById('rules');
    if (!ev || !r || G.training || !(G.mode === 'host' || G.mode === 'solo')) return;
    const on = SETUP.evMode === ev.id;
    const row = el('div', { class: 'rule evm-rule' }, [el('span', { class: 'rule-l', text: 'Event' }), el('div', { class: 'seg' }, [
      el('button', { type: 'button', class: 'stage-chip' + (on ? ' on' : ''), 'aria-pressed': String(on), text: ev.icon + ' Event rules ' + (on ? 'on' : 'off'),
        on: { click: () => { if (typeof SFX !== 'undefined') SFX.play('ui'); SETUP.evMode = on ? null : ev.id; if (G.mode === 'host' && typeof pushLobby === 'function') pushLobby(); renderSetup(); } } }),
      el('span', { class: 'muted', text: 'Buffed: ' + eventBuffed(ev.id).map(evmName).join(', ') })])]);
    r.prepend(row);
    const sub = document.getElementById('setup-sub');
    if (on && sub && G.mode === 'solo') sub.textContent = ev.icon + ' Event battle: pick your fighter. Beat the buffed level ' + EVENT_CPU_LVL + ' CPU to get on the event leaderboard.';
  };
}

/* ---------- the event chip opens the Event screen ---------- */
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#ev-chip')) showEvent(); });
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.id === 'ev-chip') { e.preventDefault(); showEvent(); } });
setInterval(() => { const c = document.getElementById('ev-chip'); if (c && !c.dataset.btn) { c.dataset.btn = '1'; c.setAttribute('role', 'button'); c.tabIndex = 0; c.title = 'Open the event: power-ups, Event Vs CPU and the event leaderboard'; } }, 1000);

/* ---------- buffed fighters glow gold in event matches ---------- */
if (typeof drawFighter === 'function') {
  const drawFighterBeforeEvent = drawFighter;
  drawFighter = function (g, f, t, portrait) {
    if (f && f.evb && !portrait && !f.out && !(f.dead > 0) && !f.vanish) {
      g.save();
      const cx = f.x, cy = f.y - f.H * 0.5, r = f.H * 0.7 + Math.sin(t * 0.15) * 4;
      const gr = g.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
      gr.addColorStop(0, 'rgba(255,211,92,.35)'); gr.addColorStop(1, 'rgba(255,211,92,0)');
      g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
      g.restore();
    }
    drawFighterBeforeEvent(g, f, t, portrait);
    if (f && f.evb && !portrait && !f.out && !(f.dead > 0) && !f.vanish) {
      g.save(); g.font = 'bold 16px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffd35c'; g.strokeStyle = '#120d24'; g.lineWidth = 4;
      const y = f.y - f.H - 14 + Math.sin(t * 0.12) * 2;
      g.strokeText('⚡', f.x, y); g.fillText('⚡', f.x, y); g.restore();
    }
  };
}

/* ---------- the Ranked leaderboard ---------- */
async function loadRankedBoard(draw) {
  if (EVM.rkBusy) return;
  EVM.rkBusy = true;
  try {
    const t = typeof acctToken === 'function' ? await acctToken() : null;
    const r = await fetch(serverUrl() + '/api/ranked/board', { cache: 'no-store', headers: t ? { authorization: 'Bearer ' + t } : {} });
    if (!r.ok) throw new Error('http');
    EVM.rk = await r.json(); EVM.rkErr = '';
  } catch (e) { EVM.rkErr = 'Couldn’t load the Ranked leaderboard. Check your connection and try again.'; }
  EVM.rkBusy = false; draw();
}
function showRankedBoard() {
  if (typeof SFX !== 'undefined') SFX.play('ui');
  const back = el('div', { class: 'gc-back' }), box = el('div', { class: 'gc-box card shop-box evm-rk', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Ranked leaderboard', tabindex: '-1' });
  back.appendChild(box); document.body.appendChild(back);
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  const close = () => { document.removeEventListener('keydown', onKey, true); back.remove(); };
  document.addEventListener('keydown', onKey, true);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  const draw = () => {
    box.textContent = '';
    const R = EVM.rk;
    box.appendChild(el('div', { class: 'shop-head' }, [el('div', {}, [el('h3', { text: '🏆 Ranked leaderboard' }), el('p', { class: 'muted', text: 'The top 50 by rank points (RP). Win Ranked matches to climb.' })])]));
    if (EVM.rkErr) box.appendChild(el('p', { class: 'ad-message', role: 'alert', text: EVM.rkErr }));
    else if (!R) box.appendChild(el('p', { class: 'muted', text: 'Loading…' }));
    else {
      const list = el('ol', { class: 'evm-list rk-board' });
      if (!(R.top || []).length) list.appendChild(el('li', { class: 'muted empty', text: 'Nobody has played Ranked yet.' }));
      (R.top || []).forEach((x, i) => {
        const col = (typeof RANK_COLORS !== 'undefined' && RANK_COLORS[x.tier]) || '#fff';
        list.appendChild(el('li', { class: (x.me ? 'me ' : '') + (i < 3 ? 'm' + (i + 1) : '') }, [el('span', { class: 'evm-rank', text: String(i + 1) }),
          el('span', { class: 'rk-pill', style: '--rk:' + col, text: x.tier }), el('span', { class: 'evm-name', text: x.name }), el('b', { text: evmFmt(x.rp) + ' RP' }), el('small', { text: x.w + ' W · ' + x.l + ' L' })]));
      });
      box.appendChild(list);
      const signed = typeof acctSignedIn === 'function' && acctSignedIn();
      box.appendChild(el('p', { class: 'muted evm-me', text: !signed ? 'Sign in and play Ranked to get on the board.' : R.me ? 'You: ' + evmPlace(R.me.rank) + ' · ' + R.me.tier + ' · ' + evmFmt(R.me.rp) + ' RP' : 'Play a Ranked match to get on the board.' }));
    }
    box.appendChild(el('div', { class: 'gc-row' }, [el('button', { type: 'button', class: 'btn', text: 'Close', on: { click: close } })]));
  };
  draw();
  setTimeout(() => box.focus({ preventScroll: true }), 0);
  if (typeof serverUrl === 'function' && serverUrl()) loadRankedBoard(() => { if (box.isConnected) draw(); });
  else { EVM.rkErr = 'The Ranked leaderboard needs the game server. Play on cloudtop-brawl.com to see it.'; draw(); }
}
if (typeof renderRanked === 'function') {
  const renderRankedPlain = renderRanked;
  renderRanked = function () {
    renderRankedPlain.apply(this, arguments);
    const bar = document.querySelector('#scr-ranked header.bar');
    if (bar && !bar.querySelector('.rk-lb')) bar.appendChild(el('button', { type: 'button', class: 'mini rk-lb', text: '🏆 Leaderboard', on: { click: showRankedBoard } }));
  };
}
