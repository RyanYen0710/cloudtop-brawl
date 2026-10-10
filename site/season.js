'use strict';
/* ===== CLOUDTOP BRAWL — Seasons =====
   Each season lasts 30 days, then there's a 2-day break, then the next season starts (the server keeps the clock).
   - Next to the BRAWL title: "SEASON 1" and a live countdown to the end (during the break: to the next season).
   - When a season ends, #1 in each Leaderboard section wins a title. A pop-up shows the final top players once,
     and the Claim button (with a red dot while you have a title to claim) lets you claim yours.
     The Overall #1 writes their own title. The server checks every claim. */

const SEASON = { data: null, skew: 0, uid: undefined, busy: false, loadedAt: 0, timer: null };
const SEASON_SECTIONS = [['overall', 'Overall'], ['online', 'Most online'], ['wins', 'Most wins'], ['games', 'Most games'], ['boss', 'Boss Fight']];

/* 29d 14:03:22 */
function seasonLeft(ms) {
  ms = Math.max(0, ms); const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
  const p = n => String(n).padStart(2, '0');
  return (d ? d + 'd ' : '') + p(h) + ':' + p(m) + ':' + p(s % 60);
}
const seasonNow = () => Date.now() + SEASON.skew;
const seasonSigned = () => typeof acctSignedIn === 'function' && acctSignedIn() && ACCT.user;

async function seasonLoad() {
  if (SEASON.busy || typeof serverUrl !== 'function' || !serverUrl()) return;
  SEASON.busy = true;
  try {
    const t = seasonSigned() && typeof acctToken === 'function' ? await acctToken() : null;
    const r = await fetch(serverUrl() + '/api/season', { cache: 'no-store', headers: t ? { authorization: 'Bearer ' + t } : {} });
    if (r.ok) { SEASON.data = await r.json(); SEASON.skew = SEASON.data.season.now - Date.now(); SEASON.loadedAt = Date.now(); }
  } catch (e) { }
  SEASON.busy = false;
  seasonRender(); seasonMaybePopup();
}
const seasonUnclaimed = () => (SEASON.data && SEASON.data.awards || []).filter(a => !a.claimed);

function seasonRender() {
  const chip = document.getElementById('season-chip'), claim = document.getElementById('go-claim');
  const d = SEASON.data;
  if (chip) {
    chip.hidden = !d;
    if (d) {
      const s = d.season, now = seasonNow();
      document.getElementById('season-n').textContent = 'SEASON ' + s.n;
      document.getElementById('season-cd').textContent = s.active ? 'ends in ' + seasonLeft(s.end - now) : 'ended · Season ' + (s.n + 1) + ' in ' + seasonLeft(s.next - now);
      chip.classList.toggle('break', !s.active);
    }
  }
  if (claim) {
    claim.hidden = !(d && (d.result || (d.awards && d.awards.length)));
    const n = seasonUnclaimed().length;
    claim.classList.toggle('has-dot', n > 0);
    claim.setAttribute('aria-label', n ? 'Claim · ' + n + ' title' + (n > 1 ? 's' : '') + ' to claim' : 'Season results and titles');
  }
}
function seasonTick() {
  const uid = seasonSigned() ? ACCT.user.uid : null;
  const d = SEASON.data, now = seasonNow();
  // reload when you sign in or out, when the season ends or the next one starts, and every 5 minutes
  if (uid !== SEASON.uid || !d || (d.season.active ? now >= d.season.end : now >= d.season.next) || Date.now() - SEASON.loadedAt > 300000) {
    if (uid !== SEASON.uid || Date.now() - SEASON.loadedAt > 5000) { SEASON.uid = uid; seasonLoad(); }
  }
  if (typeof G === 'undefined' || G.screen === 'main') { seasonRender(); seasonMaybePopup(); }
}

/* the end-of-season pop-up shows once per season on this device; the Claim button opens it any time */
function seasonMaybePopup() {
  const d = SEASON.data; if (!d || !d.result || document.querySelector('.gc-back') || document.getElementById('boot')) return;
  if (typeof G !== 'undefined' && G.screen !== 'main') return;   // wait until they're back on the menu
  if (+(loadLocal('cb.seasonSeen') || 0) >= d.result.n) return;   // already seen; the red dot on Claim reminds them
  saveLocal('cb.seasonSeen', String(d.result.n));
  showSeasonClaim();
}

function showSeasonClaim() {
  if (typeof SFX !== 'undefined') SFX.play('ui');
  const old = document.querySelector('.season-back'); if (old) old.remove();
  const back = el('div', { class: 'gc-back season-back' }), box = el('div', { class: 'gc-box card season-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Season results and titles', tabindex: '-1' });
  back.appendChild(box); document.body.appendChild(back);
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  const close = () => { document.removeEventListener('keydown', onKey, true); back.remove(); seasonRender(); };
  document.addEventListener('keydown', onKey, true);
  back.addEventListener('click', e => { if (e.target === back) close(); });
  back.addEventListener('keydown', e => e.stopPropagation());
  const draw = () => {
    box.textContent = '';
    const d = SEASON.data || {}, r = d.result;
    box.appendChild(el('h3', { text: r ? 'Season ' + r.n + ' is over!' : 'Seasons' }));
    if (r) {
      box.appendChild(el('p', { class: 'muted', text: '#1 in each section wins a title. Here are the final top players.' }));
      const grid = el('div', { class: 'season-results' }); box.appendChild(grid);
      SEASON_SECTIONS.forEach(([k, name]) => {
        const top = (r.top && r.top[k]) || [], win = r.winners && r.winners[k];
        const title = k === 'overall' ? 'Their own title' : (r.titles && r.titles[k]) || '';
        grid.appendChild(el('div', { class: 'season-res' }, [
          el('div', { class: 'season-res-h' }, [el('b', { text: name }), el('em', { text: title })]),
          el('ol', {}, top.length ? top.map((x, i) => el('li', { class: i === 0 && win ? 'win' : '' }, [el('span', { class: 'season-rank r' + (i + 1), text: String(i + 1) }), el('span', { text: x.name })]))
            : [el('li', { class: 'muted', text: 'Nobody played this section.' })])
        ]));
      });
    } else box.appendChild(el('p', { class: 'muted', text: 'When this season ends, #1 in each Leaderboard section wins a title.' }));
    // your titles
    const mine = el('div', { class: 'season-mine' }, [el('h4', { text: 'Claim' })]); box.appendChild(mine);
    const msg = el('p', { class: 'acct-msg', role: 'status', 'aria-live': 'polite' });
    if (!seasonSigned()) mine.appendChild(el('p', { class: 'muted', text: 'Sign in to claim titles you win.' }));
    else if (!(d.awards && d.awards.length)) mine.appendChild(el('p', { class: 'muted', text: 'No titles to claim yet. Finish a season at #1 in any section to win one.' }));
    else {
      if (d.title) mine.appendChild(el('p', { class: 'season-now' }, [el('span', { text: 'Showing on your name: ' }), el('em', { class: 'lb-title-tag', text: d.title })]));
      d.awards.slice().reverse().forEach(a => {
        const sec = (SEASON_SECTIONS.find(x => x[0] === a.section) || [a.section, a.section])[1];
        const row = el('div', { class: 'season-award' + (a.claimed ? '' : ' new') }, [el('div', {}, [el('small', { text: 'Season ' + a.season + ' · #1 ' + sec }),
          el('b', { text: a.section === 'overall' ? (a.title || 'Write your own title') : a.title })])]);
        const send = async (title) => {
          if (SEASON.busy) return; SEASON.busy = true; msg.textContent = 'Saving…';
          try {
            const out = await acctApi('/api/season/claim', { method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify(Object.assign({ season: a.season, section: a.section }, title !== undefined ? { title } : {})) });
            d.awards = out.awards; d.title = out.title; SEASON.busy = false; draw(); seasonRender();
            const m = box.querySelector('.season-mine .acct-msg'); if (m) m.textContent = 'Claimed! “' + out.title + '” now shows next to your name on the Leaderboard.';
            return;
          } catch (e) { msg.textContent = e.message === 'invalid' ? 'Use 1 to 20 letters, numbers or spaces.' : 'Couldn’t claim that. Try again.'; }
          SEASON.busy = false;
        };
        if (a.section === 'overall') {
          const inp = el('input', { maxlength: '20', placeholder: 'Your title', value: a.title || '', 'aria-label': 'Your own title (1 to 20 letters, numbers or spaces)' });
          inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') send(inp.value); });
          row.appendChild(el('div', { class: 'season-own' }, [inp, el('button', { type: 'button', class: 'btn start', text: a.claimed ? 'Save' : 'Claim', on: { click: () => send(inp.value) } })]));
        } else if (!a.claimed) row.appendChild(el('button', { type: 'button', class: 'btn start', text: 'Claim', on: { click: () => send() } }));
        else if (d.title !== a.title) row.appendChild(el('button', { type: 'button', class: 'mini', text: 'Show this title', on: { click: () => send() } }));
        else row.appendChild(el('span', { class: 'season-ok', text: '✓ Claimed' }));
        mine.appendChild(row);
      });
    }
    mine.appendChild(msg);
    box.appendChild(el('div', { class: 'gc-row' }, [el('button', { type: 'button', class: 'btn', text: 'Close', on: { click: close } })]));
  };
  draw();
  setTimeout(() => box.focus({ preventScroll: true }), 0);   // not on a Claim button, so a stray Enter can't claim by accident
}

document.getElementById('go-claim') && document.getElementById('go-claim').addEventListener('click', showSeasonClaim);
SEASON.timer = setInterval(seasonTick, 1000);
seasonTick();
