'use strict';
/* Private panels. The buttons only appear for the right accounts, but every action is checked again by the server:
   Owner panel  - the owner only (OWNER_EMAILS): every player, bug reports, and roles (Owner / OP / Collab / Player).
   Admin panel  - admins (the private TESTER_EMAILS setting) and the owner: the same player list and bug reports, and can
                  change any player's progress and fighters (never the owner's). Admins never see roles.
   OP           - a role the owner gives: changes only their OWN progress and fighters in Settings > Special. No Admin panel.
   Collab       - a label the owner gives; no powers. Player - everyone without OP (green badge). */
const ADMIN = { uid: null, mode: 'admin', tab: 'players', target: null, ptab: 'info', draft: null, players: [], playersLoaded: false,
  search: '', reports: [], cursor: null, loaded: false, busy: false, message: '', filter: 'all' };
const BUG = { busy: false, message: '', draft: null, context: null };
const ADMIN_ERRORS = {
  'not-admin': 'This account does not have access to this.', signin: 'Please sign in again.',
  expired: 'Your sign-in expired. Please sign out and back in.', 'bad-token': 'Please sign out and back in.',
  'not-found': 'No matching account or report was found.', conflict: 'This changed since you opened it. Reload before saving.',
  'owner-protected': 'The owner account keeps all fighters and levels, and has every role already.',
  invalid: 'Check the fields and enter a reason of at least 5 characters.', 'invalid-report': 'Add a title and a description of the bug.',
  'slow-down': 'Too many requests. Please wait a minute and try again.', 'verify-email': 'Verify your email before sending a report.',
  'not-op': 'Only OP accounts can change this.'
};
function adminError(e) { return ADMIN_ERRORS[e.message] || 'Could not reach the server. Please try again.'; }
function adminButton(text, fn, cls) { return el('button', { type: 'button', class: cls || 'mini', text, on: { click: fn } }); }
function adminField(label, input) { input.setAttribute('aria-label', label); return el('label', { class: 'ad-field' }, [el('span', { text: label }), input]); }
function adminSelect(options, value) {
  const select = el('select');
  options.forEach(([id, label]) => select.appendChild(el('option', { value: id, text: label })));
  select.value = String(value); return select;
}
function adminSection(id) {
  let screen = document.getElementById('scr-' + id);
  if (!screen) {
    screen = el('section', { id: 'scr-' + id, class: 'screen', hidden: '' });
    screen.addEventListener('keydown', e => { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) e.stopPropagation(); });
    document.getElementById('app').appendChild(screen);
  }
  return screen;
}
const isOwnerAcct = () => !!(acctSignedIn() && ACCT.profile && ACCT.profile.owner);
/* the Admin panel: the owner and the admin emails in the private Cloudflare setting (the server checks this again). The OP role does not open it. */
const isAdminAcct = () => !!(acctSignedIn() && ACCT.profile && (ACCT.profile.tester || ACCT.profile.owner));
function adminUpdate() {
  const signed = acctSignedIn() && ACCT.profile;
  const vis = (id, on) => { const b = document.getElementById(id); if (b) b.hidden = !on; };
  vis('go-tester', typeof isTesterAcct === 'function' && isTesterAcct());
  vis('go-admin', isAdminAcct()); vis('go-owner', isOwnerAcct());
  specialUpdate();
  const uid = signed && (isAdminAcct() || isOwnerAcct()) ? ACCT.user.uid + (isOwnerAcct() ? ':o' : ':a') : null;
  if (uid !== ADMIN.uid) {
    ADMIN.uid = uid; ADMIN.target = null; ADMIN.draft = null; ADMIN.players = []; ADMIN.playersLoaded = false;
    ADMIN.reports = []; ADMIN.cursor = null; ADMIN.loaded = false; ADMIN.busy = false; ADMIN.message = ''; BUG.draft = null;
    ['scr-admin'].forEach(id => { const s = document.getElementById(id); if (s) s.textContent = ''; });
    if (G.screen === 'admin') { if (uid && (ADMIN.mode === 'owner' ? isOwnerAcct() : isAdminAcct())) renderAdmin(); else show('main'); }
  }
}
async function adminApi(path, opts) {
  const uid = ADMIN.uid;
  if (!uid) throw new Error('not-admin');
  const result = await acctApi(path, opts);
  if (ADMIN.uid !== uid) throw new Error('signin');
  return result;
}
const adminPost = (path, data) => adminApi(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
function adminMessage(text) { ADMIN.message = text; const p = document.getElementById('ad-msg'); if (p) p.textContent = text; }

/* ---------- opening the panels ---------- */
function showAdmin() {
  adminUpdate(); if (!isAdminAcct()) { toast('Admin access is required.'); return; }
  if (typeof setTester === 'function') setTester(false);
  if (ADMIN.mode !== 'admin') { ADMIN.playersLoaded = false; ADMIN.players = []; }
  ADMIN.mode = 'admin'; ADMIN.tab = 'players'; ADMIN.target = null; ADMIN.draft = null; ADMIN.ptab = 'info'; ADMIN.message = '';
  adminSection('admin'); show('admin'); renderAdmin(); loadPlayers();
}
function showOwner() {
  adminUpdate(); if (!isOwnerAcct()) { toast('Only the owner can open this.'); return; }
  if (typeof setTester === 'function') setTester(false);
  if (ADMIN.mode !== 'owner') { ADMIN.playersLoaded = false; ADMIN.players = []; }
  ADMIN.mode = 'owner'; ADMIN.tab = 'players'; ADMIN.target = null; ADMIN.draft = null; ADMIN.ptab = 'info'; ADMIN.message = '';
  adminSection('admin'); show('admin'); renderAdmin(); loadPlayers();
}
function renderAdmin() {
  const screen = adminSection('admin'); screen.textContent = '';
  const owner = ADMIN.mode === 'owner';
  if (owner ? !isOwnerAcct() : !isAdminAcct()) { show('main'); return; }
  const wrap = el('div', { class: 'wrap ad-wrap' }); screen.appendChild(wrap);
  wrap.appendChild(el('header', { class: 'bar' }, [adminButton('← Back', () => show('main'), 'back'),
    el('h2', { text: owner ? 'Owner panel' : 'Admin panel' }), el('span', { class: 'ad-badge' + (owner ? ' ad-badge-owner' : ''), text: owner ? 'OWNER ONLY' : (isOwnerAcct() ? 'OWNER' : 'ADMIN') })]));
  wrap.appendChild(el('p', { class: 'muted', text: owner
    ? 'Every player, bug reports and roles. Only you can see this panel. Changes are saved and recorded in each account’s activity log.'
    : 'Every player and the bug reports. You can change players’ Boss Fight progress and fighters. Changes are saved and recorded in each account’s activity log.' }));
  const tabs = [['players', 'Players'], ['reports', 'Bug reports']];
  const bar = el('div', { class: 'ad-tabs', role: 'tablist', 'aria-label': owner ? 'Owner tools' : 'Admin tools' });
  tabs.forEach(([id, title]) => bar.appendChild(el('button', { type: 'button', id: 'ad-tab-' + id, role: 'tab', class: 'btn' + (ADMIN.tab === id ? ' sel' : ''),
    'aria-selected': String(ADMIN.tab === id), 'aria-controls': 'ad-pane', text: title, on: { click: () => {
      ADMIN.tab = id; ADMIN.message = '';
      if (id === 'players') { ADMIN.target = null; ADMIN.draft = null; }
      renderAdmin();
      if (id === 'reports' && !ADMIN.loaded) loadAdminReports(false);
      if (id === 'players' && !ADMIN.playersLoaded) loadPlayers();
    } } })));
  wrap.append(bar, el('p', { id: 'ad-msg', role: 'status', 'aria-live': 'polite', class: 'ad-message', text: ADMIN.message }));
  const pane = el('div', { id: 'ad-pane', role: 'tabpanel', 'aria-labelledby': 'ad-tab-' + ADMIN.tab }); wrap.appendChild(pane);
  if (ADMIN.tab === 'reports') renderAdminReports(pane);
  else if (ADMIN.target) renderPlayer(pane);
  else renderPlayerList(pane);
}

/* ---------- loading accounts ---------- */
function setTarget(t) {
  ADMIN.target = t;
  ADMIN.draft = t ? { beaten: t.profile.beaten, wins: t.profile.wins || 0, unlocked: new Set(t.profile.unlocked.filter(id => CHAR[id] && CHAR[id].locked)), reason: '' } : null;
}
async function openPlayer(uid, ptab) {
  if (ADMIN.busy) return; ADMIN.busy = true; adminMessage('Opening player…');
  try { setTarget(await adminApi('/api/admin/account?uid=' + encodeURIComponent(uid))); ADMIN.ptab = ptab || 'info'; ADMIN.tab = 'players'; ADMIN.message = ''; }
  catch (e) { ADMIN.message = adminError(e); }
  finally { ADMIN.busy = false; if (G.screen === 'admin') renderAdmin(); }
}
async function loadPlayers() {
  if (ADMIN.busy) return; ADMIN.busy = true; adminMessage('Loading players…');
  try { ADMIN.players = (await adminApi('/api/admin/players')).players; ADMIN.playersLoaded = true; ADMIN.message = ''; }
  catch (e) { ADMIN.message = adminError(e); }
  finally { ADMIN.busy = false; if (G.screen === 'admin') renderAdmin(); }
}

/* ---------- Owner panel: the player list ---------- */
/* roles are shown in the Owner panel only (admins never see them). Anyone without OP is a Player (green). */
function roleBadges(x) {
  if (ADMIN.mode !== 'owner') return [];
  const out = [], roles = x.roles || {};
  if (x.owner) out.push(el('span', { class: 'ad-role ad-role-owner', text: 'OWNER' }));
  if (roles.op) out.push(el('span', { class: 'ad-role ad-role-op', text: 'OP' }));
  if (roles.collab) out.push(el('span', { class: 'ad-role ad-role-collab', text: 'COLLAB' }));
  if (!x.owner && !roles.op) out.push(el('span', { class: 'ad-role ad-role-player', text: 'PLAYER' }));
  return out;
}
const onlineDot = on => el('span', { class: 'ad-dot' + (on ? ' on' : ''), text: on ? 'Online' : 'Offline' });
function seenText(t) {
  if (!t) return 'Not seen since this update';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'Seen just now' : m < 60 ? 'Seen ' + m + ' min ago' : m < 1440 ? 'Seen ' + Math.round(m / 60) + ' h ago' : 'Seen ' + Math.round(m / 1440) + ' days ago';
}
function renderPlayerList(pane) {
  const list = ADMIN.players, online = list.filter(x => x.online).length;
  const search = el('input', { type: 'search', placeholder: 'Search username or email', autocomplete: 'off', spellcheck: 'false', value: ADMIN.search });
  const refresh = adminButton('↻ Refresh', loadPlayers, 'btn ad-ghost'); refresh.disabled = ADMIN.busy;
  pane.appendChild(el('div', { class: 'card ad-card' }, [
    el('div', { class: 'ad-list-head' }, [el('div', {}, [el('h3', { text: 'Players' }),
      el('p', { class: 'ad-stats', text: ADMIN.playersLoaded ? list.length + ' players · ' + online + ' online now' : 'Loading…' })]), refresh]),
    adminField('Search', search)]));
  const box = el('div', { class: 'ad-plist', role: 'list' }); pane.appendChild(box);
  const draw = () => {
    box.textContent = '';
    const q = search.value.trim().toLowerCase(); ADMIN.search = search.value;
    const rows = list.filter(x => !q || (x.name || '').toLowerCase().includes(q) || (x.email || '').toLowerCase().includes(q));
    if (ADMIN.playersLoaded && !rows.length) box.appendChild(el('p', { class: 'muted', text: q ? 'No players match that search.' : 'No players yet.' }));
    rows.forEach(x => {
      const row = el('button', { type: 'button', class: 'ad-prow', role: 'listitem', 'aria-label': 'Open ' + (x.name || x.uid), on: { click: () => openPlayer(x.uid, 'info') } }, [
        onlineDot(x.online),
        el('span', { class: 'ad-pname' }, [el('b', { text: x.name || '(no username)' }), ...roleBadges(x)]),
        el('span', { class: 'ad-pemail', text: x.email || 'Email shows after their next sign-in' }),
        el('span', { class: 'ad-pseen', text: x.online ? 'Playing now' : seenText(x.seen) }),
        el('span', { class: 'ad-chev', 'aria-hidden': 'true', text: '›' })]);
      box.appendChild(row);
    });
  };
  search.addEventListener('input', draw); draw();
}

/* ---------- one account: Info / Boss Fight / Characters ---------- */
function renderPlayer(pane) {
  const t = ADMIN.target, p = t.profile, owner = ADMIN.mode === 'owner', d = ADMIN.draft;
  const canEdit = !p.owner;
  const head = el('div', { class: 'card ad-card' }); pane.appendChild(head);
  const reload = adminButton('↻ Reload', () => openPlayer(t.uid, ADMIN.ptab), 'btn ad-ghost');
  const left = [];
  left.push(adminButton('← All players', () => { ADMIN.target = null; ADMIN.draft = null; ADMIN.message = ''; renderAdmin(); if (!ADMIN.playersLoaded) loadPlayers(); }, 'mini ad-backlink'));
  left.push(el('h3', {}, [el('span', { text: p.name || 'Player' }), ...roleBadges({ owner: p.owner, roles: p.roles })]));
  if (t.info) left.push(onlineDot(t.info.online));
  head.appendChild(el('div', { class: 'ad-player-head' }, [el('div', {}, left), reload]));
  const sub = el('div', { class: 'ad-subtabs', role: 'tablist', 'aria-label': 'Player sections' });
  [['info', 'Info'], ['boss', 'Boss Fight'], ['chars', 'Characters']].forEach(([id, title]) => sub.appendChild(el('button', { type: 'button', role: 'tab',
    class: 'ad-subtab' + (ADMIN.ptab === id ? ' sel' : ''), 'aria-selected': String(ADMIN.ptab === id), text: title,
    on: { click: () => { ADMIN.ptab = id; ADMIN.message = ''; renderAdmin(); } } })));
  head.appendChild(sub);
  const body = el('div', { class: 'ad-subpane' }); head.appendChild(body);
  if (ADMIN.ptab === 'info') renderPlayerInfo(body, t, owner);
  else if (ADMIN.ptab === 'boss') renderPlayerBoss(body, d, canEdit);
  else renderPlayerChars(body, d, canEdit);
  if (ADMIN.ptab !== 'info') {
    if (!canEdit) body.appendChild(el('p', { class: 'ad-message', text: 'This is the owner’s account: every fighter and level is always unlocked, and it can’t be changed here.' }));
    else renderSaveBar(body, t, d);
  }
}
function infoRow(label, value, cls) { return el('div', { class: 'ad-info-row' }, [el('span', { text: label }), el('b', { class: cls || '', text: value })]); }
function renderPlayerInfo(body, t, owner) {
  const p = t.profile, info = t.info || {};
  const grid = el('div', { class: 'ad-info' }); body.appendChild(grid);
  grid.append(infoRow('Username', p.name || '(none yet)'), infoRow('UID', t.uid, 'ad-uid'));
  if (t.info) grid.append(infoRow('Email', info.email || 'Shows after their next sign-in'),
    infoRow('Status', info.online ? 'Online now' : 'Offline · ' + seenText(info.seen)),
    infoRow('Joined', info.joined ? new Date(info.joined).toLocaleDateString() : '—'));
  grid.append(infoRow('Boss Fight', 'Level ' + p.beaten + ' of ' + BOSS_LEVELS.length + ' · ' + (p.wins || 0) + ' boss wins'),
    infoRow('Fighters', (ROSTER.filter(c => !c.hidden && (!c.locked || p.unlocked.includes(c.id))).length) + ' of ' + ROSTER.filter(c => !c.hidden).length + ' unlocked'));
  if (owner && !p.owner) renderRoles(body, t);
  const history = el('div', { class: 'ad-history-box' }, [el('h4', { class: 'ad-sec', text: 'Activity · last 20 changes' })]); body.appendChild(history);
  if (!t.history.length) history.appendChild(el('p', { class: 'muted', text: 'No changes yet.' }));
  t.history.forEach(event => history.appendChild(el('article', { class: 'ad-history' }, [
    el('strong', { text: event.reason }), el('p', { text: new Date(event.at).toLocaleString() + ' · ' + ((event.actor && (event.actor.name || event.actor.uid)) || '') }),
    el('p', { text: 'Levels ' + event.before.beaten + ' → ' + event.after.beaten + ' · Wins ' + event.before.wins + ' → ' + event.after.wins }),
    el('p', { text: 'Fighters: ' + (event.before.unlocked.join(', ') || 'none') + ' → ' + (event.after.unlocked.join(', ') || 'none') })
  ])));
}
function renderRoles(body, t) {
  const r = t.profile.roles || {};
  const box = el('div', { class: 'ad-roles' }); body.appendChild(box);
  box.appendChild(el('h4', { class: 'ad-sec', text: 'Roles' }));
  const mk = (key, title, text) => {
    const input = el('input', { type: 'checkbox' }); input.checked = !!r[key];
    box.appendChild(el('label', { class: 'ad-role-row' }, [el('span', {}, [el('b', { text: title }), el('small', { text })]), input]));
    return input;
  };
  const op = mk('op', 'OP', 'Can change their OWN Boss Fight level, wins and fighters in Settings > Special. No Admin panel.');
  const collab = mk('collab', 'Collab', 'A label that shows they work on the game with you. Gives no powers.');
  box.appendChild(el('p', { class: 'muted', text: 'Roles only work inside the game. They never give access to Cloudflare, Firebase or GitHub.' }));
  const save = adminButton('Save roles', async () => {
    if (ADMIN.busy) return;
    if (!(await gameConfirm('Set roles for ' + (t.profile.name || t.uid) + '?\nOP: ' + (op.checked ? 'yes' : 'no') + '\nCollab: ' + (collab.checked ? 'yes' : 'no'), 'Yes, save roles'))) return;
    ADMIN.busy = true; save.disabled = true; adminMessage('Saving roles…');
    try {
      await adminPost('/api/admin/roles', { uid: t.uid, op: op.checked, collab: collab.checked });
      ADMIN.busy = false; ADMIN.playersLoaded = false; await openPlayer(t.uid, 'info'); adminMessage('Roles saved.');
    } catch (e) { adminMessage(adminError(e)); }
    finally { ADMIN.busy = false; save.disabled = false; }
  }, 'btn');
  box.appendChild(el('div', { class: 'ad-actions' }, [save]));
}
function renderPlayerBoss(body, d, canEdit) {
  const total = BOSS_LEVELS.length;
  body.appendChild(el('div', { class: 'ad-progress' }, [el('div', { class: 'ad-progress-fill', style: 'width:' + Math.round(d.beaten / total * 100) + '%' }),
    el('span', { text: 'Cleared ' + d.beaten + ' of ' + total + ' levels' })]));
  const beaten = el('input', { type: 'number', min: '0', max: String(total), step: '1', required: '', value: d.beaten });
  const wins = el('input', { type: 'number', min: '0', max: '1000000', step: '1', required: '', value: d.wins });
  if (!canEdit) { beaten.disabled = true; wins.disabled = true; }
  const sync = () => { d.beaten = Math.max(0, Math.min(total, +beaten.value | 0)); d.wins = Math.max(0, +wins.value | 0); };
  beaten.addEventListener('change', () => { sync(); renderAdmin(); }); wins.addEventListener('input', sync);
  body.appendChild(el('div', { class: 'ad-row' }, [adminField('Levels cleared', beaten), adminField('Boss wins', wins)]));
  if (canEdit) body.appendChild(el('div', { class: 'ad-actions' }, [adminButton('Reset progress to 0', () => { d.beaten = 0; d.wins = 0; renderAdmin(); }),
    adminButton('Clear all ' + total + ' levels', () => { d.beaten = total; renderAdmin(); })]));
  const earned = bossUnlocksFor(d.beaten).map(id => CHAR[id] && CHAR[id].name).filter(Boolean);
  body.appendChild(el('p', { class: 'muted', text: earned.length ? 'Boss fighters earned by this progress: ' + earned.join(', ') + '.' : 'No boss fighters earned yet at this progress.' }));
}
function renderPlayerChars(body, d, canEdit) {
  const earned = new Set(bossUnlocksFor(d.beaten));
  const list = ROSTER.filter(c => !c.hidden);
  const owned = c => !c.locked || d.unlocked.has(c.id) || earned.has(c.id);
  body.appendChild(el('p', { class: 'ad-stats', text: list.filter(owned).length + ' of ' + list.length + ' fighters unlocked' }));
  if (canEdit) body.appendChild(el('p', { class: 'muted', text: 'Tap a locked fighter to give it. Tap again to take it back. Normal fighters are always unlocked.' }));
  const grid = el('div', { class: 'ad-chars' }); body.appendChild(grid);
  list.forEach(c => {
    const have = owned(c), toggle = canEdit && c.locked && !earned.has(c.id);
    const tile = el(toggle ? 'button' : 'div', { class: 'tile ad-char' + (have ? '' : ' locked') + (toggle ? ' can' : ''),
      'aria-label': c.name + (have ? ', unlocked' : ', locked') + (earned.has(c.id) ? ' (earned in Boss Fight)' : '') });
    if (toggle) { tile.type = 'button'; tile.setAttribute('aria-pressed', String(have)); tile.addEventListener('click', () => {
      if (d.unlocked.has(c.id)) d.unlocked.delete(c.id); else d.unlocked.add(c.id); SFX.play('ui'); renderAdmin(); }); }
    const cv = el('canvas', { class: 'tile-cv', 'aria-hidden': 'true' });
    tile.append(cv, el('span', { class: 'tile-name', text: c.name }));
    if (!have) tile.appendChild(el('span', { class: 'ad-lock', 'aria-hidden': 'true', text: '🔒' }));
    else if (c.locked) tile.appendChild(el('span', { class: 'ad-char-tag', text: earned.has(c.id) ? 'Earned' : 'Given' }));
    grid.appendChild(tile);
    requestAnimationFrame(() => drawPortrait(cv, c.id));
  });
  if (canEdit) body.appendChild(el('div', { class: 'ad-actions' }, [
    adminButton('Give every locked fighter', () => { ROSTER.filter(c => c.locked && !c.hidden).forEach(c => d.unlocked.add(c.id)); renderAdmin(); }),
    adminButton('Take back given fighters', () => { d.unlocked.clear(); renderAdmin(); })]));
}
function renderSaveBar(body, t, d) {
  const p = t.profile;
  const before = new Set(p.unlocked.filter(id => CHAR[id] && CHAR[id].locked));
  const changed = d.beaten !== p.beaten || d.wins !== (p.wins || 0) || d.unlocked.size !== before.size || [...d.unlocked].some(id => !before.has(id));
  const form = el('form', { class: 'ad-savebar' + (changed ? ' on' : '') });
  const reason = el('input', { required: '', minlength: '5', maxlength: '200', placeholder: 'Why are you changing this account?', value: d.reason });
  reason.addEventListener('input', () => { d.reason = reason.value; });
  const save = el('button', { type: 'submit', class: 'btn start', text: 'Save changes' }); save.disabled = !changed;
  form.append(el('p', { class: 'ad-sec', text: changed ? 'Unsaved changes' : 'No changes yet' }), adminField('Reason (saved in activity log)', reason), save);
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (ADMIN.busy || ADMIN.target !== t) return;
    const unlocked = [...d.unlocked];
    if (!(await gameConfirm('Save changes for ' + (p.name || t.uid) + '?\nLevels cleared: ' + p.beaten + ' → ' + d.beaten + '\nBoss wins: ' + (p.wins || 0) + ' → ' + d.wins +
      '\nGiven fighters: ' + (unlocked.map(id => CHAR[id].name).join(', ') || 'none') + '\nReason: ' + reason.value.trim()))) return;
    if (ADMIN.busy || ADMIN.target !== t) return;
    ADMIN.busy = true; save.disabled = true; adminMessage('Saving changes…');
    try {
      await adminPost('/api/admin/account', { uid: t.uid, revision: p.revision || 0, beaten: d.beaten, wins: d.wins, unlocked, reason: reason.value.trim() });
      if (ACCT.user.uid === t.uid) await acctChanged();
      const tab = ADMIN.ptab; ADMIN.busy = false;
      setTarget(await adminApi('/api/admin/account?uid=' + encodeURIComponent(t.uid))); ADMIN.ptab = tab;
      ADMIN.message = 'Changes saved and recorded in the activity log.'; renderAdmin();
    } catch (err) { adminMessage(adminError(err)); }
    finally { ADMIN.busy = false; save.disabled = false; }
  });
  body.appendChild(form);
}

/* ---------- Owner panel: bug reports ---------- */
async function loadAdminReports(more) {
  if (ADMIN.busy) return;
  ADMIN.busy = true; adminMessage('Loading reports…');
  try {
    const page = await adminApi('/api/admin/reports' + (more && ADMIN.cursor ? '?cursor=' + encodeURIComponent(ADMIN.cursor) : ''));
    ADMIN.reports = more ? ADMIN.reports.concat(page.reports) : page.reports; ADMIN.cursor = page.cursor; ADMIN.loaded = true;
    ADMIN.busy = false; ADMIN.message = ''; if (G.screen === 'admin') renderAdmin();
  } catch (e) { adminMessage(adminError(e)); }
  finally { ADMIN.busy = false; }
}
function renderAdminReports(pane) {
  const statusOptions = [['open', 'Open'], ['investigating', 'Investigating'], ['resolved', 'Resolved'], ['closed', 'Closed']];
  const filter = adminSelect([['all', 'All statuses'], ...statusOptions], ADMIN.filter);
  filter.addEventListener('change', () => { ADMIN.filter = filter.value; renderAdmin(); });
  const refresh = adminButton('Refresh inbox', () => loadAdminReports(false), 'btn'); refresh.disabled = ADMIN.busy;
  pane.appendChild(el('div', { class: 'ad-row' }, [adminField('Filter loaded reports', filter), refresh]));
  const reports = ADMIN.reports.filter(r => ADMIN.filter === 'all' || r.status === ADMIN.filter);
  pane.appendChild(el('p', { class: 'muted', text: ADMIN.loaded ? reports.length + ' matching reports · ' + ADMIN.reports.length + ' loaded' : 'Open Refresh inbox to load reports.' }));
  reports.forEach(report => {
    const card = el('article', { class: 'card ad-card ad-report' }); pane.appendChild(card);
    const bin = adminButton('🗑', async () => {
      if (ADMIN.busy) return;
      if (!(await gameConfirm('Delete the report “' + report.title + '”?\nThis can’t be undone.', 'Yes, delete it'))) return;
      ADMIN.busy = true; bin.disabled = true; adminMessage('Deleting report…');
      try {
        await adminPost('/api/admin/reports/delete', { id: report.id });
        ADMIN.reports = ADMIN.reports.filter(r => r.id !== report.id);
        ADMIN.busy = false; ADMIN.message = 'Report deleted.'; renderAdmin();
      } catch (e) { adminMessage(adminError(e)); }
      finally { ADMIN.busy = false; bin.disabled = false; }
    }, 'ad-bin');
    bin.setAttribute('aria-label', 'Delete this report'); bin.title = 'Delete this report';
    card.append(bin, el('span', { class: 'ad-badge', text: report.severity.toUpperCase() + ' · ' + report.status.toUpperCase() }),
      el('h3', { text: report.title }), el('p', { class: 'muted', text: (report.username || 'Player') + ' · ' + report.category + ' · ' + new Date(report.created).toLocaleString() }),
      el('p', { class: 'ad-text', text: report.details }));
    if (report.steps) card.append(el('h4', { text: 'Steps to reproduce' }), el('p', { class: 'ad-text', text: report.steps }));
    card.appendChild(el('p', { class: 'muted ad-text', text: 'Screen: ' + report.context.screen + ' · Mode: ' + report.context.mode + ' · Level: ' + report.context.level + '\n' + report.context.browser }));
    const status = adminSelect(statusOptions, report.status);
    const notes = el('textarea', { rows: '3', maxlength: '1000', placeholder: 'Notes (only you can see these)' }); notes.value = report.notes || '';
    const save = adminButton('Save report status', async () => {
      if (ADMIN.busy) return;
      ADMIN.busy = true; save.disabled = true; adminMessage('Saving report…');
      try {
        const updated = await adminPost('/api/admin/reports', { id: report.id, expectedUpdated: report.updated, status: status.value, notes: notes.value });
        ADMIN.reports = ADMIN.reports.map(r => r.id === updated.id ? updated : r);
        ADMIN.busy = false; ADMIN.message = 'Report updated.'; renderAdmin();
      } catch (e) { adminMessage(adminError(e)); }
      finally { ADMIN.busy = false; save.disabled = false; }
    }, 'btn');
    card.append(adminField('Status', status), adminField('Notes', notes), el('div', { class: 'ad-actions' }, [save,
      adminButton('Open reporter account', () => openPlayer(report.uid, 'info'), 'btn ad-ghost')]));
    if (report.updatedBy) card.appendChild(el('p', { class: 'muted', text: 'Last updated by ' + (report.updatedBy.name || report.updatedBy.uid) + ' · ' + new Date(report.updated).toLocaleString() }));
  });
  if (ADMIN.cursor) { const more = adminButton('Load older reports', () => loadAdminReports(true), 'btn'); more.disabled = ADMIN.busy; pane.appendChild(more); }
}
function showBugReport() {
  BUG.message = '';
  BUG.context = { screen: G.screen, mode: G.mode, level: G.mode === 'boss' || G.screen === 'boss' ? BOSS.sel : 0, browser: navigator.userAgent };
  adminSection('bug-report'); show('bug-report'); renderBugReport();
}
function renderBugReport() {
  const screen = adminSection('bug-report'); screen.textContent = '';
  const wrap = el('div', { class: 'wrap ad-wrap' }, [el('header', { class: 'bar' }, [adminButton('← Back', () => show('main'), 'back'), el('h2', { text: 'Report a bug' })])]);
  screen.appendChild(wrap);
  if (!acctSignedIn()) { wrap.append(el('p', { text: 'Sign in with a verified account to send a report.' }), adminButton('Sign in', showLogin, 'btn')); return; }
  const card = el('form', { class: 'card ad-card' }); wrap.appendChild(card);
  card.appendChild(el('p', { class: 'muted', text: 'Tell us what happened. Your report goes privately to the game owner. Do not include passwords or other sensitive information.' }));
  const title = el('input', { required: '', minlength: '5', maxlength: '100', placeholder: 'Short description of the problem' });
  const details = el('textarea', { required: '', minlength: '10', maxlength: '3000', rows: '5', placeholder: 'What happened? What did you expect?' });
  const steps = el('textarea', { maxlength: '2000', rows: '4', placeholder: 'Which fighter, level, and actions reproduce it?' });
  const category = adminSelect([['gameplay', 'Gameplay'], ['account', 'Account / progress'], ['connection', 'Connection / online'], ['other', 'Other']], 'gameplay');
  const severity = adminSelect([['low', 'Minor'], ['medium', 'Affects gameplay'], ['high', 'Cannot play']], 'medium');
  if (BUG.draft) { title.value = BUG.draft.title; details.value = BUG.draft.details; steps.value = BUG.draft.steps; category.value = BUG.draft.category; severity.value = BUG.draft.severity; }
  card.append(adminField('Title', title), el('div', { class: 'ad-row' }, [adminField('Category', category), adminField('Impact', severity)]),
    adminField('Description', details), adminField('Steps to reproduce (optional)', steps));
  const message = el('p', { role: 'status', 'aria-live': 'polite', class: 'ad-message', text: BUG.message });
  const send = el('button', { type: 'submit', class: 'btn start', text: BUG.busy ? 'Sending…' : 'Send bug report' }); send.disabled = BUG.busy;
  card.append(message, send);
  card.addEventListener('submit', async e => {
    e.preventDefault(); if (BUG.busy) return;
    const uid = ACCT.user && ACCT.user.uid;
    BUG.draft = { title: title.value.trim(), details: details.value.trim(), steps: steps.value.trim(), category: category.value, severity: severity.value };
    BUG.busy = true; send.disabled = true; message.textContent = 'Sending…';
    try {
      await acctApi('/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...BUG.draft, context: BUG.context }) });
      if (!ACCT.user || ACCT.user.uid !== uid) return;
      BUG.draft = null; BUG.message = 'Report received. Thank you! The game owner can now review it.'; card.reset(); message.textContent = BUG.message;
    } catch (err) { if (ACCT.user && ACCT.user.uid === uid) { BUG.message = adminError(err); message.textContent = BUG.message; } }
    finally { BUG.busy = false; send.disabled = false; }
  });
}
/* ---------- Settings > Special (OP role): change your OWN Boss Fight level, wins and fighters ---------- */
const SPECIAL = { uid: null, draft: null, busy: false, message: '' };
const isOpRole = () => !!(acctSignedIn() && ACCT.profile && ACCT.profile.op);
function specialUpdate() {
  const tab = document.querySelector('#settings .set-tab[data-tab="special"]');
  if (tab) tab.hidden = !isOpRole();
  const uid = isOpRole() ? ACCT.user.uid : null;
  if (uid !== SPECIAL.uid) { SPECIAL.uid = uid; SPECIAL.draft = null; SPECIAL.message = ''; }
  if (!uid && typeof SETUI !== 'undefined' && SETUI.tab === 'special' && typeof setTab === 'function') setTab('account');
  else if (uid && typeof SETUI !== 'undefined' && SETUI.tab === 'special') renderSpecialPane();
}
function renderSpecialPane() {
  const box = document.getElementById('special-pane'); if (!box) return;
  box.textContent = '';
  if (!isOpRole()) { box.appendChild(el('p', { class: 'muted', text: 'This tab is for OP accounts.' })); return; }
  const p = ACCT.profile, total = BOSS_LEVELS.length;
  const mine = () => new Set((p.unlocked || []).filter(id => CHAR[id] && CHAR[id].locked && !bossUnlocksFor(p.beaten).includes(id)));
  if (!SPECIAL.draft) SPECIAL.draft = { beaten: p.beaten | 0, wins: p.wins | 0, unlocked: mine() };
  const d = SPECIAL.draft;
  box.appendChild(el('p', { class: 'muted set-note', text: 'You have the OP role, so you can change your own Boss Fight progress and fighters. Every change is saved in your account’s activity log.' }));
  const beaten = el('input', { type: 'number', min: '0', max: String(total), step: '1', value: d.beaten });
  const wins = el('input', { type: 'number', min: '0', max: '1000000', step: '1', value: d.wins });
  [beaten, wins].forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
  beaten.addEventListener('change', () => { d.beaten = Math.max(0, Math.min(total, +beaten.value | 0)); renderSpecialPane(); });
  wins.addEventListener('input', () => { d.wins = Math.max(0, Math.min(1000000, +wins.value | 0)); });
  box.appendChild(el('div', { class: 'ad-row' }, [adminField('Boss Fight levels cleared (of ' + total + ')', beaten), adminField('Boss wins', wins)]));
  const earned = new Set(bossUnlocksFor(d.beaten));
  const list = ROSTER.filter(c => c.locked && !c.hidden);
  box.appendChild(el('p', { class: 'ad-sec', text: 'Locked fighters · tap to unlock or lock' }));
  const grid = el('div', { class: 'ad-chars' }); box.appendChild(grid);
  list.forEach(c => {
    const won = earned.has(c.id), have = won || d.unlocked.has(c.id);
    const tile = el(won ? 'div' : 'button', { class: 'tile ad-char' + (have ? '' : ' locked') + (won ? '' : ' can'),
      'aria-label': c.name + (have ? ', unlocked' : ', locked') + (won ? ' (earned in Boss Fight)' : '') });
    if (!won) { tile.type = 'button'; tile.setAttribute('aria-pressed', String(have)); tile.addEventListener('click', () => {
      if (d.unlocked.has(c.id)) d.unlocked.delete(c.id); else d.unlocked.add(c.id); SFX.play('ui'); renderSpecialPane(); }); }
    const cv = el('canvas', { class: 'tile-cv', 'aria-hidden': 'true' });
    tile.append(cv, el('span', { class: 'tile-name', text: c.name }));
    if (!have) tile.appendChild(el('span', { class: 'ad-lock', 'aria-hidden': 'true', text: '🔒' }));
    else if (won) tile.appendChild(el('span', { class: 'ad-char-tag', text: 'Earned' }));
    grid.appendChild(tile);
    requestAnimationFrame(() => drawPortrait(cv, c.id));
  });
  const before = mine();
  const changed = d.beaten !== (p.beaten | 0) || d.wins !== (p.wins | 0) || d.unlocked.size !== before.size || [...d.unlocked].some(id => !before.has(id));
  const save = el('button', { type: 'button', class: 'btn start', text: 'Save changes' }); save.disabled = !changed || SPECIAL.busy;
  const undo = el('button', { type: 'button', class: 'mini', text: 'Undo changes' }); undo.disabled = !changed || SPECIAL.busy;
  const msg = el('p', { class: 'acct-msg', role: 'status', 'aria-live': 'polite', text: SPECIAL.message });
  undo.addEventListener('click', () => { SPECIAL.draft = null; SPECIAL.message = ''; renderSpecialPane(); });
  save.addEventListener('click', async () => {
    if (SPECIAL.busy) return;
    const uid = SPECIAL.uid; SPECIAL.busy = true; save.disabled = true; msg.textContent = 'Saving…';
    try {
      await acctApi('/api/op/self', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ beaten: d.beaten, wins: d.wins, unlocked: [...d.unlocked], revision: p.revision || 0 }) });
      if (SPECIAL.uid !== uid) return;
      SPECIAL.draft = null; SPECIAL.message = 'Saved.';
      await acctChanged();
    } catch (e) { SPECIAL.message = adminError(e); if (e.message === 'conflict') { SPECIAL.draft = null; await acctChanged(); } }
    finally { SPECIAL.busy = false; renderSpecialPane(); }
  });
  box.appendChild(el('div', { class: 'ad-actions' }, [save, undo]));
  box.appendChild(msg);
}
document.getElementById('go-admin').addEventListener('click', showAdmin);
document.getElementById('go-owner').addEventListener('click', showOwner);
document.getElementById('go-bug-report').addEventListener('click', showBugReport);
adminUpdate();
