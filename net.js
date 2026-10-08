'use strict';
/* ===== CLOUDTOP BRAWL — online play over the artifact "room" =====
   The host runs the real match. Friends send their buttons through presence;
   the host sends the match state back through its own presence ~30×/sec. */

const NET = {
  room: null, status: 'connecting', me: null, role: null, code: null, hostPeer: null, hostNick: '',
  lb: null, snap: null, gid: 0, phase: 'lobby', fm: null, res: null, lostAt: 0, lastB: -1, lastIcKey: '',
  vf: null, vfGid: -1, seen: 0, nick: '', mode: 'room', pending: null, snaps: [], jit: 0, rf: null, useServer: false
};

function cleanNick(s) { return String(s || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 16); }
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() { let s = ''; for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }
function cleanCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); }

/* ---------- relay transport (used outside Claude, e.g. on Netlify) ----------
   Players talk through public MQTT relay servers over secure websockets, the same kind of
   connection normal web pages use, so school/office/mobile networks don't block it.
   The host listens on every relay at once; each guest uses the first relay that works.
   It mimics the room's presence API, so the lobby and match code below work the same way. */
const BROKERS = [
  { url: 'wss://broker.emqx.io:8084/mqtt' },
  { url: 'wss://broker.hivemq.com:8884/mqtt' },
  { url: 'wss://public.cloud.shiftr.io', username: 'public', password: 'public' },
  { url: 'wss://test.mosquitto.org:8081/mqtt' }
];
const TOPIC = code => `cloudtopbrawl/v3/${code}/p/`;
const RELAY = { id: null, code: null, clients: [], remote: new Map(), mine: {}, sched: false, hb: null };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- your own game server (fastest, and fair for everyone) ----------
   When a game server address is set, matches run on that server instead of the host's computer.
   Paste the address Cloudflare gives you between the quotes, for example:
   const GAME_SERVER = 'https://cloudtop-brawl-server.yourname.workers.dev';
   Players can also type an address in the Online screen (it overrides this one on their device). */
const GAME_SERVER = 'https://cloudtop-brawl-server.ryanbrawl.workers.dev';
const SRV = { ws: null, code: null, ping: 0, closedByUs: false, reconnecting: false };
function serverUrl() { return String(loadLocal('cb.server') || GAME_SERVER || '').trim().replace(/\/+$/, ''); }
function serverWsUrl(code, kind) {
  let u = serverUrl();
  if (/^https?:\/\//i.test(u)) u = u.replace(/^http/i, 'ws'); else if (!/^wss?:\/\//i.test(u)) u = 'wss://' + u;
  return `${u}/${kind || 'room'}/${code}?id=${RELAY.id}`;
}
function connectServer(code, kind) {
  return new Promise((res, rej) => {
    let ws;
    try { ws = new WebSocket(serverWsUrl(code, kind)); } catch (e) { rej(e); return; }
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; try { ws.close(); } catch (e) { } rej(new Error('timeout')); } }, 7000);
    ws.onopen = () => {
      if (done) return; done = true; clearTimeout(t);
      SRV.ws = ws; SRV.code = code; SRV.closedByUs = false;
      ws.send(JSON.stringify({ d: Object.assign({}, RELAY.mine), full: 1 }));
      if (typeof acctSendAuth === 'function') acctSendAuth(ws);
      res(ws);
    };
    ws.onerror = () => { if (!done) { done = true; clearTimeout(t); rej(new Error('ws')); } };
    ws.onmessage = ev => onServerMsg(ev.data);
    ws.onclose = () => {
      if (SRV.ws !== ws) return;
      SRV.ws = null;
      if (!SRV.closedByUs && NET.role) serverReconnect();
      else if (!SRV.closedByUs && G.mode === 'boss' && typeof onBossDrop === 'function') onBossDrop();
    };
  });
}
function onServerMsg(raw) {
  let m; try { m = JSON.parse(raw); } catch (e) { return; }
  if (!m) return;
  if ((m.acct !== undefined || m.err) && typeof onAcctMsg === 'function') { onAcctMsg(m); if (!m.from) return; }
  if (m.pong) { const rtt = Date.now() - m.pong; SRV.ping = SRV.ping ? Math.round(SRV.ping * 0.6 + rtt * 0.4) : rtt; return; }
  if (m.bye) { RELAY.remote.delete(m.bye); schedPeers(); return; }
  if (!m.from || !m.d) return;
  let r = RELAY.remote.get(m.from);
  if (!r || m.full) { r = { pres: {} }; RELAY.remote.set(m.from, r); }
  r.seen = performance.now();
  applyPatch(r.pres, m.d);
  if (m.from === 'srv' && (m.d.boss || m.d.bossRes) && typeof onBossSrv === 'function') onBossSrv(m.d);
  if (m.from === 'srv' && m.d.gs) {
    if (NET.role === 'guest' && NET.lb && NET.lb.sv) ingestSnap(m.d.gs, NET.lb.gid);
    else if (G.remote) ingestSnap(m.d.gs, NET.gid);
  }
  schedPeers();
}
async function serverReconnect() {
  if (SRV.reconnecting) return;
  SRV.reconnecting = true;
  toast('Connection dropped. Reconnecting\u2026');
  const t0 = performance.now();
  while (NET.role && !SRV.closedByUs && performance.now() - t0 < 20000) {
    try { await connectServer(SRV.code); SRV.reconnecting = false; toast('Reconnected!'); return; } catch (e) { await sleep(1500); }
  }
  SRV.reconnecting = false;
}
setInterval(() => {
  if (SRV.ws && SRV.ws.readyState === 1) { try { SRV.ws.send(JSON.stringify({ ping: Date.now() })); } catch (e) { } }
  const el = document.getElementById('ping');
  if (el) { const show = G.screen === 'fight' && !!SRV.ws && NET.useServer && SRV.ping > 0; el.hidden = !show; if (show) { el.textContent = `Ping ${SRV.ping} ms`; el.className = 'ping ' + (SRV.ping < 80 ? 'good' : SRV.ping < 160 ? 'ok' : 'bad'); } }
}, 2000);

function loadMqtt() {
  const srcs = ['https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js', 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js'];
  return new Promise((res, rej) => {
    if (window.mqtt) return res();
    let i = 0;
    const next = () => {
      if (i >= srcs.length) return rej(new Error('load'));
      const s = document.createElement('script'); s.src = srcs[i++];
      s.onload = () => window.mqtt ? res() : next(); s.onerror = next;
      document.head.appendChild(s);
    };
    next();
  });
}
function applyPatch(o, p) { for (const k in p) { if (p[k] === null) delete o[k]; else o[k] = p[k]; } }
function schedPeers() {
  if (RELAY.sched) return; RELAY.sched = true;
  requestAnimationFrame(() => { RELAY.sched = false; if (NET.room === relayRoom) onPeers(relayRoom.peers()); });
}
function relaySend(msg, onlyActive) {
  if (SRV.ws) { if (SRV.ws.readyState === 1) { try { SRV.ws.send(JSON.stringify(msg)); } catch (e) { } } return; }
  const txt = JSON.stringify(msg), topic = TOPIC(RELAY.code) + RELAY.id;
  RELAY.clients.forEach((c, bi) => {
    if (!c || !c.connected) return;
    if (onlyActive && ![...RELAY.remote.values()].some(r => r.bi === bi)) return;
    try { c.publish(topic, txt, { qos: 0 }); } catch (e) { }
  });
}
const relayRoom = {
  presence(patch) {
    applyPatch(RELAY.mine, patch);
    const keys = Object.keys(patch);
    relaySend({ d: patch }, keys.length === 1 && keys[0] === 'gs');
    schedPeers();
    return Promise.resolve();
  },
  peers() {
    const list = [{ peer: RELAY.id, sameTab: true, isMe: true, presence: RELAY.mine }];
    RELAY.remote.forEach((r, id) => list.push({ peer: id, sameTab: false, isMe: false, presence: r.pres }));
    return list;
  }
};
function onRelayMsg(bi, topic, buf) {
  const sender = topic.split('/').pop();
  if (!sender || sender === RELAY.id) return;
  let m; try { m = JSON.parse(typeof buf === 'string' ? buf : new TextDecoder().decode(buf)); } catch (e) { return; }
  if (!m || typeof m !== 'object') return;
  if (m.bye) { RELAY.remote.delete(sender); schedPeers(); return; }
  let r = RELAY.remote.get(sender);
  const isNew = !r;
  if (!r || m.full) { r = { pres: {}, bi }; RELAY.remote.set(sender, r); }
  r.bi = bi; r.seen = performance.now();
  if (m.d && typeof m.d === 'object') applyPatch(r.pres, m.d);
  if (m.hello) relaySend({ d: Object.assign({}, RELAY.mine), full: 1 });
  else if (isNew && !m.full) relaySend({ d: Object.assign({}, RELAY.mine), full: 1, hello: 1 });
  schedPeers();
}
function connectBroker(bi, code) {
  const b = BROKERS[bi];
  return new Promise((res, rej) => {
    let done = false;
    const c = window.mqtt.connect(b.url, {
      clientId: 'cb' + RELAY.id + '_' + bi, username: b.username, password: b.password,
      connectTimeout: 6000, reconnectPeriod: 2500, keepalive: 20, clean: true,
      will: { topic: TOPIC(code) + RELAY.id, payload: JSON.stringify({ bye: 1 }), qos: 0, retain: false }
    });
    const t = setTimeout(() => { if (!done) { done = true; try { c.end(true); } catch (e) { } rej(new Error('timeout')); } }, 7000);
    c.on('connect', () => {
      c.subscribe(TOPIC(code) + '+', { qos: 0 }, () => {
        try { c.publish(TOPIC(code) + RELAY.id, JSON.stringify({ d: Object.assign({}, RELAY.mine), full: 1, hello: 1 }), { qos: 0 }); } catch (e) { }
      });
      if (!done) { done = true; clearTimeout(t); res(c); }
    });
    c.on('message', (topic, buf) => onRelayMsg(bi, topic, buf));
    c.on('error', () => { });
  });
}
function startRelayHeartbeat() {
  clearInterval(RELAY.hb);
  RELAY.hb = setInterval(() => {
    relaySend({ d: {} });
    const now = performance.now();
    RELAY.remote.forEach((r, id) => { if (id !== 'srv' && now - (r.seen || now) > 15000) { RELAY.remote.delete(id); schedPeers(); } });
  }, 4000);
}
function closeRelay() {
  if (SRV.ws) { SRV.closedByUs = true; const w = SRV.ws; SRV.ws = null; setTimeout(() => { try { w.close(1000); } catch (e) { } }, 200); }
  NET.useServer = false;
  try { relaySend({ bye: 1 }); } catch (e) { }
  const cs = RELAY.clients;
  setTimeout(() => cs.forEach(c => { try { c && c.end(true); } catch (e) { } }), 250);
  clearInterval(RELAY.hb);
  RELAY.clients = []; RELAY.remote.clear(); RELAY.mine = {};
  if (NET.room === relayRoom) NET.room = null;
}
function setNetBusy(msg) {
  const st = document.getElementById('net-status');
  st.className = 'net-status wait'; st.textContent = msg;
}

async function initRoom() {
  NET.nick = cleanNick(loadLocal('cb.nick')) || ('Player' + Math.floor(10 + Math.random() * 89));
  document.getElementById('nick').value = NET.nick;
  try {
    if (!window.claude || !window.claude.use) { NET.mode = 'relay'; NET.status = 'online'; renderOnline(); return; }
    const room = await window.claude.use('room');
    if (!room) { NET.status = 'unavailable'; renderOnline(); return; }
    NET.room = room;
    room.onConnection(c => { NET.status = c ? 'online' : (NET.status === 'unavailable' ? 'unavailable' : 'connecting'); renderOnline(); },
      () => { NET.status = 'unavailable'; renderOnline(); });
    room.onPeers(ch => onPeers(ch.peers), () => { NET.status = 'unavailable'; renderOnline(); });
    room.presence({ nick: NET.nick }).catch(() => { });
  } catch (e) { NET.status = 'unavailable'; renderOnline(); }
}

function presence(patch) { if (NET.room) NET.room.presence(patch).catch(() => { }); }

function onPeers(peers) {
  const me = peers.find(p => p.sameTab);
  if (me) NET.me = me.peer;
  if (NET.role === 'host') hostSync(peers);
  else if (NET.role === 'guest') guestSync(peers);
  else if (NET.pending) {
    const p = peers.find(q => !q.sameTab && q.presence && q.presence.lb && q.presence.lb.c === NET.pending.code);
    if (p) { NET.pending = null; joinLobby(p.peer); return; }
    if (performance.now() - NET.pending.at > 10000) { const c = NET.pending.code; NET.pending = null; renderOnline(); toast(`No lobby found with code ${c}.`); }
  }
  if (G.screen === 'online') renderLobbies(peers);
}

/* ---------- lobby list ---------- */
function renderOnline() {
  const st = document.getElementById('net-status');
  const p2p = NET.mode === 'relay';
  const map = {
    online: ['on', p2p ? 'Ready. Host a lobby to get a 4-letter code, or type a friend’s code to join.' : 'Connected. Host a lobby to get a code, or join a friend with theirs.'],
    connecting: ['wait', 'Connecting…'],
    unavailable: ['off', 'Online play isn’t available in this view. Inside Claude it works when you and your friends are signed in and can open this page.']
  };
  const [cls, txt] = map[NET.status] || map.connecting;
  st.className = 'net-status ' + cls; st.textContent = NET.pending ? `Looking for lobby ${NET.pending.code}…` : txt;
  const ok = NET.status === 'online';
  document.getElementById('host-btn').disabled = !ok;
  document.getElementById('join-btn').disabled = !ok;
  document.getElementById('lobby-card').hidden = p2p;
  document.getElementById('steps-room').hidden = p2p;
  document.getElementById('steps-p2p').hidden = !p2p;
  const sb = document.getElementById('srv-box');
  if (sb) {
    sb.hidden = !p2p;
    const su = serverUrl();
    document.getElementById('srv-url').value = loadLocal('cb.server') || GAME_SERVER || '';
    document.getElementById('srv-state').textContent = su ? '· using your server' : '· off (public relays)';
    if (su && !sb.dataset.touched) sb.open = false;
  }
  if (ok && p2p && serverUrl() && !NET.pending) st.textContent = 'Ready. Matches will run on your game server, so everyone gets the same smooth game.';
  if (NET.room && !p2p) renderLobbies(NET.room.peers());
}

function renderLobbies(peers) {
  const box = document.getElementById('lobbies');
  if (!box || NET.mode === 'relay') return;
  const list = peers.filter(p => !p.sameTab && p.presence && p.presence.lb && p.presence.lb.c);
  if (!list.length) { box.innerHTML = `<p class="muted empty-l">No lobbies from people viewing this page right now. You can still join with a code.</p>`; return; }
  box.innerHTML = list.map(p => {
    const lb = p.presence.lb, slots = lb.s || [];
    const players = slots.filter(s => s[0] === 'you' || s[0] === 'peer').length, cpus = slots.filter(s => s[0] === 'cpu').length;
    const open = slots.filter(s => s[0] === 'open').length;
    const busy = lb.ph === 'fight';
    return `<div class="lobby"><div><b>${esc(cleanNick(lb.n) || 'Someone')}'s lobby <span class="code-tag">${esc(lb.c)}</span></b><span class="muted">${players} player${players === 1 ? '' : 's'}${cpus ? ` · ${cpus} CPU` : ''} · ${esc(lb.st < 0 ? 'Random stage' : (STAGES[lb.st] || STAGES[0]).name)} · ${busy ? 'battle in progress, you can join and watch' : open ? `${open} open spot${open === 1 ? '' : 's'}` : 'full'}</span></div>
      <button type="button" class="btn small" data-join="${esc(p.peer)}" ${!open ? 'disabled' : ''}>Join</button></div>`;
  }).join('');
  box.querySelectorAll('[data-join]').forEach(b => b.addEventListener('click', () => joinLobby(b.dataset.join)));
}

/* ---------- hosting ---------- */
async function hostLobby() {
  if (NET.mode === 'relay' && serverUrl()) {
    setNetBusy('Connecting to your game server\u2026');
    closeRelay();
    RELAY.id = Math.random().toString(36).slice(2, 10);
    RELAY.code = newCode();
    RELAY.mine = { nick: NET.nick };
    try { await connectServer(RELAY.code); }
    catch (e) { renderOnline(); toast('Couldn\u2019t reach the game server. Check the server address on this screen, or clear it to use the public relays.'); return; }
    startRelayHeartbeat();
    NET.room = relayRoom; NET.me = RELAY.id; NET.code = RELAY.code; NET.useServer = true;
  } else if (NET.mode === 'relay') {
    setNetBusy('Creating your lobby…');
    try { await loadMqtt(); } catch (e) { renderOnline(); toast('Couldn\u2019t load the online library. Check your internet connection.'); return; }
    closeRelay();
    RELAY.id = Math.random().toString(36).slice(2, 10);
    RELAY.code = newCode();
    RELAY.mine = { nick: NET.nick };
    const results = await Promise.allSettled(BROKERS.map((b, i) => connectBroker(i, RELAY.code)));
    RELAY.clients = results.map(r => r.status === 'fulfilled' ? r.value : null);
    const ok = RELAY.clients.filter(Boolean).length;
    if (!ok) { renderOnline(); toast('Couldn\u2019t reach any game server. Check your internet and try again.'); return; }
    startRelayHeartbeat();
    NET.room = relayRoom; NET.me = RELAY.id; NET.code = RELAY.code;
  } else {
    if (!NET.room) return;
    NET.code = newCode();
  }
  NET.role = 'host'; NET.phase = 'lobby'; NET.gid = 0; NET.res = null;
  G.mode = 'host';
  SETUP.slots = defaultSlots('host');
  SETUP.slots[0].char = isPickable(loadLocal('cb.char'), MY_UNLOCKED) ? loadLocal('cb.char') : 'titan';
  SETUP.slots[0].nick = NET.nick;
  SETUP.edit = 0;
  pushLobby();
  showSetup();
}

/* ---------- joining with a code ---------- */
async function joinByCode(raw) {
  const code = cleanCode(raw);
  if (code.length !== 4) { toast('Lobby codes are 4 letters or numbers.'); return; }
  if (NET.mode === 'room') {
    if (!NET.room) return;
    NET.pending = { code, at: performance.now() };
    renderOnline();
    onPeers(NET.room.peers());
    return;
  }
  if (serverUrl()) {
    setNetBusy(`Looking for lobby ${code}\u2026`);
    closeRelay();
    RELAY.id = Math.random().toString(36).slice(2, 10);
    RELAY.code = code;
    const ch0 = isPickable(loadLocal('cb.char'), MY_UNLOCKED) ? loadLocal('cb.char') : 'tseng';
    RELAY.mine = { nick: NET.nick, join: code, char: ch0, ib: 0, ic: IN.counters.slice() };
    NET.room = relayRoom; NET.me = RELAY.id;
    try { await connectServer(code); }
    catch (e) { NET.room = null; renderOnline(); toast('Couldn\u2019t reach the game server. Check the server address on this screen, or clear it to use the public relays.'); return; }
    NET.useServer = true;
    const t0 = performance.now();
    while (performance.now() - t0 < 5000) {
      const host = [...RELAY.remote.entries()].find(([id, r]) => r.pres.lb && r.pres.lb.c === code);
      if (host) { startRelayHeartbeat(); enterGuest(host[0], code, cleanNick(host[1].pres.lb.n)); return; }
      await sleep(120);
    }
    closeRelay(); NET.room = null; renderOnline();
    toast(`No lobby found with code ${code}. Check the code, and make sure you and the host use the same game server.`);
    return;
  }
  setNetBusy(`Looking for lobby ${code}…`);
  try { await loadMqtt(); } catch (e) { renderOnline(); toast('Couldn\u2019t load the online library. Check your internet connection.'); return; }
  closeRelay();
  RELAY.id = Math.random().toString(36).slice(2, 10);
  RELAY.code = code;
  const ch = isPickable(loadLocal('cb.char'), MY_UNLOCKED) ? loadLocal('cb.char') : 'tseng';
  RELAY.mine = { nick: NET.nick, join: code, char: ch, ib: 0, ic: IN.counters.slice() };
  NET.room = relayRoom; NET.me = RELAY.id;
  let reached = 0;
  for (let bi = 0; bi < BROKERS.length; bi++) {
    setNetBusy(`Looking for lobby ${code}\u2026 (server ${bi + 1} of ${BROKERS.length})`);
    let c;
    try { c = await connectBroker(bi, code); } catch (e) { continue; }
    reached++;
    RELAY.clients = []; RELAY.clients[bi] = c;
    const t0 = performance.now();
    while (performance.now() - t0 < 5000) {
      const host = [...RELAY.remote.entries()].find(([id, r]) => r.pres.lb && r.pres.lb.c === code);
      if (host) { startRelayHeartbeat(); enterGuest(host[0], code, cleanNick(host[1].pres.lb.n)); return; }
      await sleep(150);
    }
    try { c.end(true); } catch (e) { }
    RELAY.clients = []; RELAY.remote.clear();
  }
  NET.room = null;
  renderOnline();
  toast(reached ? `No lobby found with code ${code}. Check the code, and make sure the host still has the lobby open.` : 'Couldn\u2019t reach any game server. Check your internet and try again.');
}

function encodeLb() {
  return {
    c: NET.code, n: NET.nick, sv: NET.useServer ? 1 : 0, ti: SETUP.time, ph: NET.phase, st: NET.phase !== 'lobby' && G.cfg ? G.cfg.stage : SETUP.stage, sk: SETUP.stocks, tm: SETUP.teams ? 1 : 0, gid: NET.gid,
    s: SETUP.slots.map(s => [s.type, s.peer || '', s.char, s.lvl, s.team, (s.nick || '').slice(0, 16)]),
    fm: NET.phase === 'lobby' ? null : NET.fm, res: NET.phase === 'res' ? NET.res : null
  };
}
function pushLobby() {
  if (NET.role !== 'host') return;
  const lb = encodeLb();
  NET.lb = lb;
  presence({ nick: NET.nick, lb });
}

/* keep the last few match snapshots so screens can move smoothly between them */
function ingestSnap(gs, gid) {
  if (!gs || (gs.gid != null && gs.gid !== gid)) return;
  if (NET.snap && gs.t <= NET.snap.t) return;
  const now = performance.now();
  if (NET.snaps.length) {
    const prev = NET.snaps[NET.snaps.length - 1];
    const jit = Math.abs((now - prev.at) - (gs.t - prev.t) * (1000 / 60));
    NET.jit = NET.jit * 0.9 + Math.min(jit, 250) * 0.1;
  }
  NET.snap = gs;
  NET.snaps.push({ t: gs.t, s: gs, at: now });
  if (NET.snaps.length > 16) NET.snaps.shift();
  (gs.e || []).forEach(e => { if (e[0] > NET.seen) { NET.seen = e[0]; handleEvent(e, false); } });
}
function resetSnaps() { NET.snaps = []; NET.snap = null; NET.rf = null; NET.jit = 0; NET.seen = 0; NET.vf = null; }

function hostSync(peers) {
  if (G.remote && NET.phase === 'fight') {
    const sv = peers.find(p => p.peer === 'srv');
    if (sv && sv.presence) {
      ingestSnap(sv.presence.gs, NET.gid);
      const res = sv.presence.res;
      if (res && res.gid === NET.gid) {
        NET.phase = 'res'; NET.res = res.r; pushLobby();
        showResults(decodeRes(NET.lb), true);
      }
    }
  }
  let changed = false;
  const inMatch = NET.phase === 'fight';
  SETUP.slots.forEach(s => {
    if (s.type !== 'peer') return;
    const p = peers.find(q => q.peer === s.peer);
    if (!p || !p.presence || p.presence.join !== NET.code) {
      const gone = p && p.presence && p.presence.join === null;
      if (!s.missSince) s.missSince = performance.now();
      if (!inMatch && (gone || performance.now() - s.missSince > 10000)) { s.type = 'open'; s.peer = null; s.nick = ''; s.missSince = 0; changed = true; }
      return;
    }
    s.missSince = 0;
    const ch = p.presence.char;
    if (!inMatch && ch && isPick(ch) && s.char !== ch) { s.char = ch; changed = true; }
    const nk = cleanNick(p.presence.nick);
    if (nk && nk !== s.nick) { s.nick = nk; changed = true; }
  });
  if (!inMatch) {
    for (const p of peers) {
      if (p.sameTab || !p.presence || p.presence.join !== NET.code) continue;
      if (SETUP.slots.some(s => s.type === 'peer' && s.peer === p.peer)) continue;
      const open = SETUP.slots.find(s => s.type === 'open');
      if (!open) continue;
      open.type = 'peer'; open.peer = p.peer; open.nick = cleanNick(p.presence.nick) || 'Friend';
      if (isPick(p.presence.char)) open.char = p.presence.char;
      changed = true;
      toast(`${open.nick} joined your lobby`);
    }
  }
  if (changed) { pushLobby(); if (G.screen === 'setup') renderSetup(); }
}

function remoteInput(f) {
  const peers = NET.room ? NET.room.peers() : [];
  const p = peers.find(q => q.peer === f.ctrl.peer);
  if (!p || !p.presence || p.presence.join !== NET.code) {
    f.ctrl.miss = (f.ctrl.miss || 0) + 1;
    if (f.ctrl.miss > 600) { f.ctrl = { type: 'cpu' }; f.lvl = 5; f.tag = 'CPU'; toast(`${f.name} left, a CPU took over`); }
    return { b: 0, pr: 0 };
  }
  f.ctrl.miss = 0;
  const b = +p.presence.ib || 0, ic = Array.isArray(p.presence.ic) ? p.presence.ic : null;
  let pr = 0;
  if (ic) {
    const last = f.ctrl.lastIc;
    if (last) BITS.forEach((bt, i) => { if (ic[i] !== last[i]) pr |= bt; });
    f.ctrl.lastIc = ic.slice();
  }
  return { b, pr };
}

function encodeState(g) {
  const r = Math.round;
  return {
    t: g.frame, o: g.over ? 1 : 0, ot: g.overT, sh: r(g.shake), tl: g.timeLeft, tu: g.timeUp ? 1 : 0,
    ob: g.orb ? [r(g.orb.x), r(g.orb.y), Math.max(0, Math.ceil(g.orb.hp)), g.orb.max, g.orb.flash] : null,
    u: g.ult ? [g.ult.slot, g.ult.t, g.ult.targets, Math.max(0, ULT_PH.indexOf(g.ult.ph)), Math.round(g.ult.ax || 0), Math.round(g.ult.ay || 0), g.ult.aim | 0, g.ult.lock | 0] : null,
    f: g.fighters.map(f => [r(f.x), r(f.y), f.face, POSES.indexOf(f.pose), r((f.pt || 0) * 20), r(f.dmg * 10), f.stocks,
      (f.inv > 0 ? 1 : 0) | (f.shielding ? 2 : 0) | (f.flyT > 0 ? 4 : 0) | (f.frozen > 0 ? 8 : 0) | (f.helpless ? 16 : 0) | (f.dead > 0 ? 32 : 0) | (f.out ? 64 : 0) | (f.halo > 0 ? 128 : 0) | (f.armor ? 256 : 0) | (f.buffT > 0 ? 512 : 0) | (f.hot ? 1024 : 0) | (f.ult ? 2048 : 0) | (f.burn > 0 ? 4096 : 0) | (f.zap > 0 ? 8192 : 0) | (f.slow > 0 ? 16384 : 0) | (f.vanish ? 32768 : 0) | (f.zap > 0 && f.dazzle ? 65536 : 0),
      MOVEKEYS.indexOf(f.mv), r(f.shieldHP), f.kos, f.falls, r((f.charge || 0) * 10), f.tag === 'CPU' ? 1 : 0, f.yenMode | 0, (f.frzOn ? 1 : 0) | (Math.ceil((f.frzCD || 0) / 60) << 1)]),
    p: g.projs.slice(0, 24).map(p => [r(p.x), r(p.y), Math.sign(p.vx) || 1, SHAPES.indexOf(p.shape), r(p.size), p.color, p.armed ? 1 : 0, r((p.ang != null ? p.ang : Math.atan2(p.vy, p.vx)) * 100), p.charged ? 1 : 0]),
    e: g.events.slice(-10)
  };
}

/* ---------- joining ---------- */
function joinLobby(peerId) {
  const p = NET.room && NET.room.peers().find(q => q.peer === peerId);
  if (!p || !p.presence.lb) return;
  enterGuest(peerId, p.presence.lb.c, cleanNick(p.presence.lb.n));
}
function enterGuest(hostPeer, code, hostNick) {
  NET.pending = null;
  NET.role = 'guest'; NET.hostPeer = hostPeer; NET.code = code; NET.hostNick = hostNick;
  NET.lb = null; NET.snap = null; NET.lostAt = 0; NET.gid = -1; NET.lbKey = '';
  G.mode = 'guest';
  const ch = isPickable(loadLocal('cb.char'), MY_UNLOCKED) ? loadLocal('cb.char') : 'tseng';
  presence({ nick: NET.nick, join: NET.code, char: ch, ib: 0, ic: IN.counters.slice() });
  SETUP.slots = defaultSlots('host'); SETUP.edit = -1;
  NET.myChar = ch;
  showSetup();
}
function netSetChar(id) { NET.myChar = id; presence({ char: id }); }

function leaveOnline(msg) {
  NET.leaving = true; NET.reconnecting = false;
  if (NET.role === 'host') presence({ lb: null, gs: null });
  if (NET.role === 'guest') presence({ join: null, ib: 0 });
  NET.role = null; NET.lb = null; NET.snap = null; NET.pending = null; G.remote = false;
  if (NET.mode === 'relay') setTimeout(closeRelay, 150);
  G.mode = 'solo'; G.game = null; G.paused = false;
  showOnline();
  if (msg) toast(msg);
}

function guestSync(peers) {
  const h = peers.find(p => p.peer === NET.hostPeer);
  const lb = h && h.presence && h.presence.lb;
  if (!lb || lb.c !== NET.code) {
    if (!NET.lostAt) NET.lostAt = performance.now();
    else if (performance.now() - NET.lostAt > (NET.mode === 'relay' ? 20000 : 4000)) leaveOnline(NET.mode === 'relay' ? 'Lost the connection to the host.' : 'The host closed the lobby.');
    return;
  }
  NET.lostAt = 0;
  NET.lb = lb;
  NET.hostNick = cleanNick(lb.n);
  SETUP.stage = lb.st | 0; SETUP.stocks = lb.sk | 0; SETUP.teams = !!lb.tm; SETUP.time = lb.ti || 5;
  SETUP.slots = (lb.s || []).map(a => ({ type: a[0], peer: a[1] || null, char: isPick(a[2]) ? a[2] : 'titan', lvl: a[3] | 0, team: a[4] | 0, nick: cleanNick(a[5]) }));
  if (SETUP.slots[0]) SETUP.slots[0].nick = cleanNick(lb.n);
  const mine = SETUP.slots.findIndex(s => s.type === 'peer' && s.peer === NET.me);
  if (mine >= 0 && NET.myChar && SETUP.slots[mine].char !== NET.myChar) SETUP.slots[mine].char = NET.myChar;
  SETUP.edit = mine;
  if (mine < 0 && lb.ph === 'lobby' && !SETUP.slots.some(s => s.type === 'open')) { leaveOnline('That lobby is full.'); return; }

  if (lb.ph === 'fight') {
    if (NET.gid !== lb.gid) { NET.gid = lb.gid; resetSnaps(); FX.length = 0; CAM.init = false; enterFight(); }
    const src = lb.sv ? peers.find(p => p.peer === 'srv') : h;
    ingestSnap(src && src.presence && src.presence.gs, lb.gid);
  } else if (lb.ph === 'res') {
    if (G.screen !== 'results' && lb.res) showResults(decodeRes(lb), false);
  } else {
    if (G.screen === 'fight' || G.screen === 'results') { G.game = null; showSetup(); }
    else if (G.screen === 'setup') {
      const key = JSON.stringify([lb.s, lb.st, lb.sk, lb.tm, lb.ti, NET.me]);
      if (key !== NET.lbKey) { NET.lbKey = key; renderSetup(); }
    }
  }
}

function decodeRes(lb) {
  const fm = lb.fm || [];
  return (lb.res || []).map(a => {
    const m = fm.find(x => x[0] === a[0]) || [];
    return { slot: a[0], place: a[1], kos: a[2], falls: a[3], win: !!a[4], char: m[1] || 'titan', name: m[3] || '', tag: m[5] || '', color: m[4] || '#fff', team: m[6] | 0 };
  });
}

/* Pick the two snapshots around "a moment slightly in the past" and blend between them.
   Showing the match a few frames behind hides uneven network timing, so movement stays smooth. */
function snapPair() {
  const buf = NET.snaps; if (!buf || !buf.length) return null;
  const now = performance.now(), last = buf[buf.length - 1], F = 1000 / 60;
  const delay = clamp(3 + (NET.jit / F) * 2.2, 3, 12);
  const target = last.t + (now - last.at) / F - delay;
  if (NET.rf == null || Math.abs(NET.rf - target) > 30) NET.rf = target;
  else { NET.rf += Math.min(4, (now - (NET.rfAt || now)) / F); NET.rf += (target - NET.rf) * 0.06; }
  NET.rfAt = now;
  const rf = NET.rf;
  if (rf >= last.t) return { a: last.s, b: last.s, k: 1, rf: last.t };
  if (rf <= buf[0].t) return { a: buf[0].s, b: buf[0].s, k: 1, rf: buf[0].t };
  for (let i = 0; i < buf.length - 1; i++) {
    const A = buf[i], B = buf[i + 1];
    if (A.t <= rf && B.t >= rf) return { a: A.s, b: B.s, k: B.t > A.t ? (rf - A.t) / (B.t - A.t) : 1, rf };
  }
  return { a: last.s, b: last.s, k: 1, rf: last.t };
}
const lerp = (a, b, k) => a + (b - a) * k;

/* build fighter-like objects from the match snapshots so the same renderer can draw them */
function guestView() {
  const lb = NET.lb;
  if (!lb || !lb.fm) return null;
  if (!NET.stg || NET.stgKey !== lb.gid + ':' + lb.st) { NET.stg = buildStage(STAGES[lb.st] || STAGES[0]); NET.stgKey = lb.gid + ':' + lb.st; }
  const st = NET.stg;
  const P = snapPair();
  const s = P ? (P.k < 0.5 ? P.a : P.b) : null;
  if (P) updateStage(st, P.rf);
  if (!NET.vf || NET.vfGid !== lb.gid) {
    NET.vfGid = lb.gid;
    NET.vf = lb.fm.map(m => {
      const c = CHAR[m[1]] || ROSTER[0], ph = physFor(c), bs = m[7] ? BOSS_SIZE : 1;
      return { isBoss: !!m[7], slot: m[0], c, ph, W: ph.W * bs, H: ph.H * bs, tid: m[2], name: m[3], color: m[4], tag: m[5], x: 800, y: 400, face: 1, pose: 'idle', pt: 0, dmg: 0, stocks: lb.sk, anim: 0 };
    });
  }
  if (s) {
    s.f.forEach((a, i) => {
      const v = NET.vf[i]; if (!v) return;
      const A = P.a.f[i] || a, B = P.b.f[i] || a;
      if (Math.hypot(B[0] - A[0], B[1] - A[1]) > 200) { v.x = a[0]; v.y = a[1]; }
      else { v.x = lerp(A[0], B[0], P.k); v.y = lerp(A[1], B[1], P.k); }
      v.face = a[2] || 1; v.pose = POSES[a[3]] || 'idle'; v.pt = a[4] / 20;
      const nd = a[5] / 10; if (nd > v.dmg + 0.5) v.lastBump = G.t; v.dmg = nd;
      v.stocks = a[6];
      const fl = a[7];
      v.inv = fl & 1; v.shielding = !!(fl & 2); v.flyT = fl & 4 ? 1 : 0; v.frozen = fl & 8 ? 1 : 0; v.helpless = !!(fl & 16);
      v.dead = fl & 32 ? 1 : 0; v.out = !!(fl & 64); v.halo = fl & 128 ? 1 : 0; v.armor = !!(fl & 256); v.buffT = fl & 512 ? 1 : 0; v.hot = !!(fl & 1024); v.ult = !!(fl & 2048); v.burn = fl & 4096 ? 1 : 0; v.zap = fl & 8192 ? 1 : 0; v.slow = fl & 16384 ? 1 : 0; v.vanish = !!(fl & 32768); v.dazzle = !!(fl & 65536);
      v.mv = MOVEKEYS[a[8]] || null; v.shieldHP = a[9]; v.kos = a[10]; v.falls = a[11]; v.charge = a[12] / 10;
      if (a[13]) v.tag = 'CPU';
      v.yenMode = a[14] | 0;
      v.frzOn = !!((a[15] | 0) & 1); v.frzCD = ((a[15] | 0) >> 1) * 60;
      const up = fSpecials(v).up; v.flyFx = up && up.fx || 'cloud';
      v.anim++;
    });
  }
  let orb = null;
  if (s && s.ob) {
    const oa = P.a.ob, ob = P.b.ob;
    orb = { x: s.ob[0], y: s.ob[1], hp: s.ob[2], max: s.ob[3], flash: s.ob[4] };
    if (oa && ob) { orb.x = lerp(oa[0], ob[0], P.k); orb.y = lerp(oa[1], ob[1], P.k); }
  }
  const projs = s ? (s.p || []).map((p, i) => {
    const pa = P.a.p && P.a.p[i], pb = P.b.p && P.b.p[i];
    let x = p[0], y = p[1];
    if (pa && pb && pa[3] === pb[3] && Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) < 150) { x = lerp(pa[0], pb[0], P.k); y = lerp(pa[1], pb[1], P.k); }
    return { x, y, dir: p[2], vx: p[2], shape: SHAPES[p[3]] || 'orb', size: p[4], color: p[5], armed: p[6], ang: p[7] / 100, charged: p[8] };
  }) : [];
  return {
    stage: st, fighters: NET.vf, over: s ? !!s.o : false, overT: s ? s.ot : 0, shake: s ? s.sh : 0,
    timeLeft: s ? s.tl : 0, timeUp: s ? !!s.tu : false, orb,
    ult: s && s.u ? (() => {
      const u = { slot: s.u[0], t: s.u[1], targets: s.u[2] || [], ph: ULT_PH[s.u[3] | 0] || 'cut', ax: s.u[4] || 0, ay: s.u[5] || 0, aim: s.u[6] | 0, lock: s.u[7] | 0 };
      const ua = P.a.u, ub = P.b.u;
      if (ua && ub && ua[3] === 1 && ub[3] === 1) { u.ax = lerp(ua[4], ub[4], P.k); u.ay = lerp(ua[5], ub[5], P.k); }
      return u;
    })() : null,
    projs
  };
}

function guestSendInput() {
  const li = pollLocal();
  const key = IN.counters.join(',');
  if (li.b !== NET.lastB || key !== NET.lastIcKey) {
    NET.lastB = li.b; NET.lastIcKey = key;
    presence({ ib: li.b, ic: IN.counters.slice() });
  }
}

/* re-check the lobby every second, so departures and lost hosts are noticed even when nothing else changes */
setInterval(() => {
  if (!NET.room || !NET.role) return;
  try { onPeers(NET.room.peers()); } catch (e) { }
}, 1000);
