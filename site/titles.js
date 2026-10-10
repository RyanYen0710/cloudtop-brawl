'use strict';
let titleSaving = false, titleMessage = '';
function titleRibbon(id, small) {
  const t = playerTitle(id); if (!t) return null;
  const badge = el('span', { class: 'title-ribbon title-' + t.tone + (small ? ' title-small' : ''), title: t.hint },
    [el('span', { class: 'title-icon', 'aria-hidden': 'true', text: t.icon }), el('span', { text: t.name })]);
  badge.style.setProperty('--title-color', t.color); return badge;
}
function myTitle() { const p = ACCT.profile; return p && (p.ownedTitles || []).includes(p.equippedTitle) && playerTitle(p.equippedTitle) ? p.equippedTitle : ''; }
function renderTitles(box) {
  const p = ACCT.profile; if (!p) return;
  const owned = p.ownedTitles || [], current = myTitle();
  const section = el('div', { class: 'acct-sec', id: 'title-settings' }, [el('h4', { text: 'Player titles' })]);
  section.appendChild(el('div', { class: 'title-preview' }, [el('b', { text: p.name || 'Player' }), titleRibbon(current),
    current ? null : el('small', { class: 'muted', text: 'No title equipped' })]));
  section.appendChild(el('p', { class: 'muted set-note', text: 'Choose one ribbon below your name. Titles are cosmetic. Seasons run from the first to the last day of each month in UTC; only new server-verified matches count.' }));
  section.appendChild(el('button', { type: 'button', class: 'mini', text: '↻ Refresh titles', on: { click: () => acctChanged() } }));
  if (p.titleSeasons && p.titleSeasons.length) section.appendChild(el('p', { class: 'muted', text: 'Champion seasons: ' + p.titleSeasons.join(', ') }));
  const grid = el('div', { class: 'title-grid' });
  [{ id: '', name: 'No title', hint: 'Show only your username.' }, ...PLAYER_TITLES].forEach(t => {
    const available = !t.id || owned.includes(t.id), selected = current === t.id;
    const choice = el('button', { type: 'button', class: 'title-choice', 'aria-pressed': String(selected), 'aria-label': (t.name || 'No title') + (available ? '' : ' — locked'),
      on: { click: () => equipTitle(t.id) } }, [t.id ? titleRibbon(t.id) : el('b', { text: t.name }),
      el('small', { text: t.hint }), el('strong', { text: selected ? 'EQUIPPED' : available ? 'EQUIP' : 'LOCKED' })]);
    choice.disabled = titleSaving || !available; grid.appendChild(choice);
  });
  section.append(grid, el('p', { class: 'title-status', role: 'status', 'aria-live': 'polite', text: titleMessage }));
  box.appendChild(section);
}
renderAcctChip();
async function equipTitle(id) {
  if (titleSaving || !ACCT.profile) return;
  const uid = ACCT.user && ACCT.user.uid;
  titleSaving = true; titleMessage = 'Saving…'; renderAcctPane();
  try {
    const p = await acctApi('/api/title', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: id }) });
    if (!ACCT.user || ACCT.user.uid !== uid || !ACCT.profile) { titleMessage = ''; return; }
    ACCT.profile = Object.assign(ACCT.profile, p); titleMessage = id ? 'Title equipped.' : 'Title removed.';
    renderAcctChip(); SFX.play('ui');
    if (typeof acctSendAuth === 'function' && SRV.ws) acctSendAuth(SRV.ws);
  } catch (e) { titleMessage = e.message === 'title-locked' ? 'This title is locked. Refresh your account to see current standings.' : 'Couldn’t save your title. Try again.'; }
  finally { titleSaving = false; renderAcctPane(); }
}
function trustedMatchTitle(slot, gid) {
  const info = SRV.titles;
  if (!info || info.gid !== gid || !Array.isArray(info.slots)) return '';
  const row = info.slots.find(x => x[0] === slot);
  return row && playerTitle(row[1]) ? row[1] : '';
}
/* Compact canvas ribbon, beneath the username and clear of damage/life indicators. */
function drawPlayerTitle(g, id, x, y, width) {
  const t = playerTitle(id); if (!t || width < 45) return;
  g.save(); g.font = '700 9px "Chakra Petch", sans-serif';
  let text = t.name.toUpperCase();
  while (text.length > 1 && g.measureText(text + '…').width > width - 14) text = text.slice(0, -1);
  if (text !== t.name.toUpperCase()) text += '…';
  const w = Math.min(width, g.measureText(text).width + 14);
  g.fillStyle = '#292044'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w - 5, y + 13); g.lineTo(x, y + 13); g.closePath(); g.fill();
  g.fillStyle = t.color; g.fillRect(x, y, 2, 13); g.textBaseline = 'middle'; g.fillText(text, x + 6, y + 7); g.restore();
}
