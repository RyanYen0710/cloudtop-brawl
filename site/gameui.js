'use strict';
/* ===== CLOUDTOP BRAWL — game-style controls =====
   Dropdowns, number boxes and "are you sure?" boxes drawn in the game's own style instead of the
   computer's built-in (Mac / Windows / phone) ones. The real <select> / <input> stays in the page
   (hidden), so every existing "change" listener and .value keeps working exactly as before.
   Checkboxes and sliders are restyled in CSS (index.html, "game-style controls"). */

const GUI = { open: null };
const SELECT_VALUE = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');

function guiClose() {
  const o = GUI.open; if (!o) return;
  GUI.open = null;
  o.list.remove(); o.btn.setAttribute('aria-expanded', 'false');
}
function guiLabel(sel) {
  const o = sel.options[sel.selectedIndex];
  return o ? o.textContent : '';
}

/* turn one <select> into a game-style dropdown */
function gameSelect(sel) {
  if (sel.dataset.gui) return;
  sel.dataset.gui = '1';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'gs-btn';
  btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
  const txt = document.createElement('span'); txt.className = 'gs-txt';
  const chev = document.createElement('span'); chev.className = 'gs-chev'; chev.setAttribute('aria-hidden', 'true'); chev.textContent = '▾';
  btn.append(txt, chev);
  sel.classList.add('gs-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
  sel.parentNode.insertBefore(btn, sel);   // the button comes first, so a wrapping <label> points at it
  const refresh = () => {
    txt.textContent = guiLabel(sel);
    btn.disabled = sel.disabled;
    const name = sel.getAttribute('aria-label') || (sel.id && document.querySelector('label[for="' + sel.id + '"]') || {}).textContent;
    if (name) btn.setAttribute('aria-label', name.trim() + ': ' + guiLabel(sel));
  };
  // code that sets sel.value directly (no event) still updates the button
  Object.defineProperty(sel, 'value', { configurable: true, get() { return SELECT_VALUE.get.call(this); }, set(v) { SELECT_VALUE.set.call(this, v); refresh(); } });
  sel.addEventListener('change', refresh);
  const choose = i => {
    if (i < 0 || i >= sel.options.length || sel.options[i].disabled) return;
    if (sel.selectedIndex !== i) { sel.selectedIndex = i; refresh(); sel.dispatchEvent(new Event('change', { bubbles: true })); }
  };
  const open = () => {
    if (btn.disabled) return;
    guiClose();
    const list = document.createElement('div');
    list.className = 'gs-list'; list.setAttribute('role', 'listbox');
    [...sel.options].forEach((o, i) => {
      const it = document.createElement('button');
      it.type = 'button'; it.className = 'gs-opt' + (i === sel.selectedIndex ? ' sel' : '');
      it.setAttribute('role', 'option'); it.setAttribute('aria-selected', String(i === sel.selectedIndex));
      it.textContent = o.textContent; it.disabled = o.disabled;
      it.addEventListener('click', () => { if (typeof SFX !== 'undefined') SFX.play('ui'); choose(i); guiClose(); btn.focus(); });
      list.appendChild(it);
    });
    list.addEventListener('keydown', e => {
      const items = [...list.querySelectorAll('.gs-opt:not([disabled])')], at = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (items[at + 1] || items[0]).focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (items[at - 1] || items[items.length - 1]).focus(); }
      else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); guiClose(); btn.focus(); }
      e.stopPropagation();   // keep the game's own keys (pause, menus) out of the list
    });
    document.body.appendChild(list);
    // place it under the button (or above, if there's no room below)
    const r = btn.getBoundingClientRect(), h = Math.min(list.scrollHeight, 300);
    const below = window.innerHeight - r.bottom - 8;
    list.style.left = Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 180) - 8)) + 'px';
    list.style.minWidth = r.width + 'px';
    list.style.top = (below >= h || below >= r.top ? r.bottom + 4 : r.top - h - 4) + 'px';
    GUI.open = { list, btn };
    btn.setAttribute('aria-expanded', 'true');
    const cur = list.querySelector('.gs-opt.sel') || list.querySelector('.gs-opt'); if (cur) { cur.focus(); cur.scrollIntoView({ block: 'nearest' }); }
  };
  btn.addEventListener('click', e => { e.preventDefault(); if (GUI.open && GUI.open.btn === btn) guiClose(); else { if (typeof SFX !== 'undefined') SFX.play('ui'); open(); } });
  btn.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); open(); }
  });
  new MutationObserver(refresh).observe(sel, { childList: true, attributes: true, attributeFilter: ['disabled'] });
  refresh();
}

/* number boxes get the game's − / + buttons instead of the tiny system arrows */
function gameNumber(inp) {
  if (inp.dataset.gui) return;
  inp.dataset.gui = '1';
  const wrap = document.createElement('span'); wrap.className = 'gn-wrap';
  inp.parentNode.insertBefore(wrap, inp);
  const step = dir => () => {
    try { dir > 0 ? inp.stepUp() : inp.stepDown(); } catch (e) { inp.value = String((+inp.value || 0) + dir); }
    inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const mk = (t, dir, name) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'gn-btn'; b.textContent = t; b.setAttribute('aria-label', name); b.addEventListener('click', step(dir)); return b; };
  wrap.append(mk('−', -1, 'Less'), inp, mk('+', 1, 'More'));
}

function guiEnhance(root) {
  if (!root || !root.querySelectorAll) return;
  if (root.matches && root.matches('select')) gameSelect(root);
  if (root.matches && root.matches('input[type=number]')) gameNumber(root);
  root.querySelectorAll('select').forEach(gameSelect);
  root.querySelectorAll('input[type=number]').forEach(gameNumber);
}

/* a game-style "are you sure?" box (instead of the browser's own pop-up). Resolves true/false. */
function gameConfirm(text, okText) {
  return new Promise(resolve => {
    const back = document.createElement('div'); back.className = 'gc-back';
    const box = document.createElement('div'); box.className = 'gc-box card'; box.setAttribute('role', 'alertdialog'); box.setAttribute('aria-modal', 'true');
    const msg = document.createElement('p'); msg.className = 'gc-msg'; msg.textContent = text;   // textContent: never treated as HTML
    const row = document.createElement('div'); row.className = 'gc-row';
    const no = document.createElement('button'); no.type = 'button'; no.className = 'btn'; no.textContent = 'Cancel';
    const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'btn start'; yes.textContent = okText || 'Yes, save';
    row.append(no, yes); box.append(msg, row); back.appendChild(box); document.body.appendChild(back);
    const done = v => { back.remove(); resolve(v); };
    no.addEventListener('click', () => done(false)); yes.addEventListener('click', () => done(true));
    back.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); done(false); } e.stopPropagation(); });
    back.addEventListener('click', e => { if (e.target === back) done(false); });
    yes.focus();
  });
}

document.addEventListener('pointerdown', e => { if (GUI.open && !GUI.open.list.contains(e.target) && !GUI.open.btn.contains(e.target)) guiClose(); }, true);
window.addEventListener('resize', guiClose);
document.addEventListener('scroll', e => { if (GUI.open && !GUI.open.list.contains(e.target)) guiClose(); }, true);
guiEnhance(document.body);
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) guiEnhance(n); }))).observe(document.body, { childList: true, subtree: true });
