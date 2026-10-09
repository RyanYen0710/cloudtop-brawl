'use strict';
/* ===== CLOUDTOP BRAWL — screens, match flow, main loop ===== */

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');

function show(id) {
  document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== 'scr-' + id; });
  G.screen = id;
  if (id === 'main') G.training = false;
  if (id !== 'fight' && typeof musicPlay === 'function') musicPlay('menu');
  IN.active = id === 'fight';
  if (typeof updateTouchUI === 'function') updateTouchUI();
  document.getElementById('pause').hidden = true;
  G.paused = false;
}
function isTouch() { try { return matchMedia('(pointer: coarse)').matches || G.touchSeen; } catch (e) { return false; } }
window.addEventListener('touchstart', () => { if (!G.touchSeen) { G.touchSeen = true; if (G.screen === 'fight') updateTouchUI(); } }, { passive: true });

function toast(msg) {
  const t = document.getElementById('toast');
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; t.appendChild(d);
  setTimeout(() => d.remove(), 3200);
}

function showSetup() {
  show('setup');
  if (!document.querySelector('#roster .tile')) buildRoster();
  document.getElementById('statcard').dataset.id = '';
  renderSetup();
}
function showOnline() { show('online'); renderOnline(); }

/* ---------- match ---------- */
function buildCfg() {
  const slots = SETUP.slots.map((s, i) => {
    const o = Object.assign({}, s, { char: resolvePick(s.char), picked: s.char === 'random' });
    if (s.type === 'you') { o.ctrl = { type: 'local' }; const nm = G.mode === 'host' ? NET.nick : myName(); o.name = nm || 'You'; o.tag = nm || 'P' + (i + 1); }
    else if (s.type === 'peer') { o.ctrl = { type: 'remote', peer: s.peer }; o.name = s.nick || 'Friend'; o.tag = s.nick || ('P' + (i + 1)); }
    else if (s.type === 'cpu') { o.ctrl = { type: 'cpu' }; o.name = 'CPU'; o.tag = 'CPU'; }
    return o;
  });
  if (G.training) {
    slots.forEach(o => { if (o.type === 'cpu') { o.ctrl = { type: 'dummy', mode: o.dummy || 'stand' }; o.name = 'Dummy'; o.tag = 'DUMMY'; } });
    return { time: 0, endless: true, training: true, stage: SETUP.stage < 0 ? Math.floor(Math.random() * STAGES.length) : SETUP.stage, stocks: 3, teams: false, slots };
  }
  return { time: SETUP.time, stage: SETUP.stage < 0 ? Math.floor(Math.random() * STAGES.length) : SETUP.stage, stocks: SETUP.stocks, teams: SETUP.teams, slots };
}

function startMatch() {
  if (G.mode === 'guest') return;
  G.remote = false;
  G.cfg = buildCfg();
  G.game = makeGame(G.cfg);
  G.game.fighters.forEach(f => { if (f.ctrl.type === 'cpu') f.ai = null; });
  FX.length = 0; CAM.init = false;
  G.cfg.slots.forEach((s, i) => { if (s.picked && (s.type === 'you')) toast(`Random picked ${CHAR[s.char].name} for you!`); });
  if (G.mode === 'host') {
    NET.gid++; NET.phase = 'fight'; NET.res = null;
    NET.fm = G.game.fighters.map(f => [f.slot, f.c.id, f.tid, f.name.slice(0, 16), f.color, f.tag.slice(0, 16), f.team]);
    if (NET.useServer && SRV.ws) {
      // the match runs on the game server; this computer just sends buttons and shows the snapshots
      const cfg = {
        stage: G.cfg.stage, stocks: G.cfg.stocks, time: G.cfg.time, teams: G.cfg.teams,
        slots: G.cfg.slots.map(s => s.type === 'you' ? { type: 'remote', peer: RELAY.id, char: s.char, team: s.team, name: s.name, tag: s.tag }
          : s.type === 'peer' ? { type: 'remote', peer: s.peer, char: s.char, team: s.team, name: s.name, tag: s.tag }
          : s.type === 'cpu' ? { type: 'cpu', char: s.char, lvl: s.lvl, team: s.team } : { type: 'off' })
      };
      G.remote = true; G.game = null; resetSnaps();
      pushLobby();
      try { SRV.ws.send(JSON.stringify({ cmd: 'start', gid: NET.gid, cfg })); } catch (e) { }
    } else presence({ nick: NET.nick, lb: encodeLb(), gs: encodeState(G.game) });
  }
  enterFight();
}

function enterFight() {
  IN.mode = 0;
  show('fight');
  const stg = (G.mode === 'guest' || G.remote) ? (STAGES[NET.lb && NET.lb.st] || STAGES[0]) : (G.game ? G.game.stage : STAGES[0]);
  musicPlay(stg.id);
  HINTS.shown = false; updateHintsVisibility();
  const solo = G.mode === 'solo' || G.mode === 'boss';
  document.getElementById('pause-btn').textContent = solo ? 'Pause' : 'Menu';
  document.getElementById('p-resume').textContent = solo ? 'Resume' : 'Keep fighting';
  document.getElementById('p-setup').hidden = G.mode === 'guest';
  document.getElementById('p-quit').textContent = G.mode === 'solo' ? 'Quit to main menu' : G.mode === 'host' ? 'End battle for everyone' : G.mode === 'boss' ? 'Give up' : 'Leave lobby';
  if (G.mode === 'boss') document.getElementById('p-setup').hidden = true;
}

function tickGame() {
  const g = G.game;
  const local = pollLocal();
  const inputs = g.fighters.map(f => {
    if (f.ctrl.type === 'local') return local;
    if (f.ctrl.type === 'cpu') return aiThink(f, g);
    if (f.ctrl.type === 'remote') return remoteInput(f);
    return null;
  });
  if (G.training && typeof trainingTick === 'function') trainingTick(g, inputs);
  const before = g.fighters.map(f => f.dmg);
  stepGame(g, inputs);
  g.fighters.forEach((f, i) => { if (f.dmg > before[i] + 0.5) f.lastBump = G.t; });
  g.events.forEach(e => { if (e[0] > g.seen) { g.seen = e[0]; handleEvent(e, false); } });
  if (G.mode === 'host' && g.frame % 2 === 0) presence({ gs: encodeState(g) });
  if (g.over && g.overT === 110) finishMatch();
}

function handleEvent(e, silent) {
  const view = (G.mode === 'guest' || G.remote) ? { fighters: NET.vf || [] } : (G.game || G.attract);
  fxEvent(e, slot => view && view.fighters.find(f => f.slot === slot));
  if (!silent) SFX.play(e[1], e[4]);
}

function finishMatch() {
  const rows = computeResults(G.game);
  if (G.mode === 'host') {
    NET.phase = 'res';
    NET.res = rows.map(r => [r.slot, r.place, r.kos, r.falls, r.win ? 1 : 0]);
    pushLobby();
  }
  showResults(rows, true);
}

function showResults(rows, canAct) {
  show('results');
  const win = rows.filter(r => r.win);
  const ban = document.getElementById('win-banner');
  let title = (G.game && G.game.timeUp) || (!G.game && NET.snap && NET.snap.tu) ? 'Time! It\u2019s a draw' : 'No contest';
  if (win.length) {
    if (SETUP.teams && win.length) title = `${TEAM_NAMES[win[0].team]} team wins!`;
    else title = `${win[0].tag || win[0].name} wins!`;
  }
  ban.textContent = title;
  ban.style.setProperty('--wc', win.length ? win[0].color : '#ffb547');
  const tb = document.getElementById('res-rows');
  tb.innerHTML = rows.map(r => `<tr style="--rc:${r.color}"><td class="pl">${r.place}</td><td><canvas class="res-cv" data-char="${esc(r.char)}" aria-hidden="true"></canvas></td><td><b>${esc(r.tag || r.name)}</b><span class="muted">${esc((CHAR[r.char] || {}).name || '')}</span></td><td class="num">${r.kos}</td><td class="num">${r.falls}</td></tr>`).join('');
  tb.querySelectorAll('.res-cv').forEach(c => requestAnimationFrame(() => drawPortrait(c, c.dataset.char)));
  const host = G.mode !== 'guest';
  document.getElementById('rematch').hidden = !host;
  document.getElementById('res-setup').hidden = !host;
  document.getElementById('res-wait').hidden = host;
  document.getElementById('res-menu').textContent = G.mode === 'solo' ? 'Main menu' : 'Leave lobby';
}

/* ---------- buttons ---------- */
function on(id, fn) { document.getElementById(id).addEventListener('click', e => { SFX.play('ui'); fn(e); }); }
on('go-training', () => { startTrainingSetup(); });
on('go-solo', () => { G.mode = 'solo'; G.training = false; SETUP.slots = defaultSlots('solo'); const c = loadLocal('cb.char'); if (isPickable(c, MY_UNLOCKED)) SETUP.slots[0].char = c; SETUP.edit = 0; SETUP.teams = false; showSetup(); });
on('go-online', () => showOnline());
on('go-controls', () => show('controls'));
document.querySelectorAll('.back-main').forEach(b => b.addEventListener('click', () => { SFX.play('ui'); if (G.mode !== 'solo' && NET.role) leaveOnline(); show('main'); }));
on('setup-back', () => { if (G.mode === 'solo') show('main'); else leaveOnline(); });
on('start', () => startMatch());
on('host-btn', () => { saveNick(); hostLobby(); });
document.getElementById('nick').addEventListener('change', saveNick);
document.getElementById('srv-url').addEventListener('change', e => {
  let v = e.target.value.trim();
  if (v && !/^(https?|wss?):\/\//i.test(v)) v = 'https://' + v;
  saveLocal('cb.server', v); e.target.value = v;
  document.getElementById('srv-box').dataset.touched = '1';
  renderOnline();
  if (v) testServer(v);
});
async function testServer(v) {
  const st = document.getElementById('srv-state');
  st.textContent = '· checking\u2026';
  try {
    const r = await fetch(v.replace(/^ws/i, 'http'), { cache: 'no-store' });
    const t = await r.text();
    st.textContent = /Cloudtop Brawl game server/.test(t) ? '· connected \u2713' : '· that address isn\u2019t a Cloudtop Brawl server';
  } catch (e) { st.textContent = '· couldn\u2019t reach it'; }
}
document.getElementById('join-form').addEventListener('submit', e => { e.preventDefault(); SFX.play('ui'); saveNick(); joinByCode(document.getElementById('join-code').value); });
document.getElementById('join-code').addEventListener('input', e => { const v = cleanCode(e.target.value); if (v !== e.target.value) e.target.value = v; });
on('code-copy', () => {
  const code = NET.code || '';
  const done = () => toast(`Copied ${code}`);
  try { navigator.clipboard.writeText(code).then(done, () => toast(`Your code is ${code}`)); } catch (e) { toast(`Your code is ${code}`); }
});
function saveNick() {
  const v = cleanNick(document.getElementById('nick').value) || NET.nick; NET.nick = v; document.getElementById('nick').value = v; saveLocal('cb.nick', v);
  // typing a different name keeps it; clearing it or typing your username goes back to following your account
  const acc = typeof ACCT !== 'undefined' && ACCT.profile && cleanNick(ACCT.profile.name);
  saveLocal('cb.nickCustom', acc && v !== acc ? '1' : '');
  presence({ nick: v });
}
/* signed-in players use their username as their player name (unless they typed a different one) */
function syncNickFromAccount() {
  const acc = typeof ACCT !== 'undefined' && ACCT.profile && cleanNick(ACCT.profile.name);
  if (!acc || loadLocal('cb.nickCustom') === '1' || NET.nick === acc) return;
  NET.nick = acc; saveLocal('cb.nick', acc);
  const el = document.getElementById('nick'); if (el) el.value = acc;
  try { presence({ nick: acc }); } catch (e) { }
}
/* the name shown on your fighter: your username when signed in */
function myName() { const acc = typeof ACCT !== 'undefined' && ACCT.profile && cleanNick(ACCT.profile.name); return acc || null; }

on('pause-btn', () => togglePause(true));
on('p-resume', () => togglePause(false));
on('p-setup', () => backToSetup());
on('p-quit', () => { if (G.mode === 'boss') { bossQuit(); return; } if (G.mode === 'solo') { G.game = null; show('main'); } else if (G.mode === 'host') backToSetup(); else leaveOnline(); });
on('rematch', () => startMatch());
on('res-setup', () => backToSetup());
on('res-menu', () => { G.game = null; if (G.mode === 'solo') show('main'); else leaveOnline(); });

function backToSetup() {
  G.game = null;
  if (G.mode === 'host' && G.remote && SRV.ws) { try { SRV.ws.send(JSON.stringify({ cmd: 'stop' })); } catch (e) { } }
  G.remote = false;
  if (G.mode === 'host') { NET.phase = 'lobby'; presence({ gs: null }); pushLobby(); }
  showSetup();
  if (G.mode === 'host' && NET.room) hostSync(NET.room.peers());
}
function togglePause(v, confirmed) {
  if (G.screen !== 'fight') return;
  if (G.mode === 'boss' && !confirmed) { bossPause(v); return; }
  document.getElementById('pause').hidden = !v;
  G.paused = v && (G.mode === 'solo' || G.mode === 'boss');
  IN.active = !v;
  if (v && G.mode === 'boss') { IN.keys.clear(); IN.touch = 0; IN.press = 0; IN.prev = 0; }
}
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Escape' && G.screen === 'fight') togglePause(document.getElementById('pause').hidden);
  if (e.code === 'KeyP' && G.screen === 'fight' && (G.mode === 'solo' || G.mode === 'boss')) togglePause(document.getElementById('pause').hidden);
});

/* ---------- attract-mode battle behind the menus ---------- */
function newAttract() {
  const ids = ROSTER.map(c => c.id).sort(() => Math.random() - 0.5);
  const cfg = { stage: Math.floor(Math.random() * STAGES.length), stocks: 99, teams: false, endless: true,
    slots: [0, 1, 2, 3].map(i => ({ type: 'cpu', char: ids[i % ids.length], lvl: 6, team: 0, ctrl: { type: 'cpu' }, name: 'CPU', tag: '' })) };
  G.attract = makeGame(cfg);
}

/* ---------- loop ---------- */
let lastT = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(100, now - lastT); lastT = now;
  if (typeof perfTick === 'function') perfTick(dt);
  const STEP = 1000 / 60;
  acc += dt;
  const fighting = G.screen === 'fight' || G.screen === 'results';
  if (G.game && G.mode !== 'guest' && !G.paused && fighting) {
    let n = 0; while (acc >= STEP && n < 5) { acc -= STEP; tickGame(); n++; }
    if (n >= 5) acc = 0;
  } else if (!fighting || (!G.game && G.mode !== 'guest' && !G.remote)) {
    if (!G.attract) newAttract();
    let n = 0; while (acc >= STEP && n < 3) { acc -= STEP; stepGame(G.attract, G.attract.fighters.map(f => aiThink(f, G.attract))); n++; G.attract.events.forEach(e => { if (e[0] > G.attract.seen) { G.attract.seen = e[0]; if (G.screen !== 'fight') fxEvent(e, s => G.attract.fighters.find(f => f.slot === s)); } }); }
    if (n >= 3) acc = 0;
  } else acc = 0;
  if ((G.mode === 'guest' || G.remote) && G.screen === 'fight') guestSendInput();
  G.t++;
  tickHints();
  draw();
}

function setUltReady(on) {
  if (G.ultReady === on) return;
  G.ultReady = on;
  const b = document.getElementById('ult-btn'); if (b) b.hidden = !on;
  const r = document.querySelector('#hints [data-h="ult"]'); if (r) r.classList.toggle('ready', on);
  if (on) toast(TOUCH.on ? 'Ultimate ready! Tap ULT' : 'Ultimate ready! Press Z');
}
function localSlotNow() {
  if (G.mode === 'guest') return SETUP.edit >= 0 ? SETUP.edit : null;
  if (G.remote) { const i = SETUP.slots.findIndex(s => s.type === 'you'); return i >= 0 ? i : null; }
  const f = G.game && G.game.fighters.find(x => x.ctrl && x.ctrl.type === 'local');
  return f ? f.slot : null;
}
function draw() {
  const dpr = Math.min(typeof PERF !== 'undefined' && PERF.low ? 1.25 : 2, window.devicePixelRatio || 1);
  const vw = cv.clientWidth, vh = cv.clientHeight;
  if (vw < 2 || vh < 2) return;
  if (cv.width !== Math.round(vw * dpr) || cv.height !== Math.round(vh * dpr)) { cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  let view = null, hud = false;
  if (G.screen === 'fight' || G.screen === 'results') {
    if (G.mode === 'guest' || G.remote) view = guestView();
    else if (G.game) view = { stage: G.game.stage, fighters: G.game.fighters, projs: G.game.projs, over: G.game.over, overT: G.game.overT, shake: G.game.shake, endless: !!G.game.cfg.endless, orb: G.game.orb, ult: G.game.ult, timeLeft: G.game.timeLeft, timeUp: G.game.timeUp };
    hud = G.screen === 'fight';
  }
  if (!view) {
    const a = G.attract; if (!a) return;
    view = { stage: a.stage, fighters: a.fighters, projs: a.projs, over: false, shake: a.shake * 0.5, endless: true };
  }
  const cut = !!(hud && view.ult && view.ult.t <= ULT_CUT && (!view.ult.ph || view.ult.ph === 'cut'));
  if (G.cutHide !== cut) { G.cutHide = cut; document.getElementById('hints').style.visibility = cut ? 'hidden' : ''; document.querySelector('.fight-top').style.visibility = cut ? 'hidden' : ''; }
  if (hud) {
    const ls = localSlotNow(), lf = ls != null && view.fighters.find(x => x.slot === ls);
    setUltReady(!!(lf && (lf.ult || lf.avalanche) && !lf.out && lf.carriedBy == null));
    const b = document.getElementById('ult-btn');
    if (b) {
      const carrying = lf?.avalanche?.captured != null;
      b.textContent = lf?.avalanche ? (carrying ? 'THROW' : 'END ROLL') : 'ULT';
      b.setAttribute('aria-label', lf?.avalanche ? (carrying ? 'Throw captured rival' : 'End Jungle Avalanche') : 'Ultimate');
    }
    if (lf?.c.id === 'titan') {
      const hint = document.querySelector('#hints-r [data-h="ult"] .h-name');
      if (hint) hint.textContent = lf.avalanche ? `${lf.avalanche.captured != null ? 'Throw' : 'End roll'} · ${bindLabel('left')}/${bindLabel('right')} steer` : lf.c.ultimate.name;
    }
  } else setUltReady(false);
  if (typeof tickLegend === 'function') tickLegend(view, hud);
  if (typeof tickFreezeRay === 'function') tickFreezeRay(view, hud);
  if (typeof tickTrainingHud === 'function') tickTrainingHud();
  renderScene(ctx, view, vw, vh, G.t, { hud, tags: hud, hudTop: hud && TOUCH.on, localSlot: hud ? localSlotNow() : null, touchHint: TOUCH.on, leftPad: 0 });   // the key hints now sit along the bottom, beside the damage cards
  if (!hud) { ctx.fillStyle = G.screen === 'main' ? 'rgba(10,8,26,.28)' : 'rgba(10,8,26,.62)'; ctx.fillRect(0, 0, vw, vh); }
}

/* ---------- boot ---------- */
{ const mc = document.getElementById('main-count'); if (mc) mc.textContent = ROSTER.length + ' fighters · ' + STAGES.length + ' stages · CPU levels 1–10'; }
setupTouch();
show('main');
initRoom();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { document.querySelectorAll('canvas[data-char]').forEach(c => drawPortrait(c, c.dataset.char)); });
requestAnimationFrame(frame);
