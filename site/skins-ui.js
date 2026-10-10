'use strict';
/* ===== CLOUDTOP BRAWL — picking skins =====
   In character select, the card for your fighter (or any fighter you own that you point at) shows a row of skins,
   each one a little picture of that fighter wearing it. Pick one and that fighter wears it in every mode (online
   players see it too). Locked skins are gray and say how to unlock them. The Inventory (shop.js) can equip them too. */

const SKINSEL = (() => { try { return JSON.parse(loadLocal('cb.skins') || '{}') || {}; } catch (e) { return {}; } })();
function myProf() {
  const p = (typeof ACCT !== 'undefined' && ACCT.profile) || {};
  const xp = typeof XP !== 'undefined' && XP.xp != null ? XP.xp : p.xp || 0;
  return skinProf({ xp, evSkins: p.evSkins, shopSkins: p.shopSkins }, !!p.owner);
}
function mySkinEvent() { return typeof nowEvent === 'function' ? nowEvent() : typeof eventNow === 'function' ? eventNow() : null; }
/* the skin you picked for this fighter, if you can still wear it */
function mySkin(charId) { return charId && charId !== 'random' ? cleanSkin(myProf(), SKINSEL[charId], mySkinEvent()) : ''; }
function setMySkin(charId, id) {
  if (id) SKINSEL[charId] = id; else delete SKINSEL[charId];
  saveLocal('cb.skins', JSON.stringify(SKINSEL));
  if (typeof G !== 'undefined' && G.mode === 'guest' && typeof presence === 'function') presence({ skin: mySkin(charId) });
  if (typeof G !== 'undefined' && G.mode === 'host' && typeof pushLobby === 'function') pushLobby();
}
function skinLockText(s) {
  if (s.level) return 'Unlocks at level ' + s.level + ' on the Sky Road';
  if (s.shop) return 'In the shop for ' + s.shop.toLocaleString() + ' coins';
  const e = typeof EVENTS !== 'undefined' && EVENTS[s.event];
  return 'Comes back during the ' + (e ? e.name : s.event) + ' event';
}
/* the skins row on the fighter card */
function skinRow(card, charId) {
  if (!charId || charId === 'random' || !CHAR[charId]) return;
  const prof = myProf(), ev = mySkinEvent(), cur = mySkin(charId);
  const row = el('div', { class: 'skin-row', role: 'radiogroup', 'aria-label': 'Skin for ' + CHAR[charId].name });
  const pick = id => { SFX.play('ui'); setMySkin(charId, id); card.dataset.id = ''; if (typeof renderSetup === 'function') renderSetup(); else renderStatCard(); const t = document.querySelector('#roster .tile[data-id="' + charId + '"] canvas'); if (t) drawPortrait(t, charId, { skin: mySkin(charId) }); };
  const sw = (id, name, ok, title) => {
    const on = (id || '') === cur;
    const b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(on), class: 'skin-sw' + (on ? ' on' : '') + (ok ? '' : ' locked'), title, 'aria-label': name + (ok ? '' : ' (locked: ' + title + ')') });
    const cv = el('canvas', { class: 'skin-cv', 'aria-hidden': 'true' });
    b.appendChild(cv);
    if (!ok) b.appendChild(el('span', { class: 'skin-lock', 'aria-hidden': 'true', text: '🔒' }));
    b.appendChild(el('small', { text: name }));
    if (ok) b.addEventListener('click', () => pick(id)); else b.addEventListener('click', () => toast(name + ': ' + title));
    row.appendChild(b);
    requestAnimationFrame(() => drawPortrait(cv, charId, { skin: id }));   // the whole fighter wearing it
  };
  sw('', 'Classic', true, 'The normal look');
  // the event skin first while its event is on, then the Sky Road skins, then other event skins and shop skins you own
  const order = SKIN_IDS.slice().sort((a, b) => (SKINS[b].event === ev) - (SKINS[a].event === ev));
  order.forEach(id => {
    const s = SKINS[id], ok = skinAllowed(prof, id, ev);
    if (s.event && !ok && s.event !== ev) return;   // other events' skins only show once you've kept them
    if (s.shop && !ok) return;   // shop skins show once you've bought them
    sw(id, s.name, ok, ok ? s.name + ' skin' + (s.event ? ' (' + ((typeof EVENTS !== 'undefined' && EVENTS[s.event]) ? EVENTS[s.event].name : s.event) + ')' : '') : skinLockText(s));
  });
  const box = el('div', { class: 'skins' }, [el('div', { class: 'skin-h' }, [el('span', { text: 'Skin' }), el('span', { class: 'muted', text: cur ? SKINS[cur].name : 'Classic' })]), row]);
  // the event skin: wear it during the event, keep it after 3 matches
  const evSkin = ev && typeof EVENT_SKIN !== 'undefined' ? EVENT_SKIN[ev] : null;
  if (evSkin && !(prof.ev || []).includes(ev) && !prof.owner) {
    const p = (typeof ACCT !== 'undefined' && ACCT.profile) || {}, plays = (p.evPlays || {})[ev + new Date().getUTCFullYear()] | 0;
    box.appendChild(el('p', { class: 'skin-note', text: '✨ ' + SKINS[evSkin].name + ' is free during the event. Play ' + EVENT_SKIN_PLAYS + ' matches while signed in to keep it forever (' + Math.min(plays, EVENT_SKIN_PLAYS) + '/' + EVENT_SKIN_PLAYS + ').' }));
  }
  card.appendChild(box);
}
