'use strict';
/* ===== CLOUDTOP BRAWL — battle setup screen & stat cards ===== */

const G = { screen: 'main', mode: 'solo', game: null, attract: null, paused: false, t: 0, cfg: null };
const SETUP = { slots: [], stage: 0, stocks: 3, teams: false, edit: 0, hover: null, time: 5 };

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function defaultSlots(mode) {
  return [
    { type: 'you', char: 'titan', lvl: 5, team: 0, nick: '' },
    { type: mode === 'solo' ? 'cpu' : 'open', char: 'random', lvl: 5, team: 1, nick: '' },
    { type: 'off', char: 'random', lvl: 5, team: 1, nick: '' },
    { type: 'off', char: 'random', lvl: 5, team: 1, nick: '' }
  ];
}

function slotLabel(s, i) {
  if (s.type === 'you') return G.mode === 'guest' ? (s.nick || 'Host') : 'You';
  if (s.type === 'peer') return (G.mode === 'guest' && s.peer === NET.me) ? 'You' : (s.nick || 'Friend');
  if (s.type === 'cpu') return 'CPU · Lv ' + s.lvl;
  if (s.type === 'open') return 'Waiting for a friend';
  return 'Empty';
}
function slotColor(i) { return SETUP.teams ? TEAM_COLORS[SETUP.slots[i].team] : SLOT_COLORS[i]; }
function canEditSlot(i) {
  if (G.mode === 'guest') return SETUP.slots[i] && SETUP.slots[i].type === 'peer' && SETUP.slots[i].peer === NET.me;
  const s = SETUP.slots[i];
  return s.type === 'you' || s.type === 'cpu';
}
function isHostish() { return G.mode === 'solo' || G.mode === 'host'; }

function buildRoster() {
  const box = document.getElementById('roster');
  box.innerHTML = '';
  [...ROSTER.filter(c => !c.locked || MY_UNLOCKED.indexOf(c.id) >= 0), { id: 'random', name: 'Random' }].forEach(c => {
    const b = document.createElement('button');
    b.className = 'tile'; b.type = 'button'; b.dataset.id = c.id;
    if (c.ultimate && c.ultimate.colors) { b.style.setProperty('--t1', c.ultimate.colors[1]); b.style.setProperty('--t2', c.ultimate.colors[0]); }   // each fighter's own colors
    b.innerHTML = `<canvas class="tile-cv" aria-hidden="true"></canvas><span class="tile-name">${esc(c.name)}</span>`;
    b.addEventListener('mouseenter', () => { SETUP.hover = c.id; renderStatCard(); });
    b.addEventListener('mouseleave', () => { SETUP.hover = null; renderStatCard(); });
    b.addEventListener('focus', () => { SETUP.hover = c.id; renderStatCard(); });
    b.addEventListener('blur', () => { SETUP.hover = null; renderStatCard(); });
    b.addEventListener('click', () => pickChar(c.id));
    box.appendChild(b);
  });
  requestAnimationFrame(() => box.querySelectorAll('.tile').forEach(t => drawPortrait(t.querySelector('canvas'), t.dataset.id)));
}

function pickChar(id) {
  SFX.play('ui');
  const i = SETUP.edit;
  if (!canEditSlot(i)) return;
  SETUP.slots[i].char = id;
  if (G.mode === 'guest') netSetChar(id);
  if (G.mode === 'host') pushLobby();
  saveLocal('cb.char', id);
  // after picking for yourself, move on to the next CPU so setup flows like the console version
  renderSetup();
}

function renderStatCard() {
  const el = document.getElementById('statcard');
  const cur = SETUP.slots[SETUP.edit];
  const id = SETUP.hover || (cur && cur.char) || ROSTER[0].id;
  if (el.dataset.id === id) return;
  if (id === 'random') {
    el.dataset.id = id;
    el.innerHTML = `<div class="sc-top"><canvas class="sc-cv" aria-hidden="true"></canvas><div class="sc-head"><div class="sc-eyebrow">Surprise pick</div><h3 class="sc-name">Random</h3><p class="sc-passive">You get a random fighter from the roster when the battle starts, and a new one every rematch. Works for CPUs too.</p></div></div>
      <div class="rand-list">${ROSTER.filter(c => !c.legend).map(c => `<span class="chip">${esc(c.name)}</span>`).join('')}</div>`;
    requestAnimationFrame(() => drawPortrait(el.querySelector('.sc-cv'), 'random'));
    return;
  }
  const c = CHAR[id];
  if (!c) return;
  el.dataset.id = id;
  const bars = STAT_KEYS.map(([k, label, col]) => {
    const v = clamp(c.stats[k] | 0, 0, 10);
    let segs = '';
    for (let i = 0; i < 10; i++) segs += `<i style="${i < v ? `background:${col}` : ''}"></i>`;
    return `<div class="stat"><span class="st-l">${label}</span><span class="st-bar">${segs}</span><span class="st-n">${v}</span></div>`;
  }).join('');
  const key = { neutral: 'B', side: '→ B', up: '↑ B', down: '↓ B' };
  const specials = c.modes
    ? c.modes.map((id, i) => `<li><span class="sp-k">${i + 1}</span><div><b>${esc(CHAR[id].name)} style</b><span>${esc(['neutral', 'side', 'up', 'down'].map(w => CHAR[id].specials[w].name).join(' · '))}</span></div></li>`).join('')
    : ['neutral', 'side', 'up', 'down'].map(w => {
      const m = c.specials[w]; if (!m) return '';
      return `<li><span class="sp-k">${key[w]}</span><div><b>${esc(m.name)}</b><span>${esc(m.desc || '')}</span></div></li>`;
    }).join('');
  const chip = ids => (ids || []).filter(x => CHAR[x]).map(x => `<span class="chip">${esc(CHAR[x].name)}</span>`).join('') || '<span class="muted">—</span>';
  el.innerHTML = `
    <div class="sc-top">
      <canvas class="sc-cv" aria-hidden="true"></canvas>
      <div class="sc-head">
        <div class="sc-eyebrow">${esc(c.title || '')}</div>
        <h3 class="sc-name">${esc(c.name)}</h3>
        <p class="sc-passive">${esc(c.passive || '')}</p>
      </div>
    </div>
    <div class="stats">${bars}</div>
    <ul class="specials">${specials}</ul>
    <div class="matchups"><div><span class="mu-l good">Strong vs</span>${chip(c.strongVs)}</div><div><span class="mu-l bad">Weak vs</span>${chip(c.weakVs)}</div></div>`;
  requestAnimationFrame(() => drawPortrait(el.querySelector('.sc-cv'), id, { pose: 'idle' }));
}

function renderSetup() {
  const host = isHostish();
  document.getElementById('setup-title').textContent = G.training ? 'Training Lab' : G.mode === 'solo' ? 'Solo battle' : G.mode === 'host' ? 'Your lobby' : 'Lobby';
  const sub = document.getElementById('setup-sub');
  const codeBox = document.getElementById('code-box');
  codeBox.hidden = G.mode === 'solo';
  document.getElementById('code-val').textContent = NET.code || '';
  document.getElementById('code-copy').hidden = G.mode !== 'host';
  if (G.mode === 'host') sub.textContent = 'Send your friends this code. They open the game, pick “Online with friends” and type it in.';
  else if (G.mode === 'guest') sub.textContent = `Hosted by ${NET.hostNick || 'your friend'} · the host picks rules and starts the battle.`;
  else if (G.training) sub.textContent = 'Pick your fighter and a training dummy. The dummy never runs out of lives, and your ultimate is always ready.';
  else sub.textContent = 'Pick fighters, add up to 3 CPUs, then start.';

  const cur = SETUP.slots[SETUP.edit];
  document.getElementById('pick-for').textContent = cur ? `Choosing for ${'P' + (SETUP.edit + 1)} · ${slotLabel(cur, SETUP.edit)}` : '';
  document.querySelectorAll('#roster .tile').forEach(t => t.classList.toggle('sel', cur && t.dataset.id === cur.char));

  const box = document.getElementById('slots');
  box.innerHTML = '';
  SETUP.slots.forEach((s, i) => {
    const d = document.createElement('div');
    const active = s.type !== 'off' && s.type !== 'open';
    if (G.training && !active) return;
    d.className = 'slot' + (i === SETUP.edit ? ' editing' : '') + (active ? '' : ' empty');
    d.style.setProperty('--sc', slotColor(i));
    const c = s.char === 'random' ? { name: 'Random' } : CHAR[s.char];
    let actions = '';
    if (G.training && s.type === 'cpu') {
      actions += `<span class="seg">${DUMMY_MODES.map(([id, nm]) => `<button type="button" class="seg-b${(s.dummy || 'stand') === id ? ' on' : ''}" data-act="dummy" data-m="${id}" data-i="${i}">${nm}</button>`).join('')}</span>`;
      if (s.dummy === 'fight') actions += `<span class="lvl"><button type="button" class="mini sq" data-act="lvl-" data-i="${i}" aria-label="Lower CPU level">−</button><span>Lv ${s.lvl}</span><button type="button" class="mini sq" data-act="lvl+" data-i="${i}" aria-label="Raise CPU level">+</button></span>`;
    } else if (host && s.type !== 'you' && s.type !== 'peer') {
      const next = { off: 'cpu', cpu: G.mode === 'host' ? 'open' : 'off', open: 'off' }[s.type];
      const lbl = { cpu: 'Add CPU', open: 'Open for friend', off: 'Remove' }[next];
      actions += `<button type="button" class="mini" data-act="cycle" data-i="${i}">${lbl}</button>`;
    }
    if (!G.training && host && s.type === 'off' && G.mode === 'host') actions += `<button type="button" class="mini" data-act="open" data-i="${i}">Invite friend</button>`;
    if (!G.training && host && s.type === 'cpu') actions += `<span class="lvl"><button type="button" class="mini sq" data-act="lvl-" data-i="${i}" aria-label="Lower CPU level">−</button><span>Lv ${s.lvl}</span><button type="button" class="mini sq" data-act="lvl+" data-i="${i}" aria-label="Raise CPU level">+</button></span>`;
    if (host && SETUP.teams && active) actions += `<button type="button" class="mini team" data-act="team" data-i="${i}">${TEAM_NAMES[s.team]} team</button>`;
    else if (!host && SETUP.teams && active) actions += `<span class="mini ghost">${TEAM_NAMES[s.team]} team</span>`;
    d.innerHTML = `
      <div class="slot-top"><span class="slot-p">P${i + 1}</span><span class="slot-who">${esc(slotLabel(s, i))}</span></div>
      ${active ? `<button type="button" class="slot-pick" data-act="edit" data-i="${i}" ${canEditSlot(i) ? '' : 'disabled'}>
        <canvas class="slot-cv" data-char="${esc(s.char)}" aria-hidden="true"></canvas>
        <span class="slot-char">${esc(c ? c.name : '?')}</span>
        ${canEditSlot(i) ? `<span class="slot-hint">${i === SETUP.edit ? 'Picking…' : 'Change fighter'}</span>` : ''}
      </button>` : `<div class="slot-empty">${s.type === 'open' ? 'Friends see this lobby in their list and can join this spot.' : 'No fighter in this spot.'}</div>`}
      <div class="slot-actions">${actions}</div>`;
    box.appendChild(d);
  });
  box.querySelectorAll('.slot-cv').forEach(cv => requestAnimationFrame(() => drawPortrait(cv, cv.dataset.char)));

  // rules
  const r = document.getElementById('rules');
  const dis = host ? '' : 'disabled';
  r.innerHTML = `
    <div class="rule"><span class="rule-l">Stage</span><div class="seg stages">${STAGES.map((st, i) => `<button type="button" class="stage-chip${i === SETUP.stage ? ' on' : ''}" data-act="stage" data-i="${i}" ${dis} style="--s1:${st.swatch[0]};--s2:${st.swatch[1]};--s3:${st.swatch[2]}"><span class="sw"></span>${esc(st.name)}</button>`).join('')}<button type="button" class="stage-chip${SETUP.stage < 0 ? ' on' : ''}" data-act="stage" data-i="-1" ${dis} style="--s1:#ff6b5b;--s2:#ffb547;--s3:#3da5ff"><span class="sw"></span>Random</button><p class="muted stage-blurb">${SETUP.stage < 0 ? 'A surprise stage every battle.' : esc((STAGES[SETUP.stage] || STAGES[0]).blurb || '')}</p></div></div>
    ${G.training ? '' : `<div class="rule"><span class="rule-l">Stocks</span><div class="seg"><button type="button" class="mini sq" data-act="stock-" ${dis} aria-label="Fewer stocks">−</button><span class="stock-n">${SETUP.stocks}</span><button type="button" class="mini sq" data-act="stock+" ${dis} aria-label="More stocks">+</button><span class="muted">lives each</span></div></div>
    <div class="rule"><span class="rule-l">Time</span><div class="seg"><button type="button" class="mini sq" data-act="time-" ${dis} aria-label="Less time">−</button><span class="stock-n">${SETUP.time}:00</span><button type="button" class="mini sq" data-act="time+" ${dis} aria-label="More time">+</button><span class="muted">minutes (2–15)</span></div></div>
    <div class="rule"><span class="rule-l">Mode</span><div class="seg">
      <button type="button" class="seg-b${!SETUP.teams ? ' on' : ''}" data-act="ffa" ${dis}>Free-for-all</button>
      <button type="button" class="seg-b${SETUP.teams ? ' on' : ''}" data-act="teams" ${dis}>Teams</button>
      ${host ? `<button type="button" class="seg-b" data-act="pvc">Humans vs CPUs</button>` : ''}
    </div></div>`}`;

  const st = document.getElementById('start');
  const n = SETUP.slots.filter(s => s.type === 'you' || s.type === 'peer' || s.type === 'cpu');
  const teamsOk = !SETUP.teams || new Set(n.map(s => s.team)).size > 1;
  if (G.mode === 'guest') { st.hidden = true; document.getElementById('wait-note').hidden = false; }
  else {
    st.hidden = false; document.getElementById('wait-note').hidden = true;
    st.disabled = n.length < 2 || !teamsOk;
    st.textContent = n.length < 2 ? 'Add at least one opponent' : !teamsOk ? 'Put fighters on both teams' : 'Start battle';
    if (G.training) st.textContent = 'Start training';
  }
  // short summary of the rules on the Rules button in the top bar
  const sum = document.getElementById('cs-rules-sum');
  if (sum) {
    const stn = SETUP.stage < 0 ? 'Random stage' : (STAGES[SETUP.stage] || STAGES[0]).name;
    sum.textContent = G.training ? stn : `${stn} \u00b7 ${SETUP.stocks} ${SETUP.stocks === 1 ? 'stock' : 'stocks'} \u00b7 ${SETUP.time}:00${SETUP.teams ? ' \u00b7 Teams' : ''}`;
  }
  renderStatCard();
}

/* the Rules button opens a side drawer with stage / stocks / time / mode */
function setRulesOpen(open) {
  const d = document.getElementById('cs-drawer'), b = document.getElementById('cs-rules-btn');
  if (!d) return;
  d.hidden = !open; if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
}
if (document.getElementById('cs-rules-btn')) {
  document.getElementById('cs-rules-btn').addEventListener('click', () => { SFX.play('ui'); setRulesOpen(true); });
  document.getElementById('cs-rules-close').addEventListener('click', () => { SFX.play('ui'); setRulesOpen(false); });
  document.getElementById('cs-drawer').addEventListener('click', e => { if (e.target.id === 'cs-drawer') setRulesOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.getElementById('cs-drawer').hidden) setRulesOpen(false); });
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || !b.closest('#scr-setup') || b.disabled) return;
  const act = b.dataset.act, i = +b.dataset.i;
  const s = SETUP.slots[i];
  SFX.play('ui');
  switch (act) {
    case 'edit': if (canEditSlot(i)) SETUP.edit = i; document.getElementById('statcard').dataset.id = ''; break;
    case 'cycle': s.type = { off: 'cpu', cpu: G.mode === 'host' ? 'open' : 'off', open: 'off' }[s.type]; if (s.type === 'cpu') { s.char = 'random'; SETUP.edit = i; } if (SETUP.edit === i && !canEditSlot(i)) SETUP.edit = 0; break;
    case 'open': s.type = 'open'; break;
    case 'dummy': s.dummy = b.dataset.m; break;
    case 'lvl-': s.lvl = Math.max(1, s.lvl - 1); break;
    case 'lvl+': s.lvl = Math.min(10, s.lvl + 1); break;
    case 'team': s.team = 1 - s.team; break;
    case 'stage': SETUP.stage = i; break;
    case 'stock-': SETUP.stocks = Math.max(1, SETUP.stocks - 1); break;
    case 'stock+': SETUP.stocks = Math.min(9, SETUP.stocks + 1); break;
    case 'time-': SETUP.time = Math.max(2, SETUP.time - 1); break;
    case 'time+': SETUP.time = Math.min(15, SETUP.time + 1); break;
    case 'ffa': SETUP.teams = false; break;
    case 'teams': SETUP.teams = true; break;
    case 'pvc': SETUP.teams = true; SETUP.slots.forEach(x => { x.team = (x.type === 'cpu') ? 1 : 0; }); break;
  }
  if (G.mode === 'host') pushLobby();
  document.getElementById('statcard').dataset.id = '';
  renderSetup();
});

function saveLocal(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
function loadLocal(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
