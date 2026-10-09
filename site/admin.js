'use strict';
/* Private controls are enabled by /api/me; every privileged action is checked again by the server. */
const ADMIN = { uid: null, tab: 'accounts', target: null, reports: [], cursor: null, loaded: false, busy: false, message: '', filter: 'all' };
const TESTING = { level: 1, fighter: 'tseng' };
const BUG = { busy: false, message: '', draft: null, context: null };
const ADMIN_ERRORS = {
  'not-admin': 'This account does not have admin access.', signin: 'Please sign in again.',
  expired: 'Your sign-in expired. Please sign out and back in.', 'bad-token': 'Please sign out and back in.',
  'not-found': 'No matching account or report was found.', conflict: 'This changed since you opened it. Reload before saving.',
  'owner-protected': 'The creator account keeps all fighters and levels. Its progress cannot be edited.',
  invalid: 'Check the fields and enter a reason of at least 5 characters.', 'invalid-report': 'Add a title and a description of the bug.',
  'slow-down': 'Too many requests. Please wait a minute and try again.', 'verify-email': 'Verify your email before sending a report.'
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
function adminUpdate() {
  const uid = acctSignedIn() && ACCT.profile && ACCT.profile.tester ? ACCT.user.uid : null;
  ['go-admin', 'go-tester'].forEach(id => { const button = document.getElementById(id); if (button) button.hidden = !uid; });
  if (uid !== ADMIN.uid) {
    ADMIN.uid = uid; ADMIN.target = null; ADMIN.reports = []; ADMIN.cursor = null; ADMIN.loaded = false;
    ADMIN.busy = false; ADMIN.message = ''; BUG.draft = null;
    if (typeof setTester === 'function') setTester(false);
    ['admin', 'testing'].forEach(id => { const screen = document.getElementById('scr-' + id); if (screen) screen.textContent = ''; });
    if (G.screen === 'testing') { if (uid) renderTesting(); else show('main'); }
    if (G.screen === 'admin') { if (uid) renderAdmin(); else show('main'); }
  }
}
async function adminApi(path, opts) {
  const uid = ADMIN.uid;
  if (!uid || !isTesterAcct()) throw new Error('not-admin');
  const result = await acctApi(path, opts);
  if (ADMIN.uid !== uid || !isTesterAcct()) throw new Error('signin');
  return result;
}
const adminPost = (path, data) => adminApi(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
function showAdmin() {
  adminUpdate(); if (!ADMIN.uid) { toast('Admin access is required.'); return; }
  setTester(false); adminSection('admin'); show('admin'); renderAdmin();
}
function renderAdmin() {
  const screen = adminSection('admin'); screen.textContent = '';
  if (!isTesterAcct()) { show('main'); return; }
  const wrap = el('div', { class: 'wrap ad-wrap' }); screen.appendChild(wrap);
  wrap.appendChild(el('header', { class: 'bar' }, [adminButton('← Back', () => show('main'), 'back'),
    el('h2', { text: 'Admin panel' }), el('span', { class: 'ad-badge', text: 'PRIVATE ACCESS' })]));
  wrap.appendChild(el('p', { class: 'muted', text: 'Grant fighters and change saved account progress. Changes here are permanent and recorded in the activity log.' }));
  const tabs = el('div', { class: 'ad-tabs', role: 'tablist', 'aria-label': 'Admin tools' });
  [['accounts', 'Player accounts'], ['reports', 'Bug reports']].forEach(([id, title]) => {
    tabs.appendChild(el('button', { type: 'button', id: 'ad-tab-' + id, role: 'tab', class: 'btn' + (ADMIN.tab === id ? ' sel' : ''),
      'aria-selected': String(ADMIN.tab === id), 'aria-controls': 'ad-pane', text: title, on: { click: () => {
        ADMIN.tab = id; ADMIN.message = ''; renderAdmin(); if (id === 'reports' && !ADMIN.loaded) loadAdminReports(false);
      } } }));
  });
  wrap.append(tabs, el('p', { id: 'ad-msg', role: 'status', 'aria-live': 'polite', class: 'ad-message', text: ADMIN.message }));
  const pane = el('div', { id: 'ad-pane', role: 'tabpanel', 'aria-labelledby': 'ad-tab-' + ADMIN.tab }); wrap.appendChild(pane);
  if (ADMIN.tab === 'accounts') renderAdminAccount(pane);
  else renderAdminReports(pane);
}
function adminMessage(text) { ADMIN.message = text; const p = document.getElementById('ad-msg'); if (p) p.textContent = text; }
function showTesting() {
  adminUpdate(); if (!isTesterAcct()) { toast('Tester access is required.'); return; }
  setTester(false); adminSection('testing'); show('testing'); renderTesting();
}
function renderTesting() {
  const screen = adminSection('testing'); screen.textContent = '';
  if (!isTesterAcct()) { show('main'); return; }
  const pane = el('div', { class: 'wrap ad-wrap' }); screen.appendChild(pane);
  pane.appendChild(el('header', { class: 'bar' }, [adminButton('← Back', () => { setTester(false); show('main'); }, 'back'),
    el('h2', { text: 'Testing' }), el('span', { class: 'ad-badge', text: 'TEST RUNS · NOT SAVED' })]));
  renderTestingTools(pane);
}
function renderTestingTools(pane) {
  const card = el('div', { class: 'card ad-card' }); pane.appendChild(card);
  card.append(el('h3', { text: 'Jump straight into a boss fight' }), el('p', { class: 'muted', text: 'All levels and fighters are available here. Test results never change saved progress.' }));
  const level = adminSelect(BOSS_LEVELS.map((l, i) => [i + 1, 'Level ' + (i + 1) + ' · ' + l.name]), TESTING.level);
  const fighter = adminSelect(ROSTER.filter(c => !c.hidden).map(c => [c.id, c.name]), TESTING.fighter);
  level.addEventListener('change', () => { TESTING.level = +level.value; renderTesting(); });
  fighter.addEventListener('change', () => { TESTING.fighter = fighter.value; });
  card.appendChild(el('div', { class: 'ad-row' }, [adminField('Boss level', level), adminField('Your fighter', fighter)]));
  BOSS_CHAPTERS.forEach(ch => {
    const grid = el('div', { class: 'ad-levels' });
    for (let n = ch.from; n <= ch.to; n++) grid.appendChild(adminButton(String(n), () => { TESTING.level = n; renderTesting(); }, 'mini' + (TESTING.level === n ? ' sel' : '')));
    card.append(el('h4', { text: ch.title + ' · ' + CHAR[ch.boss].name }), grid);
  });
  const l = BOSS_LEVELS[TESTING.level - 1];
  card.append(el('p', { class: 'muted', text: l.name + ' · Boss lives: ' + l.stocks + ' · CPU: ' + l.cpu + ' · Helpers: ' + l.minions.length }),
    el('div', { class: 'ad-actions' }, [adminButton('Fight level ' + TESTING.level, () => {
      BOSS.sel = TESTING.level; BOSS.pick = TESTING.fighter; showTester(); bossStart(TESTING.level, TESTING.fighter);
    }, 'btn start'), adminButton('Browse all boss levels', () => { BOSS.sel = TESTING.level; showTester(); }, 'btn'),
    adminButton('Vs CPU · all fighters', testerSolo, 'btn'),
    adminButton('Training · all fighters', () => { setTester(true); startTrainingSetup(); }, 'btn')]));
}
function renderAdminAccount(pane) {
  const card = el('div', { class: 'card ad-card' }); pane.appendChild(card);
  const form = el('form', { class: 'ad-row' });
  const by = adminSelect([['username', 'Username'], ['uid', 'Firebase UID']], 'username');
  const query = el('input', { required: '', maxlength: '128', placeholder: 'Exact player username', autocomplete: 'off', spellcheck: 'false' });
  by.addEventListener('change', () => { query.placeholder = by.value === 'uid' ? 'Firebase account UID' : 'Exact player username'; });
  const find = el('button', { type: 'submit', class: 'btn', text: 'Find player' }); find.disabled = ADMIN.busy;
  form.append(adminField('Find by', by), adminField('Player', query), find);
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (ADMIN.busy) return;
    ADMIN.busy = true; find.disabled = true; adminMessage('Looking up player…');
    try {
      ADMIN.target = await adminApi('/api/admin/account?' + by.value + '=' + encodeURIComponent(query.value.trim()));
      ADMIN.busy = false; ADMIN.message = ''; renderAdmin();
    } catch (err) { ADMIN.target = null; adminMessage(adminError(err)); }
    finally { ADMIN.busy = false; find.disabled = false; }
  });
  const mine = adminButton('Manage my account', () => { by.value = 'uid'; query.value = ACCT.user.uid; form.requestSubmit(); }); mine.disabled = ADMIN.busy;
  card.append(el('h3', { text: 'Manage a player account' }), el('p', { class: 'muted', text: 'Unlocks and progress are saved to the selected player’s real account.' }), mine, form);
  const target = ADMIN.target; if (!target) return;
  const p = target.profile;
  card.append(el('h3', { text: p.name || 'Player' }), el('p', { class: 'ad-uid', text: 'UID: ' + target.uid }),
    el('p', { class: 'muted', text: 'Cleared ' + p.beaten + ' levels · ' + p.wins + ' boss wins' }));
  if (p.owner) card.appendChild(el('p', { class: 'ad-message', text: 'Creator account: all fighters and levels are preserved. Progress editing is disabled.' }));
  else {
    const edit = el('form');
    const beaten = el('input', { type: 'number', min: '0', max: String(BOSS_LEVELS.length), step: '1', required: '', value: p.beaten });
    const wins = el('input', { type: 'number', min: '0', max: '1000000', step: '1', required: '', value: p.wins || 0 });
    const reason = el('input', { required: '', minlength: '5', maxlength: '200', placeholder: 'Why are you changing this account?' });
    edit.appendChild(el('div', { class: 'ad-row' }, [adminField('Levels cleared', beaten), adminField('Boss wins', wins)]));
    const grants = el('div', { class: 'ad-grants' });
    ROSTER.filter(c => c.locked).forEach(c => {
      const check = el('input', { type: 'checkbox', value: c.id }); check.checked = p.unlocked.includes(c.id);
      grants.appendChild(el('label', {}, [check, el('span', { text: c.name })]));
    });
    edit.append(el('h4', { text: 'Fighter grants' }), grants, el('p', { class: 'muted', text: 'Normal fighters are always available. Bosses earned by the selected progress stay unlocked.' }));
    const checks = value => grants.querySelectorAll('input').forEach(c => { c.checked = value; });
    edit.appendChild(el('div', { class: 'ad-actions' }, [adminButton('Grant every locked fighter', () => checks(true)),
      adminButton('Clear selected grants', () => checks(false)), adminButton('Stage progress reset', () => { beaten.value = '0'; wins.value = '0'; checks(false); })]));
    const save = el('button', { type: 'submit', class: 'btn', text: 'Review and save changes' });
    edit.append(adminField('Reason (saved in activity log)', reason), save);
    edit.addEventListener('submit', async e => {
      e.preventDefault(); if (ADMIN.busy || ADMIN.target !== target) return;
      const unlocked = [...grants.querySelectorAll('input:checked')].map(c => c.value);
      if (!window.confirm('Save changes for ' + (p.name || target.uid) + '?\nLevels cleared: ' + p.beaten + ' → ' + beaten.value + '\nBoss wins: ' + p.wins + ' → ' + wins.value + '\nSelected fighter grants: ' + unlocked.length + '\nReason: ' + reason.value.trim())) return;
      ADMIN.busy = true; save.disabled = true; adminMessage('Saving changes…');
      try {
        await adminPost('/api/admin/account', { uid: target.uid, revision: p.revision || 0, beaten: +beaten.value, wins: +wins.value, unlocked, reason: reason.value.trim() });
        ADMIN.target = await adminApi('/api/admin/account?uid=' + encodeURIComponent(target.uid));
        if (ACCT.user.uid === target.uid) await acctChanged();
        ADMIN.busy = false; ADMIN.message = 'Changes saved and recorded in the activity log.'; renderAdmin();
      } catch (err) { adminMessage(adminError(err)); }
      finally { ADMIN.busy = false; save.disabled = false; }
    });
    card.appendChild(edit);
  }
  card.appendChild(adminButton('Reload player', async () => {
    if (ADMIN.busy) return;
    try { ADMIN.target = await adminApi('/api/admin/account?uid=' + encodeURIComponent(target.uid)); ADMIN.message = ''; renderAdmin(); }
    catch (e) { adminMessage(adminError(e)); }
  }));
  const history = el('div', { class: 'card ad-card' }, [el('h3', { text: 'Account activity · last 20 changes' })]); pane.appendChild(history);
  if (!target.history.length) history.appendChild(el('p', { class: 'muted', text: 'No admin changes yet.' }));
  target.history.forEach(event => history.appendChild(el('article', { class: 'ad-history' }, [
    el('strong', { text: event.reason }), el('p', { text: new Date(event.at).toLocaleString() + ' · ' + (event.actor.name || event.actor.uid) }),
    el('p', { text: 'Levels ' + event.before.beaten + ' → ' + event.after.beaten + ' · Wins ' + event.before.wins + ' → ' + event.after.wins }),
    el('p', { text: 'Fighters: ' + (event.before.unlocked.join(', ') || 'none') + ' → ' + (event.after.unlocked.join(', ') || 'none') })
  ])));
}
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
    const card = el('article', { class: 'card ad-card' }); pane.appendChild(card);
    card.append(el('span', { class: 'ad-badge', text: report.severity.toUpperCase() + ' · ' + report.status.toUpperCase() }),
      el('h3', { text: report.title }), el('p', { class: 'muted', text: (report.username || 'Player') + ' · ' + report.category + ' · ' + new Date(report.created).toLocaleString() }),
      el('p', { class: 'ad-text', text: report.details }));
    if (report.steps) card.append(el('h4', { text: 'Steps to reproduce' }), el('p', { class: 'ad-text', text: report.steps }));
    card.appendChild(el('p', { class: 'muted ad-text', text: 'Screen: ' + report.context.screen + ' · Mode: ' + report.context.mode + ' · Level: ' + report.context.level + '\n' + report.context.browser }));
    const status = adminSelect(statusOptions, report.status);
    const notes = el('textarea', { rows: '3', maxlength: '1000', placeholder: 'Investigation notes (admins only)' }); notes.value = report.notes || '';
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
    card.append(adminField('Status', status), adminField('Admin notes', notes), save,
      adminButton('Open reporter account', async () => {
        try { ADMIN.target = await adminApi('/api/admin/account?uid=' + encodeURIComponent(report.uid)); ADMIN.tab = 'accounts'; ADMIN.message = ''; renderAdmin(); }
        catch (e) { adminMessage(adminError(e)); }
      }));
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
  card.appendChild(el('p', { class: 'muted', text: 'Tell us what happened. Your report goes privately to the game admins. Do not include passwords or other sensitive information.' }));
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
      BUG.draft = null; BUG.message = 'Report received. Thank you! The admins can now review it.'; card.reset(); message.textContent = BUG.message;
    } catch (err) { if (ACCT.user && ACCT.user.uid === uid) { BUG.message = adminError(err); message.textContent = BUG.message; } }
    finally { BUG.busy = false; send.disabled = false; }
  });
}
document.getElementById('go-admin').addEventListener('click', showAdmin);
document.getElementById('go-tester').addEventListener('click', showTesting);
document.getElementById('exit-testing').addEventListener('click', () => { setTester(false); show('main'); });
document.getElementById('go-bug-report').addEventListener('click', showBugReport);
adminUpdate();
