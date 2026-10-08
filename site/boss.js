'use strict';
/* ===== CLOUDTOP BRAWL — Boss Fight =====
   30 levels in three chapters (Legend Yen, Master Chuang, Mythic Hsi). Beat a chapter to unlock its boss.
   The fight runs on the game server (like an online match), so the server decides who won
   and saves your progress to your account. Your browser only sends button presses. */

const BOSS = { pending: null, busy: false, result: null, pick: 'random', sel: 1, gid: 0 };

function bossScreen() {
  let s = document.getElementById('scr-boss');
  if (s) return s;
  s = el('section', { id: 'scr-boss', class: 'screen', hidden: '' });
  document.getElementById('app').appendChild(s);
  return s;
}
function showBoss() { bossScreen(); show('boss'); renderBoss(); }

function renderBoss() {
  const s = document.getElementById('scr-boss'); if (!s || G.screen !== 'boss') return;
  s.textContent = '';
  const back = el('button', { type: 'button', class: 'back', text: '← Back', on: { click: () => { SFX.play('ui'); BOSS.result = null; show('main'); } } });
  const outer = el('div', { class: 'wrap' }, [el('header', { class: 'bar' }, [back, el('h2', { text: 'Boss Fight' }), el('p', { class: 'sub', text: 'Three chapters, ten levels each. Beat a chapter to unlock its boss.' })])]);
  s.appendChild(outer);
  const wrap = el('div', { class: 'bs-wrap' });
  outer.appendChild(wrap);
  const panel = (kids, cls) => el('div', { class: 'card bs-panel ' + (cls || '') }, kids);

  const note = (t, btnText, fn) => wrap.appendChild(panel([el('p', { class: 'bs-note', text: t }), btnText ? el('button', { type: 'button', class: 'btn', text: btnText, on: { click: fn } }) : null]));
  if (window.claude && window.claude.use) { note('Boss Fight works on the game’s website, where you can sign in and keep your progress.'); return; }
  if (!acctEnabled()) { note('Boss Fight needs player accounts, which aren’t switched on yet.'); return; }
  if (!ACCT.ready) { note('Loading your account…'); acctLoad().then(renderBoss); return; }
  if (!acctSignedIn()) { note('Sign in to fight the boss and save your progress on any device.', 'Sign in', () => showLogin()); return; }
  if (!ACCT.profile) { note('Couldn’t load your progress. Check your connection.', 'Try again', () => acctChanged()); return; }

  const beaten = ACCT.profile.beaten | 0, total = BOSS_LEVELS.length;
  if (BOSS.sel > Math.min(total, beaten + 1)) BOSS.sel = Math.min(total, beaten + 1);
  if (BOSS.sel < 1) BOSS.sel = 1;
  const ch = bossChapter(BOSS.sel), bossName = CHAR[ch.boss].name;
  const has = id => MY_UNLOCKED.indexOf(id) >= 0;

  // result banner from the last fight
  if (BOSS.result) {
    const r = BOSS.result, rc = bossChapter(r.level);
    const txt = r.error ? 'The fight ended, but your result couldn’t be saved. Try again.'
      : r.win ? (r.level === rc.to && has(rc.boss) ? `${CHAR[rc.boss].name.toUpperCase()} UNLOCKED! He’s now in your fighter list.` : `LEVEL ${r.level} CLEARED!`)
      : `Defeated on level ${r.level}. Try again!`;
    wrap.appendChild(el('div', { class: 'bs-banner ' + (r.win ? 'win' : 'lose'), role: 'status', text: txt }));
  }

  // chapter tabs: one card per boss
  const chaps = el('div', { class: 'bs-chaps', role: 'tablist', 'aria-label': 'Chapters' });
  BOSS_CHAPTERS.forEach(c => {
    const open = beaten + 1 >= c.from, done = Math.max(0, Math.min(10, beaten - c.from + 1)), on = c === ch;
    const cv = el('canvas', { class: 'bs-chcv', 'aria-hidden': 'true' });
    const b = el('button', { type: 'button', role: 'tab', 'aria-selected': String(on), class: 'bs-chap' + (on ? ' sel' : '') + (open ? '' : ' locked'), 'data-id': c.boss,
      on: { click: () => { if (!open) { toast(`Beat level ${c.from - 1} to open ${c.title}.`); return; } SFX.play('ui'); BOSS.sel = Math.min(c.to, Math.max(c.from, beaten + 1)); renderBoss(); } } }, [
      cv,
      el('span', { class: 'bs-chtx' }, [
        el('small', { text: c.title + ' · Levels ' + c.from + '–' + c.to }),
        el('b', { text: open ? CHAR[c.boss].name : '???' }),
        el('small', { text: !open ? '🔒 Beat the chapter before' : has(c.boss) ? '✓ Unlocked' : `${done}/10 cleared` })
      ])
    ]);
    chaps.appendChild(b);
    if (open) requestAnimationFrame(() => drawPortrait(cv, c.boss));
  });
  wrap.appendChild(panel([el('div', { class: 'sc-eyebrow', text: 'Chapters' }), chaps], 'bs-top'));

  // the boss card
  const cleared = Math.max(0, Math.min(10, beaten - ch.from + 1)), got = has(ch.boss);
  const cv = el('canvas', { class: 'bs-cv', 'aria-hidden': 'true' });
  const prog = el('div', { class: 'bs-prog' }, [el('i', { style: `width:${cleared * 10}%` })]);
  wrap.appendChild(panel([
    el('div', { class: 'bs-boss' }, [cv, el('div', {}, [
      el('div', { class: 'sc-eyebrow', text: (got ? 'Unlocked · ' : 'Locked fighter · ') + ch.title }),
      el('h3', { class: 'sc-name', text: bossName }),
      el('p', { class: 'muted', text: got ? `You beat ${ch.title}. ${bossName} is yours in Solo and Online. Keep fighting for practice.` : `${ch.blurb} Beat levels ${ch.from}–${ch.to} to make him yours.` }),
      el('div', { class: 'bs-progrow' }, [prog, el('b', { text: `${cleared}/10` })])
    ])])
  ], 'bs-top'));
  requestAnimationFrame(() => drawPortrait(cv, ch.boss));

  // level ladder for this chapter
  const grid = el('div', { class: 'bs-grid', role: 'list' });
  for (let n = ch.from; n <= ch.to; n++) {
    const L = BOSS_LEVELS[n - 1], done = n <= beaten, open = n <= beaten + 1;
    const card = el('button', { type: 'button', role: 'listitem', class: 'bs-lv' + (done ? ' done' : '') + (open ? '' : ' locked') + (BOSS.sel === n ? ' sel' : ''), 'aria-pressed': String(BOSS.sel === n), on: { click: () => { if (!open) { toast(`Beat level ${n - 1} first.`); return; } SFX.play('ui'); BOSS.sel = n; renderBoss(); } } }, [
      el('span', { class: 'bs-n', text: open ? String(n) : '🔒' }),
      el('b', { text: L.name }),
      el('small', { text: `Boss lives ${L.stocks} · Skill ${L.cpu > 10 ? 'MAX' : L.cpu}${L.minions.length ? ` · ${L.minions.length} helper${L.minions.length > 1 ? 's' : ''}` : ''}` }),
      done ? el('span', { class: 'bs-tick', text: '✓' }) : null
    ]);
    grid.appendChild(card);
  }
  wrap.appendChild(panel([el('div', { class: 'sc-eyebrow', text: `${ch.title} levels` }), grid]));

  // fighter pick + start
  const L = BOSS_LEVELS[BOSS.sel - 1];
  // fighter picker in the game's own style: portrait tiles, like the main fighter select
  const opts = [...ROSTER.filter(c => isPickable(c.id, MY_UNLOCKED)), { id: 'random', name: 'Random' }];
  if (!opts.some(c => c.id === BOSS.pick)) BOSS.pick = 'random';
  const picker = el('div', { class: 'bs-chars', role: 'radiogroup', 'aria-label': 'Your fighter' });
  opts.forEach(c => {
    const on = c.id === BOSS.pick;
    const t = el('button', { type: 'button', role: 'radio', 'aria-checked': String(on), class: 'tile bs-ch' + (on ? ' sel' : ''), 'data-id': c.id, title: c.name }, [
      el('canvas', { class: 'tile-cv', 'aria-hidden': 'true' }), el('span', { class: 'tile-name', text: c.name })]);
    t.addEventListener('click', () => {
      SFX.play('ui'); BOSS.pick = c.id;
      picker.querySelectorAll('.bs-ch').forEach(b => { const me = b.dataset.id === c.id; b.classList.toggle('sel', me); b.setAttribute('aria-checked', String(me)); });
      const nm = document.getElementById('bs-pick-name'); if (nm) nm.textContent = c.name;
    });
    picker.appendChild(t);
  });
  requestAnimationFrame(() => picker.querySelectorAll('.bs-ch').forEach(b => drawPortrait(b.querySelector('canvas'), b.dataset.id)));
  const pickName = (opts.find(c => c.id === BOSS.pick) || { name: 'Random' }).name;
  const go = el('button', { type: 'button', class: 'btn start', text: BOSS.busy ? 'Connecting…' : `Fight level ${BOSS.sel}` });
  if (BOSS.busy) go.disabled = true;
  go.addEventListener('click', () => { SFX.play('ui'); bossStart(BOSS.sel, BOSS.pick); });
  wrap.appendChild(panel([
    el('div', { class: 'sc-eyebrow', text: `Level ${BOSS.sel}: ${L.name}` }),
    el('p', { class: 'muted', text: `You get ${BOSS_PLAYER_STOCKS} lives. ${bossName} has ${L.stocks} ${L.stocks > 1 ? 'lives' : 'life'}, hits ${Math.round(L.pow * 100)}% as hard${L.kb < 1 ? ` and is ${Math.round((1 - L.kb) * 100)}% harder to launch` : ''}${L.minions.length ? `, with ${L.minions.length} helper${L.minions.length > 1 ? 's' : ''}` : ''}. 6-minute time limit.` }),
    el('div', { class: 'bs-pick' }, [el('span', {}, [document.createTextNode('Your fighter: '), el('b', { id: 'bs-pick-name', text: pickName })]), picker]),
    go
  ], 'bs-go'));
}

/* ---------- starting a fight on the game server ---------- */
async function bossStart(level, char) {
  if (BOSS.busy) return;
  if (!acctSignedIn()) { showLogin(); return; }
  BOSS.busy = true; BOSS.result = null; renderBoss();
  try {
    closeRelay();
    RELAY.id = Math.random().toString(36).slice(2, 10);
    const roomId = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 16).padEnd(10, 'x');
    RELAY.code = roomId;
    RELAY.mine = { nick: (ACCT.profile && ACCT.profile.name) || 'Player', ib: 0, ic: IN.counters.slice() };
    NET.room = relayRoom; NET.me = RELAY.id;
    BOSS.pending = { level, char: isPickable(char, MY_UNLOCKED) ? char : 'random', at: Date.now() };
    await connectServer(roomId, 'boss');
    setTimeout(() => { if (BOSS.pending && BOSS.busy) { bossCleanup(); toast('The game server didn’t answer. Try again.'); } }, 12000);
  } catch (e) {
    bossCleanup(); toast('Couldn’t reach the game server. Check your internet and try again.');
  }
}
/* the server checked our sign-in: ask it to start the level */
function onAcctMsg(m) {
  if (m.acct && ACCT.profile) { ACCT.profile.beaten = m.acct.beaten; setUnlocked(m.acct.unlocked); }
  if (!BOSS.pending) return;
  if (m.err) {
    const why = { signin: 'Please sign in again.', locked: 'That level is still locked.', 'slow-down': 'Too many fights in a row. Wait a minute.', expired: 'Your sign-in expired. Please try again.', 'verify-email': 'Verify your email first.', 'accounts-off': 'Accounts aren’t switched on on the server yet.' }[m.err] || 'The server couldn’t start the fight.';
    bossCleanup(); toast(why);
    if (m.err === 'expired') acctToken(true);
    return;
  }
  if (m.acct && SRV.ws && SRV.ws.readyState === 1) {
    try { SRV.ws.send(JSON.stringify({ cmd: 'boss', level: BOSS.pending.level, char: BOSS.pending.char })); } catch (e) { }
  }
}
function onBossSrv(d) {
  if (d.boss && BOSS.pending) {
    const b = d.boss;
    BOSS.pending = null; BOSS.busy = false; BOSS.gid = b.gid;
    G.mode = 'boss'; G.game = null; G.remote = true;
    NET.useServer = true; NET.gid = b.gid; NET.role = null;
    NET.lb = { fm: b.fm, st: b.st, sk: b.sk, gid: b.gid, ph: 'fight', sv: 1 };
    SETUP.slots = [{ type: 'you', char: b.fm[0][1], lvl: 3, team: 0 }];
    SETUP.teams = true;
    resetSnaps(); FX.length = 0; CAM.init = false;
    enterFight();
    toast(`Level ${b.lvl}: ${BOSS_LEVELS[b.lvl - 1].name}. Good luck!`);
  }
  if (d.bossPause && d.bossPause.gid === BOSS.gid && G.mode === 'boss') {
    togglePause(d.bossPause.paused, true);
  }
  if (d.bossRes && d.bossRes.gid === BOSS.gid && G.mode === 'boss') {
    const r = d.bossRes;
    if (ACCT.profile && !r.error) { ACCT.profile.beaten = r.beaten; setUnlocked(r.unlocked); }
    if (r.win && r.level < BOSS_LEVELS.length) BOSS.sel = r.level + 1;
    BOSS.result = r;
    setTimeout(() => { bossCleanup(); showBoss(); if (r.win) SFX.play('orbget'); }, 600);
  }
}
function bossPause(paused) {
  if (!SRV.ws || SRV.ws.readyState !== 1) { onBossDrop(); return; }
  try {
    // Send neutral input before resuming so held buttons don't carry across the pause.
    if (!paused) presence({ ib: 0, ic: IN.counters.slice() });
    SRV.ws.send(JSON.stringify({ cmd: 'pause', gid: BOSS.gid, paused }));
  } catch (e) { onBossDrop(); }
}
function onBossDrop() {
  if (G.mode !== 'boss' && !BOSS.pending) return;
  bossCleanup(); toast('Lost the connection to the game server.');
  if (G.screen === 'fight') showBoss();
}
function bossQuit() { bossCleanup(); showBoss(); toast('You left the fight.'); }
function bossCleanup() {
  BOSS.pending = null; BOSS.busy = false;
  closeRelay(); NET.room = null; NET.lb = null; NET.vf = null;
  G.remote = false; G.game = null; G.paused = false;
  document.getElementById('pause').hidden = true;
  if (G.mode === 'boss') G.mode = 'solo';
  if (G.screen === 'boss') renderBoss();
}

document.getElementById('go-boss') && document.getElementById('go-boss').addEventListener('click', () => { SFX.play('ui'); BOSS.result = null; showBoss(); });
