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
   - Roles (checked here on the server, never trusted from the browser):
       owner  = verified email in the private OWNER_EMAILS setting. Sees the Owner panel: every player (with email and
                online status), bug reports, and gives the in-game roles below. Only the owner may use a 1-2 letter username.
       admin  = verified email in the private TESTER_EMAILS setting (owner included). The Tester button and the Admin
                panel: every player (email, online status) and bug reports, and can change any player's progress and
                fighters except the owner's. Never sees or changes roles.
       op     = in-game role the owner gives. Can change only their OWN Boss Fight level, wins and fighters
                (Settings > Special). No Admin panel.
       collab = in-game label the owner gives. It has no powers.
     In-game roles never give access to Cloudflare, Firebase or GitHub. All account changes are audited server-side. */

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
  cpu: [[60000, 4], [86400000, 300]],   // Vs CPU results saved to the account (a match takes at least half a minute)
  opSelf: [[60000, 6], [86400000, 100]],   // OP changes to their own account (Settings > Special)
  claim: [[60000, 10], [86400000, 100]],   // claiming or changing a season title
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
const OWNER_NAME_RE = /^[A-Za-z0-9_]{1,16}$/;   // only the owner may use a 1-2 letter username
const ONLINE_MS = 5 * 60 * 1000;                // "online" = the game was open in the last 5 minutes
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
const BOARD = '__board';   // leaderboard stats, written only by this server (match results + time the game is open)
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
  if (typeof d.username === 'string' && OWNER_NAME_RE.test(d.username)) {
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

/* score for the Overall section: wins count most, then KOs, Boss Fight level and hours played online */
const overallScore = x => (x.wins | 0) * 10 + (x.kos | 0) * 2 + (x.bestLevel | 0) * 5 + Math.floor((x.onlineMs || 0) / 3600000);
const BOARD_SECTIONS = ['overall', 'online', 'wins', 'games', 'boss'];
const BOARD_FIELDS = { onlineMs: 3153600000000, games: 10000000, wins: 10000000, losses: 10000000, kos: 10000000, deaths: 10000000, bossWins: 10000000, bestLevel: 30 };
/* Seasons: 30 days, then a 2-day break, then the next one. Season 1 starts the first time the leaderboard is used after this
   update. Each season's leaderboard starts at 0 (the all-time numbers keep counting). When a season ends, #1 in each section
   (as the board is shown, so the owner's arrow order counts) wins a title; the Overall #1 writes their own. */
const SEASON_MS = 30 * 86400000, SEASON_BREAK_MS = 2 * 86400000, SEASON_CYCLE = SEASON_MS + SEASON_BREAK_MS;
const SEASON_TITLES = { online: 'Cloud Dweller', wins: 'Sky Champion', games: 'Iron Brawler', boss: 'Boss Slayer', overall: '' };
const TITLE_RE = /^[A-Za-z0-9 ]{1,20}$/;   // the Overall winner's own title: letters, numbers and spaces
const cleanTitle = t => typeof t === 'string' ? t.trim().replace(/\s+/g, ' ') : '';
function seasonAt(start, now) {
  const k = Math.max(0, Math.floor((now - start) / SEASON_CYCLE)), s0 = start + k * SEASON_CYCLE;
  return { n: k + 1, start: s0, end: s0 + SEASON_MS, next: s0 + SEASON_CYCLE, active: now < s0 + SEASON_MS, now };
}
const statZero = uid => ({ uid, name: '', onlineMs: 0, games: 0, wins: 0, losses: 0, kos: 0, deaths: 0, bossGames: 0, bossWins: 0, bestLevel: 0 });
function statAdd(cur, d) {
  const a = d.add || {};
  ['onlineMs', 'games', 'wins', 'losses', 'kos', 'deaths', 'bossGames', 'bossWins', 'cpuGames', 'cpuWins', 'cpuKos', 'cpuDeaths'].forEach(k => { const v = Number(a[k]) || 0; if (v > 0) cur[k] = (cur[k] || 0) + Math.min(v, k === 'onlineMs' ? 3600000 : 1000); });
  if (Number.isInteger(d.level) && d.level > (cur.bestLevel || 0)) cur.bestLevel = Math.min(d.level, BOSS_LEVELS.length);
  if (typeof d.name === 'string' && d.name) cur.name = d.name;
  cur.updated = Date.now();
  return cur;
}
/* how each section is sorted (the first number decides; the second breaks ties) */
const SECTION_KEYS = {
  online: [x => x.onlineMs || 0], wins: [x => x.wins | 0], games: [x => x.games | 0],
  boss: [x => x.bestLevel | 0, x => x.bossWins | 0], overall: [overallScore]
};
const BOARD_MAX = 1000;   // every player is listed (up to this many), players on 0 at the bottom
/* orders = { section: [uid, ...] } set by the owner with the arrows; those players come first, in that order.
   titles = { uid: 'Season title' } shown next to the name. */
function leaderboard(stats, meUid, orders, ownerView, titles) {
  orders = orders || {}; titles = titles || {};
  const pub = x => ({ name: x.name || 'Player', onlineMs: x.onlineMs || 0, games: x.games | 0, wins: x.wins | 0, losses: x.losses | 0,
    kos: x.kos | 0, deaths: x.deaths | 0, bossWins: x.bossWins | 0, bestLevel: x.bestLevel | 0, score: overallScore(x), me: x.uid === meUid || undefined,
    title: titles[x.uid] || undefined, uid: ownerView ? x.uid : undefined });
  const out = { sections: {}, me: null, players: stats.length, owner: ownerView || undefined, custom: {} };
  for (const k in SECTION_KEYS) {
    const keys = SECTION_KEYS[k], order = Array.isArray(orders[k]) ? orders[k] : [];
    const sorted = stats.slice().sort((a, b) => keys.reduce((r, f) => r || f(b) - f(a), 0) || String(a.name).localeCompare(String(b.name)));
    const pinned = order.map(uid => stats.find(x => x.uid === uid)).filter(Boolean);
    const list = pinned.concat(sorted.filter(x => !order.includes(x.uid)));
    if (pinned.length) out.custom[k] = true;
    out.sections[k] = list.slice(0, BOARD_MAX).map(pub);
    if (meUid) { const i = list.findIndex(x => x.uid === meUid); if (out.me === null) out.me = {}; out.me[k] = i < 0 ? null : i + 1; }
  }
  const mine = meUid && stats.find(x => x.uid === meUid);
  // Vs CPU numbers are only for the player's own "Your stats" (the browser runs those games, so they never rank)
  if (mine) out.me.stats = Object.assign(pub(mine), { cpuGames: mine.cpuGames | 0, cpuWins: mine.cpuWins | 0, cpuKos: mine.cpuKos | 0, cpuDeaths: mine.cpuDeaths | 0 });
  return out;
}

export class Accounts {
  constructor(state) { this.state = state; }
  /* board instance: the owner's arrow order for the all-time board (n = 0) or one season */
  async orders(st, n) {
    const orders = {};
    for (const k of BOARD_SECTIONS) { const o = await st.get((n ? 'sorder:' + n + ':' : 'order:') + k); if (o) orders[k] = o; }
    return orders;
  }
  /* board instance: the season clock. Season 1 starts on first use; any season that has ended gets its results saved once. */
  async season(st) {
    let start = await st.get('season:start');
    if (!start) { start = Date.now(); await st.put('season:start', start); }
    const now = Date.now(), info = seasonAt(start, now);
    let done = (await st.get('season:done')) || 0;
    const last = info.active ? info.n - 1 : info.n;
    while (done < last) { done++; await this.finishSeason(st, done, start); await st.put('season:done', done); }
    return info;
  }
  async finishSeason(st, n, start) {
    const stats = [...(await st.list({ prefix: 'ss:' + n + ':', limit: 5000 })).values()], orders = await this.orders(st, n);
    const board = leaderboard(stats, null, orders, true);
    const res = { n, end: start + (n - 1) * SEASON_CYCLE + SEASON_MS, top: {}, winners: {}, titles: SEASON_TITLES };
    const awards = new Map();
    for (const k of BOARD_SECTIONS) {
      const list = board.sections[k], first = list[0];
      res.top[k] = list.slice(0, 3).map(x => Object.assign({}, x, { uid: undefined, me: undefined, title: undefined }));
      const pinned = Array.isArray(orders[k]) && first && orders[k][0] === first.uid;
      if (!first || !(pinned || SECTION_KEYS[k][0](first) > 0)) continue;   // nobody played: no winner
      res.winners[k] = { name: first.name };
      if (!awards.has(first.uid)) awards.set(first.uid, (await st.get('award:' + first.uid)) || []);
      awards.get(first.uid).push({ season: n, section: k, title: SEASON_TITLES[k], claimed: false });
    }
    for (const [uid, list] of awards) await st.put('award:' + uid, list);
    await st.put('result:' + n, res);
  }
  async fetch(req) {
    const op = new URL(req.url).pathname.slice(1);
    let d = {}; try { d = await req.json(); } catch (e) { }
    const st = this.state.storage;
    if (op === 'lookup') return json({ uid: (await st.get('n:' + String(d.name || '').toLowerCase())) || null });
    /* every claimed username (the registry instance) -> lets the owner list players who have not signed in since this update */
    if (op === 'name-list') {
      const rows = await st.list({ prefix: 'n:', limit: 5000 });
      return json({ names: [...rows.entries()].map(([k, uid]) => ({ name: k.slice(2), uid })) });
    }
    /* the player index (admin instance): last seen time, email and roles, for the Owner panel only */
    if (op === 'player-seen') {
      const key = 'player:' + d.uid, cur = (await st.get(key)) || { uid: d.uid, joined: Date.now() }, now = Date.now();
      const next = Object.assign({}, cur);
      if (typeof d.name === 'string' && d.name) next.name = d.name;
      if (typeof d.email === 'string' && d.email) next.email = d.email;
      if (typeof d.owner === 'boolean') next.owner = d.owner;
      if (d.roles && typeof d.roles === 'object') next.roles = { op: !!d.roles.op, collab: !!d.roles.collab };
      const changed = next.name !== cur.name || next.email !== cur.email || next.owner !== cur.owner ||
        JSON.stringify(next.roles || {}) !== JSON.stringify(cur.roles || {}) || !cur.seen;
      // time online: the gap since the last "still here" signal, if the game stayed open (signals come every 2 minutes)
      let played = 0;
      if (changed || now - (cur.seen || 0) > 60000) {
        if (cur.seen && now - cur.seen <= 180000) played = now - cur.seen;
        next.seen = now; await st.put(key, next);   // at most one write a minute
      }
      return json({ ok: true, played, name: next.name || '' });
    }
    if (op === 'player-list') {
      const rows = await st.list({ prefix: 'player:', limit: 5000 });
      return json({ players: [...rows.values()] });
    }
    if (op === 'player-get') return json((await st.get('player:' + d.uid)) || {});
    /* leaderboard stats (board instance). Only the game server adds to these, when an online match or Boss Fight ends. */
    if (op === 'stat-add') {
      const all = await st.get('stat:' + d.uid);
      await st.put('stat:' + d.uid, statAdd(all || statZero(d.uid), d));
      const season = await this.season(st);   // this season's board counts too (not during the break)
      if (season.active) {
        const key = 'ss:' + season.n + ':' + d.uid, cur = (await st.get(key)) || statZero(d.uid);
        if (!cur.name && all && all.name) cur.name = all.name;
        await st.put(key, statAdd(cur, d));
      }
      return json({ ok: true });
    }
    if (op === 'stat-list') {
      const season = await this.season(st), n = d.view === 'all' ? 0 : season.n;
      const all = await st.list({ prefix: 'stat:', limit: 5000 });
      let stats = [...all.values()];
      if (n) {   // this season's numbers; everyone else who has played before is listed with 0
        const rows = await st.list({ prefix: 'ss:' + n + ':', limit: 5000 }), mine = new Map([...rows.values()].map(x => [x.uid, x]));
        stats = [...mine.values()].concat(stats.filter(x => !mine.has(x.uid)).map(x => Object.assign(statZero(x.uid), { name: x.name })));
      }
      const titles = {}; (await st.list({ prefix: 'title:', limit: 5000 })).forEach((t, k) => { titles[k.slice(6)] = t; });
      const mine = d.uid && all.get('stat:' + d.uid);   // your Vs CPU numbers are all-time in both views
      const cpu = mine ? { cpuGames: mine.cpuGames | 0, cpuWins: mine.cpuWins | 0, cpuKos: mine.cpuKos | 0, cpuDeaths: mine.cpuDeaths | 0 } : null;
      return json({ stats, orders: await this.orders(st, n), titles, season, view: n ? 'season' : 'all', cpu });
    }
    /* owner edits from the Leaderboard screen: exact numbers, or the order of a section (both logged).
       season = a season number edits that season's board; no season edits the all-time board. */
    if (op === 'stat-set') {
      const key = (d.season ? 'ss:' + d.season + ':' : 'stat:') + d.uid;
      const cur = (await st.get(key)) || Object.assign(statZero(d.uid), { name: ((await st.get('stat:' + d.uid)) || {}).name || d.name || '' });
      const before = Object.assign({}, cur);
      for (const k in d.set) cur[k] = d.set[k];
      cur.updated = Date.now();
      await st.put(key, cur);
      await st.put('audit:' + newestKey(), { at: Date.now(), actor: d.actor, uid: d.uid, season: d.season || 'all', before, after: cur });
      return json({ ok: true });
    }
    if (op === 'order-set') {
      const key = (d.season ? 'sorder:' + d.season + ':' : 'order:') + d.section;
      if (d.reset) await st.delete(key); else await st.put(key, d.uids);
      await st.put('audit:' + newestKey(), { at: Date.now(), actor: d.actor, section: d.section, season: d.season || 'all', order: d.reset ? 'reset' : d.uids });
      return json({ ok: true });
    }
    /* the season clock, the last finished season's results, and (signed in) your titles */
    if (op === 'season-get') {
      const season = await this.season(st), done = (await st.get('season:done')) || 0;
      const result = done ? await st.get('result:' + done) : null;
      const awards = d.uid ? (await st.get('award:' + d.uid)) || [] : [];
      const title = d.uid ? (await st.get('title:' + d.uid)) || '' : '';
      return json({ season, result, awards, title });
    }
    /* claim a title you won (or show a title you already claimed). The Overall winner writes their own and can change it. */
    if (op === 'title-claim') {
      const awards = (await st.get('award:' + d.uid)) || [];
      const a = awards.find(x => x.season === d.season && x.section === d.section);
      if (!a) return json({ error: 'not-found' }, 404);
      if (a.section === 'overall') {
        const t = cleanTitle(d.title);
        if (!TITLE_RE.test(t)) return json({ error: 'invalid' }, 400);
        a.title = t;
      }
      a.claimed = true; a.claimedAt = Date.now();
      await st.put('award:' + d.uid, awards);
      await st.put('title:' + d.uid, a.title);
      return json({ awards, title: a.title });
    }
    /* owner: remove a player's shown title (for example a rude custom title). They can write a new Overall title again. */
    if (op === 'title-clear') {
      const before = (await st.get('title:' + d.uid)) || '';
      await st.delete('title:' + d.uid);
      const awards = (await st.get('award:' + d.uid)) || [];
      awards.forEach(a => { if (a.section === 'overall') { a.claimed = false; a.title = ''; } });
      if (awards.length) await st.put('award:' + d.uid, awards);
      await st.put('audit:' + newestKey(), { at: Date.now(), actor: d.actor, uid: d.uid, title: { before, after: '' } });
      return json({ ok: true });
    }
    if (op === 'report-delete') {
      const key = 'report:' + d.id;
      if (!(await st.get(key))) return json({ error: 'not-found' }, 404);
      await st.delete(key); return json({ ok: true });
    }
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
    /* XP (the Sky Road): only the server adds it. You never drop below the start of your current level. */
    if (op === 'xp-add') {
      if (!stored) return json({ error: 'not-found' }, 404);
      let add = d.amount | 0;
      if (d.cpu) {
        /* Vs CPU is reported by the browser: at most one result every 45 seconds (no real match is shorter),
           and at most 600 XP a day from it. Losses always count. */
        const now = Date.now(), day = new Date(now).toISOString().slice(0, 10);
        if (now - (p.cpuAt || 0) < 45000) return json({ xp: p.xp || 0, amt: 0, tooSoon: true });
        p.cpuAt = now;
        if (!p.cpuDay || p.cpuDay.d !== day) p.cpuDay = { d: day, xp: 0 };
        if (add > 0) { add = Math.min(add, Math.max(0, 600 - p.cpuDay.xp)); p.cpuDay.xp += add; }
      }
      const before = p.xp || 0, floor = xpTotal(xpLevel(before).level);
      p.xp = Math.max(floor, Math.min(XP_CAP, before + add));
      const amt = p.xp - before;
      if (d.cpu && !amt) await tx.put('profile', p);
      if (amt) {
        await tx.put('profile', p);
        await tx.put('xplog:' + newestKey(), { at: Date.now(), amt, why: String(d.why || '').slice(0, 60), xp: p.xp });
        if (Math.random() < 0.05) {   // keep the newest 200 entries of the XP history
          const all = [...(await tx.list({ prefix: 'xplog:', limit: 400 })).keys()];
          for (const k of all.slice(200)) await tx.delete(k);
        }
      }
      return json({ xp: p.xp, amt });
    }
    if (op === 'xp-get') {
      const log = await tx.list({ prefix: 'xplog:', limit: Math.min(200, d.limit || 100) });
      return json({ xp: p.xp || 0, log: [...log.values()] });
    }
    /* Admin / Owner panel: set someone's level (their XP goes to the start of that level). The owner's account only by the owner. */
    if (op === 'xp-set') {
      if (!stored) return json({ error: 'not-found' }, 404);
      if (p.owner && !d.byOwner) return json({ error: 'owner-protected' }, 409);
      const prevXp = p.xp || 0, before = xpLevel(prevXp).level;
      p.xp = xpTotal(d.level); p.revision = (p.revision || 0) + 1;
      const same = { beaten: p.beaten, wins: p.wins, unlocked: p.unlocked.slice() };
      await tx.put('audit:' + newestKey(), { at: Date.now(), actor: d.actor, reason: 'Level ' + before + ' → ' + d.level, before: same, after: same });
      await tx.put('xplog:' + newestKey(), { at: Date.now(), amt: p.xp - prevXp, why: 'Level set to ' + d.level + ' by ' + ((d.actor && d.actor.name) || 'an admin'), xp: p.xp, set: true });
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
    if (op === 'roles') {
      if (!stored) return json({ error: 'not-found' }, 404);
      if (p.owner) return json({ error: 'owner-protected' }, 409);
      const before = { op: !!(p.roles && p.roles.op), collab: !!(p.roles && p.roles.collab) };
      p.roles = { op: !!d.op, collab: !!d.collab }; p.revision = (p.revision || 0) + 1;
      await tx.put('audit:' + newestKey(), { at: Date.now(), actor: d.actor, reason: 'Roles: ' + (['op', 'collab'].filter(k => p.roles[k]).join(' + ') || 'none'),
        before: { beaten: p.beaten, wins: p.wins, unlocked: p.unlocked.slice(), roles: before },
        after: { beaten: p.beaten, wins: p.wins, unlocked: p.unlocked.slice(), roles: p.roles } });
      await tx.put('profile', p);
      return json({ profile: p });
    }
    if (op === 'name') {
      if (!(d.owner ? OWNER_NAME_RE : NAME_RE).test(String(d.name || ''))) return json({ error: 'name' }, 400);
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
      (f.inv > 0 ? 1 : 0) | (f.shielding ? 2 : 0) | (f.flyT > 0 ? 4 : 0) | (f.frozen > 0 ? 8 : 0) | (f.helpless ? 16 : 0) | (f.dead > 0 ? 32 : 0) | (f.out ? 64 : 0) | (f.halo > 0 ? 128 : 0) | (f.armor ? 256 : 0) | (f.buffT > 0 ? 512 : 0) | (f.hot ? 1024 : 0) | (f.ult ? 2048 : 0) | (f.burn > 0 ? 4096 : 0) | (f.zap > 0 ? 8192 : 0) | (f.slow > 0 ? 16384 : 0) | (f.vanish ? 32768 : 0) | (f.zap > 0 && f.dazzle ? 65536 : 0) | (f.bubble > 0 ? 131072 : 0),
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
    const mine = this.g.fighters.find(f => f.ctrl.type === 'remote' && f.ctrl.peer === c.id);
    this.bossRun = { uid: c.uid, peer: c.id, level, gid: this.gid, test, slot: mine ? mine.slot : 0, name: c.pname || p.name || '' };
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
    // who is playing which fighter (for the leaderboard): signed-in players only, counted once per account
    this.humans = this.g.fighters.filter(f => f.ctrl.type === 'remote').map(f => {
      const pc = this.clients.get(f.ctrl.peer);
      return { slot: f.slot, peer: f.ctrl.peer, uid: pc && pc.uid, name: pc && pc.pname };
    });
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
      const me = computeResults(g).find(r => r.slot === run.slot) || { kos: 0, falls: 0 };
      if (run.uid) acct(this.env, BOARD, 'stat-add', { uid: run.uid, name: run.name,
        add: { games: 1, bossGames: 1, wins: win ? 1 : 0, losses: win ? 0 : 1, bossWins: win ? 1 : 0, kos: me.kos | 0, deaths: me.falls | 0 },
        level: win ? run.level : 0 }).catch(() => {});
      if (run.uid) acct(this.env, run.uid, 'xp-add', { amount: win ? 30 + run.level : 5, why: 'Boss Fight level ' + run.level + (win ? ' win' : '') }).catch(() => {});
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
      const results = computeResults(g);
      const rows = results.map(r => [r.slot, r.place, r.kos, r.falls, r.win ? 1 : 0]);
      this.srv.res = { gid: this.gid, r: rows };
      // leaderboard: every signed-in player in this match gets the game and its result (time online comes from the ping)
      const counted = new Set();
      (this.humans || []).forEach(h => {
        const pc = this.clients.get(h.peer), uid = h.uid || (pc && pc.uid), r = results.find(x => x.slot === h.slot);
        if (!uid || !r || counted.has(uid)) return;
        counted.add(uid);
        acct(this.env, BOARD, 'stat-add', { uid, name: h.name || (pc && pc.pname) || '',
          add: { games: 1, wins: r.win ? 1 : 0, losses: !r.win && g.winTid !== null ? 1 : 0, kos: r.kos | 0, deaths: r.falls | 0 } }).catch(() => {});
        // XP: +10 for playing, +15 more for a win, +1 per KO
        acct(this.env, uid, 'xp-add', { amount: 10 + (r.win ? 15 : 0) + Math.min(20, r.kos | 0), why: 'Online match' + (r.win ? ' win' : '') }).catch(() => {});
      });
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
      /* the leaderboard is public (usernames and numbers only, never emails). Signed-in players also get their own row. */
      if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
        let me = null, ownerView = false;
        if (tok) { try { const v = await verifyIdToken(tok, env); me = v.uid; ownerView = isOwner(v, env); } catch (e) { } }
        const view = url.searchParams.get('view') === 'all' ? 'all' : 'season';
        const [b, reg] = await Promise.all([acct(env, BOARD, 'stat-list', { view, uid: me }), acct(env, NAMES, 'name-list', {})]);
        // every player with a username is listed, even before they have played (all 0)
        const stats = b.stats || [], byUid = new Map(stats.map(x => [x.uid, x]));
        (reg.names || []).forEach(n => { const x = byUid.get(n.uid); if (!x) { const z = Object.assign(statZero(n.uid), { name: n.name }); stats.push(z); byUid.set(n.uid, z); } else if (!x.name) x.name = n.name; });
        const out = leaderboard(stats, me, b.orders, ownerView, b.titles);
        if (out.me && out.me.stats && b.cpu) Object.assign(out.me.stats, b.cpu);
        return json(Object.assign(out, { season: b.season, view }), 200, cors);
      }
      /* the season clock and last season's results (public); signed in, also your titles to claim */
      if (url.pathname === '/api/season' && req.method === 'GET') {
        let me = null;
        if (tok) { try { me = (await verifyIdToken(tok, env)).uid; } catch (e) { } }
        return json(await acct(env, BOARD, 'season-get', { uid: me }), 200, cors);
      }
      let u;
      try { u = await verifyIdToken(tok, env); } catch (e) { return json({ error: String(e.message || 'auth') }, 401, cors); }
      if (!(await hit(env, 'uid:' + u.uid, 'api'))) return json({ error: 'slow-down' }, 429, cors);
      if (url.pathname === '/api/me' && req.method === 'GET') {
        const p = await acct(env, u.uid, 'get', { name: toUsername(u.name), owner: isOwner(u, env), gift: giftsFor(u, env) });
        if (p && p.name) await acct(env, NAMES, 'claim', { name: p.name, uid: u.uid });   // reserve the name this player already uses
        const roles = p.roles || {};
        const seen = await acct(env, ADMIN_STORE, 'player-seen', { uid: u.uid, name: p.name || '', email: u.verified ? u.email : '', owner: isOwner(u, env), roles });
        if (seen.played > 0) await acct(env, BOARD, 'stat-add', { uid: u.uid, name: p.name || '', add: { onlineMs: seen.played } });
        const mins = Math.round(seen.played / 60000);   // XP: +1 per minute signed in
        if (mins > 0) { const x = await acct(env, u.uid, 'xp-add', { amount: mins, why: 'Time online' }); if (x && x.xp != null) p.xp = x.xp; }
        return json(Object.assign({}, p, { owner: isOwner(u, env), tester: isTester(u, env), op: !!roles.op, collab: !!roles.collab }), 200, cors);
      }
      /* "I'm still playing" ping (every few minutes while the game is open) -> online status in the Owner panel */
      if (url.pathname === '/api/ping' && req.method === 'POST') {
        const seen = await acct(env, ADMIN_STORE, 'player-seen', { uid: u.uid });
        if (seen.played > 0) await acct(env, BOARD, 'stat-add', { uid: u.uid, name: seen.name, add: { onlineMs: seen.played } });
        const mins = Math.round(seen.played / 60000);   // XP: +1 per minute signed in
        const x = mins > 0 ? await acct(env, u.uid, 'xp-add', { amount: mins, why: 'Time online' }) : null;
        return json({ ok: true, xp: x && x.xp != null ? x.xp : undefined }, 200, cors);
      }
      /* a finished Vs CPU match, saved to the player's own stats (never the leaderboard) */
      if (url.pathname === '/api/cpu-result' && req.method === 'POST') {
        let d; try { d = await apiBody(req); } catch (e) { return json({ error: 'invalid' }, 400, cors); }
        if (typeof d.win !== 'boolean' || !Number.isInteger(d.kos) || d.kos < 0 || d.kos > 50 || !Number.isInteger(d.falls) || d.falls < 0 || d.falls > 50 ||
            (d.lvl !== undefined && !(Number.isInteger(d.lvl) && d.lvl >= 1 && d.lvl <= 10)))
          return json({ error: 'invalid' }, 400, cors);
        if (!(await hit(env, 'uid:' + u.uid, 'cpu'))) return json({ error: 'slow-down' }, 429, cors);
        // XP by CPU level L: a win gives 4 x L; a loss gives L, but losing to a level 8, 9 or 10 CPU costs 5, 10 or 15
        const L = d.lvl || 5, amount = d.win ? 4 * L : L >= 8 ? -(L - 7) * 5 : L;
        const x = await acct(env, u.uid, 'xp-add', { amount, cpu: true, why: 'Vs CPU level ' + L + (d.win ? ' win' : '') });
        if (x && x.tooSoon) return json({ error: 'too-soon' }, 429, cors);   // a result less than 45 seconds after the last one isn't saved
        await acct(env, BOARD, 'stat-add', { uid: u.uid, add: { cpuGames: 1, cpuWins: d.win ? 1 : 0, cpuKos: d.kos, cpuDeaths: d.falls } });
        return json({ ok: true, xp: x && x.xp != null ? x.xp : undefined }, 200, cors);
      }
      /* your XP and the history behind it (the Sky Road) */
      if (url.pathname === '/api/xp' && req.method === 'GET') return json(await acct(env, u.uid, 'xp-get', { limit: 100 }), 200, cors);
      /* claim a season title you won. The Overall #1 writes their own title (letters, numbers, spaces, up to 20). */
      if (url.pathname === '/api/season/claim' && req.method === 'POST') {
        let d; try { d = await apiBody(req); } catch (e) { return json({ error: 'invalid' }, 400, cors); }
        if (!u.verified) return json({ error: 'verify-email' }, 403, cors);
        if (!Number.isInteger(d.season) || d.season < 1 || d.season > 100000 || !BOARD_SECTIONS.includes(d.section) ||
            (d.title !== undefined && (typeof d.title !== 'string' || d.title.length > 40))) return json({ error: 'invalid' }, 400, cors);
        if (!(await hit(env, 'uid:' + u.uid, 'claim'))) return json({ error: 'slow-down' }, 429, cors);
        const r = await acct(env, BOARD, 'title-claim', { uid: u.uid, season: d.season, section: d.section, title: d.title });
        return json(r, r.error ? (r.error === 'not-found' ? 404 : 400) : 200, cors);
      }
      /* OP role: change your OWN Boss Fight level, wins and unlocked fighters (Settings > Special). Never anyone else's. */
      if (url.pathname === '/api/op/self' && req.method === 'POST') {
        let d; try { d = await apiBody(req); } catch (e) { return json({ error: 'invalid' }, 400, cors); }
        if (!u.verified) return json({ error: 'not-op' }, 403, cors);
        const me = await acct(env, u.uid, 'get', {});
        if (!(me.roles && me.roles.op)) return json({ error: 'not-op' }, 403, cors);
        if (!Number.isInteger(d.beaten) || d.beaten < 0 || d.beaten > BOSS_LEVELS.length ||
            !Number.isInteger(d.wins) || d.wins < 0 || d.wins > 1000000 || !Number.isInteger(d.revision) || d.revision < 0 ||
            !Array.isArray(d.unlocked) || d.unlocked.length > ROSTER.length ||
            !d.unlocked.every(id => typeof id === 'string' && ROSTER.some(c => c.id === id && c.locked && !c.hidden)))
          return json({ error: 'invalid' }, 400, cors);
        if (!(await hit(env, 'uid:' + u.uid, 'opSelf'))) return json({ error: 'slow-down' }, 429, cors);
        const r = await acct(env, u.uid, 'admin-save', { beaten: d.beaten, wins: d.wins, unlocked: d.unlocked, revision: d.revision,
          reason: 'Changed in Settings > Special (OP)', actor: { uid: u.uid, name: toUsername(u.name) } });
        if (r.error) return json({ error: r.error }, r.error === 'conflict' ? 409 : 400, cors);
        const p = r.profile;
        return json({ beaten: p.beaten, wins: p.wins, unlocked: p.unlocked, revision: p.revision }, 200, cors);
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
        /* owner: everything here. admin (an email in the private TESTER_EMAILS setting): players, accounts and bug reports,
           but never roles or leaderboard edits, and never the owner's account. The OP role gives none of this. Everyone else: nothing. */
        const owner = isOwner(u, env);
        if (!u.verified || !isTester(u, env)) return json({ error: 'not-admin' }, 403, cors);
        if (!owner && (url.pathname === '/api/admin/roles' || url.pathname.startsWith('/api/admin/board'))) return json({ error: 'not-admin' }, 403, cors);
        const hideRoles = r => { if (!owner && r && r.profile) { r.profile = Object.assign({}, r.profile); delete r.profile.roles; } return r; };
        const respond = r => json(r, r.error ? ({ 'not-found': 404, conflict: 409, 'owner-protected': 409 }[r.error] || 400) : 200, cors);
        const actor = { uid: u.uid, name: toUsername(u.name) };
        if (url.pathname === '/api/admin/account' && req.method === 'GET') {
          const uid = await adminTarget(env, { uid: url.searchParams.get('uid'), username: url.searchParams.get('username') });
          if (!uid) return json({ error: 'not-found' }, 404, cors);
          const r = await acct(env, uid, 'admin-get', {});
          if (r.error) return respond(r);
          const info = await acct(env, ADMIN_STORE, 'player-get', { uid });
          return respond(hideRoles(Object.assign({}, r, { uid, self: uid === u.uid,
            info: { email: info.email || '', seen: info.seen || 0, joined: info.joined || r.profile.created || 0,
              online: !!info.seen && Date.now() - info.seen < ONLINE_MS } })));
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
            revision: d.revision, reason, actor }).then(hideRoles));
        }
        if (url.pathname === '/api/admin/players' && req.method === 'GET') {
          /* Owner panel only: the owner first, then Collab, then OP, then everyone else (the Admin panel keeps its normal order) */
          const roleRank = x => x.owner ? 0 : x.roles && x.roles.collab ? 1 : x.roles && x.roles.op ? 2 : 3;
          const [reg, idx] = await Promise.all([acct(env, NAMES, 'name-list', {}), acct(env, ADMIN_STORE, 'player-list', {})]);
          const now = Date.now(), byUid = new Map();
          (reg.names || []).forEach(n => byUid.set(n.uid, { uid: n.uid, name: n.name, email: '', seen: 0, roles: {} }));
          (idx.players || []).forEach(x => byUid.set(x.uid, Object.assign(byUid.get(x.uid) || {}, {
            uid: x.uid, name: x.name || (byUid.get(x.uid) || {}).name || '', email: x.email || '', seen: x.seen || 0,
            joined: x.joined || 0, owner: !!x.owner, roles: x.roles || {} })));
          const players = [...byUid.values()].map(x => Object.assign(x, { online: !!x.seen && now - x.seen < ONLINE_MS }))
            .map(x => owner ? x : Object.assign({}, x, { roles: undefined, owner: undefined }))   // admins never see roles
            .sort((a, b) => (owner ? roleRank(a) - roleRank(b) : 0) || (b.online - a.online) || (b.seen - a.seen) || a.name.localeCompare(b.name));
          return json({ players }, 200, cors);
        }
        /* Admin and Owner panels: set a player's level (Sky Road). Admins can't change the owner. */
        if (url.pathname === '/api/admin/level' && req.method === 'POST') {
          let d; try { d = await apiBody(req); } catch (e) { return json({ error: 'invalid' }, 400, cors); }
          const uid = await adminTarget(env, d);
          if (!uid || !Number.isInteger(d.level) || d.level < 1 || d.level > XP_MAX_LEVEL) return json({ error: 'invalid' }, 400, cors);
          return respond(await acct(env, uid, 'xp-set', { level: d.level, byOwner: owner, actor }).then(hideRoles));
        }
        if (url.pathname === '/api/admin/roles' && req.method === 'POST') {
          let d; try { d = await apiBody(req); } catch (e) { return json({ error: 'invalid' }, 400, cors); }
          const uid = await adminTarget(env, d);
          if (!uid || typeof d.op !== 'boolean' || typeof d.collab !== 'boolean') return json({ error: 'invalid' }, 400, cors);
          const r = await acct(env, uid, 'roles', { op: d.op, collab: d.collab, actor });
          if (!r.error) await acct(env, ADMIN_STORE, 'player-seen', { uid, roles: r.profile.roles, name: r.profile.name || '' });
          return respond(r);
        }
        /* ---- owner only: edit the leaderboard ---- */
        if (url.pathname === '/api/admin/board' && req.method === 'POST') {
          let d; try { d = await apiBody(req); } catch (e) { return json({ error: 'invalid' }, 400, cors); }
          if (typeof d.uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(d.uid) || !d.set || typeof d.set !== 'object') return json({ error: 'invalid' }, 400, cors);
          const set = {};
          for (const k in d.set) {
            if (!(k in BOARD_FIELDS) || !Number.isInteger(d.set[k]) || d.set[k] < 0 || d.set[k] > BOARD_FIELDS[k]) return json({ error: 'invalid' }, 400, cors);
            set[k] = d.set[k];
          }
          if (!Object.keys(set).length) return json({ error: 'invalid' }, 400, cors);
          if (d.season !== undefined && !(Number.isInteger(d.season) && d.season >= 1 && d.season <= 100000)) return json({ error: 'invalid' }, 400, cors);
          return respond(await acct(env, BOARD, 'stat-set', { uid: d.uid, set, season: d.season, actor }));
        }
        if (url.pathname === '/api/admin/board/title' && req.method === 'POST') {
          let d; try { d = await apiBody(req); } catch (e) { return json({ error: 'invalid' }, 400, cors); }
          if (typeof d.uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(d.uid)) return json({ error: 'invalid' }, 400, cors);
          return respond(await acct(env, BOARD, 'title-clear', { uid: d.uid, actor }));
        }
        if (url.pathname === '/api/admin/board/order' && req.method === 'POST') {
          let d; try { d = await apiBody(req); } catch (e) { return json({ error: 'invalid' }, 400, cors); }
          if (!BOARD_SECTIONS.includes(d.section)) return json({ error: 'invalid' }, 400, cors);
          if (d.season !== undefined && !(Number.isInteger(d.season) && d.season >= 1 && d.season <= 100000)) return json({ error: 'invalid' }, 400, cors);
          if (d.reset === true) return respond(await acct(env, BOARD, 'order-set', { section: d.section, season: d.season, reset: true, actor }));
          if (!Array.isArray(d.uids) || !d.uids.length || d.uids.length > BOARD_MAX || new Set(d.uids).size !== d.uids.length ||
              !d.uids.every(x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(x))) return json({ error: 'invalid' }, 400, cors);
          return respond(await acct(env, BOARD, 'order-set', { section: d.section, season: d.season, uids: d.uids, actor }));
        }
        if (url.pathname === '/api/admin/reports/delete' && req.method === 'POST') {
          let d; try { d = await apiBody(req); } catch (e) { return json({ error: 'invalid' }, 400, cors); }
          if (typeof d.id !== 'string' || !/^\d{13}-[a-f0-9-]{36}$/.test(d.id)) return json({ error: 'invalid' }, 400, cors);
          return respond(await acct(env, ADMIN_STORE, 'report-delete', { id: d.id }));
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
            expectedUpdated: d.expectedUpdated, notes: d.notes.trim(), actor }));
        }
        return json({ error: 'not-found' }, 404, cors);
      }
      if (url.pathname === '/api/name' && req.method === 'POST') {
        let d = {}; try { d = await req.json(); } catch (e) { }
        const name = String(d.name || '').slice(0, 32), owner = isOwner(u, env);
        if (!(owner ? OWNER_NAME_RE : NAME_RE).test(name)) return json({ error: 'name' }, 400, cors);
        const cur = await acct(env, u.uid, 'get', {});
        if (cur.name === name) return json(cur, 200, cors);
        const c = await acct(env, NAMES, 'claim', { name, uid: u.uid });
        if (c.error) return json({ error: 'taken' }, 409, cors);
        const r = await acct(env, u.uid, 'name', { name, owner });
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
