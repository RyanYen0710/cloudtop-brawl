'use strict';
/* ===== CLOUDTOP BRAWL — accounts (Firebase sign-in) =====
   Sign in with Google, or sign up with a username, email and password.
   Security notes:
   - Firebase gives the browser a sign-in token that expires after 1 hour. The game server
     checks it on every request, so a stolen token stops working quickly.
   - Password accounts must verify their email before they can use accounts features.
   - Passwords must be 8+ characters with an uppercase letter, a lowercase letter and a number.
   - Everything a player types is shown as plain text only (never as HTML).
   - Unlocks are decided by the game server only; nothing here can grant them. */

const FB_VER = '12.18.0';
const ACCT = { fb: null, auth: null, user: null, profile: null, ready: false, readyWait: null, loadErr: null, busy: false, view: 'signin', fails: 0, lockUntil: 0, pendingName: '' };

function acctCfg() { return typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId ? FIREBASE_CONFIG : null; }
function acctEnabled() { return !!acctCfg() && !(window.claude && window.claude.use) && !!serverUrl(); }
function acctRequired() { return acctEnabled() && typeof ACCOUNT_REQUIRED !== 'undefined' && !!ACCOUNT_REQUIRED; }
function acctSignedIn() { return !!(ACCT.user && acctVerified(ACCT.user)); }
function acctVerified(u) { return !!u && (u.emailVerified || (u.providerData || []).some(p => p.providerId !== 'password')); }

/* ---------- loading Firebase (only on the website, only when set up) ---------- */
function acctLoad() {
  if (ACCT.readyWait) return ACCT.readyWait;
  ACCT.readyWait = (async () => {
    if (!acctEnabled()) { ACCT.ready = true; return; }
    try {
      const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
      const [app, auth] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js')]);
      const fbApp = app.initializeApp(acctCfg());
      ACCT.fb = auth;
      ACCT.auth = auth.getAuth(fbApp);
      try { await auth.getRedirectResult(ACCT.auth); } catch (e) { acctMsg(acctErrText(e)); }
      await new Promise(res => {
        let first = true;
        auth.onAuthStateChanged(ACCT.auth, u => {
          ACCT.user = u || null;
          if (first) { first = false; res(); }
          acctChanged();
        });
      });
    } catch (e) { ACCT.loadErr = e; }
    ACCT.ready = true;
  })();
  return ACCT.readyWait;
}

async function acctToken(force) {
  if (!ACCT.user || !acctVerified(ACCT.user)) return null;
  try { return await ACCT.user.getIdToken(!!force); } catch (e) { return null; }
}
/* sign this game-server connection in (used for online lobbies and Boss Fight) */
async function acctSendAuth(ws) {
  const t = await acctToken();
  if (t && ws.readyState === 1) { try { ws.send(JSON.stringify({ auth: t })); } catch (e) { } }
}
async function acctApi(path, opts) {
  const t = await acctToken();
  if (!t) throw new Error('signin');
  const r = await fetch(serverUrl() + path, Object.assign({ cache: 'no-store' }, opts || {}, { headers: Object.assign({ authorization: 'Bearer ' + t }, (opts && opts.headers) || {}) }));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || ('http' + r.status));
  return j;
}

async function acctChanged() {
  renderAcctChip();
  if (ACCT.user && acctVerified(ACCT.user)) {
    try {
      let p = await acctApi('/api/me');
      const want = ACCT.pendingName || loadLocal('cb.pname') || '';
      if (want && !p.name) { try { p = await acctApi('/api/name', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: want }) }); } catch (e) { } }
      ACCT.profile = p;
    } catch (e) { ACCT.profile = null; if (e.message === 'slow-down') toast('Too many requests. Wait a minute and try again.'); }
  } else ACCT.profile = null;
  setUnlocked(ACCT.profile ? ACCT.profile.unlocked : []);
  if (typeof syncNickFromAccount === 'function') syncNickFromAccount();
  renderAcctChip();
  renderAcctPane();
  if (G.screen === 'login' && ACCT.autoGo && acctSignedIn()) { ACCT.autoGo = false; loginDone(); }
  else if (G.screen === 'login') renderLogin();
  if (typeof testerUpdate === 'function') testerUpdate();
  if (G.screen === 'boss' && typeof renderBoss === 'function') renderBoss();
}
/* "still playing" ping every 2 minutes while the game is open, so the Owner panel can show who is online */
setInterval(() => { if (acctSignedIn() && document.visibilityState === 'visible') acctApi('/api/ping', { method: 'POST' }).catch(() => {}); }, 120000);
function setUnlocked(list) {
  const next = Array.isArray(list) ? list.filter(id => CHAR[id]) : [];
  if (next.join() === MY_UNLOCKED.join()) return;
  MY_UNLOCKED = next;
  const r = document.getElementById('roster'); if (r) r.innerHTML = '';
  if (G.screen === 'setup') showSetup();
}

/* ---------- checks ---------- */
function pwRules(pw) {
  return [
    ['At least 8 characters', pw.length >= 8],
    ['An uppercase letter (A–Z)', /[A-Z]/.test(pw)],
    ['A lowercase letter (a–z)', /[a-z]/.test(pw)],
    ['A number (0–9)', /[0-9]/.test(pw)]
  ];
}
const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
/* only the owner's account may use a 1-2 letter username (the server checks this too) */
const nameRule = () => ACCT.profile && ACCT.profile.owner ? /^[A-Za-z0-9_]{1,16}$/ : USERNAME_RE;
const nameHint = () => ACCT.profile && ACCT.profile.owner ? '1–16 letters, numbers or _ (owner only: 1–2 letters allowed)' : '3–16 letters, numbers or _';
function acctErrText(e) {
  const c = (e && e.code) || '';
  if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found' || c === 'auth/invalid-email') return 'Wrong email or password.';
  if (c === 'auth/email-already-in-use') return 'That email already has an account. Try signing in.';
  if (c === 'auth/weak-password' || c === 'auth/password-does-not-meet-requirements') return 'That password is too weak.';
  if (c === 'auth/too-many-requests') return 'Too many tries. Wait a few minutes and try again.';
  if (c === 'auth/network-request-failed') return 'No connection. Check your internet.';
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return '';
  if (c === 'auth/unauthorized-domain') return 'This website isn’t allowed to sign in yet (Firebase authorized domains).';
  return 'Something went wrong. Please try again.';
}

/* ---------- actions ---------- */
async function acctGoogle() {
  if (ACCT.busy) return;
  ACCT.busy = true; acctMsg('Opening Google…');
  try {
    const p = new ACCT.fb.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    ACCT.autoGo = true;
    try { await ACCT.fb.signInWithPopup(ACCT.auth, p); }
    catch (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) { await ACCT.fb.signInWithRedirect(ACCT.auth, p); return; }
      throw e;
    }
    acctMsg('');
  } catch (e) { acctMsg(acctErrText(e)); }
  finally { ACCT.busy = false; renderLogin(); }
}
async function acctSignIn(email, pw) {
  if (ACCT.busy) return;
  const now = Date.now();
  if (now < ACCT.lockUntil) { acctMsg(`Too many tries. Wait ${Math.ceil((ACCT.lockUntil - now) / 1000)} seconds.`); return; }
  if (!email || !pw) { acctMsg('Type your email and password.'); return; }
  ACCT.busy = true; acctMsg('Signing in…');
  try {
    ACCT.autoGo = true;
    await ACCT.fb.signInWithEmailAndPassword(ACCT.auth, email.trim(), pw);
    ACCT.fails = 0; acctMsg('');
  } catch (e) {
    ACCT.fails++;
    if (ACCT.fails >= 5) { ACCT.lockUntil = Date.now() + 30000 * Math.min(8, ACCT.fails - 4); }
    acctMsg(acctErrText(e));
  } finally { ACCT.busy = false; renderLogin(); }
}
async function acctSignUp(name, email, pw, pw2) {
  if (ACCT.busy) return;
  name = String(name || '').trim();
  if (!USERNAME_RE.test(name)) { acctMsg('Username: 3–16 letters, numbers or _'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) { acctMsg('Type a real email address.'); return; }
  if (!pwRules(pw).every(r => r[1])) { acctMsg('Your password needs all four ✓ below.'); return; }
  if (pw !== pw2) { acctMsg('The two passwords don’t match.'); return; }
  ACCT.busy = true; acctMsg('Creating your account…');
  try {
    ACCT.pendingName = name; saveLocal('cb.pname', name);
    const cred = await ACCT.fb.createUserWithEmailAndPassword(ACCT.auth, email.trim(), pw);
    try { await ACCT.fb.updateProfile(cred.user, { displayName: name }); } catch (e) { }
    await ACCT.fb.sendEmailVerification(cred.user);
    ACCT.view = 'verify'; acctMsg('');
  } catch (e) { acctMsg(acctErrText(e)); }
  finally { ACCT.busy = false; renderLogin(); }
}
async function acctForgot(email) {
  email = String(email || '').trim();
  if (!email) { acctMsg('Type your email first, then press “Forgot password”.'); return; }
  try { await ACCT.fb.sendPasswordResetEmail(ACCT.auth, email); } catch (e) { if (e && e.code === 'auth/too-many-requests') { acctMsg(acctErrText(e)); return; } }
  acctMsg('If that email has an account, a reset link is on its way.');
}
async function acctCheckVerified() {
  if (!ACCT.user) return;
  try { await ACCT.fb.reload(ACCT.user); } catch (e) { }
  if (ACCT.user.emailVerified) { await acctToken(true); await acctChanged(); acctMsg(''); loginDone(); }
  else acctMsg('Not verified yet. Click the link in the email first.');
}
async function acctResend() {
  try { await ACCT.fb.sendEmailVerification(ACCT.user); acctMsg('Sent! Check your inbox (and spam).'); } catch (e) { acctMsg(acctErrText(e)); }
}
async function acctSignOut() {
  try { await ACCT.fb.signOut(ACCT.auth); } catch (e) { }
  ACCT.profile = null; setUnlocked([]); ACCT.view = 'signin';
  renderAcctChip();
  toast('Signed out');
}

/* ---------- the handheld-style sign-in screen ---------- */
let LOGIN_MSG = '';
function acctMsg(t) { LOGIN_MSG = t || ''; const el = document.getElementById('lg-msg'); if (el) el.textContent = LOGIN_MSG; }
function el(tag, attrs, kids) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) { if (k === 'text') e.textContent = attrs[k]; else if (k === 'on') for (const ev in attrs.on) e.addEventListener(ev, attrs.on[ev]); else e.setAttribute(k, attrs[k]); }
  (kids || []).forEach(c => c && e.appendChild(c));
  return e;
}
function loginScreen() {
  let s = document.getElementById('scr-login');
  if (s) return s;
  s = el('section', { id: 'scr-login', class: 'screen', hidden: '' });
  document.getElementById('app').appendChild(s);
  return s;
}
function showLogin(view) {
  loginScreen();
  if (view) ACCT.view = view;
  if (ACCT.user && !acctVerified(ACCT.user)) ACCT.view = 'verify';
  show('login');
  renderLogin();
}
function loginDone() { show('main'); renderAcctChip(); if (ACCT.profile) toast(`Welcome, ${ACCT.profile.name || 'player'}!`); }

function renderLogin() {
  const s = document.getElementById('scr-login'); if (!s || G.screen !== 'login') return;
  s.textContent = '';
  const field = (id, label, type, ac) => el('label', { class: 'lg-field' }, [el('span', { text: label }), el('input', { id, type, autocomplete: ac, spellcheck: 'false', autocapitalize: 'off', maxlength: type === 'password' ? '128' : '80' })]);
  const lcd = el('div', { class: 'lg-lcd' });
  const dev = el('div', { class: 'lg-device' }, [
    el('div', { class: 'lg-top' }, [el('span', { class: 'lg-led' + (ACCT.ready ? ' on' : '') }), el('span', { class: 'lg-brand', text: 'CLOUDTOP' }), el('span', { class: 'lg-brand2', text: 'POCKET' })]),
    lcd,
    el('div', { class: 'lg-pad' }, [el('span', { class: 'lg-dpad' }), el('span', { class: 'lg-ab' }, [el('i', { text: 'B' }), el('i', { text: 'A' })])])
  ]);
  s.appendChild(dev);
  const title = t => el('div', { class: 'lg-title', text: t });
  const msg = el('p', { id: 'lg-msg', class: 'lg-msg', role: 'status', 'aria-live': 'polite', text: LOGIN_MSG });
  const btn = (text, cls, fn) => el('button', { type: 'button', class: 'lg-btn ' + (cls || ''), text, on: { click: e => { SFX.play('ui'); fn(e); } } });

  if (!ACCT.ready) { lcd.append(title('LOADING…'), el('p', { class: 'lg-small', text: 'Connecting to the account service.' })); return; }
  if (ACCT.loadErr) {
    lcd.append(title('OFFLINE'), el('p', { class: 'lg-small', text: 'Couldn’t reach the sign-in service. Check your internet, or play as a guest.' }), btn('PLAY AS GUEST', 'ghost', () => show('main')));
    return;
  }
  if (ACCT.user && acctVerified(ACCT.user)) {
    lcd.append(title('SIGNED IN'), el('p', { class: 'lg-big', text: (ACCT.profile && ACCT.profile.name) || 'Player' }), el('p', { class: 'lg-small', text: ACCT.user.email || '' }),
      btn('▶ START', 'main', () => loginDone()), btn('SIGN OUT', 'ghost', () => acctSignOut().then(renderLogin)));
    return;
  }
  if (ACCT.view === 'verify' && ACCT.user) {
    lcd.append(title('CHECK YOUR EMAIL'),
      el('p', { class: 'lg-small', text: `We sent a link to ${ACCT.user.email}. Click it, then press CONTINUE.` }),
      btn('CONTINUE', 'main', () => acctCheckVerified()), btn('SEND AGAIN', 'ghost', () => acctResend()), btn('USE ANOTHER ACCOUNT', 'ghost', () => acctSignOut().then(() => { ACCT.view = 'signin'; renderLogin(); })), msg);
    return;
  }
  const up = ACCT.view === 'signup';
  const tabs = el('div', { class: 'lg-tabs', role: 'tablist' }, [
    el('button', { type: 'button', role: 'tab', class: 'lg-tab' + (up ? '' : ' on'), 'aria-selected': String(!up), text: 'SIGN IN', on: { click: () => { ACCT.view = 'signin'; acctMsg(''); renderLogin(); } } }),
    el('button', { type: 'button', role: 'tab', class: 'lg-tab' + (up ? ' on' : ''), 'aria-selected': String(up), text: 'SIGN UP', on: { click: () => { ACCT.view = 'signup'; acctMsg(''); renderLogin(); } } })
  ]);
  const form = el('form', { class: 'lg-form', novalidate: '' });
  if (up) form.append(field('lg-name', 'USERNAME', 'text', 'username'));
  form.append(field('lg-email', 'EMAIL', 'email', 'email'), field('lg-pw', 'PASSWORD', 'password', up ? 'new-password' : 'current-password'));
  if (up) {
    form.append(field('lg-pw2', 'PASSWORD AGAIN', 'password', 'new-password'));
    const rules = el('ul', { class: 'lg-rules', id: 'lg-rules' });
    form.append(rules);
  }
  form.append(el('button', { type: 'submit', class: 'lg-btn main', text: up ? 'CREATE ACCOUNT' : '▶ SIGN IN' }));
  form.addEventListener('submit', e => {
    e.preventDefault(); SFX.play('ui');
    const v = id => (document.getElementById(id) || {}).value || '';
    if (up) acctSignUp(v('lg-name'), v('lg-email'), v('lg-pw'), v('lg-pw2')); else acctSignIn(v('lg-email'), v('lg-pw'));
  });
  lcd.append(tabs, btn('G  CONTINUE WITH GOOGLE', 'google', () => acctGoogle()), el('div', { class: 'lg-or', text: '— or —' }), form, msg);
  if (!up) lcd.append(btn('Forgot password?', 'link', () => acctForgot((document.getElementById('lg-email') || {}).value)));
  if (!acctRequired()) lcd.append(btn('Play as guest (no Boss Fight)', 'link', () => { acctMsg(''); show('main'); }));
  if (up) {
    const pw = document.getElementById('lg-pw'), upd = () => {
      const ul = document.getElementById('lg-rules'); if (!ul) return;
      ul.textContent = '';
      pwRules(pw.value).forEach(([t, ok]) => ul.appendChild(el('li', { class: ok ? 'ok' : '', text: (ok ? '✓ ' : '✗ ') + t })));
    };
    pw.addEventListener('input', upd); upd();
  }
}

/* ---------- account button on the main menu ---------- */
function renderAcctChip() {
  const b = document.getElementById('acct-btn'); if (!b) return;
  if (!acctEnabled()) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = acctSignedIn() ? '👤 ' + ((ACCT.profile && ACCT.profile.name) || 'Account') : 'Sign in';
}

/* after the start screen: show sign-in first when accounts are switched on */
async function afterIntro() {
  if (!acctEnabled()) return;
  if (!ACCT.ready) { showLogin(); await acctLoad(); }
  if (acctSignedIn()) { if (G.screen === 'login') loginDone(); return; }
  showLogin();
}

document.getElementById('acct-btn') && document.getElementById('acct-btn').addEventListener('click', () => { SFX.play('ui'); showLogin(); });
if (acctEnabled()) acctLoad();
renderAcctChip();

/* ---------- Settings → Account: username, email, password, link Google, sign out ---------- */
const ACP = { msgs: {} };
function acctProviders() { return ACCT.user ? (ACCT.user.providerData || []).map(p => p.providerId) : []; }
function acpMsg(key, text, cls) {
  ACP.msgs[key] = [text, cls || ''];
  const m = document.querySelector(`#acct-pane [data-msg="${key}"]`);
  if (m) { m.textContent = text || ''; m.className = 'acct-msg' + (cls ? ' ' + cls : ''); }
}
function renderUserSetting() { renderAcctPane(); }
function renderAcctPane() {
  const box = document.getElementById('acct-pane'); if (!box) return;
  if (box.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;   // don't wipe what they're typing
  box.textContent = '';
  const sec = (title, kids) => el('div', { class: 'acct-sec' }, [el('h4', { text: title }), ...kids]);
  const msg = key => { const [t, c] = ACP.msgs[key] || ['', '']; return el('p', { class: 'acct-msg' + (c ? ' ' + c : ''), 'data-msg': key, 'aria-live': 'polite', text: t }); };
  const btn = (text, fn, cls) => el('button', { type: 'button', class: cls || 'mini', text, on: { click: fn } });
  const inp = (attrs) => { const i = el('input', attrs); i.addEventListener('keydown', e => e.stopPropagation()); return i; };
  if (!acctEnabled()) { box.appendChild(el('p', { class: 'muted', text: 'Accounts aren’t available here.' })); return; }
  if (!acctSignedIn() || !ACCT.profile) {
    box.appendChild(sec('Account', [el('p', { class: 'acct-msg', text: 'Sign in to choose a username, save Boss Fight progress and unlock fighters on any device.' }), btn('Sign in', () => { closeSettings(); showLogin(); }, 'btn')]));
    return;
  }
  const prov = acctProviders(), hasPw = prov.includes('password'), hasG = prov.includes('google.com');
  // username
  const un = inp({ id: 'set-uname', maxlength: '16', autocomplete: 'off', spellcheck: 'false', value: ACCT.profile.name || '' });
  un.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveUsername(); } });
  box.appendChild(sec('Username', [el('div', { class: 'acct-line' }, [un, btn('Save', saveUsername)]), msg('name'),
    el('p', { class: 'muted set-note', text: 'Your name in every mode. ' + nameHint() + '. Every username is unique.' })]));
  // email
  const kids = [el('p', { class: 'acct-msg', text: 'Signed in as ' + (ACCT.user.email || '—') + (hasG && !hasPw ? ' (Google)' : '') })];
  if (hasPw) {
    const ne = inp({ id: 'acp-email', type: 'email', placeholder: 'New email address', autocomplete: 'email' });
    const cp = inp({ id: 'acp-email-pw', type: 'password', placeholder: 'Current password', autocomplete: 'current-password' });
    kids.push(el('div', { class: 'acct-line' }, [ne]), el('div', { class: 'acct-line' }, [cp, btn('Change email', changeEmail)]));
    if (ACCT.profile.owner) kids.push(el('p', { class: 'muted set-note', text: 'You’re the game creator. Changing your email also changes which email gets creator access, so tell Claude first.' }));
  } else kids.push(el('p', { class: 'muted set-note', text: 'Your email is managed by Google.' }));
  kids.push(msg('email'));
  box.appendChild(sec('Email', kids));
  // password
  if (hasPw) {
    const cur = inp({ id: 'acp-pw-cur', type: 'password', placeholder: 'Current password', autocomplete: 'current-password' });
    const np = inp({ id: 'acp-pw-new', type: 'password', placeholder: 'New password', autocomplete: 'new-password' });
    const np2 = inp({ id: 'acp-pw-new2', type: 'password', placeholder: 'Type the new password again', autocomplete: 'new-password' });
    const ul = el('ul', { class: 'acct-pw' });
    const rules = () => { ul.textContent = ''; pwRules(np.value).forEach(([t, ok]) => ul.appendChild(el('li', { class: ok ? 'ok' : '', text: (ok ? '✓ ' : '✗ ') + t }))); };
    np.addEventListener('input', rules); rules();
    box.appendChild(sec('Password', [el('div', { class: 'acct-line' }, [cur]), el('div', { class: 'acct-line' }, [np]), el('div', { class: 'acct-line' }, [np2, btn('Change password', changePassword)]), ul, msg('pw')]));
  }
  // Google
  if (hasPw && !hasG) box.appendChild(sec('Google', [el('p', { class: 'acct-msg', text: 'Link your Google account so you can also sign in with one click.' }), btn('Link Google account', linkGoogle), msg('google')]));
  else if (hasG) box.appendChild(sec('Google', [el('p', { class: 'acct-msg ok', text: '✓ Google is linked to this account.' })]));
  box.appendChild(btn('Sign out', () => { acctSignOut(); renderAcctPane(); }, 'btn'));
}
async function saveUsername() {
  const inp = document.getElementById('set-uname'); if (!inp || !ACCT.profile) return;
  const name = inp.value.trim();
  if (name === ACCT.profile.name) { acpMsg('name', 'That’s already your username.', 'ok'); return; }
  if (!nameRule().test(name)) { acpMsg('name', 'Use ' + nameHint() + ' (no spaces).', 'err'); return; }
  acpMsg('name', 'Saving…');
  try {
    const p = await acctApi('/api/name', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
    ACCT.profile = Object.assign(ACCT.profile, p);
    saveLocal('cb.nickCustom', ''); saveLocal('cb.pname', name);
    if (typeof NET !== 'undefined') NET.nick = '';
    if (typeof syncNickFromAccount === 'function') syncNickFromAccount();
    renderAcctChip(); inp.blur();
    acpMsg('name', 'Saved! You’re now ' + name + '.', 'ok'); SFX.play('ui');
  } catch (e) {
    acpMsg('name', { taken: 'Someone already has that username. Try another one.', name: 'Use ' + nameHint() + ' (no spaces).', 'slow-down': 'Too many changes. Wait a minute and try again.' }[e.message] || 'Couldn’t save it. Check your connection and try again.', 'err');
  }
}
/* Firebase wants a fresh password check before changing email or password */
async function acctReauth(pw) {
  const cred = ACCT.fb.EmailAuthProvider.credential(ACCT.user.email, pw);
  await ACCT.fb.reauthenticateWithCredential(ACCT.user, cred);
}
function acctOpErr(e) {
  const c = (e && e.code) || '';
  if (c === 'auth/invalid-credential' || c === 'auth/wrong-password') return 'Your current password isn’t right.';
  if (c === 'auth/email-already-in-use') return 'That email already has an account.';
  if (c === 'auth/invalid-email' || c === 'auth/invalid-new-email') return 'That email address doesn’t look right.';
  if (c === 'auth/requires-recent-login') return 'Please sign out and back in, then try again.';
  if (c === 'auth/credential-already-in-use') return 'That Google account already belongs to a different Cloudtop account.';
  if (c === 'auth/provider-already-linked') return 'Google is already linked.';
  return acctErrText(e) || 'Something went wrong. Please try again.';
}
async function changeEmail() {
  const ne = (document.getElementById('acp-email') || {}).value || '', pw = (document.getElementById('acp-email-pw') || {}).value || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ne.trim())) { acpMsg('email', 'Type the new email address.', 'err'); return; }
  if (!pw) { acpMsg('email', 'Type your current password too.', 'err'); return; }
  acpMsg('email', 'Checking…');
  try {
    await acctReauth(pw);
    await ACCT.fb.verifyBeforeUpdateEmail(ACCT.user, ne.trim());
    acpMsg('email', `Almost done! We sent a link to ${ne.trim()}. Your email changes after you click it.`, 'ok');
    document.getElementById('acp-email').value = ''; document.getElementById('acp-email-pw').value = '';
  } catch (e) { acpMsg('email', acctOpErr(e), 'err'); }
}
async function changePassword() {
  const cur = document.getElementById('acp-pw-cur').value, np = document.getElementById('acp-pw-new').value, np2 = document.getElementById('acp-pw-new2').value;
  if (!cur) { acpMsg('pw', 'Type your current password.', 'err'); return; }
  if (!pwRules(np).every(r => r[1])) { acpMsg('pw', 'Your new password needs all four ✓.', 'err'); return; }
  if (np !== np2) { acpMsg('pw', 'The two new passwords don’t match.', 'err'); return; }
  acpMsg('pw', 'Saving…');
  try {
    await acctReauth(cur);
    await ACCT.fb.updatePassword(ACCT.user, np);
    ['acp-pw-cur', 'acp-pw-new', 'acp-pw-new2'].forEach(id => { document.getElementById(id).value = ''; });
    acpMsg('pw', 'Password changed!', 'ok');
  } catch (e) { acpMsg('pw', acctOpErr(e), 'err'); }
}
async function linkGoogle() {
  acpMsg('google', 'Opening Google…');
  try {
    const p = new ACCT.fb.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await ACCT.fb.linkWithPopup(ACCT.user, p); }
    catch (e) { if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) { await ACCT.fb.linkWithRedirect(ACCT.user, p); return; } throw e; }
    try { await ACCT.fb.reload(ACCT.user); } catch (e) { }
    acpMsg('google', 'Google linked! You can now sign in with Google too.', 'ok');
    renderAcctPane();
  } catch (e) { acpMsg('google', acctOpErr(e), 'err'); }
}
