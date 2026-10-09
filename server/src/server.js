/* ===== CLOUDTOP BRAWL — game server =====
   Runs on Cloudflare Workers. Each lobby code gets its own room (a Durable Object).
   The room passes lobby info between players, and when the host presses Start it
   runs the whole match itself at 60 frames a second, so every player is equally
   close to the game and nobody's computer has to host.

   Accounts + Boss Fight (security notes):
   - Players sign in with Firebase (Google or email + password). The browser sends its
     short-lived Firebase ID token (expires after 1 hour); this server checks the token's
     signature with Google's public keys on EVERY request, and rejects password accounts
     whose email isn't verified.
   - Boss fights run here on the server, so the browser can't fake a win. Progress and
     unlocked fighters are stored in the Accounts storage, which only this server can change.
   - Requests are rate-limited per player and per IP address (per minute and per day),
     with the counters kept in server-only storage.
   - Admin powers require a verified email in the existing private TESTER_EMAILS server setting (owner included).
     Client-supplied roles never grant access. All account changes are audited server-side. */

const TICK = 1000 / 60;
const clip = (s, n) => String(s == null ? '' : s).replace(/[^\p{L}\p{N} _.\-]/gu, '').slice(0, n || 16);
const BAD_KEYS = { __proto__: 1, constructor: 1, prototype: 1 };
function srvApply(o, p) { for (const k in p) { if (BAD_KEYS[k]) continue; if (p[k] === null) delete o[k]; else o[k] = p[k]; } }
const json = (obj, status, extra) => new Response(JSON.stringify(obj), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, extra || {}) });

/* ---------- Firebase sign-in token check (RS256 JWT) ---------- */
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let JWKS = { keys: null, until: 0 };
async function googleKeys(force) {
  if (!force && JWKS.keys && Date.now() < JWKS.until) return JWKS.keys;
  const r = await fetch(JWKS_URL);
  if (!r.ok) throw new Error('keys');
  const j = await r.json();
  const m = /max-age=(\d+)/.exec(r.headers.get('cache-control') || '');
  JWKS = { keys: j.keys || [], until: Date.now() + Math.min(6 * 3600, m ? +m[1] : 3600) * 1000 };
  return JWKS.keys;
}
function b64urlBytes(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64urlJson = s => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));
async function verifyIdToken(token, env) {
  const pid = env && env.FIREBASE_PROJECT_ID;
  if (!pid) throw new Error('accounts-off');
  if (typeof token !== 'string' || token.length > 4096) throw new Error('bad-token');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('bad-token');
  let head, body;
  try { head = b64urlJson(parts[0]); body = b64urlJson(parts[1]); } catch (e) { throw new Error('bad-token'); }
  if (head.alg !== 'RS256' || !head.kid) throw new Error('bad-token');
  let keys = await googleKeys(false), jwk = keys.find(k => k.kid === head.kid);
  if (!jwk) { keys = await googleKeys(true); jwk = keys.find(k => k.kid === head.kid); }
  if (!jwk) throw new Error('bad-token');
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!ok) throw new Error('bad-token');
  const now = Math.floor(Date.now() / 1000);
  if (body.aud !== pid || body.iss !== 'https://securetoken.google.com/' + pid) throw new Error('bad-token');
  if (!(body.exp > now) || !(body.iat <= now + 60) || !(body.auth_time <= now + 60)) throw new Error('expired');
  if (typeof body.sub !== 'string' || !body.sub || body.sub.length > 128) throw new Error('bad-token');
  const provider = body.firebase && body.firebase.sign_in_provider;
  if (provider === 'password' && body.email_verified !== true) throw new Error('verify-email');
  if (provider === 'anonymous') throw new Error('bad-token');
  return { uid: body.sub, email: String(body.email || '').toLowerCase(), verified: body.email_verified === true, name: String(body.name || '').slice(0, 64), provider, expires: body.exp * 1000 };
}

/* ---------- rate limits + accounts (server-only storage) ---------- */
/* per player (uid) and per IP address; IP limits are higher because a school or home can share one IP */
const LIMITS = {
  api: [[60000, 40], [86400000, 2000]],
  apiIp: [[60000, 120], [86400000, 6000]],
  ws: [[60000, 120], [86400000, 6000]],
  boss: [[60000, 6], [86400000, 300]],
  bossIp: [[60000, 20], [86400000, 1200]],
  auth: [[60000, 60], [86400000, 3000]],
  reports: [[60000, 2], [86400000, 10]],
  reportsIp: [[60000, 10], [86400000, 100]]
};
async function hit(env, key, kind) {
  if (!env.ACCOUNTS) return true;
  try {
    const stub = env.ACCOUNTS.get(env.ACCOUNTS.idFromName('rl:' + key));
    const r = await stub.fetch('https://acct/hit', { method: 'POST', body: JSON.stringify({ kind, limits: LIMITS[kind] }) });
    const j = await r.json();
    return !!j.ok;
  } catch (e) { return kind === 'reports' || kind === 'reportsIp' ? false : true; }
}
async function acct(env, uid, op, data) {
  const stub = env.ACCOUNTS.get(env.ACCOUNTS.idFromName('u:' + uid));
  const r = await stub.fetch('https://acct/' + op, { method: 'POST', body: JSON.stringify(data || {}) });
  return r.json();
}
const NAME_RE = /^[A-Za-z0-9_]{3,16}$/;
const NAMES = '__names';   // the shared username registry
/* the game owner (set in wrangler.toml, checked here on the server only) gets every locked fighter */
function isOwner(u, env) {
  const list = String(env.OWNER_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  return !!(u && u.verified && u.email && list.indexOf(u.email) >= 0);
}
/* Existing tester permissions protect admin tools too. The owner is always a tester. */
function isTester(u, env) {
  if (isOwner(u, env)) return true;
  const list = String(env.TESTER_EMAILS || '').toLowerCase().split(/[,;\s]+/).filter(Boolean);
  return !!(u && u.verified && u.email && list.indexOf(String(u.email).toLowerCase()) >= 0);
}
const ADMIN_STORE = '__admin';
const REPORT_STATUSES = ['open', 'investigating', 'resolved', 'closed'];
const newestKey = () => String(9999999999999 - Date.now()).padStart(13, '0') + '-' + crypto.randomUUID();
const plain = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
async function apiBody(req) {
  const text = await req.text();
  if (text.length > 12000) throw new Error('too-large');
  const d = JSON.parse(text);
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('invalid');
  return d;
}
async function adminTarget(env, d) {
  if (typeof d.uid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(d.uid)) return d.uid;
  if (typeof d.username === 'string' && NAME_RE.test(d.username)) {
    const r = await acct(env, NAMES, 'lookup', { name: d.username });
    return r.uid || null;
  }
  return null;
}
/* gift fighters: the hidden GIFT_FIGHTERS secret lists "email=fighterId" pairs (comma separated).
   A signed-in, verified email on that list gets only its own fighter, straight away (never Legend Yen). */
function giftsFor(u, env) {
  if (!(u && u.verified && u.email)) return [];
  const me = String(u.email).toLowerCase();
  return String(env.GIFT_FIGHTERS || '').split(/[,;\n]/).map(s => s.split('='))
    .filter(([e, id]) => e && id && e.trim().toLowerCase() === me)
    .map(([, id]) => id.trim()).filter(id => id !== 'yen' && CHAR[id] && CHAR[id].locked);
}
const toUsername = n => { const v = String(n || '').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '').slice(0, 16); return NAME_RE.test(v) ? v : ''; };

export class Accounts {
  constructor(state) { this.state = state; }
  async fetch(req) {
    const op = new URL(req.url).pathname.slice(1);
    let d = {}; try { d = await req.json(); } catch (e) { }
    const st = this.state.storage;
    if (op === 'lookup') return json({ uid: (await st.get('n:' + String(d.name || '').toLowerCase())) || null });
    if (op === 'report-create') {
      const report = Object.assign({}, d.report, { id: newestKey(), status: 'open', created: Date.now(), updated: Date.now(), notes: '' });
      await st.put('report:' + report.id, report);
      return json({ id: report.id });
    }
    if (op === 'report-list') {
      const items = await st.list({ prefix: 'report:', limit: 51, ...(d.cursor ? { startAfter: d.cursor } : {}) });
      const rows = [...items.entries()];
      return json({ reports: rows.slice(0, 50).map(([, v]) => v), cursor: rows.length > 50 ? rows[49][0] : null });
    }
    if (op === 'report-update') return st.transaction(async tx => {
      const key = 'report:' + d.id, report = await tx.get(key);
      if (!report) return json({ error: 'not-found' }, 404);
      if (d.expectedUpdated !== report.updated) return json({ error: 'conflict' }, 409);
      report.status = d.status; report.notes = d.notes; report.updated = Math.max(Date.now(), report.updated + 1);
      report.updatedBy = d.actor;
      await tx.put(key, report);
      return json(report);
    });
    /* the username registry (one shared instance) keeps every username unique */
    if (op === 'claim' || op === 'release') {
      const k = 'n:' + String(d.name || '').toLowerCase(), cur = await st.get(k);
      if (op === 'claim') { if (cur && cur !== d.uid) return json({ error: 'taken' }); if (!cur) await st.put(k, d.uid); return json({ ok: true }); }
      if (cur === d.uid) await st.delete(k);
      return json({ ok: true });
    }
    if (op === 'hit') {
      const now = Date.now(), lim = Array.isArray(d.limits) ? d.limits : [];
      const rec = (await st.get('rl:' + d.kind)) || {};
      let ok = true;
      for (const [win, max] of lim) {
        const k = 'w' + win, b = rec[k] && now - rec[k].t < win ? rec[k] : { t: now, n: 0 };
        b.n++; rec[k] = b;
        if (b.n > max) ok = false;
      }
      await st.put('rl:' + d.kind, rec);
      return json({ ok });
    }
    return st.transaction(async tx => {
    const stored = await tx.get('profile');
    const p = stored || { name: '', beaten: 0, unlocked: [], wins: 0, created: Date.now() };
    if (op === 'admin-get') {
      if (!stored) return json({ error: 'not-found' }, 404);
      const history = await tx.list({ prefix: 'audit:', limit: 20 });
      return json({ profile: p, history: [...history.values()] });
    }
    if (op === 'admin-save') {
      if (!stored) return json({ error: 'not-found' }, 404);
      if (d.revision !== (p.revision || 0)) return json({ error: 'conflict' }, 409);
      if (p.owner) return json({ error: 'owner-protected' }, 409);
      const before = { beaten: p.beaten, wins: p.wins, unlocked: p.unlocked.slice() };
      p.beaten = d.beaten; p.wins = d.wins;
      p.unlocked = [...new Set(d.unlocked.concat(bossUnlocksFor(d.beaten)))];
      p.revision = (p.revision || 0) + 1;
      const entry = { at: Date.now(), actor: d.actor, reason: d.reason, before,
        after: { beaten: p.beaten, wins: p.wins, unlocked: p.unlocked.slice() } };
      await tx.put('audit:' + newestKey(), entry);
      await tx.put('profile', p);
      return json({ profile: p });
    }
    if (op === 'get') {
      let dirty = false;
      if (!p.name && d.name && NAME_RE.test(d.name)) { p.name = d.name; dirty = true; }
      if (d.owner) {
        ROSTER.filter(c => c.locked).forEach(c => { if (p.unlocked.indexOf(c.id) < 0) { p.unlocked.push(c.id); dirty = true; } });
        if (p.beaten < BOSS_LEVELS.length) { p.beaten = BOSS_LEVELS.length; dirty = true; }
        if (!p.owner) { p.owner = true; dirty = true; }
      }
      if (Array.isArray(d.gift)) d.gift.forEach(id => { if (id !== 'yen' && CHAR[id] && CHAR[id].locked && p.unlocked.indexOf(id) < 0) { p.unlocked.push(id); dirty = true; } });
      if (!stored || dirty) { p.revision = (p.revision || 0) + 1; await tx.put('profile', p); }
      return json(p);
    }
    if (op === 'name') {
      if (!NAME_RE.test(String(d.name || ''))) return json({ error: 'name' }, 400);
      p.name = d.name; p.revision = (p.revision || 0) + 1; await tx.put('profile', p); return json(p);
    }
    if (op === 'beat') {
      const lv = d.level | 0;
      if (lv >= 1 && lv <= BOSS_LEVELS.length) {
        p.wins = (p.wins || 0) + 1;
        if (lv === p.beaten + 1) p.beaten = lv;
        bossUnlocksFor(p.beaten).forEach(id => { if (p.unlocked.indexOf(id) < 0) p.unlocked.push(id); });
        p.revision = (p.revision || 0) + 1; await tx.put('profile', p);
      }
      return json(p);
    }
    return json({ error: 'op' }, 404);
    });
  }
}

function srvEncodeState(g, gid) {
  const r = Math.round;
  return {
    gid, t: g.frame, o: g.over ? 1 : 0, ot: g.overT, sh: r(g.shake), tl: g.timeLeft, tu: g.timeUp ? 1 : 0,
    ob: g.orb ? [r(g.orb.x), r(g.orb.y), Math.max(0, Math.ceil(g.orb.hp)), g.orb.max, g.orb.flash] : null,
    u: g.ult ? [g.ult.slot, g.ult.t, g.ult.targets, Math.max(0, ULT_PH.indexOf(g.ult.ph)), Math.round(g.ult.ax || 0), Math.round(g.ult.ay || 0), g.ult.aim | 0, g.ult.lock | 0] : null,
    av: g.fighters.filter(f => f.avalanche).map(f => [f.slot, f.avalanche.left, f.avalanche.age, f.avalanche.captured, Math.round(f.avalanche.spin * 100) / 100]),
    f: g.fighters.map(f => [r(f.x), r(f.y), f.face, POSES.indexOf(f.pose), r((f.pt || 0) * 20), r(f.dmg * 10), f.stocks,
      (f.inv > 0 ? 1 : 0) | (f.shielding ? 2 : 0) | (f.flyT > 0 ? 4 : 0) | (f.frozen > 0 ? 8 : 0) | (f.helpless ? 16 : 0) | (f.dead > 0 ? 32 : 0) | (f.out ? 64 : 0) | (f.halo > 0 ? 128 : 0) | (f.armor ? 256 : 0) | (f.buffT > 0 ? 512 : 0) | (f.hot ? 1024 : 0) | (f.ult ? 2048 : 0) | (f.burn > 0 ? 4096 : 0) | (f.zap > 0 ? 8192 : 0) | (f.slow > 0 ? 16384 : 0) | (f.vanish ? 32768 : 0) | (f.zap > 0 && f.dazzle ? 65536 : 0),
      MOVEKEYS.indexOf(f.mv), r(f.shieldHP), f.kos, f.falls, r((f.charge || 0) * 10), f.ctrl && f.ctrl.type === 'cpu' && f.tag === 'CPU' ? 1 : 0, f.yenMode | 0, (f.frzOn ? 1 : 0) | (Math.ceil((f.frzCD || 0) / 60) << 1)]),
    p: g.projs.slice(0, 24).map(p => [r(p.x), r(p.y), Math.sign(p.vx) || 1, SHAPES.indexOf(p.shape), r(p.size), p.color, p.armed ? 1 : 0, r((p.ang != null ? p.ang : Math.atan2(p.vy, p.vx)) * 100), p.charged ? 1 : 0]),
    e: g.events.slice(-10)
  };
}

export class Room {
  constructor(state, env) {
    this.state = state; this.env = env;
    this.clients = new Map();   // player id -> { id, ws, pres }
    this.srv = {};              // the server's own shared state (match snapshots, results)
    this.g = null; this.timer = null; this.gid = 0; this.code = ''; this.bossPaused = false;
  }

  async fetch(req) {
    const url = new URL(req.url);
    this.code = (url.pathname.split('/').pop() || '').toUpperCase();
    this.boss = req.headers.get('x-cb-mode') === 'boss';
    const id = String(url.searchParams.get('id') || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
    if (!id) return new Response('Missing player id', { status: 400 });
    if (this.clients.size >= (this.boss ? 1 : 12) && !this.clients.has(id)) return new Response('Room full', { status: 429 });
    const pair = new WebSocketPair();
    const client = pair[0], ws = pair[1];
    ws.accept();
    const old = this.clients.get(id);
    if (old) { try { old.ws.close(1000, 'replaced'); } catch (e) { } }
    const c = { id, ws, pres: old ? old.pres : {}, n: 0, win: Date.now(), ip: req.headers.get('x-cb-ip') || 'x', uid: old ? old.uid : null, unlocked: old ? old.unlocked : [] };
    this.clients.set(id, c);
    for (const [oid, o] of this.clients) if (oid !== id) this.send(c, { from: oid, d: o.pres, full: 1 });
    if (Object.keys(this.srv).length) this.send(c, { from: 'srv', d: this.srv, full: 1 });
    ws.addEventListener('message', ev => this.onMsg(c, ev.data));
    const bye = () => {
      if (this.clients.get(id) !== c) return;
      this.clients.delete(id);
      this.broadcast({ bye: id }, id);
      if (!this.clients.size) this.stop(true);
    };
    ws.addEventListener('close', bye);
    ws.addEventListener('error', bye);
    return new Response(null, { status: 101, webSocket: client });
  }

  send(c, m) { try { c.ws.send(typeof m === 'string' ? m : JSON.stringify(m)); } catch (e) { } }
  broadcast(m, exceptId) { const txt = JSON.stringify(m); for (const c of this.clients.values()) if (c.id !== exceptId) this.send(c, txt); }

  onMsg(c, raw) {
    if (typeof raw !== 'string' || raw.length > 16000) return;
    const now = Date.now();
    if (now - c.win > 1000) { c.win = now; c.n = 0; }
    if (++c.n > 240) return;                       // flood guard: at most 240 messages a second per player
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.ping) { this.send(c, { pong: m.ping }); return; }
    if (typeof m.auth === 'string') { this.auth(c, m.auth); return; }
    if (m.cmd === 'boss') { this.startBoss(c, m); return; }
    if (m.cmd === 'pause') { this.pauseBoss(c, m); return; }
    if (m.d && typeof m.d === 'object' && !Array.isArray(m.d)) {
      if (m.full) c.pres = {};
      srvApply(c.pres, m.d);
      this.broadcast(m.full ? { from: c.id, d: c.pres, full: 1 } : { from: c.id, d: m.d }, c.id);
    }
    const isHost = !!(c.pres.lb && c.pres.lb.c === this.code);
    if (m.cmd === 'start' && isHost && !this.boss) this.start(m.cfg || {}, m.gid | 0, c);
    if (m.cmd === 'stop' && isHost) this.stop(false);
  }

  /* sign-in: check the Firebase token and load this player's unlocked fighters */
  async auth(c, token) {
    if (!(await hit(this.env, 'ip:' + c.ip, 'auth'))) { this.send(c, { acct: null, err: 'slow-down' }); return; }
    try {
      const u = await verifyIdToken(token, this.env);
      c.owner = isOwner(u, this.env); c.tester = isTester(u, this.env); c.authUntil = u.expires;
      const p = await acct(this.env, u.uid, 'get', { name: toUsername(u.name), owner: c.owner, gift: giftsFor(u, this.env) });
      c.uid = u.uid; c.unlocked = Array.isArray(p.unlocked) ? p.unlocked : []; c.pname = p.name || '';
      this.send(c, { acct: { name: p.name, beaten: p.beaten, unlocked: c.unlocked, tester: c.tester } });
    } catch (e) { c.uid = null; c.owner = false; c.tester = false; c.authUntil = 0; c.unlocked = []; this.send(c, { acct: null, err: String(e.message || 'auth') }); }
  }

  /* a fighter is only allowed if it isn't locked, or this player has unlocked it */
  allowedChar(ch, c) {
    if (!CHAR[ch]) return ROSTER.find(x => !x.locked).id;
    if (!CHAR[ch].locked) return ch;
    return c && c.unlocked && c.unlocked.indexOf(ch) >= 0 ? ch : resolvePick('random');
  }

  async startBoss(c, m) {
    if (!this.boss || this.g) return;
    if (!c.uid) { this.send(c, { err: 'signin' }); return; }
    if (!(await hit(this.env, 'uid:' + c.uid, 'boss')) || !(await hit(this.env, 'ip:' + c.ip, 'bossIp'))) { this.send(c, { err: 'slow-down' }); return; }
    const p = await acct(this.env, c.uid, 'get', { owner: !!c.owner });
    const level = m.level | 0;
    // Admin test runs allow any level/fighter and never save a result.
    if (m.test && (!c.tester || !(c.authUntil > Date.now()))) { this.send(c, { err: 'not-admin' }); return; }
    const test = !!m.test;
    if (level < 1 || level > BOSS_LEVELS.length || (!test && level > (p.beaten | 0) + 1)) { this.send(c, { err: 'locked' }); return; }
    c.unlocked = p.unlocked || [];
    let ch = String(m.char || 'random');
    ch = ch === 'random' ? resolvePick('random') : test ? (CHAR[ch] && !CHAR[ch].hidden ? ch : resolvePick('random')) : this.allowedChar(ch, c);
    const cfg = bossConfig(level, ch, {});
    const slots = cfg.slots.map((s, i) => {
      if (s.type === 'you') return { type: 'peer', char: ch, lvl: 5, team: 0, ctrl: { type: 'remote', peer: c.id }, name: clip(p.name || 'Player'), tag: clip(p.name || 'YOU') };
      if (s.type === 'cpu') return Object.assign({}, s, { ctrl: { type: 'cpu' }, name: s.name || 'CPU', tag: s.tag || 'CPU' });
      return { type: 'off' };
    });
    if (this.clients.get(c.id) !== c) return;
    this.gid = (this.gid | 0) + 1;
    this.g = makeGame({ stage: cfg.stage, stocks: cfg.stocks, time: cfg.time, teams: true, slots });
    this.g.orbNext = 2400;
    this.ended = false; this.lastSent = -9; this.last = Date.now();
    this.bossPaused = false;
    this.bossRun = { uid: c.uid, peer: c.id, level, gid: this.gid, test };
    const fm = this.g.fighters.map(f => [f.slot, f.c.id, f.tid, f.name.slice(0, 16), f.color, f.tag.slice(0, 16), f.team, f.boss ? 1 : 0]);
    this.srv = { boss: { gid: this.gid, lvl: level, st: cfg.stage, sk: cfg.stocks, fm } };
    this.broadcast({ from: 'srv', d: { boss: this.srv.boss } });
    this.timer = setInterval(() => this.tick(), 8);
  }

  pauseBoss(c, m) {
    const run = this.bossRun;
    if (!this.boss || !run || !this.g || this.g.over || this.clients.get(c.id) !== c ||
        c.uid !== run.uid || c.id !== run.peer || m.gid !== run.gid || typeof m.paused !== 'boolean') return;
    if (this.bossPaused !== m.paused) {
      this.bossPaused = m.paused;
      // Discard elapsed wall time: paused time must never be simulated on resume.
      this.last = Date.now();
      if (m.paused) { clearInterval(this.timer); this.timer = null; }
      else {
        this.g.fighters.forEach(f => { if (f.ctrl.type === 'remote') this.input(f); });
        this.timer = setInterval(() => this.tick(), 8);
      }
    }
    this.srv.bossPause = { gid: run.gid, paused: this.bossPaused };
    this.srv.gs = srvEncodeState(this.g, this.gid);
    this.broadcast({ from: 'srv', d: { bossPause: this.srv.bossPause, gs: this.srv.gs } });
  }

  start(cfg, gid, hostC) {
    this.stop(true);
    const slots = (Array.isArray(cfg.slots) ? cfg.slots : []).slice(0, 4).map(s => {
      s = s || {};
      const owner = s.type === 'remote' ? this.clients.get(String(s.peer || '').slice(0, 16)) : hostC;
      const ch = this.allowedChar(s.char, owner), team = s.team ? 1 : 0;
      if (s.type === 'remote') return { type: 'peer', char: ch, lvl: 5, team, ctrl: { type: 'remote', peer: String(s.peer || '').slice(0, 16) }, name: clip(s.name) || 'Player', tag: clip(s.tag) || 'P' };
      if (s.type === 'cpu') return { type: 'cpu', char: ch, lvl: clamp(s.lvl | 0, 1, 10), team, ctrl: { type: 'cpu' }, name: 'CPU', tag: 'CPU' };
      return { type: 'off' };
    });
    while (slots.length < 4) slots.push({ type: 'off' });
    const gcfg = { stage: clamp(cfg.stage | 0, 0, STAGES.length - 1), stocks: clamp(cfg.stocks | 0, 1, 9), time: clamp(cfg.time | 0, 2, 15), teams: !!cfg.teams, slots };
    if (slots.filter(s => s.type !== 'off').length < 2) return;
    this.gid = gid; this.g = makeGame(gcfg); this.ended = false; this.lastSent = -9;
    this.srv = {};
    this.last = Date.now();
    this.timer = setInterval(() => this.tick(), 8);
  }

  stop(silent) {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.bossRun = null; this.bossPaused = false;
    this.g = null;
    if (!silent || Object.keys(this.srv).length) { this.srv = {}; this.broadcast({ from: 'srv', d: { gs: null, res: null } }); }
  }

  input(f) {
    const c = this.clients.get(f.ctrl.peer);
    if (!c) {
      f.ctrl.miss = (f.ctrl.miss || 0) + 1;
      if (f.ctrl.miss > 600) { f.ctrl = { type: 'cpu' }; f.lvl = 5; f.tag = 'CPU'; }
      return { b: 0, pr: 0 };
    }
    f.ctrl.miss = 0;
    const b = +c.pres.ib || 0, ic = Array.isArray(c.pres.ic) ? c.pres.ic : null;
    let pr = 0;
    if (ic) {
      const last = f.ctrl.lastIc;
      if (last) BITS.forEach((bt, i) => { if (ic[i] !== last[i]) pr |= bt; });
      f.ctrl.lastIc = ic.slice();
    }
    return { b, pr };
  }

  tick() {
    const g = this.g; if (!g || this.bossPaused) return;
    const now = Date.now();
    let n = Math.floor((now - this.last) / TICK);
    if (n <= 0) return;
    if (n > 6) { n = 6; this.last = now; } else this.last += n * TICK;
    for (let i = 0; i < n; i++) {
      const inputs = g.fighters.map(f => f.ctrl.type === 'cpu' ? aiThink(f, g) : f.ctrl.type === 'remote' ? this.input(f) : null);
      stepGame(g, inputs);
    }
    if (g.frame - this.lastSent >= 2) {
      this.lastSent = g.frame;
      const gs = srvEncodeState(g, this.gid);
      this.srv.gs = gs;
      this.broadcast({ from: 'srv', d: { gs } });
    }
    if (g.over && g.overT >= 110 && !this.ended && this.bossRun) {
      this.ended = true;
      clearInterval(this.timer); this.timer = null;
      const run = this.bossRun, win = g.winTid === 0;
      this.bossRun = null;
      if (run.test) {   // Tester mode: tell the player who won, but don't touch their account
        const bossRes = { gid: run.gid, win, level: run.level, test: 1 };
        this.srv.bossRes = bossRes;
        this.broadcast({ from: 'srv', d: { bossRes } });
        this.g = null;
        return;
      }
      (win ? acct(this.env, run.uid, 'beat', { level: run.level }) : acct(this.env, run.uid, 'get', {}))
        .then(p => {
          const bossRes = { gid: run.gid, win, level: run.level, beaten: p.beaten | 0, unlocked: p.unlocked || [] };
          this.srv.bossRes = bossRes;
          this.broadcast({ from: 'srv', d: { bossRes } });
        }).catch(() => this.broadcast({ from: 'srv', d: { bossRes: { gid: run.gid, win, level: run.level, error: 1 } } }));
      this.g = null;
      return;
    }
    if (g.over && g.overT >= 110 && !this.ended) {
      this.ended = true;
      const rows = computeResults(g).map(r => [r.slot, r.place, r.kos, r.falls, r.win ? 1 : 0]);
      this.srv.res = { gid: this.gid, r: rows };
      this.broadcast({ from: 'srv', d: { res: this.srv.res } });
      clearInterval(this.timer); this.timer = null;
    }
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const ip = req.headers.get('cf-connecting-ip') || 'unknown';
    const origin = req.headers.get('origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const originOk = !allowed.length || allowed.indexOf(origin) >= 0;
    const cors = originOk && origin ? { 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-max-age': '600' } : {};

    /* account API: every request needs a valid, fresh sign-in token */
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'OPTIONS') return new Response(null, { status: originOk ? 204 : 403, headers: cors });
      if (!originOk) return json({ error: 'origin' }, 403);
      if (!env.FIREBASE_PROJECT_ID || !env.ACCOUNTS) return json({ error: 'accounts-off' }, 503, cors);
      if (!(await hit(env, 'ip:' + ip, 'apiIp'))) return json({ error: 'slow-down' }, 429, cors);
      const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      let u;
      try { u = await verifyIdToken(tok, env); } catch (e) { return json({ error: String(e.message || 'auth') }, 401, cors); }
      if (!(await hit(env, 'uid:' + u.uid, 'api'))) return json({ error: 'slow-down' }, 429, cors);
      if (url.pathname === '/api/me' && req.method === 'GET') {
        const p = await acct(env, u.uid, 'get', { name: toUsername(u.name), owner: isOwner(u, env), gift: giftsFor(u, env) });
        if (p && p.name) await acct(env, NAMES, 'claim', { name: p.name, uid: u.uid });   // reserve the name this player already uses
        return json(Object.assign({}, p, { owner: isOwner(u, env), tester: isTester(u, env) }), 200, cors);
      }
      if (url.pathname === '/api/reports' && req.method === 'POST') {
        if (!u.verified) return json({ error: 'verify-email' }, 403, cors);
        let d; try { d = await apiBody(req); } catch (e) { return json({ error: 'invalid-report' }, 400, cors); }
        const title = plain(d.title, 100), details = plain(d.details, 3000), steps = plain(d.steps, 2000);
        if (title.length < 5 || details.length < 10 || !['gameplay', 'account', 'connection', 'other'].includes(d.category) ||
            !['low', 'medium', 'high'].includes(d.severity)) return json({ error: 'invalid-report' }, 400, cors);
        if (!(await hit(env, 'uid:' + u.uid, 'reports')) || !(await hit(env, 'ip:' + ip, 'reportsIp')))
          return json({ error: 'slow-down' }, 429, cors);
        const p = await acct(env, u.uid, 'get', {});
        const result = await acct(env, ADMIN_STORE, 'report-create', { report: {
          uid: u.uid, username: p.name || '', title, details, steps, category: d.category, severity: d.severity,
          context: { screen: clip(d.context && d.context.screen, 24), mode: clip(d.context && d.context.mode, 24),
            level: Number.isInteger(d.context && d.context.level) ? Math.max(0, Math.min(BOSS_LEVELS.length, d.context.level)) : 0,
            browser: plain(d.context && d.context.browser, 240) }
        } });
        return json(result, 201, cors);
      }
      if (url.pathname.startsWith('/api/admin/')) {
        if (!isTester(u, env)) return json({ error: 'not-admin' }, 403, cors);
        const respond = r => json(r, r.error ? ({ 'not-found': 404, conflict: 409, 'owner-protected': 409 }[r.error] || 400) : 200, cors);
        if (url.pathname === '/api/admin/account' && req.method === 'GET') {
          const uid = await adminTarget(env, { uid: url.searchParams.get('uid'), username: url.searchParams.get('username') });
          if (!uid) return json({ error: 'not-found' }, 404, cors);
          const r = await acct(env, uid, 'admin-get', {});
          return respond(Object.assign({}, r, r.error ? {} : { uid }));
        }
        if (url.pathname === '/api/admin/account' && req.method === 'POST') {
          let d; try { d = await apiBody(req); } catch (e) { return json({ error: 'invalid' }, 400, cors); }
          const uid = await adminTarget(env, d), reason = plain(d.reason, 200);
          if (!uid || !Number.isInteger(d.beaten) || d.beaten < 0 || d.beaten > BOSS_LEVELS.length ||
              !Number.isInteger(d.wins) || d.wins < 0 || d.wins > 1000000 || !Number.isInteger(d.revision) || d.revision < 0 ||
              !Array.isArray(d.unlocked) || d.unlocked.length > ROSTER.length ||
              !d.unlocked.every(id => typeof id === 'string' && ROSTER.some(c => c.id === id && c.locked && !c.hidden)) || reason.length < 5)
            return json({ error: 'invalid' }, 400, cors);
          return respond(await acct(env, uid, 'admin-save', { beaten: d.beaten, wins: d.wins, unlocked: d.unlocked,
            revision: d.revision, reason, actor: { uid: u.uid, name: toUsername(u.name) } }));
        }
        if (url.pathname === '/api/admin/reports' && req.method === 'GET') {
          const cursor = url.searchParams.get('cursor') || '';
          if (cursor && !/^report:\d{13}-[a-f0-9-]{36}$/.test(cursor)) return json({ error: 'invalid' }, 400, cors);
          return respond(await acct(env, ADMIN_STORE, 'report-list', { cursor }));
        }
        if (url.pathname === '/api/admin/reports' && req.method === 'POST') {
          let d; try { d = await apiBody(req); } catch (e) { return json({ error: 'invalid' }, 400, cors); }
          if (typeof d.id !== 'string' || !/^\d{13}-[a-f0-9-]{36}$/.test(d.id) || !REPORT_STATUSES.includes(d.status) ||
              !Number.isInteger(d.expectedUpdated) || typeof d.notes !== 'string' || d.notes.length > 1000)
            return json({ error: 'invalid' }, 400, cors);
          return respond(await acct(env, ADMIN_STORE, 'report-update', { id: d.id, status: d.status,
            expectedUpdated: d.expectedUpdated, notes: d.notes.trim(), actor: { uid: u.uid, name: toUsername(u.name) } }));
        }
        return json({ error: 'not-found' }, 404, cors);
      }
      if (url.pathname === '/api/name' && req.method === 'POST') {
        let d = {}; try { d = await req.json(); } catch (e) { }
        const name = String(d.name || '').slice(0, 32);
        if (!NAME_RE.test(name)) return json({ error: 'name' }, 400, cors);
        const cur = await acct(env, u.uid, 'get', {});
        if (cur.name === name) return json(cur, 200, cors);
        const c = await acct(env, NAMES, 'claim', { name, uid: u.uid });
        if (c.error) return json({ error: 'taken' }, 409, cors);
        const r = await acct(env, u.uid, 'name', { name });
        if (r.error) { await acct(env, NAMES, 'release', { name, uid: u.uid }); return json(r, 400, cors); }
        if (cur.name && cur.name.toLowerCase() !== name.toLowerCase()) await acct(env, NAMES, 'release', { name: cur.name, uid: u.uid });
        return json(r, 200, cors);
      }
      return json({ error: 'not-found' }, 404, cors);
    }

    const room = url.pathname.match(/^\/room\/([A-Za-z0-9]{4})$/);
    const boss = url.pathname.match(/^\/boss\/([a-z0-9]{8,24})$/);
    if (!room && !boss) return new Response('Cloudtop Brawl game server is running.', { headers: { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' } });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('This address is for game connections.', { status: 426 });
    if (boss && !originOk) return new Response('Not allowed', { status: 403 });
    if (!(await hit(env, 'ip:' + ip, 'ws'))) return new Response('Too many connections, wait a minute.', { status: 429 });
    const h = new Headers(req.headers);
    h.delete('x-cb-mode'); h.set('x-cb-ip', ip);
    if (boss) h.set('x-cb-mode', 'boss');
    const name = boss ? 'boss:' + boss[1] : room[1].toUpperCase();
    const stub = env.ROOMS.get(env.ROOMS.idFromName(name));
    return stub.fetch(new Request(req, { headers: h }));
  }
};
